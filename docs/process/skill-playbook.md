# Skill playbook for the eight-hour build

This project uses Matt Pocock's skills as a lightweight delivery system. The skills provide phase gates and feedback loops; they must not become a second product to maintain during the hackathon.

## Recommended lifecycle

```text
setup-matt-pocock-skills (once)
  -> wayfinder (finish the active decision map)
  -> grill-with-docs (one unresolved decision at a time)
       -> research when a primary-source fact is missing
       -> prototype when behavior or UI needs a concrete experiment
       -> domain-modeling as terminology changes
       -> codebase-design when choosing a durable seam
  -> to-spec (one concise implementation spec)
  -> to-tickets (small dependency graph of vertical tracer bullets)
  -> implement (one frontier ticket at a time)
       -> tdd at pre-agreed behavioral seams
       -> code-review against both standards and the spec
       -> commit only after review
  -> diagnosing-bugs when a reproducible failure appears
  -> handoff only at a real session boundary
```

## Ceremony budget

- Finish planning decisions before the timed implementation sprint where possible; product ideas and plans are allowed starting material, but product implementation must remain on-site.
- Maintain one Wayfinder map, one implementation spec, and one implementation ticket graph. Do not duplicate decisions among them.
- Use no more than five implementation tickets. Each ticket must produce a demonstrable end-to-end behavior.
- Test only the three highest-value seams: citation enforcement, Knowledge Gap lifecycle/publication, and evaluation scoring.
- Do not invoke architecture review, broad triage, or speculative refactoring during the eight-hour sprint.

## Installed-skill audit

| Skill | Build-phase verdict | Exact use in this project |
|---|---|---|
| `wayfinder` | Essential now | Finish the active investigation map. It is an on-ramp, not the permanent implementation backlog. |
| `domain-modeling` | Essential throughout planning | Maintain `CONTEXT.md` whenever Source Document, Source Passage, Knowledge Gap, approval, or answer-status rules are sharpened. |
| `grill-me` | Replace for project decisions | General interview wrapper. Prefer the missing `grill-with-docs`, which combines grilling with domain-document maintenance. |
| `research` | Use selectively | Primary-source work such as the PostHog corpus and Hermes ecosystem audits. Every run must produce one cited repository note. |
| `prototype` | Essential for one decision | Use on the live-surface ticket to compare a small number of throwaway UI or state-flow variants. Keep prototype code off `main`. |
| `codebase-design` | Use at durable seams | Shape the Hermes runtime adapter, evidence/citation gate, and evaluation runner as deep modules with small interfaces. Do not invent seams that have only one real adapter. |
| `to-spec` | Use once | After Wayfinder decisions close, synthesize one implementation spec. Do not use it to reopen the interview. |
| `to-tickets` | Use once | Convert the accepted spec into at most five vertical tracer-bullet tickets with explicit blocking edges. |
| `implement` | Core, currently incomplete | Own one implementation ticket at a time. It requires `tdd` at agreed seams and the currently missing `code-review` before committing. |
| `tdd` | Essential at three seams | Red/green vertical slices for citation enforcement, gap approval/publication, and evaluation scoring. Do not test styling or framework plumbing. |
| `handoff` | Conditional | Use only when moving to a fresh agent/session. It must reference issues and repository docs rather than duplicating them. |
| `triage` | Skip during the sprint | Useful only if external issues or PRs arrive. A solo greenfield build does not need a triage queue. |
| `improve-codebase-architecture` | Post-MVP only | Run after the demo if architectural friction is blocking continued development; its HTML report and grilling loop are too expensive during the sprint. |
| `find-skills` | Discovery only, non-Matt | Useful for finding missing capabilities, but it is from `vercel-labs/skills`, not the Matt Pocock catalog. |

## Missing upstream skills

The local Matt installation contains 13 of 21 canonical skills. Install these four before using the complete workflow:

| Missing skill | Priority | Why |
|---|---:|---|
| `setup-matt-pocock-skills` | Critical | Records GitHub Issues, triage labels, and the single-context domain-document layout assumed by the other engineering skills. |
| `grill-with-docs` | High | Combines one-question-at-a-time grilling with `domain-modeling`; it is the right decision workflow for the open Wayfinder tickets. |
| `code-review` | Critical | Required by `implement`; separately reviews conformance to repository standards and fidelity to the originating spec. |
| `diagnosing-bugs` | High | Creates a tight, deterministic feedback loop before hypotheses or fixes—valuable when live-demo failures consume time quickly. |

Other missing upstream skills are not required for this sprint: `ask-matt`, `grilling` as a directly invoked primitive, `teach`, and `writing-great-skills`. `grilling` may still be installed as a dependency of `grill-with-docs`.

## Wayfinder ticket routing

| Decision ticket | Skills to use |
|---|---|
| [Choose how Hermes becomes the runtime KB Director](https://github.com/ZaddyAman/knowledge-base-agency/issues/3) | `research` -> `grill-with-docs` -> `codebase-design` |
| [Define evidence, citation, and publication authority](https://github.com/ZaddyAman/knowledge-base-agency/issues/4) | `grill-with-docs` + `domain-modeling` |
| [Define the golden demo and evaluation release gate](https://github.com/ZaddyAman/knowledge-base-agency/issues/5) | `grill-with-docs`; record future `tdd` seams |
| [Prototype the live Hermes interaction surface](https://github.com/ZaddyAman/knowledge-base-agency/issues/6) | `prototype` UI branch |
| [Provision Convex and Cloudflare prerequisites](https://github.com/ZaddyAman/knowledge-base-agency/issues/7) | Direct prerequisite task; no specialist skill needed |
| [Freeze the solo-sprint MVP and deployment topology](https://github.com/ZaddyAman/knowledge-base-agency/issues/8) | `grill-with-docs` + `codebase-design` |
| [Produce the hour-by-hour build and proof plan](https://github.com/ZaddyAman/knowledge-base-agency/issues/9) | Finish Wayfinder, then `to-spec` -> `to-tickets` |

## Implementation gates

Every implementation ticket must satisfy this sequence:

1. Read the ticket, `CONTEXT.md`, relevant ADRs, and the implementation spec.
2. Name the public seam and acceptance signal before writing tests.
3. Run one red/green slice at a time where the ticket crosses a protected seam.
4. Typecheck and run the narrow test after each slice.
5. Exercise the ticket's end-to-end user behavior.
6. Run `code-review` from the ticket's fixed-point commit against both standards and spec.
7. Fix review findings, run the full test suite, then commit.

If a failure cannot immediately be explained, switch to `diagnosing-bugs`; do not patch by intuition.

## Sources

- [Official Matt Pocock skills catalog](https://github.com/mattpocock/skills#reference)
- [Upstream lifecycle and completeness audit](../research/matt-skills-upstream.md)
- [Active Wayfinder map](https://github.com/ZaddyAman/knowledge-base-agency/issues/1)
