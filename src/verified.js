// Verified Launch badge + town crier news (client). Data: GET /api/coins?verified=<mints> (opt-in coins only, server
// re-checks lazily with a TTL) and GET /api/coins?news=1 (server-deduped, rate-limited announcements).
// Rules: coins that did not opt in show NOTHING (null record -> empty string). Data that couldn't be read shows
// "couldn't check", never a pass. Wording is fixed: 'Verified Launch: checks passed at <time>'. No advice.
import { splitHtml, SPLIT_NOTE, KIBBLE_MINT, KIBBLE_SPLIT, WALLET_CSS } from './wallets.js';
export const ORDER = ['authorities', 'feeSplit', 'snipes', 'top10'];
export const SNIPE_SLOTS = 5;
export const LABELS = { authorities: 'Mint + freeze authority renounced', feeSplit: 'Creator fee split published', snipes: `No snipes in the first ${SNIPE_SLOTS} slots`, top10: 'Top 10 holders each under 1% of supply' };
export const STATUS_TXT = { pass: 'PASS', fail: 'FAIL', unknown: "COULDN'T CHECK" };
export const RULES = `How it works: four on-chain checks, run by our server. Snipe rule: no wallet other than the creator picked up tokens in the creation slot or the ${SNIPE_SLOTS - 1} slots after it (about 2 seconds). Top-10 rule: each of the 10 largest holders has under 1% of supply, not counting the pump.fun bonding curve or pool vaults. Re-checked automatically about every 15 minutes while players view the board; a later fail revokes the badge. Anything we can't read shows "couldn't check" and never counts as a pass. Only coins whose creator opted in are checked. Not financial advice.`;
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// local time with a zone label, e.g. "18 Oct, 11:52 pm AEDT"
export function fmtTime(ts, { locale, timeZone } = {}) { if (!ts) return '?';
  try { return new Date(ts).toLocaleString(locale, { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit', timeZoneName: 'short', ...(timeZone ? { timeZone } : {}) }); } catch { return new Date(ts).toISOString(); } }
export const passedText = (ts, o) => `Verified Launch: checks passed at ${fmtTime(ts, o)}`;

const cache = new Map(); // mint -> public record | null (null = not opted in)
export const recOf = (mint) => cache.get(mint) ?? null;
export const isVerified = (mint) => recOf(mint)?.status === 'verified';
export function _reset() { cache.clear(); }
export function setRecord(mint, rec) { cache.set(mint, rec); }
export async function fetchVerified(mints, { f = globalThis.fetch, base = '' } = {}) { const want = [...new Set(mints)].filter(Boolean); const out = {};
  for (let i = 0; i < want.length; i += 12) { const chunk = want.slice(i, i + 12);
    try { const r = await f(`${base}/api/coins?verified=${chunk.join(',')}`); const j = await r.json().catch(() => ({})); if (!r.ok) throw 0;
      for (const m of chunk) { const v = j.verified?.[m] ?? null; cache.set(m, v); out[m] = v; } }
    catch { for (const m of chunk) { const old = cache.get(m); const v = old ? { ...old, stale: true } : old === null ? null : { mint: m, optIn: true, status: 'unknown', error: 'checks unavailable right now' }; cache.set(m, v); out[m] = v; } } }
  return out; }

// Badge face per status. Non-opted-in (null) -> ''.
export function badgeFace(rec, o) { if (!rec || !rec.optIn) return null;
  switch (rec.status) {
    case 'verified': return { cls: 'vf-ok', icon: '✓', text: passedText(rec.passedAt, o) };
    case 'revoked': return { cls: 'vf-revoked', icon: '✕', text: `Verified Launch revoked at ${fmtTime(rec.revokedAt, o)}` };
    case 'not_passed': return { cls: 'vf-no', icon: '–', text: `Verified Launch: not awarded (${passCount(rec)} of 4 checks passed)` };
    case 'pending': return { cls: 'vf-wait', icon: '…', text: 'Verified Launch: checking…' };
    default: return { cls: 'vf-unk', icon: '?', text: "Verified Launch: couldn't check right now" }; } }
export const passCount = (rec) => ORDER.filter((k) => rec?.checks?.[k]?.status === 'pass').length;
export function badgeHtml(mint, { open = false, rec = recOf(mint), fixture = false, o } = {}) { const b = badgeFace(rec, o); if (!b) return '';
  return `<details class="vf ${b.cls}" data-vf="${esc(mint)}"${open ? ' open' : ''}><summary><span class="vf-seal">${b.icon}</span><span class="vf-txt">${esc(b.text)}</span>${fixture ? '<span class="vf-fx">TEST FIXTURE</span>' : ''}<span class="vf-more">tap for checks</span></summary>${breakdownHtml(rec, o)}</details>`; }
export function breakdownHtml(rec, o) { if (!rec) return '';
  if (rec.status === 'pending' || !rec.checks) return `<div class="vf-body small">${rec.status === 'pending' ? 'First check is running. It refreshes about every 15 minutes.' : `Couldn't check right now (${esc(rec.error || 'data unavailable')}). Nothing is shown as passed.`}</div>`;
  const rows = ORDER.map((k) => { const x = rec.checks[k] || { status: 'unknown', note: "Couldn't check" }; return `<li class="vf-${x.status}"><b>${STATUS_TXT[x.status] || STATUS_TXT.unknown}</b><span><b>${LABELS[k]}</b><br>${esc(x.note)}${k === 'feeSplit' && x.split ? splitHtml(x.split, { note: rec.mint === KIBBLE_MINT ? SPLIT_NOTE : '' }) : ''}<br><i class="vf-src">Source: ${esc(x.source || 'Solana RPC via our server')}</i></span></li>`; }).join('');
  const rv = rec.status === 'revoked' ? `<div class="vf-why"><b>Revoked at ${esc(fmtTime(rec.revokedAt, o))}</b>: ${esc(rec.revokeReason || 'a check failed')}${rec.firstVerifiedAt ? ` · first verified ${esc(fmtTime(rec.firstVerifiedAt, o))}` : ''}</div>` : '';
  return `<div class="vf-body">${rv}<ul class="vf-list">${rows}</ul><div class="small">Last checked ${esc(fmtTime(rec.checkedAt, o))}${rec.stale ? ' (older result, re-checking)' : ''}${rec.recheckNote ? ' · ' + esc(rec.recheckNote) : ''}. ${esc(RULES)}</div></div>`; }

// ---- Town crier news ----
export const headline = (it) => `EXTRA! $${it.symbol || '???'}${it.name ? ` (${it.name})` : ''} earns the Verified Launch badge: all four checks passed!`;
export function newsCardHtml(news = [], { o, fixture = false } = {}) { const it = news[0]; if (!it) return '';
  return `<div class="vf-news"><div class="vf-mast">THE DAILY BONE · LAUNCH HALL EDITION${fixture ? ' · <span class="vf-fx">TEST FIXTURE</span>' : ''}</div><h4>${esc(headline(it))}</h4>
    <div class="small">${esc(passedText(it.passedAt, o))} · reported by Crier Barkley</div><a class="btn tiny green" href="${esc(it.pump)}" target="_blank" rel="noopener noreferrer">$${esc(it.symbol || '???')} on pump.fun ↗</a>
    ${news.length > 1 ? `<div class="vf-tick" aria-label="Recently verified"><span>${news.slice(0, 6).map((n) => `✓ $${esc(n.symbol || '???')} ${esc(n.name || '')}`).join(' &nbsp;·&nbsp; ')}</span></div>` : ''}</div>`; }
// Client side of the rate limit: one headline per CLIENT_GAP_MS on this device, each id once (localStorage), only fresh news.
export const CLIENT_GAP_MS = 90_000, NEWS_FRESH_MS = 12 * 3600_000, SEEN_KEY = 'inu.crier.verified';
export function makeCrier({ store = globalThis.localStorage, gapMs = CLIENT_GAP_MS } = {}) { let last = -Infinity;
  const seen = () => { try { return new Set(JSON.parse(store?.getItem(SEEN_KEY) || '[]')); } catch { return new Set(); } };
  return { pick(news = [], now = Date.now()) { if (now - last < gapMs) return null; const s = seen();
      const it = [...news].filter((n) => n && !s.has(n.id) && now - (n.at || n.passedAt || 0) < NEWS_FRESH_MS).sort((a, b) => (a.at || 0) - (b.at || 0))[0]; if (!it) return null;
      last = now; s.add(it.id); try { store?.setItem(SEEN_KEY, JSON.stringify([...s].slice(-50))); } catch {} return it; },
    get last() { return last; } }; }
export async function fetchNews({ f = globalThis.fetch, base = '' } = {}) { try { const r = await f(base + '/api/coins?news=1'); if (!r.ok) return []; return (await r.json()).news || []; } catch { return []; } }

// Canvas seal for coin ads (gold rosette + check). Drawn only for verified coins.
export function drawSeal(c, x, y, r = 6) { c.save(); c.fillStyle = '#0c1022'; c.beginPath(); for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2, rr = i % 2 ? r + 1 : r + 2.4; c.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } c.fill();
  c.fillStyle = '#f2cc68'; c.beginPath(); c.arc(x, y, r, 0, Math.PI * 2); c.fill(); c.strokeStyle = '#0c1022'; c.lineWidth = Math.max(1, r / 4); c.beginPath(); c.moveTo(x - r * 0.5, y); c.lineTo(x - r * 0.1, y + r * 0.45); c.lineTo(x + r * 0.55, y - r * 0.45); c.stroke(); c.restore(); }

// Labelled preview fixtures (?verifiedpreview=1): proof/screenshots only, clearly marked TEST FIXTURE everywhere.
export const FIX = { pass: 'TestFixtureVerifiedPass11111111111111111111', revoked: 'TestFixtureVerifiedRevoked111111111111111111', none: 'TestFixtureNoOptin11111111111111111111111111' };
export function fixtures(now = Date.now()) { const src = { authorities: 'Solana RPC (via our server): getAccountInfo on the mint account', feeSplit: 'Solana RPC (via our server): pump.fun fee-sharing config account', snipes: `Solana RPC (via our server): bonding-curve signatures back to creation + getTransaction for slots S..S+${SNIPE_SLOTS - 1}`, top10: 'Solana RPC (via our server): getTokenLargestAccounts + owners' };
  const P = (k, note) => ({ status: 'pass', note, source: src[k] }), passed = now - 7 * 60_000;
  const ok = { authorities: P('authorities', 'Mint authority and freeze authority are both renounced'), feeSplit: P('feeSplit', 'Fee split published: Fixt…ure1 60%, Fixt…ure2 40% (locked)'), snipes: P('snipes', 'Only the creator picked up tokens in slots 300000000–300000004 (3 transactions read)'), top10: P('top10', 'Largest holder has 0.82% of supply; all top 10 under 1% (2 curve/pool vault accounts excluded)') };
  const coins = [{ mint: FIX.pass, name: 'Fixture Pup', symbol: 'TESTPUP', creator: 'TestFixtureCreator1111111111111111111111111', verifiedOptIn: true, registeredAt: now - 3600_000, fixture: true },
    { mint: FIX.revoked, name: 'Fixture Revoked', symbol: 'TESTREV', creator: 'TestFixtureCreator2222222222222222222222222', verifiedOptIn: true, registeredAt: now - 7200_000, fixture: true },
    { mint: FIX.none, name: 'Fixture No Opt-in', symbol: 'TESTNON', creator: 'TestFixtureCreator3333333333333333333333333', registeredAt: now - 9000_000, fixture: true }];
  const top10Fail = { status: 'fail', note: '1 of the top 10 holders has 1% or more (largest: Fixt…ale1 with 3.4%)', source: src.top10 };
  const recs = { [FIX.pass]: { mint: FIX.pass, optIn: true, status: 'verified', checks: ok, checkedAt: passed, passedAt: passed, firstVerifiedAt: now - 3000_000 },
    [FIX.revoked]: { mint: FIX.revoked, optIn: true, status: 'revoked', checks: { ...ok, top10: top10Fail }, checkedAt: now - 2 * 60_000, passedAt: now - 40 * 60_000, firstVerifiedAt: now - 6000_000, revokedAt: now - 20 * 60_000, revokeReason: `${LABELS.top10}: ${top10Fail.note}` },
    [FIX.none]: null };
  // $KIBBLE as it would look AFTER the creator signs (fee split from the signed declaration; top-10 couldn't be read). TEST FIXTURE.
  recs[KIBBLE_MINT] = { mint: KIBBLE_MINT, optIn: true, status: 'unknown', fixture: true, checkedAt: now - 3 * 60_000, checks: { authorities: P('authorities', 'Mint authority and freeze authority are both renounced'),
    feeSplit: { status: 'pass', note: "Published by creator — not enforced on-chain: 40% Kennel Chest, 35% President's Vault, 25% Bone Vault", source: 'Published by creator — not enforced on-chain: declaration signed by the on-chain creator Kennel Chest Akk3…56fn (ed25519 signature checked by our server); on-chain fee-sharing config D81S…HzM8 not found', split: KIBBLE_SPLIT.map((s) => ({ ...s })), splitSource: 'declaration' },
    snipes: P('snipes', 'Only the creator picked up tokens in slots 457209987–457209991 (1 transaction read)'), top10: { status: 'unknown', note: "Couldn't check: holder list unavailable from RPC right now", source: src.top10 } } };
  const news = [{ id: FIX.pass + ':fixture', mint: FIX.pass, name: 'Fixture Pup', symbol: 'TESTPUP', passedAt: passed, at: now - 60_000, pump: `https://pump.fun/coin/${FIX.pass}`, fixture: true }];
  return { coins, recs, news }; }

export const CSS = `.vf{margin:4px 0;border:2px solid #0c1022;background:#1b2346;font-size:10px}.vf summary{list-style:none;cursor:pointer;display:flex;flex-wrap:wrap;align-items:center;gap:5px;padding:3px 5px;min-height:28px}.vf summary::-webkit-details-marker{display:none}
.vf-seal{display:inline-flex;align-items:center;justify-content:center;width:20px;height:20px;border:2px solid #0c1022;border-radius:50%;font:bold 11px monospace;color:#0c1022;background:#9aa3b8;box-shadow:0 0 0 2px #f2cc6855}
.vf-txt{font:9px Silkscreen,monospace;color:#fff6e0;line-height:1.35}.vf-ok{border-color:#d4a640;background:#2a2a14}.vf-ok .vf-seal{background:#f2cc68}.vf-ok .vf-txt{color:#ffe7a3}
.vf-revoked{border-color:#c8323c;background:#3a1418}.vf-revoked .vf-seal{background:#ff6b6b}.vf-no .vf-seal{background:#8a90a6}.vf-unk .vf-seal,.vf-wait .vf-seal{background:#9aa3b8}
.vf-more{margin-left:auto;opacity:.7;font-size:9px}.vf[open] .vf-more{display:none}.vf-body{padding:4px 6px 6px;border-top:1px solid #2a3358}.vf-why{margin:2px 0 4px;padding:3px 5px;background:#5a1a1a;border-left:3px solid #ff6b6b;color:#ffd0d0}
.vf-list{list-style:none;margin:0 0 4px;padding:0}.vf-list li{display:flex;gap:6px;padding:3px 0;border-bottom:1px dashed #2a3358;line-height:1.35}.vf-list li>b{min-width:62px;font:9px Silkscreen,monospace}
.vf-list li.vf-pass>b{color:#7ed957}.vf-list li.vf-fail>b{color:#ff6b6b}.vf-list li.vf-unknown>b{color:#9aa3b8}.vf-src{opacity:.75;font-size:9px}
.vf-fx{font:8px Silkscreen,monospace;background:#ff00aa;color:#fff;padding:1px 4px;border:1px solid #0c1022}
.vf-chip{display:inline-flex;align-items:center;gap:3px;font:8px Silkscreen,monospace;padding:1px 5px;border:1px solid #0c1022;background:#f2cc68;color:#0c1022;vertical-align:middle}
.vf-news{background:#f7f1df;color:#141a2e;border:3px solid #141a2e;box-shadow:0 0 0 2px #d4a640;padding:6px 8px;margin:0 0 8px;text-align:left}.vf-news .vf-mast{font:8px Silkscreen,monospace;letter-spacing:1px;border-bottom:2px solid #141a2e;padding-bottom:2px;margin-bottom:3px}
.vf-news h4{margin:2px 0 3px;font:12px Silkscreen,monospace;line-height:1.3;color:#141a2e;text-transform:none}.vf-news .small{color:#3a3f55}.vf-news .btn{margin-top:4px}
.vf-tick{overflow:hidden;white-space:nowrap;margin-top:5px;background:#141a2e;color:#ffe7a3;font:9px Silkscreen,monospace;padding:2px 0}.vf-tick span{display:inline-block;padding-left:100%;animation:vftick 18s linear infinite}@keyframes vftick{to{transform:translateX(-100%)}}
@media (prefers-reduced-motion:reduce){.vf-tick span{animation:none;padding-left:4px}}
.vf-card{background:var(--navy2,#1b2346);border:3px solid #d4a640;padding:6px 8px;margin:0 0 8px;text-align:left}.vf-card h3{margin:0 0 2px}
#crier-banner.news{background:#f7f1df;color:#141a2e;border-color:#141a2e;box-shadow:0 0 0 3px #d4a640,0 4px 0 #0008}#crier-banner.news b{color:#8a1a1a}#crier-banner.news a{color:#1a5a2a;font-size:9px;pointer-events:auto}
body.short .regcoin{flex-wrap:wrap}body.short .regcoin>div:first-child{flex:1 1 100%}body.short .regcoin>.row{flex-wrap:wrap}
@media (max-height:420px){.vf summary{min-height:24px;padding:2px 4px}.vf-news h4{font-size:11px}.vf-list li{padding:2px 0}}`;
export function injectCss(doc = globalThis.document) { if (!doc || doc.getElementById('vf-css')) return; const s = doc.createElement('style'); s.id = 'vf-css'; s.textContent = CSS + WALLET_CSS; doc.head.appendChild(s); }

// Verified Launch opt-in (also used by the Coin board's "register an existing pump.fun coin" form). Off by default.
export function verifiedOptHtml(on, id) { return `<label class="vfopt" style="display:flex;gap:6px;align-items:flex-start;margin:6px 0;padding:5px 6px;border:2px dashed var(--goldd,#8a6a1a);font-size:11px;line-height:1.35"><input id="${id}" type="checkbox" style="width:auto;margin-top:2px" ${on ? 'checked' : ''}><span><b>Opt in to the Verified Launch badge</b> (optional). Four on-chain checks: mint + freeze authority renounced · creator fee split published on pump.fun · no snipes in the first 5 slots · each top-10 holder under 1%. Badge only if all four pass; re-checked about every 15 min and revoked, with the reason, if one later fails. Unticked = nothing shown.</span></label>`; }
export const trendTag = (mint, coin) => ({ verified: isVerified(mint), ...(coin?.fixture ? { fixture: true } : {}) });
