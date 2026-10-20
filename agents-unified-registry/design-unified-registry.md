# design-unified-registry.md — THE Design Document: Unified Agent Registry (2026-10-16)

Agent 4 output. Register a coding-agent artifact ONCE (skill, plugin, agent/subagent, command, hook,
MCP server, theme), target Claude Code, Codex CLI, OpenCode, Pi. Inputs: claude-code.md, codex.md,
opencode.md, pi.md, cross-spec-standards.md, prior-art-registries.md, security-trust-model.md,
_00-advisor-plan.md (all "Phase files"). Citations inline; UNVERIFIED where corpus is thin.

## 1. Design principles (each evidence-derived)

| # | Principle | Evidence |
|---|---|---|
| P1 | **Index, don't host.** Records are metadata + hashes pointing at git/npm; no code storage. | MCP Registry metadata-only server.json (cross-spec-standards.md §5); winners index what exists, host model = ClawHub breach (prior-art-registries.md §10.1, §10.4) |
| P2 | **Emit to native formats; never invent a fourth path.** One record → SKILL.md drops + plugin.json (portable) + `.claude-plugin/plugin.json` + 2 marketplace.json dialects + OpenCode index.json + npm package. | Cross-spec §7–8; claude-code.md §13; codex.md §15; opencode.md §14; pi.md §6 |
| P3 | **Trust tiers day 1, not later.** Skills=default; MCP=declared egress; hooks/extensions/code=review tier. | security-trust-model.md §4.5, §5; Codex precedent: plugin hooks skipped until reviewed, barred from public directory (codex.md §5) |
| P4 | **Never-execute installer.** File copies + native CLIs only; npm sources content-only, no lifecycle scripts. | Claude marketplace npm "scripts never run" (claude-code.md §8; security-trust-model.md §2); OpenCode/Pi currently inherit full npm script surface — we must not |
| P5 | **Spec-pure core, vendor extras in overlays.** SKILL.md = 6 spec fields + namespaced `metadata`; Claude `when_to_use`/Codex `agents/openai.yaml` never pollute the portable file. | cross-spec-standards.md §1.4 ("spec-pure works everywhere"); claude.ai hard-errors non-spec fields |
| P6 | **Copy > symlink by default** (mutation channel = rug-pull vector); symlink opt-in for power users. | security-trust-model.md §4.12; contrast vercel-labs symlink model (prior-art-registries.md §1) |
| P7 | **Immutable, hashed versions + a cross-harness lockfile.** No harness ships one; it's the differentiation. | security-trust-model.md §4.3, §5.4; claude-code.md §13 (resolution chain, no lockfile) |
| P8 | **Delegate what others do better:** scanning federates (skills.sh audits 5 partners — prior-art §1), hosting delegates to npm/git, marketplace UX stays native. | MCP Registry "delegate scanning/curation" (cross-spec §5) |

## 2. Canonical record schema (`artifact-record.json`)

| Field path | Type | Req | Notes |
|---|---|---|---|
| `identity.urn` | `string` reverse-DNS | Y | `io.github.<owner>/<name>` or `com.example/<name>` (MCP Registry model, cross-spec §5) |
| `identity.namespace` / `identity.name` | `string` | Y | name must be Agent-Skills-legal `[a-z0-9-]` ≤64 (cross-spec §1.2) |
| `identity.type` | enum `skill\|mcp\|agent\|command\|hook\|theme\|plugin` | Y | plugin = multi-component bundle |
| `identity.tier` | enum `standard\|review\|quarantined` | Y | P3; review = ships hooks/extensions/MCP (security §5.5) |
| `namespaceVerification` | `{method: github-oidc\|dns-txt, account, verifiedAt}` | Y | no anonymous publish (security §4.1) |
| `version` | semver `string` | Y | SKILL.md itself has NO version field (cross-spec §1.2) — registry owns it |
| `versionSeal.{releasedAt,contentSha256,treeSha256,immutable,supersedes}` | object | Y | anti-rug-pull (security §4.3, threat T3) |
| `description.{title,summary,license,author{name,email,url},homepage,repository{url,commit},keywords[]}` | object | Y | maps to plugin.json closed set + package.json (cross-spec §2.2) |
| `payload.layout` | `agent-plugins/1.0.0` | Y | portable bundle = packaging substrate (cross-spec §8) |
| `payload.skillDir` / `entry` / `files[]` | `string[]` | Y | file list enables content-addressed copy (OpenCode index.json precedent, opencode.md §6) |
| `payload.overlays` | map harness→harness-specific | N | `claude-code` (when_to_use…), `codex` (agents/openai.yaml), `opencode` (metadata.opencode/*), `pi` (none needed) (cross-spec §1.4) |
| `sources[]` | array `{kind: git\|npm, url/ref/sha/package/version/registry/tarballSha256}` | Y | ≥1 canonical source + npm mirror; hashes required (P1, P7) |
| `compatibility.harnesses{claude-code,codex,opencode,pi}` | per-harness `{supported, since, surfaces[], via[]}` | Y | explicit matrix is the registry's product |
| `compatibility.requires` | `{runtime[], mcp[], network[], shell: bool}` | Y | drives scanning + install-time disclosure (security T5/T9) |
| `trust.scan.results[]` | `{scanner, outcome: pass\|warn\|fail\|skip, detail, scannedAt}` | Y | static-rules + llm-review + mcp-scan + dynamic (security §5.2) |
| `trust.badges[]` | `namespace-verified`, `scan-pass`, `immutable` … | Y | fail-visible, never "safe" (security §5: "scanned = safe is a lie") |
| `trust.capabilities[]` / `egress[]` / `disclosures[]` / `incidents[]` | arrays | Y/N | shell, egress domains, CVE-style history (security T5/T9, §4.6) |
| `install.<harness>` | `{method, target, manifest, command}` | Y | per-harness install target — see §4 |
| `_meta` | `{publishedAt, updatedAt, isLatest}` | Y | registry-signed envelope publisher cannot forge (MCP Registry `_meta` pattern, cross-spec §5) |

Full example — skill `pdf-report-writer`, all four harnesses:

```json
{
  "$schema": "https://schema.agentsreg.dev/v0/artifact-record.json",
  "identity": {
    "urn": "io.github.acme/pdf-report-writer",
    "namespace": "io.github.acme",
    "name": "pdf-report-writer",
    "type": "skill",
    "tier": "standard"
  },
  "namespaceVerification": { "method": "github-oidc", "account": "acme", "verifiedAt": "2026-10-01T00:00:00Z" },
  "version": "1.4.2",
  "versionSeal": {
    "releasedAt": "2026-10-12T09:00:00Z",
    "contentSha256": "9f2c41…",
    "treeSha256": "07aa19…",
    "immutable": true,
    "supersedes": "1.4.1"
  },
  "description": {
    "title": "PDF Report Writer",
    "summary": "Drafts, renders and QA-checks PDF reports from markdown sources via python reportlab.",
    "license": "Apache-2.0",
    "author": { "name": "ACME Tools", "url": "https://acme.example" },
    "homepage": "https://acme.example/skills/pdf-report-writer",
    "repository": { "url": "https://github.com/acme/pdf-report-writer", "commit": "d34db33f" },
    "keywords": ["pdf", "report", "writing"]
  },
  "payload": {
    "layout": "agent-plugins/1.0.0",
    "skillDir": "skills/pdf-report-writer",
    "entry": "SKILL.md",
    "files": ["SKILL.md", "scripts/render.py", "references/style-guide.md"],
    "overlays": {
      "claude-code": { "frontmatter": { "when_to_use": "Rendering or fixing PDF reports", "argument-hint": "[source-md] [out-pdf]" } },
      "codex": { "agents/openai.yaml": { "interface": { "display_name": "PDF Report Writer" } } },
      "opencode": { "metadata": { "opencode/slash": "true" } },
      "pi": {}
    }
  },
  "sources": [
    { "kind": "git", "url": "https://github.com/acme/pdf-report-writer", "ref": "v1.4.2", "sha": "d34db33f", "subdir": "skills/pdf-report-writer" },
    { "kind": "npm", "registry": "https://registry.npmjs.org", "package": "@acme/pdf-report-writer", "version": "1.4.2", "tarballSha256": "c0ffee…" }
  ],
  "compatibility": {
    "harnesses": {
      "claude-code": { "supported": true, "since": "2.0.20", "surfaces": ["skill"], "via": ["copy-dir", "marketplace-plugin"] },
      "codex":       { "supported": true, "surfaces": ["skill"], "via": ["copy-dir", "plugin-bundle"] },
      "opencode":    { "supported": true, "surfaces": ["skill"], "via": ["copy-dir", "http-catalog"] },
      "pi":          { "supported": true, "surfaces": ["skill"], "via": ["npm-package", "copy-dir"] }
    },
    "requires": { "runtime": ["python>=3.11", "reportlab>=4"], "mcp": [], "network": [], "shell": true }
  },
  "trust": {
    "scan": {
      "results": [
        { "scanner": "static-rules", "outcome": "pass", "detail": "no `!cmd`+network combo; no secret patterns", "scannedAt": "2026-10-12T09:05:00Z" },
        { "scanner": "llm-review", "outcome": "warn", "detail": "shell used for pdf render only; egress none declared", "scannedAt": "2026-10-12T09:06:00Z" },
        { "scanner": "mcp-scan", "outcome": "skip", "detail": "no MCP servers bundled", "scannedAt": "2026-10-12T09:05:00Z" }
      ]
    },
    "badges": ["namespace-verified", "scan-pass-with-warn", "immutable-versions"],
    "capabilities": ["shell"],
    "egress": [],
    "disclosures": [],
    "incidents": []
  },
  "install": {
    "claude-code": { "method": "copy-dir", "target": "~/.claude/skills/pdf-report-writer/" },
    "codex":       { "method": "copy-dir", "target": "~/.agents/skills/pdf-report-writer/" },
    "opencode":    { "method": "copy-dir", "target": ".opencode/skills/pdf-report-writer/",
                     "alt": "add https://cdn.agentsreg.dev/opencode/io.github.acme/index.json to config skills[]" },
    "pi":          { "method": "npm", "command": "pi install npm:@acme/pdf-report-writer@1.4.2",
                     "alt": "copy-dir ~/.agents/skills/pdf-report-writer/" }
  },
  "_meta": { "publishedAt": "2026-10-12T09:10:00Z", "updatedAt": "2026-10-12T09:10:00Z", "isLatest": true }
}
```

## 3. Field-mapping matrix (canonical → per-harness materialization)

### 3.1 Skill fields (the universal artifact — all 4 consume Agent Skills, cross-spec §6)

| Canonical | Claude Code | Codex | OpenCode | Pi |
|---|---|---|---|---|
| `identity.name` | `SKILL.md` `name`; MUST equal dir name (claude-code.md §3) | `SKILL.md` `name` (codex.md §4) | `SKILL.md` `name` = display only; **id = dir name** (opencode.md §6) | `SKILL.md` `name`; dir-match NOT required (pi.md §3.1) |
| `description.summary` | `SKILL.md` `description`; desc+when_to_use truncated 1,536 (claude-code.md §3) | `SKILL.md` `description`; ≤2% context/8,000 chars (codex.md §4) | `SKILL.md` `description` (only model-visible field) (opencode.md §6) | `SKILL.md` `description` (pi.md §3.1) |
| `description.license` / compatibility | spec fields accepted | accepted | accepted-but-ignored (opencode.md §6) | accepted |
| `payload.overlays.claude-code` | emitted into Claude copy's frontmatter (`when_to_use`, `argument-hint`, `disable-model-invocation`…); claude.ai rejects non-spec (claude-code.md §3) | ignored | `disable-model-invocation` honored cross-harness (opencode.md §6) | `disable-model-invocation` honored (pi.md §3.1) |
| `payload.overlays.codex` | ignored | `agents/openai.yaml`: interface branding, `policy.allow_implicit_invocation`, MCP deps (codex.md §4) | ignored | ignored |
| `payload.overlays.opencode` | ignored (in `metadata`) | ignored (metadata map) | `metadata.opencode/autoinvoke`, `opencode/slash` (opencode.md §6) | ignored |
| `version` | NO SKILL.md field → plugin.json `version` / marketplace entry / commit-sha chain (claude-code.md §8, §13) | plugin.json `version` (type-only) + marketplace `ref`/`sha`/npm `version` (codex.md §5) | catalog `index.json` per-skill `version`; cached per version (opencode.md §6) | npm package.json semver; `pi install npm:pkg@1.4.2` (pi.md §3.5) |
| `description.author/license/keywords/homepage/repo` | `.claude-plugin/plugin.json` (richer superset; claude-code.md §8) | root `plugin.json` CLOSED 9-field set (cross-spec §2.2) | nowhere (index.json = name/version/files only, opencode.md §6) | npm `package.json` + keyword `pi-package` + optional `pi` key (pi.md §3.5) |
| `sources[].sha*` | git `sha`, archive `sha256`, npm (scripts never run) (claude-code.md §8) | git-subdir `sha`, npm first-class (codex.md §5); scripts-run UNVERIFIED | `pkg@version` plugin pins; catalog per-version cache (opencode.md §7, §6) | `npm:pkg@ver`, `git:…@ref` (pi.md §3.5) |

### 3.2 Non-skill artifact types

| Canonical | Claude Code | Codex | OpenCode | Pi |
|---|---|---|---|---|
| MCP server entry | `mcpServers` JSON (`~/.claude.json`/`.mcp.json`/plugin `.mcp.json`); `claude mcp add` (claude-code.md §7) | `[mcp_servers.<id>]` TOML (stdio cmd/args/env; http url/auth); `codex mcp add`; `.mcp.json` plugin-only (codex.md §7) | config `mcp.servers.<name>` (v2) / `mcp.<name>` (v1); `opencode mcp add --scope` (opencode.md §8) | `mcp.json` `mcpServers` (Claude-shape; "copy as-is"); `pi mcp add` (pi.md §3.3) |
| Subagent | `.claude/agents/*.md` YAML frontmatter, body=system prompt (claude-code.md §5) | `.codex/agents/*.toml`: name/description/developer_instructions required (codex.md §6) | `.opencode/agents/*.md`: description required, `mode/model/permissions` (opencode.md §4) | example-level `.pi/agents/*.md` (subagent example ext; NOT core — pi.md §3.8) |
| Hook | settings `hooks` JSON / plugin `hooks/hooks.json`; 30 events (claude-code.md §6) | `hooks.json` Claude-shape-compatible, 12 events; plugin hooks gated (codex.md §8) | ADAPTER: generate TS plugin (`tool.execute.before` etc., opencode.md §7) | ADAPTER: generate extension (`pi.on("tool_call")…`, pi.md §3.2) |
| Command | `.claude/commands/*.md` legacy → prefer skills (claude-code.md §4) | `~/.codex/prompts/*.md` DEPRECATED, user-only (codex.md §9) | `.opencode/commands/*.md` or `commands[]` config (opencode.md §5) | `~/.pi/agent/prompts/*.md`; filename=/cmd (pi.md §3.4) |
| Theme | plugin `themes/*.json` (experimental) (claude-code.md §1) | no theme surface | `.opencode/themes/<name>.json` (opencode.md §9) | `~/.pi/agent/themes/<name>.json`; filename MUST = `name` (pi.md §3.6) |
| Plugin/bundle | `.claude-plugin/plugin.json` + marketplace.json (7 source kinds) (claude-code.md §8) | root `plugin.json` (agent-plugins 1.0.0) + `.codex-plugin/` + `.agents/plugins/marketplace.json` — catalog is Codex's, NOT the spec (codex.md §5; cross-spec §2.3) | NO bundle format — npm TS plugin `opencode plugin add pkg@ver` (v1/v2 break) (opencode.md §7) | NO bundle — npm package (`pi` key arrays) (pi.md §3.5) |
| Instructions (AGENTS.md) | fallback only when no CLAUDE.md, v2.1.277 (claude-code.md §12) | native, root→cwd walk (codex.md §3) | native, primary (opencode.md §3) | native, ancestors, un-gated (pi.md §3.7) |

Key divergences the emitters own: (1) **version lives in 4 different places** (§3.1); (2) **hooks need code-generation for 2 of 4 harnesses**; (3) **bundle format is dual** (`.claude-plugin/` vs root `plugin.json` — same filename, different schema, cross-spec §7); (4) **only Codex of our four consumes agent-plugins bundles natively** (cross-spec §2.4: 9 clients; Claude/OpenCode/Pi absent).

## 4. Install-mechanism matrix (harness × artifact type → concrete emission)

Registry CLI (`agentreg install <urn>`) default action in **bold**; alternatives after `;`.

| Artifact | Claude Code v2.1.302 | Codex rust-v0.163.0 | OpenCode 2.0.x | Pi 1.3.0 |
|---|---|---|---|---|
| Skill | **copy dir → `~/.claude/skills/<n>/`** (user) or `.claude/skills/` (project); overlay frontmatter merged into the copy | **copy dir → `~/.agents/skills/<n>/`** or repo `.agents/skills/`; optionally append `[[skills.config]] path=…` to config.toml (codex.md §15) | **copy dir → `.opencode/skills/<n>/`**; or register registry's `index.json` URL in config `skills[]` (v2 HTTP catalog = pull-native, opencode.md §14) | **`pi install npm:@ns/pkg@ver`**; or copy → `~/.agents/skills/` (un-gated — see hazards) |
| MCP server | **`claude mcp add <name> -s user -- cmd…`** (http: `--transport http`) or merge `.mcp.json` (claude-code.md §13) | **`codex mcp add <name> -- cmd…`** / `--url` (writes TOML) (codex.md §7) | **`opencode mcp add <name> --scope user\|project [--command\|--url]`**; v1 key `mcp.<n>`, v2 `mcp.servers.<n>` (opencode.md §8) | **merge entry into `~/.pi/agent/mcp.json`** or `pi mcp add <name> -- cmd` (pi.md §6) |
| Subagent | **copy `<n>.md` → `.claude/agents/`** (project) / `~/.claude/agents/` | **transform to TOML** → `.codex/agents/` (project = trusted only) or `~/.codex/agents/` (codex.md §15) | **transform frontmatter** (`mode: subagent`, permissions) → `.opencode/agents/<n>.md` | **copy md + ensure subagent example extension installed** (example-level; pi.md §3.8) |
| Hook | **merge JSON into `hooks` key of chosen settings scope** (all scopes merge; claude-code.md §13) or ship as plugin `hooks/hooks.json` | **drop/merge `hooks.json`** at `~/.codex/hooks.json` or repo `.codex/hooks.json` (trust-gated); plugin route = review-gated | **generate TS plugin** from hook spec → `.opencode/plugins/agentreg-<n>.ts` | **generate extension** `pi.on(<event>)` → `~/.pi/agent/extensions/agentreg-<n>.ts` |
| Command | **copy md → `.claude/commands/`** (legacy; prefer emitting as skill) | deprecated, user-only `~/.codex/prompts/` — emit, warn | **copy md → `.opencode/commands/`** | **copy md → `~/.pi/agent/prompts/`** |
| Theme | only inside a plugin → **bundle** (see below) | n/a (no surface) | **copy json → `.opencode/themes/<n>.json`** | **copy json → `~/.pi/agent/themes/<n>.json`** (name=file) |
| Plugin/bundle | **emit `.claude-plugin/plugin.json` + components; publish to registry's marketplace repo; `claude plugin marketplace add agentsreg/registry` + `claude plugin install <n>@agentsreg --json -y`** (claude-code.md §13) | **emit root plugin.json + skills/ + mcp.json + `.codex-plugin/` overlay; add to `.agents/plugins/marketplace.json`; `codex plugin marketplace add <src>` + `[plugins."n@mp"] enabled=true`** | **publish npm TS adapter pkg; `opencode plugin add <pkg>@<ver>`** | **publish npm pkg (keyword `pi-package`); `pi install npm:<pkg>@<ver>`** |
| Lockfile | registry writes `agentreg.lock` (urn → version → sha256 → per-harness targets); harness-native pins live alongside (Claude `version`/`#ref`/sha, Codex TOML, `pkg@ver`, `.pi/settings.json` arrays) — per claude-code.md §13; security §4.3 | same | same | same |

**Hazards the emitters must handle (each traceable):**
1. **Claude Code ignores `.agents/`** — request closed `not_planned` 2026-07-16 (issue #66352, cross-spec §4). Always dual-emit: canonical store + copy into `~/.claude/skills/`. Codex follows symlinks (codex.md §13) but we copy by default (P6).
2. **OpenCode v1/v2 split**: `mcp.<name>` vs `mcp.servers.<name>`, `plugin` vs `plugins` config key, v1 plugins incompatible with v2 (opencode.md §0, §7, §8) → emitter sniffs version; v2-first, v1 shim for MCP JSON only.
3. **Codex trust gating**: project `.codex/` layers (hooks/agents/config/rules) inert until `[projects."<path>"] trust_level="trusted"` (codex.md §2, §15); plugin hooks skipped until user reviews (security §2). Installer surfaces the diff, never auto-trusts.
4. **Pi = npm registry** → `pi install npm:` inherits npm postinstall-script surface (security §2): registry publishes content-only packages (no scripts, deps vendored), pins exact versions.
5. **agent-plugins bundles truly consumed only by Codex of our four** (cross-spec §2.4) → bundle is the packaging substrate + catalog entry for Codex; Claude gets `.claude-plugin/` dual-manifest; OpenCode/Pi get decomposed installs.
6. **Claude npm source never runs scripts** (claude-code.md §8) — safe channel for npm-hosted Claude payloads.
7. **Pi `.agents/skills` ancestors load un-gated** (verified hole, pi.md §1; security T13) — installer prefers `~/.agents/skills` (user) and documents exposure for project installs.

## 5. Architecture

| | Option A — Thin verified index + emitter CLI | Option B — Federation of native marketplaces | Option C — npm-centric (pi model generalized) |
|---|---|---|---|
| Shape | MCP-Registry-style metadata core (records, namespace verify, scan badges) + `agentreg` CLI that emits/copy-drops into all four harnesses + native catalog files | Registry only republishes INTO Claude marketplace repo, Codex marketplace.json, npm; installs via native CLIs exclusively | Everything is an npm package; registry = index over npm keywords (like pi.dev/packages) |
| Pros | Full control of trust record + lockfile (the whitespace); works even where harnesses have no registry surface (file drops); OpenCode catalog served natively; cheap (no hosting) | Zero new install UX; harnesses own update flow | npm gives semver/mirrors/provenance free (prior-art §10.3) |
| Cons | Must maintain 4 emitters (version tolerance) | No unified trust/scan/lockfile (nothing to differentiate); drift; Claude has no HTTP API; update propagation via git pulls | Claude/Codex skills aren't npm-native (path drops); inherits npm typosquat/account risk (security §2); OpenCode v1/v2 + TS-plugin mismatch; no file-drop artifacts (themes) |
| Verdict | **RECOMMENDED** (core) | adopt as *channel* inside A (native catalogs are A's output) | adopt npm as *mirror* inside A (P1, pi reach for free) |

**Data flow:** publish (`agentreg publish`, GitHub OIDC — never a PR) → **verify namespace** (OAuth `io.github.*`; DNS-TXT custom; cross-spec §5) → **fetch** sources from git/npm (no execution; content-only) → **scan** (static rules + LLM review + mcp-scan for MCP + optional dynamic detonation; security §4.2) → **seal version** (sha256, immutable, per-version re-scan + human-readable diff — T3 rug pulls) → **index** (record + badges; emit artifacts: Claude marketplace.json git repo, Codex `.agents/plugins/marketplace.json` repo, OpenCode `index.json` endpoint, npm mirror w/ `pi-package`) → **install** (`agentreg install <urn> [--harness …]` copy-drops / native CLIs per §4) → **lockfile** (`agentreg.lock`, committed; `agentreg update` re-scans before updating).

**MVP cut (v0)** — IN: artifact types **skills + MCP only** (the two universal payloads, cross-spec §8); all four harnesses; publish from GitHub repo (namespace OAuth) + automatic npm mirror; scan = static rules + 1 LLM pass + mcp-scan; tiers standard/review; badges; copy-based installs; `agentreg.lock`; the 4 emitted catalogs; disclosure inbox + takedown SLA + public incident log; read-only REST API. OUT: hooks/agents/commands/themes (need adapters — v1), signing (no consumer exists — v2), reputation/anti-gaming (v1), aggregator federation OpenAPI (v1), human "verified" tier (v1), private/enterprise registries (v2).

## 6. Trust model integration (day-1 ladder from security-trust-model.md §5)

| Day-1 rung | Record field / mechanism | Threats blocked (security §3) |
|---|---|---|
| Namespace verification (GitHub OIDC / DNS-TXT) | `identity.namespace` + `namespaceVerification` | T2 impersonation (>50% of one 157-malicious corpus) |
| Publish-time scan gate, public results | `trust.scan.results[]` — static+LLM+mcp-scan; fail = unlisted | T1/T4/T9 bulk (36.82% flawed class) |
| Immutable hashed versions + per-version diff | `versionSeal.*`; bump triggers re-scan + diff view | T3/T11 rug pulls, publisher compromise |
| Cross-harness lockfile | `agentreg.lock` (urn→version→sha256→targets) | blast-radius pinning (no harness has one) |
| Trust tiers by type | `identity.tier`; hooks/extensions/MCP = review tier, install-time diff, default-disabled | T5/T6 (PromptArmor HITL bypass; Datadog pre-injection) |
| Never-execute installer | copy-drops + content-only npm (P4) | npm postinstall class |
| Disclosure inbox + takedown SLA + incident log | `trust.disclosures[]`/`incidents[]` | proven: 157/157 removed on disclosure (arXiv 2602.06547) |
| Copy-not-symlink, version-pinned | `install.*.method: copy-dir` (symlink opt-in) | silent-mutation channel (security §4.12) |

Badges shown at install: `namespace-verified`, `scan-pass`/`scan-warn`, `immutable`, `tier: standard|review`. UI must state scanning ≠ safe (Unit 42 evasions — omnicogg 22 MB padding; security §1). Phase 2: reputation w/ anti-gaming, scan-on-install client hook, red-teaming. Phase 3: Sigstore/SLSA — publish signed tarballs early, verify only when a harness consumes (none does today; UNVERIFIED any does).

## 7. Governance & roadmap

**Stewardship options:** (a) independent vendor-neutral TSC, Agent-Plugins charter clone (individual seats, no-vendor-majority, trademarks in trust — cross-spec §2.1); (b) donate to **AAIF/Linux Foundation** (precedent: MCP + AGENTS.md both donated 2025-12-09, cross-spec §5; "the endgame they accept", cross-spec §8); (c) vendor-run (Vercel/skills.sh model — fast, 35.3k★ in 9 months, but not neutral; prior-art §10.2). **Recommendation:** launch (a) with published charter day 1; pre-commit to (b) AAIF donation as v1 exit condition.

| Phase | Dates | Scope | Exit criteria |
|---|---|---|---|
| **v0 MVP** | 2026-11 → 2027-01 | §5 MVP cut | ≥100 namespace-verified artifacts; installs verified on all 4 harnesses in CI (claude plugin install --json / codex marketplace add / opencode index.json pull / pi install); scan pipeline live w/ published methodology; 1 takedown drill |
| **v1** | 2027-02 → 2027-06 | adapter artifacts (hooks→TS plugins/extensions, subagents TOML/md, commands, themes); reputation + anti-gaming; scan-on-install hook; verified human-review tier; federation OpenAPI (aggregator pull, hourly — MCP Registry model) | ≥1,000 artifacts; ≥2 external aggregators federating; OpenAPI frozen; AAIF donation initiated |
| **v2** | 2027-07 → | Sigstore signing + SLSA provenance (gated on spec/consumer — agent-plugins FUTURE_CONSIDERATIONS lists both, cross-spec §2.3); agent-plugins 1.1 alignment (deps/secrets); enterprise private mirrors; TEE publish pipeline; federated audit sharing | ≥1 harness consumes signatures; spec 1.1 shipped; donation completed |

## 8. Risks / open questions (advisor's high-risk list, resolved or not)

| Risk | Status | Mitigation |
|---|---|---|
| Can Claude Code/OpenCode/Pi load agent-plugins bundles? | **RESOLVED: no** (compatible-clients = 9, ours: Codex only; cross-spec §2.4) | bundle = substrate + Codex catalog; dual-emit `.claude-plugin/`; decompose for OpenCode/Pi |
| Anthropic absent from Agent Plugins TSC; runs own marketplace.json | OPEN (policy risk) | dual-manifest until convergence; watch 1.1 (cross-spec §2.1) |
| Claude never reads `.agents/` | **RESOLVED**: not_planned #66352, 2026-07-16 (cross-spec §4) | dual-emit `.claude/` copies (P2, §4.1) |
| Registry without publish-time scanning = ClawHub debt (36.82% flawed / 7.6% malicious-pattern) | DESIGNED AWAY day 1 (§6) | scan gate + badges + takedown |
| OpenCode v1/v2 break; Pi 0.x→1.3 churn | OPEN (maintenance risk) | version-sniffing emitters; CI matrix vs harness releases (opencode.md §0; pi.md §5) |
| Codex marketplace.json mistaken for the agent-plugins spec | RESOLVED (it is not — cross-spec §2.3) | keep formats separate in all docs/deck |
| Codex npm-source install scripts run? | **UNVERIFIED** (codex.md §5; security §2) | treat as hostile; emit npm content-only; test in v0 CI |
| Any harness verifies signatures? | **UNVERIFIED — assume no** (security §4.10) | signing = phase 3, publish-only insurance |
| skills.sh `generate-lock` upstream | UNVERIFIED (prior-art §1) | ship our own lockfile; interop later |
| Directory economics (Smithery acquired, PulseMCP paused — prior-art §10.5) | OPEN (sustainability) | thin index keeps costs low; AAIF endgame removes payroll risk |

## 9. Deck-ready summary (fact sheet, ≤40 lines; maps to _00-advisor-plan.md §4 slides)

- **S1 Thesis**: register once → 4 harnesses; whitespace VERIFIED 2026-10-16 — nothing covers all artifact types × all four (prior-art §10.8).
- **S2 Fragmentation**: 4 harnesses × 7+ artifact types × distinct paths/manifests/CLIs (§3–4 matrices); "the spec unified us, the paths divided us" (cross-spec §4).
- **S3 Four harnesses**: Claude Code v2.1.302 (richest; plugins+marketplaces), Codex rust-v0.163.0 (TOML, trust gates), OpenCode 2.0 (HTTP catalog), Pi 1.3.0 (npm IS registry) — Phase files.
- **S4 Agent Skills**: 6 fields (2 required), 46 clients, all four ours; unversioned, Anthropic-donated 2025-12-16 (cross-spec §1).
- **S5 Agent Plugins**: v1.0.0 2026-08-06; TSC Amazon/Cursor/Microsoft/OpenAI/Vercel(+Google); 9 clients — of ours **only Codex**; Anthropic absent (cross-spec §2).
- **S6 Adjacent**: AGENTS.md → AAIF 2025-12-09 (60k+ repos); `.agents/` unratified; Claude declined (#66352 not_planned 2026-07-16).
- **S7 MCP Registry blueprint**: reverse-DNS, DNS/GitHub verify, metadata-only, OpenAPI federation, ~9,652 servers (cross-spec §5).
- **S8 Prior art**: skills.sh 35.3k★/80 agents/3.9M top installs; ClawHub 31,371 skills; claude-plugins.dev 11,989 plugins+63,065 skills; pi.dev 5,361 pkgs; Anthropic marketplace 341.
- **S9 Lessons**: index-beats-host; vendor-run wins reach; scale-without-scanning = debt (ClawHavoc 1,184 pulled); skills-only tools left the rest unsolved.
- **S10 Field-mapping**: §3.1/§3.2 tables — version lives in 4 places; hooks need codegen for 2/4; bundle dual-manifest.
- **S11 Install matrix**: §4 table — copy-drops to native paths; 7 hazards (dual-emit, v1/v2, trust gates, npm scripts, bundle decomposition).
- **S12 Trust**: **36.82%** flawed / **13.4% critical** / **76 malicious** (Snyk); **2,371/31k (7.6%)**; **157/98,380 confirmed**; **80% ASR** (Skill-Inject); day-1 ladder (§6); **157/157 takedowns** work.
- **S13 Architecture+roadmap**: Option A thin index + emitter CLI (§5); v0 skills+MCP 2027-01; v1 adapters+reputation; v2 signing; TSC → AAIF.
- **S14 Closing**: bet Skills+MCP now (all-4 reach), Plugins next (1.1/Claude watch); lockfile + trust tiers are the wedge nobody ships.

Sources: the 8 corpus files in this directory (all claims trace above; UNVERIFIED flagged where corpus is thin).
