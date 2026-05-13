---
title: SiteSnap self-SEO optimization
---
# SiteSnap Self-SEO Optimization

## What & Why
SiteSnap currently scores poorly on its own scanner because the marketing site is missing most of the on-page, technical, and AI-readiness signals we tell customers to fix. We need to eat our own dog food: every pillar SiteSnap audits should be near-perfect on sitesnap itself. This both improves real organic + AI-engine visibility and removes the embarrassment of "the SEO tool that fails its own SEO test."

The current state (verified):
- `client/index.html` has only `<title>`, a thin `<meta description>`, and font preconnects. No canonical, no Open Graph, no Twitter cards, no JSON-LD, no favicon, no manifest, no theme-color, no robots, no sitemap.
- `<html lang="en">` is hardcoded and never updates when the user switches to Croatian.
- Google Fonts request loads ~30 font families in a single CSS call — massive LCP/transfer-size hit on the very page that's supposed to score well on Core Web Vitals.
- No `/robots.txt`, `/sitemap.xml`, `/llms.txt` route is served by Express.
- The FAQPage JSON-LD shipped earlier is the only structured data on the site; there is no Organization, WebSite, SoftwareApplication, or BreadcrumbList schema.
- No Open Graph image or social share preview.

## Done looks like
- Running SiteSnap against `https://sitesnap.<domain>` produces a strong score across all 8 pillars (target: ≥90 on SEO, Technical, AEO, GEO; ≥85 on Performance).
- Page source (view-source) shows: title, description, canonical, hreflang en/hr, full Open Graph + Twitter Card set, theme-color, color-scheme, favicon set, manifest, and inline JSON-LD for Organization, WebSite (with SearchAction), and SoftwareApplication.
- `<html lang>` reflects the active i18n locale (`en` or `hr`) and updates on language switch.
- `/robots.txt`, `/sitemap.xml`, and `/llms.txt` are served correctly with the right content-type and contain accurate URLs for every public route (master, ads, aeo, dashboard, site-tools, legal pages, both EN + HR variants where relevant).
- Google Fonts request is reduced to only the families actually used in the design, with `display=swap`. No unused font families load on first paint.
- Each public page (master-analyzer, ads-analyzer, aeo-analyzer, dashboard, site-tools, legal pages) has a unique, search-intent title + meta description + canonical, set client-side on route change.
- Hero images (and any above-the-fold imagery) have explicit `width`/`height`, descriptive `alt`, `loading="eager"` for LCP image and `loading="lazy"` for everything below the fold; the LCP image is preloaded.
- No console warnings about missing alt text, mixed content, or invalid JSON-LD when validated via Google's Rich Results test.

## Out of scope
- Backlink building / off-page SEO.
- Server-side rendering or static prerendering — we stay client-rendered; the scanner reads our SPA shell, so all SEO signals must live in `index.html` or be emitted before first paint.
- Rewriting marketing copy beyond what's needed for unique title/description per page.
- Translating new SEO copy into additional languages beyond EN + HR.
- Paid Google Ads campaigns or Quality Score work for our own ads.

## Steps
1. **Static head & social cards** — In `client/index.html`, replace the thin head with: search-intent title + 150–160 char description, canonical, hreflang en+hr+x-default, full Open Graph (title/description/image/url/site_name/locale + locale:alternate), Twitter summary_large_image card, theme-color (light/dark), color-scheme, favicon set (16/32/180 + svg), and a web manifest link. Add an `og:image` (1200×630 PNG) under `client/public/` and reference it.
2. **Inline JSON-LD for Organization / WebSite / SoftwareApplication** — Add three `<script type="application/ld+json">` blocks directly in `client/index.html`: Organization (name, url, logo, sameAs), WebSite (with potentialAction SearchAction pointing at the scanner), SoftwareApplication (offers €0/€19/€29, applicationCategory, aggregateRating placeholder ready for real reviews). These render server-side from the static HTML so AEO/GEO + classic SEO crawlers see them on first request.
3. **Dynamic per-route head** — Introduce a tiny `<DocumentHead>` helper (no react-helmet dependency needed; manipulate `document.title` and meta tags via effect) and call it from each top-level page. Each page gets a unique title, description, and canonical. Locale changes also update `<html lang>` and `<meta property="og:locale">`. Wire it into the existing `i18n.on("languageChanged")` handler.
4. **Robots, sitemap, llms.txt** — Add three Express routes in `server/routes.ts` (or a new `server/seoRoutes.ts`) that serve `/robots.txt` (allow all, point to sitemap), `/sitemap.xml` (every public route × EN/HR with hreflang alternates and lastmod), and `/llms.txt` (project summary + key URLs in the format AI engines expect). Set correct content-types and cache headers.
5. **Performance: font diet & LCP** — Trim the Google Fonts URL in `client/index.html` to only families actually used (audit `tailwind.config.ts` and component usage; almost certainly only Inter / DM Sans / one display face are needed). Keep `display=swap`. Move Cloudflare Turnstile to lazy-load only on routes that need it. Add `<link rel="preload" as="image">` for the hero LCP asset and ensure `width`/`height`/`loading`/`decoding` attributes on hero images.
6. **Verify with our own scanner** — Run SiteSnap against the deployed URL after each major step (or at least at the end), capture the per-pillar scores, and iterate until SEO/Technical/AEO/GEO are ≥90 and Performance ≥85. Document the before/after in `replit.md`.

## Relevant files
- `client/index.html`
- `client/public`
- `client/src/main.tsx`
- `client/src/App.tsx`
- `client/src/i18n/index.ts`
- `client/src/pages/master-analyzer.tsx`
- `client/src/pages/ads-analyzer.tsx`
- `client/src/pages/aeo-analyzer.tsx`
- `client/src/pages/dashboard.tsx`
- `client/src/pages/site-tools.tsx`
- `client/src/components/hero-section.tsx`
- `client/src/components/faq-section.tsx`
- `server/routes.ts`
- `server/index.ts`
- `tailwind.config.ts`
- `replit.md`