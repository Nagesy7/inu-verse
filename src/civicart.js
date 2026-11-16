// Civic life art (preview): haulers with their loads, cartoon pickpockets, Officer Biscuit, Chief Ember and the
// kitchen/forge flare-ups. Actors use the shared Shiba painter (main.js) plus a small overlay drawn here.
import { HAULERS, haulerAt, crimesAt, thiefPos, runPos, firesAt, STAFF } from './civic.js';
import { PLACES, placeDoor } from './townx.js';
import { lotById } from './townproposal.js';
import { TILE } from './world.js';
const INK = '#141a2e';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const LOAD = {
  wheat: (c) => { for (const dx of [-8, 0, 8]) { R(c, dx - 3, -58, 6, 26, INK); R(c, dx - 2, -57, 4, 24, '#e8c058'); R(c, dx - 4, -62, 8, 8, '#f8d878'); } R(c, -12, -44, 24, 4, '#a87048'); },
  fish: (c) => { R(c, -14, -44, 28, 14, INK); R(c, -13, -43, 26, 12, '#8a6040'); for (const dx of [-8, 2]) { R(c, dx, -50, 12, 6, INK); R(c, dx + 1, -49, 10, 4, '#9ad0e8'); } },
  stone: (c) => { R(c, -13, -48, 26, 18, INK); R(c, -12, -47, 24, 16, '#9a9aa6'); R(c, -12, -47, 24, 3, '#c0c0cc'); R(c, -4, -40, 6, 4, '#7a7a86'); },
};
const capOf = (c, col, band) => { R(c, -16, -100, 32, 6, INK); R(c, -15, -99, 30, 4, band); R(c, -11, -110, 22, 11, INK); R(c, -10, -109, 20, 10, col); R(c, -3, -107, 6, 5, '#ffd84a'); };
const helmet = (c) => { R(c, -18, -100, 36, 6, INK); R(c, -17, -99, 34, 4, '#e83a3a'); R(c, -12, -112, 24, 13, INK); R(c, -11, -111, 22, 12, '#e83a3a'); R(c, -3, -109, 6, 6, '#ffd84a'); };
const bubble = (c, txt, col = '#fff') => { c.font = '16px Silkscreen, monospace'; const w = Math.max(30, c.measureText(txt).width + 12); R(c, -w / 2 - 2, -150, w + 4, 26, INK); R(c, -w / 2, -148, w, 22, col); R(c, -4, -126, 8, 6, INK); c.fillStyle = INK; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(txt, 0, -136); };
const raccoon = (c, t, phase, kind) => {
  if (kind === 'magpie') { R(c, -16, -96, 32, 10, INK); R(c, -14, -94, 28, 6, '#f8f8f8'); }
  else { R(c, -18, -86, 36, 10, INK); R(c, -10, -84, 6, 5, '#fff'); R(c, 4, -84, 6, 5, '#fff'); } // bandit mask
  const sw = Math.round(Math.sin(t * 9) * 3); for (let i = 0; i < 4; i++) R(c, -40 - i * 7, -30 + sw - i * 2, 8, 8, i % 2 ? '#3a3a44' : '#9a9aa6'); // striped tail
  if (phase !== 'caught') { R(c, 14, -44, 18, 18, INK); R(c, 15, -43, 16, 16, '#c8b090'); R(c, 20, -48, 6, 6, INK); } // loot sack
};
export function civicActors({ skyDay, sec, t, px = null, py = null, fires = {}, caught = {} }) {
  const out = [], near = (x, y) => px == null || Math.hypot(px - x, py - y) < 240;
  for (const h of HAULERS) { const a = haulerAt(h, sec); if (!a.visible) continue;
    out.push({ x: a.x, y: a.y, coat: h.coat, outfit: {}, face: a.face, phase: a.moving ? Math.floor(t * 8) % 4 : 0, moving: a.moving, name: near(a.x, a.y) ? h.name : '', npcwork: true, civic: 'hauler:' + h.id,
      npcOverlay: a.carry ? { behind: false, draw: (c) => LOAD[a.carry]?.(c) } : null }); }
  for (const cr of crimesAt(skyDay, sec, caught)) { if (cr.phase === 'upcoming' || cr.phase === 'done') continue; const p = thiefPos(cr); if (!p) continue;
    const run = cr.phase === 'chase', tx = p.x + (run ? Math.sin(t * 6) * 10 : cr.phase === 'sneaking' ? Math.sin(t * 1.6) * 6 : 0);
    out.push({ x: tx, y: p.y, coat: 'dark', outfit: {}, face: run ? (Math.sin(t * 6) > 0 ? 'right' : 'left') : 'left', phase: run || cr.phase === 'sneaking' ? Math.floor(t * (run ? 10 : 4)) % 4 : 0, moving: cr.phase !== 'caught', name: near(p.x, p.y) ? cr.thief : '', civic: 'thief:' + cr.id,
      npcOverlay: { behind: false, draw: (c) => { raccoon(c, t, cr.phase, cr.kind); if (cr.phase === 'caught') bubble(c, cr.by === 'you' ? 'BUSTED!' : 'CAUGHT!', '#ffd84a'); else if (cr.phase === 'sneaking') bubble(c, '?!', '#ff9ac0'); } } });
    if (cr.phase === 'chase' || cr.phase === 'caught') { const o = cr.phase === 'chase' ? runPos('police', cr.stall, cr.chase) : { x: p.x - 26, y: p.y, face: 'right' }; if (o)
      out.push({ x: o.x, y: o.y, coat: STAFF.officer.coat, outfit: {}, face: o.face, phase: cr.phase === 'chase' ? Math.floor(t * 10) % 4 : 0, moving: cr.phase === 'chase', name: near(o.x, o.y) ? STAFF.officer.name : '', civic: 'officer',
        npcOverlay: { behind: false, draw: (c) => { capOf(c, '#2a4a9a', '#1a2a6a'); if (cr.phase === 'chase') bubble(c, 'HALT!', '#9fd8ff'); } } }); } }
  for (const f of firesAt(skyDay, sec, fires)) { if (f.crew == null) continue; const o = runPos('firehouse', f.place, f.crew); if (!o) continue; const at = f.crew >= 1;
    out.push({ x: at ? o.x - 20 : o.x, y: o.y, coat: STAFF.ember.coat, outfit: {}, face: at ? 'up' : o.face, phase: at ? 0 : Math.floor(t * 10) % 4, moving: !at, name: near(o.x, o.y) ? STAFF.ember.name : '', civic: 'ember',
      npcOverlay: { behind: false, draw: (c) => { helmet(c); if (at) for (let i = 0; i < 6; i++) R(c, 6 + i * 6, -70 - i * 9 + Math.sin(t * 20 + i) * 2, 6, 6, i % 2 ? '#8ad0ff' : '#c8ecff'); } } }); }
  return out;
}
// flames / smoke over the roof of a burning lot
export function civicProps({ skyDay, sec, t, fires = {} }) {
  const out = [];
  for (const f of firesAt(skyDay, sec, fires)) { if (f.phase !== 'burning' && f.phase !== 'out') continue; const l = lotById(PLACES[f.place].lot); if (!l) continue;
    const cx = (l.x + l.w / 2) * TILE, top = l.y * TILE + 10, base = (l.y + l.h) * TILE;
    out.push({ y: base + 2, d: (c) => { const k = f.k;
      for (let i = 0; i < 5; i++) { const sx = cx - 30 + i * 15 + Math.sin(t * 2 + i) * 4, sy = top - 30 - ((t * 18 + i * 13) % 40); R(c, sx - 6, sy - 6, 12, 12, `rgba(90,90,100,${0.5 * Math.max(0.2, k)})`); }
      if (f.phase === 'burning') for (let i = 0; i < 4; i++) { const fx = cx - 24 + i * 16, h = (14 + Math.sin(t * 12 + i * 2) * 5) * k; R(c, fx - 6, top - h, 12, h, '#ff5a2a'); R(c, fx - 3, top - h * 0.7, 6, h * 0.7, '#ffd84a'); } } }); }
  return out;
}
export { placeDoor };
