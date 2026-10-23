# Data model — Status line

Part of the [data-model series](../data-model.md) · matrix row: **Status line** in
[slide-4.md](../../slide-4.md). Versions studied: Claude Code v2.1.302 · Codex rust-v0.163.0 ·
OpenCode 2.0.x · Pi 1.3.0.

**Minimum verdict: COPY for Claude (script) · OVERLAY for Pi (theme JSON — a *different*
element, not a translation) · NO SURFACE for Codex and OpenCode.** The slide row bundles two
different features under one name: a *dynamic status script* (Claude only) and *static theme
JSON* (OpenCode, Pi). There is no transformation between them — the data model carries them
as two independent optional payloads and each harness consumes what it has.

## Minimum elements

### Element 1 — statusline script (Claude-only)

| Element | Required | Notes |
|---|---|---|
| Executable script (any language) | yes | reads JSON session state on **stdin**, prints the status bar line |
| `statusLine` settings key | yes | points at the script; the ONLY wiring — no manifest, no format |

- Install = drop the script + set `statusLine` in the chosen settings scope (the
  `/statusline` wizard does this interactively; the registry writes the key).
- Update = replace the script file. No versioning, no packaging — this is as copy-as-is as
  a surface gets.

### Element 2 — theme JSON (OpenCode, Pi)

```jsonc
// Pi: ~/.pi/agent/themes/<name>.json — STRICT schema, unknown keys rejected
{
  "$schema": "https://pi.dev/schemas/theme.schema.json",
  "name": "<must equal the filename>",     // Pi hard requirement
  "appearance": "dark",
  "colors": { /* ~50 tokens: md*, toolDiff*, syntax*, thinking* … */ }
}
```

- **Pi**: drop into `~/.pi/agent/themes/` (user) or `.pi/themes/` (project, trust-gated).
  The `name` field **must equal the filename** — that naming constraint is the only
  "transformation" a portable theme needs. Select via `/settings` → theme.
- **OpenCode**: drop into `.opencode/themes/<n>.json` (project) or
  `~/.config/opencode/themes/` (user); filename = theme name; `$schema
  https://opencode.ai/theme.json`; v2 wants the structured `{ base, light, dark }` form.
  Select via `/themes`. Plugins **cannot** register themes — JSON drops only.
- A theme is *colors*, not status content: it cannot show dynamic session state. Deeper TUI
  customization on Pi needs extension code (`ctx.ui.*`, review tier); OpenCode has no
  documented statusline at all.

## Per-harness summary

| Harness | Verdict | Minimum element | Target |
|---|---|---|---|
| Claude Code | COPY | script + `statusLine` key | any settings scope |
| Codex | NO SURFACE | — | only `[tui]` notification keys exist |
| OpenCode | NO SURFACE (adjacent drop) | theme JSON | `.opencode/themes/<n>.json` |
| Pi | OVERLAY | theme JSON (name = filename) | `~/.pi/agent/themes/<n>.json` |

## Registry notes

- The record models this as two optional payloads (`statusline.script`, `theme.json`), not
  one artifact with four translations — a "statusline" install on Pi means the theme
  element, and the install report should say which element actually landed.
- Both theme drops are standalone files → never self-update; bundle into a plugin /
  pi-package for updates (see [data-model.md](../data-model.md#version-and-update)).

## Original specification (reference)

**Claude** — the `statusLine` settings key is the whole surface; replacing the script is the update:

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `statusLine` (settings key) | yes | script command; any scope (user/project/local/managed); scalar — overrides, never merges | core |
| script | yes | any language/path; reads JSON session state on **stdin**, prints the bar line | core |
| `/statusline` | no | in-session wizard that writes the key | extras |

Source: agents-unified-registry/claude-code.md §1 (Statusline row) + §2 + §10.

**Pi** — `~/.pi/agent/themes/<name>.json`; select via `/settings` → theme or `--use-theme`;
deeper TUI customization is extension code (`ctx.ui.*`):

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `name` | yes | **must equal the filename** — Pi's one naming constraint | core |
| `colors` | yes | ~50 tokens: `md*`, `toolDiff*`, `syntax*`, `thinking*` … | core |
| `appearance` | no | `dark \| light` | core |
| `$schema` | no | `https://pi.dev/schemas/theme.schema.json`; strict — unknown keys rejected | core |
| `vars` / `export` | no | reusable color definitions referenced from `colors`; HTML-export colors | extras |

Source: agents-unified-registry/pi.md §3.6.

**OpenCode** — `.opencode/themes/<n>.json` (project) or `~/.config/opencode/themes/` (user);
filename = theme name; select via `/themes`; plugins **cannot** register themes — JSON
drops only:

| Field | Required | Constraints / values | Tier |
|---|---|---|---|
| `$schema` | no | `https://opencode.ai/theme.json` | core |
| `base` / `light` / `dark` | v2 | structured form — `base` plus per-mode overrides | core |
| v1 flat keys | v1 only | `primary`, `text`, `backgroundPanel`, `diffAdded`, `syntaxKeyword`, `markdownLink` … | extras |
| hue scales | no | 9-step per hue (`gray…purple`) + `accent`/`interactive`/`neutral` aliases | spec |
| semantic tokens | no | `text.muted`, `background.raised`, `border`, `diff.*`, `syntax.*`, `markdown.*` | spec |
| `$hovered`/`$focused`, `@dialog` | no | state keys; dialog-scope overrides | spec |
| built-ins | — | opencode, system, tokyonight, catppuccin, gruvbox, nord, ayu, everforest, kanagawa, matrix, one-dark | extras |

Source: agents-unified-registry/opencode.md §9.
