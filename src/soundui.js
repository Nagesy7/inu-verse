// Alive phase 4: the HUD sound chip (speaker icon right after the clock) + a small popover with mute and
// Music / Ambience / Effects sliders, all persisted by audio.js. ?audiodebug=1 adds a live readout of the active track and beds.
const ICON = (m) => `<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M1.5 5.5h3l4-3.2v11.4l-4-3.2h-3z"/>${m
  ? '<path d="M10.6 5.6l4.4 4.8M15 5.6l-4.4 4.8" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" fill="none"/>'
  : '<path d="M10.6 5.8q1.6 2.2 0 4.4M12.6 3.9q3.2 4.1 0 8.2" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" fill="none"/>'}</svg>`;
export function mountSoundUi(doc, api) {
  const $ = (id) => doc.getElementById(id), clock = $('clock'); if (!clock || $('btn-sound')) return null;
  const btn = doc.createElement('button'); btn.id = 'btn-sound'; btn.className = 'chip sound'; btn.type = 'button'; btn.setAttribute('aria-haspopup', 'dialog'); btn.setAttribute('aria-expanded', 'false');
  clock.after(btn);
  const pop = doc.createElement('div'); pop.id = 'sound-pop'; pop.hidden = true; pop.setAttribute('role', 'dialog'); pop.setAttribute('aria-label', 'Sound');
  pop.innerHTML = '<div class="sp-head"><b>Sound</b><button type="button" class="btn alt" id="sp-mute"></button></div>'
    + [['music', 'Music'], ['amb', 'Ambience'], ['sfx', 'Effects']].map(([k, l]) => `<label class="sp-row"><span>${l}</span><input type="range" min="0" max="100" step="5" data-vol="${k}" aria-label="${l} volume"><em data-pct="${k}"></em></label>`).join('')
    + '<div class="sp-now" id="sp-now"></div>';
  doc.body.appendChild(pop);
  const stop = (e) => e.stopPropagation(); for (const t of ['pointerdown', 'touchstart', 'mousedown', 'keydown', 'wheel']) pop.addEventListener(t, stop);
  const refresh = () => { const s = api.settings(), m = s.muted; btn.innerHTML = ICON(m); btn.classList.toggle('off', m); btn.title = m ? 'Sound off (tap for sound settings)' : 'Sound on (tap for sound settings)'; btn.setAttribute('aria-label', btn.title);
    $('sp-mute').textContent = m ? 'Unmute' : 'Mute'; $('sp-mute').setAttribute('aria-pressed', String(m));
    for (const i of pop.querySelectorAll('[data-vol]')) { const v = Math.round(s[i.dataset.vol] * 100); if (doc.activeElement !== i) i.value = v; pop.querySelector(`[data-pct="${i.dataset.vol}"]`).textContent = v + '%'; }
    const d = api.debug(); $('sp-now').textContent = m ? 'Muted' : d.ctx !== 'running' ? 'Tap anywhere to start sound' : `Now playing: ${d.name}`; api.onChange?.(m); };
  const place = () => { const r = btn.getBoundingClientRect(), w = pop.offsetWidth || 220; pop.style.top = Math.round(r.bottom + 6) + 'px'; pop.style.left = Math.round(Math.max(8, Math.min(r.left, innerWidth - w - 8))) + 'px'; };
  const open = (v) => { pop.hidden = !v; btn.setAttribute('aria-expanded', String(v)); if (v) { refresh(); place(); } };
  btn.onclick = () => { api.init(); open(pop.hidden); };
  $('sp-mute').onclick = () => { api.init(); api.setMuted(!api.settings().muted); refresh(); };
  pop.addEventListener('input', (e) => { const k = e.target.dataset?.vol; if (!k) return; api.init(); api.setVolume(k, e.target.value / 100); refresh(); });
  doc.addEventListener('pointerdown', (e) => { if (!pop.hidden && !pop.contains(e.target) && !btn.contains(e.target)) open(false); });
  doc.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !pop.hidden) { open(false); e.stopPropagation(); } }, true);
  addEventListener('resize', () => { if (!pop.hidden) place(); });
  let dbg = null; if (api.debugOn) { dbg = doc.createElement('pre'); dbg.id = 'audio-debug'; doc.body.appendChild(dbg); }
  let lastTxt = '';
  const tick = () => { if (!pop.hidden) { const d = api.debug(), t = $('sp-now'); const s = api.settings().muted ? 'Muted' : d.ctx !== 'running' ? 'Tap anywhere to start sound' : `Now playing: ${d.name}`; if (t.textContent !== s) t.textContent = s; }
    if (dbg) { const d = api.debug(), txt = `AUDIO ${d.ctx}${d.muted ? ' · MUTED' : ''}${d.low ? ' · low-fx' : ''}\narea ${d.area}${d.indoor ? ' (indoors)' : ''} · ${d.hour}h\ntrack ${d.track} "${d.name}"${d.pending ? ' → ' + d.pending + '…' : ''}\nmix ${d.live.map(([k, v]) => k + ' ' + v).join(' / ') || '-'}\nbeds ${d.beds.map(([k, v]) => k + ' ' + v).join(' · ') || '-'}\nvol music ${d.music} · amb ${d.amb} · sfx ${d.sfx}`;
      if (txt !== lastTxt) { lastTxt = txt; dbg.textContent = txt; } } };
  refresh(); return { refresh, tick, open, btn, pop };
}
