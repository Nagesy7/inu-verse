// Placeholder per-place onboarding mascots (drawn in the hub once that place is complete).
// Labels say "placeholder · Inu Art Studio" so real art can drop in later without blocking.
import { TILE } from './world.js';
import { placeById, stepPlace } from './guide.js';
import { activeMascots, PLACE_QUESTS } from './onboard.js';
import { artKey } from './art.js';

// Stand slightly off the place's stand tile so the mascot doesn't cover the door.
const OFFSET = {
  launch: [1.2, 0.2], bank: [-1.1, 0.3], mall: [1.4, 0.2], arcade: [-1.2, 0.2],
  shuttle: [1.0, 0.4], rescue: [1.1, 0.2], quest: [-1.1, 0.2], cafe: [1.2, 0.3],
  home: [1.4, 0.4], market: [-1.0, 0.3], leaders: [1.1, 0.2], board: [-1.2, 0.4],
};

function standOf(state, place) {
  if (place === 'home') return stepPlace(state, { place: 'home' });
  return placeById(state, place);
}

/** World actors for onboarded place mascots (fed into the same actor list as NPCs). */
export function mascotActors(state, t) {
  if (!state) return [];
  const out = [];
  for (const m of activeMascots(state)) {
    const p = standOf(state, m.place); if (!p) continue;
    const [dx, dy] = OFFSET[m.place] || [1.1, 0.3];
    const x = (p.tx + 0.5 + dx) * TILE, y = (p.ty + 0.5 + dy) * TILE;
    out.push({
      x, y, coat: m.coat || 'cream', outfit: {}, face: Math.sin(t * 1.4 + (m.questId || '').length) > 0 ? 'left' : 'right',
      phase: t * 5, moving: false, name: m.name, wag: 0.6 + 0.4 * Math.sin(t * 3 + x),
      art: artKey(m.coat || 'cream'), onboardMascot: true, mascotLabel: m.label || 'placeholder · Inu Art Studio',
      mascotPlace: m.place, mascotTitle: m.title,
    });
  }
  return out;
}

/** Tiny floating tag above a mascot (drawn after the Shiba, screen-scale already applied by caller). */
export function drawMascotTag(ctx, a) {
  if (!a?.onboardMascot) return;
  const label = a.mascotLabel || 'placeholder · Inu Art Studio';
  ctx.save();
  ctx.font = '7px Silkscreen, monospace'; ctx.textAlign = 'center';
  const w = Math.max(ctx.measureText(label).width, ctx.measureText(a.name || '').width) + 10;
  ctx.fillStyle = '#141a2ecc'; ctx.fillRect(-w / 2, -58, w, 20);
  ctx.fillStyle = '#ffd84a'; ctx.fillText(a.name || 'Mascot', 0, -46);
  ctx.fillStyle = '#c9d6e8'; ctx.fillText(label, 0, -36);
  ctx.restore();
}

export const PLACE_COUNT = PLACE_QUESTS.length;
