// Quest onboarding UI: place-learn card (mascot teaches you) + Verse Quests progress panel.
import * as OB from './onboard.js';
import { OUTFITS } from './outfits.js';
import { drawShiba, artKey } from './art.js';
import { placeById, stepPlace } from './guide.js';

const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const el = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };

// h: { state(), toast, persist, hud, saveProfile, setGuide(placeObj), openPanel }
export function createOnboardUi(h) {
  const U = { card: null, pending: null };
  const card = el(`<div id="obcard" hidden>
    <canvas id="ob-npc" width="72" height="72"></canvas>
    <div class="ob-body"><div class="ob-name"></div><b class="ob-title"></b><div class="ob-text"></div>
      <div class="ob-row"><span class="ob-reward"></span><span class="ob-sp"></span>
        <button class="btn ghost" id="ob-later">Later</button>
        <button class="btn" id="ob-gotit">Got it</button>
      </div>
      <div class="ob-note">placeholder mascot · Inu Art Studio later</div>
    </div></div>`);
  document.body.appendChild(card);
  const $ = (s) => card.querySelector(s);
  const npc = $('#ob-npc').getContext('2d');
  let npcT = 0, coat = 'cream';

  function drawNpc(dt) {
    if (card.hidden) return;
    npcT += dt; npc.imageSmoothingEnabled = false; npc.clearRect(0, 0, 72, 72);
    try { drawShiba(npc, 36, 58, { coat, art: artKey(coat), face: 'down', phase: npcT * 6, moving: Math.floor(npcT * 2) % 3 === 0, scale: 1.25, shadow: false }); } catch {}
  }

  function hide() { card.hidden = true; U.pending = null; document.body.classList.remove('onboarding'); }
  function show(q) {
    if (!q) return; U.pending = q; coat = q.mascot?.coat || 'cream';
    $('.ob-name').textContent = `${q.mascot?.name || 'Guide'} · ${q.title}`;
    $('.ob-title').textContent = `Learn: ${q.title}`;
    $('.ob-text').textContent = q.learn;
    const cos = q.cosmetic && OUTFITS[q.cosmetic] ? ` · +${OUTFITS[q.cosmetic].name}` : '';
    $('.ob-reward').textContent = `+${q.bones} Bones${cos}`;
    $('#ob-gotit').textContent = `Got it · +${q.bones} Bones`;
    card.hidden = false; document.body.classList.add('onboarding');
  }

  $('#ob-later').onclick = () => hide();
  $('#ob-gotit').onclick = () => {
    const s = h.state(); const q = U.pending; if (!s || !q) return hide();
    const r = OB.completePlace(s, q.place);
    hide();
    if (!r.ok) { h.toast(r.reason || 'Already done', ''); return; }
    h.persist?.(); h.hud?.(); h.saveProfile?.();
    let msg = `${q.mascot?.name || 'Guide'} onboarded you at ${q.title} · +${r.bones} Bones`;
    if (r.cosmetics?.length) msg += ` · ${r.cosmetics.map((id) => OUTFITS[id]?.name || id).join(', ')}`;
    h.toast(msg, 'good');
    for (const m of r.milestones || []) h.toast(m.toast || `Milestone: +${m.bones} Bones`, 'good');
    const next = OB.nextQuest(s);
    if (next && h.setGuide) {
      const p = next.place === 'home' ? stepPlace(s, { place: 'home' }) : placeById(s, next.place);
      if (p) setTimeout(() => h.setGuide(p), 700);
    } else if (OB.allDone(s)) h.toast('Verse place onboarding complete! Mascots stay at each place you learned.', 'good');
  };

  /** Offer the learn card when the player opens a place they have not finished. */
  function offer(place) {
    const s = h.state(); if (!s || !place) return false;
    OB.ensureOnboard(s);
    if (OB.isPlaceDone(s, place)) return false;
    if (U.pending && U.pending.place === place) return true;
    const q = OB.questByPlace(place); if (!q) return false;
    show(q); return true;
  }

  function renderPanel(body) {
    const s = h.state(); if (!s || !body) return;
    OB.ensureOnboard(s);
    const p = OB.progress(s);
    const rows = OB.PLACE_QUESTS.map((q) => {
      const done = !!s.onboard.done[q.id];
      const cos = q.cosmetic && OUTFITS[q.cosmetic] ? ` · ${OUTFITS[q.cosmetic].name}` : '';
      return `<button class="ob-item${done ? ' done' : ''}" data-ob="${esc(q.place)}">
        <b>${done ? '✓ ' : ''}${esc(q.title)}</b>
        <small>${done ? 'Onboarded · ' + esc(q.mascot.name) + ' is here' : '+' + q.bones + ' Bones' + cos}</small>
      </button>`;
    }).join('');
    const miles = OB.MILESTONES.map((m) => {
      const got = !!s.onboard.milestones[m.id];
      const cos = m.cosmetic && OUTFITS[m.cosmetic] ? OUTFITS[m.cosmetic].name : '';
      return `<li class="${got ? 'done' : ''}">${got ? '✓' : '○'} ${m.need}/${OB.PLACE_QUESTS.length} places · +${m.bones} Bones${cos ? ' · ' + cos : ''}</li>`;
    }).join('');
    body.innerHTML = `<h2>Verse Quests</h2>
      <p class="sub">Visit places, learn what they do, earn Bones. Optional cosmetics are inventory-only and never sold. Per-place mascots (placeholders for Inu Art Studio) stay once you finish that stop.</p>
      <div class="ob-progress"><b>${p.done} / ${p.total}</b> places · <b>${p.bonesEarned}</b> Bones from onboarding</div>
      <div class="ob-grid">${rows}</div>
      <h3>Milestones</h3><ul class="ob-miles">${miles}</ul>
      <p class="sub">Champion rule: quest cosmetics stay in your wardrobe — they are never sold in any shop.</p>`;
    body.querySelectorAll('[data-ob]').forEach((b) => b.onclick = () => {
      const place = b.dataset.ob; const s2 = h.state();
      const target = place === 'home' ? stepPlace(s2, { place: 'home' }) : placeById(s2, place);
      if (target && h.setGuide) h.setGuide(target);
      if (!OB.isPlaceDone(s2, place)) offer(place);
      h.closePanel?.();
    });
  }

  return Object.assign(U, { offer, hide, show, renderPanel, drawNpc, get open() { return !card.hidden; } });
}
