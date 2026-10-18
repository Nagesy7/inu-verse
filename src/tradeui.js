// Trading Post panel (Round 3): item-for-item trades between players. Phone-landscape first (844x390, 667x375).
// Flow: pick a player (nearby in your room or online for trading) -> pick what you give and what you get -> they see it ->
// either side may change it (that locks it for a moment and clears both confirmations) -> each side confirms by SIGNING A
// MESSAGE with their wallet (never a transaction) -> the server swaps both items or neither and logs every step in the
// Paw Audit Bureau's item book. Cancel, block and report are always one tap away. No Bones, Pawmarks or $KIBBLE ever.
import * as TR from './trade.js';
import { OUTFITS } from './outfits.js';
import { FURNITURE } from './furniture.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export function tradeApi(base = '', f = (...a) => globalThis.fetch(...a)) {
  return async (body, session) => { const r = await f(`${base}/api/home`, { method: 'POST', headers: { 'content-type': 'application/json', ...(session ? { authorization: 'Bearer ' + session } : {}) }, body: JSON.stringify({ op: 'trade', ...body }) });
    let j = null; try { j = await r.json(); } catch { /* not json */ } if (!r.ok) throw Object.assign(new Error(j?.error || 'Trading is unavailable right now'), { status: r.status, data: j }); return j; };
}
const colorOf = (id) => { const t = TR.tradeInfo(id); if (!t) return '#888'; return t.kind === 'wardrobe' ? OUTFITS[t.key]?.look?.frame && OUTFITS[t.key].look.frame !== '#15151c' ? OUTFITS[t.key].look.frame : OUTFITS[t.key]?.look?.c || '#888' : FURNITURE[t.key]?.color || '#888'; };
const chip = (id, attrs = '', on = false) => attrs === 'show' ? `<span class="ti show"><i style="background:${esc(colorOf(id))}"></i><span>${esc(TR.itemName(id))}</span><small>${TR.tradeInfo(id)?.kind === 'wardrobe' ? esc(TR.tradeInfo(id).slot) : 'furniture'}</small></span>` : `<button class="ti${on ? ' on' : ''}" ${attrs}><i style="background:${esc(colorOf(id))}"></i><span>${esc(TR.itemName(id))}</span><small>${TR.tradeInfo(id)?.kind === 'wardrobe' ? esc(TR.tradeInfo(id).slot) : 'furniture'}</small></button>`;
export const TRADE_CSS = `.tp{font-size:11px}.tp h2{margin:0 0 2px;font-size:15px}.tp .sub{margin:0 0 6px;font-size:9px;opacity:.85}.tp h3{margin:6px 0 3px;font-size:11px;color:var(--goldl)}
.tp .cols{display:grid;grid-template-columns:1fr 1fr;gap:8px}.tp .col{background:var(--navy2);border:3px solid var(--goldd);padding:5px;min-width:0}.tp .col.ok{border-color:#3fbf6a}
.tp .items{display:flex;flex-wrap:wrap;gap:4px}.tp .ti{display:flex;align-items:center;gap:4px;font:inherit;font-size:9px;background:var(--navy3);color:var(--cream);border:2px solid var(--goldd);padding:3px 5px;cursor:pointer;max-width:100%}
.tp .ti i{width:10px;height:10px;border:1px solid #0008;flex:none}.tp .ti span{white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.tp .ti small{opacity:.6;font-size:7px}.tp .ti.on{background:var(--gold);color:var(--ink);border-color:var(--goldl)}
.tp .ti[disabled]{opacity:.45;cursor:default}.tp .ti.show{cursor:default}.tp .ti i{box-shadow:0 0 0 1px #fff6}.tp .row{display:flex;gap:6px;flex-wrap:wrap;align-items:center;margin:5px 0}.tp .btn{font-size:10px;padding:5px 8px}.tp .btn.ghost{background:var(--navy3);color:var(--cream)}
.tp .btn.warn{background:#7a2030;color:#fff}.tp .list{display:flex;flex-direction:column;gap:4px}.tp .li{display:flex;justify-content:space-between;align-items:center;gap:6px;background:var(--navy2);border:2px solid var(--navy3);padding:4px 6px}
.tp .li b{font-size:10px}.tp .tag{font-size:8px;padding:1px 4px;border:1px solid var(--goldd);margin-left:4px}.tp .tag.near{background:#2f8a52;color:#fff;border-color:#2f8a52}.tp .tag.done{background:#2f8a52;color:#fff}.tp .tag.bad{background:#7a2030;color:#fff}
.tp .lock{background:#5a3a10;border:2px solid var(--gold);padding:4px 6px;margin:4px 0}.tp .note{font-size:8px;opacity:.75;margin-top:4px}.tp .msg{background:#7a2030;color:#fff;padding:4px 6px;margin:4px 0}.tp .good{background:#2f8a52;color:#fff;padding:4px 6px;margin:4px 0}
.tp .who{display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;font-size:10px}.tp .split{display:grid;grid-template-columns:1.1fr .9fr;gap:8px}
@media (max-height:420px){.tp h2{font-size:13px}.tp .sub{font-size:8px;margin-bottom:4px}.tp .ti{padding:2px 4px}}`;

export function createTrading({ kp = () => null, getState, persist = () => {}, toast = () => {}, nearby = () => [], api = tradeApi(''), onChange = () => {}, demo = false } = {}) {
  const S = { me: null, board: [], deals: [], err: null, info: null, busy: false, signing: null, loaded: false, view: { mode: 'home' }, bookFor: null, book: null, lastJson: '' };
  const k = () => kp(), session = () => k()?.session || null, signedIn = () => !demo && !!(k()?.signedIn ?? k()?.session);
  function applyDone() { const s = getState(); if (!s || !S.me) return; let n = 0;
    for (const d of S.deals) if (d.status === 'done') { const r = TR.applyDeal(s, d, S.me.tid); if (r.ok) { n++; toast(`Trade complete: you got ${r.got.map(TR.itemName).join(', ')}`, 'good'); } }
    TR.ensureTrades(s).watch = S.deals.some((d) => d.status === 'open'); if (n) persist(); return n; }
  async function refresh({ quiet = true } = {}) { if (!signedIn()) { S.loaded = true; return S; } const s = getState();
    try { const j = await api({ act: 'list', name: s?.player?.name, shelf: TR.shelfOf(s) }, session()); S.me = j.me; S.board = j.board; S.deals = j.deals; S.limits = j.limits; S.err = null; S.loaded = true; S.at = Date.now(); applyDone();
      const js = JSON.stringify([j.board, j.deals]); if (js !== S.lastJson) { S.lastJson = js; onChange(); } }
    catch (e) { if (e.status !== 429) { S.err = e.message; if (!quiet) toast(e.message, 'bad'); onChange(); } } return S; }
  async function act(body, { okMsg } = {}) { if (S.busy) return null; S.busy = true; onChange();
    try { const j = await api(body, session()); S.err = null; if (okMsg) S.info = okMsg; if (j.deal) upsert(j.deal); await refresh(); return j; }
    catch (e) { S.err = e.message; if (e.data?.deal) upsert(e.data.deal); return null; } finally { S.busy = false; onChange(); } }
  const upsert = (d) => { const i = S.deals.findIndex((x) => x.id === d.id); if (i >= 0) S.deals[i] = d; else S.deals.unshift(d); };
  async function signIn() { const w = k(); if (!w) return toast('Sign in with Phantom first (wallet button, top bar).', 'bad'); try { if (!w.address) await w.connect?.(); await w.signIn(); await refresh({ quiet: false }); } catch (e) { toast('Sign-in cancelled: ' + (e.message || e), 'bad'); } }
  // Confirm = sign a plain-text message (sign-message only). One signature request at a time; a second tap while Phantom is
  // open does nothing. Sign-in (if the session lapsed) uses kibble-pay's shared in-flight sign-in, so it never stacks prompts.
  async function confirm(d) { const key = d.id + ':' + d.ver; if (S.signing) return; const s = getState(), c = TR.checkMine(s, d, d.side); if (!c.ok) { S.err = c.why; onChange(); return; }
    if (d.lockedMs > 0) { S.err = 'The offer just changed. Look it over first.'; onChange(); return; }
    S.signing = key; S.err = null; onChange();
    try { const w = k(); if (!w?.signedIn) { if (!w.address) await w.connect?.(); await w.signIn(); }
      const sig = await w.wallet.signMessage(new TextEncoder().encode(TR.confirmText(d, d.side)));
      S.signing = null; return await act({ act: 'confirm', id: d.id, ver: d.ver, sig }); }
    catch (e) { S.err = /reject|cancel|denied/i.test(e?.message || '') ? 'Signature cancelled. Nothing was traded.' : (e?.message || 'Could not sign'); return null; }
    finally { S.signing = null; onChange(); } }
  return { S, refresh, act, confirm, signIn, signedIn, nearby, getState, applyDone };
}

// --- rendering ---------------------------------------------------------------------------------------------------------
export function renderTrade(body, T, { open = () => {}, close = () => {} } = {}) {
  const S = T.S, s = T.getState(), v = S.view, near = new Set(T.nearby());
  const dealOf = (id) => S.deals.find((d) => d.id === id);
  const head = `<h2>Trading Post</h2><p class="sub">Items for items. No Bones, Pawmarks or $KIBBLE ever change hands. You confirm by signing a message in your wallet. It is never a transaction.</p>`;
  const msgs = `${S.err ? `<div class="msg">${esc(S.err)}</div>` : ''}${S.info ? `<div class="good">${esc(S.info)}</div>` : ''}`; S.info = null;
  let html = '';
  if (!T.signedIn()) html = `${head}<div class="lock">Sign in with Phantom to trade. Signing in proves which wallet is yours. It costs nothing and moves nothing.</div><div class="row"><button class="btn" data-a="signin">Sign in to trade</button></div>`;
  else if (!S.loaded) html = `${head}<p>Opening the Trading Post…</p>`;
  else if (v.mode === 'compose') html = composeHtml();
  else if (v.mode === 'deal' && dealOf(v.id)) html = dealHtml(dealOf(v.id));
  else html = homeHtml();
  body.innerHTML = `<div class="tp" data-trade-view="${esc(v.mode)}">${html}</div>`;
  wire();

  function homeHtml() { const shelf = TR.shelfOf(s), locked = TR.lockedOf(s), mine = Object.keys(shelf), open_ = S.deals.filter((d) => d.status === 'open'), past = S.deals.filter((d) => d.status !== 'open').slice(0, 4);
    const newWait = S.me?.newWaitMs > 0 ? `<div class="note">New traders can send their first offer in about ${Math.ceil(S.me.newWaitMs / 60e3)} min (stops alt-account farming).</div>` : '';
    const dealRow = (d) => { const mineG = d.give[d.side], theirG = d.give[d.side === 'a' ? 'b' : 'a'], other = d.side === 'a' ? d.bName : d.aName;
      const tag = d.status === 'open' ? (d.confirmed[d.side] ? '<span class="tag">you confirmed</span>' : d.confirmed[d.side === 'a' ? 'b' : 'a'] ? '<span class="tag near">they confirmed</span>' : '<span class="tag">open</span>') : `<span class="tag ${d.status === 'done' ? 'done' : 'bad'}">${esc(d.status)}</span>`;
      return `<div class="li"><span><b>${esc(other)}</b>${tag}<br><small>You give ${esc(mineG.map(TR.itemName).join(', '))} · you get ${esc(theirG.map(TR.itemName).join(', '))}</small></span><button class="btn ghost" data-deal="${esc(d.id)}">Open</button></div>`; };
    const boardRow = (p) => `<div class="li"><span><b>${esc(p.name)}</b> <small>${esc(p.short)}</small>${near.has(p.short) ? '<span class="tag near">nearby</span>' : '<span class="tag">online</span>'}<br><small>${Object.keys(p.shelf || {}).length} tradeable item(s)</small></span><span><button class="btn" data-offer="${esc(p.tid)}" ${Object.keys(p.shelf || {}).length && mine.length ? '' : 'disabled'}>Offer</button> <button class="btn ghost" data-report-tid="${esc(p.tid)}">Report</button> <button class="btn ghost" data-block="${esc(p.tid)}">Block</button></span></div>`;
    const board = [...S.board].sort((a, b) => (near.has(b.short) ? 1 : 0) - (near.has(a.short) ? 1 : 0));
    return `${head}${msgs}<div class="split"><div><h3>Your trades</h3><div class="list">${open_.map(dealRow).join('') || '<small>No open trades. Pick a player to make an offer.</small>'}${past.map(dealRow).join('')}</div>
      <h3>Players trading now</h3><div class="list">${board.map(boardRow).join('') || '<small>Nobody else has the Trading Post open right now. Players in your room show as nearby when they open it.</small>'}</div></div>
      <div><h3>Your tradeable items (${mine.length})</h3><div class="items">${mine.map((id) => chip(id, 'show')).join('') || '<small>Nothing yet. Items you buy with Bones at Fetch Fashion and the Bones furniture shops can be traded.</small>'}</div>
      ${locked.length ? `<h3>Not tradeable</h3><div class="items">${locked.slice(0, 8).map((x) => `<button class="ti" disabled title="${esc(x.why)}"><i style="background:#555"></i><span>${esc(x.name)}</span><small>${esc(x.why)}</small></button>`).join('')}${locked.length > 8 ? `<small>+${locked.length - 8} more</small>` : ''}</div>` : ''}
      <div class="note">Tradeable: wardrobe and furniture bought with Bones (and items you got in a trade). Not tradeable: anything bought with $KIBBLE, President Inu drops, streak pins, prizes and quest rewards. Furniture in your home must be put in storage first. Furniture you got in a trade can't be sold for Bones.</div>${newWait}</div></div>`; }

  function composeHtml() { const p = S.board.find((x) => x.tid === v.to) || null, d = v.edit ? dealOf(v.edit) : null, side = d ? d.side : 'a';
    const myShelf = TR.shelfOf(s), theirShelf = p?.shelf || {}, otherName = d ? (side === 'a' ? d.bName : d.aName) : p?.name || 'player';
    const theirIds = [...new Set([...Object.keys(theirShelf), ...(d ? d.give[side === 'a' ? 'b' : 'a'] : [])])], myIds = [...new Set([...Object.keys(myShelf), ...(d ? d.give[side] : [])])];
    const pick = (ids, sel, which, other) => ids.map((id) => chip(id, `data-pick="${which}" data-id="${esc(id)}"${!sel.includes(id) && sel.length >= TR.TRADE.maxSide ? ' disabled' : ''}${which === 'get' && TR.tradeInfo(id)?.unique && TR.rawCount(s, id) > 0 && !sel.includes(id) ? ' disabled title="You already own this"' : ''}`, sel.includes(id))).join('') || `<small>${other}</small>`;
    const ok = v.give.length && v.get.length;
    return `<h2>${d ? 'Change the offer' : 'New offer'} · ${esc(otherName)}</h2><p class="sub">Pick 1 to ${TR.TRADE.maxSide} items each side. ${d ? 'Changing it clears both confirmations and both of you sign again.' : 'They see it straight away and can accept, change or cancel it.'}</p>${msgs}
      <div class="cols"><div class="col"><div class="who"><b>You give</b><small>${v.give.length}/${TR.TRADE.maxSide}</small></div><div class="items">${pick(myIds, v.give, 'give', 'You have nothing tradeable in storage.')}</div></div>
      <div class="col"><div class="who"><b>You get</b><small>${v.get.length}/${TR.TRADE.maxSide}</small></div><div class="items">${pick(theirIds, v.get, 'get', `${esc(otherName)} has nothing tradeable right now.`)}</div></div></div>
      <div class="row"><button class="btn" data-a="send" ${ok && !S.busy ? '' : 'disabled'}>${d ? 'Send the change' : 'Send offer'}</button><button class="btn ghost" data-a="back">Back</button></div>`; }

  function dealHtml(d) { const me = d.side, them = me === 'a' ? 'b' : 'a', other = me === 'a' ? d.bName : d.aName, otherShort = me === 'a' ? d.bShort : d.aShort, open_ = d.status === 'open';
    const col = (side, title) => `<div class="col${d.confirmed[side] ? ' ok' : ''}"><div class="who"><b>${title}</b><small>${d.confirmed[side] ? '✔ confirmed v' + d.ver : open_ ? 'not confirmed' : ''}</small></div><div class="items">${d.give[side].map((id) => chip(id, 'show')).join('')}</div></div>`;
    const lock = open_ && d.lockedMs > 0 ? `<div class="lock" data-lock>${d.ver === 1 ? `New offer from ${esc(d.lastBy === me ? 'you' : other)}.` : `Offer changed by ${esc(d.lastBy === me ? 'you' : other)}. Both confirmations were cleared.`} Look it over: confirming unlocks in ${Math.ceil(d.lockedMs / 1000)}s.</div>` : '';
    const stat = d.status === 'done' ? `<div class="good">Trade complete. The items were swapped for both of you at once.</div>` : !open_ ? `<div class="msg">Trade ${esc(d.status)}${d.why ? ': ' + esc(d.why) : ''}. Nothing was swapped.</div>` : '';
    const signing = S.signing === d.id + ':' + d.ver;
    const btns = open_ ? `<button class="btn" data-a="confirm" ${d.confirmed[me] || d.lockedMs > 0 || S.signing || S.busy ? 'disabled' : ''}>${signing ? 'Check your wallet…' : d.confirmed[me] ? 'Waiting for ' + esc(other) : 'Confirm & sign'}</button><button class="btn ghost" data-a="edit">Change offer</button><button class="btn warn" data-a="cancel">Cancel trade</button>` : `<button class="btn ghost" data-a="home">All trades</button>`;
    const book = S.bookFor === d.id && S.book ? `<div class="note">Paw Audit Bureau item book: ${S.book.entries.map((e) => `#${e.seq} ${esc(e.action.replace('item.', ''))}`).join(' → ')} · chain ${S.book.chain.ok ? 'verified' : 'BROKEN'} · every entry moves 0</div>` : '';
    return `<h2>Trade with ${esc(other)} <small style="font-size:9px;opacity:.7">${esc(otherShort)} · v${d.ver}</small></h2>${msgs}${lock}${stat}
      <div class="cols">${col(me, 'You give')}${col(them, `${esc(other)} gives`)}</div>
      <div class="row">${btns}<button class="btn ghost" data-a="report">Report</button><button class="btn ghost" data-a="block">Block</button>${open_ ? '<button class="btn ghost" data-a="home">Back</button>' : ''}<button class="btn ghost" data-a="book">Bureau log</button></div>
      <div class="note">Confirming opens your wallet to sign a message listing exactly these items, this version and a one-time code. It is not a transaction and cannot move funds. The swap happens only when both of you have signed the same version.</div>${book}`; }

  function wire() {
    const go = (nv) => { S.view = nv; S.err = null; open(); };
    body.querySelector('.tp').onclick = async (e) => { const t = e.target.closest('button'); if (!t || t.disabled) return;
      if (t.dataset.deal) return go({ mode: 'deal', id: t.dataset.deal });
      if (t.dataset.offer) return go({ mode: 'compose', to: t.dataset.offer, give: [], get: [] });
      if (t.dataset.block) { if (confirmBox('Block this player? They disappear from your Trading Post and open trades with them are cancelled.')) await T.act({ act: 'block', tid: t.dataset.block }, { okMsg: 'Blocked.' }); return; }
      if (t.dataset.reportTid) { const r = reasonBox(); if (r) await T.act({ act: 'report', tid: t.dataset.reportTid, reason: r }, { okMsg: 'Reported to the Paw Audit Bureau and blocked. Thank you.' }); return; }
      if (t.dataset.pick) { const list = v[t.dataset.pick], id = t.dataset.id, i = list.indexOf(id); if (i >= 0) list.splice(i, 1); else if (list.length < TR.TRADE.maxSide) list.push(id); return open(); }
      const a = t.dataset.a, d = v.id && dealOf(v.id);
      if (a === 'signin') return T.signIn().then(open);
      if (a === 'back' || a === 'home') return go({ mode: v.edit ? 'deal' : 'home', id: v.edit || undefined });
      if (a === 'send') { const give = v.edit ? (dealOf(v.edit).side === 'a' ? { a: v.give, b: v.get } : { a: v.get, b: v.give }) : { a: v.give, b: v.get };
        const j = v.edit ? await T.act({ act: 'edit', id: v.edit, ver: dealOf(v.edit).ver, give }, { okMsg: 'Change sent. Both of you confirm again.' }) : await T.act({ act: 'offer', to: v.to, give }, { okMsg: 'Offer sent.' });
        if (j?.deal) go({ mode: 'deal', id: j.deal.id }); else open(); return; }
      if (!d) return;
      if (a === 'confirm') { await T.confirm(d); return open(); }
      if (a === 'edit') { const p = S.board.find((x) => x.tid === (d.side === 'a' ? d.bt : d.at)); return go({ mode: 'compose', edit: d.id, to: p?.tid, give: [...d.give[d.side]], get: [...d.give[d.side === 'a' ? 'b' : 'a']] }); }
      if (a === 'cancel') { await T.act({ act: 'cancel', id: d.id }, { okMsg: 'Trade cancelled. Nothing was swapped.' }); return open(); }
      if (a === 'report') { const r = reasonBox(); if (r) await T.act({ act: 'report', id: d.id, reason: r }, { okMsg: 'Reported to the Paw Audit Bureau, trade cancelled and player blocked.' }); return open(); }
      if (a === 'block') { if (confirmBox('Block this player? Open trades with them are cancelled.')) await T.act({ act: 'block', tid: d.side === 'a' ? d.bt : d.at }, { okMsg: 'Blocked.' }); return open(); }
      if (a === 'book') { const j = await T.act({ act: 'book', id: d.id }); if (j) { S.bookFor = d.id; S.book = j; } return open(); } };
  }
  void close;
}
// tiny wrappers so the proof can answer them (window.confirm/prompt are fine on phones and keep this dependency-free)
const confirmBox = (q) => (globalThis.__tradeConfirm ? globalThis.__tradeConfirm(q) : globalThis.confirm?.(q) ?? true);
const reasonBox = () => { const opts = ['scam', 'harassment', 'spam', 'alt-account', 'other']; const r = globalThis.__tradeReason ? globalThis.__tradeReason() : globalThis.prompt?.(`Why are you reporting? (${opts.join(', ')})`, 'scam'); return r == null ? null : opts.includes(String(r).trim()) ? String(r).trim() : 'other'; };
