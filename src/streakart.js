// Original pixel art for the login-streak pins (Inu Verse style: ink outline, flat fills, one highlight). 12x12 grid.
const INK = '#141a2e';
const GRID = {
  7: { pal: { a: '#b8743a', b: '#e0a060', c: '#6a3a1a', h: '#ffd9a8' }, px: [
    '...aaaaaa...', '..abbbbbba..', '.abhbbbbbba.', 'abbcbbbbcbba', 'abbcbccbcbba', 'abbbbccbbbba', 'abbbbbbbbbba', 'abbbccccbbba', '.abccccccba.', '.abbccccbba.', '..abbbbbba..', '...aaaaaa...'] },
  30: { pal: { a: '#8a94a8', b: '#d8e0ec', c: '#ffffff', h: '#ffffff' }, px: [
    '............', '.aa......aa.', 'abba....abba', 'abhbaaaaabba', '.abbbbbbbba.', '..abbccbba..', '..abbbbbba..', '.abbbbbbbba.', 'abbaaaaaabba', 'abba....abba', '.aa......aa.', '............'] },
  90: { pal: { a: '#c8901a', b: '#ffd23a', c: '#fff1b0', h: '#ff8a3a' }, px: [
    '.....h......', '.h...b...h..', '..h.aaa.h...', '...abbba....', '..abcbbba...', 'hbabbbbbabh.', '..abbbbba...', '...abbba....', '..h.aaa.h...', '.h...b...h..', '.....h......', '............'] },
  180: { pal: { a: '#c8901a', b: '#ffd23a', c: '#ff8ab4', h: '#ffe0ec' }, px: [
    '............', 'b....b....b.', 'ab..aba..ab.', 'abbabbbabba.', 'abbbbbbbbba.', 'abbbbbbbbba.', 'aaaaaaaaaaa.', '...cc.cc....', '..chcccchc..', '...cc.cc....', '....c.c.....', '............'] },
};
/** Draw a pin with its top-left at (x, y); `u` = pixels per grid cell. Locked pins are drawn as a dim silhouette. */
export function drawPin(c, tier, x, y, u = 2, { locked = false } = {}) {
  const g = GRID[tier]; if (!g) return;
  g.px.forEach((row, j) => { for (let i = 0; i < row.length; i++) { const k = row[i]; if (k === '.') continue;
    c.fillStyle = locked ? (k === 'a' ? '#3a4058' : '#4a5070') : g.pal[k]; c.fillRect(x + i * u, y + j * u, u, u); } });
  // ink outline: a 1-cell border wherever a filled cell touches an empty one
  c.fillStyle = INK; g.px.forEach((row, j) => { for (let i = 0; i < row.length; i++) { if (row[i] === '.') continue;
    if (!g.px[j - 1]?.[i] || g.px[j - 1][i] === '.') c.fillRect(x + i * u, y + j * u - 1, u, 1);
    if (!g.px[j + 1]?.[i] || g.px[j + 1][i] === '.') c.fillRect(x + i * u, y + (j + 1) * u, u, 1);
    if (row[i - 1] == null || row[i - 1] === '.') c.fillRect(x + i * u - 1, y + j * u, 1, u);
    if (row[i + 1] == null || row[i + 1] === '.') c.fillRect(x + (i + 1) * u, y + j * u, 1, u); } });
}
const memo = new Map();
/** Data-URL icon for HTML (HUD chip, profile, streak tab). */
export function pinUrl(tier, u = 3, locked = false) {
  const key = tier + ':' + u + ':' + locked; if (memo.has(key)) return memo.get(key); if (typeof document === 'undefined') return '';
  const cv = document.createElement('canvas'); cv.width = cv.height = 12 * u + 2; drawPin(cv.getContext('2d'), tier, 1, 1, u, { locked }); const url = cv.toDataURL(); memo.set(key, url); return url;
}
/** Flame icon for the HUD chip when no pin is worn. */
export function flameUrl(u = 2) { const key = 'flame' + u; if (memo.has(key)) return memo.get(key); if (typeof document === 'undefined') return '';
  const px = ['....a...', '...aba..', '..abba..', '.abbcba.', '.abccba.', 'abccccba', 'abccccba', '.abccba.', '..aaaa..'], pal = { a: '#c8401a', b: '#ff8a3a', c: '#ffd23a' };
  const cv = document.createElement('canvas'); cv.width = 8 * u; cv.height = 9 * u; const c = cv.getContext('2d');
  px.forEach((r, j) => { for (let i = 0; i < 8; i++) if (r[i] !== '.') { c.fillStyle = pal[r[i]]; c.fillRect(i * u, j * u, u, u); } }); const url = cv.toDataURL(); memo.set(key, url); return url; }
/** The worn pin, floating at the Shiba's shoulder in the world (scale-1.5 actor space). */
export function drawWornPin(c, tier, t = 0) { if (!GRID[tier]) return; const bob = Math.round(Math.sin(t * 2) * 1); drawPin(c, tier, 12, -44 + bob, 2); }
