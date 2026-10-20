"""v4 asset generator — "The Unified Agent Registry" research deck.

Visually continues the v3 "coffee-quest compact" style (CONTRACT-COMPACT.md
+ ADDENDUM). Everything is drawn by REUSING the v3 toolchain via importlib
(the same pattern the older scripts use for the v1 font) — no art is
re-implemented:

  gen_catalog.py        -> 5x7 bitmap font + text renderer (gc.text_cells /
                           gc.render), cell-grid primitives (ring, bres,
                           draw_lines) for the stick-figure idiom, and the
                           colored m03 TALL VENDING / c02 PIXEL CHUNKY art.
  gen_sprites_compact.py-> man_cells (r02 STICK DASH), machine_cells(state),
                           chest_cells, and the max-pool scalers.

Assets (all RGBA transparent bg, NEAREST-adjacent: hard cells, no AA):
  assets/text/     3 px/cell ink bitmaps — kickers, titles, SLIDE n/13
                   counters, closer banner (v3 text-set parameters).
  assets/figures/  2 px/cell B&W stick figures, 32x40 cells: four harness
                   variants (antenna / visor / satchel / package, accessory
                   in gray 5C6068, body in ink) + r02 STICK DASH runner
                   (runA 26x32, idle 26x32) pooled from the v3 drawer.
  assets/finale/   8 px/cell colored catalog picks: machine_done (24x45)
                   + chest (8x6) — color allowed ONLY here (1-bit rule).

Output: assets/manifest_v4.json. Font note: "%" is added to the FONT copy
(gen_catalog added \u00c9 the same way) so the title "36.82% FLAWED" renders.

Run:  ..\\.venv\\Scripts\\python gen_sprites_v4.py
"""
import importlib.util
import json
import os

from PIL import Image, ImageDraw

HERE = os.path.dirname(os.path.abspath(__file__))
ASSETS = os.path.join(HERE, "assets")
V3 = os.path.join(HERE, "..", "nano-super-slides-v3")


def _load(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


gc = _load("gen_catalog_v4", os.path.join(V3, "gen_catalog.py"))
gsc = _load("gen_sprites_compact_v4", os.path.join(V3, "gen_sprites_compact.py"))

INK = gc.INK                    # 1B1D22
MID = (0x5C, 0x60, 0x68)        # 5C6068 (secondary gray)

# "%" glyph added to the FONT copy (v3 added E-acute the same way)
gc.FONT["%"] = [
    "##...",
    "##.#.",
    "...#.",
    "..#..",
    ".#...",
    "#..##",
    "...##",
]

PX_TEXT = 3      # px/cell for text bitmaps  (v3 text set)
PX_FIG = 2       # px/cell for stick figures (placed ~0.5 in tall)
PX_HERO = 8      # px/cell for machine/chest heroes (placed ~native)


# ---------- generic valued-cell renderer ----------
def render_cells(path, w, h, cells, n):
    img = Image.new("RGBA", (w * n, h * n), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    for (x, y), col in cells.items():
        dr.rectangle([x * n, y * n, x * n + n - 1, y * n + n - 1],
                     fill=tuple(col) + (255,))
    img.save(path)


# ---------- text bitmaps (3 px/cell, ink) ----------
TEXTS = [
    ("vk01", "NANO-SUPER SLIDES \u00b7 V4 LAB"),
    ("vk02", "THE PROBLEM \u00b7 FRAGMENTATION"),
    ("vk03", "HARNESS SURVEY \u00b7 1 OF 4"),
    ("vk04", "HARNESS SURVEY \u00b7 2 OF 4"),
    ("vk05", "HARNESS SURVEY \u00b7 3 OF 4"),
    ("vk06", "HARNESS SURVEY \u00b7 4 OF 4"),
    ("vk07", "THE STANDARDS LAYER"),
    ("vk08", "PRIOR ART \u00b7 REGISTRIES TODAY"),
    ("vk09", "SECURITY \u00b7 TRUST MODEL"),
    ("vk10", "THE DESIGN \u00b7 AGENTREG"),
    ("vk11", "ONE RECORD \u00b7 FOUR EMISSIONS"),
    ("vk12", "ROADMAP \u00b7 V0 TO V2"),
    ("vk13", "THANK YOU \u00b7 REGISTRY BREWING"),
    ("vt01", "AGENT REGISTRY \u00b7 4 HARNESSES"),
    ("vt02", "NO UNIFIED REGISTRY"),
    ("vt03", "CLAUDE CODE \u00b7 V2.1.302"),
    ("vt04", "CODEX \u00b7 RUST-V0.163.0"),
    ("vt05", "OPENCODE \u00b7 214K STARS"),
    ("vt06", "PI \u00b7 5,361 PACKAGES"),
    ("vt07", "AGENT SKILLS \u00b7 46 CLIENTS"),
    ("vt08", "PRIOR ART \u00b7 6 REGISTRIES"),
    ("vt09", "36.82% FLAWED"),
    ("vt10", "INDEX \u00b7 NEVER HOST"),
    ("vt11", "ONE RECORD \u00b7 4 EMISSIONS"),
    ("vt12", "MVP BY 2027-01"),
    ("vt13", "REGISTRY BREWING"),
    ("vbanner", "ONE REGISTRY \u00b7 EVERY AGENT"),
] + [(f"vs{i:02d}", f"SLIDE {i}/13") for i in range(1, 14)]


def build_text(manifest):
    d = os.path.join(ASSETS, "text")
    os.makedirs(d, exist_ok=True)
    for name, s in TEXTS:
        w, h, cells = gc.text_cells(s)
        render_cells(os.path.join(d, name + ".png"), w, h,
                     {p: INK for p in cells}, PX_TEXT)
        manifest[f"text/{name}"] = {"w": w, "h": h}
    print(f"text: {len(TEXTS)} bitmaps at {PX_TEXT} px/cell (ink only)")


# ---------- harness stick figures (32x40 cells, ink body + gray accessory) ----------
FW, FH = 32, 40


def _base_figure():
    """Standing stick figure on the 32x40 grid, gc primitives, facing right.
    Head ring r6 at (16,9); torso neck(16,15)->hip(15,26); limbs 1-cell."""
    c = set()
    c |= gc.ring(16, 9, 6)
    gc.draw_lines(c, [[(16, 15), (15, 26)],                       # torso
                      [(16, 17), (23, 21)], [(16, 17), (9, 21)],  # arms
                      [(15, 26), (19, 39)], [(15, 26), (11, 39)]])  # legs
    c.add((20, 39))                                             # forward toes
    c.add((12, 39))
    return c


def fig_claude():
    """ANTENNA — the plugged-in richest harness."""
    c = _base_figure()
    g = {(16, 2), (16, 1), (16, 0)}                              # stalk + tip
    return c, g


def fig_codex():
    """VISOR — the reviewer (hook review + trust gates)."""
    c = _base_figure()
    g = {(x, y) for x in (19, 20, 21) for y in (8, 9, 10)}       # face visor
    return c, g


def fig_opencode():
    """SATCHEL — carries three skill dirs at once."""
    c = _base_figure()
    g = set(gc.bres((16, 18), (10, 23)))                         # strap
    g |= {(x, y) for x in range(5, 11) for y in range(23, 28)}   # bag
    return c, g


def fig_pi():
    """PACKAGE — npm IS the registry: both arms hold a parcel."""
    c = _base_figure()
    c |= set(gc.bres((16, 17), (23, 15)))                        # raised arms
    c |= set(gc.bres((16, 17), (23, 19)))
    g = {(x, y) for x in range(23, 32) for y in range(13, 20)}   # parcel
    for y in range(13, 20):                                      # ink tape seam
        g -= {(27, y), (28, y)}
    return c, g


def build_figures(manifest):
    d = os.path.join(ASSETS, "figures")
    os.makedirs(d, exist_ok=True)
    figs = {"fg_claude": fig_claude(), "fg_codex": fig_codex(),
            "fg_opencode": fig_opencode(), "fg_pi": fig_pi()}
    for name, (ink, gray) in figs.items():
        cells = {p: INK for p in ink}
        cells.update({p: MID for p in gray})
        render_cells(os.path.join(d, name + ".png"), FW, FH, cells, PX_FIG)
        manifest[f"figures/{name}"] = {"w": FW, "h": FH}
    # r02 STICK DASH runner (v3 locked pick), pooled 13x16 -> 26x32
    for name, frame in (("fg_runner", "runA"), ("fg_runner_idle", "idle")):
        cells = gsc.pool_ink(gsc.man_cells(frame), gc.RW, gc.RH, 26, 32)
        render_cells(os.path.join(d, name + ".png"), 26, 32,
                     {p: INK for p in cells}, PX_FIG)
        manifest[f"figures/{name}"] = {"w": 26, "h": 32}
    print(f"figures: 6 sprites ({PX_FIG} px/cell; 4 harness variants + "
          f"r02 runner runA/idle)")


# ---------- finale heroes (catalog picks, colored, 8 px/cell) ----------
def build_finale(manifest):
    d = os.path.join(ASSETS, "finale")
    os.makedirs(d, exist_ok=True)
    cells, mw, mh = gsc.machine_cells("done")        # m03 + done-state accents
    render_cells(os.path.join(d, "machine_done.png"), mw, mh,
                 {p: gc.PAL[ch] for p, ch in cells.items()}, PX_HERO)
    manifest["finale/machine_done"] = {"w": mw, "h": mh}
    cells, cw, ch = gsc.chest_cells()                # c02 PIXEL CHUNKY
    render_cells(os.path.join(d, "chest.png"), cw, ch,
                 {p: gc.PAL[ch] for p, ch in cells.items()}, PX_HERO)
    manifest["finale/chest"] = {"w": cw, "h": ch}
    print(f"finale: machine_done {mw}x{mh} + chest {cw}x{ch} "
          f"({PX_HERO} px/cell, CATALOG colors — the only color in the deck)")


# ---------- verification ----------
DUMP_CH = dict(gc.DUMP_CH)
DUMP_CH[MID] = "-"


def dump(path, n, title):
    img = Image.open(path).convert("RGBA")
    print(f"\n--- {title} ({os.path.relpath(path, HERE)}, "
          f"{img.size[0]}x{img.size[1]} px) ---")
    for y in range(0, img.size[1], n):
        print("".join(
            "." if img.getpixel((x, y))[3] == 0
            else DUMP_CH.get(img.getpixel((x, y))[:3], "?")
            for x in range(0, img.size[0], n)))


def verify(manifest):
    ok = True

    def fail(msg):
        nonlocal ok
        ok = False
        print(f"FAIL {msg}")

    px = {"text": PX_TEXT, "figures": PX_FIG, "finale": PX_HERO}
    for key, dims in manifest.items():
        folder, name = key.split("/")
        path = os.path.join(ASSETS, folder, name + ".png")
        if not (os.path.isfile(path) and os.path.getsize(path) > 0):
            fail(f"missing/empty {key}")
            continue
        if Image.open(path).size != (dims["w"] * px[folder],
                                     dims["h"] * px[folder]):
            fail(f"{key}: px {Image.open(path).size} != {dims} x {px[folder]}")
    print(f"[1] existence + dims: {len(manifest)} files checked")

    bad = []
    for key in manifest:
        folder, name = key.split("/")
        path = os.path.join(ASSETS, folder, name + ".png")
        allowed = gc.PALETTE_SET if folder == "finale" else \
            ({INK} if folder == "text" else {INK, MID})
        img = Image.open(path).convert("RGBA")
        for p in img.getdata():
            if p[3] != 0 and p[:3] not in allowed:
                bad.append(key)
                break
    print(f"[2] ink-only text / ink+gray figures / CATALOG finale: "
          f"{'PASS' if not bad else 'FAIL ' + str(sorted(set(bad)))}")
    if bad:
        ok = False

    # every TEXTS string used only font glyphs (assert inside text_cells too)
    for name, s in TEXTS:
        if not all(ch in gc.FONT for ch in s):
            fail(f"text {name}: unrenderable chars {s}")
    print("[3] font coverage for all bitmap strings: PASS" if ok else "[3] see failures")

    dump(os.path.join(ASSETS, "figures", "fg_claude.png"), PX_FIG,
         "fg_claude (antenna variant)")
    dump(os.path.join(ASSETS, "figures", "fg_pi.png"), PX_FIG,
         "fg_pi (package variant)")
    dump(os.path.join(ASSETS, "finale", "machine_done.png"), PX_HERO,
         "finale/machine_done (m03 TALL VENDING, done)")

    print(f"\nVERIFY: {'ALL PASS' if ok else 'FAILURES ABOVE'}")
    return ok


def main():
    manifest = {}
    build_text(manifest)
    build_figures(manifest)
    build_finale(manifest)
    with open(os.path.join(ASSETS, "manifest_v4.json"), "w") as f:
        json.dump(manifest, f, indent=1)
    print(f"{len(manifest)} manifest entries -> assets/manifest_v4.json")
    verify(manifest)


if __name__ == "__main__":
    main()
