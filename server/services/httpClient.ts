const MODERN_DESKTOP_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";
const GOOGLEBOT_UA =
  "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

const COMMON_HEADERS: Record<string, string> = {
  Accept:
    "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.9,hr;q=0.8",
  "Accept-Encoding": "gzip, deflate, br",
  "Cache-Control": "no-cache",
  Pragma: "no-cache",
  "Sec-Fetch-Dest": "document",
  "Sec-Fetch-Mode": "navigate",
  "Sec-Fetch-Site": "none",
  "Sec-Fetch-User": "?1",
  "Upgrade-Insecure-Requests": "1",
};

// Chrome client-hint headers — only valid alongside a real desktop Chrome UA.
// Sending these with the Googlebot UA creates a fingerprint mismatch that some
// WAFs flag, so we keep them in their own profile.
const DESKTOP_CHROME_HINTS: Record<string, string> = {
  "Sec-Ch-Ua": '"Chromium";v="124", "Not-A.Brand";v="99"',
  "Sec-Ch-Ua-Mobile": "?0",
  "Sec-Ch-Ua-Platform": '"Windows"',
};

export type FetchErrorCode = "BOT_BLOCKED" | "FETCH_TIMEOUT" | "FETCH_NETWORK";

export class FetchError extends Error {
  code: FetchErrorCode;
  status?: number;
  constructor(code: FetchErrorCode, message: string, status?: number) {
    super(message);
    this.name = "FetchError";
    this.code = code;
    this.status = status;
  }
}

export function getFetchErrorCode(err: unknown): FetchErrorCode | null {
  if (err instanceof FetchError) return err.code;
  const msg = (err as any)?.message || "";
  if (typeof msg === "string") {
    if (/blocks automated requests/i.test(msg)) return "BOT_BLOCKED";
    if (/took too long to respond/i.test(msg)) return "FETCH_TIMEOUT";
  }
  return null;
}

export interface SafeFetchOptions {
  timeoutMs?: number;
  extraHeaders?: Record<string, string>;
  redirect?: RequestRedirect;
  /** Override the desktop UA used on the first attempt (e.g. mobile UA for mobile UX checks). */
  userAgent?: string;
}

function buildHeaders(
  ua: string,
  profile: "desktop" | "googlebot",
  extra?: Record<string, string>,
): Record<string, string> {
  const hints = profile === "desktop" ? DESKTOP_CHROME_HINTS : {};
  return { "User-Agent": ua, ...COMMON_HEADERS, ...hints, ...(extra || {}) };
}

/**
 * Single-shot fetch with realistic browser headers. Does NOT retry and does
 * NOT throw on non-OK status — use this when the caller needs to inspect
 * 3xx/4xx responses directly (redirect chains, TTFB timing, header probes).
 * Network errors and timeouts still throw.
 */
export async function fetchRaw(url: string, opts: SafeFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 15_000, extraHeaders, redirect = "follow", userAgent = MODERN_DESKTOP_UA } = opts;
  const profile: "desktop" | "googlebot" = userAgent === MODERN_DESKTOP_UA ? "desktop" : "googlebot";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      signal: controller.signal,
      redirect,
      headers: buildHeaders(userAgent, profile, extraHeaders),
    });
  } finally {
    clearTimeout(timer);
  }
}

/**
 * Fetch a URL with realistic browser headers. On 403/429, transparently retries
 * once with a Googlebot UA (many sites whitelist it for SEO crawling). Throws
 * a clear, user-friendly error when both attempts fail.
 */
export async function safeFetch(url: string, opts: SafeFetchOptions = {}): Promise<Response> {
  const { timeoutMs = 30_000, extraHeaders, redirect = "follow", userAgent = MODERN_DESKTOP_UA } = opts;
  const primaryProfile: "desktop" | "googlebot" = userAgent === MODERN_DESKTOP_UA ? "desktop" : "googlebot";

  const tryWith = async (ua: string, profile: "desktop" | "googlebot"): Promise<Response> => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, {
        signal: controller.signal,
        redirect,
        headers: buildHeaders(ua, profile, extraHeaders),
      });
    } finally {
      clearTimeout(timer);
    }
  };

  let response: Response;
  try {
    response = await tryWith(userAgent, primaryProfile);
  } catch (err: any) {
    if (err?.name === "AbortError") {
      throw new FetchError(
        "FETCH_TIMEOUT",
        `The site took too long to respond (>${Math.round(timeoutMs / 1000)}s). Try again or check the URL.`,
      );
    }
    throw new FetchError(
      "FETCH_NETWORK",
      `Could not reach the site: ${err?.message || "network error"}`,
    );
  }

  if (response.status === 403 || response.status === 429) {
    const blockedStatus = response.status;
    try {
      const retry = await tryWith(GOOGLEBOT_UA, "googlebot");
      if (retry.ok) return retry;
      response = retry;
    } catch {
      // fall through; we'll throw based on the original blocked status below
    }
    if (response.status === 403 || response.status === 429) {
      throw new FetchError(
        "BOT_BLOCKED",
        `This site blocks automated requests (HTTP ${blockedStatus}). It may be behind a Cloudflare/WAF challenge. Try a different page on the same domain or check the URL.`,
        blockedStatus,
      );
    }
    // Retry returned a different non-OK status — fall through to the generic error below.
  }

  if (!response.ok) {
    throw new Error(`Failed to fetch website: ${response.status} ${response.statusText}`);
  }

  return response;
}

/**
 * Convenience wrapper that fetches and returns the response body as text.
 */
export async function safeFetchHtml(url: string, opts: SafeFetchOptions = {}): Promise<string> {
  const response = await safeFetch(url, opts);
  return response.text();
}
