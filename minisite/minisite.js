/* minisite.js: the hero and the two toys. Reads window.MINI (written by build.py) and ../city.json, ../data/places.json. */
(function () {
'use strict';
var M = window.MINI, lang = M.lang, TAU = Math.PI * 2;
var S = {
  en: { alt: 'Sun height', up: 'above the horizon', down: 'below the horizon', day: 'Daylight', h: 'h', polar: 'the sun does not set', night: 'the sun does not rise', day0: 'Day', within: 'within', none: 'nothing inside the circle', from: 'From', walk: 'on foot', m: 'm', min: 'min' },
  es: { alt: 'Altura del sol', up: 'sobre el horizonte', down: 'bajo el horizonte', day: 'Luz de día', h: 'h', polar: 'el sol no se pone', night: 'el sol no sale', day0: 'Día', within: 'a menos de', none: 'nada dentro del círculo', from: 'Desde', walk: 'a pie', m: 'm', min: 'min' }
};
function s(k) { return (S[lang] || S.en)[k] || S.en[k]; }
function $(id) { return document.getElementById(id); }
function J(u) { return fetch(M.root + u).then(function (r) { return r.json(); }); }
function tx(v) { return typeof v === 'string' ? v : (v && (v[lang] || v.en)) || ''; }
function clock(h) { var m = Math.round((h % 1) * 60); return Math.floor(h) + ':' + (m < 10 ? '0' : '') + m; }

Promise.all([J('city.json'), J('data/places.json'), J('data/ground.json').catch(function () { return null; })]).then(function (all) {
  var city = all[0], places = all[1].places, ground = all[2], cats = {};
  city.categories.forEach(function (c) { cats[c.id] = c; });
  CityDoodler.configure(city);
  var now = new Date(), hour = now.getHours() + now.getMinutes() / 60;
  if (/[?&]hour=/.test(location.search)) hour = +new URLSearchParams(location.search).get('hour');
  var hero = CityDoodler.mount($('hero'), { scene: 'street', seed: CityKit.hash('home'), hour: hour, label: '' });

  /* ---- the sun */
  var cv = $('sun');
  function sun() {
    var h = +$('hr').value, d = +$('day').value, lat = +$('lat').value, phi = lat * Math.PI / 180;
    var decl = 23.44 * Math.sin(TAU * (284 + d) / 365) * Math.PI / 180;
    function alt(hh) { return Math.asin(Math.sin(phi) * Math.sin(decl) + Math.cos(phi) * Math.cos(decl) * Math.cos((hh - 12) * 15 * Math.PI / 180)) * 180 / Math.PI; }
    var dpr = Math.min(3, window.devicePixelRatio || 1), W = cv.clientWidth, H = 260;
    cv.width = Math.round(W * dpr); cv.height = Math.round(H * dpr);
    var c = cv.getContext('2d'); c.setTransform(dpr, 0, 0, dpr, 0, 0);
    var dark = matchMedia('(prefers-color-scheme: dark)').matches, ink = dark ? '#f0e6d6' : '#2a1a12', pad = 34, y0 = H / 2 + 20, k = (y0 - 22) / 90;
    function X(hh) { return pad + (W - pad * 2) * hh / 24; }
    function Y(a) { return y0 - a * k; }
    c.fillStyle = dark ? '#1c120d' : '#fffaf1'; c.fillRect(0, 0, W, H);
    c.fillStyle = dark ? 'rgba(20,20,60,.5)' : 'rgba(40,50,110,.12)'; c.fillRect(pad, y0, W - pad * 2, H - y0);
    c.strokeStyle = ink; c.globalAlpha = 0.5; c.beginPath(); c.moveTo(pad, y0); c.lineTo(W - pad, y0); c.stroke(); c.globalAlpha = 1;
    c.fillStyle = ink; c.font = '12px system-ui'; c.textAlign = 'center';
    for (var q = 0; q <= 24; q += 3) { c.fillText(q + ':00', X(q), H - 8); }
    c.textAlign = 'left'; c.fillText('0°', 4, y0 + 4); c.fillText('90°', 4, Y(90) + 12);
    c.strokeStyle = '#e9a53c'; c.lineWidth = 3; c.beginPath();
    for (q = 0; q <= 24.01; q += 0.1) { var yy = Y(Math.max(-60, alt(q))); q ? c.lineTo(X(q), yy) : c.moveTo(X(q), yy); }
    c.stroke();
    var a = alt(h); c.fillStyle = a > 0 ? '#e9a53c' : '#8a9bd6'; c.beginPath(); c.arc(X(h), Y(Math.max(-60, a)), 7, 0, TAU); c.fill();
    c.strokeStyle = ink; c.lineWidth = 1; c.beginPath(); c.arc(X(h), Y(Math.max(-60, a)), 7, 0, TAU); c.stroke();
    var cosH = -Math.tan(phi) * Math.tan(decl), len = cosH >= 1 ? 0 : cosH <= -1 ? 24 : 2 * Math.acos(cosH) * 180 / Math.PI / 15;
    $('hrOut').textContent = clock(h); $('dayOut').textContent = s('day0') + ' ' + d; $('latOut').textContent = lat + '°';
    $('sunOut').textContent = s('alt') + ': ' + Math.abs(a).toFixed(1) + '° ' + (a >= 0 ? s('up') : s('down')) + ' · ' + s('day') + ': ' + len.toFixed(1) + ' ' + s('h') + (len >= 24 ? ' (' + s('polar') + ')' : len <= 0 ? ' (' + s('night') + ')' : '');
    hero.set({ hour: h });
  }
  ['hr', 'day', 'lat'].forEach(function (id) { $(id).addEventListener('input', sun); });
  $('hr').value = Math.round(hour * 4) / 4; $('lat').value = M.latitude;
  sun(); addEventListener('resize', sun);

  /* ---- the walk */
  var origin = places.slice().sort(function (a, b) { return b.rank - a.rank; })[0], map;
  function dist(a, b) { var dx = (a.lng - b.lng) * 111320 * Math.cos(a.lat * Math.PI / 180), dy = (a.lat - b.lat) * 110574; return Math.hypot(dx, dy); }
  function walk() {
    var min = +$('min').value, r = min * M.speed, inside = places.filter(function (p) { return p !== origin && dist(p, origin) <= r; });
    $('minOut').textContent = min + ' ' + s('min');
    $('walkOut').textContent = s('from') + ' ' + tx(origin.name) + ', ' + min + ' ' + s('min') + ' ' + s('walk') + ' = ' + r + ' ' + s('m') + ': ' + (inside.length ? inside.map(function (p) { return tx(p.name) + ' (' + Math.round(dist(p, origin)) + ' ' + s('m') + ')'; }).join(', ') : s('none'));
    if (map) map.refresh();
  }
  map = CityMap($('walkmap'), {
    places: places, ground: ground, center: { lat: origin.lat, lng: origin.lng }, zoom: 15.6, floor: 11, lang: lang, label: 'Walk map',
    onSelect: function (p) { origin = p; walk(); },
    overlay: function (c, project) {
      var o = project(origin), r = +$('min').value * M.speed / map.metresPerPixel();
      c.fillStyle = 'rgba(233,165,60,.18)'; c.strokeStyle = '#e9a53c'; c.lineWidth = 2.5; c.beginPath(); c.arc(o[0], o[1], r, 0, TAU); c.fill(); c.stroke();
    }
  });
  walk();
  $('min').addEventListener('input', walk);

  /* ---- a picture per place */
  [].forEach.call(document.querySelectorAll('.cards canvas'), function (cvs) {
    CityDoodler.still(cvs, { scene: cvs.dataset.scene, seed: CityKit.hash(cvs.dataset.id), hour: 15, label: '' });
  });
  addEventListener('resize', function () { [].forEach.call(document.querySelectorAll('.cards canvas'), function (cvs) { CityDoodler.still(cvs, { scene: cvs.dataset.scene, seed: CityKit.hash(cvs.dataset.id), hour: 15, label: '' }); }); });
}).catch(function (e) { document.body.insertAdjacentHTML('afterbegin', '<p style="padding:16px;font:16px system-ui">Could not load the data files. Open this folder through a local server (python3 -m http.server). ' + e.message + '</p>'); });
})();
