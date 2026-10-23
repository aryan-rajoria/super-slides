# Data model — MCP servers

Part of the [data-model series](../data-model.md) · matrix row: **MCP servers** in
[slide-4.md](../../slide-4.md). Versions studied: Claude Code v2.1.302 · Codex rust-v0.163.0 ·
OpenCode 2.0.x · Pi 1.3.0.

**Minimum verdict: COPY for Claude and Pi · TRANSLATE (mandatory) for Codex (JSON→TOML) and
OpenCode (JSON→different JSON shape).** The canonical entry is the Claude/Cursor
`mcpServers` JSON shape — Pi takes it verbatim per its own docs, and the agent-plugins
`mcp.json` uses the same closed variants.

## Minimum portable core

One server entry, exactly one of two variants:

```jsonc
// stdio
{ "command": "npx", "args": ["-y", "some-mcp"], "env": { "KEY": "value" } }
// streamable HTTP
{ "url": "https://mcp.example.com", "headers": { "Authorization": "Bearer ${API_TOKEN}" } }
```

Rules that make it portable:
- **No SSE** in the core — Pi rejects it outright.
- Secrets as environment-variable references (`${VAR}`), never literals — every harness has
  an expansion mechanism; none should receive the secret.
- No OAuth fields in the record — all four harnesses manage OAuth client-side
  (`claude mcp login` / `codex mcp login` / `opencode mcp auth` / `pi mcp login`).

## Per-harness materialization

### Claude Code — COPY
- Merge into `.mcp.json` at the project root (committed; needs one-time interactive
  approval — `enableAllProjectMcpServers` pre-trusts) or `~/.claude.json` user/local scope
  via `claude mcp add -s user|project|local` / `add-json`.
- Gotchas that shape the emit: entries **replace, never merge** (same-name drop wins);
  `managedMcpServers` outranks everything; `${VAR:-default}` expansion supported.

### Codex — TRANSLATE to TOML (mandatory)

| Canonical (JSON) | Codex `config.toml` |
|---|---|
| placement | `[mcp_servers.<id>]` section |
| `command` | `command` (string) |
| `args` | `args` (array) |
| `env` | `env` (table) |
| `url` | `url` |
| `headers` | `http_headers` (static) · `env_http_headers` (var names) · `http_headers_helper` (dynamic) |
| bearer token via env | `bearer_token_env_var` |
| — | `auth = "oauth"\|"chatgpt"` (client-managed) |

- Write via `codex mcp add <name> [--env K=V] -- <cmd>` or `--url` (writes the TOML), or edit
  `config.toml` directly. `.mcp.json` exists **only inside plugins** — there is no user-level
  JSON drop.
- Optional Codex-only overlay: `enabled`, `required`, `startup_timeout_sec`,
  `tool_timeout_sec`, `enabled_tools`, `disabled_tools`, and per-tool approval
  (`default_tools_approval_mode`, `tools.<tool>.approval_mode`) — the only per-tool approval
  model of the four; emit only when the record declares approval needs.

### OpenCode — TRANSLATE to its JSON dialect (mandatory)
- Into `opencode.json` (JSONC) under **`mcp.servers.<name>` (v2) or `mcp.<name>` (v1)** —
  the emitter must sniff which install it is writing to.

| Canonical | OpenCode entry |
|---|---|
| stdio `command` + `args` | `command: ["npx", "-y", "some-mcp"]` — **a single array**, not command+args |
| `env` | `environment: { "KEY": "value" }` |
| — | `type: "local"` (stdio) / `type: "remote"` (HTTP) |
| `url` | `url` |
| `headers` | `headers` (values may use `{env:VAR}` substitution — not `${VAR}`) |
| OAuth | `oauth: { clientId, clientSecret, scope }` with `{env:…}` refs |

- Also per-entry: `enabled`, `cwd`, `timeout`. Register via
  `opencode mcp add <name> --scope project|user|system [--command|--url]`.
- Placement hazard: **global config overrides project** — a user-level deny of the same
  server cannot be re-enabled from the repo.

### Pi — COPY (verbatim)
- Merge the canonical entry into `~/.pi/agent/mcp.json` (user) or `.pi/mcp.json` (project,
  trust-gated). Official docs: Claude/Cursor `mcpServers` entries are copied as-is.
  `${VAR}` and `!command` expansion in env/headers values.
- Same-name project entry **replaces** the user entry (or, with no `command`/`url`, just
  overrides `enabled`/`exposure`).
- Optional Pi-only overlay: `exposure` / `toolExposure` — `codemode` (default) · `deferred`
  · `direct` · `hidden` — Pi's tool-visibility model; emit only if the record wants it.

## Registry notes

- The same canonical entry also drops into any plugin bundle unchanged: Claude plugin
  `.mcp.json`, Codex plugin `.mcp.json`/`mcp.json` (agent-plugins schema, closed stdio/http
  variants, `${PLUGIN_ROOT}`/`${PLUGIN_DATA}` placeholders) — see
  [data-model-plugins.md](data-model-plugins.md).
- Tool naming convention matches everywhere except OpenCode: `mcp__<server>__<tool>`
  (Claude, Pi) vs `mcp.<server>.<tool>` (OpenCode) — matters if a record cross-references
  MCP tools in permission rules or agent tool lists.

## Original specification (reference)

Canonical `mcpServers` entry — the Claude/Cursor shape Pi copies verbatim; the agent-plugins
`mcp.json` dialect tightens it (`command` must be a single token; non-loopback URLs MUST be
HTTPS; no OAuth/credential fields in v1). Tier: `core` = in the minimum above · `extras` =
harness overlay:

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| stdio variant | one of | `command` · `args` · `env` | core |
| http variant | one of | `url` · `headers` (values as `${VAR}` refs, never literals) | core |

Source: agent-plugins.org/specification + pi.dev/docs/latest (cross-spec-standards.md §2.2 · pi.md §3.3).

Claude Code — scopes, gates, transports (all extras beyond the core entry):

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| scopes / precedence | — | local `~/.claude.json` `projects.<path>.mcpServers` > project `.mcp.json` (gates `enableAllProjectMcpServers`, `enabled`/`disabledMcpjsonServers`) > user top-level > plugin > claude.ai connectors; `managedMcpServers` outranks all; whole-entry replacement, never merge | extras |
| transports + expansion | — | `http` (alias `streamable-http`) · `sse` · `ws` · `stdio`; `${VAR}` and `${VAR:-default}` expansion | extras |

Source: code.claude.com/docs/en/mcp (claude-code.md §7).

Codex `[mcp_servers.<id>]` — full key list (core = carries a core field):

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `command` · `args` · `env` | one of | stdio side | core |
| `url` · `http_headers` (static) · `env_http_headers` (var names) · `http_headers_helper` (dynamic) · `auth` (`"oauth"\|"chatgpt"`) · `bearer_token_env_var` | one of | http side + client-managed auth | core |
| `env_vars` · `cwd` · `enabled` · `required` · `scopes` · `experimental_environment` (`local\|remote`) | no | env var names or `{name, source="remote"}`; lifecycle/visibility; plus `startup_timeout_sec`/`_ms` (10) and `tool_timeout_sec` (60) | extras |
| `enabled_tools` · `disabled_tools` · `default_tools_approval_mode` · `tools.<tool>.approval_mode` · `tools.<tool>.output_token_limit` | no | per-tool gating — the only per-tool approval model of the four | extras |

Source: learn.chatgpt.com/docs/extend/mcp (codex.md §7).

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| OpenCode entry (v2 `mcp.servers.<n>` / v1 `mcp.<n>`; `--scope project\|user\|system` on `mcp add`) | one of | `type: "local"` + `command` as a **single array** `["npx","-y","pkg"]` + `environment`; `type: "remote"` + `url` + `headers` — header values use `{env:VAR}` substitution, not `${VAR}` | core |
| OpenCode extras | no | `oauth{clientId, clientSecret, scope}` with `{env:…}` refs · `enabled` · `cwd` · `timeout` | extras |
| Pi stdio/http entry | one of | `command` · `args` · `env` · `cwd`; `url` · `headers` — copied as-is; `${VAR}` and `!command` values; SSE rejected | core |
| Pi extras | no | `oauth{clientId, clientSecret, callbackPort, callbackUrl, scope, clientName, clientRegistration, authServerMetadataUrl}` · `timeout` · `enabled` · `description` · `type: stdio\|http\|streamable-http` · `exposure`/`toolExposure`: `codemode` (default) · `deferred` · `direct` · `hidden` | extras |

Source: opencode.md §8 · pi.md §3.3.
