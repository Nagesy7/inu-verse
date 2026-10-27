// $KIBBLE Holder Lounge board UI — six features as tabs.
import * as L from './lounge.js';

const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c]);
const fmtK = (u) => {
  const n = Number(u || 0) / 1e6;
  if (n >= 1e6) return (n / 1e6).toFixed(2) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return n.toFixed(2);
};

const TABS = [
  ['gallery', 'Silhouette gallery'],
  ['night', 'Night watch'],
  ['rival', 'Rival board'],
  ['kennel', 'Kennel seats'],
  ['lore', 'Lore hearth'],
  ['rack', 'Cosmetic rack'],
];

/**
 * ctx: {
 *   state, body, toast, hud, persist, tab, open(tab),
 *   gate, phaseLabel, companions, questSave, questStatus, ownedCosmetics, bones
 * }
 */
export function renderLounge(ctx) {
  const s = ctx.state;
  L.ensureLounge(s);
  const tab = ctx.tab || 'gallery';
  const gate = ctx.gate || L.loungeGate(s, { demo: true });
  const phase = L.phaseForWatch(ctx.phaseLabel || 'day');
  const G = ctx.questSave || null;
  const qStatus = ctx.questStatus || (G ? 'ready' : 'empty');

  let html = `<h2>${esc(L.LOUNGE_NAME)}</h2>
    <p class="sub">Holder space past the free Trainer Gate · ≥ ${fmtK(L.GATE_THRESHOLD_U)} $KIBBLE</p>
    <p class="lounge-disc" role="note">Portal next door stays free for everyone. Bones never cash out. Cosmetics only — no creatures, stats or pay-to-win.</p>
    <div class="card lounge-gate ${gate.ok ? 'ok' : 'no'}">
      <b>${gate.ok ? '★ Holder access' : 'Locked'}</b>
      <small>Balance ${fmtK(gate.balU)} / ${fmtK(gate.thresholdU)}${gate.kennelOk ? ' · Kennel tier' : ''}</small>
      ${gate.ok ? '' : `<p class="small">${esc(gate.reason || '')}</p>`}
    </div>
    <div class="ctabs lounge-tabs">${TABS.map(([k, n]) =>
      `<button type="button" class="ctab ${k === tab ? 'sel' : ''}" data-ltab="${k}">${n}</button>`).join('')}</div>`;

  if (tab === 'gallery') {
    const fromC = L.silhouettesFromCompanions(ctx.companions);
    const sil = fromC.status === 'ready' ? fromC : L.silhouettesFromSave(G);
    html += `<p class="sub">Evolved stage outlines and evo chains from your Inu Quest saves.</p>`;
    if (qStatus === 'signedout') html += `<p class="small">Sign in with the same wallet you use in Inu Quest to load silhouettes.</p>`;
    else if (qStatus === 'offline' || qStatus === 'error') html += `<p class="small">Quest save bridge unavailable right now. Honest empty wall until it reconnects.</p>`;
    else if (sil.status === 'empty') html += `<p class="small">${esc(sil.line)}</p>`;
    else {
      if (sil.line) html += `<p class="small">${esc(sil.line)}</p>`;
      html += `<div class="lounge-gallery">`;
      for (const e of sil.entries) {
        html += `<div class="card lounge-sil">
          <div class="lounge-sil-art" aria-hidden="true"><span class="lounge-sil-pup stage-${e.stage}"></span></div>
          <b>${esc(e.name)}</b>
          <small>Stage ${e.stage}${e.line ? ` · ${esc(e.line)}` : ''}</small>
          <div class="lounge-chain">${e.forms.map((f) =>
            `<span class="lounge-form ${f.current ? 'cur' : ''}">${esc(f.name)} <em>s${f.stage}</em></span>`).join('<span class="lounge-arrow">→</span>')}</div>
        </div>`;
      }
      html += `</div>`;
    }
  }

  if (tab === 'night') {
    const nw = L.nightWatchFromSave(G, phase);
    html += `<p class="sub">Lounge lighting follows the hub day–night cycle · now <b>${esc(nw.phase)}</b>${nw.nightish ? ' · night pane' : ''}.</p>
      <p class="small">${esc(nw.line)}</p>`;
    if (nw.tips.length) {
      html += `<div class="grid">`;
      for (const t of nw.tips) {
        html += `<div class="card"><b>${esc(t.name)}</b>
          <p class="small">${esc(t.note)}</p>
          <p>Night tips: ${t.night.map(esc).join(', ')}</p></div>`;
      }
      html += `</div>`;
    }
  }

  if (tab === 'rival') {
    const rv = L.rivalFromSave(G);
    html += `<p class="sub">Persistent rival <b>${esc(rv.name)}</b> · Quest step4 rivalStory</p>
      <div class="card">
        <b>${esc(rv.name)}${rv.sp ? ` · ace ${esc(rv.sp)}` : ''}</b>
        <small>Stage ${rv.stage} · Badges ${rv.badges} · ${rv.stub ? 'stub / empty' : 'live from Quest save'}</small>
        <p class="small">${esc(rv.line)}</p>
        <ul class="lounge-beats">`;
    for (const b of L.RIVAL_BEATS) {
      const beat = rv.beaten?.[b.id];
      const met = rv.met?.[b.id];
      const mark = beat ? '✓ beat' : met ? 'met' : '—';
      const last = rv.lastBeat?.id === b.id ? ' · last beat' : '';
      const next = rv.next?.id === b.id ? ' · next rematch' : '';
      html += `<li><b>${esc(b.label)}</b> <small>${mark}${last}${next}</small><br><span class="small">${esc(b.tease)}</span></li>`;
    }
    html += `</ul></div>`;
  }

  if (tab === 'kennel') {
    const party = L.partyDisplay(ctx.companions, G);
    const bones = Math.floor(Number(ctx.bones ?? s.bones) || 0);
    const sat = !!s.lounge?.sat;
    html += `<p class="sub">Sit with other holders · party of six on display · Bones read-only.</p>
      <div class="card">
        <b>Your Bones</b>
        <small>${bones.toLocaleString('en-US')} Bones (soft currency — never cashes out)</small>
        <p class="small">${sat ? 'You are seated in the lounge.' : 'Take a kennel seat in the room to sit with fellow holders.'}</p>
        ${sat
          ? `<button type="button" class="btn alt" data-lact="stand">Stand up</button>`
          : `<button type="button" class="btn green" data-lact="sit">Sit (mark seated)</button>`}
      </div>`;
    if (party.status === 'empty') html += `<p class="small">${esc(party.line)}</p>`;
    else {
      if (party.line) html += `<p class="small">${esc(party.line)}</p>`;
      html += `<div class="lounge-party">`;
      for (let i = 0; i < 6; i++) {
        const sl = party.slots[i];
        html += sl
          ? `<div class="card lounge-slot"><b>${esc(sl.name)}</b><small>${esc(sl.form)} · s${sl.stage}</small></div>`
          : `<div class="card lounge-slot empty"><b>Empty</b><small>slot ${i + 1}</small></div>`;
      }
      html += `</div>`;
    }
  }

  if (tab === 'lore') {
    const lore = L.loreHearth(s.lounge?.seenPlaques || []);
    html += `<p class="sub">${esc(lore.line)}</p><div class="grid">`;
    for (const p of lore.plaques) {
      html += `<div class="card lounge-plaque">
        <b>${esc(p.title)}</b>
        <p>${esc(p.body)}</p>
        ${p.seen
          ? `<p class="small">✓ Plaque remembered</p>`
          : `<button type="button" class="btn alt" data-lact="plaque:${p.id}">Read plaque</button>`}
      </div>`;
    }
    html += `</div>`;
  }

  if (tab === 'rack') {
    const rack = L.cosmeticsRack(ctx.ownedCosmetics || {});
    html += `<p class="sub">${esc(rack.line)}</p>
      <p class="small"><a href="${esc(rack.shopUrl)}" target="_blank" rel="noopener">Open Kibble Pay · Inu Quest cosmetics</a></p>
      <div class="grid">`;
    for (const it of rack.items) {
      html += `<div class="card">
        <b>${esc(it.name)}</b>
        <small>${fmtK(L.toU(it.price))} · ${esc(it.kind)}</small>
        <p class="small">${it.owned ? '✓ Owned on this wallet' : 'Buy with $KIBBLE on Kibble Pay — cosmetic only'}</p>
      </div>`;
    }
    html += `</div>
      <p class="small">Prices are fee-inclusive Quest catalog amounts (UI units). Fee splits unchanged.</p>`;
  }

  ctx.body.innerHTML = html;

  ctx.body.querySelectorAll('[data-ltab]').forEach((b) => {
    b.onclick = () => ctx.open(b.getAttribute('data-ltab'));
  });
  ctx.body.querySelectorAll('[data-lact]').forEach((b) => {
    b.onclick = () => {
      const act = b.getAttribute('data-lact');
      const Lstate = L.ensureLounge(s);
      if (act === 'sit') { Lstate.sat = true; ctx.toast?.('You take a kennel seat.', 'good'); ctx.persist?.(); ctx.open(tab); }
      else if (act === 'stand') { Lstate.sat = false; ctx.toast?.('You stand up.', ''); ctx.persist?.(); ctx.open(tab); }
      else if (act.startsWith('plaque:')) {
        const id = act.slice(7);
        if (!Lstate.seenPlaques.includes(id)) Lstate.seenPlaques.push(id);
        const p = L.LORE_PLAQUES.find((x) => x.id === id);
        ctx.toast?.(p ? `Plaque · ${p.title}` : 'Plaque read', 'good');
        ctx.persist?.();
        ctx.open(tab);
      }
    };
  });
}
