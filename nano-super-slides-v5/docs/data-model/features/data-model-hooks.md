# Data model — Hooks

Part of the [data-model series](../data-model.md) · matrix row: **Hooks** in [slide-4.md](../../slide-4.md).
Versions studied: Claude Code v2.1.302 · Codex rust-v0.163.0 · OpenCode 2.0.x (v2 plugin API,
re-verified 2026-10-21) · Pi 1.3.0 (extension API, re-verified 2026-10-21).

**Minimum verdict: COPY for Claude (merge into settings, never blind-drop) · COPY-with-tuning for Codex
(same JSON shape, event/handler subset) · TRANSLATE (mandatory codegen) for OpenCode and Pi.** Key
insight: the canonical hook **stays a command script** — OpenCode/Pi get a codegen'd TS wrapper that
shells out to that same script, so **codegen changes the delivery vehicle, not the record**; blocking
ports 1:1: exit 2 → `new Tool.Error` (OpenCode) → `{ block: true, reason }` (Pi).

## Minimum portable core (canonical = Claude/Codex JSON shape)

```jsonc
{ "hooks": { "PreToolUse": [
  { "matcher": "Bash", "hooks": [ { "type": "command", "command": "scripts/guard.sh", "timeout": 600 } ] } ] } }
```

- **One event + optional matcher + one `command`-type handler** (the script) — the only handler type
  all four harnesses run. Subset: `command` (+ `mcp_tool`); `http`/`prompt`/`agent` are Claude-only.
- Portable event subset = **the 12 Codex events**: PreToolUse, PostToolUse, PermissionRequest,
  PreCompact, PostCompact, UserPromptSubmit, Stop, Interrupt, SessionStart, SessionEnd,
  SubagentStart, SubagentStop. Eleven exist verbatim among Claude's 30+; **Interrupt is Codex-native**.
- Contract preserved everywhere: JSON payload on stdin; **exit 0 = proceed, exit 2 = block** (stderr =
  reason); any other exit is non-blocking.

## Event mapping (canonical Claude event → target mechanism)

| Claude event | Codex | OpenCode v2 | Pi 1.3.0 |
|---|---|---|---|
| PreToolUse | same name | `ctx.tool.hook("execute.before")` — may replace input or fail with `Tool.Error` | `pi.on("tool_call")` → `{ block: true, reason }`; or mutate `event.input` |
| PostToolUse | same name | `ctx.tool.hook("execute.after")` — `event.status`, mutable `event.result` | `pi.on("tool_result")` → return replacement object; cannot block |
| PermissionRequest | same name | `ctx.permission.hook("evaluate")` — mutable `effect: allow\|ask\|deny` (explicit config deny is final, skips the hook) | none — no permission system; gate inside `tool_call` |
| UserPromptSubmit | same name | `ctx.session.hook("prompt")` — can rewrite `event.prompt.text`, push files | `pi.on("input")` → `{ action: continue\|transform\|handled }` |
| SessionStart / SessionEnd | same name | none (generic `ctx.event.subscribe` only) | `pi.on("session_start")` / `pi.on("session_shutdown")` |
| Stop | same name | none (no stop/turn-end hook in v2) | `pi.on("turn_end")` (`continue: true` = one more model request) |
| PreCompact / PostCompact | same name | `ctx.session.hook("compaction")` | none |
| SubagentStart / SubagentStop | same name | none | none |
| — | **Interrupt** (Codex-native; no Claude event) | — | — |

Claude-only events with no path anywhere (drop, or overlay into the Claude copy only): `Setup`,
`UserPromptExpansion`, `Notification`, `FileChanged`, `PermissionDenied`, … OpenCode's remaining
hooks (`context`, `generate`, `model.request`, `http.request/response`, …) are one-way doors.

## Per-harness materialization

### Claude Code — COPY (merge into settings, never blind-drop)
- Read-modify-write the `hooks` key into `~/.claude/settings.json` (user), `.claude/settings.json`
  (project), `.claude/settings.local.json` (local), managed-settings.json, or a plugin's
  `hooks/hooks.json` — hooks **merge across ALL levels**; a blind drop clobbers existing hooks.
- Full dialect lives here only: 30+ events, 5 handler types (`command`, `http`, `mcp_tool`, `prompt`,
  `agent`), stdin JSON (`tool_name`, `tool_input`, …), stdout controls (`decision: "block"`, …).

### Codex — COPY-with-tuning (same JSON shape, subset + knobs)
- Drop `hooks.json` to `~/.codex/hooks.json` (user) or `<repo>/.codex/hooks.json` (project — **inert
  until trusted**, `[projects."<path>"] trust_level = "trusted"`), inline `[hooks]` in either
  `config.toml`, or a plugin's `hooks/hooks.json` (**skipped until user review**; plugins with hooks
  are barred from the public directory). All layers merge, as on Claude; kill switches `[features]
  hooks = false`, `allow_managed_hooks_only = true`.
- Tune the emit: 12 events; handler types `command` + `mcp_tool` only — rewrite Claude `http`/`prompt`/
  `agent` handlers as `command` scripts. `matcher` = regex over Codex tool names (ignored for
  UserPromptSubmit/Stop/Interrupt); Windows needs `commandWindows`; timeouts default 600 s but
  SessionEnd/Interrupt 1 s (max 3); plugin commands get `PLUGIN_ROOT`/`PLUGIN_DATA` **plus
  `CLAUDE_PLUGIN_ROOT`/`CLAUDE_PLUGIN_DATA`** (Claude plugin scripts run unmodified).

### OpenCode — TRANSLATE (mandatory codegen → v2 TS plugin)
- No hooks file; v2 plugins are not event-key objects — `export default Plugin.define({ id,
  setup(ctx) { … } })`, and v1 plugins do not run in v2 (v1 rewrite: `tool.execute.before/after` →
  `ctx.tool.hook(…)`, `permission.ask` → `permission.hook("evaluate")`, `chat.message` →
  `session.hook("prompt")`, `shell.env` → `shell.hook("create.before")`; opencode.ai/v2/docs/build/
  plugins + /build/plugins/effect + /build/plugins/migrate-v1). The registry keeps the script, codegens
  the wrapper:

```ts
export default Plugin.define({
  id: "acme-hooks",
  setup(ctx) {
    ctx.tool.hook("execute.before", async (event) => {
      const r = await shellOutTo("scripts/guard.sh", event)  // JSON payload on stdin
      if (r.exitCode === 2) throw new Tool.Error({ message: r.stderr })  // exit 2 = block
    })  // exit 0 / any other code = proceed (non-blocking)
  },
})
```

### Pi — TRANSLATE (mandatory codegen → TS extension)
- Extension = `export default (pi: ExtensionAPI) => { … }` in `~/.pi/agent/extensions/` (user) or
  `.pi/extensions/` (project, trust-gated: `defaultProjectTrust: "ask"`, decisions in
  `~/.pi/agent/trust.json`); in-process via jiti, no manifest, host packages as `peerDependencies:
  "*"`; `pi.on()` returns unsubscribe, handlers awaited in registration order; Pi-only doors
  (`user_bash`, `before_agent_start`, `turn_end`) only if the record asks (pi.dev/docs/latest/
  extensions; types: packages/coding-agent/src/core/extensions/types.ts):

```ts
export default (pi: ExtensionAPI) => {
  pi.on("tool_call", async (event) => {
    const r = await shellOutTo("scripts/guard.sh", event)  // JSON payload on stdin
    if (r.exitCode === 2) return { block: true, reason: r.stderr }  // exit 2 = block
  })  // undefined = allow; a throwing handler fail-safe blocks
}
```

## Registry notes

- Trust tier: hooks are **review tier** on OpenCode and Pi — the wrapper runs in-process with full OS
  access (Pi project scope additionally sits behind the trust prompt).
- Never blind-drop on Claude or Codex: both merge across layers — always read-modify-write.
- OpenCode has no SessionStart/SessionEnd/Stop hooks at all; lifecycle is only the generic
  `ctx.event.subscribe` bus (opaque `V2EventEncoded`) — treat as unsupported, don't fake a mapping.
