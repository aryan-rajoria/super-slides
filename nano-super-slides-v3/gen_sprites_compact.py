"""Compact Coffee Quest sprite generator (CONTRACT-COMPACT.md + ADDENDUM).

Locked style picks (ADDENDUM 2026-10-11) are drawn by IMPORTING gen_catalog.py
via importlib (the same pattern both reference scripts use for the v1 font)
and reusing its drawers/palettes -- never re-implemented:
  runner  r02 STICK DASH   -> gc.r02_cells() idle/runA/runB + a jump frame
                              extending the same r02 skeleton with gc's
                              primitives (ring / draw_lines / bres);
  machine m03 TALL VENDING -> gc.m03() letter grid + per-state accents,
                              pooled 16x30 -> 12x20 cells, colored;
  chest   c02 PIXEL CHUNKY -> gc.chest_c02(), pooled 16x12 -> 8x6, colored.
World sprites (cactus/rock/hearts/clouds/skyline) reuse gen_sprites_bw.py's
pixel maps, role remap and outline pass; everything is max-pool scaled
("any covered source cell wins") so 1-cell strokes survive downsampling.

Output: assets/c16 c13 c11 c9 c7 (1 px/cell) + assets/text c-prefixed names
(3 px/cell) + assets/manifest_compact.json. Existing files are untouched.

CLI:
    ..\\.venv\\Scripts\\python gen_sprites_compact.py              # ladder
    ..\\.venv\\Scripts\\python gen_sprites_compact.py --man 12     # one uniform set c12
    --design X is accepted but ignored (dash locked; kept for CLI compat).
"""
import argparse
import importlib.util
import json
import os

from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


gc = _load("gen_catalog_compact", os.path.join(HERE, "gen_catalog.py"))
bw = _load("gen_sprites_bw_ref", os.path.join(HERE, "gen_sprites_bw.py"))

INK = gc.INK          # 1B1D22 (== bw.INK)
MID = bw.MID          # 5C6068
LIGHT = bw.LIGHT      # 9AA0AB (== gc.LMETAL)

DEFAULT_LADDER = [(16, "mono1"), (13, "gray2"), (11, "mono1"),
                  (9, "gray2"), (7, "mono1")]

# pooling priorities (lower rank wins): cups/gold/lights must survive the
# ink frame at 12x20, ink beats metal/wood bodies, details beat fills.
PRIO_LETTER = ["c", "o", "r", "g", "a", "b", "k", "m", "l", "w", "n", "d"]
PRIO_ROLE = ["INK", "MID", "LIGHT", "FACADE"]

STEAM1 = [".k..",
          "..k.",
          ".k..",
          "k..."]
STEAM2 = ["..k.",
          ".k..",
          "..k.",
          ".k.."]


# ---------- max-pool cell-grid scaler ----------
def _range(t, sw, tw):
    """Source index range covered by target index t. Downscale: exact
    non-overlapping area assignment (no one-cell dilation of thin strokes;
    the monotonic map can merge but never open gaps). Upscale: intersect
    coverage so no target cell is ever left empty (no holes)."""
    if tw <= sw:
        a = -((-t * sw) // tw)              # ceil(t*sw/tw)
        b = -((-(t + 1) * sw) // tw)        # ceil((t+1)*sw/tw)
    else:
        a = t * sw // tw                    # floor(t*sw/tw)
        b = min(sw, ((t + 1) * sw + tw - 1) // tw)
    return a, max(a + 1, b)


def pool_ink(cells, sw, sh, tw, th):
    """Boolean max-pool scale: a target cell is ink when ANY source cell
    it covers is ink (keeps 1-cell strokes connected)."""
    if (tw, th) == (sw, sh):
        return set(cells)
    out = set()
    for ty in range(th):
        iy0, iy1 = _range(ty, sh, th)
        for tx in range(tw):
            ix0, ix1 = _range(tx, sw, tw)
            if any((sx, sy) in cells
                   for sy in range(iy0, iy1) for sx in range(ix0, ix1)):
                out.add((tx, ty))
    return out


def pool_vals(cells, sw, sh, tw, th, prio):
    """Same coverage rule for valued grids {(x, y): value}; overlapping
    values resolve by priority order (details over body fills)."""
    if (tw, th) == (sw, sh):
        return dict(cells)
    rank = {v: i for i, v in enumerate(prio)}
    out = {}
    for ty in range(th):
        iy0, iy1 = _range(ty, sh, th)
        for tx in range(tw):
            ix0, ix1 = _range(tx, sw, tw)
            best = None
            for sy in range(iy0, iy1):
                for sx in range(ix0, ix1):
                    v = cells.get((sx, sy))
                    if v is not None and (best is None
                                          or rank.get(v, 99) < rank.get(best, 99)):
                        best = v
            if best is not None:
                out[(tx, ty)] = best
    return out


# ---------- runner: r02 STICK DASH (gen_catalog) + jump extension ----------
def man_cells(frame):
    if frame == "jump":
        return r02_jump_cells()
    return gc.r02_cells(frame)          # idle / runA / runB verbatim


def r02_jump_cells():
    """Jump pose extending gen_catalog's r02 skeleton on the same 13x16
    canvas and drawn with gen_catalog's own primitives: same ring head /
    15-deg-lean torso line, tucked-L arms raised, chevron legs tucked under,
    the 2 trailing speed strokes re-angled upward."""
    hip, neck, head, sh = (6, 10), (7, 5), (8, 3), (7, 6)
    c = set()
    c |= gc.ring(head[0], head[1], 2)
    armF = [sh, (10, 4), (12, 2)]       # raised L arms, spread wide so the
    armB = [sh, (4, 4), (2, 2)]         # pose survives pooling at 7 cells
    legN = [hip, (9, 11), (8, 13)]      # bent chevrons tucked under the hip
    legF = [hip, (3, 11), (4, 13)]
    gc.draw_lines(c, [[hip, neck], armF, armB, legN, legF])
    for fx, fy in (legN[-1], legF[-1]):
        c.add((fx + 1, fy))
    c |= set(gc.bres((0, 9), (2, 7)))     # speed strokes angled up
    c |= set(gc.bres((1, 11), (3, 9)))
    return c


# ---------- machine m03 TALL VENDING, per-state accents ----------
def machine_cells(state):
    """gc.m03() letter grid + ADDENDUM state notes, pooled 16x30 -> 24x45.
    24x45 (not 12x20): at 1px/cell the 12x20 render collapsed to a dark speck
    (visual gate round 1) - 1.5x catalog scale keeps cup rows and the button
    column readable while staying far under the old 1.15in JUMBO machine.
    Buttons r/g/a are colored in EVERY state (vending frontage); states differ:
    off  : cups visible in window, no cup drop, empty slot.
    on   : + CREME cup mid-drop.
    done : + CREME cup in the slot."""
    w, h, g = gc.m03()
    for ch, y0, y1 in (("r", 4, 5), ("g", 8, 9), ("a", 12, 13)):
        for y in range(y0, y1 + 1):
            for x in (11, 12):
                g[(x, y)] = ch
    if state in ("off", "on"):
        gc.gbox(g, 6, 25, 9, 26, "k")         # empty cup slot
    if state == "on":
        gc.gbox(g, 7, 22, 8, 23, "c")         # creme cup mid-drop
    if state == "done":
        gc.gbox(g, 7, 25, 8, 26, "c")         # creme cup in the slot
    return pool_vals(g, w, h, 24, 45, PRIO_LETTER), 24, 45


def chest_cells():
    """gc.chest_c02() PIXEL CHUNKY, 16x12 -> 8x6 (exactly half: the 2-cell
    chunky strokes pool to clean 1-cell strokes)."""
    w, h, g = gc.chest_c02(False)
    return pool_vals(g, w, h, 8, 6, PRIO_LETTER), 8, 6


# ---------- skyline: bw map, cropped to a seamless tile ----------
def skyline_tile():
    """bw.skyline_cells() (854x16) cropped at the first column whose fill
    pattern equals column 0, so the tile repeats with no seam."""
    w, h, cells = bw.skyline_cells()
    col0 = {y for x, y in cells if x == 0}
    for xc in range(24, w):
        if {y for x, y in cells if x == xc} == col0:
            return xc, h, {(x, y) for x, y in cells if x < xc}
    return w, h, set(cells)                  # fallback: full strip


# ---------- one game set (folder = man cells, 1 px/cell) ----------
def build_set(manh, pal, manifest, log):
    folder = f"c{manh}"
    outdir = os.path.join(ASSETS, folder)
    os.makedirs(outdir, exist_ok=True)
    cols = bw.PALETTES[pal]

    def save(name, w, h, cells):
        gc.render(os.path.join(outdir, name + ".png"), w, h, cells, 1)
        manifest[f"{folder}/{name}"] = {"w": w, "h": h}

    # man: STICK DASH drawn parametrically at THIS height
    mw = gc.R(gc.RW * manh / gc.RH)
    for fr in ("idle", "runA", "runB", "jump"):
        cells = pool_ink(man_cells(fr), gc.RW, gc.RH, mw, manh)
        save(f"man_{fr}", mw, manh, {p: INK for p in cells})

    # obstacles from the bw maps, contract sizes (heights, width to aspect)
    for name, rows, hcells in (("cactus", bw.CACTUS, gc.R(0.55 * manh)),
                               ("rock", bw.ROCK, gc.R(0.28 * manh))):
        w0, h0, cells = bw.grid_cells(rows)
        ww = gc.R(w0 * hcells / h0)
        pooled = pool_vals(cells, w0, h0, ww, hcells, PRIO_ROLE)
        save(name, ww, hcells, {p: cols[v] for p, v in pooled.items()})

    # hearts 6x6: full = solid ink, empty = outline (LIGHT tint on gray2)
    w0, h0, mask = bw.grid_cells(bw.HEART, mask=True)
    full = pool_ink(mask, w0, h0, 6, 6)
    save("heart_full", 6, 6, {p: INK for p in full})
    w0, h0, out = bw.outline_cells(*bw.grid_cells(bw.HEART_E, mask=True), "LIGHT")
    empty = pool_vals(out, w0, h0, 6, 6, PRIO_ROLE)
    save("heart_empty", 6, 6, {p: cols[v] for p, v in empty.items()})

    # clouds: outline style at the compact sizes (scale mask, then outline)
    for name, rows, tw, th in (("cloud1", bw.CLOUD1, 8, 4),
                               ("cloud2", bw.CLOUD2, 6, 3)):
        w0, h0, mask = bw.grid_cells(rows, mask=True)
        solid = pool_ink(mask, w0, h0, tw, th)
        _, _, outline = bw.outline_cells(tw, th, solid, "LIGHT")
        save(name, tw, th, {p: cols[v] for p, v in outline.items()})

    # skyline: seamless bw tile scaled to manH+4 (builder sets final width)
    skh = manh + 4
    tw0, th0, tile = skyline_tile()
    skw = gc.R(tw0 * skh / th0)
    sk = pool_ink(tile, tw0, th0, skw, skh)
    save("skyline_day", skw, skh, {p: cols["FACADE"] for p in sk})

    # chest + machine: catalog picks, CATALOG-SPEC colored, same in all sets
    for st in ("off", "on", "done"):
        cells, w, h = machine_cells(st)
        save(f"machine_{st}", w, h, {p: gc.PAL[ch] for p, ch in cells.items()})
    cells, w, h = chest_cells()
    save("chest", w, h, {p: gc.PAL[ch] for p, ch in cells.items()})

    # steam: 4x4 ink wisps (2 frames, ink in both palettes)
    for name, rows in (("steam1", STEAM1), ("steam2", STEAM2)):
        w0, h0, cells = bw.grid_cells(rows)
        save(name, w0, h0, {p: INK for p in cells})

    log.append(f"{folder}: 17 sprites at 1 px/cell "
               f"(man {manh} cells, {pal}; cactus {gc.R(0.55 * manh)}, "
               f"rock {gc.R(0.28 * manh)}, skyline {skh} tall)")


# ---------- text set (3 px/cell ink, c-prefixed names, shared folder) ----------
TEXTS = [("ck", "COFFEE QUEST \u00b7 COMPACT LAB")]
TEXTS += [(f"ct{i:02d}", t) for i, t in enumerate(
    ["RUNNER 16 CELLS", "RUNNER 13 CELLS", "RUNNER 11 CELLS",
     "RUNNER 9 CELLS", "RUNNER 7 CELLS", "THANK YOU"], 1)]
TEXTS += [(f"cscore_{i:02d}", f"SLIDE {i}/6") for i in range(1, 7)]
TEXTS += [("cbanner", "COFFEE ACQUIRED")]


def build_text(manifest, log):
    textdir = os.path.join(ASSETS, "text")
    os.makedirs(textdir, exist_ok=True)
    for name, s in TEXTS:
        w, h, cells = gc.text_cells(s)
        gc.render(os.path.join(textdir, name + ".png"), w, h,
                  {p: INK for p in cells}, 3)
        manifest[f"text/{name}"] = {"w": w, "h": h}
    log.append(f"text: {len(TEXTS)} sprites at 3 px/cell (ink only, "
               f"c-prefixed names; no existing file touched)")


# ---------- verification ----------
DUMP_CH = dict(gc.DUMP_CH)
DUMP_CH.update({MID: "+", LIGHT: "-"})


def dump(path, title):
    img = Image.open(path).convert("RGBA")
    print(f"\n--- {title} ({os.path.relpath(path, HERE)}, "
          f"{img.size[0]}x{img.size[1]} px) ---")
    for y in range(img.size[1]):
        print("".join(
            "." if img.getpixel((x, y))[3] == 0
            else DUMP_CH.get(img.getpixel((x, y))[:3], "?")
            for x in range(img.size[0])))


def verify(manifest, sets):
    ok = True

    def fail(msg):
        nonlocal ok
        ok = False
        print(f"FAIL {msg}")

    mono_sets = {f"c{m}" for m, p in sets if p == "mono1"}
    gray_sets = {f"c{m}" for m, p in sets if p == "gray2"}
    colored = ("chest", "machine_off", "machine_on", "machine_done")

    # [1] every file exists, non-empty, px dims == cells x px/cell
    for key, dims in manifest.items():
        folder, name = key.split("/")
        path = os.path.join(ASSETS, folder, name + ".png")
        if not (os.path.isfile(path) and os.path.getsize(path) > 0):
            fail(f"missing/empty {key}")
            continue
        n = 3 if folder == "text" else 1
        if Image.open(path).size != (dims["w"] * n, dims["h"] * n):
            fail(f"{key}: px {Image.open(path).size} != cells {dims} x {n}")
    print(f"[1] existence + dims: {len(manifest)} files checked")

    # [2] mono1 sets ink-only / gray2 add only the two grays (colored exempt)
    bad_mono, bad_gray, bad_cat = [], [], []
    for key in manifest:
        folder, name = key.split("/")
        path = os.path.join(ASSETS, folder, name + ".png")
        if folder == "text":
            img = Image.open(path).convert("RGBA")
            for p in img.getdata():
                if p[3] != 0 and p[:3] != INK:
                    bad_mono.append(key)
                    break
            continue
        if name in colored:                     # [4] CATALOG palette check
            img = Image.open(path).convert("RGBA")
            for p in img.getdata():
                if p[3] != 0 and p[:3] not in gc.PALETTE_SET:
                    bad_cat.append(key)
                    break
            continue
        allowed = {INK} if folder in mono_sets else {INK, MID, LIGHT}
        img = Image.open(path).convert("RGBA")
        for p in img.getdata():
            if p[3] != 0 and p[:3] not in allowed:
                (bad_mono if folder in mono_sets else bad_gray).append(key)
                break
    print(f"[2] mono1 ink-only: "
          f"{'PASS' if not bad_mono else 'FAIL ' + str(sorted(set(bad_mono)))}")
    print(f"[3] gray2 +5C6068/9AA0AB only: "
          f"{'PASS' if not bad_gray else 'FAIL ' + str(sorted(set(bad_gray)))}")
    print(f"[4] chest/machine CATALOG palette: "
          f"{'PASS' if not bad_cat else 'FAIL ' + str(sorted(set(bad_cat)))}")
    if bad_mono or bad_gray or bad_cat:
        ok = False

    # [5] ASCII spot dumps
    first, last = f"c{sets[0][0]}", f"c{sets[-1][0]}"
    dump(os.path.join(ASSETS, first, "man_runA.png"),
         f"{first}/man_runA (STICK DASH runA)")
    dump(os.path.join(ASSETS, last, "man_jump.png"),
         f"{last}/man_jump (tucked jump)")
    dump(os.path.join(ASSETS, first, "machine_on.png"),
         f"{first}/machine_on (lit window + amber + mid-drop)")
    dump(os.path.join(ASSETS, first, "chest.png"),
         f"{first}/chest (PIXEL CHUNKY)")

    print(f"\nVERIFY: {'ALL PASS' if ok else 'FAILURES ABOVE'}")
    return ok


# ---------- main ----------
def main():
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--man", type=int, default=None,
                    help="uniform single man size (cells) instead of "
                         "the 16/13/11/9/7 ladder")
    ap.add_argument("--design", default=None,
                    help="ignored for art -- runner locked to r02 STICK DASH "
                         "(kept for CLI compatibility)")
    args = ap.parse_args()
    if args.design is not None:
        print(f"--design {args.design}: no-op -- the runner style is locked "
              f"to r02 STICK DASH (CONTRACT-COMPACT ADDENDUM 1)")

    sets = [(args.man, "mono1")] if args.man else DEFAULT_LADDER

    manifest, log = {}, []
    for manh, pal in sets:
        build_set(manh, pal, manifest, log)
    build_text(manifest, log)
    for line in log:
        print(line)
    with open(os.path.join(ASSETS, "manifest_compact.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print(f"{len(manifest)} manifest entries -> assets/manifest_compact.json")
    verify(manifest, sets)


if __name__ == "__main__":
    main()
