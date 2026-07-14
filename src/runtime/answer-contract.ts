import { z } from "zod";

import { validateAnswer, type AnswerInput, type SourceVersion } from "../domain/answer-validator.js";

const hermesAnswerSchema = z.object({
  status: z.enum(["SUPPORTED", "PARTIALLY_SUPPORTED", "REFUSED_GAP", "REFUSED_CONFLICT"]),
  answer: z.string(),
  claims: z.array(z.object({ text: z.string(), citationIds: z.array(z.string()) })),
  citations: z.array(z.object({
    id: z.string(),
    sourcePath: z.string(),
    startLine: z.number().int().positive(),
    endLine: z.number().int().positive(),
    excerpt: z.string(),
  })),
  gap: z.preprocess(
    (value) => typeof value === "string"
      ? { title: "Knowledge gap", missingEvidence: value }
      : value,
    z.object({ title: z.string(), missingEvidence: z.string() }).nullable().optional(),
  ),
});

export type RuntimeSource = {
  path: string;
  hash: string;
  lines: string[];
  firstLineNumber: number;
};

function parseJson(output: string): unknown {
  const fenced = output.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse((fenced?.[1] ?? output).trim());
}

export async function validateHermesOutput(output: string, runtimeSources: RuntimeSource[]) {
  const parsedAnswer = hermesAnswerSchema.parse(parseJson(output));
  const answer = parsedAnswer.status === "SUPPORTED"
    ? { ...parsedAnswer, gap: null }
    : parsedAnswer;
  const runtimeSourceByPath = new Map(runtimeSources.map((source) => [source.path, source]));

  const citations: AnswerInput["citations"] = answer.citations.map((citation) => {
    const normalizedPath = citation.sourcePath;
    const runtimeSource = runtimeSourceByPath.get(normalizedPath);
    if (runtimeSource) return {
      id: citation.id,
      sourceId: normalizedPath,
      sourceHash: runtimeSource.hash,
      startLine: citation.startLine,
      endLine: citation.endLine,
      excerpt: citation.excerpt,
    };
    throw new Error(`Citation is outside the current workspace: ${citation.sourcePath}`);
  });

  const citedPaths = [...new Set(citations.map((citation) => citation.sourceId))];
  const sources: SourceVersion[] = await Promise.all(citedPaths.map(async (sourcePath) => {
    const runtimeSource = runtimeSourceByPath.get(sourcePath);
    if (runtimeSource) return {
      id: runtimeSource.path,
      hash: runtimeSource.hash,
      active: true,
      lines: runtimeSource.lines,
      firstLineNumber: runtimeSource.firstLineNumber,
    };
    throw new Error(`Source is outside the current workspace: ${sourcePath}`);
  }));

  const normalized: AnswerInput = {
    status: answer.status,
    answer: answer.answer,
    claims: answer.claims,
    citations,
    gap: answer.gap ?? null,
  };
  const decision = validateAnswer(normalized, sources);
  if (!decision.publishable) {
    const safeAnswer = {
      status: "REFUSED_GAP" as const,
      answer: "I can’t publish a factual answer because the retrieved citation failed validation. I’ve recorded this as a knowledge gap.",
      claims: [],
      citations: [],
      gap: {
        title: "Citation validation failed",
        missingEvidence: `A source passage that passes deterministic validation is required (${decision.reason ?? "unknown_validation_failure"}).`,
      },
    };
    return {
      answer: safeAnswer,
      citations: [],
      decision: { publishable: false, status: "REFUSED_GAP" as const, reason: decision.reason },
    };
  }
  return { answer, citations, decision };
}
