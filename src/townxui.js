// Place cards for the town economy extras (preview). One card per place: work a shift, shop, challenge, civic help.
// Bones here are in-game play money only (never real earnings, never $KIBBLE).
import { PLACES } from './townx.js';
import { ZJ, ZJOBS, ensureTownx, rankOf, capLeft } from './zonejobs.js';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export const TOWNX_CSS = `.tx-card h2{margin:0 0 6px;font-size:16px}.tx-card h2 small{font-size:9px;color:#f2cc68;border:1px solid #f2cc68;padding:1px 4px;margin-left:6px;vertical-align:middle}
.tx-card p{margin:6px 0;line-height:1.45;font-size:12px}.tx-sec{border:2px solid #3a4680;background:#141a36;padding:8px;margin:8px 0}.tx-sec h3{margin:0 0 4px;font-size:12px;color:#f2cc68}
.tx-btn{min-height:44px;font:11px Silkscreen,monospace;background:#d4a640;color:#141a2e;border:2px solid #f2cc68;padding:6px 10px;cursor:pointer;margin:4px 4px 0 0}.tx-btn.alt{background:#1a2244;color:#f6e7b8;border-color:#3a4680}.tx-btn[disabled]{opacity:.5;cursor:default}
.tx-row{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:11px;padding:3px 0;border-bottom:1px dashed #2a3058}.tx-row:last-child{border-bottom:0}
.tx-note{font-size:10px;color:#9fb0d8}.tx-tag{display:inline-block;font-size:9px;padding:1px 5px;border:1px solid #7fd1b9;color:#7fd1b9;margin-left:4px}
.tx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px}.tx-bar{display:block;height:8px;background:#2a3058;border:1px solid #141a2e}.tx-bar i{display:block;height:100%;background:#7fd1b9}`;
export const bar = (k, col) => `<span class="tx-bar"><i style="width:${Math.round(Math.max(0, Math.min(1, k)) * 100)}%${col ? `;background:${col}` : ''}"></i></span>`;

export function jobSection(state, jobId, day) {
  const job = ZJOBS[jobId], X = ensureTownx(state), J = X.jobs[jobId], rk = rankOf(J.hits), left = capLeft(state, day);
  return `<div class="tx-sec" data-tx-sec="job"><h3>Work a shift: ${esc(job.name)}</h3>
    <p>${esc(job.how)}. Each hit pays 1 Bone x your multiplier, then the multiplier doubles (up to ${ZJ.MULT_CAP}x). A miss drops it back to 1x. The zone shrinks and speeds up every tap. A dead-centre hit adds +${ZJ.PERFECT_BONUS}.</p>
    <div class="tx-row"><span>Rank</span><b>${esc(rk.title)}${rk.next ? ` · ${J.hits}/${rk.next.at} hits to ${esc(rk.next.title)}` : ' · top rank'}</b></div>
    <div class="tx-row"><span>Personal best</span><b>${J.best} · top x${J.bestMult}</b></div>
    <div class="tx-row"><span>Job Bones today</span><b>${ZJ.DAILY_CAP - left}/${ZJ.DAILY_CAP}</b></div>
    <p class="tx-note">${ZJ.SHIFT_ZONES} taps a shift, up to ${ZJ.SHIFT_CAP} Bones a shift and ${ZJ.DAILY_CAP} job Bones a day. Every hit also makes ${esc(job.good)} for the town. Bones are in-game only.</p>
    <button type="button" class="tx-btn" data-tx-job="${esc(jobId)}">${left > 0 ? 'Start shift' : 'Practice shift (cap reached)'}</button></div>`;
}

// opts: { state, place, day, skyDay, startJob(id), toast, reopen(o), sections: { [key]: fn } } -> extra sections from later features
export function renderPlace(body, opts) {
  const p = PLACES[opts.place]; if (!p) { body.innerHTML = '<p>Nothing here.</p>'; return; }
  let html = `<div class="tx-card" data-tx-place="${esc(p.id)}"><h2>${esc(p.name)} <small>PREVIEW</small></h2>`;
  for (const fn of opts.before || []) html += fn(p) || '';
  if (p.job) html += jobSection(opts.state, p.job, opts.day);
  for (const fn of opts.after || []) html += fn(p) || '';
  html += '</div>';
  body.innerHTML = html;
  body.onclick = (e) => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.txJob) return opts.startJob(b.dataset.txJob);
    opts.onButton?.(b, p); };
}
