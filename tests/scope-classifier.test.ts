import assert from "node:assert/strict";
import test from "node:test";

import { parseScopeClassification } from "../src/runtime/scope-classifier.js";

test("a malformed classifier response is unavailable rather than out of scope", () => {
  assert.equal(parseScopeClassification("I think this is probably relevant."), "unavailable");
});

test("the classifier accepts only exact scope labels", () => {
  assert.equal(parseScopeClassification("IN_SCOPE"), "knowledge");
  assert.equal(parseScopeClassification("OUT_OF_SCOPE"), "out_of_scope");
});
