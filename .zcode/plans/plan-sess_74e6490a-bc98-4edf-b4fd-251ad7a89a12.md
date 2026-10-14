# Style Catalog deck — pick the art for the compact game

**Deliverable:** `nano-super-slides-v3\style-catalog.pptx` — a static, no-VBA, 3-slide picker deck rendered at 1920×1080 for review (`render_catalog\slide-01..03.png`). Built in the v3 folder per your instruction; the original v3 deck and the in-progress compact game deck stay untouched.

## Slide 1 — RUNNER STYLES (~10 options, ink 1-bit like the game)
Each option: idle + runA + runB frames enlarged (~0.5 in figures), bitmap label + one-line descriptor.
1. STICK CLASSIC (circle head, pumping arms) · 2. STICK DASH (lean + speed lines) · 3. STICK CUP JOGGER (coffee in hand) · 4. STICK LEAN (scarf trail) · 5. BLOCKY (right-angle pixel robot) · 6. BLOB MINI (solid dino-style silhouette) · 7. HOLLOW (outline-only blob) · 8. CHONK 2PX (chunky 8-bit, 2-px strokes) · 9. GEOMETRIC (triangle torso, rect legs) · 10. SHADOW (solid ink + white face pixels). Styles 6–10 also answer your "other different art styles" ask.

## Slide 2 — COFFEE MACHINE STYLES (~8 options, colored)
Colored pixel art on ink outlines, muted retro palette (deck accents 2F6FED/16A34A/D97706/DC2626 + coffee browns 8A5A2B/6B4420 + gold F5C86E + metals) so it sits well on the off-white slides.
1. CLASSIC DRIP (hopper/carafe/spout) · 2. ESPRESSO BOX (portafilter, gauge, wand) · 3. TALL VENDING (window + cup slot) · 4. MOKA POT · 5. POUR-OVER STAND · 6. FRENCH PRESS · 7. CAPSULE TOWER · 8. BIG CAFÉ BREWER (2 taps).

## Slide 3 — TREASURE CHESTS (~8 options, each shown ink-1-bit AND colored)
Each tile shows both variants side-by-side (game is B&W; colored shown for comparison); top 4 styles also get a closed + open pair (open = coins/glow).
1. CLASSIC WOOD+GOLD · 2. PIXEL CHUNKY · 3. IRON VAULT · 4. MAGICAL (glow + sparkles) · 5. CRATE · 6. ROYAL (gems) · 7. MINI 1-BIT · 8. OPEN LOOT pile.

## Build (sub-agents, same pattern as before)
1. Main session writes `CATALOG-SPEC.md` pinning tile grid, names, labels, palette, asset naming (`assets\catalog\...` + manifest).
2. **Agent A** writes + runs `gen_catalog.py` (parametric pixel-art drawer on the existing font/Pillow pipeline; runners ink-only, machines/chests colored; every PNG spot-checked for palette compliance).
3. **Agent B** writes `build_catalog.js` (pptxgenjs, 3 slides, grid of image tiles + bitmap labels, kicker "COFFEE QUEST · STYLE CATALOG", titles "PICK YOUR RUNNER / MACHINE / CHEST", notes telling you how to reply with picks: runner #, machine #, chest #).
4. Main session: run build → render via PowerPoint COM → **visual-judge gate** on the 3 PNGs (labels legible, tiles aligned, palette respected, sprites crisp) → fix loop until 3/3.

## After you pick
Resume the paused compact game build (CONTRACT-COMPACT.md already written, engine already patched): chosen runner style at the 16/13/11/9/7-cell ladder, chosen machine (now colored per your new instruction), and — if you want — chests as a bonus pickup element (e.g. collects → heart refill), which I'll propose once styles are chosen.