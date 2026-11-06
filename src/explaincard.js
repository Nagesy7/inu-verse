// Bones vs $KIBBLE explainer card — copy v1.1 (5 Nov 2026, Australia/Sydney).
// Source: /workspace/briefs/kibble-bones-vs-kibble-explainer-card-2026-10-29.md. Static copy only; no live price, no swap CTA.
export const TITLE = 'Bones & $KIBBLE';
export const BODY = 'Bones are the town’s play money — you earn them from jobs, farms and quests, spend them on everyday stuff in Verse, and they never cash out. $KIBBLE is the real token you move from your own wallet; in our games it only buys cosmetics and status looks, never a better shot at prizes. Nothing here is financial advice, and the games never hold your tokens for you.';
export const DISMISS = 'Got it';
export const DONT_SHOW = 'Don’t show again';
export const BOOTH_LINE = 'Booth plaques and skins rent in Bones (play money). Cabinets stay free. $KIBBLE never pays district rent.';
export const TOOLTIPS = Object.freeze({
  bones: 'Play currency. Earn in Verse. Never cash out.',
  kibble: 'Cosmetics only. You sign in your wallet. Not a prize boost.',
  rent: 'Bones lease. Cosmetic only. Cabinets free.',
});
export const PRIZE_URL = 'https://kibble-pay.vercel.app/prize-rules.html';
export const TERMS_URL = 'https://kibble-pay.vercel.app/terms.html';
export const BANNED = Object.freeze(['buy now', 'moon', 'dump', 'pump', 'invest', 'earn yield', 'stake for rewards', 'guaranteed', 'cash out Bones', 'convert Bones to $KIBBLE']);
export function ensureCard(s) { if (!s) return null; s.explainCard ||= { hide: false, seenBank: false, seenLease: false }; return s.explainCard; }
export function shouldShow(s, place) {
  const c = s?.explainCard; if (c?.hide) return false;
  if (place === 'bank') return !c?.seenBank;
  if (place === 'lease') return !c?.seenLease;
  return true;
}
export function dismiss(s, { hideAgain = false, place = null } = {}) {
  const c = ensureCard(s); if (!c) return c;
  if (hideAgain) c.hide = true;
  if (place === 'bank') c.seenBank = true;
  if (place === 'lease') c.seenLease = true;
  return c;
}
const escDef = (s) => String(s).replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
export function cardHtml({ booth = false, esc = escDef } = {}) {
  return `<div class="explain-card" id="explain-card">
  <h2>${esc(TITLE)}</h2>
  <p>${esc(BODY)}</p>
  ${booth ? `<p class="explain-booth">${esc(BOOTH_LINE)}</p>` : ''}
  <label class="explain-hide"><input type="checkbox" id="explain-hide"> ${esc(DONT_SHOW)}</label>
  <div class="row"><button class="btn green" id="explain-ok">${esc(DISMISS)}</button></div>
  <p class="small explain-foot"><a href="${PRIZE_URL}" target="_blank" rel="noopener">Prize Rules</a> · <a href="${TERMS_URL}" target="_blank" rel="noopener">Terms</a></p>
</div>`;
}
