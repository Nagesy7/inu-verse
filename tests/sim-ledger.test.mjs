// Paw Audit Bureau action log: append-only, hash-chained, tamper-evident.
import test from 'node:test'; import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
const { createLog, verifyChain, GENESIS, canonical } = await import('../src/sim/ledger.js'); const { sha256 } = await import('../src/sim/sha256.js');
const mk = (n = 6) => { let t = 1000; const L = createLog({ now: () => (t += 10) }); for (let i = 0; i < n; i++) L.append({ actor: 'sim:a' + i, group: 'courts', action: 'note', target: 'sim:b', value: { amount: i, unit: 'PAWMARK' }, data: { i } }); return L; };
test('sha256 matches node:crypto', () => { for (const s of ['', 'abc', 'x'.repeat(200), 'paw 🐾 ünï']) assert.equal(sha256(s), createHash('sha256').update(s).digest('hex')); });
test('a fresh chain verifies and links to genesis', () => { const L = mk(); const r = L.verify(); assert.ok(r.ok); assert.equal(r.length, 6); assert.equal(L.entries()[0].prev, GENESIS); assert.equal(r.head, L.head()); });
test('editing any field of any entry breaks verification', () => { const rows = mk().entries();
  for (let i = 0; i < rows.length; i++) for (const f of ['actor', 'group', 'action', 'target', 'ts', 'value', 'data']) { const c = structuredClone(rows); c[i][f] = f === 'value' ? { amount: 77, unit: 'PAWMARK' } : f === 'ts' ? c[i].ts + 1 : f === 'data' ? { i: -1 } : 'x';
    const v = verifyChain(c); assert.equal(v.ok, false, `edit ${f}@${i}`); assert.equal(v.at, i); } });
test('re-hashing an edited entry still breaks the next link', () => { const c = mk().entries(); c[2].value = { amount: 500, unit: 'PAWMARK' }; const { hash, ...rest } = c[2]; c[2].hash = sha256(canonical(rest)); const v = verifyChain(c); assert.equal(v.ok, false); assert.equal(v.at, 3); });
test('reordering, inserting, deleting or truncating breaks verification', () => { const rows = mk().entries();
  const sw = rows.slice(); [sw[1], sw[2]] = [sw[2], sw[1]]; assert.equal(verifyChain(sw).ok, false);
  const del = rows.slice(); del.splice(2, 1); assert.equal(verifyChain(del).ok, false);
  const ins = rows.slice(); ins.splice(2, 0, { ...rows[2] }); assert.equal(verifyChain(ins).ok, false);
  assert.equal(verifyChain(rows.slice(0, 4), { expectHead: rows.at(-1).hash }).ok, false); assert.ok(verifyChain(rows.slice(0, 4)).ok, 'a prefix alone is still internally consistent (why heads get anchored)'); });
test('the log is append-only: entries are frozen and handed out as copies; no remove API', () => { const L = mk(); const e = L.entries(); e[0].actor = 'evil'; e.pop(); assert.equal(L.entries()[0].actor, 'sim:a0'); assert.equal(L.length, 6);
  assert.deepEqual(Object.keys(L).sort(), ['append', 'entries', 'head', 'length', 'verify']); });
test('bad entries are refused', () => { const L = createLog(); assert.throws(() => L.append({ actor: 'sim:a', group: 'nope', action: 'x', target: 'sim:b' })); assert.throws(() => L.append({ actor: 'sim:a', group: 'fire', action: 'x', target: 'sim:b', value: { amount: 1.5 } })); assert.throws(() => L.append({ group: 'fire', action: 'x', target: 'sim:b' })); });
