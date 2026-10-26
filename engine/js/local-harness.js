function byId(id) { return document.getElementById(id); }

async function distributionFromHandle(handle) {
  if (handle.name === 'data') throw new Error('Choose the distribution root folder, such as gita, rather than its data folder.');
  const data = await handle.getDirectoryHandle('data');
  const file = await data.getFileHandle('distribution.json');
  const config = JSON.parse(await (await file.getFile()).text());
  return { data, config: await resolveResources(config, (path) => fileFromHandle(handle, path)) };
}

async function distributionFromFiles(fileList) {
  const files = Array.from(fileList || []);
  const file = files.find((entry) => /(^|\/)data\/distribution\.json$/.test(entry.webkitRelativePath || ''));
  if (!file) throw new Error('The selected folder is not a distribution root. Choose a folder containing data/distribution.json.');
  const config = JSON.parse(await file.text());
  return { files, config: await resolveResources(config, (path) => fileFromList(files, path)) };
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
  if (!file) throw new Error('The distribution is missing ' + normalized + '.');
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
    document.head.appendChild(link);
  }
  return config;
}

function startPlayer({ config, data, files }) {
  globalThis.__VERSES_DISTRIBUTION__ = config;
  if (data) globalThis.__VERSES_DATA_HANDLE__ = data;
  if (files) globalThis.__VERSES_DATA_FILES__ = files;
  byId('distribution-chooser').hidden = true;
  const script = document.createElement('script');
  script.src = 'js/player.bundle.js?v=dev';
  document.body.appendChild(script);
}

function showError(error) {
  byId('distribution-folder-error').textContent = error?.message || 'The selected data folder could not be opened.';
}

async function chooseDirectory() {
  byId('distribution-folder-error').textContent = '';
  if (typeof window.showDirectoryPicker !== 'function') return byId('distribution-folder-input').click();
  try {
    startPlayer(await distributionFromHandle(await window.showDirectoryPicker({ id: 'verses-distribution', mode: 'readwrite' })));
  } catch (error) {
    if (error?.name !== 'AbortError') showError(error);
  }
}

byId('distribution-folder-button').addEventListener('click', chooseDirectory);
globalThis.__VERSES_OPEN_DISTRIBUTION_DIRECTORY__ = distributionFromHandle;
globalThis.__VERSES_OPEN_DISTRIBUTION_FILES__ = distributionFromFiles;
byId('distribution-folder-input').addEventListener('change', async (event) => {
  try { startPlayer(await distributionFromFiles(event.target.files)); }
  catch (error) { showError(error); }
});
byId('distribution-chooser').hidden = false;
