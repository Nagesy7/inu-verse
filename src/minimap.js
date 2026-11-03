// Minimap (feature batch #3): the whole town is pre-rendered ONCE into a small base image (2 px per tile); each redraw
// just blits a player-centred window of it plus a handful of POI dots, and redraws are throttled (~8 per second, and
// only while the minimap is actually shown), so it costs next to nothing on phones.
export const S = 2;                   // px per tile on the minimap
export const VIEW_W = 128, VIEW_H = 140; // minimap canvas size (px)
export const REDRAW_MS = 125;         // at most ~8 redraws a second

// source window (in base-image px) that keeps the player centred, clamped to the map
export function miniView(ptx, pty, mapW, mapH, s = S, vw = VIEW_W, vh = VIEW_H) {
  const W = mapW * s, H = mapH * s, sx = Math.max(0, Math.min(W - vw, Math.round(ptx * s - vw / 2))), sy = Math.max(0, Math.min(H - vh, Math.round(pty * s - vh / 2)));
  return { sx: W <= vw ? 0 : sx, sy: H <= vh ? 0 : sy };
}
// throttle: redraw when visible and either enough time passed or the player moved to a new minimap pixel
export function makeMiniClock(ms = REDRAW_MS) { let last = -1e9, key = ''; return { due(now, visible, k) { if (!visible) return false; if (k !== key || now - last >= ms) { last = now; key = k; return true; } return false; }, reset() { last = -1e9; key = ''; } }; }
// minimap px -> map tile (for taps without the full map)
export const tileAt = (mx, my, view, s = S) => [Math.floor((mx + view.sx) / s), Math.floor((my + view.sy) / s)];
