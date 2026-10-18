# Launch Hall: no-extension coin launch

Players can launch a real pump.fun coin from the Launch Hall's **Launch your coin** tab without a browser extension.

## Flow
1. **Wallet**: *Sign in with Google* / *Sign in with Apple* (Phantom Connect SDK embedded wallet, self-custodial, no seed handling by us), or the Phantom extension / Phantom in-app browser. The existing kibble-pay "Connect Phantom" sign-in is untouched.
2. **Top up**: wallet address + copy + QR, live SOL balance (`/api/launch?balance=`), minimum SOL needed (`src/launchcost.js`: create rent + fees, optional dev buy + fees, small reserve). Phantom Connect has no card on-ramp, so the UI explains buying on Coinbase/an exchange (withdraw on the Solana network) or in the Phantom app.
3. **Launch form**: name, ticker, image (resized to 512 px in the browser), description, X/Telegram/website, pair (SOL default, or ★ $KIBBLE), optional SOL dev buy.
4. Metadata → Pinata IPFS when `PINATA_JWT` is set, else hosted by Inu Verse (`/api/launch?meta=`/`?img=`; pump.fun's old `/api/ipfs` upload is retired).
5. The browser generates the **mint keypair locally**. The server (`api/launch.js`, `api/_lib/launchtx.js`) builds an **unsigned** `create_v2` (+ `buy`) transaction with pump.fun's official SDK for `{player pubkey, mint public key}`, dry-runs it, and returns it. The server never holds keys, SOL or tokens and never signs. Requests carrying anything key-like are refused.
6. The browser checks the tx (fee payer = player, signers = exactly player + mint, nothing pre-signed). Then one tap:
   - embedded wallet: `sdk.solana.signAndSendTransaction(tx, { presignTransaction })`. The mint co-signs inside the hook, in the tab (Phantom embedded wallets reject pre-signed txs).
   - extension: Phantom signs first (`signTransaction`), the mint co-signs locally, `/api/launch` relays the fully signed bytes.
7. On confirmation the coin is auto-registered on the Coin board: `POST /api/coins {action:"register", mint, signature}`. The server reads the launch tx and requires **fee payer == pump.fun bonding-curve creator** (same creator-vs-wallet check as a signed-in session).

## Pairs
- SOL (default), with an optional dev buy.
- $KIBBLE: pump.fun's `create_v2` now takes pump coins as the quote mint (pump-public-docs, Oct 2026), and a $KIBBLE-paired create **simulates successfully on mainnet**, so the API-built tx pairs with $KIBBLE directly. There's no dev buy, because that would spend $KIBBLE. If pump.fun refuses at launch time (dry run fails), the UI says so and points to SOL or pump.fun's own page.
- Any other pair: pump.fun's own create page (the step-by-step guide stays under the launcher).

## Setup (owner)
| Env var (Vercel → inu-verse → Settings → Environment Variables, Production) | Needed for |
|---|---|
| `PHANTOM_APP_ID` | Google/Apple sign-in (until set, those buttons show "coming soon") |
| `PHANTOM_REDIRECT_URL` (optional) | defaults to `https://inu-verse-tawny.vercel.app/` |
| `PINATA_JWT` (recommended), `PINATA_GATEWAY` (optional) | permanent IPFS metadata. Without it, metadata is hosted by Inu Verse via Upstash |
| `SOLANA_RPC` (recommended) | a private mainnet RPC (e.g. Helius). The public RPC rate-limits |

Phantom Portal (https://phantom.com/portal): App → Set Up → copy the App ID; **Allowed Origins** add `https://inu-verse-tawny.vercel.app`; **Redirect URLs** add `https://inu-verse-tawny.vercel.app/` (exact, with trailing slash). Note: Phantom's docs say Portal is currently not accepting *new* apps; existing apps/App IDs work.

Rebuild vendored bundles: `scripts/build-vendor.sh`. Proof: `node scripts/noext-proof.mjs [live]`.

## Solana RPC (server-side only)
The server reads `SOLANA_RPC` (full URL) or `HELIUS_API_KEY` (it builds `https://mainnet.helius-rpc.com/?api-key=…` itself), and falls back to the public mainnet RPC. The value is never sent to the browser: `/api/config` has no RPC field, and every JSON response from `/api/launch` and `/api/coins` is scrubbed of the URL, the key and any `api-key=` string. The browser talks to RPC only through `/api/launch`: `?balance=`, `?sig=`, `{action:"send"}` (signed pump.fun launches only), and `{action:"rpc", method, params}`. The `rpc` action allows only getBalance, getLatestBlockhash, getSignatureStatuses and getAccountInfo, with a limit of 300 calls per IP per hour. Every `/api/launch` response carries `x-rpc-provider: HL | custom | public`, and successful `rpc` results carry `rpcProvider` too. This names the endpoint kind only: HL means HELIUS_API_KEY is set, custom means SOLANA_RPC. See `api/_lib/rpc.js`.
