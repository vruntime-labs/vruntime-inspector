import { createHash, randomUUID } from "node:crypto";
import { assertEvidenceClass, InspectorError } from "../../contracts/src/index.js";
function stable(value) {
  if (Array.isArray(value)) return value.map(stable);
  if (value && typeof value === "object") return Object.fromEntries(Object.keys(value).sort().map((key) => [key, stable(value[key])]));
  return value;
}
export function createEvidence(input) {
  if (!input || typeof input !== "object") throw new InspectorError("INVALID_EVIDENCE", "Evidence must be an object.");
  const classification = assertEvidenceClass(input.classification);
  if (typeof input.title !== "string" || !input.title.trim() || typeof input.summary !== "string" || !input.summary.trim())
    throw new InspectorError("INVALID_EVIDENCE", "Evidence title and summary are required.");
  const record = {
    id: input.id ?? randomUUID(), classification, title: input.title.trim(), summary: input.summary.trim(),
    observedAt: input.observedAt ?? new Date().toISOString(), source: input.source ?? { kind: "unspecified" },
    coverage: input.coverage ?? { status: "unspecified", description: "Coverage was not supplied." },
    limitations: Array.isArray(input.limitations) ? [...input.limitations] : [],
    relatedEvidence: Array.isArray(input.relatedEvidence) ? [...input.relatedEvidence] : []
  };
  record.digest = createHash("sha256").update(JSON.stringify(stable(record))).digest("hex");
  return Object.freeze(record);
}
export class EvidenceLedger {
  #records = new Map();
  add(input) {
    const record = createEvidence(input);
    if (this.#records.has(record.id)) throw new InspectorError("DUPLICATE_EVIDENCE", "Evidence ID already exists.", { id: record.id });
    this.#records.set(record.id, record); return record;
  }
  get(id) { return this.#records.get(id) ?? null; }
  list({ classification, sourceKind } = {}) {
    return [...this.#records.values()].filter((item) => (!classification || item.classification === classification) && (!sourceKind || item.source.kind === sourceKind));
  }
  toJSON() { return { schemaVersion: "1.0", evidence: this.list() }; }
}
