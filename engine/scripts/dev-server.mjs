import http from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const repositoryRoot = path.resolve(import.meta.dirname, '..', '..');
const productionWebsiteUrl = 'https://gitajyoti.org/';
const mime = {
  '.css': 'text/css; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.json': 'application/json; charset=utf-8', '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf', '.webmanifest': 'application/manifest+json'
};

export function websiteUrl(value = productionWebsiteUrl) {
  const url = new URL(String(value || productionWebsiteUrl));
  if (!/^https?:$/.test(url.protocol)) throw new Error('--website-url must use http or https.');
  return new URL('./', url).href;
}

export function registrationUrl(value = productionWebsiteUrl) {
  return new URL('register.html', websiteUrl(value)).href;
}

export function renderPlayerHtml(source, baseUrl = productionWebsiteUrl) {
  return source.replaceAll('https://gitajyoti.org/register.html', registrationUrl(baseUrl));
}

export function options(args) {
  const result = { port: 4173, websiteUrl: productionWebsiteUrl };
  for (let index = 0; index < args.length; index += 1) {
    if (args[index] === '--') continue;
    if (args[index] === '--website-url') result.websiteUrl = websiteUrl(args[++index]);
    else if (args[index] === '--port') result.port = Number(args[++index]);
    else throw new Error(`Unknown option: ${args[index]}`);
  }
  if (!Number.isInteger(result.port) || result.port < 1 || result.port > 65535) throw new Error('--port must be an integer between 1 and 65535.');
  return result;
}

export function createServer({ websiteUrl: configuredWebsiteUrl = productionWebsiteUrl } = {}) {
  const localWebsiteUrl = websiteUrl(configuredWebsiteUrl);
  return http.createServer(async (request, response) => {
    try {
      const relative = decodeURIComponent(new URL(request.url, 'http://localhost').pathname).replace(/^\/+/, '') || 'index.html';
      const file = path.resolve(repositoryRoot, relative);
      if (!file.startsWith(repositoryRoot + path.sep) || !(await stat(file).catch(() => null))?.isFile()) {
        response.writeHead(404).end('Not found');
        return;
      }
      const extension = path.extname(file);
      const body = await readFile(file);
      response.setHeader('content-type', mime[extension] || 'application/octet-stream');
      response.setHeader('cache-control', 'no-store');
      response.end(extension === '.html' && path.basename(file) === 'player.html'
        ? renderPlayerHtml(body.toString('utf8'), localWebsiteUrl)
        : body);
    } catch (error) {
      response.writeHead(500).end(error.message || 'Unable to serve MyGita.');
    }
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const config = options(process.argv.slice(2));
  const server = createServer(config);
  server.listen(config.port, '127.0.0.1', () => {
    console.log(`MyGita development server: http://127.0.0.1:${config.port}/ (Website: ${config.websiteUrl})`);
  });
}
