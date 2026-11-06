export const MEDIA_NAMESPACES = Object.freeze(['book', 'audio', 'image', 'video', 'deck', 'docs']);
export const CURRENT_MEDIA_SCHEMA_VERSION = 3;

const NAMESPACE_SET = new Set(MEDIA_NAMESPACES);

export function safeMediaPath(value) {
  const path = String(value || '').trim();
  if (!path || path.startsWith('/') || path.includes('://') || path.includes('\\')) {
    throw new Error(`Invalid logical media path: ${path || '(empty)'}.`);
  }
  const parts = path.split('/');
  if (parts.some((part) => !part || part === '.' || part === '..')) throw new Error(`Invalid logical media path: ${path}.`);
  if (!NAMESPACE_SET.has(parts[0])) throw new Error(`Unsupported media namespace in ${path}.`);
  return parts.join('/');
}

export function isLogicalMediaPath(value) {
  try { safeMediaPath(value); return true; } catch { return false; }
}

function normalizedRemoteRoot(value, label = 'Media mount') {
  const url = new URL(String(value || ''));
  const localhost = ['localhost', '127.0.0.1', '[::1]'].includes(url.hostname);
  if (url.protocol !== 'https:' && !(url.protocol === 'http:' && localhost)) {
    throw new Error(`${label} remote must use HTTPS (HTTP is allowed only for localhost).`);
  }
  return url.href.endsWith('/') ? url.href : `${url.href}/`;
}

function validatePrefix(value) {
  const prefix = String(value || '').trim();
  if (!prefix || !prefix.endsWith('/')) throw new Error('Media mount prefix must be non-empty and end with /.');
  safeMediaPath(prefix.slice(0, -1));
  return prefix;
}

function validateLocalFolder(value) {
  const local = String(value || '').trim();
  if (!/^[^/\\.][^/\\]*$/.test(local) || local === '..') throw new Error(`Media mount local must name one folder: ${local || '(empty)'}.`);
  return local;
}

export function normalizeMediaCatalog(catalog, { catalogRoot = '' } = {}) {
  if (!catalog || Number(catalog.schema_version) !== CURRENT_MEDIA_SCHEMA_VERSION) throw new Error(`Media catalog requires schema_version ${CURRENT_MEDIA_SCHEMA_VERSION}.`);
  if (!String(catalog.content_version || '').trim()) throw new Error('Media catalog requires content_version.');
  if (!Array.isArray(catalog.books) || !catalog.books.length) throw new Error('Media catalog requires at least one book.');
  const ids = new Set();
  catalog.books.forEach((book) => {
    const id = String(book?.book_id || '').trim();
    if (!id || ids.has(id)) throw new Error(`Media catalog contains an invalid or duplicate book_id: ${id || '(empty)'}.`);
    ids.add(id);
    safeMediaPath(book.manifest);
    if (!/^[a-f0-9]{64}$/.test(String(book.manifest_hash || ''))) throw new Error(`Media catalog book ${id} requires a SHA-256 manifest_hash.`);
  });
  if (!Array.isArray(catalog.mounts) || !catalog.mounts.length) throw new Error('Schema 3 media catalog requires mounts.');
  const prefixes = new Set();
  const mounts = catalog.mounts.map((mount) => {
    const prefix = validatePrefix(mount?.prefix);
    if (prefixes.has(prefix)) throw new Error(`Duplicate media mount prefix: ${prefix}.`);
    prefixes.add(prefix);
    return { prefix, remote: normalizedRemoteRoot(mount?.remote, `Media mount ${prefix}`), local: validateLocalFolder(mount?.local) };
  });
  return Object.freeze({ ...catalog, mounts: Object.freeze(mounts.sort((a, b) => b.prefix.length - a.prefix.length)) });
}

export function selectMediaMount(catalog, logicalPath) {
  const path = safeMediaPath(logicalPath);
  const mount = catalog?.mounts?.find((candidate) => path.startsWith(candidate.prefix));
  if (!mount) throw new Error(`No media mount resolves ${path}.`);
  return mount;
}

export function resolveRemoteMediaUrl(catalog, logicalPath, fileHash) {
  const path = safeMediaPath(logicalPath);
  if (!/^[a-f0-9]{64}$/.test(String(fileHash || ''))) throw new Error(`Media path ${path} requires a SHA-256 file hash.`);
  const url = new URL(path, selectMediaMount(catalog, path).remote);
  url.searchParams.set('v', String(fileHash));
  url.searchParams.set('mgp', path);
  return url.href;
}

export function mediaCacheKey(logicalPath, fileHash) {
  return `${safeMediaPath(logicalPath)}@${String(fileHash || '').trim()}`;
}

export function validateBookManifest(manifest, expectedBookId = '') {
  if (!manifest || Number(manifest.schema_version) !== CURRENT_MEDIA_SCHEMA_VERSION) throw new Error(`Book manifest requires schema_version ${CURRENT_MEDIA_SCHEMA_VERSION}.`);
  const id = String(manifest.book_id || '').trim();
  if (!id) throw new Error('Book manifest requires book_id.');
  if (expectedBookId && id !== expectedBookId) throw new Error(`Book manifest ${id} does not match catalog book_id ${expectedBookId}.`);
  if (!String(manifest.content_version || '').trim()) throw new Error(`Book manifest ${id} requires content_version.`);
  const declared = new Set();
  const hashes = new Map();
  for (const entry of manifest.files || []) {
    const path = safeMediaPath(entry?.path);
    if (declared.has(path)) throw new Error(`Book manifest ${id} contains duplicate file ${path}.`);
    if (!/^[a-f0-9]{64}$/.test(String(entry?.hash || ''))) throw new Error(`Book manifest ${id} file ${path} requires a SHA-256 hash.`);
    declared.add(path); hashes.set(path, entry.hash);
  }
  if (!declared.size) throw new Error(`Book manifest ${id} requires files.`);
  const requireDeclared = (value, label) => {
    const path = safeMediaPath(value);
    if (declared.size && !declared.has(path)) throw new Error(`Book manifest ${id} does not declare ${label}: ${path}.`);
    return path;
  };
  requireDeclared(manifest.verses?.catalog, 'verse catalog');
  const masters = manifest.verses?.masters || {};
  if (!Object.keys(masters).length) throw new Error(`Book manifest ${id} requires verse masters.`);
  for (const [language, path] of Object.entries(masters)) requireDeclared(path, `${language} verse master`);
  const registries = manifest.registries || {};
  requireDeclared(registries.verses?.structural, 'verse registry');
  for (const [language, path] of Object.entries(registries.verses?.localized || {})) requireDeclared(path, `${language} verse metadata`);
  requireDeclared(registries.audio, 'audio registry');
  requireDeclared(registries.images, 'image registry');
  if (registries.deck) requireDeclared(registries.deck, 'deck registry');
  if (registries.text) requireDeclared(registries.text, 'text registry');
  const experienceIds = new Set();
  for (const experience of manifest.experiences || []) {
    const experienceId = String(experience?.id || '').trim();
    if (!experienceId || experienceIds.has(experienceId)) throw new Error(`Book manifest ${id} has an invalid or duplicate experience.`);
    experienceIds.add(experienceId);
    for (const path of experience.files || []) if (!declared.has(safeMediaPath(path))) throw new Error(`Book manifest ${id} experience ${experienceId} references undeclared file ${path}.`);
  }
  return manifest;
}

export function manifestFileHash(manifest, logicalPath) {
  const path = safeMediaPath(logicalPath);
  const entry = manifest?.files?.find((candidate) => candidate.path === path);
  if (!entry) throw new Error(`Book manifest does not declare ${path}.`);
  return entry.hash;
}

export function validateDeckDescriptor(descriptor) {
  if (!descriptor || Number(descriptor.schema_version) !== 2) throw new Error('Deck descriptor requires schema_version 2.');
  if (descriptor.provider !== 'google-slides') throw new Error(`Unsupported deck provider: ${descriptor.provider || '(empty)'}.`);
  const source = new URL(String(descriptor.source || ''));
  if (source.protocol !== 'https:' || source.hostname !== 'docs.google.com') throw new Error('Google deck source must be an HTTPS docs.google.com URL.');
  return descriptor;
}
