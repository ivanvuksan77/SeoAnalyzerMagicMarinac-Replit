# Fix 403 errors on bot-protected sites

## What & Why
Comparison and individual scans fail with `Failed to fetch website: 403 Forbidden` on sites behind Cloudflare/WAFs (e.g. decode.agency), even though the site loads fine in a browser. The cause is the analyzers send a minimal request that looks like an obvious bot: SEO uses an outdated Chrome 91 UA with no other headers, and AEO/GEO use `SEOAnalyzerPro/1.0` which WAFs auto-block. A simple `curl` with realistic browser headers returns 200 for the same URL, confirming this is purely a request-fingerprint problem.

## Done looks like
- Comparison and single-site scans for decode.agency (and similar Cloudflare-protected sites) succeed and show real data instead of "Analysis failed: 403 Forbidden".
- All four analyzers (SEO, AEO, GEO, Ads) and the new ad-relevance fetcher use the same realistic browser-like request profile.
- If a site still returns 403/429, the user gets a clearer message ("This site blocks automated requests — try again or check the URL") rather than the raw status.
- Other sites that already worked continue to work — no regressions.

## Out of scope
- Headless browser / Puppeteer rendering for JS-heavy sites (separate, larger effort).
- Bypassing Cloudflare's interactive challenges (turnstile, captcha) — out of ethical scope.
- SSRF hardening (private-IP guards) — tracked separately.

## Steps
1. **Shared fetch helper** — Create one server-side helper that issues HTML fetches with a modern Chrome desktop UA, plus `Accept`, `Accept-Language`, `Accept-Encoding`, `Sec-Fetch-*`, and `Upgrade-Insecure-Requests` headers that match a real browser. Include a configurable timeout and `redirect: "follow"`.
2. **Retry fallback** — On 403/429, retry once with a Googlebot UA (many sites whitelist Googlebot for SEO crawling). If both fail, surface a friendlier error message.
3. **Wire up all analyzers** — Replace the bare `fetch()` calls in the four analyzer entry points and the ad-relevance fetcher to use the new helper. Keep the per-UA mobile/desktop/Googlebot fetches in the Ads cache-fragmentation check intact (those test specific UAs intentionally).
4. **Verify on real sites** — Smoke-test the four scan endpoints and all four `/api/*-compare` endpoints on decode.agency plus 1-2 known-good sites to confirm no regressions.

## Relevant files
- `server/services/seoAnalyzer.ts:36-48`
- `server/services/aeoAnalyzer.ts:25-35`
- `server/services/geoAnalyzer.ts:18-30`
- `server/services/adsAnalyzer.ts:18-20`
- `server/services/adRelevance.ts:108-128`
- `server/routes.ts:174-280`
