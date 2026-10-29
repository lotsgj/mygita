import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { normalizeDistribution } from '../js/distribution.js';
import { normalizeProductWorkspace, parseProductTable } from '../js/products.js';

const engineRoot = path.resolve(import.meta.dirname, '..');
const root = path.resolve(engineRoot, '..');
const productsRoot = path.join(root, 'products');
const output = path.join(root, 'dist', 'mygita');
const app = JSON.parse(await readFile(path.join(productsRoot, 'app.json'), 'utf8'));
const registry = parseProductTable(await readFile(path.join(productsRoot, 'collection.csv'), 'utf8'));
const localized = {
  en: parseProductTable(await readFile(path.join(productsRoot, 'collection_en.csv'), 'utf8')),
  kn: parseProductTable(await readFile(path.join(productsRoot, 'collection_kn.csv'), 'utf8'))
};
const enabled = registry.filter((row) => String(row.enabled).toLowerCase() !== 'false');
const rawProducts = await Promise.all(enabled.map(async (row) => ({
  id: row.product_id,
  config: normalizeDistribution(JSON.parse(await readFile(path.join(productsRoot, row.path, 'data', 'distribution.json'), 'utf8')))
})));
const workspace = normalizeProductWorkspace({ app, registry, localized, products: rawProducts });
const buildId = process.env.VERSES_BUILD_ID || new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const major = String(process.env.VERSES_MAJOR_VERSION || (await readFile(path.join(engineRoot, 'APP_MAJOR_VERSION'), 'utf8')).trim());
const version = `${major}.${buildId}`;
const clarityProjectId = String(process.env.CLARITY_PROJECT_ID || '').trim();

function run(script) { execFileSync(process.execPath, [script], { cwd: engineRoot, stdio: 'inherit' }); }
function isAudio(relative) { return /\.(mp3|m4a|ogg|opus|wav)$/i.test(relative); }
async function copyDirectory(source, destination, filter = () => true) {
  await cp(source, destination, { recursive: true, filter: (entry) => filter(path.relative(source, entry).split(path.sep).join('/')) });
}
async function walk(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) files.push(...await walk(absolute));
    else if (entry.isFile()) files.push(absolute);
  }
  return files;
}
function prefixConfig(product) {
  const prefix = `products/${product.path}/`;
  const config = structuredClone(product.config);
  const prefixPath = (value) => value && !/^(?:https?:|blob:|data:|\/)/.test(value) ? prefix + value : value;
  config.experiences = config.experiences.map((experience) => ({ ...experience, cardImage: prefixPath(experience.cardImage) }));
  const branding = config.branding || {};
  for (const key of ['fluteImage', 'socialImage', 'icon192', 'icon512', 'maskableIcon512', 'appleTouchIcon']) branding[key] = prefixPath(branding[key]);
  branding.themeStyles = (branding.themeStyles || []).map(prefixPath);
  return { ...product, config, collectionRoot: `${prefix}data/collections` };
}

function prefixApp(config) {
  const output = structuredClone(config);
  const branding = output.branding || {};
  const prefixPath = (value) => value && !/^(?:https?:|blob:|data:|\/)/.test(value) ? `products/${value}` : value;
  for (const key of ['fluteImage', 'socialImage', 'icon192', 'icon512', 'maskableIcon512', 'appleTouchIcon']) branding[key] = prefixPath(branding[key]);
  branding.themeStyles = (branding.themeStyles || []).map(prefixPath);
  return output;
}

run('scripts/build-font-css.mjs');
run('scripts/build-player.mjs');
await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, 'js'), { recursive: true });
await copyDirectory(path.join(engineRoot, 'css'), path.join(output, 'css'), (relative) => !relative.endsWith('.DS_Store') && relative !== 'docs.css');
await copyDirectory(path.join(engineRoot, 'assets'), path.join(output, 'assets'), (relative) => !relative.endsWith('.DS_Store'));
await cp(path.join(engineRoot, 'js', 'player.bundle.js'), path.join(output, 'js', 'player.bundle.js'));
await cp(path.join(engineRoot, 'offline.html'), path.join(output, 'offline.html'));

const builtProducts = workspace.products.map(prefixConfig);
const builtApp = prefixApp(workspace.app);
for (const product of workspace.products) {
  const source = path.join(productsRoot, product.path);
  const destination = path.join(output, 'products', product.path);
  await mkdir(destination, { recursive: true });
  for (const folder of ['assets', 'css', 'data']) {
    const from = path.join(source, folder);
    if ((await stat(from).catch(() => null))?.isDirectory()) {
      await copyDirectory(from, path.join(destination, folder), (relative) => !relative.endsWith('.DS_Store') && !isAudio(relative));
    }
  }
}
for (const filename of ['app.json', 'collection.csv', 'collection_en.csv', 'collection_kn.csv']) {
  await cp(path.join(productsRoot, filename), path.join(output, 'products', filename));
}

const initial = builtProducts.find((product) => product.id === workspace.app.defaultProduct) || builtProducts[0];
const platformBranding = builtApp.branding || {};
if ((await stat(path.join(productsRoot, 'gita', 'assets')).catch(() => null))?.isDirectory()) {
  await copyDirectory(path.join(productsRoot, 'gita', 'assets'), path.join(output, 'assets'), (relative) => !relative.endsWith('.DS_Store'));
}
let html = await readFile(path.join(engineRoot, 'player.html'), 'utf8');
const platformStyles = (platformBranding.themeStyles || []).map((href) => `<link rel="stylesheet" href="${href}?v=${version}" data-platform-theme>`).join('\n');
html = html
  .replace('<meta name="app-version" content="dev">', `<meta name="app-version" content="${version}">`)
  .replace('<meta name="clarity-project-id" content="">', `<meta name="clarity-project-id" content="${clarityProjectId}">`)
  .replace('<title>Verses</title>', `<title>${workspace.app.name}</title>`)
  .replaceAll('Gitaverse', workspace.app.name)
  .replaceAll('https://gitaverse.gitajyoti.org/', workspace.app.canonicalUrl)
  .replace('<link rel="icon" href="" sizes="192x192" data-brand-icon>', `<link rel="icon" href="${platformBranding.icon192 || ''}" sizes="192x192" data-brand-icon>`)
  .replace('<link rel="apple-touch-icon" href="" data-brand-apple-icon>', `<link rel="apple-touch-icon" href="${platformBranding.appleTouchIcon || ''}" data-brand-apple-icon>`)
  .replace('</head>', `${platformStyles}\n</head>`)
  .replace('window.__VERSES_DISTRIBUTION__ = window.__VERSES_DISTRIBUTION__ || null;', [
    `window.__MYGITA_APP__ = ${JSON.stringify(builtApp)};`,
    `window.__MYGITA_PRODUCTS__ = ${JSON.stringify(builtProducts)};`,
    `window.__MYGITA_ACTIVE_PRODUCT__ = ${JSON.stringify(initial.id)};`,
    `window.__VERSES_DISTRIBUTION__ = ${JSON.stringify(initial.config)};`
  ].join(''))
  .replaceAll('?v=dev', `?v=${version}`);
await writeFile(path.join(output, 'player.html'), html);
await writeFile(path.join(output, 'index.html'), html);

const manifest = {
  id: './', name: workspace.app.name, short_name: workspace.app.shortName, description: workspace.app.description,
  start_url: './player.html', scope: './', display: 'standalone', orientation: 'any',
  background_color: platformBranding.backgroundColor || '#eee8dc', theme_color: platformBranding.themeColor || '#243c5f',
  icons: [
    { src: platformBranding.icon192 || 'assets/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
    { src: platformBranding.icon512 || 'assets/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
    { src: platformBranding.maskableIcon512 || 'assets/icons/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
  ]
};
await writeFile(path.join(output, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
let sw = await readFile(path.join(engineRoot, 'service-worker.js'), 'utf8');
sw = sw.replaceAll('__GITAVERSE_VERSION__', version).replaceAll('gitaverse-', `${workspace.app.cachePrefix}-`).replaceAll('Gitaverse', workspace.app.name);
await writeFile(path.join(output, 'service-worker.js'), sw);
await mkdir(path.join(output, 'data'), { recursive: true });
await writeFile(path.join(output, 'data', 'app-version.json'), JSON.stringify({ version, distribution: workspace.app.id, builtAt: new Date().toISOString() }, null, 2) + '\n');
await cp(path.join(engineRoot, 'version-history.json'), path.join(output, 'data', 'version-history.json'));
const assets = {};
for (const absolute of await walk(output)) {
  const relative = path.relative(output, absolute).split(path.sep).join('/');
  if (relative === 'asset-manifest.json' || isAudio(relative)) continue;
  const contents = await readFile(absolute);
  assets[relative] = { sha256: createHash('sha256').update(contents).digest('hex'), bytes: (await stat(absolute)).size };
}
const precache = Object.keys(assets).filter((relative) => /^(?:player|index|offline)\.html$/.test(relative) || relative === 'manifest.webmanifest' || relative === 'js/player.bundle.js' || relative.startsWith('css/') || relative.startsWith('assets/'));
await writeFile(path.join(output, 'asset-manifest.json'), JSON.stringify({ version, distribution: workspace.app.id, assets, precache }, null, 2) + '\n');
console.log(`Built ${workspace.app.name} ${version} with ${builtProducts.length} products into ${output}.`);
