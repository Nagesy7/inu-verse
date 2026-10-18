// The ONE place Inu Verse names its own wallets. Every screen that shows one of these addresses shows the name, a short
// address (BzLY…TGJ) and a Solscan link. No imports here (shared by the browser, api/ and tests).
export const SOLSCAN = (addr) => `https://solscan.io/account/${addr}`;
export const WALLETS = Object.freeze({
  presidentsVault: Object.freeze({ id: 'presidentsVault', name: "President's Vault", address: 'BzLYTFAfUsjzQ5x8bx5BbPK4DFtaHrLCuferkvkxTNGJ', role: "creator share · President Inu's treasury" }),
  kennelChest: Object.freeze({ id: 'kennelChest', name: 'Kennel Chest', address: 'Akk3DdxeRRLZABfpkFKYoDBk6Zim5wNLRYemNFjv56fn', role: 'community pool · prize pool wallet' }),
  boneVault: Object.freeze({ id: 'boneVault', name: 'Bone Vault', address: 'Bv35NAj1XvfSGrQKpHHw29ojZmY4NYyUZr7rwXpPhW8Y', role: 'dev wallet', about: 'Bone Vault receives the 25% dev share for hosting, tools and art, with part of it seeding the next Inu project after Inu Verse.' }),
});
export const BONE_VAULT_LINE = WALLETS.boneVault.about; // exact wording wherever Bone Vault is described
export const TREASURY_WALLET = WALLETS.presidentsVault.address, PRIZE_POOL_WALLET = WALLETS.kennelChest.address, DEV_WALLET = WALLETS.boneVault.address;
const BY_ADDR = Object.fromEntries(Object.values(WALLETS).map((w) => [w.address, w]));
export const walletOf = (addr) => BY_ADDR[String(addr || '')] || null;
export const nameOf = (addr) => walletOf(addr)?.name || null;
export const shortAddr = (a) => (a ? `${a.slice(0, 4)}…${a.slice(-3)}` : '');
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// "<b>President's Vault</b> BzLY…TGJ ↗" linked to Solscan. Unknown addresses: short address + link only.
export function walletHtml(addr, { role = false } = {}) { const w = walletOf(addr);
  return `<span class="wname">${w ? `<b>${esc(w.name)}</b> ` : ''}<a href="${esc(SOLSCAN(addr))}" target="_blank" rel="noopener noreferrer" title="${esc(addr)}"><code>${esc(shortAddr(addr))}</code> ↗</a>${role && w ? ` <span class="small">(${esc(w.role)})</span>${w.about ? ` <span class="small wabout">${esc(w.about)}</span>` : ''}` : ''}</span>`; }
export const walletText = (addr) => (nameOf(addr) ? `${nameOf(addr)} ${shortAddr(addr)}` : shortAddr(addr));

// Official $KIBBLE creator fee split (published by President Inu, approved by Zachary).
export const KIBBLE_MINT = '4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump';
export const KIBBLE_SPLIT = Object.freeze([
  Object.freeze({ address: WALLETS.kennelChest.address, bps: 4000, share: 'community pool' }),
  Object.freeze({ address: WALLETS.presidentsVault.address, bps: 3500, share: 'creator' }),
  Object.freeze({ address: WALLETS.boneVault.address, bps: 2500, share: 'dev wallet' }),
]);
export const SPLIT_NOTE = 'How $KIBBLE creator fees are shared, published for transparency. This is not a payout promise to holders and there are no returns.';
export function splitHtml(split = KIBBLE_SPLIT, { note = SPLIT_NOTE } = {}) {
  return `<div class="wsplit"><ul>${split.map((s) => `<li><b class="wpct">${s.bps / 100}%</b> ${s.share ? `<span class="small">${esc(s.share)}</span> ` : ''}${walletHtml(s.address)}${walletOf(s.address)?.about ? `<div class="small wabout">${esc(walletOf(s.address).about)}</div>` : ''}</li>`).join('')}</ul>${note ? `<div class="small wnote">${esc(note)}</div>` : ''}</div>`; }
export const WALLET_CSS = `.wname code{font-size:.95em}.wname a{color:inherit;text-decoration:underline dotted}.wsplit ul{list-style:none;margin:4px 0;padding:0}.wsplit li{padding:2px 0;line-height:1.4}.wpct{display:inline-block;min-width:38px;color:#f2cc68}.wabout{opacity:.9;margin:1px 0 0 42px}.wnote{opacity:.85;border-left:3px solid #d4a640;padding:2px 6px;margin-top:3px}`;
