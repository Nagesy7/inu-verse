// Living-town preview controller: ties Orchard Row (src/workrow.js) to the reviewed town's frame loop, draws it through
// src/workrowart.js, and renders the Town life card. Personal progress uses inuverse.preview.livingtown.v1 only.
import {
  ROW_WORKERS, WORKPLACES, UPGRADES, HALL_STAGES, LESSONS_TO_GRADUATE, FOREMAN_XP, LEAVE_H, HOME_H, SKY_DAY_S, HOUR_S,
  workerAt, needsOf, fireOn, hallStage, marketDay, goodsMoved, upgradesFor, sydneyDayIndex, skyDayIndex, dayKey, seasonNow, harvestOf,
  townStock, SERVICE, SERVE_FX_S,
  loadLife, saveLife, talk, startApprentice, lesson, craft, recipesOf, isForeman, xpOf, workerById,
} from './workrow.js';
import { rowProps, rowOverlay } from './workrowart.js';
import { lotById } from './townproposal.js';

const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const NEAR_PX = 44;

export function queryOverrides(search = '') {
  const q = new URLSearchParams(search);
  const num = (k) => { const v = q.get(k); return v != null && v !== '' && Number.isFinite(+v) ? +v : null; };
  return { day: num('ltday'), skyDay: num('ltskyday'), fire: q.get('ltfire'), market: q.get('ltmarket') === '1', season: q.get('ltseason') };
}

export function createTownLife(storage = globalThis.localStorage, search = '') {
  const O = queryOverrides(search);
  let L = loadLife(storage);
  const env = { hour: 10, rain: false, ev: null, t: 0, night: false, px: null, py: null, now: () => Date.now() };
  let frame = null;
  const persist = () => saveLife(storage, L);
  const dayIdx = () => (O.day != null ? O.day : sydneyDayIndex(env.now()));
  const skyDay = () => (O.skyDay != null ? O.skyDay : skyDayIndex(env.now()));
  const sec = () => ((env.hour * HOUR_S) % SKY_DAY_S + SKY_DAY_S) % SKY_DAY_S;
  const fire = () => {
    if (O.fire) { const s = sec(); const lot = O.fire; return { lot, t0: s - 5, t1: s + 25, on: true, after: false, k: 0.8, forced: true }; }
    return fireOn(skyDay(), sec());
  };
  function compute() {
    const s = sec(), F = fire(), market = O.market || marketDay(env.ev), dIdx = dayIdx(), today = dayKey(env.now());
    const season = seasonNow(env.now(), O.season);
    const workers = ROW_WORKERS.map((w) => {
      const foreman = isForeman(L, w.id, dIdx);
      const at = workerAt(w, s, { rain: env.rain, foreman, fire: F, market });
      const metToday = !!L.met[w.id]?.days.includes(today);
      return { w, at, foreman, needs: needsOf(w, s, { rain: env.rain, metToday, fire: F }), metToday };
    });
    const points = goodsMoved(skyDay(), s, (w) => ({ foreman: isForeman(L, w.id, dIdx), market }));
    const stock = townStock(s, (w) => ({ foreman: isForeman(L, w.id, dIdx), market }));
    frame = { s, fire: F, market, season, harvest: harvestOf(season), workers, stock, upgrades: upgradesFor(points), hall: hallStage(dIdx, s), dayIdx: dIdx, skyDay: skyDay(), today };
    return frame;
  }
  const api = {
    saveKey: undefined,
    get life() { return L; },
    setEnv(patch) { Object.assign(env, patch || {}); frame = null; },
    step(dt) { env.t += Math.max(0, dt || 0); frame = null; },
    frame() { return frame || compute(); },
    near(x, y) {
      const f = api.frame(); let best = null, bd = NEAR_PX;
      for (const r of f.workers) { if (!r.at.visible) continue; const d = Math.hypot(r.at.x - x, r.at.y - y); if (d < bd) { bd = d; best = r; } }
      return best;
    },
    actors() {
      const f = api.frame();
      const out = [];
      for (const r of f.workers) {
        if (!r.at.visible) continue;
        const near = env.px == null || Math.hypot(env.px - r.at.x, env.py - r.at.y) < 240;
        const a = {
          x: r.at.x, y: r.at.y, coat: r.w.coat, outfit: {}, face: r.at.face, phase: r.at.moving ? Math.floor(env.t * 8) % 4 : 0, moving: r.at.moving,
          name: near ? (r.foreman ? `${r.w.name} · FOREMAN` : r.w.name) : '', art: null, npcwork: true, rowId: r.w.id,
          umbrella: env.rain && (r.at.moving || r.at.sheltering) && !r.at.firefight,
          npcOverlay: rowOverlay({ ...r, mood: r.needs.mood, cart: f.upgrades.done.includes('cart') }, env.t, near),
        };
        if (r.at.lunch) { a.lunch = { frame: Math.floor(env.t * 2) % 4 }; a.npcOverlay = null; }
        out.push(a);
      }
      return out;
    },
    props() { const f = api.frame(); return rowProps({ workers: f.workers, stock: f.stock, serveFxS: SERVE_FX_S, season: f.season, harvest: f.harvest, t: env.t, upgrades: f.upgrades, fire: f.fire, hall: f.hall, market: f.market, rain: env.rain, night: env.night }); },
    talk(id, playerName) {
      const f = api.frame();
      const r = talk(L, id, { day: f.today, playerName, sec: f.s, rain: env.rain, dayIdx: f.dayIdx });
      persist(); frame = null; return r;
    },
    apprentice(id) { const r = startApprentice(L, id); if (r.ok) persist(); frame = null; return r; },
    lesson(id) { const f = api.frame(); const r = lesson(L, id, { sec: f.s, absHour: f.skyDay * 24 + Math.floor(env.hour), rain: env.rain }); if (r.ok) persist(); frame = null; return r; },
    craft(recipe) { const r = craft(L, recipe, api.frame().skyDay); if (r.ok) persist(); return r; },
    summary() {
      const f = api.frame();
      return {
        hour: env.hour, rain: env.rain, season: f.season, harvest: f.harvest, market: f.market, fire: f.fire, hall: f.hall, upgrades: f.upgrades, dayIdx: f.dayIdx, skyDay: f.skyDay,
        stock: f.stock.map((p) => ({ ...p, servedAgo: p.servedAgo == null ? null : Math.round(p.servedAgo) })),
        workers: f.workers.map((r) => ({ id: r.w.id, name: r.w.name, job: r.w.job, lot: r.w.lot, kind: r.at.kind, visible: r.at.visible, x: Math.round(r.at.x), y: Math.round(r.at.y), carry: r.at.carry, made: r.at.made, delivered: r.at.delivered, sheltering: r.at.sheltering, firefight: r.at.firefight, foreman: r.foreman, mood: r.needs.mood, xp: xpOf(L, r.w.id, f.dayIdx) })),
        life: JSON.parse(JSON.stringify(L)),
      };
    },
  };
  return api;
}

// ---------------------------------------------------------------- Town life card (opened by talking to an Orchard Row worker)
const bar = (v) => `<span class="lt-bar"><i style="width:${Math.round(v * 100)}%"></i></span>`;
const MOOD_WORD = { cheerful: 'Cheerful', content: 'Content', busy: 'Busy', tired: 'Tired', peckish: 'Peckish', soggy: 'Soggy (sheltering from the rain)', alarmed: 'Alarmed', chuffed: 'Chuffed you came by', asleep: 'Asleep' };

export function renderTownLife(body, { tl, id, tab = 'worker', greet = '', toast = () => {}, reopen = () => {} }) {
  const f = tl.frame();
  const r = f.workers.find((x) => x.w.id === id) || f.workers[0];
  const w = r.w, L = tl.life, wp = WORKPLACES[w.lot];
  const tabs = `<div class="lt-tabs" role="tablist"><button type="button" data-lt-tab="worker" class="${tab === 'worker' ? 'on' : ''}">${esc(w.name)}</button><button type="button" data-lt-tab="town" class="${tab === 'town' ? 'on' : ''}">Town</button><button type="button" data-lt-tab="craft" class="${tab === 'craft' ? 'on' : ''}">Crafting</button></div>`;
  let html = `<div class="lt-card"><h2>Town life <small>PREVIEW</small></h2>${greet ? `<p class="lt-greet">“${esc(greet)}”</p>` : ''}${tabs}`;
  if (tab === 'worker') {
    const met = L.met[w.id]?.days.length || 0, xp = xpOf(L, w.id, f.dayIdx), ap = L.apprentice?.id === w.id ? L.apprentice : null, grad = L.graduated.includes(w.id);
    const doing = r.at.kind === 'work' ? wp.verb : r.at.kind === 'walk' ? (r.at.carry ? `taking ${r.at.carry} to the ${lotById(r.at.to)?.name || 'next stop'}` : `walking to the ${lotById(r.at.to)?.name || 'next stop'}`) : r.at.kind === 'lunch' ? 'lunch break' : r.at.kind === 'drop' ? 'dropping off a delivery' : r.at.kind === 'pick' ? 'picking up supplies' : 'at home';
    html += `<p class="lt-who"><b>${esc(w.name)}</b> · ${esc(w.job)}${r.foreman ? ' · <b class="lt-fore">FOREMAN</b>' : ''}<br>${esc(wp.name)} · now: ${esc(doing)}</p>
      <p>Today: made ${r.at.made}, delivered ${r.at.delivered}. Hours ${LEAVE_H}:00 to ${HOME_H}:00 town time.</p>
      <p>Mood: <b>${esc(MOOD_WORD[r.needs.mood] || r.needs.mood)}</b></p>
      <div class="lt-needs"><span>Energy</span>${bar(r.needs.energy)}<span>Fed</span>${bar(r.needs.hunger)}<span>Social</span>${bar(r.needs.social)}</div>
      <p>${met ? `Remembers you: ${met} day${met === 1 ? '' : 's'} you have come by.` : 'Has not met you yet.'}</p>
      <p>Foreman: ${r.foreman ? 'promoted, runs the crew and works a little faster.' : `${xp}/${FOREMAN_XP} experience. Days on the job, days you visit and lessons you take all count.`}</p>`;
    if (grad) html += `<p>You trained here. Recipe unlocked: <b>${esc(w.recipe)}</b>.</p>`;
    else if (ap) html += `<p>Apprentice lessons: ${ap.lessons}/${LESSONS_TO_GRADUATE}. One per town hour while ${esc(w.name)} is at the bench.</p><button type="button" class="btn" data-lt-act="lesson">Help with the work</button>`;
    else html += `<p>Become ${esc(w.name)}'s apprentice to learn <b>${esc(w.recipe)}</b> (${LESSONS_TO_GRADUATE} lessons).</p><button type="button" class="btn" data-lt-act="apprentice">Become an apprentice</button>`;
  } else if (tab === 'town') {
    const u = f.upgrades, F = f.fire;
    html += `<p><b>Season:</b> ${esc(f.season)}. The orchard is giving ${esc(f.harvest)}.${tl.summary().rain ? ' It is raining: outdoor crews shelter under the eaves and walk with umbrellas.' : ''}</p>
      <p><b>Today:</b> ${f.market ? 'Market Day. Orchard, apiary, dairy, pottery and tea garden goods go to the Farmers Market stalls.' : 'An ordinary work day.'}</p>
      <p><b>Fire watch:</b> ${F ? (F.on ? `Chimney flare-up at the ${esc(lotById(F.lot)?.name)}. The crew has the bucket line going.` : F.after ? 'All clear after a chimney flare-up.' : F.upcoming ? 'Quiet so far.' : 'Quiet.') : 'Quiet.'} Cartoon only: nothing is damaged.</p>
      <p><b>Used in town today:</b> ${(() => { const used = f.stock.filter((p) => p.used > 0 && p.good !== 'build'); return used.length ? used.map((p) => `${p.used} ${esc(p.good)} ${esc(SERVICE[p.good] || 'used')} (${esc(lotById(p.lot)?.name || p.lot)})`).join(', ') : 'nothing yet. Deliveries are used a little after they arrive.'; })()}</p>
      <p><b>Town Hall build:</b> ${esc(f.hall.name)}, ${f.hall.pct}% (${f.hall.daysLeft ? `about ${f.hall.daysLeft} more day${f.hall.daysLeft === 1 ? '' : 's'}` : 'done'}). One stage per real day.</p>
      <p><b>Town upgrades</b> (shared by everyone, from goods moved: ${u.points.toLocaleString('en-AU')})</p><ul class="lt-up">${UPGRADES.map((x) => `<li class="${u.done.includes(x.id) ? 'done' : ''}">${u.done.includes(x.id) ? '✓' : '·'} ${esc(x.name)} <small>${x.need.toLocaleString('en-AU')}</small></li>`).join('')}</ul>`;
  } else {
    const rec = recipesOf(L);
    html += rec.length ? `<p>Recipes you learned. One of each per town day. Keepsakes are for show only.</p>${rec.map((name) => `<p>${esc(name)} · owned ${L.keepsakes[name] || 0} <button type="button" class="btn alt" data-lt-craft="${esc(name)}">Make one</button></p>`).join('')}` : '<p>Finish an apprenticeship to unlock a crafting recipe.</p>';
  }
  html += `<p class="lt-note">Preview. Workers are town characters and goods are town scenery. Nobody here earns anything real. No Bones, $KIBBLE, wallet or prizes are involved. Your visits and lessons stay on this device.</p></div>`;
  body.innerHTML = html;
  body.querySelectorAll('[data-lt-tab]').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); reopen({ id: w.id, tab: b.dataset.ltTab }); }; });
  const act = body.querySelector('[data-lt-act]');
  if (act) act.onclick = (e) => { e.stopPropagation(); const res = act.dataset.ltAct === 'apprentice' ? tl.apprentice(w.id) : tl.lesson(w.id);
    if (!res.ok) toast(res.reason, ''); else if (res.graduated) toast(`You finished your apprenticeship! Recipe unlocked: ${res.recipe}`, 'good'); else toast(act.dataset.ltAct === 'apprentice' ? `You're ${w.name}'s apprentice now` : `Lesson ${res.lessons}/${LESSONS_TO_GRADUATE} done`, 'good');
    reopen({ id: w.id, tab: 'worker' }); };
  body.querySelectorAll('[data-lt-craft]').forEach((b) => { b.onclick = (e) => { e.stopPropagation(); const res = tl.craft(b.dataset.ltCraft); toast(res.ok ? `Made a ${b.dataset.ltCraft}` : res.reason, res.ok ? 'good' : ''); reopen({ id: w.id, tab: 'craft' }); }; });
}
export const TOWN_LIFE_CSS = `.lt-card h2{margin:0 0 6px;font-size:16px}.lt-card h2 small{font-size:9px;color:#f2cc68;border:1px solid #f2cc68;padding:1px 4px;margin-left:6px;vertical-align:middle}
.lt-tabs{display:flex;gap:4px;margin:0 0 8px}.lt-tabs button{flex:1;min-height:40px;font:10px Silkscreen,monospace;background:#1a2244;color:#f6e7b8;border:2px solid #3a4680}.lt-tabs button.on{background:#d4a640;color:#141a2e;border-color:#f2cc68}
.lt-card p{margin:6px 0;line-height:1.45;font-size:12px}.lt-needs{display:grid;grid-template-columns:auto 1fr;gap:4px 8px;align-items:center;font-size:11px;margin:6px 0}
.lt-bar{display:block;height:8px;background:#2a3058;border:1px solid #141a2e}.lt-bar i{display:block;height:100%;background:#7fd1b9}
.lt-up{list-style:none;padding:0;margin:4px 0;font-size:12px}.lt-up li{opacity:.7}.lt-up li.done{opacity:1;color:#a8e090}.lt-fore{color:#ffd84a}.lt-note{font-size:10px!important;opacity:.75}
.lt-card .btn{min-height:44px}.lt-greet{font-style:italic;color:#f6e7b8}`;
