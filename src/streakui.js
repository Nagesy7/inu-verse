// Login streak HTML: Streak tab, the profile card (Wardrobe) and the HUD chip. Device-only is labelled wherever it shows.
import * as LS from './loginstreak.js'; import { pinUrl, flameUrl } from './streakart.js'; import { shortAddr } from './wallets.js';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const sourceLine = (v, { signedIn, address } = {}) => (v.wallet ? `Saved to your wallet${address ? ' ' + esc(shortAddr(address)) : ''} · counted once per Sydney day by the server`
  : `<b>Device-only</b>: saved on this device. ${signedIn ? 'Syncing to your wallet…' : 'Connect Phantom (wallet button, top bar) to save it to your wallet.'}`);
export function pinsHtml(v, { wear = true } = {}) {
  return `<div class="grid pins">${v.pins.map((p) => `<div class="card pin ${p.got ? 'got' : 'locked'}"><img src="${pinUrl(p.tier, 3, !p.got)}" alt="" width="38" height="38"><b>${esc(p.name)}</b><small>${p.tier} days${p.got ? (p.deviceOnly ? ' · device-only' : ' · unlocked') : ''}</small>${wear && p.got ? `<button class="btn ${p.worn ? '' : 'alt'}" data-act="pin:${p.worn ? 'off' : p.tier}">${p.worn ? 'Take off' : 'Wear'}</button>` : ''}</div>`).join('')}</div>`;
}
export function streakHtml(s, opts = {}) { const v = LS.view(s);
  return `<div class="card streakcard" id="login-streak"><b>Login streak: ${v.count} day${v.count === 1 ? '' : 's'}</b>
    <small>${sourceLine(v, opts)}</small><small>Best ${v.best} · today ${v.doneToday ? 'counted ✓' : 'not counted yet'} · days run midnight to midnight Sydney time</small>
    <small>${v.pinsNeedWallet ? '<b>Pins count wallet-verified days only.</b> Device-only days keep your streak here but earn no pins and never carry over onto a wallet.' : v.next ? `Next pin at ${v.next} days (${v.next - v.count} to go)` : 'Every streak pin unlocked'}</small>${v.migrated ? `<small>Carried over from your earlier device streak: ${v.migrated.device} in-game days → ${v.migrated.granted} real days (the most possible since 15 Oct 2026).</small>` : ''}</div>
    <p class="sub">Streak pins are cosmetic only: wear one on your Shiba and your profile. No Bones or $KIBBLE.</p>${pinsHtml(v)}`;
}
export function profileCardHtml(s, opts = {}) { const v = LS.view(s), worn = v.pins.find((p) => p.worn);
  return `<div class="card profstreak" id="profile-streak">${worn ? `<img src="${pinUrl(worn.tier, 3)}" alt="" width="38" height="38">` : `<img src="${flameUrl(3)}" alt="" width="24" height="27">`}<div><b>${v.count}-day login streak</b> <small>(best ${v.best})</small>
    <small>${v.wallet ? 'Saved to wallet' : 'Device-only'} · ${v.pins.filter((p) => p.got).length}/4 pins${v.wallet ? '' : ' (device-only)'}${worn ? ' · wearing ' + esc(worn.name) : ''}</small></div><button class="btn alt" data-streak-open>Streak</button></div>`;
}
export function chipHtml(s) { const v = LS.view(s), worn = v.pins.find((p) => p.worn);
  return `<img src="${worn ? pinUrl(worn.tier, 2) : flameUrl(2)}" alt="" width="${worn ? 26 : 16}" height="${worn ? 26 : 18}"><span id="streak-n">${v.count}</span><small>${v.wallet ? 'day streak' : 'day · device'}</small>`;
}
