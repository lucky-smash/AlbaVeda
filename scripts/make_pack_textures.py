"""Crop real AlbaVeda carton photos to the pack front (no white margin, no
floor reflection) for use as textures in the 3D product reveal.

Usage: python scripts/make_pack_textures.py <repo_root> id [id ...]
Reads  site/public/img/p/<id>-0-1000.webp
Writes site/public/img/pack/<id>.webp  (label artwork is not modified)
Prints the pack aspect ratio (w/h) for each id.
"""
import os
import sys

from PIL import Image, ImageChops

ROOT = sys.argv[1]
SRC = os.path.join(ROOT, "site", "public", "img", "p")
DST = os.path.join(ROOT, "site", "public", "img", "pack")


def row_strength(im, y, x0, x1):
    """Mean distance from white across a row (0..255)."""
    px = im.load()
    total = 0
    for x in range(x0, x1, 2):
        r, g, b = px[x, y][:3]
        total += 765 - (r + g + b)
    return total / (3 * ((x1 - x0) // 2 or 1))


def crop_pack(path):
    im = Image.open(path).convert("RGB")
    diff = ImageChops.difference(im, Image.new("RGB", im.size, "white")).convert("L")
    mask = diff.point(lambda v: 255 if v > 18 else 0)
    x0, y0, x1, y1 = mask.getbbox()
    # The reflection below the carton is much fainter than the carton itself.
    # Walk up from the bottom of the bbox until rows become "solid" print again.
    strengths = [row_strength(im, y, x0, x1) for y in range(y0, y1)]
    peak = sorted(strengths)[int(len(strengths) * 0.6)]
    bottom = y1
    for i in range(len(strengths) - 1, 0, -1):
        if strengths[i] > peak * 0.55:
            bottom = y0 + i + 1
            break
    # Reflection usually begins with a thin bright gap; find the last strong row
    # in the lower third that is followed by a sharp drop.
    best_drop, cut = 0, bottom
    lower = int(len(strengths) * 0.66)
    for i in range(lower, min(len(strengths) - 2, bottom - y0)):
        drop = strengths[i] - strengths[i + 2]
        if drop > best_drop:
            best_drop, cut = drop, y0 + i + 1
    if best_drop > peak * 0.35:
        bottom = cut
    inset = 2  # trim anti-aliased edge so no white halo shows on the 3D slab
    return im.crop((x0 + inset, y0 + inset, x1 - inset, bottom - inset))


def main():
    os.makedirs(DST, exist_ok=True)
    for pid in sys.argv[2:]:
        pack = crop_pack(os.path.join(SRC, f"{pid}-0-1000.webp"))
        # Power-of-two-friendly height keeps mipmaps crisp on older GPUs.
        h = 1024
        w = round(pack.width * h / pack.height)
        pack.resize((w, h), Image.LANCZOS).save(os.path.join(DST, f"{pid}.webp"), quality=88)
        print(pid, round(pack.width / pack.height, 4), pack.size)


if __name__ == "__main__":
    main()
