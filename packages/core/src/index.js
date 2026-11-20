import { randomUUID } from "node:crypto";
import { APPROVAL_REQUIRED_EFFECTS, InspectorError, EFFECTS } from "../../contracts/src/index.js";
import { EvidenceLedger } from "../../evidence/src/index.js";
export class InspectionRegistry {
  #inspectors = new Map();
  register(name, handler, metadata = {}) {
    if (!/^[a-z][a-z0-9-]*$/.test(name)) throw new InspectorError("INVALID_INSPECTOR_NAME", "Inspector name must be kebab-case.");
    if (this.#inspectors.has(name)) throw new InspectorError("DUPLICATE_INSPECTOR", "Inspector is already registered.", { name });
    if (typeof handler !== "function") throw new InspectorError("INVALID_INSPECTOR", "Inspector handler must be a function.");
    const effects = metadata.effects ?? ["readOnly"];
    for (const effect of effects) if (!EFFECTS.includes(effect)) throw new InspectorError("INVALID_EFFECT", "Unknown execution effect.", { effect });
    this.#inspectors.set(name, Object.freeze({ name, handler, effects: [...new Set(effects)], description: metadata.description ?? "" }));
  }
  list() { return [...this.#inspectors.values()].map(({ name, effects, description }) => ({ name, effects, description })); }
  async run(name, input, options = {}) {
    const inspector = this.#inspectors.get(name);
    if (!inspector) throw new InspectorError("INSPECTOR_NOT_FOUND", "No inspector is registered with that name.", { name });
    const approved = new Set(options.approvedEffects ?? []);
    const required = inspector.effects.filter((effect) => APPROVAL_REQUIRED_EFFECTS.includes(effect));
    const missing = required.filter((effect) => !approved.has(effect));
    if (missing.length) throw new InspectorError("APPROVAL_REQUIRED", "Active effects require explicit approval.", { requiredEffects: missing });
    const job = { id: options.jobId ?? randomUUID(), inspector: name, state: "running", startedAt: new Date().toISOString() };
    const controller = new AbortController();
    const onAbort = () => controller.abort(options.signal?.reason);
    if (options.signal?.aborted) onAbort(); else options.signal?.addEventListener("abort", onAbort, { once: true });
    let timer;
    try {
      if (controller.signal.aborted) throw new InspectorError("CANCELLED", "Inspection was cancelled before execution.");
      const timeoutMs = options.timeoutMs ?? 30000;
      if (!Number.isFinite(timeoutMs) || timeoutMs <= 0) throw new InspectorError("INVALID_TIMEOUT", "timeoutMs must be positive.");
      const timeout = new Promise((_, reject) => { timer = setTimeout(() => { controller.abort(); reject(new InspectorError("TIMEOUT", "Inspection exceeded its time limit.", { timeoutMs })); }, timeoutMs); });
      const result = await Promise.race([Promise.resolve().then(() => inspector.handler(input, { signal: controller.signal, jobId: job.id })), timeout]);
      if (controller.signal.aborted) throw new InspectorError("CANCELLED", "Inspection was cancelled.");
      job.state = "completed"; job.finishedAt = new Date().toISOString();
      const ledger = new EvidenceLedger();
      for (const record of result.evidence ?? []) ledger.add(record);
      return { job: Object.freeze(job), result: { ...result, evidence: ledger.list() } };
    } catch (error) {
      job.state = error?.code === "CANCELLED" || options.signal?.aborted ? "cancelled" : "failed";
      job.finishedAt = new Date().toISOString();
      throw error instanceof InspectorError ? error : new InspectorError("INSPECTION_FAILED", error?.message ?? "Inspection failed.", { job });
    } finally {
      clearTimeout(timer); options.signal?.removeEventListener("abort", onAbort);
    }
  }
}
export { EvidenceLedger };
