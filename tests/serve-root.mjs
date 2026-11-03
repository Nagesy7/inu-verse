// Tiny static server over the repo root for browser tests (no network needed except what the page itself fetches).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
export const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.js': 'text/javascript', '.mjs': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.svg': 'image/svg+xml' };
export async function serveRoot() {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); const ff = f.endsWith('/') ? f + 'index.html' : f;
    if (!ff.startsWith(ROOT)) { r.statusCode = 403; return r.end(); }
    fs.readFile(ff, (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', MIME[path.extname(ff)] || 'application/octet-stream'); r.end(b); }); });
  await new Promise((ok) => srv.listen(0, ok)); return { url: `http://localhost:${srv.address().port}/`, close: () => srv.close() }; }
export const overlaps = (a, c) => !!(a && c && a[0] < c[0] + c[2] && a[0] + a[2] > c[0] && a[1] < c[1] + c[3] && a[1] + a[3] > c[1]);
