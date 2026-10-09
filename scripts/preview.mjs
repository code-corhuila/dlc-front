// Local preview of dist/ plus fixtures/ (registry and C02 test-double portals).
// Deep links return the shell HTML; missing assets return 404 (C01).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};
const port = Number(process.env.PORT ?? 4180);

createServer(async (request, response) => {
  const path = normalize(new URL(request.url, 'http://x').pathname);
  const isAsset = extname(path) !== '';
  const file = join('dist', isAsset ? path : 'index.html');
  try {
    const body = await readFile(join('fixtures', path)).catch(() =>
      readFile(file),
    );
    response.writeHead(200, {
      'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });
    response.end(body);
  } catch {
    response.writeHead(404).end();
  }
}).listen(port, () => console.log(`preview: http://localhost:${port}/`));
