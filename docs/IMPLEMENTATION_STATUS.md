# Implementation Status

## Hosted inspection beta

- Hosted Cloudflare Worker with a browser workbench, public website URL input and remote MCP endpoint.
- Quick Scan: bounded passive HTML inspection of up to six same-origin pages.
- Deep Investigation: bounded static analysis of up to eight same-origin JavaScript assets and five same-origin stylesheets, with per-asset and total byte caps.
- Static JavaScript signals: candidate API path strings, route strings, import specifiers, source-map references and browser API usage markers.
- Static CSS signals: custom properties, approximate selector counts, font-family declarations, media queries and responsive breakpoint candidates.
- Evidence-backed Markdown reconstruction brief with explicit coverage limitations.
- Remote MCP Streamable HTTP endpoint and existing local CLI/HAR workbench.

## Runtime browser capture implemented in the feature branch

- Shared browser inspection policy: target validation, URL redaction, viewport normalization, bounded limits, action classification and evidence provenance.
- Cloudflare Browser Run provider using Puppeteer, loaded only when the browser binding is present.
- New MCP tool: `runtime_inspect_website({url, viewport?, viewports?, maxPages?, waitAfterLoadMs?, actions?})`.
- Bounded same-origin runtime crawl: discovers visible anchor links, strips query strings/fragments, skips common static assets, and applies wildcard-user-agent robots.txt disallow rules.
- Structural responsive comparison across up to two viewport presets, with a total cap of four page/viewport captures per run. This is not a pixel-level visual diff.
- Initial rendered-page capture: screenshot, live DOM summary, headings, links, forms, visible controls, accessibility tree, console messages and same-origin request/response metadata.
- Optional interaction exploration: up to eight explicitly approved, selector-bound click/hover/safe-key/scroll actions with before/after state summaries and initial/final screenshots. Clicks are limited to labelled non-submit buttons/tabs outside forms; text entry, activation keys, navigation actions and form submission are disabled.
- Approval limitation: `approved: true` is a caller assertion. The MCP client must obtain user confirmation before setting it; the hosted Worker does not independently verify the user's UI consent.
- Browser contexts are ephemeral; popups and dialogs are closed/dismissed; only same-origin HTTP(S) requests are allowed; forms are not submitted.
- Browser Run binding is declared in `wrangler.toml`; `@cloudflare/puppeteer` is declared as a development dependency.
- The runtime tool reports a clear unavailable-provider error if the binding is not configured.

## Runtime not yet complete or production-enabled

- The runtime provider has not yet been deployed or exercised against a real Browser Run session.
- DNS/IP pinning and provider-level egress enforcement require a security review before enabling hosted runtime for general public use. Same-origin request interception is an additional restriction, not a substitute for DNS-rebinding protection.
- Hosted workbench runtime mode with viewport selection, screenshot gallery and JSON evidence export. The endpoint remains gated by the default-off flag and exact operator hostname allowlist.
- Local Playwright companion for private websites, installed apps and local files.
- Authenticated/private application sessions, private backend source or database introspection, active API probing, full AST analysis, Electron/native/runtime binary inspection, 3D graph and code generation.
- Production-grade global rate limiting, user authentication and abuse monitoring.

## Verification

Run `node scripts/check.mjs` and `node --test tests/*.test.js` with Node.js 22 or newer. CI runs these checks on pushes to main, pull requests and manual dispatches. Do not describe a check as passing unless its run has completed successfully.
