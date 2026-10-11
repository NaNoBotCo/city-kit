#!/usr/bin/env python3
"""shot.py: serve this folder, open a page in headless Chrome, save a screenshot, print any console errors.

    python3 tools/shot.py doodles.html shots/doodles.png
    python3 tools/shot.py "index.html?pick=cafe" shots/home.png --size 1280x900
    python3 tools/shot.py index.html shots/phone.png --size 390x844

Chrome is found at the usual places for macOS, Linux and Windows; set CHROME to use another binary.
"""
import argparse
import functools
import http.server
import os
import re
import shutil
import subprocess
import sys
import threading

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
CANDIDATES = [
    "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome",
    "/Applications/Chromium.app/Contents/MacOS/Chromium",
    "google-chrome", "google-chrome-stable", "chromium", "chromium-browser", "chrome",
    r"C:\Program Files\Google\Chrome\Application\chrome.exe",
    r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
]


def chrome():
    if os.environ.get("CHROME"):
        return os.environ["CHROME"]
    for c in CANDIDATES:
        if os.path.isfile(c) or shutil.which(c):
            return c
    sys.exit("No Chrome found. Set CHROME to the browser's path.")


class Quiet(http.server.SimpleHTTPRequestHandler):
    def log_message(self, *a):
        pass


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("page")
    ap.add_argument("out")
    ap.add_argument("--size", default="1280x900")
    ap.add_argument("--light", action="store_true", help="render with the light colour scheme")
    ap.add_argument("--wait", type=int, default=5000, help="virtual milliseconds to let the page run")
    a = ap.parse_args()
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(Quiet, directory=ROOT))
    port = srv.server_address[1]
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    out = os.path.abspath(a.out)
    os.makedirs(os.path.dirname(out), exist_ok=True)
    cmd = [chrome(), "--headless=new", "--disable-gpu", "--hide-scrollbars", "--enable-logging=stderr", "--v=0",
           "--window-size=" + a.size.replace("x", ","), "--virtual-time-budget=%d" % a.wait] + (["--blink-settings=preferredColorScheme=1"] if a.light else []) + [ "--screenshot=" + out,
           "http://127.0.0.1:%d/%s" % (port, a.page)]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=45)
    errs = [l for l in r.stderr.splitlines() if re.search(r'CONSOLE|Uncaught', l) and not re.search(r'favicon', l)]
    for l in errs:
        print(l)
    print(out, "written" if os.path.exists(out) else "NOT written", "| console lines:", len(errs))
    srv.shutdown()


if __name__ == "__main__":
    main()
