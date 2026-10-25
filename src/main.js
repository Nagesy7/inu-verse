import { CHAPEL as CHAPEL_POS, LOTS as BIZ_LOTS } from './world.js';
import { TILE, MAP_W, MAP_H, MAP, T, BUILDINGS, PLOTS, NPC_HOMES, CLUBHOUSE, MALL_BUILDINGS, STATUE, LEADERS, PLOT_COST, findPath, moveBody, nearestInteractable, interactables, isSolid } from './world.js';
import { COATS, newGame, claimPlot, reconcilePlots, buyFurniture, placeFurniture, moveFurniture, storeFurniture, sellPlaced, sellFromInventory, upgrade, swapBonesToKibble, BONES_PER_KIBBLE } from './game.js';
import { FURNITURE, WALLS, FLOORS, ROOM_W, ROOM_H, canPlace, itemAt, footprint } from './furniture.js';
import { MENU, STATIONS, newShift, tickShift, addToTray, clearTray, serve, finishShift, SHIFT_LEN, startCook, clearTable, seatCustomer, takeOrder, NUM_TABLES, TABLES_START, cookAtStation, selectQueue, seatSelected } from './cafe.js';
import { createToken, playerBuy, playerSell, simulateTick, seedTokens, holderCount, PLAYER, CREATE_FEE } from './launch.js';
import { price, marketCap, progress, fmtPrice } from './curve.js';
import { save, load } from './save.js';
import { OUTFITS, SLOTS, SLOT_NAMES, buyOutfit, equipOutfit, unequipSlot, ensureWardrobe } from './outfits.js';
import { mulberry32 } from './rng.js';
import { spawnNpcs, updateNpc, NPC_OUTFITS } from './npc.js';
import { npcHome, installHomeScene, HOME_OX, HOME_OY } from './homes.js';
import { drawShiba, drawFurniture, drawRoom, drawMenuIcon, drawBoneIcon, drawEmblem, GOLD } from './art.js';
import { ART, artReady, artKey } from './art.js';
import { carProps, catProps, dogWalkActors, leashProps, drawBreadBasket } from './ambient.js';
import { drawCar } from './cars.js';
import { makeAlive, stepAlive, drawAliveGround, drawAliveSky, ALIVE, reducedMotion } from './alive.js';
import { makeAmbient, stepAmbient, throwBall, dayPhase, timeForHour, drawGroundLife, drawSkyLife, drawAtmosphere, drawEmote, lightsFor, addMail, unreadMail, EMOTES, DAY_LEN } from './ambient.js';
import { initAudio, setMusicActive, setMuted, isMuted, footstep, chirp, bork, blip, uiClick, uiOpen, uiClose, textBlip, rustle, fanfare, cafeChime, munch, sip, clink, crierBell } from './audio.js';
import * as VF from './verified.js'; // Verified Launch badge (opt-in) + town crier news
import * as WL from './wallets.js'; // named wallets (President's Vault, Kennel Chest, Bone Vault)
import { DISHES, order as dinerOrder, favourite as dinerFav, dishById } from './diner.js';
import { makeCafePlay } from './cafeplay.js';
import { drawDishIcon } from './dinerart.js';
import { CAR_MODELS, CAR_COLORS, ensureGarage, buyCar, carOf } from './garage.js';
import { PETS, ensurePets, buyPet, renamePet, activePet, followStep, petSprite } from './pets.js';
import { wallet, TREASURY, DEMO, SOON, demoOnly, kibText, setWallet, kibblePayWallet, GAME as KGAME } from './wallet.js';
import { ZOOMS, DEFAULT_ZOOM, stepZoom, clampCam } from './zoom.js';
import { makePresident, startVisit, updatePresident, presidentProps, presidentPresent, talk as presTalk, OUTFIT as PRES_OUTFIT, KINDS as PRES_KINDS } from './president.js';
import { MALL_ITEMS, quote, buyMallItem, ensureMall, rollPeriods, fmtK, FEE_LABEL, OWNER, OWNER_WALLET, POOL_RULES, FEE_BPS, officeTreasuryNote, officeLedgerNote } from './mall.js';
import { GAMES, boardRows, poolEntries } from './leaderboards.js';
import { makeCrew, stepCrew, takeGig, drawVest, drawTool, drawCones } from './workers.js';
import { trending, adProps, adAt } from './coinads.js';
import * as MOB from './mobility.js';
import * as RC from './realcoins.js';
import * as CL from './cleanlaunch.js';
import * as NV from './npcvoices.js';
import * as KN from './kennel.js';
import * as RD from './raidui.js';
import { eventAt as raidEventAt } from './bossraid.js';
import { KENNEL_TAG } from './art.js';
import { KIBBLE_PLAZA } from './world.js';
import { ensureFarm, tickFarm, seasonOf, marketHour, rollFarmWeek, catchUp, fishCatch, WEEK_DAYS } from './farm.js';
import { ensureBiz, bizHour, bizDay, rollBizWeek, rivalAt as bizRivalAt } from './biz.js';
import * as IN from './interiors.js';
import { createShopLayer, drawProp as drawShopProp } from './interiorart.js';
import { renderField, renderFarm, renderLot, renderBizBoard } from './farmui.js';
import * as REL from './relations.js';
import { startJob } from './jobui.js';
import { renderCity } from './flyui.js';
import * as PB from './poolboard.js';
import * as LS from './loginstreak.js'; import * as LSUI from './streakui.js'; import { drawWornPin } from './streakart.js';
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
import { isRealWallet, placeById } from './guide.js';
import * as OB from './onboard.js';
import { createOnboardUi } from './onboardui.js';
import { mascotActors, drawMascotTag } from './onboardart.js';
import * as PAIR from './pairing.js';
import { ensureFly, featuredOf, statusGlow, poolsOf, FEATURED_SLOTS, claimPresDrop } from './flywheels.js';
import * as IQC from './companions.js';
import * as DIS from './districts.js';
import { hubSignProp } from './districtart.js';
import { renderCompanions } from './companionui.js';
import { makeTown, townHour, lineFor, playerDid, friendsOf, rivalsOf, breadRound, sydneyMinutes } from './townai.js';
import { mountCreator, drawPreview, profileOfChoices } from './creatorui.js';
import { startTitleFx } from './titlefx.js';
import { applyCreation, defaultChoices, restyle, SALON_PRICE, HOMES as HOMES_, PATHS as PATHS_, STARTER_OUTFITS as OUTFITS_ } from './creator.js';
import { profileFromState, hasCustomLook, saveProfile, loadProfile, setProfileStore, kibblePayProfileStore, profileStore } from './profile.js';
import { TRAITS } from './traits.js';
import { drawProfileShiba, drawPoseFx } from './art.js';
import { ACTIONS, makeActor, startAction, stepActor, poseAt, poseCodeOf, isAction } from './actions.js';
import { mountWheel } from './actionwheel.js';
import { WORKER_JOB, JOBS as JOB_DEFS, ensureJobs, rankOf } from './jobs.js';
import { renderFriend, renderChapel, renderFurnStore } from './relui.js';
import { prerenderMap, dynamicProps, buildingsReady } from './render.js';
import { N, SCALE, drawWater } from './tiles.js';
import { feel } from './feel.js';
import { faceTalk, faceReact } from './face.js';
import { stepChat, drawChat, emoteBubble, say as chatSay } from './chat.js';
import { renderAcademy } from './academyui.js';
import { makeRoomPlay } from './roomplay.js';
import { sceneForDoor, HUB_GATES, resolveExit, makePortalState, portalStep, SCENES, scene as sceneOf, walkInExits, solidAt as sceneSolid, ST as ROOM_ST } from './scenes.js';
import { hubGateProp } from './sceneart.js';
import { buildDrawer, drawerOpen } from './hudmenu.js';
import { makeDoorState, doorStep, doorExit, outsideOf } from './doors.js';
import { isDoor, doorList, doorDir, COMMUNITY } from './world.js';
import { createMultiplayer } from './multiplayer.js';
import { createTrading, renderTrade, TRADE_CSS } from './tradeui.js';
import { createJoystick, joyPref, JOY_KEY } from './joystick.js';
import * as PAB from './sim/bureau.js'; // Paw Audit Bureau (Phase 1 sim layer): desk + Watchdogs + report panel
import { ensureShare, myHomePlot, layoutOf, layoutKey, homeApi, cleanLayout, cleanEntry, validHomeId, validPlotId, GB } from './homeshare.js';
import * as KM from './kibblemood.js';
import * as MWd from './moodworld.js';
import * as FS from './foundingseats.js';
import * as BurnVote from './burnvote.js';
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
// Inu Quest companions (cosmetic followers, read-only bridge; choice kept in the Verse save). ?companions=fixture|fixture-wren|none
// loads a local sample profile on localhost only (dev/proof); production always goes through the bridge with the player's session.
const CMP = { prof: null, status: 'idle', F: IQC.makeFollower(), remotes: new Map(), seq: 0, lastT: 0 };
const CMP_FIX = /^(localhost|127\.0\.0\.1)$/.test(location.hostname) ? new URLSearchParams(location.search).get('companions') : null;
async function loadCompanionProfile() { const my = ++CMP.seq; CMP.status = 'loading'; let fixture = null;
  if (CMP_FIX && CMP_FIX !== 'none') fixture = await fetch(`tests/fixtures/${CMP_FIX === 'fixture-wren' ? 'companions-wren-beaten' : 'companions-sample'}.json`).then((r) => (r.ok ? r.json() : null)).catch(() => null);
  const online = navigator.onLine !== false, prof = CMP_FIX === 'none' ? null : await IQC.loadCompanions({ kp: DEMO ? null : K.kp, fixture, online });
  if (my !== CMP.seq) return; CMP.prof = prof; CMP.status = prof ? 'ready' : !online ? 'offline' : 'none'; if (panel?.kind === 'companions') openPanel('companions'); }
addEventListener('kibble:wallet', () => { if (state) loadCompanionProfile(); }); addEventListener('online', () => { if (state && !CMP.prof) loadCompanionProfile(); });
globalThis.__cmp = CMP; // dev/proof hook (read-only view of follower state)
const myCompanion = () => (state && mode === 'world' && !drive ? IQC.chosen(CMP.prof, state.companion) : null);
// ambient life pass: Sydney clock for Taro's bread round (?sydney=HH:MM pins it for proof shots; cosmetic only), refreshed once a second
const SYD_Q = /^(\d{1,2}):(\d{2})$/.exec(new URLSearchParams(location.search).get('sydney') || ''); let sydMin = 0, sydAt = -1;
const sydneyNow = () => (globalThis.__sydneyMin ?? (SYD_Q ? +SYD_Q[1] * 60 + +SYD_Q[2] : sydneyMinutes()));
const walkNow = () => (globalThis.__walkClock ?? Date.now()); // dog walks follow the shared wall clock (same place on every client)
let vignette = null, miniBase = null;
const keys = new Set();
const touch = { x: 0, y: 0, id: null };
let JOYS = null, joyT = 0; // optional joystick (src/joystick.js), built with the touch controls below
const joyApi = { get: () => joyPref(state), set: (v) => { if (state) { state.settings ||= {}; state.settings.joystick = !!v; persist(); } try { localStorage.setItem(JOY_KEY, v ? '1' : '0'); } catch {} JOYS?.set(!!v); joyApi.onChange?.(); }, onChange: null };
globalThis.__joy = joyApi;
const COARSE = matchMedia('(pointer: coarse)');
function setA(label) { const b = document.getElementById('btn-a'); if (b && b.dataset.l !== label) { b.dataset.l = label; b.innerHTML = label ? `<span>${label}</span>` : 'A'; b.classList.toggle('ready', !!label); } }
const player = { face: 'down', dir: 1, phase: 0, moving: false, path: [], target: null, v: { x: 0, y: 0 }, pw: MOB.makePathWalker(), running: false, holdRun: false };
const stickTap = MOB.makeTapper(), groundTap = MOB.makeTapper(); let dustAcc = 0;
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
function persist() { if (state) { for (const u of ENG.checkCollections(state)) toast(`Collection complete: ${u.badge} ${u.name}! Trophy added to your inventory.`, 'good'); save(state, localStorage); if (mode === 'build' && build && !build.readOnly && !build.pack && !build.shop) schedulePublish(); if (mode === 'build' && build?.shop?.own) scheduleShopPublish(); if (hasCustomLook(state) && Date.now() - profSaveT > 15000) { profSaveT = Date.now(); saveProfile(state); } } }
// burn-for-status flair: pulsing pixel halo + sparkles at the feet (world, home and photos)
function drawFlair(c, col, t) { const r = 40 + Math.sin(t * 3) * 3; c.save(); c.globalAlpha = 0.5; c.fillStyle = col; c.fillRect(-r, 6, r * 2, 12); c.fillRect(-r + 10, 0, r * 2 - 20, 24); c.globalAlpha = 0.22 + Math.sin(t * 4) * 0.08; c.fillRect(-r + 8, -100, r * 2 - 16, 106); c.globalAlpha = 1; for (let i = 0; i < 6; i++) { const a = t * 1.6 + i * 1.047; c.fillStyle = i % 2 ? '#ffffff' : col; c.fillRect(Math.round(Math.cos(a) * 52) - 4, Math.round(-50 + Math.sin(a) * 56) - 4, 8, 8); } c.restore(); }
function featuredMap() { const nowH = state.clockSec / (DAY_LEN / 24), out = {}; for (const id of Object.keys(FEATURED_SLOTS)) { const r = featuredOf(state, id, nowH); if (r) out[id] = { ...r, label: 'FEATURED' }; const sp = F5.sponsorOf(state, id, nowH); if (sp) out[id] = { ticker: sp.brand, by: sp.by, untilH: sp.untilH, featured: true, sponsored: true, label: 'SPONSORED' }; } return out; }
// ---- real $KIBBLE (kibble-pay, live: mint 4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump). Demo only with ?demo=1; otherwise no fake balances.
let K = { mode: DEMO ? 'demo' : 'offline', kp: null }, serverPools = null;
async function refreshPools() { try { const r = await K.kp.pools(); const u = (p) => Number(r.pools[p].accruedBaseUnits); serverPools = { daily: u('daily'), weekly: u('weekly'), monthly: u('monthly'), burned: Number(r.burnedAllBaseUnits) }; globalThis.__livePools = serverPools; if (state) hud(); } catch {} }
// Login streak: wallet (server, Sydney day) when signed in, else device-only. Re-checks when the Sydney day rolls over.
let streakBusy = false, streakDay = null;
async function syncStreak(why = '') { if (!state || streakBusy) return; streakBusy = true;
  try { let r; const kp = K.kp;
    if (!DEMO && kp?.signedIn) { try { r = await LS.walletCheckIn(state, kp); } catch (e) { r = /429|slow/i.test(e.message || '') ? { counted: false, newPins: [] } : LS.deviceCheckIn(state); } }
    else { LS.toDevice(state); r = LS.deviceCheckIn(state); }
    streakDay = LS.sydneyDay();
    if (r.counted && why !== 'quiet') toast(`Login streak: day ${LS.view(state).count}${state.loginStreak.wallet ? '' : ' (device-only)'}`, 'good');
    for (const m of r.newPins) toast(`Streak pin unlocked: ${LS.PINS[m].name}! Wear it from the Streak tab.`, 'good');
    persist(); hud(); } finally { streakBusy = false; } }
setInterval(() => { if (state && LS.sydneyDay() !== streakDay) syncStreak(); }, 60_000);
addEventListener('kibble:wallet', () => setTimeout(() => syncStreak(), 300));
async function bootKibble() {
  try { const G = await import('https://kibble-pay.vercel.app/inu-games.js'); K = await G.initKibble({ game: KGAME }); G.mountFooter(K.mode);
    // Connect Wallet (title + in-game): cloud save keyed by wallet, holder tier from on-chain $KIBBLE (VIP perks read the real balance).
    const js = (g) => { try { return JSON.parse(g('inuverse.save.v1') || 'null'); } catch { return null; } };
    G.mountWallet(K, { game: KGAME, keys: ['inuverse.save.v1', 'inu.profile.v1:'], position: 'top-center',
      playerName: () => state?.player?.name || '',
      progress: (g) => { const s = js(g); return s ? Math.floor((s.stats?.bonesEarned || 0) + (s.stats?.shifts || 0) * 10 + (s.clockSec || 0) / 60) : 0; },
      label: (g) => { const s = js(g); return s ? `${s.player?.name || 'Shiba'} · ${Math.floor(s.stats?.bonesEarned || 0)} bones earned` : ''; },
      onWallet: () => { if (K.kp?.session) wallet().refresh?.().then(() => state && hud()).catch(() => {}); syncStreak(); } }); }
  catch (e) { K = { mode: DEMO ? 'demo' : 'offline', kp: null }; }
  document.body.dataset.kibble = K.mode;
  if (!DEMO) { PB.load(globalThis.__poolFetch || fetch).catch(() => {}); setInterval(() => { if (document.visibilityState === 'visible') PB.load(globalThis.__poolFetch || fetch).catch(() => {}); }, PB.CACHE_MS); }
  if (K.kp) { setWallet(kibblePayWallet(K.kp)); setProfileStore(kibblePayProfileStore(K.kp)); refreshPools(); if (K.kp.session) wallet().refresh().catch(() => {}); }
  syncStreak();
  const b = $('#btn-phantom'); if (b) { b.title = DEMO ? 'Demo mode: no wallet' : 'Sign in with Phantom'; b.innerHTML = DEMO ? 'Demo mode <small>(fake KIBBLE)</small>' : 'Phantom'; }
  if (state) hud();
}
addEventListener('kibble:paid', (e) => { toast(e.detail.burn ? 'Burn confirmed: tap again to unlock it.' : 'Payment confirmed: tap Buy again to receive it.', 'good'); wallet().refresh?.().then(() => state && hud()).catch(() => {}); refreshPools(); });
addEventListener('kibble:failed', (e) => toast(e.detail.reason || 'Payment failed', 'bad'));
addEventListener('kibble:wallet', () => { if (state) { state.walletAddr = wallet().address; hud(); } });
bootKibble(); refreshRegistry(true);
if (localStorage.getItem('inu.noext.resume')) import('./launchui.js').then((m) => m.resumeAuth({ toast })).catch(() => {}); // finish Google/Apple sign-in after Phantom's redirect
function hud() { GOLD.name = F5.isVip(state) ? state.player.name : null; { const P = DEMO ? poolsOf(state) : serverPools, el = $('#pools'); if (el) el.textContent = P ? `D${(P.daily / 1e6).toFixed(2)} W${(P.weekly / 1e6).toFixed(2)} M${(P.monthly / 1e6).toFixed(2)}` : 'pools'; } $('#bones').textContent = Math.floor(state.bones); $('#kibble').textContent = DEMO ? state.kibble.toFixed(2) : (wallet().live ? (wallet().balanceUi ?? '–') : 'soon'); $('#hud-name').textContent = state.player.name; { const ch = $('#streak-chip'); if (ch) { const k = JSON.stringify(LS.view(state)); if (ch.dataset.k !== k) { ch.dataset.k = k; ch.innerHTML = LSUI.chipHtml(state); ch.classList.toggle('device', !state.loginStreak?.wallet); } } } }

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
  // caption under the preview: names what you just picked + the choices the preview can't draw (pronouns, personality, home, path)
  const capOf = (c, last) => { const t = TRAITS[c.trait], H = HOMES_[c.home], P = PATHS_[c.path], F = OUTFITS_[c.outfit];
    return `${last ? `<b class="cap-last">${esc(last.row)}: ${esc(last.label)}</b>` : '<b class="cap-last">Pick anything: the preview updates live</b>'}<span>${esc(c.pronouns)} · ${esc(t?.name || '')} · ${esc(F?.name || '')} · ${esc(H?.name || '')}${c.path !== 'none' ? ' · ' + esc(P?.name || '') : ''}</span>`; };
  let capLast = null; const cap = () => { const el = $('#pv-cap'); if (el) { el.innerHTML = capOf(creator.choices, capLast); el.classList.remove('flash'); void el.offsetWidth; el.classList.add('flash'); } };
  creator = mountCreator($('#creator'), { choices: { ...defaultChoices(), name: $('#name').value }, onPick: (o) => { initAudio(); uiClick(); if (o.k) { capLast = o; cap(); const pv = $('#preview'); pv.classList.remove('bump'); void pv.offsetWidth; pv.classList.add('bump'); } } });
  cap(); startTitleFx($('#title-bg'), { alive: () => mode === 'title' && !$('#title').hidden });
  const fadeIn = (go) => { if ($('#title').classList.contains('leaving')) return; initAudio(); uiClick(); $('#title').classList.add('leaving'); setTimeout(go, 380); }; // smooth fade into the world
  const saved = load(localStorage);
  if (saved) { $('#continue').hidden = false; $('#continue').onclick = () => fadeIn(() => startGame(saved)); }
  $('#start').onclick = () => fadeIn(() => { const ch = { ...creator.choices, name: $('#name').value.trim() || 'Inu' }; const s = newGame({ name: ch.name, coat: 'tan' });
    applyCreation(s, ch, { ensureFarm, ensureJobs, ensureRel: REL.ensureRel }); seedTokens(s, rng); startGame(s); saveProfile(s); toast(`Welcome to Inu Verse, ${s.player.name}! ${TRAITS[s.player.trait].name}: ${TRAITS[s.player.trait].desc}.`, 'good'); });
  const pv = $('#preview'), pc = pv.getContext('2d');
  const faces = ['down', 'right', 'up', 'left'];
  const loop = (t) => {
    if (mode !== 'title') return; if (globalThis.__titleFreeze != null) t = globalThis.__titleFreeze; pc.imageSmoothingEnabled = false; pc.clearRect(0, 0, pv.width, pv.height);
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

function startGame(s) { loadProfile(s).catch(() => {}); IQC.ensureChoice(s); loadCompanionProfile(); ENG.ensureEngage(s); ENG.addSeasonXp(s, 'login', Math.floor((s.clockSec || 0) / DAY_LEN)); F5.ensureFly5(s); F5.holderCheck(s); OB.ensureOnboard(s); s.town ||= makeTown(rng); townH = -1; seedTokens(s, rng); REL.ensureRel(s); ensureFarm(s); ensureBiz(s); s.clockSec ??= 0; catchUp(s, Date.now(), { season: seasonOf(Math.floor(s.clockSec / DAY_LEN)), rain: false }); hourIdx = Math.floor(s.clockSec / (DAY_LEN / 24));
  state = s; state.kibble ??= DEMO ? 20 : 0; if (!DEMO) state.kibble = 0; ensureWardrobe(state); ensurePacks(state); ensureMall(state); state.clockSec ??= 0; lastEarned = state.stats.bonesEarned; mode = 'world'; LS.ensureStreak(state); setTimeout(() => syncStreak(), 0);
  setTimeout(() => refreshPlotOwners(), 0);
  buildDrawer(document, { joystick: joyApi, bork: () => { initAudio(); bork(); player.emote = { kind: 'bork', t: 1.2 }; emoteBubble('me', 'bork', time); } }); $('#title').hidden = true; $('#hud').hidden = false; $('#minimap-wrap').hidden = false; document.body.classList.add('inworld');
  makeAlive(); mapImg = prerenderMap(); npcs = spawnNpcs(rng, 6); npcs.forEach((n) => { n.art = artKey(n.coat); }); amb = makeAmbient(42);
  Promise.all([artReady, buildingsReady, document.fonts?.load('8px Silkscreen').catch(() => {})]).then(() => { mapImg = prerenderMap(); });
  feel.fade(); $('#hud').classList.add('in');
  // ?spawn=<building> (from a game's 🏠 Back to Inu Verse): stand just outside that building's door.
  { const sp = new URLSearchParams(location.search).get('spawn'), d = sp && [ARCADE, ...GAME_DOORS].find((x) => x.id === sp);
    if (d && d.door) { const o = outsideOf({ ...d.door, id: d.id }); Object.assign(state.player, { x: o.x, y: o.y }); player.face = o.face; } }
  // back from an Arcade cabinet (contract §3.4): ?spawn=door-<cabinet>&district=<id> -> stand at that door in the districts zone
  { const r = DIS.parseReturn(location.search); if (r) { const g = DIS.HUB_GATE; Object.assign(state.player, { x: (g.out[0] + 0.5) * TILE, y: (g.out[1] + 0.5) * TILE }); globalThis.__districtReturn = r;
      setTimeout(() => { if (mode === 'world') enterRoom('districts', r.spawn || 'd-' + r.district); if (r.cabinet) setTimeout(() => toast(`Welcome back from ${DIS.cabTitle(r.cabinet)}!`, 'good'), 400); }, 60); } }
  cam.x = state.player.x; cam.y = state.player.y; hud(); persist(); wayUi(true);
  // Hub / deep-links: ?open=launch opens Launch Hall (guide + panel). ?kibblesign=1 opens creator signing card.
  { const open = (new URLSearchParams(location.search).get('open') || '').toLowerCase().replace(/[_\s-]/g, '');
    if (open === 'launch' || open === 'launchhall') setTimeout(() => { const p = placeById(state, 'launch'); if (p) { guide.setGuide(p); guide.walk(); } openPanel('launch'); }, 700);
    else if (open === 'academy' || open === 'goodboy' || open === 'school') setTimeout(() => { const p = placeById(state, 'academy'); if (p) { guide.setGuide(p); guide.walk(); } openPanel('academy'); }, 700);
    else if (/[?&]kibblesign=1/.test(location.search)) setTimeout(() => openPanel('launch', { tab: 'kibble', sign: true }), 900);
    else setTimeout(tourCheck, 1400); }
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
  if (wheel.key(k)) { e.preventDefault(); return; }
  if ((mode === 'world' || mode === 'room') && !panel && state && !drive) { ACT.still = 0; // any key resets the idle clock (auto-sit/doze)
    if (k === 'g') { wheel.toggle(); return; }
    const ak = '123456789'.indexOf(k); if (ak >= 0 && k.length === 1) { doAction(ACT_KEYS[ak]); return; } }
  if (mode === 'world' && !panel && state) {
    if (k === 'h' && drive) honk();
    if (k === 'b') { bork(); player.emote = { kind: 'bork', t: 1.2 }; emoteBubble('me', 'bork', time); }
    if (k === 't') { const d = throwBall(amb, state.player, player.face, npcs); blip(660); if (d) toast(`${d.name} is fetching!`, 'good'); }
    if (k === 'm') toggleMute();
    if (k === '+' || k === '=') setZoom(stepZoom(ZOOM, 1)); if (k === '-' || k === '_') setZoom(stepZoom(ZOOM, -1));
    if (k === 'p') togglePhoto();
  }
  if (feel.talking() && (k === 'e' || k === 'enter' || k === ' ')) { feel.advance(); return; }
  if (k === 'escape') { if (panel) closePanel(); else if (build) exitBuild(); }
  if (mode === 'room' && !panel && (k === 'e' || k === 'enter')) { RP.act(); return; }
  if (mode === 'world' && !panel && (k === 'e' || k === 'enter') && carAction()) return;
  if (mode === 'world' && !panel && (k === 'e' || k === 'enter')) { const it = nearestInteractable(state, state.player.x, state.player.y); const pup = nearPup(); if (pup && !it) petPup(pup); else if (it) interact(it); }
  if (mode === 'build' && k === 'r') rotateSel();
});
addEventListener('keyup', (e) => keys.delete(e.key.toLowerCase()));
let ZOOM = DEFAULT_ZOOM; // world zoom (2 = default close-up; 1 and 0.5 zoom out). Shibas are drawn at half world scale so they shrink with the world.
function setZoom(z) { if (!ZOOMS.includes(z) || z === ZOOM) return; ZOOM = z; const el = document.getElementById('zlevel'); if (el) el.textContent = ZOOM === 2 ? '1x' : ZOOM === 1 ? '½x' : '¼x'; }
const screenToWorld = (sx, sy) => ({ x: (sx - innerWidth / 2) / ZOOM + cam.x, y: (sy - innerHeight / 2) / ZOOM + cam.y });

cv.addEventListener('pointerdown', (e) => { if (mode === 'build' && build?.shop) build.hover = shopCell(e.clientX, e.clientY); });
cv.addEventListener('mousemove', (e) => { if (mode === 'build') build.hover = build.shop ? shopCell(e.clientX, e.clientY) : roomCell(e.clientX, e.clientY); });
cv.addEventListener('click', (e) => {
  if (mode === 'world' && !panel) {
    const w = screenToWorld(e.clientX, e.clientY); const ad = adAt(trend, adRot, adIdx, w.x, w.y); if (ad) { blip(990); openPanel('launch', ad.coin.real ? (ad.coin.mint === RC.KIBBLE.mint ? { tab: 'kibble' } : { tab: 'board', coin: ad.coin.mint, vfOpen: !!ad.coin.verified }) : { sel: ad.coin.id }); return; } clickWorldTile(Math.floor(w.x / TILE), Math.floor(w.y / TILE), w.x, w.y);
  } else if (mode === 'room' && !panel && !feel.talking()) RP.click(e.clientX, e.clientY, groundTap(performance.now()));
  else if (mode === 'build') { if (build.shop) shopClick(shopCell(e.clientX, e.clientY)); else buildClick(roomCell(e.clientX, e.clientY)); }
});
$('#minimap').addEventListener('click', (e) => { if (mode === 'world' && !panel) { if (guide) return guide.openMap(); const r = e.target.getBoundingClientRect(); clickWorldTile(Math.floor((e.clientX - r.left) / 2), Math.floor((e.clientY - r.top) / 2)); } });
// Tap/click-to-walk: A* (8-way, no corner cutting) + string-pulled legs. Tapping a building/door walks there and enters,
// tapping an NPC walks up to them and talks; double-tap = run there. Keys / stick cancel it instantly.
const solidT = (x, y) => isSolid(x, y);
function npcAtWorld(wx, wy) { let best = null, bd = 22; const cands = [...npcs.map((n) => ({ n, x: n.x, y: n.y })), ...crew.filter((w) => w.on).map((w) => ({ n: w, x: w.x, y: w.y, crew: true }))];
  if (presidentPresent(pres)) cands.push({ n: pres, x: pres.x, y: pres.y, pres: true });
  for (const c of cands) { const dx = Math.abs(wx - c.x), dy = c.y - wy; if (dy < -10 || dy > 44) continue; const d = Math.hypot(dx, Math.max(0, dy - 18)); if (dx < 16 && d < bd) { bd = d; best = c; } } return best; }
function planTo(goal, { target = null, npcT = null, run = false, mark = true } = {}) {
  const sx = Math.floor(state.player.x / TILE), sy = Math.floor(state.player.y / TILE);
  const raw = MOB.astar(sx, sy, goal[0], goal[1], solidT, { w: MAP_W, h: MAP_H }); if (!raw) { player.clickMark = null; return false; }
  const pts = MOB.smoothPath(raw, solidT, TILE).slice(1), end = raw[raw.length - 1];
  Object.assign(player.pw, { pts: pts.length ? pts : [end], goal: end, run, stuckT: 0, lastD: Infinity, replans: player.pw.goal && player.pw.goal[0] === end[0] && player.pw.goal[1] === end[1] ? player.pw.replans : 0 });
  player.path = player.pw.pts; player.target = target; player.npcT = npcT;
  if (mark) player.clickMark = { x: (end[0] + 0.5) * TILE, y: (end[1] + 0.5) * TILE, t: 1, npc: !!npcT };
  return true; }
function clickWorldTile(tx, ty, wx, wy) {
    const run = groundTap(performance.now());
    if (wx != null) { const hit = npcAtWorld(wx, wy); if (hit) { if (!hit.crew && !hit.pres) hit.n.held = 6; return planTo([Math.floor(hit.x / TILE), Math.floor(hit.y / TILE)], { npcT: hit, run }); } }
    let target = null;
    for (const b of BUILDINGS) if (tx >= b.x && tx < b.x + b.w && ty >= b.y && ty < b.y + b.h) target = interactables(state).find((i) => i.id === b.id);
    for (const p of [...PLOTS, ...NPC_HOMES, CLUBHOUSE, ...MALL_BUILDINGS]) if (tx >= p.x && tx < p.x + p.w && ty >= p.y && ty < p.y + p.h) target = interactables(state).find((i) => i.id === p.id);
    if (!target) target = interactables(state).find((i) => i.tx === tx && i.ty === ty) || null;
    if (!target) target = doorsNow.find((d) => { const v = doorDir(d); return (d.tx === tx && d.ty === ty) || (d.tx + (v.dx || 0) === tx && d.ty + (v.dy || 0) === ty); }) || null; // tapped a door, or the wall/building tile right behind it
    if (!target) { const g = HUB_GATES.find((q) => Math.abs(q.tx - tx) <= 1 && Math.abs(q.ty - ty) <= 1); if (g) return planTo([g.tx, g.ty], { target: { kind: 'hubgate', g, tx: g.tx, ty: g.ty }, run }); }
    planTo(target ? [target.tx, target.ty] : [tx, ty], { target, run });
}
globalThis.__walkTo = (tx, ty, run = false) => planTo([tx, ty], { run }); globalThis.__mob = () => ({ v: { ...player.v }, running: player.running, pts: player.pw.pts.length, moving: player.moving, face: player.face, x: state.player.x, y: state.player.y, mark: !!player.clickMark });
function arrive() { const t = player.target, nt = player.npcT; player.target = null; player.npcT = null; player.clickMark = null;
  if (t?.kind === 'hubgate') { player.face = t.g.face; return enterGate(t.g); }
  if (t) { if (isWalkDoor(t) || WALK_IN_SPOTS.has(t.id)) { player.face = doorDir(t).face; if (doorReady()) enterDoor(t); } else interact(t); }
  else if (!nt) { const tx = Math.floor(state.player.x / TILE), ty = Math.floor(state.player.y / TILE), d = doorsNow.find((q) => q.tx === tx && q.ty === ty); // a plain tap-walk that ends ON a door tile enters it
    if (d && doorReady()) { player.face = doorDir(d).face; enterDoor(d); } }
  else if (nt) { const pup = nearPup(); if (pup) nt.n.held = 0; if (pup) petPup(pup); else if (player.pw.replans++ < 3) planTo([Math.floor(nt.x / TILE), Math.floor(nt.y / TILE)], { npcT: nt, run: player.pw.run, mark: false }); } }
$('#prompt').onclick = () => { if (mode === 'room') return RP.act(); const it = nearestInteractable(state, state.player.x, state.player.y); const pup = nearPup(); if (pup && !it) petPup(pup); else if (it) interact(it); };
addEventListener('pointerdown', () => initAudio(), { once: true });
document.addEventListener('pointerdown', (e) => { if (e.target.closest('button,.btn,.coat,[data-buy],[data-inv]')) { initAudio(); uiClick(); } });
let hourIdx = 0; const fish = { state: 'idle', t: 0, biteAt: 0 };
const gameDay = () => Math.floor((state.clockSec || 0) / DAY_LEN), hourKey = () => Math.floor((state.clockSec || 0) / (DAY_LEN / 24));
function farmCtx() { const day = gameDay(); return { enterShop: (lot) => enterShop(lot), onHarvest: () => ENG.addSeasonXp(state, 'farm', day), state, body: $('#panel-body'), toast, hud, persist, rerender: () => { if (panel) openPanel(panel.kind, panel); }, season: seasonOf(day), rain: amb.rain > 0.3, day, hourKey: hourKey(), weekFrac: ((state.clockSec / DAY_LEN) % WEEK_DAYS) / WEEK_DAYS, fish,
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
globalThis.__rel = { build: (id) => enterBuild(id, false), geom: () => roomGeom(), visit: (id, n) => visitShared(id, n), publish: (f) => publishHome(f), exitBuild: () => exitBuild(), get build_() { return build; }, claim: (id) => claimPlot(state, id), place: (...a) => placeFurniture(state, ...a), start: startScene, wedding: startWedding, get scene() { return scene; } };
globalThis.__farm = { tick: (s) => farmTick(s), get fish() { return fish; } };
function playDuo(id, partner) { if (panel) closePanel(); keys.clear(); startJob(id, { state, rng, day: gameDay, blip, rustle, fanfare, done: (r) => { const d = PAIR.finishDuo(state, id, partner, r, gameDay()); ENG.addSeasonXp(state, 'duo', gameDay()); hud(); persist(); toast(`Duo with ${partner.name}! x${d.mult} · team ${d.team} (+${d.bonus} Bones)`, 'good'); }, closed: () => keys.clear() }); }
globalThis.__playDuo = playDuo;
// ---- Inu Arcade: full-screen overlay (desktop) or new tab (touch), passes wallet + Shiba profile ----
let arcadeTop = [];
async function fetchArcadeTop() { try { const r = await fetch(ARCADE.url + 'api/scores?game=arcade&period=weekly'); const j = await r.json(); arcadeTop = (j.entries || []).filter((e) => !e.house).slice(0, 3); } catch {} }
fetchArcadeTop(); setInterval(fetchArcadeTop, 120000);
function arcadeHints() { const p = profileFromState(state); let lite = null; try { lite = btoa(unescape(encodeURIComponent(JSON.stringify({ ...p, pets: [] })))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); } catch {} return { wallet: p.wallet || null, p: lite }; }
// District / cabinet doors: TOP-LEVEL same-tab navigation on every device (contract §4). Saved spot = outside the districts gate.
function enterCabinet(id) { const cab = DIS.cabinet(id), url = DIS.doorUrl(cab, arcadeHints()); if (!url) return; closePanel(); persist(); keys.clear();
  let ov = document.getElementById('enter-ov'); if (!ov) { ov = document.createElement('div'); ov.id = 'enter-ov'; document.body.appendChild(ov); }
  ov.innerHTML = `<div class="enter-card"><b>Entering ${esc(DIS.label(cab))}…</b><small>opening ${esc(new URL(url).host)} · tap 🏠 there to come back</small><button class="btn ghost" id="enter-cancel">Stay in Inu Verse</button></div>`; ov.hidden = false; feel.fade(); blip(660);
  entering = setTimeout(() => { entering = null; globalThis.__lastNav = url; if (!globalThis.__noNav) location.assign(url); else ov.hidden = true; }, 700);
  ov.querySelector('#enter-cancel').onclick = () => { clearTimeout(entering); entering = null; ov.hidden = true; }; }
function renderCabinet(id) { const body = $('#panel-body'), cab = DIS.cabinet(id); if (!cab) return closePanel(); const d = DIS.district(cab.district);
  body.innerHTML = `<h2>${esc(DIS.label(cab))}</h2><p class="sub">${esc(d.name)} · Inu Arcade cabinet</p>
    ${cab.live ? `<p>This door opens the cabinet on <b>inu-arcade.vercel.app</b> in this tab. Tap <b>🏠 Back to Inu Verse</b> there and you'll be back at this door.</p><div class="row"><button class="btn green" id="cab-go">Play</button><button class="btn ghost" id="cab-stay">Not now</button></div>`
      : `<div class="cp-empty"><p><b>Coming soon.</b> This cabinet is still being built. The gate opens as soon as it's ready.</p></div><div class="row"><button class="btn ghost" id="cab-stay">OK</button></div>`}
    <p class="small">Just for fun here: playing never changes your Bones, $KIBBLE or prizes in Inu Verse.</p>`;
  const go = $('#cab-go'); if (go) go.onclick = () => { uiClick(); enterCabinet(cab.id); }; $('#cab-stay').onclick = () => closePanel(); }
function renderFastTravel(from) { const body = $('#panel-body'), here = mode === 'room' && RP.id === 'districts' ? DIS.districtAt(Math.floor(RP.R.p.x / 32)).id : 'town';
  body.innerHTML = `<h2>Fast travel</h2><p class="sub">Hop between the Arcade Districts. Free, any time.</p><div class="grid ft-grid">${DIS.fastTravel().map((f) => `<button class="card ft-card${f.id === here ? ' on' : ''}" data-ft="${f.id}"><b>${esc(f.name)}</b><small>${f.total == null ? 'Back beside the Arcade hall' : f.open ? `${f.open}/${f.total} open` : 'Coming soon'}</small></button>`).join('')}</div>`;
  body.onclick = (e) => { const b = e.target.closest('[data-ft]'); if (!b) return; uiClick(); fastTravel(b.dataset.ft); }; }
function fastTravel(id) { closePanel(); globalThis.__fastTravels = (globalThis.__fastTravels || 0) + 1;
  if (id === 'town') { if (mode === 'room' && RP.id === 'districts') roomPortal(RP.sc.exits[0]); return; }
  if (mode === 'room' && RP.id === 'districts') return RP.travel('districts', 'd-' + id, 'fast');
  if (mode === 'world') { const g = DIS.HUB_GATE; stopWalk(); Object.assign(state.player, { x: (g.out[0] + 0.5) * TILE, y: (g.out[1] + 0.5) * TILE }); enterRoom('districts', 'd-' + id); } }
function arcadeUrl() { const p = profileFromState(state), q = new URLSearchParams(); if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(p.wallet || '')) q.set('wallet', p.wallet);
  try { const lite = { ...p, pets: [] }; q.set('p', btoa(unescape(encodeURIComponent(JSON.stringify(lite)))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')); } catch {}
  q.set('from', 'inu-verse'); q.set('spawn', 'arcade'); return ARCADE.url + '?' + q.toString(); }
function openArcade() { const url = arcadeUrl(), touch = matchMedia('(pointer: coarse)').matches; setMusicActive(false); // the arcade iframe plays its own music: duck the hub loop so two tracks never overlap
  onboardEngage('arcade', 'use');
  if (touch) { const w = window.open(url, '_blank', 'noopener'); toast(w ? 'Inu Arcade opened in a new tab' : 'Allow pop-ups to open the arcade', w ? 'good' : 'bad'); return; }
  keys.clear(); let ov = document.getElementById('arcade-ov');
  if (!ov) { ov = document.createElement('div'); ov.id = 'arcade-ov'; ov.innerHTML = '<div class="arc-bar"><button class="btn" id="arc-back">◀ Back to Inu Verse</button><b>INU ARCADE</b><a class="btn alt" id="arc-tab" target="_blank" rel="noopener">Open in new tab ↗</a></div><iframe id="arc-frame" allow="autoplay; fullscreen; gamepad" title="Inu Arcade"></iframe>'; document.body.appendChild(ov);
    ov.querySelector('#arc-back').onclick = closeArcade; }
  ov.querySelector('#arc-frame').src = url; ov.querySelector('#arc-tab').href = url; ov.hidden = false; arcadeOpen = true; setTimeout(() => ov.querySelector('#arc-frame').focus(), 300); }
// Rescue Station / Trainer Gate: open Inu Rescue / Inu Quest with the signed-in wallet (public address only; never a session).
function gameDoorUrl(id) { const g = GAME_DOORS.find((d) => d.id === id), w = state?.walletAddr, q = new URLSearchParams();
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(w || '')) q.set('wallet', w); if (DEMO) q.set('demo', '1'); q.set('from', 'inu-verse'); q.set('spawn', id); return g.url + '?' + q.toString(); }
function openGameDoor(id) { const url = gameDoorUrl(id), g = GAME_DOORS.find((d) => d.id === id); keys.clear(); const w = window.open(url, '_blank', 'noopener');
  toast(w ? `${g.name} opened in a new tab${/wallet=/.test(url) ? ' with your wallet' : ''}` : 'Allow pop-ups to open ' + g.name, w ? 'good' : 'bad');
  if (id === 'rescue') onboardEngage('rescue', 'use');
  if (id === 'quest') onboardEngage('quest', 'use');
  if (id === 'rescue' || id === 'quest') maybeOfferOnboard(id, { id }); }
globalThis.__doors = { url: gameDoorUrl, open: openGameDoor };
// ---- onboarding tour + wayfinding (src/guide.js, src/guideui.js) ----
const guide = createGuide({ state: () => state, mode: () => mode, toast: (m, k) => toast(m, k), panelOpen: () => !!panel, persist: () => persist(), miniBase: () => miniBase,
  wallet: () => state?.walletAddr, saveProfile: () => { if (state && hasCustomLook(state)) saveProfile(state); },
  walk: (path) => { Object.assign(player.pw, { pts: path.slice(), goal: path[path.length - 1] || null, run: false, stuckT: 0, lastD: Infinity, replans: 0 }); player.path = player.pw.pts; player.target = null; player.npcT = null; player.clickMark = null; }, stopWalk: () => stopWalk(),
  openQuests: () => openPanel('onboard') });
globalThis.__guide = guide;
const onboardUi = createOnboardUi({
  state: () => state, toast: (msg, k) => toast(msg, k), persist: () => persist(), hud: () => hud(),
  saveProfile: () => { if (state && hasCustomLook(state)) saveProfile(state); },
  setGuide: (p) => guide.setGuide(p), closePanel: () => closePanel(),
});
globalThis.__onboard = onboardUi;
/** Mark place engaged (verified use/act/claim). act/claim auto-complete; use-places need Got it after engagement. Idempotent. */
function onboardEngage(place, kind = null) {
  if (!state || !place) return null;
  const q = OB.questByPlace(place);
  if (!q || OB.isPlaceDone(state, place)) return null;
  const k = kind || q.need || 'use';
  const m = OB.markEngaged(state, place, k);
  if (!m.ok) return m;
  // Café / plot claim: the real action is the proof — pay immediately (idempotent).
  if (q.need === 'act' || q.need === 'claim') {
    const r = OB.completePlace(state, place);
    if (r.ok) onboardUi.celebrate(r);
    return r;
  }
  // use-places: engagement only; Got it on the learn card claims (never from Quests list alone).
  persist();
  if (onboardUi.open && onboardUi.pending?.place === place) onboardUi.show(q); // refresh Claim button
  else setTimeout(() => onboardUi.offer(place), 200);
  return m;
}
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
  PAB.simReadout(body); // Paw Audit Bureau: small sim-only side-currency readout (not money)
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
function toggleEmotes() { $('#emotes').hidden = true; wheel.toggle(); }
// ---- Round 3: sit / lie down / dances / wave / wag / sleep / bow (src/actions.js), picked from the action wheel ----
const ACT = makeActor(), ACT_KEYS = ['sit', 'lie', 'dance', 'dance2', 'dance3', 'wave', 'wag', 'sleep', 'bow'];
const wheel = mountWheel(document, { onAction: (k) => doAction(k), onBubble: (k) => { if (state && (mode === 'world' || mode === 'room')) doEmote(k); }, current: () => (ACT.act && !ACT.act.auto ? ACT.act.kind : null) });
function doAction(kind) { if (!state || !isAction(kind) || drive || (mode !== 'world' && mode !== 'room')) return;
  if (mode === 'room') RP.stop(); else stopWalk(); player.v = { x: 0, y: 0 }; player.moving = false; ACT.still = 0;
  const a = startAction(ACT, kind, time); blip(a ? 820 : 520); if (a && kind === 'wave') emoteBubble('me', 'wave', time); }
const poseFor = (a) => (a?.act ? poseAt(a.act.kind, time - a.act.t0, a.face) : null);
$('#emotes').onclick = (e) => { const b = e.target.closest('[data-emote]'); if (b) doEmote(b.dataset.emote); };
function toggleMute() { setMuted(!isMuted()); $('#btn-mute').textContent = isMuted() ? 'Sound off' : 'Sound on'; }
function togglePhoto() { photo = !photo; document.body.classList.toggle('photo', photo); if (photo) { const a = document.querySelector('#photo-share'); if (a) a.href = F5.shareXUrl('Snap from Inu Verse'); } }
$('#btn-mute').onclick = () => { initAudio(); toggleMute(); };
$('#btn-emote').onclick = () => toggleEmotes(); $('#btn-emote').textContent = 'Actions'; $('#btn-emote').title = 'Sit, dance, wave… (G)';
document.addEventListener('pointerdown', () => { ACT.still = 0; }, true);
$('#btn-photo').onclick = () => togglePhoto();
$('#btn-engage').onclick = () => { initAudio(); uiClick?.(); openPanel('engage'); };
{ const sc = $('#streak-chip'), go = () => { initAudio(); uiClick?.(); openPanel('fly5', { tab: 'streak' }); }; sc.onclick = go; sc.onkeydown = (e) => { if (e.key === 'Enter' || e.key === ' ') go(); }; }
$('#btn-pools').onclick = () => { initAudio(); uiClick?.(); openPanel('city', { tab: 'pools' }); };
$('#photo-save').onclick = () => { const tmp = document.createElement('canvas'); tmp.width = cv.width; tmp.height = cv.height; const tx = tmp.getContext('2d'); tx.drawImage(cv, 0, 0); F5.watermarkPhoto(tx, tmp.width, tmp.height); const a = document.createElement('a'); a.download = `inu-verse-${Date.now()}.png`; a.href = tmp.toDataURL('image/png'); a.click(); F5.submitPhoto(state, Math.floor(gameDay() / 7), { caption: 'Inu Verse snap' }); toast('Photo saved + entered this week\'s board', 'good'); };
$('#photo-exit').onclick = () => togglePhoto();
$('#btn-phantom').onclick = async () => { initAudio(); if (DEMO) return toast('Demo mode: fake KIBBLE, no wallet. Remove ?demo=1 to use Phantom.', ''); if (!K.kp) return toast('Wallet service is offline right now. Try again soon.', 'bad');
  try { const a = await wallet().connect(); if (state) { state.walletAddr = a; if (hasCustomLook(state)) await saveProfile(state); persist(); hud(); tourCheck(); refreshPlotOwners(); } toast(`Signed in ${a.slice(0, 4)}…${a.slice(-4)}${K.mode === 'live' ? '' : ' · ' + SOON}`, 'good'); } catch (e) { toast(e.message || 'Phantom sign-in failed', 'bad'); } };
$('#btn-help').onclick = () => openPanel('help');
$('#btn-guide').onclick = () => guide?.startTour(true);
$('#btn-quests').onclick = () => { initAudio(); uiClick?.(); openPanel('onboard'); };
$('#btn-pack').onclick = () => { if (mode === 'world') openPanel('packs'); };
$('#btn-wardrobe').onclick = () => { if (mode === 'world') openPanel('wardrobe'); };
$('#btn-garage').onclick = () => { if (mode === 'world') openPanel('garage'); };
$('#btn-companion').onclick = () => { if (mode === 'world') openPanel('companions'); };
$('#panel-close').onclick = () => closePanel();
// ---- touch controls (virtual stick on the left, A/B + menu on the right) ----
{ const pad = $('#stick'), knob = $('#knob');
  const upd = (e) => { const r = pad.getBoundingClientRect(), cx = r.left + r.width / 2, cy = r.top + r.height / 2, R = r.width / 2; let dx = e.clientX - cx, dy = e.clientY - cy; const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; }
    knob.style.transform = `translate(${dx}px,${dy}px)`; const m = Math.hypot(dx, dy) / R; touch.mag = m; if (m < 0.22) { touch.x = touch.y = 0; return; } touch.x = dx / (m * R); touch.y = dy / (m * R);
    if (Math.abs(touch.x) < 0.38) touch.x = 0; if (Math.abs(touch.y) < 0.38) touch.y = 0; };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); touch.id = e.pointerId; pad.setPointerCapture(e.pointerId); pad.classList.add('on'); player.holdRun = stickTap(performance.now()); upd(e); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === touch.id) upd(e); });
  const end = (e) => { if (e.pointerId !== touch.id) return; touch.id = null; touch.x = touch.y = 0; touch.mag = 0; player.holdRun = false; knob.style.transform = ''; pad.classList.remove('on'); };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  const act = () => { globalThis.__actCount = (globalThis.__actCount || 0) + 1; if (feel.talking()) return feel.advance(); if (mode === 'room' && !panel) return RP.act(); if (mode !== 'world' || panel || !state) return; if (carAction()) return; const it = nearestInteractable(state, state.player.x, state.player.y); const pup = nearPup(); if (pup && !it) petPup(pup); else if (it) interact(it); };
  $('#btn-a').addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); act(); });
  $('#btn-b').addEventListener('pointerdown', (e) => { e.preventDefault(); initAudio(); if (mode === 'world' && !panel && state) { if (drive) return honk(); bork(); player.emote = { kind: 'bork', t: 1.2 }; emoteBubble('me', 'bork', time); } });
  $('#btn-menu')?.addEventListener('pointerdown', (e) => { e.preventDefault(); });
  // optional Joystick controls (Settings): same touch input + A/B handlers; OFF = the old controls exactly as before
  JOYS = createJoystick({ touch, onA: act, onStart: initAudio, runTap: () => stickTap(performance.now()), setRun: (v) => { player.holdRun = v; },
    onB: () => { if (mode === 'world' && !panel && state) { if (drive) return honk(); bork(); player.emote = { kind: 'bork', t: 1.2 }; emoteBubble('me', 'bork', time); } } });
}

// ---------------- World update ----------------
function updateWorld(dt) {
  const p = state.player; let dx = 0, dy = 0;
  if (!panel) {
    if (keys.has('w') || keys.has('arrowup')) dy -= 1; if (keys.has('s') || keys.has('arrowdown')) dy += 1;
    if (keys.has('a') || keys.has('arrowleft')) dx -= 1; if (keys.has('d') || keys.has('arrowright')) dx += 1;
  }
  const sx0 = !panel ? touch.x : 0, sy0 = !panel ? touch.y : 0;
  const inp = MOB.pickInput({ keys: { x: dx, y: dy }, stick: { x: sx0, y: sy0 }, stickMag: touch.mag || 0, shift: keys.has('shift'), holdRun: player.holdRun, path: player.pw.pts.length > 0, pathRun: player.pw.run });
  if (inp.source === 'stick' || inp.source === 'keys') { dx = inp.dir.x; dy = inp.dir.y; } else { dx = dy = 0; }
  const speed = MOB.WALK_SPEED * PAB.walkFactor(); // world px/s (world is zoomed 2x, so ~184 screen px/s); run = x1.75. walkFactor: 1, or >= 0.85 for <= 60 s while an opted-in sim cartoon bump is on (src/sim/clinic.js)
  if (drive) { stopWalk(); const m = CAR_MODELS[drive.car.model], top = m.speed, l = Math.hypot(dx, dy);
    if (l) { drive.v = Math.min(top, drive.v + 260 * dt); drive.vx = dx / l; drive.vy = dy / l; drive.dir = Math.abs(dx) >= Math.abs(dy) ? (dx > 0 ? 'east' : 'west') : (dy > 0 ? 'south' : 'north'); } else drive.v = Math.max(0, drive.v - 320 * dt);
    if (drive.v > 0) { const bx = p.x, by = p.y; moveBody(p, drive.vx * drive.v * dt, drive.vy * drive.v * dt, 14); if (Math.hypot(p.x - bx, p.y - by) < drive.v * dt * 0.3 && l) { drive.v *= 0.3; if (drive.bump <= 0) { blip(180); drive.bump = 0.4; } } }
    drive.bump = (drive.bump || 0) - dt; player.moving = false; player.face = { east: 'right', west: 'left', south: 'down', north: 'up' }[drive.dir]; dx = dy = 0; }
  if (!drive) {
    if (inp.cancelPath && player.pw.pts.length) { player.pw.pts = []; player.path = player.pw.pts; player.target = null; player.npcT = null; player.clickMark = null; }
    const top = speed * (inp.run ? MOB.RUN_MULT : 1); let want = { x: dx * top, y: dy * top }, snap = null;
    if (inp.source === 'path') { const f = MOB.followStep(player.pw, p, top, dt, TILE);
      if (f?.stuck && player.pw.goal && player.pw.replans++ < 3) planTo(player.pw.goal, { target: player.target, npcT: player.npcT, run: player.pw.run, mark: false });
      else if (f?.stuck) { player.pw.pts = []; player.clickMark = null; }
      if (f) { want = f.want; snap = f.snap; if (f.arrive) { player.v = { x: 0, y: 0 }; if (snap) { const bx = snap.x - p.x, by = snap.y - p.y; moveBody(p, bx, by); } arrive(); } } player.path = player.pw.pts; }
    player.push = { x: want.x, y: want.y }; // intent (keys / stick / sprint / tap-walk path) even when a wall stops the body: doors use it
    player.v = MOB.stepVelocity(player.v, want, dt);
    if (player.v.x || player.v.y) { const bx = p.x, by = p.y; moveBody(p, player.v.x * dt, player.v.y * dt); // wall: kill the blocked axis so speed never builds up against it (path mode re-plans instead)
      if (inp.source !== 'path') { if (Math.abs(p.x - bx) < 1e-4) player.v.x = 0; if (Math.abs(p.y - by) < 1e-4) player.v.y = 0; } }
    const sp = Math.hypot(player.v.x, player.v.y); player.moving = sp > 12; player.running = inp.run && sp > speed * 1.1;
    if (sp > 12) { if (Math.abs(player.v.x) > 1) player.dir = player.v.x > 0 ? 1 : -1; player.face = MOB.faceOf(player.v.x, player.v.y, player.face); }
    if (player.running) { dustAcc += dt; if (dustAcc > 0.11) { dustAcc = 0; feel.dust(p.x - player.dir * 6, p.y + 11); } }
  }
  if (player.moving) player.phase += dt * (player.running ? 21 : 12) * Math.min(1, Math.hypot(player.v.x, player.v.y) / speed + 0.25); else player.phase += dt * 2;
  { const nowH = ((time + dayOffset) / DAY_LEN) * 24;
    if (PRES_Q && !presForced) { presForced = true; startVisit(pres, PRES_KINDS.includes(PRES_Q) ? PRES_Q : null, { dayLen: DAY_LEN }); }
    updatePresident(pres, dt, { nowH, dayLen: DAY_LEN, npcs, rng, toast: (s) => toast(s, 'good'), banner: presBanner, fanfare, snack: () => toast('President Inu bought a taiyaki from the snack cart!', 'good') }); }
  adT += dt; if (adT > 8 || !trend.length) { adT = 0; adRot++; trend = RC.realTrend(REG.coins, 6, VF.trendTag); if (adRot % 8 === 1) refreshRegistry(); }
  farmTick(dt); if (state.bones < 0) state.bones = 0;
  stepCrew(crew, dt, dayPhase(time + dayOffset).hour, () => { adIdx++; });
  stepScene(dt); stepConfetti(dt); stepPups(dt);
  { const h = Math.floor(dayPhase(time + dayOffset).hour), pOn = pres.on && pres.stage !== 'away', replan = pOn !== presWas; presWas = pOn; if (state.town && (h !== townH || replan)) { const fresh = h !== townH; townH = h; for (const e of townHour(state.town, { rng, hour: h, day: gameDay(), president: pOn ? pres : null, replan: !fresh })) {
      if (e.kind === 'shopClosed' || e.kind === 'shopOpened' || e.kind === 'job' || e.kind === 'friends' || e.kind === 'rivals') toast(state.town.log[0]?.text || '', ''); } } }
  if (time - sydAt > 1 || time < sydAt) { sydAt = time; sydMin = sydneyNow(); }
  for (const n of npcs) { const tf = state.town?.folk[n.name], round = n.name === 'Taro' ? breadRound(sydMin) : null; if (tf) tf.round = round; n.bread = !!round?.carrying; if (state.spouse?.name === n.name && !scene) { const H = state.spouse.helps === 'biz' && state.biz?.mine ? LOTS_POS[state.biz.mine.lot] : [17.5, 92.6]; if (H && Math.hypot(n.x - H[0] * TILE, n.y - H[1] * TILE) > 64) { n.x = H[0] * TILE; n.y = H[1] * TILE; n.path = []; } n.wait = Math.max(n.wait || 0, 1); }
    if (n.held > 0) { n.held -= dt; n.moving = false; continue; } // tapped by the player: wait for them to walk up
    if (amb.ball?.dog === n && amb.ball.state !== 'air') continue; if (n.wag > 0) { n.wag -= dt; n.moving = true; n.phase += dt * 20; continue; } if (n.emote) { n.emote.t -= dt; if (n.emote.t <= 0) n.emote = null; } const arr = updateNpc(n, dt, rng, scene || state.spouse?.name === n.name ? null : (MWd.huddleGoal(MWd.MW.mood, npcs.indexOf(n)) || round?.goal || tf?.goal)); if (tf) { if (arr && !tf.arrived && tf.act !== 'nap' && rng() < 0.3) n.emote = { kind: tf.mood === 'grumpy' ? 'angry' : tf.mood === 'happy' ? 'happy' : 'note', t: 1.6 }; tf.arrived = arr; } }
  { const pet = activePet(state); if (pet && !drive) { if (!petF.id || petF.id !== pet.id) Object.assign(petF, { id: pet.id, x: p.x - 20, y: p.y + 4 }); followStep(petF, p.x - player.dir * 22, p.y + 2, dt); if (petF.love > 0) petF.love -= dt; } else if (drive) Object.assign(petF, { x: p.x, y: p.y }); }
  if (honkT > 0) honkT -= dt;
  if (player.emote) { player.emote.t -= dt; if (player.emote.kind === 'zoomies') { const a = player.emote.t * 5; moveBody(p, Math.cos(a) * 150 * dt, Math.sin(a) * 150 * dt); player.moving = true; player.phase += dt * 20; player.face = Math.cos(a + 1.57) > 0 ? 'right' : 'left'; } if (player.emote.t <= 0) player.emote = null; }
  stepActor(ACT, dt, time, { moving: player.moving || !!drive, busy: !!panel || !!scene });
  { const vw = innerWidth / ZOOM, vh = innerHeight / ZOOM; stepAlive(ALIVE, dt, { x0: cam.x - vw / 2, y0: cam.y - vh / 2, x1: cam.x + vw / 2, y1: cam.y + vh / 2 }, Math.random, player.running && !drive ? p : null); }
  for (const e of stepAmbient(amb, dt, p, npcs, { running: player.running && !drive, hour: dayPhase(time + dayOffset).hour, dark: dayPhase(time + dayOffset).dark })) { if (e.kind === 'flush') chirp(); if (e.kind === 'fetched') toast(`${e.who} brought the ball back!`, 'good'); }
  { const c = myCompanion(), F = CMP.F; if (!c) F.c = null; else { if (F.c?.id !== c.id || F.c?.form?.id !== c.form?.id) { if (!F.c) IQC.resetFollower(F, p, c); else F.c = c; }
      IQC.stepFollow(F, p, dt, { rm: reducedMotion(), back: activePet(state) ? 56 : 30 }); /* walks behind the Verse pet when both are out */ const ph = dayPhase(time + dayOffset); IQC.react(F, IQC.envFor(F, { rain: amb.rain, dark: ph.dark, others: [...CMP.remotes.values()] })); } }
  if (rng() < dt * 0.08) chirp();
  if (player.moving) { stepAcc += dt; if (stepAcc > 0.26) { stepAcc = 0; const tt = MAP[Math.floor(p.y / TILE)]?.[Math.floor(p.x / TILE)]; if (tt === T.GRASS || tt === T.FLOWER) { feel.rustle(p.x, p.y + 10); rustle(); } else { feel.dust(p.x, p.y + 11); footstep(); } } }
  feel.step(dt); document.body.classList.toggle('driving', !!drive); moodTick(dt);
  if (mode === 'world' && !panel && !drive && !entering && !arcadeOpen) { doorAcc -= dt; if (doorAcc <= 0) { doorAcc = 1; doorsNow = [...doorList(state).filter((d) => d.kind !== 'plot' || state.plots[d.id]), ...interactables(state).filter((i) => WALK_IN_SPOTS.has(i.id))]; }
    const ds = player.pw.pts.length ? (player.target && (isWalkDoor(player.target) || WALK_IN_SPOTS.has(player.target.id)) ? doorsNow.filter((q) => q.id === player.target.id && q.kind === player.target.kind) : []) : doorsNow; // tap-walking only enters the door you tapped
    const d = doorStep(doorSt, { x: p.x, y: p.y, face: player.face, moving: player.moving, push: drive ? null : player.push }, ds, time, doorsNow); if (d) enterDoor(d);
    else if (!player.pw.pts.length) { const g = portalStep(gateSt, null, { x: p.x, y: p.y, face: player.face, moving: player.moving, push: player.push }, time, GATE_EXITS); if (g) enterGate(g.gate); } }
  { const vw = innerWidth / ZOOM, vh = innerHeight / ZOOM; stepChat({ now: time, player: p, npcs, hour: dayPhase(time + dayOffset).hour, rain: amb.rain > 0.3, rng, moodLine: (n) => rng() < 0.5 ? MWd.moodLine(n.name, rng) : null, inView: (x, y) => Math.abs(x - cam.x) < vw / 2 - 20 && Math.abs(y - cam.y) < vh / 2 - 30, placeOf: chatPlace }); }
  PAB.simTick(dt, time, { x: p.x, y: p.y, driving: !!drive, busy: !!panel }, (tx, ty) => (isSolid(tx, ty) ? -1 : MAP[ty][tx]), T); // sim police/rangers: reads a copy of the position only, never blocks play
  mailAcc += dt; if (mailAcc > 45) { mailAcc = 0; if (rng() < 0.6 && addMail(state, rng)) { toast('New note in your mailbox!', 'good'); persist(); } }
  // smooth camera
  const k = 1 - Math.pow(0.004, dt), lead = player.moving ? 10 : 0, fx = { left: -1, right: 1 }[player.face] || 0, fy = { up: -1, down: 1 }[player.face] || 0;
  guide.update(dt); onboardUi.drawNpc(dt); const tc = guide.camTarget(), kk = tc ? 1 - Math.pow(0.02, dt) : k;
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
  else if (it) { pr.hidden = false; const verb = { community: 'Open', gamedoor: 'Play', bank: 'Enter', arcade: 'Play at', matchmaker: 'Browse', square: 'Open', building: 'Enter', plot: state.plots[it.id] ? 'Enter' : 'Inspect', visit: 'Visit', stall: 'View', clubhouse: myPack(state) ? 'Decorate' : 'Open', mall: 'Enter', field: 'Tend', farm: 'Use', lot: 'Visit', biz: 'Read', chapel: 'Enter', kibble: it.id === 'crier' ? 'Talk to' : it.id === 'kstatue' ? 'Look at' : 'Read' }[it.kind] || 'Use'; pr.innerHTML = isWalkDoor(it) ? `<kbd>${it.side === 'left' ? '▶' : it.side === 'right' ? '◀' : '▲'}</kbd>Walk in to ${verb === 'Enter' ? 'enter' : verb.toLowerCase()} ${esc(it.name)}` : `<kbd${tch ? ' class="ta"' : ''}>${tch ? 'A' : 'E'}</kbd>${verb} ${esc(it.name)}`; pr.dataset.target = it.id; setA(isWalkDoor(it) ? '' : verb.toUpperCase()); }
  else { pr.hidden = true; setA(''); }
}

let snapPx = (v) => Math.round(v * 2) / 2;
function drawMark(ctx, m, time) { const  X = Math.round(m.x), Y = Math.round(m.y + 8), k = 7 + Math.round((Math.sin(time * 7) + 1) * 1.5), col = m.npc ? '#ff9ac0' : '#f2cc68'; // destination marker: pixel ring + bobbing arrow
    ctx.fillStyle = '#141a2e'; ctx.fillRect(X - k - 1, Y - 3, 2 * k + 2, 6); ctx.fillRect(X - k + 2, Y - 5, 2 * k - 4, 10); ctx.fillStyle = col; ctx.fillRect(X - k, Y - 2, 2 * k, 4); ctx.fillRect(X - k + 3, Y - 4, 2 * k - 6, 8); ctx.fillStyle = '#141a2e'; ctx.fillRect(X - k + 3, Y - 1, 2 * k - 6, 2); ctx.fillRect(X - k + 5, Y - 2, 2 * k - 10, 4);
    const ay = Y - 22 + Math.round(Math.sin(time * 6) * 2); ctx.fillStyle = '#141a2e'; ctx.fillRect(X - 5, ay - 1, 10, 5); ctx.fillRect(X - 3, ay + 4, 6, 2); ctx.fillRect(X - 1, ay + 6, 2, 2); ctx.fillStyle = col; ctx.fillRect(X - 4, ay, 8, 3); ctx.fillRect(X - 2, ay + 3, 4, 2); }
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
  const dyn = [...HUB_GATES.map((g) => hubGateProp(g, time)), hubSignProp(62, 58, time), ...dynamicProps(state, time, myPack(state)), ...presidentProps(pres, time), ...doorProps(time), ...carWorldProps(), ...crewProps(), ...adProps(trend, adRot, adIdx, !!globalThis.__inuNight, time, featuredMap()), ...confettiProps(), ...squareProps(state, time, Math.floor(gameDay() / 7)), ...arcadeProps(time, arcadeTop), ...MWd.statueProps(time, { drawShiba, artLoaded: () => !!ART['shiba-golden'] }), ...MWd.newsProps(time), ...KN.wallProps(KIBBLE_PLAZA.wall, KEN.wall, time, TILE), ...RD.gateProps(KIBBLE_PLAZA.raid, time, TILE), ...MWd.firepitProps(time), ...MWd.plazaSkyProps(time), ...PAB.bureauProps(time, { drawShiba }, state.player)];
  for (const d of dyn) if (d.flat) d.d(ctx);
  const view = { x0: -ox, y0: -oy, x1: -ox + vw, y1: -oy + vh };
  drawGroundLife(ctx, amb, phase, view); drawAliveGround(ctx, ALIVE, view, phase); feel.drawGround(ctx);
  if (player.clickMark && player.pw.pts.length) drawMark(ctx, player.clickMark, time);
  const actors = [MWd.crierActor(time, artKey), ...npcs.map((n, i) => ({ ...n, npc: true, idx: i, badge: badgeOf(packOfName(state, n.name)) })), ...(drive ? [] : [{ x: state.player.x, y: state.player.y, coat: state.player.coat, outfit: state.wardrobe.equipped, face: player.face, phase: player.phase, moving: player.moving, name: state.player.name, me: true, badge: badgeOf(myPack(state)), emote: player.emote, act: ACT.act, art: artKey(state.player.coat, state.wardrobe.equipped), profile: hasCustomLook(state) ? myProfile() : null }]), ...streetPups(), ...presActors(), ...petActors(), ...crewActors(), ...pupActors(), ...MPL.actors(view, state.player), ...dogWalkActors(view, walkNow(), artKey), ...mascotActors(state, time)];
  // one depth-sorted list: static props (culled), dynamic props and actors, by ground y
  const L = -ox - 200, Rt = -ox + vw + 200, Tp = -oy - 60, Bt = -oy + vh + 400, list = [];
  for (const p of mapImg.props) if (p.y > Tp && p.y < Bt) list.push(p);
  for (const p of dyn) if (!p.flat) list.push(p);
  for (const p of carProps(amb)) list.push(p);
  { const now = performance.now() / 1000, fdt = Math.min(0.1, Math.max(0, now - (CMP.lastT || now))); CMP.lastT = now; const rm = reducedMotion();
    IQC.stepRemotes(CMP.remotes, actors, fdt, { rm }); for (const F of CMP.remotes.values()) IQC.react(F, IQC.envFor(F, { rain: amb.rain, dark: phase.dark, others: [CMP.F, ...CMP.remotes.values()] }));
    for (const F of [CMP.F, ...CMP.remotes.values()]) if (F.c && F.x > L && F.x < Rt && F.y > Tp && F.y < Bt) list.push({ y: F.y + 2, d: (c) => IQC.drawFollower(c, F, time, { rm, fallback: IQC.drawFallbackPup }) }); }
  for (const p of catProps(amb, view)) list.push(p); for (const p of leashProps(view, walkNow())) list.push(p);
  for (const a of actors) if (a.x > L && a.x < Rt && a.y > Tp && a.y < Bt) list.push({ y: a.y + 6, a });
  list.sort((p, q) => p.y - q.y);
  for (const it of list) {
    if (!it.a) { it.d(ctx); continue; }
    const a = it.a;
    if (a.statue) { ctx.fillStyle = '#6a6080'; ctx.fillRect(Math.round(a.x - 34), Math.round(a.y - 4), 68, 18); ctx.fillStyle = '#d4a640'; ctx.fillRect(Math.round(a.x - 38), Math.round(a.y - 8), 76, 5); ctx.fillStyle = '#121a36'; ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = 'center'; ctx.fillText('PRESIDENT INU', Math.round(a.x), Math.round(a.y + 8)); ctx.save(); ctx.filter = 'sepia(1) saturate(2.6) brightness(1.05)'; drawShiba(ctx, a.x, a.y - 10, { art: a.art, scale: 1.5, shadow: false }); ctx.restore(); continue; }
    const mm = a.npc && !a.crier ? MWd.npcMood(MWd.MW.mood, a, time, a.idx || 0) : null;
    ctx.save(); ctx.translate(snapPx(a.x), snapPx(a.y - (mm?.hop || 0))); ctx.scale(0.5, 0.5);
    if (a.me) { ctx.fillStyle = 'rgba(242,204,104,0.45)'; ctx.fillRect(-20, 9, 40, 4); ctx.fillRect(-14, 7, 28, 8); }
    if (a.petSpecies) { drawPetActor(ctx, a); ctx.restore(); continue; }
    if (a.president) { drawPresident(ctx, a); if (a.emote) drawEmote(ctx, 0, -14, a.emote.kind, time); ctx.restore(); continue; }
    if (a.pupScale) { if (a.customPup) drawProfileShiba(ctx, 0, 0, a.profile, { face: a.face, phase: a.phase, moving: a.moving, name: a.name, scale: a.pupScale, fid: a.name }); else { drawShiba(ctx, 0, 0, { coat: a.coat, outfit: a.outfit, face: a.face, phase: a.phase, moving: a.moving, name: a.name, scale: a.pupScale, art: a.art, fid: a.name, wag: a.wag }); ctx.fillStyle = a.pupPatch; ctx.fillRect(-7 * a.pupScale, -30 * a.pupScale, 14 * a.pupScale, 4 * a.pupScale); ctx.fillStyle = a.pupHex; ctx.fillRect(-7 * a.pupScale, -26 * a.pupScale, 14 * a.pupScale, 3 * a.pupScale); } ctx.restore(); continue; }
    if (a.me) { const gl = statusGlow(state); if (gl) drawFlair(ctx, gl, time); }
    const kt = a.me ? kennelMine() : a.mp ? KN.remoteLook(a) : null; if (kt) { KN.drawAura(ctx, kt.tier, time); KENNEL_TAG.cur = KN.tagFor(kt.tier, kt.preview, kt.flair); }
    const pz = poseFor(a);
    if (a.profile) { drawProfileShiba(ctx, 0, 0, a.profile, { face: a.face, phase: a.phase, moving: a.moving, name: a.name, scale: 1.5, badge: a.badge, fid: a.me ? 'me' : a.name, emote: a.emote?.kind, pose: pz }); if (a.emote) drawEmote(ctx, 0, -110, a.emote.kind, time); }
    else drawShiba(ctx, 0, 0, { coat: a.coat, outfit: a.outfit, face: a.face, phase: a.phase, moving: a.moving, name: a.name, scale: 1.5, badge: a.badge, art: a.art, emote: a.emote?.kind, fid: a.me ? 'me' : a.name || a.id, wag: a.wag || (mm?.wag ? 1 : 0), pose: pz });
    if (a.onboardMascot) drawMascotTag(ctx, a);
    if (pz) drawPoseFx(ctx, pz, 0, 0, 1.5, time, pz.face);
    KENNEL_TAG.cur = null; if (a.me && LS.wornPin(state) != null) drawWornPin(ctx, LS.wornPin(state), time);
    if (a.worker) { drawVest(ctx, a.face); drawTool(ctx, a.worker); }
    if (a.bread) drawBreadBasket(ctx, a.face);
    if (mm?.umbrella) MWd.drawUmbrella(ctx, time, a.idx || 0); else if (mm?.zz && !a.emote) MWd.drawZz(ctx, time + (a.idx || 0)); if (a.crier) MWd.drawBell(ctx, time, crierRing > 0);
    if (a.emote) drawEmote(ctx, 0, a.name ? -14 : 0, a.emote.kind, time); ctx.restore();
  }
  feel.drawAir(ctx);
  drawChat(ctx, (id) => { if (id === MWd.CRIER_NAME) { const ca = MWd.crierActor(time, artKey); return { x: ca.x, y: ca.y - 62 }; } if (id === 'me') return drive ? null : { x: state.player.x, y: state.player.y - 60 }; const n = npcs.find((q) => q.name === id); return n ? { x: n.x, y: n.y - (n.pupScale ? 40 * n.pupScale + 10 : 60) - (n.badge || packOfName(state, n.name) ? 8 : 0) } : MPL.anchor(id); }, time);
  drawSkyLife(ctx, amb, phase, view); drawAliveSky(ctx, ALIVE, view, phase);
  const it = !panel && nearestInteractable(state, state.player.x, state.player.y); if (it) feel.bubble(ctx, (it.tx + 0.5) * TILE, (it.ty) * TILE - 6, time);
  guide.drawWorld(ctx, time, state.player);
  ctx.restore();
  drawAtmosphere(ctx, amb, phase, { x: vw / 2 - ox, y: vh / 2 - oy }, vw, vh, () => lightsFor(state, phase, homeId()));
  $('#clock').textContent = `${String(Math.floor(phase.hour)).padStart(2, '0')}:${String(Math.floor((phase.hour % 1) * 60)).padStart(2, '0')} ${amb.rain > 0.3 ? 'rain' : phase.label} · ${seasonOf(gameDay())}`;
  if (!vignette || vignette.width !== SW || vignette.height !== SH) { vignette = document.createElement('canvas'); vignette.width = SW; vignette.height = SH; const v = vignette.getContext('2d'), g = v.createRadialGradient(SW / 2, SH / 2, SH * 0.45, SW / 2, SH / 2, SH * 1.05); g.addColorStop(0, 'rgba(18,26,54,0)'); g.addColorStop(1, 'rgba(12,16,34,0.38)'); v.fillStyle = g; v.fillRect(0, 0, SW, SH); }
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0); MWd.drawWeather(ctx, time, SW, SH, { reduced: reducedMotion() }); ctx.drawImage(vignette, 0, 0);
  minimap(-ox, -oy, vw, vh);
  guide.drawScreen(ctx, ox, oy, ZOOM, time, PAB.signRects()); // the off-screen pointer label steers clear of the sim buildings' signs
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

// Arcade Districts on the town map: purple road stub + gate block at the hub gate east of the Arcade hall (minimap + full map)
function drawDistrictsMark(b, s) { const g = DIS.HUB_GATE; b.fillStyle = '#141a2e'; b.fillRect((g.tx - 1) * s - 1, (g.ty - 1) * s - 1, 3 * s + 2, 3 * s + 2); b.fillStyle = '#6c4fd0'; b.fillRect((g.tx - 1) * s, (g.ty - 1) * s, 3 * s, 3 * s); b.fillStyle = '#ff5ad0'; b.fillRect(g.tx * s, g.ty * s, s, s); }
function minimap(vx, vy, vw, vh) {
  const m = $('#minimap').getContext('2d'), s = 2;
  if (!miniBase) { miniBase = document.createElement('canvas'); miniBase.width = MAP_W * s; miniBase.height = MAP_H * s; const b = miniBase.getContext('2d');
    const col = { [T.GRASS]: '#52a349', [T.FLOWER]: '#62b05a', [T.ROAD]: '#4a4f63', [T.WALK]: '#dcd3bc', [T.PLAZA]: '#d6b383', [T.BUILDING]: '#e3b341', [T.WATER]: '#2f6cbd', [T.TREE]: '#2c7040', [T.PLOT]: '#a8764a', [T.HOME]: '#c8323c', [T.DIRT]: '#a8764a' };
    for (let y = 0; y < MAP_H; y++) for (let x = 0; x < MAP_W; x++) { b.fillStyle = col[MAP[y][x]]; b.fillRect(x * s, y * s, s, s); } drawDistrictsMark(b, s); }
  m.drawImage(miniBase, 0, 0);
  for (const p of PLOTS) if (state.plots[p.id]) { m.fillStyle = '#f2cc68'; m.fillRect(p.x * s, p.y * s, p.w * s, p.h * s); }
  { const pk = myPack(state); m.fillStyle = pk ? pk.color : '#6a8a4a'; m.fillRect(CLUBHOUSE.x * s, CLUBHOUSE.y * s, CLUBHOUSE.w * s, CLUBHOUSE.h * s); }
  if (vw) { m.strokeStyle = 'rgba(255,246,224,.85)'; m.lineWidth = 1; m.strokeRect(Math.round(vx / TILE * s) + 0.5, Math.round(vy / TILE * s) + 0.5, Math.round(vw / TILE * s), Math.round(vh / TILE * s)); }
  { const g = DIS.HUB_GATE, on = reducedMotion() || Math.floor(time * 2) % 2; m.fillStyle = on ? '#ff5ad0' : '#ffd84a'; m.fillRect(g.tx * s + 1, g.ty * s - 2, 1, 6); m.fillRect(g.tx * s + 2, g.ty * s - 1, 1, 4); m.fillRect(g.tx * s + 3, g.ty * s, 1, 2); } // districts gate: east arrow
  m.fillStyle = '#fff'; for (const n of npcs) m.fillRect(Math.round(n.x / TILE * s) - 1, Math.round(n.y / TILE * s) - 1, 2, 2);
  const blink = Math.floor(time * 3) % 2; m.fillStyle = '#141a2e'; m.fillRect(Math.round(state.player.x / TILE * s) - 3, Math.round(state.player.y / TILE * s) - 3, 6, 6); m.fillStyle = blink ? '#ff5a5a' : '#ffd84a'; m.fillRect(Math.round(state.player.x / TILE * s) - 2, Math.round(state.player.y / TILE * s) - 2, 4, 4);
}

// ---------------- Interactions ----------------
{ const _say = feel.say; if (_say) feel.say = (who, line, ...r) => { faceTalk(String(who).split(' (')[0], Math.min(4, 1 + String(line || '').length / 25)); return _say.call(feel, who, line, ...r); }; }
// ---- walk-in doors (src/doors.js): walking into a door enters; A is for talking, signs, shops counters etc. ----
const doorSt = makeDoorState(); let doorAcc = 0, doorsNow = [], entering = null, lastDoor = null;
// A-press spots in front of a wall/building that also open when you walk into them (Raid Gate, Kennel wall, Big Barn, Chapel)
const WALK_IN_SPOTS = new Set(['raidgate', 'kwall', 'barn', 'chapel']);
const isWalkDoor = (it) => isDoor(it) && (it.kind !== 'plot' || !!state.plots[it.id]);
function stopWalk() { player.pw.pts = []; player.path = player.pw.pts; player.target = null; player.npcT = null; player.clickMark = null; }
const doorReady = () => time >= doorSt.until;
// Entering marks the door used (cooldown + must step off the tile), so arriving by tap AND by walking can never double-fire.
// ---- Round 2: rooms & zones (walkable interiors + outdoor zones; see scenes.js / roomplay.js) ----
let roomBuild = null; const gateSt = makePortalState(); const GATE_EXITS = HUB_GATES.map((g) => ({ tiles: [[g.tx, g.ty]], face: g.face, gate: g }));
const roomDoorById = (id) => doorList(state).find((q) => q.id === id) || interactables(state).find((q) => q.id === id);
function drawRoomActor(c, a, snap) {
  c.save(); c.translate(snap(a.x), snap(a.y)); c.scale(0.5, 0.5);
  if (a.me) { const look = hasCustomLook(state) ? myProfile() : null, em = player.emote, pz = poseFor({ act: ACT.act, face: player.face }), mm = pz && CP.on ? CP.meMunch(time) : 0; if (mm) { pz.dy += mm * 1.6; pz.rot += (player.face === 'left' ? -1 : 1) * mm * 0.05; } // eating at your café table
    if (look) { drawProfileShiba(c, 0, 0, look, { face: player.face, phase: player.phase, moving: player.moving, name: state.player.name, scale: 1.5, badge: badgeOf(myPack(state)), fid: 'me', emote: em?.kind, pose: pz }); if (em) drawEmote(c, 0, -110, em.kind, time); }
    else drawShiba(c, 0, 0, { coat: state.player.coat, outfit: state.wardrobe.equipped, face: player.face, phase: player.phase, moving: player.moving, name: state.player.name, scale: 1.5, badge: badgeOf(myPack(state)), art: artKey(state.player.coat, state.wardrobe.equipped), emote: em?.kind, fid: 'me', pose: pz });
    if (pz) drawPoseFx(c, pz, 0, 0, 1.5, time, pz.face); if (em && !look) drawEmote(c, 0, -14, em.kind, time); }
  else if (a.mp) { const pz = poseFor(a); // live players in the same room/zone (Round 3)
    if (a.profile) drawProfileShiba(c, 0, 0, a.profile, { face: a.face, phase: a.phase, moving: a.moving, name: a.name, scale: 1.5, fid: a.name, emote: a.emote?.kind, pose: pz });
    else drawShiba(c, 0, 0, { coat: a.coat, outfit: a.outfit, face: a.face, phase: a.phase, moving: a.moving, name: a.name, scale: 1.5, art: a.art, emote: a.emote?.kind, fid: a.id, pose: pz });
    if (pz) drawPoseFx(c, pz, 0, 0, 1.5, time, pz.face); if (a.emote) drawEmote(c, 0, a.profile ? -110 : -14, a.emote.kind, time); }
  else { drawShiba(c, 0, 0, { coat: a.coat, outfit: a.outfit || {}, face: a.face, phase: a.phase, moving: a.moving, name: a.name, scale: 1.5, art: artKey(a.coat, a.outfit || {}), fid: a.name, wag: !a.moving, pose: a.pose || null }); if (a.emote) drawEmote(c, 0, -14, a.emote.kind, time); }
  c.restore(); }
// ---- Shiba Sips Café, customer side (diner.js + cafeplay.js): menu, table service, seated diners. Fun only: Bones + memory. ----
const CP = makeCafePlay({ sc: () => RP.sc, R: () => RP.R, solid: (x, y) => sceneSolid(RP.sc, x, y), time: () => time, town: () => state?.town, coatOf: (n) => npcByName(n)?.coat || 'tan',
  near: (n, r) => Math.hypot(n.x - RP.R.p.x, n.y - RP.R.p.y) < r, chat: (id, t) => chatSay(id, t, time), atSeat: (s) => !!s && Math.hypot(RP.R.p.x - (s.tx + 0.5) * 32, RP.R.p.y - (s.ty + 0.5) * 32) < 18,
  sfx: (k) => { if (mode !== 'room' || RP.id !== 'cafe') return; if (k === 'order' || k === 'serve') cafeChime(); else if (k === 'munch') munch(); else if (k === 'sip') sip(); else if (k === 'clear') clink(); },
  onMe: (kind, dish) => { const here = CP.on && CP.K.me && CP.seatOf(CP.K.me.seat) && Math.hypot(RP.R.p.x - (CP.seatOf(CP.K.me.seat).tx + 0.5) * 32, RP.R.p.y - (CP.seatOf(CP.K.me.seat).ty + 0.5) * 32) < 18;
    if (kind === 'served') { if (here) { if (!ACT.act) startAction(ACT, 'sit', time); player.emote = { kind: dish.emote, t: 2.2 }; chatSay('me', `*${dish.kind === 'drink' ? 'sip' : 'munch'}* ${dish.line}`, time, { force: true }); } toast(here ? `${dish.name} served. Enjoy!` : `Your ${dish.name} is waiting at your table`, 'good'); }
    else if (kind === 'finished') { if (here) chatSay('me', 'All gone! Thanks, Sesame.', time, { force: true }); }
    else if (kind === 'cleared') toast('Table cleared', ''); } });
function openDiner(s) { if (s.act.diner === 'counter') return openPanel('diner', { seat: null });
  const tx = Math.floor(RP.R.p.x / 32), ty = Math.floor(RP.R.p.y / 32); if (tx !== s.tx || ty !== s.ty) return RP.planTo([s.tx, s.ty], { spot: s }); // walk onto the chair first
  RP.R.p.x = (s.tx + 0.5) * 32; RP.R.p.y = (s.ty + 0.5) * 32; player.face = s.face; player.v = { x: 0, y: 0 }; startAction(ACT, 'sit', time); openPanel('diner', { seat: s.act.diner }); }
function renderDiner() { const body = $('#panel-body'), mt = CP.meTicket(), fav = dinerFav(state), have = Math.floor(state.bones);
  const where = panel.seat ? 'Table service: Server Sesame brings it to your seat.' : 'Order at the counter, then take the free seat we find you.';
  body.innerHTML = `<h2>Shiba Sips Café: Menu</h2><p class="sub">${where} Priced in Bones (you have <b id="dn-bones">${have}</b>). Just for fun: food never changes speed, stats, scores or prizes.</p>
   ${mt ? `<p class="small" id="dn-status">Your ${esc(dishById(mt.dish).name)} is ${mt.phase === 'cook' || mt.phase === 'ready' ? 'being made' : mt.phase === 'carry' ? 'on its way' : mt.phase === 'eat' ? 'on your table' : 'finished'}.</p>` : ''}
   ${fav ? `<p class="small">Your usual: <b>${esc(fav.dish.name)}</b> (ordered ${fav.times}×) <button class="btn ghost tiny" data-dish="${fav.dish.id}" id="dn-usual">Order the usual</button></p>` : ''}
   <div class="grid" id="dn-grid"></div>`;
  const grid = $('#dn-grid');
  for (const d of DISHES) { const card = document.createElement('div'); card.className = 'card'; card.appendChild(iconCanvas((x) => drawDishIcon(x, d.id, 40, 32), 40, 32));
    card.insertAdjacentHTML('beforeend', `<b>${esc(d.name)}</b><small>${d.kind}</small><button class="btn ${have >= d.price ? 'green' : 'ghost'}" data-dish="${d.id}">${d.price} Bones</button>`); grid.appendChild(card); }
  body.onclick = (e) => { const b = e.target.closest('[data-dish]'); if (!b) return; uiClick();
    if (CP.meTicket()) return toast('Your last order is still on its way or on your table', 'bad');
    const seat = panel.seat ? CP.seatOf(panel.seat) : CP.freeSeat(); if (!seat) return toast('Every table is full right now', 'bad');
    const r = dinerOrder(state, b.dataset.dish); if (!r.ok) return toast(r.reason, 'bad');
    CP.placeOrder(r.dish.id, seat.id); hud(); persist(); const counter = !panel.seat; closePanel();
    toast(`Ordered ${r.dish.name} (-${r.price} Bones)${counter ? `. Take a seat, it's coming to table ${seat.id.slice(1)}` : ''}`, 'good'); if (counter) RP.planTo([seat.tx, seat.ty]); }; }
const homeRoomExtra = {
  enter: (...a) => CP.enter?.(...a), update: (...a) => CP.update?.(...a),
  props: (t) => {
    const base = CP.props?.(t) || [], sc = RP.sc, items = sc?.homeItems;
    if (!items?.length) return base;
    const out = base.slice();
    for (const it of items) {
      if (!FURNITURE[it.id]) continue;
      const x = (HOME_OX + (it.x | 0)) * ROOM_ST, y = (HOME_OY + (it.y | 0)) * ROOM_ST, f = footprint(it.id, it.rot | 0);
      out.push({ y: y + f.h * ROOM_ST * 0.85, d: (c) => drawFurniture(c, it.id, x, y, ROOM_ST, it.rot | 0) });
    }
    return out;
  },
};
const RP = makeRoomPlay({ player, extra: homeRoomExtra, diner: (s) => openDiner(s), zoom: () => ZOOM, time: () => time, blocked: () => !!panel || feel.talking() || mode !== 'room',
  input: () => { let dx = 0, dy = 0; if (!panel) { if (keys.has('w') || keys.has('arrowup')) dy -= 1; if (keys.has('s') || keys.has('arrowdown')) dy += 1; if (keys.has('a') || keys.has('arrowleft')) dx -= 1; if (keys.has('d') || keys.has('arrowright')) dx += 1; }
    return { dx, dy, stick: { x: panel ? 0 : touch.x, y: panel ? 0 : touch.y }, mag: touch.mag || 0, shift: keys.has('shift'), holdRun: player.holdRun }; },
  openPanel: (k, o) => openPanel(k, o), build: (id) => {
    roomBuild = { id: RP.id, at: { x: RP.R.p.x, y: RP.R.p.y, face: player.face } };
    if (id === 'clubhouse') { if (myPack(state)) enterBuild(id); else { roomBuild = null; openPanel('packs'); } return; }
    if (id === 'share' || RP.sc?.shared) { const sh = RP.sc?.shared, home = RP.sc?.homeLayout; if (home) enterBuild('share', true, { home, shared: sh }); return; }
    const readOnly = !!RP.sc?.readOnly || !state.plots?.[id]; enterBuild(id, readOnly);
  },
  say: (n, t) => feel.say(n, t, blip), emote: (k) => { player.emote = { kind: k, t: 1.4 }; emoteBubble('me', k, time); }, bell: () => blip(1320), blip: (f) => blip(f),
  chat: (id, t) => chatSay(id, t, time), fade: () => feel.fade(), dust: (x, y) => feel.dust(x, y), portal: (ex) => roomPortal(ex),
  drawGround: (c) => feel.drawGround(c), drawAir: (c) => feel.drawAir(c), drawMark: (c, m, t) => drawMark(c, m, t), bubble: (c, x, y, t) => feel.bubble(c, x, y, t),
  drawChat: (c, res) => drawChat(c, res, time), drawActor: drawRoomActor, rm: () => reducedMotion(), remotes: (view, me) => MPL.actors(view, me), anchor: (id) => MPL.anchor(id), night: () => !!globalThis.__inuNight, arrived: (sc) => roomUi(sc) });
function roomUi(sc) { $('#minimap-wrap').hidden = true; wayUi(false); toast(sc.name, ''); globalThis.__roomVisits = (globalThis.__roomVisits || 0) + 1; }
function enterRoom(id, at, door = null) { if (mode === 'room' && RP.id === id) return; stopWalk(); keys.clear(); player.v = { x: 0, y: 0 }; feel.fade(); blip(660);
  if (id === 'districts') onboardEngage('shuttle', 'use');
  if (door) { const o = outsideOf(door); Object.assign(state.player, { x: o.x, y: o.y }); } // saves/reloads/Back-to-Verse always land you outside, never inside a room
  setTimeout(() => { mode = 'room'; RP.enter(id, at); roomUi(RP.sc); persist(); }, 70); }
function enterGate(g) { if (mode !== 'world' || panel) return; globalThis.__portalFires = (globalThis.__portalFires || 0) + 1; stopWalk(); Object.assign(state.player, { x: (g.out[0] + 0.5) * TILE, y: (g.out[1] + 0.5) * TILE }); enterRoom(g.to, g.at); }
function roomPortal(ex) { if (RP.R.busy) return; const r = resolveExit(ex, { outsideOf, doorById: roomDoorById }); if (!r) return;
  if (r.scene !== 'hub') return RP.travel(r.scene, ex.at, 'gate'); // (travel counts itself for the e2e)
  globalThis.__portalFires = (globalThis.__portalFires || 0) + 1;
  if (!Number.isFinite(r.x)) { r.x = state.player.x; r.y = state.player.y; r.face = 'down'; }
  RP.R.busy = true; RP.stop(); feel.fade(); blip(520);
  setTimeout(() => { RP.R.busy = false; mode = 'world'; Object.assign(state.player, { x: r.x, y: r.y }); player.face = r.face; player.v = { x: 0, y: 0 }; stopWalk(); doorExit(doorSt, time); gateSt.tile = Math.floor(r.y / TILE) * 1000 + Math.floor(r.x / TILE); gateSt.until = time + 0.8;
    cam.x = r.x; cam.y = r.y; $('#minimap-wrap').hidden = false; wayUi(true); persist(); }, 70); }
function updateRoom(dt) { feel.step(dt); RP.update(dt); if (CP.on && CP.K.me && !panel && !player.moving && !ACT.act) { const s = CP.seatOf(CP.K.me.seat); if (s && Math.hypot(RP.R.p.x - (s.tx + 0.5) * 32, RP.R.p.y - (s.ty + 0.5) * 32) < 18) { player.face = s.face; startAction(ACT, 'sit', time); } } stepActor(ACT, dt, time, { moving: player.moving, busy: !!panel || feel.talking() });
  const pr = $('#prompt'), tch = COARSE.matches, s = !panel && RP.nearSpot(); if (s) { pr.hidden = false; pr.innerHTML = `<kbd${tch ? ' class="ta"' : ''}>${tch ? 'A' : 'E'}</kbd>${esc(s.label || s.name)}`; setA((s.verb || 'USE').toUpperCase()); } else { pr.hidden = true; setA(''); } }
// test hooks for the door/portal walk-in e2e (scripts/doors-e2e.mjs): put the player somewhere with every door disarmed,
// exactly like a real exit/spawn does (doorExit / preset portal tile), minus the cooldown so trials run fast.
globalThis.__doorTest = {
  reset(x, y, face = 'down', room = null) { clearTimeout(entering); entering = null; const ov = document.getElementById('enter-ov'); if (ov) ov.hidden = true;
    if (panel) closePanel(); if (mode === 'build') exitBuild(); keys.clear(); stopWalk(); player.v = { x: 0, y: 0 }; player.push = null; RP.R.busy = false;
    touch.x = touch.y = 0; touch.mag = 0; touch.id = null; player.holdRun = false;
    if (room) { mode = 'room'; RP.enter(room, { x, y, face }); RP.R.portal.until = 0; }
    else { if (mode === 'room') RP.stop(); mode = 'world'; Object.assign(state.player, { x, y }); player.face = face; cam.x = x; cam.y = y; $('#minimap-wrap').hidden = false;
      doorExit(doorSt, time); doorSt.until = 0; gateSt.tile = Math.floor(y / TILE) * 1000 + Math.floor(x / TILE); gateSt.armed = false; gateSt.until = 0;
      doorsNow = [...doorList(state).filter((d) => d.kind !== 'plot' || state.plots[d.id]), ...interactables(state).filter((i) => WALK_IN_SPOTS.has(i.id))]; } },
  doors: () => doorsNow.map((d) => ({ id: d.id, kind: d.kind, name: d.name, tx: d.tx, ty: d.ty, side: d.side || null })),
  gates: () => HUB_GATES.map((g) => ({ id: g.id, tx: g.tx, ty: g.ty, face: g.face })),
  solid: (x, y, room = null) => room ? sceneSolid(sceneOf(room), x, y) : solidT(x, y),
  outside: (id, kind) => { const d = doorsNow.find((q) => q.id === id && q.kind === kind); return d ? outsideOf(d) : null; },
  rooms: () => Object.keys(SCENES).map((id) => { const sc = sceneOf(id); return { id, exits: [...sc.exits, ...walkInExits(sc)].map((e) => ({ tiles: e.tiles, face: e.face, to: e.to || ('spot:' + e.spot?.id), spot: !!e.spot })) }; }),
  toScreen: (wx, wy) => mode === 'room' ? (() => { const k = globalThis.__roomCam; return k ? { x: (wx + k.ox) * k.Z, y: (wy + k.oy) * k.Z } : null; })() : { x: (wx - cam.x) * ZOOM + innerWidth / 2, y: (wy - cam.y) * ZOOM + innerHeight / 2 },
  dbg: () => ({ armed: [...doorSt.armed].map((d) => d.id || d), lastTile: doorSt.lastTile, until: doorSt.until, resync: doorSt.resync, time, push: player.push, entering: !!entering, panel: !!panel, arcadeOpen: !!arcadeOpen, drive: !!drive }),
  get st() { return { mode, panel: panel?.kind || null, room: mode === 'room' ? RP.id : null, enters: globalThis.__doorEnters || 0, last: globalThis.__lastDoor || null, portals: globalThis.__portalFires || 0, x: state.player.x, y: state.player.y, rx: RP.R.p.x, ry: RP.R.p.y }; },
};
globalThis.__cafe = { CP, get st() { const K = CP.K; return { on: K.on, bones: state.bones, diner: state.diner || null, served: K.served, cleared: K.cleared, me: K.me, tickets: K.svc.tickets.map((t) => ({ who: t.who, seat: t.seat, dish: t.dish, phase: t.phase })), diners: K.diners.map((d) => ({ name: d.name, seat: d.seat, folk: !!d.folk, state: d.npc.state, x: d.npc.x, y: d.npc.y, waiting: d.npc.waitingShift || null })), waiter: K.waiter && { x: K.waiter.x, y: K.waiter.y, carry: K.waiter.carry, task: K.waiter.task } }; } };
globalThis.__goScene = (id, at) => { mode = 'room'; RP.enter(id, at); roomUi(RP.sc); };
globalThis.__room = () => mode === 'room' ? { id: RP.id, x: RP.R.p.x, y: RP.R.p.y, tx: Math.floor(RP.R.p.x / 32), ty: Math.floor(RP.R.p.y / 32), pts: player.pw.pts.length, face: player.face, npcs: RP.R.npcs.length, busy: RP.R.busy, cam: { ...RP.R.cam } } : null;
globalThis.__roomWalk = (tx, ty, run) => RP.planTo([tx, ty], { run });
globalThis.__roomTap = (tx, ty) => { const k = globalThis.__roomCam; if (!k) return; RP.click((tx * 32 + 16 + k.ox) * k.Z, (ty * 32 + 16 + k.oy) * k.Z, false); };
function enterDoor(d) { lastDoor = d; keys.clear(); stopWalk(); player.v = { x: 0, y: 0 }; doorExit(doorSt, time); globalThis.__doorEnters = (globalThis.__doorEnters || 0) + 1; globalThis.__lastDoor = d.kind + ":" + d.id;
  { const sid = sceneForDoor(d); if (sid) return enterRoom(sid, 'door', d); }
  if (d.kind === 'gamedoor' || (d.kind === 'arcade' && COARSE.matches)) return enterExternal(d);
  feel.fade(); interact(d, true); if (panel) panel.viaDoor = true; }
// External games: same-tab navigation (a movement event is not a user gesture, so window.open would be popup-blocked).
// Your spot is saved one tile outside the door, so coming back (browser Back) puts you outside, not in the doorway.
function enterExternal(d) { const url = d.kind === 'arcade' ? arcadeUrl() : gameDoorUrl(d.id), name = d.name.replace(/^.*\((.*)\)$/, '$1');
  if (d.kind === 'arcade') onboardEngage('arcade', 'use');
  else if (d.id === 'rescue') onboardEngage('rescue', 'use');
  else if (d.id === 'quest') onboardEngage('quest', 'use');
  const o = outsideOf(d); Object.assign(state.player, { x: o.x, y: o.y }); player.face = o.face; persist();
  let ov = document.getElementById('enter-ov'); if (!ov) { ov = document.createElement('div'); ov.id = 'enter-ov'; document.body.appendChild(ov); }
  ov.innerHTML = `<div class="enter-card"><b>Entering ${esc(name)}…</b><small>opening ${esc(new URL(url).host)}</small><button class="btn ghost" id="enter-cancel">Stay in Inu Verse</button></div>`; ov.hidden = false; feel.fade(); blip(660);
  entering = setTimeout(() => { entering = null; globalThis.__lastNav = url; if (!globalThis.__noNav) location.assign(url); else ov.hidden = true; }, 800);
  ov.querySelector('#enter-cancel').onclick = () => { clearTimeout(entering); entering = null; ov.hidden = true; doorExit(doorSt, time); }; }
function interact(it, viaDoor = false) { if (!viaDoor && isWalkDoor(it)) { toast(`Walk into the door to enter ${it.name}`, ''); return; } faceReact('me', it.kind === 'building' || it.kind === 'mall' ? 'wow' : 'curious', 1.2);
  { const obPlace = OB.placeFromInteract(it);
    if (obPlace) {
      setTimeout(() => onboardUi.offer(obPlace), 320);
      // use-need places: opening from the world counts as engagement. act/claim wait for their hooks.
      const q = OB.questByPlace(obPlace);
      if (q && q.need === 'use') onboardEngage(obPlace, 'use');
    }
  }
  if (it.kind === 'building') openPanel(it.id);
  else if (it.kind === 'plot') { if (state.plots[it.id]) enterHomeWalk(it.id, false); else openPanel('plot', { plotId: it.id }); }
  else if (it.kind === 'visit') enterHomeWalk(it.id, true);
  else if (it.kind === 'stall') openPanel('launch', { sel: it.id });
  else if (it.kind === 'mall' && it.cat === 'car') openPanel('dealer', { dealer: 'luxauto' });
  else if (it.kind === 'mall' && it.cat === 'pets') openPanel('pets');
  else if (it.kind === 'mall' && it.cat?.startsWith('furn_')) openPanel('furn', { store: it.cat.slice(5) });
  else if (it.kind === 'chapel') openPanel('chapel');
  else if (it.kind === 'bureau') openPanel('bureau', { tab: it.tab });
  else if (it.kind === 'mall') openPanel('mall', { cat: it.cat, store: it.id });
  else if (it.kind === 'field') openPanel('field', { i: it.i });
  else if (it.kind === 'farm') openPanel('farm', { id: it.id });
  else if (it.kind === 'lot') openPanel('lot', { id: it.id });
  else if (it.kind === 'biz') openPanel('bizboard');
  else if (it.kind === 'arcade') openArcade();
  else if (it.kind === 'shuttle') openPanel('fasttravel', { from: 'town' });
  else if (it.kind === 'gamedoor') openGameDoor(it.id);
  else if (it.kind === 'bank') openPanel('bank');
  else if (it.kind === 'matchmaker') openPanel('matchmaker');
  else if (it.kind === 'square' && it.id === 'pools') openPanel('city', { tab: 'pools' }); // Pools Monument -> Weekly Pool Board (live)
  else if (it.kind === 'square') openPanel('fly5', { tab: it.id === 'pools' ? 'vip' : it.id === 'burn' ? 'burn' : it.id === 'quests' ? 'quests' : 'vip' });
  else if (it.kind === 'clubhouse') { if (myPack(state)) enterBuild('clubhouse', false); else openPanel('packs'); }
  else if (it.kind === 'kibble') kibbleSpot(it.id);
  else if (it.kind === 'community') { const w = window.open(COMMUNITY.url, '_blank', 'noopener'); toast(w ? 'Community board: Telegram opened in a new tab' : 'Allow pop-ups to open the Telegram link', w ? 'good' : 'bad'); }
}

function maybeOfferOnboard(kind, opts = {}) {
  const place = OB.placeFromPanel(kind, opts) || OB.placeFromInteract({ kind, id: opts.id || kind }) || (kind === 'rescue' || kind === 'quest' ? kind : null);
  if (place) setTimeout(() => onboardUi.offer(place), 280);
}
function openPanel(kind, opts = {}) {
  if (!panel) { feel.fade(); uiOpen(); } panel = { kind, ...opts }; $('#panel').hidden = false; $('#prompt').hidden = true; keys.clear();
  const body = $('#panel-body'); body.onclick = null; const dg = $('#dialog'); if (dg) { dg.style.pointerEvents = 'none'; dg.style.visibility = 'hidden'; }
  if (kind !== 'onboard') maybeOfferOnboard(kind, opts);
  if (kind === 'field') return renderField(farmCtx(), opts.i);
  if (kind === 'farm') return renderFarm(farmCtx(), opts.id);
  if (kind === 'lot') return renderLot(farmCtx(), opts.id);
  if (kind === 'bizboard') return renderBizBoard(farmCtx());
  if (kind === 'friend') return renderFriend(relCtx(), opts.name);
  if (kind === 'chapel') return renderChapel(relCtx());
  if (kind === 'salon') return renderSalon();
  if (kind === 'onboard') return onboardUi.renderPanel(body);
  if (kind === 'engage') return renderEngage({ ...farmCtx(), tab: opts.tab, day: gameDay(), open: (t) => openPanel('engage', { tab: t }) });
  if (kind === 'bank') return renderBank();
  if (kind === 'cabinet') return renderCabinet(opts.id);
  if (kind === 'fasttravel') return renderFastTravel(opts.from);
  if (kind === 'companions') return renderCompanions(body, { state, getProfile: () => CMP.prof, status: CMP.status, signedIn: !DEMO && !!K.kp?.session, persist, toast, onChange: () => { const c = myCompanion(); if (c) IQC.resetFollower(CMP.F, state.player, c); else CMP.F.c = null; } });
  if (kind === 'bureau') return PAB.renderBureau(body, { drawShiba }, opts);
  if (kind === 'trade') { if (!document.getElementById('trade-css')) { const st = document.createElement('style'); st.id = 'trade-css'; st.textContent = TRADE_CSS; document.head.appendChild(st); }
    TRD.S.view = opts.view || { mode: 'home' }; TRD.S.err = null; renderTradePanel();
    TRD.refresh({ quiet: false }).then(() => { if (opts.short && panel?.kind === 'trade') { const p = TRD.S.board.find((x) => x.short === opts.short); if (p) TRD.S.view = { mode: 'compose', to: p.tid, give: [], get: [] }; else TRD.S.err = `${opts.name || 'That player'} hasn't opened the Trading Post yet. Ask them to tap Trades in the players list.`; }
      if (panel?.kind === 'trade') renderTradePanel(); }); return; }
  if (kind === 'kibblemood') { body.innerHTML = MWd.moodCardHtml(MOOD.current, esc); body.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => copyText(b.dataset.copy)); body.querySelector('[data-npcrules]').onclick = () => openPanel('npcrules'); return; }
  if (kind === 'dailybone') { body.innerHTML = MWd.dailyBoneHtml(MWd.MW.mood) + '<div id="db-vote"></div><div class="row" style="justify-content:flex-start"><button class="btn ghost tiny" data-npcrules>How the town talks</button></div>'; body.querySelector('[data-npcrules]').onclick = () => openPanel('npcrules'); BurnVote.fetchVoteNotice().then((n) => { const el = body.querySelector('#db-vote'); if (el && n) el.innerHTML = BurnVote.voteNoticeHtml(n); }).catch(() => {}); return; }
  if (kind === 'kennel') { const draw = () => { if (panel?.kind !== 'kennel') return; body.innerHTML = KN.wallHtml({ wall: KEN.wall, me: KEN.real, wallet: KEN.wallet, override: KEN.override, overrideFlair: KEN.flair, show: KEN.show, peek: KEN.peeking });
      const cb = body.querySelector('#kn-show'); if (cb) cb.onchange = () => { KEN.show = cb.checked; KN.setShowMine(cb.checked); toast(cb.checked ? 'Kennel look on' : 'Kennel look hidden', 'good'); }; };
    draw(); refreshKennel(true).then(draw); return; }
  if (kind === 'npcrules') { body.innerHTML = NV.rulesHtml(MWd.voices()); return; }
  if (kind === 'raid') { RD.mountRaid({ body, api: RAPI, kp: K.kp, toast, isOpen: () => panel?.kind === 'raid', getEntry: () => RAID.entry, setEntry: (e) => { RAID.entry = e; } }); return; }
  if (kind === 'fly5') return renderFly5({ ...farmCtx(), kp: DEMO ? null : K.kp, tab: opts.tab, day: gameDay(), week: Math.floor(gameDay() / 7), month: Math.floor(gameDay() / 28), nowH: state.clockSec / (DAY_LEN / 24), open: (t) => openPanel('fly5', { tab: t }) });
  if (kind === 'matchmaker') return renderMatchmaker({ ...farmCtx(), tab: opts.tab, weekFrac: ((state.clockSec / DAY_LEN) % WEEK_DAYS) / WEEK_DAYS, open: (t) => openPanel('matchmaker', { tab: t }), startDuo: (partner, jobId) => { if (!partner) return toast('No partner', 'bad'); closePanel(); playDuo(jobId, partner); } });
  if (kind === 'city') return renderCity({ ...farmCtx(), tab: opts.tab, nowH: state.clockSec / (DAY_LEN / 24), dayFrac: (state.clockSec % DAY_LEN) / DAY_LEN, trend, presOn: pres.on && pres.stage === 'visit', presKey: 'visit' + pres.n, open: (t) => openPanel('city', { tab: t }) });
  if (kind === 'furn') return renderFurnStore(relCtx(), opts.store);
  if (kind === 'plot') {
    const p = PLOTS.find((x) => x.id === opts.plotId);
    const taken = !DEMO && state.plotOwners?.[p.id] && !state.plotOwners[p.id].mine;
    const who = taken ? (state.plotOwners[p.id].name || state.plotOwners[p.id].short) : null;
    body.innerHTML = `<h2>${taken ? 'Taken' : 'Empty'} plot ${p.id.toUpperCase()}</h2><p class="sub">A sunny ${p.w}×${p.h} lot on Bone Street. ${taken ? `Owned by <b>${esc(who)}</b> — one plot, one owner.` : 'Claim it to build and decorate your own home. Each plot has one owner.'}</p>
      <p><b>Cost:</b> ${PLOT_COST} bones · You have ${Math.floor(state.bones)}</p><div class="row" style="justify-content:flex-start">${taken ? '' : `<button class="btn green" id="claim">Claim plot for ${PLOT_COST} bones</button>`}</div>`;
    const btn = $('#claim'); if (btn) btn.onclick = async () => {
      btn.disabled = true;
      if (state.plots[p.id]) { toast('Already yours', 'bad'); return; }
      if (state.bones < PLOT_COST) { toast(`Need ${PLOT_COST} bones`, 'bad'); btn.disabled = false; return; }
      const reg = await registerPlotClaim(p.id);
      if (!reg.ok) { toast(reg.reason, 'bad'); refreshPlotOwners(); btn.disabled = false; openPanel('plot', { plotId: p.id }); return; }
      const r = claimPlot(state, p.id, { free: !!reg.already });
      if (r.ok) { state.town && playerDid(state.town, 'You moved into a new home on Bone Street.'); toast(reg.already ? 'Welcome back — your plot is ready.' : 'Plot claimed! Your new home is ready.', 'good'); onboardEngage('home', 'claim'); hud(); persist(); closePanel(); enterHomeWalk(p.id, false); }
      else { toast(r.reason, 'bad'); btn.disabled = false; }
    };
  } else if (kind === 'academy') return renderAcademy({ state, body, toast, hud, persist, tab: opts.tab, open: (tab) => openPanel('academy', { tab }) });
  else if (kind === 'shop') renderShop();
  else if (kind === 'cafe') renderCafe();
  else if (kind === 'diner') renderDiner();
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
  else if (kind === 'help') body.innerHTML = `<h2>How to play</h2><ul><li>Walk with <b>WASD</b>/<b>arrows</b> or <b>click</b> anywhere.</li><li>Press <b>E</b> near doors and signs.</li><li>Earn <b>bones</b> serving orders at the Shiba Sips Café, or tap <b>Quests</b> to see place tasks — finish each task (not just visit / Got it) for Bones and optional inventory-only cosmetics.</li><li>Claim a plot (${PLOT_COST} bones), buy furniture at Paws & Pillows, decorate (R to rotate).</li><li>Buy clothes at <b>Fetch Fashion</b> and dress up in your <b>Wardrobe</b> (HUD button).</li><li>Launch Hall: create and trade <b>simulated</b> tokens paired with demo <b>$KIBBLE</b>. Nothing here is real money or on any blockchain.</li><li><b>Packs</b>: found or join a Pack (HUD button), chip in bones to the treasury, decorate the shared clubhouse north of Market Row and climb the Kibble Cup. Packs are simulated locally for now.</li><li>Visit Mochi, Kuro, Hana and Taro's homes on Sakura Lane.</li></ul><button class="btn red" id="reset">Reset save</button>`;
  if (kind === 'help') $('#reset').onclick = () => { if (confirm('Delete your local save?')) { localStorage.clear(); location.reload(); } };
}
// ---------- Car dealers, pet shop, garage ----------
const priceTag = (m) => m.cur === 'bones' ? `${m.price} bones` : (() => { const q = wallet().quote(Math.round(m.price * 1e6)); return `${m.price} KIBBLE <small>+2% = ${(q.total / 1e6).toFixed(2)}</small>`; })();
function carIcon(model, color) { const m = CAR_MODELS[model]; return iconCanvas((x) => { x.imageSmoothingEnabled = false; x.scale(0.75, 0.75); drawCar(x, 43, 58, { col: CAR_COLORS[color], kind: m.kind, dir: 'east' }); }, 64, 52); }
function renderDealer() { const body = $('#panel-body'), lux = panel.dealer === 'luxauto', g = ensureGarage(state); panel.col ||= {};
  body.innerHTML = `<h2>${lux ? 'Zoomies Luxury Autos' : 'Zoomies Motors'}</h2><p class="sub">${lux ? `Luxury cars in ${kibText(state)}. ${FEE_LABEL}. Paid to the treasury, ${WL.walletHtml(TREASURY)}, via the ${wallet().simulated ? 'simulated' : 'live'} wallet.` : `Everyday cars priced in bones (you have ${Math.floor(state.bones)}).`} Pick a colour, buy, then drive it from your Garage.</p><div class="grid" id="dealgrid"></div>`;
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
function closePanel() { doorExit(doorSt, time); if (panel?.viaDoor) feel.fade(); const dg = $('#dialog'); if (dg) { dg.style.pointerEvents = ''; dg.style.visibility = ''; }
  if (panel?.kind === 'cafe' && panel.shift && !panel.shift.settled && panel.shift.earned > 0) { finishShift(state, panel.shift); packAct('shift'); toast(`Shift ended early: +${panel.shift.paid} bones`, 'good'); onboardEngage('cafe', 'act'); hud(); persist(); }
  if (panel?.kind === 'cafe') CP.shiftEnded();
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
  body.innerHTML = `<h2>Wardrobe</h2>${LSUI.profileCardHtml(state)}<p class="sub">Equip the clothes you own. One item per slot; gowns replace bottoms.${w.owned.length ? '' : ' <b>Nothing yet - visit Fetch Fashion!</b>'}</p>
    <div class="wardrobe"><div class="mirror" id="mirror"></div><div id="slots"></div></div><p><button class="btn alt" id="tosalon">Mirror: restyle look (${SALON_PRICE} Bones)</button></p>`;
  $('#tosalon').onclick = () => openPanel('salon'); { const so = body.querySelector('[data-streak-open]'); if (so) so.onclick = () => openPanel('fly5', { tab: 'streak' }); }
  const m = $('#mirror'); m.appendChild(playerCanvas(168, 220, 3));
  m.insertAdjacentHTML('beforeend', `<div class="mname">${esc(state.player.name)}</div><div class="small">${COATS[state.player.coat].name}</div>`);
  $('#slots').innerHTML = SLOTS.map((slot) => { const items = w.owned.filter((id) => OUTFITS[id].slot === slot);
    return `<div class="slot"><b>${SLOT_NAMES[slot]}</b><div class="slot-items"><button class="btn ${w.equipped[slot] ? 'ghost' : 'alt'}" data-unequip="${slot}">${slot === 'top' ? 'Cream tee' : slot === 'bottom' ? 'Navy jeans' : 'None'}</button>${items.map((id) => `<button class="btn ${w.equipped[slot] === id ? 'alt' : 'ghost'}" data-wear="${id}">${OUTFITS[id].name}</button>`).join('')}</div></div>`; }).join('');
  $('#slots').onclick = (e) => { const a = e.target.closest('[data-wear]'), u = e.target.closest('[data-unequip]'); if (a) equipOutfit(state, a.dataset.wear); else if (u) unequipSlot(state, u.dataset.unequip); else return; persist(); renderWardrobe(); };
}


// ---- Café food sprites + pointer drag (tray/plate → customer; menu → station) ----
/** Art Studio icons: assets/cafe/{id}.png (80) + assets/cafe/64/{id}.png — see assets/cafe/manifest.json */
const CAFE_ICON_URL = (id, size = 36) => size <= 28 ? `assets/cafe/64/${id}.png` : `assets/cafe/${id}.png`;
function cafeFoodImg(id, size = 36) {
  const m = MENU.find((x) => x.id === id);
  const img = document.createElement('img');
  img.src = CAFE_ICON_URL(id, size); img.alt = m?.name || id; img.width = size; img.height = size;
  img.className = 'cafe-food-icon'; img.draggable = false;
  img.onerror = () => {
    if (!img.dataset.triedFull && size <= 28) { img.dataset.triedFull = '1'; img.src = `assets/cafe/${id}.png`; return; }
    const c = iconCanvas((x) => { x.imageSmoothingEnabled = false; drawMenuIcon(x, id, size / 2, size / 2, size / 28); }, size, size);
    c.className = 'cafe-food-icon'; img.replaceWith(c);
  };
  return img;
}
function cafeFoodHtml(id, size = 28) {
  const m = MENU.find((x) => x.id === id);
  const src = CAFE_ICON_URL(id, size);
  return `<img class="cafe-food-icon" src="${src}" alt="${m?.name || id}" width="${size}" height="${size}" draggable="false" onerror="this.onerror=null;this.src='assets/cafe/${id}.png'">`;
}
function sameTray(a, b) { return [...a].sort().join() === [...b].sort().join(); }
let cafeDrag = null; // { kind:'tray'|'ready'|'menu', itemId?, orderId?, pointerId, ghost, moved }
let cafeSuppressClick = 0; // ignore the synthetic click after a real drag-drop
function cafeClearDragHighlights() {
  document.querySelectorAll('.cafe .drop-target').forEach((el) => el.classList.remove('drop-target'));
  document.querySelector('.cafe.dash')?.classList.remove('dragging-food');
}
function cafeEndDrag() {
  cafeClearDragHighlights();
  if (cafeDrag?.ghost) cafeDrag.ghost.remove();
  document.querySelectorAll('.tray-chip.dragging,.tray-ready-chip.dragging,.order.dragging').forEach((el) => el.classList.remove('dragging'));
  cafeDrag = null;
}
function cafeGhost(html, x, y) {
  let g = cafeDrag?.ghost;
  if (!g) { g = document.createElement('div'); g.className = 'cafe-drag-ghost'; document.body.appendChild(g); if (cafeDrag) cafeDrag.ghost = g; }
  g.innerHTML = html; g.style.left = x + 'px'; g.style.top = y + 'px'; return g;
}
function cafeHighlightForDrag(s) {
  cafeClearDragHighlights();
  document.querySelector('.cafe.dash')?.classList.add('dragging-food');
  if (!cafeDrag || !s) return;
  if (cafeDrag.kind === 'menu') {
    const m = MENU.find((x) => x.id === cafeDrag.itemId);
    if (m) document.querySelector(`.dash-station[data-station="${m.station}"]`)?.classList.add('drop-target');
    return;
  }
  // tray or ready plate → highlight matching tables
  for (const t of s.tables) {
    if (!t.open || !t.orderId) continue;
    const o = s.orders.find((x) => x.id === t.orderId); if (!o) continue;
    let ok = false;
    if (cafeDrag.kind === 'ready' && o.phase === 'ready' && o.id === cafeDrag.orderId) ok = true;
    if (cafeDrag.kind === 'tray' && o.phase === 'order' && sameTray(o.items, s.tray)) ok = true;
    if (cafeDrag.kind === 'tray' && o.phase === 'ready') ok = true; // still allow drop; serve ignores tray
    if (ok) document.querySelector(`.dash-table[data-table="${t.id}"]`)?.classList.add('drop-target');
  }
}

// ---- Café ----
function renderCafe() {
  // warm Art Studio consumable sprites
  for (const m of MENU) { const i = new Image(); i.src = CAFE_ICON_URL(m.id, 40); const j = new Image(); j.src = CAFE_ICON_URL(m.id, 22); }
  const body = $('#panel-body');
  body.innerHTML = `<h2>Shiba Sips Café — Floor shift</h2>
   <p class="sub">Diner Dash floor: seat from the <b>line</b>, cook at the <b>kitchen strip</b> (icons), <b>drag plates from the pass onto tables</b> (or tap). Clear dirty tables — dirt taxes patience. VIPs + specials pay more. ${SHIFT_LEN}s · ${TABLES_START}→${NUM_TABLES} tables as waves ramp.</p>
   <div class="cafe dash">
     <header class="dash-hud">
       <div class="dash-hud-stats">
         <span>Time <b id="ctime">${SHIFT_LEN}</b>s</span>
         <span>Wave <b id="cwave">1</b></span>
         <span>★ <b id="cstars">0</b></span>
         <span>Served <b id="cserved">0</b></span>
         <span>Walkouts <b id="cfail">0</b></span>
         <span>Combo <b id="ccombo">0</b></span>
         <span class="dash-hud-earn">Earned <b class="big-num" id="cearned">0</b></span>
       </div>
       <button class="btn green" id="cstart">Start floor shift</button>
     </header>
     <section class="dash-zone dash-zone-line" aria-label="Waiting line">
       <div class="dash-zone-label">Waiting line <span class="small">— tap guest, then an empty table (or drag)</span></div>
       <div class="dash-queue" id="cqueue"><span class="small">Line empty until the shift starts</span></div>
     </section>
     <div class="dash-mid">
       <section class="dash-zone dash-zone-floor" aria-label="Dining floor">
         <div class="dash-zone-label">Dining floor</div>
         <div class="dash-tables" id="ctables"></div>
       </section>
       <aside class="dash-zone dash-zone-rail" aria-label="Tickets">
         <div class="dash-zone-label">Tickets</div>
         <div class="dash-tickets" id="orders"></div>
         <div id="cevents" class="dash-events small"></div>
         <div id="cpops" class="dash-pops" aria-live="polite"></div>
       </aside>
     </div>
     <section class="dash-zone dash-zone-kitchen" aria-label="Kitchen">
       <div class="dash-zone-label">Kitchen stations <span class="small">— tap or drag a dish onto its station</span></div>
       <div class="dash-stations" id="cstations"></div>
     </section>
     <section class="dash-zone dash-zone-pass" aria-label="Service pass">
       <div class="tray">
         <div class="tray-head">
           <b>Pass / tray</b>
           <span class="small">drag chips onto the matching table</span>
           <button class="btn ghost" id="cleartray">clear</button>
           <button class="btn alt" id="ccook">Plate matching ticket</button>
         </div>
         <div id="tray" class="tray-body"></div>
       </div>
     </section>
   </div>
   <h3>Mini-game shifts</h3><p class="small">Skill pays: score, streak bonus and a daily first-shift bonus. No paid boosts.</p><div class="grid">${['cafe', 'delivery'].map((k) => { const J = ensureJobs(state)[k]; return `<div class="card"><b>${JOB_DEFS[k].name}</b><small>${rankOf(J.xp).title} · best ${J.best}</small><button class="btn green" data-job="${k}">Play</button></div>`; }).join('')}</div>
   <h3>Your job ranks</h3><table class="lb"><tr><th>Job</th><th>Rank</th><th>Best</th><th>Runs</th></tr>${Object.entries(ensureJobs(state)).map(([k, J]) => `<tr><td>${JOB_DEFS[k].name}</td><td>${rankOf(J.xp).title}</td><td>${J.best}</td><td>${J.runs}</td></tr>`).join('')}</table>`;
  body.querySelectorAll('[data-job]').forEach((b) => b.onclick = () => playJob(b.dataset.job));
  const stations = $('#cstations');
  stations.innerHTML = STATIONS.map((st) => {
    const items = MENU.filter((m) => m.station === st.id);
    return `<div class="dash-station" data-station="${st.id}">
      <div class="st-head"><b>${st.emoji} ${st.name}</b><span class="st-busy small" data-busy="${st.id}"></span></div>
      <div class="st-items">${items.map((m) => `<button class="btn ghost st-item" data-station="${st.id}" data-item="${m.id}" data-drag-menu="${m.id}">${cafeFoodHtml(m.id, 28)}<span>${m.name}</span></button>`).join('')}</div>
      <button class="btn alt st-auto" data-station-auto="${st.id}">Cook needed</button>
    </div>`;
  }).join('');
  stations.onclick = (e) => {
    if (Date.now() - cafeSuppressClick < 400) return;
    const s = panel.shift; if (!s || s.over) return;
    const auto = e.target.closest('[data-station-auto]');
    const item = e.target.closest('[data-item]');
    let r;
    if (auto) r = cookAtStation(s, auto.dataset.stationAuto);
    else if (item) r = cookAtStation(s, item.dataset.station, item.dataset.item);
    else return;
    toast(r.ok ? (r.instant ? 'On tray' : `Cooking…`) : r.reason, r.ok ? 'good' : 'bad');
    cafeUi();
  };
  $('#cleartray').onclick = () => { if (panel.shift) { clearTray(panel.shift); cafeUi(); } };
  $('#ccook').onclick = () => {
    const s = panel.shift; if (!s || s.over) return;
    const ticket = s.orders.find((o) => o.phase === 'order' && o.items.length === s.tray.length && [...o.items].sort().join() === [...s.tray].sort().join())
      || s.orders.find((o) => o.phase === 'order');
    if (!ticket) { toast('No open ticket to plate', 'bad'); return; }
    const r = startCook(s, ticket.id);
    toast(r.ok ? `Plating for ${ticket.customer}…` : r.reason, r.ok ? 'good' : 'bad');
    cafeUi();
  };
  const actOrder = (ord) => {
    const s = panel.shift; if (!s || !ord) return;
    if (ord.phase === 'seat') { const r = takeOrder(s, ord.id); toast(r.ok ? `${ord.customer}'s order taken` : r.reason, r.ok ? 'good' : 'bad'); if (r.ok) onboardEngage('cafe', 'act'); }
    else if (ord.phase === 'order') {
      const r = startCook(s, ord.id);
      if (r.ok) toast(`Plating for ${ord.customer}…`, 'good');
      else toast(r.reason === 'Wrong order!' ? 'Build the tray at stations first' : r.reason, 'bad');
    } else if (ord.phase === 'ready') {
      const r = serve(s, ord.id);
      if (r.ok) { CP.shiftServed(ord); toast(`Served! +${r.pay} Bones${r.tip ? ` (tip ${r.tip})` : ''}${r.combo >= 2 ? ` · x${r.combo}` : ''}`, 'good'); }
      else toast(r.reason, 'bad');
    } else if (ord.phase === 'dirty') {
      const r = clearTable(s, ord.id); toast(r.ok ? `Cleared · +${r.pay}` : r.reason, r.ok ? 'good' : 'bad');
    } else if (ord.phase === 'cook') toast('Still plating…', 'bad');
    else if (ord.phase === 'eat') toast(`${ord.customer} is eating`, 'good');
    cafeUi();
  };
  $('#orders').onclick = (e) => { if (Date.now() - cafeSuppressClick < 400) return; const el = e.target.closest('[data-order]'); if (!el || !panel.shift) return; actOrder(panel.shift.orders.find((x) => x.id === +el.dataset.order)); };
  $('#ctables').onclick = (e) => {
    if (Date.now() - cafeSuppressClick < 400) return;
    const s = panel.shift; if (!s) return;
    const t = e.target.closest('[data-table]'); if (!t) return;
    const tbl = s.tables.find((x) => x.id === +t.dataset.table);
    if (!tbl) return;
    if (!tbl.open) { toast(`Table unlocks at a later wave`, 'bad'); return; }
    if (!tbl.orderId && !tbl.dirty) {
      const r = seatSelected(s, tbl.id);
      toast(r.ok ? `Seated ${r.order.customer} at T${tbl.id}` : (s.queue.length ? 'Tap a guest in line first' : r.reason), r.ok ? 'good' : 'bad');
      cafeUi(); return;
    }
    const ord = s.orders.find((o) => o.id === tbl.orderId);
    if (ord) actOrder(ord);
  };
  // Pointer drag from queue → table (desktop); tap-tap still works on mobile
  let dragQ = null;
  $('#cqueue').onpointerdown = (e) => {
    const s = panel.shift; if (!s) return;
    const q = e.target.closest('[data-seat-q]'); if (!q) return;
    dragQ = +q.dataset.seatQ;
    selectQueue(s, dragQ);
    q.setPointerCapture?.(e.pointerId);
    cafeUi();
  };
  $('#cqueue').onpointerup = (e) => {
    const s = panel.shift; if (!s || dragQ == null) return;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const t = under?.closest?.('[data-table]');
    if (t) {
      const r = seatCustomer(s, dragQ, +t.dataset.table);
      toast(r.ok ? `Seated ${r.order.customer}` : r.reason, r.ok ? 'good' : 'bad');
    }
    dragQ = null; cafeUi();
  };
  $('#cqueue').onclick = (e) => {
    const s = panel.shift; if (!s) return;
    const q = e.target.closest('[data-seat-q]'); if (!q) return;
    const r = selectQueue(s, +q.dataset.seatQ);
    toast(r.ok ? (r.selected ? 'Selected — tap an empty table' : 'Deselected') : r.reason, r.ok ? 'good' : 'bad');
    cafeUi();
  };
  $('#cstart').onclick = () => { panel.shift = newShift(rng); $('#cstart').hidden = true; cafeUi(); };
  $('#orders').innerHTML = '<p class="small">Press Start floor shift to open the café.</p>';
  // Drag consumables: menu→station (cook), tray/ready-plate→customer table (serve). Touch + mouse. Tap remains fallback.
  const dashRoot = body.querySelector('.cafe.dash');
  const onDragMove = (e) => {
    if (!cafeDrag || e.pointerId !== cafeDrag.pointerId) return;
    const dx = e.clientX - cafeDrag.x0, dy = e.clientY - cafeDrag.y0;
    if (!cafeDrag.moved && dx * dx + dy * dy < 36) return;
    cafeDrag.moved = true;
    cafeGhost(cafeDrag.html, e.clientX, e.clientY);
    cafeHighlightForDrag(panel.shift);
    e.preventDefault();
  };
  const onDragUp = (e) => {
    if (!cafeDrag || e.pointerId !== cafeDrag.pointerId) return;
    const s = panel.shift;
    const under = document.elementFromPoint(e.clientX, e.clientY);
    const moved = cafeDrag.moved;
    const kind = cafeDrag.kind, itemId = cafeDrag.itemId, orderId = cafeDrag.orderId;
    cafeEndDrag();
    window.removeEventListener('pointermove', onDragMove);
    window.removeEventListener('pointerup', onDragUp);
    window.removeEventListener('pointercancel', onDragUp);
    if (!s || s.over || !moved) return;
    cafeSuppressClick = Date.now();
    if (kind === 'menu') {
      const st = under?.closest?.('.dash-station[data-station]');
      if (!st) { toast('Drop on a station', 'bad'); return; }
      const stationId = st.dataset.station;
      if (!stationId) return;
      const r = cookAtStation(s, stationId, itemId);
      toast(r.ok ? (r.instant ? 'On tray' : `Cooking…`) : r.reason, r.ok ? 'good' : 'bad');
      cafeUi(); return;
    }
    const t = under?.closest?.('[data-table]');
    if (!t) return;
    const tbl = s.tables.find((x) => x.id === +t.dataset.table);
    const ord = tbl && s.orders.find((o) => o.id === tbl.orderId);
    if (!ord) { toast('Drop on a seated customer', 'bad'); return; }
    if (kind === 'ready') {
      if (ord.id !== orderId) { toast('Wrong table for that plate', 'bad'); return; }
      if (ord.phase !== 'ready') { toast('Plate not ready yet', 'bad'); return; }
      const r = serve(s, ord.id);
      if (r.ok) { CP.shiftServed(ord); toast(`Served! +${r.pay} Bones${r.tip ? ` (tip ${r.tip})` : ''}${r.combo >= 2 ? ` · x${r.combo}` : ''}`, 'good'); }
      else toast(r.reason, 'bad');
      cafeUi(); return;
    }
    if (kind === 'tray') {
      if (ord.phase === 'ready') {
        const r = serve(s, ord.id);
        if (r.ok) { CP.shiftServed(ord); toast(`Served! +${r.pay} Bones${r.tip ? ` (tip ${r.tip})` : ''}`, 'good'); }
        else toast(r.reason, 'bad');
      } else if (ord.phase === 'order') {
        const r = serve(s, ord.id); // tray-match instant plate+serve
        if (r.ok) { CP.shiftServed(ord); toast(`Plated & served! +${r.pay} Bones`, 'good'); }
        else toast(r.reason === 'Wrong order!' ? 'Tray does not match this order' : r.reason, 'bad');
      } else toast('Customer is not waiting for food', 'bad');
      cafeUi();
    }
  };
  const startCafeDrag = (e, spec) => {
    if (!panel.shift || panel.shift.over) return;
    if (e.button != null && e.button !== 0) return;
    cafeEndDrag();
    cafeDrag = { ...spec, pointerId: e.pointerId, x0: e.clientX, y0: e.clientY, moved: false, ghost: null };
    e.currentTarget?.setPointerCapture?.(e.pointerId);
    window.addEventListener('pointermove', onDragMove, { passive: false });
    window.addEventListener('pointerup', onDragUp);
    window.addEventListener('pointercancel', onDragUp);
  };
  stations.addEventListener('pointerdown', (e) => {
    const btn = e.target.closest('[data-drag-menu]'); if (!btn) return;
    // Don't steal taps on "Cook needed"
    if (e.target.closest('[data-station-auto]')) return;
    const id = btn.dataset.dragMenu;
    startCafeDrag(e, { kind: 'menu', itemId: id, html: cafeFoodHtml(id, 36) + `<span>${MENU.find((m) => m.id === id)?.name || id}</span>` });
  });
  // Tray chips + ready plates are rebuilt in cafeUi; use delegation on the tray box
  const trayBox = body.querySelector('.tray');
  trayBox?.addEventListener('pointerdown', (e) => {
    const chip = e.target.closest('[data-drag-tray],[data-drag-ready]'); if (!chip) return;
    if (chip.dataset.dragReady) {
      const oid = +chip.dataset.dragReady;
      const ord = panel.shift?.orders.find((o) => o.id === oid);
      const icons = (ord?.items || []).map((id) => cafeFoodHtml(id, 28)).join('');
      chip.classList.add('dragging');
      startCafeDrag(e, { kind: 'ready', orderId: oid, html: icons + `<span>→ ${ord?.customer || 'table'}</span>` });
    } else {
      const id = chip.dataset.dragTray;
      chip.classList.add('dragging');
      startCafeDrag(e, { kind: 'tray', itemId: id, html: (panel.shift?.tray || []).map((x) => cafeFoodHtml(x, 32)).join('') || cafeFoodHtml(id, 36) });
    }
  });
  $('#orders').addEventListener('pointerdown', (e) => {
    const el = e.target.closest('.order.phase-ready[data-order]'); if (!el) return;
    const oid = +el.dataset.order;
    const ord = panel.shift?.orders.find((o) => o.id === oid); if (!ord) return;
    el.classList.add('dragging');
    startCafeDrag(e, { kind: 'ready', orderId: oid, html: ord.items.map((id) => cafeFoodHtml(id, 28)).join('') + `<span>→ ${ord.customer}</span>` });
  });

  cafeUi();
}
function cafeUi() {
  const s = panel.shift; if (!s) return;
  const name = (id) => MENU.find((m) => m.id === id)?.name || id;
  const phaseLabel = { queue: 'In line', seat: 'Tap: take order', order: 'Cook → drag tray here', cook: 'Plating…', ready: 'Drag plate here!', eat: 'Eating', dirty: 'Tap: CLEAR (dirt taxes floor)' };
  $('#ctime').textContent = Math.ceil(s.time);
  $('#cserved').textContent = s.served;
  $('#cearned').textContent = s.earned;
  if ($('#cwave')) $('#cwave').textContent = s.wave;
  if ($('#cfail')) $('#cfail').textContent = s.failed;
  if ($('#ccombo')) $('#ccombo').textContent = s.combo + (s.combo >= 3 ? '!' : '');
  if ($('#cstars')) $('#cstars').textContent = '★'.repeat(s.stars || 0) || '0';
  if ($('#cevents')) $('#cevents').innerHTML = (s.events || []).slice(-4).map((e) => `<div class="ev-${e.kind}">${e.msg}</div>`).join('');
  // floating tip / combo popups
  const pops = $('#cpops');
  if (pops) {
    const psig = (s.pops || []).map((p) => p.id).join();
    if (pops.dataset.sig !== psig) {
      pops.dataset.sig = psig;
      pops.innerHTML = (s.pops || []).map((p) => `<div class="dash-pop pop-${p.kind}" style="--life:${Math.max(0.2, p.t)}">${p.text}</div>`).join('');
    }
  }
  // station busy indicators
  for (const st of STATIONS) {
    const el = document.querySelector(`[data-busy="${st.id}"]`);
    if (!el) continue;
    const slot = s.stations?.[st.id];
    if (slot && slot.busy > 0) { el.textContent = `busy ${slot.busy.toFixed(1)}s`; el.classList.add('on'); }
    else { el.textContent = 'ready'; el.classList.remove('on'); }
  }

  // queue
  const qEl = $('#cqueue');
  if (qEl) {
    const qsig = s.queue.map((o) => o.id + ':' + Math.floor(o.patience) + (o.vip ? 'V' : '') + (s.selectedQueueId === o.id ? '*' : '')).join() + `|sel:${s.selectedQueueId}`;
    if (qEl.dataset.sig !== qsig) {
      qEl.dataset.sig = qsig;
      qEl.innerHTML = (s.queue.map((o) =>
        `<button class="btn ghost dash-q${s.selectedQueueId === o.id ? ' sel' : ''}${o.vip ? ' vip' : ''}" data-seat-q="${o.id}"><span class="dash-q-name">${o.vip ? '★ ' : ''}${o.customer}${o.special ? ' · special' : ''}</span><i class="pat"><i style="width:${100 * o.patience / o.max}%"></i></i></button>`).join('') || '<span class="small">Nobody waiting</span>');
    } else s.queue.forEach((o) => { const el = qEl.querySelector(`[data-seat-q="${o.id}"] .pat i`); if (el) el.style.width = (100 * o.patience / o.max) + '%'; });
  }

  // tables
  const tEl = $('#ctables');
  if (tEl && !s.over) {
    const tsig = s.tables.map((t) => { const o = s.orders.find((x) => x.id === t.orderId); return `${t.id}:${t.open}:${t.dirty}:${Math.floor(t.dirtyAge||0)}:${o ? o.phase + o.id + Math.floor(o.patience) + (o.vip?'V':'') : ''}:${s.selectedQueueId||''}`; }).join('|');
    if (tEl.dataset.sig !== tsig) {
      tEl.dataset.sig = tsig;
      tEl.innerHTML = s.tables.map((t) => {
        if (!t.open) return `<div class="dash-table locked" data-table="${t.id}"><div class="dash-table-num">T${t.id}</div><span class="small">unlocks later</span></div>`;
        const o = s.orders.find((x) => x.id === t.orderId);
        if (!o) {
          const seatHint = s.selectedQueueId || s.queue.length ? (s.selectedQueueId ? 'Tap to seat' : 'Empty') : 'Empty';
          return `<div class="dash-table empty${t.dirty ? ' phase-dirty' : ''}${s.selectedQueueId ? ' seat-target' : ''}" data-table="${t.id}"><div class="dash-table-num">T${t.id}</div><span class="small">${t.dirty ? 'DIRTY — tap clear' : seatHint}</span></div>`;
        }
        const pct = o.phase === 'cook' && o.cookMax ? 100 * (1 - o.cookT / o.cookMax) : 100 * o.patience / o.max;
        const barCol = o.phase === 'cook' ? '#5fd3ff' : o.phase === 'ready' ? '#ffe66a' : o.phase === 'dirty' ? '#c4a882' : (o.patience / o.max < 0.3 ? '#d9534f' : '#3fa66a');
        return `<div class="dash-table phase-${o.phase}${o.vip ? ' vip' : ''}" data-table="${t.id}" data-order="${o.id}">
          <div class="dash-table-top"><canvas width="56" height="44" data-face="${o.id}"></canvas><div class="dash-table-meta"><b>${o.vip ? '★ ' : ''}${o.customer}</b><span class="small">T${t.id}</span></div></div>
          <div class="dash-table-phase small">${phaseLabel[o.phase] || o.phase}</div>
          <div class="order-foods">${o.phase === 'seat' ? '' : o.items.map((id) => cafeFoodHtml(id, 26)).join('')}</div>
          <div class="small items">${o.phase === 'seat' ? '…' : o.items.map(name).join(' + ')}${o.special ? ' · SPECIAL' : ''}</div>
          <div class="pat" title="Patience"><i style="width:${pct}%;background:${barCol}"></i></div>
        </div>`;
      }).join('');
      tEl.querySelectorAll('canvas[data-face]').forEach((c) => {
        const id = +c.dataset.face; const o = s.orders.find((x) => x.id === id); if (!o) return;
        drawShiba(c.getContext('2d'), 28, 28, { coat: Object.keys(COATS)[o.id % 6], outfit: NPC_OUTFITS[o.id % NPC_OUTFITS.length], scale: 0.48, shadow: false });
      });
    } else {
      s.tables.forEach((t) => {
        const o = s.orders.find((x) => x.id === t.orderId); if (!o) return;
        const el = tEl.querySelector(`[data-table="${t.id}"] .pat i`); if (!el) return;
        const pct = o.phase === 'cook' && o.cookMax ? 100 * (1 - o.cookT / o.cookMax) : 100 * o.patience / o.max;
        el.style.width = pct + '%';
        el.style.background = o.phase === 'cook' ? '#5fd3ff' : o.phase === 'ready' ? '#ffe66a' : o.phase === 'dirty' ? '#c4a882' : (o.patience / o.max < 0.3 ? '#d9534f' : '#3fa66a');
      });
    }
  }

  // tickets strip (order/cook/ready only)
  const tickets = s.over ? [] : s.orders.filter((o) => ['order', 'cook', 'ready'].includes(o.phase));
  const sig = tickets.map((o) => o.id + o.phase + (o.vip?'V':'')).join() + '|' + s.over;
  if ($('#orders').dataset.sig !== sig) {
    $('#orders').dataset.sig = sig;
    if (s.over) $('#orders').innerHTML = '';
    else {
      $('#orders').innerHTML = tickets.map((o) => `<div class="order phase-${o.phase}${o.vip?' vip':''}" data-order="${o.id}" data-items="${o.items.join(',')}"><b>#${o.id} ${o.vip?'★ ':''}${o.customer}</b><div class="order-foods">${o.items.map((id) => cafeFoodHtml(id, 24)).join('')}</div><div class="small">${o.items.map(name).join(' + ')}</div><div class="small">${phaseLabel[o.phase]}</div><div class="pat"><i></i></div></div>`).join('') || '<p class="small">No open tickets — seat guests from the line.</p>';
    }
  }
  tickets.forEach((o) => { const el = $(`.order[data-order="${o.id}"] .pat i`); if (el) { el.style.width = (100 * o.patience / o.max) + '%'; el.style.background = o.patience / o.max < 0.3 ? '#d9534f' : '#3fa66a'; } });

  const tray = $('#tray');
  const readyPlates = s.over ? [] : s.orders.filter((o) => o.phase === 'ready');
  const tsig = s.tray.join() + '|R:' + readyPlates.map((o) => o.id).join();
  if (tray && tray.dataset.sig !== tsig) {
    tray.dataset.sig = tsig; tray.innerHTML = '';
    if (!s.tray.length && !readyPlates.length) tray.innerHTML = '<span class="small">empty — cook at stations, then drag plates onto customers</span>';
    s.tray.forEach((id) => {
      const chip = document.createElement('div'); chip.className = 'tray-chip'; chip.dataset.dragTray = id; chip.title = (MENU.find((m) => m.id === id)?.name || id) + ' — drag onto matching customer';
      chip.appendChild(cafeFoodImg(id, 40)); tray.appendChild(chip);
    });
    if (readyPlates.length) {
      const wrap = document.createElement('div'); wrap.className = 'tray-ready';
      readyPlates.forEach((o) => {
        const chip = document.createElement('div'); chip.className = 'tray-ready-chip'; chip.dataset.dragReady = o.id;
        chip.title = `Drag onto ${o.customer}'s table to serve`;
        o.items.forEach((id) => chip.appendChild(cafeFoodImg(id, 28)));
        const lab = document.createElement('span'); lab.textContent = `→ ${o.customer}`; chip.appendChild(lab);
        wrap.appendChild(chip);
      });
      tray.appendChild(wrap);
    }
  }

  if (s.over && !s.settled) {
    const total = finishShift(state, s); packAct('shift'); onboardEngage('cafe', 'act'); hud(); persist();
    const sum = s.summary || {};
    $('#orders').innerHTML = `<div class="card" style="width:100%"><h3>Shift complete! ${'★'.repeat(sum.stars || 0) || ''}</h3>
      <p>Served ${sum.served || s.served} · walkouts ${sum.walkouts || s.failed} · cleared ${sum.cleared || s.cleared} · VIPs ${sum.vipServed || 0}</p>
      <p class="small">Tips ${sum.tips || s.tips} · star +${sum.star || 0} · combo +${sum.comboBonus || 0} · VIP +${sum.vipBonus || 0} · tidy +${sum.clearBonus || 0} · wave ${sum.wave || s.wave} · best combo ${sum.maxCombo || s.maxCombo}</p>
      <div class="big-num" id="shift-total">+${total} Bones</div></div>`;
    if (tEl) tEl.innerHTML = '';
    if (qEl) qEl.innerHTML = '';
    CP.shiftEnded(); const b = $('#cstart'); b.hidden = false; b.textContent = 'Work another shift';
    toast(`Shift paid: +${total} Bones`, 'good');
  }
}

// ---- Launch Hall ----
// Tabs: $KIBBLE (real, live stats) · Launch your coin (pump.fun's own create flow) · Coin board (player-registered, verified) · Practice (play tokens).
const practice = () => DEMO ? state : new Proxy(state, { get: (t, k) => k === 'kibble' ? (t.practiceKibble ??= 20) : t[k], set: (t, k, v) => { t[k === 'kibble' ? 'practiceKibble' : k] = v; return true; } });
async function refreshRegistry(force) { if (!force && Date.now() - REG.loaded < 30000) return; REG.loaded = Date.now();
  const r = await RC.listCoins(); const fx = VFX.on ? VFX.data.coins : []; REG = { ...REG, coins: [...fx, ...r.coins], offline: !r.ok && !fx.length, reason: r.reason }; await loadVerified(); await refreshRealStats(); }
async function refreshRealStats() { await RC.fetchStats([RC.KIBBLE.mint, ...REG.coins.filter((c) => !c.fixture).map((c) => c.mint)]); trend = RC.realTrend(REG.coins, 6, VF.trendTag); if (panel?.kind === 'launch') launchRealUi(); }
// ---- Verified Launch (opt-in) + crier news. ?verifiedpreview=1 adds labelled TEST FIXTURE coins for proof shots only. ----
const VFX = { on: /[?&]verifiedpreview=1/.test(location.search), data: null }; if (VFX.on) { VFX.data = VF.fixtures(); for (const [m, r] of Object.entries(VFX.data.recs)) VF.setRecord(m, r); }
VF.injectCss();
async function loadVerified() { const want = REG.coins.filter((c) => c.verifiedOptIn && !c.fixture).map((c) => c.mint); if (want.length) await VF.fetchVerified(want);
  document.querySelectorAll('[data-vfslot]').forEach((el) => { const m = el.dataset.vfslot, open = !!el.querySelector('details[open]'); el.innerHTML = vfBadge(m, open); }); }
const vfBadge = (mint, open) => VF.badgeHtml(mint, { open, fixture: !!REG.coins.find((c) => c.mint === mint)?.fixture || !!VF.recOf(mint)?.fixture });
const vfSlot = (mint, open = false) => `<div class="vfslot" data-vfslot="${mint}">${vfBadge(mint, open)}</div>`;
const NEWS = { list: [], crier: VF.makeCrier(), pending: null };
async function refreshNews() { if (document.hidden) return; const real = await VF.fetchNews(); NEWS.list = [...(VFX.on ? VFX.data.news : []), ...real];
  const it = NEWS.crier.pick(NEWS.list); if (it) NEWS.pending = it; const el = document.getElementById('vfnews'); if (el) el.innerHTML = VF.newsCardHtml(NEWS.list, { fixture: !!NEWS.list[0]?.fixture }); }
function crierNewsTick() { if (!NEWS.pending || mode !== 'world' || panel || !state) return; const it = NEWS.pending; NEWS.pending = null; const line = VF.headline(it);
  crierRing = 3; crierBell(); chatSay(MWd.CRIER_NAME, line, time, { force: true, life: 7 });
  let b = document.getElementById('crier-banner'); if (!b) { b = document.createElement('div'); b.id = 'crier-banner'; b.setAttribute('role', 'status'); document.body.appendChild(b); }
  b.innerHTML = `<b>${esc(MWd.CRIER_NAME)} · THE DAILY BONE${it.fixture ? ' · TEST FIXTURE' : ''}</b><span>${esc(line)}</span><a href="${esc(it.pump)}" target="_blank" rel="noopener noreferrer">$${esc(it.symbol || '???')} on pump.fun ↗</a>`; b.className = 'show news'; clearTimeout(b._t); b._t = setTimeout(() => { b.className = ''; }, 8000);
  globalThis.__crierNews = [...(globalThis.__crierNews || []), it.id]; }
setTimeout(refreshNews, 4000); setInterval(refreshNews, 120_000);
globalThis.__verified = () => ({ preview: VFX.on, news: NEWS.list, pending: NEWS.pending, recs: REG.coins.map((c) => [c.mint, VF.recOf(c.mint)]) });
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
     ${statBox(K0.mint)}<div class="kibsplit"><b>Creator fee split</b>${WL.splitHtml(WL.KIBBLE_SPLIT)}</div>${vfSlot(K0.mint)}${cleanSlot(K0.mint)}<div id="kibsign"></div>${panel.sign ? '' : '<div class="row" style="justify-content:flex-start;margin:2px 0"><button class="btn tiny ghost" id="kib-signopen">Creator: opt $KIBBLE in to Verified Launch</button></div>'}<div class="small" id="kib-src">Live from DexScreener, refreshed every minute. Shows "unavailable" if the feed is down.</div>
     <div class="row" style="justify-content:flex-start">${link(RC.PUMP_COIN(K0.mint), 'View on pump.fun', 'btn green')}${link(RC.DEX_URL(K0.mint), 'DexScreener chart', 'btn ghost')}</div></div>${NFA}`;
  else if (tab === 'launch') body.innerHTML = `${head}<div id="noext" class="noext"><div class="small">Loading launcher…</div></div><details class="card" style="text-align:left"><summary><b>Prefer pump.fun's own page (any pair)? Step-by-step guide</b></summary>
     <p class="small">Inu Verse never creates, holds or signs tokens. You launch on pump.fun with your own wallet; pump.fun shows you every fee and step before you sign.</p>
     <ol class="small steps"><li>Open pump.fun's create page (button below) and connect Phantom there.</li>
     <li><b>Pick your pair:</b> on pump.fun's create form choose <b>Custom</b> under the pool liquidity pair, then paste one of these contract addresses into the search and select the matching coin (check the address!). pump.fun has no link that preselects the pair, so copy it from here:<div id="pairlist" class="pairlist"><span class="small">Loading eligible pairs…</span></div></li>
     <li>After launch, copy your coin's mint address and register it on the <b>Coin board</b> tab so it shows on the board and city billboards.</li></ol>
     <div class="row" style="justify-content:flex-start"><button class="btn green" id="go-pump">Open pump.fun create ↗</button>${isMobile() ? '<button class="btn alt" id="go-phantom">Open in Phantom app ↗</button>' : ''}</div></details>${NFA}`;
  else if (tab === 'board') body.innerHTML = `${head}<div class="launch rboard"><div><div class="card form" style="text-align:left"><b>Register a coin you launched</b>
     <div class="small">Sign in with Phantom, paste your coin's mint. We check pump.fun's on-chain record that <i>your wallet</i> created it.</div>
     <input id="reg-mint" placeholder="Your coin's mint address" maxlength="44" autocomplete="off" spellcheck="false">${VF.verifiedOptHtml(false, 'reg-verified')}<button class="btn green" id="reg-go">${K.kp?.signedIn ? 'Register coin' : 'Sign in & register'}</button><div class="small" id="reg-msg"></div></div>${NFA}</div>
     <div><div id="vfcard">${coinCardHtml(panel.coin)}</div><div id="vfnews">${VF.newsCardHtml(NEWS.list, { fixture: !!NEWS.list[0]?.fixture })}</div><b>Registered coins</b><div class="regboard" id="regboard"></div></div></div>`;
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
  if (tab === 'launch') import('./launchui.js').then((m) => m.mountNoExt($('#noext'), { toast, copyText, persist, refreshRegistry, openBoard: () => { panel.tab = 'board'; renderLaunch(); } })).catch(() => { const el = $('#noext'); if (el) el.innerHTML = '<div class="small">Launcher unavailable right now: use the pump.fun guide below.</div>'; });
  if (tab === 'launch') RC.listPairs().then((r) => { const el = $('#pairlist'); if (!el) return;
    el.innerHTML = r.pairs.map((p) => `<div class="pairrow ${p.featured ? 'feat' : ''}"><b>${p.featured ? '★ ' : ''}$${esc(p.symbol)}</b><span class="small">${esc(p.name)}${p.mcap != null && !p.featured ? ' · MC ' + RC.fmtUsd(p.mcap) + ' · liq ' + RC.fmtUsd(p.liquidity) : ''}</span><code>${RC.short(p.mint)}</code><button class="btn tiny ghost" data-copy="${p.mint}">Copy CA</button>${p.featured ? `<div class="small kibnote">${p.mcap != null ? 'MC ' + RC.fmtUsd(p.mcap) + ' · liq ' + RC.fmtUsd(p.liquidity) + ' · ' : ''}${esc(p.note || "If $KIBBLE doesn't appear under Custom Pairs when you paste the CA, it isn't available as a pair yet.")}</div>` : ''}</div>`).join('')
      + `<div class="small">${r.rules ? `Inu/Doge pairs shown only while market cap ≥ ${RC.fmtUsd(r.rules.minMcapUsd)}, liquidity ≥ ${RC.fmtUsd(r.rules.minLiquidityUsd)} and RugCheck shows no danger (checked live). $KIBBLE is always featured (no thresholds), but pump.fun decides whether it can be picked yet.` : 'Pair checks unavailable right now: only $KIBBLE shown.'}</div>`;
    el.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => copyText(b.dataset.copy)); });
  if (tab === 'board') { renderRegBoard(); refreshRegistry(true); } else if (tab === 'kibble') { refreshRealStats(); loadClean([RC.KIBBLE.mint]); (VFX.on ? Promise.resolve() : VF.fetchVerified([RC.KIBBLE.mint])).then(() => { const el = document.querySelector(`[data-vfslot="${RC.KIBBLE.mint}"]`); if (el) el.innerHTML = vfBadge(RC.KIBBLE.mint, !!el.querySelector('details[open]')); });
    const mountKs = () => import('./kibblesign.js').then((m) => m.mountSign($('#kibsign'), { onDone: () => VF.fetchVerified([RC.KIBBLE.mint]) })).catch(() => { const el = $('#kibsign'); if (el) el.innerHTML = '<div class="small">Signing card unavailable right now.</div>'; });
    if (panel.sign) { mountKs(); setTimeout(() => $('#kibsign')?.scrollIntoView?.({ block: 'start' }), 300); } if ($('#kib-signopen')) $('#kib-signopen').onclick = () => { panel.sign = true; $('#kib-signopen').remove(); mountKs(); }; }
}
async function copyText(t) { try { await navigator.clipboard.writeText(t); toast('Copied contract address', 'good'); } catch { const i = document.createElement('textarea'); i.value = t; document.body.appendChild(i); i.select(); try { document.execCommand('copy'); toast('Copied', 'good'); } catch { toast(t); } i.remove(); } }
async function registerCoin() {
  const msg = $('#reg-msg'), mint = $('#reg-mint').value.trim(); const say = (t, bad) => { if (msg) { msg.textContent = t; msg.className = 'small ' + (bad ? 'bad' : 'good'); } };
  if (!RC.isMint(mint)) return say('Paste a Solana mint address (32-44 letters/numbers).', true);
  if (!K.kp) return say('Wallet sign-in is unavailable right now. Try again in a moment.', true);
  try { if (!K.kp.signedIn) { say('Approve the sign-in message in Phantom…'); if (!K.kp.address) await K.kp.connect?.(); await K.kp.signIn(); } } catch (e) { return say('Sign-in cancelled: ' + (e.message || e), true); }
  say('Checking pump.fun creator on-chain…');
  const verified = !!$('#reg-verified')?.checked;
  const r = await RC.postCoins({ action: 'register', mint, ...(verified ? { verified: true } : {}) }, { session: K.kp.session });
  if (!r.ok) return say(r.reason, true);
  say((r.already ? (r.optedIn ? 'Already registered: opted in to Verified Launch checks.' : 'Already registered.') : `Registered! Verified you created it${r.coin.pairedWithKibble ? ' · paired with $KIBBLE ✓' : ''}.`) + (verified && (r.optedIn || !r.already) ? ' Verified Launch checks start now (about 15 minutes per refresh).' : '')); refreshRegistry(true);
}
function renderRegBoard() { const el = $('#regboard'); if (!el) return;
  const cc = $('#vfcard'); if (cc && panel?.coin) { if (cc.querySelector('[data-vfslot] details[open]')) panel.vfOpen = true; cc.innerHTML = coinCardHtml(panel.coin); }
  if (REG.offline) { el.innerHTML = `<p class="small">Coin board is offline right now (${esc(REG.reason || 'unavailable')}). Your coin is still live on pump.fun.</p>`; return; }
  if (!REG.coins.length) { el.innerHTML = '<p class="small">No player coins registered yet. Be the first: launch on pump.fun, then register it here.</p>'; return; }
  el.innerHTML = REG.coins.map((c) => { const st = RC.statsOf(c.mint); return `<div class="regcoin" data-mint="${c.mint}"><div><b>$${esc(st?.symbol || c.symbol || '???')}</b> ${esc(st?.name || c.name || '')} ${c.pairedWithKibble ? '<span class="chip">paired with $KIBBLE</span>' : c.quote && c.quote !== 'SOL' ? `<span class="chip">paired with $${esc(c.quote)}</span>` : ''}
     <div class="small">CA <code>${RC.short(c.mint)}</code> · creator ${RC.short(c.creator)} (verified)</div>
     <div class="small">Price ${RC.fmtUsd(st?.priceUsd)} · MC ${RC.fmtUsd(st?.mcap)} · 24h ${RC.fmtPct(st?.change24)}</div>${c.fixture ? '<span class="vf-fx">TEST FIXTURE</span>' : ''}${vfSlot(c.mint)}${c.fixture ? '' : cleanSlot(c.mint)}</div>
     <div class="row"><a class="btn tiny green" href="${RC.PUMP_COIN(c.mint)}" target="_blank" rel="noopener noreferrer">pump.fun</a><button class="btn tiny alt" data-card="${c.mint}">Card</button><button class="btn tiny ghost" data-copy="${c.mint}">Copy CA</button><button class="btn tiny red" data-report="${c.mint}">Report</button></div></div>`; }).join('');
  el.querySelectorAll('[data-copy]').forEach((b) => b.onclick = () => copyText(b.dataset.copy));
  el.querySelectorAll('[data-card]').forEach((b) => b.onclick = () => { panel.coin = b.dataset.card; panel.vfOpen = false; const cc = $('#vfcard'); if (cc) { cc.innerHTML = coinCardHtml(panel.coin); bindCoinCard(); cc.scrollIntoView?.({ block: 'nearest' }); } });
  bindCoinCard(); loadClean(REG.coins.filter((c) => !c.fixture).map((c) => c.mint));
  el.querySelectorAll('[data-report]').forEach((b) => b.onclick = async () => { if (!confirm('Report this coin as a scam, impersonation or offensive? Coins with several reports are hidden until reviewed.')) return;
    const r = await RC.postCoins({ action: 'report', mint: b.dataset.report, reason: 'player report' }); toast(r.ok ? (r.hidden ? 'Reported. Hidden pending review.' : 'Reported. Thanks!') : r.reason, r.ok ? 'good' : 'bad'); refreshRegistry(true); });
}
// Clean Launch badges: slots render from cache instantly, then refresh from /api/coins?clean= (server-cached on-chain checks).
const cleanSlot = (mint) => `<div class="clslot" data-cleanslot="${mint}">${CL.badgeHtml(mint)}</div>`;
const CLEAN_SEEN = new Map();
async function loadClean(mints, force, tries = 0) { const want = mints.filter((m) => force || !(Date.now() - (CLEAN_SEEN.get(m) || 0) < 5 * 60_000) || CL.pending(CL.cleanOf(m))); if (!want.length) return;
  want.forEach((m) => CLEAN_SEEN.set(m, Date.now())); await CL.fetchClean(want);
  document.querySelectorAll('[data-cleanslot]').forEach((el) => { const m = el.dataset.cleanslot; if (!want.includes(m)) return; const open = !!el.querySelector('details[open]'); el.innerHTML = CL.badgeHtml(m, { open }); });
  if (want.some((m) => CL.pending(CL.cleanOf(m)))) { if (tries < 6) setTimeout(() => loadClean(want.filter((m) => CL.pending(CL.cleanOf(m))), true, tries + 1), 8000); } }
globalThis.__clean = (m) => CL.cleanOf(m);
// Coin card (from a board row's Card button or a tapped coin ad): name, ticker, CA, live stats, links + the Verified Launch badge.
function coinCardHtml(mint) { const c = mint && REG.coins.find((x) => x.mint === mint); if (!c) return ''; const st = RC.statsOf(mint);
  return `<div class="vf-card" data-coincard="${esc(mint)}"><div class="row" style="justify-content:space-between;margin:0"><h3>$${esc(st?.symbol || c.symbol || '???')} <span class="small">${esc(st?.name || c.name || '')}</span></h3><button class="btn tiny ghost" data-cardclose>✕</button></div>
    ${c.fixture ? '<span class="vf-fx">TEST FIXTURE</span>' : ''}<div class="small">CA <code>${esc(mint)}</code></div><div class="small">Price ${RC.fmtUsd(st?.priceUsd)} · MC ${RC.fmtUsd(st?.mcap)} · 24h ${RC.fmtPct(st?.change24)}</div>
    ${vfSlot(mint, !!panel?.vfOpen)}<div class="row" style="justify-content:flex-start"><a class="btn tiny green" href="${RC.PUMP_COIN(mint)}" target="_blank" rel="noopener noreferrer">pump.fun ↗</a><a class="btn tiny ghost" href="${RC.DEX_URL(mint)}" target="_blank" rel="noopener noreferrer">DexScreener ↗</a></div></div>`; }
function bindCoinCard() { const x = document.querySelector('[data-cardclose]'); if (x) x.onclick = () => { panel.coin = null; const cc = $('#vfcard'); if (cc) cc.innerHTML = ''; }; }
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
// phone landscape (short screens): the build bar becomes a side panel on the right and the room fills the rest
const buildSide = () => innerHeight < 520 && innerWidth > innerHeight;
function roomGeom() { if (buildSide()) { const W = Math.min(300, Math.floor(innerWidth * 0.38)), cell = Math.floor(Math.min((innerWidth - W - 40) / ROOM_W, (innerHeight - 62) / (ROOM_H + 1.6), 64)); return { cell, ox: Math.floor((innerWidth - W - 10) / 2 - (ROOM_W * cell) / 2), oy: Math.floor(52 + cell * 1.6), side: true }; }
  const bb = document.getElementById('buildbar'), bh = bb && !bb.hidden ? Math.max(190, bb.offsetHeight + 24) : 190; // keep the floor clear of the (taller) build bar
  const cell = Math.floor(Math.min((innerWidth - 60) / ROOM_W, (innerHeight - 80 - bh) / (ROOM_H + 1.6), 64)); const ox = Math.floor(innerWidth / 2 - (ROOM_W * cell) / 2), oy = Math.floor(80 + cell * 1.6); return { cell, ox, oy }; }
// ---- Round 4: share your home + guestbook (src/homeshare.js, api/home.js) ----
const HOME = homeApi('');
// Unique map-plot ownership (one wallet per plot). Demo stays local-only; live claims register on the server first.
async function refreshPlotOwners() {
  if (!state || DEMO) return null;
  try {
    const j = await HOME.plots(K.kp?.session || null);
    state.plotOwners = j.plots || {};
    const dropped = reconcilePlots(state, state.plotOwners);
    if (dropped.length) { toast(`Plot ${dropped.map((x) => x.toUpperCase()).join(', ')} already had an owner — cleared from this save.`, 'bad'); persist(); }
    return state.plotOwners;
  } catch { return state.plotOwners || null; }
}
async function registerPlotClaim(plotId) {
  if (DEMO || !K.kp) return { ok: true, local: true };
  if (!K.kp.session) {
    try { if (!K.kp.address) await K.kp.connect?.(); await K.kp.signIn(); } catch (e) { return { ok: false, reason: 'Sign in with Phantom to claim a plot (one owner each).' }; }
  }
  if (!K.kp.session) return { ok: false, reason: 'Sign in with Phantom to claim a plot (one owner each).' };
  try {
    const j = await HOME.claimPlot(plotId, state.player?.name, K.kp.session);
    state.plotOwners = state.plotOwners || {};
    state.plotOwners[plotId] = { short: j.short, name: j.name || state.player?.name, mine: true, at: new Date().toISOString() };
    return { ok: true, already: !!j.already };
  } catch (e) {
    if (e.status === 409) return { ok: false, reason: e.message || 'That plot already has an owner', taken: true };
    return { ok: false, reason: e.message || 'Could not claim plot' };
  }
}
function enterHomeWalk(plotId, readOnly, opt = {}) {
  const home = opt.home || (readOnly && !opt.shared ? npcHome(plotId) : state.plots[plotId]);
  if (!home) return;
  const sceneId = 'home:' + (opt.shared?.id || plotId);
  const npc = NPC_HOMES.find((h) => h.id === plotId);
  const name = opt.shared?.name ? `${opt.shared.name}'s Home` : (readOnly && npc ? `${npc.owner}'s Home` : `${state.player.name}'s Home`);
  installHomeScene(sceneId, home, { plotId: opt.shared ? 'share' : plotId, name, readOnly: !!readOnly || !!opt.shared, shared: opt.shared || null });
  const door = opt.shared ? null : (interactables(state).find((i) => i.id === plotId) || { kind: readOnly ? 'visit' : 'plot', id: plotId, tx: 0, ty: 0 });
  if (door) lastDoor = door;
  enterRoom(sceneId, 'door', door);
}

let pubT = 0, pubBusy = false;
function sharedHomeId() { const sh = state?.homeShare; return sh && sh.open !== false && ((sh.pubKey && myHomePlot(state)) || sh.shopPubKey) ? sh.id : null; } // also identifies your published shop ("Visit shop")
function schedulePublish() { clearTimeout(pubT); pubT = setTimeout(() => publishHome(), 2500); }
async function publishHome(force) { clearTimeout(pubT); const pid = myHomePlot(state); if (!pid || pubBusy) return; const sh = ensureShare(state); if (sh.open === false) return;
  const layout = layoutOf(state.plots[pid]), key = layoutKey(layout) + '|' + state.player.name; if (!force && key === sh.pubKey) return;
  pubBusy = true; try { await HOME.publish(sh, state.player.name, layout); sh.pubKey = key; sh.pubAt = Date.now(); save(state, localStorage); globalThis.__homePublished = (globalThis.__homePublished || 0) + 1; }
  catch (e) { if (e.status === 403) { delete state.homeShare; ensureShare(state); save(state, localStorage); } else if (e.status === 429) schedulePublish(); } finally { pubBusy = false; } }
const gbWhen = (iso) => { const d = new Date(iso); return isNaN(d) ? '' : d.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }); };
function gbList(book, own) { if (!book) return '<div class="small">Loading guestbook…</div>'; if (!book.length) return `<div class="small">${own ? 'No guestbook entries yet. Visitors can sign it from your home.' : 'No entries yet. Be the first to sign!'}</div>`;
  return `<div class="gblist">${book.map((e) => `<div class="gbe"><b>${esc(e.name)}</b> <span class="small">${gbWhen(e.at)}</span>${own ? ` <button class="btn ghost gbdel" data-gbdel="${esc(e.i)}" title="Delete this entry">Delete</button>` : ''}<div>${esc(e.text)}</div></div>`).join('')}</div>`; }
async function loadOwnBook() { if (!state.homeShare?.pubKey) { build.book = []; return buildBar(); } try { const j = await HOME.book(state.homeShare); if (build && !build.readOnly) { build.book = j.book; buildBar(); $('#gbown')?.scrollIntoView({ block: 'nearest' }); } } catch { if (build) { build.book = []; buildBar(); } } }
async function visitShared(id, name) { if (!validHomeId(id) || !(mode === 'world' || mode === 'room') || panel) return; let j;
  try { j = await HOME.get(id); } catch (e) { return toast(e.status === 404 ? `${name || 'That player'} hasn't opened their home to visitors yet.` : 'Could not reach that home right now.', 'bad'); }
  const home = cleanLayout(j.layout); if (!home || !(mode === 'world' || mode === 'room')) return;
  if (mode === 'room') roomBuild = { id: RP.id, at: { x: RP.R.p.x, y: RP.R.p.y, face: player.face } };
  enterHomeWalk(id, true, { home, shared: { id, name: j.name || name || 'A pup', book: j.book || [] } }); }
function sharedBuildBar(bb) { const sh = build.shared, h = build.home;
  bb.innerHTML = `<div class="bb-col" style="flex:1"><h3>Visiting ${esc(sh.name)}'s home</h3><div class="small">${h.items.length} pieces of furniture. Sign the guestbook! Be kind: it's filtered like chat (no links, addresses or seed phrases).</div>
   <div class="row gbsign"><input id="gbtext" maxlength="${GB.TEXT_MAX}" placeholder="Write in ${esc(sh.name)}'s guestbook…" autocomplete="off" enterkeyhint="send"><button class="btn alt" id="gbsign">Sign</button></div>
   <div class="gb">${gbList(sh.book, false)}</div></div><div class="bb-col"><button class="btn" id="bexit">Leave</button></div>`;
  $('#bexit').onclick = exitBuild; const inp = $('#gbtext'); inp.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') $('#gbsign').click(); };
  $('#gbsign').onclick = async () => { const c = cleanEntry(state.player.name, inp.value); if (!c.ok) return toast(c.reason, 'bad'); const btn = $('#gbsign'); btn.disabled = true;
    try { const r = await HOME.sign(sh.id, state.player.name, inp.value); if (build?.shared === sh) { sh.book = [r.entry, ...sh.book].slice(0, GB.MAX); toast(`Signed ${sh.name}'s guestbook`, 'good'); buildBar(); globalThis.__gbSigned = r.entry; } }
    catch (e) { toast(e.message || 'Could not sign right now', 'bad'); if (build?.shared === sh) btn.disabled = false; } }; }
function roomCell(sx, sy) { const { cell, ox, oy } = roomGeom(); return { x: Math.floor((sx - ox) / cell), y: Math.floor((sy - oy) / cell) }; }
function enterBuild(id, readOnly, opt = {}) {
  const pack = id === 'clubhouse';
  feel.fade(); uiOpen(); mode = 'build'; const home = opt.home || (pack ? myPack(state).clubhouse : readOnly ? npcHome(id) : state.plots[id]);
  build = { plotId: id, readOnly, pack, home, sel: null, hover: null, picked: null, shared: opt.shared || null, gb: false };
  if (!readOnly && !pack && state.plots[id]) { const sh = ensureShare(state); if (sh.plot !== id) { sh.plot = id; sh.pubKey = null; } } document.body.classList.add('building');
  $('#prompt').hidden = true; $('#minimap-wrap').hidden = true; wayUi(false); buildBar();
}
function exitBuild() { doorExit(doorSt, time); document.body.classList.remove('building'); const wasShared = !!build?.shared || !!build?.shop, wasOwn = build && !build.readOnly && !build.pack && !build.shop; if (build?.shop?.own) publishShop(); if (wasOwn) publishHome(); if (roomBuild) { const rb = roomBuild; const b = build; roomBuild = null; feel.fade(); uiClose();
    // Refresh walkable home scene so new furniture blocks movement the same way outdoors solids do.
    if (rb.id?.startsWith('home:') && b) {
      const home = b.home || state.plots[b.plotId];
      if (home) installHomeScene(rb.id, home, { plotId: b.shared ? 'share' : b.plotId, name: RP.sc?.name, readOnly: !!b.readOnly || !!b.shared, shared: b.shared || null });
    }
    build = null; $('#buildbar').hidden = true; mode = 'room'; RP.enter(rb.id, rb.at); return; }
  if (!wasShared && lastDoor && (lastDoor.kind === 'plot' || lastDoor.kind === 'visit' || lastDoor.kind === 'clubhouse')) { const o = outsideOf(lastDoor); Object.assign(state.player, { x: o.x, y: o.y }); player.face = o.face; } feel.fade(); uiClose(); mode = 'world'; build = null; $('#buildbar').hidden = true; $('#minimap-wrap').hidden = false; wayUi(true); persist(); }
function rotateSel() { if (build?.shop) return shopRotate(); if (build?.sel) { build.sel.rot = (build.sel.rot + 1) % 4; } else if (build?.picked) { const it = build.picked; const r = build.pack ? movePackFurniture(state, it.uid, it.x, it.y, (it.rot + 1) % 4) : moveFurniture(state, build.plotId, it.uid, it.x, it.y, (it.rot + 1) % 4); if (!r.ok) toast('No room to rotate here', 'bad'); persist(); } }
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
  const bb = $('#buildbar'); bb.hidden = false; if (build.shop) return shopBar(bb); const h = build.home;
  if (build.pack) return packBuildBar(bb, h);
  if (build.shared) return sharedBuildBar(bb);
  if (build.readOnly) { const n = NPC_HOMES.find((x) => x.id === build.plotId); bb.innerHTML = `<div style="flex:1"><h3>Visiting ${n.owner}'s home</h3><div class="small">Get inspired! ${n.owner} decorated with ${h.items.length} pieces.</div></div><button class="btn" id="bexit">Leave</button>`; $('#bexit').onclick = exitBuild; return; }
  const inv = Object.entries(state.inventory);
  bb.innerHTML = `<div class="bb-col" style="flex:1"><h3>Build mode — your inventory</h3><div class="inv" id="inv">${inv.length ? inv.map(([id, n]) => `<button data-inv="${id}" class="${build.sel?.id === id && build.sel.kind === 'new' ? 'sel' : ''}">${FURNITURE[id].name} ×${n}</button>`).join('') : '<span class="small">Empty — buy furniture at Paws & Pillows.</span>'}</div>
   <div class="small">Click an item, then click the floor to place · <b>R</b> rotate · click placed furniture to move/rotate/store/sell</div>
   ${build.plotId === myHomePlot(state) ? `<div class="up" style="margin-top:4px"><button class="btn ${state.homeShare?.open === false ? 'ghost' : 'alt'}" id="bopen" title="Players see 'Visit home' next to your name in the multiplayer list">Visitors: ${state.homeShare?.open === false ? 'closed' : 'welcome'}</button><button class="btn ghost" id="bgb">Guestbook${build.book ? ' (' + build.book.length + ')' : ''}</button></div>` : ''}
   <div id="pickbar">${build.picked ? `<b>${FURNITURE[build.picked.id].name}</b> <button class="btn ghost" id="pmove">Move</button> <button class="btn ghost" id="prot">Rotate</button> <button class="btn ghost" id="pstore">Store</button> <button class="btn red" id="psell">Sell (+${Math.floor(FURNITURE[build.picked.id].price / 2)})</button>` : ''}</div></div>
   <div class="bb-col"><b>Walls</b><div class="up">${WALLS.map((w, i) => `<button class="btn ${h.wall === i ? 'alt' : 'ghost'}" data-wall="${i}">${w.name}${w.price ? ' ' + w.price : ''}</button>`).join('')}</div>
   <b>Floor</b><div class="up">${FLOORS.map((w, i) => `<button class="btn ${h.floor === i ? 'alt' : 'ghost'}" data-floor="${i}">${w.name}${w.price ? ' ' + w.price : ''}</button>`).join('')}</div></div>
   <div class="bb-col"><button class="btn alt" id="bmail">Mailbox (${unreadMail(state)} new)</button><button class="btn" id="bexit">Exit home</button></div>
   ${build.gb ? `<div class="bb-col gb" id="gbown" style="flex-basis:100%">${gbList(build.book, true)}</div>` : ''}`;
  bb.querySelector('#inv').onclick = (e) => { const b = e.target.closest('[data-inv]'); if (b) { build.sel = { kind: 'new', id: b.dataset.inv, rot: 0 }; build.picked = null; buildBar(); } };
  bb.querySelectorAll('[data-wall],[data-floor]').forEach((b) => b.onclick = () => { const kind = b.dataset.wall != null ? 'wall' : 'floor'; const r = upgrade(state, build.plotId, kind, +(b.dataset.wall ?? b.dataset.floor)); if (r.ok) { toast('Upgraded!', 'good'); hud(); persist(); buildBar(); } else toast(r.reason, 'bad'); });
  $('#bexit').onclick = exitBuild; $('#bmail').onclick = () => openPanel('mail');
  if ($('#bopen')) { $('#bopen').onclick = () => { const sh = ensureShare(state); sh.open = sh.open === false; toast(sh.open ? 'Visitors welcome: others can visit and sign your guestbook.' : 'Home closed to visitors.', 'good'); if (sh.open) publishHome(true); persist(); buildBar(); };
    $('#bgb').onclick = () => { build.gb = !build.gb; buildBar(); if (build.gb) loadOwnBook(); }; }
  $('#gbown')?.addEventListener('click', async (e) => { const b = e.target.closest('[data-gbdel]'); if (!b) return; b.disabled = true;
    try { await HOME.del(state.homeShare, b.dataset.gbdel); build.book = (build.book || []).filter((x) => x.i !== b.dataset.gbdel); toast('Entry deleted', 'good'); } catch (er) { toast(er.message || 'Could not delete', 'bad'); } if (build) buildBar(); });
  if (build.picked) {
    const it = build.picked;
    $('#pmove').onclick = () => { build.sel = { kind: 'move', id: it.id, uid: it.uid, rot: it.rot }; build.picked = null; buildBar(); };
    $('#prot').onclick = () => { rotateSel(); buildBar(); };
    $('#pstore').onclick = () => { storeFurniture(state, build.plotId, it.uid); build.picked = null; persist(); buildBar(); };
    $('#psell').onclick = () => { const r = sellPlaced(state, build.plotId, it.uid); if (r.ok) toast(`Sold for ${r.refund} bones`, 'good'); build.picked = null; hud(); persist(); buildBar(); };
  }
}
function renderBuild() { if (build.shop) return renderShopInterior();
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
  else if (!build.shared) { const ni = +build.plotId.slice(1) - 1; if (!build.readOnly && statusGlow(state)) { ctx.save(); ctx.translate(ox + ROOM_W * cell - cell * 0.6, oy - cell * 0.2); drawFlair(ctx, statusGlow(state), performance.now() / 1000); ctx.restore(); } if (!build.readOnly && hasCustomLook(state)) drawProfileShiba(ctx, ox + ROOM_W * cell - cell * 0.6, oy - cell * 0.2, myProfile(), { scale: 1.5 }); else drawShiba(ctx, ox + ROOM_W * cell - cell * 0.6, oy - cell * 0.2, { coat: build.readOnly ? ['tan', 'dark', 'cream', 'red'][ni] : state.player.coat, outfit: build.readOnly ? NPC_OUTFITS[ni] : state.wardrobe.equipped, scale: 1.5 }); }
  ctx.fillStyle = '#f2cc68'; ctx.font = (buildSide() ? '12px' : '18px') + ' Silkscreen, monospace'; ctx.textAlign = 'center'; const tx = buildSide() ? Math.floor((innerWidth - Math.min(300, Math.floor(innerWidth * 0.38)) - 10) / 2) : innerWidth / 2, ty = buildSide() ? 18 : 70;
  if (!buildSide()) ctx.fillText(build.pack ? `${myPack(state).name} [${myPack(state).tag}] Clubhouse — decorate together` : build.shared ? `${build.shared.name}'s Home${build.shared.book ? ' · Guestbook ' + build.shared.book.length : ''}` : build.readOnly ? `${NPC_HOMES.find((x) => x.id === build.plotId).owner}'s Home` : `${state.player.name}'s Home — Build & Decorate`, tx, ty);
}

// ---------------- Shop interiors (src/interiors.js + src/interiorart.js; cosmetic only) ----------------
// Leased shops (and the NPC rival shops) have an inside: a themed layout drawn ONCE to a cached layer (shopLayer) and redrawn
// only when it changes. The owner arranges it (tap a storeroom item then a floor cell to place; tap a placed prop for
// Move / Rotate / Remove). A copy is published to /api/home (op "shop", owner key = your home-share key) so other players can
// visit it from the multiplayer list ("Visit shop"); visitors fetch it on entry.
const SHOPAPI = IN.shopApi(''), shopLayer = createShopLayer();
let shopPubT = 0, shopPubBusy = false;
function shopGeom() { const C = IN.COLS, Rr = IN.ROWS; if (buildSide()) { const W = Math.min(300, Math.floor(innerWidth * 0.38)), cell = Math.floor(Math.min((innerWidth - W - 40) / C, (innerHeight - 70) / (Rr + 1.5), 60)); return { cell, ox: Math.floor((innerWidth - W - 10) / 2 - (C * cell) / 2), oy: Math.floor(56 + cell * 1.5), side: true }; }
  const bb = document.getElementById('buildbar'), bh = bb && !bb.hidden ? Math.max(150, bb.offsetHeight + 24) : 150; const cell = Math.floor(Math.min((innerWidth - 60) / C, (innerHeight - 80 - bh) / (Rr + 1.5), 60)); return { cell, ox: Math.floor(innerWidth / 2 - (C * cell) / 2), oy: Math.floor(80 + cell * 1.5) }; }
function shopCell(sx, sy) { const { cell, ox, oy } = shopGeom(); return { x: Math.floor((sx - ox) / cell), y: Math.floor((sy - oy) / cell) }; }
function openShopView(shop) { if (panel) closePanel(); feel.fade(); uiOpen(); mode = 'build'; build = { shop, readOnly: !shop.own, sel: null, picked: -1, hover: null }; document.body.classList.add('building'); $('#prompt').hidden = true; $('#minimap-wrap').hidden = true; wayUi(false); buildBar(); }
function enterShop(lotId) { const m = state.biz?.mine, rival = bizRivalAt(lotId);
  if (m && m.lot === lotId) { IN.ensureInterior(state); return openShopView({ own: true, lot: lotId, type: m.type, name: m.name, get items() { return state.biz.mine.interior.items; }, get rev() { return state.biz.mine?.interior?.rev | 0; } }); }
  if (rival) return openShopView({ own: false, lot: lotId, type: rival.type, name: rival.name, owner: rival.owner, items: IN.STARTER[rival.type], rev: 'npc' + lotId });
  toast('Lease this lot to open your own shop here.', 'bad'); }
async function visitShop(homeId, name) { const sid = IN.shopIdOf(homeId); if (!sid || !(mode === 'world' || mode === 'room') || panel) return; let j;
  try { j = await SHOPAPI.get(sid); } catch (e) { return toast(e.status === 404 ? `${name || 'That player'} hasn't opened a shop to visitors yet.` : 'Could not reach that shop right now.', 'bad'); }
  const c = IN.cleanShopPayload(j.layout && Array.isArray(j.layout.items) ? IN.toWire(j.layout) : j.layout); if (!c.ok || !(mode === 'world' || mode === 'room')) return toast('That shop layout could not be read.', 'bad');
  if (mode === 'room') roomBuild = { id: RP.id, at: { x: RP.R.p.x, y: RP.R.p.y, face: player.face } };
  openShopView({ own: false, visit: true, lot: c.layout.lot, type: c.layout.type, name: c.layout.name || 'Shop', owner: j.owner || name || 'A pup', items: c.layout.items, rev: 'v' + sid + (j.updatedAt || '') }); }
function scheduleShopPublish() { clearTimeout(shopPubT); shopPubT = setTimeout(() => publishShop(), 2500); }
async function publishShop() { clearTimeout(shopPubT); const m = state?.biz?.mine; if (!m?.interior || shopPubBusy) return; const sh = ensureShare(state); if (sh.open === false) return;
  const lay = IN.payloadOf(m), key = IN.layoutKey(lay) + '|' + state.player.name; if (key === sh.shopPubKey) return; if (!IN.cleanShopPayload(lay).ok) return;
  shopPubBusy = true; try { await SHOPAPI.publish(sh, state.player.name, lay); sh.shopPubKey = key; save(state, localStorage); globalThis.__shopPublished = (globalThis.__shopPublished || 0) + 1; }
  catch (e) { if (e.status === 429) scheduleShopPublish(); } finally { shopPubBusy = false; } }
const shopItems = () => build.shop.items;
function shopClick(c) { if (!build?.shop?.own) return; const s = build.sel; if (c.x < 0 || c.y < 0 || c.x >= IN.COLS || c.y >= IN.ROWS) { if (!s) { build.picked = -1; buildBar(); } return; }
  if (s?.kind === 'new') { const r = IN.placeProp(state, s.id, c.x, c.y, s.rot); if (r.ok) { blip(880); if (!(IN.invOf(state)[s.id] > 0)) build.sel = null; persist(); } else toast(r.reason, 'bad'); return buildBar(); }
  if (s?.kind === 'move') { const r = IN.moveProp(state, s.idx, c.x, c.y, s.rot); if (r.ok) { build.sel = null; build.picked = -1; persist(); } else toast(r.reason, 'bad'); return buildBar(); }
  build.picked = IN.propAt(shopItems(), c.x, c.y); buildBar(); }
function shopRotate() { if (!build?.shop?.own) return; if (build.sel) { build.sel.rot = (build.sel.rot + 1) % 4; return buildBar(); } if (build.picked >= 0) { const r = IN.rotateProp(state, build.picked); if (!r.ok) toast(r.reason, 'bad'); else persist(); buildBar(); } }
function shopBar(bb) { const sh = build.shop, items = shopItems();
  if (!sh.own) { bb.innerHTML = `<div class="bb-col" style="flex:1"><h3>${esc(sh.name)}</h3><div class="small">${sh.visit ? `${esc(sh.owner)}'s shop` : `Run by ${esc(sh.owner)}`} · ${items.length} fittings</div><div class="small">Shop interiors are cosmetic: they never change what a shop earns.</div></div><div class="bb-col"><button class="btn" id="bexit">Leave</button></div>`; $('#bexit').onclick = exitBuild; return; }
  const m = state.biz.mine, inv = Object.entries(IN.invOf(state)), cap = IN.propCap(m), p = build.picked >= 0 ? items[build.picked] : null;
  bb.innerHTML = `<div class="bb-col shopbar" style="flex:1"><h3>Arrange ${esc(m.name)} <span class="small">${items.length}/${cap} props</span></h3>
   <div class="small">${build.sel ? `Tap the floor to ${build.sel.kind === 'new' ? 'place' : 'move'} <b>${IN.PROPS[build.sel.id].name}</b> · ↻ rotates` : p ? '' : 'Tap a prop in the shop, or pick one from the storeroom.'}</div>
   <div id="pickbar">${p ? `<b>${IN.PROPS[p.id].name}</b><div class="up"><button class="btn ghost" id="smove">Move</button><button class="btn ghost" id="srot">↻ Rotate</button><button class="btn red" id="srem">Remove</button></div>` : build.sel ? `<div class="up"><button class="btn ghost" id="srot">↻ Rotate</button><button class="btn ghost" id="scan">Cancel</button></div>` : ''}</div>
   <b>Storeroom</b><div class="inv shopinv" id="sinv">${inv.length ? inv.map(([id, n]) => `<button data-sinv="${id}" class="${build.sel?.kind === 'new' && build.sel.id === id ? 'sel' : ''}">${IN.PROPS[id].name} ×${n}</button>`).join('') : '<span class="small">Empty. Removed props land here; buy Bones sets or $KIBBLE props on the shop panel.</span>'}</div>
   <div class="small">Cosmetic only: props never change sales. Bigger Shelves L${m.up.shelves} → ${cap} props.${IN.windowShows(m) ? ' Window Display shows this layout from the street.' : ''}</div></div>
   <div class="bb-col"><button class="btn ghost" id="sreset">Starter layout</button><button class="btn" id="bexit">Exit shop</button></div>`;
  $('#bexit').onclick = exitBuild;
  $('#sinv').onclick = (e) => { const b = e.target.closest('[data-sinv]'); if (!b) return; build.sel = { kind: 'new', id: b.dataset.sinv, rot: 0 }; build.picked = -1; buildBar(); };
  $('#sreset').onclick = () => { IN.resetStarter(state); build.sel = null; build.picked = -1; persist(); buildBar(); toast('Starter layout restored', 'good'); };
  if ($('#srot')) $('#srot').onclick = () => shopRotate(); if ($('#scan')) $('#scan').onclick = () => { build.sel = null; buildBar(); };
  if (p) { $('#smove').onclick = () => { build.sel = { kind: 'move', id: p.id, idx: build.picked, rot: p.rot }; buildBar(); }; $('#srem').onclick = () => { const r = IN.removeProp(state, build.picked); if (r.ok) { build.picked = -1; persist(); } buildBar(); }; } }
function renderShopInterior() { const dpr = devicePixelRatio; ctx.setTransform(dpr, 0, 0, dpr, 0, 0); ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#121a36'; ctx.fillRect(0, 0, innerWidth, innerHeight);
  const sh = build.shop, { cell, ox, oy } = shopGeom(), items = sh.items, hr = ((state.clockSec || 0) % DAY_LEN) / (DAY_LEN / 24), night = hr < 6 || hr >= 19;
  const hide = build.sel?.kind === 'move' ? build.sel.idx : -1;
  shopLayer.draw(ctx, { type: sh.type, name: sh.name, items, rev: sh.rev, ox, oy, cell, dpr, night, grid: sh.own, hide });
  if (build.picked >= 0 && items[build.picked]) { const o = items[build.picked], f = IN.footprint(o.id, o.rot); ctx.strokeStyle = '#6c4fd0'; ctx.lineWidth = 3; ctx.setLineDash([6, 4]); ctx.strokeRect(ox + o.x * cell, oy + o.y * cell, f.w * cell, f.h * cell); ctx.setLineDash([]); }
  if (build.sel && build.hover) { const s = build.sel, c = build.hover, f = IN.footprint(s.id, s.rot), ok = IN.canPlace(items, s.id, c.x, c.y, s.rot, s.kind === 'move' ? items[s.idx] : null).ok;
    ctx.fillStyle = ok ? 'rgba(63,166,106,0.3)' : 'rgba(217,83,79,0.35)'; ctx.fillRect(ox + c.x * cell, oy + c.y * cell, f.w * cell, f.h * cell); drawShopProp(ctx, s.id, ox + c.x * cell, oy + c.y * cell, cell, s.rot, 0.75); }
  // shopkeeper behind the first counter (+ your hired staff, which already exist in biz.js; drawn only, no effect)
  const ctr = items.find((o) => IN.PROPS[o.id]?.cat === 'counter' && IN.PROPS[o.id].w >= 2) || items[0], kx = ctr ? ox + (ctr.x + 1) * cell : ox + cell * 2, ky = ctr ? oy + ctr.y * cell - cell * 0.05 : oy + cell;
  const m = sh.own ? state.biz.mine : null, ni = ['P2', 'L3', 'L4'].indexOf(sh.lot);
  if (sh.own && hasCustomLook(state)) drawProfileShiba(ctx, kx, ky, myProfile(), { scale: cell / 40 }); else drawShiba(ctx, kx, ky, { coat: sh.own ? state.player.coat : ['cream', 'tan', 'dark'][Math.max(0, ni)] || 'tan', outfit: sh.own ? state.wardrobe.equipped : NPC_OUTFITS[Math.max(0, ni) % NPC_OUTFITS.length], scale: cell / 40 });
  for (let k = 0; k < (m?.staff || 0); k++) drawShiba(ctx, kx + cell * (1.2 + k * 1.1), ky, { coat: ['tan', 'cream', 'dark'][k % 3], outfit: NPC_OUTFITS[(k + 2) % NPC_OUTFITS.length], scale: cell / 46 });
  if (!buildSide()) { ctx.fillStyle = '#f2cc68'; ctx.font = '16px Silkscreen, monospace'; ctx.textAlign = 'center'; ctx.fillText(sh.own ? `${sh.name} — arrange your shop` : sh.name, innerWidth / 2, 40); } }
globalThis.__shop = { enter: (lot) => enterShop(lot), visit: (h, n) => visitShop(h, n), layer: shopLayer, publish: () => publishShop(), get build() { return build; }, click: (x, y) => shopClick({ x, y }), geom: () => shopGeom(), exit: () => exitBuild() };

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
    body.innerHTML = `${demo}<h2>President's Office</h2><div class="packhead"><span id="presimg"></span><div><h3 style="margin:0">${OWNER.name}</h3><div class="small">${OWNER.title}</div><div class="small">President's treasury (Solana): ${WL.walletHtml(OWNER_WALLET)} <span id="office-note">${esc(officeTreasuryNote(DEMO))}</span></div></div></div>${pools}
      <p class="sub">Fee routing per purchase: 1% → President's Treasury · 0.25% → daily pool · 0.5% → weekly pool · 0.25% → monthly pool. All of the price goes to the treasury wallet; the pools are an off-chain ledger, paid out by rank (see Prize Rules).</p>
      <h3>Fee ledger</h3>${officeLedgerNote(DEMO) ? `<p class="small" id="office-ledger-note">${officeLedgerNote(DEMO)}</p>` : `<div class="board">${m.ledger.map((l) => `<div class="post"><b>${esc(MALL_ITEMS[l.item]?.name || l.item)}</b> price ${fmtK(l.price)} · fee ${fmtK(l.fee)} = owner ${fmtK(l.owner)} + daily ${fmtK(l.daily)} + weekly ${fmtK(l.weekly)} + monthly ${fmtK(l.monthly)}</div>`).join('') || '<p class="small">No purchases yet.</p>'}</div>`}`;
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
    if (panel?.kind === 'cafe' && panel.shift && !panel.shift.settled) { tickShift(panel.shift, dt, rng); if (mode === 'room' && RP.id === 'cafe') CP.tagShift(panel.shift); cafeUi(); }
  }
  MPL.step(dt); // live multiplayer (no-op when not configured)
  if (JOYS && state && (joyT -= dt) <= 0) { joyT = 0.5; const want = joyPref(state); if (want !== JOYS.on) { JOYS.set(want); joyApi.onChange?.(); } } // saved / cloud-loaded Joystick setting
  if (mode === 'world') { updateWorld(dt); renderWorld(); drawSceneBars(); }
  else if (mode === 'room') { updateRoom(dt); RP.render(ctx, devicePixelRatio || 1); }
  else if (mode === 'build') { $('#prompt').hidden = true; renderBuild(); }
  requestAnimationFrame(frame);
}
// Live multiplayer: other players in the same room ('city' while walking the world). Off unless /api/config has a realtimeUrl.
const MPL = createMultiplayer({ toast, onActions: () => wheel.open(), onTrade: (w, name) => openPanel('trade', { short: w, name }), onVisit: (id, name, kind) => (kind === 'shop' ? visitShop(id, name) : visitShared(id, name)), now: () => time, getLocal: () => state && { h: sharedHomeId(), room: mode === 'world' ? 'city' : mode === 'room' && RP.id ? 'r-' + RP.id : null, roomName: mode === 'room' ? RP.sc?.name : null,
  x: mode === 'room' ? RP.R.p.x : state.player.x, y: mode === 'room' ? RP.R.p.y : state.player.y, f: player.face, m: player.moving, r: player.running, d: !!drive, emote: player.emote, act: ACT.act, p: poseCodeOf(ACT),
  name: state.player.name, token: K.kp?.session || null, look: { coat: state.player.coat, eq: state.wardrobe.equipped, pl: cpLook(mpProfile()) }, cp: CMP.F.c && mode === 'world' && !drive ? IQC.wireOffset(CMP.F, state.player) : null } });
// companion id + form ride in the look's pl.look (cpi/cpf); remote clients strip them before reading the Shiba look
function cpLook(pl) { const w = CMP.F.c && mode === 'world' && !drive ? IQC.toWire(CMP.F.c) : null; if (!w) return pl; return pl ? { ...pl, look: { ...pl.look, ...w } } : { look: w, outfit: {} }; }
MPL.start().catch(() => {});
// ---- Founding Five Thousand seat-open notice (ships with kibble-pay tracker; polls /api/tech) ----
const FSN = FS.startFoundingNotice({ toast: (m, k) => toast(m, k), onShow: () => { try { blip(988); setTimeout(() => blip(1318), 120); } catch {} } });
globalThis.__foundingSeats = () => FSN;
// ---- $KIBBLE town mood (src/kibblemood.js + src/moodworld.js): one shared /api/kibble-mood fetch per minute, paused when hidden ----
let crierRing = 0, crierPending = false;
const MOOD = KM.startMood({ apiBase: '', onMood: (m) => { MWd.setMood(m, time); crierPending = true; } });
function moodTick(dt) { if (crierRing > 0) crierRing -= dt; crierNewsTick(); if (crierPending && mode === 'world' && !panel && state) { crierPending = false; announceMood(MWd.MW.mood); } if (panel?.kind === 'kibblemood' && MOOD.current !== panel.shown) { panel.shown = MOOD.current; } }
function announceMood(mood) { if (!MWd.shouldAnnounce(mood, { override: !!MOOD.forced })) return; const line = MWd.crierLine(mood); crierRing = 3; blip(988); setTimeout(() => blip(1318), 140);
  chatSay(MWd.CRIER_NAME, line, time, { force: true, life: 6 }); crierBanner(line); globalThis.__crierSaid = [...(globalThis.__crierSaid || []), mood]; }
function crierBanner(line) { let b = document.getElementById('crier-banner'); if (!b) { b = document.createElement('div'); b.id = 'crier-banner'; b.setAttribute('role', 'status'); document.body.appendChild(b); }
  b.innerHTML = `<b>${esc(MWd.CRIER_NAME)}</b><span>${esc(line)}</span>`; b.className = 'show mood-' + MWd.MW.mood; clearTimeout(b._t); b._t = setTimeout(() => { b.className = ''; }, 6000); }
// ---- Kibble Kennel mirror (cosmetics only; tier API owned by kibble-pay / Inu Empires keeper; contract: kibble-pay docs/KENNEL_API.md) ----
const KEN = { override: KN.overrideTier(), flair: KN.overrideFlair(), peek: KN.peekWallet(), peeking: false, real: null, wall: null, wallet: null, show: KN.showMine(), at: 0 };
function kennelMine() { return KN.myKennel({ override: KEN.override, overrideFlair: KEN.flair, real: KEN.real, show: KEN.show, peek: KEN.peeking }); }
function mpProfile() { const t = KN.lookKennel(kennelMine()), p = hasCustomLook(state) ? myProfile() : null; if (!t) return p; return p ? { ...p, look: { kennel: t, ...p.look } } : { look: { kennel: t }, outfit: {} }; }
async function refreshKennel(force) { const w = K.kp?.signedIn ? K.kp.address : KEN.peek; KEN.peeking = !K.kp?.signedIn && !!KEN.peek; const due = force || w !== KEN.wallet || Date.now() - KEN.at > KN.CACHE_MS; if (!due) return;
  KEN.wallet = w; KEN.at = Date.now(); const [me, wall] = await Promise.all([w ? KN.fetchKennel(w) : Promise.resolve(null), KN.fetchWall()]); KEN.real = me; KEN.wall = wall; }
refreshKennel().then(raidAuto); setInterval(() => refreshKennel().then(raidAuto), 60_000); addEventListener('kibble:wallet', () => refreshKennel(true).then(raidAuto));
// ---- Boss Raids (free for all; Kennel tier or an Inu cosmetic auto-enters you each hour; see inu-shared/boss-raids.md) ----
// Trading Post (Round 3): item-for-item trades, signed messages only, swapped atomically by /api/home op "trade"
const TRD = createTrading({ kp: () => (DEMO ? null : K.kp), getState: () => state, persist: () => persist(), toast, demo: DEMO, nearby: () => MPL.players().map((p) => p.w).filter(Boolean),
  onChange: () => { if (panel?.kind === 'trade') renderTradePanel(); } });
function renderTradePanel() { renderTrade($('#panel-body'), TRD, { open: () => { if (panel?.kind === 'trade') renderTradePanel(); } }); }
setInterval(() => { if (state && !DEMO && K.kp?.session && panel?.kind === 'trade' && !TRD.S.signing && !TRD.S.busy) TRD.refresh(); }, 1500);
setInterval(() => { if (state && !DEMO && K.kp?.session && state.trades?.watch && panel?.kind !== 'trade') TRD.refresh(); }, 45000); // finished trades land even with the panel shut
globalThis.__trade = TRD; // dev/proof hook
const RAPI = RD.raidApi({ session: () => K.kp?.session }), RAID = { entry: null, ev: null };
async function raidAuto() { if (!state || DEMO) return; const ev = raidEventAt(Date.now()); if (RAID.ev !== ev.eventId) { RAID.ev = ev.eventId; RAID.entry = null; }
  try { const r = await RD.autoEnter({ api: RAPI, signedIn: !!K.kp?.session, kennelTier: KEN.real?.tier || null, state }); if (r.entered) { RAID.entry = r.entry || (r.why === 'kennel' ? 'auto:kennel' : 'auto:cosmetic'); if (!r.already) toast(`Auto-entered this hour's Boss Raid: ${ev.bossName}. Free, skill only.`, 'good'); } } catch {} }
globalThis.__raid = () => ({ ...RAID, ui: RD._raid });
globalThis.__kennel = () => ({ ...KEN, mine: kennelMine() });
function kibbleSpot(id) { if (id === 'kwall') { openPanel('kennel'); return; } if (id === 'raidgate') { openPanel('raid'); return; } if (id === 'kstatue') openPanel('kibblemood'); else if (id === 'dailybone') openPanel('dailybone');
  else if (id === 'crier') { crierRing = 1.5; feel.say(MWd.CRIER_NAME, MWd.crierLine(MWd.MW.mood) + ' ' + KM.lineFor(MWd.MW.mood, rng), textBlip); } }
titleScreen(); requestAnimationFrame(frame);
cv.addEventListener('wheel', (e) => { if (mode !== 'world') return; e.preventDefault(); const now = performance.now(); if (now - (cv._wz || 0) < 180) return; cv._wz = now; setZoom(stepZoom(ZOOM, e.deltaY < 0 ? 1 : -1)); }, { passive: false });
{ let pinch = null; const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);
  cv.addEventListener('touchstart', (e) => { if (e.touches.length === 2) pinch = dist(e.touches); }, { passive: true });
  cv.addEventListener('touchmove', (e) => { if (!pinch || e.touches.length !== 2) return; const d = dist(e.touches); if (d / pinch > 1.35) { setZoom(stepZoom(ZOOM, 1)); pinch = d; } else if (pinch / d > 1.35) { setZoom(stepZoom(ZOOM, -1)); pinch = d; } }, { passive: true });
  cv.addEventListener('touchend', (e) => { if (e.touches.length < 2) pinch = null; }, { passive: true }); }
document.getElementById('zin')?.addEventListener('click', () => setZoom(stepZoom(ZOOM, 1))); document.getElementById('zout')?.addEventListener('click', () => setZoom(stepZoom(ZOOM, -1)));
window.__inu = { guide, open: (k, o) => openPanel(k, o), get time() { return time; }, get player() { return player; }, get zoom() { return ZOOM; }, setZoom, president: pres, presVisit: (k) => startVisit(pres, k, { dayLen: DAY_LEN }), setHour: (h) => { dayOffset = timeForHour(h) - time; }, setRain: (r) => { amb.rain = amb.rainTarget = r; amb.weatherT = 999; }, get amb() { return amb; }, get npcs() { return npcs; }, get mood() { return { ...MOOD.current, shown: MWd.MW.mood }; }, emote: (k) => doEmote(k), cam, get state() { return state; }, get mode() { return mode; }, get panel() { return panel?.kind; }, get panelObj() { return panel; }, mp: MPL };
// Inu Arcade inside the desktop overlay: its 🏠 button asks us to close the overlay instead of reloading.
// framed Arcade (hall peek) -> Verse: ready / exit (close + inu:back-to-verse alias) / score. Origin pinned (districts.js). Score = toast only.
addEventListener('message', (e) => { const m = DIS.arcadeMessage(e, new URL(ARCADE.url).origin); if (!m) return; globalThis.__arcadeMsgs = [...(globalThis.__arcadeMsgs || []).slice(-9), m];
  if (m.kind === 'exit') { if (!arcadeOpen) return; closeArcade(); try { e.source?.postMessage({ type: 'inu:verse-closed' }, e.origin); } catch {} }
  else if (m.kind === 'ready') { const b = document.querySelector('#arcade-ov .arc-bar b'); if (b && arcadeOpen) b.textContent = m.cabinetId && m.cabinetId !== 'arcade' ? 'PLAYING ' + DIS.cabTitle(m.cabinetId).toUpperCase() : 'INU ARCADE'; }
  else if (m.kind === 'score' && arcadeOpen) toast(DIS.scoreToast(m), 'good'); });
Object.assign(window.__inu, { act: ACT, doAction: (k) => doAction(k), wheel, hud: () => state && hud() }); // Round 3 test hooks (actions + wheel)
