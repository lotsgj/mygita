import { loadCollectionExperienceWithReader } from './player/collection-data.js';
import { safeMediaPath } from './media-source.js';

function declaredFiles(manifest) {
  return new Set((manifest?.files || []).map((path) => safeMediaPath(path)));
}

function declaredCandidate(files, candidates) {
  return candidates.map(safeMediaPath).find((path) => files.has(path)) || '';
}

export function mediaPathForProductPath(productPath, { manifest, experienceId } = {}) {
  const originalPath = String(productPath || '').replace(/\\/g, '/');
  const embeddedData = originalPath.indexOf('/data/');
  const path = embeddedData >= 0 ? originalPath.slice(embeddedData + 1) : originalPath;
  const bookId = String(manifest?.book_id || '').trim();
  if (!bookId || !experienceId) throw new Error('Media experience adapter requires a book manifest and experience ID.');
  const files = declaredFiles(manifest);
  if (!path.startsWith('data/')) return files.has(path) ? path : '';

  const registryPaths = {
    'data/collections/verses/collection.csv': manifest.registries?.verses?.structural,
    'data/collections/verses/collection_sa.csv': manifest.registries?.verses?.localized?.sa,
    'data/collections/verses/collection_en.csv': manifest.registries?.verses?.localized?.en,
    'data/collections/verses/collection_kn.csv': manifest.registries?.verses?.localized?.kn,
    'data/collections/audio/collection.csv': manifest.registries?.audio,
    'data/collections/images/collection.csv': manifest.registries?.images,
    'data/collections/deck/collection.csv': manifest.registries?.deck,
    'data/collections/text/collection.csv': manifest.registries?.text
  };
  if (registryPaths[path]) return declaredCandidate(files, [registryPaths[path]]);

  const versePrefix = `data/collections/verses/${bookId}/`;
  if (path.startsWith(versePrefix)) {
    const name = path.slice(versePrefix.length);
    if (name === 'catalog.csv') return declaredCandidate(files, [manifest.verses?.catalog || '']);
    const language = name.match(/^master_(sa|en|kn)\.csv$/)?.[1];
    if (language) return declaredCandidate(files, [manifest.verses?.masters?.[language] || '']);
  }

  const audio = path.match(/^data\/collections\/audio\/([^/]+)\/catalog\.csv$/);
  if (audio) return declaredCandidate(files, [`book/${bookId}/audio/${audio[1]}/catalog.csv`]);

  const localized = path.match(/^data\/collections\/(images|text)\/([^/]+)\/(catalog|master_en|master_kn)\.csv$/);
  if (localized) {
    const [, type, collectionId, name] = localized;
    const folder = type === 'text' ? 'questions' : 'illustration';
    return declaredCandidate(files, [`book/${bookId}/${folder}/${collectionId}/${name}.csv`]);
  }

  const experienceResource = path.match(/^data\/experiences\/([^/]+)\/(.+)$/);
  if (experienceResource) {
    const [, sourceExperienceId, requested] = experienceResource;
    const generic = requested
      .replace(new RegExp(`^${bookId.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}-`), '')
      .replace(/^images\.csv$/, 'image.csv');
    return declaredCandidate(files, [
      `book/${bookId}/experience/${sourceExperienceId}/${requested}`,
      `book/${bookId}/experience/${sourceExperienceId}/${generic}`,
      `book/${bookId}/experience/${sourceExperienceId}/${requested.replace(/^images\.csv$/, 'image.csv')}`,
      `book/${bookId}/experience/${experienceId}/${requested}`,
      `book/${bookId}/experience/${experienceId}/${generic}`,
      `book/${bookId}/experience/${experienceId}/${requested.replace(/^images\.csv$/, 'image.csv')}`
    ]);
  }
  return '';
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
  const text = async (path) => {
    const mediaPath = mediaPathForProductPath(path, { manifest, experienceId });
    return mediaPath ? mediaSource.readText(mediaPath) : productText(path);
  };
  const resolveMediaUrl = (value) => {
    const source = String(value || '').trim();
    if (/^https:\/\//i.test(source)) return source;
    if (source.startsWith('audio/') || source.startsWith('image/') || source.startsWith('video/') || source.startsWith('book/')) {
      return mediaSource.resolveMedia(source);
    }
    return resolveProductMediaUrl(source);
  };
  const dataset = await loadCollectionExperienceWithReader(experienceId, { text, resolveMediaUrl, collectionId });
  dataset.contentSource = Object.freeze({ type: 'media-book', bookId, contentVersion: manifest.content_version });
  return settleDatasetMedia(dataset);
}
