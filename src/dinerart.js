// Café dish art: tiny original pixel dishes (cups, bowls, plates) drawn in world px on the café tables, in the waiter's paw and
// as menu icons. left: 1 = full .. 0 = empty plate (crumbs). No external art.
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
const LOOK = {
  pupLatte: { kind: 'cup', cup: '#f4efe6', fill: '#c69866', top: '#f8eedd', mark: '#a0704a' },
  matchaWag: { kind: 'cup', cup: '#f4efe6', fill: '#7fae4e', top: '#b9d98a' },
  berrySplash: { kind: 'glass', fill: '#6a7de0', top: '#b6c1ff', straw: '#ff7aa8' },
  pupuccino: { kind: 'cup', cup: '#ffd6e0', fill: '#ffffff', top: '#ffffff', mark: '#f2a3b4' },
  kibbleBowl: { kind: 'bowl', bowl: '#d9534f', fill: '#a5683a', bits: '#7a4a24' },
  chickBowl: { kind: 'bowl', bowl: '#3f7fbf', fill: '#f6f0dc', bits: '#e0a050' },
  brothBowl: { kind: 'bowl', bowl: '#e8d9b0', fill: '#d8a65a', bits: '#f2e2c0' },
  salmonBento: { kind: 'bento', box: '#2b2b3a', fill: '#f6f0dc', bits: '#ff8a65' },
  boneCookie: { kind: 'plate', fill: '#e2b46a', shape: 'bone' },
  pumpkinPup: { kind: 'plate', fill: '#f08a3c', top: '#fff2c8', shape: 'cake' },
  sakuraMochi: { kind: 'plate', fill: '#ffc2d4', top: '#8fc46a', shape: 'ball' },
  honeyScone: { kind: 'plate', fill: '#d9a44e', top: '#f2cc68', shape: 'cake' },
  peanutPops: { kind: 'plate', fill: '#b07a44', top: '#f2e2c0', shape: 'pops' },
};
export function drawDish(c, id, x, y, left = 1, t = 0, carried = false, k = 1) { if (k !== 1) { c.save(); c.translate(Math.round(x), Math.round(y)); c.scale(k, k); drawDish(c, id, 0, 0, left, t, carried); c.restore(); return; }
  const L = LOOK[id] || LOOK.kibbleBowl; x = Math.round(x); y = Math.round(y);
  if (carried) R(c, x - 6, y + 5, 12, 2, '#e8e2d4'); // tray
  if (L.kind === 'cup') { R(c, x - 3, y - 2, 7, 7, L.cup); R(c, x + 4, y, 2, 3, L.cup); if (left > 0) { R(c, x - 2, y - 1, 5, 1 + Math.round(3 * left), L.fill); R(c, x - 2, y - 1, 5, 1, L.top); if (L.mark && left > 0.6) R(c, x, y - 1, 1, 1, L.mark); }
    if (left > 0.3 && !carried) { const s = Math.sin(t * 3 + x) > 0 ? 1 : 0; R(c, x - 1 + s, y - 5, 1, 2, 'rgba(255,255,255,.55)'); } return; }
  if (L.kind === 'glass') { R(c, x - 3, y - 4, 6, 9, 'rgba(220,240,255,.7)'); if (left > 0) R(c, x - 2, y + 4 - Math.round(7 * left), 4, Math.round(7 * left) + 1, L.fill); R(c, x + 1, y - 7, 1, 5, L.straw); return; }
  if (L.kind === 'bowl') { if (left > 0) { R(c, x - 4, y - 1, 9, 2, L.fill); for (let i = 0; i < Math.ceil(4 * left); i++) R(c, x - 3 + i * 2, y - 2, 1, 1, L.bits); } R(c, x - 5, y + 1, 11, 3, L.bowl); R(c, x - 4, y + 4, 9, 1, L.bowl); return; }
  if (L.kind === 'bento') { R(c, x - 6, y - 2, 12, 7, L.box); if (left > 0) { R(c, x - 5, y - 1, 5, 5, L.fill); if (left > 0.4) R(c, x + 1, y - 1, 4, 5, L.bits); } return; }
  // plate
  R(c, x - 6, y + 3, 12, 2, '#f4efe6'); R(c, x - 5, y + 5, 10, 1, '#c9c2b2');
  if (left <= 0) { R(c, x - 2, y + 2, 1, 1, L.fill); R(c, x + 2, y + 2, 1, 1, L.fill); return; }
  const n = Math.max(1, Math.ceil(3 * left));
  for (let i = 0; i < n; i++) { const px = x - 4 + i * 3;
    if (L.shape === 'bone') { R(c, px, y, 3, 1, L.fill); R(c, px - 1, y - 1, 1, 1, L.fill); R(c, px + 3, y + 1, 1, 1, L.fill); }
    else if (L.shape === 'ball') { R(c, px, y - 1, 3, 3, L.fill); R(c, px + 1, y - 2, 1, 1, L.top); }
    else if (L.shape === 'pops') { R(c, px + 1, y - 4, 1, 4, L.top); R(c, px, y - 2, 3, 3, L.fill); }
    else { R(c, px, y - 1, 3, 3, L.fill); R(c, px, y - 2, 3, 1, L.top); } } }
// menu icon (panel): same dish, scaled up on a little table cloth
export function drawDishIcon(c, id, w = 40, h = 32) { c.imageSmoothingEnabled = false; R(c, 0, h - 8, w, 8, '#f2e2c0'); R(c, 0, h - 8, w, 1, '#d4a640'); c.save(); c.translate(w / 2, h / 2 - 2); c.scale(2, 2); drawDish(c, id, 0, 0, 1, 0); c.restore(); }
