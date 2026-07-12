# Knowledge Base Agency

An AI knowledge-operations agency for the Hermes Buildathon. It turns messy organizational documents into a cited knowledge base, identifies undocumented knowledge, drafts missing documentation through an owner interview, and proves answer coverage improved.

## Local demo

Atlas now includes a responsive shadcn/ui conversation surface, a separate anonymous knowledge-ingestion workspace, a Hermes + llm-wiki runtime, event-streamed workflow/answer updates, and deterministic citation validation.

```powershell
npm install
npm run dev:api
npm run dev:web
```

Open `http://127.0.0.1:4173`. The API runs on `http://127.0.0.1:8787` and Vite proxies `/api` during local development.

Supported demo uploads are `.md` and `.txt`, up to 2 MB each and five files per batch. Anonymous uploads enter a bounded, deduplicated quarantine under the ignored `data/posthog-demo/pending/` directory. They are not retrieval-authoritative until a Knowledge Owner reviews and publishes them.

## Verification

```powershell
npm test
npm run typecheck
npm run build:web
```

## Build constraints

- AI as Agency track
- Hermes must do meaningful build work and retain session receipts
- Public product surface hosted with Cloudflare
- Product state and agent traces stored in Convex
- Every factual answer must cite its source or safely refuse
- Human approval is required before generated organizational knowledge is published

Planning decisions are tracked in GitHub Issues using the `wayfinder:*` labels.
