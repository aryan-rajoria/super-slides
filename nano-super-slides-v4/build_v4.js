/* nano-super v4 — "The Unified Agent Registry" research deck (13 slides).
 * RETHEME: v1 "gaming pixel/voxel" house style (agents-unified-registry/
 * _v1-style-guide.md) applied to the identical v4 content — same facts,
 * same numbers, same 13-slide arc.
 *   - dark cover (S1) + light paper S2-S12 + dark closer/game slide (S13)
 *   - bitmap 5x7-font kickers (BLUE) / titles (INK) / cover-closer (WHITE)
 *   - cards: 2.25pt ink border + hard ink offset shadow (+0.055in), sharp
 *     corners, hairline row dividers #E3E1DA, square bullets, letter-spaced
 *     caps label bands, mono-bold accent hero numbers (34-60pt)
 *   - harness accents deck-wide: CLAUDE AMBER · CODEX GREEN · OPENCODE BLUE
 *     · PI PURPLE (tints for panels) — one accent per card, never mixed
 *   - voxel art: runner (BLUE), 4 skill-cubes, vending machine + cup +
 *     hearts on the game slide; every shape carries an objectName
 *
 * BUILD ORDER (sprites MUST exist first):
 *   1. ..\.venv\Scripts\python gen_sprites_v4.py   -> assets\ + manifest_v4.json
 *   2. NODE_PATH=$(npm root -g) node build_v4.js
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");

let MAN;
try {
  MAN = JSON.parse(fs.readFileSync("assets/manifest_v4.json", "utf8"));
} catch (e) {
  throw new Error("assets/manifest_v4.json missing or unreadable — run gen_sprites_v4.py first");
}

// ---------- palette (v1 style guide, exact) ----------
const P = {
  BG: "F7F6F2", INK: "1B1D22", MUT: "5C6068", CARD: "FFFFFF", HAIR: "E3E1DA",
  BLUE: "2F6FED", GREEN: "16A34A", AMBER: "D97706", RED: "DC2626", PURPLE: "7C3AED", CYAN: "0E7490",
  BLUE_T: "E7EEFD", GREEN_T: "E5F5EA", AMBER_T: "FBEEDD", RED_T: "FBE5E5", PURPLE_T: "EFE9FB", CYAN_T: "E0F2F7", GRAY_T: "EFEFEA",
  DK_BG: "1B1D22", DK_CARD: "24272F", DK_LINE: "3C414C", DK_MUT: "9AA0AB", DK_TXT: "E9EBEE",
  LBLUE: "7CB0FF",
};
// harness accent mapping, used deck-wide (one accent per card, never mixed)
const ACC = {
  claude: { a: P.AMBER, t: P.AMBER_T, cube: "cube_claude", name: "CLAUDE CODE" },
  codex: { a: P.GREEN, t: P.GREEN_T, cube: "cube_codex", name: "CODEX" },
  opencode: { a: P.BLUE, t: P.BLUE_T, cube: "cube_opencode", name: "OPENCODE" },
  pi: { a: P.PURPLE, t: P.PURPLE_T, cube: "cube_pi", name: "PI" },
};

const W = 13.333, H = 7.5, MG = 0.55;
const SANS = "Segoe UI", MONO = "Consolas";
const SH = 0.055; // hard-shadow offset (in)

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "aryan-rajoria";
pres.title = "The Unified Agent Registry — nano-super v4";

// ---------- helpers (v1 build_deck.js, objectName-threaded) ----------
function img(s, name, x, y, h, tag) {
  const m = MAN[name];
  if (!m) throw new Error(`manifest missing ${name}`);
  const w = h * (m.w / m.h);
  s.addImage({ path: `assets/${name}.png`, x, y, w, h, objectName: tag });
  return { r: x + w, b: y + h, w, h };
}
function rect(s, x, y, w, h, fill, line, lw, tag) {
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h, fill: { color: fill },
    line: line ? { color: line, width: lw == null ? 2.25 : lw } : { type: "none" },
    objectName: tag,
  });
}
// pixel card: ink offset shadow + white (or tinted) card with chunky border
function card(s, tag, x, y, w, h, fill, line, lw) {
  rect(s, x + SH, y + SH, w, h, P.INK, null, null, `${tag}_sh`);
  rect(s, x, y, w, h, fill || P.CARD, line || P.INK, lw, tag);
}
function sq(s, x, y, size, color, tag) { rect(s, x, y, size, size, color, null, null, tag); }
// signature motif: voxel cluster (2 stacked + 1 offset)
function voxel(s, x, y, c1, c2, c3, tag, size) {
  const z = size || 0.14;
  sq(s, x, y, z, c1, `${tag}_v1`);
  sq(s, x + z + 0.03, y, z, c2, `${tag}_v2`);
  sq(s, x, y + z + 0.03, z, c3, `${tag}_v3`);
}
// horizontal pixel arrow: shaft + stepped head
function arrowH(s, x1, x2, yMid, color, tag) {
  const c = color || P.INK, th = 0.045;
  rect(s, x1, yMid - th / 2, x2 - x1 - 0.1, th, c, null, null, `${tag}_shaft`);
  sq(s, x2 - 0.1, yMid - 0.115, 0.1, c, `${tag}_h1`);
  sq(s, x2 - 0.1, yMid + 0.015, 0.1, c, `${tag}_h2`);
  rect(s, x2, yMid - 0.05, 0.05, 0.1, c, null, null, `${tag}_tip`);
}
function txt(s, t, o) {
  s.addText(t, Object.assign({ fontFace: SANS, color: P.INK, margin: 0, align: "left", valign: "top" }, o));
}
function hair(s, x, y, w, tag) {
  s.addShape(pres.shapes.LINE, { x, y, w, h: 0, line: { color: P.HAIR, width: 0.75 }, objectName: tag });
}
// small chip with mono text
function chip(s, x, y, t, fg, bg, fs, tag, border) {
  fs = fs || 10;
  const w = 0.18 + t.length * fs * 0.0088;
  const h = fs * 1.9 / 72 + 0.1;
  rect(s, x + 0.03, y + 0.03, w, h, P.INK, null, null, `${tag}_sh`);
  rect(s, x, y, w, h, bg || P.CARD, border || P.INK, 1.5, tag);
  txt(s, t, { x, y, w, h, fontFace: MONO, fontSize: fs, color: fg, align: "center", valign: "middle", bold: true, objectName: `${tag}_t` });
  return w;
}
// number badge: accent square + ink shadow + white mono number
function badge(s, x, y, t, accent, tag, size) {
  const z = size || 0.42;
  rect(s, x + 0.03, y + 0.03, z, z, P.INK, null, null, `${tag}_sh`);
  rect(s, x, y, z, z, accent, null, null, tag);
  txt(s, t, { x, y, w: z, h: z, fontFace: MONO, fontSize: 13, bold: true, color: "FFFFFF", align: "center", valign: "middle", objectName: `${tag}_t` });
}
// letter-spaced caps label band
function band(s, t, x, y, w, color, tag, fs) {
  txt(s, t, { x, y, w, h: 0.24, fontSize: fs || 10.5, bold: true, color, charSpacing: 2, objectName: tag });
}
// standard content-slide furniture (light slides)
function header(s, n, kicker, title, spec) {
  s.background = { color: P.BG };
  voxel(s, 12.18, 0.42, P.BLUE, P.GREEN, P.AMBER, `s${n}_vx`);
  img(s, kicker, MG, 0.44, 0.2, `s${n}_kick`);
  img(s, title, MG, 0.72, 0.52, `s${n}_title`);
  txt(s, spec, { x: MG, y: 1.33, w: 11.45, h: 0.55, fontSize: 11, color: P.MUT, lineSpacingMultiple: 1.15, objectName: `s${n}_spec` });
  txt(s, `${String(n).padStart(2, "0")} / 13`, { x: 12.1, y: 7.09, w: 0.7, h: 0.25, fontFace: MONO, fontSize: 9.5, color: P.MUT, align: "right", objectName: `s${n}_pg` });
}
// kv rows inside a card: bold mono key + value, hairline between
function kvRows(s, tag, x, y, w, rows, o = {}) {
  const fs = o.fs || 9.5, rh = o.rh || 0.42, kw = o.kw || 1.35;
  rows.forEach((r, i) => {
    const ry = y + i * rh;
    txt(s, r.k, { x, y: ry, w: kw, h: rh, fontFace: MONO, fontSize: fs, bold: true, valign: "middle", objectName: `${tag}_k${i}` });
    txt(s, r.v, { x: x + kw, y: ry, w: w - kw, h: rh, fontFace: MONO, fontSize: o.vfs || fs, color: r.vc || P.INK, valign: "middle", align: "right", objectName: `${tag}_v${i}` });
    if (i < rows.length - 1) hair(s, x, ry + rh, w, `${tag}_hr${i}`);
  });
  return y + rows.length * rh;
}
// bullet rows inside a card: accent square + bold label/muted desc, hairlines
function listRows(s, tag, x, y, w, rows, accent, o = {}) {
  const rh = o.rh || 0.44, bs = o.bullet || 0.12;
  rows.forEach((r, i) => {
    const ry = y + i * rh;
    sq(s, x, ry + (o.tall ? 0.06 : 0.03), bs, accent, `${tag}_b${i}`);
    if (r.d != null) {
      txt(s, r.k, { x: x + bs + 0.14, y: ry, w: w - bs - 0.14, h: rh * 0.5, fontSize: o.kfs || 11.5, bold: true, objectName: `${tag}_k${i}` });
      txt(s, r.d, { x: x + bs + 0.14, y: ry + rh * 0.42, w: w - bs - 0.14, h: rh * 0.5, fontSize: o.vfs || 10, color: P.MUT, lineSpacingMultiple: 1.1, objectName: `${tag}_v${i}` });
    } else {
      txt(s, r.k, { x: x + bs + 0.14, y: ry, w: w - bs - 0.14, h: rh, fontSize: o.kfs || 10, valign: "middle", objectName: `${tag}_k${i}` });
    }
    if (i < rows.length - 1 && !o.nohair) hair(s, x, ry + rh, w, `${tag}_hr${i}`);
  });
  return y + rows.length * rh;
}

// ---------- preflight ----------
const NEED = ["ck", "ct1", "ct2", "k02", "k03", "k04", "k05", "k06", "k07", "k08", "k09", "k10", "k11", "k12", "k13",
  "t02", "t03", "t04", "t05", "t06", "t07", "t08", "t09", "t10", "t11", "t12", "t13", "banner",
  "runner", "machine", "cup", "heart", "cube_claude", "cube_codex", "cube_opencode", "cube_pi"];
const MISS = NEED.filter((n) => !MAN[n] || !fs.existsSync(`assets/${n}.png`));
if (MISS.length) throw new Error(`v4 assets not ready, missing: ${MISS.join(", ")}`);

/* =============================== SLIDE 1 — COVER (dark) =============================== */
{
  const s = pres.addSlide();
  s.background = { color: P.DK_BG };
  s.addNotes("Title. Thesis: register a coding-agent artifact once, target all four harnesses. All numbers from the 8-file verified corpus (2026-10-16). Dark v1-style cover: white bitmap title, BLUE voxel runner + the four harness skill-cubes right, 4 mono stat chips.");
  voxel(s, 0.6, 0.38, P.LBLUE, P.GREEN, P.AMBER, "s1_vx1", 0.16);
  voxel(s, 12.2, 6.5, P.AMBER, P.LBLUE, P.GREEN, "s1_vx2", 0.16);
  img(s, "ck", MG, 0.95, 0.2, "s1_kick");
  img(s, "ct1", MG, 1.45, 0.66, "s1_title1");
  img(s, "ct2", MG, 2.25, 0.66, "s1_title2");
  txt(s, "One verified index for coding-agent artifacts.", { x: MG, y: 3.3, w: 8.5, h: 0.4, fontSize: 19, color: "C9CDD4", objectName: "s1_sub" });
  txt(s, "Register a skill, mcp server, agent, command, hook or theme once — verify, scan, seal —\nand install it on claude code, codex, opencode and pi.", { x: MG, y: 3.85, w: 7.9, h: 0.75, fontSize: 14.5, color: P.DK_TXT, lineSpacingMultiple: 1.25, objectName: "s1_desc" });
  // 4 mono stat chips (dark chips: 24272F fill, 3C414C border, 05060A shadow)
  const stats = ["4 HARNESSES", "6 SURFACES", "46 CLIENTS", "1 REGISTRY"];
  let cx = MG;
  stats.forEach((st, i) => {
    const w = 0.3 + st.length * 0.115;
    rect(s, cx + 0.04, 5.0 + 0.04, w, 0.52, "05060A", null, null, `s1_chip${i}_sh`);
    rect(s, cx, 5.0, w, 0.52, P.DK_CARD, P.DK_LINE, 1.5, `s1_chip${i}`);
    txt(s, st, { x: cx, y: 5.0, w, h: 0.52, fontFace: MONO, fontSize: 12, bold: true, color: P.DK_TXT, align: "center", valign: "middle", objectName: `s1_chip${i}_t` });
    cx += w + 0.25;
  });
  txt(s, "sources: 8-file corpus — claude-code · codex · opencode · pi · cross-spec-standards · prior-art-registries · security-trust-model · design (all verified 2026-10-16)",
    { x: MG, y: 5.85, w: 11.5, h: 0.3, fontSize: 10, color: P.DK_MUT, fontFace: MONO, objectName: "s1_src" });
  // giant voxel-art accent: BLUE runner + the four harness cubes
  img(s, "runner", 9.85, 2.2, 2.9, "s1_runner");
  const cubes = [["cube_claude", 9.9], ["cube_codex", 10.75], ["cube_opencode", 11.6], ["cube_pi", 12.45]];
  cubes.forEach(([n, x], i) => img(s, n, x, 5.35, 0.42, `s1_cube${i}`));
  txt(s, "github.com/aryan-rajoria/agents-unified-registry", { x: MG, y: 6.95, w: 6.5, h: 0.3, fontSize: 11, color: P.DK_MUT, fontFace: MONO, objectName: "s1_repo" });
  txt(s, "OCTOBER 2026", { x: 10.9, y: 6.95, w: 1.9, h: 0.3, fontSize: 11, color: P.DK_MUT, fontFace: MONO, align: "right", objectName: "s1_date" });
}

/* ============================ SLIDE 2 — THE PROBLEM (matrix) ============================ */
{
  const s = pres.addSlide();
  header(s, 2, "k02", "t02",
    "4 coding harnesses × 6+ artifact types × distinct paths, manifests and clis — same job, a different answer in every cell");
  s.addNotes("The fragmentation matrix: artifact type x harness -> where it lives. No unified registry exists (verified whitespace). Quote from the .agents/ convention debate.");
  // left: THE GAP hero card (24 vs 0)
  card(s, "s2_gap", MG, 1.78, 3.0, 3.9, P.BLUE_T);
  band(s, "THE GAP", 0.85, 2.0, 2.4, P.BLUE, "s2_gap_band");
  txt(s, "24", { x: 0.8, y: 2.22, w: 2.4, h: 1.05, fontFace: MONO, fontSize: 60, bold: true, color: P.BLUE, objectName: "s2_gap_n1" });
  txt(s, "surfaces — 4 harnesses × 6 artifact types where one artifact could live", { x: 0.85, y: 3.3, w: 2.35, h: 0.65, fontSize: 10.5, color: P.INK, lineSpacingMultiple: 1.15, objectName: "s2_gap_d1" });
  hair(s, 0.85, 4.06, 2.3, "s2_gap_hr");
  txt(s, "0", { x: 0.8, y: 4.12, w: 1.0, h: 0.75, fontFace: MONO, fontSize: 40, bold: true, color: P.BLUE, objectName: "s2_gap_n2" });
  txt(s, "registries cover them\nwhitespace verified 2026-10-16", { x: 1.55, y: 4.22, w: 1.7, h: 0.62, fontSize: 10.5, bold: true, lineSpacingMultiple: 1.15, objectName: "s2_gap_d2" });
  txt(s, "4 × 6 = 24", { x: 0.85, y: 5.05, w: 2.3, h: 0.3, fontFace: MONO, fontSize: 10.5, color: P.MUT, objectName: "s2_gap_note" });
  // right: fragmentation matrix card (v1 hand-drawn table)
  card(s, "s2_mx", 3.75, 1.78, 9.03, 3.9);
  const mx = { x: 4.03, cols: [
    { label: "TYPE", x: 0, w: 1.25, c: P.MUT },
    { label: "CLAUDE CODE", x: 1.25, w: 1.8, c: P.AMBER },
    { label: "CODEX", x: 3.05, w: 1.8, c: P.GREEN },
    { label: "OPENCODE", x: 4.85, w: 1.8, c: P.BLUE },
    { label: "PI", x: 6.65, w: 1.82, c: P.PURPLE },
  ] };
  mx.cols.forEach((c, i) => txt(s, c.label, { x: mx.x + c.x, y: 1.98, w: c.w, h: 0.22, fontSize: 8.5, bold: true, color: c.c, charSpacing: 1.5, align: i ? "center" : "left", objectName: `s2_mx_ch${i}` }));
  const rows2 = [
    ["SKILLS", ".claude/skills/", ".agents/skills/", ".opencode+.agents+.claude", "~/.agents/skills"],
    ["MCP SERVERS", "~/.claude.json mcpServers", "[mcp_servers] config.toml", "mcp.servers.<n> (v2 json)", "mcp.json claude-shape"],
    ["SUBAGENTS", ".claude/agents/*.md", ".codex/agents/*.toml", ".opencode/agents/*.md", ".pi/agents + example ext"],
    ["HOOKS", "settings hooks · 30+ events", "hooks.json · 12 events", "ts plugin (adapter)", "ts extension (adapter)"],
    ["COMMANDS", ".claude/commands legacy", "~/.codex/prompts deprecated", ".opencode/commands", "~/.pi/agent/prompts"],
    ["THEMES", "plugin themes/*.json", "n/a — no surface", ".opencode/themes", "~/.pi/agent/themes"],
  ];
  rows2.forEach((r, ri) => {
    const ry = 2.3 + ri * 0.53;
    hair(s, mx.x, ry, 8.47, `s2_mx_hr${ri}`);
    txt(s, r[0], { x: mx.x, y: ry, w: 1.25, h: 0.53, fontFace: MONO, fontSize: 8.5, bold: true, valign: "middle", objectName: `s2_mx_r${ri}c0` });
    for (let ci = 1; ci <= 4; ci++) {
      const c = mx.cols[ci];
      txt(s, r[ci], { x: mx.x + c.x, y: ry, w: c.w, h: 0.53, fontFace: MONO, fontSize: 8.5, color: P.INK, align: "center", valign: "middle", objectName: `s2_mx_r${ri}c${ci}` });
    }
  });
  hair(s, mx.x, 2.3 + 6 * 0.53, 8.47, "s2_mx_hr6");
  // bottom: quote + fragmentation cost strip
  card(s, "s2_cost", MG, 5.85, 12.23, 1.12, P.GRAY_T);
  txt(s, "\u201Cthe spec unified us, the paths divided us\u201D — community, jan 2026", { x: 0.85, y: 5.98, w: 11.6, h: 0.24, fontSize: 11, italic: true, color: P.MUT, objectName: "s2_quote" });
  txt(s, "fragmentation cost: one publisher writes 4 manifests, 4 install paths, 4 trust models for every artifact · every consumer re-derives\nwhat is safe to install · nothing registers all types across all four (prior-art scan, 2026-10-16)",
    { x: 0.85, y: 6.28, w: 11.6, h: 0.55, fontSize: 9.5, color: P.MUT, fontFace: MONO, lineSpacingMultiple: 1.25, objectName: "s2_cost_t" });
}

/* ========================= SLIDES 3-6 — HARNESS SURVEY ========================= */
function harnessSlide(n, kick, title, spec, A, idRows, surfRows, hero, surprise, noteTxt) {
  const s = pres.addSlide();
  header(s, n, kick, title, spec);
  s.addNotes(noteTxt);
  // row 1: ID CARD (accent tint) + HERO NUMBER card (white)
  card(s, `s${n}_id`, MG, 1.78, 6.35, 2.35, A.t);
  band(s, `ID CARD — ${A.name}`, 0.85, 1.98, 5.6, A.a, `s${n}_id_band`);
  kvRows(s, `s${n}_idkv`, 0.85, 2.28, 5.75, idRows, { kw: 1.15, rh: 0.42, fs: 9.5, vfs: 9 });
  card(s, `s${n}_hero`, 7.15, 1.78, 5.63, 2.35);
  img(s, A.cube, 11.85, 2.02, 0.6, `s${n}_cube`);
  txt(s, hero.n, { x: 7.45, y: 1.98, w: 4.3, h: 0.95, fontFace: MONO, fontSize: 46, bold: true, color: A.a, objectName: `s${n}_hero_n` });
  txt(s, hero.l, { x: 7.45, y: 2.98, w: 4.6, h: 0.26, fontSize: 11.5, bold: true, objectName: `s${n}_hero_l` });
  txt(s, hero.d, { x: 7.45, y: 3.28, w: 4.6, h: 0.7, fontSize: 10, color: P.MUT, lineSpacingMultiple: 1.2, objectName: `s${n}_hero_d` });
  // row 2: REGISTRY SURFACES (white card) + SURPRISE (gray tint card)
  card(s, `s${n}_sf`, MG, 4.32, 7.45, 2.42);
  band(s, "REGISTRY SURFACES", 0.85, 4.5, 6.8, P.MUT, `s${n}_sf_band`, 10);
  surfRows.forEach((r, i) => {
    const ry = 4.82 + i * 0.365;
    sq(s, 0.85, ry + 0.1, 0.11, A.a, `s${n}_sf_b${i}`);
    txt(s, r.k, { x: 1.1, y: ry, w: 1.35, h: 0.365, fontFace: MONO, fontSize: 9.5, bold: true, valign: "middle", objectName: `s${n}_sf_k${i}` });
    txt(s, r.v, { x: 2.45, y: ry, w: 5.35, h: 0.365, fontFace: MONO, fontSize: 9, color: P.MUT, valign: "middle", objectName: `s${n}_sf_v${i}` });
    if (i < surfRows.length - 1) hair(s, 0.85, ry + 0.365, 6.8, `s${n}_sf_hr${i}`);
  });
  card(s, `s${n}_sp`, 8.2, 4.32, 4.58, 2.42, P.GRAY_T);
  band(s, "SURPRISE", 8.5, 4.5, 3.9, P.MUT, `s${n}_sp_band`, 10);
  txt(s, surprise, { x: 8.5, y: 4.82, w: 3.98, h: 1.75, fontSize: 10.5, color: P.INK, lineSpacingMultiple: 1.25, objectName: `s${n}_sp_t` });
}

harnessSlide(3, "k03", "t03",
  "anthropic · npm @anthropic-ai/claude-code · richest surface of the four — and the only one with plugin marketplaces",
  ACC.claude,
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
  { n: "30+", l: "HOOK EVENTS · ALL SCOPES MERGE", d: "settings hooks fire 30+ lifecycle events; every scope's hooks merge into one chain" },
  "Marketplaces are git repos — 7 source kinds (github / url / git-subdir / npm / archive / command), no hosted api.\nnpm source: install scripts never run — the safe channel for npm-hosted claude payloads.",
  "Claude Code v2.1.302. Richest surface. Programmatic registry path = publish a git repo with .claude-plugin/marketplace.json; claude plugin list --available --json is machine-readable.");

harnessSlide(4, "k04", "t04",
  "openai · rust binary, apache-2.0, ~130k stars · toml config, agents.md native — and the trust-gated one",
  ACC.codex,
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
  { n: "~130K", l: "GITHUB STARS · RUST BINARY", d: "apache-2.0 rust cli; agents.md native, toml config end to end" },
  "hooks.json is claude-shape compatible (12 events, honors CLAUDE_PLUGIN_ROOT) — and project .codex/ layers stay\ninert until [projects.\"<path>\"] trust_level = \"trusted\"; plugin hooks wait for explicit user review.",
  "Codex rust-v0.163.0. Adopted Agent Skills + agent-plugins. Strongest hook discipline: plugin hooks skipped until reviewed; plugins with hooks barred from the public directory.");

harnessSlide(5, "k05", "t05",
  "anomaly (ex-sst) · ~214k stars · reads three skill dirs natively — and ships the most registry-ready surface of all four",
  ACC.opencode,
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
  { n: "~214K", l: "GITHUB STARS · 3 NATIVE SKILL DIRS", d: "reads .opencode/, .agents/ and .claude/ skill dirs natively — most registry-ready surface" },
  "v1 plugins do not work in 2.0 (mcp.<n> vs mcp.servers.<n>, plugin vs plugins) — emitters must sniff versions.\nno official marketplace: aggregators ocx, awesome-opencode and opencode.cafe fill the gap.",
  "OpenCode 2.0.x. The v2 HTTP skills catalog (index.json, versioned cache) is a pull-based, file-level registry protocol — any static host is a registry. This is the surface agentreg emits to.");

harnessSlide(6, "k06", "t06",
  "earendil-works (mario zechner, co-maint armin ronacher) · minimal core — extensions replace plugins, hooks and tools",
  ACC.pi,
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
  { n: "5,361", l: "PACKAGES ON PI.DEV", d: "npm IS the registry — zero-friction publishing; top package 1.6M downloads/mo" },
  "npm IS the registry — zero-friction publishing, top package 1.6M downloads/mo; but .agents/skills ancestors load\nun-gated (verified in source) and 0.19's ~/.claude + ~/.codex readers were dropped when .agents landed (0.54.0).",
  "Pi 1.3.0. The cleanest 'don't build a registry' precedent: pi.dev/packages is an npm index. Registry publishes content-only packages (no scripts) to kill the npm postinstall surface.");

/* ========================= SLIDE 7 — STANDARDS LAYER ========================== */
{
  const s = pres.addSlide();
  header(s, 7, "k07", "t07",
    "two bundle specs, no shared steward — anthropic's formats (SKILL.md, mcp.json) live inside agent plugins, yet claude code consumes neither");
  s.addNotes("Standards: Agent Skills (46 clients, all four harnesses) vs Agent Plugins v1.0.0 (TSC without Anthropic; only Codex of ours). AGENTS.md + MCP under Linux Foundation AAIF. Claude declined .agents/ (not_planned #66352).");
  // AGENT SKILLS card (BLUE) with hero 46
  card(s, "s7_sk", MG, 1.78, 6.0, 2.6, P.BLUE_T);
  band(s, "AGENT SKILLS — AGENTSKILLS.IO", 0.85, 1.96, 5.4, P.BLUE, "s7_sk_band");
  txt(s, "46", { x: 0.8, y: 2.18, w: 1.6, h: 0.95, fontFace: MONO, fontSize: 46, bold: true, color: P.BLUE, objectName: "s7_sk_n" });
  txt(s, "clients showcased — all four\nharnesses on the list", { x: 2.3, y: 2.32, w: 3.4, h: 0.62, fontSize: 11.5, bold: true, lineSpacingMultiple: 1.15, objectName: "s7_sk_l" });
  txt(s, "counted 2026-10-16 · unversioned living spec — zero tags · anthropic-donated 2025-12-16", { x: 2.3, y: 3.0, w: 3.4, h: 0.55, fontSize: 9, color: P.MUT, fontFace: MONO, lineSpacingMultiple: 1.2, objectName: "s7_sk_d" });
  hair(s, 0.85, 3.62, 5.4, "s7_sk_hr");
  txt(s, "6 fields · 2 required (name, description) · metadata map = extension channel", { x: 0.85, y: 3.72, w: 5.45, h: 0.5, fontSize: 10, fontFace: MONO, color: P.INK, lineSpacingMultiple: 1.2, objectName: "s7_sk_f" });
  // VS badge between the two cards
  badge(s, 6.49, 2.9, "VS", P.INK, "s7_vs", 0.36);
  // AGENT PLUGINS card (GREEN) with hero 9
  card(s, "s7_pl", 6.78, 1.78, 6.0, 2.6, P.GREEN_T);
  band(s, "AGENT PLUGINS — AGENT-PLUGINS.ORG", 7.08, 1.96, 5.4, P.GREEN, "s7_pl_band");
  txt(s, "9", { x: 7.0, y: 2.18, w: 1.2, h: 0.95, fontFace: MONO, fontSize: 46, bold: true, color: P.GREEN, objectName: "s7_pl_n" });
  txt(s, "compatible clients — of our\nfour, only codex", { x: 8.1, y: 2.32, w: 3.4, h: 0.62, fontSize: 11.5, bold: true, lineSpacingMultiple: 1.15, objectName: "s7_pl_l" });
  txt(s, "v1.0.0 · 2026-08-06 · closed 9-field plugin.json · skills + mcp only", { x: 8.1, y: 3.0, w: 3.5, h: 0.55, fontSize: 9, color: P.MUT, fontFace: MONO, lineSpacingMultiple: 1.2, objectName: "s7_pl_d" });
  hair(s, 7.08, 3.62, 5.4, "s7_pl_hr");
  txt(s, "tsc: amazon · cursor · microsoft · openai · vercel — anthropic absent", { x: 7.08, y: 3.72, w: 5.45, h: 0.5, fontSize: 10, fontFace: MONO, color: P.INK, lineSpacingMultiple: 1.2, objectName: "s7_pl_f" });
  // ADJACENT STANDARDS card
  card(s, "s7_adj", MG, 4.55, 12.23, 1.32);
  band(s, "ADJACENT STANDARDS", 0.85, 4.71, 6, P.MUT, "s7_adj_band", 10);
  kvRows(s, "s7_adjkv", 0.85, 5.0, 11.6, [
    { k: "agents.md", v: "linux foundation aaif (mcp + agents.md donated 2025-12-09)" },
    { k: "mcp registry", v: "preview · metadata-only server.json · ~9,652 servers · openapi federation" },
    { k: ".agents/ dir", v: "unratified — claude declined: issue #66352 not_planned 2026-07-16" },
  ], { kw: 1.6, rh: 0.27, fs: 9.5, vfs: 9 });
  // press + verdict strip
  card(s, "s7_pr", MG, 6.05, 12.23, 0.95, P.GRAY_T);
  txt(s, "press, aug 2026: \u201Canthropic defined the standards inside agent plugins. so why isn't it in?\u201D", { x: 0.85, y: 6.14, w: 11.6, h: 0.22, fontSize: 10, italic: true, color: P.MUT, objectName: "s7_press" });
  txt(s, "registry verdict: emit spec-pure name+description (+ namespaced metadata keys), keep vendor extras in overlays — a spec-pure skill works in all four\nharnesses today. keep claude's .claude-plugin/ and codex's marketplace.json separate.", { x: 0.85, y: 6.4, w: 11.6, h: 0.5, fontSize: 9, color: P.MUT, fontFace: MONO, lineSpacingMultiple: 1.25, objectName: "s7_verdict" });
}

/* ============================ SLIDE 8 — PRIOR ART ============================= */
{
  const s = pres.addSlide();
  header(s, 8, "k08", "t08",
    "six registries already run at scale — each covers a slice of the problem; none covers all artifact types × all four harnesses");
  s.addNotes("Prior art: six registries, each a slice — skills-only, one-harness, or mcp-only. Anthropic's own claude.com marketplace (341 plugins) is Claude-only too. The whitespace: all artifact types x all four harnesses.");
  // left: prior-art table (v1 hand-drawn: hairlines, mono, accent right column)
  card(s, "s8_tb", MG, 1.78, 7.85, 3.9);
  const t8 = { x: 0.85, cols: [
    { label: "REGISTRY", x: 0, w: 1.5 },
    { label: "SCOPE", x: 1.5, w: 0.95 },
    { label: "TYPES", x: 2.45, w: 1.15 },
    { label: "MODEL", x: 3.6, w: 1.1 },
    { label: "SIGNAL", x: 4.7, w: 2.59, blue: true },
  ] };
  t8.cols.forEach((c, i) => txt(s, c.label, { x: t8.x + c.x, y: 1.98, w: c.w, h: 0.22, fontSize: 8.5, bold: true, color: c.blue ? P.BLUE : P.MUT, charSpacing: 1.5, objectName: `s8_tb_ch${i}` }));
  const rows8 = [
    ["skills.sh / vercel", "~80 agents", "skills only", "symlink installs", "35.3k stars · top skill 3.9M installs"],
    ["clawhub / openclaw", "openclaw only", "skills + packages", "hosted npm-like", "2,371 of 31,371 flagged (7.6%)"],
    ["claude-plugins.dev", "claude only", "plugins + skills", "github index", "11,989 plugins · 63,065 skills"],
    ["pi.dev/packages", "pi only", "ext/skill/theme/prompt", "npm index", "5,361 packages · top 1.6M dl/mo"],
    ["opencode v2 catalog", "opencode", "skills", "http index.json", "versioned cache — most registry-ready"],
    ["mcp registry (official)", "any mcp client", "mcp servers", "metadata-only", "~9,652 servers · dns/github verify"],
  ];
  rows8.forEach((r, ri) => {
    const ry = 2.3 + ri * 0.53;
    hair(s, t8.x, ry, 7.29, `s8_tb_hr${ri}`);
    r.forEach((cell, ci) => {
      const c = t8.cols[ci];
      txt(s, cell, { x: t8.x + c.x, y: ry, w: c.w, h: 0.53, fontFace: MONO, fontSize: 8.5, bold: ci === 0 || c.blue, color: c.blue ? P.BLUE : P.INK, valign: "middle", lineSpacingMultiple: 1.05, objectName: `s8_tb_r${ri}c${ci}` });
    });
  });
  hair(s, t8.x, 2.3 + 6 * 0.53, 7.29, "s8_tb_hr6");
  // right: scale-number KPI stack (numbers are king)
  const kpi = [
    ["35.3K", "STARS · SKILLS.SH / VERCEL", P.BLUE],
    ["63,065", "SKILLS INDEXED · CLAUDE-PLUGINS.DEV", P.GREEN],
    ["1.6M", "DL/MO · PI.DEV TOP PACKAGE", P.PURPLE],
    ["9,652", "MCP SERVERS · OFFICIAL REGISTRY", P.CYAN],
  ];
  kpi.forEach((k, i) => {
    const y = 1.78 + i * 1.0;
    card(s, `s8_k${i}`, 8.6, y, 4.18, 0.9);
    txt(s, k[0], { x: 8.85, y: y + 0.08, w: 1.55, h: 0.74, fontFace: MONO, fontSize: 26, bold: true, color: k[2], valign: "middle", objectName: `s8_k${i}_n` });
    txt(s, k[1], { x: 10.45, y: y + 0.18, w: 2.2, h: 0.55, fontSize: 8.5, bold: true, color: P.MUT, charSpacing: 1, lineSpacingMultiple: 1.2, objectName: `s8_k${i}_l` });
  });
  // bottom: gap + lessons strip
  card(s, "s8_gap", MG, 5.85, 12.23, 1.12, P.GRAY_T);
  txt(s, "gap: nobody = all artifact types × all 4 harnesses — whitespace verified 2026-10-16", { x: 0.85, y: 5.97, w: 11.6, h: 0.24, fontSize: 11, bold: true, objectName: "s8_gap_t" });
  txt(s, "lessons: index beats host (mcp registry) · vendor-run wins reach (skills.sh: 35.3k stars in 9 months) · scale without scanning = debt\n(clawhub: 1,184 skills pulled in clawhavoc) · skills-only tools left plugins, mcp and hooks unsolved.",
    { x: 0.85, y: 6.26, w: 11.6, h: 0.55, fontSize: 9.5, color: P.MUT, fontFace: MONO, lineSpacingMultiple: 1.25, objectName: "s8_less" });
}

/* ============================ SLIDE 9 — SECURITY ============================== */
{
  const s = pres.addSlide();
  header(s, 9, "k09", "t09",
    "skills are untrusted instructions + code — the 2026 attack corpus is measured, so the registry's trust model\nis a day-1 input, not an afterthought");
  s.addNotes("Security: 36.82% flawed (Snyk, 3,984 sampled) / 7.6% ClawHub malicious-pattern / 80% Skill-Inject ASR / 157 of 98,380 confirmed malicious — all removed on disclosure, so takedown works. Day-1 ladder on the right.");
  // hero card: 36.82%
  card(s, "s9_hero", MG, 2.0, 4.6, 2.2, P.RED_T);
  band(s, "THE 2026 NUMBERS", 0.85, 2.18, 4.0, P.RED, "s9_hero_band");
  txt(s, "36.82%", { x: 0.8, y: 2.38, w: 4.1, h: 1.0, fontFace: MONO, fontSize: 54, bold: true, color: P.RED, objectName: "s9_hero_n" });
  txt(s, "of 3,984 sampled skills flawed — 13.4% (534) critical,\n76 confirmed malicious (snyk toxicskills, 2026-02-05)", { x: 0.85, y: 3.48, w: 4.05, h: 0.6, fontSize: 9.5, color: P.INK, lineSpacingMultiple: 1.2, objectName: "s9_hero_d" });
  // three stat cards
  const st9 = [
    ["7.6%", "clawhub malicious-pattern rate — 2,371 of 31,371 skills (independent full-registry audit)", P.AMBER],
    ["80%", "attack success rate of skill-file injections on frontier models (skill-inject benchmark, arxiv 2602.20156)", P.RED],
    ["157", "confirmed malicious of 98,380 skills — one actor > 50%; 100% removed after disclosure (arxiv 2602.06547)", P.PURPLE],
  ];
  st9.forEach((k, i) => {
    const y = 4.32 + i * 0.74;
    card(s, `s9_st${i}`, MG, y, 7.43, 0.68);
    txt(s, k[0], { x: 0.8, y: y + 0.05, w: 1.15, h: 0.58, fontFace: MONO, fontSize: 22, bold: true, color: k[2], valign: "middle", objectName: `s9_st${i}_n` });
    txt(s, k[1], { x: 2.0, y: y + 0.06, w: 5.85, h: 0.56, fontSize: 9, color: P.INK, valign: "middle", lineSpacingMultiple: 1.1, objectName: `s9_st${i}_d` });
  });
  // day-1 trust ladder card
  card(s, "s9_lad", 8.28, 2.0, 4.5, 4.48);
  band(s, "DAY-1 TRUST LADDER", 8.58, 2.2, 3.9, P.BLUE, "s9_lad_band");
  const steps = [
    "namespace verification — github oidc / dns-txt",
    "publish-time scan gate — static + llm + mcp-scan",
    "immutable hashed versions + diff on every bump",
    "agentreg.lock — urn → version → sha256 → targets",
    "trust tiers by type — hooks / mcp = review tier",
  ];
  steps.forEach((t, i) => {
    const y = 2.56 + i * 0.74;
    badge(s, 8.58, y, `0${i + 1}`, P.BLUE, `s9_lad_b${i}`, 0.4);
    txt(s, t, { x: 9.14, y: y - 0.04, w: 3.5, h: 0.62, fontSize: 10, valign: "middle", lineSpacingMultiple: 1.1, objectName: `s9_lad_t${i}` });
    if (i < 4) hair(s, 8.58, y + 0.58, 3.9, `s9_lad_hr${i}`);
  });
  // warning footnote
  txt(s, "scanning is necessary, never sufficient: unit 42 found 5 evasive skills that beat virustotal + clawscan (one padded a readme to 22 MB to blow scanner size limits).\nbadges say scanned/warn — never \u201Csafe\u201D. the agent is the postinstall script (datadog: !cmd runs pre-injection).",
    { x: MG, y: 6.62, w: 11.9, h: 0.5, fontSize: 8.5, color: P.MUT, fontFace: MONO, lineSpacingMultiple: 1.25, objectName: "s9_warn" });
}

/* ============================= SLIDE 10 — DESIGN ============================== */
{
  const s = pres.addSlide();
  header(s, 10, "k10", "t10",
    "option a (recommended): thin verified index + agentreg emitter cli — records are metadata + hashes pointing at git/npm, never hosted code");
  s.addNotes("The design: MCP-Registry-style thin verified index + agentreg CLI that emits native formats into all four harnesses. Data flow publish → verify → scan → seal → index → install → lock. Principles P1-P8 from design-unified-registry.md.");
  // flow band: 7 chips + pixel arrows
  const flow = ["PUBLISH", "VERIFY", "SCAN", "SEAL", "INDEX", "INSTALL", "LOCK"];
  let fx = MG;
  flow.forEach((f, i) => {
    fx += chip(s, fx, 1.82, f, P.INK, P.CARD, 10, `s10_f${i}`) + 0.12;
    if (i < flow.length - 1) {
      arrowH(s, fx, fx + 0.32, 2.03, P.INK, `s10_fa${i}`);
      fx += 0.44;
    }
  });
  // pipeline card
  card(s, "s10_pipe", MG, 2.55, 7.45, 3.0);
  band(s, "THE PIPELINE", 0.85, 2.73, 6.8, P.MUT, "s10_pipe_band", 10);
  kvRows(s, "s10_kv", 0.85, 3.05, 6.8, [
    { k: "publish", v: "agentreg publish — github oidc identity, never a pr" },
    { k: "verify", v: "namespace io.github.* (oauth) · dns-txt for custom" },
    { k: "scan", v: "static rules + llm review + mcp-scan · fail = unlisted" },
    { k: "seal", v: "content sha256 · immutable versions · re-scan + diff on bump" },
    { k: "index", v: "record + badges — emit 4 native catalogs + npm mirror" },
    { k: "install", v: "copy-drops + native clis — never-execute installer" },
  ], { kw: 0.95, rh: 0.385, fs: 9.5, vfs: 9 });
  // principles card (BLUE tint)
  card(s, "s10_pr", 8.2, 2.55, 4.58, 3.0, P.BLUE_T);
  band(s, "DESIGN PRINCIPLES", 8.5, 2.73, 4.0, P.BLUE, "s10_pr_band", 10);
  const pr = [
    "p1 index, don't host", "p2 emit native formats, never invent a 4th path",
    "p3 trust tiers day 1", "p4 never-execute installer",
    "p5 spec-pure core, vendor extras in overlays", "p6 copy > symlink",
    "p7 immutable versions + cross-harness lockfile", "p8 delegate scanning",
  ];
  pr.forEach((t, i) => {
    const y = 3.06 + i * 0.305;
    sq(s, 8.5, y + 0.045, 0.09, P.BLUE, `s10_pr_b${i}`);
    txt(s, t, { x: 8.68, y, w: 3.85, h: 0.3, fontSize: 9.5, valign: "middle", objectName: `s10_pr_t${i}` });
  });
  // options strip
  card(s, "s10_opt", MG, 5.75, 12.23, 1.15, P.GRAY_T);
  band(s, "FOLDED IN, NOT BUILT TWICE", 0.85, 5.9, 8, P.MUT, "s10_opt_band", 10);
  txt(s, "option b (federation of native marketplaces) becomes a distribution channel inside a · option c (npm-centric, pi model) becomes the npm\nmirror — pi reach for free, without inheriting npm typosquat risk. evidence-derived: every principle traces to a slide above.",
    { x: 0.85, y: 6.18, w: 11.6, h: 0.55, fontSize: 9.5, color: P.MUT, fontFace: MONO, lineSpacingMultiple: 1.25, objectName: "s10_opt_t" });
}

/* ======================= SLIDE 11 — ONE RECORD, 4 EMISSIONS =================== */
{
  const s = pres.addSlide();
  header(s, 11, "k11", "t11",
    "agentreg install io.github.acme/pdf-report-writer@1.4.2 — one canonical record, four native emissions");
  s.addNotes("One record, four emissions. Dual-emit for Claude (ignores .agents/), OpenCode v1/v2 key sniffing, Codex trust gating surfaced never auto-trusted, Pi content-only npm mirror. agentreg.lock is the differentiator no harness ships.");
  // four emission cards, one per harness accent (cube icon + mono emission)
  const em = [
    [ACC.claude, "copy dir → ~/.claude/skills/ + emit .claude-plugin/ marketplace repo"],
    [ACC.codex, "copy dir → ~/.agents/skills/ + .agents/plugins/marketplace.json entry"],
    [ACC.opencode, "copy dir → .opencode/skills/ + index.json catalog url in config skills[]"],
    [ACC.pi, "pi install npm:@acme/pdf-report-writer@1.4.2 — content-only npm mirror"],
  ];
  em.forEach(([A, t], i) => {
    const x = MG + i * 3.08;
    card(s, `s11_e${i}`, x, 1.78, 2.98, 2.42, A.t);
    img(s, A.cube, x + 0.25, 2.0, 0.52, `s11_cube${i}`);
    band(s, A.name, x + 0.95, 2.12, 1.9, A.a, `s11_e${i}_band`, 9.5);
    hair(s, x + 0.25, 2.72, 2.48, `s11_e${i}_hr`);
    txt(s, t, { x: x + 0.25, y: 2.85, w: 2.48, h: 1.2, fontSize: 9, fontFace: MONO, color: P.INK, lineSpacingMultiple: 1.3, objectName: `s11_e${i}_t` });
  });
  // hazards card
  card(s, "s11_hz", MG, 4.45, 12.23, 1.35);
  band(s, "HAZARDS THE EMITTERS OWN", 0.85, 4.61, 8, P.RED, "s11_hz_band", 10);
  listRows(s, "s11_hv", 0.85, 4.92, 11.6, [
    { k: "dual-emit: claude ignores .agents/ (not_planned #66352) — always also copy into ~/.claude/skills/" },
    { k: "version keys: version lives in 4 places: plugin.json · marketplace ref · index.json · npm semver" },
    { k: "codegen: hooks need generated ts plugins/extensions for opencode + pi (2 of 4)" },
  ], P.RED, { rh: 0.27, bullet: 0.09, kfs: 9.5 });
  // differentiator card (dark, terminal-flavored)
  card(s, "s11_df", MG, 5.98, 12.23, 1.02, P.DK_BG, P.INK);
  txt(s, "agentreg.lock — urn → version → sha256 → per-harness targets · no harness ships one",
    { x: 0.85, y: 6.08, w: 11.6, h: 0.28, fontFace: MONO, fontSize: 12.5, bold: true, color: "6EE7A0", objectName: "s11_lock" });
  txt(s, "committed like package-lock.json; agentreg update re-scans before updating — blast-radius pinning for every harness at once. bundle note: agent-plugins\n1.0.0 is the packaging substrate + codex catalog entry; claude gets the dual .claude-plugin/ manifest.",
    { x: 0.85, y: 6.4, w: 11.6, h: 0.5, fontSize: 8.5, color: P.DK_MUT, fontFace: MONO, lineSpacingMultiple: 1.25, objectName: "s11_lock_d" });
}

/* ============================ SLIDE 12 — ROADMAP ============================== */
{
  const s = pres.addSlide();
  header(s, 12, "k12", "t12",
    "v0 cut: skills + mcp only — the two universal payloads — across all four harnesses; everything else waits behind adapters");
  s.addNotes("Roadmap: v0 MVP by 2027-01 (skills+MCP x 4 harnesses, OIDC/DNS-TXT, scan gate, lockfile, 4 catalogs, read-only API). v1 adapters + reputation + federation. v2 signing/SLSA. Governance: neutral TSC, AAIF donation as v1 exit.");
  const cols = [
    { x: MG, acc: P.BLUE, b: "V0", head: "MVP", dates: "2026-11 → 2027-01", ls: [
      "github oidc + dns-txt namespaces", "scan gate: static + llm + mcp-scan",
      "copy installs + agentreg.lock", "4 emitted catalogs + npm mirror",
      "read-only rest api + takedown sla", "exit: ≥100 verified artifacts, installs proven on all 4 in ci"] },
    { x: 4.62, acc: P.GREEN, b: "V1", head: "ADAPTERS", dates: "2027-02 → 06", ls: [
      "hooks → ts plugins / extensions", "agents (toml + md) · commands · themes",
      "reputation + anti-gaming", "scan-on-install client hook",
      "federation openapi (hourly pulls)", "exit: ≥1,000 artifacts · ≥2 aggregators · aaif donation initiated"] },
    { x: 8.69, acc: P.PURPLE, b: "V2", head: "TRUST", dates: "2027-07 →", ls: [
      "sigstore signing + slsa provenance", "agent-plugins 1.1 alignment",
      "enterprise private mirrors", "tee publish pipeline",
      "federated audit sharing", "exit: ≥1 harness consumes signatures, spec 1.1 shipped · donation done"] },
  ];
  cols.forEach((c, i) => {
    card(s, `s12_c${i}`, c.x, 1.78, 3.87, 3.25);
    badge(s, c.x + 0.25, 2.0, c.b, c.acc, `s12_b${i}`);
    txt(s, c.head, { x: c.x + 0.82, y: 1.99, w: 1.7, h: 0.3, fontSize: 14.5, bold: true, objectName: `s12_h${i}` });
    txt(s, c.dates, { x: c.x + 0.82, y: 2.3, w: 2.9, h: 0.24, fontFace: MONO, fontSize: 10.5, bold: true, color: c.acc, objectName: `s12_d${i}` });
    hair(s, c.x + 0.25, 2.62, 3.37, `s12_hr${i}`);
    c.ls.forEach((t, j) => {
      const y = 2.72 + j * 0.375;
      sq(s, c.x + 0.25, y + 0.04, 0.09, c.acc, `s12_c${i}_b${j}`);
      txt(s, t, { x: c.x + 0.44, y, w: 3.2, h: 0.375, fontSize: 8.5, valign: "middle", lineSpacingMultiple: 1.05, objectName: `s12_c${i}_t${j}` });
    });
  });
  // governance card
  card(s, "s12_gov", MG, 5.25, 12.23, 0.72);
  band(s, "GOVERNANCE", 0.85, 5.38, 2.5, P.MUT, "s12_gov_band", 10);
  txt(s, "launch vendor-neutral tsc (agent-plugins charter clone — individual seats, no vendor majority) → pre-commit to aaif donation at v1",
    { x: 3.15, y: 5.33, w: 9.3, h: 0.62, fontSize: 10.5, bold: true, valign: "middle", objectName: "s12_gov_t" });
  // bet + risks strip
  card(s, "s12_bet", MG, 6.12, 12.23, 0.85, P.GRAY_T);
  txt(s, "bet order: skills + mcp now (all-four reach today) → plugins when claude consumes (watch 1.1) → signing only when a harness verifies\nsignatures (none does today). risks kept open: opencode v1/v2 churn, pi 0.x→1.3 churn — version-sniffing emitters +\na ci matrix against every harness release.",
    { x: 0.85, y: 6.2, w: 11.6, h: 0.72, fontSize: 9, color: P.MUT, fontFace: MONO, lineSpacingMultiple: 1.2, objectName: "s12_bet_t" });
}

/* ==================== SLIDE 13 — CLOSER + GAME SLIDE (dark) ==================== */
{
  const s = pres.addSlide();
  s.background = { color: P.DK_BG };
  s.addNotes("Closer: REGISTRY BREWING — doubles as the game slide. Voxel vending machine (flat redraw of v3 m03) brews; BLUE voxel runner; four skill-cube collectibles (C/K/O/P per harness accent); HUD hearts + timer chip. Banner 'ONE REGISTRY · EVERY AGENT' and machineCup start hidden offslide — the game engine reveals them. cfgTime/cfgScale parked at x -0.9 (v3 convention). Bet skills+MCP now, plugins next, lockfile+trust tiers are the wedge.");
  voxel(s, 12.18, 0.42, P.LBLUE, P.GREEN, P.AMBER, "s13_vx1", 0.16);
  voxel(s, 0.6, 6.55, P.AMBER, P.LBLUE, P.GREEN, "s13_vx2", 0.16);
  img(s, "k13", MG, 0.44, 0.2, "s13_kick");
  img(s, "t13", MG, 0.72, 0.52, "s13_title");
  txt(s, "the wedge nobody ships: one verified index + a lockfile + trust tiers — register once, run on every agent",
    { x: MG, y: 1.33, w: 11.45, h: 0.3, fontSize: 11, color: P.DK_MUT, objectName: "s13_spec" });
  // ---- HUD row top-left: 3 hearts + timer chip (engine-owned) ----
  for (let i = 0; i < 3; i++) img(s, "heart", 0.55 + i * 0.3, 1.78, 0.2, `heart${i + 1}`);
  rect(s, 1.62 + 0.02, 1.79 + 0.02, 1.0, 0.24, "05060A", null, null, "timeChip_sh");
  rect(s, 1.62, 1.79, 1.0, 0.24, P.DK_CARD, P.DK_LINE, 1.5, "timeChip");
  txt(s, "", { x: 1.66, y: 1.79, w: 0.92, h: 0.24, fontFace: MONO, fontSize: 8, color: P.DK_TXT, valign: "middle", objectName: "timeText" });
  // ---- three takeaways (left column) ----
  const tk = [
    ["One verified index", "oidc + dns-txt namespaces · scan gate · sealed hashes — metadata + pointers, never hosted code", P.LBLUE],
    ["agentreg.lock everywhere", "urn → version → sha256 → per-harness targets, committed like package-lock.json", P.GREEN],
    ["Trust tiers from day 1", "hooks / mcp = review tier · skills + mcp ship first, across all four harnesses", P.AMBER],
  ];
  tk.forEach((t, i) => {
    const y = 2.5 + i * 1.05;
    sq(s, MG, y + 0.06, 0.16, t[2], `s13_tk${i}_sq`);
    txt(s, t[0], { x: MG + 0.4, y, w: 6.2, h: 0.32, fontSize: 15.5, bold: true, color: "FFFFFF", objectName: `s13_tk${i}_h` });
    txt(s, t[1], { x: MG + 0.4, y: y + 0.36, w: 6.2, h: 0.55, fontSize: 10.5, color: P.DK_MUT, lineSpacingMultiple: 1.2, objectName: `s13_tk${i}_d` });
  });
  // ---- game field (center-right): machine + runner + collectible cubes ----
  img(s, "machine", 9.3, 4.55, 2.0, "machine");           // vending machine, ~1.13in wide
  img(s, "runner", 8.3, 5.45, 1.1, "runner");             // BLUE voxel runner left of it
  const arts = [["cube_claude", 2.2], ["cube_codex", 3.05], ["cube_opencode", 3.9], ["cube_pi", 4.75]];
  arts.forEach(([n, x], i) => img(s, n, x, 6.05, 0.35, `art${i + 1}`)); // collectibles
  // hidden game shapes (engine reveals): banner + machineCup, parked offslide
  const bw = 0.26 * (MAN.banner.w / MAN.banner.h);
  img(s, "banner", -(bw + 0.5), 4.0, 0.26, "banner");
  img(s, "cup", -0.9, 6.0, 0.26, "machineCup");
  // cfg shapes (v3 convention: parked at x -0.9)
  txt(s, "90", { x: -0.9, y: 0.3, w: 0.5, h: 0.2, fontFace: MONO, fontSize: 8, color: P.DK_MUT, objectName: "cfgTime" });
  txt(s, "1.10", { x: -0.9, y: 0.55, w: 0.5, h: 0.2, fontFace: MONO, fontSize: 8, color: P.DK_MUT, objectName: "cfgScale" });
  // sources + counter
  txt(s, "sources: 8-file corpus in agents-unified-registry/ · every number verified 2026-10-16 · deck: nano-super-slides-v4\nnext: agentreg v0 — skills + mcp × 4 harnesses. one registry, every agent.",
    { x: MG, y: 6.95, w: 9.5, h: 0.45, fontSize: 9, color: P.DK_MUT, fontFace: MONO, lineSpacingMultiple: 1.25, objectName: "s13_src" });
  txt(s, "13 / 13", { x: 12.1, y: 7.09, w: 0.7, h: 0.25, fontFace: MONO, fontSize: 9.5, color: P.DK_MUT, align: "right", objectName: "s13_pg" });
}

pres.writeFile({ fileName: "nano-super-agent-registry.pptx" })
  .then(() => console.log("WROTE nano-super-agent-registry.pptx (13 slides)"));
