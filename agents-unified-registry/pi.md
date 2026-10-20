# Pi (coding agent) — Extensibility Research

Researched 2026-10-16. Input for the unified-registry project (Claude Code / Codex / OpenCode / Pi).

## 1. Identity (verified)

- **Pi** is a minimal, terminal-first, open-source coding-agent CLI by **Mario Zechner** (`badlogic`, creator of libGDX), written in TypeScript on Node.js (>= 22.19).
- Original repo: `github.com/badlogic/pi-mono` (redirects now). **Current repo: `github.com/earendil-works/pi`** (renamed from `earendil-works/pi-mono` at v0.77.0, 2026-05-28).
- On **2026-04-08** Zechner announced he joined the company **Earendil** ("I've sold out" post) and took pi with him; npm scope migrated from `@mariozechner/*` to **`@earendil-works/*`** on **2026-05-07** (first `@earendil-works/pi-coding-agent` publish = 0.74.0). **Armin Ronacher (`mitsuhiko`) is a co-maintainer** (npm maintainers list, many changelog PRs).
- CLI package: **`@earendil-works/pi-coding-agent`** (current latest **1.3.0**, 2026-10-15). Install: `npm install -g --ignore-scripts @earendil-works/pi-coding-agent`, or `curl -fsSL https://pi.dev/install.sh | sh`, or Nix (`nix run github:earendil-works/pi/stable`).
- Monorepo packages (`packages/`): `ai` (pi-ai, unified multi-provider LLM API), `agent` (pi-agent-core), `tui` (pi-tui), `coding-agent` (the CLI), `codemode` (QuickJS sandbox), `mcp`, `durable`, `chord`, `env`, `evals`, `telemetry`. Docs: **https://pi.dev/docs/latest**. Gallery: **https://pi.dev/packages**.
- NOT Inflection's Pi chatbot, NOT Raspberry Pi. Confirmed via mariozechner.at blog post (2025-11-30), pi.dev, npm registry, and the repo itself.

Key concepts:
- **Agent dir** = `~/.pi/agent/` by default; overridable via `PI_CODING_AGENT_DIR` env var or SDK `agentDir`.
- **Project trust**: resources under a project's `.pi/` only load after the user grants trust (`defaultProjectTrust: ask|always|never`). `.pi/mcp.json`, `.pi/settings.json`, `.pi/extensions|skills|prompts|themes`, `.pi/SYSTEM.md` are trust-gated. `AGENTS.md` context files and `.agents/skills/` discovery are **not** trust-gated (verified in `package-manager.ts` — the `.agents/skills` loop sits outside the `projectTrusted` branch).
- No permission system / no sandbox for tool calls by default ("YOLO mode"); containerization recommended; project trust only gates which *resources* load.

## 2. Summary table — surface × manifest × path × scope × install × distribution

| Surface | Manifest / format | Global path (user) | Project path | Install / registration | Distribution |
|---|---|---|---|---|---|
| Skills | `SKILL.md` + YAML frontmatter (Agent Skills spec) | `~/.pi/agent/skills/` and `~/.agents/skills/` | `.pi/skills/` (trust-gated) and `.agents/skills/` (+ ancestors to git root) | file drop; `pi install npm:pkg-with-skills`; `/skill:name` to invoke | npm / git / local (as part of Pi package); anthropics/skills works |
| Extensions (tools, commands, hooks, providers) | `.ts`/`.js` module, default-export factory `(pi: ExtensionAPI) => ...` (no manifest) | `~/.pi/agent/extensions/` | `.pi/extensions/` (trust-gated) | file drop; `pi -e ./ext.ts` (one-off); `pi install npm:@scope/pkg`; settings `extensions: []` | npm / git / local file |
| MCP servers | `mcp.json` (`mcpServers` object) | `~/.pi/agent/mcp.json` | `.pi/mcp.json` (trust-gated; can override user entry) | `pi mcp add <name> ... -- cmd args` (`--local` for project); file edit + `/reload` | config entry; npx-style stdio commands or HTTP URLs |
| Prompt templates | `.md` + frontmatter (`description`, `argument-hint`) | `~/.pi/agent/prompts/` | `.pi/prompts/` (trust-gated) | file drop; filename → `/command` | npm / git / local (Pi package) |
| Themes | JSON theme file (`name`, `appearance`, `vars`, `colors`, `export`) | `~/.pi/agent/themes/` (filename must = theme name) | `.pi/themes/` (trust-gated) | file drop; select via `/settings` → `theme` or `--use-theme` | npm / git / local (Pi package) |
| Pi packages (bundle) | `package.json` + optional `pi` key (`extensions`, `skills`, `prompts`, `themes` arrays) + keyword `pi-package` | installed under `~/.pi/agent/npm/` (npm src); entries in `~/.pi/agent/settings.json` | entries in `.pi/settings.json` (`pi install --local`) | `pi install npm:@scope/pkg@1.0.0` / `git:github.com/o/r@ref` / `./path`; `pi list`, `pi remove`, `pi update` | **npm is the registry**; git URL; local path; gallery pi.dev/packages indexes npm |
| Context files (instructions) | `AGENTS.md` / `CLAUDE.md` / `AGENTS.override.md` (plain markdown) | `~/.pi/agent/AGENTS.md` | `AGENTS.md` in cwd **and all ancestor dirs** (no trust needed) | file drop; auto-injected at bottom of system prompt | repo / manual |
| System prompt override | `SYSTEM.md` / `APPEND_SYSTEM.md` | `~/.pi/agent/SYSTEM.md`, `~/.pi/agent/APPEND_SYSTEM.md` | `.pi/SYSTEM.md`, `.pi/APPEND_SYSTEM.md` (trust-gated; project wins) | file drop | repo / manual |
| Custom subagents / personas | **example-level only**: `.md` + frontmatter `name`, `description`, `tools: a, b`, `model` | `~/.pi/agent/agents/*.md` | `.pi/agents/*.md` | install the `subagent` example extension (`packages/coding-agent/examples/extensions/subagent/`) | example in repo; symlink install per its README |
| Models / providers | `models.json` (`providers.<id>`.baseUrl/api/apiKey/headers/models) | `~/.pi/agent/models.json` (+ `auth.json` for `/login` OAuth) | none (global only) | file edit; `/login`; env vars (`ANTHROPIC_API_KEY` etc.) | manual / OAuth |
| Settings | `settings.json` (`$schema: https://pi.dev/schemas/settings.schema.json`) | `~/.pi/agent/settings.json` | `.pi/settings.json` (trust-gated) | `pi config` (interactive), `/settings` in-session | manual |
| Keybindings | `keybindings.json` | `~/.pi/agent/keybindings.json` | none | file drop; schema `https://pi.dev/schemas/keybindings.schema.json` | manual |

## 3. Surface details

### 3.1 Skills (implements the Agent Skills spec)
- Format: directory with **`SKILL.md`** (YAML frontmatter + markdown body), plus optional `scripts/`, `references/`, `assets/`. Standalone `.md` skills still accepted in pi-native dirs; `SKILL.md` dir is the portable form.
- Frontmatter fields (Agent Skills spec, agentskills.io — same as Anthropic's): `name`, `description`, `license`, `compatibility`, `metadata`, `allowed-tools` (experimental), `disable-model-invocation`. Limits: name ≤ 64 chars `[a-z0-9-]`; description ≤ 1024 chars. Name need not match dir (no warning in Pi).
- Discovery: recursive; a directory containing `SKILL.md` is a skill root (no recursion below it). `.gitignore`/`.ignore`/`.fdignore` respected. Root `README.md`/`AGENTS.md` inside skill dirs not treated as skills.
- Locations (verified in `packages/coding-agent/src/core/package-manager.ts`, `SkillDiscoveryMode = "pi" | "agents"`):
  - user: `~/.pi/agent/skills/` (mode "pi"), `~/.agents/skills/` (mode "agents")
  - project: `.pi/skills/` (mode "pi", trust-gated), `.agents/skills/` from cwd through ancestors up to git repo root (mode "agents", **not trust-gated**)
  - plus package `skills/` dirs and `--skill` CLI path, `skills` settings array
- Loading: name+description+path listed in system prompt; model lazily reads `SKILL.md` via the read tool (progressive disclosure, like Claude Code). Force with `/skill:<name> [args]` (args appended as a user request). `enableSkillCommands: true|false` setting. `/reload` after edits. Flags: `--no-skills` / `-ns`.
- Collisions: first-discovered skill wins + warning; precedence is **project-first** (`cwd/.pi` before `~/.pi/agent`, since 0.55.0), CLI paths above discovered resources.
- Filters: settings `skills: []` arrays support omit (all), `[]` (none), `!glob` exclude, `+path` include, `-path` exclude.
- History: 0.19.0 (2025-12-12) introduced skills **and at the time also read `~/.claude/skills/*/SKILL.md` and `~/.codex/skills/`**; current source only auto-discovers "pi" and "agents" locations — the `.claude`/`.codex` readers were dropped somewhere before the `.agents/skills` standard landed (0.54.0, 2026-02-19). UNVERIFIED exactly which release dropped them.
- Collections: `github.com/anthropics/skills` cited in official docs as working; `github.com/badlogic/pi-skills`.

### 3.2 Extensions (the code surface: tools, commands, hooks, providers)
- TypeScript/JS files loaded **in-process** with full OS permissions via `jiti` (no build step). File, or subdir with `index.ts`/`index.js` (+ `package.json` for deps).
- Locations: `~/.pi/agent/extensions/`, `.pi/extensions/` (trust), package `extensions/`, or one-off `pi --extension ./hello.ts` / `pi -e <source>`; types in `packages/coding-agent/src/core/extensions/types.ts`.
- Shape: `export default function (pi: ExtensionAPI) { ... }`; may be async (Pi awaits before startup).
- API (integration points): `pi.registerTool()` (TypeBox schema, `execute()`, exposure `direct|model-only|codemode|deferred|hidden`, `namespace`, `annotations`, `prepareLoadout`), `pi.registerCommand()` (`/name`), `pi.registerShortcut()`, `pi.registerFlag()`, `pi.registerProvider()`, `pi.registerMcpServer(name, config)` (per-session, file config wins), `pi.registerVirtualModel()` (per-request model routing), `pi.registerToolRenderer()`, `pi.on()` events (`session_start`, `session_shutdown`, `before_agent_start`, `input`, `message_end`, `tool_call`, `tool_result`, `turn_end`, `agent_before_settle`, `agent_settled`, `user_bash`, `context`, `provider_stream_event`, ...), `pi.appendEntry()` (durable non-context state), `pi.sendUserMessage()`/`pi.sendMessage()`, `pi.getActiveTools()/setActiveTools()/getAllTools()`, `pi.events` (ext-to-ext), `pi.getCommands()`.
- Host packages (`@earendil-works/pi-ai`, `pi-agent-core`, `pi-coding-agent`, `pi-tui`, `typebox`) must be `peerDependencies: {"*": "*"}`, never bundled.
- Built-in extensions (replaceable): `builtin:mcp`, `builtin:llama.cpp`, `builtin:codemode`, `builtin:tool-search`; disable via `"extensions": ["-builtin:mcp"]`, `--no-mcp`, or `--no-extensions` / `-ne`. An extension registering a colliding name (e.g. `/mcp`) replaces the built-in.
- History: 0.35.0 (2026-01-05) unified the earlier separate **hooks** and **custom tools** systems into "extensions" and renamed "slash commands" → "prompt templates". There is no standalone hooks-file surface; hooks = extension event handlers.
- Examples shipped in repo: `packages/coding-agent/examples/extensions/` (hello, todo, commands, subagent, claude-rules, custom-provider-anthropic, custom-provider-gitlab-duo, doom-overlay, ...).

### 3.3 MCP client support
- Yes — since **0.99.0 (2026-09-29)** as built-in extension `builtin:mcp`. Notable reversal: the 2025-11-30 blog said "pi does not and will not support MCP" (then: use `mcporter` to wrap MCP servers as CLIs).
- Config: `mcpServers` object in `~/.pi/agent/mcp.json` (user) and `.pi/mcp.json` (project, trust-gated). Entry fields: stdio → `command`, `args`, `env`, `cwd`; HTTP → `url`, `headers`, `oauth` (`clientId`, `clientSecret`, `callbackPort`, `callbackUrl`, `scope`, `clientName`, `clientRegistration: "cimd"`, `authServerMetadataUrl`); plus `timeout`, `enabled`, `exposure`, `toolExposure`, `description`, `type: stdio|http|streamable-http`. `env`/`headers` values support `${VAR}` and `!command`. SSE rejected.
- Tools are named `mcp__<server>__<tool>` (same convention as Claude Code). Project entry with same name replaces user entry; a project entry with no `command`/`url` only overrides `enabled`/`exposure`/`toolExposure`.
- Exposure model (Pi-specific): `codemode` (default; reachable only from model-written scripts via `searchTools()`), `deferred` (via `tool_search`), `direct` (declared to model), `hidden`. Per-tool overrides via `toolExposure` patterns.
- CLI: `pi mcp add <name> [--local] [--env K=V] [--url ...] [--bearer-token-env-var V] -- cmd args...`; `pi mcp remove|list|login|logout`. In-session: `/mcp`, `/mcp login|logout|reconnect <server>`, `/reload`.
- OAuth: RFC 9728/8414 discovery, tokens in `~/.pi/agent/mcp-auth.json`, auto-refresh; logs `~/.pi/agent/mcp.log` (5 MB rotation).
- Official migration notes: Claude/Cursor `mcp.json` entries "copy as-is"; Codex TOML → JSON; OpenCode `{env:NAME}` → `${NAME}`.
- Also exposes `list_mcp_resources`, `list_mcp_resource_templates`, `read_mcp_resource` tools.

### 3.4 Prompt templates (slash commands)
- Markdown file; frontmatter `description` (falls back to first non-empty line) and `argument-hint` (`<required>` / `[optional]`). **Filename = command**: `review.md` → `/review`.
- Locations: `~/.pi/agent/prompts/`, `.pi/prompts/` (trust), package `prompts/`, settings `prompts` array, `--prompt-template` CLI flag. Conventional dirs load only direct `.md` children.
- Args: `$1..$n`, `$@`/`$ARGUMENTS`, `${1:-default}`, `${@:N}`, `${@:N:L}`; shell-like quoting. Extension commands of the same name take priority; `input` event sees raw text first. Flags: `--no-prompt-templates` / `-np`.

### 3.5 Pi packages (the distribution unit)
- Manifest = **standard `package.json`**; optional `pi` key: `{"extensions": [...], "skills": [...], "prompts": [...], "themes": [...]}` (globs allowed, relative to package root). Without it, auto-discovery of conventional `extensions/`, `skills/`, `prompts/`, `themes/` dirs. Verified in `src/core/pi-manifest.ts` (`PiManifest { extensions?, skills?, prompts?, themes? }`).
- Keyword **`"pi-package"`** makes it discoverable in the gallery https://pi.dev/packages (5,361 packages as of 2026-10-16; extension/skill/theme/prompt types; indexes npm only). Optional `pi.image`, `pi.video` gallery previews.
- Commands: `pi install npm:@example/pkg@1.0.0` (version pinned) | `git:github.com/o/r@v1` (ref pinned; URL treated as git) | `./local-path` (loaded in place, not copied); `pi list`; `pi remove <source>`; `pi update [--extensions]` (also updates pi itself); `pi -e <source>` tries without saving; `pi config` toggles discovered resources/built-ins (Tab switches scope; `--local` starts in project scope).
- Scope/injection points: user installs recorded in `~/.pi/agent/settings.json`, project installs in `.pi/settings.json` (`--local`/`-l`). Identity: npm name / git URL (sans ref) / resolved absolute path. npm sources install under `~/.pi/agent/npm/`.
- Resource filtering per package (settings object form): omit → all, `[]` → none, `!pattern`/`+path`/`-path`; filters cannot expose undeclared resources. `autoload: false` turns a project package entry into a filtering delta.
- History: 0.50.0 (2026-01-26); local paths 0.5x later; `pi update` self-update (by mitsuhiko) April 2026.

### 3.6 Themes (TUI customization)
- JSON file; `$schema: https://pi.dev/schemas/theme.schema.json`; fields `name` (required; **must equal filename**), `appearance` (dark/light), `vars` (reusable colors), `colors` (required; ~50 tokens incl. `md*` markdown, `toolDiff*`, `syntax*`, `thinking*`), `export` (HTML export colors). Strict — unknown keys rejected.
- Locations: `~/.pi/agent/themes/`, `.pi/themes/` (trust), package `themes/`, `themes` settings array, `--theme`/`--use-theme` flags. Selection: `/settings` → `theme` setting (e.g. `"dark"`, `"light/dark"`); built-ins `system`/`dark`/`light`.
- Deeper TUI customization (custom components, renderers, header/footer/editor widgets) via extension `ctx.ui.*` — see docs `tui.md`, `rpc-extension-ui.md`.

### 3.7 Context files & system prompt
- Context files (instructions): names `AGENTS.md`/`AGENTS.MD`/`CLAUDE.md`/`CLAUDE.MD` (+ same-dir replacement via `AGENTS.override.md`) accepted in the agent dir; project discovery walks cwd **and ancestors**; each found file applies in its dir and below; no trust required; injected at the bottom of the (minimal, <1000-token) system prompt. Full system-prompt replacement is supported: `~/.pi/agent/SYSTEM.md` / `APPEND_SYSTEM.md`, project `.pi/SYSTEM.md` / `.pi/APPEND_SYSTEM.md` (trust-gated, project wins).

### 3.8 Custom agents / personas (NOT a built-in surface)
- No built-in sub-agents, plan mode, or persona registry (deliberate design; blog + README: "users are encouraged to build or install what they need"; spawn `pi` via bash instead).
- De-facto standard = official **subagent example extension** (`packages/coding-agent/examples/extensions/subagent/`): agent definitions are markdown + YAML frontmatter `name`, `description`, `tools: read, grep, find, ls, bash` (comma list or YAML array), `model: claude-haiku-4-5`; stored at `~/.pi/agent/agents/*.md` (user) and `.pi/agents/*.md` (project, repo-controlled). The extension spawns separate `pi` processes with delegated system prompt + tool/model config. Workflow presets ship as prompt templates (`scout → planner → worker`).
- Notably this mirrors Claude Code's `.claude/agents/*.md` shape, but it is example-level, not core (UNVERIFIED whether any later release promoted it).

### 3.9 Models / providers / auth
- `~/.pi/agent/models.json` (`$schema: https://pi.dev/schemas/models.schema.json`): `providers.<id>` = `{ baseUrl, api ("openai-completions"|"anthropic"|...), apiKey ("$ENV"/"${ENV}"/literal/"!command"), headers, models: [{ id, input, inputLimits, promptCache, reasoning, samplingParams, samplingParamsByThinkingLevel }], modelOverrides }`. `modelOverrides` patches built-in models without replacing lists.
- Auth: `/login` → `~/.pi/agent/auth.json` (OAuth subscriptions incl. Claude Pro/Max, Codex, etc.); API keys via env vars in CI. Precedence: `--api-key` > `auth.json` > `models.json` `apiKey` > env/cloud creds.
- Custom provider protocols → extension `pi.registerProvider()` (examples: `custom-provider-anthropic`, `custom-provider-gitlab-duo`). Local GGUF via built-in `llama.cpp` router (`/llama`).
- Settings: `defaultProvider`, `defaultModel`, `defaultThinkingLevel` (off|minimal|low|medium|high|xhigh|max), `enabledModels`.

### 3.10 Settings / misc surfaces
- `~/.pi/agent/settings.json` + `.pi/settings.json` (project overrides user; resource lists combine). Notable keys: `packages`, `extensions`, `skills`, `prompts`, `themes`, `defaultTools` (`read`, `bash`, `powershell`, `edit`, `write`, `grep`, `find`, `ls`; `+name`/`-name`), `enableSkillCommands`, `theme`, `defaultProjectTrust`, `sessionDir`, `compaction.*`, `retry.*`, `enableInstallTelemetry`. `$schema: https://pi.dev/schemas/settings.schema.json`.
- **Codemode**: built-in `codemode` tool runs model-written JavaScript in a **QuickJS sandbox** that calls pi tools (`searchTools()`, `describeTool()`, `ALL_TOOLS`) — an alternative to registering tools directly; added 0.99.0 (2026-09-29), reworked 1.0.0.
- Automation surfaces beyond extensions: print mode (`pi -p`), JSON event stream, RPC mode, TypeScript SDK — a registry could drive pi headlessly.

## 4. Cross-compatibility (Claude Code / Codex / OpenCode)

| Artifact | Pi compatibility |
|---|---|
| Agent Skills / Claude skills | **High** — implements the same agentskills.io spec; anthropics/skills collection works; shared standard dirs `~/.agents/skills/` + `.agents/skills/` are a cross-agent convention Pi reads natively. (0.19.0 even read `~/.claude/skills/` and `~/.codex/skills/`, but current source does not — UNVERIFIED when dropped.) |
| AGENTS.md | **Native** (hierarchical, ancestors, agent-dir + project). `CLAUDE.md` accepted as agent-dir alternative name. |
| Claude Code plugins | **No** — no support for Claude plugin manifests/markets; equivalent = Pi packages (npm) or extensions. Community `claude-rules.ts` example bridges `.claude/rules/` into pi's system prompt. |
| Claude Code slash commands (`.claude/commands/*.md`) | **No direct import**; same artifact shape maps 1:1 to pi prompt templates (`prompts/*.md`, same `description`/`argument-hint` frontmatter concept). |
| Claude Code agents (`.claude/agents/*.md`) | **No core support**; subagent example uses near-identical markdown+frontmatter format in `.pi/agents/` / `~/.pi/agent/agents/`. |
| MCP servers | **Yes** — `mcp.json` near-identical to Claude's; docs say Claude/Cursor entries copy as-is; `mcp__server__tool` naming matches. |
| Hooks | **Different model** — Claude hook shell commands vs pi in-process extension events; a unified registry needs an adapter extension. |

## 5. Timeline (2025 → Oct 2026, all dates verified from npm registry + repo CHANGELOG.md)

| Date | Event |
|---|---|
| 2025-08-01 | First npm publish `@mariozechner/pi` 0.1.2 (313 versions through 2026-04-28) |
| 2025-11-12 | `@mariozechner/pi-coding-agent` first publish 0.6.2; pi-mono monorepo (pi-ai, pi-agent-core, pi-tui, pi-coding-agent) |
| 2025-11-30 | Blog "What I learned building an opinionated and minimal coding agent"; 4 tools, YOLO mode, "no MCP ever", Terminal-Bench 2.0 results days later |
| 2025-12-12 | **0.19.0 skills system** (then incl. `~/.claude/skills`, `~/.codex/skills` readers) |
| 2025-12-13 | 0.20.0 `SKILL.md` dir convention |
| 2025-12-19 | 0.24.0 subagent orchestration example |
| 2026-01-05 | **0.35.0 extensions system** (unifies hooks + custom tools; "slash commands" → "prompt templates") |
| 2026-01-26 | **0.50.0 Pi packages** (`pi install/remove/update/list`) |
| 2026-02-19 | 0.54.0 `.agents/skills/` default discovery (global `~/.agents/skills`, project ancestors) |
| 2026-02-24 | 0.55.0 project-first resource precedence |
| 2026-03-23 | 0.62.0 `sourceInfo` provenance on all resources |
| 2026-04-08 | Zechner joins **Earendil** ("I've sold out" post; Ronacher companion post) |
| 2026-05-07 | npm scope migration to **`@earendil-works/*`** (0.74.0 first earendil release; last `@mariozechner/pi-coding-agent` 0.73.1 same day) |
| 2026-05-28 | 0.77.0 repo renamed `pi-mono` → `pi` |
| 2026-09-29 | **0.99.0: MCP support** + codemode (QuickJS) + tool_search as built-in extensions — reverses "never MCP" |
| 2026-10-01 | **1.0.0** — fullscreen TUI default, leaner codemode |
| 2026-10-03 | 1.0.1 — `.pi/mcp.json` project overrides, MCP CIMD OAuth, Nix flake |
| 2026-10-12 | 1.2.0 — published `$schema` config schemas (settings/models/keybindings/themes) |
| 2026-10-15 | **1.3.0** (latest) |

## 6. Unified-registry integration points (concrete)

1. **npm is pi's registry.** Ship any artifact bundle as an npm package with keyword `pi-package` (+ optional `pi` manifest key) → discoverable in pi.dev/packages and installable everywhere via `pi install npm:<pkg>@<ver>`. A unified registry can mirror/publish to npm and get Pi support "for free".
2. **Agent Skills are directly portable**: drop a spec-compliant `SKILL.md` dir into `~/.agents/skills/` (user) or `.agents/skills/` (project) — pi's shared cross-agent location, no trust gate, no pi-specific manifest needed.
3. **Prompt templates** ≈ Claude commands: same `.md`+frontmatter shape; place in `~/.pi/agent/prompts/` or `.pi/prompts/`.
4. **MCP**: inject a `mcpServers` entry into `~/.pi/agent/mcp.json` or `.pi/mcp.json` (near-identical to Claude format), or `pi mcp add <name> -- cmd`.
5. **Extensions** replace plugins/hooks/tools: registry would generate a small TS extension (`export default (pi) => pi.registerTool/registerCommand/registerMcpServer...`) into `~/.pi/agent/extensions/` or ship it as a package.
6. **Per-repo pinning**: `.pi/settings.json` `packages` array is the project-lock mechanism (like `.mcp.json` / `.claude/settings.json`); trust-gated.
7. **Headless registration**: SDK/RPC/print modes allow a registry service to install/verify artifacts programmatically.

## 7. Sources (all accessed 2026-10-16)

- Repo: https://github.com/earendil-works/pi (README; formerly badlogic/pi-mono)
- Docs: https://pi.dev/docs/latest — pages: quickstart, skills, extensions, packages, mcp, configuration, settings, models, prompt-templates, themes (docs mirrored at `packages/coding-agent/docs/` in repo)
- CHANGELOG (versions/dates): https://raw.githubusercontent.com/earendil-works/pi/main/packages/coding-agent/CHANGELOG.md
- npm registry: https://registry.npmjs.org/@earendil-works/pi-coding-agent (created 2026-05-07; latest 1.3.0 2026-10-15); https://registry.npmjs.org/@mariozechner/pi (created 2025-08-01, last 0.70.6 2026-04-28); https://registry.npmjs.org/@mariozechner/pi-coding-agent (created 2025-11-12, last 0.73.1 2026-05-07)
- Blog: mariozechner.at/posts/2025-11-30-pi-coding-agent ("What I learned building an opinionated and minimal coding agent")
- Gallery: https://pi.dev/packages
- Source files read: `packages/coding-agent/src/core/package-manager.ts`, `src/core/resource-loader.ts`, `src/core/pi-manifest.ts`, `src/core/skills.ts`; examples `extensions/subagent/*`, `extensions/claude-rules.ts`
- Earendil move: Zechner "I've sold out" (2026-04-08, mariozechner.at) and Ronacher "Mario and Earendil" (lucumr.pocoo.org), via search results; Ronacher pi writeup lucumr.pocoo.org/2026/1/31/pi

### Uncertainty log (UNVERIFIED items)
- Exact release that dropped `~/.claude/skills` / `~/.codex/skills` reading (present 0.19.0, absent in current source).
- Whether project-level (non-agent-dir) `CLAUDE.md` files are accepted as context files — docs explicitly list `CLAUDE.md` only for the agent dir; project behavior follows `AGENTS.md` naming (likely same-name matching, but not doc-confirmed).
- Whether the subagent example format has been promoted to any core feature.
- Docs statement "Pi implements the Agent Skills specification" — the `allowed-tools` / `disable-model-invocation` fields are marked experimental in the spec; pi-side behavior beyond name/description routing is thin in docs.
