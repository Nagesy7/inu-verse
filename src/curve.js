// Simulated constant-product bonding curve (virtual reserves). DEMO ONLY - no real tokens.
export const CURVE = {
  virtualKibble: 30,
  virtualTokens: 1_073_000_000,
  curveSupply: 793_100_000, // tokens sold before graduation
  totalSupply: 1_000_000_000,
  feeBps: 100,
};

export function createCurve(opts = {}) {
  const c = { ...CURVE, ...opts };
  return {
    vKib: c.virtualKibble, vTok: c.virtualTokens, realKibble: 0, sold: 0, fees: 0,
    graduated: false, curveSupply: c.curveSupply, totalSupply: c.totalSupply, feeBps: c.feeBps,
  };
}

export const price = (c) => c.vKib / c.vTok;
export const marketCap = (c) => price(c) * c.totalSupply;
export const progress = (c) => Math.min(1, c.sold / c.curveSupply);

function remaining(c) {
  return c.graduated ? Math.max(0, c.vTok * 0.9 - 1) : Math.max(0, c.curveSupply - c.sold);
}

export function quoteBuy(c, kibbleIn) {
  if (!(kibbleIn > 0)) return { tokensOut: 0, kibbleUsed: 0, fee: 0, net: 0 };
  const f = c.feeBps / 10000;
  let fee = kibbleIn * f, net = kibbleIn - fee;
  const k = c.vKib * c.vTok;
  let out = c.vTok - k / (c.vKib + net);
  const rem = remaining(c);
  if (out > rem) {
    out = rem;
    net = k / (c.vTok - out) - c.vKib;
    fee = (net * f) / (1 - f);
  }
  return { tokensOut: out, kibbleUsed: net + fee, fee, net };
}

export function buy(c, kibbleIn) {
  const q = quoteBuy(c, kibbleIn);
  if (q.tokensOut <= 0) return q;
  c.vKib += q.net; c.vTok -= q.tokensOut; c.realKibble += q.net; c.sold += q.tokensOut; c.fees += q.fee;
  if (!c.graduated && c.sold >= c.curveSupply * 0.999999) { c.graduated = true; q.graduatedNow = true; }
  return q;
}

export function quoteSell(c, tokIn) {
  tokIn = Math.min(tokIn, c.sold);
  if (!(tokIn > 0)) return { kibbleOut: 0, fee: 0, gross: 0, tokensIn: 0 };
  const k = c.vKib * c.vTok;
  let gross = c.vKib - k / (c.vTok + tokIn);
  gross = Math.min(gross, c.realKibble);
  const fee = gross * (c.feeBps / 10000);
  return { kibbleOut: gross - fee, fee, gross, tokensIn: tokIn };
}

export function sell(c, tokIn) {
  const q = quoteSell(c, tokIn);
  if (q.tokensIn <= 0) return q;
  c.vKib -= q.gross; c.vTok += q.tokensIn; c.realKibble -= q.gross; c.sold -= q.tokensIn; c.fees += q.fee;
  if (c.realKibble < 1e-12) c.realKibble = Math.max(0, c.realKibble);
  return q;
}

// Readable small prices: 0.0₇3781 (subscript = number of zeros after "0."), plain decimals otherwise. Never scientific notation.
const SUB = '₀₁₂₃₄₅₆₇₈₉';
export function fmtPrice(p, sig = 4) {
  if (!Number.isFinite(p) || p === 0) return '0';
  if (p >= 1) return p.toLocaleString('en-US', { maximumFractionDigits: 4 });
  if (p >= 0.001) return p.toFixed(Math.min(8, sig + Math.max(0, -Math.floor(Math.log10(p)) - 1)));
  const zeros = -Math.floor(Math.log10(p)) - 1, digits = Math.round(p * 10 ** (zeros + sig)).toString().slice(0, sig).replace(/0+$/, '') || '0';
  return `0.0${String(zeros).split('').map((d) => SUB[d]).join('')}${digits}`;
}
