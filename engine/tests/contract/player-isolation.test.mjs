import test from 'node:test';
import assert from 'node:assert/strict';
import { access, readFile } from 'node:fs/promises';

const player = await readFile(new URL('../../player.html', import.meta.url), 'utf8');
const core = await readFile(new URL('../../js/player/player-core.js', import.meta.url), 'utf8');
const data = await readFile(new URL('../../js/player/collection-data.js', import.meta.url), 'utf8');
const index = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
const deployment = await readFile(new URL('../../scripts/build-deployment.mjs', import.meta.url), 'utf8');
const fonts = await readFile(new URL('../../css/fonts.css', import.meta.url), 'utf8');
const playerStyles = await readFile(new URL('../../css/player.css', import.meta.url), 'utf8');
const editorStyles = await readFile(new URL('../../css/editor.css', import.meta.url), 'utf8');
const rendererStyles = await readFile(new URL('../../css/renderers/gita-700.css', import.meta.url), 'utf8');
const yogaRendererStyles = await readFile(new URL('../../css/renderers/gita-yoga.css', import.meta.url), 'utf8');
const saraRendererStyles = await readFile(new URL('../../css/renderers/gita-sara.css', import.meta.url), 'utf8');
const fontBuilder = await readFile(new URL('../../scripts/build-font-css.mjs', import.meta.url), 'utf8');
const serviceWorker = await readFile(new URL('../../service-worker.js', import.meta.url), 'utf8');
const analyticsMap = await readFile(new URL('../../js/events/analytics-event-map.js', import.meta.url), 'utf8');
const googleAnalytics = await readFile(new URL('../../js/events/google-analytics-adapter.js', import.meta.url), 'utf8');

test('the collection player is isolated from the legacy master and legacy media paths', () => {
  const combined = player + '\n' + core;
  assert.equal(combined.includes('data/master.csv'), false);
  assert.equal(combined.includes('data/gita-700'), false);
  assert.equal(combined.includes('/audio/sn/'), false);
  assert.match(player, /js\/player\.bundle\.js\?v=dev/);
  assert.match(data, /data\/collections/);
});

test('chapter labels are rendered from collection data without Dhyana exceptions', () => {
  assert.doesNotMatch(core, /chapter\.cid === 'D'/);
  assert.doesNotMatch(core, /row\.cid === 'D'/);
  assert.doesNotMatch(core, /D — Dhyana/);
  assert.doesNotMatch(core, /'ॐ'\s*:\s*chapter\.cid/);
});

test('the local engine entry point requires a distribution before starting the player', () => {
  assert.match(index, /<main id="distribution-chooser" class="profile-screen">/);
  assert.match(index, /js\/local-harness\.js/);
  assert.doesNotMatch(index, /rel="manifest"/);
  assert.doesNotMatch(index, /location\.replace/);
  assert.match(playerStyles, /--indigo:\s*#[0-9a-f]+/i);
});

test('the shared player uses canonical cross-origin media with progressive PWA caching', () => {
  assert.match(player, /<audio[^>]+crossorigin="anonymous"/);
  assert.match(data, /function remoteMediaUrl\(value\)/);
  assert.match(data, /url\.protocol === 'https:'/);
  assert.match(serviceWorker, /MEDIA_ORIGIN = 'https:\/\/media\.gitajyoti\.org'/);
  assert.match(serviceWorker, /url\.origin === MEDIA_ORIGIN && isAudio/);
  assert.match(serviceWorker, /credentials: 'omit', mode: 'cors'/);
});

test('archived prototypes are guarded from deployment output and its asset manifest', () => {
  assert.match(deployment, /assertAbsent\(path\.join\(output, 'x'\)/);
  assert.match(deployment, /relative\.startsWith\('x\/'\)/);
});

test('deployment explicitly excludes every supported audio binary format', () => {
  assert.match(deployment, /function isAudioBinary\(relative\)/);
  assert.match(deployment, /mp3\|m4a\|ogg\|opus\|wav/);
  assert.match(deployment, /!isAudioBinary\(relative\)/);
  assert.match(deployment, /Audio binaries must not be included in deployment output/);
});

test('the player uses the bundled Noto Sans family for every supported script', async () => {
  assert.match(player, /css\/fonts\.css\?v=dev/);
  for (const file of ['NotoSans.ttf', 'NotoSansDevanagari.ttf', 'NotoSansKannada.ttf']) {
    assert.match(fontBuilder, new RegExp(file.replace('.', '\\.')));
    await access(new URL(`../../assets/fonts/${file}`, import.meta.url));
  }
  for (const license of ['OFL-NotoSans.txt', 'OFL-NotoSansDevanagari.txt', 'OFL-NotoSansKannada.txt']) {
    await access(new URL(`../../assets/fonts/${license}`, import.meta.url));
  }
  const namedLegacyFonts = /Inter|Georgia|Times New Roman|Avenir Next|Segoe UI|Kohinoor|Noto Serif|SFMono|Menlo/;
  assert.doesNotMatch(playerStyles + editorStyles + rendererStyles + yogaRendererStyles + saraRendererStyles, namedLegacyFonts);
  assert.equal((fonts.match(/data:font\/ttf;base64,/g) || []).length, 3);
  assert.match(fontBuilder, /U\+0000-024F, U\+0300-036F, U\+1E00-1EFF/);
  assert.match(fontBuilder, /Gitaverse Noto Sans Kannada/);
  assert.match(fontBuilder, /U\+0C80-0CFF, U\+0951-0952, U\+1CDA/);
  assert.match(fonts, /unicode-range: U\+0000-024F, U\+0300-036F, U\+1E00-1EFF/);
  assert.match(fonts, /font-family: "Gitaverse Noto Sans Kannada"/);
  assert.match(fonts, /unicode-range: U\+0C80-0CFF, U\+0951-0952, U\+1CDA/);
  assert.match(fonts, /:lang\(kn\)[\s\S]*font-family: var\(--font-sans-kannada\)/);
  assert.match(playerStyles, /var\(--font-sans, sans-serif\)/);
  assert.match(rendererStyles, /var\(--font-sans, sans-serif\)/);
  assert.match(yogaRendererStyles, /gita-yoga/);
  assert.match(saraRendererStyles, /gita-sara/);
  assert.match(deployment, /scripts\/build-font-css\.mjs/);
});

test('Clarity and Google Analytics share one privacy projection and GA uses manual page views', () => {
  assert.match(core, /GoogleAnalyticsAdapter/);
  assert.match(player, /meta name="ga-measurement-id" content=""/);
  assert.match(googleAnalytics, /googleAnalyticsParameters/);
  assert.match(googleAnalytics, /send_page_view:\s*false/);
  assert.match(googleAnalytics, /allow_google_signals:\s*false/);
  assert.match(googleAnalytics, /allow_ad_personalization_signals:\s*false/);
  assert.match(analyticsMap, /const \{ age_band, gender_group, \.\.\.parameters \}/);
  assert.doesNotMatch(googleAnalytics, /anonymousProfileId|profileId|privateNote/);
});
