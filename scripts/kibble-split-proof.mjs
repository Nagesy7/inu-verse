// Proof: $KIBBLE fee split on the coin card + Verified Launch breakdown + creator signing screen, and named wallets.
//   URL=https://inu-verse-tawny.vercel.app/ node scripts/kibble-split-proof.mjs
// Signing screen: a TEST FIXTURE wallet is injected into the page (public key only, it cannot sign); its signMessage never
// resolves, so the flow stops exactly at the signature prompt. Nothing is ever signed or sent.
import { chromium } from 'playwright';
import fs from 'node:fs';
const URL0 = (process.env.URL || 'http://localhost:8661/').replace(/\/?$/, '/'), VIEWS = [[844, 390], [667, 375], [1280, 800]];
const KIB = '4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump', log = [], L = (m) => { console.log(m); log.push(m); };
fs.mkdirSync('proof', { recursive: true });
const browser = await chromium.launch();
async function open(q, [w, h], wallet = null) {
  const mobile = w < 1000, ctx = await browser.newContext({ viewport: { width: w, height: h }, hasTouch: mobile, isMobile: mobile, deviceScaleFactor: mobile ? 2 : 1, timezoneId: 'Australia/Sydney', locale: 'en-AU' });
  if (wallet) await ctx.addInitScript((pk) => { // TEST FIXTURE wallet: exposes a public key only; signMessage records the request and never resolves
    const key = { toString: () => pk, toBase58: () => pk }; window.__fixtureSignRequests = [];
    window.phantom = { solana: { isPhantom: true, publicKey: null, connect: async () => { window.phantom.solana.publicKey = key; return { publicKey: key }; }, signMessage: (bytes) => { window.__fixtureSignRequests.push(new TextDecoder().decode(bytes)); return new Promise(() => {}); }, on() {} } }; }, wallet);
  const p = await ctx.newPage(); p.errs = []; p.on('pageerror', (e) => p.errs.push(e.message));
  await p.goto(URL0 + q, { waitUntil: 'domcontentloaded' }); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.mp.off', '1'); }); await p.reload({ waitUntil: 'domcontentloaded' });
  await p.waitForSelector('#start'); await p.waitForTimeout(500); await p.click('#start'); await p.waitForTimeout(1300); await skip(p); return p; }
async function skip(p) { for (let i = 0; i < 3; i++) { const sk = await p.$('#t-skip'); if (sk && await sk.isVisible()) { await sk.click(); await p.waitForTimeout(300); } } }
const shot = async (p, n) => { await skip(p); await p.evaluate(() => document.querySelectorAll('.toast').forEach((t) => t.remove())); const f = `proof/${n}.png`; await p.screenshot({ path: f }); L('saved ' + f); };
const label = (p, t) => p.evaluate((t) => { const d = document.createElement('div'); d.textContent = t; d.style.cssText = 'position:fixed;left:50%;bottom:4px;transform:translateX(-50%);z-index:99999;background:#ff00aa;color:#fff;font:bold 11px monospace;padding:3px 8px;border:2px solid #000;pointer-events:none'; document.body.appendChild(d); }, t);
const scrollTo = (p, sel) => p.evaluate((s) => document.querySelector(s)?.scrollIntoView({ block: 'start' }), sel);

for (const v of VIEWS) { const tag = `${v[0]}x${v[1]}`;
  // 1) $KIBBLE coin card: split (live)
  let p = await open('', v); await p.evaluate(() => __inu.open('launch', { tab: 'kibble' })); await p.waitForTimeout(2500);
  await scrollTo(p, '.kibsplit'); await p.waitForTimeout(300); await shot(p, `kibble-split-card-${tag}`);
  L(`[${tag}] card split: ${await p.evaluate(() => document.querySelector('.kibsplit')?.innerText.replace(/\s+/g, ' '))}`);
  L(`[${tag}] live $KIBBLE Verified slot (not opted in): "${await p.evaluate((m) => document.querySelector(`[data-vfslot="${m}"]`)?.innerText || '')}"`, KIB);
  const live = await p.evaluate(async (m) => { try { const [a, b] = await Promise.all([fetch('/api/coins?verified=' + m).then((r) => r.json()), fetch('/api/coins?declare=' + m).then((r) => r.json())]); return { verified: a.verified?.[m] ?? null, creator: b.creator, optIn: b.optIn, declaration: !!b.declaration }; } catch (e) { return String(e); } }, KIB);
  L(`[${tag}] live API: ${JSON.stringify(live)}`);
  // wallet names: President's Office, Luxury Autos, City Board prize wallet, Kennel wall
  await p.evaluate(() => __inu.open('mall', { cat: 'office' })); await p.waitForTimeout(1200); await shot(p, `wallet-names-office-${tag}`);
  L(`[${tag}] office: ${await p.evaluate(() => document.querySelector('.packhead .wname')?.innerText)}`);
  await p.evaluate(() => __inu.open('dealer', { dealer: 'luxauto' })); await p.waitForTimeout(900); await shot(p, `wallet-names-autos-${tag}`);
  await p.evaluate(() => __inu.open('city', { tab: 'pools' })); await p.waitForTimeout(3500); await scrollTo(p, '#prize-wallet-board'); await p.waitForTimeout(300); await shot(p, `wallet-names-prizewallet-${tag}`);
  L(`[${tag}] prize wallet: ${await p.evaluate(() => document.querySelector('#prize-wallet-board')?.innerText.split('\n').slice(0, 2).join(' | '))}`);
  if (p.errs.length) L(`[${tag}] page errors: ${p.errs.join(' | ')}`); await p.context().close();
  // 2) breakdown (TEST FIXTURE: $KIBBLE as it would look after the creator signs)
  p = await open('?verifiedpreview=1', v); await p.evaluate(() => __inu.open('launch', { tab: 'kibble' })); await p.waitForTimeout(1800);
  await p.evaluate((m) => { const d = document.querySelector(`[data-vfslot="${m}"] details`); if (d) { d.open = true; d.querySelector('li.vf-pass:nth-child(2)')?.scrollIntoView({ block: 'start' }); } }, KIB); await p.waitForTimeout(300);
  await label(p, 'TEST FIXTURE: $KIBBLE breakdown after the creator signs (not live yet)'); await shot(p, `kibble-split-breakdown-${tag}`);
  L(`[${tag}] fixture breakdown fee row: ${await p.evaluate((m) => document.querySelector(`[data-vfslot="${m}"] li:nth-child(2)`)?.innerText.replace(/\s+/g, ' '), KIB)}`);
  await p.context().close();
  // 3) signing screen: wrong wallet (President's Vault) is refused; on-chain creator (Kennel Chest) reaches the Phantom prompt
  for (const [who, pk] of [['wrongwallet', 'BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ'], ['creator', 'Akk3DdxeRRLZABfpkFKYoDBk6Zim5wNLRYemNFjv56fn']]) {
    p = await open('?kibblesign=1', v, pk); await p.waitForSelector('.ksign', { timeout: 15000 }).catch(() => {}); await p.waitForTimeout(1500);
    if (who === 'creator') { await scrollTo(p, '.ksign'); await label(p, 'TEST FIXTURE wallet (public key only): nothing is signed'); await shot(p, `kibble-split-optin-start-${tag}`); }
    await p.evaluate(() => document.querySelector('[data-ks="connect"]')?.click()); await p.waitForTimeout(800);
    const sign = await p.$('[data-ks="sign"]'); const disabled = sign ? await sign.isDisabled() : null;
    if (who === 'creator' && sign && !disabled) { await sign.click(); await p.waitForTimeout(800); }
    await p.evaluate(() => (document.querySelector('.ksmsg') || document.querySelector('.ksign .bad') || document.querySelector('.ksign'))?.scrollIntoView({ block: 'center' })); await p.waitForTimeout(300);
    await label(p, who === 'creator' ? 'TEST FIXTURE wallet: stopped at the Phantom "Sign message" prompt, nothing signed' : 'TEST FIXTURE wallet: President\'s Vault is not the on-chain creator'); await shot(p, `kibble-split-optin-${who}-${tag}`);
    const req = await p.evaluate(() => window.__fixtureSignRequests || []);
    L(`[${tag}] ${who}: sign button disabled=${disabled} · sign requests=${req.length} · status="${await p.evaluate(() => (document.querySelector('[data-ks="sign"]')?.innerText || '') + ' ' + (document.querySelector('.ksign .bad')?.innerText || ''))}"`);
    if (req.length) L(`[${tag}] message at the prompt:\n${req[0]}`);
    if (p.errs.length) L(`[${tag}] page errors: ${p.errs.join(' | ')}`); await p.context().close(); } }
fs.writeFileSync('proof/kibble-split-log.txt', log.join('\n') + '\n');
await browser.close();
