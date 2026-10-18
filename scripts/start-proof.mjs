// Start screen (title / character create) proof: for EVERY selectable option (all tabs/rows/chips) select it and record
// whether its chip shows a distinct selected state (class + computed style differs from unselected), whether the preview
// canvas pixels change, and whether the preview caption changes; screenshot each row before/after; GIF cycling options;
// phone landscape clipping check at 667x375, 750x342, 844x390.
//   URL=https://inu-verse-tawny.vercel.app/ OUT=proof TAG=after node scripts/start-proof.mjs
import { chromium } from 'playwright'; import fs from 'fs'; import crypto from 'crypto'; import { execFileSync } from 'child_process';
const URL = process.env.URL || 'http://127.0.0.1:8644/', OUT = process.env.OUT || 'proof', TAG = process.env.TAG || 'after', GIF = process.env.GIF !== '0'; fs.mkdirSync(OUT, { recursive: true });
const b = await chromium.launch(), res = { url: URL, tag: TAG, options: [], phones: {} }, errs = [];
const boot = async (w, h, touch) => { const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 1, hasTouch: touch }); const p = await ctx.newPage(); p.on('pageerror', (e) => errs.push(`${w}x${h} ${e.message}`));
  await p.goto(URL); await p.evaluate(() => { localStorage.clear(); localStorage.setItem('inuverse.tour.v1', 'skipped:shots'); localStorage.setItem('inuverse.mp.off', '1'); }); await p.reload(); await p.waitForTimeout(1200); return { ctx, p }; };
// freeze the preview animation clock so pixel diffs only come from the option itself
const snap = (p) => p.evaluate(() => { globalThis.__titleFreeze = 1000; return new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => r(document.getElementById('preview').toDataURL())))); });
const hash = (s) => crypto.createHash('md5').update(s).digest('hex').slice(0, 10);
{ const { ctx, p } = await boot(1280, 800, false); const TMP = '/tmp/start-gif'; fs.rmSync(TMP, { recursive: true, force: true }); fs.mkdirSync(TMP); let n = 0;
  const tabs = await p.evaluate(() => [...document.querySelectorAll('#creator [data-tab]')].map((e) => e.dataset.tab));
  for (const tab of tabs) { await p.click(`#creator [data-tab="${tab}"]`); await p.waitForTimeout(150);
    const rows = await p.evaluate(() => [...document.querySelectorAll('#creator .crow')].map((r) => ({ k: r.querySelector('[data-k]').dataset.k, vals: [...r.querySelectorAll('[data-k]')].map((e) => e.dataset.v) })));
    for (const row of rows) { const first = await p.evaluate((k) => document.querySelector(`#creator [data-k="${k}"].sel`)?.dataset.v, row.k);
      const rowShot = async (name) => { const el = await p.$(`#creator [data-k="${row.k}"]`); const box = await p.evaluate((k) => { const r = document.querySelector(`#creator [data-k="${k}"]`).closest('.crow').getBoundingClientRect(), pv = document.getElementById('preview').getBoundingClientRect(); return { x: Math.min(r.left, pv.left) - 4, y: Math.min(r.top, pv.top) - 4, w: Math.max(r.right, pv.right) - Math.min(r.left, pv.left) + 8, h: Math.max(r.bottom, pv.bottom) - Math.min(r.top, pv.top) + 8 }; }, row.k);
        await p.screenshot({ path: name, clip: { x: Math.max(0, box.x), y: Math.max(0, box.y), width: Math.min(1280, box.w), height: Math.min(800, box.h) } }); void el; };
      await rowShot(`${OUT}/start-${TAG}-${row.k}-default.png`);
      for (const v of row.vals) { const base = await snap(p), cap0 = await p.evaluate(() => document.getElementById('pv-cap')?.textContent || '');
        const before = await p.evaluate(([k, v]) => { const e = document.querySelector(`#creator [data-k="${k}"][data-v="${CSS.escape(v)}"]`), cs = getComputedStyle(e); return { sel: e.classList.contains('sel'), st: [cs.borderColor, cs.backgroundColor, cs.transform, cs.boxShadow, cs.color].join('|') }; }, [row.k, v]);
        if (v === first) { await p.click(`#creator [data-k="${row.k}"][data-v="${v === row.vals[0] ? row.vals[1] : row.vals[0]}"]`); await p.waitForTimeout(80); }
        const base2 = await snap(p), cap1 = await p.evaluate(() => document.getElementById('pv-cap')?.textContent || '');
        await p.click(`#creator [data-k="${row.k}"][data-v="${v}"]`); await p.waitForTimeout(450);
        const after = await p.evaluate(([k, v]) => { const e = document.querySelector(`#creator [data-k="${k}"][data-v="${CSS.escape(v)}"]`), cs = getComputedStyle(e); const o = [...document.querySelectorAll(`#creator [data-k="${k}"]`)].find((x) => x !== e), co = o && getComputedStyle(o);
          return { sel: e.classList.contains('sel'), st: [cs.borderColor, cs.backgroundColor, cs.transform, cs.boxShadow, cs.color].join('|'), other: co ? [co.borderColor, co.backgroundColor, co.transform, co.boxShadow, co.color].join('|') : null, aria: e.getAttribute('aria-pressed') }; }, [row.k, v]);
        const pv = await snap(p), cap2 = await p.evaluate(() => document.getElementById('pv-cap')?.textContent || '');
        res.options.push({ tab, k: row.k, v, selected: after.sel, distinctStyle: after.st !== after.other, aria: after.aria, previewChanged: hash(pv) !== hash(base2), captionChanged: cap2 !== cap1, caption: cap2 });
        if (GIF && n < 400) await p.screenshot({ path: `${TMP}/f${String(n++).padStart(3, '0')}.png`, clip: await p.evaluate(() => { const r = document.querySelector('.title-card').getBoundingClientRect(); return { x: r.left, y: r.top, width: r.width, height: Math.min(r.height, 800 - r.top) }; }) });
        void base; void cap0; void before; }
      await rowShot(`${OUT}/start-${TAG}-${row.k}-selected.png`); } }
  if (GIF && n) execFileSync('ffmpeg', ['-y', '-loglevel', 'error', '-framerate', '3', '-i', `${TMP}/f%03d.png`, '-vf', 'scale=560:-1:flags=lanczos,split[a][b];[a]palettegen=max_colors=128[p];[b][p]paletteuse=dither=bayer', `${OUT}/start-${TAG}-cycle.gif`]);
  // keyboard focus ring + arrow navigation
  await p.click('#creator [data-tab="look"]'); await p.focus('#creator [data-k="pattern"]'); await p.keyboard.press('ArrowRight'); await p.waitForTimeout(100);
  res.keyboard = await p.evaluate(() => { const a = document.activeElement; return { k: a?.dataset?.k, v: a?.dataset?.v, outline: a ? getComputedStyle(a).outlineStyle + ' ' + getComputedStyle(a).outlineColor : null }; });
  await p.keyboard.press('Enter'); await p.waitForTimeout(200); res.keyboard.selectedAfterEnter = await p.evaluate(() => document.activeElement?.classList.contains('sel'));
  await p.screenshot({ path: `${OUT}/start-${TAG}-keyboard-focus.png` }); await p.screenshot({ path: `${OUT}/start-${TAG}-desktop.png` }); await ctx.close(); }
for (const [w, h] of [[667, 375], [750, 342], [844, 390]]) { const { ctx, p } = await boot(w, h, true); const tag = `${w}x${h}`;
  res.phones[tag] = await p.evaluate(() => { const card = document.querySelector('.title-card'), r = card.getBoundingClientRect(), out = [];
    for (const e of card.querySelectorAll('button, input, canvas, h1, .chip-o')) { const q = e.getBoundingClientRect(); if (!q.width) continue; if (q.left < r.left - 1 || q.right > r.right + 1) out.push((e.id || e.dataset.v || e.tagName) + ' x'); }
    return { card: [Math.round(r.left), Math.round(r.top), Math.round(r.right), Math.round(r.bottom)], inViewport: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5, hScroll: card.scrollWidth > card.clientWidth + 1, docHScroll: document.documentElement.scrollWidth > innerWidth + 1, clippedX: out, startVisible: (() => { const s = document.getElementById('start').getBoundingClientRect(); return s.bottom <= innerHeight && s.top >= 0; })() }; });
  await p.screenshot({ path: `${OUT}/start-${TAG}-phone-${tag}.png` }); for (const t of ['you', 'life']) { await p.tap(`#creator [data-tab="${t}"]`); await p.waitForTimeout(200); await p.screenshot({ path: `${OUT}/start-${TAG}-phone-${tag}-${t}.png` }); } await ctx.close(); }
res.errors = errs; const bad = res.options.filter((o) => !o.selected || !o.distinctStyle || !(o.previewChanged || o.captionChanged));
res.summary = { options: res.options.length, ok: res.options.length - bad.length, noVisibleChange: bad.map((o) => `${o.k}=${o.v}${!o.selected ? ' (not selected)' : ''}${!o.distinctStyle ? ' (no distinct style)' : ''}${!(o.previewChanged || o.captionChanged) ? ' (no preview/label change)' : ''}`) };
fs.writeFileSync(`${OUT}/start-${TAG}-results.json`, JSON.stringify(res, null, 1)); console.log(JSON.stringify({ summary: res.summary, keyboard: res.keyboard, phones: res.phones, errors: errs }, null, 1)); await b.close();
