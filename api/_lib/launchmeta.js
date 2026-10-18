// Coin metadata (name, ticker, image, description, socials) for a pump.fun launch.
// pump.fun's old https://pump.fun/api/ipfs upload endpoint is retired (PumpPortal docs, 2026: "no longer supported"), so:
//   1) PINATA_JWT set  -> image + metadata JSON pinned on public IPFS via Pinata (permanent, recommended)
//   2) otherwise       -> hosted by Inu Verse itself (Upstash, served from /api/launch?meta=<id> and ?img=<id>)
// No keys, wallets or tokens are involved here: this is public coin artwork and text.
import crypto from "node:crypto";
import { cleanText } from "./launchtx.js";
export const MAX_IMAGE_BYTES = 400_000;
const MIME = { "image/png": "png", "image/jpeg": "jpg", "image/gif": "gif", "image/webp": "webp" };
const url = (s) => { const t = String(s || "").trim(); if (!t) return ""; return /^https:\/\/[^\s"'<>]{3,190}$/.test(t) ? t : null; };

export function validateMeta(b = {}) {
  const errors = [], name = cleanText(b.name, 32), symbol = cleanText(b.symbol, 10).replace(/^\$/, "").toUpperCase(), description = cleanText(b.description, 500);
  if (!name) errors.push("name is required");
  if (!/^[A-Z0-9]{1,10}$/.test(symbol)) errors.push("ticker must be 1-10 letters/numbers");
  const socials = {}; for (const k of ["twitter", "telegram", "website"]) { const u = url(b[k]); if (u === null) errors.push(`${k} must be an https:// link`); else if (u) socials[k] = u; }
  const m = /^data:(image\/(?:png|jpeg|gif|webp));base64,([A-Za-z0-9+/=]+)$/.exec(String(b.image || ""));
  if (!m) errors.push("image must be a PNG, JPG, GIF or WebP");
  const bytes = m ? Buffer.from(m[2], "base64") : null;
  if (bytes && bytes.length > MAX_IMAGE_BYTES) errors.push("image too large (max 400 KB after resizing)");
  return errors.length ? { ok: false, errors } : { ok: true, v: { name, symbol, description, socials, mime: m[1], bytes } };
}
export const metaJson = (v, image) => ({ name: v.name, symbol: v.symbol, description: v.description, image, showName: true, createdOn: "https://inu-verse-tawny.vercel.app", ...v.socials });

export async function pinataUpload(v, { jwt, gateway = "https://ipfs.io/ipfs/", f = fetch }) {
  const up = async (blob, name) => { const fd = new FormData(); fd.append("network", "public"); fd.append("file", blob, name);
    const r = await f("https://uploads.pinata.cloud/v3/files", { method: "POST", headers: { authorization: "Bearer " + jwt }, body: fd });
    const j = await r.json().catch(() => ({})); if (!r.ok || !j?.data?.cid) throw new Error("IPFS upload failed (" + r.status + ")"); return gateway + j.data.cid; };
  const image = await up(new Blob([v.bytes], { type: v.mime }), `${v.symbol}.${MIME[v.mime]}`);
  const uri = await up(new Blob([JSON.stringify(metaJson(v, image))], { type: "application/json" }), `${v.symbol}.json`);
  return { uri, image, storage: "ipfs" };
}
export async function hostedUpload(v, { store, base }) {
  const id = crypto.createHash("sha256").update(v.bytes).update(JSON.stringify([v.name, v.symbol, v.description, v.socials])).digest("hex").slice(0, 32);
  const image = `${base}/api/launch?img=${id}`, uri = `${base}/api/launch?meta=${id}`;
  await store.set("launchimg:" + id, JSON.stringify({ mime: v.mime, b64: v.bytes.toString("base64") }));
  await store.set("launchmeta:" + id, JSON.stringify(metaJson(v, image)));
  return { uri, image, storage: "hosted" };
}
