// Start screen: every selectable option shows a distinct selected state (class + aria-pressed + computed style) and changes the
// preview or the caption under it; LOOK/You/Life rows (incl. Name on You) collapse to a summary after select/confirm and reopen via the section header; arrow-key focus
// moves between chips; the selected ring/badge never covers a row label; nothing clipped at 667x375, 750x342, 844x390.
import test from 'node:test'; import assert from 'node:assert/strict'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css', '.ttf': 'font/ttf', '.woff2': 'font/woff2' };
test('start screen options + phone landscape', { timeout: 180000 }, async () => {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); const ff = f.endsWith('/') ? f + 'index.html' : f; fs.readFile(ff, (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', MIME[path.extname(ff)] || 'application/octet-stream'); r.end(b); }); });
  await new Promise((ok) => srv.listen(0, ok)); const b = await chromium.launch(), url = `http://localhost:${srv.address().port}/`, errs = [];
  try { const p = await (await b.newContext({ viewport: { width: 1280, height: 800 } })).newPage(); p.on('pageerror', (e) => errs.push(e.message)); await p.goto(url); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(800);
    const r = await p.evaluate(async () => { globalThis.__titleFreeze = 1000; const raf = () => new Promise((ok) => requestAnimationFrame(() => requestAnimationFrame(ok))), out = [];
      const ensureOpen = (k) => { if (!document.querySelector(`#creator [data-k="${k}"]`)) document.querySelector(`#creator [data-toggle="${k}"]`)?.click(); };
      for (const tab of [...document.querySelectorAll('#creator [data-tab]')].map((e) => e.dataset.tab)) { document.querySelector(`#creator [data-tab="${tab}"]`).click();
        // discover keys from section headers (chips may be collapsed)
        const keys = [...document.querySelectorAll('#creator [data-toggle]')].map((e) => e.dataset.toggle);
        for (const k of keys) { ensureOpen(k); const vals = [...document.querySelectorAll(`#creator [data-k="${k}"]`)].map((e) => e.dataset.v);
          for (const v of vals) { const other = vals.find((x) => x !== v); ensureOpen(k);
            document.querySelector(`#creator [data-k="${k}"][data-v="${CSS.escape(other)}"]`).click(); await raf();
            // after select, section collapses — summary visible, chips gone
            const collapsed = !document.querySelector(`#creator [data-k="${k}"]`) && !!document.querySelector(`#creator .crow[data-sec="${k}"].collapsed`);
            const sum = document.querySelector(`#creator .crow[data-sec="${k}"] .csum`);
            ensureOpen(k); const pv0 = document.getElementById('preview').toDataURL(), c0 = document.getElementById('pv-cap').textContent;
            document.querySelector(`#creator [data-k="${k}"][data-v="${CSS.escape(v)}"]`).click(); await new Promise((ok) => setTimeout(ok, 380)); await raf();
            const collapsedAfter = !document.querySelector(`#creator [data-k="${k}"]`) && !!document.querySelector(`#creator .crow[data-sec="${k}"].collapsed`);
            ensureOpen(k);
            const e = document.querySelector(`#creator [data-k="${k}"][data-v="${CSS.escape(v)}"]`), o = document.querySelector(`#creator [data-k="${k}"][data-v="${CSS.escape(other)}"]`), sig = (x) => { const s = getComputedStyle(x); return [s.borderColor, s.boxShadow, s.transform].join('|'); };
            out.push({ k, v, sel: e.classList.contains('sel') && e.getAttribute('aria-pressed') === 'true' && !o.classList.contains('sel'), distinct: sig(e) !== sig(o), changed: document.getElementById('preview').toDataURL() !== pv0 || document.getElementById('pv-cap').textContent !== c0, collapsed: collapsed && collapsedAfter && !!sum }); } } }
      return out; });
    assert.ok(r.length >= 50, String(r.length)); for (const o of r) { assert.ok(o.sel, `${o.k}=${o.v} selected`); assert.ok(o.distinct, `${o.k}=${o.v} distinct style`); assert.ok(o.changed, `${o.k}=${o.v} preview/caption`); assert.ok(o.collapsed, `${o.k}=${o.v} collapses after select`); }
    // reopen + keyboard: expand pattern, arrow to next chip, arrow down opens markings
    await p.click('#creator [data-tab="look"]'); await p.click('#creator [data-toggle="pattern"]');
    await p.focus('#creator [data-k="pattern"]'); await p.keyboard.press('ArrowRight'); assert.equal(await p.evaluate(() => document.activeElement.dataset.v), 'spots');
    await p.keyboard.press('ArrowDown'); assert.equal(await p.evaluate(() => document.activeElement.dataset.k), 'markings');
    // collapse/reopen smoke: pick ears → collapsed summary → tap header → chips back
    await p.evaluate(() => { document.querySelector('#creator [data-toggle="ears"]')?.click(); });
    await p.click('#creator [data-k="ears"][data-v="floppy"]');
    assert.equal(await p.evaluate(() => !!document.querySelector('#creator .crow[data-sec="ears"].collapsed .csum')), true);
    assert.equal(await p.evaluate(() => !!document.querySelector('#creator [data-k="ears"]')), false);
    await p.click('#creator [data-toggle="ears"]');
    assert.equal(await p.evaluate(() => document.querySelector('#creator [data-k="ears"][data-v="floppy"]')?.classList.contains('sel')), true);
    // Name (You tab): open → type → Done/confirm → collapsed summary; reopen shows input
    await p.click('#creator [data-tab="you"]');
    assert.equal(await p.evaluate(() => !!document.querySelector('#creator .crow[data-sec="name"].collapsed .csum')), true);
    await p.click('#creator [data-toggle="name"]');
    assert.equal(await p.evaluate(() => !!document.querySelector('#creator #name')), true);
    await p.fill('#creator #name', 'Mochi');
    await p.click('#creator [data-name-done]');
    assert.equal(await p.evaluate(() => document.querySelector('#creator .crow[data-sec="name"].collapsed .csum-lab')?.textContent), 'Mochi');
    assert.equal(await p.evaluate(() => !!document.querySelector('#creator #name')), false);
    assert.equal(await p.evaluate(() => globalThis.__profile?.creator?.()?.choices?.name), 'Mochi');
    await p.click('#creator [data-toggle="name"]');
    assert.equal(await p.evaluate(() => document.querySelector('#creator #name')?.value), 'Mochi');
    await p.fill('#creator #name', 'Biscuit');
    await p.locator('#creator #name').press('Enter');
    assert.equal(await p.evaluate(() => document.querySelector('#creator .crow[data-sec="name"].collapsed .csum-lab')?.textContent), 'Biscuit');
    // Start uses creator.choices.name (no standalone #name outside creator when collapsed)
    assert.equal(await p.evaluate(() => !document.querySelector('#title > .title-card > .lbl #name') && !document.querySelector('.title-card > label.lbl')), true);
    for (const [w, h] of [[667, 375], [750, 342], [844, 390]]) { const q = await (await b.newContext({ viewport: { width: w, height: h }, hasTouch: true })).newPage(); await q.goto(url); await q.waitForTimeout(800);
      const c = await q.evaluate(() => { const card = document.querySelector('.title-card'), r = card.getBoundingClientRect(), bad = []; for (const e of card.querySelectorAll('button,input,canvas,h1')) { const x = e.getBoundingClientRect(); if (x.width && (x.left < r.left - 1 || x.right > r.right + 1)) bad.push(e.id || e.dataset.v || e.tagName); }
        const st = document.getElementById('start').getBoundingClientRect(), pv = document.getElementById('preview').getBoundingClientRect();
        // open one look row so chip/label overlap can be checked; collapsed rows skip
        document.querySelector('#creator [data-toggle="coat"]')?.click();
        const lap = []; for (const row of card.querySelectorAll('.crow.open')) { const l = row.querySelector('.clbl')?.getBoundingClientRect(), e = row.querySelector('.chip-o.sel'); if (!l || !e) continue; const x = e.getBoundingClientRect(), ext = e.classList.contains('sw') ? 3 : 8;
          if (x.left - 3 < l.right && x.right + ext > l.left && x.top - ext < l.bottom && x.bottom + 3 > l.top) lap.push(e.dataset.k); }
        return { lap, inView: r.left >= 0 && r.top >= 0 && r.right <= innerWidth + 0.5 && r.bottom <= innerHeight + 0.5, hScroll: card.scrollWidth > card.clientWidth + 1 || document.documentElement.scrollWidth > innerWidth + 1, bad, start: st.top >= 0 && st.bottom <= innerHeight, preview: pv.top >= 0 && pv.bottom <= innerHeight && pv.width > 50 }; });
      assert.ok(c.inView && !c.hScroll && !c.bad.length && c.start && c.preview && !c.lap.length, `${w}x${h} ${JSON.stringify(c)}`); }
    assert.deepEqual(errs, []);
  } finally { await b.close(); srv.close(); } });
