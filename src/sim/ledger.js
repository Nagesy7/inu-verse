// Paw Audit Bureau action log: append-only and hash-chained. Every sim agent action is one entry
// { seq, ts, actor, group, action, target, value: { amount, unit }, data, prev, hash }. hash = sha256(canonical(entry without hash)).
// Entries are frozen; the log hands out copies; verifyChain() catches any edit, reorder, insert or deletion.
import { sha256 } from './sha256.js';
export const GENESIS = '0'.repeat(64);
export const GROUPS = ['watchdogs', 'investigations', 'police', 'rangers', 'courts', 'medical', 'fire', 'sim']; // PAB + the four Phase 2+ groups + 'sim' (system events)
export function canonical(v) { if (v === undefined) return 'null'; if (v === null || typeof v !== 'object') return JSON.stringify(v);
  if (Array.isArray(v)) return '[' + v.map(canonical).join(',') + ']';
  return '{' + Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => JSON.stringify(k) + ':' + canonical(v[k])).join(',') + '}'; }
const deepFreeze = (o) => { if (o && typeof o === 'object' && !Object.isFrozen(o)) { Object.freeze(o); for (const k of Object.keys(o)) deepFreeze(o[k]); } return o; };
export const hashOf = (e) => { const { hash, ...rest } = e; return sha256(canonical(rest)); };

export function createLog({ now = () => Date.now(), base = null } = {}) {
  const rows = [], B = { seq: base?.seq ?? 0, head: base?.head ?? GENESIS, ts: base?.ts ?? 0 }; // base = an anchored checkpoint to continue from
  const append = (r) => {
    for (const f of ['actor', 'group', 'action', 'target']) if (typeof r[f] !== 'string' || !r[f]) throw new Error(`log entry needs ${f}`);
    if (!GROUPS.includes(r.group)) throw new Error(`unknown group ${r.group}`);
    const amount = r.value?.amount ?? 0, unit = r.value?.unit ?? 'PAWMARK';
    if (!Number.isInteger(amount) || amount < 0) throw new Error('value.amount must be a whole number >= 0');
    const prev = rows.length ? rows[rows.length - 1].hash : B.head, ts = Math.max(Number(now()) || 0, rows.length ? rows[rows.length - 1].ts : B.ts);
    const e = { seq: B.seq + rows.length, ts, actor: r.actor, group: r.group, action: r.action, target: r.target, value: { amount, unit }, data: r.data ?? null, prev };
    e.hash = hashOf(e); rows.push(deepFreeze(JSON.parse(JSON.stringify(e)))); return rows[rows.length - 1];
  };
  return { append, get length() { return rows.length; }, head: () => rows.length ? rows[rows.length - 1].hash : B.head,
    entries: () => rows.map((e) => JSON.parse(JSON.stringify(e))), verify: () => verifyChain(rows, { base: B }) };
}

// Pure check over any array of entries (e.g. one exported to JSON and edited).
export function verifyChain(list, { expectHead, base = null } = {}) {
  let prev = base?.head ?? GENESIS, ts = base?.ts ?? 0; const s0 = base?.seq ?? 0;
  for (let i = 0; i < list.length; i++) { const e = list[i];
    if (!e || e.seq !== s0 + i) return { ok: false, at: i, reason: 'sequence broken (reordered, inserted or deleted)' };
    if (e.prev !== prev) return { ok: false, at: i, reason: 'prev hash does not match (reordered or a link removed)' };
    if (hashOf(e) !== e.hash) return { ok: false, at: i, reason: 'entry hash mismatch (edited)' };
    if (!(e.ts >= ts)) return { ok: false, at: i, reason: 'timestamp went backwards' };
    prev = e.hash; ts = e.ts; }
  if (expectHead && expectHead !== prev) return { ok: false, at: list.length, reason: 'head does not match the anchored head (truncated or replaced)' };
  return { ok: true, length: list.length, head: prev };
}
