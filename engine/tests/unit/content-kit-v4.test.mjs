import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { COMPOSITION_CONTRACT, CONTENT_TYPES, KIT_API, KIT_VERSION, coverage, describe, planTransaction, resolveCollection, resolveVariant, validateVariant } from '../../js/content-kit-v4.js';

const fixtureRoot = path.resolve(import.meta.dirname, '../fixtures/content-kit-v4');
const fixture = async (name) => JSON.parse(await readFile(path.join(fixtureRoot, `${name}.json`), 'utf8'));

test('Content-Kit 4 freezes the reviewed type, part and registry vocabulary', () => {
  const contract = describe();
  assert.equal(KIT_API, 4);
  assert.match(KIT_VERSION, /^4\.\d{8}-\d{6}$/);
  assert.deepEqual(Object.keys(CONTENT_TYPES), ['verse', 'question', 'image', 'audio', 'video', 'deck']);
  assert.equal(contract.contentTypes.image.parts.image.representation, 'records');
  assert.equal(contract.contentTypes.image.parts.metadata.representation, 'file');
  assert.equal(contract.contentTypes.audio.parts.recording.semanticAttributes.includes('voice'), true);
  assert.equal(contract.registries.defaults.layout, 'registry/<type>/defaults.csv');
  assert.deepEqual(contract.identifiers.collection.scope, ['book_id', 'content_type', 'collection_id']);
  assert.equal(contract.registries.contributors.scope, 'media');
  assert.equal(contract.registries.cuePurposes.scope, 'media');
  assert.equal(contract.labels.contentTypes.audio, 'Audio');
  assert.equal(contract.labels.parts.recording, 'Recording');
  assert.equal(contract.labels.attributes.languages, 'Languages');
  assert.equal(contract.labels.values.none, 'No value');
  assert.equal(contract.labels.fields.collection_id, 'Collection ID');
});

test('languages reject mixed none and unknown registry ids', async () => {
  const verse = await fixture('verse');
  const variant = structuredClone(verse.parts.text.variants[0]);
  variant.attributes.languages = ['none', 'en'];
  assert.throws(() => validateVariant('verse', 'text', variant, { languages: ['sa', 'en', 'kn'] }), /none.*own/i);
  variant.attributes.languages = ['xx'];
  assert.throws(() => validateVariant('verse', 'text', variant, { languages: ['sa', 'en', 'kn'] }), /unknown language/i);
});

test('representative file and record variants validate without path inference', async () => {
  const registries = { languages: ['sa', 'en', 'kn'], contributors: ['aj-padma-aj-vijay'] };
  for (const name of ['verse', 'question', 'image', 'audio']) {
    const collection = await fixture(name);
    for (const [partId, partValue] of Object.entries(collection.parts)) {
      for (const variant of partValue.variants) {
        const normalized = validateVariant(collection.content_type, partId, variant, registries);
        assert.equal(normalized.representation, CONTENT_TYPES[collection.content_type].parts[partId].representation);
      }
    }
  }
  const verse = await fixture('verse');
  const renamed = structuredClone(verse.parts.text.variants[1]);
  renamed.content_url = 'book/bhagavad-gita/opaque/42.csv';
  assert.deepEqual(validateVariant('verse', 'text', renamed, registries).attributes.languages, ['en']);
});

test('resolver selects semantics before a supported rendition and explains the result', async () => {
  const audio = await fixture('audio');
  const result = resolveVariant(audio, {
    part: 'recording', key: '1.1:1',
    preferences: { languages: [['sa', 'kn', 'en'], ['sa'], 'none'], voice: ['aj-padma-aj-vijay', 'none'], mode: ['learn', 'chant'] },
    renditionPreferences: { format: ['ogg', 'mp3'] }, capabilities: { formats: ['mp3'] }
  });
  assert.equal(result.variant.variant_id, 'padma-vijay-learn');
  assert.equal(result.rendition.rendition_id, 'mp3');
  assert.ok(result.reason.matched.includes('languages:exact'));
  assert.equal(result.reason.capability, 'mp3-supported');
});

test('any is a lower-ranked match and none requires an explicit fallback', async () => {
  const image = await fixture('image');
  const fallback = resolveVariant(image, { part: 'image', key: '1.1:1', preferences: { languages: [['en'], 'none'], theme: ['dark', 'any'] }, capabilities: { formats: ['webp'] } });
  assert.equal(fallback.variant.variant_id, 'contemplative-neutral');
  assert.ok(fallback.reason.fallback.includes('languages:fallback'));
  assert.ok(fallback.reason.fallback.includes('theme:any'));
  const absent = resolveVariant(image, { part: 'image', key: '1.1:1', preferences: { languages: [['kn']], theme: ['dark'] }, capabilities: { formats: ['webp'] } });
  assert.equal(absent.variant, null);
});

test('declared attribute priority is lexicographic and preference any is indifferent', async () => {
  const image = await fixture('image');
  const highLanguage = structuredClone(image.parts.image.variants[0]);
  highLanguage.variant_id = 'kn-any';
  highLanguage.attributes = { languages: ['kn'], theme: 'any' };
  const lowLanguage = structuredClone(image.parts.image.variants[1]);
  lowLanguage.variant_id = 'en-dark';
  image.parts.image.variants = [highLanguage, lowLanguage];
  image.parts.image.default_variant_id = 'en-dark';
  const prioritized = resolveVariant(image, { part: 'image', key: '1.1:1', preferences: { languages: [['kn'], ['en']], theme: ['dark', 'any'] }, capabilities: { formats: ['webp', 'png'] } });
  assert.equal(prioritized.variant.variant_id, 'kn-any');

  const indifferent = resolveVariant(image, { part: 'image', key: '1.1:1', preferences: { languages: ['any'], theme: ['any'] }, capabilities: { formats: ['webp', 'png'] } });
  assert.equal(indifferent.variant.variant_id, 'en-dark', 'the default wins when the caller is indifferent');
});

test('coverage distinguishes complete and sparse variants without reading binaries', async () => {
  const verse = await fixture('verse');
  const report = coverage(verse, 'text', { scope: 'intrinsic' });
  assert.equal(report.expected, 2);
  assert.equal(report.variants.find((entry) => entry.variant_id === 'translation-en').missing, 0);
  assert.deepEqual(report.variants.find((entry) => entry.variant_id === 'translation-kn').missing_keys, ['1.2']);
  assert.equal(resolveCollection(verse, 'text', { preferences: { languages: [['en']] } }).length, 2);
});

test('composition binds a collection item but never a variant', async () => {
  const composition = await fixture('composition');
  assert.equal(COMPOSITION_CONTRACT.selectsVariant, false);
  assert.deepEqual(Object.keys(composition.rows[0]), COMPOSITION_CONTRACT.fields);
  assert.equal(composition.configured_experience.bindings['primary-audio'].variantPreferences.mode[0], 'learn');
  assert.equal('variant_id' in composition.rows[0], false);
});

test('publication plans enforce preconditions, deterministic stages and media.ver last', async () => {
  const input = await fixture('transaction');
  const plan = planTransaction(input);
  assert.deepEqual(plan.operations.map((entry) => entry.stage), ['asset', 'content', 'media.ver']);
  assert.equal(plan.idempotent, true);
  assert.equal(plan.operations.at(-1).path, 'media.ver');
  assert.throws(() => planTransaction({ transactionId: 'bad', operations: input.operations.slice(1) }), /media\.ver last/);
});
