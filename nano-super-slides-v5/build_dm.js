// build_dm.js — data-model.pptx (companion deck to the registry guide)
// Professional light-corporate theme: no sprites, no bitmap headings, no shadows.
// Run:  NODE_PATH=$(npm root -g) node build_dm.js
// Then: powershell -NoProfile -ExecutionPolicy Bypass -File verify_dm.ps1
//       powershell -NoProfile -ExecutionPolicy Bypass -File export_pngs_dm.ps1

const pptxgen = require("pptxgenjs");

// ---------------------------------------------------------------- theme
const W = 13.333, H = 7.5, MG = 0.55, CW = W - 2 * MG; // content width 12.233
const T = {
  BG: "FAFAF8", INK: "16181D", MUT: "5F6470", HAIR: "E2E4EA",
  CARD: "FFFFFF", ACC: "304FFE", ACC_T: "E8EDFF", ACC_D: "1E46C8",
  GREEN: "16A34A", GREEN_T: "E7F6EC", AMBER: "B45309", AMBER_T: "FBEEDD",
  GRAY: "6B7280", GRAY_T: "EEF0F3",
  COD: "15803D", OC: "1D4ED8", PI: "7C3AED", // harness identity (matrix columns)
};
const SANS = "Segoe UI", MONO = "Consolas";
const VC = { // verdict chips
  COPY:     { fg: T.GREEN, bg: T.GREEN_T, label: "COPY" },
  "COPY*":  { fg: T.GREEN, bg: T.GREEN_T, label: "COPY*" },
  TRANSLATE:{ fg: T.ACC,   bg: T.ACC_T,   label: "TRANSLATE" },
  OVERLAY:  { fg: T.AMBER, bg: T.AMBER_T, label: "OVERLAY" },
  NOSURF:   { fg: T.GRAY,  bg: T.GRAY_T,  label: "NO SURFACE" },
};
const HZ = [
  { key: "claude-code", name: "Claude Code", dot: T.AMBER },
  { key: "codex",       name: "Codex",      dot: T.COD },
  { key: "opencode",    name: "OpenCode",   dot: T.OC },
  { key: "pi",          name: "Pi",         dot: T.PI },
];
const TOTAL = 14;

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "aryan-rajoria";
pres.title = "The Data Model — nano-super companion";

// ---------------------------------------------------------------- helpers
const px = n => (n / 0.75).toFixed(2); // unused; keep inches everywhere

function slideBase() { const s = pres.addSlide(); s.background = { color: T.BG }; return s; }

function header(s, n, kick, title) {
  s.addText(kick.toUpperCase(), { x: MG, y: 0.42, w: 9.5, h: 0.26, fontFace: SANS, fontSize: 10,
    bold: true, color: T.ACC, charSpacing: 3, margin: 0 });
  s.addText(title, { x: MG, y: 0.70, w: 11.4, h: 0.52, fontFace: SANS, fontSize: 24,
    bold: true, color: T.INK, margin: 0 });
  s.addShape("line", { x: MG, y: 1.34, w: CW, h: 0, line: { color: T.HAIR, width: 1 } });
  s.addText(`${String(n).padStart(2, "0")} / ${TOTAL}`, { x: 12.05, y: 7.10, w: 0.85, h: 0.24,
    fontFace: MONO, fontSize: 8.5, color: T.MUT, align: "right", margin: 0 });
}

function card(s, x, y, w, h, opts = {}) {
  s.addShape("rect", { x, y, w, h, fill: { color: opts.fill || T.CARD },
    line: { color: opts.line || T.HAIR, width: 0.75 } });
  if (opts.accent) s.addShape("rect", { x, y, w: 0.05, h, fill: { color: opts.accent } });
}

function label(s, x, y, w, text, color = T.ACC) {
  s.addText(text.toUpperCase(), { x, y, w, h: 0.22, fontFace: SANS, fontSize: 9, bold: true,
    color, charSpacing: 2, margin: 0 });
}

function chip(s, x, y, w, h, vkey, fs = 8) {
  const v = VC[vkey];
  s.addText(v.label, { shape: "roundRect", rectRadius: 0.045, x, y, w, h,
    fill: { color: v.bg }, line: { color: v.bg }, fontFace: SANS, fontSize: fs, bold: true,
    color: v.fg, align: "center", valign: "middle", margin: 0 });
}

function dot(s, x, y, color) { s.addShape("rect", { x, y, w: 0.10, h: 0.10, fill: { color } }); }

function arrow(s, x1, y1, x2, y2, color = T.MUT) {
  // pptxgenjs emits negative extents as-is, which PowerPoint rejects — normalize + flip
  const x = Math.min(x1, x2), y = Math.min(y1, y2);
  s.addShape("line", { x, y, w: Math.abs(x2 - x1), h: Math.abs(y2 - y1),
    flipH: x2 < x1, flipV: y2 < y1,
    line: { color, width: 1.25, endArrowType: "triangle" } });
}

function bullets(s, x, y, w, items, opts = {}) {
  const fs = opts.fs || 10.5, lh = opts.lh || (opts.gap || 0.30), color = opts.color || T.INK;
  items.forEach((it, i) => {
    const yy = y + i * lh;
    s.addShape("rect", { x, y: yy + 0.075, w: 0.055, h: 0.055, fill: { color: opts.marker || T.ACC } });
    if (typeof it === "string") {
      s.addText(it, { x: x + 0.16, y: yy, w: w - 0.16, h: lh, fontFace: SANS, fontSize: fs,
        color, valign: "top", margin: 0 });
    } else {
      s.addText([
        { text: it.b, options: { bold: true, color: it.bc || T.INK } },
        { text: it.t, options: { color } },
      ], { x: x + 0.16, y: yy, w: w - 0.16, h: lh, fontFace: SANS, fontSize: fs,
        valign: "top", margin: 0 });
    }
  });
}

function kv(s, x, y, w, rows, opts = {}) {
  const kw = opts.kw || 2.95, lh = opts.lh || 0.34, kfs = opts.kfs || 9, vfs = opts.vfs || 9;
  rows.forEach(([k, v], i) => {
    const yy = y + i * lh;
    s.addText(k, { x, y: yy, w: kw, h: lh, fontFace: MONO, fontSize: kfs, color: T.ACC_D, margin: 0, valign: "top" });
    s.addText(v, { x: x + kw + 0.12, y: yy, w: w - kw - 0.12, h: lh, fontFace: SANS,
      fontSize: vfs, color: T.INK, margin: 0, valign: "top" });
  });
}

// ================================================================ 1 · cover
(function cover() {
  const s = slideBase();
  s.addShape("rect", { x: MG, y: 0.58, w: 0.30, h: 0.30, fill: { color: T.ACC } });
  s.addText("AGENTIC REGISTRY · COMPANION DECK", { x: 1.02, y: 0.60, w: 7.5, h: 0.26,
    fontFace: SANS, fontSize: 10.5, bold: true, color: T.ACC, charSpacing: 3, margin: 0 });

  s.addText("The Data Model", { x: MG, y: 2.02, w: 7.9, h: 0.95, fontFace: SANS, fontSize: 44,
    bold: true, color: T.INK, margin: 0 });
  s.addText("From translation matrix to organizational database — mapping teams, projects and\nharnesses to every feature of the matrix.",
    { x: MG, y: 3.10, w: 7.5, h: 0.85, fontFace: SANS, fontSize: 14.5, color: T.MUT, margin: 0 });
  s.addText("One record: core fields, optional extras, the original spec — resolved per project, installed per harness.",
    { x: MG, y: 4.02, w: 7.3, h: 0.55, fontFace: SANS, fontSize: 11.5, color: T.MUT, italic: true, margin: 0 });

  // harness row
  let hx = MG;
  HZ.forEach(h => {
    dot(s, hx, 5.62, h.dot);
    s.addText(h.name, { x: hx + 0.18, y: 5.53, w: 1.45, h: 0.26, fontFace: SANS, fontSize: 10.5,
      bold: true, color: T.INK, margin: 0 });
    hx += 0.22 + h.name.length * 0.085 + 0.42;
  });

  // right motif — a miniature of the matrix (4 surfaces × 4 harnesses, verdict colors)
  const mx = 8.75, my = 1.95, cw = 0.92, ch = 0.52, gx = 0.10, gy = 0.14;
  const rowsM = ["SKILL", "AGENT", "HOOK", "MCP"];
  const rowsLbl = ["SUBAGENT", "SUBAGENT", "HOOKS", "MCP"];
  const cells = [
    ["COPY", "COPY", "COPY", "COPY"],
    ["COPY", "TRANSLATE", "TRANSLATE", "NOSURF"],
    ["COPY", "COPY*", "TRANSLATE", "TRANSLATE"],
    ["COPY", "TRANSLATE", "TRANSLATE", "COPY"],
  ];
  for (let c = 0; c < 4; c++) dot(s, mx + 1.30 + c * (cw + gx), my - 0.30, HZ[c].dot);
  for (let r = 0; r < 4; r++) {
    s.addText(rowsM[r], { x: mx, y: my + r * (ch + gy) + 0.14, w: 1.22, h: 0.24, fontFace: MONO,
      fontSize: 7.5, bold: true, color: T.MUT, align: "right", margin: 0 });
    for (let c = 0; c < 4; c++) {
      const v = VC[cells[r][c]];
      s.addShape("roundRect", { x: mx + 1.30 + c * (cw + gx), y: my + r * (ch + gy), w: cw, h: ch,
        rectRadius: 0.05, fill: { color: v.bg }, line: { color: v.bg } });
    }
  }
  s.addText("the matrix, at minimum", { x: mx + 1.30, y: my + 4 * (ch + gy) + 0.06, w: 4.1, h: 0.24,
    fontFace: SANS, fontSize: 9, italic: true, color: T.MUT, margin: 0 });

  s.addShape("line", { x: MG, y: 6.75, w: CW, h: 0, line: { color: T.HAIR, width: 1 } });
  s.addText("nano-super-slides-v5 · docs/data-model/ · 2026-10-21", { x: MG, y: 6.88, w: 7.5, h: 0.26,
    fontFace: MONO, fontSize: 9.5, color: T.MUT, margin: 0 });
  s.addText("01 / 14", { x: 12.05, y: 6.88, w: 0.85, h: 0.26, fontFace: MONO, fontSize: 8.5,
    color: T.MUT, align: "right", margin: 0 });
})();

// ===================================================== 2 · one series, two layers
(function twoLayers() {
  const s = slideBase(); header(s, 2, "The series", "One series, two layers");
  card(s, MG, 1.58, 5.99, 3.95, { accent: T.ACC });
  label(s, MG + 0.28, 1.82, 5.4, "Layer 1 — per-surface minimums");
  bullets(s, MG + 0.28, 2.24, 5.45, [
    { b: "What every feature doc holds: ", t: "minimum portable core · exact per-harness transforms · original-spec appendix" },
    { b: "Answers: ", t: "\u201cwhat transform gets feature X working in harness Y?\u201d" },
    { b: "10 docs in features/ ", t: "— one per matrix row, tiered core / extras / spec" },
  ], { fs: 11, lh: 0.62, gap: 0.62 });
  s.addText("COPY where a spec-pure core works everywhere · TRANSLATE where conversion is mandatory · NO SURFACE where the harness has no target.",
    { x: MG + 0.28, y: 4.42, w: 5.45, h: 0.85, fontFace: SANS, fontSize: 10, color: T.MUT,
      italic: true, margin: 0 });

  card(s, MG + 6.24, 1.58, 5.99, 3.95, { accent: T.ACC });
  label(s, MG + 6.52, 1.82, 5.4, "Layer 2 — the organizational data model");
  bullets(s, MG + 6.52, 2.24, 5.45, [
    { b: "Extends your existing DB: ", t: "Area → Functional unit → Project → Team" },
    { b: "Adds: ", t: "harness setups, artifact registration, install lifecycle" },
    { b: "Answers: ", t: "\u201cwhich project needs what setup — and what is installed where?\u201d" },
  ], { fs: 11, lh: 0.62, gap: 0.62 });
  s.addText("data-model-org.md (ER narrative) + data-model-schema.sql (runnable Postgres, 14 tables, 2 views).",
    { x: MG + 6.52, y: 4.42, w: 5.45, h: 0.85, fontFace: SANS, fontSize: 10, color: T.MUT,
      italic: true, margin: 0 });

  card(s, MG, 5.72, CW, 1.05);
  label(s, MG + 0.28, 5.88, 3.5, "The series map", T.MUT);
  s.addText("data-model.md  (index · minimum matrix)   ·   data-model-org.md  (ER)   ·   data-model-schema.sql  (Postgres)   ·   features/data-model-<surface>.md  ×10",
    { x: MG + 0.28, y: 6.16, w: 11.7, h: 0.30, fontFace: MONO, fontSize: 9.5, color: T.INK, margin: 0 });
})();

// ===================================================== 3 · the one correction
(function correction() {
  const s = slideBase(); header(s, 3, "The one correction", "Minimum verdicts \u2260 full-parity verdicts");
  const LX = MG, LW = 7.55;

  card(s, LX, 1.58, LW, 1.98);
  label(s, LX + 0.28, 1.76, 6.8, "Slide 4 grades full parity — optional extras included", T.MUT);
  s.addText("Skills row:", { x: LX + 0.28, y: 2.12, w: 1.3, h: 0.3, fontFace: SANS, fontSize: 10.5,
    bold: true, color: T.INK, margin: 0 });
  for (let c = 0; c < 4; c++) chip(s, LX + 1.62 + c * 1.435, 2.08, 1.28, 0.34,
    c < 3 ? "OVERLAY" : "COPY");
  s.addText("because Claude wants when_to_use · Codex wants agents/openai.yaml · OpenCode wants metadata keys — for optional features.",
    { x: LX + 0.28, y: 2.62, w: LW - 0.56, h: 0.70, fontFace: SANS, fontSize: 10.5, color: T.MUT, margin: 0 });

  card(s, LX, 3.76, LW, 1.98, { accent: T.GREEN });
  label(s, LX + 0.28, 3.94, 6.8, "The data model grades the minimum", T.GREEN);
  for (let c = 0; c < 4; c++) chip(s, LX + 1.62 + c * 1.435, 4.26, 1.28, 0.34, "COPY");
  s.addText("A spec-pure SKILL.md (name + description) works in all four. Overlays are optional by definition — if the core cannot work without them, the verdict is TRANSLATE, not OVERLAY.",
    { x: LX + 0.28, y: 4.80, w: LW - 0.56, h: 0.80, fontFace: SANS, fontSize: 10.5, color: T.INK, margin: 0 });

  const RX = MG + 7.80, RW = 4.43;
  const defs = [
    ["COPY", "a spec-pure portable core works as-is; extras are optional overlays", T.GREEN],
    ["TRANSLATE", "the core itself needs conversion — format, dialect, or codegen", T.ACC],
    ["NO SURFACE", "no native target; the record must say supported = false", T.GRAY],
  ];
  defs.forEach(([k, t, c], i) => {
    const y = 1.58 + i * 1.44;
    card(s, RX, y, RW, 1.28);
    s.addText(k, { shape: "roundRect", rectRadius: 0.05, x: RX + 0.24, y: y + 0.22, w: 1.5, h: 0.32,
      fill: { color: c === T.GREEN ? T.GREEN_T : c === T.ACC ? T.ACC_T : T.GRAY_T },
      line: { color: T.BG }, fontFace: SANS, fontSize: 8.5, bold: true, color: c,
      align: "center", valign: "middle", margin: 0 });
    s.addText(t, { x: RX + 0.24, y: y + 0.62, w: RW - 0.48, h: 0.58, fontFace: SANS, fontSize: 9.5,
      color: T.INK, margin: 0 });
  });

  s.addText("The publisher never needs the extras — the registry emits them per harness, per copy.",
    { x: MG, y: 5.98, w: CW, h: 0.3, fontFace: SANS, fontSize: 11, italic: true, color: T.MUT, margin: 0 });
})();

// ===================================================== 4 · the matrix
(function matrix() {
  const s = slideBase(); header(s, 4, "The centerpiece", "The minimum-verdict matrix");
  // legend
  const leg = [["COPY", 1.05], ["COPY*", 1.05], ["TRANSLATE", 1.45], ["OVERLAY", 1.30], ["NOSURF", 1.55]];
  let lx = W - MG - leg.reduce((a, [, w]) => a + w + 0.12, 0);
  leg.forEach(([k, w]) => { chip(s, lx, 1.44, w, 0.28, k, 7); lx += w + 0.12; });
  s.addText("COPY* = copy with caveats (merge / subset / tune)", { x: MG, y: 1.44, w: 4.6, h: 0.26,
    fontFace: SANS, fontSize: 9, italic: true, color: T.MUT, margin: 0 });

  const rows = [
    ["Skills",       ["COPY","spec-pure SKILL.md"], ["COPY",".agents/skills drop"], ["COPY","3 skill dirs + catalog"], ["COPY","un-gated drop"]],
    ["Commands",     ["COPY*","legacy — prefer skill"], ["COPY*","deprecated, user-only"], ["COPY","map + frontmatter"], ["COPY","filename = /cmd"]],
    ["Subagents",    ["COPY","canonical md"], ["TRANSLATE","md \u2192 TOML"], ["TRANSLATE","dialect + mode"], ["NOSURF","example ext only"]],
    ["Hooks",        ["COPY*","merge into settings"], ["COPY*","12-event subset"], ["TRANSLATE","codegen TS plugin"], ["TRANSLATE","codegen TS ext"]],
    ["Plugins",      ["TRANSLATE",".claude-plugin + repo"], ["OVERLAY","portable + overlay + catalog"], ["TRANSLATE","npm TS package"], ["TRANSLATE","npm pi-package"]],
    ["MCP servers",  ["COPY","mcpServers JSON"], ["TRANSLATE","JSON \u2192 TOML"], ["TRANSLATE","JSON dialect v1/v2"], ["COPY","verbatim entry"]],
    ["LSP servers",  ["TRANSLATE","wrap in plugin"], ["NOSURF","absent from docs"], ["NOSURF","schema undocumented"], ["NOSURF","none as of 1.3.0"]],
    ["Custom tools", ["NOSURF","SDK code only"], ["NOSURF","toggles only"], ["TRANSLATE","ctx.tool.transform"], ["TRANSLATE","registerTool"]],
    ["Status line",  ["COPY","script + statusLine"], ["NOSURF","[tui] keys only"], ["NOSURF","themes adjacent"], ["OVERLAY","theme JSON, name=file"]],
    ["Exec policy",  ["TRANSLATE","derive allow-rules"], ["COPY",".rules verbatim"], ["TRANSLATE","permissions[] stmts"], ["NOSURF","metadata only"]],
  ];
  const x0 = MG, lw = 1.90, cw = (CW - lw) / 4, hy = 1.80, ry = 2.16, rh = 0.435;
  HZ.forEach((h, c) => {
    dot(s, x0 + lw + c * cw + 0.14, hy + 0.045, h.dot);
    s.addText(h.name, { x: x0 + lw + c * cw + 0.32, y: hy, w: cw - 0.32, h: 0.24, fontFace: SANS,
      fontSize: 9.5, bold: true, color: T.INK, margin: 0 });
  });
  rows.forEach((r, i) => {
    const y = ry + i * rh;
    s.addText(r[0], { x: x0 + 0.02, y: y + 0.02, w: lw - 0.10, h: rh - 0.04, fontFace: SANS,
      fontSize: 9.5, bold: true, color: T.INK, valign: "middle", margin: 0 });
    r.slice(1).forEach(([v, q], c) => {
      const vc = VC[v];
      s.addShape("rect", { x: x0 + lw + c * cw + 0.03, y: y + 0.02, w: cw - 0.09, h: rh - 0.05,
        fill: { color: vc.bg }, line: { color: T.HAIR, width: 0.5 } });
      s.addText([
        { text: vc.label + "\n", options: { bold: true, color: vc.fg, fontSize: 8 } },
        { text: q, options: { color: T.MUT, fontSize: 7 } },
      ], { x: x0 + lw + c * cw + 0.10, y: y + 0.035, w: cw - 0.22, h: rh - 0.08, fontFace: SANS,
        valign: "middle", margin: 0, lineSpacingMultiple: 0.92 });
    });
  });
  s.addText("The matrix as data: harness_surface_capability — 40 rows. NO SURFACE is emitted data (supported = false), never a silent skip.",
    { x: MG, y: ry + 10 * rh + 0.10, w: CW, h: 0.28, fontFace: SANS, fontSize: 9.5, italic: true,
      color: T.MUT, margin: 0 });
})();

// ===================================================== 5 · envelope + versioning
(function envelope() {
  const s = slideBase(); header(s, 5, "Layer 1 · the record", "The universal envelope — and who owns the version");
  card(s, MG, 1.58, 6.55, 5.18, { accent: T.ACC });
  label(s, MG + 0.28, 1.80, 5.8, "Registry-owned fields (every artifact)");
  kv(s, MG + 0.28, 2.24, 6.0, [
    ["identity.name", "one spec-legal name — usable as id everywhere"],
    ["identity.type", "which matrix row; drives the emitter"],
    ["version", "semver — no portable artifact carries one"],
    ["compatibility.harnesses", "supported · surfaces[] · via[] — the matrix as data"],
    ["payload", "files[] · entry · overlays.<harness> (extras only)"],
    ["requires", "runtime · mcp · network · shell"],
    ["install.<harness>", "method · target · command — the concrete drop"],
  ], { lh: 0.60, kfs: 9, vfs: 10 });

  const RX = MG + 6.80, RW = 5.43;
  card(s, RX, 1.58, RW, 2.40);
  label(s, RX + 0.24, 1.78, 4.6, "Version lives in four places", T.MUT);
  kv(s, RX + 0.24, 2.14, RW - 0.48, [
    ["claude-code", "manifest \u2192 marketplace \u2192 git sha"],
    ["codex", "plugin.json + ref/sha · npm version"],
    ["opencode", "catalog index.json · plugins pkg@ver"],
    ["pi", "package.json semver"],
  ], { kw: 1.35, lh: 0.42, kfs: 8.5, vfs: 9.5 });

  card(s, RX, 4.16, RW, 2.60, { accent: T.ACC });
  label(s, RX + 0.24, 4.36, 4.6, "Only bundles self-update");
  bullets(s, RX + 0.24, 4.76, RW - 0.52, [
    "plugins (marketplace refresh) · skills catalog bump · pi-packages",
    "every standalone artifact is a manual file drop — no pin, no update",
  ], { fs: 10, lh: 0.46 });
  s.addText("agentreg.lock:  urn \u2192 version \u2192 sha256 \u2192 per-harness targets",
    { x: RX + 0.24, y: 5.80, w: RW - 0.52, h: 0.30, fontFace: MONO, fontSize: 9, color: T.ACC_D, margin: 0 });
  s.addText("no harness ships one — the lockfile is the registry's job (v_lockfile_export)",
    { x: RX + 0.24, y: 6.10, w: RW - 0.52, h: 0.30, fontFace: SANS, fontSize: 9.5, italic: true, color: T.MUT, margin: 0 });
})();

// ===================================================== 6 · join points
(function joinPoints() {
  const s = slideBase(); header(s, 6, "Layer 2 · foundation", "Your database is the foundation");
  const box = (x, y, w, name, role, line = T.HAIR) => {
    card(s, x, y, w, 1.12, { line });
    s.addText(name, { x: x + 0.16, y: y + 0.18, w: w - 0.32, h: 0.28, fontFace: MONO, fontSize: 11,
      bold: true, color: T.INK, margin: 0 });
    s.addText(role, { x: x + 0.16, y: y + 0.52, w: w - 0.32, h: 0.48, fontFace: SANS, fontSize: 8.5,
      color: T.MUT, margin: 0 });
  };
  box(0.85, 1.70, 2.85, "area", "Area of activity — coarsest defaults");
  box(4.85, 1.70, 2.85, "functional_unit", "Unit-level defaults for its teams");
  box(8.85, 1.70, 2.85, "team", "Finest overrides; owns artifacts");
  box(5.35, 3.42, 3.85, "project", "The primary attach point — \u201cwhich project needs what setup\u201d");
  arrow(s, 3.70, 2.26, 4.85, 2.26); s.addText("1 \u2014 N", { x: 3.86, y: 1.96, w: 0.85, h: 0.22,
    fontFace: MONO, fontSize: 8.5, color: T.MUT, margin: 0 });
  arrow(s, 7.70, 2.26, 8.85, 2.26); s.addText("1 \u2014 N", { x: 7.86, y: 1.96, w: 0.85, h: 0.22,
    fontFace: MONO, fontSize: 8.5, color: T.MUT, margin: 0 });
  arrow(s, 10.27, 2.82, 8.20, 3.42); s.addText("M \u2014 N", { x: 9.30, y: 3.02, w: 0.85, h: 0.22,
    fontFace: MONO, fontSize: 8.5, color: T.MUT, margin: 0 });
  arrow(s, 2.28, 2.82, 5.35, 3.70); s.addText("1 \u2014 N", { x: 3.30, y: 3.35, w: 0.85, h: 0.22,
    fontFace: MONO, fontSize: 8.5, color: T.MUT, margin: 0 });
  s.addText("team_project", { x: 9.42, y: 3.30, w: 1.6, h: 0.22, fontFace: MONO, fontSize: 8.5,
    color: T.MUT, margin: 0 });
  s.addText("STUB join points — only ids are assumed; everything else about these tables stays yours.",
    { x: MG, y: 4.72, w: CW, h: 0.26, fontFace: SANS, fontSize: 9.5, italic: true, color: T.MUT, margin: 0 });

  card(s, MG, 5.12, CW, 1.62, { accent: T.ACC });
  label(s, MG + 0.28, 5.30, 5, "What each level contributes");
  const cols = [
    ["area", "\u201cEngineering standardizes on Claude Code\u201d"],
    ["functional_unit", "\u201cBackend adds Codex + policy posture\u201d"],
    ["project", "the answer to the mapping question"],
    ["team", "add OpenCode · forbid Pi (security posture)"],
  ];
  cols.forEach(([k, v], i) => {
    const x = MG + 0.28 + i * 3.0;
    s.addText(k, { x, y: 5.66, w: 2.85, h: 0.24, fontFace: MONO, fontSize: 9, bold: true, color: T.ACC_D, margin: 0 });
    s.addText(v, { x, y: 5.94, w: 2.85, h: 0.62, fontFace: SANS, fontSize: 9.5, color: T.INK, margin: 0 });
  });
})();

// ===================================================== 7 · new dimensions
(function dimensions() {
  const s = slideBase(); header(s, 7, "Layer 2 · dimensions", "Four new tables make the matrix queryable");
  const dims = [
    ["harness", "open lookup — seeded with the four studied harnesses; status active / deprecated / retired",
      "adding Cursor or Copilot later is an INSERT, not a migration — the core model never references a specific harness"],
    ["surface", "the ten matrix rows: skill · command · subagent · hook · plugin · mcp · lsp · custom_tool · statusline · exec_policy",
      "each row points at its feature doc, which defines its core"],
    ["harness_surface_capability", "one row per (harness × surface): minimum_verdict · install_target · notes — the matrix as data, 40 rows",
      "registrations against a no_surface cell are invalid — the model stays honest"],
    ["surface_field", "the field catalog: tier core / extras / spec · harness_id NULL = portable · constraints · unlocks · spec_source",
      "drives registration forms, validation and emitters (next slide)"],
  ];
  dims.forEach(([name, l1, l2], i) => {
    const x = MG + (i % 2) * 6.24, y = 1.58 + Math.floor(i / 2) * 2.62;
    card(s, x, y, 5.99, 2.44, { accent: i === 3 ? T.ACC : undefined });
    s.addText(name, { x: x + 0.26, y: y + 0.20, w: 5.5, h: 0.30, fontFace: MONO, fontSize: 12,
      bold: true, color: T.ACC_D, margin: 0 });
    s.addText(l1, { x: x + 0.26, y: y + 0.58, w: 5.5, h: 0.80, fontFace: SANS, fontSize: 10,
      color: T.INK, margin: 0 });
    s.addText(l2, { x: x + 0.26, y: y + 1.50, w: 5.5, h: 0.80, fontFace: SANS, fontSize: 9.5,
      italic: true, color: T.MUT, margin: 0 });
  });
})();

// ===================================================== 8 · field catalog
(function catalog() {
  const s = slideBase(); header(s, 8, "Layer 2 · the catalog", "core · extras · spec — one catalog drives everything");
  const tiers = [
    ["CORE", T.GREEN, T.GREEN_T, "required for the feature to work at all",
      "skill: name (must equal dir) · description (\u22641024)"],
    ["EXTRAS", T.AMBER, T.AMBER_T, "optional, harness-specific — each states what it unlocks",
      "claude when_to_use \u2192 richer triggers · codex openai.yaml \u2192 invocation policy"],
    ["SPEC", T.GRAY, T.GRAY_T, "defined by the original standard, beyond the minimum",
      "license · compatibility · metadata map · allowed-tools"],
  ];
  tiers.forEach(([k, c, ct, def, ex], i) => {
    const y = 1.58 + i * 1.74;
    card(s, MG, y, 5.60, 1.56);
    s.addText(k, { shape: "roundRect", rectRadius: 0.05, x: MG + 0.24, y: y + 0.22, w: 1.15, h: 0.32,
      fill: { color: ct }, line: { color: ct }, fontFace: SANS, fontSize: 9, bold: true, color: c,
      align: "center", valign: "middle", margin: 0 });
    s.addText(def, { x: MG + 1.55, y: y + 0.20, w: 3.85, h: 0.62, fontFace: SANS, fontSize: 9.5,
      bold: true, color: T.INK, margin: 0 });
    s.addText(ex, { x: MG + 0.24, y: y + 0.92, w: 5.1, h: 0.52, fontFace: MONO, fontSize: 8.5,
      color: T.MUT, margin: 0 });
  });

  const RX = MG + 5.85, RW = 6.38;
  card(s, RX, 1.58, RW, 5.18, { accent: T.ACC });
  label(s, RX + 0.26, 1.80, 5.5, "The same rows drive");
  const flows = [
    ["1", "Registration form", "core fields required — extras offered per target harness"],
    ["2", "Validation", "core_payload checked against core rows · overlay against extras rows"],
    ["3", "Emitters", "extras + overlay JSON produce the per-harness copies"],
  ];
  flows.forEach(([n, t, d], i) => {
    const y = 2.22 + i * 0.92;
    s.addText(n, { shape: "roundRect", rectRadius: 0.04, x: RX + 0.26, y: y, w: 0.34, h: 0.34,
      fill: { color: T.ACC }, line: { color: T.ACC }, fontFace: SANS, fontSize: 10, bold: true,
      color: "FFFFFF", align: "center", valign: "middle", margin: 0 });
    s.addText([
      { text: t + "\n", options: { bold: true, fontSize: 10.5, color: T.INK } },
      { text: d, options: { fontSize: 9.5, color: T.MUT } },
    ], { x: RX + 0.76, y: y - 0.04, w: RW - 1.1, h: 0.85, fontFace: SANS, margin: 0,
      lineSpacingMultiple: 1.0 });
  });
  card(s, RX + 0.26, 5.10, RW - 0.52, 1.42, { fill: T.ACC_T, line: T.ACC_T });
  s.addText("example rows", { x: RX + 0.44, y: 5.22, w: 3, h: 0.22, fontFace: SANS, fontSize: 8.5,
    bold: true, color: T.ACC_D, charSpacing: 2, margin: 0 });
  s.addText("skill · name · core · required\nskill · when_to_use · extras · claude-code\nsubagent · developer_instructions · core-in-target · codex",
    { x: RX + 0.44, y: 5.48, w: RW - 0.88, h: 0.92, fontFace: MONO, fontSize: 9, color: T.INK,
      margin: 0, lineSpacingMultiple: 1.15 });
})();

// ===================================================== 9 · setup resolution
(function resolution() {
  const s = slideBase(); header(s, 9, "Layer 2 · setup", "Most specific wins");
  card(s, MG, 1.58, 4.35, 5.18);
  label(s, MG + 0.26, 1.80, 3.6, "The ladder");
  const scopes = ["area", "functional_unit", "project", "team"];
  scopes.forEach((sc, i) => {
    const y = 2.22 + i * 0.98;
    s.addShape("roundRect", { x: MG + 0.26, y, w: 2.55, h: 0.44, rectRadius: 0.05,
      fill: { color: i === 3 ? T.ACC_T : T.CARD }, line: { color: i === 3 ? T.ACC : T.HAIR, width: 0.75 } });
    s.addText(sc, { x: MG + 0.26, y, w: 2.55, h: 0.44, fontFace: MONO, fontSize: 10.5, bold: true,
      color: i === 3 ? T.ACC_D : T.INK, align: "center", valign: "middle", margin: 0 });
    if (i < 3) arrow(s, MG + 1.53, y + 0.50, MG + 1.53, y + 0.94, T.ACC);
  });
  s.addText("roles: required · optional · forbidden\nundeclared = not used",
    { x: MG + 0.26, y: 6.14, w: 3.85, h: 0.52, fontFace: SANS, fontSize: 9.5, color: T.MUT, margin: 0 });

  const RX = MG + 4.60, RW = 7.63;
  card(s, RX, 1.58, RW, 3.42);
  label(s, RX + 0.26, 1.78, 6, "Worked example");
  kv(s, RX + 0.26, 2.16, RW - 0.52, [
    ["area · Engineering", "claude-code REQUIRED · codex OPTIONAL"],
    ["functional_unit · Backend", "inherits — adds policy posture"],
    ["project · payments-api", "+ opencode REQUIRED (repo has .opencode/)"],
    ["team · payments-core", "pi FORBIDDEN (un-gated skills surface)"],
  ], { kw: 2.45, lh: 0.52, kfs: 9, vfs: 10 });

  card(s, RX, 5.22, RW, 1.54, { accent: T.ACC, fill: T.ACC_T, line: T.ACC_T });
  label(s, RX + 0.26, 5.40, 6, "Effective for payments-core on payments-api", T.ACC_D);
  s.addText("claude-code required · codex optional · opencode required · pi forbidden",
    { x: RX + 0.26, y: 5.72, w: RW - 0.52, h: 0.34, fontFace: SANS, fontSize: 12.5, bold: true,
      color: T.INK, margin: 0 });
  s.addText("one query: v_effective_setup — no defaults duplicated per project",
    { x: RX + 0.26, y: 6.14, w: RW - 0.52, h: 0.30, fontFace: MONO, fontSize: 9, color: T.ACC_D, margin: 0 });
})();

// ===================================================== 10 · artifact registry
(function artifact() {
  const s = slideBase(); header(s, 10, "Layer 2 · registry", "Register once — metadata in the database, files in git/npm");
  card(s, MG, 1.58, 5.99, 5.18, { accent: T.ACC });
  s.addText("artifact", { x: MG + 0.28, y: 1.80, w: 4, h: 0.30, fontFace: MONO, fontSize: 12,
    bold: true, color: T.ACC_D, margin: 0 });
  kv(s, MG + 0.28, 2.24, 5.45, [
    ["urn", "io.github.<owner>/<name> — one row per version"],
    ["surface · owner", "the matrix row · owning team and/or project"],
    ["version seal", "semver · content_sha256 · immutable · supersedes"],
    ["core_payload", "JSONB — validated against CORE field rows"],
    ["requires", "runtime · mcp · network · shell (drives policy)"],
    ["status · tier", "draft \u2192 published \u2192 deprecated · standard | review"],
  ], { lh: 0.56, kfs: 9, vfs: 9.5 });

  const RX = MG + 6.24, RW = 5.99;
  card(s, RX, 1.58, RW, 5.18, { accent: T.ACC });
  s.addText("artifact_harness_target", { x: RX + 0.28, y: 1.80, w: 5.4, h: 0.30, fontFace: MONO,
    fontSize: 12, bold: true, color: T.ACC_D, margin: 0 });
  kv(s, RX + 0.28, 2.24, 5.45, [
    ["support", "from harness_surface_capability — never assumed"],
    ["install_*", "method · target · command — the concrete drop"],
    ["overlay", "JSONB — validated against EXTRAS rows"],
  ], { lh: 0.56, kfs: 9, vfs: 9.5 });
  card(s, RX + 0.28, 4.30, RW - 0.56, 1.20, { fill: T.GREEN_T, line: T.GREEN_T });
  s.addText("A copy-verdict artifact ships an EMPTY overlay and still works — extras are never required for core features.",
    { x: RX + 0.46, y: 4.50, w: RW - 0.92, h: 0.85, fontFace: SANS, fontSize: 10.5, bold: true,
      color: T.INK, margin: 0 });
  s.addText("sources[] point at git/npm with hashes — the database never hosts code.",
    { x: RX + 0.28, y: 5.90, w: RW - 0.56, h: 0.60, fontFace: SANS, fontSize: 9.5, italic: true,
      color: T.MUT, margin: 0 });
})();

// ===================================================== 11 · registration lifecycle
(function lifecycle() {
  const s = slideBase(); header(s, 11, "Layer 2 · usage", "From required to pinned");
  const stages = [
    ["REQUIRED", "the project declares the need", T.GRAY, T.GRAY_T],
    ["APPROVED", "a human accepts the trust disclosure", T.AMBER, T.AMBER_T],
    ["INSTALLED", "the drop ran — recorded who & when", T.ACC, T.ACC_T],
    ["PINNED", "locked to an exact version", T.ACC_D, T.ACC_T],
    ["RETIRED", "out of the effective set, kept for audit", T.GRAY, T.GRAY_T],
  ];
  const bw = 2.20, gap = 0.30, x0 = MG, y0 = 1.78;
  stages.forEach(([k, d, c, ct], i) => {
    const x = x0 + i * (bw + gap);
    card(s, x, y0, bw, 1.30, { accent: c });
    s.addText(k, { x: x + 0.16, y: y0 + 0.16, w: bw - 0.32, h: 0.26, fontFace: SANS, fontSize: 10.5,
      bold: true, color: c, margin: 0 });
    s.addText(d, { x: x + 0.16, y: y0 + 0.48, w: bw - 0.32, h: 0.72, fontFace: SANS, fontSize: 9,
      color: T.MUT, margin: 0 });
    if (i < 4) arrow(s, x + bw + 0.02, y0 + 0.65, x + bw + gap - 0.02, y0 + 0.65, T.MUT);
  });
  s.addText("RETIRED branches off after any stage — the row is never deleted.", { x: MG, y: 3.28,
    w: CW, h: 0.26, fontFace: SANS, fontSize: 9.5, italic: true, color: T.MUT, margin: 0 });

  card(s, MG, 3.86, CW, 2.90, { accent: T.ACC });
  label(s, MG + 0.28, 4.08, 8, "v_lockfile_export — one line per project × artifact × harness");
  card(s, MG + 0.28, 4.48, CW - 0.56, 1.10, { fill: "F4F5F7", line: "F4F5F7" });
  s.addText("io.github.acme/pdf-report-writer · 1.4.2 · 9f2c41\u2026\n  claude-code \u2192 copy-dir \u2192 ~/.claude/skills/pdf-report-writer/\n  codex \u2192 copy-dir \u2192 ~/.agents/skills/pdf-report-writer/",
    { x: MG + 0.46, y: 4.62, w: CW - 0.92, h: 0.85, fontFace: MONO, fontSize: 10, color: T.INK,
      margin: 0, lineSpacingMultiple: 1.15 });
  bullets(s, MG + 0.28, 5.80, CW - 0.56, [
    "harness_id NULL = every target of the artifact — the export fans out to one line each",
    "the lockfile no harness ships: urn \u2192 version \u2192 sha256 \u2192 per-harness targets",
  ], { fs: 10.5, lh: 0.40 });
})();

// ===================================================== 12 · ER + four questions
(function erQuestions() {
  const s = slideBase(); header(s, 12, "Layer 2 · the whole picture", "The entity map — and the four questions it answers");
  const LW = 8.0;
  card(s, MG, 1.58, LW, 1.55, { line: T.HAIR });
  label(s, MG + 0.24, 1.74, 5, "Your database (stubs)", T.MUT);
  const yours = ["area", "functional_unit", "team", "team_project", "project"];
  yours.forEach((t, i) => {
    const x = MG + 0.24 + i * 1.52;
    s.addText(t, { shape: "roundRect", rectRadius: 0.04, x, y: 2.10, w: 1.40, h: 0.40,
      fill: { color: T.GRAY_T }, line: { color: T.GRAY_T }, fontFace: MONO, fontSize: 8.5,
      bold: true, color: T.GRAY, align: "center", valign: "middle", margin: 0 });
  });
  s.addText("join points only — ids assumed", { x: MG + 0.24, y: 2.66, w: 5, h: 0.24,
    fontFace: SANS, fontSize: 8.5, italic: true, color: T.MUT, margin: 0 });

  card(s, MG, 3.32, LW, 3.44, { line: T.ACC });
  label(s, MG + 0.24, 3.48, 6, "Registry extension (new tables)");
  const news = [
    ["harness", "surface", "surface_field", "harness_surface_capability"],
    ["agentic_setup", "setup_harness", "artifact", "artifact_harness_target"],
    ["feature_registration", "—", "—", "—"],
  ];
  news.forEach((row, r) => row.forEach((t, i) => {
    if (t === "—") return;
    const x = MG + 0.24 + i * 1.90, y = 3.84 + r * 0.72;
    s.addText(t, { shape: "roundRect", rectRadius: 0.04, x, y, w: 1.78, h: 0.48,
      fill: { color: T.ACC_T }, line: { color: T.ACC_T }, fontFace: MONO, fontSize: 8,
      bold: true, color: T.ACC_D, align: "center", valign: "middle", margin: 0 });
  }));
  s.addText("scope_id (polymorphic: area | fu | project | team) \u2192 agentic_setup · artifact \u2192 surface · registration \u2192 project + artifact + harness?",
    { x: MG + 0.24, y: 6.28, w: LW - 0.48, h: 0.40, fontFace: MONO, fontSize: 8.5, color: T.MUT, margin: 0 });

  const RX = MG + 8.25, RW = 3.98;
  card(s, RX, 1.58, RW, 5.18, { accent: T.ACC });
  label(s, RX + 0.24, 1.78, 3.4, "The four questions");
  const qs = [
    ["Which setup does a project need?", "v_effective_setup"],
    ["What can it actually use?", "harnesses \u27e1 capability (\u2260 no_surface)"],
    ["Register a feature?", "artifact + targets (catalog-validated)"],
    ["What is installed where?", "registrations + v_lockfile_export"],
  ];
  qs.forEach(([q, a], i) => {
    const y = 2.20 + i * 1.10;
    s.addText(`${i + 1}. ${q}`, { x: RX + 0.24, y, w: RW - 0.48, h: 0.52, fontFace: SANS,
      fontSize: 10.5, bold: true, color: T.INK, margin: 0 });
    s.addText(a, { x: RX + 0.44, y: y + 0.52, w: RW - 0.68, h: 0.30, fontFace: MONO, fontSize: 8.5,
      color: T.ACC_D, margin: 0 });
  });
})();

// ===================================================== 13 · feature-doc pattern
(function featurePattern() {
  const s = slideBase(); header(s, 13, "The feature docs", "Every feature doc, one pattern — skills as the example");
  const cols = [
    ["CORE", T.GREEN, T.GREEN_T, [
      ["name", "[a-z0-9-] \u226464 — must equal dir name"],
      ["description", "\u22641024 chars — \u201cwhat + when\u201d"],
      ["\u2192 works in all four harnesses unchanged", ""],
    ]],
    ["EXTRAS", T.AMBER, T.AMBER_T, [
      ["claude-code", "when_to_use · argument-hint · context: fork"],
      ["codex", "agents/openai.yaml — policy, branding"],
      ["opencode", "metadata autoinvoke — hide from list"],
    ]],
    ["SPEC", T.GRAY, T.GRAY_T, [
      ["license", "name or bundled file"],
      ["compatibility", "environment needs, 1\u2013500"],
      ["metadata · allowed-tools", "extension map · experimental"],
    ]],
  ];
  cols.forEach(([k, c, ct, rows], i) => {
    const x = MG + i * 4.145, w = 3.94;
    card(s, x, 1.58, w, 3.95, { accent: c });
    s.addText(k, { shape: "roundRect", rectRadius: 0.05, x: x + 0.24, y: 1.80, w: 1.30, h: 0.34,
      fill: { color: ct }, line: { color: ct }, fontFace: SANS, fontSize: 9.5, bold: true, color: c,
      align: "center", valign: "middle", margin: 0 });
    rows.forEach(([a, b], j) => {
      const y = 2.36 + j * 0.94;
      s.addText(a, { x: x + 0.24, y, w: w - 0.48, h: 0.26, fontFace: MONO, fontSize: 9.5,
        bold: true, color: T.INK, margin: 0 });
      if (b) s.addText(b, { x: x + 0.24, y: y + 0.28, w: w - 0.48, h: 0.55, fontFace: SANS,
        fontSize: 9.5, color: T.MUT, margin: 0 });
    });
  });
  card(s, MG, 5.76, CW, 1.0, { fill: T.ACC_T, line: T.ACC_T });
  s.addText("10 docs × (minimum core \u2192 exact per-harness transforms \u2192 registry notes \u2192 original-spec appendix)  ·  docs/data-model/features/",
    { x: MG + 0.28, y: 6.08, w: CW - 0.56, h: 0.34, fontFace: SANS, fontSize: 11, bold: true,
      color: T.INK, margin: 0 });
})();

// ===================================================== 14 · closer
(function closer() {
  const s = slideBase(); header(s, 14, "Status", "Verified, delivered — and one flagged follow-up");
  card(s, MG, 1.58, 5.99, 5.18, { accent: T.ACC });
  label(s, MG + 0.28, 1.80, 5, "Re-verified against live docs · 2026-10-21");
  bullets(s, MG + 0.28, 2.22, 5.45, [
    { b: "OpenCode v2: ", t: "Plugin.define · ctx.tool.hook veto via Tool.Error · JSON-Schema tools (no Zod) · opencode/slash gone · commands map · .env \u2192 ask" },
    { b: "Pi: ", t: "tool_call fires before execution — {block, reason} vetoes · registerTool TypeBox + exposure modes" },
  ], { fs: 10, lh: 0.98, gap: 0.98 });
  s.addText("These correct the 2026-10-16 corpus — all data-model docs reflect them.",
    { x: MG + 0.28, y: 4.60, w: 5.45, h: 0.55, fontFace: SANS, fontSize: 9.5, italic: true, color: T.MUT, margin: 0 });
  card(s, MG + 0.28, 5.30, 5.43, 1.16, { fill: T.AMBER_T, line: T.AMBER_T });
  s.addText("Flagged: the registry-guide deck's content JSONs still carry v1 shapes for OpenCode hooks/tools.",
    { x: MG + 0.46, y: 5.48, w: 5.05, h: 0.85, fontFace: SANS, fontSize: 10, bold: true, color: T.AMBER, margin: 0 });

  const RX = MG + 6.24, RW = 5.99;
  card(s, RX, 1.58, RW, 2.50);
  label(s, RX + 0.26, 1.78, 4, "Delivered", T.GREEN);
  bullets(s, RX + 0.26, 2.18, RW - 0.52, [
    "docs/data-model/ — index · org model · Postgres schema (14 tables, 2 views)",
    "features/ ×10 — core \u2192 transforms \u2192 original-spec appendix",
    "this deck — data-model.pptx",
  ], { fs: 10, lh: 0.42, marker: T.GREEN });

  card(s, RX, 4.28, RW, 2.48, { accent: T.ACC });
  label(s, RX + 0.26, 4.48, 4, "Next");
  bullets(s, RX + 0.26, 4.88, RW - 0.52, [
    "seed the full surface_field catalog from the feature docs",
    "optional JSON Schemas for API validation",
    "revise registry-guide content JSONs to the verified v2 facts",
  ], { fs: 10, lh: 0.42 });

  s.addText("nano-super-slides-v5 · data-model.pptx · 2026-10-21", { x: MG, y: 6.86, w: 8, h: 0.24,
    fontFace: MONO, fontSize: 9, color: T.MUT, margin: 0 });
})();

// ---------------------------------------------------------------- write
pres.writeFile({ fileName: "data-model.pptx" })
  .then(() => console.log("WROTE data-model.pptx"))
  .catch(e => { console.error(e); process.exit(1); });
