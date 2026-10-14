/* nano-super technical deep-dive deck — light theme, pixel/voxel aesthetic.
 * Built with pptxgenjs; pixel titles are pre-rendered bitmap-font PNGs (assets/).
 */
const pptxgen = require("pptxgenjs");
const fs = require("fs");
const MAN = JSON.parse(fs.readFileSync("assets/manifest.json", "utf8"));

// ---------- palette ----------
const P = {
  BG: "F7F6F2", INK: "1B1D22", MUT: "5C6068", CARD: "FFFFFF", HAIR: "E3E1DA",
  BLUE: "2F6FED", GREEN: "16A34A", AMBER: "D97706", RED: "DC2626", PURPLE: "7C3AED", CYAN: "0E7490",
  BLUE_T: "E7EEFD", GREEN_T: "E5F5EA", AMBER_T: "FBEEDD", RED_T: "FBE5E5", PURPLE_T: "EFE9FB", CYAN_T: "E0F2F7", GRAY_T: "EFEFEA",
  DK_BG: "1B1D22", DK_CARD: "24272F", DK_LINE: "3C414C", DK_MUT: "9AA0AB", DK_TXT: "E9EBEE",
  LBLUE: "7CB0FF",
};
const W = 13.33, H = 7.5, MG = 0.55;
const SANS = "Segoe UI", MONO = "Consolas";
const SH = 0.055; // hard-shadow offset (in)

const pres = new pptxgen();
pres.layout = "LAYOUT_WIDE";
pres.author = "aryan-rajoria";
pres.title = "nano-super — pi usage observation (technical deep-dive)";

// ---------- helpers ----------
function img(s, name, x, y, h) {
  const m = MAN[name], w = h * (m.w / m.h);
  s.addImage({ path: `assets/${name}.png`, x, y, w, h });
  return { r: x + w, b: y + h, w, h };
}
function rect(s, x, y, w, h, fill, line, lw) {
  s.addShape(pres.shapes.RECTANGLE, {
    x, y, w, h, fill: { color: fill },
    line: line ? { color: line, width: lw == null ? 2.25 : lw } : { type: "none" },
  });
}
// pixel card: ink offset shadow + white (or tinted) card with chunky border
function card(s, x, y, w, h, fill, line, lw) {
  rect(s, x + SH, y + SH, w, h, P.INK);
  rect(s, x, y, w, h, fill || P.CARD, line || P.INK, lw);
}
function sq(s, x, y, size, color) { rect(s, x, y, size, size, color); }
// signature motif: voxel cluster (2 stacked + 1 offset)
function voxel(s, x, y, c1, c2, c3, size) {
  const z = size || 0.14;
  sq(s, x, y, z, c1); sq(s, x + z + 0.03, y, z, c2); sq(s, x, y + z + 0.03, z, c3);
}
// horizontal pixel arrow: shaft + stepped head
function arrowH(s, x1, x2, yMid, color) {
  const c = color || P.INK, th = 0.045;
  rect(s, x1, yMid - th / 2, x2 - x1 - 0.1, th, c);
  sq(s, x2 - 0.1, yMid - 0.115, 0.1, c);
  sq(s, x2 - 0.1, yMid + 0.015, 0.1, c);
  rect(s, x2, yMid - 0.05, 0.05, 0.1, c);
}
function arrowV(s, xMid, y1, y2, color) {
  const c = color || P.INK, th = 0.045;
  rect(s, xMid - th / 2, y1, th, y2 - y1 - 0.1, c);
  sq(s, xMid - 0.115, y2 - 0.1, 0.1, c);
  sq(s, xMid + 0.015, y2 - 0.1, 0.1, c);
  rect(s, xMid - 0.05, y2, 0.1, 0.05, c);
}
function txt(s, t, o) {
  s.addText(t, Object.assign({ fontFace: SANS, color: P.INK, margin: 0, align: "left", valign: "top" }, o));
}
// small chip with mono text; returns width
function chip(s, x, y, t, fg, bg, fs, border) {
  fs = fs || 10;
  const w = 0.18 + t.length * fs * 0.0088;
  const h = fs * 1.9 / 72 + 0.1;
  rect(s, x + 0.03, y + 0.03, w, h, P.INK);
  rect(s, x, y, w, h, bg || P.CARD, border || P.INK, 1.5);
  txt(s, t, { x, y, w, h, fontFace: MONO, fontSize: fs, color: fg, align: "center", valign: "middle", bold: true });
  return w;
}
// standard content-slide furniture
function header(s, kicker, titleName, num) {
  s.background = { color: P.BG };
  voxel(s, 12.18, 0.42, P.BLUE, P.GREEN, P.AMBER);
  if (kicker) img(s, kicker, MG, 0.44, 0.2);
  img(s, titleName, MG, 0.72, 0.52);
  txt(s, `${num} / 12`, { x: 12.1, y: 7.09, w: 0.7, h: 0.25, fontFace: MONO, fontSize: 9.5, color: P.MUT, align: "right" });
}
function notes(s, t) { s.addNotes(t); }

// ================= S1 · COVER (dark) =================
{
  const s = pres.addSlide();
  s.background = { color: P.DK_BG };
  // right side: oversized pi glyph
  img(s, "pi_white", 9.35, 1.35, 3.3);
  // corner voxel clusters
  voxel(s, 0.6, 0.38, P.LBLUE, P.GREEN, P.AMBER, 0.16);
  voxel(s, 12.2, 6.5, P.AMBER, P.LBLUE, P.GREEN, 0.16);
  img(s, "pi_white", MG, 0.95, 0.62);
  img(s, "wordmark", MG, 2.0, 0.78);
  txt(s, "Pi usage observation — a technical deep-dive", { x: MG, y: 3.05, w: 8.5, h: 0.4, fontSize: 19, color: "C9CDD4" });
  txt(s, "An agent that watches how you use your AI agent —\nand an AI that grades your prompting.", { x: MG, y: 3.55, w: 7.6, h: 0.9, fontSize: 16, color: P.DK_TXT, lineSpacingMultiple: 1.25 });
  // stat chips
  const stats = ["v0.1.0", "~3.6K LOC", "63 TESTS", "0 NPM DEPS"];
  let cx = MG;
  for (const st of stats) {
    const w = 0.3 + st.length * 0.115;
    rect(s, cx + 0.04, 4.95 + 0.04, w, 0.52, "05060A");
    rect(s, cx, 4.95, w, 0.52, P.DK_CARD, P.DK_LINE, 1.5);
    txt(s, st, { x: cx, y: 4.95, w, h: 0.52, fontFace: MONO, fontSize: 12, color: P.DK_TXT, align: "center", valign: "middle", bold: true });
    cx += w + 0.25;
  }
  txt(s, "extends the pi coding agent · @earendil-works/pi-coding-agent", { x: MG, y: 5.75, w: 8, h: 0.3, fontSize: 11.5, color: P.DK_MUT, fontFace: MONO });
  txt(s, "github.com/aryan-rajoria/nano-super", { x: MG, y: 6.95, w: 5.5, h: 0.3, fontSize: 11, color: P.DK_MUT });
  txt(s, "OCTOBER 2026", { x: 10.9, y: 6.95, w: 1.9, h: 0.3, fontSize: 11, color: P.DK_MUT, fontFace: MONO, align: "right" });
  notes(s, "nano-super v0.1.0: self-hosted observability for the pi coding agent. Two parts: a pi extension package (session monitor + /research) and a zero-dependency local dashboard. ~3,578 first-party lines, 63 tests, zero npm dependencies. This deck is the technical deep-dive: data relations, design decisions, processing time and cost, and measurable benefits.");
}

// ================= S2 · THE PROBLEM =================
{
  const s = pres.addSlide();
  header(s, "k02", "t02", "02");
  txt(s, "Your agent works all day.\nYou never see how.", { x: MG, y: 1.8, w: 4.9, h: 1.7, fontSize: 27, bold: true, lineSpacingMultiple: 1.15 });
  txt(s, "pi sessions live and die inside one terminal. Nothing answers: what did it do, what did it cost, and which of my prompts caused the rework?", { x: MG, y: 3.75, w: 4.6, h: 1.4, fontSize: 13.5, color: P.MUT, lineSpacingMultiple: 1.3 });
  // KPI-flavored counterpoint
  card(s, MG, 5.35, 4.6, 1.35, P.BLUE_T);
  txt(s, "0", { x: 0.85, y: 5.5, w: 1.1, h: 1.05, fontFace: MONO, fontSize: 46, bold: true, color: P.BLUE });
  txt(s, "cross-project analytics ship with the pi agent — the usage data is created every day, then discarded.", { x: 2.05, y: 5.62, w: 2.95, h: 0.9, fontSize: 11.5, color: P.INK, lineSpacingMultiple: 1.2 });
  // right: 5 pain rows in one card
  card(s, 5.85, 1.55, 6.93, 5.15);
  const rows = [
    ["DC2626", "Scattered sessions", "every project keeps its own history — no aggregate view of prompts, tools or turns"],
    ["D97706", "Hidden failures", "the powershell tool wraps failed commands in exit-0 output — errors pass silently"],
    ["7C3AED", "Unreviewed habits", "nobody re-reads their own prompts, so bad habits compound across sessions"],
    ["2F6FED", "Drift by hindsight", "scope drift is noticed only after the wasted turns it produced"],
    ["0E7490", "Invisible spend", "tokens and $ per model, per project are never totaled — cost is a feeling"],
  ];
  rows.forEach((r, i) => {
    const y = 1.85 + i * 0.97;
    sq(s, 6.2, y + 0.06, 0.16, r[0]);
    txt(s, r[1], { x: 6.55, y, w: 5.9, h: 0.3, fontSize: 15, bold: true });
    txt(s, r[2], { x: 6.55, y: y + 0.32, w: 5.95, h: 0.55, fontSize: 11.5, color: P.MUT, lineSpacingMultiple: 1.15 });
    if (i < 4) s.addShape(pres.shapes.LINE, { x: 6.2, y: y + 0.86, w: 6.2, h: 0, line: { color: P.HAIR, width: 0.75 } });
  });
  notes(s, "Problem framing: the pi coding agent logs nothing by default; usage insight dies with each terminal. Pain points from the README: per-project scatter, soft failures (exit-0 powershell wrappers), unreviewed prompting habits, drift noticed late, invisible spend. nano-super exists to make all five measurable.");
}

// ================= S3 · WHAT NANO-SUPER IS =================
{
  const s = pres.addSlide();
  header(s, "k03", "t03", "03");
  txt(s, "Two independent parts, one shared data dir.", { x: MG, y: 1.38, w: 9, h: 0.35, fontSize: 14, color: P.MUT });
  // left card: pi extensions
  card(s, MG, 1.9, 5.65, 3.15);
  img(s, "pi_blue", 5.35, 2.05, 0.4);
  txt(s, "pi/  —  nano-super-pi", { x: 0.85, y: 2.1, w: 4.5, h: 0.35, fontFace: MONO, fontSize: 16, bold: true, color: P.BLUE });
  txt(s, "harness extensions", { x: 0.85, y: 2.48, w: 4.5, h: 0.3, fontSize: 11.5, color: P.MUT, fontFace: MONO });
  txt(s, "Session monitor — logs every session from every project into one central dir: prompts, tool calls, results, turns, tokens, cost.", { x: 0.85, y: 2.95, w: 5.05, h: 0.85, fontSize: 12.5, lineSpacingMultiple: 1.25 });
  txt(s, "/research command — 6-stage deep research (RTV + PDR) on a task; submits the brief as context.", { x: 0.85, y: 3.95, w: 5.05, h: 0.85, fontSize: 12.5, lineSpacingMultiple: 1.25 });
  // arrow between cards
  arrowH(s, 6.35, 7.0, 3.45);
  txt(s, "JSONL\nevents", { x: 6.28, y: 3.72, w: 0.8, h: 0.55, fontFace: MONO, fontSize: 8.5, color: P.MUT, align: "center" });
  // right card: dashboard
  card(s, 7.1, 1.9, 5.68, 3.15);
  txt(s, "dashboard/  —  observation", { x: 7.4, y: 2.1, w: 5.1, h: 0.35, fontFace: MONO, fontSize: 16, bold: true, color: P.CYAN });
  txt(s, "local analytics, zero deps", { x: 7.4, y: 2.48, w: 4.5, h: 0.3, fontSize: 11.5, color: P.MUT, fontFace: MONO });
  txt(s, "Aggregates over those logs — tool health, prompt mix, drift root causes, tokens & cost per session/model/project.", { x: 7.4, y: 2.95, w: 5.1, h: 0.85, fontSize: 12.5, lineSpacingMultiple: 1.25 });
  txt(s, "AI enrichment — a headless pi run classifies prompts and coaches your habits on every ended session.", { x: 7.4, y: 3.95, w: 5.1, h: 0.85, fontSize: 12.5, lineSpacingMultiple: 1.25 });
  // terminal install card
  card(s, MG, 5.5, 8.2, 1.25, P.DK_BG, P.INK);
  txt(s, "$ pi install ./pi", { x: 0.9, y: 5.7, w: 5, h: 0.3, fontFace: MONO, fontSize: 13, color: "6EE7A0" });
  txt(s, "$ node dashboard/server.js", { x: 0.9, y: 6.1, w: 5, h: 0.3, fontFace: MONO, fontSize: 13, color: "6EE7A0" });
  txt(s, "→ http://127.0.0.1:3131", { x: 5.9, y: 5.7, w: 2.7, h: 0.3, fontFace: MONO, fontSize: 11.5, color: P.DK_MUT });
  txt(s, "no npm install — Node stdlib only", { x: 5.9, y: 6.1, w: 2.8, h: 0.3, fontFace: MONO, fontSize: 11.5, color: P.DK_MUT });
  // logs dir chip
  card(s, 9.15, 5.5, 3.63, 1.25, P.GRAY_T);
  txt(s, "ONE CENTRAL DIR", { x: 9.45, y: 5.68, w: 3.1, h: 0.25, fontSize: 10, bold: true, color: P.MUT, charSpacing: 2 });
  txt(s, "~/.pi/agent/logs", { x: 9.45, y: 5.97, w: 3.1, h: 0.3, fontFace: MONO, fontSize: 14, bold: true });
  txt(s, "every project writes here", { x: 9.45, y: 6.32, w: 3.1, h: 0.25, fontSize: 10.5, color: P.MUT });
  notes(s, "Architecture at product level. Part 1: pi/ installs as the nano-super-pi package (pi install ./pi) — monitor.ts + research.ts extensions. Part 2: dashboard/ — stdlib-only HTTP server + SPA. They share exactly one thing: the JSONL event logs in ~/.pi/agent/logs. Install involves no npm install at all.");
}

// ================= S4 · THE MONITOR EXTENSION =================
{
  const s = pres.addSlide();
  header(s, "k04", "t04", "04");
  // left: hook chain card
  card(s, MG, 1.5, 5.75, 5.35);
  txt(s, "7 lifecycle hooks \u2192 1 line each", { x: 0.85, y: 1.72, w: 5.2, h: 0.3, fontSize: 13.5, bold: true });
  const ev = [
    ["session_meta", "project, model, mode — the header"],
    ["session_end", "reason: quit · reload · new · resume"],
    ["model_change", "mid-session model switches"],
    ["user_prompt", "text + image count"],
    ["tool_call", "tool name + args"],
    ["tool_result", "ok/error · durationMs · payload"],
    ["assistant_message", "turn · tokens · $ cost"],
  ];
  ev.forEach((e, i) => {
    const y = 2.15 + i * 0.5;
    sq(s, 0.85, y + 0.05, 0.11, P.BLUE);
    txt(s, e[0], { x: 1.1, y, w: 2.15, h: 0.26, fontFace: MONO, fontSize: 11.5, bold: true });
    txt(s, e[1], { x: 3.3, y: y + 0.015, w: 2.85, h: 0.26, fontSize: 10.5, color: P.MUT });
  });
  s.addShape(pres.shapes.LINE, { x: 0.85, y: 5.78, w: 5.15, h: 0, line: { color: P.HAIR, width: 0.75 } });
  txt(s, "~/.pi/agent/logs/<sessionId>.jsonl", { x: 0.85, y: 5.95, w: 5.2, h: 0.28, fontFace: MONO, fontSize: 12, bold: true, color: P.CYAN });
  txt(s, "one central dir · every project · ts + sessionId on every event", { x: 0.85, y: 6.28, w: 5.2, h: 0.3, fontSize: 10.5, color: P.MUT });
  // right: hot-path discipline 2x2
  const hp = [
    ["mkdir once", "on the first write only — it sits on the agent's hot path", P.BLUE],
    ["1 append / event", "a single appendFileSync — one JSONL line, no queues, no extra calls", P.AMBER],
    ["try / catch everything", "\u201CMonitoring must never break pi.\u201D failures are swallowed", P.RED],
    ["200K truncation", "pathological payloads (base64 images) cannot blow up the log", P.PURPLE],
  ];
  hp.forEach((c, i) => {
    const x = 6.6 + (i % 2) * 3.14, y = 1.5 + Math.floor(i / 2) * 1.72;
    card(s, x, y, 2.98, 1.52);
    sq(s, x + 0.25, y + 0.27, 0.13, c[2]);
    txt(s, c[0], { x: x + 0.5, y: y + 0.18, w: 2.4, h: 0.3, fontSize: 13, bold: true });
    txt(s, c[1], { x: x + 0.25, y: y + 0.55, w: 2.5, h: 0.9, fontSize: 10.5, color: P.MUT, lineSpacingMultiple: 1.18 });
  });
  // guard callout
  card(s, 6.6, 5.15, 6.18, 1.7, P.PURPLE_T);
  txt(s, "FEEDBACK-LOOP GUARD", { x: 6.9, y: 5.35, w: 5.6, h: 0.25, fontSize: 10.5, bold: true, color: P.PURPLE, charSpacing: 2 });
  txt(s, "The monitor no-ops when PI_DASHBOARD_ENRICHMENT is set — that's the dashboard's own headless pi run. Logging it would create sessions that trigger further enrichment: an infinite loop, prevented by one env var.", { x: 6.9, y: 5.68, w: 5.6, h: 1.05, fontSize: 11.5, lineSpacingMultiple: 1.22 });
  notes(s, "monitor.ts (127 lines): hooks 7 pi lifecycle events, appends one JSONL line per event into <sessionId>.jsonl. Hot-path discipline: mkdirSync on first write only, a single appendFileSync per event, every write in try/catch ('Monitoring must never break pi'), 200k-char truncation guard, ephemeral-<random> ids for concurrent --no-session runs, and the PI_DASHBOARD_ENRICHMENT no-op guard against self-enrichment loops.");
}

// ================= S5 · DATA RELATIONS =================
{
  const s = pres.addSlide();
  header(s, "k05", "t05", "05");
  const cy = 1.55, ch = 2.55, cw = 3.45;
  const xs = [MG, 4.94, 9.33];
  const ents = [
    ["SESSION LOG", "<id>.jsonl", "schemaVersion 1", "12 event types — 7 monitor + 5 research_*\nevery event = one line\nts + sessionId on all of them", P.BLUE, P.BLUE_T],
    ["ANALYSIS", "<id>.analysis.json", "schemaVersion 2", "outcome · wastedTurns\n5 prompt classes · drift root causes\nhard + soft failures · phases\nprompt coach — 8 habit tags", P.CYAN, P.CYAN_T],
    ["DIGEST", ".enrich/<id>.input.md", "input only", "numbered markdown, 30K-char budget\nevent [N] == raw JSONL line N\nwhat the model actually reads", P.PURPLE, P.PURPLE_T],
  ];
  ents.forEach((e, i) => {
    card(s, xs[i], cy, cw, ch, P.CARD);
    txt(s, e[0], { x: xs[i] + 0.25, y: cy + 0.2, w: 3.1, h: 0.28, fontSize: 13.5, bold: true, color: e[4], charSpacing: 1.5 });
    txt(s, e[1], { x: xs[i] + 0.25, y: cy + 0.5, w: 3.2, h: 0.28, fontFace: MONO, fontSize: 11.5, bold: true });
    chip(s, xs[i] + 0.25, cy + 0.86, e[2], e[4], e[5], 8.5);
    txt(s, e[3], { x: xs[i] + 0.25, y: cy + 1.32, w: 2.95, h: 1.1, fontFace: MONO, fontSize: 9, color: P.MUT, lineSpacingMultiple: 1.35 });
  });
  arrowH(s, 4.06, 4.88, cy + 1.0);
  arrowH(s, 8.45, 9.27, cy + 1.0);
  txt(s, "numbered\ndigest", { x: 4.0, y: cy + 1.16, w: 0.94, h: 0.45, fontSize: 7.5, color: P.MUT, align: "center", fontFace: MONO });
  txt(s, "headless pi\nglm-5.3-flash", { x: 8.39, y: cy + 1.16, w: 0.94, h: 0.45, fontSize: 7.5, color: P.MUT, align: "center", fontFace: MONO });
  txt(s, "all three share one key — <sessionId> — and every AI finding cites event [N], traceable to a raw log line", { x: MG, y: 4.28, w: 12.2, h: 0.3, fontSize: 11.5, color: P.MUT, align: "center" });
  // research linking band
  card(s, MG, 4.75, 12.23, 2.1, P.GREEN_T);
  txt(s, "RESEARCH RUNS LINK IN AS SESSIONS", { x: 0.85, y: 4.95, w: 8, h: 0.25, fontSize: 10.5, bold: true, color: P.GREEN, charSpacing: 2 });
  const kids = ["STREAM A", "STREAM B", "STREAM C", "REFINE"];
  kids.forEach((k, i) => {
    const x = 0.85 + i * 1.35;
    rect(s, x + 0.03, 5.42 + 0.03, 1.18, 0.52, P.INK);
    rect(s, x, 5.42, 1.18, 0.52, P.CARD, P.INK, 1.5);
    txt(s, k, { x, y: 5.42, w: 1.18, h: 0.52, fontFace: MONO, fontSize: 9.5, bold: true, align: "center", valign: "middle", color: i === 3 ? P.PURPLE : P.GREEN });
  });
  arrowH(s, 6.4, 6.9, 5.68);
  txt(s, "research_start.streamSessionIds maps A/B/C in solution order · research_pdr.refineSessionId links the PDR run\nstreams are normal sessions — each gets its own replayable timeline in the dashboard", { x: 7.05, y: 5.42, w: 5.5, h: 0.95, fontSize: 11, lineSpacingMultiple: 1.25 });
  txt(s, "schemas are versioned on both sides — bump on breaking change, readers support old + new logs side by side", { x: 0.85, y: 6.45, w: 11.6, h: 0.3, fontSize: 11, color: P.MUT, fontFace: MONO });
  notes(s, "Entity model: one session = one <id>.jsonl (schemaVersion 1, 12 event types). The dashboard digests it into .enrich/<id>.input.md (30k-char budget; event [N] == JSONL line N), a headless pi run (zai/glm-5.3-flash) writes <id>.analysis.json (schemaVersion 2: outcome, wastedTurns, 5 prompt classifications, drift with root causes + cited event indexes, hard/soft failures, phases, prompt coach with 8 habit tags). Research runs emit research_* events whose streamSessionIds/refineSessionId link child sessions — every stream is itself a replayable session.");
}

// ================= S6 · DASHBOARD PIPELINE =================
{
  const s = pres.addSlide();
  header(s, "k06", "t06", "06");
  const st = [
    ["01", "PARSE", "lib/parse.js", "aggregates every session — cache keyed on mtime+size, so months of logs stay fast", "8 soft-fail regexes catch exit-0 failures", P.BLUE],
    ["02", "SERVE", "server.js", "node:http stdlib · 5 API endpoints · bound to 127.0.0.1:3131", "overview / sessions / detail / analyze / status", P.CYAN],
    ["03", "ENRICH", "lib/enrich.js", "headless pi writes analysis JSON through the harness — never a direct API call", "serialized: one enrichment run at a time", P.PURPLE],
    ["04", "RENDER", "public/ SPA", "single-file app, no build step · vendored Chart.js", "auto-refresh every 15 s while visible", P.GREEN],
  ];
  const cw2 = 2.85, gap = 0.28, y0 = 1.6, chh = 3.3;
  st.forEach((c, i) => {
    const x = MG + i * (cw2 + gap);
    card(s, x, y0, cw2, chh);
    rect(s, x + 0.03, y0 + 0.28 + 0.03, 0.44, 0.44, P.INK);
    rect(s, x + 0.25, y0 + 0.28, 0.44, 0.44, c[5]);
    txt(s, c[0], { x: x + 0.25, y: y0 + 0.28, w: 0.44, h: 0.44, fontFace: MONO, fontSize: 15, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
    txt(s, c[1], { x: x + 0.82, y: y0 + 0.3, w: 1.9, h: 0.3, fontSize: 15, bold: true });
    txt(s, c[2], { x: x + 0.82, y: y0 + 0.62, w: 1.95, h: 0.25, fontFace: MONO, fontSize: 9.5, color: P.MUT });
    txt(s, c[3], { x: x + 0.25, y: y0 + 1.1, w: cw2 - 0.5, h: 1.25, fontSize: 11, lineSpacingMultiple: 1.25 });
    txt(s, c[4], { x: x + 0.25, y: y0 + 2.55, w: cw2 - 0.5, h: 0.6, fontFace: MONO, fontSize: 9, color: P.MUT, lineSpacingMultiple: 1.25 });
    if (i < 3) arrowH(s, x + cw2 + 0.015, x + cw2 + gap - 0.015, y0 + 0.5, P.INK);
  });
  // watcher band
  card(s, MG, 5.35, 12.23, 1.5, P.AMBER_T);
  sq(s, 0.85, 5.62, 0.15, P.AMBER);
  txt(s, "THE WATCHER", { x: 1.12, y: 5.56, w: 3, h: 0.26, fontSize: 11, bold: true, color: P.AMBER, charSpacing: 2 });
  txt(s, "Scans the log dir every 5 s. A session auto-analyzes once its log goes quiet: 60 s after a clean quit, 10 min after reload/new/resume — chains keep writing the same file, so they wait longer.", { x: 1.12, y: 5.9, w: 11.2, h: 0.8, fontSize: 12, lineSpacingMultiple: 1.25 });
  notes(s, "Dashboard data flow: parse.js (mtime+size cache, regex soft-failure detection) → server.js (node:http, 5 endpoints, localhost:3131) → enrich.js (headless pi writes analyses through the harness) → no-build SPA with vendored Chart.js, 15 s auto-refresh. The watcher (server.js) scans every 5 s and triggers enrichment after quiet periods: 60 s after quit, 10 min otherwise.");
}

// ================= S7 · /RESEARCH SIX STAGES =================
{
  const s = pres.addSlide();
  header(s, "k07", "t07", "07");
  const st = [
    ["01", "SCOUT", "one LLM call drafts 3 distinct candidate approaches — A, B, C", "1 call"],
    ["02", "STREAMS", "3 parallel headless pi sessions research inside your repo — read + powershell, read-only", "3 runs"],
    ["03", "DISTILL", "each brief compressed to a structured summary", "3 calls"],
    ["04", "RTV", "round-robin pairs, 3 judge votes each — majority wins the tournament", "9 votes"],
    ["05", "PDR", "one refine session: winner summary + losers' risks \u2192 final brief", "1 run"],
    ["06", "SUBMIT", "brief injected into your session as context — the agent executes the task", "free"],
  ];
  const cw3 = 3.95, ch3 = 1.8, gx = 0.19, gy = 0.35;
  const pos = [
    [MG, 1.55], [MG + cw3 + gx, 1.55], [MG + 2 * (cw3 + gx), 1.55],
    [MG, 3.7], [MG + cw3 + gx, 3.7], [MG + 2 * (cw3 + gx), 3.7],
  ];
  st.forEach((c, i) => {
    const [x, y] = pos[i];
    card(s, x, y, cw3, ch3);
    rect(s, x + 0.03, y + 0.26 + 0.03, 0.42, 0.42, P.INK);
    rect(s, x + 0.24, y + 0.26, 0.42, 0.42, P.BLUE);
    txt(s, c[0], { x: x + 0.24, y: y + 0.26, w: 0.42, h: 0.42, fontFace: MONO, fontSize: 14, bold: true, color: "FFFFFF", align: "center", valign: "middle" });
    txt(s, c[1], { x: x + 0.8, y: y + 0.28, w: 2.0, h: 0.32, fontSize: 15.5, bold: true });
    chip(s, x + cw3 - 1.05, y + 0.26, c[3], P.BLUE, P.BLUE_T, 8.5);
    txt(s, c[2], { x: x + 0.24, y: y + 0.85, w: cw3 - 0.48, h: 0.85, fontSize: 11, lineSpacingMultiple: 1.22 });
  });
  // arrows: 1->2, 2->3, 4->5, 5->6, and an elbow 3->4
  arrowH(s, pos[0][0] + cw3 + 0.01, pos[1][0] - 0.01, 1.55 + 0.9);
  arrowH(s, pos[1][0] + cw3 + 0.01, pos[2][0] - 0.01, 1.55 + 0.9);
  arrowH(s, pos[3][0] + cw3 + 0.01, pos[4][0] - 0.01, 3.7 + 0.9);
  arrowH(s, pos[4][0] + cw3 + 0.01, pos[5][0] - 0.01, 3.7 + 0.9);
  const ex = pos[2][0] + cw3 / 2, gapY = 3.35 + 0.175; // mid of the 3.35..3.7 row gap
  rect(s, ex - 0.0225, 3.35, 0.045, 0.175, P.INK);
  rect(s, MG + 0.5, gapY - 0.0225, ex - MG - 0.5, 0.045, P.INK);
  arrowV(s, MG + 0.5, gapY, 3.7, P.INK);
  // survivor band
  card(s, MG, 5.85, 12.23, 1.05, P.AMBER_T);
  sq(s, 0.85, 6.08, 0.14, P.AMBER);
  txt(s, "SURVIVOR LOGIC —", { x: 1.1, y: 5.99, w: 1.95, h: 0.3, fontSize: 11, bold: true, color: P.AMBER });
  txt(s, "streams that fail or hit the 10-minute cap are dropped; RTV proceeds over survivors, \u2265 2 required. \u201COne lost vote must not sink the tournament.\u201D", { x: 3.05, y: 6.02, w: 9.4, h: 0.75, fontSize: 11.5, lineSpacingMultiple: 1.2 });
  notes(s, "research.ts (364 lines) implements the 6-stage pipeline: scout (1 call, 3 approaches) → 3 parallel headless streams (--tools read,powershell, read-only, 10-min cap, --session-id uuid) → distill → RTV tournament (3 pairs × 3 votes) → PDR refine → submit (brief as context). LLM-call math at N=3: 1 scout + 3 distill + 9 judges = 13, +1 tie-break only when needed ≈ 14 calls. Survivor logic requires ≥2 streams.");
}

// ================= S8 · PAPER → AGENT SCALE =================
{
  const s = pres.addSlide();
  header(s, "k08", "t08", "08");
  txt(s, "\u201CSame shape, agent-scale.\u201D — research.ts", { x: MG, y: 1.4, w: 8, h: 0.32, fontSize: 13.5, color: P.MUT, fontFace: MONO });
  // left: comparison table card
  card(s, MG, 1.9, 6.35, 4.75);
  txt(s, "PARAMETER", { x: 0.85, y: 2.12, w: 2.6, h: 0.25, fontSize: 9.5, bold: true, color: P.MUT, charSpacing: 2 });
  txt(s, "PAPER", { x: 3.55, y: 2.12, w: 1.2, h: 0.25, fontSize: 9.5, bold: true, color: P.MUT, align: "center", charSpacing: 2 });
  txt(s, "NANO-SUPER", { x: 5.15, y: 2.12, w: 1.6, h: 0.25, fontSize: 9.5, bold: true, color: P.BLUE, align: "center", charSpacing: 2 });
  const cmp = [
    ["rollouts  N", "16", "3  (cfg 2\u20135)"],
    ["pairs  G", "2", "2"],
    ["votes / pair  V", "8", "3  (1 per lens)"],
    ["refinement", "PDR loop", "1 PDR pass"],
  ];
  cmp.forEach((r, i) => {
    const y = 2.5 + i * 0.98;
    s.addShape(pres.shapes.LINE, { x: 0.85, y, w: 5.75, h: 0, line: { color: P.HAIR, width: 0.75 } });
    txt(s, r[0], { x: 0.85, y: y + 0.18, w: 2.6, h: 0.3, fontFace: MONO, fontSize: 12.5, bold: true });
    txt(s, r[1], { x: 3.55, y: y + 0.18, w: 1.2, h: 0.3, fontFace: MONO, fontSize: 13, align: "center" });
    txt(s, "\u2192", { x: 4.75, y: y + 0.18, w: 0.4, h: 0.3, fontSize: 13, align: "center", color: P.MUT });
    txt(s, r[2], { x: 5.15, y: y + 0.18, w: 1.6, h: 0.3, fontFace: MONO, fontSize: 13, bold: true, color: P.BLUE, align: "center" });
  });
  s.addShape(pres.shapes.LINE, { x: 0.85, y: 6.35, w: 5.75, h: 0, line: { color: P.HAIR, width: 0.75 } });
  // right: 3 callouts
  const co = [
    ["Lens-diverse votes", "each of the 3 votes judges a different lens — pragmatism · risk · effort. \u201CSo the V votes are not V copies of the same bias.\u201D", P.BLUE, P.BLUE_T],
    ["Judges see summaries", "the tournament runs over distilled briefs, not raw trajectories — judge prompts stay ~2K tokens.", P.CYAN, P.CYAN_T],
    ["Cycles & fallbacks", "A>B>C>A Condorcet ties resolved by one ranking call; if PDR refine fails, the winning brief is submitted anyway.", P.PURPLE, P.PURPLE_T],
  ];
  co.forEach((c, i) => {
    const y = 1.9 + i * 1.63;
    card(s, 7.25, y, 5.53, 1.45, P.CARD);
    sq(s, 7.55, y + 0.28, 0.13, c[2]);
    txt(s, c[0], { x: 7.8, y: y + 0.2, w: 4.7, h: 0.3, fontSize: 13.5, bold: true });
    txt(s, c[1], { x: 7.55, y: y + 0.57, w: 4.95, h: 0.8, fontSize: 11, color: P.MUT, lineSpacingMultiple: 1.2 });
  });
  txt(s, "Source: arXiv:2604.16529 — \u201CScaling Test-Time Compute for Agentic Coding\u201D · adapted in pi/extensions/research.ts + pi/lib/tournament.js", { x: MG, y: 6.85, w: 12.2, h: 0.28, fontSize: 10, color: P.MUT, fontFace: MONO });
  notes(s, "/research adapts the paper's test-time-scaling recipe: N 16→3 streams (configurable 2-5 via --researchStreams), G unchanged, V 8→3 with one lens per vote (pragmatism/risk/effort) to avoid correlated bias, one PDR pass. Extra hardening: judges see only distilled summaries (~2k tokens), tie-break ranking call resolves cycles, PDR failure falls back to the winning stream's brief (UI shows a fallback badge).");
}

// ================= S9 · DESIGN DECISIONS =================
{
  const s = pres.addSlide();
  header(s, "k09", "t09", "09");
  const dc = [
    ["Zero dependencies", "server, SPA and tests all run on the Node stdlib — \u201Cno npm install\u201D is the install step", P.BLUE],
    ["Versioned schemas", "logs v1, analyses v2 — bump on breaking change; readers support old + new side by side", P.CYAN],
    ["Feedback-loop guard", "PI_DASHBOARD_ENRICHMENT no-ops the monitor so enrichment never logs itself", P.PURPLE],
    ["Never break pi", "every monitor write wrapped in try/catch — failures swallowed by design", P.RED],
    ["200K truncation", "base64 pathologies and giant payloads cannot blow up the log files", P.AMBER],
    ["stdin: \u201Cignore\u201D", "pi's print mode waits for stdin EOF when piped — an open pipe hangs the whole run", P.GREEN],
    ["Enrich via the harness", "analysis runs through headless pi — never a direct z.ai API call", P.BLUE],
    ["\u201CTrust the codebase\u201D", "the submitted brief ends: where it conflicts with the code, trust the code and adapt", P.CYAN],
  ];
  dc.forEach((d, i) => {
    const x = MG + (i % 2) * 6.28, y = 1.62 + Math.floor(i / 2) * 1.33;
    sq(s, x, y + 0.07, 0.16, d[2]);
    txt(s, d[0], { x: x + 0.34, y, w: 5.5, h: 0.3, fontSize: 14.5, bold: true });
    txt(s, d[1], { x: x + 0.34, y: y + 0.34, w: 5.55, h: 0.62, fontSize: 11.5, color: P.MUT, lineSpacingMultiple: 1.18 });
  });
  notes(s, "Documented design decisions, each with rationale in the README or source comments: zero-dependency stack, dual versioned schemas, the enrichment feedback-loop guard, never-break-pi try/catch, 200k truncation, the stdin ignore quirk (hit identically in enrich.js and research.ts), enrichment through the pi harness instead of direct API calls, and the honest-brief instruction. Also documented: soft failures stay 'suspected' until confirmed, and a central-dir install warning (copies in a project's .pi/extensions/ would double-log).");
}

// ================= S10 · TIME & EXTRA COST =================
{
  const s = pres.addSlide();
  header(s, "k10", "t10", "10");
  const cols = [
    ["MONITOR", "1 append", "per event", ["a single sync appendFileSync — no queues, no extra LLM calls", "overhead is a design guarantee: mkdir once, try/catch always", "honesty: the repo claims no latency benchmarks"], P.BLUE, P.BLUE_T],
    ["/RESEARCH", "2\u20135 min", "end to end", ["4 pi runs — 3 parallel streams + 1 refine — plus ~14 short LLM calls", "real fixture: 6m 25s including one stream timed out and dropped", "10-minute cap per stream"], P.AMBER, P.AMBER_T],
    ["ENRICHMENT", "$0.000049", "per turn, measured", ["zai/glm-5.3-flash via headless pi — a real logged turn cost $0.000049", "5-minute timeout \u00D7 2 attempts, then the session stays unanalyzed", "serialized: one enrichment at a time, fires 60 s after session end"], P.GREEN, P.GREEN_T],
  ];
  cols.forEach((c, i) => {
    const x = MG + i * 4.18, w = 3.85;
    card(s, x, 1.55, w, 3.75);
    txt(s, c[0], { x: x + 0.28, y: 1.8, w: 3.3, h: 0.27, fontSize: 10.5, bold: true, color: P.MUT, charSpacing: 2.5 });
    txt(s, c[1], { x: x + 0.28, y: 2.12, w: 3.3, h: 0.62, fontFace: MONO, fontSize: 34, bold: true, color: c[4] });
    txt(s, c[2], { x: x + 0.28, y: 2.78, w: 3.3, h: 0.26, fontSize: 11, color: P.MUT, fontFace: MONO });
    s.addShape(pres.shapes.LINE, { x: x + 0.28, y: 3.18, w: w - 0.56, h: 0, line: { color: P.HAIR, width: 0.75 } });
    c[3].forEach((li, j) => {
      sq(s, x + 0.28, 3.42 + j * 0.62, 0.1, c[4]);
      txt(s, li, { x: x + 0.5, y: 3.34 + j * 0.62, w: w - 0.82, h: 0.6, fontSize: 10.5, lineSpacingMultiple: 1.15 });
    });
  });
  // dashboard cost strip
  card(s, MG, 5.6, 12.23, 1.3, P.GRAY_T);
  txt(s, "THE DASHBOARD ITSELF", { x: 0.85, y: 5.8, w: 3.5, h: 0.25, fontSize: 10, bold: true, color: P.MUT, charSpacing: 2 });
  txt(s, "parse cache keyed on mtime+size — unchanged logs are read once per server run, so months of sessions stay fast · watcher wakes every 5 s · SPA refreshes every 15 s", { x: 0.85, y: 6.1, w: 11.5, h: 0.65, fontFace: MONO, fontSize: 10.5, lineSpacingMultiple: 1.3 });
  txt(s, "Figures: README.md · pi/README.md · dashboard/test/fixtures/research-session.jsonl", { x: MG, y: 7.05, w: 9, h: 0.25, fontSize: 9.5, color: P.MUT, fontFace: MONO });
  notes(s, "Cost of observation, honestly stated. Monitor: one sync append per event — architectural guarantee, not a benchmark (the repo makes no latency claims). /research: 4 pi runs + ~14 short LLM calls, typically 2-5 minutes; the checked-in fixture ran 6m25s with one stream timing out and being dropped. Enrichment: glm-5.3-flash through headless pi, 5-min timeout × 2 attempts, serialized; real logged per-turn cost $0.000049. Dashboard: mtime+size parse cache keeps months of logs fast.");
}

// ================= S11 · MEASURABLE BENEFITS =================
{
  const s = pres.addSlide();
  header(s, "k11", "t11", "11");
  // left: what you can measure
  const bf = [
    ["9 KPI cards", "sessions · tool calls · hard errors · suspected soft failures · correction vs info steers · tokens · cost · analyzed N/M", P.BLUE],
    ["9 charts", "sessions/day, tool distribution, tool health, median duration, tokens & cost, prompts-per-session drift proxy, drift roots, failure roots, habits", P.CYAN],
    ["Soft-failure forensics", "8 regex families catch \u201Cnot recognized\u201D-class failures that exit 0 — flagged \u201Csuspected\u201D until the model confirms a root cause", P.AMBER],
    ["Prompt coach", "8 habit tags with counts and suggested rewrites — your prompting habits, named and tallied", P.PURPLE],
  ];
  bf.forEach((b, i) => {
    const y = 1.6 + i * 1.32;
    sq(s, MG, y + 0.07, 0.16, b[2]);
    txt(s, b[0], { x: MG + 0.36, y, w: 5.9, h: 0.3, fontSize: 14.5, bold: true });
    txt(s, b[1], { x: MG + 0.36, y: y + 0.34, w: 5.9, h: 0.85, fontSize: 11, color: P.MUT, lineSpacingMultiple: 1.2 });
  });
  // right: real-run evidence card
  card(s, 7.1, 1.55, 5.68, 5.0, P.GREEN_T);
  chip(s, 7.4, 1.82, "REAL RUN — STEERING TEST, 3 PROMPTS", P.GREEN, P.CARD, 9);
  txt(s, "3", { x: 7.35, y: 2.25, w: 1.15, h: 1.0, fontFace: MONO, fontSize: 60, bold: true, color: P.GREEN });
  txt(s, "wasted turns —\ncounted, not felt", { x: 8.6, y: 2.5, w: 3.9, h: 0.7, fontSize: 13.5, bold: true, lineSpacingMultiple: 1.15 });
  const ev2 = [
    ["detour priced", "one correction cost 5 turns · 4 tool calls · 30 s — detourCost, per prompt"],
    ["drift rooted", "root cause prompt_ambiguity, backed by 6 cited event indexes"],
    ["coach verdict", "2 suggested rewrites — tagged ambiguity, missing_constraint, unstated_preference, wrong_scope"],
    ["traceable", "every finding cites event [N] \u2192 the exact raw log line, replayable in the UI"],
  ];
  ev2.forEach((e, i) => {
    const y = 3.55 + i * 0.73;
    sq(s, 7.42, y + 0.05, 0.11, P.GREEN);
    txt(s, e[0], { x: 7.64, y, w: 1.55, h: 0.5, fontSize: 11.5, bold: true, color: P.GREEN });
    txt(s, e[1], { x: 9.2, y: y + 0.01, w: 3.4, h: 0.68, fontSize: 10.5, lineSpacingMultiple: 1.15 });
  });
  txt(s, "Prompting becomes numbers: which corrections cost turns, which habits recur.", { x: MG, y: 6.75, w: 6.2, h: 0.55, fontSize: 12.5, italic: true, color: P.MUT, lineSpacingMultiple: 1.2 });
  notes(s, "The payoff, measurable. The dashboard computes 9 KPI cards and 9 charts (6 overview + drift roots, failure roots, habits), soft-failure forensics, and the prompt coach with 8 habit tags. Evidence from a real logged steering test (logs/steer-test.analysis.json): 3 wasted turns; one correction detour priced at 5 turns / 4 tool calls / 30 s; drift rooted to prompt_ambiguity with 6 cited events; 2 coach rewrites; and every finding cites event [N] traceable to the raw JSONL line.");
}

// ================= S12 · STATUS & TAKEAWAYS (dark) =================
{
  const s = pres.addSlide();
  s.background = { color: P.DK_BG };
  voxel(s, 12.18, 0.42, P.LBLUE, P.GREEN, P.AMBER, 0.16);
  voxel(s, 12.2, 6.5, P.AMBER, P.LBLUE, P.GREEN, 0.16);
  img(s, "t12", MG, 0.75, 0.52);
  const tk = [
    ["Zero-dependency, end to end", "server, SPA, and tests on the Node stdlib — 63 tests in 4 suites, zero npm installs to run or to test", P.LBLUE],
    ["The loop closes on itself", "an agent watches your agent, and an AI grades the prompts — with a guard so enrichment never enriches itself", P.GREEN],
    ["Honest by design", "\u201Csuspected\u201D until confirmed · versioned on both sides · the brief defers to the codebase", P.AMBER],
  ];
  tk.forEach((t, i) => {
    const y = 1.9 + i * 1.42;
    sq(s, MG, y + 0.08, 0.17, t[2]);
    txt(s, t[0], { x: MG + 0.4, y, w: 8.9, h: 0.38, fontSize: 19, bold: true, color: "FFFFFF" });
    txt(s, t[1], { x: MG + 0.4, y: y + 0.44, w: 8.9, h: 0.6, fontSize: 13, color: P.DK_MUT, lineSpacingMultiple: 1.2 });
  });
  // limits + repo
  rect(s, MG + 0.04, 6.25 + 0.04, 12.23, 0.72, "05060A");
  rect(s, MG, 6.25, 12.23, 0.72, P.DK_CARD, P.DK_LINE, 1.5);
  txt(s, "v0.1.0 · single-user · localhost-only · no latency benchmarks yet — the honest limits", { x: 0.85, y: 6.25, w: 8.2, h: 0.72, fontFace: MONO, fontSize: 11.5, color: P.DK_MUT, valign: "middle" });
  txt(s, "github.com/aryan-rajoria/nano-super", { x: 9.1, y: 6.25, w: 3.3, h: 0.72, fontFace: MONO, fontSize: 11, color: P.LBLUE, align: "right", valign: "middle" });
  img(s, "pi_white", 10.35, 1.9, 1.7);
  txt(s, "12 / 12", { x: 12.1, y: 7.09, w: 0.7, h: 0.25, fontFace: MONO, fontSize: 9.5, color: P.DK_MUT, align: "right" });
  notes(s, "Closing. Status: v0.1.0, single-user localhost tool. Three takeaways: the zero-dependency discipline holds end to end (63 node:test cases across 4 suites); the meta-loop is closed but guarded; honesty is systemic (suspected-until-confirmed soft failures, versioned schemas, brief defers to codebase). Honest limits: no latency benchmarks yet, bound to 127.0.0.1, one user. Repo: github.com/aryan-rajoria/nano-super.");
}

pres.writeFile({ fileName: "nano-super-deep-dive.pptx" }).then(() => console.log("WROTE nano-super-deep-dive.pptx"));
