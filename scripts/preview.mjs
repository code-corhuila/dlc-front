// Local preview of dist/ plus fixtures/ (registry and C02 test-double portals).
// Deep links return the shell HTML; missing assets return 404 (C01).
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { pathToFileURL } from 'node:url';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.woff2': 'font/woff2',
};

async function proxy(origin, path, method, response) {
  try {
    const upstream = await fetch(origin + path, {
      method,
      signal: AbortSignal.timeout(10_000),
    });

    response.writeHead(upstream.status, {
      'content-type':
        upstream.headers.get('content-type') ?? 'application/octet-stream',
      'cache-control': 'no-store',
    });

    response.end(
      method === 'HEAD' ? undefined : Buffer.from(await upstream.arrayBuffer()),
    );
  } catch {
    response.writeHead(502, { 'cache-control': 'no-store' }).end();
  }
}

export function createPreviewServer({
  patientOrigin = process.env.PATIENT_ORIGIN ?? 'http://127.0.0.1:4177',
  clinicalOrigin = process.env.CLINICAL_ORIGIN ?? 'http://localhost:4175',
  billingOrigin = process.env.BILLING_ORIGIN ?? 'http://localhost:4204',
} = {}) {
  return createServer(async (request, response) => {
    if (!['GET', 'HEAD'].includes(request.method)) {
      return response
        .writeHead(405, { Allow: 'GET, HEAD', 'cache-control': 'no-store' })
        .end();
    }
    const pathname = new URL(request.url, 'http://x').pathname;

    if (pathname.startsWith('/portals/patient/')) {
      return proxy(patientOrigin, request.url, request.method, response);
    }

    if (pathname.startsWith('/portals/clinical/')) {
      return proxy(clinicalOrigin, request.url, request.method, response);
    }

    if (pathname.startsWith('/portals/billing/')) {
      return proxy(billingOrigin, request.url, request.method, response);
    }

    const path = normalize(pathname);
    const isAsset = extname(path) !== '' || pathname.startsWith('/portals/');
    const file = join('dist', isAsset ? path : 'index.html');

    try {
      const body = await readFile(join('fixtures', path)).catch(() =>
        readFile(file),
      );

      response.writeHead(200, {
        'content-type': TYPES[extname(file)] ?? 'application/octet-stream',
        'cache-control': 'no-store',
      });

      response.end(request.method === 'HEAD' ? undefined : body);
    } catch {
      response.writeHead(404, { 'cache-control': 'no-store' }).end();
    }
  });
}

if (
  process.argv[1] &&
  import.meta.url === pathToFileURL(process.argv[1]).href
) {
  const port = Number(process.env.PORT ?? 4180);
  createPreviewServer().listen(port, () =>
    console.log(`preview: http://localhost:${port}/`),
  );
}
