// Daily Quests, browser side: the plaza quest board prop, the lost-item sparkle, the HUD tracker chip and the quests panel.
// Rules + the daily pick live in src/quests.js. Perf: two culled props of plain fillRects, no particles. Never $KIBBLE.
import * as Q from './quests.js';
import { KIBBLE_PLAZA } from './world.js';

const TILE = 32;
export const BOARD = KIBBLE_PLAZA.quests; // Kibble Plaza tile (solid, like the news stand); stand on the tile below to read it
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
const inV = (x, y, v, m = 80) => !v || (x > v.x0 - m && x < v.x1 + m && y > v.y0 - m && y < v.y1 + m * 2);

// depth-sorted props: the board (3 paper notes, ticked when done) and today's lost item (until found)
export function props(view, time, { list = [], Qs = null, lost = null, rm = false } = {}) { const out = [], bx = BOARD.x * TILE + 16, by = BOARD.y * TILE + 30;
  if (inV(bx, by, view)) out.push({ y: by, d: (c) => drawBoard(c, bx, by, list.map((q) => !!Qs && Q.isDone(Qs, q))) });
  if (lost && inV(lost.x, lost.y, view)) out.push({ y: lost.y, d: (c) => drawLost(c, lost.x, lost.y, time, rm) });
  return out; }
function drawBoard(c, x, y, done) { R(c, x - 22, y - 4, 44, 4, '#0003'); R(c, x - 20, y - 46, 4, 46, '#4e2e18'); R(c, x + 16, y - 46, 4, 46, '#4e2e18');
  R(c, x - 24, y - 50, 48, 30, '#7a4a26'); R(c, x - 22, y - 48, 44, 26, '#a8743e'); R(c, x - 26, y - 54, 52, 6, '#4e2e18'); R(c, x - 24, y - 53, 48, 2, '#f2cc68');
  for (let i = 0; i < 3; i++) { const px = x - 19 + i * 14, py = y - 45 + (i % 2) * 2; R(c, px, py, 11, 14, done[i] ? '#cfe8c0' : '#fff3d6'); R(c, px + 4, py - 1, 3, 2, '#d94a4a');
    for (let k = 0; k < 3; k++) R(c, px + 2, py + 4 + k * 3, 7, 1, '#8a7a5a'); if (done[i]) { R(c, px + 3, py + 9, 2, 2, '#2f8a3a'); R(c, px + 5, py + 7, 4, 2, '#2f8a3a'); } }
  R(c, x - 14, y - 18, 28, 7, '#121a36'); c.fillStyle = '#f2cc68'; c.font = '6px Silkscreen, monospace'; c.textAlign = 'center'; c.fillText('QUESTS', x, y - 12.5); c.textAlign = 'left'; }
function drawLost(c, x, y, time, rm) { const b = rm ? 0 : Math.sin(time * 3) * 1.5; R(c, x - 6, y - 1, 12, 3, '#0003');
  R(c, x - 5, y - 10 + b, 10, 9, '#e2463c'); R(c, x - 4, y - 11 + b, 8, 11, '#e2463c'); R(c, x - 3, y - 9 + b, 3, 3, '#fff8'); R(c, x - 5, y - 6 + b, 10, 1, '#fff3d6');
  if (!rm) { const a = (time * 2) % 1; c.globalAlpha = 1 - a; R(c, x + 6, y - 18 - a * 6, 2, 2, '#f2cc68'); R(c, x - 9, y - 14 - a * 4, 2, 2, '#f2cc68'); c.globalAlpha = 1; } }

// ---- HUD tracker chip (after the event chip in the clock row); a span with role=button, not an extra HUD button ----
const CSS = `#dq-chip{display:inline-flex;align-items:center;gap:4px;cursor:pointer;font:inherit}#dq-chip canvas{width:12px;height:12px;image-rendering:pixelated}
#dq-chip b{font-weight:normal;letter-spacing:.5px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}#dq-chip.all{color:#9fe0a0}@media (max-height:430px){#dq-chip b{display:none}}
.dqp h3{margin:0 0 4px}.dqp .dqc{border:2px solid #8a6a2a;padding:5px 8px;margin:6px 0;background:#0c1022aa;display:flex;gap:8px;align-items:center}.dqp .dqc.on{border-color:#f2cc68}.dqp .dqc.ok{border-color:#4aa86a;opacity:.8}
.dqp .dqc .tx{flex:1;min-width:0}.dqp .dqc small{opacity:.75}.dqp .bar{height:5px;background:#2a2f4a;margin:3px 0 0}.dqp .bar i{display:block;height:100%;background:#f2cc68}.dqp .stk{display:flex;flex-wrap:wrap;gap:6px;margin:4px 0}.dqp .stk span{border:2px solid #8a6a2a;padding:2px 5px}.dqp .stk span.no{opacity:.35}`;
function icon(g) { const P = (x, y, w, h, col) => { g.fillStyle = col; g.fillRect(x, y, w, h); }; g.clearRect(0, 0, 12, 12); P(2, 1, 8, 10, '#fff3d6'); P(1, 1, 10, 2, '#a8743e'); P(1, 9, 10, 2, '#a8743e'); P(3, 4, 6, 1, '#121a36'); P(3, 6, 5, 1, '#121a36'); P(5, 0, 2, 2, '#d94a4a'); }
export function ensureChip(doc, onClick) { if (!doc.getElementById('dq-css')) { const st = doc.createElement('style'); st.id = 'dq-css'; st.textContent = CSS; doc.head.appendChild(st); }
  let el = doc.getElementById('dq-chip'); if (el) return el; const after = doc.getElementById('ev-chip') || doc.getElementById('clock'); if (!after) return null;
  el = doc.createElement('span'); el.id = 'dq-chip'; el.className = 'chip'; el.setAttribute('role', 'button'); el.tabIndex = 0;
  el.addEventListener('click', (e) => { e.stopPropagation(); onClick?.(); }); el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onClick?.(); } }); after.after(el); return el; }
export function updateChip(el, list, Qs) { if (!el || !Qs) return; let cv = el.querySelector('canvas'), b = el.querySelector('b'), n = el.querySelector('i');
  if (!cv || !b || !n) { el.textContent = ''; cv = el.ownerDocument.createElement('canvas'); cv.width = 12; cv.height = 12; cv.setAttribute('aria-hidden', 'true'); b = el.ownerDocument.createElement('b'); n = el.ownerDocument.createElement('i'); n.style.fontStyle = 'normal'; el.append(cv, b, n); el._k = null; const g = cv.getContext('2d'); if (g) icon(g); }
  const done = list.filter((q) => Q.isDone(Qs, q)).length, tq = list[Qs.track] && !Q.isDone(Qs, list[Qs.track]) ? list[Qs.track] : list.find((q) => !Q.isDone(Qs, q)), k = done + '|' + (tq?.id || '') + '|' + (tq ? Q.progOf(Qs, tq) : '');
  if (el._k === k) return; el._k = k; n.textContent = `${done}/${list.length}`; b.textContent = tq ? shortOf(tq, Qs) : 'ALL DONE'; el.classList.toggle('all', done === list.length);
  el.title = tq ? `Daily quest: ${tq.text} (${Q.progOf(Qs, tq)}/${tq.n}). Tap for the quest board` : 'All of today\'s quests done! Tap for the quest board'; el.setAttribute('aria-label', `Daily quests ${done} of ${list.length} done`); }
export function shortOf(q, Qs) { const p = Qs ? Q.progOf(Qs, q) : 0;
  return q.kind === 'deliver' ? `TO ${q.to.toUpperCase()}` : q.kind === 'find' ? `FIND ${q.item.toUpperCase()}` : q.kind === 'fish' ? `FISH ${p}/${q.n}` : q.kind === 'visit' ? 'VISIT ' + (Q.VISIT_PLACES[q.place] || '').replace(/^the /, '').toUpperCase() : q.kind === 'greet' ? `SAY HI ${p}/${q.n}` : Q.EVENT_TIE[q.ev]?.short || 'EVENT'; }
const esc = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
// quests panel html. Buttons carry data-dq attributes (focusable for the gamepad focus manager).
export function panelHtml(s, day, list, { hint = () => '' } = {}) { const Qs = Q.ensure(s, day), sm = Q.summary(s, day, list);
  let h = `<div class="dqp"><h3>Daily Quests</h3><p><small>3 quests a day from the townsfolk, the same for everyone (Sydney date ${esc(day)}). Rewards are free Bones only: up to ${Q.QUEST_DAILY_CAP} a day, never KIBBLE, nothing to pay. Finish the whole board on a sticker day for a free sticker.</small></p>`;
  list.forEach((q, i) => { const done = Q.isDone(Qs, q), p = Q.progOf(Qs, q), on = Qs.track === i && !done;
    h += `<div class="dqc${done ? ' ok' : on ? ' on' : ''}"><div class="tx"><b>${esc(q.text)}</b><br><small>${done ? 'Done!' : esc(hint(q) || '')} · ${q.reward} Bones</small>${q.n > 1 ? `<div class="bar"><i style="width:${Math.round(100 * p / q.n)}%"></i></div>` : ''}</div>`;
    h += done ? '<small>✓</small>' : `<button class="btn ${on ? 'ghost' : 'alt'}" data-dq="track:${on ? -1 : i}">${on ? 'Tracking' : 'Track'}</button>`; h += '</div>'; });
  h += `<p><small>Bones from quests today: <b>${sm.paid}/${sm.cap}</b>${sm.paid >= sm.cap ? ' (daily cap reached)' : ''} · ${sm.done}/${sm.of} done${Q.stickerDay(day) ? ' · today is a sticker day' : ''}</small></p>`;
  h += '<h3>Stickers</h3><div class="stk">' + Q.STICKERS.map((st) => `<span class="${sm.stickers.includes(st.id) ? '' : 'no'}" title="${esc(st.name)}">${st.icon} ${esc(st.name)}</span>`).join('') + '</div>';
  h += `<small>Full boards: ${sm.full}${sm.full >= Q.HELPER_AT ? ' · Town Helper badge ' + Q.HELPER_BADGE : ` · Town Helper badge at ${Q.HELPER_AT}`}</small>`;
  return h + '</div>'; }
