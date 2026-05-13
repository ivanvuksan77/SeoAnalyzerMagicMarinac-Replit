import * as cheerio from "cheerio";
import { FetchError, getFetchErrorCode, safeFetchHtml, type SafeFetchOptions } from "./httpClient";

const REALISTIC_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const DEFAULT_VIEWPORT = { width: 1366, height: 768 };

const DEFAULT_BROWSER_TIMEOUT_MS = 25_000;
const MIN_BODY_TEXT_CHARS = 200;

export interface BrowserRenderOptions {
  timeoutMs?: number;
  userAgent?: string;
}

export interface SafeFetchHtmlWithFallbackOptions extends SafeFetchOptions {
  browserTimeoutMs?: number;
  minBodyTextChars?: number;
}

function looksEmpty(html: string, minBodyTextChars: number): boolean {
  if (!html || html.length < 500) return true;
  try {
    const $ = cheerio.load(html);
    const bodyText = $("body").text().replace(/\s+/g, " ").trim();
    if (bodyText.length < minBodyTextChars) return true;
    const meaningful =
      $("h1,h2,h3,p,article,main,section,li").length;
    if (meaningful < 3 && bodyText.length < minBodyTextChars * 2) return true;
    return false;
  } catch {
    return false;
  }
}

/**
 * Render a URL with a headless Chromium browser and return the fully-rendered
 * HTML. Used as a fallback for sites that gate content behind JavaScript or an
 * interactive challenge. Always launches and disposes its own browser instance
 * so callers don't have to manage lifecycle.
 */
export async function renderHtmlWithBrowser(
  url: string,
  opts: BrowserRenderOptions = {},
): Promise<string> {
  const { timeoutMs = DEFAULT_BROWSER_TIMEOUT_MS, userAgent = REALISTIC_UA } = opts;
  // Lazy import so puppeteer's startup cost is only paid when fallback fires.
  const puppeteer = (await import("puppeteer")).default;
  const browser = await puppeteer.launch({
    headless: true,
    args: [
      "--no-sandbox",
      "--disable-setuid-sandbox",
      "--disable-dev-shm-usage",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  try {
    const page = await browser.newPage();
    await page.setUserAgent(userAgent);
    await page.setViewport(DEFAULT_VIEWPORT);
    await page.setExtraHTTPHeaders({
      "Accept-Language": "en-US,en;q=0.9",
    });

    const navTimeout = Math.max(5_000, timeoutMs - 2_000);
    page.setDefaultNavigationTimeout(navTimeout);
    page.setDefaultTimeout(navTimeout);

    const overall = new Promise<string>(async (resolve, reject) => {
      const killer = setTimeout(
        () => reject(new Error(`Headless render timed out after ${timeoutMs}ms`)),
        timeoutMs,
      );
      try {
        await page.goto(url, { waitUntil: "networkidle2", timeout: navTimeout });
        const html = await page.content();
        clearTimeout(killer);
        resolve(html);
      } catch (err) {
        clearTimeout(killer);
        // Fall back to whatever was loaded before the failure.
        try {
          const html = await page.content();
          if (html && html.length > 500) {
            resolve(html);
            return;
          }
        } catch {
          // ignore
        }
        reject(err);
      }
    });

    return await overall;
  } finally {
    try {
      await browser.close();
    } catch {
      // ignore
    }
  }
}

/**
 * Fetch HTML with a fast plain HTTP request first. If the site blocks bots or
 * returns suspiciously empty HTML (likely a JS-rendered SPA), transparently
 * fall back to a headless browser render. The total time is bounded by
 * `browserTimeoutMs` so the common (cheap) case stays fast.
 */
export async function safeFetchHtmlWithFallback(
  url: string,
  opts: SafeFetchHtmlWithFallbackOptions = {},
): Promise<string> {
  const {
    browserTimeoutMs = DEFAULT_BROWSER_TIMEOUT_MS,
    minBodyTextChars = MIN_BODY_TEXT_CHARS,
    ...fetchOpts
  } = opts;

  let html: string | null = null;
  let blocked = false;
  let originalError: unknown = null;
  try {
    html = await safeFetchHtml(url, fetchOpts);
  } catch (err) {
    const code = getFetchErrorCode(err);
    originalError = err;
    if (code === "BOT_BLOCKED") {
      blocked = true;
    } else if (code === "FETCH_TIMEOUT" || code === "FETCH_NETWORK") {
      // For these, the browser is unlikely to do better — rethrow.
      throw err;
    } else {
      // Generic non-OK status (e.g. 404/500) — try the browser as a last
      // resort, but keep the original error so we can surface it accurately
      // if the render also fails.
    }
  }

  const needsRender =
    blocked || originalError != null || (html != null && looksEmpty(html, minBodyTextChars));
  if (!needsRender && html != null) {
    return html;
  }

  try {
    const rendered = await renderHtmlWithBrowser(url, { timeoutMs: browserTimeoutMs });
    if (rendered && rendered.length > 0) return rendered;
  } catch (renderErr) {
    if (html != null) return html; // Fall back to the (possibly thin) plain HTML.
    if (blocked) {
      throw new FetchError(
        "BOT_BLOCKED",
        `This site blocks automated requests and the headless fallback failed: ${(renderErr as Error)?.message || "render error"}`,
      );
    }
    // Preserve the original fetch error (e.g. 404/500) rather than masking
    // it as a bot-block when the browser fallback couldn't recover either.
    if (originalError != null) throw originalError;
    throw renderErr;
  }

  if (html != null) return html;
  if (originalError != null) throw originalError;
  throw new FetchError(
    "BOT_BLOCKED",
    "Unable to retrieve page content via plain fetch or headless browser.",
  );
}
