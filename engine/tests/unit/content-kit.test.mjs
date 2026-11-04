import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { contentTree, listProducts, openMedia, readItems, updateItem } from '../../js/content-kit.js';

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
  assert.deepEqual(media.books.map((book) => book.id), ['bhagavad-gita', 'ganesha-atharva', 'purusha-sukta']);
  for (const book of media.books) {
    assert.deepEqual(book.problems, []);
    assert.deepEqual([...book.languages].sort(), ['en', 'kn', 'sa']);
  }
});

test('the content tree offers every editable text file the manifests reference', async () => {
  const { media, files } = await editableFiles();
  const offered = new Set(files.map((file) => file.path));
  const editableKind = /\/(?:verses\/master_[a-z]+|registry\/verses\/collection_[a-z]+|(?:questions|illustration)\/[^/]+\/master_[a-z]+)\.csv$/;
  for (const book of media.books) {
    for (const file of book.manifest.files.filter((entry) => editableKind.test(entry))) {
      assert.ok(offered.has(file), `${file} is offered for editing`);
    }
  }
  const gita = await contentTree(media, 'bhagavad-gita');
  assert.equal(gita.find((node) => node.kind === 'audio').editable, 'none');
  assert.equal(gita.find((node) => node.kind === 'verses').files.find((file) => file.language === 'sa').contract, 'source-master');
});

test('editing a field and restoring it gives byte-identical text for every editable file', async () => {
  const { files } = await editableFiles();
  for (const file of files) {
    const text = await readText(file.path);
    const { fields, items } = readItems(file, text);
    const field = fields.find((entry) => entry.editable).name;
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
  assert.throws(() => readItems({ path: 'book/test/audio/catalog.csv', contract: null }, text), /not editable/);
});
