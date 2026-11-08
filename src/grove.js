import { noteSalvage, refundSalvage, salvageCredit, salvageHint, salvageOnAct, seedSalvage } from './salvage.js';

// Staged town grove. Test Splints only. Not Bones, not $KIBBLE, not Pawmarks.
// Own save key. The live save inuverse.save.v1 is never read or written here.
// One chain: stump logs → saw → shed → Sprig's porch boards. One more repair: Sprig's gate.
// Repair, not a new house. The splint pool is the opening budget. Nothing in this file mints splints.
//
// Folded into this slice: a shortage names the item, where it is, and whether pay is reserved.
// A haul moves a batch of 2. The porch has two worn boards and does not wear out again.
// The gate starts with one worn board. Sprig or the player may haul it, not both.
// The wage is reserved before the walk and paid once. A second wear needs three foreground
// crossings and can happen only once. After that the gate stays fixed. This is finite, not a district.
// Queued, not built: repair-before-replace for tools and furniture with scrap returned to a pile.
// Queued, not built: one capped resident salvage day (restore, trade, or donate once for verified work).

export const SAVE_KEY = 'inuverse.preview.grove.v0';
export const LIVE_SAVE_KEY = 'inuverse.save.v1';
export const TAG = 'grove-slice-1';
export const SCRIP = 'Splints';
export const NOTE = 'TEST SPLINTS · not Bones · not $KIBBLE · not a live rule';
export const PREVIEW_LIMIT = 'Preview only. This grove save is local browser state, not a server authority. Two tabs can race one writer.';
export const STOOL_ID = 'sprig-stool-1';
export const STOOL_RECIPIENT = 'Fuku';
export const STOOL_FIXTURE = 'lane-bench';
export const BACKLOG = Object.freeze([
  'Queued: repair tools and furniture before replacing them, and return scrap to the pile. No second item is minted.',
  'Queued: one capped salvage day. Residents may restore, trade, or donate. A donation pays once, and only after the useful work is verified.',
]);
export const CAP = 24;
export const WAGE = 2;
export const BATCH = 2;
export const LOG_CAP = 8;
export const SHED_CAP = 4;
export const HOLES = 2;
export const GATE_HOLES = 1;
export const GATE_BOARDS = 1;
export const GATE_USES = 3;
export const GATE_RENEW_MAX = 1;
export const OPEN_BUDGET = 8;
export const OPEN_LOGS = 4;
export const REGEN_MS = 20000;
export const FRAME_MS = 50;
export const MAX_STEP_PX = 9;
export const MIN_CARRY_PX = 160;
export const MIN_ACTIVE_MS = 1200;
export const REACH = 36;
const T = 32;
export const STATIONS = Object.freeze({
  stump: Object.freeze({ id: 'stump', name: 'stump pile', x: 6.5 * T, y: 86.5 * T }),
  saw: Object.freeze({ id: 'saw', name: 'saw', x: 14.5 * T, y: 86.5 * T }),
  shed: Object.freeze({ id: 'shed', name: 'board shed', x: 22.5 * T, y: 86.5 * T }),
  porch: Object.freeze({ id: 'porch', name: "Sprig's porch", x: 30.5 * T, y: 86.5 * T }),
  gate: Object.freeze({ id: 'gate', name: "Sprig's gate", x: 37.25 * T, y: 86.5 * T }),
  stool: Object.freeze({ id: 'stool', name: "Sprig's stool", x: 10.5 * T, y: 84.5 * T }),
  bin: Object.freeze({ id: 'bin', name: 'scrap bin', x: 12.25 * T, y: 86.5 * T }),
  gift: Object.freeze({ id: 'gift', name: "Fuku's lane bench", x: 18.5 * T, y: 86.5 * T }),
  'ume-lantern': Object.freeze({ id: 'ume-lantern', name: "Ume's lantern", x: 2.5 * T, y: 86.5 * T }),
  'riku-crate': Object.freeze({ id: 'riku-crate', name: "Riku's crate", x: 9 * T, y: 86.5 * T }),
  'koko-cushion': Object.freeze({ id: 'koko-cushion', name: "Koko's cushion", x: 26.5 * T, y: 86.5 * T }),
});

export function seedGrove() {
  const seeded = {
    tag: TAG,
    budget: OPEN_BUDGET,
    you: 0,
    hold: 0,
    logs: OPEN_LOGS,
    boards: 0,
    holes: HOLES,
    gateHoles: GATE_HOLES,
    gateUses: 0,
    gateRenewed: 0,
    repaired: 0,
    paidJobs: 0,
    job: null,
    gateJob: null,
    sprigWallet: 0,
    npcHold: 0,
    stool: { id: STOOL_ID, owner: 'sprig', state: 'broken', rung: 1 },
    scrap: 0,
    stoolJob: null,
    stoolHold: 0,
    stoolPaid: 0,
    donatePaid: 0,
    salvage: null,
    salvageJob: null,
    salvageHold: 0,
    seq: 0,
    regenMs: 0,
    sprig: 0,
    sprigLeg: 0,
    notice: 'Walk the south lane. The stump, the saw, the shed, and the porch are one repair chain.',
    play: { lastNow: null, x: null, y: null },
  };
  seeded.salvage = seedSalvage();
  return seeded;
}

export function moneySum(s) {
  return (s.budget || 0) + (s.you || 0) + (s.hold || 0) + (s.sprigWallet || 0) + (s.npcHold || 0) + (s.stoolHold || 0) + (s.salvageHold || 0);
}

export function atStation(x, y) {
  let best = null;
  let bd = REACH;
  for (const st of Object.values(STATIONS)) {
    const d = Math.hypot(x - st.x, y - st.y);
    if (d <= bd) { bd = d; best = st; }
  }
  return best;
}

function shortage(s) {
  if (s.holes <= 0) return "Sprig's porch is repaired. No boards are taken. No splints are paid. The porch does not wear out again.";
  if (s.logs < BATCH && s.boards < BATCH) {
    return `Sprig needs ${s.holes} porch boards. Short ${BATCH} logs and ${BATCH} boards. Logs are at the stump pile (${s.logs} of ${LOG_CAP}). Boards are in the shed (${s.boards} of ${SHED_CAP}). Employer budget has ${s.budget || 0}. Pay is not reserved.`;
  }
  if ((s.budget || 0) < WAGE && (s.hold || 0) < WAGE) {
    return `Paid patch refused before any hauling. Employer budget has ${s.budget || 0} splints. A wage is ${WAGE}. No wage is reserved. An unpaid haul is separate. The employer fund is not refilled.`;
  }
  return '';
}

export function porchPrompt(s) {
  if (s.job?.status === 'logs') return `Walk the ${BATCH} logs to the saw. ${s.hold ? s.hold + " splints are reserved for Sprig's porch. Not paid yet." : 'This haul is unpaid. Nothing is reserved.'}`;
  if (s.job?.status === 'stored') return `Load the ${BATCH} boards at the shed. ${s.hold ? 'Reserved ' + s.hold + ' splints stay reserved.' : 'Nothing is reserved.'}`;
  if (s.job?.status === 'boards') return `Walk the ${BATCH} boards to Sprig's porch. ${s.hold ? 'Reserved ' + s.hold + ' splints are not paid yet.' : 'Unpaid. Nothing is reserved.'}`;
  if (s.gateJob?.worker === 'sprig') return `Sprig already reserved ${s.npcHold || s.gateJob.reserved || 0} splints for the gate board. Employer budget has ${s.budget || 0}. No second wage is reserved.`;
  if (s.gateJob?.worker === 'you') return `You already reserved ${s.hold || 0} splints for the gate board. Finish that haul. No porch wage is reserved.`;
  if (s.stoolJob) return `A stool haul already reserved ${s.stoolHold || 0} splints. No porch wage is reserved.`;
  if (s.salvageJob) return `A salvage haul already reserved ${s.salvageHold || 0} splints. No porch wage is reserved.`;
  if ((s.holes || 0) <= 0) return `Sprig's porch is repaired. No more boards. No further wage. ${s.you || 0} splints already paid stay paid. The porch does not wear out again.`;
  if ((s.logs || 0) < BATCH && (s.boards || 0) < BATCH) return `Sprig needs ${s.holes} porch boards. Stump has ${s.logs || 0} of ${LOG_CAP} logs. Shed has ${s.boards || 0} of ${SHED_CAP} boards. Employer budget ${s.budget || 0}. Nothing is reserved.`;
  if ((s.logs || 0) < BATCH) return `Sprig needs ${BATCH} logs from the stump. The stump has ${s.logs || 0} of ${LOG_CAP}. Employer budget ${s.budget || 0}. Nothing is reserved.`;
  if ((s.budget || 0) < WAGE) return `Sprig needs ${s.holes} porch boards. Employer budget has ${s.budget || 0} splints. A wage is ${WAGE}. Paid haul refused before any walking. Nothing is reserved. An unpaid haul is separate.`;
  return `Sprig needs ${s.holes} porch boards. Stump has ${s.logs} of ${LOG_CAP} logs. Batch is ${BATCH}. Employer budget ${s.budget}. Nothing is reserved until the logs are taken.`;
}

export function noticeOf(s) {
  return s.notice || shortage(s) || 'Batch of 2. Reserve the wage before the haul, or haul unpaid.';
}

function pack(s, msg) {
  s.notice = msg;
  return { ok: true, state: s, msg };
}
function refuse(s, msg) {
  s.notice = msg;
  return { ok: false, state: s, msg };
}

function claimGate(s, worker, volunteer) {
  if (s.gateJob) {
    const who = s.gateJob.worker === 'sprig' ? 'Sprig' : 'You';
    return refuse(s, `${who} already holds the gate board and ${s.gateJob.reserved} reserved splints. That board and that wage cannot be claimed twice.`);
  }
  if (s.job) return refuse(s, 'A porch haul is already open. The gate waits. No second wage is reserved.');
  if (s.gateHoles <= 0) {
    if ((s.gateRenewed || 0) >= GATE_RENEW_MAX) return refuse(s, "Sprig's gate is repaired. It will not wear again. No boards are taken. No splints are paid.");
    return refuse(s, `Sprig's gate is repaired. One more worn board appears only after ${GATE_USES} foreground crossings, and only once. Nothing is reserved now. Crossings ${s.gateUses || 0} of ${GATE_USES}.`);
  }
  if ((s.boards || 0) < GATE_BOARDS) return refuse(s, `Gate repair needs ${GATE_BOARDS} shed board. The shed has ${s.boards}. Source: the board shed. Pay is not reserved.`);
  if (!volunteer && s.budget < WAGE) return refuse(s, `Gate repair refused before any hauling. Budget has ${s.budget} splints. A wage is ${WAGE}. No wage is reserved. The employer fund is not refilled.`);
  s.boards -= GATE_BOARDS;
  s.seq += 1;
  const reserved = volunteer ? 0 : WAGE;
  if (reserved) s.budget -= reserved;
  if (worker === 'sprig') s.npcHold = reserved;
  else s.hold = reserved;
  s.gateJob = { id: s.seq, worker, status: 'haul', n: GATE_BOARDS, reserved, carryPx: 0, activeMs: 0 };
  return pack(s, reserved
    ? `${worker === 'sprig' ? 'Sprig' : 'You'} took ${GATE_BOARDS} shed board for the gate. ${reserved} splints are reserved, not paid. Walk them to the gate. Total ${moneySum(s)} of ${CAP}.`
    : `Took ${GATE_BOARDS} shed board for the gate unpaid. Nothing is reserved. No splints were issued.`);
}

function payGate(s) {
  const job = s.gateJob;
  if (!job) return refuse(s, s.gateHoles <= 0 ? "Sprig's gate is repaired. No splints are paid." : 'No gate haul is reserved. Start at the board shed.');
  if (s.gateHoles <= 0) {
    s.boards += job.n;
    s.budget += job.reserved || 0;
    if (job.worker === 'sprig') s.npcHold = 0;
    else s.hold = 0;
    s.gateJob = null;
    return pack(s, 'The gate was already repaired. The board went back to the shed. Reserved splints went back. Nothing was paid.');
  }
  s.gateHoles -= 1;
  const pay = job.reserved || 0;
  if (job.worker === 'sprig') { s.sprigWallet = (s.sprigWallet || 0) + pay; s.npcHold = 0; }
  else { s.you += pay; s.hold = 0; }
  if (pay) s.paidJobs += 1;
  s.repaired += 1;
  s.gateJob = null;
  return pack(s, pay
    ? `${job.worker === 'sprig' ? 'Sprig' : 'You'} patched 1 worn gate board. The house stays. Reserved ${pay} splints paid once. Total ${moneySum(s)} of ${CAP}.`
    : 'Patched 1 worn gate board unpaid. The house stays. No splints were issued.');
}

function claimStoolRepair(s, volunteer) {
  const item = s.stool;
  if (!item || item.id !== STOOL_ID) return refuse(s, 'Sprig\'s stool is not here. A new stool is not issued.');
  if (s.stoolJob) return refuse(s, 'That stool haul is already reserved. The same stool cannot be claimed twice.');
  if (item.state === 'scrapped') return refuse(s, 'The stool was scrapped once. Scrap is not a new stool. Nothing is reserved.');
  if (item.state === 'donated') return refuse(s, 'That stool was already donated. Moving it again pays nothing.');
  if (item.state === 'restored') return claimDonate(s, volunteer);
  if (item.state !== 'broken' || item.rung !== 1) return refuse(s, 'The stool has no rung left. No splints are reserved.');
  if (!volunteer && s.budget < WAGE) return refuse(s, `Stool repair refused before any hauling. Budget has ${s.budget} splints. A wage is ${WAGE}. No wage is reserved. The employer fund is not refilled. An unpaid repair is separate.`);
  s.seq += 1;
  const reserved = volunteer ? 0 : WAGE;
  if (reserved) s.budget -= reserved;
  s.stoolHold = reserved;
  item.owner = 'you';
  s.stoolJob = { id: s.seq, kind: 'repair', itemId: STOOL_ID, reserved, carryPx: 0, activeMs: 0 };
  return pack(s, reserved
    ? `You took Sprig's only stool ${STOOL_ID}. ${reserved} splints are reserved, not paid. Walk it to the shed. Total ${moneySum(s)} of ${CAP}.`
    : `You took Sprig's only stool unpaid. Nothing is reserved. Walk it to the shed.`);
}

function finishStoolRepair(s) {
  const job = s.stoolJob;
  if (!job || job.kind !== 'repair') return refuse(s, 'No stool repair is reserved.');
  const item = s.stool;
  if (!item || item.id !== STOOL_ID || item.state !== 'broken') {
    s.budget += job.reserved || 0;
    s.stoolHold = 0;
    s.stoolJob = null;
    return pack(s, 'The stool was not there to restore. Reserved splints went back. Nothing was paid. No second stool was made.');
  }
  item.rung = 0;
  item.state = 'restored';
  item.owner = 'sprig';
  const pay = job.reserved || 0;
  s.you += pay;
  s.stoolHold = 0;
  if (pay) { s.paidJobs += 1; s.stoolPaid = 1; }
  s.stoolJob = null;
  return pack(s, pay
    ? `Restored ${STOOL_ID}. The rung was used once. Returned to Sprig, not replaced. Reserved ${pay} splints paid once. Total ${moneySum(s)} of ${CAP}.`
    : `Restored ${STOOL_ID} unpaid. The rung was used once. Returned to Sprig. No splints were issued.`);
}

function scrapStool(s) {
  const item = s.stool;
  if (s.stoolJob) return refuse(s, 'A stool haul is open. Scrap is refused so the stool is not copied.');
  if (!item || item.state === 'scrapped') return refuse(s, 'The stool was already scrapped once. Scrap stays ' + (s.scrap || 0) + '. No second piece and no new stool.');
  if (item.state !== 'broken') return refuse(s, 'Only the broken stool can be scrapped. A restored or donated stool is not destroyed to make a copy.');
  item.state = 'scrapped';
  item.owner = null;
  item.rung = 0;
  s.scrap = 1;
  return pack(s, `Scrapped ${STOOL_ID} once. Scrap is 1. It is not a new stool. No splints were issued. Total ${moneySum(s)} of ${CAP}.`);
}

function useScrap(s) {
  if ((s.scrap || 0) < 1) return refuse(s, 'No scrap. Source: the scrap bin. A stool is not minted. Pay is not reserved.');
  s.scrap -= 1;
  s.boards = (s.boards || 0) + 1;
  return pack(s, 'The one scrap became 1 shed board. The stool was not remade. Pay is not reserved.');
}

function claimDonate(s, volunteer) {
  const item = s.stool;
  if (s.stoolJob) return refuse(s, 'That stool haul is already reserved. It cannot be claimed twice.');
  if (!item || item.state === 'scrapped') return refuse(s, 'The stool was scrapped once. It cannot be donated, and scrap is not a new stool.');
  if (!item || item.state === 'donated' || s.donatePaid) return refuse(s, `That stool was already given to ${STOOL_RECIPIENT}. Moving it again pays nothing.`);
  if (item.state !== 'restored' || item.owner !== 'sprig') return refuse(s, 'Only Sprig\'s restored stool can be given. Nothing is reserved.');
  if (item.consent !== 'sprig') return refuse(s, `Sprig has not agreed to give ${STOOL_ID} away. It stays his. Nothing is reserved.`);
  if (!volunteer && s.budget < WAGE) return refuse(s, `Donation refused before any hauling. Budget has ${s.budget} splints. A wage is ${WAGE}. No wage is reserved. The employer fund is not refilled. An unpaid carry is separate.`);
  s.seq += 1;
  const reserved = volunteer ? 0 : WAGE;
  if (reserved) s.budget -= reserved;
  s.stoolHold = reserved;
  item.owner = 'you';
  s.stoolJob = { id: s.seq, kind: 'donate', phase: 'carry', itemId: STOOL_ID, reserved, carryPx: 0, activeMs: 0 };
  return pack(s, reserved
    ? `Sprig agreed. You are carrying ${STOOL_ID} to ${STOOL_RECIPIENT}'s lane bench. ${reserved} splints are reserved, not paid. Total ${moneySum(s)} of ${CAP}.`
    : `Sprig agreed. You are carrying ${STOOL_ID} unpaid. Nothing is reserved. Walk it to ${STOOL_RECIPIENT}'s lane bench.`);
}

function finishDonate(s) {
  const job = s.stoolJob;
  const item = s.stool;
  if (!job || job.kind !== 'donate') return refuse(s, item?.state === 'donated' ? `That stool was already given to ${STOOL_RECIPIENT}. Moving it again pays nothing.` : 'No donation is reserved. Sprig has to agree first.');
  if (job.phase === 'use') return refuse(s, `${STOOL_RECIPIENT} has ${STOOL_ID} at the lane bench. Pay stays reserved until she sits and uses it. A click does not pay.`);
  if (job.carryPx < MIN_CARRY_PX || job.activeMs < MIN_ACTIVE_MS) return refuse(s, `The stool has not been walked to ${STOOL_RECIPIENT}'s lane bench. A click does not give it.`);
  if (!item || item.id !== STOOL_ID || item.state === 'donated' || s.donatePaid) {
    s.budget += job.reserved || 0;
    s.stoolHold = 0;
    s.stoolJob = null;
    return pack(s, `That stool was already given to ${STOOL_RECIPIENT}. Reserved splints went back. Moving it again pays nothing.`);
  }
  item.state = 'delivered';
  item.owner = STOOL_RECIPIENT;
  item.fixture = STOOL_FIXTURE;
  job.phase = 'use';
  s.fuku = { x: STATIONS.gift.x - 90, y: STATIONS.gift.y, useMs: 0 };
  return pack(s, `Custody of ${STOOL_ID} is now ${STOOL_RECIPIENT}'s at the lane bench. Reserved ${job.reserved} splints stay reserved until she sits and uses it. Total ${moneySum(s)} of ${CAP}.`);
}

function payDonateUse(s) {
  const job = s.stoolJob;
  const item = s.stool;
  if (!job || job.phase !== 'use' || !item || item.state !== 'delivered' || s.donatePaid) return s;
  const pay = job.reserved || 0;
  s.you += pay;
  s.stoolHold = 0;
  if (pay) s.paidJobs += 1;
  s.donatePaid = 1;
  item.state = 'donated';
  item.owner = STOOL_RECIPIENT;
  item.fixture = STOOL_FIXTURE;
  item.used = 1;
  s.stoolJob = null;
  s.notice = pay
    ? `${STOOL_RECIPIENT} sat on ${STOOL_ID} at the lane bench. Custody stays hers. Reserved ${pay} splints paid once. Total ${moneySum(s)} of ${CAP}.`
    : `${STOOL_RECIPIENT} sat on ${STOOL_ID} at the lane bench. Custody stays hers. No splints were issued.`;
  return s;
}

export function actAt(state, stationId, { volunteer = false } = {}) {
  const s = state;
  const st = STATIONS[stationId];
  if (!st) return refuse(s, 'No such grove station.');
  const salvage = salvageOnAct(s, stationId, volunteer);
  if (salvage) return salvage;
  if (stationId === 'stool') return claimStoolRepair(s, volunteer);
  if (stationId === 'bin') return scrapStool(s);
  if (stationId === 'gift') return finishDonate(s);
  if (stationId === 'shed' && s.stoolJob?.kind === 'repair') {
    if (s.stoolJob.carryPx < MIN_CARRY_PX || s.stoolJob.activeMs < MIN_ACTIVE_MS) return refuse(s, 'The stool has not been walked to the shed. Standing here does not restore it.');
    return finishStoolRepair(s);
  }
  if (stationId === 'shed' && !s.job && !s.stoolJob && (s.scrap || 0) >= 1 && (s.boards || 0) < 1) return useScrap(s);
  if (stationId === 'gate') {
    if (s.gateJob?.worker === 'sprig') return refuse(s, 'Sprig holds this gate haul. You cannot take the same board or the same wage.');
    if (!s.gateJob || s.gateJob.worker !== 'you') return refuse(s, s.gateHoles <= 0 ? "Sprig's gate is repaired. No splints are paid." : 'No gate haul is reserved. Start at the board shed.');
    if (s.gateJob.carryPx < MIN_CARRY_PX || s.gateJob.activeMs < MIN_ACTIVE_MS) return refuse(s, 'The gate board has not been walked to the gate. A click does not repair it.');
    return payGate(s);
  }
  if (stationId === 'shed' && !s.job) return claimGate(s, 'you', volunteer);
  if (s.holes <= 0 && !s.job) return refuse(s, shortage(s));
  if (stationId === 'stump' && !s.job) {
    if (s.gateJob?.worker === 'you') return refuse(s, 'You already hold the gate board and its reserved wage. Finish that haul before a porch batch. No second wage is reserved.');
    if (s.gateJob?.worker === 'sprig') return refuse(s, `Sprig already reserved ${s.npcHold || s.gateJob.reserved || 0} splints for the gate board. Employer budget has ${s.budget}. No second wage is reserved for the porch.`);
    if (s.stoolJob) return refuse(s, `A stool haul already reserved ${s.stoolHold || 0} splints. No porch wage is reserved.`);
    if (s.salvageJob) return refuse(s, `A salvage haul already reserved ${s.salvageHold || 0} splints. No porch wage is reserved.`);
    if (s.logs < BATCH) return refuse(s, `Sprig needs ${BATCH} logs for the porch. The stump pile has ${s.logs} of ${LOG_CAP}. Source: the stump. Pay is not reserved.`);
    if (!volunteer && s.budget < WAGE) return refuse(s, `Paid patch refused before any hauling. Employer budget has ${s.budget} splints. A wage is ${WAGE}. No wage is reserved. The employer fund is not refilled. Haul unpaid if you still want the boards on the porch.`);
    s.logs -= BATCH;
    s.seq += 1;
    const reserved = volunteer ? 0 : WAGE;
    if (reserved) s.budget -= reserved;
    s.hold = reserved;
    s.job = { id: s.seq, status: 'logs', n: BATCH, reserved, carryPx: 0, activeMs: 0 };
    return pack(s, reserved
      ? `Picked up ${BATCH} logs. ${reserved} splints are reserved, not paid. Walk to the saw. Total ${moneySum(s)} of ${CAP}.`
      : `Picked up ${BATCH} logs unpaid. Nothing is reserved. Walk to the saw.`);
  }
  if (!s.job) return refuse(s, shortage(s) || porchPrompt(s));
  if (stationId === 'saw' && s.job.status === 'logs') {
    if (s.job.carryPx < MIN_CARRY_PX || s.job.activeMs < MIN_ACTIVE_MS) return refuse(s, 'The logs have not been walked to the saw. Standing here does not mill them.');
    if (s.boards + BATCH > SHED_CAP) return refuse(s, `The shed holds ${s.boards} of ${SHED_CAP} boards. Source: the board shed. The logs stay in your arms. Nothing was milled.`);
    s.boards += BATCH;
    s.job.status = 'stored';
    s.job.carryPx = 0;
    s.job.activeMs = 0;
    return pack(s, `Milled ${BATCH} logs into ${BATCH} boards. They are in the shed, not paid out. Walk to the shed to load them.`);
  }
  if (stationId === 'shed' && s.job.status === 'stored') {
    if (s.boards < BATCH) return refuse(s, `The shed has ${s.boards} boards. Source: the board shed. Need ${BATCH} to load. Pay stays reserved: ${s.hold}.`);
    s.boards -= BATCH;
    s.job.status = 'boards';
    s.job.carryPx = 0;
    s.job.activeMs = 0;
    return pack(s, `Loaded ${BATCH} boards. Walk them to Sprig's porch. Reserved pay is still ${s.hold}.`);
  }
  if (stationId === 'porch' && s.job.status === 'boards') {
    if (s.job.carryPx < MIN_CARRY_PX || s.job.activeMs < MIN_ACTIVE_MS) return refuse(s, "The boards have not been walked to the porch. A click does not repair it.");
    if (s.holes <= 0) {
      s.boards += BATCH;
      const back = s.job.reserved;
      s.budget += back;
      s.hold = 0;
      s.job = null;
      return pack(s, 'The porch was already repaired. Boards returned to the shed. Reserved splints returned. Nothing was paid.');
    }
    const used = Math.min(BATCH, s.holes);
    s.holes -= used;
    if (BATCH > used) s.boards += BATCH - used;
    const pay = s.job.reserved;
    s.you += pay;
    s.hold = 0;
    if (pay) s.paidJobs += 1;
    s.repaired += used;
    s.job = null;
    return pack(s, pay
      ? `Patched ${used} worn porch boards. The house stays. Reserved ${pay} splints paid once. Total ${moneySum(s)} of ${CAP}.`
      : `Patched ${used} worn porch boards unpaid. The house stays. No splints were issued.`);
  }
  return refuse(s, `This station is not the next step. ${noticeOf(s)}`);
}

export function refundJob(s) {
  if (s.job) {
    if (s.job.status === 'logs') s.logs += s.job.n;
    if (s.job.status === 'boards') s.boards += s.job.n;
    s.budget += s.job.reserved || 0;
    s.hold = 0;
    s.job = null;
    s.notice = 'Haul dropped. Logs or boards went back. Reserved splints went back to the budget. Nothing was paid.';
  }
  if (s.gateJob) {
    s.boards = (s.boards || 0) + (s.gateJob.n || 0);
    s.budget += s.gateJob.reserved || 0;
    if (s.gateJob.worker === 'sprig') s.npcHold = 0;
    else s.hold = 0;
    s.gateJob = null;
    s.notice = 'Gate haul dropped. The board went back to the shed. Reserved splints went back to the budget. Nothing was paid.';
  }
  if (s.stoolJob) {
    s.budget += s.stoolJob.reserved || 0;
    s.stoolHold = 0;
    if (s.stool && s.stoolJob.kind === 'repair') { s.stool.state = 'broken'; s.stool.owner = 'sprig'; s.stool.rung = 1; }
    if (s.stool && s.stoolJob.kind === 'donate') {
      s.stool.state = 'restored';
      s.stool.owner = 'sprig';
      s.stool.fixture = null;
      s.stool.used = 0;
      s.fuku = null;
    }
    s.stoolJob = null;
    s.notice = 'Stool haul dropped. The same stool went back to Sprig. Reserved splints went back. Nothing was paid.';
  }
  refundSalvage(s);
  return s;
}

export function noteMotion(state, { x, y, now, input, foreground }) {
  const s = state;
  const play = s.play;
  const dt = play.lastNow == null ? 0 : now - play.lastNow;
  const step = play.x == null ? 0 : Math.hypot(x - play.x, y - play.y);
  play.lastNow = now;
  play.x = x;
  play.y = y;
  if (!foreground || dt <= 0 || dt > FRAME_MS) return s;
  if (input && step > 0 && step <= MAX_STEP_PX && s.job && (s.job.status === 'logs' || s.job.status === 'boards')) {
    s.job.carryPx += step;
    s.job.activeMs += dt;
  }
  if (input && step > 0 && step <= MAX_STEP_PX && s.gateJob?.worker === 'you') {
    s.gateJob.carryPx += step;
    s.gateJob.activeMs += dt;
  }
  if (input && step > 0 && step <= MAX_STEP_PX && s.stoolJob) {
    s.stoolJob.carryPx += step;
    s.stoolJob.activeMs += dt;
  }
  if (input && step > 0 && step <= MAX_STEP_PX) salvageCredit(s, step, dt);
  noteSalvage(s, dt);
  s.regenMs += dt;
  while (s.regenMs >= REGEN_MS && s.logs < LOG_CAP) {
    s.regenMs -= REGEN_MS;
    s.logs += 1;
  }
  if (s.stool?.state === 'delivered' && s.fuku && s.stoolJob?.phase === 'use') {
    const dest = STATIONS.gift;
    const dx = dest.x - s.fuku.x;
    const dy = dest.y - s.fuku.y;
    const dist = Math.hypot(dx, dy);
    const moved = Math.min(dist, dt * 0.04);
    if (dist > 0) { s.fuku.x += dx / dist * moved; s.fuku.y += dy / dist * moved; }
    if (dist - moved <= 8) {
      s.fuku.useMs = (s.fuku.useMs || 0) + dt;
      if (s.fuku.useMs >= MIN_ACTIVE_MS) payDonateUse(s);
    }
  }
  const before = sprigPos(s);
  if (s.gateJob?.worker === 'sprig') {
    const dest = STATIONS.gate;
    const pos = sprigPos(s);
    const dx = dest.x - pos.x;
    const dy = dest.y - pos.y;
    const dist = Math.hypot(dx, dy) || 0;
    const moved = Math.min(dist, dt * 0.04);
    s.gateJob.along = (s.gateJob.along || 0) + moved;
    s.gateJob.carryPx += moved;
    s.gateJob.activeMs += dt;
    if (dist - moved <= REACH && s.gateJob.carryPx >= MIN_CARRY_PX && s.gateJob.activeMs >= MIN_ACTIVE_MS) {
      payGate(s);
      s.sprigLeg = 4;
      s.sprig = 0;
    }
    return s;
  }
  const wantsConsent = s.stool?.state === 'restored' && s.stool.owner === 'sprig' && s.stool.consent !== 'sprig' && !s.stoolJob && !s.gateJob;
  if (wantsConsent) {
    if (!s.consentWalk) {
      const p = sprigPos(s);
      s.consentWalk = { fromX: p.x, fromY: p.y, along: 0 };
    }
    const dest = STATIONS.stool;
    const pos = sprigPos(s);
    const cdx = dest.x - pos.x;
    const cdy = dest.y - pos.y;
    const cdist = Math.hypot(cdx, cdy) || 0;
    const cmoved = Math.min(cdist, dt * 0.04);
    s.consentWalk.along = (s.consentWalk.along || 0) + cmoved;
    if (cdist - cmoved <= REACH) {
      s.stool.consent = 'sprig';
      s.consentWalk = null;
      s.notice = `Sprig agrees to give ${STOOL_ID} to ${STOOL_RECIPIENT} for the lane bench. Nothing is reserved until you carry it.`;
    }
    return s;
  }
  const route = [STATIONS.stump, STATIONS.saw, STATIONS.shed, STATIONS.porch, STATIONS.gate];
  const leg = route[s.sprigLeg % route.length];
  const nxt = route[(s.sprigLeg + 1) % route.length];
  const dx = nxt.x - leg.x;
  const dy = nxt.y - leg.y;
  const len = Math.hypot(dx, dy) || 1;
  s.sprig += dt * 0.04;
  let arrived = null;
  if (s.sprig >= len) {
    s.sprig = 0;
    s.sprigLeg = (s.sprigLeg + 1) % route.length;
    arrived = nxt.id;
    if (nxt.id === 'shed' && s.logs > BATCH && s.boards < SHED_CAP && s.boards < GATE_BOARDS && !s.job && !s.gateJob) {
      s.logs -= 1;
      s.boards += 1;
      s.notice = `Sprig stored 1 board. Stump logs ${s.logs}. Shed ${s.boards}. No splints moved. A batch of ${BATCH} is still there for a paid haul.`;
    }
    const salvageBusy = s.salvage && !s.salvage.done && (s.salvageJob || s.salvage.items.some((item) => item.state !== 'incoming' && item.state !== 'broken'));
    if (nxt.id === 'shed' && !salvageBusy && !s.job && !s.gateJob && s.gateHoles > 0 && s.boards >= GATE_BOARDS && s.budget >= WAGE) {
      const claimed = claimGate(s, 'sprig', false);
      if (claimed.ok && s.gateJob) {
        s.gateJob.fromX = nxt.x;
        s.gateJob.fromY = nxt.y;
        s.gateJob.along = 0;
      }
    }
  }
  const after = sprigPos(s);
  const moved = Math.hypot(after.x - before.x, after.y - before.y);
  if (!s.gateJob && s.gateHoles <= 0 && (s.gateRenewed || 0) < GATE_RENEW_MAX && moved > 0 && moved <= dt * 0.04 + 0.01) {
    const a = before.x - STATIONS.gate.x;
    const b = after.x - STATIONS.gate.x;
    if ((a <= 0 && b > 0) || (a >= 0 && b < 0)) {
      s.gateUses = (s.gateUses || 0) + 1;
      if (s.gateUses >= GATE_USES) {
        s.gateHoles = 1;
        s.gateRenewed = (s.gateRenewed || 0) + 1;
        s.gateUses = 0;
        s.notice = `Sprig crossed the gate ${GATE_USES} times while the town was open. One board wore. The house stays. This happens only once. No splints were issued.`;
      }
    }
  }
  if (arrived === 'shed' && !s.job && !s.gateJob && s.gateHoles > 0 && s.boards < GATE_BOARDS && s.budget < WAGE) {
    s.notice = `Gate repair refused before any hauling. Budget has ${s.budget} splints. A wage is ${WAGE}. The shed has ${s.boards} boards. No wage is reserved. The employer fund is not refilled.`;
  }
  return s;
}

export function sprigPos(s) {
  if (s.consentWalk?.fromX != null) {
    const dest = STATIONS.stool;
    const dx = dest.x - s.consentWalk.fromX;
    const dy = dest.y - s.consentWalk.fromY;
    const len = Math.hypot(dx, dy) || 1;
    const u = Math.min(1, (s.consentWalk.along || 0) / len);
    return { x: s.consentWalk.fromX + dx * u, y: s.consentWalk.fromY + dy * u };
  }
  if (s.gateJob?.worker === 'sprig' && s.gateJob.fromX != null) {
    const dest = STATIONS.gate;
    const dx = dest.x - s.gateJob.fromX;
    const dy = dest.y - s.gateJob.fromY;
    const len = Math.hypot(dx, dy) || 1;
    const u = Math.min(1, (s.gateJob.along || 0) / len);
    return { x: s.gateJob.fromX + dx * u, y: s.gateJob.fromY + dy * u };
  }
  const route = [STATIONS.stump, STATIONS.saw, STATIONS.shed, STATIONS.porch, STATIONS.gate];
  const leg = route[(s.sprigLeg || 0) % route.length];
  const nxt = route[((s.sprigLeg || 0) + 1) % route.length];
  const len = Math.hypot(nxt.x - leg.x, nxt.y - leg.y) || 1;
  const u = Math.min(1, (s.sprig || 0) / len);
  return { x: leg.x + (nxt.x - leg.x) * u, y: leg.y + (nxt.y - leg.y) * u };
}

export function stoolLedger(s) {
  const item = s.stool || {};
  return {
    preview: PREVIEW_LIMIT,
    itemId: item.id || null,
    owner: item.owner || null,
    recipient: item.owner === STOOL_RECIPIENT ? STOOL_RECIPIENT : null,
    fixture: item.fixture || null,
    consent: item.consent || null,
    state: item.state || null,
    rung: item.rung ?? null,
    used: item.used || 0,
    scrap: s.scrap || 0,
    budget: s.budget || 0,
    you: s.you || 0,
    hold: s.hold || 0,
    sprigWallet: s.sprigWallet || 0,
    npcHold: s.npcHold || 0,
    stoolHold: s.stoolHold || 0,
    sum: moneySum(s),
    cap: CAP,
  };
}
