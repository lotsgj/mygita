function byId(id) { return document.getElementById(id); }

function parseTable(text) {
  const lines = String(text || '').replace(/^\uFEFF/, '').split(/\r?\n/).filter((line) => line.trim());
  if (!lines.length) return [];
  const headers = lines.shift().split('#').map((value) => value.trim());
  return lines.map((line) => Object.fromEntries(line.split('#').map((value, index) => [headers[index], value.trim()])));
}

async function readHandleText(directory, name) {
  return (await (await directory.getFileHandle(name)).getFile()).text();
}

async function fileFromHandle(root, relativePath) {
  const parts = String(relativePath).split('/').filter(Boolean);
  const filename = parts.pop();
  let directory = root;
  for (const part of parts) directory = await directory.getDirectoryHandle(part);
  return (await directory.getFileHandle(filename)).getFile();
}

function fileFromList(files, relativePath) {
  const normalized = String(relativePath).replace(/^\/+/, '');
  const file = files.find((entry) => {
    const path = String(entry.webkitRelativePath || entry.name).replace(/\\/g, '/');
    return path === normalized || path.endsWith('/' + normalized);
  });
  if (!file) throw new Error('The products folder is missing ' + normalized + '.');
  return file;
}

async function objectUrl(read, path, type = '') {
  const file = await read(path);
  return URL.createObjectURL(type ? new Blob([await file.text()], { type }) : file);
}

async function resolveResources(input, read) {
  const config = structuredClone(input);
  const branding = config.branding || {};
  const assetFields = ['fluteImage', 'icon192', 'icon512', 'maskableIcon512', 'appleTouchIcon'];
  for (const field of assetFields) if (branding[field]) branding[field] = await objectUrl(read, branding[field]);
  for (const experience of config.experiences || []) if (experience.cardImage) experience.cardImage = await objectUrl(read, experience.cardImage);
  for (const stylesheet of branding.themeStyles || []) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = await objectUrl(read, stylesheet, 'text/css');
    link.dataset.productTheme = 'true';
    document.head.appendChild(link);
  }
  return config;
}

function normalizeWorkspace({ app, registry, localized, products }) {
  const result = registry
    .filter((row) => String(row.enabled).toLowerCase() !== 'false')
    .sort((a, b) => (Number(a.order) || 0) - (Number(b.order) || 0))
    .map((row) => {
      const product = products.find((item) => item.id === row.product_id);
      if (!product) return {
        id: row.product_id, path: row.path, error: `The product ${row.product_id} is missing its data/distribution.json.`,
        metadata: Object.fromEntries(Object.entries(localized).map(([language, rows]) => {
          const value = rows.find((entry) => entry.product_id === row.product_id) || {};
          return [language, { name: value.name || row.product_id, shortName: value.short_name || value.name || row.product_id, description: value.description || '' }];
        }))
      };
      return {
        ...product,
        id: row.product_id,
        path: row.path,
        metadata: Object.fromEntries(Object.entries(localized).map(([language, rows]) => {
          const value = rows.find((entry) => entry.product_id === row.product_id) || {};
          return [language, { name: value.name || row.product_id, shortName: value.short_name || value.name || row.product_id, description: value.description || '' }];
        }))
      };
    });
  const available = result.filter((product) => product.config);
  if (!available.length) throw new Error('No enabled product could be opened.');
  if (!available.some((product) => product.id === app.defaultProduct)) app.defaultProduct = available[0].id;
  return { app, products: result };
}

async function workspaceFromHandle(handle) {
  let root = handle;
  if (handle.name !== 'products') {
    try { root = await handle.getDirectoryHandle('products'); }
    catch { throw new Error('Choose the products folder, or a repository folder containing products.'); }
  }
  const app = await resolveResources(JSON.parse(await readHandleText(root, 'app.json')), (path) => fileFromHandle(root, path));
  const registry = parseTable(await readHandleText(root, 'collection.csv'));
  const localized = {
    en: parseTable(await readHandleText(root, 'collection_en.csv')),
    kn: parseTable(await readHandleText(root, 'collection_kn.csv'))
  };
  const products = [];
  for (const row of registry.filter((entry) => String(entry.enabled).toLowerCase() !== 'false')) {
    try {
      const productRoot = await root.getDirectoryHandle(row.path);
      const data = await productRoot.getDirectoryHandle('data');
      const config = JSON.parse(await readHandleText(data, 'distribution.json'));
      products.push({ id: row.product_id, data, config: await resolveResources(config, (path) => fileFromHandle(productRoot, path)) });
    } catch (error) { products.push({ id: row.product_id, error: error.message }); }
  }
  return normalizeWorkspace({ app, registry, localized, products });
}

async function workspaceFromFiles(fileList) {
  const files = Array.from(fileList || []);
  const text = async (path) => (await fileFromList(files, path)).text();
  const rootText = async (name) => text('products/' + name).catch(() => text(name));
  const app = await resolveResources(JSON.parse(await rootText('app.json')), (path) => fileFromList(files, `products/${path}`));
  const registry = parseTable(await rootText('collection.csv'));
  const localized = { en: parseTable(await rootText('collection_en.csv')), kn: parseTable(await rootText('collection_kn.csv')) };
  const products = [];
  for (const row of registry.filter((entry) => String(entry.enabled).toLowerCase() !== 'false')) {
    try {
      const prefix = `products/${row.path}/`;
      const configText = await text(prefix + 'data/distribution.json').catch(() => text(`${row.path}/data/distribution.json`));
      const productFiles = files.filter((entry) => String(entry.webkitRelativePath || '').replace(/\\/g, '/').includes(`/${row.path}/`));
      products.push({ id: row.product_id, files: productFiles, config: await resolveResources(JSON.parse(configText), (path) => fileFromList(files, prefix + path)) });
    } catch (error) { products.push({ id: row.product_id, error: error.message }); }
  }
  return normalizeWorkspace({ app, registry, localized, products });
}

function startPlayer(workspace) {
  const initial = workspace.products.find((product) => product.id === workspace.app.defaultProduct && product.config) || workspace.products.find((product) => product.config);
  globalThis.__MYGITA_APP__ = workspace.app;
  globalThis.__MYGITA_PRODUCTS__ = workspace.products;
  globalThis.__MYGITA_ACTIVE_PRODUCT__ = initial.id;
  globalThis.__VERSES_DISTRIBUTION__ = initial.config;
  if (initial.data) globalThis.__VERSES_DATA_HANDLE__ = initial.data;
  if (initial.files) globalThis.__VERSES_DATA_FILES__ = initial.files;
  byId('distribution-chooser').hidden = true;
  const script = document.createElement('script');
  script.src = 'js/player.bundle.js?v=dev';
  document.body.appendChild(script);
}

function showError(error) { byId('distribution-folder-error').textContent = error?.message || 'The selected products folder could not be opened.'; }

async function chooseDirectory() {
  byId('distribution-folder-error').textContent = '';
  if (typeof window.showDirectoryPicker !== 'function') return byId('distribution-folder-input').click();
  try { startPlayer(await workspaceFromHandle(await window.showDirectoryPicker({ id: 'mygita-products', mode: 'readwrite' }))); }
  catch (error) { if (error?.name !== 'AbortError') showError(error); }
}

byId('distribution-folder-button').addEventListener('click', chooseDirectory);
globalThis.__VERSES_OPEN_DISTRIBUTION_DIRECTORY__ = workspaceFromHandle;
globalThis.__VERSES_OPEN_DISTRIBUTION_FILES__ = workspaceFromFiles;
byId('distribution-folder-input').addEventListener('change', async (event) => {
  try { startPlayer(await workspaceFromFiles(event.target.files)); }
  catch (error) { showError(error); }
});
byId('distribution-chooser').hidden = false;
