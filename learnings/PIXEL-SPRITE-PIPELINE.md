# Pixel sprite pipeline — gen_sprites.py reference

How the 53 Coffee Quest sprites (and the v1 text assets) are defined, rendered,
and consumed. Source of truth: `nano-super-slides-v2\gen_sprites.py`,
`nano-super-slides-v2\build_deck.js`, `nano-super-slides-v1\gen_assets.py`.
Companion: `LEARNINGS.md` §1 (pipeline order), `GAME-DESIGN-SPEC.md` (on-slide geometry).

## 1. Cell math (the one chain that must stay consistent)

```
1 sprite cell  = 3 px in the PNG          (SCALE = 3 in gen_sprites.py)
               = 2.25 pt on the slide     (sprites placed so h = cells * 2.25pt)
               = 0.03125 in               (CELL = 0.03125 in build_deck.js)
1 screen px    = 0.75 pt                  (13.33in slide = 960pt = 1280px)
```

- The deck is LAYOUT_WIDE: 13.333 x 7.5 in = 960 x 540 pt.
- Place a sprite by height in inches: `img(s, name, x, y, h)` with
  `h = rows * 0.03125`. Width is derived from the manifest aspect ratio
  (`w = h * (m.w / m.h)`), so non-square cells never occur.
- Movement quantum: the VBA engine snaps every animated position with
  `Qz(v) = Int(v / 0.75 + 0.5) * 0.75` — i.e. positions live on whole screen
  pixels, which keeps pixel art crisp while it moves.

## 2. Grid renderer

Sprites are lists of equal-length strings; one char = one cell:

```python
SCALE = 3  # px per cell

def grid_img(rows, pal_extra=None, cell=SCALE):
    assert rows and all(len(r) == len(rows[0]) for r in rows), "ragged grid"
    w, h = len(rows[0]) * cell, len(rows) * cell
    img = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    dr = ImageDraw.Draw(img)
    for y, row in enumerate(rows):
        for x, ch in enumerate(row):
            if ch == ".": continue
            col = (pal_extra or {}).get(ch) or C[ch]
            dr.rectangle([x*cell, y*cell, x*cell+cell-1, y*cell+cell-1], fill=col + (255,))
    return img
```

- `"."` = transparent. Ragged rows assert at generation time.
- Hard square cells, no anti-aliasing — that is the aesthetic.

## 3. Palette

Char -> RGBA dict `C` (subset that matters; full dict is the top of
`gen_sprites.py`):

| chars | role |
|---|---|
| `k` | ink `#1B1D22` (outlines, eyes, sign borders) |
| `h`/`H` | hair dark / highlight |
| `s`/`S` | skin / skin shade |
| `B`/`b`/`e` | shirt blue `#2F6FED` / shade / light `#7CB0FF` |
| `p`/`P` | pants / pants shade |
| `w`/`W` | white / light gray |
| `o`/`O` | coffee / coffee dark |
| `r`/`R` | red `#DC2626` / light red (hearts) |
| `g`/`G`/`d` | cactus green / light / dark |
| `n`/`N` | wood / wood dark (sign posts) |
| `D`/`E` | machine body `#2A2E39` / panel `#3C414E` |
| `A`/`L`/`G`(machine context) | status light: amber on / gray off / green done |
| `c`/`f` | cloud white / shade |
| `y`/`Y` | sun yellow / orange |
| `m` | moon pale |
| `q`/`Q` | rock / rock light |

Pixel-text assets use deck palette constants: `AMBER D97706`, `LBLUE 7CB0FF`,
`WHITE F5F6F8`, `MUT 5C6068`, `NMUT 9AA0AB`, `INK 1B1D22`.

Contrast rule used: sprites sit on strip sky `E3ECF9` (day) / `232838`
(night); every sprite carries a `k` ink outline, and sign boards are
`w`/`W` with a `k` border so text glyphs read on both skies.

## 4. manifest.json contract

- `save(name, img)` writes `assets/<name>.png` and records
  `M[name] = {"file": "assets/<name>.png", "w": px, "h": px}`.
- Final step **merges into the v1 manifest** (load `assets/manifest.json`,
  `old.update(M)`, dump) — one manifest serves both decks; v1 entries survive.
- Consumer (`build_deck.js`): `const m = MAN[name]`, `w = h * (m.w/m.h)` —
  the deck only sets placement height; width always comes from the manifest.
  So a sprite edit never requires a build_deck.js geometry edit.

## 5. Bitmap font + text assets

- v2 does not redefine the font. It imports v1's hand-defined 5x7 bitmap font:

```python
import importlib.util
V1 = os.path.join(HERE, "..", "nano-super-slides-v1", "gen_assets.py")
spec = importlib.util.spec_from_file_location("gen_assets_v1", V1)
ga = importlib.util.module_from_spec(spec); spec.loader.exec_module(ga)
F, ADV = ga.F, ga.ADV   # glyph grids + advance
```

  (v1 also carries custom glyphs: pi, arrows.)
- **Signs** — `sign(name, text, fg, board="w", post="n")`: board width =
  `ga.text_cells(text) + 4`, 11 board rows + 5 post rows; `k` border, 2-cell
  padding, glyph rows stamped in `fg` on `board`, 2-cell post centered.
  Shipped: `sign_coffee` "COFFEE ->" (fg `B`), `sign_nocoffee` "NO COFFEE"
  (fg `r`, board `W`), `sign_closed` "CLOSED" (fg `q`, board `W`).
- **Pixel-text banners** — `ptext(name, segments, scale)` wraps
  `ga.render(segments, scale, out_path)`; segments = [(text, RGBA), ...].
  Shipped: `ty_title`, `ty_kicker`, `coffee_acquired`, `quest_tag`,
  `score_day_01..13` / `score_night_01..13` ("SLIDE NN/13").

## 6. Programmatic canvas beats hand-aligned grids above ~12 rows

The coffee machine (20x22, three states) was first written as hand-aligned
string grids — row-width assertions failed repeatedly. Rewritten as a
programmatic canvas:

```python
def mk(w, h):   return [["."] * w for _ in range(h)]
def box(c, x0, y0, x1, y1, ch): ...       # filled rect of chars
def stamp(c, x, y, glyph, ch): ...        # blit a 5x7 font glyph
```

then `machine(name, light, cup)` composes shell/screen/status-light/bay/cup
per state (`off`/`on`/`done`). Rule: string grids for small organic sprites
(man, hearts, cactus, clouds); `mk/box/stamp` for anything large, rectilinear,
or multi-state.

## 7. Skyline (procedural, seamless)

`skyline(name, facade, shade, win_on, win_off, base)`:

- Canvas 2560 x 48 px = **two screen widths**; wrap period = one screen
  (1280 px = 960 pt; matches `SKY_PERIOD = 960` in the engine).
- Buildings: width 10–22 cells, height 6–16 cells, 2–4 cell gaps;
  left edge lit with `shade`, windows 1 cell on a 3-cell grid.
- Window lit probability: 0.18 day / 0.5 night.
- RNG seeded (`Random(42)` day, `Random(7)` night) — deterministic output.
- Day palette `A9BAD6/C2D1E9/869CBE/98ACCA/8DA1BE`; night
  `33394D/41485F/F5C86E(warm lit)/282D3D/282E3F`.

## 8. Validate with a contact sheet before building the deck

After generating, compose every sprite into a labeled 6-column grid
(`sprite_sheet.png`) and eyeball it once. This caught: a stray `P` char in
the full-heart row (`"rRrrrrPr"` -> `"rRrrrrr"`) and an over-cluttered empty
heart (`"LWWLLWL"` -> `"LLLLLLL"` keeping one `W` sparkle). Cheap step,
catches palette-char typos that render as wrong-color pixels.

## 9. Run

```powershell
cd C:\Users\aryan\pro\slides\nano-super-slides-v2
..\.venv\Scripts\python gen_sprites.py     # Pillow; writes assets\ + manifest merge
```

53 sprites per run; idempotent (overwrites). Requires `nano-super-slides-v1`
to exist one level up (font import + v1 manifest base).
