import * as cheerio from "cheerio";
import { safeFetchHtmlWithFallback } from "./browserFetch";
import type {
  InsertGeoAnalysis,
  GeoCheck,
  GeoAnalysisResults,
  SourceAuthorityAnalysis,
  ContentFluencyAnalysis,
  UniqueValueAnalysis,
  EntityOptimizationAnalysis,
  MultiFormatAnalysis,
  GeoRating,
  GeoComparisonResult,
} from "@shared/schema";
import { extractMainContent, extractParagraphs, countSyllables, isContentWord, computeReadabilityScore } from "./contentExtractor";

class GeoAnalyzer {
  async analyzeWebsite(url: string): Promise<InsertGeoAnalysis> {
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

    const html = await safeFetchHtmlWithFallback(normalizedUrl);
    const $ = cheerio.load(html);

    const sourceAuthority = this.analyzeSourceAuthority($, normalizedUrl);
    const contentFluency = this.analyzeContentFluency($);
    const uniqueValue = this.analyzeUniqueValue($);
    const entityOptimization = this.analyzeEntityOptimization($);
    const multiFormat = this.analyzeMultiFormat($);

    const sourceAuthorityScore = this.scoreSourceAuthority(sourceAuthority);
    const contentFluencyScore = this.scoreContentFluency(contentFluency);
    const uniqueValueScore = this.scoreUniqueValue(uniqueValue);
    const entityOptimizationScore = this.scoreEntityOptimization(entityOptimization);
    const multiFormatScore = this.scoreMultiFormat(multiFormat);

    const overallScore = Math.round(
      sourceAuthorityScore * 0.25 +
      contentFluencyScore * 0.20 +
      uniqueValueScore * 0.25 +
      entityOptimizationScore * 0.15 +
      multiFormatScore * 0.15
    );

    const checks = this.generateChecks(sourceAuthority, contentFluency, uniqueValue, entityOptimization, multiFormat);
    const rating = this.getRating(overallScore);
    const recommendations = this.generateRecommendations(checks, sourceAuthority, contentFluency, uniqueValue, entityOptimization, multiFormat);

    const generativeReadinessScore = this.calculateGenerativeReadiness(sourceAuthority, contentFluency, uniqueValue, entityOptimization, multiFormat, overallScore);

    const results: GeoAnalysisResults = {
      rating,
      score: overallScore,
      sourceAuthorityScore,
      contentFluencyScore,
      uniqueValueScore,
      entityOptimizationScore,
      multiFormatScore,
      sourceAuthority,
      contentFluency,
      uniqueValue,
      entityOptimization,
      multiFormat,
      checks,
      generativeReadinessScore,
    };

    return {
      url: normalizedUrl,
      rating,
      score: overallScore,
      results,
      recommendations,
    };
  }

  private analyzeSourceAuthority($: cheerio.CheerioAPI, url: string): SourceAuthorityAnalysis {
    const authorDetails: string[] = [];
    const trustSignals: string[] = [];
    const domainAuthorityIndicators: string[] = [];

    let hasAuthorCredentials = false;
    $('[rel="author"], .author, .byline, [itemprop="author"], .post-author, .entry-author').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 2 && text.length < 200) {
        hasAuthorCredentials = true;
        authorDetails.push(text);
      }
    });

    $('meta[name="author"]').each((_, el) => {
      const content = $(el).attr('content');
      if (content) { hasAuthorCredentials = true; authorDetails.push(content); }
    });

    let citationCount = 0;
    let hasCitations = false;
    $('a[href]').each((_, el) => {
      const href = $(el).attr('href') || '';
      if (href.startsWith('http') && !href.includes(new URL(url).hostname)) {
        citationCount++;
      }
    });
    hasCitations = citationCount > 0;

    $('blockquote, cite, .citation, .reference, [class*="cite"], [class*="source"]').each((_, el) => {
      citationCount++;
    });

    let hasExpertQuotes = false;
    let expertQuoteCount = 0;
    $('blockquote').each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) {
        hasExpertQuotes = true;
        expertQuoteCount++;
      }
    });

    const bodyText = extractMainContent($).toLowerCase();
    const quotePatterns = [/according to/gi, /expert[s]? say/gi, /research shows/gi, /study found/gi, /professor/gi, /dr\./gi, /ph\.?d/gi];
    quotePatterns.forEach(p => {
      const matches = bodyText.match(p);
      if (matches) expertQuoteCount += matches.length;
    });
    if (expertQuoteCount > 0) hasExpertQuotes = true;

    let hasOriginalResearch = false;
    const researchPatterns = [/our (research|study|findings|data|analysis)/i, /we (found|discovered|analyzed|surveyed|tested)/i, /original (research|data|study)/i, /proprietary (data|research)/i, /internal (data|study|research)/i];
    researchPatterns.forEach(p => {
      if (p.test(bodyText)) hasOriginalResearch = true;
    });

    if ($('meta[property="og:site_name"]').attr('content')) trustSignals.push('Open Graph site identity');
    if ($('link[rel="canonical"]').length) trustSignals.push('Canonical URL set');
    if (url.startsWith('https')) trustSignals.push('HTTPS secure');
    if ($('[itemtype*="Organization"]').length || $('script[type="application/ld+json"]').text().includes('Organization')) {
      trustSignals.push('Organization schema present');
    }
    if ($('.privacy-policy, a[href*="privacy"], a[href*="terms"]').length) trustSignals.push('Privacy/Terms links');
    if ($('a[href*="linkedin"], a[href*="twitter"], a[href*="facebook"]').length) trustSignals.push('Social media presence');

    if ($('footer').text().length > 50) domainAuthorityIndicators.push('Comprehensive footer');
    if ($('nav').length) domainAuthorityIndicators.push('Site navigation present');
    if ($('a[href*="about"]').length) domainAuthorityIndicators.push('About page link');
    if ($('a[href*="contact"]').length) domainAuthorityIndicators.push('Contact page link');

    return {
      hasAuthorCredentials,
      authorDetails: Array.from(new Set(authorDetails)).slice(0, 5),
      hasCitations,
      citationCount,
      hasExpertQuotes,
      expertQuoteCount,
      hasOriginalResearch,
      trustSignals,
      domainAuthorityIndicators,
    };
  }

  private analyzeContentFluency($: cheerio.CheerioAPI): ContentFluencyAnalysis {
    const bodyText = extractMainContent($);
    const sentences = bodyText.split(/[.!?]+/).filter(s => s.trim().length > 10);
    const averageSentenceLength = sentences.length > 0
      ? Math.round(sentences.reduce((sum, s) => sum + s.trim().split(/\s+/).length, 0) / sentences.length)
      : 0;

    const words = bodyText.split(/\s+/).filter(w => w.length > 1);
    const contentWords = words.filter(w => isContentWord(w));
    const totalWords = contentWords.length;
    const readabilityScore = computeReadabilityScore(contentWords, sentences);

    const paragraphs = extractParagraphs($);
    const goodParagraphs = paragraphs.filter(p => {
      const wordCount = p.split(/\s+/).length;
      return wordCount >= 10 && wordCount <= 80;
    });
    const paragraphClarity = paragraphs.length > 0 ? Math.round((goodParagraphs.length / paragraphs.length) * 100) : 0;

    const topSummarySnippets: string[] = [];
    paragraphs.slice(0, 20).forEach(p => {
      const wordCount = p.split(/\s+/).length;
      if (wordCount >= 15 && wordCount <= 60) {
        topSummarySnippets.push(p.substring(0, 150));
      }
    });

    const summarizabilityScore = Math.min(100, Math.round(
      (topSummarySnippets.length >= 5 ? 40 : topSummarySnippets.length * 8) +
      (paragraphClarity >= 70 ? 30 : paragraphClarity * 0.4) +
      (readabilityScore >= 50 ? 30 : readabilityScore * 0.6)
    ));

    const transitionPatterns = /\b(however|therefore|furthermore|moreover|additionally|consequently|nevertheless|in addition|as a result|for example|in contrast|on the other hand|similarly|meanwhile)\b/gi;
    const transitionMatches = bodyText.match(transitionPatterns);
    const transitionWords = transitionMatches ? transitionMatches.length : 0;

    const passivePattern = /\b(is|are|was|were|been|being|be)\s+\w+ed\b/gi;
    const passiveMatches = bodyText.match(passivePattern);
    const passiveCount = passiveMatches ? passiveMatches.length : 0;
    const passiveVoicePercentage = sentences.length > 0 ? Math.round((passiveCount / sentences.length) * 100) : 0;

    return {
      readabilityScore,
      averageSentenceLength,
      summarizabilityScore,
      topSummarySnippets: topSummarySnippets.slice(0, 5),
      paragraphClarity,
      transitionWords,
      passiveVoicePercentage,
    };
  }

  private analyzeUniqueValue($: cheerio.CheerioAPI): UniqueValueAnalysis {
    const bodyText = extractMainContent($);

    const statPatterns = [/\d+(\.\d+)?%/g, /\$[\d,]+(\.\d+)?/g, /\d+x\b/g, /\d+ (million|billion|thousand|percent)/gi];
    let statisticsCount = 0;
    statPatterns.forEach(p => {
      const m = bodyText.match(p);
      if (m) statisticsCount += m.length;
    });
    const hasStatistics = statisticsCount > 0;

    const dataPoints: string[] = [];
    $('table, [class*="stat"], [class*="metric"], [class*="data"], [class*="chart"], [class*="figure"]').each((_, el) => {
      const text = $(el).text().trim().substring(0, 80);
      if (text.length > 5) dataPoints.push(text);
    });

    let hasOriginalData = false;
    const dataPatterns = [/our (data|research|survey|study|findings|analysis)/i, /we (measured|tracked|collected|surveyed|analyzed|tested)/i, /based on (our|internal)/i, /proprietary/i];
    dataPatterns.forEach(p => {
      if (p.test(bodyText)) hasOriginalData = true;
    });
    if (dataPoints.length > 0) hasOriginalData = true;

    let hasUniqueInsights = false;
    const insightPatterns = [/in (my|our) experience/i, /what (we|I) (found|learned|discovered)/i, /(key|main|important) (takeaway|insight|finding|lesson)/i, /the truth is/i, /contrary to (popular|common) belief/i, /here'?s (what|why)/i];
    insightPatterns.forEach(p => {
      if (p.test(bodyText)) hasUniqueInsights = true;
    });

    let quotesCount = 0;
    $('blockquote').each(() => { quotesCount++; });
    const quoteMarks = bodyText.match(/[""]/g);
    if (quoteMarks) quotesCount += Math.floor(quoteMarks.length / 2);

    const firstPersonPatterns = /\b(I have|I've|in my experience|I personally|I recommend|my team|we have|we've)\b/gi;
    const fpMatches = bodyText.match(firstPersonPatterns);
    const firstPersonExperience = fpMatches ? fpMatches.length > 0 : false;

    let caseStudyPresent = false;
    const casePatterns = [/case study/i, /real[ -]world example/i, /client (story|result|success)/i, /before and after/i, /results we achieved/i];
    casePatterns.forEach(p => {
      if (p.test(bodyText)) caseStudyPresent = true;
    });

    return {
      hasStatistics,
      statisticsCount,
      hasOriginalData,
      dataPoints: dataPoints.slice(0, 10),
      hasUniqueInsights,
      quotesCount,
      firstPersonExperience,
      caseStudyPresent,
    };
  }

  private analyzeEntityOptimization($: cheerio.CheerioAPI): EntityOptimizationAnalysis {
    const bodyText = extractMainContent($).toLowerCase();
    const title = $('title').text().toLowerCase();
    const h1 = $('h1').first().text().toLowerCase();
    const metaDesc = $('meta[name="description"]').attr('content')?.toLowerCase() || '';

    const words = bodyText.split(/\s+/).filter(w => w.length > 3);
    const wordFreq: Record<string, number> = {};
    words.forEach(w => {
      const clean = w.replace(/[^a-z0-9]/g, '');
      if (clean.length > 3) wordFreq[clean] = (wordFreq[clean] || 0) + 1;
    });

    const stopWordsArr = ['this', 'that', 'with', 'from', 'have', 'been', 'were', 'will', 'would', 'could', 'should', 'their', 'there', 'they', 'your', 'what', 'when', 'where', 'which', 'more', 'also', 'than', 'other', 'about', 'into', 'over', 'some', 'very', 'just', 'most', 'only', 'like', 'make', 'made', 'each', 'does', 'well', 'back', 'even', 'then', 'much', 'need'];

    const sorted = Object.entries(wordFreq)
      .filter(([w]) => !stopWordsArr.includes(w))
      .sort((a, b) => b[1] - a[1]);

    const primaryEntities = sorted.slice(0, 10).map(([w]) => w);
    const relatedEntities = sorted.slice(10, 25).map(([w]) => w);

    const totalMeaningful = sorted.reduce((s, [, c]) => s + c, 0);
    const topEntityOccurrences = sorted.slice(0, 10).reduce((s, [, c]) => s + c, 0);
    const entityDensity = totalMeaningful > 0 ? Math.round((topEntityOccurrences / totalMeaningful) * 100) : 0;

    const headings = $('h1, h2, h3, h4').toArray().map(el => $(el).text().toLowerCase());
    const headingText = headings.join(' ');
    const entitiesInHeadings = primaryEntities.filter(e => headingText.includes(e));
    const entityCoverage = primaryEntities.length > 0 ? Math.round((entitiesInHeadings.length / primaryEntities.length) * 100) : 0;

    const h2Count = $('h2').length;
    const h3Count = $('h3').length;
    const paragraphCount = $('p').length;
    const topicalDepthScore = Math.min(100, Math.round(
      (h2Count >= 3 ? 25 : h2Count * 8) +
      (h3Count >= 5 ? 25 : h3Count * 5) +
      (paragraphCount >= 10 ? 25 : paragraphCount * 2.5) +
      (primaryEntities.length >= 8 ? 25 : primaryEntities.length * 3)
    ));

    const expectedRelated = this.generateRelatedEntities(primaryEntities);
    const missingEntities = expectedRelated.filter(e => !bodyText.includes(e));

    const entitiesInTitle = primaryEntities.filter(e => title.includes(e) || h1.includes(e));
    const entitiesInMeta = primaryEntities.filter(e => metaDesc.includes(e));
    const semanticRelevance = Math.min(100, Math.round(
      (entitiesInTitle.length > 0 ? 40 : 0) +
      (entitiesInMeta.length > 0 ? 20 : 0) +
      (entityCoverage >= 50 ? 20 : entityCoverage * 0.4) +
      (topicalDepthScore >= 70 ? 20 : topicalDepthScore * 0.28)
    ));

    return {
      primaryEntities,
      entityDensity,
      entityCoverage,
      topicalDepthScore,
      relatedEntities,
      missingEntities: missingEntities.slice(0, 5),
      semanticRelevance,
    };
  }

  private analyzeMultiFormat($: cheerio.CheerioAPI): MultiFormatAnalysis {
    const imageCount = $('img').length;
    const videoCount = $('video, iframe[src*="youtube"], iframe[src*="vimeo"], iframe[src*="wistia"], [class*="video"]').length;
    const tableCount = $('table').length;

    const hasInfographics = $('img[alt*="infographic"], img[class*="infographic"], [class*="infographic"], img[src*="infographic"]').length > 0;
    const hasInteractiveElements = $('form, [class*="calculator"], [class*="quiz"], [class*="interactive"], [class*="slider"], input[type="range"], [class*="accordion"], details').length > 0;
    const hasAudio = $('audio, iframe[src*="soundcloud"], iframe[src*="spotify"], [class*="podcast"]').length > 0;
    const hasCharts = $('canvas, svg[class*="chart"], [class*="chart"], [class*="graph"], [class*="d3"]').length > 0;

    const contentFormats: string[] = [];
    if (imageCount > 0) contentFormats.push('Images');
    if (videoCount > 0) contentFormats.push('Video');
    if (tableCount > 0) contentFormats.push('Tables');
    if (hasInfographics) contentFormats.push('Infographics');
    if (hasInteractiveElements) contentFormats.push('Interactive');
    if (hasAudio) contentFormats.push('Audio');
    if (hasCharts) contentFormats.push('Charts/Graphs');
    if ($('ol, ul').length > 0) contentFormats.push('Lists');
    if ($('blockquote').length > 0) contentFormats.push('Quotes');
    if ($('code, pre').length > 0) contentFormats.push('Code');

    return {
      hasImages: imageCount > 0,
      imageCount,
      hasVideos: videoCount > 0,
      videoCount,
      hasInfographics,
      hasInteractiveElements,
      hasAudio,
      hasTables: tableCount > 0,
      tableCount,
      hasCharts,
      contentFormats,
    };
  }

  private scoreSourceAuthority(a: SourceAuthorityAnalysis): number {
    let score = 0;
    if (a.hasAuthorCredentials) score += 20;
    if (a.hasCitations) score += Math.min(20, a.citationCount * 2);
    if (a.hasExpertQuotes) score += Math.min(20, a.expertQuoteCount * 5);
    if (a.hasOriginalResearch) score += 20;
    score += Math.min(10, a.trustSignals.length * 2);
    score += Math.min(10, a.domainAuthorityIndicators.length * 3);
    return Math.min(100, score);
  }

  private scoreContentFluency(f: ContentFluencyAnalysis): number {
    let score = 0;

    score += Math.round(f.readabilityScore * 0.25);

    if (f.summarizabilityScore >= 70) score += 25;
    else if (f.summarizabilityScore >= 40) score += 15;
    else if (f.summarizabilityScore >= 10) score += 8;
    else score += 3;

    if (f.paragraphClarity >= 70) score += 20;
    else if (f.paragraphClarity >= 40) score += 12;
    else if (f.paragraphClarity > 0) score += 5;

    if (f.transitionWords >= 5) score += 15;
    else if (f.transitionWords >= 2) score += 8;
    else if (f.transitionWords >= 1) score += 4;

    if (f.passiveVoicePercentage <= 20) score += 15;
    else if (f.passiveVoicePercentage <= 40) score += 8;
    else score += 3;

    return Math.min(100, score);
  }

  private scoreUniqueValue(u: UniqueValueAnalysis): number {
    let score = 0;
    if (u.hasStatistics) score += Math.min(25, u.statisticsCount * 3);
    if (u.hasOriginalData) score += 20;
    if (u.hasUniqueInsights) score += 15;
    if (u.quotesCount > 0) score += Math.min(15, u.quotesCount * 5);
    if (u.firstPersonExperience) score += 10;
    if (u.caseStudyPresent) score += 15;
    return Math.min(100, score);
  }

  private scoreEntityOptimization(e: EntityOptimizationAnalysis): number {
    let score = 0;
    if (e.primaryEntities.length >= 8) score += 20;
    else score += e.primaryEntities.length * 2.5;

    if (e.entityCoverage >= 60) score += 20;
    else score += e.entityCoverage * 0.33;

    if (e.topicalDepthScore >= 70) score += 25;
    else score += e.topicalDepthScore * 0.36;

    if (e.semanticRelevance >= 70) score += 20;
    else score += e.semanticRelevance * 0.28;

    score += Math.max(0, 15 - e.missingEntities.length * 3);
    return Math.min(100, Math.round(score));
  }

  private scoreMultiFormat(m: MultiFormatAnalysis): number {
    let score = 0;
    if (m.hasImages) score += Math.min(20, m.imageCount * 2);
    if (m.hasVideos) score += 20;
    if (m.hasTables) score += 15;
    if (m.hasInfographics) score += 10;
    if (m.hasInteractiveElements) score += 10;
    if (m.hasAudio) score += 10;
    if (m.hasCharts) score += 10;
    score += Math.min(5, (m.contentFormats.length - 1) * 1);
    return Math.min(100, score);
  }

  private getRating(score: number): GeoRating {
    if (score >= 80) return "Highly Optimized";
    if (score >= 60) return "Optimized";
    if (score >= 40) return "Emerging";
    return "Not Ready";
  }

  private generateChecks(
    sa: SourceAuthorityAnalysis,
    cf: ContentFluencyAnalysis,
    uv: UniqueValueAnalysis,
    eo: EntityOptimizationAnalysis,
    mf: MultiFormatAnalysis
  ): GeoCheck[] {
    const checks: GeoCheck[] = [];

    checks.push({
      name: "Author Credentials",
      status: sa.hasAuthorCredentials ? "PASS" : "FAIL",
      details: sa.hasAuthorCredentials
        ? `Author identified: ${sa.authorDetails.slice(0, 2).join(', ')}`
        : "No author credentials found on the page",
      category: "source-authority",
      impact: "High",
      recommendation: sa.hasAuthorCredentials ? "Author credentials are present." : "Add author name, bio, and credentials to establish E-E-A-T.",
      technicalFix: !sa.hasAuthorCredentials ? [
        "STEP 1 — Add a visible author byline near the top of every article:",
        '  <div class="author-byline" itemprop="author" itemscope itemtype="https://schema.org/Person">',
        '    <img src="/team/jane.jpg" itemprop="image" alt="Jane Smith" />',
        '    <span itemprop="name">Jane Smith</span>',
        '    <span itemprop="jobTitle">Senior Marketing Strategist</span>',
        '    <a href="/about/jane" itemprop="url">View bio</a>',
        "  </div>",
        "",
        "STEP 2 — Add a 2–4 sentence author bio at the bottom of the article describing relevant experience, certifications, education, or notable work.",
        "",
        "STEP 3 — Mirror the author in your JSON-LD Article schema:",
        '  "author": {',
        '    "@type": "Person",',
        '    "name": "Jane Smith",',
        '    "url": "https://yoursite.com/about/jane",',
        '    "sameAs": ["https://linkedin.com/in/janesmith"]',
        "  }",
        "",
        "STEP 4 — Create a dedicated /about page and a per-author page (/about/jane) with credentials, experience, and links to social profiles. AI engines look for this corroborating identity layer.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: "External Citations",
      status: sa.citationCount >= 3 ? "PASS" : sa.citationCount > 0 ? "WARNING" : "FAIL",
      details: `Found ${sa.citationCount} external source citations`,
      category: "source-authority",
      impact: "High",
      recommendation: sa.citationCount >= 3 ? "Good citation practice." : "Add references to authoritative external sources to boost credibility.",
      technicalFix: sa.citationCount < 3 ? [
        `CURRENT: ${sa.citationCount} external citation${sa.citationCount === 1 ? "" : "s"}. TARGET: at least 3 high-authority citations per long-form piece.`,
        "",
        "STEP 1 — Identify your strongest claims (statistics, definitions, expert opinions) and link each one to an authoritative external source: peer-reviewed studies, government data (gov, eu), industry research (Gartner, McKinsey), reputable publications (Reuters, NYT), or official documentation.",
        "",
        "STEP 2 — Use inline citation HTML, not bare links:",
        '  <p>According to a <a href="https://www.semrush.com/blog/seo-stats/"',
        '     rel="noopener" target="_blank">2024 Semrush study</a>, 68% of online experiences begin with a search engine.</p>',
        "",
        "STEP 3 — For research-heavy content, add a References section at the bottom:",
        '  <section id="references">',
        '    <h2>References</h2>',
        '    <ol>',
        '      <li><cite>Smith, J. (2024). State of SEO. <a href="...">Semrush Research</a>.</cite></li>',
        '    </ol>',
        '  </section>',
        "",
        "STEP 4 — Avoid linking only to your own pages — AI engines specifically reward outbound links to independent authorities as a trust signal.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: "Expert Quotes & Sources",
      status: sa.hasExpertQuotes ? "PASS" : "FAIL",
      details: sa.hasExpertQuotes
        ? `Found ${sa.expertQuoteCount} expert references or quotes`
        : "No expert quotes or attribution found",
      category: "source-authority",
      impact: "Medium",
      recommendation: sa.hasExpertQuotes ? "Expert sourcing is present." : "Include expert quotes, data from studies, or professional attribution.",
      technicalFix: !sa.hasExpertQuotes ? [
        "STEP 1 — Pick 2–3 claims in your article that would benefit from expert authority (best practices, predictions, contested points). For each, find a relevant expert: an industry leader, a published academic, a senior in-house specialist, or a frequently cited source.",
        "",
        "STEP 2 — Reach out for a 1–2 sentence quote (LinkedIn DM, email, podcast clip, public statement). Even repurposing an existing public quote with proper attribution is acceptable.",
        "",
        "STEP 3 — Use a real <blockquote> with attribution — AI parsers look for this exact pattern:",
        '  <blockquote cite="https://source.com/article">',
        '    <p>"Schema markup is now a baseline requirement, not a competitive advantage."</p>',
        '    <footer>',
        '      — <cite>Lily Ray, VP of SEO Strategy at Amsive Digital</cite>',
        '    </footer>',
        '  </blockquote>',
        "",
        'STEP 4 — Reference data from named studies in-line: "A 2024 Backlinko study of 11.8M Google search results found that…" Always include the year, the source organization, and the sample size when relevant.',
        "",
        "STEP 5 — Add Quotation/ClaimReview JSON-LD schema for major quotes when applicable so AI engines can extract the speaker, the claim, and the source automatically.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: "Original Research",
      status: sa.hasOriginalResearch ? "PASS" : "WARNING",
      details: sa.hasOriginalResearch
        ? "Content references original research or proprietary data"
        : "No original research or proprietary data detected",
      category: "source-authority",
      impact: "High",
      recommendation: sa.hasOriginalResearch ? "Original data referenced." : "Include original data, surveys, or proprietary findings to differentiate.",
      technicalFix: !sa.hasOriginalResearch ? [
        "Original research is the single biggest differentiator in AI citations — generative engines preferentially cite the *primary source* of any data point.",
        "",
        "STEP 1 — Audit what proprietary data you already have: customer survey results, anonymized usage analytics, A/B test outcomes, internal benchmarks, support ticket trends, conversion-rate data per channel.",
        "",
        "STEP 2 — Pick one shareable dataset and publish a focused study. Minimum format:",
        "  • A clear methodology section (sample size, time period, how data was collected)",
        "  • 3–5 headline findings with specific numbers",
        "  • Charts/tables that visualize the data",
        "  • A downloadable PDF or CSV for transparency",
        "",
        "STEP 3 — Mark it up clearly so AI engines recognize it as primary research:",
        '  <article itemscope itemtype="https://schema.org/Report">',
        '    <h1 itemprop="name">2025 Croatian E-Commerce Conversion Benchmark Study</h1>',
        '    <meta itemprop="datePublished" content="2025-03-01" />',
        '    <p>Methodology: <span itemprop="description">Analyzed 1.2M sessions across 47 Croatian e-commerce sites…</span></p>',
        "  </article>",
        "",
        "STEP 4 — Promote it: pitch journalists, share on LinkedIn with key stats, and link from your top-traffic pages so the study accumulates backlinks (which feeds back into AI authority signals).",
      ].join("\n") : undefined,
    });

    checks.push({
      name: "Content Readability",
      status: cf.readabilityScore >= 50 ? "PASS" : cf.readabilityScore >= 30 ? "WARNING" : "FAIL",
      details: `Readability score: ${cf.readabilityScore}/100, avg sentence length: ${cf.averageSentenceLength} words`,
      category: "content-fluency",
      impact: "Medium",
      recommendation: cf.readabilityScore >= 50 ? "Content is readable." : "Simplify sentences and use clearer language for AI extraction.",
      technicalFix: cf.readabilityScore < 50 ? [
        `CURRENT: readability ${cf.readabilityScore}/100, avg sentence length ${cf.averageSentenceLength} words. TARGET: 50+ score, 15–20 word sentences.`,
        "",
        "STEP 1 — Run your top 10 pages through Hemingway Editor (hemingwayapp.com) and aim for Grade 7–9. Anything labelled “very hard to read” signals to AI engines that the content is not summarizable.",
        "",
        "STEP 2 — Apply these rewriting rules:",
        "  • One idea per sentence. Cut sentences over 25 words in half at the conjunction (and / but / which).",
        '  • Replace passive voice ("The product was launched by us") with active ("We launched the product").',
        '  • Replace jargon with plain alternatives: "utilize" → "use", "leverage" → "use", "implement" → "set up".',
        "  • Define every acronym on first use: SEO (search engine optimization).",
        "",
        "STEP 3 — Use plain HTML structure that helps both humans and AI scan the page:",
        "  • Short paragraphs (2–4 sentences max).",
        "  • Bold key terms once per section so AI can extract entities.",
        "  • Use bullet lists whenever you have 3+ parallel items.",
        "",
        "STEP 4 — Keep a glossary section for any necessary technical terms — AI engines often pull definitions verbatim from glossary blocks.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: "AI Summarizability",
      status: cf.summarizabilityScore >= 60 ? "PASS" : cf.summarizabilityScore >= 30 ? "WARNING" : "FAIL",
      details: `Summarizability: ${cf.summarizabilityScore}/100, ${cf.topSummarySnippets.length} extractable snippets`,
      category: "content-fluency",
      impact: "High",
      recommendation: cf.summarizabilityScore >= 60 ? "Content is easily summarizable." : "Write concise, self-contained paragraphs that AI can quote directly.",
      technicalFix: cf.summarizabilityScore < 60 ? [
        `CURRENT: summarizability ${cf.summarizabilityScore}/100. TARGET: 60+ — meaning paragraphs are self-contained and quote-ready.`,
        "",
        'STEP 1 — Lead each section with a "definitional sentence" that answers the section heading directly. AI engines extract these as featured snippets:',
        '  H2: "What is technical SEO?"',
        '  Opening: "Technical SEO is the practice of optimizing a website\'s infrastructure — crawling, indexing, rendering, and site architecture — so search engines can discover and understand its content."',
        "",
        "STEP 2 — Make each paragraph stand alone. A reader (or LLM) should be able to copy any single paragraph out of context and have it still make sense. Avoid:",
        '  • Pronouns referring back to previous paragraphs ("As mentioned above…", "This means…").',
        "  • Section numbers (\"In step 3…\") — re-state the concept instead.",
        "",
        "STEP 3 — Add a 'TL;DR' or 'Key takeaways' block at the top of long articles:",
        '  <aside class="key-takeaways" aria-label="Key takeaways">',
        '    <h2>Key Takeaways</h2>',
        '    <ul>',
        '      <li>Schema markup is required for AI Overviews eligibility.</li>',
        '      <li>Structured FAQ blocks increase featured-snippet capture by ~40%.</li>',
        '    </ul>',
        '  </aside>',
        "",
        "STEP 4 — Use Q&A formatting (H2 = question, paragraph = direct answer) for at least 3 sections per page. AI engines pull these verbatim.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: "Paragraph Clarity",
      status: cf.paragraphClarity >= 60 ? "PASS" : cf.paragraphClarity >= 30 ? "WARNING" : "FAIL",
      details: `${cf.paragraphClarity}% of paragraphs are well-sized (10-80 words)`,
      category: "content-fluency",
      impact: "Medium",
      recommendation: cf.paragraphClarity >= 60 ? "Good paragraph structure." : "Aim for paragraphs of 2-4 sentences that each convey one clear idea.",
      technicalFix: cf.paragraphClarity < 60 ? [
        `CURRENT: ${cf.paragraphClarity}% of paragraphs are well-sized. TARGET: 60%+ in the 10–80 word band.`,
        "",
        "STEP 1 — Find your longest paragraphs (>80 words) and split them. Every paragraph should make exactly one point. If a paragraph contains a list of items, convert it into a <ul> or numbered <ol>.",
        "",
        "STEP 2 — Find your shortest paragraphs (<10 words). Either expand them with a supporting sentence/example, or merge them with the surrounding paragraph. One-sentence paragraphs are fine sparingly for emphasis but not as the default.",
        "",
        "STEP 3 — Apply this CSS to enforce visual rhythm and discourage walls of text:",
        "  article p { max-width: 70ch; line-height: 1.65; margin-block: 0.85em; }",
        "  article p + p { margin-top: 1em; }",
        "",
        "STEP 4 — Use a writing checklist before publishing: each paragraph (a) makes one point, (b) opens with a clear topic sentence, (c) is between 2 and 5 sentences, (d) reads naturally aloud.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: "Statistics & Data",
      status: uv.hasStatistics ? "PASS" : "FAIL",
      details: uv.hasStatistics
        ? `Found ${uv.statisticsCount} data points/statistics`
        : "No statistics or quantitative data found",
      category: "unique-value",
      impact: "High",
      recommendation: uv.hasStatistics ? "Statistical data present." : "Add specific numbers, percentages, and data to make content more citable.",
      technicalFix: !uv.hasStatistics ? [
        "Pages with concrete numbers get cited 3–5× more often by AI engines than those with only general claims.",
        "",
        'STEP 1 — Replace vague qualifiers with hard numbers wherever possible: "many users" → "73% of users"; "fast loading" → "loads in under 1.2 seconds"; "significant improvement" → "47% increase in conversions".',
        "",
        "STEP 2 — Each long-form page should contain at least 5–8 specific data points. Sources to mine:",
        "  • Industry reports (Statista, Backlinko, Ahrefs, Semrush)",
        "  • Government data (gov, eu, eurostat)",
        "  • Academic studies (Google Scholar)",
        "  • Your own analytics, A/B tests, customer surveys",
        "",
        "STEP 3 — Format numbers so AI parsers and screen readers handle them correctly:",
        '  <p>Mobile traffic accounted for <strong>62.5%</strong> of global page views in <time datetime="2024">2024</time>',
        '     (<a href="https://www.statista.com/...">Statista, 2024</a>).</p>',
        "",
        "STEP 4 — When showing multiple data points, use a real HTML <table> with <thead>/<tbody> — AI engines extract these reliably and can cite individual rows.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: "Original Data & Research",
      status: uv.hasOriginalData ? "PASS" : "WARNING",
      details: uv.hasOriginalData
        ? `Original data present with ${uv.dataPoints.length} identifiable data elements`
        : "No original data or proprietary research detected",
      category: "unique-value",
      impact: "High",
      recommendation: uv.hasOriginalData ? "Original data found." : "Include proprietary data, survey results, or unique findings.",
      technicalFix: !uv.hasOriginalData ? [
        "STEP 1 — Take stock of the proprietary data you can publish: aggregated customer survey responses, anonymized analytics (CTR, conversion rate by segment), benchmark studies of your category, A/B-test outcomes, support-ticket trends.",
        "",
        "STEP 2 — Pick ONE dataset and write a 1,000–1,500 word findings post. Required structure:",
        "  • Title that names the metric and the year ('2025 SaaS Onboarding Benchmark Report').",
        "  • Methodology paragraph (sample size, time window, segmentation).",
        "  • 3–5 headline findings, each its own H2 with a specific number.",
        "  • At least one chart (PNG with descriptive alt) or HTML <table>.",
        "  • Limitations / caveats section — increases trust, AI engines reward this.",
        "",
        "STEP 3 — Make the data discoverable for AI:",
        '  <p>Our analysis of <strong>1,247 Croatian SMB websites</strong> (Q1 2025)',
        '     found that <strong>68%</strong> ship without an SSL certificate on at least one subdomain.</p>',
        "",
        "STEP 4 — Add Dataset/Report schema and link from at least 3 high-authority pages on your own site — internal linking accelerates indexation and AI citation.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: "Unique Insights & Experience",
      status: uv.hasUniqueInsights || uv.firstPersonExperience ? "PASS" : "WARNING",
      details: `${uv.hasUniqueInsights ? 'Unique insights present' : 'No unique insights'}. ${uv.firstPersonExperience ? 'First-person experience shared.' : ''}`.trim(),
      category: "unique-value",
      impact: "Medium",
      recommendation: uv.hasUniqueInsights ? "Unique perspective present." : "Share personal experience, unique perspectives, or proprietary insights.",
      technicalFix: !(uv.hasUniqueInsights || uv.firstPersonExperience) ? [
        'Google\'s E-E-A-T framework added an extra E for "Experience" specifically because AI overviews reward first-hand accounts.',
        "",
        'STEP 1 — Add at least one first-person passage per article that demonstrates real experience: "When we migrated our store to Shopify in 2023, we discovered…". Generic, voice-less content is the easiest for AI to dismiss.',
        "",
        "STEP 2 — Include 2–3 specific anecdotes/examples per long article:",
        "  • A real customer name and outcome (with permission).",
        "  • A failure or counter-intuitive finding from your own work.",
        "  • A before/after metric you personally measured.",
        "",
        "STEP 3 — Mark up first-person content so AI engines tag it as experiential:",
        '  <section itemscope itemtype="https://schema.org/Review">',
        '    <p itemprop="reviewBody">After running this approach across 14 client sites, we saw an average...</p>',
        '    <span itemprop="author" itemscope itemtype="https://schema.org/Person">',
        '      <span itemprop="name">Marko Horvat</span></span>',
        '  </section>',
        "",
        "STEP 4 — Avoid generic AI-written paragraphs that read identically to every other site in your space. Test by Googling a sentence in quotes — if 50 results come back, rewrite.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: "Case Studies",
      status: uv.caseStudyPresent ? "PASS" : "WARNING",
      details: uv.caseStudyPresent
        ? "Case study or real-world example found"
        : "No case studies or concrete examples detected",
      category: "unique-value",
      impact: "Medium",
      recommendation: uv.caseStudyPresent ? "Case study content present." : "Add case studies or real-world examples to demonstrate practical value.",
      technicalFix: !uv.caseStudyPresent ? [
        "STEP 1 — Pick 2–3 strongest customer wins and write each as a focused case study (600–1,000 words). Use this proven structure:",
        "  • Client + industry + size",
        "  • Challenge (with specific pain metrics)",
        "  • Approach (what you did, why, what you considered and rejected)",
        "  • Result (3–5 specific before/after metrics)",
        "  • Quote from the client",
        "",
        "STEP 2 — Even within regular articles, embed mini-case-study callouts:",
        '  <aside class="mini-case" aria-label="Real-world example">',
        '    <h3>Example: Walden Plants</h3>',
        '    <p>By restructuring their product schema, organic traffic to category pages',
        '    rose from 12,400 to 18,900 monthly sessions (+52%) in 90 days.</p>',
        "  </aside>",
        "",
        "STEP 3 — Add CaseStudy / Article schema with publisher, datePublished, and customer mentions so AI engines can cite the specific case rather than just the parent article.",
        "",
        "STEP 4 — Cross-link case studies from related solution/service pages — internal links from high-intent pages signal that the case is the primary proof for the surrounding claim.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: "Entity Coverage in Headings",
      status: eo.entityCoverage >= 50 ? "PASS" : eo.entityCoverage >= 25 ? "WARNING" : "FAIL",
      details: `${eo.entityCoverage}% of primary entities appear in headings`,
      category: "entity-optimization",
      impact: "Medium",
      recommendation: eo.entityCoverage >= 50 ? "Good entity coverage." : "Include primary topic entities in your H2/H3 headings.",
      technicalFix: eo.entityCoverage < 50 ? [
        `CURRENT: ${eo.entityCoverage}% entity coverage in headings. TARGET: 50%+ — primary topic entities should appear in H2/H3 text.`,
        "",
        'STEP 1 — Identify the 8–12 primary entities for the page (the named concepts a knowledge graph would extract). Example for an article on "Technical SEO": crawling, indexing, robots.txt, XML sitemap, Core Web Vitals, schema markup, canonical tags, mobile-first indexing.',
        "",
        "STEP 2 — Restructure headings so each major entity has its own section:",
        "  H1: The Complete Guide to Technical SEO",
        "  ├─ H2: How crawling works",
        "  ├─ H2: Why indexing matters",
        "  ├─ H2: Configuring robots.txt",
        "  ├─ H2: Building an XML sitemap",
        "  └─ H2: Core Web Vitals explained",
        "",
        "STEP 3 — Keep heading text natural-language (not keyword-stuffed). 'How crawling works' is better than 'Crawling SEO Guide Tips'. AI engines reward semantic clarity over keyword density.",
        "",
        "STEP 4 — Validate visually: a reader should be able to skim ONLY the H2/H3 outline and grasp the page's full topic coverage. If they can't, you're missing entity headings.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: "Topical Depth",
      status: eo.topicalDepthScore >= 60 ? "PASS" : eo.topicalDepthScore >= 30 ? "WARNING" : "FAIL",
      details: `Topical depth: ${eo.topicalDepthScore}/100 with ${eo.primaryEntities.length} primary entities`,
      category: "entity-optimization",
      impact: "High",
      recommendation: eo.topicalDepthScore >= 60 ? "Good topical coverage." : "Expand content to cover more subtopics and related entities.",
      technicalFix: eo.topicalDepthScore < 60 ? [
        `CURRENT: topical depth ${eo.topicalDepthScore}/100. TARGET: 60+. AI engines prefer pages that cover a topic comprehensively over thin pages that only address part of it.`,
        "",
        'STEP 1 — Run a "People Also Ask" check on Google for your main keyword. List every related question. Each question should map to a section of your page (or a clearly linked sub-page).',
        "",
        'STEP 2 — Also pull related entities from Google\'s related searches and from your competitors\' subheadings. Build a "topical map" before writing — coverage gaps become obvious.',
        "",
        "STEP 3 — Adopt a hub-and-spoke structure for any high-priority topic:",
        "  • One pillar/hub page giving the comprehensive overview (2,500+ words).",
        "  • 6–10 spoke pages each going deep on one sub-entity.",
        "  • Bidirectional internal links between pillar and spokes.",
        "",
        "STEP 4 — When expanding existing content, add sections in this priority order: definitions → how-it-works → step-by-step / methods → comparisons → common mistakes → FAQ. AI engines pull from each of these section types.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: "Multi-Format Content",
      status: mf.contentFormats.length >= 4 ? "PASS" : mf.contentFormats.length >= 2 ? "WARNING" : "FAIL",
      details: `${mf.contentFormats.length} content format(s): ${mf.contentFormats.join(', ')}`,
      category: "multi-format",
      impact: "Medium",
      recommendation: mf.contentFormats.length >= 4 ? "Good format variety." : "Add images, tables, lists, and videos for richer AI indexing.",
      technicalFix: mf.contentFormats.length < 4 ? [
        `CURRENT: ${mf.contentFormats.length} format(s) — ${mf.contentFormats.join(', ') || 'text only'}. TARGET: 4+ formats per long-form page.`,
        "",
        "STEP 1 — Aim to combine at least these four formats on every long page:",
        "  • Text (paragraphs)",
        "  • Lists (bulleted or numbered) — for parallel items",
        "  • Tables — for comparisons / specs / data",
        "  • Visuals — diagrams, screenshots, or embedded video",
        "",
        "STEP 2 — Convert prose passages into structure where possible:",
        '  Before: "There are three main types: type A, type B, and type C…"',
        '  After: <ul><li><strong>Type A:</strong> …</li><li><strong>Type B:</strong> …</li>…</ul>',
        "",
        "STEP 3 — Add at least one HTML <table> with <thead>/<tbody> for any comparison or structured fact-set. AI engines parse tables far more reliably than prose comparisons.",
        "",
        "STEP 4 — Embed video where useful (YouTube/Vimeo) and provide a transcript on the page so AI engines can also extract the spoken content.",
        "",
        "STEP 5 — Include 1–2 informative images per major section with descriptive alt text and figure captions:",
        '  <figure>',
        '    <img src="/img/crawl-flow.png" alt="Diagram showing how Googlebot crawls a sitemap" />',
        '    <figcaption>Figure 1. Googlebot crawl flow from sitemap.xml to indexing.</figcaption>',
        '  </figure>',
      ].join("\n") : undefined,
    });

    checks.push({
      name: "Visual Content",
      status: mf.imageCount >= 3 ? "PASS" : mf.imageCount > 0 ? "WARNING" : "FAIL",
      details: `${mf.imageCount} image(s), ${mf.videoCount} video(s)`,
      category: "multi-format",
      impact: "Medium",
      recommendation: mf.imageCount >= 3 ? "Good visual content." : "Add more images with descriptive alt text and consider embedding videos.",
      technicalFix: mf.imageCount < 3 ? [
        `CURRENT: ${mf.imageCount} image${mf.imageCount === 1 ? "" : "s"}, ${mf.videoCount} video${mf.videoCount === 1 ? "" : "s"}. TARGET: at least 3 contextual images per long-form page.`,
        "",
        "STEP 1 — Add at least one image to each major H2 section. Best types for AI/SEO:",
        "  • Original screenshots / annotated UIs",
        "  • Custom diagrams (you can use Excalidraw or Figma)",
        "  • Charts of your own data",
        "  • Photos of real people / real workplaces (avoid generic stock)",
        "",
        "STEP 2 — Always provide descriptive alt text (not 'image1.jpg'):",
        '  <img src="/img/crawl-budget-chart.png"',
        '       alt="Bar chart showing crawl budget consumption by URL pattern, with /products/ taking 42% of total crawl"',
        '       width="800" height="500" loading="lazy" />',
        "",
        "STEP 3 — Use modern formats (WebP/AVIF) and explicit width/height to avoid CLS:",
        '  <picture>',
        '    <source srcset="/img/diagram.avif" type="image/avif">',
        '    <source srcset="/img/diagram.webp" type="image/webp">',
        '    <img src="/img/diagram.png" alt="…" width="1200" height="675" />',
        '  </picture>',
        "",
        "STEP 4 — Wrap images in <figure> with a <figcaption> when they add explanatory value — captions are weighted higher than body text by some AI ranking systems.",
        "",
        "STEP 5 — For tutorial / how-to content, embed a 1–3 minute video summary and provide a full transcript on the page.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: "Structured Data Tables",
      status: mf.hasTables ? "PASS" : "WARNING",
      details: mf.hasTables
        ? `${mf.tableCount} data table(s) found`
        : "No data tables found for structured presentation",
      category: "multi-format",
      impact: "Medium",
      recommendation: mf.hasTables ? "Tables present for data." : "Use HTML tables for comparisons, specifications, or data that AI can extract.",
      technicalFix: !mf.hasTables ? [
        "Tables are one of the highest-value formats for AI engines — generative answers often cite individual rows verbatim.",
        "",
        "STEP 1 — Look for content already in your page that should be a table: comparisons, pricing, specs, schedules, before/after metrics, feature matrices.",
        "",
        "STEP 2 — Convert to a real semantic <table>, NOT a CSS grid of <div>s — AI parsers ignore divs:",
        '  <table>',
        '    <caption>2025 Hosting Plan Comparison</caption>',
        '    <thead>',
        '      <tr><th scope="col">Plan</th><th scope="col">Storage</th><th scope="col">Bandwidth</th><th scope="col">Price/mo</th></tr>',
        '    </thead>',
        '    <tbody>',
        '      <tr><th scope="row">Starter</th><td>10 GB</td><td>100 GB</td><td>€4.99</td></tr>',
        '      <tr><th scope="row">Pro</th><td>50 GB</td><td>500 GB</td><td>€9.99</td></tr>',
        '    </tbody>',
        '  </table>',
        "",
        "STEP 3 — Add Table-friendly schema where appropriate (Product schema for pricing tables, Dataset schema for benchmark tables, FAQPage schema if rows are Q&A).",
        "",
        "STEP 4 — Keep tables under ~10 columns for parsability. For larger datasets, split into multiple focused tables, each with its own <caption>.",
      ].join("\n") : undefined,
    });

    return checks;
  }

  private generateRecommendations(
    checks: GeoCheck[],
    sa: SourceAuthorityAnalysis,
    cf: ContentFluencyAnalysis,
    uv: UniqueValueAnalysis,
    eo: EntityOptimizationAnalysis,
    mf: MultiFormatAnalysis
  ): { title: string; description: string; priority: string; category: string }[] {
    const recs: { title: string; description: string; priority: string; category: string }[] = [];

    const failChecks = checks.filter(c => c.status === 'FAIL');
    const warnChecks = checks.filter(c => c.status === 'WARNING');

    failChecks.forEach(c => {
      recs.push({
        title: `Fix: ${c.name}`,
        description: c.recommendation,
        priority: c.impact === 'High' ? 'Critical' : 'High',
        category: c.category,
      });
    });

    warnChecks.forEach(c => {
      recs.push({
        title: `Improve: ${c.name}`,
        description: c.recommendation,
        priority: 'Medium',
        category: c.category,
      });
    });

    if (!sa.hasOriginalResearch && !uv.hasOriginalData) {
      recs.push({
        title: "Add Original Research or Data",
        description: "Generative engines strongly favor content with unique data, surveys, or original research. This is the #1 differentiator for GEO.",
        priority: "Critical",
        category: "unique-value",
      });
    }

    if (cf.summarizabilityScore < 50) {
      recs.push({
        title: "Improve Content Summarizability",
        description: "Write short, self-contained paragraphs that directly answer questions. AI engines prefer content they can extract and quote verbatim.",
        priority: "High",
        category: "content-fluency",
      });
    }

    if (mf.contentFormats.length < 3) {
      recs.push({
        title: "Diversify Content Formats",
        description: "Add tables, lists, images with alt text, and videos. Multi-format content is more likely to be referenced by different generative engines.",
        priority: "Medium",
        category: "multi-format",
      });
    }

    return recs.slice(0, 8);
  }

  private calculateGenerativeReadiness(
    sa: SourceAuthorityAnalysis,
    cf: ContentFluencyAnalysis,
    uv: UniqueValueAnalysis,
    eo: EntityOptimizationAnalysis,
    mf: MultiFormatAnalysis,
    overallScore: number
  ): number {
    let bonus = 0;
    if (sa.hasOriginalResearch && uv.hasStatistics) bonus += 10;
    if (cf.summarizabilityScore >= 70 && cf.readabilityScore >= 50) bonus += 10;
    if (mf.contentFormats.length >= 5) bonus += 5;
    if (eo.semanticRelevance >= 70) bonus += 5;
    return Math.min(100, overallScore + bonus);
  }


  private generateRelatedEntities(primary: string[]): string[] {
    const related: string[] = [];
    primary.forEach(e => {
      if (e.length > 4) {
        related.push(e + 's');
        related.push(e + 'ing');
      }
    });
    return related.slice(0, 8);
  }

  async compareWebsites(urls: string[]): Promise<GeoComparisonResult> {
    const analyses = await Promise.all(
      urls.map(async (url) => {
        try {
          const result = await this.analyzeWebsite(url);
          const r = result.results as GeoAnalysisResults;
          const passChecks = r.checks.filter(c => c.status === 'PASS');
          const failChecks = r.checks.filter(c => c.status === 'FAIL');
          return {
            url: result.url,
            score: r.score,
            rating: r.rating,
            sourceAuthorityScore: r.sourceAuthorityScore,
            contentFluencyScore: r.contentFluencyScore,
            uniqueValueScore: r.uniqueValueScore,
            entityOptimizationScore: r.entityOptimizationScore,
            multiFormatScore: r.multiFormatScore,
            keyStrengths: passChecks.slice(0, 5).map(c => c.name),
            keyWeaknesses: failChecks.slice(0, 5).map(c => c.name),
          };
        } catch (error: any) {
          const { getFetchErrorCode } = await import("./httpClient");
          return {
            url,
            score: 0,
            rating: "Not Ready" as GeoRating,
            sourceAuthorityScore: 0,
            contentFluencyScore: 0,
            uniqueValueScore: 0,
            entityOptimizationScore: 0,
            multiFormatScore: 0,
            keyStrengths: [],
            keyWeaknesses: [`Analysis failed: ${error.message}`],
            errorCode: getFetchErrorCode(error) || "ANALYSIS_FAILED",
            errorMessage: error?.message || "Analysis failed",
          };
        }
      })
    );

    const sorted = [...analyses].sort((a, b) => b.score - a.score);
    const winner = sorted[0]?.url || urls[0];
    const diff = sorted.length >= 2 ? sorted[0].score - sorted[1].score : 0;
    const summary = sorted.length >= 2
      ? `${new URL(sorted[0].url).hostname} leads with ${sorted[0].score}/100 (${sorted[0].rating}), ${diff > 0 ? `${diff} points ahead of` : "tied with"} ${new URL(sorted[1].url).hostname} (${sorted[1].score}/100, ${sorted[1].rating}).`
      : `${sorted[0]?.url} scored ${sorted[0]?.score}/100.`;

    return { urls, analyses, winner, summary };
  }
}

export const geoAnalyzer = new GeoAnalyzer();
