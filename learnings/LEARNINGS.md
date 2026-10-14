# LEARNINGS — building & debugging a macro-enabled PowerPoint deck on this machine

**Scope:** distilled, reusable knowledge from the nano-super-slides-v2 build (2026-10-10).
**Audience:** a future agent or person rebuilding or debugging a macro-enabled (.pptm) deck here.
**Machine:** Windows, M365 Desktop PowerPoint 16.0.20430, Git Bash + PowerShell, no LibreOffice (user preference).
**Companion docs:** `../DEVLOG.md` (full narrative + timeline), `nano-super-slides-v2\README.md` (usage), `PIXEL-SPRITE-PIPELINE.md` (sprite generator reference), `GAME-DESIGN-SPEC.md` (strip geometry, speeds, timer budgets, engine phases), `SUBAGENT-PLAYBOOK.md` (orchestration that cracked the debugging).

---

## 1. The pipeline (rebuild recipe)

Four steps, order matters. All from `C:\Users\aryan\pro\slides\nano-super-slides-v2\`:

```powershell
# 0) kill zombie PowerPoint first — see §4
taskkill /IM POWERPNT.EXE /F        # (Git Bash: taskkill //IM POWERPNT.EXE //F)

# 1) sprites + pixel-text PNGs (Pillow, workspace-root venv)
..\.venv\Scripts\python gen_sprites.py

# 2) deck layout (pptxgenjs, global npm)
$env:NODE_PATH = (npm root -g); node build_deck.js

# 3) inject the VBA engine, SaveAs .pptm (PowerPoint COM)
powershell -NoProfile -ExecutionPolicy Bypass -File inject_vba.ps1

# 4) render slide PNGs for visual QA (COM — never LibreOffice on this machine)
powershell -NoProfile -ExecutionPolicy Bypass -File export_pngs.ps1
```

Key contracts:

- **objectName is the JS↔VBA contract.** `build_deck.js` names every shape via pptxgenjs `objectName` (`man_runA`, `heartF3`, `timerbar`, `cfgTime`, …); the VBA engine addresses shapes only by those names via a name→Shape dictionary. Add a shape = add a name.
- **Hidden config shape.** Per-slide runtime config (time budget, seconds) lives in a hidden off-canvas text shape (`cfgTime`); the engine reads it at slide entry. It doubles as the telemetry channel — the engine writes marker text into it (`M|…`, `PC`, `TM`, `T loop=… e=[]`), so a passive read of one shape shows engine state.
- **Injection requires read-write + WithWindow**: `Open(path, $false, $false, $true)` — read-only/windowless opens produced modules that never run.
- **Engine architecture that works (v3):** `SetTimer` (user32, 25 ms) + `AddressOf OnGameTimer` callback ticking a bounded phase state machine (0 idle, 1 run-in, 2 jump, 3 heartpop, 4 sprint, 5 brew, 6 refill, 7 steam-idle). Auto-macros return immediately. `game_engine.vba` is the reference implementation.
- Full geometry/speed/budget tables and the phase-by-phase contract: `GAME-DESIGN-SPEC.md`. Sprite grid renderer, palette, cell math, manifest + bitmap-font details: `PIXEL-SPRITE-PIPELINE.md`.

## 2. The VBA minefield (ranked by lethality/deception)

| # | Gotcha | Symptom | One-line fix |
|---|---|---|---|
| 1 | `Mark` is effectively a **reserved identifier** — `Sub Mark(...)`/`Sub MARK()` anywhere breaks whole-module compilation | Auto-macros silently dead; show-start compile dialog; COM `Run()` E_FAIL that looks machine-wide | Rename to `TraceIt`/`DBG_PING`; never name a proc `Mark` |
| 2 | **VBA compiles lazily, per call chain** — a passing `Application.Run` of one macro proves nothing about the rest | Single-macro probes pass while the auto-macro chain is uncompilable | Ship `DBG_COMPILE` (`If False Then <call every proc>`) and gate on it (§3.1) |
| 3 | **VBA project lazy-init**: in COM sessions `OnSlideShowPageChange` never fires unless any macro was Run pre-show (deterministic 0/3 vs 3/3; PPT FAQ FAQ01152) | Engine dead in COM tests but fine when a human presses F5 on the open .pptm | Call `DBG_PING` via `Run` before `SlideShowSettings.Run()`; only `.ppsm` double-click is broken |
| 4 | **Blocking loop inside an auto-macro deadlocks COM**: `OnSlideShowPageChange` fires synchronously inside `Run()`/`View.Next()`; an infinite `DoEvents` loop never returns → RPC channel dies | "RPC server unavailable (0x800706BA/BE)" at `Run()` — looks like a PowerPoint crash, isn't | Never loop in event handlers; `SetTimer` + `AddressOf` callback, handlers return immediately |
| 5 | `View.CurrentSlideIndex` returns **null/empty under COM-automated shows** on this machine | Engine bails at its slide poll before the first tick (`loop=0` marker) | Use `SlideShowWindows(1).View.Slide.SlideIndex` |
| 6 | `Application.Run` **during a live slideshow** → modal VBA dialogs on the user's screen (risk of wedging the show) | Dialogs pop mid-show | Never Run mid-show; read shape properties passively (§3.3) |
| 7 | PowerShell `$pp.Run("Macro")` fails COM **overload binding**; unqualified macro names fail even on good files | COM call errors | `InvokeMember` form (§3.2), always qualify `"file.pptm!Macro"` |
| 8 | `Dictionary(k) = shapeObject` without `Set` | Silent runtime 438 | `Set dict(k) = shp` |
| 9 | This Office build **blocks programmatic `Shapes.AddOLEControl`** (`DISP_E_UNKNOWNNAME`, direct or via reflection) — the FAQ01152 "ActiveX kicker" mitigation is impossible here | Kicker injection warns/fails | Accept it: pre-show `DBG_PING` in scripts; document the .ppsm caveat |
| 10 | **Zombie POWERPNT.EXE** (from cancelled scripted runs) make all slideshows E_FAIL machine-wide, even blank decks | `Run()` E_FAIL on decks that should work | `taskkill /IM POWERPNT.EXE /F` before every scripted PowerPoint session |

## 3. Verification patterns that work

### 3.1 Compile gate — `DBG_COMPILE`

```vba
Public Sub DBG_COMPILE()
    If False Then
        Engine            ' one dead call for EVERY procedure in the module
        HandleEnter 1, 0
        DoJump 1, True
        Finale
    End If
    TraceIt "C"
End Sub
```

Run it via COM **outside** a slideshow; compile errors surface here instead of killing the show. Static analysis (block balance, undefined procs) **cannot** find reserved-word compile errors — only a compile can. If the gate fails with no obvious cause, **stub-bisect**: split the module into variants (declarations-only / suspect proc alone / full-minus-suspect) and compile each — this isolated `Mark` in minutes after static analysis found nothing.

### 3.2 Call macros from PowerShell (correct form)

```powershell
$null = $pp.GetType().InvokeMember("Run",
  [Reflection.BindingFlags]::InvokeMethod, $null, $pp,
  @("nano-super-coffee-quest.pptm!DBG_PING"))
```

Always `file.pptm!Macro` — never bare names.

### 3.3 Passive shape reads during shows; pre-show init before them

Verification sequence that works (this is `final_verify.ps1`'s shape):

```powershell
taskkill /IM POWERPNT.EXE /F
$pp = New-Object -ComObject PowerPoint.Application
$pres = $pp.Presentations.Open($pptm, $true, $false, $true)   # ReadOnly OK for verify; WithWindow required
# 1) init the VBA project BEFORE the show (minefield #3)
RunMacro "nano-super-coffee-quest.pptm!DBG_PING"
$show = $pres.SlideShowSettings.Run()                          # returns instantly (engine v3)
Start-Sleep -Milliseconds 2800
# 2) assert by READING shapes — never Application.Run mid-show
$s1.Shapes.Item("skyline").Left
$s1.Shapes.Item("man_runB").Visible
$show.View.Next(); Start-Sleep 3800;  # assert slide-2 state
$show.View.GotoSlide(13); Start-Sleep 9000;  # assert finale state
$show.View.Exit(); Start-Sleep 2500;  # assert all slides reset to authored state
```

Assertions that proved decisive: `Visible` flags of full/empty heart slots, `Left` of skyline/man/machine shapes, `Width` of the timer bar, `TextFrame.TextRange.Text` of timer and cfg shapes, and the terminate marker (`T loop=<n> h=<hearts> p=<phase> e=[<errors>]` — nonzero loop count = engine actually ticked; empty `e=[]` = zero runtime errors).

### 3.4 Regression scripts

`verify.ps1` (short smoke) and `final_verify.ps1` (full 5-stage drive: entry, forward, backward, finale, exit-reset) are kept as working regression tests. Rerun after any engine or deck change. Treat a full pass as: expected `Visible`/`Left`/`Width`/text at every stage + `e=[]` + reset-to-authored after exit.

### 3.5 Visual QA

Render PNGs via COM (`export_pngs.ps1` — no LibreOffice on this machine) and judge with the presentations visual-judge subagent; it caught real layout defects the build script couldn't know about (offslide-parked art bleeding into frame, collisions). 10/13 → 13/13 after fixes.

## 4. Environment & machine state

Registry (HKCU, under `SOFTWARE\Microsoft\Office\16.0\PowerPoint`):

| Value | State | Note |
|---|---|---|
| `Security\AccessVBOM = 1` | **kept intentionally** | Required for VBA injection via COM |
| `Trusted Locations\Location900` = v2 deck folder | **kept intentionally** | Deck opens macro-enabled without prompts |
| `Common\Graphics\DisableHardwareAcceleration` | **reverted** (empty key removed) | Set during debugging; didn't help; reverted at cleanup |

Hygiene rules:

- `taskkill /IM POWERPNT.EXE /F` before every scripted PowerPoint run — zombie instances cause machine-wide slideshow E_FAIL (Git Bash needs `//IM … //F`).
- Disclose every registry edit when you make it; revert the ones that didn't help; say what was kept and why.
- After kills, stray `~$deck.pptm` owner-lock files may linger in the folder; delete them if PowerPoint claims the file is in use.
- `AutomationSecurity` is msoLow here; Office binaries dated 2026-09-30 (no mid-session updates observed).

## 5. Working with subagents — what parallelization actually helped

(Full playbook — role split, prompt skeleton, judge contract, artifact paths: `SUBAGENT-PLAYBOOK.md`.)

- **A local test-matrix subagent** ran the deterministic experiment serial debugging had only speculated about (pre-show Run: 0/3 vs 3/3 auto-macro firing; ReadOnly/WithWindow shown irrelevant). Ten environmental hypotheses died in minutes instead of hours.
- **A parallel web-research subagent** matched the empirical result to published documentation (PPT FAQ FAQ01152 — lazy VBA project init), converting "probable hypothesis" into "known documented behavior with a known (blocked) mitigation."
- **The presentations visual-judge subagent** did real QA on rendered PNGs (13/13 after fixes).
- Division of labor that worked: local deterministic experiments + web research + documentation, run in parallel while the main thread synthesized. Serial debugging had stalled on environment hypotheses for a long stretch before this.
- **The user's visible VBA error dialogs were decisive evidence** — they proved macros were executing and pointed at real code paths. Surface errors during diagnosis instead of suppressing everything; switch on `On Error Resume Next` only for shipped runtime code.
- Never let an agent call `Application.Run` into a live slideshow — modal dialogs appear on the user's actual screen (§2, minefield #6).

## 6. File map

| Path | Role |
|---|---|
| `C:\Users\aryan\pro\slides\DEVLOG.md` | Full build + debug narrative, timeline, root-cause table, final state |
| `C:\Users\aryan\pro\slides\learnings\LEARNINGS.md` | This document |
| `C:\Users\aryan\pro\slides\learnings\PIXEL-SPRITE-PIPELINE.md` | Sprite generator reference: grid renderer, palette, cell math, manifest.json, v1 font reuse, contact-sheet QA |
| `C:\Users\aryan\pro\slides\learnings\GAME-DESIGN-SPEC.md` | Game design contract: strip geometry (in + pt), speeds, timer budgets, phase machine, shape inventory |
| `C:\Users\aryan\pro\slides\learnings\SUBAGENT-PLAYBOOK.md` | Subagent orchestration: role split, prompt anatomy, test-matrix design, visual-judge contract |
| `nano-super-slides-v2\nano-super-coffee-quest.pptm` | Deliverable (13 slides, game strip, engine v3) |
| `nano-super-slides-v2\nano-super-coffee-quest.pptx` | Intermediate pptxgenjs output (pre-injection) |
| `nano-super-slides-v2\game_engine.vba` | VBA engine source (899 lines) — reference implementation of the SetTimer architecture, `DBG_COMPILE`, `TraceIt` telemetry |
| `nano-super-slides-v2\build_deck.js` | pptxgenjs deck builder — owns the `objectName` contract |
| `nano-super-slides-v2\gen_sprites.py` | Pillow sprite generator (53 sprites; reuses v1 5x7 bitmap font) |
| `nano-super-slides-v2\assets\` | Generated sprite PNGs + manifest |
| `nano-super-slides-v2\inject_vba.ps1` | pptx → pptm converter (COM; read-write + WithWindow; warned kicker attempt retained) |
| `nano-super-slides-v2\export_pngs.ps1` | Slide → PNG renderer (COM) for visual QA |
| `nano-super-slides-v2\verify.ps1` | Short COM regression smoke test |
| `nano-super-slides-v2\final_verify.ps1` | Full end-to-end regression (5-stage drive + exit-reset) |
| `nano-super-slides-v2\README.md` | Presenting + rebuild instructions |
| `nano-super-slides-v1\` | v1 sources, untouched |
| `~/.zcode/cli/memories/projects/slides-0ee2506d032ce3fb/memory/vba-injection-gotchas.md` | Memory: the ten gotchas in condensed form |

## Addendum (post-delivery): interactive start + two more bugs

**User-confirmed: even interactive F5 lazy-loads VBA on this Office build** — double-click + presentation mode left the game dead. Solution shipped in the deck (two manual starts, no admin needed):
1. **Run-macro action button** on the cover ("CLICK TO START COFFEE QUEST", shape `btnStart`): `shape.ActionSettings(1).Action = ppActionRunMacro; .Run = "StartGame"` (renders as `ppaction://macro?name=StartGame` in the slide XML). Clicking it during the show runs `StartGame`, which arms + starts the engine mid-show.
2. **Alt+F8 → StartGame → Run** before F5 (writes an `ARMED` marker into cfgTime). Opening the VBE once also loads the project for the session.
(Programmatic `Shapes.AddOLEControl` — the classic off-slide ActiveX kicker — is blocked on this build, DISP_E_UNKNOWNNAME.)

**Bug: module state must be explicitly initialized.** The SetTimer rewrite dropped the old loop's `hearts = 3` startup line, so `hearts` defaulted to 0 — every slide rendered 0 hearts and the finale's refill masked it during the first "passing" verification. Fix: initialize on the new-show gate (`lastIdx = 0` at the first OnSlideShowPageChange / in StartGame), never on back-navigation (mid-show heart losses must persist). Terminate resets `lastIdx = 0` for the next show.

**Debug technique: ring-buffer trail.** Single-slot markers overwrite each other and hide event sequences; a 180-char `trail = Right(trail & " " & ev, 180)` written to cfgTime revealed the full `PC i1 d0 h3 TM PC i2 d1 h3 PC i1 d-1 h3 POP(h3) PC i13 d1 h2 T` sequence in one read and made the h=0-at-start bug obvious.
