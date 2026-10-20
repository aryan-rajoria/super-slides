# v1 style guide — nano-super-deep-dive.pptx (light "gaming pixel/voxel" deck)
Sources: `nano-super-slides-v1/gen_assets.py`, `build_deck.js` (read fully) + 12 renders at 1920x1080 (144 px/in), pixel-probed.

## Canvas & layout patterns
- 13.33 x 7.5 in (pptxgenjs LAYOUT_WIDE); margin MG = 0.55 in; renders 1920x1080 = 144 px/in.
- Cover (S1, dark) and closer (S12, dark) sandwich 10 light content slides (S2-S11).
- Content header: kicker PNG at (0.55, 0.44, h 0.20) over title PNG at (0.55, 0.72, h 0.52); voxel cluster top-right (12.18, 0.42); page counter `NN / 12` Consolas 9.5pt #5C6068 at (12.1, 7.09) right-aligned. Body zone y 1.4-6.9.
- Cover: small pi glyph (0.62in) + wordmark PNG (h 0.78) left; giant pi glyph right (9.35, 1.35, h 3.3); 4 mono stat chips row; repo + OCTOBER 2026 footer. Closer: white title PNG, 3 big takeaway rows, mono limits strip card, pi_white right (h 1.7).

## Palette (exact, verified from renders) — colorful, NOT 1-bit; all fills flat, zero gradients
- Light: BG `#F7F6F2` (warm paper) - INK `#1B1D22` - MUT `#5C6068` - CARD `#FFFFFF` - HAIR `#E3E1DA`
- Accents: BLUE `#2F6FED` GREEN `#16A34A` AMBER `#D97706` RED `#DC2626` PURPLE `#7C3AED` CYAN `#0E7490`
- Tints (panel fills): BLUE_T `#E7EEFD` GREEN_T `#E5F5EA` AMBER_T `#FBEEDD` RED_T `#FBE5E5` PURPLE_T `#EFE9FB` CYAN_T `#E0F2F7` GRAY_T `#EFEFEA`
- Dark: DK_BG `#1B1D22` DK_CARD `#24272F` DK_LINE `#3C414C` DK_MUT `#9AA0AB` DK_TXT `#E9EBEE` chip shadow `#05060A` cover sub `#C9CDD4` LBLUE `#7CB0FF` terminal green `#6EE7A0`
- Bitmap-font white is `#F5F6F8` (never pure white); roles: INK = text/borders/shadows, accents = squares/badges/numbers/labels, tints = callout-band fills.

## Fonts
- PIXEL: hand-defined 5x7 bitmap font in gen_assets.py (`F` dict; glyphs A-Z 0-9 space - . , : / & + ( ) middle-dot -> pi), drawn by Pillow as hard squares onto transparent PNGs. Advance 6 cells/char (5+1 gap). Scales: titles 16 (PNG 7*16=112px tall, placed h=0.52in -> cell 0.0743in = 10.7px @144dpi), kickers 8 (h 0.20in, cell ~4.1px), wordmark 24 (h 0.78in, cell 0.111in = 16px), pi_blue 36 with baked +10px ink offset shadow, pi_white 52. Titles ALL-CAPS ink; kickers ALL-CAPS BLUE; t12 white. No anti-aliasing inside glyphs.
- NATIVE: Segoe UI (headings 13-15pt bold, lead 27pt bold, body 11.5-12.5pt, MUT 10.5-11pt); Consolas (labels/code/chips/page no/footers 8.5-12.5pt bold or plain; big numbers 34/46/60pt bold). Letter-spaced caps labels (charSpacing 1.5-2.5, 10-10.5pt bold accent color) open bands/cards.

## Voxel / pixel-art construction
- Front-facing orthographic squares ONLY: no isometric, no dithering, no top/left shading, no outlines beyond chunky ink borders.
- Signature voxel = 3 squares, 2 stacked + 1 offset below-left: size 0.14in (0.16in dark), gap 0.03in, colors BLUE/GREEN/AMBER (dark: LBLUE/GREEN/AMBER). Every slide top-right; dark slides add a second cluster bottom-right.
- Number badges: 0.42-0.44in accent square, ink shadow square offset +0.03in, white Consolas bold number ("01".."06").
- Pixel arrows: 0.045in-thick shaft + stepped head (two 0.1in squares offset +-0.115in) + 0.05x0.1in tip; ink; arrowV elbow = rects. 
- Bullet/accent squares 0.10-0.17in flat accent color. Big art = single pi glyph as bitmap PNG (huge ~0.47in cells on cover).
- No characters/machines/props/ground lines in v1 (those arrive in v2/v3 game strips); subjects float on flat BG.

## Recurring furniture / HUD
- Every card: ink `#1B1D22` offset hard shadow (+0.055in, +0.055in) + fill (white or tint) + 2.25pt ink border. Sharp corners everywhere (no radius).
- Chips/badges/steps: 1.5pt ink border + 0.03in ink shadow; chip width = 0.18 + len*fs*0.0088, h = fs*1.9/72 + 0.1; Consolas bold centered. Dark chips: fill 24272F, border 3C414C, shadow 05060A.
- Inside cards: hairline dividers 0.75pt `#E3E1DA` between rows. NO scanlines, CRT, grids, hearts in v1 — clean flat retro.
- Terminal card (S3): dark ink fill, mono, prompt green `#6EE7A0`.

## Dense content styling
- Lists = one white card, rows = accent square + 15pt bold label + 11.5pt MUT desc, hairline separators (S2). 2x2 card grids (S4) and 3-col card rows (S5/S6/S10). 6-step flow = 3x2 cards + pixel arrows incl. elbow (S7).
- Tables hand-drawn (S8): hairline rows, MONO columns, right column BLUE bold, -> between, letter-spaced caps headers.
- KPI cards (S10): caps label / 34pt Consolas bold accent number / mono unit / hairline / square-bullet facts. Big-number callouts: 46-60pt mono bold on tint cards.
- Footnote strips: MONO 9.5-10.5pt MUT full-width.

## v1 pipeline (what a retheme agent REUSES)
1. `gen_assets.py` — Pillow; renders all bitmap text/art to `assets/*.png` + `manifest.json` (w/h per image). REUSE via importlib (v2/v3 pattern): `spec_from_file_location('gen_assets_v1', <v1>/gen_assets.py)`; import `F`, `render`, `ADV`, `text_cells`. Add glyphs to `F` as needed (v3 added `%`, `E`). Keep scales 16/8/24 and the pi treatment.
2. `build_deck.js` — pptxgenjs (global npm via NODE_PATH), reads manifest, sizes images by aspect. REUSE verbatim: palette `P`, `W/H/MG/SH`, helpers `img, rect, card, sq, voxel, arrowH/arrowV, txt, chip, header`. Rewrite only slide bodies.
3. `export_pngs.ps1` — PowerPoint COM export at 1920x1080 for QA (LibreOffice is banned on this machine).

## 10 rules to reproduce this theme
1. 13.33x7.5in; warm paper `#F7F6F2` light slides, ink `#1B1D22` dark cover+closer; flat fills only, zero gradients.
2. Titles/kickers/wordmark are pre-rendered 5x7 bitmap-font PNGs (scale 16/8/24), ALL-CAPS; everything else Segoe UI + Consolas.
3. Every card gets a hard ink offset shadow (+0.055in) and a 2.25pt ink border; sharp corners always.
4. Stamp the 3-square voxel cluster (BLUE/GREEN/AMBER, 0.14in, 0.03in gap) top-right of every slide.
5. Color-code with the 6 accents and their pastel tints; one accent per item, never mixed per card.
6. Bullets are squares (0.10-0.17in), never dots or icons; labels bold ink, descriptions MUT `#5C6068`.
7. Separate rows inside cards with 0.75pt hairlines `#E3E1DA`; label bands in letter-spaced caps.
8. Numbers are king: mono bold, 34-60pt, accent-colored, on white or tint cards; chips/badges carry mono caps in bordered boxes with mini shadows.
9. Build arrows, elbows, steps from axis-aligned rects (0.045in shaft, 0.1in head squares) — no native shapes with curves.
10. Footer = `NN / 12` Consolas 9.5pt MUT bottom-right; mono footnotes for sources; pixel-art stays orthographic front-view, no iso/dither/shading.
