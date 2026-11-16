// Town Exchange boards (preview): the walk-in economy building's walls. Production / stock / shortages, the delivery
// route map, most wanted items, the Town Hall needs board, and NPC spending + shop friendships. Read-only views.
import { GRID, lotById, PROPOSAL_W, PROPOSAL_H } from './townproposal.js';
import { bar } from './townxui.js';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export const EX_TABS = Object.freeze([['production', 'Stock'], ['routes', 'Routes'], ['wanted', 'Wanted'], ['needs', 'Hall'], ['spending', 'Spend']]);
const TILE_COL = { 0: '#5a9a4a', 1: '#6a6a74', 2: '#c8b890', 3: '#8a6a5a', 4: '#3a7ab8', 5: '#3a6a2a', 8: '#d8c8a0', 11: '#7a7a5a', 12: '#8a6a4a', 13: '#7a8a5a', 14: '#e8d8a0', 15: '#c8b890' };
const GOOD_COL = { planks: '#e8b080', ore: '#c8a040', bars: '#c9cede', wheat: '#f2d060', fish: '#8ac8ff', stone: '#b8bcc4', cargo: '#c8905a', fruit: '#ff6a6a', honey: '#ffc83a', milk: '#ffffff', pots: '#e08a68', chairs: '#a8703a', wool: '#f4f0e8', tea: '#9ae070', candles: '#fff0a0', letters: '#ffd0e0', papers: '#d8d8f0' };

export function renderExchange(body, o) {
  const tab = o.tab || 'production';
  let html = `<div class="tx-card" data-tx-exchange="${esc(tab)}"><h2>Town Exchange <small>PREVIEW</small></h2>
    <p class="tx-note">Town time ${fmtH(o.led.hour)} · sky day ${o.skyDay}. Goods are in-game; Bones are in-game only.</p>
    <div class="lt-tabs" role="tablist">${EX_TABS.map(([k, n]) => `<button type="button" data-ex-tab="${k}" class="${k === tab ? 'on' : ''}">${n}</button>`).join('')}</div>`;
  if (tab === 'production') {
    html += `<div class="tx-sec"><h3>Made · used · in stock today</h3>${o.led.shortages.length ? `<p class="tx-greet">Short: ${o.led.shortages.map((g) => esc(g)).join(', ')} · restock ordered</p>` : '<p class="tx-note">No shortages right now.</p>'}`;
    for (const r of o.led.rows) html += `<div class="tx-row" data-ex-good="${r.good}"><span><b>${esc(r.name)}</b><br><span class="tx-note">${esc(r.from)} → ${esc(r.to)}</span></span><span>${r.made} made · ${r.used} used · <b>${r.stock}</b> left${r.wanted ? ` · ${r.wanted} wanted` : ''}${r.short ? ' <span class="tx-tag" style="border-color:#ff8a7a;color:#ff8a7a">SHORT</span>' : ''}</span></div>`;
    html += '</div>';
  } else if (tab === 'routes') {
    html += `<div class="tx-sec"><h3>Delivery routes today</h3><canvas id="ex-map" width="${PROPOSAL_W * 3}" height="${PROPOSAL_H * 3}" style="width:100%;image-rendering:pixelated;border:2px solid #3a4680;background:#142"></canvas>`;
    for (const d of o.routes.slice(0, 14)) html += `<div class="tx-row"><span><i style="display:inline-block;width:10px;height:10px;background:${GOOD_COL[d.good] || '#fff'};border:1px solid #141a2e"></i> ${esc(d.good)}</span><span>${esc(lotById(d.fromLot)?.name || d.from)} → ${esc(lotById(d.to)?.name || d.to)} · ${d.n} trip${d.n === 1 ? '' : 's'}</span></div>`;
    html += '</div>';
  } else if (tab === 'wanted') {
    html += `<div class="tx-sec"><h3>Most wanted items</h3>`;
    if (!o.wanted.length) html += '<p class="tx-note">Nobody is eyeing anything yet today.</p>';
    for (const w of o.wanted) html += `<div class="tx-row" data-ex-want="${esc(w.item)}"><span><b>${esc(w.name)}</b> · ${esc(w.shop)}</span><span>${w.count} want it${w.who.length ? ` · ${esc(w.who.slice(0, 3).join(', '))}` : ''}</span></div>`;
    html += '</div>';
  } else if (tab === 'needs') {
    const n = o.need; html += `<div class="tx-sec" data-ex-need="${esc(n.id)}"><h3>Town Hall needs today</h3><p><b>${esc(n.title)}</b></p>${bar(n.have / n.n, n.complete ? '#7af07a' : '#f2cc68')}
      <div class="tx-row"><span>From the crews</span><b>${n.crew}</b></div><div class="tx-row"><span>From your shifts</span><b>${n.you}</b></div><div class="tx-row"><span>Still needed</span><b>${n.left}</b></div>
      <p class="tx-greet">${n.complete ? esc(n.done) : `Work a ${esc(JOB_FOR[n.good] || 'job')} shift to chip in.`}</p></div>`;
  } else {
    html += `<div class="tx-sec"><h3>What workers spend Bones on</h3><p class="tx-note">Wages, lunch, home and upgrades today. In-game Bones only; nobody is earning real money.</p>`;
    if (!o.spending.length) html += '<p class="tx-note">Spending shows up once the workers are paid.</p>';
    for (const p of o.spending) html += `<div class="tx-row" data-ex-spend="${esc(p.id)}"><span><b>${esc(p.name)}</b><br><span class="tx-note">${esc(p.note || '')}</span></span><span>food ${p.food} · home ${p.home} · upgrades ${p.upgrades} · saved ${p.savings}</span></div>`;
    html += `</div><div class="tx-sec"><h3>Your shop friends</h3>`;
    for (const s of o.shops) html += `<div class="tx-row"><span>${esc(s.owner)} · ${esc(s.shop)}</span><span>${esc(s.tier)}${s.off ? ` · ${s.off}% off` : ''} · ${s.buys} buys</span></div>`;
    html += '</div>';
  }
  body.innerHTML = html + '</div>';
  body.onclick = (e) => { const b = e.target.closest('button[data-ex-tab]'); if (b) o.reopen({ tab: b.dataset.exTab }); };
  if (tab === 'routes') drawRouteMap(body.querySelector('#ex-map'), o.routes);
}
const JOB_FOR = { planks: 'Sawmill', stone: 'Quarry', tools: 'Forge', bread: 'Bakery', fish: 'Fishery', ore: 'Mine', wheat: 'Farm' };
const fmtH = (h) => `${String(Math.floor(h)).padStart(2, '0')}:${String(Math.floor((h % 1) * 60)).padStart(2, '0')}`;
function drawRouteMap(cv, routes) {
  if (!cv || !cv.getContext) return; const c = cv.getContext('2d'), k = 3;
  for (let y = 0; y < PROPOSAL_H; y++) for (let x = 0; x < PROPOSAL_W; x++) { c.fillStyle = TILE_COL[GRID[y][x]] || '#5a9a4a'; c.fillRect(x * k, y * k, k, k); }
  const ctr = (id) => { const l = lotById(id); return l ? [(l.x + l.w / 2) * k, (l.y + l.h / 2) * k] : null; };
  const seen = new Set();
  for (const d of routes) { const a = ctr(d.fromLot), b = ctr(d.to); if (!a || !b) continue; c.strokeStyle = '#141a2e'; c.lineWidth = 4; c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke(); c.strokeStyle = GOOD_COL[d.good] || '#fff'; c.lineWidth = 2; c.beginPath(); c.moveTo(...a); c.lineTo(...b); c.stroke();
    for (const [p, id] of [[a, d.fromLot], [b, d.to]]) if (!seen.has(id)) { seen.add(id); c.fillStyle = '#141a2e'; c.fillRect(p[0] - 4, p[1] - 4, 8, 8); c.fillStyle = '#f2cc68'; c.fillRect(p[0] - 3, p[1] - 3, 6, 6); } }
}
