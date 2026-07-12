# Upstream audit: `mattpocock/skills`

Audited: 2026-07-12  
Scope: the official [`mattpocock/skills`](https://github.com/mattpocock/skills) repository only. Local `SKILL.md` contents were deliberately not inspected as part of this upstream audit.

## Executive finding

The current upstream catalog contains **21 skills**. The local directory inventory supplied for comparison contains **14 names**, but `find-skills` is not in Matt Pocock's upstream catalog. Therefore the machine appears to have **13 of 21 canonical skills**, plus one third-party skill. Its catalog is **not complete**.

The installed canonical names look substantially current with the upstream v1.1 workflow because they include `to-spec`, `to-tickets`, `implement`, and the graduated `wayfinder`, rather than the retired `to-prd`, `to-plan`, and `to-issues` names. However, filename-level inventory cannot prove that the contents of those installed skills match the latest release. Upstream identifies **v1.1.0, released 2026-07-08**, as the latest release; a content/version comparison would be required to prove exact freshness. See the official [v1.1.0 release](https://github.com/mattpocock/skills/releases/tag/v1.1.0) and [changelog](https://github.com/mattpocock/skills/blob/main/CHANGELOG.md).

Most importantly for this project, the local set lacks:

- `setup-matt-pocock-skills`, which upstream says to run once per repository before the other engineering skills;
- `code-review`, which `implement` expects at closeout;
- `diagnosing-bugs`, the supported broken-product on-ramp;
- `grill-with-docs`, the planning interview that also maintains the domain model.

The strongest structured build workflow for this hackathon is therefore:

```text
setup-matt-pocock-skills (once)
  → wayfinder (already appropriate for this greenfield, multi-session-sized build)
  → grill-with-docs (resolve product decisions and sharpen CONTEXT.md/ADRs)
  → to-spec
  → to-tickets
  → implement
       ↳ prototype only at uncertain design seams
       ↳ tdd at pre-agreed behavioral seams
       ↳ code-review before commit
  → diagnosing-bugs whenever a test or live path breaks
  → handoff at a session boundary
```

For an eight-hour solo sprint, this should be applied lightly: one setup, one concise spec, a small dependency graph of tracer-bullet tickets, and implementation in end-to-end slices. `wayfinder` should finish its investigation map rather than become a second permanent backlog.

## Canonical upstream catalog

The official README explicitly divides skills by **invocation ownership**, not merely topic: user-invoked skills orchestrate; model-invoked skills contain reusable discipline and can be reached automatically. A user-invoked skill may invoke model-invoked skills, but not another user-invoked skill. This is the key composition rule in the [official catalog](https://github.com/mattpocock/skills#reference).

### Engineering: user-invoked (9)

| Skill | Intended role |
|---|---|
| `ask-matt` | Router that selects a suitable skill or flow. |
| `grill-with-docs` | Planning interview plus domain-language and ADR maintenance. |
| `triage` | Move issues through the configured triage state machine. |
| `improve-codebase-architecture` | Find deep-module opportunities, report them visually, then grill the selected opportunity. |
| `setup-matt-pocock-skills` | Configure tracker, triage labels, and domain-document layout once per repository. |
| `to-spec` | Synthesize the current conversation into a spec and publish it; it does not conduct the interview. |
| `to-tickets` | Turn a plan/spec/conversation into tracer-bullet tickets with explicit blocking edges. |
| `implement` | Execute a spec or ticket set, using `tdd` at agreed seams and `code-review` before committing. |
| `wayfinder` | Map and resolve investigations for a greenfield or huge effort too large for one agent session. |

### Engineering: model-invoked (7)

| Skill | Intended role |
|---|---|
| `prototype` | Throwaway code to answer a state/logic or UI design question. |
| `diagnosing-bugs` | Reproduce, minimize, hypothesize, instrument, fix, and regression-test a bug. |
| `research` | Delegate research against primary sources and save a cited Markdown result in the repository. |
| `tdd` | Red-green-refactor implementation in vertical slices. |
| `domain-modeling` | Sharpen domain language and maintain `CONTEXT.md`/ADRs. |
| `codebase-design` | Reusable deep-module vocabulary and seam-design discipline. |
| `code-review` | Parallel Standards and Spec review of a diff from a fixed point. |

### Productivity (5)

| Invocation | Skill | Intended role |
|---|---|---|
| User | `grill-me` | General planning/design interview without domain-document integration. |
| User | `handoff` | Compact a session so another agent can continue. |
| User | `teach` | Stateful multi-session teaching workspace. |
| User | `writing-great-skills` | Reference discipline for authoring and editing skills. |
| Model | `grilling` | Shared interview primitive used underneath the grilling front doors. |

This list and the descriptions above are taken from the current [official repository README](https://github.com/mattpocock/skills#reference), which is the canonical public index.

## Intended lifecycle and workflow

### 1. Configure the repository once

The official quickstart says to install with `npx skills@latest add mattpocock/skills`, select `setup-matt-pocock-skills`, then run it. The setup captures the issue tracker, triage label vocabulary, and document location. See the [official quickstart](https://github.com/mattpocock/skills#quickstart-30-second-setup).

The setup skill's own upstream instructions say it writes an `## Agent skills` section into the existing `CLAUDE.md` or `AGENTS.md`, plus:

- `docs/agents/issue-tracker.md`
- `docs/agents/triage-labels.md`
- `docs/agents/domain.md`

It supports GitHub, GitLab, local Markdown under `.scratch/`, or a described custom tracker. It also records single-context (`CONTEXT.md` and `docs/adr/` at repository root) versus multi-context domain layouts. It must inspect and confirm rather than guess. See the official [`setup-matt-pocock-skills` source](https://github.com/mattpocock/skills/blob/main/skills/engineering/setup-matt-pocock-skills/SKILL.md).

For this repository, the natural choices are GitHub Issues and a single root domain context.

### 2. Choose the planning on-ramp

The ordinary flow is interview/alignment followed by spec. `grill-with-docs` is preferable to `grill-me` for a codebase because it also sharpens shared terminology and ADRs. The README explicitly recommends grilling when making a change and explains the domain-language benefit in its [alignment and shared-language sections](https://github.com/mattpocock/skills#why-these-skills-exist).

`wayfinder` is situational, not the default spine. Upstream v1.1 specifically positions it as the on-ramp for a greenfield project or huge feature too large for one session, while keeping the grill-led idea-to-ship chain as the main flow. That makes its earlier use on this project defensible, but it should feed the build lifecycle, not replace it. See the [v1.1 changelog's workflow decision](https://github.com/mattpocock/skills/blob/main/CHANGELOG.md#110).

### 3. Publish one spec, then dependency-linked tracer bullets

The v1.1 lifecycle is explicitly:

```text
idea → to-spec → to-tickets → implement
```

`to-spec` replaced `to-prd`. `to-tickets` unifies the old `to-plan` and `to-issues`; it writes tracer-bullet slices with blocking edges. With a real tracker, edges should use native blocker relationships where available; local Markdown uses textual edges. The exact migration and flow are documented in the [official v1.1 changelog](https://github.com/mattpocock/skills/blob/main/CHANGELOG.md#110).

### 4. Implement through feedback loops

`implement` is the workflow owner for a spec/ticket set. The public catalog says it drives `tdd` at pre-agreed seams and closes with `code-review` before committing. `prototype` answers a narrow design uncertainty; it is throwaway, not production implementation. When behavior breaks, `diagnosing-bugs` owns the disciplined diagnosis loop. These responsibilities are summarized in the [official catalog](https://github.com/mattpocock/skills#reference).

Upstream v1.1 promoted `code-review` from an in-progress skill and made it the required closeout target of `implement`; its two axes are Standards and fidelity to the originating Spec. This is why omitting `code-review` leaves the local implementation workflow incomplete. See the [v1.1 release notes](https://github.com/mattpocock/skills/releases/tag/v1.1.0).

### 5. Operate and maintain

- `triage` is for moving external issues through the configured role/label state machine, not for planning the eight-hour build itself.
- `handoff` is useful when the build crosses a session or agent boundary.
- `improve-codebase-architecture` is periodic maintenance; the README suggests it every few days, so it is low priority within a single eight-hour MVP unless the code has already become difficult to change.
- `research`, `domain-modeling`, and `codebase-design` are model-invoked disciplines that support other stages rather than new top-level phases.

## Local completeness/currentness comparison

Local names supplied for the audit:

`codebase-design`, `domain-modeling`, `find-skills`, `grill-me`, `handoff`, `implement`, `improve-codebase-architecture`, `prototype`, `research`, `tdd`, `to-spec`, `to-tickets`, `triage`, `wayfinder`.

### Present canonical skills (13/21)

`codebase-design`, `domain-modeling`, `grill-me`, `handoff`, `implement`, `improve-codebase-architecture`, `prototype`, `research`, `tdd`, `to-spec`, `to-tickets`, `triage`, `wayfinder`.

### Missing canonical skills (8/21)

| Missing skill | Importance to this build |
|---|---|
| `setup-matt-pocock-skills` | **Critical before structured use**; records GitHub tracker and domain-doc conventions. |
| `code-review` | **Critical during implementation**; expected by `implement` before commit. |
| `grill-with-docs` | **High**; best product-decision interview for this codebase and maintains domain docs. |
| `diagnosing-bugs` | **High**; disciplined recovery path during a time-boxed live build. |
| `ask-matt` | Medium; useful router, but a documented project workflow can replace it. |
| `grilling` | Medium/indirect; reusable primitive underneath grilling front doors. |
| `teach` | Low for this hackathon. |
| `writing-great-skills` | Low unless authoring custom skills. |

### Non-canonical local skill

`find-skills` does not appear anywhere in the current official catalog. It may be useful, but it should not be counted as one of the upstream Matt Pocock skills.

### Freshness verdict

- **Names/workflow generation:** appears current with v1.1 because the local set uses `to-spec` and `to-tickets` and includes the now-graduated `wayfinder`. Upstream v1.1 renamed/deleted the older planning skills and codified this flow.
- **Completeness:** definitively incomplete at 13/21 canonical skills.
- **Exact content freshness:** unproven from directory names alone. Verify installed metadata/content against upstream v1.1.0 or run the documented installer/update flow before the event.
- **Functional workflow completeness:** incomplete because `implement` expects `code-review`, while the entire engineering suite expects repository setup first.

## Recommendation for the Knowledge Base Agency sprint

Install or update only the workflow-critical missing skills before locking the environment:

1. `setup-matt-pocock-skills`
2. `grill-with-docs`
3. `code-review`
4. `diagnosing-bugs`

Then use this controlled sequence:

1. Finish the active `wayfinder` investigation map.
2. Run setup once: GitHub Issues, existing project label vocabulary, single-context domain docs.
3. Use `grill-with-docs` to settle only demo-critical decisions.
4. Use `to-spec` once for the judge-visible vertical loop.
5. Use `to-tickets` to create a small dependency graph.
6. Use `implement`; apply `tdd` at retrieval/citation/publication gates and `code-review` at each finished tracer bullet.
7. Use `diagnosing-bugs` only when a reproducible failure appears.
8. Use `handoff` only at an actual session boundary.

This preserves the upstream compositional model while avoiding ceremony that would consume the eight-hour solo build window.

