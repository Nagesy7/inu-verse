# Inu Verse realtime (live multiplayer)

Cloudflare Worker + SQLite-backed Durable Objects, one object per room instance (`city#1`, `city#2`, ...).
The game on Vercel stays as it is; the browser opens a WebSocket straight to this Worker. No Upstash traffic, no Vercel function time.

## Why Cloudflare Durable Objects (pricing checked 18 Oct 2026)
* Workers **Free** plan includes Durable Objects (SQLite backend only, which is what this uses):
  100,000 requests/day (a WebSocket connect = 1 request; **incoming WS messages are billed 20:1**, outgoing messages are free),
  13,000 GB-s/day duration, 5 GB SQLite storage (we store nothing). Over a free limit, requests fail instead of billing.
  https://developers.cloudflare.com/durable-objects/platform/pricing/
* The WebSocket **Hibernation API** means an idle room costs no duration; the server never runs timers, it only relays.
* Supabase Realtime Free allows only 100 messages/second per project, counting every delivered message (fan-out), and 200
  connections: 10 pups walking at 9 Hz in one room is already ~800 msg/s. https://supabase.com/docs/guides/realtime/limits
* PartyKit/partyserver runs on the same Durable Objects; plain DOs avoid the extra dependency.

Rough free-tier budget: 100k req/day ≈ 2,000,000 incoming messages/day ≈ 60+ player-hours/day of continuous walking
(clients only send while something changes, at most ~9 Hz; standing still sends nothing).

## Protocol (JSON over WebSocket, see `src/mpshared.js`, shared with the client)
client -> server: `hi {name, guest, tok?, look, s}` · `s {x,y,f,m,r,d,ts}` · `c {text}` · `e {k}` · `l {look}` · `ping`
server -> client: `w {id,name,room,inst,cap,players}` · `j {p}` · `q {id}` · `s {id,...}` · `c {id,text}` · `e {id,k}` · `l {id,look}` · `no {why}`

Server enforcement: Origin allow-list, 2 KB frame cap (state frames 200 B), token buckets (state 10/s burst 3, chat 1 per 2 s,
emote 1/s, look 1 per 5 s, any 25/s; sustained abuse closes the socket), chat filter (profanity masked; slurs, threats/harassment, sexual solicitations, links,
wallet addresses/keys and seed-phrase-like word lists refused), names cleaned, numbers clamped, looks reduced to known fields.
Identity: a kibble-pay session token (optional) is verified read-only against kibble-pay; verified players show their chosen
name + short address, everyone else is a guest `Pup1234`.

## Local
```
npm install
npx wrangler dev --port 8787          # needs Node >= 22 (box: PATH=$HOME/.local/node22/bin:$PATH)
MP_URL=ws://127.0.0.1:8787 MP_CAP=40 npm test
# game: python3 -m http.server 8643 (repo root) -> http://127.0.0.1:8643/?mp=ws://127.0.0.1:8787
```

## Deploy (once Cloudflare credentials exist)
```
npx wrangler deploy                   # prints https://inu-verse-realtime.<subdomain>.workers.dev
vercel env add REALTIME_URL production   # value: wss://inu-verse-realtime.<subdomain>.workers.dev
vercel deploy --prod                  # /api/config now returns realtimeUrl -> multiplayer switches on
```
Unset `REALTIME_URL` to switch multiplayer off again (solo play is unchanged).
