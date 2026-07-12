# Chat UI, ingestion, and streaming brief

Date: 2026-07-12

## Recommendation

Build Atlas as a responsive two-workspace application, not a dashboard squeezed around a transcript:

1. **Ask** — the default workspace: conversation list (desktop only), a wide readable transcript, a sticky composer, and a collapsible evidence/trace drawer.
2. **Knowledge** — a separate ingestion workspace: drop zone, upload queue, processing stages, indexed documents, errors, and freshness metadata.

On narrow screens, hide the conversation rail in a `Sheet` and show evidence in a bottom/right `Sheet`; never keep three permanent columns. Keep the assistant response visually primary and reveal operational detail progressively.

## Chat layout and components

- Use shadcn/ui's `MessageScroller` for the transcript. It is designed for streamed replies: it follows the live edge only while the reader remains there, releases auto-scroll when they scroll away, preserves position when history is prepended, and provides a jump-to-latest control. Wrap every turn in a stable-ID item and mark user turns as anchors. Its transcript uses `role="log"`; set `aria-busy` while a response streams so assistive technology does not announce every token mutation. [shadcn/ui Message Scroller](https://ui.shadcn.com/docs/components/base/message-scroller)
- Compose rows with `Message`, `MessageContent`, `MessageHeader`, `MessageFooter`, and `Bubble`. Put copy/retry/thumbs actions in the footer, with an `aria-label` on every icon-only button. Use a `Marker role="status"` for an in-progress response. [shadcn/ui Message](https://ui.shadcn.com/docs/components/base/message)
- Keep the composer sticky and compact: auto-growing textarea, attach button, send/stop button, and one line of keyboard help. `PromptInput` already supports drag-and-drop attachments, constraints, previews, Enter-to-send, Shift+Enter, and chat-status-aware submit controls. For this product, however, the composer attachment action should link to **Knowledge / Upload** rather than silently ingest durable KB documents inside an ordinary chat turn. [AI Elements Prompt Input](https://elements.ai-sdk.dev/components/prompt-input)
- Make evidence legible without overwhelming the answer. Show small numbered citation markers beside supported claims, then a collapsible “N validated sources” block below the answer. Each source row should show filename, exact line/page range, validation state, and a short excerpt; selecting it opens the evidence drawer at the excerpt. AI Elements offers a collapsible source pattern, while its inline-citation docs explicitly warn that inline citations are not natively supported by the AI SDK/Streamdown and require structured data plus custom rendering. Atlas should therefore render its existing structured citation envelope deterministically rather than parse citation-like model text. [AI Elements Sources](https://elements.ai-sdk.dev/components/sources), [AI Elements Inline Citation](https://elements.ai-sdk.dev/components/inline-citation)
- Use a calm empty state with 3–4 corpus-specific suggested questions and a single “Upload knowledge” secondary action. Avoid fake historical answers or pre-filled evidence.

## Streaming model to showcase in the demo

Stream one event envelope over SSE rather than returning only a final JSON blob. The AI SDK's UI stream protocol supports text chunks, while custom data parts can carry status and references alongside the answer; repeated data-part IDs reconcile in place, which suits evolving workflow stages. [AI SDK stream protocol](https://ai-sdk.dev/docs/ai-sdk-ui/stream-protocol), [AI SDK streaming custom data](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data)

Recommended event sequence:

```text
route        { scope: "knowledge-base" }
stage        { id: "search", state: "running", label: "Searching 12 sources" }
retrieval    { id: "chunk-1", file, range, excerpt, score }
retrieval    { id: "chunk-2", file, range, excerpt, score }
stage        { id: "search", state: "complete", detail: "2 passages selected" }
stage        { id: "answer", state: "running", label: "Drafting from evidence" }
text-delta   { delta: "..." }
citation     { id, file, range, excerpt }
stage        { id: "validate", state: "running" }
validation  { publishable: true, citations: [...] }
done         { runId, latencyMs }
```

In the UI, render retrieved chunks immediately as compact cards in an expandable **Live evidence** region; highlight newly arrived cards briefly, then retain them as the final validated source list. Stream answer text in the transcript, but delay the blue “Supported” badge until deterministic validation succeeds. If validation fails, replace the draft with the safe-refusal/gap state. Persist final messages/citations; treat stage pulses as transient UI data. The SDK documentation specifically identifies streamed sources/RAG, loading states, and transient notifications as intended custom-data uses. [AI SDK streaming custom data](https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data)

For accessibility, put short stage changes in a polite status region, not an assertive alert. WAI-ARIA defines `status`/`log` as live-region roles and `aria-live="polite"` as non-interrupting; reserve alerts for genuine failures. Do not announce every generated token. [WAI-ARIA 1.2 live regions](https://www.w3.org/TR/wai-aria/#dfn-live-region)

## Knowledge / ingestion workspace

Use a dedicated route or top-level tab such as `/knowledge`, with these states visible per file:

```text
Selected -> Uploading (0–100%) -> Parsing -> Structuring -> Indexing -> Ready
                                              \-> Failed (reason + Retry)
```

- Provide both a real `<input type="file" multiple>` and drag-and-drop. Keep the native input visually hidden—not `display:none`—and connect it to a styled label/button so keyboard users can open it and see focus. Show filename, type, and size before upload. [MDN: Using files from web applications](https://developer.mozilla.org/en-US/docs/Web/API/File_API/Using_files_from_web_applications)
- Restrict accepted document types and enforce the same allow-list and size/count limits server-side. Show rejected files inline with the exact reason before starting the queue.
- Represent each file with shadcn/ui `Attachment`; it has explicit `idle`, `uploading`, `processing`, `error`, and `done` states. Include failure text, because color alone cannot communicate status. [shadcn/ui Attachment](https://ui.shadcn.com/docs/components/base/attachment)
- Use `Progress` plus visible percentage during byte upload, then an indeterminate processing marker for parsing/indexing. Announce meaningful milestones through a visually hidden `aria-live="polite"` status. W3C's upload-progress technique notes that changing `aria-valuenow` alone is not reliably announced and pairs the progress bar with a live status message. [W3C ARIA25 upload progress](https://www.w3.org/WAI/WCAG21/Techniques/aria/ARIA25)
- If actual byte progress is required in the demo, use `XMLHttpRequest.upload` progress events; the browser exposes `loadstart`, `progress`, `abort`, `error`, `load`, `timeout`, and `loadend`. [MDN XMLHttpRequest upload](https://developer.mozilla.org/en-US/docs/Web/API/XMLHttpRequest/upload)
- After completion, show corpus totals and a durable table/list with document name, status, chunk count, ingestion time, freshness date, and actions (inspect, retry, remove). Confirmation is required before removing an indexed source.

## shadcn/ui implementation choice

The current frontend is static HTML/CSS/JavaScript, so shadcn/ui cannot be truthfully “applied” as a stylesheet: its CLI installs React component source and expects a supported React framework. Migrate the live surface to **Vite + React + TypeScript**, then configure Tailwind, the `@/*` alias in TypeScript and Vite, run `npx shadcn@latest init`, and add only the selected components. These are the official existing-project steps. [shadcn/ui Vite installation](https://ui.shadcn.com/docs/installation/vite)

Suggested first install:

```bash
npx shadcn@latest init
npx shadcn@latest add button badge card sheet tabs tooltip textarea progress \
  scroll-area separator skeleton sonner message message-scroller attachment marker
npx ai-elements@latest add prompt-input sources
```

Do not add a large component set pre-emptively. The critical demo path is `MessageScroller` + `Message` + `PromptInput`, with `Sheet` for responsive navigation/evidence, `Attachment` + `Progress` for ingestion, and `Badge`/`Marker` for validation and workflow state. AI Elements is itself a shadcn/ui-based custom registry, so its copied source remains themeable and locally owned. [AI Elements introduction](https://elements.ai-sdk.dev/docs), [shadcn/ui component catalog](https://ui.shadcn.com/docs/components)

## Fast delivery order

1. Migrate the existing chat to Vite/React without changing backend contracts.
2. Replace transcript/composer/rails with the component composition above and verify desktop/mobile keyboard behavior.
3. Add SSE events and render retrieval chunks + stages while Hermes runs.
4. Add `/knowledge` with local selection validation, upload queue, and ingestion status; connect the backend upload endpoint afterward.
5. Run a demo check: stream two evidence chunks, stream the answer, validate it, open the exact source excerpt, then ingest one new document and show it become `Ready`.
