/* nano-super "Coffee Quest" — STYLE CATALOG picker deck (3 slides, static).
 * Companion to build_deck.js (v3 size lab): same house style (bg F7F6F2,
 * bitmap kicker + title, ink voxel triad, MONO furniture) but NO game strip,
 * NO engine, NO timers — a static catalog the user picks art styles from.
 *
 * All image sizes are EXPLICIT inches derived from assets\catalog\manifest.json
 * cell dims (spec: catalog sprites 4 px/cell, text bitmaps 3 px/cell, c07 mini
 * 1 px/cell displayed at 4x its manifest inches = crisp integer scaling):
 *   run/machine/chest  -> cells x (4 px x 0.75pt / 72)
 *   text (tk/tt/l*)    -> cells x (3 px x 0.75pt / 72)
 *   chest c07_*        -> cells x (1 px x 0.75pt / 72) x 4
 *
 * BUILD ORDER (main session — assets MUST exist before this script runs):
 *   1. ..\.venv\Scripts\python gen_catalog.py    -> assets\catalog\* + manifest
 *   2. NODE_PATH=$(npm root -g) node build_catalog.js -> style-catalog.pptx
 *   3. powershell -NoProfile -ExecutionPolicy Bypass -File export_pngs_catalog.ps1
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const MAN = JSON.parse(fs.readFileSync("assets/catalog/manifest.json", "utf8"));

// ---------- palette (spec: ink + grays only on this deck's furniture) ----------
const P = { BG: "F7F6F2", INK: "1B1D22", MUT: "5C6068", GRAY: "9AA0AB" };
const W = 13.333, H = 7.5, MG = 0.55;
const GRID_TOP = 1.5, GRID_BOT = 7.25;          // tile grid band (spec, slide 1)
const MONO = "Consolas", SANS = "Segoe UI";

// display scale: inches per PNG px (1 px = 0.75 pt = 0.75/72 in)
const PX = 0.75 / 72;
const C4 = 4 * PX;                              // sprite cells -> inches
const C3 = 3 * PX;                              // text bitmap cells -> inches
const C07 = 4 * (1 * PX);                       // mini 1-bit chest at 4x integer

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "aryan-rajoria";
pres.title = "nano-super \u2014 style catalog";

// ---------- v3 house-style helpers (same as build_deck.js) ----------
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

// ---------- manifest lookups: explicit w/h inches from cell dims ----------
function dims(sub, name) {
  const m = MAN[`catalog/${sub}/${name}`] || MAN[`catalog/${sub}/${name}.png`];
  if (!m) throw new Error(`manifest missing entry catalog/${sub}/${name}`);
  const c = sub === "text" ? C3 : (sub === "chest" && name.startsWith("c07_") ? C07 : C4);
  return { w: m.w * c, h: m.h * c };
}
function img(s, sub, name, x, y, objectName) {
  const d = dims(sub, name);
  s.addImage({ path: `assets/catalog/${sub}/${name}.png`, x, y, w: d.w, h: d.h, objectName });
  return d;
}
// bitmap text centered on cx; returns bottom y
function imgTextC(s, name, cx, y) {
  const d = dims("text", name);
  img(s, "text", name, cx - d.w / 2, y, name);
  return y + d.h;
}

// ---------- content tables (labels/descriptors = exact spec strings) ----------
const RUN = [
  { id: "r01", label: "lr01", desc: "circle head, pumping arms, scissor legs" },
  { id: "r02", label: "lr02", desc: "leaning torso, speed lines" },
  { id: "r03", label: "lr03", desc: "classic stick + coffee to go" },
  { id: "r04", label: "lr04", desc: "30 degree lean, trailing scarf" },
  { id: "r05", label: "lr05", desc: "right angles only, pixel robot" },
  { id: "r06", label: "lr06", desc: "solid silhouette, dino style" },
  { id: "r07", label: "lr07", desc: "outline-only silhouette" },
  { id: "r08", label: "lr08", desc: "fat strokes, 8-bit" },
  { id: "r09", label: "lr09", desc: "triangle torso, rect limbs" },
  { id: "r10", label: "lr10", desc: "solid ink, white face detail" },
];
const MACH = [
  { id: "m01", label: "lm01", desc: "hopper, window, carafe" },
  { id: "m02", label: "lm02", desc: "portafilter, gauge, wand" },
  { id: "m03", label: "lm03", desc: "window, buttons, cup slot" },
  { id: "m04", label: "lm04", desc: "stovetop octagon" },
  { id: "m05", label: "lm05", desc: "stand, cone, carafe" },
  { id: "m06", label: "lm06", desc: "cylinder + plunger" },
  { id: "m07", label: "lm07", desc: "slim tower, capsule drawer" },
  { id: "m08", label: "lm08", desc: "two taps, big hopper" },
];
const CHEST = [
  { id: "c01", label: "lc01", desc: "wood + gold bands, arc lid", open: true },
  { id: "c02", label: "lc02", desc: "fat 8-bit chest", open: true },
  { id: "c03", label: "lc03", desc: "metal bands, heavy lock", open: true },
  { id: "c04", label: "lc04", desc: "glow lines, sparkles", open: true },
  { id: "c05", label: "lc05", desc: "plain planks", open: false },
  { id: "c06", label: "lc06", desc: "gold trim, gems", open: false },
  { id: "c07", label: "lc07", desc: "tiny ink silhouette", open: false },
  { id: "c08", label: "lc08", desc: "open chest, mound of coins", open: false },
];

// spec lines under the titles (exact strings, spec \u00a7 furniture)
const SPECS = [
  "reply with a runner number \u2014 the compact deck builds around it",
  "colored is allowed now \u2014 reply with a machine number",
  "ink = game-ready, colored for comparison \u2014 reply with a chest number",
];
const NOTES = [
  "STYLE CATALOG 1/3 \u2014 runner art styles, ink-only (INK 1B1D22 + transparent). " +
    "Ten styles \u00d7 three frames each (idle, runA, runB; runA = left leg forward, runB = right). " +
    "Reply with a runner number (e.g. \u201cr04\u201d or just \u201c4\u201d); the compact deck builds around that runner.",
  "STYLE CATALOG 2/3 \u2014 coffee machine styles. Colored is allowed now: every machine uses the catalog " +
    "palette (ink, blue, green, amber, red, brown, gold, wood, metal) with ink outlines on each part. " +
    "Reply with a machine number (e.g. \u201cm02\u201d or just \u201c2\u201d).",
  "STYLE CATALOG 3/3 \u2014 treasure chest styles. The ink variant is the game-ready 1-bit look; the colored " +
    "variant is shown for comparison. c01\u2013c04 also show their open pairs (lid raised, gold coins); c07 is the " +
    "mini 1-bit silhouette; c08 is open by design. Reply with a chest number (e.g. \u201cc06\u201d or just \u201c6\u201d).",
];

// ---------- preflight: every referenced asset must be in the manifest AND on disk ----------
const NEED = [["text", "tk"], ["text", "tt01"], ["text", "tt02"], ["text", "tt03"]];
for (const t of RUN) {
  for (const f of ["idle", "runA", "runB"]) NEED.push(["run", `${t.id}_${f}`]);
  NEED.push(["text", t.label]);
}
for (const t of MACH) { NEED.push(["machine", t.id], ["text", t.label]); }
for (const t of CHEST) {
  NEED.push(["chest", `${t.id}_ink`], ["chest", `${t.id}_col`], ["text", t.label]);
  if (t.open) NEED.push(["chest", `${t.id}_ink_open`], ["chest", `${t.id}_col_open`]);
}
const MISS = NEED.filter(([sub, name]) =>
  !(MAN[`catalog/${sub}/${name}`] || MAN[`catalog/${sub}/${name}.png`]) || !fs.existsSync(`assets/catalog/${sub}/${name}.png`));
if (MISS.length) throw new Error(`catalog assets not ready, missing: ${MISS.map(([s, n]) => `${s}/${n}`).join(", ")}`);

// ---------- header (house style: bitmap kicker/title + voxel triad + spec line) ----------
function header(s, n) {
  s.background = { color: P.BG };
  voxel(s, 12.18, 0.42, P.INK, P.MUT, P.GRAY);
  img(s, "text", "tk", MG, 0.44, "kicker");                    // bitmap kicker
  img(s, "text", `tt0${n}`, MG, 0.72, "title");                 // bitmap title
  txt(s, SPECS[n - 1], { x: MG, y: 1.4, w: 10.5, h: 0.24, fontFace: MONO, fontSize: 10.5, color: P.MUT });
  notes(s, NOTES[n - 1]);
}

// tile grid geometry: cols x 2 rows inside the band, even spacing, MG side margins
function tileGeom(cols) {
  return { tileW: (W - 2 * MG) / cols, rowH: (GRID_BOT - GRID_TOP) / 2 };
}
function descLine(s, t, tileLeft, tileW, y) {                   // native MONO 8pt gray
  txt(s, t, {
    x: tileLeft + 0.03, y, w: tileW - 0.06, h: 0.2,
    fontFace: MONO, fontSize: 8, color: P.MUT, align: "center",
  });
}

// ---------- slide 1 — PICK YOUR RUNNER (10 tiles, 5 cols x 2 rows) ----------
(function slide1() {
  const s = pres.addSlide();
  header(s, 1);
  const cols = 5, { tileW, rowH } = tileGeom(cols), GAP = 0.12;
  const FRAMES = ["idle", "runA", "runB"];
  RUN.forEach((t, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const cx = MG + tileW * (c + 0.5), rowTop = GRID_TOP + r * rowH, tileLeft = MG + tileW * c;
    const fd = FRAMES.map(f => dims("run", `${t.id}_${f}`));    // h = 16 cells ~ 0.67 in
    const sprH = Math.max(...fd.map(d => d.h));
    const lab = dims("text", t.label);
    const blockH = sprH + 0.08 + lab.h + 0.05 + 0.2;
    const top = rowTop + (rowH - blockH) / 2;                   // centered in the band
    const totalW = fd.reduce((a, d) => a + d.w, 0) + 2 * GAP;
    let x = cx - totalW / 2;                                    // idle + runA + runB row
    FRAMES.forEach((f, j) => { img(s, "run", `${t.id}_${f}`, x, top, `${t.id}_${f}`); x += fd[j].w + GAP; });
    const labB = imgTextC(s, t.label, cx, top + sprH + 0.08);   // name bitmap
    descLine(s, t.desc, tileLeft, tileW, labB + 0.05);
  });
})();

// ---------- slide 2 — PICK YOUR MACHINE (8 tiles, 4 cols x 2 rows) ----------
(function slide2() {
  const s = pres.addSlide();
  header(s, 2);
  const cols = 4, { tileW, rowH } = tileGeom(cols);
  MACH.forEach((t, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const cx = MG + tileW * (c + 0.5), rowTop = GRID_TOP + r * rowH, tileLeft = MG + tileW * c;
    const d = dims("machine", t.id);                            // 20-30 cells ~ 0.83-1.25 in
    const lab = dims("text", t.label);
    const blockH = d.h + 0.1 + lab.h + 0.05 + 0.2;
    const top = rowTop + (rowH - blockH) / 2;
    img(s, "machine", t.id, cx - d.w / 2, top, t.id);
    const labB = imgTextC(s, t.label, cx, top + d.h + 0.1);
    descLine(s, t.desc, tileLeft, tileW, labB + 0.05);
  });
})();

// ---------- slide 3 — PICK YOUR CHEST (8 tiles, 4 cols x 2 rows) ----------
(function slide3() {
  const s = pres.addSlide();
  header(s, 3);
  const cols = 4, { tileW, rowH } = tileGeom(cols), GX = 0.15, GY = 0.12;
  CHEST.forEach((t, i) => {
    const c = i % cols, r = Math.floor(i / cols);
    const cx = MG + tileW * (c + 0.5), rowTop = GRID_TOP + r * rowH, tileLeft = MG + tileW * c;
    // sprite rows: closed pair (ink | col); c01-c04 add the open pair below (2x2)
    const rows = [[`${t.id}_ink`, `${t.id}_col`]];
    if (t.open) rows.push([`${t.id}_ink_open`, `${t.id}_col_open`]);
    const rd = rows.map(names => names.map(n => dims("chest", n)));   // c07 auto 4x mini
    const rowW = rd.map(ds => ds[0].w + GX + ds[1].w);
    const rowHh = rd.map(ds => Math.max(ds[0].h, ds[1].h));
    const sprH = rowHh.reduce((a, h) => a + h, 0) + GY * (rows.length - 1);
    const lab = dims("text", t.label);
    const blockH = sprH + 0.06 + 0.16 + 0.06 + lab.h + 0.05 + 0.2;
    let y = rowTop + (rowH - blockH) / 2;
    rows.forEach((names, j) => {
      let x = cx - rowW[j] / 2;                                 // pair centered in the tile
      const floor = y + rowHh[j];                               // chests sit on a common floor
      names.forEach((n, k) => {
        img(s, "chest", n, x, floor - rd[j][k].h, n);
        x += rd[j][k].w + GX;
      });
      y += rowHh[j] + GY;
    });
    txt(s, "INK \u00b7 COLORED", {                              // caption row under the pair(s)
      x: tileLeft + 0.03, y: y - GY + 0.06, w: tileW - 0.06, h: 0.16,
      fontFace: MONO, fontSize: 8, color: P.MUT, align: "center",
    });
    const capB = y - GY + 0.06 + 0.16;
    const labB = imgTextC(s, t.label, cx, capB + 0.06);         // name bitmap
    descLine(s, t.desc, tileLeft, tileW, labB + 0.05);
  });
})();

pres.writeFile({ fileName: "style-catalog.pptx" })
  .then(() => console.log("WROTE style-catalog.pptx"));
