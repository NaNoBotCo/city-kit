/* site.js: wires the sample page together. Reads city.json and data/places.json, draws the hero with the doodler,
   the map with the pins, and a card per place. To change the page, change this file, index.html and css/site.css. */
(function () {
'use strict';
var T = {
  en: { navMap: 'Map', navPlaces: 'Places', navMini: 'Minisite', navDoodles: 'Doodles', hour: 'Hour', now: 'Now', detail: 'Detail', less: 'Less', more: 'More', most: 'Most', places: 'Places',
        pick: 'Tap a pin or a card.', address: 'Address', hours: 'Hours', foot: 'Sample data is made up (CC0). Map ground is invented. Doodles and pins are drawn in code by this kit.' },
  es: { navMap: 'Mapa', navPlaces: 'Lugares', navMini: 'Minisitio', navDoodles: 'Dibujos', hour: 'Hora', now: 'Ahora', detail: 'Detalle', less: 'Menos', more: 'Más', most: 'Máximo', places: 'Lugares',
        pick: 'Toque un marcador o una tarjeta.', address: 'Dirección', hours: 'Horario', foot: 'Los datos de muestra son inventados (CC0). El terreno del mapa es inventado. Los dibujos y marcadores los dibuja este kit con código.' }
};
var q = new URLSearchParams(location.search), lang = q.get('lang') || localStorage.getItem('city-lang') || 'en';
function $(id) { return document.getElementById(id); }
function J(u) { return fetch(u).then(function (r) { if (!r.ok) throw new Error(u); return r.json(); }); }
function tx(v) { return typeof v === 'string' ? v : (v && (v[lang] || v.en)) || ''; }
function ui(k) { return (T[lang] || T.en)[k] || T.en[k] || k; }

Promise.all([J('city.json'), J('data/places.json'), J('data/ground.json').catch(function () { return null; })]).then(function (all) {
  var city = all[0], places = all[1].places, ground = all[2], cats = {}, sel = null, hourNow = true, hero, map;
  city.categories.forEach(function (c) { cats[c.id] = c; });
  CityDoodler.configure(city);
  var hour = q.has('hour') ? +q.get('hour') : (function () { var d = new Date(); return d.getHours() + (d.getMinutes() >= 30 ? 0.5 : 0); })();
  if (q.has('hour')) hourNow = false;

  function sceneOf(p) { return CityDoodler.sceneFor(p.category); }
  function setHero() {
    var p = sel, label = p ? tx(p.name) : tx(city.name);
    var o = { scene: p ? sceneOf(p) : 'street', seed: CityKit.hash(p ? p.id : 'home'), hour: hour, label: label };
    if (!hero) hero = CityDoodler.mount($('hero'), o); else hero.set(o);
    $('h1').textContent = label; $('sub').textContent = p ? tx(p.blurb) : tx(city.tagline);
  }
  function langs() {
    $('langsw').innerHTML = '';
    city.languages.forEach(function (l) {
      var a = document.createElement('a'); a.href = '?lang=' + l; a.textContent = l.toUpperCase(); if (l === lang) a.setAttribute('aria-current', 'page');
      a.onclick = function (e) { e.preventDefault(); lang = l; try { localStorage.setItem('city-lang', l); } catch (x) {} render(); };
      $('langsw').appendChild(a);
    });
  }
  function panel() {
    var p = sel, el = $('panel');
    if (!p) { el.innerHTML = '<p class="meta"></p>'; el.firstChild.textContent = ui('pick'); return; }
    var c = cats[p.category] || {}, img = CityPins.dataUrl(CityPins.kindOf(p.category), 28, 2);
    el.innerHTML = '<p class="cat"></p><h3></h3><p class="b"></p><p class="meta a"></p><p class="meta h"></p>';
    el.querySelector('.cat').textContent = tx(c.label); el.querySelector('h3').textContent = tx(p.name); el.querySelector('.b').textContent = tx(p.blurb);
    el.querySelector('.a').textContent = ui('address') + ': ' + p.address; el.querySelector('.h').textContent = ui('hours') + ': ' + p.hours;
  }
  function cards() {
    var box = $('cards'); box.innerHTML = '';
    places.forEach(function (p) {
      var b = document.createElement('button'), c = document.createElement('canvas'), d = document.createElement('div'), cat = cats[p.category] || {};
      b.type = 'button'; b.className = 'card'; d.className = 'b';
      var img = new Image(); img.src = CityPins.dataUrl(CityPins.kindOf(p.category), 20, 2); img.alt = '';
      d.innerHTML = '<b></b><span class="k"><span></span></span>'; d.querySelector('b').textContent = tx(p.name);
      var k = d.querySelector('.k'); k.insertBefore(img, k.firstChild); k.querySelector('span').textContent = tx(cat.label);
      b.appendChild(c); b.appendChild(d); box.appendChild(b); b._canvas = c; b._p = p;
      b.onclick = function () { pick(p, true); };
    });
    thumbs();
  }
  var tq = 0;
  function thumbs() {
    if (tq) return;
    tq = requestAnimationFrame(function () {
      tq = 0;
      [].forEach.call($('cards').children, function (b) { CityDoodler.still(b._canvas, { scene: sceneOf(b._p), seed: CityKit.hash(b._p.id), hour: hour, label: '' }); });
    });
  }
  function pick(p, fly) {
    sel = p; setHero(); panel(); map.select(p && p.id);
    if (p && fly) { var v = map.getView(); map.setView(p.lat, p.lng, Math.max(v.zoom, 16)); }
  }
  function detail() {
    [].forEach.call(document.querySelectorAll('.detail button'), function (b) {
      b.setAttribute('aria-pressed', String(b.dataset.d === CityPins.pref()));
      b.onclick = function () { CityPins.setPref(b.dataset.d); detail(); map.refresh(); };
    });
  }
  function render() {
    document.documentElement.lang = lang;
    [].forEach.call(document.querySelectorAll('[data-t]'), function (n) { n.textContent = ui(n.dataset.t); });
    $('brand').textContent = tx(city.name); document.title = tx(city.name) + ' · city kit sample'; $('foot').textContent = ui('foot');
    langs(); if (map) map.setLang(lang);
    $('hourOut').textContent = Math.floor(hour) + ':' + (hour % 1 ? '30' : '00');
    setHero(); panel(); cards();
  }
  map = CityMap($('citymap'), { places: places, ground: ground, center: city.centre, zoom: q.has('z') ? +q.get('z') : city.zoom, floor: city.pinFloor, lang: lang,
    label: 'Map of ' + tx(city.name), onSelect: function (p) { pick(p, false); } });
  $('hour').value = hour;
  $('hour').oninput = function () { hour = +this.value; hourNow = false; $('hourOut').textContent = Math.floor(hour) + ':' + (hour % 1 ? '30' : '00'); setHero(); thumbs(); };
  $('now').onclick = function () { var d = new Date(); hour = d.getHours() + (d.getMinutes() >= 30 ? 0.5 : 0); $('hour').value = hour; $('hour').oninput.call($('hour')); };
  $('hour').value = hour;
  detail(); render();
  if (q.has('place')) { var p = places.filter(function (x) { return x.id === q.get('place'); })[0]; if (p) pick(p, true); }
  window.addEventListener('resize', thumbs);
  window.city = { city: city, places: places, map: map, pick: pick };
}).catch(function (e) { document.body.insertAdjacentHTML('afterbegin', '<p style="padding:16px;font:16px system-ui">Could not load the data files. Open this folder through a local server (python3 -m http.server), not by double-clicking the file. ' + e.message + '</p>'); });
})();
