"""v4 asset generator — RETHEME to the v1 "gaming pixel/voxel" theme.

Reuses v1's toolchain via importlib (the documented v2/v3/v4 pattern):
  nano-super-slides-v1/gen_assets.py -> the 5x7 bitmap font `F`, `render`,
  `text_cells` (advance 6 cells/char). "%" is added to the module font copy
  so the title "36.82% FLAWED" renders (same pattern v4 B&W used).

Everything is front-view orthographic flat squares: no iso, no dither, no
shading beyond chunky ink borders (v1 style guide rule 22).

Asset sets (RGBA transparent bg, hard cells, no AA):
  assets/*.png flat files, manifest_v4.json = {name: {w,h}} in PIXELS.

  text bitmaps (v1 scales):   kickers k02..k12 BLUE @8, titles t02..t12
                              INK @16, closer t13 WHITE @16, cover title
                              ct1/ct2 WHITE @24, cover kicker ck LBLUE @8,
                              closer kicker k13 LBLUE @8, banner WHITE @10.
  voxel art:                   runner (BLUE, 16x24 cells), cube_claude /
                              cube_codex / cube_opencode / cube_pi (11x11,
                              accent fill + white glyph C/K/O/P), machine
                              (26x46 vending, flat redraw of v3 m03),
                              cup (machineCup), heart (13x9 HUD).

Run:  ..\\.venv\\Scripts\\python gen_sprites_v4.py
"""
import importlib.util
import json
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
V1 = os.path.join(HERE, "..", "nano-super-slides-v1")


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


ga = _load("gen_assets_v1", os.path.join(V1, "gen_assets.py"))

# "%" glyph added to the v1 font copy (5x7, slash + two 2x2 blobs)
ga.F["%"] = [
    "##...",
    "##.#.",
    "...#.",
    "..#..",
    ".#...",
    "#..##",
    "...##",
]

INK = ga.INK[:3]                    # 1B1D22
BLUE = ga.BLUE[:3]                  # 2F6FED
WHITE = ga.WHITE[:3]                # F5F6F8
LBLUE = ga.LBLUE[:3]                # 7CB0FF
GREEN = (0x16, 0xA3, 0x4A)          # 16A34A
AMBER = (0xD9, 0x77, 0x06)          # D97706
PURPLE = (0x7C, 0x3A, 0xED)         # 7C3AED
RED = (0xDC, 0x26, 0x26)            # DC2626
GOLD = (0xF5, 0xC8, 0x6E)           # F5C86E (machine coin slot)
CREME = (0xF2, 0xE8, 0xD5)          # F2E8D5 (machine cups)
CAB = (0x24, 0x27, 0x2F)            # 24272F (machine cabinet)
DLINE = (0x3C, 0x41, 0x4C)          # 3C414C (machine door lines)

ART_PAL = {INK, BLUE, WHITE, LBLUE, GREEN, AMBER, PURPLE, RED, GOLD, CREME, CAB, DLINE}

# ---------- text bitmaps (v1 renderer, v1 scales) ----------
TEXTS = [
    # kickers (BLUE, scale 8) — light slides
    ("k02", "THE PROBLEM \u00b7 FRAGMENTATION", BLUE, 8),
    ("k03", "HARNESS SURVEY \u00b7 1 OF 4", BLUE, 8),
    ("k04", "HARNESS SURVEY \u00b7 2 OF 4", BLUE, 8),
    ("k05", "HARNESS SURVEY \u00b7 3 OF 4", BLUE, 8),
    ("k06", "HARNESS SURVEY \u00b7 4 OF 4", BLUE, 8),
    ("k07", "THE STANDARDS LAYER", BLUE, 8),
    ("k08", "REGISTRIES TODAY", BLUE, 8),
    ("k09", "SECURITY \u00b7 TRUST MODEL", BLUE, 8),
    ("k10", "THE DESIGN \u00b7 AGENTREG", BLUE, 8),
    ("k11", "EMITTING TO ALL FOUR", BLUE, 8),
    ("k12", "ROADMAP \u00b7 V0 TO V2", BLUE, 8),
    # titles (INK, scale 16) — light slides
    ("t02", "NO UNIFIED REGISTRY", INK, 16),
    ("t03", "CLAUDE CODE \u00b7 V2.1.302", INK, 16),
    ("t04", "CODEX \u00b7 RUST-V0.163.0", INK, 16),
    ("t05", "OPENCODE \u00b7 214K STARS", INK, 16),
    ("t06", "PI \u00b7 5,361 PACKAGES", INK, 16),
    ("t07", "AGENT SKILLS \u00b7 46 CLIENTS", INK, 16),
    ("t08", "PRIOR ART \u00b7 6 REGISTRIES", INK, 16),
    ("t09", "36.82% FLAWED", INK, 16),
    ("t10", "INDEX \u00b7 NEVER HOST", INK, 16),
    ("t11", "ONE RECORD \u00b7 4 EMISSIONS", INK, 16),
    ("t12", "MVP BY 2027-01", INK, 16),
    # cover + closer (dark slides)
    ("ck", "NANO-SUPER \u00b7 V4", LBLUE, 8),
    ("ct1", "THE UNIFIED", WHITE, 24),
    ("ct2", "AGENT REGISTRY", WHITE, 24),
    ("k13", "THANK YOU \u00b7 NEXT: AGENTREG V0", LBLUE, 8),
    ("t13", "REGISTRY BREWING", WHITE, 16),
    ("banner", "ONE REGISTRY \u00b7 EVERY AGENT", WHITE, 10),
]


def build_text(manifest):
    for name, s, col, scale in TEXTS:
        if not all(ch in ga.F for ch in s):
            raise SystemExit(f"text {name}: unrenderable chars in {s!r}")
        info = ga.render([(s, col)], scale, os.path.join(ASSETS, name + ".png"))
        manifest[name] = {"w": info["w"], "h": info["h"]}
    print(f"text: {len(TEXTS)} bitmaps (v1 render, scales 8/10/16/24)")


# ---------- voxel art helpers ----------
def box(cells, x0, y0, x1, y1, fill, border=None):
    """Axis-aligned cell rect; 1-cell chunky border in `border` when given."""
    for x in range(x0, x1 + 1):
        for y in range(y0, y1 + 1):
            edge = x in (x0, x1) or y in (y0, y1)
            cells[(x, y)] = border if (border and edge) else fill


def _rgba(col):
    c = tuple(col)
    return c if len(c) == 4 else c + (255,)


def render_cells(name, w, h, cells, n):
    img = Image.new("RGBA", (w * n, h * n), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    for (x, y), col in cells.items():
        dr.rectangle([x * n, y * n, x * n + n - 1, y * n + n - 1],
                     fill=_rgba(col))
    img.save(os.path.join(ASSETS, name + ".png"))
    return {"w": w * n, "h": h * n}


def runner_cells():
    """Front-view chunky voxel runner, BLUE body + ink borders + white eyes.
    16x24 cells. Feet flush with the bottom row (game ground = shape bottom)."""
    c = {}
    box(c, 5, 1, 10, 6, BLUE, INK)                 # head
    c[(6, 4)] = WHITE
    c[(9, 4)] = WHITE                              # eyes
    box(c, 7, 7, 8, 7, INK)                        # neck
    box(c, 4, 8, 11, 15, BLUE, INK)                # torso
    box(c, 4, 14, 11, 14, INK)                     # belt
    box(c, 1, 8, 3, 13, BLUE, INK)                 # left arm
    box(c, 12, 8, 14, 13, BLUE, INK)               # right arm
    box(c, 4, 16, 7, 21, BLUE, INK)                # left leg
    box(c, 8, 16, 11, 21, BLUE, INK)               # right leg
    box(c, 3, 22, 7, 23, INK)                      # left boot
    box(c, 8, 22, 12, 23, INK)                     # right boot
    return c, 16, 24


def cube_cells(letter, accent):
    """Skill-artifact cube, 11x11: ink border, accent fill, white glyph."""
    c = {}
    box(c, 0, 0, 10, 10, accent, INK)
    for r in range(7):
        for col in range(5):
            if ga.F[letter][r][col] == "#":
                c[(3 + col, 2 + r)] = WHITE
    return c, 11, 11


def machine_cells():
    """Front-view voxel vending machine, flat redraw of v3's m03 TALL VENDING.
    26x46 cells: CAB cabinet, DLINE door lines, dark window with CREME cup
    rows, RED/GREEN/AMBER button column, GOLD coin slot, empty dispense slot
    (machineCup is a separate shape the game reveals)."""
    c = {}
    box(c, 0, 0, 25, 45, CAB, INK)                 # cabinet + ink border
    # door lines
    for x in range(1, 25):
        c[(x, 27)] = DLINE
        c[(x, 42)] = DLINE
        c[(x, 43)] = DLINE
    for y in range(1, 45):
        c[(20, y)] = DLINE
    # window (dark glass) rows 4..24, cols 2..18
    box(c, 2, 4, 18, 24, INK, DLINE)
    for x in range(3, 18):
        c[(x, 10)] = DLINE                        # shelf 1
        c[(x, 16)] = DLINE                        # shelf 2
    # cup rows: 3 creme cups per shelf (borderless — they read as lit rows)
    for y0 in (7, 13, 19):
        for x0 in (4, 9, 14):
            box(c, x0, y0, x0 + 3, y0 + 2, CREME)
    # button column (cols 21..24)
    box(c, 21, 6, 23, 8, RED, INK)
    box(c, 21, 11, 23, 13, GREEN, INK)
    box(c, 21, 16, 23, 18, AMBER, INK)
    # gold coin slot
    box(c, 21, 22, 24, 25, GOLD, INK)
    c[(22, 24)] = INK
    c[(23, 24)] = INK
    # dispense slot (empty — machineCup is revealed here by the engine)
    box(c, 3, 30, 17, 40, INK, DLINE)
    for x in range(3, 18):
        c[(x, 36)] = DLINE                        # flap line
    box(c, 10, 38, 10, 39, DLINE)                 # handle
    return c, 26, 46


def cup_cells():
    """machineCup — creme cup with ink rim, 8x6 cells."""
    c = {}
    box(c, 0, 0, 6, 5, CREME, INK)
    for y in (1, 2, 3):
        c[(7, y)] = INK                           # handle
    return c, 8, 6


def heart_cells():
    """Pixel heart, RED fill + ink outline, 13x9 cells."""
    rows = [
        ".IIII..IIII.",
        "IRRRRIIRRRRI",
        "IRRRRRRRRRRI",
        "IRRRRRRRRRRI",
        ".IRRRRRRRRI.",
        "..IRRRRRI...",
        "...IRRRI....",
        "....IRI.....",
        ".....I......",
    ]
    c = {}
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == "I":
                c[(x, y)] = INK
            elif ch == "R":
                c[(x, y)] = RED
    return c, 13, 9


def build_art(manifest):
    c, w, h = runner_cells()
    manifest["runner"] = render_cells("runner", w, h, c, 10)
    for name, letter, accent in (("cube_claude", "C", AMBER),
                                 ("cube_codex", "K", GREEN),
                                 ("cube_opencode", "O", BLUE),
                                 ("cube_pi", "P", PURPLE)):
        c, w, h = cube_cells(letter, accent)
        manifest[name] = render_cells(name, w, h, c, 10)
    c, w, h = machine_cells()
    manifest["machine"] = render_cells("machine", w, h, c, 8)
    c, w, h = cup_cells()
    manifest["cup"] = render_cells("cup", w, h, c, 8)
    c, w, h = heart_cells()
    manifest["heart"] = render_cells("heart", w, h, c, 6)
    print("art: runner + 4 cubes + machine + cup + heart (flat voxel, no AA)")


# ---------- verification ----------
def verify(manifest):
    ok = True

    def fail(msg):
        nonlocal ok
        ok = False
        print(f"FAIL {msg}")

    for name, dims in manifest.items():
        path = os.path.join(ASSETS, name + ".png")
        if not (os.path.isfile(path) and os.path.getsize(path) > 0):
            fail(f"missing/empty {name}")
            continue
        if Image.open(path).size != (dims["w"], dims["h"]):
            fail(f"{name}: px {Image.open(path).size} != {dims}")
    print(f"[1] existence + dims: {len(manifest)} files")

    text_names = {n for n, _, _, _ in TEXTS}
    bad = []
    for name in manifest:
        img = Image.open(os.path.join(ASSETS, name + ".png")).convert("RGBA")
        for p in img.getdata():
            if p[3] != 0 and p[:3] not in (ART_PAL if name not in text_names
                                           else {INK, BLUE, WHITE, LBLUE}):
                bad.append(name)
                break
    print(f"[2] palette discipline: {'PASS' if not bad else 'FAIL ' + str(sorted(set(bad)))}")
    if bad:
        ok = False

    # runner/machine/cubes must contain ink borders + accent fills
    for name, need in (("runner", {INK, BLUE, WHITE}), ("machine", {INK, CAB, DLINE, CREME, RED, GREEN, AMBER, GOLD}),
                       ("cube_claude", {INK, AMBER, WHITE}), ("heart", {INK, RED})):
        img = Image.open(os.path.join(ASSETS, name + ".png")).convert("RGBA")
        got = {p[:3] for p in img.getdata() if p[3] != 0}
        if not need <= got:
            fail(f"{name}: missing colors {need - got}")
    print("[3] art composition: PASS" if ok else "[3] see failures")

    print(f"\nVERIFY: {'ALL PASS' if ok else 'FAILURES ABOVE'}")
    return ok


def main():
    os.makedirs(ASSETS, exist_ok=True)
    manifest = {}
    build_text(manifest)
    build_art(manifest)
    with open(os.path.join(ASSETS, "manifest_v4.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print(f"{len(manifest)} manifest entries -> assets/manifest_v4.json")
    verify(manifest)


if __name__ == "__main__":
    main()
