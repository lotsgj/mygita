import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const dist = path.resolve(root, '../../dist/gita');
const config = JSON.parse(await readFile(path.join(root, 'data/distribution.json'), 'utf8'));

async function exists(relative) { await access(path.join(root, relative)); }

test('every configured Gitaverse visual and theme belongs to the distribution', async () => {
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

test('the generated distribution contains no Rachana documentation', async () => {
  const entries = await readdir(dist);
  assert.equal(entries.includes('docs.html'), false);
  assert.equal(entries.includes('docs'), false);
});

test('generated product metadata references Gitaverse-owned assets', async () => {
  const [html, manifest] = await Promise.all([
    readFile(path.join(dist, 'index.html'), 'utf8'),
    readFile(path.join(dist, 'manifest.webmanifest'), 'utf8').then(JSON.parse)
  ]);
  assert.match(html, /assets\/branding\/krishna-flute\.svg/);
  assert.match(html, /assets\/social\/gitaverse-preview\.png/);
  assert.match(html, /css\/theme\.css/);
  assert.deepEqual(manifest.icons.map((icon) => icon.src), [
    '/assets/icons/icon-192.png', '/assets/icons/icon-512.png', '/assets/icons/icon-maskable-512.png'
  ]);
});
