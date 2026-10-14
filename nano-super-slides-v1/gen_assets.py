"""Render pixel-font PNG assets for the nano-super deck.

Hand-defined 5x7 bitmap font (classic 8-bit look, incl. custom glyphs for
pi and arrow) drawn as hard squares onto transparent PNGs via Pillow.
"""
import json
import os
from PIL import Image, ImageDraw

INK = (0x1B, 0x1D, 0x22, 255)
BLUE = (0x2F, 0x6F, 0xED, 255)
WHITE = (0xF5, 0xF6, 0xF8, 255)
LBLUE = (0x7C, 0xB0, 0xFF, 255)

F = {
    "A": [""+".###."+"", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "B": ["####.", "#...#", "#...#", "####.", "#...#", "#...#", "####."],
    "C": [".###.", "#...#", "#....", "#....", "#....", "#...#", ".###."],
    "D": ["####.", "#...#", "#...#", "#...#", "#...#", "#...#", "####."],
    "E": ["#####", "#....", "#....", "####.", "#....", "#....", "#####"],
    "F": ["#####", "#....", "#....", "####.", "#....", "#....", "#...."],
    "G": [".###.", "#...#", "#....", "#.###", "#...#", "#...#", ".###."],
    "H": ["#...#", "#...#", "#...#", "#####", "#...#", "#...#", "#...#"],
    "I": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "#####"],
    "J": ["..###", "...#.", "...#.", "...#.", "...#.", "#..#.", ".##.."],
    "K": ["#...#", "#..#.", "#.#..", "##...", "#.#..", "#..#.", "#...#"],
    "L": ["#....", "#....", "#....", "#....", "#....", "#....", "#####"],
    "M": ["#...#", "##.##", "#.#.#", "#.#.#", "#...#", "#...#", "#...#"],
    "N": ["#...#", "##..#", "#.#.#", "#..##", "#...#", "#...#", "#...#"],
    "O": [".###.", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "P": ["####.", "#...#", "#...#", "####.", "#....", "#....", "#...."],
    "Q": [".###.", "#...#", "#...#", "#...#", "#.#.#", "#..#.", ".##.#"],
    "R": ["####.", "#...#", "#...#", "####.", "#.#..", "#..#.", "#...#"],
    "S": [".####", "#....", "#....", ".###.", "....#", "....#", "####."],
    "T": ["#####", "..#..", "..#..", "..#..", "..#..", "..#..", "..#.."],
    "U": ["#...#", "#...#", "#...#", "#...#", "#...#", "#...#", ".###."],
    "V": ["#...#", "#...#", "#...#", "#...#", "#...#", ".#.#.", "..#.."],
    "W": ["#...#", "#...#", "#...#", "#.#.#", "#.#.#", "##.##", "#...#"],
    "X": ["#...#", "#...#", ".#.#.", "..#..", ".#.#.", "#...#", "#...#"],
    "Y": ["#...#", "#...#", ".#.#.", "..#..", "..#..", "..#..", "..#.."],
    "Z": ["#####", "....#", "...#.", "..#..", ".#...", "#....", "#####"],
    "0": [".###.", "#...#", "#..##", "#.#.#", "##..#", "#...#", ".###."],
    "1": ["..#..", ".##..", "..#..", "..#..", "..#..", "..#..", "#####"],
    "2": [".###.", "#...#", "....#", "...#.", "..#..", ".#...", "#####"],
    "3": ["####.", "....#", "....#", ".###.", "....#", "....#", "####."],
    "4": ["...#.", "..##.", ".#.#.", "#..#.", "#####", "...#.", "...#."],
    "5": ["#####", "#....", "#....", "####.", "....#", "....#", "####."],
    "6": [".###.", "#....", "#....", "####.", "#...#", "#...#", ".###."],
    "7": ["#####", "....#", "...#.", "..#..", "..#..", "..#..", "..#.."],
    "8": [".###.", "#...#", "#...#", ".###.", "#...#", "#...#", ".###."],
    "9": [".###.", "#...#", "#...#", ".####", "....#", "....#", ".###."],
    " ": [".....", ".....", ".....", ".....", ".....", ".....", "....."],
    "-": [".....", ".....", ".....", "#####", ".....", ".....", "....."],
    ".": [".....", ".....", ".....", ".....", ".....", ".##..", ".##.."],
    ",": [".....", ".....", ".....", ".....", ".##..", ".##..", ".#..."],
    ":": [".....", ".##..", ".##..", ".....", ".##..", ".##..", "....."],
    "/": ["....#", "....#", "...#.", "..#..", ".#...", "#....", "#...."],
    "&": [".##..", "#..#.", "#.#..", ".#...", "#.#.#", "#..#.", ".##.#"],
    "+": [".....", "..#..", "..#..", "#####", "..#..", "..#..", "....."],
    "(": ["...#.", "..#..", ".#...", ".#...", ".#...", "..#..", "...#."],
    ")": [".#...", "..#..", "...#.", "...#.", "...#.", "..#..", ".#..."],
    "\u00b7": [".....", ".....", ".....", ".##..", ".##..", ".....", "....."],  # middle dot
    "\u2192": [".....", "..#..", "..##.", "#####", "..##.", "..#..", "....."],   # right arrow
    "\u03c0": ["#####", ".###.", ".#.#.", ".#.#.", ".#.#.", ".#.#.", ".#.#."],   # pi
}

ADV = 6  # 5 px glyph + 1 px spacing, in cells


def text_cells(s):
    return max(1, len(s) * ADV - 1)


def render(segments, scale, out, shadow=None):
    """segments: list of (text, rgba). shadow: (rgba, dx_px, dy_px) baked hard shadow."""
    total = sum(text_cells(t) for t, _ in segments)
    w, h = total * scale, 7 * scale
    pad = scale * 2 if shadow else 0
    img = Image.new("RGBA", (w + 2 * pad, h + 2 * pad), (0, 0, 0, 0))
    d = ImageDraw.Draw(img)

    def paint(color, ox, oy):
        x0 = pad + ox
        for t, _ in segments:
            for ci, ch in enumerate(t):
                rows = F[ch]
                for r in range(7):
                    for c in range(5):
                        if rows[r][c] == "#":
                            x = x0 + (ci * ADV + c) * scale
                            y = pad + oy + r * scale
                            d.rectangle([x, y, x + scale - 1, y + scale - 1], fill=color)
            x0 += text_cells(t) * scale

    if shadow:
        paint(shadow[0], shadow[1], shadow[2])
    # paint main colors segment by segment
    x0 = pad
    for t, col in segments:
        for ci, ch in enumerate(t):
            rows = F[ch]
            for r in range(7):
                for c in range(5):
                    if rows[r][c] == "#":
                        x = x0 + (ci * ADV + c) * scale
                        y = pad + r * scale
                        d.rectangle([x, y, x + scale - 1, y + scale - 1], fill=col)
        x0 += text_cells(t) * scale
    img.save(out)
    return {"file": out.replace("\\", "/"), "w": img.width, "h": img.height}


def main():
    os.makedirs("assets", exist_ok=True)
    m = {}

    titles = [
        ("t02", "THE PROBLEM"), ("t03", "WHAT NANO-SUPER IS"),
        ("t04", "THE MONITOR EXTENSION"), ("t05", "DATA RELATIONS"),
        ("t06", "DASHBOARD PIPELINE"), ("t07", "/RESEARCH: SIX STAGES"),
        ("t08", "PAPER \u2192 AGENT SCALE"), ("t09", "DESIGN DECISIONS"),
        ("t10", "TIME & EXTRA COST"), ("t11", "MEASURABLE BENEFITS"),
    ]
    for name, t in titles:
        m[name] = render([(t, INK)], 16, f"assets/{name}.png")

    m["t12"] = render([("STATUS & TAKEAWAYS", WHITE)], 16, "assets/t12.png")

    kickers = [
        ("k02", "WHY IT EXISTS"), ("k03", "THE PRODUCT"),
        ("k04", "PART 1 \u00b7 PI EXTENSIONS"), ("k05", "PART 2 \u00b7 THE DATA"),
        ("k06", "PART 2 \u00b7 DASHBOARD"), ("k07", "PART 1 \u00b7 /RESEARCH"),
        ("k08", "PART 1 \u00b7 /RESEARCH"), ("k09", "ENGINEERING"),
        ("k10", "COST OF OBSERVATION"), ("k11", "THE PAYOFF"),
    ]
    for name, t in kickers:
        m[name] = render([(t, BLUE)], 8, f"assets/{name}.png")

    # wordmark for the dark cover: NANO- in white, SUPER in light blue
    m["wordmark"] = render([("NANO-", WHITE), ("SUPER", LBLUE)], 24, "assets/wordmark.png")

    # pi glyph, blue with baked ink hard shadow (light slides)
    m["pi_blue"] = render([("\u03c0", BLUE)], 36, "assets/pi_blue.png",
                          shadow=((0x1B, 0x1D, 0x22, 255), 10, 10))
    # pi glyph, white (cover, dark bg)
    m["pi_white"] = render([("\u03c0", WHITE)], 52, "assets/pi_white.png")

    with open("assets/manifest.json", "w") as f:
        json.dump(m, f, indent=1)
    print(json.dumps(m, indent=1))


if __name__ == "__main__":
    main()
