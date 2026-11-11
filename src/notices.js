// Phone notice tray. Welcome toasts, the login line, the town crier, and event cards
// (Garden Show and the like) are kept and listed here on a small screen so they do not
// cover the HUD, the tour, or the joystick. Nothing is deleted to hide it.
const COMPACT = '(orientation: portrait) and (max-width: 520px), (orientation: landscape) and (max-height: 500px)';
const KEEP = 20;

function textOf(el) {
  return String(el?.innerText || el?.textContent || '').replace(/\s+/g, ' ').trim();
}

export function mountNotices(doc = document) {
  if (!doc?.body || doc.getElementById('notice-tray')) return () => {};
  const tray = doc.createElement('div');
  tray.id = 'notice-tray';
  tray.hidden = true;
  tray.innerHTML = '<button type="button" id="notice-toggle" aria-expanded="false" aria-label="Notices">Notices <b id="notice-count">0</b></button><div id="notice-log" hidden></div>';
  doc.body.appendChild(tray);
  const log = tray.querySelector('#notice-log');
  const count = tray.querySelector('#notice-count');
  const toggle = tray.querySelector('#notice-toggle');
  toggle.addEventListener('click', () => {
    const open = log.hidden;
    if (open) {
      const dr = doc.getElementById('drawer');
      if (dr && !dr.hidden) doc.getElementById('menu-btn')?.click();
      if (!doc.getElementById('play-sheet')?.hidden) doc.getElementById('play-close')?.click();
      doc.body.classList.remove?.('chat-focus');
    }
    log.hidden = !open;
    toggle.setAttribute('aria-expanded', String(open));
    doc.body.classList.toggle('notices-open', open);
    const locked = open || doc.body.classList.contains('drawer-open') || doc.body.classList.contains('chat-focus') || doc.body.classList.contains('play-sheet-open');
    doc.body.classList.toggle('ctrl-lock', locked);
  });
  const seen = new Set();
  const add = (kind, raw) => {
    const text = String(raw || '').replace(/\s+/g, ' ').trim();
    if (!text) return;
    const key = kind + '|' + text;
    if (seen.has(key)) return;
    seen.add(key);
    const row = doc.createElement('p');
    row.className = 'notice-row';
    row.dataset.kind = kind;
    row.textContent = text;
    log.appendChild(row);
    while (log.children.length > KEEP) log.firstElementChild.remove();
  };
  return function parkNotices() {
    const view = doc.defaultView;
    const w = view?.innerWidth || 0;
    const h = view?.innerHeight || 0;
    const mq = !!view?.matchMedia?.(COMPACT).matches;
    const inworld = doc.body.classList.contains('inworld');
    const portrait = inworld && ((w && h) ? (w <= 520 && h > w) : mq);
    const desktop = inworld && w >= 1000 && h >= 640 && w > h;
    const phone = inworld && (portrait || (w > h && h <= 500) || (!w && mq));
    doc.body.classList.toggle('notice-compact', !!(phone || desktop));
    if (!(phone || desktop)) { tray.hidden = true; return 0; }
    const toast = doc.getElementById('toast');
    if (toast) for (const el of toast.children) add('toast', textOf(el));
    const crier = doc.getElementById('crier-banner');
    if (crier?.classList.contains('show')) add('crier', textOf(crier));
    for (const id of ['ev-banner', 'pres-banner']) {
      const el = doc.getElementById(id);
      if (el && !el.hidden && textOf(el)) add(id, textOf(el));
    }
    const n = log.children.length;
    count.textContent = String(n);
    toggle.setAttribute('aria-label', n ? `Notices ${n}` : 'Notices');
    tray.hidden = n === 0;
    return n;
  };
}
