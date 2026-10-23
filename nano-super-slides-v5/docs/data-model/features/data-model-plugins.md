# Data model — Plugins (bundles)

Part of the [data-model series](../data-model.md) · matrix row: **Plugins** in
[slide-4.md](../../slide-4.md). Versions studied: Claude Code v2.1.302 · Codex rust-v0.163.0 ·
OpenCode 2.0.x · Pi 1.3.0.

**Minimum verdict: OVERLAY for Codex · TRANSLATE (mandatory re-wrap) for Claude, OpenCode,
Pi.** This is the one row where nothing copies everywhere: every harness has its own bundle
format, and the same components get re-packaged four ways. The registry's canonical bundle is
the vendor-neutral **agent-plugins 1.0.0 layout** — consumed natively only by Codex of our
four, but its payloads (skills, `mcp.json`) are the two universal formats.

## Minimum portable core (canonical bundle = agent-plugins 1.0.0)

```
my-plugin/
├── plugin.json     # REQUIRED at root; closed 9-field set
├── skills/<n>/SKILL.md
├── mcp.json        # { "$schema", "mcpServers": { … } } — stdio/http closed variants
└── <reverse-dns>/  # client extension dirs (e.g. com.openai/) — client-defined
```

`plugin.json` minimum: `$schema` (exact URL
`https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`) and `name` (1–64 chars,
`[a-z0-9-.]`); optionally `version` (type-checked only — **the registry supplies real
semver**), `description`, `author`, `homepage`, `repository`, `license`, `keywords[]`,
`extensions` (reverse-DNS map). Unknown top-level fields are warned-and-ignored; other
violations are fatal. Spec safety rules: all paths resolve inside the plugin root (symlink
escapes rejected); graded failure per component.

The spec covers **only skills + MCP** as component types (commands/hooks/agents/rules/LSP
are explicitly excluded from v1) and **no distribution model** — marketplaces are
client-owned. That's why every harness below adds its own wrapper.

## Per-harness materialization

### Codex — OVERLAY (the one native consumer)
- Portable `plugin.json` **as-is**, plus a Codex overlay: `.codex-plugin/plugin.json`
  (legacy location) or `extensions.com.openai` inside the root manifest — `interface.*`
  (branding), `hooks` (path to `hooks/hooks.json`), `onboardingSkill`.
- Plus a catalog entry in `.agents/plugins/marketplace.json` (repo) or
  `~/.agents/plugins/marketplace.json` (personal):
  `{ "plugins": [ { "name", "source": {…}, "policy": {"installation": "AVAILABLE|INSTALLED_BY_DEFAULT|NOT_AVAILABLE", …}, "category" } ] }`
  with `source` kinds `local`+`path` · `url` · `git-subdir`+`url`/`path`/`ref`/`sha` ·
  `npm`+`package`/`version`/`registry`.
- Enable: `codex plugin marketplace add <src>` then `[plugins."name@mp"] enabled = true`
  or the `/plugins` TUI. `codex plugin marketplace upgrade` is Codex's only auto-updater.
  **The IDE extension supports none of this** (CLI/desktop only). Plugin hooks stay skipped
  until user-reviewed.

### Claude Code — TRANSLATE (re-wrap into `.claude-plugin/` + marketplace repo)
- Emit `.claude-plugin/plugin.json` (same filename, **different schema/location**: only
  `name` required; richer fields — `version`, `dependencies[]`, `userConfig{}`, component
  path overrides) with component dirs: `skills/`, `commands/`, `agents/`,
  `hooks/hooks.json`, `output-styles/`, `.mcp.json`, `.lsp.json`, `bin/`.
- Distribution requires a **marketplace git repo**: `.claude-plugin/marketplace.json`
  (`name`, `owner`, `plugins[]` entries with `source` of 7 kinds: relative · github · url ·
  git-subdir · npm (scripts never run) · archive (sha256) · command). Installs cache under
  `~/.claude/plugins/cache/<marketplace>/<plugin>/<version>/`.
- Install: `claude plugin marketplace add <owner/repo>` + `claude plugin install <n>@<mp>`.
  Version resolution: manifest `version` → marketplace entry → commit sha.
- The registry's whole bundle → one plugin per component type is NOT needed: one Claude
  plugin can carry skills + agents + hooks + MCP at once.

### OpenCode — TRANSLATE (decompose; bundle becomes an npm TS plugin package)
- No bundle format at all. The registry **publishes an npm TypeScript package** (v2 plugin
  API: `export default Plugin.define({ id, setup(ctx) { … } })` — v1's returned-object
  plugins do not run in v2) and installs via `opencode plugin add <pkg>@<version>`
  (npm / `git+URL` / local path).
- Components inside: hooks and custom tools become generated TS plugin code (see
  [data-model-hooks.md](data-model-hooks.md) / [data-model-custom-tools.md](data-model-custom-tools.md));
  skills become copy-drops or the HTTP catalog (see
  [data-model-skills.md](data-model-skills.md)); MCP becomes config entries.
- v1 plugins are incompatible with v2 — the emitter sniffs and pins per major. No official
  marketplace (community aggregators only).

### Pi — TRANSLATE (republish as npm pi-package)
- Emit a plain npm package with keyword **`pi-package`** and optional `pi` key declaring
  globs: `{ "extensions": [...], "skills": [...], "prompts": [...], "themes": [...] }`
  (auto-discovery of conventional dirs without it). npm IS Pi's registry — the gallery at
  pi.dev/packages indexes it.
- Install: `pi install npm:<pkg>@<ver>` (user; recorded in `~/.pi/agent/settings.json`) or
  `--local` (project lockfile `.pi/settings.json`). `pi update [--extensions]` updates
  anything shipped this way.
- The registry mirrors **content-only** packages (no lifecycle scripts, deps vendored) to
  kill the npm postinstall-script risk.

## Registry notes

- One record → four wrappings: portable `plugin.json` + Codex overlay + catalog entry ·
  `.claude-plugin/` + marketplace repo · npm TS package · npm `pi-package`. The components
  inside never change — only the wrapping does (matrix friction #3).
- Only bundles self-update (per-marketplace opt-in on Claude, `marketplace upgrade` on Codex,
  version-bump catalog on OpenCode, `pi update`). Everything standalone is a manual drop —
  see [data-model.md](../data-model.md#version-and-update).

## Original specification (reference)

agent-plugins 1.0.0 `plugin.json` — closed set; unknown top-level fields = warn + ignore (MUST
NOT assign semantics), other violations fatal. Tier: `core` = in the minimum bundle above ·
`spec` = in-spec, not needed for the minimum · `extras` = harness wrapper:

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `$schema` · `name` | yes | exact URL `https://agent-plugins.org/schemas/1.0.0/plugin.schema.json`; `name` 1–64 chars `a-z 0-9 - .`, alphanumeric ends, no `--`/`..` | core |
| `version` | no | type-checked only — SemVer recommended, NOT enforced (the registry supplies real semver) | spec |
| `description` · `author{name,email,url}` · `homepage` · `repository` · `license` · `keywords[]` · `extensions` (reverse-DNS map) | no | descriptive metadata + the overlay channel; unimplemented namespaces ignored unvalidated | spec |
| safety rules | — | all paths resolve inside the plugin root (symlink escapes rejected); graded failure per component | spec |

Source: agent-plugins.org/specification (cross-spec-standards.md §2.2).

agent-plugins `mcp.json` — closed variants (`{$schema, mcpServers}` only; unknown or cross-variant fields invalidate the entry; non-loopback URLs MUST be HTTPS; no OAuth/credential fields in v1):

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| stdio / http variants | one of | stdio: `command` (single token) · `args` · `env` · `cwd`; http: `url` (required) · `headers` — clients must support ≥1 of stdio/streamable-http | core |
| `sse` variant · `${PLUGIN_ROOT}` / `${PLUGIN_DATA}` | no | sse defined in-spec but outside our core; placeholders expand in args/env-values/cwd only | spec |

Source: agent-plugins.org/specification (cross-spec-standards.md §2.2).

Claude `.claude-plugin/plugin.json` (only `name` required) + `marketplace.json` (all extras):

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `name` | yes | kebab-case — the only required manifest field | extras |
| `version` · `description` · `author` · `homepage` · `repository` · `license` · `keywords` · `displayName` · `icon` · `dependencies[]` · `userConfig{}` · `settings` | no | `version` pins until changed; deps `"name"`/`"name@marketplace"`/`{name, marketplace, version}`; `${user_config.KEY}` refs (only `agent`+`subagentStatusLine` apply in `settings`) | extras |
| component-path overrides | no | `skills` (adds) · `commands`/`agents`/`outputStyles` (replace) · `hooks`/`mcpServers`/`lspServers` (merge) | extras |
| mkt: `name` · `owner{name}` · `plugins[]` | yes | required trio; entry = `name`+`source` + optional `description`, `version`, `category`, `tags[]`, `strict` (default true)…; `renames{old→new}` append-only | extras |
| mkt: `source` | yes | 7 kinds — relative · github · url · git-subdir · npm (scripts never run) · archive (sha256) · command | extras |

Source: code.claude.com/docs/en/plugins (claude-code.md §8).

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| Codex `extensions.com.openai` (or legacy `.codex-plugin/plugin.json`) | no | `interface.*` branding · `hooks` (path; replaces default `hooks/hooks.json`) · `onboardingSkill` | extras |
| Codex `extensions["com.openai"].auth` | no | bundled MCP auth — `type: none\|oauth\|mixed\|api_key`; `headerScheme`+`headerName`; oauth `client.mode: provided\|dcr\|cimd` (no clientSecret in package) | extras |
| Codex `marketplace.json` + enable | no | `{name, interface.displayName, plugins[]{name, source{local\|url\|git-subdir\|npm}, policy{installation, authentication}, category}}`; `[plugins."name@mp"] enabled` + `[marketplaces.<name>]` | extras |
| OpenCode v2 plugin | no | `export default Plugin.define({ id, setup(ctx) { … } })`; config `plugins[]`: `"pkg"` · `"pkg@1.2.3"` · `"pkg@github:owner/repo"` · `{path}`; CLI add/list/check/update/remove | extras |
| Pi package | no | `package.json` keyword `pi-package`; `pi` key `{extensions[], skills[], prompts[], themes[]}` globs; `pi.image`/`pi.video`; installs recorded in `~/.pi/agent/settings.json` or `.pi/settings.json` | extras |

Source: codex.md §5 · opencode.md §7 · pi.md §3.5.
