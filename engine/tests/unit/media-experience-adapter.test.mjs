import test from 'node:test';
import assert from 'node:assert/strict';
import { createMediaResourceReader, createMediaUrlResolver } from '../../js/media-experience-adapter.js';

test('experience resources route explicit logical paths without legacy guessing', async () => {
  const calls = [];
  const read = createMediaResourceReader({
    mediaSource: { readText: async (path) => { calls.push(['media', path]); return 'media'; } },
    productText: async (path) => { calls.push(['product', path]); return 'product'; }
  });
  assert.equal(await read('book/bhagavad-gita/verses/master_en.csv'), 'media');
  assert.equal(await read('data/experiences/gita-700/experience.json'), 'product');
  assert.deepEqual(calls, [
    ['media', 'book/bhagavad-gita/verses/master_en.csv'],
    ['product', 'data/experiences/gita-700/experience.json']
  ]);
});

test('owned media resolves only logical paths and rejects absolute legacy URLs', () => {
  const resolve = createMediaUrlResolver({
    mediaSource: { resolveMedia: (path) => `mounted:${path}` },
    resolveProductMediaUrl: (path) => `product:${path}`
  });
  assert.equal(resolve('image/bhagavad-gita/hero.webp'), 'mounted:image/bhagavad-gita/hero.webp');
  assert.equal(resolve('assets/product-icon.svg'), 'product:assets/product-icon.svg');
  assert.throws(() => resolve('https://media.gitajyoti.org/legacy.webp'), /logical path/);
});
