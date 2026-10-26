import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

import { normalizeDistribution } from '../../js/distribution.js';
import { availableExperiences, configureExperiences, getExperience } from '../../js/player/renderers/registry.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const repositoryRoot = path.resolve(root, '..');

const sample = {
  schemaVersion: 1,
  id: 'sample-verses',
  name: 'Sample Verses',
  databaseName: 'sample-verses-profiles',
  cachePrefix: 'sample-verses',
  defaultExperience: 'listen',
  journeyExperience: 'listen',
  experiences: [
    { id: 'listen', renderer: 'player-1', label: 'Listen' },
    { id: 'learn', renderer: 'player-2', label: 'Learn' },
    { id: 'reflect', renderer: 'player-3', label: 'Reflect' }
  ]
};

test('distribution contract normalizes independent identity and storage namespaces', () => {
  const config = normalizeDistribution(sample);
  assert.equal(config.id, 'sample-verses');
  assert.equal(config.databaseName, 'sample-verses-profiles');
  assert.equal(config.cachePrefix, 'sample-verses');
  assert.deepEqual(config.experiences.map(({ id, renderer }) => ({ id, renderer })), [
    { id: 'listen', renderer: 'player-1' },
    { id: 'learn', renderer: 'player-2' },
    { id: 'reflect', renderer: 'player-3' }
  ]);
});

test('public experience ids are configured separately from reusable renderers', () => {
  configureExperiences(normalizeDistribution(sample));
  assert.deepEqual(availableExperiences().map(([id]) => id), ['listen', 'learn', 'reflect']);
  assert.equal(getExperience('listen').renderer, 'player-1');
  assert.equal(getExperience('gita-700'), null);
});

test('invalid renderer and experience references fail clearly', () => {
  assert.throws(() => normalizeDistribution({ ...sample, defaultExperience: 'missing' }), /default experience/);
  assert.throws(() => configureExperiences(normalizeDistribution({
    ...sample,
    experiences: [{ id: 'listen', renderer: 'player-99', label: 'Listen' }]
  })), /unavailable renderer player-99/);
});

test('local harness and distribution builder are present', async () => {
  const [player, builder] = await Promise.all([
    readFile(path.join(root, 'index.html'), 'utf8'),
    readFile(path.join(root, 'scripts/build-distribution.mjs'), 'utf8')
  ]);
  assert.match(player, /id="distribution-folder-input"/);
  assert.match(player, /window\.__VERSES_DISTRIBUTION__/);
  assert.match(player, /js\/local-harness\.js/);
  assert.match(builder, /data\/distribution\.json/);
  assert.match(builder, /dist/);
});

test('the reusable engine owns only font assets', async () => {
  assert.deepEqual((await readdir(path.join(root, 'assets'))).sort(), ['fonts']);
});

test('products live inside the Verses repository', async () => {
  await access(path.join(repositoryRoot, 'products/gita/data/distribution.json'));
  await access(path.join(repositoryRoot, 'products/sukta/data/distribution.json'));
});
