// CORS for Launch Hall APIs called from the Inu hub (kibble-pay) without a Verse session.
// Browser Origin must match; same-origin Verse hall.html needs no CORS.
const ALLOW = [
  /^https:\/\/kibble-pay\.vercel\.app$/,
  /^https:\/\/kibble-pay-[a-z0-9-]+\.vercel\.app$/,
  /^https:\/\/inu-verse([a-z0-9-]*)?\.vercel\.app$/,
  /^http:\/\/localhost(:\d+)?$/,
  /^http:\/\/127\.0\.0\.1(:\d+)?$/,
];
export function originAllowed(origin) {
  const o = String(origin || "");
  return ALLOW.some((r) => r.test(o));
}
/** Set CORS headers when Origin is allowed. Returns true if this was a preflight that was answered. */
export function applyCors(req, res) {
  const o = String(req.headers?.origin || "");
  if (!originAllowed(o)) return false;
  res.setHeader("Access-Control-Allow-Origin", o);
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET,POST,OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "content-type,authorization,x-admin-token");
  res.setHeader("Access-Control-Max-Age", "86400");
  if (req.method === "OPTIONS") { res.statusCode = 204; res.end(); return true; }
  return false;
}
