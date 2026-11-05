import {
  COLLECTION_ROOT,
  readCollectionTextFromDirectory,
  readCollectionTextFromFiles
} from './collection-data.js';
import { DirectoryMediaSource, FilesMediaSource, RemoteMediaSource } from '../media-source.js';
import { loadMediaBookExperience } from '../media-experience-adapter.js';

export class CollectionSourceRequiredError extends Error {
  constructor() {
    super('Choose the local media folder to continue.');
    this.name = 'CollectionSourceRequiredError';
  }
}

export class CollectionSourceSupersededError extends Error {
  constructor() {
    super('A newer media selection replaced this load.');
    this.name = 'CollectionSourceSupersededError';
  }
}

export class CollectionSource {
  constructor({
    protocol = globalThis.location?.protocol || 'https:',
    version = '',
    media = {},
    bookForExperience = () => '',
    productTextReader = null,
    productMediaResolver = null,
    fetchImpl = globalThis.fetch?.bind(globalThis),
    baseUrl = globalThis.location?.href || 'https://localhost/'
  } = {}) {
    this.protocol = protocol;
    this.version = version;
    this.mediaConfig = media || {};
    this.bookForExperience = bookForExperience;
    this.productTextReader = productTextReader;
    this.productMediaResolver = productMediaResolver;
    this.fetchImpl = fetchImpl;
    this.baseUrl = baseUrl;
    this.files = null;
    this.directoryHandle = null;
    this.mediaSource = null;
    this.cache = new Map();
    this.tableCache = new Map();
    this.generation = 0;
    this.selectionRequest = 0;
    if (protocol !== 'file:' && media?.remoteRoot) {
      this.mediaSource = new RemoteMediaSource({ rootUrl: media.remoteRoot, catalogPath: media.catalog || 'catalog.json', fetchImpl });
    }
  }

  get requiresSelection() { return this.protocol === 'file:' && !this.mediaSource; }
  get usesLocalFiles() { return Boolean(this.files || this.directoryHandle || (this.protocol === 'file:' && this.mediaSource)); }
  get isReady() { return !this.requiresSelection; }
  get label() { return this.mediaSource?.label || (this.protocol === 'file:' ? 'media' : this.mediaConfig.remoteRoot || 'bundled content'); }

  clear({ releaseMedia = false, preserveSelection = false } = {}) {
    this.generation += 1;
    this.cache.forEach((dataset) => dataset.release?.());
    this.cache.clear();
    this.tableCache.clear();
    if (releaseMedia) {
      this.mediaSource?.release?.();
      this.mediaSource = null;
      if (!preserveSelection) this.selectionRequest += 1;
    }
  }

  selectFiles(fileList) {
    const files = Array.from(fileList || []);
    if (!files.length) throw new CollectionSourceRequiredError();
    this.clear();
    this.files = files;
    this.directoryHandle = null;
  }

  selectDirectory(directoryHandle) {
    if (!directoryHandle || directoryHandle.kind !== 'directory') throw new CollectionSourceRequiredError();
    this.clear();
    this.files = null;
    this.directoryHandle = directoryHandle;
  }

  async selectMediaDirectory(directoryHandle) {
    const request = ++this.selectionRequest;
    const source = new DirectoryMediaSource({ directoryHandle, catalogPath: this.mediaConfig.catalog || 'catalog.json' });
    await source.loadCatalog();
    if (request !== this.selectionRequest) {
      source.release();
      throw new CollectionSourceSupersededError();
    }
    this.clear({ releaseMedia: true, preserveSelection: true });
    this.mediaSource = source;
  }

  async selectMediaFiles(fileList) {
    const request = ++this.selectionRequest;
    const source = new FilesMediaSource({ fileList, catalogPath: this.mediaConfig.catalog || 'catalog.json' });
    await source.loadCatalog();
    if (request !== this.selectionRequest) {
      source.release();
      throw new CollectionSourceSupersededError();
    }
    this.clear({ releaseMedia: true, preserveSelection: true });
    this.mediaSource = source;
  }

  async productText(url) {
    if (this.productTextReader) return this.productTextReader(url);
    if (this.directoryHandle) return readCollectionTextFromDirectory(this.directoryHandle, url);
    if (this.files) return readCollectionTextFromFiles(this.files, url);
    const dataRoot = COLLECTION_ROOT.replace(/\/collections$/, '');
    const resolved = String(url).startsWith('data/') ? `${dataRoot}/${String(url).slice(5)}` : String(url);
    const request = new URL(resolved, this.baseUrl);
    if (this.version) request.searchParams.set('v', this.version);
    const response = await this.fetchImpl(request.href);
    if (!response?.ok) throw new Error(`Could not load ${url} (HTTP ${response?.status || 'network error'}).`);
    return response.text();
  }

  resolveProductMediaUrl(value) {
    if (/^https:\/\//i.test(String(value || ''))) return value;
    if (this.productMediaResolver) return this.productMediaResolver(value);
    const dataRoot = COLLECTION_ROOT.replace(/\/collections$/, '');
    const resolved = String(value).startsWith('data/') ? `${dataRoot}/${String(value).slice(5)}` : String(value);
    return new URL(resolved, this.baseUrl).href;
  }

  async loadExperience(experienceId, { collectionId = '', refresh = false, onCoreReady = null } = {}) {
    const key = `${experienceId}:${collectionId}`;
    if (!refresh && this.mediaSource?.needsRefresh) refresh = true;
    if (!refresh && this.cache.has(key)) return this.cache.get(key);
    if (this.requiresSelection) throw new CollectionSourceRequiredError();
    if (refresh) this.cache.get(key)?.release?.();
    const bookId = String(this.bookForExperience(experienceId, collectionId) || collectionId || '').trim();
    const mediaSource = this.mediaSource;
    const generation = this.generation;
    if (!mediaSource) throw new Error('MyGita requires a media source to load scripture content.');
    if (!bookId) throw new Error(`Experience ${experienceId} does not declare a media book.`);
    if (refresh) {
      this.tableCache.clear();
      await mediaSource.loadCatalog({ refresh: true });
    }
    const dataset = await loadMediaBookExperience(experienceId, {
      bookId,
      mediaSource,
      productText: (url) => this.productText(url),
      resolveProductMediaUrl: (url) => this.resolveProductMediaUrl(url),
      collectionId: collectionId || bookId,
      tableCache: this.tableCache,
      onCoreReady: typeof onCoreReady === 'function' ? async (coreDataset) => {
        if (generation !== this.generation || mediaSource !== this.mediaSource) return;
        await onCoreReady(coreDataset);
      } : null
    });
    if (generation !== this.generation || mediaSource !== this.mediaSource) {
      dataset.release?.();
      throw new CollectionSourceSupersededError();
    }
    this.cache.set(key, dataset);
    return dataset;
  }
}
