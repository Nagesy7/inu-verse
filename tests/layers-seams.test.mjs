// Renders every coat x view x walk frame x outfit (each item alone + full combos) through the real layered pipeline in
// headless Chromium and fails on any hole (background showing through), interior alpha dip, or dark seam line where layers meet.
import test from 'node:test'; import assert from 'node:assert/strict'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css', '.ttf': 'font/ttf' };
export async function auditAll({ legacy = false } = {}) {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f.endsWith('/') ? f + 'index.html' : f, (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); r.end(b); }); });
  await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port, b = await chromium.launch(), p = await b.newPage();
  await p.goto(`http://localhost:${port}/tests/blank.html`);
  const res = await p.evaluate(async (legacy) => { const { layerAudit, artReady } = await import('/src/art.js'); const { OUTFIT_ATLAS } = await import('/src/outfit-atlas.js'); await artReady; globalThis.__legacyLayers = legacy;
    const items = Object.entries(OUTFIT_ATLAS.items), combos = [{}], bySlot = {}; for (const [id, it] of items) { combos.push({ [it.slot]: id }); (bySlot[it.slot] ||= []).push(id); }
    const slots = Object.keys(bySlot); for (let k = 0; k < 4; k++) { const o = {}; for (const s of slots) o[s] = bySlot[s][k % bySlot[s].length]; combos.push(o); }
    const out = { checked: 0, holes: 0, gaps: 0, dips: 0, seams: 0, worst: [] };
    for (const coat of Object.keys(OUTFIT_ATLAS.canvas)) for (const view of ['front', 'side', 'back']) for (let f = 0; f < 4; f++) for (const eq of combos) {
      const r = layerAudit(coat, view, f, eq); out.checked++; out.holes += r.holes; out.dips += r.dips; out.seams += r.seams; out.gaps += r.gaps;
      if (r.holes + r.gaps + r.dips + r.seams > 0 && out.worst.length < 8) out.worst.push(`${coat}/${view}/${f}/${Object.values(eq).join('+') || 'body'}: holes ${r.holes} gaps ${r.gaps} dips ${r.dips} seams ${r.seams}`); }
    return out; }, legacy);
  await b.close(); srv.close(); return res;
}
if (!process.env.AUDIT_ONLY) test('layered Shiba: no holes, alpha dips or layer seams in any coat/view/frame/outfit', { timeout: 300000 }, async () => {
  const r = await auditAll(); console.log('# layer audit', JSON.stringify(r));
  assert.ok(r.checked > 2000, 'combos checked: ' + r.checked);
  assert.equal(r.holes, 0, 'holes: ' + r.worst.join('; ')); assert.equal(r.gaps, 0, 'gaps: ' + r.worst.join('; ')); assert.equal(r.dips, 0, 'alpha dips: ' + r.worst.join('; ')); assert.equal(r.seams, 0, 'seams: ' + r.worst.join('; '));
});
