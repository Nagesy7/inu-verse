// Paw Audit Bureau static scan over src/sim/** and api/sim*. Used by tests/sim-*.test.mjs and by scripts/sim-audit.mjs,
// which freezes the result into src/sim/audit-static.js (the browser and /api/sim-audit can't read source files).
// The denylist block in src/sim/firewall.js (FIREWALL-DENYLIST-BEGIN..END) is the only text skipped: it IS the list.
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative, dirname, resolve, posix } from 'node:path';
import { createHash } from 'node:crypto';
export const SNAPSHOT = 'src/sim/audit-static.js';
export const ALLOWED_OUTSIDE = ['src/main.js', 'src/world.js'];
export const API_LIBS = ['api/_lib/kv.js']; // api/sim* may also use the generic Upstash client (keys are still built only by src/sim/anchor.js K.*)
export const STORE_KEYS = ['STORE_KEY', 'OPT_IN_KEY']; // the only localStorage keys sim code may write ('inu.sim.*') // the two hooks: world.js places the desk, main.js draws it and opens the panel
export const PATTERNS = {
  prize: [/inu-?score/i, /kibble-?pay/i, /\/api\/(raid|pools?|boards?|leader\w*|payouts?|kennel|inventory|pay|scores?|prizes?|claim|burn|wall)\b/i, /\b(inuScore|claimPresDrop|poolEntries|boardRows|refreshPools|recordBurn|payout|rollPeriods|buyMallItem)\s*\(/],
  economy: [/\b(bones|kibble)\s*([+\-*/]?=(?!=)|\+\+|--)/i, /\.\s*(bones|kibble)\b\s*([+\-*/]?=(?!=)|\+\+|--)/i, /\[\s*['"`](bones|kibble)['"`]\s*\]\s*([+\-*/]?=(?!=)|\+\+|--)/i, /swapBonesToKibble|BONES_PER_KIBBLE|START_BONES|START_KIBBLE|feeSplit|settle\w*\(/],
  network: [/\bfetch\s*\(/, /XMLHttpRequest/, /WebSocket/, /sendBeacon/, /EventSource/, /\bimport\s*\(/, /\brequire\s*\(/],
  wallet: [/signTransaction|signAllTransactions|signMessage|signAndSend|secretKey|privateKey|mnemonic|seed\s*phrase|window\.solana|phantom|@solana|Keypair|connectWallet/i],
  gambling: [/Math\.random/, /\bbet(s|ting)?\b/i, /wager/i, /lotter/i, /raffle/i, /gacha/i, /loot\s*box/i, /jackpot/i, /casino/i],
};
export const CONVERSION_NAME = /convert|exchange|swap|cash|withdraw|redeem|sell|bridge|to_?(bones|kibble)|payout|deposit|bank|trade|gift|transferOut/i;
const walk = (d) => readdirSync(d).flatMap((f) => { const p = join(d, f); return statSync(p).isDirectory() ? walk(p) : [p]; });
const strip = (src) => src.replace(/\/\/ FIREWALL-DENYLIST-BEGIN[\s\S]*?\/\/ FIREWALL-DENYLIST-END/, '');
const importsOf = (src) => [...src.matchAll(/^\s*(?:import|export)\s[^;'"]*?from\s*['"]([^'"]+)['"]|^\s*import\s*['"]([^'"]+)['"]/gm)].map((m) => m[1] || m[2]);

export function simFiles(root) {
  const sim = walk(join(root, 'src/sim')).filter((f) => /\.m?js$/.test(f)), api = readdirSync(join(root, 'api')).filter((f) => /^sim/.test(f)).map((f) => join(root, 'api', f));
  return [...sim, ...api].map((f) => relative(root, f).split('\\').join('/')).filter((f) => f !== SNAPSHOT).sort();
}
export function scan(root = process.cwd()) {
  const files = simFiles(root), out = { files: [], imports: { violations: [] }, kvKeys: [], storage: [], prize: [], economy: [], network: [], wallet: [], gambling: [], conversion: [], routes: [], outside: [], allowedOutside: ALLOWED_OUTSIDE, context: {} };
  const hash = createHash('sha256');
  for (const f of files) {
    const raw = readFileSync(join(root, f), 'utf8'), src = f === 'src/sim/firewall.js' ? strip(raw) : raw; hash.update(f + '\0' + raw + '\0');
    out.files.push(f);
    for (const spec of importsOf(src)) { const target = posix.normalize(posix.join(posix.dirname(f), spec));
      if (!spec.startsWith('.') || !(target.startsWith('src/sim/') || (f.startsWith('api/') && API_LIBS.includes(target)))) out.imports.violations.push({ file: f, spec }); }
    // storage writes: every kv write/read key must come from anchor.js K.*; every localStorage write must use a sim key constant
    for (const m of src.matchAll(/\bkv\.(get|set|setNX|del)\(\s*([^,)]+)/g)) if (!/^K\.[a-zA-Z]+\(/.test(m[2].trim())) out.kvKeys.push({ file: f, call: m[0] });
    for (const m of src.matchAll(/\.(setItem|removeItem)\(\s*([^,)]+)/g)) if (!STORE_KEYS.includes(m[2].trim())) out.storage.push({ file: f, call: m[0] });
    for (const m of src.matchAll(/['"`](inu(?:verse)?[.-][\w.-]+)['"`]/g)) if (!m[1].startsWith('inu.sim.')) out.storage.push({ file: f, key: m[1] });
    src.split('\n').forEach((line, i) => { for (const [k, res] of Object.entries(PATTERNS)) for (const re of res) if (re.test(line)) out[k].push({ file: f, line: i + 1, rule: String(re) }); });
    for (const m of src.matchAll(/^\s*export\s+(?:const|let|var|function\*?|class|async\s+function)\s+([A-Za-z_$][\w$]*)/gm)) if (CONVERSION_NAME.test(m[1])) out.conversion.push({ file: f, name: m[1] });
    for (const m of src.matchAll(/^\s*export\s*\{([^}]*)\}/gm)) for (const n of m[1].split(',').map((x) => x.split(/\s+as\s+/).pop().trim()).filter(Boolean)) if (CONVERSION_NAME.test(n)) out.conversion.push({ file: f, name: n });
    if (f.startsWith('api/')) out.routes.push({ file: f, writes: /req\.method\s*===?\s*['"](POST|PUT|PATCH|DELETE)|req\.body|\.set\(|setNX|upstashKv/.test(src), via: [...new Set(importsOf(src))].sort() });
  }
  // who outside the sim imports it (only the two hooks may, and never the currency, engine or ledger)
  for (const f of [...walk(join(root, 'src')), ...walk(join(root, 'api'))].map((p) => relative(root, p).split('\\').join('/')).filter((p) => /\.m?js$/.test(p) && !p.startsWith('src/sim/') && !/^api\/sim/.test(p) && !p.startsWith('src/vendor/'))) {
    const src = readFileSync(join(root, f), 'utf8'), im = importsOf(src).filter((s) => /(^|\/)sim\//.test(s)); if (im.length) out.outside.push({ file: f, imports: im }); }
  // main-game context the Bureau reports on (not violations: the main game may touch its own economy)
  const rd = (p) => existsSync(join(root, p)) ? readFileSync(join(root, p), 'utf8') : '';
  out.context.presidentTip = /state\.bones\s*=/.test(rd('src/president.js'));
  out.context.bonesSwap = /export function swapBonesToKibble/.test(rd('src/game.js'));
  out.context.randomPaid = walk(join(root, 'src')).filter((p) => /\.js$/.test(p) && !p.includes('/vendor/') && !p.includes('/sim/')).filter((p) => /(mystery|loot|gacha|lucky)\s*(box|crate|chest|draw)/i.test(readFileSync(p, 'utf8'))).map((p) => relative(root, p));
  out.fingerprint = hash.digest('hex').slice(0, 16);
  return out;
}
