-- ============================================================================
-- data-model-schema.sql
-- ----------------------------------------------------------------------------
-- Runnable PostgreSQL DDL for the organizational data model.
-- Companion to data-model-org.md in this folder: the .md docs are the prose
-- spec, this file is the executable version (tables, enums, views, seeds).
--
-- Target: PostgreSQL 15+ (uses CREATE TYPE enums, GENERATED ALWAYS AS
-- IDENTITY, JSONB, UNIQUE NULLS NOT DISTINCT, expression unique indexes).
--
-- JOIN POINTS: area, functional_unit, project, team, team_project belong to
-- your EXISTING org database. They are created here only as minimal stubs so
-- the foreign keys in this file resolve; each is marked
-- "-- STUB: replace with your existing table". Keep the referenced columns
-- (id BIGINT PRIMARY KEY, name, plus the org-chain columns the
-- v_effective_setup view walks) when you swap in the real tables; everything
-- else about those tables stays yours.
--
-- Run top-to-bottom on an empty database. Section order:
--   STUBS -> DIMENSIONS -> SETUP -> REGISTRY -> USAGE -> VIEWS -> SEEDS
-- ============================================================================

BEGIN;

-- ============================================================================
-- 0. STUBS — JOIN POINTS to the existing org database (replace wholesale)
-- ============================================================================

-- STUB: replace with your existing table
CREATE TABLE area (
    id   BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL
);

-- STUB: replace with your existing table
-- area_id kept: v_effective_setup walks the chain team -> functional_unit -> area.
CREATE TABLE functional_unit (
    id      BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    area_id BIGINT NOT NULL REFERENCES area (id),
    name    TEXT NOT NULL
);

-- STUB: replace with your existing table
CREATE TABLE project (
    id   BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    name TEXT NOT NULL
);

-- STUB: replace with your existing table
-- functional_unit_id kept: v_effective_setup walks team -> functional_unit -> area.
CREATE TABLE team (
    id                BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    functional_unit_id BIGINT NOT NULL REFERENCES functional_unit (id),
    name              TEXT NOT NULL
);

-- STUB: replace with your existing table
CREATE TABLE team_project (
    team_id    BIGINT NOT NULL REFERENCES team (id),
    project_id BIGINT NOT NULL REFERENCES project (id),
    PRIMARY KEY (team_id, project_id)
);

-- ============================================================================
-- 1. DIMENSIONS — the model is deliberately harness-agnostic; harnesses are data
-- ============================================================================

CREATE TABLE harness (
    id              BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    key             TEXT NOT NULL UNIQUE,               -- stable machine key ('claude-code', 'codex', ...)
    display_name    TEXT NOT NULL,
    vendor          TEXT,
    config_style    TEXT,                               -- JSON / TOML / JSONC / dirs+npm: what the emitters write
    version_studied TEXT,                               -- harness version the capability verdicts were verified against
    status          TEXT NOT NULL DEFAULT 'active'
                    CHECK (status IN ('active', 'deprecated', 'retired')),  -- harness churn without schema churn
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE surface (
    id           BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    key          TEXT NOT NULL UNIQUE,                  -- one of the ten artifact surfaces
    display_name TEXT NOT NULL,
    matrix_row   TEXT,                                  -- row label as it appears in the translation-matrix doc
    description  TEXT
);

-- Verdict scale of the translation matrix, best -> worst portability.
CREATE TYPE support_level AS ENUM
    ('copy', 'copy_with_caveats', 'translate', 'overlay', 'no_surface');

-- The translation matrix as data: one row per (harness, surface).
CREATE TABLE harness_surface_capability (
    harness_id          BIGINT NOT NULL REFERENCES harness (id),
    surface_id          BIGINT NOT NULL REFERENCES surface (id),
    minimum_verdict     support_level NOT NULL,         -- worst verdict any artifact of this surface can expect
    full_parity_verdict support_level,                  -- verdict when the artifact exercises every extras field
    install_target      TEXT,                           -- canonical drop path/config file for this cell
    notes               TEXT,
    PRIMARY KEY (harness_id, surface_id)
);

CREATE INDEX idx_hsc_surface ON harness_surface_capability (surface_id);  -- reverse lookup: which harnesses expose a surface

-- Field tiers: core = minimum portable core (per-surface docs),
-- extras = optional harness-specific extension (harness_id set),
-- spec = defined by the original specification but beyond the minimum.
CREATE TYPE field_tier AS ENUM ('core', 'extras', 'spec');

-- The registry's dictionary; drives registration forms, validation, and emitters.
CREATE TABLE surface_field (
    id          BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    surface_id  BIGINT NOT NULL REFERENCES surface (id),
    harness_id  BIGINT REFERENCES harness (id),         -- NULL = portable/spec-level field; a value = harness-specific
    tier        field_tier NOT NULL,
    field_name  TEXT NOT NULL,
    data_type   TEXT,
    required    BOOLEAN NOT NULL DEFAULT false,
    constraints TEXT,                                   -- free-text validation rule for the emitter/validator
    unlocks     TEXT,                                   -- behavior this field unlocks when populated (extras tier)
    spec_source TEXT,                                   -- where the rule comes from (which doc/spec section)
    -- NULLS NOT DISTINCT (PG15+) so portable rows (harness_id IS NULL) are unique under the same key too.
    UNIQUE NULLS NOT DISTINCT (surface_id, harness_id, tier, field_name)
);

CREATE INDEX idx_surface_field_surface ON surface_field (surface_id);
CREATE INDEX idx_surface_field_harness ON surface_field (harness_id);

-- ============================================================================
-- 2. SETUP — agentic harness policy, hierarchical, most-specific-wins
-- ============================================================================

CREATE TYPE setup_scope AS ENUM ('area', 'functional_unit', 'project', 'team');

-- One row per scope that declares anything; a scope with no row simply inherits.
CREATE TABLE agentic_setup (
    id         BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    scope_type setup_scope NOT NULL,
    scope_id   BIGINT NOT NULL,      -- polymorphic: id (in the org tables) of the row named by scope_type; deliberately NOT a foreign key
    notes      TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (scope_type, scope_id)
);

CREATE TYPE harness_role AS ENUM ('required', 'optional', 'forbidden');

CREATE TABLE setup_harness (
    setup_id      BIGINT NOT NULL REFERENCES agentic_setup (id),
    harness_id    BIGINT NOT NULL REFERENCES harness (id),
    role          harness_role NOT NULL DEFAULT 'optional',  -- 'forbidden' lets a unit ban a harness despite area defaults
    install_scope TEXT,              -- preferred drop scope where the harness distinguishes (user vs project)
    since_version TEXT,              -- minimum harness version the setup was validated against
    PRIMARY KEY (setup_id, harness_id)
);

CREATE INDEX idx_setup_harness_harness ON setup_harness (harness_id);

-- Resolution rule: the effective harness set for a team is, for each harness,
-- the role from the most specific scope that declares it
-- (team > project > functional_unit > area); a harness no scope declares is
-- simply not used. v_effective_setup below is the executable form.

-- ============================================================================
-- 3. REGISTRY — artifact metadata only; file contents live in git/npm
-- ============================================================================

CREATE TYPE artifact_status AS ENUM ('draft', 'published', 'deprecated', 'quarantined');
CREATE TYPE trust_tier AS ENUM ('standard', 'review');  -- hooks, extensions, codegen artifacts are 'review'

-- One row per published version (UNIQUE (urn, version)).
CREATE TABLE artifact (
    id                BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    urn               TEXT NOT NULL,                    -- stable artifact identity, 'io.github.<owner>/<name>'
    name              TEXT NOT NULL,
    surface_id        BIGINT NOT NULL REFERENCES surface (id),
    owning_team_id    BIGINT REFERENCES team (id),
    owning_project_id BIGINT REFERENCES project (id),
    version           TEXT NOT NULL,                    -- semver
    content_sha256    TEXT,                             -- version seal: content + tree hashes are immutable per version
    tree_sha256       TEXT,
    released_at       TIMESTAMPTZ,
    supersedes        TEXT,                             -- previous version of this urn that the row replaces
    status            artifact_status NOT NULL DEFAULT 'draft',
    tier              trust_tier NOT NULL DEFAULT 'standard',
    core_payload      JSONB NOT NULL DEFAULT '{}',      -- validated against surface_field rows of tier 'core' for this surface
    requires          JSONB NOT NULL DEFAULT '{}',      -- dependency disclosure: {runtime[], mcp[], network[], shell}
    sources           JSONB NOT NULL DEFAULT '[]',      -- provenance: git/npm refs + hashes
    description       JSONB NOT NULL DEFAULT '{}',      -- structured/multiline description blocks
    created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
    CHECK (owning_team_id IS NOT NULL OR owning_project_id IS NOT NULL),  -- an artifact must have an owner
    UNIQUE (urn, version)                                -- one row per version of the same urn
);

CREATE INDEX idx_artifact_surface        ON artifact (surface_id);
CREATE INDEX idx_artifact_owning_team    ON artifact (owning_team_id);
CREATE INDEX idx_artifact_owning_project ON artifact (owning_project_id);
CREATE INDEX idx_artifact_supersedes     ON artifact (supersedes);

-- Per-harness install contract for one artifact version.
CREATE TABLE artifact_harness_target (
    id              BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    artifact_id     BIGINT NOT NULL REFERENCES artifact (id) ON DELETE CASCADE,
    harness_id      BIGINT NOT NULL REFERENCES harness (id),
    support         support_level NOT NULL,             -- verdict actually achieved for this target (from the capability matrix)
    install_method  TEXT,
    install_target  TEXT,
    install_command TEXT,
    overlay         JSONB NOT NULL DEFAULT '{}',        -- validated against surface_field rows tier 'extras' for this harness; empty for a pure 'copy'
    UNIQUE (artifact_id, harness_id)
);

CREATE INDEX idx_aht_harness ON artifact_harness_target (harness_id);

-- ============================================================================
-- 4. USAGE — feature registration (which project uses what, where)
-- ============================================================================

CREATE TYPE registration_status AS ENUM
    ('required', 'approved', 'installed', 'pinned', 'retired');

CREATE TABLE feature_registration (
    id              BIGINT PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
    project_id      BIGINT NOT NULL REFERENCES project (id),
    team_id         BIGINT REFERENCES team (id),        -- NULL = project-wide registration
    artifact_id     BIGINT NOT NULL REFERENCES artifact (id),
    harness_id      BIGINT REFERENCES harness (id),     -- NULL = every target of the artifact
    status          registration_status NOT NULL DEFAULT 'required',
    pinned_version  TEXT,                               -- when status = 'pinned': overrides artifact.version in exports
    installed_at    TIMESTAMPTZ,
    installed_by    TEXT,
    lockfile_ref    TEXT,                               -- path/commit of the agentreg.lock line that recorded this
    created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- One registration per (project, team-or-global, artifact, harness-or-all);
-- COALESCE to 0 because a plain UNIQUE would treat the NULLs as distinct.
CREATE UNIQUE INDEX uq_feature_registration_slot
    ON feature_registration (project_id, COALESCE(team_id, 0), artifact_id, COALESCE(harness_id, 0));

CREATE INDEX idx_fr_artifact ON feature_registration (artifact_id);
CREATE INDEX idx_fr_harness  ON feature_registration (harness_id);

-- ============================================================================
-- 5. VIEWS — effective setup resolution + lockfile export
-- ============================================================================

-- Effective harness role for every (team, project) pair: four LEFT JOINs onto
-- agentic_setup/setup_harness (one per scope), COALESCEd in priority order
-- team > project > functional_unit > area. A harness appears once with the
-- most specific declared role; a harness no scope declares does not appear.
CREATE VIEW v_effective_setup AS
SELECT
    tp.team_id,
    tp.project_id,
    h.id  AS harness_id,
    h.key AS harness_key,
    COALESCE(r_team.role, r_project.role, r_fu.role, r_area.role) AS role,
    CASE
        WHEN r_team.role    IS NOT NULL THEN 'team'
        WHEN r_project.role IS NOT NULL THEN 'project'
        WHEN r_fu.role      IS NOT NULL THEN 'functional_unit'
        WHEN r_area.role    IS NOT NULL THEN 'area'
    END AS source_scope
FROM team_project tp
JOIN team t            ON t.id  = tp.team_id
JOIN functional_unit fu ON fu.id = t.functional_unit_id
CROSS JOIN harness h
LEFT JOIN (
    SELECT s.scope_id, sh.harness_id, sh.role
    FROM agentic_setup s
    JOIN setup_harness sh ON sh.setup_id = s.id
    WHERE s.scope_type = 'team'
) r_team    ON r_team.scope_id    = tp.team_id             AND r_team.harness_id    = h.id
LEFT JOIN (
    SELECT s.scope_id, sh.harness_id, sh.role
    FROM agentic_setup s
    JOIN setup_harness sh ON sh.setup_id = s.id
    WHERE s.scope_type = 'project'
) r_project ON r_project.scope_id = tp.project_id          AND r_project.harness_id = h.id
LEFT JOIN (
    SELECT s.scope_id, sh.harness_id, sh.role
    FROM agentic_setup s
    JOIN setup_harness sh ON sh.setup_id = s.id
    WHERE s.scope_type = 'functional_unit'
) r_fu      ON r_fu.scope_id      = t.functional_unit_id   AND r_fu.harness_id      = h.id
LEFT JOIN (
    SELECT s.scope_id, sh.harness_id, sh.role
    FROM agentic_setup s
    JOIN setup_harness sh ON sh.setup_id = s.id
    WHERE s.scope_type = 'area'
) r_area    ON r_area.scope_id    = fu.area_id             AND r_area.harness_id    = h.id
WHERE COALESCE(r_team.role, r_project.role, r_fu.role, r_area.role) IS NOT NULL;

-- One agentreg.lock line per (project, artifact, harness): every
-- installed/pinned registration joined to its concrete target. A registration
-- with harness_id NULL (all targets) fans out to every target of the artifact.
CREATE VIEW v_lockfile_export AS
SELECT
    fr.project_id,
    a.urn,
    a.name                                   AS artifact_name,
    COALESCE(fr.pinned_version, a.version)   AS pinned_version,
    a.content_sha256,
    h.key                                    AS harness_key,
    aht.install_method,
    aht.install_target
FROM feature_registration fr
JOIN artifact a ON a.id = fr.artifact_id
JOIN artifact_harness_target aht
    ON aht.artifact_id = a.id
   AND (fr.harness_id IS NULL OR aht.harness_id = fr.harness_id)
JOIN harness h ON h.id = aht.harness_id
WHERE fr.status IN ('installed', 'pinned');

-- ============================================================================
-- 6. SEEDS — reference dimensions, the 40-cell matrix, example field rows
-- ============================================================================
-- PKs are GENERATED ALWAYS, so no seed hard-codes ids: every insert references
-- the stable natural key (harness.key / surface.key) instead.

INSERT INTO harness (key, display_name, vendor, config_style, version_studied) VALUES
    ('claude-code', 'Claude Code', 'Anthropic', 'JSON',     '2.1.302'),
    ('codex',       'Codex CLI',   'OpenAI',    'TOML',     'rust-v0.163.0'),
    ('opencode',    'OpenCode',    'Anomaly',   'JSONC',    '2.0.x'),
    ('pi',          'pi',          'Earendil',  'dirs+npm', '1.3.0');

INSERT INTO surface (key, display_name, matrix_row, description) VALUES
    ('skill',       'Skill',           'skill',       'Folder + SKILL.md instructions package'),
    ('command',     'Slash command',   'command',     'User-invoked prompt template'),
    ('subagent',    'Subagent',        'subagent',    'Specialized agent definition'),
    ('hook',        'Hook',            'hook',        'Lifecycle event handler'),
    ('plugin',      'Plugin',          'plugin',      'Distributable capability bundle'),
    ('mcp',         'MCP server',      'mcp',         'Model Context Protocol server entry'),
    ('lsp',         'LSP server',      'lsp',         'Language server entry'),
    ('custom_tool', 'Custom tool',     'custom_tool', 'Harness-executed structured tool'),
    ('statusline',  'Statusline',      'statusline',  'Custom status line renderer'),
    ('exec_policy', 'Execution policy','exec_policy', 'Allow/deny rules for shell execution');

-- The minimum-verdict matrix (4 harnesses x 10 surfaces = 40 rows).
WITH m (harness_key, surface_key, minimum_verdict, notes) AS (
    VALUES
        -- claude-code
        ('claude-code', 'skill',       'copy',              'folder drop: skills/<name>/SKILL.md'),
        ('claude-code', 'command',     'copy_with_caveats', 'legacy surface; prefer skill'),
        ('claude-code', 'subagent',    'copy',              'canonical .md subagent format lives here'),
        ('claude-code', 'hook',        'copy_with_caveats', 'merge events into settings.json'),
        ('claude-code', 'plugin',      'translate',         '.claude-plugin + marketplace repo'),
        ('claude-code', 'mcp',         'copy',              '.mcp.json verbatim'),
        ('claude-code', 'lsp',         'translate',         'wrap in plugin'),
        ('claude-code', 'custom_tool', 'no_surface',        NULL),
        ('claude-code', 'statusline',  'copy',              'settings statusLine'),
        ('claude-code', 'exec_policy', 'translate',         'derive allow-rules'),
        -- codex
        ('codex', 'skill',       'copy',              NULL),
        ('codex', 'command',     'copy_with_caveats', 'deprecated; user-only; restart required'),
        ('codex', 'subagent',    'translate',         'md -> TOML'),
        ('codex', 'hook',        'copy_with_caveats', 'subset of events/handlers; tune matcher'),
        ('codex', 'plugin',      'overlay',           'portable plugin.json + .codex-plugin + catalog entry'),
        ('codex', 'mcp',         'translate',         'JSON -> TOML'),
        ('codex', 'lsp',         'no_surface',        NULL),
        ('codex', 'custom_tool', 'no_surface',        NULL),
        ('codex', 'statusline',  'no_surface',        NULL),
        ('codex', 'exec_policy', 'copy',              '.rules verbatim + declared sandbox/approval'),
        -- opencode
        ('opencode', 'skill',       'copy',      NULL),
        ('opencode', 'command',     'copy',      NULL),
        ('opencode', 'subagent',    'translate', 'dialect + mode:subagent'),
        ('opencode', 'hook',        'translate', 'codegen TS plugin'),
        ('opencode', 'plugin',      'translate', 'npm TS plugin package'),
        ('opencode', 'mcp',         'translate', 'JSON -> v2/v1 dialect'),
        ('opencode', 'lsp',         'no_surface', NULL),
        ('opencode', 'custom_tool', 'translate', 'codegen ctx.tool.transform'),
        ('opencode', 'statusline',  'no_surface','theme JSON adjacent, not a surface'),
        ('opencode', 'exec_policy', 'translate', 'derive permissions[]'),
        -- pi
        ('pi', 'skill',       'copy',       NULL),
        ('pi', 'command',     'copy',       NULL),
        ('pi', 'subagent',    'no_surface', 'example extension only'),
        ('pi', 'hook',        'translate',  'codegen TS extension'),
        ('pi', 'plugin',      'translate',  'npm pi-package'),
        ('pi', 'mcp',         'copy',       'verbatim'),
        ('pi', 'lsp',         'no_surface', NULL),
        ('pi', 'custom_tool', 'translate',  'codegen registerTool'),
        ('pi', 'statusline',  'overlay',    'theme JSON; name = filename'),
        ('pi', 'exec_policy', 'no_surface', NULL)
)
INSERT INTO harness_surface_capability (harness_id, surface_id, minimum_verdict, notes)
SELECT h.id, s.id, m.minimum_verdict::support_level, m.notes
FROM m
JOIN harness h ON h.key = m.harness_key
JOIN surface s ON s.key = m.surface_key;

-- Six example surface_field rows only (the full core/extras/spec catalog
-- derives from the data-model-*.md per-surface docs, not from this file).
WITH f (surface_key, harness_key, tier, field_name, data_type, required, constraints, unlocks, spec_source) AS (
    VALUES
        -- portable core of the skill surface
        ('skill', NULL,         'core',  'name',                   'text', true,  'non-empty; equals the artifact folder name', NULL,                        NULL),
        ('skill', NULL,         'core',  'description',            'text', true,  'one-line summary used in listings',          NULL,                        NULL),
        -- original-spec field kept for reference (tier 'spec')
        ('skill', NULL,         'spec',  'license',                'text', false, 'SPDX identifier',                            'redistribution terms',      'upstream SKILL.md specification'),
        -- harness-specific extras
        ('skill', 'claude-code','extras','when_to_use',            'text', false, NULL,                                         'better dispatch in Claude Code', 'claude-code SKILL.md frontmatter'),
        ('mcp',   NULL,         'core',  'url',                    'text', false, 'required for http transport',                NULL,                        NULL),
        -- core-in-target: required only by the codex TOML translation
        ('subagent', 'codex',   'core',  'developer_instructions', 'text', true,  'system prompt; mandatory in codex TOML',     NULL,                        'codex agent TOML spec')
)
INSERT INTO surface_field (surface_id, harness_id, tier, field_name, data_type, required, constraints, unlocks, spec_source)
SELECT s.id, h.id, f.tier::field_tier, f.field_name, f.data_type, f.required, f.constraints, f.unlocks, f.spec_source
FROM f
JOIN surface s      ON s.key = f.surface_key
LEFT JOIN harness h ON h.key = f.harness_key;

COMMIT;
