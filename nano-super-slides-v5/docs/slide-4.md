# Slide 4 — Translation Matrix: issues per surface × harness

Source of truth: `content/content-{claude,codex,opencode,pi}.json` (the same files the deck
is built from — verified against the `agents-unified-registry/` corpus, 2026-10-16).
Each cell states the **issue** the registry must handle; the verdict tag in *(parens)*
matches the chip on the slide. Versions studied: Claude Code v2.1.302 · Codex
rust-v0.163.0 · OpenCode 2.0.x · Pi 1.3.0.

Verdicts: **COPY-AS-IS** drop in unchanged · **TRANSLATE** registry converts format ·
**OVERLAY** portable core + harness-only extra fields · **NO SURFACE** no native target.

## The matrix

| Surface | Claude Code | Codex | OpenCode | Pi |
|---|---|---|---|---|
| **Skills** | Spec-native, but Claude-only frontmatter extras (`when_to_use`, `context: fork`, hooks) must be emitted as overlay fields; skill dirs are unversioned file-drops *(OVERLAY)* | Needs Codex-only `agents/openai.yaml` sidecar; enabling via `[[skills.config]]` requires restart; `$skill-installer` is install-once with no update path *(OVERLAY)* | Needs `metadata.opencode/*` keys; three skill dirs discovered with "later wins" precedence. Upside: the v2 HTTP catalog caches per version — bump = update, the most registry-ready surface of all four *(OVERLAY)* | Drops into `~/.agents/skills` **un-gated** (verified trust hole); no versioning unless shipped inside an npm pi-package *(COPY-AS-IS)* |
| **Slash commands** | Legacy surface, merged into skills — emit as a skill instead; subdirs namespace as `/db:migrate` *(COPY-AS-IS)* | **Deprecated** and user-only (`~/.codex/prompts`, invoked `/prompts:<n>`, restart required) — emit but warn *(COPY-AS-IS)* | Straight copy; nested dirs namespace the command; frontmatter extras (`agent`, `subtask`, `model`) are OpenCode-only *(COPY-AS-IS)* | Filename **is** the command (`review.md` → `/review`); `.pi/prompts` trust-gated; standalone files never update *(COPY-AS-IS)* |
| **Subagents** | The canonical md + frontmatter shape other harnesses translate **from**; no versioning outside plugins *(COPY-AS-IS)* | md frontmatter must become **TOML** (`name`, `description`, `developer_instructions`); project layer stays inert until trusted; agents cannot raise the parent's sandbox *(TRANSLATE)* | Different frontmatter dialect (`mode`, `permission` maps); id = filename; v1/v2 config split to sniff *(TRANSLATE)* | No core subagents — official **example extension** only, promotion UNVERIFIED; emitting one means shipping extension code (review tier) *(NO SURFACE)* |
| **Hooks** | Native hooks JSON with 30 events and 5 handler types, but all scopes **merge** — install must merge into settings, never blind-drop *(COPY-AS-IS)* | Same Claude JSON shape (12 events, honors `CLAUDE_PLUGIN_ROOT`), **but** project layers and plugin hooks stay inert until trust/explicit user review *(COPY-AS-IS)* | No hooks file at all — hooks must be **codegen'd as a TS plugin**; the v1→v2 event rewrite broke compatibility, so emitters must sniff versions *(TRANSLATE)* | No hooks file — codegen a TS extension calling `pi.on()`; runs in-process with full OS access (review tier) *(TRANSLATE)* |
| **Plugins** | Registry bundle must be re-wrapped as `.claude-plugin/plugin.json` inside a **marketplace git repo** (7 source kinds); version lives in manifest + marketplace entry + git sha *(TRANSLATE)* | Portable agent-plugins `plugin.json` + `.codex-plugin/` overlay + a `marketplace.json` catalog entry; the IDE extension supports **none** of this *(OVERLAY)* | Must publish as an **npm TS plugin package**; no official marketplace (aggregators only); v1 plugins incompatible with v2 *(TRANSLATE)* | Must republish as an **npm package** (keyword `pi-package` + `pi` key globs) — npm IS Pi's registry; mirror content-only to kill postinstall risk *(TRANSLATE)* |
| **MCP servers** | `mcpServers` JSON drops in, but scoped: project `.mcp.json` needs interactive approval, entries **replace rather than merge**, and `managedMcpServers` outranks everything *(COPY-AS-IS)* | JSON must become `[mcp_servers.<id>]` **TOML** in config.toml; per-tool `approval_mode` is Codex-only config *(TRANSLATE)* | Config JSON, but v2 `mcp.servers.<n>` vs v1 `mcp.<n>` — emitters must sniff; global config **overrides** project *(TRANSLATE)* | The one true copy-as-is: Claude/Cursor `mcp.json` entries work verbatim per official docs. SSE rejected; the exposure model (`codemode`/`deferred`/…) is Pi-only *(COPY-AS-IS)* |
| **LSP servers** | Exists **only inside plugins** — a bare `.lsp.json` must be wrapped in a plugin bundle; every entry needs `extensionToLanguage` *(TRANSLATE)* | Absent from the docs entirely — record marks unsupported *(NO SURFACE)* | `lsp` config key exists but its schema is undocumented; just the key + two plugin events — nothing emittable *(NO SURFACE)* | No LSP integration as of 1.3.0 *(NO SURFACE)* |
| **Custom tools** | SDK-code-only (in-process MCP server via Agent SDK) — no file drop, no manifest, nothing to pin *(NO SURFACE)* | Only `[tools]`/`[tool_suggest]` toggles — no registration surface *(NO SURFACE)* | Tool must be codegen'd as TS `tool({ description, args: Zod, execute })` inside a plugin; can override built-ins *(TRANSLATE)* | Richest API (`pi.registerTool`, TypeBox schema, exposure modes) but still codegen-to-TS; runs in-process (review tier) *(TRANSLATE)* |
| **Status line** | Script + one settings key; JSON-on-stdin contract; replacing the script is the update *(COPY-AS-IS)* | Only `[tui]` notification keys — no statusline surface *(NO SURFACE)* | No statusline documented — themes (`.opencode/themes/*.json`) are the adjacent JSON drop *(NO SURFACE)* | Strict theme JSON where **name must equal the filename**; deeper TUI widgets need extension code (`ctx.ui.*`) *(OVERLAY)* |
| **Exec policy** | Nothing to install — the record's required-permissions must become settings allow-rules; `auto`/`bypassPermissions` barred from project/local; managed keys are admin-only *(OVERLAY)* | Starlark `.rules` files drop verbatim; the record must declare `sandbox_mode` + approval needs — richest policy surface of the four *(COPY-AS-IS)* | `permissions[] {action, resource, effect}` emitted into config; **global overrides project**; org `.well-known` can push policies *(OVERLAY)* | No permission system or sandbox (YOLO) — nothing declarative to emit; the record carries trust/risk metadata instead *(NO SURFACE)* |

## Auto-update — who can update what

The green dot on slide 24. Only **bundles** self-update; every standalone artifact is a
manual file drop, which is exactly what `agentreg.lock` exists to fix.

| Harness | Self-updates | Mechanism | Everything else |
|---|---|---|---|
| Claude Code | plugins (opt-in per marketplace, v2.0.70) | marketplace refresh | skills · commands · agents · hooks · MCP: manual drops/edits |
| Codex | plugins only | `codex plugin marketplace upgrade` | skills · prompts · agents · hooks · MCP · policy: manual edits |
| OpenCode | skills (per-version catalog cache) · plugins (+ hooks/tools codegen'd as plugins) | version bump in `index.json` · `opencode plugin update` | commands · agents · MCP · policy: manual edits |
| Pi | anything shipped in an npm pi-package (extensions · skills · prompts · themes) | `pi update [--extensions]` | standalone skill/prompt/theme drops · MCP: manual |

## The frictions that shape the registry

1. **One format is not enough.** MCP alone needs JSON (Claude/OpenCode/Pi) *and* TOML
   (Codex); agents need md (Claude/OpenCode/Pi-example) *and* TOML (Codex). The emitter,
   not the publisher, owns the conversion.
2. **Hooks and custom tools are codegen surfaces.** OpenCode and Pi have no hooks file —
   both need generated TS. Claude hides tools in SDK code, Codex has neither.
3. **Plugins are per-harness re-wraps.** Same bundle becomes a `.claude-plugin/`
   marketplace repo, a `plugin.json` + `.codex-plugin/` overlay, an npm TS package
   (OpenCode), and an npm `pi-package` (Pi).
4. **Trust gating differs in kind.** Codex gates project layers + plugin hooks behind
   trust/review; OpenCode lets global config override project; Pi gates `.pi/` but loads
   `~/.agents/skills` un-gated; Claude has unoverridable managed keys.
5. **`NO SURFACE` is real data.** LSP (Codex, OpenCode, Pi), statusline (Codex,
   OpenCode), custom tools (Claude, Codex), subagents (Pi) — the record must say
   `supported = false`, never silently break.
