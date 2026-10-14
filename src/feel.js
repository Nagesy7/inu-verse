// Game feel: dust puffs, grass rustle, '!' interaction bubble, screen fades, RPG dialogue box with typewriter text.
const parts = [];
let fadeEl = null, dlg = null;
const R = (c, x, y, w, h, col) => { c.fillStyle = col; c.fillRect(Math.round(x), Math.round(y), w, h); };
export const feel = {
  dust(x, y) { for (let i = 0; i < 2; i++) parts.push({ k: 'dust', x: x + (i ? 5 : -5), y, vx: (i ? 14 : -14) + (Math.random() - 0.5) * 8, vy: -6, life: 0.45, max: 0.45 }); },
  rustle(x, y) { for (let i = 0; i < 3; i++) parts.push({ k: 'leaf', x: x + (Math.random() - 0.5) * 14, y, z: 2, vx: (Math.random() - 0.5) * 40, vz: 30 + Math.random() * 30, life: 0.55, max: 0.55, col: Math.random() < 0.5 ? '#6cbd55' : '#9bdc6e' }); },
  step(dt) {
    for (const p of parts) { p.life -= dt; p.x += p.vx * dt; if (p.k === 'dust') p.y += p.vy * dt; else { p.z += p.vz * dt; p.vz -= 160 * dt; if (p.z < 0) { p.z = 0; p.vx *= 0.5; } } }
    for (let i = parts.length - 1; i >= 0; i--) if (parts[i].life <= 0) parts.splice(i, 1);
    if (dlg?.open && dlg.shown < dlg.text.length) { dlg.acc += dt * 45; while (dlg.acc >= 1 && dlg.shown < dlg.text.length) { dlg.acc--; dlg.shown++; if (dlg.shown % 2 === 0 && dlg.text[dlg.shown - 1] !== ' ') dlg.blip?.(); } dlg.body.textContent = dlg.text.slice(0, dlg.shown); dlg.el.classList.toggle('done', dlg.shown >= dlg.text.length); }
    if (dlg?.open && dlg.shown >= dlg.text.length) { dlg.hold -= dt; if (dlg.hold <= 0) feel.close(); }
  },
  drawGround(c) { for (const p of parts) if (p.k === 'dust') { const k = p.life / p.max, r = Math.round(2 + (1 - k) * 4); c.globalAlpha = k * 0.8; R(c, p.x - r, p.y - r / 2, r * 2, r, '#f4ead2'); R(c, p.x - r + 1, p.y - r / 2 - 1, r * 2 - 2, 1, '#fffaf0'); c.globalAlpha = 1; } },
  drawAir(c) { for (const p of parts) if (p.k === 'leaf') { c.globalAlpha = Math.min(1, p.life / p.max * 2); R(c, p.x, p.y - p.z, 2, 2, p.col); c.globalAlpha = 1; } },
  bubble(c, x, y, t) { // classic '!' pop bubble over the interactable you are standing at
    const b = Math.round(Math.abs(Math.sin(t * 5)) * -4), X = Math.round(x) - 8, Y = Math.round(y) - 22 + b;
    R(c, X, Y, 16, 16, '#141a2e'); R(c, X + 1, Y + 1, 14, 14, '#fff6e0'); R(c, X + 1, Y + 13, 14, 2, '#d8c8a0'); R(c, X + 6, Y + 16, 4, 2, '#141a2e'); R(c, X + 7, Y + 15, 2, 2, '#fff6e0');
    R(c, X + 7, Y + 3, 2, 7, '#d8323c'); R(c, X + 7, Y + 11, 2, 2, '#d8323c');
  },
  fade() { if (!fadeEl) { fadeEl = document.getElementById('fade'); if (!fadeEl) return; } fadeEl.classList.remove('go'); void fadeEl.offsetWidth; fadeEl.classList.add('go'); },
  say(name, text, blip) {
    if (!dlg) { const el = document.getElementById('dialog'); if (!el) return; dlg = { el, nm: el.querySelector('.dname'), body: el.querySelector('.dtext') }; el.onclick = () => feel.advance(); }
    Object.assign(dlg, { open: true, text, shown: 0, acc: 0, hold: 3.2, blip }); dlg.nm.textContent = name; dlg.body.textContent = ''; dlg.el.hidden = false; dlg.el.classList.remove('done', 'out');
  },
  talking: () => !!dlg?.open,
  advance() { if (!dlg?.open) return; if (dlg.shown < dlg.text.length) dlg.shown = dlg.text.length, dlg.body.textContent = dlg.text; else feel.close(); },
  close() { if (!dlg?.open) return; dlg.open = false; dlg.el.classList.add('out'); setTimeout(() => { if (!dlg.open) dlg.el.hidden = true; }, 180); },
};
