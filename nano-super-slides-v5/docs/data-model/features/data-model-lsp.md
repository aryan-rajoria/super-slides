# Data model — LSP servers

Part of the [data-model series](../data-model.md) · matrix row: **LSP servers** in
[slide-4.md](../../slide-4.md). Versions studied: Claude Code v2.1.302 · Codex rust-v0.163.0 ·
OpenCode 2.0.x · Pi 1.3.0.

**Minimum verdict: TRANSLATE (wrap) for Claude Code · NO SURFACE for Codex, OpenCode, Pi.**
Language-server config is the sparsest row of the matrix: exactly one harness can install
one, and even there it cannot stand alone.

## Minimum portable core

A map of server name → launch config, where **every entry must declare
`extensionToLanguage`** (Claude's hard requirement — the file-to-language routing that makes
the server useful to the agent):

```jsonc
// .lsp.json
{
  "rust-analyzer": {
    "command": "rust-analyzer",
    "args": [],
    "extensionToLanguage": { "rs": "rust" }
  }
}
```

## Per-harness materialization

### Claude Code — TRANSLATE (wrap in a plugin)
- A bare `.lsp.json` dropped anywhere does **nothing**: LSP servers exist **only inside
  plugins** — `.lsp.json` at the plugin root, or the `lspServers` key in
  `.claude-plugin/plugin.json`. The registry's minimum emit is therefore a minimal plugin
  bundle wrapping the map (see [data-model-plugins.md](data-model-plugins.md)); there is no
  standalone file drop.

### Codex — NO SURFACE
- LSP is absent from Codex's documentation entirely (as of rust-v0.163.0). Nothing to emit.

### OpenCode — NO SURFACE (a key is not a surface)
- An `lsp` config key *exists*, but its schema is undocumented; the only LSP-adjacent
  surface is two plugin events (`lsp.client.diagnostics`, `lsp.updated`). Nothing a
  registry could reliably emit or a user could rely on.

### Pi — NO SURFACE
- No LSP integration as of 1.3.0.

## Registry notes

- `NO SURFACE` is real data (matrix friction #5): the record must carry
  `compatibility.harnesses.<h>.supported = false` for the three, never silently skip the
  install. The install report should say "LSP: n/a on this harness", not "success".
- If language-aware features matter to an artifact, the portable substitute today is MCP
  (a language server exposed as an MCP server) — all four harnesses speak that; see
  [data-model-mcp.md](data-model-mcp.md).

## Original specification (reference)

Claude Code's plugin LSP manifest — `.lsp.json` at the plugin root, or the `lspServers`
key in `.claude-plugin/plugin.json`; either way it bundles **into a plugin** (no
standalone file drop):

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `<server-name>` (map key) | yes | server name → launch-config object; the map is the entire file | core |
| `extensionToLanguage` | yes | file-extension → language-id map, **per entry** — the one hard field (file→language routing) | core |
| `command` / `args` | no | spawn argv; implied by every example, never called out as required | extras |
| `.lsp.json` placement | — | **plugin root only** — a bare drop anywhere else does nothing | extras |
| `lspServers` (manifest key) | no | plugin.json alternative to the root file; component-path override, **merges** | spec |

Source: agents-unified-registry/claude-code.md §1 (LSP servers row) + §8 + §10.

The rest of the corpus confirms the sparsity: OpenCode's `lsp` config key exists but its
schema is undocumented — the only LSP-adjacent surface is two plugin events
(`lsp.client.diagnostics`, `lsp.updated`) (opencode.md §2, §7); Codex documents no LSP
integration at all (codex.md); Pi has none as of 1.3.0 (pi.md). Nothing here widens the
minimum.
