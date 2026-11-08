// Town details sheet. The always-on bar keeps Bones and a short test-splint line.
// Clock, streak, tasks, sound, the news tick, and the splint ledger live here.
const PARK = ['streak-chip', 'clock', 'ev-chip', 'dq-chip', 'rent-chip', 'btn-sound', 'feed-tick', 'grove-ledger'];

export function mountPlaySheet(doc = document) {
  if (!doc?.body || doc.getElementById('play-sheet')) return;
  const hud = doc.getElementById('hud');
  const bones = doc.getElementById('bones-chip');
  const btn = doc.createElement('button');
  btn.id = 'play-details';
  btn.type = 'button';
  btn.className = 'btn alt';
  btn.textContent = 'Town';
  btn.setAttribute('aria-expanded', 'false');
  btn.title = 'Clock, tasks, and the test-splint ledger';
  if (bones?.parentElement) bones.after(btn);
  else hud?.appendChild(btn);
  const sheet = doc.createElement('div');
  sheet.id = 'play-sheet';
  sheet.hidden = true;
  sheet.setAttribute('role', 'dialog');
  sheet.setAttribute('aria-modal', 'true');
  sheet.setAttribute('aria-labelledby', 'play-title');
  sheet.innerHTML = '<div class="ps-card"><div class="ps-head"><b id="play-title" tabindex="-1">Town</b><button type="button" class="btn ghost" id="play-close">Close</button></div><p id="play-test">TEST SPLINTS are a local preview. Not Bones. Not $KIBBLE. Not a live rule.</p><div id="play-body"></div></div>';
  doc.body.appendChild(sheet);
  const unlock = () => {
    if (doc.body.classList.contains('drawer-open') || doc.body.classList.contains('notices-open') || doc.body.classList.contains('chat-focus')) return;
    doc.body.classList.remove('ctrl-lock');
  };
  const open = (v) => {
    sheet.hidden = !v;
    btn.setAttribute('aria-expanded', String(!!v));
    doc.body.classList.toggle('play-sheet-open', !!v);
    if (v) {
      const log = doc.getElementById('notice-log');
      if (log && !log.hidden) doc.getElementById('notice-toggle')?.click();
      const dr = doc.getElementById('drawer');
      if (dr && !dr.hidden) doc.getElementById('menu-btn')?.click();
      doc.body.classList.add('ctrl-lock');
      sheet.querySelector('#play-title')?.focus();
    } else unlock();
  };
  btn.addEventListener('click', () => open(sheet.hidden));
  sheet.querySelector('#play-close').addEventListener('click', () => open(false));
  sheet.addEventListener('click', (e) => { if (e.target === sheet) open(false); });
  doc.addEventListener('keydown', (e) => {
    if (sheet.hidden || e.key !== 'Escape') return;
    open(false);
    e.stopPropagation();
    btn.focus();
  }, true);
  parkDetails(doc);
}

export function parkDetails(doc = document) {
  const body = doc.getElementById('play-body');
  const hud = doc.getElementById('hud');
  if (!body) return;
  for (const id of PARK) {
    const el = doc.getElementById(id);
    if (el && el.parentElement !== body) body.appendChild(el);
  }
  const strip = doc.getElementById('grove-strip');
  if (strip && hud && strip.parentElement !== hud) hud.appendChild(strip);
  const tray = doc.getElementById('notice-tray');
  if (tray && hud && tray.parentElement !== hud) hud.appendChild(tray);
}

export function closePlaySheet(doc = document) {
  if (doc.getElementById('play-sheet')?.hidden === false) doc.getElementById('play-close')?.click();
}
