import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { execFileSync } from 'node:child_process';

const productRoot = path.resolve(import.meta.dirname, '../..');
const repoRoot = path.resolve(productRoot, '../..');
const mediaRoot = path.resolve(repoRoot, '../media');

async function missing(target) {
  try { await access(target); return false; } catch { return true; }
}

test('Sukta product retains configuration but no scripture content', async () => {
  assert.equal(await missing(path.join(productRoot, 'data/collections')), true);
  const folder = path.join(productRoot, 'data/experiences/sukta-chant');
  assert.deepEqual((await readdir(folder)).sort(), ['catalog.csv', 'experience.json']);
  const config = JSON.parse(await readFile(path.join(folder, 'experience.json'), 'utf8'));
  assert.equal(config.id, 'sukta-chant');
  assert.deepEqual(config.verseCollections, ['ganesha-atharva', 'purusha-sukta']);
  assert.ok(config.bindings && Object.keys(config.bindings).length, 'sukta-chant declares kit-4 bindings');
});

test('both Sukta books load content only through the media contract', () => {
  const output = execFileSync(process.execPath, ['engine/scripts/verify-media-parity.mjs', mediaRoot], { cwd: repoRoot, encoding: 'utf8' });
  assert.match(output, /✓ sukta-chant\/ganesha-atharva: 18 media rows/);
  assert.match(output, /✓ sukta-chant\/purusha-sukta: 26 media rows/);
});
