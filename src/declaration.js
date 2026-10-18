// Creator-signed opt-in + fee split declaration (shared by the browser and api/). The creator signs this exact text with
// signMessage in their own wallet; the server rebuilds the same text from the fields and checks the ed25519 signature and
// that the signer is the coin's ON-CHAIN pump.fun creator (read live, never hardcoded). It is a message, not a transaction.
import { nameOf, shortAddr } from './wallets.js';
export const DECL_VERSION = 1, DECL_MAX_AGE_MS = 10 * 60_000;
export function declarationMessage({ mint, symbol = '', split = [], signer, issuedAt }) {
  return [`Inu Verse · Verified Launch opt-in + creator fee split declaration (v${DECL_VERSION})`, `Coin: ${symbol ? '$' + symbol + ' ' : ''}${mint}`, 'I am this coin\'s creator and I opt it in to the Verified Launch checks.',
    'Creator fee split:', ...split.map((s) => `${(s.bps / 100).toFixed(2)}% -> ${s.address}${nameOf(s.address) ? ` (${nameOf(s.address)})` : ''}`),
    `Signer: ${signer}`, `Issued: ${new Date(issuedAt).toISOString()}`, 'This is a signed message, not a transaction. It moves no funds.'].join('\n'); }
export const splitKey = (split = []) => split.map((s) => `${s.address}:${s.bps}`).sort().join(',');
export const sameSplit = (a, b) => splitKey(a) === splitKey(b);
export function splitDiff(expected = [], got = []) { const e = new Map(expected.map((s) => [s.address, s.bps])), g = new Map(got.map((s) => [s.address, s.bps])), out = [];
  for (const [a, b] of e) if (g.get(a) !== b) out.push(`${nameOf(a) || shortAddr(a)} expected ${b / 100}%, found ${g.has(a) ? g.get(a) / 100 + '%' : 'none'}`);
  for (const [a, b] of g) if (!e.has(a)) out.push(`unexpected ${shortAddr(a)} ${b / 100}%`);
  return out.join('; '); }
export function validSplit(split) { return Array.isArray(split) && split.length >= 1 && split.length <= 10 && split.every((s) => /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(s?.address || '') && Number.isInteger(s.bps) && s.bps > 0) && split.reduce((a, s) => a + s.bps, 0) === 10000 && new Set(split.map((s) => s.address)).size === split.length; }
// base58 (no deps) for 64-byte signatures / 32-byte keys
const ALPH = '123456789ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz';
export function b58(bytes) { let n = 0n; for (const x of bytes) n = (n << 8n) + BigInt(x); let s = ''; while (n > 0n) { s = ALPH[Number(n % 58n)] + s; n /= 58n; } for (const x of bytes) { if (x) break; s = '1' + s; } return s; }
export function unb58(s) { let n = 0n; for (const c of String(s)) { const i = ALPH.indexOf(c); if (i < 0) throw new Error('bad base58'); n = n * 58n + BigInt(i); }
  const out = []; while (n > 0n) { out.unshift(Number(n & 255n)); n >>= 8n; } for (const c of String(s)) { if (c !== '1') break; out.unshift(0); } return Uint8Array.from(out); }
