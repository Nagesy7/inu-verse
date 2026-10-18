// Round 2: rooms & zones. Walkable interiors (café, shops, bank, mall atrium, clubhouse) and outdoor zones (Hanami Park,
// Biscuit Beach, Pawprint Shrine Isle) as small tile maps with their own camera, props, NPCs, portals and spawns.
// Headless data + logic (tested); drawing lives in sceneart.js, wiring in main.js. Original Inu names/art only.
export const ST = 32; // tile size (world px), same as the hub
// ---- tile legend: [floor, prop, solid] ----
const IN = { // interiors
  '#': ['wall', null, 1], 'W': ['wall', 'window', 1], 'M': ['wall', 'menu', 1], 'Q': ['wall', 'poster', 1], 'Z': ['wall', 'safe', 1], 'O': ['wall', 'mirror', 1],
  '.': ['floor', null, 0], ',': ['rug', null, 0], 'E': ['mat', null, 0], 'C': ['floor', 'counter', 1], 'K': ['floor', 'machine', 1], 'T': ['floor', 'table', 1],
  'h': ['floor', 'chair', 0], 'P': ['floor', 'plant', 1], 'S': ['floor', 'shelf', 1], 'R': ['floor', 'rack', 1], 'A': ['floor', 'atm', 1], 'V': ['floor', 'vault', 1],
  'D': ['floor', 'car', 1], 'B': ['rug', 'sofa', 1], 'F': ['floor', 'fountain', 1], 'L': ['floor', 'lamp', 1], 'N': ['floor', 'board', 1], 'X': ['floor', 'crate', 1], 'G': ['floor', 'pillow', 1], 'J': ['floor', 'mannequin', 1], 'U': ['floor', 'rope', 1],
};
const OUT = { // outdoor zones
  'g': ['grass', null, 0], 'f': ['grass', 'flowers', 0], 'p': ['path', null, 0], 's': ['sand', null, 0], 'w': ['water', null, 1], 'd': ['dock', null, 0], 'e': ['path', 'gate', 0],
  'T': ['grass', 'tree', 1], 'C': ['grass', 'sakura', 1], 'b': ['grass', 'bench', 1], 'l': ['path', 'lantern', 1], 'F': ['path', 'fountain', 1], 'r': ['sand', 'rock', 1], 'u': ['sand', 'umbrella', 1],
  'G': ['path', 'arch', 1], 'S': ['path', 'shrine', 1], 'B': ['path', 'bell', 1], '#': ['grass', 'hedge', 1], 'h': ['sand', 'hut', 1], 'k': ['sand', 'castle', 0], 'q': ['dock', 'ferry', 1], 'n': ['path', 'board', 1], 'm': ['grass', 'stall', 1], 'P': ['path', null, 0], 'y': ['sand', 'palm', 1],
};
const S = (o) => o;
export const SCENES = {
  cafe: S({ name: 'Shiba Sips Café', kind: 'interior', floor: 'wood', wall: '#c98b5a', legend: IN, map: [
    '################',
    '#WW#MMMMMM#WWWW#',
    '#P....K.K.....P#',
    '#..CCCCCCCC....#',
    '#..............#',
    '#.hTh....hTh...#',
    '#..............#',
    '#.hTh....hTh..P#',
    '#..............#',
    '#P.....,,.....L#',
    '#######EE#######'],
    spawns: { door: [7, 9, 'up'] }, exits: [{ tiles: [[7, 10], [8, 10]], face: 'down', to: 'hub', door: 'cafe' }],
    spots: [{ id: 'counter', tx: 6, ty: 4, face: 'up', name: 'Café counter', act: { panel: 'cafe' }, label: 'Work a shift' }],
    npcs: [{ name: 'Barista Biscuit', coat: 'cream', x: 7, y: 2, face: 'down', staff: true, lines: ['One puppy latte, coming up!', 'Grab an apron at the counter if you want a shift!'] },
      { name: 'Latte', coat: 'tan', x: 10, y: 6, wander: true, lines: ['This bone-shaped biscuit is perfect.', 'I come here every morning.'] },
      { name: 'Pebble', coat: 'gray', x: 3, y: 8, wander: true, lines: ['Have you tried the honey scone?', 'Shh, I am reading.'] }] }),
  shop: S({ name: 'Paws & Pillows', kind: 'interior', floor: 'tile', wall: '#8fb3c9', legend: IN, map: [
    '##################',
    '#WW#QQ#SSSS#QQ#WW#',
    '#P..............P#',
    '#..S.S.S..S.S.S..#',
    '#..S.S.S..S.S.S..#',
    '#................#',
    '#..CCCC....G..G..#',
    '#................#',
    '#P......,,......L#',
    '########EE########'],
    spawns: { door: [8, 8, 'up'] }, exits: [{ tiles: [[8, 9], [9, 9]], face: 'down', to: 'hub', door: 'shop' }],
    spots: [{ id: 'till', tx: 4, ty: 7, face: 'up', name: 'Shop till', act: { panel: 'shop' }, label: 'Browse the shop' }],
    npcs: [{ name: 'Clerk Mugi', coat: 'golden', x: 4, y: 5, face: 'down', staff: true, lines: ['Fresh cushions just in!', 'Tap the till to browse.'] },
      { name: 'Sesame', coat: 'dark', x: 12, y: 5, wander: true, lines: ['So many pillows, so little nap time.', 'I need this one in every colour.'] }] }),
  fashion: S({ name: 'Fetch Fashion', kind: 'interior', floor: 'carpet', wall: '#c48fb8', legend: IN, map: [
    '################',
    '#OO#WWWW#OO#QQ##',
    '#J............J#',
    '#..RR..RR..RR..#',
    '#..............#',
    '#..RR..RR..RR..#',
    '#..............#',
    '#J...CCC.....J.#',
    '#......,,......#',
    '#######EE#######'],
    spawns: { door: [7, 8, 'up'] }, exits: [{ tiles: [[7, 9], [8, 9]], face: 'down', to: 'hub', door: 'fashion' }],
    spots: [{ id: 'fit', tx: 6, ty: 8, face: 'up', name: 'Fitting desk', act: { panel: 'fashion' }, label: 'Try on outfits' },
      { id: 'mirror', tx: 2, ty: 2, face: 'up', name: 'Big mirror', act: { panel: 'wardrobe' }, label: 'Wardrobe' }],
    npcs: [{ name: 'Stylist Yuki', coat: 'cream', x: 6, y: 6, face: 'down', staff: true, lines: ['Darling, that collar is SO you.', 'The fitting desk has the new season.'] },
      { name: 'Twirl', coat: 'red', x: 10, y: 4, wander: true, lines: ['Does this bandana make my ears look big?', 'I am buying the sparkly one.'] }] }),
  cars: S({ name: 'Zoomies Motors', kind: 'interior', floor: 'tile', wall: '#9aa6b8', legend: IN, map: [
    '##################',
    '#WWWW#QQ##QQ#WWWW#',
    '#................#',
    '#..DD....DD..DD..#',
    '#................#',
    '#..DD....DD..DD..#',
    '#................#',
    '#P...CCC.....N..P#',
    '#................#',
    '########EE########'],
    spawns: { door: [8, 8, 'up'] }, exits: [{ tiles: [[8, 9], [9, 9]], face: 'down', to: 'hub', door: 'cars' }],
    spots: [{ id: 'desk', tx: 6, ty: 8, face: 'up', name: 'Sales desk', act: { panel: 'cars' }, label: 'Car showroom' },
      { id: 'garage', tx: 13, ty: 8, face: 'up', name: 'Garage board', act: { panel: 'garage' }, label: 'My garage' }],
    npcs: [{ name: 'Dealer Turbo', coat: 'dark', x: 6, y: 6, face: 'down', staff: true, lines: ['Vroom vroom! Test drives at the desk.', 'Every model is pup-safety rated.'] },
      { name: 'Zippy', coat: 'golden', x: 11, y: 4, wander: true, lines: ['I want the red one!', 'Look at those wheels.'] }] }),
  bank: S({ name: 'Kibble Bank', kind: 'interior', floor: 'marble', wall: '#b9a77c', legend: IN, map: [
    '################',
    '#WW#ZZZZZZ#WW#W#',
    '#L....VVVV....L#',
    '#..............#',
    '#.CCCC....CCCC.#',
    '#..............#',
    '#A....,,,,....A#',
    '#P....,,,,....P#',
    '#..............#',
    '#######EE#######'],
    spawns: { door: [7, 8, 'up'] }, exits: [{ tiles: [[7, 9], [8, 9]], face: 'down', to: 'hub', door: 'bank' }],
    spots: [{ id: 'teller', tx: 3, ty: 5, face: 'up', name: 'Teller', act: { panel: 'bank' }, label: 'Bank & wallet' }, { id: 'teller2', tx: 12, ty: 5, face: 'up', name: 'Teller', act: { panel: 'bank' }, label: 'Bank & wallet' },
      { id: 'atm', tx: 2, ty: 6, face: 'left', name: 'Kibble ATM', act: { panel: 'bank' }, label: 'Balance' }],
    npcs: [{ name: 'Teller Penny', coat: 'tan', x: 3, y: 3, face: 'down', staff: true, lines: ['Welcome to Kibble Bank.', 'Connect your wallet at the counter to see your $KIBBLE.'] },
      { name: 'Guard Bruno', coat: 'dark', x: 7, y: 3, face: 'down', staff: true, lines: ['The vault is closed to visitors, pup.', 'Have a nice day!'] }] }),
  mall: S({ name: 'Kibble Mall', kind: 'interior', floor: 'marble', wall: '#d9c27a', legend: IN, map: [
    '####################',
    '#WW#QQ#WWWWWW#QQ#WW#',
    '#P................P#',
    '#..S..N......N..S..#',
    '#..................#',
    '#.......FFFF.......#',
    '#.B.....FFFF.....B.#',
    '#..................#',
    '#P......,,,,......P#',
    '#########EE#########'],
    spawns: { door: [9, 8, 'up'] }, exits: [{ tiles: [[9, 9], [10, 9]], face: 'down', to: 'hub', door: 'mall' }],
    spots: [{ id: 'dir', tx: 6, ty: 4, face: 'up', name: 'Mall directory', act: { panel: 'mall', opts: { cat: 'all', store: 'mall' } }, label: 'Mall stores' }, { id: 'board', tx: 13, ty: 4, face: 'up', name: 'Prize-pool board', act: { panel: 'mall', opts: { cat: 'board' } }, label: 'Prize pools' }],
    npcs: [{ name: 'Concierge Pom', coat: 'cream', x: 9, y: 3, face: 'down', staff: true, lines: ['Welcome to Kibble Mall!', 'The directory lists every store.'] },
      { name: 'Window Shopper', coat: 'gray', x: 4, y: 6, wander: true, lines: ['Just looking!', 'The fountain is my favourite part.'] },
      { name: 'Bao', coat: 'red', x: 15, y: 7, wander: true, lines: ['Shopping spree!', 'Meet you at the fountain.'] }] }),
  clubhouse: S({ name: 'Pack Clubhouse', kind: 'interior', floor: 'wood', wall: '#7f9c6a', legend: IN, map: [
    '################',
    '#WW#QQ##QQ#WW#W#',
    '#X....N.....N.X#',
    '#..............#',
    '#.B..TT....B...#',
    '#....hh........#',
    '#..............#',
    '#P....,,,,....P#',
    '#######EE#######'],
    spawns: { door: [7, 7, 'up'] }, exits: [{ tiles: [[7, 8], [8, 8]], face: 'down', to: 'hub', door: 'clubhouse' }],
    spots: [{ id: 'packboard', tx: 6, ty: 3, face: 'up', name: 'Pack board', act: { panel: 'packs' }, label: 'Packs' }, { id: 'decor', tx: 12, ty: 3, face: 'up', name: 'Decorate', act: { build: 'clubhouse' }, label: 'Decorate clubhouse' }],
    npcs: [{ name: 'Captain Kuma', coat: 'golden', x: 9, y: 3, face: 'down', staff: true, lines: ['Packs that play together, stay together!', 'Check the pack board for the Kibble Cup.'] }] }),
  // ---- outdoor zones ----
  park: S({ name: 'Hanami Park', kind: 'zone', legend: OUT, map: [
    'TTTTTTTTTTTTTTTTTTTTTTTTTTTTTT',
    'TgggfggCgggggggggggCggggfggggT',
    'TggCgggggggpppppppgggggggCgggT',
    'TgggggbggggpgggggpggfggggggggT',
    'TgfggggggggpgFFgpggggggbgggfgT',
    'TggggCgggggpgFFgpgggCggggggggT',
    'TgggggggggppppppppgggggggggggT',
    'eppppppppppggggggppppppppngggT',
    'TgggggggggppppppppggggggpggggT',
    'TggfgwwwwggggpggggggCggggpgggT',
    'TgggwwwwwwgggpgggbgggggggpgggT',
    'TgCgwwwwwwgggpggggggfggggpgfgT',
    'TggggwwwwggggpgggCgggggggpgggT',
    'TgggggggggggppppppppppppppgggT',
    'TgfggCgggggggggggggggggggpgggT',
    'TTTTTTTTTTTTTTTTTTTTTTTTTeTTTT'],
    spawns: { hub: [1, 7, 'right'], beach: [25, 14, 'up'] },
    exits: [{ tiles: [[0, 7]], face: 'left', to: 'hub', gate: 'east' }, { tiles: [[25, 15]], face: 'down', to: 'beach', at: 'park' }],
    spots: [{ id: 'fountain', tx: 13, ty: 6, face: 'up', name: 'Wishing fountain', act: { say: 'You toss a pebble in the fountain and make a wish. Splash!' }, label: 'Make a wish' },
      { id: 'notice', tx: 25, ty: 8, face: 'up', name: 'Park notice board', act: { say: 'Hanami Park: cherry blossoms all year. Picnics welcome. No digging up the flowerbeds!' }, label: 'Read' },
      { id: 'bench', tx: 6, ty: 4, face: 'up', name: 'Park bench', act: { say: 'You sit on the bench and watch the petals drift by. Lovely.', emote: 'heart' }, label: 'Sit' }],
    npcs: [{ name: 'Gardener Moss', coat: 'tan', x: 15, y: 9, wander: true, lines: ['These sakura bloom all year round here.', 'Mind the pond, it is chilly!'] },
      { name: 'Picnic Pip', coat: 'cream', x: 21, y: 12, wander: true, lines: ['Want a rice ball? Just kidding, they are all mine.', 'Best picnic spot in Inu Verse.'] },
      { name: 'Jogger Dash', coat: 'red', x: 8, y: 13, wander: true, lines: ['Zoomies lap number six!', 'Try running with Shift!'] }] }),
  beach: S({ name: 'Biscuit Beach', kind: 'zone', legend: OUT, map: [
    'TTTTTTTTTTTTTTTTpTTTTTTTTTTTTT',
    'TyssssssssssssspsssssssssssysT',
    'Tsssussssssssssspsssssussssss#',
    'TssssssskssssssspsssssssssspsT',
    'Tsssssssssssssssssssssssssspse',
    'Thsssssssrsssssssssssusssssss#',
    'Tssssusssssssssssssssssssssss#',
    'Tssssssssssssssssssksssssssss#',
    'wwwwwwwwwwwwwddddwwwwwwwwwwwww',
    'wwwwwwwwwwwwwddddwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwqqwwwwwwwwwwwwww',
    'wwwwwwwwwwwwwwwwwwwwwwwwwwwwww'],
    spawns: { hub: [16, 1, 'down'], park: [28, 4, 'left'], ferry: [15, 8, 'up'] },
    exits: [{ tiles: [[16, 0]], face: 'up', to: 'hub', gate: 'south' }, { tiles: [[29, 4]], face: 'right', to: 'park', at: 'beach' }],
    spots: [{ id: 'ferry', tx: 14, ty: 9, face: 'down', name: 'Ferry to Pawprint Shrine Isle', act: { travel: 'shrine', at: 'ferry' }, label: 'Ride the ferry' },
      { id: 'castle', tx: 8, ty: 4, face: 'up', name: 'Sandcastle', act: { say: 'You add a tower to the sandcastle. Magnificent!', emote: 'heart' }, label: 'Build' },
      { id: 'hut', tx: 2, ty: 5, face: 'left', name: 'Lifeguard hut', act: { say: 'Lifeguard Sandy: "Swim between the flags! And no chasing seagulls."' }, label: 'Talk' }],
    npcs: [{ name: 'Lifeguard Sandy', coat: 'golden', x: 3, y: 4, wander: true, lines: ['Sunscreen on your nose, pup!', 'The ferry goes to the shrine island.'] },
      { name: 'Ferry Pilot Kai', coat: 'gray', x: 16, y: 7, face: 'down', staff: true, lines: ['All aboard for Pawprint Shrine Isle!', 'Step onto the dock and tap the ferry.'] },
      { name: 'Surfer Wave', coat: 'cream', x: 22, y: 6, wander: true, lines: ['Gnarly waves today!', 'I found a shiny shell.'] }] }),
  shrine: S({ name: 'Pawprint Shrine Isle', kind: 'zone', legend: OUT, map: [
    'wwwwwwwwwwwwwwwwwwwwwwww',
    'wwwwTTTTTTTTTTTTTTTTwwww',
    'wwwTggCggggSSSggggCgTwww',
    'wwTgggggglgSSSglgggggTww',
    'wwTggfgggggPBPgggggfgTww',
    'wwTgggCggggPPPggggCggTww',
    'wwTgggggggggPgggggggggTw',
    'wwTggggggggGPGggggggggTw',
    'wwTgfgggggmgPgggggfgggTw',
    'wwTggggggggsPssggggggTww',
    'wwwTysssssssPsssssssyTww',
    'wwwwssssssssPsssssssswww',
    'wwwwwwwwwwwdddwwwwwwwwww',
    'wwwwwwwwwwwdqdwwwwwwwwww',
    'wwwwwwwwwwwwwwwwwwwwwwww'],
    spawns: { ferry: [12, 11, 'up'] },
    exits: [],
    spots: [{ id: 'ferry', tx: 12, ty: 12, face: 'down', name: 'Ferry to Biscuit Beach', act: { travel: 'beach', at: 'ferry' }, label: 'Ride the ferry home' },
      { id: 'bell', tx: 12, ty: 5, face: 'up', name: 'Shrine bell', act: { say: 'DONG... The bell rings across the island. You feel lucky today!', emote: 'heart', bell: true }, label: 'Ring the bell' },
      { id: 'stall', tx: 10, ty: 9, face: 'up', name: 'Charm stall', act: { say: 'Keeper Hoshi: "Charms for good naps and tasty treats. Come back when the island festival opens!"' }, label: 'Look' }],
    npcs: [{ name: 'Keeper Hoshi', coat: 'cream', x: 9, y: 6, wander: true, lines: ['Welcome, traveller. Ring the bell for luck.', 'The island festival will open here one day.'] },
      { name: 'Pilgrim Nori', coat: 'tan', x: 16, y: 8, wander: true, lines: ['I sailed all the way from Biscuit Beach!', 'The view from the shrine is amazing.'] }] }),
};
// door ids on the hub that now lead into a walkable interior (Launch Hall + mall stores + game doors keep their old entry)
export const DOOR_SCENES = { 'building:cafe': 'cafe', 'building:shop': 'shop', 'building:fashion': 'fashion', 'building:cars': 'cars', 'bank:bank': 'bank', 'mall:mall': 'mall', 'clubhouse:clubhouse': 'clubhouse' };
export const sceneForDoor = (d) => DOOR_SCENES[d.kind + ':' + d.id] || null;
// hub gates (walk into them to change zone). tx,ty = hub stand tile; face = walking direction.
export const HUB_GATES = [
  { id: 'east', name: 'Hanami Park gate', tx: 62, ty: 21, face: 'right', to: 'park', at: 'hub', out: [61, 21, 'left'] },
  { id: 'south', name: 'Biscuit Beach gate', tx: 34, ty: 104, face: 'down', to: 'beach', at: 'hub', out: [34, 103, 'up'] },
];

// ---- parsing / queries ----
const cache = {};
export function scene(id) { if (cache[id]) return cache[id]; const s = SCENES[id]; if (!s) return null;
  const h = s.map.length, w = Math.max(...s.map.map((r) => r.length)), cells = [];
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) { const ch = s.map[y][x] ?? (s.kind === 'zone' ? 'w' : '#'), L = s.legend[ch] || s.legend[s.kind === 'zone' ? 'g' : '.']; cells.push({ ch, floor: L[0], prop: L[1], solid: !!L[2] }); }
  return (cache[id] = { id, ...s, w, h, cells, at: (x, y) => (x < 0 || y < 0 || x >= w || y >= h ? null : cells[y * w + x]) }); }
export const solidAt = (sc, x, y) => { const c = sc.at(x, y); return !c || c.solid; };
export const exitAt = (sc, tx, ty) => sc.exits.find((e) => e.tiles.some(([x, y]) => x === tx && y === ty)) || null;
export function spawnOf(id, key) { const sc = scene(id); const s = sc.spawns[key] || Object.values(sc.spawns)[0]; return { x: (s[0] + 0.5) * ST, y: (s[1] + 0.5) * ST, face: s[2] }; }
export function nearestSpot(sc, px, py, max = 1.1) { let best = null, bd = max; for (const s of sc.spots) { const d = Math.hypot(px / ST - (s.tx + 0.5), py / ST - (s.ty + 0.5)); if (d < bd) { bd = d; best = s; } } return best; }
// portals (room exits, zone gates, hub gates): same generous rule as doors.js. The trigger zone is the exit tiles plus the
// tiles beside them (lateral) and the diagonals behind those; it fires once when you are pushing into the exit: on an exit
// tile unless heading back in, beside it pushing toward it or out through the wall line, diagonally pushing toward it in both
// axes. Arms only when you step onto a zone tile; spawning (tile pre-set) or walking away never fires.
const PFACE = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };
export function makePortalState() { return { tile: -1, armed: false, until: 0 }; }
export function portalZone(e) { const [fx, fy] = PFACE[e.face] || [0, 0], lx = fy !== 0 ? 1 : 0, ly = fx !== 0 ? 1 : 0, out = [];
  for (const [x, y] of e.tiles) out.push([x, y, 'door']);
  for (const [x, y] of e.tiles) for (const sg of [-1, 1]) { const sx = x + sg * lx, sy = y + sg * ly; if (!e.tiles.some(([a, b]) => a === sx && b === sy)) { out.push([sx, sy, 'side', x, y]); out.push([sx - fx, sy - fy, 'diag', x, y]); } }
  return out; }
export function portalStep(st, sc, p, now, exitsOverride) { const tx = Math.floor(p.x / ST), ty = Math.floor(p.y / ST), k = ty * 1000 + tx, list = exitsOverride || sc.exits;
  const hits = []; for (const e of list) for (const z of portalZone(e)) if (z[0] === tx && z[1] === ty) hits.push([e, z]);
  if (k !== st.tile) { st.tile = k; st.armed = hits.length > 0; }
  if (!hits.length || !st.armed || now < st.until) return null;
  let px = p.push?.x || 0, py = p.push?.y || 0; if (!px && !py && p.moving) [px, py] = PFACE[p.face] || [0, 0];
  const pl = Math.hypot(px, py); if (pl < 1e-6) return null; px /= pl; py /= pl;
  for (const [e, z] of hits) { const [fx, fy] = PFACE[e.face] || [0, 0], out = px * fx + py * fy; let ok;
    if (z[2] === 'door') ok = out > -0.5;
    else { const cx = (z[3] + 0.5) * ST, cy = (z[4] + 0.5) * ST, lat = fy !== 0 ? cx - p.x : cy - p.y, toward = (fy !== 0 ? px : py) * Math.sign(lat);
      ok = z[2] === 'side' ? toward > 0.35 || out > 0.5 : toward > 0.25 && out > 0.25; }
    if (ok) { st.armed = false; st.until = now + 0.8; return e; } }
  return null; }
// travel spots (the ferries) are walk-in too: the tile you stand on to use the spot acts as an exit facing the spot
export function walkInExits(sc) { if (sc._walkIn) return sc._walkIn; const out = [];
  for (const sp of sc.spots || []) { if (!sp.act?.travel) continue; const [fx, fy] = PFACE[sp.face] || [0, 1], x = sp.tx - fx, y = sp.ty - fy; if (!solidAt(sc, x, y)) out.push({ tiles: [[x, y]], face: sp.face, spot: sp }); }
  return (sc._walkIn = out); }
export function hubGateAt(tx, ty) { return HUB_GATES.find((g) => g.tx === tx && g.ty === ty) || null; }
// where a portal sends you: { scene: 'hub'|id, x, y, face }
export function resolveExit(e, { outsideOf, doorById } = {}) {
  if (e.to === 'hub') { if (e.gate) { const g = HUB_GATES.find((q) => q.id === e.gate); return { scene: 'hub', x: (g.out[0] + 0.5) * ST, y: (g.out[1] + 0.5) * ST, face: g.out[2] }; }
    const d = doorById?.(e.door); const o = d && outsideOf ? outsideOf(d) : null; return { scene: 'hub', ...(o || {}), door: e.door }; }
  return { scene: e.to, ...spawnOf(e.to, e.at) }; }
// simple wander for scene NPCs: pick a random reachable tile nearby
export function wanderTarget(sc, n, rng) { for (let i = 0; i < 12; i++) { const x = Math.floor(n.x / ST) + Math.floor(rng() * 7) - 3, y = Math.floor(n.y / ST) + Math.floor(rng() * 5) - 2; const c = sc.at(x, y);
  if (c && !c.solid && c.floor !== 'mat' && !exitAt(sc, x, y) && !sc.spots.some((s) => s.tx === x && s.ty === y)) return [x, y]; } return null; }
