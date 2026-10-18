// Paw Audit Bureau desk panel: the audit report (ranked findings + the 12 checks), the Watchdogs roster and a live,
// hash-chained action-log demo the Red-Team Pup can try to tamper with. Opened from the Bureau desk (main.js hook).
import { buildReport, SEVERITY } from './report.js';
import { STATIC } from './audit-static.js';
import { sandbox } from './checks.js';
import { verifyChain, hashOf } from './ledger.js';
import { pawWallet, syncSoon, syncNow } from './simstate.js';
import { renderForce } from './patrolui.js';
import { renderCourt } from './courtui.js';
import { renderClinic } from './clinicui.js';
export { pawWallet };
import { CURRENCY, pm } from './currency.js';
import { FLOWS } from './economy.js';
import { guardedFetch } from './firewall.js';
import { ISSUER, SINK, PAWMARK } from './pawmarks.js';
import { WATCHDOGS, COLORS as C } from './roster.js';
import { drawMember, drawBadge } from './bureauart.js';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
const SEV_COL = { critical: '#d8404a', high: '#ff8a1e', medium: '#e3b341', low: '#7fb4ff', info: C.silver };
const CSS = `.pab{--v:${C.violet};--s:${C.silver}}.pab h2{color:var(--s);margin:0}.pab .pab-head{display:flex;gap:10px;align-items:center;border-bottom:3px solid var(--v);padding-bottom:6px}
.pab .pab-head canvas{width:40px;height:40px;image-rendering:pixelated;flex:none}.pab .pab-sub{font-size:11px;color:#b9b08e;margin:2px 0 0}
.pab .pab-tabs{display:flex;gap:6px;margin:8px 0;flex-wrap:wrap}.pab .pab-tabs .btn{padding:5px 9px;font-size:11px}.pab .pab-tabs .btn.on{background:var(--v);color:#fff;border-color:var(--s);box-shadow:inset -3px -3px 0 #4f2f9a,inset 3px 3px 0 #a58bea}
.pab .pab-chips{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px}.pab .pab-chip{padding:2px 6px;font-size:10px;border:2px solid var(--v);background:#141a2e;line-height:1.5}.pab .pab-sev{display:inline-block;min-width:50px;text-align:center;padding:1px 4px;font-size:10px;color:#141a2e;margin-right:6px;text-transform:uppercase}
.pab .pab-list{display:grid;gap:5px;max-height:min(52vh,330px);overflow:auto;padding-right:2px}.pab .pab-row{background:#1a2142;border-left:4px solid var(--v);padding:5px 8px;font-size:12px;text-align:left}
.pab details summary{cursor:pointer}.pab details p,.pab details li{font-size:11px;color:#d8d2bc;margin:3px 0}.pab .pab-ok{color:#6fdc8c}.pab .pab-bad{color:#ff6a6a}.pab code{font-size:10px;word-break:break-all}
.pab .pab-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px;max-height:min(52vh,330px);overflow:auto}.pab .pab-card{background:#1a2142;border:3px solid var(--v);padding:5px;font-size:11px;text-align:center}
.pab .pab-card canvas{width:64px;height:72px;display:block;margin:0 auto;image-rendering:pixelated}.pab .pab-card b{color:var(--s)}.pab .pab-wal{display:flex;gap:8px;align-items:center;flex-wrap:wrap;background:#1a2142;border:3px solid var(--v);padding:6px 8px;margin-bottom:6px;font-size:12px}.pab .pab-big{font-size:18px;color:var(--s)}.pab tr.pab-pick{cursor:pointer}.pab tr.pab-pick:hover td{background:#2a2f5a}.pab .pab-btn{padding:4px 8px;font-size:11px}.pab table{width:100%;border-collapse:collapse;font-size:10px}.pab td,.pab th{padding:2px 4px;border-bottom:1px solid #2a3360;text-align:left}
@media (max-height:420px){.pab .pab-list,.pab .pab-grid{max-height:calc(100vh - 150px)}.pab .pab-head canvas{width:28px;height:28px}.pab h2{font-size:15px}.pab .pab-sub{display:none}}
@media (pointer:coarse),(max-height:500px){.pab .pab-head{padding-right:52px}}`;
function badgeCanvas(px = 40) { const cv = document.createElement('canvas'); cv.width = cv.height = px; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; drawBadge(x, px / 2, px / 2, px / 10); return cv; }
function portrait(m, deps) { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 144; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  try { drawMember(x, m, { x: 64, y: 118, face: 'down', moving: false, phase: 0 }, deps, { scale: 2 }); } catch {} return cv; }
// a short scripted day in the Red-Team sandbox, so the log has something real to show
function demoLog() { const s = sandbox(); s.act(ISSUER, 'pm.issue', 'sim:cop-rex', { amount: 40, data: { why: 'shift wage' } }); s.act('sim:cop-rex', 'pm.pay', 'sim:pup-miso', { amount: 12, data: { why: 'coffee run' } });
  s.act('sim:pup-miso', 'pm.sink', SINK, { amount: 3, data: { why: 'parking fine' } }); s.act('sim:judge-oaks', 'evidence.file', 'sim:pup-kiki', { data: { key: 'demo-1', item: 'muddy paw print' } });
  s.act(WATCHDOGS[5].id, 'audit.read', 'sim:cop-rex'); try { s.act('sim:cop-rex', 'pm.pay', WATCHDOGS[6].id, { amount: 5 }); } catch (e) { s.act(WATCHDOGS[6].id, 'audit.note', 'sim:cop-rex', { data: { blocked: e.kind } }); } return s; }

const readout = () => { const s = pawWallet().state(); return s.joined ? `<b>${pm(s.balance)}</b>` : 'not joined'; };
// Small readout for the Kibble Bank (wallet view). Clearly separate from real money: sim-only, can't move here.
export function simReadout(body) { try { const el = document.createElement('div'); el.className = 'card'; el.dataset.pabReadout = '1'; el.style.cssText = 'margin-top:8px;border-color:#7B4FD6;text-align:left';
  el.innerHTML = `<b style="color:#C9CED6">${esc(CURRENCY.name)} (sim side currency): ${readout()}</b><small style="display:block">Not money and not $KIBBLE: they can't be bought, sold, moved to this wallet or cashed out. Earn them at the Paw Audit Bureau desk.</small>`;
  const anchorEl = body.querySelector('.bank') || body; anchorEl.after ? anchorEl.after(el) : body.appendChild(el); } catch {} }

export function renderBureau(body, deps, { tab = 'report' } = {}) {
  if (!document.getElementById('pab-style')) { const st = document.createElement('style'); st.id = 'pab-style'; st.textContent = CSS; document.head.appendChild(st); }
  if (tab === 'precinct' || tab === 'rangers') return renderForce(body, deps, tab); // Phase 3: Barkley Precinct kiosk / Greenpaw Rangers station
  if (tab === 'court') return renderCourt(body, deps); // Phase 4: Barkley Courthouse
  if (tab === 'clinic') return renderClinic(body, deps); // Phase 5: Pawsley Pup Clinic
  const chief = WATCHDOGS.find((w) => w.role === 'chief'); let report = null, S = null;
  body.innerHTML = `<div class="pab"><div class="pab-head"><span id="pab-badge"></span><div style="flex:1"><h2>Paw Audit Bureau</h2><div class="pab-sub">"The Watchdogs" · independent auditors · no wallet, no balance, no income · reports go to Zachary Nagle, signed by ${esc(chief.title)} ${esc(chief.name)}</div></div><span class="pab-chip" id="pab-mine" title="Your ${esc(CURRENCY.name)}">${esc(CURRENCY.name)}: ${readout()}</span></div>
    <div class="pab-tabs">${[['report', 'Audit report'], ['wallet', CURRENCY.name], ['team', 'The Watchdogs'], ['log', 'Action log']].map(([k, l]) => `<button class="btn ghost ${k === tab ? 'on' : ''}" data-pab="${k}">${esc(l)}</button>`).join('')}</div><div id="pab-body"></div></div>`;
  const mine = () => { const el = body.querySelector('#pab-mine'); if (el) el.innerHTML = `${esc(CURRENCY.name)}: ${readout()}`; };
  syncSoon(() => { mine(); if (cur === 'wallet') wallet(); });
  let cur = tab;
  body.querySelector('#pab-badge').appendChild(badgeCanvas(40));
  const pane = body.querySelector('#pab-body');
  const show = (k) => { cur = k; body.querySelectorAll('[data-pab]').forEach((b) => b.classList.toggle('on', b.dataset.pab === k)); (k === 'team' ? team : k === 'log' ? logTab : k === 'wallet' ? wallet : rep)(); };
  body.querySelectorAll('[data-pab]').forEach((b) => b.onclick = () => show(b.dataset.pab));
  async function rep() {
    if (!report) { pane.innerHTML = '<div class="small">The Watchdogs are running the 12 checks…</div>'; report = await buildReport(STATIC); S = report.summary; if (cur !== 'report') return; }
    pane.innerHTML = `<div class="pab-chips"><span class="pab-chip">Checks <b class="${S.checks.fail ? 'pab-bad' : 'pab-ok'}">${S.checks.pass}/12 pass</b></span>${SEVERITY.map((s) => `<span class="pab-chip"><span class="pab-sev" style="background:${SEV_COL[s]}">${s}</span>${S.findings[s]}</span>`).join('')}<span class="pab-chip" id="pab-live">Server copy: checking…</span></div>
      <div class="pab-list"><div class="small" style="margin:0">Findings, most severe first</div>${report.findings.map((f) => `<div class="pab-row" style="border-color:${SEV_COL[f.severity]}"><details><summary><span class="pab-sev" style="background:${SEV_COL[f.severity]}">${f.severity}</span><b>${esc(f.title)}</b> <span class="small">· ${esc(f.id)} · check ${f.check} · ${esc(f.status)}</span></summary>
        <p>${esc(f.detail || '')}</p><p><b>Repro:</b></p><ol>${f.repro.map((r) => `<li>${esc(r)}</li>`).join('')}</ol><p><b>Fix:</b> ${esc(f.fix)}</p></details></div>`).join('')}
      <div class="small" style="margin:6px 0 0">The 12 checks</div>${report.checks.map((c) => `<div class="pab-row"><details><summary><b class="${c.status === 'pass' ? 'pab-ok' : 'pab-bad'}">${c.status === 'pass' ? 'PASS' : 'FAIL'}</b> ${c.n}. ${esc(c.name)} <span class="small">· ${esc(c.scope)} · ${esc(c.owner)}</span></summary><ul>${c.evidence.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></details></div>`).join('')}
      <div class="small">Side currency: <b>${esc(PAWMARK.name)}</b>, earned and spent only in the sim, anchored on the sim server. One-way: never Bones, never $KIBBLE, never cashed out, never tied to a wallet. JSON: <a href="/api/sim-audit" target="_blank" rel="noopener">/api/sim-audit</a></div></div>`;
    guardedFetch('/api/sim-audit').then((r) => r.ok ? r.json() : Promise.reject(r.status)).then((j) => { const el = pane.querySelector('#pab-live'); if (el) el.innerHTML = `Server copy: <b class="${j.summary.checks.fail ? 'pab-bad' : 'pab-ok'}">${j.summary.checks.pass}/12</b>`; })
      .catch(() => { const el = pane.querySelector('#pab-live'); if (el) el.textContent = 'Server copy: offline (local report shown)'; });
  }
  function wallet() {
    const w = pawWallet(), st = w.state(), q = w.quote('wage'), F = FLOWS.wage, mins = (ms) => ms > 3600e3 ? `${Math.ceil(ms / 3600e3)} h` : `${Math.max(1, Math.ceil(ms / 60e3))} min`;
    const srv = st.server === 'ok' ? `anchored up to #${st.anchoredSeq}${st.unsynced ? ` · ${st.unsynced} waiting` : ''}` : st.server === 'offline' ? `server offline: kept on this device (${st.unsynced} waiting)` : st.server === 'unknown' ? 'checking the sim server…' : esc(st.server);
    pane.innerHTML = `<div class="pab-wal"><span>Your ${esc(CURRENCY.name)}</span><span class="pab-big">${st.joined ? pm(st.balance) : '—'}</span><span class="small" style="margin:0">${st.joined ? srv : 'You are not in the side economy.'}</span></div>
      ${st.joined ? `<div class="pab-row"><b>Desk shift: spot the edited entry</b><div class="small" style="margin:2px 0">Pays ${q.ok ? pm(q.amount) : '—'} · wages shrink each shift (${F.base}, ${Math.floor(F.base * F.decay)}, ${Math.floor(F.base * F.decay ** 2)}…), ${Math.round(F.cooldownMs / 60e3)} min cooldown, max ${pm(F.dailyCap)} a day.</div><div id="pab-shift">${q.ok ? '<button class="btn pab-btn" data-shift>Start a shift</button>' : `<span class="small">${q.reason === 'cooldown' ? 'Next shift in ' + mins(q.waitMs) : 'Daily cap reached: back tomorrow'}</span>`}</div></div>` : ''}
      <div class="row" style="justify-content:flex-start;gap:6px;flex-wrap:wrap;margin-top:6px">${st.joined ? '<button class="btn ghost pab-btn" data-leave>Leave the side economy</button>' : '<button class="btn green pab-btn" data-join>Join the side economy</button>'}</div>
      ${st.note ? `<div class="small">${esc(st.note)}</div>` : ''}
      <div class="small">${esc(CURRENCY.name)} are sim-only: wages, fines, bail and fees inside the simulation. One-way: never Bones, never $KIBBLE, never prizes, never cashed out, never tied to a crypto wallet. Joining is optional and you can leave any time; nothing in the sim fines or holds you in this phase.</div>`;
    const j = pane.querySelector('[data-join]'), l = pane.querySelector('[data-leave]'), sh = pane.querySelector('[data-shift]');
    if (j) j.onclick = () => { w.join(); mine(); wallet(); syncNow(() => { mine(); wallet(); }); };
    if (l) l.onclick = () => { w.leave(); mine(); wallet(); syncNow(() => { mine(); wallet(); }); };
    if (sh) sh.onclick = () => shift(pane.querySelector('#pab-shift'));
  }
  function shift(el) { // five log rows; one was edited after hashing. Its stored hash no longer matches the recomputed one.
    const rows = demoLog().log.entries().slice(-6, -1).map((e) => ({ ...e })), r = new Uint8Array(1); globalThis.crypto.getRandomValues(r); const bad = r[0] % rows.length;
    rows[bad] = { ...rows[bad], value: { ...rows[bad].value, amount: rows[bad].value.amount + 7 } };
    el.innerHTML = `<table><tr><th>#</th><th>action</th><th>target</th><th>${esc(CURRENCY.short)}</th><th>stored</th><th>recomputed</th></tr>${rows.map((e, i) => `<tr class="pab-pick" data-i="${i}"><td>${e.seq}</td><td>${esc(e.action)}</td><td>${esc(e.target.replace('sim:', ''))}</td><td>${e.value.amount || ''}</td><td><code>${e.hash.slice(0, 6)}</code></td><td><code>${hashOf(e).slice(0, 6)}</code></td></tr>`).join('')}</table><div class="small" style="margin:2px 0">Tap the row whose two hashes differ.</div>`;
    el.querySelectorAll('[data-i]').forEach((tr) => tr.onclick = () => { if (+tr.dataset.i !== bad) { tr.style.opacity = '.4'; return; }
      try { const e = pawWallet().payWage('desk shift'); el.innerHTML = `<span class="pab-ok">Caught it! +${pm(e.value.amount)}</span>`; } catch (x) { el.innerHTML = `<span class="small">${esc(x.message)}</span>`; }
      mine(); syncNow(() => { mine(); if (cur === 'wallet') wallet(); }); setTimeout(() => { if (cur === 'wallet') wallet(); }, 1400); }); }
  function team() {
    pane.innerHTML = `<div class="pab-grid">${WATCHDOGS.map((m, i) => `<div class="pab-card"><span data-por="${i}"></span><b>${esc(m.name)}</b><div>${esc(m.title)}</div><div class="small" style="margin:2px 0">Checks ${m.owns.join(', ')}</div><div style="font-size:10px;color:#d8d2bc">"${esc(m.line)}"</div></div>`).join('')}</div>
      <div class="small">Find them at the violet desk west of the President's Office. They read every group's actions but cannot be investigated, tried or bribed by sim agents.</div>`;
    pane.querySelectorAll('[data-por]').forEach((el) => el.appendChild(portrait(WATCHDOGS[+el.dataset.por], deps)));
  }
  function logTab() {
    const s = demoLog(), rows = s.log.entries(); let view = rows, note = '';
    const draw = () => { const v = verifyChain(view);
      pane.innerHTML = `<div class="pab-chips"><span class="pab-chip">Entries <b>${view.length}</b></span><span class="pab-chip">Head <code>${esc(s.log.head().slice(0, 12))}…</code></span><span class="pab-chip">Chain <b class="${v.ok ? 'pab-ok' : 'pab-bad'}">${v.ok ? 'verified' : 'BROKEN at #' + v.at + ': ' + esc(v.reason)}</b></span></div>
        <div class="pab-list"><table><tr><th>#</th><th>actor</th><th>group</th><th>action</th><th>target</th><th>${esc(CURRENCY.short)}</th><th>hash</th></tr>${view.map((e) => `<tr><td>${e.seq}</td><td>${esc(e.actor.replace('sim:', ''))}</td><td>${esc(e.group)}</td><td>${esc(e.action)}</td><td>${esc(e.target.replace('sim:', ''))}</td><td>${e.value.amount || ''}</td><td><code>${esc(e.hash.slice(0, 8))}</code></td></tr>`).join('')}</table></div>
        <div class="row" style="justify-content:flex-start;gap:6px;flex-wrap:wrap;margin-top:6px"><button class="btn ghost tiny" data-t="edit">Red-Team: edit a fine</button><button class="btn ghost tiny" data-t="swap">Red-Team: swap two entries</button><button class="btn ghost tiny" data-t="reset">Restore</button></div>
        <div class="small">${esc(note || 'A sandbox day with sim pups only (no real players). Every action is chained to the one before it; balances are replayed from this log.')}</div>`;
      pane.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => { const k = b.dataset.t;
        if (k === 'reset') { view = rows; note = ''; } else if (k === 'edit') { view = rows.map((e) => e.action === 'pm.sink' ? { ...e, value: { ...e.value, amount: 0 } } : e); note = 'Ziggy zeroed the parking fine. The hash no longer matches, so the chain breaks right there.'; }
        else { view = rows.slice(); [view[8], view[9]] = [view[9], view[8]]; note = 'Ziggy swapped two entries. The sequence and prev links no longer line up.'; } draw(); }); };
    draw();
  }
  show(tab);
}
