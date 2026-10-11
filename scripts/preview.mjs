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

// Same-origin proxies to portal containers (C01); demo origins by default.
const clinicalOrigin = process.env.CLINICAL_ORIGIN ?? 'http://localhost:4175';

const billingOrigin = process.env.BILLING_ORIGIN ?? 'http://localhost:4204';

async function proxy(origin, pathname, response) {
  try {
    const upstream = await fetch(origin + pathname);

    response.writeHead(upstream.status, {
      'content-type':
        upstream.headers.get('content-type') ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });

    response.end(Buffer.from(await upstream.arrayBuffer()));
  } catch {
    response.writeHead(502).end();
  }
}

createServer(async (request, response) => {
  const pathname = new URL(request.url, 'http://x').pathname;

  if (pathname.startsWith('/portals/clinical/')) {
    return proxy(clinicalOrigin, pathname, response);
  }

  if (pathname.startsWith('/portals/billing/')) {
    return proxy(billingOrigin, pathname, response);
  }

  const path = normalize(pathname);
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
