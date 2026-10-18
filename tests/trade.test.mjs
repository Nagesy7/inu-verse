// Player item trading (Round 3): catalog rule, save landing, and the deal desk behind /api/home op "trade".
// Throwaway ed25519 keys generated per test run (never real wallets); the session lookup is stubbed token -> address.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import { makeHandler } from '../api/home.js';
import { memoryKv } from '../api/_lib/kv.js';
import { TRADE_LIMITS } from '../api/_lib/trades.js';
import { b58 } from '../src/declaration.js';
import * as T from '../src/trade.js';
import { offerItems, createItemBook } from '../src/sim/itembook.js';
import { buyOutfit } from '../src/outfits.js';
import { buyFurniture, sellFromInventory, newGame } from '../src/game.js';

const T0 = 1_800_000_000_000;
export function keypair() { const { publicKey, privateKey } = crypto.generateKeyPairSync('ed25519'); return { pub: b58(publicKey.export({ format: 'der', type: 'spki' }).subarray(-32)), sign: (msg) => b58(crypto.sign(null, Buffer.from(msg, 'utf8'), privateKey)) }; }
export function rig() {
  const clock = { t: T0 }, kv = memoryKv(() => clock.t), wallets = {}, signs = [];
  const h = makeHandler({ kv, now: () => clock.t, sleep: async () => {}, sessionWallet: async (tok) => wallets[tok]?.pub || null });
  const call = async (tok, body, ip = '10.0.0.' + (tok.charCodeAt(4) || 1)) => { clock.t += 1100; let code = 0, out = ''; const res = { setHeader() {}, end(s) { out = s; }, set statusCode(c) { code = c; }, get statusCode() { return code; } };
    await h({ method: 'POST', headers: { authorization: 'Bearer ' + tok, 'x-forwarded-for': ip }, body: { op: 'trade', ...body } }, res); return { code, ...JSON.parse(out) }; };
  const player = (name) => { const tok = 'tok-' + name + '-' + 'x'.repeat(16); wallets[tok] = keypair(); return { tok, name, kp: wallets[tok],
    list: (shelf, ip) => call(tok, { act: 'list', name, shelf }, ip), act: (body, ip) => call(tok, body, ip),
    confirm: async (d, ip) => { const text = T.confirmText(d, d.side); signs.push({ who: name, text }); return call(tok, { act: 'confirm', id: d.id, ver: d.ver, sig: wallets[tok].sign(text) }, ip); } }; };
  const tick = (ms) => { clock.t += ms; };
  return { clock, kv, call, player, tick, signs, book: createItemBook(kv, { now: () => clock.t, sleep: async () => {} }) };
}
const ready = async (R) => { const A = R.player('Ava'), B = R.player('Bo');
  await A.list({ 'w:top_hat': 1, 'f:chair': 2 }); await B.list({ 'w:shades': 1, 'f:lamp': 1 }); R.tick(TRADE_LIMITS.newTraderMs + 1000);
  await A.list({ 'w:top_hat': 1, 'f:chair': 2 }); const lb = await B.list({ 'w:shades': 1, 'f:lamp': 1 }), la = await A.list(); return { A, B, la, lb }; };
const gap = (R) => R.tick(6000);

test('tradeable: Bones-bought wardrobe and furniture only; $KIBBLE, drops, mall, royal sets are not', () => {
  for (const id of ['w:top_hat', 'w:shades', 'f:chair', 'f:cosy_patchwork_bed', 'f:modern_geo_rug']) assert.equal(T.isTradeable(id), true, id);
  for (const id of ['w:crown', 'w:gold_suit', 'w:pres_scarf', 'w:pres_pin', 'f:gold_throne', 'f:gold_bed', 'f:royal_canopy_royal_bed', 'f:deco_emerald_deco_sofa', 'w:nope', 'p:streak7', 'bones']) assert.equal(T.isTradeable(id), false, id);
  for (const id of T.tradeableIds()) assert.deepEqual(offerItems({ a: [id], b: ['w:shades'] }).a, [id]);
});
test('provenance: only copies bought with Bones (or traded in) count; earned/starter copies stay locked', () => {
  const s = newGame('Pup', 'tan'); s.bones = 5000; s.wardrobe = { owned: ['shades'], equipped: {} }; // shades earned (quest prize)
  assert.equal(T.haveCount(s, 'w:shades'), 0); assert.ok(T.lockedOf(s).some((x) => x.id === 'w:shades'));
  assert.equal(buyOutfit(s, 'top_hat').ok, true); assert.equal(T.haveCount(s, 'w:top_hat'), 1);
  buyFurniture(s, 'chair', 2); assert.equal(T.haveCount(s, 'f:chair'), 2); assert.deepEqual(T.shelfOf(s), { 'w:top_hat': 1, 'f:chair': 2 });
  sellFromInventory(s, 'chair'); assert.equal(T.haveCount(s, 'f:chair'), 1);
});
test('applyDeal lands once; received furniture cannot be sold for Bones', () => {
  const s = newGame('Pup', 'tan'); s.bones = 5000; buyOutfit(s, 'top_hat'); s.wardrobe.equipped.hat = 'top_hat'; const before = s.bones;
  const d = { id: 'd1', status: 'done', at: 'aaaa', bt: 'bbbb', give: { a: ['w:top_hat'], b: ['f:lamp'] } };
  assert.equal(T.applyDeal(s, d, 'aaaa').ok, true); assert.equal(T.applyDeal(s, d, 'aaaa').ok, false);
  assert.equal(s.wardrobe.owned.includes('top_hat'), false); assert.equal(s.wardrobe.equipped.hat, undefined); assert.equal(s.inventory.lamp, 1); assert.equal(T.haveCount(s, 'f:lamp'), 1);
  const r = sellFromInventory(s, 'lamp'); assert.equal(r.ok, false); assert.match(r.reason, /trade/); assert.equal(s.bones, before);
});
test('full flow: offer -> both see -> lock -> signed confirms -> atomic swap, all in the Bureau item book', async () => {
  const R = rig(), { A, B } = await ready(R);
  const bo = (await A.list()).board.find((x) => x.name === 'Bo'); assert.ok(bo); assert.deepEqual(bo.shelf, { 'w:shades': 1, 'f:lamp': 1 });
  const o = await A.act({ act: 'offer', to: bo.tid, give: { a: ['w:top_hat'], b: ['w:shades'] } }); assert.equal(o.code, 200, o.error); const d = o.deal;
  assert.equal(d.aw, A.kp.pub); assert.equal(d.bw, undefined);
  const seen = (await B.list()).deals.find((x) => x.id === d.id); assert.deepEqual(seen.give, d.give); assert.equal(seen.side, 'b'); assert.equal(seen.aw, undefined);
  assert.equal((await B.confirm(seen)).code, 423, 'fresh offers are locked for a moment');
  R.tick(3500); let r = await B.confirm(seen); assert.equal(r.code, 200, r.error); assert.equal(r.deal.confirmed.b, true); assert.equal(r.deal.status, 'open');
  r = await A.confirm(d); assert.equal(r.code, 200, r.error); assert.equal(r.deal.status, 'done');
  assert.ok(R.signs.every((x) => /not a transaction/.test(x.text) && /No Bones, Pawmarks or \$KIBBLE/.test(x.text)));
  const book = await A.act({ act: 'book', id: d.id }); assert.deepEqual(book.entries.map((e) => e.action), ['item.offer', 'item.confirm', 'item.confirm', 'item.done']);
  assert.ok(book.entries.every((e) => e.value.amount === 0 && !JSON.stringify(e).includes(A.kp.pub) && !JSON.stringify(e).includes(B.kp.pub))); assert.equal(book.chain.ok, true);
  // anti-dupe: Ava's top hat is gone server-side even if her client still claims it
  R.tick(6000); const again = await A.act({ act: 'offer', to: bo.tid, give: { a: ['w:top_hat'], b: ['f:lamp'] } }); assert.equal(again.code, 409);
  const sA = newGame('Ava', 'tan'); sA.bones = 999; buyOutfit(sA, 'top_hat'); T.applyDeal(sA, (await A.list()).deals[0], (await A.list()).me.tid); assert.ok(sA.wardrobe.owned.includes('shades'));
});
test('either side changing the offer bumps the version, clears confirms and needs fresh signatures', async () => {
  const R = rig(), { A, B, la } = await ready(R), bo = la.board[0];
  const d = (await A.act({ act: 'offer', to: bo.tid, give: { a: ['w:top_hat'], b: ['w:shades'] } })).deal; R.tick(3500);
  const sb = (await B.list()).deals[0]; assert.equal((await B.confirm(sb)).deal.confirmed.b, true);
  const e = await B.act({ act: 'edit', id: d.id, ver: 1, give: { a: ['w:top_hat', 'f:chair'], b: ['w:shades'] } }); assert.equal(e.code, 200, e.error);
  assert.equal(e.deal.ver, 2); assert.deepEqual(e.deal.confirmed, { a: false, b: false }); assert.ok(e.deal.lockedMs > 0);
  assert.equal((await A.confirm(d)).code, 409, 'old version refused'); R.tick(3500);
  const old = R.signs.find((x) => x.who === 'Bo'); const replay = await B.act({ act: 'confirm', id: d.id, ver: 2, sig: B.kp.sign(old.text) }); assert.equal(replay.code, 409, 'a replayed v1 signature is refused'); assert.match(replay.error, /already used/);
  const forged = await B.act({ act: 'confirm', id: d.id, ver: 2, sig: B.kp.sign(old.text + ' ') }); assert.equal(forged.code, 401, 'a signature over other text does not confirm v2');
  const da = (await A.list()).deals[0], db = (await B.list()).deals[0];
  assert.equal((await A.confirm(da)).code, 200); const fin = await B.confirm(db); assert.equal(fin.deal.status, 'done');
  const dup = await B.act({ act: 'confirm', id: d.id, ver: 2, sig: B.kp.sign(T.confirmText(db, 'b')) }); assert.equal(dup.code, 409);
});
test('cancel at any point; expiry; stale edit refused', async () => {
  const R = rig(), { A, B, la } = await ready(R), bo = la.board[0];
  const d = (await A.act({ act: 'offer', to: bo.tid, give: { a: ['f:chair'], b: ['f:lamp'] } })).deal;
  const c = await B.act({ act: 'cancel', id: d.id }); assert.equal(c.deal.status, 'cancelled'); R.tick(1500);
  assert.equal((await A.confirm(d)).code, 409); R.tick(6000);
  const d2 = (await A.act({ act: 'offer', to: bo.tid, give: { a: ['f:chair'], b: ['f:lamp'] } })).deal; R.tick(31 * 60e3);
  assert.equal((await A.list()).deals.find((x) => x.id === d2.id).status, 'expired');
});
test('rejected: currency in any form, untradeable items, self trades, alts on one network, blocks, rate limits', async () => {
  const R = rig(), { A, B, la } = await ready(R), bo = la.board[0], me = la.me.tid;
  const bad = [{ a: ['w:top_hat'], b: ['w:shades'], bones: 50 }, { a: ['w:top_hat'], b: 100 }, { a: ['w:top_hat'], b: ['BONES'] }, { a: ['w:top_hat', 5], b: ['w:shades'] },
    { a: ['w:top_hat'], b: ['w:shades'], kibble: 1 }, { a: ['w:top_hat'], b: ['f:pawmarks'] }, { a: ['w:top_hat'], b: [] }, { a: ['w:crown'], b: ['w:shades'] }, { a: ['w:pres_scarf'], b: ['w:shades'] }];
  for (const give of bad) { gap(R); const r = await A.act({ act: 'offer', to: bo.tid, give }); assert.ok(r.code === 422 || r.code === 400, JSON.stringify(give) + ' -> ' + r.code); }
  gap(R); assert.equal((await A.act({ act: 'offer', to: me, give: { a: ['w:top_hat'], b: ['f:chair'] } })).code, 422);
  gap(R); const d = (await A.act({ act: 'offer', to: bo.tid, give: { a: ['w:top_hat'], b: ['w:shades'] } })).deal; R.tick(3500);
  assert.equal((await A.confirm(d, '9.9.9.9')).code, 200); const alt = await B.confirm((await B.list()).deals[0], '9.9.9.9'); assert.equal(alt.code, 422); assert.match(alt.error, /same network/);
  gap(R); const fast = await A.act({ act: 'offer', to: bo.tid, give: { a: ['f:chair'], b: ['f:lamp'] } }); assert.equal(fast.code, 200); assert.equal((await A.act({ act: 'offer', to: bo.tid, give: { a: ['f:chair'], b: ['f:lamp'] } })).code, 429);
  gap(R); const bl = await B.act({ act: 'block', tid: me }); assert.equal(bl.ok, true); assert.equal((await A.list()).deals.find((x) => x.id === fast.deal.id).status, 'cancelled');
  gap(R); assert.equal((await A.act({ act: 'offer', to: bo.tid, give: { a: ['f:chair'], b: ['f:lamp'] } })).code, 403);
  assert.equal((await A.list()).board.length, 0, 'blocked players vanish from the board');
  const rep = await A.act({ act: 'report', tid: bo.tid, reason: 'scam' }); assert.equal(rep.ok, true);
  const no = await R.call('nobody-token-xxxxxxxx', { act: 'list' }); assert.equal(no.code, 401);
});
test('new traders wait before their first offer (alt farming), item book refuses money in entries', async () => {
  const R = rig(), A = R.player('Ava'), B = R.player('Bo'); await A.list({ 'w:top_hat': 1 }); const lb = await B.list({ 'w:shades': 1 }); const la = await A.list(); assert.equal(la.board.length, 1);
  const r = await A.act({ act: 'offer', to: la.board[0].tid, give: { a: ['w:top_hat'], b: ['w:shades'] } }); assert.equal(r.code, 425); void lb;
  await assert.rejects(R.book.append({ actor: 'sim:bureau', action: 'item.done', deal: 'a'.repeat(24), data: { bones: 5 } }), /currency/);
  await assert.rejects(R.book.append({ actor: 'player:4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump', action: 'item.offer', deal: 'a'.repeat(24) }));
});
test('browser side: one wallet prompt per confirm tap, sign-in shared, refuses to sign for items you no longer have', async () => {
  const { createTrading } = await import('../src/tradeui.js');
  const s = newGame('Ava', 'tan'); s.bones = 999; buyOutfit(s, 'top_hat');
  let signs = 0, signIns = 0, release; const gate = new Promise((r) => { release = r; });
  const kp = { session: 's'.repeat(20), address: 'Ava1111111111111111111111111111111', get signedIn() { return signIns > 0; }, async signIn() { signIns++; },
    wallet: { async signMessage(bytes) { signs++; assert.match(new TextDecoder().decode(bytes), /not a transaction/); await gate; return '5'.repeat(88); } } };
  const calls = []; const api = async (b) => { calls.push(b.act); if (b.act === 'list') return { me: { tid: 'aaaa' }, board: [], deals: [] }; return { deal: { ...d, confirmed: { a: true, b: false } } }; };
  const d = { id: 'c'.repeat(24), side: 'a', ver: 1, status: 'open', give: { a: ['w:top_hat'], b: ['w:shades'] }, at: 'aaaa', bt: 'bbbb', aw: kp.address, bShort: 'Bo11…1111', nonce: 'n', confirmBy: T0, lockedMs: 0, confirmed: { a: false, b: false } };
  const T = createTrading({ kp: () => kp, getState: () => s, api });
  const p1 = T.confirm(d), p2 = T.confirm(d); release(); await Promise.all([p1, p2]);
  assert.equal(signs, 1); assert.equal(signIns, 1); assert.equal(calls.filter((x) => x === 'confirm').length, 1);
  s.wardrobe.owned = []; await T.confirm(d); assert.equal(signs, 1); assert.match(T.S.err, /no longer have/);
});
