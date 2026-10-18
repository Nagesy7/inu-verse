// Phase 3: the sim's police (Barkley Precinct) and park rangers (Greenpaw Rangers). Original Inu Verse pups drawn with
// the normal Shiba renderer plus a layered uniform (patrolart.js). Every one is a sim agent, never a real player.
// post = tile coords of the pup's feet; patrol = [dx, dy] tiles of a slow eased back-and-forth walk (time-only, smooth).
export const FORCE_COLORS = Object.freeze({ navy: '#22356b', navyDark: '#16234a', navyLight: '#3b55a0', gold: '#e7b83a', goldDark: '#a77d18', olive: '#5d7a3a', oliveDark: '#3e5526', oliveLight: '#86a95a', khaki: '#c9b27a', khakiDark: '#93804f', ink: '#141a2e' });
const COP = { top: 'suit_navy', bottom: 'slacks_navy', feet: 'loafers' }, RANGER = { bottom: 'chinos', feet: 'sneakers_red' };
export const OFFICERS = Object.freeze([
  { id: 'sim:pd-marlow', name: 'Sgt. Marlow Barksdale', force: 'police', title: 'Desk Sergeant', coat: 'dark', outfit: { ...COP }, prop: 'policecap', post: [14.5, 46.7],
    line: 'Cross at the zebra stripes and we will get along fine.' },
  { id: 'sim:pd-pip', name: 'Officer Pip Tumbleweed', force: 'police', title: 'Patrol Officer', coat: 'tan', outfit: { ...COP }, prop: 'policecap', post: [6.5, 45.6], patrol: [20, 0],
    line: 'First time is a warning. I am a reasonable pup.' },
  { id: 'sim:pd-juno', name: 'Officer Juno Quickstep', force: 'police', title: 'Patrol Officer', coat: 'cream', outfit: { ...COP }, prop: 'policecap', post: [37.5, 45.6], patrol: [21, 0],
    line: 'Those cars do not stop for paws in the middle of the road.' },
  { id: 'sim:pd-remy', name: 'Officer Remy Holloway', force: 'police', title: 'Patrol Officer', coat: 'golden', outfit: { ...COP }, prop: 'policecap', post: [34.5, 23.5], patrol: [0, 17],
    line: 'Walk the avenue, not the middle of it.' },
  { id: 'sim:rg-hazel', name: 'Chief Ranger Hazel Brambleton', force: 'rangers', title: 'Chief Ranger', coat: 'red', outfit: { ...RANGER }, prop: 'rangerhat', post: [40.5, 81.7],
    line: 'Ranger shifts are open. Leave the park tidier than you found it.' },
  { id: 'sim:rg-moss', name: 'Ranger Moss Fernsby', force: 'rangers', title: 'Park Ranger', coat: 'gray', outfit: { ...RANGER }, prop: 'rangerhat', post: [3.5, 86.6], patrol: [28, 0],
    line: 'Paws off the flowerbeds, please. They took all spring.' },
  { id: 'sim:rg-clover', name: 'Ranger Clover Pinecrest', force: 'rangers', title: 'Park Ranger', coat: 'tan', outfit: { ...RANGER }, prop: 'rangerhat', post: [35.5, 84.4], patrol: [8, 0],
    line: 'Litter goes in the bin. Pups go on the path.' },
]);
export const OFFICER_IDS = Object.freeze(OFFICERS.map((o) => o.id));
export const officerById = (id) => OFFICERS.find((o) => o.id === id) || null;
// time-only motion in world px (TILE 32): an eased back-and-forth along the patrol line with a pause at each end
export function officerPose(o, t) { const i = OFFICERS.indexOf(o), [px, py] = o.post;
  if (!o.patrol) { const look = Math.sin(t * 0.19 + i * 1.3); return { x: px * 32, y: py * 32, face: look > 0.8 ? 'right' : look < -0.8 ? 'left' : 'down', moving: false, phase: t * 2 + i }; }
  const len = Math.hypot(o.patrol[0], o.patrol[1]), P = Math.max(16, (len * 2) / 1.3 / 0.76), u = ((t + i * 7.3) % P) / P, tri = u < 0.5 ? u * 2 : 2 - u * 2;
  const k = Math.min(1, Math.max(0, (tri - 0.12) / 0.76)), e = k * k * (3 - 2 * k), going = u < 0.5, walking = tri > 0.12 && tri < 0.88;
  const horiz = Math.abs(o.patrol[0]) >= Math.abs(o.patrol[1]), sgn = Math.sign(horiz ? o.patrol[0] : o.patrol[1]) * (going ? 1 : -1);
  return { x: (px + o.patrol[0] * e) * 32, y: (py + o.patrol[1] * e) * 32, face: !walking ? 'down' : horiz ? (sgn > 0 ? 'right' : 'left') : (sgn > 0 ? 'down' : 'up'), moving: walking && 6 * k * (1 - k) > 0.25, phase: t * 9 }; }
// Phase 4: patrols run on the wall clock (seconds), so every player sees the same beat and the court can re-check where an
// officer stood at a citation's timestamp (court.js). The world draw and the patrol tick both use it.
export const patrolClock = (ms = Date.now()) => ms / 1000;
// officer positions in tiles (what the rules see)
export const officersAt = (t) => OFFICERS.map((o) => { const p = officerPose(o, t); return { id: o.id, force: o.force, x: p.x / 32, y: p.y / 32 }; });
