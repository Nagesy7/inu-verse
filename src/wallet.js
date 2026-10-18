// Shared wallet adapter for every $KIBBLE purchase (cars, exotic pets, ...).
// Real mode: kibblePayWallet (kibble-pay SDK, Phantom). Demo mode (?demo=1): SimWallet (local demo balance, fee-inclusive
// 2% split recorded to a local ledger, NO transfers).
// Contract: wallet.purchase({ state, itemId, name, priceU }) -> Promise<{ ok, reason?, quote, sig, simulated }>
import { ensureMall, feeSplit, settle, toU, fromU, fmtK, OWNER_WALLET } from './mall.js';

import { TREASURY_WALLET } from './wallets.js';
export const TREASURY = TREASURY_WALLET; // President's Vault = mall.OWNER_WALLET (both read src/wallets.js)
export const SimWallet = {
  id: 'sim', simulated: true,
  quote: (priceU) => feeSplit(priceU),
  purchaseSync({ state, itemId, priceU }) {
    const q = feeSplit(priceU); if (toU(state.kibble) < q.total) return { ok: false, reason: `Need ${fmtK(q.total)} demo KIBBLE`, quote: q };
    state.kibble = fromU(toU(state.kibble) - q.total); settle(ensureMall(state), q, itemId);
    return { ok: true, quote: q, sig: 'sim-' + Date.now().toString(36), simulated: true, to: TREASURY };
  },
  async purchase(o) { return this.purchaseSync(o); },
  // burn: tokens leave circulation (no treasury, no fee). Real path: kibblePay.burn(amount)
  burnSync({ state, itemId, amountU }) { if (toU(state.kibble) < amountU) return { ok: false, reason: `Need ${fmtK(amountU)} KIBBLE to burn` };
    state.kibble = fromU(toU(state.kibble) - amountU); const m = ensureMall(state); m.burnedU = (m.burnedU || 0) + amountU; (m.burnLog ||= []).unshift({ itemId, amountU, at: Date.now() }); m.burnLog.length = Math.min(m.burnLog.length, 50);
    return { ok: true, burnedU: amountU, sig: 'simburn-' + Date.now().toString(36), simulated: true }; },
};
// ---- modes ----
// DEMO (fake balance from playing, local ledger) ONLY with ?demo=1 in the browser. Node tests default to demo (pure sim maths).
// Otherwise: real kibble-pay. Before the $KIBBLE mint is set, every KIBBLE purchase/burn says SOON and nothing is faked.
export const SOON = 'KIBBLE is live, but the wallet service is unreachable right now. Try again shortly.';
export let DEMO = typeof location === 'undefined' ? true : new URLSearchParams(location.search).get('demo') === '1';
export const setDemo = (v) => (DEMO = !!v);
export const demoOnly = (what = 'This') => ({ ok: false, reason: `${what} uses demo KIBBLE: open Inu Verse with ?demo=1 to try it. Real $KIBBLE never comes from play.` });
export const kibText = (s) => (DEMO ? `demo $KIBBLE (you have ${(s?.kibble || 0).toFixed(2)})` : active?.live ? `$KIBBLE (wallet ${active.balanceUi ?? '…'})` : '$KIBBLE (sign in with Phantom)');
// Real adapter (kibble-pay SDK). Catalog is authoritative + FEE-INCLUSIVE: we send only the catalog id `inu-verse:<itemId>`.
// Purchases are async (Phantom). purchaseSync() never blocks the game: it returns ok:true only when the wallet already owns an
// unclaimed copy in /api/inventory (state.kibbleClaims tracks what this save has received); otherwise it starts the payment and
// returns pending; when the order is paid a 'kibble:paid' event fires and tapping Buy again delivers the item.
export const GAME = 'inu-verse';
export function kibblePayWallet(kp, { events = globalThis } = {}) { const inv = {}, pending = new Set();
  const emit = (type, detail) => { try { events.dispatchEvent(new CustomEvent(type, { detail })); } catch {} };
  const credit = (state, key) => { const used = ((state.kibbleClaims ||= {})[key] || 0); if ((inv[key] || 0) > used) { state.kibbleClaims[key] = used + 1; return true; } return false; };
  const w = { id: 'kibble-pay', simulated: false, quote: (priceU) => feeSplit(priceU), inv, balanceUi: null,
    get live() { return !!kp.cfg?.provisioned; }, get address() { return kp.session ? kp.address : null; },
    async connect() { await kp.connect(); await kp.signIn(); await w.refresh(); return kp.address; },
    async refresh() { if (!kp.session) return; Object.assign(inv, (await kp.inventory(GAME))?.[GAME] || {}); if (w.live) w.balanceUi = (await kp.balance()).ui; emit('kibble:wallet', { address: kp.address }); },
    purchaseSync({ state, itemId, priceU }) { const id = GAME + ':' + itemId, q = feeSplit(priceU);
      if (credit(state, id)) return { ok: true, quote: q, sig: 'inventory', simulated: false, to: TREASURY };
      if (!w.live) return { ok: false, reason: SOON, quote: q };
      if (!kp.session) return { ok: false, reason: 'Sign in with Phantom first (wallet button, top bar).', quote: q };
      if (!pending.has(id)) { pending.add(id); kp.buy({ itemId: id, game: GAME }).then((r) => { pending.delete(id);
        if (r?.ok) { inv[id] = (inv[id] || 0) + 1; emit('kibble:paid', { itemId, id }); } else emit('kibble:failed', { itemId, reason: r?.error || r?.reason || 'Payment failed' }); }); }
      return { ok: false, pending: true, reason: 'Confirm the payment in Phantom, then tap Buy again to receive it.', quote: q }; },
    async purchase(o) { return w.purchaseSync(o); },
    // OPT-IN burn: tokens are destroyed, nobody receives them. Server records burn:<itemId> in the wallet inventory.
    burnSync({ state, itemId, amountU }) { const key = 'burn:' + itemId;
      if (credit(state, key)) return { ok: true, burnedU: amountU, sig: 'inventory', simulated: false };
      if (!w.live) return { ok: false, reason: SOON };
      if (!kp.session) return { ok: false, reason: 'Sign in with Phantom first (wallet button, top bar).' };
      if (!pending.has(key)) { pending.add(key); kp.burn((amountU / 1e6).toString(), { itemId, game: GAME }).then((r) => { pending.delete(key);
        if (r?.ok) { inv[key] = (inv[key] || 0) + 1; emit('kibble:paid', { itemId, id: key, burn: true }); } else emit('kibble:failed', { itemId, reason: r?.error || 'Burn failed' }); }); }
      return { ok: false, pending: true, reason: 'Confirm the burn in Phantom, then tap again to unlock it.' }; },
  }; return w; }
// placeholder while kibble-pay loads (real mode): never fakes a balance
export const PendingWallet = { id: 'pending', simulated: false, live: false, address: null, quote: (priceU) => feeSplit(priceU),
  purchaseSync: ({ priceU }) => ({ ok: false, reason: SOON, quote: feeSplit(priceU) }), async purchase(o) { return this.purchaseSync(o); }, burnSync: () => ({ ok: false, reason: SOON }) };
let active = DEMO ? SimWallet : PendingWallet;
export const wallet = () => active;
export function setWallet(w) { active = w || (DEMO ? SimWallet : PendingWallet); return active; }
