"""Black-and-white "dino style" regeneration of the v2 Coffee-Quest sprite
inventory for the v3 size/palette showcase deck (CONTRACT.md section 5).

Five game asset sets under assets/: m1_1 g2_2 m1_3 g2_4 m1_5 -- the folder
name is <palette><px-per-cell> (m1 = strict 1-bit ink, g2 = ink + 2 grays),
plus one ink-only content-text set in assets/text/. The pixel maps are the
v2 cell grids verbatim; only the palette and the CONTRACT-mandated
outline / transparent-hole treatment change. The v1 5x7 bitmap font is
loaded via importlib exactly like v2 line 16. Every set is constructed
directly at its own px/cell with integer rectangle fills -- no resampling.

Run from this folder:
    ..\\.venv\\Scripts\\python gen_sprites_bw.py
"""
import importlib.util
import json
import os
import random

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
V1 = os.path.join(HERE, "..", "nano-super-slides-v1", "gen_assets.py")
spec = importlib.util.spec_from_file_location("gen_assets_v1", V1)
ga = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ga)

FONT = dict(ga.F)  # 5x7 bitmap font (a copy; the v1 file stays untouched)
FONT["\u2014"] = [  # em-dash (missing from the v1 font): thick full-width dash
    ".....", ".....", ".....", "#####", "#####", ".....", ".....",
]
ADV = ga.ADV  # 5 cells glyph + 1 cell spacing

# ---------- v3 palette (CONTRACT 0 / 5) ----------
INK = (0x1B, 0x1D, 0x22)
MID = (0x5C, 0x60, 0x68)
LIGHT = (0x9A, 0xA0, 0xAB)

PALETTES = {
    # semantic role -> concrete RGB; mono1 collapses every role to ink
    "mono1": {"INK": INK, "MID": INK, "LIGHT": INK, "FACADE": INK, "SCORE": INK},
    "gray2": {"INK": INK, "MID": MID, "LIGHT": LIGHT, "FACADE": LIGHT, "SCORE": MID},
}

# v2 palette letter -> semantic role; letters absent here render transparent
BASE_REMAP = {
    "k": "INK", "h": "INK", "H": "INK", "p": "INK", "P": "INK",  # ink/pants/hair
    "D": "INK", "r": "INK",
    "s": "LIGHT", "S": "LIGHT", "e": "LIGHT", "G": "LIGHT", "Q": "LIGHT",
    "R": "LIGHT", "L": "LIGHT", "A": "LIGHT", "W": "LIGHT", "f": "LIGHT",
    "B": "MID", "b": "MID", "o": "MID", "O": "MID", "n": "MID", "N": "MID",
    "g": "MID", "d": "MID", "q": "MID", "m": "MID", "E": "MID",
}


def grid_cells(rows, remap=None, mask=False):
    """v2 letter grid -> (w, h, {(x, y): role}). mask=True keeps every
    non-'.' cell (solid mask for the outline pass)."""
    rm = dict(BASE_REMAP)
    if remap:
        rm.update(remap)
    cells = {}
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == ".":
                continue
            if mask:
                cells[(x, y)] = "MASK"
            else:
                role = rm.get(ch)
                if role is not None:
                    cells[(x, y)] = role
    return len(rows[0]), len(rows), cells


def outline_cells(w, h, cells, role):
    """Generic outline pass (CONTRACT 5): render the shape as a solid mask,
    keep only pixels with at least one transparent 4-neighbour (erode the
    mask and subtract); the interior becomes transparent."""
    mask = set(cells)
    out = {}
    for x, y in mask:
        if ((x + 1, y) not in mask or (x - 1, y) not in mask
                or (x, y + 1) not in mask or (x, y - 1) not in mask):
            out[(x, y)] = role
    return w, h, out


def text_cells(s):
    return max(1, len(s) * ADV - 1)


def text_sprite(text, role, shadow=None):
    """5x7 bitmap text -> cell grid; optional 1-cell drop-shadow row."""
    assert all(ch in FONT for ch in text), text
    pix = []
    x0 = 0
    for ch in text:
        glyph = FONT[ch]
        for r in range(7):
            for c in range(5):
                if glyph[r][c] == "#":
                    pix.append((x0 + c, r))
        x0 += ADV
    cells = {}
    if shadow:  # painted first, so the ink strokes overwrite their shadow
        for x, y in pix:
            cells[(x, y + 1)] = shadow
    for x, y in pix:
        cells[(x, y)] = role
    return text_cells(text), 7 + (1 if shadow else 0), cells


# ---------- pixel maps (v2 verbatim) ----------
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

HEART = [
    ".rr.rr.",
    "rRrrrrr",
    "rRRrrrr",
    ".rrrrr.",
    "..rrr..",
    "...r...",
]
HEART_E = [
    ".LL.LL.",
    "LLLLLLL",
    "LLWLLLL",
    ".LLLLL.",
    "..LLL..",
    "...L...",
]

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
ROCK = [
    "..qQQqq...",
    ".qQQQqqq..",
    "qQQqqqqqq.",
    "qqqqqqqqq.",
    ".qqqqqqqq.",
]
BUSH = [
    "...gg.g...",
    "..gGgggg..",
    ".gGGgggdg.",
    "gGgggggddg",
    ".ggggdgd..",
    "..dg..d...",
]

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


# ---------- roadside signs (v2 board builder, returns rows) ----------
def sign_rows(text, fg, board="w", post="n"):
    tw = text_cells(text)
    bw, bh = tw + 4, 11  # board with 2-cell padding
    rows = []
    rows.append("k" * bw)
    rows.append("k" + board * (bw - 2) + "k")
    for fr in range(7):
        r = ["k", board, board]
        for ch in text:
            glyph = FONT[ch]
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
    return rows


# board fill letters -> transparent, sign text always ink (both palettes)
SIGN_REMAP = {"w": None, "W": None, "B": "INK", "r": "INK", "q": "INK"}


# ---------- coffee machine (v2 builder, returns rows) ----------
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


def machine_rows(light, cup):
    w, h = 20, 22
    c = mk(w, h)
    box(c, 0, 0, w - 1, h - 1, "k")          # shell
    box(c, 1, 1, w - 2, h - 2, "D")          # body
    c[1][6] = {"off": "L", "on": "A", "done": "G"}[light]  # status light
    # screen: cols 2-10, rows 3-9
    box(c, 2, 3, 10, 9, "k")
    box(c, 3, 4, 9, 8, "E")
    if light == "on":
        for yy in (4, 6, 8):
            c[yy][4] = "A"
            c[yy][6] = "A"
            c[yy][8] = "A"
    elif light == "done":
        box(c, 4, 5, 8, 7, "G")
        c[6][5] = "d"
        c[6][7] = "d"
    else:
        box(c, 3, 4, 9, 8, "k")
        box(c, 4, 5, 8, 7, "E")
    # pi logo on the right panel
    stamp(c, 13, 3, FONT["\u03c0"], "e")
    # bay: cols 3-16, rows 11-17
    box(c, 3, 11, 16, 17, "k")
    box(c, 4, 12, 15, 16, "E")
    # spout
    box(c, 9, 12, 11, 13, "k")
    box(c, 10, 12, 10, 13, "E")
    if cup is None:
        box(c, 9, 15, 11, 16, "E")
    else:
        box(c, 9, 15, 11, 16, "w")           # cup body -> transparent hole
        if cup == "full":
            c[15][10] = "o"                  # coffee surface
    # base
    box(c, 1, 20, w - 2, 20, "N")
    return ["".join(r) for r in c]


# ---------- seamless skyline (v2 skyline_day replicated, cell-granular) ----------
def skyline_cells():
    """Replicates v2's skyline_day exactly (seed 42, same rng consumption
    order, so the building layout matches v2), then re-renders at cell
    granularity: facades solid, window pixels punched transparent."""
    w_px, h_px, maxh, cell = 2560, 48, 16, 3  # v2 pixel space
    rng = random.Random(42)  # v2: 42 because "day" is in the name
    rects = [(0, h_px - cell, w_px - 1, h_px - 1)]  # base ground strip
    x = 0
    while x < w_px:
        bw = rng.randrange(10, 22) * cell     # building width
        bh = rng.randrange(6, maxh) * cell
        top = h_px - cell - bh
        rects.append((x, top, x + bw - 2, h_px - cell - 1))   # facade
        rects.append((x, top, x + cell - 1, h_px - cell - 1))  # left-lit edge
        # windows: not drawn (punched transparent), but the rng.random()
        # calls are still made so the rng stream stays identical to v2
        for _wy in range(top + 2 * cell, h_px - 2 * cell, 3 * cell):
            for _wx in range(x + 2 * cell, x + bw - 3 * cell, 3 * cell):
                rng.random()
        x += bw + rng.randrange(2, 5) * cell
    w = -(-w_px // cell)  # 854 cells (v2's 2560 px clipped, same as PIL did)
    cells = {}
    for x0, y0, x1, y1 in rects:
        for cy in range(y0 // cell, y1 // cell + 1):
            for cx in range(x0 // cell, x1 // cell + 1):
                if cx < w:
                    cells[(cx, cy)] = "FACADE"
    return w, h_px // cell, cells


# ---------- sprite inventory (structure shared by all sets) ----------
def build_sprites(palette):
    s = {}
    s["man_runA"] = grid_cells(HEAD + TORSO_MUG_EMPTY + LEGS_A)
    s["man_runB"] = grid_cells(HEAD + TORSO_MUG_EMPTY + LEGS_B)
    s["man_jump"] = grid_cells(HEAD + TORSO_MUG_EMPTY + LEGS_JUMP)
    s["man_idle"] = grid_cells(HEAD + TORSO_MUG_FULL + LEGS_B)
    s["heart_full"] = grid_cells(HEART)  # stays solid: ink + light highlight
    s["heart_empty"] = outline_cells(*grid_cells(HEART_E, mask=True), "LIGHT")
    s["cactus"] = grid_cells(CACTUS)
    s["rock"] = grid_cells(ROCK)
    s["bush"] = grid_cells(BUSH)
    s["sign_coffee"] = grid_cells(sign_rows("COFFEE \u2192", "B"), remap=SIGN_REMAP)
    s["sign_nocoffee"] = grid_cells(sign_rows("NO COFFEE", "r"), remap=SIGN_REMAP)
    s["sign_closed"] = grid_cells(sign_rows("CLOSED", "q"), remap=SIGN_REMAP)
    s["cloud1"] = outline_cells(*grid_cells(CLOUD1, mask=True), "LIGHT")
    s["cloud2"] = outline_cells(*grid_cells(CLOUD2, mask=True), "LIGHT")
    s["skyline_day"] = skyline_cells()
    s["machine_off"] = grid_cells(machine_rows("off", None))
    s["machine_on"] = grid_cells(machine_rows("on", "empty"))
    s["machine_done"] = grid_cells(machine_rows("done", "full"))
    s["steam1"] = grid_cells(STEAM1, remap={"w": None})
    s["steam2"] = grid_cells(STEAM2, remap={"w": None})
    s["coffee_acquired"] = text_sprite(
        "COFFEE ACQUIRED", "INK",
        shadow="LIGHT" if palette == "gray2" else None)
    for i in range(1, 6):
        s[f"scoretag_{i:02d}"] = text_sprite(f"SLIDE {i}/5", "SCORE")
    return s


def render(name, w, h, cells, cols, n, outdir):
    img = Image.new("RGBA", (w * n, h * n), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    for (x, y), role in cells.items():
        col = cols[role]
        dr.rectangle([x * n, y * n, x * n + n - 1, y * n + n - 1],
                     fill=col + (255,))
    img.save(os.path.join(outdir, f"{name}.png"))


def main():
    manifest = {}
    set_defs = [("m1_1", 1, "mono1"), ("g2_2", 2, "gray2"),
                ("m1_3", 3, "mono1"), ("g2_4", 4, "gray2"),
                ("m1_5", 5, "mono1")]
    for folder, n, pal in set_defs:
        cols = PALETTES[pal]
        outdir = os.path.join(ASSETS, folder)
        os.makedirs(outdir, exist_ok=True)
        sprites = build_sprites(pal)
        for name, (w, h, cells) in sprites.items():
            render(name, w, h, cells, cols, n, outdir)
            manifest[f"{folder}/{name}"] = {"w": w, "h": h}
        print(f"{folder}: {len(sprites)} sprites at {n} px/cell ({pal})")

    # content text set: 3 px/cell, ink only (CONTRACT 3/5)
    words = ["MICRO", "SMALL", "CLASSIC", "CHUNKY", "JUMBO"]
    tails = ["ONE-BIT", "GRAY", "ONE-BIT", "GRAY", "ONE-BIT"]
    textdir = os.path.join(ASSETS, "text")
    os.makedirs(textdir, exist_ok=True)
    for i in range(1, 6):
        strings = [
            (f"v3k{i:02d}", f"SIZE LAB {i:02d}/05 \u2014 {tails[i - 1]}"),
            (f"v3t{i:02d}", f"{words[i - 1]} \u2014 {i}PX CELLS"),
        ]
        for name, text in strings:
            w, h, cells = text_sprite(text, "INK")
            render(name, w, h, cells, {"INK": INK}, 3, textdir)
            manifest[f"text/{name}"] = {"w": w, "h": h}
    print(f"text: 10 sprites at 3 px/cell (ink only)")

    with open(os.path.join(ASSETS, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print(f"{len(manifest)} manifest entries -> assets/manifest.json")


if __name__ == "__main__":
    main()
