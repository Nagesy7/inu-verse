// Unique outdoor façades: silhouette + function color so each building reads as what it is before the sign.
// Warm café, bold car dealer, bright arcade (arcadeart.js), serious bank (doorart.js), playful fashion, etc.
// NOT shared cream/$KIBBLE chrome — create/landing stays cream; buildings keep distinct identities.
import { TILE, DOORS } from './world.js';

export const INK = '#141a2e';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const night = () => !!globalThis.__inuNight;
const txt = (c, s, x, y, size, col) => {
  c.font = `${size}px Silkscreen, monospace`; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillStyle = INK; c.fillText(s, Math.round(x) + 1, Math.round(y) + 1);
  c.fillStyle = col; c.fillText(s, Math.round(x), Math.round(y));
};
const shade = (hex, f) => { const n = parseInt(hex.slice(1), 16); const ch = (v) => Math.max(0, Math.min(255, Math.round(v * f))); return '#' + [(n >> 16) & 255, (n >> 8) & 255, n & 255].map((v) => ch(v).toString(16).padStart(2, '0')).join(''); };

// Function color identities — wall/roof/accent/signBg/sign/glow. Color alone should telegraph the use.
export const FUNC = Object.freeze({
  cafe:     { wall: '#c45a3a', roof: '#6e2a1c', accent: '#ffb48a', trim: '#fff1d8', signBg: '#5a2218', sign: '#ffe0b0', glow: '#ffc078', tag: 'warm' },
  shop:     { wall: '#2a7a6e', roof: '#164840', accent: '#9fe3d0', trim: '#d8fff4', signBg: '#0e3a34', sign: '#b8ffe8', glow: '#7ad8c0', tag: 'soft-teal' },
  fashion:  { wall: '#d85a9a', roof: '#7a2858', accent: '#ffb0e0', trim: '#ffe8f6', signBg: '#4a1840', sign: '#ffd0f0', glow: '#ff8ac8', tag: 'playful' },
  launch:   { wall: '#1e4a9a', roof: '#0e2858', accent: '#7ec8ff', trim: '#e8f6ff', signBg: '#0a1e48', sign: '#a8e0ff', glow: '#4aa8ff', tag: 'tech-blue' },
  cars:     { wall: '#2a2a32', roof: '#121218', accent: '#ff3a3a', trim: '#f0f0f4', signBg: '#c8282e', sign: '#fff2a0', glow: '#ffd84a', tag: 'sporty' },
  academy:  { wall: '#3a7a48', roof: '#1e4830', accent: '#c8e890', trim: '#f4f0d8', signBg: '#1a3a24', sign: '#e8ffb0', glow: '#a0d860', tag: 'school-green' },
  jewel:    { wall: '#1e3a6a', roof: '#0e1e40', accent: '#9fd8ff', trim: '#e8f6ff', signBg: '#0a1838', sign: '#c8ecff', glow: '#70c0ff', tag: 'sapphire' },
  designer: { wall: '#8a3a9a', roof: '#4a1858', accent: '#e8a0ff', trim: '#f8e8ff', signBg: '#301040', sign: '#f0c8ff', glow: '#c070e8', tag: 'playful-plum' },
  goldden:  { wall: '#a86830', roof: '#5a3818', accent: '#ffd878', trim: '#fff4d0', signBg: '#3a2410', sign: '#ffe8a0', glow: '#e8b850', tag: 'amber' },
  luxauto:  { wall: '#181820', roof: '#08080c', accent: '#e3b341', trim: '#f8f0d8', signBg: '#c8282e', sign: '#ffe08a', glow: '#ffd84a', tag: 'luxury-sport' },
  office:   { wall: '#3a2a5a', roof: '#1a1030', accent: '#e3b341', trim: '#f0e8d0', signBg: '#1a1030', sign: '#ffe08a', glow: '#c8a040', tag: 'presidential' },
  petshop:  { wall: '#3a9aaa', roof: '#1e5860', accent: '#ffd84a', trim: '#e8fff8', signBg: '#184850', sign: '#fff0a0', glow: '#7ad0e0', tag: 'playful-teal' },
  cosy:     { wall: '#c87848', roof: '#6a3a22', accent: '#ffd8a0', trim: '#fff4e0', signBg: '#4a2818', sign: '#ffe8c0', glow: '#e8a868', tag: 'honey' },
  royal:    { wall: '#4a2a6a', roof: '#221038', accent: '#e3b341', trim: '#f4ead8', signBg: '#1a0c28', sign: '#ffe08a', glow: '#c09040', tag: 'regal' },
  clubhouse:{ wall: '#8a4a2a', roof: '#4a2818', accent: '#e8c070', trim: '#f4e8d0', signBg: '#2a1810', sign: '#ffe0a0', glow: '#c89050', tag: 'timber' },
  mall:     { wall: '#e8e0d0', roof: '#4aa090', accent: '#e3b341', trim: '#ffffff', signBg: '#2a1a4a', sign: '#ffe08a', glow: '#ffe08a', tag: 'marble-gold' },
  bank:     { wall: '#d0c4a8', roof: '#1f2d5c', accent: '#d4a640', trim: '#f4ead4', signBg: '#1f2d5c', sign: '#ffd84a', glow: '#fff', tag: 'serious' },
  arcade:   { wall: '#1c1638', roof: '#2c2258', accent: '#ff4fd8', trim: '#3af0ff', signBg: '#3a0f4a', sign: '#3af0ff', glow: '#ffe14a', tag: 'bright-neon' },
  clinic:   { wall: '#f4f1ea', roof: '#2f7f8f', accent: '#7fd1b9', trim: '#ffffff', signBg: '#141a2e', sign: '#7fd1b9', glow: '#7fd1b9', tag: 'mint-clinic' },
});

// Shop / item category colors (UI cards) — same function language as façades.
export const CAT_COLOR = Object.freeze({
  outfit:    { border: '#d85a9a', bg: '#3a1830', chip: '#ffb0e0', label: 'Fashion' },
  jewelry:   { border: '#4a8ad0', bg: '#142848', chip: '#9fd8ff', label: 'Jewelry' },
  furniture: { border: '#a86830', bg: '#2a1c10', chip: '#ffd878', label: 'Furniture' },
  car:       { border: '#c8282e', bg: '#201018', chip: '#ffd84a', label: 'Autos' },
  pets:      { border: '#3a9aaa', bg: '#102830', chip: '#ffd84a', label: 'Pets' },
  furn_cosy: { border: '#c87848', bg: '#2a1810', chip: '#ffd8a0', label: 'Cosy' },
  furn_royal:{ border: '#8a5ad0', bg: '#1a1030', chip: '#e3b341', label: 'Royal' },
  all:       { border: '#e3b341', bg: '#1a1430', chip: '#ffe08a', label: 'Mall' },
  office:    { border: '#e3b341', bg: '#1a1030', chip: '#ffe08a', label: 'Office' },
  board:     { border: '#e3b341', bg: '#1a1430', chip: '#ffe08a', label: 'Pools' },
  leaders:   { border: '#7fb4ff', bg: '#121a36', chip: '#cfe8ff', label: 'Leaders' },
});
export const catStyle = (cat) => CAT_COLOR[cat] || CAT_COLOR.all;

function doorXY(b) {
  const d = DOORS[b.id];
  if (!d) return { side: 'front', dx: Math.floor(b.w / 2) };
  return d;
}

function shadow(c, x, y, w, h) { c.save(); c.globalAlpha = 0.28; R(c, x + 4, y + h - 2, w, 8, '#000'); c.restore(); }

function signboard(c, cx, y, label, F, maxW) {
  const w = Math.min(maxW, Math.max(72, label.length * 9 + 16)), h = 22;
  R(c, cx - w / 2 - 3, y - 3, w + 6, h + 6, INK);
  R(c, cx - w / 2 - 2, y - 2, w + 4, h + 4, F.accent);
  R(c, cx - w / 2, y, w, h, F.signBg);
  txt(c, label.toUpperCase(), cx, y + h / 2 + 1, Math.min(12, Math.floor(w / (label.length * 0.7))), F.sign);
}

function frontDoor(c, dx, base, F, { striped = false, glass = false, w = 28, h = 36 } = {}) {
  R(c, dx - w / 2 - 2, base - h - 2, w + 4, h + 2, INK);
  if (glass) {
    R(c, dx - w / 2, base - h, w, h, F.trim);
    R(c, dx - w / 2 + 2, base - h + 2, w / 2 - 3, h - 4, night() ? '#ffe08a' : '#9fd8f5');
    R(c, dx + 1, base - h + 2, w / 2 - 3, h - 4, night() ? '#ffe08a' : '#9fd8f5');
    R(c, dx - 1, base - h, 2, h, F.accent);
  } else {
    R(c, dx - w / 2, base - h, w, h, '#5a3a1a');
    R(c, dx - 1, base - h, 2, h, shade('#5a3a1a', 0.7));
    R(c, dx - w / 2 + 4, base - h + 4, w / 2 - 8, 12, night() ? '#ffd27a' : '#a8d4f4');
    R(c, dx + 4, base - h + 4, w / 2 - 8, 12, night() ? '#ffd27a' : '#a8d4f4');
    R(c, dx + (w > 20 ? 6 : 4), base - h / 2, 3, 3, F.accent);
  }
  if (striped) {
    const aW = w + 18, aY = base - h - 12;
    for (let i = 0; i < 8; i++) R(c, dx - aW / 2 + i * (aW / 8), aY, aW / 8 + 1, 10, i % 2 ? F.trim : F.accent);
    R(c, dx - aW / 2, aY + 10, aW, 2, INK);
  }
  R(c, dx - w / 2 - 6, base, w + 12, 4, '#b8b0a2');
  R(c, dx - w / 2 - 4, base + 4, w + 8, 3, '#857ca0');
}

function awning(c, x, y, w, a, b, scallop = true) {
  for (let i = 0; i < w; i += 10) R(c, x + i, y, 10, 14, (i / 10 | 0) % 2 ? a : b);
  R(c, x, y, w, 2, 'rgba(255,255,255,0.35)');
  R(c, x - 1, y - 2, w + 2, 3, INK);
  if (scallop) for (let i = 0; i < w; i += 10) R(c, x + i + 2, y + 14, 6, 3, (i / 10 | 0) % 2 ? a : b);
}

function win(c, x, y, w, h, F, { mullion = true } = {}) {
  R(c, x - 2, y - 2, w + 4, h + 4, INK);
  R(c, x - 1, y - 1, w + 2, h + 2, F.trim);
  R(c, x, y, w, h, night() ? '#ffd27a' : '#8cc4e8');
  R(c, x, y, w, 3, night() ? '#fff0b8' : '#c4e4f8');
  if (mullion) { R(c, x + w / 2 - 1, y, 2, h, F.trim); R(c, x, y + h / 2 - 1, w, 2, F.trim); }
  R(c, x - 3, y + h + 1, w + 6, 3, shade(F.wall, 0.75));
}

// ---------- type-specific silhouettes ----------
function cafeFacade(c, b, F) {
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, base = y + h, d = doorXY(b);
  const dx = d.side === 'front' ? (b.x + d.dx + 0.5) * TILE : x + w / 2;
  shadow(c, x, y, w, h);
  // warm cottage body + terracotta tile roof with chimney
  R(c, x - 2, y + 28, w + 4, h - 28, INK);
  R(c, x, y + 30, w, h - 30, F.wall);
  for (let r = y + 36; r < base - 8; r += 8) R(c, x, r, w, 1, shade(F.wall, 0.85));
  R(c, x, y + 30, w, 3, F.trim);
  // pitched roof
  c.fillStyle = INK; c.beginPath(); c.moveTo(x - 8, y + 34); c.lineTo(x + w / 2, y - 8); c.lineTo(x + w + 8, y + 34); c.fill();
  c.fillStyle = F.roof; c.beginPath(); c.moveTo(x - 4, y + 32); c.lineTo(x + w / 2, y - 4); c.lineTo(x + w + 4, y + 32); c.fill();
  for (let i = 0; i < 6; i++) R(c, x + 8 + i * ((w - 16) / 6), y + 8 + Math.abs(i - 2.5) * 4, (w - 16) / 6 - 2, 3, shade(F.roof, 1.15));
  R(c, x + w - 36, y - 18, 14, 28, F.roof); R(c, x + w - 34, y - 16, 10, 10, '#3a2218'); // chimney
  R(c, x + w - 32, y - 22, 6, 6, '#c8c8c8'); R(c, x + w - 30, y - 28, 2, 6, '#a0a0a8');
  // full-width striped café awning
  awning(c, x + 6, y + 48, w - 12, F.accent, F.trim);
  // big café windows with cups / pastry silhouettes
  for (const wx of [x + 10, x + w / 2 - 18, x + w - 46].filter((wx) => Math.abs(wx + 18 - dx) > 28)) {
    win(c, wx, y + 70, 36, 28, F, { mullion: false });
    R(c, wx + 6, y + 88, 8, 6, F.accent); R(c, wx + 18, y + 86, 10, 8, F.trim); R(c, wx + 20, y + 84, 6, 2, F.accent); // cups + cake
  }
  frontDoor(c, dx, base, F, { striped: true, w: 26, h: 34 });
  // outdoor seating (tables + chairs) — silhouette cue
  for (const tx of [x + 8, x + w - 40]) {
    if (Math.abs(tx + 16 - dx) < 36) continue;
    R(c, tx + 10, base - 14, 16, 3, F.trim); R(c, tx + 16, base - 12, 4, 12, shade(F.wall, 0.7)); // table
    R(c, tx + 2, base - 10, 8, 2, F.accent); R(c, tx + 4, base - 8, 2, 8, shade(F.wall, 0.6));
    R(c, tx + 28, base - 10, 8, 2, F.accent); R(c, tx + 30, base - 8, 2, 8, shade(F.wall, 0.6));
    R(c, tx + 14, base - 18, 6, 4, F.accent); // latte
  }
  // flower boxes
  for (const fx of [x + 4, x + w - 28]) { R(c, fx, base - 8, 24, 8, '#5a3a1a'); for (let i = 0; i < 5; i++) R(c, fx + 2 + i * 4, base - 12, 3, 4, ['#ff8fb6', '#ffd84a', '#ff8fb6', '#7ad878', '#ff8fb6'][i]); }
  signboard(c, x + w / 2, y + 18, b.name, F, w - 20);
}

function carsFacade(c, b, F) {
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, base = y + h, d = doorXY(b);
  const dx = d.side === 'front' ? (b.x + d.dx + 0.5) * TILE : x + w * 0.25;
  shadow(c, x, y, w, h);
  // flat modern dealership + bold red stripe
  R(c, x - 2, y + 16, w + 4, h - 16, INK);
  R(c, x, y + 18, w, h - 18, F.wall);
  R(c, x, y + 18, w, 10, F.accent); R(c, x, y + 18, w, 2, F.sign); // sporty stripe
  R(c, x - 4, y + 8, w + 8, 12, INK); R(c, x - 2, y + 10, w + 4, 8, '#3a3a44'); // flat roof slab
  for (let i = 0; i < w; i += 20) R(c, x + i, y + 10, 10, 8, '#2a2a32');
  // giant showroom glass with cars inside
  const gx = x + 8, gy = y + 40, gw = w - 50, gh = h - 52;
  R(c, gx - 2, gy - 2, gw + 4, gh + 4, INK); R(c, gx, gy, gw, gh, '#0e1218');
  R(c, gx + 2, gy + 2, gw - 4, gh - 4, night() ? '#2a2030' : '#1a3048');
  // car silhouettes in the glass
  for (let i = 0; i < 3; i++) {
    const cx = gx + 18 + i * ((gw - 36) / 2), cy = gy + gh - 18, col = ['#c8282e', '#2f6fbd', '#e3b341'][i];
    R(c, cx - 16, cy - 10, 32, 10, col); R(c, cx - 12, cy - 18, 24, 8, col); R(c, cx - 10, cy - 16, 8, 5, '#9fd8f5'); R(c, cx + 2, cy - 16, 8, 5, '#9fd8f5');
    R(c, cx - 14, cy - 2, 8, 4, INK); R(c, cx + 6, cy - 2, 8, 4, INK);
  }
  R(c, gx + 4, gy + 4, 10, 14, 'rgba(255,255,255,0.25)'); // glass glint
  // service bay roll-up
  const bx = x + w - 40, by = y + 48;
  R(c, bx - 2, by - 2, 36, base - by + 2, INK); R(c, bx, by, 32, base - by, '#1a1a22');
  for (let k = 0; k < 10; k++) R(c, bx, by + k * 6, 32, 3, k % 2 ? '#3a3a44' : '#2a2a32');
  R(c, bx + 8, by - 10, 16, 8, F.accent); txt(c, 'BAY', bx + 16, by - 5, 6, F.sign);
  frontDoor(c, dx, base, F, { glass: true, w: 24, h: 32 });
  // racing chevrons on roof edge
  for (let i = 0; i < 5; i++) { R(c, x + 20 + i * 28, y + 22, 12, 4, i % 2 ? F.accent : F.sign); }
  signboard(c, x + w / 2, y - 4, b.name, F, w - 16);
}

function fashionFacade(c, b, F) {
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, base = y + h;
  shadow(c, x, y, w, h);
  // playful boutique: curved canopy, tall display windows, mannequins
  R(c, x - 2, y + 24, w + 4, h - 24, INK);
  R(c, x, y + 26, w, h - 26, F.wall);
  for (let r = 0; r < 4; r++) R(c, x + 4 + r * 6, y + 30 + r, w - 8 - r * 12, 2, shade(F.wall, 1.15));
  // scalloped canopy roof
  R(c, x - 6, y + 14, w + 12, 16, INK); R(c, x - 4, y + 16, w + 8, 12, F.roof);
  for (let i = 0; i < w + 8; i += 12) R(c, x - 4 + i, y + 28, 10, 6, F.accent);
  awning(c, x + 4, y + 42, w - 8, F.accent, F.trim);
  // tall display windows with mannequin silhouettes
  for (const wx of [x + 8, x + w / 2 - 16]) {
    win(c, wx, y + 64, 32, 48, F, { mullion: false });
    R(c, wx + 12, y + 78, 8, 20, F.trim); R(c, wx + 10, y + 72, 12, 8, F.accent); // mannequin
    R(c, wx + 8, y + 98, 16, 4, F.accent); // base
  }
  // hanging garment banners
  for (const bx of [x + w - 22, x + 4]) {
    R(c, bx + 8, y + 50, 2, 40, INK); R(c, bx, y + 52, 18, 28, F.signBg); R(c, bx + 2, y + 54, 14, 10, F.accent); R(c, bx + 4, y + 68, 10, 8, F.trim);
  }
  signboard(c, x + w / 2, y + 4, b.name, F, w - 12);
  // side porch door is drawn by render.js sidePorch for fashion (right)
}

function launchFacade(c, b, F) {
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, base = y + h, d = doorXY(b);
  const dx = (b.x + (d.dx ?? Math.floor(b.w / 2)) + 0.5) * TILE;
  shadow(c, x, y, w, h);
  // hangar hall + control tower + antenna — tech silhouette
  R(c, x - 2, y + 36, w + 4, h - 36, INK);
  R(c, x, y + 38, w, h - 38, F.wall);
  R(c, x, y + 38, w, 4, F.accent);
  // barrel hangar roof
  c.fillStyle = INK; c.beginPath(); c.ellipse(x + w / 2, y + 40, w / 2 + 4, 28, 0, Math.PI, 0); c.fill();
  c.fillStyle = F.roof; c.beginPath(); c.ellipse(x + w / 2, y + 40, w / 2 + 1, 25, 0, Math.PI, 0); c.fill();
  for (let k = -3; k <= 3; k++) R(c, x + w / 2 + k * (w / 8) - 1, y + 18 + Math.abs(k) * 3, 2, 22 - Math.abs(k) * 3, F.accent);
  // control tower (left)
  R(c, x + 8, y - 20, 28, 60, INK); R(c, x + 10, y - 18, 24, 56, shade(F.wall, 1.1));
  R(c, x + 10, y - 18, 24, 14, F.accent); win(c, x + 14, y - 12, 16, 10, F);
  R(c, x + 20, y - 36, 4, 18, F.trim); R(c, x + 16, y - 40, 12, 4, F.accent); // antenna
  // countdown / LED board
  R(c, x + w / 2 - 50, y + 48, 100, 18, INK); R(c, x + w / 2 - 48, y + 50, 96, 14, F.signBg);
  txt(c, 'LAUNCH HALL', x + w / 2, y + 58, 10, F.sign);
  // hangar bay doors (segmented)
  const bayW = w - 80, bayX = x + 40;
  R(c, bayX - 2, y + 72, bayW + 4, base - y - 72, INK);
  for (let i = 0; i < 6; i++) R(c, bayX + i * (bayW / 6), y + 74, bayW / 6 - 2, base - y - 78, i % 2 ? shade(F.wall, 0.85) : shade(F.wall, 0.7));
  frontDoor(c, dx, base, F, { glass: true, w: 30, h: 36 });
  // rocket fin motif on roof
  R(c, x + w - 40, y + 8, 8, 24, F.accent); R(c, x + w - 48, y + 20, 24, 6, F.trim);
  signboard(c, x + w / 2, y - 8, b.name, F, w - 40);
}

function shopFacade(c, b, F) {
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, base = y + h, d = doorXY(b);
  const dx = d.side === 'front' ? (b.x + d.dx + 0.5) * TILE : x + w / 2;
  shadow(c, x, y, w, h);
  // furniture store: deep bay windows with sofa/bed shapes, soft canopy
  R(c, x - 2, y + 22, w + 4, h - 22, INK);
  R(c, x, y + 24, w, h - 24, F.wall);
  R(c, x - 6, y + 10, w + 12, 18, INK); R(c, x - 4, y + 12, w + 8, 14, F.roof);
  for (let i = 0; i < w + 8; i += 14) R(c, x - 4 + i, y + 12, 7, 14, shade(F.roof, 1.2));
  awning(c, x + 8, y + 40, w - 16, F.accent, F.trim);
  // bay window left (sofa)
  const bay = (wx, kind) => {
    R(c, wx - 4, y + 58, 52, 50, INK); R(c, wx - 2, y + 60, 48, 46, F.trim);
    R(c, wx, y + 62, 44, 40, night() ? '#ffe08a' : '#cfe8f0');
    if (kind === 'sofa') { R(c, wx + 4, y + 82, 36, 14, F.accent); R(c, wx + 4, y + 78, 8, 18, F.accent); R(c, wx + 32, y + 78, 8, 18, F.accent); }
    else { R(c, wx + 6, y + 78, 32, 18, F.accent); R(c, wx + 4, y + 74, 36, 6, F.trim); R(c, wx + 10, y + 70, 8, 6, F.trim); R(c, wx + 26, y + 70, 8, 6, F.trim); }
  };
  if (Math.abs(x + 30 - dx) > 40) bay(x + 10, 'sofa');
  if (Math.abs(x + w - 50 - dx) > 40) bay(x + w - 54, 'bed');
  frontDoor(c, dx, base, F, { striped: true, w: 28, h: 36 });
  // stacked cushion props by door
  for (const [px, py] of [[dx - 40, base - 16], [dx + 28, base - 16]]) {
    if (px < x + 4 || px > x + w - 20) continue;
    R(c, px, py, 16, 10, F.accent); R(c, px + 2, py - 6, 12, 8, F.trim); R(c, px + 4, py - 10, 8, 6, shade(F.accent, 0.85));
  }
  signboard(c, x + w / 2, y + 2, b.name, F, w - 16);
}

function academyFacade(c, b, F) {
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, base = y + h, d = doorXY(b);
  const dx = (b.x + (d.dx ?? 4) + 0.5) * TILE;
  shadow(c, x, y, w, h);
  // schoolhouse: cupola + bell, flag, row of classroom windows, steps
  R(c, x - 2, y + 30, w + 4, h - 30, INK);
  R(c, x, y + 32, w, h - 32, F.wall);
  c.fillStyle = INK; c.beginPath(); c.moveTo(x - 8, y + 36); c.lineTo(x + w / 2, y + 4); c.lineTo(x + w + 8, y + 36); c.fill();
  c.fillStyle = F.roof; c.beginPath(); c.moveTo(x - 4, y + 34); c.lineTo(x + w / 2, y + 8); c.lineTo(x + w + 4, y + 34); c.fill();
  // cupola + bell
  R(c, x + w / 2 - 14, y - 18, 28, 30, INK); R(c, x + w / 2 - 12, y - 16, 24, 26, F.trim);
  c.fillStyle = F.roof; c.beginPath(); c.moveTo(x + w / 2 - 16, y - 14); c.lineTo(x + w / 2, y - 32); c.lineTo(x + w / 2 + 16, y - 14); c.fill();
  R(c, x + w / 2 - 6, y - 8, 12, 10, F.accent); R(c, x + w / 2 - 4, y - 6, 8, 6, '#e3b341'); // bell
  R(c, x + w / 2 + 18, y - 20, 3, 36, F.trim); // flagpole
  R(c, x + w / 2 + 21, y - 20, 18, 10, F.accent); R(c, x + w / 2 + 21, y - 14, 12, 4, F.sign);
  // classroom window row
  for (let i = 0; i < 5; i++) {
    const wx = x + 12 + i * ((w - 24) / 5);
    if (Math.abs(wx + 12 - dx) < 22) continue;
    win(c, wx, y + 48, 22, 18, F);
  }
  // double school doors + steps
  frontDoor(c, dx, base - 8, F, { w: 36, h: 40 });
  for (let s = 0; s < 3; s++) R(c, dx - 28 - s * 4, base - 6 + s * 4, 56 + s * 8, 4, s % 2 ? F.trim : shade(F.trim, 0.85));
  signboard(c, x + w / 2, y + 20, b.name, F, w - 24);
}

function jewelFacade(c, b, F) {
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, base = y + h;
  shadow(c, x, y, w, h);
  // sapphire boutique: vault-like stone, diamond window, display pedestals
  R(c, x - 2, y + 20, w + 4, h - 20, INK);
  R(c, x, y + 22, w, h - 22, F.wall);
  for (let r = y + 28; r < base; r += 10) for (let xx = x; xx < x + w; xx += 18) R(c, xx, r, 16, 8, shade(F.wall, 1.08));
  c.fillStyle = INK; c.beginPath(); c.moveTo(x - 6, y + 24); c.lineTo(x + w / 2, y - 6); c.lineTo(x + w + 6, y + 24); c.fill();
  c.fillStyle = F.roof; c.beginPath(); c.moveTo(x - 2, y + 22); c.lineTo(x + w / 2, y - 2); c.lineTo(x + w + 2, y + 22); c.fill();
  // diamond emblem
  c.fillStyle = F.accent; c.beginPath(); c.moveTo(x + w / 2, y + 28); c.lineTo(x + w / 2 + 10, y + 40); c.lineTo(x + w / 2, y + 52); c.lineTo(x + w / 2 - 10, y + 40); c.fill();
  // display case windows
  for (const wx of [x + 10, x + w - 50]) {
    win(c, wx, y + 60, 40, 36, F, { mullion: false });
    R(c, wx + 8, y + 84, 10, 8, F.accent); R(c, wx + 22, y + 80, 12, 12, '#e3b341'); R(c, wx + 24, y + 82, 8, 8, F.trim);
  }
  signboard(c, x + w / 2, y + 8, b.name, F, w - 16);
}

function designerFacade(c, b, F) {
  fashionFacade(c, b, F);
  const d = doorXY(b), base = (b.y + b.h) * TILE;
  if (d.side === 'front') frontDoor(c, (b.x + d.dx + 0.5) * TILE, base, F, { striped: true, glass: true, w: 26, h: 34 });
}

function golddenFacade(c, b, F) {
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, base = y + h;
  shadow(c, x, y, w, h);
  R(c, x - 2, y + 22, w + 4, h - 22, INK);
  R(c, x, y + 24, w, h - 24, F.wall);
  R(c, x - 6, y + 8, w + 12, 20, INK); R(c, x - 4, y + 10, w + 8, 16, F.roof);
  for (let i = 0; i < w + 8; i += 12) R(c, x - 4 + i, y + 10, 6, 16, F.accent);
  awning(c, x + 6, y + 40, w - 12, F.accent, F.trim);
  for (const wx of [x + 8, x + w / 2 - 20]) {
    win(c, wx, y + 62, 40, 40, F, { mullion: false });
    R(c, wx + 6, y + 84, 28, 12, F.accent); R(c, wx + 10, y + 78, 8, 18, F.trim); R(c, wx + 26, y + 78, 8, 18, F.trim); // throne/sofa
  }
  signboard(c, x + w / 2, y + 2, b.name, F, w - 14);
}

function luxautoFacade(c, b, F) {
  // same dealership language as cars, darker + gold chrome
  carsFacade(c, b, F);
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE;
  // gold valet canopy strip
  R(c, x + 20, y + 34, w - 60, 6, F.accent); R(c, x + 20, y + 34, w - 60, 2, F.trim);
}

function officeFacade(c, b, F) {
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, base = y + h;
  shadow(c, x, y, w, h);
  R(c, x - 2, y + 18, w + 4, h - 18, INK);
  R(c, x, y + 20, w, h - 20, F.wall);
  // pediment + columns (presidential)
  c.fillStyle = INK; c.beginPath(); c.moveTo(x - 8, y + 22); c.lineTo(x + w / 2, y - 10); c.lineTo(x + w + 8, y + 22); c.fill();
  c.fillStyle = F.trim; c.beginPath(); c.moveTo(x - 4, y + 20); c.lineTo(x + w / 2, y - 6); c.lineTo(x + w + 4, y + 20); c.fill();
  R(c, x + w / 2 - 10, y - 2, 20, 14, F.accent); R(c, x + w / 2 - 6, y + 2, 12, 8, F.signBg); // seal
  for (let i = 0; i < 6; i++) {
    const cx = x + 16 + i * ((w - 32) / 5);
    R(c, cx, y + 36, 10, h - 44, F.trim); R(c, cx + 2, y + 36, 3, h - 44, '#ffffff'); R(c, cx - 2, y + 34, 14, 4, F.accent); R(c, cx - 2, base - 8, 14, 4, F.accent);
  }
  frontDoor(c, x + w / 2, base, F, { glass: true, w: 32, h: 36 });
  signboard(c, x + w / 2, y + 24, b.name, F, w - 40);
}

function petshopFacade(c, b, F) {
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, base = y + h, d = doorXY(b);
  const dx = d.side === 'front' ? (b.x + d.dx + 0.5) * TILE : x + w / 2;
  shadow(c, x, y, w, h);
  R(c, x - 2, y + 24, w + 4, h - 24, INK);
  R(c, x, y + 26, w, h - 26, F.wall);
  // bone-shaped roof ridge
  R(c, x - 4, y + 12, w + 8, 16, INK); R(c, x - 2, y + 14, w + 4, 12, F.roof);
  R(c, x + 8, y + 8, 14, 14, F.accent); R(c, x + w - 22, y + 8, 14, 14, F.accent); R(c, x + 16, y + 12, w - 32, 10, F.accent); // bone
  awning(c, x + 6, y + 42, w - 12, F.accent, F.trim);
  for (const wx of [x + 8, x + w - 48]) {
    if (Math.abs(wx + 20 - dx) < 30) continue;
    win(c, wx, y + 64, 40, 36, F, { mullion: false });
    // pup silhouette in window
    R(c, wx + 12, y + 84, 16, 10, '#e8a050'); R(c, wx + 10, y + 78, 8, 8, '#e8a050'); R(c, wx + 22, y + 78, 8, 8, '#e8a050');
    R(c, wx + 14, y + 82, 2, 2, INK); R(c, wx + 22, y + 82, 2, 2, INK);
  }
  frontDoor(c, dx, base, F, { striped: true });
  // paw prints on facade
  for (const [px, py] of [[x + 20, y + 50], [x + w - 30, y + 54], [x + w / 2, y + 48]]) {
    R(c, px, py, 6, 5, F.accent); for (const [ox, oy] of [[-4, -3], [0, -5], [4, -3], [6, 0]]) R(c, px + ox, py + oy, 3, 3, F.accent);
  }
  signboard(c, x + w / 2, y + 2, b.name, F, w - 14);
}

function cosyFacade(c, b, F) {
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, base = y + h;
  shadow(c, x, y, w, h);
  R(c, x - 2, y + 28, w + 4, h - 28, INK);
  R(c, x, y + 30, w, h - 30, F.wall);
  c.fillStyle = INK; c.beginPath(); c.moveTo(x - 6, y + 34); c.lineTo(x + w / 2, y + 2); c.lineTo(x + w + 6, y + 34); c.fill();
  c.fillStyle = F.roof; c.beginPath(); c.moveTo(x - 2, y + 32); c.lineTo(x + w / 2, y + 6); c.lineTo(x + w + 2, y + 32); c.fill();
  awning(c, x + 4, y + 44, w - 8, F.accent, F.trim);
  win(c, x + 8, y + 64, w - 16, 36, F, { mullion: false });
  R(c, x + 14, y + 84, w - 28, 12, F.accent); // cosy sofa in window
  R(c, x + 4, base - 10, w - 8, 8, '#5a3a1a'); for (let i = 0; i < 6; i++) R(c, x + 8 + i * ((w - 16) / 6), base - 14, 4, 4, ['#ff8fb6', '#7ad878', '#ffd84a'][i % 3]);
  signboard(c, x + w / 2, y + 14, b.name, F, w - 10);
}

function royalFacade(c, b, F) {
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, base = y + h;
  shadow(c, x, y, w, h);
  R(c, x - 2, y + 26, w + 4, h - 26, INK);
  R(c, x, y + 28, w, h - 28, F.wall);
  // mansard roof
  R(c, x - 8, y + 8, w + 16, 24, INK); R(c, x - 6, y + 10, w + 12, 20, F.roof);
  for (let i = 0; i < 4; i++) win(c, x + 16 + i * ((w - 32) / 4), y + 14, 12, 10, F);
  R(c, x + w / 2 - 8, y - 4, 16, 14, F.accent); // crown finial
  for (let i = 0; i < 3; i++) R(c, x + w / 2 - 6 + i * 5, y - 8, 3, 4, F.sign);
  awning(c, x + 10, y + 48, w - 20, F.accent, F.trim);
  win(c, x + 10, y + 66, w - 20, 40, F, { mullion: true });
  R(c, x + w / 2 - 16, y + 88, 32, 14, F.accent); // chaise
  signboard(c, x + w / 2, y + 34, b.name, F, w - 20);
}

function clubhouseFacade(c, b, F) {
  const x = b.x * TILE, y = b.y * TILE, w = b.w * TILE, h = b.h * TILE, base = y + h;
  shadow(c, x, y, w, h);
  R(c, x - 2, y + 28, w + 4, h - 28, INK);
  R(c, x, y + 30, w, h - 30, F.wall);
  for (let i = 0; i < w; i += 10) R(c, x + i, y + 30, 1, h - 30, 'rgba(0,0,0,0.2)');
  c.fillStyle = INK; c.beginPath(); c.moveTo(x - 10, y + 34); c.lineTo(x + w / 2, y - 4); c.lineTo(x + w + 10, y + 34); c.fill();
  c.fillStyle = F.roof; c.beginPath(); c.moveTo(x - 6, y + 32); c.lineTo(x + w / 2, y + 2); c.lineTo(x + w + 6, y + 32); c.fill();
  // pack crest
  R(c, x + w / 2 - 16, y + 40, 32, 28, INK); R(c, x + w / 2 - 14, y + 42, 28, 24, F.accent);
  R(c, x + w / 2 - 6, y + 48, 12, 10, F.signBg); for (const [ox, oy] of [[-8, -2], [-3, -6], [3, -6], [8, -2]]) R(c, x + w / 2 + ox, y + 50 + oy, 4, 4, F.signBg);
  frontDoor(c, x + w / 2, base, F, { w: 32, h: 36 });
  // timber posts
  for (const px of [x + 10, x + w - 16]) { R(c, px, y + 40, 8, h - 48, shade(F.wall, 0.7)); R(c, px + 2, y + 40, 2, h - 48, F.trim); }
  signboard(c, x + w / 2, y + 16, b.name || 'PACK CLUBHOUSE', F, w - 20);
}

const DRAW = {
  cafe: cafeFacade, shop: shopFacade, fashion: fashionFacade, launch: launchFacade, cars: carsFacade,
  academy: academyFacade, jewel: jewelFacade, designer: designerFacade, goldden: golddenFacade,
  luxauto: luxautoFacade, office: officeFacade, petshop: petshopFacade, cosy: cosyFacade, royal: royalFacade,
  clubhouse: clubhouseFacade,
};

/** Draw a typed façade if we have one. Returns true when drawn (caller should skip PNG/legacy). */
export function drawTypedFacade(c, b) {
  const fn = DRAW[b.id]; if (!fn) return false;
  const F = FUNC[b.id] || FUNC.shop;
  fn(c, b, F);
  return true;
}

export const TYPED_IDS = Object.freeze(Object.keys(DRAW));
