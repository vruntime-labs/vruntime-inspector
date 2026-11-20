# Implementation Status

## Working in 0.3.0 beta

- Hosted Cloudflare Worker with a browser workbench and public website URL input.
- Quick Scan: bounded passive HTML inspection of up to six same-origin pages.
- Deep Investigation: bounded static analysis of up to eight same-origin JavaScript assets and five same-origin stylesheets, with per-asset and total byte caps.
- Static JavaScript signals: candidate API path strings, route strings, import specifiers, source-map references, and browser API usage markers.
- Static CSS signals: custom properties, approximate selector counts, font-family declarations, media queries, and responsive breakpoint candidates.
- Separate `deep_investigate_website` MCP tool and `mode: deep` hosted API option. The UI exposes Quick Scan and Deep Investigation.
- Extraction of titles, descriptions, headings, links, visible control labels, forms, image alt attributes, script/style references, and heuristic framework/CMS signals.
- AI-ready Markdown reconstruction brief with page inventory, evidence references, unknowns, and explicit coverage limitations.
- Remote MCP Streamable HTTP endpoint implementing protocol revision `2026-07-28`, including `server/discover`, `tools/list`, and `tools/call`; a legacy initialize handshake is also accepted.
- MCP tools: `inspect_website` and `get_inspector_capabilities`.
- URL protections: HTTP(S) only, no URL credentials, no IP-literal/local/internal hostnames, same-origin page crawl, redirect revalidation, no cross-origin redirects, bounded response size/time, robots.txt disallow checks, and sensitive query-parameter redaction in exported results.
- Best-effort in-memory per-isolate request throttling. This is not a durable global rate limiter and must be strengthened before a high-traffic public launch.
- Local CLI, HAR workbench, evidence ledger, and limited regex-based JavaScript scanner remain available.

## Not shipped yet

- JavaScript-rendered browser inspection, DOM snapshots from a live browser, accessibility tree capture, interaction recording, hover/drag/keyboard workflows, or screenshot comparison. Deep Investigation is static source analysis only.
- Fetching and analyzing linked JavaScript bundles or CSS source; API endpoint probing and authenticated session inspection.
- Private backend source-code, database, server-side business-logic, or private API introspection from a public URL alone.
- Full ECMAScript/TypeScript AST parsing, package resolution, source-map reconstruction, or call-graph analysis.
- Electron ASAR/IPC/fuse inspection.
- Native ELF/PE/Mach-O parsing or Ghidra integration.
- Runtime process instrumentation or sandbox execution.
- Local stdio MCP adapter, editor-specific packaged integrations, durable storage, user accounts, and team collaboration.
- AI code generation inside VRuntime Inspector. The connected AI client is responsible for reasoning and code generation using its own model and usage plan.
- Production-grade global rate limiting, user authentication, and abuse monitoring for the public hosted endpoint.
- Interactive 3D graph rendering.

## Verification

Run `node scripts/check.mjs` and `node --test tests/*.test.js` with Node.js 22 or newer. CI runs these checks on pushes to main, pull requests, and manual dispatches. Do not describe a check as passing unless its run has completed successfully.
