// Cosmetic cotton chain. Boll picks, Twill weaves. No Bones and no new currency.
export const CLOTH_LINE = Object.freeze([
  { id: 'grow', who: null, frames: 5, ms: [420, 420, 420, 420, 520] },
  { id: 'pick', who: 'boll', frames: 4, ms: [180, 180, 200, 220] },
  { id: 'haul', who: null, frames: 1, ms: [700] },
  { id: 'weave', who: 'twill', frames: 4, ms: [200, 220, 240, 260] },
  { id: 'bolt', who: null, frames: 1, ms: [640] },
]);

const CYCLE = CLOTH_LINE.reduce((sum, stage) => sum + stage.ms.reduce((a, b) => a + b, 0), 0);

export function clothFrame(ms) {
  const t = ((ms % CYCLE) + CYCLE) % CYCLE;
  let left = t;
  for (const stage of CLOTH_LINE) {
    for (let frame = 0; frame < stage.frames; frame++) {
      const dur = stage.ms[frame];
      if (left < dur) return { stage: stage.id, who: stage.who, frame, ms: dur };
      left -= dur;
    }
  }
  return { stage: 'grow', who: null, frame: 0, ms: CLOTH_LINE[0].ms[0] };
}

export { CYCLE as CLOTH_CYCLE };
