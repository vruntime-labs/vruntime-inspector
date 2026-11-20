import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, join, normalize, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parseHar } from "../../packages/inspector-network/src/index.js";
const root = fileURLToPath(new URL(".", import.meta.url)), port = Number(process.env.PORT ?? 4173), limit = 10 * 1024 * 1024;
const types = { ".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".css": "text/css; charset=utf-8" };
const server = createServer(async (req, res) => {
  res.setHeader("X-Content-Type-Options", "nosniff"); res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Content-Security-Policy", "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self' data:");
  if (req.method === "GET" && req.url === "/api/health") { res.writeHead(200, { "content-type": "application/json" }).end('{"status":"ok","version":"0.1.0"}'); return; }
  if (req.method === "POST" && req.url === "/api/inspect/har") {
    try {
      let body = "";
      for await (const chunk of req) { body += chunk; if (Buffer.byteLength(body) > limit) throw Object.assign(new Error("Upload exceeds 10 MiB."), { statusCode: 413 }); }
      const result = parseHar(body); res.writeHead(200, { "content-type": "application/json" }).end(JSON.stringify(result));
    } catch (error) { res.writeHead(error.statusCode ?? 400, { "content-type": "application/json" }).end(JSON.stringify({ error: error.message })); }
    return;
  }
  if (req.method !== "GET") { res.writeHead(405).end("Method not allowed"); return; }
  let pathname;
  try { pathname = req.url === "/" ? "/index.html" : decodeURIComponent((req.url ?? "/").split("?")[0]); }
  catch { res.writeHead(400).end("Bad request"); return; }
  const base = join(root, "public"), path = normalize(join(base, pathname));
  if (!(path === base || path.startsWith(base + sep))) { res.writeHead(403).end("Forbidden"); return; }
  try { const body = await readFile(path); res.writeHead(200, { "content-type": types[extname(path)] ?? "application/octet-stream" }).end(body); }
  catch { res.writeHead(404).end("Not found"); }
});
server.listen(port, "127.0.0.1", () => console.log("VRuntime Inspector workbench: http://127.0.0.1:" + port));
