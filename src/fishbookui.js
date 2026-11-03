// Fish Book panel: species grid (silhouettes until caught), counts, biggest catch, rarity; set badges + equippable titles.
// Plain buttons only, so the controller focus manager (src/gamepad.js) can walk it with the D-pad.
import * as FB from './fishbook.js';
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const CSS = `#panel .fb-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(118px,1fr));gap:6px;margin:6px 0}
#panel .fb-card{background:#141a2e;border:2px solid #39446a;padding:4px 6px;font-size:10px;line-height:1.35;color:#e8e2cc;text-align:left}
#panel .fb-card.got{border-color:var(--rc)}#panel .fb-card b{display:block;font-size:11px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
#panel .fb-card svg{display:block;width:100%;height:30px;margin:2px 0}#panel .fb-r{color:var(--rc)}#panel .fb-dim{opacity:.6}
#panel .fb-sets{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:6px}#panel .fb-sets .card small{display:block}
@media (max-height:500px){#panel .fb-grid{grid-template-columns:repeat(auto-fill,minmax(104px,1fr))}#panel .fb-card svg{height:24px}}`;
// one shared fish outline; caught = species colour, uncaught = black silhouette
const fishSvg = (color, got) => `<svg viewBox="0 0 60 24" aria-hidden="true"><path d="M4 12 Q16 1 34 4 Q48 6 52 12 Q48 18 34 20 Q16 23 4 12 Z" fill="${got ? color : '#05070d'}" stroke="${got ? '#141a2e' : '#2a3358'}" stroke-width="1.5"/><path d="M50 12 L59 4 L57 12 L59 20 Z" fill="${got ? color : '#05070d'}" stroke="${got ? '#141a2e' : '#2a3358'}" stroke-width="1.5"/>${got ? '<circle cx="12" cy="10" r="1.8" fill="#141a2e"/>' : ''}</svg>`;
const hint = (sp) => (sp.when?.night ? 'bites at night' : sp.when?.rain ? 'bites in the rain' : sp.when?.seasons ? 'bites in ' + sp.when.seasons.join('/') : 'bites any time');
export function renderFishbook(ctx) {
  const doc = ctx.body.ownerDocument; if (!doc.getElementById('fb-css')) { const st = doc.createElement('style'); st.id = 'fb-css'; st.textContent = CSS; doc.head.appendChild(st); }
  const s = ctx.state, b = FB.ensureBook(s), sum = FB.summary(s), titles = FB.titlesOf(s), cur = FB.titleOf(s);
  const cards = FB.SPECIES.map((sp) => { const e = b.caught[sp.id], got = e?.n > 0, R = FB.RARITY[sp.rarity];
    return `<div tabindex="0" aria-label="${got ? esc(sp.name) : 'Unknown fish'}, ${R.name}" class="fb-card${got ? ' got' : ''}" style="--rc:${R.color}" data-fish="${sp.id}">${fishSvg(sp.color, got)}<b>${got ? esc(sp.name) : '???'}</b><span class="fb-r">${R.name}</span><br>${got ? `Caught ×${e.n} · best ${e.best} cm` : `<span class="fb-dim">${hint(sp)}</span>`}</div>`; }).join('');
  const sets = Object.keys(FB.SETS).map((id) => { const p = FB.setProgress(s, id);
    return `<div class="card"><b>${p.badge} ${esc(p.name)}</b><small>${p.have.length}/${p.need.length} species${p.unlocked ? ' · complete ✓' : ''}</small><small>Title: “${esc(p.title)}”${FB.SETS[id].trophy ? ' + home trophy' : ''}</small>${p.unlocked ? (cur === p.title ? '<button class="btn alt" data-act="title:">Wearing ✓ (take off)</button>' : `<button class="btn green" data-act="title:${esc(p.title)}">Wear title</button>`) : ''}</div>`; }).join('');
  ctx.body.innerHTML = `<h2>📖 Fish Book</h2><p class="sub">${sum.seen}/${sum.total} species · ${sum.catches} catches${cur ? ` · wearing “${esc(cur)}”` : ''}. Some fish only bite at night, in the rain or in one season. Sets unlock cosmetic badges and nameplate titles (no Bones, no $KIBBLE).</p>
    <div class="fb-grid">${cards}</div><h3>Sets</h3><div class="fb-sets">${sets}</div><p class="small">Catch fish at the Fishing Pond (Farmland). Your book is saved with your game.</p>`;
  ctx.body.onclick = (e) => { const t = e.target.closest('[data-act]'); if (!t) return; const [a, ...rest] = t.dataset.act.split(':'), arg = rest.join(':');
    if (a === 'title') { const r = FB.setTitle(s, arg || null); ctx.toast(r.ok ? (arg ? `Title on: “${arg}”` : 'Title off') : r.reason, r.ok ? 'good' : 'bad'); ctx.persist(); renderFishbook(ctx); }};
}
