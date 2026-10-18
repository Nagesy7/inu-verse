// Runtime for Round 2 rooms & zones: own camera (clamped to the room), tap-to-walk with A*, the Round 1 motion model
// (accel/decel, run, dust), portals (exit mats, gates, ferry), interactable spots, wandering/staff NPCs with chat.
import * as MOB from './mobility.js';
import { ST, scene, solidAt, spawnOf, nearestSpot, makePortalState, portalStep, wanderTarget, exitAt, walkInExits } from './scenes.js';
import { sceneGround, sceneProps, drawSceneWater } from './sceneart.js';
export function makeRoomPlay(D) {
  const R = { sc: null, p: { x: 0, y: 0 }, cam: { x: 0, y: 0 }, npcs: [], portal: makePortalState(), busy: false, chatT: 2, hist: [] };
  const P = D.player; // shared player runtime (face, phase, v, pw, running, clickMark)
  const solid = (x, y) => solidAt(R.sc, x, y);
  function moveBody(b, dx, dy, r = 6) { const bl = (x, y) => solid(Math.floor((x - r) / ST), Math.floor((y - r) / ST)) || solid(Math.floor((x + r) / ST), Math.floor((y - r) / ST)) || solid(Math.floor((x - r) / ST), Math.floor((y + r * 0.6) / ST)) || solid(Math.floor((x + r) / ST), Math.floor((y + r * 0.6) / ST));
    if (!bl(b.x + dx, b.y)) b.x += dx; if (!bl(b.x, b.y + dy)) b.y += dy; }
  function stop() { P.pw.pts = []; P.path = P.pw.pts; P.target = null; P.npcT = null; P.clickMark = null; }
  function enter(id, at = null, { fromHub = null } = {}) { const sc = scene(id); if (!sc) return false;
    const s = at && typeof at === 'object' ? at : spawnOf(id, at); R.sc = sc; R.p = { x: s.x, y: s.y }; P.face = s.face || 'up'; P.v = { x: 0, y: 0 }; stop();
    R.portal = makePortalState(); R.portal.tile = Math.floor(s.y / ST) * 1000 + Math.floor(s.x / ST); R.portal.until = D.time() + 0.5;
    if (fromHub) R.fromHub = fromHub; R.hist.push(id); if (R.hist.length > 20) R.hist.shift();
    R.npcs = (sc.npcs || []).map((n) => ({ ...n, x: (n.x + 0.5) * ST, y: (n.y + 0.5) * ST, face: n.face || 'down', phase: Math.random() * 6, moving: false, path: [], wait: 1 + Math.random() * 3, home: [n.x, n.y] }));
    R.cam = { x: R.p.x, y: R.p.y }; clampCam(true); return true; }
  function viewW() { return innerWidth / D.zoom(); } function viewH() { return innerHeight / D.zoom(); }
  function clampCam(snap) { const W = R.sc.w * ST, H = R.sc.h * ST, vw = viewW(), vh = viewH(); const tx = W <= vw ? W / 2 : Math.max(vw / 2, Math.min(W - vw / 2, R.p.x)), ty = H <= vh ? H / 2 : Math.max(vh / 2, Math.min(H - vh / 2, R.p.y - 8));
    if (snap) { R.cam.x = tx; R.cam.y = ty; } else { R.cam.x += (tx - R.cam.x) * Math.min(1, D.dt * 10); R.cam.y += (ty - R.cam.y) * Math.min(1, D.dt * 10); } }
  function planTo(goal, opt = {}) { const sx = Math.floor(R.p.x / ST), sy = Math.floor(R.p.y / ST); const raw = MOB.astar(sx, sy, goal[0], goal[1], solid, { w: R.sc.w, h: R.sc.h }); if (!raw) return false;
    const pts = MOB.smoothPath(raw, solid, ST).slice(1), end = raw[raw.length - 1]; Object.assign(P.pw, { pts: pts.length ? pts : [end], goal: end, run: !!opt.run, stuckT: 0, lastD: Infinity, replans: 0 });
    P.path = P.pw.pts; P.target = opt.spot || null; P.npcT = opt.npc || null; P.exitT = opt.exit || null; if (opt.mark !== false) P.clickMark = { x: (end[0] + 0.5) * ST, y: (end[1] + 0.5) * ST, t: 1, npc: !!opt.npc }; return true; }
  const toWorld = (sx, sy) => ({ x: (sx - innerWidth / 2) / D.zoom() + R.cam.x, y: (sy - innerHeight / 2) / D.zoom() + R.cam.y });
  function click(sx, sy, run) { if (R.busy) return; const w = toWorld(sx, sy), tx = Math.floor(w.x / ST), ty = Math.floor(w.y / ST);
    for (const n of R.npcs) if (Math.abs(w.x - n.x) < 16 && n.y - w.y > -10 && n.y - w.y < 44) { n.held = 6; return planTo([Math.floor(n.x / ST), Math.floor(n.y / ST)], { npc: n, run }); }
    const spot = R.sc.spots.find((s) => (s.tx === tx && s.ty === ty) || (Math.abs(s.tx - tx) <= 1 && Math.abs(s.ty - ty) <= 1 && solid(tx, ty) && R.sc.at(tx, ty)?.prop));
    if (spot) return planTo([spot.tx, spot.ty], { spot, run });
    const ex = exitAt(R.sc, tx, ty); if (ex) return planTo([tx, ty], { exit: ex, run });
    return planTo([tx, ty], { run }); }
  function useSpot(s) { if (!s) return; P.face = s.face; const a = s.act; D.blip?.(880);
    if (a.panel) D.openPanel(a.panel, a.opts || {});
    else if (a.build) D.build(a.build);
    else if (a.travel) travel(a.travel, a.at, 'ferry');
    else if (a.say) { D.say(s.name, a.say); if (a.emote) D.emote?.(a.emote); if (a.bell) D.bell?.(); } }
  function talk(n) { n.held = 3; n.face = n.x > R.p.x ? 'left' : 'right'; if (Math.abs(n.y - R.p.y) > Math.abs(n.x - R.p.x)) n.face = n.y > R.p.y ? 'up' : 'down'; D.say(n.name, n.lines[Math.floor(Math.random() * n.lines.length)]); D.faceTalk?.(n.name); }
  function nearNpc() { let b = null, bd = 40; for (const n of R.npcs) { const d = Math.hypot(n.x - R.p.x, n.y - R.p.y); if (d < bd) { bd = d; b = n; } } return b; }
  function act() { const s = nearestSpot(R.sc, R.p.x, R.p.y); if (s) return useSpot(s); const n = nearNpc(); if (n) return talk(n);
    const ex = exitAt(R.sc, Math.floor(R.p.x / ST), Math.floor(R.p.y / ST)); if (ex) return D.portal(ex); }
  function travel(to, at, how) { if (R.busy) return; globalThis.__portalFires = (globalThis.__portalFires || 0) + 1; R.busy = true; stop(); D.fade(); setTimeout(() => { R.busy = false; enter(to, at); D.arrived?.(R.sc, how); }, 80); }
  function arrive() { const s = P.target, n = P.npcT, ex = P.exitT; P.target = P.npcT = P.exitT = null; P.clickMark = null;
    if (s) useSpot(s); else if (n) { if (Math.hypot(n.x - R.p.x, n.y - R.p.y) < 44) talk(n); else if (P.pw.replans++ < 3) planTo([Math.floor(n.x / ST), Math.floor(n.y / ST)], { npc: n, mark: false }); }
    else if (ex) { P.face = ex.face; D.portal(ex); } }
  function update(dt) { D.dt = dt; const sc = R.sc; if (!sc) return; const inp0 = D.input();
    const inp = MOB.pickInput({ keys: { x: inp0.dx, y: inp0.dy }, stick: inp0.stick, stickMag: inp0.mag, shift: inp0.shift, holdRun: inp0.holdRun, path: P.pw.pts.length > 0, pathRun: P.pw.run });
    if (R.busy || D.blocked()) { P.v = { x: 0, y: 0 }; P.moving = false; P.push = null; } else {
      if (inp.cancelPath && P.pw.pts.length) stop();
      const top = MOB.WALK_SPEED * (inp.run ? MOB.RUN_MULT : 1); let want = inp.source === 'none' || inp.source === 'path' ? { x: 0, y: 0 } : { x: inp.dir.x * top, y: inp.dir.y * top };
      if (inp.source === 'path') { const f = MOB.followStep(P.pw, R.p, top, dt, ST);
        if (f?.stuck && P.pw.goal && P.pw.replans++ < 3) planTo(P.pw.goal, { spot: P.target, npc: P.npcT, exit: P.exitT, run: P.pw.run, mark: false }); else if (f?.stuck) stop();
        if (f) { want = f.want; if (f.arrive) { P.v = { x: 0, y: 0 }; if (f.snap) moveBody(R.p, f.snap.x - R.p.x, f.snap.y - R.p.y); arrive(); } } }
      P.push = { x: want.x, y: want.y }; // what the player is trying to do (walls kill velocity, not intent): portals use it
      P.v = MOB.stepVelocity(P.v, want, dt);
      if (P.v.x || P.v.y) { const bx = R.p.x, by = R.p.y; moveBody(R.p, P.v.x * dt, P.v.y * dt); if (inp.source !== 'path') { if (Math.abs(R.p.x - bx) < 1e-4) P.v.x = 0; if (Math.abs(R.p.y - by) < 1e-4) P.v.y = 0; } }
      const sp = Math.hypot(P.v.x, P.v.y); P.moving = sp > 12 || (inp.source !== 'none' && inp.source !== 'path' && (inp.dir.x || inp.dir.y)); P.running = inp.run && sp > MOB.WALK_SPEED * 1.1;
      if (sp > 12) { if (Math.abs(P.v.x) > 1) P.dir = P.v.x > 0 ? 1 : -1; P.face = MOB.faceOf(P.v.x, P.v.y, P.face); }
      else if (inp.source === 'keys' || inp.source === 'stick') P.face = MOB.faceOf(inp.dir.x * 50, inp.dir.y * 50, P.face);
      if (P.running) { R.dust = (R.dust || 0) + dt; if (R.dust > 0.11) { R.dust = 0; D.dust(R.p.x - P.dir * 6, R.p.y + 11); } }
      const ex = portalStep(R.portal, sc, { x: R.p.x, y: R.p.y, face: P.face, moving: P.moving, push: P.push }, D.time(), [...sc.exits, ...walkInExits(sc)]); if (ex) { if (ex.spot) useSpot(ex.spot); else D.portal(ex); } }
    P.phase += P.moving ? dt * (P.running ? 21 : 12) : dt * 2;
    // NPCs: staff stay put (turn to face you when near), customers wander
    for (const n of R.npcs) { if (n.held > 0) { n.held -= dt; n.moving = false; n.phase += dt * 2; continue; }
      if (n.staff) { n.moving = false; n.phase += dt * 2; const d = Math.hypot(n.x - R.p.x, n.y - R.p.y); n.face = d < 90 ? (Math.abs(n.x - R.p.x) > Math.abs(n.y - R.p.y) ? (n.x > R.p.x ? 'left' : 'right') : (n.y > R.p.y ? 'up' : 'down')) : n.face0 || (n.face0 = n.face); continue; }
      if (!n.path.length) { n.moving = false; n.phase += dt * 2; n.wait -= dt; if (n.wait <= 0) { n.wait = 2 + Math.random() * 4; const g = wanderTarget(sc, n, Math.random); if (g) { const pth = MOB.astar(Math.floor(n.x / ST), Math.floor(n.y / ST), g[0], g[1], solid, { w: sc.w, h: sc.h }); if (pth && pth.length < 10) n.path = pth.slice(1); } } continue; }
      const [tx, ty] = n.path[0], gx = (tx + 0.5) * ST, gy = (ty + 0.5) * ST, dx = gx - n.x, dy = gy - n.y, d = Math.hypot(dx, dy), st = 46 * dt;
      if (d <= st) { n.x = gx; n.y = gy; n.path.shift(); } else { n.x += dx / d * st; n.y += dy / d * st; } n.moving = true; n.phase += dt * 10; n.face = MOB.faceOf(dx, dy, n.face); }
    R.chatT -= dt; if (R.chatT <= 0 && R.npcs.length) { R.chatT = 5 + Math.random() * 5; const n = R.npcs[Math.floor(Math.random() * R.npcs.length)]; if (Math.hypot(n.x - R.p.x, n.y - R.p.y) < 260) D.chat?.(n.name, n.lines[Math.floor(Math.random() * n.lines.length)]); }
    clampCam(false); }
  function render(c, dpr) { const sc = R.sc, Z = D.zoom(), SW = innerWidth, SH = innerHeight, vw = SW / Z, vh = SH / Z, t = D.time(), night = D.night?.() && sc.kind === 'zone';
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.imageSmoothingEnabled = false; c.fillStyle = sc.kind === 'zone' ? '#2f6fb0' : '#141a2e'; c.fillRect(0, 0, SW, SH);
    const q = 1 / (Z * dpr), snap = (v) => Math.round(v / q) * q, ox = snap(vw / 2 - R.cam.x), oy = snap(vh / 2 - R.cam.y);
    c.setTransform(dpr * Z, 0, 0, dpr * Z, 0, 0); c.save(); c.translate(ox, oy); c.drawImage(sceneGround(sc, night), 0, 0);
    if (sc.kind === 'zone') drawSceneWater(c, sc, t, Math.floor(-ox / ST) - 1, Math.floor(-oy / ST) - 1, Math.ceil((-ox + vw) / ST) + 1, Math.ceil((-oy + vh) / ST) + 1);
    D.drawGround(c);
    if (P.clickMark && P.pw.pts.length) D.drawMark(c, P.clickMark, t);
    const list = sceneProps(sc, t, night).filter((p) => p.y > -oy - 80 && p.y < -oy + vh + 120);
    for (const n of R.npcs) list.push({ y: n.y + 6, a: { ...n, npc: true } });
    for (const a of D.remotes?.({ x0: -ox, y0: -oy, x1: -ox + vw, y1: -oy + vh }, R.p) || []) list.push({ y: a.y + 6, a }); // live players in this room/zone
    list.push({ y: R.p.y + 6, a: { me: true, x: R.p.x, y: R.p.y } }); list.sort((a, b) => a.y - b.y);
    for (const it of list) { if (!it.a) { it.d(c); continue; } D.drawActor(c, it.a, snap); }
    D.drawAir(c); D.drawChat(c, (id) => id === 'me' ? { x: R.p.x, y: R.p.y - 60 } : (() => { const n = R.npcs.find((q) => q.name === id); return n ? { x: n.x, y: n.y - 60 } : D.anchor?.(id) || null; })());
    const s = !D.blocked() && nearestSpot(sc, R.p.x, R.p.y); if (s) D.bubble(c, (s.tx + 0.5) * ST, (s.ty + 0.5) * ST - 62, t); // above your head (you stand on the spot)
    c.restore(); if (night) { c.setTransform(dpr, 0, 0, dpr, 0, 0); c.fillStyle = 'rgba(20,24,70,.35)'; c.fillRect(0, 0, SW, SH); }
    globalThis.__roomCam = { ox, oy, Z }; }
  return { R, enter, update, render, click, act, travel, planTo, stop, get id() { return R.sc?.id; }, get sc() { return R.sc; }, nearSpot: () => R.sc && nearestSpot(R.sc, R.p.x, R.p.y) };
}
