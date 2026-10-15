// Renders every coat x view x walk frame x outfit (each item alone + full combos) through the real layered pipeline in
// headless Chromium and fails on any hole (background showing through), interior alpha dip, or dark seam line where layers meet.
import test from 'node:test'; import assert from 'node:assert/strict'; import http from 'node:http'; import fs from 'node:fs'; import path from 'node:path';
import { chromium } from 'playwright';
const ROOT = path.resolve(path.dirname(new URL(import.meta.url).pathname), '..');
const MIME = { '.js': 'text/javascript', '.html': 'text/html', '.png': 'image/png', '.json': 'application/json', '.css': 'text/css', '.ttf': 'font/ttf' };
export async function auditAll({ legacy = false, faces = false } = {}) {
  const srv = http.createServer((q, r) => { const f = path.join(ROOT, decodeURIComponent(q.url.split('?')[0])); fs.readFile(f.endsWith('/') ? f + 'index.html' : f, (e, b) => { if (e) { r.statusCode = 404; return r.end(); } r.setHeader('content-type', MIME[path.extname(f)] || 'application/octet-stream'); r.end(b); }); });
  await new Promise((ok) => srv.listen(0, ok)); const port = srv.address().port, b = await chromium.launch(), p = await b.newPage();
  await p.goto(`http://localhost:${port}/tests/blank.html`);
  const res = await p.evaluate(async ([legacy, faces]) => { const { layerAudit, artReady } = await import('/src/art.js'); const { OUTFIT_ATLAS } = await import('/src/outfit-atlas.js'); await artReady; globalThis.__legacyLayers = legacy;
    const items = Object.entries(OUTFIT_ATLAS.items), combos = [{}], bySlot = {}; for (const [id, it] of items) { combos.push({ [it.slot]: id }); (bySlot[it.slot] ||= []).push(id); }
    const slots = Object.keys(bySlot); for (let k = 0; k < 4; k++) { const o = {}; for (const s of slots) o[s] = bySlot[s][k % bySlot[s].length]; combos.push(o); }
    const out = { checked: 0, holes: 0, gaps: 0, dips: 0, seams: 0, worst: [], noFace: [] };
    if (faces) { const { faceCanvas, __faceOf } = await import('/src/art.js'); const S = await import('/src/seams.js');
      // the seam check skips the painted eye/mouth boxes themselves (intended dark features); holes/gaps/dips cover every pixel
      const featMask = (m, F, W) => { if (!F?.eyes) return m; const m2 = m.slice(); const boxes = F.eyes.map((e) => [e.x0 - 3, e.y0 - 3, e.x1 + 3, e.y1 + 3]); if (F.mouth) boxes.push([F.mouth.x - 12, F.mouth.y - 2, F.mouth.x + 12, F.mouth.y + 12]);
        for (const [x0, y0, x1, y1] of boxes) for (let y = y0; y <= y1; y++) for (let x = x0; x <= x1; x++) if (x >= 0 && x < W && y >= 0) m2[y * W + x] = 0; return m2; };
      const states = [{ eye: 'blink' }, { eye: 'happy', mouth: 'tongue', tail: 1 }, { eye: 'half' }, { eye: 'blink', mouth: 'yawn' }, { lx: -1, ly: -1, ear: 1 }, { lx: 1, mouth: 'open', tail: -1 }, { ly: 1, ear: 1 }];
      for (const coat of Object.keys(OUTFIT_ATLAS.canvas)) for (const view of ['front', 'side', 'back']) for (let f = 0; f < 4; f++) { if (!__faceOf(coat, view, f)) out.noFace.push(`${coat}/${view}/${f}`);
        for (const eq of combos.filter((_, i) => i % 3 === 0)) { const a = layerAudit(coat, view, f, eq);
          for (const st of states) { const s = { eye: 'open', lx: 0, ly: 0, mouth: 'none', ear: 0, tail: 0, ...st }, v = faceCanvas(a.cv, coat, view, f, eq, s), W = v.width, H = v.height, d = v.getContext('2d').getImageData(0, 0, W, H).data;
            const r = { holes: S.findHoles(d, W, H), gaps: S.findGaps(d, W, H), dips: S.findAlphaDips(d, W, H), seams: S.findDarkSeams(d, W, H, featMask(a.mask, __faceOf(coat, view, f), W)) }; out.checked++; out.holes += r.holes; out.dips += r.dips; out.seams += r.seams; out.gaps += r.gaps;
            if (r.holes + r.gaps + r.dips + r.seams > 0 && out.worst.length < 8) out.worst.push(`${coat}/${view}/${f}/${JSON.stringify(st)}: ${JSON.stringify(r)}`); } } }
      return out; }
    for (const coat of Object.keys(OUTFIT_ATLAS.canvas)) for (const view of ['front', 'side', 'back']) for (let f = 0; f < 4; f++) for (const eq of combos) {
      const r = layerAudit(coat, view, f, eq); out.checked++; out.holes += r.holes; out.dips += r.dips; out.seams += r.seams; out.gaps += r.gaps;
      if (r.holes + r.gaps + r.dips + r.seams > 0 && out.worst.length < 8) out.worst.push(`${coat}/${view}/${f}/${Object.values(eq).join('+') || 'body'}: holes ${r.holes} gaps ${r.gaps} dips ${r.dips} seams ${r.seams}`); }
    return out; }, [legacy, faces]);
  await b.close(); srv.close(); return res;
}
if (!process.env.AUDIT_ONLY) test('layered Shiba: no holes, alpha dips or layer seams in any coat/view/frame/outfit', { timeout: 300000 }, async () => {
  const r = await auditAll(); console.log('# layer audit', JSON.stringify(r));
  assert.ok(r.checked > 2000, 'combos checked: ' + r.checked);
  assert.equal(r.holes, 0, 'holes: ' + r.worst.join('; ')); assert.equal(r.gaps, 0, 'gaps: ' + r.worst.join('; ')); assert.equal(r.dips, 0, 'alpha dips: ' + r.worst.join('; ')); assert.equal(r.seams, 0, 'seams: ' + r.worst.join('; '));
});

if (!process.env.AUDIT_ONLY) test('face animation frames: anchors found and no holes/gaps/dips/seams in any expression', { timeout: 300000 }, async () => {
  const r = await auditAll({ faces: true }); console.log('# face audit', JSON.stringify({ ...r, worst: r.worst.slice(0, 3) }));
  assert.ok(r.checked > 1000, 'face frames checked: ' + r.checked); assert.deepEqual(r.noFace, [], 'faces not found');
  assert.equal(r.holes, 0, r.worst.join('; ')); assert.equal(r.gaps, 0, r.worst.join('; ')); assert.equal(r.dips, 0, r.worst.join('; ')); assert.equal(r.seams, 0, r.worst.join('; '));
});
