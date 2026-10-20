"""Pixel QA for v5 renders (1920x1080 = 144 px/in), 25 slides.
Checks: edge purity, header band alignment (kicker accent / title ink),
voxel cluster top-right, page counter, and prints an ASCII composition.

v5 differences from v4: chapter kickers (slides 4-23) are HARNESS-ACCENT
colored (amber/green/blue/purple) instead of always blue; dark = {1, 25}.
"""
import sys
from PIL import Image

BG_L = (0xF7, 0xF6, 0xF2)
BG_D = (0x1B, 0x1D, 0x22)
INK = (0x1B, 0x1D, 0x22)
BLUE = (0x2F, 0x6F, 0xED)
LBLUE = (0x7C, 0xB0, 0xFF)
GREEN = (0x16, 0xA3, 0x4A)
AMBER = (0xD9, 0x77, 0x06)
PURPLE = (0x7C, 0x3A, 0xED)
ACCENTS = [BLUE, GREEN, AMBER, PURPLE]
TOTAL = 33
CHAPTER = set(range(13, 33))  # slides 13-32 (chapters after matrix@4 + specs@5-12)


def near(a, b, tol=10):
    return all(abs(x - y) <= tol for x, y in zip(a[:3], b))


def scan(path, i, dark):
    im = Image.open(path).convert("RGB")
    W, H = im.size
    bg = BG_D if dark else BG_L
    fails = []

    # 1. edge purity: 4px frame must be pure background
    bad = 0
    for x in range(W):
        for y in list(range(4)) + list(range(H - 4, H)):
            if not near(im.getpixel((x, y)), bg):
                bad += 1
    for y in range(H):
        for x in list(range(4)) + list(range(W - 4, W)):
            if not near(im.getpixel((x, y)), bg):
                bad += 1
    if bad:
        fails.append(f"edge pixels != bg: {bad}")

    # 2. header: kicker (accent for chapters, blue for frame) + ink title below
    if not dark:
        cols = ACCENTS if i in CHAPTER else [BLUE]
        kick = any(near(im.getpixel((x, y)), c, 40)
                   for x in range(76, 600, 4) for y in range(55, 100, 2) for c in cols)
        tit = any(near(im.getpixel((x, y)), INK, 30)
                  for x in range(76, 900, 4) for y in range(100, 165, 2))
        if not kick:
            fails.append("no accent/BLUE kicker at header")
        if not tit:
            fails.append("no INK title at header")

    # 3. voxel cluster top-right (12.18in = 1754px, 0.42in = 60px)
    vx = any(not near(im.getpixel((x, y)), bg) and not near(im.getpixel((x, y)), INK if dark else bg)
             for x in range(1745, 1795, 2) for y in range(55, 100, 2))
    if not vx:
        fails.append("no voxel cluster top-right")

    # 4. page counter bottom-right (except cover)
    if i != 1:
        ctr = any(not near(im.getpixel((x, y)), bg)
                  for x in range(1700, 1880, 2) for y in range(1010, 1048, 2))
        if not ctr:
            fails.append("no page counter bottom-right")

    return fails


def ascii_dump(path, dark, w=150):
    im = Image.open(path).convert("RGB").resize((w, 46))
    bg = BG_D if dark else BG_L
    out = []
    for y in range(46):
        row = ""
        for x in range(w):
            p = im.getpixel((x, y))
            if near(p, bg, 12):
                row += "."
            elif near(p, INK, 34) or near(p, (0, 0, 0), 30):
                row += "#"
            elif near(p, (0xFF, 0xFF, 0xFF), 12):
                row += "W"
            elif near(p, BLUE, 40):
                row += "B"
            elif near(p, LBLUE, 40):
                row += "L"
            elif near(p, (0x16, 0xA3, 0x4A), 45):
                row += "G"
            elif near(p, (0xD9, 0x77, 0x06), 45):
                row += "A"
            elif near(p, (0x7C, 0x3A, 0xED), 45):
                row += "P"
            elif near(p, (0xDC, 0x26, 0x26), 45):
                row += "R"
            elif near(p, (0xF5, 0xC8, 0x6E), 40):
                row += "$"
            elif near(p, (0x24, 0x27, 0x2F), 18):
                row += "c"
            else:
                row += "-"
        out.append(row)
    return "\n".join(out)


if __name__ == "__main__":
    which = sys.argv[1:]
    allbad = 0
    for i in range(1, TOTAL + 1):
        p = f"render/slide-{i:02d}.png"
        dark = i in (1, TOTAL)
        f = scan(p, i, dark)
        status = "PASS" if not f else "FAIL " + "; ".join(f)
        if f:
            allbad += 1
        if not which or str(i) in which or f"slide-{i:02d}" in which:
            print(f"[{p}] {status}")
    print(f"\nPIXEL SCAN: {'ALL PASS' if allbad == 0 else str(allbad) + ' slides failed'}")
    if which:
        for i in which:
            n = int(i) if i.isdigit() else int(i.split("-")[1])
            print(f"\n===== slide {n:02d} =====")
            print(ascii_dump(f"render/slide-{n:02d}.png", n in (1, TOTAL)))
