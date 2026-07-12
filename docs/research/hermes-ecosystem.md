# Hermes Agent ecosystem audit for Knowledge Base Agency

_Audited 2026-07-12 against the local WSL installation and first-party Nous Research sources only._

## Decision

Use Hermes as the actual KB Director, not merely as a build assistant. The shortest credible runtime seam is:

```text
Cloudflare Pages UI
  -> server-side Worker/API proxy (keeps the Hermes bearer key secret)
  -> Hermes OpenAI-compatible HTTP API
  -> Hermes Director + delegate_task subagents
  -> qmd MCP retrieval
  -> app/Convex records for documents, citations, gaps, drafts, runs and evals
```

Hermes' API server is designed for external frontends and preserves the agent's tools, memory and skills. It exposes `/v1/chat/completions`, stateful `/v1/responses`, health and capability endpoints; the bearer key is mandatory and browser origins must be explicitly allowed. ([Nous: API Server](https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server/))

This is preferable to the other seams:

- **Do not use `hermes mcp serve` as the product API.** That direction exposes Hermes messaging conversations to MCP clients; it is not the documented agent-completion surface. Hermes should instead be an MCP _client_ of qmd. ([Nous: MCP](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp/))
- **Do not make Telegram/gateway the primary demo surface.** It proves messaging, but not the required branded public cited-Q&A surface.
- **Do not use the local dashboard as the product UI.** It is an administration surface for configuration, sessions, logs, skills and MCP servers. ([Nous: Web Dashboard](https://hermes-agent.nousresearch.com/docs/user-guide/features/web-dashboard/))

The important boundary is: **Hermes owns planning, delegation, synthesis, gap detection, drafting and retrieval-tool use; the application owns durable product state and deterministic citation/evaluation gates.** Hermes' built-in memory is deliberately tiny, and session search searches conversations rather than uploaded company files. ([Nous: Persistent Memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/), [Nous: Sessions](https://hermes-agent.nousresearch.com/docs/user-guide/sessions/))

## Local installation: verified facts

The installed executable is in WSL at `/root/.local/bin/hermes`:

```text
Hermes Agent v0.12.0 (2026.4.30)
source: /root/.hermes/hermes-agent
git commit: aa88dcc57b1717cbcfb80e4eca580a3a77056702
remote: https://github.com/NousResearch/hermes-agent.git
status at audit: 24 commits behind origin/main (773cf48c5)
```

Windows commands must therefore invoke WSL, for example:

```powershell
wsl.exe /root/.local/bin/hermes --version
wsl.exe /root/.local/bin/hermes status
```

The local CLI/source confirms v0.12.0 contains:

- skills, plugins, memory providers, MCP client/server, sessions, insights, cron, webhooks, dashboard, logs, profiles, gateway and Kanban commands;
- enabled CLI toolsets for files, terminal, web, code execution, skills, memory, session search, delegation and cron;
- the OpenAI-compatible API server, including `/v1/chat/completions`, `/v1/responses` and `/v1/capabilities` ([pinned local-version source](https://github.com/NousResearch/hermes-agent/blob/aa88dcc57b1717cbcfb80e4eca580a3a77056702/gateway/platforms/api_server.py));
- the `delegate_task` implementation ([pinned local-version source](https://github.com/NousResearch/hermes-agent/blob/aa88dcc57b1717cbcfb80e4eca580a3a77056702/tools/delegate_tool.py));
- a bundled opt-in Langfuse plugin ([pinned local-version source](https://github.com/NousResearch/hermes-agent/tree/aa88dcc57b1717cbcfb80e4eca580a3a77056702/plugins/observability/langfuse));
- 124 locally available enabled skills (80 bundled and 44 local), including `llm-wiki`, `ocr-and-documents`, `native-mcp`, `kanban-orchestrator` and `subagent-driven-development`.

### Local versus newer upstream

Do not assume every current documentation command exists in this checkout. Two concrete differences were observed:

| Capability | Local v0.12.0 audit | Current upstream docs |
|---|---|---|
| MCP catalog | `hermes mcp` exposes `add/remove/list/test/configure/login/serve`; no `catalog` or `install` subcommand | Docs describe `hermes mcp catalog` and `hermes mcp install` ([Nous: MCP](https://hermes-agent.nousresearch.com/docs/user-guide/features/mcp/)) |
| Session export | Local help accepts JSONL output plus `--source` / `--session-id` | Current docs additionally describe HTML, trace, Markdown and QMD export formats ([Nous: Sessions](https://hermes-agent.nousresearch.com/docs/user-guide/sessions/)) |

The qmd skill itself is already searchable and inspectable in the local version, so an Hermes update is **not required** for the recommended retrieval path. Pin commit `aa88dcc...` for the event. Only run `hermes update` before the sprint if there is time to repeat the API, delegation, qmd and log smoke tests; an event-day update creates needless regression risk.

## What to reuse

### 1. Hermes Director and subagents

Hermes' `delegate_task` creates isolated children with their own context, terminal and toolset; only their final summaries return to the parent. The official guidance recommends it for reasoning-heavy or parallel work and warns that it is synchronous: interrupting the parent cancels active children. ([Nous: Delegation patterns](https://hermes-agent.nousresearch.com/docs/guides/delegation-patterns/))

Reuse it for the four visible roles:

1. Director creates the run-specific plan.
2. Structurer builds taxonomy/articles using `llm-wiki` rules.
3. Gap Detector identifies unsupported questions and evidence needed.
4. Writer drafts missing material; Retrieval QA checks the 25-question set.

Start a prepared interactive director session:

```powershell
wsl.exe /root/.local/bin/hermes `
  -t delegation,file,terminal,web `
  -s llm-wiki,ocr-and-documents
```

For app-controlled one-shot work, the local CLI supports:

```powershell
wsl.exe /root/.local/bin/hermes -z "<self-contained director prompt>" `
  -t delegation,file,terminal,web `
  -s llm-wiki,ocr-and-documents
```

`-z` is useful for scripts but automatically bypasses approvals. Restrict its toolsets and working directory. For the public chat path, prefer the authenticated HTTP API because it avoids a WSL subprocess per user request and supports streaming/state.

Do **not** introduce Hermes Kanban for the MVP. It is a real durable SQLite task board with dependency links, profiles, isolated workspaces, worker logs and run attempts, but configuring profiles plus a dispatcher is too much surface for an eight-hour solo build. The native delegation trace plus app run log is sufficient. Kanban is a post-core option. ([Nous: feature overview](https://hermes-agent.nousresearch.com/docs/user-guide/features/overview))

### 2. `llm-wiki` for KB operating rules

The installed first-party `llm-wiki` skill already specifies many of the agency behaviors we need: immutable raw sources, taxonomy/index generation, source metadata, freshness/drift checks, provenance markers, contradictions and append-only operational logs. Reuse its procedure rather than inventing a structuring protocol. ([pinned `llm-wiki` skill](https://github.com/NousResearch/hermes-agent/blob/aa88dcc57b1717cbcfb80e4eca580a3a77056702/skills/research/llm-wiki/SKILL.md))

It is procedural guidance, not a retrieval database. The app must still persist source IDs, chunk/line anchors, document hashes, generated-article lineage and publication state.

### 3. Official qmd skill + qmd MCP for retrieval

This is the most valuable ecosystem reuse. Nous' official optional qmd skill is specifically for local knowledge bases, docs and transcripts. It provides BM25, vectors, hybrid retrieval, reranking and MCP tools. It indexes text/Markdown and chunks around natural boundaries; the skill documents JSON output and source retrieval by document ID/path/line. ([Nous: qmd skill](https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-qmd))

The local environment already satisfies qmd's Node.js requirement (`v22.22.2`). Install and prepare it **before the timed sprint if event rules allow dependency setup; otherwise make this the first infrastructure step**:

```bash
hermes skills install official/research/qmd
npm install -g @tobilu/qmd
qmd --version
qmd collection add /mnt/c/Users/amans/Documents/Hackethon/data/posthog --name posthog-demo
qmd context add qmd://posthog-demo "Pinned PostHog company-handbook demo corpus; return exact source paths and line evidence"
qmd embed
qmd status
```

qmd's first use downloads about 2 GB of local GGUF models. The documented cold hybrid query is about 19 seconds; keeping its HTTP MCP daemon warm uses about 2 GB RAM and reduces normal query latency to roughly 2–3 seconds. BM25-only search avoids model load and is near-instant. ([Nous: qmd setup and performance](https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-qmd))

Recommended warm demo setup:

```bash
qmd mcp --http --daemon
hermes mcp add qmd --url http://localhost:8181/mcp
hermes mcp test qmd
hermes mcp list
```

If daemon mode proves unreliable, use local v0.12.0's stdio MCP registration:

```bash
hermes mcp add qmd --command qmd --args mcp
hermes mcp test qmd
```

The resulting tools are `mcp_qmd_search`, `mcp_qmd_vsearch`, `mcp_qmd_deep_search`, `mcp_qmd_get` and `mcp_qmd_status`. Nous recommends MCP over loading the skill on every query. ([Nous: qmd MCP integration](https://hermes-agent.nousresearch.com/docs/user-guide/skills/optional/research/research-qmd))

Important limitation: qmd produces retrieval candidates; it does not enforce the product's “every answer cited” contract. The application must reject any answer whose citation array is empty, references an unknown source, or cannot be resolved to stored evidence.

### 4. Sessions, logs, insights and optional Langfuse

Hermes saves full messages, tool calls/results, token counts and timestamps in SQLite and supports resuming and cross-session search. ([Nous: Sessions](https://hermes-agent.nousresearch.com/docs/user-guide/sessions/)) Preserve this as eligibility evidence:

```bash
hermes sessions list
hermes sessions stats
hermes sessions rename <SESSION_ID> "posthog-e2e-run-1"
hermes sessions export docs/proof/hermes-posthog-run.jsonl --session-id <SESSION_ID>
hermes logs agent -n 200 --session <SESSION_ID>
hermes logs errors --since 1h
hermes insights --days 1
```

The built-in dashboard can show logs plus token/cost analytics, but it is an operator view, not a substitute for the app's readable run log. ([Nous: Web Dashboard](https://hermes-agent.nousresearch.com/docs/user-guide/features/web-dashboard/))

Langfuse is useful if credentials can be prepared before the sprint. The bundled plugin traces turns, LLM calls and tools, groups by Hermes session/task ID, records usage/cost, and fails open if missing or broken. ([Nous: built-in Langfuse plugin](https://hermes-agent.nousresearch.com/docs/user-guide/features/built-in-plugins))

```bash
pip install langfuse
hermes plugins enable observability/langfuse
# Put HERMES_LANGFUSE_PUBLIC_KEY, HERMES_LANGFUSE_SECRET_KEY and
# HERMES_LANGFUSE_BASE_URL in ~/.hermes/.env, then restart Hermes.
hermes chat -q "observability smoke test"
hermes plugins list
```

Treat Langfuse as optional polish: it earns no named partner bonus and silent no-op behavior makes it dangerous to rely on for the only proof surface.

### 5. Memory, cron and webhooks

Built-in memory (`MEMORY.md` and `USER.md`) is always active but intentionally bounded to about 2,200 and 1,375 characters. It is appropriate for durable preferences, not the org taxonomy, document corpus, user roles or question history. ([Nous: Persistent Memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/)) External memory providers are available, but adding one does not solve exact document citations and increases event-day risk. Keep product memory in Convex/app storage.

Cron can schedule agent or script jobs, attach skills and deliver results. It is suitable for a post-MVP “re-index and freshness check” overflow run, not for the critical demo path. ([Nous: Cron](https://hermes-agent.nousresearch.com/docs/user-guide/features/cron))

```bash
hermes cron create "every 2h" "Check qmd index freshness and report changed source hashes" `
  --skill llm-wiki --workdir /mnt/c/Users/amans/Documents/Hackethon
hermes cron list
```

Webhooks can HMAC-validate external events and trigger agent runs through the gateway. They are useful later for “new doc uploaded” or GitHub change events, but require gateway setup and public routing. Skip them in the eight-hour MVP unless the core loop is already complete. ([Nous: Webhooks](https://hermes-agent.nousresearch.com/docs/user-guide/messaging/webhooks/))

## What still needs custom product code

Hermes does **not** ship a turnkey multi-tenant upload-to-cited-Q&A product. Build only these thin product-specific pieces:

- upload/intake and normalization into the qmd watched collection;
- durable records for source file, hash, freshness, article, gap, interview, draft, approval, question, citation and evaluation result;
- a strict answer schema such as `{ answer, status, citations[] }`;
- citation resolution and a hard gate that converts unsupported/uncited output into a safe refusal plus gap;
- the public chat, article review and run-log screens;
- the 25-question evaluator and before/after answer-rate calculation;
- a server-side proxy so the Hermes bearer token is never present in browser JavaScript.

Do not build a vector database, custom agent framework, generic plugin system, session store, scheduler or observability SDK during the sprint.

## Eight-hour reuse plan

1. **Preflight (30 min):** pin Hermes commit/version, configure its OpenAI provider, install/warm qmd, test the qmd MCP, start the authenticated API server, and preserve a smoke-test session ID.
2. **Corpus + schema (60 min):** ingest the pinned 12 PostHog files; store source paths/hashes; build the smallest app data schema.
3. **Director run (90 min):** preload `llm-wiki`; have Hermes delegate structuring and gap detection; persist the Director plan, child roles, timestamps and outputs.
4. **Cited chat (90 min):** call stateful `/v1/responses` through the server proxy; require qmd retrieval and validated citations; safe-refuse unsupported questions.
5. **Gap close (60 min):** capture an interview answer, ask Hermes Writer for a draft, approve it, index it, then rerun the failed question.
6. **Evaluation (45 min):** run 25 fixed questions and fail every uncited answer; show before/after coverage.
7. **Proof/deploy/rehearsal (45 min):** export the Hermes session, capture logs/insights, verify public Pages flow and rehearse the four-minute demo.

## Risk register

| Risk | Mitigation |
|---|---|
| Cloudflare Pages cannot call laptop loopback | Put a server-side Worker/proxy in front of a Cloudflare Tunnel or host Hermes on a reachable machine. Never expose `API_SERVER_KEY` in the page bundle. |
| Public Hermes API exposes powerful tools | Narrow toolsets, use a strong bearer key, narrow CORS, proxy requests, isolate the working directory, and never use `--yolo` for public traffic. The API docs explicitly warn that callers receive the agent's tool capabilities. ([Nous: API security](https://hermes-agent.nousresearch.com/docs/user-guide/features/api-server/)) |
| qmd first run downloads ~2 GB and cold-starts slowly | Install/download early, run `qmd embed`, start HTTP daemon, verify a real corpus query, retain BM25 stdio fallback. |
| qmd/Hermes run inside WSL while the repo is on Windows | Use stable `/mnt/c/...` paths and run every Hermes/qmd command inside WSL. |
| `delegate_task` child work disappears if parent is interrupted | Keep tasks short and persist app run states/output after each phase; retry idempotently. ([Nous: Delegation patterns](https://hermes-agent.nousresearch.com/docs/guides/delegation-patterns/)) |
| Current docs drift from local v0.12.0 | Use locally verified commands in this report; do not depend on `hermes mcp catalog/install` or newer session export formats. |
| Hub/network rate limits | Install only the single official qmd skill and keep a local snapshot; avoid event-day browsing of large skill catalogs. |
| Agent fabricates citation objects | Resolve every citation against stored source/chunk evidence and reject on mismatch. Never trust format alone. |
| Built-in memory mistaken for KB storage | Keep MEMORY/USER for preferences only; use qmd for retrieval and Convex/app records for product state. |

## Final recommendation

The winning solo-sprint stack is **Hermes Director + `delegate_task` + `llm-wiki` + qmd MCP + deterministic app citation gates**. This makes Hermes visibly and substantively core while avoiding the two expensive reinventions: an agent framework and a retrieval engine. Use the Hermes HTTP API as the runtime seam, sessions/logs as qualification receipts, and Convex/application state as the product's durable source of truth.
