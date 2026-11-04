import { loadCollectionExperienceWithReader } from './player/collection-data.js';
import { isLogicalMediaPath } from './media-contract.js';

export function createMediaResourceReader({ mediaSource, productText }) {
  return async (path) => {
    const source = String(path || '').trim();
    return isLogicalMediaPath(source) ? mediaSource.readText(source) : productText(source);
  };
}

export function createMediaUrlResolver({ mediaSource, resolveProductMediaUrl }) {
  return (value) => {
    const source = String(value || '').trim();
    if (isLogicalMediaPath(source)) return mediaSource.resolveMedia(source);
    if (/^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(source)) throw new Error(`Owned media must use a logical path: ${source}.`);
    return resolveProductMediaUrl(source);
  };
}

async function settleDatasetMedia(dataset) {
  for (const [cid, value] of dataset.chapterIcons || []) dataset.chapterIcons.set(cid, await value);
  const settleIllustration = async (item) => {
    if (!item) return;
    if (item.resolvedUrl) item.resolvedUrl = await item.resolvedUrl;
    if (item.imageUrl) item.imageUrl = await item.imageUrl;
    if (item.fallback) await settleIllustration(item.fallback);
  };
  for (const row of dataset.rows || []) {
    for (const field of ['primaryAudioUrl', 'chantFullSaUrl', 'chapterIconUrl']) {
      if (row.media?.[field]) row.media[field] = await row.media[field];
    }
    for (const illustration of row.media?.illustrations || []) await settleIllustration(illustration);
    for (const item of row.media?.items || []) await settleIllustration(item);
  }
  return dataset;
}

export async function loadMediaBookExperience(experienceId, {
  bookId,
  mediaSource,
  productText,
  resolveProductMediaUrl = (value) => value,
  collectionId = bookId
} = {}) {
  if (!mediaSource?.loadBook || !mediaSource?.readText || !mediaSource?.resolveMedia) {
    throw new Error('Media experience adapter requires a readable media source.');
  }
  if (typeof productText !== 'function') throw new Error('Media experience adapter requires a product configuration reader.');
  const manifest = await mediaSource.loadBook(bookId);
  if (!manifest.experiences?.includes(experienceId)) throw new Error(`Book ${bookId} does not declare experience ${experienceId}.`);
  const text = createMediaResourceReader({ mediaSource, productText });
  const resolveMediaUrl = createMediaUrlResolver({ mediaSource, resolveProductMediaUrl });
  const dataset = await loadCollectionExperienceWithReader(experienceId, { text, resolveMediaUrl, collectionId, manifest });
  const configuredBooks = [...new Set((dataset.experience?.verseCollections?.length
    ? dataset.experience.verseCollections
    : [dataset.experience?.verseCollection]).filter(Boolean))];
  if (configuredBooks.length > 1) {
    dataset.collections = await Promise.all(configuredBooks.map(async (id, order) => {
      const book = id === manifest.book_id ? manifest : (mediaSource.books?.get(id) || await mediaSource.loadBook(id));
      const languages = [...new Set([...Object.keys(book.verses?.masters || {}), ...Object.keys(book.name || {})])];
      const localized = Object.fromEntries(languages.map((language) => {
        const name = String(book.name?.[language] || book.name?.en || id);
        return [language, { name, shortName: name, description: '' }];
      }));
      return { id, order: order + 1, localized };
    }));
  }
  dataset.contentSource = Object.freeze({ type: 'media-book', bookId, contentVersion: manifest.content_version });
  return settleDatasetMedia(dataset);
}
