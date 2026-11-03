import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadMediaBookExperience } from '../js/media-experience-adapter.js';
import { safeMediaPath, validateBookManifest, validateMediaCatalog } from '../js/media-source.js';

const repoRoot = resolve(import.meta.dirname, '../..');
const mediaRoot = resolve(process.argv[2] || '../media');

class FileMediaSource {
  constructor(root) { this.root = root; this.catalog = null; this.books = new Map(); }
  async readText(path) { return readFile(resolve(this.root, safeMediaPath(path)), 'utf8'); }
  async loadCatalog() {
    if (!this.catalog) this.catalog = validateMediaCatalog(JSON.parse(await this.readText('catalog.json')));
    return this.catalog;
  }
  async loadBook(bookId) {
    if (this.books.has(bookId)) return this.books.get(bookId);
    const entry = (await this.loadCatalog()).books.find((book) => book.book_id === bookId);
    if (!entry) throw new Error(`Media catalog does not contain book ${bookId}.`);
    const manifest = validateBookManifest(JSON.parse(await this.readText(entry.manifest)), bookId);
    this.books.set(bookId, manifest);
    return manifest;
  }
  resolveMedia(path) { return pathToFileURL(resolve(this.root, safeMediaPath(path))).href; }
}

function productReader(product, requests) {
  const root = resolve(repoRoot, `products/${product}`);
  return (path) => {
    requests.push(path);
    return readFile(resolve(root, path), 'utf8');
  };
}

function illustrationValue(item) {
  return item && {
    sid: item.sid,
    order: item.order,
    altText: item.altText,
    caption: item.caption,
    localized: item.localized,
    isFallback: item.isFallback,
    mediaType: item.mediaType
  };
}

function datasetContent(dataset) {
  return {
    experience: dataset.experience,
    collectionId: dataset.collectionId,
    collections: dataset.collections,
    rows: dataset.rows.map((row) => ({
      cid: row.cid,
      snum: row.snum,
      sid: row.sid,
      source: row.source,
      languages: row.languages,
      audio: {
        primaryAudioCollection: row.media.primaryAudioCollection,
        primaryAudioOrder: row.media.primaryAudioOrder,
        primaryAudioUrl: row.media.primaryAudioUrl,
        chantFullSaUrl: row.media.chantFullSaUrl
      },
      illustrations: row.media.illustrations.map(illustrationValue),
      mediaItems: row.media.items.map(illustrationValue),
      decks: row.media.decks.map((deck) => ({ order: deck.order, title: deck.title, sourceUrl: deck.sourceUrl })),
      contemplation: row.contemplation
    }))
  };
}

const cases = [
  { product: 'gita', experience: 'gita-700', book: 'bhagavad-gita' },
  { product: 'gita', experience: 'gita-yoga', book: 'bhagavad-gita' },
  { product: 'gita', experience: 'gita-chant', book: 'bhagavad-gita' },
  { product: 'gita', experience: 'gita-sara', book: 'bhagavad-gita' },
  { product: 'sukta', experience: 'sukta-chant', book: 'ganesha-atharva' },
  { product: 'sukta', experience: 'sukta-chant', book: 'purusha-sukta' }
];

const mediaSource = new FileMediaSource(mediaRoot);
for (const entry of cases) {
  const productRequests = [];
  const productText = productReader(entry.product, productRequests);
  const portable = await loadMediaBookExperience(entry.experience, {
    bookId: entry.book,
    mediaSource,
    productText,
    resolveProductMediaUrl: (value) => value,
    collectionId: entry.book
  });
  assert.ok(portable.rows.length, `${entry.experience}/${entry.book} has no rows`);
  assert.equal(portable.contentSource.type, 'media-book');
  assert.equal(portable.contentSource.bookId, entry.book);
  assert.ok(productRequests.length, `${entry.experience}/${entry.book} did not load product configuration`);
  productRequests.forEach((path) => assert.match(path, /^data\/experiences\/(?:collection\.csv|[^/]+\/(?:catalog\.csv|experience\.json))$/, `Scripture content leaked from product path ${path}`));
  datasetContent(portable);
  console.log(`✓ ${entry.experience}/${entry.book}: ${portable.rows.length} media rows; ${new Set(productRequests).size} product configuration files`);
}

console.log(`Media-only content loading verified from ${mediaRoot}.`);
