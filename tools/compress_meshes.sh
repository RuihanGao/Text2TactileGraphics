#!/usr/bin/env bash
#
# Compress the gallery .glb meshes with Draco, in place.
#
# Requires: gltf-transform  (npm i -g @gltf-transform/cli)
#
# Usage:
#   tools/compress_meshes.sh                 # compress in place
#   tools/compress_meshes.sh --dry-run       # report what would change
#   tools/compress_meshes.sh --backup        # keep <name>.glb.orig alongside
#
set -euo pipefail

DATA_DIR="${DATA_DIR:-data/gallery_ours}"
QUANT_POSITION="${QUANT_POSITION:-14}"

DRY_RUN=0
BACKUP=0
for arg in "$@"; do
  case "$arg" in
    --dry-run) DRY_RUN=1 ;;
    --backup)  BACKUP=1 ;;
    -h|--help) sed -n '2,25p' "$0"; exit 0 ;;
    *) echo "unknown option: $arg" >&2; exit 2 ;;
  esac
done

if ! command -v gltf-transform >/dev/null 2>&1; then
  echo "error: gltf-transform not found. Install with:" >&2
  echo "  npm i -g @gltf-transform/cli" >&2
  exit 1
fi

if [ ! -d "$DATA_DIR" ]; then
  echo "error: $DATA_DIR not found (run from the repo root)" >&2
  exit 1
fi

# Triangle count straight out of the glTF JSON chunk, so we can prove the mesh
# survived compression intact rather than trusting the exit code.
triangles() {
  python3 - "$1" <<'PY'
import json, struct, sys
with open(sys.argv[1], 'rb') as f:
    struct.unpack('<4sII', f.read(12))
    clen, _ = struct.unpack('<I4s', f.read(8))
    j = json.loads(f.read(clen))
print(sum(j['accessors'][p['indices']]['count'] // 3
          for m in j.get('meshes', []) for p in m['primitives'] if 'indices' in p))
PY
}

total_before=0
total_after=0
count=0
failed=0

for src in "$DATA_DIR"/*.glb; do
  [ -e "$src" ] || { echo "no .glb files in $DATA_DIR"; exit 1; }
  name=$(basename "$src")
  before=$(wc -c <"$src" | tr -d ' ')
  tris_before=$(triangles "$src")

  if [ "$DRY_RUN" -eq 1 ]; then
    printf '%-28s %7.2f MB  %s triangles\n' \
      "$name" "$(echo "$before" | awk '{print $1/1048576}')" "$tris_before"
    total_before=$((total_before + before))
    count=$((count + 1))
    continue
  fi

  # Temp file beside the original so the final mv stays on one filesystem and is therefore atomic.
  tmp="${src%.glb}.tmp.glb"
  trap 'rm -f "$tmp"' EXIT
  if ! gltf-transform draco "$src" "$tmp" \
        --quantize-position "$QUANT_POSITION" >/dev/null 2>&1; then
    echo "FAILED  $name (left untouched)" >&2
    rm -f "$tmp"
    failed=$((failed + 1))
    continue
  fi

  # Verify before replacing: geometry must be byte-parseable and the triangle
  # count must match exactly. Anything else and we keep the original.
  tris_after=$(triangles "$tmp" 2>/dev/null || echo "ERR")
  if [ "$tris_after" != "$tris_before" ]; then
    echo "FAILED  $name: triangles $tris_before -> $tris_after (left untouched)" >&2
    rm -f "$tmp"
    failed=$((failed + 1))
    continue
  fi

  [ "$BACKUP" -eq 1 ] && cp -p "$src" "$src.orig"
  # Preserve the original mode, then swap atomically.
  chmod --reference="$src" "$tmp" 2>/dev/null || chmod 644 "$tmp"
  mv -f "$tmp" "$src"

  after=$(wc -c <"$src" | tr -d ' ')
  total_before=$((total_before + before))
  total_after=$((total_after + after))
  count=$((count + 1))
  awk -v n="$name" -v b="$before" -v a="$after" -v t="$tris_before" \
    'BEGIN{printf "%-28s %7.2f MB -> %7.2f MB  (%4.1fx)  %s triangles kept\n",
           n, b/1048576, a/1048576, b/a, t}'
done

echo
if [ "$DRY_RUN" -eq 1 ]; then
  awk -v c="$count" -v b="$total_before" \
    'BEGIN{printf "%d files, %.1f MB total (dry run, nothing written)\n", c, b/1048576}'
else
  awk -v c="$count" -v b="$total_before" -v a="$total_after" \
    'BEGIN{if (a>0) printf "%d files: %.1f MB -> %.1f MB  (%.1fx smaller, %.1f MB saved)\n",
           c, b/1048576, a/1048576, b/a, (b-a)/1048576}'
  [ "$failed" -gt 0 ] && echo "$failed file(s) failed and were left untouched" >&2
fi
exit 0
