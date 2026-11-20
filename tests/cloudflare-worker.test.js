import test from "node:test";
import assert from "node:assert/strict";
import worker, { handleRequest } from "../apps/cloudflare/worker.js";

const originalFetch = globalThis.fetch;
const htmlA = `<!doctype html><html><head><title>Sample Studio</title><meta name="description" content="Create and edit visual projects"><link rel="stylesheet" href="/site.css"><script src="/app.js"></script></head><body><h1>Design workspace</h1><h2>Templates</h2><a href="/features">Explore features</a><button>Start creating</button><form action="/search"><input name="q" placeholder="Search"></form><img src="/hero.png"></body></html>`;
const htmlB = `<!doctype html><html><head><title>Features</title></head><body><h1>Editing tools</h1><button>Export</button><a href="/">Home</a></body></html>`;
function mockFetch(url) {
  const value = String(url);
  if (value.endsWith("/robots.txt")) return Promise.resolve(new Response("User-agent: *\nDisallow: /private", { status: 200, headers: { "content-type": "text/plain" } }));
  if (value.endsWith("/features")) return Promise.resolve(new Response(htmlB, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }));
  if (value.startsWith("https://sample.example/")) return Promise.resolve(new Response(htmlA, { status: 200, headers: { "content-type": "text/html; charset=utf-8" } }));
  if (value === "https://redirect.example/") return Promise.resolve(new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } }));
  return Promise.resolve(new Response("Not found", { status: 404, headers: { "content-type": "text/plain" } }));
}

test("serves health and hosted workbench", async () => {
  const health = await handleRequest(new Request("https://inspector.example/api/health"));
  assert.equal(health.status, 200);
  assert.equal(health.headers.get("x-frame-options"), "DENY");
  assert.equal((await health.json()).service, "vruntime-inspector-cloud");
  const page = await handleRequest(new Request("https://inspector.example/"));
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Start a website inspection/);
  assert.equal(typeof worker.fetch, "function");
});

test("rejects local and IP-literal targets before network access", async () => {
  globalThis.fetch = async () => { throw new Error("fetch should not be called"); };
  const response = await handleRequest(new Request("https://inspector.example/api/inspect-website", { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": "198.51.100.1" }, body: JSON.stringify({ url: "http://127.0.0.1/secret" }) }));
  assert.equal(response.status, 400);
  assert.match((await response.json()).error, /IP-address/);
});

test("inspects same-origin pages and produces an AI reconstruction brief", async () => {
  globalThis.fetch = mockFetch;
  const response = await handleRequest(new Request("https://inspector.example/api/inspect-website", { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": "198.51.100.2" }, body: JSON.stringify({ url: "https://sample.example/?api_key=super-secret-value", maxPages: 2 }) }));
  assert.equal(response.status, 200);
  const data = await response.json();
  assert.equal(data.pages.length, 2);
  assert.equal(data.pages[0].title, "Sample Studio");
  assert.ok(data.pages[0].buttons.some(button => button.text === "Start creating"));
  assert.ok(data.pages[0].links.some(link => link.url.endsWith("/features")));
  assert.match(data.aiBriefMarkdown, /Rebuild guidance for the connected AI/);
  assert.ok(data.coverage.limitations.length >= 4);
  assert.equal(JSON.stringify(data).includes("super-secret-value"), false);
});

test("revalidates redirects and refuses a redirect to a private address", async () => {
  let privateTargetFetched = false;
  globalThis.fetch = async url => {
    const value = String(url);
    if (value.endsWith("/robots.txt")) return new Response("", { status: 404 });
    if (value === "https://redirect.example/") return new Response(null, { status: 302, headers: { location: "http://127.0.0.1/admin" } });
    if (value.startsWith("http://127.0.0.1")) privateTargetFetched = true;
    return new Response("blocked", { status: 404 });
  };
  const response = await handleRequest(new Request("https://inspector.example/api/inspect-website", { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": "198.51.100.3" }, body: JSON.stringify({ url: "https://redirect.example/", maxPages: 1 }) }));
  assert.equal(response.status, 400);
  assert.equal(privateTargetFetched, false);
  assert.match((await response.json()).error, /No inspectable HTML pages/);
});

test("does not follow cross-origin redirects", async () => {
  let externalTargetFetched = false;
  globalThis.fetch = async url => {
    const value = String(url);
    if (value.endsWith("/robots.txt")) return new Response("", { status: 404 });
    if (value === "https://redirect.example/") return new Response(null, { status: 302, headers: { location: "https://outside.example/private" } });
    if (value.startsWith("https://outside.example")) externalTargetFetched = true;
    return new Response("blocked", { status: 404 });
  };
  const response = await handleRequest(new Request("https://inspector.example/api/inspect-website", { method: "POST", headers: { "content-type": "application/json", "CF-Connecting-IP": "198.51.100.5" }, body: JSON.stringify({ url: "https://redirect.example/", maxPages: 1 }) }));
  assert.equal(response.status, 400);
  assert.equal(externalTargetFetched, false);
});

test("implements modern MCP discovery and tool listing", async () => {
  const meta = { "io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientInfo": { name: "test", version: "1" }, "io.modelcontextprotocol/clientCapabilities": {} };
  const discover = await handleRequest(new Request("https://inspector.example/mcp", { method: "POST", headers: { "content-type": "application/json", "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": "server/discover" }, body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "server/discover", params: { _meta: meta } }) }));
  assert.equal(discover.status, 200);
  assert.deepEqual((await discover.json()).result.supportedVersions, ["2026-07-28"]);
  const list = await handleRequest(new Request("https://inspector.example/mcp", { method: "POST", headers: { "content-type": "application/json", "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": "tools/list" }, body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "tools/list", params: { _meta: meta } }) }));
  const tools = (await list.json()).result.tools;
  assert.ok(tools.some(tool => tool.name === "inspect_website"));
  assert.ok(tools.some(tool => tool.name === "get_inspector_capabilities"));
});

test("executes inspect_website through MCP and returns structured content", async () => {
  globalThis.fetch = mockFetch;
  const meta = { "io.modelcontextprotocol/protocolVersion": "2026-07-28", "io.modelcontextprotocol/clientInfo": { name: "test", version: "1" }, "io.modelcontextprotocol/clientCapabilities": {} };
  const response = await handleRequest(new Request("https://inspector.example/mcp", { method: "POST", headers: { "content-type": "application/json", "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": "tools/call", "Mcp-Name": "inspect_website", "CF-Connecting-IP": "198.51.100.4" }, body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "tools/call", params: { name: "inspect_website", arguments: { url: "https://sample.example/", maxPages: 2 }, _meta: meta } }) }));
  assert.equal(response.status, 200);
  const payload = await response.json();
  assert.equal(payload.result.structuredContent.pages.length, 2);
  assert.match(payload.result.content[0].text, /Website reconstruction brief/);
});

test("rejects a mismatched MCP tool-name header and untrusted Origin", async () => {
  const meta = { "io.modelcontextprotocol/protocolVersion": "2026-07-28" };
  const mismatch = await handleRequest(new Request("https://inspector.example/mcp", { method: "POST", headers: { "content-type": "application/json", "MCP-Protocol-Version": "2026-07-28", "Mcp-Method": "tools/call", "Mcp-Name": "wrong" }, body: JSON.stringify({ jsonrpc: "2.0", id: 4, method: "tools/call", params: { name: "inspect_website", _meta: meta } }) }));
  assert.equal(mismatch.status, 400);
  const origin = await handleRequest(new Request("https://inspector.example/mcp", { method: "POST", headers: { origin: "https://evil.example", "content-type": "application/json" }, body: "{}" }));
  assert.equal(origin.status, 403);
});

test.after(() => { globalThis.fetch = originalFetch; });
