// Friends list: follow other players by their PUBLIC display name (the same cleaned name everyone already sees on name tags,
// the live feed and recent-visitor ghosts; never a wallet, email or id). Follows live in your save (state.friends), which is
// local and rides the existing wallet cloud save when you're signed in, so there's no new account or server table.
// Online status comes from the presence the game already has:
//   - live multiplayer (your current room): the player is right here -> Join walks you next to them;
//   - the feed's visitor presence (/api/feed?who=…, pinged every 20-60 s with the nearest named spot): online + area -> Join
//     warps you to that spot. Seen earlier today -> "last seen". Nothing else is exposed.
// Block = unfollow + mute their chat + they never show in your friends list or follow suggestions. Cosmetic/social only.
import { feedName } from './feed.js';
import { SPOTS, validSpot } from './ghosts.js';

export const FR = { MAX: 100, BLOCK_MAX: 200, ONLINE_MS: 3 * 60_000, WHO_MAX: 50, POLL_MS: 90_000 };
export const keyOf = (n) => { const c = feedName(n); return c ? c.toLowerCase() : null; };
export function ensureFriends(s) { const f = (s.friends ||= {}); if (!Array.isArray(f.list)) f.list = []; if (!Array.isArray(f.blocked)) f.blocked = []; return f; }
export const isFollowing = (s, n) => { const k = keyOf(n); return !!k && ensureFriends(s).list.some((x) => x.k === k); };
export const isBlocked = (s, n) => { const k = keyOf(n); return !!k && ensureFriends(s).blocked.some((x) => x.k === k); };
// returns { ok, why? } ; myName = your own public name (can't follow yourself)
export function follow(s, raw, { myName = s.player?.name, now = Date.now() } = {}) {
  const n = feedName(raw), f = ensureFriends(s); if (!n) return { ok: false, why: 'That name isn\'t a public player name.' };
  const k = n.toLowerCase(); if (k === keyOf(myName)) return { ok: false, why: 'That\'s you!' };
  if (isBlocked(s, n)) return { ok: false, why: `You blocked ${n}. Unblock them first.` };
  if (f.list.some((x) => x.k === k)) return { ok: false, why: `Already following ${n}.` };
  if (f.list.length >= FR.MAX) return { ok: false, why: `You can follow up to ${FR.MAX} players.` };
  f.list.push({ n, k, at: now }); return { ok: true, n }; }
export function unfollow(s, raw) { const k = keyOf(raw), f = ensureFriends(s), before = f.list.length; f.list = f.list.filter((x) => x.k !== k); return f.list.length < before; }
export function block(s, raw, { now = Date.now() } = {}) { const n = feedName(raw); if (!n) return false; const k = n.toLowerCase(), f = ensureFriends(s); unfollow(s, n);
  if (!f.blocked.some((x) => x.k === k)) { f.blocked.push({ n, k, at: now }); if (f.blocked.length > FR.BLOCK_MAX) f.blocked.splice(0, f.blocked.length - FR.BLOCK_MAX); } return true; }
export function unblock(s, raw) { const k = keyOf(raw), f = ensureFriends(s), before = f.blocked.length; f.blocked = f.blocked.filter((x) => x.k !== k); return f.blocked.length < before; }
// status of one friend. here = live multiplayer players in my room [{name,x,y}], who = { <key>: { n, on, a, t } } from /api/feed?who
export function statusOf(fr, { here = [], who = {}, now = Date.now() } = {}) {
  const live = here.find((p) => keyOf(p.name) === fr.k); if (live) return { state: 'here', label: 'Here with you', x: live.x, y: live.y };
  const w = who[fr.k];
  if (w && w.on && now - w.t < FR.ONLINE_MS) return validSpot(w.a) ? { state: 'online', label: `Online · ${SPOTS[w.a].name}`, area: w.a } : { state: 'online', label: 'Online' };
  if (w && Number.isFinite(w.t)) return { state: 'away', label: 'Last seen ' + ago(now - w.t) };
  return { state: 'offline', label: 'Offline' }; }
export function ago(ms) { const m = Math.max(1, Math.round(ms / 60_000)); return m < 60 ? `${m} min ago` : `${Math.round(m / 60)} h ago`; }
// where Join takes you: next to them (same room) or their named spot (tile coords)
export function joinTarget(st) { if (st.state === 'here' && Number.isFinite(st.x)) return { px: st.x + 28, py: st.y, near: true };
  if (st.state === 'online' && validSpot(st.area)) { const sp = SPOTS[st.area]; return { tx: sp.tx, ty: sp.ty, name: sp.name }; } return null; }
export const sortFriends = (rows) => { const rank = { here: 0, online: 1, away: 2, offline: 3 }; return rows.slice().sort((a, b) => rank[a.st.state] - rank[b.st.state] || a.fr.n.localeCompare(b.fr.n)); };

// ---- server shape (api/feed.js ?who=) ----
// names -> unique cleaned keys (max WHO_MAX)
export function whoKeys(q) { const out = []; for (const raw of String(q || '').split(',').slice(0, FR.WHO_MAX * 2)) { const k = keyOf(decodeURIComponent(raw.trim())); if (k && !out.includes(k)) out.push(k); if (out.length >= FR.WHO_MAX) break; } return out; }
// visitor map (api/_lib/feed.js liveVisitors) -> public presence for the asked names only; area only while online
// (a guest tag Pup1234 matches the visitor who last used it; only the name that was asked for is echoed, never the other one)
export function whoOut(vis, keys, now) { const out = {}, byG = {}; for (const v of Object.values(vis)) if (v.g) { const g = v.g.toLowerCase(); if (!byG[g] || byG[g].t < v.t) byG[g] = v; }
  for (const k of keys) { const v = vis[k] || byG[k]; if (!v) continue; const on = now - v.t < FR.ONLINE_MS;
    out[k] = { n: vis[k] ? v.n : v.g, on, a: on && validSpot(v.a) ? v.a : null, t: Math.floor(v.t / 60_000) * 60_000 }; } return out; }
export async function fetchWho(names, { f = globalThis.fetch, base = '' } = {}) { const ks = [...new Set(names.map(keyOf).filter(Boolean))].slice(0, FR.WHO_MAX); if (!ks.length) return {};
  const r = await f(`${base}/api/feed?who=${ks.map(encodeURIComponent).join(',')}`, { cache: 'no-store' }); if (!r.ok) throw Object.assign(new Error('who ' + r.status), { status: r.status }); const j = await r.json(); return j && typeof j.who === 'object' ? j.who : {}; }

// ---- panel ----
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
export function friendsHtml(s, { here = [], who = {}, now = Date.now(), loading = false, error = false, mp = 'off' } = {}) {
  const f = ensureFriends(s), rows = sortFriends(f.list.map((fr) => ({ fr, st: statusOf(fr, { here, who, now }) })));
  const on = rows.filter((r) => r.st.state === 'here' || r.st.state === 'online').length;
  const sugg = here.filter((p) => keyOf(p.name) && !isFollowing(s, p.name) && !isBlocked(s, p.name) && keyOf(p.name) !== keyOf(s.player?.name)).slice(0, 6);
  const dot = (st) => `<i class="fr-dot ${st}" aria-hidden="true"></i>`;
  return `<h2>👥 Friends</h2><p class="sub">${f.list.length ? `${on} of ${f.list.length} online` : 'Follow pups you meet to see when they\'re online and join them.'}${loading ? ' · checking…' : error ? ' · status unavailable right now' : ''}</p>
  <div class="fr-add"><input id="fr-name" maxlength="16" placeholder="Public name, e.g. Kabosu" aria-label="Player name to follow" autocomplete="off"><button class="btn green" data-act="add">Follow</button></div>
  ${rows.length ? `<div class="fr-list">${rows.map(({ fr, st }) => `<div class="fr-row ${st.state}"><span class="fr-who">${dot(st.state)}<b>${esc(fr.n)}</b><small>${esc(st.label)}</small></span><span class="fr-btns">${joinTarget(st) ? `<button class="btn green" data-act="join" data-k="${esc(fr.k)}">Join</button>` : ''}<button class="btn alt" data-act="unfollow" data-k="${esc(fr.k)}">Unfollow</button><button class="btn ghost" data-act="block" data-k="${esc(fr.k)}">Block</button></span></div>`).join('')}</div>` : ''}
  ${sugg.length ? `<h3>Here now</h3><div class="fr-list">${sugg.map((p) => `<div class="fr-row"><span class="fr-who">${dot('here')}<b>${esc(feedName(p.name))}</b><small>in this area</small></span><span class="fr-btns"><button class="btn green" data-act="follow" data-n="${esc(feedName(p.name))}">Follow</button><button class="btn ghost" data-act="block" data-n="${esc(feedName(p.name))}">Block</button></span></div>`).join('')}</div>` : mp === 'online' ? '' : '<p class="small">Live multiplayer is off right now, so "Here now" is empty; online status still works for friends.</p>'}
  ${f.blocked.length ? `<details class="fr-blocked"><summary tabindex="0">Blocked (${f.blocked.length})</summary>${f.blocked.map((b) => `<div class="fr-row"><span class="fr-who"><b>${esc(b.n)}</b></span><button class="btn alt" data-act="unblock" data-k="${esc(b.k)}">Unblock</button></div>`).join('')}</details>` : ''}
  <p class="small">Only public names are shown. Blocking someone unfollows them and mutes their chat.</p>`; }
export const FRIENDS_CSS = `.fr-add{display:flex;gap:6px;margin:6px 0}.fr-add input{flex:1;min-width:0;font:inherit;font-size:12px;padding:6px 8px;background:#0c1022;color:#fff6e0;border:2px solid #8a6a2a}
.fr-list{display:flex;flex-direction:column;gap:4px;margin:6px 0}.fr-row{display:flex;align-items:center;justify-content:space-between;gap:6px;padding:4px 6px;background:#1a2240;border:2px solid #2a3358}
.fr-row.here,.fr-row.online{border-color:#3f8a4a}.fr-who{display:flex;align-items:center;gap:6px;min-width:0;flex-wrap:wrap}.fr-who small{opacity:.75}.fr-btns{display:flex;gap:4px;flex-shrink:0}.fr-btns .btn{padding:4px 7px;font-size:10px;min-height:30px}
.fr-dot{width:9px;height:9px;border-radius:50%;background:#555c78;display:inline-block;flex-shrink:0}.fr-dot.here,.fr-dot.online{background:#6fe07a;box-shadow:0 0 5px #6fe07a}.fr-dot.away{background:#d4a640}
.fr-blocked summary{cursor:pointer;margin:6px 0}`;
