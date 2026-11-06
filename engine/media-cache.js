(function (global) {
  const keyUrl = (scope, path, hash) => new URL(`__media_cache__/${encodeURIComponent(path)}/${encodeURIComponent(hash)}`, scope).href;
  const pathPrefix = (scope, path) => new URL(`__media_cache__/${encodeURIComponent(path)}/`, scope).href;
  global.MyGitaMediaCache = Object.freeze({
    async open(name, scope) {
      const cache = await caches.open(name);
      return Object.freeze({
        async get(path, hash) { return cache.match(keyUrl(scope, path, hash)); },
        async put(path, hash, response) { await cache.put(keyUrl(scope, path, hash), response); },
        async latest(path, exceptHash = '') {
          const prefix = pathPrefix(scope, path); const keys = await cache.keys();
          const key = keys.find((request) => request.url.startsWith(prefix) && !request.url.endsWith(`/${encodeURIComponent(exceptHash)}`));
          return key ? cache.match(key) : null;
        },
        async evictOlder(path, keepHash) {
          const prefix = pathPrefix(scope, path); const keep = keyUrl(scope, path, keepHash); const keys = await cache.keys();
          await Promise.all(keys.filter((request) => request.url.startsWith(prefix) && request.url !== keep).map((request) => cache.delete(request)));
        },
        async evictMissing(validPaths) {
          const allowed = new Set(validPaths); const marker = new URL('__media_cache__/', scope).href; const keys = await cache.keys();
          await Promise.all(keys.filter((request) => { const suffix = request.url.startsWith(marker) ? request.url.slice(marker.length) : ''; return suffix && !allowed.has(decodeURIComponent(suffix.split('/')[0])); }).map((request) => cache.delete(request)));
        }
      });
    }
  });
})(globalThis);
