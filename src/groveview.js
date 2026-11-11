// Town grove overlay. Draws on the normal town and keeps Splints in their own key.
import { BACKLOG, NOTE, PREVIEW_LIMIT, SAVE_KEY, STATIONS, TAG, actAt, atStation, moneySum, noteMotion, noticeOf, porchPrompt, refundJob, seedGrove, sprigPos, CAP, SCRIP, GATE_HOLES, STOOL_ID } from './grove.js';
import { salvageHint, salvageLedger, seedSalvage } from './salvage.js';

const SAVE_V = 4;
const ART = {};
export const GROVE_ART_FILES = Object.freeze(['stump-stocked', 'stump-empty', 'stump-recovering', 'saw-idle', 'saw-milling', 'shed-empty', 'shed-partial', 'shed-full', 'porch-holes2', 'porch-holes1', 'porch-fixed', 'carry-logs', 'carry-boards']);
export const SALVAGE_ART_FILES = Object.freeze(['ume-lantern-broken', 'ume-lantern-fixed', 'ume-lantern-placed', 'riku-crate-broken', 'riku-crate-fixed', 'riku-crate-placed', 'koko-cushion-broken', 'koko-cushion-fixed', 'koko-cushion-placed', 'scrap-bin']);
const ART_FILES = [...GROVE_ART_FILES, ...SALVAGE_ART_FILES];
export const SALVAGE_DRAW = Object.freeze({
  native: Object.freeze([16, 12]),
  world: Object.freeze([32, 24]),
  scale: 2,
  anchor: 'bottom-center',
  placedNudge: Object.freeze({ gift: 20, shed: 28, porch: 28 }),
  placedSortAhead: 1,
  setOutLabel: 28,
  dropLabel: 36,
});
const SHEETS = Object.freeze({
  'ume-lantern-1': Object.freeze({ broken: 'ume-lantern-broken', fixed: 'ume-lantern-fixed', placed: 'ume-lantern-placed' }),
  'riku-crate-1': Object.freeze({ broken: 'riku-crate-broken', fixed: 'riku-crate-fixed', placed: 'riku-crate-placed' }),
  'koko-cushion-1': Object.freeze({ broken: 'koko-cushion-broken', fixed: 'koko-cushion-fixed', placed: 'koko-cushion-placed' }),
});
export function carryingSalvage(s, item) {
  const job = s?.salvageJob;
  return !!(job && item && job.itemId === item.id && job.phase === 'carry');
}
export function salvageSheet(item, carrying) {
  if (!item || carrying || item.state === 'scrapped') return null;
  const pack = SHEETS[item.id];
  if (!pack) return null;
  if (item.state === 'incoming' || item.state === 'broken') return pack.broken;
  if (item.state === 'restored') return pack.fixed;
  if (item.state === 'delivered' || item.state === 'donated') return pack.placed;
  return null;
}
export function binFleck(s) {
  return (s?.scrap || 0) > 0 || s?.stool?.state === 'scrapped';
}
function artReady(name) {
  const img = ART[name];
  return !!(img && img.complete && img.naturalWidth);
}
function loadArt() {
  if (typeof Image === 'undefined' || ART.ready) return;
  ART.ready = true;
  for (const name of ART_FILES) {
    const img = new Image();
    img.src = `assets/grove/${name}.png`;
    ART[name] = img;
  }
}
function blit(ctx, name, x, y, w, h) {
  loadArt();
  const img = ART[name];
  ctx.imageSmoothingEnabled = false;
  if (img && img.complete && img.naturalWidth) ctx.drawImage(img, x, y, w, h);
}
function marks(ctx, x, y, n) {
  ctx.fillStyle = '#b47a43';
  for (let i = 0; i < n; i++) ctx.fillRect(x - 6, y - i * 4, 12, 2);
}
export function stationArt(s) {
  const stump = s.logs <= 0 ? (s.regenMs > 0 ? 'stump-recovering' : 'stump-empty') : (s.logs === 1 ? 'stump-empty' : 'stump-stocked');
  const saw = s.job?.status === 'logs' ? 'saw-milling' : 'saw-idle';
  let shed = 'shed-empty';
  let shedMarks = 0;
  if (s.boards === 2) shed = 'shed-partial';
  else if (s.boards >= 4) shed = 'shed-full';
  else if (s.boards === 1 || s.boards === 3) shedMarks = s.boards;
  const porch = s.holes >= 2 ? 'porch-holes2' : s.holes === 1 ? 'porch-holes1' : 'porch-fixed';
  const carry = s.job?.status === 'logs' ? 'carry-logs' : s.job?.status === 'boards' ? 'carry-boards' : null;
  const stumpMarks = s.logs === 1 ? 1 : 0;
  return { stump, stumpMarks, saw, shed, shedMarks, porch, carry };
}

function normalize(s, fromV) {
  if (s.sprigWallet == null) s.sprigWallet = 0;
  if (s.npcHold == null) s.npcHold = 0;
  if (s.gateHoles == null) s.gateHoles = GATE_HOLES;
  if (s.gateUses == null) s.gateUses = 0;
  if (s.gateRenewed == null) s.gateRenewed = 0;
  if (s.gateJob == null) s.gateJob = null;
  if (!s.stool || s.stool.id !== STOOL_ID) s.stool = { id: STOOL_ID, owner: 'sprig', state: 'broken', rung: 1 };
  if (s.scrap == null) s.scrap = 0;
  if (s.stoolHold == null) s.stoolHold = 0;
  if (s.stoolJob == null) s.stoolJob = null;
  if (s.stoolPaid == null) s.stoolPaid = 0;
  if (s.donatePaid == null) s.donatePaid = 0;
  if (!s.salvage) s.salvage = seedSalvage();
  if (s.salvageHold == null) s.salvageHold = 0;
  if (s.salvageJob == null) s.salvageJob = null;
  const had = !!(s.job || s.gateJob || s.stoolJob || s.salvageJob);
  if (had) refundJob(s);
  if (fromV < SAVE_V) s.notice = 'Older grove save kept its splints' + (had ? ' and refunded the open haul' : '') + '. No splints were minted. Sprig\'s one stool was recorded and not copied.';
  return s;
}

function load(storage) {
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (!raw) return { ok: true, empty: true, gen: 0, state: seedGrove() };
    const rec = JSON.parse(raw);
    if (!rec || rec.tag !== TAG || typeof rec.gen !== 'number' || !rec.state || typeof rec.state.budget !== 'number') return { ok: false, gen: 0, state: seedGrove() };
    const fromV = rec.v === SAVE_V ? SAVE_V : rec.v === 3 ? 3 : rec.v === 2 ? 2 : 1;
    return { ok: true, empty: false, gen: rec.gen, state: normalize(rec.state, fromV) };
  } catch { return { ok: false, gen: 0, state: seedGrove() }; }
}

function store(storage, state, expected) {
  let have = 0;
  try {
    const raw = storage.getItem(SAVE_KEY);
    if (raw) {
      const rec = JSON.parse(raw);
      if (rec?.tag === TAG && typeof rec.gen === 'number') have = rec.gen;
    }
  } catch { return { ok: false, reason: 'stale' }; }
  if (have !== expected) return { ok: false, reason: 'stale', gen: have };
  const gen = have + 1;
  storage.setItem(SAVE_KEY, JSON.stringify({ v: SAVE_V, tag: TAG, gen, state }));
  return { ok: true, gen };
}

export function createGroveTown(doc = document, storage = globalThis.localStorage) {
  let rec = load(storage || { getItem() { return null; }, setItem() {} });
  let state = rec.state;
  let gen = rec.gen || 0;
  const held = storage;
  const strip = doc?.createElement ? doc.createElement('div') : null;
  let noteEl = null;
  let ledgerEl = null;
  if (strip && doc.body) {
    strip.id = 'grove-strip';
    if (strip.setAttribute) strip.setAttribute('role', 'status');
    if (typeof strip.querySelector === 'function') {
      strip.innerHTML = '<p id="grove-note"></p>';
      noteEl = strip.querySelector('#grove-note');
      ledgerEl = doc.createElement('div');
      ledgerEl.id = 'grove-ledger';
      if (doc.body.appendChild) doc.body.appendChild(ledgerEl);
    }
    doc.body.appendChild(strip);
  }
  const paint = () => {
    if (!strip) return;
    const s = state;
    const day = s.salvage?.done ? 'done' : (s.salvage?.items || []).filter((item) => item.state === 'broken' || item.state === 'restored' || item.state === 'delivered' || item.state === 'donated' || item.state === 'scrapped').length;
    const full = `${NOTE} · ${SCRIP} ${moneySum(s)}/${CAP} · budget ${s.budget || 0} · you ${s.you || 0} · sprig ${s.sprigWallet || 0} · hold ${s.hold || 0} · npc ${s.npcHold || 0} · stoolHold ${s.stoolHold || 0} · salvageHold ${s.salvageHold || 0} · logs ${s.logs || 0} · boards ${s.boards || 0} · porch ${s.holes} · gate ${s.gateHoles} · stool ${s.stool?.state || 'missing'} · day ${day}`;
    if (noteEl) noteEl.textContent = NOTE;
    if (ledgerEl) ledgerEl.textContent = full;
    else strip.textContent = full;
    strip.title = `${noticeOf(s)} ${PREVIEW_LIMIT}`;
  };
  const persist = () => {
    if (!held?.setItem) return;
    const r = store(held, state, gen);
    if (r.ok) gen = r.gen;
    else state.notice = 'This tab lost the grove save race. The live town save was not written.';
  };
  paint();
  return {
    backlog: BACKLOG,
    note: NOTE,
    key: SAVE_KEY,
    status: () => state,
    station: (id) => STATIONS[id],
    near: (x, y) => atStation(x, y),
    hint: (id) => {
      const s = state;
      const salvageLine = salvageHint(s, id);
      if (salvageLine) return salvageLine;
      if (id === 'stool') {
        if (s.stoolJob?.kind === 'repair') return 'Walk to the shed. Pay stays reserved.';
        if (s.stoolJob?.kind === 'donate') return 'Walk to the gift post. Pay stays reserved.';
        if (s.stool?.state === 'broken') return 'Sprig\'s only stool. Repair reserves the wage before the walk. Scrap is the other post.';
        if (s.stool?.state === 'restored' && s.stool.consent !== 'sprig') return 'Returned to Sprig. He has not agreed to give it away. Nothing is reserved.';
        if (s.stool?.state === 'restored') return 'Sprig agreed. Carry it to Fuku\'s lane bench. The wage is reserved before that walk.';
        if (s.stool?.state === 'delivered') return 'Fuku has the stool. Pay stays reserved until she sits and uses it.';
        if (s.stool?.state === 'donated') return 'Already donated. Moving it again pays nothing.';
        return 'Scrapped once. It is not a new stool.';
      }
      if (id === 'bin') return s.stool?.state === 'broken' ? 'Scrap the broken stool once. It does not become a new stool.' : 'Already scrapped, or the stool is not broken.';
      if (id === 'gift') return s.stoolJob?.phase === 'use' ? 'Fuku\'s lane bench. Pay stays reserved until she sits and uses the stool.' : 'Fuku\'s lane bench. Bring Sprig\'s stool only after he agrees.';
      if (id === 'shed' && s.stoolJob?.kind === 'repair') return 'The walked stool can be restored here. Pay stays reserved.';
      if (id === 'gate') {
        if (s.gateJob?.worker === 'sprig') return 'Sprig holds this board and the reserved wage.';
        if (s.gateJob?.worker === 'you') return 'Walk this board. Pay stays reserved.';
        if (s.gateHoles <= 0 && s.gateRenewed >= 1) return 'Repaired. It will not wear again. No splints are paid.';
        if (s.gateHoles <= 0) return 'Repaired. One more worn board only after 3 foreground crossings. Nothing is reserved.';
        if ((s.boards || 0) < 1) return 'Needs 1 shed board. Source: the board shed. Pay is not reserved.';
        return '1 shed board. The wage is reserved before the walk and paid once.';
      }
      if (s.gateJob?.worker === 'you') return 'Walk the 1 gate board to the gate. Pay stays reserved.';
      if (s.gateJob?.worker === 'sprig') return 'Sprig is walking the gate board. That wage is already reserved.';
      return porchPrompt(s);
    },
    step(ev) {
      const snap = structuredClone(state);
      state = noteMotion(state, ev);
      const changed = state.sprigWallet !== snap.sprigWallet || state.npcHold !== snap.npcHold || state.you !== snap.you || state.hold !== snap.hold || state.budget !== snap.budget || state.gateHoles !== snap.gateHoles || state.stoolHold !== snap.stoolHold || state.salvageHold !== snap.salvageHold || state.scrap !== snap.scrap || state.stool?.state !== snap.stool?.state || state.stool?.consent !== snap.stool?.consent || state.stool?.used !== snap.stool?.used || JSON.stringify(state.salvage?.items?.map((item) => [item.id, item.state, item.consent, item.used, item.owner])) !== JSON.stringify(snap.salvage?.items?.map((item) => [item.id, item.state, item.consent, item.used, item.owner])) || (state.gateJob && state.gateJob.id) !== (snap.gateJob && snap.gateJob.id) || (state.stoolJob && state.stoolJob.id) !== (snap.stoolJob && snap.stoolJob.id) || state.stoolJob?.phase !== snap.stoolJob?.phase || (state.salvageJob && state.salvageJob.id) !== (snap.salvageJob && snap.salvageJob.id);
      if (changed && held?.setItem) {
        const saved = store(held, state, gen);
        if (!saved.ok) { state = snap; state.notice = 'This tab lost the grove save race. The live town save was not written.'; }
        else gen = saved.gen;
      }
      paint();
    },
    tryAct(x, y, volunteer) {
      const st = atStation(x, y);
      if (!st) return false;
      const next = structuredClone(state);
      const r = actAt(next, st.id, { volunteer: !!volunteer });
      if (!held?.setItem) { state = r.state; paint(); return true; }
      const saved = store(held, r.state, gen);
      if (!saved.ok) { state.notice = 'This tab lost the grove save race. The live town save was not written.'; paint(); return true; }
      state = r.state;
      gen = saved.gen;
      paint();
      return true;
    },
    art: () => stationArt(state),
    props() {
      const s = state;
      const art = stationArt(s);
      const g = sprigPos(s);
      const station = (st, file, w, h, extra) => ({
        y: st.y,
        d: (c) => { blit(c, file, st.x - w / 2, st.y - h, w, h); extra?.(c, st); },
      });
      const out = [
        station(STATIONS.stump, art.stump, 32, 36, art.stumpMarks ? (c, st) => marks(c, st.x, st.y - 20, art.stumpMarks) : null),
        station(STATIONS.saw, art.saw, 32, 36),
        station(STATIONS.shed, art.shed, 32, 40, art.shedMarks ? (c, st) => marks(c, st.x, st.y - 22, art.shedMarks) : null),
        station(STATIONS.porch, art.porch, 32, 24),
        { y: STATIONS.gate.y, d: (c) => {
          const st = STATIONS.gate;
          const worn = s.gateHoles > 0;
          c.fillStyle = '#3f2715';
          c.fillRect(st.x - 18, st.y - 34, 5, 34);
          c.fillRect(st.x + 13, st.y - 34, 5, 34);
          c.fillStyle = '#6b4423';
          c.fillRect(st.x - 18, st.y - 34, 36, 5);
          c.fillStyle = worn ? '#e2c48a' : '#8d5a32';
          if (worn) c.fillRect(st.x - 12, st.y - 22, 10, 5);
          else { c.fillRect(st.x - 13, st.y - 24, 26, 4); c.fillRect(st.x - 13, st.y - 14, 26, 4); }
          c.font = '8px Silkscreen, monospace';
          c.textAlign = 'center';
          c.fillStyle = '#fff6e0';
          c.fillText(worn ? 'WORN GATE' : 'GATE FIXED', st.x, st.y - 40);
        } },
        { y: STATIONS.stool.y, d: (c) => {
          const st = STATIONS.stool;
          const item = s.stool;
          if (!item || item.state === 'scrapped' || item.state === 'donated' || s.stoolJob) return;
          c.fillStyle = '#4a2c14';
          c.fillRect(st.x - 8, st.y - 10, 3, 10);
          c.fillRect(st.x + 5, st.y - 10, 3, 10);
          c.fillStyle = item.state === 'restored' ? '#8d5a32' : '#e2c48a';
          c.fillRect(st.x - 10, st.y - 14, item.state === 'restored' ? 20 : 10, 4);
          c.font = '8px Silkscreen, monospace';
          c.textAlign = 'center';
          c.fillStyle = '#fff6e0';
          c.fillText(item.state === 'restored' ? 'STOOL' : 'BROKEN STOOL', st.x, st.y - 32);
        } },
        { y: STATIONS.bin.y, d: (c) => {
          const st = STATIONS.bin;
          const [bw, bh] = SALVAGE_DRAW.world;
          if (artReady('scrap-bin')) blit(c, 'scrap-bin', st.x - bw / 2, st.y - bh, bw, bh);
          else { c.fillStyle = '#3f2715'; c.fillRect(st.x - 8, st.y - 8, 16, 8); }
          if (binFleck(s)) { c.fillStyle = '#c4a574'; c.fillRect(st.x - 3, st.y - 12, 6, 4); }
          c.font = '8px Silkscreen, monospace';
          c.textAlign = 'center';
          c.fillStyle = '#fff6e0';
          c.fillText('SCRAP', st.x, st.y - 16);
        } },
        { y: STATIONS.gift.y, d: (c) => {
          const st = STATIONS.gift;
          c.fillStyle = '#4a2c14';
          c.fillRect(st.x - 2, st.y - 16, 4, 16);
          if (s.stool?.state === 'delivered' || s.stool?.state === 'donated') { c.fillStyle = '#8d5a32'; c.fillRect(st.x - 8, st.y - 20, 16, 4); }
          if (s.fuku) { c.fillStyle = '#c45a3a'; c.fillRect(s.fuku.x - 4, s.fuku.y - 12, 8, 12); }
          c.font = '8px Silkscreen, monospace';
          c.textAlign = 'center';
          c.fillStyle = '#fff6e0';
          c.fillText(s.stool?.used ? 'FUKU SAT' : 'FUKU BENCH', st.x, st.y - 26);
        } },
        ...((s.salvage?.items || []).flatMap((item) => {
          const st = STATIONS[item.station];
          if (!st) return [];
          const carrying = carryingSalvage(s, item);
          const sheet = salvageSheet(item, carrying);
          const placed = (item.state === 'delivered' || item.state === 'donated') && !carrying;
          const dest = STATIONS[item.drop];
          const nudge = dest ? (SALVAGE_DRAW.placedNudge[item.drop] || 0) : 0;
          const [sw, sh] = SALVAGE_DRAW.world;
          const paintBody = (c, anchor, file) => {
            if (file && artReady(file)) blit(c, file, anchor.x - sw / 2, anchor.y - sh, sw, sh);
            else if (file) {
              c.fillStyle = item.state === 'restored' ? '#8d5a32' : '#e2c48a';
              c.fillRect(anchor.x - 8, anchor.y - 12, 16, 8);
            }
          };
          const props = [{ y: st.y, d: (c) => {
            c.font = '8px Silkscreen, monospace';
            c.textAlign = 'center';
            c.fillStyle = '#fff6e0';
            if (item.state === 'scrapped') { c.fillText('SCRAPPED', st.x, st.y - 18); return; }
            if (!placed) paintBody(c, st, sheet);
            if (item.mark && !carrying) { c.fillStyle = '#c45a3a'; c.fillRect(item.mark.x - 3, item.mark.y - 10, 6, 10); }
            if (!placed) {
              const word = item.state === 'incoming' ? item.owner.toUpperCase() : item.state === 'restored' ? 'FIXED' : 'BROKEN';
              c.fillStyle = '#fff6e0';
              c.fillText(word, st.x, st.y - SALVAGE_DRAW.setOutLabel);
            }
          } }];
          if (placed && dest) props.push({ y: dest.y + SALVAGE_DRAW.placedSortAhead, d: (c) => {
            const anchor = { x: dest.x + nudge, y: dest.y };
            paintBody(c, anchor, sheet);
            c.font = '8px Silkscreen, monospace';
            c.textAlign = 'center';
            c.fillStyle = '#fff6e0';
            const word = item.state === 'donated' ? `${item.owner.toUpperCase()} HAS` : item.owner.toUpperCase();
            c.fillText(word, anchor.x, dest.y - SALVAGE_DRAW.dropLabel);
          } });
          return props;
        })),
        { y: g.y + 18, d: (c) => { c.fillStyle = '#3f2715'; c.fillRect(g.x - 4, g.y + 2, 8, 10); if (s.gateJob?.worker === 'sprig') blit(c, 'carry-boards', g.x - 6, g.y - 16, 12, 12); } },
      ];
      if ((art.carry || s.gateJob?.worker === 'you') && s.play?.x != null) {
        const fx = s.play.x, fy = s.play.y;
        const file = art.carry || 'carry-boards';
        out.push({ y: fy + 8, d: (c) => blit(c, file, fx - 6, fy - 26, 12, 12) });
      }
      return out;
    },
  };
}
