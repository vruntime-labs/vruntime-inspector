#!/usr/bin/env node
import { readFile } from "node:fs/promises";
import { analyzeJavaScript } from "../../../packages/inspector-js/src/index.js";
import { parseHar } from "../../../packages/inspector-network/src/index.js";
function usage() {
  console.log("VRuntime Inspector 0.1.0\n\nUsage:\n  vri inspect-har <capture.har> [--json]\n  vri analyze-js <file.js> [--json]\n\nCommands inspect explicitly supplied files. Target code is not executed.");
}
const [command, file, ...flags] = process.argv.slice(2);
if (!command || command === "help" || command === "--help") usage();
else if (!file) { console.error("A file path is required."); process.exitCode = 2; }
else {
  try {
    const source = await readFile(file, "utf8");
    const result = command === "inspect-har" ? parseHar(source, { artifact: file }) :
      command === "analyze-js" ? analyzeJavaScript({ source, filePath: file }) : null;
    if (!result) throw new Error("Unknown command: " + command);
    if (flags.includes("--json")) console.log(JSON.stringify(result, null, 2));
    else if (command === "inspect-har") {
      console.log("HAR: " + file + "\nRequests: " + result.entryCount);
      for (const r of result.requests) console.log(String(r.status ?? "-").padStart(3) + "  " + r.method.padEnd(7) + " " + r.url);
      console.log("Evidence records: " + result.evidence.length + "\nCoverage: " + result.coverage.description);
    } else {
      console.log("Source: " + file + "\nLiteral module references: " + result.importCount);
      for (const item of result.imports) console.log(String(item.line).padStart(5) + "  " + item.kind.padEnd(16) + " " + item.specifier);
      console.log("Coverage: " + result.coverage.description);
    }
  } catch (error) { console.error((error.code ?? "ERROR") + ": " + error.message); process.exitCode = 1; }
}
