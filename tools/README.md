# Zoom-out video tooling

Two steps: **(1)** crop every photo to 16:9 in the browser, **(2)** render the
zoom-out reveal video from the cropped folder.

## 1. Crop images to 16:9

```bash
python3 tools/crop_server.py
# optional: --src "zoom-out_collection" --out "zoom-out_collection_cropped" --port 8000
```

Open <http://localhost:8000/> in a browser.

- Each source image loads into a fixed **16:9 frame**.
- **Drag** to pan · **mouse wheel** to zoom · **Zoom / Rotate** sliders ·
  **⟲90 / 90⟳** for 90° turns · **Reset**.
- **Save & Next** (or press **S**) writes a `1920x1080` JPEG into the output
  folder and jumps to the next image. **←/→** navigate. A green ✓ marks saved
  images in the right-hand strip.
- EXIF orientation is applied server-side, so portrait phone photos appear
  upright.

Output folder defaults to `zoom-out_collection_cropped/`.

## 2. Render the zoom-out video

```bash
python3 tools/make_zoom_video.py \
    --src "zoom-out_collection_cropped" \
    --out many_people_zoom_generated.mp4
```

Builds a square `G x G` mosaic of the 16:9 tiles (a square grid of 16:9 tiles
is itself 16:9), places the **hero** image in the centre cell, and zooms the
camera out from the hero tile to the whole grid.

Key options:

| flag | default | meaning |
|------|---------|---------|
| `--hero` | `IMG_8744` | substring of the image to start zoomed into (image #2) |
| `--duration` | `7` | seconds of zoom motion |
| `--hold-start` / `--hold-end` | `0.6` / `1.2` | seconds held at each end |
| `--fps` | `25` | matches `many_people_zoom_for_website.mp4` |
| `--width` / `--height` | `1920` / `1080` | output resolution |
| `--grid` | auto | force grid size `G` (`G x G`); auto = `ceil(sqrt(N))` |
| `--tile-h` | `720` | per-tile height (16:9), controls mosaic sharpness |
| `--reverse` | off | zoom **in** instead of out |

The final frame fills the screen with the full collection, so it can be
concatenated after a clip that ends on the hero closeup.

Requires `pip install Pillow numpy imageio imageio-ffmpeg` (ffmpeg is bundled by
`imageio-ffmpeg`; no system install needed).
