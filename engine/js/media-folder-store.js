const MEDIA_FOLDER_DATABASE = 'mygita-local-media';
const MEDIA_FOLDER_DATABASE_VERSION = 1;
const MEDIA_FOLDER_STORE = 'folders';
const ACTIVE_MEDIA_FOLDER = 'active-media-root';

function requestResult(request) {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error || new Error('Local media folder storage is unavailable.'));
  });
}

export class MediaFolderStore {
  constructor({ indexedDBImpl = globalThis.indexedDB, databaseName = MEDIA_FOLDER_DATABASE } = {}) {
    this.indexedDB = indexedDBImpl;
    this.databaseName = databaseName;
    this.database = null;
  }

  async open() {
    if (this.database) return this.database;
    if (!this.indexedDB) throw new Error('Local media folder storage is unavailable.');
    const request = this.indexedDB.open(this.databaseName, MEDIA_FOLDER_DATABASE_VERSION);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(MEDIA_FOLDER_STORE)) request.result.createObjectStore(MEDIA_FOLDER_STORE, { keyPath: 'key' });
    };
    this.database = await requestResult(request);
    return this.database;
  }

  async get() {
    const database = await this.open();
    return requestResult(database.transaction(MEDIA_FOLDER_STORE, 'readonly').objectStore(MEDIA_FOLDER_STORE).get(ACTIVE_MEDIA_FOLDER));
  }

  async remember(handle, selectedAt = new Date().toISOString()) {
    if (!handle || handle.kind !== 'directory') throw new Error('A directory handle is required.');
    const database = await this.open();
    const transaction = database.transaction(MEDIA_FOLDER_STORE, 'readwrite');
    transaction.objectStore(MEDIA_FOLDER_STORE).put({ key: ACTIVE_MEDIA_FOLDER, handle, label: handle.name || 'media', selectedAt });
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve({ handle, label: handle.name || 'media', selectedAt });
      transaction.onerror = () => reject(transaction.error || new Error('The local media folder could not be remembered.'));
      transaction.onabort = () => reject(transaction.error || new Error('The local media folder could not be remembered.'));
    });
  }

  async forget() {
    const database = await this.open();
    const transaction = database.transaction(MEDIA_FOLDER_STORE, 'readwrite');
    transaction.objectStore(MEDIA_FOLDER_STORE).delete(ACTIVE_MEDIA_FOLDER);
    return new Promise((resolve, reject) => {
      transaction.oncomplete = () => resolve();
      transaction.onerror = () => reject(transaction.error || new Error('The remembered media folder could not be removed.'));
    });
  }
}

export async function directoryPermission(handle, { request = false } = {}) {
  if (!handle || handle.kind !== 'directory') return 'denied';
  const options = { mode: 'read' };
  if (request && typeof handle.requestPermission === 'function') return handle.requestPermission(options);
  if (typeof handle.queryPermission === 'function') return handle.queryPermission(options);
  return request ? 'denied' : 'prompt';
}
