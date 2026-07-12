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
