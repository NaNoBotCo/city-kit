/* doodler.js: the doodler's front door.

   CityDoodler.configure(city)                 city = city.json; reads landscape and each category's scene
   CityDoodler.draw(c, W, H, t, opts)          one frame onto a 2D context; returns hit boxes
   CityDoodler.mount(canvas, opts)             a canvas that animates itself; returns { set(opts), stop() }
   CityDoodler.still(canvas, opts)             one frame, no loop (thumbnails, share cards)
   CityDoodler.sceneFor(category)              the scene a place category gets
   CityDoodler.scenes()                        the names of the scenes
   CityDoodler.addScene(name, fn)              register a scene of your own (see doodler-scenes.js)

   opts: { scene, seed, hour (0 to 24, default the clock), label, onHit(hit) }
   The same scene, seed and hour draw the same picture; motion follows t. */
(function () {
'use strict';
if (window.CityDoodler) return;
var K = window.CityKit, L = window.CityLand, SCENES = window.CityScenes;
var CFG = { landscape: {}, sceneFor: {} };
var DEFAULT_FOR = { food: 'cafe', cafe: 'cafe', market: 'market', shopping: 'market', music: 'band', culture: 'band', whatson: 'band', sport: 'run', park: 'run', parks: 'run',
  wellness: 'yoga', health: 'yoga', worship: 'calm', school: 'learn', library: 'learn', transport: 'street', street: 'street', hotel: 'cafe', sights: 'street' };

function configure(city) {
  CFG = city || CFG; if (!CFG.landscape) CFG.landscape = {};
  CFG.sceneFor = CFG.sceneFor || {};
  (CFG.categories || []).forEach(function (cat) { if (cat.scene && !CFG.sceneFor[cat.id]) CFG.sceneFor[cat.id] = cat.scene; });
}
function sceneFor(cat) { return (CFG.sceneFor && CFG.sceneFor[cat]) || DEFAULT_FOR[cat] || 'street'; }
function clockHour() { var d = new Date(); return d.getHours() + d.getMinutes() / 60; }

var BACK = {};
function back(W, H, dpr, e, horizon, x0, x1) {
  var key = [W, H, dpr, Math.round(e.hour * 4)].join('|'), B = BACK[key];
  if (!B) {
    B = document.createElement('canvas'); B.width = Math.round(W * dpr); B.height = Math.round(H * dpr);
    var k = B.getContext('2d'); k.setTransform(dpr, 0, 0, dpr, 0, 0);
    L.sky(k, W, H, e, 0); L.landscape(k, W, H, horizon, e, CFG.landscape, x0, x1);
    var ks = Object.keys(BACK); if (ks.length > 8) delete BACK[ks[0]];
    BACK[key] = B;
  }
  return B;
}

var FAILED = {};
function draw(c, W, H, t, o) {
  o = o || {};
  var e = L.env(o.hour == null ? clockHour() : o.hour), phone = W < 560, dpr = c.getTransform ? c.getTransform().a : 1;
  var name = SCENES[o.scene] && !FAILED[o.scene] ? o.scene : 'street', seed = (o.seed == null ? K.hash(o.scene || 'x') : o.seed) >>> 0, hits = [];
  var B = back(W, H, dpr, e, H * 0.62, 0, W);
  c.save(); c.setTransform(1, 0, 0, 1, 0, 0); c.drawImage(B, 0, 0); c.restore();
  var S = { c: c, W: W, H: H, t: t, x0: 0, x1: W, span: W, deck: H * 0.84, phone: phone, night: e.night, env: e, label: o.label || '', seed: seed,
    r: K.rnd(seed || 1), hh: Math.min(H * (phone ? 0.2 : 0.24), W / 8, 90), hits: hits };
  c.save(); c.beginPath(); c.rect(0, 0, W, H); c.clip();
  /* a scene that throws is noted once and the street scene is drawn in its place */
  try { SCENES[name](S); } catch (err) { FAILED[name] = 1; if (typeof console !== 'undefined') console.error('doodler: ' + name + ' ' + (err && err.stack || err)); }
  c.restore();
  return hits;
}

function size(canvas) {
  var dpr = Math.min(3, window.devicePixelRatio || 1), W = Math.max(1, canvas.clientWidth), H = Math.max(1, canvas.clientHeight);
  if (canvas.width !== Math.round(W * dpr) || canvas.height !== Math.round(H * dpr)) { canvas.width = Math.round(W * dpr); canvas.height = Math.round(H * dpr); }
  return { W: W, H: H, dpr: dpr };
}

function still(canvas, o) {
  var s = size(canvas), c = canvas.getContext('2d');
  c.setTransform(s.dpr, 0, 0, s.dpr, 0, 0);
  return draw(c, s.W, s.H, (o && o.t) || 3000, o);
}

function mount(canvas, opts) {
  var o = opts || {}, raf = 0, hits = [], t0 = performance.now(), on = true, seen = true;
  var calm = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
  function frame(now) {
    raf = 0;
    if (on && seen) { var s = size(canvas), c = canvas.getContext('2d'); c.setTransform(s.dpr, 0, 0, s.dpr, 0, 0); hits = draw(c, s.W, s.H, calm ? 4000 : Math.max(0, now - t0), o); }
    if (on && !calm) raf = requestAnimationFrame(frame);
  }
  function kick() { if (!raf) raf = requestAnimationFrame(frame); }
  if (window.IntersectionObserver) new IntersectionObserver(function (es) { seen = es[0].isIntersecting; if (seen) kick(); }).observe(canvas);
  if (window.ResizeObserver) new ResizeObserver(kick).observe(canvas);
  canvas.addEventListener('click', function (ev) {
    if (!o.onHit) return;
    var r = canvas.getBoundingClientRect(), x = ev.clientX - r.left, y = ev.clientY - r.top;
    for (var i = hits.length - 1; i >= 0; i--) { var h = hits[i]; if (x >= h.x0 && x <= h.x1 && y >= h.y0 && y <= h.y1) { o.onHit(h); return; } }
  });
  kick();
  return { set: function (n) { o = Object.assign({}, o, n); kick(); }, stop: function () { on = false; if (raf) cancelAnimationFrame(raf); } };
}

function addScene(name, fn) { SCENES[name] = fn; delete FAILED[name]; }

window.CityDoodler = { configure: configure, draw: draw, mount: mount, still: still, sceneFor: sceneFor, scenes: function () { return Object.keys(SCENES); }, addScene: addScene };
})();
