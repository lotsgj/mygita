import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { normalizeDistribution } from '../../../../engine/js/distribution.js';

const productRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');

async function parseTable(relativePath) {
  const source = (await readFile(path.join(productRoot, relativePath), 'utf8')).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n');
  const lines = source.split('\n').filter((line) => line.length);
  const headers = lines.shift().split('#');
  const rows = lines.map((line, index) => {
    const values = line.split('#');
    assert.equal(values.length, headers.length, `${relativePath} row ${index + 2} column count`);
    return Object.fromEntries(headers.map((header, column) => [header, values[column]]));
  });
  return { headers, rows };
}

const sa = await parseTable('data/collections/verses/ganesha-atharva/master_sa.csv');
const en = await parseTable('data/collections/verses/ganesha-atharva/master_en.csv');
const kn = await parseTable('data/collections/verses/ganesha-atharva/master_kn.csv');
const audio = await parseTable('data/experiences/sukta-chant/audio.csv');
const images = await parseTable('data/experiences/sukta-chant/images.csv');
const purushaSa = await parseTable('data/collections/verses/purusha-sukta/master_sa.csv');
const purushaEn = await parseTable('data/collections/verses/purusha-sukta/master_en.csv');
const purushaKn = await parseTable('data/collections/verses/purusha-sukta/master_kn.csv');

const identities = (dataset) => dataset.rows.map(({ cid, snum, sid }) => [cid, snum, sid]);

test('Ganesha Atharvashirsha masters follow the canonical multilingual contract', () => {
  assert.deepEqual(sa.headers, ['cid', 'snum', 'sid', 'chapter_name', 'shloka_raw', 'shloka', 'word_by_word', 'meaning', 'word_by_word_meaning']);
  for (const dataset of [en, kn]) {
    assert.deepEqual(dataset.headers, ['cid', 'snum', 'sid', 'chapter_name', 'transliteration', 'meaning', 'word_by_word_meaning']);
  }
  for (const [label, dataset] of Object.entries({ sa, en, kn })) {
    assert.equal(dataset.rows.length, 18, `${label} row count`);
    assert.equal(new Set(dataset.rows.map(({ sid }) => sid)).size, 18, `${label} unique SIDs`);
    assert.deepEqual(identities(dataset), identities(sa), `${label} canonical SID order`);
    dataset.rows.forEach((row) => {
      assert.equal(row.sid, `${row.cid}.${row.snum}`, `${label} ${row.sid} identity`);
      assert.ok(row.chapter_name, `${label} ${row.sid} chapter name`);
    });
  }
  sa.rows.forEach((row) => {
    assert.ok(row.shloka_raw, `${row.sid} raw Sanskrit`);
    assert.ok(row.shloka, `${row.sid} display Sanskrit`);
    assert.equal(row.shloka_raw.includes('\\n'), false, `${row.sid} raw Sanskrit has no display line markers`);
  });
  en.rows.forEach((row) => assert.ok(row.transliteration, `${row.sid} English transliteration`));
  kn.rows.forEach((row) => assert.ok(row.transliteration, `${row.sid} Kannada transliteration`));
});

test('Purusha Sukta masters follow the same canonical multilingual contract', () => {
  assert.deepEqual(purushaSa.headers, ['cid', 'snum', 'sid', 'chapter_name', 'shloka_raw', 'shloka', 'word_by_word', 'meaning', 'word_by_word_meaning']);
  for (const dataset of [purushaEn, purushaKn]) {
    assert.deepEqual(dataset.headers, ['cid', 'snum', 'sid', 'chapter_name', 'transliteration', 'meaning', 'word_by_word_meaning']);
  }
  for (const [label, dataset] of Object.entries({ sa: purushaSa, en: purushaEn, kn: purushaKn })) {
    assert.equal(dataset.rows.length, 26, `${label} row count`);
    assert.equal(new Set(dataset.rows.map(({ sid }) => sid)).size, 26, `${label} unique SIDs`);
    assert.deepEqual(identities(dataset), identities(purushaSa), `${label} canonical SID order`);
    dataset.rows.forEach((row) => assert.equal(row.sid, `${row.cid}.${row.snum}`, `${label} ${row.sid} identity`));
  }
});

test('English transliterations use Latin-compatible svara marks only', () => {
  const forbidden = /[\u0900-\u097f\u1cd0-\u1cff\ua8e0-\ua8ff]/u;
  const allowedSvara = /[\u030d\u030e\u0331]/u;
  for (const [collection, dataset] of Object.entries({ 'ganesha-atharva': en, 'purusha-sukta': purushaEn })) {
    assert.ok(dataset.rows.some((row) => allowedSvara.test(row.transliteration)), `${collection} has Latin svara marks`);
    dataset.rows.forEach((row) => {
      assert.equal(forbidden.test(row.transliteration), false, `${collection} ${row.sid} contains an Indic mark`);
      assert.equal(row.transliteration.normalize('NFC'), row.transliteration, `${collection} ${row.sid} is NFC`);
    });
  }
});

test('Sukta Chant composes every canonical SID without inventing media', () => {
  assert.deepEqual(audio.headers, ['cid', 'snum', 'sid', 'chant_full_sa_collection', 'chant_full_sa_order']);
  assert.deepEqual(images.headers, ['cid', 'snum', 'sid', 'chapter_icon_collection', 'chapter_icon_order']);
  for (const dataset of [audio, images]) {
    assert.equal(dataset.rows.length, 18);
    assert.deepEqual(identities(dataset), identities(sa));
  }
  audio.rows.forEach((row) => assert.equal(row.chant_full_sa_collection + row.chant_full_sa_order, '', `${row.sid} audio placeholder`));
  images.rows.forEach((row) => assert.equal(row.chapter_icon_collection + row.chapter_icon_order, '', `${row.sid} image placeholder`));
});

test('Suktaverse registers one Player-4 experience with independent product identity', async () => {
  const distribution = normalizeDistribution(JSON.parse(await readFile(path.join(productRoot, 'data/distribution.json'), 'utf8')));
  assert.equal(distribution.id, 'suktaverse');
  assert.equal(distribution.databaseName, 'suktaverse-profiles');
  assert.equal(distribution.cachePrefix, 'suktaverse');
  assert.equal(distribution.defaultExperience, 'sukta-chant');
  assert.equal(distribution.journeyExperience, 'sukta-chant');
  assert.deepEqual(distribution.experiences.map(({ id, renderer }) => ({ id, renderer })), [{ id: 'sukta-chant', renderer: 'player-4' }]);
  assert.equal(distribution.translations.en['common.about'], 'About Suktaverse');

  const experience = JSON.parse(await readFile(path.join(productRoot, 'data/experiences/sukta-chant/experience.json'), 'utf8'));
  assert.equal(experience.verseCollection, 'ganesha-atharva');
  assert.equal(experience.renderer, 'verse-chant');
  assert.deepEqual(experience.languages, ['sa', 'en', 'kn']);
});

test('Sukta registries and catalogs resolve the complete local experience', async () => {
  const verses = await parseTable('data/collections/verses/collection.csv');
  const verseCatalog = await parseTable('data/collections/verses/ganesha-atharva/catalog.csv');
  const experiences = await parseTable('data/experiences/collection.csv');
  const experienceCatalog = await parseTable('data/experiences/sukta-chant/catalog.csv');
  const audioCollections = await parseTable('data/collections/audio/collection.csv');
  const imageCollections = await parseTable('data/collections/images/collection.csv');
  const animationCollections = await parseTable('data/collections/animations/collection.csv');
  const deckCollections = await parseTable('data/collections/deck/collection.csv');
  const textCollections = await parseTable('data/collections/text/collection.csv');
  const videoCollections = await parseTable('data/collections/video/collection.csv');

  assert.deepEqual(verses.rows, [
    { collection_id: 'ganesha-atharva', order: '1', enabled: 'true', path: 'ganesha-atharva', catalog_url: 'data/collections/verses/ganesha-atharva/catalog.csv' },
    { collection_id: 'purusha-sukta', order: '2', enabled: 'true', path: 'purusha-sukta', catalog_url: 'data/collections/verses/purusha-sukta/catalog.csv' }
  ]);
  for (const language of ['sa', 'en', 'kn']) {
    const metadata = await parseTable(`data/collections/verses/collection_${language}.csv`);
    assert.deepEqual(metadata.headers, ['collection_id', 'name', 'short_name', 'description']);
    assert.deepEqual(metadata.rows.map((row) => row.collection_id), ['ganesha-atharva', 'purusha-sukta']);
    assert.ok(metadata.rows.every((row) => row.name && row.short_name));
  }
  assert.deepEqual(verseCatalog.rows.map(({ language }) => language), ['sa', 'en', 'kn']);
  assert.deepEqual(experiences.rows, [{ collection_id: 'sukta-chant', title: 'Sukta Chant', catalog_url: 'data/experiences/sukta-chant/catalog.csv' }]);
  assert.deepEqual(experienceCatalog.rows.map(({ content_type }) => content_type), ['configuration', 'audio', 'images']);
  assert.equal(audioCollections.rows.length, 0);
  assert.equal(imageCollections.rows.length, 0);
  assert.equal(animationCollections.rows.length, 0);
  assert.equal(deckCollections.rows.length, 0);
  assert.equal(textCollections.rows.length, 0);
  assert.equal(videoCollections.rows.length, 0);
});
