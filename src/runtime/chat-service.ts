import { validateHermesOutput, type RuntimeSource } from "./answer-contract.js";
import { runHermes } from "./hermes-cli.js";
import { answerPrompt } from "./prompts.js";
import { routeQuestion } from "./question-router.js";
import { classifyQuestionScope } from "./scope-classifier.js";

export type ChatStageEvent = {
  type: "route" | "stage";
  id: string;
  state?: "running" | "complete" | "skipped";
  label: string;
};

type StageReporter = (event: ChatStageEvent) => Promise<void> | void;

function directResult(kind: "conversation" | "out_of_scope", answer: string, durationMs: number) {
  return {
    statusCode: 200,
    body: {
      answer: {
        status: kind === "conversation" ? "CONVERSATIONAL" : "OUT_OF_SCOPE",
        answer,
        claims: [],
        citations: [],
        gap: null,
      },
      citations: [],
      decision: { publishable: false, status: kind.toUpperCase(), reason: null },
      run: { durationMs, runtime: "Atlas preflight", skipped: true, route: kind },
    },
  };
}

export async function answerQuestion(question: string, report: StageReporter = () => undefined, signal?: AbortSignal, runtimeSources: RuntimeSource[] = []) {
  let route = routeQuestion(question);
  let preflightDurationMs = 0;

  await report({ type: "route", id: "route", state: "running", label: "Checking workspace scope" });

  if (route.kind === "classify") {
    const classified = await classifyQuestionScope(question, signal);
    preflightDurationMs = classified.durationMs;
    if (classified.route === "unavailable") {
      return {
        statusCode: 503,
        body: {
          answer: { status: "SYSTEM_UNAVAILABLE", answer: "Atlas could not determine whether this question belongs to the workspace.", claims: [], citations: [], gap: null },
          citations: [],
          decision: { publishable: false, status: "SYSTEM_UNAVAILABLE", reason: "scope_classifier_unavailable" },
          run: { durationMs: preflightDurationMs, runtime: "Hermes scope classifier", skipped: true, route: "unavailable" },
        },
      };
    }
    route = classified.route === "knowledge"
      ? { kind: "knowledge" }
      : { kind: "out_of_scope", answer: "I can only answer questions about this workspace's company handbook, policies, and operations." };
  }

  await report({ type: "route", id: "route", state: "complete", label: route.kind === "knowledge" ? "Knowledge question accepted" : "Knowledge retrieval not needed" });

  if (route.kind !== "knowledge") {
    return directResult(route.kind, route.answer, preflightDurationMs);
  }

  if (runtimeSources.length === 0) {
    const gap = { title: "Workspace has no supporting evidence", missingEvidence: "Upload and ingest a source document that addresses this question." };
    return { statusCode: 200, body: { answer: { status: "REFUSED_GAP", answer: "I can’t answer this from the current workspace because it has no ready supporting evidence.", claims: [], citations: [], gap }, citations: [], decision: { publishable: true, status: "REFUSED_GAP", reason: null }, run: { durationMs: 0, runtime: "Atlas evidence gate", skipped: true } } };
  }

  try {
    await report({ type: "stage", id: "search", state: "running", label: "Hermes is searching source documents" });
    const run = await runHermes(answerPrompt(question, runtimeSources), ["llm-wiki"], 180_000, undefined, signal);
    await report({ type: "stage", id: "search", state: "complete", label: "Source passages resolved" });
    await report({ type: "stage", id: "validate", state: "running", label: "Validating exact citations" });
    const validated = await validateHermesOutput(run.output, runtimeSources);
    await report({ type: "stage", id: "validate", state: "complete", label: validated.answer.status === "REFUSED_GAP" || validated.answer.status === "REFUSED_CONFLICT" ? "Unsafe answer blocked; knowledge gap recorded" : "Every claim is supported" });
    return { statusCode: 200, body: { ...validated, run: { durationMs: run.durationMs, runtime: "Hermes + llm-wiki", skipped: false } } };
  } catch (error) {
    console.error("Hermes answer run failed", error);
    return {
      statusCode: 503,
      body: {
        answer: { status: "SYSTEM_UNAVAILABLE", answer: "Hermes could not complete a validated answer.", claims: [], citations: [], gap: null },
        citations: [],
        decision: { publishable: false, status: "SYSTEM_UNAVAILABLE", reason: "hermes_runtime_failed" },
        run: { durationMs: 0, runtime: "Hermes + llm-wiki", skipped: false },
      },
    };
  }
}
