import assert from "node:assert/strict";
import test from "node:test";

import { routeQuestion } from "../src/runtime/question-router.js";

test("greetings receive an immediate conversational response", () => {
  assert.deepEqual(routeQuestion("Hi"), {
    kind: "conversation",
    answer: "Hi! Ask me anything about the PostHog team handbook, policies, or operations.",
  });
});

test("clearly unrelated questions stay outside the knowledge workflow", () => {
  assert.deepEqual(routeQuestion("What is the weather in Chennai?"), {
    kind: "out_of_scope",
    answer: "I can only answer questions about this workspace's company handbook, policies, and operations.",
  });
});

test("company knowledge questions enter the Hermes workflow", () => {
  assert.deepEqual(routeQuestion("How do I report a phishing message?"), {
    kind: "knowledge",
  });
});

test("ambiguous questions request semantic scope classification", () => {
  assert.deepEqual(routeQuestion("Can I bring my spouse?"), {
    kind: "classify",
  });
});

test("an unrelated prompt containing a generic work word stays outside retrieval", () => {
  assert.deepEqual(routeQuestion("Tell me a joke about work"), {
    kind: "out_of_scope",
    answer: "I can only answer questions about this workspace's company handbook, policies, and operations.",
  });
});

test("organizational intent wins when a knowledge question mentions an unrelated category", () => {
  assert.deepEqual(routeQuestion("Can I expense a programming course?"), {
    kind: "knowledge",
  });
});

test("general-knowledge questions outside the topic examples require classification, not retrieval", () => {
  assert.deepEqual(routeQuestion("Who is the president of India?"), {
    kind: "classify",
  });
});
