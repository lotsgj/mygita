import test from 'node:test';
import assert from 'node:assert/strict';
import { CollectionSource, CollectionSourceRequiredError } from '../../js/player/collection-source.js';

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
