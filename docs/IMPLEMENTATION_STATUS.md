# Implementation Status

## Working in 0.3.0 beta

- Hosted Cloudflare Worker with a browser workbench and public website URL input.
- Quick Scan: bounded passive HTML inspection of up to six same-origin pages.
- Deep Investigation: bounded static analysis of up to eight same-origin JavaScript assets and five same-origin stylesheets, with per-asset and total byte caps.
- Static JavaScript signals: candidate API path strings, route strings, import specifiers, source-map references, and browser API usage markers.
- Static CSS signals: custom properties, approximate selector counts, font-family declarations, media queries, and responsive breakpoint candidates.
- Separate `deep_investigate_website` MCP tool and `mode: deep` hosted API option.
- AI-ready Markdown reconstruction brief with page inventory, evidence references, unknowns, and explicit coverage limitations.
- Remote MCP Streamable HTTP endpoint and existing local CLI/HAR workbench.

## Runtime investigation foundation

- Shared browser inspection policy package: target validation, URL redaction, viewport normalization, bounded limits, action classification and runtime evidence provenance.
- Safe-action policy requires explicit approval for every interaction and blocks destructive or externally committing controls.
- Runtime plan defaults include bounded pages, actions, screenshots, duration, network events and DOM nodes.

## Not shipped yet

- Browser provider implementation or browser launch/session lifecycle.
- JavaScript-rendered browser inspection, live DOM snapshots, accessibility tree capture, screenshots or screenshot comparison.
- Interaction execution, hover/keyboard/scroll recording or state-transition capture.
- Runtime console and network event collection.
- Hosted managed-browser binding and local browser companion.
- Runtime MCP tools and workbench UI.
- Authenticated/private application sessions, private backend source or database introspection, active API probing, full AST analysis, Electron/native/runtime binary inspection, 3D graph and code generation.
- Production-grade global rate limiting, user authentication and abuse monitoring.

## Verification

Run `node scripts/check.mjs` and `node --test tests/*.test.js` with Node.js 22 or newer. CI runs these checks on pushes to main, pull requests and manual dispatches. Do not describe a check as passing unless its run has completed successfully.
