# Founding Five Thousand — in-game seat-open notice

Ships **together** with the kibble-pay seat tracker (`docs/founding-five-thousand.md` on kibble-pay).

- Polls `https://kibble-pay.vercel.app/api/tech` → `foundingFiveThousand` every 60s (paused when tab hidden).
- When a seat opens after a sell (`recentOpen`), shows an in-town **Seat open!** dialog with plain-language how to qualify (10 seats, US$5,000 sent before fees, permanent title, sell opens seat, title only).
- Preview: `?seatopen=1`
- Code: `src/foundingseats.js` (started from `src/main.js`). Tests: `tests/foundingseats.test.mjs`.
