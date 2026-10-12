#!/usr/bin/env python3
"""build.py: write minisite/index.html (English) and minisite/<code>/index.html (every other language) from
minisite.json, ../city.json and ../data/places.json, plus llms.txt, sitemap.xml and robots.txt.

    python3 minisite/build.py

All the page's words live in minisite.json, one key per language. This file lays them out. Standard library only."""
import html
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)


def load(*p):
    with open(os.path.join(ROOT, *p), encoding="utf-8") as f:
        return json.load(f)


CITY = load("city.json")
MINI = load("minisite", "minisite.json")
PLACES = load("data", "places.json")["places"]
LANGS = CITY["languages"]
SITE = MINI["site_url"].rstrip("/") + "/"


def e(x):
    return html.escape("" if x is None else str(x))


def tr(v, lang):
    if isinstance(v, str):
        return v
    return v.get(lang) or v.get(LANGS[0]) or ""


def page(lang):
    up = "../" if lang != LANGS[0] else ""
    root = up + "../"
    t = lambda v: tr(v, lang)
    title = t(MINI["title"])
    nav = "".join('<a href="#%s">%s</a>' % (s["id"], e(t(s["kick"]))) for s in MINI["sections"])
    langsw = " ".join('<a href="%s%s" hreflang="%s" lang="%s"%s>%s</a>' % (
        "" if lang == LANGS[0] else "../", "" if k == LANGS[0] else k + "/", k, k, ' aria-current="page"' if k == lang else "", k.upper())
        for k in LANGS)
    alts = "".join('<link rel="alternate" hreflang="%s" href="%s%s">' % (k, SITE, "" if k == LANGS[0] else k + "/") for k in LANGS)
    here = SITE + ("" if lang == LANGS[0] else lang + "/")
    slab = "".join("<div><b>%s</b><span>%s</span></div>" % (e(s["n"]), e(t(s["t"]))) for s in MINI["stats"])
    secs = []
    for s in MINI["sections"]:
        out = ['<section class="sec" id="%s">' % s["id"], '<p class="kick">%s</p>' % e(t(s["kick"])), "<h2>%s</h2>" % e(t(s["title"]))]
        for para in s.get("body", []):
            out.append('<p class="lede">%s</p>' % e(t(para)))
        if s.get("toy") == "light":
            out.append('<div class="toy"><canvas id="sun" height="260" aria-label="Sun height through the day"></canvas>'
                       '<div class="ctl"><label>%s <input id="hr" type="range" min="0" max="24" step="0.25" value="14"> <output id="hrOut"></output></label>'
                       '<label>%s <input id="day" type="range" min="1" max="365" value="172"> <output id="dayOut"></output></label>'
                       '<label>%s <input id="lat" type="range" min="-66" max="66" value="%g"> <output id="latOut"></output></label></div>'
                       '<p class="out" id="sunOut"></p><p class="formula">%s</p></div>'
                       % (e(t({"en": "Hour", "es": "Hora"})), e(t({"en": "Day of year", "es": "Día del año"})), e(t({"en": "Latitude", "es": "Latitud"})), MINI["latitude"], e(s["formula"])))
        if s.get("toy") == "walk":
            out.append('<div class="toy"><div id="walkmap"></div>'
                       '<div class="ctl"><label>%s <input id="min" type="range" min="1" max="30" value="5"> <output id="minOut"></output></label></div>'
                       '<p class="out" id="walkOut"></p><p class="formula">%s</p></div>'
                       % (e(t({"en": "Minutes", "es": "Minutos"})), e(s["formula"])))
        if s.get("cards"):
            cats = dict((c["id"], c) for c in CITY["categories"])
            cards = []
            for p in PLACES:
                other = [tr(p["name"], k) for k in LANGS if k != lang and tr(p["name"], k) != t(p["name"])]
                cards.append('<article><canvas data-scene="%s" data-id="%s"></canvas><div class="b"><h3>%s</h3><p class="alt">%s</p><p>%s</p></div></article>'
                             % (e(cats.get(p["category"], {}).get("scene", "street")), e(p["id"]), e(t(p["name"])), e(" · ".join(other)), e(t(p["blurb"]))))
            out.append('<div class="cards">%s</div>' % "".join(cards))
        if s.get("sources"):
            out.append('<ul class="sources">%s</ul>' % "".join(
                '<li>%s</li>' % ('<a href="%s">%s</a>' % (e(x["url"]), e(x["name"])) if x["url"] else e(x["name"])) for x in MINI["sources"]))
        out.append("</section>")
        secs.append("".join(out))
    card = ""
    if MINI.get("card_base"):
        img = MINI["card_base"].rstrip("/") + "/" + ("" if lang == LANGS[0] else lang + "/") + "card.jpg"
        card = ('<meta property="og:site_name" content="%s"><meta property="og:image" content="%s">'
                '<meta property="og:image:width" content="1200"><meta property="og:image:height" content="630">'
                '<meta property="og:image:alt" content="%s"><meta name="twitter:card" content="summary_large_image">'
                '<meta name="twitter:image" content="%s">' % (e(t(CITY["name"])), e(img), e(t(MINI["card_alt"])), e(img)))
    boot = json.dumps({"lang": lang, "root": root, "latitude": MINI["latitude"], "speed": MINI["walk_speed_m_per_min"]})
    return """<!doctype html>
<html lang="%(lang)s"><head>
<meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>%(title)s</title>
<meta name="description" content="%(lede)s">
<meta name="theme-color" content="#1a100b">
<link rel="canonical" href="%(here)s">%(alts)s
<meta property="og:type" content="website"><meta property="og:title" content="%(title)s"><meta property="og:description" content="%(lede)s"><meta property="og:url" content="%(here)s">%(card)s
<link rel="icon" href="%(root)sassets/pins/pin-sight.svg" type="image/svg+xml">
<link rel="alternate" type="text/plain" href="%(site)sllms.txt" title="llms.txt">
<link rel="stylesheet" href="%(up)sminisite.css">
<script>if(/[?&]card\\b/.test(location.search))document.documentElement.classList.add("card-mode")</script>
</head><body>
<script>if(document.documentElement.classList.contains("card-mode"))document.body.classList.add("card")</script>
<header class="top"><div class="in">
<a class="brand" href="%(root)s">%(city)s</a>
<nav>%(nav)s</nav><span class="langsw">%(langsw)s</span>
</div></header>
<div class="hero"><canvas id="hero" role="img" aria-label="%(title)s"></canvas>
<div class="over"><div class="in"><p class="kicker">%(kicker)s</p><h1>%(title)s</h1><p class="sub">%(lede)s</p></div></div></div>
<main>
<div class="slab">%(slab)s</div>
%(secs)s
</main>
<footer class="bot">%(city)s</footer>
<script>window.MINI=%(boot)s</script>
<script src="%(root)sjs/doodler-core.js"></script><script src="%(root)sjs/doodler-land.js"></script><script src="%(root)sjs/doodler-scenes.js"></script><script src="%(root)sjs/doodler.js"></script>
<script src="%(root)sjs/pins-table.js"></script><script src="%(root)sjs/pins.js"></script><script src="%(root)sjs/citymap.js"></script>
<script src="%(up)sminisite.js"></script>
</body></html>
""" % dict(lang=lang, title=e(title), lede=e(t(MINI["lede"])), here=e(here), card=card, alts=alts, root=root, up=up, site=SITE, city=e(t(CITY["name"])), nav=nav,
           langsw=langsw, kicker=e(t(MINI["kicker"])), slab=slab, secs="\n".join(secs), boot=boot)


def main():
    for lang in LANGS:
        d = HERE if lang == LANGS[0] else os.path.join(HERE, lang)
        os.makedirs(d, exist_ok=True)
        with open(os.path.join(d, "index.html"), "w", encoding="utf-8") as f:
            f.write(page(lang))
        print("wrote", os.path.relpath(os.path.join(d, "index.html"), ROOT))
    with open(os.path.join(HERE, "llms.txt"), "w", encoding="utf-8") as f:
        f.write("# %s\n\n> %s\n\n%s\n" % (tr(MINI["title"], LANGS[0]), tr(MINI["lede"], LANGS[0]),
                "\n".join("- [%s](%s%s)" % (k, SITE, "" if k == LANGS[0] else k + "/") for k in LANGS)))
    with open(os.path.join(HERE, "sitemap.xml"), "w", encoding="utf-8") as f:
        f.write('<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n%s</urlset>\n'
                % "".join("<url><loc>%s%s</loc></url>\n" % (SITE, "" if k == LANGS[0] else k + "/") for k in LANGS))
    with open(os.path.join(HERE, "robots.txt"), "w", encoding="utf-8") as f:
        f.write("User-agent: *\nAllow: /\nSitemap: %ssitemap.xml\n" % SITE)


if __name__ == "__main__":
    main()
