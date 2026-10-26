// Character creator UI (title screen) + salon re-style panel. Renders choices as pixel chips.
// LOOK (and other) rows: after a pick, collapse to a summary; tap the header to reopen (accordion).
import { OPTIONS, TRAITS, STARTER_OUTFITS, HOMES, PATHS, defaultChoices, lookOf } from './creator.js';
import { drawInuAvatarHi as drawInuAvatar } from './art.js';
import { OUTFITS } from './outfits.js';
import { COAT_NAMES } from './profile.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const cap = (s) => s.charAt(0).toUpperCase() + s.slice(1);
const ROWS = {
  look: [['coat', 'Coat', OPTIONS.coat, 'sw'], ['pattern', 'Pattern', OPTIONS.pattern], ['markings', 'Markings', OPTIONS.markings], ['eyeShape', 'Eyes', OPTIONS.eyeShape], ['eyeColor', 'Eye colour', OPTIONS.eyeColor, 'sw'], ['ears', 'Ears', OPTIONS.ears], ['tail', 'Tail', OPTIONS.tail], ['size', 'Size', OPTIONS.size]],
  you: [['name', 'Name', null, 'text'], ['pronouns', 'Pronouns', OPTIONS.pronouns], ['outfit', 'Starting outfit', Object.keys(STARTER_OUTFITS)], ['trait', 'Personality', Object.keys(TRAITS)]],
  life: [['home', 'Starting home', Object.keys(HOMES)], ['path', 'Starting path (optional)', Object.keys(PATHS)]],
};
const label = (k, v) => k === 'outfit' ? STARTER_OUTFITS[v].name : k === 'trait' ? TRAITS[v].name : k === 'home' ? HOMES[v].name : k === 'path' ? PATHS[v].name : cap(v);
const sub = (k, v) => k === 'trait' ? TRAITS[v].desc : k === 'home' ? HOMES[v].desc : k === 'path' ? PATHS[v].desc : '';
const pickLabel = (k, v, list) => {
  const i = list.indexOf(v);
  if (k === 'coat') return COAT_NAMES[i] || v;
  if (k === 'eyeColor') return 'colour ' + (i + 1);
  return label(k, v);
};
export function profileOfChoices(c) { const eq = {}; for (const id of STARTER_OUTFITS[c.outfit]?.items || []) { const d = OUTFITS[id]; if (d) eq[d.slot] = { id, kind: d.look?.kind, c: d.look?.c || d.look?.frame, d: d.look?.d, accent: d.look?.accent || d.look?.pin, full: !!d.full }; }
  if (c.path === 'worker') eq.hat = { id: 'cap_red', kind: 'cap', c: '#c8282e', d: '#8e1a20' }; return { look: lookOf(c), outfit: eq, name: c.name }; }
// mount into a container; tabs: which tab groups to show (salon = look + pronouns only)
export function mountCreator(root, { choices = defaultChoices(), tabs = ['look', 'you', 'life'], onChange, onPick } = {}) {
  let tab = tabs[0], popped = null, open = null; // accordion: one open section key, or null = all collapsed to summaries
  const c = { ...choices };
  const rows = (t) => t === 'you' && !tabs.includes('life') ? ROWS.you.filter((r) => r[0] === 'pronouns') : ROWS[t];
  const isText = (k, kind) => kind === 'text' || k === 'name';
  const nameVal = () => (String(c.name || 'Kabosu').trim() || 'Kabosu').slice(0, 14);
  const syncNameFromDom = () => {
    const inp = root.querySelector('#name');
    if (!inp) return;
    const v = inp.value.trim().slice(0, 14);
    c.name = v || c.name || 'Kabosu';
  };
  const confirmName = () => {
    syncNameFromDom();
    c.name = nameVal();
    popped = null; open = null;
    draw(); onChange?.(c);
    onPick?.({ k: 'name', v: c.name, row: 'Name', label: c.name });
  };
  const sumHtml = (k, name, list, kind) => {
    if (isText(k, kind)) return `<span class="csum"><span class="csum-lab">${esc(nameVal())}</span></span>`;
    const v = c[k], lab = pickLabel(k, v, list);
    if (kind === 'sw') return `<span class="csum"><i class="csw" style="background:${v}" aria-hidden="true"></i><span class="csum-lab">${esc(lab)}</span></span>`;
    return `<span class="csum"><span class="csum-lab">${esc(lab)}</span></span>`;
  };
  const rowHtml = ([k, name, opts, kind]) => {
    const isOpen = open === k;
    const head = `<button type="button" class="clbl" data-toggle="${k}" aria-expanded="${isOpen}" aria-controls="chips-${k}"><span class="clbl-t">${esc(name)}</span>${isOpen ? '' : sumHtml(k, name, opts, kind)}<span class="clbl-chev" aria-hidden="true">${isOpen ? '▾' : '▸'}</span></button>`;
    if (isText(k, kind)) {
      const body = isOpen ? `<div class="chips name-row" id="chips-${k}"><input id="name" class="cname" type="text" maxlength="14" value="${esc(nameVal())}" autocomplete="off" spellcheck="false" aria-label="Your Inu's name"><button type="button" class="chip-o name-done" data-name-done>Done</button></div>` : '';
      return `<div class="crow ${isOpen ? 'open' : 'collapsed'}" data-sec="${k}">${head}${body}</div>`;
    }
    const chips = isOpen ? `<div class="chips" id="chips-${k}">${opts.map((v, i) => kind === 'sw'
      ? `<button class="chip-o sw ${c[k] === v ? 'sel' : ''}${popped === k + v ? ' pop' : ''}" data-k="${k}" data-v="${v}" aria-pressed="${c[k] === v}" aria-label="${name}: ${k === 'coat' ? COAT_NAMES[i] : v}" title="${k === 'coat' ? COAT_NAMES[i] : v}" style="background:${v}"></button>`
      : `<button class="chip-o ${c[k] === v ? 'sel' : ''}${popped === k + v ? ' pop' : ''}" data-k="${k}" data-v="${v}" aria-pressed="${c[k] === v}">${esc(label(k, v))}${sub(k, v) ? `<small>${esc(sub(k, v))}</small>` : ''}</button>`).join('')}</div>` : '';
    return `<div class="crow ${isOpen ? 'open' : 'collapsed'}" data-sec="${k}">${head}${chips}</div>`;
  };
  const draw = () => {
    const list = rows(tab);
    root.innerHTML = `<div class="ctabs">${tabs.map((t) => `<button class="ctab ${t === tab ? 'sel' : ''}" data-tab="${t}" aria-pressed="${t === tab}">${{ look: 'Look', you: 'You', life: 'Life' }[t]}</button>`).join('')}</div>
    <div class="crows">${list.map(rowHtml).join('')}</div>`;
  };
  const refocus = (sel) => { const e = root.querySelector(sel); if (e) e.focus({ preventScroll: true }); };
  const focusOpenChips = (k) => {
    if (k === 'name') { root.querySelector('#name')?.focus({ preventScroll: true }); return; }
    const sel = root.querySelector(`.crow[data-sec="${k}"] .chip-o.sel`) || root.querySelector(`.crow[data-sec="${k}"] .chip-o`);
    sel?.focus({ preventScroll: true });
  };
  root.onclick = (e) => {
    if (e.target.closest('[data-name-done]')) { confirmName(); return; }
    const t = e.target.closest('[data-tab]');
    if (t) {
      if (open === 'name') syncNameFromDom();
      const kb = document.activeElement === t; tab = t.dataset.tab; popped = null; open = null; draw(); onPick?.({ tab });
      if (kb || e.detail === 0) refocus(`[data-tab="${tab}"]`); return;
    }
    const tgl = e.target.closest('[data-toggle]');
    if (tgl) {
      const k = tgl.dataset.toggle, kb = e.detail === 0 || document.activeElement === tgl;
      if (open === 'name' && k !== 'name') syncNameFromDom();
      else if (open === 'name' && k === 'name') { syncNameFromDom(); open = null; popped = null; draw(); if (kb) refocus(`[data-toggle="${k}"]`); return; }
      open = open === k ? null : k; popped = null; draw();
      if (open === k && kb) focusOpenChips(k);
      else if (kb) refocus(`[data-toggle="${k}"]`);
      return;
    }
    const b = e.target.closest('[data-k]'); if (!b) return;
    if (open === 'name') syncNameFromDom();
    const k = b.dataset.k, v = b.dataset.v, kb = e.detail === 0;
    c[k] = v; popped = k + v; open = null; // collapse this section after confirm/select
    draw(); onChange?.(c);
    const row = ROWS.look.concat(ROWS.you, ROWS.life).find((r) => r[0] === k), i = row?.[2]?.indexOf?.(v) ?? -1;
    onPick?.({ k, v, row: row?.[1] || k, label: k === 'coat' ? COAT_NAMES[i] || v : k === 'eyeColor' ? 'colour ' + (i + 1) : label(k, v) });
    if (kb) refocus(`[data-toggle="${k}"]`);
  };
  root.onkeydown = (e) => {
    if (e.target?.matches?.('input.cname, #name') && e.key === 'Enter') { e.preventDefault(); confirmName(); return; }
    const cur = document.activeElement;
    if (!root.contains(cur) || cur?.matches?.('input, textarea') || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
    const secKeys = rows(tab).map((r) => r[0]);
    const rowNodes = [root.querySelector('.ctabs'), ...secKeys.map((k) => root.querySelector(`.crow[data-sec="${k}"]`))];
    const ri = rowNodes.findIndex((r) => r && r.contains(cur)); if (ri < 0) return; e.preventDefault();
    const itemsOf = (r) => {
      if (!r) return [];
      if (r.classList?.contains('ctabs') || r === rowNodes[0]) return [...r.querySelectorAll('button')];
      if (r.classList.contains('open')) {
        if (r.dataset.sec === 'name') return [...r.querySelectorAll('input, button')];
        return [...r.querySelectorAll('.chips button')];
      }
      const tgl = r.querySelector('[data-toggle]'); return tgl ? [tgl] : [];
    };
    const here = itemsOf(rowNodes[ri]), ci = Math.max(0, here.indexOf(cur));
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (here.length < 2) return;
      here[(ci + (e.key === 'ArrowRight' ? 1 : -1) + here.length) % here.length]?.focus(); return;
    }
    const nri = Math.max(0, Math.min(rowNodes.length - 1, ri + (e.key === 'ArrowDown' ? 1 : -1)));
    const dest = rowNodes[nri];
    if (nri > 0 && dest && !dest.classList.contains('open')) {
      if (open === 'name') syncNameFromDom();
      open = dest.dataset.sec; popped = null; draw();
      focusOpenChips(open); return;
    }
    const list = itemsOf(root.querySelector(nri === 0 ? '.ctabs' : `.crow[data-sec="${secKeys[nri - 1]}"]`) || dest);
    (list.find((x) => x.classList.contains('sel')) || list[Math.min(ci, list.length - 1)])?.focus();
  };
  // blur on name input: collapse to summary (Done / Enter also confirm)
  root.addEventListener('focusout', (e) => {
    if (open !== 'name' || !e.target?.matches?.('#name, input.cname')) return;
    const next = e.relatedTarget;
    if (next && root.contains(next) && (next.matches?.('[data-name-done], [data-toggle="name"]') || next.closest?.('.crow[data-sec="name"]'))) return;
    // defer so a click on Done / another chip can win the race
    setTimeout(() => {
      if (open !== 'name') return;
      const ae = document.activeElement;
      if (ae && root.contains(ae) && ae.closest?.('.crow[data-sec="name"]')) return;
      confirmName();
    }, 0);
  });
  draw(); return { get choices() { return c; }, set(k, v) { c[k] = v; draw(); }, tab(t) { if (open === 'name') syncNameFromDom(); tab = t; open = null; draw(); }, get open() { return open; } };
}
// animated preview of a profile-ish {look, outfit, name}
export function drawPreview(pc, prof, x, t, lbl) { const face = ['down', 'right', 'up', 'left'][Math.floor(t / 1600) % 4];
  pc.fillStyle = '#d4a640'; pc.fillRect(x - 54, 150, 108, 10); pc.fillStyle = '#8f6a22'; pc.fillRect(x - 54, 158, 108, 4); pc.fillStyle = '#24305c'; pc.fillRect(x - 50, 152, 100, 5);
  const ph = (t % 6000) / 6000, hop = ph > 0.92 ? Math.sin((ph - 0.92) / 0.08 * Math.PI) * 6 : 0, bob = Math.round(Math.sin(t / 420) * 1.2 + hop); // idle: breathe + hop
  drawInuAvatar(pc, prof, x, 150 - bob, { scale: 2, face, frame: Math.floor(t / 160), shadow: false });
  if (lbl) { pc.font = '8px Silkscreen, monospace'; pc.textAlign = 'center'; pc.fillStyle = '#f2cc68'; pc.fillText(lbl, x, 172); } }
