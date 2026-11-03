// Local dev server for Long or Short: serves the repo statically and answers /api/longshort with the real handler on an
// in-memory store (no Upstash, nothing persisted, no production keys touched). Local debug flags are set here only:
//   PORT=8658 node scripts/longshort-devserver.mjs            -> real DexScreener prices, 1h/24h + 20s debug window
//   LS_LOCAL_MOCK=1 node scripts/longshort-devserver.mjs      -> server-side mock prices too (debug rounds resolve both ways)
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join, normalize } from 'node:path';
import { makeHandler } from '../api/longshort.js'; import { memoryKv } from '../api/_lib/kv.js';
const root = new URL('..', import.meta.url).pathname, PORT = Number(process.env.PORT || 8658);
const env = { LS_LOCAL_DEBUG: '1', LS_LOCAL_MOCK: process.env.LS_LOCAL_MOCK || '', ADMIN_TOKEN: process.env.LS_DEV_ADMIN_TOKEN || 'local-dev-admin' };
let off = 0; const now = () => Date.now() + off; // dev-only clock offset (POST /__dev/advance?ms=) to play 1h rounds quickly; not part of the API
const h = makeHandler({ env, kv: memoryKv(now), now });
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.ttf': 'font/ttf' };
http.createServer(async (req, res) => { const u = new URL(req.url, 'http://x');
  if (u.pathname === '/api/longshort') { let b = ''; for await (const c of req) b += c; req.body = b || undefined; req.query = Object.fromEntries(u.searchParams); return h(req, res); }
  if (u.pathname === '/__dev/advance' && req.method === 'POST') { off += Number(u.searchParams.get('ms')) || 0; res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify({ off })); }
  if (u.pathname.startsWith('/api/')) { res.statusCode = 404; return res.end('{}'); }
  const f = normalize(join(root, u.pathname.endsWith('/') ? u.pathname + 'index.html' : u.pathname)); if (!f.startsWith(root)) { res.statusCode = 403; return res.end(); }
  try { const data = await readFile(f); res.setHeader('content-type', TYPES[extname(f)] || 'application/octet-stream'); res.end(data); } catch { res.statusCode = 404; res.end('not found'); }
}).listen(PORT, () => console.log('long-or-short dev server on http://localhost:' + PORT + '/long-or-short.html (memory store, local debug)'));
