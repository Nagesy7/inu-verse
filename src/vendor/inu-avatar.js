// inu-avatar.js: standalone renderer for the shared Inu character profile (v1). No dependencies.
//   import { drawInuAvatar, avatarCanvas } from "https://kibble-pay-<deploy>/inu-avatar.js";
//   drawInuAvatar(ctx, profile, x, y, { scale: 2, face: "down", frame: 0, shadow: true })
// (x, y) = feet centre. One "unit" = scale * 2 screen px, sprite is 18 x 22 units incl. a 1-unit outline. Crisp: integer px, no smoothing.
const shade = (hex, k) => { const n = parseInt(hex.slice(1), 16); const f = (v) => Math.max(0, Math.min(255, Math.round(v * k))); return "#" + [n >> 16, (n >> 8) & 255, n & 255].map((v) => f(v).toString(16).padStart(2, "0")).join(""); };
const SIZE = { small: 0.85, medium: 1, large: 1.15 };
const hash = (s) => { let h = 7; for (const ch of String(s)) h = (h * 31 + ch.charCodeAt(0)) >>> 0; return h; };
const autoCol = (o) => o?.c || ["#c8282e", "#2f6ad8", "#2f9a5a", "#d4a640", "#7c1e2c", "#1f2d5c"][hash(o?.id) % 6];
const mkCanvas = (w, h) => (typeof OffscreenCanvas !== "undefined" ? new OffscreenCanvas(w, h) : Object.assign(document.createElement("canvas"), { width: w, height: h }));
const cache = new Map();
export function drawInuAvatar(ctx, profile, x, y, { scale = 1, face = "down", frame = 0, shadow = true, outline = "#1a1424" } = {}) {
  const L = profile?.look || {}, u = Math.max(1, Math.round(2 * scale * (SIZE[L.size] || 1)));
  const key = JSON.stringify([L, profile?.outfit, face, frame % 4, outline]); let spr = cache.get(key);
  if (!spr) { spr = sprite(profile, face, frame, outline); if (cache.size > 300) cache.clear(); cache.set(key, spr); }
  const ox = Math.round(x - 9 * u), oy = Math.round(y - 22 * u);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (shadow) { ctx.fillStyle = "rgba(10,14,30,0.28)"; ctx.fillRect(ox + 4 * u, oy + 21 * u, 10 * u, u); }
  ctx.drawImage(spr, ox, oy, 18 * u, 22 * u); ctx.restore(); return { w: 18 * u, h: 22 * u };
}
// 18x22 px sprite (16x20 art + 1px outline margin), drawn once per look/face/frame
function sprite(profile, face, frame, outline) {
  const base = mkCanvas(18, 22), ctx = base.getContext("2d"), u = 1;
  const L = profile?.look || {}, O = profile?.outfit || {};
  const coat = L.coat || "#e8a25a", dark = shade(coat, 0.72), light = L.accent || "#fff6e8", eyeC = L.eyeColor || "#2a1a12";
  const side = face === "left" || face === "right", back = face === "up", flip = face === "left";
  const ox = 1, oy = 2;
  const P = (px, py, w, h, c) => { if (!c) return; ctx.fillStyle = c; const X = flip ? 16 - px - w : px; ctx.fillRect(ox + X * u, oy + py * u, w * u, h * u); };
  const step = frame % 4 === 1 ? 1 : frame % 4 === 3 ? -1 : 0, bob = frame % 2 ? 1 : 0;
  // tail (behind body unless facing up)
  const tail = () => { const t = L.tail || "curl", tx = side ? 2 : 12, c = coat;
    if (t === "curl") { P(tx, 9 + bob, 2, 3, c); P(tx + (side ? -1 : 1), 8 + bob, 2, 2, c); P(tx + (side ? -1 : 1), 8 + bob, 1, 1, light); }
    else if (t === "fluffy") { P(tx - 1, 8 + bob, 4, 4, c); P(tx, 8 + bob, 2, 1, light); }
    else if (t === "straight") P(side ? tx - 2 : tx, 11, 3, 1, c); else P(tx, 11, 2, 2, c); };
  if (!back) tail();
  // legs
  const sock = L.pattern === "socks" ? light : dark;
  P(4, 16, 2, 3 + (step > 0 ? 0 : 0), sock); P(10, 16, 2, 3, sock); if (step) { P(step > 0 ? 4 : 10, 18, 2, 1, null); P(step > 0 ? 4 : 10, 15, 2, 1, sock); }
  // body
  P(4, 9 + bob, 8, 8, coat); if (!back) P(6, 11 + bob, 4, 5, light);
  if (L.pattern === "saddle") P(4, 9 + bob, 8, 2, dark); if (L.pattern === "brindle") for (let r = 10; r < 17; r += 2) P(4, r + bob, 2, 1, dark), P(10, r + bob, 2, 1, dark);
  if (L.pattern === "spots") { P(5, 10 + bob, 1, 1, dark); P(10, 12 + bob, 2, 1, dark); P(4, 14 + bob, 1, 2, dark); }
  // outfit: bottom, top, feet, neck
  if (O.bottom && !O.top?.full) { P(4, 14 + bob, 8, 2, autoCol(O.bottom)); P(4, 16, 2, 1, autoCol(O.bottom)); P(10, 16, 2, 1, autoCol(O.bottom)); }
  if (O.top) { const c = autoCol(O.top), d = O.top.d || shade(c, 0.7); P(4, 9 + bob, 8, O.top.full ? 8 : 5, c); P(4, 13 + bob, 8, 1, d); if (!back && O.top.kind === "suit") P(7, 9 + bob, 2, 4, "#f4f1ea"); if (O.top.accent && !back) P(9, 10 + bob, 1, 1, O.top.accent); }
  if (O.feet) { P(4, 18, 2, 1, autoCol(O.feet)); P(10, 18, 2, 1, autoCol(O.feet)); }
  if (O.neck && !back) { if (O.neck.kind === 'scarf') { P(4, 9 + bob, 8, 2, autoCol(O.neck)); P(3, 10 + bob, 2, 4, autoCol(O.neck)); } else if (O.neck.kind === 'pin') P(9, 10 + bob, 2, 2, autoCol(O.neck)); else P(5, 9 + bob, 6, 1, autoCol(O.neck)); }
  if (back) tail();
  // head
  const hx = side ? 5 : 3, hy = 2 + bob;
  const ears = L.ears || "pointy";
  const ear = (ex) => { if (ears === "pointy") { P(ex, hy - 2, 2, 2, coat); P(ex, hy - 1, 1, 1, back ? coat : light); } else if (ears === "tall") { P(ex, hy - 3, 2, 3, coat); P(ex, hy - 2, 1, 2, back ? coat : light); } else if (ears === "folded") P(ex, hy - 1, 2, 1, dark); else P(ex + (ex < 8 ? -1 : 1), hy, 2, 4, dark); };
  if (side) ear(hx + 2); else { ear(hx + 1); ear(hx + 7); }
  P(hx, hy, side ? 9 : 10, 7, coat); P(hx, hy, 1, 1, null);
  if (!back) {
    if (side) { P(hx + 6, hy + 4, 4, 3, light); P(hx + 9, hy + 4, 1, 1, "#141018"); }
    else { P(hx + 2, hy + 4, 6, 3, light); P(hx + 4, hy + 4, 2, 1, "#141018"); }
    if (L.pattern === "mask") side ? P(hx + 3, hy + 2, 4, 2, dark) : P(hx + 1, hy + 2, 8, 2, dark);
    const mk = L.markings; const cx = side ? hx + 4 : hx + 4;
    if (mk === "star") { P(cx + 1, hy, 1, 1, light); P(cx, hy + 1, 3, 1, light); } else if (mk === "blaze") P(cx + (side ? 2 : 0), hy, 2, 4, light);
    else if (mk === "freckles") { P(hx + 2, hy + 5, 1, 1, dark); P(hx + 7, hy + 5, 1, 1, dark); } else if (mk === "heart") { P(cx, hy + 1, 1, 1, "#ff7aa8"); P(cx + 2, hy + 1, 1, 1, "#ff7aa8"); P(cx, hy + 2, 3, 1, "#ff7aa8"); P(cx + 1, hy + 3, 1, 1, "#ff7aa8"); }
    const eye = (ex) => { const sh = L.eyeShape || "round"; if (sh === "sleepy") P(ex, hy + 3, 2, 1, eyeC); else if (sh === "almond") { P(ex, hy + 2, 2, 1, eyeC); P(ex + 1, hy + 3, 1, 1, eyeC); } else { P(ex, hy + 2, 2, 2, eyeC); if (sh === "sparkle") P(ex, hy + 2, 1, 1, "#ffffff"); } };
    if (side) eye(hx + 5); else { eye(hx + 2); eye(hx + 6); }
    if (O.eyes) side ? P(hx + 4, hy + 2, 4, 2, autoCol(O.eyes)) : P(hx + 1, hy + 2, 8, 2, autoCol(O.eyes));
  }
  if (O.hat) { const c = autoCol(O.hat), d = O.hat.d || shade(c, 0.7); if (O.hat.kind === "tophat") { P(hx + 2, hy - 4, 6, 4, c); P(hx + 1, hy - 1, 8, 1, d); if (O.hat.accent) P(hx + 2, hy - 2, 6, 1, O.hat.accent); } else { P(hx + 1, hy - 1, 8, 2, c); if (!back) P(side ? hx + 8 : hx + 2, hy + 1, side ? 3 : 6, 1, d); } }
  if (!outline) return base;
  const out = mkCanvas(18, 22), o = out.getContext("2d"), sil = mkCanvas(18, 22), sc = sil.getContext("2d");
  sc.drawImage(base, 0, 0); sc.globalCompositeOperation = "source-in"; sc.fillStyle = outline; sc.fillRect(0, 0, 18, 22);
  for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) o.drawImage(sil, dx, dy); o.drawImage(base, 0, 0); return out;
}
export function avatarCanvas(profile, scale = 2, opts = {}) { const u = Math.round(2 * scale * 1.15), c = document.createElement("canvas"); c.width = 18 * u + 4; c.height = 23 * u + 4; drawInuAvatar(c.getContext("2d"), profile, c.width / 2, c.height - 2, { scale, ...opts }); return c; }
export const INU_AVATAR_VERSION = 1;
