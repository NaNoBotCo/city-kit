/* doodler-land.js: sky, hills, water and the city's sights behind every scene.

   CityLand.env(hour)                          → { hour, dark (0 day … 1 night), twi (0 … 1 at dawn and dusk) }
   CityLand.sky(c, W, H, env, t)               gradient, stars, sun or moon
   CityLand.landscape(c, W, H, horizon, env, cfg, x0, x1)   hills, water, sights; cfg = city.json "landscape"
   CityLand.rowhouses(c, x0, x1, base, hh, seed, env, o)    a street's facades, windows lit at night
   CityLand.SIGHTS                             the sight drawings: tower, dome, spire, bridge, lighthouse, blocks, hall

   To add a sight, add a function to CityLand.SIGHTS: (c, x, base, s, col, env) with s the height unit
   in pixels and col the paper colour; then name it in city.json under landscape.sights. */
(function () {
'use strict';
if (window.CityLand) return;
var K = window.CityKit, TAU = K.TAU, paper = K.paper, poly = K.poly, rect = K.rect, jag = K.jag, circ = K.circ, rnd = K.rnd, lerp = K.lerp, mixHex = K.mixHex;

/* ---------------------------------------------------------------- the light of the hour */
var KEYS = [  /* hour, sky top, sky bottom */
  [0, '#0d0d26', '#1d1f3f'], [5, '#0d0d26', '#241f4a'], [6.5, '#4b5f8f', '#e39a7a'], [8.5, '#5f9fc2', '#bfdce6'],
  [16, '#5f9fc2', '#bfdce6'], [18, '#6a5a9a', '#e8906a'], [19.7, '#1a1a40', '#4b3a6b'], [21, '#0d0d26', '#1d1f3f'], [24, '#0d0d26', '#1d1f3f']
];
function skyAt(hour) {
  for (var i = 1; i < KEYS.length; i++) if (hour <= KEYS[i][0]) {
    var a = KEYS[i - 1], b = KEYS[i], u = (hour - a[0]) / (b[0] - a[0]);
    return [mixHex(a[1], b[1], u), mixHex(a[2], b[2], u)];
  }
  return [KEYS[0][1], KEYS[0][2]];
}
function env(hour) {
  hour = ((hour % 24) + 24) % 24;
  var dark = hour < 5 || hour > 21 ? 1 : hour < 6.5 ? 1 - (hour - 5) / 1.5 : hour < 8.5 ? 0 : hour < 16 ? 0 : hour < 18 ? 0 : hour < 21 ? (hour - 18) / 3 : 1;
  if (hour >= 6.5 && hour < 8.5) dark = 0;
  var twi = Math.max(0, 1 - Math.abs(hour - 6.6) / 1.4, 1 - Math.abs(hour - 18.6) / 1.6);
  return { hour: hour, dark: Math.max(0, Math.min(1, dark)), twi: twi, night: dark > 0.55 };
}

function sky(c, W, H, e, t) {
  var k = skyAt(e.hour), g = c.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, k[0]); g.addColorStop(1, k[1]);
  c.fillStyle = g; c.fillRect(0, 0, W, H);
  if (e.dark > 0.3) {
    var r = rnd(9), i;
    for (i = 0; i < 46; i++) {
      var tw = 0.5 + 0.5 * Math.sin((t || 0) / 700 + i * 1.7);
      c.fillStyle = 'rgba(255,246,214,' + (e.dark * (0.35 + 0.35 * r()) * (0.6 + 0.4 * tw)) + ')';
      c.fillRect(r() * W, r() * H * 0.5, 1.6, 1.6);
    }
  }
  /* the sun walks 6 → 18 along an arc, the moon 18 → 30 */
  var h = e.hour < 6 ? e.hour + 24 : e.hour, sun = h >= 6 && h <= 18, u = sun ? (h - 6) / 12 : (h - 18) / 12;
  var x = W * (0.08 + 0.84 * u), y = H * 0.62 - Math.sin(Math.PI * u) * H * 0.52, R = Math.max(10, H * 0.045);
  if (sun) {
    paper(c, function (q) { q.beginPath(); for (var j = 0; j < 32; j++) { var rr = j % 2 ? R * 1.15 : R * 1.5, aa = j / 32 * TAU + (t || 0) / 30000; q.lineTo(x + Math.cos(aa) * rr, y + Math.sin(aa) * rr); } q.closePath(); }, '#f6a92c', 1);
    paper(c, K.disc(x, y, R, 13), '#ffd65a', 0.8);
  } else {
    paper(c, K.disc(x, y, R * 0.85, 17), '#fff2c8', 0.8);
    c.fillStyle = 'rgba(180,170,140,.35)'; c.beginPath(); c.arc(x - R * 0.2, y - R * 0.15, R * 0.18, 0, TAU); c.arc(x + R * 0.25, y + R * 0.2, R * 0.12, 0, TAU); c.fill();
  }
}

/* ---------------------------------------------------------------- hills */
function paint(col, e, depth) {   /* the paper colour of a thing at this hour: darker at night, warm at the edges of the day */
  var d = mixHex(col, '#10142c', 0.72 * e.dark);
  return e.twi > 0 ? mixHex(d, '#e39a7a', 0.16 * e.twi * (1 - depth * 0.4)) : d;
}
function hill(c, W, base, hgt, rough, seed, col) {
  var r = rnd(seed), f = [], p = [], a = [], i, pts = [], x;
  for (i = 0; i < 4; i++) { f.push((0.004 + r() * 0.012) * (i + 1)); p.push(r() * TAU); a.push(1 / (i + 1)); }
  var tot = a.reduce(function (s, v) { return s + v; }, 0);
  for (x = -10; x <= W + 10; x += 8) {
    var y = 0; for (i = 0; i < 4; i++) y += Math.sin(x * f[i] + p[i]) * a[i];
    pts.push([x, base - hgt * (0.55 + 0.45 * y / tot) - r() * rough * hgt * 0.04]);
  }
  pts.push([W + 10, base + 4], [-10, base + 4]);
  paper(c, function (q) { jag(q, pts, seed, 1.2); }, col, 1.2);
}

/* ---------------------------------------------------------------- sights: (c, x, base, s, col, env)
   x the centre, base the ground line, s the height unit. Windows light up at night. */
function lit(c, e, x, y, w, h) {
  c.fillStyle = e.night ? 'rgba(255,214,120,.9)' : 'rgba(255,255,255,.28)'; c.fillRect(x, y, w, h);
}
var SIGHTS = {
  tower: function (c, x, base, s, col, e) {
    var w = s * 0.2;
    paper(c, poly([[x - w, base], [x - w * 0.45, base - s * 1.5], [x + w * 0.45, base - s * 1.5], [x + w, base]]), col, 1.4);
    paper(c, poly([[x - w * 1.4, base - s * 1.5], [x + w * 1.4, base - s * 1.5], [x + w * 0.9, base - s * 1.72], [x - w * 0.9, base - s * 1.72]]), col, 1.4);
    c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(x, base - s * 1.72); c.lineTo(x, base - s * 2.1); c.stroke();
    for (var i = 0; i < 5; i++) lit(c, e, x - 2, base - s * (0.25 + i * 0.26), 4, 6);
    if (e.night) K.glow(c, x, base - s * 2.1, 3, 0, 1);
  },
  dome: function (c, x, base, s, col, e) {
    var w = s * 0.75;
    paper(c, rect(x - w, base - s * 0.5, w * 2, s * 0.5), col, 1.2);
    for (var i = 0; i < 6; i++) lit(c, e, x - w + 8 + i * (w * 2 - 16) / 6, base - s * 0.38, w * 0.12, s * 0.28);
    paper(c, rect(x - w * 0.55, base - s * 0.8, w * 1.1, s * 0.3), col, 1.2);
    paper(c, function (q) { q.beginPath(); q.arc(x, base - s * 0.8, w * 0.55, Math.PI, TAU); q.closePath(); }, K.shade(col, 0.1), 1.6);
    paper(c, rect(x - 1.5, base - s * 1.3, 3, s * 0.2), col, 1);
  },
  spire: function (c, x, base, s, col, e) {
    paper(c, rect(x - s * 0.5, base - s * 0.55, s, s * 0.55), col, 1.2);
    paper(c, poly([[x - s * 0.5, base - s * 0.55], [x, base - s * 0.95], [x + s * 0.5, base - s * 0.55]]), K.shade(col, -0.08), 1.2);
    paper(c, rect(x + s * 0.55, base - s * 1.2, s * 0.26, s * 1.2), col, 1.4);
    paper(c, poly([[x + s * 0.5, base - s * 1.2], [x + s * 0.68, base - s * 1.95], [x + s * 0.86, base - s * 1.2]]), K.shade(col, -0.08), 1.4);
    c.strokeStyle = col; c.lineWidth = 2; c.beginPath(); c.moveTo(x + s * 0.68, base - s * 1.95); c.lineTo(x + s * 0.68, base - s * 2.2); c.moveTo(x + s * 0.6, base - s * 2.1); c.lineTo(x + s * 0.76, base - s * 2.1); c.stroke();
    lit(c, e, x - s * 0.08, base - s * 0.4, s * 0.16, s * 0.3); lit(c, e, x + s * 0.64, base - s * 1.0, s * 0.08, s * 0.2);
  },
  bridge: function (c, x, base, s, col, e) {
    var span = s * 5, tw = s * 1.6, a = x - span / 2, b = x + span / 2, deck = base - s * 0.22;
    paper(c, rect(a - 18, deck, span + 36, 5), K.shade(col, -0.1), 1.2);
    [a, b].forEach(function (px) { paper(c, rect(px - 5, base - tw, 10, tw), col, 1.4); paper(c, rect(px - 9, base - tw, 18, 5), col, 1.4); });
    c.strokeStyle = col; c.lineWidth = 2;
    c.beginPath(); for (var q = 0; q <= 1.0001; q += 0.04) { var px = lerp(a, b, q), py = base - tw + 4 + (deck - (base - tw + 4) - s * 0.18) * 4 * q * (1 - q); q ? c.lineTo(px, py) : c.moveTo(px, py); } c.stroke();
    c.lineWidth = 1; c.beginPath();
    for (q = 0.06; q < 1; q += 0.06) { var px2 = lerp(a, b, q), py2 = base - tw + 4 + (deck - (base - tw + 4) - s * 0.18) * 4 * q * (1 - q); c.moveTo(px2, py2); c.lineTo(px2, deck); } c.stroke();
    if (e.night) { for (q = 0.04; q < 1; q += 0.04) { c.fillStyle = 'rgba(255,214,120,.9)'; c.fillRect(lerp(a, b, q) - 1, deck - 2, 2, 2); } }
  },
  lighthouse: function (c, x, base, s, col, e) {
    var w = s * 0.22;
    paper(c, poly([[x - w, base], [x - w * 0.6, base - s * 1.4], [x + w * 0.6, base - s * 1.4], [x + w, base]]), K.shade(col, 0.12), 1.4);
    [0.25, 0.75].forEach(function (f) { c.fillStyle = 'rgba(200,50,50,.75)'; c.beginPath(); c.moveTo(x - lerp(w, w * 0.6, f), base - s * 1.4 * f); c.lineTo(x + lerp(w, w * 0.6, f), base - s * 1.4 * f); c.lineTo(x + lerp(w, w * 0.6, f + 0.18), base - s * 1.4 * (f + 0.18)); c.lineTo(x - lerp(w, w * 0.6, f + 0.18), base - s * 1.4 * (f + 0.18)); c.fill(); });
    paper(c, rect(x - w * 0.7, base - s * 1.62, w * 1.4, s * 0.22), e.night ? '#ffe9a8' : '#cfd8dc', 1.2);
    paper(c, poly([[x - w * 0.9, base - s * 1.62], [x, base - s * 1.85], [x + w * 0.9, base - s * 1.62]]), col, 1.2);
    if (e.night) { var g = c.createLinearGradient(x, 0, x + s * 4, 0); g.addColorStop(0, 'rgba(255,233,168,.5)'); g.addColorStop(1, 'rgba(255,233,168,0)'); c.fillStyle = g; c.beginPath(); c.moveTo(x, base - s * 1.5); c.lineTo(x + s * 4, base - s * 1.9); c.lineTo(x + s * 4, base - s * 1.1); c.fill(); }
  },
  blocks: function (c, x, base, s, col, e) {
    var r = rnd(Math.round(x) + 7), w = s * 0.42, hs = [1.2, 0.8, 1.6, 1.0], i, j;
    for (i = 0; i < 4; i++) {
      var bx = x + (i - 1.5) * w * 1.05, bh = s * hs[i] * (0.9 + r() * 0.3);
      paper(c, rect(bx - w / 2, base - bh, w, bh), K.shade(col, (i % 2 ? -0.06 : 0.04)), 1.2);
      for (j = 0; j < Math.floor(bh / (s * 0.17)); j++) if (r() < 0.7) lit(c, e, bx - w * 0.3, base - bh + s * 0.08 + j * s * 0.17, w * 0.6, s * 0.07);
    }
  },
  hall: function (c, x, base, s, col, e) {
    var w = s * 1.0, i;
    paper(c, rect(x - w, base - s * 0.5, w * 2, s * 0.5), col, 1.2);
    paper(c, poly([[x - w * 1.08, base - s * 0.5], [x, base - s * 0.8], [x + w * 1.08, base - s * 0.5]]), K.shade(col, -0.08), 1.4);
    for (i = 0; i < 7; i++) { c.fillStyle = K.shade(col, 0.18); c.fillRect(x - w * 0.84 + i * w * 0.28, base - s * 0.46, s * 0.06, s * 0.46); }
    lit(c, e, x - s * 0.12, base - s * 0.36, s * 0.24, s * 0.3);
  }
};

function landscape(c, W, H, horizon, e, cfg, x0, x1) {
  cfg = cfg || {};
  x0 = x0 == null ? 0 : x0; x1 = x1 == null ? W : x1;
  var ridges = cfg.ridges || [{ height: 0.32, color: '#7d9db3', seed: 3 }, { height: 0.2, color: '#5f8a8a', seed: 8 }, { height: 0.12, color: '#4d7a63', seed: 21 }];
  ridges.forEach(function (rg, i) {
    hill(c, W, horizon - H * 0.02 * i, H * rg.height, rg.rough || 0.6, rg.seed || (i + 3), paint(rg.color, e, i / ridges.length));
    c.fillStyle = e.night ? 'rgba(30,34,80,.15)' : 'rgba(210,230,238,.22)'; c.fillRect(0, horizon - H * (rg.height * 0.6), W, H * rg.height * 0.6);
  });
  /* the far ground: water if the city has it, else the roofs of the outskirts */
  var gy = horizon - 2, wa = cfg.water;
  if (wa) {
    var wc = paint(wa.color || '#5f9fc2', e, 0), g = c.createLinearGradient(0, gy, 0, H);
    g.addColorStop(0, wc); g.addColorStop(1, K.shade(wc, -0.18));
    c.fillStyle = g; c.fillRect(0, gy, W, H - gy);
    var r = rnd(5), i;
    c.fillStyle = e.night ? 'rgba(255,233,168,.25)' : 'rgba(255,255,255,.4)';
    for (i = 0; i < 26; i++) c.fillRect(r() * W, gy + 6 + r() * (H - gy) * 0.5, 10 + r() * 22, 1.4);
  } else {
    c.fillStyle = paint(cfg.ground || '#5d7a5a', e, 0); c.fillRect(0, gy, W, H - gy);
  }
  /* the sights, west to east; each sits on the horizon in its own x (0 to 1 across the scene) */
  var span = x1 - x0, unit = Math.min(H * 0.2, span / 6);
  (cfg.sights || []).forEach(function (s, i) {
    var f = SIGHTS[s.kind]; if (!f) return;
    f(c, x0 + span * s.at, horizon + (wa && s.kind !== 'bridge' && s.kind !== 'lighthouse' ? 0 : 2), unit * (s.size || 1), paint(s.color || '#8c8fa6', e, 0.1), e);
  });
}

/* ---------------------------------------------------------------- a street of facades */
var FACADE = ['#efe3c8', '#d6e6d2', '#f0cdb4', '#f2dfa0', '#cfe0ec', '#dcd7cd', '#eecdd2', '#f4f1ea', '#e8d4b0', '#c9d8c0'];
var ROOF = ['#9a4a3a', '#6a5a6a', '#7a5a3a', '#4a5a6a'];
function rowhouses(c, x0, x1, base, hh, seed, e, o) {
  o = o || {};
  var r = rnd(seed + 41), x = x0 - 6, gaps = o.gaps || [];
  while (x < x1) {
    var w = hh * (0.8 + r() * 0.6), n = 2 + Math.floor(r() * 2), fh = hh * 0.62, h = fh * n, col = paint(FACADE[Math.floor(r() * FACADE.length)], e, 0), shut = paint('#7d8f86', e, 0);
    var skip = gaps.some(function (g) { return x + w > g[0] && x < g[1]; });
    if (!skip) {
      paper(c, rect(x, base - h, w, h), col, 1.2);
      if (r() < 0.6) paper(c, poly([[x - 2, base - h], [x + w / 2, base - h - fh * 0.3], [x + w + 2, base - h]]), paint(ROOF[Math.floor(r() * ROOF.length)], e, 0), 1.2);
      else paper(c, rect(x - 2, base - h - 4, w + 4, 5), K.shade(col, -0.15), 1);
      for (var f = 0; f < n; f++) for (var k = 0; k < 2; k++) {
        var wx = x + w * (0.18 + k * 0.5), wy = base - h + f * fh + fh * 0.2, on = e.night && r() < 0.65;
        c.fillStyle = on ? '#ffd27a' : shut; c.fillRect(wx, wy, w * 0.26, fh * 0.5);
        if (on) K.glow(c, wx + w * 0.13, wy + fh * 0.25, 3, 40, 0.5);
        c.strokeStyle = 'rgba(0,0,0,.25)'; c.lineWidth = 1; c.strokeRect(wx, wy, w * 0.26, fh * 0.5);
      }
      if (o.shopfront !== false) { c.fillStyle = paint(['#c62a20', '#2c5aa0', '#2f8f5b', '#e8692a', '#f2c94c'][Math.floor(r() * 5)], e, 0); c.fillRect(x + 3, base - fh * 0.34, w - 6, fh * 0.14); }
    }
    x += w + 2;
  }
}

window.CityLand = { env: env, sky: sky, landscape: landscape, rowhouses: rowhouses, SIGHTS: SIGHTS, paint: paint };
})();
