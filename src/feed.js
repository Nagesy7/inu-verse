// Inu Verse live activity feed ("Town news" ticker). Phase 2 of "make Inu Verse feel more alive".
// Built ONLY from real events stored server-side by /api/feed (api/_lib/feed.js): no filler, no fake lines, no bots. Empty feed =
// nothing shown. The server stores typed fields only ({ k: type, n: public name, x: small extra }) and the text is rendered here,
// so no free text ever reaches the ticker. Names were cleaned server-side with the multiplayer name filter (cleanName) and are
// cleaned again here before they are shown.
// Shared (pure) part: EVENT types + formatting, used by the API (validation) and the browser (rendering). UI: createFeed().
import { cleanName } from './mpshared.js';
import { GEAR, EVENTS, TRADER, TRADER_STOCK } from './events.js';

export const FEED = {
  MAX: 50,                 // events kept (newest first)
  TTL_S: 24 * 3600,        // events + visitors expire after a day
  POLL_MS: 30_000,         // client poll while in the world and the tab is visible
  ROTATE_MS: 6500,         // ticker shows one line at a time, cycling the newest few
  SHOW: 5,                 // lines cycled in the collapsed ticker
  LIST: 10,                // lines in the expanded list
};
// Every event type the feed accepts. src: 'server' = recorded by the server where the action is already validated (wallet-signed
// plot claim, owner-keyed home/shop publish, filtered + rate-limited guestbook, the Inu Arcade's own score board);
// 'client' = reported by the game client (can't be proven server-side: tied to a server-issued visit session, plausibility-gated and
// rate-limited, and flagged v:0 in the data).
export const EVENT_TYPES = Object.freeze({
  arrive: { src: 'client', text: (n) => `${n} arrived in town` },
  koi: { src: 'client', text: (n) => `${n} caught a rare golden koi at the Fishing Pond` },
  plot: { src: 'server', text: (n, x) => `A new house went up on Plot ${x} — ${n} moved in` },
  home: { src: 'server', text: (n) => `${n} opened their home to visitors` },
  shop: { src: 'server', text: (n) => `${n} opened a shop in town` },
  guestbook: { src: 'server', text: (n, x) => `${n} signed ${x}'s guestbook` },
  arcade: { src: 'server', text: (n) => `${n} took #1 on the Inu Arcade weekly board` },
  featured: { src: 'server', text: (n) => `${n}'s home is today's Featured Home — visit from the plaza signboard` },
  // daily world events (src/events.js): posted by the client only when it actually happened; the server checks today's Sydney event,
  // the item and the area, once per name + item + day. Cosmetic keepsakes only, never Bones or KIBBLE.
  trader: { src: 'client', text: (n, x) => `${n} bought a ${GEAR[x].name} from ${TRADER.title}` },
  keepsake: { src: 'client', text: (n, x) => `${n} earned a ${GEAR[x].name} at the ${EVENTS[GEAR[x].ev].name}` },
});
export const CLIENT_TYPES = Object.freeze(Object.keys(EVENT_TYPES).filter((k) => EVENT_TYPES[k].src === 'client' && k !== 'arrive')); // 'arrive' comes from the visit handshake, never posted directly
export const isEventType = (k) => typeof k === 'string' && Object.prototype.hasOwnProperty.call(EVENT_TYPES, k);
const NAME_FALLBACK = '\u0000'; // cleanName fallback sentinel: a filtered name means "skip", never a placeholder pup
// Public display name for the feed/ghosts, or null when the name is empty, filtered, or looks like an address/key/seed.
const LINKISH = /https?:|www\.|t\.me\/|discord\.gg|\.(com|io|xyz|net|org|gg|me|app|fun|sol|link|co)\b/i; // links never become feed names
export function feedName(raw) { if (typeof raw !== 'string') return null; const n = cleanName(raw, NAME_FALLBACK); return n === NAME_FALLBACK || !n || LINKISH.test(n) ? null : n; }
// extra field per type: plot number 1-8, guestbook owner name; others carry nothing
export function cleanExtra(k, x) {
  if (k === 'plot') { const m = /^p?([1-8])$/.exec(String(x ?? '')); return m ? m[1] : null; }
  if (k === 'guestbook') return feedName(x);
  if (k === 'trader') return typeof x === 'string' && TRADER_STOCK.includes(x) ? x : null;
  if (k === 'keepsake') return typeof x === 'string' && Object.prototype.hasOwnProperty.call(GEAR, x) && GEAR[x].price === 0 && EVENTS[GEAR[x].ev]?.keepsake === x ? x : null;
  return '';
}
// Server + client: one stored event -> safe public shape (or null). Only k, n, x, t, v survive: nothing else is ever sent.
export function cleanEvent(e, now = Date.now()) {
  if (!e || typeof e !== 'object' || !isEventType(e.k)) return null;
  const n = feedName(e.n); if (!n) return null; const x = cleanExtra(e.k, e.x); if (x == null) return null;
  const t = Number(e.t); if (!Number.isFinite(t) || t > now + 60_000 || now - t > FEED.TTL_S * 1000) return null;
  return { i: typeof e.i === 'string' && /^[0-9a-f]{6,16}$/.test(e.i) ? e.i : String(Math.floor(t)).slice(-8), k: e.k, n, x, t, v: EVENT_TYPES[e.k].src === 'server' ? 1 : 0 };
}
export function eventText(e) { const c = cleanEvent(e, e?.t ?? Date.now()); return c ? EVENT_TYPES[c.k].text(c.n, c.x) : null; }
export function ago(t, now = Date.now()) { const s = Math.max(0, Math.round((now - t) / 1000)); if (s < 60) return 'just now'; const m = Math.round(s / 60); if (m < 60) return m + 'm ago'; return Math.round(m / 60) + 'h ago'; }

// ---------------- browser UI: tiny collapsible ticker below the HUD ----------------
const K_COLLAPSED = 'inuverse.feed.collapsed';
const CSS = `#feed-tick{position:fixed;z-index:6;left:max(8px,env(safe-area-inset-left));top:58px;max-width:min(300px,46vw);font:9px/1.35 Silkscreen,monospace;color:#fff6e0;pointer-events:auto;user-select:none}
#feed-tick[hidden],body:not(.inworld) #feed-tick,body.building #feed-tick,body.drawer-open #feed-tick{display:none!important}
#feed-tick .ft-row{display:flex;align-items:center;gap:4px;background:#0c1022cc;border:2px solid #8a6a2a;padding:3px 4px 3px 6px;cursor:pointer;min-height:22px}
#feed-tick .ft-line{flex:1;min-width:0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;transition:opacity .35s}
#feed-tick .ft-line.fade{opacity:0}#feed-tick small{opacity:.6;margin-left:4px}
#feed-tick button{font:inherit;color:#f2cc68;background:none;border:0;padding:0 3px;cursor:pointer;min-width:18px;min-height:18px}
#feed-tick .ft-list{list-style:none;margin:0;padding:4px 6px;background:#0c1022e6;border:2px solid #8a6a2a;border-top:0;max-height:min(46vh,170px);overflow:auto}
#feed-tick .ft-list li{padding:2px 0;border-top:1px solid #2a3358}#feed-tick .ft-list li:first-child{border-top:0}
#feed-tick.collapsed .ft-line,#feed-tick.collapsed .ft-list{display:none}#feed-tick.collapsed .ft-row{padding:2px 4px}
#feed-tick .ft-pip{width:6px;height:6px;background:#7ee07e;flex:none}#feed-tick.quiet .ft-pip{background:#6a7090}
@media (prefers-reduced-motion:reduce){#feed-tick .ft-line{transition:none}}`;
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

// createFeed({ fetch, doc, now, hudEl }) -> { start, refresh, report(type), visitHello(...), state }
// The visit handshake and ghost data live in the same /api/feed call (see ghosts.js), so one poll feeds both.
export function createFeed({ f = (...a) => globalThis.fetch(...a), doc = globalThis.document, now = () => Date.now(), base = '', ls = (() => { try { return globalThis.localStorage || null; } catch { return null; } })(), onData = null } = {}) {
  const S = { events: [], ghosts: [], sid: null, sidName: null, idx: -1, open: false, collapsed: ls?.getItem?.(K_COLLAPSED) === '1', lastPoll: 0, lastPing: 0, lastArea: null, busy: false, el: null, rotT: 0, getLocal: null, timer: 0 };
  const api = base + '/api/feed';
  const post = async (body) => { const r = await f(api, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || 'feed ' + r.status), { status: r.status, retryAfter: j.retryAfter }); return j; };
  function take(j) { if (Array.isArray(j?.events)) S.events = j.events.map((e) => cleanEvent(e, now())).filter(Boolean).slice(0, FEED.MAX); if (Array.isArray(j?.ghosts)) S.ghosts = j.ghosts; try { onData?.(S); } catch {} render(); }
  async function refresh() { if (S.busy) return; S.busy = true; S.lastPoll = now(); try { const r = await f(api, { cache: 'no-store' }); if (r.ok) take(await r.json()); } catch {} finally { S.busy = false; } }
  // visit session: hello once per name (the server issues sid; events carry it, never a name of the client's choosing)
  async function hello(L) { try { const j = await post({ op: 'hello', name: L.name, coat: L.coat, area: L.area || null }); if (j.sid) { S.sid = j.sid; S.sidName = L.name; S.lastArea = L.area || null; S.lastPing = now(); } take(j); } catch {} }
  async function ping(L) { S.lastPing = now(); S.lastArea = L.area || S.lastArea; try { take(await post({ op: 'ping', sid: S.sid, area: L.area || null, coat: L.coat })); } catch (e) { if (e.status === 404) S.sid = null; } }
  async function report(type, x = '') { const L = S.getLocal?.(); if (!S.sid || !L || !CLIENT_TYPES.includes(type) || cleanExtra(type, x) == null) return false; try { take(await post({ op: 'event', sid: S.sid, type, area: L.area || null, ...(x ? { x } : {}) })); return true; } catch { return false; } }
  function tick() { const L = (() => { try { return S.getLocal?.(); } catch { return null; } })(), t = now(), vis = !doc || doc.visibilityState !== 'hidden';
    if (!L || !vis) return; if (!L.inWorld) { render(); return; }
    if (feedName(L.name) && (!S.sid || S.sidName !== L.name)) { if (t - (S.helloAt || 0) > 20_000) { S.helloAt = t; hello(L); } }
    else if (S.sid && ((L.area && L.area !== S.lastArea && t - S.lastPing > 21_000) || t - S.lastPing > 60_000)) ping(L);
    if (t - S.lastPoll > FEED.POLL_MS) refresh(); else render(); }
  // ---- DOM ----
  function build() { if (S.el || !doc?.createElement) return; const st = doc.createElement('style'); st.textContent = CSS; doc.head.appendChild(st);
    const el = doc.createElement('div'); el.id = 'feed-tick'; el.hidden = true; el.setAttribute('role', 'status'); el.setAttribute('aria-live', 'polite'); el.setAttribute('aria-label', 'Town news: real things other players just did');
    el.innerHTML = '<div class="ft-row"><i class="ft-pip"></i><span class="ft-line"></span><button class="ft-col" aria-label="Collapse town news">–</button></div><ul class="ft-list" hidden></ul>';
    el.querySelector('.ft-row').onclick = (e) => { if (e.target.closest('.ft-col')) { e.stopPropagation(); S.collapsed = !S.collapsed; S.open = false; try { ls?.setItem(K_COLLAPSED, S.collapsed ? '1' : '0'); } catch {} render(); return; } if (S.collapsed) { S.collapsed = false; try { ls?.setItem(K_COLLAPSED, '0'); } catch {} } else S.open = !S.open; render(); };
    el.querySelector('.ft-list').onclick = () => { S.open = false; render(); }; // tap the open list to close it
    doc.body.appendChild(el); S.el = el; }
  let shownKey = '';
  function render() { build(); const el = S.el; if (!el) return; const t = now(), evs = S.events.filter((e) => t - e.t < FEED.TTL_S * 1000);
    if (!evs.length) { el.hidden = true; return; } // empty feed: show nothing (never filler)
    const hud = doc.getElementById?.('hud'), hb = hud?.getBoundingClientRect?.(); const top = hb && hb.bottom > 0 && hb.bottom < 140 ? Math.round(hb.bottom + 6) : null; if (top != null) el.style.top = top + 'px';
    // never sit under the wallet/profile badge when it shares the top-left corner (phone landscape): slide right of it
    const pb = doc.getElementById?.('inu-profile-badge')?.getBoundingClientRect?.(), y0 = top ?? 58; el.style.left = pb && pb.width > 0 && pb.left < 80 && pb.top < y0 + 28 && pb.bottom > y0 ? Math.round(pb.right + 6) + 'px' : '';
    el.hidden = false; el.classList.toggle('collapsed', S.collapsed); el.classList.toggle('quiet', t - evs[0].t > 3600_000);
    const col = el.querySelector('.ft-col'); col.textContent = S.collapsed ? '📰' : '–'; col.setAttribute('aria-label', S.collapsed ? 'Show town news' : 'Collapse town news');
    if (t - S.rotT > FEED.ROTATE_MS) { S.rotT = t; S.idx = (S.idx + 1) % Math.min(FEED.SHOW, evs.length); }
    const e = evs[S.idx % Math.min(FEED.SHOW, evs.length)] || evs[0], key = e.i + '|' + ago(e.t, t), line = el.querySelector('.ft-line');
    if (key !== shownKey) { shownKey = key; line.innerHTML = `${esc(eventText(e))}<small>${esc(ago(e.t, t))}</small>`; line.title = e.v ? 'Recorded by the server' : 'Reported by the player’s game'; }
    const list = el.querySelector('.ft-list'); list.hidden = !S.open || S.collapsed;
    if (!list.hidden) { const html = evs.slice(0, FEED.LIST).map((x) => `<li>${esc(eventText(x))}<small>${esc(ago(x.t, t))}</small></li>`).join(''); if (list.innerHTML !== html) list.innerHTML = html; } }
  return { S, refresh, report, render, tick,
    start(getLocal) { S.getLocal = getLocal; if (!S.timer) S.timer = setInterval(tick, 2000); tick(); },
    get events() { return S.events; }, get ghosts() { return S.ghosts; } };
}
