// The Paw Audit Bureau's first checklist: the 12 checks from docs (inu-verse-audit-bureau.md), as code.
// Each check combines the static scan (scripts/sim-scan.mjs -> audit-static.js) with live exploit attempts against a fresh sim.
// tests/sim-checks.test.mjs runs every one of these by the same name. scope: 'enforced' = the thing exists and is enforced now;
// 'guarded' = the branch (cops, trials, arrests) is Phase 2+, but the framework guards it will have to pass through are live.
import { createSim, optedIn, STAT_KEYS } from './engine.js';
import { verifyChain, GENESIS } from './ledger.js';
import { FirewallError, guardUrl, guardedFetch, readOnly, guardNoWallet, RED_TEAM as RT, ECON_KEYS } from './firewall.js';
import { PLAYER_ACTIONS, PID } from './anchor.js';
const [BK, KK] = ECON_KEYS; // the two main-economy keys, by reference (the static scan forbids writing them literally)
import * as PM from './pawmarks.js';
import { WATCHDOGS } from './roster.js';
import { anchorPost, anchorGet, memoryStore, K, LIMITS as AL } from './anchor.js';
import { createPawWallet, STORE_KEY } from './pawbook.js';
import { hashOf } from './ledger.js';
import { CURRENCY } from './currency.js';
import { POLICE, decide, observe, offenseAt, isCrossing } from './police.js';
import { OFFICERS, OFFICER_IDS, officersAt } from './force.js';
import { createPatrol } from './patrol.js';

export const PAWMARK_EXPORTS = ['PAWMARK', 'ISSUER', 'SINK', 'validAccount', 'balances'];
export const CHECK_NAMES = ['Action log', 'Prize firewall', 'Main economy firewall', 'Side currency is one-way', 'No cash-out', 'Corrupt-cop branch',
  'Trial/evidence', 'Gambling check', 'Cosmetics rule', "Players' real wallets", 'Abuse and harm', 'Report'];
const throwsFw = (fn, kind) => { try { fn(); } catch (e) { return e instanceof FirewallError && (!kind || e.kind === kind); } return false; };
const empty = (a) => Array.isArray(a) && a.length === 0;
// a small town of sim pups for the Red-Team Pup to attack
export function sandbox(opts = {}) {
  const s = createSim({ seed: 7, ...opts });
  for (const w of WATCHDOGS) s.register({ id: w.id, name: w.name, group: 'watchdogs', role: w.role });
  s.register({ id: 'sim:cop-rex', name: 'Officer Rex', group: 'investigations', stats: { grit: 6 } });
  s.register({ id: 'sim:pup-miso', name: 'Miso', group: 'medical', stats: { heart: 6 } });
  s.register({ id: 'sim:pup-kiki', name: 'Kiki', group: 'fire', stats: { pace: 6 } });
  s.register({ id: 'sim:judge-oaks', name: 'Judge Oaks', group: 'courts', stats: { wits: 7 } });
  return s;
}

async function c1() { const s = sandbox(), ev = [];
  const before = s.log.length; s.act(PM.ISSUER, 'pm.issue', 'sim:cop-rex', { amount: 100 }); s.act('sim:cop-rex', 'pm.pay', 'sim:pup-miso', { amount: 30, data: { why: 'wage' } });
  s.act('sim:pup-miso', 'pm.sink', PM.SINK, { amount: 5, data: { why: 'fine' } }); s.act('sim:cop-rex', 'hold', 'sim:pup-kiki', { data: { sec: 60 } }); s.step(61);
  s.act('sim:judge-oaks', 'evidence.file', 'sim:pup-kiki', { data: { key: 'case-1', item: 'muddy paw print' } }); s.act(WATCHDOGS[5].id, 'audit.read', 'sim:cop-rex');
  const added = s.log.length - before, rows = s.log.entries(); ev.push(`7 actions -> ${added} log entries (6 actions + 1 time-cap release)`);
  const fields = rows.every((e) => ['actor', 'group', 'target', 'value', 'ts', 'hash', 'prev'].every((k) => e[k] !== undefined) && Number.isInteger(e.value.amount));
  const okChain = s.log.verify().ok;
  const edit = rows.map((e) => ({ ...e })); edit[2] = { ...edit[2], value: { ...edit[2].value, amount: 999 } };
  const swap = rows.slice(); [swap[3], swap[4]] = [swap[4], swap[3]];
  const drop = rows.slice(); drop.splice(3, 1);
  const tamper = !verifyChain(edit).ok && !verifyChain(swap).ok && !verifyChain(drop).ok && !verifyChain(rows.slice(0, -1), { expectHead: s.log.head() }).ok;
  const frozen = (() => { const live = s.log.entries(); live[0].actor = 'x'; return s.log.entries()[0].actor !== 'x'; })();
  const noBackdoor = !('remove' in s.log) && !('splice' in s.log) && !('setBalance' in s) && !('mint' in s) && s.log.entries()[0].prev === GENESIS;
  ev.push(`all fields present: ${fields}`, `chain verifies: ${okChain}`, `edit/reorder/delete/truncate detected: ${tamper}`, `entries are copies (frozen inside): ${frozen}`, `no remove/mint/setBalance API: ${noBackdoor}`);
  const A = await anchorAttack(); ev.push(...A.ev);
  return { pass: added === 7 && fields && okChain && tamper && frozen && noBackdoor && A.pass, ev }; }

// PAB-001 fix, attacked: a player wallet anchored on an in-memory copy of the /api/sim-log store
export function walletRig(t0 = 1.7e12) {
  let t = t0; const kv = memoryStore(() => t), m = new Map(), store = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
  const post = async (body, extra = {}) => { const r = await anchorPost(kv, JSON.parse(JSON.stringify(body)), { now: t, ipHash: extra.ip || 'ip' + t, size: JSON.stringify(body).length }); return r; };
  const net = async (u, o) => { const r = o.method === 'GET' ? await anchorGet(kv, new URL(u, 'https://sim.invalid').searchParams.get('pid')) : await post(o.body); return { status: r.status, json: async () => r.json }; };
  return { kv, store, mem: m, post, net, tick: (ms) => { t += ms; }, now: () => t, wallet: () => createPawWallet({ store, now: () => t, net }) };
}
async function anchorAttack() { const R = walletRig(), ev = [], w = R.wallet(); w.join(); w.payWage('check 1'); const sent = w.entries(); R.tick(AL.pidEverySec * 1000 + 5); const s1 = await w.sync(); const honest = s1.unsynced === 0 && s1.anchoredSeq === 2;
  const saved = JSON.parse(R.mem.get(STORE_KEY)), cp = JSON.parse(await R.kv.get(K.anchor(saved.pid))), acct = 'player:' + saved.pid;
  const mk = (over = {}) => { const e = { seq: cp.seq, ts: R.now(), actor: acct, group: 'sim', action: 'wallet.leave', target: acct, value: { amount: 0, unit: 'PAWMARK' }, data: null, prev: cp.head, ...over }; e.hash = hashOf(e); return e; };
  const tryPost = async (entries, token = saved.token) => { R.tick(AL.pidEverySec * 1000 + 5); return (await R.post({ pid: saved.pid, token, entries })).status; };
  const edited = { ...mk(), data: { why: 'edited after hashing' } }, fork = mk({ prev: '1'.repeat(64) }), replay = await tryPost(sent);
  const codes = { edited: await tryPost([edited]), fork: await tryPost([fork]), replay, overpaid: await tryPost([mk({ actor: 'sim:issuer', action: 'pm.wage', value: { amount: 500, unit: 'PAWMARK' } })]),
    bones: await tryPost([mk({ value: { amount: 0, unit: 'BONES' } })]), stranger: await tryPost([mk()], 'f'.repeat(48)), tooMany: await tryPost(Array.from({ length: AL.maxEntries + 1 }, () => mk())) };
  R.tick(AL.pidEverySec * 1000 + 5); await R.post({ pid: saved.pid, token: saved.token, entries: [mk()] }); const rate = (await R.post({ pid: saved.pid, token: saved.token, entries: [mk()] }, { ip: 'other' })).status;
  const big = (await anchorPost(R.kv, {}, { now: R.now(), size: AL.maxBody + 1 })).status;
  const keys = [...R.kv.map.keys()], simOnly = keys.every((k) => k.startsWith('sim:')), noEcon = !/"(bones|kibble|score|prize|payout|pools?|wallet)"\s*:/i.test([...R.kv.map.values()].map((v) => v.v).join(' '));
  const pass = honest && codes.edited === 409 && codes.fork === 409 && codes.replay === 409 && codes.overpaid === 422 && codes.bones === 422 && codes.stranger === 403 && codes.tooMany === 400 && rate === 429 && big === 413 && simOnly && noEcon;
  ev.push(`server anchor: honest sync accepted (${honest}); edited ${codes.edited}, forked ${codes.fork}, replayed ${codes.replay} -> refused`, `anchor re-checks rules: over-quota wage ${codes.overpaid}, non-${CURRENCY.short} unit ${codes.bones}, wrong owner ${codes.stranger}`,
    `anchor limits: >${AL.maxEntries} entries ${codes.tooMany}, rate limit ${rate}, body over ${AL.maxBody} B ${big}`, `anchor store keys all under sim: (${keys.length} keys) ${simOnly}; no Bones/$KIBBLE/score/prize fields stored: ${noEcon}`);
  return { pass, ev }; }


// Phase 3: a joined player with some wages, policed through the real wallet and the in-memory anchor
export async function policeRig({ wages = 3 } = {}) { const R = walletRig(), w = R.wallet(); w.join(); for (let i = 0; i < wages; i++) { w.payWage('rig'); R.tick(FLOWS_WAGE_MS); }
  const sync = async () => { R.tick(AL.pidEverySec * 1000 + 5); return w.sync(); };
  const cite3 = () => { const out = []; for (let i = 0; i < 3; i++) { out.push(w.cite(OFFICER_IDS[1], 'jaywalk', 10, 21)); R.tick(POLICE.cooldownMs + 1); } return out; };
  const saved = () => JSON.parse(R.mem.get(STORE_KEY));
  const forge = async (over = () => ({}), token) => { const sv = saved(), cp = JSON.parse(await R.kv.get(K.anchor(sv.pid))), acct = 'player:' + sv.pid; R.tick(AL.pidEverySec * 1000 + 5);
    const e = { seq: cp.seq, ts: R.now(), actor: OFFICER_IDS[1], group: 'sim', action: 'police.cite', target: acct, value: { amount: 0, unit: 'PAWMARK' }, data: { offense: 'jaywalk', tx: 10, ty: 21, fine: 0 }, prev: cp.head, ...over(acct, cp) }; e.hash = hashOf(e);
    return (await R.post({ pid: sv.pid, token: token || sv.token, entries: [e] })).status; };
  return { R, w, sync, cite3, forge, saved }; }
const FLOWS_WAGE_MS = 3 * 60e3 + 1;

function c2(S) { const ev = [], bad = RT.prizeUrls;
  const blocked = bad.filter((u) => throwsFw(() => guardUrl(u), 'prize')); const allowed = (() => { try { return guardUrl('/api/sim-audit') === '/api/sim-audit'; } catch { return false; } })();
  const methods = throwsFw(() => guardedFetch('/api/sim-audit', () => null, { method: 'POST', body: {} }), 'prize') && (() => { try { guardedFetch('/api/sim-log?pid=p0', () => null); return true; } catch { return false; } })();
  ev.push(`runtime guard blocked ${blocked.length}/${bad.length} prize/score/payout/off-site URLs`, `allowed only /api/sim-audit (GET) and /api/sim-log (GET, POST): ${allowed && methods}`,
    `static: forbidden imports ${S.imports.violations.length}, prize-path hits ${S.prize.length}, raw network calls ${S.network.length}`);
  return { pass: blocked.length === bad.length && allowed && methods && empty(S.imports.violations) && empty(S.prize) && empty(S.network), ev }; }

function c3(S) { const s = sandbox(), ev = []; s.act(PM.ISSUER, 'pm.issue', 'sim:cop-rex', { amount: 50 });
  const units = RT.econUnits.filter((u) => throwsFw(() => s.act('sim:cop-rex', 'pm.pay', 'sim:pup-miso', { amount: 1, unit: u }), 'economy'));
  const real = { [BK]: 500, [KK]: 200000, mall: { pools: { daily: 1 } } }, v = readOnly(real);
  const w = [() => { v[BK] = 9e9; }, () => { v[KK] += 1; }, () => { v.mall.pools.daily = 0; }, () => { delete v[BK]; }].filter((f) => throwsFw(f));
  const untouched = real[BK] === 500 && real[KK] === 200000 && real.mall.pools.daily === 1;
  const def = throwsFw(() => s.defineAction('grant.' + BK, { writes: BK }), 'economy') && throwsFw(() => s.defineAction('pay.kibble', { unit: 'KIBBLE' }), 'economy');
  const reg = throwsFw(() => s.register({ id: 'sim:rich', group: 'fire', [BK]: 1e6 }), 'economy'), dataKey = throwsFw(() => s.act('sim:cop-rex', 'pm.pay', 'sim:pup-miso', { amount: 1, data: { [KK]: 5 } }), 'economy');
  const mint = throwsFw(() => s.act('sim:cop-rex', 'pm.issue', 'sim:cop-rex', { amount: 10 }), 'economy');
  ev.push(`non-${CURRENCY.one} units refused ${units.length}/4`, `read-only state writes refused ${w.length}/4, real state untouched: ${untouched}`, `Bones/KIBBLE actions & fields refused: ${def && reg && dataKey}`, `only the issuer mints: ${mint}`, `static Bones/$KIBBLE write hits: ${S.economy.length}`, `server keys built only by the anchor (sim:*): ${empty(S.kvKeys)}; browser storage only inu.sim.* keys, never the game save: ${empty(S.storage)}`);
  return { pass: units.length === 4 && w.length === 4 && untouched && def && reg && dataKey && mint && empty(S.economy) && empty(S.kvKeys) && empty(S.storage), ev }; }

function c4(S) { const ev = [], keys = Object.keys(PM).sort(), exact = JSON.stringify(keys) === JSON.stringify([...PAWMARK_EXPORTS].sort());
  const flags = PM.PAWMARK.oneWay === true && PM.PAWMARK.prizeEligible === false && Object.isFrozen(PM.PAWMARK);
  ev.push(`${CURRENCY.name} module exports exactly ${PAWMARK_EXPORTS.join(', ')}: ${exact}`, `conversion-shaped exports anywhere in sim: ${S.conversion.length}`, `sim API routes: ${S.routes.map((r) => r.file + (r.writes ? ' (writes sim:* anchor keys only)' : ' (GET only)')).join(', ')}`,
    `non-sim files reaching into src/sim: ${S.outside.map((o) => o.file).join(', ') || 'none'} (allowed: ${S.allowedOutside.join(', ')})`);
  const LOG_VIA = ['../src/sim/anchor.js', '../src/sim/sha256.js', './_lib/kv.js'], r = Object.fromEntries(S.routes.map((x) => [x.file, x]));
  const routesOk = S.routes.length === 2 && r['api/sim-audit.js'] && !r['api/sim-audit.js'].writes && r['api/sim-log.js'] && r['api/sim-log.js'].via.every((v) => LOG_VIA.includes(v));
  const actionsOk = PLAYER_ACTIONS.every((a) => ['wallet.join', 'wallet.leave', 'pm.wage', 'pm.fine', 'pm.bail', 'police.cite', 'police.detain', 'police.release'].includes(a));
  ev.push(`anchor accepts only ${PLAYER_ACTIONS.join(', ')} (wages in, fines/bail destroyed, police entries carry no amount; nothing out): ${actionsOk}`);
  const outsideOk = S.outside.every((o) => S.allowedOutside.includes(o.file) && o.imports.every((i) => !/pawmarks|engine|ledger/.test(i)));
  return { pass: exact && flags && empty(S.conversion) && routesOk && actionsOk && outsideOk && empty(S.economy), ev }; }

async function c5(S) { const ev = [], ids = RT.walletIds;
  const refused = ids.filter((i) => throwsFw(() => PM.validAccount(i), 'wallet'));
  const flags = PM.PAWMARK.cashOut === false && PM.PAWMARK.wallet === false;
  const R = walletRig(), w = R.wallet(), pidOk = PID.test(w.pid) && !!PM.validAccount(w.account()), addrPid = (await anchorPost(memoryStore(), { pid: RT.address, token: 'a'.repeat(48), entries: [{}] })).status;
  ev.push(`wallet-like account ids refused ${refused.length}/${ids.length}`, `PAWMARK.cashOut=false, wallet=false: ${flags}`, `player ${CURRENCY.name} wallet id is a random device id, not a crypto address: ${pidOk}; anchor refuses an address as id (${addrPid})`, `static wallet/network hits: ${S.wallet.length + S.network.length}`);
  return { pass: refused.length === ids.length && flags && pidOk && addrPid === 400 && empty(S.wallet) && empty(S.network), ev }; }

async function c6() { const s = sandbox(), ev = []; s.act(PM.ISSUER, 'pm.issue', 'sim:cop-rex', { amount: 400 }); s.act(PM.ISSUER, 'pm.issue', 'sim:pup-miso', { amount: 400 });
  let moved = 0, blocked = null; for (let i = 0; i < 40 && !blocked; i++) { try { s.act(i % 2 ? 'sim:cop-rex' : 'sim:pup-miso', 'pm.pay', i % 2 ? 'sim:pup-miso' : 'sim:cop-rex', { amount: 20 }); moved += 20; } catch (e) { blocked = e.kind; } }
  const loopCapped = blocked === 'collusion' && moved <= s.limits.pairFlowPerDay;
  const s2 = sandbox(); s2.defineAction('wage', { diminish: true }); let got = []; for (let i = 0; i < 3; i++) got.push(s2.act('sim:cop-rex', 'wage', 'sim:pup-miso', { amount: 12 }).value.amount);
  const diminishing = got[0] > got[1] && got[1] > got[2];
  let rl = null; for (let i = 0; i < 10 && !rl; i++) { try { s2.act('sim:cop-rex', 'audit.read', 'sim:pup-miso'); } catch (e) { rl = e.kind; } } // (cops can't audit: permission)
  const rate = (() => { const s3 = sandbox(); for (let i = 0; i < 6; i++) s3.act('sim:cop-rex', 'hold', 'sim:pup-kiki', { data: { sec: 5 } }); return throwsFw(() => s3.act('sim:cop-rex', 'hold', 'sim:pup-kiki', { data: { sec: 5 } }), 'rate'); })();
  const bribe = throwsFw(() => s.act('sim:cop-rex', 'pm.pay', WATCHDOGS[0].id, { amount: 10 }), 'independence') && throwsFw(() => s.act('sim:cop-rex', 'hold', WATCHDOGS[3].id, { data: { sec: 5 } }), 'independence');
  const scores = throwsFw(() => s.act('sim:cop-rex', 'pm.pay', 'sim:pup-miso', { amount: 1, data: { score: 100 } }), 'economy') && throwsFw(() => s.defineAction('bribe.prize', { writes: 'prize' }), 'economy');
  const noErase = !('remove' in s.log) && s.log.verify().ok, sideOnly = throwsFw(() => s.act('sim:cop-rex', 'pm.pay', 'sim:pup-miso', { amount: 5, unit: 'KIBBLE' }), 'economy');
  const b = sandbox(); b.act(PM.ISSUER, 'pm.issue', 'sim:cop-rex', { amount: 100 }); const bribes = [b.act('sim:cop-rex', 'pm.bribe', 'sim:pup-miso', { amount: 20 }).value.amount];
  const tooSoon = throwsFw(() => b.act('sim:cop-rex', 'pm.bribe', 'sim:pup-miso', { amount: 10 }), 'cooldown'); b.step(61); const over = throwsFw(() => b.act('sim:cop-rex', 'pm.bribe', 'sim:pup-miso', { amount: 20 }), 'cap'); bribes.push(b.act('sim:cop-rex', 'pm.bribe', 'sim:pup-miso', { amount: 10 }).value.amount);
  const noPlayers = throwsFw(() => sandbox({ players: ['zachary'] }).act('sim:cop-rex', 'pm.bribe', 'player:zachary', { amount: 1 }), 'phase') || throwsFw(() => sandbox({ players: ['zachary'] }).act('sim:cop-rex', 'pm.bribe', 'player:zachary', { amount: 1 }));
  const bribeOk = tooSoon && over && bribes[1] < bribes[0] && noPlayers;
  const PR = await policeRig({ wages: 1 }); await PR.sync(); const playerBribe = await PR.forge((acct) => ({ actor: acct, action: 'pm.bribe', target: OFFICER_IDS[1], value: { amount: 5, unit: 'PAWMARK' }, data: null }));
  const copBribe = throwsFw(() => sandbox({ players: ['zachary'] }).act('sim:cop-rex', 'pm.bribe', 'player:zachary', { amount: 1 }));
  ev.push(`a player bribing an officer is refused by the server (${playerBribe}); officers bribing players refused: ${copBribe}; the wallet has no bribe call: ${!('bribe' in PR.w)}`);
  ev.push(`bribe primitive: ${bribes.join(' then ')} (halves each time), cooldown ${tooSoon}, over-cap refused ${over}, never with players until Phase 7 ${noPlayers}`);
  ev.push(`cop<->pup bribe loop stopped at ${moved} PM (${blocked})`, `diminishing returns ${got.join(' > ')}`, `rate limit after ${s.limits.perActionPerMin}/min: ${rate}`, `bribing/holding a Watchdog refused: ${bribe}`, `score/prize writes refused: ${scores}`, `log has no erase path: ${noErase}`, `payouts side-currency only: ${sideOnly}`, 'corrupt-cop branch itself not built yet (Phase 7)');
  return { pass: loopCapped && diminishing && rate && bribe && scores && noErase && sideOnly && rl === 'permission' && bribeOk && playerBribe === 422 && copBribe, ev, scope: 'guarded' }; }

async function c7() { const s = sandbox(), ev = [];
  s.act('sim:judge-oaks', 'evidence.file', 'sim:pup-kiki', { data: { key: 'case-7', item: 'chewed slipper' } });
  const twice = throwsFw(() => s.act('sim:judge-oaks', 'evidence.file', 'sim:pup-kiki', { data: { key: 'case-7', item: 'again' } }), 'replay');
  s.defineAction('verdict', { once: true, groups: ['courts'] }); s.act('sim:judge-oaks', 'verdict', 'sim:pup-kiki', { data: { key: 'case-7', result: 'not guilty' } });
  const replay = throwsFw(() => s.act('sim:judge-oaks', 'verdict', 'sim:pup-kiki', { data: { key: 'case-7', result: 'guilty' } }), 'replay');
  const rows = s.log.entries(), filed = rows.findIndex((e) => e.action === 'evidence.file'); const ed = rows.map((e) => ({ ...e })); ed[filed] = { ...ed[filed], data: { key: 'case-7', item: 'planted bone' } };
  const immutable = !verifyChain(ed).ok, fab = throwsFw(() => s.act('sim:judge-oaks', 'evidence.file', 'player:zachary', { data: { key: 'case-8' } }), 'optin');
  const noStakes = RT.stakeNames.every((n) => throwsFw(() => s.defineAction(n), 'gambling'));
  const PR = await policeRig({ wages: 1 }); const c = PR.w.cite(OFFICER_IDS[1], 'jaywalk', 10, 21).cite; await PR.sync(); const anchored = PR.w.state().anchoredSeq > c.seq;
  const editCite = await PR.forge((acct, cp) => ({ seq: c.seq, prev: c.prev, data: { ...c.data, offense: 'flowers' } })), fake = await PR.forge(() => ({ actor: 'sim:pd-nobody' })), wrongForce = await PR.forge(() => ({ actor: OFFICER_IDS[5] }));
  const fields = ['offense', 'tx', 'ty', 'fine'].every((k) => k in c.data) && OFFICER_IDS.includes(c.actor);
  const engine = sandbox(); engine.register({ id: 'sim:pd-a', group: 'police' }); const ec = engine.act('sim:pd-a', 'police.cite', 'sim:pup-kiki', { data: { offense: 'jaywalk' } }); const ed2 = engine.log.entries().map((e) => e.seq === ec.seq ? { ...e, data: { offense: 'none' } } : e);
  const citeOk = anchored && editCite === 409 && fake === 422 && wrongForce === 422 && fields && !verifyChain(ed2).ok;
  ev.push(`citations are evidence: offence, tile and officer in a hash-chained entry anchored on the server (${anchored}); editing an anchored citation ${editCite}, an unknown officer ${fake}, the wrong force ${wrongForce}`);
  ev.push(`evidence re-filing refused: ${twice}`, `verdict replay / double trial refused: ${replay}`, `editing filed evidence breaks the chain: ${immutable}`, `fabricated evidence vs a real account refused: ${fab}`, `outcome-staking actions refused: ${noStakes}`, 'trial system itself not built yet (later phases)');
  return { pass: twice && replay && immutable && fab && noStakes && citeOk, ev, scope: 'guarded' }; }

function c8(S) { const s = sandbox(), ev = [];
  const paidChance = throwsFw(() => s.defineAction(RT.paidChance.name, RT.paidChance), 'gambling'), names = RT.gamblingNames.filter((n) => throwsFw(() => s.defineAction(n), 'gambling'));
  ev.push(`random paid reward refused: ${paidChance}`, `gambling-shaped actions refused ${names.length}/5`, `static gambling hits in sim: ${S.gambling.length}`, `main game random-paid-reward scan: ${S.context.randomPaid.length ? S.context.randomPaid.join(', ') : 'none found'}`);
  return { pass: paidChance && names.length === 5 && empty(S.gambling), ev }; }

function c9() { const ev = [], stats = { grit: 5, wits: 5, heart: 5, pace: 5 };
  // two identical sims; in one, the pup wears the priciest $KIBBLE cosmetics (and tries to smuggle stats in through its look)
  const A = sandbox(), B = sandbox(); A.register({ id: 'sim:x', name: 'Plain', group: 'fire', stats });
  const fancy = B.register({ id: 'sim:x', name: 'Fancy', group: 'fire', stats, look: { hat: 'crown', neck: 'diamond_chain', top: 'gold_suit', eyes: 'plat_shades', kennel: 'alpha', stats: { grit: 10, wits: 10 } } });
  let same = 0; for (const k of ['legal', 'health', 'police', 'fire']) for (let i = 0; i < 50; i++) if (A.resolve('sim:x', k, i) === B.resolve('sim:x', k, i)) same++;
  const onlyStats = JSON.stringify(Object.keys(fancy.stats)) === JSON.stringify(STAT_KEYS) && fancy.stats.grit === 5;
  // Phase 3: police outcomes for real players read where you stand, nothing else
  const T = { ROAD: 1, FLOWER: 7, GRASS: 0 }, plain = { x: 0, y: 0 }, rich = { x: 0, y: 0, outfit: { hat: 'crown', neck: 'diamond_chain', top: 'gold_suit' }, kibble: 1e6, bones: 1e9, items: ['alpha_kennel'], score: 99999, vip: true };
  let pSame = 0, pHits = 0; for (let i = 0; i < 200; i++) { const t = i * 3.7, o = officersAt(t)[1 + (i % 6)], tx = Math.floor(o.x) + (i % 3) - 1, ty = Math.floor(o.y) + (i % 4) - 2;
    const go = (p) => { const v = observe({ ...p, x: (tx + 0.5) * 32, y: (ty + 0.5) * 32 }), off = i % 2 ? 'jaywalk' : 'flowers'; return JSON.stringify(decide({ offense: off, dwellMs: 3000, at: { x: v.x / 32, y: v.y / 32 }, officers: officersAt(t) })); };
    const a = go(plain), b = go(rich); if (a === b) pSame++; if (a !== 'null') pHits++; }
  const viewOnly = JSON.stringify(Object.keys(observe(rich))) === '["x","y"]';
  ev.push(`200 police/ranger decisions identical for a plain pup and one with the priciest $KIBBLE cosmetics, Bones and score: ${pSame === 200} (${pHits} were citations)`, `the police only ever see x/y: ${viewOnly}`);
  return { pass: same === 200 && onlyStats && pSame === 200 && pHits > 20 && viewOnly, ev }; }

function c10(S) { const s = sandbox(), ev = [];
  const fields = RT.walletFields.filter((k) => throwsFw(() => s.register({ id: 'sim:w', group: 'fire', look: { [k]: 'x' } }), 'wallet'));
  const values = throwsFw(() => guardNoWallet({ note: RT.address }), 'wallet') && throwsFw(() => guardNoWallet({ note: RT.seedWords }), 'wallet');
  ev.push(`wallet/key fields refused ${fields.length}/6`, `addresses and 12-word phrases refused in action data: ${values}`, `static signing/key hits in sim: ${S.wallet.length}`);
  return { pass: fields.length === 6 && values && empty(S.wallet), ev }; }

async function c11() { const ev = [], s = sandbox();
  const noOpt = throwsFw(() => s.act('sim:cop-rex', 'hold', 'player:zachary', { data: { sec: 30 } }), 'optin');
  const o = sandbox({ players: ['zachary'] }), held = o.act('sim:cop-rex', 'hold', 'player:zachary', { data: { sec: 30 } }), heldNow = o.holds().has('player:zachary');
  const out = o.release('player:zachary', 'player chose to leave'), freed = !o.holds().has('player:zachary') && out?.action === 'release';
  o.act('sim:cop-rex', 'hold', 'sim:pup-kiki', { data: { sec: 30 } }); o.step(31); const capped = !o.holds().has('sim:pup-kiki');
  const tooLong = throwsFw(() => o.act('sim:cop-rex', 'hold', 'sim:pup-miso', { data: { sec: 99999 } }), 'harm') && throwsFw(() => o.defineAction('jail.forever', { hold: { maxSec: 1e9 } }), 'harm');
  const defOff = optedIn({ getItem: () => null }) === false && optedIn(undefined) === false;
  const R = walletRig(), w = R.wallet(), before = throwsFw(() => w.payWage(), 'optin'); w.join(); const paid = !!w.payWage(); w.leave(); R.tick(4 * 60e3); const after = throwsFw(() => w.payWage(), 'optin');
  const W2 = walletRig(), w2 = W2.wallet(), srv = await (async () => { const raw = JSON.parse(W2.mem.get(STORE_KEY)); const e = { seq: 0, ts: W2.now(), actor: 'sim:issuer', group: 'sim', action: 'pm.wage', target: 'player:' + raw.pid, value: { amount: 10, unit: 'PAWMARK' }, data: null, prev: '0'.repeat(64) }; e.hash = hashOf(e); return (await W2.post({ pid: raw.pid, token: raw.token, entries: [e] })).status; })();
  ev.push(`${CURRENCY.name} wallet: no wages before joining ${before}, wages after joining ${paid}, none after leaving ${after}; server refuses wages for a player who never joined (${srv})`);
  // ---- Phase 3: arrests/detentions of real players, enforced ----
  const A = await policeRig(), unj = walletRig().wallet(), notJoined = throwsFw(() => unj.cite(OFFICER_IDS[1], 'jaywalk', 10, 21), 'optin');
  const early = (() => { A.w.cite(OFFICER_IDS[1], 'jaywalk', 10, 21); A.R.tick(POLICE.cooldownMs + 1); try { A.w.detain(OFFICER_IDS[1], 'jaywalk', 10, 21); return false; } catch (e) { return e.kind === 'harm'; } })();
  A.w.cite(OFFICER_IDS[1], 'jaywalk', 10, 21); A.R.tick(POLICE.cooldownMs + 1); A.w.cite(OFFICER_IDS[1], 'jaywalk', 10, 21);
  const over60 = throwsFw(() => A.w.detain(OFFICER_IDS[1], 'jaywalk', 10, 21, POLICE.maxDetainSec + 1), 'harm');
  A.w.detain(OFFICER_IDS[1], 'jaywalk', 10, 21); const isHeld = !!A.w.state().held && A.w.state().held.sec <= 60; const bal0 = A.w.balance(); A.w.payBail(); const bail = !A.w.state().held && A.w.balance() === bal0 - POLICE.bail;
  const syncA = await A.sync(), anchoredA = syncA.unsynced === 0 && syncA.server === 'ok';
  const B = await policeRig(); B.cite3(); B.w.detain(OFFICER_IDS[1], 'jaywalk', 10, 21); B.R.tick(POLICE.detainSec * 1000 + 10); const expired = !B.w.state().held; const walk = !!B.w.release('walked it off') && !B.w.state().heldRecord;
  const C = await policeRig(); C.cite3(); C.w.detain(OFFICER_IDS[1], 'jaywalk', 10, 21); C.w.leave(); const optOut = !C.w.state().held && !C.w.state().joined;
  const D = await policeRig(); D.cite3(); D.w.detain(OFFICER_IDS[1], 'jaywalk', 10, 21); const leave = !!D.w.release('left the scene') && !D.w.state().held; const dSync = await D.sync();
  // the patrol tick: a frozen copy of the position in, no movement out; walking 9 tiles away ends a detention
  const E = await policeRig(); E.cite3(); E.w.detain(OFFICER_IDS[1], 'jaywalk', 10, 21); const P = createPatrol({ wallet: E.w, now: E.R.now }); const view = Object.freeze({ x: 10.5 * 32, y: 21.5 * 32, driving: false }), tileAt = () => 2;
  const r1 = P.tick(0.016, 0, view, tileAt, { ROAD: 1, FLOWER: 7, GRASS: 0, WALK: 2, DIRT: 10 }); const stillHeld = !!E.w.state().held; E.R.tick(500);
  P.tick(0.016, 0, Object.freeze({ x: 20.5 * 32, y: 21.5 * 32 }), tileAt, { ROAD: 1, FLOWER: 7 }); const walkedAway = !E.w.state().held && view.x === 10.5 * 32 && r1 === null && stillHeld;
  // caps, self-citation, server re-checks
  const F2 = await policeRig(); for (let i = 0; i < POLICE.citesPerDay; i++) { F2.w.cite(OFFICER_IDS[1], 'jaywalk', 10, 21); F2.R.tick(POLICE.cooldownMs + 1); } const citeCap = throwsFw(() => F2.w.cite(OFFICER_IDS[1], 'jaywalk', 10, 21), 'cap');
  const G = await policeRig({ wages: 1 }); await G.sync();
  const self = await G.forge((acct) => ({ actor: acct })), longHold = await G.forge(() => ({ action: 'police.detain', data: { offense: 'jaywalk', tx: 1, ty: 1, sec: 61 } })), noPriors = await G.forge(() => ({ action: 'police.detain', data: { offense: 'jaywalk', tx: 1, ty: 1, sec: 30 } }));
  const H = walletRig(), hw = H.wallet(); await (async () => { H.tick(3000); await hw.sync(); })(); const strangerCite = await (async () => { const raw = JSON.parse(H.mem.get(STORE_KEY)); const e = { seq: 0, ts: H.now(), actor: OFFICER_IDS[1], group: 'sim', action: 'police.cite', target: 'player:' + raw.pid, value: { amount: 0, unit: 'PAWMARK' }, data: { offense: 'jaywalk', tx: 1, ty: 1, fine: 0 }, prev: '0'.repeat(64) }; e.hash = hashOf(e); H.tick(3000); return (await H.post({ pid: raw.pid, token: raw.token, entries: [e] })).status; })();
  const eSelf = throwsFw(() => { const x = sandbox(); x.register({ id: 'sim:pd-a', group: 'police' }); x.act('sim:pd-a', 'police.cite', 'sim:pd-a'); }, 'collusion'), eLong = throwsFw(() => { const x = sandbox({ players: ['zachary'] }); x.register({ id: 'sim:pd-a', group: 'police' }); x.act('sim:pd-a', 'police.detain', 'player:zachary', { data: { sec: 61 } }); }, 'harm');
  // alts: one network, many fresh wallets -> only LIMITS.altsPerIpDay may earn wages per day
  const alts = await (async () => { let t = 1.8e12; const kv = memoryStore(() => t), codes = []; for (let n = 0; n < AL.altsPerIpDay + 1; n++) { const m = new Map(), st = { getItem: (k) => m.get(k) ?? null, setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
      const net = async (u, o) => { const r = o.method === 'GET' ? await anchorGet(kv, new URL(u, 'https://sim.invalid').searchParams.get('pid')) : await anchorPost(kv, JSON.parse(JSON.stringify(o.body)), { now: t, ipHash: 'same-net', size: 100 }); return { status: r.status, json: async () => r.json }; };
      const ww = createPawWallet({ store: st, now: () => t, net }); ww.join(); ww.payWage('alt'); t += 1100; const r = await ww.sync(); codes.push(r.balance); t += 1100; } return codes; })();
  const altOk = alts.slice(0, AL.altsPerIpDay).every((b) => b > 0) && alts[AL.altsPerIpDay] === 0;
  ev.push(`real player without opt-in refused: ${noOpt} (engine), ${notJoined} (wallet), server ${strangerCite}`, `detention only after ${POLICE.priorCites} citations in ${POLICE.repeatWindowMs / 60e3} min: ${early}; server refuses one without them (${noPriors})`,
    `detentions capped at ${POLICE.maxDetainSec} s: wallet ${over60}, engine ${eLong}, server ${longHold}; this one ${POLICE.detainSec} s (${isHeld})`,
    `ways out, all logged and anchored (${anchoredA}, ${dSync.unsynced === 0}): bail ${bail}, walk it off ${expired && walk}, opt out ${optOut}, leave the scene ${leave}`,
    `the patrol tick gets a frozen copy of the position, moves nothing, and walking away ends the detention: ${walkedAway}`,
    `no self-citation or self-arrest: server ${self}, engine ${eSelf}; daily citation cap: ${citeCap}; at most ${AL.altsPerIpDay} wallets per network earn wages a day: ${altOk} (${alts.join(', ')})`,
    `opted-in sim hold walks out any time: ${freed}; time cap auto-releases: ${capped}; holds over ${o.limits.holdMaxSec}s refused: ${tooLong}; opt-in defaults to OFF: ${defOff}`);
  const arrests = notJoined && strangerCite === 422 && early && noPriors === 422 && over60 && eLong && longHold === 422 && isHeld && anchoredA && bail && expired && walk && optOut && leave && dSync.unsynced === 0 && walkedAway && self === 422 && eSelf && citeCap && altOk;
  return { pass: noOpt && heldNow && !!held && freed && capped && tooLong && defOff && before && paid && after && srv === 422 && !!w2 && arrests, ev, scope: 'enforced' }; }

const RUN = [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11];
// Runs checks 1..11. Check 12 (the report itself) is evaluated by report.js once the report exists.
export async function runChecks(STATIC) {
  const out = []; for (const [i, fn] of RUN.entries()) { const n = i + 1, owner = WATCHDOGS.find((w) => w.owns.includes(n)); let r;
    try { r = await fn(STATIC); } catch (e) { r = { pass: false, ev: ['check crashed: ' + (e?.message || e)] }; }
    out.push({ n, name: CHECK_NAMES[i], owner: owner?.name, ownerTitle: owner?.title, status: r.pass ? 'pass' : 'fail', scope: r.scope || 'enforced', evidence: r.ev }); }
  return out;
}
