import { applyCors } from "./_lib/cors.js";
// Public client config for Inu Verse. Only PUBLIC values: the Phantom Portal App ID is meant to be visible in the browser.
//   PHANTOM_APP_ID        Phantom Portal app ID (enables "Sign in with Google/Apple" embedded wallets). Unset -> buttons say "coming soon".
//   PHANTOM_REDIRECT_URL  OAuth redirect, must exactly match Phantom Portal (default https://inu-verse-tawny.vercel.app/).
//   REALTIME_URL          live multiplayer server (wss://inu-verse-realtime.<account>.workers.dev). Unset -> realtimeUrl null -> solo play.
export const realtimeUrlOf = (env = process.env) => { const u = String(env.REALTIME_URL || '').trim().replace(/\/+$/, '');
  return /^wss:\/\/[a-z0-9.-]+(?::\d+)?(\/[\w./-]*)?$/i.test(u) ? u : null; };
export function publicConfig(env = process.env) {
  const appId = String(env.PHANTOM_APP_ID || "").trim();
  return { phantomAppId: /^[A-Za-z0-9-]{8,64}$/.test(appId) ? appId : null, redirectUrl: env.PHANTOM_REDIRECT_URL || "https://inu-verse-tawny.vercel.app/",
    socialLogin: /^[A-Za-z0-9-]{8,64}$/.test(appId), metadataStorage: env.PINATA_JWT ? "ipfs" : (env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL) ? "hosted" : null, cluster: "mainnet-beta", realtimeUrl: realtimeUrlOf(env) };
}
export default function handler(req, res) { if (applyCors(req, res)) return; res.statusCode = 200; res.setHeader("content-type", "application/json"); res.setHeader("cache-control", "public, max-age=60"); res.end(JSON.stringify(publicConfig())); }
