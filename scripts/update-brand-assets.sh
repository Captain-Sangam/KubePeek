#!/usr/bin/env bash
set -euo pipefail

# Asset conversion only: preserve the artwork and discard text/EXIF metadata.
# Requires ImageMagick and macOS iconutil; normal builds use checked-in icons.
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
source_image="${1:-$root/assets/logo.png}"
command -v magick >/dev/null || { echo "ImageMagick (magick) is required." >&2; exit 1; }
command -v iconutil >/dev/null || { echo "macOS iconutil is required." >&2; exit 1; }

scratch_dir="$(mktemp -d)"
trap 'rm -rf "$scratch_dir"' EXIT
iconset="$scratch_dir/icon.iconset"
mkdir -p "$iconset"

magick "$source_image" -strip -define png:exclude-chunks=all "PNG24:$scratch_dir/logo.png"
magick "$scratch_dir/logo.png" -resize 1024x1024 -strip -define png:exclude-chunks=all \
  "PNG24:$scratch_dir/icon.png"

for size in 16 32 128 256 512; do
  magick "$scratch_dir/logo.png" -resize "${size}x${size}" -strip -define png:exclude-chunks=all \
    "PNG32:$iconset/icon_${size}x${size}.png"
  retina_size=$((size * 2))
  magick "$scratch_dir/logo.png" -resize "${retina_size}x${retina_size}" -strip -define png:exclude-chunks=all \
    "PNG32:$iconset/icon_${size}x${size}@2x.png"
done

iconutil -c icns "$iconset" -o "$scratch_dir/icon.icns"
magick "$scratch_dir/logo.png" -define icon:auto-resize=256,128,64,48,32,16 \
  -strip -define png:exclude-chunks=all "$scratch_dir/favicon.ico"

cp "$scratch_dir/logo.png" "$root/assets/logo.png"
cp "$scratch_dir/icon.png" "$root/build/icon.png"
cp "$scratch_dir/icon.icns" "$root/build/icon.icns"
cp "$scratch_dir/favicon.ico" "$root/public/favicon.ico"
echo "Updated README logo, macOS icons and browser favicon."
