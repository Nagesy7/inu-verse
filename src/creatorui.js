// Character creator UI (title screen) + salon re-style panel. Renders choices as pixel chips.
import { OPTIONS, TRAITS, STARTER_OUTFITS, HOMES, PATHS, defaultChoices, lookOf } from './creator.js';
import { drawInuAvatar } from './vendor/inu-avatar.js';
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
export function mountCreator(root, { choices = defaultChoices(), tabs = ['look', 'you', 'life'], onChange } = {}) {
  let tab = tabs[0]; const c = { ...choices };
  const rows = (t) => t === 'you' && !tabs.includes('life') ? ROWS.you.filter((r) => r[0] === 'pronouns') : ROWS[t];
  const draw = () => { root.innerHTML = `<div class="ctabs">${tabs.map((t) => `<button class="ctab ${t === tab ? 'sel' : ''}" data-tab="${t}">${{ look: 'Look', you: 'You', life: 'Life' }[t]}</button>`).join('')}</div>
    <div class="crows">${rows(tab).map(([k, name, list, kind]) => `<div class="crow"><div class="clbl">${name}</div><div class="chips">${list.map((v, i) => kind === 'sw'
      ? `<button class="chip-o sw ${c[k] === v ? 'sel' : ''}" data-k="${k}" data-v="${v}" title="${k === 'coat' ? COAT_NAMES[i] : v}" style="background:${v}"></button>`
      : `<button class="chip-o ${c[k] === v ? 'sel' : ''}" data-k="${k}" data-v="${v}">${esc(label(k, v))}${sub(k, v) ? `<small>${esc(sub(k, v))}</small>` : ''}</button>`).join('')}</div></div>`).join('')}</div>`; };
  root.onclick = (e) => { const t = e.target.closest('[data-tab]'); if (t) { tab = t.dataset.tab; draw(); return; } const b = e.target.closest('[data-k]'); if (!b) return; c[b.dataset.k] = b.dataset.v; draw(); onChange?.(c); };
  draw(); return { get choices() { return c; }, set(k, v) { c[k] = v; draw(); }, tab(t) { tab = t; draw(); } };
}
// animated preview of a profile-ish {look, outfit, name}
export function drawPreview(pc, prof, x, t, lbl) { const face = ['down', 'right', 'up', 'left'][Math.floor(t / 1600) % 4];
  pc.fillStyle = '#d4a640'; pc.fillRect(x - 54, 150, 108, 10); pc.fillStyle = '#8f6a22'; pc.fillRect(x - 54, 158, 108, 4); pc.fillStyle = '#24305c'; pc.fillRect(x - 50, 152, 100, 5);
  drawInuAvatar(pc, prof, x, 150, { scale: 2, face, frame: Math.floor(t / 160), shadow: false });
  if (lbl) { pc.font = '8px Silkscreen, monospace'; pc.textAlign = 'center'; pc.fillStyle = '#f2cc68'; pc.fillText(lbl, x, 172); } }
