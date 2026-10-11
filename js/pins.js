/* pins.js: icon pins, more of them with every step in.

   A pin is a disc in the category's colour, a white rim, and the category's glyph stroked in white.
   Load js/pins-table.js first (tools/make_pins.py writes it from city.json and assets/icons.svg).

   CityPins.icon(kind, d, R)         a canvas, d pixels across at pixel ratio R; drawn once per kind and size, then kept
   CityPins.dataUrl(kind, d, R)      the same as a PNG data URL, for Leaflet's L.icon or an <img>
   CityPins.kindOf(categoryOrList)   a category id the table knows, else '_' (the other pin)
   CityPins.select(places, view)     which places to draw in this view, best known first, none touching
   CityPins.pref() / setPref(v)      the reader's detail choice: 'less', 'more' or 'most'

   select(places, view): view = { w, h, zoom, floor, project(place) → [x, y] in pixels, size, measure(place) → label width in pixels }
     A place carries rank (higher is better known); without it, list order is the rank.
     Clutter, in order: a cap by map size (50 wide, 25 phone, 12 card), fewer while the view is still wide
     (45% at the floor, all of them two steps in), the best-known first, a pin that would touch another is
     skipped, and names only from street level and only where they fit. 'less' halves the cap. */
(function () {
'use strict';
if (window.CityPins) return;
var K = window.CITY_PINS || { _: ['#5B4636', []] };

function pref() { try { var p = localStorage.getItem('city-detail'); if (p === 'less' || p === 'most') return p; } catch (e) {} return 'more'; }
function setPref(v) { try { localStorage.setItem('city-detail', v); } catch (e) {} }
function cap(w, h) { var n = w < 640 ? (h && h < 320 ? 12 : 25) : 50; return pref() === 'less' ? Math.ceil(n / 2) : n; }
function count(w, steps, h) { if (steps < 0) return 0; return Math.max(4, Math.round(cap(w, h) * Math.min(1, 0.45 + 0.275 * steps))); }
function kindOf(c) {
  var list = Array.isArray(c) ? c : [c];
  for (var i = 0; i < list.length; i++) if (list[i] && K[list[i]]) return list[i];
  return '_';
}

var CACHE = {};
function icon(kind, d, R) {
  var b = K[kind] || K._, key = kind + '|' + d + '|' + R;
  if (CACHE[key]) return CACHE[key];
  var c = document.createElement('canvas'), x = c.getContext('2d'), h = d / 2;
  c.width = c.height = Math.ceil(d * R); if (!x) return null;
  x.scale(R, R);
  x.beginPath(); x.arc(h, h, h - 0.5, 0, 6.2832); x.fillStyle = 'rgba(23,17,12,.45)'; x.fill();
  x.beginPath(); x.arc(h, h, h - 1, 0, 6.2832); x.fillStyle = '#fff'; x.fill();
  x.beginPath(); x.arc(h, h, h - 2.6, 0, 6.2832); x.fillStyle = b[0]; x.fill();
  if (window.Path2D) {
    var g = d * 0.6, s = g / 24;
    x.save(); x.translate(h - g / 2, h - g / 2); x.scale(s, s);
    x.strokeStyle = '#fff'; x.lineWidth = 2.4; x.lineCap = 'round'; x.lineJoin = 'round';
    b[1].forEach(function (p) { x.stroke(new Path2D(p)); });
    x.restore();
  }
  return (CACHE[key] = c);
}
function dataUrl(kind, d, R) { var c = icon(kind, d, R || 2); return c ? c.toDataURL('image/png') : ''; }

function select(places, v) {
  var steps = v.zoom - (v.floor == null ? 13 : v.floor), n = count(v.w, steps, v.h);
  if (!n) return [];
  var d = v.size || (v.w < 640 ? 22 : 24), out = [], boxes = [], i, j;
  var rows = places.map(function (p, k) { return { p: p, k: k, rank: p.rank != null ? p.rank : -k }; }).sort(function (a, b) { return b.rank - a.rank; });
  for (i = 0; i < rows.length && out.length < n; i++) {
    var p = rows[i].p, xy = v.project(p), x = xy[0], y = xy[1];
    if (x < -d || y < -d || x > v.w + d || y > v.h + d) continue;
    var pad = d / 2 + 3, hit = false;
    for (j = 0; j < boxes.length && !hit; j++) hit = Math.abs(boxes[j][0] - x) < pad * 2 && Math.abs(boxes[j][1] - y) < pad * 2;
    if (hit) continue;
    boxes.push([x, y]); out.push({ place: p, kind: kindOf(p.category), x: x, y: y, d: d, label: false });
  }
  if (v.measure && steps >= 3) {   /* names from street level, only where they fit clear of every pin and every other name */
    var used = [];
    out.forEach(function (o) {
      var w = v.measure(o.place), x0 = o.x + o.d / 2 + 4, y0 = o.y - 8, ok = x0 + w < v.w - 4, q;
      for (q = 0; q < out.length && ok; q++) { var u = out[q]; ok = !(u !== o && u.x + u.d / 2 > x0 && u.x - u.d / 2 < x0 + w && Math.abs(u.y - o.y) < u.d); }
      for (q = 0; q < used.length && ok; q++) ok = !(used[q][0] < x0 + w && used[q][1] > x0 && Math.abs(used[q][2] - y0) < 15);
      if (ok) { o.label = true; used.push([x0, x0 + w, y0]); }
    });
  }
  return out;
}

window.CityPins = { K: K, icon: icon, dataUrl: dataUrl, kindOf: kindOf, cap: cap, count: count, pref: pref, setPref: setPref, select: select };
})();
