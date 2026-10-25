// Launch Hall → "Launch your coin" tab: no-extension launch UI (wallet → top up → launch form → one-tap sign → board).
// Logic lives in noext.js; this file is DOM only. Styles are injected here so the shared style.css stays untouched.
import * as NX from './noext.js';
import { verifiedOptHtml } from './verified.js';
import { nameOf, walletHtml } from './wallets.js';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '');
const CSS = `.noext{display:grid;grid-template-columns:1fr 1fr;gap:8px;text-align:left;margin-bottom:8px}@media (max-width:560px){.noext{grid-template-columns:1fr}}
.noext .card{text-align:left}.noext h4{margin:0 0 4px;color:var(--goldl);font-weight:normal;font-size:13px;text-transform:uppercase}.noext .num{display:inline-block;width:18px;height:18px;line-height:18px;text-align:center;background:var(--gold);color:var(--ink);margin-right:4px}
.noext .row{display:flex;flex-wrap:wrap;gap:6px;align-items:center;justify-content:flex-start;margin:6px 0}.noext .btn{font-size:11px;padding:6px 9px}.noext .soon{opacity:.6}.noext .soon small{display:block;font-size:8px;text-transform:none}
.noext input,.noext textarea,.noext select{width:100%;box-sizing:border-box;background:var(--navy);color:var(--cream);border:2px solid var(--goldd);padding:5px 6px;font:12px monospace;margin:2px 0}.noext textarea{height:44px;resize:vertical}
.noext label{display:block;font-size:10px;color:#b9b08e;margin-top:4px}.noext .two{display:grid;grid-template-columns:1fr 1fr;gap:6px}.noext .addr{font:11px monospace;word-break:break-all;color:var(--cream);background:var(--navy);padding:4px 6px;border:2px dashed var(--goldd)}
.noext .qr{float:right;margin:0 0 4px 8px;background:#fff;padding:4px;line-height:0}.noext .qr svg{width:96px;height:96px}.noext .bal b{font-size:15px}.noext .ok{color:#7fe0a0}.noext .bad{color:#ff8f8f}.noext .warnbox{border:2px solid #d84a54;background:#2a1020;padding:6px;font-size:10px;line-height:1.45;color:#f3d7d7}
.noext .imgprev{width:48px;height:48px;object-fit:cover;border:2px solid var(--goldd);vertical-align:middle;margin-right:6px;image-rendering:auto}.noext .prog li{font-size:11px;margin:2px 0}.noext .prog li.done{color:#7fe0a0}.noext .prog li.now{color:var(--goldl)}
.noext .route{border:2px solid var(--goldd);background:#141c33;padding:6px;font-size:10px;line-height:1.45;margin:6px 0}.noext .route h5{margin:0 0 3px;color:var(--goldl);font-size:11px;font-weight:normal;text-transform:uppercase}.noext .route ol,.noext .route ul{margin:2px 0;padding-left:16px}.noext .route .amt{color:var(--cream);font-weight:bold}.noext .route.live{border-color:#7fe0a0}
.noext .full{grid-column:1/-1}.noext ul.tight{margin:4px 0;padding-left:16px;font-size:10px;line-height:1.45}.noext details summary{cursor:pointer;font-size:11px}
body.short .noext .qr svg{width:80px;height:80px}body.short .noext .small{margin-top:4px}`;
function injectCss() { if (document.getElementById('noext-css')) return; const s = document.createElement('style'); s.id = 'noext-css'; s.textContent = CSS; document.head.appendChild(s); }

const S = { cfg: null, wallet: null, balance: null, balT: 0, busy: false, result: null, steps: [], err: '', form: { pair: 'KIBBLE', devBuySol: 0, slippageBps: 300, verified: false }, review: null, api: NX.apiClient() };
const STEP_ORDER = ['meta', 'build', 'review', 'sign', 'confirm', 'register', 'done'];
const STEP_TEXT = { meta: 'Upload image + details', build: 'Server builds unsigned tx + mainnet dry run', review: 'You check the route + every fee', sign: 'You approve in Phantom', confirm: 'Solana confirms', register: 'Added to the Coin board', done: 'Done' };
let root = null, ctx = {};

async function loadCfg() { if (S.cfg) return S.cfg; try { S.cfg = await S.api.config(); } catch { S.cfg = { phantomAppId: null, socialLogin: false }; } return S.cfg; }
async function restoreEmbedded() { const cfg = await loadCfg(); if (!cfg.phantomAppId) return null;
  const { sdk, kit } = await NX.embeddedSdk(cfg); const w = NX.embeddedWallet(sdk, kit);
  if (!S.wallet) { try { await sdk.autoConnect?.(); } catch {} if (sdk.isConnected?.() && w.address) { S.wallet = w; render(); refreshBalance(); } }
  sdk.on?.('connect', () => { if (w.address) { S.wallet = w; localStorage.removeItem('inu.noext.resume'); ctx.toast?.('Signed in: your Phantom wallet is ready.', 'good'); render(); refreshBalance(); } });
  return w; }
// Called at boot after a Google/Apple redirect so the OAuth handshake completes even before the Hall is opened.
export async function resumeAuth(c = {}) { ctx = { ...ctx, ...c }; try { await restoreEmbedded(); } catch {} }

export async function mountNoExt(el, c = {}) {
  injectCss(); root = el; ctx = c;
  // Hub-hosted Launch Hall passes apiBase so /api/launch hits Verse without a Verse SIWS session.
  if (c.apiBase != null) S.api = NX.apiClient(globalThis.fetch, String(c.apiBase).replace(/\/$/, ''));
  render(); await loadCfg(); render();
  if (S.cfg.phantomAppId) restoreEmbedded().catch(() => {});
  else { const ext = NX.extensionWallet(); if (!S.wallet && ext.available() && ext.address) { S.wallet = ext; render(); } }
  if (S.wallet) refreshBalance();
}
async function refreshBalance() { clearTimeout(S.balT); if (!S.wallet?.address) return; try { S.balance = (await S.api.balance(S.wallet.address)).lamports; } catch { S.balance = null; }
  if (root?.isConnected) { paintBalance(); S.balT = setTimeout(refreshBalance, 10000); } }
const need = () => NX.minLamports({ devBuySol: S.form.devBuySol, pair: S.form.pair });

async function connect(kind) {
  S.err = ''; try {
    if (kind === 'extension') { const w = NX.extensionWallet(); if (!w.available()) { S.err = 'Phantom extension not found. Use Sign in with Google/Apple, or open Inu Verse inside the Phantom app.'; return render(); } await w.connect(); S.wallet = w; }
    else { const cfg = await loadCfg(); if (!cfg.phantomAppId) return; const { sdk, kit } = await NX.embeddedSdk(cfg); ctx.persist?.(); localStorage.setItem('inu.noext.resume', '1');
      const w = NX.embeddedWallet(sdk, kit); await w.connect(kind); if (w.address) { S.wallet = w; localStorage.removeItem('inu.noext.resume'); } }
  } catch (e) { S.err = 'Sign-in cancelled or failed: ' + (e?.message || e); }
  render(); refreshBalance(); }
async function disconnect() { try { await S.wallet?.disconnect(); } catch {} S.wallet = null; S.balance = null; render(); }

function qrSvg(text, kit) { try { const q = kit.qrcode(0, 'M'); q.addData(text); q.make(); return q.createSvgTag({ cellSize: 3, margin: 2, scalable: true }); } catch { return ''; } }
function paintBalance() { const el = root?.querySelector('#nx-bal'); if (!el) return; const n = need().total, b = S.balance;
  el.innerHTML = b == null ? 'Balance: <b>…</b>' : `Balance: <b>${NX.sol(b)} SOL</b> · need ≥ <b>${NX.sol(n)} SOL</b> ${b >= n ? '<span class="ok">✓ ready</span>' : `<span class="bad">add ${NX.sol(n - b)} SOL</span>`}`;
  const go = root.querySelector('#nx-go'); if (go) go.disabled = !canLaunch(); }
function canLaunch() { const f = S.form; return !!S.wallet?.address && !S.busy && (S.balance == null || S.balance >= need().total) && f.name && /^[A-Z0-9]{1,10}$/.test(f.symbol || '') && f.image && f.ack; }

function walletCard() {
  const cfg = S.cfg || {}, soon = !cfg.phantomAppId, w = S.wallet;
  const social = (p, l) => `<button class="btn ${soon ? 'ghost soon' : 'green'}" data-nx="${p}" ${soon ? 'disabled title="Coming soon"' : ''}>${l}${soon ? '<small>coming soon</small>' : ''}</button>`;
  const hasExt = NX.extensionWallet().available();
  return `<div class="card"><h4><span class="num">1</span>Your wallet</h4>${w ? `<div class="small" style="margin:0">Connected with <b>${esc(w.label)}</b></div><div class="addr">${esc(w.address)}</div>${nameOf(w.address) ? `<div class="small">${walletHtml(w.address)}</div>` : ''}<div class="row"><button class="btn tiny ghost" data-nx="copy">Copy address</button><button class="btn tiny ghost" data-nx="disconnect">Disconnect</button></div>`
    : `<div class="small" style="margin:0 0 4px">No extension needed: sign in and Phantom creates a wallet that <b>you</b> own.</div><div class="row">${social('google', 'Sign in with Google')}${social('apple', 'Sign in with Apple')}</div>
      <div class="row"><button class="btn alt" data-nx="extension">${hasExt ? 'Use Phantom extension' : 'Phantom extension'}</button><span class="small" style="margin:0">${hasExt ? 'detected' : 'not detected'}</span>${hasExt ? '' : `<a class="btn ghost" href="https://phantom.app/ul/browse/${encodeURIComponent(location.href.split('?')[0])}?ref=${encodeURIComponent(location.origin)}">Open in Phantom app ↗</a>`}</div>${soon ? '<div class="small" style="margin:2px 0 0">Google/Apple sign-in is being set up. You can use the Phantom extension or app meanwhile.</div>' : ''}`}
    ${S.err ? `<div class="small bad">${esc(S.err)}</div>` : ''}</div>`; }

function topupCard(kit) { const w = S.wallet; if (!w?.address) return `<div class="card"><h4><span class="num">2</span>Top up with SOL</h4><div class="small" style="margin:0">Connect a wallet first. Launching costs about <b>${NX.sol(NX.minLamports().total)} SOL</b> with no opening swap.</div></div>`;
  const n = need();
  return `<div class="card"><h4><span class="num">2</span>Top up with SOL</h4>${kit ? `<div class="qr" title="Scan to send SOL">${qrSvg(w.address, kit)}</div>` : ''}<div class="small" style="margin:0">Send SOL (Solana network only) to your wallet:</div><div class="addr">${esc(w.address)}</div>
    <div class="row"><button class="btn tiny alt" data-nx="copy">Copy address</button><button class="btn tiny ghost" data-nx="refresh">Refresh balance</button></div><div class="bal small" id="nx-bal" style="margin:0"></div>
    <details><summary>How is the minimum worked out?</summary><ul class="tight"><li>pump.fun create (accounts rent + network fee): ${NX.sol(n.parts.create + n.parts.priority)} SOL</li>${n.parts.devBuy ? `<li>Opening swap: ${NX.sol(n.parts.devBuy)} SOL + fees/token account ${NX.sol(n.parts.devBuyFees)} SOL</li>` : ''}<li>Kept for later fees: ${NX.sol(n.parts.reserve)} SOL</li></ul></details>
    <details><summary><b>Buy SOL</b> (no card checkout inside Inu Verse)</summary><ul class="tight"><li>Phantom Connect has no built-in card on-ramp, so buy SOL elsewhere and send it here.</li><li><b>Coinbase / any exchange:</b> buy SOL → Send/Withdraw → paste the address above (or scan the QR) → network <b>Solana</b>. Send a small test first.</li><li><b>Phantom app:</b> sign in with the same Google/Apple account, tap Buy (card/Apple Pay where available), then it is already in this wallet.</li></ul></details></div>`; }

function formCard() { const f = S.form, n = need(), kib = f.pair === 'KIBBLE';
  return `<div class="card full"><h4><span class="num">3</span>Launch on pump.fun</h4><div class="two"><div><label>Coin name<input id="nx-name" maxlength="32" placeholder="Shiba Star" value="${esc(f.name || '')}"></label></div><div><label>Ticker<input id="nx-symbol" maxlength="10" placeholder="STAR" value="${esc(f.symbol || '')}"></label></div></div>
    <label>Image (PNG/JPG/GIF/WebP, resized to 512px)<div class="row" style="margin:2px 0">${f.image ? `<img class="imgprev" src="${f.image}" alt="">` : ''}<input id="nx-image" type="file" accept="image/png,image/jpeg,image/gif,image/webp" style="flex:1"></div></label>
    <label>Description<textarea id="nx-desc" maxlength="500" placeholder="What is your coin about?">${esc(f.description || '')}</textarea></label>
    <div class="two"><label>X / Twitter (optional)<input id="nx-twitter" placeholder="https://x.com/…" value="${esc(f.twitter || '')}"></label><label>Telegram (optional)<input id="nx-telegram" placeholder="https://t.me/…" value="${esc(f.telegram || '')}"></label></div>
    <label>Website (optional)<input id="nx-website" placeholder="https://…" value="${esc(f.website || '')}"></label>
    <div class="two"><label>Pair<select id="nx-pair"><option value="KIBBLE" ${kib ? 'selected' : ''}>★ $KIBBLE (default)</option><option value="SOL" ${kib ? '' : 'selected'}>SOL</option></select></label>
      <label>Opening swap (SOL, optional)<input id="nx-dev" type="number" min="0" max="5" step="0.01" value="${f.devBuySol || 0}"></label></div>
    ${kib && f.devBuySol > 0 ? `<label>Slippage limit (SOL → $KIBBLE leg)<select id="nx-slip">${NX.SLIPPAGE_CHOICES.map((b) => `<option value="${b}" ${b === f.slippageBps ? 'selected' : ''}>${b / 100}%</option>`).join('')}</select></label>` : ''}
    <div class="small" style="margin:2px 0">${kib ? '★ $KIBBLE pair (pump.fun Custom Pairs): pump.fun\'s official create_v2 takes $KIBBLE as the quote, so your coin trades against $KIBBLE. An opening swap is paid in SOL and routed SOL → $KIBBLE → your coin in the same transaction. The server dry-runs it on mainnet first; if pump.fun refuses the pair at that moment you will be told, and you can pick SOL.' : 'SOL pair: standard pump.fun bonding curve. ★ $KIBBLE is the default pair. Other pairs: use pump.fun\'s own page (guide below).'}</div>
    ${routePlan()}
    ${verifiedOptHtml(f.verified, 'nx-verified')}
    <div class="warnbox"><b>Read before launching:</b> this launches a REAL token on Solana mainnet from <b>your</b> wallet. You are the creator and pay about <b>${NX.sol(n.total - n.parts.reserve)} SOL</b>${n.parts.devBuy ? ' including your opening swap' : ''}. It cannot be undone or deleted. Memecoins usually go to zero. Inu Verse never holds your SOL, tokens or keys and never signs for you, and will <b>never ask for your seed phrase or private key</b>. Not financial advice.
      <label style="color:#f3d7d7"><input id="nx-ack" type="checkbox" style="width:auto" ${f.ack ? 'checked' : ''}> I understand and want to launch this coin myself.</label></div>
    <div class="row"><button class="btn green big" id="nx-go" ${canLaunch() ? '' : 'disabled'}>${S.busy ? 'Launching…' : 'Launch coin (one tap in Phantom)'}</button></div>${progress()}</div>`; }

// Before anything is built: the planned route and fee rates. After the dry run: exact amounts, and nothing opens the wallet until the player confirms.
function routePlan() { const f = S.form, p = NX.planRoute({ pair: f.pair, devBuySol: f.devBuySol, slippageBps: f.slippageBps, symbol: f.symbol });
  return `<div class="route" id="nx-plan"><h5>Route + fees (before you sign)</h5><ol>${p.steps.map((x) => `<li>${esc(x)}</li>`).join('')}</ol><ul>${p.fees.map((x) => `<li>${esc(x)}</li>`).join('')}${p.notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul><div>Exact amounts come from a mainnet dry run, and you confirm them before your wallet opens.</div></div>`; }
export function reviewHtml(built) { const r = built?.route; if (!r) return '';
  return `<div class="route live" id="nx-review"><h5>Check before signing · mainnet dry run</h5>${r.steps.length ? `<ol>${r.steps.map((s) => `<li>${esc(s.in)} → <span class="amt">${esc(s.out)}</span> via ${esc(s.venue)}</li>`).join('')}</ol>` : '<div>No swap: create only.</div>'}
    <ul>${r.fees.map((x) => `<li><b>${esc(x.label)}</b>${x.amount ? `: <span class="amt">${esc(x.amount)}</span>` : ''}. ${esc(x.plain)}</li>`).join('')}${r.notes.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>
    ${r.total ? `<div>Your wallet's SOL goes down by about <span class="amt">${esc(r.total.text)}</span> in total (${esc(r.total.from)}).</div>` : ''}
    <div class="row"><button class="btn green" data-rv="ok">Looks right: open my wallet to sign</button><button class="btn ghost" data-rv="no">Cancel</button></div></div>`; }

function progress() { if (!S.steps.length && !S.err2 && !S.result) return '';
  const cur = S.steps[S.steps.length - 1], r = S.result;
  return `${S.review ? reviewHtml(S.review.built) : ''}<ol class="prog">${STEP_ORDER.filter((s) => s !== 'done').map((s) => `<li class="${S.steps.includes(s) ? (s === cur && !r ? 'now' : 'done') : ''}">${STEP_TEXT[s]}</li>`).join('')}</ol>
    ${S.err2 ? `<div class="small bad">${esc(S.err2)}</div>` : ''}${r ? `<div class="small ok" style="margin:2px 0">${r.registered ? 'Your coin is live and on the Coin board!' : 'Your coin is live on pump.fun.' + (r.regError ? ' Board listing: ' + esc(r.regError) : '')}</div>
    <div class="addr">${esc(r.mint)}</div><div class="row"><a class="btn tiny green" target="_blank" rel="noopener noreferrer" href="https://pump.fun/coin/${esc(r.mint)}">View on pump.fun</a><a class="btn tiny ghost" target="_blank" rel="noopener noreferrer" href="https://solscan.io/tx/${esc(r.signature)}">Transaction</a><button class="btn tiny alt" data-nx="board">Coin board</button></div>` : ''}`; }

function safetyCard() { return `<div class="card full"><h4>Your wallet, your keys</h4><ul class="tight"><li><b>You own this wallet.</b> Google/Apple sign-in creates a self-custodial Phantom wallet. Inu Verse never sees its keys and cannot move your funds.</li><li><b>Back it up / export it:</b> open the Phantom app or phantom.com, sign in with the same Google/Apple account, and you can view, back up or export the wallet there.</li><li><b>We will never ask for a seed phrase or private key</b>, in game, by DM, or anywhere. Anyone who does is scamming you.</li><li>The server only <i>builds</i> an unsigned transaction; you review and sign it in Phantom. The coin's mint key is created in your browser for this one launch and never leaves it.</li><li>Phantom embedded wallets have a spending limit (about $1,000/day per app). Not financial advice.</li></ul></div>`; }

function render() { if (!root?.isConnected) return;
  root.innerHTML = `${walletCard()}${topupCard(S.kit)}${formCard()}${safetyCard()}`;
  if (S.wallet && !S.kit) NX.loadKit().then((k) => { S.kit = k; render(); }).catch(() => {});
  paintBalance(); bind(); }
function bind() {
  root.querySelectorAll('[data-nx]').forEach((b) => b.onclick = () => { const a = b.dataset.nx;
    if (a === 'google' || a === 'apple' || a === 'extension') connect(a); else if (a === 'disconnect') disconnect(); else if (a === 'copy') ctx.copyText?.(S.wallet.address);
    else if (a === 'refresh') refreshBalance(); else if (a === 'board') ctx.openBoard?.(); });
  const f = S.form, v = (id) => root.querySelector(id);
  for (const [id, k] of [['#nx-name', 'name'], ['#nx-desc', 'description'], ['#nx-twitter', 'twitter'], ['#nx-telegram', 'telegram'], ['#nx-website', 'website']]) { const el = v(id); if (el) el.oninput = () => { f[k] = el.value.trim(); paintBalance(); }; }
  const sy = v('#nx-symbol'); if (sy) sy.oninput = () => { sy.value = sy.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); f.symbol = sy.value; paintBalance(); };
  const pr = v('#nx-pair'); if (pr) pr.onchange = () => { f.pair = pr.value; render(); };
  const sl = v('#nx-slip'); if (sl) sl.onchange = () => { f.slippageBps = Number(sl.value); render(); };
  root.querySelectorAll('[data-rv]').forEach((b) => b.onclick = () => { const r = S.review; if (!r) return; S.review = null; r.done(b.dataset.rv === 'ok'); render(); });
  const dv = v('#nx-dev'); if (dv) dv.onchange = () => { f.devBuySol = Math.max(0, Math.min(5, Number(dv.value) || 0)); render(); };
  const vo = v('#nx-verified'); if (vo) vo.onchange = () => { f.verified = vo.checked; };
  const ack = v('#nx-ack'); if (ack) ack.onchange = () => { f.ack = ack.checked; paintBalance(); };
  const im = v('#nx-image'); if (im) im.onchange = async () => { const file = im.files?.[0]; if (!file) return; try { f.image = await NX.imageToDataUrl(file); render(); } catch { ctx.toast?.('Could not read that image', 'bad'); } };
  const go = v('#nx-go'); if (go) go.onclick = launch;
}
async function launch() { if (!canLaunch()) return; S.busy = true; S.steps = []; S.err2 = ''; S.result = null; render();
  try { const kit = S.kit || await NX.loadKit();
    S.result = await NX.launchCoin({ form: S.form, wallet: S.wallet, kit, api: S.api, onStep: (s) => { S.steps.push(s); render(); },
      review: (built) => new Promise((done) => { S.review = { built, done }; render(); root?.querySelector('#nx-review')?.scrollIntoView?.({ block: 'nearest' }); }) });
    ctx.toast?.(`$${S.form.symbol} launched!`, 'good'); ctx.refreshRegistry?.(true);
  } catch (e) { S.err2 = e?.cancelled ? e.message : /reject|cancel|denied/i.test(e?.message || '') ? 'You cancelled in Phantom. Nothing was sent.' : (e?.message || String(e)); }
  S.review = null;
  S.busy = false; render(); refreshBalance(); }
export const _state = S;
