// Phase 4 proof: the courthouse in the world, the court panel (cases, a trial with its exhibits, a dismissal with its
// refund, an upheld verdict, a walk-out, the 90 s cap), the bench + rules, and the ☰ menu fix checked on every panel at
// every phone size. URL=http://localhost:8672/ OUT=proof node scripts/sim4-proof.mjs   (ONLY=desktop,667x375  TAG=-x)
// The fake clock starts 30 minutes behind real time (the anchor refuses entries from the future) and only skips cooldowns.
import { chromium } from 'playwright'; import { writeFileSync, mkdirSync } from 'node:fs';
const URL = process.env.URL || 'http://localhost:8672/', OUT = (process.env.OUT || 'proof') + '/sim4-', TAG = process.env.TAG || '', ONLY = process.env.ONLY, b = await chromium.launch(), errs = [], notes = [], panels = {};
mkdirSync(process.env.OUT || 'proof', { recursive: true });
const VIEWS = [['desktop', { width: 1280, height: 800 }, false], ['667x375', { width: 667, height: 375 }, true], ['750x342', { width: 750, height: 342 }, true], ['844x390', { width: 844, height: 390 }, true]].filter((v) => !ONLY || ONLY.split(',').includes(v[0]));
const KINDS = ['arcade', 'bank', 'biz', 'bizboard', 'building', 'bureau', 'cafe', 'cars', 'chapel', 'city', 'clubhouse', 'community', 'dailybone', 'dealer', 'diner', 'drink', 'engage', 'farm', 'fashion', 'friends', 'furn', 'garage', 'help', 'hubgate', 'job', 'kennel', 'kibble', 'kibblemood', 'launch', 'limo', 'lot', 'mail', 'mall', 'matchmaker', 'npcrules', 'packs', 'pets', 'plot', 'raid', 'rivals', 'salon', 'shop', 'square', 'stall', 'visit', 'wardrobe', 'zoomies'];
const TABS = [['bureau', { tab: 'report' }], ['bureau', { tab: 'wallet' }], ['bureau', { tab: 'precinct' }], ['bureau', { tab: 'rangers' }], ['bureau', { tab: 'court' }]];
for (const [name, viewport, phone] of VIEWS) { try { await runView(name, viewport, phone); } catch (e) { errs.push(`${name} proof step failed: ${e.message.split('\n')[0]}`); } }
async function runView(name, viewport, phone) {
  const ctx = await b.newContext({ viewport, isMobile: phone, hasTouch: phone, deviceScaleFactor: phone ? 2 : 1 }), page = await ctx.newPage();
  page.on('pageerror', (e) => errs.push(name + ': ' + e.message)); page.on('console', (m) => { if (m.type() === 'error' && !/Failed to load resource|ERR_|net::/.test(m.text())) errs.push(name + ' console: ' + m.text()); });
  await page.clock.install({ time: Date.now() - 30 * 60e3 }); await page.goto(URL); await page.evaluate(() => localStorage.clear()); await page.reload(); await page.waitForTimeout(1200); await page.click('#start').catch(() => {}); await page.waitForTimeout(1200); await page.getByText(/skip tour/i).first().click({ timeout: 3000 }).catch(() => {}); await page.waitForTimeout(400);
  await page.evaluate(() => { __inu.setHour(11); __inu.setRain?.(0); });
  const put = (x, y, cam = true) => page.evaluate(([x, y, cam]) => { const s = __inu.state; s.player.x = x * 32; s.player.y = y * 32; if (cam) globalThis.__camLock = { x: x * 32, y: y * 32 }; }, [x, y, cam]);
  const close = () => page.evaluate(() => document.querySelector('#panel-close')?.click()), shot = async (k) => { await page.waitForTimeout(400); return page.screenshot({ path: `${OUT}${k}-${name}${TAG}.png` }); };
  const open = (o) => page.evaluate((o) => __inu.open('bureau', o), o), txt = (s) => page.evaluate((s) => document.querySelector(s)?.innerText.replace(/\s+/g, ' ') || 'none', s);
  // 1) the ☰ menu vs. the close button, on every panel (phones: all of them; desktop: the sim tabs)
  if (phone || name === 'desktop') { const world = phone ? await page.evaluate(async () => { const W = await import('/src/world.js'), seen = new Set(), out = []; // every world door/desk, opened the way interact() opens it
      for (const it of W.interactables(__inu.state)) { let a = null; const k = it.kind;
        if (k === 'building') a = [it.id, {}]; else if (k === 'plot') a = ['plot', { plotId: it.id }]; else if (k === 'stall') a = ['launch', { sel: it.id }]; else if (k === 'mall' && it.cat === 'car') a = ['dealer', { dealer: 'luxauto' }];
        else if (k === 'mall' && it.cat === 'pets') a = ['pets', {}]; else if (k === 'mall' && it.cat?.startsWith('furn_')) a = ['furn', { store: it.cat.slice(5) }]; else if (k === 'mall') a = ['mall', { cat: it.cat, store: it.id }];
        else if (k === 'field') a = ['field', { i: it.i }]; else if (k === 'farm') a = ['farm', { id: it.id }]; else if (k === 'lot') a = ['lot', { id: it.id }]; else if (k === 'biz') a = ['bizboard', {}]; else if (['bank', 'matchmaker', 'chapel'].includes(k)) a = [k, {}];
        if (a) { const key = JSON.stringify(a); if (!seen.has(key)) { seen.add(key); out.push(a); } } } return out; }) : [];
    const list = phone ? [...KINDS.filter((k) => !['arcade', 'farm', 'furn', 'lot', 'plot'].includes(k)).map((k) => [k, {}]), ...world, ...TABS] : TABS, res = [];
    for (const [k, o] of list) { const r = await page.evaluate(([k, o]) => { try { __inu.open(k, o); } catch (e) { return { k, err: String(e.message).slice(0, 60) }; }
        const p = document.getElementById('panel'); if (!p || p.hidden) return { k, opened: false }; if (!document.getElementById('panel-body')?.children.length) return { k, opened: false, note: 'empty (needs a world context)' };
        const c = document.getElementById('panel-close'), r = c.getBoundingClientRect(), hit = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2), m = document.getElementById('menu-btn');
        const mr = m && getComputedStyle(m).display !== 'none' ? m.getBoundingClientRect() : null, over = !!(mr && !(mr.right <= r.left || mr.left >= r.right || mr.bottom <= r.top || mr.top >= r.bottom));
        return { k: k + (Object.keys(o).length ? ':' + Object.values(o).join('/') : ''), opened: true, closeOnTop: hit === c || c.contains(hit), menuShown: !!mr, menuOverClose: over, close: [Math.round(r.left), Math.round(r.top), Math.round(r.width)] }; }, [k, o]);
      if (r.opened && ['bank', 'wardrobe', 'mall', 'help'].includes(k) && !o.tab) await shot(`panels-${k}`); if (r.opened && o.tab === 'court') await shot('panels-court');
      await close(); await page.waitForTimeout(60); if (await page.evaluate(() => !document.getElementById('panel').hidden)) await page.evaluate(() => document.querySelector('#panel-close')?.click()); res.push(r); }
    panels[name] = res; const opened = res.filter((r) => r.opened), bad = opened.filter((r) => !r.closeOnTop || r.menuOverClose);
    notes.push(`${name} panels: ${opened.length} opened, close button on top in ${opened.filter((r) => r.closeOnTop).length}, ☰ shown over a panel ${opened.filter((r) => r.menuShown).length}, ☰ covering close ${opened.filter((r) => r.menuOverClose).length}${bad.length ? ' BAD: ' + bad.map((r) => r.k).join(',') : ''}`);
    const back = await page.evaluate(() => { const m = document.getElementById('menu-btn'); return !!m && getComputedStyle(m).display !== 'none'; }); notes.push(`${name} ☰ back after closing: ${back}`); }
  // 2) the courthouse in the world
  await put(43.5, 74.6, false); await page.evaluate(() => { globalThis.__camLock = { x: 43.5 * 32, y: 71.2 * 32 }; }); await page.waitForTimeout(1500); await shot('courthouse');
  // 3) the court panel before joining, then join + earn a few wages at the Bureau desk
  await open({ tab: 'court' }); await page.waitForTimeout(700); await shot('court-notjoined'); await page.click('[data-join]'); await page.waitForTimeout(400); await page.click('[data-c="bench"]'); await page.waitForTimeout(500); await shot('court-bench'); await page.click('[data-c="rules"]'); await page.waitForTimeout(200); await shot('court-rules'); await close();
  for (let k = 0; k < 2; k++) { await open({ tab: 'wallet' }); await page.waitForTimeout(500); await page.click('[data-shift]');
    await page.evaluate(() => { for (const tr of document.querySelectorAll('#pab-shift [data-i]')) { const c = tr.querySelectorAll('code'); if (c[0].textContent !== c[1].textContent) { tr.click(); return; } } }); await page.waitForTimeout(400); await close(); await page.clock.fastForward(3 * 60e3 + 1000); await page.waitForTimeout(300); }
  // 4) two citations: one right under an officer's nose, one from 4+ tiles away (the patrol decides who cites)
  const stand = (want) => page.evaluate(async (want) => { const m = await import('/src/sim/force.js'), cops = m.officersAt(Date.now() / 1000).filter((o) => o.force === 'police'); let best = null;
    for (let tx = 2; tx < 28; tx++) { const ds = cops.map((o) => Math.hypot(o.x - tx - 0.5, o.y - 44.5)).sort((a, b) => a - b), d = ds[0]; if (want === 'close' ? d < 2.5 : d > 4.35 && d < 4.85) { best = tx; break; } }
    if (best != null) { __inu.state.player.x = (best + 0.5) * 32; __inu.state.player.y = 44.5 * 32; globalThis.__camLock = { x: __inu.state.player.x, y: __inu.state.player.y }; } return best; }, want);
  const cited = async (label, want) => { for (let i = 0; i < 80; i++) { await stand(want); await page.waitForTimeout(100); if (await page.evaluate(() => /Warning|Citation/.test(document.querySelector('#pab-notice:not([hidden])')?.innerText || ''))) break; }
    notes.push(`${name} ${label}: ${await txt('#pab-notice:not([hidden])')}`); await put(10.5, 46.5); await page.evaluate(() => document.querySelector('#pab-notice [data-k="x"]')?.click()); await page.clock.fastForward(61000); await page.waitForTimeout(300); };
  await cited('citation 1 (close)', 'close'); await cited('citation 2 (4+ tiles)', 'far'); await page.clock.fastForward(4000); await page.waitForTimeout(2500);
  // 5) the docket, a walk-out, a trial with its exhibits, a dismissal + refund, an upheld verdict
  await open({ tab: 'court' }); await page.waitForTimeout(2500); await shot('court-cases'); notes.push(`${name} docket: ${await txt('#pab-body')}`.slice(0, 420));
  const seqs = await page.evaluate(() => [...document.querySelectorAll('[data-try]')].map((b) => +b.dataset.try)); notes.push(`${name} contestable: ${seqs.join(', ')}`);
  if (seqs.length < 2) { errs.push(`${name}: expected 2 contestable records, got ${seqs.length}`); await ctx.close(); return; }
  const [far, near] = seqs; // newest first
  await page.click(`[data-try="${near}"]`); await page.waitForTimeout(500); await page.click('[data-out]'); await page.waitForTimeout(300); notes.push(`${name} walk out: ${(await txt('.ct-rule')).slice(0, 160)}`); await shot('court-walkout');
  await page.click(`[data-try="${far}"]`); await page.waitForTimeout(600); await shot('court-trial'); await page.locator('#ct-scene').evaluate((c) => c.scrollIntoView({ block: 'center' })); await page.waitForTimeout(150); await shot('court-scene'); await page.evaluate(() => { const l = document.querySelector('#pab-body .pab-list'); if (l) l.scrollTop = 1e4; }); await page.waitForTimeout(200); await shot('court-defence');
  notes.push(`${name} trial facts: ${(await txt('#pab-body')).slice(0, 300)}`); const bal0 = await page.evaluate(async () => (await import('/src/sim/simstate.js')).pawWallet().balance());
  await page.click('[data-g="sightline"]'); await page.waitForTimeout(800); await shot('court-dismissed'); const bal1 = await page.evaluate(async () => (await import('/src/sim/simstate.js')).pawWallet().balance());
  notes.push(`${name} verdict: ${(await txt('.ct-rule')).slice(0, 260)} | balance ${bal0} -> ${bal1}`);
  await page.click(`[data-try="${near}"]`); await page.waitForTimeout(500); await page.click('[data-g="sightline"]'); await page.waitForTimeout(600); await shot('court-upheld'); notes.push(`${name} wrong defence: ${(await txt('.ct-rule')).slice(0, 200)}`);
  for (let i = 0; i < 3; i++) { await page.clock.fastForward(3000); await page.waitForTimeout(1500); } notes.push(`${name} anchored after verdicts: ${await page.evaluate(async () => JSON.stringify((({ server, unsynced, anchoredSeq, balance, verdictsToday }) => ({ server, unsynced, anchoredSeq, balance, verdictsToday }))((await import('/src/sim/simstate.js')).pawWallet().state())))}`);
  await close(); await page.waitForTimeout(300); await open({ tab: 'court' }); await page.waitForTimeout(1500); await shot('court-after'); notes.push(`${name} docket after: ${(await txt('#pab-body')).slice(0, 360)}`); await close();
  // 6) the 90 s cap (desktop): a third citation, open its trial, let the clock run out
  if (name === 'desktop') { await page.clock.fastForward(61000); await cited('citation 3 (close)', 'close'); await page.clock.fastForward(4000); await page.waitForTimeout(2500); await open({ tab: 'court' }); await page.waitForTimeout(1500);
    const s3 = await page.evaluate(() => +document.querySelector('[data-try]')?.dataset.try || 0); if (s3) { await page.click(`[data-try="${s3}"]`); await page.waitForTimeout(400); for (let i = 0; i < 92; i++) await page.clock.fastForward(1000); await page.waitForTimeout(800); notes.push(`desktop time cap: ${(await txt('.ct-rule')).slice(0, 160)}`); await shot('court-timecap'); } else notes.push('desktop time cap: no third record'); await close(); }
  await ctx.close();
}
writeFileSync(`${OUT}panels${TAG}.json`, JSON.stringify(panels, null, 1));
try { const r = await fetch(new globalThis.URL('/api/sim-audit', URL)); if (r.ok) { const j = await r.json(); writeFileSync(`${OUT}report${TAG}.json`, JSON.stringify(j, null, 2)); notes.push(`report JSON: ${j.summary.checks.pass}/12 checks, findings ${JSON.stringify(j.summary.findings)}; check 7 scope ${j.checks[6].scope}, check 11 scope ${j.checks[10].scope}`); } else notes.push('report JSON: HTTP ' + r.status); } catch (e) { notes.push('report JSON: ' + e.message); }
console.log(notes.join('\n')); console.log('errors', JSON.stringify(errs)); await b.close();
