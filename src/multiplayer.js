// Inu Verse live multiplayer client: other players in your room, interpolated ~100 ms behind, drawn with the normal Shiba
// renderer (coat/outfit layers, faces, name tags), chat bubbles + emotes through chat.js, a tiny "N online" chip.
// OFF unless a realtime URL is configured (/api/config -> realtimeUrl, or ?mp=ws://localhost:8787 for local testing).
// Every failure path (no URL, server down, socket drops, bad frames) silently falls back to solo play.
import { MP, cleanChat, cleanLook, cleanState, emoteOk, guestName, interpolate, pushSnap, cullPlayers, validRoom } from './mpshared.js';
import { say, emoteBubble } from './chat.js';
import { remoteEmote, remoteState, remoteStep } from './actions.js';
import { artKey } from './art.js';
import { normalizeProfile } from './vendor/profile-schema.js';
import { validHomeId } from './homeshare.js';

const LS = (() => { try { return globalThis.localStorage || null; } catch { return null; } })();
const lsGet = (k) => { try { return LS?.getItem(k) ?? null; } catch { return null; } }, lsSet = (k, v) => { try { LS?.setItem(k, v); } catch {} };
const K_GUEST = 'inuverse.mp.guest', K_MUTE = 'inuverse.mp.muted', K_OFF = 'inuverse.mp.off';

// Resolve the realtime endpoint. ?mp=off disables; ?mp=<ws url> overrides (dev/testing); else /api/config; else window.INU_REALTIME_URL.
export async function resolveRealtimeUrl({ search = globalThis.location?.search || '', f = globalThis.fetch, fallback = globalThis.INU_REALTIME_URL } = {}) {
  const q = new URLSearchParams(search).get('mp'); if (q === 'off' || q === '0') return null;
  const ok = (u) => typeof u === 'string' && /^wss?:\/\/[^\s]+$/i.test(u) ? u.replace(/\/+$/, '') : null;
  if (q && ok(q)) return ok(q);
  try { const r = await f('/api/config', { cache: 'no-store' }); if (r.ok) { const j = await r.json(); if (ok(j?.realtimeUrl)) return ok(j.realtimeUrl); } } catch {}
  return ok(fallback) || null; }

export function createMultiplayer({ getLocal, toast = () => {}, now = () => performance.now() / 1000, WS = globalThis.WebSocket, doc = globalThis.document, clock = () => Date.now(), coarse = !!globalThis.matchMedia?.('(pointer: coarse)').matches, onActions = null, onVisit = null } = {}) {
  const S = { url: null, ws: null, status: 'off', room: null, inst: 0, id: null, me: null, remotes: new Map(), backoff: 2000, retryAt: 0, lastSend: 0, lastSent: null, lastEmote: null, lastAct: null, lastLookKey: '', lastLookAt: 0, leaveAt: 0, hiddenAt: 0, lastChatAt: -9, pingAt: 0, drawCap: coarse ? 12 : 24, anchors: new Map() };
  S.muted = new Set((() => { try { return JSON.parse(lsGet(K_MUTE) || '[]'); } catch { return []; } })());
  S.optOut = lsGet(K_OFF) === '1';
  let guest = lsGet(K_GUEST); if (!/^Pup\d{4}$/.test(guest || '')) { guest = guestName(); lsSet(K_GUEST, guest); }
  const ui = makeUi(doc, S, { say: (t) => api.chat(t), mute: (n) => api.toggleMute(n), toggle: () => api.setOptOut(!S.optOut), actions: onActions, visit: onVisit });
  const send = (o) => { if (S.ws?.readyState !== 1) return false; try { S.ws.send(JSON.stringify(o)); return true; } catch { return false; } };
  const lookOf = (L) => cleanLook(L?.look);
  function drop(reason) { const ws = S.ws; S.ws = null; S.id = null; S.remotes.clear(); S.anchors.clear(); if (ws) { ws.onopen = ws.onmessage = ws.onclose = ws.onerror = null; try { ws.close(); } catch {} } if (reason) S.status = reason; ui.update(); }
  function connect(L) { if (!S.url || !WS || !validRoom(L.room)) return; drop(); S.status = 'connecting'; S.room = L.room; ui.update();
    let ws; try { ws = new WS(`${S.url}/ws?room=${encodeURIComponent(L.room)}`); } catch { return fail(); }
    S.ws = ws;
    ws.onopen = () => { const st = local(L); S.lastSent = st; S.lastLookKey = JSON.stringify(lookOf(L)); S.lastHome = validHomeId(L.h) ? L.h : null; send({ t: 'hi', name: L.name, guest, tok: L.token || undefined, look: lookOf(L), s: st, h: S.lastHome || undefined }); };
    ws.onmessage = (e) => { let m; try { m = JSON.parse(e.data); } catch { return; } try { onMsg(m); } catch {} };
    ws.onclose = () => { if (S.ws === ws) fail(); }; ws.onerror = () => {}; }
  function fail() { drop('offline'); S.retryAt = clock() + S.backoff * (0.8 + Math.random() * 0.4); S.backoff = Math.min(60000, S.backoff * 2); }
  const local = (L) => ({ x: L.x, y: L.y, f: L.f, m: L.m ? 1 : 0, r: L.r ? 1 : 0, d: L.d ? 1 : 0, p: L.p | 0 });
  function addRemote(p) { if (!p?.id || p.id === S.id) return; const r = { id: p.id, name: String(p.name || 'Pup').slice(0, MP.NAME_MAX), w: p.w || null, buf: [], off: null, phase: Math.random() * 6, emote: null, x: 0, y: 0, cur: null };
    setLook(r, p.look); r.kennel = typeof p.k === 'string' ? p.k : null; r.h = validHomeId(p.h) ? p.h : null; const s = p.s && cleanState(p.s); if (s) { pushSnap(r, s, clock()); r.x = s.x; r.y = s.y; remoteState(r, s, now()); } S.remotes.set(p.id, r); }
  function setLook(r, look) { const l = cleanLook(look); r.coat = l.coat; r.outfit = l.eq; r.art = artKey(l.coat);
    // Kibble Kennel tier: ONLY the server-looked-up value (p.k / {t:'k'}) is used; a tier inside the look is ignored.
    // (A pl carrying only that key is not a custom profile.)
    const plOnlyKennel = l.pl && Object.keys(l.pl.look).every((k) => k === 'kennel') && !Object.values(l.pl.outfit || {}).some(Boolean);
    r.profile = l.pl && !plOnlyKennel ? (() => { try { return normalizeProfile({ name: r.name, look: l.pl.look, outfit: l.pl.outfit }); } catch { return null; } })() : null; }
  function onMsg(m) { const t = now();
    if (m.t === 'w') { S.id = m.id; S.me = m.name; S.inst = m.inst; S.room = m.room; S.status = 'online'; S.backoff = 2000; S.remotes.clear(); for (const p of m.players || []) addRemote(p); ui.update(); return; }
    if (m.t === 'j') { addRemote(m.p); ui.update(); return; }
    if (m.t === 'q') { S.remotes.delete(m.id); S.anchors.delete('mp:' + m.id); ui.update(); return; }
    if (m.t === 'no') { toast(m.why || 'Message not sent', 'bad'); return; }
    const r = S.remotes.get(m.id); if (!r) return;
    if (m.t === 's') { const s = cleanState(m); if (s) { pushSnap(r, s, clock()); remoteState(r, s, t); } }
    else if (m.t === 'l') setLook(r, m.look);
    else if (m.t === 'h') { r.h = validHomeId(m.h) ? m.h : null; ui.update(); } // the player's shared home ("Visit home")
    else if (m.t === 'k') r.kennel = typeof m.k === 'string' ? m.k : null; // server-verified Kennel tier
    else if (m.t === 'c') { if (S.muted.has(r.name)) return; const c = cleanChat(m.text); if (c.ok) say('mp:' + r.id, c.text, t, { force: true, life: 4.5 }); } // filtered again client-side
    else if (m.t === 'e' && emoteOk(m.k)) { if (remoteEmote(r, m.k, t) && m.k !== 'wave') return; r.emote = { kind: m.k, t: m.k === 'zoomies' ? 2.4 : 2.5 }; if (!S.muted.has(r.name)) emoteBubble('mp:' + r.id, m.k, t); } }
  const changed = (a, b) => !b || Math.abs(a.x - b.x) > 0.5 || Math.abs(a.y - b.y) > 0.5 || a.f !== b.f || a.m !== b.m || a.r !== b.r || a.d !== b.d || (a.p | 0) !== (b.p | 0);
  const api = {
    S, get enabled() { return !!S.url && !S.optOut; }, get status() { return S.status; }, get count() { return S.remotes.size + (S.status === 'online' ? 1 : 0); },
    async start(url) { S.url = url === undefined ? await resolveRealtimeUrl() : url; ui.show(!!S.url); ui.update();
      // background tab (rAF stops): after 30 s hidden, vanish for others and close so the room can hibernate; reconnect on return
      try { doc?.addEventListener('visibilitychange', () => { clearTimeout(S.hideT); if (doc.hidden) { S.hiddenAt = clock(); S.hideT = setTimeout(() => { if (doc.hidden && S.ws) { if (S.lastSent) send({ t: 's', ...S.lastSent, d: 1, ts: clock() }); drop('idle'); } }, 30000); } else { S.hiddenAt = 0; if (!S.ws) S.retryAt = 0; } }); } catch {}
      return !!S.url; },
    // per frame: connect/leave/reconnect, send state at most every SEND_MS and only on change, advance remote animation
    step(dt) { const L = (() => { try { return getLocal(); } catch { return null; } })(), ms = clock();
      for (const r of S.remotes.values()) { r.phase += dt * (r.cur?.m ? (r.cur.r ? 21 : 12) : 2); if (r.emote && (r.emote.t -= dt) <= 0) r.emote = null; remoteStep(r, now()); }
      if (!S.url || S.optOut || !L) { if (S.ws) drop('off'); return; }
      const hiddenLong = S.hiddenAt && ms - S.hiddenAt > 30000;
      if (!L.room || hiddenLong) { if (S.ws && S.lastSent && !S.lastSent.d) { S.lastSent = { ...S.lastSent, d: 1, ts: ms }; send({ t: 's', ...S.lastSent }); } // vanish for others right away
        if (S.ws && (hiddenLong || (S.leaveAt ||= ms + 15000) < ms)) { drop('idle'); S.leaveAt = 0; } return; }
      S.leaveAt = 0;
      if (!S.ws) { if (ms >= S.retryAt) connect(L); return; }
      if (S.room !== L.room) return connect(L); S.roomName = L.roomName || null;
      if (S.status !== 'online') return;
      const st = local(L);
      if (ms - S.lastSend >= MP.SEND_MS && changed(st, S.lastSent)) { S.lastSend = ms; S.lastSent = st; send({ t: 's', ...st, ts: ms }); }
      if (L.emote && L.emote !== S.lastEmote && emoteOk(L.emote.kind)) send({ t: 'e', k: L.emote.kind }); S.lastEmote = L.emote;
      if (L.act && L.act !== S.lastAct && emoteOk(L.act.kind)) send({ t: 'e', k: L.act.kind }); S.lastAct = L.act; // Round 3 actions ride the emote path
      if (ms - S.lastLookAt > 5000) { S.lastLookAt = ms; const lk = lookOf(L), key = JSON.stringify(lk); if (key !== S.lastLookKey) { S.lastLookKey = key; send({ t: 'l', look: lk }); } }
      const hh = validHomeId(L.h) ? L.h : null; if (hh !== S.lastHome) { S.lastHome = hh; send({ t: 'h', h: hh }); }
      if (ms - S.pingAt > 25000) { S.pingAt = ms; try { S.ws.send('ping'); } catch {} } },
    // renderer-ready actors (same shape main.js draws for NPCs), interpolated, culled to the view, nearest first, capped
    actors(view, me) { if (S.status !== 'online' || !S.remotes.size) return [];
      const tr = clock() - MP.INTERP_MS, list = [];
      for (const r of S.remotes.values()) { const c = interpolate(r.buf, tr); if (!c) continue; r.cur = c; r.x = c.x; r.y = c.y; if (c.d) { S.anchors.delete('mp:' + r.id); continue; } list.push(r); }
      const vis = view ? cullPlayers(list, view, me || { x: 0, y: 0 }, S.drawCap) : list.slice(0, S.drawCap); S.anchors.clear();
      return vis.map((r) => { S.anchors.set('mp:' + r.id, { x: r.x, y: r.y - 60 }); return { x: r.x, y: r.y, coat: r.coat, outfit: r.outfit, art: r.art, profile: r.profile, face: r.cur.f, phase: r.phase, moving: !!r.cur.m, name: r.name, emote: r.emote, act: r.act || null, mp: true, id: 'mp:' + r.id, w: r.w, kennel: r.w ? r.kennel : null }; }); },
    anchor(id) { return S.anchors.get(id) || null; },
    chat(text) { const c = cleanChat(text); if (!c.ok) { if (c.reason !== 'empty') toast(c.reason, 'bad'); return false; }
      const t = now(); if (t - S.lastChatAt < 1 / MP.CHAT_RATE) { toast('Slow down: one message every 2 seconds.', 'bad'); return false; }
      if (!send({ t: 'c', text: c.text })) { toast('Not connected: chat is offline right now.', 'bad'); return false; }
      S.lastChatAt = t; say('me', c.text, t, { force: true, life: 4.5 }); return true; },
    toggleMute(name) { if (S.muted.has(name)) S.muted.delete(name); else S.muted.add(name); lsSet(K_MUTE, JSON.stringify([...S.muted].slice(-200))); ui.update(); return S.muted.has(name); },
    setOptOut(v) { S.optOut = !!v; lsSet(K_OFF, v ? '1' : '0'); if (v) drop('off'); else { S.status = 'offline'; S.retryAt = 0; } ui.update(); },
    players() { return [...S.remotes.values()].map((r) => ({ id: r.id, name: r.name, w: r.w, h: r.h || null, muted: S.muted.has(r.name) })); },
    stop() { drop('off'); },
  };
  return api; }

// ---- tiny HUD chip + popover (players online, say, mute) ----
function makeUi(doc, S, h) {
  const nop = { show() {}, update() {} }; if (!doc?.createElement) return nop;
  let chip, pop, built = false;
  const css = `#mp-chip{position:fixed;z-index:20;top:calc(max(8px,env(safe-area-inset-top)) + 10px);right:calc(max(8px,env(safe-area-inset-right)) + 58px);pointer-events:auto;cursor:pointer;font:inherit;font-size:10px;gap:4px;min-height:28px}body:not(.inworld) #mp-chip,body.drawer-open #mp-chip{display:none}#mp-chip[hidden]{display:none}@media (max-width:600px){#mp-chip{top:calc(max(8px,env(safe-area-inset-top)) + 58px);right:max(8px,env(safe-area-inset-right))}#mp-pop{top:calc(max(8px,env(safe-area-inset-top)) + 96px)}}#mp-chip i{display:inline-block;width:6px;height:6px;background:#7a7a7a;box-shadow:0 0 0 1px #141a2e}#mp-chip.on i{background:#6fe07a}#mp-chip.wait i{background:#f2cc68}
#mp-pop{position:fixed;top:calc(max(8px,env(safe-area-inset-top)) + 58px);right:max(8px,env(safe-area-inset-right));z-index:30;width:min(300px,92vw);background:#141a2e;border:3px solid #d4a640;box-shadow:0 0 0 2px #0c1022;color:#fff6e0;font:10px Silkscreen,monospace;padding:8px;pointer-events:auto}
#mp-pop[hidden]{display:none}#mp-pop .row{display:flex;gap:6px;margin:6px 0}#mp-pop input{flex:1;min-width:0;font:inherit;font-size:12px;padding:6px;background:#0c1022;color:#fff6e0;border:2px solid #8a6a2a}#mp-pop button{font:inherit;cursor:pointer;background:#2a3358;color:#fff6e0;border:2px solid #d4a640;padding:4px 6px}
#mp-pop ul{list-style:none;margin:6px 0 0;padding:0;max-height:40vh;overflow:auto}#mp-pop li{display:flex;justify-content:space-between;align-items:center;padding:3px 0;border-top:1px solid #2a3358}#mp-pop small{opacity:.7}`;
  function build() { if (built) return; built = true;
    const st = doc.createElement('style'); st.textContent = css; doc.head.appendChild(st);
    chip = doc.createElement('button'); chip.id = 'mp-chip'; chip.className = 'chip'; chip.title = 'Players online'; chip.setAttribute('aria-label', 'Players online'); chip.innerHTML = '<i></i><span>solo</span>';
    doc.body.appendChild(chip);
    pop = doc.createElement('div'); pop.id = 'mp-pop'; pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Players online');
    pop.innerHTML = `<div class="row" style="justify-content:space-between"><b id="mp-status">Multiplayer</b><button id="mp-x" aria-label="Close">×</button></div>
<div class="row"><input id="mp-say" maxlength="${MP.CHAT_MAX}" placeholder="Say something nice… (/ to chat)" autocomplete="off" enterkeyhint="send"><button id="mp-send">Say</button></div>
<small>Be kind. Links, wallet addresses and seed phrases are blocked. Never share your seed phrase.</small><ul id="mp-list"></ul>
<div class="row"><button id="mp-act" title="G">Actions (sit, dance…)</button><button id="mp-opt"></button></div>`;
    doc.body.appendChild(pop);
    const input = pop.querySelector('#mp-say'), go = () => { if (h.say(input.value)) { input.value = ''; input.blur(); } };
    chip.onclick = (e) => { e.stopPropagation(); pop.hidden = !pop.hidden; update(); };
    pop.querySelector('#mp-x').onclick = () => { pop.hidden = true; };
    pop.querySelector('#mp-send').onclick = go; input.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') go(); if (e.key === 'Escape') { input.blur(); pop.hidden = true; } };
    pop.querySelector('#mp-opt').onclick = () => h.toggle();
    pop.querySelector('#mp-act').onclick = () => { pop.hidden = true; h.actions?.(); }; pop.querySelector('#mp-act').hidden = !h.actions;
    pop.querySelector('#mp-list').onclick = (e) => { const v = e.target.closest('[data-visit]'); if (v) { pop.hidden = true; h.visit?.(v.dataset.visit, v.dataset.vname); return; } const b = e.target.closest('[data-mute]'); if (b) h.mute(b.dataset.mute); };
    doc.addEventListener('keydown', (e) => { if (e.key !== '/' || /INPUT|TEXTAREA/.test(e.target?.tagName || '') || chip.hidden || S.status !== 'online') return; e.preventDefault(); pop.hidden = false; update(); input.focus(); }, true); }
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  function update() { if (!built) return; const n = S.remotes.size + (S.status === 'online' ? 1 : 0), on = S.status === 'online';
    chip.className = 'chip' + (on ? ' on' : S.status === 'connecting' ? ' wait' : ''); chip.querySelector('span').textContent = S.optOut ? 'solo' : on ? `${n} online` : S.status === 'connecting' ? '…' : 'solo';
    if (pop.hidden) return;
    pop.querySelector('#mp-status').textContent = S.optOut ? 'Multiplayer off (solo)' : on ? `${S.room === 'city' ? 'City' : S.roomName || S.room}${S.inst > 1 ? ' · instance ' + S.inst : ''} · ${n} here` : S.status === 'connecting' ? 'Connecting…' : 'Offline: playing solo';
    pop.querySelector('#mp-opt').textContent = S.optOut ? 'Turn multiplayer on' : 'Play solo (hide others)';
    pop.querySelector('#mp-say').disabled = !on; pop.querySelector('#mp-send').disabled = !on;
    const ps = [...S.remotes.values()]; pop.querySelector('#mp-list').innerHTML = (on ? `<li><span>${esc(S.me || 'You')} <small>(you)</small></span></li>` : '') + ps.slice(0, 60).map((r) => `<li><span>${esc(r.name)}${r.w ? ` <small>${esc(r.w)}</small>` : ''}</span><span>${r.h && h.visit ? `<button data-visit="${esc(r.h)}" data-vname="${esc(r.name)}" title="Visit ${esc(r.name)}'s home and sign the guestbook">Visit home</button> ` : ''}<button data-mute="${esc(r.name)}">${S.muted.has(r.name) ? 'Unmute' : 'Mute'}</button></span></li>`).join(''); }
  return { show(v) { if (v) build(); if (chip) chip.hidden = !v; }, update }; }
