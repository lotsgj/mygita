import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { cp, mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { normalizeDistribution } from '../js/distribution.js';

const engineRoot = path.resolve(import.meta.dirname, '..');
const repositoryRoot = path.resolve(engineRoot, '..');
const product = String(process.argv[2] || '').trim();
if (!product) throw new Error('Choose a product to build, for example: node scripts/build-distribution.mjs gita');
const distributionRoot = path.resolve(repositoryRoot, 'products', product);
const output = path.resolve(repositoryRoot, 'dist', product);
if (!distributionRoot.startsWith(path.join(repositoryRoot, 'products') + path.sep)) {
  throw new Error('Product must be a folder inside products/.');
}
const dataRoot = path.join(distributionRoot, 'data');
const config = normalizeDistribution(JSON.parse(await readFile(path.join(dataRoot, 'distribution.json'), 'utf8')));
const buildId = process.env.VERSES_BUILD_ID || new Date().toISOString().replace(/[-:TZ.]/g, '').slice(0, 14);
const major = String(process.env.VERSES_MAJOR_VERSION || (await readFile(path.join(engineRoot, 'APP_MAJOR_VERSION'), 'utf8')).trim());
const version = `${major}.${buildId}`;
const clarityProjectId = String(process.env.CLARITY_PROJECT_ID || '').trim();
const gaMeasurementId = String(process.env.GA_MEASUREMENT_ID || '').trim();
if (gaMeasurementId && !/^G-[A-Z0-9]+$/i.test(gaMeasurementId)) throw new Error('GA_MEASUREMENT_ID must be a GA4 measurement ID beginning with G-.');
const branding = config.branding || {};

function run(script) { execFileSync(process.execPath, [script], { cwd: engineRoot, stdio: 'inherit' }); }
async function copyDirectory(source, destination, filter = () => true) { await cp(source, destination, { recursive: true, filter: (entry) => filter(path.relative(source, entry).split(path.sep).join('/')) }); }
async function walk(directory) { const files = []; for (const entry of await readdir(directory, { withFileTypes: true })) { const absolute = path.join(directory, entry.name); if (entry.isDirectory()) files.push(...await walk(absolute)); else if (entry.isFile()) files.push(absolute); } return files; }
function isAudioBinary(relative) { return /\.(mp3|m4a|ogg|opus|wav)$/i.test(relative); }
async function requireDistributionFile(relative) {
  if (!relative) throw new Error('Distribution configuration is missing a required asset path.');
  const absolute = path.join(distributionRoot, relative);
  const details = await stat(absolute).catch(() => null);
  if (!details?.isFile()) throw new Error(`Configured distribution asset does not exist: ${relative}`);
  return relative;
}
function absoluteAsset(relative) { return new URL(relative, config.canonicalUrl).href; }
function brandedHtml(source) {
  const styles = (branding.themeStyles || []).map((href) => `<link rel="stylesheet" href="${href}?v=${encodeURIComponent(version)}" data-distribution-theme>`).join('\n');
  return source
    .replace('<meta name="app-version" content="dev">', `<meta name="app-version" content="${version}">`)
    .replace('<meta name="clarity-project-id" content="">', `<meta name="clarity-project-id" content="${clarityProjectId}">`)
    .replace('<meta name="ga-measurement-id" content="">', `<meta name="ga-measurement-id" content="${gaMeasurementId}">`)
    .replace('<title>Verses</title>', `<title>${config.name}</title>`)
    .replaceAll('content="Explore and chant the verses of the Bhagavad Gita with Gitaverse."', `content="${config.description}"`)
    .replaceAll('<meta property="og:site_name" content="Gitaverse">', `<meta property="og:site_name" content="${config.name}">`)
    .replaceAll('<meta property="og:title" content="Gitaverse">', `<meta property="og:title" content="${config.name}">`)
    .replaceAll('<meta name="twitter:title" content="Gitaverse">', `<meta name="twitter:title" content="${config.name}">`)
    .replaceAll('content="Gitaverse with a Krishna flute and the title Shrimad Bhagavad Gita"', `content="${branding.socialImageAlt || config.name}">`)
    .replaceAll('https://gitaverse.gitajyoti.org/assets/social/gitaverse-preview.png', absoluteAsset(branding.socialImage))
    .replace('<link rel="icon" href="" sizes="192x192" data-brand-icon>', `<link rel="icon" href="${branding.icon192}" sizes="192x192" data-brand-icon>`)
    .replace('<link rel="apple-touch-icon" href="" data-brand-apple-icon>', `<link rel="apple-touch-icon" href="${branding.appleTouchIcon}" data-brand-apple-icon>`)
    .replace('</head>', `${styles}\n</head>`)
    .replace('window.__VERSES_DISTRIBUTION__ = window.__VERSES_DISTRIBUTION__ || null;', `window.__VERSES_DISTRIBUTION__ = ${JSON.stringify(config)};`)
    .replaceAll('https://gitaverse.gitajyoti.org/', config.canonicalUrl || '')
    .replaceAll('?v=dev', `?v=${encodeURIComponent(version)}`);
}

run('scripts/build-font-css.mjs');
run('scripts/build-player.mjs');
await Promise.all([
  requireDistributionFile(branding.fluteImage), requireDistributionFile(branding.socialImage),
  requireDistributionFile(branding.icon192), requireDistributionFile(branding.icon512),
  requireDistributionFile(branding.maskableIcon512), requireDistributionFile(branding.appleTouchIcon),
  ...(branding.themeStyles || []).map(requireDistributionFile),
  ...config.experiences.map((experience) => requireDistributionFile(experience.cardImage))
]);
await rm(output, { recursive: true, force: true });
await mkdir(path.join(output, 'js/vendor'), { recursive: true });
const player = brandedHtml(await readFile(path.join(engineRoot, 'player.html'), 'utf8'));
await writeFile(path.join(output, 'player.html'), player);
await writeFile(path.join(output, 'index.html'), player);
await cp(path.join(engineRoot, 'offline.html'), path.join(output, 'offline.html'));
await copyDirectory(path.join(engineRoot, 'css'), path.join(output, 'css'), (relative) => !relative.endsWith('.DS_Store') && relative !== 'docs.css');
await copyDirectory(path.join(engineRoot, 'assets'), path.join(output, 'assets'), (relative) => !relative.endsWith('.DS_Store'));
await copyDirectory(path.join(distributionRoot, 'assets'), path.join(output, 'assets'), (relative) => !relative.endsWith('.DS_Store'));
await copyDirectory(path.join(distributionRoot, 'css'), path.join(output, 'css'), (relative) => !relative.endsWith('.DS_Store'));
await cp(path.join(engineRoot, 'js/player.bundle.js'), path.join(output, 'js/player.bundle.js'));
await copyDirectory(dataRoot, path.join(output, 'data'), (relative) => !relative.endsWith('.DS_Store') && !isAudioBinary(relative));
const manifest = { id: '/', name: config.name, short_name: config.shortName, description: config.description, start_url: '/player.html', scope: '/', display: 'standalone', orientation: 'any', background_color: branding.backgroundColor || '#eee8dc', theme_color: branding.themeColor || '#243c5f', icons: [{ src: '/' + branding.icon192, sizes: '192x192', type: 'image/png', purpose: 'any' }, { src: '/' + branding.icon512, sizes: '512x512', type: 'image/png', purpose: 'any' }, { src: '/' + branding.maskableIcon512, sizes: '512x512', type: 'image/png', purpose: 'maskable' }] };
await writeFile(path.join(output, 'manifest.webmanifest'), JSON.stringify(manifest, null, 2) + '\n');
const sw = (await readFile(path.join(engineRoot, 'service-worker.js'), 'utf8')).replaceAll('__GITAVERSE_VERSION__', version).replaceAll('gitaverse-', `${config.cachePrefix}-`).replaceAll('Gitaverse', config.name).replace("const MEDIA_ORIGIN = 'https://media.gitajyoti.org';", `const MEDIA_ORIGIN = ${JSON.stringify(config.mediaOrigin)};`);
await writeFile(path.join(output, 'service-worker.js'), sw);
await writeFile(path.join(output, 'data/app-version.json'), JSON.stringify({ version, distribution: config.id, builtAt: new Date().toISOString() }, null, 2) + '\n');
await writeFile(path.join(output, 'data/version-history.json'), await readFile(path.join(engineRoot, 'version-history.json'), 'utf8'));
const assets = {};
for (const absolute of await walk(output)) { const relative = path.relative(output, absolute).split(path.sep).join('/'); if (relative === 'asset-manifest.json' || isAudioBinary(relative)) continue; const contents = await readFile(absolute); assets[relative] = { sha256: createHash('sha256').update(contents).digest('hex'), bytes: (await stat(absolute)).size }; }
const precache = Object.keys(assets).filter((relative) => relative === 'player.html' || relative === 'index.html' || relative === 'offline.html' || relative === 'manifest.webmanifest' || relative === 'js/player.bundle.js' || relative.startsWith('css/') || relative.startsWith('assets/') || relative.startsWith('data/collections/') || relative.startsWith('data/experiences/') || relative === 'data/distribution.json');
await writeFile(path.join(output, 'asset-manifest.json'), JSON.stringify({ version, distribution: config.id, assets, precache }, null, 2) + '\n');
console.log(`Built ${config.name} ${version} into ${output} (${Object.keys(assets).length} assets).`);
