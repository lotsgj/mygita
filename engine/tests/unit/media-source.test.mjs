import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DirectoryMediaSource,
  FilesMediaSource,
  RemoteMediaSource,
  safeMediaPath,
  validateBookManifest,
  validateMediaCatalog
} from '../../js/media-source.js';

const catalog = {
  schema_version: 1,
  content_version: '2026.10.30.1',
  books: [{ book_id: 'bhagavad-gita', manifest: 'book/bhagavad-gita/manifest.json' }]
};
const manifest = {
  schema_version: 1,
  book_id: 'bhagavad-gita',
  content_version: '2026.10.30.1',
  verses: {
    catalog: 'book/bhagavad-gita/verses/catalog.csv',
    masters: Object.fromEntries(['sa', 'en', 'kn'].map((language) => [language, `book/bhagavad-gita/verses/master_${language}.csv`]))
  },
  registries: {
    verses: {
      structural: 'book/bhagavad-gita/registry/verses/collection.csv',
      localized: Object.fromEntries(['sa', 'en', 'kn'].map((language) => [language, `book/bhagavad-gita/registry/verses/collection_${language}.csv`]))
    },
    audio: 'book/bhagavad-gita/registry/audio/collection.csv',
    images: 'book/bhagavad-gita/registry/image/collection.csv'
  },
  files: [
    'book/bhagavad-gita/verses/catalog.csv',
    ...['sa', 'en', 'kn'].map((language) => `book/bhagavad-gita/verses/master_${language}.csv`),
    'book/bhagavad-gita/registry/verses/collection.csv',
    ...['sa', 'en', 'kn'].map((language) => `book/bhagavad-gita/registry/verses/collection_${language}.csv`),
    'book/bhagavad-gita/registry/audio/collection.csv',
    'book/bhagavad-gita/registry/image/collection.csv'
  ]
};

test('media paths stay within the selected or remote root', () => {
  assert.equal(safeMediaPath('book/bhagavad-gita/manifest.json'), 'book/bhagavad-gita/manifest.json');
  for (const value of ['', '../outside', 'book/../outside', '/rooted', 'https://other.example/file']) {
    assert.throws(() => safeMediaPath(value), /Invalid media path/);
  }
});

test('catalog and book manifests enforce schema, identity and unique books', () => {
  assert.equal(validateMediaCatalog(catalog), catalog);
  assert.equal(validateBookManifest(manifest, 'bhagavad-gita'), manifest);
  assert.throws(() => validateMediaCatalog({ ...catalog, books: [...catalog.books, ...catalog.books] }), /duplicate book_id/);
  assert.throws(() => validateBookManifest(manifest, 'purusha-sukta'), /does not match/);
});

test('remote source loads no-store manifests and resolves root-relative media', async () => {
  const requests = [];
  const responses = new Map([
    ['https://media.gitajyoti.org/catalog.json', catalog],
    ['https://media.gitajyoti.org/book/bhagavad-gita/manifest.json', manifest]
  ]);
  const source = new RemoteMediaSource({
    rootUrl: 'https://media.gitajyoti.org',
    fetchImpl: async (url, options) => {
      requests.push({ url, options });
      const body = responses.get(url);
      return { ok: Boolean(body), status: body ? 200 : 404, text: async () => JSON.stringify(body) };
    }
  });
  assert.equal((await source.loadBook('bhagavad-gita')).book_id, 'bhagavad-gita');
  assert.equal(source.resolveMedia('image/bhagavad-gita/hero.webp'), 'https://media.gitajyoti.org/image/bhagavad-gita/hero.webp');
  assert.equal(source.resolveMedia('https://cdn.example/legacy.mp3'), 'https://cdn.example/legacy.mp3');
  assert.equal(requests.length, 2);
  assert.ok(requests.every(({ options }) => options.cache === 'no-store'));
});

test('remote source marks its catalog stale at the configured refresh interval', async () => {
  const source = new RemoteMediaSource({
    rootUrl: 'https://media.gitajyoti.org/',
    maxAgeMs: 0,
    fetchImpl: async () => ({ ok: true, status: 200, text: async () => JSON.stringify(catalog) })
  });
  await source.loadCatalog();
  assert.equal(source.needsRefresh, true);
});

function mockDirectory(files, name = 'media') {
  const directory = (prefix = '') => ({
    kind: 'directory',
    name,
    async getDirectoryHandle(part) { return directory(`${prefix}${part}/`); },
    async getFileHandle(part) {
      const path = `${prefix}${part}`;
      if (!files.has(path)) throw new Error(`Missing ${path}`);
      return { async getFile() { return { name: part, text: async () => files.get(path) }; } };
    }
  });
  return directory();
}

test('directory source reads the same manifest contract and owns object URL lifecycle', async () => {
  const files = new Map([
    ['catalog.json', JSON.stringify(catalog)],
    ['book/bhagavad-gita/manifest.json', JSON.stringify(manifest)],
    ['image/bhagavad-gita/hero.webp', 'image bytes']
  ]);
  const revoked = [];
  const source = new DirectoryMediaSource({
    directoryHandle: mockDirectory(files),
    createObjectUrl: (file) => `blob:${file.name}`,
    revokeObjectUrl: (url) => revoked.push(url)
  });
  assert.equal((await source.loadBook('bhagavad-gita')).content_version, '2026.10.30.1');
  assert.equal(await source.resolveMedia('image/bhagavad-gita/hero.webp'), 'blob:hero.webp');
  assert.equal(await source.resolveMedia('image/bhagavad-gita/hero.webp'), 'blob:hero.webp');
  assert.equal(source.objectUrls.size, 1);
  source.release();
  assert.deepEqual(revoked, ['blob:hero.webp']);
});

test('file-list source strips the selected media folder prefix', async () => {
  const values = new Map([
    ['catalog.json', JSON.stringify(catalog)],
    ['book/bhagavad-gita/manifest.json', JSON.stringify(manifest)]
  ]);
  const files = [...values].map(([path, value]) => ({
    name: path.split('/').at(-1),
    webkitRelativePath: `media/${path}`,
    text: async () => value
  }));
  const source = new FilesMediaSource({ fileList: files });
  assert.equal((await source.loadBook('bhagavad-gita')).book_id, 'bhagavad-gita');
});
