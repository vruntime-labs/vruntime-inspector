export const EVIDENCE_CLASSES = Object.freeze(["observed", "derived", "inferred", "unknown"]);
export const JOB_STATES = Object.freeze(["queued", "running", "completed", "failed", "cancelled"]);
export const EFFECTS = Object.freeze(["readOnly", "launchesProcess", "accessesNetwork", "writesFilesystem", "executesForeignCode", "mutatesTarget", "mayDiscardData"]);
export const APPROVAL_REQUIRED_EFFECTS = Object.freeze(EFFECTS.filter((effect) => effect !== "readOnly"));
export class InspectorError extends Error {
  constructor(code, message, details = undefined) {
    super(message); this.name = "InspectorError"; this.code = code; this.details = details;
  }
}
export function assertEvidenceClass(value) {
  if (!EVIDENCE_CLASSES.includes(value)) throw new InspectorError("INVALID_EVIDENCE_CLASS", "Unsupported evidence classification.", { value });
  return value;
}
