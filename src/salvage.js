// One-off grove salvage day. Three owned items. No day reset, no new splints.
import { CAP, MIN_ACTIVE_MS, MIN_CARRY_PX, REACH, STATIONS, WAGE, moneySum } from './grove.js';

export const SALVAGE_DAY_ID = 'grove-salvage-1';
export const SALVAGE_MAX = 3;
export const SALVAGE_CATALOG = Object.freeze([
  Object.freeze({ id: 'ume-lantern-1', owner: 'Ume', recipient: 'Fuku', fixture: 'lane-bench', station: 'ume-lantern', drop: 'gift' }),
  Object.freeze({ id: 'riku-crate-1', owner: 'Riku', recipient: 'Sprig', fixture: 'board-shed', station: 'riku-crate', drop: 'shed' }),
  Object.freeze({ id: 'koko-cushion-1', owner: 'Koko', recipient: 'Ume', fixture: 'porch-seat', station: 'koko-cushion', drop: 'porch' }),
]);

function pack(s, msg) { s.notice = msg; return { ok: true, state: s, msg }; }
function refuse(s, msg) { s.notice = msg; return { ok: false, state: s, msg }; }
const find = (s, id) => s.salvage?.items?.find((item) => item.id === id);
const specOf = (id) => SALVAGE_CATALOG.find((spec) => spec.id === id);

export function seedSalvage() {
  return {
    id: SALVAGE_DAY_ID,
    done: false,
    items: SALVAGE_CATALOG.map((spec) => {
      const st = STATIONS[spec.station];
      return {
        id: spec.id, owner: spec.owner, recipient: spec.recipient, fixture: spec.fixture,
        station: spec.station, drop: spec.drop, state: 'incoming', rung: 1, consent: null,
        used: 0, repairPaid: 0, donatePaid: 0, scrapped: 0,
        mark: st ? { x: st.x, y: st.y - 90 } : null,
      };
    }),
  };
}

function toward(mark, dest, dt) {
  const dx = dest.x - mark.x;
  const dy = dest.y - mark.y;
  const dist = Math.hypot(dx, dy);
  const step = Math.min(dist, dt * 0.04);
  if (dist > 0) { mark.x += dx / dist * step; mark.y += dy / dist * step; }
  return dist - step;
}

function finishRepair(s) {
  const job = s.salvageJob;
  const item = find(s, job?.itemId);
  if (!job || job.kind !== 'repair' || !item || item.state !== 'broken') {
    if (job) { s.budget += job.reserved || 0; s.salvageHold = 0; s.salvageJob = null; }
    return pack(s, 'That salvage item was not there to restore. Reserved splints went back. Nothing was paid.');
  }
  const spec = specOf(item.id);
  item.rung = 0;
  item.state = 'restored';
  item.owner = spec.owner;
  item.consent = null;
  item.mark = { x: STATIONS[item.station].x, y: STATIONS[item.station].y - 70 };
  const pay = job.reserved || 0;
  s.you += pay;
  s.salvageHold = 0;
  if (pay) { s.paidJobs += 1; item.repairPaid = 1; }
  s.salvageJob = null;
  return pack(s, pay
    ? `Restored ${item.id}. The broken part was used once. Returned to ${spec.owner}, not replaced. Reserved ${pay} splints paid once. Total ${moneySum(s)} of ${CAP}.`
    : `Restored ${item.id} unpaid. Returned to ${spec.owner}. No splints were issued.`);
}

function deliver(s) {
  const job = s.salvageJob;
  const item = find(s, job?.itemId);
  if (!job || job.kind !== 'donate') return refuse(s, 'No salvage delivery is reserved.');
  if (job.phase === 'use') return refuse(s, `${item?.recipient || 'The recipient'} has ${item?.id}. Pay stays reserved until they use it. A click does not pay.`);
  if (job.carryPx < MIN_CARRY_PX || job.activeMs < MIN_ACTIVE_MS) return refuse(s, 'The item has not been walked to its fixture. A click does not transfer it.');
  if (!item || item.donatePaid || item.state === 'donated' || item.state === 'scrapped') {
    s.budget += job.reserved || 0;
    s.salvageHold = 0;
    s.salvageJob = null;
    return pack(s, 'That item was already transferred or destroyed. Reserved splints went back. It was not replaced.');
  }
  const dest = STATIONS[item.drop];
  item.state = 'delivered';
  item.owner = item.recipient;
  job.phase = 'use';
  s.beneficiary = { x: dest.x - 80, y: dest.y, useMs: 0, itemId: item.id };
  return pack(s, `Custody of ${item.id} is now ${item.recipient}'s at the ${item.fixture}. Reserved ${job.reserved} splints stay reserved until they use it. Total ${moneySum(s)} of ${CAP}.`);
}

function payUse(s) {
  const job = s.salvageJob;
  const item = find(s, job?.itemId);
  if (!job || job.phase !== 'use' || !item || item.state !== 'delivered' || item.donatePaid) return s;
  const pay = job.reserved || 0;
  s.you += pay;
  s.salvageHold = 0;
  if (pay) s.paidJobs += 1;
  item.donatePaid = 1;
  item.state = 'donated';
  item.used = 1;
  s.salvageJob = null;
  s.beneficiary = null;
  s.notice = pay
    ? `${item.recipient} used ${item.id} at the ${item.fixture}. Reserved ${pay} splints paid once. Total ${moneySum(s)} of ${CAP}.`
    : `${item.recipient} used ${item.id} at the ${item.fixture}. No splints were issued.`;
  closeDay(s);
  return s;
}

function custodyBit(item) {
  if (item.state === 'scrapped') return `${item.id} scrapped`;
  if (item.state === 'donated') return `${item.owner} has ${item.id}`;
  return `${item.id} ${item.state}`;
}

export function salvageDoneLine(s) {
  const bits = (s.salvage?.items || []).map(custodyBit).join('. ');
  return `Salvage day ${SALVAGE_DAY_ID} is finished. ${bits}. No replacements and no new day.`;
}

function closeDay(s) {
  if (!s.salvage || s.salvage.done) return;
  if (s.salvage.items.every((item) => item.state === 'donated' || item.state === 'scrapped')) {
    s.salvage.done = true;
    s.notice = salvageDoneLine(s);
  }
}

export function noteSalvage(s, dt) {
  if (!s.salvage || s.salvage.done) return s;
  for (const item of s.salvage.items) {
    const st = STATIONS[item.station];
    if (!st) continue;
    if (item.state === 'incoming' && item.mark) {
      if (toward(item.mark, st, dt) <= REACH) {
        item.state = 'broken';
        item.mark = null;
        s.notice = `${item.owner} set out ${item.id}. Nothing is reserved. No splints were issued.`;
      }
    } else if (item.state === 'restored' && item.consent !== item.owner && !s.salvageJob && item.mark) {
      if (toward(item.mark, st, dt) <= REACH) {
        item.consent = item.owner;
        item.mark = null;
        s.notice = `${item.owner} agrees to give ${item.id} to ${item.recipient} for the ${item.fixture}. Nothing is reserved until it is carried.`;
      }
    }
  }
  if (s.salvageJob?.phase === 'use' && s.beneficiary) {
    const item = find(s, s.beneficiary.itemId);
    const dest = item && STATIONS[item.drop];
    if (item && dest) {
      const left = toward(s.beneficiary, dest, dt);
      if (left <= 8) {
        s.beneficiary.useMs = (s.beneficiary.useMs || 0) + dt;
        if (s.beneficiary.useMs >= MIN_ACTIVE_MS) payUse(s);
      }
    }
  }
  closeDay(s);
  return s;
}

function claimRepair(s, item, volunteer) {
  if (s.salvageJob || s.job || s.stoolJob || s.gateJob) return refuse(s, 'A haul is already open. No second wage is reserved.');
  if (item.state === 'scrapped') return refuse(s, `${item.id} was scrapped once. It is not replaced. Nothing is reserved.`);
  if (item.state === 'donated' || item.donatePaid) return refuse(s, `${item.id} was already given to ${item.recipient}. It is not replaced. Nothing is reserved.`);
  if (item.state === 'restored') return claimDonate(s, item, volunteer);
  if (item.state !== 'broken') return refuse(s, `${item.owner} has not set ${item.id} out yet. Nothing is reserved.`);
  if (!volunteer && s.budget < WAGE) return refuse(s, `Repair of ${item.id} refused before any hauling. Budget has ${s.budget} splints. A wage is ${WAGE}. No wage is reserved. The employer fund is not refilled. An unpaid repair is separate.`);
  s.seq += 1;
  const reserved = volunteer ? 0 : WAGE;
  if (reserved) s.budget -= reserved;
  s.salvageHold = reserved;
  item.owner = 'you';
  s.salvageJob = { id: s.seq, kind: 'repair', phase: 'carry', itemId: item.id, reserved, carryPx: 0, activeMs: 0 };
  return pack(s, reserved
    ? `You took ${item.id}. ${reserved} splints are reserved, not paid. Walk it to the shed. Total ${moneySum(s)} of ${CAP}.`
    : `You took ${item.id} unpaid. Nothing is reserved. Walk it to the shed.`);
}

function claimDonate(s, item, volunteer) {
  if (s.salvageJob || s.job || s.stoolJob || s.gateJob) return refuse(s, 'A haul is already open. No second wage is reserved.');
  if (item.state === 'scrapped') return refuse(s, `${item.id} was scrapped. It cannot be given away or replaced.`);
  if (item.state === 'donated' || item.donatePaid) return refuse(s, `${item.id} was already given to ${item.recipient}. Moving it again pays nothing.`);
  if (item.state !== 'restored' || item.owner !== specOf(item.id).owner) return refuse(s, `${item.id} is not back with ${specOf(item.id).owner}. Nothing is reserved.`);
  if (item.consent !== item.owner) return refuse(s, `${item.owner} has not agreed to give ${item.id} away. It stays theirs. Nothing is reserved.`);
  if (!volunteer && s.budget < WAGE) return refuse(s, `Delivery of ${item.id} refused before any hauling. Budget has ${s.budget} splints. A wage is ${WAGE}. No wage is reserved. The employer fund is not refilled. An unpaid carry is separate.`);
  s.seq += 1;
  const reserved = volunteer ? 0 : WAGE;
  if (reserved) s.budget -= reserved;
  s.salvageHold = reserved;
  item.owner = 'you';
  s.salvageJob = { id: s.seq, kind: 'donate', phase: 'carry', itemId: item.id, reserved, carryPx: 0, activeMs: 0 };
  return pack(s, reserved
    ? `${specOf(item.id).owner} agreed. You are carrying ${item.id} to ${item.recipient}. ${reserved} splints are reserved, not paid. Total ${moneySum(s)} of ${CAP}.`
    : `${specOf(item.id).owner} agreed. You are carrying ${item.id} unpaid. Nothing is reserved.`);
}

function markScrapped(s, item, msg) {
  item.state = 'scrapped';
  item.owner = null;
  item.rung = 0;
  item.scrapped = 1;
  item.consent = null;
  item.mark = null;
  const result = pack(s, msg);
  closeDay(s);
  return result;
}

function scrapCarried(s) {
  const job = s.salvageJob;
  const item = find(s, job?.itemId);
  if (!job || job.kind !== 'repair' || !item || item.state !== 'broken') {
    return refuse(s, 'No chosen salvage item is in hand. The stool is a separate scrap.');
  }
  if (job.carryPx < MIN_CARRY_PX || job.activeMs < MIN_ACTIVE_MS) {
    return refuse(s, `${item.id} has not been walked to the scrap bin. A click does not destroy it. The reserved wage stays reserved.`);
  }
  s.budget += job.reserved || 0;
  s.salvageHold = 0;
  s.salvageJob = null;
  return markScrapped(s, item, `Scrapped ${item.id} once. It was the item in hand, not the stool and not a new copy. Reserved splints went back. Nothing was paid. Total ${moneySum(s)} of ${CAP}.`);
}

export function salvageScrap(s) {
  if (!s.salvage || s.salvage.done) return null;
  if (s.salvageJob) return refuse(s, 'A salvage haul is open. Scrap is refused so the item is not copied.');
  const item = s.salvage.items.find((entry) => entry.state === 'broken');
  if (!item) return null;
  return markScrapped(s, item, `Scrapped ${item.id} once. It is not a new item and it pays nothing. Total ${moneySum(s)} of ${CAP}.`);
}

export function salvageOnAct(s, stationId, volunteer) {
  if (!s.salvage) return null;
  if (stationId === 'bin') {
    if (s.salvageJob?.kind === 'repair') return scrapCarried(s);
    if (s.stool?.state === 'broken') return null;
    return salvageScrap(s);
  }
  const item = s.salvage.items.find((entry) => entry.station === stationId);
  if (item) return claimRepair(s, item, volunteer);
  if (s.salvageJob?.kind === 'repair' && stationId === 'shed') {
    if (s.salvageJob.carryPx < MIN_CARRY_PX || s.salvageJob.activeMs < MIN_ACTIVE_MS) return refuse(s, 'The salvage item has not been walked to the shed. Standing here does not restore it.');
    return finishRepair(s);
  }
  if (s.salvageJob?.kind === 'donate') {
    const carried = find(s, s.salvageJob.itemId);
    if (carried && stationId === carried.drop) return deliver(s);
  }
  if (stationId === 'shed' && !s.job && !s.stoolJob && !s.gateJob && !s.salvageJob) {
    const pile = s.salvage.items.find((entry) => entry.scrapped === 1 && !entry.boardMade);
    if (pile && (s.boards || 0) < 1) {
      pile.boardMade = 1;
      s.boards = (s.boards || 0) + 1;
      return pack(s, `Scrap from ${pile.id} became 1 shed board. The item was not remade. Pay is not reserved.`);
    }
  }
  return null;
}

export function refundSalvage(s) {
  const job = s.salvageJob;
  if (!job) return s;
  s.budget += job.reserved || 0;
  s.salvageHold = 0;
  const item = find(s, job.itemId);
  const spec = item && specOf(item.id);
  if (item && job.kind === 'repair') {
    item.state = 'broken';
    item.owner = spec.owner;
    item.rung = 1;
    item.consent = null;
    item.repairPaid = 0;
  }
  if (item && job.kind === 'donate') {
    item.state = 'restored';
    item.owner = spec.owner;
    item.used = 0;
    item.consent = spec.owner;
  }
  s.salvageJob = null;
  s.beneficiary = null;
  s.notice = 'Salvage haul dropped. The same item went back to its owner. Reserved splints went back. Nothing was paid.';
  return s;
}

export function salvageCredit(s, step, dt) {
  if (s.salvageJob?.phase === 'carry' && step > 0) {
    s.salvageJob.carryPx += step;
    s.salvageJob.activeMs += dt;
  }
}

function relatedStation(s, id) {
  if (!s.salvage) return false;
  if (id === 'bin') return true;
  return s.salvage.items.some((item) => item.station === id || item.drop === id);
}

export function salvageHint(s, id) {
  if (s.salvage?.done && relatedStation(s, id)) return salvageDoneLine(s);
  if (id === 'bin' && s.salvageJob?.kind === 'repair') {
    const carried = find(s, s.salvageJob.itemId);
    return carried
      ? `Scrap ${carried.id} here. It is the item in hand, not the stool. The reserved wage goes back. Scrap pays nothing.`
      : null;
  }
  const dropped = s.salvage?.items?.find((entry) => entry.drop === id && (entry.state === 'delivered' || entry.state === 'donated'));
  if (dropped?.state === 'donated') return `${dropped.owner} has ${dropped.id} at the ${dropped.fixture}. Used ${dropped.used}. It is not replaced. Moving it again pays nothing.`;
  if (dropped?.state === 'delivered') return `${dropped.owner} has ${dropped.id} at the ${dropped.fixture}. Pay stays reserved until they use it. A click does not pay.`;
  const item = s.salvage?.items?.find((entry) => entry.station === id);
  if (item) {
    if (item.state === 'incoming') return `${item.owner} is setting ${item.id} out. Nothing is reserved.`;
    if (s.salvageJob?.itemId === item.id && s.salvageJob.kind === 'repair') return 'Walk it to the shed to restore it, or to the scrap bin to destroy this one. The bin returns the reserved wage and pays nothing.';
    if (s.salvageJob?.itemId === item.id && s.salvageJob.kind === 'donate') return `Walk it to ${item.recipient}. Pay stays reserved until they use it.`;
    if (item.state === 'broken') return `${item.owner}'s ${item.id}. Repair reserves the wage before the walk. Scrap at the bin pays nothing.`;
    if (item.state === 'restored' && item.consent !== item.owner) return `Returned to ${item.owner}. They have not agreed to give it away. Nothing is reserved.`;
    if (item.state === 'restored') return `${item.owner} agreed. Carry it to ${item.recipient}. The wage is reserved before that walk.`;
    if (item.state === 'delivered') return `${item.recipient} has it. Pay stays reserved until they use the ${item.fixture}.`;
    if (item.state === 'donated') return `Already given to ${item.recipient}. It is not replaced. Moving it again pays nothing.`;
    return `${item.id} was scrapped once. It is not replaced.`;
  }
  if (s.salvageJob?.kind === 'donate' && s.salvage?.items?.find((entry) => entry.id === s.salvageJob.itemId)?.drop === id) {
    return 'Set the item down. Pay stays reserved until the recipient uses it.';
  }
  return null;
}

export function salvageLedger(s) {
  const items = (s.salvage?.items || []).map((item) => ({
    id: item.id, owner: item.owner, recipient: item.recipient, fixture: item.fixture,
    state: item.state, consent: item.consent, rung: item.rung, used: item.used || 0,
    repairPaid: item.repairPaid || 0, donatePaid: item.donatePaid || 0, scrapped: item.scrapped || 0,
  }));
  return {
    day: s.salvage?.id || null,
    done: !!s.salvage?.done,
    items,
    budget: s.budget || 0,
    you: s.you || 0,
    hold: s.hold || 0,
    sprigWallet: s.sprigWallet || 0,
    npcHold: s.npcHold || 0,
    stoolHold: s.stoolHold || 0,
    salvageHold: s.salvageHold || 0,
    sum: moneySum(s),
    cap: CAP,
  };
}
