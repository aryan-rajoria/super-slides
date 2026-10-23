# Data model — Skills

Part of the [data-model series](../data-model.md) · matrix row: **Skills** in [slide-4.md](../../slide-4.md).
Versions studied: Claude Code v2.1.302 · Codex rust-v0.163.0 · OpenCode 2.0.x · Pi 1.3.0.

**Minimum verdict: COPY in all four harnesses.** The slide-4 matrix cells say OVERLAY for
Claude/Codex/OpenCode, but that is *optional-feature* parity. The core feature — "agent
auto-loads the skill when relevant, user can invoke it explicitly" — works everywhere from a
**spec-pure Agent Skills directory with zero overlays**. Overlays only unlock harness-specific
extras. The registry must never write overlay fields into the portable file.

## Minimum portable core

```
<name>/
└── SKILL.md
```

| Element | Required | Constraints | Why it's in the minimum |
|---|---|---|---|
| Directory named `<name>` | yes | the skill's id in every harness that has one | spec + Claude enforce name = dir; OpenCode's id is the dir name; Pi doesn't check — keeping the rule is free and satisfies the strictest |
| `name` (frontmatter) | yes | 1–64 chars, `[a-z0-9-]`, no leading/trailing/double hyphen | required by spec; the only universally read identity field |
| `description` (frontmatter) | yes | 1–1024 chars, "what + when" | the only model-visible field in all four; drives auto-invocation |
| Markdown body | yes | keep < 500 lines (progressive disclosure) | the instructions themselves |

Not in the minimum (spec-optional, harmless everywhere): `license`, `compatibility`,
`metadata` (string→string map — the sanctioned extension channel), `allowed-tools`
(experimental, support varies).

## Per-harness materialization

### Claude Code — COPY (overlay optional)
- Drop the directory into `~/.claude/skills/<n>/` (user) or `.claude/skills/<n>/` (project;
  nested subdirs work, name-clashes get directory-qualified commands). **No registration
  command exists** — path convention is the whole install.
- Claude ignores `.agents/skills/` (closed `not_planned`, issue #66352) → the registry must
  always emit a Claude copy; it cannot share the canonical `.agents` store.
- Optional overlay (emitted **into the Claude copy's frontmatter only**): `when_to_use`,
  `argument-hint`, `arguments`, `disable-model-invocation`, `user-invocable`,
  `disallowed-tools`, `model`, `effort`, `context: fork`, `hooks`, `paths`, `shell`.
  What they unlock: richer trigger matching, slash-arg UX, isolated forked execution,
  per-skill hooks. None are needed for load/invoke. `description`+`when_to_use` truncate at
  1,536 chars combined; claude.ai upload (not local) hard-errors non-spec fields.

### Codex — COPY (overlay optional)
- Drop into `.agents/skills/` (repo scope; discovered scanning cwd→repo-root) or
  `~/.agents/skills/` (user). Discovered and enabled by default — **no config.toml entry
  needed**. `[[skills.config]] path=…` is optional (disable-without-delete) and requires a
  restart. `$skill-installer` is install-once with no update path — don't rely on it.
- Optional overlay: `agents/openai.yaml` sidecar next to SKILL.md — `interface.*` branding,
  `policy.allow_implicit_invocation` (false = explicit-only), `dependencies.tools[]` (MCP
  deps driving `skill_mcp_dependency_install`). Claude ignores the sidecar; keep it in the
  Codex copy only.

### OpenCode — COPY (overlay optional)
- Discovery (v2, later-wins): built-ins → `.claude/skills/` → `.agents/skills/` (each walked
  from the farthest ancestor toward cwd) → `~/.config/opencode/skills/` → project
  `.opencode/skills/` → explicit config `skills[]` entries. The canonical `.agents` store
  serves OpenCode for free; a project `.opencode/skills/` drop outranks it. `name` is
  display-only; id = dir name.
- Optional overlay inside the same frontmatter via spec-legal `metadata` keys:
  `opencode/autoinvoke: "false"` (hide from the model's list; still loadable by id — user
  invocation is `@skill-id`, not a slash command). Honors Claude's
  `disable-model-invocation`; `autoinvoke` wins if both set. (v1 also had
  `opencode/slash: "true"` — **gone from v2 docs**; don't emit it.)
- Better-than-copy channel: the v2 HTTP **skills catalog** — serve
  `index.json = {"skills":[{"name","version","files":[…]}]}` (paths safe, relative,
  same-origin), register the URL in config `skills[]`; cached per version, so a version
  bump *is* the update. The only self-updating skill surface of the four.

### Pi — COPY
- Drop into `~/.pi/agent/skills/` or `~/.agents/skills/` (user) or `.pi/skills/` (project,
  trust-gated). `.agents/skills/` ancestors load **un-gated** (documented trust hole) →
  prefer user scope for unvetted content. Honors `disable-model-invocation`; name need not
  match dir. No versioning unless shipped inside an npm pi-package (`pi` key `skills[]` glob).

## Canonical store + dual-emit

`.agents/skills/<n>/` is read natively by Codex, OpenCode, and Pi (and Copilot/Cursor outside
our four). Claude Code is the only one that needs a second copy in `.claude/skills/`. One
registry record → one artifact, two drops, zero format conversion.

## Version (registry-owned)

`SKILL.md` has **no version field** — the record owns it and materializes it per harness:
plugin manifest + marketplace entry + git sha (Claude bundle) · plugin.json + marketplace
`ref`/`sha` or npm version (Codex) · catalog `index.json` per-skill version (OpenCode) ·
npm `package.json` semver (Pi). No harness updates a standalone skill drop; see
[data-model.md](../data-model.md#version-and-update).

## Original specification (reference)

Agent Skills spec frontmatter — the closed 6-field set, verbatim constraints (Tier: `core` = in the
minimum above · `extras` = overlay / harness extra · `spec` = standard-defined, not needed for the minimum):

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `name` | yes | 1–64 chars; lowercase `a-z`, `0-9`, hyphen only; no leading/trailing/double hyphen; **must match parent directory name** | core |
| `description` | yes | 1–1024 chars; non-empty; what + when; keyword-rich recommended | core |
| `license` | no | license name or pointer to bundled license file; keep short | spec |
| `compatibility` | no | 1–500 chars; environment requirements (product, system packages, network) | spec |
| `metadata` | no | string→string map for client-specific extras; keys "reasonably unique" | spec |
| `allowed-tools` | no | space-separated pre-approved tools, e.g. `Bash(git:*) Read` — experimental, support varies | spec |

Source: agentskills.io/specification (cross-spec-standards.md §1.2).

Claude Code extras — Claude copy's frontmatter only; claude.ai upload hard-errors non-spec fields (local accepts); `description`+`when_to_use` truncate at 1,536 chars combined:

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `when_to_use` | no | richer trigger matching; shares the 1,536-char budget with `description` | extras |
| `argument-hint` · `arguments` | no | slash-arg UX; `arguments` = named positional | extras |
| `disable-model-invocation` | no | hide from the model — also honored by OpenCode and Pi | extras |
| `user-invocable` · `disallowed-tools` · `model` · `effort` · `context: fork` · `hooks` · `paths` · `shell` | no | user-only invocation; tool denylist; model/effort pinning; forked execution (v2.1.218+, +`agent`/`background`); per-skill hooks; `paths` globs; `shell` `bash`/`powershell` | extras |

Source: code.claude.com/docs/en/skills (claude-code.md §3).

Codex `agents/openai.yaml` sidecar — Codex copy only; Claude ignores it:

| Key | Required | Constraints / values | Tier |
|---|---|---|---|
| `interface.*` | no | `display_name`, `short_description`, `icon_small`, `icon_large`, `brand_color`, `default_prompt` | extras |
| `policy.allow_implicit_invocation` | no | default `true`; `false` = explicit-only invocation | extras |
| `dependencies.tools[]` | no | `{ type: "mcp", value, description, transport: "streamable_http", url }` — drives `skill_mcp_dependency_install` | extras |

Source: learn.chatgpt.com/docs/build-skills (codex.md §4).

| Key | Required | Constraints / values | Tier |
|---|---|---|---|
| `metadata["opencode/autoinvoke"]` | no | `"false"` — hide from `<available_skills>`, still callable by id; beats `disable-model-invocation` if both set | extras |
| `metadata["opencode/slash"]` | no | `"true"` → `/skill-id` — **v1-only; gone from v2 docs; don't emit** | extras |
| catalog `index.json` | no | `{"skills":[{name, version, files[]}]}` — paths safe/relative/same-origin; cached per version | extras |
| Pi deltas | — | honors `disable-model-invocation`; name need not match dir (no warning) | extras |

Source: opencode.md §6 · pi.md §3.1.
