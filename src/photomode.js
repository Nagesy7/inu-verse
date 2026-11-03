// Photo mode (feature batch #2): HUD hidden, a little free camera pan/zoom around your pup, filters (sepia, night glow, mono),
// frames (polaroid with an "Inu Verse" caption, gold pixel frame, film strip), poses via the emote actions, and Save PNG
// (canvas.toBlob → download, or the Web Share API on phones). Share links are plain X / Telegram intents with text — nothing is
// ever uploaded to a server. Pure helpers (camera, pixel filters, share text, layout) are exported for tests; the DOM bits live in
// mountPhotoUI. Cosmetic only: no Bones, no $KIBBLE, no fees.

export const SITE = 'https://inu-verse-tawny.vercel.app';
export const TG = 't.me/KibbleCoin';
export const PAN_R = 256;            // world px you may pan away from your pup (8 tiles)
export const Z_REL = [0.6, 1.8];     // photo zoom, relative to the zoom you entered with
export const Z_ABS = [0.5, 4];       // and never outside these
export const PAN_SPEED = 260;        // world px/s for arrow/WASD panning

export const FILTERS = [
  { id: 'none', label: 'No filter', css: '' },
  { id: 'sepia', label: 'Sepia', css: 'sepia(.9) contrast(1.05) brightness(1.03)' },
  { id: 'glow', label: 'Night glow', css: 'brightness(1.08) contrast(1.1) saturate(1.5) hue-rotate(-12deg)' },
  { id: 'mono', label: 'Mono', css: 'grayscale(1) contrast(1.15)' },
];
export const FRAMES = [
  { id: 'none', label: 'No frame' },
  { id: 'polaroid', label: 'Polaroid' },
  { id: 'gold', label: 'Gold' },
  { id: 'film', label: 'Film' },
];
export const POSE_KEYS = ['wave', 'dance', 'sit', 'heart', 'laugh', 'pose'];
export const CAPTION = 'Inu Verse';

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
export const cycle = (list, id, d = 1) => list[(list.findIndex((x) => x.id === id) + d + list.length) % list.length].id;

// ---- camera ----
export function makePhotoCam(baseZoom) { return { base: baseZoom, z: 1, pan: { x: 0, y: 0 } }; }
export function panBy(pc, dx, dy) { pc.pan.x += dx; pc.pan.y += dy; const l = Math.hypot(pc.pan.x, pc.pan.y); if (l > PAN_R) { pc.pan.x *= PAN_R / l; pc.pan.y *= PAN_R / l; } return pc; }
export function zoomTo(pc, z) { const lo = Math.max(Z_REL[0], Z_ABS[0] / pc.base), hi = Math.min(Z_REL[1], Z_ABS[1] / pc.base); pc.z = clamp(z, lo, hi); return pc; }
export const zoomBy = (pc, f) => zoomTo(pc, pc.z * f);
export const photoZoom = (pc) => pc.base * pc.z;
export function resetCam(pc) { pc.z = 1; pc.pan.x = pc.pan.y = 0; return pc; }
/** keys: Set of lowercased keys → pans the camera (the pup stays put in photo mode). */
export function panKeys(pc, keys, dt) { let x = 0, y = 0; if (keys.has('w') || keys.has('arrowup')) y--; if (keys.has('s') || keys.has('arrowdown')) y++; if (keys.has('a') || keys.has('arrowleft')) x--; if (keys.has('d') || keys.has('arrowright')) x++;
  if (x || y) { const l = Math.hypot(x, y); panBy(pc, (x / l) * PAN_SPEED * dt, (y / l) * PAN_SPEED * dt); } return pc; }

// ---- pixel filters (export path; deterministic, same on every browser — Safari has no ctx.filter) ----
const c8 = (v) => (v < 0 ? 0 : v > 255 ? 255 : v);
export function filterPx(id, r, g, b) {
  if (id === 'sepia') { const sr = 0.393 * r + 0.769 * g + 0.189 * b, sg = 0.349 * r + 0.686 * g + 0.168 * b, sb = 0.272 * r + 0.534 * g + 0.131 * b;
    const m = 0.9, k = 1.05, o = 128 * (1 - k); return [c8((r + (sr - r) * m) * k + o + 3), c8((g + (sg - g) * m) * k + o + 3), c8((b + (sb - b) * m) * k + o + 3)]; }
  if (id === 'glow') { const L = 0.299 * r + 0.587 * g + 0.114 * b, s = 1.4; let R = L + (r - L) * s, G = L + (g - L) * s, B = L + (b - L) * s; // saturate, then a moonlit blue shift + dim
    R = R * 0.9 + 4; G = G * 1.0 + 6; B = B * 1.08 + 14; const k = 1.1, o = 128 * (1 - k); return [c8(R * k + o), c8(G * k + o), c8(B * k + o)]; }
  if (id === 'mono') { const L = 0.299 * r + 0.587 * g + 0.114 * b, k = 1.15, v = c8(L * k + 128 * (1 - k)); return [v, v, v]; }
  return [r, g, b];
}
export function applyFilter(data, id) { if (!id || id === 'none') return data; for (let i = 0; i < data.length; i += 4) { const p = filterPx(id, data[i], data[i + 1], data[i + 2]); data[i] = p[0]; data[i + 1] = p[1]; data[i + 2] = p[2]; } return data; }
/** bright-pass for the night-glow bloom (lamps, windows, lanterns glow; everything else drops out). */
export function brightPass(data, thr = 150) { for (let i = 0; i < data.length; i += 4) { const L = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]; if (L < thr) data[i] = data[i + 1] = data[i + 2] = 0; else { const k = (L - thr) / (255 - thr); data[i] *= k; data[i + 1] *= k; data[i + 2] *= k; } } return data; }

// ---- frame layout (export canvas size + where the photo goes) ----
export function frameLayout(frame, w, h) { const u = Math.max(4, Math.round(Math.min(w, h) * 0.045));
  if (frame === 'polaroid') return { W: w + 2 * u, H: h + u + Math.round(u * 4.2), x: u, y: u, u, cap: Math.round(u * 4.2) };
  if (frame === 'gold') { const g = Math.round(u * 0.9); return { W: w + 2 * g, H: h + 2 * g, x: g, y: g, u: g }; }
  if (frame === 'film') { const f = Math.round(u * 1.6); return { W: w, H: h + 2 * f, x: 0, y: f, u: f }; }
  return { W: w, H: h, x: 0, y: 0, u };
}

// ---- share (links only; the PNG is saved on the device, never uploaded) ----
export function shareText(name) { return `Snapped${name ? ' ' + String(name).slice(0, 20) : ' my pup'} in Inu Verse 📸 #InuVerse · ${TG}`; }
export function shareLinks(name) { const t = shareText(name);
  return { x: `https://x.com/intent/tweet?text=${encodeURIComponent(t)}&url=${encodeURIComponent(SITE)}`, tg: `https://t.me/share/url?url=${encodeURIComponent(SITE)}&text=${encodeURIComponent(t)}` }; }
export const fileName = (d = new Date()) => `inu-verse-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}.png`;

// ---- compose the final PNG canvas: filter → bloom → frame/caption ----
export function composePhoto(src, opts = {}, mk = () => document.createElement('canvas')) {
  const w = src.width, h = src.height, L = frameLayout(opts.frame || 'none', w, h), out = mk(); out.width = L.W; out.height = L.H; const x = out.getContext('2d');
  const shot = mk(); shot.width = w; shot.height = h; const sx = shot.getContext('2d'); sx.drawImage(src, 0, 0);
  const f = opts.filter || 'none';
  if (f !== 'none') { const im = sx.getImageData(0, 0, w, h); applyFilter(im.data, f); sx.putImageData(im, 0, 0); }
  if (f === 'glow') { // cheap bloom: 1/8-size bright pass, smoothed back up with 'lighter'; then a soft night vignette
    const bw = Math.max(1, w >> 3), bh = Math.max(1, h >> 3), bl = mk(); bl.width = bw; bl.height = bh; const bx = bl.getContext('2d'); bx.imageSmoothingEnabled = true; bx.drawImage(shot, 0, 0, bw, bh);
    const bi = bx.getImageData(0, 0, bw, bh); brightPass(bi.data, 120); bx.putImageData(bi, 0, 0);
    sx.save(); sx.imageSmoothingEnabled = true; sx.globalCompositeOperation = 'lighter'; sx.globalAlpha = 0.6; sx.drawImage(bl, 0, 0, w, h); sx.restore();
    const g = sx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.hypot(w, h) / 2); g.addColorStop(0, 'rgba(10,8,40,0)'); g.addColorStop(1, 'rgba(10,8,40,.4)'); sx.fillStyle = g; sx.fillRect(0, 0, w, h); }
  const fr = opts.frame || 'none', u = L.u;
  if (fr === 'polaroid') { x.fillStyle = '#f7f3ea'; x.fillRect(0, 0, L.W, L.H); x.fillStyle = 'rgba(20,26,46,.18)'; x.fillRect(L.x - 2, L.y - 2, w + 4, h + 4); }
  if (fr === 'gold') { x.fillStyle = '#141a2e'; x.fillRect(0, 0, L.W, L.H); const b = Math.max(2, Math.round(u / 4)); x.fillStyle = '#c99a2e'; x.fillRect(b, b, L.W - 2 * b, L.H - 2 * b); x.fillStyle = '#ffd84a'; x.fillRect(b, b, L.W - 2 * b, b); x.fillRect(b, b, b, L.H - 2 * b); x.fillStyle = '#8a6418'; x.fillRect(b, L.H - 2 * b, L.W - 2 * b, b); x.fillRect(L.W - 2 * b, b, b, L.H - 2 * b);
    x.fillStyle = '#141a2e'; x.fillRect(L.x - b, L.y - b, w + 2 * b, h + 2 * b); for (const [cx, cy] of [[0, 0], [1, 0], [0, 1], [1, 1]]) { x.fillStyle = '#fff6e0'; x.fillRect(cx ? L.W - 3 * b : 2 * b, cy ? L.H - 3 * b : 2 * b, b, b); } }
  if (fr === 'film') { x.fillStyle = '#0d0d12'; x.fillRect(0, 0, L.W, L.H); const hw = Math.round(u * 0.55), hh = Math.round(u * 0.42), gap = hw * 2; x.fillStyle = '#e9e2cf';
    for (let px = Math.round(hw / 2); px < L.W; px += gap) { x.fillRect(px, Math.round((u - hh) / 2), hw, hh); x.fillRect(px, L.H - u + Math.round((u - hh) / 2), hw, hh); } }
  x.imageSmoothingEnabled = false; x.drawImage(shot, L.x, L.y);
  if (fr === 'polaroid') { const cap = L.cap, fs = Math.round(cap * 0.36); x.fillStyle = '#20263d'; x.textBaseline = 'middle'; x.font = `${fs}px Silkscreen, "Press Start 2P", monospace`; x.fillText(opts.caption || CAPTION, L.x + Math.round(u * 0.6), L.y + h + cap / 2 + u * 0.1);
    const sub = [opts.name, opts.date].filter(Boolean).join(' · '); if (sub) { x.font = `${Math.round(fs * 0.45)}px Silkscreen, monospace`; x.fillStyle = '#6a6f86'; x.textAlign = 'right'; x.fillText(sub, L.W - L.x - Math.round(u * 0.6), L.y + h + cap / 2 + u * 0.1); x.textAlign = 'left'; } }
  else { const fs = Math.max(10, Math.round(Math.min(w, h) * 0.032)), pad = Math.round(fs * 0.6), tx = 'INU VERSE'; x.font = `${fs}px Silkscreen, monospace`; const tw = x.measureText(tx).width;
    const bx = L.x + w - tw - pad * 3, by = L.y + h - fs - pad * 3; x.fillStyle = 'rgba(20,26,46,.6)'; x.fillRect(bx, by, tw + pad * 2, fs + pad * 2); x.fillStyle = '#fff6e0'; x.textBaseline = 'middle'; x.fillText(tx, bx + pad, by + pad + fs / 2); }
  return out;
}

/** Save: Web Share (files) on phones when available, else a plain download. Never uploads. → 'shared' | 'downloaded' | 'cancelled' */
export async function savePhoto(canvas, { name, coarse = false, nav = globalThis.navigator, doc = globalThis.document } = {}) {
  const blob = await new Promise((ok) => canvas.toBlob(ok, 'image/png')); if (!blob) throw new Error('Could not make the PNG');
  const fn = fileName(); let file = null; try { file = new File([blob], fn, { type: 'image/png' }); } catch {}
  if (coarse && file && nav?.canShare?.({ files: [file] })) { try { await nav.share({ files: [file], title: 'Inu Verse', text: shareText(name) }); return 'shared'; } catch (e) { if (e?.name === 'AbortError') return 'cancelled'; } }
  const url = URL.createObjectURL(blob), a = doc.createElement('a'); a.href = url; a.download = fn; doc.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(url), 4000);
  globalThis.__lastPhoto = { name: fn, size: blob.size, w: canvas.width, h: canvas.height }; return 'downloaded';
}

// ---- UI ----
const ICON = { filter: '◐', frame: '▣', pose: '☺', save: '⬇', x: '𝕏', tg: 'TG', exit: '✕', zin: '+', zout: '−', home: '1:1' };
const POSE_LABEL = { wave: 'Wave', dance: 'Dance', sit: 'Sit', heart: '♥', laugh: 'Ha!', pose: 'Pose' };
export function mountPhotoUI(hooks) {
  const S = { filter: 'none', frame: 'none', poses: false, busy: false };
  const el = document.createElement('div'); el.id = 'photo-ui'; el.setAttribute('aria-label', 'Photo mode');
  el.innerHTML = `<div id="photo-fx" aria-hidden="true"></div><div id="photo-frame" aria-hidden="true"><span class="pf-cap">${CAPTION}</span></div>
  <div class="pm-top" role="toolbar" aria-label="Photo tools"><b class="pm-t">📸</b>
    <button class="pm-b" id="pm-filter" aria-label="Filter"><i>${ICON.filter}</i><span>No filter</span></button>
    <button class="pm-b" id="pm-frame" aria-label="Frame"><i>${ICON.frame}</i><span>No frame</span></button>
    <button class="pm-b" id="pm-pose" aria-label="Poses" aria-pressed="false"><i>${ICON.pose}</i><span>Pose</span></button>
    <button class="pm-b go" id="pm-save" aria-label="Save PNG"><i>${ICON.save}</i><span>Save</span></button>
    <a class="pm-b" id="pm-x" target="_blank" rel="noopener" aria-label="Share on X"><i>${ICON.x}</i></a>
    <a class="pm-b" id="pm-tg" target="_blank" rel="noopener" aria-label="Share on Telegram"><i>${ICON.tg}</i></a>
    <button class="pm-b" id="pm-exit" aria-label="Exit photo mode"><i>${ICON.exit}</i></button></div>
  <div class="pm-zoom"><button class="pm-b" id="pm-zin" aria-label="Zoom in">${ICON.zin}</button><button class="pm-b" id="pm-zout" aria-label="Zoom out">${ICON.zout}</button><button class="pm-b" id="pm-home" aria-label="Recentre">${ICON.home}</button></div>
  <div class="pm-poses" id="pm-poses" hidden>${POSE_KEYS.map((k) => `<button class="pm-b" data-pose="${k}">${POSE_LABEL[k]}</button>`).join('')}</div>
  <div class="pm-hint" id="pm-hint">Drag to pan · pinch or +/− to zoom</div><div id="pm-flash"></div>`;
  document.body.appendChild(el);
  const $ = (s) => el.querySelector(s), body = document.body;
  const sync = () => { $('#pm-filter span').textContent = FILTERS.find((f) => f.id === S.filter).label; $('#pm-frame span').textContent = FRAMES.find((f) => f.id === S.frame).label;
    body.dataset.pf = S.filter; body.dataset.pfr = S.frame; const cv = hooks.canvas(); if (cv) cv.style.filter = FILTERS.find((f) => f.id === S.filter).css;
    $('#pm-poses').hidden = !S.poses; $('#pm-pose').setAttribute('aria-pressed', String(S.poses)); const L = shareLinks(hooks.name?.()); $('#pm-x').href = L.x; $('#pm-tg').href = L.tg; };
  const stop = (e) => e.stopPropagation();
  el.addEventListener('pointerdown', stop); el.addEventListener('click', stop);
  $('#pm-filter').onclick = () => { S.filter = cycle(FILTERS, S.filter); sync(); };
  $('#pm-frame').onclick = () => { S.frame = cycle(FRAMES, S.frame); sync(); };
  $('#pm-pose').onclick = () => { S.poses = !S.poses; sync(); };
  $('#pm-poses').onclick = (e) => { const b = e.target.closest('[data-pose]'); if (b) hooks.pose(b.dataset.pose); };
  $('#pm-exit').onclick = () => hooks.exit();
  $('#pm-zin').onclick = () => hooks.zoom(1.2); $('#pm-zout').onclick = () => hooks.zoom(1 / 1.2); $('#pm-home').onclick = () => hooks.recentre();
  $('#pm-save').onclick = async () => { if (S.busy) return; S.busy = true; try {
      const out = composePhoto(hooks.canvas(), { filter: S.filter, frame: S.frame, name: hooks.name?.(), date: new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' }) });
      if (!hooks.reduced?.()) { const f = $('#pm-flash'); f.classList.remove('on'); void f.offsetWidth; f.classList.add('on'); }
      const r = await savePhoto(out, { name: hooks.name?.(), coarse: hooks.coarse?.() }); hooks.saved?.(r, out); } catch (e) { hooks.toast?.(e.message || 'Could not save the photo', 'bad'); } finally { S.busy = false; } };
  return { el, S, sync, show: (on) => { el.classList.toggle('on', on); if (on) { sync(); const h = $('#pm-hint'); h.classList.remove('fade'); void h.offsetWidth; h.classList.add('fade'); } else { const cv = hooks.canvas(); if (cv) cv.style.filter = ''; delete body.dataset.pf; delete body.dataset.pfr; S.poses = false; } },
    set: (k, v) => { S[k] = v; sync(); } };
}
