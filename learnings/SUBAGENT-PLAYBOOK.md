# Subagent orchestration playbook — what cracked the Coffee Quest debugging

Distilled from session `sess_e983bb9b` (2026-10-10/11). Context: the VBA
engine appeared dead in COM-driven shows; serial debugging had stalled on
environment hypotheses for a long stretch. Fanning out three non-overlapping
subagents converted that into root causes within minutes. Companion:
`LEARNINGS.md` §5 (summary), `../DEVLOG.md` (what each finding meant).

## 1. When to fan out

Signal that serial debugging has stalled: you are generating *environment*
hypotheses (registry, Office version, zombie processes) faster than you can
falsify them, and each test is slow (PowerPoint restarts, ~30 s+ per trial).
At that point split the work into: **web research** (has anyone documented
this?), **local deterministic experiments** (a real test matrix), and
**documentation** (bank what is already known). Run all three concurrently.

## 2. Role split that worked (non-overlapping scopes)

| Agent | Scope fence | Deliverable |
|---|---|---|
| Web research | "web research only, no local file changes" | matched symptom to PPT FAQ FAQ01152 (lazy VBA project init) with citations |
| Local test matrix | "work only under <project folder>; do NOT edit game_engine.vba, build_deck.js, or the decks; new scripts prefixed `zz_`" | deterministic 0/3 vs 3/3 auto-macro matrix (pre-show Run) + discovered `View.CurrentSlideIndex` unreadable under COM |
| Devlog writer | owns `../DEVLOG.md` only | running debug narrative kept current while the main thread worked |
| Visual judge (presentations agent) | reads rendered PNGs only, no edits | per-slide pass/fail with evidence; caught off-slide banner bleed, collisions |
| Docs finalizer | owns DEVLOG + creates LEARNINGS | distilled reference at delivery |

No two agents could write the same file; nobody but the main thread edited
source. Zero merge conflicts, zero lost work.

## 3. Prompt anatomy for a local experiment agent (the part that saved hours)

Copy this skeleton — the prompt must contain everything the agent would
otherwise spend 20 minutes rediscovering:

1. **Scope fence** — folder, forbidden files, scratch-file prefix (`zz_`).
2. **Key facts** — the observable channel and its vocabulary, verbatim:
   how to read the marker shape
   (`$pres.Slides.Item(1).Shapes.Item("cfgTime").TextFrame.TextRange.Text`),
   what `M|` / `PC|` / `T|` mean, the authored state of the shapes it will
   assert on.
3. **Working code patterns inlined** — e.g. the `InvokeMember` Run form
   that already works on this machine (see LEARNINGS §3.2).
4. **CRITICAL RULES** — the machine hazards the agent must not rediscover
   the hard way: `taskkill /IM POWERPNT.EXE /F` + 2 s wait before every
   run; NEVER `Application.Run` during a live slideshow (modal dialogs on
   the user's screen); per-run timeout guidance.

## 4. Experiment design: one variable, fixed trials

The matrix agent varied exactly one thing — pre-show macro Run present vs
absent — at 3 trials per arm, everything else held constant (same file, same
open flags). Result: 0/3 vs 3/3 auto-macro firing. That is a claim, not an
anecdote, and it killed ~8 environment hypotheses at once (read-only,
windowless, trusted-location, resiliency, hardware accel were all
subsequently shown irrelevant). When a hypothesis can be made deterministic,
spend the agent on determinism before spending it on breadth.

## 5. Mid-run augmentation

New information arrived while agents were running (e.g. "test the pre-show
PING arm too"). Don't wait for completion: send a message into the running
agent adding the new matrix cell. Cheaper than a second agent, keeps one
experiment owner.

## 6. Main-thread discipline while waiting

- Do non-overlapping local work (write README, save memory files, update
  todos) — never idle-poll agent outputs.
- Rely on completion notifications; do not read agent output files
  mid-flight.
- The main thread synthesizes: it alone merges agent findings into root
  causes and docs (the research agent supplied the mechanism, the matrix
  agent supplied the proof, the main thread wrote the conclusion).

## 7. Visual-judge contract (QA loop)

Render slides to PNG first (`export_pngs.ps1`, 1920x1080), then judge with
an agent given: the image paths, what each slide *should* contain, the list
of previously-found defects to re-verify, and explicit callouts of
intentional style ("8-bit pixel look is intended", "slide 13 has no timer
bar by design") so they are not reported as defects. Require a strict
output format — one JSON verdict line per page:

```json
{"page": 13, "verdict": "pass" | "fail", "issues": ["evidence + location", ...]}
```

This loop took the deck 10/13 -> 13/13 and later caught a cosmetic overlap
(sun/moon under the "SLIDE 01/13" score text; moved x 0.556 -> 1.8 in
`build_deck.js`). A judge agent is reusable via follow-up messages for
re-judges after fixes.

## 8. Artifacts (post-hoc audit trail)

Subagent prompts and outputs live under
`C:\Users\aryan\.zcode\cli\agents\<parent-session>\agent_<id>\`
(`metadata.json` = full prompt + profile, `output.txt` = final report).
Useful when auditing later what an agent was actually told — grep these
instead of replaying the session.
