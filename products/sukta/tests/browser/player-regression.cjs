const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { pathToFileURL } = require('node:url');
const { chromium } = require('playwright');

const productRoot = path.resolve(__dirname, '../..');
const engineRoot = process.env.VERSES_ENGINE_ROOT || path.resolve(productRoot, '../../engine');
const chromePath = process.env.CHROME_PATH || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const forbiddenIndicMarks = /[\u0900-\u097f\u1cd0-\u1cff\ua8e0-\ua8ff]/u;
const latinSvaraMarks = /[\u030d\u030e\u0331]/u;

function productForCollection(collection) {
  if (collection === 'ganesha-atharva') return { root: productRoot, dispose() {} };
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'suktaverse-browser-'));
  fs.cpSync(productRoot, temporaryRoot, { recursive: true });
  const experiencePath = path.join(temporaryRoot, 'data/experiences/sukta-chant/experience.json');
  const experience = JSON.parse(fs.readFileSync(experiencePath, 'utf8'));
  experience.verseCollection = collection;
  experience.verseCollections = [collection];
  fs.writeFileSync(experiencePath, JSON.stringify(experience, null, 2) + '\n');
  const master = fs.readFileSync(path.join(temporaryRoot, `data/collections/verses/${collection}/master_sa.csv`), 'utf8').trimEnd().split(/\r?\n/);
  const identity = master.slice(1).map((line) => line.split('#').slice(0, 3));
  fs.writeFileSync(path.join(temporaryRoot, 'data/experiences/sukta-chant/audio.csv'),
    ['cid#snum#sid#chant_full_sa_collection#chant_full_sa_order', ...identity.map((parts) => parts.join('#') + '##')].join('\n') + '\n');
  fs.writeFileSync(path.join(temporaryRoot, 'data/experiences/sukta-chant/images.csv'),
    ['cid#snum#sid#chapter_icon_collection#chapter_icon_order', ...identity.map((parts) => parts.join('#') + '##')].join('\n') + '\n');
  return { root: temporaryRoot, dispose() { fs.rmSync(temporaryRoot, { recursive: true, force: true }); } };
}

async function createProfile(page) {
  await page.getByLabel('Name', { exact: true }).fill('Sukta Regression');
  await page.getByLabel('Date of birth', { exact: true }).fill('1990-01-01');
  await page.getByLabel('App language', { exact: true }).selectOption('en');
  await page.getByRole('button', { name: 'Save profile' }).click();
}

async function assertSid(page, sid) {
  if (await page.locator('#sid-label').innerText() !== sid) {
    await page.keyboard.press('g');
    await page.locator('#goto-overlay').waitFor();
    await page.locator('#goto-input').fill(sid);
    await page.locator('#goto-form').press('Enter');
  }
  await page.waitForFunction(() => Array.from(document.querySelectorAll('.verse-chant-text')).every((element) => element.dataset.fitCap));
  const english = page.locator('.verse-chant-text[lang="en"]');
  const text = await english.innerText();
  assert.equal(forbiddenIndicMarks.test(text), false, `${sid} English must not contain Indic marks`);
  assert.equal(latinSvaraMarks.test(text), true, `${sid} English must retain Latin svara marks`);
  assert.equal(await english.evaluate((element) => element.classList.contains('has-vedic-marks')), true);
  const type = await english.evaluate((element) => ({
    fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
    lineHeight: Number.parseFloat(getComputedStyle(element).lineHeight)
  }));
  assert.ok(type.lineHeight / type.fontSize >= 1.65, `${sid} tone marks need generous line height`);
  const geometry = await page.locator('.verse-chant-panel').evaluateAll((panels) => panels.map((panel) => ({
    scrollWidth: panel.scrollWidth, clientWidth: panel.clientWidth,
    scrollHeight: panel.scrollHeight, clientHeight: panel.clientHeight
  })));
  geometry.forEach((box) => {
    assert.ok(box.scrollWidth <= box.clientWidth + 1, `${sid} panel width`);
    assert.ok(box.scrollHeight <= box.clientHeight + 1, `${sid} panel height`);
  });
  const alignments = await page.locator('.verse-chant-text').evaluateAll((elements) =>
    elements.map((element) => getComputedStyle(element).textAlign));
  assert.deepEqual(alignments, ['left', 'left', 'left'], `${sid} must use consistent left alignment`);
}

async function assertLongLineFixture(page, label) {
  const text = page.locator('.verse-chant-text[lang="sa"]');
  await text.evaluate((element) => {
    const lines = [
      'ॐ गणानां त्वा गणपतिं हवामहे',
      'कविं कवीनामुपमश्रवस्तमम्',
      'ज्येष्ठराजं ब्रह्मणां ब्रह्मणस्पत',
      'त्वं ब्रह्मा त्वं विष्णुः त्वं रुद्रः त्वम् इन्द्रः त्वम् अग्निः त्वं वायुः त्वं सूर्यः ॥'
    ];
    element.replaceChildren(...lines.map((value, index) => {
      const line = document.createElement('span');
      line.className = 'verse-chant-line';
      line.dataset.sourceLine = String(index);
      line.textContent = value;
      return line;
    }));
    element.dataset.noWrapFitSize = '';
    element.dataset.wrappedFitSize = '';
    window.dispatchEvent(new Event('resize'));
  });
  await page.waitForFunction(() => {
    const element = document.querySelector('.verse-chant-text[lang="sa"]');
    return element?.dataset.wrapped === 'true' && Number(element.dataset.wrappedFitSize) > 0;
  });
  const result = await text.evaluate((element) => {
    const line = element.querySelector('.verse-chant-line');
    const panel = element.parentElement;
    return {
      noWrap: Number(element.dataset.noWrapFitSize),
      wrapped: Number(element.dataset.wrappedFitSize),
      fontSize: Number.parseFloat(getComputedStyle(element).fontSize),
      textAlign: getComputedStyle(element).textAlign,
      wordBreak: getComputedStyle(line).wordBreak,
      overflowWrap: getComputedStyle(line).overflowWrap,
      fitsHeight: element.scrollHeight <= panel.clientHeight - parseFloat(getComputedStyle(panel).paddingTop) - parseFloat(getComputedStyle(panel).paddingBottom) + 1
    };
  });
  assert.ok(result.noWrap > 0, `${label} fixture must have a measurable no-wrap candidate`);
  assert.ok(result.wrapped >= result.noWrap * 1.25, `${label} wrapped size must improve by at least 25%`);
  assert.ok(result.fontSize >= result.noWrap * 1.25, `${label} rendered size must use the wrapped candidate`);
  assert.equal(result.textAlign, 'left');
  assert.equal(result.wordBreak, 'normal');
  assert.equal(result.overflowWrap, 'normal');
  assert.equal(result.fitsHeight, true, `${label} fixture must fit the panel height`);
}

async function runCollection(browser, collection, sids) {
  const product = productForCollection(collection);
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  context.setDefaultTimeout(15000);
  const page = await context.newPage();
  const runtimeErrors = [];
  page.on('pageerror', (error) => runtimeErrors.push(error.message));
  page.on('console', (message) => { if (message.type() === 'error') runtimeErrors.push(message.text()); });
  try {
    await page.goto(pathToFileURL(path.join(engineRoot, 'index.html')).href + `?play=sukta-chant&sid=${encodeURIComponent(sids[0])}&lang=en`, { waitUntil: 'domcontentloaded' });
    await page.locator('#distribution-folder-input').setInputFiles(product.root);
    await createProfile(page);
    try {
      await page.locator('.verse-chant-panels').waitFor();
    } catch (error) {
      const visible = await page.locator('body > section:not([hidden]), body > main:not([hidden]), #app:not([hidden]), #profile-setup:not([hidden]), #diksoochi:not([hidden]), #error-view:not([hidden])').evaluateAll((elements) => elements.map((element) => `${element.id || element.tagName}:${element.textContent.trim().slice(0, 160)}`));
      throw new Error(`${collection} did not open: ${visible.join(' | ')}; runtime errors: ${runtimeErrors.join(' | ')}`, { cause: error });
    }
    assert.equal(await page.locator('[data-product-name]').first().innerText(), 'Suktaverse');
    if (collection === 'ganesha-atharva') {
      assert.equal(await page.locator('#collection-trigger').isVisible(), true, 'multiple collections expose the shared collection pill');
      assert.equal(await page.locator('#chapter-trigger').isVisible(), false, 'a single-chapter collection hides the chapter pill');
      await page.keyboard.press('b');
      assert.equal(await page.locator('#collections-overlay').isVisible(), true, 'B opens the collection chooser');
      assert.equal(await page.locator('.collection-button').count(), 2);
      await page.locator('.collection-button[data-collection-id="purusha-sukta"]').click();
      await page.locator('.verse-chant-panels').waitFor();
      assert.match(page.url(), /[?&]collection=purusha-sukta(?:&|$)/);
      assert.equal(await page.locator('#collection-title').innerText(), 'P');
      assert.match(await page.locator('#collection-trigger').getAttribute('aria-label'), /Puruṣa Sūktam/);
      assert.equal(await page.locator('.topbar-profile-pill').innerText(), 'S', 'the top-bar profile pill uses one initial');
      const header = await page.locator('.topbar').evaluate((topbar) => {
        const left = topbar.querySelector('.topbar-left').getBoundingClientRect();
        const sid = topbar.querySelector('.shloka-position').getBoundingClientRect();
        const right = topbar.querySelector('.top-actions').getBoundingClientRect();
        const box = topbar.getBoundingClientRect();
        return { left: left.left, sidCenter: sid.left + sid.width / 2, right: right.right, center: box.left + box.width / 2, boxLeft: box.left, boxRight: box.right };
      });
      assert.ok(Math.abs(header.sidCenter - header.center) < 2, `SID stays geometrically centered: ${JSON.stringify(header)}`);
      assert.ok(header.left - header.boxLeft < 24, 'collection and chapter group stays left aligned');
      assert.ok(header.boxRight - header.right < 24, 'menu and profile group stays right aligned');
      await page.keyboard.press('b');
      await page.locator('.collection-button[data-collection-id="ganesha-atharva"]').click();
      await page.waitForURL(/collection=ganesha-atharva/);
      await page.locator('.verse-chant-panels').waitFor();
    }
    for (const [index, sid] of sids.entries()) {
      if (collection === 'ganesha-atharva' && index === 1) await page.keyboard.press('ArrowRight');
      await assertSid(page, sid);
    }
    await assertLongLineFixture(page, `${collection} desktop`);
    await page.setViewportSize({ width: 390, height: 844 });
    for (const sid of sids) await assertSid(page, sid);
    await assertLongLineFixture(page, `${collection} mobile`);
  } finally {
    await context.close();
    product.dispose();
  }
}

(async () => {
  const options = { headless: true };
  if (fs.existsSync(chromePath)) options.executablePath = chromePath;
  const browser = await chromium.launch(options);
  try {
    await runCollection(browser, 'ganesha-atharva', ['1.B', '1.1']);
    await runCollection(browser, 'purusha-sukta', ['1.3', '1.21']);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
