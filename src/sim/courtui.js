// Phase 4 UI: the Barkley Courthouse panel (opened from the courthouse steps through the Bureau panel hook). Your cases
// (the anchored evidence file), a short evidence-review trial with a 90 s cap and a walk-out, the bench, and the rules.
// The panel only reads the anchored file and appends verdicts through the wallet; it never edits evidence and never
// touches Bones, $KIBBLE, prizes, scores or other games.
import { pawWallet, syncNow, syncSoon } from './simstate.js';
import { COURT, BENCH, GROUNDS, groundsFor, createTrial } from './court.js';
import { POLICE, OFFENSES, isCrossing } from './police.js';
import { officerById, FORCE_COLORS as F } from './force.js';
import { STREETS } from './place.js';
import { drawBench, drawScales, COURT_COLORS as CC } from './courtart.js';
import { worldLookup } from './patrolui.js';
import { CURRENCY, pm } from './currency.js';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const clock = (ms) => { const s = Math.max(0, Math.ceil(ms / 1000)); return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`; };
const hhmm = (ts) => new Date(ts).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
const CSS = `.pab .ct-ex{background:#1a2142;border-left:4px solid var(--v);padding:5px 8px;margin:4px 0;font-size:11px;text-align:left}.pab .ct-ex h4{margin:0 0 3px;color:var(--s);font-weight:normal;font-size:11px}
.pab .ct-scene{display:flex;gap:8px;align-items:flex-start;flex-wrap:wrap}.pab .ct-scene canvas{width:min(234px,44vw);image-rendering:pixelated;border:2px solid var(--v);flex:none}.pab .ct-legend{font-size:10px;color:#d8d2bc;flex:1;min-width:140px}
.pab .ct-def{display:flex;gap:5px;flex-wrap:wrap;margin-top:5px}.pab .ct-def .btn{font-size:10px;padding:5px 7px;text-align:left;white-space:normal;max-width:100%}.pab .ct-top{display:flex;gap:6px;align-items:center;flex-wrap:wrap;margin-bottom:4px}
.pab .ct-rule{background:#141a2e;border:3px solid var(--v);padding:6px 8px;font-size:12px;margin-top:6px}.pab .ct-k{display:inline-block;width:10px;height:10px;vertical-align:middle;margin-right:3px;border:1px solid #0008}`;
let TRIAL = null;
function portrait(b, deps) { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 144; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  try { drawBench(x, b, { x: 64, y: 122, face: 'down', moving: false, phase: 0 }, deps, { scale: 2 }); } catch {} return cv; }
function crest(px = 40) { const cv = document.createElement('canvas'); cv.width = cv.height = px; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.fillStyle = CC.ink; x.fillRect(0, 0, px, px); drawScales(x, px / 2, px / 2 + 1, px / 16); return cv; }
// Exhibit B: the scene at the moment of the citation, drawn from the world tiles: your tile (gold paw) and where the patrol
// log puts the officer at that second (badge). 13 x 9 tiles, a faint grid so the tiles can be counted.
const TILE_COL = ['#5e9e4a', '#4a4f5c', '#c9bfa5', '#7a6f5e', '#3f7fbf', '#2f6b34', '#8a6a3a', '#5e9e4a', '#d9cfb8', '#9a7a5a', '#a07a4a'];
export function drawScene(cv, rec, f) { const W = 13, H = 9, S = 12, d = rec.e.data, x0 = d.tx - 6, y0 = d.ty - 4, c = cv.getContext('2d'); cv.width = W * S; cv.height = H * S; c.imageSmoothingEnabled = false;
  const wl = worldLookup(), T = wl?.T || { ROAD: 1, FLOWER: 7 }, tileAt = (tx, ty) => { try { if (wl) return wl.tileAt(tx, ty); } catch {} return STREETS.roads.some((r) => ty >= r && ty < r + 3) ? 1 : 8; };
  for (let j = 0; j < H; j++) for (let i = 0; i < W; i++) { const tx = x0 + i, ty = y0 + j, t = tileAt(tx, ty); c.fillStyle = t < 0 ? '#3b3f52' : TILE_COL[t] || '#d9cfb8'; c.fillRect(i * S, j * S, S, S);
    if (t === T.ROAD && isCrossing(tx, ty)) { c.fillStyle = '#f4f1ea'; for (let k = 1; k < S; k += 4) c.fillRect(i * S + k, j * S + 1, 2, S - 2); }
    if (t === T.FLOWER) { c.fillStyle = '#e48bb5'; c.fillRect(i * S + 3, j * S + 3, 2, 2); c.fillRect(i * S + 8, j * S + 6, 2, 2); c.fillStyle = '#f2d14b'; c.fillRect(i * S + 6, j * S + 2, 2, 2); } }
  c.fillStyle = 'rgba(255,255,255,0.12)'; for (let i = 1; i < W; i++) c.fillRect(i * S, 0, 1, H * S); for (let j = 1; j < H; j++) c.fillRect(0, j * S, W * S, 1);
  const px = 6 * S, py = 4 * S; c.strokeStyle = '#e7b83a'; c.lineWidth = 2; c.strokeRect(px + 1, py + 1, S - 2, S - 2); c.fillStyle = '#e7b83a'; c.fillRect(px + 4, py + 5, 4, 4); for (const [a, b] of [[3, 2], [6, 2], [8, 3], [2, 4]]) c.fillRect(px + a, py + b, 2, 2);
  if (f.officer) { const ox = (f.officer.x - x0) * S, oy = (f.officer.y - y0) * S, cop = officerById(rec.e.actor)?.force === 'police';
    if (ox > -S && oy > -S && ox < W * S + S && oy < H * S + S) { c.fillStyle = '#141a2e'; c.fillRect(ox - 5, oy - 5, 10, 10); c.fillStyle = cop ? F.navyLight : F.olive; c.fillRect(ox - 4, oy - 4, 8, 8); c.fillStyle = cop ? F.gold : '#c9e3a0'; c.fillRect(ox - 1, oy - 3, 2, 6); c.fillRect(ox - 3, oy - 1, 6, 2); }
    else { c.fillStyle = '#ff6a6a'; c.font = '8px monospace'; c.fillText('officer off-map', 2, 9); } }
  return cv; }
function ruling(rec, ground, out, f) { const o = f.officer?.name || 'the officer', d = rec.e.data;
  if (ground === 'sightline') return out === 'dismissed' ? `Dismissed. The patrol log puts ${o} ${f.dist} tiles from tile ${d.tx},${d.ty} at ${hhmm(rec.e.ts)}: beyond the ${COURT.clearViewTiles}-tile clear-view rule.` : `Upheld. ${o} was ${f.dist} tiles away: well within clear view.`;
  if (ground === 'crossing') return out === 'dismissed' ? `Dismissed. Tile ${d.tx},${d.ty} is one step from the zebra stripes: the court excuses it.` : `Upheld. The nearest zebra stripes are more than one step from tile ${d.tx},${d.ty}.`;
  return out === 'dismissed' ? `Dismissed. Only ${f.standingPriors} of the ${f.priors.length} citations behind this detention still stand.` : `Upheld. ${f.standingPriors} citations behind this detention still stand.`; }
export function renderCourt(body, deps) {
  if (!document.getElementById('ct-style')) { const st = document.createElement('style'); st.id = 'ct-style'; st.textContent = CSS; document.head.appendChild(st); }
  body.innerHTML = `<div class="pab" style="--v:${CC.brassDark};--s:${CC.stone}"><div class="pab-head"><span id="pab-badge"></span><div style="flex:1"><h2>Barkley Courthouse</h2><div class="pab-sub">Sim court · contest a citation or detention on the anchored evidence · dismissed = refunded in ${esc(CURRENCY.name)}</div></div><span class="pab-chip" id="pab-mine"></span></div>
    <div class="pab-tabs">${[['cases', 'Your cases'], ['bench', 'The court'], ['rules', 'Rules']].map(([k, l], i) => `<button class="btn ghost ${i ? '' : 'on'}" data-c="${k}">${esc(l)}</button>`).join('')}</div><div id="pab-body"></div></div>`;
  body.querySelector('#pab-badge').appendChild(crest(40)); const pane = body.querySelector('#pab-body'), w = pawWallet(); let cur = 'cases', timer = 0, result = null;
  const mine = () => { const s = w.state(), m = body.querySelector('#pab-mine'); if (m) m.innerHTML = `${esc(CURRENCY.name)}: ${s.joined ? `<b>${pm(s.balance)}</b>` : 'not joined'}`; };
  const show = (k) => { cur = k; clearInterval(timer); body.querySelectorAll('[data-c]').forEach((b) => b.classList.toggle('on', b.dataset.c === k)); (k === 'bench' ? bench : k === 'rules' ? rules : cases)(); mine(); };
  body.querySelectorAll('[data-c]').forEach((b) => b.onclick = () => show(b.dataset.c)); syncSoon(() => { mine(); if (cur === 'cases' && !TRIAL) cases(); });
  const what = (r) => `${r.k === 'detain' ? 'Detention' : r.e.data.fine ? 'Citation' : 'Warning'} · ${esc(OFFENSES[r.e.data.offense]?.short || r.e.data.offense)} @${r.e.data.tx},${r.e.data.ty}`;
  function cases() { const s = w.state(); if (TRIAL && TRIAL.state === 'open') return trial();
    if (!s.joined) { pane.innerHTML = `<div class="pab-wal"><span>You are not in the side economy, so you have no cases.</span><button class="btn green pab-btn" data-join>Join the side economy</button></div><div class="small">The court is opt-in: only players who joined (and only for their own records) can contest anything.</div>`; pane.querySelector('[data-join]').onclick = () => { w.join(); mine(); cases(); syncNow(() => { mine(); cases(); }); }; return; }
    const list = w.docket(), left = COURT.verdictsPerDay - s.verdictsToday, pending = w.entries().filter((e) => e.action === 'police.cite' || e.action === 'police.detain').length;
    pane.innerHTML = `<div class="pab-wal"><span>Verdicts today: <b>${s.verdictsToday}</b>/${COURT.verdictsPerDay}</span><span class="small" style="margin:0">Evidence from the sim server's anchored log${pending ? ` · ${pending} new record${pending > 1 ? 's' : ''} syncing…` : ''}</span></div>
      ${result ? `<div class="ct-rule">${result}</div>` : ''}
      <div class="pab-list"><table><tr><th>#</th><th>record</th><th>by</th><th>paid</th><th>status</th></tr>${list.length ? list.map((r) => { const o = officerById(r.e.actor), st = r.verdict === 'dismissed' ? `<span class="pab-ok">Dismissed${r.refunded ? ' · refunded' : ''}</span>` : r.verdict === 'upheld' ? 'Upheld' : !r.open ? '<span class="small">Closed (over a day)</span>' : !r.facts.admissible ? '<span class="small">Not triable</span>' : left <= 0 ? '<span class="small">Tomorrow</span>' : `<button class="btn tiny pab-btn" data-try="${r.e.seq}">Contest</button>`;
        return `<tr><td>${r.e.seq}</td><td>${what(r)}</td><td>${esc(o ? o.name.split(' ').slice(-2).join(' ') : r.e.actor)}</td><td>${r.paid ? pm(r.paid) : '—'}</td><td>${st}</td></tr>`; }).join('') : `<tr><td colspan="5">No citations or detentions on file. Clean record.</td></tr>`}</table></div>
      <div class="small">Pick a record to see its evidence and present a defence. Contesting is free: there is nothing to pay and nothing to win except your own fine or bail back. Walk out any time and the record stays as it was.</div>`;
    pane.querySelectorAll('[data-try]').forEach((b) => b.onclick = () => { result = null; TRIAL = createTrial({ wallet: w, seq: +b.dataset.try }); trial(); }); }
  function trial() { const T = TRIAL, rec = w.docket().find((r) => r.e.seq === T.seq); if (!rec) { TRIAL = null; return cases(); } const f = rec.facts, d = rec.e.data, o = officerById(rec.e.actor), opts = groundsFor(rec);
    pane.innerHTML = `<div class="ct-top"><b>Trial · record #${rec.e.seq}</b><span class="pab-chip" id="ct-left">${clock(T.leftMs())} left</span><button class="btn ghost tiny pab-btn" data-out>Walk out (record stands)</button></div>
      <div class="pab-list">
      <div class="ct-ex"><h4>Clerk Inkpaw reads the charge</h4>${esc(o?.name || rec.e.actor)} ${rec.k === 'detain' ? `detained you for ${d.sec} s` : d.fine ? `fined you ${pm(d.fine)}` : 'warned you'} for ${esc(OFFENSES[d.offense]?.label || d.offense)} on tile ${d.tx},${d.ty} at ${hhmm(rec.e.ts)}.${rec.paid ? ` You paid ${pm(rec.paid)}.` : ''}</div>
      <div class="ct-ex"><h4>Exhibit A · the anchored log entry</h4><table><tr><th>#</th><th>action</th><th>by</th><th>hash</th><th>prev</th></tr><tr><td>${rec.e.seq}</td><td>${esc(rec.e.action)}</td><td>${esc(rec.e.actor.replace('sim:', ''))}</td><td><code>${rec.e.hash.slice(0, 12)}</code></td><td><code>${rec.e.prev.slice(0, 12)}</code></td></tr></table>
        <div class="small" style="margin:2px 0 0">Re-hashed by the court: <b class="${f.hashOk ? 'pab-ok' : 'pab-bad'}">${f.hashOk ? 'matches' : 'does not match'}</b> · anchored on the sim server · read-only: the court cannot edit it</div></div>
      <div class="ct-ex"><h4>Exhibit B · the scene at ${hhmm(rec.e.ts)}</h4><div class="ct-scene"><canvas id="ct-scene"></canvas><div class="ct-legend"><div><span class="ct-k" style="background:#e7b83a"></span>your tile (${d.tx},${d.ty})</div><div><span class="ct-k" style="background:${o?.force === 'police' ? F.navyLight : F.olive}"></span>${esc(o?.name || 'officer')} at that second (patrol log)</div><div><span class="ct-k" style="background:#f4f1ea"></span>zebra stripes</div><div style="margin-top:3px">Each square is one tile. Court rules: a sighting stands only within ${COURT.clearViewTiles} tiles; one step from the stripes is excused.</div></div></div></div>
      ${rec.k === 'detain' ? `<div class="ct-ex"><h4>Exhibit C · the citations behind the detention</h4>${f.priors.map((s) => { const p = w.docket().find((r) => r.e.seq === s); return `<div>#${s} · ${p ? what(p) : 'record'} · ${p?.verdict ? esc(p.verdict) : 'stands'}</div>`; }).join('') || '—'}<div class="small">A detention needs ${POLICE.priorCites} standing citations within ${POLICE.repeatWindowMs / 60e3} min.</div></div>` : ''}
      <div class="ct-ex"><h4>Your defence · Maple Quillfeather</h4>"Pick the one argument the evidence backs. A wrong one and the record is upheld, and each record is tried once."<div class="ct-def">${opts.map((g) => `<button class="btn pab-btn" data-g="${g}">${esc(GROUNDS[g].label)}</button>`).join('')}</div></div></div>`;
    try { drawScene(pane.querySelector('#ct-scene'), rec, f); } catch {}
    pane.querySelector('[data-out]').onclick = () => { T.walkOut(); TRIAL = null; result = `You walked out of the trial. Record #${rec.e.seq} stands as it was (nothing was logged).`; cases(); };
    pane.querySelectorAll('[data-g]').forEach((b) => b.onclick = () => { let r; try { r = T.present(b.dataset.g); } catch (e) { TRIAL = null; result = esc(e.message); return cases(); }
      TRIAL = null; result = `<b>Judge Barkwell:</b> ${esc(ruling(rec, b.dataset.g, r.outcome, f))}${r.refunded ? ` <b class="pab-ok">+${pm(r.refunded)} refunded</b> (exactly what you paid).` : ''} <span class="small">Verdict #${r.verdict.seq} appended to your log.</span>`; mine(); cases(); syncNow(() => { mine(); if (cur === 'cases' && !TRIAL) cases(); }); });
    clearInterval(timer); timer = setInterval(() => { if (!body.isConnected || TRIAL !== T) return clearInterval(timer); const el = pane.querySelector('#ct-left'); if (T.state !== 'open') { clearInterval(timer); TRIAL = null; result = `Time's up (${COURT.trialSec} s). Record #${rec.e.seq} stands as it was.`; return cases(); } if (el) el.textContent = `${clock(T.leftMs())} left`; }, 500); }
  function bench() { pane.innerHTML = `<div class="pab-grid">${BENCH.map((b, i) => `<div class="pab-card"><span data-por="${i}"></span><b>${esc(b.name)}</b><div>${esc(b.title)}</div><div style="font-size:10px;color:#d8d2bc">"${esc(b.line)}"</div></div>`).join('')}</div>
      <div class="small">Sim pups, not real players. The judge rules only on what the anchored log and the patrol schedule show; nobody can pay, dress or talk their way to a verdict.</div>`;
    pane.querySelectorAll('[data-por]').forEach((p) => p.appendChild(portrait(BENCH[+p.dataset.por], deps))); }
  function rules() { pane.innerHTML = `<div class="pab-list">${[
    'Opt-in: only players who joined the side economy can contest, and only their own citations and detentions.',
    `Any citation or detention can be contested for a day after it happened, once. At most ${COURT.verdictsPerDay} verdicts a day.`,
    'The court reads the evidence exactly as it was anchored on the sim server and re-hashes it. It can never edit it. Each verdict is a new entry added to your log.',
    `Defences: the officer was more than ${COURT.clearViewTiles} tiles away (the patrol schedule shows where), you were one step from the zebra stripes, or the citations behind a detention don't stand. A wrong defence means upheld.`,
    `Dismissed: your fine or bail comes back in ${CURRENCY.name}, exactly what you paid. Upheld: nothing changes.`,
    `A trial lasts at most ${COURT.trialSec} s. Walk out any time; if you do, or time runs out, the original outcome stays and nothing is logged.`,
    'No chance and no side deals: verdicts come from the evidence alone. Nothing can be put on a trial by you or anyone watching, and there is no fee.',
    'Records the patrol log cannot back up (no officer was there at that time) cannot be tried, so nobody can farm refunds.',
    `Nothing here touches Bones, $KIBBLE, prizes, scores or other games. $KIBBLE cosmetics change nothing: the judge never sees what you wear or own.`].map((r) => `<div class="pab-row">${esc(r)}</div>`).join('')}</div>`; }
  show('cases');
}
