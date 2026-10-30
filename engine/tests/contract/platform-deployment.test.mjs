import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../../../', import.meta.url);
const [workflow, app, builder, pwa] = await Promise.all([
  readFile(new URL('.github/workflows/deploy-pages.yml', root), 'utf8'),
  readFile(new URL('products/app.json', root), 'utf8').then(JSON.parse),
  readFile(new URL('engine/scripts/build-platform.mjs', root), 'utf8'),
  readFile(new URL('engine/js/pwa.js', root), 'utf8')
]);

test('MyGita Pages deployment publishes only the verified unified distribution', () => {
  assert.match(workflow, /pnpm run build:mygita/);
  assert.match(workflow, /pnpm run test:platform-browser/);
  assert.match(workflow, /pnpm run test:gita:browser/);
  assert.match(workflow, /pnpm run test:sukta:browser/);
  assert.match(workflow, /pnpm run test:docs-browser/);
  assert.match(workflow, /GA_MEASUREMENT_ID: \$\{\{ vars\.GA_MEASUREMENT_ID \}\}/);
  assert.match(builder, /GA_MEASUREMENT_ID/);
  assert.match(builder, /ga-measurement-id/);
  assert.match(workflow, /path: dist\/mygita/);
  assert.match(workflow, /actions\/deploy-pages@v4/);
  assert.match(workflow, /github\.event_name != 'pull_request'/);
});

test('MyGita production identity and PWA paths work at root and project Pages URLs', () => {
  assert.equal(app.canonicalUrl, 'https://mygita.gitajyoti.org/');
  assert.match(builder, /start_url: '\.\/player\.html', scope: '\.\/'/);
  assert.match(pwa, /scope: '\.\/'/);
});
