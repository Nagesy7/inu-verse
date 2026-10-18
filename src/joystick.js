// Optional "Joystick controls" (Settings in the ☰ menu, OFF by default). OFF = exactly the old behaviour: phones (coarse
// pointer) keep the original on-screen stick + A/B, desktops have none. ON = a compact, semi-transparent left-thumb stick with a
// dead zone and compact A/B on the right, on any device, kept in the bottom corners (clear of the centre of the screen where the
// pup, prompts and chat are). Pointer events with per-pointer tracking, so moving and pressing A work at the same time.
// It drives the same `touch` input the old stick uses (keyboard-equivalent movement, sprint at the edge) and the same A/B handlers.
export const JOY_KEY = 'inuverse.joystick';
export const JOY = { R: 46, DEAD: 0.18, AXIS: 0.38, RUN: 0.92 };
export function joyVector(dx, dy, R = JOY.R) { const d = Math.hypot(dx, dy); if (d > R) { dx *= R / d; dy *= R / d; } const m = Math.min(1, d / R);
  if (m < JOY.DEAD) return { x: 0, y: 0, mag: m, kx: dx, ky: dy }; let x = dx / (m * R), y = dy / (m * R); if (Math.abs(x) < JOY.AXIS) x = 0; if (Math.abs(y) < JOY.AXIS) y = 0;
  return { x, y, mag: m, kx: dx, ky: dy }; }
export const joyPref = (state, ls = globalThis.localStorage) => { if (typeof state?.settings?.joystick === 'boolean') return state.settings.joystick; try { return ls?.getItem(JOY_KEY) === '1'; } catch { return false; } };
const CSS = `#joy2{display:none;position:fixed;inset:0;pointer-events:none;z-index:9}body.joy-on #joy2{display:block}body.joy-on #touch{display:none!important}
body:not(.inworld) #joy2,body.drawer-open #joy2,body.building #joy2{display:none!important}
#joy2-pad{position:absolute;left:calc(max(10px,env(safe-area-inset-left)) + 6px);bottom:calc(max(10px,env(safe-area-inset-bottom)) + 22px);width:${JOY.R * 2}px;height:${JOY.R * 2}px;border-radius:50%;
 background:radial-gradient(circle,#24305c55 58%,#121a3677 60%);border:2px solid #d4a64099;pointer-events:auto;touch-action:none;opacity:.55;transition:opacity .15s}
#joy2-pad.on{opacity:.9;border-color:#f2cc68}#joy2-knob{position:absolute;left:${JOY.R - 18}px;top:${JOY.R - 18}px;width:36px;height:36px;border-radius:50%;background:#d4a640cc;border:2px solid #141a2e;pointer-events:none}
#joy2-btns{position:absolute;right:calc(max(10px,env(safe-area-inset-right)) + 6px);bottom:calc(max(10px,env(safe-area-inset-bottom)) + 22px);width:112px;height:92px;pointer-events:none}
#joy2 .jb{position:absolute;pointer-events:auto;touch-action:none;border-radius:50%;border:2px solid #141a2e;font:inherit;font-size:16px;width:52px;height:52px;opacity:.6;color:#141a2e}
#joy2 .jb:active,#joy2 .jb.on{opacity:.95;transform:scale(.94)}#joy2-a{right:0;top:0;background:#d4a640}#joy2-b{right:58px;top:40px;background:#c8323c;color:#fff6e0}`;
export function createJoystick({ doc = globalThis.document, touch, onA = () => {}, onB = () => {}, onStart = () => {}, runTap = () => false, setRun = () => {} } = {}) {
  if (!doc?.createElement) return { set() {}, get on() { return false; } };
  const st = doc.createElement('style'); st.textContent = CSS; doc.head.appendChild(st);
  const root = doc.createElement('div'); root.id = 'joy2'; root.setAttribute('aria-hidden', 'true');
  root.innerHTML = '<div id="joy2-pad"><div id="joy2-knob"></div></div><div id="joy2-btns"><button id="joy2-b" class="jb" aria-label="B (bork)">B</button><button id="joy2-a" class="jb" aria-label="A (use)">A</button></div>';
  doc.body.appendChild(root); const pad = root.querySelector('#joy2-pad'), knob = root.querySelector('#joy2-knob'); let pid = null, on = false, tapRun = false;
  const upd = (e) => { const r = pad.getBoundingClientRect(), v = joyVector(e.clientX - (r.left + r.width / 2), e.clientY - (r.top + r.height / 2));
    knob.style.transform = `translate(${v.kx}px,${v.ky}px)`; touch.x = v.x; touch.y = v.y; touch.mag = v.mag; setRun(v.mag >= JOY.RUN || tapRun); };
  const end = (e) => { if (e.pointerId !== pid) return; pid = null; touch.id = null; touch.x = touch.y = 0; touch.mag = 0; setRun(false); knob.style.transform = ''; pad.classList.remove('on'); };
  pad.addEventListener('pointerdown', (e) => { e.preventDefault(); onStart(); pid = e.pointerId; touch.id = e.pointerId; try { pad.setPointerCapture(e.pointerId); } catch {} pad.classList.add('on'); tapRun = !!runTap(); upd(e); });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === pid) upd(e); }); pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end);
  for (const [id, fn] of [['#joy2-a', onA], ['#joy2-b', onB]]) { const b = root.querySelector(id); b.addEventListener('pointerdown', (e) => { e.preventDefault(); e.stopPropagation(); onStart(); b.classList.add('on'); fn(); });
    const off = () => b.classList.remove('on'); b.addEventListener('pointerup', off); b.addEventListener('pointercancel', off); b.addEventListener('pointerleave', off); }
  return { get on() { return on; }, set(v) { on = !!v; doc.body.classList.toggle('joy-on', on); if (!on && pid != null) end({ pointerId: pid }); } };
}
