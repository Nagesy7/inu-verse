// Mainnet DRY RUN of the $KIBBLE-paired launch route. Simulation only: nothing is ever signed or sent.
// The "player" is a public, funded mainnet address used purely as a simulated fee payer (sigVerify is off).
//   node scripts/kibble-route-sim.mjs                      → builds locally with the public Solana RPC
//   node scripts/kibble-route-sim.mjs https://inu-verse-tawny.vercel.app → asks the live /api/launch to build + dry-run
import crypto from 'node:crypto'; import fs from 'node:fs';
import kit from '../api/_lib/pumpkit.cjs';
const PAYER = process.env.SIM_PAYER || '9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM';
const freshPub = () => new kit.PublicKey(crypto.generateKeyPairSync('ed25519').publicKey.export({ format: 'der', type: 'spki' }).subarray(-32)).toBase58(); // public half only; the private half is discarded
const base = process.argv[2];
const cases = [{ label: '$KIBBLE default + 0.01 SOL opening swap', pair: 'KIBBLE', devBuySol: 0.01, slippageBps: 300 }, { label: '$KIBBLE default, create only', pair: 'KIBBLE', devBuySol: 0 }, { label: 'SOL pair + 0.01 SOL', pair: 'SOL', devBuySol: 0.01 }];
const out = [];
for (const c of cases) {
  const body = { action: 'build', player: PAYER, mint: freshPub(), name: 'Sim Puppy', symbol: 'SIMP', uri: 'https://ipfs.io/ipfs/bafkreisimulationonly', ...c }; delete body.label;
  let r;
  if (base) r = await (await fetch(base.replace(/\/$/, '') + '/api/launch', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) })).json();
  else { const { buildCreateTx, rpcDeps, validateBuild } = await import('../api/_lib/launchtx.js'); r = await buildCreateTx(validateBuild(body).v, rpcDeps(process.env.SIM_RPC || 'https://api.mainnet-beta.solana.com')); }
  const tx = r.tx ? kit.VersionedTransaction.deserialize(Buffer.from(r.tx, 'base64')) : null;
  const row = { case: c.label, ok: r.simulation?.ok ?? null, err: r.simulation?.err || r.error || null, units: r.simulation?.units, size: r.size ?? (tx ? tx.serialize().length : null), signers: r.signers, unsigned: tx ? tx.signatures.every((s) => s.every((b) => b === 0)) : null,
    lookupTable: r.lookupTable ?? null, minOut: r.minOut ?? null, route: r.route };
  out.push(row); console.log(`\n== ${c.label}: dry run ${row.ok ? 'OK' : 'FAILED'} · ${row.units} CU · ${row.size} bytes · unsigned=${row.unsigned}`);
  for (const s of r.route?.steps || []) console.log(`  ${s.in} → ${s.out} (${s.venue})`);
  for (const f of r.route?.fees || []) console.log(`  · ${f.label}: ${f.amount ?? '—'}`); if (r.route?.total) console.log(`  = wallet SOL change ${r.route.total.text}`);
}
fs.mkdirSync('proof', { recursive: true }); fs.writeFileSync('proof/mt-route-sim.json', JSON.stringify({ at: new Date().toISOString(), source: base || 'local builder + public RPC', note: 'simulation only; nothing signed or sent', results: out }, null, 1));
process.exit(out.every((r) => r.ok) ? 0 : 1);
