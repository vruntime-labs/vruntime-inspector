import {
  createRuntimeEvidence, createRuntimeInspectionPlan
} from "./index.js";

const MAX_CONSOLE = 80;
const MAX_REQUESTS = 160;
const MAX_ACCESSIBILITY_NODES = 500;
const MAX_DOM_NODES = 5000;
const MAX_SCREENSHOT_BYTES = 1_500_000;

function safeText(value, max = 240) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function isSafeSameOriginResource(value, origin) {
  try {
    const url = new URL(value);
    if (!["https:", "http:"].includes(url.protocol)) return false;
    if (url.origin !== origin || url.username || url.password) return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal") || host.endsWith(".test") || /^[\d.]+$/.test(host) || host.includes(":")) return false;
    return true;
  } catch { return false; }
}

function normalizeConsoleMessage(message) {
  return {
    type: safeText(message.type(), 40),
    text: safeText(message.text(), 500),
    location: safeText(message.location()?.url, 300)
  };
}

export async function runtimeInspectWebsite(env, input) {
  if (!env?.BROWSER) {
    const error = new Error("Hosted runtime browser is not configured. The Browser Run binding is missing; static inspection remains available.");
    error.code = "BROWSER_PROVIDER_UNAVAILABLE";
    throw error;
  }
  const plan = createRuntimeInspectionPlan({
    url: input?.url,
    viewport: input?.viewport ?? "desktop",
    limits: { maxDurationMs: 45_000, maxDomNodes: MAX_DOM_NODES, maxNetworkEvents: MAX_REQUESTS, maxScreenshots: 1, maxPages: 1, maxActions: 1 }
  });
  const target = new URL(plan.target);
  const viewport = plan.viewport;
  const waitAfterLoadMs = Math.max(0, Math.min(5000, Number(input?.waitAfterLoadMs) || 1200));
  const { default: puppeteer } = await import("@cloudflare/puppeteer");
  const browser = await puppeteer.launch(env.BROWSER);
  const startedAt = Date.now();
  const consoleMessages = [];
  const networkEvents = [];
  const evidence = [];
  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.deviceScaleFactor, isMobile: viewport.isMobile });
    await page.setDefaultNavigationTimeout(20_000);
    await page.setDefaultTimeout(5000);
    await page.setRequestInterception(true);
    page.on("request", request => {
      const url = request.url();
      const allowed = isSafeSameOriginResource(url, target.origin);
      if (networkEvents.length < MAX_REQUESTS) {
        networkEvents.push({
          kind: "request",
          url: allowed ? url.split("?")[0] : "[blocked external or non-web request]",
          method: safeText(request.method(), 12),
          resourceType: safeText(request.resourceType(), 30),
          outcome: allowed ? "allowed-same-origin" : "blocked"
        });
      }
      if (allowed) request.continue().catch(() => {});
      else request.abort("blockedbyclient").catch(() => {});
    });
    page.on("response", response => {
      if (networkEvents.length < MAX_REQUESTS && isSafeSameOriginResource(response.url(), target.origin)) {
        networkEvents.push({ kind: "response", url: response.url().split("?")[0], status: response.status(), resourceType: safeText(response.request().resourceType(), 30) });
      }
    });
    page.on("console", message => { if (consoleMessages.length < MAX_CONSOLE) consoleMessages.push(normalizeConsoleMessage(message)); });
    page.on("pageerror", error => { if (consoleMessages.length < MAX_CONSOLE) consoleMessages.push({ type: "pageerror", text: safeText(error?.message, 500), location: "" }); });
    page.on("popup", popup => popup.close().catch(() => {}));
    page.on("dialog", dialog => dialog.dismiss().catch(() => {}));

    const navigation = await page.goto(target.href, { waitUntil: "domcontentloaded", timeout: 20_000 });
    if (waitAfterLoadMs) await new Promise(resolve => setTimeout(resolve, waitAfterLoadMs));
    const pageData = await page.evaluate(maxNodes => {
      const clean = (value, max = 240) => String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
      const visible = element => {
        const style = getComputedStyle(element);
        const rect = element.getBoundingClientRect();
        return style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0;
      };
      const elements = [...document.querySelectorAll("body *")].slice(0, maxNodes);
      const idFor = element => {
        if (!element.hasAttribute("data-vri-inspector-id")) element.setAttribute("data-vri-inspector-id", "vri-" + (elements.indexOf(element) + 1));
        return element.getAttribute("data-vri-inspector-id");
      };
      const labelFor = element => clean(element.getAttribute("aria-label") || element.getAttribute("title") || element.innerText || element.textContent || element.getAttribute("placeholder") || "");
      const controls = elements.filter(element => visible(element) && element.matches("button,a,input,select,textarea,[role=button],[role=link],[role=tab],[role=menuitem]")).slice(0, 250).map(element => ({
        id: idFor(element), tag: element.tagName.toLowerCase(), role: clean(element.getAttribute("role"), 40),
        label: labelFor(element).slice(0, 180), type: clean(element.getAttribute("type"), 30),
        href: element.tagName === "A" ? clean(element.getAttribute("href"), 300) : "",
        disabled: Boolean(element.disabled || element.getAttribute("aria-disabled") === "true")
      }));
      const headings = [...document.querySelectorAll("h1,h2,h3,h4")].filter(visible).slice(0, 100).map(element => ({ level: Number(element.tagName.slice(1)), text: clean(element.innerText || element.textContent, 240) }));
      const links = [...document.querySelectorAll("a[href]")].filter(visible).slice(0, 200).map(element => ({ text: labelFor(element), href: clean(element.href, 500) }));
      const forms = [...document.forms].slice(0, 30).map(form => ({ action: clean(form.action, 500), method: clean(form.method || "get", 12).toUpperCase(), controls: form.elements.length }));
      const title = clean(document.title, 240);
      const description = clean(document.querySelector('meta[name="description"]')?.content, 400);
      const text = clean(document.body?.innerText || "", 6000);
      const dom = elements.slice(0, 1500).map(element => ({
        tag: element.tagName.toLowerCase(), id: clean(element.id, 80), role: clean(element.getAttribute("role"), 40),
        classes: clean(typeof element.className === "string" ? element.className : "", 160),
        text: clean(element.children.length ? "" : element.textContent, 180)
      }));
      return {
        title, description, url: location.href, readyState: document.readyState,
        viewport: { width: innerWidth, height: innerHeight, devicePixelRatio },
        document: { language: document.documentElement.lang || "", scrollWidth: document.documentElement.scrollWidth, scrollHeight: document.documentElement.scrollHeight },
        headings, controls, links, forms, visibleText: text, dom, domNodesObserved: elements.length,
        domTruncated: document.querySelectorAll("body *").length > maxNodes,
        counts: { headings: headings.length, controls: controls.length, links: links.length, forms: forms.length }
      };
    }, MAX_DOM_NODES);

    let accessibility = [];
    try {
      const client = await page.createCDPSession();
      const snapshot = await client.send("Accessibility.getFullAXTree");
      accessibility = (snapshot.nodes || []).slice(0, MAX_ACCESSIBILITY_NODES).map(node => ({
        role: safeText(node.role?.value, 60),
        name: safeText(node.name?.value, 180),
        description: safeText(node.description?.value, 180),
        ignored: Boolean(node.ignored),
        level: node.level ?? null
      })).filter(node => !node.ignored && (node.role || node.name));
      await client.detach().catch(() => {});
    } catch (error) {
      evidence.push(createRuntimeEvidence({ classification: "unknown", sourceUrl: target.href, detail: "Accessibility tree capture was unavailable: " + safeText(error.message, 240) }));
    }

    const screenshot = await page.screenshot({ type: "jpeg", quality: 55, fullPage: false, captureBeyondViewport: false });
    if (screenshot.byteLength > MAX_SCREENSHOT_BYTES) throw new Error("Screenshot exceeded the runtime capture size limit.");
    const screenshotBase64 = Buffer.from(screenshot).toString("base64");
    const finalUrl = page.url();
    evidence.unshift(
      createRuntimeEvidence({ classification: "observed", sourceUrl: finalUrl, detail: "Rendered page title: " + (pageData.title || "(no title)") }),
      createRuntimeEvidence({ classification: "observed", sourceUrl: finalUrl, detail: "Captured rendered DOM, visible controls, headings, links, forms, accessibility nodes and a viewport screenshot." })
    );
    return {
      mode: "runtime-browser",
      inspectedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      target: plan.target,
      finalUrl: finalUrl.split("?")[0],
      viewport,
      navigationStatus: navigation?.status() ?? null,
      page: pageData,
      accessibility,
      console: consoleMessages,
      network: networkEvents,
      screenshot: { mimeType: "image/jpeg", base64: screenshotBase64, bytes: screenshot.byteLength },
      evidence,
      coverage: {
        classification: "observed",
        description: "A real isolated browser rendered the page and captured its initial state.",
        limitations: [
          "Only the initial page state was captured; no user interactions were performed.",
          "For network safety, only same-origin HTTP(S) page resources were allowed; cross-origin scripts, fonts, images, APIs and other resources were blocked and may affect visual fidelity.",
          "The browser session is unauthenticated and ephemeral. No existing browser profile, cookies or local files were accessed.",
          "DOM, accessibility, console and network capture are bounded and may be truncated.",
          "Browser Run's Free plan includes 10 minutes of browser use per day; availability ends when the daily quota is exhausted."
        ],
        truncated: { dom: pageData.domTruncated, accessibility: accessibility.length >= MAX_ACCESSIBILITY_NODES, console: consoleMessages.length >= MAX_CONSOLE, network: networkEvents.length >= MAX_REQUESTS }
      }
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
