#!/usr/bin/env python3
"""
Interactive 16:9 cropping tool (local web app).

Serves a browser editor that iterates every image in a source folder and lets
you pan / zoom / rotate each one inside a fixed 16:9 frame, then saves the
rendered crop (1920x1080 JPEG) into an output folder.

Why a server (not just a static page): the browser cannot write to an arbitrary
folder on disk. This tiny stdlib HTTP server exposes a /api/save endpoint so the
"Save" button writes straight into the output directory. It also normalizes the
source images (applies EXIF orientation, downscales) before sending them to the
browser so the preview matches what gets saved.

Usage:
    python3 tools/crop_server.py
    python3 tools/crop_server.py --src "zoom-out_collection" --out "zoom-out_collection_cropped" --port 8000

Then open the printed URL in your browser.
"""
import argparse
import io
import json
import os
import re
import base64
import urllib.parse
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from PIL import Image, ImageOps

HERE = os.path.dirname(os.path.abspath(__file__))
EDITOR_HTML = os.path.join(HERE, "crop_editor.html")

IMG_EXT = (".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff")
SERVE_MAX = 1920          # longest side of the normalized image sent to browser
SERVE_QUALITY = 90

# globals populated in main()
SRC_DIR = ""
OUT_DIR = ""
_norm_cache = {}          # name -> normalized JPEG bytes


def list_images():
    names = [f for f in os.listdir(SRC_DIR)
             if f.lower().endswith(IMG_EXT) and not f.startswith(".")]
    return sorted(names, key=str.lower)


def out_name(name):
    """Output filename for a given source name (always .jpg)."""
    stem = os.path.splitext(name)[0]
    return stem + ".jpg"


def is_saved(name):
    return os.path.exists(os.path.join(OUT_DIR, out_name(name)))


def normalized_bytes(name):
    """EXIF-transpose + downscale a source image; cache the JPEG bytes."""
    if name in _norm_cache:
        return _norm_cache[name]
    path = os.path.join(SRC_DIR, name)
    im = Image.open(path)
    im = ImageOps.exif_transpose(im)          # bake in orientation
    im = im.convert("RGB")
    w, h = im.size
    scale = min(1.0, SERVE_MAX / max(w, h))
    if scale < 1.0:
        im = im.resize((round(w * scale), round(h * scale)), Image.LANCZOS)
    buf = io.BytesIO()
    im.save(buf, "JPEG", quality=SERVE_QUALITY)
    data = buf.getvalue()
    _norm_cache[name] = data
    return data


class Handler(BaseHTTPRequestHandler):
    def log_message(self, *a):            # quieter console
        pass

    def _send(self, code, body, ctype="application/octet-stream", extra=None):
        if isinstance(body, str):
            body = body.encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for k, v in (extra or {}).items():
            self.send_header(k, v)
        self.end_headers()
        if self.command != "HEAD":
            self.wfile.write(body)

    def _json(self, obj, code=200):
        self._send(code, json.dumps(obj), "application/json")

    # ---- routes ---------------------------------------------------------
    def do_GET(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)

        if path in ("/", "/index.html", "/editor.html"):
            try:
                with open(EDITOR_HTML, "rb") as f:
                    self._send(200, f.read(), "text/html; charset=utf-8")
            except FileNotFoundError:
                self._send(500, f"Missing {EDITOR_HTML}", "text/plain")
            return

        if path == "/api/list":
            imgs = [{"name": n, "saved": is_saved(n)} for n in list_images()]
            self._json({"images": imgs,
                        "srcDir": os.path.abspath(SRC_DIR),
                        "outDir": os.path.abspath(OUT_DIR)})
            return

        if path.startswith("/src/"):
            name = path[len("/src/"):]
            if name not in list_images():
                self._send(404, "not found", "text/plain")
                return
            try:
                self._send(200, normalized_bytes(name), "image/jpeg")
            except Exception as e:
                self._send(500, f"error: {e}", "text/plain")
            return

        self._send(404, "not found", "text/plain")

    def do_HEAD(self):
        self.do_GET()

    def do_POST(self):
        parsed = urllib.parse.urlparse(self.path)
        path = urllib.parse.unquote(parsed.path)

        if path == "/api/save":
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length)
            try:
                payload = json.loads(raw)
                name = payload["name"]
                data_url = payload["dataURL"]
            except Exception as e:
                self._json({"ok": False, "error": f"bad payload: {e}"}, 400)
                return
            m = re.match(r"data:image/\w+;base64,(.*)$", data_url, re.S)
            if not m:
                self._json({"ok": False, "error": "bad dataURL"}, 400)
                return
            img_bytes = base64.b64decode(m.group(1))
            os.makedirs(OUT_DIR, exist_ok=True)
            dst = os.path.join(OUT_DIR, out_name(name))
            # decode + re-encode through PIL to guarantee a clean baseline JPEG
            Image.open(io.BytesIO(img_bytes)).convert("RGB").save(
                dst, "JPEG", quality=95)
            self._json({"ok": True, "saved": out_name(name)})
            return

        if path == "/api/delete":
            length = int(self.headers.get("Content-Length", 0))
            raw = self.rfile.read(length)
            try:
                name = json.loads(raw)["name"]
            except Exception as e:
                self._json({"ok": False, "error": f"bad payload: {e}"}, 400)
                return
            dst = os.path.join(OUT_DIR, out_name(name))
            existed = os.path.exists(dst)
            if existed:
                os.remove(dst)
            self._json({"ok": True, "removed": existed})
            return

        self._send(404, "not found", "text/plain")


def main():
    global SRC_DIR, OUT_DIR
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="zoom-out_collection",
                    help="source image folder")
    ap.add_argument("--out", default="zoom-out_collection_cropped",
                    help="output folder for cropped 16:9 images")
    ap.add_argument("--port", type=int, default=8000)
    ap.add_argument("--host", default="0.0.0.0")
    args = ap.parse_args()

    SRC_DIR = args.src
    OUT_DIR = args.out
    if not os.path.isdir(SRC_DIR):
        raise SystemExit(f"source folder not found: {SRC_DIR}")
    os.makedirs(OUT_DIR, exist_ok=True)

    n = len(list_images())
    srv = ThreadingHTTPServer((args.host, args.port), Handler)
    print(f"Source : {os.path.abspath(SRC_DIR)}  ({n} images)")
    print(f"Output : {os.path.abspath(OUT_DIR)}")
    print(f"Open   : http://localhost:{args.port}/")
    print("Ctrl-C to stop.")
    try:
        srv.serve_forever()
    except KeyboardInterrupt:
        print("\nstopped.")


if __name__ == "__main__":
    main()
