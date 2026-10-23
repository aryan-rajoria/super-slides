# Data model — the organizational layer (teams → agentic setups → registered features)

Part of the [data-model series](data-model.md). Where the per-surface docs define *what an
artifact is made of*, this doc defines **how your existing database maps onto the agentic
world**: which project needs what kind of agentic setup, and how teams use and register
every feature of the matrix into the database. Runnable schema: [data-model-schema.sql](data-model-schema.sql).

Decisions this model implements (confirmed 2026-10-21):
1. The database is a **mapping + metadata registry** — it maps org units to harnesses and
   features, and stores artifact *metadata* (type, core fields, extras, version, hashes);
   artifact files stay in git/npm, referenced by URL.
2. Setup attaches **hierarchically with overrides** — Area → Functional unit → Project →
   Team; most-specific wins.
3. Harnesses are an **open table seeded with the four studied harnesses** (Claude Code,
   Codex, OpenCode, Pi). The core model never references a specific harness — adding,
   deprecating or swapping harnesses later is data maintenance, not a migration.

## What exists already (join points — not redefined here)

| Your table | Role in this model |
|---|---|
| `area` (Area of activity) | coarsest setup defaults (e.g. "Engineering standardizes on Claude Code") |
| `functional_unit` (belongs to an area) | unit-level defaults (e.g. "Backend adds Codex + exec-policy posture") |
| `project` (area of activity) | the primary attach point — "which project needs what setup" is answered here |
| `team` (belongs to a functional unit, works on projects) | finest overrides (a team may add a harness or forbid one) |
| `team_project` (M:N) | which team's overrides apply to which project |

Only the `id` columns are assumed; everything else about these tables stays yours.

## The three new dimensions

### 1. `harness` — an open lookup table

| Column | Notes |
|---|---|
| `key` | `claude-code` · `codex` · `opencode` · `pi` (seeded; add `cursor`, `copilot`, … later) |
| `config_style` | JSON · TOML · JSONC · dirs+npm — what the emitters write |
| `status` | `active` · `deprecated` · `retired` — harness churn without schema churn |
| `version_studied` | provenance for the capability rows below |

### 2. `surface` — the ten matrix rows as a lookup

`skill` · `command` · `subagent` · `hook` · `plugin` · `mcp` · `lsp` · `custom_tool` ·
`statusline` · `exec_policy`. Each row points at its per-surface doc, which defines its core.

### 3. `harness_surface_capability` — the translation matrix as data

One row per (harness, surface): `minimum_verdict` (`copy` / `copy_with_caveats` /
`translate` / `overlay` / `no_surface`), `install_target`, `notes`. This is the
[minimum-verdict matrix](data-model.md#minimum-verdict-matrix) made queryable — "which
project can actually use feature X" joins through here, and `no_surface` rows are what keep
the model honest (a registration against a `no_surface` cell is invalid, not silently broken).

### 4. `surface_field` — core / extras / original spec as a catalog

The registry's dictionary, one row per field per surface:

| Column | Meaning |
|---|---|
| `tier` | **core** (required for the feature to work — the per-surface docs' "minimum portable core") · **extras** (optional, harness-specific — `harness_id` set; what it `unlocks` is stated) · **spec** (defined by the original specification but beyond the minimum, e.g. `license`) |
| `harness_id` | NULL = portable/spec-level; a value = that harness's extra |
| `required`, `constraints`, `spec_source` | validation rules + where the rule comes from |

This catalog drives three things at once: the **registration form** (a team registering a
skill is asked for core fields, may fill extras per target harness), **validation**
(core_payload must satisfy all `core` rows for its surface), and the **emitters**
(`extras` rows + overlay JSON produce the per-harness copies).

## Agentic setup — `agentic_setup` + `setup_harness`

One `agentic_setup` row per scope that declares anything
(`UNIQUE(scope_type, scope_id)` — a scope with no row simply inherits). Each carries its
harness set in `setup_harness`:

| Column | Notes |
|---|---|
| `role` | `required` · `optional` · `forbidden` — forbidden lets a security-postured unit ban a harness despite area defaults |
| `install_scope` | preferred drop scope where the harness distinguishes (user vs project) |
| `since_version` | minimum harness version the setup was validated against |

**Resolution — most specific wins.** For a (team, project) pair, each harness's effective
role comes from the first scope that declares it, checked in order
**team → project → functional_unit → area**; a harness no scope declares is not used.
The `v_effective_setup` view implements exactly this coalesce.

### Worked example

| Scope | Declaration |
|---|---|
| Area *Engineering* | claude-code `required`, codex `optional` |
| Functional unit *Backend* | (inherits) + exec-policy posture notes |
| Project *payments-api* | + opencode `required` (repo already has `.opencode/`) |
| Team *payments-core* | pi `forbidden` (un-gated skills surface unacceptable) |

Effective setup for payments-core on payments-api: **claude-code required · codex optional ·
opencode required · pi forbidden** — one query, no duplication of defaults per project.

## Artifact registry — `artifact` + `artifact_harness_target`

The "register all the features to our database" side. One `artifact` row per published
version (files stay in git/npm):

| Column group | Contents |
|---|---|
| identity | `urn` (`io.github.<owner>/<name>`), `name`, `surface_id`, owning `team_id`/`project_id` (≥1 required) |
| version seal | `version` (semver), `content_sha256`, `tree_sha256`, `released_at`, `supersedes` — immutable per version |
| payload | `core_payload` (JSONB, validated against `surface_field` tier **core**) · `requires` (`{runtime[], mcp[], network[], shell}`) · `sources[]` (git/npm refs + hashes) |
| lifecycle | `status` (`draft → published → deprecated / quarantined`) · `tier` (`standard` / `review` — hooks, extensions, codegen artifacts are `review`) |

Per harness: `artifact_harness_target` — `support` (from the capability matrix),
`install_method` / `install_target` / `install_command` (the concrete drop, exactly as in
the per-surface docs), and `overlay` (JSONB validated against that harness's `extras`
fields). **A `copy`-verdict artifact has an empty overlay and still works** — extras are
never required for core features.

## Usage — `feature_registration`

The "use" side: a project (optionally via a specific team) adopts an artifact, per harness
(NULL = every target of the artifact):

| Status | Meaning |
|---|---|
| `required` | the project declares it needs the feature (the mapping answer) |
| `approved` | a human accepted the trust/tier disclosure |
| `installed` | the drop/emit ran; `installed_at`, `installed_by` recorded |
| `pinned` | locked to `pinned_version` (the registry lockfile semantics) |
| `retired` | removed from the effective set, kept for audit |

`v_lockfile_export` renders every `installed`/`pinned` row as the
`urn → version → sha256 → per-harness target` line — the `agentreg.lock` no harness ships.

## Entity relationship summary

```
area 1─N functional_unit 1─N team M─N project (team_project)      [yours]
  └──────────┬────────────────────┘
        agentic_setup (per scope, UNIQUE) 1─N setup_harness N─1 harness
                                                              ↑
surface 1─N surface_field (core/extras/spec, harness NULLable)─┘
   ↑
artifact N─1 surface · N─1 team? · N─1 project?  1─N artifact_harness_target N─1 harness
   ↑
feature_registration N─1 project · N─1 team? · N─1 artifact · N─1 harness?
```

## The four questions this model answers

1. **"Which project needs what agentic setup?"** — `v_effective_setup` (or: project row →
   coalesced setup chain).
2. **"What can this project actually use?"** — effective harnesses ⨝
   `harness_surface_capability` (surface, minimum_verdict ≠ `no_surface`).
3. **"Register a feature"** — insert `artifact` (core_payload validated by the field
   catalog) + one `artifact_harness_target` per harness, overlay filled only if extras are
   wanted.
4. **"What is installed where, at what version?"** — `feature_registration` +
   `v_lockfile_export`.

## Where each piece comes from

- Capability rows = the [minimum-verdict matrix](data-model.md#minimum-verdict-matrix).
- Core/extras/spec field rows = the per-surface docs in this series (each now carries an
  "Original specification (reference)" appendix with the verbatim spec fields).
- Install targets/commands per cell = the per-harness sections of those docs.
- Trust tiers and scan fields exist in the corpus design doc
  (`agents-unified-registry/design-unified-registry.md` §2, §6) and slot onto `artifact`
  without new tables when you want them.
