// Phase 6 UI: the Emberpaw Firehouse panel (opened from the firehouse door through the Bureau panel hook) and the small
// fire card for firefighter shifts (the call, then the steps) and results. Never modal: bottom-centre on big screens
// (above the police and clinic cards), top-right on phones (below them). The siren is ONE sound per call-out with a
// cooldown, sent to the game's own audio manager (which owns mute and the no-stacking limiter) as a DOM event.
import { pawWallet, syncNow, syncSoon } from './simstate.js';
import { createFirehouse, shiftEvent, ev } from './firehouse.js';
import { FIRE, INCIDENTS, CREW, CONSTABLE, fireSlotAt } from './fire.js';
import { drawCrew, drawEngine, FIRE_COLORS as K } from './fireart.js';
import { FIRE_STATION, TILE } from './place.js';
import { CURRENCY, pm } from './currency.js';
import { FLOWS } from './economy.js';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const secs = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const clock = (ms) => { const d = new Date(ms); return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`; };
const CSS = `#pab-fire{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(30px + env(safe-area-inset-bottom));z-index:9;width:min(360px,52vw);background:#141a2ef0;border:3px solid ${K.red};color:#f4f1ea;
font:11px/1.35 Silkscreen,monospace;padding:6px 8px;box-shadow:0 3px 0 #0008;pointer-events:auto;text-align:left}#pab-fire[hidden]{display:none}#pab-fire b{color:${K.tape}}
#pab-fire .row2{display:flex;gap:4px;flex-wrap:wrap;margin-top:5px}#pab-fire button{font:10px Silkscreen,monospace;padding:4px 6px;background:${K.redDark};color:#fff;border:2px solid ${K.tape};cursor:pointer}#pab-fire button.x{position:absolute;right:3px;top:2px;border:0;background:none;padding:2px 4px}
#pab-fire .step{background:#22356b;border-color:${K.tape}}
@media (max-height:500px){#pab-fire{left:auto;transform:none;right:calc(8px + env(safe-area-inset-right));top:calc(60px + env(safe-area-inset-top));bottom:auto;width:min(300px,42vw);font-size:10px;line-height:1.25;padding:5px 6px}#pab-fire .row2{margin-top:4px}#pab-fire button{padding:3px 5px}}
.pab .fi-st{display:flex;gap:6px;align-items:center;flex-wrap:wrap}.pab .fi-st .btn{font-size:10px}`;
let FIRERT = null, el = null, hideT = 0, lastHtml = '';
const sound = (name) => { try { globalThis.dispatchEvent?.(new CustomEvent('inu:sim-sfx', { detail: { name } })); } catch {} };
export function firehouse() { return (FIRERT ||= createFirehouse({ wallet: pawWallet(), onChange: () => draw(), sync: () => syncSoon(), sound })); }
let acc = 0; export function fireTick(dt, t, view) { try { const F = firehouse(); F.tick(dt, t, view); acc += dt; if (acc > 0.25) { acc = 0; if (F.notice || F.shift) draw(); } } catch {} }
export function fireView() { try { return firehouse().view(); } catch { return { events: false, mine: null }; } }
function style() { if (!document.getElementById('pab-fire-style')) { const s = document.createElement('style'); s.id = 'pab-fire-style'; s.textContent = CSS; document.head.appendChild(s); } }
function card() { if (el?.isConnected) return el; style(); el = document.createElement('div'); el.id = 'pab-fire'; el.hidden = true; el.setAttribute('role', 'status'); document.body.appendChild(el);
  el.addEventListener('click', (e) => { const b = e.target.closest('button'); if (!b) return; const F = firehouse(), k = b.dataset.k;
    try { if (k === 'end') F.endShift(); else if (k === 'x') F.dismiss(); else if (k === 'step') F.tap(+b.dataset.i); } catch (err) { el.querySelector('.err')?.replaceChildren(String(err.message)); } draw(); });
  return el; }
function draw() { const F = FIRERT, n = F?.notice, sh = F?.shift, live = sh && sh.state !== 'done'; if (!n && !live) { if (el) el.hidden = true; lastHtml = ''; return; } const c = card(); let html = '';
  if (live && sh.state === 'task') { const I = INCIDENTS[sh.c.kind], nextOk = (() => { let nx = 0; for (const t of sh.taps) if (t === nx) nx++; return nx; })(), slips = sh.taps.length - nextOk;
    html = `<b>${esc(I.label)} · ${esc(sh.c.name)}</b><div>Tap the steps in the right order (${nextOk}/${I.steps.length}${slips ? ` · ${slips} slip${slips > 1 ? 's' : ''}` : ''}${sh.retry ? ' · started over' : ''}).</div>
      <div class="row2">${sh.order.map((i) => `<button class="step" data-k="step" data-i="${i}" ${i < nextOk ? 'disabled' : ''}>${esc(I.steps[i])}</button>`).join('')}</div><div class="row2"><button data-k="end">End shift</button></div><div class="small err"></div>`; }
  else if (live) { const c2 = sh.c, left = c2.start + 140e3 - Date.now();
    html = `<b>Firefighter shift${sh.wait > 0 ? '' : ` · ${secs(left)} left`}</b><div>${sh.wait > 0 ? `Next call in ${secs(sh.wait)}: ${esc(INCIDENTS[c2.kind].label.toLowerCase())} at ${esc(c2.name)}.` : `${esc(INCIDENTS[c2.kind].label)} at ${esc(c2.name)}: walk to the flame marker${sh.dist != null ? ` (${sh.dist} m)` : ''}.`}${c2.big ? ' Two-alarm: a constable and a medic are on scene too.' : ''} Pays ${pm(sh.quote)} when sorted.</div><div class="row2"><button data-k="end">End shift</button></div>`; }
  else { html = `<button class="x" data-k="x" aria-label="Close">✕</button><b>${n.kind === 'paid' ? 'Firefighter shift' : 'Emberpaw Firehouse'}</b><div>${esc(n.text)}</div>`;
    clearTimeout(hideT); hideT = setTimeout(() => { if (FIRERT?.notice && FIRERT.notice === n) FIRERT.dismiss(); }, 7000); }
  if (html !== lastHtml) { c.innerHTML = html; lastHtml = html; } c.hidden = false; place(c); }
// stack with the police (#pab-notice) and clinic (#pab-med) cards: below them on phones, above them on big screens
function place(c) { const shown = ['#pab-notice', '#pab-med'].map((s) => document.querySelector(s)).filter((o) => o && !o.hidden && getComputedStyle(o).display !== 'none').map((o) => o.getBoundingClientRect()).filter((r) => r.width);
  if (matchMedia('(max-height:500px)').matches) { const v = shown.length ? `${Math.round(Math.max(...shown.map((r) => r.bottom)) + 6)}px` : ''; if (c.style.top !== v) c.style.top = v; if (c.style.bottom) c.style.bottom = ''; return; }
  if (c.style.top) c.style.top = ''; let bottom = shown.length ? innerHeight - Math.min(...shown.map((r) => r.top)) + 6 : 0; const me = c.getBoundingClientRect();
  for (const s of ['#guidechip', '#prompt', '#toast', '#photobar']) { const o = document.querySelector(s); if (!o || o.hidden || getComputedStyle(o).display === 'none' || getComputedStyle(o).visibility === 'hidden') continue; const q = o.getBoundingClientRect();
    if (!q.width || q.top < innerHeight / 2 || q.right <= me.left || q.left >= me.right) continue; bottom = Math.max(bottom, innerHeight - q.top + 6); }
  const v = bottom ? `${Math.round(bottom)}px` : ''; if (c.style.bottom !== v) c.style.bottom = v; }
function portrait(s, deps, police = false) { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 144; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  try { drawCrew(x, s, { x: 64, y: 122, face: 'down', moving: false, phase: 0 }, deps, { scale: 2 }); } catch {} return cv; }
function badge(px = 40) { const cv = document.createElement('canvas'); cv.width = 84; cv.height = px; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = K.redDark; x.fillRect(0, 0, 84, px); try { drawEngine(x, { x: 42, y: px - 4, face: 'right', beacon: true }, 0, true); } catch {} return cv; }
const RECORD = ['fire.optin', 'fire.optout', 'fire.attend'];
const what = (e) => e.action === 'fire.optin' ? 'town events on' : e.action === 'fire.optout' ? 'town events off' : `answered: ${INCIDENTS[e.data?.kind]?.label.toLowerCase() || 'a call'}`;
export function renderFire(body, deps) {
  body.innerHTML = `<div class="pab" style="--v:${K.redDark};--s:${K.red}"><div class="pab-head"><span id="pab-badge"></span><div style="flex:1"><h2>Emberpaw Firehouse</h2><div class="pab-sub">Sim fire crew · cartoon town events (opt-in) · firefighter shifts pay ${esc(CURRENCY.name)}</div></div><span class="pab-chip" id="pab-mine"></span></div>
    <div class="pab-tabs">${[['board', 'Call board'], ['shift', 'Firefighter shift'], ['crew', 'Crew'], ['rules', 'Rules']].map(([k, l], i) => `<button class="btn ghost ${i ? '' : 'on'}" data-f="${k}">${esc(l)}</button>`).join('')}</div><div id="pab-body"></div></div>`;
  style(); body.querySelector('#pab-badge').appendChild(badge(40)); const pane = body.querySelector('#pab-body'), w = pawWallet(), F = firehouse(); let cur = 'board', msg = '';
  const mine = () => { const s = w.state(), m = body.querySelector('#pab-mine'); if (m) m.innerHTML = `${esc(CURRENCY.name)}: ${s.joined ? `<b>${pm(s.balance)}</b>` : 'not joined'}`; };
  const show = (k) => { cur = k; msg = ''; body.querySelectorAll('[data-f]').forEach((b) => b.classList.toggle('on', b.dataset.f === k)); (k === 'crew' ? crew : k === 'rules' ? rules : k === 'shift' ? shift : board)(); mine(); };
  body.querySelectorAll('[data-f]').forEach((b) => b.onclick = () => show(b.dataset.f)); syncSoon(() => { mine(); if (cur === 'board') board(); });
  const re = () => { mine(); (cur === 'shift' ? shift : board)(); syncNow(() => { mine(); if (body.isConnected) (cur === 'shift' ? shift : board)(); }); };
  const notJoined = `<div class="pab-wal"><span>You are not in the side economy, so the town stays quiet for you and there are no shifts.</span><button class="btn green pab-btn" data-join>Join the side economy</button></div><div class="small">Joining is optional and you can leave any time. Town events are a second, separate switch.</div>`;
  const hookJoin = () => { const b = pane.querySelector('[data-join]'); if (b) b.onclick = () => { w.join(); re(); }; };
  function board() { const s = w.state(); if (!s.joined) { pane.innerHTML = notJoined; hookJoin(); return; } const on = s.fire.events, now = Date.now(), s0 = fireSlotAt(now);
    const rows = []; for (let k = 0; k < 6; k++) { const c = ev(s0 + k); rows.push(`<tr><td>${clock(c.start)}</td><td>${c.quiet ? '<span class="small">quiet</span>' : `${esc(INCIDENTS[c.kind].label)}${c.big ? ' <b>(two-alarm)</b>' : ''}`}</td><td>${c.quiet ? '' : esc(c.name)}</td></tr>`); }
    const recs = w.entries().filter((e) => RECORD.includes(e.action) || (e.action === 'pm.wage' && e.data?.why === 'fire shift'));
    pane.innerHTML = `${msg ? `<div class="pab-row">${msg}</div>` : ''}<div class="pab-wal fi-st"><span>Town events: <b class="${on ? 'pab-ok' : ''}">${on ? 'on' : 'off'}</b></span>${on ? '<button class="btn ghost tiny pab-btn" data-off>Switch off</button>' : '<button class="btn green tiny pab-btn" data-on>Switch on</button>'}<span class="small" style="margin:0">Calls today: ${s.fire.callsToday}/${FIRE.callsPerDay}</span></div>
      <div class="small" style="margin:6px 0 2px">The call board (a fixed timetable: every device sees the same thing at the same time)</div>
      <div class="pab-list"><table><tr><th>time</th><th>incident</th><th>where</th></tr>${rows.join('')}</table></div>
      <div class="small" style="margin:6px 0 2px">Your firehouse record (hash-chained, anchored on the sim server)</div>
      <div class="pab-list"><table><tr><th>#</th><th>what</th><th>${esc(CURRENCY.short)}</th><th>hash</th></tr>${recs.length ? recs.map((e) => `<tr><td>${e.seq}</td><td>${esc(e.action === 'pm.wage' ? 'firefighter wage' : what(e))}</td><td>${e.value.amount || ''}</td><td><code>${e.hash.slice(0, 8)}</code></td></tr>`).join('') : `<tr><td colspan="4">${s.anchoredSeq ? 'Older entries are anchored on the server; this device shows the ones since the last sync.' : 'Nothing yet.'}</td></tr>`}</table></div>`;
    const q = (k) => pane.querySelector(k); q('[data-on]') && (q('[data-on]').onclick = () => { F.eventsOn(); re(); }); q('[data-off]') && (q('[data-off]').onclick = () => { F.eventsOff(); re(); }); }
  function shift() { const s = w.state(); if (!s.joined) { pane.innerHTML = notJoined; hookJoin(); return; } const q = w.quote('wage'), sh = F.shift, nx = shiftEvent(Date.now());
    pane.innerHTML = `${msg ? `<div class="pab-row">${msg}</div>` : ''}<div class="pab-wal"><span>Firefighter shift: answer one call from the board, walk to the flame marker, and sort it in the right order.</span></div>
      <div class="pab-row">${!s.fire.events ? '<span class="small">Switch town events on (Call board tab) to take shifts.</span>' : sh && sh.state !== 'done' ? `On shift: ${esc(INCIDENTS[sh.c.kind].label.toLowerCase())} at ${esc(sh.c.name)} · ${sh.state === 'task' ? 'sorting it' : 'walk to the flame marker'} <button class="btn ghost tiny" data-end>End shift</button>`
        : s.fire.callsToday >= FIRE.callsPerDay ? `<span class="small">That's ${FIRE.callsPerDay} calls today: back tomorrow</span>` : q.ok && nx ? `Next call: <b>${esc(INCIDENTS[nx.kind].label)}</b> at ${esc(nx.name)} (${clock(nx.start)}) · pays <b>${pm(q.amount)}</b> · <button class="btn green pab-btn" data-start>Start a firefighter shift</button>`
        : !q.ok ? `<span class="small">${q.reason === 'cooldown' ? `Next shift in ${Math.max(1, Math.ceil(q.waitMs / 60e3))} min` : 'Daily wage cap reached: back tomorrow'}</span>` : '<span class="small">No call on the board right now.</span>'}</div>
      <div class="small">Firefighter wages are ordinary sim wages: the same ${pm(FLOWS.wage.dailyCap)} daily cap, ${FLOWS.wage.cooldownMs / 60e3} min cooldown and shrinking pay (${FLOWS.wage.base}, ${Math.floor(FLOWS.wage.base * FLOWS.wage.decay)}, ${Math.floor(FLOWS.wage.base * FLOWS.wage.decay ** 2)}…) shared with the desk, ranger and medic shifts. Only incidents on the seeded call board pay, once each: there is no way to start a fire. Calls today: ${s.fire.callsToday}/${FIRE.callsPerDay}.</div>`;
    const b = pane.querySelector('[data-start]'); if (b) b.onclick = () => { try { F.startShift(); msg = ''; } catch (e) { msg = `<span class="pab-bad">${esc(e.message)}</span>`; } shift(); };
    const e = pane.querySelector('[data-end]'); if (e) e.onclick = () => { F.endShift(); shift(); }; }
  function crew() { const all = [...CREW]; pane.innerHTML = `<div class="pab-grid">${all.map((b, i) => `<div class="pab-card"><span data-por="${i}"></span><b>${esc(b.name)}</b><div>${esc(b.title)}</div><div style="font-size:10px;color:#d8d2bc">"${esc(b.line)}"</div></div>`).join('')}
      <div class="pab-card"><b>${esc(CONSTABLE.name)}</b><div>${esc(CONSTABLE.title)} (Barkley Precinct)</div><div style="font-size:10px;color:#d8d2bc">"${esc(CONSTABLE.line)}"</div></div></div>
      <div class="small">Sim pups, not real players. On a two-alarm call the constable tapes off a cordon and a clinic medic (whoever is not on a call) stands by. Nothing here reads what you wear or own.</div>`;
    pane.querySelectorAll('[data-por]').forEach((p) => p.appendChild(portrait(all[+p.dataset.por], deps))); }
  function rules() { pane.innerHTML = `<div class="pab-list">${[
    'Opt-in twice: the town events (incidents, the engine rolling, the siren) only show for players who joined the side economy AND switched town events on (off by default). Switch them off any time.',
    `Cartoon only: ${Object.values(INCIDENTS).map((a) => a.label.toLowerCase()).join(', ')}. Always at public spots (pavements, street trees, lampposts, the Crumb and Co. kiosk): never a player's home, plot, lot or shop. Nothing burns, nothing breaks.`,
    "Everything is scenery: nothing blocks a tile, a door, chat or another game. The cordon tape is just paint. One siren per call-out, with a cooldown, through the game's sound settings. Reduced motion: no flashing, still smoke.",
    `Calls follow a fixed timetable (one slot every ${FIRE.callMs / 60e3} min, some quiet), hashed from the clock: every device sees the same event at the same time. Nothing is won by chance or staked.`,
    `Firefighter shifts pay ordinary sim wages (shared daily cap and shrinking pay) only for answering a call on the board, once each, at most ${FIRE.callsPerDay} a day. There is no action that starts a fire, so nobody can light one to farm wages.`,
    'Nothing here touches Bones, $KIBBLE, prizes, scores, player shops or other games. $KIBBLE cosmetics change nothing.',
    'Every opt-in, call answered and wage is a hash-chained entry anchored on the sim server.'].map((r) => `<div class="pab-row">${esc(r)}</div>`).join('')}</div>`; }
  show('board');
}
