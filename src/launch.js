// Launch Hall - SIMULATED tokens only. No blockchain, no real money.
import { createCurve, buy, sell, price, quoteBuy, quoteSell } from './curve.js';
export const PLAYER = 'you';
export const CREATE_FEE = 2;
export const NPC_TRADERS = ['Mochi', 'Kuro', 'Hana', 'Taro', 'Yuzu', 'Kiki', 'Goma', 'Sora', 'Azuki', 'Pochi', 'Ume', 'Kinako'];
export const SIM_TREASURY = 'treasury';

function pushHistory(tok, t) {
  tok.history.push({ t, p: price(tok.curve) });
  if (tok.history.length > 240) tok.history.splice(0, tok.history.length - 240);
}

export function makeToken({ name, ticker, color, creator = PLAYER, t = 0, id }) {
  const tok = {
    id: id || 'tk' + Math.random().toString(36).slice(2, 8), name: String(name).slice(0, 24), ticker: String(ticker).toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 6),
    color: color || '#e58b3a', creator, createdAt: t, curve: createCurve(), holders: {}, history: [], trades: [],
  };
  pushHistory(tok, t);
  return tok;
}

export function createToken(state, { name, ticker, color }) {
  if (!name || !String(name).trim()) return { ok: false, reason: 'Name required' };
  const tk = String(ticker || '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  if (tk.length < 2) return { ok: false, reason: 'Ticker needs 2-6 letters' };
  if (state.tokens.some((t) => t.ticker === tk)) return { ok: false, reason: 'Ticker taken' };
  if (state.kibble < CREATE_FEE) return { ok: false, reason: `Need ${CREATE_FEE} demo KIBBLE` };
  state.kibble -= CREATE_FEE;
  state.treasury = (state.treasury || 0) + CREATE_FEE;
  const tok = makeToken({ name, ticker: tk, color, creator: PLAYER, t: state.simTime });
  state.tokens.push(tok);
  return { ok: true, token: tok };
}

function record(tok, who, side, kibble, amount, t) {
  tok.trades.unshift({ who, side, kibble, amount, t });
  if (tok.trades.length > 30) tok.trades.length = 30;
  pushHistory(tok, t);
}

export function traderBuy(state, tok, who, kibbleIn) {
  const q = quoteBuy(tok.curve, kibbleIn);
  if (q.tokensOut <= 0) return { ok: false, reason: 'Curve full' };
  buy(tok.curve, kibbleIn);
  tok.holders[who] = (tok.holders[who] || 0) + q.tokensOut;
  record(tok, who, 'buy', q.kibbleUsed, q.tokensOut, state.simTime);
  return { ok: true, ...q };
}

export function traderSell(state, tok, who, amount) {
  amount = Math.min(amount, tok.holders[who] || 0);
  const q = quoteSell(tok.curve, amount);
  if (q.tokensIn <= 0) return { ok: false, reason: 'Nothing to sell' };
  sell(tok.curve, amount);
  tok.holders[who] -= q.tokensIn;
  if (tok.holders[who] < 1e-6) delete tok.holders[who];
  record(tok, who, 'sell', q.kibbleOut, q.tokensIn, state.simTime);
  return { ok: true, ...q };
}

export function playerBuy(state, tokId, kibbleIn) {
  const tok = state.tokens.find((t) => t.id === tokId);
  if (!tok) return { ok: false, reason: 'No token' };
  if (!(kibbleIn > 0)) return { ok: false, reason: 'Enter an amount' };
  if (state.kibble < kibbleIn - 1e-9) return { ok: false, reason: 'Not enough demo KIBBLE' };
  const r = traderBuy(state, tok, PLAYER, kibbleIn);
  if (r.ok) state.kibble -= r.kibbleUsed;
  return r;
}

export function playerSell(state, tokId, amount) {
  const tok = state.tokens.find((t) => t.id === tokId);
  if (!tok) return { ok: false, reason: 'No token' };
  const r = traderSell(state, tok, PLAYER, amount);
  if (r.ok) state.kibble += r.kibbleOut;
  return r;
}

export const holderCount = (tok) => Object.keys(tok.holders).length;

// NPC traders: momentum + noise. Runs on a fixed sim clock.
export function simulateTick(state, rng) {
  state.simTime += 1;
  for (const tok of state.tokens) {
    if (rng() > 0.55) continue;
    const who = rng.pick(NPC_TRADERS);
    const h = tok.history; const mom = h.length > 5 ? h[h.length - 1].p / h[h.length - 6].p - 1 : 0;
    const bias = tok.curve.graduated ? 0.5 : 0.62 + Math.max(-0.2, Math.min(0.15, mom * 2));
    if (rng() < bias || !tok.holders[who]) traderBuy(state, tok, who, +(0.05 + rng() * rng() * 4).toFixed(3));
    else traderSell(state, tok, who, tok.holders[who] * (0.25 + rng() * 0.75));
  }
}

export function seedTokens(state, rng) {
  if (state.tokens.length) { ensureSeedCoins(state, rng); return; }
  const a = makeToken({ name: 'Zoomies', ticker: 'ZOOM', color: '#3fb6a8', creator: 'Kuro', t: 0, id: 'tk-zoom' });
  const b = makeToken({ name: 'Bark Bucks', ticker: 'BARK', color: '#e0567a', creator: 'Hana', t: 0, id: 'tk-bark' });
  state.tokens.push(a, b); ensureSeedCoins(state, rng, false);
  for (let i = 0; i < 40; i++) simulateTick(state, rng);
}
// extra NPC-launched coins so the city's trending ads have a real field to rank
export const SEED_COINS = [['Mochi Moon', 'MOCHI', '#f2a6c8', 'Mochi'], ['Sniff Coin', 'SNIF', '#d8507a', 'Ume'], ['Taiyaki Token', 'TAIYA', '#e8a23a', 'Taro'], ['Pawsome', 'PAWS', '#6c8cf0', 'Yuzu'], ['Gold Bone', 'GBONE', '#d6b23a', 'Goma'], ['Zen Inu', 'ZEN', '#8fd16a', 'Sora']];
export function ensureSeedCoins(state, rng, warm = true) { let added = 0;
  for (const [name, ticker, color, creator] of SEED_COINS) { const id = 'tk-' + ticker.toLowerCase(); if (state.tokens.some((t) => t.id === id)) continue; state.tokens.push(makeToken({ name, ticker, color, creator, t: state.simTime || 0, id })); added++; }
  if (warm && added) for (let i = 0; i < 40; i++) simulateTick(state, rng); }
