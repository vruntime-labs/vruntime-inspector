import test from "node:test";
import assert from "node:assert/strict";
import { analyzeJavaScript } from "../packages/inspector-js/src/index.js";
import { parseHar, diffHar } from "../packages/inspector-network/src/index.js";
test("JS scanner finds literal imports and source-map hint", () => {
  const result = analyzeJavaScript({ filePath: "app.js", source: 'import x from "./x.js";\nexport { y } from "./y.js";\nconst z = import("./z.js");\n//# sourceMappingURL=app.js.map' });
  assert.equal(result.importCount, 3); assert.equal(result.sourceMapReference, "app.js.map"); assert.equal(result.evidence.length, 3);
});
const sample = (url, status = 200) => ({ log: { entries: [{ request: { method: "GET", url, headers: [{ name: "Authorization", value: "Bearer secret" }] }, response: { status, content: { mimeType: "application/json" } }, time: 12 }] } });
test("HAR parser redacts credential values and emits observed evidence", () => {
  const result = parseHar(sample("https://example.test/api?token=abc&view=full"));
  assert.match(result.requests[0].url, /token=%5BREDACTED%5D/); assert.equal(result.requests[0].requestHeaders[0].value, "[REDACTED]");
  assert.equal(result.evidence[0].classification, "observed");
});
test("HAR diff compares sanitized method and URL signatures", () => {
  const result = diffHar(parseHar(sample("https://example.test/a")), parseHar(sample("https://example.test/b", 404)));
  assert.equal(result.added.length, 1); assert.equal(result.removed.length, 1);
});
test("HAR parser rejects missing entries", () => assert.throws(() => parseHar({ log: {} }), /log.entries/));
