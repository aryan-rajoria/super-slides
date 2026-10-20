# OpenCode — Extensibility Surfaces Research (as of 2026-10-16)

Input for the unified-registry project (Claude Code / Codex / OpenCode / Pi). All facts verified against live official docs (opencode.ai, github.com/anomalyco/opencode) on 2026-10-16/17 unless marked UNVERIFIED.

## 0. Canonical identity + fork/rename history (verified)

- **Canonical NOW:** `github.com/anomalyco/opencode` (MIT, ~214k stars, ~28.8k forks), site **opencode.ai**, company **Anomaly** ("Anomaly Software"; formerly public brand SST / Serverless Stack, founders Dax Raad et al.). npm `@opencode/cli`; brew tap `anomalyco/tap/opencode`.
- **Predecessor:** Charmbracelet wrote the original Go "opencode" (early 2025). SST forked it (repo created 2025-04-30), rewrote it in TypeScript/Bun, kept the name; public launch ~May–Jun 2025. After a public dispute Charm renamed its Go continuation **Crush** (`charmbracelet/crush`, 2025-07-29/30) and ceded the "OpenCode" name to SST's version.
- **The early-2026 event:** in **Jan 2026** SST publicly rebranded to Anomaly and moved the repo `sst/opencode` → `anomalyco/opencode` (old links redirect). Not a technical fork — same team, same codebase, new org/brand. Desktop app ships as `Anomaly.OpenCode.Desktop`.
- **Current split-brain (Oct 2026):** **OpenCode 2.0** is released (2.x is current; changelog shows v2.0.26 on 2026-10-08 … v2.0.32 on 2026-10-16; exact 2.0.0 date UNVERIFIED, news coverage of the rewrite from 2026-07-20). v1 docs live at `opencode.ai/docs/`, v2 at `opencode.ai/v2/docs/`. Both use the `opencode` command; upgrade via `opencode upgrade --major`. 2.0: runtime Bun→Node, desktop →Electron, new HTTP API + single background Service, `@opencode/sdk` (run as library), `@opencode/client`, **Code Mode** (`@opencode/codemode` converts MCP/OpenAPI to callable JS functions), background subagents, TUI plugins stable (OpenTUI), hot reload. **1.0 plugins do NOT work in 2.0.** Version pinning: docker `ghcr.io/anomalyco/opencode:2.0.0`, brew cask `opencode-v2`, AUR `opencode-beta`.

Below, each surface documents **v1** then **v2** where they differ.

## 1. Summary table (v2 current; v1 in parentheses where different)

| Surface | Manifest / format | Project path | Global path | Install / register command | Distribution |
|---|---|---|---|---|---|
| Config | `opencode.json` / `.jsonc`, `$schema: https://opencode.ai/config.json` | `./opencode.json(c)`, `./.opencode/opencode.json(c)` | `~/.config/opencode/opencode.json(c)`; managed `/etc/opencode/`, `%ProgramData%\opencode`, macOS MDM `ai.opencode.managed` | none (file drop; `OPENCODE_CONFIG` / `OPENCODE_CONFIG_CONTENT` env) | git; remote `.well-known/opencode` org defaults |
| Rules / memory | `AGENTS.md` plain md | `./AGENTS.md` (+ nested, walk-up) | `~/.config/opencode/AGENTS.md`; fallback `~/.claude/CLAUDE.md` | `/init` (creates/improves in place) | git |
| Agents | `.md` + YAML frontmatter | `.opencode/agents/<name>.md` | `~/.config/opencode/agents/` | v1: `opencode agent create`; v2: `opencode agent add` | git / file drop |
| Commands | `.md` + frontmatter (or `commands` config array v2) | `.opencode/commands/<name>.md` | `~/.config/opencode/commands/` | none (file drop or config) | git / file drop |
| Skills | `SKILL.md` + YAML frontmatter (Anthropic Agent-Skills compatible) | `.opencode/skills/`, `.claude/skills/`, `.agents/skills/` (walk-up to worktree root) | `~/.config/opencode/skills/`, `~/.claude/skills/`, `~/.agents/skills/` | none; config `"skills": [paths…]`; v2 also **HTTP catalog** `https://host/index.json` | git / file drop / **HTTP catalog (registry-ready)** |
| Plugins | TS/JS module, `Plugin` type (`@opencode-ai/plugin`) | `.opencode/plugins/*.ts` + `.opencode/package.json` (bun/npm install) | `~/.config/opencode/plugins/` | v1: `opencode plugin <module> --global`; v2: `opencode plugin add <pkg[@tag] \| git+URL \| path>` | npm (incl. `pkg@version` pinning), git URLs, local paths |
| MCP servers | JSON in config `mcp` key (v1: `mcp.<name>`; v2: `mcp.servers.<name>`) | `opencode.json(c)` project | `opencode.json(c)` global / managed | `opencode mcp add <name> --scope project\|user\|system` (`--command/--env`, `--url/--header`) | npx/stdio, HTTP URL, OAuth |
| Themes | `theme.json` (`$schema: https://opencode.ai/theme.json`) | `.opencode/themes/<name>.json` | `~/.config/opencode/themes/<name>.json` | none (file drop; `/themes` to select) | file drop; Theme Tool at opencode.ai/theme/ |
| Permissions | config `permissions` (v2 array of statements; v1 `permission` object) + per-agent frontmatter | config | config | none | config |
| Policies | config `policies` array (v2.0.29+; v1 `experimental.policies`) | config | config (global overrides project) | none | config |
| Providers/models | config `providers` (v1 `provider`) + models.dev registry | config | config | `/connect` flow; `opencode auth login/logout/list` | models.dev registry; any `@ai-sdk/*` npm package |
| References (v2) | config `references` map: `path` or `repository`+`branch` | config | config | none; git clones to `~/.local/share/opencode/repos/<host>/<path>[@branch]` | git repos / local dirs |
| Credentials | `~/.local/share/opencode/auth.json` (API keys, OAuth); MCP OAuth tokens `~/.local/share/opencode/mcp-auth.json` | — | — | `opencode auth login --provider X`; `opencode mcp auth <name>` | — |

## 2. Config (opencode.json / opencode.jsonc)

- Files: `opencode.json` or `opencode.jsonc` (JSONC = comments + trailing commas). v1 also had `tui.json` for TUI settings — **2.0 merged tui.json into opencode.json** (TUI/CLI settings now in `~/.config/opencode/cli.json` with `$schema https://opencode.ai/v2/cli.json`).
- Schema: `"$schema": "https://opencode.ai/config.json"` — docs call it "the source of truth for available fields". A **dual V1/V2 config schema** landed in v2.0.30 (2026-10-15).
- Locations, precedence low→high (configs **merge**, conflicting keys overridden by later layers):
  1. Remote org defaults from a `.well-known/opencode` endpoint
  2. Global `~/.config/opencode/opencode.json` (override dir via `OPENCODE_CONFIG_DIR`)
  3. `OPENCODE_CONFIG` env-var file; `OPENCODE_CONFIG_CONTENT` inline env
  4. Project `opencode.json(c)` — found by walking up from cwd to git root; v2 also `.opencode/opencode.json(c)`
  5. Managed/system: `/Library/Application Support/opencode/` (macOS), `/etc/opencode/` (Linux), `%ProgramData%\opencode` (Windows), and macOS MDM plists under `ai.opencode.managed` (highest precedence)
- Variable substitution inside any string: `{env:VAR}` (empty string if unset), `{file:path}` (relative to config dir; `~`/absolute ok).
- v2 top-level keys observed: `model`, `default_agent`, `agents`, `instructions`, `skills`, `commands`, `references`, `plugins`, `providers`, `mcp`, `permissions`, `policies`, `formatter`, `lsp`, `shell`, `watcher`, `snapshots`, `compaction`, `warming`, `media`, `websearch`, `tool_output`, `worktree.directory`, `update`, `username`, `server` (v1: `provider`, `agent`, `permission`, `plugin`, `command`, `tools`, `small_model`, `autoupdate`, `disabled_providers`/`enabled_providers` → superseded by policies, `experimental.policies`).

## 3. Rules / memory (AGENTS.md)

- OpenCode is the reference consumer of the **AGENTS.md** convention. Project `AGENTS.md` (root + nested subdirs, discovered by walking up from cwd), global `~/.config/opencode/AGENTS.md`.
- `/init` command creates AGENTS.md and improves it in place if it exists.
- Fallbacks (Claude Code compat): project `CLAUDE.md` used only if no AGENTS.md; global `~/.claude/CLAUDE.md` only if no global AGENTS.md. Kill switches: `OPENCODE_DISABLE_CLAUDE_CODE=1`, `OPENCODE_DISABLE_CLAUDE_CODE_PROMPT=1`, `OPENCODE_DISABLE_CLAUDE_CODE_SKILLS=1` (honored in v2 as of v2.0.30).
- `"instructions": ["CONTRIBUTING.md", ".cursor/rules/*.md", "packages/*/AGENTS.md"]` — array of paths/**globs**/**remote URLs** (5s fetch timeout), merged with AGENTS.md files.
- No `.cursor`/Codex-style frontmatter rule files; no `.opencode/rule/` directory.

## 4. Custom agents

- Markdown file + YAML frontmatter; **filename minus `.md` = agent id**. Dirs: `.opencode/agents/` (project), `~/.config/opencode/agents/` (global). v1 also accepted singular `agent/` (back-compat).
- Frontmatter fields (exact):
  - `description` (required; used by the parent agent to delegate)
  - `mode`: `primary` | `subagent` | `all`
  - `model`: `provider/model-id` (e.g. `anthropic/claude-sonnet-4-5`); `temperature` (0–1); `top_p`; `steps` (max agentic iterations; legacy `maxSteps` deprecated); extra keys (e.g. `reasoningEffort`, `textVerbosity`) pass through as provider options
  - `prompt`: string or `"{file:./path}"` (relative to the file)
  - `permission` (v1 name) / `permissions` (v2 frontmatter): per-tool `allow|ask|deny`, glob patterns, last match wins — keys: `read`, `edit`, `bash`, `glob`, `grep`, `list`, `lsp`, `skill`, `task`, `webfetch`, `websearch`, `question`, `external_directory`, `doom_loop`
  - `hidden: true` (hide subagent from `@` menu), `disable: true`, `color` (hex or theme color)
  - v1 legacy `tools: {bash: false, …}` booleans — deprecated since v1.1.1 in favor of permission maps
- Built-in agents: primaries `build` (default, all tools) and `plan` (read-only; edit/bash → ask); subagents `general`, `explore` (read-only), `scout` (read-only research); hidden system agents `compaction`, `title`, `summary`. Switch primary with Tab. `subagent_depth` config limits nesting; v2 adds background subagents (different model allowed).
- Per-built-in-agent config override: `agents.build.permissions…` (v2) / `agent.<name>.…` (v1). Override built-ins by creating an agent md with the same id.
- CLI: v1 `opencode agent create` (flags `--path --description --mode --permissions --model`), `opencode agent list`; v2 `opencode agent add`, `opencode agent list`, `opencode agent remove`.

## 5. Commands (slash commands)

- Markdown file, filename = `/name`. Dirs: `.opencode/commands/`, `~/.config/opencode/commands/` (v1 accepted singular `command/`). v2: nested dirs namespace (`frontend/component.md` → `/frontend/component`); same name overrides built-ins (`/init`, `/undo`, `/redo`, `/help`).
- Frontmatter: `description`, `agent` (defaults to current agent; if subagent → runs as subagent unless `subtask: false`), `subtask` (bool, force subagent isolation), `model`.
- Body = prompt template. Placeholders: `$ARGUMENTS`, positional `$1 $2…`, shell injection `` !`cmd` `` (runs in project root), file inclusion `@path/to/file`.
- Config alternative: v1 `"command": { name: { template, description, agent, subtask, model } }` (`template` required); v2 `"commands": [ { name, template, args… } ]` array.
- Distribution: git/file drop only; no registry.

## 6. Skills (Agent Skills — Anthropic SKILL.md compatible)

OpenCode **natively implements the Agent Skills open standard** (the Claude Code `SKILL.md` format). First-party support landed in the v1.0.x line (~v1.0.186, c. Dec 2025 — exact date UNVERIFIED; the old third-party shim `joshuadavidthomas/opencode-agent-skills` is deprecated).

- Discovery dirs, in order (later wins; walk-up from cwd to worktree root): `.opencode/skills/` → `.agents/skills/` → `.claude/skills/` per level; then globals `~/.config/opencode/skills/` → `~/.agents/skills/` → `~/.claude/skills/`. Same id: later directory wins (closest-to-cwd `.opencode` beats `.claude`).
- Layout: `<dir>/<skill-id>/SKILL.md` (+ supporting files; up to 10 extra paths listed to the model when invoked, never auto-loaded). v2 also accepts **root-level `*.md`** skills.
- Frontmatter: `name` (display only; id is the **directory name**), `description` (required, 1–1024 chars — the only model-visible field), `license` / `compatibility` (accepted, ignored), `metadata` map:
  - `opencode/autoinvoke: "false"` — hide from `<available_skills>`; still callable by exact id
  - `opencode/slash: "true"` — expose as `/skill-id` TUI command
  - Claude Code's `disable-model-invocation: true` also honored; `opencode/autoinvoke` wins if both set
- Invocation: model calls the `skill` tool (`skill({name:"id"})`); user can `@skill-id`. Skill loading is gated by `skill` permission (allow/ask/deny, glob per name). Disable entirely via `tools: {skill: false}` (v1) / agent config.
- Registration beyond file drop: `"skills": ["./team-skills", "https://internal.example/skills/index.json"]` in opencode.json — v2 pulls HTTP catalogs: `index.json` = `{ "skills": [ { "name", "version", "files": ["SKILL.md", "ref.md", "scripts/check.sh"] } ] }`, files fetched from `<catalog-base>/<name>/<file>`, cached in `~/.local/share/opencode/skills/<name>/<version>/`. **This HTTP catalog is the most registry-ready surface of any agent surveyed.**

## 7. Plugins (TypeScript)

v1: plugin = JS/TS module `export const MyPlugin = async ({ project, client, $, directory, worktree }) => ({ event, tool, … })` (`import type { Plugin } from "@opencode-ai/plugin"`). Auto-loaded from `.opencode/plugins/` and `~/.config/opencode/plugins/`; npm plugins listed in `"plugin": ["pkg"]`, cached in `~/.cache/opencode/node_modules/`; local deps via `.opencode/package.json` (bun install at startup). Custom tools via `tool({ description, args (Zod), execute })`; plugin tools can override built-ins of the same name. Load order: global config → project config → global plugin dir → project plugin dir.

- v1 event names (exact): `command.executed`, `file.edited`, `file.watcher.updated`, `installation.updated`, `lsp.client.diagnostics`, `lsp.updated`, `message.part.removed|updated`, `message.removed|updated`, `permission.asked|replied`, `server.connected`, `session.created|compacted|deleted|diff|error|idle|status|updated`, `shell.env`, `tool.execute.after|before`, `tui.prompt.append`, `tui.command.execute`, `tui.toast.show`, `experimental.session.compacting`.

**v2 plugins (rewritten; 1.0 plugins incompatible):**
- Config `"plugins"` array entries: `"pkg"`, `"pkg@1.2.3"` (pin/exact/range), `"pkg@github:owner/repo"`, `{ "path": "./plugins/dev" }`; also `"plugins": [ "@scope/*" ]` wildcard enables per-plugin enable/disable flags.
- CLI (registry hooks): `opencode plugin add <spec> [--path ./sub]` (replaces in place), `opencode plugin list`, `opencode plugin check` (loads and reports failures), `opencode plugin update`, `opencode plugin remove`.
- Sources: npm registry, git remotes (`pkg@github:owner/repo`), local paths (loaded directly, not copied).
- 2.0 facts: ~80+ internal plugins; TUI plugins stable; everything hot-reloads; `credential.activate` exposed to plugins (v2.0.28); `ctx.permission.assert` (v2.0.29); plugins read theme via `context.theme` / `context.themeMode`. Ecosystem: ~50 community plugins (Sentry, Firecrawl, Tavily, Supabase, Daytona, JFrog…), template repo `zenobi-us/opencode-plugin-template`; `ocx` = community "extension manager with portable, isolated profiles". No official marketplace — docs ecosystem page is PR-curated; aggregators: `awesome-opencode`, `opencode.cafe`.

## 8. MCP servers

- Config (v1 key `mcp.<name>`, v2 `mcp.servers.<name>`; both merge across config layers):
```json
{ "mcp": {
    "local-name":  { "type": "local",  "command": ["npx","-y","pkg"], "environment": {"K":"V"}, "cwd": ".", "enabled": true, "timeout": 5000 },
    "remote-name": { "type": "remote", "url": "https://mcp.example.com", "headers": {"Authorization":"Bearer {env:KEY}"}, "oauth": {"clientId":"{env:ID}","clientSecret":"{env:SEC}","scope":"tools:read"}, "enabled": true } } }
```
- Tools are exposed as `mcp.<server>.<tool>` (docs also show `<server>_<tool>` naming), toggleable per agent via `tools: {"my-mcp*": false}` (v1) globs `*`/`?`.
- OAuth: automatic on 401 (Dynamic Client Registration RFC 7591); tokens in `~/.local/share/opencode/mcp-auth.json`; `opencode mcp auth <name>`, `mcp auth list`, `mcp logout`, `mcp debug`.
- CLI: v1 `opencode mcp add` (bare); **v2 `opencode mcp add <name> --scope project|user|system [--command … --env K=V | --url … --header "K: v"]`** — the programmatic registration path. Also `opencode mcp list|ls`.
- 2.0 Code Mode: MCP servers opted into codemode by default (converted to JS functions; less context bloat).
- Remote `.well-known/opencode` org defaults may pre-configure servers (disabled until `enabled: true` locally).

## 9. Themes

- JSON drops only (no npm): `~/.config/opencode/themes/<name>.json` (global), `.opencode/themes/<name>.json` (project overrides global by same name). Filename = theme name. Select via `/themes` (v1 `/theme`) or config: v1 `tui.json` `{"theme":"tokyonight"}`; v2 `cli.json` `{"theme":{"name":"…","mode":"dark|light|system"}}`.
- Schema `"$schema": "https://opencode.ai/theme.json"`. v1: flat keys (`primary`, `text`, `backgroundPanel`, `diffAdded`, `syntaxKeyword`, `markdownLink`, …). v2: structured `{ "base": {…}, "light": {…}, "dark": {…} }` with 9-step hue scales (`gray…purple` + aliases `accent`/`interactive`/`neutral`), semantic tokens (`text.muted`, `background.raised`, `border`, `diff.*`, `syntax.*`, `markdown.*`), state keys `$hovered/$focused/…`, `@dialog` overrides. Built-ins: `opencode`, `system`, `tokyonight`, `catppuccin`, `gruvbox`, `nord`, `ayu`, `everforest`, `kanagawa`, `matrix`, `one-dark`. Web Theme Tool: `https://opencode.ai/theme/`. Plugins cannot register themes (JSON only).

## 10. Permissions & policies

- **Permissions** gate tool actions during a session (v2 top-level `permissions`; v1 `permission`). v1 object form: `{"permission": {"*":"ask","bash":{"*":"ask","git *":"allow","rm *":"deny"},"edit":{"*":"deny","packages/web/src/**/*.mdx":"allow"},"webfetch":{"https://en.wikipedia.org/*":"allow"}}}` — per-tool maps, last-match-wins, `*`/`?` globs, `~/`/`$HOME` expansion. v2 generalizes to an **array of statements** `{"action","resource","effect"}` covering the same tools; actions include `skill`, `task` (subagent type as resource), `external_directory`, `doom_loop`. Per-agent overrides win over global. Defaults: most tools allow; `doom_loop` and `external_directory` ask; `read` denies `.env*` except `.env.example`. `opencode --auto` / `run --auto` auto-approves non-denied.
- **Policies** (v2 stable since v2.0.29, 2026-10-14; v1 `experimental.policies`): resource-use control, currently `provider.use` on provider ids: `[{"effect":"deny","action":"provider.use","resource":"*"},{"effect":"allow","action":"provider.use","resource":"anthropic"}]`. Last match wins; **global config policies override project policies** (a repo cannot re-enable a globally denied provider). Replaces v1 `disabled_providers`/`enabled_providers`.

## 11. Providers / models

- 75+ providers via **models.dev** registry + Vercel AI SDK. Credentials: `/connect` TUI flow or `opencode auth login --provider X`; stored `~/.local/share/opencode/auth.json`; `opencode auth list`. Custom OpenAI-compatible providers in config:
```json
{ "provider": { "myprov": { "npm": "@ai-sdk/openai-compatible", "name": "My Prov",
  "options": { "baseURL": "https://api.myprov.com/v1", "apiKey": "{env:KEY}", "headers": {} },
  "models": { "my-model": { "name": "Display", "limit": {"context":200000,"output":65536} } } } } }
```
  (v2 top-level key `providers`; per-model `provider.npm` override; local endpoints: llama.cpp, Ollama, LM Studio, vLLM/NVIDIA NIM patterns documented). Whitelist/blacklist filters for the model picker; `model` and `small_model` defaults.

## 12. References (v2 only)

Named external dirs/git repos agents may consult: `"references": { "api-spec": { "repository": "https://github.com/acme/spec", "branch": "main", "description": "…" } }` (or `path` for local). Git clones cached `~/.local/share/opencode/repos/<host>/<path>[@<branch>]`, auto-refresh if ≥24h old. Shorthand: string starting `.`/`/`/`~` = local path, else repo URL.

## 13. Cross-compatibility (OpenCode as a consumer)

| Foreign artifact | Consumed? | Mechanism |
|---|---|---|
| Claude Code skills (SKILL.md) | **Yes, natively** | reads `.claude/skills/` (project+global); honors `disable-model-invocation` |
| CLAUDE.md | Yes (fallback) | used only when no AGENTS.md at same scope |
| `~/.claude/*` generally | Partial | skills + global CLAUDE.md; disable via `OPENCODE_DISABLE_CLAUDE_CODE*` env vars |
| AGENTS.md (Codex/standard) | **Yes, native** | primary rules format |
| Codex config.toml / `.codex/` | Not documented | UNVERIFIED / no |
| Cursor rules | Partial | only via `instructions` globs (`.cursor/rules/*.md`) |
| Claude Code plugins (TS hooks) | No | OpenCode plugin API is its own (and v1→v2 incompatible) |
| Claude/Codex slash commands `.md` | Partial | OpenCode command .md format is near-identical (description/agent/model/subtask frontmatter) but lives in `.opencode/commands/`; drop-in compatibility UNVERIFIED |
| MCP (standard) | **Yes** | stdio + streamable HTTP + OAuth |
| ACP (Zed Agent Client Protocol) | Yes | `opencode acp` |
| models.dev / any @ai-sdk provider | Yes | provider config |

Notable ecosystem bridge plugins: `opencode-openai-codex-auth` (reuse ChatGPT subscription), `opencode-gemini-auth`, `opencode-antigravity-auth`.

## 14. What a unified registry can call (programmatic injection points)

1. **Skills HTTP catalog (v2)** — serve `index.json` + files; register by adding URL to `skills` config array. Versioned (`name`+`version`, cached per version). Best primitive.
2. **`opencode plugin add <pkg@version | git+URL | path> [--path]`** (v2 CLI) — npm/git/path plugin installer with pinning; also `plugin update/remove/check`.
3. **`opencode mcp add <name> --scope project|user|system [--command/--url/--header/--env]`** (v2 CLI) — MCP registration without hand-editing JSON.
4. **`opencode agent add` / `agent create`** (v2/v1) — scaffold agent .md.
5. **File drops** — everything else is a file in `.opencode/` (agents, commands, skills, themes) or `~/.config/opencode/`; no lock file, no manifest beyond the artifact itself.
6. **Config merge layers** — remote `.well-known/opencode` (org defaults) + managed/MDM configs: an org-level channel to pre-register MCP servers/providers/policies.
7. **Server API / SDK** — 2.0 exposes a rewritten HTTP API (`@opencode/sdk`, `@opencode/client`, `opencode api`, `opencode serve --port`); plugin `client` gives programmatic access. Schema-driven config edits + `opencode plugin check` for validation.

## 15. Timeline 2025 → Oct 2026

| Date | Event |
|---|---|
| Early 2025 | Charmbracelet ships Go-based "opencode" |
| 2025-04-30 | `sst/opencode` repo created; TS/Bun rewrite begins |
| 2025-05/06 | Public launch of SST OpenCode |
| 2025-07-29/30 | Charm renames its Go fork to **Crush**; "OpenCode" name goes to SST's version |
| Late 2025 | TUI rewrite; **native Agent Skills (SKILL.md)** support lands ~v1.0.186 (exact date UNVERIFIED) |
| 2026-01 | SST rebrands to **Anomaly**; repo moves to `anomalyco/opencode` |
| Early–mid 2026 | Desktop app beta (`Anomaly.OpenCode.Desktop`), Console, provider account management; ~112k stars (Feb) → ~210k (Sep) |
| 2026-07-20 | News: OpenCode 2.0 major rewrite (Node migration, Electron desktop) |
| ~2026-09/10 | **OpenCode 2.0 released** (exact 2.0.0 date UNVERIFIED); v2 docs live; `opencode upgrade --major` |
| 2026-10-08 → 10-16 | v2.0.26→v2.0.32: skills refactor (#55049/#55061), `credential.activate` for plugins, **policies stabilized** (10-14), dual V1/V2 config schema + `.claude` skill kill-switch honored (10-15) |
| 2026-10-12 | Cloudflare Agents SDK ships an OpenCode 2.0 harness |
| 2026-10-16 (now) | anomalyco/opencode ~214k stars; v1 docs still live at /docs, v2 at /v2/docs |

## 16. Sources (accessed 2026-10-16/17)

- https://opencode.ai/docs/skills/ — v1 skills (paths, frontmatter, permission.skill, metadata keys)
- https://opencode.ai/v2/docs/skills/ — v2 skills, `skills` config array, HTTP catalog index.json, precedence
- https://opencode.ai/docs/agents/ and https://opencode.ai/v2/docs/agents/ — agent frontmatter, built-ins, CLI
- https://opencode.ai/docs/commands/ and https://opencode.ai/v2/docs/commands/ — command format, `$1…$9`, `commands` array
- https://opencode.ai/docs/plugins/ — v1 plugin API, event list, load order
- https://opencode.ai/v2/docs/plugins/ — v2 plugin config/CLI, git+npm+path sources, wildcard control
- https://opencode.ai/docs/config/ and https://opencode.ai/v2/docs/config/ — file names, locations, precedence, top-level keys
- https://opencode.ai/docs/mcp-servers/ and https://opencode.ai/v2/docs/mcp-servers/ — MCP config, OAuth, CLI
- https://opencode.ai/docs/rules/ — AGENTS.md, CLAUDE.md fallbacks, env kill-switches
- https://opencode.ai/docs/permissions/ — permission maps, granular rules, defaults
- https://opencode.ai/docs/policies/ — experimental.policies (provider.use)
- https://opencode.ai/docs/providers/ — /connect, custom providers, models.dev, auth.json
- https://opencode.ai/docs/themes/ and https://opencode.ai/v2/docs/cli/theme/ (+ /cli/config/) — theme paths/schema, cli.json
- https://opencode.ai/v2/docs/references/ — references config, repos cache
- https://opencode.ai/docs/cli/ — full v1 CLI command list
- https://opencode.ai/docs/ecosystem/ — community plugins, awesome-opencode, opencode.cafe, ocx
- https://opencode.ai/docs/ — v1/v2 docs coexistence
- https://github.com/anomalyco/opencode — install commands, stats, brew tap, desktop beta
- https://anoma.ly/notes/opencode-2-0 — 2.0 design notes (Service, codemode, plugin break)
- https://opencode.ai/changelog — v2.0.26–v2.0.32 entries (Oct 2026)
- https://x.com/thdxr/status/2007199285251842478 — Anomaly rebrand statement
- https://news.ycombinator.com/item?id=44736176 and https://github.com/charmbracelet/crush — Charm→Crush rename (2025-07)
- https://agentscamp.com/tools/opencode — Jan 2026 repo-move date
- https://blog.doshby.com/what-is-opencode-ai — origin/fork narrative
- https://www.kucoin.com/news/flash/opencode-2-0-major-rewrite-api-overhaul-node-migration-and-electron-desktop-shift — 2026-07-20 2.0 rewrite news
- https://developers.cloudflare.com/changelog/post/2026-10-12-opencode-harness — OpenCode 2.0 harness (2026-10-12)
- https://www.firecrawl.dev/blog/best-opencode-skills — "implements the Agent Skills open standard natively"
- https://www.reddit.com/r/opencodeCLI/comments/1pt8oeu/ — skills in v1.0.186 (adoption timing, approximate)
