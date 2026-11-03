// HUD top-row fit: the live "N ONLINE" chip (#mp-chip, right-anchored beside the menu button) must never sit on the HUD chip row
// (#hud: bones / streak / clock / event / quests / sound), e.g. at 667x375 phone landscape. Steps, only as far as needed:
//   1  body.mp-tight: the online chip shrinks to its dot + head-count ("● 1"; full text stays in its title / aria-label)
//   2  body.hud-tight: + the HUD chips drop their small sub-labels ("bones", "day · device"); the numbers + icons stay
// It steps back down once the row has room again (hysteresis), so there is no flicker. Called from the ~0.2 s HUD tick.
export const GAP = 6, LEVELS = ['mp-tight', 'hud-tight'];
const st = { level: 0, saved: [0, 0, 0] };
// pure: overlap = px the row runs into the chip (<= 0 = clear); saved[l] = px gained when level l was entered
export function nextLevel(level, overlap, saved, max = LEVELS.length) { if (overlap > 0) return Math.min(max, level + 1);
  if (level > 0 && -overlap > (saved[level] || 0) + 4) return level - 1; return level; }
export function rowOverlap(hudRects, chip, gap = GAP) { if (!chip || !chip[2]) return -Infinity; let o = -Infinity;
  for (const r of hudRects) { if (!r[2] || r[1] >= chip[1] + chip[3] || chip[1] >= r[1] + r[3] || r[0] >= chip[0] + chip[2]) continue; o = Math.max(o, r[0] + r[2] + gap - chip[0]); } return o; }
export const compactLabel = (t) => { t = String(t || '').trim(); const m = t.match(/^(\d+)\b/); return m ? m[1] : t.slice(0, 5); };
const rect = (e) => { const r = e.getBoundingClientRect(); return [r.left, r.top, r.width, r.height]; };
function measure(doc) { const hud = doc.getElementById('hud'), chip = doc.getElementById('mp-chip'); if (!hud || hud.hidden || !chip || chip.hidden) return null;
  const c = rect(chip); if (!c[2]) return null; return rowOverlap([...hud.children].map(rect), c); }
function apply(doc, level) { LEVELS.forEach((k, i) => doc.body.classList.toggle(k, level > i)); }
export function fitHud(doc = document) { const chip = doc.getElementById('mp-chip'); if (!chip) return st.level;
  const n = compactLabel(chip.textContent); if (chip.dataset.n !== n) chip.dataset.n = n; // compact form: the count only ("solo" / "…" stay as they are)
  for (let i = 0; i <= LEVELS.length; i++) { const o = measure(doc); if (o === null) { if (st.level) { st.level = 0; apply(doc, 0); } return 0; }
    const nl = nextLevel(st.level, o, st.saved); if (nl === st.level) break;
    if (nl > st.level) { apply(doc, nl); const o2 = measure(doc); st.saved[nl] = Math.max(0, o - (o2 ?? o)); st.level = nl; }
    else { apply(doc, nl); const o2 = measure(doc); if (o2 !== null && o2 > 0) { apply(doc, st.level); break; } st.level = nl; } }
  return st.level; }
export const _state = st;
