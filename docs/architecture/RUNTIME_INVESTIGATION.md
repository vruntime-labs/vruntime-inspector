# Runtime Investigation Engine

## Purpose

Runtime Investigation observes a website in an isolated browser rather than inferring interactive behavior from source text. Runtime evidence is stored alongside static evidence and remains classified as observed, derived, inferred or unknown.

## Provider architecture

- **Hosted provider:** Cloudflare Browser Run through Puppeteer in the existing Worker. It requires the `BROWSER` binding, `RUNTIME_BROWSER_ENABLED=true`, and an exact hostname in `RUNTIME_BROWSER_ALLOWED_HOSTS`. All three conditions are required; the repository defaults runtime off with an empty allowlist.
- **Local provider:** planned Node.js companion for installed Chromium/Chrome and private/local projects. Browser state and local files remain on the user's machine.
- **MCP adapter:** exposes shared inspection capabilities and reports provider availability honestly.

The shared policy and evidence normalization live in `packages/inspector-browser`. Browser execution is isolated in `packages/inspector-browser/src/cloudflare.js`.

## Runtime crawl and responsive comparison

`runtime_inspect_website({url, viewport?, viewports?, maxPages?, waitAfterLoadMs?, actions?})` performs one ephemeral browser session and captures:

1. The initial page plus a bounded queue of discovered same-origin anchor pages.
2. Rendered title, description, headings, links, forms and visible controls for each successfully rendered page.
3. A bounded DOM summary and Chrome accessibility tree for each page.
4. Console messages, page errors and same-origin request/response metadata.
5. One root-page screenshot per requested viewport.
6. A structural responsive comparison using viewport dimensions, document overflow and visible heading/control/link counts.

The default is one desktop viewport. Supply up to two distinct presets in `viewports` (for example, `["desktop","mobile"]`) to compare layouts. The total number of page/viewport captures is capped at four; two viewports therefore allow at most two pages each. `maxPages` is bounded from one to four per viewport and reduced automatically to respect the total cap. The crawl follows visible same-origin HTTPS anchor links, strips query strings and fragments, skips common static-asset extensions, and applies the target's wildcard-user-agent robots.txt disallow rules. This is a bounded route sample, not a complete sitemap crawl.

The responsive comparison is structural, not a pixel-level screenshot diff. The browser session is ephemeral and unauthenticated; no user scripts, saved profiles or credentials are loaded. Optional interaction steps are accepted only when each action explicitly sets `approved: true`. Browser Run is launched with a hostname guardrail containing only the inspected hostname.

## Approved interaction exploration

The feature branch extends `runtime_inspect_website` with up to eight ordered, explicitly approved actions per run. Every action must include `approved: true`. The MCP client is responsible for obtaining user confirmation before setting this flag; the hosted Worker treats it as a caller assertion and does not independently verify the user's UI consent. Click and hover actions must reference a `controlId` and exact label returned by the latest runtime snapshot. Clicks are restricted to labelled non-submit buttons and tabs outside forms. Keyboard support is limited to Tab, Escape and arrow keys; scrolling is bounded. Text entry, Enter/Space activation, navigation actions, form submission, downloads and arbitrary JavaScript evaluation are not supported.

Actions apply only to the initial page at the first requested viewport. For each action the tool records a compact before/after state summary and action result. The response includes root-page screenshots for each requested viewport and, if at least one action executed, a final screenshot for the interacted state. Actions that fail validation or omit the approval flag are reported as not executed. This approval flag is not a cryptographic or server-side consent handshake. This is bounded workflow sampling, not unrestricted autonomous browsing.

## Next runtime stages

1. Persist evidence bundles with explicit retention, access and deletion controls.
2. Build runtime workbench controls and screenshot/evidence export around the same core operations.
3. Add the local Playwright companion for private sources and installed applications.
4. Add deeper approved workflow exploration and visual comparison only after the interaction consent and network safety model is strengthened.

## Safety and limits

- Only inspect targets the user owns or is explicitly authorized to examine.
- Hosted runtime requires HTTPS, rejects embedded credentials, IP literals and common local/internal/reserved hostnames, and follows the existing robots.txt check for the target path.
- Browser request interception currently allows only same-origin HTTPS GET/HEAD resources. Cross-origin CDNs, fonts, images, scripts, APIs and other methods are blocked; this can materially alter the rendered result. Target JavaScript still executes inside the isolated browser and may issue side-effecting GET requests, so this is not a guarantee of target-side immutability.
- Popups are closed and dialogs dismissed. Forms are described but never submitted. No credentials, cookies, local files or existing browser profiles are accessed.
- Structured strings are scrubbed for common credential patterns. Screenshots can still contain visible information rendered by the target; inspect only authorized public targets.
- Browser Run hostname guardrails restrict requests to the exact inspected hostname, and the Worker additionally requires an operator-configured exact-host allowlist. Cloudflare documents these guardrails as hostname allowlists, not destination-IP pinning. They therefore do not prove protection against DNS rebinding or a hostname resolving to a private/reserved address. Keep hosted runtime disabled by default; do not add arbitrary user-supplied domains to the allowlist or expose it as an unrestricted public URL-to-browser service until provider-level destination-IP enforcement is independently validated.
- Bound pages, actions, screenshots, DOM nodes, accessibility nodes, network events, bytes and wall-clock duration. Report truncation and coverage gaps.
- Clicks are limited to labelled non-submit buttons/tabs outside forms. Destructive/authentication/externally committing labels are blocked. Only Tab, Escape and arrow keys are supported; no text entry or Enter/Space activation is allowed.
- Same-origin JavaScript may still issue side-effecting GET requests. The action policy reduces accidental interaction risk but cannot guarantee that a target application has no side effects.
- Never claim a state was inspected when the browser did not render it. Never infer absence from partial coverage.

## Quota and provider activation

Cloudflare's published Workers Free allowance is 10 minutes of Browser Run usage per day, with a three-browser concurrency limit. Browser time is shared across Browser Run methods. The repository defaults `RUNTIME_BROWSER_ENABLED` to `false` and `RUNTIME_BROWSER_ALLOWED_HOSTS` to empty. For a controlled test, enable it only for an operator-owned hostname with stable DNS and explicit authorization. The hostname allowlist is a containment measure, not a substitute for destination-IP enforcement. Do not enable arbitrary public targets until DNS-rebinding and egress controls are independently validated. Do not silently move the account to a paid plan.

## Implementation boundary

The runtime provider, bounded same-origin page crawl, structural comparison across up to two viewports, and bounded approved interaction exploration are present in the feature branch. They have not yet been deployed or verified against a live Browser Run session. Persistent evidence storage, local browser support and runtime workbench controls remain pending.
