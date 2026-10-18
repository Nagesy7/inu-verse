// Town NPC personalities for the $KIBBLE mood: each NPC has its own voice, its own line pool per mood, and a daily line cap.
// The brief's mood lines (kibblemood.js LINES) are kept verbatim and dealt out one per NPC, so every one is still said.
// Rules (shown in-game via rulesHtml() and in docs/npc-rules.md) are the single source of truth: RULES below.
import { LINES, MOOD_IDS, FALLBACK } from './kibblemood.js';

export const VOICES = {
  Mochi: { voice: 'Bubbly snack-lover', about: 'Talks fast, loves treats, ends most sentences with a bark of joy.', cap: 4, lines: {
    zoomies: ['Treats for everyone! Okay, mostly for me!', 'My tail is a propeller today, wheee!', 'I did three laps of the plaza and I want three more!'],
    happy: ['Smells like fresh biscuits out here!', 'Best day for a snack picnic, yip!', 'Somebody pat me, I am too happy to sit still!'],
    chill: ['Snack, nap, snack. Living the dream.', 'I found a crumb. Today is going fine.', 'Slow day, comfy paws, warm belly.'],
    grumpy: ['Wet ears again... I need a towel and a biscuit.', 'Rainy days make my treats soggy, hmph.', 'I am only a little bit sulky. A little.'],
    doghouse: ['Big storm! Everyone share the blanket, okay?', 'I saved a biscuit for whoever is sad.', 'Thunder is loud but we are louder. Arf!'] } },
  Kuro: { voice: 'Stoic night watcher', about: 'Few words, calm and dry. Never hurries, never panics.', cap: 2, lines: {
    zoomies: ['Loud today. Fine.', 'Everyone is running. I am watching.', 'Even I wagged. Once.'],
    happy: ['Good light. Good street.', 'The plaza is calm and bright. Approved.', 'Nice day. Do not make it weird.'],
    chill: ['Quiet. As it should be.', 'Patrol done. Nothing to report.', 'Still water, still paws.'],
    grumpy: ['Rain. Noted.', 'Wet fur dries. Stay the course.', 'I have walked in worse.'],
    doghouse: ['Storms pass. Stay close.', 'I keep watch. You rest.', 'Steady. We have done this before.'] } },
  Hana: { voice: 'Gentle garden poet', about: 'Speaks softly in little images: petals, clouds, tea.', cap: 3, lines: {
    zoomies: ['The whole square is blooming at once.', 'Petals everywhere and every tail a breeze.', 'Today the wind is laughing with us.'],
    happy: ['Sun on the fountain, bees on the clover.', 'A warm day, like tea held in both paws.', 'The blossoms by the statue look proud.'],
    chill: ['Clouds drift, we drift. Lovely.', 'A slow day is a garden growing.', 'I am listening to the leaves.'],
    grumpy: ['Grey skies water the roses too.', 'A soft rain, a soft sigh.', 'Even puddles hold a little sky.'],
    doghouse: ['Storm petals fall, roots stay deep.', 'Huddle close, like seeds in winter.', 'After rain comes the greenest grass.'] } },
  Taro: { voice: 'Pun-loving joker', about: 'Cannot resist a dog pun. Groans are a compliment.', cap: 5, lines: {
    zoomies: ['This town is im-paw-sibly excited!', 'I am having a ruff time sitting still!', 'Fur real, the energy is unbe-leash-able!'],
    happy: ['Feeling paw-sitively great today!', 'Good mood? I am fur-tunate to be here!', 'Today is simply pup-tastic!'],
    chill: ['Just a fur-midable nap day.', 'No news is good mews. Wait, wrong animal.', 'Chilling like a hot dog in the shade.'],
    grumpy: ['Rain? That is just ruff weather.', 'I am a little bark-ward today.', 'Raining cats and... no, just me.'],
    doghouse: ['We are in the dog-house, but it is our dog-house!', 'Storm? I have weathered worse puns.', 'Keep your tail up, the jokes are free.'] } },
  Yuzu: { voice: 'Peppy fitness coach', about: 'Turns everything into a walk, a stretch or a game of fetch.', cap: 3, lines: {
    zoomies: ['Sprints! Everybody! Go go go!', 'Personal best on the plaza loop today!', 'High paws, team! Keep that energy!'],
    happy: ['Perfect weather for a long walk!', 'Stretch, wag, smile. Repeat!', 'Fetch practice at the statue, who is in?'],
    chill: ['Rest day counts as training too.', 'Easy stroll, deep breaths.', 'Hydrate, pups. Then nap.'],
    grumpy: ['Rain jog builds character!', 'Shake it off, literally, then walk on.', 'Warm up those paws, we keep moving.'],
    doghouse: ['Tough day, tougher pups. Huddle up!', 'Storm drills: stay together, stay calm.', 'We train for days like this. Steady!'] } },
  Goma: { voice: 'Sleepy old-timer', about: 'Has seen it all, tells you so, then dozes off mid-story.', cap: 2, lines: {
    zoomies: ['In my day we had zoomies uphill both ways.', 'Hmph, young pups and their running... wait for me!', 'Haven\'t seen the town this lively since the old fair.'],
    happy: ['Ah, a fine day. Reminds me of the old plaza.', 'Sun on my old bones. Lovely.', 'The statue shines like it did when it was new.'],
    chill: ['Zzz... oh, hello. Quiet day, isn\'t it?', 'Nothing happening. My favourite kind of day.', 'I\'ll just rest my eyes a moment...'],
    grumpy: ['My knees said it would rain. They were right.', 'Grey days come and go, pup. Seen plenty.', 'Grumble grumble. Pass the blanket.'],
    doghouse: ['I\'ve seen storms like this. We always come back.', 'Gather round the fire, I\'ll tell you a story.', 'Stormy nights make the best naps. Trust me.'] } },
};
export const CRIER_VOICE = { name: 'Crier Barkley', voice: 'Town crier', about: 'Rings his bell and calls out the town mood, once per mood change. Never repeats himself on a page visit.' };
export const NPC_NAMES = Object.keys(VOICES);

// One brief line per NPC per mood (dealt by NPC order), so the brief's lines stay in the pools verbatim.
export function poolFor(name, mood) { const v = VOICES[name], m = MOOD_IDS.includes(mood) ? mood : FALLBACK; if (!v) return LINES[m].slice();
  const i = NPC_NAMES.indexOf(name); return [...v.lines[m], LINES[m][i % LINES[m].length]]; }

export const DAY_KEY = 'inuverse.npc.lines';
export const today = (d = new Date()) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
const memStore = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)) }; };
// Daily cap per NPC (by the player's local calendar day, saved in localStorage) + at most one mood line per NPC per visit + no back-to-back repeats.
export function makeVoices({ store = (typeof localStorage !== 'undefined' ? localStorage : memStore()), now = () => new Date() } = {}) {
  const visit = new Set(), last = new Map();
  const read = () => { let s = null; try { s = JSON.parse(store.getItem(DAY_KEY) || 'null'); } catch {} const d = today(now()); return s && s.day === d ? s : { day: d, counts: {} }; };
  const write = (s) => { try { store.setItem(DAY_KEY, JSON.stringify(s)); } catch {} };
  return {
    used: (name) => read().counts[name] || 0, capOf: (name) => VOICES[name]?.cap ?? 2, left(name) { return Math.max(0, this.capOf(name) - this.used(name)); },
    take(name, mood, rng = Math.random) { if (!name || visit.has(name)) return null; const s = read(), cap = VOICES[name]?.cap ?? 2; if ((s.counts[name] || 0) >= cap) return null;
      const pool = poolFor(name, mood).filter((l) => l !== last.get(name)); const line = pool[Math.floor(rng() * pool.length) % pool.length];
      visit.add(name); last.set(name, line); s.counts[name] = (s.counts[name] || 0) + 1; write(s); return line; },
    resetVisit: () => visit.clear() };
}
export const allVoiceCopy = () => [...Object.values(VOICES).flatMap((v) => [v.voice, v.about, ...Object.values(v.lines).flat()]), CRIER_VOICE.voice, CRIER_VOICE.about, ...RULES.map((r) => r[0] + ' ' + r[1])];

export const RULES = [
  ['One town mood', 'Every NPC reacts to the same live $KIBBLE town mood (Zoomies, Happy, Chill, Grumpy, Doghouse). It changes only after two readings in a row agree, so it never flickers.'],
  ['Own voice', 'Each pup has a personality and its own lines for every mood. The town\'s official mood lines are shared out, one per pup.'],
  ['Daily line cap', 'Each pup says at most its daily cap of mood lines per calendar day (Mochi 4, Kuro 2, Hana 3, Taro 5, Yuzu 3, Goma 2), and at most one per visit. After that they go back to ordinary small talk.'],
  ['The crier', 'Crier Barkley announces a mood change once. He does not repeat it when you come back.'],
  ['No market talk', 'Nobody in town tells you to trade, promises prices, or gives price levels. Mood is weather, not advice. Not financial advice.'],
  ['Preview', 'Adding ?mood=happy (or another mood) to the address previews a mood. It is labelled preview and is not live data.'],
];
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export function rulesHtml(v = null) {
  const pups = NPC_NAMES.map((n) => `<li><b>${n}</b> · ${esc(VOICES[n].voice)}<br><span class="small">${esc(VOICES[n].about)} Cap ${VOICES[n].cap} a day${v ? ` · ${v.left(n)} left today` : ''}.</span></li>`).join('');
  return `<h2>How the town talks</h2><p class="sub">The rules every pup in Inu Verse follows when the $KIBBLE mood changes.</p>
  <ol class="npc-rules">${RULES.map(([h, b]) => `<li><b>${esc(h)}.</b> ${esc(b)}</li>`).join('')}</ol>
  <h3 style="margin:8px 0 4px">The pups</h3><ul class="npc-pups">${pups}<li><b>${CRIER_VOICE.name}</b> · ${esc(CRIER_VOICE.voice)}<br><span class="small">${esc(CRIER_VOICE.about)}</span></li></ul>
  <div class="nfa">Not financial advice. The town mood is for fun only.</div>`;
}
