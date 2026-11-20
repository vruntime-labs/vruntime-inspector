import {
  classifyRuntimeAction, createRuntimeEvidence, createRuntimeInspectionPlan
} from "./index.js";

const MAX_CONSOLE = 80;
const MAX_REQUESTS = 160;
const MAX_ACCESSIBILITY_NODES = 500;
const MAX_DOM_NODES = 5000;
const MAX_SCREENSHOT_BYTES = 1_500_000;
const MAX_ACTIONS_PER_RUN = 8;
const SAFE_KEYS = new Set(["Tab", "Escape", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"]);

function safeText(value, max = 240) {
  return String(value ?? "").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, max);
}

function scrubData(value) {
  if (typeof value === "string") {
    return value
      .replace(/\bBearer\s+[A-Za-z0-9._~+\/-]+=*/gi, "Bearer [REDACTED]")
      .replace(/((?:api[_-]?key|access[_-]?token|refresh[_-]?token|client[_-]?secret|password|passwd|secret|session|auth|jwt)\s*[:=]\s*)[^\s,;]+/gi, "$1[REDACTED]");
  }
  if (Array.isArray(value)) return value.map(scrubData);
  if (value && typeof value === "object") return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, scrubData(item)]));
  return value;
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

async function capturePageData(page) {
  return scrubData(await page.evaluate(maxNodes => {
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
  }, MAX_DOM_NODES));
}

async function captureAccessibility(page, evidence, sourceUrl) {
  try {
    const client = await page.createCDPSession();
    const snapshot = await client.send("Accessibility.getFullAXTree");
    const nodes = (snapshot.nodes || []).slice(0, MAX_ACCESSIBILITY_NODES).map(node => ({
      role: safeText(node.role?.value, 60),
      name: safeText(node.name?.value, 180),
      description: safeText(node.description?.value, 180),
      ignored: Boolean(node.ignored),
      level: node.level ?? null
    })).filter(node => !node.ignored && (node.role || node.name));
    await client.detach().catch(() => {});
    return nodes;
  } catch (error) {
    evidence.push(createRuntimeEvidence({ classification: "unknown", sourceUrl, detail: "Accessibility tree capture was unavailable: " + safeText(error.message, 240) }));
    return [];
  }
}

function summarizeState(pageData) {
  return {
    url: pageData.url.split("?")[0],
    title: pageData.title,
    headings: pageData.headings.slice(0, 30),
    controls: pageData.controls.slice(0, 80).map(control => ({ id: control.id, tag: control.tag, role: control.role, label: control.label, disabled: control.disabled })),
    counts: pageData.counts,
    viewport: pageData.viewport,
    document: pageData.document,
    visibleTextExcerpt: pageData.visibleText.slice(0, 1400)
  };
}

async function takeScreenshot(page) {
  const bytes = await page.screenshot({ type: "jpeg", quality: 48, fullPage: false, captureBeyondViewport: false });
  if (bytes.byteLength > MAX_SCREENSHOT_BYTES) throw new Error("Screenshot exceeded the runtime capture size limit.");
  return { mimeType: "image/jpeg", base64: Buffer.from(bytes).toString("base64"), bytes: bytes.byteLength };
}

async function runApprovedAction(page, action, planOrigin) {
  const classification = classifyRuntimeAction(action);
  if (!classification.allowed) return { status: "not-executed", classification, reason: classification.reason };
  if (action.type === "click" || action.type === "hover") {
    if (typeof action.controlId !== "string" || !/^vri-\d{1,5}$/.test(action.controlId)) {
      return { status: "not-executed", classification, reason: "A control ID from the latest runtime snapshot is required." };
    }
    const selector = '[data-vri-inspector-id="' + action.controlId + '"]';
    const element = await page.$(selector);
    if (!element) return { status: "not-executed", classification, reason: "The referenced control is no longer present; capture a fresh state first." };
    const facts = await element.evaluate(node => {
      const style = getComputedStyle(node), rect = node.getBoundingClientRect();
      return {
        tag: node.tagName.toLowerCase(),
        role: node.getAttribute("role") || "",
        type: node.getAttribute("type") || "",
        label: (node.getAttribute("aria-label") || node.getAttribute("title") || node.innerText || node.textContent || "").replace(/\s+/g, " ").trim().slice(0, 180),
        disabled: Boolean(node.disabled || node.getAttribute("aria-disabled") === "true"),
        visible: style.display !== "none" && style.visibility !== "hidden" && Number(style.opacity) !== 0 && rect.width > 0 && rect.height > 0,
        inForm: Boolean(node.closest("form")),
        isAnchor: node.tagName === "A",
        href: node.href || ""
      };
    });
    if (!facts.visible || facts.disabled) return { status: "not-executed", classification, reason: "The referenced control is hidden or disabled." };
    if (!facts.label || facts.label !== safeText(action.label, 180)) return { status: "not-executed", classification, reason: "The control label changed or does not match the approved label." };
    if (action.type === "click") {
      const safeButton = !facts.isAnchor && !facts.inForm && ((facts.tag === "button" && facts.type.toLowerCase() === "button") || ["button", "tab"].includes(facts.role));
      if (!safeButton) return { status: "not-executed", classification, reason: "Only labelled non-submit buttons and tabs outside forms can be clicked." };
      await element.click({ timeout: 3000 });
    } else {
      const box = await element.boundingBox();
      if (!box) return { status: "not-executed", classification, reason: "The referenced control has no visible hit area." };
      await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2);
    }
  } else if (action.type === "press") {
    if (!SAFE_KEYS.has(action.key)) return { status: "not-executed", classification, reason: "Only Tab, Escape and arrow keys are supported; text entry and activation keys are disabled." };
    await page.keyboard.press(action.key);
  } else if (action.type === "scroll") {
    const deltaX = Number(action.deltaX || 0), deltaY = Number(action.deltaY || 0);
    if (!Number.isInteger(deltaX) || !Number.isInteger(deltaY) || Math.abs(deltaX) > 800 || Math.abs(deltaY) > 1200 || (deltaX === 0 && deltaY === 0)) {
      return { status: "not-executed", classification, reason: "Scroll deltas must be non-zero integers within the bounded range." };
    }
    await page.evaluate(({ x, y }) => window.scrollBy(x, y), { x: deltaX, y: deltaY });
  }
  await new Promise(resolve => setTimeout(resolve, 180));
  const current = new URL(page.url());
  if (current.origin !== planOrigin) return { status: "stopped", classification, reason: "The page attempted to leave the inspected origin; the action sequence was stopped." };
  return { status: "executed", classification, reason: "Approved action executed in the isolated browser." };
}

export async function runtimeInspectWebsite(env, input) {
  if (!env?.BROWSER) {
    const error = new Error("Hosted runtime browser is not configured. The Browser Run binding is missing; static inspection remains available.");
    error.code = "BROWSER_PROVIDER_UNAVAILABLE";
    throw error;
  }
  const requestedActions = Array.isArray(input?.actions) ? input.actions.slice(0, MAX_ACTIONS_PER_RUN) : [];
  const plan = createRuntimeInspectionPlan({
    url: input?.url,
    viewport: input?.viewport ?? "desktop",
    actions: requestedActions,
    limits: { maxDurationMs: 45_000, maxDomNodes: MAX_DOM_NODES, maxNetworkEvents: MAX_REQUESTS, maxScreenshots: 2, maxPages: 1, maxActions: MAX_ACTIONS_PER_RUN }
  });
  const target = new URL(plan.target);
  if (target.protocol !== "https:") throw new Error("Runtime browser inspection requires HTTPS.");
  const viewport = plan.viewport;
  const waitAfterLoadMs = Math.max(0, Math.min(5000, Number(input?.waitAfterLoadMs) || 1200));
  const { default: puppeteer } = await import("@cloudflare/puppeteer");
  const browser = await puppeteer.launch(env.BROWSER);
  const startedAt = Date.now();
  const consoleMessages = [];
  const networkEvents = [];
  const evidence = [];
  const actionResults = [];
  let page;
  try {
    page = await browser.newPage();
    await page.setViewport({ width: viewport.width, height: viewport.height, deviceScaleFactor: viewport.deviceScaleFactor, isMobile: viewport.isMobile });
    await page.setDefaultNavigationTimeout(20_000);
    await page.setDefaultTimeout(5000);
    await page.setRequestInterception(true);
    page.on("request", request => {
      const url = request.url();
      const allowed = isSafeSameOriginResource(url, target.origin) && ["GET", "HEAD"].includes(request.method().toUpperCase());
      if (networkEvents.length < MAX_REQUESTS) networkEvents.push({
        kind: "request", url: allowed ? url.split("?")[0] : "[blocked external or non-web request]",
        method: safeText(request.method(), 12), resourceType: safeText(request.resourceType(), 30),
        outcome: allowed ? "allowed-same-origin" : "blocked"
      });
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
    const initialPage = await capturePageData(page);
    const initialAccessibility = await captureAccessibility(page, evidence, target.href);
    const initialScreenshot = await takeScreenshot(page);
    let latestPage = initialPage;
    let latestAccessibility = initialAccessibility;
    let finalScreenshot = initialScreenshot;

    for (let index = 0; index < requestedActions.length; index++) {
      if (Date.now() - startedAt > 40_000) {
        actionResults.push({ actionId: "action-" + (index + 1), status: "not-executed", reason: "The runtime time budget was reached." });
        break;
      }
      const action = requestedActions[index];
      const actionId = "action-" + (index + 1);
      const before = summarizeState(latestPage);
      const result = await runApprovedAction(page, action, target.origin);
      const stopped = result.status === "stopped";
      if (result.status === "executed") {
        latestPage = await capturePageData(page);
        latestAccessibility = await captureAccessibility(page, evidence, page.url());
        evidence.push(createRuntimeEvidence({ classification: "observed", sourceUrl: page.url(), actionId, detail: "Approved " + action.type + " action produced a captured after-state." }));
      }
      actionResults.push({ actionId, type: action.type, controlId: action.controlId || null, label: safeText(action.label || "", 180), before, after: summarizeState(latestPage), ...result });
      if (stopped) break;
    }

    if (actionResults.some(result => result.status === "executed")) finalScreenshot = await takeScreenshot(page);
    const finalUrl = page.url();
    evidence.unshift(
      createRuntimeEvidence({ classification: "observed", sourceUrl: finalUrl, detail: "Rendered page title: " + (latestPage.title || "(no title)") }),
      createRuntimeEvidence({ classification: "observed", sourceUrl: finalUrl, detail: "Captured rendered DOM, visible controls, headings, links, forms, accessibility nodes and viewport screenshots." })
    );
    return {
      mode: "runtime-browser",
      inspectedAt: new Date().toISOString(),
      durationMs: Date.now() - startedAt,
      target: plan.target,
      finalUrl: finalUrl.split("?")[0],
      viewport,
      navigationStatus: navigation?.status() ?? null,
      initialPage,
      page: latestPage,
      initialAccessibility,
      accessibility: latestAccessibility,
      actions: actionResults,
      console: consoleMessages,
      network: networkEvents,
      initialScreenshot,
      screenshot: finalScreenshot,
      evidence,
      coverage: {
        classification: "observed",
        description: requestedActions.length ? "A real isolated browser captured the initial page and bounded before/after states for explicitly approved actions." : "A real isolated browser rendered the page and captured its initial state.",
        limitations: [
          "Actions are limited to explicitly approved clicks on labelled non-submit buttons/tabs outside forms, hover over captured controls, safe navigation keys and bounded scrolling.",
          "Text entry, Enter/Space activation, form submission, downloads, popups and cross-origin navigation are not supported.",
          "Same-origin JavaScript may still issue side-effecting GET requests; inspect only targets you own or are authorized to test.",
          "For network safety, only same-origin HTTP(S) page resources were allowed; cross-origin scripts, fonts, images and APIs were blocked and may affect visual fidelity.",
          "The browser session is unauthenticated and ephemeral. No existing browser profile, cookies or local files were accessed.",
          "DOM, accessibility, console and network capture are bounded and may be truncated.",
          "Browser Run's Free plan includes 10 minutes of browser use per day; availability ends when the daily quota is exhausted."
        ],
        truncated: { dom: latestPage.domTruncated, accessibility: latestAccessibility.length >= MAX_ACCESSIBILITY_NODES, console: consoleMessages.length >= MAX_CONSOLE, network: networkEvents.length >= MAX_REQUESTS, actions: Array.isArray(input?.actions) && input.actions.length > MAX_ACTIONS_PER_RUN }
      }
    };
  } finally {
    await browser.close().catch(() => {});
  }
}
