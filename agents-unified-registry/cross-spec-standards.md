# Cross-Spec Standards Layer — Agent Skills, Agent Plugins, AGENTS.md, `.agents/`, MCP Registry

Research date: 2026-10-16 (all live sources accessed same day unless noted). Feeds deck slides
4–7 + the "what normalizes" verdict. UNVERIFIED = not confirmed from a primary source.
Companion files: claude-code.md, codex.md, opencode.md, pi.md (Phase 1), _00-advisor-plan.md.

## 0. TL;DR (quotable)

- **Two bundle standards exist and they don't share a steward**: Agent Skills (Anthropic-donated,
  Dec 2025, informal governance, unversioned, 46 showcased clients) and Agent Plugins
  (v1.0.0, 2026-08-06, TSC from Amazon/Cursor/Microsoft/OpenAI/Vercel + Google joining at launch;
  **Anthropic absent**; 9 compatible clients). Anthropic's formats (SKILL.md, mcp.json) are *inside*
  Agent Plugins, yet Anthropic's own harness (Claude Code) consumes neither the plugin format nor
  the `.agents/` directory. "The spec unified us, the paths divided us" (community, Jan 2026).
- **Neutrality is consolidating at the Linux Foundation's Agentic AI Foundation (AAIF, 2025-12-09)**:
  Anthropic donated MCP, OpenAI contributed AGENTS.md, Block contributed Goose — but Agent Skills
  and Agent Plugins both sit OUTSIDE AAIF today (skills = informal GitHub/Discord; plugins = TSC).
- **Adoption verdict for our four harnesses**: Agent Skills = all four consume (Claude Code, Codex,
  OpenCode, Pi). Agent Plugins = **only Codex** (via ChatGPT & Codex). Claude Code, OpenCode, Pi
  are absent from the rendered compatible-clients list and their docs never mention the spec.
- **MCP Registry is the governance blueprint to copy**: reverse-DNS identities, DNS/GitHub namespace
  verification, metadata-only records pointing at npm/PyPI/Docker, OpenAPI spec so aggregators
  federate (~hourly pulls), "no private servers, no code hosting, no scanning — delegate".

---

## 1. Agent Skills spec (agentskills.io)

### 1.1 What it is, who holds it
- Format: a skill = directory with `SKILL.md` (YAML frontmatter + Markdown body) + optional
  `scripts/`, `references/`, `assets/`. Loading = progressive disclosure, 3 stages:
  metadata ~100 tokens (name+description at startup) → instructions <5k tokens recommended
  (SKILL.md on activation; keep <500 lines) → resource files on demand.
- **Governance history**: developed by Anthropic, launched 2025-10-16 as a Claude feature
  (engineering blog "Equipping agents for the real world with Agent Skills"); repo
  `agentskills/agentskills` created **2025-12-16**; blog update **2025-12-18**: "We've published
  Agent Skills as an open standard for cross-platform portability." Donation framing follows
  Anthropic's MCP playbook (which went to the Linux Foundation's AAIF 9 days earlier, 2025-12-09).
- **Current steward**: informal. Site text: "originally developed by Anthropic… The standard is
  open to contributions from the broader ecosystem." No GOVERNANCE.md, no MAINTAINERS file, no TSC
  in the repo — just README + CONTRIBUTING.md + GitHub + Discord. Repo: 26,220 stars, 145 commits,
  last push 2026-08-09. **Unversioned living spec**: zero releases/tags; the specification page
  carries no version number or date; changes land by commit to docs.
- Tooling: `skills-ref` reference library (repo `skills-ref/`) — `skills-ref validate ./my-skill`
  checks frontmatter + naming conventions. Licenses: code Apache-2.0, docs CC-BY-4.0.

### 1.2 Full field list (specification page, verbatim constraints)
| Field | Required | Constraints |
|---|---|---|
| `name` | Yes | 1–64 chars; unicode lowercase `a-z`, `0-9`, hyphen only; no leading/trailing hyphen; no consecutive hyphens; **must match parent directory name** |
| `description` | Yes | 1–1024 chars; non-empty; what + when; keyword-rich recommended |
| `license` | No | License name or pointer to bundled license file; keep short |
| `compatibility` | No | 1–500 chars; environment requirements (product, system packages, network) |
| `metadata` | No | string→string map for client-specific extras; "make key names reasonably unique" |
| `allowed-tools` | No | Space-separated pre-approved tools, e.g. `Bash(git:*) Read` — **Experimental; support varies** |

Body: unrestricted Markdown. Six fields total; that minimalism is the spec's adoption engine.

### 1.3 Adoption reality-check — 46 clients, verified
The client showcase (agentskills.io/clients, data array counted 2026-10-16) lists exactly **46**
products, each with logo + setup-instructions link. Major names: Claude Code, Claude (claude.ai),
ChatGPT & Codex, Cursor, GitHub Copilot, VS Code, Gemini CLI, OpenCode, Pi, Goose, Amp, OpenHands,
Junie, Kiro, Roo Code, Factory, Databricks (Genie Code), Snowflake Cortex Code, TRAE, Spring AI,
Mistral Vibe, Tabnine, Qodo, Laravel Boost, Pulumi Neo, Hermes Agent (Nous), OpenClaw, Letta,
plus 19 smaller/newer entrants (ZeroClaw, Autohand, Mux, Firebender, Piebald, Agentman, Command
Code, Ona, VT Code, Emdash, Workshop, Google AI Edge Gallery, nanobot, fast-agent, bub, Vita,
Superconductor, Deep Code). **All four of our target harnesses are on the list.** The showcase is
self-curated (logo + link submission), so it measures claimed support, not audited conformance —
but the four harness entries each point at their own official docs.

### 1.4 Spec-compliance vs vendor extensions (where implementations diverge)
| Client | Extension behavior (Phase 1 + spec docs) |
|---|---|
| Claude Code | Accepts spec fields + rich extras: `when_to_use`, `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`, `disallowed-tools`, `model`, `effort`, `context: fork`, `hooks`, `paths`, `shell`. **claude.ai uploads hard-error on non-spec fields; local Claude Code accepts them.** Truncates description+when_to_use at 1,536 chars. Enforces name-matches-dir. |
| Codex | Spec fields + `agents/openai.yaml` sidecar (interface branding, `policy.allow_implicit_invocation`, MCP dependencies w/ `skill_mcp_dependency_install`). Never merges same-named skills. |
| OpenCode | Spec fields; `metadata` keys `opencode/autoinvoke: "false"` (hide from auto-list) and `opencode/slash: "true"` (expose as `/cmd`); honors Claude's `disable-model-invocation` (its own key wins). `license`/`compatibility` accepted-but-ignored; skill id = directory name, `name` display-only. |
| Pi | Spec fields + `disable-model-invocation`; **name need not match dir (no warning)**; recursive discovery stops at any dir containing SKILL.md; `allowed-tools` behavior thin (UNVERIFIED beyond docs). |
| Spec escape hatch | `metadata` (string→string map) is the sanctioned extension channel — OpenCode's `metadata.opencode/*` uses it correctly; Claude's extra top-level fields technically violate the closed frontmatter set (validators warn; claude.ai rejects). |

Takeaway for the registry: **emit spec-pure `name`+`description` (+ `metadata` namespaced keys),
keep vendor extras in overlays** — a skill that stays spec-pure works everywhere today.

---

## 2. Agent Plugins spec (agent-plugins.org)

### 2.1 Version + governance reality
- **v1.0.0, published 2026-08-06** (launch-day posts: Google Developers Blog and AWS Open Source
  Blog, both Aug 6, 2026; GitHub blog ships it in VS Code/Copilot Aug 12, 2026). A **1.1.0 working
  draft** exists in the repo (README). Schema pinned by URL:
  `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json` (required `$schema`).
- Repo `agentplugins/agent-plugins-spec`: first commit **2026-04-03**, latest **2026-08-19**, 81
  commits, ~1.4k stars — and, like Agent Skills, **zero releases/tags**: "1.0.0" exists only as
  spec text + schema URL, not a git artifact. Both bundle standards are versioned-in-prose.
- **TSC = all Core Maintainers + Lead** (Technical Charter, GOVERNANCE.md): roles held by
  individuals, no company seats, "No single vendor may control a majority of Core Maintainer
  seats"; quorum 50%, majority votes, 2/3 for charter amendments; spec CC-BY-4.0, code Apache-2.0;
  trademarks held in trust by a neutral entity.
- **MAINTAINERS.md roster (verified 2026-10-16)**: Clare Liguori (Amazon), Roshan Sadanani
  (Cursor), Harald Kirschner (Microsoft), Gav Verma (OpenAI), **Jonathan Hefner (Vercel) — Lead
  Core Maintainer**. Google announced it "joins as a Core Maintainer" (Kevin Hou) in the Aug 6
  2026 launch post; MAINTAINERS.md does not yet list Google (either pending or post-date —
  UNVERIFIED which). **Anthropic: absent from TSC, from the launch posts, and from the
  compatible-clients list** — while both of the component formats bundled by the spec (Agent
  Skills, mcp.json) are Anthropic-originated. Press framed the gap directly (The New Stack,
  2026-08-17: "Anthropic defined the standards inside Agent Plugins. So why isn't it in?").

### 2.2 Package layout (normative)
```
my-plugin/
├── plugin.json        # REQUIRED at root; closed field set
├── skills/<name>/SKILL.md   # each IMMEDIATE child dir w/ SKILL.md = one skill; no deeper search
├── mcp.json           # optional; {$schema, mcpServers} only
└── <reverse-dns>/     # client extension dir, e.g. com.openai/ (files) — client-defined
```
- **plugin.json = closed set of 9 top-level fields**: `$schema` (required, exact URL), `name`
  (required; 1–64 chars; `a-z 0-9 - .`; alphanumeric ends; no `--`/`..`), `version` (type-checked
  only — SemVer recommended, NOT enforced), `description`, `author{name,email,url}`, `homepage`,
  `repository`, `license`, `keywords[]`, `extensions` (map of reverse-DNS namespaces). **Unknown
  top-level fields: report + ignore, keep loading** (MUST NOT assign semantics). Other violations
  are fatal.
- **mcp.json / mcpServers**: closed variants — stdio (`command` required as single token, `args`,
  `env`, `cwd`) or http (`url` required, `headers`) / sse; clients must support ≥1 of
  stdio/streamable-http; unknown or cross-variant fields invalidate the entry. Placeholders
  `${PLUGIN_ROOT}` / `${PLUGIN_DATA}` (persistent per-instance data dir, survives updates) expand
  in args/env-values/cwd only. **Non-loopback URLs MUST be HTTPS; no user-info/fragments; no
  OAuth or credential fields in v1** — auth discovery/interaction/storage is client-managed.
- **Extension/overlay rules**: manifest data under `extensions.<namespace>`; files under a
  top-level dir named exactly a namespace (client SHOULD control the domain, e.g.
  `com.example.client/`). Unimplemented namespaces are ignored unvalidated; the spec assigns no
  portable semantics to them. Codex's `extensions.com.openai` + `.codex-plugin/` overlay is the
  worked example (Phase 1 codex.md).
- **Safety rules in-spec**: path containment (all paths must resolve within the plugin root;
  symlinks MAY point inside, escapes MUST be rejected); graded failure boundaries (bad manifest →
  reject plugin; bad fixed location → kill that component type; bad SKILL.md → skip skill; bad
  server entry → disable server; rest → deny path). Explicitly **not a sandbox**.

### 2.3 What the spec deliberately does NOT cover
- **Marketplaces, distribution, installation, publishing — absent from the spec entirely**;
  distribution is client-owned (GitHub discussion #42 = non-normative guidance for
  agent-agnostic marketplaces). Codex's `.agents/plugins/marketplace.json` is **Codex's own
  catalog format, NOT part of the spec** (common misconception — keep separate in the deck).
- **Only two component types in v1**: skills + MCP. "Other proposed component types — such as
  commands, hooks, agents, rules, and LSP servers" are explicitly excluded. No fallback-after-
  failed-connection semantics; bare-command PATH resolution is client-defined.
- **FUTURE_CONSIDERATIONS.md (non-normative)**: permission/approval UX + graduated trust levels,
  **cryptographic signature verification + attestation chains**, `secrets` field with
  client-mediated injection, org-scoped registries w/ approval workflows, audit-trail event
  schema, `dependencies` field, conformance test suites. (A registry can pre-build these.)

### 2.4 Adoption — who can CONSUME a package today (the high-risk unknown, resolved)
Rendered compatible-clients page (agent-plugins.org/compatible-clients, 2026-10-16) lists **9
clients**, each with per-component support; every one loads Agent Skills + MCP stdio +
streamable-http (several add legacy SSE):

**VS Code, Cursor, GitHub Copilot, ChatGPT & Codex, Kiro, Hermes Agent, OpenClaw, Grok Bot,
NanoClaw.** (VS Code corroborated by GitHub blog 2026-08-12: "Agent Plugins 1.0 in VS Code,
Copilot CLI, and the Copilot App"; Copilot CLI/App ride the same entry.)

Mapped to our four harnesses:
| Harness | Consumes agent-plugins packages? | Evidence |
|---|---|---|
| **Codex** | **YES — verified** | official plugin docs scaffold portable root `plugin.json` ($schema agent-plugins.org) + `.codex-plugin/` overlay + `extensions.com.openai`; listed via "ChatGPT & Codex" entry |
| **Claude Code** | **NO — absent + declined-by-silence** | not on compatible-clients; docs describe only `.claude-plugin/plugin.json` (same filename, different location+schema — The New Stack "portability gaps" 2026-08-17); no doc mentions the spec. Whether it incidentally tolerates a root plugin.json: **UNVERIFIED, assume no** |
| **OpenCode** | **NO — absent** | not on compatible-clients; v2 plugins are npm TS modules (`opencode plugin add pkg`); docs never mention agent-plugins |
| **Pi** | **NO — absent** | not on compatible-clients; packages = npm w/ keyword `pi-package`; docs never mention agent-plugins |

**Verdict: a single agent-plugins package is consumed by 1 of our 4 harnesses (Codex) — but its
`skills/` payload reaches all 4, because skills are Agent Skills.** Practical corollary: ship the
portable layout, plus `.claude-plugin/plugin.json` and per-harness emitters, until Anthropic
moves. Also note Google's launch commitment ("starting to build support into our own products":
Agents CLI, Data Agent Kit) and Gemini CLI's absence from the current 9 — the list will grow.

---

## 3. AGENTS.md convention (agents.md)

- **Format**: plain Markdown "README for agents" at repo root (+ nested; **nearest file to the
  edited file wins**; explicit chat prompts override). No required fields, no frontmatter, no
  schema — "AGENTS.md is just standard Markdown." Agents may auto-run listed test commands.
- **Custodian**: emerged from "OpenAI Codex, Amp, Jules from Google, Cursor, and Factory"
  (site); repo `agentsmd/agents.md` created **2025-08-19** (24,966 stars). **2025-12-09: OpenAI
  contributed AGENTS.md to the new Agentic AI Foundation (Linux Foundation)** — site now: "AGENTS.md
  is stewarded by the Agentic AI Foundation under the Linux Foundation," © "a Series of LF
  Projects, LLC." The only one of our four standards with a foundation-neutral home.
- **Adoption**: site claims "used by over 60k open-source projects" and lists ~24 agents
  (Codex, Jules, Factory, Aider, Goose, OpenCode, Zed, Warp, VS Code, Devin, UiPath, Junie, Amp,
  Cursor, RooCode, Gemini CLI, Kilo Code, Phoenix, Semgrep, GitHub Copilot coding agent, Ona,
  Windsurf, Augment Code…).
- **Our four**: Codex **native** (global `~/.codex/AGENTS.md` + root→cwd walk, 32 KiB default
  cap); OpenCode **native** (primary rules format; CLAUDE.md only as fallback); Pi **native**
  (AGENTS.md/CLAUDE.md context files, cwd + all ancestors, no trust gate); Claude Code
  **fallback only** (reads AGENTS.md when no CLAUDE.md, v2.1.277, ~2026-09-19). Registry
  implication: AGENTS.md is safe as the instruction artifact for all four, but Claude Code users
  who keep a CLAUDE.md will shadow it — emit CLAUDE.md as a pointer/symlink, or rely on the
  fallback.

## 4. `.agents/` directory convention

- **Origin + status**: no ratified standard, no owning body. Longest-running thread: agents.md
  issue **#71 "Proposal: Standardize a .agent Directory"**, opened **2025-09-25**, **still open**
  (24 comments) — the `.agent` vs `.agents` split was never settled. Community framing: "The spec
  unified us, the paths divided us" (r/ClaudeCode, Jan 2026). De-facto winners: `~/.agents/skills/`
  (user) and `<repo>/.agents/skills/` (project), plus Codex's `.agents/plugins/marketplace.json`.
- **Who reads it today**: **Codex** (skills at `.agents/skills` + `~/.agents/skills` after
  migrating off `~/.codex/skills` early 2026; plugin marketplaces at `.agents/plugins/`),
  **Pi** (both skill locations since 0.54.0, 2026-02-19; project layer not trust-gated; dropped
  its old `~/.claude`/`~/.codex` readers when `.agents` landed), **OpenCode** (reads `.agents/skills`
  + `~/.agents/skills` alongside `.claude/skills` + `.opencode/skills`, later-dir-wins), and
  outside our four: GitHub Copilot (`~/.agents/skills` user + `.agents/skills` project), Cursor
  (loads `~/.agents/skills` for compat), vercel-labs/skills CLI writes it for Cline/Cursor/Warp/
  Zed/Amp. NVIDIA NeMo Gym and others recommend a canonical `.agents` tree + symlinks to vendor
  paths.
- **Claude Code's absence is now explicit**: feature request **anthropics/claude-code#66352**
  ("Support user-level .agents/skills/ discovery for cross-agent single-source-of-truth
  workflows", filed 2026-06-08) was **closed as `not_planned` on 2026-07-16**. Claude Code
  discovers only `~/.claude/skills/` + `.claude/skills/` (+ enterprise/plugin/synced). Registry
  consequence: one canonical skill store + **symlinks into `~/.claude/skills/`** (Codex follows
  symlinks; Claude Code reads the linked dir) remains the only single-source-of-truth mechanism.

## 5. MCP + MCP Registry (the governance blueprint)

- **Protocol custody**: Anthropic donated MCP to the **Agentic AI Foundation (Linux Foundation)
  on 2025-12-09** (same announcement that created AAIF; founding contributions: Anthropic→MCP,
  OpenAI→AGENTS.md, Block→Goose). All four harnesses speak MCP (stdio + streamable HTTP; Pi added
  it 0.99.0, 2026-09-29, after its famous "never MCP" stance; config syntax differs: JSON
  everywhere except Codex TOML — Pi docs: Claude/Cursor mcp.json entries "copy as-is").
- **Registry** (registry.modelcontextprotocol.io): **preview** since **2025-09-08**; **API freeze
  v0.1** since **2025-10-24** ("breaking changes or data resets may occur before GA"). Backed by
  "major trusted contributors to the MCP ecosystem such as **Anthropic, GitHub, PulseMCP, and
  Microsoft**"; run day-to-day by a community Registry Working Group — Radoslav Dimitrov (Stacklok,
  lead), Tadas Antanavicius (PulseMCP), Bob Dickinson (TeamSpark), Preeti Dewani (Ravenmail).
- **Model — metadata-only, verify-then-point, delegate**:
  - Identity: **reverse-DNS** server names (`io.github.user/server`, `me.adamjones/...`); publish
    requires **namespace ownership proof**: GitHub OAuth/OIDC for `io.github.*`, **DNS or HTTP
    challenge** for custom domains; publishing via `mcp-publisher` CLI (not PRs).
  - Record: **`server.json`** (schema `2025-12-11`): `$schema`, `name`, `title`, `description`,
    `version`, `websiteUrl`, `repository{url,source,id,subfolder}`, `packages[]`
    (`registryType` npm|pypi|nuget|cargo|oci|mcpb, `registryBaseUrl` restricted to an allowlist —
    registry.npmjs.org, pypi.org, api.nuget.org, crates.io, docker.io/ghcr.io/quay.io/*.pkg.dev/
    *.azurecr.io/mcr.microsoft.com, GitHub/GitLab releases for .mcpb — `identifier`, `version`,
    `runtimeHint` npx/uvx/dnx, `fileSha256`, `transport` stdio|streamable-http|sse, args/env
    templates), `remotes[]` (url templates + headers), `_meta` (only
    `io.modelcontextprotocol.registry/publisher-provided` preserved, 4 KiB cap). **The registry
    hosts no code** — packages live on npm/PyPI/Docker; **no private servers**; **no security
    scanning** (delegated to package registries + aggregators).
  - API: `/v0.1/servers`, `/v0.1/servers/{name}/versions[/{version}][/status]`, `/v0.1/publish`,
    with a published **OpenAPI spec so aggregators/other registries can implement the same
    surface**; downstream aggregators expected to pull "on a regular but infrequent basis (for
    example, once per hour)". Self-hosting: Docker images exist (GHCR) but the project is "not
    designed for self-hosting" and unsupported.
  - Scale: public API serves **26,000+ server rows across 260+ pages** with **9,696 distinct
    server names in the first 26k rows** (our pagination count, 2026-10-16; ~2.7 rows per name =
    version duplicates; end of pagination not reached). PulseMCP's independent ecosystem directory
    lists **21,698** MCP servers (Oct 2026); Phase 1 recorded ~9,652 registry servers 2026-05-24.
- **Fit for a unified registry**: the layer to copy — verified namespaces, thin metadata pointing
  at existing package hosts, hourly-pull federation, response-level `_meta` (status/publishedAt/
  updatedAt/isLatest) the publisher cannot forge. Skills/plugins have no equivalent registry yet.

---

## 6. Standards comparison table

| | Agent Skills | Agent Plugins | AGENTS.md | `.agents/` dirs | MCP + Registry |
|---|---|---|---|---|---|
| **Steward** | Informal (Anthropic-originated; GitHub+Discord, no TSC) | TSC (individuals; Amazon, Cursor, Microsoft, OpenAI, Vercel; Google joining; **Anthropic absent**) | Agentic AI Foundation / Linux Foundation (OpenAI-contributed) | None (community convention; agents.md issue #71 open since 2025-09-25) | MCP→AAIF (Anthropic-donated 2025-12-09); Registry WG (Stacklok/PulseMCP/TeamSpark/Ravenmail) + Anthropic/GitHub/Microsoft backing |
| **Version/date** | Unversioned living spec; donated 2025-12-16/18; no tags | 1.0.0 published 2026-08-06; 1.1.0 draft; no git tags | Unversioned; repo 2025-08-19; AAIF 2025-12-09 | No version; de-facto since late 2025 | Registry preview 2025-09-08; API freeze v0.1 2025-10-24; server.json schema 2025-12-11 |
| **Artifact covered** | One skill (SKILL.md dir) | Bundle: skills + MCP (+ client overlay dirs) | Repo instructions file | Discovery/install paths for skills (+ Codex plugins) | Tool servers (protocol + metadata record) |
| **Manifest fields** | 6 (2 required) | 9 closed (`$schema`, `name` required; unknown = warn+ignore) | none (free Markdown) | n/a | server.json: name/description/version/repository/packages/remotes/_meta |
| **Namespace / versioning model** | name = dir name; no version field (version only via `metadata`) | name `[a-z0-9.-]`; version type-only (semver recommended); overlays reverse-DNS | filename convention | paths only | **reverse-DNS identity; DNS/GitHub ownership verification; per-name versions + status** |
| **Governance** | Contributor-driven, donor-set precedent | Charter: individual seats, majority rules, no-vendor-majority | Foundation (LF) | none | WG + foundation custody, API freeze process |
| **Adopted by (verified, our four)** | **all 4** (Claude Code, Codex, OpenCode, Pi) + 46 showcased | **Codex only** (9 clients total: VS Code, Cursor, Copilot, ChatGPT&Codex, Kiro, Hermes, OpenClaw, Grok Bot, NanoClaw) | all 4 (Claude Code as fallback; 60k+ repos) | Codex, Pi, OpenCode read; **Claude Code: declined not_planned 2026-07-16** | all 4 speak MCP; registry consumed via aggregators |
| **Gaps for a unified registry** | no versioning, no deps, no signing, no discovery/paths | no marketplaces/distribution; only 2 component types; no auth/credentials; no signing; Claude absent | instructions only; shadowed by CLAUDE.md on Claude | not ratified; Claude Code out | MCP-only; no skills/plugins; no private servers; scanning delegated |

## 7. Overlap / conflict table (registry must reconcile)

| Conflict | Detail | Registry resolution |
|---|---|---|
| Claude `.claude-plugin/plugin.json` vs portable root `plugin.json` | same filename, different dir + schema; Claude docs never mention the spec | dual-emit both manifests from one record |
| skill `allowed-tools` (experimental) vs plugin closed field set | skills carry tool hints; plugins forbid unknown top-level fields (extensions only) | keep tool hints inside SKILL.md/overlay, never plugin.json |
| `.agents/skills` vs `.claude/skills`/`.opencode/skills` paths | format unified, paths divided; Claude Code closed `.agents` request as not_planned | canonical store + symlinks per harness (Codex follows symlinks) |
| Codex `marketplace.json` vs Claude `marketplace.json` vs agent-plugins | three catalog formats, one shared name; NONE is part of the agent-plugins spec | emit both catalog formats from one registry record; don't claim spec status for either |
| AGENTS.md vs CLAUDE.md | CLAUDE.md shadows AGENTS.md on Claude Code; Codex ignores CLAUDE.md by default (needs `project_doc_fallback_filenames`) | emit AGENTS.md + a CLAUDE.md pointer |
| Hooks: Claude/Codex JSON vs Pi extensions vs OpenCode TS plugins | Claude-shape JSON works on 2 of 4; Pi/OpenCode need code adapters | registry-side adapter generation per harness |
| mcp.json (plugin) vs server.json (registry) vs per-harness MCP config | portable stdio/http subset exists in agent-plugins; auth is client-managed | registry stores server.json-shaped metadata; emits mcp.json + TOML/JSON configs |

## 8. What a unified registry should STANDARDIZE vs leave per-harness

**Standardize (proven portable, all-4 reach):**
1. **SKILL.md exactly per spec** — 6 fields, spec-pure; vendor extras only via `metadata.<ns>/*`
   and sidecars (`agents/openai.yaml`, overlays). The only artifact all four harnesses consume today.
2. **agent-plugins bundle layout as the packaging substrate** — root `plugin.json` + `skills/` +
   `mcp.json` + reverse-DNS overlay dirs, even though only Codex loads the bundle natively: it is
   the only vendor-neutral container, its `skills/` and `mcp.json` payloads are the two universal
   formats, and its closed schema is the conformance target. Emit `.claude-plugin/plugin.json`
   alongside until Anthropic converges (dual-manifest cost is trivial; the alternative —
   Claude-only format — forecloses 3 of 4 harnesses).
3. **MCP config subset** (stdio command/args/env + streamable-http url/headers, `${PLUGIN_ROOT}`/
   `${PLUGIN_DATA}`) — translatable to Claude JSON / Codex TOML / OpenCode JSON / Pi JSON mechanically.
4. **AGENTS.md** for instructions (all four, with CLAUDE.md pointer for Claude Code).
5. **Registry mechanics copied from MCP Registry**: reverse-DNS identities, DNS/GitHub namespace
   verification, metadata-only records pointing at git/npm, response-level `_meta`, published
   OpenAPI so aggregators federate, hourly-pull model. Extend its server.json thinking to
   skills/plugins (it currently covers neither).

**Leave per-harness (no convergence exists; adapters, not standards):** discovery paths
(`.claude/.agents/.opencode/.pi/.codex` — symlink farm), install CLIs + trust gates (claude
plugin install / codex marketplace + TOML / opencode plugin add / pi install npm:), hooks
(Claude-shape JSON for Claude+Codex; generate TS extensions for Pi/OpenCode), subagents
(md frontmatter vs TOML vs example-level), commands (legacy; map to skills), themes/output
styles, marketplaces (three formats, none standardized), and any auth/credential handling
(agent-plugins v1 + MCP registry both punt to clients).

**Governance bet**: anchor on the two shipped standards (Skills now, Plugins as it crosses
1.1/Claude), copy the MCP Registry's neutral verification layer, and position for AAIF
donation — both Anthropic (MCP, skills) and OpenAI (AGENTS.md) have already shown donation-to-
foundation is the endgame they accept.

## Sources (accessed 2026-10-16 unless noted)

- Agent Skills spec (fields, constraints, progressive disclosure, skills-ref):
  https://agentskills.io/specification ; home + governance text: https://agentskills.io/ ;
  client showcase (46 entries, counted from page data): https://agentskills.io/clients
- agentskills repo (26,220 stars, created 2025-12-16, no releases/tags, 145 commits, pushed
  2026-08-09; Apache-2.0/CC-BY-4.0): https://github.com/agentskills/agentskills (GitHub API)
- Anthropic donation history: https://www.anthropic.com/engineering/equipping-agents-for-the-real-world-with-agent-skills
  (orig 2025-10-16; update 2025-12-18 "We've published Agent Skills as an open standard")
- Agent Plugins spec v1.0.0 (closed fields, layout, mcp.json, extensions, containment, §refs):
  https://agent-plugins.org/specification ; schemas + docs index: https://agent-plugins.org/llms.txt ;
  rendered compatible-clients (9 clients): https://agent-plugins.org/compatible-clients (via web reader;
  VS Code/OpenClaw cards identified by logo assets; VS Code corroborated by GitHub blog below)
- Agent Plugins governance: GOVERNANCE.md (charter) + MAINTAINERS.md (Liguori/Amazon, Sadanani/Cursor,
  Kirschner/Microsoft, Verma/OpenAI, Hefner/Vercel-Lead) + FUTURE_CONSIDERATIONS.md, all at
  https://github.com/agentplugins/agent-plugins-spec (raw main; first commit 2026-04-03, latest
  2026-08-19, 81 commits, no releases/tags — GitHub API)
- Launch corroboration: https://developers.googleblog.com/agent-plugins-package-your-skills-tools-and-more
  (2026-08-06; Google joins as Core Maintainer, Kevin Hou); https://aws.amazon.com/blogs/opensource/
  aws-supports-agent-plugins-an-open-standard-for-portable-agent-extensions (2026-08-06);
  https://github.blog/changelog/2026-08-12-agent-plugins-1-0-in-vs-code-copilot-cli-and-the-copilot-app ;
  Anthropic-absence analysis: https://thenewstack.io/agent-plugins-portability-gaps (2026-08-17)
- AGENTS.md (format, AAIF/LF stewardship quote, 60k+ repos, adoption list):
  https://agents.md/ ; repo (created 2025-08-19, 24,966 stars): https://github.com/agentsmd/agents.md
- AAIF formation (Anthropic→MCP, OpenAI→AGENTS.md, Block→Goose, 2025-12-09):
  https://www.linuxfoundation.org/press/linux-foundation-announces-the-formation-of-the-agentic-ai-foundation ;
  https://www.anthropic.com/news/donating-the-model-context-protocol-and-establishing-of-the-agentic-ai-foundation ;
  https://blog.modelcontextprotocol.io/posts/2025-12-09-mcp-joins-agentic-ai-foundation
- `.agents/` convention: agents.md issue #71 (opened 2025-09-25, open, 24 comments, GitHub API);
  anthropics/claude-code issue #66352 (closed not_planned 2026-07-16, GitHub API);
  https://www.reddit.com/r/ClaudeCode/comments/1qcigma/agent_skills_the_spec_unified_us_the_paths ;
  Copilot/Cursor path adoption per https://dev.to/debs_obrien/what-are-agent-skills-beginners-guide-e2n
  and https://pub.towardsai.net/agent-skills-vendor-first-commit-always-b384d95400af
- MCP Registry: https://github.com/modelcontextprotocol/registry (README: preview 2025-09-08, WG
  roster, verification methods, mcp-publisher); docs: `docs/modelcontextprotocol-io/about.mdx`
  (backers quote, no-private-servers, aggregators/hourly, self-hosting stance) and
  `docs/reference/server-json/*` (official-registry-requirements.md: restricted base URLs, _meta
  rules; generic-server-json.md: schema fields); OpenAPI: `docs/reference/api/openapi.yaml`
  (/v0.1 endpoints); live count: paginated `GET registry.modelcontextprotocol.io/v0/servers`
  (26,000 rows / 9,696 distinct names in first 260 pages); PulseMCP ecosystem count:
  https://www.pulsemcp.com/servers (21,698)
- Phase-1 files (harness-specific extensions, paths, CLIs): claude-code.md, codex.md,
  opencode.md, pi.md in this directory (all verified 2026-10-16)
