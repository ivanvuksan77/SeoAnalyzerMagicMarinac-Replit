import * as cheerio from "cheerio";
import {
  BrokenLink,
  BrokenLinksResult,
  ImageIssue,
  ImageOptimizationResult,
  InternalLink,
  InternalLinkingResult,
  RobotsTxtResult,
  SitemapResult,
  SitemapValidatorResult,
} from "@shared/schema";

const USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";

const SOCIAL_MEDIA_DOMAINS = new Set([
  "instagram.com", "www.instagram.com",
  "facebook.com", "www.facebook.com", "m.facebook.com",
  "twitter.com", "www.twitter.com", "x.com", "www.x.com",
  "tiktok.com", "www.tiktok.com",
  "linkedin.com", "www.linkedin.com",
  "pinterest.com", "www.pinterest.com",
  "snapchat.com", "www.snapchat.com",
  "reddit.com", "www.reddit.com",
  "tumblr.com", "www.tumblr.com",
  "threads.net", "www.threads.net",
  "youtube.com", "www.youtube.com",
  "youtu.be",
  "wa.me",
  "t.me",
]);

function isSocialMediaUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return SOCIAL_MEDIA_DOMAINS.has(parsed.hostname);
  } catch {
    return false;
  }
}

function resolveUrl(href: string, baseUrl: string): string | null {
  try {
    return new URL(href, baseUrl).href;
  } catch {
    return null;
  }
}

function getBaseUrl(url: string): string {
  const parsed = new URL(url);
  return `${parsed.protocol}//${parsed.hostname}`;
}

function isInternal(linkUrl: string, pageUrl: string): boolean {
  try {
    const link = new URL(linkUrl);
    const page = new URL(pageUrl);
    return link.hostname === page.hostname;
  } catch {
    return false;
  }
}

async function fetchWithTimeout(url: string, timeoutMs: number = 10000, method: string = "HEAD"): Promise<{ status: number; statusText: string; headers: Headers; responseTime: number } | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const start = Date.now();
  try {
    const res = await fetch(url, {
      method,
      headers: {
        "User-Agent": USER_AGENT,
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9,hr;q=0.8",
        "Accept-Encoding": "gzip, deflate, br",
      },
      signal: controller.signal,
      redirect: "follow",
    });
    // For GET requests, drain the body to free the connection promptly.
    if (method === "GET") {
      try { await res.arrayBuffer(); } catch { /* ignore */ }
    }
    return { status: res.status, statusText: res.statusText, headers: res.headers, responseTime: Date.now() - start };
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

// Run async tasks with bounded concurrency to avoid tripping rate limiters / WAFs.
async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  fn: (item: T, index: number) => Promise<R>,
): Promise<PromiseSettledResult<R>[]> {
  const results: PromiseSettledResult<R>[] = new Array(items.length);
  let i = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      try {
        results[idx] = { status: "fulfilled", value: await fn(items[idx], idx) };
      } catch (err) {
        results[idx] = { status: "rejected", reason: err };
      }
    }
  });
  await Promise.all(workers);
  return results;
}

class SiteToolsService {

  async checkBrokenLinks(url: string): Promise<BrokenLinksResult> {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    const baseUrl = getBaseUrl(url);

    const linkElements: { href: string; text: string; location: string }[] = [];
    const seen = new Set<string>();

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href")?.trim();
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:") || href.includes("/cdn-cgi/")) return;
      const resolved = resolveUrl(href, url);
      if (!resolved || seen.has(resolved)) return;
      seen.add(resolved);
      linkElements.push({
        href: resolved,
        text: $(el).text().trim().substring(0, 100) || "[no text]",
        location: $(el).closest("nav, header, footer, main, aside, section").prop("tagName")?.toLowerCase() || "body",
      });
    });

    const maxLinks = 100;
    const linksToCheck = linkElements.slice(0, maxLinks);

    const socialMediaLinks: BrokenLink[] = [];
    const checkableLinks: typeof linksToCheck = [];

    for (const link of linksToCheck) {
      if (isSocialMediaUrl(link.href)) {
        socialMediaLinks.push({
          url: link.href,
          anchorText: link.text,
          statusCode: null,
          statusText: "Skipped - Social media platforms block automated checks",
          type: isInternal(link.href, url) ? "internal" : "external",
          location: link.location,
          responseTime: null,
        });
      } else {
        checkableLinks.push(link);
      }
    }

    // Bounded concurrency + GET-only: many sites/WAFs return 5xx (often 508 "Loop Detected")
    // when hit with bursts of HEAD requests, even though the URLs work fine in a browser.
    // Using GET with low concurrency mirrors normal browsing patterns and gives reliable status codes.
    // We retry once on transient failures (5xx / network error) with a small backoff to recover from rate limiters.
    const results = await mapWithConcurrency(checkableLinks, 4, async (link) => {
      let res = await fetchWithTimeout(link.href, 10000, "GET");
      // Retry once if the request failed entirely or returned a transient 5xx error.
      if (!res || (res.status >= 500 && res.status < 600)) {
        await new Promise((r) => setTimeout(r, 400 + Math.floor(Math.random() * 400)));
        const retry = await fetchWithTimeout(link.href, 10000, "GET");
        if (retry) res = retry;
      }
      const internal = isInternal(link.href, url);
      const bl: BrokenLink = {
        url: link.href,
        anchorText: link.text,
        statusCode: res?.status ?? null,
        statusText: res ? (res.status >= 200 && res.status < 400 ? "OK" : res.statusText) : "Timeout/Unreachable",
        type: internal ? "internal" : "external",
        location: link.location,
        responseTime: res?.responseTime ?? null,
      };
      return bl;
    });

    const allChecked = results
      .filter((r): r is PromiseFulfilledResult<BrokenLink> => r.status === "fulfilled")
      .map((r) => r.value);

    const broken = allChecked.filter((l) => l.statusCode === null || l.statusCode >= 400);
    const redirected = allChecked.filter((l) => l.statusCode !== null && l.statusCode >= 300 && l.statusCode < 400);
    const working = allChecked.filter((l) => l.statusCode !== null && l.statusCode >= 200 && l.statusCode < 300);
    const internalCount = allChecked.filter((l) => l.type === "internal").length;
    const externalCount = allChecked.filter((l) => l.type === "external").length;

    const brokenRatio = allChecked.length > 0 ? broken.length / allChecked.length : 0;
    const score = Math.max(0, Math.round(100 - brokenRatio * 500 - redirected.length * 2));

    let summary = "";
    if (broken.length === 0) summary = `All ${allChecked.length} links are working. No broken links found.`;
    else summary = `Found ${broken.length} broken link${broken.length > 1 ? "s" : ""} out of ${allChecked.length} checked. ${internalCount} internal, ${externalCount} external links.`;
    if (socialMediaLinks.length > 0) summary += ` ${socialMediaLinks.length} social media link${socialMediaLinks.length > 1 ? "s" : ""} skipped (they block automated checks).`;
    if (linkElements.length > maxLinks) summary += ` (Checked first ${maxLinks} of ${linkElements.length} total links.)`;

    return {
      totalLinks: allChecked.length + socialMediaLinks.length,
      internalLinks: internalCount,
      externalLinks: externalCount + socialMediaLinks.length,
      brokenLinks: broken,
      redirectedLinks: redirected,
      workingLinks: working.length,
      skippedLinks: socialMediaLinks,
      brokenCount: broken.length,
      redirectCount: redirected.length,
      score,
      summary,
    };
  }

  async analyzeImages(url: string): Promise<ImageOptimizationResult> {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);

    const imageElements: { src: string; alt: string | null; loading: string | null; width: string | null; height: string | null; srcset: string | null }[] = [];
    const seen = new Set<string>();

    $("img").each((_, el) => {
      const src = $(el).attr("src") || $(el).attr("data-src");
      if (!src) return;
      const resolved = resolveUrl(src, url);
      if (!resolved || seen.has(resolved)) return;
      seen.add(resolved);
      imageElements.push({
        src: resolved,
        alt: $(el).attr("alt") ?? null,
        loading: $(el).attr("loading") ?? null,
        width: $(el).attr("width") ?? null,
        height: $(el).attr("height") ?? null,
        srcset: $(el).attr("srcset") ?? null,
      });
    });

    const maxImages = 50;
    const imagesToCheck = imageElements.slice(0, maxImages);

    const images: ImageIssue[] = await Promise.all(
      imagesToCheck.map(async (img) => {
        let fileSize: number | null = null;
        let format: string | null = null;
        try {
          const res = await fetchWithTimeout(img.src, 8000, "HEAD");
          if (res) {
            const cl = res.headers.get("content-length");
            if (cl) fileSize = parseInt(cl, 10);
            const ct = res.headers.get("content-type");
            if (ct) format = ct.split("/").pop()?.split(";")[0] || null;
          }
        } catch {}

        const hasAlt = img.alt !== null && img.alt.trim().length > 0;
        const hasLazyLoading = img.loading === "lazy";
        const hasDimensions = !!(img.width && img.height);
        const hasSrcset = !!img.srcset;
        const modernFormats = ["webp", "avif", "svg+xml"];
        const isModern = format ? modernFormats.some((f) => format!.toLowerCase().includes(f)) : false;
        const isOversized = fileSize !== null && fileSize > 200 * 1024;

        const issues: string[] = [];
        if (!hasAlt) issues.push("Missing alt text");
        if (!hasLazyLoading) issues.push("No lazy loading");
        if (!hasDimensions) issues.push("No explicit width/height (causes layout shift)");
        if (!hasSrcset) issues.push("No srcset for responsive images");
        if (!isModern && format) issues.push(`Uses ${format} instead of modern format (WebP/AVIF)`);
        if (isOversized) issues.push(`File size ${Math.round(fileSize! / 1024)}KB exceeds 200KB`);

        return {
          src: img.src,
          alt: img.alt,
          hasAlt,
          hasLazyLoading,
          hasExplicitDimensions: hasDimensions,
          hasSrcset,
          fileSize,
          format,
          isModernFormat: isModern,
          issues,
        };
      })
    );

    const total = images.length;
    const withAlt = images.filter((i) => i.hasAlt).length;
    const withLazy = images.filter((i) => i.hasLazyLoading).length;
    const withDimensions = images.filter((i) => i.hasExplicitDimensions).length;
    const withSrcset = images.filter((i) => i.hasSrcset).length;
    const modernCount = images.filter((i) => i.isModernFormat).length;
    const oversized = images.filter((i) => i.fileSize !== null && i.fileSize > 200 * 1024).length;

    let score = 100;
    if (total > 0) {
      const altRatio = withAlt / total;
      const lazyRatio = withLazy / total;
      const dimRatio = withDimensions / total;
      const modernRatio = modernCount / total;
      score = Math.round(altRatio * 30 + lazyRatio * 20 + dimRatio * 20 + modernRatio * 20 + (oversized === 0 ? 10 : 0));
    }

    const recommendations: string[] = [];
    if (withAlt < total) recommendations.push(`Add descriptive alt text to ${total - withAlt} image${total - withAlt > 1 ? "s" : ""} for accessibility and SEO.\n\nExample:\n<img src="photo.jpg" alt="Descriptive text about the image content">`);
    if (withLazy < total) recommendations.push(`Add loading="lazy" to ${total - withLazy} image${total - withLazy > 1 ? "s" : ""} to improve page load speed.\n\nExample:\n<img src="photo.jpg" loading="lazy" alt="Description">\n\nNote: Don't lazy-load images that are above the fold.`);
    if (withDimensions < total) recommendations.push(`Add explicit width and height to ${total - withDimensions} image${total - withDimensions > 1 ? "s" : ""} to prevent layout shifts (CLS).\n\nExample:\n<img src="photo.jpg" width="800" height="600" alt="Description">`);
    if (withSrcset < total) recommendations.push(`Add srcset attribute to ${total - withSrcset} image${total - withSrcset > 1 ? "s" : ""} for responsive image delivery.\n\nExample:\n<img src="photo-800.jpg"\n     srcset="photo-400.jpg 400w, photo-800.jpg 800w, photo-1200.jpg 1200w"\n     sizes="(max-width: 600px) 400px, 800px"\n     alt="Description">`);
    if (modernCount < total) recommendations.push(`Convert ${total - modernCount} image${total - modernCount > 1 ? "s" : ""} to WebP or AVIF format for smaller file sizes.\n\nUsing <picture> element:\n<picture>\n  <source srcset="photo.avif" type="image/avif">\n  <source srcset="photo.webp" type="image/webp">\n  <img src="photo.jpg" alt="Description">\n</picture>\n\nConvert with: cwebp photo.jpg -o photo.webp`);
    if (oversized > 0) recommendations.push(`Compress ${oversized} oversized image${oversized > 1 ? "s" : ""} (>200KB) to improve load time.\n\nTools: TinyPNG, ImageOptim, or Squoosh.app\nTarget: <100KB for most web images\nCLI: npx @squoosh/cli --webp auto photo.jpg`);

    const summary = total === 0
      ? "No images found on this page."
      : `Found ${total} images. ${withAlt} have alt text, ${withLazy} use lazy loading, ${modernCount} use modern formats. Score: ${score}/100.`;

    return {
      totalImages: total,
      imagesWithAlt: withAlt,
      imagesWithLazyLoading: withLazy,
      imagesWithDimensions: withDimensions,
      imagesWithSrcset: withSrcset,
      modernFormatCount: modernCount,
      oversizedImages: oversized,
      images,
      score,
      summary,
      recommendations,
    };
  }

  async analyzeInternalLinking(url: string): Promise<InternalLinkingResult> {
    const response = await fetch(url, { headers: { "User-Agent": USER_AGENT } });
    if (!response.ok) throw new Error(`Failed to fetch: ${response.status}`);
    const html = await response.text();
    const $ = cheerio.load(html);
    const baseUrl = getBaseUrl(url);

    const genericPhrases = new Set([
      "click here", "read more", "learn more", "here", "more", "link",
      "this", "go", "see more", "view", "details", "continue", "next",
      "previous", "back", "home", "page", "click", "tap here", "press here",
    ]);

    const links: InternalLink[] = [];
    const urlCounts = new Map<string, number>();
    const anchorCounts = new Map<string, number>();
    const seen = new Set<string>();

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href")?.trim();
      if (!href || href.startsWith("#") || href.startsWith("mailto:") || href.startsWith("tel:") || href.startsWith("javascript:") || href.includes("/cdn-cgi/")) return;
      const resolved = resolveUrl(href, url);
      if (!resolved) return;
      if (!isInternal(resolved, url)) return;

      const key = resolved + "|" + $(el).text().trim();
      if (seen.has(key)) return;
      seen.add(key);

      const anchorText = $(el).text().trim().substring(0, 100) || "[no text]";
      const rel = $(el).attr("rel") || "";
      const hasNofollow = rel.toLowerCase().includes("nofollow");
      const isDescriptive = anchorText.length > 2 && !genericPhrases.has(anchorText.toLowerCase());
      const parsedUrl = new URL(resolved);
      const depth = parsedUrl.pathname.split("/").filter(Boolean).length;
      const location = $(el).closest("nav, header, footer, main, aside, section").prop("tagName")?.toLowerCase() || "body";

      urlCounts.set(resolved, (urlCounts.get(resolved) || 0) + 1);
      const lower = anchorText.toLowerCase();
      anchorCounts.set(lower, (anchorCounts.get(lower) || 0) + 1);

      links.push({ url: resolved, anchorText, isDescriptive, hasNofollow, depth, location });
    });

    const uniqueUrls = new Set(links.map((l) => l.url));
    const descriptive = links.filter((l) => l.isDescriptive).length;
    const generic = links.filter((l) => !l.isDescriptive).length;
    const nofollow = links.filter((l) => l.hasNofollow).length;
    const deep = links.filter((l) => l.depth >= 3).length;
    const shallow = links.filter((l) => l.depth < 3).length;

    const anchorDistribution = Array.from(anchorCounts.entries())
      .map(([text, count]) => ({ text, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 20);

    let score = 100;
    if (links.length === 0) score = 0;
    else {
      const descRatio = descriptive / links.length;
      score = Math.round(
        descRatio * 40 +
        (nofollow === 0 ? 20 : Math.max(0, 20 - nofollow * 5)) +
        Math.min(20, uniqueUrls.size * 2) +
        (deep > 0 ? 20 : 10)
      );
    }

    const recommendations: string[] = [];
    if (generic > 0) recommendations.push(`Replace ${generic} generic anchor text${generic > 1 ? "s" : ""} ("click here", "read more") with descriptive keywords`);
    if (nofollow > 0) recommendations.push(`Remove nofollow from ${nofollow} internal link${nofollow > 1 ? "s" : ""} to pass link equity within your site`);
    if (uniqueUrls.size < 5) recommendations.push("Add more internal links to improve content discoverability and distribute page authority");
    if (deep === 0 && links.length > 0) recommendations.push("Add deep links to inner pages (3+ levels deep) to improve crawl depth");
    if (links.length > 100) recommendations.push("Consider reducing the number of internal links to prioritize the most important pages");

    const summary = links.length === 0
      ? "No internal links found on this page."
      : `Found ${links.length} internal links pointing to ${uniqueUrls.size} unique pages. ${descriptive} use descriptive anchor text, ${generic} use generic text.`;

    return {
      totalInternalLinks: links.length,
      uniqueInternalLinks: uniqueUrls.size,
      descriptiveAnchors: descriptive,
      genericAnchors: generic,
      nofollowCount: nofollow,
      deepLinks: deep,
      shallowLinks: shallow,
      links,
      anchorTextDistribution: anchorDistribution,
      score,
      summary,
      recommendations,
    };
  }

  async validateSitemapAndRobots(url: string): Promise<SitemapValidatorResult> {
    const baseUrl = getBaseUrl(url);

    const robotsTxt = await this.analyzeRobotsTxt(baseUrl);
    const sitemapUrl = robotsTxt.sitemapReferences.length > 0
      ? robotsTxt.sitemapReferences[0]
      : `${baseUrl}/sitemap.xml`;
    const sitemap = await this.analyzeSitemap(sitemapUrl);

    const recommendations: string[] = [];
    const issues: string[] = [];

    if (!robotsTxt.exists) {
      recommendations.push(`Create a robots.txt file in your site root:\n\nUser-agent: *\nAllow: /\n\nSitemap: https://yourdomain.com/sitemap.xml`);
      issues.push("Missing robots.txt");
    }
    if (robotsTxt.exists && robotsTxt.sitemapReferences.length === 0) {
      recommendations.push(`Add a Sitemap directive to robots.txt:\n\nSitemap: https://yourdomain.com/sitemap.xml\n\nPlace this at the end of your robots.txt file.`);
    }
    if (robotsTxt.hasWildcardBlock) {
      recommendations.push(`Review wildcard Disallow rules — they may block important content.\n\nCommon fix: Change from:\nDisallow: /\n\nTo:\nDisallow: /admin/\nDisallow: /private/\nAllow: /`);
    }
    if (robotsTxt.blocksImportantPaths) {
      recommendations.push(`Unblock important paths in robots.txt: ${robotsTxt.blockedImportantPaths.join(", ")}`);
    }
    if (!sitemap.exists) {
      recommendations.push(`Create an XML sitemap and submit it to search engines:\n\n<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n  <url>\n    <loc>https://yourdomain.com/</loc>\n    <lastmod>2024-01-01</lastmod>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n\nSubmit at: Google Search Console > Sitemaps`);
      issues.push("Missing sitemap.xml");
    }
    if (sitemap.exists && !sitemap.hasLastmod) {
      recommendations.push(`Add <lastmod> dates to sitemap entries for better crawl efficiency:\n\n<url>\n  <loc>https://yourdomain.com/page</loc>\n  <lastmod>2024-06-15</lastmod>\n</url>\n\nUse ISO 8601 format (YYYY-MM-DD).`);
    }
    if (sitemap.exists && sitemap.urlCount === 0) {
      recommendations.push(`Your sitemap is empty — add your page URLs to it. Each publicly accessible page should have an entry in the sitemap.`);
    }
    if (sitemap.issues.length > 0) {
      issues.push(...sitemap.issues);
    }
    if (robotsTxt.issues.length > 0) {
      issues.push(...robotsTxt.issues);
    }

    let score = 0;
    if (robotsTxt.exists) score += 20;
    if (robotsTxt.exists && !robotsTxt.hasWildcardBlock) score += 10;
    if (robotsTxt.exists && robotsTxt.sitemapReferences.length > 0) score += 10;
    if (robotsTxt.exists && !robotsTxt.blocksImportantPaths) score += 10;
    if (sitemap.exists) score += 20;
    if (sitemap.exists && sitemap.urlCount > 0) score += 10;
    if (sitemap.exists && sitemap.hasLastmod) score += 10;
    if (sitemap.exists && sitemap.issues.length === 0) score += 10;

    const summary = `Robots.txt: ${robotsTxt.exists ? "Found" : "Missing"}. Sitemap: ${sitemap.exists ? `Found with ${sitemap.urlCount} URLs` : "Missing"}. Score: ${score}/100.`;

    return { robotsTxt, sitemap, score, summary, recommendations };
  }

  private async analyzeRobotsTxt(baseUrl: string): Promise<RobotsTxtResult> {
    const robotsUrl = `${baseUrl}/robots.txt`;
    let content: string | null = null;
    let exists = false;

    try {
      const res = await fetch(robotsUrl, { headers: { "User-Agent": USER_AGENT } });
      if (res.ok) {
        content = await res.text();
        if (content.trim().length > 0 && !content.includes("<!DOCTYPE") && !content.includes("<html")) {
          exists = true;
        } else {
          content = null;
        }
      }
    } catch {}

    if (!exists || !content) {
      return {
        exists: false, content: null, userAgents: [], disallowedPaths: [],
        allowedPaths: [], sitemapReferences: [], hasWildcardBlock: false,
        blocksImportantPaths: false, blockedImportantPaths: [], issues: ["robots.txt not found"],
      };
    }

    const lines = content.split("\n").map((l) => l.trim());
    const userAgents: string[] = [];
    const disallowed: string[] = [];
    const allowed: string[] = [];
    const sitemaps: string[] = [];
    const issues: string[] = [];

    for (const line of lines) {
      if (line.startsWith("#") || line.length === 0) continue;
      const [directive, ...rest] = line.split(":");
      const value = rest.join(":").trim();
      const d = directive.toLowerCase().trim();

      if (d === "user-agent") userAgents.push(value);
      else if (d === "disallow" && value) disallowed.push(value);
      else if (d === "allow" && value) allowed.push(value);
      else if (d === "sitemap" && value) sitemaps.push(value);
    }

    const hasWildcard = disallowed.includes("/");
    const importantPaths = ["/", "/about", "/contact", "/products", "/services", "/blog"];
    const blockedImportant = disallowed.filter((p) => importantPaths.includes(p));

    if (hasWildcard) issues.push("Disallow: / blocks all crawlers - this may be intentional for staging sites");
    if (userAgents.length === 0) issues.push("No User-agent directive found");

    return {
      exists: true,
      content,
      userAgents,
      disallowedPaths: disallowed,
      allowedPaths: allowed,
      sitemapReferences: sitemaps,
      hasWildcardBlock: hasWildcard,
      blocksImportantPaths: blockedImportant.length > 0,
      blockedImportantPaths: blockedImportant,
      issues,
    };
  }

  private async analyzeSitemap(sitemapUrl: string): Promise<SitemapResult> {
    let exists = false;
    let xml = "";

    try {
      const res = await fetch(sitemapUrl, { headers: { "User-Agent": USER_AGENT } });
      if (res.ok) {
        xml = await res.text();
        if (xml.includes("<urlset") || xml.includes("<sitemapindex")) {
          exists = true;
        }
      }
    } catch {}

    if (!exists) {
      return {
        exists: false, url: sitemapUrl, urlCount: 0, hasLastmod: false,
        hasChangefreq: false, hasPriority: false, isSitemapIndex: false,
        childSitemaps: [], sampleUrls: [], issues: ["Sitemap not found or invalid XML"],
      };
    }

    const $ = cheerio.load(xml, { xmlMode: true });
    const isSitemapIndex = xml.includes("<sitemapindex");
    const issues: string[] = [];

    if (isSitemapIndex) {
      const children: string[] = [];
      $("sitemap loc").each((_, el) => { children.push($(el).text().trim()); });
      return {
        exists: true, url: sitemapUrl, urlCount: children.length,
        hasLastmod: $("sitemap lastmod").length > 0, hasChangefreq: false,
        hasPriority: false, isSitemapIndex: true, childSitemaps: children,
        sampleUrls: children.slice(0, 5), issues,
      };
    }

    const urls: string[] = [];
    $("url loc").each((_, el) => { urls.push($(el).text().trim()); });
    const hasLastmod = $("url lastmod").length > 0;
    const hasChangefreq = $("url changefreq").length > 0;
    const hasPriority = $("url priority").length > 0;

    if (urls.length === 0) issues.push("Sitemap contains no URLs");
    if (urls.length > 50000) issues.push("Sitemap exceeds 50,000 URL limit - split into multiple sitemaps");
    if (!hasLastmod) issues.push("No <lastmod> dates found - add them for better crawl efficiency");

    return {
      exists: true, url: sitemapUrl, urlCount: urls.length,
      hasLastmod, hasChangefreq, hasPriority, isSitemapIndex: false,
      childSitemaps: [], sampleUrls: urls.slice(0, 10), issues,
    };
  }
}

export const siteTools = new SiteToolsService();
