# Data model — Exec policy

Part of the [data-model series](../data-model.md) · matrix row: **Exec policy** in
[slide-4.md](../../slide-4.md). Versions studied: Claude Code v2.1.302 · Codex rust-v0.163.0 ·
OpenCode 2.0.x · Pi 1.3.0.

**Minimum verdict: COPY for Codex (`.rules` verbatim) · TRANSLATE (derive config) for
Claude and OpenCode · NO SURFACE for Pi.** Policy is the one row where the record does not
ship a file to most harnesses — it ships **declared capabilities** that each emitter derives
into that harness's native settings. Only Codex has a droppable policy artifact.

## Minimum portable core (the declaration)

What the record must carry for *any* harness to derive its policy:

| Field | Type | Drives |
|---|---|---|
| `requires.shell` | bool | Claude allow-rules for Bash; Codex sandbox needs; OpenCode `bash` permission |
| `requires.network[]` | domains | Codex `network_access`; OpenCode `webfetch`/`external_directory` rules |
| `requires.filesystem[]` | glob patterns (read/write) | Codex `writable_roots`/`[permissions]`; OpenCode `edit`/`read` rules; Claude `permissions.allow` |
| `requires.approval` | `never \| on-request \| always`-style level | Codex `approval_policy`; OpenCode ask rules |
| `policy.rules[]` | optional Starlark rules (Codex-native) | drops verbatim on Codex; derived best-effort elsewhere |

Plus commands the artifact will run (e.g. `git push`, `npm publish`) — every harness's rule
language is pattern-over-command-line, so the record must state the command patterns it
needs, not just tool names.

## Per-harness materialization

### Codex — COPY (`.rules` verbatim) + declaration
- Starlark `.rules` files (`prefix_rule(pattern, decision allow|prompt|forbidden,
  justification, match/not_match self-tests)`) drop **verbatim** into `rules/` beside the
  config layer (`~/.codex/rules/`, `<repo>/.codex/rules/` — project layer inert until
  trusted). Validate with `codex execpolicy check --pretty --rules <file> -- <cmd>`.
- The declaration additionally derives: `sandbox_mode`
  (`read-only|workspace-write|danger-full-access`), `[sandbox_workspace_write]`
  (`writable_roots`, `network_access`), `approval_policy` (incl. granular `skill_approval`),
  `[permissions.<name>]` profiles. Richest policy surface of the four — the registry emits
  Codex first and treats it as the reference.

### Claude Code — TRANSLATE (derive settings rules; nothing to install)
- `requires.*` → `permissions.allow` / `permissions.deny` rules in `settings.json`
  (tool-pattern form, e.g. `Bash(git push:*)`). Guards the emitter must respect:
  `auto`/`bypassPermissions` modes **cannot be set from project/local settings**; admin
  `managed-settings.json` keys (`allowManagedPermissionRulesOnly`, …) are unoverridable;
  `claude plugin install --accept-command <sha256>` is the command-pinning channel.

### OpenCode — TRANSLATE (derive config statements)
- v2: `permissions[]` array of `{ "action", "resource", "effect" }` statements in
  `opencode.json` — action (`read`, `edit`, `shell`, `subagent`, `webfetch`, …), resource
  (a path, command line, URL, skill id, or agent id), effect `allow|deny|ask`; wildcards
  `*`/`?`; **last matching rule wins**, unmatched falls back to `ask`. Example:
  `{"action":"shell","resource":"git push *","effect":"deny"}`.
  v1: per-tool `permission` maps (`{"bash": {"git *": "allow"}}`), last-match-wins — the
  emitter sniffs v1/v2 (notably `bash` → `shell`).
- Defaults **ask** on reading `*.env` / `*.env.*` (allow `*.env.example`) — v1 denied;
  either way, emit explicit rules rather than relying on defaults. Hazards: **global config
  overrides project**; org policies can arrive via a remote `.well-known/opencode` endpoint.

### Pi — NO SURFACE (metadata only)
- No permission system and no sandbox ("YOLO mode"). Nothing declarative to emit — the
  record's trust/risk metadata (capabilities, egress, disclosures) is what a Pi user judges
  before installing. The only gates that exist (project-trust prompt, codemode QuickJS
  sandbox for *model-written* JS) are user-side settings, not artifact policy.

## Registry notes

- Direction of truth: declare once → derive four ways. Never store harness-specific rule
  text as the portable core (Codex `.rules` is the one artifact that may ride along
  verbatim).
- Policy interacts with every other surface's install: a skill that needs shell, a hook
  that needs network — each surface doc's minimum assumes the policy row is emitted
  alongside it, or the first gated action fails at run time.

## Original specification (reference)

Native keys per harness, in matrix order — Codex → Claude → OpenCode → Pi:

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `sandbox_mode` | no | `read-only \| workspace-write \| danger-full-access` | core |
| `[sandbox_workspace_write]` | no | `writable_roots[]`, `network_access`, `exclude_tmpdir_env_var`, `exclude_slash_tmp` | core |
| `approval_policy` | no | `on-request \| never` \| granular `{sandbox_approval, rules, mcp_elicitations, request_permissions, skill_approval}` (`on-failure` deprecated) | core |
| `[permissions.<name>]` | no | `description`, `extends`, `workspace_roots`, `filesystem.<glob>` = `read\|write\|deny`, `network.*`; built-ins `:read-only`/`:workspace`/`:danger-full-access` | core |
| `.rules` `prefix_rule()` | no | Starlark — `pattern`, `decision` `allow\|prompt\|forbidden`, `justification`, `match`/`not_match` self-tests; lives in `rules/` beside any config layer; validate via `codex execpolicy check --pretty --rules <file> -- <cmd>` | core |
| `requirements.toml` | admin | `allowed_approval_policies`, `allowed_sandbox_modes`, `allowed_permission_profiles`, `allow_managed_hooks_only`, `features.plugin_sharing = false`, `additional_developer_instructions` (10k-token cap); outranks all user config | spec |
| `[projects."<path>"] trust_level` / `[windows] sandbox` | no | `trusted\|untrusted` (project `.codex/` layers inert until trusted); Windows sandbox `mxc\|elevated\|unelevated` | extras |

**Codex** — source: agents-unified-registry/codex.md §1 (requirements.toml row), §2, §10.

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `permissions.allow` / `permissions.deny` | no | tool-pattern rules, e.g. `Bash(git push:*)`; list keys **merge** across scopes | core |
| mode + managed guards | — | `auto`/`bypassPermissions` barred from project/local settings; `disableSkillShellExecution`, `allowManagedPermissionRulesOnly` unoverridable from `managed-settings.json` | spec |
| `--accept-command <sha256>` | no | `claude plugin install` command-pinning channel | extras |

**Claude** — source: agents-unified-registry/claude-code.md §2, §8.

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `permissions[]` | no | v2 statements `{action, resource, effect}`; effect `allow\|deny\|ask` | core |
| `action` / `resource` | per stmt | actions `read`/`edit`/`shell`/`subagent`/…; resource = path, command line, URL, skill id, or agent id; wildcards `*`/`?` | core |
| match semantics | — | **last match wins**; unmatched → `ask`; base policy `*`/`*` allow, `read *.env` ask, `read *.env.*` ask, `read *.env.example` allow | spec |
| v1 `permission` maps | no | per-tool objects (`{"bash": {"git *": "allow"}}`) — deprecated path; emitter sniffs v1/v2 (`bash` → `shell`) | extras |
| `policies[]` | no | `provider.use` over provider ids; **global overrides project** | spec |
| `.well-known/opencode` | no | remote org-defaults channel can pre-seed config | extras |

**OpenCode** — source: agents-unified-registry/opencode.md §10 + https://opencode.ai/v2/docs/permissions/.

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `defaultProjectTrust` / codemode | no | `ask \| always \| never` gates `.pi/` resources only — decisions persist in `~/.pi/agent/trust.json` (`/trust`); codemode QuickJS-sandboxes **model-written** JS only | extras |

**Pi** — no permission system, no sandbox; source: agents-unified-registry/pi.md §1, §3.10.
