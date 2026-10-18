// Boss Raids in Inu Verse: always-on hourly bosses at the Raid Gate (Kibble Plaza). Free to play for everyone, signed in or not.
// A Kennel tier or an Inu cosmetic auto-enters your pup into the current event (a roster convenience only; it never changes
// damage, score or prizes). Scores are skill only: kibble-pay re-plays your inputs with the shared sim (src/bossraid.js)
// and ignores any claimed score. No bets, no raffles, no chance. Contract: /workspace/inu-shared/boss-raids.md.
import * as B from './bossraid.js';
export const KP = 'https://kibble-pay.vercel.app';
export const SCORE_PAGE = KP + '/inu-score';
const LS_REPLAYS = 'inu.raid.replays.v1', LS_JOINED = 'inu.raid.joined.v1';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const short = (w) => (w ? w.slice(0, 4) + '…' + w.slice(-4) : '');
const fmtT = (ms) => new Date(ms).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });

// ---- API (kibble-pay /api/raid + /api/inu-score) ----
export function raidApi({ f = globalThis.fetch, base = KP, session = () => null } = {}) {
  const get = async (q) => { const r = await f(base + q); return r.json(); };
  const post = async (path, body) => { const s = session(); const r = await f(base + path, { method: 'POST', headers: { 'content-type': 'application/json', ...(s ? { authorization: 'Bearer ' + s } : {}) }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); return { status: r.status, ...j }; };
  return { event: () => get('/api/raid'), replay: (ev, w) => get(`/api/raid?replay=${encodeURIComponent(ev)}&wallet=${encodeURIComponent(w)}`),
    join: () => post('/api/raid', { op: 'join' }), start: () => post('/api/raid', { op: 'start' }), submit: (ticket, inputs) => post('/api/raid', { op: 'submit', ticket, inputs }),
    inuScore: (w) => get('/api/inu-score?wallet=' + encodeURIComponent(w)) };
}
// Auto-entry: who qualifies (client view; the server re-checks Kennel tier + cosmetics itself).
export function autoReason({ kennelTier, state }) {
  if (kennelTier) return 'kennel';
  const own = [...(state?.wardrobe?.owned || []), ...(state?.fly?.cosmetics || []), ...Object.keys(state?.fly?.owned || {})];
  return own.length ? 'cosmetic' : null;
}
export async function autoEnter({ api, signedIn, kennelTier, state, now = Date.now(), ls = globalThis.localStorage }) {
  const why = autoReason({ kennelTier, state }); if (!why || !signedIn) return { entered: false, why };
  const ev = B.eventAt(now), seen = JSON.parse(ls?.getItem(LS_JOINED) || '{}'); if (seen[ev.eventId]) return { entered: true, why, already: true, ev };
  const r = await api.join(); if (!r?.ok) return { entered: false, why, error: r?.error || r?.reason };
  ls?.setItem(LS_JOINED, JSON.stringify({ [ev.eventId]: r.entry })); return { entered: true, why, entry: r.entry, ev };
}
export const localReplays = (ls = globalThis.localStorage) => { try { return JSON.parse(ls.getItem(LS_REPLAYS) || '[]'); } catch { return []; } };
export function keepReplay(rep, ls = globalThis.localStorage) { const all = [rep, ...localReplays(ls)].slice(0, 5); try { ls.setItem(LS_REPLAYS, JSON.stringify(all)); } catch {} return all; }

// ---- arena drawing (Inu Verse palette, crisp pixels) ----
const INK = '#0c1022', NAVY = '#121a36', GOLD = '#d4a640', GOLD_L = '#f2cc68', CREAM = '#fff6e0', RED = '#d84a54', TAN = '#d9a066', TAN_D = '#a8693a';
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
export function drawArena(c, raid, { W = 300, H = 170, t = 0 } = {}) {
  const s = raid.s, boss = s.boss, lw = W / B.LANES, tel = raid.telegraph(), bl = raid.bossLane();
  R(c, 0, 0, W, H, NAVY); for (let i = 0; i < B.LANES; i++) { R(c, i * lw, 0, 1, H, '#26325e'); if (tel.includes(i)) { const a = 0.35 + 0.35 * ((Math.floor(t * 8) % 2)); c.fillStyle = `rgba(216,74,84,${a})`; c.fillRect(Math.round(i * lw + 2), 40, Math.round(lw - 4), H - 44); } }
  R(c, 0, H - 34, W, 2, GOLD); // pup line
  // boss over its lane
  const bx = bl * lw + lw / 2, by = 24, hurt = s.events.length && s.events[s.events.length - 1].e === 'bite' && s.tick - s.events[s.events.length - 1].t < 2;
  R(c, bx - 23, by - 12, 46, 34, INK); R(c, bx - 21, by - 10, 42, 30, hurt ? CREAM : boss.color); R(c, bx - 21, by + 12, 42, 8, boss.dark); R(c, bx - 26, by - 16, 10, 10, boss.dark); R(c, bx + 16, by - 16, 10, 10, boss.dark); R(c, bx - 13, by - 3, 7, 7, boss.accent); R(c, bx + 6, by - 3, 7, 7, boss.accent); R(c, bx - 10, by + 8, 20, 4, INK);
  if (s.tick <= s.openUntil) { c.fillStyle = GOLD_L; c.font = '8px monospace'; c.textAlign = 'center'; c.fillText('OPEN!', bx, by + 32); }
  // HP bar
  R(c, 6, 3, W - 12, 6, INK); R(c, 7, 4, (W - 14) * (1 - s.dmg / boss.hp), 4, RED);
  // pup
  const px = s.lane * lw + lw / 2, py = H - 14, blink = s.inv > 0 && Math.floor(t * 10) % 2;
  if (!blink) { R(c, px - 13, py - 13, 26, 20, INK); R(c, px - 12, py - 12, 24, 18, TAN); R(c, px - 12, py - 18, 6, 7, TAN_D); R(c, px + 6, py - 18, 6, 7, TAN_D); R(c, px - 7, py - 2, 14, 7, CREAM); R(c, px - 6, py - 7, 3, 3, INK); R(c, px + 3, py - 7, 3, 3, INK); R(c, px - 1, py - 2, 2, 2, INK); }
  c.fillStyle = CREAM; c.font = '8px monospace'; c.textAlign = 'left'; c.fillText('♥'.repeat(Math.max(0, s.hp)), 6, H - 4); c.textAlign = 'right'; c.fillText(`${(s.tick / B.TICK_HZ).toFixed(1)}s`, W - 6, H - 4);
}

// ---- panel ----
const CSS = `.rd-fight{display:flex;gap:10px;align-items:flex-start;flex-wrap:wrap;text-align:left}.rd-fight canvas,#panel-body #rd-cv{width:300px;max-width:100%;height:auto;image-rendering:pixelated;border:3px solid var(--goldd);background:var(--navy)}.rd-side{flex:1;min-width:180px;display:flex;flex-direction:column;gap:6px;align-items:flex-start}.rd-pad{display:flex;gap:8px;justify-content:center;margin:6px 0}.rd-pad .btn{min-width:72px;touch-action:manipulation;user-select:none}.rd-board{text-align:left;font-size:12px;margin:4px 0;padding-left:20px}.rd-board li{margin:2px 0}.rd-list{text-align:left;line-height:1.5}#panel-body .rd-side a,#panel-body .rd-list a{color:var(--goldl)}.rd-tabs{margin:4px 0}body.short .rd-fight canvas,body.short #panel-body #rd-cv{width:240px}body.short .rd-pad{margin:3px 0}body.short .rd-pad .btn{padding:6px 10px;min-width:60px}`;
function injectCss() { if (typeof document === 'undefined' || document.getElementById('raid-css')) return; const st = document.createElement('style'); st.id = 'raid-css'; st.textContent = CSS; document.head.appendChild(st); }
const S = { tab: 'fight', ev: null, info: null, run: null, last: null, watch: null, msg: '', inu: null };
export function rulesHtml() {
  return `<ul class="small rd-list"><li><b>Free entry</b> for every pup. Holding a Kibble Kennel tier or any Inu cosmetic just auto-enters you each hour.</li>
  <li><b>Skill only.</b> Dodge the red lanes, stand under the boss, bite. Bites right after a slam ("OPEN!") hit harder and build a combo.</li>
  <li>The boss follows a fixed script that is the same for everyone. Nothing is random.</li>
  <li>Your score is re-played on the server from your inputs; the game never sends a score. Clear bonus = time left + hearts left.</li>
  <li>No bets, no raffles, no paid entry. Kennel tiers and cosmetics never change damage or score.</li>
  <li>Raid results add to your lifetime <a href="${SCORE_PAGE}" target="_blank" rel="noopener">One Inu Score</a>.</li></ul>`;
}
function boardHtml(info) { const b = info?.event?.board || [];
  return b.length ? `<ol class="rd-board">${b.slice(0, 10).map((e) => `<li><code>${esc(short(e.wallet))}</code> <b>${e.score.toLocaleString('en-US')}</b>${e.cleared ? ' ✓' : ''} <button class="btn tiny ghost" data-watch="${esc(e.wallet)}">Replay</button></li>`).join('')}</ol>` : '<div class="small">No results yet this hour. First clear takes the top spot.</div>'; }
export function panelHtml({ now = Date.now(), entry = null, signedIn = false, wallet = null } = {}) {
  const ev = B.eventAt(now), boss = B.bossById(ev.boss), sch = B.schedule(now, 4).slice(1), info = S.info;
  const tabs = ['fight', 'board', 'replays', 'rules'].map((t) => `<button class="btn tiny ${S.tab === t ? '' : 'ghost'}" data-rtab="${t}">${{ fight: 'Fight', board: 'Board', replays: 'Replays', rules: 'Rules' }[t]}</button>`).join('');
  const ent = entry ? (entry.startsWith('auto') ? `Auto-entered (${entry === 'auto:kennel' ? 'Kennel tier' : 'Inu cosmetic'})` : 'Entered (free)') : signedIn ? 'Not entered yet' : 'Playing as guest';
  let body = '';
  if (S.tab === 'fight') body = `<div class="rd-fight"><canvas id="rd-cv" width="300" height="170"></canvas><div class="rd-side">
      <div class="small">${S.run ? 'Fight on! ← → move · Space bites' : S.last ? `Last fight: <b>${S.last.score.toLocaleString('en-US')}</b>${S.last.cleared ? ' · cleared in ' + S.last.seconds + 's' : ''}${S.last.server ? ` · ${esc(S.last.server)}` : ''}` : 'Dodge red lanes · stand under the boss · bite'}</div>
      ${S.run ? '' : `<button class="btn green" data-raid="start">${S.last ? 'Fight again' : 'Fight (free)'}</button>`}
      ${!entry && signedIn ? '<button class="btn tiny alt" data-raid="join">Enter this hour (free)</button>' : ''}
      ${S.inu != null ? `<div class="small">Your Inu Score: <b>${S.inu.toLocaleString('en-US')}</b> · <a href="${SCORE_PAGE}" target="_blank" rel="noopener">formula</a></div>` : `<div class="small"><a href="${SCORE_PAGE}" target="_blank" rel="noopener">One Inu Score formula</a></div>`}
      ${S.msg ? `<div class="small">${esc(S.msg)}</div>` : ''}</div></div>
    <div class="rd-pad"><button class="btn big" data-in="L" aria-label="Move left">◀</button><button class="btn big red" data-in="B">BITE</button><button class="btn big" data-in="R" aria-label="Move right">▶</button></div>`;
  else if (S.tab === 'board') body = boardHtml(info);
  else if (S.tab === 'replays') { const mine = localReplays(); body = `<div class="small">Your last fights (kept on this device):</div>${mine.length ? `<ol class="rd-board">${mine.map((r, i) => `<li>${esc(B.bossById(r.boss)?.name || r.boss)} · <b>${r.score.toLocaleString('en-US')}</b> · ${esc(r.eventId)} <button class="btn tiny ghost" data-mine="${i}">Watch</button></li>`).join('')}</ol>` : '<div class="small">None yet.</div>'}<div class="small">Top replays for this hour are on the Board tab.</div><canvas id="rd-cv" width="300" height="170"></canvas>`; }
  else body = rulesHtml();
  return `<h2>Boss Raid · ${esc(boss.name)}</h2><p class="sub">This hour until ${fmtT(ev.endMs)} · then ${sch.map((e) => esc(e.bossName) + ' ' + fmtT(e.startMs)).join(', ')} · ${esc(ent)}${info?.event?.roster ? ` · ${info.event.roster.total} pups entered` : ''}${wallet ? '' : ''}</p>
  <div class="row rd-tabs" style="justify-content:flex-start">${tabs}</div>${body}<div class="nfa">Free entry. Skill only. No bets, no raffles, no chance.</div>`;
}
export const _raid = S;

// Mount into the game's panel body. ctx: { body, api, kp, toast, isOpen, getEntry, setEntry, wallet }
export function mountRaid(ctx) {
  injectCss(); const { body } = ctx; let raf = 0, acc = 0, lastT = 0, queue = [];
  const draw = () => { if (!ctx.isOpen()) return stop(); body.innerHTML = panelHtml({ entry: ctx.getEntry(), signedIn: !!ctx.kp?.session, wallet: ctx.kp?.address }); bind(); paintIdle(); };
  const cv = () => body.querySelector('#rd-cv');
  function paintIdle() { const c = cv()?.getContext('2d'); if (!c) return; const r = S.watch?.raid || B.createRaid(B.eventAt(Date.now()).boss); drawArena(c, r, { t: performance.now() / 1000 }); }
  function stop() { cancelAnimationFrame(raf); raf = 0; removeEventListener('keydown', onKey, true); }
  function onKey(e) { if (!S.run) return; const k = e.key.toLowerCase(); const a = k === 'arrowleft' || k === 'a' ? 'L' : k === 'arrowright' || k === 'd' ? 'R' : k === ' ' || k === 'j' || k === 'arrowup' ? 'B' : null; if (a) { queue.push(a); e.preventDefault(); e.stopImmediatePropagation(); } }
  async function start() { const boss = B.eventAt(Date.now()); S.msg = ''; let ticket = null;
    if (ctx.kp?.session) { try { const r = await ctx.api.start(); if (r.ticket) ticket = r.ticket; } catch {} }
    S.run = { raid: B.createRaid(boss.boss), inputs: [], ticket, eventId: boss.eventId, boss: boss.boss }; S.tab = 'fight'; queue = []; acc = 0; lastT = performance.now(); draw(); addEventListener('keydown', onKey, true); raf = requestAnimationFrame(loop); }
  function loop(t) { if (!ctx.isOpen()) return stop(); const run = S.run; if (!run) return; acc += Math.min(250, t - lastT); lastT = t;
    while (acc >= 1000 / B.TICK_HZ && !run.raid.s.over) { acc -= 1000 / B.TICK_HZ; const now = queue.splice(0, B.MAX_PER_TICK); for (const a of now) run.inputs.push([run.raid.s.tick, a]); run.raid.step(now); }
    const c = cv()?.getContext('2d'); if (c) drawArena(c, run.raid, { t: t / 1000 });
    if (run.raid.s.over) return finish(); raf = requestAnimationFrame(loop); }
  async function finish() { const run = S.run; S.run = null; stop(); const sim = B.simulate(run.boss, run.inputs); S.last = { ...sim };
    keepReplay({ v: B.RAID_VERSION, boss: run.boss, eventId: run.eventId, inputs: run.inputs, score: sim.score, cleared: sim.cleared, at: Date.now() });
    if (run.ticket) { S.last.server = 'checking on the server…'; draw(); try { const r = await ctx.api.submit(run.ticket, run.inputs); S.last.server = r.ok ? (r.best ? 'new best this hour, posted ✓' : `posted ✓ (your best this hour: ${r.eventBest})`) : 'not posted: ' + (r.reason || r.error || 'server busy');
        if (r.inuScore != null) S.inu = r.inuScore; refresh(); } catch { S.last.server = 'not posted: offline'; } }
    else S.last.server = 'sign in to post to the board';
    draw(); }
  function watch(rep) { stop(); const raid = B.createRaid(rep.boss); let i = 0; S.watch = { raid }; const t0 = performance.now(); let ticks = 0;
    const step = (t) => { if (!ctx.isOpen() || S.watch?.raid !== raid) return; const want = Math.floor((t - t0) / (1000 / B.TICK_HZ));
      while (ticks < want && !raid.s.over) { const now = []; while (i < rep.inputs.length && rep.inputs[i][0] === raid.s.tick) now.push(rep.inputs[i++][1]); raid.step(now); ticks++; }
      const c = cv()?.getContext('2d'); if (c) drawArena(c, raid, { t: t / 1000 }); if (!raid.s.over) raf = requestAnimationFrame(step); else S.msg = `Replay finished: ${B.scoreOf(raid.s).toLocaleString('en-US')}`; };
    raf = requestAnimationFrame(step); }
  function bind() {
    body.querySelectorAll('[data-rtab]').forEach((b) => b.onclick = () => { S.tab = b.dataset.rtab; S.watch = null; draw(); });
    body.querySelectorAll('[data-raid]').forEach((b) => b.onclick = async () => { if (b.dataset.raid === 'start') start();
      else if (b.dataset.raid === 'join') { const r = await ctx.api.join().catch(() => null); if (r?.ok) { ctx.setEntry(r.entry); ctx.toast?.(r.auto ? 'Auto-entered this hour’s raid' : 'Entered this hour’s raid (free)', 'good'); } else ctx.toast?.('Could not enter right now', 'bad'); draw(); } });
    body.querySelectorAll('[data-in]').forEach((b) => { const fire = (e) => { e.preventDefault(); if (S.run) queue.push(b.dataset.in); }; b.onpointerdown = fire; b.onclick = (e) => e.preventDefault(); });
    body.querySelectorAll('[data-mine]').forEach((b) => b.onclick = () => watch(localReplays()[Number(b.dataset.mine)]));
    body.querySelectorAll('[data-watch]').forEach((b) => b.onclick = async () => { try { const ev = S.info?.event?.eventId; const rep = await ctx.api.replay(ev, b.dataset.watch); if (!rep?.inputs) throw 0; S.tab = 'replays'; draw(); watch(rep); } catch { ctx.toast?.('Replay unavailable', 'bad'); } });
  }
  async function refresh() { try { S.info = await ctx.api.event(); } catch { S.info = null; } if (ctx.kp?.session && ctx.kp.address) { try { S.inu = (await ctx.api.inuScore(ctx.kp.address)).score ?? null; } catch {} } if (!S.run) draw(); }
  draw(); refresh();
  return { stop, draw, start, finishForTest: () => finish() };
}

// World prop: the Raid Gate on Kibble Plaza (world coords; KIBBLE_PLAZA.raid in world.js).
export function gateProps(spot, t, TILE = 32, now = Date.now()) { if (!spot) return []; const x = spot.x * TILE, w = spot.w * TILE, base = (spot.y + 1) * TILE, boss = B.bossById(B.eventAt(now).boss);
  return [{ y: base - 2, d: (c) => { const top = base - 70;
    R(c, x - 2, top - 2, w + 4, 72, INK); R(c, x, top, 12, 68, '#8a8296'); R(c, x + w - 12, top, 12, 68, '#8a8296'); R(c, x, top, w, 14, '#5e5870'); R(c, x, top, w, 2, '#b4acc0');
    R(c, x + 12, top + 14, w - 24, 54, '#1a0f24'); const p = 0.5 + 0.5 * Math.sin(t * 3); c.fillStyle = `rgba(216,74,84,${0.25 + 0.35 * p})`; c.fillRect(x + 14, top + 16, w - 28, 50);
    R(c, x + w / 2 - 10, top + 30, 20, 16, boss.color); R(c, x + w / 2 - 6, top + 34, 4, 4, boss.accent); R(c, x + w / 2 + 2, top + 34, 4, 4, boss.accent);
    c.font = '6px Silkscreen, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillStyle = GOLD_L; c.fillText('BOSS RAID', x + w / 2, top + 8);
    R(c, x + 14, top + 52, w - 28, 10, INK); c.fillStyle = CREAM; c.font = '5px Silkscreen, monospace'; c.fillText(boss.name.toUpperCase(), x + w / 2, top + 57); } }]; }
