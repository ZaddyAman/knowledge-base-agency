import { runHermes } from "./hermes-cli.js";

export type ScopeClassification = {
  route: "knowledge" | "out_of_scope" | "unavailable";
  durationMs: number;
};

export function parseScopeClassification(output: string): ScopeClassification["route"] {
  const normalized = output.trim().toUpperCase();
  if (normalized === "IN_SCOPE") return "knowledge";
  if (normalized === "OUT_OF_SCOPE") return "out_of_scope";
  return "unavailable";
}

export async function classifyQuestionScope(question: string): Promise<ScopeClassification> {
  const startedAt = Date.now();
  const prompt = `Classify whether this question is about an organization's internal handbook, policies, benefits, operations, security, spending, onboarding, time off, meetings, or customer support.
Do not answer the question. Do not use tools. General knowledge, entertainment, politics, shopping, personal advice, and unrelated requests are out of scope.
Reply with exactly IN_SCOPE or OUT_OF_SCOPE.

Question: ${JSON.stringify(question)}`;

  try {
    const run = await runHermes(prompt, [], 60_000, ["clarify"]);
    return {
      route: parseScopeClassification(run.output),
      durationMs: run.durationMs,
    };
  } catch {
    // A classifier failure must never broaden access to the expensive workflow.
    return { route: "unavailable", durationMs: Date.now() - startedAt };
  }
}
