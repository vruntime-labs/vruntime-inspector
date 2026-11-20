import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyRuntimeAction, createRuntimeEvidence, createRuntimeInspectionPlan,
  normalizeRuntimeLimits, normalizeViewport, redactRuntimeUrl, validateRuntimeTarget
} from "../packages/inspector-browser/src/index.js";

test("creates a bounded runtime plan with default desktop viewport", () => {
  const plan = createRuntimeInspectionPlan({ url: "https://example.com/?token=private" });
  assert.equal(plan.target, "https://example.com/?token=%5BREDACTED%5D");
  assert.equal(plan.viewport.width, 1440);
  assert.equal(plan.limits.maxActions, 24);
  assert.equal(plan.policy.allowFormSubmission, false);
});

test("rejects local, private, reserved and credential-bearing targets", () => {
  for (const url of ["http://localhost", "http://127.0.0.1", "http://192.168.1.2", "https://app.internal", "https://user:pass@example.com", "https://example.test"]) assert.throws(() => validateRuntimeTarget(url));
});

test("redacts sensitive query parameters without changing ordinary values", () => {
  const value = redactRuntimeUrl("https://example.com/path?theme=dark&access_token=abc#fragment");
  assert.match(value, /theme=dark/); assert.doesNotMatch(value, /abc|fragment/);
});

test("clamps requested limits and validates viewport bounds", () => {
  assert.equal(normalizeRuntimeLimits({ maxActions: 999 }).maxActions, 24);
  assert.equal(normalizeViewport("mobile").width, 390);
  assert.throws(() => normalizeViewport({ width: 100, height: 100 }));
});

test("requires explicit approval and blocks destructive actions", () => {
  assert.equal(classifyRuntimeAction({ type: "click", label: "Open settings" }).allowed, false);
  assert.equal(classifyRuntimeAction({ type: "click", label: "Open settings", approved: true }).allowed, true);
  const destructive = classifyRuntimeAction({ type: "click", label: "Delete account", approved: true });
  assert.equal(destructive.allowed, false); assert.equal(destructive.effect, "mutatesTarget");
});

test("blocks cross-origin navigation and unsupported actions", () => {
  assert.equal(classifyRuntimeAction({ type: "navigate", url: "https://outside.example", currentUrl: "https://example.com", approved: true }).allowed, false);
  assert.throws(() => classifyRuntimeAction({ type: "evaluate", expression: "alert(1)" }));
});

test("runtime evidence preserves provenance and redacts source URLs", () => {
  const evidence = createRuntimeEvidence({ classification: "observed", sourceUrl: "https://example.com/?session=secret", detail: "Button became visible." });
  assert.equal(evidence.provenance, "runtime-browser"); assert.doesNotMatch(evidence.sourceUrl, /secret/);
});
