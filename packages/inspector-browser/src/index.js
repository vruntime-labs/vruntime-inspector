import { InspectorError } from "../../contracts/src/index.js";

export const RUNTIME_LIMITS = Object.freeze({
  maxPages: 6,
  maxActions: 24,
  maxScreenshots: 12,
  maxDurationMs: 90_000,
  maxNetworkEvents: 300,
  maxDomNodes: 5_000
});

export const VIEWPORT_PRESETS = Object.freeze({
  desktop: Object.freeze({ width: 1440, height: 900, deviceScaleFactor: 1, isMobile: false }),
  tablet: Object.freeze({ width: 820, height: 1180, deviceScaleFactor: 1, isMobile: true }),
  mobile: Object.freeze({ width: 390, height: 844, deviceScaleFactor: 1, isMobile: true })
});

const PRIVATE_IPV4 = /^(?:0\.|10\.|127\.|169\.254\.|192\.0\.0\.|192\.0\.2\.|192\.168\.|198\.51\.100\.|203\.0\.113\.|198\.(?:18|19)\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.|172\.(?:1[6-9]|2\d|3[01])\.|22[4-9]\.|23\.|24\d\.|25[0-5]\.)/;
const SENSITIVE = /(token|secret|password|passwd|auth|session|signature|api[_-]?key|access[_-]?key|jwt|credential|code)/i;
const DESTRUCTIVE = /\b(delete|remove|destroy|logout|sign out|log out|sign in|log in|authenticate|purchase|buy now|checkout|pay now|transfer|send|publish|post|submit|upload|install|uninstall|reset|revoke|confirm order)\b/i;

export function validateRuntimeTarget(value) {
  let url;
  try { url = new URL(value); }
  catch { throw new InspectorError("INVALID_TARGET", "Enter an absolute HTTP or HTTPS URL."); }
  if (!["http:", "https:"].includes(url.protocol)) throw new InspectorError("UNSUPPORTED_PROTOCOL", "Runtime inspection accepts HTTP and HTTPS URLs only.");
  if (url.username || url.password) throw new InspectorError("URL_CREDENTIALS", "URLs containing embedded credentials are not accepted.");
  if (url.port && !["80", "443"].includes(url.port)) throw new InspectorError("NON_STANDARD_PORT", "Only standard HTTP and HTTPS ports are accepted.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".test") || host === "metadata.google.internal" || PRIVATE_IPV4.test(host) || host === "::1" || host.includes(":")) {
    throw new InspectorError("PRIVATE_TARGET", "Local, private, internal and reserved hostnames are not accepted by the hosted runtime provider.");
  }
  url.hash = "";
  return url;
}

export function redactRuntimeUrl(value) {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) if (SENSITIVE.test(key)) url.searchParams.set(key, "[REDACTED]");
    url.hash = "";
    return url.href;
  } catch { return String(value); }
}

export function normalizeViewport(value = "desktop") {
  if (typeof value === "string" && VIEWPORT_PRESETS[value]) return { name: value, ...VIEWPORT_PRESETS[value] };
  if (!value || typeof value !== "object") throw new InspectorError("INVALID_VIEWPORT", "Choose desktop, tablet, mobile or a valid custom viewport.");
  const width = Number(value.width), height = Number(value.height), deviceScaleFactor = Number(value.deviceScaleFactor ?? 1);
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 320 || width > 2560 || height < 480 || height > 1800 || !Number.isFinite(deviceScaleFactor) || deviceScaleFactor < 1 || deviceScaleFactor > 3) {
    throw new InspectorError("INVALID_VIEWPORT", "Custom viewport dimensions or device scale factor are outside the supported bounds.");
  }
  return { name: "custom", width, height, deviceScaleFactor, isMobile: Boolean(value.isMobile) };
}

export function normalizeRuntimeLimits(input = {}) {
  const limits = {};
  for (const [key, maximum] of Object.entries(RUNTIME_LIMITS)) {
    const requested = input[key] === undefined ? maximum : Number(input[key]);
    if (!Number.isInteger(requested) || requested < 1) throw new InspectorError("INVALID_LIMIT", key + " must be a positive integer.");
    limits[key] = Math.min(requested, maximum);
  }
  return limits;
}

export function classifyRuntimeAction(action) {
  if (!action || typeof action !== "object" || typeof action.type !== "string") {
    throw new InspectorError("INVALID_ACTION", "A runtime action must include a supported type.");
  }
  const type = action.type.toLowerCase();
  if (!["click", "hover", "press", "scroll", "navigate"].includes(type)) {
    throw new InspectorError("UNSUPPORTED_ACTION", "Supported actions are click, hover, press, scroll and navigate.");
  }
  const label = String(action.label ?? action.text ?? action.accessibleName ?? "").slice(0, 300);
  if (DESTRUCTIVE.test(label)) {
    return { type, label, effect: "mutatesTarget", requiresApproval: true, allowed: false, reason: "Authentication, destructive or externally committing controls are never auto-activated." };
  }
  if (type === "navigate") {
    const destination = validateRuntimeTarget(action.url);
    const source = action.currentUrl ? validateRuntimeTarget(action.currentUrl) : null;
    if (source && destination.origin !== source.origin) {
      return { type, label, effect: "accessesNetwork", requiresApproval: true, allowed: false, reason: "Runtime navigation is restricted to the inspected origin." };
    }
  }
  const effect = type === "navigate" ? "accessesNetwork" : ["click", "press"].includes(type) ? "mutatesTarget" : "readOnly";
  return {
    type, label, effect,
    requiresApproval: true,
    allowed: action.approved === true,
    reason: action.approved === true ? "Explicitly approved for this inspection step." : "Interaction requires explicit user approval before execution."
  };
}

export function createRuntimeInspectionPlan(input) {
  const target = validateRuntimeTarget(input?.url);
  const limits = normalizeRuntimeLimits(input?.limits);
  const viewport = normalizeViewport(input?.viewport);
  const actions = Array.isArray(input?.actions) ? input.actions.slice(0, limits.maxActions).map(classifyRuntimeAction) : [];
  return Object.freeze({
    target: redactRuntimeUrl(target.href),
    origin: target.origin,
    viewport,
    limits,
    actions,
    policy: Object.freeze({
      executeTargetCodeOnlyInIsolatedBrowser: true,
      allowCrossOriginNavigation: false,
      allowFormSubmission: false,
      allowDownloads: false,
      allowPopups: false,
      allowFileAccess: false,
      redactSensitiveUrlValues: true,
      captureOnlyAfterExplicitActionApproval: true
    })
  });
}

export function createRuntimeEvidence({ classification, sourceUrl, detail, observedAt = new Date().toISOString(), pageId = null, actionId = null }) {
  if (!["observed", "derived", "inferred", "unknown"].includes(classification)) {
    throw new InspectorError("INVALID_EVIDENCE_CLASS", "Unsupported runtime evidence classification.");
  }
  if (typeof detail !== "string" || !detail.trim()) throw new InspectorError("INVALID_EVIDENCE", "Evidence detail must be a non-empty string.");
  return Object.freeze({
    classification,
    sourceUrl: sourceUrl ? redactRuntimeUrl(sourceUrl) : null,
    detail: detail.slice(0, 2000),
    observedAt,
    pageId,
    actionId,
    provenance: "runtime-browser"
  });
}
