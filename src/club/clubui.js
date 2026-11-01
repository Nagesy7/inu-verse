// Club panels (DOM): Pet Pups, Stamp Book, Party & Pin Hunt, The Inu Times. main.js passes a small context; this module
// never touches the wallet. Everything that costs anything costs Bones (in-game, free to earn).
import { ICONS, ICON_COLS, ICON_ROWS } from './iconmap.js';
import { book, progressText, TIERS, award, STAMPS } from './stamps.js';
import { PUP_COATS, ADOPT_PRICE, SNACK_PRICE, MAX_PUPS, pupsOf, careNow, mood, MOOD_TEXT, adoptPup, feedPup, playPup, walkPup, homePup, renamePup } from './pups.js';
import { claimed, claimItem, nextParty } from './parties.js';
import { PINS, foundIn, HUNT_DAYS } from './hunts.js';
import { edition } from './times.js';
import { ensureClub } from './state.js';
import { ensurePets, petSprite } from '../pets.js';
import { FURNITURE } from '../furniture.js';

const E = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
/** Pixel icon from assets/club/icons.png. size = on-screen px (multiple of 24 keeps it crisp). */
export function iconHtml(key, size = 48, extra = '') { const p = ICONS[key] || ICONS.star, k = size / 24;
  return `<span class="ci ${extra}" aria-hidden="true" style="width:${size}px;height:${size}px;background-size:${ICON_COLS * 24 * k}px ${ICON_ROWS * 24 * k}px;background-position:${-p[0] * size}px ${-p[1] * size}px"></span>`; }
export function stampToast(ctx, list) { if (!list?.length) return; const n = list.length; ctx.toast(`Stamp earned: ${list[0].name}${n > 1 ? ` (+${n - 1} more)` : ''}`, 'good'); }
const pupCanvas = (pal, size = 64, frame = 0) => { const cv = document.createElement('canvas'); cv.width = cv.height = size; const c = cv.getContext('2d'); c.imageSmoothingEnabled = false; c.drawImage(petSprite('pup', frame, pal), 0, 0, size, size); cv.className = 'pupcv'; return cv; };
const bar = (label, v, col) => `<div class="cbar"><span>${label}</span><i><b style="width:${v}%;background:${col}"></b></i></div>`;

// ---------------------------------------------------------------- Pet Pups ----------------------------------------
export function renderPups(ctx) {
  const { state: s, body } = ctx, now = ctx.now(), pups = pupsOf(s), st = ensurePets(s);
  body.innerHTML = `<div class="club"><h2>${iconHtml('pup', 24)} Pet Pups</h2><p class="sub">Adopt a pup for <b>${ADOPT_PRICE} Bones</b>. Snacks cost ${SNACK_PRICE} Bones, playing is free. Your walking pup follows you around town, and the rest hang out in your Kennel. Pups get hungry or bored while you're away, but they never run off.</p>
    <div class="grid pups" id="pupgrid"></div>${pups.length < MAX_PUPS ? `<h3>Adopt a pup</h3><div class="coats" id="coats"></div>
    <div class="row adopt"><input id="pupname" maxlength="16" placeholder="Name your pup" autocomplete="off" enterkeyhint="done"><button class="btn green" id="pupadopt">Adopt (${ADOPT_PRICE} Bones)</button></div>` : `<p class="small">Your Kennel is full of pups (${MAX_PUPS}). They're very happy about it.</p>`}</div>`;
  const grid = body.querySelector('#pupgrid');
  if (!pups.length) grid.innerHTML = '<p class="small">No pups yet. Pick a coat below to adopt your first!</p>';
  for (const p of pups) { const c = careNow(p, now), m = mood(p, now), card = document.createElement('div'); card.className = 'card pup ' + m; card.appendChild(pupCanvas(p.pal, 64, Math.floor(Date.now() / 500) % 2));
    card.insertAdjacentHTML('beforeend', `<b>${E(p.name)}</b><small>${MOOD_TEXT[m]}${st.active === p.id ? ' · walking with you' : ''}</small>${bar('Tummy', c.food, '#f2a54a')}${bar('Fun', c.fun, '#5fb3e0')}
      <div class="pupbtns"><button class="btn green" data-feed="${p.id}">Feed (${SNACK_PRICE})</button><button class="btn alt" data-play="${p.id}">Play</button>
      <button class="btn ${st.active === p.id ? 'ghost' : 'alt'}" data-walk="${p.id}">${st.active === p.id ? 'Back to Kennel' : 'Walk'}</button><button class="btn ghost" data-rename="${p.id}">Rename</button></div>`); grid.appendChild(card); }
  const coats = body.querySelector('#coats'); let pick = ctx.pupPick && PUP_COATS[ctx.pupPick] ? ctx.pupPick : 'biscuit';
  if (coats) { for (const [id, k] of Object.entries(PUP_COATS)) { const b = document.createElement('button'); b.className = 'coat' + (id === pick ? ' on' : ''); b.dataset.coat = id; b.title = k.name; b.appendChild(pupCanvas(k.pal, 48)); b.insertAdjacentHTML('beforeend', `<small>${k.name}</small>`); coats.appendChild(b); } }
  const name = body.querySelector('#pupname'); if (name) name.onkeydown = (e) => { e.stopPropagation(); if (e.key === 'Enter') body.querySelector('#pupadopt').click(); };
  const done = (r, msg) => { if (!r.ok) return ctx.toast(r.reason, 'bad'); ctx.toast(msg, 'good'); stampToast(ctx, r.stamps); ctx.hud(); ctx.persist(); ctx.blip?.(); renderPups(ctx); if (r.pup) ctx.love?.(r.pup.id); };
  body.onclick = (e) => { const t = e.target.closest('button'); if (!t) return;
    if (t.dataset.coat) { pick = ctx.pupPick = t.dataset.coat; body.querySelectorAll('.coat').forEach((b) => b.classList.toggle('on', b.dataset.coat === pick)); return; }
    if (t.id === 'pupadopt') { const r = adoptPup(s, pick, name?.value, ctx.now()); return done(r, r.ok ? `Welcome home, ${r.pup.name}! Your new pup is following you.` : ''); }
    if (t.dataset.feed) { const r = feedPup(s, t.dataset.feed, ctx.now()); return done(r, r.ok ? `${r.pup.name} munches a snack (-${SNACK_PRICE} Bones)` : ''); }
    if (t.dataset.play) { const r = playPup(s, t.dataset.play, ctx.now()); return done(r, r.ok ? `${r.pup.name} chases the ball and brings it back!` : ''); }
    if (t.dataset.walk) { const r = st.active === t.dataset.walk ? homePup(s) : walkPup(s, t.dataset.walk); return done({ ...r, stamps: [] }, st.active ? `${pupsOf(s).find((p) => p.id === st.active)?.name} is walking with you` : 'Pup is back in your Kennel'); }
    if (t.dataset.rename) { const n = prompt('New name?'); if (n) { const r = renamePup(s, t.dataset.rename, n); done({ ...r, stamps: [] }, r.ok ? `Renamed to ${r.pup.name}` : ''); } } };
}
// ---------------------------------------------------------------- Stamp Book --------------------------------------
export function renderStamps(ctx, page = ctx.stampPage || 0) {
  const pages = book(ctx.state), pg = pages[page] || pages[0]; ctx.stampPage = page;
  ctx.body.innerHTML = `<div class="club stampbook"><h2>${iconHtml('star', 24)} Stamp Book <span class="small">${progressText(ctx.state)}</span></h2>
    <div class="tabs sbtabs">${pages.map((p, i) => `<button class="btn ${i === page ? 'alt' : 'ghost'}" data-page="${i}">${E(p.name)} <small>${p.stamps.filter((x) => x.at).length}/${p.stamps.length}</small></button>`).join('')}</div>
    <div class="sbpage">${pg.stamps.map((x) => `<div class="stamp ${x.at ? 'got' : 'locked'}" style="--tc:${TIERS[x.tier].color}" title="${E(x.desc)}">${iconHtml(x.icon, 48)}<b>${E(x.name)}</b><small>${E(x.desc)}</small><em>${'🐾'.repeat(TIERS[x.tier].paws)} ${x.at ? 'Earned ' + new Date(x.at).toLocaleDateString(undefined, { day: 'numeric', month: 'short' }) : 'Not yet'}</em></div>`).join('')}</div>
    <p class="small">Easy, medium and hard stamps (🐾 to 🐾🐾🐾). Stamps are just for fun: a record of what you've done in Inu Verse.</p></div>`;
  ctx.body.onclick = (e) => { const b = e.target.closest('[data-page]'); if (b) renderStamps(ctx, +b.dataset.page); };
}
// ---------------------------------------------------------------- Party & Pin Hunt --------------------------------
const fmtDate = (iso) => { const [y, m, d] = iso.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)).toLocaleDateString('en-AU', { day: 'numeric', month: 'long', timeZone: 'UTC' }); };
export function renderParty(ctx) {
  const s = ctx.state, party = ctx.party(), hunt = ctx.hunt(), found = foundIn(s, hunt.n), c = ensureClub(s), nx = nextParty(ctx.now());
  const item = party && FURNITURE[party.item], got = party && claimed(s, party);
  ctx.body.innerHTML = `<div class="club party">${party ? `<div class="pbanner" style="--pm:${party.palette.main};--pl:${party.palette.light};--pd:${party.palette.dark}">${iconHtml('party', 48)}<div><h2>${E(party.name)}</h2><small>On now until ${E(party.ends)}${party.daysLeft != null ? ` · ${party.daysLeft === 0 ? 'last day!' : party.daysLeft + (party.daysLeft === 1 ? ' day' : ' days') + ' left'}` : ''}</small></div></div>
      <p>${E(party.blurb)}</p><div class="card pitem"><canvas id="pitemcv" width="64" height="64"></canvas><div><b>${E(item.name)}</b><small>Free party item for your Kennel. One per player.</small></div>
      ${got ? `<button class="btn ghost" id="gokennel">Collected ✓ · Place it in My Kennel</button>` : `<button class="btn green" id="pclaim">Collect free</button>`}</div>`
    : `<h2>${iconHtml('party', 24)} Parties</h2><p>No party right now. ${nx ? `Next up: <b>${E(nx.name)}</b> from ${E(nx.starts)}.` : ''}</p>`}
    <h3>${iconHtml('pin', 24)} Pin Hunt <span class="small">${found.length}/${hunt.spots.length} found · new pins every ${HUNT_DAYS} days · this hunt ends ${fmtDate(hunt.end)}</span></h3>
    <div class="grid huntpins">${hunt.spots.map((sp) => { const f = found.includes(sp.pin.id); return `<div class="card ${f ? 'got' : ''}">${iconHtml(sp.pin.icon, 48, f ? '' : 'dim')}<b>${E(sp.pin.name)}</b><small>${f ? 'Found ✓' : `Hidden somewhere in ${E(sp.roomName)}`}</small></div>`; }).join('')}</div>
    <p class="small">Walk over a sparkling pin to pick it up. Pins you find stay in your collection forever.</p>
    <h3>Pin collection <span class="small">${Object.keys(c.pins).filter((k) => PINS.some((p) => p.id === k)).length}/${PINS.length}</span></h3>
    <div class="pincoll">${PINS.map((p) => `<span class="${c.pins[p.id] ? 'got' : 'no'}" title="${E(p.name)}">${iconHtml(p.icon, 48, c.pins[p.id] ? '' : 'dim')}</span>`).join('')}</div>
    <div class="row"><button class="btn alt" id="ptimes">${iconHtml('times', 24)} Read the Inu Times</button><button class="btn alt" id="pstamps">${iconHtml('star', 24)} Stamp Book</button></div></div>`;
  const cv = ctx.body.querySelector('#pitemcv'); if (cv && item) { const g = cv.getContext('2d'), cell = 46 / Math.max(item.w, item.h); ctx.drawFurniture(g, party.item, 32 - (item.w * cell) / 2, 32 - (item.h * cell) / 2, cell, 0); }
  ctx.body.onclick = (e) => { const t = e.target.closest('button'); if (!t) return;
    if (t.id === 'pclaim') { const r = claimItem(s, party, ctx.now()); if (!r.ok) return ctx.toast(r.reason, 'bad'); ctx.toast(`${item.name} added to your furniture. Place it in My Kennel!`, 'good'); stampToast(ctx, r.stamps); ctx.persist(); renderParty(ctx); }
    else if (t.id === 'gokennel') ctx.enterKennel(); else if (t.id === 'ptimes') ctx.go('club-times'); else if (t.id === 'pstamps') ctx.go('club-stamps'); };
}
// ---------------------------------------------------------------- The Inu Times -----------------------------------
export function renderTimes(ctx) {
  const ed = edition(ctx.now(), ctx.partyOverride), [lead, ...rest] = ed.stories, c = ensureClub(ctx.state);
  const first = c.timesRead !== ed.no; c.timesRead = ed.no; const st = award(ctx.state, 'times', ctx.now()); if (st.length) stampToast(ctx, st); if (first || st.length) ctx.persist();
  const story = (x, big) => `<article class="${big ? 'lead' : ''}"><span class="tag">${E(x.tag)}</span><h${big ? 3 : 4}>${E(x.h)}</h${big ? 3 : 4}><p>${E(x.body)}</p><p class="how">▸ ${E(x.how)}</p></article>`;
  ctx.body.innerHTML = `<div class="club times"><header><h2>${E(ed.title)}</h2><div class="mast"><span>Edition ${ed.no}</span><span>${E(ed.date)}</span><span>Free for every pup</span></div></header>
    ${story(lead, true)}<div class="cols">${rest.map((x) => story(x)).join('')}</div><p class="small">Every story here is about something live in Inu Verse right now.</p></div>`;
}
