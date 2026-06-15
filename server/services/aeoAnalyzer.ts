import * as cheerio from "cheerio";
import { extractMainContent } from "./contentExtractor";
import { safeFetchHtmlWithFallback } from "./browserFetch";
import type {
  InsertAeoAnalysis,
  AeoCheck,
  AeoRecommendation,
  AeoAnalysisResults,
  StructuredDataAnalysis,
  ContentFormatAnalysis,
  AuthoritySignals,
  SemanticStructure,
  AiAccessibility,
  AeoRating,
  SchemaSuggestion,
  AiSearchPreview,
  ContentGapsAnalysis,
  CitationLikelihood,
  AeoComparisonResult,
} from "@shared/schema";

class AeoAnalyzer {
  private lang: string = 'en';
  private L(en: string, hr: string): string { return this.lang === 'hr' ? hr : en; }

  async analyzeWebsite(url: string, lang: string = 'en'): Promise<InsertAeoAnalysis> {
    this.lang = lang;
    const normalizedUrl = url.startsWith("http") ? url : `https://${url}`;

    const html = await safeFetchHtmlWithFallback(normalizedUrl);
    const $ = cheerio.load(html);

    const structuredData = this.analyzeStructuredData($, html);
    const contentFormat = this.analyzeContentFormat($);
    const authority = this.analyzeAuthoritySignals($, normalizedUrl);
    const semantic = this.analyzeSemanticStructure($);
    const aiAccessibility = await this.analyzeAiAccessibility($, normalizedUrl);

    const structuredDataScore = this.scoreStructuredData(structuredData);
    const contentFormatScore = this.scoreContentFormat(contentFormat);
    const authorityScore = this.scoreAuthority(authority);
    const semanticScore = this.scoreSemantic(semantic);
    const aiAccessibilityScore = this.scoreAiAccessibility(aiAccessibility);

    const overallScore = Math.round(
      structuredDataScore * 0.25 +
      contentFormatScore * 0.25 +
      authorityScore * 0.2 +
      semanticScore * 0.15 +
      aiAccessibilityScore * 0.15
    );

    const checks = this.generateChecks(structuredData, contentFormat, authority, semantic, aiAccessibility);
    const rating = this.getRating(overallScore);
    const recommendations = this.generateRecommendations(checks, structuredData, contentFormat, authority, semantic, aiAccessibility);

    const schemaSuggestions = this.generateSchemaSuggestions($, structuredData, normalizedUrl);
    const aiSearchPreview = this.generateAiSearchPreview($, normalizedUrl);
    const contentGaps = this.analyzeContentGaps($, contentFormat, structuredData);
    const citationLikelihood = this.calculateCitationLikelihood(structuredData, contentFormat, authority, semantic, aiAccessibility, overallScore);

    const results: AeoAnalysisResults = {
      rating,
      score: overallScore,
      structuredDataScore,
      contentFormatScore,
      authorityScore,
      semanticScore,
      aiAccessibilityScore,
      structuredData,
      contentFormat,
      authority,
      semantic,
      aiAccessibility,
      checks,
      schemaSuggestions,
      aiSearchPreview,
      contentGaps,
      citationLikelihood,
    };

    return {
      url: normalizedUrl,
      rating,
      score: overallScore,
      results,
      recommendations,
    };
  }

  private analyzeStructuredData($: cheerio.CheerioAPI, html: string): StructuredDataAnalysis {
    const jsonLdScripts: string[] = [];
    $('script[type="application/ld+json"]').each((_, el) => {
      const content = $(el).html();
      if (content) jsonLdScripts.push(content);
    });

    const jsonLdTypes: string[] = [];
    for (const script of jsonLdScripts) {
      try {
        const data = JSON.parse(script);
        const extractTypes = (obj: any) => {
          if (obj["@type"]) {
            const types = Array.isArray(obj["@type"]) ? obj["@type"] : [obj["@type"]];
            jsonLdTypes.push(...types);
          }
          if (obj["@graph"] && Array.isArray(obj["@graph"])) {
            obj["@graph"].forEach(extractTypes);
          }
        };
        extractTypes(data);
      } catch {}
    }

    const microdataPresent = $("[itemscope]").length > 0;
    const rdfa = $("[typeof], [property]").length > 0;

    const allTypes = jsonLdTypes.map(t => t.toLowerCase());
    const schemaText = jsonLdScripts.join(" ").toLowerCase();

    return {
      jsonLdPresent: jsonLdScripts.length > 0,
      jsonLdTypes,
      microdataPresent,
      rdfa,
      faqSchema: allTypes.includes("faqpage") || schemaText.includes("faqpage"),
      howToSchema: allTypes.includes("howto") || schemaText.includes("howto"),
      articleSchema: allTypes.some(t => t.includes("article")) || schemaText.includes("article"),
      organizationSchema: allTypes.includes("organization") || allTypes.includes("localbusiness") || schemaText.includes("organization"),
      breadcrumbSchema: allTypes.includes("breadcrumblist") || schemaText.includes("breadcrumblist"),
      totalSchemaCount: jsonLdScripts.length + ($("[itemscope]").length),
    };
  }

  private analyzeContentFormat($: cheerio.CheerioAPI): ContentFormatAnalysis {
    const headings: string[] = [];
    $("h1, h2, h3, h4").each((_, el) => {
      headings.push($(el).text().trim());
    });

    const questionPatterns = /^(what|how|why|when|where|who|which|can|do|does|is|are|was|were|will|should|could|would|shall|may|might|has|have|had|was|weren't|isn't|aren't|didn't|doesn't|won't|wouldn't|couldn't|shouldn't|did|ako|što|zašto|kako|kada|gdje|tko|koji|može|da li|warum|wie|wann|wo|wer|welch|kann|pourquoi|comment|quand|où|qui|quel|peut|por qué|cómo|cuándo|dónde|quién|cuál|puede)\b/i;
    const questionHeadings = headings.filter(h =>
      questionPatterns.test(h) || h.endsWith("?")
    );

    const paragraphs: number[] = [];
    let directAnswerCount = 0;
    $("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length > 20) {
        paragraphs.push(text.length);
        if (text.length >= 40 && text.length <= 300) {
          directAnswerCount++;
        }
      }
    });

    const hasDefinitions = $("dl, dfn, abbr[title]").length > 0 ||
      $("p").filter((_, el) => {
        const text = $(el).text().trim().toLowerCase();
        return /^.{1,50}\s(is|are|refers to|means|describes|defined as)\s/.test(text);
      }).length > 0;

    const hasTables = $("table").length > 0;
    const hasLists = $("ul, ol").length > 0;

    const hasHowToContent =
      headings.some(h => /how to|step.by.step|guide|tutorial|instructions/i.test(h)) ||
      $("ol li").length >= 3;

    let faqSections = 0;
    const faqPatterns = /faq|frequently asked|common questions|pitanja|häufig gestellte|preguntas frecuentes|questions fréquentes/i;
    $("h1, h2, h3, h4, section, div").each((_, el) => {
      const text = $(el).text().trim().substring(0, 100);
      const cls = $(el).attr("class") || "";
      const id = $(el).attr("id") || "";
      if (faqPatterns.test(text) || faqPatterns.test(cls) || faqPatterns.test(id)) {
        faqSections++;
      }
    });

    const avgParagraphLength = paragraphs.length > 0
      ? Math.round(paragraphs.reduce((a, b) => a + b, 0) / paragraphs.length)
      : 0;

    let contentDepthScore = 0;
    const totalWords = $("body").text().trim().split(/\s+/).length;
    if (totalWords > 300) contentDepthScore += 20;
    if (totalWords > 800) contentDepthScore += 20;
    if (totalWords > 1500) contentDepthScore += 10;
    if (hasLists) contentDepthScore += 15;
    if (hasTables) contentDepthScore += 10;
    if (questionHeadings.length > 0) contentDepthScore += 15;
    if (directAnswerCount > 0) contentDepthScore += 10;
    contentDepthScore = Math.min(100, contentDepthScore);

    return {
      hasQuestionHeadings: questionHeadings.length > 0,
      questionHeadings: questionHeadings.slice(0, 10),
      hasDefinitions,
      hasLists,
      hasTables,
      hasHowToContent,
      directAnswerParagraphs: directAnswerCount,
      faqSections: Math.min(faqSections, 5),
      averageParagraphLength: avgParagraphLength,
      contentDepthScore,
    };
  }

  private analyzeAuthoritySignals($: cheerio.CheerioAPI, url: string): AuthoritySignals {
    const authorDetails: string[] = [];

    const authorSelectors = [
      '[rel="author"]', '.author', '.byline', '[itemprop="author"]',
      '.post-author', '.entry-author', '.article-author', '.meta-author',
    ];
    for (const sel of authorSelectors) {
      $(sel).each((_, el) => {
        const text = $(el).text().trim();
        if (text && text.length < 100) authorDetails.push(text);
      });
    }

    const jsonLdAuthor = $('script[type="application/ld+json"]').filter((_, el) => {
      const content = $(el).html() || "";
      return content.includes('"author"');
    }).length > 0;
    if (jsonLdAuthor && authorDetails.length === 0) {
      authorDetails.push("Author declared in structured data");
    }

    const aboutLinks = $('a[href*="about"], a[href*="o-nama"], a[href*="über-uns"], a[href*="qui-sommes"], a[href*="quienes-somos"]');
    const hasAboutPage = aboutLinks.length > 0;

    const hasDatePublished = $('[itemprop="datePublished"], time[datetime], .published-date, .post-date, .entry-date').length > 0 ||
      $('meta[property="article:published_time"]').length > 0;

    const hasDateModified = $('[itemprop="dateModified"], .updated-date, .modified-date').length > 0 ||
      $('meta[property="article:modified_time"]').length > 0;

    let citationCount = 0;
    let externalSourceLinks = 0;
    const domain = new URL(url).hostname.replace("www.", "");

    $("a[href]").each((_, el) => {
      const href = $(el).attr("href") || "";
      try {
        if (href.startsWith("http") && !href.includes(domain)) {
          externalSourceLinks++;
          const text = $(el).text().trim().toLowerCase();
          if (text.includes("source") || text.includes("reference") || text.includes("study") ||
            text.includes("research") || text.includes("according") || text.includes("izvor") ||
            text.includes("quelle") || text.includes("fuente")) {
            citationCount++;
          }
        }
      } catch {}
    });

    const hasCitations = citationCount > 0 || $("cite, blockquote[cite]").length > 0;
    if ($("cite, blockquote[cite]").length > 0) {
      citationCount += $("cite, blockquote[cite]").length;
    }

    const bodyText = extractMainContent($).toLowerCase();
    const hasStatistics = /\d+(\.\d+)?%|\d{1,3}(,\d{3})+|\bstatistic|\bdata shows|\bresearch (shows|finds|indicates)|\bstudy (found|shows|reveals)|\baccording to/i.test(bodyText);
    const hasOriginalData = /\b(our (data|research|study|survey|analysis|findings)|we (found|discovered|analyzed|surveyed|measured))\b/i.test(bodyText);

    return {
      hasAuthorInfo: authorDetails.length > 0,
      authorDetails: Array.from(new Set(authorDetails)).slice(0, 5),
      hasAboutPage,
      hasDatePublished,
      hasDateModified,
      hasCitations,
      citationCount,
      hasOriginalData,
      hasStatistics,
      externalSourceLinks,
    };
  }

  private analyzeSemanticStructure($: cheerio.CheerioAPI): SemanticStructure {
    const headingCount: Record<string, number> = {};
    for (let i = 1; i <= 6; i++) {
      headingCount[`h${i}`] = $(`h${i}`).length;
    }

    let hierarchyValid = true;
    if (headingCount.h1 !== 1) hierarchyValid = false;

    let prevLevel = 0;
    $("h1, h2, h3, h4, h5, h6").each((_, el) => {
      const level = parseInt($(el).prop("tagName")?.charAt(1) || "0");
      if (prevLevel > 0 && level > prevLevel + 1) {
        hierarchyValid = false;
      }
      prevLevel = level;
    });

    const semanticElements: string[] = [];
    const semanticTags = ["article", "section", "aside", "nav", "header", "footer", "main", "figure", "figcaption", "details", "summary", "mark", "time"];
    for (const tag of semanticTags) {
      if ($(tag).length > 0) semanticElements.push(tag);
    }

    const hasTableOfContents = $('[class*="toc"], [id*="toc"], [class*="table-of-contents"], [id*="table-of-contents"], .wp-block-table-of-contents, nav[aria-label*="content"]').length > 0 ||
      $("a[href^='#']").filter((_, el) => {
        const parent = $(el).parent();
        const siblings = parent.children("a[href^='#']").length;
        return siblings >= 3;
      }).length >= 3;

    return {
      headingHierarchyValid: hierarchyValid,
      headingCount,
      usesSemanticHtml: semanticElements.length >= 3,
      semanticElements,
      hasTableOfContents,
      contentSections: $("section, article").length,
      listCount: $("ul, ol").length,
      tableCount: $("table").length,
    };
  }

  private async analyzeAiAccessibility($: cheerio.CheerioAPI, url: string): Promise<AiAccessibility> {
    let robotsTxtAllowsAi = true;
    const blockedCrawlers: string[] = [];

    try {
      const origin = new URL(url).origin;
      const robotsResponse = await fetch(`${origin}/robots.txt`, {
        signal: AbortSignal.timeout(5000),
      });
      if (robotsResponse.ok) {
        const robotsTxt = await robotsResponse.text();
        const aiCrawlers = [
          { name: "GPTBot", pattern: /User-agent:\s*GPTBot[\s\S]*?Disallow:\s*\//im },
          { name: "ChatGPT-User", pattern: /User-agent:\s*ChatGPT-User[\s\S]*?Disallow:\s*\//im },
          { name: "Google-Extended", pattern: /User-agent:\s*Google-Extended[\s\S]*?Disallow:\s*\//im },
          { name: "Anthropic", pattern: /User-agent:\s*(anthropic|Claude|ClaudeBot|CCBot)[\s\S]*?Disallow:\s*\//im },
          { name: "PerplexityBot", pattern: /User-agent:\s*PerplexityBot[\s\S]*?Disallow:\s*\//im },
          { name: "Bytespider", pattern: /User-agent:\s*Bytespider[\s\S]*?Disallow:\s*\//im },
        ];

        for (const crawler of aiCrawlers) {
          if (crawler.pattern.test(robotsTxt)) {
            blockedCrawlers.push(crawler.name);
          }
        }

        if (blockedCrawlers.length > 0) robotsTxtAllowsAi = false;
      }
    } catch {}

    const canonical = $('link[rel="canonical"]').attr("href");
    const metaDesc = $('meta[name="description"]').attr("content") || "";
    const ogTitle = $('meta[property="og:title"]').attr("content");
    const ogDesc = $('meta[property="og:description"]').attr("content");
    const ogImage = $('meta[property="og:image"]').attr("content");

    const bodyText = extractMainContent($);
    const wordCount = bodyText.split(/\s+/).filter(w => w.length > 0).length;

    const scriptCount = $("script").length;
    const textToHtmlRatio = bodyText.length / ($("html").html()?.length || 1);
    const cleanTextExtraction = textToHtmlRatio > 0.1 && wordCount > 50;

    const lang = $("html").attr("lang");

    return {
      robotsTxtAllowsAi,
      blockedCrawlers,
      hasCanonicalUrl: !!canonical,
      hasMetaDescription: metaDesc.length > 0,
      metaDescriptionLength: metaDesc.length,
      hasOpenGraph: !!(ogTitle || ogDesc || ogImage),
      cleanTextExtraction,
      wordCount,
      languageDeclared: !!lang,
    };
  }

  private scoreStructuredData(data: StructuredDataAnalysis): number {
    let score = 0;
    if (data.jsonLdPresent) score += 25;
    if (data.jsonLdTypes.length > 0) score += 10;
    if (data.faqSchema) score += 15;
    if (data.howToSchema) score += 10;
    if (data.articleSchema) score += 10;
    if (data.organizationSchema) score += 10;
    if (data.breadcrumbSchema) score += 5;
    if (data.microdataPresent) score += 5;
    if (data.totalSchemaCount >= 3) score += 10;
    return Math.min(100, score);
  }

  private scoreContentFormat(data: ContentFormatAnalysis): number {
    let score = 0;
    if (data.hasQuestionHeadings) score += 20;
    if (data.questionHeadings.length >= 3) score += 10;
    if (data.hasDefinitions) score += 10;
    if (data.hasLists) score += 10;
    if (data.hasTables) score += 10;
    if (data.hasHowToContent) score += 10;
    if (data.directAnswerParagraphs >= 3) score += 15;
    else if (data.directAnswerParagraphs > 0) score += 8;
    if (data.faqSections > 0) score += 15;
    return Math.min(100, score);
  }

  private scoreAuthority(data: AuthoritySignals): number {
    let score = 0;
    if (data.hasAuthorInfo) score += 20;
    if (data.hasAboutPage) score += 10;
    if (data.hasDatePublished) score += 15;
    if (data.hasDateModified) score += 10;
    if (data.hasCitations) score += 15;
    if (data.hasStatistics) score += 10;
    if (data.hasOriginalData) score += 10;
    if (data.externalSourceLinks >= 3) score += 10;
    else if (data.externalSourceLinks > 0) score += 5;
    return Math.min(100, score);
  }

  private scoreSemantic(data: SemanticStructure): number {
    let score = 0;
    if (data.headingHierarchyValid) score += 25;
    if (data.usesSemanticHtml) score += 20;
    if (data.hasTableOfContents) score += 15;
    if (data.contentSections >= 2) score += 10;
    if (data.listCount > 0) score += 10;
    if (data.tableCount > 0) score += 10;
    if (data.semanticElements.length >= 5) score += 10;
    return Math.min(100, score);
  }

  private scoreAiAccessibility(data: AiAccessibility): number {
    let score = 0;
    if (data.robotsTxtAllowsAi) score += 25;
    if (data.hasCanonicalUrl) score += 15;
    if (data.hasMetaDescription) score += 15;
    if (data.metaDescriptionLength >= 120 && data.metaDescriptionLength <= 160) score += 5;
    if (data.hasOpenGraph) score += 10;
    if (data.cleanTextExtraction) score += 15;
    if (data.wordCount >= 300) score += 10;
    if (data.languageDeclared) score += 5;
    return Math.min(100, score);
  }

  private getRating(score: number): AeoRating {
    if (score >= 80) return "Highly Optimized";
    if (score >= 60) return "AI-Ready";
    if (score >= 40) return "Partially Ready";
    return "Not Ready";
  }

  private generateChecks(
    sd: StructuredDataAnalysis,
    cf: ContentFormatAnalysis,
    auth: AuthoritySignals,
    sem: SemanticStructure,
    ai: AiAccessibility,
  ): AeoCheck[] {
    const checks: AeoCheck[] = [];

    checks.push({
      name: this.L("JSON-LD Structured Data", "JSON-LD strukturirani podaci"),
      status: sd.jsonLdPresent ? (sd.jsonLdTypes.length >= 2 ? "PASS" : "WARNING") : "FAIL",
      details: sd.jsonLdPresent
        ? this.lang === 'hr'
          ? `Pronađeno ${sd.totalSchemaCount} shema: ${sd.jsonLdTypes.join(", ")}`
          : `Found ${sd.totalSchemaCount} schema(s): ${sd.jsonLdTypes.join(", ")}`
        : this.L("No JSON-LD structured data found on the page", "Na stranici nisu pronađeni JSON-LD strukturirani podaci"),
      category: "structured-data",
      impact: this.L("AI systems rely heavily on structured data to understand page content, entities, and relationships. Pages with rich schema markup are significantly more likely to be cited in AI-generated answers.", "AI sustavi uvelike se oslanjaju na strukturirane podatke za razumijevanje sadržaja. Stranice s bogatim schema markupom puno je vjerojatnije da će biti citirane u AI odgovorima."),
      recommendation: sd.jsonLdPresent
        ? this.L("Good start. Consider adding more schema types (FAQ, HowTo, Article) to increase AI visibility.", "Dobar početak. Razmislite o dodavanju više vrsta shema (FAQ, HowTo, Article) za veću vidljivost u AI sustavima.")
        : this.L("Add JSON-LD structured data to help AI engines understand your content.", "Dodajte JSON-LD strukturirane podatke kako bi AI sustavi razumjeli vaš sadržaj."),
      technicalFix: !sd.jsonLdPresent || sd.jsonLdTypes.length < 2 ? [
        "STEP 1 — Add basic JSON-LD structured data to your page <head>:",
        '  <script type="application/ld+json">',
        "  {",
        '    "@context": "https://schema.org",',
        '    "@type": "WebPage",',
        '    "name": "Your Page Title",',
        '    "description": "Your page description",',
        '    "url": "https://yoursite.com/page",',
        '    "publisher": {',
        '      "@type": "Organization",',
        '      "name": "Your Company",',
        '      "url": "https://yoursite.com"',
        "    }",
        "  }",
        "  </script>",
        "",
        "STEP 2 — Add Article schema for blog/content pages:",
        '  <script type="application/ld+json">',
        "  {",
        '    "@context": "https://schema.org",',
        '    "@type": "Article",',
        '    "headline": "Your Article Title",',
        '    "author": { "@type": "Person", "name": "Author Name" },',
        '    "datePublished": "2025-01-15",',
        '    "dateModified": "2025-02-01"',
        "  }",
        "  </script>",
        "",
        "STEP 3 — WordPress: Install Yoast SEO or Rank Math plugin",
        "  Both automatically generate JSON-LD for your content.",
        "",
        "VERIFY: Use Google's Rich Results Test:",
        "  https://search.google.com/test/rich-results",
      ].join("\n") : undefined,
    });

    checks.push({
      name: this.L("FAQ Schema Markup", "FAQ schema markup"),
      status: sd.faqSchema ? "PASS" : cf.faqSections > 0 ? "WARNING" : "FAIL",
      details: sd.faqSchema
        ? this.L("FAQ schema markup detected — eligible for rich results and AI extraction", "Otkriven FAQ schema markup — prikladan za rich results i AI ekstrakciju")
        : cf.faqSections > 0
          ? this.L("FAQ content detected but no FAQ schema markup found", "Otkriven FAQ sadržaj, ali nema FAQ schema markupa")
          : this.L("No FAQ content or schema found on the page", "Na stranici nije pronađen FAQ sadržaj ni shema"),
      category: "structured-data",
      impact: this.L("FAQ schema is one of the most effective ways to get content featured in AI answers. AI systems can directly extract Q&A pairs from FAQ schema markup.", "FAQ shema jedan je od najučinkovitijih načina da sadržaj bude prikazan u AI odgovorima. AI sustavi mogu izravno ekstrahirati parove pitanja i odgovora iz FAQ schema markupa."),
      recommendation: sd.faqSchema
        ? this.L("FAQ schema is properly implemented.", "FAQ shema je pravilno implementirana.")
        : this.L("Add FAQ schema markup to help AI systems extract your Q&A content.", "Dodajte FAQ schema markup kako bi AI sustavi mogli ekstrahirati vaš sadržaj pitanja i odgovora."),
      technicalFix: !sd.faqSchema ? [
        "STEP 1 — Add FAQPage schema to your page:",
        '  <script type="application/ld+json">',
        "  {",
        '    "@context": "https://schema.org",',
        '    "@type": "FAQPage",',
        '    "mainEntity": [',
        "      {",
        '        "@type": "Question",',
        '        "name": "What is your main question?",',
        '        "acceptedAnswer": {',
        '          "@type": "Answer",',
        '          "text": "Your concise answer here. Keep it under 300 characters for best AI extraction."',
        "        }",
        "      },",
        "      {",
        '        "@type": "Question",',
        '        "name": "Second question?",',
        '        "acceptedAnswer": {',
        '          "@type": "Answer",',
        '          "text": "Second answer here."',
        "        }",
        "      }",
        "    ]",
        "  }",
        "  </script>",
        "",
        "STEP 2 — WordPress: Use Yoast FAQ block or Rank Math FAQ block",
        "  These automatically generate FAQ schema from your content.",
        "",
        "STEP 3 — Format FAQ content in HTML:",
        "  <section>",
        "    <h2>Frequently Asked Questions</h2>",
        "    <h3>Question text here?</h3>",
        "    <p>Direct, concise answer (40-300 characters ideal).</p>",
        "  </section>",
        "",
        "VERIFY: Google Rich Results Test → check for FAQ rich result eligibility",
      ].join("\n") : undefined,
    });

    checks.push({
      name: this.L("Question-Based Headings", "Naslovi u obliku pitanja"),
      status: cf.hasQuestionHeadings ? (cf.questionHeadings.length >= 3 ? "PASS" : "WARNING") : "FAIL",
      details: cf.hasQuestionHeadings
        ? this.lang === 'hr'
          ? `Pronađeno ${cf.questionHeadings.length} naslov(a) u obliku pitanja: ${cf.questionHeadings.slice(0, 3).map(q => `"${q}"`).join(", ")}`
          : `Found ${cf.questionHeadings.length} question-format heading(s): ${cf.questionHeadings.slice(0, 3).map(q => `"${q}"`).join(", ")}`
        : this.L("No question-format headings found", "Nisu pronađeni naslovi u obliku pitanja"),
      category: "content-format",
      impact: this.L("AI search engines match user queries to content. Headings formatted as questions (How to..., What is..., Why does...) directly align with how users ask AI assistants, increasing citation likelihood.", "AI tražilice usklađuju upite korisnika s naslovnicama. Naslovi u obliku pitanja (Kako..., Što je..., Zašto...) izravno se podudaraju s načinom na koji korisnici postavljaju pitanja AI asistentima, povećavajući vjerojatnost citiranja."),
      recommendation: cf.hasQuestionHeadings
        ? cf.questionHeadings.length >= 3
          ? this.L("Excellent question-based heading structure.", "Odlična struktura naslova u obliku pitanja.")
          : this.L("Add more question-format headings to cover common user queries.", "Dodajte još naslova u obliku pitanja koji pokrivaju uobičajene korisničke upite.")
        : this.L("Rewrite headings as questions that match how people ask AI assistants.", "Prepišite naslove kao pitanja koja odgovaraju načinu na koji korisnici postavljaju pitanja AI asistentima."),
      technicalFix: !cf.hasQuestionHeadings || cf.questionHeadings.length < 3 ? [
        "STEP 1 — Convert informational headings to question format:",
        "  BEFORE: <h2>Benefits of Product</h2>",
        "  AFTER:  <h2>What Are the Benefits of Product?</h2>",
        "",
        "  BEFORE: <h2>Installation Process</h2>",
        "  AFTER:  <h2>How Do You Install Product?</h2>",
        "",
        "  BEFORE: <h2>Pricing</h2>",
        "  AFTER:  <h2>How Much Does Product Cost?</h2>",
        "",
        "STEP 2 — Follow each question heading with a direct answer:",
        "  <h2>What Is Answer Engine Optimization?</h2>",
        "  <p>Answer Engine Optimization (AEO) is the practice of optimizing",
        "  web content to be cited by AI-powered search engines like Google",
        "  AI Overviews, ChatGPT, and Perplexity.</p>",
        "",
        "  The first paragraph after a question heading should be a concise,",
        "  self-contained answer (40-300 characters is ideal for AI extraction).",
      ].join("\n") : undefined,
    });

    checks.push({
      name: this.L("Direct Answer Paragraphs", "Odlomci s izravnim odgovorima"),
      status: cf.directAnswerParagraphs >= 5 ? "PASS" : cf.directAnswerParagraphs > 0 ? "WARNING" : "FAIL",
      details: cf.directAnswerParagraphs > 0
        ? this.lang === 'hr'
          ? `Pronađeno ${cf.directAnswerParagraphs} odlomak(a) u idealnom rasponu od 40–300 znakova za AI ekstrakciju`
          : `Found ${cf.directAnswerParagraphs} paragraph(s) in the ideal 40-300 character range for AI extraction`
        : this.L("No concise answer-format paragraphs found", "Nisu pronađeni sažeti odlomci u formatu izravnih odgovora"),
      category: "content-format",
      impact: this.L("AI systems prefer extracting concise, self-contained paragraphs (40-300 characters) as direct answers. Content that is too long or rambling is harder for AI to cite accurately.", "AI sustavi preferiraju ekstrahiranje sažetih, samostalnih odlomaka (40–300 znakova) kao izravnih odgovora. Predugački ili raspršeni sadržaj teže je AI sustavima precizno citirati."),
      recommendation: cf.directAnswerParagraphs >= 5
        ? this.L("Good density of concise answer paragraphs.", "Dobra gustoća sažetih odlomaka s odgovorima.")
        : this.L("Write more concise, self-contained paragraphs that directly answer specific questions.", "Pišite sažetije, samostalne odlomke koji izravno odgovaraju na određena pitanja."),
      technicalFix: cf.directAnswerParagraphs < 5 ? [
        "STEP 1 — Write 'answer-first' paragraphs:",
        "  Lead with the answer, then elaborate. Example:",
        "",
        '  "AEO costs between $500-$5,000 per month depending on',
        "  scope, industry competitiveness, and the number of pages",
        '  being optimized."',
        "",
        "  This 140-character answer is perfect for AI extraction.",
        "",
        "STEP 2 — Use the 'inverted pyramid' writing style:",
        "  • First sentence: Complete, standalone answer",
        "  • Following sentences: Supporting details, context",
        "  • Final sentences: Background, related information",
        "",
        "STEP 3 — Ideal answer paragraph characteristics:",
        "  • 40-300 characters (1-3 sentences)",
        "  • Starts with the core fact/answer",
        "  • Can be read out of context and still make sense",
        "  • Contains the key entity/topic being discussed",
        "  • Avoids pronouns like 'it', 'this', 'they' at the start",
      ].join("\n") : undefined,
    });

    checks.push({
      name: this.L("Lists and Structured Content", "Popisi i strukturirani sadržaj"),
      status: cf.hasLists && cf.hasTables ? "PASS" : cf.hasLists || cf.hasTables ? "WARNING" : "FAIL",
      details: this.lang === 'hr'
        ? `Popisi: ${cf.hasLists ? "Da" : "Ne"}, Tablice: ${cf.hasTables ? "Da" : "Ne"}, Upute korak-po-korak: ${cf.hasHowToContent ? "Da" : "Ne"}`
        : `Lists: ${cf.hasLists ? "Yes" : "No"}, Tables: ${cf.hasTables ? "Yes" : "No"}, How-to content: ${cf.hasHowToContent ? "Yes" : "No"}`,
      category: "content-format",
      impact: this.L("AI engines frequently extract and present content from lists, tables, and step-by-step formats. These structured formats are easier for AI to parse and present in responses.", "AI sustavi često ekstrahiraju i prikazuju sadržaj iz popisa, tablica i vodiča korak-po-korak. Ti strukturirani formati AI sustavima su lakši za parsiranje i prikazivanje u odgovorima."),
      recommendation: cf.hasLists && cf.hasTables
        ? this.L("Content uses both lists and tables — good for AI extraction.", "Sadržaj koristi i popise i tablice — dobro za AI ekstrakciju.")
        : this.L("Add more structured content formats (ordered lists, comparison tables, step-by-step guides).", "Dodajte više strukturiranih formata sadržaja (uređeni popisi, tablice za usporedbu, vodiči korak-po-korak)."),
      technicalFix: !(cf.hasLists && cf.hasTables) ? [
        "STEP 1 — Add ordered lists for processes/steps:",
        "  <ol>",
        "    <li>First, identify your target queries</li>",
        "    <li>Research how AI currently answers them</li>",
        "    <li>Create content that directly answers each query</li>",
        "  </ol>",
        "",
        "STEP 2 — Add comparison tables for data-rich content:",
        "  <table>",
        "    <thead>",
        "      <tr><th>Feature</th><th>Option A</th><th>Option B</th></tr>",
        "    </thead>",
        "    <tbody>",
        "      <tr><td>Price</td><td>$10/mo</td><td>$20/mo</td></tr>",
        "      <tr><td>Storage</td><td>10 GB</td><td>50 GB</td></tr>",
        "    </tbody>",
        "  </table>",
        "",
        "STEP 3 — Add definition lists for glossary/terms:",
        "  <dl>",
        "    <dt>AEO</dt>",
        "    <dd>Answer Engine Optimization — optimizing content for AI search</dd>",
        "  </dl>",
      ].join("\n") : undefined,
    });

    checks.push({
      name: this.L("Author & Expertise Signals (E-E-A-T)", "Signali autora i stručnosti (E-E-A-T)"),
      status: auth.hasAuthorInfo && auth.hasDatePublished ? "PASS" : auth.hasAuthorInfo || auth.hasDatePublished ? "WARNING" : "FAIL",
      details: [
        auth.hasAuthorInfo ? this.L(`Author info found: ${auth.authorDetails.slice(0, 2).join(", ")}`, `Pronađeni podaci o autoru: ${auth.authorDetails.slice(0, 2).join(", ")}`) : this.L("No author information", "Nema podataka o autoru"),
        auth.hasDatePublished ? this.L("Publication date present", "Datum objave je prisutan") : this.L("No publication date", "Nema datuma objave"),
        auth.hasDateModified ? this.L("Last modified date present", "Datum zadnje izmjene je prisutan") : this.L("No last modified date", "Nema datuma zadnje izmjene"),
        auth.hasAboutPage ? this.L("About page linked", "Stranica 'O nama' je povezana") : this.L("No about page link found", "Nema linka na stranicu 'O nama'"),
      ].join(" | "),
      category: "authority",
      impact: this.L("AI systems prioritize content from identifiable, authoritative sources. E-E-A-T (Experience, Expertise, Authoritativeness, Trustworthiness) signals help AI decide which sources to cite.", "AI sustavi daju prednost sadržaju iz prepoznatljivih, autoritativnih izvora. E-E-A-T signali (iskustvo, stručnost, autoritativnost, pouzdanost) pomažu AI sustavima odlučiti koje izvore citirati."),
      recommendation: auth.hasAuthorInfo && auth.hasDatePublished
        ? this.L("Author and date information properly declared.", "Podaci o autoru i datumu su pravilno deklarirani.")
        : this.L("Add clear author attribution, publication dates, and credentials to build AI trust signals.", "Dodajte jasnu atribuciju autoru, datume objave i akreditive za izgradnju AI signala povjerenja."),
      technicalFix: !(auth.hasAuthorInfo && auth.hasDatePublished) ? [
        "STEP 1 — Add author information to your content:",
        '  <div class="author-bio" itemprop="author" itemscope itemtype="https://schema.org/Person">',
        '    <img src="author-photo.jpg" itemprop="image" alt="Author Name" />',
        '    <span itemprop="name">Author Name</span>',
        '    <span itemprop="jobTitle">Senior SEO Specialist</span>',
        "    <p>10+ years of experience in digital marketing...</p>",
        "  </div>",
        "",
        "STEP 2 — Add publication and modified dates:",
        '  <time datetime="2025-01-15" itemprop="datePublished">January 15, 2025</time>',
        '  <time datetime="2025-02-10" itemprop="dateModified">Updated: February 10, 2025</time>',
        "",
        "STEP 3 — Add author schema in JSON-LD:",
        '  Include "author": { "@type": "Person", "name": "...", "url": "..." }',
        "  in your Article or WebPage schema.",
        "",
        "STEP 4 — Create or link to an About page:",
        "  AI systems check for organizational authority pages.",
        "  Link to /about or /o-nama from your main navigation.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: this.L("Citations & Source References", "Citati i reference izvora"),
      status: auth.hasCitations ? "PASS" : auth.externalSourceLinks >= 3 ? "WARNING" : "FAIL",
      details: this.lang === 'hr'
        ? `Citati: ${auth.citationCount}, Vanjske poveznice na izvore: ${auth.externalSourceLinks}, Statistike prisutne: ${auth.hasStatistics ? "Da" : "Ne"}`
        : `Citations: ${auth.citationCount}, External source links: ${auth.externalSourceLinks}, Statistics present: ${auth.hasStatistics ? "Yes" : "No"}`,
      category: "authority",
      impact: this.L("Content that cites authoritative sources, includes data/statistics, and references research is more likely to be treated as a trustworthy source by AI systems.", "Sadržaj koji citira autoritativne izvore, uključuje podatke/statistike i referencira istraživanja ima veću vjerojatnost da će AI sustavi tretirati kao pouzdan izvor."),
      recommendation: auth.hasCitations
        ? this.L("Good use of citations and references.", "Dobra upotreba citata i referenci.")
        : this.L("Add citations, data, and references to authoritative sources to increase credibility for AI systems.", "Dodajte citate, podatke i reference na autoritativne izvore za povećanje vjerodostojnosti kod AI sustava."),
      technicalFix: !auth.hasCitations ? [
        "STEP 1 — Add inline citations to claims:",
        '  <p>According to a <a href="https://source.com/study">2025 study by Research Corp</a>,',
        "  75% of users prefer AI-generated summaries over traditional search results.</p>",
        "",
        "STEP 2 — Use <cite> for formal references:",
        "  <blockquote>",
        '    <p>"AI search will account for 30% of all queries by 2026."</p>',
        "    <cite>— Gartner Research Report, 2025</cite>",
        "  </blockquote>",
        "",
        "STEP 3 — Include original data and statistics:",
        "  • Include specific numbers, percentages, dates",
        "  • Reference the source and methodology",
        "  • Use data visualization (charts, tables) with descriptive alt text",
        "",
        "STEP 4 — Add a References/Sources section:",
        "  <h2>Sources & References</h2>",
        "  <ul>",
        '    <li><a href="https://...">Study Name — Organization, Year</a></li>',
        "  </ul>",
      ].join("\n") : undefined,
    });

    checks.push({
      name: this.L("Semantic HTML Structure", "Semantička HTML struktura"),
      status: sem.usesSemanticHtml && sem.headingHierarchyValid ? "PASS" : sem.usesSemanticHtml || sem.headingHierarchyValid ? "WARNING" : "FAIL",
      details: [
        this.lang === 'hr' ? `Hijerarhija naslova: ${sem.headingHierarchyValid ? "Ispravna" : "Neispravna"}` : `Heading hierarchy: ${sem.headingHierarchyValid ? "Valid" : "Invalid"}`,
        this.lang === 'hr' ? `Semantički elementi: ${sem.semanticElements.join(", ") || "Nema"}` : `Semantic elements: ${sem.semanticElements.join(", ") || "None"}`,
        this.lang === 'hr' ? `Sekcije: ${sem.contentSections}` : `Sections: ${sem.contentSections}`,
        `H1: ${sem.headingCount.h1 || 0}, H2: ${sem.headingCount.h2 || 0}, H3: ${sem.headingCount.h3 || 0}`,
      ].join(" | "),
      category: "technical",
      impact: this.L("Semantic HTML helps AI crawlers understand content structure, identify main topics, and extract relevant sections. Proper heading hierarchy acts as an outline that AI can follow.", "Semantički HTML pomaže AI crawlerima razumjeti strukturu sadržaja, identificirati glavne teme i ekstrahirati relevantne sekcije. Ispravna hijerarhija naslova AI sustavima služi kao sadržaj koji mogu pratiti."),
      recommendation: sem.usesSemanticHtml && sem.headingHierarchyValid
        ? this.L("Excellent semantic HTML structure.", "Odlična semantička HTML struktura.")
        : this.L("Improve HTML structure with semantic elements and proper heading hierarchy.", "Poboljšajte HTML strukturu semantičkim elementima i ispravnom hijerarhijom naslova."),
      technicalFix: !(sem.usesSemanticHtml && sem.headingHierarchyValid) ? [
        "STEP 1 — Use semantic HTML5 elements:",
        "  <main>",
        "    <article>",
        "      <header>",
        "        <h1>Main Page Title</h1>",
        "        <time datetime=\"2025-01-15\">January 15, 2025</time>",
        "      </header>",
        "      <section>",
        "        <h2>First Major Section</h2>",
        "        <p>Content...</p>",
        "        <h3>Subsection</h3>",
        "        <p>More content...</p>",
        "      </section>",
        "    </article>",
        "    <aside>",
        "      <h2>Related Information</h2>",
        "    </aside>",
        "  </main>",
        "",
        "STEP 2 — Fix heading hierarchy:",
        "  • Exactly ONE <h1> per page",
        "  • H2 follows H1, H3 follows H2 (don't skip levels)",
        "  • Each section should have its own heading",
        "",
        "STEP 3 — Add <figure> for images with context:",
        "  <figure>",
        '    <img src="chart.png" alt="Sales growth chart showing 40% increase" />',
        "    <figcaption>Figure 1: Annual sales growth (2020-2025)</figcaption>",
        "  </figure>",
      ].join("\n") : undefined,
    });

    checks.push({
      name: this.L("Table of Contents", "Sadržaj (Table of Contents)"),
      status: sem.hasTableOfContents ? "PASS" : sem.contentSections >= 3 ? "WARNING" : "FAIL",
      details: sem.hasTableOfContents
        ? this.L("Table of contents detected — helps AI understand content structure", "Otkriven sadržaj — pomaže AI sustavima razumjeti strukturu sadržaja")
        : sem.contentSections >= 3
          ? this.lang === 'hr'
            ? `Pronađene ${sem.contentSections} sekcije sadržaja, ali nema popisa sadržaja`
            : `${sem.contentSections} content sections found but no table of contents`
          : this.L("No table of contents and limited content sections", "Nema popisa sadržaja i ograničen broj sekcija"),
      category: "technical",
      impact: this.L("A table of contents provides AI systems with a clear content outline, making it easier to identify and extract specific sections relevant to user queries.", "Popis sadržaja daje AI sustavima jasan pregled sadržaja, što olakšava identifikaciju i ekstrakciju specifičnih sekcija relevantnih za upite korisnika."),
      recommendation: sem.hasTableOfContents
        ? this.L("Table of contents properly implemented.", "Popis sadržaja je pravilno implementiran.")
        : this.L("Add a table of contents with anchor links to improve AI content navigation.", "Dodajte popis sadržaja s anker linkovima za poboljšanje AI navigacije sadržajem."),
      technicalFix: !sem.hasTableOfContents ? [
        "STEP 1 — Add an HTML table of contents:",
        '  <nav aria-label="Table of contents">',
        "    <h2>Table of Contents</h2>",
        "    <ol>",
        '      <li><a href="#section-1">What Is AEO?</a></li>',
        '      <li><a href="#section-2">How Does It Work?</a></li>',
        '      <li><a href="#section-3">Implementation Steps</a></li>',
        "    </ol>",
        "  </nav>",
        "",
        "  Then add matching IDs to your headings:",
        '  <h2 id="section-1">What Is AEO?</h2>',
        "",
        "STEP 2 — WordPress: Use a Table of Contents plugin",
        "  • Easy Table of Contents (automatic generation)",
        "  • Yoast SEO includes TOC blocks",
        "  • Rank Math has built-in TOC support",
        "",
        "STEP 3 — For long content (1500+ words), always include a TOC.",
        "  AI systems use TOCs to understand content scope and jump to relevant sections.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: this.L("Organization / Entity Schema", "Shema organizacije / entiteta"),
      status: sd.organizationSchema ? "PASS" : auth.hasAboutPage ? "WARNING" : "FAIL",
      details: sd.organizationSchema
        ? this.L("Organization/LocalBusiness schema found — entity identity established", "Pronađena shema Organization/LocalBusiness — identitet entiteta uspostavljen")
        : auth.hasAboutPage
          ? this.L("About page linked but no Organization schema found", "Stranica 'O nama' je povezana, ali nema sheme Organization")
          : this.L("No organization schema or about page detected", "Nije otkrivena shema organizacije ni stranica 'O nama'"),
      category: "structured-data",
      impact: this.L("AI knowledge graphs build entity profiles from Organization schema. Clearly declaring your entity helps AI systems attribute content to your brand and build trust in your expertise.", "AI grafovi znanja grade profile entiteta iz sheme Organization. Jasno deklariranje entiteta pomaže AI sustavima pripisati sadržaj vašem brendu i izgraditi povjerenje u vašu stručnost."),
      recommendation: sd.organizationSchema
        ? this.L("Organization entity properly declared.", "Entitet organizacije je pravilno deklariran.")
        : this.L("Add Organization schema to establish your entity in AI knowledge graphs.", "Dodajte shemu Organization za uspostavljanje vašeg entiteta u AI grafovima znanja."),
      technicalFix: !sd.organizationSchema ? [
        "STEP 1 — Add Organization schema to your homepage:",
        '  <script type="application/ld+json">',
        "  {",
        '    "@context": "https://schema.org",',
        '    "@type": "Organization",',
        '    "name": "Your Company Name",',
        '    "url": "https://yoursite.com",',
        '    "logo": "https://yoursite.com/logo.png",',
        '    "description": "Brief company description",',
        '    "sameAs": [',
        '      "https://linkedin.com/company/yourcompany",',
        '      "https://twitter.com/yourcompany"',
        "    ],",
        '    "contactPoint": {',
        '      "@type": "ContactPoint",',
        '      "email": "info@yoursite.com",',
        '      "contactType": "customer service"',
        "    }",
        "  }",
        "  </script>",
        "",
        "STEP 2 — For local businesses, use LocalBusiness type:",
        '  "@type": "LocalBusiness" with address, telephone, openingHours',
        "",
        "STEP 3 — Link sameAs to all official profiles",
        "  This helps AI build a complete entity graph for your brand.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: this.L("AI Crawler Accessibility", "Dostupnost AI crawlerima"),
      status: ai.robotsTxtAllowsAi ? "PASS" : "FAIL",
      details: ai.robotsTxtAllowsAi
        ? this.L("All major AI crawlers are allowed access to your content", "Svim većim AI crawlerima je dozvoljen pristup vašem sadržaju")
        : this.lang === 'hr'
          ? `Blokirani AI crawleri: ${ai.blockedCrawlers.join(", ")}`
          : `Blocked AI crawlers: ${ai.blockedCrawlers.join(", ")}`,
      category: "discoverability",
      impact: this.L("If your robots.txt blocks AI crawlers (GPTBot, Google-Extended, etc.), your content cannot be indexed or cited by those AI systems. This directly prevents AI visibility.", "Ako vaš robots.txt blokira AI crawlere (GPTBot, Google-Extended itd.), vaš sadržaj ne može biti indeksiran ili citiran od strane tih AI sustava. To izravno sprječava vidljivost u AI odgovorima."),
      recommendation: ai.robotsTxtAllowsAi
        ? this.L("AI crawlers have full access to your content.", "AI crawleri imaju potpuni pristup vašem sadržaju.")
        : this.L("Remove AI crawler blocks from robots.txt to enable AI indexing.", "Uklonite blokade AI crawlera iz robots.txt za omogućavanje AI indeksiranja."),
      technicalFix: !ai.robotsTxtAllowsAi ? [
        "STEP 1 — Edit your robots.txt file to allow AI crawlers:",
        "  Remove or comment out these blocks:",
        "",
        "  # REMOVE these lines to allow AI indexing:",
        "  # User-agent: GPTBot",
        "  # Disallow: /",
        "  # User-agent: Google-Extended",
        "  # Disallow: /",
        "",
        "STEP 2 — If you want selective AI access:",
        "  User-agent: GPTBot",
        "  Allow: /blog/",
        "  Allow: /products/",
        "  Disallow: /private/",
        "",
        "STEP 3 — Verify your robots.txt is accessible:",
        "  curl https://yoursite.com/robots.txt",
        "",
        `Currently blocked: ${ai.blockedCrawlers.join(", ")}`,
      ].join("\n") : undefined,
    });

    checks.push({
      name: this.L("Meta Description Quality", "Kvaliteta meta opisa"),
      status: ai.hasMetaDescription && ai.metaDescriptionLength >= 120 && ai.metaDescriptionLength <= 160 ? "PASS" : ai.hasMetaDescription ? "WARNING" : "FAIL",
      details: ai.hasMetaDescription
        ? this.lang === 'hr'
          ? `Meta opis: ${ai.metaDescriptionLength} znakova (idealno: 120–160)`
          : `Meta description: ${ai.metaDescriptionLength} characters (ideal: 120-160)`
        : this.L("No meta description found", "Meta opis nije pronađen"),
      category: "discoverability",
      impact: this.L("AI systems use meta descriptions as a quick content summary. A well-crafted meta description can be directly used as an AI-generated snippet about your page.", "AI sustavi koriste meta opise kao brzi sažetak sadržaja. Dobro napisan meta opis može biti izravno korišten kao AI-generirani isječak o vašoj stranici."),
      recommendation: ai.hasMetaDescription && ai.metaDescriptionLength >= 120 && ai.metaDescriptionLength <= 160
        ? this.L("Meta description is well-optimized for AI extraction.", "Meta opis je dobro optimiziran za AI ekstrakciju.")
        : ai.hasMetaDescription
          ? this.lang === 'hr'
            ? `Prilagodite duljinu meta opisa (trenutno ${ai.metaDescriptionLength} znakova, idealno 120–160).`
            : `Adjust meta description length (currently ${ai.metaDescriptionLength} chars, ideal is 120-160).`
          : this.L("Add a meta description that concisely summarizes the page content.", "Dodajte meta opis koji sažeto opisuje sadržaj stranice."),
      technicalFix: !(ai.hasMetaDescription && ai.metaDescriptionLength >= 120 && ai.metaDescriptionLength <= 160) ? [
        "STEP 1 — Add or improve your meta description:",
        '  <meta name="description" content="Your concise page summary here.',
        '  Include the main topic, key benefit, and target audience.',
        '  Aim for 120-160 characters.">',
        "",
        "STEP 2 — Write it as a direct answer:",
        "  GOOD: \"AEO (Answer Engine Optimization) improves your website's",
        "  visibility in AI search results from Google AI Overviews,",
        '  ChatGPT, and Perplexity by optimizing content structure and schema."',
        "",
        "  BAD: \"Welcome to our website. We offer many services.",
        '  Contact us today for more information."',
        "",
        "STEP 3 — Include primary entity/keyword naturally",
        "  AI systems match meta descriptions to user queries.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: this.L("Open Graph Metadata", "Open Graph metapodaci"),
      status: ai.hasOpenGraph ? "PASS" : "WARNING",
      details: ai.hasOpenGraph
        ? this.L("Open Graph tags detected — content sharing optimized", "Otkriveni Open Graph tagovi — dijeljenje sadržaja je optimizirano")
        : this.L("No Open Graph metadata found", "Open Graph metapodaci nisu pronađeni"),
      category: "discoverability",
      impact: this.L("Open Graph tags help AI systems understand content title, description, and visual representation. They are used by social platforms and increasingly by AI for content previews.", "Open Graph tagovi pomažu AI sustavima razumjeti naslov, opis i vizualni prikaz sadržaja. Koriste ih društvene platforme, a sve više i AI sustavi za preglede sadržaja."),
      recommendation: ai.hasOpenGraph
        ? this.L("Open Graph metadata properly configured.", "Open Graph metapodaci su pravilno konfigurirani.")
        : this.L("Add Open Graph meta tags for better AI and social media representation.", "Dodajte Open Graph meta tagove za bolji prikaz u AI sustavima i na društvenim mrežama."),
      technicalFix: !ai.hasOpenGraph ? [
        "STEP 1 — Add Open Graph tags to your <head>:",
        '  <meta property="og:title" content="Your Page Title" />',
        '  <meta property="og:description" content="Concise description of the page" />',
        '  <meta property="og:type" content="article" />',
        '  <meta property="og:url" content="https://yoursite.com/page" />',
        '  <meta property="og:image" content="https://yoursite.com/image.jpg" />',
        '  <meta property="og:site_name" content="Your Site Name" />',
        "",
        "STEP 2 — Add Twitter Card tags:",
        '  <meta name="twitter:card" content="summary_large_image" />',
        '  <meta name="twitter:title" content="Your Page Title" />',
        '  <meta name="twitter:description" content="Concise description" />',
        "",
        "STEP 3 — WordPress: Yoast SEO and Rank Math automatically handle OG tags.",
      ].join("\n") : undefined,
    });

    checks.push({
      name: this.L("Canonical URL", "Kanonski URL"),
      status: ai.hasCanonicalUrl ? "PASS" : "WARNING",
      details: ai.hasCanonicalUrl
        ? this.L("Canonical URL declared — prevents duplicate content confusion", "Kanonski URL deklariran — sprječava zabunu oko duplikatnog sadržaja")
        : this.L("No canonical URL found", "Kanonski URL nije pronađen"),
      category: "discoverability",
      impact: this.L("Without a canonical URL, AI systems may encounter duplicate versions of your page and be unsure which to cite. This dilutes your content's authority.", "Bez kanonskog URL-a, AI sustavi mogu naići na duplikate vaše stranice i biti nesigurni koju citirati. To razrjeđuje autoritet vašeg sadržaja."),
      recommendation: ai.hasCanonicalUrl
        ? this.L("Canonical URL properly set.", "Kanonski URL je pravilno postavljen.")
        : this.L("Add a canonical URL to consolidate page authority for AI indexing.", "Dodajte kanonski URL za konsolidaciju autoriteta stranice za AI indeksiranje."),
      technicalFix: !ai.hasCanonicalUrl ? [
        "STEP 1 — Add canonical URL to your <head>:",
        '  <link rel="canonical" href="https://yoursite.com/your-page/" />',
        "",
        "STEP 2 — Use absolute URLs (with https://)",
        "  AI crawlers need the full URL to resolve duplicates.",
        "",
        "STEP 3 — WordPress: Yoast SEO handles canonical URLs automatically.",
        "  Check: Yoast SEO → Advanced → Canonical URL",
      ].join("\n") : undefined,
    });

    checks.push({
      name: this.L("Content Depth & Comprehensiveness", "Dubina i sveobuhvatnost sadržaja"),
      status: ai.wordCount >= 800 ? "PASS" : ai.wordCount >= 300 ? "WARNING" : "FAIL",
      details: this.lang === 'hr'
        ? `Broj riječi: ${ai.wordCount} | Ocjena dubine sadržaja: ${cf.contentDepthScore}/100 | Definicije: ${cf.hasDefinitions ? "Da" : "Ne"}`
        : `Word count: ${ai.wordCount} | Content depth score: ${cf.contentDepthScore}/100 | Definitions: ${cf.hasDefinitions ? "Yes" : "No"}`,
      category: "content-format",
      impact: this.L("AI systems prefer comprehensive, in-depth content that thoroughly covers a topic. Thin content is less likely to be cited as it may not fully answer user queries.", "AI sustavi preferiraju sveobuhvatan, detaljan sadržaj koji temeljito pokriva temu. Tanak sadržaj manje je vjerojatno da će biti citiran jer možda ne odgovara u potpunosti na upite korisnika."),
      recommendation: ai.wordCount >= 800
        ? this.L("Content has sufficient depth for AI citation.", "Sadržaj ima dovoljno dubine za AI citiranje.")
        : this.L("Expand content depth — aim for 800+ words with comprehensive topic coverage.", "Produbite sadržaj — ciljajte 800+ riječi s sveobuhvatnim pokrivanjem teme."),
      technicalFix: ai.wordCount < 800 ? [
        "STEP 1 — Expand content to cover the topic comprehensively:",
        "  Aim for 800-2000 words for most topics.",
        "  Cover: What, Why, How, When, Who, Common mistakes, Best practices.",
        "",
        "STEP 2 — Add these content types to increase depth:",
        "  • Definition paragraph (what is X?)",
        "  • Benefits/advantages list",
        "  • Step-by-step process",
        "  • Comparison with alternatives",
        "  • Common questions (FAQ section)",
        "  • Real examples or case studies",
        "",
        "STEP 3 — Use the 'topic cluster' approach:",
        "  Cover your main topic AND related subtopics.",
        "  AI systems reward content that demonstrates comprehensive expertise.",
        "",
        `Your current word count: ${ai.wordCount}. Target: 800+ words.`,
      ].join("\n") : undefined,
    });

    checks.push({
      name: this.L("Language Declaration", "Deklaracija jezika"),
      status: ai.languageDeclared ? "PASS" : "WARNING",
      details: ai.languageDeclared
        ? this.L("Language attribute declared on <html> tag", "Atribut jezika deklariran na <html> tagu")
        : this.L("No lang attribute found on <html> tag", "Nije pronađen atribut lang na <html> tagu"),
      category: "technical",
      impact: this.L("Language declaration helps AI systems correctly process, translate, and serve your content to users in the appropriate language context.", "Deklaracija jezika pomaže AI sustavima ispravno obraditi, prevesti i poslužiti vaš sadržaj korisnicima u odgovarajućem jezičnom kontekstu."),
      recommendation: ai.languageDeclared
        ? this.L("Language properly declared.", "Jezik je pravilno deklariran.")
        : this.L("Add a lang attribute to your <html> tag.", "Dodajte atribut lang na vaš <html> tag."),
      technicalFix: !ai.languageDeclared ? [
        "STEP 1 — Add lang attribute to your <html> tag:",
        '  <html lang="en">  (for English)',
        '  <html lang="hr">  (for Croatian)',
        '  <html lang="de">  (for German)',
        '  <html lang="fr">  (for French)',
        "",
        "STEP 2 — For multilingual content, declare section languages:",
        '  <p lang="fr">Contenu en français</p>',
        "",
        "STEP 3 — WordPress: Settings → General → Site Language",
      ].join("\n") : undefined,
    });

    return checks;
  }

  private generateSchemaSuggestions($: cheerio.CheerioAPI, sd: StructuredDataAnalysis, url: string): SchemaSuggestion[] {
    const suggestions: SchemaSuggestion[] = [];
    const title = $("title").text().trim() || $("h1").first().text().trim() || "Your Page Title";
    const description = $('meta[name="description"]').attr("content") || "Your page description";
    const domain = new URL(url).origin;
    const orgName = $('meta[property="og:site_name"]').attr("content") || new URL(url).hostname.replace("www.", "");

    if (!sd.organizationSchema) {
      suggestions.push({
        type: "Organization",
        label: "Organization Schema",
        description: "Establishes your brand identity in AI knowledge graphs. AI systems use this to attribute content to your organization.",
        priority: "Critical",
        alreadyPresent: false,
        code: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Organization",
          "name": orgName,
          "url": domain,
          "logo": `${domain}/logo.png`,
          "description": description.substring(0, 160),
          "sameAs": ["https://linkedin.com/company/yourcompany", "https://twitter.com/yourcompany"],
          "contactPoint": { "@type": "ContactPoint", "email": "info@" + new URL(url).hostname.replace("www.", ""), "contactType": "customer service" }
        }, null, 2),
      });
    } else {
      suggestions.push({ type: "Organization", label: "Organization Schema", description: "Already present on your page.", priority: "Low", alreadyPresent: true, code: "" });
    }

    if (!sd.faqSchema) {
      const questions: { q: string; a: string }[] = [];
      $("h2, h3, h4").each((_, el) => {
        const heading = $(el).text().trim();
        if (heading.endsWith("?") || /^(what|how|why|when|where|who|which|can|do|does|is|are)\b/i.test(heading)) {
          const nextP = $(el).nextAll("p").first().text().trim();
          if (nextP.length > 20 && nextP.length < 500) {
            questions.push({ q: heading, a: nextP.substring(0, 300) });
          }
        }
      });
      if (questions.length === 0) {
        questions.push({ q: "What is " + title.split(/[|\-–—]/)[0].trim() + "?", a: description || "Add your answer here (40-300 characters ideal)." });
        questions.push({ q: "How does " + title.split(/[|\-–—]/)[0].trim() + " work?", a: "Add your answer here." });
      }
      suggestions.push({
        type: "FAQPage",
        label: "FAQ Schema",
        description: "FAQ schema is one of the most effective ways to get content cited by AI. Questions and answers are directly extractable.",
        priority: "High",
        alreadyPresent: false,
        code: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "FAQPage",
          "mainEntity": questions.slice(0, 5).map(q => ({
            "@type": "Question",
            "name": q.q,
            "acceptedAnswer": { "@type": "Answer", "text": q.a }
          }))
        }, null, 2),
      });
    } else {
      suggestions.push({ type: "FAQPage", label: "FAQ Schema", description: "Already present on your page.", priority: "Low", alreadyPresent: true, code: "" });
    }

    if (!sd.articleSchema) {
      const authorName = $('[itemprop="author"], .author, .byline').first().text().trim() || "Author Name";
      const datePublished = $('meta[property="article:published_time"]').attr("content") || $("time[datetime]").first().attr("datetime") || new Date().toISOString().split("T")[0];
      suggestions.push({
        type: "Article",
        label: "Article Schema",
        description: "Helps AI systems identify this as authoritative content with author attribution and publication context.",
        priority: "High",
        alreadyPresent: false,
        code: JSON.stringify({
          "@context": "https://schema.org",
          "@type": "Article",
          "headline": title.substring(0, 110),
          "description": description.substring(0, 160),
          "author": { "@type": "Person", "name": authorName },
          "publisher": { "@type": "Organization", "name": orgName, "logo": { "@type": "ImageObject", "url": `${domain}/logo.png` } },
          "datePublished": datePublished,
          "dateModified": new Date().toISOString().split("T")[0],
          "mainEntityOfPage": { "@type": "WebPage", "@id": url }
        }, null, 2),
      });
    } else {
      suggestions.push({ type: "Article", label: "Article Schema", description: "Already present on your page.", priority: "Low", alreadyPresent: true, code: "" });
    }

    if (!sd.howToSchema) {
      const steps: string[] = [];
      $("ol li").each((i, el) => {
        if (i < 6) {
          const text = $(el).text().trim();
          if (text.length > 10 && text.length < 300) steps.push(text);
        }
      });
      if (steps.length >= 2) {
        suggestions.push({
          type: "HowTo",
          label: "HowTo Schema",
          description: "Step-by-step content detected. HowTo schema makes your instructions directly extractable by AI assistants.",
          priority: "Medium",
          alreadyPresent: false,
          code: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "HowTo",
            "name": title.split(/[|\-–—]/)[0].trim(),
            "description": description.substring(0, 160),
            "step": steps.map((s, i) => ({
              "@type": "HowToStep",
              "position": i + 1,
              "text": s
            }))
          }, null, 2),
        });
      }
    } else {
      suggestions.push({ type: "HowTo", label: "HowTo Schema", description: "Already present on your page.", priority: "Low", alreadyPresent: true, code: "" });
    }

    if (!sd.breadcrumbSchema) {
      const pathParts = new URL(url).pathname.split("/").filter(Boolean);
      if (pathParts.length > 0) {
        suggestions.push({
          type: "BreadcrumbList",
          label: "Breadcrumb Schema",
          description: "Helps AI understand your site hierarchy and content relationships.",
          priority: "Low",
          alreadyPresent: false,
          code: JSON.stringify({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            "itemListElement": [
              { "@type": "ListItem", "position": 1, "name": "Home", "item": domain },
              ...pathParts.map((p, i) => ({
                "@type": "ListItem",
                "position": i + 2,
                "name": p.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
                "item": domain + "/" + pathParts.slice(0, i + 1).join("/")
              }))
            ]
          }, null, 2),
        });
      }
    }

    suggestions.sort((a, b) => {
      const p = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return p[a.priority] - p[b.priority];
    });

    return suggestions;
  }

  private generateAiSearchPreview($: cheerio.CheerioAPI, url: string): AiSearchPreview {
    const quotableExcerpts: AiSearchPreview["quotableExcerpts"] = [];
    const title = $("title").text().trim() || $("h1").first().text().trim() || url;
    const metaDesc = $('meta[name="description"]').attr("content") || "";

    $("p").each((_, el) => {
      const text = $(el).text().trim();
      if (text.length >= 40 && text.length <= 300 && quotableExcerpts.length < 8) {
        const isDefinition = /^.{1,50}\s(is|are|refers to|means|describes|defined as)\s/i.test(text);
        const hasStats = /\d+(\.\d+)?%|\d{1,3}(,\d{3})+/.test(text);
        const nearHeading = $(el).prev("h1, h2, h3, h4").length > 0;

        let type: "answer" | "definition" | "statistic" = "answer";
        if (isDefinition) type = "definition";
        if (hasStats) type = "statistic";

        const heading = $(el).prevAll("h1, h2, h3, h4").first().text().trim() || "Content";
        quotableExcerpts.push({ text, source: heading, type });
      }
    });

    $("h2, h3, h4").each((_, el) => {
      const heading = $(el).text().trim();
      if ((heading.endsWith("?") || /^(what|how|why|when|where|who)\b/i.test(heading)) && quotableExcerpts.length < 10) {
        const answer = $(el).nextAll("p").first().text().trim();
        if (answer.length >= 30 && answer.length <= 400) {
          quotableExcerpts.push({ text: answer, source: heading, type: "faq" });
        }
      }
    });

    $("ul, ol").each((_, el) => {
      const items: string[] = [];
      $(el).children("li").each((i, li) => {
        if (i < 6) {
          const text = $(li).text().trim();
          if (text.length > 5 && text.length < 200) items.push(text);
        }
      });
      if (items.length >= 3 && items.length <= 8 && quotableExcerpts.length < 12) {
        const heading = $(el).prevAll("h1, h2, h3, h4").first().text().trim() || "Key Points";
        quotableExcerpts.push({ text: items.map((item, i) => `${i + 1}. ${item}`).join("\n"), source: heading, type: "list" });
      }
    });

    const snippet = metaDesc || quotableExcerpts[0]?.text || "No extractable content found.";
    let extractionQuality: "High" | "Medium" | "Low" = "Low";
    if (quotableExcerpts.length >= 5) extractionQuality = "High";
    else if (quotableExcerpts.length >= 2) extractionQuality = "Medium";

    const typeCount = new Set(quotableExcerpts.map(e => e.type)).size;
    const extractionDetails = `Found ${quotableExcerpts.length} quotable excerpt(s) across ${typeCount} content type(s). ${extractionQuality === "High" ? "AI engines have rich content to extract from." : extractionQuality === "Medium" ? "Some content is extractable, but adding more structured answers would help." : "Very limited extractable content. Add concise answer paragraphs, FAQs, and lists."}`;

    return {
      quotableExcerpts: quotableExcerpts.slice(0, 8),
      simulatedCitation: { title: title.substring(0, 120), url, snippet: snippet.substring(0, 200) },
      extractionQuality,
      extractionDetails,
    };
  }

  private analyzeContentGaps($: cheerio.CheerioAPI, cf: ContentFormatAnalysis, sd: StructuredDataAnalysis): ContentGapsAnalysis {
    // ── 1. Multi-source signal extraction ────────────────────────────────────
    const h1 = $("h1").first().text().trim();
    const metaTitle = $("title").text().trim();
    const metaDesc = $('meta[name="description"]').attr("content") || "";

    const h2s: string[] = [];
    $("h2").each((_, el) => { h2s.push($(el).text().trim()); });
    const h3s: string[] = [];
    $("h3").each((_, el) => { h3s.push($(el).text().trim()); });
    const navText: string[] = [];
    $("nav a, header a").each((_, el) => { navText.push($(el).text().trim()); });

    const bodyText = extractMainContent($);
    const bodyLower = bodyText.toLowerCase();
    const bodyWordCount = bodyText.split(/\s+/).filter(Boolean).length;

    // ── 2. Extended stop words (EN + HR) ──────────────────────────────────────
    const stopWords = new Set([
      "the","a","an","is","are","was","were","be","been","being","have","has","had",
      "do","does","did","will","would","could","should","may","might","shall","can",
      "to","of","in","for","on","with","at","by","from","as","into","through","during",
      "before","after","above","below","between","out","off","over","under","again",
      "further","then","once","and","but","or","nor","not","so","yet","both","either",
      "neither","each","every","all","any","few","more","most","other","some","such",
      "no","only","own","same","than","too","very","just","because","about","up",
      "it","its","this","that","these","those","your","our","their","my","his","her",
      "i","you","we","they","he","she","what","which","who","whom","how","when",
      "where","why","also","here","there","get","use","need","make","take","come",
      "vaš","naš","koje","koji","što","kao","ili","za","na","od","do","je","su",
      "da","se","uz","te","sa","po","iz","kad","ako","ali","sve","svim","svaki",
      "kroz","prema","između","zbog","biti","ima","koja","ovaj","ova","ovo","svi",
      "može","mogu","nisu","nije","bile","bili","bio","bila","nego","niti","već",
    ]);

    // ── 3. Tokenizer — min 4 chars, Unicode-aware, no pure digits ─────────────
    const tokenize = (text: string): string[] =>
      text.toLowerCase()
        .replace(/[^a-z0-9\s\u00c0-\u024f]/gi, " ")
        .split(/\s+/)
        .filter(w => w.length >= 4 && !stopWords.has(w) && !/^\d+$/.test(w));

    // ── 4. Tokenize each source (strip site name from title) ──────────────────
    const cleanTitle = metaTitle.replace(/[|\-–—].*$/, "").trim();
    const titleTokens = tokenize(cleanTitle);
    const h1Tokens = tokenize(h1);
    const metaDescTokens = tokenize(metaDesc);
    const h2Tokens = h2s.flatMap(tokenize);
    const h3Tokens = h3s.flatMap(tokenize);
    const navTokens = navText.flatMap(tokenize);
    const bodyTokens = tokenize(bodyText.slice(0, 2000));

    // ── 5. Full-body frequency map ─────────────────────────────────────────────
    const bodyFreq: Record<string, number> = {};
    tokenize(bodyText).forEach(w => { bodyFreq[w] = (bodyFreq[w] || 0) + 1; });

    // ── 6. Confidence gate — sparse signals produce a single informational finding
    const totalSignalTokens = h1Tokens.length + titleTokens.length + bodyTokens.length;
    const isLowConfidence = bodyWordCount < 50 || totalSignalTokens < 8;

    if (isLowConfidence) {
      return {
        topicKeywords: [],
        findings: [{
          label: "Semantic analysis",
          status: "warning",
          detail: "Insufficient page content to perform confident semantic coverage analysis. Ensure the page has a descriptive H1, a title tag, and at least 50 words of body copy.",
        }],
        coverageScore: 40,
        coverageDetails: "More page content is needed to assess semantic coverage accurately.",
      };
    }

    // ── 7. Bigram topic keywords (2-word phrases from headings + body) ──────────
    const allBodyTokensFull = tokenize(bodyText);
    const bodyBigramFreq: Record<string, number> = {};
    for (let i = 0; i < allBodyTokensFull.length - 1; i++) {
      const w1 = allBodyTokensFull[i];
      const w2 = allBodyTokensFull[i + 1];
      if (w1.length >= 4 && w2.length >= 4) {
        const bg = `${w1} ${w2}`;
        bodyBigramFreq[bg] = (bodyBigramFreq[bg] || 0) + 1;
      }
    }

    const allHeadingTokensCombined = [
      ...titleTokens, ...h1Tokens, ...metaDescTokens, ...h2Tokens, ...h3Tokens,
    ];
    const seenBigrams = new Set<string>();
    const topicKeywords: string[] = [];

    // Heading bigrams that appear at least once in body
    for (let i = 0; i < allHeadingTokensCombined.length - 1; i++) {
      const w1 = allHeadingTokensCombined[i];
      const w2 = allHeadingTokensCombined[i + 1];
      if (w1.length >= 4 && w2.length >= 4) {
        const bg = `${w1} ${w2}`;
        if (!seenBigrams.has(bg) && (bodyBigramFreq[bg] ?? 0) >= 1) {
          topicKeywords.push(bg);
          seenBigrams.add(bg);
        }
      }
    }

    // High-frequency body bigrams (≥2 occurrences) not already captured
    Object.entries(bodyBigramFreq)
      .filter(([bg, c]) => c >= 2 && !seenBigrams.has(bg))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 4)
      .forEach(([bg]) => {
        topicKeywords.push(bg);
        seenBigrams.add(bg);
      });

    const finalTopicKeywords = topicKeywords.slice(0, 10);

    // ── 8. Implementation / service term detection ─────────────────────────────
    const implementationIndicators = new Set([
      "design","development","website","application","platform","software","integration",
      "ecommerce","marketing","campaign","advertising","analytics","consulting","strategy",
      "audit","management","solution","agency","automation","branding","hosting","coding",
      "wordpress","react","angular","mobile","apps","support","training","reporting",
      "dizajn","razvoj","stranica","aplikacija","optimizacija","oglašavanje",
      "konzultacija","strategija","rješenje","agencija","podrška","automatizacija",
      "analitika","upravljanje","integracija","platforme",
    ]);

    const allBodyAndHeadingTokens = new Set([...h2Tokens, ...h3Tokens, ...bodyTokens]);
    const distinctServiceTerms = new Set(
      [...allBodyAndHeadingTokens].filter(t => implementationIndicators.has(t))
    );

    // ── 9. Nav terms not described in body ────────────────────────────────────
    const navServiceTerms = navTokens.filter(t => implementationIndicators.has(t));
    const navServicesNotInBody = navServiceTerms.filter(t => !bodyLower.includes(t));

    // ── 10. H1 ↔ title semantic alignment (meta description as supporting signal)
    const h1TitleOverlap = h1Tokens.filter(t => titleTokens.includes(t)).length;
    // Also count overlap with meta description tokens as weak alignment support
    const h1MetaDescOverlap = h1Tokens.filter(t => metaDescTokens.includes(t)).length;
    const hasMismatch =
      h1Tokens.length >= 2 && titleTokens.length >= 2 &&
      h1TitleOverlap === 0 && h1MetaDescOverlap === 0;

    // ── 11. Factual clarity signals ───────────────────────────────────────────
    const hasFactuals =
      /\b\d{4}\b|\b\d+[%+]\b|\b\d+\s*(years?|clients?|projects?|cases?)\b/i.test(bodyText) ||
      /\b(since|founded|established|over \d+)\b/i.test(bodyText);

    // ── 12. Machine-readable structure signals ───────────────────────────────
    const hasStructuredData = sd.jsonLdPresent || sd.microdataPresent || sd.totalSchemaCount > 0;
    const hasDefinitionContent = cf.directAnswerParagraphs > 0 || cf.hasDefinitions;

    // ── 13. Semantic alignment score (0–100) ──────────────────────────────────
    let alignmentScore = 50;
    if (distinctServiceTerms.size >= 3) alignmentScore += 20;
    else if (distinctServiceTerms.size >= 1) alignmentScore += 8;
    else alignmentScore -= 15;
    if (!hasMismatch && h1.length > 0 && metaTitle.length > 0) alignmentScore += 12;
    else if (hasMismatch) alignmentScore -= 15;
    if (hasFactuals) alignmentScore += 10;
    if (hasDefinitionContent) alignmentScore += 8;
    if (hasStructuredData) alignmentScore += 5;
    // Meta description contribution: alignment bonus when metaDesc tokens overlap with H1
    if (h1MetaDescOverlap > 0) alignmentScore += 5;
    alignmentScore = Math.min(100, Math.max(0, alignmentScore));

    // ── 14. Generate semantic findings ────────────────────────────────────────
    const findings: ContentGapsAnalysis["findings"] = [];

    // Check 1: Positioning breadth vs. body specificity
    if (h1.length > 0) {
      const isBroadPositioning =
        h1Tokens.length <= 3 ||
        h1Tokens.some(t =>
          ["partner","transformation","digital","solutions","services","agency",
            "expert","excellence","results","success","growth","impact"].includes(t)
        );
      if (isBroadPositioning) {
        if (distinctServiceTerms.size >= 3) {
          findings.push({
            label: "Positioning coherence",
            status: "pass",
            detailKey: "findingDetailPositioningBroadPass",
            detailParams: { count: distinctServiceTerms.size, terms: [...distinctServiceTerms].slice(0, 3).join(", ") },
          });
        } else if (distinctServiceTerms.size >= 1) {
          findings.push({
            label: "Positioning coherence",
            status: "warning",
            detailKey: "findingDetailPositioningBroadWarn",
            detailParams: { count: distinctServiceTerms.size },
            fixKey: "findingFixPositioningBroadWarn",
          });
        } else {
          findings.push({
            label: "Positioning coherence",
            status: "fail",
            detailKey: "findingDetailPositioningBroadFail",
            fixKey: "findingFixPositioningBroadFail",
          });
        }
      } else if (distinctServiceTerms.size >= 2) {
        findings.push({
          label: "Positioning coherence",
          status: "pass",
          detailKey: "findingDetailPositioningSpecificPass",
        });
      } else {
        findings.push({
          label: "Positioning coherence",
          status: "warning",
          detailKey: "findingDetailPositioningSpecificWarn",
          fixKey: "findingFixPositioningSpecificWarn",
        });
      }
    }

    // Check 2: H1 ↔ title semantic alignment
    if (h1.length > 0 && metaTitle.length > 0) {
      if (hasMismatch) {
        findings.push({
          label: "H1 and title tag alignment",
          status: "fail",
          detailKey: "findingDetailH1TitleFail",
          detailParams: { h1: `${h1.slice(0, 80)}${h1.length > 80 ? "…" : ""}` },
          fixKey: "findingFixH1TitleFail",
        });
      } else if (h1TitleOverlap > 0 || h1MetaDescOverlap > 0) {
        findings.push({
          label: "H1 and title tag alignment",
          status: "pass",
          detailKey: "findingDetailH1TitlePass",
        });
      }
    }

    // Check 3: Implicit vs. explicit capability
    if (navServicesNotInBody.length >= 2) {
      findings.push({
        label: "Implicit capabilities",
        status: "warning",
        detailKey: "findingDetailImplicitCapabilitiesWarn",
        detailParams: { count: navServicesNotInBody.length, terms: navServicesNotInBody.slice(0, 2).join(", ") },
        fixKey: "findingFixImplicitCapabilitiesWarn",
      });
    }

    // Check 4: Factual specificity
    if (bodyWordCount > 100) {
      if (hasFactuals) {
        findings.push({
          label: "Factual specificity",
          status: "pass",
          detailKey: "findingDetailFactualSpecificityPass",
        });
      } else {
        findings.push({
          label: "Factual specificity",
          status: "warning",
          detailKey: "findingDetailFactualSpecificityWarn",
          fixKey: "findingFixFactualSpecificityWarn",
        });
      }
    }

    // Check 5: Machine-readable structure (requires BOTH no structured data AND no definition content)
    if (!hasStructuredData && !hasDefinitionContent) {
      findings.push({
        label: "Machine-readable structure",
        status: "warning",
        detailKey: "findingDetailMachineReadableWarn",
        fixKey: "findingFixMachineReadableWarn",
      });
    }

    // ── 15. Summary sentence ──────────────────────────────────────────────────
    const failCount = findings.filter(f => f.status === "fail").length;
    const warnCount = findings.filter(f => f.status === "warning").length;
    const passCount = findings.filter(f => f.status === "pass").length;

    let coverageDetails: string;
    if (findings.length === 0) {
      coverageDetails = "Semantic analysis completed. Content structure appears coherent.";
    } else if (failCount > 0) {
      coverageDetails = `Semantic analysis found ${failCount} critical alignment ${failCount === 1 ? "issue" : "issues"} and ${warnCount} ${warnCount === 1 ? "area" : "areas"} for improvement.`;
    } else if (warnCount > 0) {
      coverageDetails = `Semantic analysis found ${warnCount} ${warnCount === 1 ? "area" : "areas"} where AI retrieval clarity could be strengthened.`;
    } else {
      coverageDetails = `Semantic analysis passed ${passCount} coherence ${passCount === 1 ? "check" : "checks"}. Content positioning is well-aligned for AI retrieval.`;
    }

    return {
      topicKeywords: finalTopicKeywords,
      findings,
      coverageScore: alignmentScore,
      coverageDetails,
    };
  }

  private calculateCitationLikelihood(
    sd: StructuredDataAnalysis,
    cf: ContentFormatAnalysis,
    auth: AuthoritySignals,
    sem: SemanticStructure,
    ai: AiAccessibility,
    overallScore: number,
  ): CitationLikelihood {
    const factors: CitationLikelihood["factors"] = [];

    let quotableScore = 0;
    if (cf.directAnswerParagraphs >= 5) quotableScore = 20;
    else if (cf.directAnswerParagraphs >= 3) quotableScore = 15;
    else if (cf.directAnswerParagraphs > 0) quotableScore = 8;
    factors.push({ name: "Quotable Content", score: quotableScore, maxScore: 20, details: `${cf.directAnswerParagraphs} direct answer paragraphs found (40-300 chars, ideal for AI extraction)` });

    let schemaScore = 0;
    if (sd.jsonLdPresent) schemaScore += 5;
    if (sd.faqSchema) schemaScore += 5;
    if (sd.articleSchema) schemaScore += 3;
    if (sd.organizationSchema) schemaScore += 2;
    factors.push({ name: "Schema Markup", score: Math.min(15, schemaScore), maxScore: 15, details: `${sd.totalSchemaCount} schema type(s) detected: ${sd.jsonLdTypes.join(", ") || "none"}` });

    let authorityScore = 0;
    if (auth.hasAuthorInfo) authorityScore += 5;
    if (auth.hasCitations) authorityScore += 5;
    if (auth.hasStatistics) authorityScore += 3;
    if (auth.hasOriginalData) authorityScore += 2;
    factors.push({ name: "Authority Signals", score: Math.min(15, authorityScore), maxScore: 15, details: `Author: ${auth.hasAuthorInfo ? "Yes" : "No"}, Citations: ${auth.citationCount}, Stats: ${auth.hasStatistics ? "Yes" : "No"}` });

    let formatScore = 0;
    if (cf.hasQuestionHeadings) formatScore += 5;
    if (cf.questionHeadings.length >= 3) formatScore += 3;
    if (cf.hasLists) formatScore += 3;
    if (cf.hasTables) formatScore += 2;
    if (cf.faqSections > 0) formatScore += 2;
    factors.push({ name: "Content Format", score: Math.min(15, formatScore), maxScore: 15, details: `Question headings: ${cf.questionHeadings.length}, Lists: ${cf.hasLists ? "Yes" : "No"}, Tables: ${cf.hasTables ? "Yes" : "No"}` });

    let accessScore = 0;
    if (ai.robotsTxtAllowsAi) accessScore += 8;
    if (ai.hasMetaDescription) accessScore += 3;
    if (ai.hasCanonicalUrl) accessScore += 2;
    if (ai.languageDeclared) accessScore += 2;
    factors.push({ name: "AI Accessibility", score: Math.min(15, accessScore), maxScore: 15, details: `Crawlers allowed: ${ai.robotsTxtAllowsAi ? "Yes" : "No"}, Meta desc: ${ai.hasMetaDescription ? "Yes" : "No"}, Canonical: ${ai.hasCanonicalUrl ? "Yes" : "No"}` });

    let depthScore = 0;
    if (ai.wordCount >= 800) depthScore += 8;
    else if (ai.wordCount >= 300) depthScore += 4;
    if (sem.headingHierarchyValid) depthScore += 4;
    if (sem.usesSemanticHtml) depthScore += 3;
    if (sem.hasTableOfContents) depthScore += 3;
    if (auth.hasDatePublished) depthScore += 2;
    factors.push({ name: "Content Depth & Structure", score: Math.min(20, depthScore), maxScore: 20, details: `Word count: ${ai.wordCount}, Hierarchy: ${sem.headingHierarchyValid ? "Valid" : "Invalid"}, Semantic HTML: ${sem.usesSemanticHtml ? "Yes" : "No"}` });

    const totalScore = factors.reduce((sum, f) => sum + f.score, 0);

    let rating: CitationLikelihood["rating"];
    if (totalScore >= 75) rating = "Very Likely";
    else if (totalScore >= 55) rating = "Likely";
    else if (totalScore >= 35) rating = "Possible";
    else rating = "Unlikely";

    const topFactors = factors.filter(f => f.score >= f.maxScore * 0.7).map(f => f.name);
    const weakFactors = factors.filter(f => f.score < f.maxScore * 0.3).map(f => f.name);
    const explanation = `Citation likelihood score: ${totalScore}/100. ${topFactors.length > 0 ? `Strengths: ${topFactors.join(", ")}. ` : ""}${weakFactors.length > 0 ? `Areas needing improvement: ${weakFactors.join(", ")}.` : "All factors are performing well."}`;

    return { score: totalScore, rating, factors, explanation };
  }

  async compareWebsites(urls: string[]): Promise<AeoComparisonResult> {
    const analyses = await Promise.all(
      urls.map(async (url) => {
        try {
          const result = await this.analyzeWebsite(url);
          const results = result.results as AeoAnalysisResults;
          const checks = results.checks;
          const passChecks = checks.filter(c => c.status === "PASS").map(c => c.name);
          const failChecks = checks.filter(c => c.status === "FAIL").map(c => c.name);

          return {
            url: result.url,
            score: results.score,
            rating: results.rating,
            structuredDataScore: results.structuredDataScore,
            contentFormatScore: results.contentFormatScore,
            authorityScore: results.authorityScore,
            semanticScore: results.semanticScore,
            aiAccessibilityScore: results.aiAccessibilityScore,
            citationScore: results.citationLikelihood.score,
            keyStrengths: passChecks.slice(0, 5),
            keyWeaknesses: failChecks.slice(0, 5),
          };
        } catch (error: any) {
          const { getFetchErrorCode } = await import("./httpClient");
          return {
            url,
            score: 0,
            rating: "Not Ready" as AeoRating,
            structuredDataScore: 0,
            contentFormatScore: 0,
            authorityScore: 0,
            semanticScore: 0,
            aiAccessibilityScore: 0,
            citationScore: 0,
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
    const scoreDiff = sorted.length >= 2 ? sorted[0].score - sorted[1].score : 0;
    const summary = sorted.length >= 2
      ? `${new URL(sorted[0].url).hostname} leads with a score of ${sorted[0].score}/100, ${scoreDiff > 0 ? `${scoreDiff} points ahead of` : "tied with"} ${new URL(sorted[1].url).hostname} (${sorted[1].score}/100). ${sorted[0].rating === "Highly Optimized" ? "The leader is highly optimized for AI search." : sorted[0].rating === "AI-Ready" ? "The leader is AI-ready but has room for improvement." : "Both sites have significant room for AI optimization."}`
      : `Single URL analyzed: ${sorted[0]?.url} scored ${sorted[0]?.score}/100.`;

    return { urls, analyses, winner, summary };
  }

  private generateRecommendations(
    checks: AeoCheck[],
    sd: StructuredDataAnalysis,
    cf: ContentFormatAnalysis,
    auth: AuthoritySignals,
    sem: SemanticStructure,
    ai: AiAccessibility,
  ): AeoRecommendation[] {
    const recommendations: AeoRecommendation[] = [];
    const failChecks = checks.filter(c => c.status === "FAIL");
    const warnChecks = checks.filter(c => c.status === "WARNING");

    if (!sd.jsonLdPresent) {
      recommendations.push({
        title: this.L("Add JSON-LD Structured Data", "Dodajte JSON-LD strukturirane podatke"),
        description: this.L("Your page lacks structured data, which is critical for AI engines to understand your content. Add at minimum WebPage and Organization schema.", "Vašoj stranici nedostaju strukturirani podaci, koji su ključni za razumijevanje sadržaja od strane AI sustava. Dodajte barem WebPage i Organization shemu."),
        priority: "Critical",
        category: this.L("Structured Data", "Strukturirani podaci"),
        impact: this.L("AI systems are 2-3x more likely to cite content with structured data markup.", "AI sustavi 2–3 puta češće citiraju sadržaj s markup strukturiranih podataka."),
        actionItems: [
          this.L("Add JSON-LD WebPage schema to every page", "Dodajte JSON-LD WebPage shemu na svaku stranicu"),
          this.L("Add Organization schema to your homepage", "Dodajte shemu Organization na početnu stranicu"),
          this.L("Add Article schema to blog/content pages", "Dodajte Article shemu na blog/sadržajne stranice"),
          this.L("Use Google's Rich Results Test to validate markup", "Koristite Google-ov Rich Results Test za validaciju markup-a"),
        ],
      });
    }

    if (!sd.faqSchema && !cf.hasQuestionHeadings) {
      recommendations.push({
        title: this.L("Create Question-Based Content Format", "Stvorite format sadržaja temeljen na pitanjima"),
        description: this.L("Your content doesn't use question-format headings or FAQ sections, which are the primary way AI systems match content to user queries.", "Vaš sadržaj ne koristi naslove u obliku pitanja ni FAQ sekcije, koje su primarni način na koji AI sustavi usklađuju sadržaj s upitima korisnika."),
        priority: "Critical",
        category: this.L("Content Format", "Format sadržaja"),
        impact: this.L("Question-based content is significantly more likely to be extracted and cited by AI answer engines.", "Sadržaj temeljen na pitanjima znatno je vjerojatnije da će biti ekstrahiran i citiran od strane AI sustava za odgovore."),
        actionItems: [
          this.L("Rewrite at least 3-5 headings as questions (What is..., How to..., Why does...)", "Prepišite najmanje 3–5 naslova kao pitanja (Što je..., Kako..., Zašto...)"),
          this.L("Follow each question heading with a concise 1-3 sentence answer", "Slijedite svaki naslov-pitanje sažetim odgovorom od 1–3 rečenice"),
          this.L("Add an FAQ section with 5-10 common questions", "Dodajte FAQ sekciju s 5–10 uobičajenih pitanja"),
          this.L("Add FAQPage schema markup to the FAQ section", "Dodajte FAQPage schema markup u FAQ sekciju"),
        ],
      });
    }

    if (!auth.hasAuthorInfo) {
      recommendations.push({
        title: this.L("Establish Author Authority (E-E-A-T)", "Uspostavite autoritet autora (E-E-A-T)"),
        description: this.L("No author information found. AI systems prioritize content from identifiable, credible authors with demonstrable expertise.", "Nisu pronađeni podaci o autoru. AI sustavi daju prednost sadržaju od prepoznatljivih, vjerodostojnih autora s dokazanom stručnošću."),
        priority: "High",
        category: this.L("Authority", "Autoritet"),
        impact: this.L("Content with clear author attribution and expertise signals receives higher trust scores from AI systems.", "Sadržaj s jasnom atribucijom autoru i signalima stručnosti dobiva više ocjene povjerenja od AI sustava."),
        actionItems: [
          this.L("Add author name, bio, and credentials to content pages", "Dodajte ime autora, biografiju i akreditive na stranice s sadržajem"),
          this.L("Include author photo and links to professional profiles", "Uključite foto autora i linkove na profesionalne profile"),
          this.L("Add Person schema for author in JSON-LD", "Dodajte Person shemu za autora u JSON-LD"),
          this.L("Link to an About page with full team/company information", "Povežite se na stranicu 'O nama' s potpunim informacijama o timu/tvrtki"),
        ],
      });
    }

    if (!sem.headingHierarchyValid) {
      recommendations.push({
        title: this.L("Fix Heading Hierarchy", "Popravite hijerarhiju naslova"),
        description: this.L("Your heading structure has gaps or issues. AI systems use heading hierarchy as a content outline to understand topic structure.", "Vaša struktura naslova ima nedostatke ili probleme. AI sustavi koriste hijerarhiju naslova kao sadržaj dokumenta za razumijevanje strukture teme."),
        priority: "High",
        category: this.L("Semantic Structure", "Semantička struktura"),
        impact: this.L("Proper heading hierarchy helps AI parse content structure and extract relevant sections more accurately.", "Ispravna hijerarhija naslova pomaže AI sustavima preciznije parsirati strukturu sadržaja i ekstrahirati relevantne sekcije."),
        actionItems: [
          this.L("Ensure exactly one H1 per page", "Osigurajte točno jedan H1 po stranici"),
          this.L("Follow H1 → H2 → H3 hierarchy without skipping levels", "Slijedite hijerarhiju H1 → H2 → H3 bez preskakanja razina"),
          this.L("Use headings to create a logical content outline", "Koristite naslove za stvaranje logičnog sadržaja dokumenta"),
          this.L("Each major section should start with an H2", "Svaka glavna sekcija treba počinjati s H2"),
        ],
      });
    }

    if (!ai.robotsTxtAllowsAi) {
      recommendations.push({
        title: this.L("Unblock AI Crawlers", "Odblokirajte AI crawlere"),
        description: this.lang === 'hr'
          ? `Vaš robots.txt blokira AI crawlere: ${ai.blockedCrawlers.join(", ")}. To sprječava indeksiranje vašeg sadržaja od strane tih AI sustava.`
          : `Your robots.txt is blocking AI crawlers: ${ai.blockedCrawlers.join(", ")}. This prevents your content from being indexed by these AI systems.`,
        priority: "Critical",
        category: this.L("AI Accessibility", "Dostupnost AI sustavima"),
        impact: this.L("Blocked crawlers = zero visibility in those AI platforms. This is the highest-impact issue to fix.", "Blokirani crawleri = nulta vidljivost na tim AI platformama. Ovo je problem s najvećim utjecajem koji treba riješiti."),
        actionItems: [
          this.L("Review robots.txt and remove AI crawler blocks", "Pregledajte robots.txt i uklonite blokade AI crawlera"),
          this.L("Consider allowing GPTBot, Google-Extended, and PerplexityBot", "Razmislite o dozvoljavanju GPTBot, Google-Extended i PerplexityBot"),
          this.L("Use selective Allow/Disallow rules if needed", "Koristite selektivna Allow/Disallow pravila ako je potrebno"),
        ],
      });
    }

    if (!auth.hasCitations && auth.externalSourceLinks < 3) {
      recommendations.push({
        title: this.L("Add Citations and Source References", "Dodajte citate i reference izvora"),
        description: this.L("Your content lacks citations, references, and source links. AI systems value content that demonstrates research-backed credibility.", "Vašem sadržaju nedostaju citati, reference i poveznice na izvore. AI sustavi cijene sadržaj koji demonstrira vjerodostojnost temeljenu na istraživanju."),
        priority: "Medium",
        category: this.L("Authority", "Autoritet"),
        impact: this.L("Cited content is perceived as more trustworthy and authoritative by AI evaluation systems.", "Citirani sadržaj AI sustavi percipiraju kao pouzdaniji i autoritativniji."),
        actionItems: [
          this.L("Link to authoritative external sources for key claims", "Povežite se na autoritativne vanjske izvore za ključne tvrdnje"),
          this.L("Include specific data, statistics, and research references", "Uključite specifične podatke, statistike i reference na istraživanja"),
          this.L("Add a Sources/References section at the end of articles", "Dodajte sekciju Izvori/Reference na kraju članaka"),
          this.L("Use <cite> and <blockquote> HTML elements for formal citations", "Koristite HTML elemente <cite> i <blockquote> za formalne citate"),
        ],
      });
    }

    if (cf.directAnswerParagraphs < 3) {
      recommendations.push({
        title: this.L("Write More Direct-Answer Content", "Pišite više sadržaja s izravnim odgovorima"),
        description: this.L("Your content lacks concise, extractable answer paragraphs. AI systems prefer content they can quote directly in responses.", "Vašem sadržaju nedostaju sažeti, ekstraktabilni odlomci s odgovorima. AI sustavi preferiraju sadržaj koji mogu izravno citirati u odgovorima."),
        priority: "Medium",
        category: this.L("Content Format", "Format sadržaja"),
        impact: this.L("Concise answer paragraphs (40-300 chars) are the building blocks AI uses to construct responses.", "Sažeti odlomci s odgovorima (40–300 znakova) su građevni blokovi koje AI koristi za konstruiranje odgovora."),
        actionItems: [
          this.L("Start key paragraphs with a direct, self-contained answer", "Počnite ključne odlomke izravnim, samostalnim odgovorom"),
          this.L("Use the inverted pyramid style: answer first, details after", "Koristite stil obrnutog piramide: odgovor prvo, detalji poslije"),
          this.L("Aim for 5+ answer-ready paragraphs per page", "Ciljajte 5+ odlomaka spremnih za odgovor po stranici"),
          this.L("Avoid starting paragraphs with pronouns (it, this, they)", "Izbjegavajte početak odlomaka zamjenicama (to, ovaj, oni)"),
        ],
      });
    }

    if (!sem.hasTableOfContents && sem.contentSections >= 3) {
      recommendations.push({
        title: this.L("Add Table of Contents", "Dodajte popis sadržaja"),
        description: this.L("Your content has multiple sections but no table of contents. A TOC helps AI systems understand content scope and navigate to relevant sections.", "Vaš sadržaj ima više sekcija, ali nema popisa sadržaja. Popis sadržaja pomaže AI sustavima razumjeti opseg sadržaja i navigirati do relevantnih sekcija."),
        priority: "Low",
        category: this.L("Semantic Structure", "Semantička struktura"),
        impact: this.L("A TOC acts as a content summary that AI can use to quickly identify relevant sections for user queries.", "Popis sadržaja djeluje kao sažetak koji AI može koristiti za brzu identifikaciju relevantnih sekcija za korisničke upite."),
        actionItems: [
          this.L("Add a table of contents with anchor links at the top of long content", "Dodajte popis sadržaja s anker linkovima na vrhu dugog sadržaja"),
          this.L("Use an ordered list with links to each H2 section", "Koristite uređeni popis s linkovima na svaku H2 sekciju"),
          this.L("WordPress: Install Easy Table of Contents plugin", "WordPress: Instalirajte dodatak Easy Table of Contents"),
        ],
      });
    }

    recommendations.sort((a, b) => {
      const priority = { Critical: 0, High: 1, Medium: 2, Low: 3 };
      return priority[a.priority] - priority[b.priority];
    });

    return recommendations;
  }
}

export const aeoAnalyzer = new AeoAnalyzer();
