#!/usr/bin/env python3
"""
Zoom-out reveal video from a folder of 16:9 images.

Builds a square G x G mosaic of 16:9 tiles (a square grid of 16:9 tiles is
itself 16:9, so the final fully-zoomed-out frame fills the screen exactly).
The "hero" image is placed at the centre cell. The virtual camera starts
zoomed all the way into the hero tile (it fills the frame) and smoothly zooms
out until the whole mosaic is visible -- revealing the full collection.

Pipeline: build mosaic once -> for each frame, crop a 16:9 sub-window of the
mosaic (window grows exponentially in time) and resize it to 1920x1080 ->
encode to H.264 with the ffmpeg binary bundled by imageio-ffmpeg.

Examples:
    python3 tools/make_zoom_video.py \
        --src "zoom-out_collection_cropped" \
        --out many_people_zoom_generated.mp4

    python3 tools/make_zoom_video.py --duration 8 --fps 25 --hero IMG_8744
"""
import argparse
import math
import os
import random

import numpy as np
import imageio.v2 as imageio
from PIL import Image, ImageOps

IMG_EXT = (".jpg", ".jpeg", ".png", ".webp", ".bmp", ".tif", ".tiff")


def list_images(src):
    names = [f for f in os.listdir(src)
             if f.lower().endswith(IMG_EXT) and not f.startswith(".")]
    return sorted(names, key=str.lower)


def load_tile(path, tw, th):
    """Load an image and cover-crop it to exactly tw x th (16:9)."""
    im = ImageOps.exif_transpose(Image.open(path)).convert("RGB")
    w, h = im.size
    scale = max(tw / w, th / h)
    nw, nh = math.ceil(w * scale), math.ceil(h * scale)
    im = im.resize((nw, nh), Image.LANCZOS)
    left = (nw - tw) // 2
    top = (nh - th) // 2
    return im.crop((left, top, left + tw, top + th))


def build_layout(names, hero, grid):
    """Return (G, cells) where cells is a G*G list of source names.

    Hero goes in the centre cell. All unique images appear at least once;
    remaining cells are filled by cycling through the rest (deterministic).
    """
    rng = random.Random(1234)
    hero_name = next((n for n in names if hero.lower() in n.lower()), None)
    others = [n for n in names if n != hero_name]
    rng.shuffle(others)

    total = len(names)
    G = grid if grid else max(2, math.ceil(math.sqrt(total)))
    if G * G < total:
        G = math.ceil(math.sqrt(total))
    ncells = G * G

    # fill order: every unique "other" first, then cycle to top up
    fill = list(others)
    i = 0
    while len(fill) < ncells - 1:           # -1 reserves the hero cell
        fill.append(others[i % len(others)] if others else hero_name)
        i += 1
    rng.shuffle(fill)

    center = (G // 2) * G + (G // 2)         # centre cell index
    cells = [None] * ncells
    cells[center] = hero_name or fill.pop()
    j = 0
    for c in range(ncells):
        if cells[c] is None:
            cells[c] = fill[j]
            j += 1
    return G, cells, center, hero_name


def build_mosaic(src, names, G, cells, tw, th):
    mosaic = Image.new("RGB", (G * tw, G * th))
    cache = {}
    for c, name in enumerate(cells):
        if name not in cache:
            cache[name] = load_tile(os.path.join(src, name), tw, th)
        r, col = divmod(c, G)
        mosaic.paste(cache[name], (col * tw, r * th))
    return mosaic


def smootherstep(t):
    return t * t * t * (t * (t * 6 - 15) + 10)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--src", default="zoom-out_collection_cropped",
                    help="folder of 16:9 images")
    ap.add_argument("--out", default="many_people_zoom_generated.mp4")
    ap.add_argument("--hero", default="IMG_8744",
                    help="substring of the image to start zoomed into")
    ap.add_argument("--grid", type=int, default=0,
                    help="grid size G (G x G). 0 = auto from image count")
    ap.add_argument("--width", type=int, default=1920)
    ap.add_argument("--height", type=int, default=1080)
    ap.add_argument("--fps", type=int, default=25)
    ap.add_argument("--duration", type=float, default=7.0,
                    help="seconds of zoom motion")
    ap.add_argument("--hold-start", type=float, default=0.6,
                    help="seconds held on the hero before zooming")
    ap.add_argument("--hold-end", type=float, default=1.2,
                    help="seconds held on the full grid at the end")
    ap.add_argument("--tile-h", type=int, default=720,
                    help="tile height in px (tile is 16:9)")
    ap.add_argument("--reverse", action="store_true",
                    help="zoom IN instead of out")
    args = ap.parse_args()

    if not os.path.isdir(args.src):
        raise SystemExit(f"source folder not found: {args.src}")
    names = list_images(args.src)
    if not names:
        raise SystemExit(f"no images in {args.src}")

    th = args.tile_h
    tw = round(th * 16 / 9)
    G, cells, center, hero_name = build_layout(names, args.hero, args.grid)
    print(f"{len(names)} images -> {G}x{G} grid ({G*G} cells). "
          f"hero = {hero_name or '(none, using first)'}")
    print("building mosaic ...")
    mosaic = build_mosaic(args.src, names, G, cells, tw, th)
    mos = np.asarray(mosaic)
    MH, MW = mos.shape[:2]
    mosaic_pil = mosaic

    # camera target window heights (mosaic px): start = one tile, end = full grid
    h_start = float(th)
    h_end = float(MH)
    ar = args.width / args.height

    # hero cell centre + mosaic centre (camera pans between them)
    cr, cc = divmod(center, G)
    hero_cx = (cc + 0.5) * tw
    hero_cy = (cr + 0.5) * th
    mos_cx, mos_cy = MW / 2.0, MH / 2.0

    n_motion = max(1, round(args.duration * args.fps))
    n_hs = round(args.hold_start * args.fps)
    n_he = round(args.hold_end * args.fps)

    def frame_at(p):
        """p in [0,1]: 0 = zoomed into hero, 1 = full grid."""
        e = smootherstep(p)
        winH = h_start * (h_end / h_start) ** e      # exponential zoom
        winW = winH * ar
        cx = hero_cx + (mos_cx - hero_cx) * e
        cy = hero_cy + (mos_cy - hero_cy) * e
        left = cx - winW / 2
        top = cy - winH / 2
        # keep the window inside the mosaic
        left = min(max(left, 0.0), MW - winW)
        top = min(max(top, 0.0), MH - winH)
        box = (left, top, left + winW, top + winH)
        crop = mosaic_pil.resize((args.width, args.height), Image.LANCZOS, box=box)
        return np.asarray(crop)

    print(f"encoding -> {args.out}  ({args.width}x{args.height} @ {args.fps}fps)")
    writer = imageio.get_writer(
        args.out, fps=args.fps, codec="libx264", quality=8,
        pixelformat="yuv420p", macro_block_size=8,
        ffmpeg_log_level="error",
    )

    seq = ([0.0] * n_hs +
           [i / (n_motion - 1) if n_motion > 1 else 1.0 for i in range(n_motion)] +
           [1.0] * n_he)
    if args.reverse:
        seq = [1.0 - p for p in seq][::-1]

    total = len(seq)
    last = None
    for k, p in enumerate(seq):
        # cache identical hold frames
        if p in (0.0, 1.0) and last is not None and last[0] == p:
            writer.append_data(last[1])
        else:
            fr = frame_at(p)
            writer.append_data(fr)
            last = (p, fr)
        if k % 25 == 0 or k == total - 1:
            print(f"  frame {k+1}/{total}", end="\r", flush=True)
    writer.close()
    print(f"\ndone: {os.path.abspath(args.out)}  ({total} frames, "
          f"{total/args.fps:.1f}s)")


if __name__ == "__main__":
    main()
