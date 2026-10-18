// Minimum SOL a player needs in their wallet to launch a coin from the Launch Hall (shared by the browser and api/launch.js).
// Measured by simulating real pump.fun create_v2 transactions on mainnet (Oct 2026):
//   SOL create only  ≈ 0.00543 SOL (mint + metadata + bonding curve accounts rent, network fees)
//   $KIBBLE-paired   ≈ 0.00694 SOL (extra quote token account)
//   + dev buy        = the buy itself + pump.fun trade fee (~1.25%) + your token account / volume tracker rent (≈0.0035 SOL)
//   $KIBBLE + dev buy: SOL → $KIBBLE → new coin in one transaction; measured 0.01786 SOL for a 0.01 SOL buy (Oct 18 2026)
// We round up and keep a small reserve so the wallet can still pay fees afterwards. Live simulation replaces this when possible.
export const LAMPORTS = 1_000_000_000;
export const COST = {
  createSol: 5_600_000, createKibble: 7_100_000, // rent + base fees, rounded up from simulation
  priority: 30_000, priorityHop: 45_000,      // compute-unit price we attach (300k CU, or 450k CU for the $KIBBLE route, × 100k µLamports)
  devBuyRent: 4_000_000, devBuyFeeBps: 300,  // token account + volume accumulator rent; fee headroom 3% (pump.fun charges ~1.25%)
  reserve: 2_000_000,                        // left in the wallet for later fees
};
export const MAX_DEV_BUY_SOL = 5;
export const DEFAULT_PAIR = 'KIBBLE';
export function minLamports({ devBuySol = 0, pair = DEFAULT_PAIR } = {}) {
  const buy = Math.max(0, Math.min(MAX_DEV_BUY_SOL, Number(devBuySol) || 0));
  const buyL = Math.round(buy * LAMPORTS);
  const parts = { create: pair === 'KIBBLE' ? COST.createKibble : COST.createSol, priority: pair === 'KIBBLE' && buyL ? COST.priorityHop : COST.priority,
    devBuy: buyL, devBuyFees: buyL ? Math.ceil(buyL * COST.devBuyFeeBps / 10_000) + COST.devBuyRent : 0, reserve: COST.reserve };
  return { total: Object.values(parts).reduce((a, b) => a + b, 0), parts };
}
export const sol = (l) => (l / LAMPORTS).toFixed(l < 0.01 * LAMPORTS ? 4 : 3);

// pump.fun fee rates read from the live on-chain FeeConfig/Global on Oct 18 2026. The server's mainnet dry run replaces
// these estimates with exact amounts before the player signs.
export const PUMP_FEES = { protocolBps: 95, creatorBps: 30, lpBps: 0 };
export const SLIPPAGE_CHOICES = [100, 300, 500, 1000];
export const ROUTE_ALT = 'Hyif6eWb8x88RVrvjPfabsgRYnwkVnyByEXTVTXbUcyP';
const fine = (l) => (l / LAMPORTS).toFixed(6).replace(/0+$/, '').replace(/\.$/, '');
const pctTxt = (bps) => (bps / 100).toFixed(2).replace(/\.?0+$/, '') + '%';
// Plain-words preview of the route and every fee for the current form (shown before anything is built or signed).
export function planRoute({ pair = DEFAULT_PAIR, devBuySol = 0, slippageBps = 300, symbol = 'YOURCOIN' } = {}) {
  const n = minLamports({ devBuySol, pair }), buy = n.parts.devBuy, tick = '$' + (symbol || 'YOURCOIN'), kib = pair === 'KIBBLE';
  const cu = kib && buy ? 450_000 : 300_000, steps = [], fees = [];
  if (buy && kib) {
    steps.push(`Swap ${sol(buy)} SOL → $KIBBLE on the $KIBBLE pump.fun bonding curve`, `Swap all of that $KIBBLE → ${tick} on your new bonding curve (same transaction)`);
    fees.push(`pump.fun fee: ${pctTxt(PUMP_FEES.protocolBps)} of the SOL → $KIBBLE swap (about ${fine(Math.ceil(buy * PUMP_FEES.protocolBps / 10_000))} SOL), charged once on the first leg`,
      `Creator fee: ${pctTxt(PUMP_FEES.creatorBps)} of the $KIBBLE → ${tick} swap, paid in $KIBBLE to your own coin's creator rewards; $KIBBLE's creator fee is not charged on this route`,
      `Liquidity fee: ${pctTxt(PUMP_FEES.lpBps)} on bonding curves`,
      `Slippage limit: ${pctTxt(slippageBps)} on the SOL → $KIBBLE price. Less than the minimum and the whole launch fails (only network + priority fees are kept)`);
  } else if (buy) {
    steps.push(`Swap ${sol(buy)} SOL → ${tick} on your new bonding curve (same transaction)`);
    fees.push(`pump.fun fee: ${pctTxt(PUMP_FEES.protocolBps)} of your opening swap (about ${fine(Math.ceil(buy * PUMP_FEES.protocolBps / 10_000))} SOL)`, `Creator fee: ${pctTxt(PUMP_FEES.creatorBps)}, paid to your own coin's creator rewards`, 'Slippage: none. Create and opening swap land together, so nobody can trade in between');
  } else steps.push(kib ? `Create ${tick} paired with $KIBBLE (no swap)` : `Create ${tick} paired with SOL (no swap)`);
  fees.push('Network fee: 0.00001 SOL (2 signatures × 0.000005 SOL)', `Priority fee: ${fine(cu * 0.1)} SOL (${cu.toLocaleString('en-US')} compute units × 0.1 lamports)`,
    `Account deposits (rent): about ${fine(n.parts.create - 10_000)} SOL${buy ? ' + token accounts' : ''}. pump.fun charges no separate create fee`);
  const notes = kib ? ["Charity routing isn't available for $KIBBLE-paired coins."] : [];
  return { steps, fees, notes, cu };
}
