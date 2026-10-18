// Stream reveal screen (/reveal): a fixed, published cosmetic manifest shown as a schedule first, then revealed one step
// at a time by the host. No randomness anywhere: order and contents come only from reveal/manifest.json, whose items
// hash (SHA-256 of the canonical JSON) is published in reveal/manifest.sha256 and shown on screen.
// Host keys: → / Space next · ← back · S schedule · H hide help. URL: ?step=N, ?start=<ISO time> (shows clock times),
// ?obs=green (chroma key background) or ?obs=clear (transparent for OBS browser source).
import { OUTFITS } from './outfits.js';
export function canonicalItems(items) { const sort = (v) => (Array.isArray(v) ? v.map(sort) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sort(v[k])])) : v); return JSON.stringify(sort(items)); }
export async function sha256Hex(text, subtle = globalThis.crypto?.subtle) { const b = await subtle.digest('SHA-256', new TextEncoder().encode(text)); return [...new Uint8Array(b)].map((x) => x.toString(16).padStart(2, '0')).join(''); }
export function checkManifest(m) {
  const errs = []; if (!m || m.v !== 1 || !Array.isArray(m.items) || !m.items.length) return ['manifest must be v1 with items'];
  m.items.forEach((it, i) => { if (it.step !== i + 1) errs.push(`item ${i + 1}: step must be ${i + 1}`); if (!OUTFITS[it.id]) errs.push(`item ${i + 1}: unknown cosmetic ${it.id}`); else if (OUTFITS[it.id].name !== it.name) errs.push(`item ${i + 1}: name must match the game (${OUTFITS[it.id].name})`); });
  return errs;
}
// Schedule times: only when the host passes ?start= (the manifest fixes contents and order, not the stream date).
export function scheduleTimes(m, startIso) { const t0 = Date.parse(startIso || ''); return m.items.map((_, i) => (Number.isFinite(t0) ? t0 + i * (m.intervalMin || 5) * 60_000 : null)); }
export const clampStep = (n, m) => Math.max(0, Math.min(m.items.length, Number.isFinite(+n) ? Math.floor(+n) : 0));
// step 0 = published manifest + schedule (every name visible); step k = item k shown big, items k+1.. marked coming up
export function viewModel(m, step, startIso) { const times = scheduleTimes(m, startIso);
  return { title: m.title, step, total: m.items.length, cards: m.items.map((it, i) => ({ ...it, at: times[i], revealed: i < step, current: i === step - 1 })) }; }
