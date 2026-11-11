// Cosmetic town workplaces. Display frames are fullness bands, not raw counts.
// Nothing here mints Bones or writes a currency.

export const SERVE_MS = Object.freeze([280, 240, 240, 320]);
export const LOAD_MS = Object.freeze([260, 240, 280, 300]);
export const PUMP_MS = Object.freeze([180, 180, 180, 180]);
export const BARISTA_MS = Object.freeze([220, 200, 240, 280]);
export const BREAK_MS = Object.freeze([320, 300, 340, 360]);
export const CHECKUP_MS = Object.freeze([300, 280, 320, 300]);
export const WALK_MS = Object.freeze([160, 160, 160, 160]);
export const WHEEL_MS = Object.freeze([120, 120]);

const DEMO = Object.freeze([0, 1, 3, 6]);
const KINDS = Object.freeze(['bread', 'coats', 'planks', 'metal', 'car']);

export function displayBand(n) {
  const v = Number.isFinite(n) ? Math.max(0, Math.floor(n)) : 0;
  if (v <= 0) return 0;
  if (v < 2) return 1;
  if (v < 4) return 2;
  return 3;
}

export function marketShown(ms, stocks = {}) {
  const t = Math.max(0, ms || 0);
  const kind = KINDS[Math.floor(t / 1600) % KINDS.length];
  const demo = DEMO[Math.floor(t / 400) % DEMO.length];
  const real = Number(stocks[kind]) || 0;
  return { kind, frame: displayBand(Math.max(real, demo)) };
}

function play(ms, parts) {
  const total = parts.reduce((sum, part) => sum + part.frames.reduce((a, b) => a + b, 0), 0);
  let left = ((ms % total) + total) % total;
  for (const part of parts) {
    for (let frame = 0; frame < part.frames.length; frame++) {
      const dur = part.frames[frame];
      if (left < dur) return { stage: part.id, who: part.who, frame };
      left -= dur;
    }
  }
  return { stage: parts[0].id, who: parts[0].who, frame: 0 };
}

export function cafeFrame(ms) {
  return play(ms, [
    { id: 'barista', who: 'bean', frames: BARISTA_MS },
    { id: 'break', who: 'bean', frames: BREAK_MS },
    { id: 'stand', who: null, frames: [640] },
  ]);
}

export function vetFrame(ms) {
  return play(ms, [
    { id: 'checkup', who: 'clover', frames: CHECKUP_MS },
    { id: 'stand', who: null, frames: [700] },
  ]);
}

export function depotFrame(ms) {
  return play(ms, [
    { id: 'load', who: 'dash', frames: LOAD_MS },
    { id: 'roll', who: null, frames: [WHEEL_MS[0], WHEEL_MS[1], WHEEL_MS[0], WHEEL_MS[1]] },
  ]);
}

export function powerFrame(ms) {
  return play(ms, [
    { id: 'pump', who: 'watt', frames: PUMP_MS },
    { id: 'walk', who: 'watt', frames: WALK_MS },
    { id: 'shed', who: null, frames: [900] },
  ]);
}

export function serveFrame(ms) {
  return play(ms, [
    { id: 'serve', who: 'pip', frames: SERVE_MS },
    { id: 'stand', who: null, frames: [800] },
  ]);
}
