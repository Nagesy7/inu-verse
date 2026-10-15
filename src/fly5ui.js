// Item 5 City Loop panel: holder VIP, burn fest, quests, sponsors, photos, tourney, UGC, streak.
import * as F5 from './fly5.js';
import { OUTFITS } from './outfits.js';
import { fmtK } from './mall.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

export function renderFly5(ctx) {
  const s = ctx.state, F = F5.ensureFly5(s), tab = ctx.tab || 'vip', week = ctx.week | 0, day = ctx.day | 0, month = ctx.month | 0;
  const tabs = [['vip', 'VIP'], ['burn', 'Burn Fest'], ['quests', 'Quests'], ['sponsor', 'Sponsor'], ['photo', 'Photos'], ['tourney', 'Tourney'], ['ugc', 'UGC'], ['streak', 'Streak']];
  let html = `<h2>City Loop</h2><div class="ctabs">${tabs.map(([k, n]) => `<button class="ctab ${k === tab ? 'sel' : ''}" data-f5="${k}">${n}</button>`).join('')}</div>`;

  if (tab === 'vip') {
    const h = F5.holderCheck(s);
    html += `<p class="sub">Hold ≥ ${fmtK(F5.HOLDER_THRESHOLD_U)} $KIBBLE (on-chain balance) for Mall VIP lounge, early mall labels and a <b>gold name tag</b>.</p>
      <div class="card"><b>${h.vip ? '★ VIP Holder' : 'Not yet VIP'}</b><small>Balance ${fmtK(h.bal)} / ${fmtK(h.threshold)}</small>
      ${h.vip ? `<ul>${h.perks.map((p) => `<li>${esc(p)}</li>`).join('')}</ul>` : ''}</div>
      ${h.vip ? '<div class="card"><b>VIP Lounge</b><small>Quiet seating, early item peek, gold name in the world.</small><p class="small">You look fabulous.</p></div>' : ''}`;
  }
  if (tab === 'burn') {
    F5.recordBurn(s, 0, month); // ensure month bucket
    const B = F.burnFest, frac = Math.min(1, B.burnedU / F5.BURN_GOAL_U);
    html += `<p class="sub">Community burn festival. Every $KIBBLE burned for status counts. Monument lights up in 4 stages. Hit the goal → everyone claims a free cosmetic.</p>
      <div class="card"><b>Month ${month + 1}</b><div class="bar"><i style="width:${frac * 100}%"></i></div>
      <small>${fmtK(B.burnedU)} / ${fmtK(F5.BURN_GOAL_U)} burned · stage ${B.stage}/${F5.BURN_STAGES.length}</small></div>
      <button class="btn" data-act="burnclaim" ${B.burnedU < F5.BURN_GOAL_U || B.claimed ? 'disabled' : ''}>${B.claimed ? 'Claimed' : 'Claim free ' + (OUTFITS[F5.BURN_REWARD]?.name || F5.BURN_REWARD)}</button>`;
  }
  if (tab === 'quests' && ctx.kp) {
    html += `<p class="sub">Weekly cross-game quest chain, tracked on the kibble-pay server for your wallet (Verse Shiba, Arcade, Meme Brawl, PepeBallz). Finish all → cosmetic outfit. No purchase needed.</p><div id="srvq" class="grid"><div class="card">${ctx.kp.session ? 'Loading…' : 'Sign in with Phantom (top bar) to track quests.'}</div></div>`;
  } else if (tab === 'quests') {
    const q = F5.questProgress(s, week);
    html += `<p class="sub">Weekly cross-game quest chain. Verse steps check locally; Empires / Quest report through kibble-pay later (sim buttons below). Finish all → cosmetic.</p>
      <div class="grid">${q.list.map((it) => `<div class="card"><b>${it.ok ? '✓' : '·'} ${esc(it.name)}</b><small>${it.game}${it.remote ? ' · remote' : ''}</small>
        ${it.remote && !it.ok ? `<button class="btn alt" data-act="remote:${it.id}">Sim report</button>` : ''}</div>`).join('')}</div>
      <button class="btn" data-act="questclaim" ${q.done < q.total || q.claimed ? 'disabled' : ''}>Claim ${esc(OUTFITS[F5.QUEST_REWARD]?.name || F5.QUEST_REWARD)}</button>`;
  }
  if (tab === 'sponsor') {
    html += `<p class="sub">Admin-style sponsor slots. Pay $KIBBLE to the treasury. Everything is labelled <b>Sponsored</b> (café theme week or billboard takeover).</p>
      <div class="grid">${Object.values(F5.SPONSOR_SLOTS).map((S) => { const cur = F5.sponsorOf(s, S.id, ctx.nowH);
        return `<div class="card"><b>${esc(S.name)}</b><small>${S.price} KIBBLE · ${S.hours}h · ${S.label}</small>
          ${cur ? `<p class="small">Live: <b>${esc(cur.brand)}</b> by ${esc(cur.by)}</p>` : `<input data-brand="${S.id}" placeholder="Brand" maxlength="18"/><button class="btn" data-act="sponsor:${S.id}">Sponsor</button>`}</div>`; }).join('')}</div>`;
  }
  if (tab === 'photo') {
    const board = F5.photoBoard(s, week);
    html += `<p class="sub">Snap a photo (watermarked INU VERSE), share to X, and enter the weekly best-photo board. #1 wins a free cosmetic. No entry fee.</p>
      <button class="btn" data-act="photo">Submit this week's snap</button>
      <a class="btn alt" id="sharex" href="${F5.shareXUrl('Best photo from Inu Verse')}" target="_blank" rel="noopener">Share to X</a>
      <ol class="lb">${board.slice(0, 5).map((r) => `<li${r.me ? ' class="me"' : ''}>${r.rank}. ${esc(r.by)} <b>${r.score}</b></li>`).join('')}</ol>
      <button class="btn" data-act="photoprize">Claim #1 prize</button>`;
  }
  if (tab === 'tourney') {
    const board = F5.tourneyBoard(s, week), pool = F5.tourneyPool(s);
    html += `<p class="sub">Free-entry weekly job-skill tournament. Your best scores across jobs sum up. Top 3 split a Bones pool (skill only — no entry fee, no luck).</p>
      <div class="card"><b>Live pool: ${pool} Bones</b></div>
      <ol class="lb">${board.slice(0, 5).map((r) => `<li${r.me ? ' class="me"' : ''}>${r.rank}. ${esc(r.name)} <b>${Math.floor(r.score)}</b></li>`).join('')}</ol>
      <button class="btn" data-act="tourney">Claim top-3 prize</button>`;
  }
  if (tab === 'ugc') {
    html += `<p class="sub">Design a tiny pixel outfit or furniture piece. List it for ${F5.UGC_SELL_PRICE} Bones. Admin can feature a design as official.</p>
      <p><input id="ugcname" placeholder="Design name" maxlength="18"/>
        <select id="ugckind"><option value="outfit">Outfit</option><option value="furniture">Furniture</option></select>
        <select id="ugcslot"><option value="hat">Hat</option><option value="neck">Neck</option><option value="top">Top</option></select>
        <button class="btn" data-act="ugcsave">Save 8×8 design</button></p>
      <div class="grid">${F.ugc.designs.map((d) => `<div class="card"><b>${esc(d.name)}</b><small>${d.kind} · ${d.listed ? 'listed' : 'draft'}${d.official ? ' · ★ official' : ''} · ${d.sales} sales</small>
        ${!d.listed ? `<button class="btn alt" data-act="ugclist:${d.id}">List</button>` : `<button class="btn alt" data-act="ugcbuy:${d.id}">Buy</button>`}
        <button class="btn" data-act="ugcfeat:${d.id}">Feature</button></div>`).join('') || '<p class="small">No designs yet.</p>'}</div>`;
  }
  if (tab === 'streak') {
    html += `<p class="sub">Daily login streak. Bones grow each consecutive day. Day ${F5.STREAK_DAY_REWARD} unlocks a free cosmetic.</p>
      <div class="card"><b>Streak: ${F.streak.count} days</b><small>Last claim day ${F.streak.day < 0 ? '—' : F.streak.day}</small></div>
      <button class="btn" data-act="streak">Claim today's Bones</button>`;
  }

  ctx.body.innerHTML = html;
  if (tab === 'quests' && ctx.kp?.session) serverQuests(ctx);
  ctx.body.onclick = (e) => {
    const t = e.target.closest('[data-f5]'); if (t) return ctx.open(t.dataset.f5);
    const b = e.target.closest('[data-act]'); if (!b) return;
    const act = b.dataset.act, cut = act.indexOf(':'), a = cut < 0 ? act : act.slice(0, cut), id = cut < 0 ? '' : act.slice(cut + 1);
    let r;
    if (a === 'burnclaim') r = F5.claimBurnFest(s, month);
    if (a === 'remote') r = F5.reportRemoteQuest(s, id, week);
    if (a === 'questclaim') r = F5.claimQuestChain(s, week);
    if (a === 'sponsor') r = F5.rentSponsor(s, id, ctx.body.querySelector(`[data-brand="${id}"]`)?.value || 'Brand', ctx.nowH);
    if (a === 'photo') r = F5.submitPhoto(s, week, { caption: 'Inu Verse snap' });
    if (a === 'photoprize') r = F5.claimPhotoPrize(s, week);
    if (a === 'tourney') r = F5.claimTourney(s, week);
    if (a === 'ugcsave') {
      const pixels = Array.from({ length: 64 }, (_, i) => ['#e3b341', '#c8282e', '#3a6fd8', '#fff6e0'][i % 4]);
      r = F5.saveUgc(s, { kind: ctx.body.querySelector('#ugckind')?.value, name: ctx.body.querySelector('#ugcname')?.value, slot: ctx.body.querySelector('#ugcslot')?.value, pixels });
    }
    if (a === 'ugclist') r = F5.listUgc(s, id);
    if (a === 'ugcbuy') { const d = F.ugc.designs.find((x) => x.id === id); r = F5.buyUgc(s, d); }
    if (a === 'ugcfeat') r = F5.featureUgc(s, id);
    if (a === 'streak') r = F5.claimDaily(s, day);
    if (!r) return;
    if (!r.ok) return ctx.toast(r.reason || 'Not now', 'bad');
    ctx.toast(a === 'streak' ? `Day ${r.streak}: +${r.bones} Bones${r.cosmetic ? ' + ' + r.cosmetic : ''}` : a === 'photo' ? 'Photo submitted!' : a === 'sponsor' ? 'Sponsored!' : a === 'tourney' ? `Rank #${r.rank}: +${r.prize} Bones` : a === 'burnclaim' || a === 'questclaim' || a === 'photoprize' ? `Cosmetic: ${r.item}` : 'Done', 'good');
    ctx.hud(); ctx.persist(); ctx.open(tab);
  };
}

// server-side quests (real mode): progress from /api/game?action=quests, claim writes the reward to the wallet inventory
const grant = (s) => { s.wardrobe ||= { owned: [] }; if (OUTFITS[F5.QUEST_REWARD] && !s.wardrobe.owned.includes(F5.QUEST_REWARD)) s.wardrobe.owned.push(F5.QUEST_REWARD); };
async function serverQuests(ctx) {
  const el = ctx.body.querySelector('#srvq'); if (!el) return;
  try { const q = await ctx.kp.quests(); if (q.claimed) grant(ctx.state);
    el.innerHTML = q.list.map((it) => `<div class="card"><b>${it.ok ? '✓' : '·'} ${esc(it.name)}</b></div>`).join('') +
      `<button class="btn" id="srvclaim" ${q.done < q.total || q.claimed ? 'disabled' : ''}>${q.claimed ? 'Claimed this week' : `Claim ${esc(OUTFITS[F5.QUEST_REWARD]?.name || 'reward')} (${q.done}/${q.total})`}</button>`;
    const b = el.querySelector('#srvclaim'); if (b) b.onclick = async () => { const r = await ctx.kp.claimQuests().catch((e) => ({ ok: false, reason: e.message }));
      if (r.ok) { grant(ctx.state); ctx.toast?.('Quest chain reward added to your wardrobe!', 'good'); ctx.persist?.(); } else ctx.toast?.(r.reason || r.error || 'Claim failed', 'bad'); serverQuests(ctx); };
  } catch (e) { el.innerHTML = `<div class="card">Quests unavailable: ${esc(e.message)}</div>`; }
}
