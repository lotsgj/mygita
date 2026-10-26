import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { EN_MESSAGES } from '../../js/i18n/en.js';
import { KN_MESSAGES } from '../../js/i18n/kn.js';
import { I18n } from '../../js/i18n/i18n.js';

test('English and Kannada interface dictionaries have identical keys', () => {
  assert.deepEqual(Object.keys(KN_MESSAGES).sort(), Object.keys(EN_MESSAGES).sort());
  for (const [key, value] of Object.entries(EN_MESSAGES)) assert.ok(value.trim(), `English translation ${key}`);
  for (const [key, value] of Object.entries(KN_MESSAGES)) assert.ok(value.trim(), `Kannada translation ${key}`);
});

test('distribution translations override shared messages without changing the base catalogs', () => {
  const i18n = new I18n('en', {
    en: { 'common.about': 'About Suktaverse' },
    kn: { 'common.about': 'Suktaverse ಕುರಿತು' }
  });
  assert.equal(i18n.t('common.about'), 'About Suktaverse');
  assert.equal(i18n.t('common.close'), EN_MESSAGES['common.close']);
  i18n.language = 'kn';
  assert.equal(i18n.t('common.about'), 'Suktaverse ಕುರಿತು');
  assert.equal(EN_MESSAGES['common.about'], 'About Gitaverse');
});

test('every declarative player translation key exists and Rachana stays outside interface translation', async () => {
  const [player, docs, core] = await Promise.all([
    readFile(new URL('../../player.html', import.meta.url), 'utf8'),
    readFile(new URL('../../../docs.html', import.meta.url), 'utf8'),
    readFile(new URL('../../js/player/player-core.js', import.meta.url), 'utf8')
  ]);
  const keys = [...player.matchAll(/data-i18n(?:-aria|-title)?="([^"]+)"/g)].map((match) => match[1]);
  keys.forEach((key) => assert.ok(Object.hasOwn(EN_MESSAGES, key), `missing interface translation ${key}`));
  assert.match(core, /profile\.contentLanguage/);
  assert.match(core, /new I18n\('en', distribution\(\)\.translations\)/);
  assert.doesNotMatch(docs, /js\/i18n|data-i18n=/);
});
