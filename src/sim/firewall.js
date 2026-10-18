// Paw Audit Bureau firewalls (runtime half; tests/sim-firewall.test.mjs + scripts/sim-scan.mjs are the static half).
//  - Prize firewall: sim code may only reach URLs on ALLOW_URLS. Inu Score, raids, pools, boards, payouts and the Kibble Pay service throw.
//  - Main-economy firewall: the only unit the sim moves is PAWMARK. Bones / $KIBBLE (and every other main-game key) throw.
//  - Read-only view: the sim may look at a copy of game state through readOnly(); every write throws and nothing changes.
export class FirewallError extends Error { constructor(kind, msg) { super(`[${kind}] ${msg}`); this.name = 'FirewallError'; this.kind = kind; } }

// FIREWALL-DENYLIST-BEGIN (the static scan skips this block: it is the list of things that must not appear anywhere else)
export const DENY_URL = [/inu-?score/i, /\/api\/raid/i, /\/api\/pools?\b/i, /\/api\/boards?\b/i, /\/api\/leader/i, /payout/i, /kibble-?pay/i, /\/api\/kennel/i,
  /\/api\/inventory/i, /\/api\/pay\b/i, /\/api\/(score|scores|prize|prizes|claim|burn|wall)\b/i, /\/api\/launch/i, /\/api\/coins/i, /\/api\/home/i];
export const DENY_MODULES = ['mall.js', 'leaderboards.js', 'raidui.js', 'bossraid.js', 'wallet.js', 'game.js', 'save.js', 'flywheels.js', 'fly5.js', 'fly5ui.js', 'kennel.js',
  'realcoins.js', 'launch.js', 'launchui.js', 'launchcost.js', 'noext.js', 'profile.js', 'multiplayer.js', 'engage.js', 'engageui.js', 'president.js', 'farm.js', 'biz.js', 'jobs.js', 'garage.js', 'pets.js', 'packs.js', 'homeshare.js'];
export const ECON_KEYS = ['bones', 'kibble', 'kibbleclaims', 'mall', 'pools', 'treasury', 'wallet', 'inuscore', 'score', 'scores', 'prize', 'prizes', 'payout', 'payouts', 'board', 'boards', 'plots', 'inventory', 'wardrobe', 'garage', 'pets'];
export const ECON_UNITS = ['BONES', 'BONE', 'KIBBLE', '$KIBBLE', 'SOL', 'USDC', 'LAMPORTS'];
export const SECRETISH = /secret|private|seed|mnemonic|keypair|signer|wallet|pubkey|publickey|signature/i;
export const BANNED_ACTION = /\bbet(s|ting)?\b|wager|gambl|lotter|raffle|loot|gacha|\bodds\b|\bstake|sweepstake|jackpot|casino/i;
// Red-Team Pup probe fixtures (checks.js throws these at the guards; data only, no calls)
export const RED_TEAM = Object.freeze({
  prizeUrls: ['/api/inu-score?wallet=x', 'https://kibble-pay.vercel.app/api/raid', '/api/pools', '/api/boards', '/api/leaderboards', '/api/payout', '/api/kennel', '/api/inventory', '/api/pay', 'https://evil.example/api/sim-audit'],
  walletIds: ['4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump', 'wallet:abc', 'phantom:me', 'sim:xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx', 'https://x.y'],
  walletFields: ['wallet', 'secretKey', 'privateKey', 'seed', 'mnemonic', 'pubkey'],
  address: '4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump', seedWords: 'abandon ability able about above absent absorb abstract absurd abuse access accident',
  stakeNames: ['trial.bet', 'verdict.wager', 'odds.board'], gamblingNames: ['raid.bet', 'outcome.wager', 'daily.lottery', 'loot.crate', 'jackpot'], paidChance: { name: 'mystery.crate', chance: 0.1, cost: 5 },
  econUnits: ['BONES', 'KIBBLE', '$KIBBLE', 'SOL'] });
// FIREWALL-DENYLIST-END
export const ALLOW_URLS = ['/api/sim-audit'];
export const SIM_UNIT = 'PAWMARK';

export function guardUrl(url) {
  const u = String(url || ''); let path = u;
  try { const p = new URL(u, 'https://inu-verse.local'); if (p.host !== 'inu-verse.local' && !/^\//.test(u)) throw new FirewallError('prize', `sim may not call other hosts: ${p.host}`); path = p.pathname; } catch (e) { if (e instanceof FirewallError) throw e; }
  for (const re of DENY_URL) if (re.test(u)) throw new FirewallError('prize', `sim may not call ${path}`);
  if (!ALLOW_URLS.includes(path)) throw new FirewallError('prize', `sim may only call ${ALLOW_URLS.join(', ')} (got ${path})`);
  return path;
}
// The sim's ONLY network door. GET only; never sends credentials or bodies.
export function guardedFetch(url, f = globalThis.fetch) { const path = guardUrl(url); return f(path, { method: 'GET', credentials: 'omit', cache: 'no-store' }); }

export function guardUnit(unit) { const u = String(unit || '').toUpperCase(); if (u !== SIM_UNIT) throw new FirewallError('economy', `sim can only move ${SIM_UNIT}, never ${unit || '(none)'}`); return u; }
export function guardKey(key) { const k = String(key).toLowerCase().replace(/[^a-z$]/g, ''); if (ECON_KEYS.includes(k) || ECON_KEYS.includes(k.replace(/^\$/, ''))) throw new FirewallError('economy', `sim may not write "${key}"`); return key; }

// Deep read-only proxy over (a structured copy of) real state. Writes, deletes and defineProperty all throw.
export function readOnly(obj) {
  const wrap = (o) => (o && typeof o === 'object') ? new Proxy(o, H) : o;
  const H = { get: (t, k) => wrap(Reflect.get(t, k)),
    set: (t, k) => { throw new FirewallError(ECON_KEYS.includes(String(k).toLowerCase()) ? 'economy' : 'readonly', `sim may not write state.${String(k)}`); },
    deleteProperty: (t, k) => { throw new FirewallError('readonly', `sim may not delete state.${String(k)}`); },
    defineProperty: (t, k) => { throw new FirewallError('readonly', `sim may not define state.${String(k)}`); },
    setPrototypeOf: () => { throw new FirewallError('readonly', 'sim may not change prototypes'); } };
  let copy; try { copy = structuredClone(obj); } catch { copy = JSON.parse(JSON.stringify(obj ?? null)); }
  return wrap(copy);
}

// Wallets and keys (check 10): anything that looks like an address, a key or a seed is refused as an id or a field.
const B58 = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
export function guardNoWallet(v, where = 'value') {
  const seen = new Set(), walk = (x, path) => { if (x == null) return; if (typeof x === 'string') { if (B58.test(x.trim())) throw new FirewallError('wallet', `${path} looks like a wallet address`); if (/^([a-z]+\s+){11,23}[a-z]+$/.test(x.trim())) throw new FirewallError('wallet', `${path} looks like secret recovery words`); return; }
    if (typeof x !== 'object' || seen.has(x)) return; seen.add(x); for (const k of Object.keys(x)) { if (SECRETISH.test(k)) throw new FirewallError('wallet', `${path}.${k} is not allowed in the sim`); walk(x[k], `${path}.${k}`); } };
  walk(v, where); return v;
}
