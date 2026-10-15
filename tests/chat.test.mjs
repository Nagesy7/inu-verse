import test from 'node:test';
import assert from 'node:assert/strict';
import { CHAT, LINES, say, bubbles, resetChat, stepChat, layoutBubbles, overlaps, emoteBubble, ambientLine } from '../src/chat.js';
const measure = (t) => t.length * 5;
const all = () => { const out = []; const f = (v) => Array.isArray(v) ? v.forEach(f) : typeof v === 'object' ? Object.values(v).forEach(f) : out.push(v); f(LINES); return out; };
test('60+ original lines, no financial promises or brands', () => { const l = all(); assert.ok(l.length >= 60, 'lines ' + l.length);
  for (const s of l) assert.ok(!/kibble.*(moon|pump|profit|price|invest|rich)|\$|guarantee|starbucks|nintendo|disney/i.test(s), s); });
test('cap: never more than MAX bubbles at once', () => { resetChat(); for (let i = 0; i < 20; i++) say('n' + i, 'hi', i * 10); assert.ok(bubbles().length <= CHAT.MAX);
  resetChat(); for (let i = 0; i < 10; i++) emoteBubble('me' + i, 'bork', 0); assert.equal(bubbles().length, CHAT.MAX); });
test('cooldowns: per-speaker and global gap', () => { resetChat(); assert.ok(say('a', 'x', 0)); assert.ok(!say('b', 'y', 0.5), 'global gap'); assert.ok(say('b', 'y', CHAT.GLOBAL + 0.1));
  resetChat(); say('a', 'x', 0); assert.ok(!say('a', 'again', CHAT.PER_ID - 1)); assert.ok(say('a', 'again', CHAT.PER_ID + 1)); });
test('simulated town stays calm: bubbles capped, no one spams', () => { resetChat(); let r = 1; const rng = () => (r = (r * 16807) % 2147483647) / 2147483647;
  const npcs = Array.from({ length: 8 }, (_, i) => ({ name: 'p' + i, x: 100 + (i % 4) * 30, y: 100 + Math.floor(i / 4) * 30 })); const said = {}; let max = 0;
  for (let t = 0; t < 300; t += 1 / 60) { npcs.forEach((n, i) => { n.x += Math.sin(t + i) * 0.5; }); stepChat({ now: t, player: { x: 120 + Math.sin(t / 7) * 200, y: 110 }, npcs, hour: 12, rng }); max = Math.max(max, bubbles().length); for (const b of bubbles()) said[b.id + '@' + b.t0] = 1; }
  const count = Object.keys(said).length; assert.ok(max <= CHAT.MAX); assert.ok(count > 10, 'some chatter ' + count); assert.ok(count < 300 / CHAT.GLOBAL, 'not spammy ' + count); });
test('layout: stacked bubbles never overlap and are auto-sized', () => { const items = [0, 1, 2].map((i) => ({ id: i, text: i ? 'A much longer line that has to wrap over lines' : 'Hi!', ax: 100 + i * 6, ay: 100 + i * 3 }));
  const rs = layoutBubbles(items, measure); assert.ok(!overlaps(rs)); assert.ok(rs.every((r) => r.w <= CHAT.MAXW + 8)); assert.ok(rs.find((r) => r.id === 0).w < rs.find((r) => r.id === 1).w); assert.ok(rs.find((r) => r.id === 1).lines.length > 1); });
test('context lines follow rain/time/place', () => { assert.ok(LINES.rain.includes(ambientLine({ hour: 12, rain: true }, () => 0.1))); assert.ok(LINES.place.farm.includes(ambientLine({ hour: 12, place: 'farm' }, () => 0.5))); assert.ok(LINES.night.includes(ambientLine({ hour: 23 }, () => 0.7))); });
