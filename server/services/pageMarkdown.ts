const SITE_ORIGIN = process.env.PUBLIC_SITE_ORIGIN || "https://freesiteanalyzer.eu";

const COMPANY = `Magićmarinac d.o.o., Tuškanova 24, 10000 Zagreb, Croatia — OIB: 35536574301 — info@magicmarinac.hr`;

const pages: Record<string, () => string> = {
  "/": () =>
    `# FreeSiteAnalyzer — Master SEO Analyzer\n\n` +
    `> Scan. Snap. Fix What Matters.\n\n` +
    `FreeSiteAnalyzer runs eight specialized audits from a single URL input and returns copy-paste fix instructions. Enter any URL and get a comprehensive report covering SEO, AEO, GEO, Google Ads landing-page experience, broken links, image optimization, internal linking, and sitemap/robots.txt validation.\n\n` +
    `## Tools included\n\n` +
    `### SEO Audit\n` +
    `Checks title tags, meta descriptions, heading hierarchy (H1–H6), canonical tags, hreflang, Open Graph, Twitter Card, structured data (JSON-LD), internal links, image alt text, sitemap presence, robots.txt directives, and Core Web Vitals signals (LCP, CLS, FID/INP via CrUX API).\n\n` +
    `### Google Ads Landing Page Experience\n` +
    `Evaluates TTFB, CDN usage, cache headers, redirect chains, hosting quality, HTTPS enforcement, mobile UX signals, and ad-copy quality rater signals relevant to Google Ads Quality Score. Includes an ad-copy ↔ landing-page relevance checker.\n\n` +
    `### AEO — Answer Engine Optimization\n` +
    `Assesses structured data completeness (FAQ, HowTo, Article, Product schemas), citation likelihood in AI search previews, semantic content gap detection, schema generator, and AI search readiness score. Also validates sitemap structure, robots.txt directives, and llms.txt.\n\n` +
    `### GEO — Generative Engine Optimization\n` +
    `Measures readiness for ChatGPT, Perplexity, Google AI Overviews, and similar generative engines. Checks authority signals, content fluency, unique value proposition, entity optimization, and citation-worthiness.\n\n` +
    `### Broken Link Checker\n` +
    `Crawls all links on the page and classifies each as working, redirected, or broken. CDN and asset URLs are filtered out.\n\n` +
    `### Image Optimization\n` +
    `Checks alt text presence, lazy loading attributes, explicit width/height dimensions, modern format usage (WebP/AVIF), and estimated file size impact on page weight.\n\n` +
    `### Internal Linking Analysis\n` +
    `Evaluates anchor text quality, nofollow attributes, link depth from the homepage, and internal link equity distribution.\n\n` +
    `### Sitemap & Robots.txt Validator\n` +
    `Parses and validates sitemap.xml structure (including nested sitemaps) and robots.txt directives. Reports missing, malformed, or conflicting entries.\n\n` +
    `## Pricing\n\n` +
    `All prices are one-time payments. No subscriptions.\n\n` +
    `| Plan | Price | Scans | Includes |\n` +
    `|------|-------|-------|----------|\n` +
    `| Free | €0 | 3/day per IP | Overall scores, top issues preview, free PDF report (email required) |\n` +
    `| Basic | €19 | 5 per code | Full audit data, all checks, Basic PDF report |\n` +
    `| Pro | €29 | 10 per code | Full audit data, all checks, copy-paste fix instructions, technical guides, Pro PDF report |\n\n` +
    `Access codes never expire and work from any browser or device.\n\n` +
    `## How it works\n\n` +
    `1. Enter any URL (with or without https://) in the input field.\n` +
    `2. Click "Run All Tests" — all eight tools run in parallel.\n` +
    `3. View scores and top issues on-screen for free.\n` +
    `4. Upgrade to Basic (€19) or Pro (€29) for full data and fix instructions.\n` +
    `5. Download your PDF report. Pro reports include copy-paste technical fix guides.\n\n` +
    `## Languages\n\n` +
    `English (en) and Croatian (hr). Toggle in the header; preference saved in localStorage.\n\n` +
    `## AI-readable resources\n\n` +
    `- Structured knowledge: ${SITE_ORIGIN}/api/ai/knowledge.json\n` +
    `- LLMs.txt (concise): ${SITE_ORIGIN}/llms.txt\n` +
    `- LLMs-full.txt (detailed): ${SITE_ORIGIN}/llms-full.txt\n` +
    `- Sitemap: ${SITE_ORIGIN}/sitemap.xml\n` +
    `- Robots: ${SITE_ORIGIN}/robots.txt\n` +
    `- Any page as markdown: append ?format=markdown to the URL\n`,

  "/dashboard": () =>
    `# FreeSiteAnalyzer — Legacy SEO Dashboard\n\n` +
    `A focused SEO analyzer for technical SEO and content quality. Returns an overall score with sub-scores for technical checks, performance, accessibility, keyword analysis, and content quality.\n\n` +
    `For the full 8-tool analysis, use the [Master Analyzer](${SITE_ORIGIN}/).\n\n` +
    `## Related\n\n` +
    `- [Home / Master Analyzer](${SITE_ORIGIN}/)\n` +
    `- [AEO Analyzer](${SITE_ORIGIN}/aeo-analyzer)\n` +
    `- [Pricing & Checkout](${SITE_ORIGIN}/checkout)\n`,

  "/aeo-analyzer": () =>
    `# FreeSiteAnalyzer — AEO / AI SEO Analyzer\n\n` +
    `Standalone Answer Engine Optimization (AEO) analyzer. Evaluates a URL for readiness in AI-powered search engines such as ChatGPT, Perplexity, and Google AI Overviews.\n\n` +
    `## What it checks\n\n` +
    `- Structured data completeness (FAQ, HowTo, Article, Product JSON-LD schemas)\n` +
    `- Citation likelihood score — how likely the page is to be cited in an AI answer\n` +
    `- AI search preview simulation\n` +
    `- Schema markup generator (generates ready-to-paste JSON-LD)\n` +
    `- Semantic content gap detection\n` +
    `- Robots.txt and sitemap.xml validation\n` +
    `- llms.txt presence and quality\n\n` +
    `## Related\n\n` +
    `- [Home / Master Analyzer](${SITE_ORIGIN}/) — runs AEO + 7 other tools at once\n` +
    `- [GEO Analyzer](${SITE_ORIGIN}/ads-analyzer)\n`,

  "/ads-analyzer": () =>
    `# FreeSiteAnalyzer — Google Ads Landing Page Analyzer\n\n` +
    `Analyzes any URL for Google Ads Landing Page Experience signals. Helps improve Quality Score, reduce CPC, and increase ad relevance.\n\n` +
    `## What it checks\n\n` +
    `- TTFB (Time to First Byte)\n` +
    `- CDN usage\n` +
    `- Cache headers\n` +
    `- Redirect chains\n` +
    `- HTTPS enforcement\n` +
    `- Mobile UX signals\n` +
    `- Real-user field data via CrUX API (LCP, CLS, INP, FCP, TTFB)\n` +
    `- Ad-copy ↔ landing-page keyword relevance checker\n\n` +
    `## Related\n\n` +
    `- [Home / Master Analyzer](${SITE_ORIGIN}/) — runs Ads LP + 7 other tools at once\n`,

  "/checkout": () =>
    `# FreeSiteAnalyzer — Checkout\n\n` +
    `Purchase a Basic (€19) or Pro (€29) access code. Payments are processed securely via myPOS.\n\n` +
    `## Plans\n\n` +
    `### Basic — €19 (one-time)\n` +
    `- 5 scan credits per access code\n` +
    `- Credits never expire\n` +
    `- Full audit data and all checks\n` +
    `- Basic PDF report (no fix instructions)\n\n` +
    `### Pro — €29 (one-time)\n` +
    `- 10 scan credits per access code\n` +
    `- Credits never expire\n` +
    `- Full audit data and all checks\n` +
    `- Copy-paste fix instructions and technical guides with code examples\n` +
    `- Pro PDF report\n\n` +
    `## How it works\n\n` +
    `1. Run an analysis on the main page first.\n` +
    `2. Choose Basic or Pro and click the relevant button.\n` +
    `3. Enter your name, email, and billing details.\n` +
    `4. Accept the terms and proceed to secure payment (myPOS hosted checkout).\n` +
    `5. After payment, a verification email is sent with your access code.\n` +
    `6. Enter the code in the main analyzer to unlock your tier and scan credits.\n\n` +
    `## No account required\n\n` +
    `FreeSiteAnalyzer has no user accounts or passwords. Your access code (e.g. PRO-7X9K2M) is the only credential. Store it safely — it works from any device.\n\n` +
    `## Legal\n\n` +
    `- [Terms of Service](${SITE_ORIGIN}/terms-of-service)\n` +
    `- [Privacy Policy](${SITE_ORIGIN}/privacy-policy)\n` +
    `- [Refund & Cancellation Policy](${SITE_ORIGIN}/refund-cancellation-policy)\n` +
    `- [Delivery & Fulfillment](${SITE_ORIGIN}/delivery-fulfillment)\n`,

  "/verify-email": () =>
    `# FreeSiteAnalyzer — Email Verification\n\n` +
    `After purchasing a Basic or Pro plan, a verification email is sent to the address provided at checkout. Click the link in the email to activate your access code and scan credits.\n\n` +
    `## What happens after verification\n\n` +
    `- Your access code is activated and scan credits become available.\n` +
    `- Return to the main analyzer, enter your access code, and run your scans.\n` +
    `- The code works from any browser or device — no login required.\n\n` +
    `## Didn't receive the email?\n\n` +
    `Check your spam folder. If it's not there after a few minutes, contact info@magicmarinac.hr with your order details.\n`,

  "/privacy-policy": () =>
    `# Privacy Policy\n\n` +
    `By using this application, you accept these privacy rules. We process personal data lawfully, fairly, and transparently, in line with GDPR and Croatian law.\n\n` +
    `## Protection and Security of Personal Data\n\n` +
    `Magićmarinac d.o.o. is the data controller and applies appropriate technical and organizational measures to protect personal data against unauthorized access, loss, misuse, or destruction.\n\n` +
    `Personal data means any information relating to an identified or identifiable natural person, and processing includes collection, storage, use, sharing, restriction, and deletion.\n\n` +
    `## How We Process Data\n\n` +
    `We collect data that users submit directly (for example, contact and service-request information), and limited technical data such as IP address, browser information, and interaction signals used for security and service quality.\n\n` +
    `We may use anti-abuse protection services to prevent spam and automated misuse. If we need to process data for a new purpose, we will request additional consent where required.\n\n` +
    `## Retention Period\n\n` +
    `Data retention depends on the processing purpose and legal obligations. Data processed on the basis of consent is retained while consent and purpose remain valid, or until consent is withdrawn.\n\n` +
    `After the retention period ends or the purpose no longer exists, data is deleted or anonymized, unless longer retention is required by law.\n\n` +
    `## Your Rights\n\n` +
    `You may request access, rectification, erasure, restriction, objection, or portability of your personal data, in accordance with GDPR.\n\n` +
    `Requests can be sent to info@magicmarinac.hr. We respond within the legally prescribed period and may request additional information to verify identity.\n\n` +
    `## Cookies and Analytics\n\n` +
    `We use essential cookies for core functionality and may use functional, analytics, or advertising cookies to improve user experience and understand usage patterns.\n\n` +
    `You can manage cookie preferences through your browser settings. Disabling certain cookies may limit some features.\n\n` +
    `## Business Identity and Contact\n\n` +
    `${COMPANY}\n\n` +
    `## Related Policies\n\n` +
    `- [Terms of Service](${SITE_ORIGIN}/terms-of-service)\n` +
    `- [Refund & Cancellation Policy](${SITE_ORIGIN}/refund-cancellation-policy)\n` +
    `- [Delivery & Fulfillment](${SITE_ORIGIN}/delivery-fulfillment)\n`,

  "/terms-of-service": () =>
    `# Terms of Service\n\n` +
    `By using this application and related services, users confirm they have read, understood, and accepted these terms.\n\n` +
    `## General Conditions\n\n` +
    `These terms govern access to and use of the application. Users must use the service lawfully and must not attempt to compromise security, availability, or data integrity.\n\n` +
    `We may update terms when needed to reflect legal, technical, or operational changes. Continued use after updates indicates acceptance of the revised terms.\n\n` +
    `## Intellectual Property\n\n` +
    `All published materials, software elements, branding, and content are protected by applicable copyright and related rights.\n\n` +
    `Without prior written permission, users may not copy, redistribute, modify, or commercially exploit protected content outside legally permitted use.\n\n` +
    `## Liability and Service Availability\n\n` +
    `The service is provided on an "as available" basis. We strive for reliability, but uninterrupted availability and error-free operation cannot always be guaranteed.\n\n` +
    `To the maximum extent permitted by law, we are not liable for indirect damages arising from temporary unavailability, third-party services, or circumstances beyond reasonable control.\n\n` +
    `## Personal Data Rights\n\n` +
    `Users may exercise rights related to personal data processing, including access, correction, deletion, restriction, objection, and portability where applicable.\n\n` +
    `For personal-data questions or rights requests, contact info@magicmarinac.hr.\n\n` +
    `## Right to Refund and Limitation of the Right of Withdrawal\n\n` +
    `Our services are digital services and digital reports delivered electronically. After a successful payment, the user may immediately start the scan, generate the report or download the purchased digital content.\n\n` +
    `If the user is a consumer, they generally have the right to withdraw from a distance contract within 14 days from the date the contract is concluded. However, when the user expressly agrees that the delivery of the digital service may begin immediately after payment and confirms that they understand that they lose the right of withdrawal once delivery has started, the right to a refund due to withdrawal ends when the generation, scanning, delivery or access to the digital report begins.\n\n` +
    `Due to the nature of digital reports, once a report has been generated, delivered, displayed to the user or made available for download, a refund is not available solely because the user changed their mind, entered incorrect information, is dissatisfied for reasons not caused by a technical error, or no longer wishes to use the report.\n\n` +
    `The user still has the right to request a refund or repeat performance of the service if the purchased digital report was not delivered, if it is unavailable due to a technical error, if the generation was unsuccessfully charged without delivery, or if the delivered service has a significant defect compared to the description of the purchased service.\n\n` +
    `Refund requests based on non-delivery, technical error or significant defect must be sent within 14 days of payment to info@magicmarinac.hr, together with the order details, the URL of the analyzed page, contact details and a short description of the issue.\n\n` +
    `Each request is reviewed individually. If the request is justified, we may offer to regenerate the report, correct the technical error, issue a partial refund or issue a full refund, depending on the circumstances of the case and the extent to which the service has been delivered.\n\n` +
    `Approved refunds are issued to the original payment method. We usually process refunds within 2 business days of approval, and no later than within the applicable statutory period where required.\n\n` +
    `Zagreb, March 2025.\n\n` +
    `## Business Identity and Contact\n\n` +
    `${COMPANY}\n\n` +
    `## Related Policies\n\n` +
    `- [Privacy Policy](${SITE_ORIGIN}/privacy-policy)\n` +
    `- [Refund & Cancellation Policy](${SITE_ORIGIN}/refund-cancellation-policy)\n` +
    `- [Delivery & Fulfillment](${SITE_ORIGIN}/delivery-fulfillment)\n`,

  "/refund-cancellation-policy": () =>
    `# Refund and Cancellation Policy\n\n` +
    `This policy explains cancellation and refund conditions for digital services provided through this application.\n\n` +
    `## Scope\n\n` +
    `Our services are digital and delivered electronically. By placing an order, users acknowledge that fulfillment can begin immediately after successful payment and required input submission.\n\n` +
    `Refund eligibility depends on whether the service has been delivered, whether work has started, and whether legal or contractual exceptions apply.\n\n` +
    `## Non-Delivery or Major Service Failure\n\n` +
    `If we fail to deliver the purchased digital service within the stated timeframe due to reasons under our control, users may request a proportionate refund or full refund depending on delivery status.\n\n` +
    `If only part of the service has been delivered, the refund amount may be adjusted based on the completed portion.\n\n` +
    `## User-Initiated Cancellation\n\n` +
    `Users may request cancellation before service execution starts. Once digital delivery has begun or a custom service has been substantially performed, cancellation rights may be limited.\n\n` +
    `Where legally required, any mandatory consumer rights under applicable law remain unaffected.\n\n` +
    `## How to Request a Refund or Cancellation\n\n` +
    `Submit your request by email to info@magicmarinac.hr with your order details, contact data, and reason for the request.\n\n` +
    `Each request is reviewed individually. We respond within 3 business days of receiving your request. When approved, refunds are issued to the original payment method within 2 business days of approval.\n\n` +
    `## Business Identity and Contact\n\n` +
    `${COMPANY}\n\n` +
    `## Related Policies\n\n` +
    `- [Terms of Service](${SITE_ORIGIN}/terms-of-service)\n` +
    `- [Privacy Policy](${SITE_ORIGIN}/privacy-policy)\n` +
    `- [Delivery & Fulfillment](${SITE_ORIGIN}/delivery-fulfillment)\n`,

  "/delivery-fulfillment": () =>
    `# Delivery and Fulfillment Policy\n\n` +
    `This policy describes how and when digital services are delivered after purchase.\n\n` +
    `## Digital Delivery Method\n\n` +
    `Services are delivered digitally via email, platform access, downloadable materials, or another agreed electronic channel.\n\n` +
    `No physical shipping is involved unless explicitly stated for a specific offer.\n\n` +
    `## Fulfillment Timing\n\n` +
    `Standard digital deliverables are typically provided within 1 to 5 business days after payment confirmation and receipt of all required project inputs.\n\n` +
    `For complex or custom work, timeline estimates are shared separately and fulfillment depends on scope, complexity, and user responsiveness.\n\n` +
    `## Client Responsibilities\n\n` +
    `Users are responsible for providing accurate information, required materials, and timely feedback needed for successful delivery.\n\n` +
    `Delays caused by missing or late user input may extend fulfillment timelines.\n\n` +
    `## Delivery Support and Issues\n\n` +
    `If you do not receive your deliverables within the expected timeframe, contact us at info@magicmarinac.hr so we can investigate and resolve the issue.\n\n` +
    `If a delivery issue cannot be reasonably resolved, available remedies will follow applicable law and our refund and cancellation policy.\n\n` +
    `## Business Identity and Contact\n\n` +
    `${COMPANY}\n\n` +
    `## Related Policies\n\n` +
    `- [Terms of Service](${SITE_ORIGIN}/terms-of-service)\n` +
    `- [Refund & Cancellation Policy](${SITE_ORIGIN}/refund-cancellation-policy)\n` +
    `- [Privacy Policy](${SITE_ORIGIN}/privacy-policy)\n`,
};

const NOT_FOUND_MD =
  `# 404 — Page Not Found\n\n` +
  `The requested page does not exist on FreeSiteAnalyzer.\n\n` +
  `## Available pages\n\n` +
  `- [Home / Master Analyzer](${SITE_ORIGIN}/)\n` +
  `- [Google Ads LP Analyzer](${SITE_ORIGIN}/ads-analyzer)\n` +
  `- [AEO Analyzer](${SITE_ORIGIN}/aeo-analyzer)\n` +
  `- [Checkout](${SITE_ORIGIN}/checkout)\n` +
  `- [Privacy Policy](${SITE_ORIGIN}/privacy-policy)\n` +
  `- [Terms of Service](${SITE_ORIGIN}/terms-of-service)\n` +
  `- [Refund & Cancellation Policy](${SITE_ORIGIN}/refund-cancellation-policy)\n` +
  `- [Delivery & Fulfillment](${SITE_ORIGIN}/delivery-fulfillment)\n\n` +
  `Append **?format=markdown** to any page URL to get its content as markdown.\n`;

export function getPageMarkdown(path: string): { body: string; found: boolean } {
  const clean = path.split("?")[0].replace(/\/$/, "") || "/";
  const fn = pages[clean];
  if (fn) return { body: fn(), found: true };
  return { body: NOT_FOUND_MD, found: false };
}

export function wantsMarkdown(req: { headers: Record<string, string | string[] | undefined>; query: Record<string, string | string[] | undefined> }): boolean {
  const accept = String(req.headers["accept"] ?? "");
  const fmt = String(req.query["format"] ?? "");
  return fmt === "markdown" || accept.includes("text/markdown");
}
