/* doodler-scenes.js: the scenes. One function per scene, drawn onto the stage in front of the landscape.

   CityScenes.market  CityScenes.band  CityScenes.run   CityScenes.yoga
   CityScenes.cafe    CityScenes.street CityScenes.calm  CityScenes.learn

   A scene is function (S) where S carries:
     S.c        the canvas context          S.t        milliseconds, for motion
     S.x0 S.x1  the stage's left and right  S.span      its width
     S.deck     the y of the ground line    S.H        the canvas height
     S.hh       the height of a person      S.night    true after dark
     S.r()      a seeded random             S.seed     the scene's seed
     S.label    the banner's words          S.hits     push {k, x0, x1, y0, y1} to make a tap target
     S.env      the light of the hour (CityLand.env)

   To add a scene, write function (S) and register it: CityDoodler.addScene('name', fn). The same seed draws
   the same scene; the motion is a function of S.t, so a still is one value of t. */
(function () {
'use strict';
if (window.CityScenes) return;
var K = window.CityKit, L = window.CityLand, TAU = K.TAU, paper = K.paper, poly = K.poly, rect = K.rect, circ = K.circ, jag = K.jag, rnd = K.rnd, lerp = K.lerp, ease = K.ease;
var person = K.person, POSE = K.POSE, ground = K.ground, banner = K.banner, glow = K.glow;
function crowd(S, n) { return K.crowd(S.r, n); }
function stand(S, extra) { S.hits.push(Object.assign({ k: 'scene', x0: S.x0, x1: S.x1, y0: S.deck - S.hh * 1.3, y1: S.H }, extra || {})); }

var SCENES = {

  /* stalls with striped awnings; lanterns swing as pendulums, θ = θ₀·cos(√(g/L)·t); shoppers reach for fruit */
  market: function (S) {
    var c = S.c, i, n = Math.max(2, Math.min(6, Math.floor(S.span / (S.hh * 1.5)))), w = S.span / n;
    ground(c, S.x0, S.x1, S.deck, S.H, S.night ? '#2b2522' : '#8d7b66');
    L.rowhouses(c, S.x0, S.x1, S.deck, S.hh * 0.82, S.seed, S.env, { shopfront: false });
    var aw = ['#d94b3b', '#4d8fd1', '#e2b33c', '#4fae8c', '#e5567f', '#9b6bd6'], fruit = ['#f08a5d', '#f7e08a', '#7fe0a4', '#e5567f', '#ffc266', '#9b6bd6'];
    for (i = 0; i < n; i++) {
      var x0 = S.x0 + i * w + w * 0.08, x1 = x0 + w * 0.84, tt = S.deck - S.hh * 0.42, top = S.deck - S.hh * 1.3, col = aw[(i + S.seed) % aw.length];
      paper(c, rect(x0 + 2, top, 4, S.deck - top), '#5a4030', 1); paper(c, rect(x1 - 6, top, 4, S.deck - top), '#5a4030', 1);
      paper(c, rect(x0, tt, x1 - x0, S.hh * 0.12), S.night ? '#5a4030' : '#9a6a4a', 1.2);
      for (var f = 0; f < 7; f++) { var fx = x0 + (x1 - x0) * (f + 0.5) / 7; paper(c, K.disc(fx, tt - S.hh * 0.05, S.hh * 0.06, f + i), fruit[(f + i * 3 + S.seed) % fruit.length], 0.6); }
      paper(c, function (q) {
        q.beginPath(); q.moveTo(x0 - 6, top + S.hh * 0.2); q.lineTo(x0 + 6, top - S.hh * 0.1); q.lineTo(x1 - 6, top - S.hh * 0.1); q.lineTo(x1 + 6, top + S.hh * 0.2);
        var sc = (x1 - x0 + 12) / 6; for (var b = 6; b > 0; b--) q.arc(x0 - 6 + (b - 0.5) * sc, top + S.hh * 0.2, sc / 2, 0, Math.PI);
        q.closePath();
      }, col, 1.6);
      c.fillStyle = 'rgba(255,255,255,.35)'; for (var st = 0; st < 3; st++) c.fillRect(x0 + (x1 - x0) * (st * 2 + 0.6) / 6, top - S.hh * 0.06, (x1 - x0) / 9, S.hh * 0.24);
      var Ln = S.hh * 0.32, th = 0.35 * Math.cos(Math.sqrt(9.8 / (Ln / 40)) * S.t / 1000 + i), lx = x1 - 4 + Math.sin(th) * Ln, ly = top + S.hh * 0.25 + Math.cos(th) * Ln;
      c.strokeStyle = 'rgba(40,20,30,.8)'; c.lineWidth = 1; c.beginPath(); c.moveTo(x1 - 4, top + S.hh * 0.25); c.lineTo(lx, ly); c.stroke();
      if (S.night) glow(c, lx, ly + 5, 6, 10, 0.9);
      paper(c, function (q) { q.beginPath(); q.ellipse(lx, ly + 6, S.hh * 0.06, S.hh * 0.09, th * -0.5, 0, TAU); }, '#e04a3a', 0.8);
    }
    var cr = crowd(S, 3);
    for (i = 0; i < 3; i++) {
      var j = (i * 2 + 1 + S.seed) % n, sx = S.x0 + (j + (i % 2 ? 0.3 : 0.7)) * w, reach = 1.15 + 0.12 * Math.sin(S.t / 900 + i * 2), walk = i === 2;
      cr[i].dir = i % 2 ? 1 : -1;
      if (walk) { var px = S.x0 + ((S.t / 1000 * S.hh * 0.5 + S.span * 0.3) % (S.span + S.hh * 2)) - S.hh; person(c, px, S.deck + S.hh * 0.22, S.hh * 0.95, K.walkP(S.t / 1000 * TAU * 0.9, false), cr[i]); }
      else { var me = person(c, sx, S.deck + S.hh * 0.06, S.hh * 0.95, { lean: 0.06, legs: [0.06, 0, -0.06, 0], arms: [reach, 0.25, 0.25, 0.5] }, cr[i]); paper(c, rect(me.hand[0][0] - 4, me.hand[0][1], 9, 10), '#f2e6c9', 0.6); }
    }
    banner(c, S.x0 + S.span * 0.5, S.deck - S.hh * 1.75, S.label, S.hh, '#d94b3b', S.seed, S.hits);
    stand(S);
  },

  /* a band on a stage: guitar, voice, drums; notes rise on sine paths, the crowd bobs on the drummer's beat */
  band: function (S) {
    var c = S.c, i, cr = crowd(S, 4), bpm = 96 + Math.floor(S.r() * 40), beat = S.t / 60000 * bpm, hit = Math.pow(Math.abs(Math.cos(beat * Math.PI)), 6);
    ground(c, S.x0, S.x1, S.deck, S.H, '#1d1420');
    var st0 = S.x0 + S.span * 0.12, st1 = S.x1 - S.span * 0.06, sy = S.deck - S.hh * 0.28, top = S.deck - S.hh * 2.1;
    for (i = 0; i < 3; i++) {
      var lx = st0 + (st1 - st0) * (0.2 + i * 0.3), hue = [300, 190, 45][(i + S.seed) % 3], sw = Math.sin(S.t / 1400 + i) * 20;
      var g = c.createLinearGradient(lx, top, lx, sy); g.addColorStop(0, 'hsla(' + hue + ',100%,70%,.45)'); g.addColorStop(1, 'hsla(' + hue + ',100%,70%,0)');
      c.fillStyle = g; c.beginPath(); c.moveTo(lx - 4, top); c.lineTo(lx + 4, top); c.lineTo(lx + S.hh * 0.6 + sw, sy); c.lineTo(lx - S.hh * 0.6 + sw, sy); c.fill();
    }
    paper(c, rect(st0, sy, st1 - st0, S.hh * 0.28), '#3a2a33', 2);
    paper(c, rect(st0 + 4, sy - S.hh * 0.62, S.hh * 0.3, S.hh * 0.62), '#2a2026', 1.4); paper(c, rect(st1 - 4 - S.hh * 0.3, sy - S.hh * 0.62, S.hh * 0.3, S.hh * 0.62), '#2a2026', 1.4);
    [st0 + 4 + S.hh * 0.15, st1 - 4 - S.hh * 0.15].forEach(function (cx) { [0.2, 0.45].forEach(function (f) { c.fillStyle = '#0d0a0c'; c.beginPath(); c.arc(cx, sy - S.hh * f, S.hh * (0.08 + hit * 0.015), 0, TAU); c.fill(); }); });
    var gx = st0 + (st1 - st0) * 0.3, vx = st0 + (st1 - st0) * 0.52, dx = st0 + (st1 - st0) * 0.74, h = S.hh * 0.95;
    cr[0].dir = -1; person(c, dx + S.hh * 0.25, sy, h, { lean: 0.1, seat: 0.3, legs: POSE.sit.legs, arms: [1.6 + hit * 0.8, 0.6, 1.4 + (1 - hit) * 0.8, 0.6] }, cr[0]);
    paper(c, K.disc(dx - S.hh * 0.05, sy - S.hh * 0.2, S.hh * 0.2, 5), '#e5567f', 1.2);
    paper(c, rect(dx - S.hh * 0.62, sy - S.hh * 0.62 - hit * 3, S.hh * 0.28, 3), '#e8b84a', 0.6);
    cr[1].dir = 1; var G = person(c, gx, sy, h, { lean: -0.05, legs: [0.15, 0, -0.15, 0], arms: [0.9, 0.9, 0.5 + 0.35 * Math.sin(beat * Math.PI * 2), 0.7] }, cr[1]), gb = [G.hip[0] + 4, G.hip[1] - h * 0.06];
    paper(c, function (q) { q.save(); q.translate(gb[0], gb[1]); q.rotate(-0.5); q.beginPath(); q.ellipse(0, 0, h * 0.14, h * 0.1, 0, 0, TAU); q.rect(h * 0.1, -h * 0.025, h * 0.36, h * 0.05); q.restore(); }, '#c0392b', 1.2);
    cr[2].dir = 1; var up = Math.sin(beat * Math.PI / 4) > 0.3;
    var V = person(c, vx, sy, h * 1.02, { lean: 0, legs: [0.1, 0, -0.1, 0], arms: [1.2, 1.3, up ? 2.8 : 0.3, 0.2] }, cr[2]);
    c.strokeStyle = '#ccc'; c.lineWidth = 1.5; c.beginPath(); c.moveTo(vx + h * 0.22, sy); c.lineTo(vx + h * 0.22, V.head[1] + h * 0.08); c.lineTo(vx + h * 0.12, V.head[1] + h * 0.05); c.stroke();
    K.notes(c, vx + h * 0.2, V.head[1] - 6, S.t, 4, '#ffe2a0');
    var nc = Math.max(4, Math.floor(S.span / (S.hh * 0.42)));
    for (i = 0; i < nc; i++) {
      var cx = S.x0 + S.span * (i + 0.5) / nc, bob = Math.abs(Math.sin(beat * Math.PI + i * 0.7)) * 4, cy = S.H - 4 - bob, col = i % 3 ? '#3a2c46' : '#4a3858';
      paper(c, function (q) { q.beginPath(); q.ellipse(cx, cy, S.hh * 0.2, S.hh * 0.16, 0, Math.PI, TAU); q.moveTo(cx + S.hh * 0.1, cy - S.hh * 0.22); q.arc(cx, cy - S.hh * 0.22, S.hh * 0.1, 0, TAU); }, col, 1);
      if ((i * 7 + S.seed) % 5 === 0) { c.strokeStyle = col; c.lineWidth = Math.max(2, S.hh * 0.06); c.lineCap = 'round'; c.beginPath(); c.moveTo(cx + S.hh * 0.12, cy - S.hh * 0.1); c.lineTo(cx + S.hh * 0.22 + Math.sin(beat * Math.PI) * 4, cy - S.hh * 0.5); c.stroke(); }
    }
    banner(c, (st0 + st1) / 2, top + 6, S.label, S.hh, '#9b6bd6', S.seed, S.hits);
    stand(S, { x0: st0, x1: st1, y0: top });
  },

  /* a fun run: runners at their own speeds, x = x₀ + vt, bounce |sin ωt|; finish arch, water table, a cheering spectator */
  run: function (S) {
    var c = S.c, i, n = Math.max(3, Math.min(8, Math.floor(S.span / (S.hh * 0.75)))), cr = crowd(S, n + 1);
    ground(c, S.x0, S.x1, S.deck, S.H, S.night ? '#1f3326' : '#4f7d4a');
    var path = [], x; for (x = S.x0 - 6; x <= S.x1 + 6; x += 10) path.push([x, S.deck + 6 + Math.sin(x * 0.012) * 3]);
    for (x = S.x1 + 6; x >= S.x0 - 6; x -= 10) path.push([x, S.deck + 20 + Math.sin(x * 0.012 + 0.6) * 3]);
    paper(c, function (q) { jag(q, path, 71, 1.5); }, S.night ? '#6b5a44' : '#c9a66b', 1);
    [[0.12, 0.8], [0.34, 0.6], [0.93, 0.9]].forEach(function (tr, q) {   /* trees on the verge */
      var tx = S.x0 + S.span * tr[0], th = S.hh * (1.5 + tr[1] * 0.4);
      paper(c, rect(tx - 3, S.deck - th * 0.5, 6, th * 0.5 + 6), '#5a4030', 1);
      paper(c, K.disc(tx, S.deck - th * 0.7, th * 0.32, 20 + q), S.night ? '#24452f' : ['#4f9a55', '#5aa05f', '#3f8a4f'][q % 3], 1.4);
    });
    var wx = S.x0 + S.span * 0.85, wy = S.deck + 2;
    paper(c, rect(wx - S.hh * 0.4, wy - S.hh * 0.4, S.hh * 0.8, S.hh * 0.4), S.night ? '#2d4a63' : '#6495ed', 1);
    c.fillStyle = '#fff'; for (i = 0; i < 3; i++) c.fillRect(wx - S.hh * 0.15 + i * S.hh * 0.15, wy - S.hh * 0.55, S.hh * 0.08, S.hh * 0.15);
    var spec = cr[n]; spec.dir = -1; var cheer = (S.t / 300) % TAU;
    person(c, wx + S.hh * 0.5, wy, S.hh * 0.82, { lean: 0.1, seat: 0.47, legs: [0.1, 0, -0.1, 0], arms: [2.8 + Math.sin(cheer) * 0.4, 0.2, 3.1 + Math.sin(cheer + 1) * 0.4, 0.2] }, spec);
    var ax = S.x0 + S.span * (0.25 + S.r() * 0.4), top = S.deck - S.hh * 1.75;
    paper(c, rect(ax - S.hh * 0.9, top, 5, S.deck - top + 10), '#e8e2d0', 1.4); paper(c, rect(ax + S.hh * 0.9, top, 5, S.deck - top + 10), '#e8e2d0', 1.4);
    strandFlags(c, ax - S.hh * 0.9, ax + S.hh * 0.9 + 5, top + 4, S);
    banner(c, ax + 2, top + S.hh * 0.18, S.label, S.hh, '#e0773a', S.seed, S.hits);
    for (i = 0; i < n; i++) {
      var v = S.hh * (0.9 + 0.5 * ((i * 37 + S.seed) % 7) / 7), span = S.span + S.hh * 2, px = S.x0 - S.hh + ((i / n * span + S.t / 1000 * v) % span);
      var p = S.t / 1000 * TAU * (1.3 + 0.1 * (i % 3)) + i, d = cr[i]; d.skirt = 0; d.dir = 1;
      person(c, px, S.deck + 12 + (i % 2) * 5, S.hh * (0.92 + (i % 3) * 0.04), K.walkP(p, true), d);
    }
    stand(S);
  },

  /* a class on mats: mountain, arms up, tree, warrior, fold, lotus, together; the sun breathes every six seconds */
  yoga: function (S) {
    var c = S.c, i, t = S.t, hh = S.hh, n = Math.max(2, Math.min(5, Math.floor((S.span - hh * 2.6) / (hh * 1.25)))), cr = crowd(S, n + 1);
    ground(c, S.x0, S.x1, S.deck, S.H, S.night ? '#1f3326' : '#5b8a5e');
    var br = 1 + 0.08 * Math.sin(t / 6000 * TAU), sx = S.x0 + S.span * 0.5, sy = S.deck - hh * 1.75, sr = hh * 0.38 * br;
    var seq = [POSE.stand, POSE.up, POSE.tree, POSE.up, POSE.warrior, POSE.fold, POSE.lotus, POSE.stand], u = t / 4000, k = Math.floor(u) % seq.length;
    var P = K.mix(seq[k], seq[(k + 1) % seq.length], ease((u % 1) * 2.5 - 1.5));
    var bx = S.x0 + S.span * 0.12, crown = hh * 0.95;   /* a tree at the left */
    paper(c, poly([[bx - hh * 0.14, S.deck], [bx - hh * 0.06, S.deck - hh * 1.4], [bx - hh * 0.45, S.deck - hh * 2.0], [bx + hh * 0.4, S.deck - hh * 2.0], [bx + hh * 0.08, S.deck - hh * 1.4], [bx + hh * 0.16, S.deck]]), S.night ? '#3a2a1e' : '#6b4a2f', 1.2);
    [[-0.55, -2.2, 0.75], [0.5, -2.3, 0.7], [0, -2.7, 0.85]].forEach(function (Lf, q) {
      paper(c, K.disc(bx + Lf[0] * crown + Math.sin(t / 2100 + q) * hh * 0.03, S.deck + Lf[1] * hh, crown * Lf[2] * 0.6, 17 + q), S.night ? ['#1f3b29', '#24452f', '#2a4f36'][q] : ['#5aa05f', '#7cc47a', '#4f9a55'][q], 1.4);
    });
    if (!S.night) paper(c, function (q) { q.beginPath(); for (var j = 0; j < 32; j++) { var rr = j % 2 ? sr * 1.15 : sr * 1.5, aa = j / 32 * TAU + t / 30000; q.lineTo(sx + Math.cos(aa) * rr, sy + Math.sin(aa) * rr); } q.closePath(); }, '#f6a92c', 1);
    paper(c, K.disc(sx, sy, sr, 13), S.night ? '#fff2c8' : '#ffd65a', 0.8);
    var mats = ['#4fae8c', '#9b6bd6', '#e5567f', '#4d8fd1', '#e2b33c', '#e0773a'], my = S.deck + 6, x0c = S.x0 + S.span * 0.24, x1c = S.x1 - hh * 1.8;
    for (i = 0; i < n; i++) {
      var mx = n > 1 ? lerp(x0c, x1c, i / (n - 1)) : (x0c + x1c) / 2;
      paper(c, rect(mx - hh * 0.45, my, hh * 0.9, 6), mats[(i + S.seed) % mats.length], 0.6);
      cr[i].dir = 1; var J = person(c, mx, my, hh, P, cr[i]);
      var bu = (t / 6000 + 0.25) % 1; c.strokeStyle = 'rgba(255,255,255,' + (0.45 * (1 - bu)) + ')'; c.lineWidth = 1.2; c.beginPath(); c.arc(J.sh[0] + hh * 0.05, J.sh[1] + hh * 0.06, hh * (0.1 + bu * 0.35), -0.9, 0.9); c.stroke();
    }
    var tx = S.x1 - hh * 0.9; cr[n].dir = -1; cr[n].col = '#2c3e6b';
    paper(c, rect(tx - hh * 0.55, S.deck - 2, hh * 1.1, 10), S.night ? '#4a2e1c' : '#8a5a32', 1);
    person(c, tx, S.deck - 2, hh * 1.05, P, cr[n]);
    banner(c, sx, sy - sr * 1.6 - hh * 0.45, S.label, hh, '#4fae8c', S.seed, S.hits);
    stand(S);
  },

  /* pavement tables under parasols: steam curls as x = A·sin(ky − ωt), a server crosses with a tray */
  cafe: function (S) {
    var c = S.c, i, n = Math.max(2, Math.min(4, Math.floor(S.span / (S.hh * 2.4)))), w = S.span / n, cr = crowd(S, n * 2 + 1);
    ground(c, S.x0, S.x1, S.deck, S.H, S.night ? '#2a1a14' : '#a98e72');
    L.rowhouses(c, S.x0, S.x1, S.deck, S.hh * 0.9, S.seed + 3, S.env, {});
    var UMB = [['#e8475a', '#f4efe2'], ['#2f6fb3', '#f2c94c'], ['#2f8f5b', '#f4efe2'], ['#e8a83a', '#c62a20']];
    c.save();
    K.strand(c, S.x0 + S.span * 0.04, S.x1 - S.span * 0.04, S.deck - S.hh * 1.5, S.hh * 0.18, 26, function (x, y, q) { var on = 0.6 + 0.4 * Math.sin(S.t / 420 + q); glow(c, x, y + 4, 3, 40, on); c.fillStyle = '#ffe2a0'; c.beginPath(); c.arc(x, y + 4, 2.2, 0, TAU); c.fill(); });
    c.restore();
    for (i = 0; i < n; i++) {
      var cx = S.x0 + w * (i + 0.5), ty = S.deck + S.hh * 0.12 + (i % 2) * S.hh * 0.14, um = UMB[(i + S.seed) % UMB.length];
      cr[i * 2].dir = 1; cr[i * 2 + 1].dir = -1; cr[i * 2].skirt = 0; cr[i * 2 + 1].skirt = 0;
      var a = person(c, cx - S.hh * 0.62, ty + S.hh * 0.02, S.hh * 0.92, POSE.sit, cr[i * 2]), b = person(c, cx + S.hh * 0.62, ty + S.hh * 0.02, S.hh * 0.92, POSE.sit, cr[i * 2 + 1]);
      paper(c, rect(cx - 1.5, ty - S.hh * 0.5, 3, S.hh * 0.5), '#5a4030', 1);
      paper(c, K.disc(cx, ty - S.hh * 0.5, S.hh * 0.3, 40 + i), '#f2e6c9', 1.4);
      paper(c, rect(cx - S.hh * 0.3, ty - S.hh * 0.52, S.hh * 0.6, 4), '#7a5a3a', 1);
      paper(c, rect(cx - 1.5, ty - S.hh * 1.2, 3, S.hh * 0.72), '#5a4030', 1);
      paper(c, function (q) { q.beginPath(); q.moveTo(cx - S.hh * 0.85, ty - S.hh * 0.95); q.quadraticCurveTo(cx, ty - S.hh * 1.55, cx + S.hh * 0.85, ty - S.hh * 0.95); q.closePath(); }, um[0], 1.6);
      c.fillStyle = um[1]; c.globalAlpha = 0.5; c.beginPath(); c.moveTo(cx - S.hh * 0.3, ty - S.hh * 1.1); c.lineTo(cx, ty - S.hh * 1.4); c.lineTo(cx + S.hh * 0.3, ty - S.hh * 1.1); c.fill(); c.globalAlpha = 1;
      [cx - S.hh * 0.18, cx + S.hh * 0.18].forEach(function (cupx, q) {
        paper(c, rect(cupx - 4, ty - S.hh * 0.62, 8, 7), '#fff', 0.4);
        c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 1.4; c.beginPath();
        for (var y = 0; y < S.hh * 0.45; y += 3) { var xx = cupx + Math.sin(y * 0.11 - S.t / 300 + i + q) * (1.5 + y * 0.05); y ? c.lineTo(xx, ty - S.hh * 0.64 - y) : c.moveTo(xx, ty - S.hh * 0.64 - y); }
        c.stroke();
      });
    }
    var sv = cr[n * 2], sp = S.hh * 0.45, sxp = S.x0 - S.hh + ((S.t / 1000 * sp + S.span * 0.4) % (S.span + S.hh * 2));
    sv.dir = 1; sv.col = '#2c3e6b'; sv.skirt = 0;
    var me = person(c, sxp, S.H - S.hh * 0.1, S.hh, K.walkP(S.t / 1000 * TAU * 0.8, false), sv);
    paper(c, rect(me.hand[0][0] - 8, me.hand[0][1] - 2, 18, 3), '#cfd3d8', 0.5);
    banner(c, S.x0 + S.span * 0.5, S.deck - S.hh * 2.0, S.label, S.hh, '#e58f3a', S.seed, S.hits);
    stand(S);
  },

  /* a street: facades, a pavement, two lanes; cars, vans and cyclists at their own speeds, wheels turning with distance */
  street: function (S) {
    var c = S.c, i, hh = S.hh;
    L.rowhouses(c, S.x0, S.x1, S.deck, hh * 1.0, S.seed, S.env, {});
    var kerb = S.deck + hh * 0.14;
    paper(c, rect(S.x0 - 4, S.deck, S.span + 8, kerb - S.deck + 2), S.night ? '#3a3430' : '#b8ab98', 1);
    paper(c, rect(S.x0 - 4, kerb, S.span + 8, S.H - kerb + 4), S.night ? '#2b2c33' : '#5a5d66', 1);
    c.strokeStyle = 'rgba(255,255,255,.55)'; c.lineWidth = 2; c.setLineDash([hh * 0.4, hh * 0.3]);
    var my = kerb + (S.H - kerb) * 0.5; c.beginPath(); c.moveTo(S.x0, my); c.lineTo(S.x1, my); c.stroke(); c.setLineDash([]);
    /* pedestrians on the pavement */
    var pr = crowd(S, 3);
    for (i = 0; i < 3; i++) {
      var dir = i % 2 ? -1 : 1, v = hh * (0.35 + 0.1 * i), px = ((S.seed % 97) / 97 * S.span + i * S.span / 3 + dir * S.t / 1000 * v) % (S.span + hh * 2);
      px = S.x0 + (px < 0 ? px + S.span + hh * 2 : px) - hh; pr[i].dir = dir;
      person(c, px, S.deck + hh * 0.1, hh * 0.9, K.walkP(S.t / 1000 * TAU * 0.8 + i, false), pr[i]);
    }
    var lanes = [{ y: my - (my - kerb) * 0.2, dir: 1 }, { y: S.H - (S.H - my) * 0.18, dir: -1 }], LEN = { car: 2.3, van: 2.7, bike: 1.1 };
    var kinds = ['car', 'bike', 'van', 'car', 'bike', 'car'], COL = ['#c0392b', '#2c4e9b', '#f2c94c', '#2f8f5b', '#e8e2d0', '#6a3a8a', '#e8692a'];
    var r = rnd(S.seed + 91);
    lanes.forEach(function (ln, li) {
      var k = 3, gap = (S.span + hh * 6) / k;
      for (var q = 0; q < k; q++) {
        var kind = kinds[Math.floor(r() * kinds.length)], speed = hh * (0.9 + r() * 0.9) * (kind === 'bike' ? 0.45 : 1), col = COL[Math.floor(r() * COL.length)];
        var pos = (q * gap + r() * gap * 0.5 + ln.dir * S.t / 1000 * speed) % (S.span + hh * 6);
        pos = pos < 0 ? pos + S.span + hh * 6 : pos; var x = S.x0 - hh * 3 + pos;
        var th = ln.dir * S.t / 1000 * speed / (hh * 0.2);
        vehicle(c, kind, x, ln.y, hh, col, ln.dir, th, S);
      }
    });
    banner(c, S.x0 + S.span * 0.5, S.deck - hh * 2.4, S.label, hh, '#2c5aa0', S.seed, S.hits);
    stand(S);
  },

  /* sitting still under the evening: a ring of people, candles that flicker, a halo that breathes */
  calm: function (S) {
    var c = S.c, i, n = Math.max(3, Math.min(7, Math.floor(S.span / (S.hh * 0.85)))), cr = crowd(S, n);
    ground(c, S.x0, S.x1, S.deck, S.H, S.night ? '#2a1d18' : '#8a6a4a');
    var cx = S.x0 + S.span * 0.5, br = 1 + 0.1 * Math.sin(S.t / 6000 * TAU);
    var g = c.createRadialGradient(cx, S.deck - S.hh * 0.4, 0, cx, S.deck - S.hh * 0.4, S.hh * 2.2 * br);
    g.addColorStop(0, 'rgba(255,214,120,.45)'); g.addColorStop(1, 'rgba(255,214,120,0)'); c.fillStyle = g; c.fillRect(cx - S.hh * 2.5, S.deck - S.hh * 2.6, S.hh * 5, S.hh * 3);
    for (i = 0; i < 5; i++) {
      var kx = cx + (i - 2) * S.hh * 0.22, ky = S.deck + 8, kh = S.hh * (0.18 + 0.05 * (i % 2)), fl = 1 + 0.15 * Math.sin(S.t / 90 + i * 2);
      paper(c, rect(kx - 3, ky - kh, 6, kh), '#f5ead2', 0.8); glow(c, kx, ky - kh - 6, 4, 45, 0.9);
      paper(c, function (q) { q.beginPath(); q.moveTo(kx, ky - kh - 13 * fl); q.quadraticCurveTo(kx + 4, ky - kh - 4, kx, ky - kh - 1); q.quadraticCurveTo(kx - 4, ky - kh - 4, kx, ky - kh - 13 * fl); q.closePath(); }, '#ffcf5a', 0.4);
    }
    for (i = 0; i < n; i++) {
      var side = i < n / 2 ? -1 : 1, j = i < n / 2 ? i : i - Math.ceil(n / 2), px = cx + side * (S.hh * 0.9 + j * S.hh * 0.7);
      cr[i].dir = -side; cr[i].skirt = 0;
      person(c, px, S.deck + 10 + (j % 2) * 4, S.hh * 0.95, POSE.lotus, cr[i]);
    }
    banner(c, cx, S.deck - S.hh * 1.9, S.label, S.hh, '#d9a53c', S.seed, S.hits);
    stand(S);
  },

  /* a classroom: the board writes its formula a character at a time; a hand goes up every few seconds */
  learn: function (S) {
    var c = S.c, i, hh = S.hh, cr = crowd(S, 5), FORMULAS = ['a² + b² = c²', 'y = mx + b', 'F = m · a', 'e^(iπ) + 1 = 0', 'A = π r²', 'x = (−b ± √(b² − 4ac)) / 2a'];
    var line = FORMULAS[S.seed % FORMULAS.length];
    ground(c, S.x0, S.x1, S.deck, S.H, S.night ? '#2a2420' : '#b89a72');
    var bx0 = S.x0 + S.span * 0.5, bx1 = S.x1 - S.span * 0.04, by = S.deck - hh * 1.95, bh = hh * 1.1;
    paper(c, rect(bx0 - 5, by - 5, bx1 - bx0 + 10, bh + 10), '#8a5a32', 1.6);
    paper(c, rect(bx0, by, bx1 - bx0, bh), '#25403a', 0.6);
    var cyc = (S.t / 1000) % 9, nch = Math.min(line.length, Math.floor(cyc / 7 * line.length * 1.1));
    c.fillStyle = '#f2f2e6'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.font = Math.round(Math.max(12, hh * 0.26)) + 'px ui-monospace,Menlo,monospace';
    c.fillText(line.slice(0, nch) + (nch < line.length && Math.floor(S.t / 300) % 2 ? '_' : ''), (bx0 + bx1) / 2, by + bh / 2);
    paper(c, rect(bx0, by + bh + 5, bx1 - bx0, 4), '#8a5a32', 1);
    var tx = bx0 - hh * 0.45; cr[4].dir = 1; cr[4].col = '#2c3e6b'; cr[4].skirt = 0;
    person(c, tx, S.deck + 4, hh * 1.05, { lean: 0.04, legs: [0.06, 0, -0.06, 0], arms: [2.0 + 0.15 * Math.sin(S.t / 500), 0.4, 0.1, 0.4] }, cr[4]);
    var rows = Math.max(2, Math.min(4, Math.floor((tx - S.x0 - hh * 0.4) / (hh * 1.0))));
    for (i = 0; i < rows; i++) {
      var dx = S.x0 + hh * 0.35 + i * (tx - S.x0 - hh * 1.1) / Math.max(1, rows - 1) * (rows > 1 ? 1 : 0), raise = Math.floor(S.t / 2600 + i * 1.7) % (rows + 2) === 0 && (S.t / 2600 + i * 1.7) % 1 < 0.6;
      cr[i % 4].dir = 1; cr[i % 4].skirt = 0;
      person(c, dx, S.deck + 6 + (i % 2) * 6, hh * 0.9, { lean: 0.02, seat: 0.24, legs: POSE.sit.legs, arms: raise ? [2.8, 0.2, 0.9, 0.9] : [0.9, 0.9, 0.9, 0.9] }, cr[i % 4]);
      paper(c, rect(dx + hh * 0.2, S.deck + 6 + (i % 2) * 6 - hh * 0.34, hh * 0.55, 5), '#9a6a4a', 1);
      paper(c, rect(dx + hh * 0.3, S.deck + 6 + (i % 2) * 6 - hh * 0.34, 3, hh * 0.34), '#7a4a2a', 1);
    }
    banner(c, S.x0 + (bx0 - S.x0) * 0.55, by - hh * 0.5, S.label, hh, '#3a8a7a', S.seed, S.hits);
    stand(S);
  }
};

function strandFlags(c, xa, xb, y, S) {
  var cols = ['#d9342b', '#f2c94c', '#4d8fd1', '#4fae8c', '#e5567f'];
  K.strand(c, xa, xb, y, S.hh * 0.14, 14, function (x, yy, i) { var w = Math.sin(S.t / 500 + i) * 1.5; paper(c, poly([[x - 5, yy], [x + 5, yy], [x + w, yy + 11]]), cols[i % cols.length], 0.5); });
}

/* a vehicle at (x, y) = where its wheels meet the road; facing dir; th the wheel turn in radians */
function vehicle(c, kind, x, y, hh, col, dir, th, S) {
  c.save(); c.translate(x, y); c.scale(dir, 1);
  c.fillStyle = 'rgba(0,0,0,.24)'; c.beginPath(); c.ellipse(0, 0, hh * (kind === 'bike' ? 0.5 : 1.0), hh * 0.05, 0, 0, TAU); c.fill();
  if (kind === 'bike') {
    var r = hh * 0.24, a = -hh * 0.42, b = hh * 0.42;
    K.wheel(c, a, -r, r, th, '#e8e2d0'); K.wheel(c, b, -r, r, th, '#e8e2d0');
    c.strokeStyle = col; c.lineWidth = Math.max(2, hh * 0.04); c.lineCap = 'round'; c.beginPath();
    c.moveTo(a, -r); c.lineTo(-hh * 0.08, -hh * 0.5); c.lineTo(b - hh * 0.06, -hh * 0.48); c.lineTo(b, -r); c.moveTo(-hh * 0.08, -hh * 0.5); c.lineTo(a, -r); c.moveTo(b - hh * 0.06, -hh * 0.48); c.lineTo(b - hh * 0.12, -hh * 0.62); c.lineTo(b - hh * 0.02, -hh * 0.62); c.stroke();
    var rd = { col: col === '#e8e2d0' ? '#2c4e9b' : '#2a2a3a', hair: 4, skirt: 0, dir: 1 }, p = th * 0.8;
    person(c, -hh * 0.06, -hh * 0.02, hh * 1.05, { lean: 0.35, seat: 0.5, legs: [0.9 + 0.5 * Math.sin(p), -1.2 + 0.5 * Math.cos(p), 0.9 - 0.5 * Math.sin(p), -1.2 - 0.5 * Math.cos(p)], arms: [1.1, 0.5, 1.1, 0.5] }, rd);
  } else {
    var L = hh * (kind === 'van' ? 1.35 : 1.15), hgt = hh * (kind === 'van' ? 0.85 : 0.6), wr = hh * 0.2;
    paper(c, function (q) { q.beginPath(); q.moveTo(-L, -wr * 0.8); q.lineTo(-L, -hgt * 0.55); q.lineTo(-L * 0.62, -hgt * 0.62); q.lineTo(-L * 0.45, -hgt); q.lineTo(kind === 'van' ? L * 0.55 : L * 0.3, -hgt); q.lineTo(kind === 'van' ? L * 0.7 : L * 0.55, -hgt * 0.62); q.lineTo(L, -hgt * 0.55); q.lineTo(L, -wr * 0.8); q.closePath(); }, col, 1.4);
    c.fillStyle = S.night ? '#ffe2a0' : '#bfdce6';
    c.beginPath(); c.moveTo(-L * 0.4, -hgt * 0.64); c.lineTo(-L * 0.4, -hgt * 0.94); c.lineTo(kind === 'van' ? L * 0.5 : L * 0.25, -hgt * 0.94); c.lineTo(kind === 'van' ? L * 0.62 : L * 0.45, -hgt * 0.64); c.fill();
    if (S.night) { c.fillStyle = '#fff6c8'; c.fillRect(L - 4, -hgt * 0.55, 4, 5); glow(c, L, -hgt * 0.5, 4, 50, 0.7); }
    K.wheel(c, -L * 0.55, -wr, wr, th); K.wheel(c, L * 0.55, -wr, wr, th);
  }
  c.restore();
}

window.CityScenes = SCENES;
})();
