# City kit: what is where

A static site: HTML, CSS and plain JavaScript files, no build step and no install. Python 3 is used only to serve the folder and to run the small tools in tools/.

Run it: `python3 -m http.server 8000` in this folder, then open http://localhost:8000/. Check it: `python3 tools/check.py` (needs Chrome; prints PASS or FAIL). Screenshot a page: `python3 tools/shot.py "index.html?hour=21" shots/night.png`.

## The one file to change first

`city.json` holds the city: name and tagline per language, the map centre and start zoom, the landscape behind every doodle (hills, water, sights), and the categories (id, label, pin glyph, pin colour, doodle scene). The pages read it when they load.

## Parts

- Doodler: `js/doodler-core.js` (paper, people, props), `js/doodler-land.js` (sky, hills, water, sights, facades), `js/doodler-scenes.js` (market, band, run, yoga, cafe, street, calm, learn), `js/doodler.js` (draw, mount, still, addScene). `doodles.html` shows every scene with an hour slider.
- Pins: `assets/icons.svg` (glyphs on a 24 grid) and the categories in `city.json` go through `python3 tools/make_pins.py`, which writes `js/pins-table.js` and `assets/pins/*.svg`. `js/pins.js` draws a pin to a canvas and picks which pins to show in a view.
- Map: `js/citymap.js` is a canvas map (drag, wheel, pinch, tap). It takes `data/ground.json` for water, parks, river and roads.
- Sample site: `index.html`, `css/site.css`, `js/site.js`.
- Minisite template: `minisite/minisite.json` holds the words and numbers, `python3 minisite/build.py` writes `minisite/index.html` and one folder per extra language, `minisite/minisite.css` and `minisite/minisite.js` hold the look and the two toys.
- Data: `data/places.json` (ten made-up places), `data/ground.json`. `python3 tools/osm_fetch.py --bbox S,W,N,E` replaces the places with OpenStreetMap ones.

## Conventions the code already follows

- A scene is `function (S)`; motion is a function of `S.t` (milliseconds), colour and crowd come from `S.seed`, so one seed and one hour draw one picture.
- Every user-facing text is `{ en: ..., es: ... }`, one key per language in `city.json`.
- Names for places, categories and pins are plain ids (`food`, `worship`), the same string in places.json, city.json and the pin table.
