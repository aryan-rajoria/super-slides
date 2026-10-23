# Data model — Slash commands

Part of the [data-model series](../data-model.md) · matrix row: **Slash commands** in
[slide-4.md](../../slide-4.md). Versions studied: Claude Code v2.1.302 · Codex rust-v0.163.0 ·
OpenCode 2.0.x · Pi 1.3.0.

**Minimum verdict: COPY in all four harnesses** — the slide matrix already says COPY-AS-IS
everywhere, but the *portable* command is narrower than any single harness's dialect. Stay
inside the intersection below and one file works everywhere; step outside and you need
per-harness variants.

## Minimum portable core

One **flat** markdown file `<name>.md` (single path segment — see namespace note):

| Element | Required | Constraints |
|---|---|---|
| Filename `<name>.md` | yes | becomes `/name` (Pi: exactly; others: same convention). Flat = the only shape all four accept |
| `description` (frontmatter) | yes | Pi falls back to first non-empty body line if absent; Codex/OpenCode/Claude show it in the picker — always emit it |
| Body = prompt template | yes | use only the **common placeholder subset**: `$ARGUMENTS` and `$1`–`$9` |

Placeholder support per harness (only the first row is portable):

| Placeholder | Claude | Codex | OpenCode | Pi |
|---|---|---|---|---|
| `$ARGUMENTS`, `$1`…`$9` | ✓ | ✓ | ✓ (`$1 $2…`) | ✓ |
| `${1:-default}`, `$@`, `${@:N}`, `${@:N:L}` | partial (`$ARGUMENTS[N]`, named) | `$$` literal, named `KEY="value"` | ✗ | ✓ |
| `` !`cmd` `` pre-injection, `@file` include | ✓ | ✗ | ✓ | ✗ |

**Namespace divergence** — why the core stays flat: Claude `commands/db/migrate.md` →
`/db:migrate` (colon); OpenCode `a/b.md` → `/a/b` (slash); Codex and Pi accept **no
subdirectories at all** (Codex ignores non-flat/non-md files). A nested command is a
per-harness overlay, not a portable feature.

## Per-harness materialization

### Claude Code — COPY (legacy surface)
- `.claude/commands/<n>.md` (project) or `~/.claude/commands/` (user). Creates `/name`.
- Officially **merged into skills** — the registry's preferred emit for Claude is a *skill*
  (same body, `argument-hint` frontmatter); the command path remains a working fallback.
- Optional overlay: skills-style frontmatter extras (`argument-hint`, `when_to_use`, …).

### Codex — COPY + warn (deprecated, user-only)
- `~/.codex/prompts/<n>.md` — **user scope only** (cannot ship in a repo), flat, restart
  required to pick up, invoked as `/prompts:<name>`. Deprecated in favor of skills.
- Frontmatter `description`, `argument-hint` accepted. There is *no project-scope command
  surface* — if repo-distribution is the feature you need, Codex is effectively NO SURFACE
  and the record should say so (`via: user-copy` only).

### OpenCode — COPY
- `.opencode/commands/<n>.md` (project) or `~/.config/opencode/commands/` (user); nested
  paths namespace with `/` (not `:`); same-name file overrides built-ins; only `.md` files
  are discovered.
- Optional overlay (OpenCode-only frontmatter): `agent` (run as a specific agent),
  `subagent` (bool — always run in a child session; `subtask` is its deprecated alias),
  `model`. Alternative: a config `commands` **map** (v2) —
  `"commands": {"audit": {"template": "…", "description": "…", "agent": "…", "model": "…",
  "subagent": true}}` — `template` is config-only, never frontmatter (the body is the
  template).

### Pi — COPY
- `~/.pi/agent/prompts/<n>.md` (user) or `.pi/prompts/` (project, trust-gated). The
  **filename is the command**: `review.md` → `/review`.
- Frontmatter `description`, `argument-hint` (`<required>` / `[optional]` convention).
  Extension-registered `/commands` of the same name take priority.

## Registry notes

- Standalone command files never update in any harness — bundle them (plugin / pi-package)
  or rely on the registry lockfile. See [data-model.md](../data-model.md#version-and-update).
- Since a command body is a prompt template and a skill body is instructions, the record can
  carry one body and emit both shapes cheaply — this is the cheapest "extra harness surface"
  the registry can sell.

## Original specification (reference)

Claude Code (`.claude/commands/<n>.md` — legacy surface, "merged into skills"; same skills-style
frontmatter. Tier: `core` = portable intersection above · `extras` = harness overlay):

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `description` | no | shown in the picker — always emit | core |
| skills-style extras (`argument-hint`, `when_to_use`, …) | no | identical to the skills overlay set | extras |
| subdirectories | no | `commands/db/migrate.md` → `/db:migrate` (colon namespace) | extras |

Source: code.claude.com/docs/en/commands (claude-code.md §4).

Codex custom prompts (`~/.codex/prompts/<n>.md` — user-scope only, flat, restart required, `/prompts:<name>`, deprecated):

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `description` | no | frontmatter; picker display | core |
| `argument-hint` | no | frontmatter; slash-arg UX | extras |
| `$1`–`$9` · `$ARGUMENTS` | — | body placeholders — the portable subset | core |
| named `KEY="value"` · `$$` | — | named args; `$$` = literal `$` | extras |

Source: learn.chatgpt.com/docs/custom-prompts (codex.md §9).

OpenCode v2 (`.opencode/commands/` — only `.md` discovered; nested `a/b.md` → `/a/b`):

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `description` | no | frontmatter; picker display | core |
| `agent` · `model` · `subagent` | no | run as a specific agent; model override; `subagent: true` = always a child session (`subtask` = deprecated alias) | extras |
| `template` | no | **config-only** — never frontmatter; the body is the template | extras |
| config `commands` map | no | `{"<name>": {template, description, agent, model, subagent}}` | extras |

Source: opencode.ai/docs/commands + /v2/docs/commands (opencode.md §5).

Pi prompt templates (`~/.pi/agent/prompts/` — filename = the command):

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `description` | no | falls back to the first non-empty body line | core |
| `argument-hint` | no | `<required>` / `[optional]` convention | extras |
| `$1..$n` · `$@`/`$ARGUMENTS` | — | positional + all-args | core |
| `${1:-default}` · `${@:-default}` · `${@:N}` · `${@:N:L}` | — | defaults + arg slicing | extras |

Source: pi.dev/docs/latest (pi.md §3.4).
