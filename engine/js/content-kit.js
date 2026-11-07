// Content-Kit 3: pure content contracts and transaction planning. Callers own all I/O.
import { isLogicalMediaPath, normalizeMediaCatalog, safeMediaPath, validateBookManifest, validateDeckDescriptor } from './media-contract.js';
import { normalizeLanguageModel } from './language-model.js';
import { CONTENT_KIT_VERSION } from './content-kit-version.js';
import {
  AUDIO_CATALOG_HEADERS, AUDIO_CUE_HEADERS, AUDIO_CUE_PURPOSE_HEADERS, AUDIO_REGISTRY_HEADERS,
  CONTEMPLATION_CATALOG_HEADERS, CONTEMPLATION_MASTER_HEADERS, DECK_CATALOG_HEADERS, DECK_REGISTRY_HEADERS,
  ILLUSTRATION_CATALOG_HEADERS, ILLUSTRATION_METADATA_HEADERS, LOCALIZED_MASTER_HEADERS,
  MEDIA_COMPOSITION_HEADERS, SEQUENCE_HEADERS, SOURCE_MASTER_HEADERS, STRUCTURAL_VERSE_REGISTRY_HEADERS,
  VERSE_CATALOG_HEADERS, VERSE_LOCALIZED_REGISTRY_HEADERS, compositionHeaderRule, localizedRegistryHeaderRule
} from './player/collection-contracts.js';
import { decode, encode, parseCollectionTable } from './player/collection-data.js';

export const KIT_API = 3;
export const KIT_VERSION = CONTENT_KIT_VERSION;
// The browser bundle replaces this marker with a reproducible hash of its canonical sources.
export const KIT_BUILD = 'source';
const VERSE_LOCKED = Object.freeze(['cid', 'snum', 'sid', 'chapter_name']);
const MEDIA_EXTENSIONS = Object.freeze({ mp3: 'audio', m4a: 'audio', ogg: 'audio', opus: 'audio', wav: 'audio', png: 'image', jpg: 'image', jpeg: 'image', webp: 'image', gif: 'image', svg: 'image', mp4: 'video', webm: 'video', pdf: 'asset' });
const inferredFieldType = (name) => name === 'json' ? 'json' : name === 'order' || name === 'position' || name.endsWith('_order') ? 'number' : name.endsWith('_ms') ? 'ms' : name === 'path' || name.endsWith('_url') ? 'media-path' : 'text';
const field = (type, options = {}) => Object.freeze({ type, required: options.required === true, ...options });
const fieldsFor = (headers, declarations = {}, required = []) => Object.fromEntries(headers.map((name) => [name, declarations[name] || field(inferredFieldType(name), { required: required.includes(name) })]));
const csv = (id, role, headers, key, locked = key, extra = {}) => Object.freeze({ id, format: 'csv', role, contentModel: 'records', entityType: extra.entityType || role, headers: headers ? Object.freeze([...headers]) : undefined, headerRule: extra.headerRule, key: Object.freeze([...key]), locked: Object.freeze([...locked]), fields: headers ? Object.freeze(fieldsFor(headers, extra.fields, key)) : Object.freeze(extra.fields || {}), fieldPatterns: Object.freeze(extra.fieldPatterns || []), views: Object.freeze(extra.views || []), references: Object.freeze(extra.references || []), editable: extra.editable !== false, generated: false });
const json = (id, role, { editable = true, generated = false, references = [], contentModel = 'single', entityType = role } = {}) => Object.freeze({ id, format: 'json', role, contentModel, entityType, key: Object.freeze(['path']), locked: Object.freeze([]), fields: Object.freeze({ json: Object.freeze({ type: 'json' }) }), views: Object.freeze([]), references: Object.freeze(references), editable, generated });

const CONTRACTS = Object.freeze({
  'source-master': csv('source-master', 'master', SOURCE_MASTER_HEADERS, ['sid'], VERSE_LOCKED, { entityType: 'verse', views: ['chapters'], fields: { shloka_raw: field('multiline'), shloka: field('multiline'), word_by_word: field('multiline') } }),
  'localized-master': csv('localized-master', 'master', LOCALIZED_MASTER_HEADERS, ['sid'], VERSE_LOCKED, { entityType: 'verse', views: ['chapters'], fields: { transliteration: field('multiline'), meaning: field('multiline'), word_by_word_meaning: field('multiline') } }),
  'verse-details': csv('verse-details', 'details', VERSE_LOCALIZED_REGISTRY_HEADERS, ['collection_id']),
  'verse-catalog': csv('verse-catalog', 'catalog', VERSE_CATALOG_HEADERS, ['language', 'content_type'], undefined, { references: [{ field: 'content_url', target: 'file' }] }),
  'verse-registry': csv('verse-registry', 'registry', STRUCTURAL_VERSE_REGISTRY_HEADERS, ['collection_id'], undefined, { fields: { path: field('text') }, references: [{ field: 'catalog_url', target: 'file' }] }),
  'audio-registry': csv('audio-registry', 'registry', AUDIO_REGISTRY_HEADERS, ['collection_id'], undefined, { references: ['catalog_url', 'cue_purpose_url', 'cue_url'].map((field) => ({ field, target: 'file' })) }),
  'image-registry': csv('image-registry', 'registry', null, ['collection_id'], ['collection_id'], { headerRule: 'localized-images', fields: { collection_id: field('text', { required: true }), title: field('text'), catalog_url: field('media-path', { required: true }) }, fieldPatterns: [{ pattern: '^metadata_[a-z0-9-]+_url$', declaration: field('media-path') }], references: [{ field: 'catalog_url', target: 'file' }, { fieldPattern: '^metadata_[a-z0-9-]+_url$', target: 'file' }] }),
  'deck-registry': csv('deck-registry', 'registry', DECK_REGISTRY_HEADERS, ['collection_id'], undefined, { references: [{ field: 'catalog_url', target: 'file' }] }),
  'text-registry': csv('text-registry', 'registry', null, ['collection_id'], ['collection_id'], { headerRule: 'localized-text', fields: { collection_id: field('text', { required: true }), title: field('text'), catalog_url: field('media-path', { required: true }) }, fieldPatterns: [{ pattern: '^master_[a-z0-9-]+_url$', declaration: field('media-path') }], references: [{ field: 'catalog_url', target: 'file' }, { fieldPattern: '^master_[a-z0-9-]+_url$', target: 'file' }] }),
  'audio-catalog': csv('audio-catalog', 'media-catalog', AUDIO_CATALOG_HEADERS, ['sid', 'order'], undefined, { references: [{ field: 'audio_url', target: 'asset' }] }),
  'audio-cues': csv('audio-cues', 'cues', AUDIO_CUE_HEADERS, ['sid', 'asset_order', 'cue_order'], undefined, { references: [{ fields: ['sid', 'asset_order'], target: 'audio-catalog' }, { field: 'cue_id', target: 'audio-cue-purposes' }] }),
  'audio-cue-purposes': csv('audio-cue-purposes', 'cue-purposes', AUDIO_CUE_PURPOSE_HEADERS, ['cue_id', 'language'], undefined, { fields: { description: field('multiline') } }),
  'deck-catalog': csv('deck-catalog', 'media-catalog', DECK_CATALOG_HEADERS, ['sid', 'order'], undefined, { references: [{ field: 'deck_url', target: 'file' }] }),
  'illustration-catalog': csv('illustration-catalog', 'media-catalog', ILLUSTRATION_CATALOG_HEADERS, ['sid', 'order'], undefined, { references: [{ field: 'image_url', target: 'asset' }] }),
  'illustration-metadata': csv('illustration-metadata', 'details', ILLUSTRATION_METADATA_HEADERS, ['sid', 'order'], undefined, { fields: { alt_text: field('multiline'), caption: field('multiline', { required: false }) } }),
  'question-catalog': csv('question-catalog', 'media-catalog', CONTEMPLATION_CATALOG_HEADERS, ['sid', 'order']),
  'question-master': csv('question-master', 'details', CONTEMPLATION_MASTER_HEADERS, ['sid', 'order'], undefined, { fields: { text: field('multiline') } }),
  sequence: csv('sequence', 'sequence', SEQUENCE_HEADERS, ['position'], ['position', 'cid', 'snum', 'sid'], { references: [{ field: 'sid', target: 'verse' }] }),
  'media-composition': csv('media-composition', 'composition', MEDIA_COMPOSITION_HEADERS, ['sid', 'order'], ['cid', 'snum', 'sid', 'order'], { references: [{ fields: ['media_type', 'collection', 'asset_order'], target: 'collection-item' }, { field: 'sid', target: 'verse' }] }),
  composition: csv('composition', 'composition', null, ['sid'], ['cid', 'snum', 'sid'], { headerRule: 'composition', references: [{ fieldPattern: '_collection$', pairedFieldPattern: '_order$', target: 'collection-item' }, { field: 'sid', target: 'verse' }] }),
  'media-segments': csv('media-segments', 'segments', ['segment', 'media_hash', 'start_ms', 'end_ms', 'slide_id', 'sid', 'cue_id'], ['segment'], undefined, { entityType: 'media-segment', fields: { segment: field('number', { required: true }), media_hash: field('hash', { required: true }), start_ms: field('ms'), end_ms: field('ms'), slide_id: field('text'), sid: field('semantic-reference'), cue_id: field('semantic-reference') } }),
  deck: json('deck', 'deck'), manifest: json('manifest', 'manifest', { editable: false, generated: true, references: [{ jsonPath: 'files[].path', target: 'file' }] }), 'media-catalog': json('media-catalog', 'media-catalog', { editable: false, generated: true, references: [{ jsonPath: 'books[].manifest', target: 'manifest' }] }),
  asset: Object.freeze({ id: 'asset', format: 'asset', role: 'asset', contentModel: 'single', entityType: 'asset', key: Object.freeze(['path']), locked: Object.freeze(['path']), fields: Object.freeze({ path: field('media-path'), media_type: field('enum') }), views: Object.freeze([]), references: Object.freeze([]), editable: false, generated: false })
});
const HEADER_RULES = Object.freeze({ composition: compositionHeaderRule, 'localized-images': localizedRegistryHeaderRule('images'), 'localized-text': localizedRegistryHeaderRule('text') });
export function describe() { return Object.freeze({ api: KIT_API, version: KIT_VERSION, build: KIT_BUILD, contracts: CONTRACTS }); }
function kitError(message, details = {}) { return Object.assign(new Error(message), details); }
function manifestPaths(manifest) { return (manifest.files || []).map((entry) => safeMediaPath(typeof entry === 'string' ? entry : entry.path)); }
function parseKitVersion(version) {
  const match = String(version || '').match(/^(?<major>\d+)\.(?<minor>\d{8}-\d{6})$/);
  if (!match) throw kitError(`Invalid Content-Kit version ${version || '(empty)'}.`, { code: 'INVALID_KIT_VERSION' });
  return { major: Number(match.groups.major), minor: match.groups.minor };
}
function compareKitVersions(left, right) {
  const a = parseKitVersion(left); const b = parseKitVersion(right);
  return a.major === b.major ? a.minor.localeCompare(b.minor) : a.major - b.major;
}

function contractFor(file) { const contract = CONTRACTS[file?.contract]; if (!contract) throw kitError(`${file?.path || 'This file'} has no declared Content-Kit contract.`, { path: file?.path }); return contract; }
function expectedHeaders(contract) { return contract.headers || HEADER_RULES[contract.headerRule]; }
function fieldDeclaration(contract, name) { return contract.fields[name] || contract.fieldPatterns?.find((entry) => new RegExp(entry.pattern).test(name))?.declaration || field('text'); }
function keyOf(contract, row) { const key = contract.id === 'composition' && row.order ? ['sid', 'order'] : contract.key; return key.map((field) => row[field]).join(':'); }
function labelOf(contract, row) { return (contract.key.includes('order') || (contract.id === 'composition' && row.order)) ? `${row.sid} #${row.order}` : keyOf(contract, row); }
function linesOf(text) { const source = String(text ?? ''); const bom = source.startsWith('\uFEFF') ? '\uFEFF' : ''; const parts = source.slice(bom.length).split(/(\r\n|\n|\r)/); const lines = []; for (let index = 0; index < parts.length; index += 2) lines.push({ text: parts[index], end: parts[index + 1] || '' }); const nonempty = lines.map((line, index) => line.text.length ? index : -1).filter((index) => index >= 0); return { bom, lines, headerLine: nonempty[0], rowLines: nonempty.slice(1) }; }
function parseCsv(file, contract, text) { try { return parseCollectionTable(text, expectedHeaders(contract), file.path); } catch (error) { throw kitError(error.message, { path: file.path }); } }

export function listProducts(workspace = globalThis.__MYGITA_LOCAL_WORKSPACE__) {
  if (!Array.isArray(workspace?.products)) throw kitError('The MyGita local workspace is not loaded.');
  return [...workspace.products].sort((a, b) => Number(a.order || 0) - Number(b.order || 0)).map((product) => { const config = product.config || {}; const problems = []; const bookIds = []; for (const experience of config.experiences || []) { const listed = Array.isArray(experience.bookIds) && experience.bookIds.length ? experience.bookIds : []; if (experience.bookId && listed.length && !listed.includes(experience.bookId)) problems.push({ message: `Experience ${experience.id} names book ${experience.bookId} outside its bookIds.` }); for (const id of listed.length ? listed : [experience.bookId].filter(Boolean)) if (!bookIds.includes(id)) bookIds.push(id); } let languages = null; try { languages = normalizeLanguageModel(config.languages); } catch (error) { problems.push({ message: error.message }); } return Object.freeze({ id: product.id, path: product.path, name: String(config.name || product.id), metadata: product.metadata || {}, bookIds: Object.freeze(bookIds), languages, experiences: Object.freeze(config.experiences || []), productText: product.productText || {}, problems: Object.freeze(problems) }); });
}
export async function openMedia(readText) {
  if (typeof readText !== 'function') throw kitError('openMedia requires a readText(logicalPath) function.');
  let catalog; try { catalog = normalizeMediaCatalog(JSON.parse(await readText('catalog.json'))); } catch (error) { throw kitError(error.message, { path: 'catalog.json' }); }
  const minimumKitVersion = catalog.minimum_kit_version || catalog.content_kit_version;
  if (compareKitVersions(minimumKitVersion, KIT_VERSION) > 0) throw kitError(`Media requires Content-Kit ${minimumKitVersion}; this app has ${KIT_VERSION}.`, { path: 'catalog.json', code: 'KIT_UPDATE_REQUIRED' });
  const fileIndex = new Map(); const inventoryParts = [];
  for (const mount of catalog.mounts) for (const part of mount.inventories) {
    if (!part.id || !part.path || !/^[a-f0-9]{64}$/.test(part.hash)) throw kitError(`Mount ${mount.mount_id} has an invalid inventory declaration.`, { path: 'catalog.json' });
    let inventory; try { inventory = JSON.parse(await readText(part.path)); } catch (error) { throw kitError(error.message, { path: part.path }); }
    if (String(inventory.content_kit_version || '').split('.')[0] !== String(KIT_API)) throw kitError(`${part.path} requires an unsupported Content-Kit version.`, { path: part.path });
    for (const entry of inventory.files || []) {
      const path = safeMediaPath(entry.path);
      if (fileIndex.has(path)) throw kitError(`Logical path ${path} appears in more than one mount inventory.`, { path });
      if (!CONTRACTS[entry.contract]) throw kitError(`${path} declares unknown contract ${entry.contract || '(empty)'}.`, { path });
      fileIndex.set(path, Object.freeze({ ...entry, path, mountId: mount.mount_id, inventory: part.path }));
    }
    inventoryParts.push(Object.freeze({ ...part, mountId: mount.mount_id, value: inventory }));
  }
  const books = await Promise.all(catalog.books.map(async (entry) => { try { const manifest = validateBookManifest(JSON.parse(await readText(entry.manifest)), entry.book_id); return Object.freeze({ id: entry.book_id, manifestPath: entry.manifest, manifest, name: manifest.name || {}, languages: Object.freeze(Object.keys(manifest.verses.masters)), problems: Object.freeze([]) }); } catch (error) { return Object.freeze({ id: entry.book_id, manifestPath: entry.manifest, manifest: null, name: {}, languages: Object.freeze([]), problems: Object.freeze([{ path: entry.manifest, message: error.message }]) }); } }));
  return Object.freeze({ catalog, catalogFile: Object.freeze({ path: 'catalog.json', contract: 'media-catalog', language: null, role: 'media-catalog' }), books: Object.freeze(books), fileIndex, inventoryParts: Object.freeze(inventoryParts), readText });
}
export function openMediaSnapshot(snapshot) {
  const values = snapshot?.texts instanceof Map ? snapshot.texts : new Map(Object.entries(snapshot?.texts || {}));
  if (snapshot?.catalogText != null) values.set('catalog.json', String(snapshot.catalogText));
  return openMedia(async (path) => { if (!values.has(path)) throw kitError(`Snapshot does not contain ${path}.`, { path }); return values.get(path); });
}
export async function contentTree(media, bookId) {
  const book = media?.books?.find((entry) => entry.id === bookId); if (!book?.manifest) throw kitError(book?.problems?.[0]?.message || `Unknown book ${bookId}.`, { path: book?.manifestPath });
  const listed = new Set([book.manifestPath, ...manifestPaths(book.manifest)]); const claimed = new Map(); const nodes = [];
  const languageByPath = new Map([
    ...Object.entries(book.manifest.verses.masters || {}).map(([language, path]) => [path, language]),
    ...Object.entries(book.manifest.registries?.verses?.localized || {}).map(([language, path]) => [path, language])
  ]);
  const descriptor = (path) => { const entry = media.fileIndex.get(path); if (!entry) throw kitError(`Mount inventories do not declare ${path}.`, { path }); const contract = CONTRACTS[entry.contract]; return Object.freeze({ path, contract: entry.contract, language: languageByPath.get(path) || null, role: contract.role, editable: contract.editable, views: contract.views, mountId: entry.mountId, hash: entry.hash, size: entry.size, mimeType: entry.mime_type }); };
  const claim = (path, owner) => { if (!listed.has(path)) return null; const previous = claimed.get(path); if (previous) return { used: true, owner: previous, file: descriptor(path) }; claimed.set(path, owner); return { used: false, owner, file: descriptor(path) }; };
  const addNode = (kind, id, title, paths, { registry = null, uses = [] } = {}) => { const owned = []; const referenced = [...uses]; for (const path of [...new Set(paths.filter(Boolean))]) { const result = claim(path, `${kind}:${id}`); if (!result) continue; if (result.used) referenced.push(path); else owned.push(result.file); } nodes.push(Object.freeze({ kind, id, collectionId: id, title: String(title || id), editable: owned.some((file) => file.editable) ? 'text' : 'none', files: Object.freeze(owned), uses: Object.freeze([...new Set(referenced)]), registry: registry ? Object.freeze(registry) : undefined })); };
  addNode('verses', bookId, book.name?.en || bookId, [book.manifest.verses.catalog, ...Object.values(book.manifest.verses.masters || {})]);
  addNode('details', bookId, book.name?.en || bookId, Object.values(book.manifest.registries?.verses?.localized || {}));
  const registries = [
    ['questions', book.manifest.registries?.text], ['images', book.manifest.registries?.images], ['audio', book.manifest.registries?.audio], ['deck', book.manifest.registries?.deck]
  ].filter(([, path]) => path);
  for (const [kind, registryPath] of registries) {
    const registryFile = descriptor(registryPath); const registryContract = CONTRACTS[registryFile.contract]; const table = parseCollectionTable(await media.readText(registryPath), expectedHeaders(registryContract), registryPath);
    for (const row of table.rows) {
      const directEntries = Object.entries(row).filter(([field, value]) => value && (field.endsWith('_url') || field === 'catalog_url'));
      for (const [field, path] of directEntries) {
        const localized = field.match(/^(?:metadata|master)_(?<language>[a-z0-9-]+)_url$/);
        if (localized && isLogicalMediaPath(path)) languageByPath.set(path, localized.groups.language);
      }
      const direct = directEntries.map(([, value]) => value).filter(isLogicalMediaPath);
      const paths = [...direct];
      for (const path of direct) {
        if (!/\.(?:csv|json)$/i.test(path)) continue;
        let text; try { text = await media.readText(path); } catch { continue; }
        for (const reference of logicalReferences(text)) if (listed.has(reference)) paths.push(reference);
      }
      addNode(kind, row.collection_id, row.title || row.collection_id, paths, { registry: { path: registryPath, key: row.collection_id } });
    }
  }
  for (const experience of book.manifest.experiences || []) {
    addNode('experience', experience.id, experience.id, experience.files || []);
  }
  addNode('registry', 'registry', 'registry', [book.manifest.registries?.verses?.structural, ...registries.map(([, path]) => path)]);
  addNode('manifest', 'manifest', 'manifest', [book.manifestPath]);
  const remaining = [...listed].filter((path) => !claimed.has(path)); if (remaining.length) addNode('other', 'other', 'other', remaining);
  const resources = [...listed].filter((path) => media.fileIndex.has(path)).map(descriptor);
  nodes.push(Object.freeze({ kind: 'resources', id: bookId, collectionId: bookId, title: 'resources', editable: 'none', files: Object.freeze(resources), uses: Object.freeze([]) }));
  return Object.freeze(nodes);
}

export function readItems(file, text, { view = '' } = {}) {
  const contract = contractFor(file);
  if (contract.format === 'asset') return Object.freeze({ fields: Object.freeze([{ name: 'path', editable: false, type: 'path' }]), items: Object.freeze([{ key: file.path, label: file.path, values: { path: file.path, media_type: MEDIA_EXTENSIONS[file.path.split('.').pop()?.toLowerCase()] || 'asset' }, problems: [] }]) });
  if (contract.format === 'json') { try { JSON.parse(text); } catch (error) { throw kitError(`${file.path} is not valid JSON: ${error.message}`, { path: file.path }); } return Object.freeze({ fields: Object.freeze([{ name: 'json', editable: contract.editable, type: 'json' }]), items: Object.freeze([{ key: file.path, label: file.path, values: { json: String(text) }, problems: [] }]) }); }
  if (view && !contract.views.includes(view)) throw kitError(`${file.path} has no ${view} view.`, { path: file.path });
  const table = parseCsv(file, contract, text);
  if (view === 'chapters') { const chapters = new Map(); for (const row of table.rows) { if (!chapters.has(row.cid)) chapters.set(row.cid, { key: row.cid, label: row.cid, values: { cid: row.cid, chapter_name: row.chapter_name }, problems: [] }); else if (chapters.get(row.cid).values.chapter_name !== row.chapter_name) chapters.get(row.cid).problems.push(`Chapter ${row.cid} has different chapter names.`); } return Object.freeze({ fields: Object.freeze([{ name: 'cid', editable: false, type: 'text' }, { name: 'chapter_name', editable: true, type: 'text' }]), items: Object.freeze([...chapters.values()]) }); }
  const locked = contract.id === 'composition' && table.headers.includes('order') ? [...contract.locked, 'order'] : contract.locked;
  return Object.freeze({ fields: Object.freeze(table.headers.map((name) => ({ name, editable: contract.editable && !locked.includes(name), type: fieldDeclaration(contract, name).type }))), items: Object.freeze(table.rows.map((row) => ({ key: keyOf(contract, row), label: labelOf(contract, row), values: row, problems: [] }))) });
}

function assertEditable(file, contract) { if (!contract.editable || contract.generated) throw kitError(`${file.path} is generated and cannot be edited directly.`, { path: file.path }); }
export function updateItem(file, text, key, values, { view = '' } = {}) {
  const contract = contractFor(file); assertEditable(file, contract); if (contract.format === 'json') { JSON.parse(values?.json); return String(values.json); }
  const table = parseCsv(file, contract, text); const targets = table.rows.map((row, index) => ({ row, index })).filter(({ row }) => view === 'chapters' ? row.cid === key : keyOf(contract, row) === key); if (!targets.length) throw kitError(`${file.path} has no item ${key}.`, { path: file.path, key });
  const locked = contract.id === 'composition' && table.headers.includes('order') ? [...contract.locked, 'order'] : contract.locked;
  const editable = view === 'chapters' ? ['chapter_name'] : table.headers.filter((name) => !locked.includes(name)); const changes = Object.entries(values || {}).map(([field, value]) => [field, String(value ?? '').replace(/\r\n?/g, '\n')]);
  for (const [field, value] of changes) { if (!table.headers.includes(field) && !(view === 'chapters' && field === 'chapter_name')) throw kitError(`${field} is not a field of ${file.path}.`, { path: file.path, key, field }); if (!editable.includes(field) && targets.some(({ row }) => row[field] !== value)) throw kitError(`${field} cannot be changed here.`, { path: file.path, key, field }); }
  const parsed = linesOf(text); let changed = false; for (const { index } of targets) { const line = parsed.lines[parsed.rowLines[index]]; const fields = line.text.split('#'); for (const [field, value] of changes) { const column = table.headers.indexOf(field); if (!editable.includes(field) || decode(fields[column]) === value) continue; try { fields[column] = encode(value); } catch (error) { throw kitError(error.message, { path: file.path, key, field }); } changed = true; } line.text = fields.join('#'); }
  const result = changed ? parsed.bom + parsed.lines.map((line) => line.text + line.end).join('') : String(text ?? ''); parseCsv(file, contract, result); return result;
}
export function insertItem(file, text, values, { after = '' } = {}) {
  const contract = contractFor(file); assertEditable(file, contract); if (contract.format !== 'csv') throw kitError(`${file.path} does not support record insertion.`, { path: file.path });
  const table = parseCsv(file, contract, text); const row = Object.fromEntries(table.headers.map((header) => [header, String(values?.[header] ?? '')])); const key = keyOf(contract, row); if (!key || table.rows.some((candidate) => keyOf(contract, candidate) === key)) throw kitError(`${file.path} already has item ${key}.`, { path: file.path, key });
  let encoded; try { encoded = table.headers.map((header) => encode(row[header])).join('#'); } catch (error) { throw kitError(error.message, { path: file.path, key }); }
  const parsed = linesOf(text); const ending = parsed.lines.find((line) => line.end)?.end || '\n'; const afterIndex = after ? table.rows.findIndex((candidate) => keyOf(contract, candidate) === after) : table.rows.length - 1; if (after && afterIndex < 0) throw kitError(`${file.path} has no item ${after}.`, { path: file.path, key: after }); const lineIndex = table.rows.length ? parsed.rowLines[afterIndex] : parsed.headerLine; if (!parsed.lines[lineIndex].end) parsed.lines[lineIndex].end = ending; parsed.lines.splice(lineIndex + 1, 0, { text: encoded, end: ending }); const result = parsed.bom + parsed.lines.map((line) => line.text + line.end).join(''); parseCsv(file, contract, result); return result;
}
export function removeItem(file, text, key) { const contract = contractFor(file); assertEditable(file, contract); if (contract.format !== 'csv') throw kitError(`${file.path} does not support record removal.`, { path: file.path }); const table = parseCsv(file, contract, text); const index = table.rows.findIndex((row) => keyOf(contract, row) === key); if (index < 0) throw kitError(`${file.path} has no item ${key}.`, { path: file.path, key }); const parsed = linesOf(text); parsed.lines.splice(parsed.rowLines[index], 1); const result = parsed.bom + parsed.lines.map((line) => line.text + line.end).join(''); parseCsv(file, contract, result); return result; }
export function newFile(contractId, path) { const contract = CONTRACTS[contractId]; if (!contract) throw kitError(`Unknown contract ${contractId}.`, { path }); if (contract.format === 'csv') { if (!contract.headers) throw kitError(`${contractId} requires a concrete header before creating a file.`, { path }); return `${contract.headers.join('#')}\n`; } if (contract.format === 'json') return '{}\n'; throw kitError('Assets are written by the caller.', { path }); }
function fieldProblem(path, key, name, message) { return Object.freeze({ path, key, field: name, message }); }
function validateFieldValue(path, key, name, value, declaration) {
  const text = String(value ?? ''); const type = declaration?.type || 'text';
  if (!text) return declaration?.required === false ? null : fieldProblem(path, key, name, `${name} is required.`);
  if (type === 'text' && /[\r\n]/.test(text)) return fieldProblem(path, key, name, `${name} must be single-line text.`);
  if (type === 'number' && !/^[1-9]\d*$/.test(text)) return fieldProblem(path, key, name, `${name} must be a positive integer.`);
  if (type === 'ms' && !/^\d+$/.test(text)) return fieldProblem(path, key, name, `${name} must be a non-negative integer.`);
  if (type === 'hash' && !/^[a-f0-9]{64}$/.test(text)) return fieldProblem(path, key, name, `${name} must be a SHA-256 hash.`);
  if (type === 'media-path') { try { safeMediaPath(text); } catch (error) { return fieldProblem(path, key, name, error.message); } }
  if (type === 'external-url') { try { const url = new URL(text); if (url.protocol !== 'https:') throw new Error(`${name} must use HTTPS.`); } catch (error) { return fieldProblem(path, key, name, error.message); } }
  if (type === 'enum' && declaration.values?.length && !declaration.values.includes(text)) return fieldProblem(path, key, name, `${name} must be one of ${declaration.values.join(', ')}.`);
  return null;
}
export function checkFile(file, text) {
  try {
    const contract = contractFor(file); const parsed = readItems(file, text); const problems = [];
    if (contract.id === 'deck') validateDeckDescriptor(JSON.parse(text));
    if (contract.format === 'csv') for (const item of parsed.items) for (const name of Object.keys(item.values)) { const problem = validateFieldValue(file.path, item.key, name, item.values[name], fieldDeclaration(contract, name)); if (problem) problems.push(problem); }
    return Object.freeze(problems);
  } catch (error) { return Object.freeze([{ path: error.path || file.path, key: error.key, field: error.field, message: error.message }]); }
}

function updateGeneratedJson(text, update) { const value = JSON.parse(text); update(value); return `${JSON.stringify(value, null, 2)}\n`; }
export function addToManifest(manifestText, path, { hash = '', experience = '' } = {}) { const logical = safeMediaPath(path); return updateGeneratedJson(manifestText, (manifest) => { manifest.files ||= []; const entries = manifest.files.map((entry) => typeof entry === 'string' ? { path: entry, hash: '' } : entry); if (!entries.some((entry) => entry.path === logical)) entries.push({ path: logical, hash }); manifest.files = entries.sort((a, b) => a.path.localeCompare(b.path)); if (experience) { manifest.experiences = Array.isArray(manifest.experiences) ? manifest.experiences : []; let item = manifest.experiences.find((entry) => (typeof entry === 'string' ? entry : entry.id) === experience); if (!item || typeof item === 'string') { manifest.experiences = manifest.experiences.filter((entry) => entry !== experience); item = { id: experience, files: [] }; manifest.experiences.push(item); } if (!item.files.includes(logical)) item.files.push(logical); item.files.sort(); } }); }
export function removeFromManifest(manifestText, path, { experience = '' } = {}) { const logical = safeMediaPath(path); return updateGeneratedJson(manifestText, (manifest) => { if (!experience) manifest.files = (manifest.files || []).filter((entry) => (typeof entry === 'string' ? entry : entry.path) !== logical); for (const item of manifest.experiences || []) if (typeof item !== 'string' && (!experience || item.id === experience)) item.files = (item.files || []).filter((value) => value !== logical); }); }

async function mediaTextIndex(media, replacement = null) {
  const index = new Map();
  for (const book of media?.books || []) {
    if (!book.manifest) continue;
    for (const path of manifestPaths(book.manifest)) {
      if (!/\.(?:csv|json)$/i.test(path)) continue;
      index.set(path, replacement?.path === path ? replacement.text : await media.readText(path));
    }
  }
  return index;
}
function parsedRows(media, path, text) {
  const contract = CONTRACTS[media?.fileIndex?.get(path)?.contract];
  if (!contract || contract.format !== 'csv') return null;
  try { return { contract, table: parseCollectionTable(text, expectedHeaders(contract), path) }; } catch { return null; }
}
function workspaceTexts(workspace) { return (workspace?.products || []).flatMap((product) => Object.entries(product.productText || {}).map(([path, text]) => ({ path: `${product.path || product.id}/${path}`, text: String(text) }))); }
export function buildReferenceGraph(documents = []) {
  const references = []; const paths = new Set(documents.map((entry) => entry.path));
  for (const document of documents) for (const target of logicalReferences(document.text)) references.push(Object.freeze({ source: document.path, target, owner: document.owner || 'media', resolved: paths.has(target) }));
  const byTarget = new Map(); for (const reference of references) { if (!byTarget.has(reference.target)) byTarget.set(reference.target, []); byTarget.get(reference.target).push(reference); }
  return Object.freeze({ paths: Object.freeze([...paths].sort()), references: Object.freeze(references), related(path) { return Object.freeze([...(byTarget.get(path) || [])]); } });
}

export function planMove(graph, from, to, { retainUntil = '', retireAfterVersion = '' } = {}) {
  const source = safeMediaPath(from); const destination = safeMediaPath(to);
  if (source === destination) throw kitError('Move source and destination must differ.', { path: source });
  if (graph?.paths?.includes(destination)) throw kitError(`Move destination already exists: ${destination}.`, { path: destination });
  const references = graph?.related ? graph.related(source) : [];
  return Object.freeze({
    operation: 'move', from: source, to: destination,
    physical: Object.freeze([{ operation: 'copy', from: source, to: destination }, { operation: 'retire', path: source, retainUntil, retireAfterVersion }]),
    writes: Object.freeze(references.map((reference) => Object.freeze({ path: reference.source, replace: Object.freeze({ from: source, to: destination }) }))),
    publishOrder: Object.freeze(['secondary-mounts', 'primary-inventories', 'book-manifests', 'catalog.json', 'media.ver'])
  });
}
function productCollectionReferences(workspace) {
  const result = new Set();
  const visit = (value, key = '') => {
    if (Array.isArray(value)) {
      if (/Collections$|^verseCollections$/.test(key)) for (const item of value) { if (typeof item === 'string') result.add(item); }
      else value.forEach((item) => visit(item, key));
      return;
    }
    if (!value || typeof value !== 'object') return;
    for (const [name, item] of Object.entries(value)) {
      if ((name === 'collection' || name === 'verseCollection') && typeof item === 'string') result.add(item);
      else visit(item, name);
    }
  };
  for (const entry of workspaceTexts(workspace)) try { visit(JSON.parse(entry.text)); } catch {}
  return result;
}
function itemReferences(file, text, key) {
  const result = new Set(); const contract = contractFor(file);
  if (contract.format === 'json') for (const path of logicalReferences(text)) result.add(path);
  else if (contract.format === 'csv') {
    const table = parseCsv(file, contract, text); const row = table.rows.find((candidate) => keyOf(contract, candidate) === key);
    if (row) for (const value of Object.values(row)) if (isLogicalMediaPath(value)) result.add(value);
  }
  return result;
}
export async function related(media, file, key, { workspace = null } = {}) {
  const texts = await mediaTextIndex(media); const own = texts.get(file.path) ?? await media.readText(file.path);
  const references = [...itemReferences(file, own, key)].map((path) => ({ path }));
  const graph = buildReferenceGraph([...texts].map(([path, text]) => ({ path, text })).concat(workspaceTexts(workspace).map((entry) => ({ ...entry, owner: 'product' }))));
  const referencedBy = graph.related(file.path).filter((reference) => reference.source !== file.path).map((reference) => ({ path: reference.source, owner: reference.owner }));
  return Object.freeze({ file: file.path, key, references: Object.freeze(references), referencedBy: Object.freeze(referencedBy), workspace: Boolean(workspace) });
}
export async function checkSave(media, file, newText, { readText = media?.readText, exists = null, workspace = null } = {}) {
  const blocking = [...checkFile(file, newText)]; const pending = [];
  if (blocking.length || typeof readText !== 'function') return Object.freeze({ blocking: Object.freeze(blocking), pending: Object.freeze(pending), workspace: Boolean(workspace), readText: Boolean(readText) });
  const originalText = await readText(file.path);
  const texts = await mediaTextIndex({ ...media, readText }, { path: file.path, text: newText });
  const declared = new Set((media.books || []).flatMap((book) => book.manifest ? manifestPaths(book.manifest) : []));
  const registries = new Map(); const catalogs = new Map();
  for (const [path, text] of texts) {
    const parsed = parsedRows(media, path, text); if (!parsed) continue;
    if (parsed.contract.role === 'registry') for (const row of parsed.table.rows) if (row.collection_id && row.catalog_url) {
      if (!registries.has(row.collection_id)) registries.set(row.collection_id, []);
      registries.get(row.collection_id).push(row.catalog_url);
    }
    if (parsed.contract.role === 'media-catalog') catalogs.set(path, { contract: parsed.contract, rows: parsed.table.rows });
  }
  for (const [path, text] of texts) for (const reference of logicalReferences(text)) {
    if (!declared.has(reference)) blocking.push({ path, message: `${path} references undeclared file ${reference}.` });
    else if (exists && CONTRACTS[media.fileIndex.get(reference)?.contract]?.format === 'asset' && !(await exists(reference))) blocking.push({ path, message: `Referenced asset does not exist: ${reference}.` });
  }
  const usedCatalogRows = new Set();
  for (const [path, text] of texts) {
    const parsed = parsedRows(media, path, text); if (!parsed || parsed.contract.role !== 'composition') continue;
    for (const row of parsed.table.rows) {
      const pairs = parsed.table.headers.filter((header) => header.endsWith('_collection')).map((header) => [row[header], row[`${header.slice(0, -11)}_order`]]) ;
      if (row.collection) pairs.push([row.collection, row.asset_order]);
      for (const [collection, order] of pairs) {
        if (!collection) continue; const candidates = registries.get(collection) || [];
        const match = candidates.find((catalogPath) => catalogs.get(catalogPath)?.rows.some((candidate) => candidate.sid === row.sid && String(candidate.order) === String(order)));
        if (!match) blocking.push({ path, key: row.sid, message: `${path} references missing ${collection} item ${row.sid}:${order}.` });
        else usedCatalogRows.add(`${match}\n${row.sid}:${order}`);
      }
    }
  }
  const parsedNew = parsedRows(media, file.path, newText); const parsedOld = originalText ? parsedRows(media, file.path, originalText) : null;
  if (parsedNew?.contract.role === 'registry' && parsedOld) {
    const current = new Set(parsedNew.table.rows.map((row) => row.collection_id)); const removed = parsedOld.table.rows.map((row) => row.collection_id).filter((id) => !current.has(id));
    const productReferences = productCollectionReferences(workspace);
    for (const id of removed) if (productReferences.has(id)) blocking.push({ path: file.path, key: id, message: `Collection ${id} is still referenced by product configuration.` });
  }
  if (parsedNew?.contract.role === 'media-catalog') for (const row of parsedNew.table.rows) {
    const rowKey = keyOf(parsedNew.contract, row); if (!usedCatalogRows.has(`${file.path}\n${rowKey}`)) pending.push({ path: file.path, key: rowKey, message: `Item ${rowKey} is currently unused.` });
  }
  return Object.freeze({ blocking: Object.freeze(blocking), pending: Object.freeze(pending), workspace: Boolean(workspace), readText: true });
}

function logicalReferences(text) {
  const result = new Set();
  const add = (value) => { if (typeof value === 'string' && value.includes('/') && isLogicalMediaPath(value)) result.add(value); };
  const source = String(text || '');
  try {
    const visit = (value) => { if (Array.isArray(value)) value.forEach(visit); else if (value && typeof value === 'object') Object.values(value).forEach(visit); else add(value); };
    visit(JSON.parse(source));
  } catch {
    const lines = source.replace(/^\uFEFF/, '').split(/\r?\n/).filter(Boolean); lines.shift();
    for (const line of lines) for (const value of line.split('#')) add(decode(value));
  }
  return result;
}
async function completeBookInventory(manifest, readText) {
  const paths = new Set(manifestPaths(manifest)); const pending = [...paths];
  while (pending.length) {
    const path = pending.shift();
    if (!/\.(?:csv|json)$/i.test(path)) continue;
    let text; try { text = await readText(path); } catch { continue; }
    for (const reference of logicalReferences(text)) if (!paths.has(reference)) { paths.add(reference); pending.push(reference); }
  }
  return [...paths].sort();
}
function experienceMembership(manifest, paths, workspace) {
  const existing = new Map((manifest.experiences || []).map((entry) => [typeof entry === 'string' ? entry : entry.id, typeof entry === 'string' ? [] : [...(entry.files || [])]]));
  for (const path of paths) {
    const id = path.match(/\/experience\/([^/]+)\//)?.[1]; if (id && existing.has(id) && !existing.get(id).includes(path)) existing.get(id).push(path);
  }
  for (const product of workspace?.products || []) for (const experience of product.config?.experiences || []) {
    if (!existing.has(experience.id)) continue;
    const texts = Object.entries(product.productText || {}).filter(([path]) => path.includes(`/experiences/${experience.id}/`)).map(([, text]) => text);
    for (const text of texts) for (const reference of logicalReferences(text)) if (paths.includes(reference) && !existing.get(experience.id).includes(reference)) existing.get(experience.id).push(reference);
  }
  return [...existing].map(([id, files]) => ({ id, files: files.sort() })).sort((a, b) => a.id.localeCompare(b.id));
}
export async function publish(media, { readText, hashOf, workspace = null, releaseLabel = '', updatedAt = new Date().toISOString() } = {}) {
  if (typeof readText !== 'function' || typeof hashOf !== 'function') throw kitError('publish requires readText and hashOf functions.'); const writes = []; const changed = []; const blocking = []; const pending = []; const catalog = structuredClone(media.catalog);
  for (const book of media.books) {
    if (!book.manifest) { blocking.push(...book.problems); continue; }
    const manifest = structuredClone(book.manifest); const paths = await completeBookInventory(manifest, readText); const entries = [];
    for (const path of paths) { let hash; try { hash = String(await hashOf(path)).toLowerCase(); } catch (error) { blocking.push({ path, message: error.message }); continue; } if (!/^[a-f0-9]{64}$/.test(hash)) { blocking.push({ path, message: 'SHA-256 hash must be 64 lowercase hexadecimal characters.' }); continue; } entries.push({ path, hash }); }
    delete manifest.schema_version; manifest.content_kit_version = KIT_VERSION; manifest.files = entries; manifest.experiences = experienceMembership(manifest, paths, workspace); manifest.content_version = releaseLabel || manifest.content_version;
    const oldText = await readText(book.manifestPath); const withoutTimestamp = `${JSON.stringify(manifest, null, 2)}\n`;
    if (withoutTimestamp !== oldText) manifest.updated_at = updatedAt;
    const text = `${JSON.stringify(manifest, null, 2)}\n`; if (text !== oldText) { writes.push({ path: book.manifestPath, text }); changed.push(book.manifestPath); }
    const manifestHash = String(await hashOf(book.manifestPath, text)).toLowerCase(); const catalogBook = catalog.books.find((entry) => entry.book_id === book.id); catalogBook.manifest_hash = manifestHash;
  }
  delete catalog.schema_version; catalog.content_kit_version = KIT_VERSION; catalog.minimum_kit_version ||= KIT_VERSION; catalog.content_version = releaseLabel || catalog.content_version;
  const oldCatalog = await readText('catalog.json'); const withoutTimestamp = `${JSON.stringify(catalog, null, 2)}\n`; if (withoutTimestamp !== oldCatalog) catalog.updated_at = updatedAt;
  const catalogText = `${JSON.stringify(catalog, null, 2)}\n`; if (catalogText !== oldCatalog) { writes.push({ path: 'catalog.json', text: catalogText }); changed.push('catalog.json'); }
  return Object.freeze({ writes: Object.freeze(writes), changed: Object.freeze(changed), problems: Object.freeze({ blocking: Object.freeze(blocking), pending: Object.freeze(pending) }), workspace: Boolean(workspace) });
}
