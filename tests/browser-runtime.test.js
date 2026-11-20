import test from "node:test";
import assert from "node:assert/strict";
import {
  classifyRuntimeAction, createRuntimeEvidence, createRuntimeInspectionPlan,
  normalizeRuntimeLimits, normalizeViewport, redactRuntimeUrl, validateRuntimeTarget
} from "../packages/inspector-browser/src/index.js";
import { discoverRuntimePageTargets, runtimeInspectWebsite } from "../packages/inspector-browser/src/cloudflare.js";

test("creates a bounded runtime plan with default desktop viewport", () => {
  const plan = createRuntimeInspectionPlan({ url: "https://example.com/?token=private" });
  assert.equal(plan.target, "https://example.com/?token=%5BREDACTED%5D");
  assert.equal(plan.viewport.width, 1440);
  assert.equal(plan.limits.maxActions, 24);
  assert.equal(plan.policy.allowFormSubmission, false);
});

test("rejects local, private, reserved and credential-bearing targets", () => {
  for (const url of ["http://localhost", "http://127.0.0.1", "http://192.168.1.2", "http://100.64.0.1", "https://app.internal", "https://user:pass@example.com", "https://example.test", "https://8.8.8.8", "http://2130706433"]) assert.throws(() => validateRuntimeTarget(url));
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

test("requires explicit approval, captured control IDs and safe action labels", () => {
  assert.throws(() => classifyRuntimeAction({ type: "click", label: "Open settings" }), /controlId/);
  assert.equal(classifyRuntimeAction({ type: "click", controlId: "vri-12", label: "Open settings" }).allowed, false);
  const approvedClick = classifyRuntimeAction({ type: "click", controlId: "vri-12", label: "Open settings", approved: true });
  assert.equal(approvedClick.allowed, true);
  assert.equal(approvedClick.effect, "mutatesTarget");
  const destructive = classifyRuntimeAction({ type: "click", controlId: "vri-12", label: "Delete account", approved: true });
  assert.equal(destructive.allowed, false);
  assert.equal(destructive.effect, "mutatesTarget");
  assert.equal(classifyRuntimeAction({ type: "click", controlId: "vri-12", label: "Sign in", approved: true }).allowed, false);
  assert.equal(classifyRuntimeAction({ type: "hover", controlId: "vri-12", label: "Menu", approved: true }).allowed, true);
});

test("limits keyboard actions and scrolling to safe bounded inputs", () => {
  assert.equal(classifyRuntimeAction({ type: "press", key: "Tab", approved: true }).allowed, true);
  assert.throws(() => classifyRuntimeAction({ type: "press", key: "Enter", approved: true }), /Only Tab/);
  assert.equal(classifyRuntimeAction({ type: "scroll", deltaY: 500, approved: true }).allowed, true);
  assert.throws(() => classifyRuntimeAction({ type: "scroll", deltaY: 5000, approved: true }), /bounded range/);
  assert.throws(() => classifyRuntimeAction({ type: "navigate", url: "https://outside.example", approved: true }), /Navigation and form submission are disabled/);
  assert.throws(() => classifyRuntimeAction({ type: "evaluate", expression: "alert(1)" }), /Supported runtime actions/);
});

test("discovers only bounded same-origin page routes and honors robots disallow rules", () => {
  const links = [
    { href: "https://example.com/about?campaign=private#top" },
    { href: "https://outside.example/pricing" },
    { href: "https://example.com/assets/app.js" },
    { href: "https://example.com/private/account" },
    { href: "https://example.com/contact" },
    { href: "mailto:team@example.com" }
  ];
  assert.deepEqual(
    discoverRuntimePageTargets(links, "https://example.com/", 4, ["/private/"]),
    ["https://example.com/about", "https://example.com/contact"]
  );
  assert.deepEqual(
    discoverRuntimePageTargets(links, "https://example.com/", 1, []),
    ["https://example.com/about"]
  );
});

test("runtime evidence preserves provenance and redacts source URLs", () => {
  const evidence = createRuntimeEvidence({ classification: "observed", sourceUrl: "https://example.com/?session=secret", detail: "Button became visible." });
  assert.equal(evidence.provenance, "runtime-browser"); assert.doesNotMatch(evidence.sourceUrl, /secret/);
});

test("runtime provider refuses to launch without a browser binding", async () => {
  await assert.rejects(() => runtimeInspectWebsite({}, { url: "https://example.com" }), /Browser Run binding is missing/);
});

test("runtime provider requires HTTPS before loading its browser dependency", async () => {
  await assert.rejects(() => runtimeInspectWebsite({ BROWSER: {} }, { url: "http://example.com" }), /requires HTTPS/);
});
