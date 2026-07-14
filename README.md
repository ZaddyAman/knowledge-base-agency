# Knowledge Base Agency

An AI knowledge-operations agency for the Hermes Buildathon. It turns messy organizational documents into a cited knowledge base, identifies undocumented knowledge, drafts missing documentation through an owner interview, and proves answer coverage improved.

## Local demo

Atlas now includes a responsive shadcn/ui conversation surface, a separate anonymous knowledge-ingestion workspace, a Hermes + llm-wiki runtime, event-streamed workflow/answer updates, and deterministic citation validation.

```powershell
npm install
npm run dev:convex
npx convex env set INGESTION_WORKER_TOKEN <random-secret>
# Add the same INGESTION_WORKER_TOKEN to .env.local
npm run dev:api
npm run dev:web
```

Open `http://127.0.0.1:4173`. Convex provides durable workspaces, conversations, messages, storage, ingestion jobs, and source passages. The Atlas/Hermes API runs on `http://127.0.0.1:8787`; Vite proxies `/api` during local development.

Supported demo uploads are `.md` and `.txt`, up to 256 KB each and five files per batch. Files go to Convex Storage, create an ingestion record, pass through Hermes structuring, and become workspace-scoped source passages. A Knowledge Owner must explicitly publish the reviewed document before those passages are eligible for answers. The product runtime has no hardcoded demo-corpus fallback. The local API worker is restart-sensitive; move job execution to a hosted queue/Convex Action before production deployment.

This checkout uses Convex anonymous local mode because no Convex account is linked on the machine. To claim the partner deployment later, run `npx convex login`, select or create the project, then run `npx convex deploy` and configure the resulting `VITE_CONVEX_URL` in Cloudflare Pages.

Worker-only ingestion transitions require `INGESTION_WORKER_TOKEN`; uploaded file limits use Convex Storage's observed metadata, not browser-reported sizes. Before a permanent anonymous public launch, put Cloudflare Turnstile and a deployment-wide upload quota in front of workspace creation and Storage URL issuance.

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
