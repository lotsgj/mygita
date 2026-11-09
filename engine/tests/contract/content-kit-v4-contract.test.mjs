import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import * as contentKitV4 from '../../js/content-kit-v4.js';
import { CONTENT_KIT_V4_BUNDLE, buildContentKitV4 } from '../../scripts/build-content-kit-v4.mjs';

const engineRoot = path.resolve(import.meta.dirname, '../..');
const committed = await readFile(path.join(engineRoot, CONTENT_KIT_V4_BUNDLE), 'utf8');

function loadBundle() {
  const context = {}; context.globalThis = context;
  vm.runInNewContext(committed, context);
  return context.MyGitaContentKitV4;
}

test('the committed Content-Kit 4 bundle matches its frozen sources', async () => {
  assert.equal(committed, await buildContentKitV4(), 'content-kit-v4.bundle.js is stale: run pnpm build:content-kit-v4');
});

test('the Content-Kit 4 bundle exposes the exact module contract', () => {
  const bundle = loadBundle();
  assert.deepEqual(Object.keys(bundle).sort(), Object.keys(contentKitV4).sort());
  assert.equal(bundle.KIT_API, 4);
  assert.equal(bundle.KIT_VERSION, contentKitV4.KIT_VERSION);
  assert.match(bundle.KIT_BUILD, /^[a-f0-9]{12}$/);
  const bundledDescription = JSON.parse(JSON.stringify(bundle.describe()));
  const moduleDescription = JSON.parse(JSON.stringify(contentKitV4.describe()));
  delete bundledDescription.build; delete moduleDescription.build;
  assert.deepEqual(bundledDescription, moduleDescription);
});

test('Content-Kit 4 remains local contract tooling outside the deployed player', async () => {
  const deployment = await readFile(path.join(engineRoot, 'scripts/build-deployment.mjs'), 'utf8');
  assert.doesNotMatch(deployment, /content-kit-v4/);
});
