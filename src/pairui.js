// Matchmaker / Couples / Duo / Pups panels
import * as P from './pairing.js'; import { JOBS } from './jobs.js'; import { drawInuAvatarHi as drawInuAvatar } from './art.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const top = (rows, n = 5) => rows.slice(0, n).map((r, i) => `<li${r.me ? ' class="me"' : ''}>${i + 1}. ${esc(r.name)} <b>${Math.floor(r.score)}</b></li>`).join('');
function thumb(look, id) { setTimeout(() => { const c = document.getElementById(id); if (!c) return; const x = c.getContext('2d'); x.clearRect(0, 0, 48, 56); drawInuAvatar(x, { look }, 24, 52, { scale: 1.2, shadow: false }); }, 0); return `<canvas id="${id}" width="48" height="56"></canvas>`; }
// ctx: { state, body, toast, hud, persist, day, weekFrac, open, startDuo(partner, jobId) }
const NPC_NAMES = ['Mochi', 'Kuro', 'Hana', 'Taro', 'Yuzu', 'Goma'];
export function renderMatchmaker(ctx) { const s = ctx.state, Pr = P.ensurePair(s), tab = ctx.tab || 'board';
  const tabs = [['board', 'Matchmaker'], ['duo', 'Duo Jobs'], ['couple', 'Couples'], ['pups', 'Pups']];
  let html = `<h2>Park Matchmaker</h2><div class="ctabs">${tabs.map(([k, n]) => `<button class="ctab ${k === tab ? 'sel' : ''}" data-ptab="${k}">${n}</button>`).join('')}</div>`;
  if (tab === 'board') { html += `<p class="sub">Find a partner for duo jobs, friendship or breeding. Listings are public; other players (shown here are sample pups until real players list) can accept. No paid boosts.</p>
    <p>Looking for: ${['duo', 'pups', 'friends', 'couple'].map((w) => `<button class="chip-o ${Pr.listing === w ? 'sel' : ''}" data-act="list:${w}">${w}</button>`).join('')} <button class="chip-o" data-act="list:clear">Clear</button></p>
    <div class="grid">${P.SIM_PLAYERS.map((pl, i) => `<div class="card">${thumb(pl.look, 'mm' + i)}<b>${esc(pl.name)}</b><small>wants ${pl.wants} · skill ${Math.round(pl.skill * 100)}</small>
      <button class="btn alt" data-act="askduo:${pl.name}">Duo job</button> <button class="btn alt" data-act="askbreed:${pl.id}">Breed</button></div>`).join('')}</div>`; }
  if (tab === 'duo') { const board = P.duoBoard(s, ctx.weekFrac); html += `<p class="sub">Play any mini-game with a partner. Your combo + their skill give a duo multiplier. Weekly pool of ${P.DUO_POOL_BASE} Bones is split 50/30/20 by skill among the top 3 duos (each partner takes half).</p>
    <ol class="lb">${top(board)}</ol><h3>Invite an NPC friend</h3><div class="grid">${NPC_NAMES.map((n) => `<div class="card"><b>${n}</b><select data-job="${n}">${Object.keys(JOBS).map((j) => `<option value="${j}">${JOBS[j].name}</option>`).join('')}</select><button class="btn" data-act="duo:${n}">Play together</button></div>`).join('')}</div>`; }
  if (tab === 'couple') { const p = P.partnerOf(s), sc = P.coupleScore(s, ctx.day), perks = P.perksFor(s, ctx.day);
    html += p ? `<p class="sub">You & <b>${esc(p)}</b> · couple score <b>${sc}</b></p><div class="grid">${P.COUPLE_PERKS.map((k) => `<div class="card"><b>${k.name}</b><small>${k.desc}</small><small>${perks.find((x) => x.id === k.id) ? '✓ active' : 'need score ' + k.at}</small></div>`).join('')}</div>
      <h3>Top Couples</h3><ol class="lb">${top(P.topCouples(s, ctx.day))}</ol>` : `<p class="sub">Marry an NPC at the chapel, or accept a player partner via the matchmaker, to unlock shared home, garden, farm and shop perks.</p><ol class="lb">${top(P.topCouples(s, ctx.day))}</ol>`; }
  if (tab === 'pups') { html += `<p class="sub">Two players' Shibas can breed (both must consent). Coats blend; rare trait combos are named collectibles. Pups follow your wallet inventory across Inu games (saved on your shared profile).</p>
    <div class="grid">${Pr.breedPups.map((pu, i) => `<div class="card">${thumb(pu.look, 'bp' + i)}<b>${esc(pu.name)}</b><small>${pu.rare ? '★ ' + pu.rare.name : 'blended coat'} · parents ${pu.parents.join(' + ')}</small></div>`).join('') || '<p class="small">No pups yet - ask someone on the Matchmaker board.</p>'}</div>
    <h3>Pending requests</h3>${Pr.requests.filter((r) => r.state !== 'done').map((r) => { const other = P.SIM_PLAYERS.find((x) => x.id === r.with); return `<div class="card"><b>${esc(other?.name || r.with)}</b><small>${r.state}</small>${r.state === 'pending' && !r.consent.them ? `<button class="btn" data-act="accept:${r.id}">Sim-accept (demo)</button>` : ''}${r.state === 'accepted' ? `<input data-pname="${r.id}" maxlength="14" placeholder="Pup name"><button class="btn" data-act="breed:${r.id}">Welcome pup</button>` : ''}</div>`; }).join('') || '<p class="small">None</p>'}`; }
  ctx.body.innerHTML = html;
  ctx.body.onclick = (e) => { const t = e.target.closest('[data-ptab]'); if (t) return ctx.open(t.dataset.ptab); const b = e.target.closest('[data-act]'); if (!b) return; const act = b.dataset.act, cut = act.indexOf(':'), a = act.slice(0, cut), id = act.slice(cut + 1); let r;
    if (a === 'list') { r = P.setListing(s, id === 'clear' ? null : id); ctx.toast(id === 'clear' ? 'Listing cleared' : 'Looking for ' + id, 'good'); }
    if (a === 'askduo') { const job = Object.keys(JOBS)[0]; return ctx.startDuo?.(P.partnerFor(s, id), job); }
    if (a === 'duo') { const job = ctx.body.querySelector(`[data-job="${id}"]`)?.value || 'cafe'; return ctx.startDuo?.(P.partnerFor(s, id), job); }
    if (a === 'askbreed') { r = P.requestBreed(s, id); if (r.ok) { if (P.simAccepts(id, 'pups')) { P.respondBreed(s, r.req.id, true); ctx.toast('They said yes! Name the pup.', 'good'); } else ctx.toast('Request sent.', 'good'); } }
    if (a === 'accept') r = P.respondBreed(s, id, true);
    if (a === 'breed') { const name = ctx.body.querySelector(`[data-pname="${id}"]`)?.value || 'Pup'; const look = s.player.look || { coat: '#e8a25a', pattern: 'none', eyeShape: 'round', eyeColor: '#2a1a12', ears: 'pointy', tail: 'curl', markings: 'none', size: 'medium', accent: '#fff6e8' };
      r = P.breed(s, id, look, name, ctx.day); if (r.ok) ctx.toast(`${r.pup.name} joined your pack!${r.pup.rare ? ' ★ ' + r.pup.rare.name : ''}`, 'good'); }
    if (r && !r.ok) return ctx.toast(r.reason || 'Not now', 'bad'); ctx.hud(); ctx.persist(); ctx.open(tab); };
}
