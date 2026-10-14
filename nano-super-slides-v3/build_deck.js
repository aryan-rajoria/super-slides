/* nano-super "Coffee Quest" — v3 SIZE LAB deck (5 slides).
 * Each slide runs the SAME dino-look game at a different cell size
 * (0.75 / 1.5 / 2.25 / 3.0 / 3.75 pt = 1..5 PNG px per sprite cell), strictly
 * ink + grays, no sky band / rules / ground fill / timer frame / sun-moon.
 * Geometry, objectNames and text strings are pinned in CONTRACT.md (v3, §1-§4);
 * where this file and v2 differ, the contract wins.
 *
 * BUILD ORDER (main session — sprites MUST exist before this script runs):
 *   1. ..\.venv\Scripts\python gen_sprites_bw.py   -> assets\<set>\*.png + assets\manifest.json
 *   2. NODE_PATH=$(npm root -g) node build_deck.js -> nano-super-coffee-quest-v3.pptx
 *   3. powershell -File inject_vba.ps1  ·  4. powershell -File export_pngs.ps1
 *
 * All game image sizes are EXPLICIT inches = sprite cells x CELLin (contract §2).
 * Only exception: the skyline width is forced to 2 x W = 26.666 in
 * (2 seamless periods; the VBA engine derives the period as width/2).
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const MAN = JSON.parse(fs.readFileSync("assets/manifest.json", "utf8"));

// ---------- palette: ink + grays ONLY (contract §0 — no accents anywhere) ----------
const P = {
  BG: "F7F6F2", INK: "1B1D22", MUT: "5C6068", GRAY: "9AA0AB", HID: "888888",
};
const W = 13.333, H = 7.5, MG = 0.55;
const GROUND = 7.167;          // man's feet line — SAME on all 5 slides (v2 value, 516 pt)
const PARK = -3.0;             // off-slide parking x for hidden shapes (v2)
const SKY_W = 2 * W;           // 26.666 in — skyline, 2 seamless periods
const MONO = "Consolas", SANS = "Segoe UI";

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "aryan-rajoria";
pres.title = "nano-super \u2014 coffee quest size lab (v3)";

// ---------- v2-style helpers ----------
function rect(s, x, y, w, h, fill, objectName) {
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h, fill: { color: fill }, line: { type: "none" }, objectName,
  });
}
function sq(s, x, y, size, color) { rect(s, x, y, size, size, color); }
function voxel(s, x, y, c1, c2, c3) {          // ink voxel triad, top-right
  const z = 0.14;
  sq(s, x, y, z, c1); sq(s, x + z + 0.03, y, z, c2); sq(s, x, y + z + 0.03, z, c3);
}
function txt(s, t, o) {
  s.addText(t, Object.assign({ fontFace: SANS, color: P.INK, margin: 0, align: "left", valign: "top" }, o));
}
function notes(s, t) { s.addNotes(t); }

// bitmap content text (assets\text\) — v2 auto-width from manifest aspect
function imgText(s, name, x, y, h) {
  const m = MAN[`text/${name}`], w = h * (m.w / m.h);
  s.addImage({ path: `assets/text/${name}.png`, x, y, w, h });
  return { r: x + w, b: y + h, w, h };
}

// game sprite from a per-variant set — EXPLICIT w and h in inches = cells x CELLin.
// wc/hc default to the sprite's cell size from the manifest.
function imgC(s, set, name, x, y, wc, hc, objectName) {
  const m = MAN[`${set}/${name}`];
  if (wc == null) wc = m.w;
  if (hc == null) hc = m.h;
  const c = CELL[set];
  const w = wc * c, h = hc * c;
  s.addImage({ path: `assets/${set}/${name}.png`, x, y, w, h, objectName });
  return { r: x + w, b: y + h, w, h };
}

// ---------- slide matrix (contract §1) ----------
const VARIANTS = [
  // skyline only on gray2 slides: a solid-ink silhouette eats the ink runner/
  // hearts/HUD wherever they cross it (ink-on-ink); the light #9AA0AB city on
  // gray2 keeps contrast. Mono1 slides get the authentic bare dino sky.
  { n: 1, label: "MICRO",   set: "m1_1", cellPt: 0.75, cfg: "0.75", ground: false, skyline: false, timeSec: 30,  finale: false },
  { n: 2, label: "SMALL",   set: "g2_2", cellPt: 1.50, cfg: "1.5",  ground: true,  skyline: true,  timeSec: 60,  finale: false },
  { n: 3, label: "CLASSIC", set: "m1_3", cellPt: 2.25, cfg: "2.25", ground: true,  skyline: false, timeSec: 90,  finale: false },
  { n: 4, label: "CHUNKY",  set: "g2_4", cellPt: 3.00, cfg: "3.0",  ground: false, skyline: true,  timeSec: 120, finale: false },
  { n: 5, label: "JUMBO",   set: "m1_5", cellPt: 3.75, cfg: "3.75", ground: true,  skyline: false, timeSec: 0,   finale: true },
];
// CELLin per set: cell pt / 72
const CELL = {};
for (const v of VARIANTS) CELL[v.set] = v.cellPt / 72;

// spec lines (contract §2 — exact strings)
const SPECS = [
  "cell 0.75pt \u00b7 runner 0.21in \u00b7 ground line none \u00b7 1-bit ink",
  "cell 1.50pt \u00b7 runner 0.42in \u00b7 ground line thin \u00b7 ink + 2 grays",
  "cell 2.25pt \u00b7 runner 0.63in \u00b7 ground line thin \u00b7 1-bit ink",
  "cell 3.00pt \u00b7 runner 0.83in \u00b7 ground line none \u00b7 ink + 2 grays",
  "cell 3.75pt \u00b7 runner 1.04in \u00b7 ground line thin \u00b7 1-bit ink \u00b7 finale",
];
const GAME_CUE = "F5 \u2192 click START on slide 1. Forward slide change = jump; back = lose a heart. Last slide brews the coffee.";
const NOTE_TXT = [
  "MICRO: the same Coffee Quest rendered at 0.75 pt cells (1 PNG px per cell) \u2014 a 0.21 in runner in a hairline world; 30 s timer budget.",
  "SMALL: 1.50 pt cells (2 px per cell), ink plus two grays; thin 1-cell ground line under the strip; 60 s timer budget.",
  "CLASSIC: 2.25 pt cells (3 px per cell), 1-bit ink silhouettes \u2014 the v2 native size; 90 s timer budget.",
  "CHUNKY: 3.00 pt cells (4 px per cell), ink plus two grays, no ground line; 120 s timer budget.",
  "JUMBO: 3.75 pt cells (5 px per cell) \u2014 the finale. The runner reaches the coffee machine, brews, the banner drops and hearts refill. No timer on this slide.",
];

// ---------- content block above the game (contract §2) ----------
function contentBlock(s, v) {
  s.background = { color: P.BG };
  voxel(s, 12.18, 0.42, P.INK, P.MUT, P.GRAY);                 // ink/gray/gray triad
  imgText(s, `v3k0${v.n}`, MG, 0.44, 0.22);                    // bitmap kicker
  imgText(s, `v3t0${v.n}`, MG, 0.72, 0.52);                    // bitmap title
  txt(s, SPECS[v.n - 1], { x: MG, y: 1.4, w: 10.5, h: 0.24, fontFace: MONO, fontSize: 10.5, color: P.MUT });
}

// ---------- the game itself — everything sits directly on the slide bg ----------
function gameStrip(s, v) {
  const c = CELL[v.set], set = v.set;
  const manH = 20 * c, MAN_Y = GROUND - manH, MAN_X = 2.083;

  // skyline (BEFORE the groundline so the line overlaps its bottom cell) —
  // gray2 slides only; see VARIANTS note. Engine treats it as optional.
  if (v.skyline) s.addImage({
    path: `assets/${set}/skyline_day.png`,
    x: -2.222, y: GROUND - 16 * c, w: SKY_W, h: 16 * c, objectName: "skyline",
  });
  // groundline: thin ink rule, slides 2/3/5 only — the ONLY full-width rect allowed
  if (v.ground) rect(s, 0, GROUND, W, c, P.INK, "groundline");

  // clouds + score tag. The tag is HUD text: FIXED v2 size (m1_3 set, 2.25pt
  // cells) on every slide — scaling 53 cells by the variant made it a giant
  // banner at JUMBO. It sits just above the obstacle band.
  imgC(s, set, "cloud1", 3.1, GROUND - 1.85 * manH, null, null, "cloud1");
  imgC(s, set, "cloud2", 6.4, GROUND - 1.65 * manH, null, null, "cloud2");
  imgC(s, "m1_3", `scoretag_0${v.n}`, 0.167, GROUND - 0.75, null, null, "scoretag");

  // props: signs + bush on-stage; finale keeps a clean stage for the machine (v2)
  if (v.finale) {
    imgC(s, set, "sign_coffee", PARK, GROUND - 16 * c, null, null, "sign1");
    imgC(s, set, "sign_nocoffee", PARK, GROUND - 16 * c, null, null, "sign2");
  } else {
    // signs kept LEFT of x~9.5in: sign maps are up to 57 cells wide, and at
    // 3-4px cells the old 9.792 anchor pushed them into the timer/text zone.
    imgC(s, set, "sign_coffee", 4.2, GROUND - 16 * c, null, null, "sign1");
    imgC(s, set, "sign_nocoffee", 7.2, GROUND - 16 * c, null, null, "sign2");
  }
  imgC(s, set, "sign_closed", PARK, GROUND - 16 * c, null, null, "sign3");
  imgC(s, set, "bush", v.finale ? PARK : 6.2, GROUND - 5 * c, null, null, "bush");

  // obstacles (parked off-slide; the engine spawns them)
  imgC(s, set, "cactus", PARK, GROUND - 10 * c, null, null, "cactus");
  imgC(s, set, "rock", PARK, GROUND - 5 * c, null, null, "rock");

  // the man: runA on-screen (rest pose the engine binds to), other frames parked
  imgC(s, set, "man_runA", MAN_X, MAN_Y, null, 20, "man_runA");
  imgC(s, set, "man_runB", PARK, MAN_Y, null, 20, "man_runB");
  imgC(s, set, "man_jump", PARK, MAN_Y, null, 20, "man_jump");
  imgC(s, set, "man_idle", PARK, MAN_Y, null, 20, "man_idle");

  // hearts HUD — right-anchored, floating just above the ground line
  const hy = GROUND - 3.5 * c - 6 * c;               // heartH = 6 cells (map is 7 wide)
  const hx3 = W - 0.2 - 7 * c;                       // rightmost heart's right edge = W - 0.2
  imgC(s, set, "heart_full", hx3 - 18 * c, hy, 7, 6, "heartF1");   // spacing 9 cells
  imgC(s, set, "heart_full", hx3 - 9 * c, hy, 7, 6, "heartF2");
  imgC(s, set, "heart_full", hx3, hy, 7, 6, "heartF3");
  imgC(s, set, "heart_empty", PARK, hy, 7, 6, "heartE1");
  imgC(s, set, "heart_empty", PARK, hy, 7, 6, "heartE2");
  imgC(s, set, "heart_empty", PARK, hy, 7, 6, "heartE3");

  // dino-style track dashes — float on no-line slides too
  rect(s, 0.833, GROUND + 2 * c, 8 * c, 2 * c, P.INK, "mark1");
  rect(s, 7.5, GROUND + 2 * c, 8 * c, 2 * c, P.INK, "mark2");

  // timer (slides 1-4 only; NO frame rect) — bar + ink text, stacked above hearts.
  // Bar width FIXED at v2's 2.72in: 87 cells scaled by the variant reached
  // 4.5in at JUMBO-adjacent sizes and collided with the right-side props.
  if (v.timeSec > 0) {
    const barW = 2.72, barH = 3.5 * c;
    const barX = W - 0.2 - barW;
    const barY = GROUND - 3.5 * c - 6 * c - 4 * c - barH;
    rect(s, barX, barY, barW, barH, P.INK, "timerbar");
    const mm = Math.floor(v.timeSec / 60), ss = String(v.timeSec % 60).padStart(2, "0");
    txt(s, `${mm}:${ss}`, {
      x: barX - 0.08 - 0.8, y: barY + barH / 2 - 0.11, w: 0.8, h: 0.22,
      fontFace: MONO, fontSize: 9.5, bold: true, color: P.INK, align: "right", valign: "middle",
      objectName: "timetext",
    });
  }

  // hidden per-slide config read by the VBA engine (v2 style, x = -0.9)
  txt(s, String(v.timeSec), { x: -0.9, y: 0.2, w: 0.55, h: 0.2, fontSize: 8, color: P.HID, objectName: "cfgTime" });
  txt(s, v.cfg, { x: -0.9, y: 0.45, w: 0.55, h: 0.2, fontSize: 8, color: P.HID, objectName: "cfgScale" });

  // finale-only furniture (slide 5): machine on-stage, spares parked
  if (v.finale) {
    // machine 20c wide = 1.04in at JUMBO; x 10.4 keeps it clear of the hearts
    // row (leftmost heart lands at ~11.83in) — engine derives all choreography
    // from this authored rect.
    imgC(s, set, "machine_off", 10.4, GROUND - 22 * c, null, 22, "machine");
    imgC(s, set, "machine_on", PARK, GROUND - 22 * c, null, 22, "machine_on");
    imgC(s, set, "machine_done", PARK, GROUND - 22 * c, null, 22, "machine_done");
    imgC(s, set, "steam1", PARK, GROUND - 22 * c - 5 * c, null, null, "steam");
    imgC(s, set, "steam2", PARK, GROUND - 22 * c - 5 * c, null, null, "steam2");
    // banner is 89 cells wide -> ~9.3in at JUMBO: park it scale-aware fully
    // off-slide (the old fixed -6.0 left 3in of it peeking onto the slide).
    const bm = MAN[`${set}/coffee_acquired`];       // banner 14 cells tall, aspect width
    const bw = 14 * (bm.w / bm.h) * c;
    imgC(s, set, "coffee_acquired", -(bw + 0.5), GROUND - 1.6 * manH - 14 * c, 14 * (bm.w / bm.h), 14, "coffeetext");
  }
}

// ---------- build the 5 slides ----------
for (const v of VARIANTS) {
  const s = pres.addSlide();
  contentBlock(s, v);
  gameStrip(s, v);
  notes(s, `${NOTE_TXT[v.n - 1]} ${GAME_CUE}`);
}

pres.writeFile({ fileName: "nano-super-coffee-quest-v3.pptx" })
  .then(() => console.log("WROTE nano-super-coffee-quest-v3.pptx"));
