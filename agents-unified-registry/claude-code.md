# Claude Code (Anthropic) — Extensibility & Registration Surfaces

Research date: 2026-10-16. Current release: **v2.1.302** (npm `latest`, published 2026-10-16; `stable` dist-tag = 2.1.292, 2026-10-06). Docs home: https://code.claude.com/docs (full index at /docs/llms.txt). Source repo: github.com/anthropics/claude-code (issues + CHANGELOG.md; CLI itself is closed-source, distributed via npm `@anthropic-ai/claude-code`).

Config root: `~/.claude/` (Windows: `%USERPROFILE%\.claude`), relocatable via `CLAUDE_CONFIG_DIR`. State file: `~/.claude.json` (separate from settings). Terminal CLI, desktop app, and VS Code extension share the same settings/plugins/MCP config; cloud sessions (claude.ai/code) read only committed `.claude/settings.json` + server-managed settings.

## 1. Summary table

| Surface | Artifact / manifest | Filesystem location (personal → project) | Scopes | Install / register | Distribution |
|---|---|---|---|---|---|
| Skills | `SKILL.md` + YAML frontmatter (dir per skill) | `~/.claude/skills/<name>/`, `.claude/skills/<name>/` (also enterprise, nested, `--add-dir`, plugin `skills/`, claude.ai synced `~/.claude/skills/synced/`) | enterprise > personal > project > nested; plugin namespaced | File drop; `/plugin install` if in plugin | git, plugin marketplaces, claude.ai account sync; open Agent Skills spec (agentskills.io) |
| Slash commands (legacy) | `.md` file, skills-style frontmatter | `~/.claude/commands/`, `.claude/commands/` | same as skills | File drop | git; "merged into skills" — legacy path still works |
| Subagents | `*.md`, YAML frontmatter (body = system prompt) | `~/.claude/agents/`, `.claude/agents/` (walked up to repo root), plugin `agents/`, `--agents` JSON | org > project > personal > plugin; nearest-to-cwd wins | File drop; `--agents '{...}'` | git, plugins |
| Hooks | `hooks` object in settings JSON / plugin `hooks/hooks.json` / skill & agent frontmatter | `~/.claude/settings.json`, `.claude/settings.json`, `.claude/settings.local.json`, managed-settings.json, `<plugin>/hooks/hooks.json` | merge across ALL levels (managed cannot be disabled by users) | Edit settings; plugin install | settings files, plugins |
| MCP servers | `mcpServers` JSON map (stdio/http/sse/ws) | `~/.claude.json` (local+user), `.mcp.json` at project root, plugin `.mcp.json` | managedMcpServers > local > project > user > plugin > claude.ai connectors | `claude mcp add [--transport http|stdio|sse] name url -- cmd`, `claude mcp add-json` | file, CLI; OAuth; `.mcpb`/`.dxt` bundles |
| Plugins | `.claude-plugin/plugin.json` | installed under `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/` | user / project (`.claude/settings.json`) / local / managed / session (`--plugin-dir`) | `claude plugin install <name>[@<marketplace>] [-s scope]` | marketplaces (git/json-url/dir), `--plugin-dir`, skills-dir, claude.ai sync |
| Marketplaces | `.claude-plugin/marketplace.json` | clone in `~/.claude/plugins/marketplaces/<name>/`; records in `~/.claude/plugins/known_marketplaces.json` | user/project/local; managed can force/block | `claude plugin marketplace add <owner/repo|url|path>` | git repo, JSON URL, shared dir |
| Output styles | `*.md` + frontmatter (`name`,`description`,`keep-coding-instructions`,`force-for-plugin`) | `~/.claude/output-styles/`, `.claude/output-styles/`, plugin `output-styles/` | personal, project, managed, plugin | File drop; `/output-style <name>` to activate | file, plugins |
| LSP servers | `.lsp.json` (root-level map) or `lspServers` in plugin.json | plugin root only | plugin | bundle in plugin | plugins |
| Themes / Workflows / Channels / Monitors | `themes/*.json`, `workflows/*.js`, `channels` key, `monitors/monitors.json` | plugin dirs (`experimental.themes`, `workflows/`, `channels`, `experimental.monitors`) | plugin | bundle in plugin | plugins |
| Mods (JS hooks modules) | `hooks/hooks.json` with `modules` key + JS | plugin | plugin | `claude plugin install` | plugins (v2.1.287+, 2026-10-01) |
| Statusline | script command in settings `statusLine` | any script path | user/project/local/managed | settings key | n/a |
| Custom tools | Agent SDK in-process MCP server | code | SDK only | SDK `customTools` | code (docs/en/agent-sdk/custom-tools) |

## 2. Settings scopes & precedence (the substrate)

Files (highest → lowest precedence):
1. **Managed**: `managed-settings.json` — macOS `/Library/Application Support/ClaudeCode/managed-settings.json`; Linux/WSL `/etc/claude-code/managed-settings.json`; Windows `C:\Program Files\ClaudeCode\managed-settings.json` (legacy `C:\ProgramData\ClaudeCode\` NOT read). Also MDM/HKLM/HKCU, claude.ai console server-managed settings, `managed-settings.d/*.json` drop-ins. Nothing overrides managed keys except an explicit stricter-value allowlist.
2. **Command line**: `claude --settings <file-or-json>` (session only).
3. **Project local**: `.claude/settings.local.json` (auto-git-excluded).
4. **Project shared**: `.claude/settings.json` (committed).
5. **User**: `~/.claude/settings.json`.

List-valued keys (e.g. `permissions.allow`, hooks) **merge** across levels; scalar keys override. Extensibility-relevant keys: `enabledPlugins` (`{"<name>@<marketplace>": true|false}`), `extraKnownMarketplaces`, `strictKnownMarketplaces`, `blockedMarketplaces`, `pluginSuggestionMarketplaces`, `managedMcpServers`, `skillOverrides` (`"on"|"name-only"|"user-invocable-only"|"off"`), `disableBundledSkills`, `syncClaudeAiSkills` / `syncClaudeAiPlugins`, `outputStyle`, `statusLine`, `agent`, `hooks`, `disableAllHooks`, `allowManagedHooksOnly`, `disableSideloadFlags`, `disableCommandPluginSources`, `env`. Cloud sessions read only committed project settings + server-managed settings. `enabledPlugins`/`extraKnownMarketplaces` "wait for trust" before applying to teammates.

## 3. Skills (primary extension unit)

**Format**: directory containing `SKILL.md` (YAML frontmatter + markdown body; keep <500 lines, support files load on demand). Claude Code follows the open **Agent Skills spec** (agentskills.io) — spec-conformant frontmatter is exactly: `name`, `description` (required), `license`, `compatibility`, `metadata`, `allowed-tools` (experimental; space-separated). Claude Code extends with: `when_to_use`, `argument-hint`, `arguments` (named positional), `disable-model-invocation`, `user-invocable`, `disallowed-tools`, `model`, `effort`, `context: fork` (+ `agent`, `background`; v2.1.218+), `hooks`, `paths` (globs), `shell` (`bash`/`powershell`). Spec-only constraint note: claude.ai uploads hard-error on non-spec fields; local Claude Code accepts extensions. Spec `name` rules: ≤64 chars, lowercase a-z0-9 + `-`, no leading/trailing/double hyphen, must match directory name; `description` ≤1024 chars (Claude Code truncates description+when_to_use combined at 1,536 chars).

**Paths** (all discovered automatically):
- Personal: `~/.claude/skills/<skill-name>/SKILL.md`
- Project: `.claude/skills/<skill-name>/SKILL.md`; nested `<subdir>/.claude/skills/...` (name-clash → directory-qualified command `/apps/web:deploy`)
- Enterprise: `.claude/skills/` inside the managed-settings directory
- Additional dirs: `.claude/skills/` of any `--add-dir` directory
- Plugin: `<plugin>/skills/<skill-name>/SKILL.md` → `/plugin-name:skill-name`
- claude.ai account: synced to `~/.claude/skills/synced/` → `/anthropic-skills:<name>`

**Shadowing**: enterprise > personal > project; local skills replace bundled skills; skills beat `.claude/commands/` files on name clash. Reserved names: `synced`, `anthropic-skills` / `anthropic-skills:*`. Plugin dirs with `.claude-plugin/plugin.json` under a skills dir register as `@skills-dir` origin plugins.

**Mechanics**: progressive disclosure (name+description always in context; body loads on invocation, persists for session). Auto-invoked by the model, or user types `/name` (up to 6 stackable). Dynamic context: `` !`cmd` `` lines and ` ```! ` blocks execute pre-injection. Placeholders: `$ARGUMENTS`, `$ARGUMENTS[N]`/`$N`, named `$name`, `${CLAUDE_SESSION_ID}`, `${CLAUDE_EFFORT}`, `${CLAUDE_SKILL_DIR}`, `${CLAUDE_PROJECT_DIR}`, `${CLAUDE_PLUGIN_ROOT}`, `${CLAUDE_PLUGIN_DATA}`.

**Registration commands**: none needed (file drop); `/skills` (list, toggle via Space), `/reload-skills`, `/skill-doctor`, `/doctor`, `/plugin install <skill-plugin>@claude-plugins-official`, `claude plugin init <name>` (scaffolds into `~/.claude/skills/<name>/`). Skill-creator plugin: `/plugin install skill-creator@claude-plugins-official`. Validation (spec-level): `skills-ref validate ./my-skill` from github.com/agentskills/agentskills.

## 4. Slash commands (legacy, absorbed by skills)

`.claude/commands/deploy.md` (user: `~/.claude/commands/`) still creates `/deploy`; subdirs nest (`commands/db/migrate.md` → `/db:migrate`). Same frontmatter as skills. Docs: "Custom commands have been merged into skills" — no hard removal date; new work should use skills. Introduced v0.2.31 (2025-03-05).

## 5. Subagents

**Format**: one markdown file per agent, YAML frontmatter, body = system prompt. Required: `name` (≤256 chars, no `:`), `description` (delegation trigger — there is no `whenToUse` field). Optional: `tools` (allowlist; supports `mcp__github__*`, `Agent(worker)`), `disallowedTools` (e.g. `Bash(git push *)`, `mcp__*`), `model` (`sonnet|opus|haiku|fable|<id>|inherit`), `effort` (`low..max`), `permissionMode`, `maxTurns`, `autoCompactWindow` (v2.1.296+), `skills` (preload ≤32 skill bodies), `mcpServers`, `hooks`, `memory` (`user|project|local` → `.claude/agent-memory[-local]/<agent>/`), `background`, `omitClaudeMd` (v2.1.271+), `isolation: worktree`, `color`, `initialPrompt`, `experimental.cacheTtl`.

**Paths**: `.claude/agents/` (project; discovered walking cwd→repo root, nearest wins on collision), `~/.claude/agents/` (personal), managed-settings `.claude/agents/` (org), `--agents` CLI flag (session; JSON, or file path headless v2.1.281+), plugin `agents/` (recursive; `agents/review/security.md` → `my-plugin:review:security`).

**Invocation**: automatic (description match), explicit `@agent-<name>` / `@agent-<plugin>:<name>`, `claude --agent <name>`, or `"agent": "<name>"` in settings. Plugin subagents ignore `permissionMode`, `hooks`, `mcpServers`, `initialPrompt`. Transcripts: `~/.claude/projects/{project}/{sessionId}/subagents/agent-{id}.jsonl`.

## 6. Hooks

**Config** (3 nesting levels): `{"hooks": {"<Event>": [{"matcher": "Bash", "hooks": [{"type": "command", "command": "script.sh", "args": [], "timeout": 600, "if": "Bash(rm *)"}]}]}}`. Handler types: `command`, `http` (`url`,`headers`,`allowedEnvVars`), `mcp_tool` (`server`,`tool`,`input`), `prompt`, `agent` (both: `prompt`,`model`).

**Events** (2026-10): `SessionStart`, `SessionEnd`, `Setup`, `UserPromptSubmit`, `UserPromptExpansion`, `Stop`, `StopFailure`, `PreToolUse`, `PermissionRequest`, `PermissionDenied`, `PostToolUse`, `PostToolUseFailure`, `PostToolBatch`, `SubagentStart`, `SubagentStop`, `TaskCreated`, `TaskCompleted`, `TeammateIdle`, `PreCompact`, `PostCompact`, `PreModelSwitch`, `PostModelSwitch`, `Elicitation`, `ElicitationResult`, `Notification`, `MessageDisplay`, `ConfigChange`, `InstructionsLoaded`, `CwdChanged`, `FileChanged`, `DirectoryAdded`, `WorktreeCreate`, `WorktreeRemove`.

**Where definable**: user/project/local/managed settings, plugin `hooks/hooks.json` (+ inline `hooks` key in plugin.json — both load), skill frontmatter (session-scoped after invocation, `once: true`), subagent frontmatter (agent-scoped). Hooks **merge** across all levels. `disableAllHooks` cannot disable managed hooks.

**Contract**: JSON on stdin (`session_id`, `prompt_id`, `transcript_path`, `cwd`, `permission_mode`, `hook_event_name`, `tool_name`, `tool_input`, ...); exit 0 = success (stdout → JSON controls: `decision:"block"`, `hookSpecificOutput.permissionDecision`, `additionalContext` ≤10k chars, `systemMessage`, `continue`), exit 2 = blocking error (stderr = reason), other = non-blocking (unless `onFailure: "block"` v2.1.295+). Matchers: exact name, `|`/`,` alternatives, or regex (unanchored) when containing other chars; MCP tools match `mcp__<server>__<tool>`; plugin tools `mcp__plugin_<plugin>_<server>__<tool>`. Released v1.0.38 (2025-06-30).

## 7. MCP servers

**CLI**: `claude mcp add [--transport http|stdio|sse] <name> <url> [--header "K: V"] [--env K=V] [--scope local|project|user] -- <cmd...>`; `claude mcp add-json <name> '<json>'`; `claude mcp list|get|remove|login|logout`; `claude mcp add-from-claude-desktop`; `claude mcp serve` (Claude Code AS an MCP server); `/mcp` in-session.

**Storage/precedence**: local (default; `~/.claude.json` under `projects.<path>.mcpServers`) > project (`.mcp.json` at repo root, committed, needs interactive approval; gates: `enableAllProjectMcpServers`, `enabledMcpjsonServers`, `disabledMcpjsonServers`) > user (`~/.claude.json` top-level `mcpServers`) > plugin servers > claude.ai connectors; `managedMcpServers` outranks all (v2.1.259+). Whole-entry replacement, no merging. Entry types: `http` (alias `streamable-http`), `sse`, `ws`, `stdio` (`command`/`args`/`env`); `${VAR}` and `${VAR:-default}` expansion. Auth: OAuth 2.0 (`/mcp`, `claude mcp login`, auto-refresh), static `headers`, dynamic `headersHelper`. Env: `MCP_TIMEOUT`, `MCP_TOOL_TIMEOUT`, `MAX_MCP_OUTPUT_TOKENS` (25k default). Plugins: `.mcp.json` at plugin root (or `mcpServers` manifest key); server registers as `plugin:<plugin>:<server>`; tools `mcp__plugin_<plugin>_<server>__<tool>`; `.mcpb`/`.dxt` bundles supported. `.mcp.json` project scope introduced v0.2.50 (2025-03-19); MCP support itself Feb 2025 (v0.2.x).

## 8. Plugins & marketplaces

**Plugin = distributable bundle** of the above components. Directory layout:
```
my-plugin/
├── .claude-plugin/plugin.json     # manifest (only "name" required; manifest itself optional)
├── skills/<n>/SKILL.md  ├── commands/*.md  ├── agents/*.md  ├── hooks/hooks.json
├── output-styles/*.md  ├── themes/*.json  ├── workflows/*.js  ├── monitors/monitors.json
├── bin/  ├── scripts/  ├── settings.json  ├── .mcp.json  ├── .lsp.json
```
Root-level `SKILL.md` alone makes a single-skill plugin. `bin/` is added to Bash PATH while enabled (claude.ai refuses top-level `bin/`). Root `CLAUDE.md` is NOT loaded.

**plugin.json fields** (`.claude-plugin/plugin.json`): required `name` (kebab-case). Optional: `$schema`, `displayName`, `version` (pins until changed; beats marketplace entry), `description`, `author{name,email,url}`, `homepage`, `repository`, `license` (SPDX), `keywords[]`, `metadata` (unread), `icon`, `documentationUrl`, `supportUrl`, `privacyPolicyUrl`, `termsOfServiceUrl`, `defaultEnabled` (bool), `dependencies[]` (`"name"`, `"name@marketplace"`, `{name,marketplace,version}`), `settings` (only `agent`+`subagentStatusLine` apply), `userConfig{KEY:{type,title,description,required,default,options,multiple,sensitive,min,max}}` (referenced `${user_config.KEY}` / `CLAUDE_PLUGIN_OPTION_<KEY>`), `types`, `channels[{server,displayName,userConfig}]`, and component-path overrides: `skills` (adds), `commands` (replaces), `agents` (replaces), `hooks` (merges), `mcpServers` (merges), `lspServers` (merges), `outputStyles` (replaces), `workflows` (replaces), `experimental.themes|monitors|evals`. Paths relative, must start `./`, no traversal.

**marketplace.json fields** (`.claude-plugin/marketplace.json` at marketplace root): required `name`, `owner{name}`, `plugins[]`; optional `$schema`, `description`, `version`, `metadata.pluginRoot`, `forceRemoveDeletedPlugins`, `allowCrossMarketplaceDependenciesOn[]`, `renames{old→new|null}` (append-only). Plugin entry: required `name`, `source`; optional `description`, `version`, `category`, `tags[]`, `strict` (default true), `relevance`, `dependencies`, `defaultEnabled`, `displayName`, `metadata`, `headers`, `headersHelper`, plus any plugin.json fields (`strict:true` appends entry components to plugin.json; `strict:false` + component fields = conflict). **source types**: relative path `"./plugins/x"` (or bare under `metadata.pluginRoot`), `{source:"github", repo, ref, sha}`, `{source:"url", url, ref, sha}`, `{source:"git-subdir", url, path, ref, sha}`, `{source:"npm", package, version, registry}` (scripts never run), `{source:"archive", url, sha256}` (https zip; limits 256 MiB/120 s), `{source:"command", command, timeout, mode:"copy"|"link"}`. Release channels = two marketplaces with different refs; `owner/repo#ref` pins branches/tags (v2.0.28, 2025-10-27).

**CLI** (`claude plugin ...`, alias `claude plugins`): `init <name>` (scaffold), `install <name>[@marketplace] [-s user|project|local] [--config K=V] [--marketplace <src>] [-y|--accept-command <sha256>] [--json]`, `uninstall`, `enable/disable [-s] [-a]`, `update`, `list [--json] [--available]`, `details <name>`, `configure <n@mp> --values-stdin`, `prune`, `validate <path> [--strict] [--json]`, `eval`, `eval init`, `tag`, `test`; marketplace: `marketplace add|remove|update|list`. Session-only: `claude --plugin-dir <path>` / `--plugin-url <url>` (origin `@inline`). In-session: `/plugin` (Discover/Installed/Marketplaces tabs).

**Disk layout** (`~/.claude/plugins/` unless `CLAUDE_CODE_PLUGIN_CACHE_DIR`): `cache/<marketplace>/<plugin>/<version>/` (= `${CLAUDE_PLUGIN_ROOT}`), `data/<plugin-id>/` (= `${CLAUDE_PLUGIN_DATA}`, survives updates), `marketplaces/<name>/` (clones), `synced/`, `.trash/`, plus `installed_plugins.json`, `known_marketplaces.json`, `flagged-plugins.json`. Load pipeline: declared (settings `enabledPlugins`) → fetched (disk) → loaded (session); `/reload-plugins` refreshes. Version resolution: manifest `version` → marketplace entry → source-derived (commit SHA-256/SHA; `unknown` for local). Node deps install only with `package.json` + `bun.lock`/`npm-shrinkwrap.json`/`package-lock.json` (v2/v3), `--ignore-scripts`, frozen. Auto-update: opt-in per marketplace (UI toggle or managed `extraKnownMarketplaces.<name>.autoUpdate`), runs after first message + ≤10 min jitter.

**Precedence (plugin name conflicts)**: managed locked ids > enabled `--plugin-dir` copies > installed marketplace plugins > skills-dir plugins (user beats project) > synced claude.ai plugins. `enabledPlugins` key-level precedence: `--add-dir` < user < project < local < `--settings` < managed.

**Official channels**: `claude-plugins-official` (github.com/anthropics/claude-plugins-official; **auto-added** on first interactive session unless `CLAUDE_CODE_DISABLE_OFFICIAL_MARKETPLACE_AUTOINSTALL` / managed policy), `claude-community` (anthropics/claude-plugins-community, manual), demo `claude-code-plugins` (in anthropics/claude-code repo). Anthropic directory on claude.ai → reaches Claude Code via **account sync**; claude.com/marketplace/plugins is a browse/submit website (install counts, "Anthropic verified" badge). Topic marketplaces: `anthropics/skills`, `anthropics/knowledge-work-plugins`.

**Registry surface for a third party**: no documented public HTTP API for marketplaces/directory (UNVERIFIED whether claude.com/marketplace has an undocumented API). Programmatic path: publish a git repo (or JSON URL) with `.claude-plugin/marketplace.json`; register via `claude plugin marketplace add <owner/repo>`; install via `claude plugin install <name>@<mp> --json`. `claude plugin list --available --json` and `claude plugin validate --json` are machine-readable hooks for a unified registry.

## 9. Output styles

`~/.claude/output-styles/*.md`, `.claude/output-styles/*.md`, managed `.claude/output-styles/`, plugin `output-styles/` (shown as `<plugin>:<name>`). Frontmatter (all optional): `name`, `description`, `keep-coding-instructions` (bool), `force-for-plugin` (plugin-only; auto-applies, first-loaded wins). Activate: `/output-style <name>` or `/config`; persisted as `outputStyle` in `.claude/settings.local.json` (case-sensitive for built-ins). Built-ins: Default, Proactive, Concise, Explanatory, Learning. History: released v1.0.81 (2025-08-14); deprecated v2.0.30 (~2025-10-31); un-deprecated v2.0.32 (2025-11-03); `/output-style` command itself deprecated v2.1.73 then re-added v2.1.269 (2026-09-11).

## 10. Newer / secondary surfaces

- **LSP servers**: plugin `.lsp.json` (name→config map, requires `extensionToLanguage`) or `lspServers` manifest key; adds language-server tools.
- **Themes**: plugin `themes/*.json` → `/theme` (experimental).
- **Dynamic workflows**: `workflows/*.js` (meta block + orchestration script over subagents), `/workflows`; introduced v2.1.154 (2026-05-28).
- **Channels**: plugin `channels` key binding MCP servers to messaging channels.
- **Monitors**: `monitors/monitors.json` (`{name,command,description}` background commands notifying Claude; interactive only).
- **Mods** (v2.1.287, 2026-10-01): plugins with a JS hooks module (`hooks/hooks.json` `modules` key) that hook deep CLI internals (`tool.check`, `prompt.submit`, `agent.spawn`, `$.state`, UI drawing); validated/testable via `claude plugin validate/test`.
- **Statusline**: `statusLine` settings key → script (JSON stdin; `/statusline` wizard).
- **claude.ai sync** (v2.1.275, 2026-09-17): skills+plugins enabled on claude.ai account sync into terminal sessions (`syncClaudeAiSkills`, `syncClaudeAiPlugins` to opt out).
- **Custom tools**: only via Agent SDK in-process MCP server (docs/en/agent-sdk/custom-tools) — not a file-drop surface.
- **Plugin evals**: `claude plugin eval` (v2.1.269, 2026-09-11) — with/without-plugin scored evals for CI gating.
- **VS Code extension** (id `anthropic.claude-code`, Open VSX too): shares ALL CLI config (`~/.claude`, `.claude/`, plugins, MCP, hooks); adds `vscode://anthropic.claude-code/install-plugin?plugin=...&marketplace=...` deep link, `/plugins` Manage-plugins UI (per-plugin options forms), `/skills` dialog (v2.1.280+), Hooks dialog (v2.1.269+), Output styles menu (v2.1.257+/261+), hidden `ide` MCP server (`mcp__ide__getDiagnostics`, `mcp__ide__executeCode`).
- **Statuses**: no such named surface in current docs (closest: statusline, `/status`, `/tasks` subagent panes) — treat "statuses" as another harness's concept (e.g. OpenCode statusline providers).

## 11. Cross-compatibility

**Claude Code consumes**: (a) any **Agent Skills spec** (agentskills.io) skill folder — the spec Claude Code itself implements and that 40+ harnesses support (per agentskills.io client showcase, accessed 2026-10-16): Cursor, GitHub Copilot, VS Code, Gemini CLI, Codex/ChatGPT (developers.openai.com/codex/skills), OpenCode, Goose, Amp, OpenHands, Junie, Kiro, Roo Code, Pi (badlogic/pi-mono), Factory, Databricks, Snowflake Cortex Code, etc.; (b) **AGENTS.md** — with no CLAUDE.md present, Claude Code reads AGENTS.md (v2.1.277, 2026-09-19-ish; toggle in `/config` → Project instructions), the de-facto cross-harness instruction file; (c) any **MCP** server (standard protocol, OAuth); (d) Claude Desktop MCP servers via `claude mcp add-from-claude-desktop`. **Not consumed**: OpenCode/Codex plugin formats, pi agents.json, npm packages as direct extensions (npm only as a plugin *source*).

**The "Agent Plugins" open spec** (agent-plugins.org, v1.0.0, Aug 2026; OpenAI/Microsoft/AWS/GitHub/Cursor/Vercel): defines `plugin.json` (`$schema`,`name` required; closed field set: version, description, author, homepage, repository, license, keywords, extensions) + `skills/` (Agent Skills) + root `mcp.json` + reverse-DNS client dirs. Deliberately convergent with Claude Code's layout. **Anthropic is not a listed backer and Claude Code does not document support** — Claude Code's `.claude-plugin/plugin.json` differs (`.claude-plugin/` subdir vs root; richer fields). UNVERIFIED whether Claude Code loads root-level agent-plugins `plugin.json`.

**Implication for a unified registry**: Agent Skills (SKILL.md) is the genuine interchange format — one artifact, ~40 consumers. MCP config is near-universal. Subagents/hooks/commands/output-styles are Claude-specific shapes; plugins/marketplaces are Claude-specific distribution that maps cleanly onto agent-plugins.org concepts but is not identical.

## 12. Timeline (all dates verified against npm publish dates + CHANGELOG.md unless noted)

| Date | Event |
|---|---|
| 2025-02/03 | MCP support + `claude mcp add` wizard (v0.2.x; `--mcp-debug` v0.2.31) |
| 2025-03-05 | v0.2.31: custom slash commands (`.claude/commands/*.md`) |
| 2025-03-19 | v0.2.50: MCP project scope (`.mcp.json`, committable) |
| 2025-05-22 | v1.0.0 GA |
| 2025-06-30 | v1.0.38: **hooks released** |
| 2025-07-24 | v1.0.60: **custom subagents** (`/agents`) |
| 2025-08-14 | v1.0.81: **output styles** released |
| 2025-09-22 | anthropics/skills repo created (public skill examples) |
| 2025-09-29 | v2.0.0 (Claude Code 2.0; Agent SDK era) |
| 2025-10-09 | v2.0.12: **plugin system released** (public beta; blog anthropic.com/news/claude-code-plugins) with `/plugin`, marketplaces, `extraKnownMarketplaces` |
| 2025-10-16 | v2.0.20: **Agent Skills in Claude Code** (Anthropic launches Agent Skills; skills absorb commands) |
| 2025-10-27 | v2.0.28: `#ref` branch/tag pinning for git plugins/marketplaces |
| 2025-10-31→11-03 | v2.0.30→2.0.32: output styles deprecated → un-deprecated after community pushback |
| 2025-12-15 | v2.0.70: per-marketplace auto-update toggle |
| 2025-12-16 | **Agent Skills spec donated to agentskills/agentskills** (agentskills.io open standard) |
| 2026-01-07 | v2.1.0 |
| 2026-03-04 | v2.1.69: `${CLAUDE_SKILL_DIR}` |
| 2026-05-28 | v2.1.154: **dynamic workflows** (`/workflows`) |
| 2026-07-22 | v2.1.218: `context: fork` subagent execution for skills |
| 2026-08 (6th) | **Agent Plugins spec 1.0.0** (agent-plugins.org — OpenAI/MS/AWS/GitHub/Cursor/Vercel; Anthropic absent) |
| 2026-09-11 | v2.1.269: `claude plugin eval`; `/output-style` restored |
| 2026-09-17 | v2.1.275: claude.ai skills/plugins **account sync** to terminal |
| 2026-09-19± | v2.1.277: **AGENTS.md** fallback instruction file |
| 2026-10-01 | v2.1.287: **Claude Mods** (JS plugin hook modules) |
| 2026-10-16 | v2.1.302 current (`stable`=2.1.292, 2026-10-06) |

## 13. Registry integration recipes (what a unified registry would actually call)

Machine-readable, exit-coded, `--json`-capable — Claude Code's plugin CLI is scriptable end to end:

```bash
# Register a marketplace (git, JSON-URL, or dir) and install in one step
claude plugin marketplace add my-org/agent-registry --scope project --json
claude plugin install my-skill@agent-registry -s user --json          # non-TTY safe with --json? needs -y/--accept-command
claude plugin install my-skill --marketplace my-org/agent-registry -y --json  # add+install combined

# Inventory / introspection for a registry sync tool
claude plugin list --json                # installed: id, version, scope, enabled, installPath, mcpServers, errors
claude plugin list --available --json    # catalog of known marketplaces
claude plugin details <name>             # component inventory + projected token cost
claude plugin validate <path> --strict --json   # pre-publish gate (exit 0/1/2)

# Per-artifact-type one-liners a unified registry maps onto
#  skill   -> git clone into ~/.claude/skills/<name>/   (no CLI needed; or ship as plugin)
#  agent   -> drop <name>.md into .claude/agents/ or ~/.claude/agents/
#  hook    -> merge JSON into settings.json "hooks" (all scopes merge)
#  mcp     -> claude mcp add [-t http|stdio] <name> <url> -s user|project|local
#  command -> drop <name>.md into .claude/commands/ (legacy; prefer skills)
#  style   -> drop <name>.md into ~/.claude/output-styles/
#  bundle  -> claude plugin install <name>@<mp>   (packages all of the above)
```

Key constraints for cross-harness design: (1) skill auto-discovery means **skills need no registration command at all** — path convention IS the registry; (2) plugins are the only unit with versions + dependency resolution + lockfile-ish pinning (`version` field, `#ref`, `sha`); (3) `plugin.json` vs marketplace `strict` mode means a registry's `marketplace.json` entries can fully define a plugin with no repo manifest; (4) no first-class lockfile — resolution = `version` string (manifest wins), else marketplace entry, else commit hash; (5) skills/agents/hooks are plain files in git → a unified registry can distribute them as a Claude Code plugin with `skills/`+`agents/`+`hooks/` and the same bundle works on claude.ai/Cowork (minus stdio MCP and `bin/`).

## 14. Sources (all accessed 2026-10-16)

- Skills: https://code.claude.com/docs/en/skills
- Slash commands: https://code.claude.com/docs/en/commands
- Subagents: https://code.claude.com/docs/en/sub-agents
- Hooks: https://code.claude.com/docs/en/hooks (+ /docs/en/hooks-guide)
- MCP: https://code.claude.com/docs/en/mcp
- Settings: https://code.claude.com/docs/en/settings ; managed: https://code.claude.com/docs/en/managed-settings
- Plugins overview: https://code.claude.com/docs/en/plugins/overview ; components: /plugins/components ; manifest: /plugins/manifest-reference ; marketplace.json: /plugins/marketplace-reference ; hosting: /plugins/host-marketplace ; CLI: /plugins/cli-reference ; loading/precedence: /plugins/loading ; Anthropic marketplaces: /plugins/anthropic-marketplaces
- Output styles: https://code.claude.com/docs/en/output-styles
- VS Code: https://code.claude.com/docs/en/vs-code ; custom tools: /agent-sdk/custom-tools
- Doc index: https://code.claude.com/docs/llms.txt
- Agent Skills spec: https://agentskills.io + https://agentskills.io/specification ; repo github.com/agentskills/agentskills (created 2025-12-16, via GitHub API)
- Agent Plugins spec: https://agent-plugins.org/specification ; repo github.com/agentplugins/agent-plugins-spec ; AWS blog aws.amazon.com/blogs/opensource/aws-supports-agent-plugins-an-open-standard-for-portable-agent-extensions ; OpenAI forum thread (Aug 2026 date)
- Changelog: https://raw.githubusercontent.com/anthropics/claude-code/main/CHANGELOG.md (422 versions; line-mapped)
- Version dates: npm registry https://registry.npmjs.org/@anthropic-ai/claude-code (`time` field; dist-tags latest=2.1.302, stable=2.1.292)
- Plugins launch corroboration: news.ycombinator.com/item?id=45530150 ; anthropic.com/news/claude-code-plugins
