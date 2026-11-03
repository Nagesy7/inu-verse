// Launch Hall <- Cabal Meme Maker: "Draft from Meme Maker" (pure logic, no DOM, no network).
// The meme maker opens  /launch-draft.html#v=1&sister=BTC&name=…&ticker=…&desc=…&reward=…&img=…&from=…&handoff=<id>
// and (optionally) hands the rendered PNG over with window.postMessage. Nothing here launches, signs, uploads or
// registers anything: the draft lives only in this browser tab. The coin a draft pairs with is NEVER read from the URL;
// it comes from the whitelist below (real CAs supplied by Zachary). Pending sisters and Inu/$KIBBLE content are refused.
export const VERSION = 1;
export const MAKER_ORIGIN = 'https://cabal-meme-maker.vercel.app';
export const MAKER_URL = MAKER_ORIGIN + '/';
// Origins allowed to hand over an image by postMessage (prod maker + its own preview deployments + local dev).
export function isMakerOrigin(o) {
  o = String(o || '');
  return o === MAKER_ORIGIN || /^https:\/\/cabal-meme-maker-[a-z0-9-]+-prosper33\.vercel\.app$/.test(o) || /^http:\/\/(localhost|127\.0\.0\.1):\d{2,5}$/.test(o);
}
// Whitelist: each Cabal sister pairs ONLY with her own coin. Add a parent only with a verified CA from Zachary.
// `side` = the meme maker family the parent belongs to; a link from another side can never pair with it.
// CRIME (Crime Cat) is its own side, not a Cabal sister: mint supplied by Zachary 2026-11-02 (exact CA only, copycats never).
export const SISTERS = Object.freeze({
  BTC: Object.freeze({ id: 'BTC', name: 'Big Titty Coin', ticker: 'BTC', mint: 'C5xph2yL6gMdxmuLGxJBkGpmuDFfyi5fqkBNhvL6pump', color: '#f7931a', art: MAKER_ORIGIN + '/assets/btc-mascot.jpg', side: 'cabal' }),
  ETH: Object.freeze({ id: 'ETH', name: 'Extra Thick Hoe', ticker: 'ETH', mint: 'CXWNzqBE98SSmkGgHogJZd9vjsLdgaMAFpVfV22ypump', color: '#627eea', art: MAKER_ORIGIN + '/assets/eth-mascot.png', side: 'cabal' }),
  CRIME: Object.freeze({ id: 'CRIME', name: 'CRIME', ticker: 'CRIME', mint: 'BN4Z5NtntHhu6p3atEqkeAVi8Bn9Ri2QTv8FD7iupump', color: '#ff6a13', art: MAKER_ORIGIN + '/assets/crime/crime-logo.jpg', side: 'crime' }),
  // XRP "Xtra Ripe Peaches": verified 2026-11-02 — created by slingoor's own pump.fun wallet (5YRg…Uzij), pool quoted in $BTC.
  XRP: Object.freeze({ id: 'XRP', name: 'Xtra Ripe Peaches', ticker: 'XRP', mint: '83WuTBUf1vMDShCZyMD2PrDbd5ZY9DZVQd6vpfy1pump', color: '#00aa9e', art: MAKER_ORIGIN + '/assets/xrp-mascot.jpg', side: 'cabal' }),
});
export const KIBBLE_MINT = '4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump';

// Pair-of-pairs: a REGISTERED pair can be the parent of a new draft. This list mirrors the child pairs in the Cabal Meme
// Maker's config/pairs.json and is filled ONLY with real, on-chain-verified CAs supplied by Zachary (never from a link,
// never guessed). Row: { id:'BTCJR', name:'Big Titty Junior', ticker:'BTCJR', ca:'<real mint>', parent:'BTC' | '<pair id>' }.
// A draft link may name a parent by id (parent=BTCJR); the CA always comes from here.
// Verified 2026-11-02 (pump.fun + DexScreener: name/symbol match AND the pool is quoted in the parent; created/posted by the side's lead):
//   $BTC eco (slingoor): LTC + BNB (x.com/slingoorio/status/2113790547596804269), ETF (x.com/slingoorio/status/2115942982801342696)
//   $CRIME (Armoski):    MLC (x.com/Armoskii/status/2116812119861764374), MONEKO (…/2116954028118856123), XMR (bag screenshot …/2116569307622826058)
const A = (f) => MAKER_ORIGIN + '/assets/' + f;
export const PAIRS = Object.freeze([
  { id: 'LTC', name: 'Little Titty Coin', ticker: 'LTC', ca: 'DffdPtAKvnP91k9Ct6QvZ8TwVvWbJ6CxRtGNGNh9pump', parent: 'BTC', art: A('cabal/ltc.jpg'), color: '#3b8cff' },
  { id: 'BNB', name: 'Big Natural Boobs', ticker: 'BNB', ca: '7x4EfRQCFG1id7YZDNMbfcaZPMiaoNCZy6vTtXXmpump', parent: 'BTC', art: A('cabal/bnb.jpg'), color: '#f3ba2f' },
  { id: 'ETF', name: 'Enormous Titty Faucet', ticker: 'ETF', ca: '2orqEGSdkm5BMmhdM8TpKCpACk32a3Zaj3Lef7ceqsc6', parent: 'BTC', art: A('cabal/etf.jpg'), color: '#8fb3c9' },
  { id: 'MLC', name: 'Money Laundering Coin', ticker: 'MLC', ca: 'GaCewzuGZ4U3shAmiLnqXMAN8WX4X7QRdJb3vy8ppump', parent: 'CRIME', art: A('crime/mlc.jpg'), color: '#ff7a1a' },
  { id: 'MONEKO', name: 'MONEKO', ticker: 'MONEKO', ca: 'CEwESmPYdTZwmwbgyEuRCAfyFGUfHgFfDJYuDJYGpump', parent: 'CRIME', art: A('crime/moneko.jpg'), color: '#ff5a1f' },
  { id: 'XMR', name: 'Xtra Massive Rear', ticker: 'XMR', ca: 'ELKXSq9wSdVickfiHChDJEU2WTERJfNbMmVi1tdRpump', parent: 'CRIME', art: A('crime/xmr.jpg'), color: '#ff6a13' },
].map(Object.freeze));
const B58_FULL = /^[1-9A-HJ-NP-Za-km-z]{32,44}$/;
/** Validates registry rows: chain must end at a verified sister, CA base58 + unique, no locked mints/tickers reused. */
export function buildPairRegistry(rows = PAIRS) {
  const out = new Map(), locked = new Set([KIBBLE_MINT, ...Object.values(SISTERS).map((x) => x.mint)]);
  const lockedT = new Set(['KIBBLE', 'INU', 'SOL', 'XRP', 'XLM', 'GOLD', ...Object.keys(SISTERS)]);
  const list = Array.isArray(rows) ? rows : [];
  let added = true;
  while (added) { added = false; // a child is accepted only after its parent (blocks cycles + orphans)
    for (const r of list) {
      const id = String(r?.id || '').toUpperCase(); if (!/^[A-Z0-9]{2,10}$/.test(id) || out.has(id) || SISTERS[id]) continue;
      const pid = String(r.parent || '').toUpperCase(); const par = SISTERS[pid] ? { root: pid, depth: 0, chain: [SISTERS[pid].ticker] } : out.get(pid); if (!par) continue;
      const ticker = String(r.ticker || '').replace(/^\$/, '').toUpperCase(); const ca = String(r.ca || '');
      if (!/^[A-Z0-9]{2,10}$/.test(ticker) || lockedT.has(ticker) || !B58_FULL.test(ca) || locked.has(ca) || [...out.values()].some((x) => x.mint === ca || x.ticker === ticker)) continue;
      const art = typeof r.art === 'string' && r.art.startsWith(MAKER_ORIGIN + '/assets/') ? r.art : null, color = /^#[0-9a-f]{6}$/i.test(r.color || '') ? r.color : null;
      out.set(id, Object.freeze({ id, name: clean(r.name, 32) || ticker, ticker, mint: ca, parent: pid, root: par.root, depth: par.depth + 1, chain: [...par.chain, ticker], art, color }));
      added = true;
    }
  }
  return out;
}
let PAIR_REG = null; const pairReg = () => (PAIR_REG ??= buildPairRegistry());
export const LIMITS = { name: 32, ticker: 10, desc: 500, kit: 40 };
export const MAX_IMAGE_CHARS = 8_000_000; // ~6 MB PNG as a data URL

const B58_RUN = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
const TICKER_RE = /\$[A-Za-z][A-Za-z0-9]{0,11}/g;
// Price-promise language is removed from the description (copy must stay NFA, no promises).
const PROMISE_RE = /\b(guaranteed?|guarantees|risk[\s-]?free|can'?t lose|cannot lose|no[\s-]?lose|sure[\s-]?thing|price target|will (?:moon|pump|10x|100x|1000x)|to the moon|(?:\d{1,5}(?:\.\d+)?)\s?x(?:\s?gains?)?(?=\s|$|[!.,]))/gi;

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max);

/** Strips foreign CAs, foreign $TICKERs and price promises. Returns { text, removed:[...] }. */
export function guardText(raw, { sister, ticker, also = null }) {
  const removed = []; const own = new Set(['$' + sister.ticker.toUpperCase()]); if (ticker) own.add('$' + ticker.toUpperCase()); if (also) own.add('$' + also.ticker.toUpperCase());
  let t = String(raw ?? '').replace(B58_RUN, (m) => { if (m === sister.mint || (also && m === also.mint)) return m; removed.push(m.length > 12 ? `${m.slice(0, 4)}…${m.slice(-4)}` : m); return ''; });
  t = t.replace(TICKER_RE, (m) => { if (own.has(m.toUpperCase())) return m; removed.push(m); return ''; });
  t = t.replace(PROMISE_RE, (m) => { removed.push(m.trim()); return ''; });
  return { text: t.replace(/[ \t]{2,}/g, ' ').replace(/\s+([.,!?])/g, '$1').trim(), removed };
}

/** Only preset art hosted by the meme maker itself (https, /assets/…, image extension). */
export function safeImageUrl(u) {
  try { const x = new URL(String(u || '')); if (x.origin !== MAKER_ORIGIN) return null; if (!/^\/assets\/[A-Za-z0-9/_.-]+\.(png|jpe?g|webp|gif)$/i.test(x.pathname) || x.pathname.includes('..')) return null; return x.origin + x.pathname; }
  catch { return null; }
}
export function safeBackUrl(u) {
  try { const x = new URL(String(u || '')); return isMakerOrigin(x.origin) && /^https?:$/.test(x.protocol) ? x.href.slice(0, 2000) : MAKER_URL; } catch { return MAKER_URL; }
}
export function safeDataUrl(d) { const s = String(d || ''); return s.length <= MAX_IMAGE_CHARS && /^data:image\/(png|jpeg|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(s) ? s : null; }

/**
 * ⭐ Sponsored sides (paid visibility, not an endorsement). Built ONLY from Kibble Pay's op=sponsors-live list
 * (approved by hand + unexpired), fetched by the page; a link can never add one. Each side pairs only with its own mint.
 * -> Map<applicationId, {id, ticker, name, mint, color, art, expiresAt, tierName}>
 */
export function buildSponsorRegistry(list, { api = KIBBLE_API, now = Date.now(), pairs = pairReg() } = {}) {
  const out = new Map(), locked = new Set([KIBBLE_MINT, ...Object.values(SISTERS).map((x) => x.mint), ...[...pairs.values()].map((x) => x.mint)]);
  const lockedT = new Set(['KIBBLE', 'INU', 'SOL', 'XLM', 'GOLD', ...Object.keys(SISTERS), ...[...pairs.values()].map((x) => x.ticker)]);
  for (const r of Array.isArray(list) ? list : []) {
    const id = String(r?.id || ''), ticker = String(r?.ticker || '').toUpperCase().replace(/^\$/, ''), mint = String(r?.mint || ''), exp = Number(r?.expiresAt);
    if (!/^[0-9a-f]{12}$/.test(id) || !/^[A-Z0-9]{2,10}$/.test(ticker) || lockedT.has(ticker) || !B58_FULL.test(mint) || locked.has(mint)) continue;
    if (!(exp > now) || [...out.values()].some((x) => x.mint === mint || x.ticker === ticker)) continue;
    const art = typeof r.art === 'string' && r.art.startsWith(`${api}/api/cabal?op=sponsor-img&id=${id}&`) ? r.art : null; if (!art) continue;
    out.set(id, Object.freeze({ id, ticker, mint, name: clean(r.name, 32) || ticker, color: /^#[0-9a-f]{6}$/i.test(r.color || '') ? r.color : '#ffcc33', art, expiresAt: exp, tierName: clean(r.tierName || r.tier, 20) }));
  }
  return out;
}

function readParams(hashOrSearch) {
  const raw = String(hashOrSearch || '').replace(/^[#?]/, '');
  try { return new URLSearchParams(raw); } catch { return new URLSearchParams(); }
}

/**
 * Parses + validates a draft. Returns { ok:true, draft, notes:[…] } or { ok:false, reason, notes }.
 * draft = { sister, coin:{ticker,name,mint}, name, ticker, desc, reward|null, kit, image, imageSource, back, handoff, fromPairBuilder }
 */
export function parseDraft(hashOrSearch, { pairs = pairReg(), sponsors = null } = {}) {
  const p = readParams(hashOrSearch), notes = [];
  const famRaw = (p.get('family') || '').toLowerCase(), fam = famRaw || 'cabal';
  const sid = (p.get('sister') || p.get('k') || '').toUpperCase().replace(/^\$/, '');
  if (fam === 'inu' || sid === 'KIBBLE' || sid === 'INU') return { ok: false, reason: 'inu', notes: ['Inu / $KIBBLE memes are not sent to the Launch Hall draft desk yet.'] };
  if (!sid) return { ok: false, reason: 'empty', notes };
  // ⭐ Sponsored side: the coin comes ONLY from the live sponsors list (approved + unexpired), matched by application id AND ticker.
  let sponsor = null;
  if (fam === 'sponsor') {
    if (!(sponsors instanceof Map)) return { ok: false, reason: 'sponsor-unavailable', notes: ['Couldn’t load the live sponsored sides right now, so this sponsored draft can’t be paired. Try again in a minute.'] };
    const sp = sponsors.get(String(p.get('sponsor') || '').toLowerCase());
    if (!sp || sp.ticker !== sid) return { ok: false, reason: 'sponsor-unknown', notes: ['That sponsored side isn’t live (unknown, not approved yet, or expired), so no draft can be paired with it.'] };
    sponsor = sp;
    notes.push(`Sponsored side: $${sp.ticker} paid for visibility in the meme maker. That is not an endorsement by the Cabal, Inu Verse or $KIBBLE. NFA.`);
  }
  const sister = sponsor ? Object.freeze({ id: 'SP_' + sponsor.ticker, name: sponsor.name, ticker: sponsor.ticker, mint: sponsor.mint, color: sponsor.color, art: sponsor.art, side: 'sponsor' }) : SISTERS[sid];
  if (!sister) return { ok: false, reason: 'pending', notes: ['That coin is not verified in the Launch Hall yet, so no draft can be paired with it. Only $BTC, $ETH, $XRP and $CRIME drafts (and their verified pairs) are accepted for now.'] };
  // Strict sides: a Cabal meme can't pair with $CRIME and a Crime Cat meme can't pair with a sister.
  if (famRaw && famRaw !== sister.side) return { ok: false, reason: 'side-mismatch', notes: [`A ${famRaw === 'crime' ? 'Crime Cat' : famRaw === 'cabal' ? 'Cabal' : clean(famRaw, 12)} meme can't be paired with $${sister.ticker}. Each side pairs only with its own coin.`] };
  // The parent coin is the sister's own, or a pair REGISTERED under her (looked up by id; its CA comes from the registry).
  // A CA/ticker/unknown id in the link never changes the parent.
  const pv = sponsor ? '' : (p.get('parent') || '').trim().toUpperCase().replace(/^\$/, ''); // sponsored sides take no pairs
  const reg = pv && !B58_FULL.test(pv) && pairs.get(pv) && pairs.get(pv).root === sister.id ? pairs.get(pv) : null;
  if (pv && !reg && !B58_FULL.test(p.get('parent').trim()) && pv !== sister.ticker && !SISTERS[pv] && pv !== 'KIBBLE' && /^[A-Z0-9]{2,10}$/.test(pv))
    return { ok: false, reason: 'unregistered-parent', notes: [`"$${clean(pv, 10)}" is not a registered $${sister.ticker} pair in the Launch Hall yet, so this pair-of-pairs draft can't be paired. Only pairs whose real CA Zachary has verified can be parents (nothing is read from the link).`] };
  const coin = reg ? { ticker: reg.ticker, name: reg.name, mint: reg.mint } : { ticker: sister.ticker, name: sister.name, mint: sister.mint };
  for (const k of ['parent', 'ca', 'mint', 'pair']) { const v = (p.get(k) || '').trim(); if (k === 'parent' && reg) continue;
    if (v && v !== coin.mint && v.toUpperCase().replace(/^\$/, '') !== coin.ticker) notes.push(`Ignored "${k}" in the link: ${k === 'parent' && pv && !B58_FULL.test(pv) ? `"${clean(v, 12)}" is not a registered $${sister.ticker} pair, so ` : ''}this draft pairs with $${coin.ticker}${reg ? ' (registry)' : ''}.`); }
  let ticker = clean(p.get('ticker'), 20).toUpperCase().replace(/^\$/, '').replace(/[^A-Z0-9]/g, '').slice(0, LIMITS.ticker);
  let name = clean(p.get('name'), LIMITS.name);
  if (B58_RUN.test(name)) { name = name.replace(B58_RUN, '').trim(); notes.push('Removed an address from the name.'); } B58_RUN.lastIndex = 0;
  if (ticker === 'KIBBLE' || ticker === 'INU') { ticker = ''; notes.push('Ticker reset: $KIBBLE / Inu tickers belong to Inu, not the Cabal.'); }
  // A draft is a NEW coin: it may never copy the parent's name or ticker (copycat protection).
  const takenN = new Set([sister.name, coin.name].map((x) => x.toLowerCase())), takenT = new Set([sister.ticker, coin.ticker, ...Object.keys(SISTERS), ...[...pairs.values()].map((x) => x.ticker)]);
  if (!name || takenN.has(name.toLowerCase())) { if (name) notes.push(`Name changed: a draft can't reuse "${name}".`); name = `${coin.name} Meme`.slice(0, LIMITS.name); }
  if (!ticker || takenT.has(ticker)) { if (ticker) notes.push(`Ticker changed: a draft can't reuse $${ticker}.`); ticker = (coin.ticker + 'MEME').slice(0, LIMITS.ticker); if (takenT.has(ticker)) ticker = (coin.ticker.slice(0, 7) + 'PR').slice(0, LIMITS.ticker); }
  const g = guardText(clean(p.get('desc') ?? p.get('description'), LIMITS.desc * 2), { sister: coin, ticker, also: reg ? sister : null });
  const desc = g.text.slice(0, LIMITS.desc);
  if (g.removed.length) notes.push(`Removed from the description: ${g.removed.slice(0, 6).join(', ')}${g.removed.length > 6 ? '…' : ''} (other coins, addresses or price promises).`);
  let reward = null; const rr = p.get('reward');
  if (rr != null && rr !== '') { const n = Number(String(rr).replace('%', '')); if (Number.isFinite(n) && n >= 0) reward = Math.round(Math.min(n, 100) * 10) / 10; else notes.push('Ignored an invalid holder reward %.'); }
  const imgParam = p.get('img'), img = safeImageUrl(imgParam);
  if (imgParam && !img) notes.push('Ignored an image link that is not hosted by the meme maker.');
  const handoff = /^[A-Za-z0-9_-]{6,40}$/.test(p.get('handoff') || '') ? p.get('handoff') : null;
  return { ok: true, notes, draft: {
    v: VERSION, sister: sister.id, side: sister.side, color: sister.color, sponsored: sponsor ? { id: sponsor.id, expiresAt: sponsor.expiresAt, tierName: sponsor.tierName } : null, coin, parentPair: reg ? { id: reg.id, depth: reg.depth, chain: reg.chain.map((t) => '$' + t) } : null,
    name, ticker, desc, reward, kit: clean(p.get('kit'), LIMITS.kit), fromPairBuilder: p.get('src') === 'pairs' || reward != null,
    image: img || reg?.art || sister.art, imageSource: img ? 'preset' : 'sister-art', back: safeBackUrl(p.get('from')), handoff } };
}

/** Builds a draft link (used by tests and by the meme maker snippet, which mirrors this). */
export function draftUrl(base, f) {
  const q = new URLSearchParams({ v: String(VERSION) });
  for (const [k, v] of Object.entries(f)) if (v != null && v !== '') q.set(k, String(v));
  return `${base.replace(/#.*$/, '')}#${q.toString()}`;
}

// Kibble Pay API (read-only here): the Cabal Meme Maker's weekly leaderboard (anonymous counts, no money, NFA).
export const KIBBLE_API = 'https://kibble-pay.vercel.app';
/** Top creator + top meme per verified sister from GET /api/cabal?op=leaderboard. Pure; unknown sisters are dropped. */
export function topCreators(lb) {
  const out = [];
  for (const b of lb?.boards || []) {
    const id = String(b?.sister || '').toUpperCase(), pr = pairReg().get(id);
    const s = SISTERS[id] || (pr ? { id: pr.id, ticker: pr.ticker, name: pr.name, mint: pr.mint, color: pr.color || SISTERS[pr.root].color, parent: pr.parent } : null); if (!s) continue;
    const top = b.topCreator && clean(b.topCreator.name, 24) ? { name: clean(b.topCreator.name, 24), points: Math.max(0, Number(b.topCreator.points) || 0) } : null;
    const m = b.memes?.[0]; const meme = m ? { headline: guardText(clean(m.headline, 60), { sister: s }).text, score: Math.max(0, Number(m.score) || 0), creator: clean(m.creator, 24) || 'anon' } : null;
    out.push({ sister: s.id, ticker: s.ticker, name: s.name, color: s.color, parent: s.parent || null, top, meme });
  }
  return out;
}

/** Plain-text launch sheet for copy/paste into pump.fun's own create page. */
export function launchSheet(d) {
  return [`Name: ${d.name}`, `Ticker: ${d.ticker}`, `Description: ${d.desc || '(none)'}`, `Parent coin: $${d.coin.ticker} (${d.coin.name}) ${d.coin.mint}`,
    d.reward != null ? `Planned holder reward: ${d.reward}% (plan only; not set by the Launch Hall)` : null, 'NFA. No price promises. Memecoins can go to zero.'].filter(Boolean).join('\n');
}
