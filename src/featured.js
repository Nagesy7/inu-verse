// Featured Home of the Day: one REAL published home (>= 3 pieces the owner placed beyond the starter kit, not a test home named
// Keeper*, not the creator's default name Kabosu), picked
// deterministically per Australia/Sydney calendar day from the existing /api/home store, shown on a plaza signboard and in
// Menu → Explore with a Visit button. Only the owner's public display name is shown. The server picks once per day (cached in
// Upstash), and posts one real feed line ("X's home is today's Featured Home") the first time a day's pick is made.
// Pure helpers (shared by api/home.js, the client and tests) + a tiny fetch client. No Bones, no $KIBBLE, no payments.
export const MIN_ITEMS = 3;
// homes agents' proof runs published on the live store before publishes carried the test flag (never featured):
//   hlmn8dooxxj84 "Biscuit" = scripts/r4-proof.mjs (Round 4, 18 Oct, bought sofa/rug/lamp/plant/table/tv); hizo71vjz5x0c "Kabosu" (1 Nov, starter kit + lantern)
export const AGENT_HOME_IDS = Object.freeze(new Set(['hlmn8dooxxj84', 'hizo71vjz5x0c']));
export const TEST_NAME = /^keeper/i; // internal test homes (KeeperTest, Keeper2…) never get featured
export const DEFAULT_NAME = 'Kabosu'; // the character creator's default name (src/creator.js): never personalised = agent / test runs, not a showcase
// every new Kennel/home starts with this kit (src/club/state.js STARTER_KENNEL); those pieces at their starting spots don't count
export const STARTER = Object.freeze([['kennel', 1, 1], ['bowl', 3, 2], ['rug', 5, 3], ['plant', 9, 0]]);
const isStarter = (it) => STARTER.some(([id, x, y]) => it && it.id === id && it.x === x && it.y === y);
// pieces the owner actually placed (starter kit at its starting spot excluded)
export const customItems = (rec) => (Array.isArray(rec?.layout?.items) ? rec.layout.items.filter((it) => !isStarter(it)).length : 0);
export const HOME_KEY_RE = /^home:v1:(h[0-9a-z]{12})$/;
const SYD = (() => { try { return new Intl.DateTimeFormat('en-CA', { timeZone: 'Australia/Sydney', year: 'numeric', month: '2-digit', day: '2-digit' }); } catch { return null; } })();
export function sydneyDay(nowMs = Date.now()) { const p = {}; for (const x of SYD.formatToParts(new Date(nowMs))) p[x.type] = x.value; return `${p.year}-${p.month}-${p.day}`; }
const h32 = (s) => { let h = 2166136261; for (const c of String(s)) h = Math.imul(h ^ c.charCodeAt(0), 16777619); return h >>> 0; };
// a stored home record (api/home.js home:v1:<id>) that is real enough to feature
export function isRealHome(rec, id = rec?.id) {
  if (!rec || typeof rec !== 'object' || rec.test || (typeof id === 'string' && AGENT_HOME_IDS.has(id))) return false; /* test = published by an automated / proof run */ const name = typeof rec.name === 'string' ? rec.name.trim() : '';
  return !!name && !TEST_NAME.test(name) && name.toLowerCase() !== DEFAULT_NAME.toLowerCase() && customItems(rec) >= MIN_ITEMS;
}
// deterministic: same day + same candidate set -> same home, whatever order the store listed them in
export function pickFeatured(day, homes) { const c = homes.filter((h) => h && typeof h.id === 'string' && isRealHome(h)).sort((a, b) => (a.id < b.id ? -1 : a.id > b.id ? 1 : 0)); if (!c.length) return null; return c[h32('featured|' + day) % c.length]; }
// public shape only: never the owner key hash, never a wallet
export const publicHome = (id, rec, signs = 0) => ({ id, name: String(rec.name).slice(0, 16), items: rec.layout.items.length, updatedAt: rec.updatedAt || null, signs: Math.max(0, signs | 0) });

// ---- client ----
let CACHE = null; // { day, at, data }
export async function fetchFeatured({ f = globalThis.fetch, now = Date.now(), base = '' } = {}) {
  const day = sydneyDay(now); if (CACHE && CACHE.day === day && now - CACHE.at < 10 * 60_000) return CACHE.data;
  const r = await f(base + '/api/home?featured=1', { cache: 'no-store' }); if (!r.ok) throw Object.assign(new Error('featured ' + r.status), { status: r.status });
  const j = await r.json(); const data = { day: j.day || day, home: j.home && /^h[0-9a-z]{12}$/.test(j.home.id) ? j.home : null, pending: !!j.pending }; if (!data.pending) CACHE = { day, at: now, data }; return data;
}
export const _resetFeaturedCache = () => { CACHE = null; };
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
// panel html (Visit is a plain button -> controller focus manager can reach it)
export function featuredHtml(st) {
  if (st.loading) return '<h2>🏡 Featured Home of the Day</h2><p class="sub">Checking today\'s pick…</p>';
  if (st.error) return '<h2>🏡 Featured Home of the Day</h2><p class="sub">Couldn\'t reach the homes board right now. Try again in a moment.</p><button class="btn alt" data-act="retry">Try again</button>';
  const h = st.data?.home;
  if (!h) return `<h2>🏡 Featured Home of the Day</h2><p class="sub">No home is featured today yet. Decorate your plot with 3+ pieces of furniture and open it to visitors — tomorrow it could be yours.</p>`;
  return `<h2>🏡 Featured Home of the Day</h2><p class="sub">${esc(st.data.day)} (Sydney) · a new home is picked every day from homes opened to visitors.</p>
    <div class="card" style="text-align:left"><b style="font-size:15px">${esc(h.name)}'s home</b><small>${h.items} pieces of furniture · ${h.signs} guestbook ${h.signs === 1 ? 'entry' : 'entries'}</small><small>Drop by, look around and sign the guestbook (filtered like chat).</small>
    <button class="btn green" data-act="visit">Visit ${esc(h.name)}'s home</button></div>`;
}
