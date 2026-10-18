// Inu Verse realtime: Cloudflare Worker + SQLite-backed Durable Objects (Workers Free plan compatible).
//   GET /            -> health JSON
//   GET /ws?room=city (WebSocket upgrade) -> joins "city#1" (cap ROOM_CAP), overflow to "city#2", ... up to MAX_INSTANCES
// One Durable Object per room instance. It uses the WebSocket Hibernation API (no timers, no setInterval), so an idle room
// costs no duration; per-player state (name, look, last position, rate-limit buckets) lives in the socket attachment and
// survives hibernation. The server is a relay: every accepted update is fanned out immediately (outgoing messages are free).
import { MP, validRoom, instanceKey, take, newBuckets, cleanChat, cleanName, cleanState, cleanLook, emoteOk, byteLen, shortAddr } from '../../src/mpshared.js';
import { makeKennelLookup, stripKennel, KENNEL_TTL_MS } from './kennel.js';

const json = (o, status = 200, h = {}) => new Response(JSON.stringify(o), { status, headers: { 'content-type': 'application/json', 'access-control-allow-origin': '*', ...h } });
export function originAllowed(origin, list) { if (!origin) return false; const pats = String(list || '').split(',').map((s) => s.trim()).filter(Boolean);
  return pats.some((p) => p === '*' || p === origin || (p.endsWith(':*') && origin.startsWith(p.slice(0, -1)) && /^\d+$/.test(origin.slice(p.length - 1)))); }

export default {
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/' || url.pathname === '/health') return json({ ok: true, service: 'inu-verse-realtime', cap: Number(env.ROOM_CAP) || MP.ROOM_CAP });
    if (url.pathname !== '/ws') return json({ error: 'not found' }, 404);
    if (req.headers.get('upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'expected websocket' }, 426);
    if (!originAllowed(req.headers.get('origin'), env.ALLOWED_ORIGINS)) return json({ error: 'origin not allowed' }, 403);
    const room = url.searchParams.get('room') || 'city'; if (!validRoom(room)) return json({ error: 'bad room' }, 400);
    const max = Math.min(Number(env.MAX_INSTANCES) || MP.MAX_INSTANCES, 16);
    for (let i = 1; i <= max; i++) { // overflow: instance 1 first, then 2, ...
      const stub = env.ROOM.get(env.ROOM.idFromName(instanceKey(room, i)));
      const u = new URL(req.url); u.searchParams.set('room', room); u.searchParams.set('inst', String(i));
      const res = await stub.fetch(new Request(u.toString(), req));
      if (res.status !== 429) return res; }
    return json({ error: 'all instances full' }, 503);
  },
};

export class Room {
  constructor(ctx, env) { this.ctx = ctx; this.env = env;
    this.kennel = makeKennelLookup({ kpUrl: env.KP_URL || 'https://kibble-pay.vercel.app', cache: globalThis.caches?.default || null });
    try { ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('ping', 'pong')); } catch {} } // keepalive without waking the object
  get cap() { return Number(this.env.ROOM_CAP) || MP.ROOM_CAP; }
  live() { return this.ctx.getWebSockets().filter((w) => w.readyState === 1); }
  async fetch(req) {
    const url = new URL(req.url);
    if (this.live().length >= this.cap) return new Response('full', { status: 429 });
    const pair = new WebSocketPair(), [client, server] = Object.values(pair);
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ id: crypto.randomUUID().slice(0, 8), room: url.searchParams.get('room'), inst: Number(url.searchParams.get('inst')) || 1, joined: false, b: newBuckets(), strikes: 0 });
    return new Response(null, { status: 101, webSocket: client });
  }
  peers(except) { const out = []; for (const w of this.ctx.getWebSockets()) { if (w === except || w.readyState !== 1) continue; const a = w.deserializeAttachment(); if (a?.joined) out.push([w, a]); } return out; }
  cast(msg, except) { const s = JSON.stringify(msg); for (const [w] of this.peers(except)) try { w.send(s); } catch {} }
  save(ws, a) { let s = JSON.stringify(a); if (s.length > 2000 && a.look?.pl) { delete a.look.pl; } ws.serializeAttachment(a); }
  pub(a) { return { id: a.id, name: a.name, w: a.w || null, k: (a.w && a.k) || null, look: a.look, s: a.s || null }; }
  // (re)check the verified wallet's tier at most once per TTL; broadcast only what the server looked up
  async refreshKennel(ws) { let a = ws.deserializeAttachment(); if (!a?.wf || (a.kAt && Date.now() - a.kAt < KENNEL_TTL_MS)) return;
    a.kAt = Date.now(); ws.serializeAttachment(a); const tier = await this.kennel.lookup(a.wf);
    a = ws.deserializeAttachment(); if (!a) return; const was = a.k || null; a.k = tier; a.kAt = Date.now(); ws.serializeAttachment(a);
    if (tier !== was || tier) { const m = { t: 'k', id: a.id, k: tier }; this.cast(m, ws); try { ws.send(JSON.stringify(m)); } catch {} } }
  async verifyWallet(tok) { if (!tok || typeof tok !== 'string' || tok.length > 512) return null;
    try { const r = await fetch(`${this.env.KP_URL || 'https://kibble-pay.vercel.app'}/api/save?game=inu-verse`, { headers: { authorization: 'Bearer ' + tok }, signal: AbortSignal.timeout(3000) });
      if (!r.ok) return null; const j = await r.json(); return /^[1-9A-HJ-NP-Za-km-z]{32,44}$/.test(j.wallet || '') ? j.wallet : null; } catch { return null; } }
  async webSocketMessage(ws, raw) {
    const a = ws.deserializeAttachment(); if (!a) return; const now = Date.now();
    const strike = (n = 1) => { a.strikes += n; if (a.strikes > MP.MAX_STRIKES) { try { ws.close(1008, 'rate limit'); } catch {} } this.save(ws, a); };
    if (typeof raw !== 'string' || byteLen(raw) > MP.MAX_MSG) return strike(5); // message size cap
    if (!take(a.b.any, now, MP.ANY_RATE, MP.ANY_BURST)) return strike();
    let m; try { m = JSON.parse(raw); } catch { return strike(); } if (!m || typeof m !== 'object') return strike();
    if (m.t === 'hi') { if (a.joined) return;
      const wallet = await this.verifyWallet(m.tok); a.w = wallet ? shortAddr(wallet) : null; a.wf = wallet || null; a.k = null; a.kAt = 0;
      const guest = typeof m.guest === 'string' && /^Pup\d{4}$/.test(m.guest) ? m.guest : 'Pup' + (1000 + Math.floor(Math.random() * 9000));
      a.name = wallet ? cleanName(m.name, a.w) : guest; a.look = stripKennel(cleanLook(m.look)); a.s = cleanState(m.s) || null; a.joined = true; this.save(ws, a);
      const players = this.peers(ws).map(([, p]) => this.pub(p));
      ws.send(JSON.stringify({ t: 'w', id: a.id, name: a.name, room: a.room, inst: a.inst, cap: this.cap, players }));
      this.cast({ t: 'j', p: this.pub(a) }, ws); return this.refreshKennel(ws); }
    if (!a.joined) return strike();
    if (m.t === 's') { if (raw.length > MP.MAX_STATE || !take(a.b.s, now, MP.STATE_RATE, MP.STATE_BURST)) return; // too fast / too big: dropped
      const s = cleanState(m); if (!s) return; a.s = s; this.save(ws, a); return this.cast({ t: 's', id: a.id, ...s }, ws); }
    if (m.t === 'c') { if (!take(a.b.c, now, MP.CHAT_RATE, MP.CHAT_BURST)) { this.save(ws, a); return ws.send(JSON.stringify({ t: 'no', why: 'Slow down: one message every 2 seconds.' })); }
      const r = cleanChat(m.text); this.save(ws, a); if (!r.ok) return ws.send(JSON.stringify({ t: 'no', why: r.reason }));
      return this.cast({ t: 'c', id: a.id, text: r.text }, ws); }
    if (m.t === 'e') { if (!emoteOk(m.k) || !take(a.b.e, now, MP.EMOTE_RATE, MP.EMOTE_BURST)) { this.save(ws, a); return; } this.save(ws, a); return this.cast({ t: 'e', id: a.id, k: m.k }, ws); }
    if (m.t === 'l') { if (!take(a.b.l, now, MP.LOOK_RATE, MP.LOOK_BURST)) { this.save(ws, a); return; } a.look = stripKennel(cleanLook(m.look)); this.save(ws, a); this.cast({ t: 'l', id: a.id, look: a.look }, ws); return this.refreshKennel(ws); }
    return strike();
  }
  async webSocketClose(ws, code) { const a = ws.deserializeAttachment(); try { ws.close(code === 1005 ? 1000 : code, 'bye'); } catch {} if (a?.joined) this.cast({ t: 'q', id: a.id }, ws); }
  async webSocketError(ws) { const a = ws.deserializeAttachment(); if (a?.joined) this.cast({ t: 'q', id: a.id }, ws); }
}
