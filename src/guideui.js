// Onboarding tour + wayfinding UI: tour card with an NPC aide, Places list, full map, guide arrow/path, edge arrows.
// DOM overlays never cover the touch stick / A-B buttons; the world drawing is done by the main render via drawWorld/drawScreen.
import * as GD from './guide.js';
import { TILE, MAP_W, MAP_H, isSolid } from './world.js';
import { drawShiba, artKey } from './art.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };

// h: { state(), mode(), cam, toast(msg, kind), walk(path), stopWalk(), persist(), saveProfile(), wallet(), miniBase(), panelOpen() }
export function createGuide(h) {
  const G = { tour: null, guide: null, mapOpen: false, placesOpen: false, path: null, pathT: 0 };
  // ---------- DOM ----------
  const way = el(`<div id="wayctl"><button class="btn alt" id="w-guide" title="Replay the tour">Guide</button><button class="btn alt" id="w-places" title="Find a place (L)">Places</button><button class="btn alt" id="w-map" title="Full map (N)">Map</button></div>`);
  const tour = el(`<div id="tour" hidden><canvas id="tour-npc" width="64" height="64"></canvas><div class="tbody"><div class="tname"></div><b class="ttitle"></b><div class="ttext"></div>
    <div class="trow"><span class="tstep"></span><span class="tsp"></span><button class="btn ghost" id="t-skip">Skip tour</button><button class="btn alt" id="t-back">Back</button><button class="btn" id="t-next">Next</button></div></div></div>`);
  const chip = el(`<div id="guidechip" hidden><b class="gname"></b><span class="gdist"></span><button class="btn green" id="g-walk">Walk me there</button><button class="btn ghost" id="g-clear" title="Stop guiding">✕</button></div>`);
  const pl = el(`<div id="places" class="overlay" hidden><div class="panel-card places-card"><button class="close" id="pl-close">×</button><h2>Places</h2><input id="pl-q" placeholder="Search: café, arcade, quest, VIP…" autocomplete="off"><div id="pl-list"></div></div></div>`);
  const mp = el(`<div id="mapfull" class="overlay" hidden><div class="map-card"><div class="map-bar"><b>Inu Verse map</b><small>Tap a place (or any path) to get directions</small><button class="close" id="mp-close">×</button></div><canvas id="mapcv"></canvas><div class="map-legend"><i class="you"></i>You are here <i class="pin"></i>Places <i class="dest"></i>Destination</div></div></div>`);
  for (const n of [way, tour, chip, pl, mp]) document.body.appendChild(n);
  const $ = (s) => document.querySelector(s);
  $('#w-guide').onclick = () => startTour(true); $('#w-places').onclick = openPlaces; $('#w-map').onclick = openMap;
  $('#t-next').onclick = () => go(1); $('#t-back').onclick = () => go(-1); $('#t-skip').onclick = () => endTour('skipped');
  $('#g-walk').onclick = walk; $('#g-clear').onclick = () => clearGuide();
  $('#pl-close').onclick = closePlaces; pl.addEventListener('click', (e) => { if (e.target === pl) closePlaces(); });
  $('#pl-q').addEventListener('input', renderPlaces);
  $('#pl-list').addEventListener('click', (e) => { const b = e.target.closest('[data-place]'); if (!b) return; const p = GD.places(h.state()).find((x) => x.id === b.dataset.place && x.kind === b.dataset.kind); if (p) { closePlaces(); setGuide(p); } });
  $('#mp-close').onclick = closeMap; mp.addEventListener('click', (e) => { if (e.target === mp) closeMap(); });
  $('#mapcv').addEventListener('click', (e) => { const r = e.target.getBoundingClientRect(), s = r.width / MAP_W, tx = (e.clientX - r.left) / s, ty = (e.clientY - r.top) / s; mapPick(tx, ty); });

  // ---------- tour ----------
  function startTour(replay = false) { if (!h.state()) return; closePlaces(); closeMap(); G.tour = { i: 0, replay }; document.body.classList.add('touring'); tour.hidden = false; showStep(); }
  function go(d) { if (!G.tour) return; const n = G.tour.i + d; if (n < 0) return; if (n >= GD.TOUR.length) return endTour('done'); G.tour.i = n; showStep(); }
  function endTour(how) { if (!G.tour) return; const replay = G.tour.replay; G.tour = null; tour.hidden = true; document.body.classList.remove('touring'); document.querySelectorAll('.tour-target').forEach((e) => e.classList.remove('tour-target'));
    GD.markTourSeen({ ls: localStorage, wallet: h.wallet(), how, state: h.state() }); h.persist(); h.saveProfile();
    const first = GD.placeById(h.state(), GD.AFTER_TOUR); if (first) setTimeout(() => setGuide(first), 600);
    if (!replay) h.toast(how === 'done' ? 'Tour done! Tap Guide any time to replay it.' : 'Tour skipped: tap Guide any time to see it.', 'good'); }
  function showStep() { const st = GD.TOUR[G.tour.i], p = GD.stepPlace(h.state(), st); G.tour.place = p;
    tour.querySelector('.tname').textContent = 'Biscuit · President\'s aide'; tour.querySelector('.ttitle').textContent = st.title; tour.querySelector('.ttext').textContent = st.text;
    tour.querySelector('.tstep').textContent = `${G.tour.i + 1} / ${GD.TOUR.length}`; $('#t-back').disabled = G.tour.i === 0; $('#t-next').textContent = G.tour.i === GD.TOUR.length - 1 ? 'Done' : 'Next';
    document.querySelectorAll('.tour-target').forEach((e) => e.classList.remove('tour-target')); if (st.target) document.querySelector(st.target)?.classList.add('tour-target'); tour.classList.toggle('hl', !!st.highlight); tour.classList.toggle('feat', !!st.featured); G.tour.hl = !!st.highlight || !!st.featured;
    document.body.dataset.tourStep = String(G.tour.i); document.body.dataset.tourPlace = p?.id || ''; }
  const npc = $('#tour-npc').getContext('2d'); let npcT = 0;
  function drawNpc(dt) { npcT += dt; npc.imageSmoothingEnabled = false; npc.clearRect(0, 0, 64, 64); try { drawShiba(npc, 32, 52, { coat: 'cream', art: artKey('cream'), face: 'down', phase: npcT * 6, moving: Math.floor(npcT * 2) % 3 === 0, scale: 1.2, shadow: false }); } catch {} }

  // ---------- guide ----------
  function setGuide(p) { G.guide = p; G.path = null; G.pathT = 0; chip.hidden = false; chip.querySelector('.gname').textContent = p.name; document.body.dataset.guide = p.id; recompute(); h.toast(`Guiding you to ${p.name}`, 'good'); }
  function clearGuide(arrivedAt) { if (!G.guide) return; const p = G.guide; G.guide = null; G.path = null; chip.hidden = true; delete document.body.dataset.guide; if (arrivedAt) { h.toast(`You've arrived: ${p.name}`, 'good'); document.body.dataset.arrived = p.id; } }
  function recompute() { const s = h.state(); if (!s || !G.guide) return; G.path = GD.guidePath(s.player.x, s.player.y, G.guide); chip.querySelector('.gdist').textContent = G.path ? GD.distLabel(G.path, s.player.x, s.player.y, G.guide) : 'no path'; }
  function walk() { const s = h.state(); if (!s || !G.guide) return; recompute(); if (G.path) { h.walk(G.path.slice(1)); h.toast('Walking you there… (move to take over)', ''); } }

  // ---------- places + map ----------
  function openPlaces() { if (G.tour) endTour('skipped'); closeMap(); pl.hidden = false; G.placesOpen = true; $('#pl-q').value = ''; renderPlaces(); if (!matchMedia('(pointer: coarse)').matches) $('#pl-q').focus(); }
  function closePlaces() { pl.hidden = true; G.placesOpen = false; }
  function renderPlaces() { const s = h.state(); if (!s) return; const list = GD.searchPlaces(GD.places(s), $('#pl-q').value), px = s.player.x / TILE, py = s.player.y / TILE;
    $('#pl-list').innerHTML = list.length ? GD.grouped(list).map(([g, ps]) => `<h3>${esc(g)}</h3><div class="pl-grid">${ps.map((p) => `<button class="pl-item${p.featured ? ' feat' : ''}" data-place="${esc(p.id)}" data-kind="${esc(p.kind)}"><b>${p.featured ? '★ ' : ''}${esc(p.name)}</b><small>${Math.round(Math.hypot(p.tx - px, p.ty - py)) * 2} m</small></button>`).join('')}</div>`).join('') : '<p class="sub">No places match.</p>'; }
  function openMap() { if (G.tour) endTour('skipped'); closePlaces(); mp.hidden = false; G.mapOpen = true; sizeMap(); }
  function closeMap() { mp.hidden = true; G.mapOpen = false; }
  function sizeMap() { const cv = $('#mapcv'), s = Math.max(2, Math.floor(Math.min((innerHeight - 90) / MAP_H, (innerWidth - 40) / MAP_W) * devicePixelRatio)); cv.width = MAP_W * s; cv.height = MAP_H * s; cv.style.width = cv.width / devicePixelRatio + 'px'; cv.style.height = cv.height / devicePixelRatio + 'px'; }
  function mapPick(tx, ty) { const s = h.state(); const list = GD.places(s); let p = GD.placeAt(list, tx, ty, 2.5);
    if (!p) { const w = GD.nearestWalkable(Math.floor(tx), Math.floor(ty), 2); if (w) p = { id: 'pin', kind: 'pin', name: 'Map pin', group: 'Pin', tx: w[0], ty: w[1], fx: w[0] + 0.5, fy: w[1] + 0.5 }; }
    if (p) { closeMap(); setGuide(p); } }
  function star(m, x, y, r, col) { m.fillStyle = col; m.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; m.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); } m.closePath(); m.fill(); }
  function drawMap(t) { const cv = $('#mapcv'), m = cv.getContext('2d'), s = cv.width / MAP_W, base = h.miniBase(); m.imageSmoothingEnabled = false; if (base) m.drawImage(base, 0, 0, cv.width, cv.height);
    const st = h.state(), list = GD.places(st); m.font = `${Math.max(9, s * 0.9)}px Silkscreen, monospace`; m.textAlign = 'center';
    for (const p of list) { m.fillStyle = '#141a2e'; m.fillRect(p.fx * s - 4, p.fy * s - 4, 8, 8); m.fillStyle = p.group === 'Games' ? '#ff5ad0' : p.group === 'Prizes & Boards' ? '#ffd84a' : '#fff6e0'; m.fillRect(p.fx * s - 3, p.fy * s - 3, 6, 6); }
    for (const p of list) if (p.featured) { const b = 7 + Math.sin(t * 5) * 1.5; star(m, p.fx * s, p.fy * s, b + 3, '#141a2e'); star(m, p.fx * s, p.fy * s, b, '#ffd84a'); }
    for (const p of list) if (['Featured', 'Games', 'Prizes & Boards'].includes(p.group) || p.kind === 'mall' && p.id === 'mall' || p.id === 'cafe') { const label = (p.featured ? '★ ' : '') + p.name.replace(/ \(.*\)$/, ''); m.fillStyle = '#141a2e'; m.fillText(label, p.fx * s + 1, p.fy * s - 6); m.fillStyle = '#fff6e0'; m.fillText(label, p.fx * s, p.fy * s - 7); }
    if (G.guide) { const g = G.guide, b = 6 + Math.sin(t * 6) * 2; m.strokeStyle = '#4cf08a'; m.lineWidth = 3; m.beginPath(); m.arc((g.tx + 0.5) * s, (g.ty + 0.5) * s, b + 4, 0, 7); m.stroke(); }
    const px = st.player.x / TILE * s, py = st.player.y / TILE * s, r = 7 + Math.sin(t * 5) * 2; m.fillStyle = '#ff3a3a'; m.beginPath(); m.arc(px, py, r, 0, 7); m.fill(); m.strokeStyle = '#fff'; m.lineWidth = 2; m.stroke();
    m.fillStyle = '#141a2e'; m.fillText('YOU ARE HERE', px + 1, py - r - 3); m.fillStyle = '#ff8a8a'; m.fillText('YOU ARE HERE', px, py - r - 4); }

  // ---------- per frame ----------
  function update(dt) { const s = h.state(); if (!s) return; if (G.tour) drawNpc(dt); if (G.mapOpen) drawMap(performance.now() / 1000);
    if (G.guide) { G.pathT -= dt; if (G.pathT <= 0) { G.pathT = 0.4; recompute(); } if (GD.arrived(s.player.x, s.player.y, G.guide)) { h.stopWalk?.(); clearGuide(true); } } }
  // camera target while touring: the step's place (centre of the building), else the player
  function camTarget() { const p = G.tour?.place; return p ? { x: p.fx * TILE, y: p.fy * TILE } : null; }
  function focus() { const p = G.tour?.place || G.guide; return p ? { x: p.fx * TILE, y: p.fy * TILE, stand: { x: (p.tx + 0.5) * TILE, y: (p.ty + 0.5) * TILE }, tour: !!G.tour?.place } : null; }
  // world space (inside the camera translate): highlight ring + bouncing pointer on the place; dotted path + arrow from the player when guiding
  function drawWorld(ctx, t, player) { const f = focus();
    if (G.guide && G.path) { ctx.save(); ctx.fillStyle = '#4cf08a'; const off = Math.floor(t * 6) % 3; for (let i = 1 + off; i < G.path.length; i += 3) { const [x, y] = G.path[i]; ctx.globalAlpha = 0.85; ctx.fillRect((x + 0.5) * TILE - 3, (y + 0.5) * TILE - 3, 6, 6); } ctx.restore();
      const g = G.guide, ax = (g.tx + 0.5) * TILE - player.x, ay = (g.ty + 0.5) * TILE - player.y, d = Math.hypot(ax, ay); if (d > 40) { const a = Math.atan2(ay, ax), r = 34 + Math.sin(t * 6) * 3; ctx.save(); ctx.translate(player.x + Math.cos(a) * r, player.y - 10 + Math.sin(a) * r); ctx.rotate(a); arrowShape(ctx, 12, '#4cf08a'); ctx.restore(); } }
    if (!f) return; const pulse = 0.5 + 0.5 * Math.sin(t * 4), big = G.tour?.hl, rr = (big ? 64 : 40) + pulse * 8;
    if (big) { ctx.save(); for (let i = 0; i < 10; i++) { const a = t * 1.5 + i * 0.628, d = rr + 14 + Math.sin(t * 4 + i) * 6; ctx.fillStyle = i % 2 ? '#ffd84a' : '#fff6e0'; ctx.fillRect(f.stand.x + Math.cos(a) * d - 3, f.stand.y + Math.sin(a) * d * 0.5 - 3, 6, 6); } ctx.restore(); }
    ctx.save(); ctx.strokeStyle = f.tour ? '#ffd84a' : '#4cf08a'; ctx.lineWidth = 4; ctx.globalAlpha = 0.9; ctx.beginPath(); ctx.ellipse(f.stand.x, f.stand.y, rr, rr * 0.5, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 0.35; ctx.lineWidth = 10; ctx.stroke(); ctx.restore();
    const by = f.stand.y - 70 - Math.abs(Math.sin(t * 4)) * 16; ctx.save(); ctx.translate(f.stand.x, by); ctx.rotate(Math.PI / 2); arrowShape(ctx, 18, f.tour ? '#ffd84a' : '#4cf08a'); ctx.restore(); }
  function arrowShape(c, s, col) { c.fillStyle = '#141a2e'; c.beginPath(); c.moveTo(s + 3, 0); c.lineTo(-s * 0.6 - 2, -s * 0.8 - 2); c.lineTo(-s * 0.2, 0); c.lineTo(-s * 0.6 - 2, s * 0.8 + 2); c.closePath(); c.fill(); c.fillStyle = col; c.beginPath(); c.moveTo(s, 0); c.lineTo(-s * 0.6, -s * 0.8); c.lineTo(-s * 0.2, 0); c.lineTo(-s * 0.6, s * 0.8); c.closePath(); c.fill(); }
  // screen space (CSS px): edge arrow + label when the focus is off-screen
  function drawScreen(ctx, ox, oy, zoom, t) { const f = focus(); if (!f) return; const W = innerWidth, H = innerHeight, sx = (f.stand.x + ox) * zoom, sy = (f.stand.y + oy) * zoom, m = 46;
    const on = sx > m && sx < W - m && sy > m && sy < H - m; document.body.dataset.edge = on ? 'off' : 'on'; if (on) return;
    const cx = W / 2, cy = H / 2, a = Math.atan2(sy - cy, sx - cx), k = Math.min((W / 2 - m) / Math.abs(Math.cos(a) || 1e-6), (H / 2 - m) / Math.abs(Math.sin(a) || 1e-6)), ex = cx + Math.cos(a) * k, ey = cy + Math.sin(a) * k;
    ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); const b = Math.sin(t * 6) * 4; ctx.translate(b, 0); arrowShape(ctx, 20, f.tour ? '#ffd84a' : '#4cf08a'); ctx.restore();
    const name = (G.tour?.place || G.guide).name.replace(/ \(.*\)$/, ''); ctx.save(); ctx.font = '10px Silkscreen, monospace'; ctx.textAlign = 'center'; const lx = Math.max(60, Math.min(W - 60, ex - Math.cos(a) * 34)), ly = Math.max(20, Math.min(H - 14, ey - Math.sin(a) * 26));
    ctx.fillStyle = '#141a2ecc'; const w = ctx.measureText(name).width + 10; ctx.fillRect(lx - w / 2, ly - 10, w, 14); ctx.fillStyle = '#fff6e0'; ctx.fillText(name, lx, ly + 1); ctx.restore(); }
  function onKey(e) { const k = e.key.toLowerCase(); if (e.target?.tagName === 'INPUT' && k !== 'escape') return false;
    if (G.tour) { if (k === 'escape') { endTour('skipped'); e.preventDefault(); return true; } if (k === 'enter' || k === 'arrowright' && e.shiftKey) { go(1); e.preventDefault(); return true; } }
    if (G.placesOpen || G.mapOpen) { if (k === 'escape') { closePlaces(); closeMap(); return true; } return G.placesOpen; }
    if (h.mode() === 'world' && !h.panelOpen()) { if (k === 'l') { openPlaces(); e.preventDefault(); return true; } if (k === 'n') { openMap(); return true; } }
    return false; }
  // first visit (device flag) / per wallet (profile cosmetics) after the character creator
  async function maybeStartTour(profile) { if (G.tour) return false; if (!GD.shouldStartTour({ ls: localStorage, wallet: h.wallet(), profile })) return false; startTour(false); return true; }
  addEventListener('resize', () => { if (G.mapOpen) sizeMap(); });
  return Object.assign(G, { startTour, endTour, go, setGuide, clearGuide, walk, openPlaces, closePlaces, openMap, closeMap, mapPick, update, camTarget, drawWorld, drawScreen, onKey, maybeStartTour,
    get touring() { return !!G.tour; }, get overlayOpen() { return G.placesOpen || G.mapOpen; } });
}
