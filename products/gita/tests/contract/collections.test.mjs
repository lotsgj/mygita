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

test('Gita product retains configuration but no scripture content', async () => {
  assert.equal(await missing(path.join(productRoot, 'data/collections')), true);
  for (const id of ['gita-700', 'gita-yoga', 'gita-chant', 'gita-sara']) {
    const folder = path.join(productRoot, 'data/experiences', id);
    assert.deepEqual((await readdir(folder)).sort(), ['catalog.csv', 'experience.json']);
    const config = JSON.parse(await readFile(path.join(folder, 'experience.json'), 'utf8'));
    assert.equal(config.id, id);
    assert.equal(config.verseCollection, 'bhagavad-gita');
  }
});

test('every Gita experience loads scripture content only through the media contract', () => {
  const output = execFileSync(process.execPath, ['engine/scripts/verify-media-parity.mjs', mediaRoot], { cwd: repoRoot, encoding: 'utf8' });
  for (const id of ['gita-700', 'gita-yoga', 'gita-chant', 'gita-sara']) assert.match(output, new RegExp(`✓ ${id}/bhagavad-gita:`));
  assert.match(output, /Media-only content loading verified/);
});
