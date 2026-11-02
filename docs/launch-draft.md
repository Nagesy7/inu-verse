# Launch Hall: Draft from Meme Maker

`/launch-draft.html` shows a coin draft sent from the Cabal Meme Maker (https://cabal-meme-maker.vercel.app).
Logic: `src/mmdraft.js` (tests: `tests/mmdraft.test.mjs`). The page is static: no API calls, no wallet, no upload, no registry write.

Link format (hash, so nothing reaches server logs):
`https://inu-verse-tawny.vercel.app/launch-draft.html#v=1&sister=BTC&name=…&ticker=…&desc=…&reward=5&src=pairs&kit=…&img=<maker /assets URL>&from=<maker URL>&handoff=<id>`

- `sister` must be a whitelisted Cabal sister (BTC, ETH). The parent coin + CA always come from the whitelist; `parent`/`ca`/`mint` in a link are ignored.
  Pending sisters, Inu and $KIBBLE are refused. Add a sister only with a verified CA from Zachary.
- Description: other CAs, other $TICKERs and price-promise phrases are stripped. Reward % is shown as a plan only.
- Image: if opened by the maker's "Send to Launch Hall" button (`handoff=<id>`), the page posts `{type:'lh-draft-ready',v:1,id}` to `window.opener`
  and accepts `{type:'lh-draft-image',v:1,id,dataUrl}` only from the maker origin (prod, its preview deployments, localhost), then replies `lh-draft-ack`.
  The PNG stays in this tab (sessionStorage). Without a handoff it shows `img` (maker-hosted /assets only) or the sister's art.
