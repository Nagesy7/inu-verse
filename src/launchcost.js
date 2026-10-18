// Minimum SOL a player needs in their wallet to launch a coin from the Launch Hall (shared by the browser and api/launch.js).
// Measured by simulating real pump.fun create_v2 transactions on mainnet (Oct 2026):
//   SOL create only  ≈ 0.00543 SOL (mint + metadata + bonding curve accounts rent, network fees)
//   $KIBBLE-paired   ≈ 0.00694 SOL (extra quote token account)
//   + dev buy        = the buy itself + pump.fun trade fee (~1.25%) + your token account / volume tracker rent (≈0.0035 SOL)
// We round up and keep a small reserve so the wallet can still pay fees afterwards. Live simulation replaces this when possible.
export const LAMPORTS = 1_000_000_000;
export const COST = {
  createSol: 5_600_000, createKibble: 7_100_000, // rent + base fees, rounded up from simulation
  priority: 30_000,                          // compute-unit price we attach (≈300k CU × 100k µLamports)
  devBuyRent: 4_000_000, devBuyFeeBps: 300,  // token account + volume accumulator rent; fee headroom 3% (pump.fun charges ~1.25%)
  reserve: 2_000_000,                        // left in the wallet for later fees
};
export const MAX_DEV_BUY_SOL = 5;
export function minLamports({ devBuySol = 0, pair = 'SOL' } = {}) {
  const buy = pair === 'SOL' ? Math.max(0, Math.min(MAX_DEV_BUY_SOL, Number(devBuySol) || 0)) : 0;
  const buyL = Math.round(buy * LAMPORTS);
  const parts = { create: pair === 'KIBBLE' ? COST.createKibble : COST.createSol, priority: COST.priority,
    devBuy: buyL, devBuyFees: buyL ? Math.ceil(buyL * COST.devBuyFeeBps / 10_000) + COST.devBuyRent : 0, reserve: COST.reserve };
  return { total: Object.values(parts).reduce((a, b) => a + b, 0), parts };
}
export const sol = (l) => (l / LAMPORTS).toFixed(l < 0.01 * LAMPORTS ? 4 : 3);
