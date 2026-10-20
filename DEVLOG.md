# Developer Log — nano-super "Coffee Quest" edition (v2): build + VBA engine debugging

**Date:** 2026-10-10 (single-day session; log updated to final state after end-to-end verification and cleanup)
**Project dir:** `C:\Users\aryan\pro\slides\nano-super-slides-v2\`
**Deliverable:** `nano-super-coffee-quest.pptm` (13 slides, macro-enabled)

## TL;DR

Built the v2 game deck (v1's 12 content slides untouched + a new Thank-You slide, pixel-game strip on every slide); visual QA passed 13/13 after three layout fixes. The injected VBA engine then appeared completely dead during COM-driven slideshows. Ten environmental hypotheses were eliminated before the real causes were isolated — six in total:

- **A** — a diagnostic sub named `Mark` (effectively a reserved identifier) made the entire `GameEngine` module uncompilable, while VBA's lazy per-call-chain compilation let `Application.Run` probes pass.
- **B** — PowerShell COM `Run` overload binding fails.
- **C** — `Dictionary(k) = shape` silently requires `Set`.
- **D** — PowerPoint lazy-loads VBA projects in COM sessions: `OnSlideShowPageChange` never fires unless a macro was Run pre-show (proven deterministically 0/3 vs 3/3; matches PPT FAQ FAQ01152; the FAQ's ActiveX-kicker mitigation is blocked on this Office build).
- **E** — `View.CurrentSlideIndex` returns null/empty under COM-automated shows.
- **F** — the v2 engine's infinite `DoEvents` loop inside `OnSlideShowPageChange` blocked the synchronous COM `Run()` call → "RPC server unavailable" (not a crash). This forced the architecture rewrite: **engine v3** = `SetTimer` (user32, 25 ms) + `AddressOf OnGameTimer` callback driving a bounded per-tick phase state machine; auto-macros return immediately.

**Final verification PASSED end-to-end** (`final_verify.ps1`): skyline scroll, run-cycle, forward jump, backward heart-pop, timer drain, slide-13 finale with hearts refill, terminate after 583 ticks with zero errors and all 13 slides auto-reset. Works COM-driven and interactive (F5) alike. Cleanup done: ~30 diagnostic artifacts deleted; `DisableHardwareAcceleration` reverted; `AccessVBOM=1` and Trusted Location kept intentionally.

## 1. What was built

A 13-slide macro-enabled PowerPoint deck: the 12 content slides of the v1 nano-super deck, plus a new Thank-You slide (13). Every slide carries a pixel-art game strip across the bottom: a chrome-dino-style runner hunting coffee, a 3-hearts HUD, and a per-slide countdown timer.

| Trigger | Behavior |
|---|---|
| Slideshow running | Man jogs at a constant, slow speed — never speeds up. Signs, clouds, skyline scroll past. |
| Forward slide change | Man jumps an obstacle (cactus or rock). |
| Backward slide change | Lose one heart (3 total; at zero, hearts shake). |
| Timer low | Amber at 1:00; at 0:12 left the bar turns red and the man auto-jumps (wrap-up cue). |
| Slide 13 (Thank You) | Man sprints to the coffee machine, it brews (light + steam), cup acquired ("COFFEE ACQUIRED"), hearts refill. |
| Show ends | All 13 slides reset to authored state; file left unmodified (marked Saved). |

Per-slide time budgets live in a hidden off-canvas `cfgTime` text shape (cover 60 s, content 180–300 s, thank-you unlimited); the engine reads it at slide entry.

Build pipeline (order matters):

| Step | Script | Role |
|---|---|---|
| 1 | `gen_sprites.py` | Pillow; 53 pixel sprites via grid/palette renderer; reuses the v1 5x7 bitmap font; writes `assets/` |
| 2 | `build_deck.js` | pptxgenjs; builds the .pptx; every game shape named via `objectName` for VBA addressing |
| 3 | `inject_vba.ps1` | PowerPoint COM opens the .pptx read-write + windowed, adds std module `GameEngine` from `game_engine.vba`, SaveAs .pptm |
| 4 | `export_pngs.ps1` | Renders slide PNGs via COM for visual QA (per this machine's no-LibreOffice rule) |

Visual QA (visual-judge subagent): initial run 10/13 pass. Fixed: cover date/voxel collision; stray voxel on slide 12; on slide 13 a parked-offslide "COFFEE ACQUIRED" banner bleeding 2.5 in into view plus a sign colliding with the coffee machine. Re-judged: 13/13.

### File inventory (final, post-cleanup)

| Path | Role |
|---|---|
| `nano-super-slides-v2\nano-super-coffee-quest.pptm` | Deliverable deck (v1 content + game strip + engine v3) |
| `nano-super-slides-v2\nano-super-coffee-quest.pptx` | Intermediate pptxgenjs output, pre-injection |
| `nano-super-slides-v2\game_engine.vba` | VBA engine source (~860 lines), injected as module `GameEngine` |
| `nano-super-slides-v2\build_deck.js` | Deck builder (pptxgenjs) |
| `nano-super-slides-v2\gen_sprites.py` | Sprite generator (Pillow) |
| `nano-super-slides-v2\assets\` | Generated sprite PNGs + manifest |
| `nano-super-slides-v2\inject_vba.ps1` | pptx → pptm converter (PowerPoint COM) |
| `nano-super-slides-v2\export_pngs.ps1` | Slide → PNG renderer (PowerPoint COM) |
| `nano-super-slides-v2\verify.ps1` | Short COM regression check (run-in/scroll/heart states) |
| `nano-super-slides-v2\final_verify.ps1` | Full end-to-end regression: 5-stage show drive + exit-reset assertions |
| `nano-super-slides-v2\README.md` | Usage + rebuild instructions |
| `nano-super-slides-v1\` | v1 sources, untouched |
| ~~diagnostics~~ | ~30 throwaway probe/bisect scripts, temp .pptm decks and screenshots — **deleted at cleanup** (§2.11) |

## 2. Debugging timeline

### 2.1 Symptom 1 — "engine never ran"

After injection, COM-driven slideshows navigated normally but every shape stayed in its authored state: no scroll, no run cycle, no reactions to navigation. The probe channel — marker text the engine writes into the hidden `cfgTime` shape — never changed. So either the auto-macros were not firing at all, or the module was not executing.

### 2.2 Hypotheses eliminated (dead ends)

| # | Hypothesis | Action | Outcome |
|---|---|---|---|
| 1 | Game shapes misnamed → engine finds nothing | Audited shape names against `build_deck.js` `objectName`s | Naming was fine |
| 2 | "Trust access to the VBA project object model" off | Checked `AccessVBOM` | Already = 1 |
| 3 | Folder not trusted → macros disabled | Added Trusted Location `Location900` → v2 folder | Kept (deck now opens macro-enabled), but not the cause |
| 4 | `AutomationSecurity` blocking macros | Checked | Already msoLow |
| 5 | Read-only open produced modules that never run | Switched to read-write open | Not the cause (pipeline is read-write+windowed regardless) |
| 6 | Windowless open produced modules that never run | Switched to windowed open | Not the cause (see above) |
| 7 | Office updated mid-session (Click-to-Run) | Checked binary dates | Dated 2026-09-30 — no mid-session update |
| 8 | Crash-recovery state poisoning startup | Deleted Resiliency keys under PowerPoint | No effect (deletion harmless) |
| 9 | Zombie POWERPNT.EXE processes wedging COM | Killed zombies | Real but secondary: zombies from cancelled scripted COM runs make `SlideShowSettings.Run()` E_FAIL machine-wide (even for blank decks) — a genuine E_FAIL source masking the real one |
| 10 | Hardware acceleration breaking event delivery | Set `DisableHardwareAcceleration=1` | Did NOT help; **reverted at cleanup** (§5) |

Two independent E_FAIL producers were live at once (zombie processes, and — discovered later — the module compile error firing a dialog at show start), which is why the problem read as environmental for so long.

### 2.3 Breakthrough: stub-bisection → `Mark` (user-assisted discovery)

Module variants were bisected by compilation behavior:

- Declarations-only variants: all compiled.
- Variant keeping only `Mark`/`MARK`: failed to compile.
- Full ~800-line engine minus `Mark`/`MARK`: ran fine.

Conclusion: `Mark` is effectively a reserved identifier; a `Sub Mark(...)` / `Sub MARK()` anywhere in the module makes the whole module uncompilable.

Why it masqueraded as an environment bug: VBA compiles lazily, per call chain. A simple `Application.Run` probe compiled and ran fine, so "macros work." `OnSlideShowPageChange` pulls in the whole engine; it failed to compile and the auto-macros died silently. Worse, the compile-error dialog fires at show start, which COM surfaces as `SlideShowSettings.Run()` E_FAIL — machine-wide-looking breakage.

Fix: renamed to `TraceIt` / `DBG_PING`; `DBG_COMPILE` probe added so a broken module can never hide behind a passing single-macro probe (§4.1).

### 2.4 Secondary causes confirmed during re-verification

- PowerShell plain `$pp.Run("Macro")` fails COM overload binding (root cause B).
- `Dictionary(k) = shapeObject` silently requires `Set` (root cause C).

### 2.5 Root cause D confirmed — lazy VBA project initialization

Even with A–C fixed, event firing stayed inconsistent: sessions that called any macro (e.g. `DBG_PING`) before starting the slideshow had `OnSlideShowPageChange` fire; sessions without a pre-show Run had no events. This was proven deterministically by a local test-matrix subagent:

- Pre-show Run absent: auto-macros fired **0/3** sessions.
- Pre-show Run present: auto-macros fired **3/3**.
- Read-only vs read-write and WithWindow vs windowless: irrelevant.

A parallel web-research subagent matched this to published documentation: PPT FAQ **FAQ01152** (OnSlideShowPageChange does not fire) — PowerPoint lazily loads the VBA project; in COM-automated sessions nothing touches it before the show.

Attempted mitigation (per the FAQ): inject an off-slide `Forms.Label.1` ActiveX "kicker" on slide 1 to force VBA init at show start. **FAILED** — this Office build blocks programmatic `Shapes.AddOLEControl` (`DISP_E_UNKNOWNNAME`, both direct call and via `InvokeMember` reflection). `inject_vba.ps1` retains the attempt as a warned try/catch; it is inert on this machine.

Practical outcome: the .pptm opened in PowerPoint then F5 (the normal presenting path, per README) initializes the project and works; only double-clicking a `.ppsm` would be the broken path. COM test scripts must call `DBG_PING` once before `SlideShowSettings.Run()` (`final_verify.ps1` does).

### 2.6 User-visible incidents

VBA error dialogs appeared on the user's screen twice:

1. A probe macro read `Shapes(1).TextFrame` on a picture → runtime error dialog.
2. A `DBG_STATE` probe was invoked mid-show via `Application.Run` — re-entrant Run into a live `DoEvents` loop → modal dialog risk.

These dialogs were decisive diagnostic evidence (they proved macros were executing). Rules adopted: surface errors to the user rather than suppressing everything during diagnosis; never call `Application.Run` during an active slideshow; verify state by passively reading shape properties instead.

### 2.7 Engine architecture v2 (blocking) — superseded

The original `game_engine.vba` (~800 lines, module `GameEngine`) ran a single blocking loop:

- `OnSlideShowPageChange` — stored the Presentation, wrote the `TraceIt` marker, busy-guard, then entered a single blocking `Engine` loop (`DoEvents` + `Sleep` 25 ms), polling navigation via `PollIdx()`.
- `OnSlideShowTerminate` — reset all 13 slides to authored state and marked the file Saved.

Proven working in at least one session, but architecturally unsound — see §2.9.

### 2.8 Root cause E — `View.CurrentSlideIndex` null under COM

With A–D fixed, the engine still bailed instantly: the terminate marker read `loop=0` — the engine exited at `PollIdx` before its first tick. The smoking gun: `View.CurrentSlideIndex` returns null/empty under COM-automated shows on this machine (raising into the module-wide `On Error Resume Next`, so the loop aborted silently).

Fix: `PollIdx()` now reads `SlideShowWindows(1).View.Slide.SlideIndex` instead.

### 2.9 Root cause F — "RPC server unavailable" crash → engine v3 (SetTimer)

Immediately after the E fix, PowerPoint "crashed" reproducibly at `Run()` with "RPC server unavailable" (0x800706BA/BE). Root cause was NOT a crash: `OnSlideShowPageChange` fires synchronously *inside* the COM `SlideShowSettings.Run()` / `View.Next()` calls; the v2 engine's infinite `DoEvents` loop never returned, so the synchronous COM call never completed and the RPC channel died.

Architecture replaced — **engine v3** (`game_engine.vba`, ~860 lines):

- `SetTimer` (user32, 25 ms) + `AddressOf OnGameTimer` callback drives a bounded per-tick state machine on PowerPoint's own message pump.
- Phases: 0 idle, 1 run-in, 2 jump, 3 heartpop, 4 sprint, 5 brew, 6 refill, 7 steam-idle.
- Auto-macros (`OnSlideShowPageChange`, `OnSlideShowTerminate`) return immediately — they only set state, start/kill the timer, and run reset logic on terminate.
- Works identically for COM-driven and interactive shows; `KillTimer` on terminate prevents leaks.

### 2.10 Final verification — PASSED

`final_verify.ps1` (fresh inject, then `DBG_PING` pre-show, then a 5-stage COM-driven show):

```
INJECTED GameEngine (860 lines)
WARN: kicker not added: DISP_E_UNKNOWNNAME   (expected on this build)
start s1: runBvis=-1 skylineL=-176.2 cactusVis=0
s2 fwd:   cactusVis=0 rockVis=0 skylineL=-181.5 timer=2:58 barW=194
s1 back:  heartF3vis=0 heartE3vis=-1 E3L=932.2
s13:      machineDoneVis=-1 idleL=755 coffeeTextVis=-1 steamVis>0 heartF1..3 full
exit:     cfg=T loop=583 h=3 p=7 e=[]
```

Confirmed live: slide-1 run-in + skyline scrolling (−160 → −176 pt) + run-frame toggling; forward to slide 2 = entry jump completed, obstacles re-parked hidden, timer draining (3:00 → 2:58, bar 196 → 194 pt); backward = heart popped (`heartF3` hidden, `heartE3` shown at slot x=932.25); slide 13 finale = `man_idle` at exactly x=755, `machine_done` visible, COFFEE ACQUIRED text, steam idling, hearts refilled (h=3 after the loss). Terminate marker `T loop=583 h=3 p=7 e=[]` — 583 ticks, zero recorded errors, all 13 slides reset to authored state, `cfgTime` restored.

### 2.11 Cleanup

- ~30 diagnostic artifacts deleted from `nano-super-slides-v2\` (probe/bisect scripts, temp .pptm decks, screenshots). Kept: README.md, DEVLOG at root, pipeline scripts, `game_engine.vba`, `verify.ps1`, `final_verify.ps1`, deck files, `assets\`.
- Registry: `DisableHardwareAcceleration` (set during hypothesis 10, didn't help) reverted and the then-empty `Graphics` key removed. `AccessVBOM=1` and Trusted Location `Location900` kept intentionally (§5).

## 3. Confirmed root causes & fixes (all resolved)

### THE bug — root cause A: `Mark` is effectively a reserved identifier

A diagnostic sub named `Mark` made the entire `GameEngine` module uncompilable. Because VBA compiles lazily per call chain, the symptoms were inverted and misleading: `Application.Run` probes passed (their call chains compiled), while `OnSlideShowPageChange` — which pulls in the whole engine — silently failed to compile, killing all auto-macros and firing a compile-error dialog at show start that COM reports as machine-wide-looking `SlideShowSettings.Run()` E_FAIL.

Fix: rename `Mark`/`MARK` → `TraceIt`/`DBG_PING`, and add the `DBG_COMPILE` whole-graph probe (§4.1) so a broken module can never again hide behind a passing single-macro probe.

**Key lesson: `Application.Run("file.pptm!Macro")` succeeding does NOT prove the module compiles.**

| Root cause | Symptom | Fix | Status |
|---|---|---|---|
| A — `Sub Mark(...)`/`Sub MARK()` breaks whole-module compilation | Auto-macros silently dead; E_FAIL at show start | Rename to `TraceIt`/`DBG_PING`; gate with `DBG_COMPILE` | **Resolved** (stub-bisection) |
| B — PowerShell COM `Run` overload binding fails | `$pp.Run("Macro")` errors | `GetType().InvokeMember("Run", …)`; always qualify with the file name | **Resolved** |
| C — `Dictionary(k) = shapeObject` without `Set` | Runtime error 438 | `Set Dictionary(k) = shapeObject` | **Resolved** |
| D — VBA project lazily loaded; auto-macros don't fire without pre-show init | Sessions without a pre-show macro Run had no events (0/3 vs 3/3, deterministic) | Call `DBG_PING` once before the show in COM scripts; interactive .pptm+F5 unaffected. ActiveX-kicker mitigation blocked (`AddOLEControl` → `DISP_E_UNKNOWNNAME`) | **Resolved** (matched to FAQ01152; only .ppsm double-click is broken) |
| E — `View.CurrentSlideIndex` null/empty under COM-automated shows | Engine bailed at `PollIdx` before first tick (`loop=0`) | `SlideShowWindows(1).View.Slide.SlideIndex` | **Resolved** |
| F — blocking `DoEvents` loop inside `OnSlideShowPageChange` deadlocks the synchronous COM `Run()` call | "RPC server unavailable" at `Run()` (looks like a crash) | Engine v3: `SetTimer` 25 ms + `AddressOf OnGameTimer`; auto-macros return immediately | **Resolved** (architecture replaced) |

## 4. Established verification patterns

1. **`DBG_COMPILE` — force whole-graph compilation before trusting a module.** `Application.Run` success proves only that the called macro's chain compiles. Force the whole graph with dead code (live copy in `game_engine.vba`):

   ```vba
   Public Sub DBG_COMPILE()
       If False Then
           Engine
           HandleEnter 1, 0
           DoJump 1, True
           ' ... one dead call for EVERY procedure in the module ...
           Finale
       End If
       TraceIt "C"
   End Sub
   ```

   Fire it via `Run` outside a slideshow; a compile error surfaces here instead of at show start. (Static analysis — block balance, undefined procs — cannot find reserved-word compile errors; only compiling finds them, so bisect stubs against this oracle when needed.)

2. **Pre-show init for COM-driven shows.** Run one macro (e.g. `DBG_PING`) before `SlideShowSettings.Run()` or auto-macros will not fire (root cause D).

3. **Calling PowerPoint macros from PowerShell** — plain `$pp.Run("Macro")` fails COM overload binding, and unqualified names fail even on good files. Use:

   ```powershell
   $pp.GetType().InvokeMember("Run",
     [Reflection.BindingFlags]::InvokeMethod, $null, $pp,
     @("nano-super-coffee-quest.pptm!DBG_COMPILE"))
   ```

4. **Never call `Application.Run` during an active slideshow.** Re-entrant Run risks modal VBA dialogs on the user's screen (observed twice, §2.6). During a show, verify state by passively reading named-shape properties (`Visible`/`Left`/`TextFrame.TextRange.Text`) — this is exactly what `final_verify.ps1` asserts on.

5. **Never block inside an auto-macro.** `Run()`/`Next()` fire `OnSlideShowPageChange` inline on the COM caller's thread; any infinite loop in the handler kills the RPC channel. Tick from a `SetTimer` callback instead (engine v3).

6. **`Set` is mandatory for object writes into a Dictionary**: `Set sc(n) = shp`, never `sc(n) = shp` (silent runtime 438 otherwise).

7. **Machine baseline before blaming code (or the environment):** `AccessVBOM = 1`; deck folder a Trusted Location; `AutomationSecurity` msoLow; injection opens read-write + windowed; no zombie POWERPNT.EXE — `taskkill /IM POWERPNT.EXE /F` before every scripted run. Machine-wide E_FAIL even on a blank deck means zombies, not your code.

8. **Regression scripts.** `verify.ps1` (short smoke) and `final_verify.ps1` (full 5-stage drive) are kept as working regression tests; rerun after any engine change.

## 5. Machine state changes (all HKCU) — final dispositions

`…` abbreviates `SOFTWARE\Microsoft`.

| Change | Location | Why made | Effect on the bug | Final disposition |
|---|---|---|---|---|
| `AccessVBOM = 1` | `…\Office\16.0\PowerPoint\Security` | Required for VBA injection via COM | None — was already set | **KEPT** (required for the pipeline) |
| Trusted Location `Location900` = `C:\Users\aryan\pro\slides\nano-super-slides-v2\` | `…\Office\16.0\PowerPoint\Trusted Locations` | Suspected macro-blocking | None on the bug; deck now opens macro-enabled without prompts | **KEPT** (intentional) |
| `DisableHardwareAcceleration = 1` | `…\Office\16.0\Common\Graphics` | Suspected event/rendering issue | Did NOT help | **REVERTED** at cleanup; empty `Graphics` key removed |
| Resiliency keys under PowerPoint deleted | `…\Office\16.0\PowerPoint\Resiliency` | Suspected crash-recovery poisoning | No effect | None — deletion is harmless |

## 6. Final state — all former open items resolved

1. ~~Confirm reliable `OnSlideShowPageChange` firing~~ → **Resolved**: pre-show-Run hypothesis proven deterministic (0/3 vs 3/3); documented cause (lazy VBA project init, FAQ01152); kicker mitigation blocked on this build; pre-show `DBG_PING` adopted in `final_verify.ps1`; interactive .pptm+F5 unaffected.
2. ~~Full runtime verification of jump / heart-pop / finale / reset paths~~ → **PASSED** end-to-end (`final_verify.ps1`, §2.10): 583 ticks, zero errors, all mechanics live, exit reset of all 13 slides verified.
3. ~~Cleanup + registry revert~~ → **Done**: ~30 diagnostic artifacts deleted; `DisableHardwareAcceleration` reverted and empty `Graphics` key removed; `AccessVBOM` + Trusted Location kept intentionally (§5).

---

# DEVLOG — v3 "Coffee Quest Size Lab" (dino-look, black & white) · 2026-10-10 evening

## Deliverable

`nano-super-slides-v3\nano-super-coffee-quest-v3.pptm` — 5-slide size showcase.
User brief: make the v2 game look like the Chrome dino (black & white only, no
borders, no background — game just takes the slide bottom, modest footprint),
and show 4–5 slides at different heights/pixel sizes. User also asked for both
palettes (strict 1-bit AND ink+gray samples) and both ground concepts (thin
line vs nothing) — spread across the 5 slides. Shared spec written first as
`nano-super-slides-v3\CONTRACT.md`; three build sub-agents worked against it in
parallel (sprites / pptxgenjs builder / VBA engine refactor) to keep the main
session's context small.

## Slide matrix

MICRO 0.75pt/1px 1-bit no-line · SMALL 1.5pt/2px gray line · CLASSIC 2.25pt/3px
1-bit line · CHUNKY 3.0pt/4px gray no-line · JUMBO 3.75pt/5px 1-bit line+finale.
All bottom-anchored (feet/ground = 7.167 in on every slide); px/cell maps 1:1 to
screen pixels (0.75 pt = 1 px @96 dpi) so every set is crisp with zero
interpolation. Sky/sun/moon/sky-band/rules/timer-frame all deleted.

## Engine refactor (the risky part)

v3 engine (1141 lines, from a verbatim copy + 21 incremental edits) removes ALL
hardcoded slide geometry: at first Bind per slide it captures rects from shapes
(man_runA → man box/ground, skyline.Width/2 → scroll period, heartF1/F2 → HUD
anchor, machine/steam/banner rects) and caches per slide index so a re-bind
mid-animation can't poison the capture; every per-tick speed scales by
manH/45; timer recolor replaced by Visible-blink (20-tick slow / 6-tick fast,
auto-jump cue kept); slide count from Slides.Count, finale = last slide; v2
architecture kept verbatim (SetTimer, phase machine 0–7, DBG_PING/DBG_COMPILE,
TraceIt, full show-end reset). Verified: 749 ticks, e=[] zero errors.

## Visual gate lessons (presentations:visual-judge, 3 rounds: 0/5 → 4/5 → 5/5)

1. **Ink-on-ink**: a solid-ink skyline swallows the ink runner/hearts/signs/
   timer wherever they cross (v2 got away with it — light-blue city). Fix:
   skyline ONLY on gray slides (#9AA0AB city), bare dino sky on 1-bit slides.
   Also the skyline map's solid base row read as a forbidden "ground line" on
   no-line slides — moot once 1-bit slides dropped the skyline.
2. **Variant-scaled HUD explodes**: 53-cell score tag at 5px = a 2.8 in
   "banner"; 87-cell timer bar at 4px = 4.5 in bar colliding with props.
   Fix: score tag and timer bar are FIXED v2-size on all slides.
3. **Wide sprites drift at scale**: sign maps are up to 57 cells — v2's x
   anchors push them into the right-side HUD at 3–4px. Fix: signs left of
   x≈9.5 in; JUMBO banner parked scale-aware (−(w+0.5), not v2's −6).
4. Machine vs hearts overlap on the finale (both right-side): machine moved to
   x 10.4; engine derives all finale choreography from the authored rect.

## Machine quirk discovered (NOT our code)

Evening of 2026-10-10: `SlideShowSettings.Run()` = E_FAIL **machine-wide** —
v2's own final_verify fails, and a BLANK deck fails (locked-desktop probe
negative, no zombies, no Office dialogs, no transitions, no pending reboot, HW
accel toggle irrelevant). Differential: `CommandBars.ExecuteMso
("SlideShowFromBeginning")` starts shows fine → **start shows via ExecuteMso**.
Second quirk found via engine trace: `View.Next()` fired TWO page-change
events (1→2→3) in such a show — **drive with `View.GotoSlide(n)` only**
(GotoSlide/Previous each fired exactly one). final_verify.ps1 does both; see
also README "Known machine quirk".

## Verification

- Visual: render\slide-01..05.png, visual-judge 5/5 (B&W only, no
  backgrounds/borders, ground line only where specified, sizes read, furniture
  separated, nothing clipped).
- Runtime (`final_verify.ps1`, ribbon-started show, GotoSlide-driven):
  run-cycle toggling + cloud/skyline scroll on MICRO/SMALL, jump caught live
  (cactus on stage @1.5s), timer draining (0:59→0:58, barW 196→191), blink
  observed (0/-1/-1), backward heart-pop on slide 1 (F3 hidden, E3 shown at
  heart row), JUMBO finale (machine→done, man idle @690pt, banner up, steam
  alternating, hearts refilled), exit reset of all 5 slides to authored state,
  trace `loop=749 h=3 p=7 e=[]`.

## v3 folder contents

gen_sprites_bw.py (5 sets × 26 + 10 text bitmaps = 140 PNGs + manifest) ·
build_deck.js · game_engine.vba · inject_vba.ps1 (adds btnStart ink/borderless
+ Trusted Location901) · export_pngs.ps1 · final_verify.ps1 · CONTRACT.md ·
README.md · render\*.png · decks (.pptx intermediate + .pptm deliverable).

## v3 interlude — style-catalog picker deck (2026-10-11)

User pivoted mid-compact-build: wanted a dedicated art-style picker PPT first (runners incl.
non-stick styles, colored coffee machines, treasure chests), machine color now allowed.
Built per CATALOG-SPEC.md with the 2-agent pattern: gen_catalog.py (parametric skeleton
rasterizer → 30 runner frames in 10 distinct styles, 8 colored machines, 24 chest PNGs,
30 text bitmaps, manifest) + build_catalog.js (3 static slides, no VBA). One integration
bug: manifest keys carried ".png" while the builder's preflight didn't — patched lookups.
Visual gate 3/3 first pass. Compact game deck (CONTRACT-COMPACT.md, engine already
patched: prop-init existence guards + cfgScale cells check) resumes after the user picks
runner/machine/chest numbers; machine will be colored in the compact build per new rule.

## v3 compact deck — delivered (2026-10-11, after style picks)

User picked from style-catalog: STICK DASH runner (r02), TALL VENDING machine (m03,
colored), PIXEL CHUNKY chest (c02, colored) — saved to memory (coffee-quest-style-picks).
Compact deck `nano-super-coffee-quest-compact.pptm`: 6 slides, all smaller than old MICRO
(stick-dash runner 16/13/11/9/7 cells at a 1-px world), GROUND = the slide's bottom edge
(dashed ink line flush at the bottom on line-slides; bare edge on slides 2/4), machine
exempt from ink-only (24×45 cells after the 12×20 first render read as a dark speck),
chest = new engine collectible (drifts in, touching the man refills one heart, max 3,
respawns). One-argument sizing: `gen_sprites_compact.py --man N` + `build_compact.js N`.

Engine deltas (game_engine_compact.vba, 1197+ lines): prop-init existence guards,
cfgScale = man cells check, UpdateChest feature, and the big pacing lesson —
GAMEPLAY travel speeds (obstacle fly-past 10.5, sprint 5.75, run-in 3) must stay
UNSCALED: the 960pt slide distance is constant, so f-scaling them by manH/45 made the
tiny-man slides crawl (9s jump sweeps; timer/finale looked stalled mid-phase). Parallax
speeds stay f-scaled; jump height stays man-relative.

Verification: visual gate 6/6 (round 2 after machine enlargement+recolor); COM regression
green (ribbon start, GotoSlide drive): jump live @1.2s, timer draining+blinking, heart-pop,
chest spawn→travel→collect proven by dedicated sampler (spawn ~8s, collect at man ~12s),
finale completes (machine done, banner, steam, hearts refill), exit reset, 1152 ticks e=[].

## v4 — "The Unified Agent Registry" static research deck (2026-10-16)

Pivot from game decks to a RESEARCH deck presenting the unified-registry corpus
(agents-unified-registry/, 8 files, all verified 2026-10-16). Static .pptx only —
NO VBA, no engine, no macros — but visually continuing the v3 compact style
(CONTRACT-COMPACT + ADDENDUM are the contract): bitmap pixel-font kickers/titles,
Consolas-only native text, dashed ink ground line flush at the bottom edge on every
slide, bitmap "SLIDE n/13" counters, 1-bit ink/gray discipline with color allowed
ONLY on the closer's m03 vending machine + c02 chest.

Built in nano-super-slides-v4\ (13 slides): title w/ runner + 4-figure parade ·
fragmentation matrix (4 harnesses × 6 artifact types) · one slide per harness
(Claude Code v2.1.302 / Codex rust-v0.163.0 / OpenCode 2.0 ~214k stars / Pi 1.3.0
5,361 packages) with ID CARD + REGISTRY SURFACES kv rows + SURPRISE fact ·
standards layer (Agent Skills 46 clients vs Agent Plugins v1.0.0 TSC-anthropic-
absent-only-Codex; AGENTS.md+MCP under AAIF; Claude declined .agents/ #66352) ·
prior-art table (skills.sh 35.3k stars, ClawHub 31,371/2,371, claude-plugins.dev
11,989/63,065, pi.dev 5,361, OpenCode index.json, MCP Registry ~9,652) · security
(36.82% / 7.6% / 80% ASR / 157-of-98,380 + day-1 trust ladder) · design (thin
index + agentreg, PUBLISH→VERIFY→SCAN→SEAL→INDEX→INSTALL→LOCK flow band) · one
record four emissions + agentreg.lock differentiator · roadmap v0/v1/v2 ·
REGISTRY BREWING closer.

Pipeline = v3's exactly: (1) gen_sprites_v4.py (Pillow in the repo-root uv venv)
imports gen_catalog.py + gen_sprites_compact.py from v3 via importlib — reuses the
5×7 font renderer (adds a "%" glyph the way gen_catalog added É), the stick-figure
primitives, r02 runner, and the pooled m03/c02 colored art; outputs 40 text
bitmaps, 6 figures (4 harness stick variants: antenna/visor/satchel/package,
accessory gray, body ink), machine_done + chest at 8 px/cell → manifest_v4.json.
(2) build_v4.js (pptxgenjs from global npm via NODE_PATH) — tables are hand-drawn:
kv rows with dotted-leader dash rects, 1-cell ink rules, no pptx table chrome;
every shape objectName'd. (3) export_pngs_v4.ps1 (COM Export 1920×1080, no
LibreOffice) + verify_v4.ps1 (COM assert: 13 slides, shapes>0, images present).

Bugs caught by the visual/pixel gate: (a) title auto-fit computed from the
manifest KEY ("vt01" = 4 chars) instead of the bitmap's cell width → slide-1 title
placed at full 0.52in and ran to 12.95in; fixed to read m.w from the manifest.
(b) closer banner geometrically crossed the machine's upper body (y math slip) —
rebuilt placement right-aligned to the machine, lifted machine 2 cells off the
dash line; vision model kept claiming occlusion but pixel scans prove banner rows
824–854 vs machine 881–1078 are disjoint — trusted the pixels. Pixel-QA script
scans (title band ≤ voxel edge, right-edge ink = 0, pre-ground zone ink = 0,
counter clearance rows) pass 13/13; COM assert PASS. Notable deviation: figure
px/cell raised (figures 2, heroes 8) so placed sizes land near-native at 144-dpi
export instead of v3's 1-px world (static deck, no engine snapping).

Post-delivery visual gate (presentations:visual-judge, fresh set): 12/13 pass; one
defect — closer chest clipped by the bottom edge (bands cut at y1080, no closing
base; machine seated fine). Fix: lifted chest 2 cells (bottom = GROUND − 2C, body
ends row 1075, dash at 1079, same seating as machine); re-exported all PNGs.
Re-gate: 13/13 PASS. (Banner/machine ~25–27px gap confirmed non-issue twice.)

## v4 game engine take 3 — REGISTRY BREWING (2026-10-16 late) — READY, blocked by Office licensing

Third agent attempt on the slide-13 mini-game. All three deliverable scripts are now
complete, audited against the v3 compact baselines, and syntax-clean; the injection run
got further than ever before (slide-13 bound at 36 shapes, contract 15/15, GameEngine
module injected at 826 lines) — then hit a wall that is environmental, not code:

**PowerPoint is running as an Unlicensed Product (reduced-functionality mode).**
Window title captured verbatim: `nano-super-agent-registry.pptx - PowerPoint (Unlicensed
Product)`; app caption via COM: `PowerPoint (Unlicensed Product)` (16.0.20430). One
targeted diagnostic session (zz_diag5.ps1, kept as the reproducer) captured each edit
class verbatim:

- write existing shape property -> `COMException :: Exception from HRESULT: 0x80048240`
- `Shapes.AddShape` -> `UnauthorizedAccessException :: Access denied. You do not have
  enough privileges to complete this operation.` (HR=0x80070005)
- `VBProject.VBComponents.Add` + `AddFromString` -> **still works** (writes to the VBA
  object model succeed; slide edits do not)
- `Presentation.SaveAs` -> `COMException :: Presentation.SaveAs : An error occurred
  while PowerPoint was saving the file.` (HR=0x80004005)
- reads (Open, Shapes.Item, TextRange) all still work — which is exactly why the
  coordinator's "opens cleanly via COM" health check passed while every EDIT is denied.

This also retroactively explains take-2's "blanket edit denial"/"master view" symptoms.
osppsvc is not installed (M365 subscription licensing, ClickToRunSvc running); repair is
a user action (sign back in to M365 / reactivate Office), not an agent action. No .pptm
was produced; the authored .pptx is untouched (the inject opens it read-write but
SaveAs is the only write, and it failed). Per the fail-fast budget (inject attempt 1 +
one diagnostic, no retries beyond) COM work was stopped.

### Engine as shipped-ready (game_engine_v4.vba, 826 lines)

v3 compact architecture verbatim: user32 `SetTimer` 25 ms -> `OnGameTimer` ticking a
bounded phase machine (0 play / 1 brew / 2 won-idle); auto-macros return immediately;
`OnSlideShowPageChange` activates only on the LAST slide (`Slides.Count`, never
hardwired 13) so slides 1-12 are never bound; `View.Slide.SlideIndex` polling
(CurrentSlideIndex is unreadable under COM); module-level state with `Set` Dictionary
writes; ring-buffer trail telemetry into cfgTime (latched `alloc` budget BEFORE any
TraceIt write); DBG_PING / DBG_COMPILE / StartGame probes; no identifier named Mark.

Game: runner (authored x, 3 lanes at pitch 1.35 x runner height) intercepts art1..4
(C/K/O/P skill-cubes) drifting in one-at-a-time from the right at 96 pt/s (v3
drifting-chest mechanic). Input = btnUp/btnDown run-macro chips (inject-placed;
arrow keys are slideshow-owned and ActiveX is blocked on this build — LEARNINGS #9) and
`runner.Top` doubles as the COM-driven input register. Touch (8 pt slack) collects:
cube parks miniaturised in the HUD inventory row right of timeChip. All 4 -> BREW
(machine pulse, HUD cubes flash, brewR/G/A overlay chips chase then light solid,
machineCup drops to the dispense slot, banner "ONE REGISTRY - EVERY AGENT" right-aligns
over the machine) -> WON idle. Miss (exits left) = -1 heart, respawn in 2.5-4.5 s;
0 hearts or cfgTime (90 s authored, read at init) elapsed -> soft reset (fresh board,
full hearts — never a dead end). Leave-slide / terminate restores the authored closer
exactly (including timeText emptied, cubes visible at authored strip x).

### Fixes applied to the partial files this take

- inject_vba_v4.ps1: the bare `finally { $pp.Quit() }` masked the real exception and,
  on Quit failure (0x80048240), skipped the trailing taskkill -> zombie POWERPNT that
  poisons later sessions. Now: inner catch prints the failure verbatim + HR, swallows
  (flag), Quit is best-effort, taskkill ALWAYS runs, exit 1 on failure.
- final_verify_v4.ps1: pre-existing parser bug `("miss $k: ...")` — `$k:` parsed as a
  scope-qualified variable; whole file would not parse. Fixed to `${k}:`. Same
  best-effort Quit hardening.
- inject's button placement (btnUp/btnDown at 320.4/370.8 pt, y 126.36) clears the HUD
  inventory row (ends ~283 pt) and the s13_spec subtitle (ends ~117 pt); brew overlays
  are placed from the machine shape's own rect via gen_sprites_v4.py cell ratios.

### Resume path (after Office is reactivated — no code changes needed)

```
cd C:\Users\aryan\pro\slides\nano-super-slides-v4
powershell -NoProfile -ExecutionPolicy Bypass -File zz_diag5.ps1   # expect all "ok"
powershell -NoProfile -ExecutionPolicy Bypass -File inject_vba_v4.ps1
powershell -NoProfile -ExecutionPolicy Bypass -File final_verify_v4.ps1   # 4-stage COM drive
powershell -NoProfile -ExecutionPolicy Bypass -File export_pngs_v4.ps1    # re-render closer
```

final_verify_v4.ps1 drives: static structure (13 slides, +7 IO shapes on 13 only,
macro actions, hidden banner/cup/chips) -> DBG_PING/DBG_COMPILE probes -> show 1 win
path (entry reset, spawn/drift deltas, 4x lane-intercept collects, brew+WIN asserts,
exit restore) -> show 2 three misses -> 0-heart soft reset -> show 3 cfgTime=8
timeout wrap -> slides 1-12 unchanged + `e=[]` clean-engine check.

## v5 — "Building Our Own Registry" per-harness integration guide (2026-10-19)

User feedback on v4: the survey deck's per-harness slides were inconsistent (Claude's
hero = "30+ hook events", Codex's = "~130K GitHub stars" — different KINDS of element)
and hard to read. v5 refocus: HOW we build our own registry — the common elements,
per harness, with a fixed topic contract.

### Deck contract (the fix for the consistency error)

- 25 slides: dark cover · how-to-read · data model · 4 harness chapters × 5 topic
  slides (claude 4-8 amber, codex 9-13 green, opencode 14-18 blue, pi 19-23 purple)
  · translation matrix (derived) · dark closer. No game (Office still unlicensed;
  user rule: game ⇒ .pptm, else .pptx — this deck is .pptx).
- Topic grouping fixed across chapters: Skills+Commands · Subagents+Hooks · Plugins
  (standalone) · MCP+LSP+CustomTools · Statusline+ExecPolicy.
- Every topic card = same six facts (WHAT / WHERE / FORMAT / MANAGE / AUTO-UPDATE /
  VERDICT chip + why) + REGISTRY EMISSION panel (accent-tinted, mono install fields).
- Verdict chips semantic deck-wide: COPY-AS-IS green · TRANSLATE blue · OVERLAY amber
  · NO SURFACE gray. AUTO-UPDATE answered on EVERY card (user ask): only bundles
  self-update (claude marketplaces, codex marketplace upgrade, opencode plugin
  update, pi update); skills/MCP/agents/hooks are file-drops → agentreg.lock wedge.
- Slide 24 matrix built FROM the content JSONs at build time — cannot drift.
- Readability overhaul: pixel font HEADINGS ONLY (kickers/titles/cover); body = native
  Segoe UI; Consolas only for real code. Chapter kickers accent-colored.

### Pipeline (copy-adapt of v4)

- `gen_sprites_v5.py` — 36 heading bitmaps (22 accent kickers) + runner/cubes/
  machine/cup; manifest_v5.json; verify() incl. pure-accent kicker gate. ALL PASS.
- `content/content-{claude,codex,opencode,pi}.json` — extracted by 4 parallel
  scope-fenced subagents from the corpus (one file each, contract-validated).
- `build_v5.js` — pptxgenjs; loadHarness() schema gate (exact keys/topics/verdicts,
  char-budget warns) THEN one topicCard()/topicSlide() factory for all 20 chapter
  slides; shape counts came out identical per chapter (56/56/32/80/56) — machine-
  verified structural symmetry.
- `export_pngs_v5.ps1` / `verify_v5.ps1` (25-slide assert) / `qa_scan_v5.py`
  (accent-kicker gate for 4-23, dark={1,25}). ALL PASS.

### Gates and repairs

1. First render: qa 24/25 — cover voxel was top-left, gate expects top-right
   (closer diagonal); aligned cover to closer. ALL PASS after rebuild.
2. visual-judge pass 1: 5/25 — systematic: italic why-line collided with the verdict
   chip on all 20 chapter slides (chip at y+0.17 h≈0.37, why at y+0.50). Also caught
   by accident: WHERE row was rendering cd.format (copy bug in the rows table).
   Fix: chip up to header row (y+0.14), why at y+0.58, rhythm +0.04 down; WHERE→cd.where.
3. visual-judge pass 2 (chapter slides): 20/20 pass — no collisions, no overflow,
   WHERE≠FORMAT everywhere, cross-harness structure identical, readable. Total 25/25.

### Delivered

`nano-super-slides-v5/nano-super-registry-guide.pptx` (25 slides) +
render/ PNGs (1920×1080) + content JSONs. v4 untouched.

## v5.1 — matrix moved to slide 4 + SPECIFICATIONS section (2026-10-20)

User manually reordered the shipped pptx (matrix 24 → 4; saved 13:27) and renamed
docs/slide-24.md → docs/slide-4.md. Folded that order into the source pipeline and
extended: deck 25 → 33 slides.

- New order: 1 cover · 2 how-to-read · 3 data model · 4 translation matrix ·
  5-12 SPECIFICATIONS (explainer + detail per spec) · 13-17 claude · 18-22 codex ·
  23-27 opencode · 28-32 pi · 33 closer.
- Specs section, one pair per spec: explainer slide (WHAT THIS SPEC IS kv rows ·
  WHY THE REGISTRY CARES · ON THE NEXT SLIDE · spec-series rail chip highlight) +
  detail slide (THE FIELDS mono kv · HARD RULES · HOW THE FOUR IMPLEMENT IT ·
  dark REGISTRY STANCE · GAPS strip). Specs: Agent Skills (agentskills.io) ·
  Agent Plugins v1.0.0 · MCP + Registry server.json · Subagents (no spec — the
  de-facto formats, Claude md canonical).
- content/specs.json extracted by a 5th scope-fenced agent from
  cross-spec-standards.md (+design §3); loadSpecs() validates shape/order/budgets
  same as the harness files.
- Renumber mechanics: chapter kickers regenerate as k13..k32; matrix uses k04/t04;
  spec kickers spk1-4 + titles sp_s*/sp_d*; qa CHAPTER=13-32, dark={1,33};
  verify_v5 asserts 33; TOTAL=33.

### Gotchas hit this round

- EBUSY writing the pptx: user's PowerPoint still had the deck open. Kill
  POWERPNT BEFORE node build, not just before COM. Note: in Git Bash,
  `taskkill /IM` gets path-mangled ("C:/Program Files/Git/IM") — use
  `powershell -NoProfile -Command "Stop-Process -Name POWERPNT -Force"` instead.
- Asset-key collision: closer referenced kicker asset k25, which renumbering
  turned into OPENCODE's chapter 3-of-5 kicker → closer showed a chapter kicker.
  Fix: non-numeric keys for position-independent slides (kz/tz). Lesson: numeric
  asset names must be reserved for position-bound assets only.
- visual-judge full pass: 32/33 → closer kicker fixed → re-judge 33/33.
  qa_scan ALL PASS; verify_v5 ASSERT PASS (33 slides).

### Delivered (v5.1)

`nano-super-slides-v5/nano-super-registry-guide.pptx` (33 slides) + render/ +
content/{4 harness,specs}.json + docs/slide-4.md (title updated to Slide 4).


