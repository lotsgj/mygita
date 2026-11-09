import test from 'node:test';
import assert from 'node:assert/strict';
import { DirectoryMediaSource, FilesMediaSource, RemoteMediaSource } from '../../js/media-source.js';
import { mediaCacheKey, normalizeMediaCatalog, resolveRemoteMediaUrl, safeMediaPath, selectMediaMount } from '../../js/media-contract.js';

const catalog = {
  content_kit_version: '4.20261108-061242',
  minimum_kit_version: '4.20261108-061242',
  content_version: '2026.11.03.2',
  mounts: [
    { mount_id: 'books', prefix: 'book/', remote: 'https://books.example/', local: 'media', inventories: [{ id: 'books', path: 'files.json', hash: 'f'.repeat(64) }] },
    { mount_id: 'gita', prefix: 'book/bhagavad-gita/', remote: 'https://gita.example/', local: 'media', inventories: [{ id: 'gita', path: 'files.json', hash: 'e'.repeat(64) }] },
    ...['audio', 'image', 'video', 'deck', 'docs'].map((prefix) => ({ mount_id: prefix, prefix: `${prefix}/`, remote: 'https://media.example/', local: 'media', inventories: [{ id: prefix, path: 'files.json', hash: 'd'.repeat(64) }] }))
  ],
  books: [{ book_id: 'bhagavad-gita', manifest: 'book/bhagavad-gita/manifest.json', manifest_hash: 'a'.repeat(64) }]
};
const hash = (index) => String(index).padStart(64, '0');
const manifestPaths = [
  'book/bhagavad-gita/verses/catalog.csv', ...['sa', 'en', 'kn'].map((language) => `book/bhagavad-gita/verses/master_${language}.csv`),
  'book/bhagavad-gita/registry/verses/collection.csv', ...['sa', 'en', 'kn'].map((language) => `book/bhagavad-gita/registry/verses/collection_${language}.csv`),
  'book/bhagavad-gita/registry/audio/collection.csv', 'book/bhagavad-gita/registry/image/collection.csv'
].sort();
const manifest = {
  content_kit_version: catalog.content_kit_version,
  book_id: 'bhagavad-gita',
  content_version: catalog.content_version,
  collections: [{ content_type: 'verse', registry: 'book/bhagavad-gita/registry/verses/collection.csv', defaults: 'book/bhagavad-gita/registry/verses/collection.csv', parts: { text: { variants: 'book/bhagavad-gita/registry/verses/collection.csv' } } }],
  runtime_view: { verses: { catalog: 'book/bhagavad-gita/verses/catalog.csv', masters: Object.fromEntries(['sa', 'en', 'kn'].map((language) => [language, `book/bhagavad-gita/verses/master_${language}.csv`])) }, registries: {
    verses: { structural: 'book/bhagavad-gita/registry/verses/collection.csv', localized: Object.fromEntries(['sa', 'en', 'kn'].map((language) => [language, `book/bhagavad-gita/registry/verses/collection_${language}.csv`])) },
    audio: 'book/bhagavad-gita/registry/audio/collection.csv',
    images: 'book/bhagavad-gita/registry/image/collection.csv'
  } },
  experiences: [{ id: 'gita-700', files: manifestPaths }],
  files: manifestPaths.map((path, index) => ({ path, hash: hash(index + 1) }))
};

test('logical media paths are strict and namespace based', () => {
  assert.equal(safeMediaPath('book/bhagavad-gita/manifest.json'), 'book/bhagavad-gita/manifest.json');
  for (const value of ['', '../outside', 'book/../outside', '/rooted', 'https://other.example/file', 'book\\bad.csv', 'unknown/file']) assert.throws(() => safeMediaPath(value));
});

test('Content-Kit 4 mounts use longest explicit prefix and content-addressed URLs', () => {
  const normalized = normalizeMediaCatalog(catalog);
  assert.equal(selectMediaMount(normalized, 'book/bhagavad-gita/manifest.json').remote, 'https://gita.example/');
  const resolved = new URL(resolveRemoteMediaUrl(normalized, 'book/bhagavad-gita/manifest.json', 'a'.repeat(64)));
  assert.equal(resolved.origin, 'https://gita.example');
  assert.equal(resolved.searchParams.get('v'), 'a'.repeat(64));
  assert.equal(resolved.searchParams.get('mgp'), 'book/bhagavad-gita/manifest.json');
  assert.equal(mediaCacheKey('audio/bhagavad-gita/a.mp3', '2'), 'audio/bhagavad-gita/a.mp3@2');
});

test('invalid mounts and legacy schemas fail', () => {
  assert.throws(() => normalizeMediaCatalog({ ...catalog, mounts: [{ prefix: 'book', remote: 'https://x.example/', local: 'media' }] }), /end with/);
  assert.throws(() => normalizeMediaCatalog({ ...catalog, mounts: [{ prefix: 'book/', remote: 'http://x.example/', local: 'media', inventories: catalog.mounts[0].inventories }] }), /HTTPS/);
  assert.throws(() => normalizeMediaCatalog({ ...catalog, mounts: [{ prefix: 'book/', remote: 'https://x.example/', local: '../media', inventories: catalog.mounts[0].inventories }] }), /one folder/);
  assert.throws(() => normalizeMediaCatalog({ ...catalog, content_kit_version: '3.0' }), /Content-Kit 4/);
});

test('remote source checks its catalog once per app session and refreshes only when asked', async () => {
  const requests = [];
  const source = new RemoteMediaSource({
    rootUrl: 'https://catalog.example/',
    fetchImpl: async (url, options) => {
      requests.push({ url: new URL(url), options });
      const pathname = new URL(url).pathname;
      const body = pathname === '/catalog.json' ? catalog : pathname === '/book/bhagavad-gita/manifest.json' ? manifest : null;
      return { ok: Boolean(body), status: body ? 200 : 404, text: async () => JSON.stringify(body) };
    }
  });
  assert.equal((await source.loadBook('bhagavad-gita')).book_id, 'bhagavad-gita');
  assert.equal(requests[0].options.cache, 'no-store');
  assert.equal(requests[1].options.cache, 'default');
  assert.equal(requests[1].url.searchParams.get('mgp'), 'book/bhagavad-gita/manifest.json');
  assert.throws(() => source.resolveMedia('https://cdn.example/legacy.mp3'));
  await source.loadBook('bhagavad-gita');
  assert.equal(requests.length, 2, 'a second load reuses the session catalog and book manifest');
  await source.loadCatalog({ refresh: true });
  assert.equal(requests.length, 3, 'an explicit refresh checks the catalog again');
  assert.equal(requests[2].url.pathname, '/catalog.json');
});

test('media sync fetches only changed metadata and leaves changed binaries lazy', async () => {
  const metadataPath = 'book/bhagavad-gita/verses/master_en.csv';
  const audioPath = 'audio/bhagavad-gita/example/1.1.mp3';
  const oldManifest = structuredClone(manifest);
  oldManifest.files.push({ path: audioPath, hash: 'b'.repeat(64) });
  const newManifest = structuredClone(oldManifest);
  newManifest.files.find((entry) => entry.path === metadataPath).hash = 'c'.repeat(64);
  newManifest.files.find((entry) => entry.path === audioPath).hash = 'd'.repeat(64);
  const freshCatalog = structuredClone(catalog);
  freshCatalog.content_version = '2026.11.04.1';
  freshCatalog.books[0].manifest_hash = 'e'.repeat(64);
  let catalogReads = 0;
  const requests = [];
  const source = new RemoteMediaSource({
    rootUrl: 'https://catalog.example/',
    fetchImpl: async (url, options) => {
      const parsed = new URL(url); requests.push({ path: parsed.pathname.replace(/^\//, ''), options });
      let body = null;
      if (parsed.pathname === '/catalog.json') body = ++catalogReads === 1 ? catalog : freshCatalog;
      else if (parsed.pathname === '/book/bhagavad-gita/manifest.json') body = parsed.searchParams.get('v') === 'e'.repeat(64) ? newManifest : oldManifest;
      else if (parsed.pathname === `/${metadataPath}`) return { ok: true, status: 200, text: async () => 'changed metadata' };
      else if (parsed.pathname === `/${audioPath}`) return { ok: true, status: 200, text: async () => 'binary' };
      return { ok: Boolean(body), status: body ? 200 : 404, text: async () => JSON.stringify(body) };
    }
  });
  await source.loadBook('bhagavad-gita');
  const update = await source.checkForUpdates();
  assert.deepEqual(update, { changed: true, books: ['bhagavad-gita'] });
  const afterInitial = requests.slice(2).map((request) => request.path);
  assert.ok(afterInitial.includes(metadataPath), 'changed CSV is prefetched');
  assert.ok(!afterInitial.includes(audioPath), 'changed audio stays lazy');
  assert.equal(source.applyPendingUpdate(), true);
  assert.match(source.resolveMedia(audioPath), new RegExp(`v=${'d'.repeat(64)}`));
});

function mockDirectory(files, name = 'media') {
  const directory = (prefix = '') => ({ kind: 'directory', name, async getDirectoryHandle(part) { return directory(`${prefix}${part}/`); }, async getFileHandle(part) { const key = `${prefix}${part}`; if (!files.has(key)) throw new Error(`Missing ${key}`); return { async getFile() { return { name: part, text: async () => files.get(key) }; } }; } });
  return directory();
}

test('directory source resolves the selected mount and owns object URLs', async () => {
  const files = new Map([['catalog.json', JSON.stringify(catalog)], ['book/bhagavad-gita/manifest.json', JSON.stringify(manifest)], ['image/bhagavad-gita/hero.webp', 'image']]);
  const revoked = [];
  const source = new DirectoryMediaSource({ directoryHandle: mockDirectory(files), createObjectUrl: (file) => `blob:${file.name}`, revokeObjectUrl: (url) => revoked.push(url) });
  await source.loadBook('bhagavad-gita');
  assert.equal(await source.resolveMedia('image/bhagavad-gita/hero.webp'), 'blob:hero.webp');
  source.release();
  assert.deepEqual(revoked, ['blob:hero.webp']);
});

test('file-list source strips the selected media folder prefix', async () => {
  const values = new Map([['catalog.json', JSON.stringify(catalog)], ['book/bhagavad-gita/manifest.json', JSON.stringify(manifest)]]);
  const files = [...values].map(([relative, value]) => ({ name: relative.split('/').at(-1), webkitRelativePath: `media/${relative}`, text: async () => value }));
  assert.equal((await new FilesMediaSource({ fileList: files }).loadBook('bhagavad-gita')).book_id, 'bhagavad-gita');
});

test('non-default local mount produces a clear folder error', async () => {
  const custom = { ...catalog, mounts: catalog.mounts.map((mount) => ({ ...mount, local: 'media2' })) };
  const source = new DirectoryMediaSource({ directoryHandle: mockDirectory(new Map([['catalog.json', JSON.stringify(custom)]])) });
  await source.loadCatalog();
  await assert.rejects(source.readText('book/bhagavad-gita/manifest.json'), /requires local folder "media2"/);
});
