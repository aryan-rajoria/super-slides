# Data model — the minimum registry record behind the translation matrix

Companion series to [slide-4.md](../slide-4.md) (the translation matrix). Same facts, same
corpus (`agents-unified-registry/`, verified 2026-10-16; OpenCode v2 plugin events and Pi
extension semantics re-verified 2026-10-21), one question only: **what is the minimum the
registry must define and emit so that every feature in every cell of the matrix actually
works on each harness?** Trust tiers, scanning and governance live in the corpus
(`design-unified-registry.md`) — out of scope here.

The series has two layers: the **per-surface minimums** (this file + one doc per matrix
row), and the **organizational data model** — how an existing database of teams, projects
and functional units maps onto harness setups and feature registration — in
[data-model-org.md](data-model-org.md), with a runnable Postgres schema in
[data-model-schema.sql](data-model-schema.sql).

Versions studied: Claude Code v2.1.302 · Codex rust-v0.163.0 · OpenCode 2.0.x · Pi 1.3.0.

## The one correction to the slide verdicts

The matrix cells grade *full* parity, optional extras included — that's why Skills reads
OVERLAY for three harnesses. The data model splits each cell differently:

- **COPY** — a spec-pure portable core works as-is; harness-specific fields are *optional
  overlays* that unlock optional features. The publisher never needs them (Skills is the
  exemplar: spec `name`+`description` drops into all four).
- **TRANSLATE** — the core feature itself requires conversion (format, dialect, or
  codegen). No choice of fields avoids it (Codex subagents are TOML, period).
- **NO SURFACE** — the feature does not exist natively; the record must *say so*
  (`supported = false`) and optionally offer an adjacent fallback.

An OVERLAY cell in slide-4 can therefore be COPY at minimum (skills) or stay mandatory
(plugins/Codex overlay *is* the install). Each per-surface doc states which case it is.

## Minimum-verdict matrix

| Surface | Claude Code | Codex | OpenCode | Pi | Doc |
|---|---|---|---|---|---|
| Skills | COPY | COPY | COPY | COPY | [skills](features/data-model-skills.md) |
| Slash commands | COPY (legacy; prefer skill) | COPY, user-only + warn (deprecated) | COPY | COPY | [commands](features/data-model-commands.md) |
| Subagents | COPY (canonical) | TRANSLATE md→TOML | TRANSLATE dialect + `mode` | NO SURFACE | [subagents](features/data-model-subagents.md) |
| Hooks | COPY (merge into settings) | COPY JSON (event/handler subset, tune matcher) | TRANSLATE codegen TS plugin | TRANSLATE codegen TS extension | [hooks](features/data-model-hooks.md) |
| Plugins | TRANSLATE re-wrap `.claude-plugin/` + marketplace repo | OVERLAY portable `plugin.json` + `.codex-plugin/` + catalog entry | TRANSLATE npm TS plugin pkg | TRANSLATE npm `pi-package` | [plugins](features/data-model-plugins.md) |
| MCP servers | COPY (JSON) | TRANSLATE JSON→TOML | TRANSLATE JSON→JSON dialect (v1/v2) | COPY (verbatim) | [mcp](features/data-model-mcp.md) |
| LSP servers | TRANSLATE (wrap in plugin) | NO SURFACE | NO SURFACE | NO SURFACE | [lsp](features/data-model-lsp.md) |
| Custom tools | NO SURFACE (SDK code only) | NO SURFACE | TRANSLATE codegen TS `ctx.tool.transform` | TRANSLATE codegen TS `registerTool` | [custom-tools](features/data-model-custom-tools.md) |
| Status line | COPY (script + key) | NO SURFACE | NO SURFACE (theme JSON adjacent) | OVERLAY (theme JSON, name=file) | [statusline](features/data-model-statusline.md) |
| Exec policy | TRANSLATE (derive allow-rules) | COPY `.rules` + declare sandbox/approval | TRANSLATE (derive `permissions[]`) | NO SURFACE | [exec-policy](features/data-model-exec-policy.md) |

## The universal envelope

Every artifact record carries these registry-owned fields regardless of surface — they are
what makes the matrix expressible (including its NO SURFACE cells):

| Field | Why it's minimum |
|---|---|
| `identity.name` | one spec-legal name (`[a-z0-9-]`, ≤64) usable as dir/file id everywhere |
| `identity.type` | which matrix row; drives the emitter |
| `version` (semver) | no portable artifact carries a usable version — the registry owns it (below) |
| `compatibility.harnesses.<h>.{supported, surfaces[], via[]}` | the matrix itself, as data; `supported=false` is a first-class value |
| `payload.{files[], entry, overlays.<harness>}` | what to copy, and the *optional* harness extras — overlays are never required for core features |
| `requires.{runtime[], mcp[], network[], shell}` | feeds exec-policy derivation and install-time disclosure |
| `install.<h>.{method, target, command}` | the concrete drop per harness (path or CLI call) |

## Version and update

No standalone artifact carries a version any harness will honor — only **bundles**
self-update, and the version lands in four different places:

| Harness | Version lives in | Self-updates |
|---|---|---|
| Claude Code | plugin manifest → marketplace entry → git sha | plugins only (opt-in per marketplace) |
| Codex | `plugin.json` + marketplace `ref`/`sha` / npm version | plugins only (`codex plugin marketplace upgrade`) |
| OpenCode | skills catalog `index.json` per-skill version; plugins `pkg@ver` | skills via catalog bump; plugins via `opencode plugin update` |
| Pi | npm `package.json` semver | anything in a pi-package (`pi update`) |

Everything else — every standalone skill, command, agent, hook, MCP entry, theme — is a
manual file drop with no pin. That gap is the registry lockfile's job (`agentreg.lock`:
urn → version → sha256 → per-harness targets), not a harness feature to model.

## Canonical store, dual-emit

`.agents/skills/` is read natively by Codex, OpenCode and Pi — one drop serves three
harnesses. Claude Code declined `.agents/` (issue #66352, `not_planned`) and reads only
`.claude/skills/`, so skills install = **one store + one Claude copy**. Codex follows
symlinks, so a symlink farm is the single-source-of-truth option; the registry default is
copy (mutation channel = rug-pull vector).

## The five rules these docs follow

1. Spec-pure portable core; vendor extras only in `payload.overlays.<harness>` copies.
2. Overlay fields are optional by definition — if a cell needs them for the core feature,
   the verdict is TRANSLATE, not OVERLAY.
3. The emitter owns every conversion (md→TOML, JSON→TOML, JSON→dialect, spec→codegen TS).
4. `NO SURFACE` is emitted data: `supported = false`, install report says n/a, never silent.
5. Every standalone drop is unversioned — updates are the registry's problem, not the
   harness's.
