// kibble-mood.js: shared $KIBBLE "mood" for every Inu game (vanilla ES module, no build, no DOM at import time).
// Canonical copy lives in Inu Verse (src/kibblemood.js); kibble-pay serves the identical file at /kibble-mood.js.
//
//   import { startMood, MOODS, lineFor } from "https://kibble-pay.vercel.app/kibble-mood.js";
//   const M = startMood({ onMood: (m) => { /* m.mood: zoomies|happy|chill|grumpy|doghouse */ } });  // polls every 60 s
//   M.stop();  M.current  (last response, or the flat fallback)
//
// The server endpoint (GET /api/kibble-mood) returns { price, change1h, change24h, mood, updatedAt, ... }, cached 60 s in
// Upstash (kibble:mood) so every player shares one fetch. The browser never sees an RPC key.
// Dev override: ?mood=zoomies|happy|chill|grumpy|doghouse in the page URL forces a mood (no network).
// Rules: NPCs react to the mood, they never tell anyone what to do. No price targets, no advice. If data is down: "chill".
export const MINT = "4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump";
export const API = "https://inu-verse-tawny.vercel.app";
export const POLL_MS = 60_000;
export const MOOD_IDS = ["zoomies", "happy", "chill", "grumpy", "doghouse"];
export const FALLBACK = "chill";
export const MOODS = {
  zoomies: { id: "zoomies", name: "Zoomies", emoji: "!!", color: "#ffd84a", tint: "rgba(255,216,74,0.10)" },
  happy: { id: "happy", name: "Happy", emoji: ":)", color: "#7ed957", tint: "rgba(255,226,140,0.08)" },
  chill: { id: "chill", name: "Chill", emoji: "~", color: "#9fd8ff", tint: null },
  grumpy: { id: "grumpy", name: "Grumpy", emoji: ":(", color: "#8aa0c8", tint: "rgba(70,90,130,0.16)" },
  doghouse: { id: "doghouse", name: "Doghouse", emoji: "!!", color: "#c8323c", tint: "rgba(20,24,52,0.30)" },
};
// Thresholds on the smoothed 1h change (percent). Zoomies >= +15, Happy +3..+15, Chill -3..+3, Grumpy -3..-15, Doghouse <= -15.
export const T = { ZOOMIES: 15, HAPPY: 3, GRUMPY: -3, DOGHOUSE: -15 };
// 1h change smoothed with 24h so one noisy hour does not flip the town: 75% of the 1h move + 25% of the 24h move.
// Missing 24h -> the 1h value alone. Missing 1h -> no signal -> chill.
export const W1H = 0.75;
export function smoothed(change1h, change24h) {
  const a = num(change1h), b = num(change24h); if (a == null) return null; return b == null ? a : W1H * a + (1 - W1H) * b; }
export function classify(change1h, change24h) { const s = smoothed(change1h, change24h); if (s == null) return FALLBACK;
  if (s >= T.ZOOMIES) return "zoomies"; if (s >= T.HAPPY) return "happy"; if (s <= T.DOGHOUSE) return "doghouse"; if (s <= T.GRUMPY) return "grumpy"; return "chill"; }
// Hysteresis: the mood only changes once a NEW state has been seen on 2 consecutive polls.
// h = { mood, pending, count } (null on first run). Returns the next h; h.mood is what players see.
export const HOLD_POLLS = 2;
export function stepMood(h, raw) { if (!MOOD_IDS.includes(raw)) raw = FALLBACK;
  if (!h || !MOOD_IDS.includes(h.mood)) return { mood: raw, pending: null, count: 0 }; // first ever poll: nothing to flap from
  if (raw === h.mood) return { mood: h.mood, pending: null, count: 0 };
  const count = h.pending === raw ? (h.count || 0) + 1 : 1;
  return count >= HOLD_POLLS ? { mood: raw, pending: null, count: 0 } : { mood: h.mood, pending: raw, count }; }
function num(v) { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; }

// ---- copy (every player-facing mood string lives here so one test can check it) ----
export const LINES = {
  zoomies: ["The whole town's got the zoomies today!", "I haven't wagged this hard since puppy school.", "Someone fetch me a bigger bone bowl!"],
  happy: ["Sun's out, tails up.", "Good vibes at the Kibble statue today.", "President Inu's in a great mood."],
  chill: ["Quiet day in the Verse. Perfect for a nap.", "Just sniffing around, nothing to report.", "Steady paws, steady pup."],
  grumpy: ["Bit drizzly today. I'll keep my bone close.", "Ears down, but I'm not going anywhere.", "Rain never stopped a good walk."],
  doghouse: ["Stormy one. We huddle, we hold, we play.", "Diamond paws, pup.", "Even the President's in the doghouse. He'll be back."],
};
export const HEADLINES = {
  zoomies: ["ZOOMIES SWEEP THE VERSE", "Tails wagging at record speed, town reports"],
  happy: ["SUNNY DAY AT THE STATUE", "Flags up, tails up across the plaza"],
  chill: ["QUIET DAY IN THE VERSE", "Napping pups report nothing unusual"],
  grumpy: ["DRIZZLE OVER THE PLAZA", "Umbrellas out, walks continue as normal"],
  doghouse: ["STORM OVER THE VERSE", "Pups huddle by the fire pit and hold the line"],
};
export const CRIER = {
  zoomies: "Hear ye! The whole town has the zoomies!",
  happy: "Hear ye! Sunny tails at the Kibble statue!",
  chill: "Hear ye! A quiet, steady day in the Verse.",
  grumpy: "Hear ye! A bit of drizzle over the plaza.",
  doghouse: "Hear ye! Storm over the Verse. We huddle, we hold!",
};
export const BANNER = { doghouse: "HOLD THE LINE", zoomies: "ZOOMIES!", happy: "TAILS UP" };
export const COPY = {
  nfa: "Not financial advice. Just how the town feels today.",
  card: "The Kibble statue glows with the town's mood, taken from the $KIBBLE price over the last hour (smoothed with 24h).",
  stale: "Price feed is resting: the town falls back to a chill mood.",
  unavailable: "unavailable",
  override: "Preview mood (dev override)",
};
// Words and phrases that never appear in mood copy (no instructions, no price talk). Also used by tests.
export const BANNED = [/\bbuy(s|ing)?\b/i, /\bsell(s|ing)?\b/i, /\bsold\b/i, /pump\s*it/i, /\bmoon(ing|s)?\b/i, /\bdump(s|ing|ed)?\b/i, /\$\s?\d/, /\b\d+(\.\d+)?\s?x\b/i, /\btarget/i, /\bto\s+\d/i, /\bguarantee/i, /\bprofit/i];
export const bannedIn = (s) => BANNED.filter((r) => r.test(String(s || ""))).map(String);
export const allCopy = () => [...Object.values(LINES).flat(), ...Object.values(HEADLINES).flat(), ...Object.values(CRIER), ...Object.values(BANNER), ...Object.values(COPY), ...Object.values(MOODS).map((m) => m.name)];
export const pick = (arr, rng = Math.random) => arr[Math.floor(rng() * arr.length) % arr.length];
export const lineFor = (mood, rng = Math.random) => pick(LINES[MOOD_IDS.includes(mood) ? mood : FALLBACK], rng);
export const headlineFor = (mood) => HEADLINES[MOOD_IDS.includes(mood) ? mood : FALLBACK];

// "max one mood line per NPC per visit": a tiny per-visit ledger.
export function moodLedger() { const said = new Set(); return { take(id, mood, rng = Math.random) { if (!id || said.has(id)) return null; said.add(id); return lineFor(mood, rng); }, has: (id) => said.has(id), reset: () => said.clear(), get size() { return said.size; } }; }

// ---- client ----
export function overrideMood(search = (typeof location !== "undefined" ? location.search : "")) {
  try { const m = new URLSearchParams(search).get("mood"); return m && MOOD_IDS.includes(m.toLowerCase()) ? m.toLowerCase() : null; } catch { return null; } }
export const flat = (why = "no data") => ({ price: null, change1h: null, change24h: null, mood: FALLBACK, updatedAt: null, stale: true, reason: why });
export function normalize(j) { if (!j || typeof j !== "object") return flat("bad response");
  return { ...j, price: num(j.price), change1h: num(j.change1h), change24h: num(j.change24h), mood: MOOD_IDS.includes(j.mood) ? j.mood : FALLBACK, updatedAt: j.updatedAt || null }; }
export async function fetchMood({ apiBase = API, f = globalThis.fetch } = {}) {
  try { const r = await f(apiBase + "/api/kibble-mood", { cache: "no-store" }); if (!r.ok) return flat("http " + r.status); return normalize(await r.json()); } catch { return flat("offline"); } }
// Poll every 60 s, pause while the tab is hidden, resume (with an immediate refresh) when visible again.
export function startMood({ apiBase = API, onMood = () => {}, f = globalThis.fetch, doc = globalThis.document, search, interval = POLL_MS, setT = globalThis.setTimeout?.bind(globalThis), clearT = globalThis.clearTimeout?.bind(globalThis) } = {}) {
  const forced = overrideMood(search);
  const M = { current: forced ? { ...flat("override"), mood: forced, override: true, stale: false } : flat("loading"), forced, stopped: false, polls: 0 };
  let timer = null, last = null;
  const emit = (m) => { M.current = m; if (m.mood !== last) { const prev = last; last = m.mood; try { onMood(m, prev); } catch {} } else { try { onMood.tick?.(m); } catch {} } };
  const hidden = () => !!doc?.hidden;
  async function tick() { timer = null; if (M.stopped) return; if (hidden()) return; M.polls++; emit(await fetchMood({ apiBase, f })); schedule(); }
  function schedule() { if (!M.stopped && !timer && setT) timer = setT(tick, interval); }
  const onVis = () => { if (M.stopped) return; if (hidden()) { if (timer) { clearT?.(timer); timer = null; } } else if (!timer) tick(); };
  if (forced) { emit(M.current); M.stop = () => { M.stopped = true; }; return M; }
  try { doc?.addEventListener?.("visibilitychange", onVis); } catch {}
  M.stop = () => { M.stopped = true; if (timer) clearT?.(timer); timer = null; try { doc?.removeEventListener?.("visibilitychange", onVis); } catch {} };
  M.refresh = () => { if (timer) { clearT?.(timer); timer = null; } return tick(); };
  tick(); return M;
}
