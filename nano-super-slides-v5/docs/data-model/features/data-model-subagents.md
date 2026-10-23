# Data model — Subagents

Part of the [data-model series](../data-model.md) · matrix row: **Subagents** in
[slide-4.md](../../slide-4.md). Versions studied: Claude Code v2.1.302 · Codex rust-v0.163.0 ·
OpenCode 2.0.x · Pi 1.3.0.

**Minimum verdict: COPY for Claude · TRANSLATE (mandatory) for Codex and OpenCode ·
NO SURFACE for Pi.** Unlike skills, there is no shared spec: Claude's markdown shape is the
de-facto canonical, but Codex needs TOML and OpenCode needs a different frontmatter dialect —
the conversion is required for the core feature, not for extras.

## Minimum portable core (canonical = Claude shape)

One markdown file `<name>.md`:

| Element | Required | Constraints | Survives translation? |
|---|---|---|---|
| `name` (frontmatter) | yes | ≤256 chars, no `:` | all four (Codex TOML `name`, OpenCode uses filename as id) |
| `description` (frontmatter) | yes | the delegation trigger — how the parent decides to spawn | all four |
| Body = system prompt | yes | unrestricted markdown | Claude as-is; Codex → `developer_instructions`; OpenCode as body/`prompt` |
| `tools` (frontmatter) | no | allowlist, e.g. `Read, Bash(git:*)`, `mcp__github__*` | Claude as-is; OpenCode → permission map; **Codex has no equivalent field** (drops) |
| `model` (frontmatter) | no | harness-specific naming | Claude `sonnet\|opus\|…`; Codex `model` + `model_reasoning_effort`; OpenCode `provider/model-id` |

Claude-only extras (`memory`, `isolation: worktree`, `permissionMode`, `maxTurns`, `hooks`,
`skills`, `mcpServers`, `background`, `color`, …) are overlay material at most — most have no
equivalent elsewhere and are dropped by emitters.

## Per-harness materialization

### Claude Code — COPY (the canonical)
- Drop `<n>.md` into `.claude/agents/` (project; walked up to repo root, nearest wins) or
  `~/.claude/agents/` (user). No registration; invoked automatically on description match,
  via `@agent-<name>`, or `claude --agent <name>`.

### Codex — TRANSLATE to TOML (mandatory)
- Emit `<n>.toml` to `~/.codex/agents/` (user) or `.codex/agents/` (project — **inert until
  the project is marked trusted**; prefer user scope for unvetted content).

```toml
name = "code-reviewer"
description = "Reviews diffs for security and style"
developer_instructions = """<— the markdown body becomes this REQUIRED string —>"""
model = "gpt-5.1-codex-max"          # optional
model_reasoning_effort = "high"       # optional
```

- Required: `name`, `description`, `developer_instructions`. No tool allowlist exists — an
  agent **cannot** narrow or raise its parent's sandbox/approval/MCP set (all inherited);
  the closest knobs are `features.shell_tool|apps|plugins|memories|request_permissions_tool
  = false` disables and per-skill `[[skills.config]]`. A Claude `tools` allowlist therefore
  *degrades*, not translates, on Codex — the record should note the drop.

### OpenCode — TRANSLATE to its frontmatter dialect (mandatory)
- Emit `<name>.md` to `.opencode/agents/` (project) or `~/.config/opencode/agents/` (user);
  **filename minus `.md` = agent id**.

| Canonical | OpenCode field |
|---|---|
| `name` | the filename (id); frontmatter `name` is not the id |
| `description` | `description` (required) |
| body | body, or `prompt: "{file:./path}"` pointing at a shared prompt file |
| — (must ADD) | `mode: subagent` — Claude has no mode field; without it the agent is not a subagent in OpenCode |
| `tools` allowlist | `permissions` (v2) / `permission` (v1): per-tool `allow\|ask\|deny` maps (keys `read`, `edit`, `bash`, `glob`, `grep`, `list`, `lsp`, `skill`, `task`, `webfetch`, `websearch`, `question`, `external_directory`, `doom_loop`); map listed → `allow`, unlisted → `deny` |
| `model` | `model: "<provider>/<model-id>"` (namespaced form required) |

- Optional OpenCode-only: `hidden: true`, `disable: true`, `color`, `temperature`,
  `top_p`, `steps`. Legacy v1 `tools: {bash: false}` booleans are deprecated — always emit
  permission maps.

### Pi — NO SURFACE
- No subagent capability in core. The official **subagent example extension** reads
  `~/.pi/agent/agents/*.md` with `name`/`description`/`tools` (comma list)/`model` — nearly
  the Claude shape — but it is example-level (promotion to core UNVERIFIED) and shipping it
  means shipping executable extension code (review tier).
- Record: `compatibility.harnesses.pi.supported = false` (or
  `via: ["example-extension"]`, tier `review`, if the user opts in).

## Registry notes

- The emitter, not the publisher, owns the md→TOML and md→dialect conversions (matrix
  friction #1): one canonical file, three outputs (md, TOML, dialect-md).
- Body text survives everywhere; `tools` is the lossiest field (full → permission-map →
  none). Keep tool lists coarse (tool names, not fine-grained patterns) if cross-harness
  fidelity matters.

## Original specification (reference)

Claude Code frontmatter — the canonical shape; body = system prompt (Tier: `core` = in the minimum above · `extras` = overlay with no portable equivalent):

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `name` | yes | ≤256 chars, no `:` | core |
| `description` | yes | the delegation trigger — no `whenToUse` field exists | core |
| `tools` | no | allowlist — `Read`, `Bash(git:*)`, `mcp__github__*`, `Agent(worker)` | core |
| `model` | no | `sonnet\|opus\|haiku\|fable\|<id>\|inherit` | core |
| `effort` · `disallowedTools` · `permissionMode` · `maxTurns` · `autoCompactWindow` · `skills` (≤32) · `mcpServers` · `hooks` · `memory` (`user\|project\|local`) | no | effort `low..max`; tool denylist; delegation control (autoCompactWindow v2.1.296+); preload skill bodies; per-agent servers/hooks/memory | extras |
| `background` · `omitClaudeMd` · `isolation: worktree` · `color` · `initialPrompt` · `experimental.cacheTtl` | no | runtime + isolation knobs (omitClaudeMd v2.1.271+) | extras |

Source: code.claude.com/docs/en/sub-agents (claude-code.md §5).

Codex TOML (`<n>.toml` — cannot override parent `sandbox_mode`/`approval_policy`/`model_provider`/`mcp_servers`, all inherited; built-ins `default`/`worker`/`explorer`):

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `name` | yes | one agent per file | core |
| `description` | yes | delegation trigger | core |
| `developer_instructions` | yes | the markdown body becomes this string | core |
| `model` | no | resolved: explicit spawn → `[agents]` default → parent | core |
| `model_reasoning_effort` · `model_reasoning_summary` · `model_verbosity` | no | reasoning knobs — no `tools` equivalent exists (allowlist degrades, not translates) | extras |
| `features.*` · `skills.*` | no | `features.shell_tool\|apps\|plugins\|memories\|request_permissions_tool = false` disables; `skills.config` (per-skill `[[skills.config]] path`/`enabled`), `skills.bundled.enabled`, `skills.include_instructions` | extras |

Source: learn.chatgpt.com/docs/agent-configuration/subagents (codex.md §6).

OpenCode frontmatter (filename minus `.md` = agent id — frontmatter `name` is not the id):

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `description` | yes | how the parent delegates | core |
| body / `prompt` | yes | string or `"{file:./path}"` pointing at a shared prompt file | core |
| `permissions` (v2) / `permission` (v1) | no | per-tool `allow\|ask\|deny`; keys `read, edit, bash, glob, grep, list, lsp, skill, task, webfetch, websearch, question, external_directory, doom_loop`; listed → allow, unlisted → deny (replaces deprecated v1 `tools` booleans) | core |
| `model` | no | `<provider>/<model-id>` — namespaced form required | core |
| `mode` · `temperature` · `top_p` · `steps` · `hidden` · `disable` · `color` | no | `mode: primary\|subagent\|all` — must add `subagent` or the agent is not one; sampling, iteration cap, visibility | extras |

Source: opencode.ai/v2/docs/agents (opencode.md §4).

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| Pi example extension — `name` · `description` · `tools` (comma list) · `model` | no | `~/.pi/agent/agents/*.md`, near-Claude shape — **example-level, not core (promotion UNVERIFIED); ships executable extension code** | extras |

Source: pi.md §3.8.
