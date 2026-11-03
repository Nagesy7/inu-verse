// Bluetooth / USB controller support (PlayStation + Xbox style pads) via the browser Gamepad API.
// - polled from the main game loop ONLY while a pad is connected; no per-frame allocation (typed arrays, reused objects)
// - world: left stick (radial deadzone, rescaled) + D-pad walk; A/✕ = interact (same as E / the on-screen A);
//   B/○ = back/close (or Bork in the open world, like the on-screen B); X/□ = action wheel; Y/△ = chat; Start/Options = menu
// - menus / modals: a generic focus manager walks the focusable controls of whatever overlay is on top
//   (spatial D-pad/stick navigation + visible highlight, A activates, B closes); no per-menu rewrites
// - hint glyphs (✕ ○ □ △ vs A B X Y) show while a pad is the last input used; keyboard / touch switch them back
// Plain-text glyphs only: no console logos or artwork.

// ---- logical buttons (W3C "standard" mapping indices) ----
export const BTN = { A: 0, B: 1, X: 2, Y: 3, LB: 4, RB: 5, LT: 6, RT: 7, SELECT: 8, START: 9, L3: 10, R3: 11, UP: 12, DOWN: 13, LEFT: 14, RIGHT: 15, HOME: 16 };
export const NBTN = 17;
export const DEADZONE = 0.2;

// Radial deadzone, rescaled so output magnitude runs 0..1 smoothly from the edge of the deadzone. Writes into `out` (no alloc).
export function radialDeadzone(x, y, dz = DEADZONE, out = { x: 0, y: 0, mag: 0 }) {
  x = +x || 0; y = +y || 0; const m = Math.hypot(x, y);
  if (m <= dz) { out.x = 0; out.y = 0; out.mag = 0; return out; }
  const mag = Math.min(1, (m - dz) / (1 - dz)), k = mag / m;
  out.x = x * k; out.y = y * k; out.mag = mag; return out;
}

// Which family of pad is this? (by Gamepad.id: vendor id 054c = Sony, 045e = Microsoft)
export function padKind(id = '') {
  const s = String(id).toLowerCase();
  if (/xbox|045e|xinput|x-box/.test(s)) return 'xbox'; // first: 'Xbox Wireless Controller' also says 'wireless controller'
  if (/dualsense|dualshock|wireless controller|054c|playstation|ps[345] controller/.test(s)) return 'ps';
  return 'generic';
}
const GLYPHS = {
  ps: { a: '✕', b: '○', x: '□', y: '△', start: 'OPTIONS', select: 'SHARE', lb: 'L1', rb: 'R1', rt: 'R2', name: 'PlayStation controller' },
  xbox: { a: 'A', b: 'B', x: 'X', y: 'Y', start: '☰', select: '⧉', lb: 'LB', rb: 'RB', rt: 'RT', name: 'Xbox controller' },
  generic: { a: 'A', b: 'B', x: 'X', y: 'Y', start: 'START', select: 'SELECT', lb: 'LB', rb: 'RB', rt: 'RT', name: 'Controller' },
};
export const glyphsFor = (kind) => GLYPHS[kind] || GLYPHS.generic;
export const connectMsg = (kind) => { const g = glyphsFor(kind); return `🎮 ${g.name} connected · ${g.a} select · ${g.b} back · ${g.start} menu`; };

// Button edge detection over a flat Uint8Array (slot * NBTN + button). Returns 1 = pressed this frame, -1 = released, 0 = no change.
export function makeEdges(slots = 4) {
  const prev = new Uint8Array(slots * NBTN);
  return { prev, step(slot, b, down) { const i = slot * NBTN + b, was = prev[i], now = down ? 1 : 0; prev[i] = now; return now === was ? 0 : now ? 1 : -1; },
    clear(slot) { prev.fill(0, slot * NBTN, slot * NBTN + NBTN); } };
}

// Read one logical button from a pad, standard mapping or the common non-standard fallback (dpad on axes 6/7 or a POV hat on axis 9).
export function readButton(pad, b) {
  const x = pad.buttons[b];
  if (x && (typeof x === 'object' ? (x.pressed || x.value > 0.5) : x > 0.5)) return true;
  if (pad.mapping === 'standard' || b < BTN.UP || b > BTN.RIGHT) return false;
  const ax = pad.axes; // non-standard pads: D-pad on axes 6/7, or a POV hat on axis 9 (-1 = up, clockwise in 2/7 steps, idle > 1)
  if (ax.length > 7) { const h = b === BTN.LEFT ? -ax[6] : b === BTN.RIGHT ? ax[6] : b === BTN.UP ? -ax[7] : ax[7]; if (h > 0.5) return true; }
  if (ax.length > 9) { const v = ax[9]; if (v >= -1.05 && v <= 1.05 && Math.abs(v) > 0.1) { const d = Math.round((v + 1) * 3.5) % 8; // 0 up,1 ur,2 r,3 dr,4 d,5 dl,6 l,7 ul
      if (b === BTN.UP) return d === 7 || d === 0 || d === 1; if (b === BTN.RIGHT) return d >= 1 && d <= 3; if (b === BTN.DOWN) return d >= 3 && d <= 5; return d >= 5 && d <= 7; } }
  return false;
}

// ---- spatial focus navigation (pure): rects = [{x,y,w,h}], cur = index or -1, dir = 'up'|'down'|'left'|'right' -> next index ----
export function nextFocus(rects, cur, dir) {
  const n = rects.length; if (!n) return -1; if (cur < 0 || cur >= n) return 0;
  const c = rects[cur], cx = c.x + c.w / 2, cy = c.y + c.h / 2, vx = dir === 'left' ? -1 : dir === 'right' ? 1 : 0, vy = dir === 'up' ? -1 : dir === 'down' ? 1 : 0;
  let best = -1, bs = Infinity;
  for (let i = 0; i < n; i++) { if (i === cur) continue; const r = rects[i], dx = r.x + r.w / 2 - cx, dy = r.y + r.h / 2 - cy;
    const along = dx * vx + dy * vy; if (along <= 1) continue; // must lie in that direction
    const across = Math.abs(vx ? dy : dx), overlap = vx ? (r.y < c.y + c.h && r.y + r.h > c.y) : (r.x < c.x + c.w && r.x + r.w > c.x);
    const s = along + across * (overlap ? 0.5 : 2.5); if (s < bs) { bs = s; best = i; } }
  if (best >= 0) return best;
  return (dir === 'down' || dir === 'right') ? (cur + 1) % n : (cur - 1 + n) % n; // nothing that way: step through DOM order (wraps)
}

// ---- runtime ----
const FOCUS_SEL = 'button,a[href],input:not([type=hidden]),select,textarea,[tabindex]:not([tabindex="-1"]),[role=button],[role=tab],[role=switch],[role=option],[data-ft]';
// Modal overlays, topmost first. Anything else with role=dialog / .overlay that is visible counts too.
export const OVERLAYS = ['arcade-ov', 'mg', 'enter-ov', 'drawer', 'act-wheel', 'mapfull', 'places', 'mp-pop', 'panel', 'title'];
const CLOSE_SEL = '#panel-close,#dr-close,#arc-back,#enter-cancel,#mp-x,[data-close],.close,[aria-label^="Close"],[aria-label^="close"]';
const NAV_DELAY = 0.34, NAV_REPEAT = 0.13;
const CSS = `.padfocus{outline:3px solid #7fd3ff!important;outline-offset:2px!important;box-shadow:0 0 0 6px rgba(127,211,255,.35),0 0 14px 4px rgba(127,211,255,.55)!important;position:relative;z-index:1}
#pad-hints{position:fixed;left:50%;bottom:max(6px,env(safe-area-inset-bottom));transform:translateX(-50%);z-index:9600;display:flex;gap:12px;align-items:center;padding:4px 10px;background:rgba(12,16,34,.88);border:2px solid #f2cc68;color:#fff6c8;font:10px/1.2 Silkscreen,monospace;pointer-events:none;white-space:nowrap}
#pad-hints[hidden]{display:none}#pad-hints span{display:flex;align-items:center;gap:4px}
#pad-hints kbd{display:inline-flex;align-items:center;justify-content:center;min-width:18px;height:18px;padding:0 3px;border-radius:9px;background:#f2cc68;color:#141a2e;font:inherit;font-weight:bold}
body.pad-on #prompt kbd.ta{min-width:1.4em;text-align:center}`;

export function createGamepad({ win = globalThis, doc = globalThis.document, hooks = {} } = {}) {
  const nav = win.navigator || {}, edges = makeEdges(4), stick = { x: 0, y: 0, mag: 0 }, last = new Float64Array(4);
  const P = { connected: 0, active: -1, kind: 'generic', mode: 'none', moveX: 0, moveY: 0, moveMag: 0, wrote: false, run: false,
    focusEl: null, overlay: null, navDir: '', navT: 0, scanT: 0, ids: ['', '', '', ''], polls: 0, hintEl: null };
  const H = hooks;
  if (doc?.head && !doc.getElementById('pad-css')) { const st = doc.createElement('style'); st.id = 'pad-css'; st.textContent = CSS; doc.head.appendChild(st); }
  const g = () => glyphsFor(P.kind);
  const isPad = () => P.mode === 'pad' && P.connected > 0;
  function setMode(m) { if (P.mode === m) return; P.mode = m; const b = doc?.body; if (!b) return;
    b.classList.toggle('pad-on', m === 'pad'); b.classList.toggle('pad-ps', m === 'pad' && P.kind === 'ps'); b.classList.toggle('pad-xb', m === 'pad' && P.kind !== 'ps');
    if (m !== 'pad') { clearFocus(); showHints(false); } }
  function setKind(k) { P.kind = k; if (P.mode === 'pad') { P.mode = ''; setMode('pad'); } }

  // ---- hot-plug ----
  function recount() { let n = 0; for (let i = 0; i < 4; i++) if (P.ids[i]) n++; P.connected = n; }
  function onConnect(e) { const gp = e.gamepad; if (!gp) return; const s = gp.index & 3; P.ids[s] = gp.id || 'pad'; edges.clear(s); recount();
    P.active = gp.index; last[s] = (win.performance?.now?.() || 0); setKind(padKind(gp.id)); setMode('pad');
    H.toast?.(connectMsg(P.kind), 'good'); H.onChange?.(); }
  function onDisconnect(e) { const gp = e.gamepad, s = (gp?.index ?? 0) & 3; edges.clear(s); P.ids[s] = ''; recount();
    if (P.active === gp?.index) { P.active = -1; let bt = -1; for (let i = 0; i < 4; i++) if (P.ids[i] && last[i] > bt) { bt = last[i]; P.active = i; } if (P.active >= 0) setKind(padKind(P.ids[P.active])); }
    if (!P.connected) { releaseMove(); setMode('none'); }
    H.toast?.(P.connected ? `🎮 Controller disconnected · ${P.connected} still connected` : '🎮 Controller disconnected', ''); H.onChange?.(); }
  win.addEventListener?.('gamepadconnected', onConnect); win.addEventListener?.('gamepaddisconnected', onDisconnect);
  // keyboard / touch / mouse take the hints back (synthetic events we dispatch ourselves are untrusted, so ignored)
  win.addEventListener?.('keydown', (e) => { if (e.isTrusted && P.mode === 'pad') setMode('kb'); }, true);
  win.addEventListener?.('pointerdown', (e) => { if (e.isTrusted && P.mode === 'pad') setMode(e.pointerType === 'touch' ? 'touch' : 'kb'); }, true);

  // ---- movement hand-off (writes into the shared touch-stick object, only when no finger owns it) ----
  function releaseMove() { P.moveX = P.moveY = P.moveMag = 0; if (P.wrote) { const t = H.touch; if (t && t.id == null) { t.x = 0; t.y = 0; t.mag = 0; } P.wrote = false; } if (P.run) { P.run = false; H.setRun?.(false); } }
  function applyMove() { const t = H.touch; if (!t || t.id != null) return; if (P.moveMag > 0) { t.x = P.moveX; t.y = P.moveY; t.mag = P.moveMag; P.wrote = true; } else if (P.wrote) { t.x = 0; t.y = 0; t.mag = 0; P.wrote = false; } }

  // ---- overlay + focus manager ----
  function vis(el) { if (!el || el.hidden) return false; const r = el.getClientRects?.(); return !!(r && r.length); }
  function topOverlay(full = true) { for (let i = 0; i < OVERLAYS.length; i++) { const el = doc.getElementById(OVERLAYS[i]); if (el && !el.hidden && vis(el)) return el; }
    if (!full) return null; const any = doc.querySelectorAll?.('[role=dialog],.overlay'); if (any) for (let i = any.length - 1; i >= 0; i--) if (vis(any[i])) return any[i]; return null; }
  function focusables(root) { const out = [], seen = new Set(), win2 = doc.defaultView || win;
    const ok = (el) => { if (seen.has(el) || el.disabled || el.closest?.('[hidden]') || el.getAttribute?.('aria-hidden') === 'true') return false; const r = el.getBoundingClientRect(); if (r.width < 2 || r.height < 2) return false;
      const cs = win2.getComputedStyle?.(el); if (cs && (cs.visibility === 'hidden' || cs.display === 'none' || cs.pointerEvents === 'none')) return false; return true; };
    for (const el of root.querySelectorAll(FOCUS_SEL)) if (ok(el)) { seen.add(el); out.push(el); }
    // delegated-click cards: anything whose own cursor is a pointer (and whose parent's isn't)
    if (win2.getComputedStyle) for (const el of root.querySelectorAll('div,li,span,td,canvas,img,label')) { if (seen.has(el)) continue; const cs = win2.getComputedStyle(el); if (cs.cursor !== 'pointer') continue;
      const pc = el.parentElement && win2.getComputedStyle(el.parentElement).cursor; if (pc === 'pointer' && el.parentElement !== root) continue; if (el.querySelector(FOCUS_SEL) && !el.matches('.card,[data-ft],[data-id]')) continue; if (ok(el)) { seen.add(el); out.push(el); } }
    out.sort((a, b) => (a.compareDocumentPosition(b) & 4 ? -1 : 1)); return out; }
  function setFocus(el) { if (P.focusEl === el) return; if (P.focusEl) P.focusEl.classList.remove('padfocus'); P.focusEl = el; if (!el) return;
    el.classList.add('padfocus'); try { if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') el.focus?.({ preventScroll: true }); } catch {} try { el.scrollIntoView?.({ block: 'nearest', inline: 'nearest' }); } catch {} H.onFocus?.(el); }
  function clearFocus() { if (P.focusEl) P.focusEl.classList.remove('padfocus'); P.focusEl = null; }
  const isClose = (el) => el.matches?.(CLOSE_SEL) || /^[×✕x]$/i.test((el.textContent || '').trim());
  function ensureFocus(ov) { if (P.focusEl && P.focusEl.isConnected && ov.contains(P.focusEl) && vis(P.focusEl)) return; const list = focusables(ov); if (!list.length) return clearFocus();
    const a = doc.activeElement; setFocus(a && list.includes(a) && a !== doc.body && !isClose(a) ? a : list.find((e) => !isClose(e)) || list[0]); }
  function move(ov, dir) { const list = focusables(ov); if (!list.length) return; const rects = list.map((e) => { const r = e.getBoundingClientRect(); return { x: r.left, y: r.top, w: r.width, h: r.height }; });
    const i = nextFocus(rects, list.indexOf(P.focusEl), dir); if (i >= 0) { setFocus(list[i]); H.blip?.(); } }
  function activate(el) { if (!el) return; const t = el.tagName;
    if (t === 'INPUT' && /^(text|search|email|number|url|tel|password|)$/i.test(el.type || '') || t === 'TEXTAREA') { el.focus(); return; }
    if (t === 'SELECT') { el.selectedIndex = (el.selectedIndex + 1) % Math.max(1, el.options.length); el.dispatchEvent(new Event('change', { bubbles: true })); return; }
    el.click(); }
  function key(k, target) { const t = target || doc.activeElement || doc.body, o = { key: k, bubbles: true, cancelable: true };
    t.dispatchEvent(new KeyboardEvent('keydown', o)); t.dispatchEvent(new KeyboardEvent('keyup', o)); }
  function closeOverlay(ov) { if (ov.id === 'title') return false; const c = ov.querySelector(CLOSE_SEL); if (c && vis(c)) { c.click(); return true; } key('Escape'); return true; }
  function showHints(on, ov) { let h = P.hintEl; if (!on) { if (h) h.hidden = true; return; }
    if (!h) { h = P.hintEl = doc.createElement('div'); h.id = 'pad-hints'; h.setAttribute('aria-hidden', 'true'); doc.body.appendChild(h); }
    const gl = g(), txt = `<span><kbd>${gl.a}</kbd>Select</span>${ov && ov.id === 'title' ? '' : `<span><kbd>${gl.b}</kbd>Back</span>`}<span><kbd>✥</kbd>Move</span>`; if (h._t !== txt) { h.innerHTML = txt; h._t = txt; } h.hidden = false; }

  // ---- per-frame poll (called from the game loop; returns immediately with no pad) ----
  function poll(dt = 1 / 60) {
    if (!P.connected || !nav.getGamepads) return false;
    const pads = nav.getGamepads(); P.polls++;
    const now = win.performance?.now?.() || 0;
    // most-recently-active pad wins
    for (let i = 0; i < pads.length && i < 4; i++) { const p = pads[i]; if (!p) continue; if (!P.ids[i]) { P.ids[i] = p.id || 'pad'; recount(); }
      let busy = false; for (let b = 0; b < 4 && !busy; b++) if (readButton(p, b)) busy = true; if (!busy && (p.axes[0] * p.axes[0] + p.axes[1] * p.axes[1] > DEADZONE * DEADZONE)) busy = true;
      if (!busy) { for (let b = 4; b < NBTN && !busy; b++) if (readButton(p, b)) busy = true; }
      if (busy) { last[i] = now; if (P.active !== i) { P.active = i; const k = padKind(p.id); if (k !== P.kind) setKind(k); } } }
    const pad = P.active >= 0 ? pads[P.active] : null; if (!pad) { for (let i = 0; i < pads.length; i++) if (pads[i]) { P.active = i; break; } return false; }
    const s = P.active & 3;
    radialDeadzone(pad.axes[0] || 0, pad.axes[1] || 0, DEADZONE, stick);
    const dl = readButton(pad, BTN.LEFT), dr = readButton(pad, BTN.RIGHT), du = readButton(pad, BTN.UP), dd = readButton(pad, BTN.DOWN);
    let mx = stick.x, my = stick.y, mm = stick.mag; if (dl || dr || du || dd) { mx = (dr ? 1 : 0) - (dl ? 1 : 0); my = (dd ? 1 : 0) - (du ? 1 : 0); mm = mx || my ? 0.6 : 0; }
    // edges
    const E = edges;
    const eA = E.step(s, BTN.A, readButton(pad, BTN.A)), eB = E.step(s, BTN.B, readButton(pad, BTN.B)), eX = E.step(s, BTN.X, readButton(pad, BTN.X)), eY = E.step(s, BTN.Y, readButton(pad, BTN.Y));
    const eSt = E.step(s, BTN.START, readButton(pad, BTN.START)), eSe = E.step(s, BTN.SELECT, readButton(pad, BTN.SELECT)), eLB = E.step(s, BTN.LB, readButton(pad, BTN.LB)), eRB = E.step(s, BTN.RB, readButton(pad, BTN.RB));
    const rt = readButton(pad, BTN.RT) || readButton(pad, BTN.L3);
    if (eA > 0 || eB > 0 || eX > 0 || eY > 0 || eSt > 0 || eSe > 0 || eLB > 0 || eRB > 0 || mm > 0) { if (P.mode !== 'pad') setMode('pad'); }
    if (P.mode !== 'pad') { if (P.wrote) releaseMove(); return true; }
    const ae = doc.activeElement, typing = ae && (ae.tagName === 'INPUT' || ae.tagName === 'TEXTAREA') && !/^(button|checkbox|radio|range|submit)$/i.test(ae.type || '');
    const ov = topOverlay(eA > 0 || eB > 0 || mm > 0 || P.scanT <= 0); // the full role=dialog sweep only on input / every 0.25 s
    if (ov !== P.overlay) { P.overlay = ov; clearFocus(); P.navDir = ''; }
    // ---- start: main menu ----
    if (eSt > 0) { if (ov && ov.id === 'arcade-ov') { closeOverlay(ov); return true; } const dw = doc.getElementById('drawer');
      if (dw && !dw.hidden) H.menu?.(false); else { if (ov && ov.id !== 'title' && ov.id !== 'mg') closeOverlay(ov); H.menu?.(true); } releaseMove(); return true; }
    if (ov && ov.id === 'arcade-ov') { releaseMove(); return true; } // the embedded game reads the pad itself; Start brings you back
    if (ov && ov.id === 'mg') { // job mini-games: bridge the pad onto their existing keyboard controls
      releaseMove(); const want = mx < -0.4 ? 'ArrowLeft' : mx > 0.4 ? 'ArrowRight' : my < -0.4 ? 'ArrowUp' : my > 0.4 ? 'ArrowDown' : '';
      if (want !== P.navDir) { const o = { bubbles: true, cancelable: true }; if (P.navDir) win.dispatchEvent(new KeyboardEvent('keyup', { ...o, key: P.navDir })); if (want) win.dispatchEvent(new KeyboardEvent('keydown', { ...o, key: want })); P.navDir = want; }
      if (eA > 0) win.dispatchEvent(new KeyboardEvent('keydown', { key: ' ', bubbles: true })); if (eA < 0) win.dispatchEvent(new KeyboardEvent('keyup', { key: ' ', bubbles: true }));
      if (eB > 0) win.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })); return true; }
    if (typing) { // never trap focus in a text field: B (or a D-pad/stick push) leaves it
      releaseMove(); if (eB > 0) { key('Escape', ae); ae.blur?.(); if (ov) ensureFocus(ov); return true; }
      if (!ov) return true; }
    if (ov) { releaseMove(); showHints(true, ov);
      P.scanT -= dt; if (!P.focusEl || P.scanT <= 0) { P.scanT = 0.25; ensureFocus(ov); }
      const dir = mm > 0.45 || (dl || dr || du || dd) ? (Math.abs(mx) > Math.abs(my) ? (mx > 0 ? 'right' : 'left') : (my > 0 ? 'down' : 'up')) : '';
      if (dir && dir !== P.navDir) { P.navDir = dir; P.navT = NAV_DELAY; if (typing) ae.blur?.(); move(ov, dir); } else if (dir) { P.navT -= dt; if (P.navT <= 0) { P.navT = NAV_REPEAT; move(ov, dir); } } else P.navDir = '';
      if (eA > 0) { if (!P.focusEl) ensureFocus(ov); activate(P.focusEl); P.scanT = 0.05; }
      if (eB > 0) { H.uiBack?.(); closeOverlay(ov); }
      if (eLB > 0 || eRB > 0) { const tabs = ov.querySelectorAll('[role=tab],.ctab,.tab,[data-tab]'); if (tabs.length) { let i = -1; for (let k = 0; k < tabs.length; k++) if (tabs[k].classList.contains('on') || tabs[k].classList.contains('active') || tabs[k].getAttribute('aria-selected') === 'true') i = k;
          const n = tabs[(i + (eRB > 0 ? 1 : -1) + tabs.length) % tabs.length]; n.click(); P.scanT = 0.05; } }
      return true; }
    // ---- open world / rooms ----
    if (P.hintEl && !P.hintEl.hidden) showHints(false); if (P.focusEl) clearFocus(); P.navDir = ''; P.scanT -= dt; if (P.scanT <= 0) P.scanT = 0.25;
    P.moveX = mx; P.moveY = my; P.moveMag = rt && mm > 0 ? 1 : mm; applyMove();
    if (rt !== P.run) { P.run = rt; H.setRun?.(rt); }
    if (eA > 0) H.onA?.(); if (eB > 0) H.onB?.(); if (eX > 0) H.onX?.(); if (eY > 0) H.onY?.(); if (eSe > 0) H.onSelect?.(); if (eLB > 0) H.zoom?.(-1); if (eRB > 0) H.zoom?.(1);
    return true; }

  return { poll, P, get connected() { return P.connected; }, get kind() { return P.kind; }, get padMode() { return isPad(); },
    glyph: (b) => (isPad() ? g()[b] : null), glyphs: g, setMode, topOverlay, focusables, _connect: onConnect, _disconnect: onDisconnect };
}
