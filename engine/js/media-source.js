import { normalizeMediaCatalog, resolveRemoteMediaUrl, safeMediaPath, selectMediaMount, validateBookManifest } from './media-contract.js';

export { safeMediaPath, validateBookManifest } from './media-contract.js';
export function validateMediaCatalog(catalog, options) { return normalizeMediaCatalog(catalog, options); }

function normalizeRootUrl(rootUrl) {
  const url = new URL(String(rootUrl || ''));
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Remote media root must use HTTP or HTTPS.');
  return url.href.endsWith('/') ? url.href : `${url.href}/`;
}
function parseJson(text, path) {
  try { return JSON.parse(text); } catch (error) { throw new Error(`Media file ${path} is not valid JSON (${error.message}; received ${JSON.stringify(String(text).slice(0, 80))}).`); }
}

export class RemoteMediaSource {
  constructor({ rootUrl, catalogPath = 'catalog.json', fetchImpl = globalThis.fetch?.bind(globalThis), maxAgeMs = 300000 } = {}) {
    if (typeof fetchImpl !== 'function') throw new Error('Remote media source requires fetch.');
    this.rootUrl = normalizeRootUrl(rootUrl);
    this.catalogPath = String(catalogPath || 'catalog.json').trim();
    this.fetchImpl = fetchImpl;
    this.maxAgeMs = maxAgeMs;
    this.loadedAt = 0;
    this.catalog = null;
    this.books = new Map();
  }
  get label() { return this.rootUrl; }
  get needsRefresh() { return Boolean(this.loadedAt && Date.now() - this.loadedAt >= this.maxAgeMs); }
  catalogUrl() {
    const url = new URL(this.catalogPath, this.rootUrl);
    url.searchParams.set('mgc', '1');
    url.searchParams.set('check', String(Date.now()));
    return url.href;
  }
  resolve(path) {
    if (!this.catalog) throw new Error('Load the media catalog before resolving media.');
    return resolveRemoteMediaUrl(this.catalog, path);
  }
  resolveMedia(path) { return this.resolve(path); }
  async fetchText(url, path, options = {}) {
    const response = await this.fetchImpl(url, options);
    if (!response?.ok) throw new Error(`Unable to load media file ${path} (${response?.status || 'network error'}).`);
    return response.text();
  }
  async readText(path) {
    const logical = safeMediaPath(path);
    return this.fetchText(this.resolve(logical), logical, { cache: 'default' });
  }
  async readJson(path) { return parseJson(await this.readText(path), path); }
  async loadCatalog({ refresh = false } = {}) {
    const stale = this.catalog && Date.now() - this.loadedAt >= this.maxAgeMs;
    const previousVersion = this.catalog?.content_version;
    const raw = parseJson(await this.fetchText(this.catalogUrl(), this.catalogPath, { cache: 'no-store' }), this.catalogPath);
    this.catalog = normalizeMediaCatalog(raw, { catalogRoot: this.rootUrl });
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
  return { files, rootName: rootPrefix.replace(/\/$/, '').split('/').at(-1) || 'media' };
}

class LocalMediaSource {
  constructor({ catalogPath = 'catalog.json', createObjectUrl = (file) => URL.createObjectURL(file), revokeObjectUrl = (url) => URL.revokeObjectURL(url) } = {}) {
    this.catalogPath = String(catalogPath || 'catalog.json').trim();
    this.createObjectUrl = createObjectUrl;
    this.revokeObjectUrl = revokeObjectUrl;
    this.objectUrls = new Map();
    this.catalog = null;
    this.books = new Map();
  }
  get needsRefresh() { return false; }
  assertLocalMount(path) {
    if (!this.catalog) return;
    const mount = selectMediaMount(this.catalog, path);
    if (mount.local !== this.rootName) throw new Error(`Media path ${path} requires local folder "${mount.local}"; selected "${this.rootName}".`);
  }
  async readText(path) { return (await this.readFile(path)).text(); }
  async readJson(path) { return parseJson(await this.readText(path), path); }
  async loadCatalog({ refresh = false } = {}) {
    if (!refresh && this.catalog) return this.catalog;
    const raw = parseJson(await (await this.readCatalogFile()).text(), this.catalogPath);
    this.catalog = normalizeMediaCatalog(raw, { catalogRoot: 'https://schema1.invalid/' });
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
  async resolveMedia(path) {
    const logical = safeMediaPath(path);
    if (!this.objectUrls.has(logical)) this.objectUrls.set(logical, this.createObjectUrl(await this.readFile(logical)));
    return this.objectUrls.get(logical);
  }
  release() {
    this.objectUrls.forEach((url) => this.revokeObjectUrl(url));
    this.objectUrls.clear();
  }
}

export class FilesMediaSource extends LocalMediaSource {
  constructor({ fileList, ...options } = {}) {
    super(options);
    const selected = selectedMediaFiles(fileList);
    this.files = selected.files;
    this.rootName = selected.rootName;
    if (!this.files.has(this.catalogPath)) throw new Error('The selected folder is missing catalog.json.');
  }
  get label() { return this.rootName; }
  async readCatalogFile() { return this.files.get(this.catalogPath); }
  async readFile(path) {
    const logical = safeMediaPath(path);
    this.assertLocalMount(logical);
    const file = this.files.get(logical);
    if (!file) throw new Error(`The selected media folder is missing ${logical}.`);
    return file;
  }
}

async function directoryFile(root, path) {
  const parts = String(path).split('/');
  let directory = root;
  for (const part of parts.slice(0, -1)) directory = await directory.getDirectoryHandle(part);
  const handle = await directory.getFileHandle(parts.at(-1));
  return handle.getFile();
}

export class DirectoryMediaSource extends LocalMediaSource {
  constructor({ directoryHandle, ...options } = {}) {
    if (!directoryHandle || directoryHandle.kind !== 'directory') throw new Error('Local media source requires a directory handle.');
    super(options);
    this.directoryHandle = directoryHandle;
    this.rootName = directoryHandle.name || 'media';
  }
  get label() { return this.rootName; }
  async readCatalogFile() { return directoryFile(this.directoryHandle, this.catalogPath); }
  async readFile(path) {
    const logical = safeMediaPath(path);
    this.assertLocalMount(logical);
    try { return await directoryFile(this.directoryHandle, logical); }
    catch { throw new Error(`The selected media folder is missing ${logical}.`); }
  }
}
