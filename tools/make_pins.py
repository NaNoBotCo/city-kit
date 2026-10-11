#!/usr/bin/env python3
"""make_pins.py: turn city.json's categories and assets/icons.svg into map pins.

    python3 tools/make_pins.py

Reads   city.json            categories: id, glyph (an id in assets/icons.svg), colour; otherPin
        assets/icons.svg     the glyphs, 24 x 24 grid, stroke only
Writes  js/pins-table.js     what js/pins.js draws from (glyph outlines as path data)
        assets/pins/<id>.svg a standalone pin per category, 48 px, for any other tool
Prints  each colour's contrast against white (the glyph and rim are white); a colour under 4.5:1 is flagged.

A pin is a disc in the category's colour, a white rim, and the glyph stroked in white.
Adapted from mappins_layer.py in the Mot Dang repo. Python 3.8 or newer, standard library only.
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent


def num(attrs, key, default=0.0):
    m = re.search(r'\b' + key + r'="([-\d.]+)"', attrs)
    return float(m.group(1)) if m else default


def to_path(tag, attrs):
    """One sprite primitive as SVG path data."""
    if tag == "path":
        return re.search(r'\bd="([^"]+)"', attrs).group(1)
    if tag == "rect":
        x, y, w, h = num(attrs, "x"), num(attrs, "y"), num(attrs, "width"), num(attrs, "height")
        r = min(num(attrs, "rx"), w / 2, h / 2)
        if not r:
            return "M%g %gh%gv%gh%gZ" % (x, y, w, h, -w)
        return ("M%g %gh%ga%g %g 0 0 1 %g %gv%ga%g %g 0 0 1 %g %gh%ga%g %g 0 0 1 %g %gv%ga%g %g 0 0 1 %g %gZ"
                % (x + r, y, w - 2 * r, r, r, r, r, h - 2 * r, r, r, -r, r, -(w - 2 * r), r, r, -r, -r, -(h - 2 * r), r, r, r, -r))
    if tag in ("circle", "ellipse"):
        cx, cy = num(attrs, "cx"), num(attrs, "cy")
        rx = num(attrs, "r") if tag == "circle" else num(attrs, "rx")
        ry = num(attrs, "r") if tag == "circle" else num(attrs, "ry")
        return "M%g %ga%g %g 0 1 0 %g 0a%g %g 0 1 0 %g 0Z" % (cx - rx, cy, rx, ry, 2 * rx, rx, ry, -2 * rx)
    raise ValueError(tag)


def glyph(gid, sprite):
    m = re.search(r'<g id="' + re.escape(gid) + r'">(.*?)</g>', sprite, re.S)
    if not m:
        sys.exit("glyph %s is not in assets/icons.svg" % gid)
    return [to_path(t, a) for t, a in re.findall(r'<(path|rect|circle|ellipse)\b([^>]*?)/?>', m.group(1))]


def luminance(hexcol):
    n = int(hexcol.lstrip("#"), 16)
    out = []
    for v in ((n >> 16) & 255, (n >> 8) & 255, n & 255):
        v /= 255.0
        out.append(v / 12.92 if v <= 0.03928 else ((v + 0.055) / 1.055) ** 2.4)
    return 0.2126 * out[0] + 0.7152 * out[1] + 0.0722 * out[2]


def contrast_on_white(hexcol):
    return 1.05 / (luminance(hexcol) + 0.05)


def pin_svg(color, paths, d=48):
    h = d / 2.0
    g = d * 0.6
    s = g / 24.0
    body = "".join('<path d="%s"/>' % p for p in paths)
    return ('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d" viewBox="0 0 %d %d">'
            '<circle cx="%g" cy="%g" r="%g" fill="rgba(23,17,12,.45)"/>'
            '<circle cx="%g" cy="%g" r="%g" fill="#fff"/>'
            '<circle cx="%g" cy="%g" r="%g" fill="%s"/>'
            '<g transform="translate(%g %g) scale(%g)" fill="none" stroke="#fff" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round">%s</g></svg>\n'
            % (d, d, d, d, h, h, h - 0.5, h, h, h - 1, h, h, h - 2.6, color, h - g / 2, h - g / 2, s, body))


def main():
    city = json.loads((ROOT / "city.json").read_text(encoding="utf-8"))
    sprite = (ROOT / "assets" / "icons.svg").read_text(encoding="utf-8")
    kinds = {}
    rows = []
    for cat in city["categories"]:
        kinds[cat["id"]] = [cat["color"], glyph(cat["glyph"], sprite)]
        rows.append((cat["id"], cat["glyph"], cat["color"]))
    o = city.get("otherPin", {"glyph": "i-pin", "color": "#5B4636"})
    kinds["_"] = [o["color"], glyph(o["glyph"], sprite)]
    rows.append(("_", o["glyph"], o["color"]))
    js = ("/* Written by tools/make_pins.py from city.json and assets/icons.svg. Edit those, then run it again. */\n"
          "window.CITY_PINS = " + json.dumps(kinds, separators=(",", ":")) + ";\n")
    (ROOT / "js" / "pins-table.js").write_text(js, encoding="utf-8")
    out = ROOT / "assets" / "pins"
    out.mkdir(parents=True, exist_ok=True)
    for k, (col, paths) in kinds.items():
        (out / ("pin-%s.svg" % ("other" if k == "_" else k))).write_text(pin_svg(col, paths), encoding="utf-8")
    bad = 0
    for k, g, col in rows:
        r = contrast_on_white(col)
        flag = "" if r >= 4.5 else "   BELOW 4.5:1"
        bad += r < 4.5
        print("%-12s %-12s %s  %.1f:1%s" % (k, g, col, r, flag))
    print("%d pins written to js/pins-table.js and assets/pins/" % len(rows))
    sys.exit(1 if bad else 0)


if __name__ == "__main__":
    main()
