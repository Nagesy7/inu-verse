// Inu Verse live multiplayer: protocol, limits, chat/name moderation, rate limiting and room/instance rules.
// Shared VERBATIM by the browser client (src/multiplayer.js) and the Cloudflare Durable Object server (realtime/src/worker.js),
// so the client pre-filters exactly what the server enforces. Pure functions only (no DOM, no Workers APIs).
import { BIP39 } from './mpwords.js';

export const MP = {
  ROOM_CAP: 40,          // players per room instance; the 41st joins instance 2, ...
  MAX_INSTANCES: 8,      // per room id
  SEND_MS: 111,          // client: state at most ~9 Hz, and only on change
  STATE_RATE: 10, STATE_BURST: 3,   // server: token bucket for state messages (faster updates are dropped)
  CHAT_RATE: 0.5, CHAT_BURST: 1,    // 1 chat message per 2 s
  EMOTE_RATE: 1, EMOTE_BURST: 2,
  LOOK_RATE: 0.2, LOOK_BURST: 2,
  ANY_RATE: 25, ANY_BURST: 40,      // any message; sustained abuse closes the socket
  MAX_STRIKES: 50,
  MAX_MSG: 2048,         // bytes per frame (hello/look carry the outfit); state frames are ~80 bytes
  MAX_STATE: 200,
  CHAT_MAX: 80,          // characters
  NAME_MAX: 16,
  INTERP_MS: 100,        // remote players are drawn ~100 ms in the past, interpolated between snapshots
  WORLD_MAX: 20000,
};
export const EMOTE_KINDS = ['wave', 'sit', 'zoomies', 'dance', 'heart', 'bork', 'happy', 'note', 'angry', 'lie', 'dance2', 'dance3', 'wag', 'sleep', 'bow'];
// Round 3: looping poses also ride the state frame as a tiny code (s.p) so late joiners see them; 0 = standing.
export const POSES = ['', 'sit', 'lie', 'dance', 'dance2', 'dance3', 'sleep'];
export const FACES = ['down', 'up', 'left', 'right'];
export const ROOM_RE = /^[a-z0-9][a-z0-9:_-]{0,31}$/;
export const validRoom = (r) => typeof r === 'string' && ROOM_RE.test(r);
// instance key used for the Durable Object name: "city" -> "city#1", "city#2", ...
export const instanceKey = (room, i) => `${room}#${i}`;
// pure overflow rule: first instance with a free slot (1-based), or 0 if every instance is full
export function pickInstance(counts, cap = MP.ROOM_CAP, max = MP.MAX_INSTANCES) { for (let i = 1; i <= max; i++) if ((counts[i - 1] || 0) < cap) return i; return 0; }

// ---- rate limiting (token bucket; state is a plain object so it survives Durable Object hibernation in the socket attachment) ----
export function take(b, now, rate, burst) { if (!b) return false; if (b.at == null) { b.at = now; b.tok = burst; }
  b.tok = Math.min(burst, b.tok + ((now - b.at) / 1000) * rate); b.at = now; if (b.tok >= 1) { b.tok -= 1; return true; } return false; }
export const newBuckets = () => ({ any: {}, s: {}, c: {}, e: {}, l: {} });

// ---- moderation ----
const LEET = { '0': 'o', '1': 'i', '!': 'i', '|': 'i', '3': 'e', '4': 'a', '@': 'a', '5': 's', '$': 's', '7': 't', '+': 't', '8': 'b', '9': 'g', '€': 'e' };
const norm = (w) => w.toLowerCase().replace(/[0-9!|@$+€]/g, (c) => LEET[c] || c).replace(/[^a-z]/g, '');
const squeeze = (w) => w.replace(/(.)\1+/g, '$1'); // "fuuuck" -> "fuck"
const squeeze3 = (w) => w.replace(/(.)\1{2,}/g, '$1$1'); // "cooooon" -> "coon" (keeps real double letters)
// Slurs: the whole message is refused. Patterns are also run over the message with spaces/punctuation removed ("n i g g e r").
const SLUR_RES = [/ni+g{2,}(?:e+r|a+h?|u+h|ah)/, /f+a+g+o+t/, /t+r+a+n+y/, /r+e+t+a+r+d(?!ant|ation)/, /k+i+k+e/, /w+e+t+b+a+c+k/, /r+a+g+h+e+a+d/, /b+e+a+n+e+r/, /s+a+n+d+n+i+g/, /t+o+w+e+l+h+e+a+d/, /s+h+e+m+a+l+e/, /g+o+l+l+i+w+o+g/, /c+h+i+n+k+s?\b/, /p+o+r+c+h+m+o+n+k+e+y/, /j+i+g+a+b+o+o/];
const SLUR_WORD = new Set(['fag', 'fags', 'fagg', 'spic', 'spics', 'spick', 'gook', 'gooks', 'coon', 'coons', 'dyke', 'dykes', 'paki', 'pakis', 'chink', 'chinks', 'negro', 'negroes', 'nig', 'nigs', 'nigg', 'jap', 'japs', 'wop', 'wops', 'homo', 'homos', 'kyke', 'zipperhead']);
const slurJoined = (t) => { const n = norm(t); return SLUR_RES.some((r) => r.test(n)); }; // run-together text: long patterns only
const isSlur = (w) => { const n = norm(w); if (!n) return false; return SLUR_WORD.has(squeeze3(n)) || SLUR_RES.some((r) => r.test(n)); };
// Profanity: masked with **** (prefix/suffix match, so "fucking" / "bullshit" are caught).
const PROF = ['fuck', 'motherfuck', 'shit', 'bitch', 'cunt', 'dick', 'cock', 'pussy', 'asshole', 'arsehole', 'bastard', 'whore', 'slut', 'wank', 'twat', 'prick', 'bollock', 'jizz', 'porn', 'rape', 'nazi', 'hitler', 'piss', 'dildo', 'boob', 'nude', 'tits', 'fuk', 'fck'];
const PROF_EXACT = new Set(['ass', 'arse', 'cum', 'kys', 'sex', 'tit', 'fk', 'sht', 'stfu', 'wtf', 'milf', 'cumming', 'asses', 'fucc', 'phuck', 'biatch', 'azz']);
const PROF_ALLOW = ['dickens', 'cockatoo', 'cockatiel', 'cocktail', 'cockpit', 'cockroach', 'cockerel', 'peacock', 'shitake', 'shiitake', 'scunthorpe', 'grape', 'drape', 'rapeseed', 'titan', 'title', 'titmouse', 'pissarro', 'nudeln', 'hitlerite'];
const isProf = (w) => { const n = norm(w), s = squeeze(n); if (!n) return false; if (PROF_ALLOW.some((a) => n.startsWith(a))) return false; if (PROF_EXACT.has(n) || PROF_EXACT.has(s)) return true;
  return PROF.some((p) => { const q = squeeze(p); return n.startsWith(p) || n.endsWith(p) || (q.length >= 4 && (s.startsWith(q) || s.endsWith(q))); }); };
// links: urls, www., bare domains, invites
const URL_RE = /\b(?:[a-z][a-z0-9+.-]*:\/\/|www\.)\S+/gi;
const DOMAIN_RE = /\b[a-z0-9-]+(?:\s*(?:\.|\(dot\)|\[dot\])\s*[a-z0-9-]+)*\s*(?:\.|\(dot\)|\[dot\])\s*(?:com|net|org|io|xyz|gg|app|me|co|ly|sh|tv|fun|link|site|online|ru|cn|dev|ai|so|to|fi|finance|money|cash|exchange|top|info|biz|club|live|pro|tech|store|shop|page|ws|cc|vip|bet|win|art|lol|wtf)\b(?:\/\S*)?/gi;
// wallet addresses / keys: Solana base58 (32-44), Solana secret key (86-88 base58), EVM 0x40 hex, 64-hex keys, any long random token
const B58_RE = /[1-9A-HJ-NP-Za-km-z]{32,90}/;
const EVM_RE = /0x[0-9a-fA-F]{20,}/;
const HEX_RE = /\b[0-9a-fA-F]{40,}\b/;
const longToken = (t) => t.length >= 24 && /\d/.test(t) && /[a-zA-Z]/.test(t);
const mixed = (t) => (t.match(/\d/g) || []).length + ((t.match(/[A-Z]/g) || []).length >= 2 ? 2 : 0) + ((t.match(/[a-z]/g) || []).length >= 2 ? 1 : 0) >= 4 || /\d.*\d/.test(t) && /[A-Z]/.test(t) && /[a-z]/.test(t);
const b58In = (s) => (s.match(new RegExp(B58_RE.source, 'g')) || []).some(mixed);
export const hasAddress = (s) => b58In(s) || EVM_RE.test(s) || HEX_RE.test(s) || s.split(/\s+/).some(longToken) || b58In(s.replace(/[\s.\-_,/|]/g, ''));
// seed-phrase-like: 8+ words that are (almost all) BIP39 words, or a numbered word list ("1. abandon 2. ability ...")
export function seedLike(s) { const words = s.toLowerCase().replace(/\b\d{1,2}[.):-]?\s*/g, ' ').split(/[^a-z]+/).filter(Boolean); if (words.length < 6) return false;
  const hits = words.filter((w) => BIP39.has(w)).length; return (hits >= 8 && hits / words.length >= 0.75) || (hits >= 6 && hits === words.length && /\b\d{1,2}[.)]/.test(s)); }
const stripCtl = (s) => String(s ?? '').normalize('NFKC').replace(/[\u0000-\u001f\u007f-\u009f\u200b-\u200f\u2028-\u202e\u2060-\u206f\ufeff]/g, ' ');
// Clean a chat line. -> { ok, text } or { ok:false, reason }
export function cleanChat(raw, max = MP.CHAT_MAX) {
  let s = stripCtl(raw).replace(/[<>]/g, '').replace(/\s+/g, ' ').trim(); if (!s) return { ok: false, reason: 'empty' };
  if (s.length > max * 3) return { ok: false, reason: 'too long' };
  if (seedLike(s)) return { ok: false, reason: 'That looks like a seed phrase. Never share it with anyone!' };
  s = s.replace(URL_RE, '').replace(DOMAIN_RE, '').replace(/\b(?:discord|t\.me|telegram)\s*\/\s*\S+/gi, '').replace(/\s+/g, ' ').trim(); // links stripped
  if (hasAddress(s)) return { ok: false, reason: 'No wallet addresses or keys in chat.' };
  if (!s) return { ok: false, reason: 'Links are not allowed in chat.' };
  const words = s.split(' '); if (words.some(isSlur) || slurJoined(s)) return { ok: false, reason: 'Message blocked by the chat filter.' };
  s = words.map((w) => (isProf(w) ? w.replace(/[^\s]/g, '*') : w)).join(' ');
  if (s.length > max) s = s.slice(0, max).trim();
  if (!s.replace(/[\s*]/g, '')) return { ok: false, reason: 'Message blocked by the chat filter.' };
  return { ok: true, text: s }; }
// Display names: letters/digits/space/_-. ; never an address, a slur or profanity; otherwise the fallback (guest) name.
const profInside = (t) => { const n = squeeze(norm(t)); return PROF.some((p) => squeeze(p).length >= 4 && n.includes(squeeze(p))) || SLUR_RES.some((r) => r.test(norm(t))); };
export function cleanName(raw, fallback = 'Pup') { const s0 = stripCtl(raw); if (hasAddress(s0) || seedLike(s0)) return fallback;
  const s = s0.replace(/[^\p{L}\p{N} _.\-…]/gu, '').replace(/\s+/g, ' ').trim().slice(0, MP.NAME_MAX).trim();
  if (!s || hasAddress(s) || s.split(/[ _.\-]/).some((w) => isSlur(w) || isProf(w)) || slurJoined(s) || profInside(s)) return fallback; return s; }
export const guestName = (rnd = Math.random) => 'Pup' + String(1000 + Math.floor(rnd() * 9000));
export const shortAddr = (a) => (typeof a === 'string' && a.length > 10 ? a.slice(0, 4) + '…' + a.slice(-4) : a || null);

// ---- state / look sanitising (server and client both apply these to anything that crosses the wire) ----
const num = (v, lo, hi) => { v = Number(v); return Number.isFinite(v) ? Math.max(lo, Math.min(hi, v)) : null; };
export function cleanState(m) { const x = num(m?.x, 0, MP.WORLD_MAX), y = num(m?.y, 0, MP.WORLD_MAX); if (x == null || y == null) return null;
  return { x: Math.round(x * 2) / 2, y: Math.round(y * 2) / 2, f: FACES.includes(m.f) ? m.f : 'down', m: m.m ? 1 : 0, r: m.r ? 1 : 0, d: m.d ? 1 : 0, p: Number.isInteger(m.p) && m.p > 0 && m.p < POSES.length ? m.p : 0, ts: num(m.ts, 0, 9e15) ?? 0, ...companionOffset(m) }; }
// Inu Quest companion follower: optional small offset from its owner (whole px, |v| <= 96). Absent = no companion out / old server.
const companionOffset = (m) => { const cx = num(m?.cx, -96, 96), cy = num(m?.cy, -96, 96); return cx == null || cy == null ? {} : { cx: Math.round(cx), cy: Math.round(cy) }; };
const HEX = /^#[0-9a-fA-F]{6}$/, ID = /^[a-z0-9_-]{1,40}$/i, WORD = /^[a-z0-9_-]{1,24}$/i;
export function cleanLook(l) { if (!l || typeof l !== 'object') return { coat: 'tan', eq: {} };
  const eq = {}; for (const k of ['hat', 'eyes', 'neck', 'top', 'bottom', 'feet']) if (typeof l.eq?.[k] === 'string' && ID.test(l.eq[k])) eq[k] = l.eq[k];
  const out = { coat: typeof l.coat === 'string' && WORD.test(l.coat) ? l.coat : 'tan', eq };
  if (l.pl && typeof l.pl === 'object') { const L = l.pl.look || {}, look = {}; for (const [k, v] of Object.entries(L).slice(0, 12)) if (WORD.test(k) && typeof v === 'string' && (HEX.test(v) || WORD.test(v))) look[k] = v;
    const of = {}; for (const k of ['hat', 'eyes', 'neck', 'top', 'bottom', 'feet']) { const o = l.pl.outfit?.[k]; if (o && typeof o === 'object' && ID.test(String(o.id || ''))) of[k] = { id: o.id, kind: WORD.test(o.kind || '') ? o.kind : null, c: HEX.test(o.c || '') || WORD.test(o.c || '') ? o.c : null, d: HEX.test(o.d || '') ? o.d : null, accent: HEX.test(o.accent || '') ? o.accent : null, full: !!o.full }; else of[k] = null; }
    out.pl = { look, outfit: of }; }
  return out; }
export const emoteOk = (k) => EMOTE_KINDS.includes(k);
export const byteLen = (s) => (typeof s === 'string' ? (typeof TextEncoder !== 'undefined' ? new TextEncoder().encode(s).length : s.length) : 0);

// ---- interpolation (client) ----
// buf: [{t, x, y, f, m, r, d}] ascending t (ms, local clock). Returns the state at time t (renderNow - INTERP_MS).
export function interpolate(buf, t) { if (!buf.length) return null; if (t <= buf[0].t || buf.length === 1) return { ...buf[0] };
  for (let i = buf.length - 1; i > 0; i--) { const a = buf[i - 1], b = buf[i]; if (t >= a.t) { if (t >= b.t) return { ...b };
      const k = (t - a.t) / Math.max(1, b.t - a.t), far = Math.hypot(b.x - a.x, b.y - a.y) > 240; // teleports (doors) snap instead of sliding
      return { ...b, x: far ? b.x : a.x + (b.x - a.x) * k, y: far ? b.y : a.y + (b.y - a.y) * k, f: k < 0.5 ? a.f : b.f, m: b.m || a.m }; } }
  return { ...buf[buf.length - 1] }; }
// push a snapshot: maps the sender clock to ours (offset = min observed recv - ts, robust to jitter), inserts a "hold" point after an
// idle gap so a pup that starts walking after standing still slides from where it stood instead of jumping, trims old entries.
export function pushSnap(rp, s, recvNow) { const ts = s.ts || recvNow; const off = recvNow - ts; rp.off = rp.off == null ? off : Math.min(rp.off + 1, off); // min = least-delayed packet; +1 ms/msg lets it follow clock drift
  const t = ts + rp.off, buf = (rp.buf ||= []), last = buf[buf.length - 1];
  if (last && t <= last.t) return; if (last && t - last.t > 250) buf.push({ ...last, t: t - MP.SEND_MS, m: last.m });
  buf.push({ x: s.x, y: s.y, f: s.f, m: s.m, r: s.r, d: s.d, t, ...(s.cx != null ? { cx: s.cx, cy: s.cy } : {}) }); while (buf.length > 2 && buf[1].t < recvNow - 1500) buf.shift(); if (buf.length > 30) buf.splice(0, buf.length - 30); }
// pick at most `cap` remote players to draw: inside the view (+margin), nearest to `me` first
export function cullPlayers(list, view, me, cap, margin = 80) { return list.filter((p) => p.x > view.x0 - margin && p.x < view.x1 + margin && p.y > view.y0 - margin && p.y < view.y1 + margin * 2)
  .sort((a, b) => Math.hypot(a.x - me.x, a.y - me.y) - Math.hypot(b.x - me.x, b.y - me.y)).slice(0, cap); }
