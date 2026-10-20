# OpenAI Codex CLI — Extension & Registration Surfaces (verified 2026-10-16)

Terminal coding agent, github.com/openai/codex (Apache-2.0, ~130k stars). Rust binary (`rust-v0.163.0` stable 2026-10-15; alphas of 0.164.0 on 2026-10-16). Config home: `~/.codex/` (override with `CODEX_HOME` env var).

**Docs moved**: `developers.openai.com/codex` → HTTP 308 → `https://learn.chatgpt.com/docs` (user/product docs); plugin developer docs live at `https://developers.openai.com/plugins`. Every learn.chatgpt.com docs page serves raw markdown when you append `.md` (e.g. `/docs/hooks.md`); full index at `https://learn.chatgpt.com/llms.txt`.

## 1. Summary table

| Surface | Manifest + format | Filesystem locations (scope) | Install / register | Distribution |
|---|---|---|---|---|
| Instructions | `AGENTS.md` (+`AGENTS.override.md`) plain md | `~/.codex/AGENTS.md` (global); every dir from repo root → CWD (project) | File drop | git repo; agents.md ecosystem (60k+ repos) |
| Skills | `SKILL.md` w/ YAML frontmatter `name`, `description`; optional `agents/openai.yaml` | `$CWD|…|$REPO_ROOT/.agents/skills` (repo), `~/.agents/skills` (user), `/etc/codex/skills` (admin), bundled (system), inside plugins | File drop (symlinks followed); `[[skills.config]] path=…, enabled=` in config.toml; `$skill-installer <name>`; restart | git, plugins, `@skill-creator` |
| Plugins | `.codex-plugin/plugin.json` (Codex overlay) + portable root `plugin.json` (agent-plugins.org schema 1.0.0) + `mcp.json`/`.mcp.json` + `hooks/hooks.json` + `skills/` | Source from marketplace; local plugins cached under `~/.codex/plugins/` (UNVERIFIED exact cache path) | `/plugins` TUI browser; `codex plugin marketplace add <src>`; `[plugins."name@marketplace"] enabled=` in config.toml | git (GitHub shorthand, `--ref`, `--sparse`), local `path`, `url`, `git-subdir` (`ref`/`sha`), **npm** (`package`/`version`/`registry`); ChatGPT workspace/public directory |
| Marketplaces | `marketplace.json` (JSON catalog) | `<repo>/.agents/plugins/marketplace.json` (repo), `~/.agents/plugins/marketplace.json` (personal) | `codex plugin marketplace add\|list\|upgrade\|remove` | git repos / local dirs |
| Subagents | one TOML file per agent: `name`, `description`, `developer_instructions` (required) | `.codex/agents/` (project, trusted only), `~/.codex/agents/` (user) | File drop; invoke by asking / `/subagents` | git repo |
| Custom prompts (DEPRECATED) | `*.md` + frontmatter `description`, `argument-hint` | `~/.codex/prompts/` only (flat, no subdirs, non-md ignored) | File drop + restart; invoke `/prompts:name` | local only, not shared via repo |
| Hooks | `hooks.json` (JSON) or inline `[[hooks.<Event>]]` TOML | `~/.codex/hooks.json`, `<repo>/.codex/hooks.json`, `[hooks]` in either `config.toml`, plugin `hooks/hooks.json`, managed dirs in `requirements.toml` (`managed_dir`, `windows_managed_dir`) | File drop (project layer requires trust) | git, plugins |
| MCP servers | `[mcp_servers.<id>]` TOML (stdio: `command`/`args`/`env`; HTTP: `url`/auth) | `~/.codex/config.toml`, `.codex/config.toml` (trusted), plugin `.mcp.json` | `codex mcp add <name> [--env K=V]… -- <cmd>`; `codex mcp add --url … [--oauth-client-id …]`; `codex mcp list`, `codex mcp login <name>`; `/mcp` | npx/npm commands, URLs, plugins |
| Exec policy rules | Starlark `.rules` files (`prefix_rule(...)`) | `<config-layer>/rules/` e.g. `~/.codex/rules/default.rules`, `<repo>/.codex/rules/` | File drop; test with `codex execpolicy check --pretty --rules … -- <cmd>` | git/local |
| Main config | `config.toml` (TOML) | `~/.codex/config.toml` (user), `<repo>/.codex/config.toml` (project, trusted; can't override provider/auth/notify/profile/telemetry) | edit; `-c key=value` CLI overrides | local |
| Admin policy | `requirements.toml` | `/etc/codex/requirements.toml` (Unix) / Windows ProgramData path (UNVERIFIED exact Win path); MDM layer above it | admin-deployed file | MDM/enterprise |

## 2. config.toml (`~/.codex/config.toml`) — what it registers

Full reference: learn.chatgpt.com/docs/config-file/config-reference (JSON schema published alongside). Key registration-relevant tables/keys (verbatim names):

- `[skills]`: `max_context_tokens` (default 2% of context, cap 10000); `[[skills.config]]` array of `{ path, enabled }` — path points at a `SKILL.md`; disable without deleting; restart required.
- `[agents]`: `enabled` (default true), `max_concurrent_threads_per_session` (alias `max_threads`), `default_subagent_model`, `default_subagent_reasoning_effort`, `interrupt_message` (default true); custom-role shortcuts `<name>.description`, `<name>.config_file`.
- `[hooks]`: inline hooks, same schema as hooks.json (see §8).
- `[mcp_servers.<id>]`: see §7.
- `[plugins.<plugin>]`: `enabled`; plugin-bundled MCP overrides `[plugins."id".mcp_servers.<server>]` (`enabled`, `default_tools_approval_mode`, `enabled_tools`, `disabled_tools`, `tools.<tool>.approval_mode`).
- `[marketplaces.<name>]`: `source_type` (`git`|`local`), `source`, `ref`, `sparse_paths` — what `codex plugin marketplace add` writes.
- `[tools]`: `web_search` (bool or obj: `context_size`, `allowed_domains`, `location`), `view_image`.
- `[tool_suggest]`: `discoverables`, `disabled_tools` (entries `{ type = "connector"|"plugin", id }`).
- Instruction-ish scalars: `instructions`, `developer_instructions`, `compact_prompt`, `model_instructions_file`, `project_doc_fallback_filenames`, `project_doc_max_bytes` (default 32 KiB), `project_root_markers`.
- Sandbox/approval: `approval_policy` (`on-request`|`never`|granular `{sandbox_approval, rules, mcp_elicitations, request_permissions, skill_approval}`; `on-failure` deprecated), `sandbox_mode` (`read-only`|`workspace-write`|`danger-full-access`), `[sandbox_workspace_write]` (`writable_roots`, `network_access`, `exclude_tmpdir_env_var`, `exclude_slash_tmp`), `allow_login_shell`, `default_permissions`, `[permissions.<name>]` profiles (built-ins `:read-only`, `:workspace`, `:danger-full-access`; fields `description`, `extends`, `workspace_roots`, `filesystem.<glob>` = read|write|deny, `network.*`). NOTE: no `[model_profiles]`/`[profiles]` table in the current reference — legacy `--profile`/`[profiles.<name>]` appears removed in favor of `[permissions]` (UNVERIFIED removal date).
- `[model_providers.<id>]`: `name`, `base_url`, `env_key`, `wire_api` (`responses`), `query_params`, `http_headers`, `request_max_retries` (4), `stream_max_retries` (5), `stream_idle_timeout_ms` (300000), `auth.{command,args,…}`, built-in `amazon-bedrock.aws.{profile,region}`; model scalars `model`, `model_reasoning_effort`, `model_verbosity`, `review_model`, `model_context_window`, …
- `[features]` flags (many gate new surfaces): `hooks`, `apps`, `plugins`/`plugin_sharing`, `multi_agent`, `memories`, `goals`, `remote_plugin`, `skill_mcp_dependency_install`, `code_mode.enabled`, `rollout_budget.*`, `network_proxy.*`, `fast_mode`, `ultrafast_mode`.
- `[memories]`, `[browser_use]`, `[computer_use]`, `[apps]`, `[shell_environment_policy]`, `[otel]`, `[tui]`, `[projects.<path>] trust_level = "trusted"|"untrusted"` (project `.codex/` layers — rules, hooks, config, agents — load only when trusted), `[notice]`, `[auto_review]`, `[desktop.custom_file_handlers.<id>]`, `[windows] sandbox = mxc|elevated|unelevated`.
- `notify`: top-level legacy notification command key (array form supported); TUI notifications under `[tui] notifications/notification_method/notification_condition`.
- `requirements.toml` (admin, higher precedence than all user config; MDM > Agent Security > system requirements file): pins `allowed_approval_policies`, `guardian_policy_config`, `additional_developer_instructions` (10k-token cap), `features.plugin_sharing = false`, `allow_managed_hooks_only = true` (disables user/project/session/plugin hooks, keeps managed), `default_permissions`, `allowed_sandbox_modes`, `allowed_permission_profiles` (needs Codex ≥ 0.138.0), etc.

## 3. AGENTS.md

- Global: `~/.codex/AGENTS.override.md` else `AGENTS.md` (first non-empty only).
- Project: repo root → CWD walk-down; per directory at most one file: `AGENTS.override.md`, then `AGENTS.md`, then any name in `project_doc_fallback_filenames` (e.g. `["TEAM_GUIDE.md", ".agents.md"]`). `CLAUDE.md`/README are NOT defaults — a registry must add them via that config key.
- Concatenated root→cwd, blank-line joined; deeper files override (appear later in prompt). Discovery stops at `project_doc_max_bytes` (32 KiB default, e.g. `project_doc_max_bytes = 65536`).
- Open standard at agents.md; consumed by many agents (Codex, OpenCode, Gemini CLI, etc.).

## 4. Skills (Agent Skills spec adopted)

- Unit = directory with required `SKILL.md` (YAML frontmatter: `name`, `description`) + optional `scripts/`, `references/`, `assets/`, and `agents/openai.yaml`.
- `agents/openai.yaml` (OpenAI extension): `interface.display_name`, `interface.short_description`, `interface.icon_small`, `interface.icon_large`, `interface.brand_color`, `interface.default_prompt`; `policy.allow_implicit_invocation` (default true; false = explicit-only); `dependencies.tools[]` = `{ type: "mcp", value, description, transport: "streamable_http", url }` (drives `skill_mcp_dependency_install`).
- Locations: REPO `.agents/skills` scanned CWD→repo-root (incl. `$CWD/../.agents/skills`); USER `~/.agents/skills` (older path `~/.codex/skills`; migration happened ~early 2026, community reports of discovery churn); ADMIN `/etc/codex/skills`; SYSTEM bundled (includes `$skill-installer`, `$skill-creator`). Symlinked skill folders are followed. Same-named skills are not merged.
- Invocation: `/skills` picker; `$skill-name` explicit mention; implicit matching on `description`. Skill list budget: ≤2% context / 8,000 chars (`skills.max_context_tokens` up to 10000). Full SKILL.md loaded on selection.
- Install: file drop; `[[skills.config]]` enable/disable per path; `$skill-installer <name>` installs curated skills (can fetch from other repos); plugins are the recommended distribution path for your own skills.

## 5. Plugins + marketplaces (the big 2026 addition)

- A plugin bundles skills + MCP servers (+ hooks, browser extension needs). Works in ChatGPT web/desktop/mobile and Codex in desktop app/CLI. **IDE extension does not support plugins.**
- Layout (scaffolded):
  ```
  my-plugin/
  ├── .codex-plugin/plugin.json   # Codex overlay (legacy) or extensions.com.openai in root
  ├── plugin.json                 # portable, $schema agent-plugins.org/schemas/1.0.0/plugin.schema.json
  ├── .mcp.json / mcp.json        # bundled MCP servers (agent-plugins mcp.schema.json)
  ├── .app.json                   # apps mapping (ChatGPT-registered MCP)
  ├── skills/                     # auto-discovered
  ├── hooks/hooks.json
  ├── scripts/  assets/
  ```
- Portable root `plugin.json`: `name` (kebab-case), `version`, `description`, `author{name,email,url}`, `homepage`, `repository`, `license`, `keywords`. OpenAI-specific overlay `extensions.com.openai`: `apps`, `hooks` (path/array/inline; replaces default `hooks/hooks.json`; must stay under `./`), `interface` (`displayName`, `shortDescription`, `longDescription`, `developerName`, `category`, `capabilities`, `websiteURL`, `privacyPolicyURL`, `termsOfServiceURL`, `defaultPrompt`, `brandColor`, `composerIcon`, `logo`, `screenshots`), `onboardingSkill` (e.g. `"./skills/setup/SKILL.md"`).
- Bundled MCP auth under server's `extensions["com.openai"].auth`: `type` none|oauth|mixed|api_key; `headerScheme` bearer|basic|custom_header + `headerName`; oauth: `client.mode` provided|dcr|cimd, `clientId`, `tokenEndpointAuthMethod`, `authorizationUrl`, `tokenUrl`, `registrationUrl`, `baseScopes`, `defaultScopes`, … No clientSecret in package.
- Hooks in plugins: skipped until user reviews/trusts the hook definition; plugins with hooks not eligible for the public directory.
- Marketplace catalog `.agents/plugins/marketplace.json` (repo) or `~/.agents/plugins/marketplace.json` (personal): top-level `name`, `interface.displayName`; `plugins[]` = `{ name, source, policy:{installation: AVAILABLE|INSTALLED_BY_DEFAULT|NOT_AVAILABLE, authentication: ON_INSTALL|…}, category }`; `source` kinds: `local`+`path`; `url`; `git-subdir`+`url`/`path`/`ref`/`sha`; `npm`+`package`/`version`/`registry`. Paths `./`-prefixed, relative to marketplace root.
- Commands: `codex plugin marketplace add|list|upgrade|remove` (GitHub shorthand, Git URLs, `--ref`, `--sparse`); `/plugins` TUI browser (Space toggles install). Config-side equivalents: `[marketplaces.<name>]` and `[plugins."my-plugin@local-repo"] enabled = true`. v0.163.0 added "configurable default plugin activation policy".
- Enterprise: workspace publishing (ChatGPT → Personal → Publish), blockable via `features.plugin_sharing = false` in requirements.toml; public directory via submission portal.

## 6. Subagents

- Files: `.codex/agents/*.toml` (project; trusted layer), `~/.codex/agents/*.toml` (user). One agent per file.
- TOML fields: required `name`, `description`, `developer_instructions`. Optional: `model`, `model_reasoning_effort`, `model_reasoning_summary`, `model_verbosity`; feature disables `features.shell_tool|apps|plugins|memories|request_permissions_tool = false`; `skills.config` (per-skill `[[skills.config]] path/enabled` — note GitHub issue #14161 reports agent-local skills.config being ignored), `skills.bundled.enabled = false`, `skills.include_instructions = false`. Cannot override parent's `sandbox_mode`, `approval_policy`, `model_provider`, `mcp_servers` (inherited).
- Model resolution: explicit spawn value → `[agents]` default → parent's value. Custom agent shadowing a built-in name takes precedence. Built-ins: `default`, `worker`, `explorer`.
- Invoke: natural language ("spawn two agents", name them), via AGENTS.md/skill instructions, or `/subagents` to inspect/switch threads. `[features] multi_agent` gates it; multi-agent v2 landed H1 2026.

## 7. MCP servers

- stdio: `codex mcp add <name> [--env K=V…] -- <command> <args…>` (e.g. `codex mcp add context7 -- npx -y @upstash/context7-mcp`); writes `[mcp_servers.<name>] command/args/env`.
- HTTP: `codex mcp add --url https://… [--oauth-client-id … --oauth-client-secret …] [--oauth-client-registration cimd|dcr|auto]`; TOML: `url`, `auth = "oauth"|"chatgpt"`, `bearer_token_env_var`, `http_headers`, `env_http_headers`, `http_headers_helper`.
- Common TOML: `env_vars` (names or `{name, source="remote"}`), `cwd`, `enabled`, `required`, `startup_timeout_sec` (10) / `startup_timeout_ms`, `tool_timeout_sec` (60), `enabled_tools`, `disabled_tools`, `default_tools_approval_mode`, `tools.<tool>.approval_mode`, `tools.<tool>.output_token_limit`, `scopes`, `experimental_environment = local|remote`; top-level `mcp_optional_startup_grace_ms` (1000).
- Other commands: `codex mcp list`, `codex mcp login <name>`, `/mcp` in TUI/desktop. `.mcp.json` exists only inside plugins (not user-level like Claude Code/VS Code).
- SDK note: `codex mcp-server` / `codex-mcp-server` binary was REMOVED — use the Codex app server for integrations.

## 8. Hooks / lifecycle

- Files: `~/.codex/hooks.json`, `<repo>/.codex/hooks.json`, inline `[hooks]` in either config.toml, plugin `hooks/hooks.json`, managed hooks via requirements.toml (`managed_dir` e.g. `/enterprise/hooks`, `windows_managed_dir`). Project layer requires trust.
- Events: `PreToolUse`, `PostToolUse`, `PermissionRequest`, `PreCompact`, `PostCompact`, `UserPromptSubmit`, `Stop`, `Interrupt` (main thread), `SessionStart`, `SessionEnd` (main thread), `SubagentStart`, `SubagentStop`.
- Schema (Claude Code-compatible shape): top-level optional `description`, `hooks.<Event> = [ { matcher: <regex>, hooks: [ … ] } ]`. Handler `type: "command"`: `command` (+`commandWindows`/`command_windows`), `timeout` (s, default 600; SessionEnd/Interrupt default 1 max 3), `statusMessage`, `additionalContextLimit` (default 2500 tokens, 0=unlimited), `async` (max 8 concurrent background hooks). Handler `type: "mcp_tool"`: `server`, `tool`, `input` (JSON templates, `${field.nested}` expansion from stdin payload), `timeout`, `statusMessage`. `matcher` regex; `"*"`/`""`/omitted = all; ignored for UserPromptSubmit/Stop/Interrupt.
- Semantics: hooks from all layers RUN (merged, not replaced); multiple matching command hooks run concurrently; if a layer has both hooks.json and inline `[hooks]` they merge with a warning. stdin JSON: `session_id`, `transcript_path`, `cwd`, `hook_event_name`, `model`, `turn_id`, `permission_mode`. Plugin hook commands get `PLUGIN_ROOT`, `PLUGIN_DATA`, plus `CLAUDE_PLUGIN_ROOT`, `CLAUDE_PLUGIN_DATA` (explicit Claude-plugin compat). Kill switch: `[features] hooks = false`; `allow_managed_hooks_only = true`.

## 9. Custom prompts (legacy, deprecated)

- `~/.codex/prompts/*.md`, flat; YAML frontmatter `description`, `argument-hint`. Invoke `/prompts:<name>`. Args: `$1`–`$9`, `$ARGUMENTS`, named `KEY="value"`, `$$` literal. Requires restart; user-scope only (never repo-shared). Docs now steer to skills.

## 10. Sandbox / policy

- `sandbox_mode` read-only | workspace-write | danger-full-access; `[sandbox_workspace_write] writable_roots/network_access`; `approval_policy` incl. granular; `default_permissions` + `[permissions.<name>]` profiles (`extends`, `workspace_roots.<path>`, `filesystem.<glob>` read|write|deny, `network.{enabled, domains.<pattern>, proxy_url, …}`). Windows sandbox: `[windows] sandbox = mxc|elevated|unelevated`.
- Starlark exec-policy rules (`prefix_rule(pattern, decision allow|prompt|forbidden, justification, match/not_match self-tests)`) in `rules/` beside any config layer; `codex execpolicy check --pretty --rules <file> -- <cmd>`.

## 11. Non-interactive & SDK (registry automation surface)

- `codex exec "<prompt>"` | `codex exec -` (stdin) | prompt+stdin combo. Flags: `--json` (JSONL: `thread.started`, `turn.started`, `turn.completed`, `turn.failed`, `item.*`, `error`), `-o/--output-last-message <path>`, `--output-schema ./schema.json`, `--sandbox …`, `--ephemeral`, `--ignore-user-config`, `--ignore-rules`, `--skip-git-repo-check`; `codex exec resume --last|<SESSION_ID>`; `CODEX_API_KEY=… codex exec …`; GitHub Action `openai/codex-action@v1`. (`--full-auto` removed.)
- SDKs: npm `@openai/codex-sdk` (Node 18+) and pip `openai-codex` (3.10+): `codex.startThread()` / `thread.run()` / `codex.resumeThread(id)`; Python `codex.thread_start(model=…, sandbox=Sandbox.workspace_write)`; `config` + `configOverrides` (raw TOML strings, take precedence, don't modify config files). App server handles auth/approvals for integrations.

## 12. Other surfaces

- IDE extension: VS Code/Cursor/Windsurf extension id `openai.chatgpt` ("Codex: Open Codex Sidebar"); Xcode and JetBrains have separate integrations. Shares `~/.codex` config with CLI/desktop, but no plugin support in IDE.
- Desktop app: `codex app`; shares config, plugin cache, hooks, MCP. Custom file handlers `[desktop.custom_file_handlers.<id>]`.
- Cloud: `codex cloud`; ChatGPT web reaches remote MCP only via plugins and ignores local config.

## 13. Cross-compatibility (for the unified registry)

- **Skills: strong compat.** Codex consumes the same Agent Skills `SKILL.md` spec as Claude Code; only drop locations differ (`~/.agents/skills` + `.agents/skills` vs Claude's `~/.claude/skills` + `.claude/skills`). Codex follows symlinks — a registry can materialize one artifact and symlink into both trees. `agents/openai.yaml` is additive metadata Claude ignores.
- **Hooks: format-compatible.** Codex `hooks.json` mirrors Claude Code's matcher/hooks JSON and event names (PreToolUse/PostToolUse/SessionStart/…), and injects `CLAUDE_PLUGIN_ROOT`/`CLAUDE_PLUGIN_DATA` env vars for Claude plugin scripts. Command strings still need per-agent tool-name tuning (matcher matches Codex tool names like `Bash`).
- **Plugins: vendor-neutral spec.** agent-plugins.org 1.0.0 (TSC incl. OpenAI, Microsoft, Amazon, Cursor, Vercel) defines portable root `plugin.json` + `skills/` + `mcp.json` + reverse-domain client extension folders. Codex reads portable layout + `.codex-plugin/` overlay. Whether Claude Code consumes agent-plugins packages: UNVERIFIED. Claude Code plugin bundles remain their own format; a registry should ship portable layout + per-client overlays.
- **AGENTS.md: universal.** Codex does not read `CLAUDE.md` by default; add it (or any name) via `project_doc_fallback_filenames` — a cheap normalization lever.
- **MCP: protocol-compatible**, config syntax differs (TOML vs JSON). `.mcp.json` is plugin-only in Codex.

## 14. Timeline 2025 → Oct 2026

- 2025-04-16: Codex CLI launched (TypeScript/React Ink, open source).
- 2025-06: Rust rewrite announced (security, fewer deps); `codex-rs` becomes the codebase.
- 2025-09: GPT-5-Codex model era; cloud Codex matures.
- 2025-11: GPT-5.1-Codex-Max (config still carries `hide_gpt-5.1-codex-max_migration_prompt` notice keys).
- 2025-12: Skills ship in Codex CLI + cloud (Agent Skills spec adopted; early skills path `~/.codex/skills`, later `~/.agents/skills`).
- 2026 Q1: experimental hooks (~v0.114 per community reports, UNVERIFIED), subagents TOML format live (GitHub issue #14161 filed 2026-03), plugin support appears in changelogs (~v0.110–0.113 per community, UNVERIFIED).
- 2026 H1: multi-agent v2, Goals + rollout budgets, Memories, plugins public/workspace directory, `codex plugin marketplace` commands, Agent Plugins spec 1.0.0 at agent-plugins.org (date UNVERIFIED).
- 2026-05: plugin .zip/URL loading per third-party writeups (UNVERIFIED).
- 2026-07: JetBrains agentic enhancements / Codex as agent provider (github.blog changelog).
- 2026-08→10: docs migrate to learn.chatgpt.com (developers.openai.com/codex 308-redirects); 2026-10-15 `rust-v0.163.0` stable (default plugin activation policy, subagent capability fixes); 2026-10-16 `rust-v0.164.0-alpha.2` pre-release.

## 15. Injection points a unified registry can call

1. Skills: write/symlink dir into `~/.agents/skills/` (user) or `<repo>/.agents/skills/` (project); optionally append `[[skills.config]]` to `~/.codex/config.toml`; restart session.
2. MCP: `codex mcp add <id> -- …` (writes `[mcp_servers.<id>]`), or edit TOML directly; validate with `codex mcp list`.
3. Plugins/marketplaces: `codex plugin marketplace add <git|local> [--ref --sparse]`, then `[plugins."name@marketplace"] enabled = true` or `/plugins` TUI; npm source supported in marketplace.json.
4. Hooks: drop `hooks.json` at `~/.codex/hooks.json` or `.codex/hooks.json` (trust required); merge semantics are additive across layers.
5. Subagents: drop TOML into `.codex/agents/` or `~/.codex/agents/`.
6. Headless validation: `codex exec --json` with `configOverrides` via `@openai/codex-sdk`; CI via `openai/codex-action@v1`.
7. Trust gate: pre-mark project trusted via `[projects."<path>"] trust_level = "trusted"` or user approval on first run — project-layer artifacts (hooks/rules/config/agents) are inert until trusted.

## Sources (all accessed 2026-10-16)

- https://github.com/openai/codex (README, docs/ tree, CHANGELOG.md, /releases: rust-v0.163.0 2026-10-15)
- https://learn.chatgpt.com/docs (redirect target of developers.openai.com/codex); llms.txt index
- https://learn.chatgpt.com/docs/config-file/config-reference — config.toml + requirements.toml reference
- https://learn.chatgpt.com/docs/agent-configuration/agents-md — AGENTS.md discovery/precedence
- https://learn.chatgpt.com/docs/agent-configuration/subagents — subagent TOML
- https://learn.chatgpt.com/docs/agent-configuration/rules — Starlark exec policy
- https://learn.chatgpt.com/docs/build-skills — SKILL.md, skills locations, agents/openai.yaml, $skill-installer
- https://learn.chatgpt.com/docs/custom-prompts — prompts (deprecated)
- https://learn.chatgpt.com/docs/hooks — hooks.json schema/events/precedence
- https://learn.chatgpt.com/docs/extend/mcp — codex mcp add, [mcp_servers]
- https://learn.chatgpt.com/docs/plugins, /docs/build-plugins, /docs/skills-and-plugins — plugin usage
- https://learn.chatgpt.com/docs/non-interactive-mode — codex exec
- https://learn.chatgpt.com/docs/codex-sdk — @openai/codex-sdk / openai-codex
- https://learn.chatgpt.com/docs/codex/cli, /docs/codex/ide — CLI overview, IDE extension (openai.chatgpt)
- https://developers.openai.com/plugins/build/plugins — plugin packaging, marketplace.json, codex plugin marketplace commands
- https://agent-plugins.org — Agent Plugins spec 1.0.0
- https://agents.md — AGENTS.md standard
- https://www.infoq.com/news/2025/06/codex-cli-rust-native-rewrite — Rust rewrite (2025-06-04)
- https://community.openai.com/t/1379522, https://github.com/openai/codex/issues/14161, https://github.com/openai/codex/issues/16500 — skills path migration, subagent skills.config bug, personal plugin dirs
- https://blog.fsck.com/2025/12/19/codex-skills — skills workflow (2025-12-19)
- https://github.blog/changelog/2026-07-07-codex-as-agent-provider-and-agentic-enhancements-in-jetbrains-ides
