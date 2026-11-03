// Town crier / event banner fit (phone landscape, e.g. 844x390): the crier banner (#crier-banner) and the president banner
// (#pres-banner) share the centre slot under the interact-prompt row, between the town-news ticker (left column) and the
// minimap / Connect Wallet pill (right column). A wrapped crier line can be 2-3 lines tall on small phones, so instead of a
// fixed offset the toast stack is pushed to just under whichever banner is showing (CSS var --banner-b), and only the newest
// toast stays visible while a banner shows, so neither the toasts nor the banner reach the bottom event banner / chat bar.
// DOM-only, no game state; fitBanners() runs from the game loop at most every ~200 ms and only writes when something changed.
export const BANNERS = Object.freeze(['crier-banner', 'pres-banner']);
export const GAP = 6;
export const isShortLandscape = (w, h) => w > h && h <= 500;
// lowest bottom edge (CSS px) of the visible banners, or null when none shows
export function bannerBottom(rects) { let b = null; for (const r of rects) if (r && r.height > 0 && r.width > 0) b = Math.max(b ?? -Infinity, r.bottom); return b; }
// where the toast stack starts: just under the banner, never above the default toast row
export const toastTop = (bottom, base, gap = GAP) => (bottom == null ? null : Math.max(base, Math.round(bottom + gap)));
const visible = (el, win) => { if (!el || el.hidden || !el.getClientRects().length) return false; const cs = win.getComputedStyle(el); return cs.display !== 'none' && cs.visibility !== 'hidden' && (el.id !== 'crier-banner' || el.classList.contains('show')) && (el.id !== 'pres-banner' || +cs.opacity > 0.05); };
// resting box: its CSS top + height, so the crier's slide-in transform (-12px) doesn't leave toasts too high mid-animation
const layoutRect = (el, win) => { const r = el.getBoundingClientRect(), top = parseFloat(win.getComputedStyle(el).top); return { width: r.width, height: r.height, bottom: (Number.isFinite(top) ? top : r.top) + r.height }; };
export function fitBanners(doc, win = globalThis) { const body = doc.body; if (!body) return null;
  const on = body.classList.contains('inworld') && isShortLandscape(win.innerWidth, win.innerHeight);
  const rects = on ? BANNERS.map((id) => doc.getElementById(id)).filter((el) => visible(el, win)).map((el) => layoutRect(el, win)) : [];
  const t = toastTop(bannerBottom(rects), 100), want = t == null ? '' : t + 'px';
  if (body.style.getPropertyValue('--banner-b') !== want) { if (want) body.style.setProperty('--banner-b', want); else body.style.removeProperty('--banner-b'); }
  if (body.classList.contains('banner-up') !== !!want) body.classList.toggle('banner-up', !!want);
  return t; }
