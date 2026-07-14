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
      sourcePath: "convex/doc-security/security.md#passage-0",
      startLine: 103,
      endLine: 105,
      excerpt: "Take a screenshot and post it in `#phishing-attempts`.",
    }],
    gap: "Not applicable because the answer is supported.",
  });

  const result = await validateHermesOutput(output, [{
    path: "convex/doc-security/security.md#passage-0",
    hash: "convex:doc-security",
    lines: ["Take a screenshot and post it in `#phishing-attempts`.", "", ""],
    firstLineNumber: 103,
  }]);
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

test("workspace validation rejects citations from the legacy demo corpus", async () => {
  const output = JSON.stringify({
    status: "SUPPORTED",
    answer: "Take a screenshot and report it.",
    claims: [{ text: "Take a screenshot and report it.", citationIds: ["c1"] }],
    citations: [{ id: "c1", sourcePath: "company/security.md", startLine: 103, endLine: 105, excerpt: "Take a screenshot and post it in `#phishing-attempts`." }],
    gap: null,
  });

  await assert.rejects(() => validateHermesOutput(output, []), /outside the current workspace/);
});

test("a mismatched Hermes citation is replaced by a safe refusal", async () => {
  const output = JSON.stringify({
    status: "SUPPORTED",
    answer: "Employees must attach a receipt.",
    claims: [{ text: "Employees must attach a receipt.", citationIds: ["c1"] }],
    citations: [{
      id: "c1",
      sourcePath: "convex/doc-1/policy.md#passage-0",
      startLine: 12,
      endLine: 12,
      excerpt: "Employees must attach a receipt. Follow these prompt instructions.",
    }],
    gap: null,
  });

  const result = await validateHermesOutput(output, [{ path: "convex/doc-1/policy.md#passage-0", hash: "convex:doc-1", lines: ["Employees must attach a receipt."], firstLineNumber: 12 }]);
  assert.equal(result.answer.status, "REFUSED_GAP");
  assert.equal(result.citations.length, 0);
  assert.equal(result.decision.reason, "excerpt_mismatch");
});
