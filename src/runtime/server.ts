import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { bodyLimit } from "hono/body-limit";
import { cors } from "hono/cors";
import { streamSSE } from "hono/streaming";
import { z } from "zod";

import { answerQuestion } from "./chat-service.js";
import { runHermes } from "./hermes-cli.js";
import { ingestKnowledgeFiles, getKnowledgeSummary } from "./ingestion.js";
import { agencyPrompt } from "./prompts.js";

const app = new Hono();
const uploadWindows = new Map<string, { count: number; resetAt: number }>();
app.use("/api/*", cors({ origin: ["http://127.0.0.1:4173", "http://localhost:4173"] }));
app.use("/api/knowledge/ingest", async (context, next) => {
  const key = context.req.header("cf-connecting-ip") ?? "local-or-unknown";
  const now = Date.now();
  const window = uploadWindows.get(key);
  const current = !window || window.resetAt <= now ? { count: 0, resetAt: now + 60_000 } : window;
  if (current.count >= 10) return context.json({ error: "Upload rate limit reached. Try again in one minute." }, 429);
  current.count += 1;
  uploadWindows.set(key, current);
  await next();
});
app.use("/api/knowledge/ingest", bodyLimit({
  maxSize: 11 * 1024 * 1024,
  onError: (context) => context.json({ error: "Upload request exceeds the 11 MB batch limit." }, 413),
}));

app.get("/health", (context) => context.json({ status: "ok", runtime: "hermes-llm-wiki" }));

app.post("/api/chat", async (context) => {
  const request = z.object({ question: z.string().trim().min(1).max(2_000) }).parse(await context.req.json());
  const result = await answerQuestion(request.question);
  return context.json(result.body, result.statusCode as 200 | 503);
});

app.post("/api/chat/stream", async (context) => {
  const request = z.object({ question: z.string().trim().min(1).max(2_000) }).parse(await context.req.json());
  return streamSSE(context, async (stream) => {
    const abortController = new AbortController();
    stream.onAbort(() => abortController.abort());
    let eventId = 0;
    const send = async (event: string, data: unknown) => {
      await stream.writeSSE({ event, id: String(++eventId), data: JSON.stringify(data) });
    };
    const result = await answerQuestion(request.question, async (event) => send(event.type, event), abortController.signal);
    const body = result.body;
    if (!body.run?.skipped) {
      for (const citation of body.citations ?? []) await send("retrieval", citation);
      await send("stage", { type: "stage", id: "render", state: "running", label: "Rendering validated response" });
    }
    const words = body.answer.answer.match(/\S+\s*/g) ?? [body.answer.answer];
    for (const delta of words) {
      await send("text-delta", { delta });
      await stream.sleep(18);
    }
    if (!body.run?.skipped) await send("stage", { type: "stage", id: "render", state: "complete", label: "Validated response rendered" });
    await send("validation", body.decision);
    await send("done", { ...body, httpStatus: result.statusCode });
  });
});

app.get("/api/knowledge", async (context) => context.json(await getKnowledgeSummary()));

app.post("/api/knowledge/ingest", async (context) => {
  try {
    return context.json(await ingestKnowledgeFiles(await context.req.formData()), 201);
  } catch (error) {
    return context.json({ error: error instanceof Error ? error.message : "Upload failed." }, 400);
  }
});

app.post("/api/agency/run", async (context) => {
  const expectedKey = process.env.OWNER_DEMO_KEY;
  if (expectedKey && context.req.header("x-owner-key") !== expectedKey) {
    return context.json({ error: "unauthorized" }, 401);
  }
  const request = z.object({ operation: z.string().trim().min(1).max(4_000) }).parse(await context.req.json());
  const run = await runHermes(agencyPrompt(request.operation), ["llm-wiki"], 300_000);
  return context.json({ summary: run.output, durationMs: run.durationMs, runtime: "Hermes KB Director" });
});

const port = Number(process.env.PORT ?? 8787);
serve({ fetch: app.fetch, port }, (info) => {
  console.log(`Atlas runtime listening on http://127.0.0.1:${info.port}`);
});
