const VERSION = "0.2.0";
const MCP_VERSION = "2026-07-28";
const SERVER_INFO = { name: "vruntime-inspector", version: VERSION };
const MAX_BODY = 16 * 1024;
const MAX_HTML = 512 * 1024;
const MAX_PAGES = 6;
const WINDOW_MS = 60_000;
const REQUESTS_PER_WINDOW = 10;
const buckets = new Map();

const PAGE = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#07111e"><title>VRuntime Inspector Cloud</title>
<style>
:root{color-scheme:dark;--bg:#07111e;--panel:#0d1c2d;--line:#263c52;--muted:#91a5b9;--text:#eaf3fc;--cyan:#70ddff;--green:#80e1b0}*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 80% 0,#153c58 0,transparent 38%),linear-gradient(145deg,#07111e,#091827 60%,#050b13);color:var(--text);font:15px/1.6 Inter,ui-sans-serif,system-ui,sans-serif;min-height:100vh}.shell{max-width:1160px;margin:auto;padding:0 26px}.top{height:76px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #ffffff18}.brand{display:flex;gap:12px;align-items:center;color:var(--text);text-decoration:none;font:700 12px ui-monospace,monospace;letter-spacing:.14em}.mark{display:grid;place-items:center;width:34px;height:34px;border:1px solid #70ddff88;color:var(--cyan);transform:rotate(45deg);font-size:18px}.mark span{transform:rotate(-45deg)}.tag{font:10px ui-monospace,monospace;letter-spacing:.12em;color:var(--green)}main{padding:64px 0 34px}.eyebrow{font:10px ui-monospace,monospace;letter-spacing:.18em;color:var(--cyan)}h1{font-size:clamp(42px,7vw,76px);line-height:.98;letter-spacing:-.06em;margin:16px 0 20px}h1 em{font-style:normal;color:var(--cyan);text-shadow:0 0 32px #42c6ef55}.lead{max-width:720px;color:#afc0d1;font-size:17px}.panel{margin-top:38px;padding:28px;border:1px solid #36516a;border-radius:14px;background:linear-gradient(145deg,#11243a,#0a1624);box-shadow:0 32px 80px #0007,0 1px #ffffff15 inset}.panel h2{font-size:19px;margin:0 0 8px}.hint{color:var(--muted);font-size:13px;margin:0 0 22px}.form{display:grid;grid-template-columns:minmax(0,1fr) 120px auto;gap:10px}input{min-width:0;background:#071522;border:1px solid #35536c;border-radius:6px;padding:13px 14px;color:var(--text);font:14px ui-monospace,monospace}input:focus{outline:2px solid #70ddff66;border-color:var(--cyan)}button{border:1px solid #64cdec88;background:#123d55;color:#d8f7ff;border-radius:6px;padding:12px 18px;font:700 12px ui-monospace,monospace;letter-spacing:.04em;cursor:pointer}button:hover{background:#1a526e}button:disabled{opacity:.5;cursor:wait}.status{margin-top:16px;min-height:24px;color:var(--muted);font-size:13px}.status.error{color:#ff9e9e}.results{margin-top:24px;display:grid;gap:14px}.metrics{display:grid;grid-template-columns:repeat(3,1fr);gap:10px}.metric,.report{background:#081725;border:1px solid var(--line);border-radius:8px;padding:15px}.metric small{display:block;color:var(--muted);font:10px ui-monospace,monospace;letter-spacing:.12em}.metric strong{display:block;color:var(--cyan);font:25px ui-monospace,monospace;margin-top:7px}.reporthead{display:flex;justify-content:space-between;gap:12px;align-items:center;margin-bottom:12px}.reporthead h3{font-size:15px;margin:0}.actions{display:flex;gap:8px;flex-wrap:wrap}pre{white-space:pre-wrap;overflow-wrap:anywhere;max-height:620px;overflow:auto;margin:0;color:#c2d3e2;font:12px/1.65 ui-monospace,monospace}.limits{margin-top:22px;padding:14px 16px;border-left:2px solid #e3b36b;background:#1c1a16;color:#cbbd9f;font-size:12px}.bottom{display:flex;justify-content:space-between;gap:15px;padding:24px 0;color:#71869b;font:10px ui-monospace,monospace;letter-spacing:.08em}.hidden{display:none!important}@media(max-width:700px){.shell{padding:0 16px}main{padding-top:42px}.panel{padding:18px}.form{grid-template-columns:1fr 100px}.form button{grid-column:1/-1}.bottom{flex-direction:column}.metrics{gap:6px}.metric{padding:10px}.metric strong{font-size:20px}}
</style></head><body><div class="shell"><header class="top"><a class="brand" href="/"><span class="mark"><span>V</span></span><span>VRUNTIME <b>INSPECTOR</b></span></a><span class="tag">CLOUD WORKBENCH · 0.2</span></header><main><p class="eyebrow">SOFTWARE X-RAY / HOSTED INSPECTION</p><h1>Understand the product.<br><em>Rebuild with AI.</em></h1><p class="lead">Give VRuntime Inspector a public website URL. It maps the pages and visible product surface, then creates an evidence-backed brief your AI coding assistant can use to plan an original implementation.</p><section class="panel"><h2>Start a website inspection</h2><p class="hint">Passive, read-only inspection. No account or local server required for this public beta.</p><form id="inspect" class="form"><input id="url" type="url" placeholder="https://example.com" required autocomplete="url"><input id="pages" type="number" min="1" max="6" value="4" aria-label="Maximum pages"><button id="run" type="submit">INSPECT WEBSITE</button></form><div id="status" class="status" role="status">Ready. Only inspect websites you are authorized to examine.</div><section id="results" class="results hidden"><div class="metrics"><div class="metric"><small>PAGES INSPECTED</small><strong id="pageCount">0</strong></div><div class="metric"><small>VISIBLE FEATURES</small><strong id="featureCount">0</strong></div><div class="metric"><small>OBSERVED LINKS</small><strong id="linkCount">0</strong></div></div><div class="report"><div class="reporthead"><h3>AI-ready reconstruction brief</h3><div class="actions"><button id="copy" type="button">COPY</button><button id="download" type="button">DOWNLOAD .MD</button></div></div><pre id="brief"></pre></div><div class="limits" id="coverage"></div></section></section><footer class="bottom"><span>VRUNTIME LABS · OPEN SOURCE</span><span>READ-ONLY · EVIDENCE-BACKED · EARLY ACCESS</span></footer></main></div><script>
const form=document.querySelector('#inspect'),urlInput=document.querySelector('#url'),pagesInput=document.querySelector('#pages'),run=document.querySelector('#run'),statusBox=document.querySelector('#status'),results=document.querySelector('#results'),brief=document.querySelector('#brief');let lastMarkdown='';
form.addEventListener('submit',async e=>{e.preventDefault();run.disabled=true;results.classList.add('hidden');statusBox.className='status';statusBox.textContent='Inspecting public pages. This can take a few seconds…';try{const response=await fetch('/api/inspect-website',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({url:urlInput.value,maxPages:Number(pagesInput.value)})});const data=await response.json();if(!response.ok)throw new Error(data.error||'Inspection failed');lastMarkdown=data.aiBriefMarkdown;brief.textContent=lastMarkdown;document.querySelector('#pageCount').textContent=data.pages.length;document.querySelector('#featureCount').textContent=data.summary.featureCount;document.querySelector('#linkCount').textContent=data.summary.internalLinkCount;document.querySelector('#coverage').textContent=data.coverage.description+' '+data.coverage.limitations.join(' ');results.classList.remove('hidden');statusBox.textContent='Inspection complete. Review the coverage notes before asking your AI to reconstruct the product.';}catch(error){statusBox.className='status error';statusBox.textContent=error.message;}finally{run.disabled=false;}});
document.querySelector('#copy').addEventListener('click',async()=>{await navigator.clipboard.writeText(lastMarkdown);statusBox.textContent='Brief copied.';});document.querySelector('#download').addEventListener('click',()=>{const blob=new Blob([lastMarkdown],{type:'text/markdown'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='vruntime-inspector-reconstruction-brief.md';a.click();URL.revokeObjectURL(a.href);});
</script></body></html>`;

function json(data, status = 200, extra = {}) {
  return new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", ...extra } });
}
function error(message, status = 400) { return json({ error: message }, status); }
function securityHeaders(response) {
  const headers = new Headers(response.headers);
  headers.set("X-Content-Type-Options", "nosniff");
  headers.set("Referrer-Policy", "no-referrer");
  headers.set("X-Frame-Options", "DENY");
  headers.set("Permissions-Policy", "camera=(), microphone=(), geolocation=()");
  headers.set("Content-Security-Policy", "default-src 'self'; script-src 'unsafe-inline'; style-src 'unsafe-inline'; connect-src 'self'; img-src 'self' data:; base-uri 'none'; frame-ancestors 'none'; form-action 'self'");
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers });
}
function rateAllowed(request) {
  const ip = request.headers.get("CF-Connecting-IP") || "unknown";
  const now = Date.now();
  let item = buckets.get(ip);
  if (!item || now - item.start >= WINDOW_MS) item = { start: now, count: 0 };
  item.count += 1;
  buckets.set(ip, item);
  if (buckets.size > 1200) for (const [key, value] of buckets) if (now - value.start >= WINDOW_MS) buckets.delete(key);
  return item.count <= REQUESTS_PER_WINDOW;
}
function validateTarget(value, serviceHost = "") {
  let url;
  try { url = new URL(value); } catch { throw new Error("Enter a valid absolute website URL, such as https://example.com."); }
  if (!["https:", "http:"].includes(url.protocol)) throw new Error("Only HTTP and HTTPS websites can be inspected.");
  if (url.username || url.password) throw new Error("URLs containing embedded credentials are not accepted.");
  if (url.port && !["80", "443"].includes(url.port)) throw new Error("Only standard HTTP and HTTPS ports are allowed.");
  const host = url.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  if (!host || host === serviceHost.toLowerCase() || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".test") || host === "metadata.google.internal") throw new Error("Local, internal and reserved hostnames cannot be inspected.");
  if (/^[\d.]+$/.test(host) || host.includes(":")) throw new Error("IP-address targets are not accepted. Use a public website hostname.");
  url.hash = "";
  return url;
}
function safeDisplayUrl(value) {
  try {
    const url = new URL(value);
    for (const key of [...url.searchParams.keys()]) if (/(token|secret|password|passwd|auth|session|signature|api[_-]?key|access[_-]?key|jwt|credential|code)/i.test(key)) url.searchParams.set(key, "[REDACTED]");
    url.hash = "";
    return url.href;
  } catch { return String(value); }
}
function redactText(value) {
  return String(value).replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]").replace(/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|passwd|secret)\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]");
}
function decodeEntities(text) {
  return text.replace(/&(?:amp|lt|gt|quot|apos|#39|nbsp);|&#(?:x([\da-f]{1,6})|(\d{1,7}));/gi, (match, hex, dec) => {
    const named = { "&amp;": "&", "&lt;": "<", "&gt;": ">", "&quot;": '"', "&apos;": "'", "&#39;": "'", "&nbsp;": " " };
    if (named[match.toLowerCase()]) return named[match.toLowerCase()];
    const code = hex ? parseInt(hex, 16) : Number(dec);
    return Number.isFinite(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match;
  });
}
function stripTags(html) {
  return decodeEntities(html.replace(/<!--[\s\S]*?-->/g, " ").replace(/<(script|style|noscript|svg)[^>]*>[\s\S]*?<\/\1>/gi, " ").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim());
}
function attr(tag, name) {
  const match = tag.match(new RegExp("\\b" + name + "\\s*=\\s*(?:\\\"([^\\\"]*)\\\"|'([^']*)'|([^\\s>]+))", "i"));
  return decodeEntities(match ? (match[1] ?? match[2] ?? match[3] ?? "").trim() : "");
}
function tags(html, name) { return [...html.matchAll(new RegExp("<" + name + "\\b[^>]*>", "gi"))].map(match => match[0]); }
function publicResourceUrl(value, base) {
  try { const url = new URL(value, base); if (!["https:", "http:"].includes(url.protocol)) return ""; return safeDisplayUrl(url.href); }
  catch { return ""; }
}
function collect(html, name, field, base, max = 30) {
  return tags(html, name).map(tag => publicResourceUrl(attr(tag, field), base)).filter(Boolean).slice(0, max);
}
function extractPage(html, finalUrl, status, contentType) {
  const title = redactText(stripTags((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i) || [])[1] || ""));
  const description = redactText(attr((html.match(/<meta\b(?=[^>]*\bname\s*=\s*["']description["'])[^>]*>/i) || [])[0] || "", "content"));
  const headings = [1,2,3].flatMap(level => [...html.matchAll(new RegExp("<h" + level + "\\b[^>]*>([\\s\\S]*?)<\\/h" + level + ">", "gi"))].map(m => ({ level, text: redactText(stripTags(m[1])).slice(0, 240) })).filter(x => x.text).slice(0, 30));
  const buttons = [...html.matchAll(/<button\b[^>]*>([\s\S]*?)<\/button>/gi)].map(m => ({ tag: "button", text: redactText(stripTags(m[1])).slice(0, 160), type: attr(m[0].split(">", 1)[0] + ">", "type") || "button" })).concat(tags(html, "input").map(tag => ({ tag: "input", text: attr(tag, "value") || attr(tag, "aria-label") || attr(tag, "placeholder"), type: attr(tag, "type") || "text" }))).filter(x => x.text || x.type === "submit" || x.type === "button").slice(0, 40);
  const forms = tags(html, "form").slice(0, 20).map(tag => ({ action: publicResourceUrl(attr(tag, "action") || finalUrl, finalUrl), method: (attr(tag, "method") || "get").toUpperCase() }));
  const links = [...html.matchAll(/<a\b[^>]*>([\s\S]*?)<\/a>/gi)].map(m => ({ href: attr(m[0].split(">", 1)[0] + ">", "href"), text: redactText(stripTags(m[1])) })).filter(x => x.href).map(x => { try { const raw = new URL(x.href, finalUrl); if (!["https:", "http:"].includes(raw.protocol)) return null; return { url: safeDisplayUrl(raw.href), crawlUrl: raw.href, text: x.text.slice(0, 160) }; } catch { return null; } }).filter(Boolean).slice(0, 100);
  const scripts = collect(html, "script", "src", finalUrl, 40).map(safeDisplayUrl);
  const stylesheets = tags(html, "link").filter(tag => /\brel\s*=\s*["']?stylesheet/i.test(tag)).map(tag => attr(tag, "href")).filter(Boolean).map(value => { try { return safeDisplayUrl(new URL(value, finalUrl).href); } catch { return null; } }).filter(Boolean).slice(0, 30);
  const images = tags(html, "img").slice(0, 60).map(tag => ({ src: publicResourceUrl(attr(tag, "src") || finalUrl, finalUrl), alt: redactText(attr(tag, "alt")), hasAlt: /\balt\s*=/.test(tag) }));
  const bodyText = redactText(stripTags(html).slice(0, 1800));
  const canonicalTag = tags(html, "link").find(tag => /\brel\s*=\s*["']?canonical/i.test(tag));
  const canonical = canonicalTag ? attr(canonicalTag, "href") : "";
  const lower = html.toLowerCase();
  const signals = [];
  const add = (name, why) => signals.push({ name, evidence: why });
  if (lower.includes("__next_data__") || /_next\/static/.test(lower)) add("Next.js", "Next.js document/runtime markers");
  if (lower.includes("__nuxt__") || /_nuxt\//.test(lower)) add("Nuxt", "Nuxt document/runtime markers");
  if (lower.includes("wp-content") || lower.includes("wp-includes")) add("WordPress", "WordPress asset paths");
  if (lower.includes("cdn.shopify.com") || lower.includes("shopify")) add("Shopify", "Shopify asset or runtime markers");
  if (lower.includes("data-v-app") || lower.includes("vue.runtime") || lower.includes("vue.global") || lower.includes("__vue")) add("Vue (possible)", "Vue-related document markers");
  if (lower.includes("ng-version") || lower.includes("ng-app")) add("Angular", "Angular document markers");
  if (lower.includes("data-reactroot") || lower.includes("react-dom") || lower.includes("__react")) add("React (possible)", "React-related document markers");
  if (lower.includes("webflow")) add("Webflow", "Webflow asset/runtime markers");
  if (lower.includes("wixstatic.com")) add("Wix", "Wix asset host");
  return { url: safeDisplayUrl(finalUrl), status, contentType, title, description, canonical: canonical ? publicResourceUrl(canonical, finalUrl) : "", headings, buttons, forms, links, scripts, stylesheets, images, bodyText, technicalSignals: signals, counts: { headings: headings.length, links: links.length, buttons: buttons.length, forms: forms.length, scripts: scripts.length, stylesheets: stylesheets.length, images: images.length }, accessibilitySignals: { imagesMissingAlt: images.filter(image => !image.hasAlt || !image.alt).length, hasPageTitle: Boolean(title), hasMetaDescription: Boolean(description), hasH1: headings.some(h => h.level === 1) } };
}
async function readLimited(response, maxBytes) {
  const declared = Number(response.headers.get("content-length") || 0);
  if (declared > maxBytes) throw new Error("The target page is larger than the inspection limit.");
  if (!response.body) return "";
  const reader = response.body.getReader();
  const chunks = []; let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) { await reader.cancel(); throw new Error("The target page exceeded the inspection size limit."); }
      chunks.push(value);
    }
  } finally { try { reader.releaseLock(); } catch {} }
  const bytes = new Uint8Array(total); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
}
async function safeFetchHtml(initialUrl, expectedOrigin, serviceHost) {
  let current = validateTarget(initialUrl, serviceHost);
  for (let hop = 0; hop <= 3; hop++) {
    const response = await fetch(current.href, { method: "GET", redirect: "manual", headers: { "accept": "text/html,application/xhtml+xml;q=0.9", "user-agent": "VRuntimeInspector/0.2 (+https://github.com/vruntime-labs/vruntime-inspector)" }, signal: AbortSignal.timeout(10_000) });
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get("location");
      if (!location || hop === 3) throw new Error("The website redirected too many times.");
      current = validateTarget(new URL(location, current).href, serviceHost);
      if (current.origin !== expectedOrigin) throw new Error("Cross-origin redirects are not followed.");
      continue;
    }
    const type = response.headers.get("content-type") || "";
    if (!response.ok) throw new Error("The target returned HTTP " + response.status + ".");
    if (!/text\/html|application\/xhtml\+xml/i.test(type)) throw new Error("The target did not return an HTML page (received " + (type || "unknown content type") + ").");
    return { html: await readLimited(response, MAX_HTML), finalUrl: current.href, status: response.status, contentType: type };
  }
  throw new Error("Unable to follow the website redirect.");
}
async function robotsPolicy(origin) {
  try {
    const response = await fetch(new URL("/robots.txt", origin), { redirect: "manual", headers: { "user-agent": "VRuntimeInspector/0.2" }, signal: AbortSignal.timeout(3000) });
    if (!response.ok || !/text\/plain/i.test(response.headers.get("content-type") || "text/plain")) return [];
    const text = await readLimited(response, 32 * 1024);
    let active = false; const rules = [];
    for (const line of text.split(/\r?\n/)) {
      const clean = line.split("#")[0].trim();
      const match = clean.match(/^([^:]+):\s*(.*)$/);
      if (!match) continue;
      const key = match[1].toLowerCase(), value = match[2].trim();
      if (key === "user-agent") active = value === "*";
      else if (active && key === "disallow" && value) rules.push(value);
    }
    return rules;
  } catch { return []; }
}
function isDisallowed(pathname, rules) { return rules.some(rule => rule === "/" || pathname.startsWith(rule)); }
function makeMarkdown(result) {
  const lines = ["# Website reconstruction brief", "", "- Target: " + result.target, "- Inspected: " + result.inspectedAt, "- Pages inspected: " + result.pages.length, "- Mode: passive public-web inspection", "", "## Product purpose and visible positioning", result.summary.visiblePurpose || "Not clearly established from the pages inspected.", "", "## Site-wide observations", "- Internal pages discovered: " + result.summary.internalLinkCount, "- Visible feature signals: " + result.summary.featureCount, "- Technical signals: " + (result.summary.technicalSignals.join(", ") || "No reliable framework/CMS signal detected"), "", "## Page inventory"];
  for (const page of result.pages) {
    lines.push("", "### " + (page.title || page.url), "- URL: " + page.url, "- HTTP: " + page.status, "- Description: " + (page.description || "Not found"), "- Headings: " + (page.headings.map(h => "H" + h.level + " " + h.text).join("; ") || "None captured"), "- Visible controls: " + (page.buttons.map(b => b.text || b.type || b.tag).filter(Boolean).join(", ") || "None captured"), "- Forms: " + (page.forms.map(f => f.method + " " + (f.action || "(current page)" )).join("; ") || "None captured"), "- Images without useful alt text: " + page.accessibilitySignals.imagesMissingAlt, "- Scripts: " + page.scripts.length, "- Stylesheets: " + page.stylesheets.length, "- Technical signals: " + (page.technicalSignals.map(s => s.name).join(", ") || "None detected"), "- Visible text excerpt: " + (page.bodyText.slice(0, 1400) || "No text extracted"));
  }
  lines.push("", "## Rebuild guidance for the connected AI", "Build an original application that implements the observable user-facing capabilities and workflows described above. Do not claim access to private source code, private APIs, databases, authentication-only screens or internal business logic. Use original branding and assets. Where behaviour is not evidenced, ask the user or propose a clearly labelled assumption. Implement features incrementally and validate them against the captured page inventory.", "", "## Unknowns and limitations", ...result.coverage.limitations.map(item => "- " + item), "", "## Evidence policy", "All page details above are observations from publicly fetched HTML. Framework labels are heuristic signals, not proof. Product purpose is summarized from visible page copy, not private business documentation.");
  return lines.join("\n");
}
async function inspectWebsite(inputUrl, requestedPages = 4, serviceHost = "") {
  const first = validateTarget(inputUrl, serviceHost);
  const maxPages = Math.max(1, Math.min(MAX_PAGES, Number.isFinite(Number(requestedPages)) ? Math.floor(Number(requestedPages)) : 4));
  const robots = await robotsPolicy(first.origin);
  const queue = [first.href], visited = new Set(), pages = [], evidence = [];
  while (queue.length && pages.length < maxPages) {
    const current = validateTarget(queue.shift());
    if (visited.has(current.href)) continue;
    visited.add(current.href);
    if (isDisallowed(current.pathname, robots)) { evidence.push({ classification: "unknown", sourceUrl: current.href, detail: "Skipped because robots.txt disallows this path." }); continue; }
    try {
      const fetched = await safeFetchHtml(current.href, first.origin, serviceHost);
      const page = extractPage(fetched.html, fetched.finalUrl, fetched.status, fetched.contentType);
      if (new URL(page.url).origin !== first.origin) continue;
      pages.push(page);
      evidence.push({ classification: "observed", sourceUrl: page.url, detail: "Fetched HTML page and extracted visible structure, links, controls and resource references." });
      for (const link of page.links) {
        try {
          const candidate = validateTarget(link.crawlUrl, serviceHost);
          if (candidate.origin === first.origin && !visited.has(candidate.href) && queue.length < 100) queue.push(candidate.href);
        } catch {}
      }
    } catch (err) {
      evidence.push({ classification: "unknown", sourceUrl: current.href, detail: err.message });
    }
  }
  if (!pages.length) throw new Error("No inspectable HTML pages were found. Check the URL, access permissions and robots.txt rules.");
  for (const page of pages) for (const link of page.links) delete link.crawlUrl;
  const allSignals = [...new Set(pages.flatMap(page => page.technicalSignals.map(signal => signal.name)))];
  const featureWords = [...new Set(pages.flatMap(page => [...page.buttons.map(b => b.text), ...page.headings.map(h => h.text)]).filter(Boolean))].slice(0, 80);
  const visiblePurpose = pages.find(page => page.description)?.description || pages.map(page => page.bodyText).join(" ").slice(0, 500);
  const result = { target: safeDisplayUrl(first.href), inspectedAt: new Date().toISOString(), pages, evidence, summary: { pageCount: pages.length, internalLinkCount: pages.reduce((sum, page) => sum + page.links.filter(link => { try { return new URL(link.url).origin === first.origin; } catch { return false; } }).length, 0), featureCount: featureWords.length, featureSignals: featureWords, technicalSignals: allSignals, visiblePurpose }, coverage: { level: "passive-html", description: "This beta inspects publicly fetchable HTML pages and extracts their visible structure and resource references.", limitations: ["This is not a full browser session: JavaScript-rendered states, hover menus, drag-and-drop, keyboard shortcuts and click outcomes are not executed or observed.", "Private backend source code, databases, internal business logic, private APIs and authenticated pages are not accessible from a public URL alone.", "API endpoints are not actively probed; script files are inventoried by URL but not downloaded or executed.", "Framework and CMS detection is heuristic and can be incomplete or incorrect.", "Only same-origin HTML pages are crawled, with a strict page and response-size limit."] } };
  result.aiBriefMarkdown = makeMarkdown(result);
  return result;
}

const TOOLS = [
  { name: "inspect_website", description: "Passively inspect a public website by URL. Crawls a small number of same-origin HTML pages, maps titles, descriptions, headings, links, visible controls, forms, image alt text, script and stylesheet references, and heuristic technology signals. Returns structured evidence and an AI-ready reconstruction brief. Does not execute site JavaScript, interact with controls, access private backends or bypass authentication. Only inspect targets you are authorized to examine.", inputSchema: { type: "object", properties: { url: { type: "string", format: "uri", description: "Public HTTP or HTTPS website URL." }, maxPages: { type: "integer", minimum: 1, maximum: MAX_PAGES, default: 4, description: "Maximum same-origin pages to inspect (1-6)." } }, required: ["url"], additionalProperties: false } },
  { name: "get_inspector_capabilities", description: "Describe the hosted Inspector's current capabilities, limits, safety rules and recommended next steps. Use this before promising deep or one-to-one reconstruction.", inputSchema: { type: "object", properties: {}, additionalProperties: false } }
];
const CAPABILITIES = { product: "VRuntime Inspector", version: VERSION, mode: "hosted-passive-html-beta", current: ["Public website HTML inspection", "Same-origin page discovery with a small crawl limit", "Titles, descriptions, headings, links, forms, visible control labels, image alt text and asset references", "Heuristic framework/CMS signals", "Evidence-backed Markdown reconstruction brief", "Remote MCP over Streamable HTTP"], notYetAvailable: ["JavaScript-rendered browser inspection and interaction recording", "Authenticated/private application sessions", "Private backend source or database introspection from URL alone", "Active API probing", "Full JavaScript/TypeScript AST analysis", "Desktop/mobile package inspection", "3D application graph", "Automated code generation (the connected AI performs code generation)"], safety: ["Only inspect targets you are authorized to examine", "Read-only GET requests only", "No authentication bypass", "No code execution from inspected sites", "No IP-literal, local or internal hostname targets", "Same-origin crawl with size and page limits"] };
function mcpResult(id, result) { return { jsonrpc: "2.0", id, result: { resultType: "complete", ...result, _meta: { "io.modelcontextprotocol/serverInfo": SERVER_INFO }, ttlMs: 300_000, cacheScope: "public" } }; }
function mcpError(id, code, message) { return { jsonrpc: "2.0", id: id ?? null, error: { code, message } }; }
async function mcpHandle(request) {
  const origin = request.headers.get("Origin");
  if (origin && origin !== new URL(request.url).origin) return error("Origin not allowed.", 403);
  let body;
  try { const text = await request.text(); if (new TextEncoder().encode(text).length > MAX_BODY) return json(mcpError(null, -32600, "Request body too large."), 413); body = JSON.parse(text); }
  catch { return json(mcpError(null, -32700, "Parse error."), 400); }
  if (!body || body.jsonrpc !== "2.0" || typeof body.method !== "string") return json(mcpError(body?.id, -32600, "Invalid JSON-RPC request."), 400);
  const method = body.method;
  const headerVersion = request.headers.get("MCP-Protocol-Version");
  const metaVersion = body.params?._meta?.["io.modelcontextprotocol/protocolVersion"];
  const modern = method === "server/discover" || headerVersion === MCP_VERSION || metaVersion === MCP_VERSION;
  if (modern) {
    if (headerVersion !== MCP_VERSION || metaVersion !== MCP_VERSION || request.headers.get("Mcp-Method") !== method) return json(mcpError(body.id, -32020, "Missing or mismatched MCP protocol metadata headers."), 400);
    if (method === "tools/call" && request.headers.get("Mcp-Name") !== body.params?.name) return json(mcpError(body.id, -32020, "Mcp-Name header does not match the requested tool."), 400);
  }
  if (method.startsWith("notifications/")) return new Response(null, { status: 202, headers: { "cache-control": "no-store" } });
  if (body.id === undefined) return new Response(null, { status: 202 });
  if (method === "server/discover") return json(mcpResult(body.id, { supportedVersions: [MCP_VERSION], capabilities: { tools: {} }, instructions: "Use inspect_website to examine publicly accessible websites and create an evidence-backed reconstruction brief. Do not claim access to private internals. The connected AI client is responsible for code generation." }));
  if (method === "initialize") return json({ jsonrpc: "2.0", id: body.id, result: { protocolVersion: "2025-11-25", capabilities: { tools: { listChanged: false } }, serverInfo: SERVER_INFO, instructions: "Use inspect_website for a bounded passive inspection of a public website. The connected AI uses its own model and credits to build the application." } });
  if (method === "ping") return json({ jsonrpc: "2.0", id: body.id, result: {} });
  if (method === "tools/list") return json(mcpResult(body.id, { tools: TOOLS }));
  if (method === "tools/call") {
    const name = body.params?.name, args = body.params?.arguments || {};
    try {
      let data;
      if (name === "get_inspector_capabilities") data = CAPABILITIES;
      else if (name === "inspect_website") {
        if (!rateAllowed(request)) return json(mcpError(body.id, -32000, "Inspection rate limit reached. Please wait before trying again."), 429);
        if (typeof args.url !== "string") return json(mcpError(body.id, -32602, "The url argument is required."), 400);
        data = await inspectWebsite(args.url, args.maxPages ?? 4, new URL(request.url).host);
      } else return json(mcpError(body.id, -32602, "Unknown tool: " + String(name)), 400);
      return json(mcpResult(body.id, { content: [{ type: "text", text: name === "inspect_website" ? data.aiBriefMarkdown : JSON.stringify(data, null, 2) }], structuredContent: data, isError: false }));
    } catch (err) { return json(mcpResult(body.id, { content: [{ type: "text", text: "Inspection error: " + err.message }], isError: true })); }
  }
  return json(mcpError(body.id, -32601, "Method not found."), 404);
}
async function handleRequestInternal(request) {
  const url = new URL(request.url);
  if (url.pathname === "/api/health" && request.method === "GET") return json({ status: "ok", service: "vruntime-inspector-cloud", version: VERSION, mcp: "/mcp", mode: "passive-html-beta" });
  if (url.pathname === "/mcp") {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
    return mcpHandle(request);
  }
  if (url.pathname === "/api/inspect-website") {
    if (request.method !== "POST") return new Response("Method not allowed", { status: 405, headers: { allow: "POST" } });
    if (!rateAllowed(request)) return error("Inspection rate limit reached. Please wait a minute before trying again.", 429);
    let data;
    try { const text = await request.text(); if (new TextEncoder().encode(text).length > MAX_BODY) return error("Request body is too large.", 413); data = JSON.parse(text); }
    catch { return error("Send a valid JSON request."); }
    try { return json(await inspectWebsite(data.url, data.maxPages ?? 4, url.host)); }
    catch (err) { return error(err.message, 400); }
  }
  if (request.method === "GET" && url.pathname === "/") return new Response(PAGE, { headers: { "content-type": "text/html; charset=utf-8", "cache-control": "public, max-age=300" } });
  if (request.method === "GET" && url.pathname === "/robots.txt") return new Response("User-agent: *\nDisallow: /api/\nDisallow: /mcp\n", { headers: { "content-type": "text/plain; charset=utf-8" } });
  return error("Not found.", 404);
}
export async function handleRequest(request) {
  try { return securityHeaders(await handleRequestInternal(request)); }
  catch { return securityHeaders(error("Unexpected service error.", 500)); }
}
export default { fetch: handleRequest };
