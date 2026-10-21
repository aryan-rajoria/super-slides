"""v5 asset generator — "Building Our Own Registry" deck (45 slides).

Same v1 pixel/voxel house style and toolchain as v4 (importlib load of
nano-super-slides-v1/gen_assets.py -> 5x7 bitmap font F + render).

READABILITY RULE (v5): pixel bitmaps are HEADINGS ONLY — cover/kicker/title
bitmaps below. All body text is native Segoe UI / Consolas in build_v5.js.

Structure (45 slides):
  1 cover (dark) · 2 how-to-read · 3 data model · 4 translation matrix ·
  5-44 TEN per-surface sections x 4 slides (matrix-row order: SKILLS,
  COMMANDS, SUBAGENTS, HOOKS, PLUGINS, MCP, LSP, CUSTOM TOOLS, STATUS
  LINE, EXEC POLICY) · 45 closer (dark).

  - section i (1-based) = slides 5+4(i-1)..8+4(i-1): banner · standards ·
    claude+codex pair · opencode+pi pair
  - every light-slide kicker is BLUE (no accent kickers remain):
    skb/sks/skc/sko per section — "S · i OF 10[ · SPEC | · CLAUDE + CODEX
    | · OPENCODE + PI]"; frame kickers k02-k04 stay BLUE too
  - srf = shared surface title (banner + both pair slides); st = the
    per-surface standards title
  - voxel art: runner, cube_claude/codex/opencode/pi, machine, cup
    (no game in v5 — machine is static closer art)

Run:  ..\\.venv\\Scripts\\python gen_sprites_v5.py
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
# headings are INK or BLUE (cover uses WHITE/LBLUE); body text is native (not bitmaps)
TEXT_PAL = {INK, BLUE, WHITE, LBLUE, GREEN, AMBER, PURPLE}

# ---------- heading bitmaps ----------
# the 10 surfaces in matrix order — one 4-slide section each (slides 5-44)
SURFACES = [
    "SKILLS", "COMMANDS", "SUBAGENTS", "HOOKS", "PLUGINS",
    "MCP", "LSP", "CUSTOM TOOLS", "STATUS LINE", "EXEC POLICY",
]
# standards-slide titles, fixed list in the same matrix order
ST_TITLES = [
    "THE SKILL.MD CONTRACT", "NO OWN SPEC", "THE DE-FACTO FORMATS", "THE HOOKS JSON SHAPE",
    "THE PLUGIN.JSON CONTRACT", "MCP CONFIG + SERVER.JSON", "NO LSP STANDARD",
    "NO TOOL SPECIFICATION", "NO STATUSLINE STANDARD", "NO POLICY STANDARD",
]

TEXTS = [
    # cover (dark)
    ("ck", "NANO-SUPER · V5", LBLUE, 8),
    ("ct1", "BUILDING OUR", WHITE, 24),
    ("ct2", "OWN REGISTRY", WHITE, 24),
    # frame slides (light)
    ("k02", "HOW TO READ THIS DECK", BLUE, 8),
    ("t02", "THE CARD CONTRACT", INK, 16),
    ("k03", "THE DATA MODEL", BLUE, 8),
    ("t03", "ONE RECORD · 4 EMISSIONS", INK, 16),
    # matrix — slide 4 (user moved it up from 24 on 2026-10-20)
    ("k04", "THE CHEAT SHEET", BLUE, 8),
    ("t04", "TRANSLATION MATRIX", INK, 16),
    # closer (dark) — non-numeric keys so slide renumbering can never collide
    ("kz", "THANK YOU · NOW GO EMIT", LBLUE, 8),
    ("tz", "ONE REGISTRY · EVERY AGENT", WHITE, 16),
]
# section i = 1..10 (slides 5..44): shared INK titles + four BLUE kickers.
# srf = surface title (banner + both pair slides) · st = standards title
for i, S in enumerate(SURFACES, 1):
    TEXTS.append((f"srf{i}", S, INK, 16))
    TEXTS.append((f"st{i}", ST_TITLES[i - 1], INK, 16))
    TEXTS.append((f"skb{i}", f"{S} · {i} OF 10", BLUE, 8))
    TEXTS.append((f"sks{i}", f"{S} · {i} OF 10 · SPEC", BLUE, 8))
    TEXTS.append((f"skc{i}", f"{S} · {i} OF 10 · CLAUDE + CODEX", BLUE, 8))
    TEXTS.append((f"sko{i}", f"{S} · {i} OF 10 · OPENCODE + PI", BLUE, 8))


def build_text(manifest):
    for name, s, col, scale in TEXTS:
        if not all(ch in ga.F for ch in s):
            raise SystemExit(f"text {name}: unrenderable chars in {s!r}")
        info = ga.render([(s, col)], scale, os.path.join(ASSETS, name + ".png"))
        manifest[name] = {"w": info["w"], "h": info["h"]}
    print(f"text: {len(TEXTS)} heading bitmaps (11 fixed + {len(SURFACES)} surface sections x 6)")


# ---------- voxel art helpers (v4 pattern, unchanged) ----------
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
    16x24 cells. Feet flush with the bottom row."""
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
    """Front-view voxel vending machine (v4 redraw). 26x46 cells."""
    c = {}
    box(c, 0, 0, 25, 45, CAB, INK)                 # cabinet + ink border
    for x in range(1, 25):
        c[(x, 27)] = DLINE
        c[(x, 42)] = DLINE
        c[(x, 43)] = DLINE
    for y in range(1, 45):
        c[(20, y)] = DLINE
    box(c, 2, 4, 18, 24, INK, DLINE)               # window (dark glass)
    for x in range(3, 18):
        c[(x, 10)] = DLINE                         # shelf 1
        c[(x, 16)] = DLINE                         # shelf 2
    for y0 in (7, 13, 19):
        for x0 in (4, 9, 14):
            box(c, x0, y0, x0 + 3, y0 + 2, CREME)  # cup rows
    box(c, 21, 6, 23, 8, RED, INK)                 # button column
    box(c, 21, 11, 23, 13, GREEN, INK)
    box(c, 21, 16, 23, 18, AMBER, INK)
    box(c, 21, 22, 24, 25, GOLD, INK)              # gold coin slot
    c[(22, 24)] = INK
    c[(23, 24)] = INK
    box(c, 3, 30, 17, 40, INK, DLINE)              # dispense slot
    for x in range(3, 18):
        c[(x, 36)] = DLINE                         # flap line
    box(c, 10, 38, 10, 39, DLINE)                  # handle
    return c, 26, 46


def cup_cells():
    """machineCup — creme cup with ink rim, 8x6 cells."""
    c = {}
    box(c, 0, 0, 6, 5, CREME, INK)
    for y in (1, 2, 3):
        c[(7, y)] = INK                             # handle
    return c, 8, 6


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
    print("art: runner + 4 cubes + machine + cup (flat voxel, no AA)")


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
            fail(f"{name}: px {Image.Open(path).size} != {dims}")
    print(f"[1] existence + dims: {len(manifest)} files")

    bad = []
    for name in manifest:
        img = Image.open(os.path.join(ASSETS, name + ".png")).convert("RGBA")
        for p in img.getdata():
            if p[3] != 0 and p[:3] not in ART_PAL | TEXT_PAL:
                bad.append(name)
                break
    print(f"[2] palette discipline: {'PASS' if not bad else 'FAIL ' + str(sorted(set(bad)))}")
    if bad:
        ok = False

    for name, need in (("runner", {INK, BLUE, WHITE}), ("machine", {INK, CAB, DLINE, CREME, RED, GREEN, AMBER, GOLD}),
                       ("cube_claude", {INK, AMBER, WHITE}), ("cube_pi", {INK, PURPLE, WHITE})):
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
    with open(os.path.join(ASSETS, "manifest_v5.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print(f"{len(manifest)} manifest entries -> assets/manifest_v5.json")
    verify(manifest)


if __name__ == "__main__":
    main()
