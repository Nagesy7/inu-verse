// Good Boy Academy board UI: Lesson · Quiz · Practice (stub) · Pup Report Card.
import * as A from './academy.js';
import { drawInuAvatarHi as drawInuAvatar } from './art.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);

function thumb(look, id) {
  setTimeout(() => {
    const c = document.getElementById(id); if (!c) return;
    const x = c.getContext('2d'); x.clearRect(0, 0, 48, 56);
    drawInuAvatar(x, { look: look || { coat: '#e8a25a' } }, 24, 52, { scale: 1.2, shadow: false });
  }, 0);
  return `<canvas id="${id}" width="48" height="56" aria-hidden="true"></canvas>`;
}

/** ctx: { state, body, toast, hud, persist, open(tab), now? } */
export function renderAcademy(ctx) {
  const s = ctx.state, now = ctx.now || Date.now();
  A.ensureAcademy(s);
  const tab = ctx.tab || 'lesson';
  const sum = A.boardSummary(s, now);
  const tabs = [
    ['lesson', 'Lesson of the Day'],
    ['quiz', 'Quiz'],
    ['practice', 'Practice Launch'],
    ['report', 'Pup Report Card'],
  ];
  let html = `<h2>Good Boy Academy</h2>
    <p class="sub">Dean Barkley’s classroom · trading vocab for pups</p>
    <p class="acad-disc" role="note">${esc(A.DISCLAIMER)}</p>
    <div class="ctabs">${tabs.map(([k, n]) => `<button type="button" class="ctab ${k === tab ? 'sel' : ''}" data-atab="${k}">${n}</button>`).join('')}</div>`;

  if (tab === 'lesson') {
    const L = sum.lesson;
    html += `<div class="card acad-lesson">
      <b>${esc(L.title)}</b>
      <p>${esc(L.body)}</p>
      <p class="small">Sydney day <b>${esc(sum.day)}</b> · first clear ≈ <b>${sum.lessonBones}</b> Bones (outfit bonus applies)</p>
      ${sum.lessonCleared
        ? `<p class="small">✓ Cleared — Bones already banked for this lesson.</p>`
        : `<button type="button" class="btn green" data-act="clear-lesson">Mark lesson clear · earn Bones</button>`}
    </div>`;
  }

  if (tab === 'quiz') {
    const Q = sum.quiz;
    html += `<p class="sub">Five cards rotate each Sydney day. <b>3-strike day cap</b> — ${Q.strikesLeft} strike${Q.strikesLeft === 1 ? '' : 's'} left.
      Progress <b>${Q.correctCount}/${Q.total}</b>${Q.doneToday ? ' · cleared today!' : ''}${Q.locked ? ' · locked until tomorrow' : ''}.
      Quiz streak: <b>${Q.streak.count || 0}</b>${Q.streak.pin ? ' · streak pin earned' : ' · pin at 3 days'}.</p>`;
    if (Q.locked) html += `<p class="small">Three strikes used. Stretch those paws and come back next Sydney day.</p>`;
    html += `<div class="grid">`;
    for (const c of Q.cards) {
      const got = !!s.academy.quiz.correct[c.id];
      html += `<div class="card" data-qid="${esc(c.id)}"><b>${esc(c.topic)}</b><p>${esc(c.q)}</p>`;
      if (got) html += `<p class="small">✓ Correct — ${esc(c.explain)}</p>`;
      else if (Q.locked || Q.doneToday) html += `<p class="small">${Q.doneToday ? 'Daily set done.' : 'Locked.'}</p>`;
      else {
        html += c.choices.map((ch, i) =>
          `<button type="button" class="btn alt acad-choice" data-act="ans:${c.id}:${i}">${esc(ch)}</button>`).join('');
      }
      html += `</div>`;
    }
    html += `</div>`;
  }

  if (tab === 'practice') {
    html += `<div class="card">
      <b>Practice Launch sandbox</b>
      <p>Phase 1b will add a local sandbox (name / symbol / pair / dev-buy) with a <b>fake</b> curve chart and <b>no</b> <code>/api/launch</code> chain tx.</p>
      <p class="small">Coming next — button stub only for Phase 1.</p>
      <button type="button" class="btn ghost" data-act="practice-stub" disabled title="Coming next">Practice Launch · coming next</button>
    </div>`;
  }

  if (tab === 'report') {
    const R = sum.report;
    html += `<p class="sub">Your breed pups as classmates (flavour only · max ${R.max}). Cleared lessons: <b>${R.clearedLessons}</b> · Academy Bones: <b>${R.bonesEarned}</b>.</p>
      <div class="grid">`;
    if (!R.classmates.length) {
      html += `<p class="small">No pups yet — visit the Park Matchmaker when you’re ready. Empty desks today.</p>`;
    } else {
      R.classmates.forEach((pu, i) => {
        html += `<div class="card">${thumb(pu.look, 'acad-pup-' + i)}<b>${esc(pu.name)}</b>
          <small>${pu.rare ? '★ ' + esc(pu.rare) : 'classmate'} · ${esc((pu.parents || []).join(' + ') || 'pack pup')}</small></div>`;
      });
    }
    html += `</div>`;
    if (R.quizPin) html += `<p class="small">★ Daily Quiz Streak pin unlocked (cosmetic flavour).</p>`;
  }

  ctx.body.innerHTML = html;
  ctx.body.onclick = (e) => {
    const t = e.target.closest('[data-atab]');
    if (t) return ctx.open(t.dataset.atab);
    const b = e.target.closest('[data-act]');
    if (!b || b.disabled) return;
    const act = b.dataset.act;
    if (act === 'clear-lesson') {
      const r = A.clearLesson(s, sum.lesson.id, now);
      if (!r.ok) return ctx.toast(r.reason || 'Not now', 'bad');
      ctx.toast(`Lesson clear! +${r.bones.total} Bones${r.bones.bonus ? ` (incl. +${r.bones.bonus} outfit)` : ''}`, 'good');
      ctx.hud(); ctx.persist(); return ctx.open('lesson');
    }
    if (act.startsWith('ans:')) {
      const [, id, idx] = act.split(':');
      const r = A.answerQuiz(s, id, Number(idx), now);
      if (!r.ok) return ctx.toast(r.reason || 'Not now', 'bad');
      if (r.correct) {
        let msg = 'Correct! ' + (r.explain || '');
        if (r.cleared) msg = `Daily quiz cleared!${r.bones ? ' +' + r.bones.total + ' Bones' : ''}`;
        if (r.pin) msg += ' ★ Quiz streak pin!';
        ctx.toast(msg, 'good');
      } else {
        ctx.toast(`Not quite. ${r.explain || ''} (${r.strikes}/${A.QUIZ_STRIKE_CAP} strikes)`, r.locked ? 'bad' : '');
      }
      ctx.hud(); ctx.persist(); return ctx.open('quiz');
    }
    if (act === 'practice-stub') ctx.toast('Practice Launch sandbox lands in Phase 1b.', '');
  };
}
