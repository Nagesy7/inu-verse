// Standalone Launch Hall (hub + /hall.html). No Inu Verse world, title screen, or SIWS session.
// Wallet connect (Phantom extension / Google-Apple when configured) only when launching or registering via create-tx proof.
import * as RC from './realcoins.js';
import * as VF from './verified.js';
import * as CL from './cleanlaunch.js';
import * as WL from './wallets.js';
import { mountNoExt } from './launchui.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const SHELL_CSS = `
@font-face{font-family:Silkscreen;src:url(https://inu-verse-tawny.vercel.app/fonts/Silkscreen.ttf) format("truetype");font-display:swap}
.inu-hall{--navy:#121a36;--navy2:#1b2550;--navy3:#24305c;--gold:#d4a640;--goldl:#f2cc68;--goldd:#8f6a22;--cream:#f6e7b8;--ink:#0c1022;--red:#b3202c;--green:#2f8a52;
  font-family:Silkscreen,monospace;color:var(--cream);background:var(--navy);border:4px solid var(--gold);box-shadow:0 0 0 4px var(--ink);padding:16px 18px;border-radius:4px;text-align:left}
.inu-hall *{box-sizing:border-box}.inu-hall h2{margin:0 0 6px;color:var(--goldl);font-weight:normal;font-size:22px;text-transform:uppercase}
.inu-hall h3{color:var(--goldl);font-weight:normal;margin:0 0 6px}.inu-hall .sub{margin:0 0 10px;color:#cfc6a4;font-size:12px;line-height:1.5}
.inu-hall .row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:6px 0}
.inu-hall .tabs{justify-content:flex-start;margin:0 0 10px}
.inu-hall .btn{border:3px solid var(--ink);padding:7px 12px;font:inherit;font-size:13px;background:var(--gold);color:var(--ink);cursor:pointer;box-shadow:inset -3px -3px 0 var(--goldd),inset 3px 3px 0 var(--goldl);text-transform:uppercase;text-decoration:none;display:inline-block}
.inu-hall .btn:hover{filter:brightness(1.1)}.inu-hall .btn.ghost{background:var(--navy);color:var(--cream);border-color:var(--goldd);box-shadow:none}
.inu-hall .btn.alt{background:var(--navy3);color:var(--goldl);border-color:var(--gold)}.inu-hall .btn.green{background:var(--green);color:#fff}
.inu-hall .btn.tiny{font-size:11px;padding:4px 8px}.inu-hall .btn:disabled{opacity:.5;cursor:not-allowed}
.inu-hall .card{background:var(--navy2);border:2px solid var(--goldd);padding:10px;margin:0 0 8px}
.inu-hall .small{font-size:11px;color:#b9b08e;margin:4px 0;line-height:1.45}.inu-hall .bad{color:#ff8f8f}.inu-hall .good{color:#7fe0a0}
.inu-hall .ca{display:flex;gap:6px;align-items:center;margin:4px 0}.inu-hall .ca code{flex:1;min-width:0;overflow-wrap:anywhere;background:var(--navy);border:2px solid var(--goldd);padding:6px;font-size:11px}
.inu-hall .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:8px 0}.inu-hall .stats div{background:var(--navy);border:2px solid var(--goldd);padding:6px;text-align:center;font-size:11px}.inu-hall .stats b{display:block;font-size:14px;color:var(--cream)}
.inu-hall .stats .up{color:#7fe0a0}.inu-hall .stats .dn{color:#ff8f8f}
.inu-hall .nfa{margin-top:8px;font-size:10px;opacity:.85;border-left:3px solid var(--gold);padding:4px 8px;color:#cfc6a4}
.inu-hall .regboard{display:flex;flex-direction:column;gap:6px;max-height:52vh;overflow:auto}
.inu-hall .regcoin{display:flex;gap:8px;justify-content:space-between;align-items:flex-start;background:var(--navy);border:2px solid var(--goldd);padding:8px;flex-wrap:wrap}
.inu-hall .chip{display:inline-block;background:var(--navy3);border:1px solid var(--goldd);padding:1px 6px;font-size:10px;margin-left:4px;color:var(--goldl)}
.inu-hall input,.inu-hall textarea{width:100%;box-sizing:border-box;background:var(--navy);color:var(--cream);border:2px solid var(--goldd);padding:6px;font:12px monospace;margin:4px 0}
.inu-hall .pairlist{display:flex;flex-direction:column;gap:4px;margin:4px 0}
.inu-hall .pairrow{display:grid;grid-template-columns:auto 1fr auto auto;gap:6px;align-items:center;background:var(--navy);border:2px solid var(--goldd);padding:4px 6px}
.inu-hall .pairrow.feat{border-color:var(--gold)}.inu-hall .kibsplit{margin:6px 0;font-size:11px}
.inu-hall .note{background:#1a2748;border:2px dashed var(--goldd);padding:8px;font-size:11px;line-height:1.45;margin:0 0 10px;color:#cfc6a4}
.inu-hall .toast-host{position:fixed;top:72px;left:50%;transform:translateX(-50%);z-index:100;display:flex;flex-direction:column;gap:6px;pointer-events:none}
.inu-hall-toast{background:var(--navy);border:3px solid var(--gold);color:var(--cream);padding:7px 14px;font:12px Silkscreen,monospace}.inu-hall-toast.good{border-color:#4cb072}.inu-hall-toast.bad{border-color:#d84a54}
@media(max-width:700px){.inu-hall .stats{grid-template-columns:repeat(2,1fr)}}
`;

function injectShell(doc = document) {
  if (doc.getElementById('inu-hall-css')) return;
  const s = doc.createElement('style'); s.id = 'inu-hall-css'; s.textContent = SHELL_CSS; doc.head.appendChild(s);
}

const NFA = '<div class="nfa">Not financial advice. No price promises. Coins here are user-launched memecoins on pump.fun: they can go to zero. Always check the contract address.</div>';

export function bootHall(root, opts = {}) {
  if (!root) throw new Error('bootHall: root element required');
  const apiBase = String(opts.apiBase || '').replace(/\/$/, '');
  const verseHome = String(opts.verseHome || apiBase || 'https://inu-verse-tawny.vercel.app').replace(/\/$/, '');
  injectShell(); VF.injectCss();
  const S = { tab: opts.tab || 'launch', coins: [], offline: false, reason: '', loaded: 0, sel: null };
  const toastHost = document.createElement('div'); toastHost.className = 'toast-host'; document.body.appendChild(toastHost);
  const toast = (msg, kind = '') => { const el = document.createElement('div'); el.className = 'inu-hall-toast ' + kind; el.textContent = msg; toastHost.appendChild(el); setTimeout(() => el.remove(), 4200); };
  const copyText = async (t) => { try { await navigator.clipboard.writeText(t); toast('Copied', 'good'); } catch { toast(t); } };
  const baseOpts = { base: apiBase };

  async function refreshRegistry(force) {
    if (!force && Date.now() - S.loaded < 30000) return;
    S.loaded = Date.now();
    const r = await RC.listCoins(baseOpts);
    S.coins = r.coins || []; S.offline = !r.ok; S.reason = r.reason || '';
    await RC.fetchStats([RC.KIBBLE.mint, ...S.coins.map((c) => c.mint)]);
    const wantV = S.coins.filter((c) => c.verifiedOptIn).map((c) => c.mint);
    if (wantV.length) await VF.fetchVerified(wantV, baseOpts);
    await CL.fetchClean([RC.KIBBLE.mint, ...S.coins.map((c) => c.mint)], baseOpts);
  }

  function statBox(mint) {
    const st = RC.statsOf(mint);
    return `<div class="stats"><div>Price<b>${RC.fmtUsd(st?.priceUsd)}</b>USD</div><div>Market cap<b>${RC.fmtUsd(st?.mcap)}</b>USD</div><div>24h<b class="${st?.change24 == null ? '' : st.change24 >= 0 ? 'up' : 'dn'}">${RC.fmtPct(st?.change24)}</b>change</div><div>24h volume<b>${RC.fmtUsd(st?.vol24)}</b>USD</div></div>`;
  }
  const vfSlot = (mint) => `<div data-vfslot="${mint}">${VF.badgeHtml(mint)}</div>`;
  const cleanSlot = (mint) => `<div data-cleanslot="${mint}">${CL.badgeHtml(mint)}</div>`;

  function render() {
    const tabs = [['kibble', '$KIBBLE'], ['launch', 'Launch your coin'], ['board', 'Coin board']];
    const head = `<h2>Launch Hall</h2>
      <div class="note">Open from the Inu hub — <b>no Inu Verse account / SIWS sign-in</b>. Connect a wallet only when you launch (or register with a create-tx proof). <a href="${esc(verseHome)}/" style="color:var(--goldl)">Play the full Verse</a> anytime.</div>
      <div class="row tabs">${tabs.map(([k, l]) => `<button class="btn ${k === S.tab ? '' : 'ghost'}" data-tab="${k}">${l}</button>`).join('')}</div>`;
    let body = '';
    if (S.tab === 'kibble') {
      const K0 = RC.KIBBLE;
      body = `<div class="card"><h3>$KIBBLE <span class="small">official · Solana ${K0.program}</span></h3>
        <div class="small">Contract address (only this one is real):</div>
        <div class="ca"><code>${K0.mint}</code><button class="btn alt tiny" data-copy="${K0.mint}">Copy</button></div>
        ${statBox(K0.mint)}<div class="kibsplit"><b>Creator fee split</b>${WL.splitHtml(WL.KIBBLE_SPLIT)}</div>
        ${vfSlot(K0.mint)}${cleanSlot(K0.mint)}
        <div class="row"><a class="btn green" target="_blank" rel="noopener noreferrer" href="${RC.PUMP_COIN(K0.mint)}">View on pump.fun</a>
        <a class="btn ghost" target="_blank" rel="noopener noreferrer" href="${RC.DEX_URL(K0.mint)}">DexScreener</a></div></div>${NFA}`;
    } else if (S.tab === 'launch') {
      body = `<div id="noext" class="noext"><div class="small">Loading launcher…</div></div>
        <details class="card"><summary><b>Prefer pump.fun's own page?</b></summary>
          <p class="small">We never create, hold or sign tokens. Launch on pump.fun with your own wallet, then register on the Coin board with the create transaction signature.</p>
          <div class="row"><a class="btn green" target="_blank" rel="noopener noreferrer" href="${RC.PUMP_CREATE}">Open pump.fun create ↗</a></div>
          <div id="pairlist" class="pairlist"><span class="small">Loading eligible pairs…</span></div>
        </details>${NFA}`;
    } else {
      body = `<div class="card"><b>Register a coin you launched</b>
        <div class="small">No Verse sign-in. Paste the mint and the <b>create transaction signature</b> from Solscan/pump.fun (fee payer must be the pump.fun creator). Coins launched in this Hall auto-register after you sign.</div>
        <label class="small">Mint<input id="reg-mint" maxlength="44" autocomplete="off" spellcheck="false" placeholder="Your coin's mint address"></label>
        <label class="small">Create tx signature<input id="reg-sig" maxlength="120" autocomplete="off" spellcheck="false" placeholder="Transaction signature"></label>
        ${VF.verifiedOptHtml(false, 'reg-verified')}
        <button class="btn green" id="reg-go">Register with create-tx proof</button>
        <div class="small" id="reg-msg"></div></div>
        <b>Registered coins</b><div class="regboard" id="regboard"></div>${NFA}`;
    }
    root.className = 'inu-hall';
    root.innerHTML = head + body;
    root.querySelector('.tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) { S.tab = b.dataset.tab; render(); } };
    root.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => copyText(b.dataset.copy));

    if (S.tab === 'launch') {
      mountNoExt(root.querySelector('#noext'), {
        apiBase, toast, copyText,
        refreshRegistry: () => refreshRegistry(true).then(() => {}),
        openBoard: () => { S.tab = 'board'; render(); },
      }).catch(() => { const el = root.querySelector('#noext'); if (el) el.innerHTML = '<div class="small bad">Launcher unavailable right now — use the pump.fun guide below.</div>'; });
      RC.listPairs(baseOpts).then((r) => {
        const el = root.querySelector('#pairlist'); if (!el) return;
        el.innerHTML = (r.pairs || []).map((p) => `<div class="pairrow ${p.featured ? 'feat' : ''}"><b>${p.featured ? '★ ' : ''}$${esc(p.symbol)}</b><span class="small">${esc(p.name || '')}</span><code>${RC.short(p.mint)}</code><button class="btn tiny ghost" data-copy="${p.mint}">Copy CA</button></div>`).join('')
          || '<div class="small">Pair list unavailable.</div>';
        el.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => copyText(b.dataset.copy));
      });
    }
    if (S.tab === 'board') {
      refreshRegistry(true).then(() => paintBoard());
      const go = root.querySelector('#reg-go');
      if (go) go.onclick = async () => {
        const msg = root.querySelector('#reg-msg'), mint = root.querySelector('#reg-mint')?.value.trim(), signature = root.querySelector('#reg-sig')?.value.trim();
        const say = (t, bad) => { if (msg) { msg.textContent = t; msg.className = 'small ' + (bad ? 'bad' : 'good'); } };
        if (!RC.isMint(mint)) return say('Paste a Solana mint address.', true);
        if (!/^[1-9A-HJ-NP-Za-km-z]{64,90}$/.test(signature || '')) return say('Paste the create transaction signature (base58).', true);
        say('Checking on-chain create proof…');
        const verified = !!root.querySelector('#reg-verified')?.checked;
        const r = await RC.postCoins({ action: 'register', mint, signature, ...(verified ? { verified: true } : {}) }, baseOpts);
        if (!r.ok) return say(r.reason || 'register failed', true);
        say(r.already ? (r.optedIn ? 'Already registered — opted in to Verified Launch.' : 'Already registered.') : 'Registered!');
        await refreshRegistry(true); paintBoard();
      };
    }
    if (S.tab === 'kibble') {
      refreshRegistry(true).then(() => {
        const el = root.querySelector('.stats'); if (el) el.outerHTML = statBox(RC.KIBBLE.mint);
        root.querySelectorAll('[data-vfslot]').forEach((el) => { el.innerHTML = VF.badgeHtml(el.dataset.vfslot); });
        root.querySelectorAll('[data-cleanslot]').forEach((el) => { el.innerHTML = CL.badgeHtml(el.dataset.cleanslot); });
      });
    }
  }

  function paintBoard() {
    const el = root.querySelector('#regboard'); if (!el) return;
    if (S.offline) { el.innerHTML = `<p class="small">Coin board offline (${esc(S.reason || 'unavailable')}).</p>`; return; }
    if (!S.coins.length) { el.innerHTML = '<p class="small">No player coins registered yet. Launch above — it auto-lists after you sign.</p>'; return; }
    el.innerHTML = S.coins.map((c) => {
      const st = RC.statsOf(c.mint);
      return `<div class="regcoin"><div><b>$${esc(st?.symbol || c.symbol || '???')}</b> ${esc(st?.name || c.name || '')}
        ${c.pairedWithKibble ? '<span class="chip">paired with $KIBBLE</span>' : ''}
        <div class="small">CA <code>${RC.short(c.mint)}</code> · creator ${RC.short(c.creator)}</div>
        <div class="small">Price ${RC.fmtUsd(st?.priceUsd)} · MC ${RC.fmtUsd(st?.mcap)} · 24h ${RC.fmtPct(st?.change24)}</div>
        ${vfSlot(c.mint)}${cleanSlot(c.mint)}</div>
        <div class="row"><a class="btn tiny green" href="${RC.PUMP_COIN(c.mint)}" target="_blank" rel="noopener noreferrer">pump.fun</a>
        <button class="btn tiny ghost" data-copy="${c.mint}">Copy CA</button></div></div>`;
    }).join('');
    el.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => copyText(b.dataset.copy));
  }

  render();
  return { render, refreshRegistry, setTab: (t) => { S.tab = t; render(); } };
}

// Auto-boot when loaded as /hall.html
if (typeof document !== 'undefined' && document.currentScript?.dataset?.autoboot !== '0') {
  // module scripts: boot from hall.html calling bootHall explicitly
}
