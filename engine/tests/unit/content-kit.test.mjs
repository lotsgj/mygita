import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import { buildReferenceGraph, checkFile, checkSave, collections, configuredExperiences, contentTree, describe, insertItem, listProducts, mutationSnapshot, openMedia, openMediaSnapshot, planCollectionMutation, planDefaultMutation, planItemMutation, planMove, planVariantMutation, publish, readItems, removeItem, updateItem, usage, validationRegistries } from '../../js/content-kit.js';
import { resolveVariant, validateVariant } from '../../js/content-kit-v4.js';

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
const hashText = async (text) => createHash('sha256').update(text).digest('hex');

test('products list their books and normalized languages from the local workspace', async () => {
  const products = listProducts(await localWorkspace());
  const byId = Object.fromEntries(products.map((product) => [product.id, product]));
  assert.deepEqual(byId['bhagavad-gita'].bookIds, ['bhagavad-gita']);
  assert.deepEqual(byId.sukta.bookIds, ['ganesha-atharva', 'purusha-sukta']);
  assert.equal(byId.sukta.languages.source, 'sa');
  assert.deepEqual(products.flatMap((product) => product.problems), []);
});

test('configured experiences expose kit-4 binding slots and resolvable composition rows', async () => {
  const workspace = await localWorkspace();
  const media = await openMedia(readText);
  const experiences = await configuredExperiences(workspace, media);
  assert.deepEqual(experiences.map((entry) => entry.experience_id).sort(), ['gita-700', 'gita-chant', 'gita-sara', 'gita-yoga', 'sukta-chant']);
  const collectionsByBook = new Map();
  for (const book of media.books) collectionsByBook.set(book.id, await collections(media, book.id));
  for (const experience of experiences) {
    assert.ok(Object.keys(experience.bindings).length, `${experience.experience_id} has binding slots`);
    for (const row of experience.rows) {
      const slot = experience.bindings[row.binding_slot_id];
      assert.ok(slot, `${row.binding_slot_id} is declared`);
      assert.equal(row.content_type, slot.content_type);
      const collection = collectionsByBook.get(row.book_id).find((entry) => entry.content_type === row.content_type && entry.collection_id === row.collection_id);
      assert.ok(collection, `${row.collection_id} exists`);
      const resolved = resolveVariant(collection, { part: slot.part, key: row.item_key, preferences: slot.variantPreferences, renditionPreferences: slot.renditionPreferences, capabilities: { formats: ['mp3', 'ogg', 'opus', 'webp', 'png', 'svg', 'jpg', 'json'] } });
      assert.ok(resolved.variant, `${experience.experience_id}/${row.binding_slot_id}/${row.owner_key} resolves`);
    }
  }
});

test('usage reports every configured experience that uses Swami Brahmananda audio', async () => {
  const workspace = await localWorkspace(); const media = await openMedia(readText);
  const result = await usage(workspace, media, { book_id: 'bhagavad-gita', content_type: 'audio', collection_id: 'chanting-swami-brahmananda' });
  assert.deepEqual(result.map((entry) => entry.experience_id).sort(), ['gita-700', 'gita-chant', 'gita-sara']);
  assert.ok(result.every((entry) => entry.binding_slot_id === 'primary-audio'));
  const variantResult = await usage(workspace, media, { book_id: 'bhagavad-gita', content_type: 'audio', collection_id: 'chanting-swami-brahmananda', variant_id: 'recording-default' }, { resolveVariant });
  assert.deepEqual(variantResult.map((entry) => entry.experience_id).sort(), ['gita-700', 'gita-chant', 'gita-sara']);
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
  assert.deepEqual(media.registries.languages.rows.map((row) => row.language_id), ['sa', 'en', 'kn']);
  assert.deepEqual(validationRegistries(media), {
    languages: ['sa', 'en', 'kn'],
    contributors: ['swami-brahmananda', 'aj-padma-aj-vijay'],
    cuePurposes: []
  });
});

test('a workspace requiring a newer kit is rejected before any content is activated', async () => {
  const catalog = JSON.parse(await readText('catalog.json'));
  catalog.minimum_kit_version = '4.99999999-999999';
  await assert.rejects(openMediaSnapshot({ catalogText: JSON.stringify(catalog), texts: {} }), (error) => error.code === 'KIT_UPDATE_REQUIRED');
  catalog.minimum_kit_version = '10.20261107-000000';
  await assert.rejects(openMediaSnapshot({ catalogText: JSON.stringify(catalog), texts: {} }), (error) => error.code === 'KIT_UPDATE_REQUIRED');
  catalog.minimum_kit_version = 'not-a-version';
  await assert.rejects(openMediaSnapshot({ catalogText: JSON.stringify(catalog), texts: {} }), (error) => error.code === 'INVALID_KIT_VERSION');
});

test('the Content-Kit 4 tree separates collections and assigns every book file once', async () => {
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
  assert.ok(gita.some((node) => node.kind === 'collection' && node.id === 'question:gita-sara-contemplations' && node.title === 'Gita Sara Contemplations'));
  assert.ok(gita.some((node) => node.kind === 'collection' && node.id === 'question:gita-sara-default-contemplation'));
  assert.ok(gita.some((node) => node.kind === 'collection' && node.id === 'image:gita-sara-illustrations'));
  assert.ok(gita.some((node) => node.kind === 'collection' && node.id === 'image:gita-sara-default-illustration'));
  assert.ok(gita.find((node) => node.id === 'image:gita-chapter-icons').files.some((file) => file.path.endsWith('chapter-01.svg')));
  assert.deepEqual(gita.find((node) => node.kind === 'experience' && node.id === 'gita-sara').uses, ['book/bhagavad-gita/experience/gita-700/images.csv']);
  const files = gita.flatMap((node) => node.files);
  assert.equal(files.find((file) => file.path === 'book/bhagavad-gita/verses/master_en.csv').language, 'en');
  assert.equal(files.find((file) => file.path === 'book/bhagavad-gita/registry/verses/collection_kn.csv').language, 'kn');
  assert.equal(files.find((file) => file.path.endsWith('/questions/gita-sara-contemplations/master_en.csv')).language, 'en');
});

test('canonical collections expose validated variants, stable keys and current renditions', async () => {
  const media = await openMedia(readText);
  const registries = validationRegistries(media);
  const gita = await collections(media, 'bhagavad-gita');
  assert.equal(gita.length, 9);
  for (const collection of gita) {
    assert.deepEqual(collection.problems, [], `${collection.collection_id} has no contract problems`);
    for (const [partId, part] of Object.entries(collection.parts)) {
      assert.deepEqual(part.expected_keys, part.variants.find((variant) => variant.variant_id === part.default_variant_id)?.items.map((item) => item.key) || []);
      for (const variant of part.variants) validateVariant(collection.content_type, partId, variant, registries);
    }
  }
  const illustrations = gita.find((collection) => collection.collection_id === 'gita-sara-illustrations');
  assert.match(illustrations.parts.image.variants[0].content_url, /catalog\.csv$/);
  assert.ok(illustrations.parts.metadata.variants.every((variant) => /master_(?:en|kn)\.csv$/.test(variant.content_url)));
  const audio = gita.find((collection) => collection.collection_id === 'chanting-swami-brahmananda');
  assert.equal(audio.parts.recording.variants[0].attributes.voice, 'swami-brahmananda');
  assert.ok(audio.parts.recording.variants.flatMap((variant) => variant.items).flatMap((item) => item.renditions).every((rendition) => ['mp3', 'ogg', 'opus'].includes(rendition.format)));
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
  const editableKind = /\/(?:verses\/master_[a-z]+|registry\/verse\/metadata\/[^/]+\/master_[a-z]+|(?:questions|illustration)\/[^/]+\/master_[a-z]+)\.csv$/;
  for (const book of media.books) {
    for (const entry of book.manifest.files.filter((entry) => editableKind.test(entry.path))) {
      assert.ok(offered.has(entry.path), `${entry.path} is offered for editing`);
    }
  }
  const gita = await contentTree(media, 'bhagavad-gita');
  assert.equal(gita.find((node) => node.id === 'audio:chanting-swami-brahmananda').editable, 'text');
  assert.equal(gita.find((node) => node.id === 'verse:bhagavad-gita').files.find((file) => file.contract === 'source-master').contract, 'source-master');
});

test('runtime views are generated, read-only and rebuilt from canonical content during publish', async () => {
  const media = await openMedia(readText);
  const runtimePath = 'book/bhagavad-gita/runtime/registry/verses/collection_en.csv';
  const runtimeFile = (await contentTree(media, 'bhagavad-gita')).flatMap((node) => node.files).find((file) => file.path === runtimePath);
  assert.equal(runtimeFile.generated, true);
  assert.equal(runtimeFile.editable, false);
  const runtimeText = await readText(runtimePath);
  assert.throws(() => updateItem(runtimeFile, runtimeText, 'bhagavad-gita', { title: 'Direct edit' }), /generated/);

  const canonicalPath = 'book/bhagavad-gita/registry/verses/collection_en.csv';
  const original = await readText(canonicalPath);
  const changed = original.replace('Bhagavad Gita', 'Bhagavad Gita publish acceptance');
  assert.notEqual(changed, original);
  const readOverride = async (logicalPath) => logicalPath === canonicalPath ? changed : readText(logicalPath);
  const hashOf = async (logicalPath, override = null) => createHash('sha256').update(override == null ? await readOverride(logicalPath) : override).digest('hex');
  const result = await publish(media, { readText: readOverride, hashOf, releaseLabel: media.catalog.content_version, updatedAt: media.catalog.updated_at });
  assert.deepEqual(result.problems.blocking, []);
  const runtimeWrite = result.writes.find((write) => write.path === runtimePath);
  assert.ok(runtimeWrite);
  assert.match(runtimeWrite.text, /publish acceptance/);
});

test('item mutation plans add, change and remove through a validated snapshot', async () => {
  const media = await openMedia(readText);
  const target = { book_id: 'bhagavad-gita', content_type: 'question', collection_id: 'gita-sara-contemplations', part: 'text', variant_id: 'text-en' };
  const changedPlan = await planItemMutation(media, { ...target, operation: 'change', key: '1.1:1', values: { text: 'Changed through a plan' } }, { hashText });
  assert.ok(changedPlan.writes.every((write) => write.text && write.precondition && write.postcondition.hash));
  let snapshot = mutationSnapshot(media, changedPlan);
  let collection = (await collections(snapshot, 'bhagavad-gita')).find((entry) => entry.collection_id === target.collection_id);
  assert.equal(collection.parts.text.variants.find((entry) => entry.variant_id === 'text-en').items.find((item) => item.key === '1.1:1').values.text, 'Changed through a plan');
  const publishPreview = await publish(snapshot, { readText: snapshot.readText, hashOf: async (path, replacement = null) => hashText(replacement ?? await snapshot.readText(path)), releaseLabel: media.catalog.content_version, updatedAt: media.catalog.updated_at });
  assert.deepEqual(publishPreview.problems.blocking, []);
  assert.ok(publishPreview.writes.some((write) => write.path === 'book/bhagavad-gita/manifest.json'));

  const addPlan = await planItemMutation(snapshot, { ...target, operation: 'add', values: { sid: '99.1', order: '1', text: 'New question' }, after: '2.47:2' }, { hashText });
  snapshot = mutationSnapshot(snapshot, addPlan);
  collection = (await collections(snapshot, 'bhagavad-gita')).find((entry) => entry.collection_id === target.collection_id);
  assert.ok(collection.parts.text.variants.find((entry) => entry.variant_id === 'text-en').items.some((item) => item.key === '99.1:1'));

  const removePlan = await planItemMutation(snapshot, { ...target, operation: 'remove', key: '99.1:1' }, { hashText });
  snapshot = mutationSnapshot(snapshot, removePlan);
  collection = (await collections(snapshot, 'bhagavad-gita')).find((entry) => entry.collection_id === target.collection_id);
  assert.equal(collection.parts.text.variants.find((entry) => entry.variant_id === 'text-en').items.some((item) => item.key === '99.1:1'), false);
  assert.ok(removePlan.affected.runtime.length);
});

test('variant and default plans add and retarget a valid semantic variant', async () => {
  const media = await openMedia(readText);
  const target = { book_id: 'bhagavad-gita', content_type: 'question', collection_id: 'gita-sara-contemplations', part: 'text' };
  const variantPlan = await planVariantMutation(media, { ...target, operation: 'add', variant_id: 'text-sa', attributes: { languages: ['sa'] }, content_url: 'book/bhagavad-gita/questions/gita-sara-contemplations/master_sa.csv', contract: 'question-master', content_text: 'sid#order#text\n1.1#1#कः धृतराष्ट्रः?\n' }, { hashText });
  let snapshot = mutationSnapshot(media, variantPlan);
  let collection = (await collections(snapshot, 'bhagavad-gita')).find((entry) => entry.collection_id === target.collection_id);
  const added = collection.parts.text.variants.find((entry) => entry.variant_id === 'text-sa');
  assert.deepEqual(validateVariant('question', 'text', added, validationRegistries(snapshot)).attributes.languages, ['sa']);

  const changePlan = await planVariantMutation(snapshot, { ...target, operation: 'change', variant_id: 'text-sa', attributes: { languages: ['kn'] } }, { hashText });
  snapshot = mutationSnapshot(snapshot, changePlan);
  collection = (await collections(snapshot, 'bhagavad-gita')).find((entry) => entry.collection_id === target.collection_id);
  assert.deepEqual(collection.parts.text.variants.find((entry) => entry.variant_id === 'text-sa').attributes.languages, ['kn']);

  const defaultPlan = await planDefaultMutation(snapshot, { ...target, variant_id: 'text-sa' }, { hashText });
  snapshot = mutationSnapshot(snapshot, defaultPlan);
  collection = (await collections(snapshot, 'bhagavad-gita')).find((entry) => entry.collection_id === target.collection_id);
  assert.equal(collection.parts.text.default_variant_id, 'text-sa');
});

test('collection plans add and change a complete collection through one snapshot', async () => {
  const media = await openMedia(readText);
  const plan = await planCollectionMutation(media, {
    operation: 'add', book_id: 'bhagavad-gita', content_type: 'question',
    collection: { collection_id: 'sample-contemplation', contributors: '', license: 'CC0-1.0', source: 'test' },
    index: { path: 'book/bhagavad-gita/questions/sample-contemplation/catalog.csv', contract: 'question-catalog', text: 'sid#order#line_type\n1.1#1#question\n' },
    parts: {
      text: { default_variant_id: 'text-en', variant_id: 'text-en', attributes: { languages: ['en'] }, content_url: 'book/bhagavad-gita/questions/sample-contemplation/master_en.csv', contract: 'question-master', content_text: 'sid#order#text\n1.1#1#A sample question?\n' },
      'collection-metadata': { default_variant_id: 'metadata-en', variant_id: 'metadata-en', attributes: { languages: ['en'] }, content_url: 'book/bhagavad-gita/registry/question/metadata/sample-contemplation-en.csv', contract: 'ck4-collection-metadata', content_text: 'collection_id#title#short_name#description#attribution\nsample-contemplation#Sample contemplation#Sample#Test collection#\n' }
    }
  }, { hashText });
  let snapshot = mutationSnapshot(media, plan);
  let collection = (await collections(snapshot, 'bhagavad-gita')).find((entry) => entry.collection_id === 'sample-contemplation');
  assert.equal(collection.license, 'CC0-1.0');
  assert.deepEqual(collection.problems, []);
  const changePlan = await planCollectionMutation(snapshot, { operation: 'change', book_id: 'bhagavad-gita', content_type: 'question', collection_id: 'sample-contemplation', values: { license: 'CC-BY-4.0' } }, { hashText });
  snapshot = mutationSnapshot(snapshot, changePlan);
  collection = (await collections(snapshot, 'bhagavad-gita')).find((entry) => entry.collection_id === 'sample-contemplation');
  assert.equal(collection.license, 'CC-BY-4.0');
  assert.ok(plan.affected.manifests.includes('book/bhagavad-gita/manifest.json'));
  assert.ok(plan.affected.activation.includes('media.ver'));
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

test('Content-Kit 4 describes a data-driven API and edits JSON descriptors safely', async () => {
  const api = describe();
  assert.equal(api.api, 4);
  assert.match(api.version, /^4\.\d{8}-\d{6}$/);
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
