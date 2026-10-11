#!/usr/bin/env python3
"""check.py: run tools/selftest.html in headless Chrome and print the result.

    python3 tools/check.py

Draws every doodle scene by day and by night, every map pin, and a small map with a tap on a pin. Prints PASS or FAIL
and one line per check. Needs Chrome (set CHROME to point at another browser); see tools/shot.py."""
import functools
import html
import http.server
import os
import re
import subprocess
import sys
import threading

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import shot  # noqa: E402


def main():
    srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), functools.partial(shot.Quiet, directory=shot.ROOT))
    threading.Thread(target=srv.serve_forever, daemon=True).start()
    cmd = [shot.chrome(), "--headless=new", "--disable-gpu", "--virtual-time-budget=8000", "--dump-dom",
           "http://127.0.0.1:%d/tools/selftest.html" % srv.server_address[1]]
    r = subprocess.run(cmd, capture_output=True, text=True, timeout=60)
    m = re.search(r'<pre id="out">(.*?)</pre>', r.stdout, re.S)
    text = html.unescape(m.group(1)) if m else r.stdout[-800:]
    print(text.rstrip())
    srv.shutdown()
    sys.exit(0 if "all passed" in text else 1)


if __name__ == "__main__":
    main()
