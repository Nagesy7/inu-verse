import { chromium } from 'playwright';
const URL = process.env.URL || 'http://localhost:8643/', PRE = process.env.PRE || '', b = await chromium.launch(), errs = [], out = {};
const p = await b.newPage({ viewport: { width: 1280, height: 800 } }); p.on('pageerror', (e) => errs.push(e.message));
await p.goto(URL); await p.evaluate(() => localStorage.clear()); await p.reload(); await p.waitForTimeout(900); await p.click('#start'); await p.waitForTimeout(800);
await p.evaluate(() => { Object.assign(__inu.president, { on: false, stage: 'away', next: 1e9 }); });
const snap = async (h, name, focus) => { await p.evaluate((h) => { Object.assign(__inu.president, { on: false, stage: 'away', next: 1e9 }); __inu.setHour(h); }, h); await p.waitForTimeout(28000); // let the town re-plan and walk
  const st = await p.evaluate(() => Object.values(__inu.state.town.folk).map((f) => ({ n: f.name, act: f.act, mood: f.mood, arrived: f.arrived, goal: f.goal })));
  const npcs = await p.evaluate(() => __inu.npcs.map((n) => [n.name, Math.floor(n.x / 32), Math.floor(n.y / 32)]));
  const f = focus ? st.find((x) => x.act === focus) || st[0] : st[0]; await p.evaluate(([x, y]) => { globalThis.__camLock = { x: x * 32, y: y * 32 }; }, f.goal); await p.waitForTimeout(400);
  await p.screenshot({ path: `proof/${PRE}town-${name}.png` }); globalThis.__camLock = null; out[name] = { st, npcs }; };
await snap(8, '08h-morning', 'eat'); await snap(12, '12h-midday', 'work'); await snap(19, '19h-evening', 'event'); await snap(1, '01h-night', 'nap');
// president visit draws a crowd
await p.evaluate(() => { __inu.setHour(11); __inu.presVisit(); });
for (let i = 0; i < 40; i++) { await p.waitForTimeout(1000); if (await p.evaluate(() => __inu.president.on && __inu.president.x > 0 && __inu.president.stage === 'visit')) break; } out.pres = await p.evaluate(() => Object.values(__inu.state.town.folk).map((f) => f.act));
await p.evaluate(() => Object.assign(__inu.president, { on: false, stage: 'away', next: 1e9 })); await p.evaluate(() => __inu.setHour(14)); await p.waitForTimeout(24000);
out.work = await p.evaluate(() => Object.values(__inu.state.town.folk).map((f) => ({ n: f.name, act: f.act, goal: f.goal, arrived: f.arrived })));
const wk = out.work.find((x) => x.act === 'work') || out.work[0]; await p.evaluate(([x, y]) => { globalThis.__camLock = { x: x * 32, y: y * 32 }; }, wk.goal); await p.waitForTimeout(300); await p.screenshot({ path: `proof/${PRE}town-14h-work.png` }); await p.evaluate(() => { globalThis.__camLock = null; });
await p.evaluate(() => { globalThis.__camLock = { x: __inu.president.x, y: __inu.president.y }; }); await p.waitForTimeout(300); await p.screenshot({ path: `proof/${PRE}town-president-crowd.png` }); await p.evaluate(() => { globalThis.__camLock = null; });
// talk to a townsfolk: mood/activity/gossip + comment on the player
await p.evaluate(() => { __inu.state.town.log.unshift({ day: 0, hour: 9, text: 'You set a new best as a café order rush worker.', about: 'you' }); __open('friend', { name: 'Goma' }); }); await p.waitForTimeout(400);
out.talk = await p.evaluate(() => document.querySelector('#panel-body .say')?.textContent); await p.screenshot({ path: `proof/${PRE}town-talk-gossip.png` });
out.log = await p.evaluate(() => __inu.state.town.log.slice(0, 6).map((l) => l.text));
// worker on break
out.crew = await p.evaluate(() => { const W = __crew; return W ? W.map((w) => [w.name, w.on, w.onBreak]) : null; });
console.log(JSON.stringify(out.pres), '\nTALK', out.talk, '\nLOG', JSON.stringify(out.log), '\nCREW', JSON.stringify(out.crew));
for (const k of ['08h-morning', '12h-midday', '19h-evening', '01h-night']) console.log(k, out[k].st.map((s) => `${s.n}:${s.act}${s.arrived ? '✓' : ''}`).join(' '));
console.log('errors', JSON.stringify(errs)); await b.close();
