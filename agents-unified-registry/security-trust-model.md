# security-trust-model.md — Threat corpus, harness defenses, registry mitigation design (2026-10-16)

Agent 3 output for the unified-registry deck. Defensive supply-chain research. All items verified against
live primary sources 2026-10-16 unless marked UNVERIFIED. Companion files: claude-code.md, codex.md,
opencode.md, pi.md (Phase 1, verified 2026-10-16).

## 1. Attack/incident corpus 2025–2026 (verified, with the deck's anchor numbers)

**The four numbers for the security slide**
- **36.82%** of 3,984 ClawHub+skills.sh skills have ≥1 security flaw; **13.4% (534) critical**; **76
  confirmed malicious**; 8 still live at publication — Snyk ToxicSkills, 2026-02-05. Publishing needed
  only a SKILL.md + a one-week-old GitHub account; no review, no signing. 91% of malicious skills
  combined prompt injection WITH malware; typosquatting already observed (npm-era pattern).
- **2,371 / 31,000+ (7.6%)** ClawHub skills contained malicious patterns — independent full-registry
  audit (u/balwinder_code, Reddit r/cybersecurity, ~2026-02).
- **157 confirmed malicious** of 98,380 skills across two registries; 632 vulnerabilities, 13 techniques,
  avg 4.03 vulns/skill; >50% from ONE threat actor doing templated brand impersonation; 100% removed
  after responsible disclosure — "Do Not Mention This to the User", arXiv 2602.06547, USENIX Sec 2026.
- **80% attack success rate** on frontier models from skill-file injections — Skill-Inject benchmark
  (202 injection-task pairs), arXiv 2602.20156 (2026-02-23). Data exfiltration, destructive actions,
  ransomware-like behavior; authors conclude model scaling won't fix it.

**Incidents and research, chronological**
| Date | Event | In the wild? |
|---|---|---|
| 2025-04-01 | **MCP tool poisoning** (Invariant Labs): malicious instructions hidden in MCP tool *descriptions* — invisible to users, obeyed by the model; chains cross-tool exfil. | Research demo |
| 2025-04-07/11 | **WhatsApp MCP rug pull**: tool description changed *after* user approval → message exfil. Invariant ships **mcp-scan** (detects poisoning + rug pulls). | Research demo |
| 2025-08 | Docker "MCP horror stories" supply-chain writeup. | Analysis |
| 2025-09-25 | **postmark-mcp** — first malicious MCP server found on npm (Koi Security): typosquat/clone of legit package; v1.0.16 added one line BCC-ing all sent email to attacker. | **YES** |
| 2025-10 | **CVE-2025-59536** (CVSS 8.7): Claude Code repo `.claude/settings.json` hooks executed arbitrary shell the moment a cloned project opened — *before the trust dialog*. Patched v1.0.111 (2025-10). | Exploit path, patched |
| 2025-10 | **CVE-2025-53967**: unauth RCE (command injection) in popular `figma-developer-mcp` server ≤0.6.2. | Vulnerability |
| 2025-10/11 | **PromptArmor "Hijacking Claude Code via injected marketplace plugins"** (exact date UNVERIFIED): plugin hooks overwrite `settings.local.json` to permanently allow `curl` / PreToolUse hook auto-approves; a plugin "command" (prompt) then exfils codebase to a fake RAG service. Distribution vector: third-party marketplace aggregator sites + fake "Anthropic" GitHub account. | Research demo |
| 2025-12-02 | **Cato CTRL: MedusaLocker ransomware delivered via Claude Skills** — controlled PoC: seemingly benign skill executes full ransomware chain (Axios/SCMagazine coverage). NOT observed in the wild. | PoC only |
| 2025-12-16 (fix) | **Sonar**: pre-trust code execution in Claude Code — `git config` abuse (`core.fsmonitor`; `log.showSignature`+`gpg.program`) via git commands run before trust, plus `apiKeyHelper` and hooks loading from `.claude/settings.json`. Fully patched v2.0.71; writeup 2026-04-30. | Exploit path, patched |
| 2026-01 (fix 2026-01) | **CVE-2026-21852** (CVSS 5.3): project-level config could route Claude Code API traffic through attacker server → silent key harvesting. Patched v2.0.65. | Exploit path, patched |
| 2026-01 | **Prompt Security: marketplace "dependency helper" skill** tricks the agent into `npm install`ing attacker-chosen packages — the plugin.json-era equivalent of postinstall risk (no script needed; the agent IS the script). | Research demo |
| 2026-02-03/10 | **Koi Security "ClawHavoc"**: 341 malicious skills of 2,857 audited on ClawHub; Atomic macOS Stealer (AMOS) distribution; one threat actor. Broadcom bulletin 2026-02-10. | **YES** |
| 2026-02-05 | **Snyk ToxicSkills** (numbers above); scanner built on Invariant's mcp-scan engine; ecosystem grew ~10x in weeks (<50 → >500 daily submissions). | **YES** |
| 2026-02-06 | arXiv 2602.06547 (157 malicious / 98,380; above). | **YES** |
| 2026-02-15 | **SkillJect** (arXiv 2602.14211): first *automated* framework for generating poisoned skills — Attack/Victim/Evaluate agent loop; payload hidden in helper script, SKILL.md rewritten with "front-loaded inducement" framing the script as mandatory prerequisite. ASR percentages not in abstract (UNVERIFIED). | Research |
| 2026-02-23 | **Skill-Inject** (arXiv 2602.20156, 80% ASR; above). | Research |
| 2026-04 | **Pluto Security** practitioner guide to Claude skills/connectors/plugins; incl. Hookify disclosure: files planted in a trusted repo steer the model into leaking secrets; Anthropic closed as "working as designed" (trusted-dir contents are trusted). | Research + disclosure |
| 2026-04-30 | Sonar writeup published (above). | — |
| 2026-05-06 | **CSA research note "Agent Context Poisoning"**: SKILL.md is a supply-chain attack surface that "is not a code path — it is a document agents are designed to trust"; hidden **Unicode Tag chars (U+E0000–U+E007F)** invisible to humans but semantically processed by models; recovers both CVEs above; recommends registry allowlists, hash verification, provenance standards, content signing, OWASP Agentic Skills Top 10 engagement. | Analysis |
| 2026-05-11 | **Datadog Security Labs — dynamic-context execution BEFORE defenses**: Claude Code `!`cmd`` preprocessing runs "before Claude sees anything"; malicious "Clawsights" skill stole GitHub token (`gh auth token` + curl) during preprocessing; Opus 4.6 later *said it refused* — the theft had already run; Opus 4.7 ran the plain malicious skill. Real incident variant observed in Datadog's own agent monitoring. Applies to any harness with preprocessing hooks in skills/commands. | **YES** (analysis + real incident) |
| 2026-06-23 | **Unit 42 ClawHub follow-up**: 5 malicious skills evaded BOTH VirusTotal and ClawScan (Feb–May 2026): TradingView-themed macOS infostealer "cluw"; "omnicogg" padded README to ~22 MB to blow past scanner size limits (passed VT clean); "money-radar" runtime agentic affiliate injection; "letssendit" agentic front-running pump-and-dump (installed agents pooled SOL to operator wallet). ClawHub added NVIDIA screening 2026-06-01. | **YES** |
| 2026-08-18 | **Red Hat "Securing Claude Code plug-ins"**: marketplace has "no centralized vetting, no code signing, no runtime sandboxing"; thesis "plug-in security is really repository security"; SKILL.md called the most dangerous surface (prose no scanner can fully analyze); recommends Sigstore/SLSA provenance, OIDC trusted publishing, immutable tagged releases. | Guidance |

Secondary/scale numbers (weaker provenance, label as such in deck): Bitdefender ~17% of early ClawHub
skills malicious (per Unit 42 citing Bitdefender); AuthMind 230+ malicious skills (2026-02); arXiv
2604.06550 (2026-04): 13–26% of 13k+ ClawHub skills flawed; ClawHub size reported 31k (Feb 2026) up to
~60k (mid-2026, UNVERIFIED).

**Key structural lessons for the registry (from the corpus)**
1. **The two dominant attack strategies are negatively correlated** (arXiv 2602.06547): credential theft
   via RCE vs agent manipulation via hidden instructions in documentation. A scanner for one misses the
   other; you need both static+dynamic and LLM-based review.
2. **Scanning is necessary but not sufficient**: Unit 42 proved real evasions (size padding, off-platform
   paste-site lures, runtime-fetched affiliate links). Any "scanned = safe" claim is a lie we must not
   make.
3. **The agent is the postinstall script**: Prompt Security's dependency hijack + Datadog preprocessing
   mean a "skill-only" artifact with zero code can still cause code execution. Content inspection, not
   just code scanning, is mandatory.
4. **Rug pulls are the registry-native attack** (postmark-mcp, WhatsApp MCP, Invariant): version N is
   clean, N+1 is malicious. Per-version scanning + version-diff visibility is the counter.
5. **One actor can own half a malicious corpus** (2602.06547: >50% of 157) via templated impersonation →
   namespace verification + publisher reputation would have caught most of it.
6. **Responsible disclosure works**: 100% of 157 reported skills were removed by registry maintainers —
   a takedown process is a real control, not theater.

## 2. Per-harness trust mechanisms (Phase 1 files + 2026-10-16 live spot-checks)

**Claude Code v2.1.302** — richest defense set; enterprise-first.
- Sources hardened at marketplace layer (verified in marketplace-reference docs, 2026-10-16): npm source
  packages' install scripts "such as preinstall or postinstall **never run**"; plugin Node deps install
  frozen with scripts disabled; `archive` source requires `sha256` (64 hex) and refuses mismatches; git
  sources accept full 40-char `sha` pinning; `strict` entries (default) control component merging.
- CLI: `claude plugin install -y|--accept-command <sha256>` gates the one executable source type
  (`command`); admins block it with `disableCommandPluginSources` (managed-only). `claude plugin validate
  --strict --json` = pre-publish gate; `claude plugin eval` = CI gating.
- Managed settings cannot be overridden by users; security keys verified in settings-reference
  (2026-10-16): `disableSkillShellExecution` ("stop skills and custom commands from running inline
  shell" — kills the Datadog preprocessing vector), `allowManagedHooksOnly`, `disableAllHooks`,
  `disableSideloadFlags` (reject `--plugin-dir`/`--plugin-url`/`--agents` sideloads),
  `disableCommandPluginSources`, `skillOverrides`, `disableBundledSkills`, `allowManagedPermissionRulesOnly`.
- Permission modes: `auto`/`bypassPermissions` cannot be set from project/local settings (user/managed/
  flag only) — blocks repo-escalation of autonomy. `enabledPlugins` "waits for trust" before applying to
  teammates. `flagged-plugins.json` exists on disk. Per-marketplace auto-update is opt-in.
- Gaps: skills/agents/commands are plain file drops (no signature, no hash check on load); SKILL.md prose
  unanalyzable by scanners; no first-party lockfile (version → marketplace entry → commit sha resolution).

**Codex rust-v0.163.0** — trust-gated project layer + hook review; strongest hook discipline.
- Project `.codex/` layers (rules, hooks, config, agents) load ONLY when trusted:
  `[projects."<path>"] trust_level = "trusted"` or interactive approval.
- Plugin hooks are **skipped until the user reviews/trusts the hook definition**, and plugins with hooks
  are **not eligible for the public directory** — the only harness that structurally down-ranks hooks.
- requirements.toml (admin, outranks all user config; MDM above it): `allow_managed_hooks_only = true`
  (kills user/project/session/plugin hooks), `features.plugin_sharing = false`, `allowed_approval_policies`,
  `allowed_sandbox_modes`, `allowed_permission_profiles`, `default_permissions`.
- Sandboxing: `sandbox_mode` read-only/workspace-write/danger-full-access; Starlark exec-policy
  `prefix_rule()` files with self-tests; granular `approval_policy` incl. `skill_approval`; kill switch
  `[features] hooks = false`; headless `--ignore-user-config` / `--ignore-rules`.
- Marketplace sources support npm (`package`/`version`/`registry`) and `git-subdir` with `sha` — whether
  npm-source install scripts run: UNVERIFIED (docs silent).
- Gaps: no cross-layer hook exclusivity (all layers merge); skills are file drops; marketplace.json is
  not part of the agent-plugins spec (federated trust is per-marketplace, i.e., per-repo).

**OpenCode 2.0.x** — permissions/policies engine, no registry-side trust.
- Permissions v2: array of `{action, resource, effect}` statements; per-tool `allow|ask|deny` incl.
  `skill` (invocation gating) and `task`; defaults deny reads of `.env*` (except `.env.example`);
  `doom_loop`/`external_directory` ask; per-agent frontmatter overrides; `--auto` flag auto-approves
  non-denied (documented convenience, elevates risk).
- Policies (stable v2.0.29, 2026-10-14): `provider.use` etc.; **global config overrides project** — a
  repo cannot re-enable a globally denied provider. Enterprise channel: managed/MDM configs
  (`/etc/opencode/`, `%ProgramData%`, `ai.opencode.managed`) + remote `.well-known/opencode` org
  defaults (servers land disabled until local `enabled: true`).
- Kill switches: `OPENCODE_DISABLE_CLAUDE_CODE=1`, `..._PROMPT=1`, `..._SKILLS=1` (v2.0.30, 2026-10-15)
  cut off the compat surface that silently reads `~/.claude/skills`.
- Gaps: plugins are plain npm packages via `opencode plugin add pkg@ver` — inherits npm's FULL
  postinstall script surface (unlike Claude's marketplace layer); v1→v2 break fragments trust decisions;
  skills HTTP catalog (`index.json`) has no signature/auth in the documented schema — whoever hosts the
  URL owns the content (registry-ready surface needs us to add integrity).

**Pi 1.3.0** — minimal core, one trust gate, one real hole.
- Project trust: everything under `.pi/` (mcp.json, settings, extensions, skills, prompts, themes,
  SYSTEM.md) loads only after user grants trust (`defaultProjectTrust: ask|always|never`).
- **Hole (verified in source, package-manager.ts)**: `.agents/skills` ancestors up to git root are NOT
  trust-gated — a cloned repo can ship skills that load with zero prompts. AGENTS.md context files also
  un-gated (same on all harnesses).
- No permission system, no sandbox by default ("YOLO mode"); extensions are TS loaded **in-process with
  full OS permissions** (jiti); mitigations: codemode runs model-written JS in a QuickJS sandbox;
  `sourceInfo` provenance recorded on every resource (0.62.0); install filter arrays (`!glob`) can't
  expose undeclared resources; own README installs with `--ignore-scripts`.
- npm IS the registry → inherits npm provenance (integrity+signature on tarballs, audit surface,
  provenance attestations) but also npm's typosquatting and account-takeover risks.

**Cross-harness defense matrix (who blocks what today)**
| Defense | Claude | Codex | OpenCode | Pi |
|---|---|---|---|---|
| Project/repo trust gate before load | partial (enabledPlugins wait; hooks pre-trust patched) | **yes** (`.codex/` gated) | no (config merge; `.opencode/` ungated) | **yes** (`.pi/` gated; `.agents/skills` NOT) |
| Hooks constrained | managed-only allowlist, disableAllHooks | **review-before-run; banned from directory** | none (plugins ARE code) | extensions in-process, full perms |
| Install scripts neutralized | **yes** (npm source never runs scripts) | UNVERIFIED for npm source | **no** (npm semantics) | **no** (npm semantics) |
| Hash/sha pinning | sha256 archives, git sha, `--accept-command` | git-subdir `sha`, npm version | `pkg@version`, catalog per-version cache | `npm:pkg@ver`, `git:...@ref` |
| Admin lock-down | managed-settings.json (unoverridable) | requirements.toml + MDM | managed/MDM + `.well-known` | none |
| Sandbox for artifacts | none plugin-scoped | sandbox_mode + Starlark rules | permissions (ask/allow), no OS sandbox | none (QuickJS codemode only) |
| Lockfile | none (resolution chain only) | none (TOML pins) | none | `.pi/settings.json` arrays (project pins) |

## 3. Threat table (threat × vector × harness exposure × in wild × registry-side mitigation)

| # | Threat | Vector (artifact type) | Harness exposure | Observed in wild? | Registry mitigation |
|---|---|---|---|---|---|
| T1 | Malicious skill: prompt injection + malware combo | skill | ALL (skills universal; Claude/Codex/OpenCode/Pi all auto-discover) | YES — Snyk 76; Koi 341; Reddit 2,371; arXiv 157 | Publish-time static+LLM+dynamic scan (mcp-scan engine); fail-visible badges; takedown SLA |
| T2 | Skill-squatting / brand impersonation / typosquatting | skill, plugin, MCP name | ALL | YES — Snyk (polymarket-traiding-bot); arXiv 2602.06547 (>50% of malicious from one impersonator); fake "Anthropic" GitHub orgs (PromptArmor) | Reverse-DNS namespaces + GitHub OAuth/DNS-TXT verification (MCP Registry model); lookalike detection at publish |
| T3 | Rug pull / version mutation after approval | skill, plugin, MCP, marketplace source | ALL (no harness pins by content across updates except explicit sha) | YES — postmark-mcp; WhatsApp MCP; Unit 42 runtime-fetched payloads | Immutable versions; per-version re-scan + human-readable diff on every bump; lockfile + change alerts |
| T4 | Hidden instructions in tool descriptions (MCP tool poisoning) | MCP server | ALL (all four speak MCP; descriptions enter context) | YES (research + real servers; OWASP/CSA catalogued) | mcp-scan-style description inspection at publish AND on each version; schema lint for Unicode-tag/homoglyph hiding |
| T5 | Pre-injection command execution (dynamic context `!`cmd``, preprocessing hooks) | skill, command | Claude (native `!` preprocessor); Pi/OpenCode commands have shell-injection `!`cmd`` too; Codex via hooks | YES — Datadog Clawsights + real incident; CSA CVE-2025-59536 hooks pre-trust | Static rule: flag `!`/`$(` + network cmd combo; capability declaration field ("needs-shell") surfaced at install; scan-on-install hook |
| T6 | Plugin hooks that self-approve / rewrite permissions | plugin (hooks), settings | Claude (PreToolUse deny/block, settings overwrite); Codex (hooks merge); OpenCode/Pi (extensions are code) | YES — PromptArmor HITL bypass (settings.local.json curl allow) | Hooks/extensions = highest trust tier: require explicit diff review at install, default-disabled, Codex-style review gate; publish policy: hook-bearing artifacts need audit before listing |
| T7 | Agent-as-postinstall: skill instructs agent to install malicious deps | skill (prose), plugin | ALL (no harness inspects intent) | Research demo — Prompt Security dependency hijack (2026-01) | LLM-behavior scan (SkillJect/Skill-Inject style red-teaming at publish); dependency-policy metadata |
| T8 | Ransomware / destructive payload via skill | skill | ALL (skills can invoke shell) | PoC — Cato MedusaLocker (2025-12-02); "ransomware-like behavior" in Skill-Inject | Same as T1 + severity-based immediate delist |
| T9 | Credential/secret theft (SSH keys, AWS, gh tokens, browser cookies) | skill, MCP package, extension | ALL; Pi extensions in-process = worst | YES — AMOS/cluw infostealers (Koi, Unit 42); mcp-figma/mcp-blender evil versions (2025); Datadog gh-token exfil | Secret-access pattern rules (reach/egress per Red Hat guide); egress-domain allowlist declared in manifest |
| T10 | Scanner evasion (size padding, off-platform lures, obfuscation, Unicode tags) | skill, MCP | ALL (registry-side concern) | YES — Unit 42 omnicogg 22 MB padding; CSA Unicode-tag hiding | Size/entropy limits; deobfuscation pass; forbid off-platform "prerequisite" URLs; human review tier for evasive-pattern hits |
| T11 | Marketplace/repo compromise of a *benign* publisher | marketplace, plugin repo | ALL | YES pattern from npm ecosystems; Hookify disclosure (pluto) adjacent | Publisher 2FA, OIDC trusted publishing, immutable released artifacts, lockfile pinning to sha |
| T12 | Pre-trust code execution via repo config (git config, settings.json, apiKeyHelper) | repo-embedded config/hooks (adjacent to registry) | Claude (CVE-2025-59536, Sonar chains, CVE-2026-21852 — all patched) | Exploit paths, patched | Out of registry scope, but registry must never auto-clone-and-trust; install = explicit act |
| T13 | Trust-gate bypass via un-gated discovery paths | skill (`.agents/skills` ancestors) | Pi (verified hole); AGENTS.md ungated everywhere | Design flaw, not yet exploited publicly | Registry docs warn; emit installs to gated locations; report upstream holes |
| T14 | Agentic fraud: skills monetizing the agent at runtime (affiliate injection, pump-and-dump) | skill | ALL | YES — Unit 42 money-radar, letssendit | Behavioral scanning; economic-incentive heuristics (new: keep rules updated) |

## 4. Mitigation menu, ranked for a registry operator (cost × effectiveness, evidence-based)

1. **Namespace verification (reverse-DNS + GitHub OAuth / DNS-TXT)** — MCP Registry model
   (`io.github.<user>` via OAuth; `com.example` via DNS TXT). Cost: low. Effect: kills T2/impersonation,
   which was >50% of one malicious corpus. Adopt day 1.
2. **Publish-time static + LLM + dynamic scanning, results public (Audits model)** — skills.sh runs 3
   providers (Snyk, Socket, agent-trust scanner; live 2026-02-17); Snyk's engine (mcp-scan-based)
   claimed 90–100% recall on confirmed-malicious, 0 FP on top-100 skills.sh. Cost: medium (licensing or
   build on mcp-scan/skills-ref). Effect: catches T1/T4/T9 bulk. NOT sufficient alone (Unit 42
   evasions) — publish badges, not promises. Adopt day 1.
3. **Immutable versions + content hashes in every record (sha256), lockfile emission** — precedent:
   Claude archive sha256/git sha, Codex sha, OpenCode per-version cache, pi npm@ver,
   `skills generate-lock`. No cross-harness lockfile exists (whitespace we fill). Cost: low-medium.
   Effect: pins T3/T11 blast radius, enables reproducible installs. Adopt day 1.
4. **Never-execute install path** — registry CLI performs file-drops/CLIs only; no postinstall, no
   shell source by default (Claude's marketplace already proves npm-without-scripts works at scale).
   For OpenCode/Pi npm-distributed artifacts: emit exact `pkg@version` pins and prefer copying content
   over lifecycle scripts; publish guidance. Cost: low. Effect: removes an entire npm-era attack class.
   Adopt day 1.
5. **Hook/extension disclosure + trust tiering** — anything that ships hooks, extensions (code), or
   MCP servers lands in a "requires review" tier with human-readable diff at install; skills-only
   artifacts default tier. Codex precedent: plugin hooks skipped until reviewed + banned from public
   directory. Cost: medium. Effect: contains T5/T6 (the scariest class). Adopt day 1 (policy) —
   automated diff tooling phase 2.
6. **Takedown + responsible-disclosure pipeline with published history** — evidence: 100% of 157
   disclosed skills removed (arXiv 2602.06547); ClawHub removed Unit 42's five. Cost: low. Effect:
   high for users who check. Adopt day 1.
7. **Reputation/install telemetry with anti-gaming guards** — install counts (skills.sh shows them;
   top skill ~3.9M installs) but ClawHub showed trivial gaming (1-week-old accounts, 40+ skills/actor).
   Publisher age, verification status, cross-artifact flags. Cost: low. Effect: weak alone; useful
   ranking signal. Phase 2.
8. **Human review tier ("verified" badge)** — Anthropic marketplace precedent. Cost: high, doesn't
   scale past curated set. Effect: high for the top-N artifacts most users install. Phase 2 (curated
   tier only).
9. **Scan-on-install (client-side hook) + registry CLI integration** — skills.sh issue #1292 proposes
   optional install-time scan; mcp-scan runnable as `uvx mcp-scan@latest --skills`. Cost: medium.
   Effect: defends against post-publish rug pulls and registry compromise. Phase 2.
10. **Signing/provenance (Sigstore/cosign, SLSA attestations)** — **no standard exists and no harness
    consumes signatures today** (UNVERIFIED whether any agent verifies artifact signatures at load).
    Proposals only: Agent-Skills-as-OCI-artifacts spec (ThomasVitale, 2026-04), Ken Huang signing
    service, Sigstore/A2A agent-card signing (Luke Hinds); Red Hat guide recommends Sigstore/SLSA for
    plugin publishing. Cost: high. Effect: low until a harness consumes it. Phase 3 — publish signed
    tarballs early (cheap insurance), gate on spec adoption.
11. **TEE / scan-on-publish with isolated build** — treats publish pipeline as untrusted; justified
    only at scale (ClawHub added NVIDIA screening 2026-06-01 after repeated incidents). Phase 3.
12. **Sandboxed install: symlink vs copy** — vercel-labs/skills symlinks ONE canonical copy into every
    agent dir (dedup, instant updates, offline) vs file-copy (frozen, immune to upstream mutation,
    survives source deletion). Security tradeoff: symlink = silent mutation channel (rug-pull-friendly);
    copy = drift/stale-security-fix risk. Recommendation: copy by default + registry version pin +
    explicit `update` command (re-scan on update). Day 1 (choice is structural).

## 5. Recommended trust ladder for our registry MVP

**Ship day 1 (all four tiers cheap; evidence: every 2026 incident abused their absence)**
1. Verified namespaces only (GitHub OAuth for `io.github.*`-style; DNS TXT for domains) — no anonymous
   publishing. (Attacks blocked: impersonation that drove >50% of one corpus.)
2. Publish-time scan gate: static rules + LLM inspection (mcp-scan engine / Snyk-style) + basic dynamic
   detonation; results as visible badges (pass/warn/fail), fail = unlisted pending review. Public
   methodology. (Blocks T1 bulk; visibly honest about limits.)
3. Immutable, hashed, versioned artifacts: sha256 in record; semver; per-version re-scan; visible
   version-to-version diff (rug-pull defense T3).
4. Lockfile: registry emits one cross-harness lockfile (artifact → version → sha256 → per-harness
   install targets); no harness has this — our differentiation.
5. Trust tiers by artifact type: skills = default; MCP = declared-egress manifest; hooks/plugins/
   extensions = review tier with install-time diff, disabled until confirmed (Codex precedent).
6. Never-execute installer; npm-source artifacts published content-only (scripts never run) — matches
   Claude marketplace behavior, extends it to OpenCode/Pi paths.
7. Disclosure inbox + takedown SLA + public incident log (proven: 157/157 removed on disclosure).
8. Copy-not-symlink installs pinned to version (anti-rug-pull default; `update` triggers re-scan).

**Phase 2 (post-MVP)**: reputation with anti-gaming (publisher age, cross-artifact clustering,
   verified-org badges), curated human-review tier for top installs, optional client-side scan-on-install
   hook, behavior red-teaming in publish pipeline (SkillJect/Skill-Attack style), agentic-fraud rules
   (Unit 42 patterns), upstream trust-hole reports (Pi `.agents/skills` ancestors, AGENTS.md ungated).

**Phase 3**: Sigstore signing + SLSA provenance on tarballs (publish now, verify when a harness
   consumes — track agent-plugins spec governance); TEE-isolated publish pipeline; federated audit
   sharing with skills.sh/ClawHub/MCP Registry (aggregators already exchange MCP Registry OpenAPI data).

**Argument**: every day-1 item maps to a verified in-the-wild incident (36.82% flawed skills, 2,371
malicious patterns, 76 confirmed, 80% ASR, pre-injection execution, HITL-bypass hooks). Nothing in day 1
depends on unfinished standards; signing waits because no consumer exists. The registry's honest posture:
scanning reduces risk, verification anchors identity, pinning contains blast radius — none of it makes
third-party skills "safe", and the UI must say so.

## 6. Sources (accessed 2026-10-16 unless noted)

- Snyk ToxicSkills: https://snyk.io/blog/toxicskills-malicious-ai-agent-skills-clawhub (2026-02-05); repo github.com/snyk-labs/toxicskills-goof
- Reddit full-ClawHub audit (2,371/31,000): https://www.reddit.com/r/cybersecurity/comments/1s2f1r5/i_audited_all_31000_skills_on_openclaws_clawhub
- arXiv 2602.06547 "Do Not Mention This to the User" (USENIX Sec 2026): https://arxiv.org/abs/2602.06547
- Skill-Inject: https://arxiv.org/abs/2602.20156 (2026-02-23); benchmark skill-inject.com
- SkillJect: https://arxiv.org/abs/2602.14211 (2026-02-15)
- Koi ClawHavoc via Broadcom: https://www.broadcom.com/support/security-center/protection-bulletin/malicious-clawhub-skills (2026-02-10)
- Unit 42 ClawHub: https://unit42.paloaltonetworks.com/openclaw-ai-supply-chain-risk (2026-06-23)
- Cato CTRL MedusaLocker: https://www.catonetworks.com/blog/cato-ctrl-weaponizing-claude-skills-with-medusalocker (2025-12-02); Axios https://www.axios.com/2025/12/02/anthropic-claude-skills-medusalocker-ransomware
- Datadog dynamic-context: https://securitylabs.datadoghq.com/articles/malicious-skills-supply-chain-risks-in-coding-agents-with-dynamic-context (2026-05-11); real incident: https://www.datadoghq.com/blog/ai-agent-security-lessons; pre-first-prompt follow-up: https://securitylabs.datadoghq.com/articles/coding-agent-project-trust-code-execution-before-first-prompt (2026-08)
- CSA "Agent Context Poisoning": https://labs.cloudsecurityalliance.org/research/csa-research-note-skill-md-agent-context-poisoning-20260506 (2026-05-06)
- Sonar pre-trust execution: https://www.sonarsource.com/blog/claude-arbitrary-code-execution (2026-04-30)
- Invariant Labs: tool poisoning https://invariantlabs.ai/blog/mcp-security-notification-tool-poisoning-attacks (2025-04-01); WhatsApp rug pull https://invariantlabs.ai/blog/whatsapp-mcp-exploited (2025-04-07); mcp-scan https://invariantlabs.ai/blog/introducing-mcp-scan (2025-04-11)
- postmark-mcp: Snyk https://snyk.io/blog/malicious-mcp-server-on-npm-postmark-mcp-harvests-emails (2025-09-25); BleepingComputer https://www.bleepingcomputer.com/news/security/unofficial-postmark-mcp-npm-silently-stole-users-emails
- figma-developer-mcp RCE CVE-2025-53967: https://nvd.nist.gov/vuln/detail/CVE-2025-53967; Imperva https://www.imperva.com/blog/another-critical-rce-discovered-in-a-popular-mcp-server
- PromptArmor marketplace hijack: https://www.promptarmor.com/resources/hijacking-claude-code-via-injected-marketplace-plugins (date UNVERIFIED)
- Prompt Security dependency hijack: https://prompt.security/blog/when-your-plugin-starts-picking-your-dependencies-marketplace-skills-and-dependency-hijack-in-claude-code (2026-01)
- Red Hat securing Claude Code plug-ins: https://developers.redhat.com/articles/2026/08/18/securing-claude-code-plug-ins-best-practices-repository-security (2026-08-18)
- Pluto Security practitioner guide: https://pluto.security/blog/claude-extension-ecosystem-security-practitioner-guide (2026-04)
- skills.sh audits: Vercel changelog https://vercel.com/changelog/automated-security-audits-now-available-for-skills-sh (2026-02-17); Snyk partnership https://snyk.io/blog/snyk-vercel-securing-agent-skill-ecosystem; Socket https://socket.dev/blog/socket-brings-supply-chain-security-to-skills; install-time scan proposal https://github.com/vercel-labs/skills/issues/1292; fail-audit issue https://github.com/vercel-labs/skills/issues/445
- MCP Registry namespace verification: https://github.com/modelcontextprotocol/registry; docs https://modelcontextprotocol.io/registry/about; quickstart https://learn.microsoft.com/en-us/dotnet/ai/quickstarts/publish-mcp-registry
- Signing (no standard; proposals): https://www.thomasvitale.com/agent-skills-as-oci-artifacts (2026-04); https://github.com/ThomasVitale/agents-skills-oci-artifacts-spec; https://kenhuangus.substack.com/p/agent-skill-trust-and-signing-service; Sigstore+A2A https://dev.to/lukhinds/building-trust-in-the-ai-agent-economy-sigstore-meets-agent2agent-44f5
- Harness docs (spot-checked 2026-10-16): https://code.claude.com/docs/en/settings-reference (disableSkillShellExecution, allowManagedHooksOnly, disableAllHooks, disableSideloadFlags, disableCommandPluginSources, skillOverrides, disableBundledSkills); https://code.claude.com/docs/en/plugins/marketplace-reference (npm scripts never run; sha256; strict); https://code.claude.com/docs/en/settings (auto/bypassPermissions scope rule); Codex/Pi/OpenCode facts per Phase 1 files (learn.chatgpt.com llms.txt; opencode.ai/v2/docs; pi.dev/docs/latest; earendil-works/pi package-manager.ts)
- Docker MCP horror stories: https://www.docker.com/blog/mcp-horror-stories-the-supply-chain-attack (2025-08)
- Secondary scale numbers: Bitdefender ~17% + AuthMind 230+ (via Unit 42 / vendor posts, 2026-02); arXiv 2604.06550 (2026-04, 13–26% of 13k+ skills)
