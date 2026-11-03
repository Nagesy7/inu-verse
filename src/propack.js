// 🚀 Launch Pro Pack: a design pack built IN THE BROWSER from a Launch Hall draft (no AI image service, no upload of the art).
// Pure helpers (fields, checklist, zip, guard) are node-testable; the draw* helpers need a canvas (browser only).
// Contents: logo 512 + 1000 px, X banner 1500x500, 16:9 banner 1280x720, pump.fun field sheet (.txt + .html with copy buttons),
// one-page launch checklist (.png + .txt), README. The free preview is watermarked; the clean zip unlocks after a verified payment.
// Not financial advice: it's a design pack, not a launch, a listing or an endorsement.
export const PRICE_FALLBACK = { sol: 0.25, priceFinal: true, refundFinal: true, payToLabel: 'Sponsor Chest',
  refund: "No refunds once the pack is unlocked. If the payment doesn't unlock it, we refund by hand." };
// 🎁 Launch Bundle = this Pro Pack + a 7-day Basic sponsored side in the Cabal Meme Maker, one order, one payment (final price, approved by Zachary 3 Nov 2026).
export const BUNDLE_FALLBACK = { sol: 0.65, separately: 0.75, priceFinal: true, refundFinal: true, payToLabel: 'Sponsor Chest',
  refund: "The Pro Pack part is non-refundable once it's unlocked. If your sponsored side is rejected, we refund 0.5 SOL by hand." };
/** Ops per product (same router). */
export const opsFor = (kind) => (kind === 'bundle'
  ? { message: 'bundle-message', order: 'bundle-order', check: 'bundle-pay-check', status: 'bundle-status', config: 'bundle-config' }
  : { message: 'propack-message', order: 'propack-order', check: 'propack-pay-check', status: 'propack-status', config: 'propack-config' });
/** Where the buyer adds the coin for the bundle's sponsored side (the maker's #sponsor page). */
export const bundleSideUrl = (maker, id) => `${String(maker || 'https://cabal-meme-maker.vercel.app/').replace(/\/?$/, '/')}#sponsor?bundle=${encodeURIComponent(String(id || ''))}`;
/** Does the side part still need the buyer's coin? */
export const kitNeedsCoin = (parts) => ['not-added', 'needs-details'].includes(parts?.kit?.status);
export const LIMITS = { name: 32, ticker: 10, desc: 500 };
export const FRAMES = Object.freeze([['ring', 'Coin ring'], ['tile', 'Framed tile'], ['clean', 'Clean full-bleed']]);
export const FILES = Object.freeze(['logo-1000.png', 'logo-512.png', 'banner-x-1500x500.png', 'banner-1280x720.png', 'token-sheet.txt', 'token-sheet.html', 'launch-checklist.png', 'launch-checklist.txt', 'README.txt']);

/** Inu / $KIBBLE drafts stay free: no pack offered. */
export const propackAllowed = (d) => !!d && d.side !== 'inu' && !['KIBBLE', 'INU'].includes(String(d.coin?.ticker || '').toUpperCase());

/** Socials -> canonical https links (or '' if not usable). */
export function normSocial(kind, raw) {
  let v = String(raw || '').trim(); if (!v) return '';
  if (kind === 'x') { const m = v.match(/^@?([A-Za-z0-9_]{1,15})$/) || v.match(/^(?:https?:\/\/)?(?:www\.)?(?:x|twitter)\.com\/([A-Za-z0-9_]{1,15})\/?(?:[?#].*)?$/i); return m ? 'https://x.com/' + m[1] : ''; }
  if (kind === 'tg') { const m = v.match(/^@?([A-Za-z0-9_]{4,32})$/) || v.match(/^(?:https?:\/\/)?(?:t\.me|telegram\.me)\/([A-Za-z0-9_+]{4,40})\/?$/i); return m ? 'https://t.me/' + m[1] : ''; }
  if (!/^https?:\/\//i.test(v)) v = 'https://' + v;
  try { const u = new URL(v); return u.protocol === 'https:' && /^[a-z0-9.-]+\.[a-z]{2,12}$/i.test(u.hostname) && v.length <= 200 ? u.toString() : ''; } catch { return ''; }
}

/** The pump.fun create-form fields, in its order, with limits + notes. */
export function pumpFields(d, socials = {}) {
  const name = String(d.name || ''), ticker = String(d.ticker || '').replace(/^\$/, ''), desc = String(d.desc || '');
  const web = normSocial('web', socials.web), x = normSocial('x', socials.x), tg = normSocial('tg', socials.tg);
  const lim = (v, n) => (v.length <= n ? '' : `too long: ${v.length}/${n}`);
  return [
    { key: 'name', label: 'Name', value: name, note: lim(name, LIMITS.name) || `${name.length}/${LIMITS.name}` },
    { key: 'ticker', label: 'Ticker', value: ticker, note: lim(ticker, LIMITS.ticker) || `${ticker.length}/${LIMITS.ticker}, no $` },
    { key: 'desc', label: 'Description', value: desc, note: desc ? lim(desc, LIMITS.desc) || `${desc.length}/${LIMITS.desc}` : 'empty: add one in the Meme Maker' },
    { key: 'image', label: 'Image', value: 'logo-1000.png', note: 'square, 1000×1000 PNG (in this pack)', file: true },
    { key: 'banner', label: 'Banner', value: 'banner-x-1500x500.png', note: '3:1, 1500×500 PNG (in this pack), if pump.fun offers it', file: true },
    { key: 'website', label: 'Website', value: web, note: web ? '' : socials.web ? 'not a valid https link' : 'optional' },
    { key: 'x', label: 'X (Twitter)', value: x, note: x ? '' : socials.x ? 'not a valid handle' : 'optional' },
    { key: 'telegram', label: 'Telegram', value: tg, note: tg ? '' : socials.tg ? 'not a valid t.me link' : 'optional' },
    { key: 'pair', label: 'Pair (Custom)', value: String(d.coin?.mint || ''), note: `$${d.coin?.ticker || '?'} only. Check the first and last 4 characters.` },
  ];
}
export function sheetText(d, fields) {
  return [`LAUNCH PRO PACK · ${d.name} ($${String(d.ticker).replace(/^\$/, '')})`, `Pump.fun create fields (paste each one):`, '',
    ...fields.map((f) => `${f.label}:\n${f.value || '(leave blank)'}${f.note ? `\n  [${f.note}]` : ''}\n`),
    'Pairs ONLY with $' + (d.coin?.ticker || '?') + '. Not financial advice. Built in the Inu Verse Launch Hall.'].join('\n');
}
const H = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
/** Standalone HTML sheet with a Copy button per field (works offline from the zip). */
export function sheetHtml(d, fields) {
  return `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${H(d.name)} · token sheet</title>
<style>body{font:15px/1.45 system-ui,sans-serif;background:#0c1022;color:#f6e7b8;max-width:760px;margin:24px auto;padding:0 14px}h1{font-size:20px;color:${H(d.color || '#d4a640')}}
.f{display:grid;grid-template-columns:130px 1fr auto;gap:10px;align-items:start;border:1px solid #24305c;background:#121a36;padding:10px;margin:8px 0;border-radius:6px}
.v{white-space:pre-wrap;word-break:break-word}.n{font-size:12px;opacity:.7}button{font:12px monospace;padding:6px 10px;border:2px solid #d4a640;background:#d4a640;color:#0c1022;cursor:pointer}</style>
<h1>${H(d.name)} ($${H(String(d.ticker).replace(/^\$/, ''))})</h1><p class="n">Paste each field into pump.fun's create page. Pairs only with $${H(d.coin?.ticker)}. Not financial advice.</p>
${fields.map((f) => `<div class="f"><b>${H(f.label)}</b><div><div class="v">${H(f.value || '(leave blank)')}</div>${f.note ? `<div class="n">${H(f.note)}</div>` : ''}</div>${f.value && !f.file ? `<button data-v="${H(f.value)}">Copy</button>` : '<span></span>'}</div>`).join('\n')}
<script>document.querySelectorAll('button[data-v]').forEach(b=>b.onclick=()=>navigator.clipboard.writeText(b.dataset.v).then(()=>{b.textContent='Copied';setTimeout(()=>b.textContent='Copy',1200)}))</script>`;
}

/** One-page launch checklist (sections of [text]). */
export function checklist(d, fields) {
  const get = (k) => fields.find((f) => f.key === k)?.value || '', p = d.coin?.ticker || '?', mint = d.coin?.mint || '';
  const short = mint ? `${mint.slice(0, 4)}…${mint.slice(-4)}` : '?';
  return [
    ['Before you launch', [
      'Use your own Phantom wallet with enough SOL for pump.fun\'s create fee (any first buy is your call: NFA).',
      'Have logo-1000.png and banner-x-1500x500.png from this pack ready.',
      get('x') || get('telegram') ? `Socials live first: ${[get('x'), get('telegram')].filter(Boolean).join(' · ')}` : 'Make your X / Telegram first (or leave those fields blank).',
      `Read the name, ticker and description once more: no typos, no price promises.`,
      `Copy the pair address from the sheet: $${p} ${short}.`]],
    ['On pump.fun', [
      'Type pump.fun/create yourself. Never use a link from a DM.',
      'Paste Name, Ticker and Description from token-sheet.html, then upload logo-1000.png (and the banner if offered).',
      'Add your website / X / Telegram links.',
      `Pair: choose Custom and paste the $${p} address. Check the first and last 4 characters. If $${p} isn't offered, don't pair it with anything else.`,
      'Check every field, then confirm in your own wallet only.']],
    ['After launch', [
      'Copy your new coin\'s CA from pump.fun and post it from your own X with the banner or meme.',
      'Set your X header and Telegram cover to the banners. Pin the CA in Telegram.',
      'Register it on the Inu Verse Launch Hall Coin board. Badges are checked separately, never automatic.']],
    ['Stay safe', [
      'Never share a seed phrase or private key. Real support never DMs you first.',
      'No "guaranteed" or price talk in posts. Not financial advice.']],
  ];
}
export const checklistText = (d, cl) => [`LAUNCH CHECKLIST · ${d.name} ($${String(d.ticker).replace(/^\$/, '')})`, ...cl.flatMap(([h, items]) => ['', h.toUpperCase(), ...items.map((t) => '[ ] ' + t)]), '', 'Inu Verse Launch Hall · Launch Pro Pack · NFA'].join('\n');
export const readme = (d, order) => [`Launch Pro Pack · ${d.name} ($${String(d.ticker).replace(/^\$/, '')})`, '', ...FILES.filter((f) => f !== 'README.txt').map((f) => '- ' + f), '',
  order?.id ? `Order ${order.id}${order.sig ? ` · payment tx ${order.sig}` : ''}` : '', 'Built in your browser from your Launch Hall draft. Your art never left the tab.',
  'A design pack, not a launch, a listing or an endorsement. Not financial advice.'].filter((l) => l !== null).join('\n');

/* ---------------- zip (STORE, no compression; PNGs are already compressed) ---------------- */
const CRC_T = (() => { const t = new Uint32Array(256); for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
export function crc32(u8) { let c = 0xffffffff; for (let i = 0; i < u8.length; i++) c = CRC_T[(c ^ u8[i]) & 0xff] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; }
/** files: [{name, data: Uint8Array|string}] -> Uint8Array zip */
export function makeZip(files, date = new Date()) {
  const enc = new TextEncoder(), parts = [], central = []; let off = 0;
  const dt = ((date.getHours() << 11) | (date.getMinutes() << 5) | (date.getSeconds() >> 1)) & 0xffff, dd = (((date.getFullYear() - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate()) & 0xffff;
  for (const f of files) {
    const name = enc.encode(f.name), data = typeof f.data === 'string' ? enc.encode(f.data) : f.data, crc = crc32(data);
    const h = new DataView(new ArrayBuffer(30));
    h.setUint32(0, 0x04034b50, true); h.setUint16(4, 20, true); h.setUint16(6, 0x0800, true); h.setUint16(8, 0, true); h.setUint16(10, dt, true); h.setUint16(12, dd, true);
    h.setUint32(14, crc, true); h.setUint32(18, data.length, true); h.setUint32(22, data.length, true); h.setUint16(26, name.length, true); h.setUint16(28, 0, true);
    parts.push(new Uint8Array(h.buffer), name, data);
    const c = new DataView(new ArrayBuffer(46));
    c.setUint32(0, 0x02014b50, true); c.setUint16(4, 20, true); c.setUint16(6, 20, true); c.setUint16(8, 0x0800, true); c.setUint16(10, 0, true); c.setUint16(12, dt, true); c.setUint16(14, dd, true);
    c.setUint32(16, crc, true); c.setUint32(20, data.length, true); c.setUint32(24, data.length, true); c.setUint16(28, name.length, true); c.setUint32(42, off, true);
    central.push(new Uint8Array(c.buffer), name);
    off += 30 + name.length + data.length;
  }
  const cdSize = central.reduce((s, p) => s + p.length, 0), e = new DataView(new ArrayBuffer(22));
  e.setUint32(0, 0x06054b50, true); e.setUint16(8, files.length, true); e.setUint16(10, files.length, true); e.setUint32(12, cdSize, true); e.setUint32(16, off, true);
  const all = [...parts, ...central, new Uint8Array(e.buffer)], out = new Uint8Array(all.reduce((s, p) => s + p.length, 0)); let o = 0;
  for (const p of all) { out.set(p, o); o += p.length; }
  return out;
}

/* ---------------- canvas renderers (browser) ---------------- */
const hex = (c) => { const m = String(c || '').match(/^#?([0-9a-f]{6})$/i); const n = m ? parseInt(m[1], 16) : 0xd4a640; return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
const rgba = (c, a) => `rgba(${hex(c).join(',')},${a})`;
const mix = (c, t, k) => { const a = hex(c), b = hex(t); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * k)).join(',')})`; };
const HEAD = (px) => `${px}px Silkscreen, "Courier New", monospace`, BODY = (px, w = 600) => `${w} ${px}px system-ui, -apple-system, "Segoe UI", Roboto, sans-serif`;
/** Draw the source image cover-cropped into box (x,y,w,h) with zoom (1-3) and pan (-1..1). */
function drawCrop(ctx, img, x, y, w, h, { zoom = 1, px = 0, py = 0, clean = true } = {}) {
  const iw = img.naturalWidth || img.width, ih = img.naturalHeight || img.height; if (!iw || !ih) return;
  const s = Math.max(w / iw, h / ih) * Math.max(1, zoom), dw = iw * s, dh = ih * s;
  const dx = x + (w - dw) / 2 - px * (dw - w) / 2, dy = y + (h - dh) / 2 - py * (dh - h) / 2;
  ctx.save(); ctx.beginPath(); ctx.rect(x, y, w, h); ctx.clip();
  if (clean) ctx.filter = 'contrast(1.08) saturate(1.15) brightness(1.03)';
  ctx.imageSmoothingQuality = 'high'; ctx.drawImage(img, dx, dy, dw, dh); ctx.restore();
}
function grid(ctx, w, h, color, step) { ctx.save(); ctx.fillStyle = rgba(color, 0.07); for (let y = step / 2; y < h; y += step) for (let x = step / 2; x < w; x += step) ctx.fillRect(x, y, 2, 2); ctx.restore(); }
function bg(ctx, w, h, color) {
  const g = ctx.createLinearGradient(0, 0, w, h); g.addColorStop(0, '#0c1022'); g.addColorStop(0.55, '#1b2550'); g.addColorStop(1, mix(color, '#0c1022', 0.55));
  ctx.fillStyle = g; ctx.fillRect(0, 0, w, h); grid(ctx, w, h, '#f6e7b8', Math.round(Math.max(w, h) / 60));
  const r = ctx.createRadialGradient(w * 0.8, h * 0.3, 0, w * 0.8, h * 0.3, Math.max(w, h) * 0.6); r.addColorStop(0, rgba(color, 0.35)); r.addColorStop(1, rgba(color, 0)); ctx.fillStyle = r; ctx.fillRect(0, 0, w, h);
}
function rr(ctx, x, y, w, h, r) { ctx.beginPath(); ctx.moveTo(x + r, y); ctx.arcTo(x + w, y, x + w, y + h, r); ctx.arcTo(x + w, y + h, x, y + h, r); ctx.arcTo(x, y + h, x, y, r); ctx.arcTo(x, y, x + w, y, r); ctx.closePath(); }
function wrap(ctx, text, maxW, maxLines) {
  const words = String(text || '').split(/\s+/).filter(Boolean), lines = []; let cur = '';
  for (const w of words) { const t = cur ? cur + ' ' + w : w; if (ctx.measureText(t).width <= maxW || !cur) cur = t; else { lines.push(cur); cur = w; if (lines.length === maxLines) break; } }
  if (lines.length < maxLines && cur) lines.push(cur);
  if (lines.length === maxLines && words.join(' ').length > lines.join(' ').length) { let l = lines[maxLines - 1]; while (l && ctx.measureText(l + '…').width > maxW) l = l.slice(0, -1); lines[maxLines - 1] = l.replace(/\s+$/, '') + '…'; }
  return lines;
}
function fitFont(ctx, text, maxW, start, min, font) { let s = start; ctx.font = font(s); while (s > min && ctx.measureText(text).width > maxW) { s -= 2; ctx.font = font(s); } return s; }
/** Diagonal "PREVIEW" watermark (free preview only). */
export function watermark(ctx, w, h) {
  ctx.save(); ctx.translate(w / 2, h / 2); ctx.rotate(-Math.PI / 7); const s = Math.max(14, Math.round(Math.min(w, h) / 9));
  ctx.font = HEAD(s); ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillStyle = 'rgba(255,255,255,.28)'; ctx.strokeStyle = 'rgba(0,0,0,.35)'; ctx.lineWidth = Math.max(1, s / 14);
  const span = Math.hypot(w, h);
  for (let y = -span / 2; y < span / 2; y += s * 2.6) for (let x = -span / 2 - ((y / (s * 2.6)) % 2 ? s * 3 : 0); x < span / 2; x += s * 9) { ctx.strokeText('PREVIEW', x, y); ctx.fillText('PREVIEW', x, y); }
  ctx.restore();
}
/** Square token logo. o: {frame, zoom, px, py, clean, color, ticker, badge} */
export function drawLogo(cv, img, size, o = {}) {
  cv.width = cv.height = size; const ctx = cv.getContext('2d'), c = o.color || '#d4a640', k = size / 1000;
  ctx.clearRect(0, 0, size, size);
  if (o.frame === 'clean') drawCrop(ctx, img, 0, 0, size, size, o);
  else if (o.frame === 'tile') {
    bg(ctx, size, size, c); const m = 70 * k, r = 90 * k;
    ctx.save(); ctx.shadowColor = 'rgba(0,0,0,.5)'; ctx.shadowBlur = 40 * k; rr(ctx, m, m, size - 2 * m, size - 2 * m, r); ctx.fillStyle = c; ctx.fill(); ctx.restore();
    ctx.save(); rr(ctx, m + 18 * k, m + 18 * k, size - 2 * m - 36 * k, size - 2 * m - 36 * k, r - 16 * k); ctx.clip(); drawCrop(ctx, img, m, m, size - 2 * m, size - 2 * m, o); ctx.restore();
    ctx.save(); rr(ctx, m + 18 * k, m + 18 * k, size - 2 * m - 36 * k, size - 2 * m - 36 * k, r - 16 * k); ctx.lineWidth = 6 * k; ctx.strokeStyle = 'rgba(255,255,255,.35)'; ctx.stroke(); ctx.restore();
  } else { // ring
    bg(ctx, size, size, c); const R = 400 * k, cx = size / 2, cy = size / 2;
    ctx.save(); ctx.shadowColor = rgba(c, 0.8); ctx.shadowBlur = 60 * k; ctx.beginPath(); ctx.arc(cx, cy, R + 34 * k, 0, Math.PI * 2); ctx.fillStyle = c; ctx.fill(); ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, R + 34 * k, 0, Math.PI * 2); ctx.lineWidth = 8 * k; ctx.strokeStyle = mix(c, '#ffffff', 0.45); ctx.stroke();
    ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.clip(); drawCrop(ctx, img, cx - R, cy - R, 2 * R, 2 * R, o); ctx.restore();
    ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.lineWidth = 10 * k; ctx.strokeStyle = 'rgba(12,16,34,.6)'; ctx.stroke();
  }
  if (o.badge && o.ticker) { const t = '$' + o.ticker, fs = fitFont(ctx, t, size * 0.6, 84 * k, 30 * k, HEAD), w = ctx.measureText(t).width + 60 * k, h = fs + 40 * k, x = (size - w) / 2, y = size - h - 40 * k;
    ctx.save(); rr(ctx, x, y, w, h, h / 2); ctx.fillStyle = 'rgba(12,16,34,.85)'; ctx.fill(); ctx.lineWidth = 5 * k; ctx.strokeStyle = c; ctx.stroke();
    ctx.fillStyle = '#f6e7b8'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(t, size / 2, y + h / 2 + 2 * k); ctx.restore(); }
  if (o.preview) watermark(ctx, size, size);
  return cv;
}
/** Banner w x h. kind 'x' keeps the lower-left clear for the X profile picture. */
export function drawBanner(cv, img, d, w, h, o = {}) {
  cv.width = w; cv.height = h; const ctx = cv.getContext('2d'), c = d.color || '#d4a640', tk = '$' + String(d.ticker || '').replace(/^\$/, '');
  bg(ctx, w, h, c);
  ctx.save(); ctx.globalAlpha = 0.18; for (let i = -h; i < w; i += h / 3) { ctx.beginPath(); ctx.moveTo(i, h); ctx.lineTo(i + h, 0); ctx.lineWidth = h / 18; ctx.strokeStyle = rgba(c, 1); ctx.stroke(); } ctx.restore();
  const wide = w / h > 2.2, A = wide ? Math.round(h * 0.68) : Math.round(h * 0.62);
  const ax = wide ? w - A - Math.round(h * 0.16) : Math.round(w * 0.07), ay = Math.round((h - A) / 2);
  ctx.save(); ctx.shadowColor = rgba(c, 0.7); ctx.shadowBlur = A / 10; rr(ctx, ax - A * 0.04, ay - A * 0.04, A * 1.08, A * 1.08, A * 0.12); ctx.fillStyle = c; ctx.fill(); ctx.restore();
  ctx.save(); rr(ctx, ax, ay, A, A, A * 0.09); ctx.clip(); drawCrop(ctx, img, ax, ay, A, A, o); ctx.restore();
  const tx = wide ? Math.round(w * 0.28) : ax + A + Math.round(w * 0.06), tw = wide ? ax - tx - Math.round(w * 0.04) : w - tx - Math.round(w * 0.06);
  let y = wide ? Math.round(h * 0.2) : Math.round(h * 0.24);
  ctx.textBaseline = 'top'; ctx.textAlign = 'left';
  const ns = fitFont(ctx, d.name || '', tw, Math.round(h * (wide ? 0.15 : 0.11)), Math.round(h * 0.05), HEAD);
  ctx.fillStyle = '#f6e7b8'; ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowBlur = 8; ctx.fillText(d.name || '', tx, y); ctx.shadowBlur = 0; y += ns * 1.25;
  ctx.font = HEAD(Math.round(h * (wide ? 0.1 : 0.075))); const pw = ctx.measureText(tk).width + h * 0.06, ph = h * (wide ? 0.14 : 0.105);
  rr(ctx, tx, y, pw, ph, ph / 2); ctx.fillStyle = c; ctx.fill(); ctx.fillStyle = '#0c1022'; ctx.textBaseline = 'middle'; ctx.fillText(tk, tx + h * 0.03, y + ph / 2 + 2);
  const pair = `pairs with $${d.coin?.ticker || '?'}`; ctx.font = BODY(Math.round(h * (wide ? 0.06 : 0.045)), 700); ctx.fillStyle = rgba('#f6e7b8', 0.85); ctx.fillText(pair, tx + pw + h * 0.04, y + ph / 2);
  y += ph + h * 0.06; ctx.textBaseline = 'top';
  if (d.desc) { ctx.font = BODY(Math.round(h * (wide ? 0.058 : 0.045)), 500); ctx.fillStyle = 'rgba(246,231,184,.92)'; for (const l of wrap(ctx, d.desc, tw, wide ? 2 : 4)) { ctx.fillText(l, tx, y); y += h * (wide ? 0.075 : 0.06); } }
  if (o.preview) watermark(ctx, w, h);
  return cv;
}
/** One-page checklist image (1240x1754, A4 at 150 dpi). */
export function drawChecklist(cv, logoCv, d, cl, o = {}) {
  const W = 1240, Hh = 1754; cv.width = W; cv.height = Hh; const ctx = cv.getContext('2d'), c = d.color || '#d4a640';
  ctx.fillStyle = '#0c1022'; ctx.fillRect(0, 0, W, Hh); ctx.fillStyle = c; ctx.fillRect(0, 0, W, 14);
  if (logoCv) { ctx.save(); rr(ctx, 80, 70, 170, 170, 26); ctx.clip(); ctx.drawImage(logoCv, 80, 70, 170, 170); ctx.restore(); }
  ctx.textBaseline = 'top'; ctx.fillStyle = '#f2cc68'; ctx.font = HEAD(30); ctx.fillText('LAUNCH CHECKLIST', 285, 84);
  fitFont(ctx, d.name || '', 860, 54, 26, HEAD); ctx.fillStyle = '#f6e7b8'; ctx.fillText(d.name || '', 285, 128);
  ctx.font = BODY(28, 700); ctx.fillStyle = c; ctx.fillText(`$${String(d.ticker || '').replace(/^\$/, '')} · pairs only with $${d.coin?.ticker || '?'}`, 285, 200);
  let y = 290;
  for (const [h, items] of cl) {
    ctx.fillStyle = c; ctx.fillRect(80, y + 6, 8, 34); ctx.fillStyle = '#f2cc68'; ctx.font = HEAD(28); ctx.fillText(h.toUpperCase(), 104, y + 6); y += 58;
    ctx.font = BODY(25, 500);
    for (const t of items) { const lines = wrap(ctx, t, 960, 3); ctx.strokeStyle = '#f6e7b8'; ctx.lineWidth = 3; ctx.strokeRect(104, y + 4, 26, 26);
      ctx.fillStyle = '#f6e7b8'; for (const l of lines) { ctx.fillText(l, 152, y); y += 36; } y += 14; }
    y += 18;
  }
  ctx.font = BODY(20, 500); ctx.fillStyle = 'rgba(246,231,184,.6)'; ctx.fillText('Inu Verse Launch Hall · Launch Pro Pack · A design pack, not a launch or an endorsement · Not financial advice', 80, Hh - 70);
  if (o.preview) watermark(ctx, W, Hh);
  return cv;
}
export const canvasBytes = (cv) => new Promise((ok, no) => cv.toBlob(async (b) => { try { ok(new Uint8Array(await b.arrayBuffer())); } catch (e) { no(e); } }, 'image/png'));
