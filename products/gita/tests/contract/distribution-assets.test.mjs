import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.resolve(root, '../../dist/mygita');
const config = JSON.parse(await readFile(path.join(root, 'data/distribution.json'), 'utf8'));

async function exists(relative) { await access(path.join(root, relative)); }

test('every Gita experience declares its portable media book', () => {
  assert.ok(config.experiences.length > 0);
  assert.ok(config.experiences.every((experience) => experience.bookId === 'bhagavad-gita'));
});

test('every configured Bhagavad Gita visual and theme belongs to the product', async () => {
  const branding = config.branding;
  const paths = [
    branding.fluteImage, branding.socialImage, branding.icon192, branding.icon512,
    branding.maskableIcon512, branding.appleTouchIcon, ...(branding.themeStyles || []),
    ...config.experiences.map((experience) => experience.cardImage)
  ];
  assert.ok(paths.every(Boolean));
  await Promise.all(paths.map(exists));
  assert.ok(paths.every((entry) => entry.startsWith('assets/') || entry.startsWith('css/')));
});

test('the generated distribution serves Rachana without adding it to the PWA precache', async () => {
  const [entries, assetManifest] = await Promise.all([
    readdir(dist),
    readFile(path.join(dist, 'asset-manifest.json'), 'utf8').then(JSON.parse)
  ]);
  assert.equal(entries.includes('docs.html'), true);
  assert.equal(entries.includes('docs'), true);
  for (const required of ['docs.html', 'docs/navigation.json', 'docs/welcome.md', 'docs/assets/docs.css', 'docs/assets/docs.bundle.js']) {
    assert.ok(assetManifest.assets[required], `Rachana deployment is missing ${required}`);
    assert.equal(assetManifest.precache.includes(required), false, `${required} must not be PWA-precached`);
  }
});

test('generated platform metadata references Bhagavad Gita-owned assets', async () => {
  const [html, manifest] = await Promise.all([
    readFile(path.join(dist, 'index.html'), 'utf8'),
    readFile(path.join(dist, 'manifest.webmanifest'), 'utf8').then(JSON.parse)
  ]);
  assert.match(html, /assets\/branding\/krishna-flute\.svg/);
  assert.match(html, /assets\/social\/gitaverse-preview\.png/);
  assert.match(html, /css\/theme\.css/);
  assert.deepEqual(manifest.icons.map((icon) => icon.src), [
    'products/gita/assets/icons/icon-192.png',
    'products/gita/assets/icons/icon-512.png',
    'products/gita/assets/icons/icon-maskable-512.png'
  ]);
});
