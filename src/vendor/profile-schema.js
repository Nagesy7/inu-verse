// Shared Inu character profile, v1. Wallet-keyed; used by every Inu game. Pure JS, no deps (browser + node).
export const PROFILE_VERSION = 1;
export const OPTIONS = {
  coat: ["#e8a25a", "#f4e3c8", "#3a2a22", "#c8c8d0", "#d9673a", "#f2d27a", "#7a5a44", "#ffffff"],
  pattern: ["none", "spots", "saddle", "brindle", "socks", "mask"],
  eyeShape: ["round", "almond", "sleepy", "sparkle"],
  eyeColor: ["#2a1a12", "#3a6ad8", "#2f9a5a", "#c88a2a", "#8a4ad8"],
  ears: ["pointy", "floppy", "folded", "tall"],
  tail: ["curl", "fluffy", "straight", "bob"],
  markings: ["none", "star", "blaze", "freckles", "heart"],
  size: ["small", "medium", "large"],
  pronouns: ["they/them", "she/her", "he/him", "any"],
  trait: ["hardworker", "greenpaw", "charmer", "hustler"],
};
export const SIZE_SCALE = { small: 0.85, medium: 1, large: 1.15 };
export function defaultProfile(wallet = null) {
  return { v: PROFILE_VERSION, wallet, name: "Shiba", pronouns: "they/them",
    look: { coat: OPTIONS.coat[0], pattern: "none", eyeShape: "round", eyeColor: OPTIONS.eyeColor[0], ears: "pointy", tail: "curl", markings: "none", size: "medium", accent: "#ffffff" },
    outfit: { hat: null, eyes: null, neck: null, top: null, bottom: null, feet: null }, cosmetics: [], trait: "hardworker", pets: [], updatedAt: 0 };
}
const HEX = /^#[0-9a-f]{6}$/i, pick = (v, list, d) => (list.includes(v) ? v : d), str = (v, n, d) => (typeof v === "string" ? v.slice(0, n) : d), id = (v) => (typeof v === "string" && /^[\w:.-]{1,48}$/.test(v) ? v : null);
export const SLOTS = ["hat", "eyes", "neck", "top", "bottom", "feet"];
// an outfit slot is self-describing so any game can draw it without that game's catalogue: {id, kind, c, d, accent}
const slot = (o) => { if (!o) return null; if (typeof o === "string") return id(o) ? { id: o, kind: null, c: null, d: null, accent: null } : null; const i = id(o.id); if (!i) return null; const h = (v) => (HEX.test(v) ? v : null); return { id: i, kind: typeof o.kind === "string" ? o.kind.slice(0, 16) : null, c: h(o.c), d: h(o.d), accent: h(o.accent), full: !!o.full }; };
// Upgrade older versions + clamp everything to known values so any game can trust it.
export function normalizeProfile(p, wallet) {
  const d = defaultProfile(wallet ?? p?.wallet ?? null); if (!p || typeof p !== "object") return d; const L = p.look || {};
  return { v: PROFILE_VERSION, wallet: wallet ?? (typeof p.wallet === "string" ? p.wallet : null), name: str(p.name, 20, d.name).replace(/[<>]/g, "") || d.name, pronouns: pick(p.pronouns, OPTIONS.pronouns, d.pronouns),
    look: { coat: HEX.test(L.coat) ? L.coat : d.look.coat, pattern: pick(L.pattern, OPTIONS.pattern, "none"), eyeShape: pick(L.eyeShape, OPTIONS.eyeShape, "round"), eyeColor: HEX.test(L.eyeColor) ? L.eyeColor : d.look.eyeColor,
      ears: pick(L.ears, OPTIONS.ears, "pointy"), tail: pick(L.tail, OPTIONS.tail, "curl"), markings: pick(L.markings, OPTIONS.markings, "none"), size: pick(L.size, OPTIONS.size, "medium"), accent: HEX.test(L.accent) ? L.accent : "#ffffff" },
    outfit: Object.fromEntries(SLOTS.map((k) => [k, slot(p.outfit?.[k])])), cosmetics: (Array.isArray(p.cosmetics) ? p.cosmetics : []).map(id).filter(Boolean).slice(0, 64),
    trait: pick(p.trait, OPTIONS.trait, d.trait),
    pets: (Array.isArray(p.pets) ? p.pets : []).slice(0, 12).map((x) => ({ id: id(x?.id) || "pet", name: str(x?.name, 20, "Pup").replace(/[<>]/g, ""), coat: HEX.test(x?.coat) ? x.coat : d.look.coat, rare: !!x?.rare, game: id(x?.game) })),
    updatedAt: Number(p.updatedAt) || 0 };
}
