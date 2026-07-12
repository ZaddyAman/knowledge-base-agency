import assert from "node:assert/strict";
import test from "node:test";

import { validateAnswer } from "../src/domain/answer-validator.js";

test("a supported answer is publishable when every claim has a resolvable exact citation", () => {
  const decision = validateAnswer(
    {
      status: "SUPPORTED",
      answer: "Take a screenshot and post it in #phishing-attempts.",
      claims: [
        {
          text: "Take a screenshot and post it in #phishing-attempts.",
          citationIds: ["citation-1"],
        },
      ],
      citations: [
        {
          id: "citation-1",
          sourceId: "security",
          sourceHash: "sha256:security-v1",
          startLine: 103,
          endLine: 105,
          excerpt:
            "If you receive a phishing email/text/whatsapp, it's useful to report it to the security team so that they can make other employees aware. Take a screenshot and post it in `#phishing-attempts`.",
        },
      ],
    },
    [
      {
        id: "security",
        hash: "sha256:security-v1",
        active: true,
        lines: [
          "## Reporting phishing",
          "",
          "If you receive a phishing email/text/whatsapp, it's useful to report it to the security team so that they can make other employees aware. Take a screenshot and post it in `#phishing-attempts`.",
        ],
        firstLineNumber: 103,
      },
    ],
  );

  assert.deepEqual(decision, {
    publishable: true,
    status: "SUPPORTED",
    reason: null,
  });
});

test("an uncited supported answer is downgraded to a safe refusal", () => {
  const decision = validateAnswer(
    {
      status: "SUPPORTED",
      answer: "Employees may work abroad for 30 days.",
      claims: [],
      citations: [],
    },
    [],
  );

  assert.deepEqual(decision, {
    publishable: false,
    status: "REFUSED_GAP",
    reason: "uncited_supported_answer",
  });
});

test("a safe refusal is not publishable unless it records a knowledge gap", () => {
  const decision = validateAnswer(
    {
      status: "REFUSED_GAP",
      answer: "I can’t answer this from the available documents.",
      claims: [],
      citations: [],
    },
    [],
  );

  assert.deepEqual(decision, {
    publishable: false,
    status: "REFUSED_GAP",
    reason: "gap_missing",
  });
});

test("a citation is rejected when its declared line range is reversed", () => {
  const decision = validateAnswer(
    {
      status: "SUPPORTED",
      answer: "Report phishing in the security channel.",
      claims: [{ text: "Report phishing in the security channel.", citationIds: ["c1"] }],
      citations: [{
        id: "c1",
        sourceId: "security",
        sourceHash: "sha256:security-v1",
        startLine: 105,
        endLine: 103,
        excerpt: "Report phishing in the security channel.",
      }],
    },
    [{
      id: "security",
      hash: "sha256:security-v1",
      active: true,
      lines: ["Report phishing in the security channel."],
      firstLineNumber: 103,
    }],
  );

  assert.deepEqual(decision, {
    publishable: false,
    status: "REFUSED_GAP",
    reason: "citation_range_invalid",
  });
});
