// Shiba Sips Café restaurant proof: tap a chair -> menu panel, order (Bones deducted), Server Sesame serves the dish to your
// table, eat animation + chat bubble, plate cleared; refused with too few Bones; order counter; townsfolk with townai 'eat'
// seated and eating; a barista shift whose orders come from the seated customers. Desktop + 3 phone landscape sizes.
//   URL=https://inu-verse-tawny.vercel.app/ OUT=proof node scripts/cafe-proof.mjs
import { chromium } from 'playwright'; import fs from 'fs';
const URL = process.env.URL || 'http://127.0.0.1:8644/', OUT = process.env.OUT || 'proof'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(), res = { url: URL, runs: {} }, errs = [];
const sleep = (p, ms) => p.waitForTimeout(ms);
async function boot(w, h, touch) { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: touch }); const p = await ctx.newPage();
  p.on('pageerror', (e) => errs.push(`${w}x${h} ${e.message}`));
  await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); localStorage.setItem('inuverse.mp.off', '1'); }); await p.reload(); await sleep(p, 900); await p.click('#start'); await sleep(p, 2000);
  await p.evaluate(() => { globalThis.__guide?.endTour?.('skipped'); __inu.setHour(12); document.querySelectorAll('.toast').forEach((t) => t.remove()); }); await sleep(p, 1500); return { ctx, p }; }
const st = (p) => p.evaluate(() => __cafe.st);
const waitFor = async (p, fn, arg, ms = 20000) => { const t0 = Date.now(); while (Date.now() - t0 < ms) { if (await p.evaluate(fn, arg)) return true; await sleep(p, 150); } return false; };
for (const [w, h, touch] of [[1280, 800, false], [844, 390, true], [667, 375, true], [750, 342, true]]) { const tag = `${w}x${h}`, r = res.runs[tag] = {}, { ctx, p } = await boot(w, h, touch);
  r.townEaters = await p.evaluate(() => Object.values(__inu.state?.town?.folk || globalThis.__townDbg?.() || {}).filter((f) => f.act === 'eat').map((f) => f.name));
  // walk in through the café door (enter the room) the normal way
  await p.evaluate(() => __goScene('cafe', 'door')); await sleep(p, 1200);
  const s0 = await st(p); r.diners = s0.diners; r.seatedEaters = s0.diners.filter((d) => d.folk).map((d) => d.name);
  // tap-to-walk to a free chair: the menu opens when you sit
  const seat = await p.evaluate(() => { const s = __cafe.CP.freeSeat(); return s && { id: s.id, tx: s.tx, ty: s.ty }; });
  await p.evaluate(([x, y]) => __roomTap(x, y), [seat.tx, seat.ty]); r.menuOpened = await waitFor(p, () => !document.getElementById('panel').hidden && !!document.getElementById('dn-grid'), null, 8000);
  r.menuItems = await p.evaluate(() => document.querySelectorAll('#dn-grid [data-dish]').length);
  await sleep(p, 300); await p.screenshot({ path: `${OUT}/cafe-menu-${tag}.png` });
  // refused with too few Bones
  await p.evaluate(() => { __inu.state.bones = 3; });
  await p.evaluate((id) => __inu.open('diner', { seat: id }), seat.id); await p.click('#dn-grid [data-dish="salmonBento"]'); await sleep(p, 200);
  r.refused = { bonesAfter: (await st(p)).bones, toast: await p.evaluate(() => [...document.querySelectorAll('.toast')].map((t) => t.textContent).pop() || null), ticket: (await st(p)).me };
  // real order
  await p.evaluate(() => { __inu.state.bones = 100; }); await p.evaluate((id) => __inu.open('diner', { seat: id }), seat.id); await p.click('#dn-grid [data-dish="pupLatte"]'); await sleep(p, 150);
  const s1 = await st(p); r.order = { bonesBefore: 100, bonesAfter: s1.bones, deducted: 100 - s1.bones, me: s1.me, diner: s1.diner };
  r.served = await waitFor(p, () => __cafe.st.tickets.some((t) => t.who === 'me' && t.phase === 'eat'), null, 30000);
  await sleep(p, 900); r.toast = await p.evaluate(() => [...document.querySelectorAll('.toast, .room-say, .say')].map((t) => t.textContent).filter(Boolean).slice(-2)); await p.screenshot({ path: `${OUT}/cafe-served-eating-${tag}.png` });
  r.cleared = await waitFor(p, () => !__cafe.st.me && __cafe.st.cleared > 0, null, 45000); await p.screenshot({ path: `${OUT}/cafe-cleared-${tag}.png` });
  r.favourite = await p.evaluate(() => __inu.state.diner);
  if (w === 1280) { // order counter with the keyboard: walk there and press E
    await p.evaluate(() => { __doorTest.reset(12.5 * 32, 4.5 * 32, 'left', 'cafe'); }); await sleep(p, 300); await p.keyboard.down('ArrowLeft'); await waitFor(p, () => __room().tx === 10, null, 3000); await p.keyboard.up('ArrowLeft'); await sleep(p, 250); await p.keyboard.press('e'); await sleep(p, 300);
    r.counterMenu = await p.evaluate(() => !!document.getElementById('dn-grid')); await p.click('#dn-grid [data-dish="honeyScone"]'); await sleep(p, 300); r.counterOrder = await st(p);
    r.counterSeated = await waitFor(p, () => { const s = __cafe.CP.seatOf(__cafe.st.me?.seat); return s && Math.hypot(__room().x - (s.tx + 0.5) * 32, __room().y - (s.ty + 0.5) * 32) < 18; }, null, 8000);
    await waitFor(p, () => __cafe.st.tickets.some((t) => t.phase === 'eat' && t.who !== 'me'), null, 15000); await p.screenshot({ path: `${OUT}/cafe-diners-eating-${tag}.png` });
    // shift alongside the customers: walk to the shift counter, start, orders carry seated customers' names
    await waitFor(p, () => !__cafe.st.me, null, 25000);
    await p.evaluate(() => __roomTap(6, 4)); r.shiftPanel = await waitFor(p, () => !!document.getElementById('cstart'), null, 8000); await p.click('#cstart');
    await waitFor(p, () => document.querySelectorAll('#orders .order').length >= 2, null, 12000);
    r.shiftOrders = await p.evaluate(() => [...document.querySelectorAll('#orders .order b')].map((e) => e.textContent)); r.shiftDiners = (await st(p)).diners.map((d) => ({ name: d.name, waiting: d.waiting }));
    await p.screenshot({ path: `${OUT}/cafe-shift-with-customers-${tag}.png` });
    // serve one order correctly -> that customer gets the dish at their table
    const ok = await p.evaluate(() => { const o = document.querySelector('#orders .order'); for (const id of o.dataset.items.split(',')) document.querySelector(`#menu [data-item="${id}"]`).click(); o.click(); return o.querySelector('b').textContent; });
    r.shiftServedTo = ok; await waitFor(p, (n) => __cafe.st.tickets.some((t) => t.who === n && t.phase === 'eat'), ok, 12000); r.shiftDinerEating = (await st(p)).tickets.find((t) => t.who === ok) || null;
    await p.evaluate(() => { document.getElementById('panel').style.opacity = '0.25'; }); await p.screenshot({ path: `${OUT}/cafe-shift-served-customer-${tag}.png` }); await p.evaluate(() => { document.getElementById('panel').style.opacity = ''; }); }
  await ctx.close(); }
res.errors = errs; fs.writeFileSync(`${OUT}/cafe-results.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify(res, null, 1)); await b.close();
