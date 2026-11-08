// Phone stick shared by the live world and the unpublished yard scene.
// Same dead zone and axis snap the hub pad has always used. No save, no wallet.

export function stickAxes(clientX, clientY, rect) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const R = rect.width / 2 || 1;
  let dx = clientX - cx;
  let dy = clientY - cy;
  const dist = Math.hypot(dx, dy);
  if (dist > R) { dx *= R / dist; dy *= R / dist; }
  const mag = Math.hypot(dx, dy) / R;
  if (mag < 0.22) return { dx, dy, mag, x: 0, y: 0 };
  let x = dx / (mag * R);
  let y = dy / (mag * R);
  if (Math.abs(x) < 0.38) x = 0;
  if (Math.abs(y) < 0.38) y = 0;
  return { dx, dy, mag, x, y };
}

// On-screen walk control is this round stick. A second finger can press A at the same time.
// It is not a D-pad. Releasing, cancelling, or leaving the page clears the vector.
export function bindStick(pad, knob, touch, hooks = {}) {
  if (!pad || !knob) return false;
  let ended = false;
  const reset = () => {
    if (touch.id == null && touch.x === 0 && touch.y === 0 && touch.mag === 0) {
      knob.style.transform = '';
      pad.classList.remove('on');
      return;
    }
    touch.id = null;
    touch.x = touch.y = 0;
    touch.mag = 0;
    knob.style.transform = '';
    pad.classList.remove('on');
    if (!ended) { ended = true; hooks.onEnd?.(); }
  };
  const upd = (e) => {
    const v = stickAxes(e.clientX, e.clientY, pad.getBoundingClientRect());
    knob.style.transform = `translate(${v.dx}px,${v.dy}px)`;
    touch.mag = v.mag;
    touch.x = v.x;
    touch.y = v.y;
  };
  pad.addEventListener('pointerdown', (e) => {
    if (touch.id != null && e.pointerId !== touch.id) return;
    e.preventDefault();
    ended = false;
    hooks.onStart?.();
    touch.id = e.pointerId;
    try { pad.setPointerCapture(e.pointerId); } catch { /* a synthetic press still moves the same vector */ }
    pad.classList.add('on');
    hooks.onDown?.();
    upd(e);
  });
  pad.addEventListener('pointermove', (e) => { if (e.pointerId === touch.id) upd(e); });
  const end = (e) => { if (touch.id == null || e.pointerId !== touch.id) return; reset(); };
  pad.addEventListener('pointerup', end);
  pad.addEventListener('pointercancel', end);
  pad.addEventListener('lostpointercapture', end);
  const doc = pad.ownerDocument;
  const view = doc?.defaultView;
  view?.addEventListener('blur', () => { if (touch.id != null) reset(); });
  doc?.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'hidden' && touch.id != null) reset(); });
  return true;
}
