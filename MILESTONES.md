# SiteSnap — Product Milestones

Living roadmap. Items are ordered by ROI, not chronology — pick the smallest unblocking
milestone next, ship it, re-evaluate. Keep this file in lockstep with `replit.md`
when scope changes.

---

## Where the product is today (May 2026)

**Strengths**
- 8 parallel analyzers in one click: SEO, AEO, GEO, Ads LPE, Ad Relevance,
  comparisons, site tools, PDF reports.
- Bilingual EN/HR — real moat in the Croatian/Balkan market.
- Tier rules are clear: Free = teaser (score + 3 findings + CTA),
  Basic €19 = full data without fixes, Pro €29 = full data + fix instructions.
- myPOS payment + Firestore-backed access codes work end-to-end.
- Bot-blocking fix landed (decode.agency-class WAF sites now scan reliably).

**Gaps the roadmap addresses**
- No email capture → no remarketing list, no recurring revenue path.
- One-shot purchases only → no LTV beyond first sale.
- No scan history / no agency dashboard / no scheduled re-scans → nothing to come back for.
- Performance scores in SEO analyzer are hardcoded (CrUX wired only in Ads).
- PDFs live in `/tmp` and evaporate on restart.
- Single-page scans only (no sitemap-based crawl).

---

## Milestone 1 — Plug the leak (4–6 weeks)

**Goal:** stop access-code sharing from quietly capping revenue, and turn every
buyer into a marketable contact.

### M1.1 Email-claim on access codes  *(highest ROI, smallest effort)*
- At redemption, the first email that uses a code claims it.
- Subsequent emails get a friendly "this code is already in use" error.
- Email is captured at checkout (already collected — just bind it).
- Adds one column to the access-code store; no real auth yet.

**Done looks like**
- Sharing a code with a colleague no longer works.
- Every paying customer is in a queryable email list (en + hr consent flags).

### M1.2 Real Lighthouse / CrUX in SEO score
- `seoAnalyzer.analyzePerformanceSimple` returns static LCP/CLS today.
- `cruxClient.ts` already exists and works in `adsAnalyzer`.
- Reuse it in SEO so the headline score is defensible vs PageSpeed Insights.

### M1.3 Persistent PDF storage
- Move generated PDFs from `/tmp/pdf-links` to durable storage
  (Postgres bytea column for the MVP, S3/R2 later).
- Permalinks survive server restarts and redeploys.

---

## Milestone 2 — Make it recurring (6–10 weeks)

**Goal:** convert one-shot buyers into monthly subscribers. Single biggest
revenue lever in the whole roadmap.

### M2.1 Magic-link login (no passwords)
- Email + one-time link → session.
- Replaces "paste your access code" UX with "log in to your reports."
- Migrate existing access codes to user accounts on first login.

### M2.2 Scan history per account
- Every scan is saved against the user's account.
- Dashboard lists past scans with score deltas vs previous run.

### M2.3 Subscription tier — €19/mo
- Stripe (or myPOS recurring if available) subscription product.
- Includes: 30 scans/month, weekly auto re-scan of saved sites,
  email alert when a site's score drops by ≥5 points.
- Existing one-shot Basic/Pro stay available for non-recurring buyers.

### M2.4 Bilingual transactional emails
- Welcome, magic link, scan-complete, score-drop alert, receipt.
- en + hr templates. Match existing i18n tone.

---

## Milestone 3 — Sell to agencies (8–12 weeks)

**Goal:** unlock the buyer segment that pays 5–10× more per seat. Croatian and
regional agencies are the obvious wedge.

### M3.1 Multi-site portfolio dashboard
- Group saved sites into "clients" / workspaces.
- Aggregate score view across all client sites at a glance.

### M3.2 Multi-page crawl (sitemap-based)
- Scan top N pages from a site's sitemap (configurable, e.g. 25/50/100).
- Aggregate scores per template/page-type.
- Closes the biggest credibility gap vs Ahrefs/SEMrush.

### M3.3 White-label PDF + agency tier — €99/mo
- Custom logo, custom cover page, custom color in PDFs.
- Up to 5 client sites, weekly auto re-scans for all of them.
- 200 scans/month pool.

### M3.4 Competitor watchlist
- Per saved site, track 1–3 competitors with weekly comparison.
- Alert on "competitor just added FAQ schema" / "competitor's score overtook yours."
- Reuses existing compare-* endpoints; no new analyzer code.

---

## Milestone 4 — Distribution & API (10+ weeks)

**Goal:** stop being just a website. Let other tools embed your scanner.

### M4.1 Public REST API
- Auth via API key (one per account).
- Endpoints: `POST /api/v1/scan/seo`, `/aeo`, `/geo`, `/ads`, `/compare`.
- Quota = subscription scan pool.

### M4.2 Zapier integration
- Triggers: scan complete, score dropped, weekly summary.
- Actions: run scan, get latest report URL.

### M4.3 SERP rank tracking *(optional, paid data)*
- Track top 10 keywords per site.
- DataForSEO or similar (~€0.0006 / query, sustainable at agency tier).

---

## Explicitly out of scope

These came up and were rejected on purpose. Re-open only with new evidence.

- More analyzer types — depth > breadth from here.
- WordPress plugin — support burden too high for a small team.
- AI-generated content rewrites — crowded space, hallucination risk on client sites.
- Free SERP tracking — the API costs make it untenable below the agency tier.

---

## Measurement

Track at least these to know whether each milestone earned its place:

- **M1 success:** % of access codes claimed by a unique email; size of marketable
  contact list; conversion from free scan → paid scan.
- **M2 success:** MRR; one-shot → subscription conversion %; subscription churn.
- **M3 success:** ARPU on agency tier; logos signed; multi-site scans / week.
- **M4 success:** API key activations; partner integrations live.

---

## Cross-cutting hard rules

- **Every UI string ships in EN and HR.** No exceptions, no English-only screens.
- **Tier semantics are sacred:** Free = score + 3 findings/section + CTA;
  Basic = ALL data, NO fixes; Pro = ALL data + fixes. New features must declare
  which tier they belong to before merging.
- **`JOKERKREDIT` admin code keeps unlimited Pro access** for internal use.
- **Pricing locked:** Basic €19 / Pro €29 one-shot, €19/mo subscription target.
  Don't quietly drift these without an explicit decision.
