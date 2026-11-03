import test from 'node:test';
import assert from 'node:assert/strict';
import { DirectoryMediaSource, FilesMediaSource, RemoteMediaSource } from '../../js/media-source.js';
import { mediaCacheKey, normalizeMediaCatalog, resolveRemoteMediaUrl, safeMediaPath, selectMediaMount } from '../../js/media-contract.js';

const catalog = {
  schema_version: 2,
  content_version: '2026.11.03.2',
  mounts: [
    { prefix: 'book/', remote: 'https://books.example/', local: 'media' },
    { prefix: 'book/bhagavad-gita/', remote: 'https://gita.example/', local: 'media' },
    ...['audio', 'image', 'video', 'deck', 'docs'].map((prefix) => ({ prefix: `${prefix}/`, remote: 'https://media.example/', local: 'media' }))
  ],
  books: [{ book_id: 'bhagavad-gita', manifest: 'book/bhagavad-gita/manifest.json' }]
};
const manifest = {
  schema_version: 2,
  book_id: 'bhagavad-gita',
  content_version: catalog.content_version,
  verses: { catalog: 'book/bhagavad-gita/verses/catalog.csv', masters: Object.fromEntries(['sa', 'en', 'kn'].map((language) => [language, `book/bhagavad-gita/verses/master_${language}.csv`])) },
  registries: {
    verses: { structural: 'book/bhagavad-gita/registry/verses/collection.csv', localized: Object.fromEntries(['sa', 'en', 'kn'].map((language) => [language, `book/bhagavad-gita/registry/verses/collection_${language}.csv`])) },
    audio: 'book/bhagavad-gita/registry/audio/collection.csv',
    images: 'book/bhagavad-gita/registry/image/collection.csv'
  },
  files: [
    'book/bhagavad-gita/verses/catalog.csv', ...['sa', 'en', 'kn'].map((language) => `book/bhagavad-gita/verses/master_${language}.csv`),
    'book/bhagavad-gita/registry/verses/collection.csv', ...['sa', 'en', 'kn'].map((language) => `book/bhagavad-gita/registry/verses/collection_${language}.csv`),
    'book/bhagavad-gita/registry/audio/collection.csv', 'book/bhagavad-gita/registry/image/collection.csv'
  ].sort()
};

test('logical media paths are strict and namespace based', () => {
  assert.equal(safeMediaPath('book/bhagavad-gita/manifest.json'), 'book/bhagavad-gita/manifest.json');
  for (const value of ['', '../outside', 'book/../outside', '/rooted', 'https://other.example/file', 'book\\bad.csv', 'unknown/file']) assert.throws(() => safeMediaPath(value));
});

test('schema 2 mounts use longest prefix and versioned URLs', () => {
  const normalized = normalizeMediaCatalog(catalog);
  assert.equal(selectMediaMount(normalized, 'book/bhagavad-gita/manifest.json').remote, 'https://gita.example/');
  const resolved = new URL(resolveRemoteMediaUrl(normalized, 'book/bhagavad-gita/manifest.json'));
  assert.equal(resolved.origin, 'https://gita.example');
  assert.equal(resolved.searchParams.get('v'), catalog.content_version);
  assert.equal(resolved.searchParams.get('mgp'), 'book/bhagavad-gita/manifest.json');
  assert.equal(mediaCacheKey('audio/bhagavad-gita/a.mp3', '2'), '2:audio/bhagavad-gita/a.mp3');
});

test('invalid mounts fail and schema 1 remains readable', () => {
  assert.throws(() => normalizeMediaCatalog({ ...catalog, mounts: [{ prefix: 'book', remote: 'https://x.example/', local: 'media' }] }), /end with/);
  assert.throws(() => normalizeMediaCatalog({ ...catalog, mounts: [{ prefix: 'book/', remote: 'http://x.example/', local: 'media' }] }), /HTTPS/);
  assert.throws(() => normalizeMediaCatalog({ ...catalog, mounts: [{ prefix: 'book/', remote: 'https://x.example/', local: '../media' }] }), /one folder/);
  const old = normalizeMediaCatalog({ schema_version: 1, content_version: '1', books: catalog.books }, { catalogRoot: 'https://legacy.example/' });
  assert.equal(selectMediaMount(old, 'audio/a.mp3').remote, 'https://legacy.example/');
});

test('remote source fetches catalog fresh and other media with normal caching', async () => {
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
  assert.equal(requests.length, 3, 'a second load fetches only the always-fresh catalog');
  assert.equal(requests[2].url.pathname, '/catalog.json');
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
