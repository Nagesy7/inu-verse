// Toasts off the player (phone landscape, e.g. 844x390): the camera keeps the player's pup in the middle of the screen, so the
// toast stack moves from the top-centre row (where it sat right on the pup) to the bottom-centre strip between the joystick and
// the A/B pad, just above whatever already lives there (event banner #ev-banner, chat bar #mp-chat, photo bar). It never rises
// above the pup's feet: when only one toast fits, only the newest shows; when there is no room at all (e.g. a tall open chat log)
// the stack goes back to its top row. Toast height is measured (a wrapped line is taller); same column width as the top row, so it
// clears the open ticker list, the joystick and the A/B pad. Only in-world with no panel/modal open (panels hide the pup anyway). DOM-only, no game state;
// fitToasts() runs from the game loop's ~200 ms UI hook and only writes when something changed.
import { isShortLandscape } from './bannerfit.js';
export const TF = Object.freeze({ GAP: 6, EDGE: 10, FEET: 18, TOAST_H: 44, BELOW: ['ev-banner', 'mp-chat', 'photobar'] });
// pure: given the viewport and the tops of the bottom-centre obstacles -> { low, bottom, one }
export function toastSlot(h, tops, { gap = TF.GAP, edge = TF.EDGE, feet = TF.FEET, th = TF.TOAST_H } = {}) {
  const floor = tops.length ? Math.min(...tops) - gap : h - edge, space = floor - (h / 2 + feet);
  if (space < Math.min(th, 24)) return { low: false, bottom: null, one: false }; // no room at all (e.g. a tall open chat log): top row
  return { low: true, bottom: Math.round(h - floor), one: space < th * 2 + gap }; }
const shown = (el, win) => { if (!el || el.hidden || !el.getClientRects().length) return false; const cs = win.getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && +cs.opacity > 0.05; };
export function fitToasts(doc, win = globalThis) { const body = doc.body; if (!body) return null; const W = win.innerWidth, H = win.innerHeight;
  const on = body.classList.contains('inworld') && !body.classList.contains('modal-open') && !body.classList.contains('photo') && isShortLandscape(W, H);
  let s = { low: false, bottom: null, one: false };
  if (on) { const tops = []; for (const id of TF.BELOW) { const el = doc.getElementById(id); if (!shown(el, win)) continue; const r = el.getBoundingClientRect();
      if (r.width > 0 && r.left < W * 0.7 && r.right > W * 0.3 && r.top > H / 2) tops.push(r.top); } // only things in the bottom-centre strip
    const last = doc.getElementById('toast')?.lastElementChild, lh = last ? last.getBoundingClientRect().height : 0;
    s = toastSlot(H, tops, { th: lh > 0 ? Math.ceil(lh) : TF.TOAST_H }); }
  const want = s.low ? s.bottom + 'px' : '';
  if (body.style.getPropertyValue('--toast-b') !== want) { if (want) body.style.setProperty('--toast-b', want); else body.style.removeProperty('--toast-b'); }
  if (body.classList.contains('toast-low') !== s.low) body.classList.toggle('toast-low', s.low);
  if (body.classList.contains('toast-one') !== s.one) body.classList.toggle('toast-one', s.one);
  return s; }
