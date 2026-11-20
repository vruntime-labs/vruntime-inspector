# Hosted Cloud Workbench

VRuntime Inspector Cloud is a Cloudflare Worker that serves the public website workbench, deterministic inspection APIs and a remote MCP endpoint. It does not call an LLM or generate code. The connected AI client uses its own model and usage allowance.

## Endpoints

- Web workbench: `https://vruntime-inspector-cloud.vruntimelabs.workers.dev/`
- Health: `/api/health`
- Static website inspection API: `POST /api/inspect-website`
- MCP: `POST /mcp` (Streamable HTTP)

## Inspection modes

- **Quick Scan** (`inspect_website`): bounded same-origin HTML crawl and visible structure inventory.
- **Deep Investigation** (`deep_investigate_website`): Quick Scan plus bounded same-origin JavaScript and CSS text analysis. Extracts candidate routes/API strings, imports, source-map references, browser API markers, CSS custom properties, media queries and responsive breakpoints. Target code is not executed in this mode.
- **Runtime Browser Investigation** (`runtime_inspect_website`): uses Cloudflare Browser Run and Puppeteer to render a bounded set of discovered same-origin public HTTPS pages in an ephemeral browser session. Captures rendered DOM, visible controls, headings, links, forms, accessibility trees, console messages and same-origin request/response metadata. Supports one or two viewport presets per run, with a total cap of four page/viewport captures.

Runtime Browser Investigation supports a bounded same-origin anchor crawl, structural responsive comparison (not a pixel-level diff), and up to eight explicitly approved actions with before/after state summaries on the initial page at the first viewport. The crawl strips query strings/fragments, skips common static assets and applies wildcard-user-agent robots.txt disallow rules. Clicks are limited to labelled non-submit buttons/tabs outside forms; hover, Tab/Escape/arrow keys and bounded scrolling are supported. Text entry, Enter/Space activation, form submission, downloads, saved browser profiles and cross-origin navigation are disabled. Only same-origin HTTP(S) requests are allowed; cross-origin scripts, fonts, images and APIs are blocked and may reduce visual fidelity. The runtime tool remains disabled unless the `BROWSER` binding exists, `RUNTIME_BROWSER_ENABLED` is exactly `true`, and the target hostname is an exact entry in `RUNTIME_BROWSER_ALLOWED_HOSTS`. The repository defaults the flag to `false` and the allowlist to empty.

## MCP tools

- `inspect_website({ url, maxPages? })`
- `deep_investigate_website({ url, maxPages? })`
- `runtime_inspect_website({ url, viewport?, viewports?, maxPages?, waitAfterLoadMs?, actions? })`
- `get_inspector_capabilities({})`

The runtime tool returns root-page screenshots for each requested viewport, a structural responsive comparison, per-page DOM/accessibility observations and, when at least one approved action executes, a final screenshot plus per-action before/after summaries. Each action must set `approved: true`; the MCP client must obtain user confirmation before setting it (the Worker cannot independently verify the confirmation). Click/hover requires a control ID and exact label from the latest snapshot. Evidence is returned in the MCP response and is not persisted to R2 or a database.

## Browser Run quota and deployment

Cloudflare's published Workers Free allowance includes 10 minutes of Browser Run usage per day and up to three concurrent browser sessions. The free quota is a hard daily allowance; requests can fail after it is exhausted. Monitor usage in the Cloudflare dashboard and do not upgrade or enable paid overage without an explicit decision.

The repository includes `wrangler.toml` with the `BROWSER` binding and `nodejs_compat` flag, plus `@cloudflare/puppeteer` as a development dependency. Runtime remains disabled by default. For a controlled test, configure `RUNTIME_BROWSER_ENABLED=true` and `RUNTIME_BROWSER_ALLOWED_HOSTS` as a comma-separated list of exact operator-owned hostnames in the Worker environment. Do not add arbitrary user-supplied hosts. Install dependencies and deploy from the repository root:

```bash
npm install
npx wrangler deploy
```

Do not deploy this configuration over an unrelated Worker. Verify the target Worker name and account before deployment. A successful build is not proof that Browser Run is enabled; verify the binding and then run one controlled smoke test.

## Security boundaries

- Inspect only targets you own or are explicitly authorized to examine.
- Runtime currently requires HTTPS and rejects embedded credentials, IP literals, local/internal/reserved hostnames and the Worker itself.
- Browser requests are intercepted and restricted to the inspected origin. Browser Run is also launched with a hostname guardrail for the exact inspected hostname. The Worker requires an exact operator-configured hostname allowlist. Popups are closed, dialogs dismissed, and form submission is not part of the runtime workflow.
- The runtime browser is ephemeral and unauthenticated. It does not reuse a user's browser profile, cookies, local files or saved credentials.
- Sensitive query parameters and common credential-like strings are redacted from structured observations.
- Browser Run guardrails are hostname allowlists, not documented destination-IP pinning. Exact-host guardrails and the operator allowlist reduce the reachable hostname surface but do not prove protection against DNS rebinding or a hostname resolving to a private/reserved IP. Keep runtime disabled by default and do not expose arbitrary public targets until destination-IP enforcement and egress controls are independently validated.
- The Worker retains a best-effort in-memory request throttle, not a durable global abuse-control system.

## ChatGPT Free users

If your ChatGPT client does not support custom remote MCP servers, use the hosted workbench for Quick Scan and Deep Investigation, then upload the Markdown report into ChatGPT. Runtime Browser Capture is currently exposed through MCP; the web workbench UI does not yet offer it.
