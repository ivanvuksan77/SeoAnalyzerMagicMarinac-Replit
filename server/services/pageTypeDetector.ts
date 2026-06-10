import * as cheerio from "cheerio";
import { safeFetchHtmlWithFallback } from "./browserFetch";
import type { PageType, PageTypeDetectionResult } from "@shared/schema";

class PageTypeDetector {
  async detect(url: string): Promise<PageTypeDetectionResult> {
    let html: string;
    try {
      html = await safeFetchHtmlWithFallback(url);
    } catch {
      return this.detectFromUrl(url);
    }

    const $ = cheerio.load(html);
    const urlObj = new URL(url);
    const path = urlObj.pathname.toLowerCase();

    const scores: Record<PageType, number> = {
      homepage: 0, service: 0, product: 0, category: 0,
      blog: 0, contact: 0, landing: 0, other: 0,
    };
    const signals: string[] = [];

    // ── URL path signals ──────────────────────────────────────────
    if (path === '/' || path === '' || /^\/(en|hr|de|fr|es|it|pt|nl|pl|ru|ja|zh)\/?$/.test(path)) {
      scores.homepage += 50;
      signals.push('URL is root / language root');
    }
    if (/\/(service|services|what-we-do|solutions|offering|our-work)\b/.test(path)) {
      scores.service += 40;
      signals.push('URL contains service segment');
    }
    if (/\/(product|products|item)\b/.test(path) && !/\/(products|shop)\/?$/.test(path)) {
      scores.product += 40;
      signals.push('URL contains product segment');
    }
    if (/\/(blog|article|post|news|guide|tutorial|insight)\b/.test(path)) {
      scores.blog += 40;
      signals.push('URL contains blog/article segment');
    }
    if (/\/(contact|kontakt|contact-us|reach-us|get-in-touch)\b/.test(path)) {
      scores.contact += 50;
      signals.push('URL contains contact segment');
    }
    if (/\/(category|cat|collection|shop|store|products)\b/.test(path) && !/\/(product|item)\//.test(path)) {
      scores.category += 35;
      signals.push('URL contains category/shop segment');
    }
    if (/\/(lp|landing|promo|campaign|offer|trial|signup|sign-up|download)\b/.test(path)) {
      scores.landing += 40;
      signals.push('URL contains landing page segment');
    }

    // ── JSON-LD schema.org signals ────────────────────────────────
    $('script[type="application/ld+json"]').each((_, el) => {
      try {
        const data = JSON.parse($(el).html() || '');
        const entries = Array.isArray(data) ? data : [data];
        for (const entry of entries) {
          const type = (entry['@type'] || '').toString().toLowerCase();
          if (!type) continue;

          if (['organization', 'localbusiness', 'website', 'sitenavigationelement'].some(t => type.includes(t))) {
            scores.homepage += 30;
            signals.push(`JSON-LD: ${entry['@type']}`);
          }
          if (type.includes('product')) {
            scores.product += 50;
            signals.push('JSON-LD Product schema');
          }
          if (['article', 'blogposting', 'newsarticle', 'technicalarticle'].some(t => type.includes(t))) {
            scores.blog += 50;
            signals.push(`JSON-LD Article: ${entry['@type']}`);
          }
          if (type.includes('contactpage')) {
            scores.contact += 30;
            signals.push('JSON-LD ContactPage');
          }
          if (type.includes('service')) {
            scores.service += 30;
            signals.push('JSON-LD Service schema');
          }
          if (type.includes('faqpage')) {
            scores.blog += 10;
            scores.service += 10;
            signals.push('JSON-LD FAQPage schema');
          }
          if (type.includes('event') || type.includes('course') || type.includes('offer')) {
            scores.landing += 15;
          }
        }
      } catch { /* ignore malformed JSON-LD */ }
    });

    // ── Product/commerce signals ──────────────────────────────────
    const bodyText = $('body').text();
    const bodyLower = bodyText.toLowerCase();

    const hasPriceEl = $('[class*="price"], [id*="price"], [itemprop="price"], .price, #price').length > 0
      || /[\$€£]\s*\d+|\d+\s*(usd|eur|gbp|kn|hrk)/i.test(bodyText);
    if (hasPriceEl) {
      scores.product += 20;
      scores.landing += 8;
      signals.push('Price indicators found');
    }

    const hasAddToCart = $('[class*="add-to-cart"], [class*="addtocart"], button[name="add"], [data-action*="cart"]').length > 0
      || /add\s*(to\s*)?(cart|basket|bag)|buy\s*now/i.test(bodyText);
    if (hasAddToCart) {
      scores.product += 30;
      signals.push('Add-to-cart/Buy-now button found');
    }

    const productCards = $('[class*="product-card"], [class*="product-item"], [class*="product-tile"], [class*="item-card"]').length;
    if (productCards >= 4) {
      scores.category += 40;
      signals.push(`${productCards} product cards (category)`);
    } else if (productCards >= 2) {
      scores.category += 20;
    }

    const hasFilters = $('[class*="filter"], [class*="facet"], select[name*="sort"]').length > 0;
    if (hasFilters) {
      scores.category += 15;
      signals.push('Filter/sort controls');
    }

    // ── Blog/article signals ──────────────────────────────────────
    const hasAuthor = $('[rel="author"], .author, .byline, [class*="author"], [itemprop="author"]').length > 0;
    const hasDate = $('time[datetime], [itemprop="datePublished"], [class*="publish-date"], [class*="post-date"]').length > 0;
    if (hasAuthor) { scores.blog += 20; signals.push('Author attribution found'); }
    if (hasDate) { scores.blog += 15; signals.push('Publication date found'); }

    const articleText = ($('article, main, [role="main"]').first().text() || bodyText);
    const wordCount = articleText.split(/\s+/).filter(w => w.length > 2).length;
    if (wordCount >= 600) {
      scores.blog += 15;
      signals.push(`Long-form content: ${wordCount} words`);
    }

    const articleEl = $('article').length;
    if (articleEl > 0) {
      scores.blog += 20;
      signals.push('Article element found');
    }

    // ── Contact page signals ──────────────────────────────────────
    const hasEmailInput = $('input[type="email"]').length > 0;
    const hasTextarea = $('textarea').length > 0;
    const hasContactKeyword = /contact\s*us|get\s*in\s*touch|reach\s*us|write\s*to\s*us/i.test(bodyText);
    const hasPhone = /(\+\d{1,3}[\s.-]?)?\(?\d{3}\)?[\s.-]?\d{3}[\s.-]?\d{4}/.test(bodyText);
    const hasMap = $('iframe[src*="maps.google"], iframe[src*="google.com/maps"], [class*="-map"]').length > 0;
    const hasAddress = $('[itemprop="address"], address').length > 0;

    if (hasEmailInput && hasTextarea) { scores.contact += 30; signals.push('Contact form detected'); }
    if (hasContactKeyword) { scores.contact += 20; signals.push('Contact keyword in content'); }
    if (hasPhone) { scores.contact += 15; signals.push('Phone number found'); }
    if (hasMap) { scores.contact += 20; signals.push('Map embed found'); }
    if (hasAddress) { scores.contact += 15; signals.push('Address markup found'); }

    // ── Landing page signals ──────────────────────────────────────
    const navLinks = $('nav a, header a').length;
    const ctaButtons = $('[class*="cta"], .btn-primary, [class*="hero"] button, a[href*="trial"], a[href*="signup"]').length;
    if (navLinks <= 3 && navLinks > 0) { scores.landing += 15; signals.push('Minimal navigation'); }
    if (ctaButtons >= 2) { scores.landing += 20; signals.push(`${ctaButtons} CTA buttons found`); }
    if (hasEmailInput && !hasTextarea) { scores.landing += 15; signals.push('Lead capture email input'); }

    const urgencyTerms = /limited\s*time|expires|only\s+\d+\s*left|free\s+trial|sign\s*up\s*(for\s*)?free/i.test(bodyText);
    if (urgencyTerms) { scores.landing += 10; signals.push('Urgency/CTA copy found'); }

    // ── Service page signals ──────────────────────────────────────
    const serviceHeadings = $('h2, h3').map((_, el) => $(el).text().toLowerCase()).get().join(' ');
    const serviceKw = ['our services', 'what we do', 'how it works', 'our process', 'our expertise', 'why choose', 'benefits'];
    const matchedSvc = serviceKw.filter(kw => serviceHeadings.includes(kw) || bodyLower.includes(kw));
    if (matchedSvc.length >= 2) {
      scores.service += 25;
      signals.push(`Service headings: ${matchedSvc.slice(0, 2).join(', ')}`);
    }

    // ── Homepage signals ──────────────────────────────────────────
    const navCount = $('nav a, header nav a').length;
    const hasHero = $('[class*="hero"], [id*="hero"], [class*="banner"], [id*="banner"]').length > 0;
    const hasTestimonials = $('[class*="testimonial"], [class*="review"], [class*="client"]').length > 0;
    if (navCount >= 5) { scores.homepage += 15; signals.push('Broad navigation menu'); }
    if (hasHero) { scores.homepage += 10; signals.push('Hero section found'); }
    if (hasTestimonials) { scores.homepage += 10; signals.push('Testimonials/reviews section'); }

    // ── Determine winner ─────────────────────────────────────────
    const sorted = (Object.entries(scores) as [PageType, number][]).sort((a, b) => b[1] - a[1]);
    const [topType, topScore] = sorted[0];
    const secondScore = sorted[1]?.[1] ?? 0;

    const confidence: 'high' | 'medium' | 'low' =
      topScore >= 60 && (topScore - secondScore) >= 20 ? 'high' :
      topScore >= 30 ? 'medium' : 'low';

    const detectedType: PageType = topScore < 15 ? 'other' : topType;

    return {
      detectedType,
      confidence,
      signals: signals.slice(0, 6),
    };
  }

  private detectFromUrl(url: string): PageTypeDetectionResult {
    const path = new URL(url).pathname.toLowerCase();
    if (path === '/' || path === '') return { detectedType: 'homepage', confidence: 'medium', signals: ['Root URL'] };
    if (/\/(contact|kontakt)/.test(path)) return { detectedType: 'contact', confidence: 'medium', signals: ['Contact URL'] };
    if (/\/(blog|article|post|news)/.test(path)) return { detectedType: 'blog', confidence: 'medium', signals: ['Blog URL'] };
    if (/\/(product|item|buy)/.test(path)) return { detectedType: 'product', confidence: 'medium', signals: ['Product URL'] };
    if (/\/(service|services)/.test(path)) return { detectedType: 'service', confidence: 'medium', signals: ['Service URL'] };
    if (/\/(shop|category|collection)/.test(path)) return { detectedType: 'category', confidence: 'medium', signals: ['Category URL'] };
    if (/\/(lp|landing|promo|campaign)/.test(path)) return { detectedType: 'landing', confidence: 'medium', signals: ['Landing URL'] };
    return { detectedType: 'other', confidence: 'low', signals: ['URL pattern unclear'] };
  }
}

export const pageTypeDetector = new PageTypeDetector();
