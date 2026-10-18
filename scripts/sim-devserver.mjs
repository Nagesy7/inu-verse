// Local test server for the sim proofs: serves the game statically and answers /api/sim-log + /api/sim-audit with the
// real handlers on an in-memory store (no Upstash, nothing persisted). PORT=8672 node scripts/sim-devserver.mjs
import http from 'node:http'; import { readFile } from 'node:fs/promises'; import { extname, join, normalize } from 'node:path';
import log from '../api/sim-log.js'; import audit from '../api/sim-audit.js'; import { memoryStore } from '../src/sim/anchor.js';
const root = new URL('..', import.meta.url).pathname, kv = memoryStore(), PORT = Number(process.env.PORT || 8672);
const TYPES = { '.html': 'text/html', '.js': 'text/javascript', '.mjs': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.svg': 'image/svg+xml', '.ttf': 'font/ttf', '.woff2': 'font/woff2', '.mp3': 'audio/mpeg', '.ogg': 'audio/ogg', '.wav': 'audio/wav', '.webp': 'image/webp' };
http.createServer(async (req, res) => { const path = new URL(req.url, 'http://x').pathname;
  if (path === '/api/sim-log') { let b = ''; for await (const c of req) b += c; req.body = b || undefined; return log(req, res, kv); }
  if (path === '/api/sim-audit') return audit(req, res);
  if (path.startsWith('/api/')) { res.statusCode = 404; return res.end('{}'); }
  const f = normalize(join(root, path.endsWith('/') ? path + 'index.html' : path)); if (!f.startsWith(root)) { res.statusCode = 403; return res.end(); }
  try { const data = await readFile(f); res.setHeader('content-type', TYPES[extname(f)] || 'application/octet-stream'); res.end(data); } catch { res.statusCode = 404; res.end('not found'); }
}).listen(PORT, () => console.log('sim dev server on http://localhost:' + PORT));
