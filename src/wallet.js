// Shared wallet adapter for every $KIBBLE purchase (cars, exotic pets, ...).
// Today: SimWallet (local demo balance, exact 2% split recorded to the treasury ledger, NO transfers).
// Later: setWallet(kibblePayWallet(kibblePay)) swaps in /workspace/kibble-pay (tKIBBLE on devnet) without touching callers.
// Contract: wallet.purchase({ state, itemId, name, priceU }) -> Promise<{ ok, reason?, quote, sig, simulated }>
import { ensureMall, feeSplit, settle, toU, fromU, fmtK, OWNER_WALLET } from './mall.js';

export const TREASURY = OWNER_WALLET; // Zachary's treasury: BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ
export const SimWallet = {
  id: 'sim', simulated: true,
  quote: (priceU) => feeSplit(priceU),
  purchaseSync({ state, itemId, priceU }) {
    const q = feeSplit(priceU); if (toU(state.kibble) < q.total) return { ok: false, reason: `Need ${fmtK(q.total)} KIBBLE (incl. 2% fee)`, quote: q };
    state.kibble = fromU(toU(state.kibble) - q.total); settle(ensureMall(state), q, itemId);
    return { ok: true, quote: q, sig: 'sim-' + Date.now().toString(36), simulated: true, to: TREASURY };
  },
  async purchase(o) { return this.purchaseSync(o); },
};
// Adapter for the real SDK (kibble-pay public/kibble-pay.js). Server-side catalog is authoritative; the 2% split
// becomes an off-chain ledger on the server, so we send the all-in total (price + fee) as the price.
export function kibblePayWallet(kibblePay) { return {
  id: 'kibble-pay', simulated: false, quote: (priceU) => feeSplit(priceU),
  async purchase({ state, itemId, priceU }) { const q = feeSplit(priceU);
    const r = await kibblePay.buy({ itemId, priceBaseUnits: String(q.total) }); if (!r?.ok) return { ok: false, reason: r?.reason || 'Payment failed', quote: q };
    settle(ensureMall(state), q, itemId); return { ok: true, quote: q, sig: r.signature, orderId: r.orderId, simulated: false, to: TREASURY }; },
}; }
let active = SimWallet;
export const wallet = () => active;
export function setWallet(w) { active = w || SimWallet; return active; }
