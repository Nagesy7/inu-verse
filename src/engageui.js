// UI for referrals, season pass, collections (Item 4).
import * as E from './engage.js';
import { OUTFITS } from './outfits.js';
import { FURNITURE } from './furniture.js';

const esc = (t) => String(t ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderEngage(ctx) {
  const s = ctx.state, Eng = E.ensureEngage(s), tab = ctx.tab || 'season';
  const tabs = [['season', 'Season Pass'], ['refer', 'Referrals'], ['sets', 'Collections']];
  let html = `<h2>Engage Hub</h2><div class="ctabs">${tabs.map(([k, n]) => `<button class="ctab ${k === tab ? 'sel' : ''}" data-etab="${k}">${n}</button>`).join('')}</div>`;

  if (tab === 'season') {
    E.maybeResetSeason(s, ctx.day);
    const Se = Eng.season, week = E.seasonWeek(s, ctx.day) + 1;
    html += `<p class="sub">Free 4-week pass. Earn XP by playing (jobs, duo, farm, pack). No paid boosts. Resets every ${E.SEASON_DAYS} days.</p>
      <div class="card"><b>${esc(Se.id.toUpperCase())}</b> · week ${week}/${E.SEASON_WEEKS}<br><b>${Se.xp} XP</b><div class="bar"><i style="width:${Math.min(100, (Se.xp / 280) * 100)}%"></i></div></div>
      <div class="grid">${E.SEASON_TIERS.map((t) => {
        const done = Se.claimed.includes(t.id), ready = Se.xp >= t.at && !done;
        return `<div class="card"><b>${esc(t.name)}</b><small>${t.at} XP${t.grant ? ' · ' + (OUTFITS[t.grant]?.name || t.grant) : ''}${t.furniture ? ' · home trophy' : ''}</small>
          ${done ? '<span class="pill">claimed</span>' : ready ? `<button class="btn" data-act="claim:${t.id}">Claim</button>` : '<span class="pill muted">locked</span>'}</div>`;
      }).join('')}</div>`;
  }
  if (tab === 'refer') {
    html += `<p class="sub">Share your code. When a friend enters it, you both unlock the matching twin outfit set (same hoodie, cap and sneakers). Cosmetics only.</p>
      <div class="card"><b>Your code</b><div class="big">${esc(Eng.code)}</div><small>${Eng.referrals.length} friends referred · twins ${Eng.twins ? 'unlocked' : 'locked'}</small></div>
      ${Eng.referredBy ? `<p class="small">You used <b>${esc(Eng.referredBy)}</b>.</p>` : `<p><input id="refcode" placeholder="INU-XXXX" maxlength="8" style="width:8em"/> <button class="btn" data-act="apply">Apply code</button></p>`}
      <h3>Twin set</h3><div class="grid">${E.TWIN_OUTFITS.map((id) => `<div class="card"><b>${esc(OUTFITS[id]?.name || id)}</b><small>${(s.wardrobe?.owned || []).includes(id) ? 'owned' : 'locked'}</small></div>`).join('')}</div>`;
  }
  if (tab === 'sets') {
    html += `<p class="sub">Complete a set (pets, cars or outfits) to unlock a badge and a home trophy furniture piece.</p>
      <div class="grid">${Object.keys(E.COLLECTIONS).map((id) => {
        const p = E.collectionProgress(s, id);
        return `<div class="card"><b>${esc(p.badge)} ${esc(p.name)}</b><small>${p.have.length}/${p.need.length}: ${p.need.map((n) => (p.have.includes(n) ? '✓' : '·') + ' ' + n).join(', ')}</small>
          ${p.done ? `<span class="pill">unlocked · ${esc(FURNITURE[p.trophy]?.name || p.trophy)}</span>` : '<span class="pill muted">in progress</span>'}</div>`;
      }).join('')}</div>
      <h3>Your trophies</h3><div class="grid">${(Eng.trophies.length ? Eng.trophies : ['—']).map((id) => id === '—' ? '<p class="small">None yet.</p>' : `<div class="card"><b>${esc(FURNITURE[id]?.name || id)}</b><small>in inventory · place at home</small></div>`).join('')}</div>`;
  }
  ctx.body.innerHTML = html;
  ctx.body.onclick = (e) => {
    const t = e.target.closest('[data-etab]'); if (t) return ctx.open(t.dataset.etab);
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act, cut = act.indexOf(':'), a = cut < 0 ? act : act.slice(0, cut), id = cut < 0 ? '' : act.slice(cut + 1);
    let r;
    if (a === 'apply') { r = E.applyReferral(s, ctx.body.querySelector('#refcode')?.value || '', ctx.day); if (r.ok) ctx.toast('Twins unlocked for both of you!', 'good'); }
    if (a === 'claim') { r = E.claimTier(s, id); if (r.ok) ctx.toast('Claimed ' + r.tier.name, 'good'); }
    if (r && !r.ok) return ctx.toast(r.reason || 'Not now', 'bad');
    ctx.hud(); ctx.persist(); ctx.open(tab);
  };
}
