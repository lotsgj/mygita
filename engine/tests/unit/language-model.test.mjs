import test from 'node:test';
import assert from 'node:assert/strict';
import { normalizeLanguageModel, normalizePanels, resolvePanelLanguages } from '../../js/language-model.js';

const model = normalizeLanguageModel({
  source: 'sa', defaultContent: 'en', content: ['en', 'kn', 'hi'], interface: ['en'],
  registry: {
    sa: { name: 'Sanskrit' }, en: { name: 'English' }, kn: { name: 'Kannada' }, hi: { name: 'Hindi' }
  }
});
const panels = normalizePanels([
  { id: 'source', binding: 'source' },
  { id: 'primary', binding: 'preferred', userSelectable: true },
  { id: 'secondary', binding: 'alternate', userSelectable: true }
]);

test('panel bindings resolve dynamically without a language-specific code branch', () => {
  assert.deepEqual(resolvePanelLanguages({ panels, languageModel: model, preferred: 'hi', availableLanguages: ['sa', 'en', 'kn', 'hi'] }), {
    source: 'sa', primary: 'hi', secondary: 'en'
  });
});

test('valid per-panel overrides take precedence while unavailable languages are ignored', () => {
  assert.deepEqual(resolvePanelLanguages({ panels, languageModel: model, preferred: 'en', overrides: { primary: 'kn', secondary: 'xx' }, availableLanguages: ['sa', 'en', 'kn'] }), {
    source: 'sa', primary: 'kn', secondary: 'kn'
  });
});
