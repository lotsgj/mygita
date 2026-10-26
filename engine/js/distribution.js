const FALLBACK_DISTRIBUTION = Object.freeze({
  schemaVersion: 1,
  id: 'verses-local',
  name: 'Verses',
  shortName: 'Verses',
  description: 'A local verse experience.',
  databaseName: 'verses-local-profiles',
  cachePrefix: 'verses-local',
  defaultExperience: '',
  journeyExperience: '',
  mediaOrigin: '',
  experiences: [],
  translations: {},
  branding: {}
});

let activeDistribution = normalizeDistribution(globalThis.__VERSES_DISTRIBUTION__ || FALLBACK_DISTRIBUTION);

function safeId(value, label) {
  const id = String(value || '').trim();
  if (!/^[a-z][a-z0-9-]*$/.test(id)) throw new Error(label + ' must use lowercase letters, numbers, and hyphens.');
  return id;
}

export function normalizeDistribution(input) {
  if (!input || Number(input.schemaVersion) !== 1) throw new Error('Unsupported distribution configuration.');
  const id = safeId(input.id, 'Distribution id');
  const experiences = (input.experiences || []).map((entry) => Object.freeze({
    ...entry,
    id: safeId(entry.id, 'Experience id'),
    renderer: safeId(entry.renderer, 'Renderer id'),
    label: String(entry.label || entry.id).trim()
  }));
  if (new Set(experiences.map((entry) => entry.id)).size !== experiences.length) throw new Error('Distribution experience ids must be unique.');
  const ids = new Set(experiences.map((entry) => entry.id));
  const defaultExperience = String(input.defaultExperience || experiences[0]?.id || '');
  const journeyExperience = String(input.journeyExperience || defaultExperience);
  if (experiences.length && !ids.has(defaultExperience)) throw new Error('The default experience is not registered.');
  if (experiences.length && !ids.has(journeyExperience)) throw new Error('The journey experience is not registered.');
  const translations = Object.fromEntries(Object.entries(input.translations || {}).map(([language, messages]) => [
    language,
    Object.freeze(Object.fromEntries(Object.entries(messages || {}).map(([key, value]) => [String(key), String(value)])))
  ]));
  return Object.freeze({
    ...FALLBACK_DISTRIBUTION,
    ...input,
    id,
    name: String(input.name || id),
    databaseName: String(input.databaseName || `${id}-profiles`),
    cachePrefix: safeId(input.cachePrefix || id, 'Cache prefix'),
    defaultExperience,
    journeyExperience,
    experiences: Object.freeze(experiences),
    translations: Object.freeze(translations),
    branding: Object.freeze({ ...(input.branding || {}) })
  });
}

export function distribution() { return activeDistribution; }

export function setDistribution(input) {
  activeDistribution = normalizeDistribution(input);
  globalThis.__VERSES_DISTRIBUTION__ = activeDistribution;
  return activeDistribution;
}
