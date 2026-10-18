// Inu Quest companions in Inu Verse: optional, cosmetic followers read from the player's Inu Quest party through the v1
// companion bridge (contract: /workspace/inu-shared/companion-bridge.md). READ ONLY: this module never writes the Inu Quest
// save (no cloudSave, no PUT /api/save?game=inu-quest). The follower choice lives in the Verse save (state.companion).
// No stats, items, money, Bones, $KIBBLE or prizes are read or granted. Pure helpers are headless-testable; draw* need a canvas.
import { TILE, MAP, MAP_W, MAP_H, T, BUILDINGS, doorTile } from './world.js';

export const BRIDGE_URL = 'https://inu-quest.vercel.app/companions/v1/bridge.js';
export const SPRITE_BASE = 'https://inu-quest.vercel.app/companions/v1/';
export const READER_VERSION = 1;
export const SCHEMA = 'inu-quest/companions';
// v1 sprite layouts (frozen by the contract, section 4): Inu 96x48 (down x0, up x48, 48x48, feet 24,47), Wren 16x16 rows
// down/up/left/right x steps 0..2 (feet 8,15), Biscuit 12x10 right_0/right_1 (feet 6,9, mirror for left)
export const SHEETS = Object.freeze({
  inu: { fw: 48, fh: 48, ax: 24, ay: 47, scale: 1 },
  trainer: { fw: 16, fh: 16, ax: 8, ay: 15, scale: 2 },
  pet: { fw: 12, fh: 10, ax: 6, ay: 9, scale: 2 },
});
const ID_RE = /^(inu:[0-5]|wren-wanderly|biscuit)$/, WORD = /^[a-z0-9_-]{1,32}$/, HEX = /^#[0-9a-fA-F]{6}$/;
const KIND_OF = (id) => (id.startsWith('inu:') ? 'inu' : id === 'wren-wanderly' ? 'trainer' : 'pet');
const cleanName = (s, fb, max = 16) => { const v = String(s ?? '').normalize('NFKC').replace(/[<>&"'`/\\\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e]/g, '').replace(/\s+/g, ' ').trim().slice(0, max); return v || fb; };
const spriteOk = (u) => typeof u === 'string' && u.startsWith(SPRITE_BASE) && /^(inu|trainers|pets)\/[a-z0-9_-]{1,40}\.png$/.test(u.slice(SPRITE_BASE.length));
export const spriteUrl = (kind, form) => (kind === 'inu' ? (WORD.test(form || '') ? `${SPRITE_BASE}inu/${form}.png` : null) : kind === 'trainer' ? `${SPRITE_BASE}trainers/wren-wanderly.png` : `${SPRITE_BASE}pets/biscuit.png`);
const titleCase = (w) => String(w || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()).slice(0, 16);

// Our own defensive check on top of the bridge's normalizeProfile: right schema/version, known ids/kinds, sprites only from
// the Inu Quest companions path, names cleaned, cosmetic traits only (hex colours + a few words). Anything else -> dropped.
export function sanitizeProfile(p) {
  if (typeof p === 'string') { try { p = JSON.parse(p); } catch { return null; } }
  if (!p || typeof p !== 'object' || p.schema !== SCHEMA || !Number.isInteger(p.v)) return null;
  const minReader = Number.isInteger(p.minReader) ? p.minReader : p.v; if (minReader > READER_VERSION) return null;
  const list = Array.isArray(p.companions) ? p.companions.slice(0, 8) : [], out = [], seen = new Set();
  for (const c of list) { if (!c || typeof c !== 'object' || !ID_RE.test(c.id) || seen.has(c.id)) continue; const kind = KIND_OF(c.id); if (c.kind !== kind) continue;
    const form = kind === 'inu' && c.form && WORD.test(c.form.id || '') ? { id: c.form.id, name: cleanName(c.form.name, titleCase(c.form.id)), stage: Math.max(1, Math.min(3, c.form.stage | 0 || 1)), final: !!c.form.final } : null;
    if (kind === 'inu' && !form) continue;
    const sheet = spriteOk(c.sprite?.sheet) ? c.sprite.sheet : spriteUrl(kind, form?.id); if (!sheet) continue;
    const tr = {}; for (const [k, v] of Object.entries(c.traits || {}).slice(0, 12)) if (typeof v === 'string' && /^[a-z]{2,12}$/i.test(k) && (HEX.test(v) || /^[a-z ]{1,20}$/i.test(v))) tr[k] = v;
    const forms = kind === 'inu' && Array.isArray(c.forms) ? c.forms.slice(0, 3).filter((f) => f && WORD.test(f.id || '')).map((f) => ({ id: f.id, name: cleanName(f.name, titleCase(f.id)), stage: Math.max(1, Math.min(3, f.stage | 0 || 1)), current: !!f.current })) : [];
    seen.add(c.id); out.push({ id: c.id, kind, unlocked: kind === 'inu' ? true : c.unlocked === true, hint: c.unlocked === true ? null : cleanName(c.hint, 'Beat Wren in Inu Quest', 60), name: cleanName(c.name, form?.name || titleCase(c.id)),
      line: kind === 'inu' && WORD.test(c.line || '') ? c.line : null, form, forms, level: kind === 'inu' && Number.isInteger(c.level) ? Math.max(1, Math.min(100, c.level)) : null, sheet, traits: tr }); }
  const active = typeof p.active === 'string' && out.some((c) => c.id === p.active && c.unlocked) ? p.active : (out.find((c) => c.unlocked)?.id || null);
  return { trainer: cleanName(p.trainer?.name, 'Trainer'), active, companions: out };
}
// Read the profile. Never prompts a sign-in (no kp.session -> null without even loading the bridge), never throws, never writes.
// importer is injectable for tests; fixture (local dev only) skips the network entirely.
export async function loadCompanions({ kp, importer = (u) => import(/* @vite-ignore */ u), fixture = null, timeoutMs = 8000, online = globalThis.navigator?.onLine !== false } = {}) {
  if (fixture) return sanitizeProfile(fixture);
  if (!kp?.session || !online) return null;
  const within = (p) => { let t; return Promise.race([p, new Promise((_, rej) => { t = setTimeout(() => rej(new Error('timeout')), timeoutMs); })]).finally(() => clearTimeout(t)); };
  try { const B = await within(importer(BRIDGE_URL)); if (typeof B?.readCompanions !== 'function') return null;
    const raw = await within(Promise.resolve().then(() => B.readCompanions(readOnlyKp(kp)))); return raw ? sanitizeProfile(raw) : null; } catch { return null; } }
// the bridge only ever sees a frozen read-only view: the session + a GET of the inu-quest cloud save. No cloudSave, no save,
// no wallet calls exist on it, so even a changed bridge cannot write the Inu Quest save through Inu Verse.
export const readOnlyKp = (kp) => Object.freeze({ session: kp.session, cloudLoad: (g) => (g === 'inu-quest' && typeof kp.cloudLoad === 'function' ? kp.cloudLoad('inu-quest') : Promise.resolve(null)) });
export const followable = (prof) => (prof ? prof.companions.filter((c) => c.unlocked) : []);
// the Verse-side choice (in the Verse save only): { on, id, line }. The line keeps the same buddy after it evolves or moves slot.
export function ensureChoice(state) { const c = (state.companion ||= { on: false, id: null, line: null }); if (typeof c.on !== 'boolean') c.on = false; return c; }
export function chosen(prof, choice) { const L = followable(prof); if (!choice?.on || !L.length) return null;
  return (choice.line && L.find((c) => c.line === choice.line)) || L.find((c) => c.id === choice.id) || null; }
export function choose(state, comp) { const c = ensureChoice(state); c.id = comp ? comp.id : null; c.line = comp?.line || null; c.on = !!comp; return c; }

// ---- wire (multiplayer): id + form ride in the look (pl.look.cpi / cpf, 1 per 5 s, only on change), position as a small
// offset from the owner (cx, cy) in the state frame. Remote clients rebuild the sprite URL themselves from the form id.
export const toWire = (comp) => (comp ? { cpi: comp.id.replace(':', '-'), cpf: comp.form?.id || comp.id } : null);
export function fromWire(look) { const i = look?.cpi, f = look?.cpf; if (typeof i !== 'string' || typeof f !== 'string') return null; const id = i.replace(/^inu-([0-5])$/, 'inu:$1');
  if (!ID_RE.test(id) || !WORD.test(f)) return null; const kind = KIND_OF(id), sheet = spriteUrl(kind, kind === 'inu' ? f : null); if (!sheet) return null;
  return { id, kind, form: kind === 'inu' ? { id: f, name: titleCase(f) } : null, name: kind === 'inu' ? titleCase(f) : id === 'biscuit' ? 'Biscuit' : 'Wren Wanderly', sheet, unlocked: true, traits: {} }; }
export const CP_KEYS = ['cpi', 'cpf'];
export const OFF_MAX = 96;
export const wireOffset = (F, owner) => (F?.c ? [Math.max(-OFF_MAX, Math.min(OFF_MAX, Math.round(F.x - owner.x))), Math.max(-OFF_MAX, Math.min(OFF_MAX, Math.round(F.y - owner.y)))] : null);

// ---- follow (pooled trail, no per-frame allocation) ----
const TRAIL = 48, GAP = 4, FOLLOW = 30;
export function makeFollower() { return { c: null, x: 0, y: 0, face: 'down', moving: false, phase: 0, tr: new Float32Array(TRAIL * 2), head: 0, n: 0, react: null, reactT: 0, cool: {}, hop: 0, seen: 0 }; }
export function resetFollower(F, owner, c = F.c) { F.c = c; F.x = owner.x - 18; F.y = owner.y + 4; F.n = 0; F.head = 0; F.react = null; F.reactT = 0; return F; }
function pushTrail(F, x, y) { const i = F.head * 2; if (F.n) { const j = ((F.head - 1 + TRAIL) % TRAIL) * 2; if (Math.hypot(x - F.tr[j], y - F.tr[j + 1]) < GAP) return; } F.tr[i] = x; F.tr[i + 1] = y; F.head = (F.head + 1) % TRAIL; F.n = Math.min(TRAIL, F.n + 1); }
// target: the point FOLLOW px back along the owner's recent path (or a fixed offset when given, e.g. a remote's synced offset)
export function stepFollow(F, owner, dt, { rm = false, offset = null, back = FOLLOW } = {}) { if (!F.c) return F;
  if (Math.hypot(owner.x - F.x, owner.y - F.y) > 320) { resetFollower(F, owner); } // doors / zone hops: appear beside you
  pushTrail(F, owner.x, owner.y); let tx = owner.x - 18, ty = owner.y + 4 + (back > FOLLOW ? 10 : 0);
  if (offset) { tx = owner.x + offset[0]; ty = owner.y + offset[1]; }
  else if (F.n > 1) { let acc = 0, px = owner.x, py = owner.y; for (let k = 1; k <= F.n; k++) { const j = ((F.head - k + TRAIL) % TRAIL) * 2, x = F.tr[j], y = F.tr[j + 1], d = Math.hypot(x - px, y - py);
      if (acc + d >= back) { const r = (back - acc) / (d || 1); tx = px + (x - px) * r; ty = py + (y - py) * r; break; } acc += d; px = x; py = y; tx = x; ty = y; } }
  const dx = tx - F.x, dy = ty - F.y, dist = Math.hypot(dx, dy), k = 1 - Math.exp(-dt * (offset ? 10 : 7)), mv = Math.min(dist * k, 280 * dt);
  if (dist > 0.01) { F.x += (dx / dist) * mv; F.y += (dy / dist) * mv; }
  const sp = mv / Math.max(dt, 1e-4); F.moving = sp > 10; if (F.moving) F.face = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up');
  F.phase += dt * (F.moving ? 8 : 2); if (F.reactT > 0 && (F.reactT -= dt) <= 0) F.react = null; for (const k2 in F.cool) F.cool[k2] -= dt; F.hop = rm ? 0 : F.react ? Math.abs(Math.sin(F.phase * 1.6)) * 3 : 0; return F; }

// ---- reactions to the surroundings (cosmetic bubbles) ----
const CAFE = (() => { const b = BUILDINGS.find((q) => q.id === 'cafe'); if (!b) return null; const d = doorTile(b); return { x: (d.tx + 0.5) * TILE, y: (d.ty + 1) * TILE }; })();
export function nearWater(x, y, r = 1) { const tx = Math.floor(x / TILE), ty = Math.floor(y / TILE); for (let j = -r; j <= r; j++) for (let i = -r; i <= r; i++) { const v = MAP[ty + j]?.[tx + i]; if (v === T.WATER) return true; } return false; }
export const nearCafe = (x, y) => !!CAFE && Math.hypot(x - CAFE.x, y - CAFE.y) < 3 * TILE;
export const REACTIONS = { buddy: 'heart', water: 'splash', cafe: 'cup', rain: 'brr', night: 'sleepy' };
// env: { water, cafe, rain, dark, buddy } -> reaction kind or null (priority: another companion > water > café > rain > night)
export function pickReaction(env) { if (env.buddy) return 'buddy'; if (env.water) return 'water'; if (env.cafe) return 'cafe'; if (env.rain) return 'rain'; if (env.dark && !env.moving) return 'night'; return null; }
export function react(F, env) { if (!F.c) return null; const k = pickReaction(env); if (!k || F.react === k || (F.cool[k] || 0) > 0) return F.react; F.react = k; F.reactT = k === 'night' ? 4 : 2.6; F.cool[k] = k === 'night' ? 8 : 6; return k; }
export const envFor = (F, { rain = 0, dark = 0, others = [] } = {}) => ({ water: nearWater(F.x, F.y), cafe: nearCafe(F.x, F.y), rain: rain > 0.3, dark: dark > 0.35, moving: F.moving, buddy: others.some((o) => o !== F && o.c && Math.hypot(o.x - F.x, o.y - F.y) < 64) });

// ---- remote followers: one pooled follower per visible remote with a companion; pruned when they leave or turn it off ----
export function stepRemotes(pool, actors, dt, opts = {}) { const seen = new Set();
  for (const a of actors) { if (!a.mp || !a.cp) continue; let F = pool.get(a.id); if (!F) { F = makeFollower(); pool.set(a.id, F); resetFollower(F, a, a.cp); }
    if (F.c?.id !== a.cp.id || F.c?.form?.id !== a.cp.form?.id) F.c = a.cp; stepFollow(F, a, dt, { rm: opts.rm, offset: a.cpOff || null }); seen.add(a.id); }
  for (const k of [...pool.keys()]) if (!seen.has(k)) pool.delete(k); return pool; }

// ---- sprites: one Image per sheet URL (CORS-clean on production; on any failure the follower falls back to a generic pup) ----
const IMG = new Map();
export function sheetImage(url) { let e = IMG.get(url); if (e) return e; e = { ok: false, failed: !spriteOk(url) }; IMG.set(url, e); if (e.failed || typeof Image === 'undefined') { e.failed = true; return e; }
  const im = new Image(); im.crossOrigin = 'anonymous'; im.decoding = 'async'; im.onload = () => { e.ok = true; }; im.onerror = () => { e.failed = true; }; im.src = url; e.img = im; return e; }
const INK = '#141a2e';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
function bubble(c, x, y, kind, t, rm) { const yy = Math.round(y - 8 + (rm ? 0 : Math.sin(t * 5) * 1.5)); R(c, x - 8, yy - 8, 16, 13, INK); R(c, x - 7, yy - 7, 14, 11, '#fff6e0'); R(c, x - 2, yy + 5, 4, 2, INK);
  if (kind === 'buddy') { R(c, x - 4, yy - 4, 3, 3, '#ff5a8a'); R(c, x + 1, yy - 4, 3, 3, '#ff5a8a'); R(c, x - 4, yy - 2, 8, 3, '#ff5a8a'); R(c, x - 2, yy + 1, 4, 1, '#ff5a8a'); }
  else if (kind === 'water') { for (const [dx, dy] of [[-4, -1], [0, -4], [3, 0]]) { R(c, x + dx, yy + dy, 2, 3, '#3a8ae0'); R(c, x + dx, yy + dy, 1, 1, '#bfe6ff'); } }
  else if (kind === 'cafe') { R(c, x - 4, yy - 3, 6, 6, '#8a5a30'); R(c, x - 4, yy - 3, 6, 1, '#f4e3c8'); R(c, x + 2, yy - 2, 2, 3, '#8a5a30'); R(c, x - 3, yy - 6, 1, 2, '#c8c8c8'); R(c, x - 1, yy - 7, 1, 2, '#c8c8c8'); }
  else if (kind === 'rain') { R(c, x - 5, yy - 4, 10, 2, '#3fb04a'); R(c, x - 3, yy - 5, 6, 1, '#3fb04a'); R(c, x, yy - 2, 1, 6, '#6a4428'); R(c, x - 5, yy + 1, 1, 2, '#3a8ae0'); R(c, x + 4, yy, 1, 2, '#3a8ae0'); }
  else if (kind === 'night') { c.fillStyle = '#4a5478'; c.font = '7px Silkscreen, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText('z', x - 2, yy); c.fillText('z', x + 3, yy - 3); } }
// draw one follower at its feet point (world px). fallback(c, F) draws a generic pup when the sprite is unavailable.
export function drawFollower(c, F, t, { rm = false, fallback = null, label = true } = {}) { if (!F.c) return; const S = SHEETS[F.c.kind], e = sheetImage(F.c.sheet), x = Math.round(F.x), y = Math.round(F.y - F.hop), bob = rm || !F.moving ? 0 : (Math.floor(F.phase) % 2);
  R(c, x - 8, Math.round(F.y) - 2, 16, 4, 'rgba(10,14,30,.28)');
  let top = y - 22;
  if (e.ok) { const s = S.scale; let sx = 0, sy = 0, flip = false;
    if (F.c.kind === 'inu') { sx = F.face === 'up' ? 48 : 0; flip = F.face === 'left'; }
    else if (F.c.kind === 'trainer') { const row = { down: 0, up: 1, left: 2, right: 3 }[F.face] ?? 0, step = F.moving && !rm ? [1, 0, 2, 0][Math.floor(F.phase) % 4] : 0; sx = step * 16; sy = row * 16; }
    else { sx = F.moving && !rm && Math.floor(F.phase) % 2 ? 12 : 0; flip = F.face === 'left'; }
    const w = S.fw * s, h = S.fh * s; c.save(); c.imageSmoothingEnabled = false; c.translate(x, y - bob); if (flip) c.scale(-1, 1); c.drawImage(e.img, sx, sy, S.fw, S.fh, -S.ax * s, -S.ay * s, w, h); c.restore(); top = y - S.ay * s + (F.c.kind === 'inu' ? 12 : 0); }
  else if (fallback) top = fallback(c, F, x, y - bob) ?? top;
  if (label) { c.font = '5px Silkscreen, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; const nm = F.c.name, tw = Math.ceil(c.measureText(nm).width) + 6; R(c, x - tw / 2, top - 8, tw, 7, 'rgba(18,26,54,.85)'); c.fillStyle = '#f6e7b8'; c.fillText(nm, x, top - 4.5); top -= 8; }
  if (F.react) bubble(c, x, top - 4, F.react, t, rm); }
// generic pup fallback (original pixel art, tinted with the companion's coat trait when it has one)
export function drawFallbackPup(c, F, x, y) { const coat = F.c.traits?.coat || '#d8954a', belly = F.c.traits?.belly || '#fff1e0', f = F.face === 'left' ? -1 : 1, st = F.moving ? Math.floor(F.phase) % 2 : 0;
  R(c, x - 9, y - 12, 18, 9, INK); R(c, x - 8, y - 11, 16, 7, coat); R(c, x - 6, y - 6, 10, 2, belly); R(c, x + f * 5 - 4, y - 19, 9, 9, INK); R(c, x + f * 5 - 3, y - 18, 7, 7, coat); R(c, x + f * 5 - 3, y - 21, 2, 3, INK); R(c, x + f * 5 + 2, y - 21, 2, 3, INK);
  R(c, x + f * 5 + (f > 0 ? 1 : -2), y - 15, 1, 1, INK); R(c, x - f * 9 - 1, y - 14 + st, 3, 4, coat); for (const lx of [-6, -2, 3, 6]) R(c, x + lx, y - 4 + ((lx + st) % 2 ? 0 : -1), 2, 4, INK); return y - 24; }
