// Measured control-safe bounds. The art spec's 168/170px columns are untested starting
// values and are not used. Stick, A, and emote rectangles set the insets; the HUD's
// own bottom sets the shared top extent for notices, the tour, and the menu.
function box(el) {
  if (!el || el.hidden) return null;
  const r = el.getBoundingClientRect();
  if (r.width < 2 || r.height < 2) return null;
  return r;
}

export function layoutSafe(doc = document, win = doc.defaultView || globalThis) {
  const body = doc.body;
  const root = doc.documentElement;
  if (!body || !root) return null;
  const portrait = body.classList.contains('inworld') && (win.innerWidth || 0) <= 520 && (win.innerHeight || 0) > (win.innerWidth || 0);
  body.classList.toggle('hud-two', portrait);
  const hud = doc.getElementById('hud');
  const stick = box(doc.getElementById('stick'));
  const a = box(doc.getElementById('btn-a'));
  const emo = box(doc.getElementById('btn-emo'));
  const legal = box(doc.getElementById('inu-legal'));
  const vh = win.innerHeight || 0;
  const vw = win.innerWidth || 0;
  let bottom = 8;
  let left = 8;
  let right = 8;
  if (portrait) {
    const tops = [stick, a, emo].filter(Boolean).map((r) => r.top);
    bottom = tops.length ? Math.ceil(vh - Math.min(...tops) + 8) : 150;
  } else if (body.classList.contains('inworld') && (stick || a || emo)) {
    left = stick ? Math.ceil(stick.right + 8) : 8;
    const edges = [a, emo].filter(Boolean).map((r) => r.left);
    right = edges.length ? Math.ceil(vw - Math.min(...edges) + 8) : 8;
    bottom = legal ? Math.max(8, Math.ceil(vh - legal.top + 6)) : 8;
  }
  const extent = hud && body.classList.contains('inworld') && !hud.hidden
    ? Math.ceil(hud.getBoundingClientRect().bottom + 8)
    : 56;
  root.style.setProperty('--iv-hud-extent', extent + 'px');
  root.style.setProperty('--iv-ctrl-bottom', bottom + 'px');
  root.style.setProperty('--iv-ctrl-left', left + 'px');
  root.style.setProperty('--iv-ctrl-right', right + 'px');
  return { portrait, bottom, left, right, extent, center: Math.round(vw - left - right) };
}
