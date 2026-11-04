const LANGUAGE_CODE = /^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/;
const BINDINGS = new Set(['source', 'preferred', 'alternate', 'next_available', 'none']);

function code(value, label) {
  const result = String(value || '').trim();
  if (!LANGUAGE_CODE.test(result)) throw new Error(`${label} must be a valid language code.`);
  return result;
}

export function normalizeLanguageModel(input = {}) {
  const registry = Object.fromEntries(Object.entries(input.registry || {}).map(([key, value]) => {
    const language = code(key, 'Language');
    return [language, Object.freeze({
      code: language,
      name: String(value?.name || language),
      nativeName: String(value?.nativeName || value?.name || language),
      script: String(value?.script || ''),
      direction: value?.direction === 'rtl' ? 'rtl' : 'ltr'
    })];
  }));
  const source = code(input.source || 'sa', 'Source language');
  const content = [...new Set((input.content || ['en', 'kn']).map((value) => code(value, 'Content language')))];
  const interfaceLanguages = [...new Set((input.interface || ['en', 'kn']).map((value) => code(value, 'Interface language')))];
  const defaultContent = code(input.defaultContent || content[0], 'Default content language');
  for (const language of [source, ...content, ...interfaceLanguages]) {
    if (!registry[language]) throw new Error(`Language ${language} is not registered.`);
  }
  if (!content.includes(defaultContent)) throw new Error('The default content language must be a content language.');
  return Object.freeze({ source, content: Object.freeze(content), interface: Object.freeze(interfaceLanguages), defaultContent, registry: Object.freeze(registry) });
}

export function normalizePanels(panels = []) {
  const ids = new Set();
  return Object.freeze(panels.map((input) => {
    const id = String(input.id || '').trim();
    if (!/^[a-z][a-z0-9-]*$/.test(id) || ids.has(id)) throw new Error('Panel ids must be unique lowercase identifiers.');
    ids.add(id);
    const binding = String(input.binding || 'preferred');
    if (!BINDINGS.has(binding) && !binding.startsWith('fixed:')) throw new Error(`Panel ${id} has an unsupported language binding.`);
    return Object.freeze({
      id,
      binding,
      fields: Object.freeze((input.fields || []).map(String)),
      userSelectable: Boolean(input.userSelectable),
      allowedLanguages: input.allowedLanguages || 'content'
    });
  }));
}

function allowedCodes(panel, model, available) {
  const configured = panel.allowedLanguages === 'all'
    ? [model.source, ...model.content]
    : Array.isArray(panel.allowedLanguages) ? panel.allowedLanguages : model.content;
  return [...new Set(configured)].filter((language) => model.registry[language] && available.has(language));
}

export function resolvePanelLanguages({ panels = [], languageModel, preferred, overrides = {}, availableLanguages = [] }) {
  const available = new Set(availableLanguages.length ? availableLanguages : [languageModel.source, ...languageModel.content]);
  const preferredLanguage = available.has(preferred) && languageModel.content.includes(preferred)
    ? preferred : languageModel.defaultContent;
  const resolved = {};
  for (const panel of panels) {
    const allowed = allowedCodes(panel, languageModel, available);
    const override = panel.userSelectable && allowed.includes(overrides[panel.id]) ? overrides[panel.id] : '';
    if (override) resolved[panel.id] = override;
    else if (panel.binding === 'source') resolved[panel.id] = languageModel.source;
    else if (panel.binding === 'preferred') resolved[panel.id] = allowed.includes(preferredLanguage) ? preferredLanguage : allowed[0];
    else if (panel.binding === 'alternate' || panel.binding === 'next_available') resolved[panel.id] = allowed.find((language) => language !== preferredLanguage && !Object.values(resolved).includes(language)) || allowed.find((language) => language !== preferredLanguage) || allowed[0];
    else if (panel.binding.startsWith('fixed:')) resolved[panel.id] = panel.binding.slice(6);
    else resolved[panel.id] = '';
  }
  return Object.freeze(resolved);
}

export function languageLabel(model, language) {
  const entry = model.registry[language];
  return entry?.nativeName || entry?.name || language;
}
