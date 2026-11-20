import test from "node:test";
import assert from "node:assert/strict";
import { InspectionRegistry } from "../packages/core/src/index.js";
test("read-only inspector returns evidence and completed job", async () => {
  const registry = new InspectionRegistry();
  registry.register("sample", async () => ({ value: 7, evidence: [{ classification: "observed", title: "Value", summary: "Seven." }] }));
  const result = await registry.run("sample", {});
  assert.equal(result.job.state, "completed"); assert.equal(result.result.value, 7); assert.equal(result.result.evidence.length, 1);
});
test("active effects require explicit approval", async () => {
  const registry = new InspectionRegistry(); registry.register("active", async () => ({}), { effects: ["accessesNetwork"] });
  await assert.rejects(registry.run("active", {}), { code: "APPROVAL_REQUIRED" });
  assert.equal((await registry.run("active", {}, { approvedEffects: ["accessesNetwork"] })).job.state, "completed");
});
test("unknown inspector is structured error", async () => {
  const registry = new InspectionRegistry(); await assert.rejects(registry.run("missing", {}), { code: "INSPECTOR_NOT_FOUND" });
});
