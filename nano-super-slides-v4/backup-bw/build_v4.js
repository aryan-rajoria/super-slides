/* nano-super v4 — "The Unified Agent Registry" research deck (13 slides).
 * Static only: no VBA, no engine, no macros. Visually continues the v3
 * "coffee-quest compact" house style (CONTRACT-COMPACT.md + ADDENDUM):
 *   - 13.333 x 7.5 in LAYOUT_WIDE, bg F7F6F2, ink 1B1D22, grays 5C6068/9AA0AB
 *   - kickers/titles/counters are PIXEL-FONT bitmap PNGs (5x7 font, 3 px/cell,
 *     ink) from assets\text — reusing gen_catalog.py's renderer via
 *     gen_sprites_v4.py; small native text = Consolas (mono) only
 *   - DASHED GROUND LINE on every slide: 1-cell-tall ink rectangles, dash 6
 *     cells / gap 4 cells, flush with the bottom edge (cell = 0.75 pt);
 *     figures stand 1 cell above it; bottom-left bitmap "SLIDE n/13"
 *   - tables/diagrams stay in the pixel/mono language: Consolas 8-10 rows,
 *     ink rules as 1-cell rectangles, dotted leaders as 1-cell dash rects,
 *     no pptx table chrome, no fills except ink/gray marks
 *   - 1-bit discipline: color ONLY on the closer's coffee machine + chest
 *
 * BUILD ORDER (sprites MUST exist first):
 *   1. ..\.venv\Scripts\python gen_sprites_v4.py   -> assets\ + manifest_v4.json
 *   2. $env:NODE_PATH=(npm root -g); node build_v4.js
 * All placements are explicit inches; every shape carries an objectName.
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");

let MAN;
try {
  MAN = JSON.parse(fs.readFileSync("assets/manifest_v4.json", "utf8"));
} catch (e) {
  throw new Error("assets/manifest_v4.json missing or unreadable — run gen_sprites_v4.py first");
}

// ---------- palette (v3 compact) ----------
const P = {
  BG: "F7F6F2", INK: "1B1D22", MUT: "5C6068", GRAY: "9AA0AB",
};
const W = 13.333, H = 7.5, MG = 0.55;
const MONO = "Consolas";
const C = 0.75 / 72;               // world cell -> inches (1 px = 0.75 pt)
const GROUND = H - C;              // feet line on dashed slides (v3 contract)
const CW = (pt) => pt * 0.55 / 72; // Consolas advance width estimate (in)

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "aryan-rajoria";
pres.title = "The Unified Agent Registry — nano-super v4";

// ---------- helpers ----------
function mget(set, name) {
  return MAN[`${set}/${name}`] || MAN[`${set}/${name}.png`];
}
function rect(s, x, y, w, h, fill, objectName) {
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h, fill: { color: fill }, line: { type: "none" }, objectName,
  });
}
function voxel(s, tag) {                    // ink voxel triad, top-right (v3)
  const z = 0.14, x = 12.18, y = 0.42;
  rect(s, x, y, z, z, P.INK, `${tag}_vx1`);
  rect(s, x + z + 0.03, y, z, z, P.MUT, `${tag}_vx2`);
  rect(s, x, y + z + 0.03, z, z, P.GRAY, `${tag}_vx3`);
}
function txt(s, t, o) {
  s.addText(t, Object.assign({ fontFace: MONO, color: P.INK, margin: 0, align: "left", valign: "top" }, o));
}
function imgText(s, name, x, y, h, objectName) {   // bitmap text, fixed h, manifest aspect
  const m = mget("text", name);
  if (!m) throw new Error(`manifest missing text/${name}`);
  const w = h * (m.w / m.h);
  s.addImage({ path: `assets/text/${name}.png`, x, y, w, h, objectName });
  return w;
}
function imgA(s, set, name, x, h, objectName, bottom) { // fixed h, aspect width, bottom-anchored
  const m = mget(set, name);
  if (!m) throw new Error(`manifest missing ${set}/${name}`);
  const w = h * (m.w / m.h);
  const y = (bottom == null ? GROUND : bottom) - h;
  s.addImage({ path: `assets/${set}/${name}.png`, x, y, w, h, objectName });
  return { w, y };
}

// ---------- v3 house header: voxel + bitmap kicker/title + native spec ----------
function header(s, n, kicker, title, spec, spec2) {
  s.background = { color: P.BG };
  voxel(s, `s${n}`);
  imgText(s, kicker, MG, 0.44, 0.22, `s${n}_kick`);
  const tm = mget("text", title);                   // auto-fit from real cell width
  if (!tm) throw new Error(`manifest missing text/${title}`);
  const th = Math.min(0.52, (11.2 * tm.h) / tm.w);  // keep clear of the voxel
  imgText(s, title, MG, 0.72, th, `s${n}_title`);
  txt(s, spec, { x: MG, y: 1.40, w: 12.2, h: 0.26, fontSize: 10.5, color: P.MUT, objectName: `s${n}_spec` });
  if (spec2) txt(s, spec2, { x: MG, y: 1.68, w: 12.2, h: 0.22, fontSize: 9, color: P.GRAY, objectName: `s${n}_spec2` });
}

// ---------- dashed ground line + bitmap slide counter (v3 contract) ----------
function ground(s, n) {
  let i = 1;
  for (let x = 0; x < W; x += 10 * C, i++) {
    rect(s, x, H - C, 6 * C, C, P.INK, `s${n}_dash${i}`);
  }
  imgText(s, `vs${String(n).padStart(2, "0")}`, 0.167, GROUND - 2 * C - 0.19, 0.19, `s${n}_score`);
}

// ---------- group header: bold 8 gray label + 1-cell ink rule ----------
function groupHead(s, tag, x, y, w, label) {
  txt(s, label, { x, y, w, h: 0.17, fontSize: 8, bold: true, color: P.MUT, objectName: `${tag}_h` });
  rect(s, x, y + 0.19, w, C, P.INK, `${tag}_hr`);
}

// ---------- kv rows with dotted leaders (1-cell dash rects) ----------
function kv(s, tag, x, y, w, rows, o = {}) {
  const fs = o.fontSize || 9, rh = o.rowH || 0.27;
  rows.forEach((r, i) => {
    const ry = y + i * rh;
    txt(s, r.k, { x, y: ry, w: 2.6, h: rh, fontSize: fs, bold: true, color: r.kc || P.INK, valign: "middle", objectName: `${tag}_k${i}` });
    txt(s, r.v, { x: x + 2.6, y: ry, w: w - 2.6, h: rh, fontSize: fs, color: r.vc || P.INK, align: "right", valign: "middle", objectName: `${tag}_v${i}` });
    // dotted leader between key end and value start
    const kEnd = x + r.k.length * CW(fs) + 0.08;
    const vStart = x + w - r.v.length * CW(fs) - 0.10;
    if (vStart - kEnd > 0.15) {
      const cy = ry + rh / 2 - C / 2;
      let d = 0;
      for (let dx = kEnd; dx + 2 * C <= vStart; dx += 4 * C, d++) {
        rect(s, dx, cy, 2 * C, C, P.GRAY, `${tag}_d${i}_${d}`);
      }
    }
  });
  return y + rows.length * rh;
}

// ---------- column matrix: header rule + rows + gray row rules ----------
function matrix(s, tag, x, y, cols, rows, o = {}) {
  const fs = o.fontSize || 8, rh = o.rowH || 0.34;
  cols.forEach((c, i) => {
    txt(s, c.label, { x: x + c.x, y, w: c.w, h: 0.18, fontSize: fs, bold: true, color: P.MUT, objectName: `${tag}_ch${i}` });
  });
  rect(s, x, y + 0.20, cols[cols.length - 1].x + cols[cols.length - 1].w, C, P.INK, `${tag}_hrule`);
  rows.forEach((r, ri) => {
    const ry = y + 0.24 + ri * rh;
    cols.forEach((c, ci) => {
      const cell = r[ci];
      txt(s, cell, {
        x: x + c.x, y: ry, w: c.w, h: rh, fontSize: fs, bold: ci === 0,
        color: ci === 0 ? P.INK : (o.mutCols && o.mutCols.includes(ci) ? P.MUT : P.INK),
        valign: "middle", objectName: `${tag}_r${ri}c${ci}`,
      });
    });
    if (ri < rows.length - 1) {
      rect(s, x, y + 0.24 + (ri + 1) * rh - 0.02, cols[cols.length - 1].x + cols[cols.length - 1].w, C / 2, P.GRAY, `${tag}_rr${ri}`);
    }
  });
  return y + 0.24 + rows.length * rh;
}

// ---------- numbered ladder (security slide): ink squares + connectors ----------
function ladder(s, tag, x, y, steps, o = {}) {
  const sh = o.stepH || 0.44, sq = 0.17;
  steps.forEach((t, i) => {
    const sy = y + i * sh;
    rect(s, x, sy + 0.03, sq, sq, P.INK, `${tag}_sq${i}`);
    txt(s, String(i + 1), { x, y: sy + 0.035, w: sq, h: sq - 0.01, fontSize: 7.5, bold: true, color: P.BG, align: "center", valign: "middle", objectName: `${tag}_n${i}` });
    txt(s, t, { x: x + sq + 0.12, y: sy, w: o.w - sq - 0.12, h: sh, fontSize: 8.5, valign: "middle", objectName: `${tag}_t${i}` });
    if (i < steps.length - 1) rect(s, x + sq / 2 - C / 2, sy + sq + 0.03, C, sh - sq - 0.03, P.INK, `${tag}_cn${i}`);
  });
  return y + steps.length * sh;
}

// ---------- flow band: bold node words with ink bars + gray arrows ----------
function flow(s, tag, x, y, nodes) {
  let cx = x;
  nodes.forEach((nd, i) => {
    const w = nd.length * CW(10);
    txt(s, nd, { x: cx, y, w, h: 0.2, fontSize: 10, bold: true, objectName: `${tag}_f${i}` });
    rect(s, cx, y + 0.23, w, 3 * C, P.INK, `${tag}_fb${i}`);
    cx += w + 0.1;
    if (i < nodes.length - 1) {
      txt(s, "→", { x: cx, y, w: 0.2, h: 0.2, fontSize: 10, color: P.MUT, objectName: `${tag}_fa${i}` });
      cx += 0.24;
    }
  });
}

// ---------- multi-line native text block ----------
function lines(s, tag, x, y, w, ls, o = {}) {
  txt(s, ls.join("\n"), Object.assign({ x, y, w, h: 0.2 * ls.length + 0.05, fontSize: o.fontSize || 9, color: o.color || P.MUT, objectName: tag }, o));
}

// ---------- harness figure (right column, feet on GROUND) + variant label ----------
function figure(s, n, name, label) {
  const f = imgA(s, "figures", name, 11.62, 0.5, `s${n}_fig`);
  txt(s, label, { x: 11.245, y: f.y - 0.21, w: 1.15, h: 0.16, fontSize: 7.5, bold: true, color: P.MUT, align: "center", objectName: `s${n}_figlab` });
}

// ---------- preflight ----------
const NEED = [];
for (let i = 1; i <= 13; i++) {
  NEED.push(["text", `vk${String(i).padStart(2, "0")}`], ["text", `vt${String(i).padStart(2, "0")}`], ["text", `vs${String(i).padStart(2, "0")}`]);
}
["fg_runner", "fg_claude", "fg_codex", "fg_opencode", "fg_pi", "fg_runner_idle"].forEach((f) => NEED.push(["figures", f]));
["machine_done", "chest"].forEach((f) => NEED.push(["finale", f]));
NEED.push(["text", "vbanner"]);
const MISS = NEED.filter(([set, name]) => !mget(set, name) || !fs.existsSync(`assets/${set}/${name}.png`));
if (MISS.length) throw new Error(`v4 assets not ready, missing: ${MISS.map(([s, n]) => `${s}/${n}`).join(", ")}`);

/* =============================== SLIDE 1 — TITLE =============================== */
{
  const s = pres.addSlide();
  header(s, 1, "vk01", "vt01",
    "register once → claude code · codex · opencode · pi — one verified index, every agent",
    "sources: 8-file corpus — claude-code · codex · opencode · pi · cross-spec-standards · prior-art-registries · security-trust-model · design (all verified 2026-10-16)");
  // parade on the ground line: r02 runner leads the four harness figures
  const r = imgA(s, "figures", "fg_runner", 7.6, 0.55, "s1_runner");
  txt(s, "R02 RUNNER", { x: 7.45, y: r.y - 0.21, w: 0.95, h: 0.16, fontSize: 7.5, bold: true, color: P.MUT, align: "center", objectName: "s1_runlab" });
  const cast = [["fg_claude", "CLAUDE", 8.85], ["fg_codex", "CODEX", 9.85], ["fg_opencode", "OPENCODE", 10.85], ["fg_pi", "PI", 11.85]];
  cast.forEach(([f, lab, x], i) => {
    const p = imgA(s, "figures", f, x, 0.5, `s1_fig${i}`);
    txt(s, lab, { x: x - 0.25, y: p.y - 0.21, w: 0.9, h: 0.16, fontSize: 7.5, bold: true, color: P.MUT, align: "center", objectName: `s1_figlab${i}` });
  });
  // left column: what/why mini-rows
  groupHead(s, "s1_what", MG, 1.95, 6.3, "THE THESIS");
  kv(s, "s1_th", MG, 2.22, 6.3, [
    { k: "one record", v: "skill · mcp · agent · command · hook · theme" },
    { k: "four targets", v: "claude code · codex · opencode · pi" },
    { k: "trust built in", v: "verify namespace → scan → seal → lock" },
    { k: "whitespace", v: "verified 2026-10-16 — nobody does this" },
  ], { rowH: 0.30 });
  ground(s, 1);
  s.addNotes("Title. Thesis: register a coding-agent artifact once, target all four harnesses. All numbers from the 8-file verified corpus (2026-10-16). Cast: r02 stick-dash runner + the four harness figures (antenna/visor/satchel/package).");
}

/* ============================ SLIDE 2 — THE PROBLEM ============================ */
{
  const s = pres.addSlide();
  header(s, 2, "vk02", "vt02",
    "4 coding harnesses × 6+ artifact types × distinct paths, manifests and clis — same job, a different answer in every cell");
  const X = MG, colsw = 11.5;
  matrix(s, "s2", X, 1.86, [
    { label: "TYPE", x: 0, w: 2.5 },
    { label: "CLAUDE CODE", x: 2.5, w: 2.35 },
    { label: "CODEX", x: 4.85, w: 2.35 },
    { label: "OPENCODE", x: 7.2, w: 2.35 },
    { label: "PI", x: 9.55, w: 1.95 },
  ], [
    ["SKILLS", ".claude/skills/", ".agents/skills/", ".opencode+.agents+.claude", "~/.agents/skills"],
    ["MCP SERVERS", "~/.claude.json mcpServers", "[mcp_servers] config.toml", "mcp.servers.<n> (v2 json)", "mcp.json claude-shape"],
    ["SUBAGENTS", ".claude/agents/*.md", ".codex/agents/*.toml", ".opencode/agents/*.md", ".pi/agents + example ext"],
    ["HOOKS", "settings hooks · 30+ events", "hooks.json · 12 events", "ts plugin (adapter)", "ts extension (adapter)"],
    ["COMMANDS", ".claude/commands legacy", "~/.codex/prompts deprecated", ".opencode/commands", "~/.pi/agent/prompts"],
    ["THEMES", "plugin themes/*.json", "n/a — no surface", ".opencode/themes", "~/.pi/agent/themes"],
  ], { rowH: 0.33 });
  txt(s, `"the spec unified us, the paths divided us" — community, jan 2026`, { x: X, y: 4.62, w: colsw, h: 0.24, fontSize: 10, color: P.MUT, objectName: "s2_quote" });
  txt(s, `4 × 6 = 24 surfaces · 0 registries cover them — whitespace verified 2026-10-16`, { x: X, y: 4.96, w: colsw, h: 0.26, fontSize: 10.5, bold: true, objectName: "s2_gap" });
  lines(s, "s2_cost", X, 5.36, colsw, [
    "fragmentation cost: one publisher writes 4 manifests, 4 install paths, 4 trust models for every artifact;",
    "every consumer re-derives what is safe to install. nothing registers all types across all four (prior-art scan, 2026-10-16).",
  ], { fontSize: 9, color: P.GRAY });
  ground(s, 2);
  s.addNotes("The fragmentation matrix: artifact type x harness -> where it lives. No unified registry exists (verified whitespace). Quote from the .agents/ convention debate.");
}

/* ========================= SLIDES 3-6 — HARNESS SURVEY ========================= */
function harnessSlide(n, kick, title, spec, idRows, surfRows, surprise, figName, figLabel, noteTxt) {
  const s = pres.addSlide();
  header(s, n, kick, title, spec);
  groupHead(s, `s${n}_id`, MG, 1.80, 10.7, "ID CARD");
  let y = kv(s, `s${n}_idkv`, MG, 2.04, 10.7, idRows, { rowH: 0.26 });
  groupHead(s, `s${n}_sf`, MG, y + 0.16, 10.7, "REGISTRY SURFACES");
  y = kv(s, `s${n}_sfkv`, MG, y + 0.40, 10.7, surfRows, { rowH: 0.26 });
  groupHead(s, `s${n}_sp`, MG, y + 0.16, 10.7, "SURPRISE");
  lines(s, `s${n}_spt`, MG, y + 0.40, 10.7, surprise, { fontSize: 9, color: P.MUT });
  figure(s, n, figName, figLabel);
  ground(s, n);
  s.addNotes(noteTxt);
}

harnessSlide(3, "vk03", "vt03",
  "anthropic · npm @anthropic-ai/claude-code · richest surface of the four — and the only one with plugin marketplaces",
  [
    { k: "vendor", v: "anthropic" },
    { k: "version", v: "v2.1.302 (npm latest, 2026-10-16)" },
    { k: "config root", v: "~/.claude/ (settings.json + ~/.claude.json)" },
    { k: "bundle", v: "own format — .claude-plugin/plugin.json" },
  ],
  [
    { k: "skills", v: "~/.claude/skills/<n>/ · .claude/skills/" },
    { k: "subagents", v: ".claude/agents/*.md — yaml frontmatter" },
    { k: "hooks", v: "settings hooks — 30+ events, all scopes merge" },
    { k: "plugins", v: ".claude-plugin/plugin.json + marketplace.json" },
    { k: "install", v: "claude plugin install <n>@<mp> --json -y" },
  ],
  [
    "marketplaces are git repos — 7 source kinds (github / url / git-subdir / npm / archive / command), no hosted api.",
    "npm source: install scripts never run — the safe channel for npm-hosted claude payloads.",
  ],
  "fg_claude", "ANTENNA",
  "Claude Code v2.1.302. Richest surface. Programmatic registry path = publish a git repo with .claude-plugin/marketplace.json; claude plugin list --available --json is machine-readable.");

harnessSlide(4, "vk04", "vt04",
  "openai · rust binary, apache-2.0, ~130k stars · toml config, agents.md native — and the trust-gated one",
  [
    { k: "vendor", v: "openai" },
    { k: "version", v: "rust-v0.163.0 (stable 2026-10-15)" },
    { k: "config root", v: "~/.codex/ (config.toml — toml everywhere)" },
    { k: "bundle", v: "agent-plugins 1.0.0 — only consumer of our 4" },
  ],
  [
    { k: "skills", v: ".agents/skills · ~/.agents/skills (symlinks ok)" },
    { k: "mcp", v: "[mcp_servers.<id>] — codex mcp add <name>" },
    { k: "plugins", v: "plugin.json + .codex-plugin/ + extensions.com.openai" },
    { k: "marketplace", v: ".agents/plugins/marketplace.json (4 source kinds)" },
    { k: "subagents", v: ".codex/agents/*.toml — name, description, instr." },
  ],
  [
    `hooks.json is claude-shape compatible (12 events, honors CLAUDE_PLUGIN_ROOT) — and project .codex/ layers stay`,
    `inert until [projects."<path>"] trust_level = "trusted"; plugin hooks wait for explicit user review.`,
  ],
  "fg_codex", "VISOR",
  "Codex rust-v0.163.0. Adopted Agent Skills + agent-plugins. Strongest hook discipline: plugin hooks skipped until reviewed; plugins with hooks barred from the public directory.");

harnessSlide(5, "vk05", "vt05",
  "anomaly (ex-sst) · ~214k stars · reads three skill dirs natively — and ships the most registry-ready surface of all four",
  [
    { k: "vendor", v: "anomaly (ex-sst; charm fork renamed jan 2026)" },
    { k: "version", v: "2.0.x (v2.0.32, 2026-10-16)" },
    { k: "config root", v: "opencode.json / .opencode/ (jsonc)" },
    { k: "bundle", v: "no bundle — npm ts plugins (v1/v2 break)" },
  ],
  [
    { k: "skills", v: ".opencode/skills · .agents/skills · .claude/skills" },
    { k: "catalog", v: "config skills: [url] → index.json (v2 http)" },
    { k: "plugins", v: "opencode plugin add pkg@ver (npm · git · path)" },
    { k: "mcp", v: "opencode mcp add <n> --scope user|project" },
    { k: "themes", v: ".opencode/themes/<n>.json (filename = name)" },
  ],
  [
    "v1 plugins do not work in 2.0 (mcp.<n> vs mcp.servers.<n>, plugin vs plugins) — emitters must sniff versions.",
    "no official marketplace: aggregators ocx, awesome-opencode and opencode.cafe fill the gap.",
  ],
  "fg_opencode", "SATCHEL",
  "OpenCode 2.0.x. The v2 HTTP skills catalog (index.json, versioned cache) is a pull-based, file-level registry protocol — any static host is a registry. This is the surface agentreg emits to.");

harnessSlide(6, "vk06", "vt06",
  "earendil-works (mario zechner, co-maint armin ronacher) · minimal core — extensions replace plugins, hooks and tools",
  [
    { k: "vendor", v: "earendil-works (mario zechner + ronacher)" },
    { k: "version", v: "1.3.0 (2026-10-15)" },
    { k: "config root", v: "~/.pi/agent/ (skills, extensions, mcp.json)" },
    { k: "bundle", v: "no bundle — npm package + pi key" },
  ],
  [
    { k: "skills", v: "~/.pi/agent/skills · ~/.agents/skills" },
    { k: "extensions", v: "ts in-process — tools, commands, hooks, providers" },
    { k: "packages", v: "package.json + pi key + keyword pi-package" },
    { k: "install", v: "pi install npm:@scope/pkg@1.0.0 (exact pin)" },
    { k: "gallery", v: "pi.dev/packages — 5,361 (2026-10-16)" },
  ],
  [
    "npm IS the registry — zero-friction publishing, top package 1.6M downloads/mo; but .agents/skills ancestors load",
    "un-gated (verified in source) and 0.19's ~/.claude + ~/.codex readers were dropped when .agents landed (0.54.0).",
  ],
  "fg_pi", "PACKAGE",
  "Pi 1.3.0. The cleanest 'don't build a registry' precedent: pi.dev/packages is an npm index. Registry publishes content-only packages (no scripts) to kill the npm postinstall surface.");

/* ========================= SLIDE 7 — STANDARDS LAYER ========================== */
{
  const s = pres.addSlide();
  header(s, 7, "vk07", "vt07",
    "two bundle specs, no shared steward — anthropic's formats (SKILL.md, mcp.json) live inside agent plugins, yet claude code consumes neither");
  const X = MG, Wd = 11.5;
  groupHead(s, "s7_g1", X, 1.80, Wd, "AGENT SKILLS — AGENTSKILLS.IO");
  kv(s, "s7_kv1", X, 2.04, Wd, [
    { k: "fields", v: "6 total · 2 required (name, description) · metadata map = extension channel" },
    { k: "versioning", v: "unversioned living spec — zero tags · anthropic-donated 2025-12-16" },
    { k: "clients", v: "46 showcased (counted 2026-10-16) — all four harnesses on the list" },
  ], { rowH: 0.26 });
  groupHead(s, "s7_g2", X, 3.12, Wd, "AGENT PLUGINS — AGENT-PLUGINS.ORG");
  kv(s, "s7_kv2", X, 3.36, Wd, [
    { k: "version", v: "v1.0.0 · 2026-08-06 · closed 9-field plugin.json · skills + mcp only" },
    { k: "tsc", v: "amazon · cursor · microsoft · openai · vercel — anthropic absent" },
    { k: "adoption", v: "9 compatible clients — of our four, only codex" },
  ], { rowH: 0.26 });
  groupHead(s, "s7_g3", X, 4.44, Wd, "ADJACENT STANDARDS");
  kv(s, "s7_kv3", X, 4.68, Wd, [
    { k: "agents.md", v: "linux foundation aaif (mcp + agents.md donated 2025-12-09)" },
    { k: "mcp registry", v: "preview · metadata-only server.json · ~9,652 servers · openapi federation" },
    { k: ".agents/ dir", v: "unratified — claude declined: issue #66352 not_planned 2026-07-16" },
  ], { rowH: 0.26 });
  txt(s, `press, aug 2026: "anthropic defined the standards inside agent plugins. so why isn't it in?"`,
    { x: X, y: 5.62, w: Wd, h: 0.24, fontSize: 10, color: P.MUT, objectName: "s7_press" });
  lines(s, "s7_note", X, 5.96, Wd, [
    "registry verdict: emit spec-pure name+description (+ namespaced metadata keys), keep vendor extras in overlays —",
    "a spec-pure skill works in all four harnesses today. keep claude's .claude-plugin/ and codex's marketplace.json separate.",
  ], { fontSize: 9, color: P.GRAY });
  ground(s, 7);
  s.addNotes("Standards: Agent Skills (46 clients, all four harnesses) vs Agent Plugins v1.0.0 (TSC without Anthropic; only Codex of ours). AGENTS.md + MCP under Linux Foundation AAIF. Claude declined .agents/ (not_planned #66352).");
}

/* ============================ SLIDE 8 — PRIOR ART ============================= */
{
  const s = pres.addSlide();
  header(s, 8, "vk08", "vt08",
    "six registries already run at scale — each covers a slice of the problem; none covers all artifact types × all four harnesses");
  const X = MG, colsw = 11.5;
  matrix(s, "s8", X, 1.86, [
    { label: "REGISTRY", x: 0, w: 2.3 },
    { label: "SCOPE", x: 2.3, w: 1.75 },
    { label: "TYPES", x: 4.05, w: 2.05 },
    { label: "MODEL", x: 6.1, w: 2.2 },
    { label: "SIGNAL", x: 8.3, w: 3.2 },
  ], [
    ["skills.sh / vercel", "~80 agents", "skills only", "symlink installs", "35.3k stars · top skill 3.9M installs"],
    ["clawhub / openclaw", "openclaw only", "skills + packages", "hosted npm-like", "2,371 of 31,371 flagged (7.6%)"],
    ["claude-plugins.dev", "claude only", "plugins + skills", "github index", "11,989 plugins · 63,065 skills"],
    ["pi.dev/packages", "pi only", "ext/skill/theme/prompt", "npm index", "5,361 packages · top 1.6M dl/mo"],
    ["opencode v2 catalog", "opencode", "skills", "http index.json", "versioned cache — most registry-ready"],
    ["mcp registry (official)", "any mcp client", "mcp servers", "metadata-only", "~9,652 servers · dns/github verify"],
  ], { rowH: 0.33 });
  txt(s, `gap: nobody = all artifact types × all 4 harnesses — whitespace verified 2026-10-16`,
    { x: X, y: 4.62, w: colsw, h: 0.26, fontSize: 10.5, bold: true, objectName: "s8_gap" });
  lines(s, "s8_less", X, 5.02, colsw, [
    "lessons: index beats host (mcp registry) · vendor-run wins reach (skills.sh: 35.3k stars in 9 months) · scale without",
    "scanning = debt (clawhub: 1,184 skills pulled in clawhavoc) · skills-only tools left plugins, mcp and hooks unsolved.",
  ], { fontSize: 9, color: P.MUT });
  ground(s, 8);
  s.addNotes("Prior art: six registries, each a slice — skills-only, one-harness, or mcp-only. Anthropic's own claude.com marketplace (341 plugins) is Claude-only too. The whitespace: all artifact types x all four harnesses.");
}

/* ============================ SLIDE 9 — SECURITY ============================== */
{
  const s = pres.addSlide();
  header(s, 9, "vk09", "vt09",
    "skills are untrusted instructions + code — the 2026 attack corpus is measured, so the registry's trust model is a day-1 input, not an afterthought");
  groupHead(s, "s9_num", MG, 1.80, 6.5, "THE 2026 NUMBERS");
  const nums = [
    ["36.82%", "of 3,984 sampled skills flawed — 13.4% (534) critical,\n76 confirmed malicious (snyk toxicskills, 2026-02-05)"],
    ["7.6%", "clawhub malicious-pattern rate — 2,371 of 31,371 skills\n(independent full-registry audit)"],
    ["80%", "attack success rate of skill-file injections on frontier\nmodels (skill-inject benchmark, arxiv 2602.20156)"],
    ["157", "confirmed malicious of 98,380 skills — one actor > 50%;\n100% removed after disclosure (arxiv 2602.06547)"],
  ];
  nums.forEach(([num, desc], i) => {
    const ry = 2.10 + i * 0.56;
    txt(s, num, { x: MG, y: ry, w: 1.45, h: 0.5, fontSize: 13, bold: true, valign: "middle", objectName: `s9_n${i}` });
    txt(s, desc, { x: MG + 1.55, y: ry, w: 4.95, h: 0.5, fontSize: 8.5, valign: "middle", objectName: `s9_d${i}` });
  });
  groupHead(s, "s9 lad", 7.35, 1.80, 5.15, "DAY-1 TRUST LADDER");
  ladder(s, "s9_l", 7.35, 2.10, [
    "namespace verification — github oidc / dns-txt",
    "publish-time scan gate — static + llm + mcp-scan",
    "immutable hashed versions + diff on every bump",
    "agentreg.lock — urn → version → sha256 → targets",
    "trust tiers by type — hooks / mcp = review tier",
  ], { w: 5.15 });
  lines(s, "s9_warn", MG, 5.65, 11.9, [
    "scanning is necessary, never sufficient: unit 42 found 5 evasive skills that beat virustotal + clawscan (one padded a readme to 22 MB)",
    "to blow scanner size limits). badges say scanned/warn — never \"safe\". the agent is the postinstall script (datadog: !cmd runs pre-injection).",
  ], { fontSize: 9, color: P.MUT });
  ground(s, 9);
  s.addNotes("Security: 36.82% flawed (Snyk, 3,984 sampled) / 7.6% ClawHub malicious-pattern / 80% Skill-Inject ASR / 157 of 98,380 confirmed malicious — all removed on disclosure, so takedown works. Day-1 ladder on the right.");
}

/* ============================= SLIDE 10 — DESIGN ============================== */
{
  const s = pres.addSlide();
  header(s, 10, "vk10", "vt10",
    "option a (recommended): thin verified index + agentreg emitter cli — records are metadata + hashes pointing at git/npm, never hosted code");
  flow(s, "s10_flow", MG, 1.88, ["PUBLISH", "VERIFY", "SCAN", "SEAL", "INDEX", "INSTALL", "LOCK"]);
  groupHead(s, "s10_pipe", MG, 2.42, 11.5, "THE PIPELINE");
  kv(s, "s10_kv", MG, 2.66, 11.5, [
    { k: "publish", v: "agentreg publish — github oidc identity, never a pr" },
    { k: "verify", v: "namespace io.github.* (oauth) · dns-txt for custom" },
    { k: "scan", v: "static rules + llm review + mcp-scan · fail = unlisted" },
    { k: "seal", v: "content sha256 · immutable versions · re-scan + diff on bump" },
    { k: "index", v: "record + badges — emit 4 native catalogs + npm mirror" },
    { k: "install", v: "copy-drops + native clis — never-execute installer" },
  ], { rowH: 0.26 });
  groupHead(s, "s10_pr", MG, 4.48, 11.5, "DESIGN PRINCIPLES (EVIDENCE-DERIVED)");
  lines(s, "s10_prt", MG, 4.72, 11.5, [
    "p1 index, don't host · p2 emit native formats, never invent a 4th path · p3 trust tiers day 1 · p4 never-execute installer",
    "p5 spec-pure core, vendor extras in overlays · p6 copy > symlink · p7 immutable versions + cross-harness lockfile · p8 delegate scanning",
  ], { fontSize: 9, color: P.MUT });
  lines(s, "s10_opt", MG, 5.42, 11.5, [
    "folded in, not built twice: option b (federation of native marketplaces) becomes a distribution channel inside a;",
    "option c (npm-centric, pi model) becomes the npm mirror — pi reach for free, without inheriting npm typosquat risk.",
  ], { fontSize: 9, color: P.GRAY });
  ground(s, 10);
  s.addNotes("The design: MCP-Registry-style thin verified index + agentreg CLI that emits native formats into all four harnesses. Data flow publish → verify → scan → seal → index → install → lock. Principles P1-P8 from design-unified-registry.md.");
}

/* ======================= SLIDE 11 — ONE RECORD, 4 EMISSIONS =================== */
{
  const s = pres.addSlide();
  header(s, 11, "vk11", "vt11",
    "agentreg install io.github.acme/pdf-report-writer@1.4.2 — one canonical record, four native emissions");
  groupHead(s, "s11_em", MG, 1.80, 11.5, "THE FOUR EMISSIONS");
  kv(s, "s11_kv", MG, 2.04, 11.5, [
    { k: "claude code", v: "copy dir → ~/.claude/skills/ + emit .claude-plugin/ marketplace repo" },
    { k: "codex", v: "copy dir → ~/.agents/skills/ + .agents/plugins/marketplace.json entry" },
    { k: "opencode", v: "copy dir → .opencode/skills/ + index.json catalog url in config skills[]" },
    { k: "pi", v: "pi install npm:@acme/pdf-report-writer@1.4.2 — content-only npm mirror" },
  ], { rowH: 0.28 });
  groupHead(s, "s11_hz", MG, 3.42, 11.5, "HAZARDS THE EMITTERS OWN");
  kv(s, "s11_kv2", MG, 3.66, 11.5, [
    { k: "dual-emit", v: "claude ignores .agents/ (not_planned #66352) — always also copy into ~/.claude/skills/", vc: P.MUT },
    { k: "version keys", v: "version lives in 4 places: plugin.json · marketplace ref · index.json · npm semver", vc: P.MUT },
    { k: "codegen", v: "hooks need generated ts plugins/extensions for opencode + pi (2 of 4)", vc: P.MUT },
  ], { rowH: 0.26 });
  groupHead(s, "s11_df", MG, 4.78, 11.5, "THE DIFFERENTIATOR");
  txt(s, `agentreg.lock — urn → version → sha256 → per-harness targets · no harness ships one`,
    { x: MG, y: 5.02, w: 11.5, h: 0.26, fontSize: 10.5, bold: true, objectName: "s11_lock" });
  lines(s, "s11_lt", MG, 5.42, 11.5, [
    "committed like package-lock.json; agentreg update re-scans before updating — blast-radius pinning for every harness at once.",
    "bundle note: agent-plugins 1.0.0 is the packaging substrate + codex catalog entry; claude gets the dual .claude-plugin/ manifest.",
  ], { fontSize: 9, color: P.MUT });
  ground(s, 11);
  s.addNotes("One record, four emissions. Dual-emit for Claude (ignores .agents/), OpenCode v1/v2 key sniffing, Codex trust gating surfaced never auto-trusted, Pi content-only npm mirror. agentreg.lock is the differentiator no harness ships.");
}

/* ============================ SLIDE 12 — ROADMAP ============================== */
{
  const s = pres.addSlide();
  header(s, 12, "vk12", "vt12",
    "v0 cut: skills + mcp only — the two universal payloads — across all four harnesses; everything else waits behind adapters");
  const cols = [
    { x: MG, head: "V0 · MVP  2026-11 → 2027-01", ls: [
      "github oidc + dns-txt namespaces", "scan gate: static + llm + mcp-scan",
      "copy installs + agentreg.lock", "4 emitted catalogs + npm mirror",
      "read-only rest api + takedown sla", "exit: ≥100 verified artifacts,",
      "installs proven on all 4 in ci"] },
    { x: 4.62, head: "V1 · ADAPTERS  2027-02 → 06", ls: [
      "hooks → ts plugins / extensions", "agents (toml + md) · commands · themes",
      "reputation + anti-gaming", "scan-on-install client hook",
      "federation openapi (hourly pulls)", "exit: ≥1,000 artifacts · ≥2 aggregators",
      "aaif donation initiated"] },
    { x: 8.69, head: "V2 · TRUST  2027-07 →", ls: [
      "sigstore signing + slsa provenance", "agent-plugins 1.1 alignment",
      "enterprise private mirrors", "tee publish pipeline",
      "federated audit sharing", "exit: ≥1 harness consumes signatures,",
      "spec 1.1 shipped · donation done"] },
  ];
  cols.forEach((c, i) => {
    txt(s, c.head, { x: c.x, y: 1.82, w: 3.75, h: 0.2, fontSize: 9, bold: true, objectName: `s12_h${i}` });
    rect(s, c.x, 2.04, 3.75, C, P.INK, `s12_hr${i}`);
    txt(s, c.ls.join("\n"), { x: c.x, y: 2.12, w: 3.75, h: 1.8, fontSize: 8.5, color: P.INK, objectName: `s12_c${i}` });
  });
  groupHead(s, "s12_gov", MG, 4.18, 11.9, "GOVERNANCE");
  txt(s, `launch vendor-neutral tsc (agent-plugins charter clone — individual seats, no vendor majority) → pre-commit to aaif donation at v1`,
    { x: MG, y: 4.42, w: 11.9, h: 0.24, fontSize: 9.5, bold: true, objectName: "s12_govt" });
  lines(s, "s12_bet", MG, 4.86, 11.9, [
    "bet order: skills + mcp now (all-four reach today) → plugins when claude consumes (watch 1.1) → signing only when a",
    "harness verifies signatures (none does today). risks kept open: opencode v1/v2 churn, pi 0.x→1.3 churn — version-sniffing",
    "emitters + a ci matrix against every harness release.",
  ], { fontSize: 9, color: P.MUT });
  ground(s, 12);
  s.addNotes("Roadmap: v0 MVP by 2027-01 (skills+MCP x 4 harnesses, OIDC/DNS-TXT, scan gate, lockfile, 4 catalogs, read-only API). v1 adapters + reputation + federation. v2 signing/SLSA. Governance: neutral TSC, AAIF donation as v1 exit.");
}

/* ============================= SLIDE 13 — CLOSER ============================== */
{
  const s = pres.addSlide();
  header(s, 13, "vk13", "vt13",
    "the wedge nobody ships: one verified index + a lockfile + trust tiers — register once, run on every agent");
  // hero parade on the ground: runner idle, chest, colored vending machine (done).
  // machine lifted 2 cells off the dash line so its dark base reads as a base,
  // not a merge with the ground dashes; banner sits fully ABOVE the machine.
  const machH = 1.35, machX = 11.72;
  const machTop = GROUND - 2 * C - machH;
  const r = imgA(s, "figures", "fg_runner_idle", 10.0, 0.5, "s13_runner");
  imgA(s, "finale", "chest", 10.95, 0.45, "s13_chest", GROUND - 2 * C); // seat on the line like the machine
  s.addImage({
    path: "assets/finale/machine_done.png", x: machX, y: machTop,
    w: machH * (mget("finale", "machine_done").w / mget("finale", "machine_done").h),
    h: machH, objectName: "s13_machine",
  });
  const bwd = 0.22 * (mget("text", "vbanner").w / mget("text", "vbanner").h);
  imgText(s, "vbanner", machX + machH * (24 / 45) - bwd, machTop - 0.40, 0.22, "s13_banner");
  void r;
  lines(s, "s13_src", MG, 5.24, 11.9, [
    "sources: 8-file corpus in agents-unified-registry/ · every number verified 2026-10-16 · deck: nano-super-slides-v4",
    "next: agentreg v0 — skills + mcp × 4 harnesses. one registry, every agent.",
  ], { fontSize: 9, color: P.MUT });
  ground(s, 13);
  s.addNotes("Closer: REGISTRY BREWING. The colored vending machine (m03, done state — the deck's only color) brews; chest = the collectible. Banner: ONE REGISTRY · EVERY AGENT. Bet skills+MCP now, plugins next, lockfile+trust tiers are the wedge.");
}

pres.writeFile({ fileName: "nano-super-agent-registry.pptx" })
  .then(() => console.log("WROTE nano-super-agent-registry.pptx (13 slides)"));
