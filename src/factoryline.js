// Cosmetic car line. It does not mint cars, spend planks, or touch Bones.
export const FACTORY_COLOURS = Object.freeze(['gold', 'green', 'teal']);
export const FACTORY_LINE = Object.freeze([
  { id: 'weld', who: 'rivet', frames: 4, ms: [180, 140, 200, 160], car: 'chassis', work: 'weld', slot: [30, 24] },
  { id: 'wheels', who: 'lug', frames: 4, ms: [240, 200, 260, 220], car: 'wheels', work: 'fit', slot: [126, 24] },
  { id: 'drop', who: null, frames: 2, ms: [260, 200], car: 'drop', work: null, slot: [128, 92] },
  { id: 'paint', who: 'gloss', frames: 4, ms: [220, 220, 220, 320], car: 'paint', work: 'paint', slot: [128, 92] },
  { id: 'check', who: 'gloss', frames: 4, ms: [300, 260, 180, 420], car: 'painted', work: 'check', slot: [30, 92] },
  { id: 'roll', who: null, frames: 4, ms: [140, 140, 140, 140], car: 'finished', work: null, slot: [46, 104] },
]);

const CYCLE = FACTORY_LINE.reduce((sum, stage) => sum + stage.ms.reduce((a, b) => a + b, 0), 0);

export function factoryFrame(ms) {
  const t = ((ms % CYCLE) + CYCLE) % CYCLE;
  const colour = FACTORY_COLOURS[Math.floor(Math.abs(ms) / CYCLE) % FACTORY_COLOURS.length];
  let left = t;
  for (const stage of FACTORY_LINE) {
    for (let frame = 0; frame < stage.frames; frame++) {
      const dur = stage.ms[frame];
      if (left < dur) {
        return { stage: stage.id, who: stage.who, frame, colour, slot: stage.slot, car: stage.car, work: stage.work, ms: dur };
      }
      left -= dur;
    }
  }
  const last = FACTORY_LINE[FACTORY_LINE.length - 1];
  return { stage: last.id, who: last.who, frame: 0, colour, slot: last.slot, car: last.car, work: last.work, ms: last.ms[0] };
}

export { CYCLE as FACTORY_CYCLE };
