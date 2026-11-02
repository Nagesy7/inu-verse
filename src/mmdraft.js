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
// Whitelist: each Cabal sister pairs ONLY with her own coin. Add a sister only with a verified CA from Zachary.
export const SISTERS = Object.freeze({
  BTC: Object.freeze({ id: 'BTC', name: 'Big Titty Coin', ticker: 'BTC', mint: 'C5xph2yL6gMdxmuLGxJBkGpmuDFfyi5fqkBNhvL6pump', color: '#f7931a', art: MAKER_ORIGIN + '/assets/btc-mascot.jpg' }),
  ETH: Object.freeze({ id: 'ETH', name: 'Extra Thick Hoe', ticker: 'ETH', mint: 'CXWNzqBE98SSmkGgHogJZd9vjsLdgaMAFpVfV22ypump', color: '#627eea', art: MAKER_ORIGIN + '/assets/eth-mascot.png' }),
});
export const KIBBLE_MINT = '4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump';
export const LIMITS = { name: 32, ticker: 10, desc: 500, kit: 40 };
export const MAX_IMAGE_CHARS = 8_000_000; // ~6 MB PNG as a data URL

const B58_RUN = /[1-9A-HJ-NP-Za-km-z]{32,44}/g;
const TICKER_RE = /\$[A-Za-z][A-Za-z0-9]{0,11}/g;
// Price-promise language is removed from the description (copy must stay NFA, no promises).
const PROMISE_RE = /\b(guaranteed?|guarantees|risk[\s-]?free|can'?t lose|cannot lose|no[\s-]?lose|sure[\s-]?thing|price target|will (?:moon|pump|10x|100x|1000x)|to the moon|(?:\d{1,5}(?:\.\d+)?)\s?x(?:\s?gains?)?(?=\s|$|[!.,]))/gi;

const clean = (s, max) => String(s ?? '').replace(/[\u0000-\u001f\u007f<>]/g, ' ').replace(/\s{2,}/g, ' ').trim().slice(0, max);

/** Strips foreign CAs, foreign $TICKERs and price promises. Returns { text, removed:[...] }. */
export function guardText(raw, { sister, ticker }) {
  const removed = []; const own = new Set(['$' + sister.ticker.toUpperCase()]); if (ticker) own.add('$' + ticker.toUpperCase());
  let t = String(raw ?? '').replace(B58_RUN, (m) => { if (m === sister.mint) return m; removed.push(m.length > 12 ? `${m.slice(0, 4)}…${m.slice(-4)}` : m); return ''; });
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

function readParams(hashOrSearch) {
  const raw = String(hashOrSearch || '').replace(/^[#?]/, '');
  try { return new URLSearchParams(raw); } catch { return new URLSearchParams(); }
}

/**
 * Parses + validates a draft. Returns { ok:true, draft, notes:[…] } or { ok:false, reason, notes }.
 * draft = { sister, coin:{ticker,name,mint}, name, ticker, desc, reward|null, kit, image, imageSource, back, handoff, fromPairBuilder }
 */
export function parseDraft(hashOrSearch) {
  const p = readParams(hashOrSearch), notes = [];
  const fam = (p.get('family') || 'cabal').toLowerCase();
  const sid = (p.get('sister') || p.get('k') || '').toUpperCase().replace(/^\$/, '');
  if (fam === 'inu' || sid === 'KIBBLE' || sid === 'INU') return { ok: false, reason: 'inu', notes: ['Inu / $KIBBLE memes are not sent to the Launch Hall draft desk yet.'] };
  if (!sid) return { ok: false, reason: 'empty', notes };
  const sister = SISTERS[sid];
  if (!sister) return { ok: false, reason: 'pending', notes: ['That sister\'s coin is not verified in the Launch Hall yet, so no draft can be paired with it. Only $BTC and $ETH drafts are accepted for now.'] };
  // The parent coin is always the sister's own. A different CA/ticker in the link is ignored on purpose.
  for (const k of ['parent', 'ca', 'mint', 'pair']) { const v = (p.get(k) || '').trim(); if (v && v !== sister.mint && v.toUpperCase().replace(/^\$/, '') !== sister.ticker) notes.push(`Ignored "${k}" in the link: ${sister.name} drafts always pair with $${sister.ticker}.`); }
  let ticker = clean(p.get('ticker'), 20).toUpperCase().replace(/^\$/, '').replace(/[^A-Z0-9]/g, '').slice(0, LIMITS.ticker);
  let name = clean(p.get('name'), LIMITS.name);
  if (B58_RUN.test(name)) { name = name.replace(B58_RUN, '').trim(); notes.push('Removed an address from the name.'); } B58_RUN.lastIndex = 0;
  if (ticker === 'KIBBLE' || ticker === 'INU') { ticker = ''; notes.push('Ticker reset: $KIBBLE / Inu tickers belong to Inu, not the Cabal.'); }
  // A draft is a NEW coin: it may never copy the parent's name or ticker (copycat protection).
  if (!name || name.toLowerCase() === sister.name.toLowerCase()) { if (name) notes.push(`Name changed: a draft can't reuse "${sister.name}".`); name = `${sister.name} Meme`; }
  if (!ticker || ticker === sister.ticker) { if (ticker) notes.push(`Ticker changed: a draft can't reuse $${sister.ticker}.`); ticker = (sister.ticker + 'MEME').slice(0, LIMITS.ticker); }
  const g = guardText(clean(p.get('desc') ?? p.get('description'), LIMITS.desc * 2), { sister, ticker });
  const desc = g.text.slice(0, LIMITS.desc);
  if (g.removed.length) notes.push(`Removed from the description: ${g.removed.slice(0, 6).join(', ')}${g.removed.length > 6 ? '…' : ''} (other coins, addresses or price promises).`);
  let reward = null; const rr = p.get('reward');
  if (rr != null && rr !== '') { const n = Number(String(rr).replace('%', '')); if (Number.isFinite(n) && n >= 0) reward = Math.round(Math.min(n, 100) * 10) / 10; else notes.push('Ignored an invalid holder reward %.'); }
  const imgParam = p.get('img'), img = safeImageUrl(imgParam);
  if (imgParam && !img) notes.push('Ignored an image link that is not hosted by the meme maker.');
  const handoff = /^[A-Za-z0-9_-]{6,40}$/.test(p.get('handoff') || '') ? p.get('handoff') : null;
  return { ok: true, notes, draft: {
    v: VERSION, sister: sister.id, coin: { ticker: sister.ticker, name: sister.name, mint: sister.mint },
    name, ticker, desc, reward, kit: clean(p.get('kit'), LIMITS.kit), fromPairBuilder: p.get('src') === 'pairs' || reward != null,
    image: img || sister.art, imageSource: img ? 'preset' : 'sister-art', back: safeBackUrl(p.get('from')), handoff } };
}

/** Builds a draft link (used by tests and by the meme maker snippet, which mirrors this). */
export function draftUrl(base, f) {
  const q = new URLSearchParams({ v: String(VERSION) });
  for (const [k, v] of Object.entries(f)) if (v != null && v !== '') q.set(k, String(v));
  return `${base.replace(/#.*$/, '')}#${q.toString()}`;
}

/** Plain-text launch sheet for copy/paste into pump.fun's own create page. */
export function launchSheet(d) {
  return [`Name: ${d.name}`, `Ticker: ${d.ticker}`, `Description: ${d.desc || '(none)'}`, `Parent coin: $${d.coin.ticker} (${d.coin.name}) ${d.coin.mint}`,
    d.reward != null ? `Planned holder reward: ${d.reward}% (plan only; not set by the Launch Hall)` : null, 'NFA. No price promises. Memecoins can go to zero.'].filter(Boolean).join('\n');
}
