// Phase 5 UI: the Pawsley Pup Clinic panel (opened from the clinic door through the Bureau panel hook) and the small
// clinic card for bumps (timer, how to clear it), medic shifts (the call, then the treatment steps) and results.
// The card is never modal: bottom-centre on big screens, top-right under the HUD on phones (below the police card if both
// show), and the game keeps running. Nothing here touches Bones, $KIBBLE, prizes, scores or other games.
import { pawWallet, syncNow, syncSoon } from './simstate.js';
import { createClinic, shiftCall } from './clinic.js';
import { MED, AILMENTS, STAFF, PATIENTS } from './medical.js';
import { drawStaff, drawEmblem, CLINIC_COLORS as K } from './clinicart.js';
import { CLINIC, TILE } from './place.js';
import { CURRENCY, pm } from './currency.js';
import { FLOWS } from './economy.js';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const secs = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const CSS = `#pab-med{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(30px + env(safe-area-inset-bottom));z-index:9;width:min(360px,52vw);background:#141a2ef0;border:3px solid ${K.mint};color:#f4f1ea;
font:11px/1.35 Silkscreen,monospace;padding:6px 8px;box-shadow:0 3px 0 #0008;pointer-events:auto;text-align:left}#pab-med[hidden]{display:none}#pab-med b{color:${K.mint}}#pab-med.hurt{border-color:${K.blush}}#pab-med.hurt b{color:${K.blush}}
#pab-med .row2{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}#pab-med button{font:10px Silkscreen,monospace;padding:4px 6px;background:#1d5866;color:#fff;border:2px solid ${K.mint};cursor:pointer}#pab-med button.x{position:absolute;right:3px;top:2px;border:0;background:none;padding:2px 4px}
#pab-med .bar{height:4px;background:#0006;margin-top:3px}#pab-med .bar i{display:block;height:4px;background:${K.mint}}#pab-med .step{background:#22356b;border-color:#e7b83a}
@media (max-height:500px){#pab-med{left:auto;transform:none;right:calc(8px + env(safe-area-inset-right));top:calc(60px + env(safe-area-inset-top));bottom:auto;width:min(300px,42vw);font-size:10px;line-height:1.25;padding:5px 6px}#pab-med .row2{margin-top:4px}#pab-med button{padding:3px 5px}}
.pab .cl-st{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.pab .cl-st .btn{font-size:10px}`;
let CLINICRT = null, el = null, hideT = 0, lastHtml = '';
export function clinic() { return (CLINICRT ||= createClinic({ wallet: pawWallet(), onChange: () => draw(), sync: () => syncSoon() })); }
function style() { if (!document.getElementById('pab-med-style')) { const s = document.createElement('style'); s.id = 'pab-med-style'; s.textContent = CSS; document.head.appendChild(s); } }
function card() { if (el?.isConnected) return el; style(); el = document.createElement('div'); el.id = 'pab-med'; el.hidden = true; el.setAttribute('role', 'status'); document.body.appendChild(el);
  el.addEventListener('click', (ev) => { const b = ev.target.closest('button'); if (!b) return; const C = clinic(), k = b.dataset.k;
    try { if (k === 'out') C.optOut(); else if (k === 'treat') C.treat(false); else if (k === 'end') C.endShift(); else if (k === 'x') C.dismiss(); else if (k === 'step') C.tap(+b.dataset.i); } catch (e) { el.querySelector('.err')?.replaceChildren(String(e.message)); } draw(); });
  return el; }
const nearClinic = () => { const p = globalThis.__inu?.state?.player; return !!p && Math.hypot(p.x / TILE - (CLINIC.tx + 0.5), p.y / TILE - (CLINIC.ty + 0.5)) < 5; };
function draw() { const C = CLINICRT, n = C?.notice, sh = C?.shift; if (!n && !(sh && sh.state !== 'done')) { if (el) el.hidden = true; lastHtml = ''; return; } const c = card(); let html = '';
  if (n?.kind === 'hurt') { const a = AILMENTS[n.ail], slow = n.slow < 1 ? ` Walking a little slower (x${n.slow}) until it's better.` : ' Just for looks.';
    html = `<b>${esc(n.label)} (cartoon) · ${secs(n.leftMs)}</b><div>${n.fresh ? esc(n.fresh) + ' ' : ''}${slow} Nothing else changes: keep playing.</div>
      <div class="small">Walk it off: ${Math.min(MED.walkOffTiles, Math.floor(n.walked || 0))}/${MED.walkOffTiles} tiles</div><div class="bar"><i style="width:${Math.min(100, ((n.walked || 0) / MED.walkOffTiles) * 100)}%"></i></div>
      <div class="row2">${nearClinic() ? '<button data-k="treat">Free treatment</button>' : ''}<button data-k="out" title="Switch cartoon bumps off">Bumps off</button><span class="small" style="margin:0">${nearClinic() ? '' : 'Free treatment any time at the Pawsley Pup Clinic.'}</span></div><div class="small err"></div>`; c.className = 'hurt'; }
  else if (sh && sh.state === 'task') { const a = AILMENTS[sh.c.ail];
    const nextOk = (() => { let nx = 0; for (const t of sh.taps) if (t === nx) nx++; return nx; })(), slips = sh.taps.length - nextOk;
    html = `<b>Treat ${esc(sh.c.name)}: ${esc(a.label.toLowerCase())}</b><div>Tap the steps in the right order (${nextOk}/${a.steps.length}${slips ? ` · ${slips} slip${slips > 1 ? 's' : ''}` : ''}${sh.retry ? ' · started over' : ''}).</div>
      <div class="row2">${sh.order.map((i) => `<button class="step" data-k="step" data-i="${i}" ${i < nextOk ? 'disabled' : ''}>${esc(a.steps[i])}</button>`).join('')}</div><div class="row2"><button data-k="end">End shift</button></div><div class="small err"></div>`; c.className = ''; }
  else if (sh && sh.state !== 'done') { const c2 = sh.c, left = Math.min(c2.end - Date.now(), sh.start + 4 * 60e3 - Date.now());
    html = `<b>Medic shift · ${secs(left)} left</b><div>${sh.wait > 0 ? `Next call in ${secs(sh.wait)}: ${esc(c2.name)} (${esc(AILMENTS[c2.ail].label.toLowerCase())}).` : `${esc(c2.name)} has a ${esc(AILMENTS[c2.ail].label.toLowerCase())}: walk to the + on the plaza${sh.dist != null ? ` (${sh.dist} m)` : ''}.`} Pays ${pm(sh.quote)} when treated.</div><div class="row2"><button data-k="end">End shift</button></div>`; c.className = ''; }
  else { html = `<button class="x" data-k="x" aria-label="Close">✕</button><b>${n.kind === 'paid' ? 'Medic shift' : 'Pawsley Pup Clinic'}</b><div>${esc(n.text)}</div>`; c.className = '';
    clearTimeout(hideT); hideT = setTimeout(() => { if (CLINICRT?.notice && CLINICRT.notice.kind !== 'hurt') { CLINICRT.dismiss(); } }, 7000); }
  if (html !== lastHtml) { c.innerHTML = html; lastHtml = html; } c.hidden = false; place(c); }
// never on top of the police card: phones stack below it (top-right), big screens sit above it (bottom-centre)
function place(c) { const p = document.getElementById('pab-notice'), on = p && !p.hidden && getComputedStyle(p).display !== 'none', r = on ? p.getBoundingClientRect() : null;
  if (matchMedia('(max-height:500px)').matches) { const v = r ? `${Math.round(r.bottom + 6)}px` : ''; if (c.style.top !== v) c.style.top = v; if (c.style.bottom) c.style.bottom = ''; return; }
  if (c.style.top) c.style.top = ''; let bottom = r ? innerHeight - r.top + 6 : 0; const me = c.getBoundingClientRect();
  for (const s of ['#guidechip', '#prompt', '#toast', '#photobar']) { const o = document.querySelector(s); if (!o || o.hidden || getComputedStyle(o).display === 'none' || getComputedStyle(o).visibility === 'hidden') continue; const q = o.getBoundingClientRect();
    if (!q.width || q.top < innerHeight / 2 || q.right <= me.left || q.left >= me.right) continue; bottom = Math.max(bottom, innerHeight - q.top + 6); }
  const v = bottom ? `${Math.round(bottom)}px` : ''; if (c.style.bottom !== v) c.style.bottom = v; }
// the per-frame hook (bureau.js simTick): same frozen view copy the patrol tick gets
let acc = 0; export function clinicTick(dt, t, view, tileAt, T) { try { const C = clinic(); C.tick(dt, t, view, tileAt, T); acc += dt; if (acc > 0.25) { acc = 0; if (C.notice || C.shift) draw(); } } catch {} }
export const walkFactor = () => { try { return CLINICRT ? CLINICRT.walkFactor() : 1; } catch { return 1; } };
// what the world art should show on this device: the call I'm answering, and my own bump icon
export function clinicView() { const C = CLINICRT; if (!C) return {}; const n = C.notice; return { mineSlot: C.mineSlot(), mineDone: C.mineDone(), hurt: n?.kind === 'hurt' ? { ail: n.ail } : null }; }

function portrait(s, deps) { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 144; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  try { drawStaff(x, s, { x: 64, y: 122, face: 'down', moving: false, phase: 0 }, deps, { scale: 2 }); } catch {} return cv; }
function badge(px = 40) { const cv = document.createElement('canvas'); cv.width = cv.height = px; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = K.tealDark; x.fillRect(0, 0, px, px); drawEmblem(x, px / 2, px / 2, px / 14); return cv; }
const RECORD = ['med.optin', 'med.optout', 'med.injury', 'med.heal', 'med.care', 'pm.copay', 'med.treat'];
const what = (e) => ({ 'med.optin': 'bumps on', 'med.optout': 'bumps off', 'med.injury': `bump · ${AILMENTS[e.data?.ail]?.label || ''} @${e.data?.tx},${e.data?.ty}`, 'med.heal': `better · ${e.data?.how}`, 'med.care': 'treated (free)', 'pm.copay': 'chipped in', 'med.treat': `you treated ${PATIENTS.find((p) => p.id === e.target)?.name || 'a pup'}` })[e.action] || e.action;
export function renderClinic(body, deps) {
  body.innerHTML = `<div class="pab" style="--v:${K.mintDark};--s:${K.mint}"><div class="pab-head"><span id="pab-badge"></span><div style="flex:1"><h2>Pawsley Pup Clinic</h2><div class="pab-sub">Sim vet clinic · cartoon bumps (opt-in) · free treatment · medic shifts pay ${esc(CURRENCY.name)}</div></div><span class="pab-chip" id="pab-mine"></span></div>
    <div class="pab-tabs">${[['you', 'You'], ['shift', 'Medic shift'], ['staff', 'Staff'], ['rules', 'Rules']].map(([k, l], i) => `<button class="btn ghost ${i ? '' : 'on'}" data-m="${k}">${esc(l)}</button>`).join('')}</div><div id="pab-body"></div></div>`;
  style(); body.querySelector('#pab-badge').appendChild(badge(40)); const pane = body.querySelector('#pab-body'), w = pawWallet(), C = clinic(); let cur = 'you', msg = '', timer = 0;
  const mine = () => { const s = w.state(), m = body.querySelector('#pab-mine'); if (m) m.innerHTML = `${esc(CURRENCY.name)}: ${s.joined ? `<b>${pm(s.balance)}</b>` : 'not joined'}`; };
  const show = (k) => { cur = k; msg = ''; body.querySelectorAll('[data-m]').forEach((b) => b.classList.toggle('on', b.dataset.m === k)); (k === 'staff' ? staff : k === 'rules' ? rules : k === 'shift' ? shift : you)(); mine(); };
  body.querySelectorAll('[data-m]').forEach((b) => b.onclick = () => show(b.dataset.m)); syncSoon(() => { mine(); if (cur === 'you') you(); });
  const re = () => { mine(); (cur === 'shift' ? shift : you)(); syncNow(() => { mine(); if (body.isConnected) (cur === 'shift' ? shift : you)(); }); };
  const notJoined = `<div class="pab-wal"><span>You are not in the side economy, so no bumps and no shifts. Treatment is free for everyone.</span><button class="btn green pab-btn" data-join>Join the side economy</button></div><div class="small">Joining is optional and you can leave any time. Cartoon bumps are a second, separate switch.</div>`;
  const hookJoin = () => { const b = pane.querySelector('[data-join]'); if (b) b.onclick = () => { w.join(); re(); }; };
  function you() { const s = w.state(), m = s.med; if (!s.joined) { pane.innerHTML = notJoined; hookJoin(); return; }
    const recs = w.entries().filter((e) => RECORD.includes(e.action) || (e.action === 'pm.wage' && e.data?.why === 'medic shift'));
    pane.innerHTML = `${msg ? `<div class="pab-row">${msg}</div>` : ''}<div class="pab-wal cl-st"><span>Cartoon bumps: <b class="${m.bumps ? 'pab-ok' : ''}">${m.bumps ? 'on' : 'off'}</b></span>${m.bumps ? '<button class="btn ghost tiny pab-btn" data-off>Switch off</button>' : '<button class="btn green tiny pab-btn" data-on>Switch on</button>'}<span class="small" style="margin:0">Today: ${m.injuriesToday}/${MED.injuriesPerDay} bumps</span></div>
      ${m.hurt?.live ? `<div class="pab-wal cl-st"><span><b class="pab-bad">${esc(m.hurt.label)}</b> · ${secs(m.hurt.leftMs)} left${m.slow < 1 ? ` · walking x${m.slow}` : ''}</span><button class="btn green pab-btn" data-treat>Treat now (free)</button><button class="btn ghost pab-btn" data-chip ${s.balance >= MED.copay ? '' : 'disabled'}>Treat + chip in ${pm(MED.copay)} (optional)</button></div>`
        : `<div class="pab-row">${m.bumps ? 'No bumps right now. They only happen by the rules (see Rules), never more than 3 a day.' : 'Switch bumps on for a little cartoon flavour: a stubbed paw, a bee sting, sunburn or a tummy ache. Off by default.'}</div>`}
      <div class="small" style="margin:6px 0 2px">Your clinic record (hash-chained, anchored on the sim server)</div>
      <div class="pab-list"><table><tr><th>#</th><th>what</th><th>${esc(CURRENCY.short)}</th><th>hash</th></tr>${recs.length ? recs.map((e) => `<tr><td>${e.seq}</td><td>${esc(e.action === 'pm.wage' ? 'medic wage' : what(e))}</td><td>${e.value.amount || ''}</td><td><code>${e.hash.slice(0, 8)}</code></td></tr>`).join('') : `<tr><td colspan="4">${s.anchoredSeq ? 'Older entries are anchored on the server; this device shows the ones since the last sync.' : 'Nothing yet.'}</td></tr>`}</table></div>`;
    const q = (k) => pane.querySelector(k);
    q('[data-on]') && (q('[data-on]').onclick = () => { C.bumpsOn(); re(); }); q('[data-off]') && (q('[data-off]').onclick = () => { C.optOut(); re(); });
    q('[data-treat]') && (q('[data-treat]').onclick = () => { C.treat(false); msg = '<b class="pab-ok">Dr. Pawsley patched you up. Free, as always.</b>'; re(); });
    q('[data-chip]') && (q('[data-chip]').onclick = () => { C.treat(true); msg = `<b class="pab-ok">All better. Thanks for chipping in ${pm(MED.copay)}: it's optional and changes nothing.</b>`; re(); }); }
  function shift() { const s = w.state(); if (!s.joined) { pane.innerHTML = notJoined; hookJoin(); return; } const q = w.quote('wage'), sh = C.shift, nx = shiftCall(Date.now());
    pane.innerHTML = `${msg ? `<div class="pab-row">${msg}</div>` : ''}<div class="pab-wal"><span>Medic shift: answer one call from a sim pup on the plaza, walk over, and treat them in the right order.</span></div>
      <div class="pab-row">${sh && sh.state !== 'done' ? `On shift: ${esc(sh.c.name)} · ${esc(AILMENTS[sh.c.ail].label.toLowerCase())} · ${sh.state === 'task' ? 'treating' : 'walk to the + on the plaza'} <button class="btn ghost tiny" data-end>End shift</button>`
        : q.ok ? `Next call: <b>${esc(nx.name)}</b> (${esc(AILMENTS[nx.ail].label.toLowerCase())}) · pays <b>${pm(q.amount)}</b> · <button class="btn green pab-btn" data-start>Start a medic shift</button>`
        : `<span class="small">${q.reason === 'cooldown' ? `Next shift in ${Math.max(1, Math.ceil(q.waitMs / 60e3))} min` : 'Daily wage cap reached: back tomorrow'}</span>`}</div>
      <div class="small">Medic wages are ordinary sim wages: the same ${pm(FLOWS.wage.dailyCap)} daily cap, ${FLOWS.wage.cooldownMs / 60e3} min cooldown and shrinking pay (${FLOWS.wage.base}, ${Math.floor(FLOWS.wage.base * FLOWS.wage.decay)}, ${Math.floor(FLOWS.wage.base * FLOWS.wage.decay ** 2)}…) shared with the desk and ranger shifts. Patients are always sim pups from the clinic's call list (one every ${MED.callMs / 60e3} min), so treating your own bumps or a friend's never pays. Medic calls today: ${s.med.treatsToday}/${MED.treatsPerDay}.</div>`;
    const b = pane.querySelector('[data-start]'); if (b) b.onclick = () => { try { C.startShift(); msg = ''; } catch (e) { msg = `<span class="pab-bad">${esc(e.message)}</span>`; } shift(); };
    const e = pane.querySelector('[data-end]'); if (e) e.onclick = () => { C.endShift(); shift(); };
    clearInterval(timer); timer = setInterval(() => { if (!body.isConnected || cur !== 'shift') return clearInterval(timer); }, 2000); }
  function staff() { pane.innerHTML = `<div class="pab-grid">${STAFF.map((b, i) => `<div class="pab-card"><span data-por="${i}"></span><b>${esc(b.name)}</b><div>${esc(b.title)}</div><div style="font-size:10px;color:#d8d2bc">"${esc(b.line)}"</div></div>`).join('')}</div>
      <div class="small">Sim pups, not real players. The medics answer a sim pup's call every ${MED.callMs / 60e3} minutes (${PATIENTS.map((p) => p.name).join(', ')}) and treat them on the plaza. Treatment never reads what you wear or own.</div>`;
    pane.querySelectorAll('[data-por]').forEach((p) => p.appendChild(portrait(STAFF[+p.dataset.por], deps))); }
  function rules() { pane.innerHTML = `<div class="pab-list">${[
    'Opt-in twice: cartoon bumps only happen to players who joined the side economy AND switched bumps on (off by default). Switch them off any time.',
    `Cartoon only: ${Object.values(AILMENTS).map((a) => `${a.label.toLowerCase()} (${a.how}, ${a.sec} s${a.slow < 1 ? `, walk x${a.slow}` : ', just for looks'})`).join('; ')}.`,
    `Never longer than ${MED.maxSec} s, at most ${MED.injuriesPerDay} a day, ${MED.injuryGapMs / 60e3} min apart, and one at a time. Nobody is ever blocked: you can move, chat, enter doors and play other games the whole time.`,
    `Ways out, always: walk it off (${MED.walkOffTiles} tiles), switch bumps off, wait it out, or free treatment here. A ${pm(MED.copay)} co-pay is optional: waive it and nothing changes.`,
    `Medic shifts pay ordinary sim wages (shared daily cap and shrinking pay) only for treating a sim pup from the clinic's call list. Patients are never players, so nobody can bump themselves (or a friend) and treat it for pay. At most ${MED.treatsPerDay} calls a day.`,
    'Nothing here touches Bones, $KIBBLE, prizes, scores or other games. Nothing is won by chance or staked; calls follow a fixed timetable. $KIBBLE cosmetics change nothing.',
    'Every bump, recovery, treatment, co-pay and medic call is a hash-chained entry anchored on the sim server.'].map((r) => `<div class="pab-row">${esc(r)}</div>`).join('')}</div>`; }
  show('you');
}
