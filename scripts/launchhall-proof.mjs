// Launch Hall proof at phone landscape 844x390: local static server + real api/coins handler (memory store, real DexScreener/RugCheck).
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { chromium } from 'playwright';
import { makeHandler, memoryStore } from '../api/coins.js';
const api = makeHandler({ env: {}, store: memoryStore() });
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.woff2': 'font/woff2', '.ttf': 'font/ttf', '.webp': 'image/webp' };
const srv = http.createServer(async (req, res) => { if (req.url.startsWith('/api/coins')) { let b = ''; for await (const c of req) b += c; req.body = b ? JSON.parse(b) : {}; req.query = Object.fromEntries(new URL(req.url, 'http://x').searchParams); return api(req, res); }
  let f = path.join(process.cwd(), decodeURIComponent(req.url.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); res.end(fs.readFileSync(f)); }).listen(8655);
const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
const errs = []; p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && !/kibble-pay|ERR_|net::|Failed to load resource/.test(m.text()) && errs.push(m.text()));
await p.goto('http://localhost:8655/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(1200); await p.click('#start'); await p.waitForTimeout(2500);
for (const tab of ['kibble', 'launch', 'board', 'practice']) { await p.evaluate((t) => globalThis.__inu.open('launch', { tab: t }), tab); await p.waitForTimeout(tab === 'practice' ? 1200 : 4000); await p.screenshot({ path: `proof/launchhall-${tab}.png` }); }
const txt = await p.evaluate(() => { globalThis.__inu.open('launch', { tab: 'kibble' }); return new Promise((r) => setTimeout(() => r(document.querySelector('.rstats')?.innerText), 3000)); });
console.log('kibble stats:', JSON.stringify(txt)); console.log('errors:', JSON.stringify(errs)); await b.close(); srv.close();
