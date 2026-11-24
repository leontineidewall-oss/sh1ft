// sh1ft · the office: an endless room of desks after dark, drawn by a small 3D projector on a 2D canvas.
// every desk is a holder. a lit screen is someone on shift; a cardboard box is someone who sold.
(function(){
const FOG = [5, 5, 7], WARM = "255,210,154";
function World(cv, o){
  o = o || {}; const W = this; W.cv = cv; W.c = cv.getContext("2d"); W.o = o;
  W.cam = { x: 0, y: 2.3, z: -3, pitch: .1, yaw: 0, fov: .62 }; W.target = null;
  W.rows = o.rows || 10; W.cols = [-6.6, -3.9, -1.2, 1.5, 4.2, 6.9, 9.6, -9.3, 12.3, -12];
  W.desks = []; for (let r = 0; r < W.rows; r++) for (let k = 0; k < W.cols.length; k++) W.desks.push({ i: W.desks.length, x: W.cols[k], z: 2 + r * 2.6, state: "empty", w: null, glow: 0, box: 0, hl: 0, sel: 0 });
  // nearest desks first: desk 1 sits at the front of the aisle
  W.desks.sort((a, b) => (a.z - b.z) || (Math.abs(a.x - .15) - Math.abs(b.x - .15))); W.desks.forEach((d, i) => { d.i = i; });
  W.lights = []; for (let z = 1.2; z < 70; z += 3.6) for (let x = -19.2; x <= 19.2; x += 4.8) W.lights.push({ x, z, on: 0, want: 1, flick: 0 });
  W.cams = []; for (let z = 6; z < 50; z += 9) for (const x of [-5.3, 5.5, -10.6, 10.8]) W.cams.push({ x, z });
  W.drops = []; W.hover = null; W.t0 = performance.now(); W.lightLevel = o.light == null ? .4 : o.light;
  W.sprite = glowSprite(); W.dpr = Math.min(2, window.devicePixelRatio || 1) * (o.scale || 1); W.size();
  addEventListener("resize", () => W.size());
}
function glowSprite(){ const s = document.createElement("canvas"); s.width = s.height = 128; const c = s.getContext("2d"), g = c.createRadialGradient(64, 64, 0, 64, 64, 64);
  g.addColorStop(0, "rgba(255,214,160,.9)"); g.addColorStop(.25, "rgba(255,190,120,.32)"); g.addColorStop(1, "rgba(255,170,90,0)"); c.fillStyle = g; c.fillRect(0, 0, 128, 128); return s; }
World.prototype.size = function(){ const r = this.cv.getBoundingClientRect(); this.w = Math.max(1, r.width); this.h = Math.max(1, r.height); this.cv.width = Math.round(this.w * this.dpr); this.cv.height = Math.round(this.h * this.dpr); };
// project a world point through the camera: yaw, then pitch
World.prototype.P = function(x, y, z){ const c = this.cam, dx = x - c.x, dy = y - c.y, dz = z - c.z, cy = Math.cos(c.yaw), sy = Math.sin(c.yaw);
  const xx = dx * cy - dz * sy, z1 = dx * sy + dz * cy, cp = Math.cos(c.pitch), sp = Math.sin(c.pitch), yy = dy * cp + z1 * sp, zz = z1 * cp - dy * sp, f = Math.max(this.w, this.h * .8) * c.fov;
  return [this.w * .5 + f * xx / zz, this.h * (c.cy || .5) - f * yy / zz, zz]; };
// put real people at the desks: workers first, then the boxes of the fired, the rest stay empty
World.prototype.setData = function(workers, fired){ const W = this; W.desks.forEach(d => { d.state = "empty"; d.w = null; d.info = null; });
  (workers || []).slice(0, W.desks.length).forEach((x, i) => { const d = W.desks[i]; d.state = "on"; d.w = x.w; d.info = x; });
  let j = (workers || []).length; (fired || []).forEach(x => { if (j < W.desks.length) { const d = W.desks[j++]; d.state = "fired"; d.w = x.w; d.info = x; } }); };
World.prototype.drop = function(n){ for (let i = 0; i < (n || 60); i++) { const d = this.desks[Math.floor(Math.random() * Math.min(this.desks.length, 60))]; if (d.state !== "on") continue; this.drops.push({ x: d.x + (Math.random() - .5) * .6, y: 3.2 + Math.random() * 2, z: d.z + .3, v: 0, d }); } };
World.prototype.frame = function(now){
  const W = this, c = W.c, t = (now - W.t0) / 1000, cam = W.cam; c.setTransform(W.dpr, 0, 0, W.dpr, 0, 0);
  if (W.target) { for (const k in W.target) cam[k] += (W.target[k] - cam[k]) * Math.min(1, (W.ease || .04)); }
  const w = W.w, h = W.h, fogd = W.o.fogd || 20, fk = z => 1 - Math.exp(-Math.max(0, z - 2) / fogd);
  const col = (rgb, z, a) => { const k = fk(z); return "rgba(" + ((rgb[0] + (FOG[0] - rgb[0]) * k) | 0) + "," + ((rgb[1] + (FOG[1] - rgb[1]) * k) | 0) + "," + ((rgb[2] + (FOG[2] - rgb[2]) * k) | 0) + "," + (a == null ? 1 : a) + ")"; };
  c.fillStyle = "#060607"; c.fillRect(0, 0, w, h);
  const CEIL = 3.3, ZM = 70;
  // floor and ceiling grids
  c.lineWidth = 1;
  for (let z = Math.ceil(cam.z) + 1; z < ZM; z += 1) { const a = W.P(-40, 0, z), b = W.P(40, 0, z); if (a[2] < .3 || b[2] < .3) continue; c.strokeStyle = col([44, 44, 50], (a[2] + b[2]) / 2); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
  for (let x = -40; x <= 40; x += 1.2) { const a = W.P(x, 0, Math.max(cam.z + .6, 0)), b = W.P(x, 0, ZM); if (a[2] < .3) continue; c.strokeStyle = "rgba(60,60,68,.28)"; c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
  for (let z = Math.ceil(cam.z) + 1; z < ZM; z += 1.2) { const a = W.P(-40, CEIL, z), b = W.P(40, CEIL, z); if (a[2] < .3 || b[2] < .3) continue; c.strokeStyle = col([28, 28, 32], (a[2] + b[2]) / 2); c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(b[0], b[1]); c.stroke(); }
  // the tubes: some on, some dead, a few that flicker
  const lit = [];
  for (const L of W.lights) { L.on += ((L.want ? 1 : 0) - L.on) * .12; let b = L.on; if (L.flick && Math.sin(t * 23 + L.x) > .6 && Math.random() < .5) b *= .25;
    const a = W.P(L.x - .9, CEIL - .01, L.z), bb = W.P(L.x + .9, CEIL - .01, L.z), cc = W.P(L.x + .9, CEIL - .01, L.z + .55), d = W.P(L.x - .9, CEIL - .01, L.z + .55);
    if (a[2] < .4 || d[2] < .4) continue; const zz = (a[2] + d[2]) / 2;
    if (b > .05) { const m = W.P(L.x, CEIL - .02, L.z + .3), r = Math.max(w, h * .8) * cam.fov * 1.4 / m[2]; c.globalAlpha = .5 * b * (1 - fk(zz)); c.drawImage(W.sprite, m[0] - r, m[1] - r * .7, r * 2, r * 1.4); c.globalAlpha = 1; lit.push([L, b, zz]); }
    c.fillStyle = b > .05 ? "rgba(255,246,234," + (.12 + .88 * b * (1 - fk(zz) * .8)).toFixed(3) + ")" : col([24, 24, 28], zz);
    c.beginPath(); c.moveTo(a[0], a[1]); c.lineTo(bb[0], bb[1]); c.lineTo(cc[0], cc[1]); c.lineTo(d[0], d[1]); c.closePath(); c.fill(); }
  // pools of light on the floor
  for (const [L, b, zz] of lit) { if (zz > 36) continue; const p = W.P(L.x, 0, L.z + .3); if (p[2] < .5) continue; const r = Math.max(w, h * .8) * cam.fov * 1.9 / p[2]; c.globalAlpha = .16 * b; c.drawImage(W.sprite, p[0] - r, p[1] - r * .3, r * 2, r * .6); c.globalAlpha = 1; }
  // build this frame's faces
  const F = [];
  const quad = (pts, rgb, ex) => { const pp = pts.map(p => W.P(p[0], p[1], p[2])); for (const p of pp) if (p[2] < .25) return; F.push({ pp, z: (pp[0][2] + pp[1][2] + pp[2][2] + pp[3][2]) / 4, rgb, ex }); };
  const box = (x0, x1, y0, y1, z0, z1, top, front, side, ex) => {
    if (cam.y > y1) quad([[x0, y1, z0], [x1, y1, z0], [x1, y1, z1], [x0, y1, z1]], top, ex);
    if (cam.x < x0) quad([[x0, y0, z0], [x0, y1, z0], [x0, y1, z1], [x0, y0, z1]], side, ex); else if (cam.x > x1) quad([[x1, y0, z0], [x1, y1, z0], [x1, y1, z1], [x1, y0, z1]], side, ex);
    if (cam.z < z0) quad([[x0, y0, z0], [x1, y0, z0], [x1, y1, z0], [x0, y1, z0]], front, ex); };
  const DESK = [70, 70, 74], DS = [42, 42, 46], DF = [34, 34, 38], DARK = [12, 12, 14];
  for (const d of W.desks) { const x = d.x, z = d.z; if (z - cam.z > ZM || z - cam.z < -1) continue;
    const hl = d === W.hover || d.sel ? 1 : 0;
    box(x - .75, x + .75, .72, .76, z, z + .8, hl ? [96, 92, 86] : DESK, DF, DS);
    box(x - .75, x - .7, 0, .72, z, z + .8, DS, DF, DS); box(x + .7, x + .75, 0, .72, z, z + .8, DS, DF, DS);
    box(x - .75, x + .75, .3, .72, z + .76, z + .8, DS, DS, DS);
    const on = d.state === "on"; d.glow += ((on ? 1 : 0) - d.glow) * .06; d.box += ((d.state === "fired" ? 1 : 0) - d.box) * .08;
    box(x - .34, x + .34, .8, 1.22, z + .5, z + .56, DARK, d.glow > .05 ? [Math.round(12 + 230 * d.glow), Math.round(12 + 180 * d.glow), Math.round(14 + 120 * d.glow)] : DARK, DARK, { glow: d.glow, d });
    if (d.box > .05) { const s = d.box, y0 = .76 + (1 - s) * .6; box(x - .32, x + .18, y0, y0 + .32 * s, z + .05, z + .42, [92, 80, 64], [70, 60, 48], [70, 60, 48], { fired: d }); }
    else if (d.glow > .05 && on) { const wx = x, wz = z - .38, k = d.glow;
      box(wx - .23, wx + .23, .45, .5, wz - .2, wz + .2, [30, 30, 34], [24, 24, 28], [28, 28, 32]);
      box(wx - .23, wx + .23, .5, 1.0, wz - .26, wz - .2, [26, 26, 30], [20, 20, 24], [24, 24, 28]);
      box(wx - .2, wx + .2, .5, 1.12, wz - .14, wz + .1, [48, 48, 52], [40, 40, 44], [34, 34, 38]);
      F.push({ head: [wx, 1.3 + Math.sin(t * 1.3 + d.i) * .008, wz], z: W.P(wx, 1.3, wz)[2] - .02, d, k }); } }
  for (const k of W.cams) { box(k.x - .02, k.x + .02, CEIL - .35, CEIL, k.z, k.z + .04, [40, 41, 44], [40, 41, 44], [40, 41, 44]); box(k.x - .14, k.x + .14, CEIL - .5, CEIL - .35, k.z - .2, k.z + .12, [32, 33, 36], [24, 25, 28], [30, 31, 34], { led: 1 }); }
  F.sort((a, b) => b.z - a.z);
  W.screen = [];
  for (const f of F) {
    if (f.head) { const p = W.P(f.head[0], f.head[1], f.head[2]), r = Math.max(w, h * .8) * cam.fov * .12 / p[2]; if (p[2] < .3) continue; c.fillStyle = col([16, 15, 15], p[2]); c.beginPath(); c.arc(p[0], p[1], r, 0, 7); c.fill();
      if (p[2] < 18) { c.strokeStyle = "rgba(" + WARM + "," + (.55 * f.k * (1 - fk(p[2]))).toFixed(3) + ")"; c.lineWidth = Math.max(1, r * .1); c.beginPath(); c.arc(p[0], p[1], r * .96, Math.PI * 1.1, Math.PI * 1.9); c.stroke(); }
      W.screen.push({ d: f.d, x: p[0], y: p[1], r: Math.max(10, r * 2.2), z: p[2] }); continue; }
    c.fillStyle = col(f.rgb, f.z); c.beginPath(); f.pp.forEach((p, i) => i ? c.lineTo(p[0], p[1]) : c.moveTo(p[0], p[1])); c.closePath(); c.fill();
    if (f.ex && f.ex.glow > .05) { const m = f.pp.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]), r = Math.max(w, h * .8) * cam.fov * .9 / f.z; c.globalAlpha = f.ex.glow * .75 * (1 - fk(f.z)); c.drawImage(W.sprite, m[0] - r, m[1] - r, r * 2, r * 2); c.globalAlpha = 1;
      if (f.ex.glow > .6 && f.z < 12) { const [a, b2, c2, d2] = f.pp, L = (u, v) => [a[0] + (b2[0] - a[0]) * u + (d2[0] - a[0]) * v, a[1] + (b2[1] - a[1]) * u + (d2[1] - a[1]) * v]; let sd = f.ex.d.i * 7 + 3; const rr = () => (sd = (sd * 16807) % 2147483647) / 2147483647;
        c.strokeStyle = "rgba(120,70,20,.55)"; c.lineWidth = Math.max(1, 3 / f.z); c.beginPath(); let v = .25 + rr() * .2; for (let k = 0; k <= 8; k++) { v = Math.max(.15, Math.min(.85, v + (rr() - .45) * .22 + (k === 8 ? Math.sin(t * .7 + f.ex.d.i) * .03 : 0))); const q = L(.1 + k * .1, v); k ? c.lineTo(q[0], q[1]) : c.moveTo(q[0], q[1]); } c.stroke(); }
      if (f.ex.d.state === "on" && !W.screen.some(s => s.d === f.ex.d)) W.screen.push({ d: f.ex.d, x: m[0], y: m[1], r: Math.max(10, Math.max(w, h * .8) * cam.fov * .5 / f.z), z: f.z }); }
    if (f.ex && f.ex.fired) { const m = f.pp.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]); W.screen.push({ d: f.ex.fired, x: m[0], y: m[1], r: Math.max(10, Math.max(w, h * .8) * cam.fov * .5 / f.z), z: f.z }); }
    if (f.ex && f.ex.led && f.z < 40) { const m = f.pp.reduce((s, p) => [s[0] + p[0] / 4, s[1] + p[1] / 4], [0, 0]), r = Math.max(1.2, Math.max(w, h * .8) * cam.fov * .025 / f.z), on = Math.sin(t * 3 + m[0]) > -.2; if (on) { c.fillStyle = "rgba(255,59,48,.95)"; c.shadowColor = "#ff3b30"; c.shadowBlur = r * 6; c.beginPath(); c.arc(m[0], m[1], r, 0, 7); c.fill(); c.shadowBlur = 0; } }
  }
  // wages falling: warm specks onto desks
  W.drops = W.drops.filter(p => { p.v += .004; p.y -= p.v; const s = W.P(p.x, p.y, p.z); if (s[2] > .3) { c.fillStyle = "rgba(255,214,160," + (.9 * (1 - fk(s[2]))).toFixed(3) + ")"; c.beginPath(); c.arc(s[0], s[1], Math.max(1, Math.max(w, h * .8) * cam.fov * .025 / s[2]), 0, 7); c.fill(); } return p.y > .8; });
  // dust in the light
  if (!W.dust) { W.dust = Array.from({ length: 70 }, () => ({ x: (Math.random() - .5) * 12, y: .4 + Math.random() * 2.8, z: Math.random() * 14, s: Math.random() * 6.28 })); }
  for (const p of W.dust) { p.y += Math.sin(t * .3 + p.s) * .0008; p.x += Math.cos(t * .2 + p.s) * .0006; const q = W.P(p.x + cam.x * 0, p.y, p.z); if (q[2] < .5) continue; const a = .35 * (1 - fk(q[2])) * (.5 + .5 * Math.sin(t + p.s)); c.fillStyle = "rgba(255,240,220," + a.toFixed(3) + ")"; c.beginPath(); c.arc(q[0], q[1], Math.max(.6, 1.6 / q[2] * 3), 0, 7); c.fill(); }
  // vignette
  const vg = c.createRadialGradient(w / 2, h * .5, Math.min(w, h) * .3, w / 2, h * .5, Math.max(w, h) * .75); vg.addColorStop(0, "rgba(0,0,0,0)"); vg.addColorStop(1, "rgba(0,0,0,.6)"); c.fillStyle = vg; c.fillRect(0, 0, w, h);
};
// the desk under a point on screen
World.prototype.pick = function(x, y){ let best = null, bd = 1e9; for (const s of this.screen || []) { const d = Math.hypot(s.x - x, s.y - y); if (d < s.r && s.z < bd) { best = s; bd = s.z; } } return best; };
World.prototype.setLights = function(level, seed){ let s = seed || 3; const rnd = () => (s = (s * 16807) % 2147483647) / 2147483647; this.lights.forEach(L => { L.want = rnd() < level; L.flick = L.want && rnd() < .06; }); };
window.SH1FT_World = World;
})();
