# Hosted Cloud Workbench

VRuntime Inspector Cloud is a Cloudflare Worker that serves a small browser UI, a bounded public-website inspection API, and a remote MCP endpoint. It does not call an LLM or generate code. The connected AI client uses its own model and usage allowance.

## Endpoints

- Web workbench: `https://vruntime-inspector-cloud.vruntimelabs.workers.dev/`
- Health: `/api/health`
- Website inspection API: `POST /api/inspect-website`
- MCP: `POST /mcp` (Streamable HTTP)

## MCP tools

- `inspect_website({ url, maxPages? })`: inspect a public website and return structured page observations plus an AI-ready Markdown reconstruction brief. `maxPages` is limited to 1-6.
- `get_inspector_capabilities({})`: return current capabilities, limitations, and safety boundaries.

The Worker implements MCP protocol revision `2026-07-28` (`server/discover`, stateless per-request metadata, and required standard headers) and accepts the legacy `initialize` handshake for older clients. Refer to the [official Streamable HTTP specification](https://modelcontextprotocol.io/specification/2026-07-28/basic/transports/streamable-http) and [Discovery specification](https://modelcontextprotocol.io/specification/2026-07-28/server/discover).

## What this beta actually inspects

- Public HTML documents only.
- Up to six same-origin pages.
- Page title and meta description, headings, anchor links, button/input labels, form actions/methods, image alt attributes, script and stylesheet URLs, and heuristic technology signals.
- Visible page copy excerpts and a reconstruction brief for the connected AI.

It does not execute target JavaScript, interact with controls, inspect private source code or backend internals, inspect databases, probe APIs, bypass authentication, or guarantee a one-to-one reconstruction. It reports unknowns rather than inventing inaccessible implementation details.

## Safety and service limits

- Only HTTP(S) URLs with standard ports are accepted. Embedded URL credentials, IP literals, local/internal hostnames, and requests to the Worker itself are rejected.
- Redirects are revalidated and cross-origin redirects are not followed.
- Only same-origin pages are crawled. `robots.txt` disallow rules are respected for the simple wildcard user-agent case.
- Each HTML response is limited to 512 KiB and each fetch has a 10-second timeout. Request bodies are limited to 16 KiB.
- Sensitive query parameter values are redacted in exported URLs and common credential-like strings are redacted from visible text excerpts.
- The service uses a best-effort in-memory per-isolate throttle. This is not a durable, global abuse-control system. Add Cloudflare Rate Limiting, authentication or an equivalent control before treating this as a high-traffic production service.
- Cloudflare Workers global outbound `fetch()` is restricted to public Internet destinations by default; do not add private-network bindings to this public URL-inspection Worker. See [Cloudflare's Workers security model](https://developers.cloudflare.com/workers/reference/security-model/).

Inspect only targets you own or are explicitly authorized to examine.

## Deploy your own instance

The Worker has no third-party runtime dependencies. With Node.js and Wrangler installed and authenticated to your Cloudflare account, deploy it from the repository root:

```bash
npx wrangler deploy apps/cloudflare/worker.js --name vruntime-inspector-cloud --compatibility-date 2026-11-20
```

The deployed URL is based on your Cloudflare Workers subdomain. Do not deploy this script over an unrelated Worker. The VRuntime Labs hosted endpoint is maintained separately from the user's local workbench.

## ChatGPT Free users

If your ChatGPT plan/client does not support custom remote MCP servers, use the hosted web workbench to inspect the target, download the Markdown brief, and upload it into ChatGPT. Compatible MCP clients can connect directly to the `/mcp` endpoint.
