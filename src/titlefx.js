// Title screen backdrop: night-blue sky, drifting clouds, two parallax rows of an Inu Verse town silhouette (café awning, shrine
// roof, kennel peaks, lit windows) and tumbling sakura petals. Original art, plain canvas rects. Pauses when the title is hidden.
export function startTitleFx(cv, { alive }) { const c = cv.getContext('2d'); let W = 0, H = 0, last = 0;
  const rnd = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
  const petals = Array.from({ length: 34 }, (_, i) => ({ x: rnd(i) * 2000, y: rnd(i + 99) * 1200, s: 0.6 + rnd(i + 7) * 0.9, p: rnd(i + 3) * 6.28 }));
  const clouds = Array.from({ length: 6 }, (_, i) => ({ x: rnd(i + 40) * 2000, y: 20 + rnd(i + 50) * 160, w: 70 + rnd(i + 60) * 90, v: 6 + rnd(i + 70) * 8 }));
  const town = (seed, n) => Array.from({ length: n }, (_, i) => ({ w: 40 + rnd(seed + i) * 70, h: 40 + rnd(seed + i + 500) * 90, kind: Math.floor(rnd(seed + i + 900) * 4) }));
  const far = town(1, 40), near = town(2, 30);
  const R = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), Math.round(w), Math.round(h)); };
  function row(list, base, speed, t, col, win) { const total = list.reduce((a, b) => a + b.w + 6, 0); let x = -((t * speed) % total);
    for (let k = 0; k < 2; k++) for (const b of list) { if (x > W) break; const top = base - b.h; R(x, top, b.w, b.h + 400, col);
      if (b.kind === 0) { R(x - 4, top - 6, b.w + 8, 6, col); R(x + b.w / 2 - 10, top - 16, 20, 10, col); } // shrine roof
      else if (b.kind === 1) { for (let i = 0; i < b.w; i += 8) R(x + i, top - (i % 16 ? 4 : 8), 8, 8, col); } // awning
      else if (b.kind === 2) { R(x + b.w / 2 - 6, top - 12, 12, 12, col); R(x + b.w / 2 - 12, top - 6, 24, 6, col); } // kennel peak
      if (win) for (let wy = top + 10; wy < base - 10; wy += 16) for (let wx = x + 8; wx < x + b.w - 10; wx += 14) if (rnd(Math.floor(wx * 3 + wy * 7)) > 0.55) R(wx, wy, 5, 6, (Math.sin(t * 0.7 + wx) > 0.92) ? '#fff2b0' : win);
      x += b.w + 6; } }
  function frame(now) { if (!alive()) { last = 0; return requestAnimationFrame(frame); } const t = now / 1000; const dw = cv.clientWidth, dh = cv.clientHeight;
    if (dw !== W || dh !== H) { W = cv.width = dw; H = cv.height = dh; } c.imageSmoothingEnabled = false;
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, '#141a3a'); g.addColorStop(0.6, '#2a2f6a'); g.addColorStop(1, '#5a3a6a'); c.fillStyle = g; c.fillRect(0, 0, W, H);
    { const mx = W * 0.8, my = H * 0.1; R(mx, my + 6, 28, 16, '#fff2c8'); R(mx + 4, my + 2, 20, 24, '#fff2c8'); R(mx + 8, my, 12, 28, '#fff2c8'); R(mx + 16, my + 6, 5, 4, '#e8d9a8'); } // moon
    for (const k of clouds) { const x = ((k.x + t * k.v) % (W + 260)) - 200; R(x, k.y, k.w, 14, 'rgba(255,255,255,.10)'); R(x + 14, k.y - 8, k.w * 0.6, 10, 'rgba(255,255,255,.08)'); }
    row(far, H * 0.78, 6, t, '#1d2350', '#3a4280'); row(near, H * 0.92, 14, t, '#0f1430', '#d4a640');
    for (const p of petals) { const x = ((p.x + t * 28 * p.s + Math.sin(t * 0.9 + p.p) * 30) % (W + 40)) - 20, y = ((p.y + t * 20 * p.s) % (H + 40)) - 20, f = Math.floor(t * 5 + p.p) % 3;
      c.fillStyle = p.s > 1.1 ? '#ffd0de' : '#f59ab8'; if (f === 0) c.fillRect(x, y, 4, 2); else if (f === 1) c.fillRect(x + 1, y, 2, 3); else c.fillRect(x, y + 1, 4, 1); }
    last = now; requestAnimationFrame(frame); }
  requestAnimationFrame(frame); }
