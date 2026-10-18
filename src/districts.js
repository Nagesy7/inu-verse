// Inu Verse districts (contract: /workspace/inu-shared/verse-districts.md v2). One walkable outdoor zone east of the Arcade
// hall: Arcade Row (one door per live Arcade cabinet) + five themed districts on one boulevard, with signage and fast travel.
// Cabinet doors are TOP-LEVEL same-tab navigations to Inu Arcade with from=verse&district&spawn&return (§3.3–3.4). Players
// come back via ?spawn=door-<cabinet>&district=<id>. Framed postMessages (hall peek) are UX only: ready / exit|close / score.
// Pure data + helpers (headless-tested). Art in districtart.js, wiring in main.js. No economy, prizes or gambling here.
const ST = 32;
export const VERSE_ORIGIN = 'https://inu-verse-tawny.vercel.app';
export const ARCADE_ORIGIN = 'https://inu-arcade.vercel.app';
// frozen district ids (§2.1) -> player-facing generic place names (no game names on the districts themselves)
export const DISTRICTS = Object.freeze([
  { id: 'arcade-row', name: 'Arcade Row', x0: 1, x1: 29, col: '#6c4fd0' },
  { id: 'arena', name: 'The Arena', x0: 30, x1: 50, col: '#d0503a' },
  { id: 'fud-field', name: 'FUD Field', x0: 51, x1: 71, col: '#7a9a3a' },
  { id: 'stadium', name: 'Stadium', x0: 72, x1: 93, col: '#3a7ad0' },
  { id: 'parkour', name: 'Parkour Park', x0: 94, x1: 112, col: '#e08a2a' },
  { id: 'race-park', name: 'Race Park', x0: 113, x1: 130, col: '#c0392b' },
].map(Object.freeze));
// Cabinet gates. live = Arcade route is live per the contract (§3.1) or an Arcade Keeper ping (Shiba Scuffle, 19 Oct 2026).
// name = approved player-facing name; null -> generic label until Zachary names it. Flip one row when a ping lands.
export const CABINETS = Object.freeze([
  { id: 'kibble-chomp', district: 'arcade-row', name: 'Kibble Chomp', live: true },
  { id: 'bark-invaders', district: 'arcade-row', name: 'Bark Invaders', live: true },
  { id: 'pup-crossing', district: 'arcade-row', name: 'Pup Crossing', live: true },
  { id: 'bone-breaker', district: 'arcade-row', name: 'Bone Breaker', live: true },
  { id: 'street-sniffer', district: 'arcade-row', name: null, live: true }, // working name pending Zachary -> generic label
  { id: 'paw-fu-tower', district: 'arcade-row', name: null, live: true }, // working name pending Zachary
  { id: 'bone-digger', district: 'arcade-row', name: null, live: true }, // working name pending Zachary
  { id: 'pips-big-bark', district: 'arcade-row', name: "Pip's Big Bark", live: true },
  { id: 'shiba-scuffle', district: 'arena', name: 'Shiba Scuffle', live: true }, // LIVE: inu-arcade.vercel.app/shiba-scuffle
  { id: 'fud-swarm', district: 'fud-field', name: null, live: false },
  { id: 'zoomie-goals', district: 'stadium', name: null, live: false },
  { id: 'barkour', district: 'parkour', name: null, live: false },
  { id: 'last-pup-standing', district: 'race-park', name: null, live: false },
].map(Object.freeze));
export const district = (id) => DISTRICTS.find((d) => d.id === id) || null;
export const cabinet = (id) => CABINETS.find((c) => c.id === id) || null;
export const spawnId = (cab) => 'door-' + cab.id;
export function label(cab) { if (cab.name) return cab.name; const i = CABINETS.filter((c) => c.district === cab.district).indexOf(cab);
  return cab.district === 'arcade-row' ? `Cabinet ${i + 1}` : `${district(cab.district).name} Cabinet`; }
export const gateText = (cab) => (cab.live ? 'OPEN' : 'COMING SOON');
// §3.4 plain return URL (Verse builds it; the Arcade only honours this origin)
export const returnUrl = (cab) => `${VERSE_ORIGIN}/?spawn=${encodeURIComponent(spawnId(cab))}&district=${encodeURIComponent(cab.district)}`;
// §3.3 door URL. wallet = public base58 address only; p = lite profile (base64url) – hints, never auth. Coming-soon -> null.
export function doorUrl(cab, { wallet = null, p = null } = {}) { if (!cab?.live) return null; const q = new URLSearchParams();
  q.set('from', 'verse'); q.set('district', cab.district); q.set('spawn', spawnId(cab)); q.set('return', returnUrl(cab));
  if (/^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(wallet || '')) q.set('wallet', wallet); if (typeof p === 'string' && /^[\w-]{1,6000}$/.test(p)) q.set('p', p);
  return `${ARCADE_ORIGIN}/${cab.id}?${q.toString()}`; }
// back from the Arcade: ?spawn=door-<id>&district=<id>. Unknown/mismatched ids -> null (the old building spawns still work).
export function parseReturn(search) { let q; try { q = new URLSearchParams(search || ''); } catch { return null; }
  const sp = q.get('spawn') || '', di = q.get('district') || '', m = /^door-([a-z0-9-]{1,40})$/.exec(sp), cab = m ? cabinet(m[1]) : null;
  if (cab) return di && di !== cab.district ? null : { district: cab.district, cabinet: cab.id, spawn: sp };
  if (!sp && district(di)) return { district: di, cabinet: null, spawn: null };
  return null; }
// framed Arcade -> Verse messages (hall peek). Origin pinned; unknown types ignored; exit and close are the same path.
export function arcadeMessage(e, origin = ARCADE_ORIGIN) { if (!e || e.origin !== origin || !e.data || typeof e.data !== 'object') return null; const d = e.data, t = d.type;
  const cab = typeof d.cabinetId === 'string' && /^[a-z0-9-]{1,40}$/.test(d.cabinetId) ? d.cabinetId : null;
  if (t === 'inu-arcade:ready') return { kind: 'ready', cabinetId: cab };
  if (t === 'inu-arcade:exit' || t === 'inu-arcade:close' || t === 'inu:back-to-verse') return { kind: 'exit', cabinetId: cab };
  if (t === 'inu-arcade:score') { const s = Number(d.score); if (!Number.isFinite(s) || s < 0) return null; return { kind: 'score', cabinetId: cab, score: Math.min(Math.floor(s), 99999999), mode: typeof d.mode === 'string' ? d.mode.replace(/[^\w -]/g, '').slice(0, 16) : null }; }
  return null; }
const CAB_TITLE = { 'inu-rescue': 'Inu Rescue', arcade: 'Inu Arcade' };
export const cabTitle = (id) => { const c = cabinet(id); return c ? label(c) : CAB_TITLE[id] || 'Inu Arcade'; };
// UX-only score line (never prize truth; no Bones/$KIBBLE)
export const scoreToast = (m) => `${cabTitle(m.cabinetId)}: ${m.score.toLocaleString('en-AU')} points! Nice run.`;

// ---- the zone map (132 x 22). Rows: 0 trees · 1-2 back lots · 3-7 storefronts/venues · 8 door stand row · 9 sidewalk ·
// 10-12 boulevard · 13 sidewalk · 14-19 district grounds · 20 grass · 21 trees. Exit to the hub at the west end of the road.
export const W = 132, H = 22, ROAD = 10, DOOR_Y = 8;
// structures: multi-tile solid buildings drawn as one sprite (districtart.js). door = the doorway alcove (bottom row, walkable):
// step in from the sidewalk to use it; its neighbours are wall, so walking along the sidewalk never triggers a door.
const BOOTHS = CABINETS.filter((c) => c.district === 'arcade-row').map((c, i) => ({ kind: 'booth', id: c.id, x: 3 + i * 3 + Math.floor(i / 4), y: 4, w: 3, h: 4 }));
const VENUES = [['arena', 'shiba-scuffle', 'arena', 34, 12], ['fud-field', 'fud-swarm', 'barn', 55, 12], ['stadium', 'zoomie-goals', 'stadium', 76, 14], ['parkour', 'barkour', 'tower', 97, 12], ['race-park', 'last-pup-standing', 'grandstand', 116, 12]]
  .map(([d, id, kind, x, w]) => ({ kind, id, district: d, x, y: 3, w, h: 5 }));
export const STRUCTS = Object.freeze([...BOOTHS.map((b) => ({ ...b, district: 'arcade-row' })), ...VENUES, { kind: 'hallside', id: 'hallside', district: 'arcade-row', x: 1, y: 3, w: 2, h: 5 }].map((s) => Object.freeze({ ...s, door: s.id === 'hallside' ? null : [s.x + Math.floor(s.w / 2), s.y + s.h - 1] })));
export const doorOf = (id) => STRUCTS.find((s) => s.id === id)?.door || null;
const KIOSK_DX = 6; // fast-travel post on the south sidewalk, a few tiles into each district
export const kioskOf = (d) => [d.x0 + KIOSK_DX - (d.id === 'arcade-row' ? 2 : 0), ROAD + 4];
export function buildMap() { const g = Array.from({ length: H }, () => new Array(W).fill('g')), set = (x, y, ch) => { if (g[y] && x >= 0 && x < W) g[y][x] = ch; };
  const fill = (x0, y0, w, h, ch) => { for (let y = y0; y < y0 + h; y++) for (let x = x0; x < x0 + w; x++) set(x, y, ch); };
  const hz = (x, y) => (((x * 73856093) ^ (y * 19349663)) >>> 0) % 97;
  for (let y = 1; y < 3; y++) for (let x = 1; x < W - 1; x++) if (hz(x, y) % 7 === 0) set(x, y, 'f'); else if (hz(x, y) % 11 === 0) set(x, y, 'T');
  fill(1, DOOR_Y, W - 2, 2, 'k'); fill(0, ROAD, W - 1, 3, 'r'); for (let x = 0; x < W - 1; x++) set(x, ROAD + 1, x % 4 < 2 ? 'm' : 'r'); fill(1, ROAD + 3, W - 2, 1, 'k');
  for (const s of STRUCTS) fill(s.x, s.y, s.w, s.h, 'x');
  for (const s of STRUCTS) if (s.door) set(s.door[0], s.door[1], 'D');
  for (const d of DISTRICTS) { set(d.x0 + 1, DOOR_Y + 1, 'n'); const [kx, ky] = kioskOf(d); set(kx, ky, 'K'); for (let x = d.x0 + 3; x < d.x1; x += 8) if (g[ROAD + 3][x] === 'k') set(x, ROAD + 3, 'L'); }
  // district grounds (south): arena plaza, crop rows, a pitch, parkour blocks, a race loop
  fill(31, 14, 19, 6, 'p'); for (const x of [34, 38, 42, 46]) set(x, 16, 'b'); for (const x of [33, 47]) set(x, 18, 'F');
  for (let y = 14; y < 20; y++) for (let x = 52; x < 71; x++) set(x, y, y % 2 ? 'c' : 'g'); set(61, 16, 'S');
  fill(73, 14, 20, 6, 'z'); for (let y = 14; y < 20; y++) set(83, y, 'y'); set(73, 16, 'G'); set(92, 16, 'G'); set(73, 17, 'G'); set(92, 17, 'G');
  fill(95, 14, 17, 6, 'p'); for (const [x, y] of [[97, 15], [98, 15], [100, 17], [101, 17], [101, 16], [104, 15], [106, 18], [107, 18], [107, 17], [109, 15]]) set(x, y, 'B'); for (const [x, y] of [[96, 18], [110, 18]]) set(x, y, 'o');
  fill(114, 14, 16, 6, 't'); fill(116, 16, 12, 2, 'g'); for (const x of [117, 121, 125]) set(x, 16, 'o');
  for (const d of DISTRICTS.slice(1)) for (let y = 14; y < 20; y++) set(d.x0, y, 'h');
  for (const [x, y, ch] of [[9, 16, 'b'], [13, 16, 'b'], [20, 16, 'b'], [24, 16, 'b'], [3, 18, 'T'], [11, 18, 'f'], [17, 18, 'T'], [22, 18, 'f'], [27, 18, 'T'], [16, 15, 'F']]) set(x, y, ch);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (x === 0 || y === 0 || x === W - 1 || y === H - 1) if (!(x === 0 && y >= ROAD && y < ROAD + 3)) set(x, y, 'T');
  return g.map((r) => r.join('')); }
// legend: [floor, prop, solid] (floors/props beyond the shared outdoor set are painted by districtart.js)
export const LEGEND = { 'k': ['pave', null, 0], 'r': ['road', null, 0], 'm': ['roadline', null, 0], 'D': ['doorstep', null, 0], 'x': ['pave', null, 1], 'n': ['pave', 'dsign', 1], 'K': ['pave', 'kiosk', 1],
  'L': ['pave', 'streetlamp', 1], 'c': ['crop', null, 0], 'S': ['crop', 'scarecrow', 1], 'z': ['turf', null, 0], 'y': ['turfline', null, 0], 'G': ['turf', 'goal', 1], 'B': ['pave', 'block', 1], 'o': ['pave', 'cone', 1], 't': ['track', null, 0], 'F': ['path', 'flagpole', 1], 'h': ['grass', 'hedge', 1] };
// spots: every door (walk into it or tap A) + every fast-travel post; spawns: hub, each district, each cabinet door
const SPOTS = [...STRUCTS.filter((s) => s.door).map((s) => { const cab = cabinet(s.id); return { id: spawnId(cab), tx: s.door[0], ty: s.door[1], face: 'up', walk: true, name: cab.live ? `${label(cab)} (Inu Arcade)` : `${label(cab)}: coming soon`, act: { panel: 'cabinet', opts: { id: cab.id } }, label: cab.live ? 'Play' : 'Look' }; }),
  ...DISTRICTS.map((d) => { const [kx, ky] = kioskOf(d); return { id: 'kiosk-' + d.id, tx: kx, ty: ky - 1, face: 'down', name: `Fast travel (${d.name})`, act: { panel: 'fasttravel', opts: { from: d.id } }, label: 'Fast travel' }; }),
  ...DISTRICTS.map((d) => ({ id: 'sign-' + d.id, tx: d.x0 + 1, ty: DOOR_Y, face: 'down', name: `${d.name} sign`, act: { say: signLine(d) }, label: 'Read' }))];
function signLine(d) { const cabs = CABINETS.filter((c) => c.district === d.id), open = cabs.filter((c) => c.live).length;
  return `${d.name}. ${open ? `${open} cabinet${open > 1 ? 's' : ''} open` : 'Cabinets coming soon'}${open < cabs.length ? `, ${cabs.length - open} coming soon` : ''}. Fast travel posts are on the south sidewalk.`; }
const spawns = { hub: [1, ROAD + 1, 'right'] };
for (const d of DISTRICTS) { const [kx] = kioskOf(d); spawns['d-' + d.id] = [kx, ROAD + 1, 'down']; }
for (const s of STRUCTS) if (s.door) spawns[spawnId(cabinet(s.id))] = [s.door[0], DOOR_Y, 'down'];
export const SCENE = Object.freeze({ name: 'Arcade Districts', kind: 'zone', legend: LEGEND, map: buildMap(), structs: STRUCTS, spawns, chunked: true, camDy: -56, camBand: [(ROAD + 3) * ST, (ROAD + 6) * ST], // camera looks a little north so storefronts stay in view on a phone
  exits: [{ tiles: [[0, ROAD], [0, ROAD + 1], [0, ROAD + 2]], face: 'left', to: 'hub', gate: 'arcade' }], spots: SPOTS,
  npcs: [{ name: 'Usher Ollie', coat: 'golden', x: 39, y: 15, wander: true, lines: ['The Arena doors are open: step right up!', 'Fast travel posts are on the south sidewalk.'] },
    { name: 'Groundskeeper Fern', coat: 'tan', x: 80, y: 15, wander: true, lines: ['Pitch is freshly mowed. Games coming soon!', 'Mind the goal posts.'] },
    { name: 'Token Tess', coat: 'cream', x: 14, y: 11, wander: true, lines: ['Eight cabinets on this row, all open!', 'Tap 🏠 inside a cabinet to come back here.'] },
    { name: 'Pit Crew Rio', coat: 'red', x: 120, y: 18, wander: true, lines: ['The race track opens soon.', 'Vroom vroom… one day.'] }] });
export const HUB_GATE = Object.freeze({ id: 'arcade', name: 'Arcade Districts gate', label: 'ARCADE', tx: 62, ty: 57, face: 'right', to: 'districts', at: 'hub', out: [61, 57, 'left'] });
// fast travel: every district + town
export const fastTravel = () => [...DISTRICTS.map((d) => ({ id: d.id, name: d.name, spawn: 'd-' + d.id, open: CABINETS.filter((c) => c.district === d.id && c.live).length, total: CABINETS.filter((c) => c.district === d.id).length })), { id: 'town', name: 'Town (Arcade hall)', spawn: null }];
export const districtAt = (tx) => DISTRICTS.find((d) => tx >= d.x0 && tx <= d.x1) || DISTRICTS[0];
export const STAND = ST;
