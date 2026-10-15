import { drawInuAvatar } from './vendor/inu-avatar.js';
// All art drawn procedurally - original.
import { shibaSprite } from './sprite.js';
import { hires } from './hires.js';
import { shadeSprite, patternLayer, mkCanvas, roundCorners, addNeck } from './detail.js';
import { conformLayer, sealInterior, layerBoundary, eraseSeams, closeGaps, findGaps, findHoles, findAlphaDips, findDarkSeams } from './seams.js';
// Shared Shiba (vendor/inu-avatar.js, synced from kibble-pay) drawn at 4x its native 18x22 pixel density (Scale2x twice).
// Same signature + return value as drawInuAvatar; the vendored file and other games are untouched.
const avHi = new WeakMap();
export function drawInuAvatarHi(ctx, profile, x, y, opts = {}) {
  let spr = null, dst = null; const sh = [];
  const fake = { save() {}, restore() {}, set fillStyle(v) { this._f = v; }, get fillStyle() { return this._f; }, imageSmoothingEnabled: false,
    fillRect(...a) { sh.push([this._f, a]); }, drawImage(s, ...a) { spr = s; dst = a; } };
  const r = drawInuAvatar(fake, profile, x, y, opts); if (!spr) return drawInuAvatar(ctx, profile, x, y, opts);
  let hi = avHi.get(spr); if (!hi) { hi = hires(spr, 2); if (!globalThis.__noDetail && hi !== spr) { roundCorners(hi, 3); shadeSprite(hi, { r: 4, light: 0.26, dark: 0.28, glint: true, grad: 0.12, bands: [0.18, 0.22] }); } avHi.set(spr, hi); }
  ctx.save(); for (const [f, a] of sh) { ctx.fillStyle = f; ctx.fillRect(...a); } ctx.imageSmoothingEnabled = false; ctx.drawImage(hi, ...dst); ctx.restore(); return r;
}
import { FURNITURE, footprint, WALLS, FLOORS } from './furniture.js';
import { OUTFIT_ATLAS } from './outfit-atlas.js';
import { OUTFITS } from './outfits.js';

// Reference-art sprites (cropped from the user's own art by scripts/extract_art.py).
export const ART = {};
export const FASHION_ART = { suit_navy: 'fashion-suit', tux_black: 'fashion-tux', hoodie_maroon: 'fashion-hoodie', jacket_black: 'fashion-jacket', gown_white: 'fashion-gown', hawaiian: 'fashion-hawaiian' };
const ART_FILES = ['tan', 'cream', 'red', 'dark', 'golden', 'gray'].map((k) => 'shiba-' + k).concat(Object.values(FASHION_ART), ['cafe', 'shop', 'fashion', 'launch', 'cars'].map((k) => 'building-' + k));
// Layered outfit atlases (one per coat, built by scripts/build_outfit_atlas.py): base_{front,side,back} + item layers, 4 walk frames each.
const ATLAS_FILES = Object.keys(OUTFIT_ATLAS.canvas).map((k) => 'outfits/' + k);
export const artReady = typeof Image === 'undefined' ? Promise.resolve() : Promise.all(ART_FILES.concat(ATLAS_FILES).map((n) => new Promise((res) => { const im = new Image(); im.onload = () => { ART[n] = im; res(); }; im.onerror = () => { console.warn('art failed to load', n); res(); }; im.src = `assets/${n}.png`; })));
// Every avatar (player, NPCs, previews) is drawn as layered art: coat base + equipped outfit layers.
export function artKey(coat) { return 'layer:' + coat; }

// Ordered atlas keys (base first, then item layers by manifest z) for coat/view/frame/equipped.
export function outfitLayers(coat, view, frame, equipped = {}) {
  const items = Object.values(equipped || {}).filter((id) => OUTFITS[id] && OUTFIT_ATLAS.items[id]);
  const noBottom = items.some((id) => OUTFIT_ATLAS.items[id].replacesBottom);
  const ids = items.filter((id) => !(noBottom && OUTFIT_ATLAS.items[id].slot === 'bottom')).sort((a, b) => OUTFIT_ATLAS.items[a].z - OUTFIT_ATLAS.items[b].z);
  return ['base', ...ids].map((id) => `${id}|${view}|${frame}`).filter((k) => OUTFIT_ATLAS.frames[coat]?.[k]);
}
const layerCache = new Map();
function layeredCanvas(coat, view, frame, equipped, audit = null) {
  const key = `${coat}|${view}|${frame}|${Object.values(equipped || {}).sort().join(',')}`;
  let cv = audit ? null : layerCache.get(key); if (cv) return cv;
  const atlas = ART['outfits/' + coat], [cw, ch] = OUTFIT_ATLAS.canvas[coat], fr = OUTFIT_ATLAS.frames[coat];
  cv = Object.assign(document.createElement('canvas'), { width: cw, height: ch }); const c = cv.getContext('2d', { willReadFrequently: true });
  const D = !globalThis.__noDetail, LEG = !!globalThis.__legacyLayers; let baseOnly = null; const mask = new Uint8Array(cw * ch);
  // Pipeline: pattern each layer -> conform it onto what is below (no dark rims / seam lines where layers meet) ->
  // seal holes + interior alpha -> round silhouette -> neck -> shade the whole figure once (so no per-layer edge shading).
  for (const k of outfitLayers(coat, view, frame, equipped)) { const [sx, sy, w, h, ox, oy] = fr[k], id = k.split('|')[0];
    if (!D) { c.drawImage(atlas, sx, sy, w, h, ox, oy, w, h); continue; }
    const t = mkCanvas(cw, ch), tc = t.getContext('2d', { willReadFrequently: true }); tc.drawImage(atlas, sx, sy, w, h, ox, oy, w, h);
    if (id === 'base') { if (LEG) shadeSprite(t, { r: 3, light: 0.2, dark: 0.24, grad: 0.1, bands: [0.16, 0.2] }); baseOnly = mkCanvas(cw, ch); baseOnly.getContext('2d').drawImage(atlas, sx, sy, w, h, ox, oy, w, h); c.drawImage(t, 0, 0); continue; }
    const pt = mkCanvas(w + 4, h + 4), ptc = pt.getContext('2d'); ptc.drawImage(t, ox - 2, oy - 2, w + 4, h + 4, 0, 0, w + 4, h + 4); patternLayer(ptc, id, [2, 2, w, h], view);
    if (LEG) shadeSprite(pt, { r: 2, light: 0.18, dark: 0.28, grad: 0.1, bands: [0.14, 0.22] });
    tc.clearRect(0, 0, cw, ch); tc.drawImage(pt, ox - 2, oy - 2);
    const under = c.getImageData(0, 0, cw, ch).data, item = tc.getImageData(0, 0, cw, ch).data;
    if (mask) layerBoundary(item, under, cw, ch, mask, [ox - 2, oy - 2, w + 4, h + 4]);
    c.drawImage(t, 0, 0);
    if (!LEG) { const comp = c.getImageData(0, 0, cw, ch); conformLayer(comp.data, item, under, cw, ch, [ox - 2, oy - 2, w + 4, h + 4]); c.putImageData(comp, 0, 0); } }
  const b = fr[`base|${view}|0`]; let feet = b[5] + b[3]; // canvas row under the paws
  let nk = null;
  if (D && baseOnly) { if (!LEG) { const im = c.getImageData(0, 0, cw, ch); sealInterior(im.data, cw, ch); c.putImageData(im, 0, 0); }
    roundCorners(cv, 2); nk = addNeck(cv, baseOnly, 5, LEG ? '#1a1420' : null); cv = nk.cv; feet += nk.n;
    if (!LEG) { const x = cv.getContext('2d', { willReadFrequently: true }), W = cv.width, H = cv.height, im = x.getImageData(0, 0, W, H); closeGaps(im.data, W, H); sealInterior(im.data, W, H);
      const m2 = new Uint8Array(W * H); for (let y = 0; y < ch; y++) for (let xx = 0; xx < cw; xx++) if (mask[y * cw + xx]) { const yy = y >= nk.at ? y + nk.n : y; if (yy < H) m2[yy * W + xx] = 1; }
      { const [x0, y0, nw, nh] = nk.rect; for (let y = y0 + 8; y < y0 + nh && y < H; y++) for (const xx of [x0 - 3, x0 - 2, x0 - 1, x0, x0 + nw - 1, x0 + nw, x0 + nw + 1, x0 + nw + 2]) if (xx >= 0 && xx < W) m2[y * W + xx] = 1; }
      x.putImageData(im, 0, 0); shadeSprite(cv, { r: 3, light: 0.2, dark: 0.24, grad: 0.1, bands: [0.16, 0.2] }); const im2 = x.getImageData(0, 0, W, H); eraseSeams(im2.data, W, H, m2); x.putImageData(im2, 0, 0); } }
  cv.feet = feet;
  if (audit) { const W = cv.width, H = cv.height, d = cv.getContext('2d').getImageData(0, 0, W, H).data, m2 = new Uint8Array(W * H);
    if (mask) for (let y = 0; y < ch; y++) for (let x = 0; x < cw; x++) if (mask[y * cw + x]) { const yy = nk && y >= nk.at ? y + nk.n : y; if (yy < H) m2[yy * W + x] = 1; }
    if (nk?.rect) { const [x0, y0, nw, nh] = nk.rect; for (let y = y0 + 8; y < y0 + nh && y < H; y++) for (const x of [x0 - 3, x0 - 2, x0 - 1, x0, x0 + nw - 1, x0 + nw, x0 + nw + 1, x0 + nw + 2]) if (x >= 0 && x < W) m2[y * W + x] = 1; }
    return { holes: findHoles(d, W, H), gaps: findGaps(d, W, H), dips: findAlphaDips(d, W, H), seams: findDarkSeams(d, W, H, m2), w: W, h: H, cv, mask: m2 }; }
  layerCache.set(key, cv); if (layerCache.size > 400) layerCache.delete(layerCache.keys().next().value);
  return cv;
}
export function layerAudit(coat, view, frame, equipped) { return layeredCanvas(coat, view, frame, equipped, true); }
// Mip chain for the layered art: halve with high-quality filtering until within 2x of the on-screen device size,
// so small in-world Shibas keep fur/outfit detail instead of shimmering from a single 4x+ downscale.
function mip(cv, devH) { let m = cv; while (m.height > devH * 2 && m.height > 24) { if (!m.half) { const h = Object.assign(document.createElement('canvas'), { width: Math.ceil(m.width / 2), height: Math.ceil(m.height / 2) }), c = h.getContext('2d');
  c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(m, 0, 0, h.width, h.height); m.half = h; } m = m.half; } return m; }
function drawLayered(ctx, x, y, coat, outfit, { face, phase, moving, scale, name, shadow, badge, emote }) {
  const view = face === 'up' ? 'back' : face === 'left' || face === 'right' ? 'side' : 'front';
  const frame = moving ? Math.floor(phase / 1.6) % 4 : 0, cv = layeredCanvas(coat, view, frame, outfit);
  const k = (64 * scale) / (cv.feet - 6), sit = emote === 'sit' ? 0.82 : 1; // ~64px tall at scale 1, matches the old art sprites
  const w = cv.width * k, h = cv.height * k * sit, top = y + 12 - cv.feet * k * sit, bob = moving ? 0 : Math.sin(phase * 0.5) * 0.6;
  ctx.save(); ctx.imageSmoothingEnabled = true; ctx.imageSmoothingQuality = 'high';
  if (shadow) { ctx.fillStyle = 'rgba(10,14,30,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 11, w * 0.3, 4 * scale, 0, 0, 7); ctx.fill(); }
  ctx.translate(Math.round(x), 0); if (face === 'left') ctx.scale(-1, 1);
  ctx.drawImage(mip(cv, h * (ctx.getTransform?.().d || 1)), Math.round(-w / 2), Math.round(top - bob), Math.round(w), Math.round(h));
  ctx.restore();
  if (name) nameTag(ctx, x, top, name, badge);
}

// Custom (character-creator) Shibas: shared cross-game renderer, sized to match the layered atlas (~64px at scale 1)
export function drawProfileShiba(ctx, x, y, profile, { face = 'down', phase = 0, moving = false, scale = 1, name = null, shadow = true, badge = null } = {}) {
  const frame = moving ? Math.floor(phase / 1.6) % 4 : 0, r = drawInuAvatarHi(ctx, profile, x, y + 12, { scale: scale * 1.6, face, frame, shadow });
  if (name) nameTag(ctx, x, y + 12 - r.h, name, badge); }
const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

// Pixel Shiba (see sprite.js). (x,y) = ground point under the feet-ish centre.
export function drawShiba(ctx, x, y, { coat = 'tan', face = 'down', phase = 0, moving = false, scale = 1, name = null, outfit = null, shadow = true, badge = null, art = null, emote = null } = {}) {
  if (art && ART[art]) return drawArt(ctx, x, y, ART[art], { face, phase, moving, scale, name, shadow, badge, emote });
  const lc = art?.startsWith?.('layer:') ? art.slice(6) : coat;
  if (ART['outfits/' + lc] && OUTFIT_ATLAS.canvas[lc]) return drawLayered(ctx, x, y, lc, outfit || {}, { face, phase, moving, scale, name, shadow, badge, emote });
  // last resort (atlas failed to load): procedural pixel sprite
  const px = Math.max(1, Math.round(2 * scale));
  const frame = moving ? Math.floor(phase / 1.6) % 4 : 0;
  const spr = shibaSprite(coat, face, frame, outfit || {});
  const w = spr.width * px / (spr.k || 1), h = spr.height * px / (spr.k || 1), dx = Math.round(x - w / 2), dy = Math.round(y + 12 - h);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (shadow) { ctx.fillStyle = 'rgba(10,14,30,0.28)'; ctx.fillRect(Math.round(x - 7 * px), Math.round(y + 12 - 2 * px), 14 * px, 2 * px); ctx.fillRect(Math.round(x - 5 * px), Math.round(y + 12 - 3 * px), 10 * px, 3 * px); }
  ctx.drawImage(spr, dx, dy, w, h);
  ctx.restore();
  if (name) {
    ctx.save(); ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = Math.ceil(ctx.measureText(name).width) + 8, ty = dy - 8;
    const gold = GOLD.name && name === GOLD.name; ctx.fillStyle = gold ? '#7a5a12' : '#121a36'; ctx.fillRect(Math.round(x - tw / 2), ty - 6, tw, 12); ctx.fillStyle = gold ? '#ffe27a' : '#d4a640'; ctx.fillRect(Math.round(x - tw / 2), ty + 5, tw, 1); if (gold) { ctx.fillRect(Math.round(x - tw / 2), ty - 7, tw, 1); }
    ctx.fillStyle = (GOLD.name && name === GOLD.name) ? '#ffe27a' : '#f6e7b8'; ctx.fillText(name, Math.round(x), ty);
    if (badge) { // Pack badge: banner-coloured tag with emblem, above the name
      const bt = `[${badge.tag}]`, bw = Math.ceil(ctx.measureText(bt).width) + 18, bx = Math.round(x - bw / 2), byy = ty - 20;
      ctx.fillStyle = '#121a36'; ctx.fillRect(bx - 1, byy - 1, bw + 2, 13); ctx.fillStyle = badge.color; ctx.fillRect(bx, byy, bw, 11);
      ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(bx, byy + 9, bw, 2);
      drawEmblem(ctx, badge.emblem, bx + 2, byy + 1, 1.6, '#fff6e0');
      ctx.fillStyle = '#121a36'; ctx.fillText(bt, Math.round(bx + 11 + (bw - 11) / 2) + 1, byy + 6); ctx.fillStyle = '#fff6e0'; ctx.fillText(bt, Math.round(bx + 11 + (bw - 11) / 2), byy + 5);
    }
    ctx.restore();
  }
}

// Pixel emblems for Pack banners. (x,y) top-left, s = pixel unit (shape is ~5x5 units).
export function drawEmblem(ctx, kind, x, y, s, col) {
  const P = { paw: [[0, 1], [2, 0], [4, 1], [1, 3], [2, 3], [3, 3], [1, 4], [2, 4], [3, 4], [0, 3], [4, 3]],
    bone: [[0, 0], [0, 1], [1, 1], [1, 2], [2, 2], [3, 2], [3, 3], [4, 3], [4, 4], [3, 4], [1, 0], [0, 2], [4, 2]],
    star: [[2, 0], [2, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [1, 3], [2, 3], [3, 3], [1, 4], [3, 4]],
    heart: [[0, 1], [1, 0], [3, 0], [4, 1], [1, 1], [2, 1], [3, 1], [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [1, 3], [2, 3], [3, 3], [2, 4]] }[kind] || [];
  ctx.fillStyle = col; for (const [px, py] of P) ctx.fillRect(Math.round(x + px * s), Math.round(y + py * s), Math.ceil(s), Math.ceil(s));
}

// Draw a reference-art sprite: ~3 tiles tall at scale 1.5; walk = bob + squash + flip.
function drawArt(ctx, x, y, im, { face, phase, moving, scale, name, shadow, badge, emote }) {
  const H = Math.round(64 * scale), W = Math.round(im.width * H / im.height);
  const bob = moving ? Math.abs(Math.sin(phase * 0.9)) * 3 * scale : Math.sin(phase * 0.5) * 0.6;
  const sq = moving ? 1 + Math.sin(phase * 1.8) * 0.035 : 1, sit = emote === 'sit' ? 0.82 : 1;
  const h = H * sit / sq, w = W * sq, flip = face === 'left';
  const top = y + 12 - h - bob;
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (shadow) { ctx.fillStyle = 'rgba(10,14,30,0.3)'; ctx.beginPath(); ctx.ellipse(x, y + 11, w * 0.32, 4 * scale, 0, 0, 7); ctx.fill(); }
  ctx.translate(Math.round(x), 0); if (flip) ctx.scale(-1, 1);
  if (face === 'up') ctx.filter = 'brightness(0.82)';
  ctx.drawImage(im, Math.round(-w / 2), Math.round(top), Math.round(w), Math.round(h));
  ctx.restore();
  if (name) nameTag(ctx, x, top, name, badge);
}
function nameTag(ctx, x, dy, name, badge) {
  ctx.save(); ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const tw = Math.ceil(ctx.measureText(name).width) + 8, ty = Math.round(dy - 8);
  const gold = GOLD.name && name === GOLD.name; ctx.fillStyle = gold ? '#7a5a12' : '#121a36'; ctx.fillRect(Math.round(x - tw / 2), ty - 6, tw, 12); ctx.fillStyle = gold ? '#ffe27a' : '#d4a640'; ctx.fillRect(Math.round(x - tw / 2), ty + 5, tw, 1); if (gold) { ctx.fillRect(Math.round(x - tw / 2), ty - 7, tw, 1); }
  ctx.fillStyle = (GOLD.name && name === GOLD.name) ? '#ffe27a' : '#f6e7b8'; ctx.fillText(name, Math.round(x), ty);
  if (badge) {
    const bt = `[${badge.tag}]`, bw = Math.ceil(ctx.measureText(bt).width) + 18, bx = Math.round(x - bw / 2), byy = ty - 20;
    ctx.fillStyle = '#121a36'; ctx.fillRect(bx - 1, byy - 1, bw + 2, 13); ctx.fillStyle = badge.color; ctx.fillRect(bx, byy, bw, 11);
    ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(bx, byy + 9, bw, 2); drawEmblem(ctx, badge.emblem, bx + 2, byy + 1, 1.6, '#fff6e0');
    ctx.fillStyle = '#121a36'; ctx.fillText(bt, Math.round(bx + 11 + (bw - 11) / 2) + 1, byy + 6); ctx.fillStyle = '#fff6e0'; ctx.fillText(bt, Math.round(bx + 11 + (bw - 11) / 2), byy + 5);
  }
  ctx.restore();
}

export function drawBoneIcon(ctx, x, y, s = 1, color = '#fff6e0') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color; ctx.strokeStyle = '#a58a5c'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(-6, -2, 12, 4, 2); ctx.fill();
  for (const [cx, cy] of [[-6, -2.5], [-6, 2.5], [6, -2.5], [6, 2.5]]) { ctx.beginPath(); ctx.arc(cx, cy, 2.6, 0, 7); ctx.fill(); }
  ctx.restore();
}

export function drawMenuIcon(ctx, id, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (id === 'latte') { ctx.fillStyle = '#fff'; rr(ctx, -9, -6, 16, 15, 4); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(8, 1, 4, -1.4, 1.4); ctx.stroke(); ctx.fillStyle = '#c08a5a'; ctx.beginPath(); ctx.ellipse(-1, -5, 7, 2.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-1, -5, 1.6, 0, 7); ctx.fill(); }
  if (id === 'biscuit') drawBoneIcon(ctx, 0, 0, 1.4, '#e6b877');
  if (id === 'berry') { ctx.fillStyle = '#f2efe8'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI); ctx.fill(); for (const [bx, by, col] of [[-5, -1, '#5a4fcf'], [0, -3, '#d8425a'], [5, -1, '#5a4fcf'], [-2, -5, '#7a6cf0'], [3, -6, '#d8425a']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx, by, 3, 0, 7); ctx.fill(); } }
  if (id === 'cake') { ctx.fillStyle = '#fbe3ea'; ctx.beginPath(); ctx.moveTo(-10, 8); ctx.lineTo(10, 8); ctx.lineTo(10, -2); ctx.lineTo(-10, -6); ctx.fill(); ctx.fillStyle = '#ef8fb0'; ctx.fillRect(-10, 1, 20, 2.5); ctx.fillStyle = '#e04a6a'; ctx.beginPath(); ctx.arc(0, -7, 3, 0, 7); ctx.fill(); }
  if (id === 'tea') { ctx.fillStyle = '#e8e2d0'; ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(8, -5); ctx.lineTo(6, 8); ctx.lineTo(-6, 8); ctx.fill(); ctx.fillStyle = '#8cbf5a'; ctx.beginPath(); ctx.ellipse(0, -5, 8, 2.5, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}

// ---- furniture (top-down) ----
export const GOLD = { name: null }; // VIP holder: gold name tag for this display name
export function drawFurniture(ctx, id, x, y, cell, rot, alpha = 1) {
  const d = FURNITURE[id], f = footprint(id, rot), w = f.w * cell, h = f.h * cell, p = 4;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x + w / 2, y + h / 2); ctx.rotate((rot * Math.PI) / 2);
  const W = d.w * cell, H = d.h * cell, L = -W / 2 + p, T = -H / 2 + p, IW = W - 2 * p, IH = H - 2 * p;
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowOffsetY = d.layer === 'obj' ? 4 : 0; ctx.shadowBlur = d.layer === 'obj' ? 4 : 0;
  const dark = (c, a = 0.18) => { ctx.fillStyle = c; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.fillStyle = `rgba(0,0,0,${a})`; };
  switch (d.draw || id) {
    case 'art': rr(ctx, L + 2, T + 2, IW - 4, IH - 4, 2); dark('#6a4422'); ctx.fillStyle = '#fff6e0'; ctx.fillRect(L + 6, T + 6, IW - 12, IH - 12); ctx.fillStyle = d.color; ctx.beginPath(); ctx.arc(0, 0, IW * 0.18, 0, 7); ctx.fill(); ctx.fillStyle = 'rgba(0,0,0,.25)'; ctx.fillRect(L + 6, T + IH - 12, IW - 12, 4); break;
    case 'stove': rr(ctx, L, T, IW, IH, 4); dark(d.color); ctx.fillStyle = '#222'; for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(k * IW * 0.24, -IH * 0.05, IH * 0.28, 0, 7); ctx.fill(); } ctx.fillStyle = '#ff8a3a'; for (const k of [-1, 1]) { ctx.beginPath(); ctx.arc(k * IW * 0.24, -IH * 0.05, IH * 0.12, 0, 7); ctx.fill(); } break;
    case 'crib': rr(ctx, L, T, IW, IH, 6); dark(d.color); ctx.fillStyle = '#fff'; rr(ctx, L + 6, T + 6, IW - 12, IH - 12, 6); ctx.fill(); ctx.fillStyle = d.color; for (let i = 0; i < 6; i++) ctx.fillRect(L + 4 + i * ((IW - 8) / 5), T + 2, 2, IH - 4); ctx.fillStyle = '#ffb0c8'; ctx.beginPath(); ctx.arc(0, 0, IW * 0.12, 0, 7); ctx.fill(); break;
    case 'pupbed': ctx.beginPath(); ctx.ellipse(0, 0, IW * 0.46, IH * 0.4, 0, 0, 7); dark(d.color); ctx.fillStyle = 'rgba(255,255,255,.55)'; ctx.beginPath(); ctx.ellipse(0, 2, IW * 0.3, IH * 0.24, 0, 0, 7); ctx.fill(); break;
    case 'gold_throne': rr(ctx, L + 2, T, IW - 4, IH, 6); dark('#b8862a'); ctx.fillStyle = '#e3b341'; rr(ctx, L + 4, T + IH * 0.35, IW - 8, IH * 0.6, 5); ctx.fill(); ctx.fillStyle = '#c8282e'; rr(ctx, L + 7, T + IH * 0.45, IW - 14, IH * 0.4, 4); ctx.fill(); ctx.fillStyle = '#fff1b0'; for (const k of [-1, 0, 1]) ctx.fillRect(k * IW * 0.25 - 2, T + 1, 4, 5); break;
    case 'gold_statue': ctx.fillStyle = '#6a5a4a'; rr(ctx, L + 2, T + IH * 0.6, IW - 4, IH * 0.4, 3); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.fillStyle = '#e3b341'; ctx.beginPath(); ctx.arc(0, -IH * 0.05, IW * 0.28, 0, 7); ctx.fill(); ctx.beginPath(); ctx.moveTo(-IW * 0.28, -IH * 0.15); ctx.lineTo(-IW * 0.2, -IH * 0.42); ctx.lineTo(-IW * 0.05, -IH * 0.25); ctx.moveTo(IW * 0.28, -IH * 0.15); ctx.lineTo(IW * 0.2, -IH * 0.42); ctx.lineTo(IW * 0.05, -IH * 0.25); ctx.fill(); ctx.fillStyle = '#fff1b0'; ctx.fillRect(-IW * 0.12, -IH * 0.12, 3, 3); break;
    case 'gold_lamp': ctx.fillStyle = '#9c7424'; ctx.beginPath(); ctx.arc(0, 0, IW * 0.4, 0, 7); ctx.fill(); ctx.shadowColor = 'transparent'; ctx.fillStyle = '#ffe7a3'; ctx.beginPath(); ctx.arc(0, 0, IW * 0.28, 0, 7); ctx.fill(); ctx.fillStyle = '#e3b341'; ctx.fillRect(-2, -IH * 0.4, 4, IH * 0.15); break;
    case 'bed': rr(ctx, L, T, IW, IH, 8); dark('#8a5a34'); ctx.fillStyle = '#fff'; rr(ctx, L + 6, T + 6, IW - 12, IH * 0.24, 8); ctx.fill(); ctx.fillStyle = d.color; rr(ctx, L + 3, T + IH * 0.36, IW - 6, IH * 0.62, 6); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 3; i++) ctx.fillRect(L + 3, T + IH * (0.45 + i * 0.17), IW - 6, 3); break;
    case 'sofa': rr(ctx, L, T, IW, IH, 10); dark(d.color); ctx.fillStyle = 'rgba(0,0,0,0.18)'; rr(ctx, L, T, IW, IH * 0.35, 10); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 1; i < 3; i++) ctx.fillRect(L + (IW / 3) * i - 1, T + IH * 0.4, 2, IH * 0.55); break;
    case 'table': rr(ctx, L, T, IW, IH, 10); dark(d.color); ctx.fillStyle = 'rgba(255,255,255,0.2)'; rr(ctx, L + 6, T + 6, IW - 12, IH - 12, 6); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#c08a5a'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill(); break;
    case 'chair': rr(ctx, L + 2, T + 2, IW - 4, IH - 4, 10); dark(d.color); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(0, 0, IW * 0.18, 0, 7); ctx.fill(); break;
    case 'lamp': ctx.beginPath(); ctx.arc(0, 0, IW * 0.42, 0, 7); dark(d.color); ctx.shadowColor = 'transparent'; const g = ctx.createRadialGradient(0, 0, 2, 0, 0, cell); g.addColorStop(0, 'rgba(255,240,180,0.6)'); g.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, cell, 0, 7); ctx.fill(); ctx.strokeStyle = '#d8b56a'; ctx.lineWidth = 1.5; for (let r = 5; r < IW * 0.42; r += 5) { ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); } break;
    case 'plant': ctx.beginPath(); ctx.arc(0, 0, IW * 0.32, 0, 7); dark('#c0623b'); ctx.fillStyle = d.color; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 8, Math.sin(a) * 8, 9, 5, a, 0, 7); ctx.fill(); } ctx.fillStyle = '#7fd08a'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill(); break;
    case 'rug': ctx.beginPath(); ctx.ellipse(0, 0, IW / 2, IH / 2, 0, 0, 7); dark(d.color); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, Math.max(1, IW / 2 - 8), Math.max(1, IH / 2 - 8), 0, 0, 7); ctx.stroke(); ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.ellipse(0, 0, Math.max(1, IW / 2 - 16), Math.max(1, IH / 2 - 14), 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); break;
    case 'tv': rr(ctx, L, T + IH * 0.15, IW, IH * 0.7, 6); dark('#7a5136'); ctx.fillStyle = d.color; rr(ctx, L + 8, T, IW - 16, IH * 0.6, 4); ctx.fill(); ctx.fillStyle = '#7ad3f0'; rr(ctx, L + 12, T + 3, IW - 24, IH * 0.42, 3); ctx.fill(); break;
    case 'kennel': rr(ctx, L, T, IW, IH, 6); dark(d.color); ctx.fillStyle = '#9c4a2a'; ctx.beginPath(); ctx.moveTo(L, T + IH * 0.5); ctx.lineTo(0, T); ctx.lineTo(L + IW, T + IH * 0.5); ctx.lineTo(L + IW, T + IH * 0.3); ctx.lineTo(0, T - 4); ctx.lineTo(L, T + IH * 0.3); ctx.fill(); ctx.fillStyle = '#3a2418'; ctx.beginPath(); ctx.arc(0, T + IH * 0.75, IW * 0.18, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('INU', 0, T + IH * 0.42); break;
    case 'shelf': rr(ctx, L, T, IW, IH, 4); dark(d.color); const cols = ['#e0567a', '#3fb6a8', '#f2b84b', '#6c5ce7', '#5fb36a']; for (let i = 0; i < 7; i++) { ctx.fillStyle = cols[i % 5]; ctx.fillRect(L + 4 + i * ((IW - 8) / 7), T + 4, (IW - 8) / 7 - 2, IH - 8); } break;
    case 'bowl': ctx.beginPath(); ctx.arc(0, 0, IW * 0.36, 0, 7); dark(d.color); ctx.fillStyle = '#c99a5a'; ctx.beginPath(); ctx.arc(0, 0, IW * 0.24, 0, 7); ctx.fill(); drawBoneIcon(ctx, 0, 0, 0.8); break;
    case 'arcade': rr(ctx, L, T, IW, IH, 6); dark(d.color); ctx.fillStyle = '#1b1830'; rr(ctx, L + 5, T + 4, IW - 10, IH * 0.45, 3); ctx.fill(); ctx.fillStyle = '#ffd25a'; ctx.beginPath(); ctx.arc(L + IW * 0.35, T + IH * 0.75, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#ff5a7a'; ctx.beginPath(); ctx.arc(L + IW * 0.65, T + IH * 0.75, 3, 0, 7); ctx.fill(); break;
  }
  ctx.restore();
}

export function drawRoom(ctx, home, ox, oy, cell, cols, rows) {
  const wall = WALLS[home.wall] || WALLS[0], floor = FLOORS[home.floor] || FLOORS[0], wallH = cell * 1.6;
  ctx.fillStyle = wall.color; ctx.fillRect(ox - 14, oy - wallH, cols * cell + 28, wallH);
  ctx.fillStyle = wall.trim; ctx.fillRect(ox - 14, oy - 10, cols * cell + 28, 10);
  if (home.wall === 2) { ctx.fillStyle = 'rgba(230,130,160,0.35)'; for (let i = 0; i < cols * 2; i++) { ctx.beginPath(); ctx.arc(ox + i * cell / 2 + 10, oy - wallH + 18 + (i % 2) * 22, 5, 0, 7); ctx.fill(); } }
  if (home.wall === 1) { ctx.fillStyle = 'rgba(0,0,0,0.08)'; for (let i = 0; i < cols * 3; i++) ctx.fillRect(ox - 14 + i * cell / 3, oy - wallH, 2, wallH); }
  if (home.wall === 3) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; for (let i = 0; i < cols * 2 + 2; i++) { ctx.strokeRect(ox - 14 + i * cell / 2, oy - wallH, cell / 2, wallH / 3); ctx.strokeRect(ox - 14 + i * cell / 2, oy - wallH * 2 / 3, cell / 2, wallH / 3); } }
  // window
  ctx.fillStyle = '#fff'; rr(ctx, ox + cell * 6.5, oy - wallH + 12, cell * 2, wallH - 34, 6); ctx.fill(); ctx.fillStyle = '#9fd8f5'; rr(ctx, ox + cell * 6.5 + 5, oy - wallH + 17, cell * 2 - 10, wallH - 44, 4); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(ox + cell * 7.5 - 1.5, oy - wallH + 17, 3, wallH - 44);
  ctx.fillStyle = floor.color; ctx.fillRect(ox, oy, cols * cell, rows * cell);
  ctx.strokeStyle = floor.line; ctx.lineWidth = 1;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (home.floor === 2 && (x + y) % 2) { ctx.fillStyle = floor.line; ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell); }
    else if (home.floor === 0) { ctx.beginPath(); ctx.moveTo(ox, oy + y * cell + 0.5); ctx.lineTo(ox + cols * cell, oy + y * cell + 0.5); ctx.stroke(); if ((x + y) % 3 === 0) { ctx.beginPath(); ctx.moveTo(ox + x * cell + 0.5, oy + y * cell); ctx.lineTo(ox + x * cell + 0.5, oy + y * cell + cell); ctx.stroke(); } }
    else if (home.floor === 1) { ctx.strokeRect(ox + x * cell + 1, oy + y * cell + 1, cell - 2, cell - 2); }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(ox, oy, cols * cell, 8);
  ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 6; ctx.strokeRect(ox - 3, oy - 3, cols * cell + 6, rows * cell + 6);
  const sorted = [...home.items].sort((a, b) => (FURNITURE[a.id].layer === 'floor' ? -1 : 0) - (FURNITURE[b.id].layer === 'floor' ? -1 : 0) || a.y - b.y);
  for (const it of sorted) drawFurniture(ctx, it.id, ox + it.x * cell, oy + it.y * cell, cell, it.rot);
}
