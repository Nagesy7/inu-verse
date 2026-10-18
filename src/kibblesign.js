// Creator signing card: opt a coin in to Verified Launch + publish its fee split, with ONE signMessage in the creator's own
// Phantom wallet. Inu Verse never signs, never sees keys, and this is a message, not a transaction (no funds move, no fee).
// The server (POST /api/coins {action:'declare'}) checks the signature and that the signer is the coin's on-chain creator.
// Only the opt-in + declaration message is in scope: there is no flow here for pump.fun's on-chain fee-sharing config.
import { declarationMessage, b58 } from './declaration.js';
import { walletHtml, splitHtml, SPLIT_NOTE, KIBBLE_MINT, shortAddr, nameOf } from './wallets.js';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const SIGN_URL = 'https://inu-verse-tawny.vercel.app/?kibblesign=1';
export const phantomBrowse = (url) => `https://phantom.app/ul/browse/${encodeURIComponent(url)}?ref=${encodeURIComponent('https://inu-verse-tawny.vercel.app')}`;
export const providerOf = (w = globalThis) => w.phantom?.solana || (w.solana?.isPhantom ? w.solana : null);
const isMobile = () => /Android|iPhone|iPad/i.test(globalThis.navigator?.userAgent || '');
export function mountSign(root, { mint = KIBBLE_MINT, f = globalThis.fetch, onDone = () => {} } = {}) {
  const S = { info: null, err: '', pk: null, busy: false, msg: '', done: null, issuedAt: 0 };
  const render = () => { if (!root?.isConnected) return; const i = S.info, creator = i?.creator, ok = S.pk && creator && S.pk === creator;
    S.msg = i && S.pk ? declarationMessage({ mint, symbol: i.symbol, split: i.split || [], signer: S.pk, issuedAt: S.issuedAt || Date.now() }) : '';
    root.innerHTML = `<div class="card ksign" style="text-align:left"><h3 style="margin:0 0 4px">Creator only: opt $${esc(i?.symbol || 'KIBBLE')} in to Verified Launch</h3>
      <div class="small">One signature in Phantom covers the Verified Launch opt-in and the published fee split below. It is a <b>signed message, not a transaction</b>: it moves no funds and costs nothing. Inu Verse never signs for you and never sees your keys.</div>
      ${!i ? '<div class="small">Loading on-chain creator…</div>' : `<div class="small" style="margin-top:4px">Only the coin's <b>on-chain pump.fun creator</b> can sign: ${creator ? walletHtml(creator) : `<span class="bad">couldn't read it (${esc(i.creatorError || 'unavailable')})</span>`}</div>
      ${i.split ? `<div class="small" style="margin-top:4px"><b>Fee split you are publishing</b>${splitHtml(i.split, { note: mint === KIBBLE_MINT ? SPLIT_NOTE : '' })}</div>` : ''}
      ${i.declaration ? `<div class="small good">Already signed by ${esc(nameOf(i.declaration.signer) || shortAddr(i.declaration.signer))} at ${esc(new Date(i.declaration.issuedAt).toLocaleString())}. Signing again replaces it.</div>` : ''}`}
      <ol class="small steps" style="margin:6px 0 4px 16px;padding:0"><li>Connect Phantom with the creator wallet.</li><li>Check the message, then tap <b>Sign once in Phantom</b> and approve "Sign message".</li><li>We check the signature and the on-chain creator, then the checks start.</li></ol>
      <div class="row" style="justify-content:flex-start;flex-wrap:wrap;gap:6px">${S.pk ? `<span class="small">Connected: ${walletHtml(S.pk)}</span>` : providerOf() ? '<button class="btn alt" data-ks="connect">Connect Phantom</button>' : isMobile() ? `<a class="btn alt" href="${esc(phantomBrowse(location.href))}">Open in the Phantom app ↗</a>` : '<span class="small bad">No Phantom wallet found in this browser. Install the Phantom extension, or open this page in the Phantom app on your phone.</span>'}
        ${S.pk ? `<button class="btn green" data-ks="sign" ${ok && !S.busy && !S.done ? '' : 'disabled'}>${S.busy ? 'Approve in Phantom…' : 'Sign once in Phantom'}</button>` : ''}</div>
      ${S.pk && creator && !ok ? `<div class="small bad">This wallet is not the on-chain creator. Switch to ${esc(nameOf(creator) || 'the creator wallet')} ${esc(shortAddr(creator))} in Phantom and connect again.</div>` : ''}
      ${S.msg ? `<details class="small" ${S.busy ? 'open' : ''}><summary>Exact message you will sign</summary><pre class="ksmsg" style="white-space:pre-wrap;word-break:break-all;font-size:10px;background:#0c1022;padding:6px;margin:4px 0">${esc(S.msg)}</pre></details>` : ''}
      ${S.err ? `<div class="small bad">${esc(S.err)}</div>` : ''}${S.done ? `<div class="small good">Signed and verified: $${esc(i?.symbol || 'KIBBLE')} is opted in. The Verified Launch checks run on the next board refresh (about every 15 minutes).</div>` : ''}</div>`;
    root.querySelectorAll('[data-ks]').forEach((b) => b.onclick = () => (b.dataset.ks === 'connect' ? connect() : sign())); };
  async function load() { try { const r = await f('/api/coins?declare=' + mint); S.info = await r.json(); if (!r.ok) S.err = S.info.error || 'unavailable'; } catch { S.err = 'Server unavailable right now.'; S.info = { creator: null, creatorError: 'server unavailable' }; } render(); }
  async function connect() { S.err = ''; try { const p = providerOf(); const r = await p.connect(); S.pk = (r?.publicKey || p.publicKey)?.toString() || null; } catch (e) { S.err = 'Connect cancelled: ' + (e?.message || e); } render(); }
  async function sign() { const p = providerOf(); if (!p || !S.pk) return; S.busy = true; S.err = ''; S.issuedAt = Date.now(); render();
    try { const msg = declarationMessage({ mint, symbol: S.info.symbol, split: S.info.split || [], signer: S.pk, issuedAt: S.issuedAt });
      const out = await p.signMessage(new TextEncoder().encode(msg), 'utf8'); const sig = out?.signature || out;
      const r = await f('/api/coins', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ action: 'declare', mint, signer: S.pk, issuedAt: S.issuedAt, signature: b58(sig) }) });
      const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'rejected'); S.done = j; onDone(j); }
    catch (e) { S.err = /reject|cancel|denied/i.test(e?.message || '') ? 'You cancelled in Phantom. Nothing was signed.' : 'Not saved: ' + (e?.message || e); }
    S.busy = false; render(); }
  render(); load(); return S; }
