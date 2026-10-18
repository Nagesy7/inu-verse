// Companion picker panel (Inu Verse UI): shows the Inu Quest party + Wren/Biscuit, summon toggle, graceful empty states.
// The choice is written to the VERSE save only (state.companion via ctx.persist); nothing here touches the Inu Quest save.
import { followable, chosen, choose, ensureChoice, sheetImage, SHEETS } from './companions.js';
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
// why there is nothing to show -> friendly line (never a sign-in prompt from here)
export function emptyLine(status, signedIn) {
  if (status === 'loading') return 'Looking for your Inu Quest party…';
  if (status === 'offline') return 'You are offline. Your Inu Quest companions will be back when you reconnect.';
  if (status === 'error') return 'Inu Quest companions are unavailable right now. Try again in a bit.';
  if (!signedIn) return 'Play Inu Quest and sign in with the same wallet to bring your Inu here.';
  return 'No Inu Quest party found for this wallet yet. Play Inu Quest, save, and come back.';
}
// small portrait canvas (sprite when it loads, a pixel paw placeholder otherwise)
function portrait(c, doc) { const cv = doc.createElement('canvas'); cv.width = 48; cv.height = 48; cv.className = 'cp-face'; const x = cv.getContext('2d'); x.imageSmoothingEnabled = false;
  const paint = () => { x.clearRect(0, 0, 48, 48); const e = sheetImage(c.sheet), S = SHEETS[c.kind];
    if (e.ok) { const s = c.kind === 'inu' ? 1 : c.kind === 'trainer' ? 2 : 3; x.drawImage(e.img, 0, 0, S.fw, S.fh, 24 - (S.fw * s) / 2, 46 - S.fh * s, S.fw * s, S.fh * s); return true; }
    x.fillStyle = c.traits?.coat || '#d8954a'; for (const [px, py, w] of [[18, 26, 12], [12, 16, 6], [20, 12, 6], [28, 12, 6], [34, 16, 6]]) x.fillRect(px, py, w, w); return e.failed; };
  if (!paint()) { let n = 0; const iv = setInterval(() => { if (paint() || ++n > 40) clearInterval(iv); }, 150); } return cv; }
export function renderCompanions(body, ctx, doc = globalThis.document) {
  const { state, getProfile, status, signedIn, persist, toast, onChange } = ctx, prof = getProfile(), ch = ensureChoice(state), cur = chosen(prof, ch), list = prof ? prof.companions : [];
  body.innerHTML = `<h2>Companions</h2><p class="sub">Bring a buddy from your Inu Quest party for a walk. Just for looks: companions don't change anything in either game.</p>
    ${prof ? `<div class="row cp-row"><span class="small" style="margin:0">Trainer <b>${esc(prof.trainer)}</b> · party ${list.filter((c) => c.kind === 'inu').length}/6</span>
      <button class="btn ${ch.on && cur ? 'red' : 'green'}" id="cp-toggle" ${followable(prof).length ? '' : 'disabled'}>${ch.on && cur ? 'Send home' : 'Summon'}</button></div><div class="grid cp-grid" id="cp-grid"></div>`
      : `<div class="cp-empty"><div class="cp-paw"></div><p>${esc(emptyLine(status, signedIn))}</p></div>`}`;
  if (!prof) return;
  const grid = body.querySelector('#cp-grid');
  for (const c of list) { const card = doc.createElement('button'); card.type = 'button'; card.className = 'card cp-card' + (cur?.id === c.id ? ' on' : '') + (c.unlocked ? '' : ' locked'); card.dataset.cp = c.id; card.disabled = !c.unlocked; card.appendChild(portrait(c, doc));
    const sub = c.kind === 'inu' ? `${esc(c.form?.name || '')}${c.level ? ' · Lv ' + c.level : ''}${c.forms.length > 1 ? `<br><small class="cp-line">${c.forms.map((f) => (f.current ? `<b>${esc(f.name)}</b>` : esc(f.name))).join(' › ')}</small>` : ''}` : c.kind === 'trainer' ? 'Trail ranger' : 'Corgi pup';
    card.insertAdjacentHTML('beforeend', `<b>${esc(c.name)}</b><small>${sub}</small>${c.unlocked ? '' : `<small class="cp-hint">🔒 ${esc(c.hint || 'Locked')}</small>`}`); grid.appendChild(card); }
  grid.onclick = (e) => { const b = e.target.closest('[data-cp]'); if (!b || b.disabled) return; const c = list.find((q) => q.id === b.dataset.cp); if (!c?.unlocked) return; choose(state, c); persist(); onChange?.(); toast(`${c.name} is following you!`, 'good'); renderCompanions(body, ctx, doc); };
  body.querySelector('#cp-toggle').onclick = () => { if (ch.on && cur) { ch.on = false; persist(); onChange?.(); toast(`${cur.name} went home for a nap.`, ''); } else { const pick = cur || followable(prof).find((c) => c.id === ch.id) || followable(prof).find((c) => c.id === prof.active) || followable(prof)[0]; if (pick) { choose(state, pick); persist(); onChange?.(); toast(`${pick.name} is following you!`, 'good'); } } renderCompanions(body, ctx, doc); };
}
