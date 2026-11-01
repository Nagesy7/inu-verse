// Great Kibble Hunt, Chapter 1: the Inu Verse Golden Bowl shard, hidden off the main paths of town.
// Signed in with a wallet -> interacting POSTs {op:"find", game:"inu-verse", spot} to kibble-pay /api/hunt with the SIWS Bearer
// session. The server checks the session wallet, the spot id, and that this wallet has a server-time Inu Verse check-in today
// (the game checks in on sign-in), then records the find once and pays the piece (150 Bones; Bones/cosmetics only, never $KIBBLE).
// The guide/search never lists this spot (guide.js skips kind 'shard'), so it has to be found by exploring.
export const SHARD = Object.freeze({ id: 'goldshard', kind: 'shard', name: 'Something glints here…', tx: 3, ty: 100 });
export const SPOT = 'iv-c1-glint', GAME = 'inu-verse', HUNT_URL = 'https://kibbleinu.com/hunt';
export const shardSpot = () => ({ ...SHARD });

/** Report the find. kp = kibble-pay SDK client. Returns { ok, msg, tone }. Never throws. */
export async function reportFind(s, kp, { demo = false } = {}) {
  if (demo) return { ok: false, msg: 'A Golden Bowl shard! Demo mode can\'t claim it. Play signed in with Phantom to add it to your Kibble Hunt.', tone: '' };
  if (!kp?.signedIn) return { ok: false, needSignIn: true, msg: 'A Golden Bowl shard! Sign in with Phantom, then tap it again to claim it for the Kibble Hunt.', tone: '' };
  try {
    const r = await kp._req('/api/game?action=hunt', { op: 'find', game: GAME, spot: SPOT });
    s.hunt ??= {}; s.hunt.shard = { at: Date.now(), wallet: kp.address };
    if (r.bones > 0) return { ok: true, msg: `Golden Bowl shard found! +${r.bones} Bones${r.keeper ? ' · Bowl Keeper!' : ''}. See ${HUNT_URL}`, tone: 'good' };
    return { ok: true, msg: 'You already found this Golden Bowl shard. It\'s on your Kibble Hunt map.', tone: 'good' };
  } catch (e) {
    const m = String(e?.message || '');
    if (/slow/i.test(m)) return { ok: false, msg: 'Easy, pup. Try again in a few seconds.', tone: 'bad' };
    if (/check-in|Open Inu Verse/i.test(m)) return { ok: false, msg: 'Shard spotted! Your wallet check-in for today hasn\'t landed yet. Wait a moment and try again.', tone: 'bad' };
    if (/paused/i.test(m)) return { ok: false, msg: 'The Kibble Hunt is paused right now. The shard will still be here.', tone: 'bad' };
    return { ok: false, msg: 'Couldn\'t reach the Kibble Hunt right now. Try again soon.', tone: 'bad' };
  }
}

/** Small sparkle prop drawn on the shard tile (y-sorted like other world props). */
export function shardProps(t, TILE, found = false) {
  const X = SHARD.tx * TILE + TILE / 2, Y = SHARD.ty * TILE + TILE / 2;
  return [{ y: Y + 6, d: (c) => {
    const a = found ? 0.35 : 0.6 + 0.4 * Math.sin(t * 3);
    c.save(); c.globalAlpha = a; c.fillStyle = '#D4AF37'; c.fillRect(X - 3, Y + 1, 6, 4); c.fillStyle = '#ffe98a'; c.fillRect(X - 1, Y + 1, 2, 2);
    for (let i = 0; i < 3; i++) { const ph = t * 2 + i * 2.1, r = 6 + 5 * ((ph % 2) / 2), sx = X + Math.cos(ph * 1.7) * r, sy = Y - 4 + Math.sin(ph * 1.3) * r * 0.6, k = 1 + (Math.sin(ph * 5) > 0 ? 1 : 0);
      c.globalAlpha = a * (1 - (ph % 2) / 2); c.fillStyle = '#fff6c2'; c.fillRect(sx - k, sy, 2 * k + 1, 1); c.fillRect(sx, sy - k, 1, 2 * k + 1); }
    c.restore(); } }];
}
