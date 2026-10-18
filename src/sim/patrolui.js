// Phase 3 UI: the Barkley Precinct kiosk + Greenpaw Rangers station panels (opened from their world spots through the
// Bureau panel hook) and the small notice card for citations, detentions (with their ways out) and ranger shifts.
// The notice is not a HUD button and never modal: bottom-centre on big screens, top-right under the HUD on phones
// (clear of the joystick, the A button and your pup in the middle), under any open panel, and the game keeps running (move, chat, doors, other games) while it shows.
import { pawWallet, syncNow, syncSoon } from './simstate.js';
import { createPatrol, SHIFT } from './patrol.js';
import { POLICE, OFFENSES } from './police.js';
import { OFFICERS, FORCE_COLORS as F } from './force.js';
import { drawOfficer, drawStar, drawLeaf, forceProps } from './patrolart.js';
import { CURRENCY, pm } from './currency.js';
import { FLOWS } from './economy.js';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const secs = (ms) => `0:${String(Math.max(0, Math.ceil(ms / 1000))).padStart(2, '0')}`;
const NCSS = `#pab-notice{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(30px + env(safe-area-inset-bottom));z-index:9;width:min(360px,52vw);background:#141a2ef0;border:3px solid #e7b83a;color:#f4f1ea;
font:11px/1.35 Silkscreen,monospace;padding:6px 8px;box-shadow:0 3px 0 #0008;pointer-events:auto;text-align:left}#pab-notice[hidden]{display:none}#pab-notice.rg{border-color:#86a95a}#pab-notice b{color:#e7b83a}#pab-notice.rg b{color:#c9e3a0}
#pab-notice .row2{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}#pab-notice button{font:10px Silkscreen,monospace;padding:4px 6px;background:#22356b;color:#fff;border:2px solid #e7b83a;cursor:pointer}#pab-notice button.g{background:#3e5526;border-color:#86a95a}
#pab-notice button.x{position:absolute;right:3px;top:2px;border:0;background:none;padding:2px 4px}#pab-notice button:disabled{opacity:.45}
@media (max-height:500px){#pab-notice{left:auto;transform:none;right:calc(8px + env(safe-area-inset-right));top:calc(60px + env(safe-area-inset-top));bottom:auto;width:min(300px,42vw);font-size:10px;line-height:1.25;padding:5px 6px}#pab-notice .row2{margin-top:4px}#pab-notice button{padding:3px 5px}}`;
let PATROL = null, el = null, hideT = 0;
export function patrol() { return (PATROL ||= createPatrol({ wallet: pawWallet(), onChange: () => draw(), sync: () => syncSoon() })); }
function card() { if (el?.isConnected) return el; if (!document.getElementById('pab-notice-style')) { const s = document.createElement('style'); s.id = 'pab-notice-style'; s.textContent = NCSS; document.head.appendChild(s); }
  el = document.createElement('div'); el.id = 'pab-notice'; el.hidden = true; el.setAttribute('role', 'status'); document.body.appendChild(el);
  el.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; const P = patrol(), k = b.dataset.k;
    try { if (k === 'bail') P.payBail(); else if (k === 'wait') P.walkItOff(); else if (k === 'out') P.optOut(); else if (k === 'end') P.endShift(); else if (k === 'x') P.dismiss(); } catch (e) { el.querySelector('.err')?.replaceChildren(String(e.message)); } draw(); });
  return el; }
let lastHtml = '';
function draw() { const n = PATROL?.notice, sh = PATROL?.shift; if (!n && !sh) { if (el) el.hidden = true; lastHtml = ''; return; } const c = card(); let html = '';
  if (n?.kind === 'detained') { const canBail = (n.balance ?? 0) >= POLICE.bail;
    html = `<b>Detained (sim) · ${secs(n.leftMs)}</b><div>${esc(String(n.by || '').replace(/^(Officer|Sgt\.|Ranger|Chief Ranger) /, ''))} held you for ${esc(n.offense || 'a repeat offence')}. Move, chat or leave any time: walking away ends it.</div>
      <div class="row2"><button data-k="bail" ${canBail ? '' : 'disabled'} title="Pay bail">Bail ${pm(POLICE.bail)}</button><button data-k="wait" title="Wait it out for free">${n.waiting ? `Waiting… ${secs(n.leftMs)}` : 'Walk it off (free)'}</button><button data-k="out" title="Leave the side economy">Opt out</button></div><div class="small err"></div>`; c.className = ''; }
  else if (sh) { const got = (sh.litter || []).filter((l) => l.got).length, left = SHIFT.maxMs - (Date.now() - sh.start);
    html = `<b>Ranger shift · ${got}/${SHIFT.litter} litter · ${Math.floor(left / 60e3)}:${String(Math.max(0, Math.floor((left % 60e3) / 1000))).padStart(2, '0')} left</b><div>Walk to each "!" in the park to pick it up. Pays ${pm(sh.quote)} when done.</div><div class="row2"><button class="g" data-k="end">End shift</button></div>`; c.className = 'rg'; }
  else { html = `<button class="x" data-k="x" aria-label="Close">✕</button><b>${n.kind === 'cited' ? (n.fine ? 'Citation (sim)' : 'Warning (sim)') : n.kind === 'paid' ? 'Ranger shift' : 'Sim'}</b><div>${esc(n.text)}</div>`; c.className = n.kind === 'paid' || /ranger/i.test(n.text || '') ? 'rg' : '';
    clearTimeout(hideT); hideT = setTimeout(() => { if (PATROL?.notice && PATROL.notice.kind !== 'detained') PATROL.dismiss(); }, 7000); }
  if (html !== lastHtml) { c.innerHTML = html; lastHtml = html; } c.hidden = false; place(c); }
// sit above anything else at the bottom centre (the guide chip, the interact prompt, toasts) instead of covering it
function place(c) { if (matchMedia('(max-height:500px)').matches) { if (c.style.bottom) c.style.bottom = ''; return; } let bottom = 0; const me = c.getBoundingClientRect();
  for (const s of ['#guidechip', '#prompt', '#toast', '#photobar']) { const o = document.querySelector(s); if (!o || o.hidden || getComputedStyle(o).display === 'none' || getComputedStyle(o).visibility === 'hidden') continue; const r = o.getBoundingClientRect();
    if (!r.width || r.top < innerHeight / 2 || r.right <= me.left || r.left >= me.right) continue; bottom = Math.max(bottom, innerHeight - r.top + 6); }
  const v = bottom ? `${Math.round(bottom)}px` : ''; if (c.style.bottom !== v) c.style.bottom = v; }
// the per-frame hook (main.js). view = a fresh { x, y, driving, busy (a panel is open: no offences) } copy; tileAt(tx, ty) -> tile id (-1 = solid); T = world tile ids.
let acc = 0;
export function simTick(dt, t, view, tileAt, T) { try { const P = patrol(); P.tick(dt, t, view, tileAt, T); acc += dt; if (acc > 0.25) { acc = 0; if (P.notice || P.shift) draw(); } } catch {} }
export const patrolProps = (t, deps, player) => forceProps(t, deps, player, PATROL?.litter() || []);

function badge(force, px = 40) { const cv = document.createElement('canvas'); cv.width = cv.height = px; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  x.fillStyle = force === 'police' ? F.navyDark : F.oliveDark; x.fillRect(0, 0, px, px); (force === 'police' ? drawStar : drawLeaf)(x, px / 2, px / 2, px / 8); return cv; }
function portrait(o, deps) { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 144; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  try { drawOfficer(x, o, { x: 64, y: 122, face: 'down', moving: false, phase: 0 }, deps, { scale: 2 }); } catch {} return cv; }
export function renderForce(body, deps, which) {
  const cop = which === 'precinct', force = cop ? 'police' : 'rangers', crew = OFFICERS.filter((o) => o.force === force);
  const title = cop ? 'Barkley Precinct' : 'Greenpaw Rangers', sub = cop ? 'Sim police · patrols the roads around Kibble Plaza and the avenue · cites jaywalking' : 'Sim park rangers · look after the park and farm lanes · cite flowerbed trampling · ranger shifts';
  body.innerHTML = `<div class="pab" style="--v:${cop ? F.navyLight : F.olive};--s:${cop ? F.gold : '#c9e3a0'}"><div class="pab-head"><span id="pab-badge"></span><div style="flex:1"><h2>${title}</h2><div class="pab-sub">${sub}</div></div><span class="pab-chip" id="pab-mine"></span></div>
    <div class="pab-tabs">${[['you', cop ? 'Your record' : 'Ranger shift'], ['crew', cop ? 'Officers' : 'Rangers'], ['rules', 'Rules']].map(([k, l], i) => `<button class="btn ghost ${i ? '' : 'on'}" data-f="${k}">${esc(l)}</button>`).join('')}</div><div id="pab-body"></div></div>`;
  body.querySelector('#pab-badge').appendChild(badge(force)); const pane = body.querySelector('#pab-body'), w = pawWallet(); let cur = 'you';
  const mine = () => { const s = w.state(), m = body.querySelector('#pab-mine'); if (m) m.innerHTML = `${esc(CURRENCY.name)}: ${s.joined ? `<b>${pm(s.balance)}</b>` : 'not joined'}`; };
  const show = (k) => { cur = k; body.querySelectorAll('[data-f]').forEach((b) => b.classList.toggle('on', b.dataset.f === k)); (k === 'crew' ? crewTab : k === 'rules' ? rules : you)(); mine(); };
  body.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => show(b.dataset.f)); syncSoon(() => { mine(); if (cur === 'you') you(); });
  const notJoined = `<div class="pab-wal"><span>You are not in the side economy, so officers and rangers leave you alone.</span><button class="btn green pab-btn" data-join>Join the side economy</button></div><div class="small">Joining is optional and you can leave any time. Only joined players are ever cited or detained.</div>`;
  function you() { const s = w.state(), P = patrol(); if (!s.joined) { pane.innerHTML = notJoined; hook(); return; }
    if (cop) { const owed = Object.entries(s.owed || {}); const recs = w.entries().filter((e) => e.action.startsWith('police.') || e.action === 'pm.fine' || e.action === 'pm.bail');
      pane.innerHTML = `<div class="pab-wal"><span>Today: <b>${s.citesToday}</b>/${POLICE.citesPerDay} citations</span><span>${s.held ? `<b class="pab-bad">Detained · ${secs(s.held.leftMs)}</b>` : '<span class="pab-ok">Not detained</span>'}</span></div>
        ${s.held ? `<div class="row" style="justify-content:flex-start;gap:6px;flex-wrap:wrap"><button class="btn pab-btn" data-bail ${s.balance >= POLICE.bail ? '' : 'disabled'}>Pay bail ${pm(POLICE.bail)}</button><button class="btn ghost pab-btn" data-out>Opt out</button><span class="small">or just walk away / wait it out (free)</span></div>` : ''}
        ${owed.length ? owed.map(([seq, a]) => `<div class="pab-row">Unpaid citation #${seq}: ${pm(a)} <button class="btn ghost tiny" data-pay="${seq}">Pay</button></div>`).join('') : ''}
        <div class="small" style="margin:6px 0 2px">Evidence on your record (hash-chained, anchored on the sim server; nobody can edit it)</div>
        <div class="pab-list"><table><tr><th>#</th><th>what</th><th>by</th><th>${esc(CURRENCY.short)}</th><th>hash</th></tr>${recs.length ? recs.map((e) => `<tr><td>${e.seq}</td><td>${esc(e.action.replace('police.', ''))}${e.data?.offense ? ' · ' + esc(e.data.offense) + ` @${e.data.tx},${e.data.ty}` : ''}${e.data?.reason ? ' · ' + esc(e.data.reason) : ''}</td><td>${esc(String(e.actor).replace(/^sim:|^player:p\w+/, (m) => m.startsWith('player') ? 'you' : ''))}</td><td>${e.value.amount || ''}</td><td><code>${e.hash.slice(0, 8)}</code></td></tr>`).join('') : `<tr><td colspan="5">${s.anchoredSeq ? 'Older entries are anchored on the server; this device shows the ones since the last sync.' : 'Clean record.'}</td></tr>`}</table></div>`; }
    else { const q = w.quote('wage'), sh = P.shift;
      pane.innerHTML = `<div class="pab-wal"><span>Ranger shift: pick up ${SHIFT.litter} bits of litter in the park (at least ${SHIFT.minMs / 1000} s, at most ${SHIFT.maxMs / 60e3} min).</span></div>
        <div class="pab-row">${sh ? `On shift: ${(sh.litter || []).filter((l) => l.got).length}/${SHIFT.litter} collected. <button class="btn ghost tiny" data-end>End shift</button>` : q.ok ? `Pays <b>${pm(q.amount)}</b> · <button class="btn green pab-btn" data-start>Start a ranger shift</button>` : `<span class="small">${q.reason === 'cooldown' ? `Next shift in ${Math.max(1, Math.ceil(q.waitMs / 60e3))} min` : 'Daily wage cap reached: back tomorrow'}</span>`}</div>
        <div class="small">Wages shrink each shift (${FLOWS.wage.base}, ${Math.floor(FLOWS.wage.base * FLOWS.wage.decay)}, ${Math.floor(FLOWS.wage.base * FLOWS.wage.decay ** 2)}…), ${FLOWS.wage.cooldownMs / 60e3} min apart, max ${pm(FLOWS.wage.dailyCap)} a day across all sim jobs (desk + ranger). One wallet per network can't be multiplied: at most 4 wallets earn from one network a day.</div>`; }
    hook(); }
  function hook() { const q = (s) => pane.querySelector(s), P = patrol(), re = () => { mine(); you(); syncNow(() => { mine(); if (cur === 'you') you(); }); };
    q('[data-join]') && (q('[data-join]').onclick = () => { w.join(); re(); }); q('[data-bail]') && (q('[data-bail]').onclick = () => { try { P.payBail(); } catch {} re(); });
    q('[data-out]') && (q('[data-out]').onclick = () => { P.optOut(); re(); }); q('[data-start]') && (q('[data-start]').onclick = () => { let err = ''; try { P.startShift(); } catch (e) { err = e.message; } you(); if (err) pane.insertAdjacentHTML('beforeend', `<div class="small pab-bad">${esc(err)}</div>`); });
    q('[data-end]') && (q('[data-end]').onclick = () => { P.endShift(); you(); }); pane.querySelectorAll('[data-pay]').forEach((b) => b.onclick = () => { try { w.payFine(b.dataset.pay); } catch {} re(); }); }
  function crewTab() { pane.innerHTML = `<div class="pab-grid">${crew.map((o, i) => `<div class="pab-card"><span data-por="${i}"></span><b>${esc(o.name)}</b><div>${esc(o.title)}</div><div style="font-size:10px;color:#d8d2bc">"${esc(o.line)}"</div></div>`).join('')}</div>
      <div class="small">${cop ? 'They walk the pavements by the roads and the avenue.' : 'They walk the park path and the lawn by the station.'} Sim pups, not real players. They can't be bribed by players and never read what you wear or own.</div>`;
    pane.querySelectorAll('[data-por]').forEach((p) => p.appendChild(portrait(crew[+p.dataset.por], deps))); }
  function rules() { const o = OFFENSES[cop ? 'jaywalk' : 'flowers'];
    pane.innerHTML = `<div class="pab-list">${[
      `Only players who joined the side economy are policed. Everyone else is ignored.`,
      `Offence: ${o.label}. ${cop ? `Standing on a road tile off the zebra stripes for ${POLICE.dwellMs.jaywalk / 1000} s` : `Standing on flowers for ${POLICE.dwellMs.flowers / 1000} s`} while a ${cop ? 'police officer' : 'ranger'} is within ${POLICE.seeTiles} tiles.`,
      `First citation of the day is a warning. After that: ${pm(POLICE.fine)} fine, paid from your ${esc(CURRENCY.name)} (a warning if you can't cover it). At most ${POLICE.citesPerDay} a day, one a minute.`,
      `Detention: only on a ${POLICE.priorCites}rd citation within ${POLICE.repeatWindowMs / 60e3} min, ${POLICE.detainSec} s (never over ${POLICE.maxDetainSec} s), at most ${POLICE.detainsPerDay} a day.`,
      `Ways out, always: pay ${pm(POLICE.bail)} bail, walk it off (free wait), opt out of the sim, or just leave the scene. You can move, chat, enter doors and play other games the whole time.`,
      `Nothing here touches Bones, $KIBBLE, prizes, scores or other games. Nothing here is won by chance, and nothing can be staked. $KIBBLE cosmetics change nothing: officers only see where you stand.`,
      `Every citation, fine, detention, bail and release is a hash-chained entry anchored on the sim server.`].map((r) => `<div class="pab-row">${esc(r)}</div>`).join('')}</div>`; }
  show('you');
}
