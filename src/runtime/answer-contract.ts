import { readFile } from "node:fs/promises";
import path from "node:path";
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
  gap: z.object({ title: z.string(), missingEvidence: z.string() }).nullable().optional(),
});

type Manifest = {
  sources: Array<{ path: string; sha256: string; sourceUrl: string }>;
};

function parseJson(output: string): unknown {
  const fenced = output.match(/```(?:json)?\s*([\s\S]*?)```/i);
  return JSON.parse((fenced?.[1] ?? output).trim());
}

export async function validateHermesOutput(output: string) {
  const root = process.cwd();
  const manifestText = await readFile(
    path.join(root, "data/posthog-demo/manifest.json"),
    "utf8",
  );
  const manifest = JSON.parse(manifestText.replace(/^\uFEFF/, "")) as Manifest;
  const answer = hermesAnswerSchema.parse(parseJson(output));
  const sourceByPath = new Map(manifest.sources.map((source) => [source.path, source]));

  const citations: AnswerInput["citations"] = answer.citations.map((citation) => {
    const normalizedPath = citation.sourcePath
      .replace(/^qmd:\/\/posthog-demo\//, "")
      .replace(/^posthog-demo\//, "");
    const source = sourceByPath.get(normalizedPath);
    if (!source) throw new Error(`Unknown citation source: ${citation.sourcePath}`);
    return {
      id: citation.id,
      sourceId: normalizedPath,
      sourceHash: `sha256:${source.sha256}`,
      startLine: citation.startLine,
      endLine: citation.endLine,
      excerpt: citation.excerpt,
    };
  });

  const citedPaths = [...new Set(citations.map((citation) => citation.sourceId))];
  const sources: SourceVersion[] = await Promise.all(citedPaths.map(async (sourcePath) => {
    const source = sourceByPath.get(sourcePath);
    if (!source) throw new Error(`Unknown source: ${sourcePath}`);
    const body = await readFile(path.join(root, "data/posthog-demo/sources", sourcePath), "utf8");
    return {
      id: sourcePath,
      hash: `sha256:${source.sha256}`,
      active: true,
      lines: body.replace(/\r\n/g, "\n").split("\n"),
      firstLineNumber: 1,
    };
  }));

  const normalized: AnswerInput = {
    status: answer.status,
    answer: answer.answer,
    claims: answer.claims,
    citations,
    gap: answer.gap ?? null,
  };
  const decision = validateAnswer(normalized, sources);
  return { answer, citations, decision };
}
