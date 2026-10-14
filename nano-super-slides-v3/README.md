# nano-super-slides v3 — Coffee Quest "Size Lab" (dino-look, B&W)

`nano-super-coffee-quest-v3.pptm` — 5-slide showcase of the Coffee Quest runner
game in Chrome-dino style: strictly black-and-white, no backgrounds and no
borders — the game sits directly on the slide background along the bottom.
Each slide renders the SAME game at a different pixel size / strip height, so
you can pick the size you like before it gets applied to a full deck.

| # | Variant | cell | runner | palette | ground line |
|---|---------|------|--------|---------|-------------|
| 1 | MICRO   | 0.75 pt (1 px/cell) | 0.21 in | 1-bit ink | none |
| 2 | SMALL   | 1.50 pt (2 px/cell) | 0.42 in | ink + 2 grays | thin |
| 3 | CLASSIC | 2.25 pt (3 px/cell) | 0.63 in | 1-bit ink | thin |
| 4 | CHUNKY  | 3.00 pt (4 px/cell) | 0.83 in | ink + 2 grays | none |
| 5 | JUMBO   | 3.75 pt (5 px/cell) | 1.04 in | 1-bit ink | thin + finale |

Gameplay is unchanged from v2: F5, click **START** on slide 1; forward slide
change = the runner jumps an obstacle; going back = lose a heart; timer blinks
in the last minute (colors are gone); slide 5 = sprint to the machine, brew,
"COFFEE ACQUIRED", hearts refill; show end resets every slide.

## Design notes (why the deck looks the way it does)

- **Skyline only on gray slides (2, 4).** A solid-ink city silhouette swallows
  the ink runner/hearts/HUD wherever they cross it — ink-on-ink. The light
  gray city keeps contrast; the 1-bit slides get the authentic bare dino sky.
- **Timer bar is fixed 2.72 in wide** (v2 size) and the "SLIDE N/5" tag is
  fixed small — scaling them by the variant made them collide with props and
  turn into giant banners at 4–5 px.
- **Signs live left of x≈9.5 in** — sign maps are up to 57 cells wide and at
  larger cells they invade the timer/hearts zone.

## Rebuild

Order matters; run from this folder:

```bash
..\.venv\Scripts\python gen_sprites_bw.py          # 140 PNGs -> assets\
$env:NODE_PATH=(npm root -g); node build_deck.js   # -> .pptx (needs assets!)
powershell -NoProfile -ExecutionPolicy Bypass -File inject_vba.ps1    # -> .pptm (+btnStart, +Trusted Location901)
powershell -NoProfile -ExecutionPolicy Bypass -File export_pngs.ps1   # render\slide-0N.png
powershell -NoProfile -ExecutionPolicy Bypass -File final_verify.ps1  # COM show-driven regression
```

Machine prerequisites (already in place): `AccessVBOM=1`, v2/v3 folders are
Trusted Locations (Location900/901), PowerPoint via COM (no LibreOffice).

**Known machine quirk (2026-10-10):** `SlideShowSettings.Run()` fails with
E_FAIL machine-wide on this box (blank decks too). Start shows via
`CommandBars.ExecuteMso("SlideShowFromBeginning")` instead, and drive
navigation with `View.GotoSlide(n)` — `View.Next()` double-advances.
`final_verify.ps1` does both.

Shared spec: `CONTRACT.md`. Build history: `..\DEVLOG.md` (v3 section).
