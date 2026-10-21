/* nano-super v5 — "Building Our Own Registry" per-harness integration guide (45 slides).
 *
 * Same v1 pixel/voxel house theme as v4, but rebuilt for readability and
 * CONSISTENCY:
 *   - pixel bitmaps are HEADINGS ONLY (kickers/titles/cover); all body text
 *     is native Segoe UI; Consolas is used only for real code (paths,
 *     manifests, CLI, registry fields)
 *   - slides 5-44 are TEN per-surface sections, one per matrix row (SKILLS
 *     · COMMANDS · SUBAGENTS · HOOKS · PLUGINS · MCP · LSP · CUSTOM TOOLS ·
 *     STATUS LINE · EXEC POLICY), four slides each: BANNER (registry
 *     minimum + the matrix row) · STANDARDS (spec state) · CLAUDE + CODEX
 *     pair · OPENCODE + PI pair
 *   - every topic card answers the same contract: WHAT · WHERE · FORMAT ·
 *     MANAGE · AUTO-UPDATE · VERDICT (+ REGISTRY EMISSION block); pair
 *     slides reuse the ONE topicCard() grid — only the accent + content
 *     differ (fixes the v4 hero-metric inconsistency)
 *   - verdict chips are semantic + deck-wide: COPY-AS-IS green · TRANSLATE
 *     blue · OVERLAY amber · NO SURFACE gray
 *   - slide 4 translation matrix is DERIVED from the content files, so it
 *     can never drift from the sections
 *
 * BUILD ORDER (sprites + content MUST exist first):
 *   1. ..\.venv\Scripts\python gen_sprites_v5.py  -> assets\ + manifest_v5.json
 *   2. content\content-{claude,codex,opencode,pi}.json + content\banners.json + content\standards.json (extraction agents)
 *   3. NODE_PATH=$(npm root -g) node build_v5.js
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");

let MAN;
try {
  MAN = JSON.parse(fs.readFileSync("assets/manifest_v5.json", "utf8"));
} catch (e) {
  throw new Error("assets/manifest_v5.json missing or unreadable — run gen_sprites_v5.py first");
}

// ---------- palette (v1 style guide, exact — same as v4) ----------
const P = {
  BG: "F7F6F2", INK: "1B1D22", MUT: "5C6068", CARD: "FFFFFF", HAIR: "E3E1DA",
  BLUE: "2F6FED", GREEN: "16A34A", AMBER: "D97706", RED: "DC2626", PURPLE: "7C3AED", CYAN: "0E7490",
  BLUE_T: "E7EEFD", GREEN_T: "E5F5EA", AMBER_T: "FBEEDD", RED_T: "FBE5E5", PURPLE_T: "EFE9FB", CYAN_T: "E0F2F7", GRAY_T: "EFEFEA",
  DK_BG: "1B1D22", DK_CARD: "24272F", DK_LINE: "3C414C", DK_MUT: "9AA0AB", DK_TXT: "E9EBEE",
  LBLUE: "7CB0FF",
};
const ACC = {
  claude:   { a: P.AMBER,  t: P.AMBER_T,  cube: "cube_claude",   name: "CLAUDE CODE" },
  codex:    { a: P.GREEN,  t: P.GREEN_T,  cube: "cube_codex",    name: "CODEX" },
  opencode: { a: P.BLUE,   t: P.BLUE_T,   cube: "cube_opencode", name: "OPENCODE" },
  pi:       { a: P.PURPLE, t: P.PURPLE_T, cube: "cube_pi",       name: "PI" },
};
const VC = { // verdict chip colors — semantic, deck-wide
  "COPY-AS-IS": [P.GREEN, P.GREEN_T],
  "TRANSLATE":  [P.BLUE,  P.BLUE_T],
  "OVERLAY":    [P.AMBER, P.AMBER_T],
  "NO SURFACE": [P.MUT,   P.GRAY_T],
};
const W = 13.333, H = 7.5, MG = 0.55, TOTAL = 45;
const SANS = "Segoe UI", MONO = "Consolas";
const SH = 0.055; // hard-shadow offset (in)

const pad2 = (n) => String(n).padStart(2, "0");

// ---------- content loading + schema contract ----------
const GROUPS = [
  { title: "SKILLS & COMMANDS",        topics: ["SKILLS", "COMMANDS"] },
  { title: "SUBAGENTS & HOOKS",         topics: ["SUBAGENTS", "HOOKS"] },
  { title: "PLUGINS & MARKETPLACES",    topics: ["PLUGINS"] },
  { title: "MCP · LSP · CUSTOM TOOLS",  topics: ["MCP", "LSP", "CUSTOM TOOLS"] },
  { title: "STATUS LINE & EXEC POLICY", topics: ["STATUS LINE", "EXEC POLICY"] },
];
const CARD_KEYS = ["topic", "what", "where", "format", "manage", "autoupdate", "verdict", "why", "emission"];
const BUDGETS = { what: 78, where: 62, format: 62, manage: 62, autoupdate: 78, why: 62 };

function loadHarness(key) {
  const path = `content/content-${key}.json`;
  let h;
  try {
    h = JSON.parse(fs.readFileSync(path, "utf8"));
  } catch (e) {
    throw new Error(`${path} missing/unreadable — waiting on extraction agent`);
  }
  const E = (m) => { throw new Error(`${path}: ${m}`); };
  if (!ACC[h.accentKey]) E(`bad accentKey ${h.accentKey}`);
  if (!h.intro || !h.intro.what || !h.intro.trust) E("missing intro.what/trust");
  if (!Array.isArray(h.slides) || h.slides.length !== 5) E("expected exactly 5 slide groups");
  h.slides.forEach((sl, gi) => {
    if (sl.title !== GROUPS[gi].title) E(`group ${gi + 1} title "${sl.title}" != "${GROUPS[gi].title}"`);
    if (!Array.isArray(sl.cards) || sl.cards.length !== GROUPS[gi].topics.length) E(`group ${gi + 1}: expected ${GROUPS[gi].topics.length} cards`);
    sl.cards.forEach((cd, ci) => {
      const got = Object.keys(cd).sort().join(",");
      if (got !== [...CARD_KEYS].sort().join(",")) E(`card ${gi + 1}.${ci + 1} keys "${got}" != contract`);
      if (cd.topic !== GROUPS[gi].topics[ci]) E(`card ${gi + 1}.${ci + 1} topic "${cd.topic}" != "${GROUPS[gi].topics[ci]}"`);
      if (!VC[cd.verdict]) E(`card ${cd.topic}: bad verdict "${cd.verdict}"`);
      if (!Array.isArray(cd.emission) || cd.emission.length < 2 || cd.emission.length > 3) E(`card ${cd.topic}: emission must be 2-3 lines`);
      for (const [k, max] of Object.entries(BUDGETS)) {
        if (typeof cd[k] !== "string" || !cd[k].length) E(`card ${cd.topic}: empty ${k}`);
        if (cd[k].length > max) console.warn(`  WARN ${key}/${cd.topic}: ${k} ${cd[k].length}>${max} chars`);
      }
    });
  });
  return h;
}
const CONTENT = ["claude", "codex", "opencode", "pi"].map(loadHarness);
console.log(`content: 4 harness files validated against the card contract`);

// per-surface sections (slides 5-44): SURFACES is the exact matrix row
// order — section i = banner (registry minimum) · standards · claude+codex
// pair · opencode+pi pair
const SURFACES = ["SKILLS", "COMMANDS", "SUBAGENTS", "HOOKS", "PLUGINS", "MCP", "LSP", "CUSTOM TOOLS", "STATUS LINE", "EXEC POLICY"];
const HZ_ORDER = ["claude", "codex", "opencode", "pi"];

function loadBanners() {
  let d;
  try {
    d = JSON.parse(fs.readFileSync("content/banners.json", "utf8"));
  } catch (e) {
    throw new Error("content/banners.json missing/unreadable — waiting on extraction agent");
  }
  const E = (m) => { throw new Error(`banners.json: ${m}`); };
  if (!Array.isArray(d.banners) || d.banners.length !== 10) E("expected exactly 10 banners");
  d.banners.forEach((b, i) => {
    if (b.surface !== SURFACES[i]) E(`banner ${i + 1} surface "${b.surface}" != "${SURFACES[i]}"`);
    for (const k of ["surface", "tagline", "why", "rowSummary", "update"]) {
      if (typeof b[k] !== "string" || !b[k].length) E(`${b.surface}: missing ${k}`);
    }
    if (!Array.isArray(b.minimum) || b.minimum.length !== 6) E(`${b.surface}: minimum must have 6 rows`);
    b.minimum.forEach((r) => { if (!r.k || !r.v) E(`${b.surface}: minimum row missing k/v`); });
  });
  return d.banners;
}
const BANNERS = loadBanners();
console.log("content: banners.json validated (10 registry-minimum banners)");

function loadStandards() {
  let d;
  try {
    d = JSON.parse(fs.readFileSync("content/standards.json", "utf8"));
  } catch (e) {
    throw new Error("content/standards.json missing/unreadable — waiting on extraction agent");
  }
  const E = (m) => { throw new Error(`standards.json: ${m}`); };
  if (!Array.isArray(d.standards) || d.standards.length !== 10) E("expected exactly 10 standards");
  d.standards.forEach((st, i) => {
    if (st.surface !== SURFACES[i]) E(`standards ${i + 1} surface "${st.surface}" != "${SURFACES[i]}"`);
    const D = st.detail || {};
    for (const k of ["fields", "rules", "harness", "gaps", "stance"]) {
      if (!D[k] || (typeof D[k] === "object" && !D[k].length)) E(`${st.surface}: missing detail.${k}`);
    }
    if (!Array.isArray(D.fields) || D.fields.length !== 6) E(`${st.surface}: fields must have 6 rows`);
    D.fields.forEach((f) => { if (!f.k || !f.v) E(`${st.surface}: field row missing k/v`); });
    if (!Array.isArray(D.rules) || D.rules.length !== 4) E(`${st.surface}: rules must have 4 rows`);
    if (!Array.isArray(D.harness) || D.harness.length !== 4) E(`${st.surface}: harness must have 4 rows`);
    D.harness.forEach((h, hi) => {
      if (h.harness !== HZ_ORDER[hi]) E(`${st.surface}: harness row ${hi + 1} out of order`);
      if (typeof h.note !== "string" || !h.note.length) E(`${st.surface}: harness row ${hi + 1} missing note`);
    });
    if (!Array.isArray(D.gaps) || D.gaps.length !== 3) E(`${st.surface}: gaps must have 3 rows`);
  });
  return d.standards;
}
const STANDARDS = loadStandards();
console.log("content: standards.json validated (10 specification states)");

// find one harness's card for a surface — shared by the matrix slide + banners
function findCard(hz, topic) {
  for (const sl of hz.slides) {
    const c = sl.cards.find((x) => x.topic === topic);
    if (c) return c;
  }
  throw new Error(`no card ${topic} in ${hz.harness}`);
}

// ---------- helpers (v4 pattern, objectName-threaded) ----------
const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "aryan-rajoria";
pres.title = "Building Our Own Registry — nano-super v5";

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
function card(s, tag, x, y, w, h, fill, line, lw) {
  rect(s, x + SH, y + SH, w, h, P.INK, null, null, `${tag}_sh`);
  rect(s, x, y, w, h, fill || P.CARD, line || P.INK, lw, tag);
}
function sq(s, x, y, size, color, tag) { rect(s, x, y, size, size, color, null, null, tag); }
function voxel(s, x, y, c1, c2, c3, tag, size) {
  const z = size || 0.14;
  sq(s, x, y, z, c1, `${tag}_v1`);
  sq(s, x + z + 0.03, y, z, c2, `${tag}_v2`);
  sq(s, x, y + z + 0.03, z, c3, `${tag}_v3`);
}
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
function band(s, t, x, y, w, color, tag, fs) {
  txt(s, t, { x, y, w, h: 0.24, fontSize: fs || 10.5, bold: true, color, charSpacing: 2, objectName: tag });
}
// sans chip (readable): used for flow labels + slide-2 group rail
function schip(s, x, y, t, fg, bg, fs, tag, border) {
  const w = 0.26 + t.length * fs * 0.0092;
  const h = fs * 2.0 / 72 + 0.12;
  rect(s, x + 0.03, y + 0.03, w, h, P.INK, null, null, `${tag}_sh`);
  rect(s, x, y, w, h, bg || P.CARD, border || P.INK, 1.4, tag);
  txt(s, t, { x, y, w, h, fontSize: fs, bold: true, color: fg, align: "center", valign: "middle", charSpacing: 0.5, objectName: `${tag}_t` });
  return w;
}
// verdict chip — semantic colors, deck-wide (chapters + matrix + legend)
function verChip(s, x, y, verdict, tag, fs) {
  fs = fs || 9;
  const [c, t] = VC[verdict];
  const w = 0.26 + verdict.length * fs * 0.0092;
  const h = fs * 2.0 / 72 + 0.12;
  rect(s, x + 0.03, y + 0.03, w, h, P.INK, null, null, `${tag}_sh`);
  rect(s, x, y, w, h, t, c, 1.25, tag);
  txt(s, verdict, { x, y, w, h, fontSize: fs, bold: true, color: c, align: "center", valign: "middle", charSpacing: 0.5, objectName: `${tag}_t` });
  return w;
}
// standard light-slide furniture; optional harness cube under the voxel
function header(s, n, kick, title, spec, cube) {
  s.background = { color: P.BG };
  voxel(s, 12.18, 0.42, P.BLUE, P.GREEN, P.AMBER, `s${n}_vx`);
  if (cube) img(s, cube, 12.2, 0.95, 0.42, `s${n}_cube`);
  img(s, kick, MG, 0.44, 0.2, `s${n}_kick`);
  img(s, title, MG, 0.72, 0.52, `s${n}_title`);
  txt(s, spec, { x: MG, y: 1.33, w: 11.45, h: 0.26, fontSize: 11, color: P.MUT, objectName: `s${n}_spec` });
  txt(s, `${pad2(n)} / ${TOTAL}`, { x: 12.1, y: 7.09, w: 0.7, h: 0.25, fontFace: MONO, fontSize: 9.5, color: P.MUT, align: "right", objectName: `s${n}_pg` });
}
// mono width estimate (in inches) — Consolas advance ~0.55em
const monoW = (t, fs) => t.length * fs * 0.55 / 72;

// ============================== SLIDE 1 — COVER (dark) ==============================
{
  const s = pres.addSlide();
  s.background = { color: P.DK_BG };
  s.addNotes("Cover. v5 refocus: not the market survey (that is v4) — the integration guide. For each of the 4 harnesses the same 10 surfaces answer the same 6 facts; the deck defines the registry data model as it goes.");
  voxel(s, 12.18, 0.42, P.LBLUE, P.GREEN, P.AMBER, "s1_vx1", 0.16);
  voxel(s, 0.6, 6.5, P.AMBER, P.LBLUE, P.GREEN, "s1_vx2", 0.16);
  img(s, "ck", MG, 0.95, 0.2, "s1_kick");
  img(s, "ct1", MG, 1.45, 0.66, "s1_title1");
  img(s, "ct2", MG, 2.25, 0.66, "s1_title2");
  txt(s, "One registry, four harnesses — the per-harness integration guide.", { x: MG, y: 3.3, w: 8.6, h: 0.4, fontSize: 19, color: "C9CDD4", objectName: "s1_sub" });
  txt(s, "Every harness chapter covers the same ten surfaces, and every surface answers the same six questions —\nwhat it is, where it lives, how it is managed, whether it can auto-update, and what our registry must emit.",
    { x: MG, y: 3.85, w: 8.4, h: 0.75, fontSize: 14, color: P.DK_TXT, lineSpacingMultiple: 1.25, objectName: "s1_desc" });
  const stats = ["4 HARNESSES", "10 SURFACES", "6 FACTS PER SURFACE", "1 RECORD"];
  let cx = MG;
  stats.forEach((st, i) => {
    const w = 0.3 + st.length * 0.105;
    rect(s, cx + 0.04, 5.0 + 0.04, w, 0.52, "05060A", null, null, `s1_chip${i}_sh`);
    rect(s, cx, 5.0, w, 0.52, P.DK_CARD, P.DK_LINE, 1.5, `s1_chip${i}`);
    txt(s, st, { x: cx, y: 5.0, w, h: 0.52, fontSize: 12, bold: true, color: P.DK_TXT, align: "center", valign: "middle", charSpacing: 0.5, objectName: `s1_chip${i}_t` });
    cx += w + 0.25;
  });
  txt(s, "sources: agents-unified-registry corpus — claude-code · codex · opencode · pi · cross-spec · prior-art · security · design (verified 2026-10-16)",
    { x: MG, y: 5.85, w: 11.5, h: 0.3, fontSize: 10, color: P.DK_MUT, fontFace: MONO, objectName: "s1_src" });
  img(s, "runner", 9.85, 2.2, 2.9, "s1_runner");
  const cubes = [["cube_claude", 9.9], ["cube_codex", 10.75], ["cube_opencode", 11.6], ["cube_pi", 12.45]];
  cubes.forEach(([n, x], i) => img(s, n, x, 5.35, 0.42, `s1_cube${i}`));
  txt(s, "github.com/aryan-rajoria/agents-unified-registry", { x: MG, y: 6.95, w: 6.5, h: 0.3, fontSize: 11, color: P.DK_MUT, fontFace: MONO, objectName: "s1_repo" });
  txt(s, "OCTOBER 2026", { x: 10.9, y: 6.95, w: 1.9, h: 0.3, fontSize: 11, color: P.DK_MUT, fontFace: MONO, align: "right", objectName: "s1_date" });
}

// ========================= SLIDE 2 — HOW TO READ (card contract) =========================
{
  const s = pres.addSlide();
  header(s, 2, "k02", "t02",
    "every surface, in every harness, answers the same six questions — ten sections, one per matrix row, four slides each");
  s.addNotes("The notation slide. Six facts per card, four verdicts, honest auto-update framing, and the four-slide section structure. This is the consistency contract for all 40 pair-slide cards.");
  // left: the six facts
  card(s, "s2_six", MG, 1.62, 6.55, 4.1);
  band(s, "THE SIX FACTS ON EVERY CARD", 0.85, 1.8, 5.9, P.BLUE, "s2_six_band");
  const facts = [
    ["WHAT", "what this surface is, in plain words"],
    ["WHERE", "the directories and scopes it can live in"],
    ["FORMAT", "the manifest or file shape it uses"],
    ["MANAGE", "the built-in commands that install or manage it"],
    ["AUTO-UPDATE", "whether the harness updates it by itself — and through what"],
    ["VERDICT + EMISSION", "copy · translate · overlay · no surface — and the exact fields our registry emits"],
  ];
  facts.forEach((f, i) => {
    const ry = 2.14 + i * 0.58;
    sq(s, 0.85, ry + 0.08, 0.12, P.BLUE, `s2_six_b${i}`);
    txt(s, f[0], { x: 1.1, y: ry, w: 1.85, h: 0.28, fontSize: 11.5, bold: true, valign: "middle", objectName: `s2_six_k${i}` });
    txt(s, f[1], { x: 2.95, y: ry, w: 3.95, h: 0.54, fontSize: 10, color: P.MUT, valign: "middle", lineSpacingMultiple: 1.1, objectName: `s2_six_d${i}` });
    if (i < facts.length - 1) hair(s, 0.85, ry + 0.56, 5.95, `s2_six_hr${i}`);
  });
  // right top: the four verdicts
  card(s, "s2_vd", 7.35, 1.62, 5.43, 2.5);
  band(s, "THE FOUR VERDICTS", 7.65, 1.8, 4.8, P.MUT, "s2_vd_band");
  const vds = [
    ["COPY-AS-IS", "drops in with zero changes"],
    ["TRANSLATE", "the registry converts the format first"],
    ["OVERLAY", "portable core + harness-specific extra fields"],
    ["NO SURFACE", "no native target — the record marks it unsupported"],
  ];
  vds.forEach((v, i) => {
    const ry = 2.18 + i * 0.46;
    verChip(s, 7.65, ry, v[0], `s2_vd_c${i}`, 8.5);
    txt(s, v[1], { x: 9.05, y: ry, w: 3.55, h: 0.34, fontSize: 9.5, color: P.INK, valign: "middle", objectName: `s2_vd_t${i}` });
  });
  // right bottom: auto-update honestly
  card(s, "s2_au", 7.35, 4.27, 5.43, 1.45, P.GRAY_T);
  band(s, "AUTO-UPDATE, HONESTLY", 7.65, 4.43, 4.8, P.MUT, "s2_au_band", 10);
  txt(s, "Only bundles update themselves — claude plugin marketplaces, codex marketplace upgrade, opencode plugin update, pi update.\nSkills, MCP servers, subagents and hooks are file-drops in all four. Version pinning is the registry's job.",
    { x: 7.65, y: 4.72, w: 4.85, h: 0.9, fontSize: 9.5, color: P.INK, lineSpacingMultiple: 1.2, objectName: "s2_au_t" });
  // bottom: the four-slide section rail
  card(s, "s2_rail", MG, 5.87, 12.23, 1.1, P.BLUE_T);
  band(s, "TEN SECTIONS · ONE PER MATRIX ROW · FOUR SLIDES EACH", 0.85, 6.03, 8, P.BLUE, "s2_rail_band", 10);
  const rail = ["1 BANNER", "2 STANDARDS", "3 CLAUDE + CODEX", "4 OPENCODE + PI"];
  let rx = 0.85;
  rail.forEach((t, i) => {
    rx += schip(s, rx, 6.38, t, P.INK, P.CARD, 9, `s2_rail_c${i}`) + 0.12;
    if (i < rail.length - 1) {
      arrowH(s, rx, rx + 0.3, 6.57, P.INK, `s2_rail_a${i}`);
      rx += 0.42;
    }
  });
}

// ==================== SLIDE 3 — ONE RECORD · 4 EMISSIONS (data model) ====================
{
  const s = pres.addSlide();
  header(s, 3, "k03", "t03",
    "the registry stores one canonical record per artifact — every chapter card fills in this record's install.<harness> fields");
  s.addNotes("The data model, condensed from v4's design + emission slides: artifact-record.json (identity/version/payload+overlays/compat/trust/install), the publish-to-lock pipeline, and agentreg.lock as the missing updater.");
  // left: canonical record
  card(s, "s3_rec", MG, 1.62, 6.45, 4.55);
  band(s, "THE CANONICAL RECORD — artifact-record.json", 0.85, 1.8, 5.9, P.BLUE, "s3_rec_band", 9.5);
  txt(s, [
    "identity        urn: io.github.acme.pdf-writer",
    "                type: skill|mcp|agent|command|hook|plugin",
    "version         semver + contentSha256 seal — immutable",
    "payload         layout: agent-plugins/1.0.0",
    "                overlays: claude · codex · opencode · pi",
    "compatibility   harness map + requires",
    "trust           scan results · capabilities · egress",
    "install         per-harness emission — the chapters",
  ].join("\n"), { x: 0.85, y: 2.14, w: 5.85, h: 1.75, fontFace: MONO, fontSize: 9.5, color: P.INK, lineSpacingMultiple: 1.35, objectName: "s3_rec_json" });
  hair(s, 0.85, 4.05, 5.85, "s3_rec_hr");
  const rec = [
    "a spec-pure core works in all four harnesses today",
    "vendor extras live in overlays — never in forks",
    "one record, four native emissions, zero new paths",
  ];
  rec.forEach((t, i) => {
    const ry = 4.2 + i * 0.56;
    sq(s, 0.85, ry + 0.07, 0.11, P.BLUE, `s3_rec_b${i}`);
    txt(s, t, { x: 1.08, y: ry, w: 5.6, h: 0.5, fontSize: 10.5, valign: "middle", objectName: `s3_rec_t${i}` });
  });
  // right top: pipeline (two rows of chips + arrows)
  card(s, "s3_pipe", 7.25, 1.62, 5.53, 1.75);
  band(s, "THE PIPELINE", 7.55, 1.78, 4.6, P.MUT, "s3_pipe_band", 10);
  const rows = [["PUBLISH", "VERIFY", "SCAN", "SEAL"], ["INDEX", "INSTALL", "LOCK"]];
  rows.forEach((row, r) => {
    let px = 7.55;
    const py = 2.14 + r * 0.55;
    row.forEach((f, i) => {
      px += schip(s, px, py, f, P.INK, P.CARD, 9, `s3_pipe_c${r}_${i}`) + 0.1;
      if (i < row.length - 1) {
        arrowH(s, px, px + 0.28, py + 0.19, P.INK, `s3_pipe_a${r}_${i}`);
        px += 0.4;
      }
    });
  });
  // right bottom: agentreg.lock (dark card)
  card(s, "s3_lock", 7.25, 3.52, 5.53, 2.65, P.DK_BG, P.INK);
  band(s, "THE MISSING UPDATER — agentreg.lock", 7.55, 3.7, 4.9, P.LBLUE, "s3_lock_band", 9.5);
  txt(s, "urn → version → sha256 → per-harness targets", { x: 7.55, y: 4.02, w: 4.95, h: 0.28, fontFace: MONO, fontSize: 11, bold: true, color: "6EE7A0", objectName: "s3_lock_line" });
  txt(s, "Committed like package-lock.json. agentreg update re-scans an artifact before bumping it — one pin, four harnesses at once.\nNo harness ships a lockfile. This is the wedge.",
    { x: 7.55, y: 4.42, w: 4.95, h: 1.0, fontSize: 10.5, color: P.DK_TXT, lineSpacingMultiple: 1.25, objectName: "s3_lock_t" });
  txt(s, "auto-update row on every card → what the lock has to own", { x: 7.55, y: 5.62, w: 4.95, h: 0.3, fontSize: 9, italic: true, color: P.DK_MUT, objectName: "s3_lock_note" });
  // bottom strip
  card(s, "s3_note", MG, 6.32, 12.23, 0.72, P.GRAY_T);
  txt(s, "every chapter card ends with a REGISTRY EMISSION block — those mono lines are the fields this record carries.\nThe sections are the matrix rows; this slide is the record.",
    { x: 0.85, y: 6.42, w: 11.6, h: 0.52, fontSize: 10, color: P.MUT, lineSpacingMultiple: 1.2, objectName: "s3_note_t" });
}

// ===================== SLIDE 4 — TRANSLATION MATRIX (derived, user-moved from 24) =====================
{
  const s = pres.addSlide();
  header(s, 4, "k04", "t04",
    "ten surfaces × four harnesses at a glance — every row opens a four-slide section next: banner · standards · claude+codex · opencode+pi");
  s.addNotes("The cheat sheet (user moved it to slide 4 on 2026-10-20). Verdict chips per surface per harness, plus the auto-update dot (green = the harness can update this artifact type itself). Derived at build time from the four content files. Every row opens a four-slide section on slides 5-44: banner (registry minimum), standards (spec state), then the harnesses as claude+codex and opencode+pi card pairs.");
  card(s, "s04_mx", MG, 1.62, 12.23, 4.62);
  const tx = 0.85;
  const colW = 2.44, colX = (i) => 2.42 + i * 2.52;
  // header row
  txt(s, "SURFACE", { x: tx, y: 1.8, w: 1.5, h: 0.24, fontSize: 8.5, bold: true, color: P.MUT, charSpacing: 1.5, objectName: "s04_ch0" });
  CONTENT.forEach((hz, i) => txt(s, ACC[hz.accentKey].name, { x: colX(i), y: 1.8, w: colW, h: 0.24, fontSize: 9, bold: true, color: ACC[hz.accentKey].a, align: "center", charSpacing: 1, objectName: `s04_ch${i + 1}` }));
  // rows: canonical topic order across groups
  const allTopics = GROUPS.flatMap((g, gi) => CONTENT[0].slides[gi].cards.map((c) => c.topic));
  allTopics.forEach((topic, ri) => {
    const ry = 2.14 + ri * 0.402;
    hair(s, tx, ry, 11.68, `s04_hr${ri}`);
    txt(s, topic, { x: tx, y: ry, w: 1.5, h: 0.4, fontFace: MONO, fontSize: 8.5, bold: true, valign: "middle", objectName: `s04_r${ri}_lab` });
    CONTENT.forEach((hz, i) => {
      const cd = findCard(hz, topic);
      const chw = 0.26 + cd.verdict.length * 7 * 0.0092;
      const dotX = colX(i) + (colW + chw + 0.16) / 2 + 0.06;
      verChip(s, colX(i) + (colW - chw - 0.16) / 2, ry + 0.07, cd.verdict, `s04_r${ri}c${i}`, 7);
      sq(s, dotX, ry + 0.165, 0.075, /^y/i.test(cd.autoupdate) ? P.GREEN : "C7CAD1", `s04_r${ri}d${i}`);
    });
  });
  hair(s, tx, 2.14 + 10 * 0.402, 11.68, "s04_hr10");
  // bottom strip: legend + the three headline answers
  card(s, "s04_key", MG, 6.38, 12.23, 0.68, P.GRAY_T);
  sq(s, 0.85, 6.6, 0.09, P.GREEN, "s04_dot1");
  txt(s, "= updates itself once installed", { x: 1.0, y: 6.5, w: 2.3, h: 0.3, fontSize: 9, color: P.MUT, valign: "middle", objectName: "s04_lg1" });
  sq(s, 3.35, 6.6, 0.09, "C7CAD1", "s04_dot2");
  txt(s, "= manual — the lockfile owns updates", { x: 3.5, y: 6.5, w: 2.9, h: 0.3, fontSize: 9, color: P.MUT, valign: "middle", objectName: "s04_lg2" });
  txt(s, "skills: overlay everywhere, translate only metadata · mcp: json everywhere except codex toml · only plugins self-update — lockfile covers the rest",
    { x: 6.6, y: 6.5, w: 5.9, h: 0.44, fontSize: 9, bold: true, color: P.INK, valign: "middle", lineSpacingMultiple: 1.1, objectName: "s04_take" });
}

// ========= SLIDES 5-44 — TEN PER-SURFACE SECTIONS (matrix-row order) =========
// Section i (1-based) = slides 5+4(i-1)..8+4(i-1), one per matrix row:
// BANNER (registry minimum + the matrix row) · STANDARDS (spec state) ·
// CLAUDE + CODEX pair · OPENCODE + PI pair (pair slides reuse topicCard()).

function bannerSlide(n, b, i) {
  const s = pres.addSlide();
  header(s, n, `skb${i}`, `srf${i}`, b.tagline);
  s.addNotes(`Section ${i}/10 banner: ${b.surface} — registry minimum (what we store), the matrix row (verdict + auto-update dot per harness), and this surface's update posture.`);
  // left: the registry minimum
  card(s, `s${n}_min`, MG, 1.62, 6.2, 4.55);
  band(s, "REGISTRY MINIMUM — WHAT WE STORE", 0.85, 1.78, 5.6, P.BLUE, `s${n}_mb`, 9.5);
  b.minimum.forEach((r, j) => {
    const ry = 2.1 + j * 0.42;
    txt(s, r.k, { x: 0.85, y: ry, w: 1.6, h: 0.42, fontFace: MONO, fontSize: 9, bold: true, valign: "middle", objectName: `s${n}_mk${j}` });
    txt(s, r.v, { x: 2.45, y: ry, w: 3.5, h: 0.42, fontFace: MONO, fontSize: 8.5, color: P.INK, valign: "middle", objectName: `s${n}_mv${j}` });
    hair(s, 0.85, ry + 0.42, 5.6, `s${n}_mhr${j}`);
  });
  txt(s, b.why, { x: 0.85, y: 5.45, w: 5.6, h: 0.6, fontSize: 9.5, italic: true, color: P.MUT, lineSpacingMultiple: 1.15, objectName: `s${n}_mwhy` });
  // right top: the matrix row, derived from the harness cards
  card(s, `s${n}_row`, 7.0, 1.62, 5.78, 3.4);
  band(s, "THE MATRIX ROW", 7.3, 1.78, 5.2, P.MUT, `s${n}_rb`);
  CONTENT.forEach((hz, j) => {
    const A = ACC[hz.accentKey];
    const cd = findCard(hz, b.surface);
    const ry = 2.12 + j * 0.56;
    sq(s, 7.3, ry + 0.22, 0.12, A.a, `s${n}_rb${j}`);
    txt(s, A.name, { x: 7.54, y: ry, w: 1.45, h: 0.56, fontSize: 9.5, bold: true, valign: "middle", objectName: `s${n}_rk${j}` });
    const chw = 0.26 + cd.verdict.length * 7 * 0.0092;
    verChip(s, 9.05, ry + 0.12, cd.verdict, `s${n}_rc${j}`, 7);
    sq(s, 9.05 + chw + 0.12, ry + 0.24, 0.075, /^y/i.test(cd.autoupdate) ? P.GREEN : "C7CAD1", `s${n}_rd${j}`);
  });
  hair(s, 7.3, 2.12 + 4 * 0.56, 5.2, `s${n}_rhr`);
  txt(s, b.rowSummary, { x: 7.3, y: 4.52, w: 5.2, h: 0.45, fontSize: 9.5, color: P.MUT, lineSpacingMultiple: 1.15, objectName: `s${n}_rsum` });
  // right bottom: auto-update for this surface
  card(s, `s${n}_au`, 7.0, 5.17, 5.78, 1.7, P.GRAY_T);
  band(s, "AUTO-UPDATE FOR THIS SURFACE", 7.3, 5.33, 5.2, P.MUT, `s${n}_ab`, 10);
  txt(s, b.update, { x: 7.3, y: 5.64, w: 5.2, h: 1.15, fontSize: 10, color: P.INK, lineSpacingMultiple: 1.2, objectName: `s${n}_at` });
  // bottom left: this section's four slides (current highlighted)
  card(s, `s${n}_sec`, MG, 5.17, 6.2, 1.7, P.BLUE_T);
  band(s, "THIS SECTION", 0.85, 5.33, 5.0, P.BLUE, `s${n}_secb`, 10);
  const steps = ["BANNER", "STANDARDS", "CLAUDE + CODEX", "OPENCODE + PI"];
  const chipW = (t) => 0.26 + t.length * 9 * 0.0092;
  const withArrows = steps.reduce((a, t) => a + chipW(t), 0) + steps.length * 0.12 + (steps.length - 1) * 0.42 <= 5.6;
  let sx = 0.85;
  steps.forEach((t, j) => {
    const cur = j === 0;
    sx += schip(s, sx, 5.68, t, cur ? "FFFFFF" : P.INK, cur ? P.BLUE : P.CARD, 9, `s${n}_sc${j}`, cur ? P.BLUE : P.INK) + 0.12;
    if (withArrows && j < steps.length - 1) {
      arrowH(s, sx, sx + 0.3, 5.865, P.INK, `s${n}_sa${j}`);
      sx += 0.42;
    }
  });
  txt(s, "four slides per surface — spec state, then the harnesses in two pairs",
    { x: 0.85, y: 6.32, w: 5.6, h: 0.25, fontSize: 9, color: P.MUT, objectName: `s${n}_sect` });
}

function standardsSlide(n, st, i) {
  const D = st.detail;
  const s = pres.addSlide();
  header(s, n, `sks${i}`, `st${i}`,
    `the ${st.surface.toLowerCase()} specification state — fields, rules, how the four diverge, and what the registry does about it`);
  s.addNotes(`Section ${i}/10 standards: ${st.surface} — fields, hard rules, per-harness divergence, gaps, registry stance.`);
  // left: the fields + hard rules
  card(s, `s${n}_f`, MG, 1.62, 6.2, 4.55);
  band(s, "THE FIELDS", 0.85, 1.78, 5.6, P.BLUE, `s${n}_fb`);
  D.fields.forEach((f, j) => {
    const ry = 2.1 + j * 0.385;
    txt(s, f.k, { x: 0.85, y: ry, w: 1.55, h: 0.385, fontFace: MONO, fontSize: 9, bold: true, valign: "middle", objectName: `s${n}_fk${j}` });
    txt(s, f.v, { x: 2.45, y: ry, w: 4.0, h: 0.385, fontFace: MONO, fontSize: 8.5, color: P.INK, valign: "middle", objectName: `s${n}_fv${j}` });
    if (j < D.fields.length - 1) hair(s, 0.85, ry + 0.385, 5.6, `s${n}_fhr${j}`);
  });
  band(s, "HARD RULES", 0.85, 4.5, 5.6, P.MUT, `s${n}_rb`, 9);
  D.rules.forEach((r, j) => {
    const ry = 4.79 + j * 0.33;
    sq(s, 0.85, ry + 0.05, 0.09, P.BLUE, `s${n}_rb${j}`);
    txt(s, r, { x: 1.03, y: ry, w: 5.45, h: 0.32, fontSize: 9, valign: "middle", objectName: `s${n}_rt${j}` });
  });
  // right: how the four implement it
  card(s, `s${n}_h`, 7.0, 1.62, 5.78, 3.15);
  band(s, "HOW THE FOUR IMPLEMENT IT", 7.3, 1.78, 5.2, P.MUT, `s${n}_hb`);
  D.harness.forEach((h, j) => {
    const A = ACC[h.harness];
    const ry = 2.12 + j * 0.63;
    sq(s, 7.3, ry + 0.24, 0.12, A.a, `s${n}_hb${j}`);
    txt(s, A.name, { x: 7.54, y: ry, w: 1.5, h: 0.62, fontSize: 10, bold: true, valign: "middle", objectName: `s${n}_hk${j}` });
    txt(s, h.note, { x: 9.05, y: ry, w: 3.45, h: 0.62, fontSize: 9, color: P.MUT, valign: "middle", lineSpacingMultiple: 1.1, objectName: `s${n}_hv${j}` });
    if (j < 3) hair(s, 7.3, ry + 0.62, 5.2, `s${n}_hhr${j}`);
  });
  // right bottom: registry stance (dark card)
  card(s, `s${n}_st`, 7.0, 4.92, 5.78, 1.25, P.DK_BG, P.INK);
  band(s, "REGISTRY STANCE", 7.3, 5.06, 5.0, P.LBLUE, `s${n}_sb`, 9);
  txt(s, D.stance, { x: 7.3, y: 5.34, w: 5.2, h: 0.72, fontSize: 11, bold: true, color: "FFFFFF", lineSpacingMultiple: 1.2, objectName: `s${n}_stt` });
  // bottom: gaps the registry owns
  card(s, `s${n}_g`, MG, 6.32, 12.23, 0.72, P.GRAY_T);
  txt(s, "GAPS THE REGISTRY OWNS — " + D.gaps.join("  ·  "),
    { x: 0.85, y: 6.4, w: 11.6, h: 0.56, fontSize: 9.5, color: P.MUT, valign: "middle", lineSpacingMultiple: 1.15, objectName: `s${n}_gt` });
}

// ================== THE CARD GRID (both pair slides of every section) ==================
// ONE factory: identical grid per card count, identical row order, identical
// chips — only the harness accent + content differ. No vanity heroes.

function topicCard(s, tag, x, y, w, h, cd, A, nCards) {
  const L = nCards === 3
    ? { topicFs: 11.5, whatFs: 9.5, whyFs: 8, labFs: 8, valFs: 8.5, rh: 0.6, labW: 1.02, emisFs: 8 }
    : nCards === 1
      ? { topicFs: 15, whatFs: 12, whyFs: 9.5, labFs: 9.5, valFs: 10.5, rh: 0.52, labW: 1.4, emisFs: 10 }
      : { topicFs: 13, whatFs: 10.5, whyFs: 8.5, labFs: 8.5, valFs: 9, rh: 0.46, labW: 1.18, emisFs: 9 };
  card(s, tag, x, y, w, h);
  // header row: accent square + TOPIC + verdict chip (right)
  const chw = 0.26 + cd.verdict.length * 9 * 0.0092;
  sq(s, x + 0.25, y + 0.21, 0.15, A.a, `${tag}_sq`);
  txt(s, cd.topic, { x: x + 0.5, y: y + 0.14, w: w - 0.75 - chw, h: 0.3, fontSize: L.topicFs, bold: true, valign: "middle", charSpacing: 0.5, objectName: `${tag}_topic` });
  verChip(s, x + w - 0.22 - chw, y + 0.14, cd.verdict, `${tag}_vc`, 9);
  // why (right-aligned, clear below the chip — chip bottom ≈ y+0.54)
  txt(s, cd.why, { x: x + 0.25, y: y + 0.58, w: w - 0.5, h: 0.32, fontSize: L.whyFs, italic: true, color: P.MUT, align: "right", lineSpacingMultiple: 1.05, objectName: `${tag}_why` });
  // what
  txt(s, cd.what, { x: x + 0.25, y: y + 0.94, w: w - 0.5, h: 0.46, fontSize: L.whatFs, color: P.INK, lineSpacingMultiple: 1.15, objectName: `${tag}_what` });
  hair(s, x + 0.25, y + 1.44, w - 0.5, `${tag}_hr1`);
  // the four fact rows — labels sans, values mono (real code), auto-update colored
  const rows = [
    ["WHERE", cd.where], ["FORMAT", cd.format], ["MANAGE", cd.manage], ["AUTO-UPDATE", cd.autoupdate],
  ];
  rows.forEach((r, i) => {
    const ry = y + 1.5 + i * L.rh;
    txt(s, r[0], { x: x + 0.25, y: ry, w: L.labW, h: L.rh, fontSize: L.labFs, bold: true, color: P.MUT, valign: "middle", objectName: `${tag}_k${i}` });
    const isUpd = i === 3;
    const yes = /^y/i.test(r[1]);
    txt(s, r[1], {
      x: x + 0.25 + L.labW + 0.08, y: ry, w: w - 0.5 - L.labW - 0.08, h: L.rh,
      fontFace: MONO, fontSize: L.valFs, color: isUpd ? (yes ? P.GREEN : P.MUT) : P.INK,
      bold: isUpd, valign: "middle", lineSpacingMultiple: 1.1, objectName: `${tag}_v${i}`,
    });
    if (i < rows.length - 1) hair(s, x + 0.25, ry + L.rh, w - 0.5, `${tag}_hr${i + 2}`);
  });
  // registry emission panel (accent tint)
  const ey = y + 1.5 + 4 * L.rh + 0.1;
  const eh = y + h - ey - 0.18;
  rect(s, x + 0.22, ey, w - 0.44, eh, A.t, null, null, `${tag}_emp`);
  band(s, "REGISTRY EMISSION", x + 0.42, ey + 0.12, w - 0.84, A.a, `${tag}_emb`, Math.max(7.5, L.labFs - 0.5));
  // adaptive mono size: fit the longest wrapped line inside the panel
  const innerW = w - 0.84;
  let efs = L.emisFs;
  const linesTotal = (fs) => cd.emission.reduce((a, t) => a + Math.max(1, Math.ceil(monoW(t, fs) / innerW)), 0);
  const avail = eh - 0.42;
  while (efs > 7 && linesTotal(efs) * (efs * 1.25 / 72) > avail) efs -= 0.5;
  txt(s, cd.emission.join("\n"), { x: x + 0.42, y: ey + 0.36, w: innerW, h: eh - 0.44, fontFace: MONO, fontSize: efs, color: P.INK, lineSpacingMultiple: 1.25, valign: "top", objectName: `${tag}_em` });
}

// pair slide — two harness cards for this surface side by side, no cube
// (two harnesses share the slide; the accents live on the cards themselves)
function pairSlide(n, i, hzA, hzB, side) {
  const surface = SURFACES[i - 1];
  const A = ACC[hzA.accentKey], B = ACC[hzB.accentKey];
  const s = pres.addSlide();
  header(s, n, side === "c" ? `skc${i}` : `sko${i}`, `srf${i}`,
    side === "c"
      ? `${surface} in claude code + codex — the two most popular first`
      : `${surface} in opencode + pi`);
  s.addNotes(`Section ${i}/10 (${surface}), ${side === "c" ? "claude code + codex" : "opencode + pi"} pair: ${A.name} and ${B.name} cards for this surface — same six facts, same emission block.`);
  topicCard(s, `s${n}_c0`, MG, 1.62, 5.99, 5.35, findCard(hzA, surface), A, 2);
  topicCard(s, `s${n}_c1`, MG + 6.24, 1.62, 5.99, 5.35, findCard(hzB, surface), B, 2);
}

BANNERS.forEach((b, i) => {
  bannerSlide(5 + i * 4, b, i + 1);
  standardsSlide(6 + i * 4, STANDARDS[i], i + 1);
  pairSlide(7 + i * 4, i + 1, CONTENT[0], CONTENT[1], "c");
  pairSlide(8 + i * 4, i + 1, CONTENT[2], CONTENT[3], "o");
});

// ============================ SLIDE 45 — CLOSER (dark) ============================
{
  const s = pres.addSlide();
  s.background = { color: P.DK_BG };
  s.addNotes("Closer. Three takeaways: packages update but artifacts don't (lockfile wedge), emit overlays not forks, NO SURFACE is a first-class answer. Static machine art — no game in v5.");
  voxel(s, 12.18, 0.42, P.LBLUE, P.GREEN, P.AMBER, "s25_vx1", 0.16);
  voxel(s, 0.6, 6.55, P.AMBER, P.LBLUE, P.GREEN, "s25_vx2", 0.16);
  img(s, "kz", MG, 0.44, 0.2, "s25_kick");
  img(s, "tz", MG, 0.72, 0.52, "s25_title");
  txt(s, "the registry is buildable because every harness answers the same six questions — we wrote them down",
    { x: MG, y: 1.33, w: 11.45, h: 0.3, fontSize: 11, color: P.DK_MUT, objectName: "s25_spec" });
  const tk = [
    ["Packages update. Artifacts don't.", "skills, mcp, agents and hooks are file-drops in all four harnesses — agentreg.lock is the missing updater", P.LBLUE],
    ["Emit overlays, not forks", "a spec-pure core plus per-harness overlay fields; only pi takes claude's mcp json copy-as-is", P.GREEN],
    ["NO SURFACE is an answer", "lsp, statusline and custom tools exist in two of four harnesses — the record says unsupported, never broken", P.AMBER],
  ];
  tk.forEach((t, i) => {
    const y = 2.35 + i * 1.15;
    sq(s, MG, y + 0.06, 0.16, t[2], `s25_tk${i}_sq`);
    txt(s, t[0], { x: MG + 0.4, y, w: 6.9, h: 0.32, fontSize: 15.5, bold: true, color: "FFFFFF", objectName: `s25_tk${i}_h` });
    txt(s, t[1], { x: MG + 0.4, y: y + 0.36, w: 6.9, h: 0.6, fontSize: 10.5, color: P.DK_MUT, lineSpacingMultiple: 1.2, objectName: `s25_tk${i}_d` });
  });
  img(s, "machine", 9.7, 2.7, 2.15, "machine");
  img(s, "cup", 11.75, 4.35, 0.3, "machineCup");
  img(s, "runner", 8.75, 3.95, 1.15, "runner");
  const cubes = [["cube_claude", 9.9], ["cube_codex", 10.75], ["cube_opencode", 11.6], ["cube_pi", 12.45]];
  cubes.forEach(([n, x], i) => img(s, n, x, 6.25, 0.38, `s25_cube${i}`));
  txt(s, "sources: agents-unified-registry corpus · every fact verified 2026-10-16 · deck: nano-super-slides-v5\nnext: agentreg v0 — skills + mcp × 4 harnesses, then the adapters this deck maps.",
    { x: MG, y: 6.95, w: 9.5, h: 0.45, fontSize: 9, color: P.DK_MUT, fontFace: MONO, lineSpacingMultiple: 1.25, objectName: "s25_src" });
  txt(s, `${pad2(TOTAL)} / ${TOTAL}`, { x: 12.1, y: 7.09, w: 0.7, h: 0.25, fontFace: MONO, fontSize: 9.5, color: P.DK_MUT, align: "right", objectName: "s25_pg" });
}

pres.writeFile({ fileName: "nano-super-registry-guide.pptx" })
  .then(() => console.log(`WROTE nano-super-registry-guide.pptx (${TOTAL} slides)`));
