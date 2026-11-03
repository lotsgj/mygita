import test from 'node:test';
import assert from 'node:assert/strict';
import { mediaPathForProductPath } from '../../js/media-experience-adapter.js';

const manifest = {
  book_id: 'bhagavad-gita',
  verses: {
    catalog: 'book/bhagavad-gita/verses/catalog.csv',
    masters: { en: 'book/bhagavad-gita/verses/master_en.csv' }
  },
  registries: {
    verses: {
      structural: 'book/bhagavad-gita/registry/verses/collection.csv',
      localized: { en: 'book/bhagavad-gita/registry/verses/collection_en.csv' }
    },
    audio: 'book/bhagavad-gita/registry/audio/collection.csv',
    images: 'book/bhagavad-gita/registry/image/collection.csv'
  },
  files: [
    'book/bhagavad-gita/registry/verses/collection.csv',
    'book/bhagavad-gita/registry/verses/collection_en.csv',
    'book/bhagavad-gita/registry/audio/collection.csv',
    'book/bhagavad-gita/registry/image/collection.csv',
    'book/bhagavad-gita/verses/catalog.csv',
    'book/bhagavad-gita/verses/master_en.csv',
    'book/bhagavad-gita/audio/chanting/catalog.csv',
    'book/bhagavad-gita/illustration/gita-sara-illustrations/master_en.csv',
    'book/bhagavad-gita/questions/gita-sara-contemplations/catalog.csv',
    'book/bhagavad-gita/experience/gita-sara/audio.csv',
    'book/bhagavad-gita/experience/gita-sara/image.csv'
  ]
};
const route = (path) => mediaPathForProductPath(path, { manifest, experienceId: 'gita-sara' });

test('adapter routes mutable book content while leaving product configuration local', () => {
  assert.equal(route('data/collections/verses/collection.csv'), 'book/bhagavad-gita/registry/verses/collection.csv');
  assert.equal(route('products/gita/data/collections/verses/collection.csv'), 'book/bhagavad-gita/registry/verses/collection.csv');
  assert.equal(route('data/collections/verses/collection_en.csv'), 'book/bhagavad-gita/registry/verses/collection_en.csv');
  assert.equal(route('data/collections/audio/collection.csv'), 'book/bhagavad-gita/registry/audio/collection.csv');
  assert.equal(route('data/collections/images/collection.csv'), 'book/bhagavad-gita/registry/image/collection.csv');
  assert.equal(route('data/collections/verses/bhagavad-gita/master_en.csv'), 'book/bhagavad-gita/verses/master_en.csv');
  assert.equal(route('data/collections/audio/chanting/catalog.csv'), 'book/bhagavad-gita/audio/chanting/catalog.csv');
  assert.equal(route('data/collections/images/gita-sara-illustrations/master_en.csv'), 'book/bhagavad-gita/illustration/gita-sara-illustrations/master_en.csv');
  assert.equal(route('data/collections/text/gita-sara-contemplations/catalog.csv'), 'book/bhagavad-gita/questions/gita-sara-contemplations/catalog.csv');
  assert.equal(route('data/experiences/gita-sara/audio.csv'), 'book/bhagavad-gita/experience/gita-sara/audio.csv');
  assert.equal(route('data/experiences/gita-sara/images.csv'), 'book/bhagavad-gita/experience/gita-sara/image.csv');
  assert.equal(route('data/experiences/gita-sara/experience.json'), '');
  assert.equal(route('data/collections/images/gita-chapter-icons/catalog.csv'), '');
});

test('adapter accepts direct paths only when the manifest declares them', () => {
  assert.equal(route('book/bhagavad-gita/verses/master_en.csv'), 'book/bhagavad-gita/verses/master_en.csv');
  assert.equal(route('book/bhagavad-gita/secret.csv'), '');
});
