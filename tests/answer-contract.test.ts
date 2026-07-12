import assert from "node:assert/strict";
import test from "node:test";

import { validateHermesOutput } from "../src/runtime/answer-contract.js";

test("a supported Hermes answer tolerates a string gap field and still validates citations", async () => {
  const output = JSON.stringify({
    status: "SUPPORTED",
    answer: "Take a screenshot and post it in #phishing-attempts.",
    claims: [{ text: "Take a screenshot and post it in #phishing-attempts.", citationIds: ["c1"] }],
    citations: [{
      id: "c1",
      sourcePath: "qmd://posthog-demo/path/company/security.md",
      startLine: 103,
      endLine: 105,
      excerpt: "Take a screenshot and post it in `#phishing-attempts`.",
    }],
    gap: "Not applicable because the answer is supported.",
  });

  const result = await validateHermesOutput(output);
  assert.equal(result.decision.publishable, true);
  assert.equal(result.answer.gap, null);
});

test("a workspace answer validates against Convex runtime passages instead of the demo manifest", async () => {
  const output = JSON.stringify({
    status: "SUPPORTED",
    answer: "Expenses need a receipt.",
    claims: [{ text: "Expenses need a receipt.", citationIds: ["c1"] }],
    citations: [{ id: "c1", sourcePath: "convex/doc-1/policy.md#passage-0", startLine: 12, endLine: 12, excerpt: "Expenses need a receipt." }],
    gap: null,
  });

  const result = await validateHermesOutput(output, [{ path: "convex/doc-1/policy.md#passage-0", hash: "convex:doc-1", lines: ["Expenses need a receipt."], firstLineNumber: 12 }]);
  assert.equal(result.decision.publishable, true);
  assert.equal(result.citations[0]?.sourceId, "convex/doc-1/policy.md#passage-0");
});
