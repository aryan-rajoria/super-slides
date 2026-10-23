# Data model — Custom tools

Part of the [data-model series](../data-model.md) · matrix row: **Custom tools** in
[slide-4.md](../../slide-4.md). Versions studied: Claude Code v2.1.302 · Codex rust-v0.163.0 ·
OpenCode 2.0.x (v2 plugin API, re-verified 2026-10-21) · Pi 1.3.0 (extension API,
re-verified 2026-10-21).

**Minimum verdict: NO SURFACE for Claude and Codex · TRANSLATE (mandatory codegen to TS) for
OpenCode and Pi.** Half the matrix cannot install a custom tool at any price — Claude hides
them in SDK code, Codex only toggles built-ins. The other half has no declarative format
either: the tool must become generated TypeScript. The portable core is code-shaped.

## Minimum portable core

| Element | Required | Why it is shaped this way |
|---|---|---|
| `name` | yes | namespaced from the start (`acme_greeting`) — OpenCode namespaces by name and later registration wins |
| `description` | yes | the only model-visible trigger, like a skill's |
| input schema, **as JSON Schema** | yes | OpenCode v2 consumes JSON Schema natively (`input:`); Pi needs a mechanical JSON-Schema→TypeBox conversion |
| `execute` as TS source | yes | the only executable form any target would run |

JSON Schema is canonical (not Zod, not TypeBox): OpenCode takes it verbatim, TypeBox emits
it, and it is what MCP tool definitions already carry — one schema also serves
[data-model-mcp.md](data-model-mcp.md).

## Per-harness materialization

### Claude Code — NO SURFACE (SDK code only)
- Custom tools exist only as **Agent SDK in-process MCP server** code (`customTools` API,
  docs/en/agent-sdk/custom-tools) — no file drop, no manifest, nothing to install or pin;
  the surface is application code, not an artifact. Record:
  `compatibility.harnesses.claude.supported = false`. Adjacent fallback: ship the same tool
  as a real MCP server, which Claude installs natively.

### Codex — NO SURFACE
- `[tools]` (`web_search`, `view_image`) and `[tool_suggest]` (`discoverables`,
  `disabled_tools` entries `{ type = "connector"|"plugin", id }`) are toggles for
  **built-ins only** — there is no registration surface. Record: `supported = false`.
  Fallback: an MCP server under `[mcp_servers.<id>]` is the only way to add a tool to Codex.

### OpenCode — TRANSLATE (mandatory codegen → v2 plugin)

```ts
export default Plugin.define({
  id: "acme",
  async setup(ctx) {
    await ctx.tool.transform((editor) =>
      editor.add({
        name: "acme_greeting",           // dots/unsupported chars → "_"
        description: "Greets an ACME user",
        input: { /* JSON Schema, verbatim from the record */ },
        async execute(input, context) {  // context.signal, context.progress
          return `Hello, ${input.name}`
        },
      }),
    )
  },
})
```

- `ctx.tool.transform` is also the v1 `tool.definition` migration path. **Later registration
  overrides the same effective name — a generated tool can override a built-in**: powerful
  and a rug-pull vector, so the registry always namespaces the emitted name
  (`acme_greeting`, never `read`). (opencode.ai/v2/docs/build/plugins,
  /build/plugins/effect, /build/plugins/migrate-v1)

### Pi — TRANSLATE (mandatory codegen → extension)

```ts
export default (pi: ExtensionAPI) => {
  pi.registerTool({
    name: "acme_greeting",
    description: "Greets an ACME user",
    parameters: Type.Object({ name: Type.String() }), // mechanical JSON-Schema→TypeBox
    exposure: "direct", // default; "model-only"|"codemode"|"deferred"|"hidden"
    async execute(toolCallId, params, signal, onUpdate, ctx) {
      return { content: `Hello, ${params.name}` } // + details, structuredContent, usage, terminate
    },
  })
}
```

- ToolDefinition extras (Pi-only, overlay material): `label`, `namespace`, `annotations`,
  `outputSchema`, `renderCall`/`renderResult`. `ctx.executeTool(name, args)` allows nested
  tool calls. Adjacent surface: `pi.registerCommand(name, { description,
  getArgumentCompletions?, handler(args, ctx) })`.
- Extension drops into `~/.pi/agent/extensions/` (user) or `.pi/extensions/` (project,
  trust-gated, `defaultProjectTrust: "ask"`); loaded in-process via jiti with full OS
  access → **review tier**. (pi.dev/docs/latest/extensions; types in
  packages/coding-agent/src/core/extensions/types.ts)

## Registry notes

- Tools never install standalone: they ride inside the OpenCode plugin / Pi extension
  package the emitter generates, so versioning and updates come from that bundle — see
  [data-model-plugins.md](data-model-plugins.md).
- NO SURFACE is emitted data (matrix friction #5): `supported = false` for Claude and Codex;
  the install report says n/a and may offer the MCP-server fallback explicitly — never a
  silent skip.
