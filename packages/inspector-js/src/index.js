import { createEvidence } from "../../evidence/src/index.js";
const PATTERNS = [
  { kind: "static-import", regex: /^\s*import\s+(?:[^"'()]*?\s+from\s+)?["']([^"']+)["']/gm },
  { kind: "re-export", regex: /^\s*export\s+[^"']*?\s+from\s+["']([^"']+)["']/gm },
  { kind: "dynamic-import", regex: /\bimport\s*\(\s*["']([^"']+)["']\s*\)/gm },
  { kind: "commonjs-require", regex: /\brequire\s*\(\s*["']([^"']+)["']\s*\)/gm }
];
export function analyzeJavaScript({ source, filePath = "input.js" } = {}) {
  if (typeof source !== "string") throw new TypeError("source must be a string");
  const imports = [];
  for (const pattern of PATTERNS) {
    pattern.regex.lastIndex = 0;
    for (const match of source.matchAll(pattern.regex)) imports.push({ kind: pattern.kind, specifier: match[1], line: source.slice(0, match.index).split("\n").length });
  }
  imports.sort((a, b) => a.line - b.line || a.specifier.localeCompare(b.specifier));
  const mapMatch = source.match(/\/\/[#@]\s*sourceMappingURL=([^\s]+)/);
  const evidence = imports.map((item) => createEvidence({
    classification: "derived", title: "Module reference: " + item.specifier,
    summary: "A " + item.kind + " reference to " + item.specifier + " was matched in " + filePath + " at line " + item.line + ".",
    source: { kind: "source-file", artifact: filePath, location: { line: item.line } },
    coverage: { status: "partial", description: "Text-pattern scan; not a complete ECMAScript parser." },
    limitations: ["Regex discovery can miss computed imports and may match comments or strings.", "No dependency resolution or code execution is performed."]
  }));
  return { filePath, bytes: Buffer.byteLength(source, "utf8"), importCount: imports.length, imports, sourceMapReference: mapMatch?.[1] ?? null, evidence,
    coverage: { status: "partial", description: "Recognizes common literal imports, re-exports, dynamic imports and CommonJS requires.", limitations: ["Not AST parsing.", "Computed paths, aliases, package resolution and generated code are not analyzed."] } };
}
