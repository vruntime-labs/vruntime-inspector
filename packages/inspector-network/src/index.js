import { createEvidence } from "../../evidence/src/index.js";
const SECRET = /(authorization|proxy-authorization|cookie|set-cookie|token|secret|password|api[-_]?key|access[-_]?key|session)/i;
function redactUrl(raw) {
  try {
    const url = new URL(raw);
    if (url.username) url.username = "[REDACTED]";
    if (url.password) url.password = "[REDACTED]";
    for (const key of [...url.searchParams.keys()]) if (SECRET.test(key)) url.searchParams.set(key, "[REDACTED]");
    return url.toString();
  } catch { return "[INVALID_URL]"; }
}
function safeHeaders(headers = []) {
  return headers.map(({ name = "", value = "" }) => ({ name, value: SECRET.test(name) ? "[REDACTED]" : String(value) }));
}
export function parseHar(input, { artifact = "capture.har" } = {}) {
  const har = typeof input === "string" ? JSON.parse(input) : input;
  const entries = har?.log?.entries;
  if (!Array.isArray(entries)) throw new TypeError("Invalid HAR: expected log.entries array.");
  const requests = entries.map((entry, index) => {
    const request = entry?.request ?? {}, response = entry?.response ?? {};
    return { index, method: String(request.method ?? "GET").toUpperCase(), url: redactUrl(request.url ?? ""),
      status: Number.isFinite(response.status) ? response.status : null, mimeType: response.content?.mimeType ?? null,
      startedDateTime: entry.startedDateTime ?? null, timeMs: Number.isFinite(entry.time) ? entry.time : null,
      requestHeaders: safeHeaders(request.headers), responseHeaders: safeHeaders(response.headers) };
  });
  const evidence = requests.map((r) => createEvidence({
    classification: "observed", title: r.method + " " + r.url,
    summary: "HAR entry " + r.index + " records " + r.method + " " + r.url + " with response status " + (r.status ?? "unknown") + ".",
    source: { kind: "har-entry", artifact, location: { entryIndex: r.index } },
    coverage: { status: "observed", description: "Extracted from one supplied HAR entry; not traffic outside the capture." },
    limitations: ["Credential-like header and query values are redacted in this output."]
  }));
  return { artifact, entryCount: entries.length, requests, evidence,
    coverage: { status: "partial", description: "Only entries present in the supplied HAR file were examined.", limitations: ["HAR files may omit requests, bodies, timing details or sensitive values.", "No live network requests are made."] } };
}
export function diffHar(before, after) {
  const left = before.requests ?? parseHar(before).requests, right = after.requests ?? parseHar(after).requests;
  const signature = (item) => item.method + " " + item.url;
  const lc = new Map(), rc = new Map();
  for (const item of left) lc.set(signature(item), (lc.get(signature(item)) ?? 0) + 1);
  for (const item of right) rc.set(signature(item), (rc.get(signature(item)) ?? 0) + 1);
  const added = [], removed = [];
  for (const [key, count] of rc) if (count > (lc.get(key) ?? 0)) added.push({ request: key, count: count - (lc.get(key) ?? 0) });
  for (const [key, count] of lc) if (count > (rc.get(key) ?? 0)) removed.push({ request: key, count: count - (rc.get(key) ?? 0) });
  return { added, removed, beforeCount: left.length, afterCount: right.length, coverage: "Compares sanitized method-and-URL signatures only; not bodies, headers or timing." };
}
