import test from 'node:test';
import assert from 'node:assert/strict';
import { CollectionSource, CollectionSourceRequiredError, CollectionSourceSupersededError } from '../../js/player/collection-source.js';

test('file mode requires one media-root selection even when product data is available', async () => {
  const source = new CollectionSource({ protocol: 'file:', media: { catalog: 'catalog.json' } });
  source.selectDirectory({ kind: 'directory', name: 'data' });
  assert.equal(source.requiresSelection, true);
  await assert.rejects(() => source.loadExperience('gita-700'), CollectionSourceRequiredError);
});

test('web mode reports remote media failure instead of loading bundled scripture content', async () => {
  const source = new CollectionSource({
    protocol: 'https:',
    media: { remoteRoot: 'https://media.example/', catalog: 'catalog.json' },
    bookForExperience: () => 'bhagavad-gita',
    fetchImpl: async () => ({ ok: false, status: 503, text: async () => '' })
  });
  await assert.rejects(() => source.loadExperience('gita-700'), /503/);
});

test('a slower media-folder selection cannot replace a newer selection', async () => {
  const catalog = (version) => JSON.stringify({
    content_kit_version: '4.20261108-061242',
    content_version: version,
    mounts: [{ mount_id: 'media', remote: 'https://media.example/', local: 'media', inventories: [{ id: 'all', path: 'files.json', hash: 'b'.repeat(64) }] }],
    books: [{ book_id: 'bhagavad-gita', manifest: 'book/bhagavad-gita/manifest.json', manifest_hash: 'a'.repeat(64) }]
  });
  let releaseFirst;
  const firstReady = new Promise((resolve) => { releaseFirst = resolve; });
  const file = (folder, text) => ({ name: 'catalog.json', webkitRelativePath: `${folder}/catalog.json`, text });
  const source = new CollectionSource({ protocol: 'file:', media: { catalog: 'catalog.json' } });
  const first = source.selectMediaFiles([file('first', async () => { await firstReady; return catalog('first'); })]);
  await source.selectMediaFiles([file('second', async () => catalog('second'))]);
  releaseFirst();
  await assert.rejects(first, CollectionSourceSupersededError);
  assert.equal(source.label, 'second');
});
