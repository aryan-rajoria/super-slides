/* nano-super "Coffee Quest" — COMPACT SIZE LAB deck (6 slides).
 * Every slide runs the same stick-runner game with the world cell pinned at
 * 0.75 pt (1 PNG px) — the ONLY size knob is the man's height in cells,
 * stepping down the ladder 16 / 13 / 11 / 9 / 7, finale sharing the 7-cell
 * "zoomed out" runner. GROUND is the slide's bottom edge: on "dashed" slides
 * a 1-cell-tall ink dash line (dash 6 / gap 4 cells) sits flush at the bottom
 * and the sprites stand one cell above it; on "edge" slides the sprites just
 * touch the bottom edge. Strictly ink + grays EXCEPT the finale's colored
 * vending machine and the drifting chest (STYLE PICKS LOCKED addendum).
 *
 * BUILD ORDER (main session — sprites MUST exist before this script runs):
 *   1. ..\.venv\Scripts\python gen_sprites_compact.py   -> assets\c16..\c7, assets\text + assets\manifest_compact.json
 *   2. $env:NODE_PATH=(npm root -g); node build_compact.js        -> ladder deck
 *      $env:NODE_PATH=(npm root -g); node build_compact.js 12     -> uniform 12-cell deck (set c12)
 *
 * All game image sizes are EXPLICIT inches = sprite cells x (0.75/72); text
 * bitmaps (assets\text\, 3 px/cell) are placed at fixed inch heights with
 * manifest-aspect widths. Engine = game_engine_compact.vba (shape-derived
 * geometry, chest collectible, cfgScale cross-check in man CELLS).
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");

let MAN;
try {
  MAN = JSON.parse(fs.readFileSync("assets/manifest_compact.json", "utf8"));
} catch (e) {
  throw new Error("assets/manifest_compact.json missing or unreadable \u2014 run gen_sprites_compact.py first");
}

// ---------- palette: ink + grays; color allowed ONLY on machine states + chest ----------
const P = {
  BG: "F7F6F2", INK: "1B1D22", MUT: "5C6068", GRAY: "9AA0AB", HID: "888888",
};
const W = 13.333, H = 7.5, MG = 0.55;
const PARK = -3.0;               // off-slide parking x for hidden shapes
const SKY_W = 2 * W;             // skyline: 2 seamless periods (engine derives period = width/2)
const MONO = "Consolas", SANS = "Segoe UI";
const PX = 0.75 / 72;            // world cell -> inches (1 PNG px = 0.75 pt, EVERY slide)

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "aryan-rajoria";
pres.title = "nano-super \u2014 coffee quest compact lab";

// ---------- manifest lookup: accept keys with or without the .png suffix ----------
function mget(set, name) {
  return MAN[`${set}/${name}`] || MAN[`${set}/${name}.png`];
}
function hasAsset(set, name) {
  return !!mget(set, name) && fs.existsSync(`assets/${set}/${name}.png`);
}

// ---------- v3 house-style helpers ----------
function rect(s, x, y, w, h, fill, objectName) {
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h, fill: { color: fill }, line: { type: "none" }, objectName,
  });
}
function sq(s, x, y, size, color) { rect(s, x, y, size, size, color); }
function voxel(s, x, y, c1, c2, c3) {           // ink voxel triad, top-right
  const z = 0.14;
  sq(s, x, y, z, c1); sq(s, x + z + 0.03, y, z, c2); sq(s, x, y + z + 0.03, z, c3);
}
function txt(s, t, o) {
  s.addText(t, Object.assign({ fontFace: SANS, color: P.INK, margin: 0, align: "left", valign: "top" }, o));
}
function notes(s, t) { s.addNotes(t); }

// game sprite from a 1-px set — EXPLICIT w/h in inches = cells x PX.
// wc/hc default to the sprite's cell size from the manifest.
function imgC(s, set, name, x, y, wc, hc, objectName) {
  const m = mget(set, name);
  if (!m) throw new Error(`manifest missing entry ${set}/${name}`);
  if (wc == null) wc = m.w;
  if (hc == null) hc = m.h;
  const w = wc * PX, h = hc * PX;
  s.addImage({ path: `assets/${set}/${name}.png`, x, y, w, h, objectName });
  return { r: x + w, b: y + h, w, h };
}

// bitmap text (assets\text\, 3 px/cell ink) at a FIXED inch height,
// width from the manifest aspect. objectName optional (HUD shapes only).
function imgText(s, name, x, y, h, objectName) {
  const m = mget("text", name);
  if (!m) throw new Error(`manifest missing entry text/${name}`);
  const w = h * (m.w / m.h);
  s.addImage({ path: `assets/text/${name}.png`, x, y, w, h, objectName });
  return { r: x + w, b: y + h, w, h };
}

// ---------- slide matrix (ADDENDUM — STYLE PICKS LOCKED) ----------
// S1 c16 mono1 dashed 30s · S2 c13 gray2 edge 45s · S3 c11 mono1 dashed 60s
// S4 c9 gray2 edge 90s · S5 c7 mono1 dashed 120s · S6 c7 mono1 dashed 0s finale.
const LADDER = [
  { n: 1, set: "c16", cells: 16, gray2: false, dashed: true,  timeSec: 30 },
  { n: 2, set: "c13", cells: 13, gray2: true,  dashed: false, timeSec: 45 },
  { n: 3, set: "c11", cells: 11, gray2: false, dashed: true,  timeSec: 60 },
  { n: 4, set: "c9",  cells: 9,  gray2: true,  dashed: false, timeSec: 90 },
  { n: 5, set: "c7",  cells: 7,  gray2: false, dashed: true,  timeSec: 120 },
  { n: 6, set: "c7",  cells: 7,  gray2: false, dashed: true,  timeSec: 0, finale: true },
];

// CLI: `node build_compact.js [MAN_CELLS]` — one numeric arg rebuilds the deck
// uniformly at that man size (set c<N>); no arg = the default ladder above.
// Per-slide structure (palette flags, bottom treatment, budgets, finale) stays.
const arg = process.argv[2];
let UNIFORM = 0;
if (arg != null) {
  UNIFORM = Number(arg);
  if (!Number.isInteger(UNIFORM) || UNIFORM < 1) {
    throw new Error(`bad MAN_CELLS arg "${arg}" \u2014 expected one positive integer, e.g. 12`);
  }
}
const VARIANTS = LADDER.map(v => (UNIFORM ? { ...v, set: `c${UNIFORM}`, cells: UNIFORM } : v));
if (UNIFORM) console.log(`uniform man size ${UNIFORM} cells \u2014 all 6 slides use set c${UNIFORM}`);

// ---------- preflight: every referenced asset must be in the manifest AND on disk ----------
const NEED = [];
for (const v of VARIANTS) {
  for (const f of ["man_runA", "man_runB", "man_jump", "man_idle",
                   "heart_full", "heart_empty", "cactus", "rock",
                   "cloud1", "cloud2", "chest"]) NEED.push([v.set, f]);
  if (v.gray2 && hasAsset(v.set, "skyline_day")) NEED.push([v.set, "skyline_day"]);
  if (v.finale) {
    for (const f of ["machine_off", "machine_on", "machine_done", "steam1", "steam2"]) {
      NEED.push([v.set, f]);
    }
    NEED.push(["text", "cbanner"]);
  }
  NEED.push(["text", "ck"], ["text", `ct0${v.n}`], ["text", `cscore_0${v.n}`]);
}
const MISS = NEED.filter(([set, name]) => !mget(set, name) || !fs.existsSync(`assets/${set}/${name}.png`));
if (MISS.length) {
  throw new Error(`compact assets not ready, missing: ${MISS.map(([s, n]) => `${s}/${n}`).join(", ")}`);
}

// ---------- spec line under the title (native MONO 10.5, #5C6068) ----------
function specLine(v) {
  const rin = (v.cells * PX).toFixed(2);        // N x 0.0104 in
  if (v.finale) {
    return `${v.cells} cells \u00b7 runner ${rin}in \u00b7 finale \u2014 brew at the vending machine, hearts refill, chests on the road`;
  }
  let t = `${v.cells} cells \u00b7 runner ${rin}in \u00b7 ${v.gray2 ? "ink + grays" : "ink"} \u00b7 ${v.dashed ? "dashed bottom line" : "bottom edge"} \u00b7 ${v.timeSec}s budget`;
  if (v.n === 5) t += " \u00b7 zoomed out";
  return t;
}

const GAME_CUE = "F5 \u2192 click START on slide 1. Forward slide change = jump; back = lose a heart; chests refill a heart; slide 6 brews the coffee.";
function noteText(v) {
  const rin = (v.cells * PX).toFixed(2);
  const t = v.finale
    ? `THANK YOU \u2014 the ${v.cells}-cell (${rin}in) stick runner sprints to the tall vending machine, brews a cup, the COFFEE ACQUIRED banner drops and every heart refills. Chests keep drifting past on the road. No timer on this slide.`
    : `RUNNER ${v.cells} CELLS (${rin}in)${v.n === 5 ? " \u2014 zoomed out, the smallest step of the ladder" : ""}: ${v.gray2 ? "ink plus two grays with the light skyline silhouette behind the strip" : "1-bit ink only"} on the ${v.dashed ? "dashed bottom line" : "bare bottom edge"}; ${v.timeSec} s budget. Chests drift past during the run \u2014 grab one to refill a heart.`;
  return `${t} ${GAME_CUE}`;
}

// ---------- header (house style: voxel triad + bitmap kicker/title + spec) ----------
function header(s, v) {
  s.background = { color: P.BG };
  voxel(s, 12.18, 0.42, P.INK, P.MUT, P.GRAY);
  imgText(s, "ck", MG, 0.44, 0.22);                       // bitmap kicker
  imgText(s, `ct0${v.n}`, MG, 0.72, 0.52);                // bitmap title
  txt(s, specLine(v), { x: MG, y: 1.4, w: 10.5, h: 0.24, fontFace: MONO, fontSize: 10.5, color: P.MUT });
}

// ---------- the game strip — GROUND is the slide's bottom edge ----------
function gameStrip(s, v) {
  const set = v.set, c = PX;
  const ground = v.dashed ? H - c : H;          // man's feet line (GROUND = H - 1 cell on dashed)
  const manH = v.cells * c, manTop = ground - manH, MAN_X = 2.083;

  // skyline — gray2 slides only, light silhouette, height manH + 4 cells,
  // explicit width 2 x W, drawn BEFORE the dash line (z-order per contract).
  if (v.gray2 && hasAsset(set, "skyline_day")) {
    s.addImage({
      path: `assets/${set}/skyline_day.png`,
      x: -2.222, y: ground - (v.cells + 4) * c, w: SKY_W, h: (v.cells + 4) * c,
      objectName: "skyline",
    });
  } else if (v.gray2) {
    console.warn(`slide ${v.n}: ${set}/skyline_day not found \u2014 skyline skipped`);
  }

  // dashed bottom line: 1-cell-tall ink dashes, dash 6 / gap 4 cells, flush
  // at the bottom edge (full width; 128 periods cover 13.333 in exactly).
  if (v.dashed) {
    let i = 1;
    for (let x = 0; x < W; x += 10 * c, i++) rect(s, x, H - c, 6 * c, c, P.INK, `dash${i}`);
  }

  // clouds (outline style), fixed 8x4 / 6x3 cells
  imgC(s, set, "cloud1", 3.1, ground - 1.55 * manH - 4 * c, 8, 4, "cloud1");
  imgC(s, set, "cloud2", 6.4, ground - 1.35 * manH - 3 * c, 6, 3, "cloud2");

  // score tag: TEXT-set bitmap at FIXED h 0.19 in (never variant-scaled)
  imgText(s, `cscore_0${v.n}`, 0.167, ground - 2 * c - 0.19, 0.19, "scoretag");

  // obstacles + chest: parked off-slide, bottoms on GROUND (engine spawns them)
  imgC(s, set, "cactus", PARK, ground - mget(set, "cactus").h * c, null, null, "cactus");
  imgC(s, set, "rock", PARK, ground - mget(set, "rock").h * c, null, null, "rock");
  imgC(s, set, "chest", PARK, ground - mget(set, "chest").h * c, null, null, "chest");

  // hearts HUD: 6x6 cells, 8-cell slot pitch, rightmost right edge W - 0.2,
  // row bottom = GROUND - 2 cells. Empty hearts parked.
  const hy = ground - 8 * c, hx3 = W - 0.2 - 6 * c;
  imgC(s, set, "heart_full", hx3 - 16 * c, hy, 6, 6, "heartF1");
  imgC(s, set, "heart_full", hx3 - 8 * c, hy, 6, 6, "heartF2");
  imgC(s, set, "heart_full", hx3, hy, 6, 6, "heartF3");
  imgC(s, set, "heart_empty", PARK, hy, 6, 6, "heartE1");
  imgC(s, set, "heart_empty", PARK, hy, 6, 6, "heartE2");
  imgC(s, set, "heart_empty", PARK, hy, 6, 6, "heartE3");

  // the man: runA on-stage at x 2.083 feet on GROUND (the rest pose the engine
  // binds to); spare frames parked at MAN_Y
  imgC(s, set, "man_runA", MAN_X, manTop, null, null, "man_runA");
  imgC(s, set, "man_runB", PARK, manTop, null, null, "man_runB");
  imgC(s, set, "man_jump", PARK, manTop, null, null, "man_jump");
  imgC(s, set, "man_idle", PARK, manTop, null, null, "man_idle");

  // timer (slides 1-5 only; NO frame): bar 1.4 in x 4 cells, right edge
  // W - 0.2, stacked 2 cells above the hearts row; MONO bold 8 ink text
  // right-aligned, right edge = bar left - 0.06, centered on the bar.
  if (v.timeSec > 0) {
    const barW = 1.4, barH = 4 * c;
    const barX = W - 0.2 - barW;
    const barY = hy - 2 * c - barH;
    rect(s, barX, barY, barW, barH, P.INK, "timerbar");
    const mm = Math.floor(v.timeSec / 60), ss = String(v.timeSec % 60).padStart(2, "0");
    txt(s, `${mm}:${ss}`, {
      x: barX - 0.06 - 0.8, y: barY + barH / 2 - 0.11, w: 0.8, h: 0.22,
      fontFace: MONO, fontSize: 8, bold: true, color: P.INK,
      align: "right", valign: "middle", objectName: "timetext",
    });
  }

  // hidden per-slide config read by the VBA engine (v3 style, x = -0.9):
  // cfgTime = budget seconds ("0" on the finale) · cfgScale = man CELLS
  txt(s, String(v.timeSec), { x: -0.9, y: 0.2, w: 0.55, h: 0.2, fontSize: 8, color: P.HID, objectName: "cfgTime" });
  txt(s, String(v.cells), { x: -0.9, y: 0.45, w: 0.55, h: 0.2, fontSize: 8, color: P.HID, objectName: "cfgScale" });

  // finale-only furniture (slide 6): colored vending machine on-stage at
  // x 11.6 bottom GROUND (clears the hearts row), spare states + steam parked,
  // banner parked fully off-slide at its show height.
  if (v.finale) {
    const machTop = ground - mget(set, "machine_off").h * c;
    imgC(s, set, "machine_off", 11.6, machTop, null, null, "machine");
    imgC(s, set, "machine_on", PARK, machTop, null, null, "machine_on");
    imgC(s, set, "machine_done", PARK, machTop, null, null, "machine_done");
    // steam show-top = authored parked top = GROUND - machine_h - steam_h
    imgC(s, set, "steam1", PARK, ground - mget(set, "machine_off").h * c - mget(set, "steam1").h * c, null, null, "steam");
    imgC(s, set, "steam2", PARK, ground - mget(set, "machine_off").h * c - mget(set, "steam2").h * c, null, null, "steam2");
    // banner: TEXT-set "COFFEE ACQUIRED" h 0.19 in, parked -(w+0.5),
    // top GROUND - 0.55 in (its show height)
    const bm = mget("text", "cbanner");
    const bw = 0.19 * (bm.w / bm.h);
    imgText(s, "cbanner", -(bw + 0.5), ground - 0.55, 0.19, "coffeetext");
  }
}

// ---------- build the 6 slides ----------
for (const v of VARIANTS) {
  const s = pres.addSlide();
  header(s, v);
  gameStrip(s, v);
  notes(s, noteText(v));
}

pres.writeFile({ fileName: "nano-super-coffee-quest-compact.pptx" })
  .then(() => console.log("WROTE nano-super-coffee-quest-compact.pptx"));
