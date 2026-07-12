import { serve } from "@hono/node-server";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { z } from "zod";

import { validateHermesOutput } from "./answer-contract.js";
import { runHermes } from "./hermes-cli.js";
import { agencyPrompt, answerPrompt } from "./prompts.js";
import { routeQuestion } from "./question-router.js";
import { classifyQuestionScope } from "./scope-classifier.js";

const app = new Hono();
app.use("/api/*", cors({ origin: ["http://127.0.0.1:4173", "http://localhost:4173"] }));

app.get("/health", (context) => context.json({ status: "ok", runtime: "hermes-llm-wiki" }));

app.post("/api/chat", async (context) => {
  const request = z.object({ question: z.string().trim().min(1).max(2_000) }).parse(await context.req.json());
  let route = routeQuestion(request.question);
  let preflightDurationMs = 0;
  if (route.kind === "classify") {
    const classified = await classifyQuestionScope(request.question);
    preflightDurationMs = classified.durationMs;
    if (classified.route === "unavailable") {
      return context.json({
        answer: {
          status: "SYSTEM_UNAVAILABLE",
          answer: "Atlas could not determine whether this question belongs to the workspace.",
          claims: [],
          citations: [],
          gap: null,
        },
        citations: [],
        decision: { publishable: false, status: "SYSTEM_UNAVAILABLE", reason: "scope_classifier_unavailable" },
        run: { durationMs: preflightDurationMs, runtime: "Hermes scope classifier", skipped: true, route: "unavailable" },
      }, 503);
    }
    route = classified.route === "knowledge"
      ? { kind: "knowledge" }
      : {
          kind: "out_of_scope",
          answer: "I can only answer questions about this workspace's company handbook, policies, and operations.",
        };
  }
  if (route.kind !== "knowledge") {
    return context.json({
      answer: {
        status: route.kind === "conversation" ? "CONVERSATIONAL" : "OUT_OF_SCOPE",
        answer: route.answer,
        claims: [],
        citations: [],
        gap: null,
      },
      citations: [],
      decision: { publishable: false, status: route.kind.toUpperCase(), reason: null },
      run: { durationMs: preflightDurationMs, runtime: "Atlas preflight", skipped: true, route: route.kind },
    });
  }
  try {
    const run = await runHermes(answerPrompt(request.question), ["llm-wiki"]);
    const validated = await validateHermesOutput(run.output);
    return context.json({ ...validated, run: { durationMs: run.durationMs, runtime: "Hermes + llm-wiki" } });
  } catch (error) {
    return context.json({
      answer: { status: "SYSTEM_UNAVAILABLE", answer: "Hermes could not complete a validated answer.", claims: [], citations: [], gap: null },
      decision: { publishable: false, status: "SYSTEM_UNAVAILABLE", reason: error instanceof Error ? error.message : "unknown_error" },
    }, 503);
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
