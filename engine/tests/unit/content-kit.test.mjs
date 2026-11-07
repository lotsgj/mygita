import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { buildReferenceGraph, checkFile, checkSave, contentTree, describe, insertItem, listProducts, openMedia, openMediaSnapshot, planMove, readItems, removeItem, updateItem } from '../../js/content-kit.js';

const repoRoot = path.resolve(import.meta.dirname, '../../..');
const mediaRoot = process.env.MYGITA_MEDIA_ROOT || path.resolve(repoRoot, '../media');
const readText = (logicalPath) => readFile(path.join(mediaRoot, logicalPath), 'utf8');

async function localWorkspace() {
  const context = { document: { currentScript: { src: new URL('engine/js/local-workspace.js', `file://${repoRoot}/`).href } }, URL };
  context.globalThis = context;
  vm.runInNewContext(await readFile(path.join(repoRoot, 'engine/js/local-workspace.js'), 'utf8'), context);
  return context.__MYGITA_LOCAL_WORKSPACE__;
}

async function editableFiles() {
  const media = await openMedia(readText);
  const files = [];
  for (const book of media.books) {
    for (const node of await contentTree(media, book.id)) files.push(...node.files.filter((file) => file.editable));
  }
  return { media, files };
}

const changedLines = (before, after) => {
  const a = before.split('\n');
  const b = after.split('\n');
  return a.map((line, index) => (line === b[index] ? -1 : index)).filter((index) => index >= 0);
};

test('products list their books and normalized languages from the local workspace', async () => {
  const products = listProducts(await localWorkspace());
  const byId = Object.fromEntries(products.map((product) => [product.id, product]));
  assert.deepEqual(byId['bhagavad-gita'].bookIds, ['bhagavad-gita']);
  assert.deepEqual(byId.sukta.bookIds, ['ganesha-atharva', 'purusha-sukta']);
  assert.equal(byId.sukta.languages.source, 'sa');
  assert.deepEqual(products.flatMap((product) => product.problems), []);
});

test('the media root opens every book with its declared languages', async () => {
  const media = await openMedia(readText);
  assert.equal(media.inventoryParts.length, 1);
  assert.ok(media.fileIndex.size > 1000);
  assert.deepEqual(media.books.map((book) => book.id), ['bhagavad-gita', 'ganesha-atharva', 'purusha-sukta']);
  for (const book of media.books) {
    assert.deepEqual(book.problems, []);
    assert.deepEqual([...book.languages].sort(), ['en', 'kn', 'sa']);
  }
});

test('a workspace requiring a newer kit is rejected before any content is activated', async () => {
  const catalog = JSON.parse(await readText('catalog.json'));
  catalog.minimum_kit_version = '3.99999999-999999';
  await assert.rejects(openMediaSnapshot({ catalogText: JSON.stringify(catalog), texts: {} }), (error) => error.code === 'KIT_UPDATE_REQUIRED');
  catalog.minimum_kit_version = '10.20261107-000000';
  await assert.rejects(openMediaSnapshot({ catalogText: JSON.stringify(catalog), texts: {} }), (error) => error.code === 'KIT_UPDATE_REQUIRED');
  catalog.minimum_kit_version = 'not-a-version';
  await assert.rejects(openMediaSnapshot({ catalogText: JSON.stringify(catalog), texts: {} }), (error) => error.code === 'INVALID_KIT_VERSION');
});

test('the Content-Kit 3 tree separates collections and assigns every book file once', async () => {
  const media = await openMedia(readText);
  for (const book of media.books) {
    const tree = await contentTree(media, book.id);
    const semantic = tree.filter((node) => node.kind !== 'resources');
    const paths = semantic.flatMap((node) => node.files.map((file) => file.path));
    assert.equal(paths.length, new Set(paths).size, `${book.id} files have one semantic assignment`);
    assert.equal(paths.length, book.manifest.files.length + 1, `${book.id} inventory includes its manifest`);
    assert.equal(tree.find((node) => node.kind === 'other'), undefined, `${book.id} has no unclassified files`);
  }
  const gita = await contentTree(media, 'bhagavad-gita');
  assert.ok(gita.some((node) => node.kind === 'questions' && node.id === 'gita-sara-contemplations' && node.title === 'Gita Sara Contemplations'));
  assert.ok(gita.some((node) => node.kind === 'questions' && node.id === 'gita-sara-default-contemplation'));
  assert.ok(gita.some((node) => node.kind === 'images' && node.id === 'gita-sara-illustrations'));
  assert.ok(gita.some((node) => node.kind === 'images' && node.id === 'gita-sara-default-illustration'));
  assert.ok(gita.find((node) => node.id === 'gita-chapter-icons').files.some((file) => file.path.endsWith('chapter-01.svg')));
  assert.deepEqual(gita.find((node) => node.kind === 'experience' && node.id === 'gita-sara').uses, ['book/bhagavad-gita/experience/gita-700/images.csv']);
  assert.equal(gita.find((node) => node.kind === 'verses').files.find((file) => file.path === 'book/bhagavad-gita/verses/master_en.csv').language, 'en');
  assert.equal(gita.find((node) => node.kind === 'details').files.find((file) => file.path === 'book/bhagavad-gita/registry/verses/collection_kn.csv').language, 'kn');
  assert.equal(gita.find((node) => node.kind === 'questions' && node.id === 'gita-sara-contemplations').files.find((file) => file.path.endsWith('/master_en.csv')).language, 'en');
});

test('field types come from contracts and committed single-line values contain no line breaks', async () => {
  const { media, files } = await editableFiles();
  const localized = describe().contracts['localized-master'];
  assert.equal(localized.fields.transliteration.type, 'multiline');
  assert.equal(localized.fields.meaning.type, 'multiline');
  assert.equal(localized.fields.word_by_word_meaning.type, 'multiline');
  assert.equal(describe().contracts['illustration-metadata'].fields.alt_text.type, 'multiline');
  assert.equal(describe().contracts['illustration-metadata'].fields.alt, undefined);
  for (const file of files.filter((entry) => entry.path.endsWith('.csv'))) {
    const parsed = readItems(file, await readText(file.path));
    for (const field of parsed.fields.filter((entry) => entry.type === 'text')) {
      for (const item of parsed.items) assert.doesNotMatch(String(item.values[field.name] || ''), /[\r\n]/, `${file.path} ${item.key} ${field.name}`);
    }
    assert.deepEqual(checkFile(file, await readText(file.path)), []);
  }
  assert.ok([...media.fileIndex.values()].every((entry) => describe().contracts[entry.contract]));
});

test('typed validation reports bad number, millisecond, hash and path values', () => {
  const file = { path: 'book/test/segments.csv', contract: 'media-segments' };
  const text = 'segment#media_hash#start_ms#end_ms#slide_id#sid#cue_id\n0#bad#-1#x##1.1#\n';
  const problems = checkFile(file, text);
  assert.ok(problems.some((problem) => problem.field === 'segment'));
  assert.ok(problems.some((problem) => problem.field === 'media_hash'));
  assert.ok(problems.some((problem) => problem.field === 'start_ms'));
  assert.ok(problems.some((problem) => problem.field === 'end_ms'));
});

test('the pure reference graph produces a grace-aware move plan for Media Admin', () => {
  const graph = buildReferenceGraph([
    { path: 'book/test/catalog.csv', text: 'sid#order#image_url\n1.1#1#image/test/shared.webp\n' },
    { path: 'book/test/other.csv', text: 'sid#order#image_url\n1.2#1#image/test/shared.webp\n' },
    { path: 'image/test/shared.webp', text: '' }
  ]);
  assert.equal(graph.related('image/test/shared.webp').length, 2);
  const plan = planMove(graph, 'image/test/shared.webp', 'image/test/moved.webp', { retainUntil: '2026-12-07T00:00:00Z', retireAfterVersion: 'release-2' });
  assert.equal(plan.writes.length, 2);
  assert.equal(plan.physical[1].operation, 'retire');
  assert.equal(plan.publishOrder.at(-1), 'media.ver');
});

test('the content tree offers every editable text file the manifests reference', async () => {
  const { media, files } = await editableFiles();
  const offered = new Set(files.map((file) => file.path));
  const editableKind = /\/(?:verses\/master_[a-z]+|registry\/verses\/collection_[a-z]+|(?:questions|illustration)\/[^/]+\/master_[a-z]+)\.csv$/;
  for (const book of media.books) {
    for (const entry of book.manifest.files.filter((entry) => editableKind.test(entry.path))) {
      assert.ok(offered.has(entry.path), `${entry.path} is offered for editing`);
    }
  }
  const gita = await contentTree(media, 'bhagavad-gita');
  assert.equal(gita.find((node) => node.kind === 'audio').editable, 'text');
  assert.equal(gita.find((node) => node.kind === 'verses').files.find((file) => file.language === 'sa').contract, 'source-master');
});

test('editing a field and restoring it gives byte-identical text for every editable file', async () => {
  const { files } = await editableFiles();
  for (const file of files.filter((entry) => entry.path.endsWith('.csv'))) {
    const text = await readText(file.path);
    const { fields, items } = readItems(file, text);
    const editable = fields.find((entry) => entry.editable);
    if (!editable || !items.length) continue;
    const field = editable.name;
    for (const item of [items[0], items[Math.floor(items.length / 2)], items.at(-1)]) {
      assert.equal(updateItem(file, text, item.key, item.values), text, `${file.path} ${item.key} unchanged`);
      const edited = updateItem(file, text, item.key, { [field]: `${item.values[field]} edited` });
      assert.equal(changedLines(text, edited).length, 1, `${file.path} ${item.key} changes one line`);
      const restored = readItems(file, edited).items.find((entry) => entry.key === item.key);
      assert.equal(updateItem(file, edited, item.key, { [field]: item.values[field] }), text, `${file.path} ${item.key} restores`);
      assert.equal(restored.values[field], `${item.values[field]} edited`);
    }
  }
});

test('Content-Kit 3 describes a data-driven API and edits JSON descriptors safely', async () => {
  const api = describe();
  assert.equal(api.api, 3);
  assert.match(api.version, /^3\.\d{8}-\d{6}$/);
  assert.ok(api.contracts['source-master']);
  assert.ok(api.contracts.deck);
  const { files } = await editableFiles();
  const file = files.find((entry) => entry.contract === 'deck');
  assert.ok(file, 'a deck descriptor is exposed');
  const text = await readText(file.path);
  const parsed = JSON.parse(text);
  parsed.test_note = 'round trip';
  const edited = updateItem(file, text, file.path, { json: `${JSON.stringify(parsed, null, 2)}\n` });
  assert.equal(JSON.parse(edited).test_note, 'round trip');
  assert.throws(() => updateItem(file, text, file.path, { json: '{broken' }), /JSON/);
});

test('CSV records can be inserted and removed without disturbing surrounding bytes', () => {
  const file = { path: 'book/test/questions/sample/master_en.csv', contract: 'question-master' };
  const text = 'sid#order#text\n1.1#1#One\n1.1#3#Three\n';
  const inserted = insertItem(file, text, { sid: '1.1', order: '2', text: 'Two' }, { after: '1.1:1' });
  assert.equal(inserted, 'sid#order#text\n1.1#1#One\n1.1#2#Two\n1.1#3#Three\n');
  assert.equal(removeItem(file, inserted, '1.1:2'), text);
});

test('connected save checks block dangling collection items and missing assets', async () => {
  const media = await openMedia(readText);
  const tree = await contentTree(media, 'bhagavad-gita');
  const composition = tree.flatMap((group) => group.files).find((file) => file.path.endsWith('/experience/gita-sara/media.csv'));
  const compositionText = await readText(composition.path);
  const compositionItem = readItems(composition, compositionText).items[0];
  const broken = updateItem(composition, compositionText, compositionItem.key, { collection: 'missing-collection' });
  const dangling = await checkSave(media, composition, broken, { readText });
  assert.ok(dangling.blocking.some((problem) => /missing-collection/.test(problem.message)));

  let imageCatalog = null;
  for (const candidate of tree.flatMap((group) => group.files).filter((file) => file.contract === 'illustration-catalog')) {
    if (readItems(candidate, await readText(candidate.path)).items.length) { imageCatalog = candidate; break; }
  }
  assert.ok(imageCatalog);
  const assetCheck = await checkSave(media, imageCatalog, await readText(imageCatalog.path), { readText, exists: async () => false });
  assert.ok(assetCheck.blocking.some((problem) => /Referenced asset does not exist/.test(problem.message)));
});

test('updates enforce the collection contract', async () => {
  const media = await openMedia(readText);
  const file = (await contentTree(media, 'bhagavad-gita'))[0].files.find((entry) => entry.language === 'en');
  const text = await readText(file.path);
  assert.throws(() => updateItem(file, text, '2.47', { meaning: 'a # b' }), (error) => error.field === 'meaning' && /# character/.test(error.message));
  assert.throws(() => updateItem(file, text, '2.47', { sid: '2.48' }), (error) => error.field === 'sid');
  assert.throws(() => updateItem(file, text, '2.47', { chapter_name: 'Changed' }), (error) => error.field === 'chapter_name');
  assert.throws(() => updateItem(file, text, '2.47', { unknown: 'x' }), (error) => error.field === 'unknown');
  assert.throws(() => updateItem(file, text, '99.99', { meaning: 'x' }), (error) => error.key === '99.99');
  const multiline = updateItem(file, text, '2.47', { meaning: 'first\nsecond' });
  assert.match(multiline, /#first\\nsecond#/);
  assert.equal(readItems(file, multiline).items.find((item) => item.key === '2.47').values.meaning, 'first\nsecond');
});

test('the chapters view renames one chapter across its rows only', async () => {
  const media = await openMedia(readText);
  const file = (await contentTree(media, 'bhagavad-gita'))[0].files.find((entry) => entry.language === 'en');
  const text = await readText(file.path);
  const before = readItems(file, text);
  const chapters = readItems(file, text, { view: 'chapters' });
  assert.ok(chapters.items.every((item) => !item.problems.length));
  const renamed = updateItem(file, text, '2', { chapter_name: 'Renamed Chapter' }, { view: 'chapters' });
  const after = readItems(file, renamed).items;
  const chapterRows = before.items.filter((item) => item.values.cid === '2').length;
  assert.equal(changedLines(text, renamed).length, chapterRows);
  assert.ok(after.filter((item) => item.values.cid === '2').every((item) => item.values.chapter_name === 'Renamed Chapter'));
  assert.deepEqual(after.filter((item) => item.values.cid !== '2'), before.items.filter((item) => item.values.cid !== '2'));
  assert.throws(() => readItems(file, text, { view: 'unknown' }));
});

test('line endings, byte order mark and blank lines survive an edit', () => {
  const file = { path: 'book/test/questions/sample/master_en.csv', contract: 'question-master' };
  const text = '﻿sid#order#text\r\n1.1#1#One\r\n\r\n1.1#2#Two\r\n';
  const edited = updateItem(file, text, '1.1:2', { text: 'Second' });
  assert.equal(edited, '﻿sid#order#text\r\n1.1#1#One\r\n\r\n1.1#2#Second\r\n');
  assert.equal(readItems(file, edited).items[1].label, '1.1 #2');
  assert.throws(() => readItems({ path: 'book/test/audio/catalog.csv', contract: null }, text), /no declared Content-Kit contract/);
});
