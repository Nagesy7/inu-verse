// Keeps the bottom text-chat bar (#mp-chat, src/multiplayer.js) out of the way at phone landscape: while any panel / modal is open the
// bar is hidden (body.modal-open), and the daily-event entry banner (#ev-banner) is lifted to sit just above the bar instead of under it.
// Transient banners (event / crier / president) are hidden while a modal is open too. DOM-only, no game state. syncChat() is called from the game loop at most every ~200 ms.
export const MODAL_SEL = Object.freeze(['#panel', '#dialog', '#mg', '#arcade-ov', '#enter-ov', '#act-wheel', '#founding-seat-notice', '.overlay', '[role="dialog"]']);
const SKIP = new Set(['mp-pop', 'sound-pop']); // small top-corner popovers, nowhere near the chat bar
const shown = (el) => !!el && !el.hidden && !el.closest('[hidden]') && el.getClientRects().length > 0;
export function modalOpen(doc) { for (const sel of MODAL_SEL) for (const el of doc.querySelectorAll(sel)) if (!SKIP.has(el.id) && shown(el)) return true; return false; }
const CSS = 'body.modal-open #ev-banner,body.modal-open #crier-banner,body.modal-open #pres-banner{display:none}'; // transient banners never float over a modal
export function syncChat(doc, win = globalThis) { if (!doc.getElementById('chatdodge-css')) { const st = doc.createElement('style'); st.id = 'chatdodge-css'; st.textContent = CSS; doc.head.appendChild(st); }
  const on = modalOpen(doc); if (doc.body.classList.contains('modal-open') !== on) doc.body.classList.toggle('modal-open', on);
  const bn = doc.getElementById('ev-banner'), bar = doc.getElementById('mp-chat');
  if (bn && !bn.hidden) { const r = !on && shown(bar) ? bar.getBoundingClientRect() : null, want = r && r.height ? Math.round(win.innerHeight - r.top + 6) + 'px' : '';
    if (bn.style.bottom !== want) bn.style.bottom = want; }
  return on; }
