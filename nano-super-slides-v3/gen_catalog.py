"""Style-catalog asset generator (CATALOG-SPEC.md) for the picker deck.

Produces assets/catalog/{run,machine,chest,text}/ + manifest.json:
  run     r01..r10 x idle/runA/runB  -- ink-only 16-cell figures, 4 px/cell.
           Stick styles are drawn by a parametric skeleton + Bresenham line /
           midpoint-circle rasterizer on the cell grid (no hand-typed maps).
  machine m01..m08                   -- colored pixel art, 4 px/cell.
  chest   c01..c08 (+open variants)  -- ink + col, 4 px/cell (c07 mini 1 px/cell).
  text    tk, tt01..03, lr*, lm*, lc* -- 3 px/cell ink bitmaps.

Run from this folder:
    ..\\.venv\\Scripts\\python gen_catalog.py
"""
import importlib.util
import json
import math
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
CAT = os.path.join(HERE, "assets", "catalog")
V1 = os.path.join(HERE, "..", "nano-super-slides-v1", "gen_assets.py")
spec = importlib.util.spec_from_file_location("gen_assets_v1", V1)
ga = importlib.util.module_from_spec(spec)
spec.loader.exec_module(ga)

FONT = dict(ga.F)  # 5x7 bitmap font (copy; the v1 file stays untouched)
FONT["\u00c9"] = [  # E-acute (missing from the v1 font): accent row + 6-row E
    "..#..",
    "#####",
    "#....",
    "####.",
    "#....",
    "#....",
    "#####",
]
ADV = ga.ADV  # 5 cells glyph + 1 cell spacing

# ---------- palette (CATALOG-SPEC hard rules) ----------
INK = (0x1B, 0x1D, 0x22)
BLUE = (0x2F, 0x6F, 0xED)
GREEN = (0x16, 0xA3, 0x4A)
AMBER = (0xD9, 0x77, 0x06)
RED = (0xDC, 0x26, 0x26)
BROWN = (0x8A, 0x5A, 0x2B)
DBROWN = (0x6B, 0x44, 0x20)
CREME = (0xF2, 0xE8, 0xD5)
GOLD = (0xF5, 0xC8, 0x6E)
WOOD = (0xA0, 0x67, 0x3F)
METAL = (0x55, 0x5B, 0x66)
LMETAL = (0x9A, 0xA0, 0xAB)

PAL = {"k": INK, "b": BLUE, "g": GREEN, "a": AMBER, "r": RED, "n": BROWN,
       "d": DBROWN, "c": CREME, "o": GOLD, "w": WOOD, "m": METAL, "l": LMETAL}
PALETTE_RGB = tuple(PAL.values())
PALETTE_SET = set(PALETTE_RGB)


def R(x):
    """Round half up (avoid banker's rounding)."""
    return int(math.floor(x + 0.5))


# ---------- cell-grid rasterizer primitives ----------
def bres(p0, p1):
    """Integer Bresenham line between two cell points."""
    x0, y0 = p0
    x1, y1 = p1
    dx = abs(x1 - x0)
    dy = -abs(y1 - y0)
    sx = 1 if x0 < x1 else -1
    sy = 1 if y0 < y1 else -1
    err = dx + dy
    pts = []
    while True:
        pts.append((x0, y0))
        if x0 == x1 and y0 == y1:
            break
        e2 = 2 * err
        if e2 >= dy:
            err += dy
            x0 += sx
        if e2 <= dx:
            err += dx
            y0 += sy
    return pts


def ring(cx, cy, r):
    """Midpoint circle -> set of ring cells (1-cell stroke)."""
    x, y = r, 0
    err = 1 - r
    out = set()
    while x >= y:
        for px, py in ((x, y), (y, x), (-x, y), (-y, x),
                       (x, -y), (y, -x), (-x, -y), (-y, -x)):
            out.add((cx + px, cy + py))
        y += 1
        if err < 0:
            err += 2 * y + 1
        else:
            x -= 1
            err += 2 * (y - x + 1)
    return out


def disc(cx, cy, r):
    """Filled round blob (midpoint-ish distance disc)."""
    out = set()
    for dy in range(-r, r + 1):
        for dx in range(-r, r + 1):
            if dx * dx + dy * dy <= r * r + max(1, r // 2):
                out.add((cx + dx, cy + dy))
    return out


def ell(cx, cy, rx, ry):
    """Filled ellipse."""
    out = set()
    for dy in range(-ry, ry + 1):
        for dx in range(-rx, rx + 1):
            if (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1.06:
                out.add((cx + dx, cy + dy))
    return out


def seg_thick(p0, p1, thick=1):
    """Line cells; thick=2 adds a perpendicular cell (rectangular bar)."""
    cells = set(bres(p0, p1))
    if thick == 2:
        dx, dy = p1[0] - p0[0], p1[1] - p0[1]
        if abs(dy) >= abs(dx):
            cells |= {(x + 1, y) for x, y in cells}
        else:
            cells |= {(x, y + 1) for x, y in cells}
    return cells


def sq_dilate(cells):
    """Square 2x2 dilation (chunky 8-bit strokes with squared joints)."""
    out = set()
    for x, y in cells:
        out |= {(x, y), (x + 1, y), (x, y + 1), (x + 1, y + 1)}
    return out


def outline_pass(cells, val=None):
    """Erode-and-subtract: keep only mask cells with a transparent
    4-neighbour (the v3 outline treatment)."""
    mask = set(cells)
    return {(x, y) for x, y in mask
            if ((x + 1, y) not in mask or (x - 1, y) not in mask
                or (x, y + 1) not in mask or (x, y - 1) not in mask)} if val is None else \
        {(x, y): val for x, y in mask
         if ((x + 1, y) not in mask or (x - 1, y) not in mask
             or (x, y + 1) not in mask or (x, y - 1) not in mask)}


# ---------- shared human skeleton (facing right, +x forward) ----------
def std_figure(frame, lean_deg=0.0):
    """Parametric stick skeleton on the 13x16 cell canvas.
    Returns head center, torso/limb polylines and foot points."""
    hip = (6, 10 if frame in ("idle", "runA") else 9)  # runB = passing bob
    s = math.sin(math.radians(lean_deg))
    co = math.cos(math.radians(lean_deg))
    neck = (hip[0] + R(s * 5), hip[1] - R(co * 5))
    head = (neck[0] + R(s * 2.5), neck[1] - R(co * 2.5))
    sh = (neck[0], neck[1] + 1)  # shoulder

    if frame == "idle":
        armF = [sh, (sh[0] + 3, sh[1] + 3)]
        armB = [sh, (sh[0] - 3, sh[1] + 3)]
    elif frame == "runA":  # front arm pumps up, back arm swings down
        armF = [sh, (sh[0] + 3, sh[1] - 3)]
        armB = [sh, (sh[0] - 3, sh[1] + 3)]
    else:  # runB: arm phase swapped
        armF = [sh, (sh[0] + 3, sh[1] + 3)]
        armB = [sh, (sh[0] - 3, sh[1] - 3)]

    if frame == "idle":
        legN = [hip, (hip[0] + 1, hip[1] + 5)]
        legF = [hip, (hip[0] - 1, hip[1] + 5)]
    elif frame == "runA":  # scissor: +-30 deg straight legs
        legN = [hip, (hip[0] + 3, hip[1] + 5)]
        legF = [hip, (hip[0] - 3, hip[1] + 5)]
    else:  # runB: passing pose, back leg swings through (chevron)
        legN = [hip, (hip[0] + 3, hip[1] + 5)]
        legF = [hip, (hip[0] - 2, hip[1] + 2), (hip[0], hip[1] + 4)]

    return dict(hip=hip, neck=neck, head=head, sh=sh,
                armF=armF, armB=armB, legN=legN, legF=legF,
                feet=[legN[-1], legF[-1]])


def draw_lines(c, pts_list, thick=1):
    for pts in pts_list:
        for p0, p1 in zip(pts, pts[1:]):
            c |= seg_thick(p0, p1, thick)


# ---------- runner styles (each returns 13x16 ink cells) ----------
RW, RH = 13, 16


def r01_cells(frame):
    """STICK CLASSIC: circle head r2, straight torso, 45 deg pumping arms,
    +-30 deg scissor legs."""
    f = std_figure(frame)
    c = set()
    c |= ring(f["head"][0], f["head"][1], 2)
    draw_lines(c, [[f["hip"], f["neck"]], f["armF"], f["armB"],
                   f["legN"], f["legF"]])
    for fx, fy in f["feet"]:
        c.add((fx + 1, fy))  # forward toe pixel
    return c


def r02_cells(frame):
    """STICK DASH: 15 deg lean, tucked L arms, bent-chevron legs, speed lines."""
    hip = (6, 10)
    neck, head, sh = (7, 5), (8, 3), (7, 6)
    c = set()
    c |= ring(head[0], head[1], 2)
    if frame == "idle":
        armF = [sh, (9, 6), (9, 4)]
        armB = [sh, (5, 6), (5, 8)]
        legN = [hip, (7, 15)]
        legF = [hip, (5, 15)]
    elif frame == "runA":
        armF = [sh, (9, 6), (9, 4)]
        armB = [sh, (5, 6), (5, 8)]
        legN = [hip, (9, 12), (7, 15)]
        legF = [hip, (5, 12), (3, 14)]
    else:
        armF = [sh, (9, 6), (9, 8)]
        armB = [sh, (5, 6), (5, 4)]
        legN = [hip, (8, 13), (10, 15)]
        legF = [hip, (4, 12), (2, 13)]
    draw_lines(c, [[hip, neck], armF, armB, legN, legF])
    for fx, fy in (legN[-1], legF[-1]):
        c.add((fx + 1, fy))
    if frame != "idle":  # 2 trailing speed strokes
        c |= set(bres((1, 7), (3, 7)))
        c |= set(bres((0, 9), (2, 9)))
    return c


def r03_cells(frame):
    """CUP JOGGER: classic stick + raised leading arm holding a 2x2 cup."""
    f = std_figure(frame)
    cup_off = {"idle": (3, -2), "runA": (3, -3), "runB": (2, -3)}[frame]
    sh = f["sh"]
    armF = [sh, (sh[0] + cup_off[0], sh[1] + cup_off[1])]
    armB = f["armB"]
    c = set()
    c |= ring(f["head"][0], f["head"][1], 2)
    draw_lines(c, [[f["hip"], f["neck"]], armF, armB, f["legN"], f["legF"]])
    for fx, fy in f["feet"]:
        c.add((fx + 1, fy))
    hx, hy = armF[-1]  # hand holds the cup: 2x2 cup + handle pixel
    c |= {(hx, hy - 2), (hx + 1, hy - 2), (hx, hy - 1), (hx + 1, hy - 1)}
    c.add((hx + 2, hy - 2))
    return c


def r04_cells(frame):
    """STICK LEAN: 30 deg torso, wide stride, 3-cell scarf from the neck."""
    hip = (6, 10 if frame != "runB" else 9)
    neck = (hip[0] + 3, hip[1] - 4)
    head = (neck[0] + 1, neck[1] - 2)
    sh = (neck[0], neck[1] + 1)
    if frame == "idle":
        armF = [sh, (sh[0] + 3, sh[1] + 3)]
        armB = [sh, (sh[0] - 3, sh[1] + 3)]
        legN = [hip, (8, 12), (9, 15)]
        legF = [hip, (4, 12), (3, 15)]
    elif frame == "runA":
        armF = [sh, (sh[0] + 3, sh[1] - 3)]
        armB = [sh, (sh[0] - 3, sh[1] + 3)]
        legN = [hip, (9, 12), (11, 15)]
        legF = [hip, (3, 12), (1, 15)]
    else:
        armF = [sh, (sh[0] + 3, sh[1] + 3)]
        armB = [sh, (sh[0] - 3, sh[1] - 3)]
        legN = [hip, (9, 11), (11, 14)]
        legF = [hip, (4, 11), (2, 13)]
    c = set()
    c |= ring(head[0], head[1], 2)
    draw_lines(c, [[hip, neck], armF, armB, legN, legF])
    for fx, fy in (legN[-1], legF[-1]):
        c.add((fx + 1, fy))
    # scarf: 3-cell line trailing back from the neck
    c |= {(neck[0] - 1, neck[1] - 1), (neck[0] - 2, neck[1] - 1),
          (neck[0] - 3, neck[1] - 1)}
    return c


def r05_cells(frame):
    """BLOCKY: right angles only -- 3x3 head, 2-wide vertical torso,
    L-shaped arms/legs, no diagonals."""
    c = set()
    for x in range(4, 7):          # 3x3 square head
        for y in range(1, 4):
            c.add((x, y))
    for y in range(4, 11):         # vertical torso
        c.add((5, y))
        c.add((6, y))
    if frame == "idle":
        c |= {(x, 5) for x in range(2, 6)} | {(2, y) for y in range(5, 9)}
        c |= {(x, 5) for x in range(6, 10)} | {(9, y) for y in range(5, 9)}
        c |= {(x, y) for x in (4, 5) for y in range(11, 16)}
        c |= {(x, y) for x in (6, 7) for y in range(11, 16)}
    elif frame == "runA":
        c |= {(x, 4) for x in range(6, 10)} | {(9, y) for y in range(2, 5)}
        c |= {(x, 6) for x in range(2, 6)} | {(2, y) for y in range(6, 10)}
        c |= {(x, 11) for x in range(6, 10)}       # fwd leg: out then down
        c |= {(x, y) for x in (8, 9) for y in range(11, 16)}
        c |= {(x, y) for x in (4, 5) for y in range(11, 15)}  # back leg L
        c |= {(x, 14) for x in range(2, 6)}
        c.add((2, 15))
    else:
        c |= {(x, 5) for x in range(6, 9)} | {(8, y) for y in range(5, 8)}
        c |= {(x, 3) for x in range(2, 6)} | {(2, y) for y in range(3, 6)}
        c |= {(x, 10) for x in range(6, 9)}       # fwd leg: out then down
        c |= {(x, y) for x in (7, 8) for y in range(11, 16)}
        c |= {(x, y) for x in (4, 5) for y in range(11, 14)}  # back leg L
        c |= {(x, 13) for x in range(3, 6)}
        c.add((3, 14))
    return c


def blob_legs(c, frame):
    if frame == "idle":
        c |= {(x, y) for x in (4, 5) for y in range(12, 16)}
        c |= {(x, y) for x in (7, 8) for y in range(12, 16)}
    elif frame == "runA":
        c |= {(x, y) for x in (8, 9) for y in range(12, 16)}
        c.add((10, 15))
        c |= {(x, y) for x in (3, 4) for y in range(12, 15)}
        c.add((2, 13))
    else:
        c |= {(x, y) for x in (8, 9) for y in range(12, 16)}
        c.add((10, 14))
        c |= {(x, y) for x in (4, 5) for y in range(12, 16)}
        c.add((3, 15))


def r06_cells(frame):
    """BLOB MINI: solid dino-style silhouette -- head blob, stub legs, tail."""
    hy = 4 if frame == "runA" else 3  # slight head bob on the contact frame
    c = set()
    c |= disc(8, hy, 2)          # head blob (forward-top)
    c |= ell(6, 8, 4, 4)         # rounded body (overlaps head = thick neck)
    c |= disc(1, 8, 1)           # tail nub
    blob_legs(c, frame)
    return c


def r07_cells(frame):
    """HOLLOW: the r06 silhouette, outline only (erode-and-subtract)."""
    return outline_pass(r06_cells(frame))


def r08_cells(frame):
    """CHONK 2PX: r01 geometry with 2-cell strokes, squared joints."""
    f = std_figure(frame)
    c = set()
    c |= sq_dilate(disc(f["head"][0], f["head"][1], 2))  # solid chunky head
    thin = set()
    draw_lines(thin, [[f["hip"], f["neck"]], f["armF"], f["armB"],
                      f["legN"], f["legF"]])
    for fx, fy in f["feet"]:
        thin.add((fx + 1, fy))
    c |= sq_dilate(thin)
    return c


def r09_cells(frame):
    """GEOMETRIC: filled triangle torso, circle head, rectangular limbs."""
    f = std_figure(frame)
    c = set()
    c |= ring(f["head"][0], f["head"][1], 2)
    # filled triangle torso: wide at the shoulders -> 1 cell at the hip
    nx, ny, hx, hy = f["neck"][0], f["neck"][1], f["hip"][0], f["hip"][1]
    rows = hy - ny + 1
    for i in range(rows):
        hw = max(0, R(2.5 * (1 - i / max(1, rows - 1))))  # 2,2,1,1,0 for 5 rows
        cx = R(nx + (hx - nx) * i / max(1, rows - 1))
        for x in range(cx - hw, cx + hw + 1):
            c.add((x, ny + i))
    draw_lines(c, [f["armF"], f["armB"], f["legN"], f["legF"]], thick=2)
    for fx, fy in f["feet"]:
        c.add((fx + 1, fy))
    return c


def r10_cells(frame):
    """SHADOW: solid silhouette human with transparent 2-pixel eyes + shirt."""
    f = std_figure(frame)
    cx = f["neck"][0]
    c = set()
    c |= disc(f["head"][0], f["head"][1], 2)              # solid head
    for y in range(f["neck"][1], f["hip"][1] + 1):        # solid torso
        for x in range(cx - 2, cx + 3):
            c.add((x, y))
    draw_lines(c, [f["armF"], f["armB"], f["legN"], f["legF"]], thick=2)
    # punch transparent details
    hx, hy = f["head"]
    c -= {(hx, hy), (hx + 1, hy)}                          # 2-pixel eyes
    shirt_y = f["neck"][1] + 3
    c -= {(x, shirt_y) for x in range(cx - 1, cx + 2)}     # shirt row
    return c


RUNNERS = {"r01": r01_cells, "r02": r02_cells, "r03": r03_cells,
           "r04": r04_cells, "r05": r05_cells, "r06": r06_cells,
           "r07": r07_cells, "r08": r08_cells, "r09": r09_cells,
           "r10": r10_cells}


# ---------- letter-grid helpers (machines + chests) ----------
def gput(g, x, y, ch):
    g[(x, y)] = ch


def gbox(g, x0, y0, x1, y1, ch):
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g[(x, y)] = ch


def gfbox(g, x0, y0, x1, y1, ch):
    """Ink-framed colored box."""
    gbox(g, x0, y0, x1, y1, ch)
    for x in range(x0, x1 + 1):
        g[(x, y0)] = "k"
        g[(x, y1)] = "k"
    for y in range(y0, y1 + 1):
        g[(x0, y)] = "k"
        g[(x1, y)] = "k"


def gline(g, p0, p1, ch):
    for x, y in bres(p0, p1):
        g[(x, y)] = ch


def ghole(g, x0, y0, x1, y1):
    """Punch a rectangular transparent hole (glass, gauge face)."""
    for y in range(y0, y1 + 1):
        for x in range(x0, x1 + 1):
            g.pop((x, y), None)


def gring(g, cx, cy, r, ch):
    for x, y in ring(cx, cy, r):
        g[(x, y)] = ch


def goutline(g):
    """Outline pass on a letter grid: boundary cells of the mask -> ink."""
    mask = set(g)
    for x, y in mask:
        if ((x + 1, y) not in mask or (x - 1, y) not in mask
                or (x, y + 1) not in mask or (x, y - 1) not in mask):
            g[(x, y)] = "k"


# ---------- machines (each returns (w, h, letter grid)) ----------
def m01():
    """CLASSIC DRIP: hopper, gap band, window, buttons, carafe."""
    g = {}
    gfbox(g, 6, 1, 13, 5, "n")            # hopper (lid edge = top frame)
    gfbox(g, 2, 7, 17, 19, "m")           # body; row 6 stays transparent = gap
    gfbox(g, 4, 9, 15, 13, "l")           # window
    gbox(g, 5, 15, 6, 15, "r")            # RED + AMBER buttons
    gbox(g, 8, 15, 9, 15, "a")
    gbox(g, 14, 15, 15, 15, "g")          # GREEN light
    gbox(g, 1, 20, 18, 20, "k")           # shelf
    gbox(g, 0, 21, 1, 21, "k")            # feet under shelf ends
    gbox(g, 18, 21, 19, 21, "k")
    gbox(g, 9, 21, 10, 22, "k")           # spout
    gfbox(g, 7, 21, 12, 25, "c")          # carafe
    gbox(g, 8, 23, 11, 24, "n")           # coffee inside carafe
    return 20, 26, g


def m02():
    """ESPRESSO BOX: LMETAL box, gauge, portafilter, wand, cup."""
    g = {}
    gfbox(g, 2, 0, 15, 14, "l")           # box body
    gbox(g, 3, 2, 14, 2, "b")             # BLUE brand stripe
    gring(g, 6, 5, 2, "k")                # gauge ring
    ghole(g, 5, 4, 7, 6)                  # transparent gauge face
    gput(g, 6, 5, "a")                    # AMBER needle
    gput(g, 5, 4, "a")
    gbox(g, 6, 9, 11, 10, "k")            # group head
    gbox(g, 6, 11, 10, 11, "k")           # portafilter basket
    gbox(g, 12, 10, 15, 11, "w")          # WOOD handle
    gbox(g, 11, 10, 11, 11, "k")          # ink collar
    gbox(g, 16, 10, 16, 11, "k")          # handle tip
    gput(g, 7, 12, "k")
    gput(g, 9, 12, "k")                   # spouts
    gline(g, (15, 8), (17, 13), "k")      # steam wand
    gfbox(g, 6, 14, 10, 16, "c")          # CREME cup
    gbox(g, 7, 15, 9, 15, "n")            # espresso surface
    gbox(g, 4, 17, 12, 17, "k")           # drip tray
    gbox(g, 3, 19, 4, 19, "k")            # feet
    gbox(g, 12, 19, 13, 19, "k")
    return 18, 20, g


def m03():
    """TALL VENDING: tall cabinet, cup window, buttons, coin slot."""
    g = {}
    gfbox(g, 1, 0, 14, 29, "m")           # tall METAL cabinet
    for x in (2, 8):                      # window frame
        for y in range(2, 15):
            g[(x, y)] = "k"
    for y in (2, 14):
        for x in range(2, 9):
            g[(x, y)] = "k"
    ghole(g, 3, 3, 7, 13)                 # transparent window glass
    for ry in (4, 7, 11):                 # rows of CREME cups
        gbox(g, 3, ry, 4, ry + 1, "c")
        gbox(g, 6, ry, 7, ry + 1, "c")
    gfbox(g, 10, 3, 13, 15, "m")          # button panel
    gbox(g, 11, 4, 12, 5, "r")
    gbox(g, 11, 8, 12, 9, "g")
    gbox(g, 11, 12, 12, 13, "a")
    gfbox(g, 10, 17, 13, 21, "m")         # coin-slot panel
    gbox(g, 12, 18, 12, 20, "o")          # GOLD coin slot
    gbox(g, 3, 24, 12, 27, "k")           # cup slot (ink opening)
    gbox(g, 6, 25, 9, 26, "c")            # dispensed CREME cup
    gbox(g, 6, 25, 9, 25, "k")            # cup rim
    return 16, 30, g


def m04():
    """MOKA POT: stovetop octagon, gold waist, ink handle + knob."""
    g = {}
    gbox(g, 6, 0, 7, 1, "k")              # lid knob
    gbox(g, 4, 2, 9, 2, "k")              # octagon top edge
    gfbox(g, 3, 3, 10, 8, "d")            # DBROWN octagon chamber
    gbox(g, 4, 9, 9, 9, "k")              # octagon bottom edge
    gfbox(g, 3, 10, 10, 12, "o")          # GOLD waist band
    gfbox(g, 4, 13, 9, 15, "n")           # BROWN base taper
    gfbox(g, 2, 16, 11, 21, "n")          # base cylinder
    gbox(g, 3, 22, 10, 22, "k")           # base rim
    for y in range(3, 9):                 # ink handle arc
        gput(g, 11, y, "k")
    for y in range(9, 16):
        gput(g, 12, y, "k")
    for y in range(16, 19):
        gput(g, 11, y, "k")
    return 14, 23, g


def m05():
    """POUR-OVER: wood stand, creme cone, glass carafe."""
    g = {}
    gfbox(g, 1, 5, 3, 24, "w")            # WOOD posts
    gfbox(g, 12, 5, 14, 24, "w")
    gbox(g, 4, 7, 11, 7, "w")             # collar bar the cone rests in
    gput(g, 4, 7, "k")
    gput(g, 11, 7, "k")
    for y, (a, b) in ((8, (5, 10)), (9, (5, 10)), (10, (6, 9)),
                      (11, (6, 9))):       # CREME cone, ink edges
        gbox(g, a, y, b, y, "c")
        gput(g, a, y, "k")
        gput(g, b, y, "k")
    gbox(g, 7, 12, 8, 12, "k")            # cone tip
    gput(g, 7, 14, "n")                   # BROWN drip
    gput(g, 7, 15, "n")
    for y in (16, 17):                    # carafe neck (LMETAL glass)
        gput(g, 6, y, "l")
        gput(g, 9, y, "l")
    for y in range(18, 24):               # carafe bulb walls
        gput(g, 5, y, "l")
        gput(g, 10, y, "l")
    gbox(g, 6, 16, 9, 16, "k")            # carafe rim
    gbox(g, 6, 20, 9, 23, "n")            # BROWN coffee
    gbox(g, 5, 24, 10, 24, "l")           # carafe bottom
    gbox(g, 0, 24, 15, 24, "k")           # base top edge
    gbox(g, 0, 25, 15, 25, "w")           # wood base
    gput(g, 0, 25, "k")
    gput(g, 15, 25, "k")
    return 16, 26, g


def m06():
    """FRENCH PRESS: glass cylinder, coffee, crema, plunger."""
    g = {}
    gfbox(g, 4, 0, 6, 2, "w")             # WOOD knob
    gbox(g, 5, 3, 5, 12, "k")             # plunger rod
    gbox(g, 3, 4, 8, 4, "k")              # lid
    gbox(g, 3, 5, 3, 20, "l")             # LMETAL glass walls
    gbox(g, 8, 5, 8, 20, "l")
    gbox(g, 4, 13, 7, 13, "c")            # CREME crema line
    gbox(g, 4, 14, 7, 19, "n")            # BROWN coffee (lower half)
    gbox(g, 4, 14, 7, 14, "k")            # plunger plate
    gbox(g, 2, 21, 9, 21, "k")            # base
    gput(g, 2, 22, "k")
    gput(g, 9, 22, "k")                   # feet
    return 12, 23, g


def m07():
    """CAPSULE TOWER: slim tower, blue band, capsule drawer, cup tray."""
    g = {}
    gfbox(g, 2, 0, 7, 27, "l")            # slim LMETAL tower
    gbox(g, 3, 2, 6, 3, "b")              # BLUE band
    gfbox(g, 1, 8, 8, 16, "l")            # drawer front
    for ry in (10, 13):                   # 2x2 GOLD capsules
        gbox(g, 2, ry, 3, ry + 1, "o")
        gbox(g, 5, ry, 6, ry + 1, "o")
    gbox(g, 3, 15, 6, 15, "k")            # drawer handle
    gbox(g, 4, 17, 5, 18, "k")            # spout
    gfbox(g, 3, 19, 6, 21, "c")           # CREME cup
    gbox(g, 0, 22, 9, 22, "k")            # cup tray
    return 10, 28, g


def m08():
    """CAFE BREWER: wide body, big hopper, two taps, trays, two cups."""
    g = {}
    gfbox(g, 9, 0, 14, 4, "n")            # big BROWN hopper
    gfbox(g, 1, 5, 22, 19, "m")           # wide METAL body
    gbox(g, 3, 7, 4, 7, "g")              # GREEN ready lights
    gbox(g, 19, 7, 20, 7, "g")
    gbox(g, 4, 20, 7, 20, "o")            # GOLD tap handles
    gbox(g, 16, 20, 19, 20, "o")
    gbox(g, 5, 21, 6, 22, "k")            # ink taps
    gbox(g, 17, 21, 18, 22, "k")
    gfbox(g, 4, 23, 7, 25, "c")           # two CREME cups
    gfbox(g, 16, 23, 19, 25, "c")
    gbox(g, 3, 26, 8, 26, "k")            # drip trays
    gbox(g, 15, 26, 20, 26, "k")
    return 24, 27, g


MACHINES = [m01, m02, m03, m04, m05, m06, m07, m08]


# ---------- chests ----------
def arc_sil(g, rows, x0=0):
    """Chest lid arc silhouette: rows = {y: (a, b)} x-ranges."""
    for y, (a, b) in rows.items():
        gbox(g, a + x0, y, b + x0, y, "w")


def add_straps(g, cols, y0, y1):
    for y in range(y0, y1 + 1):
        for x in cols:
            if (x, y) in g:
                g[(x, y)] = "o"


def add_lock(g, x0, x1, y0, y1, key):
    gbox(g, x0, y0, x1, y1, "k")
    for cell in key:
        g.pop(cell, None)  # transparent keyhole


def chest_c01(open_=False):
    """CLASSIC: wood + gold bands, arc lid."""
    if not open_:
        g = {}
        arc_sil(g, {0: (6, 9), 1: (4, 11), 2: (3, 12), 3: (2, 13), 4: (2, 13)})
        gbox(g, 2, 5, 13, 10, "w")
        add_straps(g, (4, 5, 10, 11), 0, 10)
        gbox(g, 2, 4, 13, 4, "o")          # gold lid-rim band
        goutline(g)
        add_lock(g, 7, 8, 4, 7, [(7, 6), (8, 6)])
        return 16, 12, g
    g = {}
    arc_sil(g, {1: (8, 11), 2: (6, 13), 3: (5, 14), 4: (4, 15), 5: (4, 15)})
    add_straps(g, (6, 7, 12, 13), 1, 5)
    gbox(g, 4, 5, 15, 5, "o")
    gbox(g, 2, 10, 13, 15, "w")           # base
    add_straps(g, (4, 5, 10, 11), 10, 15)
    goutline(g)
    gbox(g, 4, 8, 11, 8, "o")             # gold coins visible in the box
    gbox(g, 3, 9, 12, 9, "o")
    add_lock(g, 7, 8, 10, 13, [(7, 12), (8, 12)])
    return 16, 16, g


def chest_c02(open_=False):
    """PIXEL CHUNKY: fat 8-bit chest, 2-cell strokes."""
    if not open_:
        g = {}
        gbox(g, 1, 0, 14, 11, "w")
        gbox(g, 1, 0, 14, 0, "o")
        gbox(g, 1, 3, 14, 3, "o")          # chunky gold bands
        add_straps(g, (2, 3, 12, 13), 0, 11)
        goutline(g)
        add_lock(g, 6, 9, 3, 8, [(7, 5), (8, 5), (7, 6), (8, 6)])
        return 16, 12, g
    g = {}
    gbox(g, 3, 1, 14, 4, "w")              # raised lid slab
    gbox(g, 3, 1, 14, 1, "o")
    gbox(g, 3, 4, 14, 4, "o")
    add_straps(g, (4, 5, 12, 13), 1, 4)
    gbox(g, 1, 9, 14, 15, "w")            # base
    add_straps(g, (2, 3, 12, 13), 9, 15)
    goutline(g)
    gbox(g, 3, 7, 12, 7, "o")             # chunky coin rows
    gbox(g, 2, 8, 13, 8, "o")
    add_lock(g, 6, 9, 9, 13, [(7, 11), (8, 11), (7, 12), (8, 12)])
    return 16, 16, g


def chest_c03(open_=False):
    """IRON VAULT: metal body, LMETAL bands + rivets, heavy lock."""
    if not open_:
        g = {}
        gbox(g, 1, 1, 14, 10, "m")
        for x in (4, 5, 10, 11):
            for y in range(1, 11):
                g[(x, y)] = "l"
        gbox(g, 1, 5, 14, 6, "l")          # cross band
        for cell in ((2, 2), (13, 2), (2, 9), (13, 9)):
            gput(g, *cell, "l")            # rivets
        goutline(g)
        gbox(g, 6, 4, 9, 8, "k")           # heavy lock
        gbox(g, 7, 5, 8, 6, "o")           # gold keyhole
        return 16, 12, g
    g = {}
    gbox(g, 2, 0, 13, 6, "m")              # raised vault door
    for x in (5, 6, 9, 10):
        for y in range(0, 7):
            g[(x, y)] = "l"
    for cell in ((3, 1), (12, 1), (3, 5), (12, 5)):
        gput(g, *cell, "l")
    goutline(g)
    gbox(g, 7, 2, 8, 4, "k")               # door wheel
    gput(g, 5, 3, "k")
    gput(g, 10, 3, "k")
    gbox(g, 1, 9, 14, 15, "m")            # open vault base
    for x in (4, 5, 10, 11):
        for y in range(9, 16):
            g[(x, y)] = "l"
    goutline(g)
    gbox(g, 4, 7, 11, 7, "o")             # coins
    gbox(g, 3, 8, 12, 8, "o")
    return 16, 16, g


def chest_c04(open_=False):
    """MAGICAL: wood + amber glow seams + gold sparkles (open: glow beam)."""
    if not open_:
        g = {}
        gbox(g, 2, 0, 13, 10, "w")
        gbox(g, 2, 3, 13, 3, "a")          # amber lid seam
        gbox(g, 2, 9, 13, 9, "a")          # amber base seam
        goutline(g)
        for x, y in ((6, 2), (7, 2), (8, 2), (9, 2), (6, 3), (9, 3),
                     (6, 4), (9, 4), (6, 5), (7, 5), (8, 5), (9, 5)):
            gput(g, x, y, "k")             # ink ring
        gbox(g, 7, 3, 8, 4, "o")           # gold lock
        for cell in ((0, 1), (15, 3), (0, 8), (15, 9), (1, 11)):
            gput(g, *cell, "o")            # gold sparkle pixels
        return 16, 12, g
    g = {}
    gbox(g, 2, 10, 13, 15, "w")            # base
    gbox(g, 2, 11, 13, 11, "a")            # amber seam (inside the rim)
    goutline(g)
    for y in range(0, 6):                  # GOLD glow beam
        gbox(g, 6, y, 9, y, "o")
        gput(g, 5, y, "a")
        gput(g, 10, y, "a")
    gbox(g, 4, 9, 11, 9, "o")             # coins inside
    for cell in ((0, 2), (15, 4), (1, 8)):
        gput(g, *cell, "o")
    return 16, 16, g


def chest_c05(open_=False):
    """CRATE: plain wood planks + ink outline."""
    g = {}
    gbox(g, 1, 0, 14, 11, "w")
    goutline(g)
    for y in (4, 8):                       # plank seams
        gbox(g, 1, y, 14, y, "k")
    return 16, 12, g


def chest_c06(open_=False):
    """ROYAL: dbrown + gold trim + red/blue gems."""
    g = {}
    gbox(g, 1, 0, 14, 10, "d")
    goutline(g)
    gbox(g, 1, 0, 14, 0, "o")              # gold trim: lid edge
    gbox(g, 1, 10, 14, 10, "o")            # base edge
    for y in range(1, 10):
        gput(g, 1, y, "o")
        gput(g, 14, y, "o")
    for gx, gy, ch in ((4, 5, "r"), (10, 5, "b")):  # gems with ink rings
        gbox(g, gx, gy, gx + 1, gy + 1, ch)
        for x in range(gx - 1, gx + 3):
            gput(g, x, gy - 1, "k")
            gput(g, x, gy + 2, "k")
        gput(g, gx - 1, gy, "k")
        gput(g, gx - 1, gy + 1, "k")
        gput(g, gx + 2, gy, "k")
        gput(g, gx + 2, gy + 1, "k")
    for x, y in ((6, 2), (7, 2), (8, 2), (9, 2), (6, 3), (9, 3),
                 (6, 4), (9, 4), (6, 5), (7, 5), (8, 5), (9, 5)):
        gput(g, x, y, "k")                 # lock ring
    gbox(g, 7, 3, 8, 4, "o")               # gold lock
    g.pop((7, 4), None)                    # transparent keyhole
    return 16, 12, g


def chest_c07_col():
    """MINI 1-BIT colored: wood + gold band + gold lock."""
    g = {}
    for y, (a, b) in ((0, (2, 7)), (1, (1, 8))):
        gbox(g, a, y, b, y, "w")
    gbox(g, 0, 2, 9, 2, "w")
    gbox(g, 0, 3, 9, 6, "w")
    gbox(g, 0, 2, 9, 2, "o")               # gold band
    gbox(g, 4, 3, 5, 3, "o")               # gold lock
    return 10, 7, g


def chest_c07_ink():
    g = {}
    for y, (a, b) in ((0, (2, 7)), (1, (1, 8)), (2, (0, 9)), (3, (0, 9)),
                      (4, (0, 9)), (5, (0, 9)), (6, (0, 9))):
        gbox(g, a, y, b, y, "k")
    g.pop((4, 3), None)                    # tiny transparent lock notch
    g.pop((5, 3), None)
    return 10, 7, g


def chest_c08():
    """LOOT PILE: open chest base + gold coin mound + sparkles."""
    g = {}
    gbox(g, 1, 8, 14, 13, "w")
    add_straps(g, (3, 4, 11, 12), 8, 13)
    goutline(g)
    for y, (a, b) in ((3, (6, 9)), (4, (5, 10)), (5, (4, 11)),
                      (6, (3, 12)), (7, (2, 13))):
        gbox(g, a, y, b, y, "o")           # coin mound
    for cell in ((6, 4), (9, 6), (7, 7)):
        gput(g, *cell, "c")                # creme glints
    for cell in ((1, 2), (14, 1), (0, 6), (15, 4)):
        gput(g, *cell, "o")                # sparkles
    return 16, 14, g


def build_chests():
    """Yield (name, w, h, letter grid, px_per_cell)."""
    out = []
    for cid, fn in (("c01", chest_c01), ("c02", chest_c02),
                    ("c03", chest_c03), ("c04", chest_c04)):
        w, h, g = fn(False)
        out.append((f"{cid}_ink", w, h, {k: "k" for k in g}, 4))
        out.append((f"{cid}_col", w, h, dict(g), 4))
        w, h, g = fn(True)
        out.append((f"{cid}_ink_open", w, h, {k: "k" for k in g}, 4))
        out.append((f"{cid}_col_open", w, h, dict(g), 4))
    for cid, fn in (("c05", chest_c05), ("c06", chest_c06)):
        w, h, g = fn(False)
        out.append((f"{cid}_ink", w, h, {k: "k" for k in g}, 4))
        out.append((f"{cid}_col", w, h, dict(g), 4))
    w, h, g = chest_c07_ink()
    out.append(("c07_ink", w, h, {k: "k" for k in g}, 1))
    w, h, g = chest_c07_col()
    out.append(("c07_col", w, h, dict(g), 1))
    w, h, g = chest_c08()
    out.append(("c08_ink", w, h, {k: "k" for k in g}, 4))
    out.append(("c08_col", w, h, dict(g), 4))
    return out


# ---------- text bitmaps (3 px/cell, ink only) ----------
TEXTS = [("tk", "COFFEE QUEST \u00b7 STYLE CATALOG"),
         ("tt01", "PICK YOUR RUNNER"),
         ("tt02", "PICK YOUR MACHINE"),
         ("tt03", "PICK YOUR CHEST"),
         ("lr01", "STICK CLASSIC"), ("lr02", "STICK DASH"),
         ("lr03", "CUP JOGGER"), ("lr04", "STICK LEAN"),
         ("lr05", "BLOCKY"), ("lr06", "BLOB MINI"),
         ("lr07", "HOLLOW"), ("lr08", "CHONK 2PX"),
         ("lr09", "GEOMETRIC"), ("lr10", "SHADOW"),
         ("lm01", "CLASSIC DRIP"), ("lm02", "ESPRESSO BOX"),
         ("lm03", "TALL VENDING"), ("lm04", "MOKA POT"),
         ("lm05", "POUR-OVER"), ("lm06", "FRENCH PRESS"),
         ("lm07", "CAPSULE TOWER"), ("lm08", "CAF\u00c9 BREWER"),
         ("lc01", "CLASSIC"), ("lc02", "PIXEL CHUNKY"),
         ("lc03", "IRON VAULT"), ("lc04", "MAGICAL"),
         ("lc05", "CRATE"), ("lc06", "ROYAL"),
         ("lc07", "MINI 1-BIT"), ("lc08", "LOOT PILE")]


def text_cells(s):
    assert all(ch in FONT for ch in s), s
    cells = set()
    x0 = 0
    for ch in s:
        glyph = FONT[ch]
        for r in range(7):
            for c in range(5):
                if glyph[r][c] == "#":
                    cells.add((x0 + c, r))
        x0 += ADV
    return max(1, len(s) * ADV - 1), 7, cells


# ---------- render ----------
def render(path, w, h, cells, n):
    img = Image.new("RGBA", (w * n, h * n), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    for (x, y), col in cells.items():
        dr.rectangle([x * n, y * n, x * n + n - 1, y * n + n - 1],
                     fill=col + (255,))
    img.save(path)


def main():
    manifest = {}
    for sub in ("run", "machine", "chest", "text"):
        os.makedirs(os.path.join(CAT, sub), exist_ok=True)

    # runners: ink-only, 4 px/cell
    for rid, fn in RUNNERS.items():
        for frame in ("idle", "runA", "runB"):
            cells = fn(frame)
            name = f"{rid}_{frame}.png"
            render(os.path.join(CAT, "run", name), RW, RH,
                   {c: INK for c in cells}, 4)
            manifest[f"catalog/run/{name}"] = {"w": RW, "h": RH}
    print(f"run: 30 sprites (r01..r10 x idle/runA/runB, ink only, 4 px/cell)")

    # machines: colored, 4 px/cell
    for i, fn in enumerate(MACHINES, 1):
        w, h, g = fn()
        name = f"m{i:02d}.png"
        render(os.path.join(CAT, "machine", name), w, h,
               {c: PAL[ch] for c, ch in g.items()}, 4)
        manifest[f"catalog/machine/{name}"] = {"w": w, "h": h}
    print("machine: 8 sprites (m01..m08, colored, 4 px/cell)")

    # chests: ink + col (+ open for c01..c04), c07 mini at 1 px/cell
    for name, w, h, g, n in build_chests():
        render(os.path.join(CAT, "chest", name + ".png"), w, h,
               {c: PAL[ch] for c, ch in g.items()}, n)
        manifest[f"catalog/chest/{name}.png"] = {"w": w, "h": h}
    print("chest: 24 sprites (c01..c08 ink/col + c01..c04 open pairs)")

    # text: 3 px/cell ink
    for name, s in TEXTS:
        w, h, cells = text_cells(s)
        render(os.path.join(CAT, "text", name + ".png"), w, h,
               {c: INK for c in cells}, 3)
        manifest[f"catalog/text/{name}.png"] = {"w": w, "h": h}
    print("text: 30 sprites (tk, tt01..tt03, labels; 3 px/cell ink)")

    with open(os.path.join(CAT, "manifest.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print(f"{len(manifest)} manifest entries -> assets/catalog/manifest.json")
    verify(manifest)


# ---------- verification ----------
DUMP_CH = {INK: "#", BLUE: "B", GREEN: "G", AMBER: "A", RED: "R",
           BROWN: "n", DBROWN: "d", CREME: "c", GOLD: "o", WOOD: "w",
           METAL: "m", LMETAL: "l"}


def px_map(img):
    """PNG -> dict {(cellx, celly): char} sampled at cell corners."""
    w, h = img.size
    return {(x, y): img.getpixel((x, y)) for x in range(w) for y in range(h)}


def dump(path, n, title):
    img = Image.open(path).convert("RGBA")
    print(f"\n--- {title} ({path}, {img.size[0]}x{img.size[1]} px) ---")
    for y in range(0, img.size[1], n):
        row = []
        for x in range(0, img.size[0], n):
            r, g, b, a = img.getpixel((x, y))
            row.append("." if a == 0 else DUMP_CH.get((r, g, b), "?"))
        print("".join(row))


def verify(manifest):
    ok = True

    def fail(msg):
        nonlocal ok
        ok = False
        print(f"FAIL {msg}")

    # 1. every expected file exists, non-empty, dims == cells * px/cell
    pxpc = {"run": 4, "machine": 4, "chest": 4, "text": 3}
    expected = dict(manifest)
    run_expected = {f"catalog/run/{r}_{f}.png": (RW, RH)
                    for r in RUNNERS for f in ("idle", "runA", "runB")}
    if set(expected) != set(run_expected) | {
            f"catalog/machine/m{i:02d}.png" for i in range(1, 9)} | {
            f"catalog/chest/{n}.png" for n, _, _, _, _ in build_chests()} | {
            f"catalog/text/{n}.png" for n, _ in TEXTS}:
        fail("manifest key set mismatch")
    for key, dims in expected.items():
        path = os.path.join(CAT, key.split("/", 1)[1])
        if not (os.path.isfile(path) and os.path.getsize(path) > 0):
            fail(f"missing/empty {key}")
            continue
        n = 1 if key.startswith("catalog/chest/c07") else \
            pxpc[key.split("/")[1]]
        img = Image.open(path)
        if img.size != (dims["w"] * n, dims["h"] * n):
            fail(f"{key}: px {img.size} != cells {dims} x {n}")
    print(f"[1] existence + dims: {len(expected)} files checked")

    # 2. runner PNGs contain only {transparent, INK}
    bad = 0
    for key in run_expected:
        img = Image.open(os.path.join(CAT, key.split("/", 1)[1])).convert("RGBA")
        for p in img.getdata():
            if p[3] == 0:
                continue
            if p[:3] != INK:
                bad += 1
    print(f"[2] runners ink-only: {'PASS' if not bad else 'FAIL (%d px)' % bad}")
    if bad:
        ok = False

    # 3. machine + chest col PNGs only spec palette colors
    bad = []
    for key in expected:
        if "/machine/" not in key and not (
                "/chest/" in key and "_col" in os.path.basename(key)):
            continue
        img = Image.open(os.path.join(CAT, key.split("/", 1)[1])).convert("RGBA")
        for p in img.getdata():
            if p[3] == 0:
                continue
            if p[:3] not in PALETTE_SET:
                bad.append(key)
                break
    print(f"[3] machine/chest-col palette: "
          f"{'PASS' if not bad else 'FAIL ' + str(set(bad))}")
    if bad:
        ok = False

    # 4. ink chest variants only {transparent, INK}
    bad = []
    for key in expected:
        if "/chest/" not in key or "_col" in os.path.basename(key):
            continue
        img = Image.open(os.path.join(CAT, key.split("/", 1)[1])).convert("RGBA")
        for p in img.getdata():
            if p[3] != 0 and p[:3] != INK:
                bad.append(key)
                break
    print(f"[4] chest-ink ink-only: "
          f"{'PASS' if not bad else 'FAIL ' + str(set(bad))}")
    if bad:
        ok = False

    # 5. ASCII spot dumps
    dump(os.path.join(CAT, "run", "r01_runA.png"), 4, "r01 runA (STICK CLASSIC)")
    dump(os.path.join(CAT, "run", "r06_idle.png"), 4, "r06 idle (BLOB MINI)")
    dump(os.path.join(CAT, "machine", "m02.png"), 4, "m02 (ESPRESSO BOX)")
    dump(os.path.join(CAT, "chest", "c01_col.png"), 4, "c01 col (CLASSIC)")

    print(f"\nVERIFY: {'ALL PASS' if ok else 'FAILURES ABOVE'}")
    return ok


if __name__ == "__main__":
    main()
