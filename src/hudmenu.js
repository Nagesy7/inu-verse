// Decluttered HUD: only the stick, the A button, a compact status strip and ONE menu button stay on screen.
// Every other control is moved (with its existing handlers) into a single tidy drawer.
export const DRAWER = [
  ['Explore', ['w-guide', 'btn-quests', 'btn-daily', 'w-places', 'w-map', 'btn-featured', 'zoomctl']],
  ['Club', ['btn-kennel', 'btn-pups', 'btn-stamps', 'btn-party', 'btn-times']],
  ['Me', ['btn-wardrobe', 'btn-garage', 'btn-companion', 'btn-pack', 'btn-engage', 'btn-fishbook', 'btn-friends', 'btn-pools']],
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
  const dr = mk('<div id="drawer" hidden role="dialog" aria-modal="true" aria-labelledby="dr-title"><div class="dr-card"><div class="dr-head"><b id="dr-title" tabindex="-1">Menu</b><span id="dr-status"></span><button class="btn ghost" id="dr-close" aria-label="Close menu">×</button></div><div id="dr-wallet"></div><div class="dr-body"></div></div></div>'); doc.body.appendChild(dr);
  const body = dr.querySelector('.dr-body');
  const extra = { 'dr-bork': mk('<button id="dr-bork" class="btn alt">Bork!</button>'), 'dr-minimap': mk('<button id="dr-minimap" class="btn alt">Minimap: off</button>'), ...(joystick ? { 'dr-joy': mk('<button id="dr-joy" class="btn alt" role="switch" aria-checked="false" title="Optional on-screen joystick + A/B buttons">Joystick controls: off</button>') } : {}) };
  for (const [title, ids] of DRAWER) { const sec = mk(`<section><h4>${title}</h4><div class="dr-grid"></div></section>`), g = sec.querySelector('.dr-grid');
    for (const id of ids) { const el = $(id) || extra[id]; if (el) { el.removeAttribute('style'); el.querySelectorAll('[style]').forEach((c) => c.removeAttribute('style')); g.appendChild(el); } } body.appendChild(sec); }
  const zl = $('zoomctl'); if (zl) zl.classList.add('dr-zoom');
  const st = $('dr-status'); for (const id of ['kibble']) { const c = $(id)?.closest('.chip'); if (c) st.appendChild(c); }
  const focusable = () => [...dr.querySelectorAll('button, a[href], input, select, textarea, [tabindex]:not([tabindex="-1"])')].filter((el) => !el.disabled && el.getClientRects().length);
  let opener = null;
  const open = (v) => {
    dr.hidden = !v; btn.setAttribute('aria-expanded', String(v)); doc.body.classList.toggle('drawer-open', v);
    if (v) {
      opener = doc.activeElement === btn ? btn : btn;
      const pop = doc.getElementById('sound-pop'); if (pop) pop.hidden = true;
      const log = doc.getElementById('notice-log');
      if (log && !log.hidden) { log.hidden = true; doc.getElementById('notice-toggle')?.setAttribute('aria-expanded', 'false'); doc.body.classList.remove('notices-open'); }
      const mp = doc.getElementById('mp-pop'); if (mp) mp.hidden = true;
      doc.body.classList.remove('chat-focus');
      doc.getElementById('mp-chat')?.classList.remove('focus');
      doc.body.classList.add('ctrl-lock');
      dr.querySelector('#dr-title')?.focus();
    } else {
      if (!doc.body.classList.contains('notices-open') && !doc.body.classList.contains('chat-focus')) doc.body.classList.remove('ctrl-lock');
      try { (opener || btn).focus(); } catch {}
    }
  };
  dr.addEventListener('keydown', (e) => {
    if (dr.hidden || e.key !== 'Tab') return;
    const list = focusable(); if (!list.length) return;
    const i = list.indexOf(doc.activeElement);
    if (e.shiftKey && i <= 0) { e.preventDefault(); list[list.length - 1].focus(); }
    else if (!e.shiftKey && (i < 0 || i === list.length - 1)) { e.preventDefault(); list[0].focus(); }
  });
  btn.onclick = () => open(dr.hidden); $('dr-close').onclick = () => open(false);
  dr.addEventListener('click', (e) => { if (e.target === dr) return open(false); const b = e.target.closest('button,a'); if (b && !STAY_OPEN.has(b.id) && b.id !== 'dr-close' && b.closest('.dr-grid')) setTimeout(() => open(false), 0); });
  extra['dr-bork'].onclick = () => bork?.();
  const mm = $('minimap-wrap'), key = 'inuverse.minimap', setMM = (v) => { doc.body.classList.toggle('mm-on', v); extra['dr-minimap'].textContent = `Minimap: ${v ? 'on' : 'off'}`; try { localStorage.setItem(key, v ? '1' : '0'); } catch {} };
  let mmOn; try { mmOn = localStorage.getItem(key); } catch {} setMM(mmOn == null ? true : mmOn === '1'); extra['dr-minimap'].onclick = () => setMM(!doc.body.classList.contains('mm-on')); // feature batch #3: the minimap fits the phone HUD, so it starts on everywhere (toggle in the menu)
  if (joystick) { const jb = extra['dr-joy'], show = () => { const v = !!joystick.get(); jb.textContent = `Joystick controls: ${v ? 'on' : 'off'}`; jb.setAttribute('aria-checked', String(v)); };
    jb.onclick = () => { joystick.set(!joystick.get()); show(); }; joystick.onChange = show; show(); }
  doc.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !dr.hidden) { open(false); e.stopPropagation(); } if (e.key === 'Tab' && dr.hidden && doc.body.classList.contains('inworld') && !e.target.closest('input,textarea,select')) { e.preventDefault(); open(true); } }, true);
  const old = $('btn-menu'); if (old) old.remove(); const way = $('wayctl'); if (way) way.classList.add('emptied');
  const slot = dr.querySelector('#dr-wallet');
  const parkWallet = () => {
    const w = doc.getElementById('inu-wallet');
    if (!w || !slot) return;
    if (doc.body.classList.contains('inworld')) { if (w.parentElement !== slot) slot.appendChild(w); }
    else if (w.parentElement === slot) doc.body.appendChild(w);
  };
  parkWallet();
  new MutationObserver(parkWallet).observe(doc.body, { childList: true, subtree: true, attributes: true, attributeFilter: ['class'] });
  return dr; }
export const drawerOpen = (doc = document) => !doc.getElementById('drawer')?.hidden;
