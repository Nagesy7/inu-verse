// NPC personalities: distinct voices, brief lines still used, daily cap, rules card + docs in sync, no market talk.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import { VOICES, NPC_NAMES, RULES, poolFor, makeVoices, allVoiceCopy, rulesHtml, DAY_KEY } from '../src/npcvoices.js';
import { LINES, MOOD_IDS, bannedIn } from '../src/kibblemood.js';
const mem = () => { const m = new Map(); return { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), m }; };

test('every town NPC has its own voice and distinct pools for every mood', () => {
  assert.deepEqual(NPC_NAMES, ['Mochi', 'Kuro', 'Hana', 'Taro', 'Yuzu', 'Goma']); const seen = new Set();
  for (const n of NPC_NAMES) { const v = VOICES[n]; assert.ok(v.voice && v.about && v.cap > 0); for (const m of MOOD_IDS) { assert.ok(v.lines[m].length >= 3, n + m); for (const l of v.lines[m]) { assert.ok(!seen.has(l), 'duplicate line ' + l); seen.add(l); } } }
  assert.equal(new Set(NPC_NAMES.map((n) => VOICES[n].voice)).size, NPC_NAMES.length); });
test("the brief's lines are all still in the pools, verbatim", () => { for (const m of MOOD_IDS) for (const l of LINES[m]) assert.ok(NPC_NAMES.some((n) => poolFor(n, m).includes(l)), l); });
test('no banned words or price talk in any personality line, rule or card', () => {
  for (const s of allVoiceCopy()) assert.deepEqual(bannedIn(s), [], s); assert.deepEqual(bannedIn(rulesHtml().replace(/<[^>]+>/g, ' ')), []);
  assert.deepEqual(bannedIn(fs.readFileSync('docs/npc-rules.md', 'utf8').split('## Banned')[0]), []); });
test('per-NPC daily cap, one line per visit, resets the next day', () => {
  let day = new Date(2026, 9, 18, 10), st = mem(); const mk = () => makeVoices({ store: st, now: () => day });
  let got = 0; for (let visit = 0; visit < 10; visit++) { const v = mk(); if (v.take('Kuro', 'chill', () => 0.1)) got++; assert.equal(v.take('Kuro', 'chill'), null, 'one per visit'); }
  assert.equal(got, VOICES.Kuro.cap); assert.equal(mk().left('Kuro'), 0); assert.equal(mk().left('Taro'), VOICES.Taro.cap);
  day = new Date(2026, 9, 19, 9); assert.equal(mk().left('Kuro'), VOICES.Kuro.cap); assert.ok(mk().take('Kuro', 'grumpy')); assert.match(st.getItem(DAY_KEY), /2026-10-19/); });
test('lines come from that NPC + mood pool and never repeat back to back', () => { const v = makeVoices({ store: mem() }); const a = v.take('Taro', 'happy', () => 0); assert.ok(poolFor('Taro', 'happy').includes(a));
  v.resetVisit(); const b = v.take('Taro', 'happy', () => 0); assert.notEqual(a, b); });
test('rules card + docs/npc-rules.md publish every rule and every cap', () => { const doc = fs.readFileSync('docs/npc-rules.md', 'utf8'), card = rulesHtml();
  for (const [h, b] of RULES) { assert.ok(doc.includes(h) && doc.includes(b), h); assert.ok(card.includes(h)); }
  for (const n of NPC_NAMES) { assert.ok(doc.includes(`| ${n} | ${VOICES[n].voice} | ${VOICES[n].cap} |`), n); assert.ok(card.includes(n)); } assert.match(card, /Not financial advice/); });
test('moodworld routes named NPCs through their voice (cap applies)', async () => { globalThis.localStorage = mem(); const MW = await import('../src/moodworld.js');
  MW.setMood?.('happy'); MW.MW.mood = 'happy'; const l = MW.moodLine('Hana', () => 0); assert.ok(poolFor('Hana', 'happy').includes(l)); assert.equal(MW.moodLine('Hana'), null); delete globalThis.localStorage; });
