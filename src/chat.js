// Little pixel chat bubbles over characters: ambient NPC lines (greetings, weather/time/place, nearby spots, jokes),
// short NPC-to-NPC exchanges, and player emote bubbles. Capped, cooled-down, overlap-avoiding, fades in/out.
import { faceTalk } from './face.js';
export const CHAT = { MAX: 3, PER_ID: 14, GLOBAL: 2.2, LIFE: 3.4, FADE: 0.25, MAXW: 104 };
export const reducedMotion = () => !!(globalThis.__reducedMotion ?? globalThis.matchMedia?.('(prefers-reduced-motion: reduce)')?.matches);
export const LINES = {
  greet: ['Hi there!', 'Oh, hello!', 'Hey, friend!', 'Nice day for a walk!', 'Woof! Hi!', 'Ooh, cool outfit!', 'Long time no sniff!', 'You smell like adventure.', 'Howdy, pup!', 'Wanna be friends?', 'Hiya! *tail wag*', 'Oh! You startled my ears.'],
  morning: ['Morning! Got my zoomies in early.', 'Sun\'s up, nose up!', 'Breakfast was kibble again. Yum.', 'Dew on my paws, love it.'],
  day: ['Perfect napping weather.', 'So many smells today!', 'Is it treat o\'clock yet?', 'Sunbeam spotted. Must lie in it.'],
  evening: ['Sunset walks are the best.', 'Lamps are coming on. Cozy!', 'Almost dinner time...', 'The sky looks like peach jam.'],
  night: ['Shh, the fireflies are out.', 'Late stroll? Me too.', 'I can see the moon from here!', 'Sleepy... *yawn*'],
  rain: ['Puddles! Splash time!', 'My fur is SO fluffy in the rain.', 'Did someone order rain?', 'Wet paws, happy heart.'],
  place: { shop: ['Window shopping again...', 'I need a new hat. Maybe two.'], cafe: ['That café smells amazing.', 'One puppy latte, please!'], arcade: ['Bet I can beat your arcade score!', 'The arcade is calling me.'], park: ['Fetch in the park later?', 'The park pond has ducks. DUCKS!'],
    farm: ['The carrots look ready.', 'Farm life suits me.', 'Barn cats are suspicious of me.'], chapel: ['The chapel bells sound lovely.'], bank: ['The Bank is so shiny inside.'], game: ['Have you tried the other Inu games?', 'Rescue Station needs helpers!'], home: ['Home sweet kennel.', 'My neighbour bakes great biscuits.'], mall: ['The Mall is busy today!', 'Look at that statue. So majestic.'] },
  joke: ['Why did the pup sit in the shade? It didn\'t want to be a hot dog.', 'What do you call a cold pup? A chili dog!', 'I tried to catch fog. Mist.', 'My tail and I are in a long chase.', 'I\'m not lazy. I\'m in energy saving mode.', 'Barking up the wrong tree again...'],
  inu: ['Inu Verse is the best town.', 'Paws up for President Inu!', 'Bones in my pocket, joy in my step.', 'Every pup here is a good pup.', 'Let\'s be kind today!', 'Did you see the blimp earlier?'],
  pairs: [['Hey! Nice collar.', 'Thanks! It\'s new.'], ['Race you to the corner!', 'You\'re on!'], ['Did you hear that squirrel?', 'Where?! WHERE?!'], ['Want to share a bone?', 'Always!'], ['Lovely weather, huh?', 'Ideal for sniffing.'], ['Seen the kites in the park?', 'Yes! So high up!'], ['I lost my ball again.', 'I\'ll help you look!'], ['Nap later?', 'Nap now.']],
  emote: { wave: ['Hello!', 'Hey hey!', '*waves*'], bork: ['Bork!', 'BORK!', 'Woof!'], sit: ['*sits nicely*', 'Good pup mode.'], zoomies: ['Zoooom!', 'Wheee!'], heart: ['Love you all!', '<3'], dance: ['Dance party!'] },
};
const B = []; let lastAny = -99; const cool = new Map(), queue = [];
export const bubbles = () => B;
export function resetChat() { B.length = 0; cool.clear(); queue.length = 0; lastAny = -99; }
// Try to show a bubble. force = player emotes (bypass global gap, replace the oldest when full).
export function say(id, text, now, { force = false, life = CHAT.LIFE } = {}) {
  if (!id || !text) return false; for (let i = B.length - 1; i >= 0; i--) if (now - B[i].t0 > B[i].life) B.splice(i, 1); const c = cool.get(id) ?? -99, mine = B.find((b) => b.id === id);
  if (!force) { if (now - c < CHAT.PER_ID || now - lastAny < CHAT.GLOBAL || B.length >= CHAT.MAX || mine) return false; }
  if (mine) B.splice(B.indexOf(mine), 1); while (B.length >= CHAT.MAX) B.shift();
  B.push({ id, text, t0: now, life }); cool.set(id, now); lastAny = now; faceTalk(id, life); return true; }
export const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length) % arr.length];
// Line for an NPC given context { hour, rain, place }
export function ambientLine(ctx, rng = Math.random) { const r = rng(); const tod = ctx.hour < 6 || ctx.hour >= 21 ? 'night' : ctx.hour < 11 ? 'morning' : ctx.hour < 17 ? 'day' : 'evening';
  if (ctx.rain && r < 0.35) return pick(LINES.rain, rng); if (ctx.place && LINES.place[ctx.place] && r < 0.6) return pick(LINES.place[ctx.place], rng);
  if (r < 0.75) return pick(LINES[tod], rng); if (r < 0.88) return pick(LINES.joke, rng); return pick(LINES.inu, rng); }
// per-frame driver. world = { now, player:{x,y,id}, npcs:[{x,y,name}], hour, rain, placeOf(x,y), rng }
export function stepChat(world) { const { now, player, npcs, rng = Math.random } = world;
  for (let i = B.length - 1; i >= 0; i--) if (now - B[i].t0 > B[i].life) B.splice(i, 1);
  for (let i = queue.length - 1; i >= 0; i--) if (now >= queue[i].at) { const q = queue.splice(i, 1)[0]; say(q.id, q.text, now, { force: B.length < CHAT.MAX }); }
  for (const n of npcs) { if (!n.name) continue; const d = Math.hypot(n.x - player.x, n.y - player.y);
    if (d < 64 && !n._greeted) { n._greeted = true; if (say(n.name, pick(LINES.greet, rng), now)) return; } if (d > 140) n._greeted = false; }
  if (rng() < 0.012) { for (let i = 0; i < npcs.length; i++) for (let j = i + 1; j < npcs.length; j++) { const a = npcs[i], b = npcs[j]; if (!a.name || !b.name || Math.hypot(a.x - b.x, a.y - b.y) > 70) continue;
      if (B.length > CHAT.MAX - 2 || now - (cool.get(a.name) ?? -99) < CHAT.PER_ID || now - (cool.get(b.name) ?? -99) < CHAT.PER_ID) continue;
      const [l1, l2] = pick(LINES.pairs, rng); if (say(a.name, l1, now)) { queue.push({ id: b.name, text: l2, at: now + 1.7 }); cool.set(b.name, now); return; } } }
  if (rng() < 0.01) { const vis = npcs.filter((n) => n.name && world.inView?.(n.x, n.y) !== false); const n = vis.length && pick(vis, rng); if (n) say(n.name, ambientLine({ hour: world.hour, rain: world.rain, place: world.placeOf?.(n.x, n.y) }, rng), now); } }
export function emoteBubble(id, kind, now, rng = Math.random) { const l = LINES.emote[kind]; if (l) say(id, pick(l, rng), now, { force: true, life: 2.2 }); }

// ---- layout + drawing ----
const wrap = (measure, text, maxw) => { const out = []; let cur = ''; for (const w of text.split(' ')) { const t = cur ? cur + ' ' + w : w; if (measure(t) > maxw && cur) { out.push(cur); cur = w; } else cur = t; } if (cur) out.push(cur); return out; };
// Pure: rects for each bubble given speaker anchors {x,y(top of head)} -> pushes later ones up so none overlap
export function layoutBubbles(items, measure, { maxw = CHAT.MAXW, lh = 9, pad = 4 } = {}) {
  const rects = items.map((it) => { const lines = wrap(measure, it.text, maxw), w = Math.ceil(Math.max(...lines.map(measure))) + pad * 2, h = lines.length * lh + pad * 2 - 2; return { ...it, lines, w, h, x: Math.round(it.ax - w / 2), y: Math.round(it.ay - h - 6) }; });
  rects.sort((a, b) => b.ay - a.ay); const placed = [];
  for (const r of rects) { let moved = true, guard = 0; while (moved && guard++ < 20) { moved = false; for (const p of placed) if (r.x < p.x + p.w + 2 && r.x + r.w + 2 > p.x && r.y < p.y + p.h + 2 && r.y + r.h + 2 > p.y) {
      const left = r.ax <= p.ax, dx = left ? p.x - 3 - (r.x + r.w) : p.x + p.w + 3 - r.x, nx = r.x + dx; // slide sideways if the tail can still reach the speaker
      if (Math.abs(dx) < r.w && r.ax > nx + 3 && r.ax < nx + r.w - 3) r.x = nx; else r.y = p.y - r.h - 3; moved = true; } } placed.push(r); }
  return placed; }
export const overlaps = (rs) => { for (let i = 0; i < rs.length; i++) for (let j = i + 1; j < rs.length; j++) { const a = rs[i], b = rs[j]; if (a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y) return true; } return false; };
const INK = '#141a2e', PAPER = '#fff6e0', SHADE = '#e6d6b0';
export function drawChat(c, anchorOf, now) { if (!B.length) return; c.save(); c.font = '7px Silkscreen, monospace'; c.textBaseline = 'top'; c.textAlign = 'left';
  const items = []; for (const b of B) { const a = anchorOf(b.id); if (a) items.push({ ...b, ax: a.x, ay: a.y }); }
  const RM = reducedMotion();
  for (const r of layoutBubbles(items, (t) => c.measureText(t).width)) { const age = now - r.t0, k = Math.min(1, age / CHAT.FADE, (r.life - age) / CHAT.FADE); if (k <= 0) continue;
    const pop = RM ? 0 : Math.max(0, 1 - age / 0.18) * 2, x = r.x, y = Math.round(r.y + pop), w = r.w, h = r.h; c.globalAlpha = Math.max(0, k);
    c.fillStyle = 'rgba(10,14,30,.25)'; c.fillRect(x + 1, y + 2, w, h); // drop shadow
    c.fillStyle = INK; c.fillRect(x + 1, y, w - 2, h); c.fillRect(x, y + 1, w, h - 2); // rounded 1px outline
    c.fillStyle = PAPER; c.fillRect(x + 1, y + 1, w - 2, h - 2); c.fillRect(x + 2, y + 1, w - 4, 1); c.fillStyle = SHADE; c.fillRect(x + 2, y + h - 2, w - 4, 1);
    const tx = Math.max(x + 4, Math.min(x + w - 7, Math.round(r.ax) - 2)), ty = y + h - 1; // tail toward the speaker
    c.fillStyle = INK; c.fillRect(tx, ty, 5, 2); c.fillRect(tx + 1, ty + 2, 3, 1); c.fillRect(tx + 2, ty + 3, 1, 2); c.fillStyle = PAPER; c.fillRect(tx + 1, ty, 3, 1); c.fillRect(tx + 2, ty + 1, 1, 1);
    if (r.y < r.ay - h - 12) { c.fillStyle = INK; c.fillRect(Math.round(r.ax), y + h + 4, 1, Math.max(0, r.ay - (y + h + 6))); } // stacked bubbles keep a thin leader line
    c.fillStyle = INK; r.lines.forEach((l, i) => c.fillText(l, x + 4, y + 3 + i * 9)); }
  c.restore(); }
