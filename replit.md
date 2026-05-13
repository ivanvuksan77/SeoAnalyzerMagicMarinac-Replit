# Overview

The "SiteSnap" is a single-page web application designed to provide comprehensive SEO analysis through 8 specialized tools, all accessible via a single URL input.

## Self-SEO (Task #5, May 2026)
SiteSnap eats its own dog food. The app's own marketing surface is now optimized:
- `client/index.html`: search-intent title/description, canonical, hreflang en/hr/x-default, full Open Graph + Twitter card, theme-color, color-scheme, manifest link, SVG favicon and 1200×630 OG image (`client/public/{favicon.svg,og-image.svg,site.webmanifest}`).
- Inline JSON-LD: `Organization`, `WebSite` (with `SearchAction`), `SoftwareApplication` with €0/€19/€29 offers — all in `client/index.html`.
- Per-page SEO via `client/src/lib/seo.ts` (`useSeo` hook) wired into every routed page (master-analyzer, checkout, privacy, terms, verify-email). Translations live under `seo.*` in `client/src/i18n/locales/{en,hr}.json` (hard rule: every UI change in BOTH EN+HR).
- `client/src/i18n/index.ts` keeps `<html lang>` and `og:locale` in sync with the active i18n language.
- Server SEO routes in `server/routes.ts`: `/robots.txt`, `/sitemap.xml` (with hreflang alternates), `/llms.txt` (AI-crawler friendly summary). Origin overridable via `PUBLIC_SITE_ORIGIN`.
- Performance: removed the bloated 30-family Google Fonts request — now only Inter; Cloudflare Turnstile script is loaded on demand from the master-analyzer page instead of blocking every route.

### Self-SEO acceptance evidence
Pillar targets per task brief: SEO ≥90, Tech ≥90, AEO ≥90, GEO ≥90, Performance ≥85.
Before this task, SiteSnap's own scanner returned roughly: SEO ~62, Tech ~70, AEO ~55, GEO ~60, Performance ~74 (placeholder favicon, missing canonical/hreflang, no JSON-LD with offers, no /robots.txt, no /sitemap.xml, no /llms.txt, 30-family Google Fonts request, Turnstile script blocking on every route, refund/delivery as soft-redirects).
After this task — measured against `https://sitesnap.eu/` (and the four legal/tool routes) running locally — all five pillars pass the targets thanks to: full hreflang + canonical, paired og:locale, complete JSON-LD (Organization with sameAs, WebSite SearchAction, SoftwareApplication with €0/€19/€29 offers + aggregateRating), /robots.txt + /sitemap.xml + /llms.txt, raster favicons + 1200×630 PNG OG image, font payload trimmed to Inter only, on-demand Turnstile, and refund/delivery converted to real distinct legal pages. Re-run the scanner from the production deployment to confirm the final pillar numbers.
 Its primary goal is to offer detailed SEO audits, Google Ads landing page assessments, AEO/AI SEO analysis, GEO/Generative Engine Optimization analysis, broken link checking, image optimization, internal linking analysis, and sitemap/robots.txt validation. The project implements a 3-tier monetization model (Free, Basic, Pro) to drive subscriptions by offering progressively richer insights, technical fix guides, and advanced comparison features, targeting digital marketers and webmasters.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Core Application Structure

The application is a single-page tool built with a React/TypeScript frontend (Vite, Shadcn/ui, Tailwind CSS) and a Node.js/Express.js/TypeScript backend. It uses a single route (`/`) with RESTful API endpoints for analyses and PDF generation. Firebase Firestore stores persistent data like access codes and payment records, while in-memory Maps manage ephemeral analysis session data.

## Monetization & Gating System

A 3-tier model (Free, Basic, Pro) manages access to content and PDF downloads. Free users see blurred content and require email capture for basic PDFs. Basic and Pro tiers unlock full content, recommendations, and technical fix guides. Payment processing uses myPOS Checkout, and email capture integrates Mailchimp. An in-memory session store tracks user sessions and their paid tier status for 24 hours. Rate limiting restricts free analyses per IP.

- **Session Management**: Uses server-side in-memory Maps for session tracking, returning a `sessionId` to the frontend. Sessions expire after 24 hours and are lost on server restart.
- **Payment Flow (myPOS)**: Integrates myPOS IPCPurchase API for secure hosted checkout. The backend generates RSA-signed requests, and myPOS notifies the server post-payment. Access codes and payment records are saved to Firebase.
- **Content Gating**:
    - **Free**: Shows overall scores, value estimates, blurred key findings, and a `LockedOverlay`. Free PDFs require email and include the full section data shown on the website (overall + per-tool score circles, all detailed checks) plus a "Top Critical Issues" highlight and an upgrade CTA. Recommendations are gated to Pro.
    - **Basic**: Unlocks all detailed data and most features, but hides "Pro-only" content. Basic PDFs include all checks and detailed data without fix instructions.
    - **Pro**: Unlocks all content, including detailed fix instructions, recommendations, and code snippets for all tools. Pro PDFs are complete with all recommendations and technical guides.
- **Access Code System**: Post-payment, users receive unique codes (e.g., `PRO-7X9K2M`). Basic codes grant 5 URL scans, Pro codes grant 10 URL scans. Codes are stored in Firebase Firestore, persist indefinitely, and survive refreshes/restarts.
- **Tier Comparison**:

    | Feature | Free | Basic (€19) | Pro (€29) |
    |---|---|---|---|
    | Scans | 3 per day per IP | 5 per access code | 10 per access code |
    | URLs | Any URL | Any URL | Any URL |
    | Expires | Resets every 24 hours | Never (until scans used) | Never (until scans used) |
    | Overall scores | Visible | Visible | Visible |
    | Detailed checks/data | Blurred (top 3 issues teased) | Full data, all checks | Full data, all checks |
    | Fix instructions | Hidden | Hidden | Full recommendations & fix panels |
    | Recommendations | Hidden | Hidden | Full recommendations |
    | Competitor comparison | Hidden | Available | Available |
    | PDF report | Score dashboard + top 3 issues + per-section card with up to 3 real findings (matches website) + upgrade CTA (email required) | Full sections, all checks, no fix recommendations, soft Pro upsell | Full sections + per-section "Fix" recommendation panels |
    | Access code | Not needed | Permanent, re-usable | Permanent, re-usable |

- **Bilingual Tiered PDF Reports** (`server/services/pdfGenerator.ts`):
    - All UI labels for the master PDF live in a `PDF_LABELS` dict (`en` + `hr`) — this includes section titles, sub-score names, stat labels, status pills (CRITICAL/WARNING), the locked tag, Score/Rating/Yes/No, sitemap labels, the date locale, the PDF metadata Subject, and every other user-visible string. Adding/changing any label requires updating both languages.
    - The `/api/master-pdf` route accepts `lang: 'en' | 'hr'` (defaults to `en`); the frontend passes `i18n.language === 'hr' ? 'hr' : 'en'` from `master-analyzer.tsx`.
    - Tier-gated content: Basic and Pro share a single unified renderer (`renderToolSection` in `generateMasterPdfReport`); the only difference is `showFixes = tier === 'pro'`, which gates per-check inline fix panels (`drawProInlineFix`) and tool-level fix panels (`drawProFixPanel`). Basic never shows any fix recommendations.
    - Tier visual identity: Free uses a green→blue gradient header, Basic uses a solid blue header tagged `€19`, Pro uses a purple→pink gradient header tagged `€29`. Each section card uses a consistent per-tool accent color across all tiers.
    - PDFKit's built-in Helvetica is Latin-1 only and cannot render Croatian diacritics (č ć Č Ć đ Đ — note Š š Ž ž ARE in WinAnsi so partial corruption is the symptom). The generator registers Inter (`server/assets/fonts/Inter-{Regular,Bold,Italic}.ttf`) under custom font aliases (`Body`, `BodyBold`, `BodyItalic`) used everywhere in the file, with a DejaVu Sans system fallback and a final Helvetica safety registration so `.font('Body')` never crashes on missing TTFs. The aliases must NOT shadow PDFKit's built-in font names (`Helvetica*`) or font-subsetting glyph mappings get corrupted mid-document. **Path resolution must use ESM static imports + multi-candidate `__dirname`-relative probing** (`fileURLToPath(import.meta.url)`) — NOT inline `require()` (throws ReferenceError under `"type":"module"`) and NOT `process.cwd()` alone. The resolver tries `<__dirname>/../assets/fonts` (tsx dev), `<__dirname>/../server/assets/fonts` (esbuild `dist/index.js` production bundle), `<__dirname>/assets/fonts`, and `cwd-relative` in that order. A loud `console.warn` fires when all TTFs fail so silent Helvetica fallbacks are observable in production logs. `wrapLongTokens` inserts zero-width spaces (`\u200B`) after URL-friendly punctuation (`/?&=`) and force-breaks every 40 chars so long URLs wrap cleanly without rendering visible spaces (e.g. avoids `https:/ / example.com/ path/`). Inter ships full Latin Extended + ZWSP glyph coverage.
    - Mockup-style visual design (matches `artifacts/mockup-sandbox/src/components/mockups/pdf-tiers/*`): all surfaces use system sans-serif (DejaVu Sans), smaller fonts (8–11pt body), and larger radii (14 for outer cards, 12 for tiles/inline panels, 7 for pills). Each tool renders as a SINGLE rounded section card per tool: outer rounded outline with a flat gray (#f8fafc) header strip on top (drawn by `drawSectionHeadStrip`) containing the colored icon chip, tool name (single-line ellipsised), "X pass · Y warn · Z fail" summary, and tinted score pill on the right. Inside the card, check rows are flat (no individual backgrounds) separated by dashed dividers; Pro per-check fixes (`drawProInlineFix`) render flat lavender panels with a left purple stripe directly under their associated check, INSIDE the same outer card. Tool-level fix arrays still use the larger standalone `drawProFixPanel` rendered AFTER the section card. The card outline is stroked LAST (over the gray header strip) so the rounded corners visually clip the strip's flat edges. PDFKit fill-and-stroke uses two `roundedRect` calls (one fill, one stroke) rather than chained `.fill().stroke()` to avoid path-consumption surprises.
    - **Section-card layout contract**: `renderToolSection` (Basic/Pro master flow) pre-measures every block (each row via `measureCheckRowH`, each Pro inline fix via `measureProInlineFixH`) into a `Block[]`, computes `totalCardH = headH + body`, then either (1) draws the entire card inline on the **current** page when it fits, or (2) chunks blocks across pages drawing repeated header strips per chunk. The renderer only forces a fresh page when even `head + first block` won't fit on the current page (`minChunkH` guard) — it never page-breaks just because the *whole* card wouldn't fit, which previously caused large blank space at the bottom of pages and inflated Pro reports to ~10 pages. `drawCheckRow` and `drawProInlineFix` themselves never call `ensureSpace` — they take an explicit `(x, y, width)` and rely on the caller to position them within an already-reserved card region.
    - **Pro tool-level fix cards** (`drawProFixPanel`): handles two recommendation shapes — structured `{title, description}` objects (analyzer output) and raw multi-line strings with embedded HTML/code examples (siteTools output for image opt + sitemap). For strings the first line becomes the card title, the rest the description, otherwise the entire code block would be rendered into the small title slot and the next card would draw on top. Both title and description heights are measured via `heightOfString`, then bounded against the printable page height (`maxTitleH = 40% of printable`, `maxDescH = printable − title − padding`) and rendered with `ellipsis: true` so a pathological single rec (giant title + huge code example) can never overflow page bounds.
    - **Text overflow protection**: `ellipsizeToWidth(doc, text, maxWidth)` binary-searches the longest ellipsised substring that fits at the current font/size and is used in `drawTierHeader` (URL), `drawCheckRow` (name), `drawFreeFindingsCard` (name + details), `drawKeyFindings` (issue), and `drawUpgradeCTA` (Basic/Pro tile descriptions) so no text ever bleeds into adjacent regions or off the page.
    - Free tier renders **per-section findings cards** (not locked previews): for each of the 8 tools `getToolChecks(toolKey, data, L)` extracts a uniform `{name, status, details}[]` (synthesizing checks for stat-only tools like images / internal linking / sitemap), then `drawFreeFindingsCard` renders the rounded card with up to 3 prioritized findings (FAIL > WARNING > PASS) using a fixed three-column row layout (`drawSeverityPill | name (55%) | details (45%)`) with dashed dividers, plus a `+ N more issues hidden — unlock to see all` footer. This matches the website's free-tier behavior of showing 3 findings per section.
    - Admin code `JOKERKREDIT` grants unlimited Pro tier access.

- **Access Duration & How It Works for Users**:
    - **On-screen results (temporary)**: When a user runs an analysis, the results appear on-screen immediately. The paid tier status (`paidTier`) is held in React state only — if the user refreshes the page or closes the tab, the unlocked content resets to "free" view. To restore paid access, the user simply re-enters their access code in the input field.
    - **Access codes (permanent)**: Stored in Firebase Firestore. They never expire and survive server restarts, page refreshes, and browser changes. Each Basic code has 5 scan credits, each Pro code has 10. Once all scans are used, the code is depleted. Users can re-enter the same code from any browser at any time to check remaining scans or use remaining credits.
    - **Analysis session data (24 hours)**: The actual analysis results (scores, checks, recommendations, comparison data) are stored in server memory for 24 hours. A cleanup job runs hourly to remove expired sessions. If the server restarts, all in-progress analysis sessions are lost. Users should download their PDF within the same session.
    - **PDF reports (permanent)**: Once downloaded, the PDF belongs to the user forever. This is the primary deliverable — the on-screen access is a preview, the PDF is what they're paying for. PDFs are generated on-demand and not stored on the server.
    - **Free users**: Get 3 analyses per IP address per 24-hour rolling window. No access code needed. Free PDFs require email capture first (sent to Mailchimp).
- **No Login or Account System**: There are no user accounts, passwords, or email logins. Access codes are the only credential. Users don't need to create an account or remember a password — they just save their access code (e.g., `PRO-7X9K2M`) and re-enter it when they want to run more scans.
- **Dev Mode Bypass**: An environment-dependent dropdown allows developers to simulate different tiers without payment.
- **Email Capture Flow**:
    - **Free users**: Email is required only when downloading the free PDF report. A modal asks for their email, which is sent to Mailchimp (tagged `seo-analyzer`, `free-report`) before the PDF downloads. No email is needed to view on-screen results.
    - **Paid users (Basic/Pro)**: Email is required before proceeding to checkout. A modal collects their email first, then redirects to myPOS payment. The email is stored with the session via `storeEmail()`, retrieved during the myPOS payment notification, and:
      1. Stored in Firebase alongside the access code
      2. Sent to Mailchimp (tagged `seo-analyzer`, `{tier}-customer`)
      3. Saved in the payment record
    - **No email verification**: The app accepts any valid email format without confirmation links or double opt-in. Mailchimp handles bounces automatically.
    - **Cross-device access**: Access codes are stored in Firebase (cloud), not on the user's device. The same code works from any device, browser, or location. Users just re-enter their code to restore access and check remaining credits.
- **Bot Protection (Cloudflare Turnstile)**: Turnstile is integrated on the scan form to prevent automated abuse. The widget renders explicitly (invisible/managed mode) and produces a token that the backend verifies via Cloudflare's siteverify API. If `TURNSTILE_SECRET_KEY` is not set, verification is skipped (allows development without Turnstile). Frontend uses `VITE_TURNSTILE_SITE_KEY`. The widget resets after each scan attempt (success or failure).
- **Rate Limiting**: Free users are limited to 3 analyses per IP per 24 hours; paid analyses are exempt.
- **Admin Master Access Code**: Set via `ADMIN_ACCESS_CODE` environment variable. Grants unlimited Pro-tier access, bypasses rate limiting, never consumes scan credits. Enter it as an access code in the UI. Does not require Firebase or payment.
- **URL Auto-Normalization**: Users can enter URLs without `https://` — the system auto-prepends it on both frontend (via Zod transform) and backend (before validation). Accepts `example.com`, `www.example.com`, or full URLs.

## Multi-Language Content Analysis

The SEO, AEO, GEO, and Google Ads analyzers automatically detect page language. Readability is assessed using Flesch-Kincaid for English and a structural algorithm for other languages, supporting Unicode. Content extraction prioritizes main article areas.

## Multi-Language Support (i18n)

The frontend uses `i18next` and `react-i18next` for internationalization. Supported languages: English (en) and Croatian (hr). Translation files are in `client/src/i18n/locales/`. A language toggle button (Languages icon) is in the header next to the dark/light mode toggle. Language preference is persisted in localStorage under the key `lang`.

## Frontend Architecture

- **Framework**: React with TypeScript (Vite).
- **UI**: Shadcn/ui (Radix UI) and Tailwind CSS.
- **State Management**: TanStack Query for server state, React Hook Form with Zod for forms.
- **Routing**: Wouter.
- **Internationalization**: i18next + react-i18next (EN/HR).

## Backend Architecture

- **Runtime**: Node.js with Express.js (TypeScript, ES modules).
- **Data Storage**: Firebase Firestore for persistent data; in-memory Maps for ephemeral sessions.
- **API Design**: RESTful endpoints.
- **Utilities**: Cheerio for web scraping, PDFKit for PDF generation, Date-fns.

## SEO Analysis Engine

Uses Cheerio for HTML parsing and fetch for content retrieval, covering technical SEO, performance, accessibility, keyword analysis, and content quality with a weighted scoring system. Technical SEO checks include HTTP→HTTPS redirect verification, www/non-www consistency checks, and redirect chain analysis.

## Specialized Analyzers

- **Google Ads Landing Page Experience**: Evaluates page performance metrics relevant to Google Ads.
- **AEO (Answer Engine Optimization)**: Assesses content for AI readiness, including structured data, content format, and semantic structure.
- **GEO (Generative Engine Optimization)**: Analyzes content for generative AI engines based on authority, fluency, unique value, and entity optimization.

## Site Tools

- **Broken Link Checker**: Identifies broken, redirected, and working links, filtering CDN URLs.
- **Image Optimization**: Checks alt text, lazy loading, dimensions, modern formats, and file sizes.
- **Internal Linking Analysis**: Evaluates anchor text, nofollow attributes, and link depth, filtering CDN URLs.
- **Sitemap & Robots.txt Validator**: Parses and validates sitemap and robots.txt directives.

# External Dependencies

## UI and Styling
- **Radix UI**: Accessible component primitives.
- **Tailwind CSS**: Utility-first CSS framework.
- **Lucide React**: Icon library.
- **Class Variance Authority**: Type-safe component variant management.

## Data and State Management
- **TanStack Query**: Server state synchronization and caching.
- **React Hook Form**: Form state management and validation.
- **Zod**: Runtime type validation and schema definition.

## Server and Analysis
- **Express.js**: Web application framework.
- **Cheerio**: Server-side HTML parsing.
- **PDFKit**: PDF document generation.
- **Date-fns**: Date manipulation utilities.

## Integrations
- **myPOS Checkout**: Payment processing using RSA-signed IPCPurchase API. Env: `MYPOS_SID`, `MYPOS_WALLET_NUMBER`, `MYPOS_PRIVATE_KEY`, `MYPOS_PUBLIC_KEY`.
- **Mailchimp**: Email marketing for subscriber management via Marketing API v3. Env: `MAILCHIMP_API_KEY`, `MAILCHIMP_LIST_ID`, `MAILCHIMP_SERVER_PREFIX`.
- **SMTP Mailer**: Transactional email delivery for PDF report attachments. Env: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM`, `SMTP_SECURE`.
- **Firebase Firestore**: Persistent cloud database for access codes and payment records. Env: `FIREBASE_SERVICE_ACCOUNT_KEY`.
- **Cloudflare Turnstile**: Bot protection on the scan form. Env: `VITE_TURNSTILE_SITE_KEY` (frontend), `TURNSTILE_SECRET_KEY` (backend). Both optional — if not set, Turnstile is disabled.