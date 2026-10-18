// Character creator UI (title screen) + salon re-style panel. Renders choices as pixel chips.
import { OPTIONS, TRAITS, STARTER_OUTFITS, HOMES, PATHS, defaultChoices, lookOf } from './creator.js';
import { drawInuAvatarHi as drawInuAvatar } from './art.js';
import { OUTFITS } from './outfits.js';
import { COAT_NAMES } from './profile.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const ROWS = {
  look: [['coat', 'Coat', OPTIONS.coat, 'sw'], ['pattern', 'Pattern', OPTIONS.pattern], ['markings', 'Markings', OPTIONS.markings], ['eyeShape', 'Eyes', OPTIONS.eyeShape], ['eyeColor', 'Eye colour', OPTIONS.eyeColor, 'sw'], ['ears', 'Ears', OPTIONS.ears], ['tail', 'Tail', OPTIONS.tail], ['size', 'Size', OPTIONS.size]],
  you: [['pronouns', 'Pronouns', OPTIONS.pronouns], ['outfit', 'Starting outfit', Object.keys(STARTER_OUTFITS)], ['trait', 'Personality', Object.keys(TRAITS)]],
  life: [['home', 'Starting home', Object.keys(HOMES)], ['path', 'Starting path (optional)', Object.keys(PATHS)]],
};
const label = (k, v) => k === 'outfit' ? STARTER_OUTFITS[v].name : k === 'trait' ? TRAITS[v].name : k === 'home' ? HOMES[v].name : k === 'path' ? PATHS[v].name : cap(v);
const sub = (k, v) => k === 'trait' ? TRAITS[v].desc : k === 'home' ? HOMES[v].desc : k === 'path' ? PATHS[v].desc : '';
export function profileOfChoices(c) { const eq = {}; for (const id of STARTER_OUTFITS[c.outfit]?.items || []) { const d = OUTFITS[id]; if (d) eq[d.slot] = { id, kind: d.look?.kind, c: d.look?.c || d.look?.frame, d: d.look?.d, accent: d.look?.accent || d.look?.pin, full: !!d.full }; }
  if (c.path === 'worker') eq.hat = { id: 'cap_red', kind: 'cap', c: '#c8282e', d: '#8e1a20' }; return { look: lookOf(c), outfit: eq, name: c.name }; }
// mount into a container; tabs: which tab groups to show (salon = look + pronouns only)
export function mountCreator(root, { choices = defaultChoices(), tabs = ['look', 'you', 'life'], onChange, onPick } = {}) {
  let tab = tabs[0], popped = null; const c = { ...choices };
  const rows = (t) => t === 'you' && !tabs.includes('life') ? ROWS.you.filter((r) => r[0] === 'pronouns') : ROWS[t];
  const draw = () => { root.innerHTML = `<div class="ctabs">${tabs.map((t) => `<button class="ctab ${t === tab ? 'sel' : ''}" data-tab="${t}" aria-pressed="${t === tab}">${{ look: 'Look', you: 'You', life: 'Life' }[t]}</button>`).join('')}</div>
    <div class="crows">${rows(tab).map(([k, name, list, kind]) => `<div class="crow"><div class="clbl">${name}</div><div class="chips">${list.map((v, i) => kind === 'sw'
      ? `<button class="chip-o sw ${c[k] === v ? 'sel' : ''}${popped === k + v ? ' pop' : ''}" data-k="${k}" data-v="${v}" aria-pressed="${c[k] === v}" aria-label="${name}: ${k === 'coat' ? COAT_NAMES[i] : v}" title="${k === 'coat' ? COAT_NAMES[i] : v}" style="background:${v}"></button>`
      : `<button class="chip-o ${c[k] === v ? 'sel' : ''}${popped === k + v ? ' pop' : ''}" data-k="${k}" data-v="${v}" aria-pressed="${c[k] === v}">${esc(label(k, v))}${sub(k, v) ? `<small>${esc(sub(k, v))}</small>` : ''}</button>`).join('')}</div></div>`).join('')}</div>`; };
  const refocus = (sel) => { const e = root.querySelector(sel); if (e) e.focus({ preventScroll: true }); };
  root.onclick = (e) => { const t = e.target.closest('[data-tab]'); if (t) { const kb = document.activeElement === t; tab = t.dataset.tab; popped = null; draw(); onPick?.({ tab }); if (kb || e.detail === 0) refocus(`[data-tab="${tab}"]`); return; }
    const b = e.target.closest('[data-k]'); if (!b) return; const k = b.dataset.k, v = b.dataset.v, kb = e.detail === 0; c[k] = v; popped = k + v; draw(); onChange?.(c);
    const row = ROWS.look.concat(ROWS.you, ROWS.life).find((r) => r[0] === k), i = row?.[2].indexOf(v) ?? -1; onPick?.({ k, v, row: row?.[1] || k, label: k === 'coat' ? COAT_NAMES[i] || v : k === 'eyeColor' ? 'colour ' + (i + 1) : label(k, v) });
    if (kb) refocus(`[data-k="${k}"][data-v="${CSS.escape(v)}"]`); };
  // keyboard / d-pad focus: arrows move between chips (left/right in a row, up/down between rows and the tabs); Enter/Space picks
  root.onkeydown = (e) => { const cur = document.activeElement; if (!root.contains(cur) || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const rowsEl = [root.querySelector('.ctabs'), ...root.querySelectorAll('.crow .chips')], ri = rowsEl.findIndex((r) => r.contains(cur)); if (ri < 0) return; e.preventDefault();
    const items = (r) => [...r.querySelectorAll('button')], here = items(rowsEl[ri]), ci = here.indexOf(cur);
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') { const n = here[(ci + (e.key === 'ArrowRight' ? 1 : -1) + here.length) % here.length]; n?.focus(); return; }
    const nr = rowsEl[Math.max(0, Math.min(rowsEl.length - 1, ri + (e.key === 'ArrowDown' ? 1 : -1)))], list = items(nr); (list.find((x) => x.classList.contains('sel')) || list[Math.min(ci, list.length - 1)])?.focus(); };
  draw(); return { get choices() { return c; }, set(k, v) { c[k] = v; draw(); }, tab(t) { tab = t; draw(); } };
}
// animated preview of a profile-ish {look, outfit, name}
export function drawPreview(pc, prof, x, t, lbl) { const face = ['down', 'right', 'up', 'left'][Math.floor(t / 1600) % 4];
  pc.fillStyle = '#d4a640'; pc.fillRect(x - 54, 150, 108, 10); pc.fillStyle = '#8f6a22'; pc.fillRect(x - 54, 158, 108, 4); pc.fillStyle = '#24305c'; pc.fillRect(x - 50, 152, 100, 5);
  const ph = (t % 6000) / 6000, hop = ph > 0.92 ? Math.sin((ph - 0.92) / 0.08 * Math.PI) * 6 : 0, bob = Math.round(Math.sin(t / 420) * 1.2 + hop); // idle: breathe + hop
  drawInuAvatar(pc, prof, x, 150 - bob, { scale: 2, face, frame: Math.floor(t / 160), shadow: false });
  if (lbl) { pc.font = '8px Silkscreen, monospace'; pc.textAlign = 'center'; pc.fillStyle = '#f2cc68'; pc.fillText(lbl, x, 172); } }
