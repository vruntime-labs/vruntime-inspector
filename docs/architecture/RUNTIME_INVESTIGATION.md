# Runtime Investigation Engine

## Purpose

Runtime Investigation observes a website in an isolated browser rather than inferring interactive behavior from source text. Runtime evidence is stored alongside static evidence and remains classified as observed, derived, inferred or unknown.

## Provider architecture

- **Hosted provider:** Cloudflare Browser Run through Puppeteer in the existing Worker. The `BROWSER` binding is optional; the MCP tool reports unavailable when it is absent. Browser Run usage is quota-limited.
- **Local provider:** planned Node.js companion for installed Chromium/Chrome and private/local projects. Browser state and local files remain on the user's machine.
- **MCP adapter:** exposes shared inspection capabilities and reports provider availability honestly.

The shared policy and evidence normalization live in `packages/inspector-browser`. Browser execution is isolated in `packages/inspector-browser/src/cloudflare.js`.

## Current runtime capture

`runtime_inspect_website({url, viewport, waitAfterLoadMs})` performs one ephemeral browser session and captures:

1. Initial navigation and HTTP status.
2. Rendered document title, description, headings, links, forms and visible controls.
3. A bounded rendered DOM summary.
4. A bounded Chrome accessibility tree snapshot.
5. Console messages and page errors.
6. Same-origin request and response metadata.
7. A viewport screenshot returned as an MCP image attachment.

The default viewport is desktop. Tablet and mobile presets are supported. The initial implementation does not preserve browser sessions between calls, execute user-provided scripts, click controls or submit forms.

## Next runtime stages

1. Add approved, selector-bound click/hover/keyboard/scroll actions with explicit approval per action.
2. Capture before/after DOM, accessibility and screenshot snapshots, linking each transition to its action.
3. Add bounded same-origin page exploration and multi-viewport comparison.
4. Persist evidence bundles with explicit retention and deletion controls.
5. Build the workbench UI around the same MCP/core operations.
6. Add the local provider for private sources and installed applications.

## Safety and limits

- Only inspect targets the user owns or is explicitly authorized to examine.
- Hosted runtime requires HTTPS, rejects embedded credentials, IP literals and common local/internal/reserved hostnames, and follows the existing robots.txt check for the target path.
- Browser request interception currently allows only same-origin HTTPS GET/HEAD resources. Cross-origin CDNs, fonts, images, scripts, APIs and other methods are blocked; this can materially alter the rendered result. Target JavaScript still executes inside the isolated browser and may issue side-effecting GET requests, so this is not a guarantee of target-side immutability.
- Popups are closed and dialogs dismissed. Forms are described but never submitted. No credentials, cookies, local files or existing browser profiles are accessed.
- Structured strings are scrubbed for common credential patterns. Screenshots can still contain visible information rendered by the target; inspect only authorized public targets.
- Same-origin interception is not a complete defense against DNS rebinding. Provider-level DNS/IP pinning and egress enforcement must be independently reviewed before enabling this hosted browser capability for unrestricted public use.
- Bound pages, actions, screenshots, DOM nodes, accessibility nodes, network events, bytes and wall-clock duration. Report truncation and coverage gaps.
- Never claim a state was inspected when the browser did not render it. Never infer absence from partial coverage.

## Quota and provider activation

Cloudflare's published Workers Free allowance is 10 minutes of Browser Run usage per day, with a three-browser concurrency limit. Browser time is shared across Browser Run methods. Keep the provider disabled until the account binding is configured and security controls have been reviewed. Do not silently move the account to a paid plan.

## Implementation boundary

The runtime provider code and MCP tool are present in the feature branch. They have not yet been deployed or verified against a live Browser Run session. Interactive exploration, state-transition comparison, persistent evidence storage, local browser support and runtime workbench controls remain pending.
