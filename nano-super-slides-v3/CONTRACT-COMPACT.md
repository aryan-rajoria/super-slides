# COMPACT CONTRACT — dino-look Coffee Quest, all sizes below old MICRO

Lives in `nano-super-slides-v3\`. New deck `nano-super-coffee-quest-compact.pptx/.pptm`
+ `*_compact.*` scripts; the original v3 deck/scripts stay untouched. Palette rules,
B&W-only and no-background/no-border rules carry over from `CONTRACT.md`.

## 0. What changed vs the v3 deck (the user brief)

1. **Everything smaller**: world cell is 0.75 pt (1 PNG px) on EVERY slide; the man is a
   stick figure whose height in cells is the size knob. Old MICRO man was 20 cells
   (0.21 in); the new ladder is 16/13/11/9/7 cells — every slide smaller than MICRO.
2. **Man redesigned as a stick figure** — 5 designs A–E, slide 1 is a PICKER: all five
   shown enlarged, user picks one for future builds.
3. **Coffee machine redesigned** to actually read as a coffee machine (hopper, buttons
   window, spout, carafe). 14×17 cells — slightly bigger than the man, absolutely far
   smaller than the old 1.04 in JUMBO slab. Thank-You slide only.
4. **Ground = the slide's bottom edge.** No dead space under the game. On "line" slides
   a 1-cell-tall DASHED ink line sits flush at the bottom edge (dash 6 cells, gap 4);
   on "edge" slides nothing — sprites just touch the bottom edge.
5. **Programmatic man size**: `gen_sprites_compact.py --man N` regenerates the sets,
   `build_compact.js N` rebuilds the deck uniformly at N cells. Default ladder 16,13,11,9,7.

## 1. Deck — 6 slides, 13.333 × 7.5 in, bg F7F6F2, ink 1B1D22, grays 5C6068/9AA0AB

| # | role | set | man cells | palette | bottom line | timeSec |
|---|------|-----|-----------|---------|-------------|---------|
| 1 | PICK YOUR RUNNER (+ live strip) | c16 | 16 | mono1 | dashed | 30 |
| 2 | size ladder | c16 | 16 | mono1 | dashed | 45 |
| 3 | size ladder | c13 | 13 | gray2 | edge (none) | 60 |
| 4 | size ladder | c11 | 11 | mono1 | dashed | 90 |
| 5 | size ladder | c9 | 9 | gray2 | edge (none) | 120 |
| 6 | THANK YOU — finale, no timer | c7 | 7 (zoomed out) | mono1 | dashed | 0 |

mono1 = ink+transparent only; gray2 = ink + 5C6068 + 9AA0AB. Skyline (light #9AA0AB
punched silhouette, bottom on GROUND, height = manH+4 cells, explicit width 2×W,
x −2.222, drawn before the line dashes) exists ONLY on gray2 slides (3, 5).

## 2. Geometry — GROUND is the slide bottom edge (inches)

- `GROUND = H (7.5)` on edge slides; `GROUND = H − 1cell` on dashed-line slides (line
  dashes y = H − 1cell, h = 1 cell, full width pattern dash 6 / gap 4, ink).
- Man: x 2.083, feet on GROUND, w from the design aspect. Spare frames + obstacles
  parked x −3.0. Banner parked −(w+0.5).
- Hearts: 6×6 cells, 8-cell spacing, rightmost heart right edge = W − 0.2, hearts row
  bottom = GROUND − 2 cells. heartE* parked.
- Timer (slides 1–5, none on 6): bar 1.4 in × 4 cells, right edge W − 0.2, stacked
  2 cells above the hearts row; timetext MONO bold 8 ink, right-aligned, right edge
  = bar left − 0.06, vertically centered on the bar. NO frame.
- Score tag: TEXT-set bitmap "SLIDE N/6", fixed h 0.19 in, x 0.167, bottom =
  GROUND − 2 cells. (Never variant-scaled.)
- Clouds (outline style): cloud1 8×4 cells bottom = GROUND − 1.55×manH_in; cloud2 6×3
  bottom = GROUND − 1.35×manH_in; x 3.1 / 6.4.
- Obstacles bottom on GROUND: cactus cells = round(0.55×manH): 9/7/6/5/4 for the
  ladder; rock = round(0.28×manH): 4/4/3/3/2. Parked at −3.0.
- Slide 6 machine: 14×17 cells, bottom GROUND, x 11.6 (clears the hearts row at
  ~12.9+). machine_on/done + steam1/steam2 (4×4) parked; steam show-top = authored
  parked top = GROUND − machine_h − steam_h. Banner parked top = GROUND − 0.55 in
  (its show height), text-set "COFFEE ACQUIRED" h 0.19 in.
- Hidden cfgTime (budget secs, "0" on slide 6) and cfgScale (text = man CELLS,
  e.g. "16") at x −0.9 (v3 style).
- NO signs, NO bush, NO track marks (dropped — unreadable at this scale; the dashes
  of the bottom line replace the marks on line slides).

## 3. Content per slide

- ink voxel triad top-right (12.18, 0.42) as v3.
- S1 gallery: 5 columns across y 1.6–3.4: each design's idle+runA+runB+jump enlarged
  at 3 px/cell (≈0.5 in tall figures) in a row, bitmap label under it:
  `A · CLASSIC` `B · DASH` `C · CUP JOGGER` `D · BLOCKY` `E · LEAN`.
  Kicker `COFFEE QUEST · COMPACT LAB`, title `PICK YOUR RUNNER`, spec line:
  `stick runners at 16 cells — pick one and the deck rebuilds around it`.
- S2–S5 kicker `SIZE LAB — SMALLER THAN MICRO`, titles `RUNNER 16 CELLS` /
  `RUNNER 13 CELLS` / `RUNNER 11 CELLS` / `RUNNER 9 CELLS`; spec lines state cells,
  runner height in inches (N×0.0104), palette, bottom treatment, budget.
- S6 kicker `THANK YOU — COFFEE QUEST`, title `THANK YOU`, spec:
  `runner 7 cells (0.073in) · zoomed out · finale — brew & hearts refill`.
- Speaker notes per slide + the game cue (v3 wording).

## 4. Assets (assets\, all RGBA transparent-bg, NEAREST, no anti-aliasing)

- Text set `assets\text\` (3 px/cell, ink): kickers/titles above + labels + banner
  `COFFEE ACQUIRED` + score tags `SLIDE 1/6`..`SLIDE 6/6` (names tk01..06, tt01..06,
  tl_a..tl_e, tbanner, tscore_01..06).
- Gallery set `assets\gallery\` (3 px/cell): `<design>_<frame>` for A–E ×
  idle/runA/runB/jump at base height 16 cells.
- Game sets `assets\c16 c13 c11 c9 c7` (1 px/cell): chosen design's 4 man frames at
  that height + cactus, rock, heart_full, heart_empty, cloud1, cloud2, skyline_day,
  machine_off, machine_on, machine_done, steam1, steam2.
  c16/c11/c7 mono1; c13/c9 gray2 (man ink-only in both; gray2 tints apply to
  skyline/clouds/hearts-empty/machine accents only).
- manifest.json: `{"<folder>/<name>": {"w": cells, "h": cells}, ...}` covering every
  generated file incl. text\* and gallery\*.

### Stick-figure designs (parametric drawer, NOT fixed maps)

Draw each figure programmatically from height h (cell grid): rasterize 1-cell strokes
(Bresenham) for limbs, filled circle/square head. w ≈ 0.6×h. Frames: runA (left leg
forward), runB (right leg forward), jump (legs tucked, arms up), idle (standing).

- **A CLASSIC** — circle head (r = max(1, round(h/7))), straight vertical torso,
  opposite-phase pumping arms at ~45°, striding legs ±30°.
- **B DASH** — circle head, 15° leaning torso, arms tucked in L shapes, legs as bent
  chevrons, plus 2 horizontal speed-line strokes trailing behind the torso.
- **C CUP JOGGER** — A, but the leading arm is raised forward holding a 2×2 filled
  coffee cup (+1 handle pixel) — the coffee-seeker.
- **D BLOCKY** — 3×3 square head, vertical torso, right-angle limbs only (arms
  horizontal-then-down, legs L-shaped) — pixel-robot vibe.
- **E LEAN** — 30° forward-leaning torso, wide leg stride, a 3-cell scarf line
  trailing from the neck.

### Coffee machine (14 wide × 17 tall cells, silhouette + transparent holes)

- rows 0–1 hopper lid (14w×2h, 1-cell notch left) · rows 2–3 transparent gap band ·
  rows 4–11 body with a transparent 8×5 window: inside it 2 button dots (2×1) and a
  1×1 status light · row 12 full-width shelf · rows 13–14 centered 2w spout ·
  rows 12–16 carafe (6w) with 1w handle, sitting under the shelf left of the spout ·
  row 16 base + 2 foot notches.
- States: **off** window contents outline-only; **on** status light filled + 1 drip
  pixel under the spout; **done** additionally carafe bottom 2 rows filled (brewed).

## 5. Engine

Copy `game_engine.vba` → `game_engine_compact.vba`, two patches only:
1. ResetWorld prop init must be existence-guarded (compact world has no sign/bush
   shapes): only arm `pOn(1)` if sign1 exists; give missing props' `pT(i)` a huge
   value so they never try to spawn.
2. cfgScale cross-check compares against `mManH / 0.75` (cells at 1 px world)
   instead of `/20`.
Everything else (shape-derived geometry, blink timer, GotoSlide-safe) unchanged.

## 6. Scripts & run order

```
..\.venv\Scripts\python gen_sprites_compact.py            # ladder + design A + gallery + text
..\.venv\Scripts\python gen_sprites_compact.py --man 12 --design C   # uniform size/design
$env:NODE_PATH=(npm root -g); node build_compact.js       # ladder deck (or: node build_compact.js 12)
powershell -NoProfile -ExecutionPolicy Bypass -File inject_vba_compact.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File export_pngs_compact.ps1   # -> render_compact\
powershell -NoProfile -ExecutionPolicy Bypass -File final_verify_compact.ps1
```
inject_vba_compact.ps1 = v3 inject with compact filenames (Trusted Location901 already
covers this folder). final_verify_compact.ps1: 6 slides, GotoSlide drive 1→2→1→6,
ribbon ExecuteMso start, passive shape asserts (v3 pattern).

---

## ADDENDUM (2026-10-11) — STYLE PICKS LOCKED (overrides anything above that conflicts)

User picked from style-catalog.pptx:
1. **Runner = r02 STICK DASH** (the ONLY man design — forget the A–E gallery).
   Ink-only. Construction (from gen_catalog.py's r02): 15° leaning torso, tucked
   L-shaped arms, bent-chevron legs, 2 trailing speed-line strokes. Frames
   idle/runA/runB/jump drawn parametrically at each ladder height.
2. **Machine = m03 TALL VENDING**, COLORED (machine is exempt from the ink-only
   rule now). Slim tall cabinet ~12w×20h cells: METAL body with ink outline,
   window with rows of CREME cups, RED/GREEN/AMBER button column, GOLD coin slot,
   ink cup slot at the bottom. States: machine_off (window dark), machine_on
   (window lit + AMBER light + cup mid-drop), machine_done (CREME cup in the slot
   + GREEN light). Position: x 11.6, bottom GROUND (slide 6 only).
3. **Chest = c02 PIXEL CHUNKY**, COLORED: wood + gold, 2-cell chunky strokes,
   ~8w×6h cells. NEW game element "chest" (shape name `chest`): authored parked
   at x −3.0, bottom GROUND, present on ALL game slides. Engine (already
   patched): drifts in at 0.75× obstacle speed during normal running; touching
   the man collects it → +1 heart (max 3), respawns after ~25–45 s.
4. Colors allowed ONLY on: machine states + chest. Everything else stays
   ink/gray per palette. Palette = CATALOG-SPEC set (BROWN/DBROWN/CREME/GOLD/
   WOOD/METAL/LMETAL/BLUE/GREEN/AMBER/RED + INK).
5. gen_sprites_compact.py MUST import gen_catalog.py (importlib, same pattern as
   the v1 font import) and reuse its drawer functions for the three picks at
   compact scales — do NOT re-implement the art.
6. Picker slide 1 is REPLACED by a normal size-ladder slide (no gallery needed —
   styles are locked). Deck = 6 slides, all size ladder + thank-you finale:
   S1 c16 mono1 dashed 30s · S2 c13 gray2 edge 45s · S3 c11 mono1 dashed 60s ·
   S4 c9 gray2 edge 90s · S5 c7 mono1 dashed 120s · S6 THANK-YOU c7 mono1 dashed
   0s finale (machine + no timer). (Man 16 down to 7; S5 and S6 share the 7-cell
   "zoomed out" man.) Titles: RUNNER 16/13/11/9/7 CELLS + THANK YOU. Score tags
   SLIDE 1/6..6/6. cfgScale = man cells.
