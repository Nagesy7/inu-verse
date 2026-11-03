// 🚀 Launch Pro Pack card for launch-draft.html. Free watermarked preview -> Phantom-signed order (a message, free) -> Solana Pay
// to the Sponsor Chest with the order's reference -> read-only payment check on the server -> instant unlock -> clean zip.
// The art never leaves this tab; the server only sees name/ticker/side/parent + the buyer's wallet. Never sends a transaction:
// the buyer pays from their own wallet app. Analytics events carry no wallet data (va.js cleanProps). NFA.
import * as PP from './propack.js';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const providerOf = (w = globalThis) => w.phantom?.solana || (w.solana?.isPhantom ? w.solana : null);
const b64 = (u8) => { let s = ''; for (const x of u8) s += String.fromCharCode(x); return btoa(s); };
const short = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-4)}` : '');

export function mountProPack(root, { d, getImg, api, track = () => {}, toast = () => {}, copy = async () => {} }) {
  if (!root || !PP.propackAllowed(d)) { if (root) root.remove(); return null; }
  const KEY = `lh.propack.v1.${d.ticker}.${d.coin.ticker}`;
  const S = { cfg: { ...PP.PRICE_FALLBACK }, img: null, imgSrc: '', from: 'draft', artErr: '', o: { frame: 'ring', zoom: 1.1, px: 0, py: 0, clean: true, badge: false },
    soc: { web: '', x: '', tg: '' }, pk: null, order: null, busy: '', err: '', msg: '', previewed: false };
  try { Object.assign(S, { order: JSON.parse(localStorage.getItem(KEY) || 'null') }); } catch {}
  const call = async (op, body, q = '') => {
    const r = await fetch(`${api}/api/cabal?op=${op}${q}${body ? '' : '&_=' + Date.now()}`, body ? { method: 'POST', body: JSON.stringify({ op, ...body }), headers: { 'content-type': 'text/plain;charset=UTF-8' } } : {});
    let j = {}; try { j = await r.json(); } catch {} return { status: r.status, ...j };
  };
  const save = () => { try { S.order ? localStorage.setItem(KEY, JSON.stringify({ id: S.order.id, key: S.order.key || null, sig: S.order.sig || null })) : localStorage.removeItem(KEY); } catch {} };
  const unlocked = () => !!S.order?.unlocked;

  root.innerHTML = `<h3 class="px">🚀 Launch Pro Pack <span class="pp-price" id="pp-price"></span></h3>
  <div class="plan">Pro token art, banners, a pump.fun-ready field sheet and a launch checklist, built <b>in your browser</b> from this draft. Your art never leaves this tab. The preview below is free and watermarked.</div>
  <ul class="pp-list" id="pp-contents"></ul>
  <div class="pp-ctl">
    <div class="pp-row"><b>Art</b><label class="btn tiny ghost" id="pp-use-draft-l"><input type="radio" name="pp-src" value="draft" checked> This draft's meme</label>
      <label class="btn tiny ghost"><input type="radio" name="pp-src" value="upload"> Upload your art</label><input type="file" id="pp-file" accept="image/png,image/jpeg,image/webp,image/gif" hidden></div>
    <div class="pp-row"><b>Frame</b><select id="pp-frame">${PP.FRAMES.map(([v, l]) => `<option value="${v}">${l}</option>`).join('')}</select>
      <label><input type="checkbox" id="pp-clean" checked> Cleanup (contrast + colour)</label><label><input type="checkbox" id="pp-badge"> $${esc(d.ticker)} badge on logo</label></div>
    <div class="pp-row"><b>Crop</b><label>Zoom <input type="range" id="pp-zoom" min="1" max="3" step="0.05" value="1.1"></label><label>↔ <input type="range" id="pp-px" min="-1" max="1" step="0.05" value="0"></label><label>↕ <input type="range" id="pp-py" min="-1" max="1" step="0.05" value="0"></label>
      <span class="plan">Zoom in to crop out meme captions.</span></div>
    <div class="pp-row"><b>Socials</b><input id="pp-web" placeholder="website (https://…)" maxlength="200"><input id="pp-x" placeholder="X @handle" maxlength="60"><input id="pp-tg" placeholder="Telegram t.me/…" maxlength="60"></div>
    <div class="plan bad" id="pp-arterr"></div>
  </div>
  <div class="pp-prev">
    <figure><canvas id="pp-logo1000" class="pp-logo"></canvas><figcaption>logo-1000.png</figcaption></figure>
    <figure><canvas id="pp-logo512" class="pp-logo sm"></canvas><figcaption>logo-512.png</figcaption></figure>
    <figure class="wide"><canvas id="pp-bx"></canvas><figcaption>banner-x-1500x500.png (X header, the lower-left stays clear for your profile picture)</figcaption></figure>
    <figure class="mid"><canvas id="pp-b169"></canvas><figcaption>banner-1280x720.png (Telegram / 16:9)</figcaption></figure>
    <figure class="mid"><canvas id="pp-cl"></canvas><figcaption>launch-checklist.png</figcaption></figure>
  </div>
  <h4 class="px">Token sheet (pump.fun fields)</h4><div id="pp-sheet"></div>
  <div id="pp-buy" class="pp-buy"></div>`;
  const $ = (s) => root.querySelector(s);

  /* ---------- art + previews ---------- */
  const loadImg = (src) => new Promise((ok, no) => { const im = new Image(); if (!/^(data|blob):/.test(src)) im.crossOrigin = 'anonymous'; im.onload = () => ok(im); im.onerror = no; im.src = src; });
  async function setArt(src, from) {
    if (!src) return; S.from = from; S.artErr = '';
    try { S.img = await loadImg(src); S.imgSrc = src; } catch { S.img = null; S.artErr = from === 'upload' ? "That file couldn't be read as an image." : "Couldn't load this draft's image here. Upload your art instead."; }
    draw();
  }
  let raf = 0; const draw = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(drawNow); };
  function drawNow() {
    $('#pp-arterr').textContent = S.artErr;
    if (!S.img) return;
    const o = { ...S.o, color: d.color, ticker: d.ticker, preview: !unlocked() };
    try {
      const l = PP.drawLogo($('#pp-logo1000'), S.img, 1000, o); l.getContext('2d').getImageData(0, 0, 1, 1); // throws if the image is cross-origin (tainted)
      PP.drawLogo($('#pp-logo512'), S.img, 512, o);
      PP.drawBanner($('#pp-bx'), S.img, d, 1500, 500, o); PP.drawBanner($('#pp-b169'), S.img, d, 1280, 720, o);
      const clean = document.createElement('canvas'); PP.drawLogo(clean, S.img, 240, { ...o, preview: false });
      PP.drawChecklist($('#pp-cl'), clean, d, PP.checklist(d, fields()), o);
    } catch { S.artErr = "This image can't be used in the browser (cross-origin). Upload your art instead."; $('#pp-arterr').textContent = S.artErr; }
  }
  const fields = () => PP.pumpFields(d, S.soc);
  function renderSheet() {
    const u = unlocked();
    $('#pp-sheet').innerHTML = fields().map((f) => `<div class="field"><b>${esc(f.label)}</b><div class="v">${f.value ? esc(f.value) : '<span class="plan">(leave blank)</span>'}${f.note ? `<div class="plan">${esc(f.note)}</div>` : ''}</div>${
      f.value && !f.file ? (u ? `<button class="btn tiny ghost" data-ppcopy="${esc(f.value)}">Copy</button>` : '<button class="btn tiny ghost" disabled title="Unlock the pack to copy">🔒 Copy</button>') : '<span></span>'}</div>`).join('');
    root.querySelectorAll('[data-ppcopy]').forEach((b) => b.onclick = () => copy(b.dataset.ppcopy, 'Copied'));
  }
  const firstPreview = () => { if (!S.previewed) { S.previewed = true; track('propack_preview', { frame: S.o.frame, src: S.from, side: d.side }); } };
  root.querySelectorAll('input[name="pp-src"]').forEach((r) => r.onchange = () => { firstPreview(); if (r.value === 'upload') $('#pp-file').click(); else setArt(getImg(), 'draft'); });
  $('#pp-file').onchange = (e) => { const f = e.target.files?.[0]; if (!f) return; if (f.size > 8e6) { S.artErr = 'Max 8 MB.'; draw(); return; } setArt(URL.createObjectURL(f), 'upload'); };
  $('#pp-frame').onchange = (e) => { S.o.frame = e.target.value; firstPreview(); draw(); };
  $('#pp-clean').onchange = (e) => { S.o.clean = e.target.checked; draw(); };
  $('#pp-badge').onchange = (e) => { S.o.badge = e.target.checked; draw(); };
  for (const k of ['zoom', 'px', 'py']) $('#pp-' + k).oninput = (e) => { S.o[k] = Number(e.target.value); firstPreview(); draw(); };
  for (const k of ['web', 'x', 'tg']) $('#pp-' + k).oninput = (e) => { S.soc[k] = e.target.value; renderSheet(); draw(); };

  /* ---------- buy / unlock ---------- */
  function renderBuy() {
    const c = S.cfg, o = S.order, p = o?.pay, busy = !!S.busy;
    $('#pp-price').innerHTML = `${esc(c.sol)} SOL${c.priceFinal === false ? ' <span class="chip pp-prop">PROPOSAL price</span>' : ''}`;
    let h = '';
    if (unlocked()) {
      h = `<div class="good"><b>✅ Paid and unlocked.</b> No watermark from here on.</div>
        <div class="row"><button class="btn green" id="pp-zip" ${busy ? 'disabled' : ''}>${S.busy === 'zip' ? 'Building zip…' : '⬇ Download clean zip'}</button>
        ${o.sig ? `<a class="btn ghost" href="https://solscan.io/tx/${esc(o.sig)}" target="_blank" rel="noopener noreferrer">Payment tx ↗</a>` : ''}</div>
        <div class="plan">${PP.FILES.length} files: ${PP.FILES.map(esc).join(', ')}. Order ${esc(o.id)}.</div>`;
    } else if (o?.id) {
      h = `<ol class="pp-steps"><li class="done">Order signed (free) ✔ <span class="plan">Order ${esc(o.id)}</span></li>
        <li><b>Pay ${esc(p?.sol ?? c.sol)} SOL</b> to the ${esc(p?.toLabel || c.payToLabel)} from the wallet you signed with${S.pk || o.wallet ? ` (${esc(short(S.pk || o.wallet))})` : ''}.
          ${p ? `<div class="row"><a class="btn" id="pp-solpay" href="${esc(p.solanaPay)}">Pay with Solana Pay ↗</a><button class="btn tiny ghost" data-ppc="${esc(p.solanaPay)}">Copy pay link</button></div>
          <div class="pp-kv"><span>To</span><code>${esc(p.to)}</code><button class="btn tiny ghost" data-ppc="${esc(p.to)}">Copy</button>
            <span>Amount</span><code>${esc(p.sol)} SOL</code><span></span>
            <span>Memo</span><code>${esc(p.memo)}</code><button class="btn tiny ghost" data-ppc="${esc(p.memo)}">Copy</button>
            <span>Reference</span><code class="sm">${esc(p.reference)}</code><span></span></div>` : ''}</li>
        <li><button class="btn green" id="pp-check" ${busy ? 'disabled' : ''}>${S.busy === 'check' ? 'Checking…' : 'Check payment'}</button> <span class="plan">A read-only lookup. A verified payment unlocks the clean zip right away.</span></li></ol>
        <button class="btn tiny ghost" id="pp-reset">Start over</button>`;
    } else {
      const prov = providerOf();
      h = `<ol class="pp-steps"><li>${S.pk ? `Connected: <code>${esc(short(S.pk))}</code>` : prov ? `<button class="btn" id="pp-connect" ${busy ? 'disabled' : ''}>Connect Phantom</button>` : `<a class="btn" href="https://phantom.app/ul/browse/${encodeURIComponent(location.href)}?ref=${encodeURIComponent(location.origin)}">Open in Phantom</a> <span class="plan">No Phantom found in this browser.</span>`}</li>
        <li><button class="btn green" id="pp-sign" ${S.pk && !busy ? '' : 'disabled'}>${S.busy === 'sign' ? 'Approve in Phantom…' : 'Sign order (free)'}</button> <span class="plan">A signed message, not a transaction: no funds move.</span></li>
        <li>Pay ${esc(c.sol)} SOL with Solana Pay, then Check payment.</li></ol>`;
    }
    h += `<div class="plan">${esc(c.refund)}${c.refundFinal === false ? ' <span class="chip pp-prop">PROPOSAL wording</span>' : ''} A design pack, not a launch, a listing or an endorsement. Not financial advice.</div>`;
    if (S.err) h += `<div class="plan bad" id="pp-err">${esc(S.err)}</div>`;
    if (S.msg) h += `<div class="plan good" id="pp-msg">${esc(S.msg)}</div>`;
    $('#pp-buy').innerHTML = h;
    $('#pp-connect') && ($('#pp-connect').onclick = connect); $('#pp-sign') && ($('#pp-sign').onclick = order);
    $('#pp-check') && ($('#pp-check').onclick = check); $('#pp-zip') && ($('#pp-zip').onclick = zip);
    $('#pp-reset') && ($('#pp-reset').onclick = () => { S.order = null; S.err = S.msg = ''; save(); renderBuy(); });
    root.querySelectorAll('[data-ppc]').forEach((b) => b.onclick = () => copy(b.dataset.ppc, 'Copied'));
  }
  const fail = (e) => { S.err = /reject|cancel|denied/i.test(e?.message || '') ? 'You cancelled in Phantom. Nothing was signed.' : String(e?.message || e); };
  async function connect() { S.err = ''; try { const p = providerOf(); const r = await p.connect(); S.pk = (r?.publicKey || p.publicKey)?.toString() || null; } catch (e) { fail(e); } renderBuy(); }
  async function order() {
    const p = providerOf(); if (!p || !S.pk) return; S.busy = 'sign'; S.err = S.msg = ''; renderBuy();
    const body = { wallet: S.pk, ticker: d.ticker, name: d.name, side: d.side, parent: d.coin.ticker, issued: new Date().toISOString() };
    try {
      const m = await call('propack-message', null, '&' + new URLSearchParams({ wallet: body.wallet, ticker: body.ticker, name: body.name, side: body.side, parent: body.parent, issued: body.issued }));
      if (!m.message) throw new Error(m.reason || 'server unavailable, try again');
      const out = await p.signMessage(new TextEncoder().encode(m.message), 'utf8'); const sig = out?.signature || out;
      const r = await call('propack-order', { ...body, signature: b64(sig instanceof Uint8Array ? sig : new Uint8Array(sig)) });
      if (!r.ok) throw new Error(r.reason || r.error || 'order refused');
      S.order = { id: r.id, pay: r.pay, wallet: S.pk }; save(); S.msg = r.note || ''; track('propack_order', { result: 'ok', side: d.side });
    } catch (e) { fail(e); track('propack_order', { result: /cancel/i.test(S.err) ? 'cancel' : 'error' }); }
    S.busy = ''; renderBuy();
  }
  async function check() {
    S.busy = 'check'; S.err = S.msg = ''; renderBuy();
    try { const r = await call('propack-pay-check', { id: S.order.id });
      if (r.unlocked) { Object.assign(S.order, { unlocked: true, key: r.key, sig: r.payment?.sig || null }); save(); S.msg = r.note || 'Unlocked.'; track('propack_pay_check', { result: 'unlocked' }); renderSheet(); draw(); }
      else { S.err = r.reason || r.error || 'not found yet'; if (r.pay) S.order.pay = r.pay; track('propack_pay_check', { result: r.status === 429 ? 'ratelimited' : 'waiting' }); }
    } catch (e) { fail(e); track('propack_pay_check', { result: 'error' }); }
    S.busy = ''; renderBuy();
  }
  async function zip() {
    if (!unlocked() || !S.img) { S.err = S.img ? 'Locked.' : 'Add your art first.'; renderBuy(); return; }
    S.busy = 'zip'; S.err = ''; renderBuy();
    try {
      const o = { ...S.o, color: d.color, ticker: d.ticker, preview: false }, cv = () => document.createElement('canvas'), f = fields(), cl = PP.checklist(d, f);
      const l1000 = PP.drawLogo(cv(), S.img, 1000, o), small = PP.drawLogo(cv(), S.img, 240, o);
      const files = [
        { name: 'logo-1000.png', data: await PP.canvasBytes(l1000) },
        { name: 'logo-512.png', data: await PP.canvasBytes(PP.drawLogo(cv(), S.img, 512, o)) },
        { name: 'banner-x-1500x500.png', data: await PP.canvasBytes(PP.drawBanner(cv(), S.img, d, 1500, 500, o)) },
        { name: 'banner-1280x720.png', data: await PP.canvasBytes(PP.drawBanner(cv(), S.img, d, 1280, 720, o)) },
        { name: 'token-sheet.txt', data: PP.sheetText(d, f) }, { name: 'token-sheet.html', data: PP.sheetHtml(d, f) },
        { name: 'launch-checklist.png', data: await PP.canvasBytes(PP.drawChecklist(cv(), small, d, cl, o)) },
        { name: 'launch-checklist.txt', data: PP.checklistText(d, cl) }, { name: 'README.txt', data: PP.readme(d, S.order) }];
      const blob = new Blob([PP.makeZip(files)], { type: 'application/zip' }), a = document.createElement('a');
      a.href = URL.createObjectURL(blob); a.download = `${d.ticker}-launch-pro-pack.zip`; document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 30000);
      track('propack_download', { files: files.length }); toast('Zip downloaded');
    } catch { S.err = "Couldn't build the zip in this browser. Try again, or upload your art."; track('propack_download', { result: 'error' }); }
    S.busy = ''; renderBuy();
  }

  /* ---------- boot ---------- */
  $('#pp-contents').innerHTML = (S.cfg.contents || ['Pro token logo 512 + 1000 px', 'X banner 1500×500 + 1280×720 banner', 'pump.fun field sheet with copy buttons', 'One-page launch checklist', 'One clean zip']).map((t) => `<li>${esc(t)}</li>`).join('');
  renderSheet(); renderBuy(); setArt(getImg(), 'draft');
  track('propack_view', { side: d.side, coin: d.coin.ticker });
  (async () => {
    const c = await call('propack-config').catch(() => null);
    if (c?.ok) { S.cfg = { ...S.cfg, ...c }; $('#pp-contents').innerHTML = c.contents.map((t) => `<li>${esc(t)}</li>`).join(''); }
    if (S.order?.id) { const st = await call('propack-status', null, '&' + new URLSearchParams({ id: S.order.id, ...(S.order.key ? { key: S.order.key } : {}) })).catch(() => null);
      if (!st?.ok) S.order = null; else { S.order.unlocked = !!st.unlocked; S.order.pay = st.pay || S.order.pay; if (!st.unlocked && st.order?.status === 'unlocked') S.order.unlocked = false; } save();
      renderSheet(); draw(); }
    renderBuy();
  })();
  return { refresh: () => { if (S.from === 'draft') setArt(getImg(), 'draft'); } };
}
