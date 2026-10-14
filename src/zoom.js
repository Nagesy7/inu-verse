// World zoom levels. Every level keeps native tile pixels at an integer device scale (native px x2 world x zoom = 4, 2, 1).
export const ZOOMS = [2, 1, 0.5], DEFAULT_ZOOM = 2;
export function stepZoom(z, dir) { const i = ZOOMS.indexOf(z), j = Math.max(0, Math.min(ZOOMS.length - 1, (i < 0 ? 0 : i) + (dir > 0 ? -1 : 1))); return ZOOMS[j]; } // dir>0 = zoom in
// Clamp the camera centre so the view never shows past the map edge (centre the map when it is smaller than the view).
export function clampCam(cx, cy, viewW, viewH, mapW, mapH) {
  const x = mapW <= viewW ? mapW / 2 : Math.max(viewW / 2, Math.min(mapW - viewW / 2, cx)), y = mapH <= viewH ? mapH / 2 : Math.max(viewH / 2, Math.min(mapH - viewH / 2, cy)); return { x, y }; }
