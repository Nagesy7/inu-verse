// District booth lease UI (Bones only). Pure HTML + a tiny sidewalk plaque draw. Logic lives in district-rent.js.
import { BOOTHS, BOOTH_IDS, LEASE_COPY, DEPOSIT_DAYS, UNPAID_CLOSE, deposit, offered, offers, rentWarn, boothIn, districtRentEnabled } from './district-rent.js';
import { DISTRICTS, district, kioskOf } from './districts.js';
const ST = 32;
const escDef = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export const GUIDE = 'Want a nameplate? Lease a plaque for Bones.';
export function leaseTile(d) { const [kx, ky] = kioskOf(d); return [kx + 2, ky - 1]; }
export function leaseSpots() {
  return DISTRICTS.map((d) => { const [tx, ty] = leaseTile(d); return { id: 'lease-' + d.id, tx, ty, face: 'down', name: `Booth lease (${d.name})`, act: { panel: 'boothrent', opts: { district: d.id } }, label: 'Lease' }; });
}
export function otherDailyRent(s) { const lot = s?.biz?.mine?.lot; if (!lot) return 0; const L = { P1: 120, P2: 120, L1: 40, L2: 40, L3: 40, L4: 40 }; return L[lot] || 0; }
export function panelHtml(s, districtId, { esc = escDef, earnedYesterday = 0 } = {}) {
  const d = district(districtId) || DISTRICTS[0], list = offers(d.id), mine = s?.districtRent?.lease;
  const head = `<h2>Cosmetic booth</h2><p class="sub">${esc(LEASE_COPY)}</p><p class="small">${esc(GUIDE)}</p>`;
  if (mine) {
    const B = BOOTHS[mine.cls], here = mine.district === d.id;
    return `${head}<div class="card"><b>${esc(B?.name || mine.cls)}</b><small>${esc(district(mine.district)?.name || mine.district)} · ${mine.rent} Bones / day</small>
      <small>${here ? 'Showing here' : 'Your lease is in another district'} · paid through day ${mine.paidThrough} · unpaid ${mine.unpaid || 0}/${UNPAID_CLOSE}</small>
      <div class="row"><button class="btn red" id="rent-end">End lease</button></div></div>
      <p class="small">Cabinets stay free. Ending a lease has no refund.</p>`;
  }
  if (!list.length) return `${head}<p class="small">No booth class is offered in ${esc(d.name)} yet. Plaques and booth skins live on Arcade Row; kiosk and venue banners open where a cabinet is live.</p>`;
  const cards = list.map((B) => {
    const cost = deposit(B.id), short = (s.bones || 0) < cost, warn = rentWarn(B.id, earnedYesterday, otherDailyRent(s));
    return `<div class="card" data-cls="${B.id}"><b>${esc(B.name)}</b><small>${B.rent} Bones / day · deposit ${cost} (${DEPOSIT_DAYS} days)</small><small>${esc(B.blurb)}</small>
      ${warn ? '<div class="small rent-warn">This rent is a large slice of yesterday’s Bones. You can still lease it.</div>' : ''}
      <button class="btn ${short ? 'ghost' : 'green'}" data-lease="${B.id}" ${short ? 'disabled' : ''}>${short ? `Need ${cost} Bones` : `Lease · ${cost} Bones`}</button></div>`;
  }).join('');
  return `${head}<p class="small">You have <b>${Math.floor(s.bones || 0)}</b> Bones. One lease at a time.</p><div class="grid" id="rent-grid">${cards}</div>`;
}
export function drawPlaque(c, x, y, mine, name) {
  c.fillStyle = '#141a2e'; c.fillRect(x + 14, y - 10, 4, 36);
  c.fillStyle = mine ? '#f2cc68' : '#8a6a3a'; c.fillRect(x + 2, y - 18, 28, 16);
  c.fillStyle = '#141a2e'; c.fillRect(x + 3, y - 17, 26, 14);
  c.fillStyle = mine ? '#f6e7b8' : '#cfc6a4'; c.font = '5px Silkscreen, monospace'; c.textAlign = 'center'; c.textBaseline = 'middle';
  c.fillText(mine ? String(name || 'YOU').slice(0, 8).toUpperCase() : 'LEASE', x + 16, y - 10);
}
export function leaseDeskProps(s, name) {
  if (!districtRentEnabled()) return [];
  const out = [];
  for (const d of DISTRICTS) {
    const [tx, ty] = leaseTile(d), mine = boothIn(s, d.id);
    out.push({ y: (ty + 1) * ST, d: (c) => drawPlaque(c, tx * ST, ty * ST, mine, name) });
  }
  return out;
}
export { offered, BOOTH_IDS };
