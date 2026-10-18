// Paw Audit Bureau desk panel: the audit report (ranked findings + the 12 checks), the Watchdogs roster and a live,
// hash-chained action-log demo the Red-Team Pup can try to tamper with. Opened from the Bureau desk (main.js hook).
import { buildReport, SEVERITY } from './report.js';
import { STATIC } from './audit-static.js';
import { sandbox } from './checks.js';
import { verifyChain } from './ledger.js';
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
.pab .pab-card canvas{width:64px;height:72px;display:block;margin:0 auto;image-rendering:pixelated}.pab .pab-card b{color:var(--s)}.pab table{width:100%;border-collapse:collapse;font-size:10px}.pab td,.pab th{padding:2px 4px;border-bottom:1px solid #2a3360;text-align:left}
@media (max-height:420px){.pab .pab-list,.pab .pab-grid{max-height:calc(100vh - 150px)}.pab .pab-head canvas{width:28px;height:28px}.pab h2{font-size:15px}.pab .pab-sub{display:none}}`;
function badgeCanvas(px = 40) { const cv = document.createElement('canvas'); cv.width = cv.height = px; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; drawBadge(x, px / 2, px / 2, px / 10); return cv; }
function portrait(m, deps) { const cv = document.createElement('canvas'); cv.width = 128; cv.height = 144; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  try { drawMember(x, m, { x: 64, y: 118, face: 'down', moving: false, phase: 0 }, deps, { scale: 2 }); } catch {} return cv; }
// a short scripted day in the Red-Team sandbox, so the log has something real to show
function demoLog() { const s = sandbox(); s.act(ISSUER, 'pm.issue', 'sim:cop-rex', { amount: 40, data: { why: 'shift wage' } }); s.act('sim:cop-rex', 'pm.pay', 'sim:pup-miso', { amount: 12, data: { why: 'coffee run' } });
  s.act('sim:pup-miso', 'pm.sink', SINK, { amount: 3, data: { why: 'parking fine' } }); s.act('sim:judge-oaks', 'evidence.file', 'sim:pup-kiki', { data: { key: 'demo-1', item: 'muddy paw print' } });
  s.act(WATCHDOGS[5].id, 'audit.read', 'sim:cop-rex'); try { s.act('sim:cop-rex', 'pm.pay', WATCHDOGS[6].id, { amount: 5 }); } catch (e) { s.act(WATCHDOGS[6].id, 'audit.note', 'sim:cop-rex', { data: { blocked: e.kind } }); } return s; }

export function renderBureau(body, deps, { tab = 'report' } = {}) {
  if (!document.getElementById('pab-style')) { const st = document.createElement('style'); st.id = 'pab-style'; st.textContent = CSS; document.head.appendChild(st); }
  const report = buildReport(STATIC), chief = report.signedBy, S = report.summary;
  body.innerHTML = `<div class="pab"><div class="pab-head"><span id="pab-badge"></span><div><h2>Paw Audit Bureau</h2><div class="pab-sub">"The Watchdogs" · independent auditors · no wallet, no balance, no income · reports go to Zachary Nagle, signed by ${esc(chief.title)} ${esc(chief.name)}</div></div></div>
    <div class="pab-tabs">${[['report', 'Audit report'], ['team', 'The Watchdogs'], ['log', 'Action log']].map(([k, l]) => `<button class="btn ghost ${k === tab ? 'on' : ''}" data-pab="${k}">${l}</button>`).join('')}</div><div id="pab-body"></div></div>`;
  body.querySelector('#pab-badge').appendChild(badgeCanvas(40));
  const pane = body.querySelector('#pab-body');
  const show = (k) => { body.querySelectorAll('[data-pab]').forEach((b) => b.classList.toggle('on', b.dataset.pab === k)); (k === 'team' ? team : k === 'log' ? logTab : rep)(); };
  body.querySelectorAll('[data-pab]').forEach((b) => b.onclick = () => show(b.dataset.pab));
  function rep() {
    pane.innerHTML = `<div class="pab-chips"><span class="pab-chip">Checks <b class="${S.checks.fail ? 'pab-bad' : 'pab-ok'}">${S.checks.pass}/12 pass</b></span>${SEVERITY.map((s) => `<span class="pab-chip"><span class="pab-sev" style="background:${SEV_COL[s]}">${s}</span>${S.findings[s]}</span>`).join('')}<span class="pab-chip" id="pab-live">Server copy: checking…</span></div>
      <div class="pab-list"><div class="small" style="margin:0">Findings, most severe first</div>${report.findings.map((f) => `<div class="pab-row" style="border-color:${SEV_COL[f.severity]}"><details><summary><span class="pab-sev" style="background:${SEV_COL[f.severity]}">${f.severity}</span><b>${esc(f.title)}</b> <span class="small">· ${esc(f.id)} · check ${f.check} · ${esc(f.status)}</span></summary>
        <p>${esc(f.detail || '')}</p><p><b>Repro:</b></p><ol>${f.repro.map((r) => `<li>${esc(r)}</li>`).join('')}</ol><p><b>Fix:</b> ${esc(f.fix)}</p></details></div>`).join('')}
      <div class="small" style="margin:6px 0 0">The 12 checks</div>${report.checks.map((c) => `<div class="pab-row"><details><summary><b class="${c.status === 'pass' ? 'pab-ok' : 'pab-bad'}">${c.status === 'pass' ? 'PASS' : 'FAIL'}</b> ${c.n}. ${esc(c.name)} <span class="small">· ${esc(c.scope)} · ${esc(c.owner)}</span></summary><ul>${c.evidence.map((e) => `<li>${esc(e)}</li>`).join('')}</ul></details></div>`).join('')}
      <div class="small">Side currency: <b>${esc(PAWMARK.name)}</b>, earned and spent only in the sim. One-way: never Bones, never $KIBBLE, never cashed out, never tied to a wallet. JSON: <a href="/api/sim-audit" target="_blank" rel="noopener">/api/sim-audit</a></div></div>`;
    guardedFetch('/api/sim-audit').then((r) => r.ok ? r.json() : Promise.reject(r.status)).then((j) => { const el = pane.querySelector('#pab-live'); if (el) el.innerHTML = `Server copy: <b class="${j.summary.checks.fail ? 'pab-bad' : 'pab-ok'}">${j.summary.checks.pass}/12</b>`; })
      .catch(() => { const el = pane.querySelector('#pab-live'); if (el) el.textContent = 'Server copy: offline (local report shown)'; });
  }
  function team() {
    pane.innerHTML = `<div class="pab-grid">${WATCHDOGS.map((m, i) => `<div class="pab-card"><span data-por="${i}"></span><b>${esc(m.name)}</b><div>${esc(m.title)}</div><div class="small" style="margin:2px 0">Checks ${m.owns.join(', ')}</div><div style="font-size:10px;color:#d8d2bc">"${esc(m.line)}"</div></div>`).join('')}</div>
      <div class="small">Find them at the violet desk west of the President's Office. They read every group's actions but cannot be investigated, tried or bribed by sim agents.</div>`;
    pane.querySelectorAll('[data-por]').forEach((el) => el.appendChild(portrait(WATCHDOGS[+el.dataset.por], deps)));
  }
  function logTab() {
    const s = demoLog(), rows = s.log.entries(); let view = rows, note = '';
    const draw = () => { const v = verifyChain(view);
      pane.innerHTML = `<div class="pab-chips"><span class="pab-chip">Entries <b>${view.length}</b></span><span class="pab-chip">Head <code>${esc(s.log.head().slice(0, 12))}…</code></span><span class="pab-chip">Chain <b class="${v.ok ? 'pab-ok' : 'pab-bad'}">${v.ok ? 'verified' : 'BROKEN at #' + v.at + ': ' + esc(v.reason)}</b></span></div>
        <div class="pab-list"><table><tr><th>#</th><th>actor</th><th>group</th><th>action</th><th>target</th><th>PM</th><th>hash</th></tr>${view.map((e) => `<tr><td>${e.seq}</td><td>${esc(e.actor.replace('sim:', ''))}</td><td>${esc(e.group)}</td><td>${esc(e.action)}</td><td>${esc(e.target.replace('sim:', ''))}</td><td>${e.value.amount || ''}</td><td><code>${esc(e.hash.slice(0, 8))}</code></td></tr>`).join('')}</table></div>
        <div class="row" style="justify-content:flex-start;gap:6px;flex-wrap:wrap;margin-top:6px"><button class="btn ghost tiny" data-t="edit">Red-Team: edit a fine</button><button class="btn ghost tiny" data-t="swap">Red-Team: swap two entries</button><button class="btn ghost tiny" data-t="reset">Restore</button></div>
        <div class="small">${esc(note || 'A sandbox day with sim pups only (no real players). Every action is chained to the one before it; balances are replayed from this log.')}</div>`;
      pane.querySelectorAll('[data-t]').forEach((b) => b.onclick = () => { const k = b.dataset.t;
        if (k === 'reset') { view = rows; note = ''; } else if (k === 'edit') { view = rows.map((e) => e.action === 'pm.sink' ? { ...e, value: { ...e.value, amount: 0 } } : e); note = 'Ziggy zeroed the parking fine. The hash no longer matches, so the chain breaks right there.'; }
        else { view = rows.slice(); [view[8], view[9]] = [view[9], view[8]]; note = 'Ziggy swapped two entries. The sequence and prev links no longer line up.'; } draw(); }); };
    draw();
  }
  show(tab);
}
