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

The default viewport is desktop. Tablet and mobile presets are supported. The browser session is ephemeral and unauthenticated; no user scripts, saved profiles or credentials are loaded. Optional interaction steps are accepted only when each action explicitly sets `approved: true`.

## Approved interaction exploration

The feature branch extends `runtime_inspect_website` with up to eight ordered, explicitly approved actions per run. Every action must include `approved: true`. Click and hover actions must reference a `controlId` and exact label returned by the latest runtime snapshot. Clicks are restricted to labelled non-submit buttons and tabs outside forms. Keyboard support is limited to Tab, Escape and arrow keys; scrolling is bounded. Text entry, Enter/Space activation, navigation actions, form submission, downloads and arbitrary JavaScript evaluation are not supported.

For each action the tool records a compact before/after state summary and action result. The response includes the initial screenshot and, if at least one action executed, a final screenshot. Actions that fail validation or are not explicitly approved are reported as not executed. This is bounded workflow sampling, not unrestricted autonomous browsing.

## Next runtime stages

1. Add bounded same-origin page exploration and multi-viewport comparison.
2. Persist evidence bundles with explicit retention and deletion controls.
3. Build the workbench UI around the same MCP/core operations.
4. Add the local provider for private sources and installed applications.

## Safety and limits

- Only inspect targets the user owns or is explicitly authorized to examine.
- Hosted runtime requires HTTPS, rejects embedded credentials, IP literals and common local/internal/reserved hostnames, and follows the existing robots.txt check for the target path.
- Browser request interception currently allows only same-origin HTTPS GET/HEAD resources. Cross-origin CDNs, fonts, images, scripts, APIs and other methods are blocked; this can materially alter the rendered result. Target JavaScript still executes inside the isolated browser and may issue side-effecting GET requests, so this is not a guarantee of target-side immutability.
- Popups are closed and dialogs dismissed. Forms are described but never submitted. No credentials, cookies, local files or existing browser profiles are accessed.
- Structured strings are scrubbed for common credential patterns. Screenshots can still contain visible information rendered by the target; inspect only authorized public targets.
- Same-origin interception is not a complete defense against DNS rebinding. Provider-level DNS/IP pinning and egress enforcement must be independently reviewed before enabling this hosted browser capability for unrestricted public use.
- Bound pages, actions, screenshots, DOM nodes, accessibility nodes, network events, bytes and wall-clock duration. Report truncation and coverage gaps.
- Clicks are limited to labelled non-submit buttons/tabs outside forms. Destructive/authentication/externally committing labels are blocked. Only Tab, Escape and arrow keys are supported; no text entry or Enter/Space activation is allowed.
- Same-origin JavaScript may still issue side-effecting GET requests. The action policy reduces accidental interaction risk but cannot guarantee that a target application has no side effects.
- Never claim a state was inspected when the browser did not render it. Never infer absence from partial coverage.

## Quota and provider activation

Cloudflare's published Workers Free allowance is 10 minutes of Browser Run usage per day, with a three-browser concurrency limit. Browser time is shared across Browser Run methods. Keep the provider disabled until the account binding is configured and security controls have been reviewed. Do not silently move the account to a paid plan.

## Implementation boundary

The runtime provider, initial capture and bounded approved interaction exploration are present in the feature branch. They have not yet been deployed or verified against a live Browser Run session. Multi-page runtime crawling, cross-viewport comparison, persistent evidence storage, local browser support and runtime workbench controls remain pending.
