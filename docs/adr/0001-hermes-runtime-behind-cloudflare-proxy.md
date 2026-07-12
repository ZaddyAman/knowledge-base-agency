# ADR-0001: Run Hermes locally behind a Cloudflare proxy

## Status

Accepted — 2026-07-12

## Context

The product must use Hermes as its core runtime agent, not merely as a coding assistant. The public user interface must invoke Hermes without exposing its bearer key or its powerful local tools directly to browser clients. A solo builder must also deliver the integration within an eight-hour on-site sprint.

Hosting Hermes on a new remote machine would remove dependence on the demo laptop, but provisioning, securing, and debugging that environment would consume a large part of the sprint. Calling Hermes directly from browser code would expose credentials and bypass a controllable security seam.

## Decision

Run the pinned Hermes Agent v0.12.0 process inside Ubuntu WSL on the builder's laptop.

The runtime path is:

```text
Cloudflare Pages user interface
  -> Cloudflare Worker proxy
  -> Cloudflare Tunnel
  -> authenticated Hermes /v1/responses API
  -> Hermes Director and delegate_task specialists
  -> qmd MCP retrieval over the pinned document corpus
```

The Worker owns the public request contract and keeps the Hermes bearer key in server-side secrets. It accepts only the narrow operations required by the product. Hermes receives restricted toolsets and a workspace limited to the project.

Convex remains the durable product store for source metadata, answer records, citations, Knowledge Gaps, Gap Interviews, drafts, approval state, run summaries, and evaluation results. qmd supplies retrieval candidates; application code deterministically validates citations before an answer is published.

## Consequences

- Hermes is visibly and substantively the runtime KB Director.
- The public browser never receives Hermes credentials.
- We reuse Hermes delegation, skills, sessions, and logs instead of building an agent framework.
- The demo laptop, WSL, Hermes process, qmd daemon, and Cloudflare Tunnel must remain healthy throughout judging.
- A tunnel or laptop failure must produce a clear unavailable state; the application must not silently fall back to a non-Hermes answer path.
- The Worker proxy and Hermes tool restrictions are security-critical test seams.
- Moving Hermes to hosted compute later does not change the browser-facing interface because the Worker remains the seam.

## Alternatives considered

### Host Hermes remotely during the sprint

Rejected for the MVP because provisioning and securing a new runtime adds too much solo-build risk. It remains the preferred post-event deployment.

### Use Telegram or the Hermes gateway as the primary product surface

Rejected because it does not provide the branded public cited-Q&A and management surfaces required by the demo narrative.

### Call OpenAI directly from Convex and use Hermes only for development

Rejected because Hermes would no longer be the core runtime agency and the build would miss the strongest eligibility and differentiation proof.

### Expose the Hermes dashboard publicly

Rejected because the dashboard is an administrative surface that can expose sensitive configuration and is not the product interface.
