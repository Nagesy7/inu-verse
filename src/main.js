import { TILE, MAP_W, MAP_H, MAP, T, BUILDINGS, PLOTS, NPC_HOMES, PLOT_COST, findPath, moveBody, nearestInteractable, interactables, isSolid } from './world.js';
import { COATS, newGame, claimPlot, buyFurniture, placeFurniture, moveFurniture, storeFurniture, sellPlaced, sellFromInventory, upgrade, swapBonesToKibble, BONES_PER_KIBBLE } from './game.js';
import { FURNITURE, WALLS, FLOORS, ROOM_W, ROOM_H, canPlace, itemAt, footprint } from './furniture.js';
import { MENU, newShift, tickShift, addToTray, clearTray, serve, finishShift, SHIFT_LEN } from './cafe.js';
import { createToken, playerBuy, playerSell, simulateTick, seedTokens, holderCount, PLAYER, CREATE_FEE } from './launch.js';
import { price, marketCap, progress } from './curve.js';
import { save, load } from './save.js';
import { OUTFITS, SLOTS, SLOT_NAMES, buyOutfit, equipOutfit, unequipSlot, ensureWardrobe } from './outfits.js';
import { mulberry32 } from './rng.js';
import { spawnNpcs, updateNpc, NPC_OUTFITS } from './npc.js';
import { npcHome } from './homes.js';
import { drawShiba, drawFurniture, drawRoom, drawMenuIcon, drawBoneIcon } from './art.js';
import { prerenderMap, drawPlots, drawStalls } from './render.js';

const $ = (s) => document.querySelector(s);
const cv = $('#game'), ctx = cv.getContext('2d');
const rng = mulberry32((Date.now() & 0xffff) + 1);
let state = null, mapImg = null, npcs = [], mode = 'title';
const cam = { x: 0, y: 0 };
const keys = new Set();
const player = { face: 'down', dir: 1, phase: 0, moving: false, path: [], target: null };
let build = null; // {plotId, readOnly, home, sel:{kind:'new'|'move', id, uid, rot}, hover:{x,y}, picked}
let panel = null; // {kind, ...}
let simAcc = 0, saveAcc = 0, lastT = performance.now(), time = 0;
const fmt = (n, d = 2) => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : (+n).toFixed(d);
const fmtP = (p) => p.toExponential(3);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function toast(msg, cls = '') { const d = document.createElement('div'); d.className = 'toast ' + cls; d.textContent = msg; $('#toast').appendChild(d); setTimeout(() => d.remove(), 2200); }
function persist() { if (state) { save(state, localStorage); } }
function hud() { $('#bones').textContent = Math.floor(state.bones); $('#kibble').textContent = state.kibble.toFixed(2); $('#hud-name').textContent = state.player.name; }

function resize() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; }
addEventListener('resize', resize); resize();

// ---------------- Title ----------------
let chosenCoat = 'tan';
function spriteCanvas(coat, outfit, w, h, scale, face = 'down') { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; drawShiba(x, w / 2, h - 16, { coat, outfit, scale, face }); return c; }
function titleScreen() {
  const wrap = $('#coats');
  wrap.innerHTML = Object.entries(COATS).map(([k, c]) => `<button class="coat ${k === chosenCoat ? 'sel' : ''}" data-coat="${k}"><span class="cimg"></span>${c.name}</button>`).join('');
  wrap.querySelectorAll('.coat').forEach((b) => b.querySelector('.cimg').appendChild(spriteCanvas(b.dataset.coat, {}, 60, 76, 1)));
  wrap.onclick = (e) => { const b = e.target.closest('.coat'); if (!b) return; chosenCoat = b.dataset.coat; wrap.querySelectorAll('.coat').forEach((x) => x.classList.toggle('sel', x === b)); };
  const saved = load(localStorage);
  if (saved) { $('#continue').hidden = false; $('#continue').onclick = () => startGame(saved); }
  $('#start').onclick = () => { const s = newGame({ name: $('#name').value.trim() || 'Inu', coat: chosenCoat }); seedTokens(s, rng); startGame(s); toast(`Welcome to Inu Verse, ${s.player.name}!`, 'good'); };
  const pv = $('#preview'), pc = pv.getContext('2d');
  const faces = ['down', 'right', 'up', 'left'];
  const loop = (t) => {
    if (mode !== 'title') return; pc.imageSmoothingEnabled = false; pc.clearRect(0, 0, pv.width, pv.height);
    const face = faces[Math.floor(t / 1600) % 4];
    const pads = saved ? [[pv.width * 0.3, chosenCoat, {}, 'NEW'], [pv.width * 0.72, saved.player.coat, saved.wardrobe?.equipped, saved.player.name.toUpperCase()]] : [[pv.width / 2, chosenCoat, {}, null]];
    for (const [x, coat, outfit, lbl] of pads) {
      pc.fillStyle = '#d4a640'; pc.fillRect(x - 54, 150, 108, 10); pc.fillStyle = '#8f6a22'; pc.fillRect(x - 54, 158, 108, 4); pc.fillStyle = '#24305c'; pc.fillRect(x - 50, 152, 100, 5);
      drawShiba(pc, x, 140, { coat, outfit, scale: 2, phase: t / 90, moving: true, face, shadow: false });
      if (lbl) { pc.font = '8px Silkscreen, monospace'; pc.textAlign = 'center'; pc.fillStyle = '#f2cc68'; pc.fillText(lbl, x, 172); }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function startGame(s) {
  state = s; state.kibble ??= 20; ensureWardrobe(state); mode = 'world';
  $('#title').hidden = true; $('#hud').hidden = false; $('#minimap-wrap').hidden = false;
  mapImg = prerenderMap(); npcs = spawnNpcs(rng, 6);
  document.fonts?.load('10px Silkscreen').then(() => { mapImg = prerenderMap(); }).catch(() => {});
  cam.x = state.player.x; cam.y = state.player.y; hud(); persist();
}

// ---------------- Input ----------------
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase(); keys.add(k);
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === 'escape') { if (panel) closePanel(); else if (build) exitBuild(); }
  if (mode === 'world' && !panel && (k === 'e' || k === 'enter')) { const it = nearestInteractable(state, state.player.x, state.player.y); if (it) interact(it); }
  if (mode === 'build' && k === 'r') rotateSel();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
const screenToWorld = (sx, sy) => ({ x: sx + cam.x - innerWidth / 2, y: sy + cam.y - innerHeight / 2 });

cv.addEventListener('mousemove', (e) => { if (mode === 'build') build.hover = roomCell(e.clientX, e.clientY); });
cv.addEventListener('click', (e) => {
  if (mode === 'world' && !panel) {
    const w = screenToWorld(e.clientX, e.clientY); clickWorldTile(Math.floor(w.x / TILE), Math.floor(w.y / TILE));
  } else if (mode === 'build') buildClick(roomCell(e.clientX, e.clientY));
});
$('#minimap').addEventListener('click', (e) => { if (mode === 'world' && !panel) { const r = e.target.getBoundingClientRect(); clickWorldTile(Math.floor((e.clientX - r.left) / 3), Math.floor((e.clientY - r.top) / 3)); } });
function clickWorldTile(tx, ty) {
    let target = null;
    for (const b of BUILDINGS) if (tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h) target = interactables(state).find((i) => i.id === b.id);
    for (const p of [...PLOTS, ...NPC_HOMES]) if (tx >= p.x && tx < p.x + p.w && ty >= p.y && ty < p.y + p.h) target = interactables(state).find((i) => i.id === p.id);
    const goal = target ? [target.tx, target.ty] : [tx, ty];
    const sx = Math.floor(state.player.x / TILE), sy = Math.floor(state.player.y / TILE);
    const path = findPath(sx, sy, goal[0], goal[1]);
    if (path) { player.path = path.slice(1); player.target = target; player.clickMark = { x: (goal[0] + 0.5) * TILE, y: (goal[1] + 0.5) * TILE, t: 1 }; }
}
$('#prompt').onclick = () => { const it = nearestInteractable(state, state.player.x, state.player.y); if (it) interact(it); };
$('#btn-phantom').onclick = () => toast('Phantom wallet support is coming soon — nothing is connected.', '');
$('#btn-help').onclick = () => openPanel('help');
$('#btn-wardrobe').onclick = () => { if (mode === 'world') openPanel('wardrobe'); };
$('#panel-close').onclick = () => closePanel();

// ---------------- World update ----------------
function updateWorld(dt) {
  const p = state.player; let dx = 0, dy = 0;
  if (!panel) {
    if (keys.has('w') || keys.has('arrowup')) dy -= 1; if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1; if (keys.has('d') || keys.has('arrowright')) dx += 1;
  }
  const speed = 150;
  if (dx || dy) { player.path = []; player.target = null; const l = Math.hypot(dx, dy); moveBody(p, (dx / l) * speed * dt, (dy / l) * speed * dt); if (dx) player.dir = dx > 0 ? 1 : -1; player.face = dx ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); player.moving = true; }
  else if (player.path.length) {
    const [tx, ty] = player.path[0], gx = (tx + 0.5) * TILE, gy = (ty + 0.5) * TILE, ddx = gx - p.x, ddy = gy - p.y, d = Math.hypot(ddx, ddy), st = speed * dt;
    if (d <= st) { p.x = gx; p.y = gy; player.path.shift(); if (!player.path.length && player.target) { const t = player.target; player.target = null; interact(t); } }
    else { p.x += (ddx / d) * st; p.y += (ddy / d) * st; }
    if (Math.abs(ddx) > 1) player.dir = ddx > 0 ? 1 : -1; if (d > 0.5) player.face = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'right' : 'left') : (ddy > 0 ? 'down' : 'up'); player.moving = true;
  } else player.moving = false;
  if (player.moving) player.phase += dt * 12; else player.phase += dt * 2;
  for (const n of npcs) updateNpc(n, dt, rng);
  // smooth camera
  const k = 1 - Math.pow(0.0015, dt);
  cam.x += (p.x - cam.x) * k; cam.y += (p.y - cam.y) * k;
  const hw = innerWidth / 2, hh = innerHeight / 2;
  cam.x = Math.max(hw, Math.min(MAP_W * TILE - hw, cam.x)); cam.y = Math.max(hh, Math.min(MAP_H * TILE - hh, cam.y));
  if (MAP_W * TILE < innerWidth) cam.x = MAP_W * TILE / 2; if (MAP_H * TILE < innerHeight) cam.y = MAP_H * TILE / 2;
  const it = !panel && nearestInteractable(state, p.x, p.y);
  const pr = $('#prompt');
  if (it) { pr.hidden = false; const verb = { building: 'Enter', plot: state.plots[it.id] ? 'Enter' : 'Inspect', visit: 'Visit', stall: 'View' }[it.kind]; pr.innerHTML = `<kbd>E</kbd>${verb} ${esc(it.name)}`; pr.dataset.target = it.id; }
  else pr.hidden = true;
}

function renderWorld() {
  const dpr = devicePixelRatio; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#121a36'; ctx.fillRect(0, 0, innerWidth, innerHeight);
  const ox = Math.round(innerWidth / 2 - cam.x), oy = Math.round(innerHeight / 2 - cam.y);
  ctx.save(); ctx.translate(ox, oy);
  ctx.drawImage(mapImg, 0, 0);
  drawPlots(ctx, state, time); drawStalls(ctx, state, time);
  if (player.clickMark && player.path.length) { const m = player.clickMark, k = Math.round(10 + Math.sin(time * 6) * 2); ctx.fillStyle = '#f2cc68'; for (const [ax, ay] of [[-k, 0], [k - 4, 0], [0, -k / 2], [0, k / 2 - 2]]) ctx.fillRect(Math.round(m.x + ax), Math.round(m.y + 6 + ay), 4, 3); }
  const actors = [...npcs.map((n) => ({ ...n, npc: true })), { x: state.player.x, y: state.player.y, coat: state.player.coat, outfit: state.wardrobe.equipped, face: player.face, phase: player.phase, moving: player.moving, name: state.player.name, me: true }];
  actors.sort((a, b) => a.y - b.y);
  for (const a of actors) {
    if (a.me) { ctx.fillStyle = 'rgba(242,204,104,0.55)'; ctx.fillRect(Math.round(a.x - 16), Math.round(a.y + 8), 32, 4); ctx.fillRect(Math.round(a.x - 12), Math.round(a.y + 6), 24, 8); }
    drawShiba(ctx, a.x, a.y, { coat: a.coat, outfit: a.outfit, face: a.face, phase: a.phase, moving: a.moving, name: a.name, scale: 1 });
  }
  ctx.restore();
  // vignette warm light
  const g = ctx.createRadialGradient(innerWidth / 2, innerHeight / 2, innerHeight * 0.4, innerWidth / 2, innerHeight / 2, innerHeight);
  g.addColorStop(0, 'rgba(18,26,54,0)'); g.addColorStop(1, 'rgba(12,16,34,0.45)'); ctx.fillStyle = g; ctx.fillRect(0, 0, innerWidth, innerHeight);
  minimap();
}

function minimap() {
  const m = $('#minimap').getContext('2d'), s = 3;
  const col = { [T.GRASS]: '#4f8f45', [T.FLOWER]: '#4f8f45', [T.ROAD]: '#2e3448', [T.WALK]: '#b9a888', [T.PLAZA]: '#c9b893', [T.BUILDING]: '#d4a640', [T.WATER]: '#1f5a86', [T.TREE]: '#1c4f2e', [T.PLOT]: '#8a6a46', [T.HOME]: '#8e2430' };
  for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) { m.fillStyle = col[MAP[y][x]]; m.fillRect(x * s, y * s, s, s); }
  for (const p of PLOTS) if (state.plots[p.id]) { m.fillStyle = '#f2cc68'; m.fillRect(p.x * s, p.y * s, p.w * s, p.h * s); }
  m.fillStyle = '#fff'; for (const n of npcs) m.fillRect(n.x / TILE * s - 1, n.y / TILE * s - 1, 3, 3);
  m.fillStyle = '#e94f4f'; m.fillRect(state.player.x / TILE * s - 3, state.player.y / TILE * s - 3, 6, 6);
}

// ---------------- Interactions ----------------
function interact(it) {
  if (it.kind === 'building') openPanel(it.id);
  else if (it.kind === 'plot') { if (state.plots[it.id]) enterBuild(it.id, false); else openPanel('plot', { plotId: it.id }); }
  else if (it.kind === 'visit') enterBuild(it.id, true);
  else if (it.kind === 'stall') openPanel('launch', { sel: it.id });
}

function openPanel(kind, opts = {}) {
  panel = { kind, ...opts }; $('#panel').hidden = false; $('#prompt').hidden = true; keys.clear();
  const body = $('#panel-body');
  if (kind === 'plot') {
    const p = PLOTS.find((x) => x.id === opts.plotId);
    body.innerHTML = `<h2>Empty plot ${p.id.toUpperCase()}</h2><p class="sub">A sunny ${p.w}×${p.h} lot on Bone Street. Claim it to build and decorate your own home.</p>
      <p><b>Cost:</b> ${PLOT_COST} bones · You have ${Math.floor(state.bones)}</p><div class="row" style="justify-content:flex-start"><button class="btn green" id="claim">Claim plot for ${PLOT_COST} bones</button></div>`;
    $('#claim').onclick = () => { const r = claimPlot(state, p.id); if (r.ok) { toast('Plot claimed! Your new home is ready.', 'good'); hud(); persist(); closePanel(); enterBuild(p.id, false); } else toast(r.reason, 'bad'); };
  } else if (kind === 'shop') renderShop();
  else if (kind === 'cafe') renderCafe();
  else if (kind === 'launch') renderLaunch();
  else if (kind === 'fashion') renderFashion();
  else if (kind === 'wardrobe') renderWardrobe();
  else if (kind === 'cars') body.innerHTML = `<h2>Zoomies Motors</h2><p class="sub">Scooters, convertibles and the legendary Bone-mobile — arriving in a future update.</p><div class="demo-banner">Car Dealer: coming soon</div>`;
  else if (kind === 'help') body.innerHTML = `<h2>How to play</h2><ul><li>Walk with <b>WASD</b>/<b>arrows</b> or <b>click</b> anywhere.</li><li>Press <b>E</b> near doors and signs.</li><li>Earn <b>bones</b> serving orders at the Shiba Sips Café.</li><li>Claim a plot (${PLOT_COST} bones), buy furniture at Paws & Pillows, decorate (R to rotate).</li><li>Buy clothes at <b>Fetch Fashion</b> and dress up in your <b>Wardrobe</b> (HUD button).</li><li>Launch Hall: create and trade <b>simulated</b> tokens paired with demo <b>$KIBBLE</b>. Nothing here is real money or on any blockchain.</li><li>Visit Mochi, Kuro, Hana and Taro's homes on Sakura Lane.</li></ul><button class="btn red" id="reset">Reset save</button>`;
  if (kind === 'help') $('#reset').onclick = () => { if (confirm('Delete your local save?')) { localStorage.clear(); location.reload(); } };
}
function closePanel() {
  if (panel?.kind === 'cafe' && panel.shift && !panel.shift.paid && panel.shift.earned > 0) { finishShift(state, panel.shift); toast(`Shift ended early: +${panel.shift.paid} bones`, 'good'); hud(); persist(); }
  panel = null; $('#panel').hidden = true;
}

function iconCanvas(draw, w = 64, h = 52) { const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; c.style.width = w + 'px'; c.style.height = h + 'px'; const x = c.getContext('2d'); x.scale(2, 2); draw(x); return c; }

function renderShop() {
  const body = $('#panel-body');
  body.innerHTML = `<h2>Paws & Pillows</h2><p class="sub">Furniture for discerning dogs. Items go to your inventory — place them from build mode in your home.${Object.keys(state.plots).length ? '' : ' <b>Tip: claim a plot first!</b>'}</p><div class="grid" id="shopgrid"></div>`;
  const grid = $('#shopgrid');
  for (const [id, d] of Object.entries(FURNITURE)) {
    const card = document.createElement('div'); card.className = 'card';
    const cell = 50 / Math.max(d.w, d.h + 0.2);
    card.appendChild(iconCanvas((x) => drawFurniture(x, id, 32 - (d.w * cell) / 2, 26 - (d.h * cell) / 2, cell, 0)));
    card.insertAdjacentHTML('beforeend', `<div><b>${d.name}</b></div><div class="small" style="margin:2px 0">${d.w}×${d.h} · owned ${state.inventory[id] || 0}</div><div class="price">${d.price} bones</div><button class="btn" data-buy="${id}">Buy</button>`);
    grid.appendChild(card);
  }
  grid.onclick = (e) => { const b = e.target.closest('[data-buy]'); if (!b) return; const r = buyFurniture(state, b.dataset.buy); if (r.ok) { toast(`Bought ${FURNITURE[b.dataset.buy].name}`, 'good'); hud(); persist(); renderShop(); } else toast(r.reason, 'bad'); };
}

// ---- Fetch Fashion + Wardrobe ----
const wearPreview = (extra, w = 72, h = 92) => { const eq = { ...state.wardrobe.equipped }; if (extra) { const d = OUTFITS[extra]; eq[d.slot] = extra; if (d.full) delete eq.bottom; if (d.slot === 'bottom' && OUTFITS[eq.top]?.full) delete eq.top; } return spriteCanvas(state.player.coat, eq, w, h, 1); };
function renderFashion() {
  const body = $('#panel-body'), w = state.wardrobe;
  body.innerHTML = `<h2>Fetch Fashion</h2><p class="sub">Hats, suits, gowns and bling for discerning dogs. Bought clothes go to your <b>Wardrobe</b>. Preview shows the item on you.</p><div class="row" style="justify-content:flex-start;margin:0 0 10px"><button class="btn alt" id="open-wardrobe">Open wardrobe</button></div><div class="grid" id="fashgrid"></div>`;
  const grid = $('#fashgrid');
  for (const [id, d] of Object.entries(OUTFITS)) {
    const own = w.owned.includes(id), on = w.equipped[d.slot] === id;
    const card = document.createElement('div'); card.className = 'card' + (on ? ' on' : ''); card.dataset.item = id;
    card.appendChild(wearPreview(id));
    card.insertAdjacentHTML('beforeend', `<div><b>${d.name}</b></div><div class="small" style="margin:2px 0">${SLOT_NAMES[d.slot]}</div><div class="price">${own ? 'Owned' : d.price + ' bones'}</div>${own ? `<button class="btn ${on ? 'ghost' : 'green'}" data-equip="${id}">${on ? 'Wearing' : 'Wear'}</button>` : `<button class="btn" data-buyfit="${id}">Buy</button>`}`);
    grid.appendChild(card);
  }
  grid.onclick = (e) => {
    const b = e.target.closest('[data-buyfit]'), q = e.target.closest('[data-equip]');
    if (b) { const r = buyOutfit(state, b.dataset.buyfit); if (r.ok) { equipOutfit(state, b.dataset.buyfit); toast(`Bought ${OUTFITS[b.dataset.buyfit].name} - wearing it now!`, 'good'); hud(); persist(); renderFashion(); } else toast(r.reason, 'bad'); }
    if (q) { equipOutfit(state, q.dataset.equip); persist(); renderFashion(); }
  };
  $('#open-wardrobe').onclick = () => openPanel('wardrobe');
}
function renderWardrobe() {
  const body = $('#panel-body'), w = state.wardrobe;
  body.innerHTML = `<h2>Wardrobe</h2><p class="sub">Equip the clothes you own. One item per slot; gowns replace bottoms.${w.owned.length ? '' : ' <b>Nothing yet - visit Fetch Fashion!</b>'}</p>
    <div class="wardrobe"><div class="mirror" id="mirror"></div><div id="slots"></div></div>`;
  const m = $('#mirror'); m.appendChild(spriteCanvas(state.player.coat, w.equipped, 168, 220, 3));
  m.insertAdjacentHTML('beforeend', `<div class="mname">${esc(state.player.name)}</div><div class="small">${COATS[state.player.coat].name}</div>`);
  $('#slots').innerHTML = SLOTS.map((slot) => { const items = w.owned.filter((id) => OUTFITS[id].slot === slot);
    return `<div class="slot"><b>${SLOT_NAMES[slot]}</b><div class="slot-items"><button class="btn ${w.equipped[slot] ? 'ghost' : 'alt'}" data-unequip="${slot}">${slot === 'top' ? 'Cream tee' : slot === 'bottom' ? 'Navy jeans' : 'None'}</button>${items.map((id) => `<button class="btn ${w.equipped[slot] === id ? 'alt' : 'ghost'}" data-wear="${id}">${OUTFITS[id].name}</button>`).join('')}</div></div>`; }).join('');
  $('#slots').onclick = (e) => { const a = e.target.closest('[data-wear]'), u = e.target.closest('[data-unequip]'); if (a) equipOutfit(state, a.dataset.wear); else if (u) unequipSlot(state, u.dataset.unequip); else return; persist(); renderWardrobe(); };
}

// ---- Café ----
function renderCafe() {
  const body = $('#panel-body');
  body.innerHTML = `<h2>Shiba Sips Café — Barista shift</h2><p class="sub">Tap menu items to fill your tray, then tap the customer whose order matches. Fast service = bigger tips. ${SHIFT_LEN}s shift.</p>
   <div class="cafe"><div><div class="orders" id="orders"></div><div class="menu" id="menu"></div></div>
   <div><div class="tray"><b>Tray</b> <button class="btn ghost" id="cleartray" style="float:right;padding:2px 8px">clear</button><div id="tray" style="margin-top:8px;min-height:40px"></div></div>
   <p>Time <b id="ctime">${SHIFT_LEN}</b>s · Served <b id="cserved">0</b></p><div>Earned</div><div class="big-num" id="cearned">0</div>
   <div class="row" style="justify-content:flex-start"><button class="btn green" id="cstart">Start shift</button></div></div></div>`;
  const menu = $('#menu');
  for (const m of MENU) { const b = document.createElement('button'); b.dataset.item = m.id; b.appendChild(iconCanvas((x) => drawMenuIcon(x, m.id, 20, 16, 1.2), 40, 32)); b.append(m.name); menu.appendChild(b); }
  menu.onclick = (e) => { const b = e.target.closest('[data-item]'); if (b && panel.shift && !panel.shift.over) { addToTray(panel.shift, b.dataset.item); cafeUi(); } };
  $('#cleartray').onclick = () => { if (panel.shift) { clearTray(panel.shift); cafeUi(); } };
  $('#orders').onclick = (e) => { const o = e.target.closest('[data-order]'); if (!o || !panel.shift) return; const r = serve(panel.shift, +o.dataset.order); toast(r.ok ? `+${r.pay} bones!` : r.reason, r.ok ? 'good' : 'bad'); cafeUi(); };
  $('#cstart').onclick = () => { panel.shift = newShift(rng); $('#cstart').hidden = true; cafeUi(); };
  $('#orders').innerHTML = '<p class="small">Press Start shift to open the café.</p>';
}
function cafeUi() {
  const s = panel.shift; if (!s) return;
  $('#ctime').textContent = Math.ceil(s.time); $('#cserved').textContent = s.served; $('#cearned').textContent = s.earned;
  const name = (id) => MENU.find((m) => m.id === id).name;
  const sig = s.orders.map((o) => o.id).join() + '|' + s.over;
  if ($('#orders').dataset.sig !== sig) {
    $('#orders').dataset.sig = sig;
    $('#orders').innerHTML = s.over ? '' : s.orders.map((o) => `<div class="order" data-order="${o.id}" data-items="${o.items.join(',')}"><canvas width="60" height="44" data-face="${o.customer}"></canvas><b>${o.customer}</b><div class="small" style="margin:4px 0">${o.items.map(name).join(' + ')}</div><div class="pat"><i></i></div></div>`).join('') || '<p class="small">Waiting for customers…</p>';
    $('#orders').querySelectorAll('canvas[data-face]').forEach((c, i) => { const x = c.getContext('2d'); drawShiba(x, 30, 28, { coat: Object.keys(COATS)[s.orders[i].id % 6], outfit: NPC_OUTFITS[s.orders[i].id % NPC_OUTFITS.length], scale: 0.5, shadow: false }); });
  }
  s.orders.forEach((o) => { const el = $(`.order[data-order="${o.id}"] .pat i`); if (el) { el.style.width = (100 * o.patience / o.max) + '%'; el.style.background = o.patience / o.max < 0.3 ? '#d9534f' : '#3fa66a'; } });
  const tray = $('#tray'); const tsig = s.tray.join();
  if (tray.dataset.sig !== tsig) { tray.dataset.sig = tsig; tray.innerHTML = ''; s.tray.forEach((id) => tray.appendChild(iconCanvas((x) => drawMenuIcon(x, id, 18, 16, 1.1), 36, 32))); if (!s.tray.length) tray.innerHTML = '<span class="small">empty</span>'; }
  if (s.over && !s.paid) {
    const total = finishShift(state, s); hud(); persist();
    $('#orders').innerHTML = `<div class="card" style="width:100%"><h3>Shift complete!</h3><p>Served ${s.served} · missed ${s.failed}${s.served >= 5 ? ' · +25 star bonus' : ''}</p><div class="big-num" id="shift-total">+${total} bones</div></div>`;
    const b = $('#cstart'); b.hidden = false; b.textContent = 'Work another shift';
    toast(`Shift paid: +${total} bones`, 'good');
  }
}

// ---- Launch Hall ----
function renderLaunch() {
  const body = $('#panel-body');
  if (!panel.sel) panel.sel = state.tokens[state.tokens.length - 1]?.id;
  body.innerHTML = `<div class="demo-banner">Demo – simulated tokens · No blockchain · No real money · $KIBBLE here is play currency</div>
  <h2>Launch Hall</h2><p class="sub">Create a token and watch it trade on a bonding curve against demo $KIBBLE. NPC Inu traders buy and sell in real time; when the curve fills the token <b>graduates</b>.</p>
  <div class="launch"><div>
   <div class="card" style="text-align:left"><b>Swap bones → $KIBBLE</b><div class="small">${BONES_PER_KIBBLE} bones = 1 KIBBLE (demo)</div><div class="tradebox"><input id="swapamt" type="number" value="100" min="1"><button class="btn alt" id="swap">Swap</button></div></div>
   <h3 style="margin:10px 0 6px">Tokens</h3><div class="toklist" id="toklist"></div>
   <details class="card form" style="text-align:left;margin-top:8px" id="createbox" open><summary><b>Create a token</b> (${CREATE_FEE} KIBBLE)</summary>
    <input id="tname" placeholder="Name e.g. Shiba Star" maxlength="24"><input id="tticker" placeholder="Ticker e.g. STAR" maxlength="6">
    <label class="small">Icon colour <input id="tcolor" type="color" value="#e58b3a" style="height:34px"></label>
    <button class="btn green" id="tcreate">Launch token</button></details>
  </div><div id="tokdetail"></div></div>`;
  $('#swap').onclick = () => { const r = swapBonesToKibble(state, +$('#swapamt').value); if (r.ok) { toast(`+${r.kibble.toFixed(2)} demo KIBBLE`, 'good'); hud(); persist(); } else toast(r.reason, 'bad'); };
  $('#tcreate').onclick = () => { const r = createToken(state, { name: $('#tname').value, ticker: $('#tticker').value, color: $('#tcolor').value }); if (r.ok) { panel.sel = r.token.id; toast(`$${r.token.ticker} launched! A stall opened on Market Row.`, 'good'); hud(); persist(); renderLaunch(); } else toast(r.reason, 'bad'); };
  $('#toklist').onclick = (e) => { const b = e.target.closest('[data-tok]'); if (b) { panel.sel = b.dataset.tok; renderTokDetail(); launchUi(); } };
  renderTokDetail(); launchUi();
}
function renderTokDetail() {
  const tok = state.tokens.find((t) => t.id === panel.sel), el = $('#tokdetail');
  if (!tok) { el.innerHTML = '<p>No tokens yet — create one!</p>'; return; }
  el.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><i style="width:40px;height:40px;border-radius:50%;background:${tok.color};display:inline-block;border:3px solid #fff;box-shadow:0 2px 5px #0003"></i><div><h2 style="margin:0">${esc(tok.name)} <span style="color:#6c4fd0">$${tok.ticker}/KIBBLE</span></h2><div class="small">created by ${tok.creator === PLAYER ? 'you' : tok.creator}</div></div><span id="gradbadge"></span></div>
   <canvas id="chart" width="1200" height="380" style="width:100%;height:190px;background:#fff;border-radius:12px;margin-top:8px"></canvas>
   <div class="stats"><div>Price<b id="st-price"></b>KIBBLE</div><div>Market cap<b id="st-mcap"></b>KIBBLE</div><div>Holders<b id="st-holders"></b></div><div>You hold<b id="st-you"></b>$${tok.ticker}</div></div>
   <div class="small">Bonding curve progress <span id="st-prog"></span></div><div class="bar"><i id="st-bar"></i></div>
   <div class="tradebox"><input id="buyamt" type="number" value="1" min="0.01" step="0.1"><span>KIBBLE</span><button class="btn green" id="buybtn">Buy</button><span style="flex:1"></span><button class="btn red" data-sell="0.25">Sell 25%</button><button class="btn red" data-sell="0.5">50%</button><button class="btn red" data-sell="1" id="sellall">Sell all</button></div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><b>Recent trades</b><div class="trades" id="trades"></div></div><div><b>Top holders</b><div class="trades" id="holders"></div></div></div>`;
  $('#buybtn').onclick = () => { const r = playerBuy(state, tok.id, +$('#buyamt').value); if (r.ok) { toast(`Bought ${fmt(r.tokensOut)} $${tok.ticker}${r.graduatedNow ? ' — GRADUATED!' : ''}`, 'good'); hud(); persist(); launchUi(); } else toast(r.reason, 'bad'); };
  el.querySelectorAll('[data-sell]').forEach((b) => b.onclick = () => { const r = playerSell(state, tok.id, (tok.holders[PLAYER] || 0) * +b.dataset.sell); if (r.ok) { toast(`Sold for ${r.kibbleOut.toFixed(3)} KIBBLE`, 'good'); hud(); persist(); launchUi(); } else toast(r.reason, 'bad'); });
}
function launchUi() {
  if (!$('#toklist')) return;
  $('#toklist').innerHTML = state.tokens.map((t) => `<button class="tok ${t.id === panel.sel ? 'sel' : ''}" data-tok="${t.id}"><i style="background:${t.color}"></i><span><b>$${t.ticker}</b> ${esc(t.name)}<small>mcap ${fmt(marketCap(t.curve))} · ${holderCount(t)} holders${t.curve.graduated ? ' · graduated' : ''}</small></span></button>`).join('');
  const tok = state.tokens.find((t) => t.id === panel.sel); if (!tok || !$('#chart')) return;
  const c = tok.curve;
  $('#st-price').textContent = fmtP(price(c)); $('#st-mcap').textContent = fmt(marketCap(c)); $('#st-holders').textContent = holderCount(tok); $('#st-you').textContent = fmt(tok.holders[PLAYER] || 0);
  $('#st-prog').textContent = (progress(c) * 100).toFixed(1) + '% · ' + c.realKibble.toFixed(2) + ' KIBBLE in curve'; $('#st-bar').style.width = progress(c) * 100 + '%';
  $('#gradbadge').innerHTML = c.graduated ? '<span class="chip" style="background:#ffcf5a">★ Graduated</span>' : '';
  $('#trades').innerHTML = tok.trades.slice(0, 12).map((t) => `<div class="${t.side[0]}">${t.who === PLAYER ? '<b>you</b>' : t.who} ${t.side} ${fmt(t.amount)} for ${t.kibble.toFixed(3)} KIBBLE</div>`).join('');
  $('#holders').innerHTML = Object.entries(tok.holders).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([w, a]) => `<div>${w === PLAYER ? '<b>you</b>' : w} — ${(a / c.totalSupply * 100).toFixed(2)}%</div>`).join('');
  // chart
  const ch = $('#chart'), x = ch.getContext('2d'), W = ch.width, H = ch.height, h = tok.history;
  x.clearRect(0, 0, W, H); const ps = h.map((q) => q.p), lo = Math.min(...ps) * 0.98, hi = Math.max(...ps) * 1.02;
  x.strokeStyle = '#eee'; x.lineWidth = 2; for (let i = 1; i < 4; i++) { x.beginPath(); x.moveTo(0, (H * i) / 4); x.lineTo(W, (H * i) / 4); x.stroke(); }
  const px = (i) => (i / Math.max(1, h.length - 1)) * (W - 20) + 10, py = (p) => H - 16 - ((p - lo) / (hi - lo || 1)) * (H - 32);
  const up = ps[ps.length - 1] >= ps[0];
  x.beginPath(); h.forEach((q, i) => i ? x.lineTo(px(i), py(q.p)) : x.moveTo(px(i), py(q.p)));
  x.lineTo(px(h.length - 1), H); x.lineTo(px(0), H); x.closePath(); const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, up ? 'rgba(63,166,106,0.35)' : 'rgba(217,83,79,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fill();
  x.beginPath(); h.forEach((q, i) => i ? x.lineTo(px(i), py(q.p)) : x.moveTo(px(i), py(q.p))); x.strokeStyle = up ? '#3fa66a' : '#d9534f'; x.lineWidth = 4; x.stroke();
  x.fillStyle = '#8a6a55'; x.font = '22px sans-serif'; x.fillText(fmtP(hi), 10, 26); x.fillText(fmtP(lo), 10, H - 22);
}

// ---------------- Build mode ----------------
function roomGeom() { const cell = Math.floor(Math.min((innerWidth - 60) / ROOM_W, (innerHeight - 270) / (ROOM_H + 1.6), 64)); const ox = Math.floor(innerWidth / 2 - (ROOM_W * cell) / 2), oy = Math.floor(80 + cell * 1.6); return { cell, ox, oy }; }
function roomCell(sx, sy) { const { cell, ox, oy } = roomGeom(); return { x: Math.floor((sx - ox) / cell), y: Math.floor((sy - oy) / cell) }; }
function enterBuild(id, readOnly) {
  mode = 'build'; const home = readOnly ? npcHome(id) : state.plots[id];
  build = { plotId: id, readOnly, home, sel: null, hover: null, picked: null };
  $('#prompt').hidden = true; $('#minimap-wrap').hidden = true; buildBar();
}
function exitBuild() { mode = 'world'; build = null; $('#buildbar').hidden = true; $('#minimap-wrap').hidden = false; persist(); }
function rotateSel() { if (build?.sel) { build.sel.rot = (build.sel.rot + 1) % 4; } else if (build?.picked) { const it = build.picked; const r = moveFurniture(state, build.plotId, it.uid, it.x, it.y, (it.rot + 1) % 4); if (!r.ok) toast('No room to rotate here', 'bad'); persist(); } }
function buildClick(c) {
  if (!build || build.readOnly) return;
  if (build.sel) {
    const s = build.sel;
    if (s.kind === 'new') { const r = placeFurniture(state, build.plotId, s.id, c.x, c.y, s.rot); if (r.ok) { toast(`Placed ${FURNITURE[s.id].name}`, 'good'); if (!state.inventory[s.id]) build.sel = null; persist(); buildBar(); } else toast(r.reason, 'bad'); }
    else { const r = moveFurniture(state, build.plotId, s.uid, c.x, c.y, s.rot); if (r.ok) { build.sel = null; persist(); buildBar(); } else toast(r.reason, 'bad'); }
    return;
  }
  build.picked = itemAt(build.home, c.x, c.y); buildBar();
}
function buildBar() {
  const bb = $('#buildbar'); bb.hidden = false; const h = build.home;
  if (build.readOnly) { const n = NPC_HOMES.find((x) => x.id === build.plotId); bb.innerHTML = `<div style="flex:1"><h3>Visiting ${n.owner}'s home</h3><div class="small">Get inspired! ${n.owner} decorated with ${h.items.length} pieces.</div></div><button class="btn" id="bexit">Leave</button>`; $('#bexit').onclick = exitBuild; return; }
  const inv = Object.entries(state.inventory);
  bb.innerHTML = `<div class="bb-col" style="flex:1"><h3>Build mode — your inventory</h3><div class="inv" id="inv">${inv.length ? inv.map(([id, n]) => `<button data-inv="${id}" class="${build.sel?.id === id && build.sel.kind === 'new' ? 'sel' : ''}">${FURNITURE[id].name} ×${n}</button>`).join('') : '<span class="small">Empty — buy furniture at Paws & Pillows.</span>'}</div>
   <div class="small">Click an item, then click the floor to place · <b>R</b> rotate · click placed furniture to move/rotate/store/sell</div>
   <div id="pickbar">${build.picked ? `<b>${FURNITURE[build.picked.id].name}</b> <button class="btn ghost" id="pmove">Move</button> <button class="btn ghost" id="prot">Rotate</button> <button class="btn ghost" id="pstore">Store</button> <button class="btn red" id="psell">Sell (+${Math.floor(FURNITURE[build.picked.id].price / 2)})</button>` : ''}</div></div>
   <div class="bb-col"><b>Walls</b><div class="up">${WALLS.map((w, i) => `<button class="btn ${h.wall === i ? 'alt' : 'ghost'}" data-wall="${i}">${w.name}${w.price ? ' ' + w.price : ''}</button>`).join('')}</div>
   <b>Floor</b><div class="up">${FLOORS.map((w, i) => `<button class="btn ${h.floor === i ? 'alt' : 'ghost'}" data-floor="${i}">${w.name}${w.price ? ' ' + w.price : ''}</button>`).join('')}</div></div>
   <button class="btn" id="bexit">Exit home</button>`;
  bb.querySelector('#inv').onclick = (e) => { const b = e.target.closest('[data-inv]'); if (b) { build.sel = { kind: 'new', id: b.dataset.inv, rot: 0 }; build.picked = null; buildBar(); } };
  bb.querySelectorAll('[data-wall],[data-floor]').forEach((b) => b.onclick = () => { const kind = b.dataset.wall != null ? 'wall' : 'floor'; const r = upgrade(state, build.plotId, kind, +(b.dataset.wall ?? b.dataset.floor)); if (r.ok) { toast('Upgraded!', 'good'); hud(); persist(); buildBar(); } else toast(r.reason, 'bad'); });
  $('#bexit').onclick = exitBuild;
  if (build.picked) {
    const it = build.picked;
    $('#pmove').onclick = () => { build.sel = { kind: 'move', id: it.id, uid: it.uid, rot: it.rot }; build.picked = null; buildBar(); };
    $('#prot').onclick = () => { rotateSel(); buildBar(); };
    $('#pstore').onclick = () => { storeFurniture(state, build.plotId, it.uid); build.picked = null; persist(); buildBar(); };
    $('#psell').onclick = () => { const r = sellPlaced(state, build.plotId, it.uid); if (r.ok) toast(`Sold for ${r.refund} bones`, 'good'); build.picked = null; hud(); persist(); buildBar(); };
  }
}
function renderBuild() {
  const dpr = devicePixelRatio; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#121a36'; ctx.fillRect(0, 0, innerWidth, innerHeight); ctx.fillStyle = '#18234a'; for (let yy = 0; yy < innerHeight; yy += 32) for (let xx = (yy / 32) % 2 * 32; xx < innerWidth; xx += 64) ctx.fillRect(xx, yy, 32, 32);
  const { cell, ox, oy } = roomGeom(), h = build.home;
  const hiddenUid = build.sel?.kind === 'move' ? build.sel.uid : null;
  drawRoom(ctx, hiddenUid ? { ...h, items: h.items.filter((i) => i.uid !== hiddenUid) } : h, ox, oy, cell, ROOM_W, ROOM_H);
  if (!build.readOnly) { ctx.strokeStyle = 'rgba(90,64,48,0.12)'; ctx.lineWidth = 1; for (let x = 0; x <= ROOM_W; x++) { ctx.beginPath(); ctx.moveTo(ox + x * cell, oy); ctx.lineTo(ox + x * cell, oy + ROOM_H * cell); ctx.stroke(); } for (let y = 0; y <= ROOM_H; y++) { ctx.beginPath(); ctx.moveTo(ox, oy + y * cell); ctx.lineTo(ox + ROOM_W * cell, oy + y * cell); ctx.stroke(); } }
  if (build.picked) { const f = footprint(build.picked.id, build.picked.rot); ctx.strokeStyle = '#6c4fd0'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.strokeRect(ox + build.picked.x * cell, oy + build.picked.y * cell, f.w * cell, f.h * cell); ctx.setLineDash([]); }
  if (build.sel && build.hover) {
    const s = build.sel, c = build.hover, f = footprint(s.id, s.rot), okp = canPlace(h, s.id, c.x, c.y, s.rot, s.uid ?? null);
    ctx.fillStyle = okp ? 'rgba(63,166,106,0.3)' : 'rgba(217,83,79,0.35)'; ctx.fillRect(ox + c.x * cell, oy + c.y * cell, f.w * cell, f.h * cell);
    drawFurniture(ctx, s.id, ox + c.x * cell, oy + c.y * cell, cell, s.rot, 0.75);
  }
  // owner pup sitting in the room
  { const ni = +build.plotId.slice(1) - 1; drawShiba(ctx, ox + ROOM_W * cell - cell * 0.6, oy - cell * 0.2, { coat: build.readOnly ? ['tan', 'dark', 'cream', 'red'][ni] : state.player.coat, outfit: build.readOnly ? NPC_OUTFITS[ni] : state.wardrobe.equipped, scale: 1.5 }); }
  ctx.fillStyle = '#f2cc68'; ctx.font = '18px Silkscreen, monospace'; ctx.textAlign = 'center';
  ctx.fillText(build.readOnly ? `${NPC_HOMES.find((x) => x.id === build.plotId).owner}'s Home` : `${state.player.name}'s Home — Build & Decorate`, innerWidth / 2, 70);
}

// ---------------- Loop ----------------
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; time += dt;
  if (state) {
    simAcc += dt; while (simAcc >= 1.2) { simAcc -= 1.2; simulateTick(state, rng); if (panel?.kind === 'launch') launchUi(); }
    saveAcc += dt; if (saveAcc > 5) { saveAcc = 0; persist(); }
    if (panel?.kind === 'cafe' && panel.shift && !panel.shift.paid) { tickShift(panel.shift, dt, rng); cafeUi(); }
  }
  if (mode === 'world') { updateWorld(dt); renderWorld(); }
  else if (mode === 'build') { $('#prompt').hidden = true; renderBuild(); }
  requestAnimationFrame(frame);
}
titleScreen(); requestAnimationFrame(frame);
window.__inu = { cam, get state() { return state; }, get mode() { return mode; }, get panel() { return panel?.kind; } };
