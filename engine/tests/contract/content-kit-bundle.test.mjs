import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import vm from 'node:vm';
import * as contentKit from '../../js/content-kit.js';
import { CONTENT_KIT_BUNDLE, buildContentKit } from '../../scripts/build-content-kit.mjs';

const engineRoot = path.resolve(import.meta.dirname, '../..');
const mediaRoot = process.env.MYGITA_MEDIA_ROOT || path.resolve(engineRoot, '../../media');
const committed = await readFile(path.join(engineRoot, CONTENT_KIT_BUNDLE), 'utf8');

function loadBundle() {
  const context = { URL };
  context.globalThis = context;
  vm.runInNewContext(committed, context);
  return context.MyGitaContentKit;
}

test('the committed content-kit bundle matches its sources', async () => {
  assert.equal(committed, await buildContentKit(), 'content-kit.bundle.js is stale: run pnpm build:content-kit');
});

test('the content-kit bundle exposes exactly the module API and behaves the same', async () => {
  const bundle = loadBundle();
  assert.deepEqual(Object.keys(bundle).sort(), Object.keys(contentKit).sort());
  assert.equal(bundle.KIT_VERSION, contentKit.KIT_VERSION);
  assert.match(bundle.KIT_BUILD, /^[a-f0-9]{12}$/);
  assert.equal(new Set(Object.keys(bundle)).size, Object.keys(bundle).length);
  const readText = (logicalPath) => readFile(path.join(mediaRoot, logicalPath), 'utf8');
  const shape = (value) => JSON.parse(JSON.stringify(value));
  const [moduleMedia, bundleMedia] = await Promise.all([contentKit.openMedia(readText), bundle.openMedia(readText)]);
  const [moduleTree, bundleTree] = await Promise.all([contentKit.contentTree(moduleMedia, 'bhagavad-gita'), bundle.contentTree(bundleMedia, 'bhagavad-gita')]);
  assert.deepEqual(shape(bundleTree), shape(moduleTree));
  const file = moduleTree[0].files.find((entry) => entry.language === 'kn');
  const text = await readText(file.path);
  assert.deepEqual(shape(bundle.readItems(file, text)), shape(contentKit.readItems(file, text)));
  assert.equal(bundle.updateItem(file, text, '2.47', { meaning: 'x' }), contentKit.updateItem(file, text, '2.47', { meaning: 'x' }));
});

test('the content-kit bundle is local tooling and never deployed', async () => {
  const deployment = await readFile(path.join(engineRoot, 'scripts/build-deployment.mjs'), 'utf8');
  assert.doesNotMatch(deployment, /content-kit/);
});
