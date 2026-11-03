// Long or Short — a FREE skill prediction contest scored in Bones (in-game points).
// No SOL or token stakes, no wagering, no leverage, no payouts tied to calls. Prices are read-only public data.
// Pure logic only (no DOM), so it runs in node tests and the browser alike.

export const KIBBLE_MINT = '4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump';
export const SPONSOR_CHEST = '7rPVPVBi8sDAcLNkEK6zdEnreeK3SV56ARaXzhnRUNRg';
export const SPONSOR_PRICE_SOL = 0.3; // per day, PREVIEW price — confirm with Zachary
export const FOR_DEVS_URL = 'https://kibbleinu.com/for-devs.html?utm_source=inu-verse&utm_medium=long-or-short';

// Default lineup (config). Mints are the same verified ones already used in this repo
// (api/_lib/pairs.js, api/coins.js) plus wrapped SOL. $KIBBLE is always in, always first.
export const LINEUP = Object.freeze([
  Object.freeze({ id: 'KIBBLE', symbol: 'KIBBLE', name: 'Kibble', mint: KIBBLE_MINT, color: '#E8913A', always: true }),
  Object.freeze({ id: 'SOL', symbol: 'SOL', name: 'Solana (wrapped SOL)', mint: 'So11111111111111111111111111111111111111112', color: '#9945FF' }),
  Object.freeze({ id: 'WIF', symbol: 'WIF', name: 'dogwifhat', mint: 'EKpQGSJtjMFqKZ9KQanSqYXRcF8fBopzLHYxdM65zcjm', color: '#C98B5B' }),
  Object.freeze({ id: 'BONK', symbol: 'BONK', name: 'Bonk', mint: 'DezXAZ8z7PnrnRJjz3wXBoRgixCa6xjnB7YaB1pPB263', color: '#F2A93B' }),
]);

// Sponsored coin of the day. mint:null = open slot (placeholder, nothing to call).
// Strict pairing rule: a sponsored slot shows ONLY that exact mint — never a lookalike pair or fallback.
export const SPONSORED_SLOT = Object.freeze({ id: 'SPONSORED', symbol: null, name: null, mint: null, color: '#2F9C8F', sponsored: true });

export const WINDOWS = Object.freeze({ '1h': 3600_000, '24h': 86_400_000 });
export const DEBUG_WINDOW = Object.freeze({ id: '20s', ms: 20_000 });
export const BASE_BONES = Object.freeze({ '1h': 10, '24h': 25, '20s': 10 });
export const MAX_MULT = 3;

/** Streak multiplier: x1 at streak 0, +0.25 per consecutive correct call, capped at x3. */
export function multiplier(streak) { return Math.min(MAX_MULT, 1 + 0.25 * Math.max(0, streak | 0)); }

export function lineupFor(sponsor = SPONSORED_SLOT, base = LINEUP) {
  const coins = base.filter((c) => c.mint !== KIBBLE_MINT);
  const out = [base.find((c) => c.mint === KIBBLE_MINT) || LINEUP[0], ...coins].slice(0, 4);
  return [...out, sponsorCoin(sponsor)];
}
export function sponsorCoin(s = SPONSORED_SLOT) {
  const ok = typeof s?.mint === 'string' && /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s.mint);
  return ok ? { ...SPONSORED_SLOT, ...s, sponsored: true, open: false } : { ...SPONSORED_SLOT, open: true };
}

/** Pick the price for EXACTLY this mint from DexScreener pairs (deepest liquidity). Never falls back to another token. */
export function pickPair(pairs, mint) {
  const a = (Array.isArray(pairs) ? pairs : []).filter((p) => p?.baseToken?.address === mint && Number(p.priceUsd) > 0);
  if (!a.length) return null;
  a.sort((x, y) => (Number(y.liquidity?.usd) || 0) - (Number(x.liquidity?.usd) || 0));
  const p = a[0];
  return { mint, price: Number(p.priceUsd), symbol: p.baseToken.symbol || '', name: p.baseToken.name || '', dex: p.dexId || '', pair: p.pairAddress || '', change1h: p.priceChange?.h1 ?? null, change24h: p.priceChange?.h24 ?? null, url: p.url || '' };
}
export const priceUrl = (mints) => 'https://api.dexscreener.com/tokens/v1/solana/' + mints.filter(Boolean).join(',');

export async function fetchPrices(mints, f = globalThis.fetch) {
  const r = await f(priceUrl(mints)); if (!r.ok) throw new Error('dexscreener ' + r.status);
  const pairs = await r.json(); const out = {};
  for (const m of mints) if (m) out[m] = pickPair(pairs, m);
  return out;
}

export function emptyState() { return { v: 1, name: '', calls: [], streak: 0, bestStreak: 0 }; }
const uid = () => Math.random().toString(36).slice(2, 10);

/** Open a call. Price is locked now; one open call per coin per window. */
export function makeCall(state, { coin, side, win, price, now = Date.now(), debug = false }) {
  if (side !== 'long' && side !== 'short') throw new Error('side must be long or short');
  const ms = win === DEBUG_WINDOW.id ? (debug ? DEBUG_WINDOW.ms : 0) : WINDOWS[win];
  if (!ms) throw new Error('unknown window');
  if (!(price > 0)) throw new Error('no live price to lock');
  if (state.calls.some((c) => !c.result && c.mint === coin.mint && c.win === win)) throw new Error('already called');
  const c = { id: uid(), mint: coin.mint, symbol: coin.symbol, sponsored: !!coin.sponsored, side, win, lockPrice: price, at: now, endsAt: now + ms, debug: win === DEBUG_WINDOW.id };
  state.calls.push(c); return c;
}

/** Resolve one call against the end price. Correct → Bones × streak multiplier; wrong → streak resets; flat → push (no Bones, streak kept). */
export function resolveCall(state, call, endPrice, now = Date.now()) {
  if (call.result || now < call.endsAt || !(endPrice > 0)) return call;
  const move = (endPrice - call.lockPrice) / call.lockPrice;
  const dir = Math.abs(move) < 1e-9 ? 'flat' : move > 0 ? 'up' : 'down';
  call.endPrice = endPrice; call.move = move; call.resolvedAt = now;
  if (dir === 'flat') { call.result = 'push'; call.bones = 0; call.mult = 1; return call; }
  const right = (dir === 'up') === (call.side === 'long');
  if (right) { call.mult = multiplier(state.streak); call.bones = Math.round(BASE_BONES[call.win] * call.mult); call.result = 'win'; state.streak += 1; state.bestStreak = Math.max(state.bestStreak, state.streak); }
  else { call.result = 'miss'; call.bones = 0; call.mult = 1; state.streak = 0; }
  return call;
}
export const due = (state, now = Date.now()) => state.calls.filter((c) => !c.result && now >= c.endsAt).sort((a, b) => a.endsAt - b.endsAt);

export const dayKey = (t) => new Date(t).toISOString().slice(0, 10);
export function weekKey(t) { const d = new Date(t); const day = (d.getUTCDay() + 6) % 7; d.setUTCDate(d.getUTCDate() - day); return dayKey(d.getTime()); } // Monday (UTC)
export function bonesIn(state, period, now = Date.now()) {
  const k = period === 'week' ? weekKey : dayKey, key = k(now);
  return state.calls.filter((c) => c.result && k(c.resolvedAt) === key).reduce((s, c) => s + (c.bones || 0), 0);
}
export function stats(state, now = Date.now()) {
  const done = state.calls.filter((c) => c.result && c.result !== 'push');
  const wins = done.filter((c) => c.result === 'win').length;
  return { today: bonesIn(state, 'day', now), week: bonesIn(state, 'week', now), total: state.calls.reduce((s, c) => s + (c.bones || 0), 0), wins, calls: done.length, hit: done.length ? Math.round((100 * wins) / done.length) : null, streak: state.streak, best: state.bestStreak, mult: multiplier(state.streak) };
}

// Preview-only sample rivals so the boards are not empty. Clearly labelled in the UI; a real board needs a backend.
export const SAMPLE_CALLERS = Object.freeze([
  { name: 'ShibaSage', day: 180, week: 940, best: 11 }, { name: 'BoneCollector', day: 145, week: 760, best: 9 },
  { name: 'PumpPup', day: 120, week: 610, best: 7 }, { name: 'KennelKing', day: 95, week: 505, best: 8 },
  { name: 'Dogeson', day: 60, week: 330, best: 5 }, { name: 'WoofWhale', day: 35, week: 210, best: 4 },
]);
export function board(state, period, now = Date.now(), sample = SAMPLE_CALLERS) {
  const me = { name: state.name || 'You', me: true, day: bonesIn(state, 'day', now), week: bonesIn(state, 'week', now), best: state.bestStreak };
  const key = period === 'hof' ? 'best' : period === 'week' ? 'week' : 'day';
  return [...sample.map((s) => ({ ...s, sample: true })), me].sort((a, b) => b[key] - a[key] || (a.me ? -1 : 1)).map((r, i) => ({ ...r, rank: i + 1, score: r[key] }));
}

export const BADGES = Object.freeze([
  { id: 'diamond', name: 'Diamond Caller', how: '10 correct calls in a row' },
  { id: 'kibble', name: 'Kibble Whisperer', how: '25 correct $KIBBLE calls' },
  { id: 'nightowl', name: 'Night Owl', how: '7-day calling streak' },
  { id: 'sharp', name: 'Sharp Shooter', how: '70%+ hit rate over 50 calls' },
]);

export function cleanName(s) { return String(s || '').replace(/[^\w .-]/g, '').trim().slice(0, 18); }
export function load(store) { try { const s = JSON.parse(store.getItem('longshort.v1') || 'null'); return s && s.v === 1 && Array.isArray(s.calls) ? s : emptyState(); } catch { return emptyState(); } }
export function save(store, state) { try { store.setItem('longshort.v1', JSON.stringify(state)); } catch {} }
export function fmtPrice(p) { if (!(p > 0)) return '—'; if (p >= 1) return '$' + p.toLocaleString('en-US', { maximumFractionDigits: 2 }); const d = Math.max(2, -Math.floor(Math.log10(p)) + 3); return '$' + p.toFixed(Math.min(d, 12)); }
