// Content-kit: the public contract for tools that edit media content (the local content editor).
// Pure functions over text; callers read and write files. Bundled for file:// by scripts/build-content-kit.mjs.
import { normalizeMediaCatalog, safeMediaPath, validateBookManifest } from './media-contract.js';
import { normalizeLanguageModel } from './language-model.js';
import {
  AUDIO_REGISTRY_HEADERS,
  CONTEMPLATION_MASTER_HEADERS,
  DECK_REGISTRY_HEADERS,
  ILLUSTRATION_METADATA_HEADERS,
  IMAGE_REGISTRY_HEADERS,
  LOCALIZED_MASTER_HEADERS,
  LOCALIZED_REGISTRY_FIELDS,
  MASTER_HEADERS,
  TEXT_REGISTRY_HEADERS,
  VERSE_LOCALIZED_REGISTRY_HEADERS,
  decode,
  encode,
  parseCollectionTable
} from './player/collection-data.js';

// The loader's default when an experience names no sourceLanguage.
const KIT_DEFAULT_SOURCE_LANGUAGE = 'sa';
const KIT_VERSE_LOCKED = ['cid', 'snum', 'sid', 'chapter_name'];

// Editable file contracts. Files without a contract are listed but read-only.
const KIT_CONTRACTS = Object.freeze({
  'source-master': { headers: MASTER_HEADERS.sa, key: ['sid'], locked: KIT_VERSE_LOCKED, views: ['chapters'] },
  'localized-master': { headers: LOCALIZED_MASTER_HEADERS, key: ['sid'], locked: KIT_VERSE_LOCKED, views: ['chapters'] },
  'verse-details': { headers: VERSE_LOCALIZED_REGISTRY_HEADERS, key: ['collection_id'], locked: ['collection_id'], views: [] },
  'question-master': { headers: CONTEMPLATION_MASTER_HEADERS, key: ['sid', 'order'], locked: ['sid', 'order'], views: [] },
  'illustration-metadata': { headers: ILLUSTRATION_METADATA_HEADERS, key: ['sid', 'order'], locked: ['sid', 'order'], views: [] }
});

const KIT_SINGLE_LINE_FIELDS = new Set(['cid', 'snum', 'sid', 'collection_id', 'chapter_name', 'name', 'short_name', 'alt_text']);

function kitError(message, details = {}) {
  return Object.assign(new Error(message), details);
}

function kitFieldType(name) {
  if (name === 'order') return 'number';
  return KIT_SINGLE_LINE_FIELDS.has(name) ? 'text' : 'multiline';
}

function kitContract(file) {
  const contract = KIT_CONTRACTS[file?.contract];
  if (!contract) throw kitError(`${file?.path || 'This file'} is not editable.`, { path: file?.path });
  return contract;
}

function kitView(contract, file, view) {
  if (!view) return '';
  if (!contract.views.includes(view)) throw kitError(`${file.path} has no ${view} view.`, { path: file.path });
  return view;
}

function kitKeyOf(contract, row) {
  return contract.key.map((field) => row[field]).join(':');
}

function kitLabelOf(contract, row) {
  return contract.key.includes('order') ? `${row.sid} #${row.order}` : kitKeyOf(contract, row);
}

function kitParse(file, contract, text) {
  try {
    return parseCollectionTable(text, contract.headers, file.path);
  } catch (error) {
    throw kitError(error.message, { path: file.path });
  }
}

// Splits text into lines that keep their own line endings, so unchanged lines are written back byte for byte.
function kitLines(text) {
  const source = String(text ?? '');
  const bom = source.startsWith('﻿') ? '﻿' : '';
  const parts = source.slice(bom.length).split(/(\r\n|\n|\r)/);
  const lines = [];
  for (let index = 0; index < parts.length; index += 2) lines.push({ text: parts[index], end: parts[index + 1] || '' });
  // parseCollectionTable skips empty lines: the first non-empty line is the header, the rest are rows in order.
  const rowLines = lines.map((line, index) => (line.text.length ? index : -1)).filter((index) => index >= 0).slice(1);
  return { bom, lines, rowLines };
}

export function listProducts(workspace = globalThis.__MYGITA_LOCAL_WORKSPACE__) {
  if (!Array.isArray(workspace?.products)) throw kitError('The MyGita local workspace is not loaded.');
  return [...workspace.products]
    .sort((a, b) => Number(a.order || 0) - Number(b.order || 0))
    .map((product) => {
      const config = product.config || {};
      const problems = [];
      const bookIds = [];
      for (const experience of config.experiences || []) {
        const listed = Array.isArray(experience.bookIds) && experience.bookIds.length ? experience.bookIds : [];
        if (experience.bookId && listed.length && !listed.includes(experience.bookId)) {
          problems.push({ message: `Experience ${experience.id} names book ${experience.bookId} outside its bookIds.` });
        }
        for (const id of listed.length ? listed : [experience.bookId].filter(Boolean)) if (!bookIds.includes(id)) bookIds.push(id);
      }
      let languages = null;
      try { languages = normalizeLanguageModel(config.languages); } catch (error) { problems.push({ message: error.message }); }
      return Object.freeze({
        id: product.id,
        path: product.path,
        name: String(config.name || product.id),
        metadata: product.metadata || {},
        bookIds: Object.freeze(bookIds),
        languages,
        problems: Object.freeze(problems)
      });
    });
}

export async function openMedia(readText) {
  if (typeof readText !== 'function') throw kitError('openMedia requires a readText(logicalPath) function.');
  let catalog;
  try {
    catalog = normalizeMediaCatalog(JSON.parse(await readText('catalog.json')));
  } catch (error) {
    throw kitError(error.message, { path: 'catalog.json' });
  }
  const books = await Promise.all(catalog.books.map(async (entry) => {
    try {
      const manifest = validateBookManifest(JSON.parse(await readText(entry.manifest)), entry.book_id);
      return Object.freeze({
        id: entry.book_id,
        manifestPath: entry.manifest,
        manifest,
        name: manifest.name || {},
        languages: Object.freeze(Object.keys(manifest.verses.masters)),
        problems: Object.freeze([])
      });
    } catch (error) {
      return Object.freeze({
        id: entry.book_id,
        manifestPath: entry.manifest,
        manifest: null,
        name: {},
        languages: Object.freeze([]),
        problems: Object.freeze([{ path: entry.manifest, message: error.message }])
      });
    }
  }));
  return Object.freeze({ catalog, books: Object.freeze(books), readText });
}

export async function contentTree(media, bookId, { sourceLanguage = KIT_DEFAULT_SOURCE_LANGUAGE } = {}) {
  const book = media?.books?.find((entry) => entry.id === bookId);
  if (!book) throw kitError(`Unknown book ${bookId}.`);
  if (!book.manifest) throw kitError(book.problems[0]?.message || `Book ${bookId} could not be opened.`, { path: book.manifestPath });
  const manifest = book.manifest;
  const registries = manifest.registries || {};
  const bookTitle = manifest.name?.en || Object.values(manifest.name || {})[0] || bookId;
  const file = (path, language, contract = null) => Object.freeze({
    path: safeMediaPath(path),
    language,
    contract,
    editable: Boolean(contract),
    views: Object.freeze(contract ? KIT_CONTRACTS[contract].views : [])
  });
  const node = (kind, collectionId, title, files) => Object.freeze({
    kind,
    collectionId,
    title,
    editable: files.some((entry) => entry.editable) ? 'text' : 'none',
    files: Object.freeze(files)
  });
  const registryRows = async (path, headers) => {
    if (!path) return [];
    try {
      return parseCollectionTable(await media.readText(path), headers, path).rows;
    } catch (error) {
      throw kitError(error.message, { path });
    }
  };
  const localizedFiles = (row, fields, contract) => Object.entries(fields)
    .filter(([, column]) => row[column])
    .map(([language, column]) => file(row[column], language, contract));

  const nodes = [node('verses', bookId, bookTitle, Object.entries(manifest.verses.masters)
    .map(([language, path]) => file(path, language, language === sourceLanguage ? 'source-master' : 'localized-master')))];
  const details = Object.entries(registries.verses?.localized || {}).map(([language, path]) => file(path, language, 'verse-details'));
  if (details.length) nodes.push(node('details', bookId, bookTitle, details));
  for (const row of await registryRows(registries.text, TEXT_REGISTRY_HEADERS)) {
    nodes.push(node('questions', row.collection_id, row.title,
      [file(row.catalog_url, null), ...localizedFiles(row, LOCALIZED_REGISTRY_FIELDS.text, 'question-master')]));
  }
  for (const row of await registryRows(registries.images, IMAGE_REGISTRY_HEADERS)) {
    nodes.push(node('images', row.collection_id, row.title,
      [file(row.catalog_url, null), ...localizedFiles(row, LOCALIZED_REGISTRY_FIELDS.images, 'illustration-metadata')]));
  }
  for (const row of await registryRows(registries.audio, AUDIO_REGISTRY_HEADERS)) {
    nodes.push(node('audio', row.collection_id, row.title,
      [row.catalog_url, row.cue_purpose_url, row.cue_url].filter(Boolean).map((path) => file(path, null))));
  }
  for (const row of await registryRows(registries.deck, DECK_REGISTRY_HEADERS)) {
    nodes.push(node('deck', row.collection_id, row.title, [file(row.catalog_url, null)]));
  }
  return Object.freeze(nodes);
}

export function readItems(file, text, { view = '' } = {}) {
  const contract = kitContract(file);
  const activeView = kitView(contract, file, view);
  const table = kitParse(file, contract, text);
  if (activeView === 'chapters') {
    const chapters = new Map();
    for (const row of table.rows) {
      if (!chapters.has(row.cid)) chapters.set(row.cid, { key: row.cid, label: row.cid, values: { cid: row.cid, chapter_name: row.chapter_name }, problems: [] });
      const chapter = chapters.get(row.cid);
      if (row.chapter_name !== chapter.values.chapter_name && !chapter.problems.length) {
        chapter.problems.push(`Chapter ${row.cid} has different chapter names (first differs at ${row.sid}).`);
      }
    }
    return Object.freeze({
      fields: Object.freeze([{ name: 'cid', editable: false, type: 'text' }, { name: 'chapter_name', editable: true, type: 'text' }]),
      items: Object.freeze([...chapters.values()])
    });
  }
  return Object.freeze({
    fields: Object.freeze(contract.headers.map((name) => ({ name, editable: !contract.locked.includes(name), type: kitFieldType(name) }))),
    items: Object.freeze(table.rows.map((row) => ({ key: kitKeyOf(contract, row), label: kitLabelOf(contract, row), values: row, problems: [] })))
  });
}

export function updateItem(file, text, key, values, { view = '' } = {}) {
  const contract = kitContract(file);
  const activeView = kitView(contract, file, view);
  const table = kitParse(file, contract, text);
  const targets = table.rows
    .map((row, index) => ({ row, index }))
    .filter(({ row }) => (activeView === 'chapters' ? row.cid === key : kitKeyOf(contract, row) === key));
  if (!targets.length) throw kitError(`${file.path} has no item ${key}.`, { path: file.path, key });
  const editable = activeView === 'chapters' ? ['chapter_name'] : contract.headers.filter((name) => !contract.locked.includes(name));
  const known = activeView === 'chapters' ? ['cid', 'chapter_name'] : contract.headers;
  const changes = Object.entries(values || {}).map(([field, value]) => [field, String(value ?? '').replace(/\r\n?/g, '\n')]);
  for (const [field, value] of changes) {
    if (!known.includes(field)) throw kitError(`${field} is not a field of ${file.path}.`, { path: file.path, key, field });
    if (!editable.includes(field) && targets.some(({ row }) => row[field] !== value)) {
      throw kitError(`${field} cannot be changed here.`, { path: file.path, key, field });
    }
  }
  const { bom, lines, rowLines } = kitLines(text);
  let changed = false;
  for (const { index } of targets) {
    const line = lines[rowLines[index]];
    const fields = line.text.split('#');
    for (const [field, value] of changes) {
      const column = contract.headers.indexOf(field);
      if (!editable.includes(field) || decode(fields[column]) === value) continue;
      try {
        fields[column] = encode(value);
      } catch (error) {
        throw kitError(error.message, { path: file.path, key, field });
      }
      changed = true;
    }
    line.text = fields.join('#');
  }
  if (!changed) return String(text ?? '');
  const result = bom + lines.map((line) => line.text + line.end).join('');
  kitParse(file, contract, result);
  return result;
}
