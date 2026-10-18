// Original pixel art for Item 5 town-square props: pools monument, burn festival monument, quest board.
import { TILE, SQUARE } from './world.js';
import * as PB from './poolboard.js';
import { ensureFarm } from './farm.js'; import { ensureBiz } from './biz.js';
import { poolsMonument, burnStage, BURN_STAGES, ensureFly5, BURN_GOAL_U, questProgress } from './fly5.js';
const INK = '#141a2e';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
function txt(c, s, x, y, size = 6, col = '#fff') { c.font = `${size}px Silkscreen, monospace`; c.textAlign = 'center'; c.fillStyle = INK; c.fillText(s, x, y + 1); c.fillStyle = col; c.fillText(s, x, y); }
const k = (u) => (u / 1e6).toFixed(2);
export function squareProps(state, t, week = 0) {
  if (!state) return [];
  const out = [];
  // 9. pools monument: obelisk with three lit pool bars + treasury plaque
  { const P = { ...poolsMonument(state), ...(globalThis.__livePools || {}) }, x = SQUARE.pools.x * TILE, y = SQUARE.pools.y * TILE;
    out.push({ y: y + 52, d: (c) => {
      R(c, x - 22, y + 40, 44, 12, '#6a5a4a'); R(c, x - 20, y + 40, 40, 2, '#8a7a6a');
      R(c, x - 12, y - 30, 24, 72, INK); R(c, x - 11, y - 29, 22, 70, '#e8dcc4'); R(c, x - 11, y - 29, 4, 70, '#fff6e0');
      R(c, x - 6, y - 40, 12, 12, INK); R(c, x - 5, y - 39, 10, 10, '#e3b341'); R(c, x - 2, y - 36, 4, 4, '#fff1b0');
      const vals = [P.daily, P.weekly, P.monthly], mx = Math.max(1, ...vals), cols = ['#5fb36a', '#3a6fd8', '#c86ad8'];
      vals.forEach((v, i) => { const h = 6 + Math.round((v / mx) * 34); R(c, x - 8 + i * 6, y + 30 - h, 4, h, cols[i]); R(c, x - 8 + i * 6, y + 30 - h, 4, 1, '#fff'); });
      R(c, x - 34, y + 54, 68, 22, INK); R(c, x - 33, y + 55, 66, 20, '#1e2a4e');
      txt(c, 'POOLS', x, y + 62, 6, '#ffe7a3'); txt(c, `D${k(P.daily)} W${k(P.weekly)} M${k(P.monthly)}`, x, y + 71, 5, '#fff');
    } }); }
  // 9b. Weekly Pool Board: walk-up plaza board left of the monument (live figures from poolboard.js; "n/a" when a board has no pool figure)
  { const x = SQUARE.pools.x * TILE - 100, y = SQUARE.pools.y * TILE - 26, raw = PB.cached();
    const B = PB.buildBoard(raw, { farmPool: ensureFarm(state).pool, bizPool: ensureBiz(state).pool });
    out.push({ y: y + 58, d: (c) => {
      R(c, x + 4, y + 40, 4, 18, INK); R(c, x + 56, y + 40, 4, 18, INK); R(c, x + 5, y + 40, 2, 18, '#7a5a3a'); R(c, x + 57, y + 40, 2, 18, '#7a5a3a');
      R(c, x - 2, y - 26, 68, 70, INK); R(c, x - 1, y - 25, 66, 68, '#c8a46a'); R(c, x + 1, y - 23, 62, 64, '#1e2a4e');
      R(c, x + 24, y - 32, 16, 7, INK); R(c, x + 25, y - 31, 14, 5, '#e3b341'); R(c, x + 30, y - 30, 4, 3, '#fff1b0'); // bone crest
      txt(c, 'WEEKLY BOARDS', x + 32, y - 16, 5, '#ffe7a3');
      txt(c, B.weekly.base == null ? 'POOL N/A' : `POOL ${k(B.weekly.base)} KIB`, x + 32, y - 9, 5, '#9fe6a8');
      const ab = { farm: 'FARMER', biz: 'BUSINESS', 'meme-brawl': 'BRAWL', 'street-sniffer': 'SNIFFER', 'kibble-chomp': 'CHOMP', 'inu-score': 'INU SCORE' };
      B.rows.forEach((r, i) => { const ry = y - 1 + i * 6.5; R(c, x + 3, ry - 4, 3, 3, r.live ? '#5fb36a' : '#6a6a7a');
        c.font = '5px Silkscreen, monospace'; c.textAlign = 'left'; c.fillStyle = '#fff'; c.fillText(ab[r.id], x + 8, ry);
        c.textAlign = 'right'; c.fillStyle = r.figure === PB.NA ? '#a8a8b8' : '#ffe7a3'; c.fillText(r.figure === PB.NA ? 'n/a' : r.figure.replace(' Bones', 'B'), x + 61, ry); });
    } }); }
  // 2. burn festival monument: brazier pillar with 4 flames that light up in stages
  { const st = burnStage(state), F = ensureFly5(state).burnFest, x = SQUARE.burn.x * TILE, y = SQUARE.burn.y * TILE;
    out.push({ y: y + 52, d: (c) => {
      R(c, x - 24, y + 40, 48, 12, '#4a3a3a'); R(c, x - 16, y - 12, 32, 54, INK); R(c, x - 15, y - 11, 30, 52, '#7a4a3a'); R(c, x - 15, y - 11, 30, 3, '#a86a4a');
      for (let i = 0; i < BURN_STAGES.length; i++) { const lit = i < st, bx = x - 12 + i * 7, fl = Math.sin(t * 8 + i) * 2;
        R(c, bx, y - 18, 5, 6, INK); R(c, bx + 1, y - 17, 3, 4, lit ? '#3a2418' : '#2a2a2a');
        if (lit) { R(c, bx, y - 26 + fl, 5, 8, '#ff6a2a'); R(c, bx + 1, y - 30 + fl, 3, 6, '#ffd23a'); R(c, bx + 2, y - 32 + fl, 1, 3, '#fff6c8'); } }
      if (st >= BURN_STAGES.length) { c.save(); c.globalAlpha = 0.25 + 0.15 * Math.sin(t * 3); c.fillStyle = '#ffb04a'; c.beginPath(); c.arc(x, y - 20, 34, 0, 7); c.fill(); c.restore(); }
      const frac = Math.min(1, F.burnedU / BURN_GOAL_U); R(c, x - 30, y + 54, 60, 22, INK); R(c, x - 29, y + 55, 58, 20, '#2a1a1a');
      txt(c, 'BURN FEST', x, y + 62, 6, '#ffb04a'); R(c, x - 24, y + 68, 48, 4, '#3a2a2a'); R(c, x - 24, y + 68, Math.round(48 * frac), 4, '#ff6a2a');
    } }); }
  // 3. quest board: cork board with checkmarks per quest
  { const q = questProgress(state, week), x = SQUARE.quest.x * TILE, y = SQUARE.quest.y * TILE;
    out.push({ y: y + 34, d: (c) => {
      R(c, x - 2, y + 10, 4, 24, '#6a4422'); R(c, x - 28, y - 22, 56, 36, INK); R(c, x - 27, y - 21, 54, 34, '#b88a5a'); R(c, x - 27, y - 21, 54, 2, '#d8aa7a');
      txt(c, 'QUESTS', x, y - 13, 6, '#fff6e0');
      q.list.forEach((it, i) => { const bx = x - 22 + i * 9, by = y - 4; R(c, bx, by, 7, 9, '#fff6e0'); R(c, bx, by, 7, 1, it.remote ? '#7a4fd0' : '#3a6fd8'); if (it.ok) { R(c, bx + 1, by + 5, 2, 2, '#3f9450'); R(c, bx + 3, by + 3, 2, 2, '#3f9450'); R(c, bx + 5, by + 1, 1, 2, '#3f9450'); } });
      txt(c, `${q.done}/${q.total}`, x, y + 11, 5, '#fff');
    } }); }
  return out;
}
