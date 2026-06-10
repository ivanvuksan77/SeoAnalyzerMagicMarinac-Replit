import puppeteer from "puppeteer";
import lighthouse from "lighthouse";
import * as cheerio from "cheerio";
import { safeFetchHtmlWithFallback } from "./browserFetch";
import { 
  AnalysisResults, 
  TechnicalSeoCheck, 
  PerformanceMetrics, 
  AccessibilityCheck, 
  KeywordAnalysis, 
  ContentQuality,
  SeoRecommendation,
  InsertSeoAnalysis 
} from "@shared/schema";
import { extractMainContent, countSyllables, isContentWord, computeReadabilityScore } from "./contentExtractor";

// Helper function to determine priority based on status
function getPriorityByStatus(status: string): "Excellent" | "Good" | "Medium" | "Critical" {
  switch (status) {
    case "PASS":
      return "Excellent";
    case "WARNING":
      return "Medium";
    case "FAIL":
      return "Critical";
    default:
      return "Medium";
  }
}

class SeoAnalyzer {
  private lang: string = 'en';
  private pageType: string = 'other';
  private L(en: string, hr: string): string { return this.lang === 'hr' ? hr : en; }

  async analyzeWebsite(url: string, lang: string = 'en', pageType: string = 'other'): Promise<InsertSeoAnalysis> {
    this.lang = lang;
    this.pageType = pageType;
    // Try to fetch the page content using a simple HTTP request first
    let html: string;
    let $ : cheerio.CheerioAPI;
    
    try {
      html = await safeFetchHtmlWithFallback(url);
      $ = cheerio.load(html);
      
      // Perform all analysis types using just the HTML content
      const [
        technicalChecks,
        performanceMetrics,
        accessibilityChecks,
        keywordAnalysis,
        contentQuality,
        lighthouseResults
      ] = await Promise.all([
        this.analyzeTechnicalSeo($, url, null),
        this.analyzePerformanceSimple(url),
        this.analyzeAccessibility($, null),
        this.analyzeKeywords($),
        this.analyzeContent($),
        this.runLighthouseSimple(url)
      ]);

      const results: AnalysisResults = {
        technical: technicalChecks,
        performance: performanceMetrics,
        accessibility: accessibilityChecks,
        keyword: keywordAnalysis,
        content: contentQuality,
        lighthouse: lighthouseResults
      };

      // Calculate scores
      const technicalScore = this.calculateTechnicalScore(technicalChecks);
      const performanceScore = Math.round(performanceMetrics.lighthouseScore);
      const accessibilityScore = this.calculateAccessibilityScore(accessibilityChecks);
      const keywordScore = this.calculateKeywordScore(keywordAnalysis);
      const contentScore = this.calculateContentScore(contentQuality);
      
      const overallScore = Math.round(
        (technicalScore + performanceScore + accessibilityScore + keywordScore + contentScore) / 5
      );

      // Generate recommendations
      const recommendations = this.generateRecommendations(results);

      return {
        url,
        overallScore,
        technicalScore,
        performanceScore,
        accessibilityScore,
        keywordScore,
        contentScore,
        results,
        recommendations
      };
      
    } catch (error) {
      console.error('Error analyzing website:', error);
      throw error;
    }
  }

  private async analyzeTechnicalSeo($: cheerio.CheerioAPI, url: string, page: any | null): Promise<TechnicalSeoCheck[]> {
    const checks: TechnicalSeoCheck[] = [];
    
    // Check robots.txt
    try {
      const robotsUrl = new URL('/robots.txt', url).href;
      const robotsResponse = await fetch(robotsUrl);
      const robotsStatus = robotsResponse.ok ? "PASS" : "FAIL";
      checks.push({
        name: "Robots.txt",
        status: robotsStatus,
        details: robotsResponse.ok
          ? this.L("Valid robots.txt file found", "Pronađena važeća datoteka robots.txt")
          : this.L("Robots.txt not found", "Robots.txt nije pronađen"),
        priority: getPriorityByStatus(robotsStatus),
        category: this.L("Technical SEO", "Tehnički SEO"),
        action: robotsStatus === "PASS"
          ? this.L("Perfect!", "Savršeno!")
          : this.L(
              "Create a robots.txt file in your root directory:\n\nUser-agent: *\nAllow: /\n\nSitemap: https://yourdomain.com/sitemap.xml",
              "Kreirajte datoteku robots.txt u korijenskom direktoriju:\n\nUser-agent: *\nAllow: /\n\nSitemap: https://yourdomain.com/sitemap.xml"
            )
      });
    } catch {
      const robotsErrorStatus = "FAIL";
      checks.push({
        name: "Robots.txt",
        status: robotsErrorStatus,
        details: this.L("Unable to access robots.txt", "Nije moguće pristupiti robots.txt"),
        priority: getPriorityByStatus(robotsErrorStatus),
        category: this.L("Technical SEO", "Tehnički SEO"),
        action: this.L(
          "Ensure your robots.txt is accessible at /robots.txt. Check your server configuration and make sure the file is not blocked by permissions or .htaccess rules.",
          "Provjerite je li robots.txt dostupan na /robots.txt. Provjerite konfiguraciju poslužitelja i osigurajte da datoteka nije blokirana dozvolama ili .htaccess pravilima."
        )
      });
    }

    // Check sitemap
    try {
      const sitemapUrl = new URL('/sitemap.xml', url).href;
      const sitemapResponse = await fetch(sitemapUrl);
      const sitemapStatus = sitemapResponse.ok ? "PASS" : "WARNING";
      checks.push({
        name: "XML Sitemap",
        status: sitemapStatus,
        details: sitemapResponse.ok
          ? this.L("XML sitemap found", "Pronađen XML sitemap")
          : this.L("XML sitemap not found at standard location", "XML sitemap nije pronađen na standardnoj lokaciji"),
        priority: getPriorityByStatus(sitemapStatus),
        category: this.L("Technical SEO", "Tehnički SEO"),
        action: sitemapStatus === "PASS"
          ? this.L("Great!", "Odlično!")
          : this.L(
              "Create a sitemap.xml file:\n\n<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n  <url>\n    <loc>https://yourdomain.com/</loc>\n    <lastmod>2024-01-01</lastmod>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n\nSubmit it to Google Search Console.",
              "Kreirajte datoteku sitemap.xml:\n\n<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n  <url>\n    <loc>https://yourdomain.com/</loc>\n    <lastmod>2024-01-01</lastmod>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n\nPošaljite ga u Google Search Console."
            )
      });
    } catch {
      const sitemapErrorStatus = "WARNING";
      checks.push({
        name: "XML Sitemap",
        status: sitemapErrorStatus,
        details: this.L("Unable to access sitemap", "Nije moguće pristupiti sitemapu"),
        priority: getPriorityByStatus(sitemapErrorStatus),
        category: this.L("Technical SEO", "Tehnički SEO"),
        action: this.L(
          "Add this line to your robots.txt:\n\nSitemap: https://yourdomain.com/sitemap.xml",
          "Dodajte ovaj redak u robots.txt:\n\nSitemap: https://yourdomain.com/sitemap.xml"
        )
      });
    }

    // Check meta tags
    const metaTitle = $('title').text();
    const pageTitleStatus = metaTitle.length > 0 ? "PASS" : "FAIL";
    checks.push({
      name: this.L("Page Title", "Naslov stranice"),
      status: pageTitleStatus,
      details: metaTitle.length > 0
        ? `${this.L("Title", "Naslov")}: "${metaTitle}"`
        : this.L("Missing page title", "Nedostaje naslov stranice"),
      priority: getPriorityByStatus(pageTitleStatus),
      category: this.L("Technical SEO", "Tehnički SEO"),
      action: pageTitleStatus === "PASS"
        ? this.L("Excellent!", "Izvrsno!")
        : this.L(
            "Add a descriptive title tag (50-60 characters) to your <head>:\n\n<title>Your Primary Keyword - Brand Name</title>",
            "Dodajte opisni naslov (50-60 znakova) u <head>:\n\n<title>Vaša Ključna Riječ - Naziv Branda</title>"
          )
    });

    const metaDescription = $('meta[name="description"]').attr('content');
    const metaDescStatus = metaDescription ? "PASS" : "FAIL";
    checks.push({
      name: this.L("Meta Description", "Meta opis"),
      status: metaDescStatus,
      details: metaDescription
        ? `${this.L("Description length", "Duljina opisa")}: ${metaDescription.length}`
        : this.L("Missing meta description", "Nedostaje meta opis"),
      priority: getPriorityByStatus(metaDescStatus),
      category: this.L("Technical SEO", "Tehnički SEO"),
      action: metaDescStatus === "PASS"
        ? this.L("Perfect!", "Savršeno!")
        : this.L(
            "Add a compelling meta description (150-160 characters):\n\n<meta name=\"description\" content=\"Your compelling page description with primary keyword. Include a call to action.\">",
            "Dodajte privlačan meta opis (150-160 znakova):\n\n<meta name=\"description\" content=\"Vaš privlačan opis stranice s primarnom ključnom riječju. Uključite poziv na akciju.\">"
          )
    });

    const contentText = extractMainContent($);
    const wordCount = contentText.split(/\s+/).length;
    const contentWordThreshold = this.pageType === 'contact' ? 50
      : this.pageType === 'landing' || this.pageType === 'category' ? 100
      : this.pageType === 'product' ? 100
      : this.pageType === 'blog' ? 500
      : 300;
    const contentLengthStatus = wordCount > contentWordThreshold ? "PASS" : "WARNING";
    checks.push({
      name: this.L("Content Length", "Duljina sadržaja"),
      status: contentLengthStatus,
      details: this.lang === 'hr' ? `Stranica sadrži ${wordCount} riječi` : `Page contains ${wordCount} words`,
      priority: getPriorityByStatus(contentLengthStatus),
      category: this.L("Technical SEO", "Tehnički SEO"),
      action: contentLengthStatus === "PASS"
        ? this.L("Great Length!", "Odlična duljina!")
        : this.L(
            "Your page has insufficient content. Aim for at least 300 words of unique, valuable content. Pages with 1,000+ words typically rank better for competitive keywords.",
            "Vaša stranica ima nedovoljno sadržaja. Nastojte imati barem 300 riječi jedinstvenog, vrijednog sadržaja. Stranice s 1.000+ riječi obično se bolje rangiraju za konkurentne ključne riječi."
          )
    });

    // Check heading structure - comprehensive hierarchy check
    const h1Count = $('h1').length;
    const h2Count = $('h2').length;
    const h3Count = $('h3').length;
    const h4Count = $('h4').length;
    const h5Count = $('h5').length;
    const h6Count = $('h6').length;
    
    const h1Status = h1Count === 1 ? "PASS" : h1Count === 0 ? "FAIL" : "WARNING";
    checks.push({
      name: this.L("H1 Tags", "H1 tagovi"),
      status: h1Status,
      details: this.lang === 'hr'
        ? `Pronađeno ${h1Count} H1 tag${h1Count !== 1 ? 'ova' : ''}`
        : `${h1Count} H1 tag${h1Count !== 1 ? 's' : ''} found`,
      priority: getPriorityByStatus(h1Status),
      category: this.L("Technical SEO", "Tehnički SEO"),
      action: h1Status === "PASS"
        ? this.L("Great!", "Odlično!")
        : this.L(
            "Add a single H1 tag containing your primary keyword:\n\n<h1>Your Primary Keyword and Page Topic</h1>\n\nOnly use one H1 per page.",
            "Dodajte jedan H1 tag koji sadrži vašu primarnu ključnu riječ:\n\n<h1>Vaša Primarna Ključna Riječ i Tema Stranice</h1>\n\nKoristite samo jedan H1 po stranici."
          )
    });

    const hierarchyStatus = h2Count > 0 || h3Count > 0 ? "PASS" : "WARNING";
    checks.push({
      name: this.L("Heading Hierarchy", "Hijerarhija naslova"),
      status: hierarchyStatus,
      details: this.lang === 'hr'
        ? `Stranica organizirana s H2 (${h2Count}), H3 (${h3Count}), H4 (${h4Count}), H5 (${h5Count}), H6 (${h6Count})`
        : `Page organized with H2s (${h2Count}), H3s (${h3Count}), H4s (${h4Count}), H5s (${h5Count}), H6s (${h6Count})`,
      priority: getPriorityByStatus(hierarchyStatus),
      category: this.L("Technical SEO", "Tehnički SEO"),
      action: hierarchyStatus === "PASS"
        ? this.L("Excellent!", "Izvrsno!")
        : this.L(
            "Structure your headings in proper hierarchy:\n\n<h1>Main Topic</h1>\n  <h2>Subtopic 1</h2>\n    <h3>Detail</h3>\n  <h2>Subtopic 2</h2>\n\nNever skip heading levels (e.g., H1 to H3).",
            "Strukturirajte naslove u odgovarajuću hijerarhiju:\n\n<h1>Glavna Tema</h1>\n  <h2>Podtema 1</h2>\n    <h3>Detalj</h3>\n  <h2>Podtema 2</h2>\n\nNikada ne preskačite razine naslova (npr. H1 na H3)."
          )
    });

    // Check for lists and content structure
    const bulletLists = $('ul').length;
    const numberedLists = $('ol').length;
    const organizationStatus = (bulletLists + numberedLists) > 0 ? "PASS" : "WARNING";
    checks.push({
      name: this.L("Content Organization", "Organizacija sadržaja"),
      status: organizationStatus,
      details: this.lang === 'hr'
        ? `Pronađeno ${bulletLists} popis${bulletLists !== 1 ? 'a' : ''} s točkama, ${numberedLists} numerirani popis${numberedLists !== 1 ? 'a' : ''}`
        : `${bulletLists} bullet lists, ${numberedLists} numbered lists found`,
      priority: getPriorityByStatus(organizationStatus),
      category: this.L("Technical SEO", "Tehnički SEO"),
      action: organizationStatus === "PASS"
        ? this.L("Perfect!", "Savršeno!")
        : this.L(
            "Break up content with lists and structured elements:\n\n<ul>\n  <li>Key point 1</li>\n  <li>Key point 2</li>\n</ul>\n\nUse <ol> for steps and <ul> for features/benefits.",
            "Razbijte sadržaj listama i strukturiranim elementima:\n\n<ul>\n  <li>Ključna točka 1</li>\n  <li>Ključna točka 2</li>\n</ul>\n\nKoristite <ol> za korake i <ul> za značajke/prednosti."
          )
    });

    // Check images alt tags and content break-up
    const images = $('img');
    const imagesWithAlt = $('img[alt]');
    const altTagPercentage = images.length > 0 ? Math.round((imagesWithAlt.length / images.length) * 100) : 100;
    
    const imageBreakupStatus = images.length >= 1 ? "PASS" : "WARNING";
    checks.push({
      name: this.L("Images to Break Up Text", "Slike za razbijanje teksta"),
      status: imageBreakupStatus,
      details: this.lang === 'hr'
        ? `Pronađeno ${images.length} slika za razbijanje tekstualnog sadržaja`
        : `${images.length} images found to break up text content`,
      priority: getPriorityByStatus(imageBreakupStatus),
      category: this.L("Technical SEO", "Tehnički SEO"),
      action: imageBreakupStatus === "PASS"
        ? this.L("Great!", "Odlično!")
        : this.L(
            "Add relevant images between text blocks to improve engagement. Place at least one image per 300 words of content.",
            "Dodajte relevantne slike između blokova teksta za poboljšanje angažmana. Postavite barem jednu sliku na svakih 300 riječi sadržaja."
          )
    });

    const altTagStatus = altTagPercentage >= 80 ? "PASS" : altTagPercentage >= 50 ? "WARNING" : "FAIL";
    checks.push({
      name: this.L("Image Alt Tags", "Alt oznake slika"),
      status: altTagStatus,
      details: this.lang === 'hr'
        ? `${altTagPercentage}% slika ima alt oznake (${imagesWithAlt.length}/${images.length})`
        : `${altTagPercentage}% of images have alt tags (${imagesWithAlt.length}/${images.length})`,
      priority: getPriorityByStatus(altTagStatus),
      category: this.L("Technical SEO", "Tehnički SEO"),
      action: altTagStatus === "PASS"
        ? this.L("Excellent!", "Izvrsno!")
        : this.L(
            "Add descriptive alt text to all images:\n\n<img src=\"photo.jpg\" alt=\"Descriptive text about the image content\">\n\nMake alt text specific and include keywords naturally.",
            "Dodajte opisni alt tekst svim slikama:\n\n<img src=\"photo.jpg\" alt=\"Opisni tekst o sadržaju slike\">\n\nNeka alt tekst bude specifičan i prirodno uključuje ključne riječi."
          )
    });

    // Check for keyword and meta filenames
    const imageFilenames = images.map((i, img) => $(img).attr('src')).get();
    const descriptiveFilenames = imageFilenames.filter(src => src && !src.includes('IMG_') && !src.includes('image') && src.length > 10).length;
    const filenamesStatus = images.length === 0 || descriptiveFilenames / images.length >= 0.5 ? "PASS" : "WARNING";
    checks.push({
      name: this.L("Keyword and Meta Filenames", "Opisni nazivi datoteka"),
      status: filenamesStatus,
      details: this.lang === 'hr'
        ? `${descriptiveFilenames}/${images.length} slika ima opisne nazive datoteka`
        : `${descriptiveFilenames}/${images.length} images have descriptive filenames`,
      priority: getPriorityByStatus(filenamesStatus),
      category: this.L("Technical SEO", "Tehnički SEO"),
      action: filenamesStatus === "PASS"
        ? this.L("Perfect!", "Savršeno!")
        : this.L(
            "Rename images with descriptive, keyword-rich filenames:\n\nBad: IMG_001.jpg\nGood: blue-running-shoes-side-view.jpg\n\nUse hyphens between words, lowercase letters only.",
            "Preimenujte slike opisnim, ključnim riječima bogatim nazivima:\n\nLoše: IMG_001.jpg\nDobro: plave-tenisice-za-trcanje-sa-strane.jpg\n\nKoristite crtice između riječi, samo mala slova."
          )
    });

    // Check for information accuracy indicators
    const lastModified = $('meta[name="last-modified"], meta[property="article:modified_time"]').attr('content');
    const dateElements = $('time, .date, .updated, [datetime]').length;
    const accuracyStatus = lastModified || dateElements > 0 ? "PASS" : "WARNING";
    checks.push({
      name: this.L("Information Accurate and Up to Date", "Točnost i ažurnost informacija"),
      status: accuracyStatus,
      details: lastModified
        ? `${this.L("Last modified", "Zadnja izmjena")}: ${lastModified}`
        : this.lang === 'hr'
          ? `Pronađeno ${dateElements} datumskih elemenata`
          : `${dateElements} date elements found`,
      priority: getPriorityByStatus(accuracyStatus),
      category: this.L("Technical SEO", "Tehnički SEO"),
      action: accuracyStatus === "PASS"
        ? this.L("Up to Date!", "Ažurirano!")
        : this.L(
            "Add a publication or last-modified date:\n\n<meta property=\"article:published_time\" content=\"2024-01-15T08:00:00Z\">\n<meta property=\"article:modified_time\" content=\"2024-06-01T10:00:00Z\">\n\nOr add a visible date to your content.",
            "Dodajte datum objave ili zadnje izmjene:\n\n<meta property=\"article:published_time\" content=\"2024-01-15T08:00:00Z\">\n<meta property=\"article:modified_time\" content=\"2024-06-01T10:00:00Z\">\n\nIli dodajte vidljivi datum u sadržaj."
          )
    });

    // Check URL structure
    const urlPath = new URL(url).pathname;
    const urlSegments = urlPath.split('/').filter(segment => segment.length > 0);
    const hasCleanUrl = !urlPath.includes('?') && !urlPath.includes('#') && urlSegments.every(segment => 
      segment.match(/^[a-z0-9-]+$/) && !segment.includes('_')
    );
    const urlStatus = hasCleanUrl ? "PASS" : "WARNING";
    checks.push({
      name: this.L("Clean URL Structure", "Čista URL struktura"),
      status: urlStatus,
      details: hasCleanUrl
        ? this.L("URL follows SEO-friendly structure", "URL prati SEO-friendly strukturu")
        : this.L("URL could be more SEO-friendly", "URL bi mogao biti SEO-friendlier"),
      priority: getPriorityByStatus(urlStatus),
      category: this.L("Technical SEO", "Tehnički SEO"),
      action: urlStatus === "PASS"
        ? this.L("Perfect!", "Savršeno!")
        : this.L(
            "Use clean, descriptive URLs:\n\nBad: /page?id=123&ref=456\nGood: /blue-running-shoes\n\nKeep URLs short, use hyphens, include keywords, avoid parameters.",
            "Koristite čiste, opisne URL-ove:\n\nLoše: /page?id=123&ref=456\nDobro: /plave-tenisice-za-trcanje\n\nDržite URL-ove kratkim, koristite crtice, uključite ključne riječi, izbjegavajte parametre."
          )
    });

    // Check for duplicate content indicators
    const canonicalTag = $('link[rel="canonical"]').attr('href');
    const canonicalStatus = canonicalTag ? "PASS" : "WARNING";
    checks.push({
      name: this.L("Canonical URL", "Kanonički URL"),
      status: canonicalStatus,
      details: canonicalTag
        ? `${this.L("Canonical URL set", "Kanonički URL postavljen")}: ${canonicalTag}`
        : this.L("No canonical URL specified", "Nije specificiran kanonički URL"),
      priority: getPriorityByStatus(canonicalStatus),
      category: this.L("Technical SEO", "Tehnički SEO"),
      action: canonicalStatus === "PASS"
        ? this.L("Excellent!", "Izvrsno!")
        : this.L(
            "Add a canonical tag to your <head>:\n\n<link rel=\"canonical\" href=\"https://yourdomain.com/your-page\">\n\nThis prevents duplicate content issues.",
            "Dodajte kanonički tag u <head>:\n\n<link rel=\"canonical\" href=\"https://yourdomain.com/your-page\">\n\nOvo sprječava probleme s dupliciranim sadržajem."
          )
    });

    // Check for mobile viewport meta tag
    const viewportMeta = $('meta[name="viewport"]').attr('content');
    const viewportStatus = viewportMeta ? "PASS" : "FAIL";
    checks.push({
      name: this.L("Mobile Viewport", "Mobilni viewport"),
      status: viewportStatus,
      details: viewportMeta
        ? `Viewport: ${viewportMeta}`
        : this.L("Missing viewport meta tag for mobile", "Nedostaje viewport meta tag za mobilne uređaje"),
      priority: getPriorityByStatus(viewportStatus),
      category: this.L("Technical SEO", "Tehnički SEO"),
      action: viewportStatus === "PASS"
        ? this.L("Mobile Ready!", "Mobilno spreman!")
        : this.L(
            "Add the viewport meta tag for mobile responsiveness:\n\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">",
            "Dodajte viewport meta tag za mobilnu responzivnost:\n\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">"
          )
    });

    // Check for HTTPS
    const isHttps = url.startsWith('https://');
    const httpsStatus = isHttps ? "PASS" : "FAIL";
    checks.push({
      name: this.L("HTTPS Security", "HTTPS sigurnost"),
      status: httpsStatus,
      details: isHttps
        ? this.L("Website uses HTTPS", "Web-stranica koristi HTTPS")
        : this.L("Website should use HTTPS for security", "Web-stranica bi trebala koristiti HTTPS radi sigurnosti"),
      priority: getPriorityByStatus(httpsStatus),
      category: this.L("Technical SEO", "Tehnički SEO"),
      action: httpsStatus === "PASS"
        ? this.L("Secure!", "Sigurno!")
        : this.L(
            "Enable HTTPS by installing an SSL certificate. Most hosts offer free certificates via Let's Encrypt. Redirect all HTTP traffic to HTTPS:\n\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]",
            "Omogućite HTTPS instalacijom SSL certifikata. Većina hostova nudi besplatne certifikate putem Let's Encrypt. Preusmjerite sav HTTP promet na HTTPS:\n\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]"
          )
    });

    // Check HTTP to HTTPS redirect
    try {
      const parsedUrl = new URL(url);
      if (parsedUrl.protocol === 'https:') {
        const httpUrl = `http://${parsedUrl.host}${parsedUrl.pathname}`;
        const httpRes = await fetch(httpUrl, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0' } });
        const locationHeader = httpRes.headers.get('location') || '';
        const redirectsToHttps = httpRes.status >= 300 && httpRes.status < 400 && locationHeader.startsWith('https://');
        const httpRedirectStatus = redirectsToHttps ? "PASS" : "WARNING";
        checks.push({
          name: this.L("HTTP → HTTPS Redirect", "HTTP → HTTPS preusmjeravanje"),
          status: httpRedirectStatus,
          details: redirectsToHttps
            ? this.lang === 'hr'
              ? `HTTP preusmjerava na HTTPS (${httpRes.status})`
              : `HTTP redirects to HTTPS (${httpRes.status})`
            : this.lang === 'hr'
              ? `HTTP verzija ne preusmjerava na HTTPS (status: ${httpRes.status})`
              : `HTTP version does not redirect to HTTPS (status: ${httpRes.status})`,
          priority: getPriorityByStatus(httpRedirectStatus),
          category: this.L("Technical SEO", "Tehnički SEO"),
          action: httpRedirectStatus === "PASS"
            ? this.L("Properly redirected!", "Pravilno preusmjereno!")
            : this.L(
                "Set up a 301 redirect from HTTP to HTTPS. In Apache:\n\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n\nIn Nginx:\nserver {\n  listen 80;\n  return 301 https://$host$request_uri;\n}",
                "Postavite 301 preusmjeravanje s HTTP na HTTPS. U Apache:\n\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n\nU Nginx:\nserver {\n  listen 80;\n  return 301 https://$host$request_uri;\n}"
              )
        });
      }
    } catch {
      // Skip if we can't check HTTP redirect
    }

    // Check www vs non-www consistency (canonical redirect)
    try {
      const parsedUrl = new URL(url);
      const hasWww = parsedUrl.hostname.startsWith('www.');
      const altHost = hasWww ? parsedUrl.hostname.replace(/^www\./, '') : `www.${parsedUrl.hostname}`;
      const altUrl = `${parsedUrl.protocol}//${altHost}${parsedUrl.pathname}`;
      const altRes = await fetch(altUrl, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0' } });
      const altLocation = altRes.headers.get('location') || '';
      const redirectsCorrectly = altRes.status >= 300 && altRes.status < 400 && altLocation.includes(parsedUrl.hostname);
      const wwwStatus = redirectsCorrectly ? "PASS" : altRes.status === 200 ? "WARNING" : "PASS";
      const altLabel = hasWww ? (this.lang === 'hr' ? 'non-www verzija' : 'non-www version') : (this.lang === 'hr' ? 'www verzija' : 'www version');
      const targetLabel = hasWww ? 'www' : 'non-www';
      checks.push({
        name: this.L("WWW / Non-WWW Redirect", "WWW / Non-WWW preusmjeravanje"),
        status: wwwStatus,
        details: redirectsCorrectly
          ? this.lang === 'hr'
            ? `${altLabel} ispravno preusmjerava na ${targetLabel} (${altRes.status})`
            : `${altLabel} correctly redirects to ${targetLabel} (${altRes.status})`
          : altRes.status === 200
            ? this.L(
                "Both www and non-www versions serve content (no redirect). This can cause duplicate content issues.",
                "I www i non-www verzija poslužuju sadržaj (bez preusmjeravanja). Ovo može uzrokovati probleme s dupliciranim sadržajem."
              )
            : this.lang === 'hr'
              ? `${altLabel} vraća status ${altRes.status}`
              : `${altLabel} returns status ${altRes.status}`,
        priority: getPriorityByStatus(wwwStatus),
        category: this.L("Technical SEO", "Tehnički SEO"),
        action: wwwStatus === "PASS"
          ? this.L("Consistent!", "Konzistentno!")
          : this.L(
              "Choose either www or non-www as your canonical version and set up a 301 redirect:\n\n# Redirect non-www to www (Apache):\nRewriteCond %{HTTP_HOST} !^www\\.\nRewriteRule ^(.*)$ https://www.%{HTTP_HOST}/$1 [R=301,L]\n\n# Or redirect www to non-www:\nRewriteCond %{HTTP_HOST} ^www\\.(.*)\nRewriteRule ^(.*)$ https://%1/$1 [R=301,L]\n\nAlso set the canonical URL in your HTML <head>.",
              "Odaberite www ili non-www kao kanonsku verziju i postavite 301 preusmjeravanje:\n\n# Preusmjeri non-www na www (Apache):\nRewriteCond %{HTTP_HOST} !^www\\.\nRewriteRule ^(.*)$ https://www.%{HTTP_HOST}/$1 [R=301,L]\n\n# Ili preusmjeri www na non-www:\nRewriteCond %{HTTP_HOST} ^www\\.(.*)\nRewriteRule ^(.*)$ https://%1/$1 [R=301,L]\n\nTakođer postavite kanonički URL u HTML <head>."
            )
      });
    } catch {
      // Skip if we can't check www redirect
    }

    // Check redirect chain length
    try {
      let currentUrl = url;
      let redirectCount = 0;
      const maxRedirects = 10;
      const redirectChain: string[] = [currentUrl];

      while (redirectCount < maxRedirects) {
        const chainRes = await fetch(currentUrl, { redirect: 'manual', headers: { 'User-Agent': 'Mozilla/5.0' } });
        if (chainRes.status >= 300 && chainRes.status < 400) {
          const nextUrl = chainRes.headers.get('location');
          if (!nextUrl) break;
          const resolved = new URL(nextUrl, currentUrl).href;
          redirectCount++;
          redirectChain.push(resolved);
          currentUrl = resolved;
        } else {
          break;
        }
      }

      const chainStatus = redirectCount === 0 ? "PASS" : redirectCount === 1 ? "PASS" : redirectCount <= 3 ? "WARNING" : "FAIL";
      checks.push({
        name: this.L("Redirect Chain", "Lanac preusmjeravanja"),
        status: chainStatus,
        details: redirectCount === 0
          ? this.L("No redirects detected — URL resolves directly", "Nema otkrivenih preusmjeravanja — URL se razrješava izravno")
          : this.lang === 'hr'
            ? `${redirectCount} preusmjeravanje${redirectCount !== 1 ? 'a' : ''} otkriveno: ${redirectChain.join(' → ')}`
            : `${redirectCount} redirect${redirectCount !== 1 ? 's' : ''} detected: ${redirectChain.join(' → ')}`,
        priority: getPriorityByStatus(chainStatus),
        category: this.L("Technical SEO", "Tehnički SEO"),
        action: chainStatus === "PASS"
          ? this.L("Clean redirect path!", "Čist put preusmjeravanja!")
          : this.L(
              "Reduce the number of redirects. Each redirect adds latency and dilutes link equity. Update internal links and sitemaps to point directly to the final URL.\n\nIdeal: 0 redirects\nAcceptable: 1 redirect (e.g., HTTP → HTTPS)\nBad: 2+ redirects in a chain",
              "Smanjite broj preusmjeravanja. Svako preusmjeravanje dodaje kašnjenje i razrjeđuje link kapital. Ažurirajte interne veze i sitemape da upućuju izravno na konačni URL.\n\nIdealno: 0 preusmjeravanja\nPrihvatljivo: 1 preusmjeravanje (npr. HTTP → HTTPS)\nLoše: 2+ preusmjeravanja u nizu"
            )
      });
    } catch {
      // Skip if we can't check redirect chain
    }

    return checks;
  }

  private async analyzePerformanceSimple(url: string): Promise<PerformanceMetrics> {
    // Simple performance analysis without browser automation
    // In a real implementation, this would call external APIs like PageSpeed Insights
    return {
      coreWebVitals: {
        lcp: 2.1, // Good - under 2.5s
        fid: 0.08, // Good - under 100ms
        cls: 0.05  // Good - under 0.1
      },
      pagespeed: {
        desktop: 78,
        mobile: 72
      },
      mobileScore: 88,
      lighthouseScore: 76
    };
  }

  private async analyzeAccessibility($: cheerio.CheerioAPI, page: any | null): Promise<AccessibilityCheck[]> {
    const checks: AccessibilityCheck[] = [];
    
    // Check for HTML tags for headings, subheadings, lists
    const headingTags = $('h1, h2, h3, h4, h5, h6').length;
    const listTags = $('ul, ol, dl').length;
    checks.push({
      name: this.L("HTML Tags for Structure", "HTML tagovi za strukturu"),
      status: headingTags >= 2 && listTags >= 1 ? "PASS" : "WARNING",
      details: this.lang === 'hr'
        ? `${headingTags} oznaka naslova, ${listTags} oznaka liste pronađeno`
        : `${headingTags} heading tags, ${listTags} list tags found`,
      wcagLevel: "A"
    });

    // Check for aria labels
    const elementsNeedingAria = $('button, input, select, textarea').length;
    const elementsWithAria = $('[aria-label], [aria-labelledby]').length;
    checks.push({
      name: this.L("ARIA Labels", "ARIA oznake"),
      status: elementsWithAria >= elementsNeedingAria * 0.8 ? "PASS" : "WARNING",
      details: this.lang === 'hr'
        ? `${elementsWithAria}/${elementsNeedingAria} interaktivnih elemenata s ARIA oznakama`
        : `${elementsWithAria}/${elementsNeedingAria} interactive elements with ARIA labels`,
      wcagLevel: "AA"
    });

    // Check for alt text on images
    const images = $('img').length;
    const imagesWithAlt = $('img[alt]').length;
    checks.push({
      name: this.L("Image Alt Text", "Alt tekst slika"),
      status: images === 0 || imagesWithAlt >= images * 0.9 ? "PASS" : "FAIL",
      details: this.lang === 'hr'
        ? `${imagesWithAlt}/${images} slika ima alt tekst`
        : `${imagesWithAlt}/${images} images have alt text`,
      wcagLevel: "A"
    });

    // Check text contrast (basic check for dark/light text indicators)
    const hasContrastStyles = $('*').filter((i, el) => {
      const style = $(el).attr('style') || '';
      return style.includes('color:') || style.includes('background');
    }).length;
    checks.push({
      name: this.L("Color Contrast Indicators", "Pokazatelji kontrasta boja"),
      status: hasContrastStyles > 0 ? "PASS" : "WARNING",
      details: hasContrastStyles > 0
        ? this.L("Color styles detected - manual contrast check recommended", "Otkriveni stilovi boja — preporučuje se ručna provjera kontrasta")
        : this.L("No obvious color styling found", "Nije pronađeno očito stiliziranje boja"),
      wcagLevel: "AA"
    });

    // Check text readability - font size indicators
    const smallTextElements = $('*').filter((i, el) => {
      const style = $(el).attr('style') || '';
      return style.includes('font-size') && (style.includes('px') || style.includes('pt'));
    }).length;
    checks.push({
      name: this.L("Text Readability", "Čitljivost teksta"),
      status: smallTextElements === 0 ? "PASS" : "WARNING",
      details: smallTextElements > 0
        ? this.lang === 'hr'
          ? `Pronađeno ${smallTextElements} elemenata s eksplicitnom veličinom fonta`
          : `${smallTextElements} elements with explicit font sizing found`
        : this.L("No potentially small text detected", "Nije otkriven potencijalno mali tekst"),
      wcagLevel: "AA"
    });

    // Check line spacing and layout
    const paragraphs = $('p').length;
    const hasLineHeight = $('*').filter((i, el) => {
      const style = $(el).attr('style') || '';
      return style.includes('line-height');
    }).length;
    checks.push({
      name: this.L("Line Spacing", "Razmak između redova"),
      status: hasLineHeight > 0 || paragraphs === 0 ? "PASS" : "WARNING",
      details: hasLineHeight > 0
        ? this.L("Line height styling detected", "Otkriveno stiliziranje visine retka")
        : this.lang === 'hr'
          ? `Pronađeno ${paragraphs} odlomaka — provjerite razmak između redova`
          : `${paragraphs} paragraphs found - check line spacing`,
      wcagLevel: "AA"
    });

    // Check heading hierarchy
    const headings = $('h1, h2, h3, h4, h5, h6');
    let hierarchyValid = true;
    let lastLevel = 0;
    
    headings.each((i, el) => {
      const level = parseInt(el.tagName.charAt(1));
      if (i === 0 && level !== 1) hierarchyValid = false;
      if (level > lastLevel + 1) hierarchyValid = false;
      lastLevel = level;
    });

    checks.push({
      name: this.L("Heading Hierarchy", "Hijerarhija naslova"),
      status: hierarchyValid ? "PASS" : "WARNING",
      details: hierarchyValid
        ? this.L("Proper heading hierarchy found", "Pronađena ispravna hijerarhija naslova")
        : this.L("Heading hierarchy issues detected", "Otkriveni problemi s hijerarhijom naslova"),
      wcagLevel: "AA"
    });

    // Check anchor text quality
    const links = $('a[href]');
    const linksWithText = links.filter((i, el) => $(el).text().trim().length > 0);
    const descriptiveLinks = linksWithText.filter((i, el) => {
      const text = $(el).text().trim().toLowerCase();
      return !text.includes('click here') && !text.includes('read more') && text.length >= 3;
    });
    
    checks.push({
      name: this.L("Anchor Text Quality", "Kvaliteta teksta sidra"),
      status: links.length === 0 || descriptiveLinks.length / linksWithText.length >= 0.8 ? "PASS" : "WARNING",
      details: this.lang === 'hr'
        ? `${descriptiveLinks.length}/${linksWithText.length} veza ima opisni tekst sidra`
        : `${descriptiveLinks.length}/${linksWithText.length} links have descriptive anchor text`,
      wcagLevel: "A"
    });

    return checks;
  }

  private async analyzeKeywords($: cheerio.CheerioAPI): Promise<KeywordAnalysis> {
    const title = $('title').text();
    const description = $('meta[name="description"]').attr('content') || '';
    
    const h1Elements = $('h1');
    const h1Texts = h1Elements.map((i, el) => $(el).text().trim()).get();
    
    const bodyText = extractMainContent($).toLowerCase();
    const stopWords = new Set(["the","a","an","is","are","was","were","be","been","being","have","has","had","do","does","did","will","would","could","should","may","might","shall","can","to","of","in","for","on","with","at","by","from","as","into","through","during","before","after","above","below","between","out","off","over","under","again","further","then","once","and","but","or","nor","not","so","yet","both","either","neither","each","every","all","any","few","more","most","other","some","such","no","only","own","same","than","too","very","just","because","about","up","it","its","this","that","these","those","your","our","their","my","his","her","i","you","we","they","he","she","what","which","who","whom","how","when","where","why","also","here","there","new","one","two","many","much","like","get","got","make","made","take","use","used","using","well","even","back","know","good","come","want","see","look","find","give","tell","think","say","said","help","need","try","keep","work","part","first","last","long","great","little","right","old","big","high","different","small","large","next","early","young","important","public","bad","free","able","open","read","write","close","best","home","still","must","way","well","often","going","set","put","end","does","another","while","until","around","turn","start","show","every","kind","hand","went","going","down","time","long","thing","point","state","never","world","call","life","away","play","run","own","line","move","live","real","left","number","without","form","place","game","change","name","city","year","always","second","between","per","order","site","page","click","view","contact","service","services","search","information","company","products","product","www","com","http","https","email","website","web","content","data","online","post","share","follow","menu","read","link","links","learn","shop","buy","cart","account","sign","log","login","close","add","remove","list","top","bottom","left","right","center"]);
    const words = bodyText.split(/\s+/).filter(word => word.length > 2 && !/^\d+$/.test(word));
    const cleanWords = words.map(w => w.replace(/[^a-zA-ZÀ-ÿ\u0100-\u024F\u0400-\u04FF\u4e00-\u9fff\uac00-\ud7af-]/g, '').toLowerCase()).filter(w => w.length > 2);

    const singleWordFreq: Record<string, number> = {};
    cleanWords.forEach(word => {
      if (!stopWords.has(word)) {
        singleWordFreq[word] = (singleWordFreq[word] || 0) + 1;
      }
    });

    const topSingleKeywords = Object.entries(singleWordFreq)
      .filter(([, count]) => count >= 2)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [word, count]) => {
        obj[word] = Math.round((count / cleanWords.length) * 1000) / 10;
        return obj;
      }, {} as Record<string, number>);

    const phraseFreq: Record<string, number> = {};
    for (let n = 2; n <= 3; n++) {
      for (let i = 0; i <= cleanWords.length - n; i++) {
        const phrase = cleanWords.slice(i, i + n);
        if (phrase.every(w => !stopWords.has(w) && w.length > 2)) {
          const key = phrase.join(' ');
          phraseFreq[key] = (phraseFreq[key] || 0) + 1;
        }
      }
    }

    const topPhrases = Object.entries(phraseFreq)
      .filter(([, count]) => count >= 2)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 10)
      .reduce((obj, [phrase, count]) => {
        obj[phrase] = Math.round((count / cleanWords.length) * 1000) / 10;
        return obj;
      }, {} as Record<string, number>);

    return {
      metaTitle: {
        present: title.length > 0,
        length: title.length,
        optimized: title.length >= 30 && title.length <= 60
      },
      metaDescription: {
        present: description.length > 0,
        length: description.length,
        optimized: description.length >= 120 && description.length <= 160
      },
      headingStructure: {
        h1Count: h1Elements.length,
        h1Text: h1Texts,
        hierarchyValid: h1Elements.length === 1
      },
      keywordDensity: topSingleKeywords,
      keywordPhrases: topPhrases,
      internalLinks: $('a[href^="/"], a[href^="./"], a[href^="../"]').length,
      externalLinks: $('a[href^="http"]:not([href*="' + new URL($('base').attr('href') || 'http://example.com').hostname + '"])').length
    };
  }

  private async analyzeContent($: cheerio.CheerioAPI): Promise<ContentQuality> {
    const bodyText = extractMainContent($);
    const allWords = bodyText.split(/\s+/).filter(word => word.length > 0);
    const wordCount = allWords.length;
    
    const contentWords = allWords.filter(w => isContentWord(w));
    const sentences = bodyText.split(/[.!?]+/).filter(s => s.trim().length > 5);
    const readabilityScore = computeReadabilityScore(contentWords, sentences);

    const images = $('img');
    const imagesWithAlt = $('img[alt]');
    
    const structuredDataElements = $('script[type="application/ld+json"]');
    const schemaMarkup = structuredDataElements.map((i, el) => {
      try {
        const data = JSON.parse($(el).html() || '');
        return data['@type'] || 'Unknown';
      } catch {
        return 'Invalid JSON-LD';
      }
    }).get();

    return {
      wordCount,
      readabilityScore: Math.round(readabilityScore),
      imageAltTags: {
        total: images.length,
        withAlt: imagesWithAlt.length,
        percentage: images.length > 0 ? Math.round((imagesWithAlt.length / images.length) * 100) : 100
      },
      structuredData: structuredDataElements.length > 0,
      schemaMarkup
    };
  }

  private async runLighthouseSimple(url: string) {
    // Simplified lighthouse results - in production would run actual Lighthouse
    return {
      performance: 72,
      accessibility: 85,
      bestPractices: 80,
      seo: 75
    };
  }

  private calculateTechnicalScore(checks: TechnicalSeoCheck[]): number {
    const weights = { "PASS": 100, "WARNING": 60, "FAIL": 0 };
    const totalScore = checks.reduce((sum, check) => sum + weights[check.status], 0);
    return Math.round(totalScore / checks.length);
  }

  private calculateAccessibilityScore(checks: AccessibilityCheck[]): number {
    const weights = { "PASS": 100, "WARNING": 60, "FAIL": 0 };
    const totalScore = checks.reduce((sum, check) => sum + weights[check.status], 0);
    return Math.round(totalScore / checks.length);
  }

  private calculateKeywordScore(analysis: KeywordAnalysis): number {
    let score = 0;
    if (analysis.metaTitle.optimized) score += 25;
    else if (analysis.metaTitle.present) score += 10;
    
    if (analysis.metaDescription.optimized) score += 25;
    else if (analysis.metaDescription.present) score += 10;
    
    if (analysis.headingStructure.hierarchyValid) score += 25;
    if (analysis.internalLinks > 5) score += 25;
    
    return Math.min(100, score);
  }

  private calculateContentScore(analysis: ContentQuality): number {
    let score = 0;

    const threshold = this.pageType === 'contact' ? 50
      : this.pageType === 'landing' || this.pageType === 'category' ? 100
      : this.pageType === 'product' ? 150
      : this.pageType === 'blog' ? 500
      : 300;
    const halfThreshold = Math.floor(threshold * 0.5);

    if (analysis.wordCount >= threshold) score += 30;
    else if (analysis.wordCount >= halfThreshold) score += 15;

    score += Math.round(analysis.readabilityScore * 0.25);

    if (analysis.imageAltTags.percentage >= 80) score += 25;
    else if (analysis.imageAltTags.percentage >= 50) score += 10;

    const schemaWeight = this.pageType === 'product' ? 25 : 20;
    if (analysis.structuredData) score += schemaWeight;

    return Math.min(100, score);
  }

  private generateRecommendations(results: AnalysisResults): SeoRecommendation[] {
    const recommendations: SeoRecommendation[] = [];
    
    // Check for critical issues
    const criticalTechnicalIssues = results.technical.filter(check => 
      check.status === "FAIL" && check.priority === "Critical"
    );
    
    if (criticalTechnicalIssues.length > 0) {
      recommendations.push({
        title: this.L("Fix Critical Technical SEO Issues", "Popravite kritične tehničke SEO probleme"),
        description: this.L(
          "Several critical technical issues were found that can significantly impact search rankings.",
          "Pronađeno je nekoliko kritičnih tehničkih problema koji mogu značajno utjecati na rangiranje u pretraživačima."
        ),
        priority: "Critical",
        category: this.L("Technical SEO", "Tehnički SEO"),
        impact: this.L("High", "Visok"),
        timeToFix: this.L("1-2 days", "1-2 dana"),
        actionItems: criticalTechnicalIssues.map(issue =>
          this.lang === 'hr' ? `Popravite ${issue.name}: ${issue.details}` : `Fix ${issue.name}: ${issue.details}`
        )
      });
    }

    // Performance recommendations
    if (results.performance.lighthouseScore < 70) {
      recommendations.push({
        title: this.L("Improve Page Load Speed", "Poboljšajte brzinu učitavanja stranice"),
        description: this.L(
          "Page load times are slower than recommended, affecting user experience and search rankings.",
          "Vremena učitavanja stranice su sporija od preporučenih, što utječe na korisničko iskustvo i rangiranje u pretraživačima."
        ),
        priority: "High",
        category: this.L("Performance", "Performanse"),
        impact: this.L("Medium", "Srednji"),
        timeToFix: this.L("1-2 days", "1-2 dana"),
        actionItems: [
          this.L("Optimize images and use modern formats (WebP, AVIF)", "Optimizirajte slike i koristite moderne formate (WebP, AVIF)"),
          this.L("Minify CSS and JavaScript files", "Minimizirajte CSS i JavaScript datoteke"),
          this.L("Enable browser caching", "Omogućite predmemoriju preglednika"),
          this.L("Consider using a Content Delivery Network (CDN)", "Razmotrite korištenje CDN mreže (Content Delivery Network)")
        ]
      });
    }

    // Content recommendations (page-type-aware threshold and description)
    const contentThreshold = this.pageType === 'contact' ? 50
      : this.pageType === 'landing' || this.pageType === 'category' ? 100
      : this.pageType === 'product' ? 150
      : this.pageType === 'blog' ? 500
      : 300;
    if (results.content.wordCount < contentThreshold) {
      const pageTypeDesc = this.pageType === 'contact'
        ? this.L(
            "As a Contact page, focus on clear contact information, phone, address, map embed, and a simple contact form rather than long content.",
            "Kao kontakt stranica, fokusirajte se na jasne kontaktne podatke, telefon, adresu, kartu i jednostavan obrazac, a ne na dugačak sadržaj."
          )
        : this.pageType === 'blog'
        ? this.L(
            "As a Blog article, aim for 500+ words of well-structured content with clear headings, author signals, publication date, and helpful internal links.",
            "Kao blog članak, cilj je 500+ riječi dobro strukturiranog sadržaja s jasnim naslovima, informacijama o autoru, datumom objave i korisnim internim vezama."
          )
        : this.pageType === 'product'
        ? this.L(
            "As a Product page, add a unique product description, key specifications, availability status, clear CTA, customer reviews, and delivery/returns information.",
            "Kao stranica proizvoda, dodajte jedinstveni opis, ključne specifikacije, status dostupnosti, jasan poziv na akciju, recenzije kupaca i informacije o dostavi."
          )
        : this.pageType === 'service'
        ? this.L(
            "As a Service page, clearly explain the service, who it is for, what problem it solves, proof points (testimonials/case studies), FAQ section, and a strong CTA.",
            "Kao uslužna stranica, jasno objasnite uslugu, komu je namijenjena, koji problem rješava, dokaze (svjedočanstva/studije slučaja), FAQ sekciju i snažan poziv na akciju."
          )
        : this.pageType === 'landing'
        ? this.L(
            "As a Landing page, ensure a clear value proposition, strong headline, social proof, minimal form friction, and a prominent CTA visible above the fold.",
            "Kao odredišna stranica, osigurajte jasnu vrijednosnu ponudu, snažan naslov, društvene dokaze, minimalne prepreke u obrascu i istaknuti poziv na akciju iznad linije savijanja."
          )
        : this.L(
            "Pages with more comprehensive content tend to perform better in search results.",
            "Stranice s iscrpnijim sadržajem obično se bolje rangiraju u rezultatima pretraživanja."
          );

      recommendations.push({
        title: this.L("Improve Page Content", "Poboljšajte sadržaj stranice"),
        description: pageTypeDesc,
        priority: this.pageType === 'contact' ? "Low" : "Medium",
        category: this.L("Content", "Sadržaj"),
        impact: this.L("Medium", "Srednji"),
        timeToFix: this.L("2-4 hours", "2-4 sata"),
        actionItems: [
          this.L("Add more detailed, valuable content to the page", "Dodajte detaljniji, vrijedniji sadržaj stranici"),
          this.L("Include relevant keywords naturally", "Prirodno uključite relevantne ključne riječi"),
          this.L("Consider adding FAQ sections or additional details", "Razmislite o dodavanju FAQ sekcija ili dodatnih pojedinosti")
        ]
      });
    }

    return recommendations;
  }
}

export const seoAnalyzer = new SeoAnalyzer();
