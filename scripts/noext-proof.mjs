// No-extension launch proof at phone landscape 844x390. Local static server + real api handlers (memory store, real Solana RPC
// for balance + build + dry-run simulation). A stand-in Phantom extension is injected for the connected screenshots; it never
// signs (it rejects), so nothing is ever sent on-chain.  Usage: node scripts/noext-proof.mjs [live]
import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path'; import { chromium } from 'playwright';
import { makeHandler, memoryStore } from '../api/coins.js'; import { makeLaunchHandler } from '../api/launch.js'; import { publicConfig } from '../api/config.js';
const LIVE = process.argv[2] === 'live', BASE = LIVE ? 'https://inu-verse-tawny.vercel.app' : 'http://localhost:8656';
const store = memoryStore(), coins = makeHandler({ env: {}, store }), launch = makeLaunchHandler({ env: {}, store }); let APPID = '';
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.json': 'application/json', '.ttf': 'font/ttf', '.webp': 'image/webp' };
const srv = LIVE ? null : http.createServer(async (req, res) => { const u = req.url;
  if (u.startsWith('/api/')) { let b = ''; for await (const c of req) b += c; req.body = b ? JSON.parse(b) : {}; req.query = Object.fromEntries(new URL(u, 'http://x').searchParams);
    if (u.startsWith('/api/config')) { res.setHeader('content-type', 'application/json'); return res.end(JSON.stringify(publicConfig({ PHANTOM_APP_ID: APPID }))); }
    return (u.startsWith('/api/coins') ? coins : launch)(req, res); }
  let f = path.join(process.cwd(), decodeURIComponent(u.split('?')[0])); if (f.endsWith('/')) f += 'index.html'; if (!fs.existsSync(f)) { res.statusCode = 404; return res.end(); }
  res.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); res.end(fs.readFileSync(f)); }).listen(8656);
const WHALE = '5tzFkiKscXHK5ZXCGbXZxdw7gTjjD1mBwuoFbhUvuAi9'; // display-only stand-in address with SOL (read-only balance)
const b = await chromium.launch(); const errs = [];
async function page(fakeExt) { const p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  p.on('pageerror', (e) => errs.push(e.message)); p.on('console', (m) => m.type() === 'error' && errs.push(m.text()));
  if (fakeExt) await p.addInitScript((pk) => { const publicKey = { toString: () => pk, toBase58: () => pk };
    window.phantom = { solana: { isPhantom: true, publicKey, connect: async () => ({ publicKey }), signTransaction: async () => { throw new Error('User rejected the request.'); }, on() {}, off() {} } }; }, fakeExt);
  await p.goto(BASE + '/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(1500); await p.click('#start'); await p.waitForTimeout(2500);
  await p.evaluate(() => globalThis.__inu.open('launch', { tab: 'launch' })); await p.waitForTimeout(2500); return p; }
const pre = LIVE ? 'proof/noext-live-' : 'proof/noext-';
let p = await page(null); await p.screenshot({ path: pre + '1-wallet-coming-soon.png' });
const soon = await p.evaluate(() => [...document.querySelectorAll('[data-nx=google],[data-nx=apple]')].map((x) => x.disabled && /coming soon/i.test(x.textContent)));
console.log('social buttons coming soon:', JSON.stringify(soon)); await p.close();
p = await page(WHALE); if (await p.$('[data-nx=extension]')) await p.click('[data-nx=extension]'); await p.waitForTimeout(4000); await p.screenshot({ path: pre + '2-connected-topup-qr.png' });
const bal = await p.evaluate(() => document.querySelector('#nx-bal')?.innerText); console.log('balance line:', JSON.stringify(bal));
await p.evaluate(() => document.querySelector('#nx-image').scrollIntoView());
await p.fill('#nx-name', 'Shiba Star'); await p.fill('#nx-symbol', 'star'); await p.fill('#nx-desc', 'A cosy Inu Verse test coin (proof run, never sent).'); await p.fill('#nx-twitter', 'https://x.com/inuverse');
await p.setInputFiles('#nx-image', 'assets/shiba-golden.png'); await p.waitForTimeout(800); await p.fill('#nx-dev', '0.05'); await p.dispatchEvent('#nx-dev', 'change'); await p.waitForTimeout(400);
await p.check('#nx-ack'); await p.evaluate(() => document.querySelector('#nx-name').scrollIntoView()); await p.waitForTimeout(300); await p.screenshot({ path: pre + '3-form-sol-devbuy.png' });
await p.evaluate(() => document.querySelector('.warnbox').scrollIntoView()); await p.waitForTimeout(200); await p.screenshot({ path: pre + '4-safety-and-launch.png' });
await p.click('#nx-go'); await p.waitForFunction(() => !document.querySelector('#nx-go')?.textContent.includes('Launching'), null, { timeout: 60000 }).catch(() => {});
await p.waitForTimeout(500); await p.evaluate(() => document.querySelector('.prog')?.scrollIntoView()); await p.screenshot({ path: pre + '5-built-dryrun-then-wallet-reject.png' });
console.log('after launch click:', JSON.stringify(await p.evaluate(() => document.querySelector('.prog')?.parentElement?.innerText.slice(-260))));
await p.selectOption('#nx-pair', 'KIBBLE'); await p.waitForTimeout(500); await p.evaluate(() => document.querySelector('#nx-pair').scrollIntoView()); await p.screenshot({ path: pre + '6-kibble-pair.png' });
await p.evaluate(() => document.querySelector('.noext .full:last-child').scrollIntoView()); await p.screenshot({ path: pre + '7-your-wallet-your-keys.png' });
await p.evaluate(() => document.querySelector('#noext + details').open = true); await p.evaluate(() => document.querySelector('#noext + details').scrollIntoView()); await p.waitForTimeout(1500); await p.screenshot({ path: pre + '8-pumpfun-page-guide.png' });
await p.close();
if (!LIVE) { APPID = '00000000-demo-demo-demo-000000000000'; p = await b.newPage({ viewport: { width: 844, height: 390 }, hasTouch: true, isMobile: true, deviceScaleFactor: 2 });
  await p.goto(BASE + '/'); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); }); await p.reload(); await p.waitForTimeout(1500); await p.click('#start'); await p.waitForTimeout(2000);
  await p.evaluate(() => globalThis.__inu.open('launch', { tab: 'launch' })); await p.waitForTimeout(3000); await p.screenshot({ path: pre + '9-social-enabled-when-app-id-set.png' }); await p.close(); }
console.log('errors:', JSON.stringify(errs.filter((e) => !/kibble-pay|net::ERR|Failed to load resource/.test(e)))); console.log('all console errors:', JSON.stringify(errs)); await b.close(); srv?.close();
