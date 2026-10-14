"""Coffee-Quest game sprites for the nano-super v2 deck.

Pixel/voxel-style sprites rendered as crisp PNGs (1 cell = 3 px, placed at
2.25 pt/cell in the deck). Reuses the v1 5x7 bitmap font for sign boards and
pixel-text assets. Run with the workspace-root venv:
    ../.venv/Scripts/python gen_sprites.py
"""
import importlib.util
import json
import os
import random

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
V1 = os.path.join(HERE, "..", "nano-super-slides-v1", "gen_assets.py")
spec = importlib.util.spec_from_file_location("gen_assets_v1", V1)
ga = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ga)
F, ADV = ga.F, ga.ADV  # 5x7 bitmap font + advance

# ---------- palette ----------
C = {
    "k": (0x1B, 0x1D, 0x22),  # ink
    "h": (0x4A, 0x37, 0x28),  # hair
    "H": (0x5F, 0x48, 0x35),  # hair hi
    "s": (0xF2, 0xC4, 0x9B),  # skin
    "S": (0xD9, 0xA8, 0x78),  # skin shade
    "B": (0x2F, 0x6F, 0xED),  # shirt
    "b": (0x24, 0x56, 0xC4),  # shirt shade
    "e": (0x7C, 0xB0, 0xFF),  # shirt light
    "p": (0x3E, 0x44, 0x50),  # pants
    "P": (0x2B, 0x30, 0x3A),  # pants shade
    "w": (0xFF, 0xFF, 0xFF),  # white
    "W": (0xC9, 0xCD, 0xD4),  # gray light
    "o": (0x8A, 0x5A, 0x2B),  # coffee
    "O": (0x6B, 0x44, 0x20),  # coffee dark
    "r": (0xDC, 0x26, 0x26),  # red
    "R": (0xEF, 0x5B, 0x5B),  # red light
    "g": (0x16, 0xA3, 0x4A),  # cactus
    "G": (0x4C, 0xC3, 0x6B),  # cactus light
    "d": (0x0E, 0x7A, 0x38),  # cactus dark
    "n": (0xA0, 0x67, 0x3F),  # wood
    "N": (0x7E, 0x4F, 0x2E),  # wood dark
    "D": (0x2A, 0x2E, 0x39),  # machine body
    "E": (0x3C, 0x41, 0x4E),  # machine panel
    "A": (0xD9, 0x77, 0x06),  # amber
    "L": (0x9A, 0xA0, 0xAB),  # gray mut
    "c": (0xFF, 0xFF, 0xFF),  # cloud white
    "f": (0xAE, 0xC4, 0xEC),  # cloud shade
    "y": (0xFB, 0xC3, 0x4D),  # sun yellow
    "Y": (0xF5, 0x9E, 0x0B),  # sun orange
    "m": (0xE9, 0xEB, 0xEE),  # moon pale
    "q": (0x55, 0x5B, 0x66),  # rock
    "Q": (0x76, 0x7D, 0x8A),  # rock light
}

SCALE = 3  # px per cell

def grid_img(rows, pal_extra=None, cell=SCALE):
    assert rows and all(len(r) == len(rows[0]) for r in rows), "ragged grid"
    w, h = len(rows[0]) * cell, len(rows) * cell
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == ".":
                continue
            col = (pal_extra or {}).get(ch) or C[ch]
            dr.rectangle([x * cell, y * cell, x * cell + cell - 1, y * cell + cell - 1], fill=col + (255,))
    return img

M = {}

def save(name, img):
    img.save(os.path.join("assets", f"{name}.png"))
    M[name] = {"file": f"assets/{name}.png", "w": img.width, "h": img.height}

# ---------- the man (12 x 20, faces right) ----------
HEAD = [
    "....hhhh....",
    "...hHHHHh...",
    "...ssssss...",
    "...skssks...",
    "...sSssSs...",
    "....ssss....",
]

TORSO_MUG_EMPTY = [  # leading arm holds an EMPTY mug at chest
    "..bBBBBBBb..",
    ".sbBBBBBBss.",
    ".sbBBBBBkww.",
    "..bBBBBBsww.",
    "..bBBBBBBb..",
    "..bbBBBBbb..",
    "...pppppp...",
    "...pppppp...",
]
TORSO_MUG_FULL = [  # filled mug (coffee surface on top)
    "..bBBBBBBb..",
    ".sbBBBBBBss.",
    ".sbBBBBBsoO.",
    "..bBBBBBsww.",
    "..bBBBBBBb..",
    "..bbBBBBbb..",
    "...pppppp...",
    "...pppppp...",
]
LEGS_A = [  # stride
    "...pp..pp...",
    "...pp..pp...",
    "..pp....pp..",
    "..pP....Pp..",
    ".kk......kk.",
    "............",
]
LEGS_B = [  # passing pose, 1 cell lower (run bob)
    "...pppppp...",
    "....pppp....",
    "....pppp....",
    "....p..p....",
    "....P..p....",
    "....kk.kk...",
]
LEGS_JUMP = [  # tucked
    "...pppppp...",
    "..ppp..ppp..",
    "..kk....kk..",
    "............",
    "............",
    "............",
]

save("man_runA", grid_img(HEAD + TORSO_MUG_EMPTY + LEGS_A))
save("man_runB", grid_img(HEAD + TORSO_MUG_EMPTY + LEGS_B))
save("man_jump", grid_img(HEAD + TORSO_MUG_EMPTY + LEGS_JUMP))
save("man_idle", grid_img(HEAD + TORSO_MUG_FULL + LEGS_B))

# ---------- hearts (7 x 6) ----------
HEART = [
    ".rr.rr.",
    "rRrrrrr",
    "rRRrrrr",
    ".rrrrr.",
    "..rrr..",
    "...r...",
]
save("heart_full", grid_img(HEART))
HEART_E = [
    ".LL.LL.",
    "LLLLLLL",
    "LLWLLLL",
    ".LLLLL.",
    "..LLL..",
    "...L...",
]
save("heart_empty", grid_img(HEART_E))

# ---------- obstacles ----------
CACTUS = [
    "...gg...",
    "...gg.g.",
    "G..gg.g.",
    "G..GGgGg",
    "Gg.GGggg",
    "ggdgg.g.",
    ".ggggg..",
    "...gg...",
    "...dg...",
    "...dg...",
]
save("cactus", grid_img(CACTUS))
ROCK = [
    "..qQQqq...",
    ".qQQQqqq..",
    "qQQqqqqqq.",
    "qqqqqqqqq.",
    ".qqqqqqqq.",
]
save("rock", grid_img(ROCK))

# ---------- roadside signs (bitmap font boards) ----------
def sign(name, text, fg, board="w", post="n"):
    tw = ga.text_cells(text)
    bw, bh = tw + 4, 11  # board with 2-cell padding
    rows = []
    rows.append("k" * bw)
    rows.append("k" + board * (bw - 2) + "k")
    for fr in range(7):
        r = ["k", board, board]
        for ch in text:
            glyph = F[ch]
            for c in range(5):
                r.append(fg if glyph[fr][c] == "#" else board)
            r.append(board)
        r.append(board)
        r.append("k")
        rows.append("".join(r[: bw - 1]) + "k")
    rows.append("k" + board * (bw - 2) + "k")
    rows.append("k" * bw)
    # post: 2 cells wide, centered, 5 tall
    px = (bw - 2) // 2
    for _ in range(5):
        r = ["."] * bw
        r[px] = post
        r[px + 1] = post
        rows.append("".join(r))
    save(name, grid_img(rows))

sign("sign_coffee", "COFFEE \u2192", "B")
sign("sign_nocoffee", "NO COFFEE", "r", board="W")
sign("sign_closed", "CLOSED", "q", board="W")

BUSH = [
    "...gg.g...",
    "..gGgggg..",
    ".gGGgggdg.",
    "gGgggggddg",
    ".ggggdgd..",
    "..dg..d...",
]
save("bush", grid_img(BUSH))

# ---------- sky furniture ----------
CLOUD1 = [
    "....cccc....",
    "..cccccccc..",
    ".cccccccccc.",
    "cccccccccccc",
    ".ff.ffff.ff.",
]
CLOUD2 = [
    "...cccc...",
    ".cccccccc.",
    "cccccccccc",
    ".ff..fff..",
]
save("cloud1", grid_img(CLOUD1))
save("cloud2", grid_img(CLOUD2))

SUN = [
    "....y....",
    ".y..y..y.",
    "..yyyyy..",
    ".yyYyYyy.",
    "yyyYYYyyy",
    ".yyYyYyy.",
    "..yyyyy..",
    ".y..y..y.",
    "....y....",
]
save("sun", grid_img(SUN))
MOON = [
    "..mmmm..",
    ".mm....m",
    "mm.....m",
    "mm......",
    "mm......",
    "mm.....m",
    ".mm....m",
    "..mmmm..",
]
save("moon", grid_img(MOON))

# ---------- seamless skyline (2 screens wide, period = 1 screen = 1280 px) ----------
def skyline(name, facade, shade, win_on, win_off, base):
    CELL = 3
    W, H, MAXH = 2560, 48, 16  # px, px, cells
    img = Image.new("RGBA", (W, H), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    rng = random.Random(42 if "day" in name else 7)
    # base ground strip
    dr.rectangle([0, H - CELL, W - 1, H - 1], fill=tuple(base) + (255,))
    x = 0
    while x < W:
        bw = rng.randrange(10, 22) * CELL  # building width
        bh = rng.randrange(6, MAXH) * CELL
        top = H - CELL - bh
        dr.rectangle([x, top, x + bw - 2, H - CELL - 1], fill=tuple(facade) + (255,))
        # left-lit voxel edge + darker right edge
        dr.rectangle([x, top, x + CELL - 1, H - CELL - 1], fill=tuple(shade) + (255,))
        # windows
        for wy in range(top + 2 * CELL, H - 2 * CELL, 3 * CELL):
            for wx in range(x + 2 * CELL, x + bw - 3 * CELL, 3 * CELL):
                lit = rng.random() < (0.18 if "day" in name else 0.5)
                col = win_on if lit else win_off
                dr.rectangle([wx, wy, wx + CELL - 1, wy + CELL - 1], fill=tuple(col) + (255,))
        x += bw + rng.randrange(2, 5) * CELL
    save(name, img)

skyline("skyline_day", facade=(0xA9, 0xBA, 0xD6), shade=(0xC2, 0xD1, 0xE9), win_on=(0x86, 0x9C, 0xBE), win_off=(0x98, 0xAC, 0xCA), base=(0x8D, 0xA1, 0xBE))
skyline("skyline_night", facade=(0x33, 0x39, 0x4D), shade=(0x41, 0x48, 0x5F), win_on=(0xF5, 0xC8, 0x6E), win_off=(0x28, 0x2D, 0x3D), base=(0x28, 0x2E, 0x3F))

# ---------- coffee machine (20 x 22), 3 states ----------
def mk(w, h):
    return [["."] * w for _ in range(h)]

def box(c, x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            c[y][x] = ch

def stamp(c, x, y, glyph, ch):
    for r in range(7):
        for col in range(5):
            if glyph[r][col] == "#":
                c[y + r][x + col] = ch

def machine(name, light, cup):
    W, H = 20, 22
    c = mk(W, H)
    box(c, 0, 0, W - 1, H - 1, "k")          # shell
    box(c, 1, 1, W - 2, H - 2, "D")          # body
    c[1][6] = {"off": "L", "on": "A", "done": "G"}[light]  # status light
    # screen: cols 2-10, rows 3-9
    box(c, 2, 3, 10, 9, "k")
    box(c, 3, 4, 9, 8, "E")
    if light == "on":
        for i, yy in enumerate((4, 6, 8)):
            c[yy][4] = "A"; c[yy][6] = "A"; c[yy][8] = "A"
    elif light == "done":
        box(c, 4, 5, 8, 7, "G")
        c[6][5] = "d"; c[6][7] = "d"
    else:
        box(c, 3, 4, 9, 8, "k")
        box(c, 4, 5, 8, 7, "E")
    # pi logo on the right panel
    stamp(c, 13, 3, F["\u03c0"], "e")
    # bay: cols 3-16, rows 11-17
    box(c, 3, 11, 16, 17, "k")
    box(c, 4, 12, 15, 16, "E")
    # spout
    box(c, 9, 12, 11, 13, "k")
    box(c, 10, 12, 10, 13, "E")
    if cup is None:
        box(c, 9, 15, 11, 16, "E")
    else:
        box(c, 9, 15, 11, 16, "w")           # cup body
        if cup == "full":
            c[15][10] = "o"                  # coffee surface
    # base
    box(c, 1, 20, W - 2, 20, "N")
    rows = ["".join(r) for r in c]
    save(name, grid_img(rows))

machine("machine_off", "off", None)      # idle
machine("machine_on", "on", "empty")     # brewing, cup placed
machine("machine_done", "done", "full")  # finished, cup full

# ---------- steam (2 frames) ----------
STEAM1 = [
    "..w..",
    ".wWw.",
    "wWWWw",
    ".wWw.",
    "..w..",
]
STEAM2 = [
    ".wWw.",
    "wWWWw",
    ".wWw.",
    "..w..",
    "..w..",
]
save("steam1", grid_img(STEAM1))
save("steam2", grid_img(STEAM2))

# ---------- pixel-text assets (v1 bitmap font) ----------
AMBER = (0xD9, 0x77, 0x06, 255)
LBLUE = (0x7C, 0xB0, 0xFF, 255)
WHITE = (0xF5, 0xF6, 0xF8, 255)
MUT = (0x5C, 0x60, 0x68, 255)
NMUT = (0x9A, 0xA0, 0xAB, 255)
INK = (0x1B, 0x1D, 0x22, 255)

def ptext(name, segments, scale):
    img = Image.new("RGBA", (1, 1))
    m = ga.render(segments, scale, f"assets/{name}.png")
    M[name] = m

ptext("ty_title", [("THANK", WHITE), (" YOU", LBLUE)], 30)
ptext("ty_kicker", [("YOU MADE IT \u00b7 THE COFFEE WAS REAL", LBLUE)], 8)
ptext("coffee_acquired", [("COFFEE ACQUIRED", AMBER)], 8)
ptext("quest_tag", [("COFFEE QUEST", INK)], 3)

for i in range(1, 14):
    ptext(f"score_day_{i:02d}", [(f"SLIDE {i:02d}/13", MUT)], 2)
    ptext(f"score_night_{i:02d}", [(f"SLIDE {i:02d}/13", NMUT)], 2)

# ---------- merge with v1 manifest ----------
old = json.load(open(os.path.join("assets", "manifest.json")))
old.update(M)
with open(os.path.join("assets", "manifest.json"), "w") as f:
    json.dump(old, f, indent=1)
print(f"{len(M)} new sprites ->", ", ".join(sorted(M)[:12]), "...")
