// All art drawn procedurally - original.
import { shibaSprite } from './sprite.js';
import { FURNITURE, footprint, WALLS, FLOORS } from './furniture.js';

const rr = (ctx, x, y, w, h, r) => { ctx.beginPath(); ctx.roundRect(x, y, w, h, r); };

// Pixel Shiba (see sprite.js). (x,y) = ground point under the feet-ish centre.
export function drawShiba(ctx, x, y, { coat = 'tan', face = 'down', phase = 0, moving = false, scale = 1, name = null, outfit = null, shadow = true } = {}) {
  const px = Math.max(1, Math.round(2 * scale));
  const frame = moving ? Math.floor(phase / 1.6) % 4 : 0;
  const spr = shibaSprite(coat, face, frame, outfit || {});
  const w = spr.width * px, h = spr.height * px, dx = Math.round(x - w / 2), dy = Math.round(y + 12 - h);
  ctx.save(); ctx.imageSmoothingEnabled = false;
  if (shadow) { ctx.fillStyle = 'rgba(10,14,30,0.28)'; ctx.fillRect(Math.round(x - 7 * px), Math.round(y + 12 - 2 * px), 14 * px, 2 * px); ctx.fillRect(Math.round(x - 5 * px), Math.round(y + 12 - 3 * px), 10 * px, 3 * px); }
  ctx.drawImage(spr, dx, dy, w, h);
  ctx.restore();
  if (name) {
    ctx.save(); ctx.font = '8px Silkscreen, monospace'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    const tw = Math.ceil(ctx.measureText(name).width) + 8, ty = dy - 10;
    ctx.fillStyle = '#121a36'; ctx.fillRect(Math.round(x - tw / 2), ty - 6, tw, 12); ctx.fillStyle = '#d4a640'; ctx.fillRect(Math.round(x - tw / 2), ty + 5, tw, 1);
    ctx.fillStyle = '#f6e7b8'; ctx.fillText(name, Math.round(x), ty); ctx.restore();
  }
}

export function drawBoneIcon(ctx, x, y, s = 1, color = '#fff6e0') {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s); ctx.fillStyle = color; ctx.strokeStyle = '#a58a5c'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.roundRect(-6, -2, 12, 4, 2); ctx.fill();
  for (const [cx, cy] of [[-6, -2.5], [-6, 2.5], [6, -2.5], [6, 2.5]]) { ctx.beginPath(); ctx.arc(cx, cy, 2.6, 0, 7); ctx.fill(); }
  ctx.restore();
}

export function drawMenuIcon(ctx, id, x, y, s = 1) {
  ctx.save(); ctx.translate(x, y); ctx.scale(s, s);
  if (id === 'latte') { ctx.fillStyle = '#fff'; rr(ctx, -9, -6, 16, 15, 4); ctx.fill(); ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(8, 1, 4, -1.4, 1.4); ctx.stroke(); ctx.fillStyle = '#c08a5a'; ctx.beginPath(); ctx.ellipse(-1, -5, 7, 2.5, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(-1, -5, 1.6, 0, 7); ctx.fill(); }
  if (id === 'biscuit') drawBoneIcon(ctx, 0, 0, 1.4, '#e6b877');
  if (id === 'berry') { ctx.fillStyle = '#f2efe8'; ctx.beginPath(); ctx.arc(0, 0, 10, 0, Math.PI); ctx.fill(); for (const [bx, by, col] of [[-5, -1, '#5a4fcf'], [0, -3, '#d8425a'], [5, -1, '#5a4fcf'], [-2, -5, '#7a6cf0'], [3, -6, '#d8425a']]) { ctx.fillStyle = col; ctx.beginPath(); ctx.arc(bx, by, 3, 0, 7); ctx.fill(); } }
  if (id === 'cake') { ctx.fillStyle = '#fbe3ea'; ctx.beginPath(); ctx.moveTo(-10, 8); ctx.lineTo(10, 8); ctx.lineTo(10, -2); ctx.lineTo(-10, -6); ctx.fill(); ctx.fillStyle = '#ef8fb0'; ctx.fillRect(-10, 1, 20, 2.5); ctx.fillStyle = '#e04a6a'; ctx.beginPath(); ctx.arc(0, -7, 3, 0, 7); ctx.fill(); }
  if (id === 'tea') { ctx.fillStyle = '#e8e2d0'; ctx.beginPath(); ctx.moveTo(-8, -5); ctx.lineTo(8, -5); ctx.lineTo(6, 8); ctx.lineTo(-6, 8); ctx.fill(); ctx.fillStyle = '#8cbf5a'; ctx.beginPath(); ctx.ellipse(0, -5, 8, 2.5, 0, 0, 7); ctx.fill(); }
  ctx.restore();
}

// ---- furniture (top-down) ----
export function drawFurniture(ctx, id, x, y, cell, rot, alpha = 1) {
  const d = FURNITURE[id], f = footprint(id, rot), w = f.w * cell, h = f.h * cell, p = 4;
  ctx.save(); ctx.globalAlpha = alpha; ctx.translate(x + w / 2, y + h / 2); ctx.rotate((rot * Math.PI) / 2);
  const W = d.w * cell, H = d.h * cell, L = -W / 2 + p, T = -H / 2 + p, IW = W - 2 * p, IH = H - 2 * p;
  ctx.shadowColor = 'rgba(0,0,0,0.25)'; ctx.shadowOffsetY = d.layer === 'obj' ? 4 : 0; ctx.shadowBlur = d.layer === 'obj' ? 4 : 0;
  const dark = (c, a = 0.18) => { ctx.fillStyle = c; ctx.fill(); ctx.shadowColor = 'transparent'; ctx.fillStyle = `rgba(0,0,0,${a})`; };
  switch (id) {
    case 'bed': rr(ctx, L, T, IW, IH, 8); dark('#8a5a34'); ctx.fillStyle = '#fff'; rr(ctx, L + 6, T + 6, IW - 12, IH * 0.24, 8); ctx.fill(); ctx.fillStyle = d.color; rr(ctx, L + 3, T + IH * 0.36, IW - 6, IH * 0.62, 6); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.35)'; for (let i = 0; i < 3; i++) ctx.fillRect(L + 3, T + IH * (0.45 + i * 0.17), IW - 6, 3); break;
    case 'sofa': rr(ctx, L, T, IW, IH, 10); dark(d.color); ctx.fillStyle = 'rgba(0,0,0,0.18)'; rr(ctx, L, T, IW, IH * 0.35, 10); ctx.fill(); ctx.fillStyle = 'rgba(255,255,255,0.25)'; for (let i = 1; i < 3; i++) ctx.fillRect(L + (IW / 3) * i - 1, T + IH * 0.4, 2, IH * 0.55); break;
    case 'table': rr(ctx, L, T, IW, IH, 10); dark(d.color); ctx.fillStyle = 'rgba(255,255,255,0.2)'; rr(ctx, L + 6, T + 6, IW - 12, IH - 12, 6); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(0, 0, 8, 0, 7); ctx.fill(); ctx.fillStyle = '#c08a5a'; ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fill(); break;
    case 'chair': rr(ctx, L + 2, T + 2, IW - 4, IH - 4, 10); dark(d.color); ctx.fillStyle = 'rgba(255,255,255,0.35)'; ctx.beginPath(); ctx.arc(0, 0, IW * 0.18, 0, 7); ctx.fill(); break;
    case 'lamp': ctx.beginPath(); ctx.arc(0, 0, IW * 0.42, 0, 7); dark(d.color); ctx.shadowColor = 'transparent'; const g = ctx.createRadialGradient(0, 0, 2, 0, 0, cell); g.addColorStop(0, 'rgba(255,240,180,0.6)'); g.addColorStop(1, 'rgba(255,240,180,0)'); ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, cell, 0, 7); ctx.fill(); ctx.strokeStyle = '#d8b56a'; ctx.lineWidth = 1.5; for (let r = 5; r < IW * 0.42; r += 5) { ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.stroke(); } break;
    case 'plant': ctx.beginPath(); ctx.arc(0, 0, IW * 0.32, 0, 7); dark('#c0623b'); ctx.fillStyle = d.color; for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; ctx.beginPath(); ctx.ellipse(Math.cos(a) * 8, Math.sin(a) * 8, 9, 5, a, 0, 7); ctx.fill(); } ctx.fillStyle = '#7fd08a'; ctx.beginPath(); ctx.arc(0, 0, 6, 0, 7); ctx.fill(); break;
    case 'rug': ctx.beginPath(); ctx.ellipse(0, 0, IW / 2, IH / 2, 0, 0, 7); dark(d.color); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(0, 0, Math.max(1, IW / 2 - 8), Math.max(1, IH / 2 - 8), 0, 0, 7); ctx.stroke(); ctx.setLineDash([4, 5]); ctx.beginPath(); ctx.ellipse(0, 0, Math.max(1, IW / 2 - 16), Math.max(1, IH / 2 - 14), 0, 0, 7); ctx.stroke(); ctx.setLineDash([]); break;
    case 'tv': rr(ctx, L, T + IH * 0.15, IW, IH * 0.7, 6); dark('#7a5136'); ctx.fillStyle = d.color; rr(ctx, L + 8, T, IW - 16, IH * 0.6, 4); ctx.fill(); ctx.fillStyle = '#7ad3f0'; rr(ctx, L + 12, T + 3, IW - 24, IH * 0.42, 3); ctx.fill(); break;
    case 'kennel': rr(ctx, L, T, IW, IH, 6); dark(d.color); ctx.fillStyle = '#9c4a2a'; ctx.beginPath(); ctx.moveTo(L, T + IH * 0.5); ctx.lineTo(0, T); ctx.lineTo(L + IW, T + IH * 0.5); ctx.lineTo(L + IW, T + IH * 0.3); ctx.lineTo(0, T - 4); ctx.lineTo(L, T + IH * 0.3); ctx.fill(); ctx.fillStyle = '#3a2418'; ctx.beginPath(); ctx.arc(0, T + IH * 0.75, IW * 0.18, Math.PI, 0); ctx.fill(); ctx.fillStyle = '#fff'; ctx.font = 'bold 10px sans-serif'; ctx.textAlign = 'center'; ctx.fillText('INU', 0, T + IH * 0.42); break;
    case 'shelf': rr(ctx, L, T, IW, IH, 4); dark(d.color); const cols = ['#e0567a', '#3fb6a8', '#f2b84b', '#6c5ce7', '#5fb36a']; for (let i = 0; i < 7; i++) { ctx.fillStyle = cols[i % 5]; ctx.fillRect(L + 4 + i * ((IW - 8) / 7), T + 4, (IW - 8) / 7 - 2, IH - 8); } break;
    case 'bowl': ctx.beginPath(); ctx.arc(0, 0, IW * 0.36, 0, 7); dark(d.color); ctx.fillStyle = '#c99a5a'; ctx.beginPath(); ctx.arc(0, 0, IW * 0.24, 0, 7); ctx.fill(); drawBoneIcon(ctx, 0, 0, 0.8); break;
    case 'arcade': rr(ctx, L, T, IW, IH, 6); dark(d.color); ctx.fillStyle = '#1b1830'; rr(ctx, L + 5, T + 4, IW - 10, IH * 0.45, 3); ctx.fill(); ctx.fillStyle = '#ffd25a'; ctx.beginPath(); ctx.arc(L + IW * 0.35, T + IH * 0.75, 3, 0, 7); ctx.fill(); ctx.fillStyle = '#ff5a7a'; ctx.beginPath(); ctx.arc(L + IW * 0.65, T + IH * 0.75, 3, 0, 7); ctx.fill(); break;
  }
  ctx.restore();
}

export function drawRoom(ctx, home, ox, oy, cell, cols, rows) {
  const wall = WALLS[home.wall] || WALLS[0], floor = FLOORS[home.floor] || FLOORS[0], wallH = cell * 1.6;
  ctx.fillStyle = wall.color; ctx.fillRect(ox - 14, oy - wallH, cols * cell + 28, wallH);
  ctx.fillStyle = wall.trim; ctx.fillRect(ox - 14, oy - 10, cols * cell + 28, 10);
  if (home.wall === 2) { ctx.fillStyle = 'rgba(230,130,160,0.35)'; for (let i = 0; i < cols * 2; i++) { ctx.beginPath(); ctx.arc(ox + i * cell / 2 + 10, oy - wallH + 18 + (i % 2) * 22, 5, 0, 7); ctx.fill(); } }
  if (home.wall === 1) { ctx.fillStyle = 'rgba(0,0,0,0.08)'; for (let i = 0; i < cols * 3; i++) ctx.fillRect(ox - 14 + i * cell / 3, oy - wallH, 2, wallH); }
  if (home.wall === 3) { ctx.strokeStyle = 'rgba(255,255,255,0.6)'; for (let i = 0; i < cols * 2 + 2; i++) { ctx.strokeRect(ox - 14 + i * cell / 2, oy - wallH, cell / 2, wallH / 3); ctx.strokeRect(ox - 14 + i * cell / 2, oy - wallH * 2 / 3, cell / 2, wallH / 3); } }
  // window
  ctx.fillStyle = '#fff'; rr(ctx, ox + cell * 6.5, oy - wallH + 12, cell * 2, wallH - 34, 6); ctx.fill(); ctx.fillStyle = '#9fd8f5'; rr(ctx, ox + cell * 6.5 + 5, oy - wallH + 17, cell * 2 - 10, wallH - 44, 4); ctx.fill();
  ctx.fillStyle = '#fff'; ctx.fillRect(ox + cell * 7.5 - 1.5, oy - wallH + 17, 3, wallH - 44);
  ctx.fillStyle = floor.color; ctx.fillRect(ox, oy, cols * cell, rows * cell);
  ctx.strokeStyle = floor.line; ctx.lineWidth = 1;
  for (let y = 0; y < rows; y++) for (let x = 0; x < cols; x++) {
    if (home.floor === 2 && (x + y) % 2) { ctx.fillStyle = floor.line; ctx.fillRect(ox + x * cell, oy + y * cell, cell, cell); }
    else if (home.floor === 0) { ctx.beginPath(); ctx.moveTo(ox, oy + y * cell + 0.5); ctx.lineTo(ox + cols * cell, oy + y * cell + 0.5); ctx.stroke(); if ((x + y) % 3 === 0) { ctx.beginPath(); ctx.moveTo(ox + x * cell + 0.5, oy + y * cell); ctx.lineTo(ox + x * cell + 0.5, oy + y * cell + cell); ctx.stroke(); } }
    else if (home.floor === 1) { ctx.strokeRect(ox + x * cell + 1, oy + y * cell + 1, cell - 2, cell - 2); }
  }
  ctx.fillStyle = 'rgba(0,0,0,0.12)'; ctx.fillRect(ox, oy, cols * cell, 8);
  ctx.strokeStyle = '#5a4030'; ctx.lineWidth = 6; ctx.strokeRect(ox - 3, oy - 3, cols * cell + 6, rows * cell + 6);
  const sorted = [...home.items].sort((a, b) => (FURNITURE[a.id].layer === 'floor' ? -1 : 0) - (FURNITURE[b.id].layer === 'floor' ? -1 : 0) || a.y - b.y);
  for (const it of sorted) drawFurniture(ctx, it.id, ox + it.x * cell, oy + it.y * cell, cell, it.rot);
}
