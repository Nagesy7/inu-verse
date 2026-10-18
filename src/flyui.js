// City Board panel: Prize Pools, Featured billboards, Burn-for-status, President drops.
import { walletHtml, walletText } from './wallets.js';
import * as F from './flywheels.js'; import { fmtK, POOL_RULES } from './mall.js'; import { jobBoard } from './jobs.js'; import { farmBoard, ensureFarm } from './farm.js'; import { bizBoard, ensureBiz } from './biz.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const top = (rows, n = 3) => rows.slice(0, n).map((r, i) => `<li${r.me ? ' class="me"' : ''}>${i + 1}. ${esc(r.name)} <b>${Math.floor(r.score)}</b></li>`).join('');
// ctx: { state, body, toast, hud, persist, rerender, nowH, day, weekFrac, dayFrac, trend, presOn, presKey, tab }
export function renderCity(ctx) { const s = ctx.state, f = F.ensureFly(s), P = F.poolsOf(s), tab = ctx.tab || 'pools';
  const tabs = [['pools', 'Prize Pools'], ['featured', 'Featured Ads'], ['status', 'Burn for Status'], ['drops', 'President Drops']];
  let html = `<h2>City Board</h2><div class="ctabs">${tabs.map(([k, n]) => `<button class="ctab ${k === tab ? 'sel' : ''}" data-ctab="${k}">${n}</button>`).join('')}</div>`;
  if (tab === 'pools') { const fm = ensureFarm(s), bz = ensureBiz(s);
    html += `<p class="sub">Pools grow from the transparent 2% Mall fee, the 5% market fee and business rent. Winners are decided by <b>skill and rank only</b>: no entry fee, no luck.</p>
    <div class="grid pools">
      <div class="card"><b>Daily · ${fmtK(P.daily)} KIBBLE</b><small>${POOL_RULES.daily}</small><ol class="lb">${top(jobBoard(s, ctx.day, ctx.dayFrac))}</ol><small>Job board: today's shift pay</small></div>
      <div class="card"><b>Weekly · ${fmtK(P.weekly)} KIBBLE</b><small>${POOL_RULES.weekly}</small><small>+ ${Math.floor(fm.pool)} Bones Top Farmer · ${Math.floor(bz.pool)} Bones Top Business</small>
        <ol class="lb">${top(farmBoard(s, ctx.weekFrac), 2)}</ol><ol class="lb">${top(bizBoard(s, ctx.weekFrac), 2)}</ol></div>
      <div class="card"><b>Monthly · ${fmtK(P.monthly)} KIBBLE</b><small>${POOL_RULES.monthly}</small></div>
    </div><p class="small">Treasury (President Inu): ${fmtK(P.treasury)} KIBBLE received · burned so far: ${fmtK(s.mall?.burnedU || 0)} KIBBLE</p><div class="card" id="prize-wallet-board"><b>Prize wallet (live, on-chain)</b><small>Loading…</small></div>`; setTimeout(fillPrizeWallet, 0); }
  if (tab === 'featured') { html += `<p class="sub">Rent a <b>FEATURED</b> billboard for your favourite Launch Hall coin. Paid in $KIBBLE to the treasury (+2% prize pool fee). Organic trending ads stay free and keep rotating on every other sign.</p><div class="grid">` +
    Object.values(F.FEATURED_SLOTS).map((S) => { const cur = F.featuredOf(s, S.id, ctx.nowH); return `<div class="card"><b>${S.name}</b><small>${S.price} KIBBLE / ${S.hours} in-game hours</small>${cur ? `<small>Now: <b>$${esc(cur.ticker)}</b> by ${esc(cur.by)} · ${Math.max(0, Math.ceil(cur.untilH - ctx.nowH))}h left</small>` :
      `<select data-sel="${S.id}">${(ctx.trend || []).map((c) => `<option value="${esc(c.ticker)}">$${esc(c.ticker)} (${c.pct.toFixed(1)}%)</option>`).join('')}</select><button class="btn" data-act="feat:${S.id}">Feature it</button>`}</div>`; }).join('') + '</div>'; }
  if (tab === 'status') { html += `<p class="sub">Limited editions you get by <b>burning</b> $KIBBLE. The tokens are destroyed, not paid to anyone. Each one is numbered and supply is capped. Owners get a glowing flair at home, around town and in photos.</p><div class="grid">` +
    Object.entries(F.STATUS).map(([id, S]) => { const own = f.owned[id], left = F.remaining(s, id); return `<div class="card"><b style="color:${S.glow}">${S.name}</b><small>${S.kind} · burn ${S.burn} KIBBLE</small><small>${left}/${S.supply} left${own ? ` · yours is <b>#${own.n}</b>` : ''}</small>${own ? '<small>✓ owned · flair on</small>' : left ? `<button class="btn" data-act="burn:${id}">Burn ${S.burn}</button>` : '<small>Sold out</small>'}</div>`; }).join('') + '</div>'; }
  if (tab === 'drops') { const got = Object.values(f.drops); html += `<p class="sub">When President Inu visits, say hi to collect a <b>free</b> limited cosmetic for that visit. One per visit, free for everyone.</p>
    <p>${ctx.presOn ? `<b>President Inu is in town!</b> ${f.drops[ctx.presKey] ? '(claimed ✓)' : '<button class="btn" data-act="drop">Claim free drop</button>'}` : 'President Inu is away. Watch for the next visit.'}</p>
    <div class="grid">${F.PRES_DROPS.map((d) => `<div class="card"><b>${d.name}</b><small>${got.includes(d.id) ? '✓ collected' : 'not yet'}</small></div>`).join('')}</div>`; }
  ctx.body.innerHTML = html;
  ctx.body.onclick = (e) => { const t = e.target.closest('[data-ctab]'); if (t) return ctx.open(t.dataset.ctab); const b = e.target.closest('[data-act]'); if (!b) return; const [a, id] = b.dataset.act.split(':'); let r;
    if (a === 'feat') r = F.rentFeatured(s, id, ctx.body.querySelector(`[data-sel="${id}"]`)?.value, ctx.nowH);
    if (a === 'burn') r = F.burnForStatus(s, id);
    if (a === 'drop') r = ctx.presOn ? F.claimPresDrop(s, ctx.presKey) : { ok: false, reason: 'President is away' };
    if (!r) return; if (!r.ok) return ctx.toast(r.reason || 'Not now', 'bad');
    ctx.toast(a === 'feat' ? 'Your coin is now FEATURED on the billboard!' : a === 'burn' ? `Burned! You own #${r.n} (${r.left} left).` : `Free drop: ${r.drop.name}!`, 'good'); ctx.hud(); ctx.persist(); ctx.open(tab); };
}

// Live prize wallet board from kibble-pay /api/pools (display only; shortened wallets; tx links to the explorer).
const KP = 'https://kibble-pay.vercel.app';
async function fillPrizeWallet() {
  const el = document.getElementById('prize-wallet-board'); if (!el) return;
  const e = (x) => String(x ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
  try {
    const P = (await (await fetch(KP + '/api/pools')).json()).prize, d = P.decimals ?? 6, u = (v) => (Number(v || 0) / 10 ** d).toLocaleString('en-US', { maximumFractionDigits: 4 }) + ' KIBBLE';
    let bal = '–';
    if (P.prizeWallet?.ata) { try { const b = await (await fetch(KP + '/api/rpc', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'getTokenAccountBalance', params: [P.prizeWallet.ata] }) })).json(); bal = b.result ? u(b.result.value.amount) : 'no KIBBLE account yet'; } catch {} }
    const tx = (x) => `<a href="${e(x.explorer)}" target="_blank" rel="noopener">${e(x.txShort)}</a>`;
    el.innerHTML = `<b>Prize wallet (live, on-chain)</b><small>${P.prizeWallet ? `${P.prizeWallet.address ? walletHtml(P.prizeWallet.address) : `<a href="${e(P.prizeWallet.explorer)}" target="_blank" rel="noopener">${e(P.prizeWallet.short)}</a>`} · balance ${e(bal)}` : 'prize wallet not set'}</small>
      <small>Prize pool fee accrued, not yet swept: ${u(P.unsweptBaseUnits)} · sweep every ${e(P.sweep.everyDays)} days</small>
      <small>Sweeps: ${P.sweeps.slice(0, 3).map((x) => `${u(x.amountBaseUnits)} ${tx(x)}`).join(' · ') || 'none yet'}</small>
      <small>Payouts: ${P.payouts.slice(0, 5).map((x) => `${e(x.pool)} #${e(x.rank)} ${e(walletText(x.wallet) || x.wallet)} ${u(x.amountBaseUnits)} ${tx(x)}`).join(' · ') || 'none yet'}</small>
      <small><a href="${KP}/pools" target="_blank" rel="noopener">Full prize pool board ↗</a></small>`;
  } catch { el.innerHTML = `<b>Prize wallet</b><small><a href="${KP}/pools" target="_blank" rel="noopener">Open prize pool board ↗</a></small>`; }
}
