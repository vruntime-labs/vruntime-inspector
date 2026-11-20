# Runtime Investigation Engine

## Purpose

Runtime Investigation is the next inspection capability after Quick Scan and Deep Static Investigation. It must observe a website in an isolated browser, not infer interactive behavior from source text. Runtime evidence is stored alongside static evidence and remains explicitly classified as observed, derived, inferred or unknown.

## Provider architecture

The shared browser package defines policy, normalized viewports, bounded inspection plans, action classification and evidence provenance. Browser execution belongs to a provider adapter:

- **Hosted provider:** optional managed browser runtime attached to the Cloudflare Worker. It must be explicitly configured, quota-aware and disabled when its binding or credentials are absent. Do not silently switch to a paid service.
- **Local provider:** optional Node.js companion for installed Chromium/Chrome and private/local projects. Browser state and local files remain on the user's machine.
- **MCP adapter:** exposes the same shared operations regardless of provider. Provider capability discovery must report unavailable operations honestly.

A provider must not be implemented as a second independent inspector. It returns normalized observations for the shared evidence model.

## Investigation sequence

1. Validate the target and establish an isolated browser context.
2. Capture initial navigation, load milestones, viewport, title, URL and screenshot.
3. Capture rendered DOM structure, accessible names/roles/states, headings, forms, links and visible controls.
4. Record console errors and network request/response metadata generated during normal page loading and approved interactions. Do not probe guessed endpoints.
5. Discover same-origin navigation and visible interactive controls.
6. Explore a bounded number of approved click, hover, keyboard and scroll transitions. Do not submit forms, purchase, delete, publish, upload, install, log out or perform other externally committing actions.
7. Capture after-state DOM, accessibility snapshot and screenshot; link each transition to its initiating action.
8. Repeat at desktop, tablet and mobile viewports within the configured limits.
9. Compare runtime observations with static HTML/JS/CSS findings and produce a reconstruction brief plus evidence manifest.

## Safety and limits

- Only inspect targets the user owns or is explicitly authorized to examine.
- Browser sessions are isolated and temporary by default; close them on completion, timeout or cancellation.
- No authentication bypass, CAPTCHA bypass, DRM bypass, stealth evasion or hidden credential collection.
- No form submission, file upload/download, popup, clipboard read, browser profile reuse or local file access by default.
- Every interactive action requires explicit approval. Destructive or externally committing controls remain blocked even if requested as an automatic exploration step.
- Restrict navigation and subresources to the approved origin unless a separate explicit policy grants a documented exception.
- Revalidate redirects and DNS/IP destinations to prevent private-network access and DNS rebinding. A hostname-only URL check is insufficient for a browser provider.
- Redact credentials, cookies, authorization headers, sensitive query parameters, form values and likely secrets before evidence leaves the browser provider.
- Bound pages, actions, screenshots, DOM nodes, network events, bytes and wall-clock duration. Report truncation and coverage gaps.
- Never claim a state was inspected when the browser did not render it. Never infer absence from partial coverage.

## Current implementation boundary

The shared policy and evidence foundation is implemented in `packages/inspector-browser`. It does not launch a browser. Browser providers, live DOM/accessibility capture, screenshots, network event capture and the MCP runtime tools remain pending provider integration and end-to-end verification.
