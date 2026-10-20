# prior-art-registries.md — Existing registries/directories/marketplaces for agent artifacts (as of 2026-10-16)

Input for the unified-registry project (Claude Code / Codex / OpenCode / Pi). Live-verified 2026-10-16
unless marked UNVERIFIED or attributed to Phase-1 files (claude-code.md, codex.md, opencode.md, pi.md,
verified 2026-10-16/17) or _00-advisor-plan.md (advisor-verified). Deck target: ~2 slides (landscape + lessons).

## 0. TL;DR numbers (all accessed 2026-10-16)

- vercel-labs/skills: 35.3k stars, 3k forks; ~80 agents supported; launched 2026-01-20; skills-only.
- skills.sh: top skill `find-skills` 3.9M installs; 1,347,500 shown on All-Time tab (metric definitions
  unclear — see §1); 5 audit partners; public API.
- ClawHub: 31,371 skills audited mid-2026; 2,371 flagged malicious-pattern (7.6%); Snyk: 36% of 3,984
  sampled skills flawed, 1,467 malicious (2026-02-05); ClawHavoc: 1,184 skills pulled (Jan–Feb 2026).
- claude-plugins.dev: 11,989 plugins + 63,065 skills indexed (README, 2026-10-16); Claude-only.
- Anthropic claude.com/marketplace/plugins: 341 plugins; "Anthropic verified" badges.
- buildwithclaude.com: 29,500+ plugins, 7,600+ skills, 6,900+ MCP servers; Claude-only.
- pi.dev/packages: 5,361 npm packages (2026-10-16); top package pi-mcp-adapter 1.6M downloads/mo.
- MCP Registry (official): preview since 2025-09-08; ~9,652 latest-version servers (2026-05, UNVERIFIED current).
- Glama: 100,836 MCP servers listed (site stamp "Updated 2026-10-17 04:18"). Smithery: 27,239+ MCPs
  (acquired by Arcade.dev 2026-08-05). mcp.so: ~21–22k (2026, third-party estimate).
- OpenCode v2 HTTP skills catalog: `index.json` + per-version cache — most registry-ready native primitive.
- NOTHING found (searched 2026-10-16) that covers all artifact types × all harnesses. Whitespace holds.

## 1. vercel-labs/skills + skills.sh — the cross-harness skills installer/directory

- **Operator**: Vercel (vercel-labs; npm package `skills`; MIT). Launched **2026-01-20** (Vercel changelog
  "Introducing skills, the open agent skills ecosystem", author Andrew Qu; 17 agents at launch). Scale
  2026-10-16: **35.3k stars, 3k forks, 570 commits**.
- **Artifacts**: skills only (Agent Skills SKILL.md). No plugins, no MCP, no hooks, no subagents/commands.
- **Harnesses**: ~80 agents (README: "OpenCode, Claude Code, Codex, Cursor, and 75 more"); auto-detects
  installed agents; writes each agent's native skills dir (many share `.agents/skills/`).
- **Mechanics**: `npx skills add <owner/repo|url>`; **symlink model** — one canonical copy, symlinked into
  every agent dir (default, "single source of truth, easy updates") vs `--copy` independent copies. Other
  commands: `use` (run without installing), `find` (search), `list`, `remove`, `update`, `init`. Scopes:
  project `./<agent>/skills/` (default) or global `~/<agent>/skills/` (`-g`). Sources = GitHub repos/URLs
  (limits: 10 MiB download / 25 MiB extracted / 1,000 files). Lockfile: current README documents no
  `generate-lock`; lock behavior implied ("remove skills from an exact lock source"); antfu fork README
  references `generate-lock` — **UNVERIFIED in upstream today**.
- **skills.sh directory**: leaderboard (All Time / Trending / Hot), search, Topics, Packs, Official skills,
  Security Audits. Install counts shown per skill; top `find-skills` (vercel-labs) **3.9M installs**;
  All-Time tab total **1,347,500** (the two figures coexist on the site; window/dedup definitions unclear —
  UNVERIFIED which counts what). Third-party: 20,900 installs of the top skill within 6h of launch
  (2026-01-21). Publishers incl. anthropics, microsoft/azure-skills, prisma, supabase, larksuite/mattpocock.
- **API** (`/api/v1/*`, OIDC bearer, 600 req/min): `GET /skills` (leaderboard, views all-time|trending|hot),
  `/skills/search` (fuzzy + semantic), `/skills/curated`, `/skills/{source}/{skill}` (installs, SHA-256
  `hash`, full file tree), `/skills/audit/{source}/{skill}`.
- **Trust**: git-source provenance; **audits delegated to partners** — Gen Agent Trust Hub, Socket, Snyk,
  Runlayer, ZeroLeaks (API docs); audits auto-run "minutes after first install"; /audits page (2026-10-16)
  listed 50 skills, 30 completed (1 High Risk, 3 Med Risk, 5 with Socket alerts). No signing. Telemetry
  opt-out (`DISABLE_TELETRACK`).
- **Monetization**: none visible (Vercel-run ecosystem play). **Fork**: antfu/skills-cli (31 stars,
  2026-10-16; differences not fully documented — UNVERIFIED).
- **Status**: alive, dominant skills installer. Limit for us: skills-only.

## 2. ClawHub — the scale-and-breach cautionary tale

- **Operator**: OpenClaw project (github.com/openclaw/clawhub; site clawhub.ai). Repo 9.5k stars (2026-10-16).
  Launch date UNVERIFIED; platform live by early 2026 (Bitdefender sampled its "first few weeks", Feb 2026).
- **Artifacts**: skills (SKILL.md) + native packages: code plugins, bundle plugins, whole-agent "Claw"
  packages. **Harnesses**: OpenClaw ecosystem (not Claude/Codex/OpenCode/Pi).
- **Mechanics**: npm-like **hosted registry**: `clawhub install @openclaw/demo`; publish `clawhub skill
  publish <path>`; scoped names; versions with changelogs + `latest` tag (semver-style; exact policy
  UNVERIFIED); rename/merge; soft-delete/restore (hard delete admin-only); embedding search
  (OpenAI text-embedding-3-small on Convex); install telemetry when logged in.
- **Scale**: **31,371 skills** in an independent audit scan (mid-2026; post metadata ambiguous between
  2026-03-24 and ~2026-07); "the number everyone references is still around 13,700" earlier in 2026 (same
  audit); advisor plan: 31k–60k across varying 2026 reports. Homepage shows no totals (2026-10-16).
- **Security record** (the lesson):
  - **ClawHavoc** (Koi Security, Jan–Feb 2026): **1,184 malicious skills pulled** (Reddit audit/OWASP;
  Koi's own count 341 malicious in first disclosure).
  - **Snyk ToxicSkills** (2026-02-05): scanned 3,984 skills — **36% flawed, 1,467 malicious/vulnerable**;
  13% critical (per Snyk's Danny Allan).
  - **Bitdefender** (early Feb 2026): ~17% of sampled skills in first weeks carried malicious payloads.
  - **Unit 42** (2026-06-23): 5 evasive skills still unblocked Feb–May — 2 macOS infostealers ("cluw"),
    `omnicogg` (22 MB padding to defeat scanner size limits, passed VirusTotal), `money-radar` (agentic
    affiliate injection), `letssendit` (crypto pump-and-dump front-running). All removed after report.
  - **Independent Reddit audit**: 2,371/31,371 flagged dangerous (7.6%): env-var exfiltration, crypto
    wallet theft, `curl|bash`, prompt injection, reverse shells/obfuscation. At audit time: no built-in
    pre-publish scanning; VirusTotal integration hash-only; registry rescanned every 6h by the auditor.
  - **Silverfort** (2026-03-24): ranking-manipulation vulnerability could push a malicious skill to #1.
- **Response**: post-Feb VirusTotal + ClawScan screening; 2026-06-01 NVIDIA partnership (behavior
  documentation + NVIDIA analysis tool over all skills); security analysis verifies declared runtime
  requirements (env vars, binaries) against observed behavior; medium findings stay visible, "suspicious"
  reserved for high-impact/malicious.
- **Monetization**: none stated (MIT, sponsors). **Status**: alive; emblem of scale-without-scanning debt.

## 3. Claude-side directories and marketplaces

- **claude-plugins.dev** (community; GitHub Kamalnrf/claude-plugins, 564 stars, 2026-10-16): crawls GitHub
  and indexes **11,989 Claude Code plugins + 63,065 agent skills** (README 2026-10-16; earlier reports
  "6,000+ skills" — advisor). Install: `npx claude-plugins install <id>` — one command does
  marketplace-add + plugin-install (resolves id → git URL, clones; needs Claude Code ≥ 2.0.12). Downloads
  shown per plugin (anthropics document-skills 172.7k). API backend on Val Town; pools community OAuth
  tokens to dodge GitHub rate limits. **Claude-only**; skills+plugins (both as Claude plugin shells);
  no MCP/hooks/agents as first-class types. Launch date UNVERIFIED. Alive.
- **claude.com/marketplace/plugins** (Anthropic, © 2026): **341 plugins** (2026-10-16), "Anthropic
  verified" badges on a subset, submit portal (claude.com/docs/plugins/submit), one-click install reaching
  Claude Code via claude.ai account sync; launch date UNVERIFIED. Plus git marketplaces:
  `claude-plugins-official` (auto-added on first interactive session) and `claude-plugins-community`
  (Phase-1 claude-code.md: plugin system v2.0.12 2025-10-09; `.claude-plugin/marketplace.json` with 7
  source kinds incl. npm/archive/command; `claude plugin install --json`).
- **buildwithclaude.com** (independent, davepoon): **29,500+ plugins, 7,600+ skills, 6,900+ MCP servers**
  (2026-10-16) — the only non-Anthropic Claude directory covering MCP too; installs by adding the repo
  itself as a Claude marketplace (`/plugin marketplace add davepoon/buildwithclaude`). Claude-only.
- **Awesome lists**: hesreallyhim/awesome-claude-code (~55k stars per third-party skill page, Dec 2025 —
  UNVERIFIED directly): hand-picked skills/commands/agents/hooks/MCP; VoltAgent/awesome-agent-skills
  (1,000+ cross-agent skills); agent-skills.cc, awesomeclaude.ai, awesome-skills.com (minor).

## 4. pi.dev/packages — npm AS the registry

- **Operator**: Earendil (Mario Zechner; co-maintainer Armin Ronacher). Gallery live with the packages
  system since pi 0.50.0 (2026-01-26; Phase-1 pi.md).
- **Model**: pi does not host anything. Any npm package with keyword `pi-package` (+ optional `pi` manifest
  key listing `extensions/skills/prompts/themes`) is discoverable; **gallery = npm index** (types:
  extension, skill, theme, prompt). **5,361 packages** (2026-10-16); entries published minutes earlier —
  zero-friction publishing because npm does the work.
- **Install**: `pi install npm:<pkg>[@version] | git:github.com/o/r@ref | ./local`; `pi list/remove/update`;
  user installs in `~/.pi/agent/settings.json`, project in `.pi/settings.json` (`.pi/` trust-gated).
- **Scale signal**: top packages pi-mcp-adapter 1.6M dl/mo, billion-context 1.3M/mo, pi-web-access 762K/mo
  (gallery "Most downloads", npm download numbers).
- **Harnesses**: Pi only. **Trust**: npm's (none extra — no scanning, no signing); project trust gate is
  pi-side. **Monetization**: none. **Status**: alive; the cleanest "don't build a registry" precedent.

## 5. OpenCode v2 HTTP skills catalog — the most registry-ready harness primitive

- **Operator**: Anomaly (anomalyco/opencode, ~214k stars). Shipped with OpenCode 2.0 (~Sep–Oct 2026;
  exact 2.0.0 date UNVERIFIED; Phase-1 opencode.md).
- **Mechanics** (v2 docs, verified 2026-10-16): add a URL to the config `skills` array:
  `{"skills": ["./team-skills", "https://example.com/opencode/skills/"]}`. HTTP(S) entries load as a
  catalog. **Schema**: `index.json` = `{"skills": [{"name": "git-release", "version": "3",
  "files": ["git-release.md", "references/release-policy.md"]}]}`. Files fetched from
  `<base-url>/<skill-name>/<file>`; paths must be safe/relative/same-origin; each entry needs `SKILL.md`
  or `<name>.md`. **Versioning**: bump `version` to invalidate the cache; cached per skill+version under
  `~/.local/share/opencode/skills/<name>/<version>/` (Phase-1). This is a pull-based, version-pinned,
  file-level registry protocol — any static host is a registry.
- **Adjacent OpenCode surfaces**: plugins via npm first-class (`opencode plugin add pkg@1.2.3`, git, path;
  v1→v2 plugin break); MCP via `opencode mcp add --scope project|user|system`. **No official marketplace**;
  PR-curated docs ecosystem page + aggregators: awesome-opencode/awesome-opencode (50+ plugins, 25+
  projects), opencode.cafe, **ocx** (kdcokenny/ocx, ~958 stars — extension manager with portable,
  isolated profiles, "profiles installable from registries").

## 6. MCP registries/directories — four distribution models compared

- **Official MCP Registry** (registry.modelcontextprotocol.io): **metadata-only** `server.json` (reverse-DNS
  `io.github.user/server`, points into npm/PyPI/Docker); namespace verified by GitHub OAuth/OIDC or
  DNS/HTTP challenge; publish via `mcp-publisher` CLI (not PRs). Preview since **2025-09-08**; API v0.1
  freeze 2025-10-24; run by MCP Registry Working Group (Rado Dimitrov/Stacklok; PulseMCP; TeamSpark) —
  Anthropic/GitHub/Microsoft/PulseMCP backing per Phase-1. Scale: **~9,652 latest-version servers /
  ~28,959 server-version records (2026-05, Digital Applied; current total UNVERIFIED — API doesn't expose
  a total)**. Open-source Go (7.4k stars) with Docker self-run instructions; positioned as one canonical
  service, federated via its OpenAPI (aggregators implement the same API). Free.
- **Smithery** (smithery.ai; smithery.io now a parked/for-sale domain): **hosted registry + connection
  layer** — 27,239+ MCPs (2026-10-16); `npx smithery setup`, `npx smithery mcp add notion`; auth/
  credentials/sessions handled via agent.pw ("open-source agent vault"); hosting + observability;
  monetized (pricing page; third-party freemium MCPs). History: 7,000+ servers (early-2026 reports);
  GitGuardian path-traversal disclosure (2025-10, 3,000+ servers/API keys exposed); once promised to mirror
  everything into the official Registry; **acquired by Arcade.dev, announced 2026-08-05** (Arcade had
  raised a $60M Series A 2026-06-12; Forbes: "own the agent tool supply chain"). Alive under Arcade.
- **Glama** (glama.ai/mcp/servers): **crawler-index directory** at scale — **100,836 servers** ("Updated
  2026-10-17 04:18"; up from ~22,775 in May 2026 — growth by crawling, incl. npm/PyPI); Python 42,168 /
  TS 35,907; free metadata + grades; commercial MCP Gateway/Hosting/Inspector; public API
  (`GET /v1/servers`); monetized via products + advertising. Operator: Glama (company behind glama.ai).
- **PulseMCP** (pulsemcp.com): run by Tadas Antanavicius (MCP Steering Committee; also maintains the
  official Registry) + Mike Coughlin; free; directory + MCP news (The Agentic Loop newsletter) +
  statistics pages; **new submissions paused** while ingestion/listings are reworked (2026-10-16) —
  a live example of curation strain; public API (docs/api). Launch UNVERIFIED (~early 2025).
- **mcpm.sh** (ex **mcp-get**, pathintegral-institute): open-source CLI **package manager** for MCP
  servers ("the single open source MCP registry"): `mcpm install <server>` once → configured across
  clients (Claude Desktop/Code, Cursor, …); profiles; MCP router/proxy. Installer model, not a host.
- **mcp.so**: community directory, ~21–22k servers (2026 third-party estimates), light metadata; operator
  unnamed (UNVERIFIED). Also mcpservers.org (~9,800+).
- **Model comparison**: metadata-only+verification (official) vs hosted+auth (Smithery) vs crawler index
  (Glama/mcp.so) vs installer (mcpm.sh). Trajectory: consolidation around the official Registry's API;
  vendor directories monetizing hosting/gateways; one acquired, one pausing intake.

## 7. Harness-native marketplaces (Codex & Claude)

- **Codex** (developers.openai.com, verified 2026-10-16): marketplace catalogs at
  `<repo>/.agents/plugins/marketplace.json` and `~/.agents/plugins/marketplace.json`; **also reads
  `$REPO_ROOT/.claude-plugin/marketplace.json` (legacy-compat)**. Entry: `{name, source, policy.installation
  (AVAILABLE|INSTALLED_BY_DEFAULT|NOT_AVAILABLE), policy.authentication, category}`; sources:
  `local`/`url`/`git-subdir` (`ref`/`sha`) / **`npm` first-class** (`package`, `version` incl. dist-tags/
  ranges, `registry`; **lifecycle scripts never run**). CLI: `codex plugin marketplace add owner/repo
  [--ref] [--sparse]` + `list/upgrade/remove`; enable via `[plugins."name@marketplace"] enabled = true` in
  config.toml (trusted projects only); `/plugins` TUI browser; installs cache under
  `~/.codex/plugins/cache/$MP/$PLUGIN/$VERSION/`. Public plugin directory: "universal directory shared by
  ChatGPT and Codex" via submission portal; workspace publish (org-bound; blockable via
  `features.plugin_sharing = false` in requirements.toml). **Plugins with hooks are barred from the public
  directory**; hooks need explicit per-plugin user review/trust. Bridge: **Codex `/import`** imports
  Claude/Cursor skills (advisor-verified, Phase-1 plan).
- **Claude Code** (Phase-1 claude-code.md, verified 2026-10-16): `.claude-plugin/marketplace.json` git/
  JSON-URL/dir marketplaces (7 source kinds: relative/github/url/git-subdir/npm/archive/command);
  `claude plugin install <name>@<mp> --json`, `-y/--accept-command <sha256>`; version pinning via manifest
  `version`, `#ref`, `sha`/`sha256`; per-marketplace auto-update (opt-in); no public HTTP directory API.
  Official: claude-plugins-official auto-added; claude.com/marketplace/plugins browse/submit + claude.ai
  account sync.
- Note: Codex marketplace.json is NOT part of the agent-plugins spec (advisor high-risk note — keep
  separate in the deck).

## 8. Cross-harness & adjacent efforts by Oct 2026 (searched hard 2026-10-16)

- **Agent Plugins spec** (agent-plugins.org v1.0.0, 2026-08-06; TSC: Amazon, Cursor, Microsoft, OpenAI,
  Vercel — Anthropic absent): bundles skills+MCP into one installable plugin, but **deliberately defines
  NO marketplace/registry format** — GitHub discussion #42 ("Docs: add guidance for building an
  agent-agnostic marketplace") is open guidance work. GitHub blog 2026-08-12: Agent Plugins 1.0 shipped
  in VS Code, Copilot CLI, Copilot App. The bundle standard exists; the cross-harness registry for it
  does not.
- **agskills.dev**: cross-agent skills marketplace — **16,561 skills indexed** (2026-10-16), compatible
  with Claude Code, Codex CLI, ChatGPT (SKILL.md); links out only (no install CLI, no scanning found,
  operator unnamed on-page) — a thin cross-harness index; alive. **skills.re**: open skills catalog
  (site returned 403 — details UNVERIFIED).
- **AWS Agent Registry** GA 2026-08-31 (unite.ai): catalog to register/discover/govern AI agents, tools,
  skills — enterprise agent-government play, not a coding-harness artifact installer (adjacent).
- **Harness-native directories**: Cursor Marketplace, Google "Skill Registry" (Gemini) — per third-party
  2026 guides (baeseokjae.github.io); details UNVERIFIED.
- **AutoScout24 internal skills marketplace** (tech.autoscout24.com, 2026-05-07): the enterprise
  precedent — one git repo in Claude marketplace.json format (root `.claude-plugin/marketplace.json` +
  `plugins/<name>/` with plugin.json, skills, subagents, commands, hooks, MCP/LSP configs, output styles);
  **16 plugins, 170+ engineers**; installs: `claude plugin marketplace add` for Claude Code AND
  `npx skills add` for Codex — multi-harness from day one; CODEOWNERS per plugin; CI linter as required
  check (structure, registry consistency, version bumps); semver; lessons: grassroots first, automate
  gatekeeping, support multiple agents early.
- Directory-roundup coverage claims ≥12 notable skill directories by Jun 2026 (agensi.io) — long tail of
  thin indexes, none unified.

## 9. Comparison matrix (2026-10-16; ✓ = supported)

| Registry | Operator | Skill | Plug-in | MCP | Hooks/Agents/Cmds | Harnesses | Install | Versioning | Trust/scanning | Scale | Status |
|---|---|---|---|---|---|---|---|---|---|---|---|
| vercel skills + skills.sh | Vercel | ✓ | ✗ | ✗ | ✗ | ~80 agents | `npx skills add`, symlink/copy | git-ref; lock implied | git source + 5 audit partners; no signing | 35.3k★; top skill 3.9M installs | alive, dominant |
| ClawHub | OpenClaw | ✓ | ✓ (Claw pkgs) | ✗ | partial (Claw agents) | OpenClaw | `clawhub install @scope/name` | semver-ish + latest tag | ClawScan+VirusTotal+NVIDIA (post-breach); 2,371/31,371 flagged | 31,371 skills (mid-2026) | alive, breached |
| claude-plugins.dev | community (Kamalnrf) | ✓ | ✓ | ✗ | ✗ (as types) | Claude only | `npx claude-plugins install` (git clone) | follows git | none found | 11,989 plugins + 63,065 skills | alive |
| Anthropic marketplace | Anthropic | ✓ | ✓ | ✓ | ✓ (bundled) | Claude only | one-click claude.ai sync; `claude plugin install` | version/#ref/sha | "Anthropic verified" review badge | 341 plugins | alive |
| buildwithclaude.com | davepoon (ind.) | ✓ | ✓ | ✓ | ✓ (bundled) | Claude only | `/plugin marketplace add davepoon/buildwithclaude` | git | none found | 29.5k plugins, 7.6k skills, 6.9k MCP | alive |
| pi.dev/packages | Earendil | ✓ | ext ✓ | ✗ | ext ✓ (prompts/themes) | Pi only | `pi install npm:\|git:\|local` | npm semver | npm's (none extra); trust gate pi-side | 5,361 npm pkgs; 1.6M dl/mo top | alive |
| OpenCode HTTP catalog | Anomaly | ✓ | npm plugins (separate CLI) | via config | ✗ | OpenCode | URL in `skills` config; version-pinned cache | `version` field per skill | same-origin paths; none extra | n/a (primitive) | alive (v2) |
| Codex marketplaces + directory | OpenAI | ✓ | ✓ | ✓ (mcp.json) | ✓ (gated; barred from public dir) | Codex + ChatGPT | `codex plugin marketplace add`; `/plugins` | ref/sha; npm versions | hook review gating; trust-gated project layer | count UNVERIFIED | alive |
| MCP Registry (official) | MCP WG (Stacklok et al.) | ✗ | ✗ | ✓ | ✗ | any MCP client | `mcp-publisher` CLI; metadata only | server.json versions | reverse-DNS + DNS/GitHub verification | ~9,652 servers (2026-05) | preview |
| Smithery | Arcade.dev (since 2026-08-05) | ✗ | ✗ | ✓ | ✗ | any MCP client | `npx smithery setup` / `mcp add` | hosted | hosted auth; 2025 path-traversal history | 27,239+ MCPs | alive (acquired) |
| Glama | Glama | ✗ | ✗ | ✓ | ✗ | any MCP client | directory links; API | metadata | grading; crawl-based | 100,836 servers | alive |
| PulseMCP | Antanavicius + Coughlin | ✗ | ✗ | ✓ | ✗ | any MCP client | directory links; API | metadata | curation; submissions paused | n/a | alive (paused intake) |
| mcpm.sh (ex mcp-get) | pathintegral-institute | ✗ | ✗ | ✓ | ✗ | many MCP clients | `mcpm install` (multi-client config) | follows registry | open-source CLI | n/a | alive |
| agskills.dev | unnamed | ✓ | ✗ | ✗ | ✗ | Claude/Codex/ChatGPT | links out (no CLI) | follows git | none found | 16,561 skills | alive |
| AutoScout24 (internal) | AutoScout24 | ✓ | ✓ | ✓ | ✓ | Claude Code + Codex (via skills CLI) | `claude plugin marketplace add`; `npx skills add` | semver + CI gates | CODEOWNERS + required linter | 16 plugins, 170+ engineers | alive (internal) |

## 10. Lessons — what thrived, what failed, the open gap

1. **Index beats host.** Winners (skills.sh, Glama, claude-plugins.dev, pi gallery) index artifacts where
   they already live (git/npm); the pure host model (ClawHub) concentrated risk and became the breach
   poster child. Even the official MCP Registry is metadata-only by design. Registry value = discovery +
   trust + install UX, not storage.
2. **Vendor-run distribution wins reach.** Claude's official marketplace is auto-added; Vercel's 35.3k
   stars in 9 months came from brand + `npx` zero-install UX; OpenAI/Anthropic directories gate their own
   harnesses. Community registries (claude-plugins.dev 564★ vs vercel 35.3k★) survive but don't win.
3. **npm is a free registry** — Pi (5,361 pkgs) and Codex (npm as first-class marketplace source,
   scripts-skipped) prove a harness can get publishing, semver, mirrors and telemetry for free. A unified
   registry should emit to npm, not compete with it.
4. **Scale without publish-time scanning is unpaid security debt.** ClawHub: 36% flawed (Snyk),
   ClawHavoc 1,184 pulled, 2,371/31,371 flagged, scanners evaded by 22 MB padding; Smithery's 2025
   path traversal hit 3,000+ servers. Counter-models: skills.sh's federated audits tab (5 partners,
   minutes after first install), MCP Registry's namespace verification, Codex's hook-review gate.
5. **Directory economics are brutal → consolidation.** Smithery acquired (Arcade, 2026-08-05);
   PulseMCP paused submissions; mcp.so/Glama fight on crawl counts (22k→100k in 5 months); smithery.io
   domain literally parked for sale. Aggregators now federate on the official Registry's OpenAPI.
6. **Skills-only tools left everything else unsolved.** skills.sh covers 80 agents but only SKILL.md;
   agent-plugins defines the bundle but no marketplace; MCP registries cover only MCP; OpenCode's catalog
   covers only skills (plugins are a separate npm path).
7. **Enterprises want multi-harness now** (AutoScout24: same repo serves Claude `plugin install` AND
   Codex `npx skills add`; "support multiple agents from day one to avoid retrofits").
8. **The open gap — VERIFIED, not refuted.** Searched 2026-10-16 across vendors, community, spec bodies,
   and 2026 launches: no registry covers all artifact types (skills + plugins + agents + commands + hooks
   + MCP) across all four target harnesses (Claude Code, Codex, OpenCode, Pi). Closest per axis: vercel
   skills (types: 1, harnesses: 80), Anthropic/OpenAI marketplaces (types: all-ish, harnesses: 1),
   agent-plugins (portable bundle, no registry), OpenCode catalog (best primitive, skills-only,
   harness: 1). The unified registry's whitespace is exactly: many types × many harnesses × trust.

## 11. Sources (accessed 2026-10-16 unless noted)

- vercel-labs/skills README + repo stats: https://github.com/vercel-labs/skills (also raw README)
- Vercel changelog launch post (2026-01-20): https://vercel.com/changelog/introducing-skills-the-open-agent-skills-ecosystem
- skills.sh directory + audits page + API docs: https://skills.sh , https://skills.sh/audits , https://skills.sh/docs/api
- antfu fork: https://github.com/antfu/skills-cli
- ClawHub repo + site + API: https://github.com/openclaw/clawhub , https://clawhub.ai , https://clawhub.ai/api/v1/skills?limit=1
- Snyk ToxicSkills (2026-02-05): https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub
- Unit 42 (2026-06-23): https://unit42.paloaltonetworks.com/openclaw-ai-supply-chain-risk
- Reddit independent audit (31,371 scanned / 2,371 flagged; ClawHavoc 1,184): https://www.reddit.com/r/cybersecurity/comments/1s2f1r5/i_audited_all_31000_skills_on_openclaws_clawhub
- Silverfort ranking flaw (2026-03-24): https://www.silverfort.com/blog/clawhub-vulnerability-enables-attackers-to-manipulate-rankings-to-become-the-number-one-skill
- OWASP AST01 (ClawHavoc 1,184, Jan 2026): https://owasp.org/www-project-agentic-skills-top-10/ast01
- claude-plugins.dev + repo: https://claude-plugins.dev , https://github.com/Kamalnrf/claude-plugins
- Anthropic marketplace: https://claude.com/marketplace/plugins ; Phase-1 claude-code.md (marketplace.json spec, CLI, claude-plugins-official)
- buildwithclaude.com: https://buildwithclaude.com
- pi gallery: https://pi.dev/packages ; Phase-1 pi.md (pi install mechanics, 0.50.0 2026-01-26)
- OpenCode v2 skills catalog: https://opencode.ai/v2/docs/skills/ ; Phase-1 opencode.md (cache path, plugin add)
- awesome-opencode: https://github.com/awesome-opencode/awesome-opencode ; ocx: https://github.com/kdcokenny/ocx
- MCP Registry: https://github.com/modelcontextprotocol/registry , https://registry.modelcontextprotocol.io , https://registry.modelcontextprotocol.io/v0/servers?limit=1
- MCP Registry counts (2026-05): https://www.digitalapplied.com/blog/mcp-adoption-statistics-2026-model-context-protocol
- Smithery: https://smithery.ai (27,239+ MCPs; Arcade banner); acquisition (2026-08-05): https://www.arcade.dev/blog/smithery-joins-arcade
- Glama: https://glama.ai/mcp/servers (100,836, updated 2026-10-17 04:18 site stamp)
- PulseMCP: https://www.pulsemcp.com (submissions paused note)
- mcpm.sh: https://github.com/pathintegral-institute/mcpm.sh , https://mcpm.sh/registry ; mcp.so: https://mcp.so
- Codex plugins/marketplaces: https://developers.openai.com/plugins/build/plugins ; Phase-1 codex.md
- Agent Plugins discussion #42: https://github.com/agentplugins/agent-plugins-spec/discussions/42 ; GitHub blog (2026-08-12): https://github.blog/changelog/2026-08-12-agent-plugins-1-0-in-vs-code-copilot-cli-and-the-copilot-app
- agskills.dev: https://agskills.dev (16,561 skills); skills.re (403 — UNVERIFIED)
- AWS Agent Registry GA: https://www.unite.ai/aws-agent-registry-reaches-general-availability/
- AutoScout24 (2026-05-07): https://tech.autoscout24.com/blog/posts/designing-a-coding-agent-skills-marketplace/
- Directory roundups: https://www.agensi.io/learn/complete-list-ai-agent-skill-directories-2026 ; https://baeseokjae.github.io/posts/agent-skills-marketplace-guide-2026-claude-codex-cursor-and-gemini-cli/
- GitGuardian Smithery path traversal (2025-10): via search summary (https://www.darkreading.com et al. context); primary link UNVERIFIED
