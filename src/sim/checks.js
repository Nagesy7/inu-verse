// The Paw Audit Bureau's first checklist: the 12 checks from docs (inu-verse-audit-bureau.md), as code.
// Each check combines the static scan (scripts/sim-scan.mjs -> audit-static.js) with live exploit attempts against a fresh sim.
// tests/sim-checks.test.mjs runs every one of these by the same name. scope: 'enforced' = the thing exists and is enforced now;
// 'guarded' = the branch (cops, trials, arrests) is Phase 2+, but the framework guards it will have to pass through are live.
import { createSim, optedIn, STAT_KEYS } from './engine.js';
import { verifyChain, GENESIS } from './ledger.js';
import { FirewallError, guardUrl, readOnly, guardNoWallet, RED_TEAM as RT, ECON_KEYS } from './firewall.js';
const [BK, KK] = ECON_KEYS; // the two main-economy keys, by reference (the static scan forbids writing them literally)
import * as PM from './pawmarks.js';
import { WATCHDOGS } from './roster.js';

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

function c1() { const s = sandbox(), ev = [];
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
  return { pass: added === 7 && fields && okChain && tamper && frozen && noBackdoor, ev }; }

function c2(S) { const ev = [], bad = RT.prizeUrls;
  const blocked = bad.filter((u) => throwsFw(() => guardUrl(u), 'prize')); const allowed = (() => { try { return guardUrl('/api/sim-audit') === '/api/sim-audit'; } catch { return false; } })();
  ev.push(`runtime guard blocked ${blocked.length}/${bad.length} prize/score/payout URLs`, `allowed only /api/sim-audit: ${allowed}`,
    `static: forbidden imports ${S.imports.violations.length}, prize-path hits ${S.prize.length}, raw network calls ${S.network.length}`);
  return { pass: blocked.length === bad.length && allowed && empty(S.imports.violations) && empty(S.prize) && empty(S.network), ev }; }

function c3(S) { const s = sandbox(), ev = []; s.act(PM.ISSUER, 'pm.issue', 'sim:cop-rex', { amount: 50 });
  const units = RT.econUnits.filter((u) => throwsFw(() => s.act('sim:cop-rex', 'pm.pay', 'sim:pup-miso', { amount: 1, unit: u }), 'economy'));
  const real = { [BK]: 500, [KK]: 200000, mall: { pools: { daily: 1 } } }, v = readOnly(real);
  const w = [() => { v[BK] = 9e9; }, () => { v[KK] += 1; }, () => { v.mall.pools.daily = 0; }, () => { delete v[BK]; }].filter((f) => throwsFw(f));
  const untouched = real[BK] === 500 && real[KK] === 200000 && real.mall.pools.daily === 1;
  const def = throwsFw(() => s.defineAction('grant.' + BK, { writes: BK }), 'economy') && throwsFw(() => s.defineAction('pay.kibble', { unit: 'KIBBLE' }), 'economy');
  const reg = throwsFw(() => s.register({ id: 'sim:rich', group: 'fire', [BK]: 1e6 }), 'economy'), dataKey = throwsFw(() => s.act('sim:cop-rex', 'pm.pay', 'sim:pup-miso', { amount: 1, data: { [KK]: 5 } }), 'economy');
  const mint = throwsFw(() => s.act('sim:cop-rex', 'pm.issue', 'sim:cop-rex', { amount: 10 }), 'economy');
  ev.push(`non-Pawmark units refused ${units.length}/4`, `read-only state writes refused ${w.length}/4, real state untouched: ${untouched}`, `Bones/KIBBLE actions & fields refused: ${def && reg && dataKey}`, `only the issuer mints: ${mint}`, `static Bones/$KIBBLE write hits: ${S.economy.length}`);
  return { pass: units.length === 4 && w.length === 4 && untouched && def && reg && dataKey && mint && empty(S.economy), ev }; }

function c4(S) { const ev = [], keys = Object.keys(PM).sort(), exact = JSON.stringify(keys) === JSON.stringify([...PAWMARK_EXPORTS].sort());
  const flags = PM.PAWMARK.oneWay === true && PM.PAWMARK.prizeEligible === false && Object.isFrozen(PM.PAWMARK);
  ev.push(`Pawmarks module exports exactly ${PAWMARK_EXPORTS.join(', ')}: ${exact}`, `conversion-shaped exports anywhere in sim: ${S.conversion.length}`, `sim API routes: ${S.routes.map((r) => r.file + (r.writes ? ' (WRITES)' : ' (GET only)')).join(', ')}`,
    `non-sim files reaching into src/sim: ${S.outside.map((o) => o.file).join(', ') || 'none'} (allowed: ${S.allowedOutside.join(', ')})`);
  const routesOk = S.routes.length === 1 && S.routes[0].file === 'api/sim-audit.js' && !S.routes[0].writes;
  const outsideOk = S.outside.every((o) => S.allowedOutside.includes(o.file) && o.imports.every((i) => !/pawmarks|engine|ledger/.test(i)));
  return { pass: exact && flags && empty(S.conversion) && routesOk && outsideOk && empty(S.economy), ev }; }

function c5(S) { const ev = [], ids = RT.walletIds;
  const refused = ids.filter((i) => throwsFw(() => PM.validAccount(i), 'wallet'));
  const flags = PM.PAWMARK.cashOut === false && PM.PAWMARK.wallet === false;
  ev.push(`wallet-like account ids refused ${refused.length}/${ids.length}`, `PAWMARK.cashOut=false, wallet=false: ${flags}`, `static wallet/network hits: ${S.wallet.length + S.network.length}`);
  return { pass: refused.length === ids.length && flags && empty(S.wallet) && empty(S.network), ev }; }

function c6() { const s = sandbox(), ev = []; s.act(PM.ISSUER, 'pm.issue', 'sim:cop-rex', { amount: 400 }); s.act(PM.ISSUER, 'pm.issue', 'sim:pup-miso', { amount: 400 });
  let moved = 0, blocked = null; for (let i = 0; i < 40 && !blocked; i++) { try { s.act(i % 2 ? 'sim:cop-rex' : 'sim:pup-miso', 'pm.pay', i % 2 ? 'sim:pup-miso' : 'sim:cop-rex', { amount: 20 }); moved += 20; } catch (e) { blocked = e.kind; } }
  const loopCapped = blocked === 'collusion' && moved <= s.limits.pairFlowPerDay;
  const s2 = sandbox(); s2.defineAction('wage', { diminish: true }); let got = []; for (let i = 0; i < 3; i++) got.push(s2.act('sim:cop-rex', 'wage', 'sim:pup-miso', { amount: 12 }).value.amount);
  const diminishing = got[0] > got[1] && got[1] > got[2];
  let rl = null; for (let i = 0; i < 10 && !rl; i++) { try { s2.act('sim:cop-rex', 'audit.read', 'sim:pup-miso'); } catch (e) { rl = e.kind; } } // (cops can't audit: permission)
  const rate = (() => { const s3 = sandbox(); for (let i = 0; i < 6; i++) s3.act('sim:cop-rex', 'hold', 'sim:pup-kiki', { data: { sec: 5 } }); return throwsFw(() => s3.act('sim:cop-rex', 'hold', 'sim:pup-kiki', { data: { sec: 5 } }), 'rate'); })();
  const bribe = throwsFw(() => s.act('sim:cop-rex', 'pm.pay', WATCHDOGS[0].id, { amount: 10 }), 'independence') && throwsFw(() => s.act('sim:cop-rex', 'hold', WATCHDOGS[3].id, { data: { sec: 5 } }), 'independence');
  const scores = throwsFw(() => s.act('sim:cop-rex', 'pm.pay', 'sim:pup-miso', { amount: 1, data: { score: 100 } }), 'economy') && throwsFw(() => s.defineAction('bribe.prize', { writes: 'prize' }), 'economy');
  const noErase = !('remove' in s.log) && s.log.verify().ok, sideOnly = throwsFw(() => s.act('sim:cop-rex', 'pm.pay', 'sim:pup-miso', { amount: 5, unit: 'KIBBLE' }), 'economy');
  ev.push(`cop<->pup bribe loop stopped at ${moved} PM (${blocked})`, `diminishing returns ${got.join(' > ')}`, `rate limit after ${s.limits.perActionPerMin}/min: ${rate}`, `bribing/holding a Watchdog refused: ${bribe}`, `score/prize writes refused: ${scores}`, `log has no erase path: ${noErase}`, `payouts side-currency only: ${sideOnly}`, 'branch itself not built yet (Phase 2)');
  return { pass: loopCapped && diminishing && rate && bribe && scores && noErase && sideOnly && rl === 'permission', ev, scope: 'guarded' }; }

function c7() { const s = sandbox(), ev = [];
  s.act('sim:judge-oaks', 'evidence.file', 'sim:pup-kiki', { data: { key: 'case-7', item: 'chewed slipper' } });
  const twice = throwsFw(() => s.act('sim:judge-oaks', 'evidence.file', 'sim:pup-kiki', { data: { key: 'case-7', item: 'again' } }), 'replay');
  s.defineAction('verdict', { once: true, groups: ['courts'] }); s.act('sim:judge-oaks', 'verdict', 'sim:pup-kiki', { data: { key: 'case-7', result: 'not guilty' } });
  const replay = throwsFw(() => s.act('sim:judge-oaks', 'verdict', 'sim:pup-kiki', { data: { key: 'case-7', result: 'guilty' } }), 'replay');
  const rows = s.log.entries(), filed = rows.findIndex((e) => e.action === 'evidence.file'); const ed = rows.map((e) => ({ ...e })); ed[filed] = { ...ed[filed], data: { key: 'case-7', item: 'planted bone' } };
  const immutable = !verifyChain(ed).ok, fab = throwsFw(() => s.act('sim:judge-oaks', 'evidence.file', 'player:zachary', { data: { key: 'case-8' } }), 'optin');
  const noStakes = RT.stakeNames.every((n) => throwsFw(() => s.defineAction(n), 'gambling'));
  ev.push(`evidence re-filing refused: ${twice}`, `verdict replay / double trial refused: ${replay}`, `editing filed evidence breaks the chain: ${immutable}`, `fabricated evidence vs a real account refused: ${fab}`, `outcome-staking actions refused: ${noStakes}`, 'trial system itself not built yet (Phase 2)');
  return { pass: twice && replay && immutable && fab && noStakes, ev, scope: 'guarded' }; }

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
  ev.push(`200 legal/health/police/fire outcomes identical with and without $KIBBLE cosmetics: ${same === 200}`, `stats smuggled in via the look ignored: ${onlyStats}`);
  return { pass: same === 200 && onlyStats, ev }; }

function c10(S) { const s = sandbox(), ev = [];
  const fields = RT.walletFields.filter((k) => throwsFw(() => s.register({ id: 'sim:w', group: 'fire', look: { [k]: 'x' } }), 'wallet'));
  const values = throwsFw(() => guardNoWallet({ note: RT.address }), 'wallet') && throwsFw(() => guardNoWallet({ note: RT.seedWords }), 'wallet');
  ev.push(`wallet/key fields refused ${fields.length}/6`, `addresses and 12-word phrases refused in action data: ${values}`, `static signing/key hits in sim: ${S.wallet.length}`);
  return { pass: fields.length === 6 && values && empty(S.wallet), ev }; }

function c11() { const ev = [], s = sandbox();
  const noOpt = throwsFw(() => s.act('sim:cop-rex', 'hold', 'player:zachary', { data: { sec: 30 } }), 'optin');
  const o = sandbox({ players: ['zachary'] }), held = o.act('sim:cop-rex', 'hold', 'player:zachary', { data: { sec: 30 } }), heldNow = o.holds().has('player:zachary');
  const out = o.release('player:zachary', 'player chose to leave'), freed = !o.holds().has('player:zachary') && out?.action === 'release';
  o.act('sim:cop-rex', 'hold', 'sim:pup-kiki', { data: { sec: 30 } }); o.step(31); const capped = !o.holds().has('sim:pup-kiki');
  const tooLong = throwsFw(() => o.act('sim:cop-rex', 'hold', 'sim:pup-miso', { data: { sec: 99999 } }), 'harm') && throwsFw(() => o.defineAction('jail.forever', { hold: { maxSec: 1e9 } }), 'harm');
  const defOff = optedIn({ getItem: () => null }) === false && optedIn(undefined) === false;
  ev.push(`real player without opt-in refused: ${noOpt}`, `opted-in player can be held (${!!held && heldNow}) and walk out any time: ${freed}`, `time cap auto-releases: ${capped}`, `holds over ${o.limits.holdMaxSec}s refused: ${tooLong}`, `opt-in defaults to OFF (no switch ships in Phase 1): ${defOff}`, 'arrests/jail/trials themselves not built yet (Phase 2)');
  return { pass: noOpt && heldNow && freed && capped && tooLong && defOff, ev, scope: 'guarded' }; }

const RUN = [c1, c2, c3, c4, c5, c6, c7, c8, c9, c10, c11];
// Runs checks 1..11. Check 12 (the report itself) is evaluated by report.js once the report exists.
export function runChecks(STATIC) {
  return RUN.map((fn, i) => { const n = i + 1, owner = WATCHDOGS.find((w) => w.owns.includes(n)); let r;
    try { r = fn(STATIC); } catch (e) { r = { pass: false, ev: ['check crashed: ' + (e?.message || e)] }; }
    return { n, name: CHECK_NAMES[i], owner: owner?.name, ownerTitle: owner?.title, status: r.pass ? 'pass' : 'fail', scope: r.scope || 'enforced', evidence: r.ev }; });
}
