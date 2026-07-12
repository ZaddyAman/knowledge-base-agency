# Ingestion, chunking, and memory architecture

_Verified 2026-07-12 against Hermes Agent v0.12.0 installed in WSL and current primary upstream sources._

## Recommendation

Use three deliberately separate layers:

1. **Hermes `llm-wiki` skill for knowledge operations** — immutable raw sources, taxonomy, compiled Knowledge Articles, provenance, contradiction handling, and an append-only run log.
2. **qmd for passage indexing and retrieval** — automatic Markdown-aware chunking, BM25, vector search, hybrid fusion, reranking, and retrieval through MCP.
3. **Application state for product memory and authority** — source IDs and hashes, user roles, questions, citations, gaps, interviews, approvals, freshness, and evaluation results. Start with local SQLite for the local demo; keep a store interface so Convex can replace it later.

Do not treat Hermes built-in memory, external memory providers, sessions, qmd, and the Knowledge Base as interchangeable stores.

## Ingestion path

```text
uploaded/public source
  -> immutable raw file + SHA-256 + source metadata
  -> normalized Markdown with stable headings/line anchors
  -> qmd collection update + embeddings
  -> Hermes Director invokes llm-wiki structuring rules
  -> Knowledge Articles preserve links to raw Source Passages
  -> deterministic validator accepts only resolvable claim-level citations
```

For the 12-file PostHog demo corpus, do not build a custom chunker. qmd chunks documents into roughly 900-token passages with 15% overlap and selects natural Markdown boundaries such as headings, paragraphs, and code fences. It stores the document hash, chunk sequence, and character position. Source: [qmd README](https://github.com/tobi/qmd#smart-chunking).

The application must add the authority layer qmd does not provide: stable source identity, immutable hashes, active/superseded state, exact excerpt resolution, and claim-to-passage validation.

## Why `llm-wiki` and qmd are complementary

The locally installed Hermes `llm-wiki` skill is Hermes Agent version 2.1.0, based on [Andrej Karpathy's LLM Wiki pattern](https://gist.github.com/karpathy/442a6bf555914893e9891c11519de94f). It compiles raw material into an interlinked Markdown wiki and defines operational rules for provenance, drift, contradictions, taxonomy, and logs. It is not a vector index or a deterministic citation validator.

The official optional [Hermes qmd skill](https://github.com/NousResearch/hermes-agent/blob/main/optional-skills/research/qmd/SKILL.md) exposes a local hybrid retrieval engine to Hermes through MCP. qmd is currently not installed locally, although WSL already has the required Node.js 22 runtime.

Newer projects such as [llm-wiki-compiler](https://github.com/atomicstrata/llm-wiki-compiler) add claim-level citations, an evaluator, hybrid retrieval, and MCP. They are promising post-event candidates, but replacing the verified Hermes skill plus qmd with another compiler during an eight-hour solo sprint duplicates retrieval and introduces a second orchestration surface. Do not add it to the MVP.

## Hermes memory findings

Local `hermes memory status` reports built-in-only memory with no external provider active. Hermes built-in memory is intentionally bounded:

- `MEMORY.md`: 2,200 characters for stable environment facts and operating conventions.
- `USER.md`: 1,375 characters for user preferences and communication expectations.

Both are injected into the system prompt; they are not a document corpus. Source: [Hermes Persistent Memory](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory/).

Hermes sessions persist full messages and tool calls in SQLite and provide FTS5 `session_search`. This is valuable for conversation continuity and hackathon receipts, but session search retrieves conversations, not authoritative company passages. Source: [Hermes Sessions](https://hermes-agent.nousresearch.com/docs/user-guide/sessions).

Hermes ships external providers including Holographic, Hindsight, Honcho, Mem0, OpenViking, RetainDB, ByteRover, and Supermemory; only one may be active at once, and provider memory is additive to built-in memory. Source: [Hermes Memory Providers](https://hermes-agent.nousresearch.com/docs/user-guide/features/memory-providers/).

For the MVP, enable none. Even the dependency-free Holographic provider stores extracted facts with trust scores, not the product's immutable evidence and approval model. Automatic conversational capture could silently promote an unapproved statement into recalled context. Revisit an external provider only after the citation and authority gates work.

## Correct use of each memory surface

| Surface | Store here | Never store here as authority |
|---|---|---|
| Hermes `MEMORY.md` | Director rules, corpus path, tool-use conventions | Company policies, citations, user histories |
| Hermes `USER.md` | Builder/operator preferences | End-user product profiles |
| Hermes Responses/session state | Current conversation and tool trace | Canonical source metadata |
| qmd | Indexed normalized sources and retrieval candidates | Approvals, roles, publication state |
| Compiled wiki | Taxonomy and readable Knowledge Articles with provenance | Untraceable generated facts |
| Product SQLite/Convex | Roles, history, gaps, approvals, citations, freshness, evals | Raw embeddings |

## First local milestone

1. Install the official qmd skill and qmd CLI in WSL, allowing the initial model download.
2. Normalize the pinned corpus to Markdown without altering the raw snapshot.
3. Index it as one qmd collection and run a known retrieval query.
4. Register qmd MCP with Hermes and verify Hermes calls it.
5. Implement one strict response envelope: `status`, `answer`, `claims[]`, `citations[]`, `gap`.
6. Resolve every citation against stored source metadata; downgrade any invalid or empty-citation answer to a Safe Refusal.
