import * as cheerio from "cheerio";
import { extractMainContent } from "./contentExtractor";
import { fetchCruxFieldData } from "./cruxClient";
import { safeFetch, fetchRaw } from "./httpClient";
import {
  InsertAdsAnalysis,
  AdsCheck,
  AdsRecommendation,
  AdsRating,
  TtfbMeasurement,
  CdnDetection,
  CacheAnalysis,
  RedirectChain,
  HostingAnalysis,
  MobileUxAnalysis,
  AdsAnalysisResults,
  CruxFieldData,
} from "@shared/schema";

const MOBILE_UA = "Mozilla/5.0 (Linux; Android 13; Pixel 7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36";
const DESKTOP_UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const GOOGLEBOT_UA = "Mozilla/5.0 (Linux; Android 6.0.1; Nexus 5X Build/MMB29P) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Mobile Safari/537.36 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)";

class AdsLandingPageAnalyzer {
  async analyzeLandingPage(url: string): Promise<InsertAdsAnalysis> {
    const checks: AdsCheck[] = [];

    const [ttfb, cdn, cache, redirects, hosting, mobileUx, fieldData] = await Promise.all([
      this.measureTtfb(url),
      this.detectCdn(url),
      this.analyzeCacheFragmentation(url),
      this.detectRedirectChain(url),
      this.analyzeHosting(url),
      this.analyzeMobileUx(url),
      fetchCruxFieldData(url),
    ]);

    this.addTtfbChecks(checks, ttfb);
    this.addCdnChecks(checks, cdn);
    this.addCacheChecks(checks, cache);
    this.addRedirectChecks(checks, redirects);
    this.addHostingChecks(checks, hosting);
    this.addMobileUxChecks(checks, mobileUx);
    this.addFieldDataChecks(checks, fieldData);

    const score = this.calculateScore(checks);
    const rating = this.deriveRating(score);
    const qualityScoreImpact = this.getQualityScoreImpact(rating, score, fieldData);
    const cpcImpact = this.getCpcImpact(rating);
    const recommendations = this.generateRecommendations(checks, ttfb, cdn, cache, redirects, hosting, mobileUx);

    const results: AdsAnalysisResults = {
      rating,
      score,
      ttfb,
      cdn,
      cache,
      redirects,
      hosting,
      mobileUx,
      checks,
      qualityScoreImpact,
      cpcImpact,
      fieldData,
    };

    return {
      url,
      rating,
      score,
      results,
      recommendations,
    };
  }

  private async measureTtfb(url: string): Promise<TtfbMeasurement> {
    const measureOne = async (targetUrl: string): Promise<number> => {
      const times: number[] = [];
      for (let i = 0; i < 3; i++) {
        const start = performance.now();
        try {
          await fetchRaw(targetUrl, { userAgent: MOBILE_UA, timeoutMs: 15000 });
        } catch {}
        const elapsed = performance.now() - start;
        times.push(elapsed);
      }
      times.sort((a, b) => a - b);
      return Math.round(times[Math.floor(times.length / 2)]);
    };

    const cleanTtfb = await measureOne(url);

    const adsUrl = new URL(url);
    adsUrl.searchParams.set("gclid", "test123abc");
    adsUrl.searchParams.set("utm_source", "google");
    adsUrl.searchParams.set("utm_medium", "cpc");
    adsUrl.searchParams.set("utm_campaign", "test");
    const adsTtfb = await measureOne(adsUrl.toString());

    const delta = adsTtfb - cleanTtfb;
    const penalized = delta > 200 || adsTtfb > 800;

    return { cleanUrl: cleanTtfb, withAdsParams: adsTtfb, delta, penalized };
  }

  private async detectCdn(url: string): Promise<CdnDetection> {
    try {
      const response = await safeFetch(url, { userAgent: MOBILE_UA, timeoutMs: 10000 });

      const relevantHeaders: Record<string, string> = {};
      const cdnIndicators = [
        "cf-cache-status", "cf-ray", "x-cache", "x-cache-hits",
        "age", "via", "x-amz-cf-pop", "x-amz-cf-id",
        "x-cdn", "x-served-by", "x-fastly-request-id",
        "x-vercel-id", "x-vercel-cache", "server",
        "x-powered-by", "x-edge-location", "x-cache-status",
        "x-akamai-transformed", "x-netlify-cache",
      ];

      for (const header of cdnIndicators) {
        const value = response.headers.get(header);
        if (value) relevantHeaders[header] = value;
      }

      let provider: string | null = null;
      let detected = false;
      let edgeCaching = false;

      if (relevantHeaders["cf-ray"] || relevantHeaders["cf-cache-status"]) {
        provider = "Cloudflare";
        detected = true;
        edgeCaching = relevantHeaders["cf-cache-status"] === "HIT" || relevantHeaders["cf-cache-status"] === "DYNAMIC";
      } else if (relevantHeaders["x-amz-cf-pop"] || relevantHeaders["x-amz-cf-id"]) {
        provider = "AWS CloudFront";
        detected = true;
        edgeCaching = relevantHeaders["x-cache"]?.includes("Hit") || false;
      } else if (relevantHeaders["x-fastly-request-id"]) {
        provider = "Fastly";
        detected = true;
        edgeCaching = relevantHeaders["x-cache"]?.includes("HIT") || false;
      } else if (relevantHeaders["x-vercel-id"]) {
        provider = "Vercel Edge";
        detected = true;
        edgeCaching = relevantHeaders["x-vercel-cache"] === "HIT";
      } else if (relevantHeaders["x-netlify-cache"]) {
        provider = "Netlify CDN";
        detected = true;
        edgeCaching = true;
      } else if (relevantHeaders["x-akamai-transformed"]) {
        provider = "Akamai";
        detected = true;
        edgeCaching = true;
      } else if (relevantHeaders["x-cache"]?.includes("HIT") || relevantHeaders["x-cache-status"]?.includes("HIT")) {
        provider = "Unknown CDN";
        detected = true;
        edgeCaching = true;
      } else if (relevantHeaders["via"]?.includes("varnish") || relevantHeaders["via"]?.includes("cdn")) {
        provider = "Varnish/CDN proxy";
        detected = true;
      }

      const ageHeader = relevantHeaders["age"];
      if (ageHeader && parseInt(ageHeader) > 0) {
        edgeCaching = true;
      }

      return { detected, provider, edgeCaching, headers: relevantHeaders };
    } catch {
      return { detected: false, provider: null, edgeCaching: false, headers: {} };
    }
  }

  private async analyzeCacheFragmentation(url: string): Promise<CacheAnalysis> {
    const details: string[] = [];
    let variesByUserAgent = false;
    let queryStringBusting = false;

    try {
      const [mobileRes, desktopRes, botRes] = await Promise.all([
        fetch(url, { headers: { "User-Agent": MOBILE_UA }, redirect: "follow", signal: AbortSignal.timeout(10000) }),
        fetch(url, { headers: { "User-Agent": DESKTOP_UA }, redirect: "follow", signal: AbortSignal.timeout(10000) }),
        fetch(url, { headers: { "User-Agent": GOOGLEBOT_UA }, redirect: "follow", signal: AbortSignal.timeout(10000) }),
      ]);

      const mobileVary = mobileRes.headers.get("vary") || "";
      const desktopVary = desktopRes.headers.get("vary") || "";

      if (mobileVary.toLowerCase().includes("user-agent") || desktopVary.toLowerCase().includes("user-agent")) {
        variesByUserAgent = true;
        details.push("Cache Vary header includes User-Agent — creates separate cache entries per browser, fragmenting CDN cache for Ads traffic");
      }

      const mobileCacheControl = mobileRes.headers.get("cache-control") || "";
      const desktopCacheControl = desktopRes.headers.get("cache-control") || "";
      if (mobileCacheControl !== desktopCacheControl) {
        details.push(`Different cache policies for mobile vs desktop: mobile="${mobileCacheControl}" desktop="${desktopCacheControl}"`);
      }

      const cleanCache = mobileRes.headers.get("x-cache") || mobileRes.headers.get("cf-cache-status") || "";
      const adsUrl = new URL(url);
      adsUrl.searchParams.set("gclid", "test");
      const adsRes = await fetch(adsUrl.toString(), { headers: { "User-Agent": MOBILE_UA }, redirect: "follow", signal: AbortSignal.timeout(10000) });
      const adsCache = adsRes.headers.get("x-cache") || adsRes.headers.get("cf-cache-status") || "";

      if (cleanCache.includes("HIT") && !adsCache.includes("HIT")) {
        queryStringBusting = true;
        details.push("Adding gclid/utm parameters causes cache MISS — Ads traffic always hits origin server");
      }

      const adsCacheControl = adsRes.headers.get("cache-control") || "";
      if (adsCacheControl.includes("no-cache") || adsCacheControl.includes("no-store") || adsCacheControl.includes("private")) {
        queryStringBusting = true;
        details.push(`Ads URL returns restrictive cache headers: "${adsCacheControl}"`);
      }

      if (details.length === 0) {
        details.push("No cache fragmentation issues detected");
      }
    } catch {
      details.push("Unable to fully test cache fragmentation");
    }

    return {
      variesByUserAgent,
      queryStringBusting,
      fragmented: variesByUserAgent || queryStringBusting,
      details,
    };
  }

  private async detectRedirectChain(url: string): Promise<RedirectChain> {
    const chain: string[] = [url];
    let currentUrl = url;
    let totalLatency = 0;
    const maxHops = 10;

    for (let i = 0; i < maxHops; i++) {
      try {
        const start = performance.now();
        const response = await fetchRaw(currentUrl, {
          userAgent: MOBILE_UA,
          redirect: "manual",
          timeoutMs: 10000,
        });
        totalLatency += performance.now() - start;

        if (response.status >= 300 && response.status < 400) {
          const location = response.headers.get("location");
          if (!location) break;
          const nextUrl = location.startsWith("http") ? location : new URL(location, currentUrl).toString();
          chain.push(nextUrl);
          currentUrl = nextUrl;
        } else {
          break;
        }
      } catch {
        break;
      }
    }

    return {
      hops: chain.length - 1,
      chain,
      totalLatency: Math.round(totalLatency),
      hasRedirects: chain.length > 1,
    };
  }

  private async analyzeHosting(url: string): Promise<HostingAnalysis> {
    const signals: string[] = [];
    let serverSignature: string | null = null;

    try {
      const response = await safeFetch(url, { userAgent: MOBILE_UA, timeoutMs: 10000 });

      const server = response.headers.get("server") || "";
      const xPoweredBy = response.headers.get("x-powered-by") || "";
      const cacheControl = response.headers.get("cache-control") || "";
      serverSignature = server || null;

      if (server.toLowerCase().includes("apache") && !response.headers.get("cf-ray")) {
        signals.push("Apache server without CDN — common on shared hosting");
      }
      if (server.toLowerCase().includes("litespeed")) {
        signals.push("LiteSpeed server — often indicates shared hosting environment");
      }
      if (xPoweredBy.toLowerCase().includes("cpanel") || xPoweredBy.toLowerCase().includes("plesk")) {
        signals.push(`Control panel detected (${xPoweredBy}) — shared hosting indicator`);
      }
      if (xPoweredBy.toLowerCase().includes("php")) {
        const phpVersion = xPoweredBy.match(/PHP\/([\d.]+)/i);
        if (phpVersion && parseFloat(phpVersion[1]) < 8.0) {
          signals.push(`Outdated PHP version (${phpVersion[1]}) — impacts response time`);
        }
      }

      if (!cacheControl || cacheControl === "no-cache" || cacheControl === "no-store") {
        signals.push("No server-side caching headers — every request hits the application");
      }

      if (server.toLowerCase().includes("nginx") && !response.headers.get("x-cache")) {
        signals.push("Nginx without caching layer — likely origin-only setup");
      }
    } catch {
      signals.push("Unable to determine hosting characteristics");
    }

    const isLikelyShared = signals.length >= 2;
    const coldCacheRisk = isLikelyShared || signals.some(s =>
      s.includes("without CDN") || s.includes("No server-side caching")
    );

    return { sharedHostingSignals: signals, isLikelyShared, serverSignature, coldCacheRisk };
  }

  private async analyzeMobileUx(url: string): Promise<MobileUxAnalysis> {
    let html = "";
    try {
      const response = await safeFetch(url, { userAgent: MOBILE_UA, timeoutMs: 15000 });
      html = await response.text();
    } catch {
      return {
        keywordInAboveFold: false,
        ctaVisibleAboveFold: false,
        layoutShiftRisks: ["Unable to fetch page content"],
        aboveFoldContent: "",
        ctaElements: [],
      };
    }

    const $ = cheerio.load(html);

    const title = $("title").text().toLowerCase();
    const metaDesc = $('meta[name="description"]').attr("content")?.toLowerCase() || "";
    const h1Text = $("h1").first().text().toLowerCase();
    const titleWords = title.split(/\s+/).filter(w => w.length > 3);

    const bodyText = extractMainContent($);
    const aboveFoldContent = bodyText.substring(0, 800).toLowerCase();

    let keywordInAboveFold = false;
    for (const word of titleWords) {
      if (aboveFoldContent.includes(word)) {
        keywordInAboveFold = true;
        break;
      }
    }
    if (h1Text && aboveFoldContent.includes(h1Text.substring(0, 20))) {
      keywordInAboveFold = true;
    }

    const ctaElements: string[] = [];

    const isCta = (el: any): boolean => {
      const tag = $(el).prop("tagName")?.toLowerCase() || "";
      const text = $(el).text().trim().replace(/\s+/g, ' ');
      const cls = ($(el).attr("class") || "").toLowerCase();
      const href = $(el).attr("href") || "";
      const role = $(el).attr("role") || "";
      const type = $(el).attr("type") || "";

      if (tag === "button" && text.length > 0 && text.length < 80) return true;
      if (tag === "input" && (type === "submit" || type === "button")) return true;
      if (role === "button" && text.length > 0) return true;

      const btnClassPatterns = /\bbtn\b(?!-hover)|\bbutton\b(?![-_])|wp-block-button|wp-element-button|btn-primary|btn-cta|btn-action|hero-btn|action-btn|\bcta\b|call.?to.?action|submit-btn/i;
      const isInNav = $(el).closest("nav, header, .nav, .menu, .navigation, .breadcrumb, .footer, footer, .sidebar").length > 0;

      if (!isInNav && btnClassPatterns.test(cls) && text.length > 0 && text.length < 80) return true;

      if (tag === "a" && href.startsWith("#") && href.length > 1 && text.length > 0 && text.length < 80) {
        if (!isInNav) return true;
      }

      return false;
    };

    $("a, button, input[type='submit'], input[type='button'], [role='button']").each((_, el) => {
      if (isCta(el)) {
        const text = ($(el).text().trim().replace(/\s+/g, ' ') || $(el).attr("value") || "").substring(0, 60);
        if (text.length > 0) ctaElements.push(text);
      }
    });

    const firstCta = $("a, button, input[type='submit'], input[type='button'], [role='button']").filter((_, el) => isCta(el)).first();

    let ctaVisibleAboveFold = false;
    if (firstCta.length) {
      const parents = firstCta.parents();
      let isInUpperPage = false;
      parents.each((_, p) => {
        const tag = $(p).prop("tagName")?.toLowerCase() || "";
        const cls = $(p).attr("class")?.toLowerCase() || "";
        const id = $(p).attr("id")?.toLowerCase() || "";
        if (tag === "header" || tag === "main" || tag === "section") isInUpperPage = true;
        if (cls.includes("hero") || cls.includes("banner") || cls.includes("above-fold") || cls.includes("header") || cls.includes("jumbotron") || cls.includes("intro") || cls.includes("landing") || cls.includes("wp-block-cover") || cls.includes("wp-block-group")) isInUpperPage = true;
        if (id.includes("hero") || id.includes("banner") || id.includes("header") || id.includes("intro")) isInUpperPage = true;
      });
      ctaVisibleAboveFold = isInUpperPage;
    }
    if (ctaElements.length > 0 && !ctaVisibleAboveFold) {
      const firstCtaText = ctaElements[0].toLowerCase();
      const firstCtaIndex = bodyText.toLowerCase().indexOf(firstCtaText);
      if (firstCtaIndex !== -1 && firstCtaIndex < 2000) {
        ctaVisibleAboveFold = true;
      }
    }

    const layoutShiftRisks: string[] = [];
    const imagesWithoutDimensions = $("img").filter((_, el) => {
      return !$(el).attr("width") && !$(el).attr("height") && !$(el).attr("style")?.includes("width");
    }).length;
    if (imagesWithoutDimensions > 0) {
      layoutShiftRisks.push(`${imagesWithoutDimensions} images without explicit width/height — causes layout shifts on load`);
    }

    const iframesWithoutDimensions = $("iframe").filter((_, el) => {
      return !$(el).attr("width") && !$(el).attr("height");
    }).length;
    if (iframesWithoutDimensions > 0) {
      layoutShiftRisks.push(`${iframesWithoutDimensions} iframes without dimensions — causes layout shifts`);
    }

    const lazyImages = $("img[loading='lazy']").length;
    const totalAboveFoldImages = $("header img, .hero img, .banner img, [class*='hero'] img").length;
    if (totalAboveFoldImages > 0 && lazyImages > 0) {
      const lazyAboveFold = $("header img[loading='lazy'], .hero img[loading='lazy'], .banner img[loading='lazy']").length;
      if (lazyAboveFold > 0) {
        layoutShiftRisks.push(`${lazyAboveFold} above-fold images with lazy loading — delays LCP and causes visual shifts`);
      }
    }

    const dynamicAdSlots = $("[class*='ad-'], [id*='ad-'], [class*='adslot'], [data-ad]").length;
    if (dynamicAdSlots > 0) {
      layoutShiftRisks.push(`${dynamicAdSlots} dynamic ad slots detected — common source of layout shifts`);
    }

    const fontsWithoutPreload = $("link[rel='stylesheet'][href*='fonts']").length;
    if (fontsWithoutPreload > 0) {
      const hasPreload = $("link[rel='preload'][as='font']").length > 0 || $("link[rel='preload'][href*='font']").length > 0;
      if (!hasPreload) {
        layoutShiftRisks.push("Custom fonts loaded without preload — causes FOUT/FOIT layout shifts");
      }
    }

    if (layoutShiftRisks.length === 0) {
      layoutShiftRisks.push("No major layout shift risks detected");
    }

    return {
      keywordInAboveFold,
      ctaVisibleAboveFold,
      layoutShiftRisks,
      aboveFoldContent: aboveFoldContent.substring(0, 300),
      ctaElements: ctaElements.slice(0, 5),
    };
  }

  private addTtfbChecks(checks: AdsCheck[], ttfb: TtfbMeasurement): void {
    checks.push({
      name: "TTFB — Clean URL",
      status: ttfb.cleanUrl < 400 ? "PASS" : ttfb.cleanUrl < 800 ? "WARNING" : "FAIL",
      details: `${ttfb.cleanUrl}ms response time for clean URL`,
      category: "performance",
      impact: ttfb.cleanUrl > 800
        ? "Google Ads bot sees slow initial response — directly lowers Landing Page Experience rating"
        : ttfb.cleanUrl > 400
          ? "Borderline response time — may affect rating under load"
          : "Fast server response — positive signal for Ads quality",
      recommendation: ttfb.cleanUrl > 400
        ? "Add edge caching or upgrade to a faster hosting provider to reduce TTFB below 400ms"
        : "No action needed",
      fixType: "infrastructure",
      technicalFix: ttfb.cleanUrl > 400 ? [
        "STEP 1 — Enable server-side caching:",
        "• Nginx: Add to your server block:",
        '  proxy_cache_path /tmp/nginx levels=1:2 keys_zone=page_cache:10m max_size=100m inactive=60m;',
        '  proxy_cache_valid 200 30m;',
        "• Apache: Enable mod_cache in .htaccess:",
        '  <IfModule mod_expires.c>',
        '    ExpiresActive On',
        '    ExpiresByType text/html "access plus 5 minutes"',
        '  </IfModule>',
        "",
        "STEP 2 — Add a CDN layer (Cloudflare example):",
        "• Sign up at cloudflare.com, add your domain, update nameservers",
        "• Go to Caching > Configuration > set Browser Cache TTL to 4 hours",
        "• Under Rules > Page Rules, add a rule:",
        "  URL: yourdomain.com/landing-page*",
        "  Setting: Cache Level = Cache Everything, Edge Cache TTL = 2 hours",
        "",
        "STEP 3 — Optimize server response:",
        "• WordPress: Install WP Super Cache or W3 Total Cache, enable page caching",
        "• PHP: Enable OPcache in php.ini: opcache.enable=1, opcache.memory_consumption=128",
        "• Node.js: Add response caching middleware or use a reverse proxy (Nginx) in front",
        "",
        `GOAL: Reduce TTFB from ${ttfb.cleanUrl}ms to under 400ms (ideally under 200ms)`
      ].join("\n") : undefined,
    });

    checks.push({
      name: "TTFB — With Ads Parameters",
      status: ttfb.withAdsParams < 500 ? "PASS" : ttfb.withAdsParams < 1000 ? "WARNING" : "FAIL",
      details: `${ttfb.withAdsParams}ms response time with gclid & utm parameters (${ttfb.delta > 0 ? "+" : ""}${ttfb.delta}ms vs clean URL)`,
      category: "performance",
      impact: ttfb.penalized
        ? "Ads traffic gets slower response than organic — Google directly measures this for Quality Score"
        : "Ads traffic performs similarly to clean requests — no penalty detected",
      recommendation: ttfb.penalized
        ? "Configure CDN to ignore gclid/utm query parameters for cache key computation. Ensure server-side tracking doesn't add processing overhead"
        : "No action needed",
      fixType: "infrastructure",
      technicalFix: ttfb.penalized ? [
        "STEP 1 — Strip tracking params from cache key:",
        "• Cloudflare: Go to Rules > Page Rules:",
        "  URL: *yourdomain.com/landing-page*",
        "  Setting: Cache Level = Cache Everything (Cloudflare ignores query strings by default for cached content)",
        "  Also: Caching > Configuration > Enable 'Query String Sort' to normalize URL ordering",
        "• AWS CloudFront: In your distribution's Cache Behavior:",
        '  Query String Forwarding: Forward all, cache based on whitelist',
        "  Whitelist only params your app needs (exclude gclid, utm_*)",
        "• Nginx (as reverse proxy):",
        '  set $clean_uri $uri;',
        '  if ($args ~* "gclid|utm_") {',
        '    set $clean_uri $uri;',
        '  }',
        '  proxy_cache_key "$scheme$host$clean_uri";',
        "",
        "STEP 2 — Move tracking to client-side:",
        "• Instead of server-side gclid processing, capture it with JavaScript:",
        '  const params = new URLSearchParams(window.location.search);',
        '  const gclid = params.get("gclid");',
        '  if (gclid) { document.cookie = "gclid=" + gclid + ";max-age=2592000;path=/"; }',
        "• This lets the server return the same cached response regardless of URL parameters",
        "",
        "STEP 3 — Verify the fix:",
        '  curl -w "TTFB: %{time_starttransfer}s\\n" -o /dev/null -s "https://yoursite.com/page"',
        '  curl -w "TTFB: %{time_starttransfer}s\\n" -o /dev/null -s "https://yoursite.com/page?gclid=test"',
        "• Both should show similar TTFB values",
        "",
        `GOAL: Eliminate the ${ttfb.delta}ms gap between clean and ads-parameter URLs`
      ].join("\n") : undefined,
    });
  }

  private addCdnChecks(checks: AdsCheck[], cdn: CdnDetection): void {
    let technicalFix: string | undefined;
    if (!cdn.detected) {
      technicalFix = [
        "OPTION A — Cloudflare (free tier, easiest setup):",
        "1. Create account at dash.cloudflare.com",
        "2. Add your domain and follow DNS setup (update nameservers at your registrar)",
        "3. Once active, go to Caching > Configuration:",
        "   • Browser Cache TTL: 4 hours",
        "   • Always Online: ON",
        "4. Go to Rules > Page Rules, create rule:",
        "   URL: *yourdomain.com/landing-page*",
        "   Cache Level: Cache Everything",
        "   Edge Cache TTL: 2 hours",
        "5. Enable Auto Minify (Speed > Optimization) for JS, CSS, HTML",
        "",
        "OPTION B — AWS CloudFront:",
        "1. Create a CloudFront distribution in AWS Console",
        "2. Set Origin Domain to your server's domain/IP",
        "3. Cache Behavior settings:",
        "   • Viewer Protocol Policy: Redirect HTTP to HTTPS",
        "   • Cache Policy: CachingOptimized",
        "   • Origin Request Policy: AllViewer (forwards headers to origin)",
        "4. Set your DNS CNAME to point to the CloudFront distribution URL",
        "",
        "OPTION C — Set Cache-Control headers on your server:",
        "• Nginx: add_header Cache-Control 'public, max-age=3600, s-maxage=7200';",
        "• Apache: Header set Cache-Control 'public, max-age=3600'",
        "• Express.js: res.set('Cache-Control', 'public, max-age=3600, s-maxage=7200');",
        "",
        "VERIFY: curl -I https://yoursite.com/landing-page | grep -i 'cf-ray\\|x-cache\\|cache-control'"
      ].join("\n");
    } else if (!cdn.edgeCaching) {
      technicalFix = [
        `Your CDN (${cdn.provider}) is active but not caching HTML content at the edge.`,
        "",
        "STEP 1 — Set Cache-Control headers on your origin server:",
        "• Your server must send headers that allow caching:",
        '  Cache-Control: public, max-age=300, s-maxage=3600',
        '  (s-maxage tells the CDN to cache for 1 hour, max-age tells browsers to cache for 5 min)',
        "• IMPORTANT: Remove any 'Cache-Control: private' or 'no-store' headers",
        "",
        "STEP 2 — Configure CDN cache rules:",
        cdn.provider === "Cloudflare" ? [
          "• Cloudflare Dashboard > Rules > Page Rules:",
          "  URL: *yourdomain.com/landing-page*",
          "  Cache Level: Cache Everything",
          "  Edge Cache TTL: 2 hours",
          "• Also check: Caching > Configuration > Caching Level should be 'Standard'"
        ].join("\n") : cdn.provider === "AWS CloudFront" ? [
          "• CloudFront Console > Behaviors tab > Edit:",
          "  Cache Policy: CachingOptimized (or custom with TTL 3600s)",
          "  Ensure 'Origin Cache Headers' is selected to honor your Cache-Control headers"
        ].join("\n") : [
          `• Check your ${cdn.provider} dashboard for cache rules`,
          "• Ensure HTML content type is included in cacheable content types",
          "• Set a minimum TTL of 300 seconds for landing page URLs"
        ].join("\n"),
        "",
        "STEP 3 — Purge and verify:",
        "• Purge the CDN cache after making changes",
        "• Test: curl -I https://yoursite.com/landing-page",
        '  Look for: x-cache: HIT or cf-cache-status: HIT',
        "• Request twice — first will be MISS, second should be HIT"
      ].join("\n");
    }

    checks.push({
      name: "CDN & Edge Caching",
      status: cdn.detected && cdn.edgeCaching ? "PASS" : cdn.detected ? "WARNING" : "FAIL",
      details: cdn.detected
        ? `${cdn.provider} detected${cdn.edgeCaching ? " with edge caching active" : " but edge caching not active"}`
        : "No CDN detected — page served directly from origin server",
      category: "delivery",
      impact: !cdn.detected
        ? "Without CDN, every Ads click hits your origin server. Google's bot crawls from multiple locations — slow responses from distant locations lower your rating"
        : !cdn.edgeCaching
          ? "CDN present but not caching content — Ads traffic still hits origin for every request"
          : "Edge caching active — Ads traffic served quickly from nearest edge node",
      recommendation: !cdn.detected
        ? "Deploy a CDN (Cloudflare, CloudFront, or Fastly). Configure edge caching for your landing page with at least 1-hour TTL"
        : !cdn.edgeCaching
          ? "Configure your CDN to cache landing page HTML at the edge. Set appropriate Cache-Control headers (e.g., public, max-age=3600)"
          : "No action needed",
      fixType: "infrastructure",
      technicalFix,
    });
  }

  private addCacheChecks(checks: AdsCheck[], cache: CacheAnalysis): void {
    checks.push({
      name: "Cache Fragmentation — User-Agent Vary",
      status: cache.variesByUserAgent ? "WARNING" : "PASS",
      details: cache.variesByUserAgent
        ? "Cache varies by User-Agent header — creates separate cache entries for each browser type"
        : "Cache does not vary by User-Agent — good for Ads traffic consistency",
      category: "caching",
      impact: cache.variesByUserAgent
        ? "Google Ads bot uses a unique User-Agent — it always gets a cache MISS, hitting your slow origin server"
        : "Consistent cache behavior across user agents",
      recommendation: cache.variesByUserAgent
        ? "Remove User-Agent from Vary header. Use Vary: Accept-Encoding only. Handle device detection at the application level, not the cache level"
        : "No action needed",
      fixType: "infrastructure",
      technicalFix: cache.variesByUserAgent ? [
        "WHY THIS HAPPENS: Your server or framework sends 'Vary: User-Agent' in response headers.",
        "This tells CDNs to create a separate cached copy for every unique User-Agent string.",
        "Google's Ads bot has a unique User-Agent, so it always gets a cache MISS.",
        "",
        "FIX — Remove User-Agent from Vary header:",
        "• Nginx: In your server config, set:",
        "  proxy_hide_header Vary;",
        "  add_header Vary 'Accept-Encoding';",
        "",
        "• Apache .htaccess:",
        "  Header unset Vary",
        '  Header append Vary "Accept-Encoding"',
        "",
        "• WordPress: Some plugins add Vary: User-Agent. Check:",
        "  - W3 Total Cache > Browser Cache > disable 'Set Vary header'",
        "  - WP Rocket: Add to wp-config.php: define('WP_CACHE_VARY_USER_AGENT', false);",
        "",
        "• If you need mobile vs desktop content: Use client-side JavaScript",
        "  to detect device and adjust layout, instead of server-side User-Agent detection.",
        "  Or use CDN-specific device detection headers (e.g., Cloudflare CF-Device-Type)",
        "  which only creates 3 cache variants (mobile/tablet/desktop) instead of thousands.",
        "",
        "VERIFY: curl -I https://yoursite.com/page | grep -i vary",
        "Expected: Vary: Accept-Encoding (NOT User-Agent)"
      ].join("\n") : undefined,
    });

    checks.push({
      name: "Cache Fragmentation — Query String Busting",
      status: cache.queryStringBusting ? "FAIL" : "PASS",
      details: cache.queryStringBusting
        ? "Adding gclid/utm parameters causes cache misses — every Ads click bypasses cache"
        : "Query parameters do not fragment cache — Ads traffic can benefit from cached responses",
      category: "caching",
      impact: cache.queryStringBusting
        ? "Every Google Ads click generates a unique URL with gclid parameter. If your cache treats each as unique, Ads traffic NEVER gets a cached response"
        : "Cache properly handles Ads tracking parameters",
      recommendation: cache.queryStringBusting
        ? "Configure CDN to exclude gclid, utm_source, utm_medium, utm_campaign, utm_content, utm_term from cache key. In Cloudflare: Page Rules > Cache Level: Ignore Query String"
        : "No action needed",
      fixType: "infrastructure",
      technicalFix: cache.queryStringBusting ? [
        "WHY THIS HAPPENS: Your CDN/cache treats each unique URL (including query string) as a different page.",
        "Google Ads appends gclid=<unique_id> to every click, creating a unique URL each time.",
        "Result: Your cache hit rate for Ads traffic is effectively 0%.",
        "",
        "FIX OPTION 1 — Cloudflare:",
        "• Dashboard > Rules > Page Rules:",
        "  URL: *yourdomain.com/landing-page*",
        "  Cache Level: Ignore Query String",
        "  (This caches one copy and serves it regardless of query params)",
        "• Alternatively, use Cache Rules (newer):",
        "  When: hostname = 'yourdomain.com' and URI path starts with '/landing-page'",
        "  Cache eligibility: Eligible for cache",
        "  Cache key: Ignore query string",
        "",
        "FIX OPTION 2 — AWS CloudFront:",
        "• Edit your Cache Behavior:",
        "  Cache key and origin requests > Cache policy > Create custom policy:",
        "  Query strings: None (or whitelist only the params your app needs)",
        "",
        "FIX OPTION 3 — Nginx reverse proxy:",
        '  proxy_cache_key "$scheme$host$uri";',
        "  (This excludes query string from cache key entirely)",
        "  If you need some query params, use:",
        '  set $cache_key "$scheme$host$uri";',
        '  if ($args !~* "gclid|utm_source|utm_medium|utm_campaign|utm_content|utm_term|fbclid") {',
        '    set $cache_key "$scheme$host$uri?$args";',
        "  }",
        "",
        "FIX OPTION 4 — Varnish:",
        "  sub vcl_recv {",
        '    set req.url = regsuball(req.url, "(\\?|&)(gclid|utm_[a-z]+|fbclid)=[^&]*", "");',
        '    set req.url = regsub(req.url, "\\?$", "");',
        "  }",
        "",
        "VERIFY: Run these two commands — both should return cache HIT on second request:",
        '  curl -I "https://yoursite.com/page"',
        '  curl -I "https://yoursite.com/page?gclid=test123"'
      ].join("\n") : undefined,
    });
  }

  private addRedirectChecks(checks: AdsCheck[], redirects: RedirectChain): void {
    checks.push({
      name: "Redirect Chain",
      status: redirects.hops === 0 ? "PASS" : redirects.hops === 1 ? "WARNING" : "FAIL",
      details: redirects.hops === 0
        ? "No redirects — page served directly"
        : `${redirects.hops} redirect${redirects.hops > 1 ? "s" : ""} detected (${redirects.totalLatency}ms total latency): ${redirects.chain.join(" → ")}`,
      category: "delivery",
      impact: redirects.hops > 1
        ? `Each redirect adds ${Math.round(redirects.totalLatency / redirects.hops)}ms+ latency. Multi-hop chains are a strong negative signal for Landing Page Experience`
        : redirects.hops === 1
          ? "Single redirect adds unnecessary latency — Google measures time from click to visible content"
          : "Direct delivery — fastest possible path from Ads click to content",
      recommendation: redirects.hops > 0
        ? `Update your Google Ads destination URL to the final URL: ${redirects.chain[redirects.chain.length - 1]}. Eliminate intermediate redirects`
        : "No action needed",
      fixType: redirects.hops > 0 ? "page-level" : "infrastructure",
      technicalFix: redirects.hops > 0 ? [
        `CURRENT REDIRECT CHAIN (${redirects.hops} hop${redirects.hops > 1 ? "s" : ""}, ${redirects.totalLatency}ms):`,
        ...redirects.chain.map((url, i) => `  ${i === 0 ? "START" : `HOP ${i}`}: ${url}`),
        "",
        "STEP 1 — Update your Google Ads campaign:",
        `• In Google Ads, go to your ad/extension > Edit`,
        `• Change Final URL to: ${redirects.chain[redirects.chain.length - 1]}`,
        "• This eliminates ALL redirect hops for Ads traffic immediately",
        "",
        "STEP 2 — Fix common redirect causes on your server:",
        redirects.chain.some(u => u.startsWith("http://")) ? [
          "• HTTP→HTTPS redirect detected. Force HTTPS at the server level:",
          "  Nginx: server { listen 80; return 301 https://$host$request_uri; }",
          "  Apache .htaccess: RewriteEngine On",
          "    RewriteCond %{HTTPS} off",
          "    RewriteRule ^(.*)$ https://%{HTTP_HOST}/$1 [R=301,L]",
          "  Cloudflare: SSL/TLS > Always Use HTTPS = ON",
        ].join("\n") : "",
        redirects.chain.some((u, i) => i > 0 && !u.includes("www.") && redirects.chain[i-1]?.includes("www.")) ||
        redirects.chain.some((u, i) => i > 0 && u.includes("www.") && !redirects.chain[i-1]?.includes("www.")) ? [
          "• www/non-www redirect detected. Pick one canonical version:",
          "  Nginx: server { server_name www.example.com; return 301 https://example.com$request_uri; }",
          "  Apache: RewriteCond %{HTTP_HOST} ^www\\.(.*)$ [NC]",
          "    RewriteRule ^(.*)$ https://%1/$1 [R=301,L]",
        ].join("\n") : "",
        "",
        "STEP 3 — If you use a tracking redirect (e.g., tracking.example.com/click?id=...):",
        "• Replace it with direct URL + parallel tracking in Google Ads:",
        "  Google Ads > Account Settings > Tracking > Parallel tracking = ON",
        "  This loads your landing page directly while tracking fires in the background",
        "",
        "VERIFY:",
        `  curl -v -L "${redirects.chain[0]}" 2>&1 | grep -i "< location\\|< HTTP"`,
        "  Expected: Single 200 response with no 301/302 hops"
      ].filter(Boolean).join("\n") : undefined,
    });
  }

  private addHostingChecks(checks: AdsCheck[], hosting: HostingAnalysis): void {
    let technicalFix: string | undefined;
    if (hosting.isLikelyShared) {
      technicalFix = [
        "DETECTED SIGNALS: " + hosting.sharedHostingSignals.join(" | "),
        "",
        "MIGRATION OPTIONS (ranked by ease):",
        "",
        "OPTION 1 — Managed WordPress hosting (if WordPress):",
        "• Cloudways ($14/mo): Automated migration plugin, built-in CDN and caching",
        "• SiteGround ($15/mo): Free migration, built-in SG Optimizer caching",
        "• WP Engine ($30/mo): Automatic CDN, staging environments, managed updates",
        "• All include server-level caching that eliminates cold-cache issues",
        "",
        "OPTION 2 — VPS with control panel:",
        "• DigitalOcean ($6/mo) + RunCloud ($8/mo) or ServerPilot:",
        "  1. Create a Droplet (Ubuntu, 1GB RAM minimum)",
        "  2. Connect RunCloud for server management",
        "  3. Deploy your site via Git or SFTP",
        "  4. RunCloud auto-configures Nginx, PHP-FPM, and SSL",
        "",
        "OPTION 3 — Serverless/JAMstack (fastest for landing pages):",
        "• Vercel: vercel deploy (zero-config for Next.js/React)",
        "• Netlify: Connect Git repo, auto-builds and deploys to global CDN",
        "• Cloudflare Pages: Similar to Netlify, runs on Cloudflare's edge network",
        "• These serve your page from 200+ edge locations with sub-100ms TTFB",
        "",
        "AFTER MIGRATION — Add a CDN layer:",
        "• Cloudflare free tier: Just update nameservers, instant global CDN",
        "• Enable 'Cache Everything' Page Rule for your landing page URL",
        "",
        "VERIFY: After migration, test TTFB from multiple locations:",
        "  Use https://tools.keycdn.com/performance to test from 14 global locations",
        "  Target: < 400ms from all locations"
      ].join("\n");
    } else if (hosting.coldCacheRisk) {
      technicalFix = [
        "STEP 1 — Add server-side caching:",
        "• Redis (recommended for dynamic sites):",
        "  Install: apt install redis-server",
        "  WordPress: Install Redis Object Cache plugin, enable in Settings",
        "  Node.js: npm install redis, cache rendered HTML for landing pages:",
        '    const cached = await redis.get("page:/landing");',
        '    if (cached) return res.send(cached);',
        "",
        "• Varnish (reverse proxy cache):",
        "  Install: apt install varnish",
        "  Configure Varnish to listen on port 80, forward to your app on port 8080",
        "  Default config caches all GET requests — landing pages benefit immediately",
        "",
        "STEP 2 — Add Cache-Control headers:",
        '  Cache-Control: public, max-age=300, s-maxage=3600, stale-while-revalidate=86400',
        "  (This tells CDNs to cache 1 hour, serve stale content while revalidating for 24h)",
        "",
        "VERIFY: Run ab -n 100 -c 10 https://yoursite.com/landing-page",
        "  All requests should complete under 500ms after the first one warms the cache"
      ].join("\n");
    }

    checks.push({
      name: "Hosting Infrastructure",
      status: hosting.isLikelyShared ? "FAIL" : hosting.coldCacheRisk ? "WARNING" : "PASS",
      details: hosting.isLikelyShared
        ? `Shared hosting indicators: ${hosting.sharedHostingSignals.join("; ")}`
        : hosting.sharedHostingSignals.length > 0
          ? `Minor concerns: ${hosting.sharedHostingSignals.join("; ")}`
          : `Server: ${hosting.serverSignature || "Unknown"} — no shared hosting indicators`,
      category: "delivery",
      impact: hosting.isLikelyShared
        ? "Shared hosting means your page competes for CPU/RAM with other sites. During Ads campaigns, traffic spikes cause cold-cache delays and timeouts"
        : hosting.coldCacheRisk
          ? "Some hosting characteristics may cause slow responses under Ads traffic load"
          : "Hosting infrastructure appears adequate for Ads traffic",
      recommendation: hosting.isLikelyShared
        ? "Migrate to a VPS, cloud hosting (AWS/GCP/Azure), or managed WordPress hosting. Add a CDN layer (Cloudflare free tier works) for edge caching"
        : hosting.coldCacheRisk
          ? "Add server-side caching (Redis/Varnish) or CDN edge caching to handle Ads traffic spikes"
          : "No action needed",
      fixType: "infrastructure",
      technicalFix,
    });
  }

  private addMobileUxChecks(checks: AdsCheck[], mobileUx: MobileUxAnalysis): void {
    checks.push({
      name: "Keyword-to-Content Relevance (Above Fold)",
      status: mobileUx.keywordInAboveFold ? "PASS" : "FAIL",
      details: mobileUx.keywordInAboveFold
        ? "Page title keywords found in above-the-fold content — message match is strong"
        : "Page title keywords NOT found in visible above-fold content — visitors see a disconnect between ad and landing page",
      category: "ux",
      impact: !mobileUx.keywordInAboveFold
        ? "Google checks if the landing page content matches the ad's keywords. Poor message match directly lowers Quality Score"
        : "Strong message match — positive signal for Ad Relevance and Landing Page Experience",
      recommendation: !mobileUx.keywordInAboveFold
        ? "Add your primary ad keyword in the H1 heading and first paragraph. Ensure the above-fold content directly addresses what the ad promises"
        : "No action needed",
      fixType: "page-level",
      technicalFix: !mobileUx.keywordInAboveFold ? [
        "WHAT GOOGLE LOOKS FOR: The exact keywords from your ad headline should appear",
        "in the first visible section of your landing page (above the fold).",
        "",
        "STEP 1 — Match your ad headline to page H1:",
        "• If your ad says 'Best Running Shoes Under $100', your H1 should include",
        "  those exact words: <h1>Best Running Shoes Under $100 — Free Shipping</h1>",
        "• Place the H1 tag inside a hero/header section so it appears first on mobile",
        "",
        "STEP 2 — Echo keywords in the first paragraph:",
        "• Write 1-2 sentences right below the H1 that reinforce the keyword:",
        '  <p class="hero-text">Find the best running shoes under $100 from top brands.',
        "  Compare prices, read reviews, and get free 2-day shipping.</p>",
        "",
        "STEP 3 — Dynamic Keyword Insertion (for multiple ad groups):",
        "• If you run many keyword variations, use URL parameters to personalize:",
        '  <script>',
        '    const params = new URLSearchParams(window.location.search);',
        '    const keyword = params.get("keyword") || "Premium Products";',
        '    document.querySelector("h1").textContent = keyword + " — Shop Now";',
        '  </script>',
        "• In Google Ads, set Final URL to: yoursite.com/landing?keyword={keyword}",
        "",
        "STEP 4 — Create dedicated landing pages per ad group:",
        "• Instead of sending all ads to one page, create variant pages:",
        "  /landing/running-shoes, /landing/walking-shoes, /landing/trail-shoes",
        "• Each with H1, images, and content matching that specific ad group's keywords",
        "",
        "VERIFY: Read your page's first 200 words and check if your top 3 ad keywords appear"
      ].join("\n") : undefined,
    });

    checks.push({
      name: "CTA Visibility Without Scroll",
      status: mobileUx.ctaVisibleAboveFold ? "PASS" : mobileUx.ctaElements.length > 0 ? "WARNING" : "FAIL",
      details: mobileUx.ctaVisibleAboveFold
        ? `CTA visible above fold: "${mobileUx.ctaElements[0] || "detected"}"`
        : mobileUx.ctaElements.length > 0
          ? `CTAs found but may require scrolling: ${mobileUx.ctaElements.slice(0, 3).join(", ")}`
          : "No clear CTA found on the page",
      category: "ux",
      impact: !mobileUx.ctaVisibleAboveFold
        ? "Ads traffic expects immediate action path. If users must scroll to find the CTA, bounce rates increase and Google detects poor engagement"
        : "CTA immediately visible — reduces bounce rate from Ads traffic",
      recommendation: !mobileUx.ctaVisibleAboveFold
        ? "Place your primary CTA (button or form) in the hero section, visible without scrolling on mobile. Use contrasting colors and clear action text"
        : "No action needed",
      fixType: "page-level",
      technicalFix: !mobileUx.ctaVisibleAboveFold ? [
        "STEP 1 — Place a clear CTA button in the hero section:",
        "• HTML structure for above-fold CTA:",
        '  <section class="hero" style="min-height: 100vh; display: flex; flex-direction: column; justify-content: center; padding: 20px;">',
        '    <h1>Your Headline Matching Ad Copy</h1>',
        '    <p>Supporting text explaining the value proposition</p>',
        '    <a href="/signup" class="cta-button" style="',
        "      display: inline-block; padding: 16px 32px;",
        "      background: #FF6B00; color: white; font-size: 18px;",
        "      font-weight: bold; border-radius: 8px; text-decoration: none;",
        '      text-align: center; margin-top: 20px;">',
        "      Get Started Free",
        "    </a>",
        "  </section>",
        "",
        "STEP 2 — Mobile-specific considerations:",
        "• Test on a real phone (or Chrome DevTools mobile mode, 375px width)",
        "• CTA button should be fully visible without any scrolling",
        "• Minimum tap target size: 48x48px (Google's recommendation)",
        "• Use full-width buttons on mobile: width: 100%; max-width: 400px;",
        "• Don't place the CTA below a large hero image that pushes it off-screen",
        "",
        "STEP 3 — CTA text best practices for Ads landing pages:",
        "• Use action-specific text: 'Get Free Quote', 'Start Free Trial', 'Shop Now'",
        "• Avoid vague text: 'Learn More', 'Click Here', 'Submit'",
        "• Add urgency if appropriate: 'Get 20% Off — Today Only'",
        "• Match the CTA to your ad's call-to-action extension",
        "",
        "STEP 4 — Sticky CTA for long pages:",
        '  <div style="position: fixed; bottom: 0; left: 0; right: 0;',
        '    padding: 12px; background: white; box-shadow: 0 -2px 10px rgba(0,0,0,0.1);',
        '    z-index: 1000;">',
        '    <a href="/signup" class="cta-button" style="display: block;',
        '      text-align: center; padding: 14px; background: #FF6B00;',
        '      color: white; font-weight: bold; border-radius: 8px;">',
        "      Get Started Now",
        "    </a>",
        "  </div>",
        "• This ensures the CTA is always visible regardless of scroll position",
        "",
        mobileUx.ctaElements.length > 0
          ? `FOUND CTAs ON YOUR PAGE: ${mobileUx.ctaElements.join(", ")} — move these into the hero section`
          : "NO CTAs DETECTED: Add a prominent action button with clear conversion-focused text",
      ].join("\n") : undefined,
    });

    const layoutIssues = mobileUx.layoutShiftRisks.filter(r => !r.includes("No major"));
    checks.push({
      name: "Layout Stability (CLS Risk)",
      status: layoutIssues.length === 0 ? "PASS" : layoutIssues.length <= 2 ? "WARNING" : "FAIL",
      details: layoutIssues.length === 0
        ? "No major layout shift risks detected"
        : `${layoutIssues.length} layout shift risk${layoutIssues.length > 1 ? "s" : ""}: ${layoutIssues.join("; ")}`,
      category: "ux",
      impact: layoutIssues.length > 0
        ? "Layout shifts frustrate users and cause mis-clicks. Google measures CLS as part of Core Web Vitals — directly impacts Landing Page Experience"
        : "Stable layout — good user experience for Ads visitors",
      recommendation: layoutIssues.length > 0
        ? "Add explicit width and height attributes to all images and iframes. Preload web fonts. Reserve space for dynamic content and ads"
        : "No action needed",
      fixType: "page-level",
      technicalFix: layoutIssues.length > 0 ? [
        "DETECTED ISSUES: " + layoutIssues.join(" | "),
        "",
        layoutIssues.some(r => r.includes("images without")) ? [
          "FIX — Images without dimensions:",
          "• Add explicit width and height to every <img> tag:",
          '  <img src="hero.jpg" width="800" height="400" alt="Product photo"',
          '    style="max-width: 100%; height: auto;">',
          "• The width/height attributes set the aspect ratio, CSS handles responsive sizing",
          "• For CSS background images, set aspect-ratio on the container:",
          '  .hero-image { aspect-ratio: 16/9; background-size: cover; }',
          "",
        ].join("\n") : "",
        layoutIssues.some(r => r.includes("iframes without")) ? [
          "FIX — Iframes without dimensions:",
          "• Add width/height and wrap in a responsive container:",
          '  <div style="position: relative; padding-bottom: 56.25%; height: 0; overflow: hidden;">',
          '    <iframe src="..." width="560" height="315"',
          '      style="position: absolute; top: 0; left: 0; width: 100%; height: 100%;"',
          '      loading="lazy"></iframe>',
          "  </div>",
          "",
        ].join("\n") : "",
        layoutIssues.some(r => r.includes("lazy loading")) ? [
          "FIX — Above-fold images with lazy loading:",
          "• Remove loading='lazy' from hero/header images:",
          '  <img src="hero.jpg" width="800" height="400" alt="Hero"',
          '    fetchpriority="high">',
          "• Only use loading='lazy' for images below the fold",
          '• Add fetchpriority="high" to your LCP image (largest visible image)',
          "• Preload critical images in <head>:",
          '  <link rel="preload" as="image" href="/images/hero.jpg">',
          "",
        ].join("\n") : "",
        layoutIssues.some(r => r.includes("ad slots")) ? [
          "FIX — Dynamic ad slots causing layout shifts:",
          "• Reserve fixed space for ad containers before they load:",
          '  .ad-container { min-height: 250px; min-width: 300px;',
          '    background: #f5f5f5; }',
          "• Use CSS contain property: contain: layout size;",
          "• Move ad slots below the fold where shifts are less impactful",
          "",
        ].join("\n") : "",
        layoutIssues.some(r => r.includes("fonts")) ? [
          "FIX — Font loading causing layout shifts (FOUT/FOIT):",
          "• Preload your primary font in <head>:",
          '  <link rel="preload" as="font" type="font/woff2"',
          '    href="/fonts/main-font.woff2" crossorigin>',
          "• Use font-display: swap in @font-face:",
          "  @font-face {",
          "    font-family: 'YourFont';",
          "    src: url('/fonts/main-font.woff2') format('woff2');",
          "    font-display: swap;",
          "  }",
          "• For Google Fonts, add &display=swap to the URL:",
          '  <link href="https://fonts.googleapis.com/css2?family=Roboto&display=swap"',
          '    rel="stylesheet">',
          "• Use size-adjust in @font-face to match fallback font metrics:",
          "  @font-face { font-family: 'YourFont'; size-adjust: 105%; }",
          "",
        ].join("\n") : "",
        "VERIFY: Use Chrome DevTools > Performance > check 'Layout Shift Regions'",
        "Or run: npx web-vitals-cli https://yoursite.com/landing-page",
        "Target CLS score: < 0.1 (Good), < 0.25 (Needs Improvement)"
      ].filter(Boolean).join("\n") : undefined,
    });
  }

  private calculateScore(checks: AdsCheck[]): number {
    let score = 100;
    for (const check of checks) {
      if (check.status === "FAIL") score -= 15;
      else if (check.status === "WARNING") score -= 7;
    }
    return Math.max(0, Math.min(100, score));
  }

  private deriveRating(score: number): AdsRating {
    if (score >= 75) return "Above average";
    if (score >= 45) return "Average";
    return "Below average";
  }

  private addFieldDataChecks(checks: AdsCheck[], fieldData: CruxFieldData) {
    if (fieldData.source === "none") {
      checks.push({
        name: "Real-User Field Data (CrUX)",
        status: "WARNING",
        details:
          fieldData.error && fieldData.error.includes("No CrUX")
            ? "Google has no real-user field data for this URL or origin. Google Ads falls back to lab data and historical signals — your Landing Page Experience rating may be slow to update."
            : `CrUX field data could not be retrieved (${fieldData.error || "unknown reason"}).`,
        category: "performance",
        impact:
          "Google Ads' Landing Page Experience uses real-user Core Web Vitals from Chrome (CrUX). Pages without enough traffic to generate field data are rated using less responsive fallback signals.",
        recommendation:
          "Drive consistent traffic to this URL (organic + paid) so it accumulates enough Chrome user data for CrUX. Until then, focus on lab-measured Core Web Vitals on a real mid-tier mobile device.",
        fixType: "page-level",
        technicalFix:
          "STEP 1 — Verify CrUX status manually:\nhttps://pagespeed.web.dev/analysis?url=" +
          "<your-url>\nIf the 'Discover what your real users are experiencing' section is empty, you have no URL-level CrUX.\n\nSTEP 2 — Drive traffic. CrUX needs roughly 28 days of consistent Chrome user visits to populate. Until then Google Ads uses origin-level CrUX (whole-domain average) as a fallback. If your homepage is slow on real devices, this landing page inherits that.\n\nSTEP 3 — Test on a real mid-tier Android over throttled 4G (Chrome DevTools → Performance → Slow 4G + 4× CPU). Aim for LCP < 2.5s, CLS < 0.1, INP < 200ms.",
      });
      return;
    }

    const sourceLabel =
      fieldData.source === "url"
        ? "URL-level CrUX (real Chrome users on this exact page over the last 28 days)"
        : "Origin-level CrUX (real Chrome users across the whole domain — Google falls back to this when the page doesn't have its own data)";

    const lcpMs = fieldData.lcp.percentile;
    if (lcpMs != null) {
      const status: AdsCheck["status"] =
        fieldData.lcp.category === "FAST" ? "PASS" : fieldData.lcp.category === "AVERAGE" ? "WARNING" : "FAIL";
      checks.push({
        name: "Largest Contentful Paint (field)",
        status,
        details: `Real-user p75 LCP: ${(lcpMs / 1000).toFixed(2)}s — ${fieldData.lcp.category}. Source: ${sourceLabel}.`,
        category: "performance",
        impact:
          "LCP is the single biggest Core Web Vital signal Google Ads uses for Landing Page Experience. p75 LCP > 2.5s on mobile is a primary cause of 'Below average' ratings.",
        recommendation:
          status === "PASS"
            ? "LCP is healthy."
            : "Optimize the hero image: serve as WebP/AVIF, set explicit width/height, preload it, lazy-load everything else.",
        fixType: "page-level",
        technicalFix:
          status === "PASS"
            ? undefined
            : 'STEP 1 — Identify the LCP element. In Chrome DevTools → Performance → record the page load → look at the "LCP" marker. It\'s usually the hero image or H1.\n\nSTEP 2 — Preload the hero image:\n<link rel="preload" as="image" href="/hero.webp" fetchpriority="high">\n\nSTEP 3 — Serve it small and modern:\n<img src="/hero.webp" width="1200" height="600" alt="..." fetchpriority="high">\n\nSTEP 4 — Defer everything else. Add loading="lazy" to all below-fold <img>. Move non-critical <script> to defer/async.\n\nSTEP 5 — Re-measure with PageSpeed Insights after 24-48h. CrUX p75 updates over a 28-day window, so improvements take weeks to fully reflect.',
      });
    }

    const clsVal = fieldData.cls.percentile != null ? fieldData.cls.percentile / 100 : null;
    if (clsVal != null) {
      const status: AdsCheck["status"] =
        fieldData.cls.category === "FAST" ? "PASS" : fieldData.cls.category === "AVERAGE" ? "WARNING" : "FAIL";
      checks.push({
        name: "Cumulative Layout Shift (field)",
        status,
        details: `Real-user p75 CLS: ${clsVal.toFixed(3)} — ${fieldData.cls.category}.`,
        category: "ux",
        impact:
          "Layout shifts during page load make ad visitors mis-tap and bounce. Google directly penalizes CLS > 0.1 in Landing Page Experience.",
        recommendation:
          status === "PASS"
            ? "Layout stability is good."
            : "Add explicit width/height to all media, reserve space for ads/embeds, avoid injecting content above existing content.",
        fixType: "page-level",
        technicalFix:
          status === "PASS"
            ? undefined
            : 'STEP 1 — Add dimensions to every <img> and <iframe>:\n<img src="..." width="800" height="450" alt="...">\n\nSTEP 2 — Reserve space for late-loading content (ads, embeds, web fonts):\n.ad-slot { min-height: 250px; }\n\nSTEP 3 — Use font-display: optional or swap with a metric-compatible fallback to avoid font swap shifts.\n\nSTEP 4 — Never inject banners, cookie bars, or notifications above existing content after load. Render them as overlays instead.',
      });
    }

    const inpMs = fieldData.inp.percentile;
    if (inpMs != null) {
      const status: AdsCheck["status"] =
        fieldData.inp.category === "FAST" ? "PASS" : fieldData.inp.category === "AVERAGE" ? "WARNING" : "FAIL";
      checks.push({
        name: "Interaction to Next Paint (field)",
        status,
        details: `Real-user p75 INP: ${Math.round(inpMs)}ms — ${fieldData.inp.category}.`,
        category: "performance",
        impact:
          "INP measures real-world responsiveness. Slow INP correlates strongly with bounces from ad clicks, which Google tracks as a negative engagement signal.",
        recommendation:
          status === "PASS"
            ? "Interaction responsiveness is healthy."
            : "Reduce main-thread work: split large JS bundles, defer third-party tags, avoid heavy work in click/input handlers.",
        fixType: "page-level",
        technicalFix:
          status === "PASS"
            ? undefined
            : "STEP 1 — Audit third-party scripts (chat widgets, analytics, retargeting pixels). Each adds main-thread blocking. Defer or remove non-critical ones.\n\nSTEP 2 — Break up long tasks. Wrap heavy click handlers in requestIdleCallback or setTimeout(fn, 0) so the next paint isn't blocked.\n\nSTEP 3 — Code-split large JS bundles. Anything >100KB gzip should be split with dynamic import().\n\nSTEP 4 — Avoid synchronous layout reads in event handlers (offsetHeight, getBoundingClientRect inside loops).",
      });
    }
  }

  private getQualityScoreImpact(rating: AdsRating, score: number, fieldData?: CruxFieldData): string {
    const fieldNote = fieldData
      ? fieldData.source === "none"
        ? " ⚠ Note: Google has no real-user field data (CrUX) for this URL — your rating may be based on origin-level fallback or historical signals, which update slowly."
        : fieldData.overall === "SLOW"
        ? ` ⚠ Real-user field data (${fieldData.source === "url" ? "URL-level" : "origin-level"} CrUX) shows this page is SLOW for actual visitors — this is the strongest negative LPE signal regardless of lab score.`
        : fieldData.overall === "AVERAGE"
        ? ` Real-user field data (${fieldData.source === "url" ? "URL-level" : "origin-level"} CrUX) shows AVERAGE Core Web Vitals — there is room to push into the FAST bucket.`
        : ""
      : "";
    if (rating === "Above average") {
      return `Your landing page scores ${score}/100. This should contribute positively to your Quality Score (typically 7-10/10 for Landing Page Experience component). Higher Quality Score means lower CPC and better ad positioning.${fieldNote}`;
    }
    if (rating === "Average") {
      return `Your landing page scores ${score}/100. This gives you a neutral Landing Page Experience rating (typically 5-6/10 for this component). You're not being penalized, but you're also not getting the CPC discount that "Above average" pages receive.${fieldNote}`;
    }
    return `Your landing page scores ${score}/100. This likely results in a "Below average" Landing Page Experience (typically 1-4/10 for this component). Google actively penalizes your ads with higher CPC, lower ad rank, and potentially reduced impression share.${fieldNote}`;
  }

  private getCpcImpact(rating: AdsRating): string {
    if (rating === "Above average") {
      return "Above average landing pages typically see 16-50% lower CPC compared to below average pages. Your ads will also get priority in ad auctions, appearing more often and in higher positions.";
    }
    if (rating === "Average") {
      return "Average landing pages pay standard CPC rates. Improving to Above average could reduce your CPC by 16-30% and improve ad rank without increasing bids.";
    }
    return "Below average landing pages pay 25-400% more per click than Above average pages. Google reduces your impression share and ad positions. Fixing infrastructure and UX issues can dramatically reduce your ad spend.";
  }

  private generateRecommendations(
    checks: AdsCheck[],
    ttfb: TtfbMeasurement,
    cdn: CdnDetection,
    cache: CacheAnalysis,
    redirects: RedirectChain,
    hosting: HostingAnalysis,
    mobileUx: MobileUxAnalysis,
  ): AdsRecommendation[] {
    const recs: AdsRecommendation[] = [];
    const failedChecks = checks.filter(c => c.status === "FAIL");
    const warningChecks = checks.filter(c => c.status === "WARNING");

    const infraFails = failedChecks.filter(c => c.fixType === "infrastructure");
    if (infraFails.length > 0) {
      recs.push({
        title: "Fix Critical Infrastructure Issues",
        description: "Your server infrastructure is causing slow delivery for Google Ads traffic. These issues directly lower your Quality Score.",
        priority: "Critical",
        fixType: "infrastructure",
        impact: "Fixing infrastructure issues can improve TTFB by 50-80%, directly raising your Landing Page Experience rating and lowering CPC",
        actionItems: infraFails.map(c => `${c.name}: ${c.recommendation}`),
      });
    }

    if (cache.fragmented) {
      recs.push({
        title: "Resolve Cache Fragmentation",
        description: "Your caching setup treats Ads traffic differently from organic traffic, causing cache misses for every paid click.",
        priority: "High",
        fixType: "infrastructure",
        impact: "Fixing cache fragmentation ensures Ads traffic benefits from cached responses, reducing TTFB by 60-90% for repeat visitors",
        actionItems: cache.details.filter(d => !d.includes("No cache")),
      });
    }

    if (redirects.hasRedirects) {
      recs.push({
        title: "Eliminate Redirect Chain",
        description: `Your landing page has ${redirects.hops} redirect(s) adding ${redirects.totalLatency}ms of unnecessary latency before content is served.`,
        priority: redirects.hops > 1 ? "Critical" : "High",
        fixType: "page-level",
        impact: "Each redirect adds 100-500ms of latency. Eliminating redirects provides instant TTFB improvement",
        actionItems: [
          `Update Google Ads destination URL to: ${redirects.chain[redirects.chain.length - 1]}`,
          "Set up permanent 301 redirects only where absolutely necessary",
          "Never chain multiple redirects (HTTP → HTTPS → www → final page)",
        ],
      });
    }

    const pageFails = failedChecks.filter(c => c.fixType === "page-level" && c.category === "ux");
    if (pageFails.length > 0) {
      recs.push({
        title: "Improve Landing Page UX for Ads Traffic",
        description: "Your page content and layout need optimization for paid traffic visitors who expect immediate relevance and clear action paths.",
        priority: "High",
        fixType: "page-level",
        impact: "Better message match and CTA visibility reduce bounce rates by 20-40%, which Google tracks as an engagement signal for Quality Score",
        actionItems: pageFails.map(c => `${c.name}: ${c.recommendation}`),
      });
    }

    if (hosting.isLikelyShared) {
      recs.push({
        title: "Upgrade Hosting Infrastructure",
        description: "Shared hosting patterns detected. Your server can't reliably handle Ads traffic spikes, causing inconsistent page load times.",
        priority: "Critical",
        fixType: "infrastructure",
        impact: "Upgrading from shared hosting to VPS/cloud + CDN typically improves TTFB by 60-80% and eliminates cold-cache timeout issues",
        actionItems: [
          "Migrate to VPS or cloud hosting (DigitalOcean, AWS Lightsail, or Google Cloud Run)",
          "Add Cloudflare (free tier) for DNS and edge caching",
          "Enable server-level caching (OPcache for PHP, Redis for dynamic content)",
          "Set up monitoring to catch slow responses before they impact Quality Score",
        ],
      });
    }

    const infraWarnings = warningChecks.filter(c => c.fixType === "infrastructure");
    const pageWarnings = warningChecks.filter(c => c.fixType === "page-level");

    if (infraWarnings.length > 0 && recs.length < 4) {
      recs.push({
        title: "Optimize Infrastructure Performance",
        description: "Minor infrastructure issues that could be improved for better Ads performance.",
        priority: "Medium",
        fixType: "infrastructure",
        impact: "Addressing these issues helps maintain consistent performance as your Ads traffic scales",
        actionItems: infraWarnings.map(c => `${c.name}: ${c.recommendation}`),
      });
    }

    if (pageWarnings.length > 0 && recs.length < 5) {
      recs.push({
        title: "Optimize Page-Level Experience",
        description: "Minor UX improvements that can boost engagement metrics for Ads traffic.",
        priority: "Medium",
        fixType: "page-level",
        impact: "Small UX improvements compound over time, gradually improving Quality Score and reducing CPC",
        actionItems: pageWarnings.map(c => `${c.name}: ${c.recommendation}`),
      });
    }

    return recs;
  }
}

export const adsAnalyzer = new AdsLandingPageAnalyzer();
