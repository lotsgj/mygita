const MEDIA_SCHEMA_VERSION = 1;

export function safeMediaPath(value) {
  const path = String(value || '').trim().replace(/\\/g, '/');
  if (!path || path.startsWith('/') || path.includes('://')) throw new Error(`Invalid media path: ${path || '(empty)'}.`);
  const parts = path.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) throw new Error(`Invalid media path: ${path}.`);
  return parts.join('/');
}

function validateSchema(record, label) {
  if (!record || Number(record.schema_version) !== MEDIA_SCHEMA_VERSION) {
    throw new Error(`${label} requires schema_version ${MEDIA_SCHEMA_VERSION}.`);
  }
  return record;
}

export function validateMediaCatalog(catalog) {
  validateSchema(catalog, 'Media catalog');
  if (!String(catalog.content_version || '').trim()) throw new Error('Media catalog requires content_version.');
  if (!Array.isArray(catalog.books) || !catalog.books.length) throw new Error('Media catalog requires at least one book.');
  const ids = new Set();
  catalog.books.forEach((book) => {
    const id = String(book?.book_id || '').trim();
    if (!id || ids.has(id)) throw new Error(`Media catalog contains an invalid or duplicate book_id: ${id || '(empty)'}.`);
    ids.add(id);
    safeMediaPath(book.manifest);
  });
  return catalog;
}

export function validateBookManifest(manifest, expectedBookId = '') {
  validateSchema(manifest, 'Book manifest');
  const id = String(manifest.book_id || '').trim();
  if (!id) throw new Error('Book manifest requires book_id.');
  if (expectedBookId && id !== expectedBookId) throw new Error(`Book manifest ${id} does not match catalog book_id ${expectedBookId}.`);
  if (!String(manifest.content_version || '').trim()) throw new Error(`Book manifest ${id} requires content_version.`);
  const files = new Set((manifest.files || []).map(safeMediaPath));
  const requireDeclared = (value, label) => {
    const path = safeMediaPath(value);
    if (!files.has(path)) throw new Error(`Book manifest ${id} does not declare ${label}: ${path}.`);
    return path;
  };
  requireDeclared(manifest.verses?.catalog, 'verse catalog');
  for (const language of ['sa', 'en', 'kn']) requireDeclared(manifest.verses?.masters?.[language], `${language} verse master`);
  const registries = manifest.registries || {};
  requireDeclared(registries.verses?.structural, 'verse registry');
  for (const language of ['sa', 'en', 'kn']) requireDeclared(registries.verses?.localized?.[language], `${language} verse metadata`);
  requireDeclared(registries.audio, 'audio registry');
  requireDeclared(registries.images, 'image registry');
  if (registries.deck) requireDeclared(registries.deck, 'deck registry');
  if (registries.text) requireDeclared(registries.text, 'text registry');
  return manifest;
}

function normalizeRootUrl(rootUrl) {
  const url = new URL(String(rootUrl || ''));
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Remote media root must use HTTP or HTTPS.');
  return url.href.endsWith('/') ? url.href : `${url.href}/`;
}

export class RemoteMediaSource {
  constructor({ rootUrl, catalogPath = 'catalog.json', fetchImpl = globalThis.fetch?.bind(globalThis), maxAgeMs = 300000 } = {}) {
    if (typeof fetchImpl !== 'function') throw new Error('Remote media source requires fetch.');
    this.rootUrl = normalizeRootUrl(rootUrl);
    this.catalogPath = safeMediaPath(catalogPath);
    this.fetchImpl = fetchImpl;
    this.maxAgeMs = maxAgeMs;
    this.loadedAt = 0;
    this.catalog = null;
    this.books = new Map();
  }

  get label() { return this.rootUrl; }
  get needsRefresh() { return Boolean(this.loadedAt && Date.now() - this.loadedAt >= this.maxAgeMs); }
  resolve(path) { return new URL(safeMediaPath(path), this.rootUrl).href; }
  resolveMedia(pathOrUrl) {
    const value = String(pathOrUrl || '').trim();
    if (/^https:\/\//i.test(value)) return value;
    return this.resolve(value);
  }

  async readText(path, { cache = 'no-store' } = {}) {
    const response = await this.fetchImpl(this.resolve(path), { cache });
    if (!response?.ok) throw new Error(`Unable to load media file ${path} (${response?.status || 'network error'}).`);
    return response.text();
  }

  async readJson(path, options) {
    const text = await this.readText(path, options);
    try { return JSON.parse(text); } catch { throw new Error(`Media file ${path} is not valid JSON.`); }
  }

  async loadCatalog({ refresh = false } = {}) {
    const stale = this.catalog && Date.now() - this.loadedAt >= this.maxAgeMs;
    if (!refresh && this.catalog && !stale) return this.catalog;
    const previousVersion = this.catalog?.content_version;
    this.catalog = validateMediaCatalog(await this.readJson(this.catalogPath));
    this.loadedAt = Date.now();
    if (refresh || stale || (previousVersion && previousVersion !== this.catalog.content_version)) this.books.clear();
    return this.catalog;
  }

  async loadBook(bookId, { refresh = false } = {}) {
    const id = String(bookId || '').trim();
    const catalog = await this.loadCatalog({ refresh });
    if (!refresh && this.books.has(id)) return this.books.get(id);
    const entry = catalog.books.find((book) => book.book_id === id);
    if (!entry) throw new Error(`Media catalog does not contain book ${id}.`);
    const manifest = validateBookManifest(await this.readJson(entry.manifest), id);
    this.books.set(id, manifest);
    return manifest;
  }
}

function selectedMediaFiles(fileList) {
  const selected = Array.from(fileList || []);
  const files = new Map();
  const catalogFile = selected.find((file) => /(^|\/)catalog\.json$/.test(String(file.webkitRelativePath || file.name).replace(/\\/g, '/')));
  const catalogOriginal = String(catalogFile?.webkitRelativePath || catalogFile?.name || '').replace(/\\/g, '/');
  const rootPrefix = catalogOriginal.slice(0, Math.max(0, catalogOriginal.length - 'catalog.json'.length));
  for (const file of selected) {
    const original = String(file.webkitRelativePath || file.name).replace(/\\/g, '/');
    const path = rootPrefix && original.startsWith(rootPrefix) ? original.slice(rootPrefix.length) : original;
    files.set(path, file);
  }
  return files;
}

export class FilesMediaSource {
  constructor({ fileList, catalogPath = 'catalog.json', createObjectUrl = (file) => URL.createObjectURL(file), revokeObjectUrl = (url) => URL.revokeObjectURL(url) } = {}) {
    this.files = selectedMediaFiles(fileList);
    if (!this.files.has(catalogPath)) throw new Error('The selected folder is missing catalog.json.');
    this.catalogPath = safeMediaPath(catalogPath);
    this.createObjectUrl = createObjectUrl;
    this.revokeObjectUrl = revokeObjectUrl;
    this.objectUrls = new Map();
    this.catalog = null;
    this.books = new Map();
  }
  get label() { return 'media'; }
  get needsRefresh() { return false; }
  async readFile(path) {
    const safe = safeMediaPath(path);
    const file = this.files.get(safe);
    if (!file) throw new Error(`The selected media folder is missing ${safe}.`);
    return file;
  }
  async readText(path) { return (await this.readFile(path)).text(); }
  async readJson(path) {
    const text = await this.readText(path);
    try { return JSON.parse(text); } catch { throw new Error(`Media file ${path} is not valid JSON.`); }
  }
  async loadCatalog({ refresh = false } = {}) {
    if (!refresh && this.catalog) return this.catalog;
    this.catalog = validateMediaCatalog(await this.readJson(this.catalogPath));
    if (refresh) this.books.clear();
    return this.catalog;
  }
  async loadBook(bookId, { refresh = false } = {}) {
    const id = String(bookId || '').trim();
    if (!refresh && this.books.has(id)) return this.books.get(id);
    const entry = (await this.loadCatalog({ refresh })).books.find((book) => book.book_id === id);
    if (!entry) throw new Error(`Media catalog does not contain book ${id}.`);
    const manifest = validateBookManifest(await this.readJson(entry.manifest), id);
    this.books.set(id, manifest);
    return manifest;
  }
  async resolveMedia(pathOrUrl) {
    const value = String(pathOrUrl || '').trim();
    if (/^https:\/\//i.test(value)) return value;
    const path = safeMediaPath(value);
    if (!this.objectUrls.has(path)) this.objectUrls.set(path, this.createObjectUrl(await this.readFile(path)));
    return this.objectUrls.get(path);
  }
  release() {
    this.objectUrls.forEach((url) => this.revokeObjectUrl(url));
    this.objectUrls.clear();
  }
}

async function directoryFile(root, path) {
  const parts = safeMediaPath(path).split('/');
  let directory = root;
  for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part);
  const handle = await directory.getFileHandle(parts.at(-1));
  return handle.getFile();
}

export class DirectoryMediaSource {
  constructor({ directoryHandle, catalogPath = 'catalog.json', createObjectUrl = (file) => URL.createObjectURL(file), revokeObjectUrl = (url) => URL.revokeObjectURL(url) } = {}) {
    if (!directoryHandle || directoryHandle.kind !== 'directory') throw new Error('Local media source requires a directory handle.');
    this.directoryHandle = directoryHandle;
    this.catalogPath = safeMediaPath(catalogPath);
    this.createObjectUrl = createObjectUrl;
    this.revokeObjectUrl = revokeObjectUrl;
    this.objectUrls = new Map();
    this.catalog = null;
    this.books = new Map();
  }

  get label() { return this.directoryHandle.name || 'media'; }
  get needsRefresh() { return false; }
  async readFile(path) { return directoryFile(this.directoryHandle, path); }
  async readText(path) { return (await this.readFile(path)).text(); }
  async readJson(path) {
    const text = await this.readText(path);
    try { return JSON.parse(text); } catch { throw new Error(`Media file ${path} is not valid JSON.`); }
  }

  async loadCatalog({ refresh = false } = {}) {
    if (!refresh && this.catalog) return this.catalog;
    this.catalog = validateMediaCatalog(await this.readJson(this.catalogPath));
    if (refresh) this.books.clear();
    return this.catalog;
  }

  async loadBook(bookId, { refresh = false } = {}) {
    const id = String(bookId || '').trim();
    if (!refresh && this.books.has(id)) return this.books.get(id);
    const catalog = await this.loadCatalog({ refresh });
    const entry = catalog.books.find((book) => book.book_id === id);
    if (!entry) throw new Error(`Media catalog does not contain book ${id}.`);
    const manifest = validateBookManifest(await this.readJson(entry.manifest), id);
    this.books.set(id, manifest);
    return manifest;
  }

  async resolveMedia(pathOrUrl) {
    const value = String(pathOrUrl || '').trim();
    if (/^https:\/\//i.test(value)) return value;
    const path = safeMediaPath(value);
    if (this.objectUrls.has(path)) return this.objectUrls.get(path);
    const url = this.createObjectUrl(await this.readFile(path));
    this.objectUrls.set(path, url);
    return url;
  }

  release() {
    this.objectUrls.forEach((url) => this.revokeObjectUrl(url));
    this.objectUrls.clear();
  }
}
