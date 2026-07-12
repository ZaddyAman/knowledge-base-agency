# Convex product data flow

Atlas is multi-workspace. Every tenant-owned record carries a `workspaceId`, and every public Convex function verifies the browser's current anonymous viewer owns that workspace. Authentication can replace the temporary viewer ID without changing the table boundaries.

## Tables

- `workspaces`: dynamic KB identity, description, owner, and visual accent.
- `conversations`: title and recency for the conversation sidebar.
- `messages`: durable user/assistant turns with structured citations.
- `documents`: Convex Storage ID plus ingestion status and metadata.
- `ingestionJobs`: queued/running/complete/failed state, stage, and progress.
- `sourcePassages`: exact, line-addressable passages scoped to one document and workspace.
- `runEvents`: durable Hermes trace events for later observability views.

## Upload and ingestion

```text
Browser file
  -> Convex generated upload URL
  -> Convex Storage
  -> documents + ingestionJobs(queued)
  -> POST /api/ingestion/start
  -> Atlas worker claims job
  -> Hermes llm-wiki structuring receipt
  -> deterministic line-addressable passages
  -> sourcePassages + documents(ready) + ingestionJobs(complete)
```

Hermes is the semantic structurer. Passage boundaries remain deterministic so citations always resolve to exact source lines. If the local model call times out, the upload remains searchable and the completed job records `hermes_receipt_unavailable`; the UI must not imply that the semantic receipt succeeded.

The browser never makes an upload retrieval-authoritative directly. The application worker owns the transition into ready passages. Chat sends `viewerId` and `workspaceId`; the API loads only that workspace's ready passages from Convex, supplies them to Hermes, and validates returned citations against those exact passages.

## Deployment boundary

The current machine is running Convex anonymous local mode at `127.0.0.1:3210`. For the hackathon partner deployment, link a Convex account, deploy the backend, set `VITE_CONVEX_URL` for the frontend, and set the same URL for the Atlas API. Replace anonymous viewer IDs with authenticated membership checks before enabling public multi-user access.
