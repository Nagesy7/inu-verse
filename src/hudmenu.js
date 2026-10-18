// Decluttered HUD: only the stick, the A button, a compact status strip and ONE menu button stay on screen.
// Every other control is moved (with its existing handlers) into a single tidy drawer.
export const DRAWER = [
  ['Explore', ['w-guide', 'w-places', 'w-map', 'zoomctl']],
  ['Me', ['btn-wardrobe', 'btn-garage', 'btn-companion', 'btn-pack', 'btn-engage', 'btn-pools']],
  ['Fun', ['btn-emote', 'dr-bork', 'btn-photo']],
  ['Settings', ['btn-mute', 'dr-minimap', 'dr-joy', 'btn-help', 'btn-phantom']],
];
export const KEEP_ON_SCREEN = ['stick', 'btn-a', 'menu-btn']; // + B only while driving (horn), + the prompt near interactables
const STAY_OPEN = new Set(['zin', 'zout', 'btn-mute', 'dr-minimap', 'dr-joy']);
let built = false;
export function buildDrawer(doc = document, { bork, joystick } = {}) {
  if (built && doc.getElementById('drawer')) return doc.getElementById('drawer'); built = true;
  const $ = (id) => doc.getElementById(id), mk = (html) => { const t = doc.createElement('template'); t.innerHTML = html.trim(); return t.content.firstElementChild; };
  const btn = mk('<button id="menu-btn" class="btn" aria-label="Menu" aria-expanded="false" title="Menu (Tab)">&#9776;</button>'); doc.body.appendChild(btn);
  const dr = mk('<div id="drawer" hidden role="dialog" aria-label="Menu"><div class="dr-card"><div class="dr-head"><b>Menu</b><span id="dr-status"></span><button class="btn ghost" id="dr-close" aria-label="Close menu">×</button></div><div class="dr-body"></div></div></div>'); doc.body.appendChild(dr);
  const body = dr.querySelector('.dr-body');
  const extra = { 'dr-bork': mk('<button id="dr-bork" class="btn alt">Bork!</button>'), 'dr-minimap': mk('<button id="dr-minimap" class="btn alt">Minimap: off</button>'), ...(joystick ? { 'dr-joy': mk('<button id="dr-joy" class="btn alt" role="switch" aria-checked="false" title="Optional on-screen joystick + A/B buttons">Joystick controls: off</button>') } : {}) };
  for (const [title, ids] of DRAWER) { const sec = mk(`<section><h4>${title}</h4><div class="dr-grid"></div></section>`), g = sec.querySelector('.dr-grid');
    for (const id of ids) { const el = $(id) || extra[id]; if (el) { el.removeAttribute('style'); el.querySelectorAll('[style]').forEach((c) => c.removeAttribute('style')); g.appendChild(el); } } body.appendChild(sec); }
  const zl = $('zoomctl'); if (zl) zl.classList.add('dr-zoom');
  const st = $('dr-status'); for (const id of ['kibble']) { const c = $(id)?.closest('.chip'); if (c) st.appendChild(c); }
  const open = (v) => { dr.hidden = !v; btn.setAttribute('aria-expanded', String(v)); doc.body.classList.toggle('drawer-open', v); };
  btn.onclick = () => open(dr.hidden); $('dr-close').onclick = () => open(false);
  dr.addEventListener('click', (e) => { if (e.target === dr) return open(false); const b = e.target.closest('button,a'); if (b && !STAY_OPEN.has(b.id) && b.id !== 'dr-close' && b.closest('.dr-grid')) setTimeout(() => open(false), 0); });
  extra['dr-bork'].onclick = () => bork?.();
  const mm = $('minimap-wrap'), key = 'inuverse.minimap', setMM = (v) => { doc.body.classList.toggle('mm-on', v); extra['dr-minimap'].textContent = `Minimap: ${v ? 'on' : 'off'}`; try { localStorage.setItem(key, v ? '1' : '0'); } catch {} };
  let mmOn; try { mmOn = localStorage.getItem(key); } catch {} setMM(mmOn == null ? !matchMedia('(pointer: coarse)').matches : mmOn === '1'); extra['dr-minimap'].onclick = () => setMM(!doc.body.classList.contains('mm-on'));
  if (joystick) { const jb = extra['dr-joy'], show = () => { const v = !!joystick.get(); jb.textContent = `Joystick controls: ${v ? 'on' : 'off'}`; jb.setAttribute('aria-checked', String(v)); };
    jb.onclick = () => { joystick.set(!joystick.get()); show(); }; joystick.onChange = show; show(); }
  doc.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !dr.hidden) { open(false); e.stopPropagation(); } if (e.key === 'Tab' && doc.body.classList.contains('inworld')) { e.preventDefault(); open(dr.hidden); } }, true);
  const old = $('btn-menu'); if (old) old.remove(); const way = $('wayctl'); if (way) way.classList.add('emptied');
  return dr; }
export const drawerOpen = (doc = document) => !doc.getElementById('drawer')?.hidden;
