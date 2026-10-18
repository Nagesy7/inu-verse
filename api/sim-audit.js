// GET /api/sim-audit: the Paw Audit Bureau report as JSON. Read-only: no body, no storage, no secrets, no player data.
// The 11 runtime checks are re-run live on every request against a fresh sandbox sim; the static half comes from the
// frozen scan in src/sim/audit-static.js (kept fresh by tests/sim-static.test.mjs).
import { buildReport } from "../src/sim/report.js";
import { STATIC } from "../src/sim/audit-static.js";
export default function handler(req, res) {
  res.setHeader("content-type", "application/json; charset=utf-8"); res.setHeader("cache-control", "public, max-age=30"); res.setHeader("access-control-allow-origin", "*");
  if (req.method !== "GET" && req.method !== "HEAD") { res.statusCode = 405; res.setHeader("allow", "GET, HEAD"); return res.end(JSON.stringify({ error: "read-only: GET only" })); }
  res.statusCode = 200; res.end(req.method === "HEAD" ? "" : JSON.stringify(buildReport(STATIC), null, 1));
}
