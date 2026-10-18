// No-extension coin launch (client side). Wallets: Phantom embedded (Sign in with Google/Apple via Phantom Connect SDK) or
// the Phantom browser extension. The server only builds an UNSIGNED pump.fun transaction; this module:
//   1. uploads public metadata, 2. generates the new mint keypair HERE in the browser (never sent anywhere),
//   3. asks the server to build the create tx for {player pubkey, mint PUBLIC key}, 4. checks the tx (player pays/creates,
//   only player + mint sign, nothing pre-signed), 5. has the wallet sign + send it with one tap (mint co-signs locally),
//   6. waits for confirmation and auto-registers the coin on the Hall board (creator == fee payer, checked on-chain).
import { minLamports, sol, planRoute, SLIPPAGE_CHOICES, ROUTE_ALT } from './launchcost.js';
export const KIBBLE_MINT = '4VE9sy4fEMJdZ6i7MkYPbnqDJd2oqzJQmg44WJ3opump';
let kitP = null;
export const loadKit = () => (kitP ||= import('./vendor/phantom-kit.js'));
export { minLamports, sol, planRoute, SLIPPAGE_CHOICES, ROUTE_ALT };

export function apiClient(f = globalThis.fetch, base = '') {
  const post = async (path, body) => { const r = await f(base + path, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) }); const j = await r.json().catch(() => ({})); if (!r.ok) throw Object.assign(new Error(j.error || 'request failed (' + r.status + ')'), { status: r.status }); return j; };
  const get = async (path) => { const r = await f(base + path); const j = await r.json().catch(() => ({})); if (!r.ok) throw new Error(j.error || 'request failed'); return j; };
  return {
    config: () => get('/api/config'),
    metadata: (m) => post('/api/launch', { action: 'metadata', ...m }),
    build: (b) => post('/api/launch', { action: 'build', ...b }),
    send: (tx) => post('/api/launch', { action: 'send', tx }),
    status: (sig) => get('/api/launch?sig=' + encodeURIComponent(sig)),
    balance: (a) => get('/api/launch?balance=' + encodeURIComponent(a)),
    register: (mint, signature, name, symbol) => post('/api/coins', { action: 'register', mint, signature, name, symbol }),
  };
}
export const b64ToBytes = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
export const bytesToB64 = (b) => { let s = ''; for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };

// Refuse to sign anything except what we asked for.
export function checkUnsignedTx(tx, player, mint) {
  const n = tx.message.header.numRequiredSignatures, keys = tx.message.staticAccountKeys.map((k) => k.toBase58());
  if (keys[0] !== player) throw new Error('Safety check failed: the fee payer is not your wallet.');
  const signers = keys.slice(0, n); if (signers.length !== 2 || !signers.includes(mint)) throw new Error('Safety check failed: unexpected signers.');
  if (tx.signatures.some((s) => s.some((b) => b !== 0))) throw new Error('Safety check failed: transaction was already signed.');
  return { signers };
}

// The only lookup table we accept is the public pump.fun one; a $KIBBLE dev buy must carry a slippage floor.
export function checkRoute(tx, built, { pair, devBuySol }) {
  const alts = (tx.message.addressTableLookups || []).map((l) => l.accountKey.toBase58());
  if (alts.some((a) => a !== ROUTE_ALT) || alts.length > 1) throw new Error('Safety check failed: unexpected address lookup table.');
  if (built.pair !== pair) throw new Error('Safety check failed: pair changed.');
  if (pair === 'KIBBLE' && devBuySol > 0 && !(BigInt(built.minOut || 0) > 0n)) throw new Error('Safety check failed: no slippage floor on the $KIBBLE route.');
  return { alts };
}

// Phantom extension: Phantom signs first (Phantom's multi-signer guidance), then the local mint key, then we relay the
// fully signed bytes through /api/launch (it only forwards them to Solana; it cannot change a signed tx).
export function extensionWallet(provider = globalThis.phantom?.solana) {
  return { kind: 'extension', label: 'Phantom extension', address: provider?.publicKey?.toString?.() || null,
    available: () => !!provider?.isPhantom,
    async connect() { const r = await provider.connect(); this.address = r.publicKey.toString(); return this.address; },
    async disconnect() { this.address = null; },
    async signAndSendLaunch(tx, mintKp, { api, kit }) { const signed = await provider.signTransaction(tx);
      const t = kit.VersionedTransaction.deserialize(signed.serialize()); t.sign([mintKp]); return (await api.send(bytesToB64(t.serialize()))).signature; } };
}
// Phantom embedded wallet (Google/Apple). Embedded wallets only support signAndSendTransaction and reject pre-signed txs,
// so the mint co-signs inside Phantom's presignTransaction hook, which runs in this browser tab (no server involved).
export function embeddedWallet(sdk, kit) {
  return { kind: 'embedded', label: 'Phantom (Google/Apple)', get address() { return sdk.solana?.publicKey || null; }, available: () => true,
    async connect(provider) { await sdk.connect({ provider }); return sdk.solana.publicKey; },
    async disconnect() { await sdk.disconnect(); },
    async signAndSendLaunch(tx, mintKp) { const r = await sdk.solana.signAndSendTransaction(tx, { presignTransaction: async (b64u) => {
      const t = kit.VersionedTransaction.deserialize(kit.base64urlDecode(b64u)); t.sign([mintKp]); return kit.base64urlEncode(t.serialize()); } }); return r.signature; } };
}
let sdkSingleton = null;
export async function embeddedSdk(cfg) {
  if (!cfg?.phantomAppId) return null; const kit = await loadKit();
  sdkSingleton ||= new kit.BrowserSDK({ appId: cfg.phantomAppId, providers: ['google', 'apple'], addressTypes: [kit.AddressType.solana], authOptions: { redirectUrl: cfg.redirectUrl }, autoConnect: true });
  return { sdk: sdkSingleton, kit };
}

export async function launchCoin({ form, wallet, kit, api, review = null, onStep = () => {}, sleep = (ms) => new Promise((r) => setTimeout(r, ms)), confirmTries = 40, registerTries = 12 }) {
  const player = wallet.address; if (!player) throw new Error('Connect a wallet first.');
  onStep('meta', 'Uploading your coin image + details…');
  const meta = await api.metadata({ name: form.name, symbol: form.symbol, description: form.description, twitter: form.twitter, telegram: form.telegram, website: form.website, image: form.image });
  const mintKp = kit.Keypair.generate(), mint = mintKp.publicKey.toBase58(); // stays in this tab only
  onStep('build', 'Building your pump.fun launch transaction…');
  const pair = form.pair || 'KIBBLE', devBuySol = Number(form.devBuySol) || 0;
  const built = await api.build({ player, mint, name: form.name, symbol: form.symbol, uri: meta.uri, pair, devBuySol, slippageBps: Number(form.slippageBps) || 300 });
  if (built.simulation?.ok === false || !built.tx) throw Object.assign(new Error(built.hint || 'pump.fun rejected the launch in a dry run.'), { built });
  const tx = kit.VersionedTransaction.deserialize(b64ToBytes(built.tx)); checkUnsignedTx(tx, player, mint);
  checkRoute(tx, built, { pair, devBuySol });
  // The player sees the exact route + every fee from the mainnet dry run and must confirm BEFORE the wallet opens.
  if (review) { onStep('review', 'Check the route and fees…', { built }); if (!(await review(built))) throw Object.assign(new Error('You cancelled before signing. Nothing was sent.'), { cancelled: true }); }
  onStep('sign', 'Approve the launch in Phantom…');
  const signature = await wallet.signAndSendLaunch(tx, mintKp, { api, kit });
  onStep('confirm', 'Sent! Waiting for Solana to confirm…', { signature, mint });
  let status = 'pending';
  for (let i = 0; i < confirmTries; i++) { try { const s = await api.status(signature); status = s.status; if (s.status === 'failed') throw Object.assign(new Error('The launch failed on-chain: ' + (s.err || '')), { signature }); if (s.status === 'confirmed' || s.status === 'finalized') break; } catch (e) { if (e.signature) throw e; } await sleep(1500); }
  onStep('register', 'Confirmed! Adding your coin to the Hall board…', { signature, mint });
  let registered = null, regError = null;
  for (let i = 0; i < registerTries; i++) { try { registered = await api.register(mint, signature, form.name, form.symbol); break; } catch (e) { regError = e.message; if (e.status === 403) break; await sleep(2500); } }
  onStep('done', registered ? 'Launched and listed on the Coin board!' : 'Launched! Board listing pending: ' + (regError || ''), { signature, mint, registered: !!registered });
  return { mint, signature, status, registered: !!registered, regError, built, meta };
}

// Resize the chosen image in the browser (keeps uploads small: ≤512 px, ≤400 KB).
export async function imageToDataUrl(file, max = 512) {
  const bmp = await createImageBitmap(file); const s = Math.min(1, max / Math.max(bmp.width, bmp.height));
  const c = document.createElement('canvas'); c.width = Math.max(1, Math.round(bmp.width * s)); c.height = Math.max(1, Math.round(bmp.height * s)); c.getContext('2d').drawImage(bmp, 0, 0, c.width, c.height);
  let url = c.toDataURL('image/png'); for (let q = 0.9; url.length * 0.75 > 390_000 && q > 0.3; q -= 0.15) url = c.toDataURL('image/jpeg', q);
  return url;
}
