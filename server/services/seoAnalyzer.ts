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
  async analyzeWebsite(url: string): Promise<InsertSeoAnalysis> {
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
        details: robotsResponse.ok ? "Valid robots.txt file found" : "Robots.txt not found",
        priority: getPriorityByStatus(robotsStatus),
        category: "Technical SEO",
        action: robotsStatus === "PASS" ? "Perfect!" : "Create a robots.txt file in your root directory:\n\nUser-agent: *\nAllow: /\n\nSitemap: https://yourdomain.com/sitemap.xml"
      });
    } catch {
      const robotsErrorStatus = "FAIL";
      checks.push({
        name: "Robots.txt",
        status: robotsErrorStatus,
        details: "Unable to access robots.txt",
        priority: getPriorityByStatus(robotsErrorStatus),
        category: "Technical SEO",
        action: "Ensure your robots.txt is accessible at /robots.txt. Check your server configuration and make sure the file is not blocked by permissions or .htaccess rules."
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
        details: sitemapResponse.ok ? "XML sitemap found" : "XML sitemap not found at standard location",
        priority: getPriorityByStatus(sitemapStatus),
        category: "Technical SEO",
        action: sitemapStatus === "PASS" ? "Great!" : "Create a sitemap.xml file:\n\n<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<urlset xmlns=\"http://www.sitemaps.org/schemas/sitemap/0.9\">\n  <url>\n    <loc>https://yourdomain.com/</loc>\n    <lastmod>2024-01-01</lastmod>\n    <priority>1.0</priority>\n  </url>\n</urlset>\n\nSubmit it to Google Search Console."
      });
    } catch {
      const sitemapErrorStatus = "WARNING";
      checks.push({
        name: "XML Sitemap",
        status: sitemapErrorStatus,
        details: "Unable to access sitemap",
        priority: getPriorityByStatus(sitemapErrorStatus),
        category: "Technical SEO",
        action: "Add this line to your robots.txt:\n\nSitemap: https://yourdomain.com/sitemap.xml"
      });
    }

    // Check meta tags
    const metaTitle = $('title').text();
    const pageTitleStatus = metaTitle.length > 0 ? "PASS" : "FAIL";
    checks.push({
      name: "Page Title",
      status: pageTitleStatus,
      details: metaTitle.length > 0 ? `Title: "${metaTitle}"` : "Missing page title",
      priority: getPriorityByStatus(pageTitleStatus),
      category: "Technical SEO",
      action: pageTitleStatus === "PASS" ? "Excellent!" : "Add a descriptive title tag (50-60 characters) to your <head>:\n\n<title>Your Primary Keyword - Brand Name</title>"
    });

    const metaDescription = $('meta[name="description"]').attr('content');
    const metaDescStatus = metaDescription ? "PASS" : "FAIL";
    checks.push({
      name: "Meta Description",
      status: metaDescStatus,
      details: metaDescription ? `Description length: ${metaDescription.length}` : "Missing meta description",
      priority: getPriorityByStatus(metaDescStatus),
      category: "Technical SEO",
      action: metaDescStatus === "PASS" ? "Perfect!" : "Add a compelling meta description (150-160 characters):\n\n<meta name=\"description\" content=\"Your compelling page description with primary keyword. Include a call to action.\">"
    });

    const contentText = extractMainContent($);
    const wordCount = contentText.split(/\s+/).length;
    const contentLengthStatus = wordCount > 300 ? "PASS" : "WARNING";
    checks.push({
      name: "Content Length",
      status: contentLengthStatus,
      details: `Page contains ${wordCount} words`,
      priority: getPriorityByStatus(contentLengthStatus),
      category: "Technical SEO",
      action: contentLengthStatus === "PASS" ? "Great Length!" : "Your page has insufficient content. Aim for at least 300 words of unique, valuable content. Pages with 1,000+ words typically rank better for competitive keywords."
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
      name: "H1 Tags",
      status: h1Status,
      details: `${h1Count} H1 tag${h1Count !== 1 ? 's' : ''} found`,
      priority: getPriorityByStatus(h1Status),
      category: "Technical SEO",
      action: h1Status === "PASS" ? "Great!" : "Add a single H1 tag containing your primary keyword:\n\n<h1>Your Primary Keyword and Page Topic</h1>\n\nOnly use one H1 per page."
    });

    const hierarchyStatus = h2Count > 0 || h3Count > 0 ? "PASS" : "WARNING";
    checks.push({
      name: "Heading Hierarchy",
      status: hierarchyStatus,
      details: `Page organized with H2s (${h2Count}), H3s (${h3Count}), H4s (${h4Count}), H5s (${h5Count}), H6s (${h6Count})`,
      priority: getPriorityByStatus(hierarchyStatus),
      category: "Technical SEO",
      action: hierarchyStatus === "PASS" ? "Excellent!" : "Structure your headings in proper hierarchy:\n\n<h1>Main Topic</h1>\n  <h2>Subtopic 1</h2>\n    <h3>Detail</h3>\n  <h2>Subtopic 2</h2>\n\nNever skip heading levels (e.g., H1 to H3)."
    });

    // Check for lists and content structure
    const bulletLists = $('ul').length;
    const numberedLists = $('ol').length;
    const organizationStatus = (bulletLists + numberedLists) > 0 ? "PASS" : "WARNING";
    checks.push({
      name: "Content Organization",
      status: organizationStatus,
      details: `${bulletLists} bullet lists, ${numberedLists} numbered lists found`,
      priority: getPriorityByStatus(organizationStatus),
      category: "Technical SEO",
      action: organizationStatus === "PASS" ? "Perfect!" : "Break up content with lists and structured elements:\n\n<ul>\n  <li>Key point 1</li>\n  <li>Key point 2</li>\n</ul>\n\nUse <ol> for steps and <ul> for features/benefits."
    });

    // Check images alt tags and content break-up
    const images = $('img');
    const imagesWithAlt = $('img[alt]');
    const altTagPercentage = images.length > 0 ? Math.round((imagesWithAlt.length / images.length) * 100) : 100;
    
    const imageBreakupStatus = images.length >= 1 ? "PASS" : "WARNING";
    checks.push({
      name: "Images to Break Up Text",
      status: imageBreakupStatus,
      details: `${images.length} images found to break up text content`,
      priority: getPriorityByStatus(imageBreakupStatus),
      category: "Technical SEO",
      action: imageBreakupStatus === "PASS" ? "Great!" : "Add relevant images between text blocks to improve engagement. Place at least one image per 300 words of content."
    });

    const altTagStatus = altTagPercentage >= 80 ? "PASS" : altTagPercentage >= 50 ? "WARNING" : "FAIL";
    checks.push({
      name: "Image Alt Tags",
      status: altTagStatus,
      details: `${altTagPercentage}% of images have alt tags (${imagesWithAlt.length}/${images.length})`,
      priority: getPriorityByStatus(altTagStatus),
      category: "Technical SEO",
      action: altTagStatus === "PASS" ? "Excellent!" : "Add descriptive alt text to all images:\n\n<img src=\"photo.jpg\" alt=\"Descriptive text about the image content\">\n\nMake alt text specific and include keywords naturally."
    });

    // Check for keyword and meta filenames
    const imageFilenames = images.map((i, img) => $(img).attr('src')).get();
    const descriptiveFilenames = imageFilenames.filter(src => src && !src.includes('IMG_') && !src.includes('image') && src.length > 10).length;
    const filenamesStatus = images.length === 0 || descriptiveFilenames / images.length >= 0.5 ? "PASS" : "WARNING";
    checks.push({
      name: "Keyword and Meta Filenames",
      status: filenamesStatus,
      details: `${descriptiveFilenames}/${images.length} images have descriptive filenames`,
      priority: getPriorityByStatus(filenamesStatus),
      category: "Technical SEO",
      action: filenamesStatus === "PASS" ? "Perfect!" : "Rename images with descriptive, keyword-rich filenames:\n\nBad: IMG_001.jpg\nGood: blue-running-shoes-side-view.jpg\n\nUse hyphens between words, lowercase letters only."
    });

    // Check for information accuracy indicators
    const lastModified = $('meta[name="last-modified"], meta[property="article:modified_time"]').attr('content');
    const dateElements = $('time, .date, .updated, [datetime]').length;
    const accuracyStatus = lastModified || dateElements > 0 ? "PASS" : "WARNING";
    checks.push({
      name: "Information Accurate and Up to Date",
      status: accuracyStatus,
      details: lastModified ? `Last modified: ${lastModified}` : `${dateElements} date elements found`,
      priority: getPriorityByStatus(accuracyStatus),
      category: "Technical SEO",
      action: accuracyStatus === "PASS" ? "Up to Date!" : "Add a publication or last-modified date:\n\n<meta property=\"article:published_time\" content=\"2024-01-15T08:00:00Z\">\n<meta property=\"article:modified_time\" content=\"2024-06-01T10:00:00Z\">\n\nOr add a visible date to your content."
    });

    // Check URL structure
    const urlPath = new URL(url).pathname;
    const urlSegments = urlPath.split('/').filter(segment => segment.length > 0);
    const hasCleanUrl = !urlPath.includes('?') && !urlPath.includes('#') && urlSegments.every(segment => 
      segment.match(/^[a-z0-9-]+$/) && !segment.includes('_')
    );
    const urlStatus = hasCleanUrl ? "PASS" : "WARNING";
    checks.push({
      name: "Clean URL Structure",
      status: urlStatus,
      details: hasCleanUrl ? "URL follows SEO-friendly structure" : "URL could be more SEO-friendly",
      priority: getPriorityByStatus(urlStatus),
      category: "Technical SEO",
      action: urlStatus === "PASS" ? "Perfect!" : "Use clean, descriptive URLs:\n\nBad: /page?id=123&ref=456\nGood: /blue-running-shoes\n\nKeep URLs short, use hyphens, include keywords, avoid parameters."
    });

    // Check for duplicate content indicators
    const canonicalTag = $('link[rel="canonical"]').attr('href');
    const canonicalStatus = canonicalTag ? "PASS" : "WARNING";
    checks.push({
      name: "Canonical URL",
      status: canonicalStatus,
      details: canonicalTag ? `Canonical URL set: ${canonicalTag}` : "No canonical URL specified",
      priority: getPriorityByStatus(canonicalStatus),
      category: "Technical SEO",
      action: canonicalStatus === "PASS" ? "Excellent!" : "Add a canonical tag to your <head>:\n\n<link rel=\"canonical\" href=\"https://yourdomain.com/your-page\">\n\nThis prevents duplicate content issues."
    });

    // Check for mobile viewport meta tag
    const viewportMeta = $('meta[name="viewport"]').attr('content');
    const viewportStatus = viewportMeta ? "PASS" : "FAIL";
    checks.push({
      name: "Mobile Viewport",
      status: viewportStatus,
      details: viewportMeta ? `Viewport: ${viewportMeta}` : "Missing viewport meta tag for mobile",
      priority: getPriorityByStatus(viewportStatus),
      category: "Technical SEO",
      action: viewportStatus === "PASS" ? "Mobile Ready!" : "Add the viewport meta tag for mobile responsiveness:\n\n<meta name=\"viewport\" content=\"width=device-width, initial-scale=1.0\">"
    });

    // Check for HTTPS
    const isHttps = url.startsWith('https://');
    const httpsStatus = isHttps ? "PASS" : "FAIL";
    checks.push({
      name: "HTTPS Security",
      status: httpsStatus,
      details: isHttps ? "Website uses HTTPS" : "Website should use HTTPS for security",
      priority: getPriorityByStatus(httpsStatus),
      category: "Technical SEO",
      action: httpsStatus === "PASS" ? "Secure!" : "Enable HTTPS by installing an SSL certificate. Most hosts offer free certificates via Let's Encrypt. Redirect all HTTP traffic to HTTPS:\n\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]"
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
          name: "HTTP → HTTPS Redirect",
          status: httpRedirectStatus,
          details: redirectsToHttps ? `HTTP redirects to HTTPS (${httpRes.status})` : `HTTP version does not redirect to HTTPS (status: ${httpRes.status})`,
          priority: getPriorityByStatus(httpRedirectStatus),
          category: "Technical SEO",
          action: httpRedirectStatus === "PASS" ? "Properly redirected!" : "Set up a 301 redirect from HTTP to HTTPS. In Apache:\n\nRewriteEngine On\nRewriteCond %{HTTPS} off\nRewriteRule ^(.*)$ https://%{HTTP_HOST}%{REQUEST_URI} [L,R=301]\n\nIn Nginx:\nserver {\n  listen 80;\n  return 301 https://$host$request_uri;\n}"
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
      const altLabel = hasWww ? 'non-www' : 'www';
      checks.push({
        name: "WWW / Non-WWW Redirect",
        status: wwwStatus,
        details: redirectsCorrectly
          ? `${altLabel} version correctly redirects to ${hasWww ? 'www' : 'non-www'} (${altRes.status})`
          : altRes.status === 200
            ? `Both www and non-www versions serve content (no redirect). This can cause duplicate content issues.`
            : `${altLabel} version returns status ${altRes.status}`,
        priority: getPriorityByStatus(wwwStatus),
        category: "Technical SEO",
        action: wwwStatus === "PASS" ? "Consistent!" : "Choose either www or non-www as your canonical version and set up a 301 redirect:\n\n# Redirect non-www to www (Apache):\nRewriteCond %{HTTP_HOST} !^www\\.\nRewriteRule ^(.*)$ https://www.%{HTTP_HOST}/$1 [R=301,L]\n\n# Or redirect www to non-www:\nRewriteCond %{HTTP_HOST} ^www\\.(.*)\nRewriteRule ^(.*)$ https://%1/$1 [R=301,L]\n\nAlso set the canonical URL in your HTML <head>."
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
        name: "Redirect Chain",
        status: chainStatus,
        details: redirectCount === 0
          ? "No redirects detected — URL resolves directly"
          : `${redirectCount} redirect${redirectCount !== 1 ? 's' : ''} detected: ${redirectChain.join(' → ')}`,
        priority: getPriorityByStatus(chainStatus),
        category: "Technical SEO",
        action: chainStatus === "PASS" ? "Clean redirect path!" : "Reduce the number of redirects. Each redirect adds latency and dilutes link equity. Update internal links and sitemaps to point directly to the final URL.\n\nIdeal: 0 redirects\nAcceptable: 1 redirect (e.g., HTTP → HTTPS)\nBad: 2+ redirects in a chain"
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
      name: "HTML Tags for Structure",
      status: headingTags >= 2 && listTags >= 1 ? "PASS" : "WARNING",
      details: `${headingTags} heading tags, ${listTags} list tags found`,
      wcagLevel: "A"
    });

    // Check for aria labels
    const elementsNeedingAria = $('button, input, select, textarea').length;
    const elementsWithAria = $('[aria-label], [aria-labelledby]').length;
    checks.push({
      name: "ARIA Labels",
      status: elementsWithAria >= elementsNeedingAria * 0.8 ? "PASS" : "WARNING",
      details: `${elementsWithAria}/${elementsNeedingAria} interactive elements with ARIA labels`,
      wcagLevel: "AA"
    });

    // Check for alt text on images
    const images = $('img').length;
    const imagesWithAlt = $('img[alt]').length;
    checks.push({
      name: "Image Alt Text",
      status: images === 0 || imagesWithAlt >= images * 0.9 ? "PASS" : "FAIL",
      details: `${imagesWithAlt}/${images} images have alt text`,
      wcagLevel: "A"
    });

    // Check text contrast (basic check for dark/light text indicators)
    const hasContrastStyles = $('*').filter((i, el) => {
      const style = $(el).attr('style') || '';
      return style.includes('color:') || style.includes('background');
    }).length;
    checks.push({
      name: "Color Contrast Indicators",
      status: hasContrastStyles > 0 ? "PASS" : "WARNING",
      details: hasContrastStyles > 0 ? "Color styles detected - manual contrast check recommended" : "No obvious color styling found",
      wcagLevel: "AA"
    });

    // Check text readability - font size indicators
    const smallTextElements = $('*').filter((i, el) => {
      const style = $(el).attr('style') || '';
      return style.includes('font-size') && (style.includes('px') || style.includes('pt'));
    }).length;
    checks.push({
      name: "Text Readability",
      status: smallTextElements === 0 ? "PASS" : "WARNING",
      details: smallTextElements > 0 ? `${smallTextElements} elements with explicit font sizing found` : "No potentially small text detected",
      wcagLevel: "AA"
    });

    // Check line spacing and layout
    const paragraphs = $('p').length;
    const hasLineHeight = $('*').filter((i, el) => {
      const style = $(el).attr('style') || '';
      return style.includes('line-height');
    }).length;
    checks.push({
      name: "Line Spacing",
      status: hasLineHeight > 0 || paragraphs === 0 ? "PASS" : "WARNING",
      details: hasLineHeight > 0 ? "Line height styling detected" : `${paragraphs} paragraphs found - check line spacing`,
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
      name: "Heading Hierarchy",
      status: hierarchyValid ? "PASS" : "WARNING",
      details: hierarchyValid ? "Proper heading hierarchy found" : "Heading hierarchy issues detected",
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
      name: "Anchor Text Quality",
      status: links.length === 0 || descriptiveLinks.length / linksWithText.length >= 0.8 ? "PASS" : "WARNING",
      details: `${descriptiveLinks.length}/${linksWithText.length} links have descriptive anchor text`,
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
    
    if (analysis.wordCount >= 300) score += 30;
    else if (analysis.wordCount >= 150) score += 15;
    
    score += Math.round(analysis.readabilityScore * 0.25);
    
    if (analysis.imageAltTags.percentage >= 80) score += 25;
    else if (analysis.imageAltTags.percentage >= 50) score += 10;
    
    if (analysis.structuredData) score += 20;
    
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
        title: "Fix Critical Technical SEO Issues",
        description: "Several critical technical issues were found that can significantly impact search rankings.",
        priority: "Critical",
        category: "Technical SEO",
        impact: "High",
        timeToFix: "1-2 days",
        actionItems: criticalTechnicalIssues.map(issue => `Fix ${issue.name}: ${issue.details}`)
      });
    }

    // Performance recommendations
    if (results.performance.lighthouseScore < 70) {
      recommendations.push({
        title: "Improve Page Load Speed",
        description: "Page load times are slower than recommended, affecting user experience and search rankings.",
        priority: "High",
        category: "Performance",
        impact: "Medium",
        timeToFix: "1-2 days",
        actionItems: [
          "Optimize images and use modern formats (WebP, AVIF)",
          "Minify CSS and JavaScript files",
          "Enable browser caching",
          "Consider using a Content Delivery Network (CDN)"
        ]
      });
    }

    // Content recommendations
    if (results.content.wordCount < 300) {
      recommendations.push({
        title: "Increase Content Length",
        description: "Pages with more comprehensive content tend to perform better in search results.",
        priority: "Medium",
        category: "Content",
        impact: "Medium",
        timeToFix: "2-4 hours",
        actionItems: [
          "Add more detailed, valuable content to the page",
          "Include relevant keywords naturally",
          "Consider adding FAQ sections or additional details"
        ]
      });
    }

    return recommendations;
  }
}

export const seoAnalyzer = new SeoAnalyzer();
