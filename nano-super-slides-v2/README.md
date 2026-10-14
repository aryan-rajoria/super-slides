# nano-super — Coffee Quest edition (v2)

The v1 technical deep-dive (12 slides) with a persistent pixel-game strip
across the bottom of every slide: a chrome-dino homage where the runner is
**hunting for coffee**, played in the background of your presentation.

**Deliverable: `nano-super-coffee-quest.pptm`** (macro-enabled PowerPoint).

## The game

| Event | What happens |
|---|---|
| Slide shows | The man jogs at a constant, slow pace — he never speeds up. Scenery, signs (`COFFEE →`, `NO COFFEE`, `CLOSED`), clouds and skyline scroll past. |
| Time allocated to the slide runs low | The timer bar (bottom-right) drains over the slide's budget (3–5 min). At 1:00 left it turns amber; at **0:12 left it turns red and the man jumps the obstacle** — your cue to wrap up. |
| Going **forward** a slide | The man **jumps an obstacle** (cactus or rock) as you advance. |
| Going **backward** a slide | You **lose a heart** (3 total; the heart pops to empty). At zero hearts they just shake. |
| Last slide (Thank You) | The man **sprints to the coffee machine**, it brews (light + steam), he gets his cup (`COFFEE ACQUIRED`), and lost hearts refill. |
| Show ends | Everything resets automatically — hearts, positions, timer — and the file is left unmodified. |

Hearts persist for the whole show (they reset at the start of each show).

## Presenting it

1. Open `nano-super-coffee-quest.pptm` in PowerPoint.
2. If you see a security bar, click **Enable Content** (the deck's folder is
   already registered as a PowerPoint Trusted Location, so this usually
   doesn't appear).
3. Press **F5**, then **click the "CLICK TO START COFFEE QUEST" button** on
   the cover's game strip. The runner runs in, and the engine handles every
   slide from there.

Why the button: this Office build lazy-loads VBA projects — the game's
auto-macros don't fire until the first macro runs. Clicking the button runs
`StartGame`, which arms and starts the engine mid-show. Two alternatives:

- **Before presenting**: press **Alt+F8**, choose `StartGame`, Run — you'll
  see the strip "ARMED" marker; then F5 works with no click needed.
- **From the VBA editor**: open it once (Alt+F11) — that also loads the
   project for the session.

Present normally with arrow keys / clicker. Going back costs a heart —
that's the game.

Per-slide time budgets live in a tiny hidden text shape named `cfgTime`
(off-canvas at the top-left). Edit its text (seconds) in PowerPoint and the
timer + auto-jump adapt. Defaults: cover 60s, content slides 180–300s,
thank-you unlimited.

> Tip: the runner only reacts during the **slideshow**. In edit view the strip
> is static art.

## Rebuilding from source

Run from inside this folder:

```powershell
# 1) sprites + pixel-text PNGs (Pillow, workspace-root venv)
..\.venv\Scripts\python gen_sprites.py

# 2) deck layout (pptxgenjs, global npm)
$env:NODE_PATH = (npm root -g); node build_deck.js

# 3) inject the VBA engine and save the .pptm (PowerPoint COM)
powershell -NoProfile -ExecutionPolicy Bypass -File inject_vba.ps1

# 4) render slide PNGs for a visual check
powershell -NoProfile -ExecutionPolicy Bypass -File export_pngs.ps1
```

`game_engine.vba` is the whole runtime: the master loop (`Engine`/`Tick`),
entry animations (`DoJump`, `HeartPop`, `RunIn`, `Finale`) and the
auto-reset (`OnSlideShowTerminate`). All sprite shapes are addressed by
PowerPoint shape names (`man_runA`, `heartF1`, `timerbar`, `cfgTime`, ...),
which `build_deck.js` sets via `objectName`.

### Machine notes

- Injection requires PowerPoint's "Trust access to the VBA project object
  model" (already set: `HKCU\...\16.0\PowerPoint\Security\AccessVBOM = 1`).
- The folder is a Trusted Location (`...\Trusted Locations\Location900`),
  so the deck opens with macros enabled without prompts.

## Files

- `nano-super-coffee-quest.pptm` — the deck (v1 content + game strip + engine)
- `game_engine.vba` — VBA engine source (injected as module `GameEngine`)
- `build_deck.js` / `gen_sprites.py` / `assets/` — build pipeline
- `inject_vba.ps1` — pptx → pptm converter (COM)
- `export_pngs.ps1` — slide renderer (COM)
- v1 sources remain untouched in `..\nano-super-slides-v1\`
