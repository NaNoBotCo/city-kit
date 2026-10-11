/* doodler-core.js: the paper-cut toolkit the doodler draws with.

   Adapted from the Mot Dang doodler (motdang.net, NaNoBotCo). Everything here is
   plain canvas 2D, no libraries, no build step.

   CityKit.paper(c, path, fill, lift)   one piece of cut paper: shadow, grain, cut edge
   CityKit.jag / circ / poly / rect     path makers (a path is a function(ctx) that traces)
   CityKit.person(c, x, y, h, pose, d)  a paper-cut figure; returns its joints
   CityKit.POSE, mix, walkP             poses and the walking cycle
   CityKit.crowd(rand, n)               n dressed figures dealt from a seeded random
   CityKit.rnd(seed)                    a seeded random (same seed, same drawing)

   Load this first, then doodler-land.js, doodler-scenes.js and doodler.js. */
(function () {
'use strict';
if (window.CityKit) return;
var TAU = Math.PI * 2;

function rnd(seed) { seed = seed >>> 0; return function () { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; }; }
function hash(s) { var h = 2166136261; s = String(s); for (var i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; }
function lerp(a, b, u) { return a + (b - a) * u; }
function clamp(v, a, b) { return Math.max(a, Math.min(b, v)); }
function ease(u) { return 0.5 - 0.5 * Math.cos(Math.PI * clamp(u, 0, 1)); }

/* colours: '#rrggbb' in, '#rrggbb' out */
function rgb(h) { var n = parseInt(h.slice(1), 16); return [n >> 16, (n >> 8) & 255, n & 255]; }
function hex(a) { return '#' + a.map(function (v) { return ('0' + clamp(Math.round(v), 0, 255).toString(16)).slice(-2); }).join(''); }
function mixHex(a, b, u) { var A = rgb(a), B = rgb(b); return hex([lerp(A[0], B[0], u), lerp(A[1], B[1], u), lerp(A[2], B[2], u)]); }
/* shade('#336699', -0.3) darker, +0.3 lighter */
function shade(h, u) { return u < 0 ? mixHex(h, '#000000', -u) : mixHex(h, '#ffffff', u); }

/* ---------------------------------------------------------------- paper */
var GRAIN = null;
function grain(c) {
  if (!GRAIN) {
    var g = document.createElement('canvas'), x, i, r = rnd(11);
    g.width = g.height = 96; x = g.getContext('2d');
    var im = x.createImageData(96, 96);
    for (i = 0; i < im.data.length; i += 4) { var v = r() < 0.5 ? 0 : 255; im.data[i] = im.data[i + 1] = im.data[i + 2] = v; im.data[i + 3] = 6 + r() * 16; }
    x.putImageData(im, 0, 0); GRAIN = g;
  }
  return c.createPattern(GRAIN, 'repeat');
}
function paper(c, path, fill, lift) {
  lift = lift || 1;
  c.save();
  c.shadowColor = 'rgba(0,0,0,.42)'; c.shadowBlur = 4 + lift * 3; c.shadowOffsetX = 1 + lift; c.shadowOffsetY = 2 + lift * 1.5;
  c.fillStyle = fill; path(c); c.fill('evenodd');
  c.restore();
  c.save(); c.fillStyle = grain(c); path(c); c.fill('evenodd');
  c.strokeStyle = 'rgba(255,255,255,.16)'; c.lineWidth = 0.8; path(c); c.stroke(); c.restore();
}
/* a closed polygon with hand-cut wobble: amt in pixels */
function jag(c, pts, seed, amt) {
  var r = rnd(seed); c.beginPath();
  pts.forEach(function (p, i) { var x = p[0] + (r() - 0.5) * amt, y = p[1] + (r() - 0.5) * amt; i ? c.lineTo(x, y) : c.moveTo(x, y); });
  c.closePath();
}
function circ(c, x, y, r, seed) {
  var pts = [], n = Math.max(24, Math.round(r * 0.9));
  for (var i = 0; i < n; i++) pts.push([x + Math.cos(i / n * TAU) * r, y + Math.sin(i / n * TAU) * r]);
  jag(c, pts, seed || 3, Math.min(1.4, r * 0.03));
}
function poly(pts) { return function (q) { q.beginPath(); pts.forEach(function (p, i) { i ? q.lineTo(p[0], p[1]) : q.moveTo(p[0], p[1]); }); q.closePath(); }; }
function rect(x, y, w, h) { return poly([[x, y], [x + w, y], [x + w, y + h], [x, y + h]]); }
function disc(x, y, r, seed) { return function (q) { circ(q, x, y, r, seed); }; }

/* ---------------------------------------------------------------- people
   pose: lean (torso from upright, + = forward); legs [thigh, knee, thigh, knee] and arms
   [upper, elbow, upper, elbow], angles from hanging straight down, + = forward; the knee
   and elbow add to the limb above. seat: hip height as a share of the figure (0.47 standing). */
var POSE = {
  stand: { lean: 0, legs: [0.06, 0, -0.06, 0], arms: [0.12, 0.1, -0.1, 0.05] },
  up: { lean: 0, legs: [0.06, 0, -0.06, 0], arms: [2.85, 0, 3.4, 0] },
  tree: { lean: 0, legs: [0, 0, 0.95, -2.3], arms: [3.08, 0, 3.2, 0] },
  warrior: { lean: 0, seat: 0.4, legs: [0.95, -0.95, -0.75, 0], arms: [1.57, 0, -1.57, 0] },
  fold: { lean: 2.3, legs: [0.05, 0, -0.05, 0], arms: [2.3, 0, 2.4, 0] },
  sit: { lean: 0, seat: 0.24, legs: [1.5, -1.5, 1.5, -1.5], arms: [0.3, 0.6, 0.2, 0.7] },
  lotus: { lean: 0, seat: 0.1, legs: [1.45, -2.9, 1.45, -2.9], arms: [0.5, 0.5, 0.45, 0.55] }
};
function mix(A, B, u) {
  var o = { lean: lerp(A.lean || 0, B.lean || 0, u), seat: lerp(A.seat || 0.47, B.seat || 0.47, u), legs: [], arms: [] };
  for (var i = 0; i < 4; i++) { o.legs.push(lerp(A.legs[i], B.legs[i], u)); o.arms.push(lerp(A.arms[i], B.arms[i], u)); }
  return o;
}
function walkP(p, run) {
  var s = Math.sin(p), k = run ? 1 : 0.5;
  return { lean: run ? 0.22 : 0.04, seat: 0.47, lift: run ? Math.abs(Math.cos(p)) * 0.05 : 0,
    legs: [s * 0.5 * (run ? 1.4 : 1), -k * (0.4 + 0.6 * Math.max(0, -Math.cos(p))), -s * 0.5 * (run ? 1.4 : 1), -k * (0.4 + 0.6 * Math.max(0, Math.cos(p)))],
    arms: [-s * (run ? 0.9 : 0.4), run ? 1.5 : 0.3, s * (run ? 0.9 : 0.4), run ? 1.5 : 0.3] };
}
var HAIR = ['none', 'tail', 'bun', 'bob', 'cap'];
/* d: { col, hair (0-4), skirt (0|1), dir (1 right, -1 left) } */
function person(c, x, y, h, P, d) {
  var dir = d.dir || 1, seat = P.seat || 0.47, lean = P.lean || 0;
  function pt(o, a, l) { return [o[0] + dir * Math.sin(a) * l, o[1] + Math.cos(a) * l]; }
  var hip = [x, y - h * seat - (P.lift || 0) * h];
  var sh = [hip[0] + dir * Math.sin(lean) * h * 0.33, hip[1] - Math.cos(lean) * h * 0.33];
  var hd = [sh[0] + dir * Math.sin(lean) * h * 0.14, sh[1] - Math.cos(lean) * h * 0.14];
  var L = P.legs, A = P.arms;
  var k1 = pt(hip, L[0], h * 0.24), f1 = pt(k1, L[0] + L[1], h * 0.23), k2 = pt(hip, L[2], h * 0.24), f2 = pt(k2, L[2] + L[3], h * 0.23);
  var e1 = pt(sh, A[0], h * 0.17), w1 = pt(e1, A[0] + A[1], h * 0.16), e2 = pt(sh, A[2], h * 0.17), w2 = pt(e2, A[2] + A[3], h * 0.16);
  c.save(); c.shadowColor = 'rgba(0,0,0,.45)'; c.shadowBlur = 3; c.shadowOffsetX = 1.5; c.shadowOffsetY = 2;
  c.strokeStyle = d.col; c.fillStyle = d.col; c.lineCap = 'round'; c.lineJoin = 'round'; c.lineWidth = Math.max(2, h * 0.075);
  c.beginPath();
  c.moveTo(f2[0], f2[1]); c.lineTo(k2[0], k2[1]); c.lineTo(hip[0], hip[1]); c.lineTo(k1[0], k1[1]); c.lineTo(f1[0], f1[1]);
  c.moveTo(hip[0], hip[1]); c.lineTo(sh[0], sh[1]);
  c.moveTo(w2[0], w2[1]); c.lineTo(e2[0], e2[1]); c.lineTo(sh[0], sh[1]); c.lineTo(e1[0], e1[1]); c.lineTo(w1[0], w1[1]);
  c.stroke();
  if (d.skirt) { var sw = h * 0.17; c.beginPath(); c.moveTo(sh[0] * 0.25 + hip[0] * 0.75, sh[1] * 0.4 + hip[1] * 0.6); c.lineTo(hip[0] - sw, hip[1] + h * 0.17); c.lineTo(hip[0] + sw, hip[1] + h * 0.17); c.closePath(); c.fill(); }
  c.beginPath(); c.arc(hd[0], hd[1], h * 0.105, 0, TAU); c.fill();
  var hr = HAIR[d.hair || 0];
  if (hr === 'tail') { c.beginPath(); c.ellipse(hd[0] - dir * h * 0.12, hd[1] + h * 0.03, h * 0.045, h * 0.11, -dir * 0.5, 0, TAU); c.fill(); }
  if (hr === 'bun') { c.beginPath(); c.arc(hd[0] - dir * h * 0.04, hd[1] - h * 0.12, h * 0.06, 0, TAU); c.fill(); }
  if (hr === 'bob') { c.beginPath(); c.arc(hd[0] - dir * h * 0.02, hd[1] - h * 0.01, h * 0.13, Math.PI * 0.95, Math.PI * 2.05); c.lineTo(hd[0] + h * 0.12, hd[1] + h * 0.07); c.lineTo(hd[0] - h * 0.13, hd[1] + h * 0.07); c.fill(); }
  if (hr === 'cap') { c.beginPath(); c.arc(hd[0], hd[1] - h * 0.02, h * 0.11, Math.PI, TAU); c.lineTo(hd[0] + dir * h * 0.2, hd[1] - h * 0.02); c.fill(); }
  c.restore();
  return { hip: hip, sh: sh, head: hd, hand: [w1, w2], foot: [f1, f2] };
}

var CLOTH = ['#ffc266', '#ff5a8c', '#b692ff', '#7fe0a4', '#7fd8ff', '#ff9a5a', '#f2f2f2', '#e5567f', '#ffd1e8', '#4fae8c', '#e2b33c', '#9b6bd6', '#f08a5d', '#6cc3c1', '#f7e08a', '#c3a6ff'];
/* n figures: colours, hair and skirts dealt from the seeded random r */
function crowd(r, n) {
  var off = Math.floor(r() * CLOTH.length), out = [];
  for (var i = 0; i < n; i++) out.push({ col: CLOTH[(off + i * 5) % CLOTH.length], hair: Math.floor(r() * HAIR.length), skirt: r() < 0.35 ? 1 : 0, dir: 1 });
  return out;
}

/* ---------------------------------------------------------------- props */
function ground(c, x0, x1, deck, H, col) { paper(c, rect(x0 - 4, deck, x1 - x0 + 8, H - deck + 4), col, 2); }
/* a pennant banner with the scene's label; registers a hit box in hits */
function banner(c, cx, y, text, hh, col, seed, hits) {
  if (!text) return;
  c.font = '800 ' + Math.round(Math.max(12, hh * 0.2)) + 'px system-ui,-apple-system,"Segoe UI",sans-serif';
  var bw = c.measureText(text).width + 20, bh = Math.max(20, hh * 0.32), tl = bh * 0.55;
  c.strokeStyle = 'rgba(40,20,30,.8)'; c.lineWidth = 1; c.beginPath();
  c.moveTo(cx - bw / 2 + 6, y - 8); c.lineTo(cx - bw / 2 + 6, y); c.moveTo(cx + bw / 2 - 6, y - 8); c.lineTo(cx + bw / 2 - 6, y); c.stroke();
  paper(c, function (q) { jag(q, [[cx - bw / 2 - tl, y], [cx + bw / 2 + tl, y], [cx + bw / 2, y + bh / 2], [cx + bw / 2 + tl, y + bh], [cx - bw / 2 - tl, y + bh], [cx - bw / 2, y + bh / 2]], seed % 997, 0.8); }, col, 1.6);
  c.save(); c.strokeStyle = '#f2c94c'; c.lineWidth = 1.2; c.globalAlpha = 0.9; c.strokeRect(cx - bw / 2 + 2, y + 3, bw - 4, bh - 6); c.restore();
  c.fillStyle = '#fff'; c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, cx, y + bh / 2 + 1);
  if (hits) hits.push({ k: 'label', x0: cx - bw / 2, x1: cx + bw / 2, y0: y - 8, y1: y + bh + 8 });
}
function glow(c, x, y, rad, hue, on) {
  var g = c.createRadialGradient(x, y, 0, x, y, rad * 3);
  g.addColorStop(0, 'hsla(' + hue + ',100%,70%,' + 0.5 * on + ')'); g.addColorStop(1, 'hsla(' + hue + ',100%,60%,0)');
  c.fillStyle = g; c.beginPath(); c.arc(x, y, rad * 3, 0, TAU); c.fill();
}
/* string between two points as a catenary, y = a·cosh(x/a), with something hung along it */
function strand(c, xa, xb, y, sag, every, hang) {
  var xm = (xa + xb) / 2, half = (xb - xa) / 2, a = half / 1.4, ch = Math.cosh(half / a) - 1, x, i;
  function cat(q) { return y + sag - sag * (Math.cosh((q - xm) / a) - 1) / ch; }
  c.strokeStyle = 'rgba(40,20,30,.85)'; c.lineWidth = 1.2; c.beginPath();
  for (x = xa; x <= xb; x += 4) x === xa ? c.moveTo(x, cat(x)) : c.lineTo(x, cat(x));
  c.stroke();
  for (x = xa + every / 2, i = 0; x < xb - 4; x += every, i++) hang(x, cat(x), i);
}
function notes(c, x, y, t, n, col) {
  for (var i = 0; i < n; i++) {
    var u = ((t / 2600 + i / n) % 1), nx = x + i * 9 + Math.sin(u * TAU * 1.5 + i) * 14, ny = y - u * 90, a = Math.sin(u * Math.PI);
    c.save(); c.globalAlpha = a; c.fillStyle = col; c.strokeStyle = col; c.lineWidth = 1.6;
    c.beginPath(); c.ellipse(nx, ny, 4, 3, -0.4, 0, TAU); c.fill(); c.beginPath(); c.moveTo(nx + 3.6, ny - 1); c.lineTo(nx + 3.6, ny - 14); c.lineTo(nx + 9, ny - 11); c.stroke(); c.restore();
  }
}
/* a wheel turned through th radians */
function wheel(c, x, y, r, th, rim) {
  c.save(); c.translate(x, y);
  c.fillStyle = '#1d1d22'; c.beginPath(); c.arc(0, 0, r, 0, TAU); c.fill();
  c.fillStyle = rim || '#cfd3d8'; c.beginPath(); c.arc(0, 0, r * 0.62, 0, TAU); c.fill();
  c.strokeStyle = '#6b7078'; c.lineWidth = Math.max(1, r * 0.08);
  for (var i = 0; i < 4; i++) { var a = th + i * Math.PI / 2; c.beginPath(); c.moveTo(0, 0); c.lineTo(Math.cos(a) * r * 0.6, Math.sin(a) * r * 0.6); c.stroke(); }
  c.restore();
}

window.CityKit = {
  TAU: TAU, rnd: rnd, hash: hash, lerp: lerp, clamp: clamp, ease: ease, mixHex: mixHex, shade: shade,
  paper: paper, jag: jag, circ: circ, poly: poly, rect: rect, disc: disc,
  POSE: POSE, mix: mix, walkP: walkP, person: person, crowd: crowd, CLOTH: CLOTH,
  ground: ground, banner: banner, glow: glow, strand: strand, notes: notes, wheel: wheel
};
})();
