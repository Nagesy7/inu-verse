// Weekly Pool Board: named boards, live figures from the real API shapes, "not available" when no figure exists, Kennel Chest label, Sydney time, no gambling words.
import test from 'node:test'; import assert from 'node:assert/strict'; import fs from 'node:fs';
import * as PB from '../src/poolboard.js';
const POOLS = { symbol: 'KIBBLE', decimals: 6, timezone: 'Australia/Sydney', pools: { weekly: { period: '2026-W43', accruedBaseUnits: '12500000', leaders: [] } },
  prize: { prizeWallet: { address: 'Akk3DdxeRRLZABfpkFKYoDBk6Zim5wNLRYemNFjv56fn', short: 'Akk3…56fn', name: 'Kennel Chest', solscan: 'https://solscan.io/account/Akk3DdxeRRLZABfpkFKYoDBk6Zim5wNLRYemNFjv56fn' } } };
const fakeFetch = (fail = []) => async (url) => { const u = new URL(url); const p = u.pathname + u.search; if (fail.some((f) => p.includes(f))) return { ok: false, json: async () => ({}) };
  if (p === '/api/pools') return { ok: true, json: async () => POOLS };
  if (p.startsWith('/api/inu-score')) return { ok: true, json: async () => ({ formula: 7, entries: [{ rank: 1, wallet: 'Wa11etAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAXyz', score: 88.6 }], players: 3 }) };
  const g = u.searchParams.get('game'); return { ok: true, json: async () => ({ game: g, pool: 'weekly', period: '2026-W43', entries: g === 'meme-brawl' ? [{ rank: 1, wallet: 'MemeW4LLETBBBBBBBBBBBBBBBBBBBBBBBBBBBBBBQrs', score: 4200 }] : [] }) }; };
test('six named weekly boards in order, with live figures and not-available where kibble-pay has no per-board pool', async () => {
  const raw = await PB.fetchRaw(fakeFetch(), PB.KP, () => Date.parse('2026-10-19T01:30:00Z'));
  const B = PB.buildBoard(raw, { farmPool: 340.7, bizPool: 95, farmTop: [{ name: 'Rival', score: 10 }, { name: 'You', score: 22 }], bizTop: [] });
  assert.deepEqual(B.rows.map((r) => r.name), ['Top Farmer', 'Top Business', 'Meme Brawl', 'Street Sniffer', 'Kibble Chomp', 'Inu Score']);
  assert.equal(B.rows[0].figure, '340 Bones'); assert.equal(B.rows[0].leader, 'You · 22'); assert.equal(B.rows[1].figure, '95 Bones');
  for (const r of B.rows.slice(2)) assert.equal(r.figure, PB.NA, r.name + ' has no per-game pool figure in kibble-pay');
  assert.equal(B.rows[2].leader, 'MemeW…Qrs · 4200'.replace('MemeW…', 'Meme…')); assert.equal(B.rows[2].entries, 1); assert.equal(B.rows[3].entries, 0);
  assert.equal(B.rows[5].entries, 3); assert.match(B.rows[5].leader, /· 88$/);
  assert.equal(B.weekly.figure, '12.5 KIBBLE'); assert.equal(B.weekly.period, '2026-W43');
  assert.equal(B.chest.name, 'Kennel Chest'); assert.equal(B.chest.short, 'Akk3…56fn'); assert.match(B.chest.solscan, /^https:\/\/solscan\.io\/account\/Akk3/);
  assert.equal(B.updated, '19 Oct, 12:30 pm Sydney time');
  const html = PB.boardHtml(B); assert.match(html, /Kennel Chest/); assert.match(html, /Solscan ↗/); assert.match(html, /Last updated 19 Oct, 12:30 pm Sydney time/);
});
test('a failed source shows "not available", never a number', async () => {
  const raw = await PB.fetchRaw(fakeFetch(['/api/pools', 'inu-score', 'kibble-chomp']), PB.KP, () => 0);
  const B = PB.buildBoard(raw, {}); assert.equal(B.weekly.figure, PB.NA); assert.equal(B.rows[0].figure, PB.NA); assert.equal(B.rows[4].entries, null); assert.equal(B.rows[5].note, 'Inu Score not available');
  assert.equal(B.chest.name, 'Kennel Chest', 'wallet label falls back to the named constant'); assert.match(PB.boardHtml(B), /not available/);
  const none = PB.buildBoard(null, {}); assert.equal(none.updated, PB.NA);
});
test('cache: one fetch per minute', async () => { PB._reset(); let n = 0, t = 1000; const f = async (u) => { n++; return fakeFetch()(u); };
  await PB.load(f, { now: () => t }); const per = n; await PB.load(f, { now: () => t + 30000 }); assert.equal(n, per); await PB.load(f, { now: () => t + 61000 }); assert.equal(n, per * 2); PB._reset(); });
test('wiring: monument opens the board; plaque reads live pools; no gambling language anywhere on the board', () => {
  const main = fs.readFileSync('src/main.js', 'utf8'), art = fs.readFileSync('src/fly5art.js', 'utf8'), ui = fs.readFileSync('src/flyui.js', 'utf8');
  assert.match(main, /it\.kind === 'square' && it\.id === 'pools'\) openPanel\('city', \{ tab: 'pools' \}\)/); assert.match(art, /__livePools/); assert.match(art, /PB\.buildBoard/); assert.match(ui, /PB\.boardHtml\(PB\.buildBoard/);
  const html = PB.boardHtml(PB.buildBoard(null, {})), src = fs.readFileSync('src/poolboard.js', 'utf8');
  const BAN = /\b(bet|bets|betting|wager|jackpot|lottery|lotto|odds|gambl\w*|casino|luck\w*|raffle|spin to win)\b/i;
  for (const t of [html, src, ui.slice(ui.indexOf("tab === 'pools'"), ui.indexOf("tab === 'featured'"))]) assert.doesNotMatch(t, BAN);
});
