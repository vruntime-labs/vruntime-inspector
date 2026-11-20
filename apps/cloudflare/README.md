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
- **Runtime Browser Capture** (`runtime_inspect_website`): uses Cloudflare Browser Run and Puppeteer to render one public HTTPS page in an ephemeral browser session. Captures a viewport screenshot, rendered DOM summary, visible controls, headings, links, forms, accessibility tree, console messages and same-origin request/response metadata. Supports desktop, tablet and mobile viewports.

Runtime Browser Capture is an initial-state capture, not a full autonomous exploration. It does not click controls, submit forms, enter credentials, download files or access a saved browser profile. Only same-origin HTTP(S) requests are allowed; cross-origin scripts, fonts, images and APIs are blocked and may reduce visual fidelity. The runtime tool is unavailable until the optional `BROWSER` binding is configured and deployed.

## MCP tools

- `inspect_website({ url, maxPages? })`
- `deep_investigate_website({ url, maxPages? })`
- `runtime_inspect_website({ url, viewport?, waitAfterLoadMs? })`
- `get_inspector_capabilities({})`

The runtime tool returns an MCP image attachment for the screenshot plus structured observations. The screenshot and observation payload are returned in the tool response; this initial implementation does not persist them to R2 or a database.

## Browser Run quota and deployment

Cloudflare's published Workers Free allowance includes 10 minutes of Browser Run usage per day and up to three concurrent browser sessions. The free quota is a hard daily allowance; requests can fail after it is exhausted. Monitor usage in the Cloudflare dashboard and do not upgrade or enable paid overage without an explicit decision.

The repository includes `wrangler.toml` with the `BROWSER` binding and `nodejs_compat` flag, plus `@cloudflare/puppeteer` as a development dependency. Install dependencies and deploy from the repository root:

```bash
npm install
npx wrangler deploy
```

Do not deploy this configuration over an unrelated Worker. Verify the target Worker name and account before deployment. A successful build is not proof that Browser Run is enabled; verify the binding and then run one controlled smoke test.

## Security boundaries

- Inspect only targets you own or are explicitly authorized to examine.
- Runtime currently requires HTTPS and rejects embedded credentials, IP literals, local/internal/reserved hostnames and the Worker itself.
- Browser requests are intercepted and restricted to the inspected origin. Popups are closed, dialogs dismissed, and form submission is not part of the runtime workflow.
- The runtime browser is ephemeral and unauthenticated. It does not reuse a user's browser profile, cookies, local files or saved credentials.
- Sensitive query parameters and common credential-like strings are redacted from structured observations.
- Same-origin interception is not a complete defense against DNS rebinding. Provider-level DNS/IP pinning and outbound egress enforcement must be reviewed before enabling this hosted browser capability for unrestricted public use.
- The Worker retains a best-effort in-memory request throttle, not a durable global abuse-control system.

## ChatGPT Free users

If your ChatGPT client does not support custom remote MCP servers, use the hosted workbench for Quick Scan and Deep Investigation, then upload the Markdown report into ChatGPT. Runtime Browser Capture is currently exposed through MCP; the web workbench UI does not yet offer it.
