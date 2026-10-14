import { TILE, MAP_W, MAP_H, MAP, T, BUILDINGS, PLOTS, NPC_HOMES, CLUBHOUSE, MALL_BUILDINGS, STATUE, LEADERS, PLOT_COST, findPath, moveBody, nearestInteractable, interactables, isSolid } from './world.js';
import { COATS, newGame, claimPlot, buyFurniture, placeFurniture, moveFurniture, storeFurniture, sellPlaced, sellFromInventory, upgrade, swapBonesToKibble, BONES_PER_KIBBLE } from './game.js';
import { FURNITURE, WALLS, FLOORS, ROOM_W, ROOM_H, canPlace, itemAt, footprint } from './furniture.js';
import { MENU, newShift, tickShift, addToTray, clearTray, serve, finishShift, SHIFT_LEN } from './cafe.js';
import { createToken, playerBuy, playerSell, simulateTick, seedTokens, holderCount, PLAYER, CREATE_FEE } from './launch.js';
import { price, marketCap, progress, fmtPrice } from './curve.js';
import { save, load } from './save.js';
import { OUTFITS, SLOTS, SLOT_NAMES, buyOutfit, equipOutfit, unequipSlot, ensureWardrobe } from './outfits.js';
import { mulberry32 } from './rng.js';
import { spawnNpcs, updateNpc, NPC_OUTFITS } from './npc.js';
import { npcHome } from './homes.js';
import { drawShiba, drawFurniture, drawRoom, drawMenuIcon, drawBoneIcon, drawEmblem } from './art.js';
import { ART, artReady, artKey } from './art.js';
import { makeAmbient, stepAmbient, throwBall, dayPhase, timeForHour, drawGroundLife, drawSkyLife, drawAtmosphere, drawEmote, lightsFor, addMail, unreadMail, EMOTES, DAY_LEN } from './ambient.js';
import { initAudio, setMuted, isMuted, footstep, chirp, bork, blip, uiClick, uiOpen, uiClose, textBlip, rustle } from './audio.js';
import { MALL_ITEMS, quote, buyMallItem, ensureMall, rollPeriods, fmtK, FEE_LABEL, OWNER, OWNER_WALLET, POOL_WALLETS, POOL_RULES, FEE_BPS } from './mall.js';
import { GAMES, boardRows, poolEntries } from './leaderboards.js';
import { prerenderMap, dynamicProps, buildingsReady } from './render.js';
import { N, SCALE, drawWater } from './tiles.js';
import { feel } from './feel.js';
import { ensurePacks, myPack, meIn, createPack, joinPack, leavePack, kickMember, recruitNpc, contribute, buyForPack, donateFurniture, upgradeClubhouse, placePackFurniture, movePackFurniture, storePackFurniture, postToBoard, recordActivity, memberScore, packScore, leaderboard, simulatePacks, packOfName, PACK_CREATE_COST, EMBLEMS, SEASON, SCORE, ME } from './packs.js';

const $ = (s) => document.querySelector(s);
const cv = $('#game'), ctx = cv.getContext('2d');
const rng = mulberry32((Date.now() & 0xffff) + 1);
let lastEarned = 0, amb = null, dayOffset = 0, stepAcc = 0, mailAcc = 0, photo = false;
let state = null, mapImg = null, npcs = [], mode = 'title';
const cam = { x: 0, y: 0 };
let vignette = null, miniBase = null;
const keys = new Set();
const touch = { x: 0, y: 0, id: null };
const COARSE = matchMedia('(pointer: coarse)');
function setA(label) { const b = document.getElementById('btn-a'); if (b && b.dataset.l !== label) { b.dataset.l = label; b.innerHTML = label ? `<span>${label}</span>` : 'A'; b.classList.toggle('ready', !!label); } }
const player = { face: 'down', dir: 1, phase: 0, moving: false, path: [], target: null };
let build = null; // {plotId, readOnly, home, sel:{kind:'new'|'move', id, uid, rot}, hover:{x,y}, picked}
let panel = null; // {kind, ...}
let packAcc = 0, simAcc = 0, saveAcc = 0, lastT = performance.now(), time = 0;
const fmt = (n, d = 2) => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : (+n).toFixed(d);
const fmtP = (p) => fmtPrice(p);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const packAct = (k) => { if (myPack(state)) recordActivity(state, k); };
const badgeOf = (p) => (p ? { tag: p.tag, color: p.color, emblem: p.emblem } : null);
function toast(msg, cls = '') { // de-duplicated: an identical visible toast is refreshed instead of stacking
  for (const e of document.querySelectorAll('#toast .toast')) if (e.dataset.msg === msg) { clearTimeout(e._t); e._t = setTimeout(() => e.remove(), 2200); return; }
  if ($('#toast').children.length >= 4) $('#toast').firstElementChild.remove();
  const d = document.createElement('div'); d.dataset.msg = msg; d.className = 'toast ' + cls; d.textContent = msg; $('#toast').appendChild(d); d._t = setTimeout(() => d.remove(), 2200); }
function persist() { if (state) { save(state, localStorage); } }
function hud() { $('#bones').textContent = Math.floor(state.bones); $('#kibble').textContent = state.kibble.toFixed(2); $('#hud-name').textContent = state.player.name; }

function resize() { cv.width = Math.round(innerWidth * devicePixelRatio); cv.height = Math.round(innerHeight * devicePixelRatio); vignette = null; document.body.classList.toggle('landscape', innerWidth > innerHeight); document.body.classList.toggle('short', innerHeight < 520); }
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 60)); window.visualViewport?.addEventListener('resize', resize); resize();

// ---------------- Title ----------------
let chosenCoat = 'tan';
function spriteCanvas(coat, outfit, w, h, scale, face = 'down', art) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; drawShiba(x, w / 2, h - 16, { coat, outfit, scale, face, art: art !== undefined ? art : artKey(coat, outfit) }); return c; }
function titleScreen() {
  const wrap = $('#coats');
  wrap.innerHTML = Object.entries(COATS).map(([k, c]) => `<button class="coat ${k === chosenCoat ? 'sel' : ''}" data-coat="${k}"><span class="cimg"></span>${c.name}</button>`).join('');
  const thumbs = () => wrap.querySelectorAll('.coat').forEach((b) => b.querySelector('.cimg').replaceChildren(spriteCanvas(b.dataset.coat, {}, 60, 76, 1)));
  thumbs(); artReady.then(thumbs); // redraw once the layered art atlases have loaded
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
      drawShiba(pc, x, 140, { art: artKey(coat, outfit), coat, outfit, scale: 2, phase: t / 90, moving: true, face, shadow: false });
      if (lbl) { pc.font = '8px Silkscreen, monospace'; pc.textAlign = 'center'; pc.fillStyle = '#f2cc68'; pc.fillText(lbl, x, 172); }
    }
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function startGame(s) {
  state = s; state.kibble ??= 20; ensureWardrobe(state); ensurePacks(state); ensureMall(state); state.clockSec ??= 0; lastEarned = state.stats.bonesEarned; mode = 'world';
  $('#title').hidden = true; $('#hud').hidden = false; $('#minimap-wrap').hidden = false;
  mapImg = prerenderMap(); npcs = spawnNpcs(rng, 6); npcs.forEach((n) => { n.art = artKey(n.coat); }); amb = makeAmbient(42);
  Promise.all([artReady, buildingsReady, document.fonts?.load('8px Silkscreen').catch(() => {})]).then(() => { mapImg = prerenderMap(); });
  feel.fade(); $('#hud').classList.add('in');
  cam.x = state.player.x; cam.y = state.player.y; hud(); persist();
}

// ---------------- Input ----------------
addEventListener('keydown', (e) => {
  if (e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase(); keys.add(k);
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === 'escape' && photo) return togglePhoto();
  initAudio();
  if (mode === 'world' && !panel && state) {
    if (k === 'b') { bork(); player.emote = { kind: 'bork', t: 1.2 }; }
    if (k === 't') { const d = throwBall(amb, state.player, player.face, npcs); blip(660); if (d) toast(`${d.name} is fetching!`, 'good'); }
    if (k === 'm') toggleMute();
    if (k === 'p') togglePhoto();
    if (k === 'g') toggleEmotes();
    const ek = ['1', '2', '3', '4', '5'].indexOf(k); if (ek >= 0) doEmote(Object.keys(EMOTES)[ek]);
  }
  if (feel.talking() && (k === 'e' || k === 'enter' || k === ' ')) { feel.advance(); return; }
  if (k === 'escape') { if (panel) closePanel(); else if (build) exitBuild(); }
  if (mode === 'world' && !panel && (k === 'e' || k === 'enter')) { const it = nearestInteractable(state, state.player.x, state.player.y); const pup = nearPup(); if (pup && !it) petPup(pup); else if (it) interact(it); }
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
$('#minimap').addEventListener('click', (e) => { if (mode === 'world' && !panel) { const r = e.target.getBoundingClientRect(); clickWorldTile(Math.floor((e.clientX - r.left) / 2), Math.floor((e.clientY - r.top) / 2)); } });
function clickWorldTile(tx, ty) {
    let target = null;
    for (const b of BUILDINGS) if (tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h) target = interactables(state).find((i) => i.id === b.id);
    for (const p of [...PLOTS, ...NPC_HOMES, CLUBHOUSE, ...MALL_BUILDINGS]) if (tx >= p.x && tx < p.x + p.w && ty >= p.y && ty < p.y + p.h) target = interactables(state).find((i) => i.id === p.id);
    const goal = target ? [target.tx, target.ty] : [tx, ty];
    const sx = Math.floor(state.player.x / TILE), sy = Math.floor(state.player.y / TILE);
    const path = findPath(sx, sy, goal[0], goal[1]);
    if (path) { player.path = path.slice(1); player.target = target; player.clickMark = { x: (goal[0] + 0.5) * TILE, y: (goal[1] + 0.5) * TILE, t: 1 }; }
}
$('#prompt').onclick = () => { const it = nearestInteractable(state, state.player.x, state.player.y); const pup = nearPup(); if (pup && !it) petPup(pup); else if (it) interact(it); };
addEventListener('pointerdown', () => initAudio(), { once: true });
document.addEventListener('pointerdown', (e) => { if (e.target.closest('button,.btn,.coat,[data-buy],[data-inv]')) { initAudio(); uiClick(); } });
function nearPup() { let b = null, bd = 56; for (const n of npcs) { const d = Math.hypot(n.x - state.player.x, n.y - state.player.y); if (d < bd) { bd = d; b = n; } } return b; }
function petPup(n) { n.emote = { kind: 'heart', t: 2.2 }; n.wag = 2.2; n.path = []; blip(990); feel.say(n.name, PUP_LINES[Math.floor(rng() * PUP_LINES.length)], textBlip); }
const PUP_LINES = ['Woof! That spot behind the ears... perfect!', 'Arf! Have you tried the taiyaki cart on Main Street?', 'Wanna race to Sakura Pond? Last one there is a wet biscuit!', 'I buried a bone by the big tree. Shh, it is a secret.', 'Bork bork! The Launch Hall is busy today.'];
function doEmote(kind) { player.emote = { kind, t: kind === 'zoomies' ? 2.4 : 2.5 }; $('#emotes').hidden = true; blip(kind === 'heart' ? 990 : 740);
  for (const n of npcs) if (Math.hypot(n.x - state.player.x, n.y - state.player.y) < 260 && rng() < 0.6) setTimeout(() => { n.emote = { kind: rng() < 0.5 ? kind : 'heart', t: 2 }; }, 400 + rng() * 600); }
function toggleEmotes() { const e = $('#emotes'); e.hidden = !e.hidden; }
$('#emotes').onclick = (e) => { const b = e.target.closest('[data-emote]'); if (b) doEmote(b.dataset.emote); };
function toggleMute() { setMuted(!isMuted()); $('#btn-mute').textContent = isMuted() ? 'Sound off' : 'Sound on'; }
function togglePhoto() { photo = !photo; document.body.classList.toggle('photo', photo); }
$('#btn-mute').onclick = () => { initAudio(); toggleMute(); };
$('#btn-emote').onclick = () => toggleEmotes();
$('#btn-photo').onclick = () => togglePhoto();
$('#photo-save').onclick = () => { const a = document.createElement('a'); a.download = `inu-verse-${Date.now()}.png`; a.href = cv.toDataURL('image/png'); a.click(); toast('Photo saved', 'good'); };
$('#photo-exit').onclick = () => togglePhoto();
$('#btn-phantom').onclick = () => toast('Phantom wallet support is coming soon — nothing is connected.', '');
$('#btn-help').onclick = () => openPanel('help');
$('#btn-pack').onclick = () => { if (mode === 'world') openPanel('packs'); };
$('#btn-wardrobe').onclick = () => { if (mode === 'world') openPanel('wardrobe'); };
$('#panel-close').onclick = () => closePanel();
// ---- touch controls (virtual stick on the left, A/B + menu on the right) ----
{ const pad = $('#stick'), knob = $('#knob');
  const upd = (e) => { const r = pad.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2; let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; const m = Math.hypot(dx, dy) / R; if (m < 0.22) { touch.x = touch.y = 0; return; } touch.x = dx / (m * R); touch.y = dy / (m * R);
    if (Math.abs(touch.x) < 0.38) touch.x = 0; if (Math.abs(touch.y) < 0.38) touch.y = 0; };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); touch.id = e.pointerId; pad.setPointerCapture(e.pointerId); pad.classList.add('on'); upd(e); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === touch.id) upd(e); });
  const end = (e) => { if (e.pointerId !== touch.id) return; touch.id = null; touch.x = touch.y = 0; knob.style.transform = ''; pad.classList.remove('on'); };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  const act = () => { if (feel.talking()) return feel.advance(); if (mode !== 'world' || panel || !state) return; const it = nearestInteractable(state, state.player.x, state.player.y); const pup = nearPup(); if (pup && !it) petPup(pup); else if (it) interact(it); };
  $('#btn-a').addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); act(); });
  $('#btn-b').addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); if (mode === 'world' && !panel && state) { bork(); player.emote = { kind: 'bork', t: 1.2 }; } });
  $('#btn-menu').addEventListener('pointerdown', (e) => { e.preventDefault(); document.body.classList.toggle('menu-open'); });
}

// ---------------- World update ----------------
function updateWorld(dt) {
  const p = state.player; let dx = 0, dy = 0;
  if (!panel) {
    if (keys.has('w') || keys.has('arrowup')) dy -= 1; if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1; if (keys.has('d') || keys.has('arrowright')) dx += 1;
  }
  if (!panel && (touch.x || touch.y)) { dx = touch.x; dy = touch.y; }
  const speed = 150;
  if (dx || dy) { player.path = []; player.target = null; const l = Math.hypot(dx, dy); moveBody(p, (dx / l) * speed * dt, (dy / l) * speed * dt); if (dx) player.dir = dx > 0 ? 1 : -1; player.face = dx ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); player.moving = true; }
  else if (player.path.length) {
    const [tx, ty] = player.path[0], gx = (tx + 0.5) * TILE, gy = (ty + 0.5) * TILE, ddx = gx - p.x, ddy = gy - p.y, d = Math.hypot(ddx, ddy), st = speed * dt;
    if (d <= st) { p.x = gx; p.y = gy; player.path.shift(); if (!player.path.length && player.target) { const t = player.target; player.target = null; interact(t); } }
    else { p.x += (ddx / d) * st; p.y += (ddy / d) * st; }
    if (Math.abs(ddx) > 1) player.dir = ddx > 0 ? 1 : -1; if (d > 0.5) player.face = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'right' : 'left') : (ddy > 0 ? 'down' : 'up'); player.moving = true;
  } else player.moving = false;
  if (player.moving) player.phase += dt * 12; else player.phase += dt * 2;
  for (const n of npcs) { if (amb.ball?.dog === n && amb.ball.state !== 'air') continue; if (n.wag > 0) { n.wag -= dt; n.moving = true; n.phase += dt * 20; continue; } if (n.emote) { n.emote.t -= dt; if (n.emote.t <= 0) n.emote = null; } updateNpc(n, dt, rng); }
  if (player.emote) { player.emote.t -= dt; if (player.emote.kind === 'zoomies') { const a = player.emote.t * 5; moveBody(p, Math.cos(a) * 260 * dt, Math.sin(a) * 260 * dt); player.moving = true; player.phase += dt * 20; player.face = Math.cos(a + 1.57) > 0 ? 'right' : 'left'; } if (player.emote.t <= 0) player.emote = null; }
  for (const e of stepAmbient(amb, dt, p, npcs)) { if (e.kind === 'flush') chirp(); if (e.kind === 'fetched') toast(`${e.who} brought the ball back!`, 'good'); }
  if (rng() < dt * 0.08) chirp();
  if (player.moving) { stepAcc += dt; if (stepAcc > 0.26) { stepAcc = 0; const tt = MAP[Math.floor(p.y / TILE)]?.[Math.floor(p.x / TILE)]; if (tt === T.GRASS || tt === T.FLOWER) { feel.rustle(p.x, p.y + 10); rustle(); } else { feel.dust(p.x, p.y + 11); footstep(); } } }
  feel.step(dt);
  mailAcc += dt; if (mailAcc > 45) { mailAcc = 0; if (rng() < 0.6 && addMail(state, rng)) { toast('New note in your mailbox!', 'good'); persist(); } }
  // smooth camera
  const k = 1 - Math.pow(0.004, dt), lead = player.moving ? 18 : 0, fx = { left: -1, right: 1 }[player.face] || 0, fy = { up: -1, down: 1 }[player.face] || 0;
  cam.x += (p.x + fx * lead - cam.x) * k; cam.y += (p.y + fy * lead * 0.6 - cam.y) * k;
  const hw = innerWidth / 2, hh = innerHeight / 2;
  cam.x = Math.max(hw, Math.min(MAP_W * TILE - hw, cam.x)); cam.y = Math.max(hh, Math.min(MAP_H * TILE - hh, cam.y));
  if (MAP_W * TILE < innerWidth) cam.x = MAP_W * TILE / 2; if (MAP_H * TILE < innerHeight) cam.y = MAP_H * TILE / 2;
  const it = !panel && nearestInteractable(state, p.x, p.y);
  const pr = $('#prompt');
  const pup = !panel && !it && nearPup();
  const tch = COARSE.matches;
  if (pup) { pr.hidden = false; pr.innerHTML = tch ? `<kbd class="ta">A</kbd>Pet ${esc(pup.name)}` : `<kbd>E</kbd>Pet ${esc(pup.name)} · <kbd>T</kbd> throw ball`; setA('PET'); }
  else if (it) { pr.hidden = false; const verb = { building: 'Enter', plot: state.plots[it.id] ? 'Enter' : 'Inspect', visit: 'Visit', stall: 'View', clubhouse: myPack(state) ? 'Decorate' : 'Open', mall: 'Enter' }[it.kind]; pr.innerHTML = `<kbd${tch ? ' class="ta"' : ''}>${tch ? 'A' : 'E'}</kbd>${verb} ${esc(it.name)}`; pr.dataset.target = it.id; setA(verb.toUpperCase()); }
  else { pr.hidden = true; setA(''); }
}

function renderWorld() {
  const dpr = devicePixelRatio, vw = innerWidth, vh = innerHeight; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#141a2e'; ctx.fillRect(0, 0, vw, vh);
  // integer camera snapped to the native pixel grid (2px) so tiles never shimmer
  const ox = Math.round((vw / 2 - cam.x) / SCALE) * SCALE, oy = Math.round((vh / 2 - cam.y) / SCALE) * SCALE;
  const G = mapImg.ground, sx = Math.max(0, -ox / SCALE), sy = Math.max(0, -oy / SCALE), sw = Math.min(G.width - sx, Math.ceil(vw / SCALE) + 1), sh = Math.min(G.height - sy, Math.ceil(vh / SCALE) + 1);
  ctx.drawImage(G, sx, sy, sw, sh, ox + sx * SCALE, oy + sy * SCALE, sw * SCALE, sh * SCALE);
  ctx.save(); ctx.translate(ox, oy);
  { // animated water (native pixels, scaled)
    const tx0 = Math.floor(-ox / TILE) - 1, ty0 = Math.floor(-oy / TILE) - 1; ctx.save(); ctx.scale(SCALE, SCALE); drawWater(ctx, time, tx0, ty0, tx0 + Math.ceil(vw / TILE) + 2, ty0 + Math.ceil(vh / TILE) + 2); ctx.restore(); }
  const phase = dayPhase(time + dayOffset);
  const dyn = dynamicProps(state, time, myPack(state));
  for (const d of dyn) if (d.flat) d.d(ctx);
  drawGroundLife(ctx, amb, phase); feel.drawGround(ctx);
  if (player.clickMark && player.path.length) { const m = player.clickMark, k = Math.round(10 + Math.sin(time * 6) * 2); ctx.fillStyle = '#f2cc68'; for (const [ax, ay] of [[-k, 0], [k - 4, 0], [0, -k / 2], [0, k / 2 - 2]]) ctx.fillRect(Math.round(m.x + ax), Math.round(m.y + 6 + ay), 4, 3); }
  const actors = [...npcs.map((n) => ({ ...n, npc: true, badge: badgeOf(packOfName(state, n.name)) })), { x: state.player.x, y: state.player.y, coat: state.player.coat, outfit: state.wardrobe.equipped, face: player.face, phase: player.phase, moving: player.moving, name: state.player.name, me: true, badge: badgeOf(myPack(state)), emote: player.emote, art: artKey(state.player.coat, state.wardrobe.equipped) }, ...streetPups()];
  // one depth-sorted list: static props (culled), dynamic props and actors, by ground y
  const L = -ox - 200, Rt = -ox + vw + 200, Tp = -oy - 60, Bt = -oy + vh + 400, list = [];
  for (const p of mapImg.props) if (p.y > Tp && p.y < Bt) list.push(p);
  for (const p of dyn) if (!p.flat) list.push(p);
  for (const a of actors) if (a.x > L && a.x < Rt && a.y > Tp && a.y < Bt) list.push({ y: a.y + 12, a });
  list.sort((p, q) => p.y - q.y);
  for (const it of list) {
    if (!it.a) { it.d(ctx); continue; }
    const a = it.a;
    if (a.statue) { ctx.fillStyle = '#6a6080'; ctx.fillRect(Math.round(a.x - 34), Math.round(a.y - 4), 68, 18); ctx.fillStyle = '#d4a640'; ctx.fillRect(Math.round(a.x - 38), Math.round(a.y - 8), 76, 5); ctx.fillStyle = '#121a36'; ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = 'center'; ctx.fillText('PRESIDENT INU', Math.round(a.x), Math.round(a.y + 8)); ctx.save(); ctx.filter = 'sepia(1) saturate(2.6) brightness(1.05)'; drawShiba(ctx, a.x, a.y - 10, { art: a.art, scale: 2, shadow: false }); ctx.restore(); continue; }
    if (a.me) { ctx.fillStyle = 'rgba(242,204,104,0.45)'; ctx.fillRect(Math.round(a.x - 20), Math.round(a.y + 9), 40, 4); ctx.fillRect(Math.round(a.x - 14), Math.round(a.y + 7), 28, 8); }
    drawShiba(ctx, a.x, a.y, { coat: a.coat, outfit: a.outfit, face: a.face, phase: a.phase, moving: a.moving, name: a.name, scale: 1.5, badge: a.badge, art: a.art, emote: a.emote?.kind });
    if (a.emote) drawEmote(ctx, a.x, a.y + (a.name ? -14 : 0), a.emote.kind, time);
  }
  feel.drawAir(ctx);
  drawSkyLife(ctx, amb, phase);
  const it = !panel && nearestInteractable(state, state.player.x, state.player.y); if (it) feel.bubble(ctx, (it.tx + 0.5) * TILE, (it.ty) * TILE - 6, time);
  ctx.restore();
  drawAtmosphere(ctx, amb, phase, { x: vw / 2 - ox, y: vh / 2 - oy }, vw, vh, lightsFor(state, phase, homeId()));
  $('#clock').textContent = `${String(Math.floor(phase.hour)).padStart(2, '0')}:${String(Math.floor((phase.hour % 1) * 60)).padStart(2, '0')} ${amb.rain > 0.3 ? 'rain' : phase.label}`;
  if (!vignette || vignette.width !== vw || vignette.height !== vh) { vignette = document.createElement('canvas'); vignette.width = vw; vignette.height = vh; const v = vignette.getContext('2d'), g = v.createRadialGradient(vw / 2, vh / 2, vh * 0.45, vw / 2, vh / 2, vh * 1.05); g.addColorStop(0, 'rgba(18,26,54,0)'); g.addColorStop(1, 'rgba(12,16,34,0.38)'); v.fillStyle = g; v.fillRect(0, 0, vw, vh); }
  ctx.drawImage(vignette, 0, 0);
  minimap(-ox, -oy, vw, vh);
}

function homeId() { if (mode === 'build' && build && !build.readOnly && !build.pack) return build.plotId; for (const p of PLOTS) if (state.plots[p.id] && Math.abs(state.player.x / TILE - (p.x + 3)) < 5 && Math.abs(state.player.y / TILE - (p.y + 3)) < 5) return p.id; return null; }
// busker by the clubhouse plaza + two pups playing by Sakura Pond
function streetPups() {
  const t = time, chase = Math.sin(t * 0.9) * 50;
  return [{ x: 45.5 * TILE, y: 8.4 * TILE, coat: 'golden', art: 'shiba-golden', face: Math.sin(t * 2) > 0 ? 'right' : 'left', phase: t * 8, moving: true, name: 'Busker Biscuit' },
    { x: 35.5 * TILE, y: 67.6 * TILE, coat: 'golden', outfit: { top: 'gold_suit', hat: 'crown', neck: 'diamond_chain', bottom: 'slacks_black', feet: 'loafers' }, face: 'down', phase: t * 2, moving: false, name: 'President Inu' },
    { x: (STATUE.x + 1) * TILE, y: (STATUE.y + 0.9) * TILE, coat: 'golden', art: 'shiba-golden', statue: true, face: 'down', phase: 0, moving: false },
    { x: 9 * TILE + chase, y: 9.3 * TILE, coat: 'cream', art: 'shiba-cream', face: Math.cos(t * 0.9) > 0 ? 'right' : 'left', phase: t * 14, moving: true },
    { x: 9 * TILE + chase - 46 * Math.sign(Math.cos(t * 0.9)), y: 9.5 * TILE, coat: 'red', art: 'shiba-red', face: Math.cos(t * 0.9) > 0 ? 'right' : 'left', phase: t * 14 + 2, moving: true }];
}

function minimap(vx, vy, vw, vh) {
  const m = $('#minimap').getContext('2d'), s = 2;
  if (!miniBase) { miniBase = document.createElement('canvas'); miniBase.width = MAP_W * s; miniBase.height = MAP_H * s; const b = miniBase.getContext('2d');
    const col = { [T.GRASS]: '#52a349', [T.FLOWER]: '#62b05a', [T.ROAD]: '#4a4f63', [T.WALK]: '#dcd3bc', [T.PLAZA]: '#d6b383', [T.BUILDING]: '#e3b341', [T.WATER]: '#2f6cbd', [T.TREE]: '#2c7040', [T.PLOT]: '#a8764a', [T.HOME]: '#c8323c' };
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) { b.fillStyle = col[MAP[y][x]]; b.fillRect(x * s, y * s, s, s); } }
  m.drawImage(miniBase, 0, 0);
  for (const p of PLOTS) if (state.plots[p.id]) { m.fillStyle = '#f2cc68'; m.fillRect(p.x * s, p.y * s, p.w * s, p.h * s); }
  { const pk = myPack(state); m.fillStyle = pk ? pk.color : '#6a8a4a'; m.fillRect(CLUBHOUSE.x * s, CLUBHOUSE.y * s, CLUBHOUSE.w * s, CLUBHOUSE.h * s); }
  if (vw) { m.strokeStyle = 'rgba(255,246,224,.85)'; m.lineWidth = 1; m.strokeRect(Math.round(vx / TILE * s) + 0.5, Math.round(vy / TILE * s) + 0.5, Math.round(vw / TILE * s), Math.round(vh / TILE * s)); }
  m.fillStyle = '#fff'; for (const n of npcs) m.fillRect(Math.round(n.x / TILE * s) - 1, Math.round(n.y / TILE * s) - 1, 2, 2);
  const blink = Math.floor(time * 3) % 2; m.fillStyle = '#141a2e'; m.fillRect(Math.round(state.player.x / TILE * s) - 3, Math.round(state.player.y / TILE * s) - 3, 6, 6); m.fillStyle = blink ? '#ff5a5a' : '#ffd84a'; m.fillRect(Math.round(state.player.x / TILE * s) - 2, Math.round(state.player.y / TILE * s) - 2, 4, 4);
}

// ---------------- Interactions ----------------
function interact(it) {
  if (it.kind === 'building') openPanel(it.id);
  else if (it.kind === 'plot') { if (state.plots[it.id]) enterBuild(it.id, false); else openPanel('plot', { plotId: it.id }); }
  else if (it.kind === 'visit') enterBuild(it.id, true);
  else if (it.kind === 'stall') openPanel('launch', { sel: it.id });
  else if (it.kind === 'mall') openPanel('mall', { cat: it.cat, store: it.id });
  else if (it.kind === 'clubhouse') { if (myPack(state)) enterBuild('clubhouse', false); else openPanel('packs'); }
}

function openPanel(kind, opts = {}) {
  if (!panel) { feel.fade(); uiOpen(); } panel = { kind, ...opts }; $('#panel').hidden = false; $('#prompt').hidden = true; keys.clear();
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
  else if (kind === 'packs') renderPacks();
  else if (kind === 'mall') renderMall();
  else if (kind === 'mail') { const m = state.mail || []; body.innerHTML = `<h2>Mailbox</h2><p class="sub">Notes neighbours left at your door.</p><div class="board">${m.map((n) => `<div class="post ${n.read ? '' : 'mine'}"><b>${esc(n.from)}</b> ${esc(n.text)}</div>`).join('') || '<p class="small">No mail yet — neighbours drop by now and then.</p>'}</div>`; m.forEach((n) => n.read = true); persist(); }
  else if (kind === 'cars') body.innerHTML = `<h2>Zoomies Motors</h2><p class="sub">Scooters, convertibles and the legendary Bone-mobile — arriving in a future update.</p><div class="demo-banner">Car Dealer: coming soon</div>`;
  else if (kind === 'help') body.innerHTML = `<h2>How to play</h2><ul><li>Walk with <b>WASD</b>/<b>arrows</b> or <b>click</b> anywhere.</li><li>Press <b>E</b> near doors and signs.</li><li>Earn <b>bones</b> serving orders at the Shiba Sips Café.</li><li>Claim a plot (${PLOT_COST} bones), buy furniture at Paws & Pillows, decorate (R to rotate).</li><li>Buy clothes at <b>Fetch Fashion</b> and dress up in your <b>Wardrobe</b> (HUD button).</li><li>Launch Hall: create and trade <b>simulated</b> tokens paired with demo <b>$KIBBLE</b>. Nothing here is real money or on any blockchain.</li><li><b>Packs</b>: found or join a Pack (HUD button), chip in bones to the treasury, decorate the shared clubhouse north of Market Row and climb the Kibble Cup. Packs are simulated locally for now.</li><li>Visit Mochi, Kuro, Hana and Taro's homes on Sakura Lane.</li></ul><button class="btn red" id="reset">Reset save</button>`;
  if (kind === 'help') $('#reset').onclick = () => { if (confirm('Delete your local save?')) { localStorage.clear(); location.reload(); } };
}
function closePanel() {
  if (panel?.kind === 'cafe' && panel.shift && !panel.shift.settled && panel.shift.earned > 0) { finishShift(state, panel.shift); packAct('shift'); toast(`Shift ended early: +${panel.shift.paid} bones`, 'good'); hud(); persist(); }
  if (panel) uiClose(); panel = null; $('#panel').hidden = true;
}

function iconCanvas(draw, w = 64, h = 52) { const c = document.createElement('canvas'); c.width = w * 2; c.height = h * 2; c.style.width = w + 'px'; c.style.height = h + 'px'; const x = c.getContext('2d'); x.scale(2, 2); draw(x); return c; }

function renderShop() {
  const body = $('#panel-body');
  body.innerHTML = `<h2>Paws & Pillows</h2><p class="sub">Furniture for discerning dogs. Items go to your inventory — place them from build mode in your home.${Object.keys(state.plots).length ? '' : ' <b>Tip: claim a plot first!</b>'}</p><div class="grid" id="shopgrid"></div>`;
  const grid = $('#shopgrid');
  for (const [id, d] of Object.entries(FURNITURE)) {
    if (d.mall) continue;
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
    if (d.mall) continue;
    const own = w.owned.includes(id), on = w.equipped[d.slot] === id;
    const card = document.createElement('div'); card.className = 'card' + (on ? ' on' : ''); card.dataset.item = id;
    card.appendChild(wearPreview(id)); // dressed layered-art preview of this item on your coat
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
  if (s.over && !s.settled) {
    const total = finishShift(state, s); packAct('shift'); hud(); persist();
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
  $('#tcreate').onclick = () => { const r = createToken(state, { name: $('#tname').value, ticker: $('#tticker').value, color: $('#tcolor').value }); if (r.ok) { packAct('token'); panel.sel = r.token.id; toast(`$${r.token.ticker} launched! A stall opened on Market Row.`, 'good'); hud(); persist(); renderLaunch(); } else toast(r.reason, 'bad'); };
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
  const pack = id === 'clubhouse';
  feel.fade(); uiOpen(); mode = 'build'; const home = pack ? myPack(state).clubhouse : readOnly ? npcHome(id) : state.plots[id];
  build = { plotId: id, readOnly, pack, home, sel: null, hover: null, picked: null };
  $('#prompt').hidden = true; $('#minimap-wrap').hidden = true; buildBar();
}
function exitBuild() { feel.fade(); uiClose(); mode = 'world'; build = null; $('#buildbar').hidden = true; $('#minimap-wrap').hidden = false; persist(); }
function rotateSel() { if (build?.sel) { build.sel.rot = (build.sel.rot + 1) % 4; } else if (build?.picked) { const it = build.picked; const r = build.pack ? movePackFurniture(state, it.uid, it.x, it.y, (it.rot + 1) % 4) : moveFurniture(state, build.plotId, it.uid, it.x, it.y, (it.rot + 1) % 4); if (!r.ok) toast('No room to rotate here', 'bad'); persist(); } }
function buildClick(c) {
  if (!build || build.readOnly) return;
  if (build.sel) {
    const s = build.sel;
    if (s.kind === 'new') { const r = build.pack ? placePackFurniture(state, s.id, c.x, c.y, s.rot) : placeFurniture(state, build.plotId, s.id, c.x, c.y, s.rot); if (r.ok) { if (!build.pack) packAct('decor'); toast(`Placed ${FURNITURE[s.id].name}`, 'good'); if (!(build.pack ? myPack(state).pool : state.inventory)[s.id]) build.sel = null; persist(); buildBar(); } else toast(r.reason, 'bad'); }
    else { const r = build.pack ? movePackFurniture(state, s.uid, c.x, c.y, s.rot) : moveFurniture(state, build.plotId, s.uid, c.x, c.y, s.rot); if (r.ok) { build.sel = null; persist(); buildBar(); } else toast(r.reason, 'bad'); }
    return;
  }
  build.picked = itemAt(build.home, c.x, c.y); buildBar();
}
function buildBar() {
  const bb = $('#buildbar'); bb.hidden = false; const h = build.home;
  if (build.pack) return packBuildBar(bb, h);
  if (build.readOnly) { const n = NPC_HOMES.find((x) => x.id === build.plotId); bb.innerHTML = `<div style="flex:1"><h3>Visiting ${n.owner}'s home</h3><div class="small">Get inspired! ${n.owner} decorated with ${h.items.length} pieces.</div></div><button class="btn" id="bexit">Leave</button>`; $('#bexit').onclick = exitBuild; return; }
  const inv = Object.entries(state.inventory);
  bb.innerHTML = `<div class="bb-col" style="flex:1"><h3>Build mode — your inventory</h3><div class="inv" id="inv">${inv.length ? inv.map(([id, n]) => `<button data-inv="${id}" class="${build.sel?.id === id && build.sel.kind === 'new' ? 'sel' : ''}">${FURNITURE[id].name} ×${n}</button>`).join('') : '<span class="small">Empty — buy furniture at Paws & Pillows.</span>'}</div>
   <div class="small">Click an item, then click the floor to place · <b>R</b> rotate · click placed furniture to move/rotate/store/sell</div>
   <div id="pickbar">${build.picked ? `<b>${FURNITURE[build.picked.id].name}</b> <button class="btn ghost" id="pmove">Move</button> <button class="btn ghost" id="prot">Rotate</button> <button class="btn ghost" id="pstore">Store</button> <button class="btn red" id="psell">Sell (+${Math.floor(FURNITURE[build.picked.id].price / 2)})</button>` : ''}</div></div>
   <div class="bb-col"><b>Walls</b><div class="up">${WALLS.map((w, i) => `<button class="btn ${h.wall === i ? 'alt' : 'ghost'}" data-wall="${i}">${w.name}${w.price ? ' ' + w.price : ''}</button>`).join('')}</div>
   <b>Floor</b><div class="up">${FLOORS.map((w, i) => `<button class="btn ${h.floor === i ? 'alt' : 'ghost'}" data-floor="${i}">${w.name}${w.price ? ' ' + w.price : ''}</button>`).join('')}</div></div>
   <div class="bb-col"><button class="btn alt" id="bmail">Mailbox (${unreadMail(state)} new)</button><button class="btn" id="bexit">Exit home</button></div>`;
  bb.querySelector('#inv').onclick = (e) => { const b = e.target.closest('[data-inv]'); if (b) { build.sel = { kind: 'new', id: b.dataset.inv, rot: 0 }; build.picked = null; buildBar(); } };
  bb.querySelectorAll('[data-wall],[data-floor]').forEach((b) => b.onclick = () => { const kind = b.dataset.wall != null ? 'wall' : 'floor'; const r = upgrade(state, build.plotId, kind, +(b.dataset.wall ?? b.dataset.floor)); if (r.ok) { toast('Upgraded!', 'good'); hud(); persist(); buildBar(); } else toast(r.reason, 'bad'); });
  $('#bexit').onclick = exitBuild; $('#bmail').onclick = () => openPanel('mail');
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
  if (build.pack) { const pk = myPack(state); pk.members.slice(0, 6).forEach((m, i) => drawShiba(ctx, ox + cell * 0.8 + i * cell * 1.1, oy - cell * 0.15, { coat: m.coat, outfit: m.id === ME ? state.wardrobe.equipped : NPC_OUTFITS[i % NPC_OUTFITS.length], scale: 1, shadow: false }));
    const bx = ox + ROOM_W * cell - cell * 1.6, by0 = oy - cell * 1.5; ctx.fillStyle = pk.color; ctx.fillRect(bx, by0, cell * 1.4, cell * 1.2); ctx.fillStyle = '#d4a640'; ctx.fillRect(bx, by0 + cell * 1.2, cell * 1.4, 4); drawEmblem(ctx, pk.emblem, bx + cell * 0.35, by0 + cell * 0.2, cell * 0.14, '#fff6e0'); }
  else { const ni = +build.plotId.slice(1) - 1; drawShiba(ctx, ox + ROOM_W * cell - cell * 0.6, oy - cell * 0.2, { coat: build.readOnly ? ['tan', 'dark', 'cream', 'red'][ni] : state.player.coat, outfit: build.readOnly ? NPC_OUTFITS[ni] : state.wardrobe.equipped, scale: 1.5 }); }
  ctx.fillStyle = '#f2cc68'; ctx.font = '18px Silkscreen, monospace'; ctx.textAlign = 'center';
  ctx.fillText(build.pack ? `${myPack(state).name} [${myPack(state).tag}] Clubhouse — decorate together` : build.readOnly ? `${NPC_HOMES.find((x) => x.id === build.plotId).owner}'s Home` : `${state.player.name}'s Home — Build & Decorate`, innerWidth / 2, 70);
}

// ---------------- Packs ----------------
function emblemCanvas(p, size = 34) { return iconCanvas((x) => { x.fillStyle = '#121a36'; x.fillRect(0, 0, size, size); x.fillStyle = p.color; x.fillRect(2, 2, size - 4, size - 6); x.fillStyle = '#d4a640'; x.fillRect(2, size - 6, size - 4, 3); drawEmblem(x, p.emblem, size / 2 - 7.5, size / 2 - 9, 3, '#fff6e0'); }, size, size); }
function packBuildBar(bb, h) {
  const pk = myPack(state), pool = Object.entries(pk.pool), inv = Object.entries(state.inventory);
  bb.innerHTML = `<div class="bb-col" style="flex:1"><h3>Pack furniture pool <span class="small">· treasury <b id="ptreas">${pk.treasury}</b> bones</span></h3><div class="inv" id="inv">${pool.length ? pool.map(([id, n]) => `<button data-inv="${id}" class="${build.sel?.id === id && build.sel.kind === 'new' ? 'sel' : ''}">${FURNITURE[id].name} ×${n}</button>`).join('') : '<span class="small">Pool empty — buy with the treasury or donate from your inventory.</span>'}</div>
   <div class="small">Pick from the shared pool, click the floor to place · <b>R</b> rotate · click placed items to move/store. Everyone in the Pack decorates here.</div>
   <div id="pickbar">${build.picked ? `<b>${FURNITURE[build.picked.id].name}</b> <span class="small">by ${esc(pk.members.find((m) => m.id === build.picked.by)?.name || 'a former member')}</span> <button class="btn ghost" id="pmove">Move</button> <button class="btn ghost" id="prot">Rotate</button> <button class="btn ghost" id="pstore">Store to pool</button>` : ''}</div>
   <b>Buy for the Pack (treasury)</b><div class="inv" id="pbuy">${Object.entries(FURNITURE).filter(([, d]) => !d.mall).map(([id, d]) => `<button data-pbuy="${id}">${d.name} ${d.price}</button>`).join('')}</div>
   ${inv.length ? `<b>Donate from your inventory</b><div class="inv" id="pdon">${inv.map(([id, n]) => `<button data-don="${id}">${FURNITURE[id].name} ×${n}</button>`).join('')}</div>` : ''}</div>
   <div class="bb-col"><b>Walls (treasury)</b><div class="up">${WALLS.map((w, i) => `<button class="btn ${h.wall === i ? 'alt' : 'ghost'}" data-wall="${i}">${w.name}${w.price ? ' ' + w.price : ''}</button>`).join('')}</div>
   <b>Floor (treasury)</b><div class="up">${FLOORS.map((w, i) => `<button class="btn ${h.floor === i ? 'alt' : 'ghost'}" data-floor="${i}">${w.name}${w.price ? ' ' + w.price : ''}</button>`).join('')}</div></div>
   <button class="btn" id="bexit">Exit clubhouse</button>`;
  bb.querySelector('#inv').onclick = (e) => { const b = e.target.closest('[data-inv]'); if (b) { build.sel = { kind: 'new', id: b.dataset.inv, rot: 0 }; build.picked = null; buildBar(); } };
  bb.querySelector('#pbuy').onclick = (e) => { const b = e.target.closest('[data-pbuy]'); if (!b) return; const r = buyForPack(state, b.dataset.pbuy); toast(r.ok ? `Pack bought ${FURNITURE[b.dataset.pbuy].name}` : r.reason, r.ok ? 'good' : 'bad'); if (r.ok) { persist(); buildBar(); } };
  bb.querySelector('#pdon')?.addEventListener('click', (e) => { const b = e.target.closest('[data-don]'); if (!b) return; const r = donateFurniture(state, b.dataset.don); if (r.ok) { toast('Donated to the Pack pool', 'good'); persist(); buildBar(); } });
  bb.querySelectorAll('[data-wall],[data-floor]').forEach((b) => b.onclick = () => { const kind = b.dataset.wall != null ? 'wall' : 'floor'; const r = upgradeClubhouse(state, kind, +(b.dataset.wall ?? b.dataset.floor)); toast(r.ok ? 'Clubhouse upgraded!' : r.reason, r.ok ? 'good' : 'bad'); if (r.ok) { persist(); buildBar(); } });
  $('#bexit').onclick = exitBuild;
  if (build.picked) {
    const it = build.picked;
    $('#pmove').onclick = () => { build.sel = { kind: 'move', id: it.id, uid: it.uid, rot: it.rot }; build.picked = null; buildBar(); };
    $('#prot').onclick = () => { rotateSel(); buildBar(); };
    $('#pstore').onclick = () => { storePackFurniture(state, it.uid); build.picked = null; persist(); buildBar(); };
  }
}

function renderPacks() {
  ensurePacks(state); const body = $('#panel-body'), pk = myPack(state), tab = panel.tab || (pk ? 'home' : 'find');
  panel.tab = tab;
  const tabs = (pk ? [['home', 'My Pack'], ['board', 'Pack board'], ['cup', 'Kibble Cup']] : [['find', 'Find a Pack'], ['create', 'Found a Pack'], ['cup', 'Kibble Cup']]);
  body.innerHTML = `<div class="demo-banner">Packs are simulated locally for now — NPC members, posts and scores run in your browser</div><h2>Packs</h2>
    <div class="row tabs" style="justify-content:flex-start;margin:0 0 10px">${tabs.map(([k, l]) => `<button class="btn ${k === tab ? '' : 'ghost'}" data-tab="${k}">${l}</button>`).join('')}</div><div id="packbody"></div>`;
  body.querySelector('.tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) { panel.tab = b.dataset.tab; renderPacks(); } };
  const el = $('#packbody'), done = (r, msg) => { if (r.ok) { if (msg) toast(msg, 'good'); hud(); persist(); renderPacks(); } else toast(r.reason, 'bad'); };
  if (tab === 'find') {
    el.innerHTML = `<p class="sub">Join a Pack to share a clubhouse, chip in bones and compete in the ${SEASON.name}.</p><div class="packlist">${leaderboard(state).map((r) => `<div class="card packrow" data-row="${r.id}"><span class="em"></span><div style="flex:1;text-align:left"><b>${esc(r.name)}</b> <span class="tagchip" style="background:${r.color}">[${r.tag}]</span><div class="small">${r.members} members · <span data-pscore="${r.id}">${r.score}</span> pts · #${r.rank}</div></div><button class="btn green" data-join="${r.id}">Join</button></div>`).join('')}</div>`;
    el.querySelectorAll('[data-row]').forEach((d) => d.querySelector('.em').appendChild(emblemCanvas(state.packs.all[d.dataset.row])));
    el.onclick = (e) => { const b = e.target.closest('[data-join]'); if (b) { const r = joinPack(state, b.dataset.join); if (r.ok) panel.tab = 'home'; done(r, `Welcome to ${r.pack?.name}!`); } };
  } else if (tab === 'create') {
    el.innerHTML = `<div class="card form" style="text-align:left"><p class="sub">Found your own Pack for <b>${PACK_CREATE_COST} bones</b> (you have ${Math.floor(state.bones)}). You become leader; the clubhouse lot north of Market Row becomes your Pack's hall.</p>
      <input id="pname" maxlength="22" placeholder="Pack name e.g. Shiba Squad"><input id="ptag" maxlength="4" placeholder="Tag (2-4) e.g. SQD">
      <label class="small">Banner colour <input id="pcolor" type="color" value="#e0733a" style="height:34px"></label>
      <div class="small">Emblem</div><div class="row" id="pemb" style="justify-content:flex-start">${EMBLEMS.map((k, i) => `<button class="btn ${i ? 'ghost' : 'alt'}" data-emb="${k}">${k}</button>`).join('')}</div>
      <div class="row" style="justify-content:flex-start;align-items:center"><span id="pprev"></span><button class="btn green" id="pcreate">Found Pack (${PACK_CREATE_COST} bones)</button></div></div>`;
    let emb = 'paw'; const prev = () => { const p = $('#pprev'); p.innerHTML = ''; p.appendChild(emblemCanvas({ color: $('#pcolor').value, emblem: emb }, 44)); };
    $('#pemb').onclick = (e) => { const b = e.target.closest('[data-emb]'); if (!b) return; emb = b.dataset.emb; $('#pemb').querySelectorAll('button').forEach((x) => x.className = 'btn ' + (x === b ? 'alt' : 'ghost')); prev(); };
    $('#pcolor').oninput = prev; prev();
    $('#pcreate').onclick = () => { const r = createPack(state, { name: $('#pname').value, tag: $('#ptag').value, color: $('#pcolor').value, emblem: emb }); if (r.ok) panel.tab = 'home'; done(r, r.ok ? `${r.pack.name} [${r.pack.tag}] founded! Your banner now flies over the clubhouse.` : ''); };
  } else if (tab === 'home' && pk) {
    const lead = pk.ownerId === ME, rank = leaderboard(state).find((r) => r.mine).rank;
    el.innerHTML = `<div class="packhead"><span id="pkem"></span><div style="flex:1"><h2 style="margin:0">${esc(pk.name)} <span class="tagchip" style="background:${pk.color}">[${pk.tag}]</span></h2><div class="small">${pk.members.length} members · <span data-pscore="${pk.id}">${packScore(pk)}</span> pts · rank #${rank} in the Kibble Cup · you are ${lead ? 'leader' : 'a member'}</div></div></div>
      <div class="launch" style="grid-template-columns:1.3fr 1fr"><div><b>Members</b><div class="members">${[...pk.members].sort((a, b) => memberScore(b.stats) - memberScore(a.stats)).map((m) => `<div class="member" data-m="${m.id}"><span class="mimg"></span><div style="flex:1"><b>${esc(m.name)}</b>${m.id === ME ? ' (you)' : ''} ${m.id === pk.ownerId ? '<span class="tagchip" style="background:#d4a640;color:#121a36">leader</span>' : ''}<div class="small">${m.stats.shifts} shifts · ${m.stats.tokens} tokens · ${m.stats.decor} decor · ${m.stats.contributed} bones → ${memberScore(m.stats)} pts</div></div>${lead && m.id !== ME ? `<button class="btn red" data-kick="${m.id}" style="padding:3px 8px">Kick</button>` : ''}</div>`).join('')}</div>
        ${lead ? '<button class="btn ghost" id="precruit" style="margin-top:6px">Invite a stray pup (simulated)</button>' : ''}</div>
      <div><div class="card" style="text-align:left"><b>Pack treasury</b><div class="big-num" id="ptreasury">${pk.treasury}</div><div class="small">Bones members chipped in. Spent on clubhouse furniture & upgrades.</div>
        <div class="tradebox"><input id="pamt" type="number" value="100" min="1"><button class="btn green" id="pcontrib">Contribute</button></div></div>
        <div class="card" style="text-align:left;margin-top:8px"><b>Clubhouse</b><div class="small">${pk.clubhouse.items.length} items placed · ${Object.values(pk.pool).reduce((a, b) => a + b, 0)} in the shared pool</div><button class="btn alt" id="pgo" style="margin-top:6px">Walk to clubhouse</button></div>
        <div class="row" style="justify-content:flex-start;margin-top:10px"><button class="btn red" id="pleave">Leave Pack</button></div></div></div>`;
    $('#pkem').appendChild(emblemCanvas(pk, 48));
    pk.members.forEach((m, i) => el.querySelector(`[data-m="${m.id}"] .mimg`).appendChild(spriteCanvas(m.coat, m.id === ME ? state.wardrobe.equipped : NPC_OUTFITS[i % NPC_OUTFITS.length], 30, 38, 0.5)));
    $('#pcontrib').onclick = () => { const r = contribute(state, $('#pamt').value); done(r, r.ok ? `Contributed to the treasury (${r.treasury})` : ''); };
    el.querySelectorAll('[data-kick]').forEach((b) => b.onclick = () => done(kickMember(state, b.dataset.kick), 'Member removed'));
    $('#precruit')?.addEventListener('click', () => { const r = recruitNpc(state, rng); done(r, r.ok ? `${r.member.name} joined your Pack!` : ''); });
    $('#pgo').onclick = () => { closePanel(); clickWorldTile(CLUBHOUSE.x + 2, CLUBHOUSE.y + 2); };
    $('#pleave').onclick = () => { if (!confirm(`Leave ${pk.name}?`)) return; const r = leavePack(state); if (r.ok) panel.tab = 'find'; done(r, r.disbanded ? 'Pack disbanded.' : 'You left the Pack.'); };
  } else if (tab === 'board' && pk) {
    el.innerHTML = `<div class="tradebox"><input id="ppost" maxlength="140" placeholder="Write to your Pack…" style="flex:1"><button class="btn green" id="ppostb">Post</button></div>
      <div class="board">${pk.board.map((m) => `<div class="post ${m.system ? 'sys' : ''} ${m.author === state.player.name && !m.system ? 'mine' : ''}"><b>${esc(m.author)}</b> ${esc(m.text)}</div>`).join('') || '<p class="small">No posts yet.</p>'}</div>`;
    const send = () => { const r = postToBoard(state, $('#ppost').value); done(r, 'Posted'); };
    $('#ppostb').onclick = send; $('#ppost').onkeydown = (e) => { if (e.key === 'Enter') send(); };
  } else {
    el.innerHTML = `<h3 style="margin:0 0 4px">${SEASON.name}</h3><p class="sub">Pack score = café shifts ×${SCORE.shift} + tokens launched ×${SCORE.token} + decorating ×${SCORE.decor} + 1 per ${SCORE.bonesPer} bones contributed, summed over members. Preview season: no prizes yet.</p>
      <table class="cup"><tr><th>#</th><th></th><th>Pack</th><th>Members</th><th>Score</th></tr>${leaderboard(state).map((r) => `<tr class="${r.mine ? 'mine' : ''}" data-row="${r.id}"><td>${r.rank}</td><td class="em"></td><td><b>${esc(r.name)}</b> <span class="tagchip" style="background:${r.color}">[${r.tag}]</span></td><td>${r.members}</td><td><b data-pscore="${r.id}">${r.score}</b></td></tr>`).join('')}</table>`;
    el.querySelectorAll('[data-row]').forEach((d) => d.querySelector('.em').appendChild(emblemCanvas(state.packs.all[d.dataset.row], 26)));
  }
}

// ---------------- Kibble Mall ----------------
function renderMall() {
  const body = $('#panel-body'), m = ensureMall(state), cat = panel.cat, store = MALL_BUILDINGS.find((b) => b.id === panel.store);
  const demo = `<div class="demo-banner">Demo – simulated $KIBBLE · No blockchain · No real money · Prize pools are won by skill/activity score, never by chance</div>`;
  const pools = `<div class="stats"><div>Daily pool<b>${fmtK(m.pools.daily)}</b>KIBBLE</div><div>Weekly pool<b>${fmtK(m.pools.weekly)}</b>KIBBLE</div><div>Monthly pool<b>${fmtK(m.pools.monthly)}</b>KIBBLE</div><div>President's Treasury<b>${fmtK(m.treasury)}</b>KIBBLE</div></div>`;
  if (cat === 'board') {
    const day = m.period.day, dayFrac = (state.clockSec % DAY_LEN) / DAY_LEN;
    body.innerHTML = `${demo}<h2>Mall prize-pool board</h2><p class="sub">Every Mall & district purchase adds a transparent <b>${FEE_LABEL}</b>. Pools pay out to the top score — skill and activity, not luck.</p>${pools}
      <div class="poolrules">${['daily', 'weekly', 'monthly'].map((p) => { const top = boardRows(state, 'verse', p, dayFrac)[0]; return `<div class="card" style="text-align:left"><b>${p[0].toUpperCase() + p.slice(1)} pool · ${FEE_BPS[p] / 100}% of each purchase</b><div class="small">How to win: ${POOL_RULES[p]}</div><div>Leader now: <b>${top ? esc(top.name) + ' (' + top.score + ')' : '—'}</b></div><div class="small">Pays out every ${({ daily: 'in-game day', weekly: '7 in-game days', monthly: '28 in-game days' })[p]} · day ${day + 1}</div></div>`; }).join('')}</div>
      <h3>Recent winners</h3><div class="board">${m.winners.map((w) => `<div class="post"><b>${w.pool}</b> ${esc(w.winner)} — ${fmtK(w.amount)} KIBBLE (score ${w.score}, day ${w.day})</div>`).join('') || '<p class="small">No payouts yet — first daily payout at the end of this in-game day.</p>'}</div>
      <button class="btn alt" id="toleaders">Open Leaderboards Hall</button>`;
    $('#toleaders').onclick = () => openPanel('mall', { cat: 'leaders' });
    return;
  }
  if (cat === 'leaders') {
    const g = panel.game || 'verse', G = GAMES[g], dayFrac = (state.clockSec % DAY_LEN) / DAY_LEN;
    body.innerHTML = `${demo}<h2>Leaderboards Hall</h2><div class="row tabs" style="justify-content:flex-start;margin:0 0 10px">${Object.entries(GAMES).map(([k, x]) => `<button class="btn ${k === g ? '' : 'ghost'}" data-game="${k}">${x.name}${x.status === 'live' ? '' : ' (soon)'}</button>`).join('')}</div>
      ${G.status !== 'live' ? '<div class="demo-banner" style="background:#5a2352">Coming soon — sample layout, not real players or scores</div>' : ''}<p class="sub">Pool share: ${G.share}.</p>
      <div class="lbgrid">${G.boards.map((b) => `<div class="card" style="text-align:left"><b>${b.title}</b><div class="small">Wins the ${b.pool} pool share: ${b.criterion}</div><table class="cup">${boardRows(state, g, b.id, dayFrac).slice(0, 7).map((r) => `<tr class="${r.id === 'you' || r.mine ? 'mine' : ''}"><td>#${r.rank}</td><td>${esc(r.name)}${r.sample ? ' <i class="small">sample</i>' : ''}</td><td><b ${b.id === 'monthly' && g === 'verse' ? `data-pscore="${r.id}"` : ''}>${r.score}</b> ${b.unit}</td></tr>`).join('')}</table></div>`).join('')}</div>`;
    body.querySelector('.tabs').onclick = (e) => { const b = e.target.closest('[data-game]'); if (b) { panel.game = b.dataset.game; renderMall(); } };
    return;
  }
  if (cat === 'office') {
    body.innerHTML = `${demo}<h2>President's Office</h2><div class="packhead"><span id="presimg"></span><div><h3 style="margin:0">${OWNER.name}</h3><div class="small">${OWNER.title}</div><div class="small">President's treasury (Solana): <code style="word-break:break-all">${OWNER_WALLET}</code> (simulated — demo KIBBLE only, no on-chain transfers)</div></div></div>${pools}
      <p class="sub">Fee routing per purchase: 1% → President's Treasury · 0.25% → daily pool · 0.5% → weekly pool · 0.25% → monthly pool. Pool wallets: ${Object.entries(POOL_WALLETS).map(([k, v]) => `${k} <code>${v}</code>`).join(' · ')}</p>
      <h3>Fee ledger</h3><div class="board">${m.ledger.map((l) => `<div class="post"><b>${esc(MALL_ITEMS[l.item]?.name || l.item)}</b> price ${fmtK(l.price)} · fee ${fmtK(l.fee)} = owner ${fmtK(l.owner)} + daily ${fmtK(l.daily)} + weekly ${fmtK(l.weekly)} + monthly ${fmtK(l.monthly)}</div>`).join('') || '<p class="small">No purchases yet.</p>'}</div>`;
    $('#presimg').appendChild(spriteCanvas('golden', { top: 'gold_suit', hat: 'crown', neck: 'diamond_chain', bottom: 'slacks_black', feet: 'loafers' }, 72, 92, 1));
    return;
  }
  const items = Object.entries(MALL_ITEMS).filter(([, it]) => cat === 'all' || it.cat === cat);
  body.innerHTML = `${demo}<h2>${esc(store?.name || 'Kibble Mall')}</h2><p class="sub">Luxury goods priced in demo $KIBBLE (you have ${state.kibble.toFixed(2)}). Owned by ${OWNER.name}. Checkout shows the <b>${FEE_LABEL}</b>.</p><div class="grid" id="mallgrid"></div>${cat === 'all' ? pools : ''}`;
  const grid = $('#mallgrid');
  for (const [id, it] of items) {
    const q = quote(id), card = document.createElement('div'); card.className = 'card';
    if (it.grants.outfit) card.appendChild(spriteCanvas(state.player.coat, { ...state.wardrobe.equipped, [OUTFITS[it.grants.outfit].slot]: it.grants.outfit }, 72, 92, 1));
    else if (it.grants.furniture) card.appendChild(iconCanvas((x) => drawFurniture(x, it.grants.furniture, 14, 4, 36, 0)));
    else card.appendChild(iconCanvas((x) => { const col = it.grants.car === 'limo' ? '#d4a640' : '#b3202c'; x.fillStyle = col; x.fillRect(4, 22, 56, 14); x.fillRect(16, 14, 30, 9); x.fillStyle = '#bfe6f7'; x.fillRect(19, 16, 24, 6); x.fillStyle = '#111'; x.fillRect(10, 34, 9, 8); x.fillRect(44, 34, 9, 8); }));
    const own = m.owned.includes(id);
    card.insertAdjacentHTML('beforeend', `<div><b>${it.name}</b></div><div class="checkout"><div>Price <b>${fmtK(q.price)}</b></div><div class="small">2% fee ${fmtK(q.fee)} (1% owner ${fmtK(q.owner)} · pools ${fmtK(q.daily + q.weekly + q.monthly)})</div><div>Total <b>${fmtK(q.total)}</b> KIBBLE</div></div>${own && !it.grants.furniture ? '<div class="price">Owned</div>' : `<button class="btn" data-mbuy="${id}">Buy</button>`}`);
    grid.appendChild(card);
  }
  grid.onclick = (e) => { const b = e.target.closest('[data-mbuy]'); if (!b) return; const r = buyMallItem(state, b.dataset.mbuy); if (r.ok) { toast(`Bought ${MALL_ITEMS[b.dataset.mbuy].name}: paid ${fmtK(r.quote.total)} KIBBLE incl. ${fmtK(r.quote.fee)} fee`, 'good'); hud(); persist(); renderMall(); } else toast(r.reason, 'bad'); };
}

// ---------------- Loop ----------------
function liveScores() { for (const e of document.querySelectorAll('[data-pscore]')) { const p = state.packs?.all?.[e.dataset.pscore]; if (p) { const v = String(packScore(p)); if (e.textContent !== v) e.textContent = v; } } }
function frame(now) {
  const dt = Math.min(0.05, (now - lastT) / 1000); lastT = now; time += dt;
  if (state) {
    state.clockSec += dt; { const m = ensureMall(state), dEarn = state.stats.bonesEarned - lastEarned; if (dEarn > 0) m.activity.dayBones += dEarn; lastEarned = state.stats.bonesEarned;
      const day = Math.floor(state.clockSec / DAY_LEN); if (day > m.period.day) for (const w of rollPeriods(state, day, poolEntries(state, 1))) toast(`${w.pool} prize pool: ${w.winner} wins ${fmtK(w.amount)} demo KIBBLE (score ${w.score})`, 'good'); }
    packAcc += dt; if (packAcc > 6) { packAcc = 0; simulatePacks(state, rng); }
    liveScores(); // every visible pack score reads packScore() (single source of truth), refreshed in place
    simAcc += dt; while (simAcc >= 1.2) { simAcc -= 1.2; simulateTick(state, rng); if (panel?.kind === 'launch') launchUi(); }
    saveAcc += dt; if (saveAcc > 5) { saveAcc = 0; persist(); }
    if (panel?.kind === 'cafe' && panel.shift && !panel.shift.settled) { tickShift(panel.shift, dt, rng); cafeUi(); }
  }
  if (mode === 'world') { updateWorld(dt); renderWorld(); }
  else if (mode === 'build') { $('#prompt').hidden = true; renderBuild(); }
  requestAnimationFrame(frame);
}
titleScreen(); requestAnimationFrame(frame);
window.__inu = { setHour: (h) => { dayOffset = timeForHour(h) - time; }, setRain: (r) => { amb.rain = amb.rainTarget = r; amb.weatherT = 999; }, get amb() { return amb; }, get npcs() { return npcs; }, emote: (k) => doEmote(k), cam, get state() { return state; }, get mode() { return mode; }, get panel() { return panel?.kind; }, get panelObj() { return panel; } };
