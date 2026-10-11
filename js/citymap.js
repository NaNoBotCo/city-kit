/* citymap.js: a small map drawn on a canvas. Drag to pan, wheel or pinch to zoom, tap a pin.

   var map = CityMap(element, {
     places: [...],               rows with lat, lng, category, name (string or { en, es }), rank
     ground: {...},               data/ground.json: water, park, river, roads (optional)
     center: { lat, lng }, zoom,  where to start
     floor: 13,                   the zoom where pins first appear (4 of them); everything by two steps in
     lang: 'en',                  which name to show
     onSelect(place),             a pin was tapped
     overlay(c, project, w, h)    draw anything of your own over the ground and under the pins
   });
   map.setView(lat, lng, zoom)   map.getView()   map.select(id)   map.refresh() (draws on the next frame)   map.redraw() (draws now)
   map.setPlaces(rows)   map.setLang('es')   map.pins() (the pins drawn in the last frame)

   The ground is a plain Web Mercator projection, so a place's lat and lng land where Leaflet or MapLibre would put
   them. Swapping in one of those is a change to this file's callers only: the pins come from js/pins.js either way. */
(function () {
'use strict';
var K = window.CityKit, P = window.CityPins;

var LIGHT = { land: '#efe3c8', water: '#8bbbcf', park: '#b3d196', road: '#fffaf1', edge: 'rgba(90,70,50,.28)', text: '#2b2118', halo: '#fffcf6' };
var DARK = { land: '#2a2118', water: '#27475a', park: '#2c4a30', road: '#4a3d2e', edge: 'rgba(0,0,0,.4)', text: '#f0e6d6', halo: '#1c120d' };
function theme() { return window.matchMedia && matchMedia('(prefers-color-scheme: dark)').matches && !document.documentElement.hasAttribute('data-light') ? DARK : LIGHT; }

function worldSize(z) { return 256 * Math.pow(2, z); }
function toWorld(lat, lng, z) {
  var s = worldSize(z), f = Math.sin(lat * Math.PI / 180);
  return [(lng + 180) / 360 * s, (0.5 - Math.log((1 + f) / (1 - f)) / (4 * Math.PI)) * s];
}
function fromWorld(x, y, z) {
  var s = worldSize(z), n = Math.PI - 2 * Math.PI * y / s;
  return { lat: 180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))), lng: x / s * 360 - 180 };
}
function metresPerPixel(lat, z) { return 156543.03392 * Math.cos(lat * Math.PI / 180) / Math.pow(2, z); }

function CityMap(el, opts) {
  opts = opts || {};
  var canvas = document.createElement('canvas'), places = opts.places || [], ground = opts.ground || null, lang = opts.lang || 'en';
  var view = { lat: (opts.center || {}).lat || 0, lng: (opts.center || {}).lng || 0, zoom: opts.zoom || 15 };
  var MIN = opts.minZoom || 12, MAX = opts.maxZoom || 19, floor = opts.floor == null ? 13 : opts.floor;
  var shown = [], selected = null, dirty = false, W = 0, H = 0, dpr = 1, ctx;
  canvas.style.cssText = 'display:block;width:100%;height:100%;touch-action:none;cursor:grab';
  canvas.tabIndex = 0; canvas.setAttribute('role', 'application'); canvas.setAttribute('aria-label', opts.label || 'Map');
  el.style.position = el.style.position || 'relative';
  el.appendChild(canvas);

  function name(p) { var n = p.name; return typeof n === 'string' ? n : (n && (n[lang] || n.en)) || ''; }
  function project(p) {
    var a = toWorld(p.lat, p.lng, view.zoom), b = toWorld(view.lat, view.lng, view.zoom);
    return [a[0] - b[0] + W / 2, a[1] - b[1] + H / 2];
  }
  function pt(lat, lng) { return project({ lat: lat, lng: lng }); }

  function size() {
    dpr = Math.min(3, window.devicePixelRatio || 1); W = Math.max(1, el.clientWidth); H = Math.max(1, el.clientHeight);
    if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
    ctx = canvas.getContext('2d');
  }
  function trace(c, ring) { ring.forEach(function (q, i) { var s = pt(q[0], q[1]); i ? c.lineTo(s[0], s[1]) : c.moveTo(s[0], s[1]); }); }
  function fillRings(c, rings, col, lift) {
    (rings || []).forEach(function (ring) { K.paper(c, function (q) { q.beginPath(); trace(q, ring); q.closePath(); }, col, lift); });
  }
  function line(c, ring, w, col) {
    c.strokeStyle = col; c.lineWidth = w; c.lineCap = 'round'; c.lineJoin = 'round'; c.beginPath(); trace(c, ring); c.stroke();
  }

  function draw() {
    dirty = false; size();
    var c = ctx, T = theme(), mpp = metresPerPixel(view.lat, view.zoom);
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.fillStyle = T.land; c.fillRect(0, 0, W, H);
    if (ground) {
      fillRings(c, ground.park, T.park, 0.6);
      (ground.river || []).forEach(function (r) { line(c, r.pts, Math.max(3, r.w / mpp), T.water); });
      fillRings(c, ground.water, T.water, 1);
      (ground.roads || []).forEach(function (r) { var w = Math.max(2, r.w / mpp * 1.5); line(c, r.pts, w + 2, T.edge); });
      (ground.roads || []).forEach(function (r) { line(c, r.pts, Math.max(2, r.w / mpp * 1.5), T.road); });
    }
    if (opts.overlay) opts.overlay(c, project, W, H);
    var R = Math.min(3, Math.max(2, dpr));
    c.font = '600 12px system-ui,-apple-system,"Segoe UI",sans-serif'; c.textBaseline = 'middle';
    shown = P.select(places, { w: W, h: H, zoom: view.zoom, floor: floor, project: project, measure: function (p) { return Math.min(170, c.measureText(name(p)).width + 4); } });
    shown.forEach(function (o) {
      var ic = P.icon(o.kind, o.d, R);
      if (selected && selected.id === o.place.id) { c.strokeStyle = T.text; c.lineWidth = 2.5; c.beginPath(); c.arc(o.x, o.y, o.d / 2 + 4, 0, 6.2832); c.stroke(); }
      if (ic) c.drawImage(ic, o.x - o.d / 2, o.y - o.d / 2, o.d, o.d);
      if (o.label) {
        var t = name(o.place); c.lineJoin = 'round'; c.lineWidth = 3.4; c.strokeStyle = T.halo; c.strokeText(t, o.x + o.d / 2 + 4, o.y - 8 + 8); c.fillStyle = T.text; c.fillText(t, o.x + o.d / 2 + 4, o.y);
      }
    });
    c.fillStyle = T.text; c.globalAlpha = 0.7; c.font = '11px system-ui,sans-serif'; c.textAlign = 'right'; c.textBaseline = 'alphabetic';
    c.fillText('z' + view.zoom.toFixed(1) + ' · ' + shown.length + ' of ' + places.length + ' pins', W - 8, H - 8); c.textAlign = 'left'; c.globalAlpha = 1;
  }
  function refresh() { if (!dirty) { dirty = true; requestAnimationFrame(draw); } }

  function clampZoom(z) { return Math.max(MIN, Math.min(MAX, z)); }
  function zoomAt(px, py, nz) {   /* keep the point under (px, py) where it is */
    nz = clampZoom(nz);
    var b = toWorld(view.lat, view.lng, view.zoom), dx = px - W / 2, dy = py - H / 2, w0 = [b[0] + dx, b[1] + dy];
    var k = Math.pow(2, nz - view.zoom), w1 = [w0[0] * k, w0[1] * k], nb = [w1[0] - dx, w1[1] - dy], ll = fromWorld(nb[0], nb[1], nz);
    view = { lat: ll.lat, lng: ll.lng, zoom: nz }; refresh();
  }
  function pan(dx, dy) {
    var b = toWorld(view.lat, view.lng, view.zoom), ll = fromWorld(b[0] - dx, b[1] - dy, view.zoom);
    view.lat = Math.max(-80, Math.min(80, ll.lat)); view.lng = ll.lng; refresh();
  }
  function hit(x, y) {
    for (var i = shown.length - 1; i >= 0; i--) { var o = shown[i]; if (Math.hypot(o.x - x, o.y - y) <= o.d / 2 + 5) return o.place; }
    return null;
  }

  var ptrs = {}, moved = 0, last = null, pinch0 = null;
  canvas.addEventListener('pointerdown', function (e) {
    canvas.setPointerCapture(e.pointerId); ptrs[e.pointerId] = [e.clientX, e.clientY]; moved = 0; canvas.style.cursor = 'grabbing';
    var ks = Object.keys(ptrs); if (ks.length === 2) { var a = ptrs[ks[0]], b = ptrs[ks[1]]; pinch0 = { d: Math.hypot(a[0] - b[0], a[1] - b[1]), z: view.zoom }; }
    last = [e.clientX, e.clientY];
  });
  canvas.addEventListener('pointermove', function (e) {
    var r = canvas.getBoundingClientRect();
    if (!ptrs[e.pointerId]) { canvas.style.cursor = hit(e.clientX - r.left, e.clientY - r.top) ? 'pointer' : 'grab'; return; }
    ptrs[e.pointerId] = [e.clientX, e.clientY];
    var ks = Object.keys(ptrs);
    if (ks.length === 2 && pinch0) {
      var a = ptrs[ks[0]], b = ptrs[ks[1]], d = Math.hypot(a[0] - b[0], a[1] - b[1]);
      zoomAt((a[0] + b[0]) / 2 - r.left, (a[1] + b[1]) / 2 - r.top, pinch0.z + Math.log2(d / pinch0.d)); moved = 99; return;
    }
    var dx = e.clientX - last[0], dy = e.clientY - last[1]; last = [e.clientX, e.clientY]; moved += Math.abs(dx) + Math.abs(dy);
    pan(dx, dy);
  });
  function up(e) {
    var was = ptrs[e.pointerId]; delete ptrs[e.pointerId]; pinch0 = null; canvas.style.cursor = 'grab';
    if (was && moved < 6 && !Object.keys(ptrs).length) { var r = canvas.getBoundingClientRect(), p = hit(e.clientX - r.left, e.clientY - r.top); if (p) { selected = p; refresh(); if (opts.onSelect) opts.onSelect(p); } }
  }
  canvas.addEventListener('pointerup', up); canvas.addEventListener('pointercancel', function (e) { delete ptrs[e.pointerId]; pinch0 = null; });
  canvas.addEventListener('wheel', function (e) { e.preventDefault(); var r = canvas.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, view.zoom - e.deltaY * 0.0022); }, { passive: false });
  canvas.addEventListener('dblclick', function (e) { var r = canvas.getBoundingClientRect(); zoomAt(e.clientX - r.left, e.clientY - r.top, view.zoom + 1); });
  canvas.addEventListener('keydown', function (e) {
    var k = e.key, s = 60;
    if (k === '+' || k === '=') zoomAt(W / 2, H / 2, view.zoom + 0.5); else if (k === '-') zoomAt(W / 2, H / 2, view.zoom - 0.5);
    else if (k === 'ArrowLeft') pan(s, 0); else if (k === 'ArrowRight') pan(-s, 0); else if (k === 'ArrowUp') pan(0, s); else if (k === 'ArrowDown') pan(0, -s); else return;
    e.preventDefault();
  });
  function button(txt, label, f, top) {
    var b = document.createElement('button'); b.type = 'button'; b.textContent = txt; b.setAttribute('aria-label', label);
    b.style.cssText = 'position:absolute;right:10px;top:' + top + 'px;width:34px;height:34px;border-radius:8px;border:1px solid rgba(0,0,0,.25);background:rgba(255,252,246,.95);color:#2b2118;font:700 20px/1 system-ui;cursor:pointer';
    b.onclick = f; el.appendChild(b);
  }
  button('+', 'Zoom in', function () { zoomAt(W / 2, H / 2, view.zoom + 1); }, 10);
  button('−', 'Zoom out', function () { zoomAt(W / 2, H / 2, view.zoom - 1); }, 48);

  if (window.ResizeObserver) new ResizeObserver(refresh).observe(el); else addEventListener('resize', refresh);
  if (window.matchMedia) matchMedia('(prefers-color-scheme: dark)').addEventListener && matchMedia('(prefers-color-scheme: dark)').addEventListener('change', refresh);
  addEventListener('storage', function (e) { if (e.key === 'city-detail') refresh(); });
  refresh();

  return {
    setView: function (lat, lng, z) { view = { lat: lat, lng: lng, zoom: clampZoom(z == null ? view.zoom : z) }; refresh(); },
    getView: function () { return { lat: view.lat, lng: view.lng, zoom: view.zoom }; },
    select: function (id) { selected = places.filter(function (p) { return p.id === id; })[0] || null; refresh(); },
    setPlaces: function (rows) { places = rows; refresh(); },
    setLang: function (l) { lang = l; refresh(); },
    refresh: refresh, redraw: draw, project: project, pins: function () { return shown; }, metresPerPixel: function () { return metresPerPixel(view.lat, view.zoom); }
  };
}

window.CityMap = CityMap;
})();
