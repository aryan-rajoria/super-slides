# Coffee Quest — game design spec (strip geometry, speeds, timer budgets, engine phases)

The design contract between `build_deck.js` (authored static state) and
`game_engine.vba` (runtime animation). Source of truth: those two files +
`inject_vba.ps1`. Companion: `LEARNINGS.md` (pipeline + VBA minefield),
`PIXEL-SPRITE-PIPELINE.md` (cell math).

## 1. Architecture: authored state + shape mutation + full reset

- `build_deck.js` places every game shape in its **authored/rest state**
  (run-in frame visible at `MAN_X`, everything else parked off-slide at
  x = -3 in / -216 pt, hearts full, timer bar full).
- The engine never adds/removes shapes. It animates by flipping `Visible`,
  `Left/Top`, `Width/Height`, bar `ForeColor`, and timer text on **named**
  shapes only (name->Shape `Scripting.Dictionary` rebuilt per slide in `Bind`).
- `OnSlideShowTerminate` (and the poll-failure self-clean path) runs
  `ResetWorld + DrawHearts + ResetTimer` on all 13 slides, restores static
  props (sign2 at 705/480, bush at 560/502.5), then sets `homePres.Saved =
  True` — the file on disk is never dirtied by a show.
- Navigation is detected **between ticks**: `GameTick` polls the live slide
  index; `idx <> lastIdx` -> `d = Sgn(idx - lastIdx)` -> `HandleEnter idx, d`
  -> `Exit Sub` (one settle frame before animation resumes).

## 2. Units and the two coordinate systems

`build_deck.js` works in inches (pptxgenjs), the engine in points (1 in =
72 pt). Same layout, two tables — keep them in sync:

| Thing | build_deck.js (in) | game_engine.vba (pt) |
|---|---|---|
| Slide | W 13.333 x H 7.5 | 960 x 540 |
| Strip top | `STRIP_TOP 6.222` | 448 |
| Ground line top | `GROUND_TOP 7.167` (fill 7.208) | `GROUND 516` |
| Man rest x / top | `MAN_X 2.083`, `MAN_Y 6.542` | `MAN_L 150`, `MAN_T 471` (45 pt tall, feet on 516) |
| Off-slide park | `-3` | `PARK -216` (wide banner `coffeetext` needs -440) |
| Jump height | — | `JUMP_H 28` (parabola `T - 28*4*t*(1-t)`, t = phT/0.8) |
| Skyline wrap | image starts at -2.222 | `SKY_PERIOD 960` (one screen) |
| Timer bar full w | 2.722 | `BAR_W 196` |
| Hearts | slots x 12.385 / 12.667 / 12.948, y = STRIP_TOP+0.014 | `HEART_L0 891.75`, `HEART_D 20.25`, `HEART_T 449`; full heart 15.75 x 13.5 |
| Track marks | mark1 0.833, mark2 7.5 (y 7.25) | wrap period 980 pt |
| Sun/moon | x 1.8 (moved from 0.556 — was under the "SLIDE 01/13" score bitmap), y 6.278 | static |
| Signs (authored) | sign1 4.722, sign2 9.792, sign3 -3, bush 7.778 (y 6.667/6.979) | runtime respawns; terminate restores sign2 705/480, bush 560/502.5 |

## 3. Shape name inventory (the JS <-> VBA contract)

Every slide's strip (all bound by `Bind`):

```
man_runA man_runB man_jump man_idle
cactus rock skyline cloud1 cloud2 mark1 mark2
sign1 sign2 sign3 bush
heartF1 heartF2 heartF3 heartE1 heartE2 heartE3
timerbar timetext timerframe      (no timer shapes on slide 13 — intentional)
cfgTime                            (hidden config at x=-0.9; also trace channel)
```

Plus, not engine-bound but named: `sunmoon`, `scoretag` (per-slide
`score_day|night_NN` bitmap), `btnStart` (cover; added by `inject_vba.ps1`
via COM `Shapes.AddShape(1, 310, 454, 230, 20)`, `ActionSettings(1):
Action=7 (ppActionRunMacro), .Run="StartGame"` — it is NOT in
build_deck.js). Finale-only (slide 13): `machine machine_on machine_done
steam steam2 coffeetext`.

`verify.ps1` asserts this inventory: 24 names on slide 2, 7 finale names on
slide 13, plus cfgTime spot-checks on slides 1/2/7/13.

## 4. Timer budgets (cfgTime text = seconds)

```js
const T = [60, 180, 240, 240, 240, 240, 300, 240, 240, 240, 240, 180, 0]; // slides 1..13
```

Cover 60 s, content 180–300 s (slide 7 = 300), Thank-You 0 = unlimited (no
bar). Editing `cfgTime` text in PowerPoint changes the runtime budget — no
rebuild needed. Each slide's notes carry a `GAME CUE (N min budget)` line.

Bar behavior per tick (`UpdateTimer`): width = `BAR_W * secsLeft / alloc`;
text `m:ss` updates on second change; at <= 60 s bar+text amber
`RGB(217,119,6)`; at <= 12 s red `RGB(220,38,38)` **and auto-jump**
(`StartJump False`). Reset restores blue `RGB(47,111,237)` and full width.

## 5. Speeds (per 25 ms tick)

| Constant | Value | Meaning |
|---|---|---|
| `SPD_GROUND` | 0.65 | ground-layer scroll (26 pt/s): track marks + props |
| `SPD_SKY` | 0.175 | skyline scroll (7 pt/s), wraps at SKY_PERIOD 960 |
| clouds | 0.08 / 0.115 | cloud1/cloud2 drift; respawn at x 1000 + Rnd*300..400 |
| `SPD_OBST` | 10.5 | obstacle sweep during a jump (420 pt/s) |
| `SPD_FINALE` | 5.75 | finale sprint (230 pt/s), capped at x=755 |
| run-in | +3 | man enters from x=-50 at 3 pt/tick to MAN_L |
| run-frame flip | 7 ticks normal (175 ms) / 5 run-in / 4 finale | `frameFlip` |

## 6. Phase machine (module `phase`, ticked by `SetTimer` 25 ms callback)

| Phase | Name | Entry | Per tick | Exit |
|---|---|---|---|---|
| 0 | idle/normal | after any phase completes | `ScrollWorld`, prop respawns, run-frame flip every 7 ticks, timer drain | nav event or cue starts a phase |
| 1 | run-in | slide 1 fresh show (`d=0`); man at x=-50 | advance +3, flip every 5 ticks | `Left >= 150` -> snap to MAN_L, phase 0 |
| 2 | jump | forward nav (`d>0`) or 0:12 cue | obstacle sweeps -10.5; man parabola starts when obstacle < 300; `phT/0.8` over 0.8 s | obstacle < -(w+12) -> land, park obstacle at -216 |
| 3 | heartpop | backward nav (`d<0`) | 3 pulse steps (scale +14% each), step 4 hides full heart / shows empty at slot, restores size | step >= 5 -> phase 0. hearts==0: shake empties instead |
| 4 | sprint | entering slide 13 | advance `SPD_FINALE`, flip every 4 ticks | Left >= 755 -> show steam at 795/453.6, phase 5 |
| 5 | brew | after sprint | every 9 ticks blink machine_on/machine + swap steam; k>=6 -> machine_done at 790/466.5, park runners, show man_idle at 755 | -> phase 6 |
| 6 | refill | after brew | every 10 ticks restore one heart (pulse size then settle 15.75x13.5); at phT>=35 show coffeetext at 543.6/430.5 | -> phase 7 |
| 7 | steam-idle | after refill | swap steam frames every 16 ticks | until nav/terminate |

Rules that bit us (fixed): `hearts = 3` init lives on the fresh-show gate
(`lastIdx = 0`) in both `OnSlideShowPageChange` and `StartGame` — never on
back-nav, or losses would be forgiven mid-show. Terminate resets
`lastIdx = 0`, `phase = 0`, `hearts = 3` and kills the timer; `PollIdx = -1`
(show gone) also self-cleans via `KillTimer`.

## 7. Prop system (signs, bush)

4 props (`sign1..3`, `bush`) per non-finale slide. On slide entry: sign1
on-screen at 340, others queued with respawn timers (sign2 18+Rnd*10 s,
sign3 45+Rnd*12 s, bush 70+Rnd*15 s). Active props scroll at
`SPD_GROUND`; at x < -130 they hide and requeue (15+Rnd*20 s). Spawns at
x = 1000+Rnd*120, top = `GROUND - height`. Finale stage is clean: all four
props parked, respawn timers 999.

## 8. Invariants worth keeping

- Man never changes horizontal speed while jogging (design requirement);
  only obstacles/skyline/props move faster.
- Hearts are show-scoped state, slide shapes are per-slide state — the
  engine redraws hearts on every slide entry (`DrawHearts`) from `hearts`.
- Alternate obstacles per jump (`nextObstRock` toggles cactus/rock).
- Fast jump (nav) starts the obstacle at x=560; timer-cue jump at x=1010.
- Everything the engine touches must have an authored rest position in
  `build_deck.js` — reset assumes it.
