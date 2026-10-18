// Round 3 action wheel: one radial menu opened from the existing HUD (☰ menu "Actions" button, the multiplayer chip
// popover, or G on desktop). Outer ring = the 9 actions, inner ring = emote bubbles, centre = close. Sized from the
// viewport so every target stays thumb-sized in phone landscape (844x390, 667x375). Number keys 1-9 pick actions.
import { ACTIONS, ACTION_ORDER, BUBBLES } from './actions.js';

export const MIN_TARGET = 44; // px, smallest touch target allowed anywhere on the wheel
// Pure geometry (tested): centred wheel that fits the viewport with a margin, capped for big screens.
export function wheelLayout(w, h) {
  const D = Math.round(Math.max(260, Math.min(h - 20, w - 20, 380))), c = D / 2;
  const b1 = Math.round(D * 0.19), b2 = Math.max(MIN_TARGET, Math.round(D * 0.14)), bc = MIN_TARGET + 4;
  const r1 = c - b1 / 2 - 4, r2 = r1 - b1 / 2 - b2 / 2 - 8;
  const ring = (list, r, size, rot) => list.map((kind, i) => { const a = rot + (i / list.length) * Math.PI * 2; return { kind, x: Math.round(c + Math.sin(a) * r), y: Math.round(c - Math.cos(a) * r), size }; });
  return { D, outer: ring(ACTION_ORDER, r1, b1, 0), inner: ring(BUBBLES.map((b) => b[0]), r2, b2, Math.PI / BUBBLES.length), center: { x: c, y: c, size: bc } };
}

const CSS = `#act-wheel{position:fixed;inset:0;z-index:10005;display:flex;align-items:center;justify-content:center;background:rgba(8,10,24,.42);touch-action:none}
#act-wheel[hidden]{display:none}
#act-wheel .aw-ring{position:relative;border-radius:50%;background:radial-gradient(circle,#1b2550 0 34%,#121a36 35% 100%);border:4px solid #d4a640;box-shadow:0 0 0 4px #0c1022,inset 0 0 0 3px #8f6a22,0 18px 40px #0009}
#act-wheel button{position:absolute;transform:translate(-50%,-50%);border-radius:50%;font:inherit;font-family:Silkscreen,monospace;color:#fff6e0;background:#24305c;border:3px solid #8f6a22;box-shadow:0 0 0 2px #0c1022;cursor:pointer;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:2px;line-height:1.05;touch-action:manipulation;-webkit-tap-highlight-color:transparent}
#act-wheel button:hover,#act-wheel button:focus-visible{border-color:#f2cc68;background:#2f3d74;outline:none}
#act-wheel button:active{transform:translate(-50%,-50%) scale(.94)}
#act-wheel button[aria-pressed=true]{background:#d4a640;color:#121a36;border-color:#f2cc68}
#act-wheel .aw-a b{font-size:15px;color:#f2cc68}#act-wheel .aw-a[aria-pressed=true] b{color:#121a36}
#act-wheel .aw-a span{font-size:8px;max-width:92%;text-align:center}
#act-wheel .aw-a i{position:absolute;top:2px;right:6px;font-style:normal;font-size:8px;opacity:.65}
#act-wheel .aw-b{background:#141a2e;font-size:10px;color:#f2cc68}#act-wheel .aw-b[data-bub=heart]{font-size:22px;color:#ff5a7a}
#act-wheel .aw-x{background:#b3202c;border-color:#f2cc68;font-size:18px}
#act-wheel .aw-cap{position:absolute;left:50%;bottom:-30px;transform:translateX(-50%);white-space:nowrap;font-size:10px;color:#f6e7b8;text-shadow:0 2px 0 #0c1022}
body.coarse #act-wheel .aw-a i{display:none}@media(max-height:520px){#act-wheel .aw-cap{display:none}}`;

export function mountWheel(doc = document, { onAction, onBubble, current = () => null } = {}) {
  let el = null;
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);
  function build() { if (el) return el; const st = doc.createElement('style'); st.id = 'act-wheel-css'; st.textContent = CSS; doc.head.appendChild(st);
    el = doc.createElement('div'); el.id = 'act-wheel'; el.hidden = true; el.setAttribute('role', 'dialog'); el.setAttribute('aria-label', 'Actions');
    el.innerHTML = `<div class="aw-ring">${ACTION_ORDER.map((k, i) => `<button class="aw-a" data-act="${k}" aria-label="${esc(ACTIONS[k].label)}" aria-pressed="false"><i>${i + 1}</i><b>${esc(ACTIONS[k].icon)}</b><span>${esc(ACTIONS[k].label)}</span></button>`).join('')}
${BUBBLES.map(([k, ic]) => `<button class="aw-b" data-bub="${k}" aria-label="Emote ${k}">${esc(ic)}</button>`).join('')}<button class="aw-x" aria-label="Close actions">×</button><div class="aw-cap">Move to stand up · G to close</div></div>`;
    doc.body.appendChild(el);
    el.addEventListener('pointerdown', (e) => e.stopPropagation()); // never turns into a tap-to-walk underneath
    el.addEventListener('click', (e) => { e.stopPropagation(); const b = e.target.closest('button');
      if (!b) { if (e.target === el) close(); return; }
      if (b.dataset.act) { onAction?.(b.dataset.act); close(); } else if (b.dataset.bub) { onBubble?.(b.dataset.bub); close(); } else close(); });
    addEventListener('resize', () => { if (!el.hidden) layout(); }); return el; }
  function layout() { const L = wheelLayout(innerWidth, innerHeight), ring = el.querySelector('.aw-ring'); ring.style.width = ring.style.height = L.D + 'px';
    const put = (b, p) => { b.style.left = p.x + 'px'; b.style.top = p.y + 'px'; b.style.width = b.style.height = p.size + 'px'; };
    L.outer.forEach((p) => put(el.querySelector(`[data-act="${p.kind}"]`), p)); L.inner.forEach((p) => put(el.querySelector(`[data-bub="${p.kind}"]`), p)); put(el.querySelector('.aw-x'), L.center);
    const cur = current(); el.querySelectorAll('.aw-a').forEach((b) => b.setAttribute('aria-pressed', String(b.dataset.act === cur))); return L; }
  function open() { build(); el.hidden = false; layout(); doc.body.classList.add('wheel-open'); }
  function close() { if (!el || el.hidden) return; el.hidden = true; doc.body.classList.remove('wheel-open'); }
  const api = { open, close, toggle() { if (el && !el.hidden) close(); else open(); }, get isOpen() { return !!el && !el.hidden; }, layout: () => (el ? layout() : null),
    // keyboard while open: 1-9 = actions, Esc/G = close. Returns true when the key was used.
    key(k) { if (!api.isOpen) return false; if (k === 'escape' || k === 'g') { close(); return true; }
      const i = '123456789'.indexOf(k); if (i >= 0) { onAction?.(ACTION_ORDER[i]); close(); return true; } return false; } };
  return api; }
