import { z } from "zod";

const citationSchema = z.object({
  id: z.string().min(1),
  sourceId: z.string().min(1),
  sourceHash: z.string().min(1),
  startLine: z.number().int().positive(),
  endLine: z.number().int().positive(),
  excerpt: z.string().min(1),
});

const answerSchema = z.object({
  status: z.enum([
    "SUPPORTED",
    "PARTIALLY_SUPPORTED",
    "REFUSED_GAP",
    "REFUSED_CONFLICT",
    "SYSTEM_UNAVAILABLE",
  ]),
  answer: z.string(),
  gap: z.object({
    title: z.string().min(1),
    missingEvidence: z.string().min(1),
  }).nullable().optional(),
  claims: z.array(
    z.object({
      text: z.string().min(1),
      citationIds: z.array(z.string().min(1)).min(1),
    }),
  ),
  citations: z.array(citationSchema),
});

const sourceSchema = z.object({
  id: z.string().min(1),
  hash: z.string().min(1),
  active: z.boolean(),
  lines: z.array(z.string()),
  firstLineNumber: z.number().int().positive(),
});

export type AnswerInput = z.input<typeof answerSchema>;
export type SourceVersion = z.input<typeof sourceSchema>;

export type PublicationDecision = {
  publishable: boolean;
  status: z.infer<typeof answerSchema>["status"];
  reason: string | null;
};

export function validateAnswer(
  answerInput: AnswerInput,
  sourceInputs: SourceVersion[],
): PublicationDecision {
  const answer = answerSchema.parse(answerInput);
  const sources = sourceInputs.map((source) => sourceSchema.parse(source));
  const citations = new Map(answer.citations.map((citation) => [citation.id, citation]));

  if (
    (answer.status === "SUPPORTED" || answer.status === "PARTIALLY_SUPPORTED") &&
    answer.claims.length === 0
  ) {
    return {
      publishable: false,
      status: "REFUSED_GAP",
      reason: "uncited_supported_answer",
    };
  }

  if (
    (answer.status === "REFUSED_GAP" || answer.status === "REFUSED_CONFLICT") &&
    !answer.gap
  ) {
    return { publishable: false, status: answer.status, reason: "gap_missing" };
  }

  for (const claim of answer.claims) {
    for (const citationId of claim.citationIds) {
      const citation = citations.get(citationId);
      if (!citation) {
        return { publishable: false, status: "REFUSED_GAP", reason: "citation_missing" };
      }

      const source = sources.find(
        (candidate) =>
          candidate.id === citation.sourceId &&
          candidate.hash === citation.sourceHash &&
          candidate.active,
      );
      if (!source) {
        return { publishable: false, status: "REFUSED_GAP", reason: "source_unresolvable" };
      }

      const sourceLastLine = source.firstLineNumber + source.lines.length - 1;
      if (
        citation.startLine < source.firstLineNumber ||
        citation.endLine > sourceLastLine ||
        citation.startLine > citation.endLine
      ) {
        return { publishable: false, status: "REFUSED_GAP", reason: "citation_range_invalid" };
      }

      const startIndex = citation.startLine - source.firstLineNumber;
      const endIndex = citation.endLine - source.firstLineNumber + 1;
      const citedText = source.lines.slice(startIndex, endIndex).join("\n");
      if (!citedText.includes(citation.excerpt)) {
        return { publishable: false, status: "REFUSED_GAP", reason: "excerpt_mismatch" };
      }
    }
  }

  return { publishable: true, status: answer.status, reason: null };
}
