// Server side of the creator-signed declaration (src/declaration.js builds the text). Node's built-in ed25519, no deps.
import crypto from "node:crypto";
import { declarationMessage, validSplit, unb58, DECL_MAX_AGE_MS } from "../../src/declaration.js";
const SPKI = Buffer.from("302a300506032b6570032100", "hex");
export function ed25519Verify(message, sigB58, pubB58) { try { const pub = Buffer.from(unb58(pubB58)), sig = Buffer.from(unb58(sigB58)); if (pub.length !== 32 || sig.length !== 64) return false;
  return crypto.verify(null, Buffer.from(message, "utf8"), crypto.createPublicKey({ key: Buffer.concat([SPKI, pub]), format: "der", type: "spki" }), sig); } catch { return false; } }
// Checks a declaration. creator = the coin's on-chain creator (read by the caller). fresh=true also enforces the 10-minute window
// (on submit); stored declarations are re-checked later without it.
export function checkDeclaration(d, { creator, now = Date.now(), fresh = false, expectedSplit = null } = {}) {
  if (!d || typeof d !== "object") return { ok: false, reason: "no declaration" };
  if (!validSplit(d.split)) return { ok: false, reason: "split must list each wallet once and add up to 100%" };
  if (!Number.isFinite(d.issuedAt) || (fresh && Math.abs(now - d.issuedAt) > DECL_MAX_AGE_MS)) return { ok: false, reason: "declaration expired: sign a fresh one" };
  const message = declarationMessage(d);
  if (!ed25519Verify(message, d.signature, d.signer)) return { ok: false, reason: "signature does not match the signer and message" };
  if (!creator) return { ok: false, reason: "couldn't read the coin's on-chain creator", unknown: true };
  if (d.signer !== creator) return { ok: false, reason: `signer ${d.signer.slice(0, 4)}…${d.signer.slice(-3)} is not the on-chain creator ${creator.slice(0, 4)}…${creator.slice(-3)}` };
  if (expectedSplit && !sameSplitServer(expectedSplit, d.split)) return { ok: false, reason: "declared split differs from the published split" };
  return { ok: true, message };
}
const key = (s) => s.map((x) => `${x.address}:${x.bps}`).sort().join(",");
const sameSplitServer = (a, b) => key(a) === key(b);
