import test from "node:test";
import assert from "node:assert/strict";
import { createEvidence, EvidenceLedger } from "../packages/evidence/src/index.js";
test("evidence classification and stable digest", () => {
  const input = { id: "e1", classification: "observed", title: "Request", summary: "Recorded.", observedAt: "2026-01-01T00:00:00.000Z" };
  assert.equal(createEvidence(input).digest, createEvidence(input).digest);
});
test("ledger rejects duplicate IDs and filters", () => {
  const ledger = new EvidenceLedger(); const item = { id: "one", classification: "derived", title: "Import", summary: "Found.", source: { kind: "source-file" } };
  ledger.add(item); assert.equal(ledger.list({ sourceKind: "source-file" }).length, 1);
  assert.throws(() => ledger.add(item), { code: "DUPLICATE_EVIDENCE" });
});
test("invalid classifications are rejected", () => assert.throws(() => createEvidence({ classification: "certain", title: "x", summary: "y" }), { code: "INVALID_EVIDENCE_CLASS" }));
