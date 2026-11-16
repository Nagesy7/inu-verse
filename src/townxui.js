// Place cards for the town economy extras (preview). One card per place: work a shift, shop, challenge, civic help.
// Bones here are in-game play money only (never real earnings, never $KIBBLE).
import { PLACES } from './townx.js';
import { ZJ, ZJOBS, ensureTownx, rankOf, capLeft } from './zonejobs.js';
import { STAFF, INJURED_CAP, CATCH_BONES, treat, putOut, firesAt, crimesAt, savedFires, savedCaught } from './civic.js';
import { SHOPS, TIERS, relOf, tierOf, priceFor, itemStock, buy, brawlResult, MEME_BRAWL_URL } from './shops.js';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export const TOWNX_CSS = `.tx-card h2{margin:0 0 6px;font-size:16px}.tx-card h2 small{font-size:9px;color:#f2cc68;border:1px solid #f2cc68;padding:1px 4px;margin-left:6px;vertical-align:middle}
.tx-card p{margin:6px 0;line-height:1.45;font-size:12px}.tx-sec{border:2px solid #3a4680;background:#141a36;padding:8px;margin:8px 0}.tx-sec h3{margin:0 0 4px;font-size:12px;color:#f2cc68}
.tx-btn{min-height:44px;font:11px Silkscreen,monospace;background:#d4a640;color:#141a2e;border:2px solid #f2cc68;padding:6px 10px;cursor:pointer;margin:4px 4px 0 0}.tx-btn.alt{background:#1a2244;color:#f6e7b8;border-color:#3a4680}.tx-btn[disabled]{opacity:.5;cursor:default}
.tx-row{display:flex;justify-content:space-between;gap:8px;align-items:center;font-size:11px;padding:3px 0;border-bottom:1px dashed #2a3058}.tx-row:last-child{border-bottom:0}
.tx-note{font-size:10px;color:#9fb0d8}.tx-alert{border-color:#e85a3a;background:#2a1418}.tx-sore{color:#ff9a8a}.tx-tag{display:inline-block;font-size:9px;padding:1px 5px;border:1px solid #7fd1b9;color:#7fd1b9;margin-left:4px}
.tx-greet{color:#ffe7a3;font-size:12px;margin:4px 0}.tx-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(130px,1fr));gap:6px}.tx-bar{display:block;height:8px;background:#2a3058;border:1px solid #141a2e}.tx-bar i{display:block;height:100%;background:#7fd1b9}`;
export const bar = (k, col) => `<span class="tx-bar"><i style="width:${Math.round(Math.max(0, Math.min(1, k)) * 100)}%${col ? `;background:${col}` : ''}"></i></span>`;

export function jobSection(state, jobId, day) {
  const job = ZJOBS[jobId], X = ensureTownx(state), J = X.jobs[jobId], rk = rankOf(J.hits), left = capLeft(state, day);
  return `<div class="tx-sec" data-tx-sec="job"><h3>Work a shift: ${esc(job.name)}</h3>
    <p>${esc(job.how)}. Each hit pays 1 Bone x your multiplier, then the multiplier doubles (up to ${ZJ.MULT_CAP}x). A miss drops it back to 1x. The zone shrinks and speeds up every tap. A dead-centre hit adds +${ZJ.PERFECT_BONUS}.</p>
    <div class="tx-row"><span>Rank</span><b>${esc(rk.title)}${rk.next ? ` · ${J.hits}/${rk.next.at} hits to ${esc(rk.next.title)}` : ' · top rank'}</b></div>
    <div class="tx-row"><span>Personal best</span><b>${J.best} · top x${J.bestMult}</b></div>
    <div class="tx-row"><span>Job Bones today</span><b>${ZJ.DAILY_CAP - left}/${ZJ.DAILY_CAP}</b></div>
    <p class="tx-note">${ZJ.SHIFT_ZONES} taps a shift, up to ${ZJ.SHIFT_CAP} Bones a shift and ${ZJ.DAILY_CAP} job Bones a day. Every hit also makes ${esc(job.good)} for the town. Bones are in-game only.</p>
    <button type="button" class="tx-btn" data-tx-job="${esc(jobId)}">${left > 0 ? 'Start shift' : 'Practice shift (cap reached)'}</button></div>`;
}

// opts: { state, place, day, skyDay, startJob(id), toast, reopen(o), sections: { [key]: fn } } -> extra sections from later features
export function renderPlace(body, opts) {
  const p = PLACES[opts.place]; if (!p) { body.innerHTML = '<p>Nothing here.</p>'; return; }
  let html = `<div class="tx-card" data-tx-place="${esc(p.id)}"><h2>${esc(p.name)} <small>PREVIEW</small></h2>${opts.greet ? `<p class="tx-greet">“${esc(opts.greet)}”</p>` : ''}`;
  for (const fn of opts.before || []) html += fn(p) || '';
  if (opts.sec) { const f = firesAt(opts.skyDay, opts.sec(), savedFires(opts.state, opts.skyDay)).find((q) => q.place === p.id && q.phase === 'burning');
    if (f) html += `<div class="tx-sec tx-alert" data-tx-sec="fire-here"><h3>${f.kind === 'kitchen' ? 'Kitchen' : 'Forge'} fire!</h3><p>Smoke is pouring out. ${f.crew != null ? `${STAFF.ember.name} is on the way.` : 'The Fire Station crew is rolling out.'} Nobody is hurt.</p><button type="button" class="tx-btn" data-tx-fire="${f.id}">Grab a hose and put it out</button></div>`; }
  if (p.job && ensureTownx(opts.state).injury) html += `<p class="tx-note tx-sore">Sore from ${esc(ensureTownx(opts.state).injury.what)}: shifts max out at x${INJURED_CAP} until the Hospital patches you up.</p>`;
  if (p.shop) html += shopSection(opts.state, p.shop, opts.ledger ? opts.ledger().rows : [], opts.brawl || null);
  if (p.job) html += jobSection(opts.state, p.job, opts.day);
  if (p.civic === 'townhall' && opts.need) html += needSection(opts.need());
  if (p.civic === 'hospital') html += hospitalSection(opts.state);
  if (p.civic === 'fire') html += fireSection(opts.state, opts.skyDay, opts.sec ? opts.sec() : 0);
  if (p.civic === 'police') html += policeSection(opts.state, opts.skyDay, opts.sec ? opts.sec() : 0);
  for (const fn of opts.after || []) html += fn(p) || '';
  html += '</div>';
  body.innerHTML = html;
  body.onclick = (e) => { const b = e.target.closest('button'); if (!b) return;
    if (b.dataset.txJob) return opts.startJob(b.dataset.txJob);
    if (b.dataset.txBuy) { const [sh, id] = b.dataset.txBuy.split(':'); const rows = opts.ledger ? opts.ledger().rows : []; const r = buy(opts.state, sh, id, { skyDay: opts.skyDay, stock: itemStock(sh, id, rows) });
      if (!r.ok) { opts.toast?.(r.reason, 'bad'); return; }
      opts.saved?.(); opts.toast?.(`${r.item.name}: -${r.paid} Bones${r.paid < r.full ? ` (${Math.round(r.tier.off * 100)}% off)` : ''}${r.tierUp ? ` · ${SHOPS[sh].owner} now calls you ${r.tier.name}!` : ''}${r.gift ? ` · gift: ${r.gift}!` : ''}`, 'good');
      return opts.reopen({ greet: r.line, brawl: null }); }
    if (b.dataset.txBrawl) { const sh = b.dataset.txBrawl; return opts.reopen({ brawl: { shop: sh, stage: 'playing' } }); }
    if (b.dataset.txBrawlRes) { const [sh, res] = b.dataset.txBrawlRes.split(':'); const r = brawlResult(opts.state, sh, res === 'won', { skyDay: opts.skyDay }); opts.saved?.(); return opts.reopen({ brawl: { shop: sh, stage: 'done', won: res === 'won', line: r.line } }); }
    if (b.dataset.txTreat != null) { const r = treat(opts.state, opts.skyDay); if (!r.ok) { opts.toast?.(r.reason, ''); return; } opts.saved?.(); opts.toast?.('Patched up: back to full strength', 'good'); return opts.reopen({ greet: r.line }); }
    if (b.dataset.txFire) { const r = putOut(opts.state, opts.skyDay, opts.sec ? opts.sec() : 0, b.dataset.txFire); if (!r.ok) { opts.toast?.(r.reason, ''); return opts.reopen({}); } opts.saved?.(); opts.toast?.('Fire out! Great work', 'good'); return opts.reopen({ greet: r.line }); }
    if (b.dataset.txBrawlOpen) { try { window.open(MEME_BRAWL_URL, '_blank', 'noopener'); } catch {} return; }
    opts.onButton?.(b, p); };
}

export function shopSection(state, shopId, rows, brawl) {
  const sh = SHOPS[shopId], R = relOf(state, shopId), t = tierOf(R.buys);
  const next = t.next ? `${R.buys}/${t.next.buys} buys to ${t.next.name} (${Math.round(t.next.off * 100)}% off)` : 'Top tier';
  let html = `<div class="tx-sec" data-tx-sec="shop" data-tx-tier="${t.id}"><h3>${esc(sh.owner)}'s ${esc(sh.name)}</h3>
    <div class="tx-row"><span>You are</span><b>${esc(t.name)}${t.off ? ` · ${Math.round(t.off * 100)}% off` : ''}</b></div>
    <div class="tx-row"><span>Next</span><span>${esc(next)}</span></div>${t.next ? bar(R.buys / t.next.buys, '#f2cc68') : ''}
    <p class="tx-note">Tiers: ${TIERS.map((x) => `${x.name} ${Math.round(x.off * 100)}%`).join(' · ')}. Besties sometimes get a small gift.</p>`;
  for (const it of sh.items) {
    const st = itemStock(shopId, it.id, rows), price = priceFor(it, R.buys), off = price < it.price;
    html += `<div class="tx-row" data-tx-item="${it.id}"><span>${esc(it.name)}<br><span class="tx-note">from the ${esc(goodFrom(it.good))} · ${st > 0 ? `${st} on the shelf` : 'sold out, restock ordered'}</span></span>
      <span>${off ? `<s class="tx-note">${it.price}</s> ` : ''}<b>${price}</b> Bones <button type="button" class="tx-btn" data-tx-buy="${shopId}:${it.id}" ${st > 0 ? '' : 'disabled'}>Buy</button></span></div>`;
  }
  html += '</div>';
  const b = brawl && brawl.shop === shopId ? brawl : null;
  html += `<div class="tx-sec" data-tx-sec="brawl"><h3>Challenge ${esc(sh.owner)} to Meme Brawl</h3>`;
  if (!b) html += `<p class="tx-note">Record ${R.brawls.won}W-${R.brawls.lost}L. ${esc(sh.owner)} plays as the hardest CPU.</p><button type="button" class="tx-btn alt" data-tx-brawl="${shopId}">Challenge</button>`;
  else if (b.stage === 'playing') html += `<p class="tx-greet">${esc(sh.owner)}: “${esc(sh.lines.brawlPre)}”</p><p data-tx-brawl-state="playing"><b>${esc(sh.owner)} is playing Meme Brawl</b> · hardest CPU</p>
      <p class="tx-note">Meme Brawl opens in a new tab. It has no link for picking the CPU level yet, so play Arcade: the last fight on the ladder is the hardest CPU. Come back and tell ${esc(sh.owner)} how it went.</p>
      <button type="button" class="tx-btn" data-tx-brawl-open="1">Open Meme Brawl</button><button type="button" class="tx-btn alt" data-tx-brawl-res="${shopId}:won">I won</button><button type="button" class="tx-btn alt" data-tx-brawl-res="${shopId}:lost">I lost</button>`;
  else html += `<p class="tx-greet" data-tx-brawl-state="done">${esc(sh.owner)}: “${esc(b.line)}”</p><p class="tx-note">Record ${R.brawls.won}W-${R.brawls.lost}L.${b.won ? '' : ' Bruised tail? The Hospital can patch that up.'}</p>`;
  return html + '</div>';
}
const goodFrom = (g) => ({ bread: 'Bakery', honey: 'Apiary', fruit: 'Orchard', wool: 'Sheep Meadow', fish: 'Fishery', pots: 'Pottery', tea: 'Tea Garden', milk: 'Dairy', tools: 'Forge', candles: 'Candle Works' }[g] || g);

export function needSection(n) {
  return `<div class="tx-sec" data-tx-sec="need"><h3>Today's town need</h3><p><b>${esc(n.title)}</b></p>${bar(n.have / n.n, n.complete ? '#7af07a' : '#f2cc68')}
    <div class="tx-row"><span>Crews</span><b>${n.crew}</b></div><div class="tx-row"><span>Your shifts</span><b>${n.you}</b></div><div class="tx-row"><span>Still needed</span><b>${n.left}</b></div>
    <p class="tx-greet">${n.complete ? esc(n.done) : 'Every hit in a job shift makes goods for the town.'}</p><p class="tx-note">The full logistics boards are inside the Town Exchange on Exchange Lane.</p></div>`;
}

const hhmm = (sec) => { const m = Math.floor(sec) % 1440; return `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`; };
export function hospitalSection(state) {
  const X = ensureTownx(state), inj = X.injury;
  return `<div class="tx-sec" data-tx-sec="hospital" data-tx-injury="${inj ? esc(inj.what) : ''}"><h3>${esc(STAFF.nurse.name)}'s ward</h3>
    ${inj ? `<p>You have <b>${esc(inj.what)}</b> from ${inj.kind === 'brawl' ? 'a Meme Brawl' : `a ${esc(ZJOBS[inj.job]?.name || 'job')} shift`}. Job shifts max out at x${INJURED_CAP} until it is treated.</p><button type="button" class="tx-btn" data-tx-treat>Get patched up (free)</button>`
      : '<p>All clear! Job bumps (three misses in a row) and Meme Brawl losses leave a cartoon bruise. Come here and we patch you up for free.</p>'}
    <div class="tx-row"><span>Visits</span><b>${X.treated || 0}</b></div></div>`;
}
export function fireSection(state, skyDay, sec) {
  const F = firesAt(skyDay, sec, savedFires(state, skyDay)), X = ensureTownx(state);
  const rows = F.length ? F.map((f) => `<div class="tx-row" data-tx-firerow="${f.id}" data-phase="${f.phase}"><span>${hhmm(f.t0)} ${f.kind === 'kitchen' ? 'Kitchen' : 'Forge'} fire · ${esc(PLACES[f.place].name)}</span><b>${f.phase === 'upcoming' ? 'All quiet' : f.phase === 'burning' ? 'BURNING' : `Out (${f.by === 'you' ? 'by you' : 'crew'})`}</b></div>${f.phase === 'burning' ? `<button type="button" class="tx-btn" data-tx-fire="${f.id}">Ride the truck and put it out</button>` : ''}`).join('') : '<p>No fires on today\'s log.</p>';
  return `<div class="tx-sec" data-tx-sec="fire"><h3>${esc(STAFF.ember.name)}'s station log</h3><p>Kitchens and the forge flare up now and then. The crew rolls out and has it out in under an hour. Nobody gets hurt and nothing burns down.</p>${rows}<div class="tx-row"><span>Fires you put out</span><b>${X.firesOut || 0}</b></div></div>`;
}
export function policeSection(state, skyDay, sec) {
  const C = crimesAt(skyDay, sec, savedCaught(state, skyDay)), X = ensureTownx(state);
  const word = (c) => ({ upcoming: 'Quiet', sneaking: 'Sneaking around!', chase: `${STAFF.officer.name} giving chase`, caught: `Caught by ${c.by === 'you' ? 'you' : STAFF.officer.name}`, done: `Caught by ${c.by === 'you' ? 'you' : STAFF.officer.name}` }[c.phase]);
  const rows = C.map((c) => `<div class="tx-row" data-tx-crime="${c.id}" data-phase="${c.phase}"><span>${hhmm(c.t0)} ${esc(c.thief)} the ${c.kind} · ${esc(PLACES[c.stall].name)}</span><b>${esc(word(c))}</b></div>`).join('');
  return `<div class="tx-sec" data-tx-sec="police"><h3>${esc(STAFF.officer.name)}'s beat log</h3><p>Cartoon pickpockets sneak ${'snacks and trinkets'} from the stalls. Spot one and walk up to stop it (+${CATCH_BONES} Bones, counts toward the daily job cap). Everything always goes back to the stall.</p>${rows}<div class="tx-row"><span>Your catches</span><b>${X.catches || 0}</b></div></div>`;
}
