# _00-advisor-plan.md — Advisor synthesis + research plan (2026-10-16)

Inputs: claude-code.md, codex.md, opencode.md, pi.md (Phase 1, verified 2026-10-16) + advisor web research
(live sources, same date). UNVERIFIED = not confirmed from a primary source.

## 1. Synthesis (load-bearing facts)

**The four harnesses (Phase 1, all verified)**
- Claude Code v2.1.302 (npm): richest surface — skills, subagents, hooks (30 events), commands (legacy),
  output-styles, MCP, plugins (`.claude-plugin/plugin.json`) + marketplaces (`.claude-plugin/marketplace.json`
  with 7 source kinds incl. npm/archive/command), themes/workflows/monitors/mods, evals; scriptable
  `claude plugin install --json`, `claude mcp add`. Config root `~/.claude/`.
- Codex rust-v0.163.0: Agent Skills adopted; `.agents/skills` + `~/.agents/skills` (migrated off
  `~/.codex/skills`, early 2026, with churn); portable agent-plugins root `plugin.json` + `.codex-plugin/`
  overlay + `extensions.com.openai`; marketplace catalogs at `.agents/plugins/marketplace.json` /
  `~/.agents/plugins/marketplace.json` (sources: local/url/git-subdir/npm); TOML config; AGENTS.md native;
  hooks JSON is Claude-shape-compatible; trust-gated project layer; subagents = TOML.
- OpenCode 2.0.x (anomalyco, ~214k stars): reads `.claude/skills` AND `.agents/skills` natively; v2 has the
  **skills HTTP catalog** (`index.json`, versioned cache) — most registry-ready native surface of all four;
  plugins = npm packages via `opencode plugin add pkg@ver`; themes JSON; no official marketplace (ocx,
  awesome-opencode, opencode.cafe aggregators); v1→v2 plugin break.
- Pi 1.3.0 (earendil-works): minimal; Agent Skills spec + `~/.agents/skills`; extensions (TS in-process)
  replace plugins/hooks/tools; **npm IS the registry** (`pi install npm:pkg`, keyword `pi-package`, gallery
  pi.dev/packages = 5,361 packages); mcp.json Claude-compatible; project trust gate; subagents = example-level.

**Cross-cutting layer (advisor research, verified unless noted)**
- **Agent Skills spec** (agentskills.io; Anthropic-donated 2025-12-16, repo agentskills/agentskills):
  unversioned living spec (no tagged releases on GitHub). Fields: `name` (1–64 chars, `[a-z0-9-]`, no
  lead/trail/double hyphen, must match dir), `description` (1–1024), `license`, `compatibility` (≤500),
  `metadata` (str→str map), `allowed-tools` (experimental). Progressive disclosure (metadata ~100 tokens →
  body <5k tokens → files on demand). Validator: `skills-ref validate`. Client showcase lists ~45+ clients
  (Claude Code/claude.ai, ChatGPT+Codex, Cursor, GitHub Copilot, VS Code, Gemini CLI, OpenCode, OpenHands,
  Goose, Amp, Junie, Kiro, Roo Code, Factory, Databricks, Snowflake, TRAE, Spring AI, Mistral Vibe, Tabnine,
  Qodo, Laravel Boost, Pulumi Neo, Pi, …). Governance informal (Anthropic-originated, GitHub+Discord, no TSC).
- **Agent Plugins spec v1.0.0** (agent-plugins.org, launched **2026-08-06**): TSC core maintainers from
  Amazon, Cursor, Microsoft, OpenAI, Vercel (+AWS/Google launch blogs). Anthropic ABSENT. `plugin.json`:
  CLOSED field set — `$schema` (required, pins version), `name` (1–64, `[a-z0-9.-]`), `version` (semver
  recommended, not enforced), `description`, `author{name,email,url}`, `homepage`, `repository`, `license`,
  `keywords[]`, `extensions` (reverse-DNS namespaces); unknown top-level fields reported+ignored. Layout:
  root `plugin.json` + `skills/` (immediate children with SKILL.md) + root `mcp.json` (`mcpServers`; stdio
  command/args/env/cwd with `${PLUGIN_ROOT}`/`${PLUGIN_DATA}`; http/sse url+headers; HTTPS except loopback;
  no OAuth/credentials in v1) + reverse-DNS client dirs (fully client-defined). Path containment enforced;
  symlink escapes rejected. **Marketplace/distribution deliberately client-owned — no marketplace.json in the
  spec** (GitHub discussion #42 = guidance for agent-agnostic marketplaces). News claims support in ChatGPT,
  Codex, Cursor, GitHub Copilot, VS Code (per-AWS/Google/eesel writeups; rendered compatible-clients page not
  captured — see gap). Claude Code support: UNVERIFIED/undocumented.
- **`.agents/` convention**: no ratified standard; community debate (`.agent` vs `.agents`, agents.md issue
  #71, Sep 2025; Reddit "the spec unified us, the paths divided us"). De facto: Codex (skills + plugins
  marketplace), Pi (skills), OpenCode (skills), and skills-CLI write it for Cline/Cursor/Warp/Zed/Amp.
  Claude Code does NOT read it. Pi dropped its `.claude`/`.codex` readers when `.agents` landed (0.54.0).
- **MCP registry layer**: official MCP Registry (registry.modelcontextprotocol.io) in **preview**, backed by
  Anthropic/GitHub/PulseMCP/Microsoft; metadata-only `server.json` (reverse-DNS names like
  `io.github.user/server`, points into npm/PyPI/Docker); namespace auth via DNS/GitHub verification; REST
  API v1.0.0 + OpenAPI spec others implement (federated aggregators); NOT self-hostable; no private servers;
  ~9,652 servers (2026-05-24). Third-party registries: Smithery, Glama, mcp-get (status UNVERIFIED),
  PulseMCP. Model for a unified registry: verify namespace, host metadata, delegate scanning/curation.
- **Prior art (who already tried a unified registry)**:
  - **vercel-labs/skills** (`npx skills`, skills.sh): ~35.3k stars, ~80 agents; symlinks one canonical skill
    into every agent dir; skills.sh directory (install counts — top skill ~3.9M; 1.3M+ all-time installs
    shown; topics; per-agent pages; an "Audits" tab; API /docs/api). Fork: antfu/skills-cli. **Skills-only —
    no MCP/hooks/subagents/plugins.** No signing; git-source trust; lockfile via `skills generate-lock`.
  - **ClawHub** (openclaw/clawhub): npm-like public skill registry, semver versioning, tens of thousands of
    skills (31k–60k per varying 2026 reports); operates at scale AND at risk — audits found ~2,371 malicious
    patterns in 31k skills; Unit 42 supply-chain writeup (2026-06).
  - **claude-plugins.dev**: community index of public GitHub Claude plugins+skills (6,000+ skills);
    `npx claude-plugins install`; Claude-only. **buildwithclaude.com**: independent marketplace. Anthropic's
    own: claude.com/marketplace/plugins ("Anthropic verified" badge) + auto-added claude-plugins-official.
  - Harness-native: Codex public directory (plugins with hooks barred), OpenCode HTTP catalog (v2),
    pi.dev/packages (npm index), MCP Registry (MCP only).
  - **Codex `/import`** imports Claude/Cursor skills — a harness-level bridge precedent.
- **Trust/safety corpus**: Snyk ToxicSkills (2026-02): 36% of ClawHub skills flawed, 1,467 malicious;
  SkillJect (arXiv 2602.14211) — automated skill prompt-injection/squatting; Datadog (2026-05): skills'
  dynamic-context commands (`` !`cmd` ``) execute BEFORE prompt-injection defenses; CSA note (2026-05):
  SKILL.md itself is the attack surface; Skill-Inject (Max Planck); "Detecting Malicious Agent Skills"
  (arXiv 2602.06547, 157 confirmed malicious); Cato CTRL (2025-12): ransomware via skills; PromptArmor:
  marketplace-injection hijacks Claude Code. Harness mitigations today: Codex hook review + trust gating;
  Claude `--accept-command <sha256>`, source `sha`/`sha256` pinning, npm source `--ignore-scripts`;
  MCP Registry namespace verification. **No signing standard for skills/plugins exists yet** (Sigstore use
  is third-party/ad-hoc); no cross-harness lockfile exists (skills-CLI lock is skills-only).

## 2. Gap list (what the design + deck still need)

1. **Field-mapping matrix**: one canonical registry record → exact manifest fields each harness consumes
   (incl. divergences: Claude `when_to_use`/`allowed-tools` extensions vs spec-closed set; Codex
   `agents/openai.yaml`; agent-plugins closed schema vs Claude `.claude-plugin/plugin.json` richness).
2. **Install-mechanism matrix**: per harness × per artifact type, the exact command/file-write a registry
   CLI performs (claude plugin install vs file drops vs symlinks; codex marketplace add + TOML enable;
   opencode plugin add / skills URL; pi install npm:) + scope/trust implications. Scattered across Phase 1
   files; never consolidated into one decision table.
3. **Agent Plugins adoption reality-check**: rendered compatible-clients list; whether Claude Code/OpenCode/
   Pi load agent-plugins packages at all (all currently UNVERIFIED); what "support" means per client
   (skills-only vs skills+MCP vs overlays).
4. **Prior-art deep comparison**: skills.sh vs ClawHub vs claude-plugins.dev vs MCP Registry vs OpenCode
   HTTP catalog — models (index vs proxy vs package host), curation, install counts, failure stories,
   what each omits (nothing covers all artifact types × all harnesses — the actual whitespace).
5. **Security/trust design requirements**: consolidated threat table + mitigation menu (namespace
   verification à la MCP Registry, publish-time scanning à la Snyk/audits tab, hook gating à la Codex,
   sha pinning, signing roadmap, lockfile) — currently spread over 8+ sources.
6. **Governance models**: informal (agentskills) vs TSC (agent-plugins) vs corporate-run (skills.sh=Vercel,
   ClawHub=OpenClaw, claude-plugins.dev=community) vs partner-backed (MCP Registry) — and what a neutral
   unified registry should choose.
7. **MVP architecture options + recommendation**: (a) multi-emitter: one record → emit Claude
   marketplace.json + Codex marketplace.json + OpenCode catalog + npm packages; (b) thin index à la MCP
   Registry pointing at git/npm; (c) fork/extend skills.sh model to non-skill artifacts; trade-offs
   (build vs adopt, drift, update propagation).
8. **Numbers for slides**: verified counts (45+ skills clients; ~80 agents in skills CLI; 9.6k MCP servers;
   5,361 pi packages; 6k+ claude-plugins.dev skills; 31k+ ClawHub skills; ~35k stars vercel-labs/skills).

## 3. Recommended division of additional research (4 subagents)

### Agent 1 — `cross-spec-standards.md`
Background (2 lines): A unified registry must sit on the open specs its artifacts target. Two specs dominate:
Agent Skills (agentskills.io, Anthropic-donated, unversioned) and Agent Plugins (agent-plugins.org v1.0.0,
Aug 2026, OpenAI/MS/Amazon/Cursor/Vercel TSC, Anthropic absent); AGENTS.md and the MCP Registry are adjacent
standards.
Mission: Produce the definitive comparison of the four cross-harness standards. Exact scope: (1) Agent Skills
spec — full field/constraint table, versioning reality (interview repo: tags, commits, CHANGELOG), governance
(who merges, Anthropic's ongoing role), `skills-ref` tooling, client showcase with per-client extension
fields (Claude `when_to_use`/`user-invocable`, Codex `agents/openai.yaml`, OpenCode `metadata.opencode/*`).
(2) Agent Plugins v1.0.0 — full schema, mcp.json, extension/overlay rules, GOVERNANCE.md from
github.com/agentplugins/agent-plugins-spec, conformance checklist, and the RENDERED compatible-clients table
(use browser if needed) + which clients actually consume it today (verify Codex docs, Cursor docs, Copilot/VS
Code docs; explicitly test whether Claude Code/OpenCode/Pi acknowledge it — mark UNVERIFIED where absent).
(3) AGENTS.md standard (agents.md): governance, adoption list. (4) MCP Registry as a standard (server.json
schema, well-known URI `/.well-known/mcp/v1/server.json` if confirmed, OpenAPI spec for federated registries).
End with: overlap/conflict table (e.g., skill `allowed-tools` vs plugin closed schema; `.claude-plugin/`
vs root `plugin.json`) and "what a unified registry must normalize vs leave client-specific".
Start from: agentskills.io/specification + github.com/agentskills/agentskills; agent-plugins.org/specification,
/compatible-clients, github.com/agentplugins/agent-plugins-spec; agents.md; modelcontextprotocol.io/registry/*
+ github.com/modelcontextprotocol/registry.
Deck needs: a 4-standard comparison slide (governance/version/adoption/coverage) + the "what normalizes"
verdict.

### Agent 2 — `prior-art-registries.md`
Background: Several registries/directories already exist for subsets of the problem; the deck must show what
thrived, what failed, and the whitespace. Nothing today covers all artifact types (skills+MCP+hooks+agents+
commands+themes) across all harnesses.
Mission: Catalogue and compare every existing registry/directory/marketplace/installer for coding-agent
artifacts. Exact scope: vercel-labs/skills + skills.sh (architecture: symlink model, lockfile, audits tab,
API /docs/api, install-count telemetry, adoption numbers; antfu/skills-cli fork); ClawHub (publish model,
versioning, scale, moderation, security aftermath); claude-plugins.dev + buildwithclaude.com + Anthropic
claude.com/marketplace/plugins (verified badges, submission); pi.dev/packages npm-index model; OpenCode v2
skills HTTP catalog (index.json schema — primary doc) + aggregators (awesome-opencode, opencode.cafe, ocx);
MCP registries (official MCP Registry preview, Smithery, Glama, mcp-get status, PulseMCP — business models,
counts, API surface); awesome-claude-code/awesome-codex lists; npm-as-distribution patterns (pi packages,
Claude npm source with --ignore-scripts); Codex /import bridge; AutoScout24 internal-skills-marketplace
writeup (2026-05) as enterprise precedent. Output: comparison table (operator, artifact types, harnesses,
distribution model, curation/trust, counts, API?, still active?) + "lessons: why X thrived/failed" +
explicit whitespace statement.
Start from: github.com/vercel-labs/skills + skills.sh/docs/api; github.com/openclaw/clawhub + Unit 42 post;
claude-plugins.dev; opencode.ai/v2/docs/skills/; registry.modelcontextprotocol.io/docs; smithery.io,
glama.ai/mcp/servers, pulseMCP.com; tech.autoscout24.com marketplace post.
Deck needs: prior-art landscape slide + one "lessons learned" slide (e.g., index-beats-host, security debt
of scale, vendor-run registries win distribution).

### Agent 3 — `security-trust-model.md`
Background: Skills are untrusted instructions+code; 2026 produced a real attack literature (36% of ClawHub
skills flawed; ransomware delivered via skills). A registry's trust model is a first-class design input, not
an afterthought.
Mission: Build the threat model + mitigation menu for a unified registry. Exact scope: consolidate the 2026
research corpus with primary links and one-line findings each (Snyk ToxicSkills; SkillJect arXiv 2602.14211;
Skill-Inject arXiv 2602.20156; arXiv 2602.06547 malicious-skills detection; Datadog dynamic-context pre-
injection execution; CSA SKILL.md poisoning note; Cato CTRL MedusaLocker; PromptArmor marketplace injection;
Unit 42 ClawHub; Red Hat plugin-hardening guide 2026-08; Pluto Security practitioner guide 2026-04). Then map
harness-side defenses that exist today (Claude: sha/sha256 pinning, `--accept-command`, strict marketplace
entries, npm `--ignore-scripts`, managed lock-down, plugin evals; Codex: hook review gating, project trust,
sandbox/approval, requirements.toml; Pi: project trust, in-process extensions; OpenCode: permissions/policies).
Then design options for a registry: namespace verification (MCP-Registry reverse-DNS + DNS/GitHub challenge),
publish-time scanning/audits (skills.sh Audits tab model), signing (Sigstore/cosign for tarballs — does
anything consume signatures today? mark UNVERIFIED), provenance/attestations (SLSA), lockfile format
(cross-harness: skills generate-lock precedent; what pins plugins? Claude version/sha, Codex ref/sha, OpenCode
pkg@version, pi settings arrays), dependency/installer safety (post-install scripts, `.mcpb`/archive
sha256), and enterprise controls (managed settings, requirements.toml) a registry must respect.
Output: threat table (vector × example × harness exposure × mitigation), mitigation menu ranked MVP→later.
Start from: the arXiv/Snyk/Datadog/CSA/Unit42 links above + code.claude.com/docs/en/plugins + learn.chatgpt.com
hooks/plugins docs.
Deck needs: one threat-stats slide (36%, 2,371/31k, 157 confirmed malicious) + one mitigation-design slide.

### Agent 4 — `design-unified-registry.md`
Background: Phase 1 documented each harness's registration surfaces; the registry must map ONE artifact model
onto all four. Two portable specs (Skills, Plugins) + shared dirs + MCP give partial standardization.
Mission: Produce the design document. Exact scope: (1) Canonical registry record schema (one artifact →
name, description, version, license, author, source, hash, compatibility matrix, per-harness payloads) —
reconciling Agent Skills frontmatter, agent-plugins plugin.json, Claude plugin.json, Codex overlays.
(2) Field-mapping matrix: artifact type × {Claude Code, Codex, OpenCode, Pi} → manifest, path(s), install
command/CLI, scope/trust gate (draw from the four Phase 1 files; verify nothing new unless needed).
(3) Install-mechanism decision table: when to file-drop vs symlink vs CLI vs package; update/lock strategy
per harness; the Claude-unsupported-`.agents` workaround (emit to `~/.claude/skills/`); Codex trust-gating
workaround; OpenCode v1/v2 split. (4) MVP architecture options with a recommendation: (a) multi-emitter
monorepo: one record → emits Claude marketplace.json + Codex `.agents/plugins/marketplace.json` + OpenCode
HTTP catalog + npm `pi-package` publishes; (b) thin metadata index à la MCP Registry (namespace-verified,
points at git/npm); (c) extend skills.sh/skills-CLI to non-skill artifacts; include registry API sketch
(endpoints mirroring MCP Registry OpenAPI where sensible), governance options (neutral org vs TSC vs
donate-to-agentskills/agent-plugins), and a phased roadmap (MVP=skills+MCP; phase 2=agents/commands/hooks via
adapters; phase 3=signing/lockfile).
Start from: the four Phase 1 files in C:\Users\aryan\pro\slides\agents-unified-registry\, MCP Registry docs,
agent-plugins spec, vercel-labs/skills README (symlink/lock model), outputs of Agents 1–3 if available.
Deck needs: the mapping matrix slide, the install matrix slide, the architecture slide, roadmap slide.

## 4. Suggested slide outline (~12–14) — facts each research agent feeds

1. **Title/thesis** — "One registry, every harness": register once, target Claude Code, Codex, OpenCode, Pi.
2. **The fragmentation problem** — 4 harnesses × 8+ artifact types × distinct paths/manifests/CLIs; numbers
   (Phase 1 files; Agent 4 matrix).
3. **Four harnesses at a glance** — vendor/version/license/config-root/plugin-unit/registry-surface table
   (Phase 1).
4. **Standard #1: Agent Skills** — SKILL.md, fields, progressive disclosure, ~45+ clients, unversioned/
   Anthropic-donated (Agent 1).
5. **Standard #2: Agent Plugins** — v1.0.0 Aug 2026 layout, closed schema, overlays, TSC backers, Anthropic
   absent; adoption reality (Agents 1).
6. **Adjacent standards** — AGENTS.md + `.agents/` convention (unified format, divided paths) + MCP protocol
   (Agents 1).
7. **MCP Registry as prior blueprint** — server.json, reverse-DNS + DNS verification, metadata-only,
   aggregator federation, 9.6k servers (Agents 1+2).
8. **Prior-art landscape** — skills.sh (35k stars, 80 agents), ClawHub (31k+ skills, breaches),
   claude-plugins.dev (6k+), pi.dev/packages (5.3k), Anthropic marketplace; the whitespace: nobody covers
   all artifact types × all harnesses (Agent 2).
9. **Lessons from prior art** — index-beats-host, vendor-run distribution wins, scale brings security debt,
   skills-only tools left plugins/MCP/hooks unsolved (Agent 2).
10. **Field-mapping matrix** — one registry record → per-harness manifests/fields (Agent 4).
11. **Install-mechanism matrix** — per-harness install commands, symlink/file-drop strategy, trust gates
    (Agent 4).
12. **Trust & supply chain** — 36% flawed / 2,371 malicious / ransomware vector; harness defenses today;
    registry mitigation menu (namespace verify → scan → sign → lockfile) (Agent 3).
13. **MVP architecture + roadmap** — recommended option, phases, governance choice (Agent 4).
14. **Closing** — interoperability trajectory (specs converging 2025→2026; bet on Skills+MCP now, Plugins
    next), call to action.

## 5. High-risk unknowns (flag for the deck)

- Whether Claude Code (and OpenCode/Pi) can load agent-plugins packages at all — determines if Agent
  Plugins is the registry's bundle format or just Codex/Cursor's (Agent 1 must resolve or mark UNVERIFIED).
- Anthropic's stance on Agent Plugins (absent from TSC while running its own marketplace.json format) —
  registry must dual-emit until convergence.
- `.agents/` may never be read by Claude Code — path fragmentation persists; symlink strategies required.
- ClawHub-scale security debt shows a registry without publish-time scanning is a liability (Agent 3).
- OpenCode v1→v2 break and Pi's rapid 0.x→1.3 churn: per-harness emitters need version tolerance.
- Codex marketplace.json is NOT part of the agent-plugins spec — treating it as the spec's registry format
  would be wrong (common misconception; keep separate in the deck).
