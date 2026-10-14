# v3 CONTRACT — "Dino-look" Coffee Quest size/palette showcase

Shared spec for the three build agents (sprites / deck builder / VBA engine).
Base your work on the v2 sources in `..\nano-super-slides-v2\` — this file only pins the DELTAS and the invariants. Where this file and v2 conflict, this file wins.

## 0. Goal & hard rules

- 5-slide macro deck `nano-super-coffee-quest-v3.pptm`, size-label showcase: each slide shows the SAME Coffee Quest game at a different pixel size / strip height, in Chrome-dino style.
- **Strictly no color in the game.** Only ink `#1B1D22` (+ grays `#5C6068`, `#9AA0AB` on "gray" slides) and transparency.
- **No backgrounds, no borders in the game zone.** Delete from v2: the sky band rect, BOTH separator rules, the ground fill rect, the `timerframe` rect, the `sunmoon` sprite. Game elements sit directly on the slide background. The ONLY allowed full-width rect in the game zone is the thin `groundline` on slides that opt in (see matrix).
- All 5 slides use light background `F7F6F2`. There is no day/night split.
- Content text above the game uses only ink + grays, no accent colors.
- v2 folder is read-only reference. Everything new lives in `nano-super-slides-v3\`.

## 1. Slide matrix

| # | Label | cell (pt) | PNG px/cell | palette | groundline | timeSec | finale |
|---|-------|-----------|-------------|---------|------------|---------|--------|
| 1 | MICRO   | 0.75 | 1 | mono1 | none | 30  | no  |
| 2 | SMALL   | 1.50 | 2 | gray2 | thin | 60  | no  |
| 3 | CLASSIC | 2.25 | 3 | mono1 | thin | 90  | no  |
| 4 | CHUNKY  | 3.00 | 4 | gray2 | none | 120 | no  |
| 5 | JUMBO   | 3.75 | 5 | mono1 | thin | 0   | YES |

Asset set ids (folder names under `assets\`): `m1_1`, `g2_2`, `m1_3`, `g2_4`, `m1_5` — `<palette><px>`.

## 2. Deck geometry (INCHES; slide 13.333 × 7.5, LAYOUT_WIDE)

Constants identical on every slide:

- `W = 13.333`, `H = 7.5`, `MG = 0.55`
- `GROUND = 7.167` — the man's feet line, bottom-anchored, SAME on all 5 slides. (v2 value; = 516 pt.)
- Parking x for hidden shapes: `-3.0` (off-slide at every scale — keep v2's PARK).

Per-variant derived values (`CELLin = cellPt / 72`, man = 20 cells tall):

- `manH = 20 * CELLin`, `MAN_X = 2.083`, `MAN_Y = GROUND - manH`
- `jumpH = 0.622 * manH` (v2: 28 pt / 45 pt)
- skyline: height 16 cells, top = `GROUND - 16*CELLin`, **explicit width = 2 × W = 26.666 in** (2 seamless periods; engine derives period = width/2), starts at x = −2.222
- clouds: cloud1 top = `GROUND - 1.85*manH`, x = 3.1; cloud2 top = `GROUND - 1.65*manH`, x = 6.4
- score tag (bitmap `SLIDE N/5`): top = `GROUND - 1.85*manH`, x = 0.167
- hearts (HUD, right-anchored to slide): heart w = 6 cells, spacing 9 cells, rightmost heart's right edge = `W - 0.2`; row top = `GROUND - 3.5*CELLin - heartH` (heartH = 6 cells) — i.e. hearts float just above the ground line on the right
- timer (NOT on slide 5): bar w = 87 cells, h = 3.5 cells, bar right edge = `W - 0.2`, bar top = `GROUND - 3.5*CELLin - heartH - 4*CELLin - barH` (stacked above hearts); `timetext` right-aligned to bar left minus 0.08, same vertical band, MONO bold 9.5 ink. **No frame rect.**
- groundline (slides 2, 3, 5 only): rect x=0, y=`GROUND`, w=W, h=1 cell, fill ink, objectName `groundline`. Draw it AFTER the skyline so it overlaps the skyline's bottom cell.
- track marks: `mark1` at x 0.833, `mark2` at x 7.5; w = 8 cells, h = 2 cells, y = `GROUND + 2*CELLin`, ink (floats on no-line slides too — dino-style ground dashes)
- props: sign1 (COFFEE →) x 4.722, sign2 (NO COFFEE) x 9.792, bush x 7.778; sign top = `GROUND - 16*CELLin`, bush top = `GROUND - 5*CELLin`; sign3 + all obstacles + spare man frames parked at −3.0 (cactus top = `GROUND - 10*CELLin`, rock top = `GROUND - 5*CELLin` when parked)
- slide 5 finale furniture: `machine` on-stage x 10.972, top = `GROUND - 22*CELLin` (machine 22 cells); machine_on/machine_done/steam1/steam2 parked −3.0 (steam top = `GROUND - 22*CELLin - 5*CELLin`); `coffeetext` parked at −6.0, top = `GROUND - 1.6*manH - 14*CELLin` (banner 14 cells tall)
- hidden config shapes: `cfgTime` at x −0.9 (v2 style), NEW `cfgScale` at x −0.9 y 0.45 — text is the cell pt as a plain number: `0.75`, `1.5`, `2.25`, `3.0`, `3.75`

Content block (all slides, above the game):

- background `F7F6F2`
- small ink voxel triad top-right at (12.18, 0.42), three 0.14 in squares ink/gray/gray
- bitmap kicker at (MG, 0.44), h ≈ 0.22 in; bitmap title at (MG, 0.72), h ≈ 0.52 in (assets `text\v3k0N`, `text\v3t0N`)
- native spec line under title at (MG, 1.4), MONO 10.5, color `5C6068`:
  1. `cell 0.75pt · runner 0.21in · ground line none · 1-bit ink`
  2. `cell 1.50pt · runner 0.42in · ground line thin · ink + 2 grays`
  3. `cell 2.25pt · runner 0.63in · ground line thin · 1-bit ink`
  4. `cell 3.00pt · runner 0.83in · ground line none · ink + 2 grays`
  5. `cell 3.75pt · runner 1.04in · ground line thin · 1-bit ink · finale`
- speaker notes per slide describing the variant + the game cue.

## 3. Bitmap text strings (render EXACTLY these)

Kickers (set `v3k01..v3k05`) / titles (set `v3t01..v3t05`):

1. `SIZE LAB 01/05 — ONE-BIT` / `MICRO — 1PX CELLS`
2. `SIZE LAB 02/05 — GRAY` / `SMALL — 2PX CELLS`
3. `SIZE LAB 03/05 — ONE-BIT` / `CLASSIC — 3PX CELLS`
4. `SIZE LAB 04/05 — GRAY` / `CHUNKY — 4PX CELLS`
5. `SIZE LAB 05/05 — ONE-BIT` / `JUMBO — 5PX CELLS`

Score tags per variant set: `SLIDE 1/5` … `SLIDE 5/5` → `scoretag_01..05` in each game set.

## 4. Shape names (objectName) — engine/builder contract

Keep these v2 names verbatim wherever the element exists:
`man_runA man_runB man_jump man_idle heartF1 heartF2 heartF3 heartE1 heartE2 heartE3 cactus rock bush sign1 sign2 sign3 cloud1 cloud2 skyline mark1 mark2 machine machine_on machine_done steam steam2 coffeetext timerbar timetext cfgTime scoretag`

New: `cfgScale` (hidden), `groundline` (slides 2/3/5 only).
Dropped (must NOT exist): `timerframe`, `sunmoon`, and all background/rules rects.
`man_runA` is the ONLY man frame on-screen at build time; all other frames + heartE*/obstacles/sign3 park at −3.0.

The engine MUST NOT require `groundline` to exist (slides 1/4 have none) and MUST NOT require `timerbar`/`timetext` on the finale slide.

## 5. Sprites (assets)

- Per game set folder (`m1_1`, `g2_2`, `m1_3`, `g2_4`, `m1_5`): `man_runA man_runB man_jump man_idle heart_full heart_empty cactus rock bush sign_coffee sign_nocoffee sign_closed cloud1 cloud2 skyline_day machine_off machine_on machine_done steam1 steam2 coffee_acquired scoretag_01..05` — PNG RGBA, transparent background, **N px per sprite cell where N = the set number**, NEAREST/no anti-aliasing.
- Content text set `assets\text\`: `v3k01..05`, `v3t01..05` at **3 px/cell, ink only**.
- Palette remap from the v2 role letters:
  - **mono1**: every role → ink `#1B1D22`, except white/board/cloud-fill roles → transparent. Result: solid silhouettes with transparent holes (man, cactus, rock, machine = silhouettes; clouds, sign boards, heart_empty = OUTLINES ONLY — strip interior pixels to transparent via an outline-erode pass; heart_full stays solid).
  - **gray2**: ink-ish roles (ink, pants, hair, outline) → `#1B1D22`; mid roles (shirt shade, wood, coffee, cactus body, rock body, moon) → `#5C6068`; light roles (skin, shirt light, cloud shade, pale) → `#9AA0AB`; white roles → transparent. heart_empty = gray outline, heart_full = ink with gray highlight.
  - skyline in BOTH palettes: facades solid (ink / `#9AA0AB`), window pixels → transparent (holes), so it reads as a punched silhouette.
- Reuse v2's pixel maps + the v1 5x7 font (`..\nano-super-slides-v1\gen_assets.py` loaded via importlib, same as v2 line 16).
- Write `assets\manifest.json`: `{ "<set>/<name>": {"w": cells, "h": cells}, ... }` plus `text/<name>` entries.

## 6. VBA engine deltas (everything else stays as v2)

- **No hardcoded slide geometry.** At `Bind(sl)` capture from shapes: `mManL/mManT/mManW/mManH` from `man_runA` (at bind = rest pose), `mGround = mManT + mManH`, `mSkyPeriod = sh("skyline").Width / 2`, hearts anchor from `heartF1.Left/.Top` + spacing from `heartF2.Left - heartF1.Left`, banner/machine rects from their shapes. Cross-check `cfgScale` text against `mManH / 20` (both in pt) and log mismatches via `TraceIt`, do not fail.
- Scale every per-tick speed by `f = mManH / 45` (v2 speeds were tuned at manH 45 pt: ground 0.65, sky 0.175, obstacle 10.5, sprint 5.75).
- Jump height `0.622 * mManH`; park stays −216 pt; obstacle spawn/finale x positions derived from slide width 960 pt + shape widths.
- **Timer recolor → blink** (no colors allowed): ≤60 s remaining → toggle `timerbar.Visible` every 20 ticks; ≤12 s → every 6 ticks + keep the auto-jump wrap-up cue. Text updates per second as in v2. Restore `Visible = True` whenever the bar is shown/full or on reset.
- Replace any hardwired "13 slides" with `ActivePresentation.Slides.Count`; finale slide = last slide.
- Keep verbatim: SetTimer architecture + phase machine, `StartGame`, `OnSlideShowPageChange/Terminate`, `TraceIt`, `DBG_PING`, `DBG_COMPILE`, full show-end reset, `Qz()` 0.75 pt quantization.
- Known gotchas (violating these cost a day in v2 — DO NOT reintroduce): no Sub/Function named `Mark`; `Set` required for Dictionary shape assignments; auto-macros must return immediately (no blocking DoEvents loops); use `SlideShowWindows(1).View.Slide.SlideIndex`, not `View.CurrentSlideIndex`; `btnStart` on slide 1 (added by the inject script) is the lazy-load kicker — `StartGame` must remain reachable via `Application.Run "file!StartGame"`.

## 7. Build & run order (main session)

1. `..\.venv\Scripts\python gen_sprites_bw.py` (assets must exist before node build)
2. `$env:NODE_PATH=(npm root -g); node build_deck.js` → `nano-super-coffee-quest-v3.pptx`
3. `powershell -File inject_vba.ps1` (adapted: v3 paths, btnStart = ink fill `1B1D22` + white MONO text, adds v3 folder as a Trusted Location)
4. `powershell -File export_pngs.ps1` → `render\slideN.png`
