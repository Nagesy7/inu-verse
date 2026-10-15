import { CHAPEL as CHAPEL_POS, LOTS as BIZ_LOTS } from './world.js';
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
import { drawShiba, drawFurniture, drawRoom, drawMenuIcon, drawBoneIcon, drawEmblem, GOLD } from './art.js';
import { ART, artReady, artKey } from './art.js';
import { carProps } from './ambient.js';
import { drawCar } from './cars.js';
import { makeAlive, stepAlive, drawAliveGround, drawAliveSky, ALIVE } from './alive.js';
import { makeAmbient, stepAmbient, throwBall, dayPhase, timeForHour, drawGroundLife, drawSkyLife, drawAtmosphere, drawEmote, lightsFor, addMail, unreadMail, EMOTES, DAY_LEN } from './ambient.js';
import { initAudio, setMusicActive, setMuted, isMuted, footstep, chirp, bork, blip, uiClick, uiOpen, uiClose, textBlip, rustle, fanfare } from './audio.js';
import { CAR_MODELS, CAR_COLORS, ensureGarage, buyCar, carOf } from './garage.js';
import { PETS, ensurePets, buyPet, renamePet, activePet, followStep, petSprite } from './pets.js';
import { wallet, TREASURY, DEMO, SOON, demoOnly, kibText, setWallet, kibblePayWallet, GAME as KGAME } from './wallet.js';
import { ZOOMS, DEFAULT_ZOOM, stepZoom, clampCam } from './zoom.js';
import { makePresident, startVisit, updatePresident, presidentProps, presidentPresent, talk as presTalk, OUTFIT as PRES_OUTFIT, KINDS as PRES_KINDS } from './president.js';
import { MALL_ITEMS, quote, buyMallItem, ensureMall, rollPeriods, fmtK, FEE_LABEL, OWNER, OWNER_WALLET, POOL_RULES, FEE_BPS } from './mall.js';
import { GAMES, boardRows, poolEntries } from './leaderboards.js';
import { makeCrew, stepCrew, takeGig, drawVest, drawTool, drawCones } from './workers.js';
import { trending, adProps, adAt } from './coinads.js';
import * as RC from './realcoins.js';
import { ensureFarm, tickFarm, seasonOf, marketHour, rollFarmWeek, catchUp, fishCatch, WEEK_DAYS } from './farm.js';
import { ensureBiz, bizHour, bizDay, rollBizWeek } from './biz.js';
import { renderField, renderFarm, renderLot, renderBizBoard } from './farmui.js';
import * as REL from './relations.js';
import { startJob } from './jobui.js';
import { renderCity } from './flyui.js';
import { renderMatchmaker } from './pairui.js';
import { renderEngage } from './engageui.js';
import * as ENG from './engage.js';
import * as F5 from './fly5.js';
import { renderFly5 } from './fly5ui.js';
import { squareProps } from './fly5art.js';
import { arcadeProps } from './arcadeart.js';
import { ARCADE, GAME_DOORS } from './world.js';
import { doorProps } from './doorart.js';
import { createGuide } from './guideui.js';
import { isRealWallet } from './guide.js';
import * as PAIR from './pairing.js';
import { ensureFly, featuredOf, statusGlow, poolsOf, FEATURED_SLOTS, claimPresDrop } from './flywheels.js';
import { makeTown, townHour, lineFor, playerDid, friendsOf, rivalsOf } from './townai.js';
import { mountCreator, drawPreview, profileOfChoices } from './creatorui.js';
import { applyCreation, defaultChoices, restyle, SALON_PRICE } from './creator.js';
import { profileFromState, hasCustomLook, saveProfile, loadProfile, setProfileStore, kibblePayProfileStore, profileStore } from './profile.js';
import { TRAITS } from './traits.js';
import { drawProfileShiba } from './art.js';
import { WORKER_JOB, JOBS as JOB_DEFS, ensureJobs, rankOf } from './jobs.js';
import { renderFriend, renderChapel, renderFurnStore } from './relui.js';
import { prerenderMap, dynamicProps, buildingsReady } from './render.js';
import { N, SCALE, drawWater } from './tiles.js';
import { feel } from './feel.js';
import { faceTalk, faceReact } from './face.js';
import { stepChat, drawChat, emoteBubble } from './chat.js';
import { buildDrawer, drawerOpen } from './hudmenu.js';
import { makeDoorState, doorStep, doorExit, outsideOf } from './doors.js';
import { isDoor, doorList, COMMUNITY } from './world.js';
import { ensurePacks, myPack, meIn, createPack, joinPack, leavePack, kickMember, recruitNpc, contribute, buyForPack, donateFurniture, upgradeClubhouse, placePackFurniture, movePackFurniture, storePackFurniture, postToBoard, recordActivity, memberScore, packScore, leaderboard, simulatePacks, packOfName, PACK_CREATE_COST, EMBLEMS, SEASON, SCORE, ME } from './packs.js';

const $ = (s) => document.querySelector(s);
const cv = $('#game'), ctx = cv.getContext('2d');
const rng = mulberry32((Date.now() & 0xffff) + 1);
let lastEarned = 0, amb = null, dayOffset = 0, stepAcc = 0, mailAcc = 0, photo = false;
let state = null, mapImg = null, npcs = [], mode = 'title', townH = -1, presWas = false;
const cam = { x: 0, y: 0 };
let drive = null; const petF = { x: 0, y: 0, dir: 1, phase: 0, moving: false }; let honkT = 0; // driving state (runtime) + pet follower
const pres = makePresident(7); // President Inu's seeded visit schedule
const PRES_Q = new URLSearchParams(location.search).get('president'); let presForced = false;
let vignette = null, miniBase = null;
const keys = new Set();
const touch = { x: 0, y: 0, id: null };
const COARSE = matchMedia('(pointer: coarse)');
function setA(label) { const b = document.getElementById('btn-a'); if (b && b.dataset.l !== label) { b.dataset.l = label; b.innerHTML = label ? `<span>${label}</span>` : 'A'; b.classList.toggle('ready', !!label); } }
const player = { face: 'down', dir: 1, phase: 0, moving: false, path: [], target: null };
let build = null; // {plotId, readOnly, home, sel:{kind:'new'|'move', id, uid, rot}, hover:{x,y}, picked}
let panel = null; // {kind, ...}
let REG = { coins: [], offline: false, loaded: 0 }; // Launch Hall registered coins
let packAcc = 0, simAcc = 0, saveAcc = 0, lastT = performance.now(), time = 0;
const fmt = (n, d = 2) => n >= 1e6 ? (n / 1e6).toFixed(2) + 'M' : n >= 1e3 ? (n / 1e3).toFixed(1) + 'k' : (+n).toFixed(d);
const fmtP = (p) => fmtPrice(p);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

const packAct = (k) => { if (myPack(state)) { recordActivity(state, k); ENG.addSeasonXp(state, 'pack', gameDay()); } };
const badgeOf = (p) => (p ? { tag: p.tag, color: p.color, emblem: p.emblem } : null);
function toast(msg, cls = '') { if (cls === 'good') faceReact('me', 'joy'); else if (cls === 'bad') faceReact('me', 'wow', 1); // de-duplicated: an identical visible toast is refreshed instead of stacking
  for (const e of document.querySelectorAll('#toast .toast')) if (e.dataset.msg === msg) { clearTimeout(e._t); e._t = setTimeout(() => e.remove(), 2200); return; }
  if ($('#toast').children.length >= 4) $('#toast').firstElementChild.remove();
  const d = document.createElement('div'); d.dataset.msg = msg; d.className = 'toast ' + cls; d.textContent = msg; $('#toast').appendChild(d); d._t = setTimeout(() => d.remove(), 2200); }
let profSaveT = 0;
function persist() { if (state) { for (const u of ENG.checkCollections(state)) toast(`Collection complete: ${u.badge} ${u.name}! Trophy added to your inventory.`, 'good'); save(state, localStorage); if (hasCustomLook(state) && Date.now() - profSaveT > 15000) { profSaveT = Date.now(); saveProfile(state); } } }
// burn-for-status flair: pulsing pixel halo + sparkles at the feet (world, home and photos)
function drawFlair(c, col, t) { const r = 40 + Math.sin(t * 3) * 3; c.save(); c.globalAlpha = 0.5; c.fillStyle = col; c.fillRect(-r, 6, r * 2, 12); c.fillRect(-r + 10, 0, r * 2 - 20, 24); c.globalAlpha = 0.22 + Math.sin(t * 4) * 0.08; c.fillRect(-r + 8, -100, r * 2 - 16, 106); c.globalAlpha = 1; for (let i = 0; i < 6; i++) { const a = t * 1.6 + i * 1.047; c.fillStyle = i % 2 ? '#ffffff' : col; c.fillRect(Math.round(Math.cos(a) * 52) - 4, Math.round(-50 + Math.sin(a) * 56) - 4, 8, 8); } c.restore(); }
function featuredMap() { const nowH = state.clockSec / (DAY_LEN / 24), out = {}; for (const id of Object.keys(FEATURED_SLOTS)) { const r = featuredOf(state, id, nowH); if (r) out[id] = { ...r, label: 'FEATURED' }; const sp = F5.sponsorOf(state, id, nowH); if (sp) out[id] = { ticker: sp.brand, by: sp.by, untilH: sp.untilH, featured: true, sponsored: true, label: 'SPONSORED' }; } return out; }
// ---- real $KIBBLE (kibble-pay, live: mint 4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump). Demo only with ?demo=1; otherwise no fake balances.
let K = { mode: DEMO ? 'demo' : 'offline', kp: null }, serverPools = null;
async function refreshPools() { try { const r = await K.kp.pools(); const u = (p) => Number(r.pools[p].accruedBaseUnits); serverPools = { daily: u('daily'), weekly: u('weekly'), monthly: u('monthly'), burned: Number(r.burnedAllBaseUnits) }; if (state) hud(); } catch {} }
async function bootKibble() {
  try { const G = await import('https://kibble-pay.vercel.app/inu-games.js'); K = await G.initKibble({ game: KGAME }); G.mountFooter(K.mode);
    // Connect Wallet (title + in-game): cloud save keyed by wallet, holder tier from on-chain $KIBBLE (VIP perks read the real balance).
    const js = (g) => { try { return JSON.parse(g('inuverse.save.v1') || 'null'); } catch { return null; } };
    G.mountWallet(K, { game: KGAME, keys: ['inuverse.save.v1', 'inu.profile.v1:'], position: 'top-center',
      progress: (g) => { const s = js(g); return s ? Math.floor((s.stats?.bonesEarned || 0) + (s.stats?.shifts || 0) * 10 + (s.clockSec || 0) / 60) : 0; },
      label: (g) => { const s = js(g); return s ? `${s.player?.name || 'Shiba'} · ${Math.floor(s.stats?.bonesEarned || 0)} bones earned` : ''; },
      onWallet: () => { if (K.kp?.session) wallet().refresh?.().then(() => state && hud()).catch(() => {}); } }); }
  catch (e) { K = { mode: DEMO ? 'demo' : 'offline', kp: null }; }
  document.body.dataset.kibble = K.mode;
  if (K.kp) { setWallet(kibblePayWallet(K.kp)); setProfileStore(kibblePayProfileStore(K.kp)); refreshPools(); if (K.kp.session) wallet().refresh().catch(() => {}); }
  const b = $('#btn-phantom'); if (b) { b.title = DEMO ? 'Demo mode: no wallet' : 'Sign in with Phantom'; b.innerHTML = DEMO ? 'Demo mode <small>(fake KIBBLE)</small>' : 'Phantom'; }
  if (state) hud();
}
addEventListener('kibble:paid', (e) => { toast(e.detail.burn ? 'Burn confirmed: tap again to unlock it.' : 'Payment confirmed: tap Buy again to receive it.', 'good'); wallet().refresh?.().then(() => state && hud()).catch(() => {}); refreshPools(); });
addEventListener('kibble:failed', (e) => toast(e.detail.reason || 'Payment failed', 'bad'));
addEventListener('kibble:wallet', () => { if (state) { state.walletAddr = wallet().address; hud(); } });
bootKibble(); refreshRegistry(true);
function hud() { GOLD.name = F5.isVip(state) ? state.player.name : null; { const P = DEMO ? poolsOf(state) : serverPools, el = $('#pools'); if (el) el.textContent = P ? `D${(P.daily / 1e6).toFixed(2)} W${(P.weekly / 1e6).toFixed(2)} M${(P.monthly / 1e6).toFixed(2)}` : 'pools'; } $('#bones').textContent = Math.floor(state.bones); $('#kibble').textContent = DEMO ? state.kibble.toFixed(2) : (wallet().live ? (wallet().balanceUi ?? '–') : 'soon'); $('#hud-name').textContent = state.player.name; }

function resize() { const nw = Math.round(innerWidth * devicePixelRatio), nh = Math.round(innerHeight * devicePixelRatio); if (cv.width !== nw || cv.height !== nh) { cv.width = nw; cv.height = nh; vignette = null; } // only touch the backing store on a real size change (visualViewport fires during address-bar moves; re-setting width clears the canvas)
  document.body.classList.toggle('landscape', innerWidth > innerHeight); document.body.classList.toggle('short', innerHeight < 520); }
addEventListener('resize', resize); addEventListener('orientationchange', () => setTimeout(resize, 60)); window.visualViewport?.addEventListener('resize', resize); resize();

// ---------------- Title ----------------
let creator = null;
let profCache = { key: '', p: null };
// player look: shared-profile avatar for created characters; legacy saves keep the atlas coat
const myProfile = () => { const key = JSON.stringify([state.player.look, state.wardrobe.equipped, state.player.name]); if (profCache.key !== key) profCache = { key, p: profileFromState(state) }; return profCache.p; };
function playerCanvas(w, h, scale) { if (!hasCustomLook(state)) return spriteCanvas(state.player.coat, state.wardrobe.equipped, w, h, scale); const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; drawProfileShiba(x, w / 2, h - 16, myProfile(), { scale }); return c; }

function spriteCanvas(coat, outfit, w, h, scale, face = 'down', art) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); x.imageSmoothingEnabled = false; drawShiba(x, w / 2, h - 16, { coat, outfit, scale, face, art: art !== undefined ? art : artKey(coat, outfit) }); return c; }
function titleScreen() {
  creator = mountCreator($('#creator'), { choices: { ...defaultChoices(), name: $('#name').value } });
  const saved = load(localStorage);
  if (saved) { $('#continue').hidden = false; $('#continue').onclick = () => startGame(saved); }
  $('#start').onclick = () => { const ch = { ...creator.choices, name: $('#name').value.trim() || 'Inu' }; const s = newGame({ name: ch.name, coat: 'tan' });
    applyCreation(s, ch, { ensureFarm, ensureJobs, ensureRel: REL.ensureRel }); seedTokens(s, rng); startGame(s); saveProfile(s); toast(`Welcome to Inu Verse, ${s.player.name}! ${TRAITS[s.player.trait].name}: ${TRAITS[s.player.trait].desc}.`, 'good'); };
  const pv = $('#preview'), pc = pv.getContext('2d');
  const faces = ['down', 'right', 'up', 'left'];
  const loop = (t) => {
    if (mode !== 'title') return; pc.imageSmoothingEnabled = false; pc.clearRect(0, 0, pv.width, pv.height);
    const prof = profileOfChoices({ ...creator.choices, name: $('#name').value });
    if (saved) { drawPreview(pc, prof, pv.width * 0.3, t, 'NEW'); const x = pv.width * 0.72, face = faces[Math.floor(t / 1600) % 4];
      pc.fillStyle = '#d4a640'; pc.fillRect(x - 54, 150, 108, 10); pc.fillStyle = '#8f6a22'; pc.fillRect(x - 54, 158, 108, 4); pc.fillStyle = '#24305c'; pc.fillRect(x - 50, 152, 100, 5);
      if (saved.player.look) drawProfileShiba(pc, x, 138, profileFromState(saved), { scale: 1.1, phase: t / 90, moving: true, face, shadow: false }); else drawShiba(pc, x, 140, { art: artKey(saved.player.coat, saved.wardrobe?.equipped), coat: saved.player.coat, outfit: saved.wardrobe?.equipped, scale: 2, phase: t / 90, moving: true, face, shadow: false });
      pc.font = '8px Silkscreen, monospace'; pc.textAlign = 'center'; pc.fillStyle = '#f2cc68'; pc.fillText(saved.player.name.toUpperCase(), x, 172); }
    else drawPreview(pc, prof, pv.width / 2, t, null);
    requestAnimationFrame(loop);
  };
  requestAnimationFrame(loop);
}

function startGame(s) { loadProfile(s).catch(() => {}); ENG.ensureEngage(s); ENG.addSeasonXp(s, 'login', Math.floor((s.clockSec || 0) / DAY_LEN)); F5.ensureFly5(s); F5.holderCheck(s); s.town ||= makeTown(rng); townH = -1; seedTokens(s, rng); REL.ensureRel(s); ensureFarm(s); ensureBiz(s); s.clockSec ??= 0; catchUp(s, Date.now(), { season: seasonOf(Math.floor(s.clockSec / DAY_LEN)), rain: false }); hourIdx = Math.floor(s.clockSec / (DAY_LEN / 24));
  state = s; state.kibble ??= DEMO ? 20 : 0; if (!DEMO) state.kibble = 0; ensureWardrobe(state); ensurePacks(state); ensureMall(state); state.clockSec ??= 0; lastEarned = state.stats.bonesEarned; mode = 'world';
  buildDrawer(document, { bork: () => { initAudio(); bork(); player.emote = { kind: 'bork', t: 1.2 }; emoteBubble('me', 'bork', time); } }); $('#title').hidden = true; $('#hud').hidden = false; $('#minimap-wrap').hidden = false; document.body.classList.add('inworld');
  makeAlive(); mapImg = prerenderMap(); npcs = spawnNpcs(rng, 6); npcs.forEach((n) => { n.art = artKey(n.coat); }); amb = makeAmbient(42);
  Promise.all([artReady, buildingsReady, document.fonts?.load('8px Silkscreen').catch(() => {})]).then(() => { mapImg = prerenderMap(); });
  feel.fade(); $('#hud').classList.add('in');
  // ?spawn=<building> (from a game's 🏠 Back to Inu Verse): stand just outside that building's door.
  { const sp = new URLSearchParams(location.search).get('spawn'), d = sp && [ARCADE, ...GAME_DOORS].find((x) => x.id === sp);
    if (d && d.door) { const o = outsideOf({ ...d.door, id: d.id }); Object.assign(state.player, { x: o.x, y: o.y }); player.face = o.face; } }
  cam.x = state.player.x; cam.y = state.player.y; hud(); persist(); wayUi(true);
  setTimeout(tourCheck, 1400);
}

// ---------------- Input ----------------
addEventListener('keydown', (e) => {
  if (guide && guide.onKey(e)) return;
  if (e.target.tagName === 'INPUT') return;
  const k = e.key.toLowerCase(); if (globalThis.__arcade && document.getElementById('arcade-ov') && !document.getElementById('arcade-ov').hidden) { if (k === 'escape') globalThis.__arcade.close(); return; }
  keys.add(k);
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) e.preventDefault();
  if (k === 'escape' && photo) return togglePhoto();
  initAudio();
  if (mode === 'world' && !panel && state) {
    if (k === 'h' && drive) honk();
    if (k === 'b') { bork(); player.emote = { kind: 'bork', t: 1.2 }; emoteBubble('me', 'bork', time); }
    if (k === 't') { const d = throwBall(amb, state.player, player.face, npcs); blip(660); if (d) toast(`${d.name} is fetching!`, 'good'); }
    if (k === 'm') toggleMute();
    if (k === '+' || k === '=') setZoom(stepZoom(ZOOM, 1)); if (k === '-' || k === '_') setZoom(stepZoom(ZOOM, -1));
    if (k === 'p') togglePhoto();
    if (k === 'g') toggleEmotes();
    const ek = ['1', '2', '3', '4', '5'].indexOf(k); if (ek >= 0) doEmote(Object.keys(EMOTES)[ek]);
  }
  if (feel.talking() && (k === 'e' || k === 'enter' || k === ' ')) { feel.advance(); return; }
  if (k === 'escape') { if (panel) closePanel(); else if (build) exitBuild(); }
  if (mode === 'world' && !panel && (k === 'e' || k === 'enter') && carAction()) return;
  if (mode === 'world' && !panel && (k === 'e' || k === 'enter')) { const it = nearestInteractable(state, state.player.x, state.player.y); const pup = nearPup(); if (pup && !it) petPup(pup); else if (it) interact(it); }
  if (mode === 'build' && k === 'r') rotateSel();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
let ZOOM = DEFAULT_ZOOM; // world zoom (2 = default close-up; 1 and 0.5 zoom out). Shibas are drawn at half world scale so they shrink with the world.
function setZoom(z) { if (!ZOOMS.includes(z) || z === ZOOM) return; ZOOM = z; const el = document.getElementById('zlevel'); if (el) el.textContent = ZOOM === 2 ? '1x' : ZOOM === 1 ? '½x' : '¼x'; }
const screenToWorld = (sx, sy) => ({ x: (sx - innerWidth / 2) / ZOOM + cam.x, y: (sy - innerHeight / 2) / ZOOM + cam.y });

cv.addEventListener('mousemove', (e) => { if (mode === 'build') build.hover = roomCell(e.clientX, e.clientY); });
cv.addEventListener('click', (e) => {
  if (mode === 'world' && !panel) {
    const w = screenToWorld(e.clientX, e.clientY); const ad = adAt(trend, adRot, adIdx, w.x, w.y); if (ad) { blip(990); openPanel('launch', ad.coin.real ? { tab: ad.coin.mint === RC.KIBBLE.mint ? 'kibble' : 'board' } : { sel: ad.coin.id }); return; } clickWorldTile(Math.floor(w.x / TILE), Math.floor(w.y / TILE));
  } else if (mode === 'build') buildClick(roomCell(e.clientX, e.clientY));
});
$('#minimap').addEventListener('click', (e) => { if (mode === 'world' && !panel) { if (guide) return guide.openMap(); const r = e.target.getBoundingClientRect(); clickWorldTile(Math.floor((e.clientX - r.left) / 2), Math.floor((e.clientY - r.top) / 2)); } });
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
let hourIdx = 0; const fish = { state: 'idle', t: 0, biteAt: 0 };
const gameDay = () => Math.floor((state.clockSec || 0) / DAY_LEN), hourKey = () => Math.floor((state.clockSec || 0) / (DAY_LEN / 24));
function farmCtx() { const day = gameDay(); return { onHarvest: () => ENG.addSeasonXp(state, 'farm', day), state, body: $('#panel-body'), toast, hud, persist, rerender: () => { if (panel) openPanel(panel.kind, panel); }, season: seasonOf(day), rain: amb.rain > 0.3, day, hourKey: hourKey(), weekFrac: ((state.clockSec / DAY_LEN) % WEEK_DAYS) / WEEK_DAYS, fish,
  cast: () => { fish.state = 'wait'; fish.t = 0; fish.biteAt = 1.2 + rng() * 2.5; }, reel: () => { if (fish.state !== 'bite') { fish.state = 'idle'; return { ok: false, reason: 'Too early — it swam off' }; } const r = fishCatch(state, rng(), fish.t); fish.state = 'idle'; if (r.ok) toast(`Caught a ${r.item === 'koi' ? 'GOLDEN KOI!' : r.item}!`, 'good'); return r; } }; }
function farmTick(dt) { const day = gameDay(); tickFarm(state, dt, { season: seasonOf(day), rain: amb.rain > 0.3 }); ensureFarm(state).lastReal = Date.now();
  if (fish.state === 'wait') { fish.t += dt; if (fish.t >= fish.biteAt) { fish.state = 'bite'; fish.t = 0; blip(1200); if (panel?.kind === 'farm' && panel.id === 'pond') openPanel('farm', panel); } } else if (fish.state === 'bite') { fish.t += dt; if (fish.t > 1.5) { fish.state = 'idle'; if (panel?.kind === 'farm' && panel.id === 'pond') { toast('It got away!'); openPanel('farm', panel); } } }
  const hk = hourKey(); while (hourIdx < hk) { hourIdx++; marketHour(state); const r = bizHour(state, hourIdx % 24, rng, state.spouse?.helps === 'biz' ? 2 : 0);
    if (hourIdx % 24 === 6) { const w = REL.spouseMorning(state); if (w) toast(`${state.spouse.name} watered ${w} field${w > 1 ? 's' : ''} this morning`, 'good'); for (const j of REL.pupJobs(state, Math.floor(hourIdx / 24))) toast(j, 'good'); }
    if (hourIdx % 24 === 0) { const row = bizDay(state, Math.floor(hourIdx / 24) - 1); if (row?.closed) toast(`3 unpaid days: your shop closed and the lease on ${row.lot} was handed back.`, 'bad'); else if (row?.unpaid) toast(`Warning: couldn't cover rent + wages (${row.due} bones). Unpaid day ${row.unpaidDays}/3 — the shop closes after 3.`, 'bad'); else if (row) toast(`Shop ledger: day profit ${row.profit} bones`, row.profit >= 0 ? 'good' : 'bad');
      const wk = Math.floor(Math.floor(hourIdx / 24) / WEEK_DAYS); const a = rollFarmWeek(state, wk), b = rollBizWeek(state, wk); if (a?.paid) toast(`Top Farmer #${a.rank}: +${a.paid} bones!`, 'good'); if (b?.paid) toast(`Top Business #${b.rank}: +${b.paid} bones!`, 'good'); }
    if (r?.sold && panel?.kind === 'lot') openPanel('lot', panel); } }
const LOTS_POS = Object.fromEntries(BIZ_LOTS.map((l) => [l.id, [l.x + 3.5, l.y + l.h + 0.6]]));
const pupF = [];
function stepPups(dt) { const P = allPups(); while (pupF.length < P.length) pupF.push({ x: state.player.x, y: state.player.y, dir: 1, phase: 0, moving: false }); let lead = drive ? null : state.player;
  P.forEach((p, i) => { const f = pupF[i]; if (!lead) return; followStep(f, lead.x - player.dir * 20, lead.y + 6, dt); lead = f; }); }
function allPups() { return [...(state.pups || []), ...(PAIR.ensurePair(state).breedPups || []).map((p) => ({ ...p, coat: { base: 'tan', hex: p.look.coat, patch: p.look.accent || '#fff' }, look: p.look, custom: true }))]; }
function pupActors() { if (drive) return []; return allPups().map((p, i) => { const f = pupF[i]; if (!f) return null; const st = p.born != null ? (REL.stageOfPup({ born: p.born }, gameDay()) || 'pup') : 'pup';
  if (p.custom) return { x: f.x, y: f.y, face: f.dir > 0 ? 'right' : 'left', phase: f.phase, moving: f.moving, name: `${p.name}${p.rare ? ' ★' : ''}`, pupScale: REL.PUP_SCALE[st] || 0.8, profile: { look: { ...p.look, size: 'small' } }, customPup: true };
  return { x: f.x, y: f.y, coat: p.coat.base, outfit: {}, face: f.dir > 0 ? 'right' : 'left', phase: f.phase, moving: f.moving, name: `${p.name} (${st})`, pupScale: REL.PUP_SCALE[st], pupHex: p.coat.hex, pupPatch: p.coat.patch, art: artKey(p.coat.base, {}) }; }).filter(Boolean); }
const DATE_SPOTS = { cafe: [5.5, 19.5], fountain: [32, 67.4], pond: [11, 95.5], dinner: [32, 59.5] };
let scene = null, confetti = [];
function npcByName(n) { return npcs.find((x) => x.name === n); }
function startScene(who, lines, place) { if (panel) closePanel(); const sp = DATE_SPOTS[place]; const n = npcByName(who);
  if (sp) { state.player.x = sp[0] * TILE; state.player.y = sp[1] * TILE; if (n) { n.x = state.player.x + 28; n.y = state.player.y; n.path = []; n.wait = 12; n.face = 'left'; } }
  if (n) n.emote = { kind: 'heart', t: 3 }; scene = { who, lines, i: -1, t: 99, place }; }
function stepScene(dt) { if (!scene) return; scene.t += dt; if (scene.t > 3.4) { scene.i++; scene.t = 0; if (scene.i >= scene.lines.length) { const done = scene; scene = null; if (done.wedding) { toast('Photo mode: snap your wedding photo! (Esc to exit)', 'good'); togglePhoto(); } return; } feel.say(scene.who, scene.lines[scene.i], textBlip); } }
function drawSceneBars() { if (!scene) return; const d = devicePixelRatio, h = Math.round(innerHeight * 0.08); ctx.setTransform(d, 0, 0, d, 0, 0); ctx.fillStyle = '#000'; ctx.fillRect(0, 0, innerWidth, h); ctx.fillRect(0, innerHeight - h, innerWidth, h); }
function startWedding(name, guests) { if (panel) closePanel(); const cx = (CHAPEL_POS.x + 3.5) * TILE, cy = (CHAPEL_POS.y + CHAPEL_POS.h + 0.6) * TILE; state.player.x = cx - 16; state.player.y = cy; player.face = 'right';
  const sp = npcByName(name); if (sp) Object.assign(sp, { x: cx + 16, y: cy, path: [], wait: 30, face: 'left' });
  guests.forEach((g, i) => { const n = npcByName(g); if (n) Object.assign(n, { x: cx + (i - (guests.length - 1) / 2) * 34, y: cy + 46 + (i % 2) * 14, path: [], wait: 30, face: 'up', emote: { kind: 'heart', t: 6 } }); });
  confetti = Array.from({ length: 140 }, (_, i) => ({ x: cx + (Math.random() - 0.5) * 220, y: cy - 120 - Math.random() * 160, vy: 30 + Math.random() * 40, ph: Math.random() * 6, col: ['#ff5a7a', '#ffd23a', '#5fd3ff', '#9cf06b', '#fff'][i % 5], life: 14 }));
  fanfare(); scene = { who: name, lines: [`Friends gather at the Park Chapel...`, `${name}: I promise to share every bone with you.`, `You: And I promise to always throw the ball.`, `Everyone: Hooray! Just married!`], i: -1, t: 99, wedding: true }; }
function confettiProps(dt) { if (!confetti.length) return []; return [{ y: 1e9, d: (c) => { for (const p of confetti) { c.fillStyle = p.col; c.fillRect(p.x + Math.sin(p.ph) * 6, p.y, 4, 3); } } }]; }
function stepConfetti(dt) { for (const p of confetti) { p.y += p.vy * dt; p.ph += dt * 4; p.life -= dt; if (p.y > (CHAPEL_POS.y + CHAPEL_POS.h + 3) * TILE) p.y -= 200; } confetti = confetti.filter((p) => p.life > 0); }
function relCtx() { const c = farmCtx(); return Object.assign(c, { townLine: (n) => (state.town?.folk[n] ? { line: lineFor(state.town, n, rng), f: state.town.folk[n], friends: friendsOf(state.town, n), rivals: rivalsOf(state.town, n) } : null), panel, say: (n, l) => feel.say(n, l, textBlip), emote: (n, k) => { const x = npcByName(n); if (x) x.emote = { kind: k, t: 2.5 }; }, scene: startScene, wedding: startWedding, coatOf: (n) => npcByName(n)?.coat || 'cream', rng, drawFurniture,
  preview: (cv, ids) => { if (!cv) return; const x = cv.getContext('2d'), home = { wall: ROOM_WALL_PREVIEW, floor: 2, items: [] }; let uid = 1; for (const id of ids) { let done = false; for (let y = 0; y < ROOM_H && !done; y++) for (let xx = 0; xx < ROOM_W && !done; xx++) if (canPlace(home, id, xx, y, 0)) { home.items.push({ uid: uid++, id, x: xx, y, rot: 0 }); done = true; } }
    x.clearRect(0, 0, cv.width, cv.height); drawRoom(x, home, 10, 70, 50, ROOM_W, ROOM_H - 3 > 0 ? 4 : ROOM_H); } }); }
const ROOM_WALL_PREVIEW = 2;
globalThis.__open = (k, o) => openPanel(k, o || {});
globalThis.__rel = { build: (id) => enterBuild(id, false), claim: (id) => claimPlot(state, id), place: (...a) => placeFurniture(state, ...a), start: startScene, wedding: startWedding, get scene() { return scene; } };
globalThis.__farm = { tick: (s) => farmTick(s), get fish() { return fish; } };
function playDuo(id, partner) { if (panel) closePanel(); keys.clear(); startJob(id, { state, rng, day: gameDay, blip, rustle, fanfare, done: (r) => { const d = PAIR.finishDuo(state, id, partner, r, gameDay()); ENG.addSeasonXp(state, 'duo', gameDay()); hud(); persist(); toast(`Duo with ${partner.name}! x${d.mult} · team ${d.team} (+${d.bonus} Bones)`, 'good'); }, closed: () => keys.clear() }); }
globalThis.__playDuo = playDuo;
// ---- Inu Arcade: full-screen overlay (desktop) or new tab (touch), passes wallet + Shiba profile ----
let arcadeTop = [];
async function fetchArcadeTop() { try { const r = await fetch(ARCADE.url + 'api/scores?game=arcade&period=weekly'); const j = await r.json(); arcadeTop = (j.entries || []).filter((e) => !e.house).slice(0, 3); } catch {} }
fetchArcadeTop(); setInterval(fetchArcadeTop, 120000);
function arcadeUrl() { const p = profileFromState(state), q = new URLSearchParams(); if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(p.wallet || '')) q.set('wallet', p.wallet);
  try { const lite = { ...p, pets: [] }; q.set('p', btoa(unescape(encodeURIComponent(JSON.stringify(lite)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')); } catch {}
  q.set('from', 'inu-verse'); q.set('spawn', 'arcade'); return ARCADE.url + '?' + q.toString(); }
function openArcade() { const url = arcadeUrl(), touch = matchMedia('(pointer: coarse)').matches; setMusicActive(false); // the arcade iframe plays its own music: duck the hub loop so two tracks never overlap
  if (touch) { const w = window.open(url, '_blank', 'noopener'); toast(w ? 'Inu Arcade opened in a new tab' : 'Allow pop-ups to open the arcade', w ? 'good' : 'bad'); return; }
  keys.clear(); let ov = document.getElementById('arcade-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'arcade-ov'; ov.innerHTML = '<div class="arc-bar"><button class="btn" id="arc-back">◀ Back to Inu Verse</button><b>INU ARCADE</b><a class="btn alt" id="arc-tab" target="_blank" rel="noopener">Open in new tab ↗</a></div><iframe id="arc-frame" allow="autoplay; fullscreen; gamepad" title="Inu Arcade"></iframe>'; document.body.appendChild(ov);
    ov.querySelector('#arc-back').onclick = closeArcade; }
  ov.querySelector('#arc-frame').src = url; ov.querySelector('#arc-tab').href = url; ov.hidden = false; arcadeOpen = true; setTimeout(() => ov.querySelector('#arc-frame').focus(), 300); }
// Rescue Station / Trainer Gate: open Inu Rescue / Inu Quest with the signed-in wallet (public address only; never a session).
function gameDoorUrl(id) { const g = GAME_DOORS.find((d) => d.id === id), w = state?.walletAddr, q = new URLSearchParams();
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(w || '')) q.set('wallet', w); if (DEMO) q.set('demo', '1'); q.set('from', 'inu-verse'); q.set('spawn', id); return g.url + '?' + q.toString(); }
function openGameDoor(id) { const url = gameDoorUrl(id), g = GAME_DOORS.find((d) => d.id === id); keys.clear(); const w = window.open(url, '_blank', 'noopener');
  toast(w ? `${g.name} opened in a new tab${/wallet=/.test(url) ? ' with your wallet' : ''}` : 'Allow pop-ups to open ' + g.name, w ? 'good' : 'bad'); }
globalThis.__doors = { url: gameDoorUrl, open: openGameDoor };
// ---- onboarding tour + wayfinding (src/guide.js, src/guideui.js) ----
const guide = createGuide({ state: () => state, mode: () => mode, toast: (m, k) => toast(m, k), panelOpen: () => !!panel, persist: () => persist(), miniBase: () => miniBase,
  wallet: () => state?.walletAddr, saveProfile: () => { if (state && hasCustomLook(state)) saveProfile(state); },
  walk: (path) => { player.path = path; player.target = null; player.clickMark = null; }, stopWalk: () => { player.path = []; } });
globalThis.__guide = guide;
function wayUi(on) { const w = document.getElementById('wayctl'); if (w) w.hidden = !on; }
async function tourCheck() { if (!state || mode !== 'world') return; const w = state.walletAddr; const prof = isRealWallet(w) ? await profileStore().get(w).catch(() => null) : null; guide.maybeStartTour(prof); }
// ---- Kibble Bank: read-only view of the wallet (kibble-pay). No deposits, lending or yield. ----
async function renderBank() { const body = $('#panel-body'), kp = K.kp, w = wallet(), signed = !DEMO && !!kp?.session;
  const bal = DEMO ? `${state.kibble.toFixed(2)} demo KIBBLE (fake)` : w.live ? (signed ? `${w.balanceUi ?? '…'} KIBBLE` : 'sign in to see') : 'wallet service offline';
  const P = DEMO ? poolsOf(state) : serverPools, fmtU = (u) => (Number(u || 0) / 1e6).toLocaleString('en-US', { maximumFractionDigits: 4 });
  body.innerHTML = `<h2>Kibble Bank</h2><p class="sub">A read-only window on your wallet. <b>No deposits, no lending, no yield</b>: your $KIBBLE stays in your own wallet.</p>
   <div class="bank"><div class="card"><b>Wallet</b><small id="bk-addr">${DEMO ? 'Demo mode (no wallet)' : signed ? esc(kp.address) : 'Not signed in'}</small>${!DEMO && !signed ? '<button class="btn" id="bk-sign">Sign in with Phantom</button>' : ''}</div>
   <div class="card"><b>$KIBBLE balance</b><small id="bk-bal">${esc(bal)}</small></div>
   <div class="card"><b>Prize pools (public)</b><small>${P ? `Daily ${fmtU(P.daily)} · Weekly ${fmtU(P.weekly)} · Monthly ${fmtU(P.monthly)}` : 'loading…'}</small><small>Burned (opt-in, all wallets): ${P?.burned != null ? fmtU(P.burned) : '–'}</small>
     <div class="row"><button class="btn alt" id="bk-pools">Prize pool board</button><button class="btn alt" id="bk-burn">Burn board</button><a class="btn ghost" href="https://kibble-pay.vercel.app/prize-rules.html" target="_blank" rel="noopener">Prize Rules ↗</a></div></div></div>
   <h3>Inventory</h3><div id="bk-inv" class="grid"><div class="card"><small>${DEMO ? 'Demo items live in your local save.' : signed ? 'Loading…' : 'Sign in to see items your wallet owns across every Inu game.'}</small></div></div>
   <h3>Purchase history</h3><div id="bk-hist"><p class="sub">${DEMO ? 'Demo purchases are not real and have no history.' : signed ? 'Loading…' : 'Sign in to see your purchases and burns.'}</p></div>`;
  $('#bk-pools').onclick = () => openPanel('city', { tab: 'pools' }); $('#bk-burn').onclick = () => openPanel('fly5', { tab: 'burn' });
  const sb = $('#bk-sign'); if (sb) sb.onclick = () => $('#btn-phantom').onclick().then(() => panel?.kind === 'bank' && renderBank());
  if (!signed) return;
  try { const [inv, hist] = await Promise.all([kp.inventory(), kp.history().catch(() => [])]); if (panel?.kind !== 'bank') return; const names = K.cfg?.items || {};
    const rows = Object.entries(inv || {}).flatMap(([g, items]) => Object.entries(items).filter(([, n]) => n > 0).map(([id, n]) => ({ g, id, n })));
    $('#bk-inv').innerHTML = rows.length ? rows.map((r) => `<div class="card"><b>${esc(names[r.id]?.name || r.id.replace(/^burn:/, 'Burn unlock: '))}</b><small>${esc(r.g)} · ×${r.n}</small></div>`).join('') : '<div class="card"><small>No items yet.</small></div>';
    $('#bk-hist').innerHTML = hist.length ? `<table class="board"><tr><th>When</th><th>What</th><th>Item</th><th>KIBBLE</th><th>Tx</th></tr>${hist.map((x) => `<tr><td>${new Date(x.at).toLocaleDateString()}</td><td>${x.type === 'burn' ? 'Burn (opt-in)' : 'Purchase'}</td><td>${esc(names[x.itemId]?.name || x.itemId || '–')}</td><td>${fmtU(x.amountBaseUnits)}</td><td><a href="https://solscan.io/tx/${encodeURIComponent(x.signature)}" target="_blank" rel="noopener">${esc(String(x.signature).slice(0, 6))}…</a></td></tr>`).join('')}</table>` : '<p class="sub">No purchases yet.</p>';
  } catch (e) { $('#bk-hist').innerHTML = `<p class="sub">Could not load: ${esc(e.message)}</p>`; } }
function closeArcade() { setMusicActive(true); const ov = document.getElementById('arcade-ov'); if (ov) { ov.hidden = true; ov.querySelector('#arc-frame').src = 'about:blank'; } arcadeOpen = false; fetchArcadeTop(); }
let arcadeOpen = false; globalThis.__arcade = { open: openArcade, close: closeArcade, url: arcadeUrl, get top() { return arcadeTop; } };
globalThis.__eng = ENG; globalThis.__fly5 = F5;
function playJob(id) { if (panel) closePanel(); keys.clear(); startJob(id, { state, rng, day: gameDay, blip, rustle, fanfare, done: (r) => { ENG.addSeasonXp(state, 'job', gameDay()); F5.tourneyScore(state, id, r.score || 0, Math.floor(gameDay() / 7)); hud(); persist(); if ((r.pb || r.rankUp) && state.town) playerDid(state.town, `You ${r.rankUp ? 'made ' + r.rank + ' as a' : 'set a new best as a'} ${JOB_DEFS[id].name.toLowerCase()} worker.`); toast(`${JOB_DEFS[id].name}: +${r.total} bones${r.pb ? ' · new best!' : ''}${r.rankUp ? ` · rank ${r.rank}!` : ''}`, 'good'); }, closed: () => keys.clear() }); }
globalThis.__playJob = playJob;
if (globalThis.kibblePay) setProfileStore(kibblePayProfileStore(globalThis.kibblePay)); // real SIWS-signed profile when the SDK is present
globalThis.__profile = { store: profileStore, setProfileStore, kibblePayProfileStore, mine: () => profileFromState(state), creator: () => creator };
const crew = makeCrew(); let adIdx = 0, adRot = 0, adT = 0, trend = []; globalThis.__ads = () => ({ trend, adRot, adIdx }); globalThis.__crew = crew;
function crewActors() { return crew.filter((w) => w.on).map((w) => ({ x: w.x, y: w.y, coat: w.coat, outfit: {}, face: w.face, phase: w.phase, moving: w.moving, name: w.name, worker: w, art: artKey(w.coat, {}) })); }
function crewProps() { const out = []; for (const w of crew) { if (!w.on) continue; if (w.cones) out.push({ y: w.cones[0][1] * TILE, d: (x) => drawCones(x, w) }); if (w.truck) out.push({ y: w.y - 30, d: (x) => drawCar(x, w.x - 40, w.y - 36, { col: '#2f8a4a', kind: 'pickup', dir: w.face === 'left' ? 'west' : 'east' }) }); }
  return out; }
function nearPup() { for (const w of crew) if (w.on && Math.hypot(w.x - state.player.x, w.y - state.player.y) < 40) return { workerRef: w, name: w.name }; const pet = activePet(state); if (pet && !drive && Math.hypot(petF.x - state.player.x, petF.y - state.player.y) < 34) return { pet, name: pet.name }; if (presidentPresent(pres) && Math.hypot(pres.x - state.player.x, pres.y - state.player.y) < 40) return { president: true, name: 'President Inu' }; let b = null, bd = 36; for (const n of npcs) { const d = Math.hypot(n.x - state.player.x, n.y - state.player.y); if (d < bd) { bd = d; b = n; } } return b; }
function presBanner(msg) { let b = document.getElementById('pres-banner'); if (!b) { b = document.createElement('div'); b.id = 'pres-banner'; b.style.cssText = 'position:fixed;left:50%;top:64px;transform:translateX(-50%);z-index:40;padding:10px 22px;background:#121a36;color:#f2cc68;border:3px solid #d4a640;font:14px Silkscreen,monospace;letter-spacing:1px;box-shadow:0 4px 0 #0008;pointer-events:none;text-align:center'; document.body.appendChild(b); }
  b.textContent = '★ ' + msg + ' ★'; b.hidden = false; clearTimeout(b._t); b._t = setTimeout(() => { b.hidden = true; }, 4500); }
function honk() { if (honkT > 0) return; honkT = 0.5; blip(392); setTimeout(() => blip(330), 120); feel.say && null; player.emote = { kind: 'bork', t: 0.8, honk: true }; for (const n of npcs) if (Math.hypot(n.x - state.player.x, n.y - state.player.y) < 120) n.emote = { kind: 'wave', t: 1.2 }; }
function parkedNear() { const g = ensureGarage(state), pk = g.parked; return pk && !drive && Math.hypot(pk.x - state.player.x, pk.y - state.player.y) < 48 ? pk : null; }
function carAction() { // E/A: park (while driving) or hop into the parked car next to you
  const g = ensureGarage(state);
  if (drive) { if (drive.v > 30) { toast('Slow down to park', ''); return true; } g.parked = { id: drive.car.id, x: state.player.x, y: state.player.y, dir: drive.dir }; drive = null; state.player.y += 30; if (isSolid(Math.floor(state.player.x / TILE), Math.floor(state.player.y / TILE))) state.player.y -= 60; toast('Parked. Press E by your car to hop back in.', 'good'); persist(); return true; }
  const pk = parkedNear(); if (pk && !nearestInteractable(state, state.player.x, state.player.y)) { const car = carOf(state, pk.id); if (!car) { g.parked = null; return false; } drive = { car, v: 0, vx: 0, vy: 0, dir: pk.dir || 'east' }; state.player.x = pk.x; state.player.y = pk.y; g.parked = null; blip(520); return true; }
  return false; }
function spawnCar(id) { const g = ensureGarage(state), car = carOf(state, id); if (!car) return; g.active = id; g.parked = null; drive = { car, v: 0, vx: 0, vy: 0, dir: 'east' }; closePanel(); toast(`Hop in! Drive with WASD/stick, H/B to honk, E/A to park.`, 'good'); persist(); }
function petPup(n) { if (n.workerRef) { const w = n.workerRef; blip(880); if (w.chatted) { w.chatted = false; playJob(WORKER_JOB[w.job]); return; } w.chatted = true; feel.say(`${w.name} (${w.job})`, w.line + ' (talk again for an odd job)', textBlip); return; }
  if (n.pet) { petF.love = 2; blip(990); feel.say(n.pet.name, ['*happy noises*', '*nuzzles you*', '*purrs/chirps contentedly*', '*does a little spin*'][Math.floor(rng() * 4)], textBlip); return; }
  if (n.president) { if (pres.stage === 'visit') { const d = claimPresDrop(state, 'visit' + pres.n); if (d.ok) { toast(`President Inu gave you a free limited drop: ${d.drop.name}!`, 'good'); persist(); } } const r = presTalk(pres, state); pres.emote = { kind: 'heart', t: 2 }; blip(990); feel.say('President Inu', r.quote, textBlip); if (r.tip) { toast(`President Inu tipped you ${r.tip} bones!`, 'good'); hud(); persist(); } return; } n.wag = 1.2; n.path = []; blip(990); if (REL.PEOPLE[n.name]) { const r = REL.chat(state, n.name, gameDay()); if (r.gain) n.emote = { kind: 'heart', t: 2.2 }; persist(); openPanel('friend', { name: n.name }); if (r.scene) startScene(n.name, REL.SCENES[r.scene](n.name)); return; } feel.say(n.name, PUP_LINES[Math.floor(rng() * PUP_LINES.length)], textBlip); }
const PUP_LINES = ['Woof! That spot behind the ears... perfect!', 'Arf! Have you tried the taiyaki cart on Main Street?', 'Wanna race to Sakura Pond? Last one there is a wet biscuit!', 'I buried a bone by the big tree. Shh, it is a secret.', 'Bork bork! The Launch Hall is busy today.'];
const CHAT_PLACE = { cafe: 'cafe', shop: 'shop', fashion: 'shop', cars: 'shop', launch: 'mall', mall: 'mall', square: 'mall', arcade: 'arcade', bank: 'bank', chapel: 'chapel', farm: 'farm', field: 'farm', gamedoor: 'game', visit: 'home', plot: 'home', matchmaker: 'park', lot: 'shop' };
function chatPlace(x, y) { const it = nearestInteractable(state, x, y, 5); return it && (CHAT_PLACE[it.id] || CHAT_PLACE[it.kind]); }
function doEmote(kind) { emoteBubble('me', kind, time); player.emote = { kind, t: kind === 'zoomies' ? 2.4 : 2.5 }; $('#emotes').hidden = true; blip(kind === 'heart' ? 990 : 740);
  for (const n of npcs) if (Math.hypot(n.x - state.player.x, n.y - state.player.y) < 260 && rng() < 0.6) setTimeout(() => { n.emote = { kind: rng() < 0.5 ? kind : 'heart', t: 2 }; }, 400 + rng() * 600); }
function toggleEmotes() { const e = $('#emotes'); e.hidden = !e.hidden; }
$('#emotes').onclick = (e) => { const b = e.target.closest('[data-emote]'); if (b) doEmote(b.dataset.emote); };
function toggleMute() { setMuted(!isMuted()); $('#btn-mute').textContent = isMuted() ? 'Sound off' : 'Sound on'; }
function togglePhoto() { photo = !photo; document.body.classList.toggle('photo', photo); if (photo) { const a = document.querySelector('#photo-share'); if (a) a.href = F5.shareXUrl('Snap from Inu Verse'); } }
$('#btn-mute').onclick = () => { initAudio(); toggleMute(); };
$('#btn-emote').onclick = () => toggleEmotes();
$('#btn-photo').onclick = () => togglePhoto();
$('#btn-engage').onclick = () => { initAudio(); uiClick?.(); openPanel('engage'); };
$('#btn-pools').onclick = () => { initAudio(); uiClick?.(); openPanel('city', { tab: 'pools' }); };
$('#photo-save').onclick = () => { const tmp = document.createElement('canvas'); tmp.width = cv.width; tmp.height = cv.height; const tx = tmp.getContext('2d'); tx.drawImage(cv, 0, 0); F5.watermarkPhoto(tx, tmp.width, tmp.height); const a = document.createElement('a'); a.download = `inu-verse-${Date.now()}.png`; a.href = tmp.toDataURL('image/png'); a.click(); F5.submitPhoto(state, Math.floor(gameDay() / 7), { caption: 'Inu Verse snap' }); toast('Photo saved + entered this week\'s board', 'good'); };
$('#photo-exit').onclick = () => togglePhoto();
$('#btn-phantom').onclick = async () => { initAudio(); if (DEMO) return toast('Demo mode: fake KIBBLE, no wallet. Remove ?demo=1 to use Phantom.', ''); if (!K.kp) return toast('Wallet service is offline right now. Try again soon.', 'bad');
  try { const a = await wallet().connect(); if (state) { state.walletAddr = a; if (hasCustomLook(state)) await saveProfile(state); persist(); hud(); tourCheck(); } toast(`Signed in ${a.slice(0, 4)}…${a.slice(-4)}${K.mode === 'live' ? '' : ' · ' + SOON}`, 'good'); } catch (e) { toast(e.message || 'Phantom sign-in failed', 'bad'); } };
$('#btn-help').onclick = () => openPanel('help');
$('#btn-guide').onclick = () => guide?.startTour(true);
$('#btn-pack').onclick = () => { if (mode === 'world') openPanel('packs'); };
$('#btn-wardrobe').onclick = () => { if (mode === 'world') openPanel('wardrobe'); };
$('#btn-garage').onclick = () => { if (mode === 'world') openPanel('garage'); };
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
  const act = () => { if (feel.talking()) return feel.advance(); if (mode !== 'world' || panel || !state) return; if (carAction()) return; const it = nearestInteractable(state, state.player.x, state.player.y); const pup = nearPup(); if (pup && !it) petPup(pup); else if (it) interact(it); };
  $('#btn-a').addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); act(); });
  $('#btn-b').addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); if (mode === 'world' && !panel && state) { if (drive) return honk(); bork(); player.emote = { kind: 'bork', t: 1.2 }; emoteBubble('me', 'bork', time); } });
  $('#btn-menu')?.addEventListener('pointerdown', (e) => { e.preventDefault(); });
}

// ---------------- World update ----------------
function updateWorld(dt) {
  const p = state.player; let dx = 0, dy = 0;
  if (!panel) {
    if (keys.has('w') || keys.has('arrowup')) dy -= 1; if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1; if (keys.has('d') || keys.has('arrowright')) dx += 1;
  }
  if (!panel && (touch.x || touch.y)) { dx = touch.x; dy = touch.y; }
  const speed = 92; // world px/s (world is zoomed 2x, so ~184 screen px/s)
  if (drive) { player.path = []; const m = CAR_MODELS[drive.car.model], top = m.speed, l = Math.hypot(dx, dy);
    if (l) { drive.v = Math.min(top, drive.v + 260 * dt); drive.vx = dx / l; drive.vy = dy / l; drive.dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north'); } else drive.v = Math.max(0, drive.v - 320 * dt);
    if (drive.v > 0) { const bx = p.x, by = p.y; moveBody(p, drive.vx * drive.v * dt, drive.vy * drive.v * dt, 14); if (Math.hypot(p.x - bx, p.y - by) < drive.v * dt * 0.3 && l) { drive.v *= 0.3; if (drive.bump <= 0) { blip(180); drive.bump = 0.4; } } }
    drive.bump = (drive.bump || 0) - dt; player.moving = false; player.face = { east: 'right', west: 'left', south: 'down', north: 'up' }[drive.dir]; dx = dy = 0; }
  if (dx || dy) { player.path = []; player.target = null; const l = Math.hypot(dx, dy); moveBody(p, (dx / l) * speed * dt, (dy / l) * speed * dt); if (dx) player.dir = dx > 0 ? 1 : -1; player.face = dx ? (dx > 0 ? 'right' : 'left') : (dy > 0 ? 'down' : 'up'); player.moving = true; }
  else if (player.path.length) {
    const [tx, ty] = player.path[0], gx = (tx + 0.5) * TILE, gy = (ty + 0.5) * TILE, ddx = gx - p.x, ddy = gy - p.y, d = Math.hypot(ddx, ddy), st = speed * dt;
    if (d <= st) { p.x = gx; p.y = gy; player.path.shift(); if (!player.path.length && player.target) { const t = player.target; player.target = null; interact(t); } }
    else { p.x += (ddx / d) * st; p.y += (ddy / d) * st; }
    if (Math.abs(ddx) > 1) player.dir = ddx > 0 ? 1 : -1; if (d > 0.5) player.face = Math.abs(ddx) > Math.abs(ddy) ? (ddx > 0 ? 'right' : 'left') : (ddy > 0 ? 'down' : 'up'); player.moving = true;
  } else player.moving = false;
  if (player.moving) player.phase += dt * 12; else player.phase += dt * 2;
  { const nowH = ((time + dayOffset) / DAY_LEN) * 24;
    if (PRES_Q && !presForced) { presForced = true; startVisit(pres, PRES_KINDS.includes(PRES_Q) ? PRES_Q : null, { dayLen: DAY_LEN }); }
    updatePresident(pres, dt, { nowH, dayLen: DAY_LEN, npcs, rng, toast: (s) => toast(s, 'good'), banner: presBanner, fanfare, snack: () => toast('President Inu bought a taiyaki from the snack cart!', 'good') }); }
  adT += dt; if (adT > 8 || !trend.length) { adT = 0; adRot++; trend = RC.realTrend(REG.coins, 6); if (adRot % 8 === 1) refreshRegistry(); }
  farmTick(dt); if (state.bones < 0) state.bones = 0;
  stepCrew(crew, dt, dayPhase(time + dayOffset).hour, () => { adIdx++; });
  stepScene(dt); stepConfetti(dt); stepPups(dt);
  { const h = Math.floor(dayPhase(time + dayOffset).hour), pOn = pres.on && pres.stage !== 'away', replan = pOn !== presWas; presWas = pOn; if (state.town && (h !== townH || replan)) { const fresh = h !== townH; townH = h; for (const e of townHour(state.town, { rng, hour: h, day: gameDay(), president: pOn ? pres : null, replan: !fresh })) {
      if (e.kind === 'shopClosed' || e.kind === 'shopOpened' || e.kind === 'job' || e.kind === 'friends' || e.kind === 'rivals') toast(state.town.log[0]?.text || '', ''); } } }
  for (const n of npcs) { const tf = state.town?.folk[n.name]; if (state.spouse?.name === n.name && !scene) { const H = state.spouse.helps === 'biz' && state.biz?.mine ? LOTS_POS[state.biz.mine.lot] : [17.5, 92.6]; if (H && Math.hypot(n.x - H[0] * TILE, n.y - H[1] * TILE) > 64) { n.x = H[0] * TILE; n.y = H[1] * TILE; n.path = []; } n.wait = Math.max(n.wait || 0, 1); }
    if (amb.ball?.dog === n && amb.ball.state !== 'air') continue; if (n.wag > 0) { n.wag -= dt; n.moving = true; n.phase += dt * 20; continue; } if (n.emote) { n.emote.t -= dt; if (n.emote.t <= 0) n.emote = null; } const arr = updateNpc(n, dt, rng, scene || state.spouse?.name === n.name ? null : tf?.goal); if (tf) { if (arr && !tf.arrived && tf.act !== 'nap' && rng() < 0.3) n.emote = { kind: tf.mood === 'grumpy' ? 'angry' : tf.mood === 'happy' ? 'happy' : 'note', t: 1.6 }; tf.arrived = arr; } }
  { const pet = activePet(state); if (pet && !drive) { if (!petF.id || petF.id !== pet.id) Object.assign(petF, { id: pet.id, x: p.x - 20, y: p.y + 4 }); followStep(petF, p.x - player.dir * 22, p.y + 2, dt); if (petF.love > 0) petF.love -= dt; } else if (drive) Object.assign(petF, { x: p.x, y: p.y }); }
  if (honkT > 0) honkT -= dt;
  if (player.emote) { player.emote.t -= dt; if (player.emote.kind === 'zoomies') { const a = player.emote.t * 5; moveBody(p, Math.cos(a) * 150 * dt, Math.sin(a) * 150 * dt); player.moving = true; player.phase += dt * 20; player.face = Math.cos(a + 1.57) > 0 ? 'right' : 'left'; } if (player.emote.t <= 0) player.emote = null; }
  { const vw = innerWidth / ZOOM, vh = innerHeight / ZOOM; stepAlive(ALIVE, dt, { x0: cam.x - vw / 2, y0: cam.y - vh / 2, x1: cam.x + vw / 2, y1: cam.y + vh / 2 }); }
  for (const e of stepAmbient(amb, dt, p, npcs)) { if (e.kind === 'flush') chirp(); if (e.kind === 'fetched') toast(`${e.who} brought the ball back!`, 'good'); }
  if (rng() < dt * 0.08) chirp();
  if (player.moving) { stepAcc += dt; if (stepAcc > 0.26) { stepAcc = 0; const tt = MAP[Math.floor(p.y / TILE)]?.[Math.floor(p.x / TILE)]; if (tt === T.GRASS || tt === T.FLOWER) { feel.rustle(p.x, p.y + 10); rustle(); } else { feel.dust(p.x, p.y + 11); footstep(); } } }
  feel.step(dt); document.body.classList.toggle('driving', !!drive);
  if (mode === 'world' && !panel && !drive && !entering && !arcadeOpen) { doorAcc -= dt; if (doorAcc <= 0) { doorAcc = 1; doorsNow = doorList(state).filter((d) => d.kind !== 'plot' || state.plots[d.id]); }
    const d = doorStep(doorSt, { x: p.x, y: p.y, face: player.face, moving: player.moving }, doorsNow, time); if (d) enterDoor(d); }
  { const vw = innerWidth / ZOOM, vh = innerHeight / ZOOM; stepChat({ now: time, player: p, npcs, hour: dayPhase(time + dayOffset).hour, rain: amb.rain > 0.3, rng, inView: (x, y) => Math.abs(x - cam.x) < vw / 2 - 20 && Math.abs(y - cam.y) < vh / 2 - 30, placeOf: chatPlace }); }
  mailAcc += dt; if (mailAcc > 45) { mailAcc = 0; if (rng() < 0.6 && addMail(state, rng)) { toast('New note in your mailbox!', 'good'); persist(); } }
  // smooth camera
  const k = 1 - Math.pow(0.004, dt), lead = player.moving ? 10 : 0, fx = { left: -1, right: 1 }[player.face] || 0, fy = { up: -1, down: 1 }[player.face] || 0;
  guide.update(dt); const tc = guide.camTarget(), kk = tc ? 1 - Math.pow(0.02, dt) : k;
  cam.x += ((tc ? tc.x : p.x + fx * lead) - cam.x) * kk; cam.y += ((tc ? tc.y : p.y + fy * lead * 0.6) - cam.y) * kk;
  Object.assign(cam, clampCam(cam.x, cam.y, innerWidth / ZOOM, innerHeight / ZOOM, MAP_W * TILE, MAP_H * TILE));
  if (globalThis.__camLock) { cam.x = __camLock.x; cam.y = __camLock.y; } // debug/screenshot camera lock
  const it = !panel && nearestInteractable(state, p.x, p.y);
  const pr = $('#prompt');
  const pup = !panel && !it && nearPup(); // (President Inu counts as a pup to pet/talk to)
  const tch = COARSE.matches;
  const pk = !panel && !it && parkedNear();
  if (drive) { pr.hidden = false; pr.innerHTML = `<kbd${tch ? ' class="ta"' : ''}>${tch ? 'A' : 'E'}</kbd>Park ${esc(CAR_MODELS[drive.car.model].name)} · <kbd${tch ? ' class="ta"' : ''}>${tch ? 'B' : 'H'}</kbd>Honk`; setA('PARK'); }
  else if (pk) { pr.hidden = false; pr.innerHTML = `<kbd${tch ? ' class="ta"' : ''}>${tch ? 'A' : 'E'}</kbd>Drive your ${esc(CAR_MODELS[carOf(state, pk.id)?.model]?.name || 'car')}`; setA('DRIVE'); }
  else if (pup?.workerRef) { pr.hidden = false; const v = pup.workerRef.chatted ? `Play ${JOB_DEFS[WORKER_JOB[pup.workerRef.job]].name} with` : 'Chat with'; pr.innerHTML = tch ? `<kbd class="ta">A</kbd>${v} ${esc(pup.name)}` : `<kbd>E</kbd>${v} ${esc(pup.name)}`; setA('TALK'); }
  else if (pup) { pr.hidden = false; const v = REL.PEOPLE[pup.name] && !pup.pet ? `Talk to ${esc(pup.name)} ${'♥'.repeat(REL.hearts(REL.ensureRel(state)[pup.name]))}` : `Pet ${esc(pup.name)}`; pr.innerHTML = tch ? `<kbd class="ta">A</kbd>${v}` : `<kbd>E</kbd>${v} · <kbd>T</kbd> throw ball`; setA(REL.PEOPLE[pup.name] && !pup.pet ? 'TALK' : 'PET'); }
  else if (it) { pr.hidden = false; const verb = { community: 'Open', gamedoor: 'Play', bank: 'Enter', arcade: 'Play at', matchmaker: 'Browse', square: 'Open', building: 'Enter', plot: state.plots[it.id] ? 'Enter' : 'Inspect', visit: 'Visit', stall: 'View', clubhouse: myPack(state) ? 'Decorate' : 'Open', mall: 'Enter', field: 'Tend', farm: 'Use', lot: 'Visit', biz: 'Read', chapel: 'Enter' }[it.kind] || 'Use'; pr.innerHTML = isWalkDoor(it) ? `<kbd>${it.side === 'left' ? '▶' : it.side === 'right' ? '◀' : '▲'}</kbd>Walk in to ${verb === 'Enter' ? 'enter' : verb.toLowerCase()} ${esc(it.name)}` : `<kbd${tch ? ' class="ta"' : ''}>${tch ? 'A' : 'E'}</kbd>${verb} ${esc(it.name)}`; pr.dataset.target = it.id; setA(isWalkDoor(it) ? '' : verb.toUpperCase()); }
  else { pr.hidden = true; setA(''); }
}

let snapPx = (v) => Math.round(v * 2) / 2;
function renderWorld() {
  const dpr = devicePixelRatio, SW = innerWidth, SH = innerHeight, vw = SW / ZOOM, vh = SH / ZOOM; ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false; ctx.fillStyle = '#141a2e'; ctx.fillRect(0, 0, SW, SH); ctx.setTransform(dpr * ZOOM, 0, 0, dpr * ZOOM, 0, 0); // world drawn at ZOOM; Shibas drawn back at 1/ZOOM so they keep their on-screen size
  // camera + actors snapped to the SAME device-pixel grid (q world px = 1 device px). The old 2-world-px camera grid moved the
  // background in 4 CSS px hops while Shibas moved in 1 px steps, so the player visibly wobbled against the world (jitter).
  const q = 1 / (ZOOM * dpr), snapQ = (v) => Math.round(v / q) * q; snapPx = snapQ;
  const ox = snapQ(vw / 2 - cam.x), oy = snapQ(vh / 2 - cam.y);
  globalThis.__camDbg = { x: ox * ZOOM, y: oy * ZOOM, px: (ox + snapQ(state.player.x)) * ZOOM, py: (oy + snapQ(state.player.y)) * ZOOM }; // jitter probe: bg offset + player screen pos (CSS px)
  const G = mapImg.ground, sx = Math.max(0, Math.floor(-ox / SCALE)), sy = Math.max(0, Math.floor(-oy / SCALE)), sw = Math.min(G.width - sx, Math.ceil(vw / SCALE) + 1), sh = Math.min(G.height - sy, Math.ceil(vh / SCALE) + 1);
  ctx.drawImage(G, sx, sy, sw, sh, ox + sx * SCALE, oy + sy * SCALE, sw * SCALE, sh * SCALE);
  ctx.save(); ctx.translate(ox, oy);
  { // animated water (native pixels, scaled)
    const tx0 = Math.floor(-ox / TILE) - 1, ty0 = Math.floor(-oy / TILE) - 1; ctx.save(); ctx.scale(SCALE, SCALE); drawWater(ctx, time, tx0, ty0, tx0 + Math.ceil(vw / TILE) + 2, ty0 + Math.ceil(vh / TILE) + 2); ctx.restore(); }
  const phase = dayPhase(time + dayOffset);
  globalThis.__inuNight = phase.dark;
  const dyn = [...dynamicProps(state, time, myPack(state)), ...presidentProps(pres, time), ...doorProps(time), ...carWorldProps(), ...crewProps(), ...adProps(trend, adRot, adIdx, !!globalThis.__inuNight, time, featuredMap()), ...confettiProps(), ...squareProps(state, time, Math.floor(gameDay() / 7)), ...arcadeProps(time, arcadeTop)];
  for (const d of dyn) if (d.flat) d.d(ctx);
  const view = { x0: -ox, y0: -oy, x1: -ox + vw, y1: -oy + vh };
  drawGroundLife(ctx, amb, phase); drawAliveGround(ctx, ALIVE, view, phase); feel.drawGround(ctx);
  if (player.clickMark && player.path.length) { const m = player.clickMark, k = Math.round(10 + Math.sin(time * 6) * 2); ctx.fillStyle = '#f2cc68'; for (const [ax, ay] of [[-k, 0], [k - 4, 0], [0, -k / 2], [0, k / 2 - 2]]) ctx.fillRect(Math.round(m.x + ax), Math.round(m.y + 6 + ay), 4, 3); }
  const actors = [...npcs.map((n) => ({ ...n, npc: true, badge: badgeOf(packOfName(state, n.name)) })), ...(drive ? [] : [{ x: state.player.x, y: state.player.y, coat: state.player.coat, outfit: state.wardrobe.equipped, face: player.face, phase: player.phase, moving: player.moving, name: state.player.name, me: true, badge: badgeOf(myPack(state)), emote: player.emote, art: artKey(state.player.coat, state.wardrobe.equipped), profile: hasCustomLook(state) ? myProfile() : null }]), ...streetPups(), ...presActors(), ...petActors(), ...crewActors(), ...pupActors()];
  // one depth-sorted list: static props (culled), dynamic props and actors, by ground y
  const L = -ox - 200, Rt = -ox + vw + 200, Tp = -oy - 60, Bt = -oy + vh + 400, list = [];
  for (const p of mapImg.props) if (p.y > Tp && p.y < Bt) list.push(p);
  for (const p of dyn) if (!p.flat) list.push(p);
  for (const p of carProps(amb)) list.push(p);
  for (const a of actors) if (a.x > L && a.x < Rt && a.y > Tp && a.y < Bt) list.push({ y: a.y + 6, a });
  list.sort((p, q) => p.y - q.y);
  for (const it of list) {
    if (!it.a) { it.d(ctx); continue; }
    const a = it.a;
    if (a.statue) { ctx.fillStyle = '#6a6080'; ctx.fillRect(Math.round(a.x - 34), Math.round(a.y - 4), 68, 18); ctx.fillStyle = '#d4a640'; ctx.fillRect(Math.round(a.x - 38), Math.round(a.y - 8), 76, 5); ctx.fillStyle = '#121a36'; ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = 'center'; ctx.fillText('PRESIDENT INU', Math.round(a.x), Math.round(a.y + 8)); ctx.save(); ctx.filter = 'sepia(1) saturate(2.6) brightness(1.05)'; drawShiba(ctx, a.x, a.y - 10, { art: a.art, scale: 1.5, shadow: false }); ctx.restore(); continue; }
    ctx.save(); ctx.translate(snapPx(a.x), snapPx(a.y)); ctx.scale(0.5, 0.5);
    if (a.me) { ctx.fillStyle = 'rgba(242,204,104,0.45)'; ctx.fillRect(-20, 9, 40, 4); ctx.fillRect(-14, 7, 28, 8); }
    if (a.petSpecies) { drawPetActor(ctx, a); ctx.restore(); continue; }
    if (a.president) { drawPresident(ctx, a); if (a.emote) drawEmote(ctx, 0, -14, a.emote.kind, time); ctx.restore(); continue; }
    if (a.pupScale) { if (a.customPup) drawProfileShiba(ctx, 0, 0, a.profile, { face: a.face, phase: a.phase, moving: a.moving, name: a.name, scale: a.pupScale, fid: a.name }); else { drawShiba(ctx, 0, 0, { coat: a.coat, outfit: a.outfit, face: a.face, phase: a.phase, moving: a.moving, name: a.name, scale: a.pupScale, art: a.art, fid: a.name, wag: a.wag }); ctx.fillStyle = a.pupPatch; ctx.fillRect(-7 * a.pupScale, -30 * a.pupScale, 14 * a.pupScale, 4 * a.pupScale); ctx.fillStyle = a.pupHex; ctx.fillRect(-7 * a.pupScale, -26 * a.pupScale, 14 * a.pupScale, 3 * a.pupScale); } ctx.restore(); continue; }
    if (a.me) { const gl = statusGlow(state); if (gl) drawFlair(ctx, gl, time); }
    if (a.profile) { drawProfileShiba(ctx, 0, 0, a.profile, { face: a.face, phase: a.phase, moving: a.moving, name: a.name, scale: 1.5, badge: a.badge, fid: a.me ? 'me' : a.name, emote: a.emote?.kind }); if (a.emote) drawEmote(ctx, 0, -110, a.emote.kind, time); }
    else drawShiba(ctx, 0, 0, { coat: a.coat, outfit: a.outfit, face: a.face, phase: a.phase, moving: a.moving, name: a.name, scale: 1.5, badge: a.badge, art: a.art, emote: a.emote?.kind, fid: a.me ? 'me' : a.name || a.id, wag: a.wag });
    if (a.worker) { drawVest(ctx, a.face); drawTool(ctx, a.worker); }
    if (a.emote) drawEmote(ctx, 0, a.name ? -14 : 0, a.emote.kind, time); ctx.restore();
  }
  feel.drawAir(ctx);
  drawChat(ctx, (id) => { if (id === 'me') return drive ? null : { x: state.player.x, y: state.player.y - 60 }; const n = npcs.find((q) => q.name === id); return n && { x: n.x, y: n.y - (n.pupScale ? 40 * n.pupScale + 10 : 60) - (n.badge || packOfName(state, n.name) ? 8 : 0) }; }, time);
  drawSkyLife(ctx, amb, phase); drawAliveSky(ctx, ALIVE, view, phase);
  const it = !panel && nearestInteractable(state, state.player.x, state.player.y); if (it) feel.bubble(ctx, (it.tx + 0.5) * TILE, (it.ty) * TILE - 6, time);
  guide.drawWorld(ctx, time, state.player);
  ctx.restore();
  drawAtmosphere(ctx, amb, phase, { x: vw / 2 - ox, y: vh / 2 - oy }, vw, vh, lightsFor(state, phase, homeId()));
  $('#clock').textContent = `${String(Math.floor(phase.hour)).padStart(2, '0')}:${String(Math.floor((phase.hour % 1) * 60)).padStart(2, '0')} ${amb.rain > 0.3 ? 'rain' : phase.label} · ${seasonOf(gameDay())}`;
  if (!vignette || vignette.width !== SW || vignette.height !== SH) { vignette = document.createElement('canvas'); vignette.width = SW; vignette.height = SH; const v = vignette.getContext('2d'), g = v.createRadialGradient(SW / 2, SH / 2, SH * 0.45, SW / 2, SH / 2, SH * 1.05); g.addColorStop(0, 'rgba(18,26,54,0)'); g.addColorStop(1, 'rgba(12,16,34,0.38)'); v.fillStyle = g; v.fillRect(0, 0, SW, SH); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.drawImage(vignette, 0, 0);
  minimap(-ox, -oy, vw, vh);
  guide.drawScreen(ctx, ox, oy, ZOOM, time);
}

function homeId() { if (mode === 'build' && build && !build.readOnly && !build.pack) return build.plotId; for (const p of PLOTS) if (state.plots[p.id] && Math.abs(state.player.x / TILE - (p.x + 3)) < 5 && Math.abs(state.player.y / TILE - (p.y + 3)) < 5) return p.id; return null; }
// busker by the clubhouse plaza + two pups playing by Sakura Pond
const presCache = new Map();
function drawPresident(c, a) { // navy suit, gold tie (recoloured), sash, sunglasses, gold name tag; drawn at screen scale
  const fr = a.moving ? Math.floor(a.phase / 1.6) % 4 : 0, key = a.face + fr; let cv = presCache.get(key);
  if (!cv) { cv = document.createElement('canvas'); cv.width = 160; cv.height = 180; const x = cv.getContext('2d'); drawShiba(x, 80, 150, { coat: 'golden', outfit: PRES_OUTFIT, face: a.face, phase: a.phase, moving: a.moving, scale: 1.5, art: a.art, shadow: false });
    const d = x.getImageData(0, 0, 160, 180), p = d.data; let y0 = 180, y1 = 0, x0 = 160, x1 = 0;
    for (let i = 0; i < p.length; i += 4) { if (p[i + 3] > 40) { const q = i / 4, px = q % 160, py = (q / 160) | 0; y0 = Math.min(y0, py); y1 = Math.max(y1, py); x0 = Math.min(x0, px); x1 = Math.max(x1, px); }
      if (p[i] > 150 && p[i + 1] < 90 && p[i + 2] < 90 && p[i + 3] > 0) { p[i] = 227; p[i + 1] = 179; p[i + 2] = 65; } } // red tie -> gold tie
    x.putImageData(d, 0, 0);
    if (a.face !== 'up') { const h = y1 - y0, w = x1 - x0, sx0 = x0 + w * 0.3, sy0 = y0 + h * 0.5, sx1 = x0 + w * 0.68, sy1 = y0 + h * 0.74; // diagonal sash across the chest
      for (let t = 0; t <= 1; t += 0.03) { const sx = Math.round(sx0 + (sx1 - sx0) * t), sy = Math.round(sy0 + (sy1 - sy0) * t); x.fillStyle = '#b3202c'; x.fillRect(sx - 2, sy - 3, 5, 6); x.fillStyle = '#e3b341'; x.fillRect(sx - 2, sy - 3, 5, 1); x.fillRect(sx - 2, sy + 2, 5, 1); } }
    cv.top = y0; presCache.set(key, cv); }
  c.fillStyle = 'rgba(10,14,30,.3)'; c.beginPath(); c.ellipse(0, 11, 22, 6, 0, 0, 7); c.fill();
  c.save(); if (a.face === 'left' && false) c.scale(-1, 1); c.drawImage(cv, -80, -138); c.restore();
  if (a.coffee) { c.fillStyle = '#141a2e'; c.fillRect(17, -40, 12, 16); c.fillStyle = '#f4f1ea'; c.fillRect(18, -39, 10, 14); c.fillStyle = '#8a5a30'; c.fillRect(18, -34, 10, 4); c.fillStyle = '#141a2e'; c.fillRect(17, -42, 12, 3); }
  const tagY = cv.top - 138 - 14; c.font = '8px Silkscreen, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; const tw = Math.ceil(c.measureText('PRESIDENT INU').width) + 14;
  c.fillStyle = '#121a36'; c.fillRect(-tw / 2 - 2, tagY - 8, tw + 4, 16); c.fillStyle = '#d4a640'; c.fillRect(-tw / 2, tagY - 6, tw, 12); c.fillStyle = '#ffe08a'; c.fillRect(-tw / 2, tagY - 6, tw, 1); c.fillStyle = '#121a36'; c.fillText('PRESIDENT INU', 0, tagY + 1); }
function petActors() { const pet = activePet(state); if (!pet || drive) return []; return [{ x: petF.x, y: petF.y, petSpecies: pet.species, petPal: pet.burn ? pet.pal : null, petName: pet.name, dir: petF.dir, moving: petF.moving, phase: petF.phase, love: petF.love }]; }
function drawPetActor(c, a) { const spr = petSprite(a.petSpecies, Math.floor(a.phase / 2.5) % 2, a.petPal), hop = a.moving ? -Math.abs(Math.sin(a.phase)) * 4 : 0;
  c.fillStyle = 'rgba(10,14,30,.3)'; c.beginPath(); c.ellipse(0, 10, 18, 5, 0, 0, 7); c.fill(); c.save(); if (a.dir < 0) c.scale(-1, 1); c.drawImage(spr, -24, -36 + hop, 48, 48); c.restore();
  if (a.love > 0) { c.fillStyle = '#ff5a8a'; const y = -44 - (2 - a.love) * 10; c.fillRect(-6, y, 4, 4); c.fillRect(2, y, 4, 4); c.fillRect(-6, y + 2, 12, 4); c.fillRect(-4, y + 6, 8, 2); c.fillRect(-2, y + 8, 4, 2); }
  c.font = '8px Silkscreen, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; const tw = Math.ceil(c.measureText(a.petName).width) + 8; c.fillStyle = '#121a36'; c.fillRect(-tw / 2, -54, tw, 11); c.fillStyle = '#f6e7b8'; c.fillText(a.petName, 0, -48); }
function carWorldProps() { const out = [], g = ensureGarage(state), col = (c) => CAR_COLORS[c.color] || (c.color === 'gold' ? '#e3b341' : c.color === 'midnight' ? '#1a1a28' : '#c8323c');
  if (drive) { const p = state.player, c = drive.car; out.push({ y: p.y + 10, d: (x) => { drawCar(x, p.x, p.y + 12, { col: col(c), kind: CAR_MODELS[c.model]?.kind || 'supercar', dir: drive.dir, glow: c.glow }); if (honkT > 0.2) { x.fillStyle = '#fff6c8'; x.font = '8px Silkscreen, monospace'; x.textAlign = 'center'; x.fillText('HONK!', p.x, p.y - 34); } } }); }
  if (g.parked) { const pk = g.parked, c = carOf(state, pk.id); if (c) out.push({ y: pk.y + 10, d: (x) => drawCar(x, pk.x, pk.y + 12, { col: col(c), kind: CAR_MODELS[c.model]?.kind || 'supercar', glow: c.glow, dir: pk.dir || 'east' }) }); }
  const free = (c) => (!drive || drive.car.id !== c.id) && (!g.parked || g.parked.id !== c.id), home = [g.cars.find((c) => c.id === g.active), ...g.cars].find((c) => c && free(c)); // car on the driveway apron in front of each home you own
  if (home) for (const p of PLOTS) if (state.plots[p.id]) out.push({ y: (p.y + p.h + 1) * TILE - 4, d: (x) => drawCar(x, (p.x + 1.4) * TILE, (p.y + p.h + 1) * TILE - 4, { col: col(home), kind: CAR_MODELS[home.model].kind, dir: 'east' }) });
  return out; }
function presActors() { const out = []; if (!pres.on) return out;
  if (pres.kind === 'limo' && (pres.stage !== 'enter' || pres.t > 6)) for (let i = 0; i < 3; i++) for (const s of [-1, 1]) out.push({ x: 32.5 * TILE + s * 40, y: 45.6 * TILE + i * 34, coat: 'dark', outfit: { top: 'tux_black', bottom: 'slacks_black', eyes: 'shades', neck: 'bowtie', feet: 'loafers' }, face: 'down', phase: 0, moving: false, art: artKey('dark', { top: 'tux_black', bottom: 'slacks_black', eyes: 'shades', neck: 'bowtie', feet: 'loafers' }) });
  if (presidentPresent(pres)) out.push({ x: pres.x, y: pres.y, coat: 'golden', outfit: PRES_OUTFIT, face: pres.face, phase: pres.phase, moving: pres.moving, president: true, emote: pres.emote, coffee: pres.coffee, art: artKey('golden', PRES_OUTFIT) });
  return out; }
function streetPups() {
  const t = time, chase = Math.sin(t * 0.9) * 50;
  return [{ x: 45.5 * TILE, y: 8.4 * TILE, coat: 'golden', art: 'shiba-golden', face: Math.sin(t * 2) > 0 ? 'right' : 'left', phase: t * 8, moving: true, name: 'Busker Biscuit' },
    { x: (STATUE.x + 1) * TILE, y: (STATUE.y + 0.9) * TILE, coat: 'golden', art: 'shiba-golden', statue: true, face: 'down', phase: 0, moving: false },
    { x: 9 * TILE + chase, y: 9.3 * TILE, coat: 'cream', art: 'shiba-cream', face: Math.cos(t * 0.9) > 0 ? 'right' : 'left', phase: t * 14, moving: true },
    { x: 9 * TILE + chase - 24 * Math.sign(Math.cos(t * 0.9)), y: 9.5 * TILE, coat: 'red', art: 'shiba-red', face: Math.cos(t * 0.9) > 0 ? 'right' : 'left', phase: t * 14 + 2, moving: true }];
}

function minimap(vx, vy, vw, vh) {
  const m = $('#minimap').getContext('2d'), s = 2;
  if (!miniBase) { miniBase = document.createElement('canvas'); miniBase.width = MAP_W * s; miniBase.height = MAP_H * s; const b = miniBase.getContext('2d');
    const col = { [T.GRASS]: '#52a349', [T.FLOWER]: '#62b05a', [T.ROAD]: '#4a4f63', [T.WALK]: '#dcd3bc', [T.PLAZA]: '#d6b383', [T.BUILDING]: '#e3b341', [T.WATER]: '#2f6cbd', [T.TREE]: '#2c7040', [T.PLOT]: '#a8764a', [T.HOME]: '#c8323c', [T.DIRT]: '#a8764a' };
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) { b.fillStyle = col[MAP[y][x]]; b.fillRect(x * s, y * s, s, s); } }
  m.drawImage(miniBase, 0, 0);
  for (const p of PLOTS) if (state.plots[p.id]) { m.fillStyle = '#f2cc68'; m.fillRect(p.x * s, p.y * s, p.w * s, p.h * s); }
  { const pk = myPack(state); m.fillStyle = pk ? pk.color : '#6a8a4a'; m.fillRect(CLUBHOUSE.x * s, CLUBHOUSE.y * s, CLUBHOUSE.w * s, CLUBHOUSE.h * s); }
  if (vw) { m.strokeStyle = 'rgba(255,246,224,.85)'; m.lineWidth = 1; m.strokeRect(Math.round(vx / TILE * s) + 0.5, Math.round(vy / TILE * s) + 0.5, Math.round(vw / TILE * s), Math.round(vh / TILE * s)); }
  m.fillStyle = '#fff'; for (const n of npcs) m.fillRect(Math.round(n.x / TILE * s) - 1, Math.round(n.y / TILE * s) - 1, 2, 2);
  const blink = Math.floor(time * 3) % 2; m.fillStyle = '#141a2e'; m.fillRect(Math.round(state.player.x / TILE * s) - 3, Math.round(state.player.y / TILE * s) - 3, 6, 6); m.fillStyle = blink ? '#ff5a5a' : '#ffd84a'; m.fillRect(Math.round(state.player.x / TILE * s) - 2, Math.round(state.player.y / TILE * s) - 2, 4, 4);
}

// ---------------- Interactions ----------------
{ const _say = feel.say; if (_say) feel.say = (who, line, ...r) => { faceTalk(String(who).split(' (')[0], Math.min(4, 1 + String(line || '').length / 25)); return _say.call(feel, who, line, ...r); }; }
// ---- walk-in doors (src/doors.js): walking into a door enters; A is for talking, signs, shops counters etc. ----
const doorSt = makeDoorState(); let doorAcc = 0, doorsNow = [], entering = null, lastDoor = null;
const isWalkDoor = (it) => isDoor(it) && (it.kind !== 'plot' || !!state.plots[it.id]);
function enterDoor(d) { lastDoor = d; keys.clear(); player.path = [];
  if (d.kind === 'gamedoor' || (d.kind === 'arcade' && COARSE.matches)) return enterExternal(d);
  interact(d, true); }
// External games: same-tab navigation (a movement event is not a user gesture, so window.open would be popup-blocked).
// Your spot is saved one tile outside the door, so coming back (browser Back) puts you outside, not in the doorway.
function enterExternal(d) { const url = d.kind === 'arcade' ? arcadeUrl() : gameDoorUrl(d.id), name = d.name.replace(/^.*\((.*)\)$/, '$1');
  const o = outsideOf(d); Object.assign(state.player, { x: o.x, y: o.y }); player.face = o.face; persist();
  let ov = document.getElementById('enter-ov'); if (!ov) { ov = document.createElement('div'); ov.id = 'enter-ov'; document.body.appendChild(ov); }
  ov.innerHTML = `<div class="enter-card"><b>Entering ${esc(name)}…</b><small>opening ${esc(new URL(url).host)}</small><button class="btn ghost" id="enter-cancel">Stay in Inu Verse</button></div>`; ov.hidden = false; feel.fade(); blip(660);
  entering = setTimeout(() => { entering = null; globalThis.__lastNav = url; if (!globalThis.__noNav) location.assign(url); else ov.hidden = true; }, 800);
  ov.querySelector('#enter-cancel').onclick = () => { clearTimeout(entering); entering = null; ov.hidden = true; doorExit(doorSt, time); }; }
function interact(it, viaDoor = false) { if (!viaDoor && isWalkDoor(it)) { toast(`Walk into the door to enter ${it.name}`, ''); return; } faceReact('me', it.kind === 'building' || it.kind === 'mall' ? 'wow' : 'curious', 1.2);
  if (it.kind === 'building') openPanel(it.id);
  else if (it.kind === 'plot') { if (state.plots[it.id]) enterBuild(it.id, false); else openPanel('plot', { plotId: it.id }); }
  else if (it.kind === 'visit') enterBuild(it.id, true);
  else if (it.kind === 'stall') openPanel('launch', { sel: it.id });
  else if (it.kind === 'mall' && it.cat === 'car') openPanel('dealer', { dealer: 'luxauto' });
  else if (it.kind === 'mall' && it.cat === 'pets') openPanel('pets');
  else if (it.kind === 'mall' && it.cat?.startsWith('furn_')) openPanel('furn', { store: it.cat.slice(5) });
  else if (it.kind === 'chapel') openPanel('chapel');
  else if (it.kind === 'mall') openPanel('mall', { cat: it.cat, store: it.id });
  else if (it.kind === 'field') openPanel('field', { i: it.i });
  else if (it.kind === 'farm') openPanel('farm', { id: it.id });
  else if (it.kind === 'lot') openPanel('lot', { id: it.id });
  else if (it.kind === 'biz') openPanel('bizboard');
  else if (it.kind === 'arcade') openArcade();
  else if (it.kind === 'gamedoor') openGameDoor(it.id);
  else if (it.kind === 'bank') openPanel('bank');
  else if (it.kind === 'matchmaker') openPanel('matchmaker');
  else if (it.kind === 'square') openPanel('fly5', { tab: it.id === 'pools' ? 'vip' : it.id === 'burn' ? 'burn' : it.id === 'quests' ? 'quests' : 'vip' });
  else if (it.kind === 'clubhouse') { if (myPack(state)) enterBuild('clubhouse', false); else openPanel('packs'); }
  else if (it.kind === 'community') { const w = window.open(COMMUNITY.url, '_blank', 'noopener'); toast(w ? 'Community board: Telegram opened in a new tab' : 'Allow pop-ups to open the Telegram link', w ? 'good' : 'bad'); }
}

function openPanel(kind, opts = {}) {
  if (!panel) { feel.fade(); uiOpen(); } panel = { kind, ...opts }; $('#panel').hidden = false; $('#prompt').hidden = true; keys.clear();
  const body = $('#panel-body'); body.onclick = null; const dg = $('#dialog'); if (dg) { dg.style.pointerEvents = 'none'; dg.style.visibility = 'hidden'; }
  if (kind === 'field') return renderField(farmCtx(), opts.i);
  if (kind === 'farm') return renderFarm(farmCtx(), opts.id);
  if (kind === 'lot') return renderLot(farmCtx(), opts.id);
  if (kind === 'bizboard') return renderBizBoard(farmCtx());
  if (kind === 'friend') return renderFriend(relCtx(), opts.name);
  if (kind === 'chapel') return renderChapel(relCtx());
  if (kind === 'salon') return renderSalon();
  if (kind === 'engage') return renderEngage({ ...farmCtx(), tab: opts.tab, day: gameDay(), open: (t) => openPanel('engage', { tab: t }) });
  if (kind === 'bank') return renderBank();
  if (kind === 'fly5') return renderFly5({ ...farmCtx(), kp: DEMO ? null : K.kp, tab: opts.tab, day: gameDay(), week: Math.floor(gameDay() / 7), month: Math.floor(gameDay() / 28), nowH: state.clockSec / (DAY_LEN / 24), open: (t) => openPanel('fly5', { tab: t }) });
  if (kind === 'matchmaker') return renderMatchmaker({ ...farmCtx(), tab: opts.tab, weekFrac: ((state.clockSec / DAY_LEN) % WEEK_DAYS) / WEEK_DAYS, open: (t) => openPanel('matchmaker', { tab: t }), startDuo: (partner, jobId) => { if (!partner) return toast('No partner', 'bad'); closePanel(); playDuo(jobId, partner); } });
  if (kind === 'city') return renderCity({ ...farmCtx(), tab: opts.tab, nowH: state.clockSec / (DAY_LEN / 24), dayFrac: (state.clockSec % DAY_LEN) / DAY_LEN, trend, presOn: pres.on && pres.stage === 'visit', presKey: 'visit' + pres.n, open: (t) => openPanel('city', { tab: t }) });
  if (kind === 'furn') return renderFurnStore(relCtx(), opts.store);
  if (kind === 'plot') {
    const p = PLOTS.find((x) => x.id === opts.plotId);
    body.innerHTML = `<h2>Empty plot ${p.id.toUpperCase()}</h2><p class="sub">A sunny ${p.w}×${p.h} lot on Bone Street. Claim it to build and decorate your own home.</p>
      <p><b>Cost:</b> ${PLOT_COST} bones · You have ${Math.floor(state.bones)}</p><div class="row" style="justify-content:flex-start"><button class="btn green" id="claim">Claim plot for ${PLOT_COST} bones</button></div>`;
    $('#claim').onclick = () => { const r = claimPlot(state, p.id); if (r.ok) { state.town && playerDid(state.town, 'You moved into a new home on Bone Street.');  toast('Plot claimed! Your new home is ready.', 'good'); hud(); persist(); closePanel(); enterBuild(p.id, false); } else toast(r.reason, 'bad'); };
  } else if (kind === 'shop') renderShop();
  else if (kind === 'cafe') renderCafe();
  else if (kind === 'launch') renderLaunch();
  else if (kind === 'fashion') renderFashion();
  else if (kind === 'wardrobe') renderWardrobe();
  else if (kind === 'packs') renderPacks();
  else if (kind === 'mall') renderMall();
  else if (kind === 'mail') { const m = state.mail || []; body.innerHTML = `<h2>Mailbox</h2><p class="sub">Notes neighbours left at your door.</p><div class="board">${m.map((n) => `<div class="post ${n.read ? '' : 'mine'}"><b>${esc(n.from)}</b> ${esc(n.text)}</div>`).join('') || '<p class="small">No mail yet — neighbours drop by now and then.</p>'}</div>`; m.forEach((n) => n.read = true); persist(); }
  else if (kind === 'cars') { panel.kind = 'dealer'; panel.dealer = 'cars'; renderDealer(); }
  else if (kind === 'dealer') renderDealer();
  else if (kind === 'pets') renderPets();
  else if (kind === 'garage') renderGarage();
  else if (kind === 'help') body.innerHTML = `<h2>How to play</h2><ul><li>Walk with <b>WASD</b>/<b>arrows</b> or <b>click</b> anywhere.</li><li>Press <b>E</b> near doors and signs.</li><li>Earn <b>bones</b> serving orders at the Shiba Sips Café.</li><li>Claim a plot (${PLOT_COST} bones), buy furniture at Paws & Pillows, decorate (R to rotate).</li><li>Buy clothes at <b>Fetch Fashion</b> and dress up in your <b>Wardrobe</b> (HUD button).</li><li>Launch Hall: create and trade <b>simulated</b> tokens paired with demo <b>$KIBBLE</b>. Nothing here is real money or on any blockchain.</li><li><b>Packs</b>: found or join a Pack (HUD button), chip in bones to the treasury, decorate the shared clubhouse north of Market Row and climb the Kibble Cup. Packs are simulated locally for now.</li><li>Visit Mochi, Kuro, Hana and Taro's homes on Sakura Lane.</li></ul><button class="btn red" id="reset">Reset save</button>`;
  if (kind === 'help') $('#reset').onclick = () => { if (confirm('Delete your local save?')) { localStorage.clear(); location.reload(); } };
}
// ---------- Car dealers, pet shop, garage ----------
const priceTag = (m) => m.cur === 'bones' ? `${m.price} bones` : (() => { const q = wallet().quote(Math.round(m.price * 1e6)); return `${m.price} KIBBLE <small>+2% = ${(q.total / 1e6).toFixed(2)}</small>`; })();
function carIcon(model, color) { const m = CAR_MODELS[model]; return iconCanvas((x) => { x.imageSmoothingEnabled = false; x.scale(0.75, 0.75); drawCar(x, 43, 58, { col: CAR_COLORS[color], kind: m.kind, dir: 'east' }); }, 64, 52); }
function renderDealer() { const body = $('#panel-body'), lux = panel.dealer === 'luxauto', g = ensureGarage(state); panel.col ||= {};
  body.innerHTML = `<h2>${lux ? 'Zoomies Luxury Autos' : 'Zoomies Motors'}</h2><p class="sub">${lux ? `Luxury cars in ${kibText(state)}. ${FEE_LABEL}. Paid to the treasury <code>${TREASURY.slice(0, 6)}…${TREASURY.slice(-4)}</code> via the ${wallet().simulated ? 'simulated' : 'live'} wallet.` : `Everyday cars priced in bones (you have ${Math.floor(state.bones)}).`} Pick a colour, buy, then drive it from your Garage.</p><div class="grid" id="dealgrid"></div>`;
  const grid = $('#dealgrid');
  for (const [id, m] of Object.entries(CAR_MODELS).filter(([, m]) => m.dealer === panel.dealer)) { const col = panel.col[id] || (lux ? 'Gold' : 'Red'), owned = g.cars.filter((c) => c.model === id).length;
    const card = document.createElement('div'); card.className = 'card'; card.appendChild(carIcon(id, col));
    card.insertAdjacentHTML('beforeend', `<b>${m.name}</b><small>${m.blurb} Top speed ${m.speed}.</small><div class="swatches">${Object.entries(CAR_COLORS).map(([n, h]) => `<button class="sw ${n === col ? 'on' : ''}" title="${n}" data-car="${id}" data-col="${n}" style="background:${h};width:16px;height:16px;border:2px solid ${n === col ? '#f2cc68' : '#141a2e'};margin:1px;padding:0"></button>`).join('')}</div><button class="btn green" data-buycar="${id}">Buy ${col} · ${priceTag(m)}</button>${owned ? `<small>Owned: ${owned}</small>` : ''}`);
    grid.appendChild(card); }
  grid.onclick = (e) => { const sw = e.target.closest('[data-col]'); if (sw) { panel.col[sw.dataset.car] = sw.dataset.col; return renderDealer(); }
    const b = e.target.closest('[data-buycar]'); if (!b) return; const id = b.dataset.buycar, r = buyCar(state, id, panel.col[id] || (lux ? 'Gold' : 'Red'));
    if (r.ok) { toast(`You bought a ${r.car.color} ${CAR_MODELS[id].name}! Find it in your Garage.`, 'good'); hud(); persist(); renderDealer(); } else toast(r.reason, 'bad'); }; }
function petIcon(sp, pal = null) { return iconCanvas((x) => { x.imageSmoothingEnabled = false; x.drawImage(petSprite(sp, 0, pal), 12, 4, 40, 40); }, 64, 48); }
function renderPets() { const body = $('#panel-body'), st = ensurePets(state);
  body.innerHTML = `<h2>Pawsome Pets</h2><p class="sub">Companions that follow you around. Common pets cost bones (${Math.floor(state.bones)}); exotic pets cost ${kibText(state)} with the ${FEE_LABEL}, sent to the treasury via the ${wallet().simulated ? 'simulated' : 'live'} wallet.</p>
   <label class="small">Name your new pet: <input id="petname" maxlength="16" placeholder="e.g. Biscuit"></label><div class="grid" id="petgrid"></div>`;
  const grid = $('#petgrid');
  for (const [id, p] of Object.entries(PETS)) { const card = document.createElement('div'); card.className = 'card'; card.appendChild(petIcon(id));
    card.insertAdjacentHTML('beforeend', `<b>${p.name}${p.exotic ? ' ★' : ''}</b><small>${p.exotic ? 'Exotic' : 'Common'}</small><button class="btn ${p.exotic ? 'alt' : 'green'}" data-buypet="${id}">Adopt · ${priceTag(p)}</button>`); grid.appendChild(card); }
  grid.onclick = (e) => { const b = e.target.closest('[data-buypet]'); if (!b) return; const r = buyPet(state, b.dataset.buypet, $('#petname').value);
    if (r.ok) { toast(`${r.pet.name} the ${PETS[r.pet.species].name} is following you!`, 'good'); hud(); persist(); renderPets(); } else toast(r.reason, 'bad'); }; }
function renderGarage() { const body = $('#panel-body'), g = ensureGarage(state), st = ensurePets(state);
  body.innerHTML = `<h2>Garage & Pets</h2><p class="sub">Spawn a car to drive it (WASD / stick, <b>H</b> or <b>B</b> to honk, <b>E</b> / <b>A</b> to park). Your active car shows on your home driveway.</p>
   <b>Cars</b><div class="grid" id="gcars"></div><b>Pets</b><div class="grid" id="gpets"></div>`;
  const gc = $('#gcars'); if (!g.cars.length) gc.innerHTML = '<p class="small">No cars yet - visit Zoomies Motors (Market Row) or Zoomies Luxury Autos (Kibble Mall).</p>';
  for (const c of g.cars) { const card = document.createElement('div'); card.className = 'card'; card.appendChild(carIcon(c.model, c.color)); card.insertAdjacentHTML('beforeend', `<b>${c.burn ? `${c.name} #${c.n}` : `${c.color} ${CAR_MODELS[c.model].name}`}</b>${g.active === c.id ? '<small>Home car</small>' : ''}<button class="btn green" data-drive="${c.id}">Drive</button><button class="btn ghost" data-home="${c.id}">Set as home car</button>`); gc.appendChild(card); }
  const gp = $('#gpets'); if (!st.owned.length) gp.innerHTML = '<p class="small">No pets yet - visit Pawsome Pets in the Kibble Mall district.</p>';
  for (const p of st.owned) { const card = document.createElement('div'); card.className = 'card'; card.appendChild(petIcon(p.species, p.burn ? p.pal : null)); card.insertAdjacentHTML('beforeend', `<b>${esc(p.name)}</b><small>${p.burn ? "Limited burn edition" : PETS[p.species].name}${st.active === p.id ? ' · following' : ''}</small><button class="btn green" data-walk="${p.id}">${st.active === p.id ? 'Leave at home' : 'Take for a walk'}</button><button class="btn ghost" data-rename="${p.id}">Rename</button>`); gp.appendChild(card); }
  body.onclick = (e) => { const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.drive) spawnCar(t.dataset.drive);
    else if (t.dataset.home) { g.active = t.dataset.home; persist(); renderGarage(); }
    else if (t.dataset.walk) { st.active = st.active === t.dataset.walk ? null : t.dataset.walk; persist(); renderGarage(); }
    else if (t.dataset.rename) { const n = prompt('New name?'); if (n) { renamePet(state, t.dataset.rename, n); persist(); renderGarage(); } } }; }
function closePanel() { doorExit(doorSt, time); const dg = $('#dialog'); if (dg) { dg.style.pointerEvents = ''; dg.style.visibility = ''; }
  if (panel?.kind === 'cafe' && panel.shift && !panel.shift.settled && panel.shift.earned > 0) { finishShift(state, panel.shift); packAct('shift'); toast(`Shift ended early: +${panel.shift.paid} bones`, 'good'); hud(); persist(); }
  if (panel) uiClose(); panel = null; $('#panel').hidden = true;
}

function iconCanvas(draw, w = 64, h = 52) { const k = Math.max(2, Math.ceil(devicePixelRatio || 1)), c = document.createElement("canvas"); c.width = w * k; c.height = h * k; c.style.width = w + 'px'; c.style.height = h + "px"; const x = c.getContext("2d"); x.scale(k, k); draw(x); return c; } // preview icons at device resolution (3x on most phones)

function renderShop() {
  const body = $('#panel-body');
  body.innerHTML = `<h2>Paws & Pillows</h2><p class="sub">Furniture for discerning dogs. Items go to your inventory — place them from build mode in your home.${Object.keys(state.plots).length ? '' : ' <b>Tip: claim a plot first!</b>'}</p><div class="grid" id="shopgrid"></div>`;
  const grid = $('#shopgrid');
  for (const [id, d] of Object.entries(FURNITURE)) {
    if (d.mall || d.store) continue;
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
  for (const [id, d] of Object.entries(OUTFITS)) { if (d.drop && !state.wardrobe.owned.includes(id)) continue;
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
function renderSalon() {
  const body = $('#panel-body'), L = state.player.look || {}, base = { ...defaultChoices(), ...L, name: state.player.name, pronouns: state.player.pronouns || 'they/them' };
  body.innerHTML = `<h2>Paw Salon & Mirror</h2><p class="sub">Restyle coat, pattern, eyes, ears, tail, markings, size, name and pronouns for <b>${SALON_PRICE} Bones</b>. Your look is saved to your shared Inu profile, so it follows you to other Inu games.${hasCustomLook(state) ? '' : ' <b>Your classic look is kept until you restyle.</b>'}</p>
    <div class="wardrobe"><div><canvas id="salonpv" width="200" height="180" style="background:var(--navy2);border:3px solid var(--goldd)"></canvas><label class="lbl">Name <input id="salonname" maxlength="14" value="${state.player.name.replace(/"/g, '')}"></label>
    <button class="btn" id="salonbuy">Restyle - ${SALON_PRICE} Bones</button></div><div id="salonc" class="creator"></div></div>`;
  const cr = mountCreator($('#salonc'), { choices: base, tabs: ['look', 'you'] }), pv = $('#salonpv'), pc = pv.getContext('2d');
  const loop = (t) => { if (panel?.kind !== 'salon' || !pv.isConnected) return; pc.clearRect(0, 0, 200, 180); pc.imageSmoothingEnabled = false; drawPreview(pc, { ...profileOfChoices({ ...cr.choices, outfit: null }), outfit: profileFromState(state).outfit }, 100, t, null); requestAnimationFrame(loop); }; requestAnimationFrame(loop);
  $('#salonbuy').onclick = () => { const r = restyle(state, { ...cr.choices, name: $('#salonname').value.trim() || state.player.name }); if (!r.ok) return toast(r.reason, 'bad'); blip(); persist(); saveProfile(state); toast('Fresh new look! Saved to your Inu profile.', 'good'); closePanel(); };
}
function renderWardrobe() {
  const body = $('#panel-body'), w = state.wardrobe;
  body.innerHTML = `<h2>Wardrobe</h2><p class="sub">Equip the clothes you own. One item per slot; gowns replace bottoms.${w.owned.length ? '' : ' <b>Nothing yet - visit Fetch Fashion!</b>'}</p>
    <div class="wardrobe"><div class="mirror" id="mirror"></div><div id="slots"></div></div><p><button class="btn alt" id="tosalon">Mirror: restyle look (${SALON_PRICE} Bones)</button></p>`;
  $('#tosalon').onclick = () => openPanel('salon');
  const m = $('#mirror'); m.appendChild(playerCanvas(168, 220, 3));
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
   <div class="row" style="justify-content:flex-start"><button class="btn green" id="cstart">Start classic shift</button></div></div></div>
   <h3>Mini-game shifts</h3><p class="small">Skill pays: score, streak bonus and a daily first-shift bonus. No paid boosts.</p><div class="grid">${['cafe', 'delivery'].map((k) => { const J = ensureJobs(state)[k]; return `<div class="card"><b>${JOB_DEFS[k].name}</b><small>${rankOf(J.xp).title} · best ${J.best}</small><button class="btn green" data-job="${k}">Play</button></div>`; }).join('')}</div>
   <h3>Your job ranks</h3><table class="lb"><tr><th>Job</th><th>Rank</th><th>Best</th><th>Runs</th></tr>${Object.entries(ensureJobs(state)).map(([k, J]) => `<tr><td>${JOB_DEFS[k].name}</td><td>${rankOf(J.xp).title}</td><td>${J.best}</td><td>${J.runs}</td></tr>`).join('')}</table>`;
  body.querySelectorAll('[data-job]').forEach((b) => b.onclick = () => playJob(b.dataset.job));
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
// Tabs: $KIBBLE (real, live stats) · Launch your coin (pump.fun's own create flow) · Coin board (player-registered, verified) · Practice (play tokens).
const practice = () => DEMO ? state : new Proxy(state, { get: (t, k) => k === 'kibble' ? (t.practiceKibble ??= 20) : t[k], set: (t, k, v) => { t[k === 'kibble' ? 'practiceKibble' : k] = v; return true; } });
async function refreshRegistry(force) { if (!force && Date.now() - REG.loaded < 30000) return; REG.loaded = Date.now();
  const r = await RC.listCoins(); REG = { ...REG, coins: r.coins, offline: !r.ok, reason: r.reason }; await refreshRealStats(); }
async function refreshRealStats() { await RC.fetchStats([RC.KIBBLE.mint, ...REG.coins.map((c) => c.mint)]); trend = RC.realTrend(REG.coins, 6); if (panel?.kind === 'launch') launchRealUi(); }
const NFA = '<div class="nfa">Not financial advice. No price promises. Coins here are user-launched memecoins on pump.fun: they can go to zero. Always check the contract address.</div>';
const isMobile = () => matchMedia('(pointer:coarse)').matches || /Android|iPhone|iPad/i.test(navigator.userAgent);
function statBox(mint) { const st = RC.statsOf(mint); return `<div class="stats rstats" data-stats="${mint}"><div>Price<b>${RC.fmtUsd(st?.priceUsd)}</b>USD</div><div>Market cap<b>${RC.fmtUsd(st?.mcap)}</b>USD</div><div>24h<b class="${st?.change24 == null ? '' : st.change24 >= 0 ? 'up' : 'dn'}">${RC.fmtPct(st?.change24)}</b>change</div><div>24h volume<b>${RC.fmtUsd(st?.vol24)}</b>USD</div></div>`; }
function renderLaunch() {
  const body = $('#panel-body'), tab = panel.tab || (panel.sel ? 'practice' : 'kibble');
  const tabs = [['kibble', '$KIBBLE'], ['launch', 'Launch your coin'], ['board', 'Coin board'], ['practice', 'Practice']];
  const head = `<h2>Launch Hall</h2><div class="row tabs" style="justify-content:flex-start;margin:0 0 8px">${tabs.map(([k, l]) => `<button class="btn ${k === tab ? '' : 'ghost'}" data-tab="${k}">${l}</button>`).join('')}</div>`;
  const K0 = RC.KIBBLE, link = (u, l, cls = 'btn') => `<a class="${cls}" href="${u}" target="_blank" rel="noopener noreferrer">${l}</a>`;
  if (tab === 'kibble') body.innerHTML = `${head}<div class="card rcoin" style="text-align:left"><h3 style="margin:0">$KIBBLE <span class="small">official · Solana ${K0.program} · mint authority renounced</span></h3>
     <div class="small">Contract address (only this one is real):</div><div class="ca"><code id="kib-ca">${K0.mint}</code><button class="btn alt" data-copy="${K0.mint}">Copy</button></div>
     ${statBox(K0.mint)}<div class="small" id="kib-src">Live from DexScreener, refreshed every minute. Shows "unavailable" if the feed is down.</div>
     <div class="row" style="justify-content:flex-start">${link(RC.PUMP_COIN(K0.mint), 'View on pump.fun', 'btn green')}${link(RC.DEX_URL(K0.mint), 'DexScreener chart', 'btn ghost')}</div></div>${NFA}`;
  else if (tab === 'launch') body.innerHTML = `${head}<div class="card" style="text-align:left"><b>Launch your own coin on pump.fun</b>
     <p class="small">Inu Verse never creates, holds or signs tokens. You launch on pump.fun with your own wallet; pump.fun shows you every fee and step before you sign.</p>
     <ol class="small steps"><li>Open pump.fun's create page (button below) and connect Phantom there.</li>
     <li><b>Pick your pair:</b> on pump.fun's create form choose <b>Custom</b> under the pool liquidity pair, then paste one of these contract addresses into the search and select the matching coin (check the address!). pump.fun has no link that preselects the pair, so copy it from here:<div id="pairlist" class="pairlist"><span class="small">Loading eligible pairs…</span></div></li>
     <li>After launch, copy your coin's mint address and register it on the <b>Coin board</b> tab so it shows on the board and city billboards.</li></ol>
     <div class="row" style="justify-content:flex-start"><button class="btn green" id="go-pump">Open pump.fun create ↗</button>${isMobile() ? '<button class="btn alt" id="go-phantom">Open in Phantom app ↗</button>' : ''}</div></div>${NFA}`;
  else if (tab === 'board') body.innerHTML = `${head}<div class="launch rboard"><div><div class="card form" style="text-align:left"><b>Register a coin you launched</b>
     <div class="small">Sign in with Phantom, paste your coin's mint. We check pump.fun's on-chain record that <i>your wallet</i> created it.</div>
     <input id="reg-mint" placeholder="Your coin's mint address" maxlength="44" autocomplete="off" spellcheck="false"><button class="btn green" id="reg-go">${K.kp?.signedIn ? 'Register coin' : 'Sign in & register'}</button><div class="small" id="reg-msg"></div></div>${NFA}</div>
     <div><b>Registered coins</b><div class="regboard" id="regboard"></div></div></div>`;
  else { body.innerHTML = `${head}<div class="demo-banner">Practice – play tokens on a pretend bonding curve. Not on-chain, not real $KIBBLE, worth nothing.</div>
  <p class="sub">Practise launching and trading against practice KIBBLE. NPC Inu traders buy and sell; when the curve fills the token <b>graduates</b>. You have <b id="prac-bal">${practice().kibble.toFixed(2)}</b> practice KIBBLE.</p>
  <div class="launch"><div>
   <div class="card" style="text-align:left"><b>Swap bones → practice KIBBLE</b><div class="small">1 bone = ${Math.round(1 / BONES_PER_KIBBLE)} practice KIBBLE</div><div class="tradebox"><input id="swapamt" type="number" value="100" min="1"><button class="btn alt" id="swap">Swap</button></div></div>
   <h3 style="margin:10px 0 6px">Practice tokens</h3><div class="toklist" id="toklist"></div>
   <details class="card form" style="text-align:left;margin-top:8px" id="createbox"><summary><b>Create a practice token</b> (${CREATE_FEE} practice KIBBLE)</summary>
    <input id="tname" placeholder="Name e.g. Shiba Star" maxlength="24"><input id="tticker" placeholder="Ticker e.g. STAR" maxlength="6">
    <label class="small">Icon colour <input id="tcolor" type="color" value="#e58b3a" style="height:34px"></label>
    <button class="btn green" id="tcreate">Launch practice token</button></details>
  </div><div id="tokdetail"></div></div>`;
  if (!panel.sel) panel.sel = state.tokens[state.tokens.length - 1]?.id;
  $('#swap').onclick = () => { const r = swapBonesToKibble(practice(), +$('#swapamt').value); if (r.ok) { toast(`+${r.kibble.toFixed(2)} practice KIBBLE`, 'good'); hud(); persist(); renderLaunch(); } else toast(r.reason, 'bad'); };
  $('#tcreate').onclick = () => { const r = createToken(practice(), { name: $('#tname').value, ticker: $('#tticker').value, color: $('#tcolor').value }); if (r.ok) { packAct('token'); panel.sel = r.token.id; toast(`Practice $${r.token.ticker} launched!`, 'good'); hud(); persist(); renderLaunch(); } else toast(r.reason, 'bad'); };
  $('#toklist').onclick = (e) => { const b = e.target.closest('[data-tok]'); if (b) { panel.sel = b.dataset.tok; renderTokDetail(); launchUi(); } };
  renderTokDetail(); launchUi(); }
  body.querySelector('.tabs').onclick = (e) => { const b = e.target.closest('[data-tab]'); if (b) { panel.tab = b.dataset.tab; renderLaunch(); } };
  body.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => copyText(b.dataset.copy));
  if ($('#go-pump')) $('#go-pump').onclick = () => { blip(880); window.open(RC.PUMP_CREATE, '_blank', 'noopener'); };
  if ($('#go-phantom')) $('#go-phantom').onclick = () => { location.href = RC.phantomBrowse(RC.PUMP_CREATE); };
  if ($('#reg-go')) $('#reg-go').onclick = registerCoin;
  if (tab === 'launch') RC.listPairs().then((r) => { const el = $('#pairlist'); if (!el) return;
    el.innerHTML = r.pairs.map((p) => `<div class="pairrow ${p.featured ? 'feat' : ''}"><b>${p.featured ? '★ ' : ''}$${esc(p.symbol)}</b><span class="small">${esc(p.name)}${p.mcap != null && !p.featured ? ' · MC ' + RC.fmtUsd(p.mcap) + ' · liq ' + RC.fmtUsd(p.liquidity) : ''}</span><code>${RC.short(p.mint)}</code><button class="btn tiny ghost" data-copy="${p.mint}">Copy CA</button>${p.featured ? `<div class="small kibnote">${p.mcap != null ? 'MC ' + RC.fmtUsd(p.mcap) + ' · liq ' + RC.fmtUsd(p.liquidity) + ' · ' : ''}${esc(p.note || "If $KIBBLE doesn't appear under Custom Pairs when you paste the CA, it isn't available as a pair yet.")}</div>` : ''}</div>`).join('')
      + `<div class="small">${r.rules ? `Inu/Doge pairs shown only while market cap ≥ ${RC.fmtUsd(r.rules.minMcapUsd)}, liquidity ≥ ${RC.fmtUsd(r.rules.minLiquidityUsd)} and RugCheck shows no danger (checked live). $KIBBLE is always featured (no thresholds), but pump.fun decides whether it can be picked yet.` : 'Pair checks unavailable right now: only $KIBBLE shown.'}</div>`;
    el.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => copyText(b.dataset.copy)); });
  if (tab === 'board') { renderRegBoard(); refreshRegistry(true); } else if (tab === 'kibble') refreshRealStats();
}
async function copyText(t) { try { await navigator.clipboard.writeText(t); toast('Copied contract address', 'good'); } catch { const i = document.createElement('textarea'); i.value = t; document.body.appendChild(i); i.select(); try { document.execCommand('copy'); toast('Copied', 'good'); } catch { toast(t); } i.remove(); } }
async function registerCoin() {
  const msg = $('#reg-msg'), mint = $('#reg-mint').value.trim(); const say = (t, bad) => { if (msg) { msg.textContent = t; msg.className = 'small ' + (bad ? 'bad' : 'good'); } };
  if (!RC.isMint(mint)) return say('Paste a Solana mint address (32-44 letters/numbers).', true);
  if (!K.kp) return say('Wallet sign-in is unavailable right now. Try again in a moment.', true);
  try { if (!K.kp.signedIn) { say('Approve the sign-in message in Phantom…'); if (!K.kp.address) await K.kp.connect?.(); await K.kp.signIn(); } } catch (e) { return say('Sign-in cancelled: ' + (e.message || e), true); }
  say('Checking pump.fun creator on-chain…');
  const r = await RC.postCoins({ action: 'register', mint }, { session: K.kp.session });
  if (!r.ok) return say(r.reason, true);
  say(r.already ? 'Already registered.' : `Registered! Verified you created it${r.coin.pairedWithKibble ? ' · paired with $KIBBLE ✓' : ''}.`); refreshRegistry(true);
}
function renderRegBoard() { const el = $('#regboard'); if (!el) return;
  if (REG.offline) { el.innerHTML = `<p class="small">Coin board is offline right now (${esc(REG.reason || 'unavailable')}). Your coin is still live on pump.fun.</p>`; return; }
  if (!REG.coins.length) { el.innerHTML = '<p class="small">No player coins registered yet. Be the first: launch on pump.fun, then register it here.</p>'; return; }
  el.innerHTML = REG.coins.map((c) => { const st = RC.statsOf(c.mint); return `<div class="regcoin" data-mint="${c.mint}"><div><b>$${esc(st?.symbol || c.symbol || '???')}</b> ${esc(st?.name || c.name || '')} ${c.pairedWithKibble ? '<span class="chip">paired with $KIBBLE</span>' : c.quote && c.quote !== 'SOL' ? `<span class="chip">paired with $${esc(c.quote)}</span>` : ''}
     <div class="small">CA <code>${RC.short(c.mint)}</code> · creator ${RC.short(c.creator)} (verified)</div>
     <div class="small">Price ${RC.fmtUsd(st?.priceUsd)} · MC ${RC.fmtUsd(st?.mcap)} · 24h ${RC.fmtPct(st?.change24)}</div></div>
     <div class="row"><a class="btn tiny green" href="${RC.PUMP_COIN(c.mint)}" target="_blank" rel="noopener noreferrer">pump.fun</a><button class="btn tiny ghost" data-copy="${c.mint}">Copy CA</button><button class="btn tiny red" data-report="${c.mint}">Report</button></div></div>`; }).join('');
  el.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => copyText(b.dataset.copy));
  el.querySelectorAll('[data-report]').forEach((b) => b.onclick = async () => { if (!confirm('Report this coin as a scam, impersonation or offensive? Coins with several reports are hidden until reviewed.')) return;
    const r = await RC.postCoins({ action: 'report', mint: b.dataset.report, reason: 'player report' }); toast(r.ok ? (r.hidden ? 'Reported. Hidden pending review.' : 'Reported. Thanks!') : r.reason, r.ok ? 'good' : 'bad'); refreshRegistry(true); });
}
function launchRealUi() { document.querySelectorAll('[data-stats]').forEach((el) => { el.outerHTML = statBox(el.dataset.stats); }); renderRegBoard(); }
// Owner moderation from the console: __launchAdmin('hide'|'show'|'delete', mint, adminToken?) (wallet session for the owner wallet also works).
globalThis.__launchAdmin = async (op, mint, admin) => { const r = await RC.postCoins({ action: 'moderate', op, mint }, { session: K.kp?.session, admin }); refreshRegistry(true); return r; };
globalThis.__reg = () => REG;
function renderTokDetail() {
  const tok = state.tokens.find((t) => t.id === panel.sel), el = $('#tokdetail');
  if (!tok) { el.innerHTML = '<p>No tokens yet — create one!</p>'; return; }
  el.innerHTML = `<div style="display:flex;align-items:center;gap:10px"><i style="width:40px;height:40px;border-radius:50%;background:${tok.color};display:inline-block;border:3px solid #fff;box-shadow:0 2px 5px #0003"></i><div><h2 style="margin:0">${esc(tok.name)} <span style="color:#6c4fd0">$${tok.ticker}/KIBBLE</span></h2><div class="small">created by ${tok.creator === PLAYER ? 'you' : tok.creator}</div></div><span id="gradbadge"></span></div>
   <canvas id="chart" width="1200" height="380" style="width:100%;height:190px;background:#fff;border-radius:12px;margin-top:8px"></canvas>
   <div class="stats"><div>Price<b id="st-price"></b>KIBBLE</div><div>Market cap<b id="st-mcap"></b>KIBBLE</div><div>Holders<b id="st-holders"></b></div><div>You hold<b id="st-you"></b>$${tok.ticker}</div></div>
   <div class="small">Bonding curve progress <span id="st-prog"></span></div><div class="bar"><i id="st-bar"></i></div>
   <div class="tradebox"><input id="buyamt" type="number" value="1" min="0.01" step="0.1"><span>KIBBLE</span><button class="btn green" id="buybtn">Buy</button><span style="flex:1"></span><button class="btn red" data-sell="0.25">Sell 25%</button><button class="btn red" data-sell="0.5">50%</button><button class="btn red" data-sell="1" id="sellall">Sell all</button></div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px"><div><b>Recent trades</b><div class="trades" id="trades"></div></div><div><b>Top holders</b><div class="trades" id="holders"></div></div></div>`;
  $('#buybtn').onclick = () => { const r = playerBuy(practice(), tok.id, +$('#buyamt').value); if (r.ok) { toast(`Bought ${fmt(r.tokensOut)} $${tok.ticker}${r.graduatedNow ? ' — GRADUATED!' : ''}`, 'good'); hud(); persist(); launchUi(); } else toast(r.reason, 'bad'); };
  el.querySelectorAll('[data-sell]').forEach((b) => b.onclick = () => { const r = playerSell(practice(), tok.id, (tok.holders[PLAYER] || 0) * +b.dataset.sell); if (r.ok) { toast(`Sold for ${r.kibbleOut.toFixed(3)} KIBBLE`, 'good'); hud(); persist(); launchUi(); } else toast(r.reason, 'bad'); });
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
  $('#prompt').hidden = true; $('#minimap-wrap').hidden = true; wayUi(false); buildBar();
}
function exitBuild() { doorExit(doorSt, time); if (lastDoor && (lastDoor.kind === 'plot' || lastDoor.kind === 'visit' || lastDoor.kind === 'clubhouse')) { const o = outsideOf(lastDoor); Object.assign(state.player, { x: o.x, y: o.y }); player.face = o.face; } feel.fade(); uiClose(); mode = 'world'; build = null; $('#buildbar').hidden = true; $('#minimap-wrap').hidden = false; wayUi(true); persist(); }
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
  if (!build.pack && !build.readOnly && state.spouse) { const sp = npcByName(state.spouse.name); drawShiba(ctx, ox + cell * 1.2, oy - cell * 0.2, { coat: sp?.coat || 'cream', outfit: sp?.outfit || {}, scale: 1.5, name: state.spouse.name }); (state.pups || []).forEach((p, i) => drawShiba(ctx, ox + cell * (2.4 + i), oy - cell * 0.1, { coat: p.coat.base, outfit: {}, scale: REL.PUP_SCALE[REL.stageOfPup(p, gameDay())] })); }
  if (!build.pack && !build.readOnly) { const pet = activePet(state); if (pet) { ctx.save(); ctx.imageSmoothingEnabled = false; ctx.drawImage(petSprite(pet.species, Math.floor(time * 2) % 2), ox + ROOM_W * cell - cell * 1.6, oy - cell * 0.55, cell * 0.8, cell * 0.8); ctx.restore(); } }
  else { const ni = +build.plotId.slice(1) - 1; if (!build.readOnly && statusGlow(state)) { ctx.save(); ctx.translate(ox + ROOM_W * cell - cell * 0.6, oy - cell * 0.2); drawFlair(ctx, statusGlow(state), performance.now() / 1000); ctx.restore(); } if (!build.readOnly && hasCustomLook(state)) drawProfileShiba(ctx, ox + ROOM_W * cell - cell * 0.6, oy - cell * 0.2, myProfile(), { scale: 1.5 }); else drawShiba(ctx, ox + ROOM_W * cell - cell * 0.6, oy - cell * 0.2, { coat: build.readOnly ? ['tan', 'dark', 'cream', 'red'][ni] : state.player.coat, outfit: build.readOnly ? NPC_OUTFITS[ni] : state.wardrobe.equipped, scale: 1.5 }); }
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
  const demo = DEMO ? `<div class="demo-banner">Demo mode (?demo=1) – pretend $KIBBLE balances for testing, not on-chain · Prize pools are won by skill/activity score, never by chance</div>` : wallet().live ? '' : `<div class="demo-banner">${SOON} Prize pools are won by skill score, never by chance.</div>`;
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
      <p class="sub">Fee routing per purchase: 1% → President's Treasury · 0.25% → daily pool · 0.5% → weekly pool · 0.25% → monthly pool. All of the price goes to the treasury wallet; the pools are an off-chain ledger, paid out by rank (see Prize Rules).</p>
      <h3>Fee ledger</h3><div class="board">${m.ledger.map((l) => `<div class="post"><b>${esc(MALL_ITEMS[l.item]?.name || l.item)}</b> price ${fmtK(l.price)} · fee ${fmtK(l.fee)} = owner ${fmtK(l.owner)} + daily ${fmtK(l.daily)} + weekly ${fmtK(l.weekly)} + monthly ${fmtK(l.monthly)}</div>`).join('') || '<p class="small">No purchases yet.</p>'}</div>`;
    $('#presimg').appendChild(spriteCanvas('golden', { top: 'gold_suit', hat: 'crown', neck: 'diamond_chain', bottom: 'slacks_black', feet: 'loafers' }, 72, 92, 1));
    return;
  }
  const items = Object.entries(MALL_ITEMS).filter(([, it]) => cat === 'all' || it.cat === cat);
  body.innerHTML = `${demo}<h2>${esc(store?.name || 'Kibble Mall')}</h2><p class="sub">Luxury goods priced in ${kibText(state)}. Owned by ${OWNER.name}. Checkout shows the <b>${FEE_LABEL}</b>.</p><div class="grid" id="mallgrid"></div>${cat === 'all' ? pools : ''}`;
  const grid = $('#mallgrid');
  for (const [id, it] of items) {
    const q = quote(id), card = document.createElement('div'); card.className = 'card';
    if (it.grants.outfit) card.appendChild(spriteCanvas(state.player.coat, { ...state.wardrobe.equipped, [OUTFITS[it.grants.outfit].slot]: it.grants.outfit }, 72, 92, 1));
    else if (it.grants.furniture) card.appendChild(iconCanvas((x) => drawFurniture(x, it.grants.furniture, 14, 4, 36, 0)));
    else card.appendChild(iconCanvas((x) => drawCar(x, 32, 40, { col: it.grants.car === 'limo' ? '#e3b341' : '#c8323c', kind: it.grants.car === 'limo' ? 'limo' : 'coupe', dir: 'east' })));
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
  if (mode === 'world') { updateWorld(dt); renderWorld(); drawSceneBars(); }
  else if (mode === 'build') { $('#prompt').hidden = true; renderBuild(); }
  requestAnimationFrame(frame);
}
titleScreen(); requestAnimationFrame(frame);
cv.addEventListener('wheel', (e) => { if (mode !== 'world') return; e.preventDefault(); const now = performance.now(); if (now - (cv._wz || 0) < 180) return; cv._wz = now; setZoom(stepZoom(ZOOM, e.deltaY < 0 ? 1 : -1)); }, { passive: false });
{ let pinch = null; const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  cv.addEventListener('touchstart', (e) => { if (e.touches.length === 2) pinch = dist(e.touches); }, { passive: true });
  cv.addEventListener('touchmove', (e) => { if (!pinch || e.touches.length !== 2) return; const d = dist(e.touches); if (d / pinch > 1.35) { setZoom(stepZoom(ZOOM, 1)); pinch = d; } else if (pinch / d > 1.35) { setZoom(stepZoom(ZOOM, -1)); pinch = d; } }, { passive: true });
  cv.addEventListener('touchend', (e) => { if (e.touches.length < 2) pinch = null; }, { passive: true }); }
document.getElementById('zin')?.addEventListener('click', () => setZoom(stepZoom(ZOOM, 1))); document.getElementById('zout')?.addEventListener('click', () => setZoom(stepZoom(ZOOM, -1)));
window.__inu = { guide, open: (k, o) => openPanel(k, o), get time() { return time; }, get player() { return player; }, get zoom() { return ZOOM; }, setZoom, president: pres, presVisit: (k) => startVisit(pres, k, { dayLen: DAY_LEN }), setHour: (h) => { dayOffset = timeForHour(h) - time; }, setRain: (r) => { amb.rain = amb.rainTarget = r; amb.weatherT = 999; }, get amb() { return amb; }, get npcs() { return npcs; }, emote: (k) => doEmote(k), cam, get state() { return state; }, get mode() { return mode; }, get panel() { return panel?.kind; }, get panelObj() { return panel; } };
// Inu Arcade inside the desktop overlay: its 🏠 button asks us to close the overlay instead of reloading.
addEventListener('message', (e) => { if (e.origin === new URL(ARCADE.url).origin && e.data?.type === 'inu:back-to-verse' && arcadeOpen) { closeArcade(); try { e.source?.postMessage({ type: 'inu:verse-closed' }, e.origin); } catch {} } });
