// Start screen: every selectable option shows a distinct selected state (class + aria-pressed + computed style) and changes the
// preview or the caption under it; arrow-key focus moves between chips; nothing clipped at 667x375, 750x342, 844x390.
import test from 'node:test'; import assert from 'node:assert/strict'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
test('start screen options + phone landscape', { timeout: 180000 }, async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); const ff = f.endsWith('/') ? f + 'index.html' : f; fs.readFile(ff, (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', MIME[path.extname(ff)] || 'application/octet-stream'); r.end(b); }); });
  await new Promise((ok) => srv.listen(0, ok)); const b = await chromium.launch(), url = `http://localhost:${srv.address().port}/`, errs = [];
  try { const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); p.on('pageerror', (e) => errs.push(e.message)); await p.goto(url); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
    const r = await p.evaluate(async () => { globalThis.__titleFreeze = 1000; const raf = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))), out = [];
      for (const tab of [...document.querySelectorAll('#creator [data-tab]')].map((e) => e.dataset.tab)) { document.querySelector(`#creator [data-tab="${tab}"]`).click();
        for (const k of [...new Set([...document.querySelectorAll('#creator [data-k]')].map((e) => e.dataset.k))]) { const vals = [...document.querySelectorAll(`#creator [data-k="${k}"]`)].map((e) => e.dataset.v);
          for (const v of vals) { const other = vals.find((x) => x !== v); document.querySelector(`#creator [data-k="${k}"][data-v="${CSS.escape(other)}"]`).click(); await raf(); const pv0 = document.getElementById('preview').toDataURL(), c0 = document.getElementById('pv-cap').textContent;
            document.querySelector(`#creator [data-k="${k}"][data-v="${CSS.escape(v)}"]`).click(); await new Promise((ok) => setTimeout(ok, 380)); await raf();
            const e = document.querySelector(`#creator [data-k="${k}"][data-v="${CSS.escape(v)}"]`), o = document.querySelector(`#creator [data-k="${k}"][data-v="${CSS.escape(other)}"]`), sig = (x) => { const s = getComputedStyle(x); return [s.borderColor, s.boxShadow, s.transform].join('|'); };
            out.push({ k, v, sel: e.classList.contains('sel') && e.getAttribute('aria-pressed') === 'true' && !o.classList.contains('sel'), distinct: sig(e) !== sig(o), changed: document.getElementById('preview').toDataURL() !== pv0 || document.getElementById('pv-cap').textContent !== c0 }); } } }
      return out; });
    assert.ok(r.length >= 50, String(r.length)); for (const o of r) { assert.ok(o.sel, `${o.k}=${o.v} selected`); assert.ok(o.distinct, `${o.k}=${o.v} distinct style`); assert.ok(o.changed, `${o.k}=${o.v} preview/caption`); }
    await p.click('#creator [data-tab="look"]'); await p.focus('#creator [data-k="pattern"]'); await p.keyboard.press('ArrowRight'); assert.equal(await p.evaluate(() => document.activeElement.dataset.v), 'spots'); await p.keyboard.press('ArrowDown'); assert.equal(await p.evaluate(() => document.activeElement.dataset.k), 'markings');
    for (const [w, h] of [[667, 375], [750, 342], [844, 390]]) { const q = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: true })).newPage(); await q.goto(url); await q.waitForTimeout(800);
      const c = await q.evaluate(() => { const card = document.querySelector('.title-card'), r = card.getBoundingClientRect(), bad = []; for (const e of card.querySelectorAll('button,input,canvas,h1')) { const x = e.getBoundingClientRect(); if (x.width && (x.left < r.left - 1 || x.right > r.right + 1)) bad.push(e.id || e.dataset.v || e.tagName); }
        const st = document.getElementById('start').getBoundingClientRect(), pv = document.getElementById('preview').getBoundingClientRect();
        return { inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5, hScroll: card.scrollWidth > card.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1, bad, start: st.top >= 0 && st.bottom <= innerHeight, preview: pv.top >= 0 && pv.bottom <= innerHeight && pv.width > 50 }; });
      assert.ok(c.inView && !c.hScroll && !c.bad.length && c.start && c.preview, `${w}x${h} ${JSON.stringify(c)}`); }
    assert.deepEqual(errs, []);
  } finally { await b.close(); srv.close(); } });
