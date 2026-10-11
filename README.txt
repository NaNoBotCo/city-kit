CITY KIT

A starter for a city site like motdang.net: paper-cut doodles drawn in code, a map with round icon pins, and a one-page minisite template. It runs in a browser. There is nothing to install and no build step. The sample city, Marlow Bay, is made up, so you can see everything working before you change a word.

WHAT IS IN IT

The doodler: a canvas drawing of a scene (market, band, fun run, yoga class, cafe, street, quiet evening, classroom) in front of your city's hills, water and sights, lit for the hour of the day. The same seed draws the same picture, so a place gets its own. Open doodles.html to see all eight with an hour slider.

The pins: a disc in the category's colour, a white rim, a white glyph. tools/make_pins.py builds them from city.json and assets/icons.svg and checks every colour against white for contrast. js/pins.js shows more pins with every step you zoom in and skips any that would touch another.

The map: js/citymap.js, a small map on a canvas. Drag, scroll or pinch, tap a pin. It uses the same projection as Leaflet and MapLibre, so latitude and longitude land where those would put them.

The minisite: minisite/ is a page in the style of motdang.net/sites/warp-and-weft and /sites/golden-gate. A hero drawn in code, a slab of numbers, then sections that each carry one toy: here a sun-height calculator and a walking-distance circle on the map. Words live in minisite/minisite.json, one entry per language.

The sample site: index.html puts the doodle, the map and a card per place on one page.

OPEN IT

Python 3 hands the files to your browser (a local server). In this folder run: python3 -m http.server 8000 and open http://localhost:8000/ . Double-clicking index.html does not work, because the page loads its data from the JSON files beside it.

In Claude Code: install it, open a terminal in this folder, type claude. In Cursor: File, Open Folder, choose this folder, open the chat panel. AGENTS.md says what is where, and CLAUDE.md points Claude Code at it; ask either tool to read it first.

WHAT TO ASK FOR FIRST

1. "Make this a site for [your city]. Change city.json: the name, the tagline, the map centre, the languages. Change the sights in the landscape to match my city's skyline (kinds available: tower, dome, spire, bridge, lighthouse, blocks, hall)."

2. "Replace the ten sample places with ones from OpenStreetMap: run tools/osm_fetch.py for this box [south,west,north,east] and write a one-line blurb for each." The data it fetches comes from OpenStreetMap and carries its attribution line in data/places.json; show that line on your site.

3. "Add a doodler scene for [something your city is known for] in js/doodler-scenes.js, register it with CityDoodler.addScene, and give it to the category [name] in city.json."

4. "Make a minisite about [a topic] from minisite/minisite.json, in these languages: [list]." Then run python3 minisite/build.py.

5. "Change the pin colours and glyphs for my categories." Then run python3 tools/make_pins.py.

After any change, python3 tools/check.py draws every scene and pin in headless Chrome and prints PASS or FAIL. python3 tools/shot.py "index.html?hour=21" shots/night.png saves a screenshot. The page also takes ?hour=0 to 23.5, ?z=15 to 19, ?place=<id> and ?lang=es.

PUTTING IT ON THE WEB

The site is static files, so any static host serves it: GitHub Pages, Cloudflare Pages, Netlify, or a folder on your own server. Before you publish the minisite, set site_url in minisite/minisite.json to where it will live; build.py writes it into the canonical links, sitemap.xml and llms.txt.

FILES

city.json  the city: names, centre, landscape, categories
index.html, css/site.css, js/site.js  the sample site
doodles.html  every scene, with an hour slider
js/doodler-core.js, doodler-land.js, doodler-scenes.js, doodler.js  the doodler
js/pins.js, pins-table.js, citymap.js  pins and map; pins-table.js is written by tools/make_pins.py
assets/icons.svg, assets/pins/  glyphs and one pin SVG per category
data/places.json, data/ground.json  ten places, and invented water, park, river and roads
minisite/  minisite.json, build.py, minisite.css, minisite.js, and the built pages
tools/  make_pins.py, osm_fetch.py, check.py, shot.py, selftest.html
shots/  screenshots of the sample pages

LICENCE

LICENSE is MIT. NOTICE.txt says where each part came from and which data carries its own terms.
