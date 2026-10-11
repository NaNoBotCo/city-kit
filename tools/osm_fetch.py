#!/usr/bin/env python3
"""osm_fetch.py: fill data/places.json with named places from OpenStreetMap, for your own city.

    python3 tools/osm_fetch.py --bbox 45.760,4.830,45.770,4.845 --out data/places.json --limit 60

--bbox is south,west,north,east in degrees. Pick a box a few hundred metres to a few kilometres across: Overpass
(the OpenStreetMap query service) refuses very large boxes. The result has the same shape as the sample, with an
_meta block carrying the attribution OpenStreetMap's licence asks for. Show that line on your site.

Tags are mapped to the category ids in city.json (see CATEGORY below); a place whose tags match none is skipped.
Rank is higher for places that carry a website, opening hours, a wikidata or wikipedia tag. Standard library only.
"""
import argparse
import json
import sys
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
ENDPOINTS = ["https://overpass-api.de/api/interpreter", "https://overpass.kumi.systems/api/interpreter", "https://overpass.private.coffee/api/interpreter"]

# (OSM key, value or None for any) -> category id in city.json. First match wins.
CATEGORY = [
    (("amenity", "restaurant"), "food"), (("amenity", "cafe"), "food"), (("amenity", "bar"), "food"), (("amenity", "pub"), "food"),
    (("amenity", "fast_food"), "food"), (("amenity", "marketplace"), "market"), (("amenity", "place_of_worship"), "worship"),
    (("amenity", "clinic"), "health"), (("amenity", "doctors"), "health"), (("amenity", "hospital"), "health"), (("amenity", "pharmacy"), "health"),
    (("amenity", "school"), "school"), (("amenity", "university"), "school"), (("amenity", "college"), "school"), (("amenity", "library"), "school"),
    (("tourism", "hotel"), "hotel"), (("tourism", "guest_house"), "hotel"), (("tourism", "hostel"), "hotel"),
    (("leisure", "fitness_centre"), "sport"), (("leisure", "sports_centre"), "sport"), (("leisure", "pitch"), "sport"),
    (("amenity", "cinema"), "music"), (("amenity", "theatre"), "music"), (("amenity", "nightclub"), "music"), (("amenity", "arts_centre"), "music"),
    (("tourism", "museum"), "museum"), (("tourism", "gallery"), "museum"),
    (("leisure", "park"), "park"), (("leisure", "garden"), "park"),
    (("tourism", "attraction"), "sight"), (("tourism", "viewpoint"), "sight"), (("historic", None), "sight"),
    (("shop", None), "shop"), (("amenity", "bank"), "bank"), (("amenity", "post_office"), "bank"),
    (("amenity", "bus_station"), "transport"), (("railway", "station"), "transport"),
    (("amenity", "community_centre"), "community"),
]


def category(tags):
    for (k, v), cat in CATEGORY:
        if k in tags and (v is None or tags[k] == v):
            return cat
    return None


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--bbox", required=True, help="south,west,north,east")
    ap.add_argument("--out", default=str(ROOT / "data" / "places.json"))
    ap.add_argument("--limit", type=int, default=60)
    ap.add_argument("--city", default="")
    a = ap.parse_args()
    s, w, n, e = [float(x) for x in a.bbox.split(",")]
    city = json.loads((ROOT / "city.json").read_text(encoding="utf-8"))
    langs = city["languages"]
    ids = {c["id"] for c in city["categories"]}
    box = "(%f,%f,%f,%f)" % (s, w, n, e)
    q = "[out:json][timeout:60];(" + "".join('node["name"]["%s"]%s;' % (k, box) for k in ("amenity", "shop", "tourism", "leisure", "historic", "railway")) + ");out body %d;" % (a.limit * 8)
    data, last = None, None
    for ep in ENDPOINTS:   # the public servers are busy at times; try the next
        req = urllib.request.Request(ep, data=urllib.parse.urlencode({"data": q}).encode(), headers={"User-Agent": "city-kit/1.0 (starter kit; osm_fetch.py)"})
        try:
            with urllib.request.urlopen(req, timeout=90) as r:
                data = json.load(r)
            break
        except Exception as ex:
            last = ex
    if data is None:
        sys.exit("Overpass did not answer (%s). Try a smaller --bbox, or try again in a minute." % last)
    rows = []
    for el in data.get("elements", []):
        t = el.get("tags", {})
        cat = category(t)
        if not cat or cat not in ids:
            continue
        score = sum(1 for k in ("website", "opening_hours", "wikidata", "wikipedia", "phone") if k in t) * 15 + (10 if "name:en" in t else 0)
        name = {}
        for lg in langs:
            name[lg] = t.get("name:" + lg) or t["name"]
        addr = " ".join(x for x in (t.get("addr:housenumber"), t.get("addr:street")) if x)
        rows.append({"id": "osm-node-%d" % el["id"], "name": name, "category": cat, "lat": round(el["lat"], 6), "lng": round(el["lon"], 6),
                     "rank": 40 + min(score, 55), "address": addr, "hours": t.get("opening_hours", ""), "blurb": {lg: "" for lg in langs},
                     "source": "OpenStreetMap node %d" % el["id"]})
    rows.sort(key=lambda r: -r["rank"])
    rows = rows[: a.limit]
    out = {"_meta": {"city": a.city or "your city", "note": "Fetched by tools/osm_fetch.py. Fill in the blurbs yourself.",
                     "licence": "Open Database Licence 1.0 (ODbL), share-alike", "attribution": "© OpenStreetMap contributors, https://www.openstreetmap.org/copyright"},
           "places": rows}
    Path(a.out).write_text(json.dumps(out, indent=1, ensure_ascii=False) + "\n", encoding="utf-8")
    print("%d places written to %s" % (len(rows), a.out))
    print("Set city.json centre to about %.4f, %.4f and zoom to 15; show the attribution line on your site." % ((s + n) / 2, (w + e) / 2))


if __name__ == "__main__":
    main()
