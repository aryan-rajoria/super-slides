# CATALOG-SPEC — style-catalog.pptx picker deck (3 slides, static, no VBA)

Lives in `nano-super-slides-v3\`. Purpose: the user picks art styles for the compact
game deck. Decks/scripts: `gen_catalog.py`, `build_catalog.js`, `export_pngs_catalog.ps1`
(→ `render_catalog\`). Nothing else in the folder may be modified.

## Hard rules

- Slides 13.333×7.5 in, bg `F7F6F2`, header per house style: bitmap kicker y 0.44,
  bitmap title y 0.72 (h 0.52), ink voxel triad at (12.18, 0.42) — same as the v3 deck.
- Runners: INK-ONLY (`1B1D22` + transparent). Machines + chests colored.
- EXACT palette (no other colors may appear in any PNG):
  INK 1B1D22 · BLUE 2F6FED · GREEN 16A34A · AMBER D97706 · RED DC2626
  BROWN 8A5A2B · DBROWN 6B4420 · CREME F2E8D5 · GOLD F5C86E · WOOD A0673F
  METAL 555B66 · LMETAL 9AA0AB. White = transparent (holes).
- All PNGs RGBA transparent bg, integer px per cell, NEAREST (no anti-alias).
- Catalog sprites are drawn at **4 px/cell** (display scale) except mini-1bit chest
  (draw at 1 px/cell, displayed larger). Text bitmaps at 3 px/cell, ink only.

## Assets & names

`assets\catalog\run\<id>_<frame>.png` — ids r01..r10, frames idle / runA / runB
(30 files). Base figure 16 cells tall, w ≤ 13.
`assets\catalog\machine\<id>.png` — m01..m08 (8 files). 20–30 cells tall.
`assets\catalog\chest\<id>_<variant>.png` — c01..c08; variants `ink` + `col` for all;
  plus `ink_open` + `col_open` ONLY for c01..c04; c08 has NO open pair (it is open).
  (16 + 8 = 24 files). Closed ~16w×12h cells; open taller.
`assets\catalog\text\*.png` (3 px/cell ink): `tk` (kicker, reused all slides),
  `tt01..tt03` (titles), and 26 name labels exactly as spelled below.
`assets\catalog\manifest.json`: `{"catalog/<sub>/<name>": {"w": cells, "h": cells}, ...}`
for every file.

### Slide 1 — RUNNER STYLES (10 tiles, 5 cols × 2 rows)

Each tile: idle + runA + runB side by side, name bitmap below, then native MONO 8pt
gray descriptor line. Grid area y 1.5 → 7.25.

| id | label | descriptor | construction (16-cell figure, 1-cell strokes unless noted) |
|----|-------|------------|------------------------------------------------------------|
| r01 | STICK CLASSIC | circle head, pumping arms, scissor legs | circle head r2, straight torso, opposite-phase 45° arms, ±30° legs |
| r02 | STICK DASH | leaning torso, speed lines | 15° lean, tucked L arms, bent-chevron legs, 2 trailing speed strokes |
| r03 | CUP JOGGER | classic stick + coffee to go | r01 with leading arm raised holding 2×2 cup + handle pixel |
| r04 | STICK LEAN | 30 degree lean, trailing scarf | 30° torso, wide stride, 3-cell scarf line from neck |
| r05 | BLOCKY | right angles only, pixel robot | 3×3 square head, vertical torso, L-shaped arms/legs, no diagonals |
| r06 | BLOB MINI | solid silhouette, dino style | solid rounded body: head blob, 2 stub legs, tail nub, no internal detail |
| r07 | HOLLOW | outline-only silhouette | same silhouette as r06 but outline only (erode-and-subtract), 1-cell wall |
| r08 | CHONK 2PX | fat strokes, 8-bit | r01 geometry drawn with 2-cell strokes, joints squared |
| r09 | GEOMETRIC | triangle torso, rect limbs | filled triangle torso, circle head, rectangular legs/arms |
| r10 | SHADOW | solid ink, white face detail | solid r06-like human body with transparent 2-pixel eyes + shirt row |

Frames: runA left leg forward, runB right leg forward (arm phase swapped), jump not
shown. Idle = standing.

### Slide 2 — COFFEE MACHINE STYLES (8 tiles, 4 cols × 2 rows)

Each tile: one machine sprite (~1 in tall), name bitmap, descriptor. Colored per
palette; ink outlines on every colored part.

| id | label | descriptor | art notes |
|----|-------|------------|-----------|
| m01 | CLASSIC DRIP | hopper, window, carafe | hopper lid, gap band, body w/ window (buttons RED/AMBER, GREEN light), shelf, spout, CREME carafe w/ BROWN coffee, feet |
| m02 | ESPRESSO BOX | portafilter, gauge, wand | LMETAL box body, round gauge (white face, AMBER needle), portafilter with WOOD handle, steam wand, CREME cup, BLUE brand stripe |
| m03 | TALL VENDING | window, buttons, cup slot | tall METAL cabinet, window with rows of CREME cups, RED/GREEN/AMBER button column, GOLD coin slot, ink cup slot at bottom |
| m04 | MOKA POT | stovetop octagon | BROWN base cylinder, GOLD waist band, DBROWN octagon top, ink handle + lid knob |
| m05 | POUR-OVER | stand, cone, carafe | WOOD stand frame, white cone dripper with BROWN drip, LMETAL-outline glass carafe with BROWN coffee |
| m06 | FRENCH PRESS | cylinder + plunger | LMETAL-outline glass cylinder, BROWN coffee in lower half, CREME crema line, ink plunger rod with WOOD knob |
| m07 | CAPSULE TOWER | slim tower, capsule drawer | slim LMETAL tower, BLUE band, drawer front with 2×2 GOLD capsules, cup tray |
| m08 | CAFÉ BREWER | two taps, big hopper | wide METAL body, big BROWN hopper, two ink+GOLD taps, drip trays, two CREME cups, GREEN ready lights |

### Slide 3 — TREASURE CHEST STYLES (8 tiles, 4 cols × 2 rows)

Each tile: `ink` and `col` variants side by side (caption row "INK · COLORED" native
8pt gray under the pair); for c01..c04 the open pair sits beside them (4 sprites per
tile, 2×2 arrangement ok). Name bitmap + descriptor below.

| id | label | descriptor |
|----|-------|------------|
| c01 | CLASSIC | wood + gold bands, arc lid |
| c02 | PIXEL CHUNKY | fat 8-bit chest |
| c03 | IRON VAULT | metal bands, heavy lock |
| c04 | MAGICAL | glow lines, sparkles |
| c05 | CRATE | plain planks |
| c06 | ROYAL | gold trim, gems |
| c07 | MINI 1-BIT | tiny ink silhouette |
| c08 | LOOT PILE | open chest, mound of coins |

Art: WOOD planks + GOLD bands + ink lock (c01/c02 chunky 2-cell strokes); c03 METAL
body LMETAL bands rivets; c04 wood + AMBER glow seams + GOLD sparkle pixels (open:
GOLD glow beam); c05 WOOD only + ink outline; c06 DBROWN + GOLD trim + RED and BLUE
gems; c07 10×7 cells pure ink, drawn 1 px/cell displayed at 4× (crisp); c08 open
chest base + GOLD coin mound + sparkles. Open variants: lid raised, GOLD coins visible.
Ink variants = same maps, every colored cell → INK.

### Text bitmaps (exact strings)

- `tk`: `COFFEE QUEST · STYLE CATALOG`
- `tt01` `PICK YOUR RUNNER` · `tt02` `PICK YOUR MACHINE` · `tt03` `PICK YOUR CHEST`
- Name labels = the LABEL column strings above (r01..r10, m01..m08, c01..c08;
  file names `lr01..lr10`, `lm01..lm08`, `lc01..lc08`).

## Slide furniture

- Spec line under each title (native MONO 10.5, 5C6068):
  s1 `reply with a runner number — the compact deck builds around it`
  s2 `colored is allowed now — reply with a machine number`
  s3 `ink = game-ready, colored for comparison — reply with a chest number`
- Speaker notes per slide explaining the reply format.
- NO game strip, NO engine, NO timers — static catalog.

## Run order

1. `..\.venv\Scripts\python gen_catalog.py`  (assets first)
2. `$env:NODE_PATH=(npm root -g); node build_catalog.js` → `style-catalog.pptx`
3. `powershell -NoProfile -ExecutionPolicy Bypass -File export_pngs_catalog.ps1` →
   `render_catalog\slide-0N.png` (1920×1080)
