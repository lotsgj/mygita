const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const { chromium } = require('playwright');

const root = path.resolve(__dirname, '../../../dist/mygita');
const mime = { '.css': 'text/css', '.csv': 'text/csv', '.html': 'text/html', '.js': 'text/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json' };
const server = http.createServer((request, response) => {
  const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
  const file = path.resolve(root, relative);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file) || !fs.statSync(file).isFile()) return response.writeHead(404).end();
  response.setHeader('content-type', mime[path.extname(file)] || 'application/octet-stream');
  fs.createReadStream(file).pipe(response);
});

const manifest = JSON.parse(fs.readFileSync(path.join(root, 'manifest.webmanifest'), 'utf8'));
const assetManifest = JSON.parse(fs.readFileSync(path.join(root, 'asset-manifest.json'), 'utf8'));
assert.equal(manifest.name, 'MyGita');
assert.equal(manifest.start_url, './player.html');
assert.equal(manifest.scope, './');
assert.equal(assetManifest.distribution, 'mygita');
assert.ok(Object.keys(assetManifest.assets).some((name) => name.startsWith('products/gita/data/')));
assert.ok(Object.keys(assetManifest.assets).some((name) => name.startsWith('products/sukta/data/')));
assert.equal(assetManifest.precache.some((name) => name.startsWith('products/') && name.includes('/data/')), false, 'product catalogs remain navigation-loaded rather than shell-precached');

(async () => {
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true, executablePath: process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (error) => errors.push(error.message));
  page.on('response', (response) => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  const base = `http://127.0.0.1:${server.address().port}/`;
  await page.goto(base, { waitUntil: 'networkidle' });
  await page.getByLabel('Name', { exact: true }).fill('Product Regression');
  await page.getByLabel('Date of birth', { exact: true }).fill('1990-01-01');
  await page.getByLabel('App language', { exact: true }).selectOption('en');
  await page.getByRole('button', { name: 'Save profile' }).click();
  await page.locator('#product-list .product-pill').first().waitFor();
  assert.equal(await page.locator('#product-list .product-pill').count(), 2);
  assert.equal(await page.locator('[data-product-id="bhagavad-gita"]').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('[data-app-name]').innerText(), 'MyGita');
  assert.equal(await page.title(), 'MyGita');
  await page.locator('[data-product-id="sukta"]').click();
  await page.locator('#diksoochi').waitFor();
  assert.equal(await page.locator('[data-product-id="sukta"]').getAttribute('aria-selected'), 'true');
  assert.equal(await page.locator('#sukta-chant-link').isVisible(), true);
  assert.match(page.url(), /[?&]product=sukta/);
  assert.equal(await page.locator('[data-app-name]').innerText(), 'MyGita', 'product selection must not rename the platform');
  assert.equal(await page.title(), 'MyGita');
  await page.locator('#diksoochi [data-about]').click();
  assert.equal(await page.locator('#about-title').innerText(), 'About MyGita');
  await page.locator('[data-about-close]').click();
  await page.goto(`${base}?pid=1&view=diksoochi`, { waitUntil: 'networkidle' });
  assert.equal(await page.locator('[data-product-id="sukta"]').getAttribute('aria-selected'), 'true', 'selected product persists per profile');
  await page.locator('#sukta-chant-link').click();
  await page.locator('#experience-detail-action').click();
  try { await page.locator('.verse-chant-panels').waitFor(); }
  catch (error) {
    const visible = await page.locator('body > section:not([hidden]), body > main:not([hidden]), #app:not([hidden]), #error-view:not([hidden])').evaluateAll((elements) => elements.map((element) => `${element.id || element.tagName}:${element.textContent.trim().slice(0, 220)}`));
    throw new Error(`Sukta experience did not open: ${visible.join(' | ')}; runtime errors: ${errors.join(' | ')}`, { cause: error });
  }
  assert.match(page.url(), /[?&]product=sukta/);
  await page.goto(`${base}?pid=1&product=bhagavad-gita&play=gita-chant&sid=2.47`, { waitUntil: 'networkidle' });
  await page.locator('.verse-chant-panels').waitFor();
  assert.match(page.url(), /[?&]product=bhagavad-gita/);
  assert.equal(await page.locator('#sid-label').innerText(), '2.47');
  assert.equal(await page.title(), 'MyGita');
  assert.deepEqual(errors, []);
  await browser.close();
  server.close();
  console.log('PASS: MyGita product pills switch product distributions and open the selected experience.');
})().catch((error) => { console.error(error); server.close(); process.exitCode = 1; });
