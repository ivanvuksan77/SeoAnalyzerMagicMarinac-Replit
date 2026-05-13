import { sql } from "drizzle-orm";
import { pgTable, text, varchar, jsonb, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const seoAnalyses = pgTable("seo_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  overallScore: integer("overall_score").notNull(),
  technicalScore: integer("technical_score").notNull(),
  performanceScore: integer("performance_score").notNull(),
  accessibilityScore: integer("accessibility_score").notNull(),
  keywordScore: integer("keyword_score").notNull(),
  contentScore: integer("content_score").notNull(),
  results: jsonb("results").notNull(),
  recommendations: jsonb("recommendations").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertSeoAnalysisSchema = createInsertSchema(seoAnalyses).omit({
  id: true,
  createdAt: true,
});

export type InsertSeoAnalysis = z.infer<typeof insertSeoAnalysisSchema>;
export type SeoAnalysis = typeof seoAnalyses.$inferSelect;

// Types for analysis results
export interface TechnicalSeoCheck {
  name: string;
  status: "PASS" | "FAIL" | "WARNING";
  details: string;
  priority: "Excellent" | "Good" | "Medium" | "Critical";
  category: string;
  action?: string;
}

export interface PerformanceMetrics {
  coreWebVitals: {
    lcp: number;
    fid: number;
    cls: number;
  };
  pagespeed: {
    desktop: number;
    mobile: number;
  };
  mobileScore: number;
  lighthouseScore: number;
}

export interface AccessibilityCheck {
  name: string;
  status: "PASS" | "FAIL" | "WARNING";
  details: string;
  wcagLevel: "A" | "AA" | "AAA";
}

export interface KeywordAnalysis {
  metaTitle: {
    present: boolean;
    length: number;
    optimized: boolean;
  };
  metaDescription: {
    present: boolean;
    length: number;
    optimized: boolean;
  };
  headingStructure: {
    h1Count: number;
    h1Text: string[];
    hierarchyValid: boolean;
  };
  keywordDensity: Record<string, number>;
  keywordPhrases?: Record<string, number>;
  internalLinks: number;
  externalLinks: number;
}

export interface ContentQuality {
  wordCount: number;
  readabilityScore: number;
  imageAltTags: {
    total: number;
    withAlt: number;
    percentage: number;
  };
  structuredData: boolean;
  schemaMarkup: string[];
}

export interface SeoRecommendation {
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  category: string;
  impact: "Low" | "Medium" | "High";
  timeToFix: string;
  actionItems: string[];
}

export interface AnalysisResults {
  technical: TechnicalSeoCheck[];
  performance: PerformanceMetrics;
  accessibility: AccessibilityCheck[];
  keyword: KeywordAnalysis;
  content: ContentQuality;
  lighthouse: any;
}

// Google Ads Landing Page Experience Types

export type AdsRating = "Below average" | "Average" | "Above average";

export interface AdsCheck {
  name: string;
  status: "PASS" | "FAIL" | "WARNING";
  details: string;
  category: "delivery" | "performance" | "ux" | "caching";
  impact: string;
  recommendation: string;
  fixType: "infrastructure" | "page-level";
  technicalFix?: string;
}

export interface TtfbMeasurement {
  cleanUrl: number;
  withAdsParams: number;
  delta: number;
  penalized: boolean;
}

export interface CdnDetection {
  detected: boolean;
  provider: string | null;
  edgeCaching: boolean;
  headers: Record<string, string>;
}

export interface CacheAnalysis {
  variesByUserAgent: boolean;
  queryStringBusting: boolean;
  fragmented: boolean;
  details: string[];
}

export interface RedirectChain {
  hops: number;
  chain: string[];
  totalLatency: number;
  hasRedirects: boolean;
}

export interface HostingAnalysis {
  sharedHostingSignals: string[];
  isLikelyShared: boolean;
  serverSignature: string | null;
  coldCacheRisk: boolean;
}

export interface MobileUxAnalysis {
  keywordInAboveFold: boolean;
  ctaVisibleAboveFold: boolean;
  layoutShiftRisks: string[];
  aboveFoldContent: string;
  ctaElements: string[];
}

export interface FieldDataMetric {
  percentile: number | null;
  category: "FAST" | "AVERAGE" | "SLOW" | "NONE";
}

export interface CruxFieldData {
  source: "url" | "origin" | "none";
  overall: "FAST" | "AVERAGE" | "SLOW" | null;
  lcp: FieldDataMetric;
  cls: FieldDataMetric;
  inp: FieldDataMetric;
  fcp: FieldDataMetric;
  ttfb: FieldDataMetric;
  fetchedAt: number;
  error?: string;
}

export interface AdsAnalysisResults {
  rating: AdsRating;
  score: number;
  ttfb: TtfbMeasurement;
  cdn: CdnDetection;
  cache: CacheAnalysis;
  redirects: RedirectChain;
  hosting: HostingAnalysis;
  mobileUx: MobileUxAnalysis;
  checks: AdsCheck[];
  qualityScoreImpact: string;
  cpcImpact: string;
  fieldData?: CruxFieldData;
}

export interface AdRelevanceTermResult {
  term: string;
  inTitle: boolean;
  inH1: boolean;
  inSubheadings: boolean;
  inFirstParagraph: boolean;
  inAltText: boolean;
  inBody: boolean;
  occurrences: number;
}

export interface AdRelevanceResult {
  url: string;
  pageTitle: string;
  pageH1: string;
  overallScore: number;
  matchRate: number;
  terms: AdRelevanceTermResult[];
  recommendations: string[];
}

export interface AdsRecommendation {
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  fixType: "infrastructure" | "page-level";
  impact: string;
  actionItems: string[];
}

export const adsAnalyses = pgTable("ads_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  rating: text("rating").notNull(),
  score: integer("score").notNull(),
  results: jsonb("results").notNull(),
  recommendations: jsonb("recommendations").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAdsAnalysisSchema = createInsertSchema(adsAnalyses).omit({
  id: true,
  createdAt: true,
});

export type InsertAdsAnalysis = z.infer<typeof insertAdsAnalysisSchema>;
export type AdsAnalysis = typeof adsAnalyses.$inferSelect;

// AEO (Answer Engine Optimization) Types

export type AeoRating = "Not Ready" | "Partially Ready" | "AI-Ready" | "Highly Optimized";

export interface AeoCheck {
  name: string;
  status: "PASS" | "FAIL" | "WARNING";
  details: string;
  category: "structured-data" | "content-format" | "authority" | "technical" | "discoverability";
  impact: string;
  recommendation: string;
  technicalFix?: string;
}

export interface StructuredDataAnalysis {
  jsonLdPresent: boolean;
  jsonLdTypes: string[];
  microdataPresent: boolean;
  rdfa: boolean;
  faqSchema: boolean;
  howToSchema: boolean;
  articleSchema: boolean;
  organizationSchema: boolean;
  breadcrumbSchema: boolean;
  totalSchemaCount: number;
}

export interface ContentFormatAnalysis {
  hasQuestionHeadings: boolean;
  questionHeadings: string[];
  hasDefinitions: boolean;
  hasLists: boolean;
  hasTables: boolean;
  hasHowToContent: boolean;
  directAnswerParagraphs: number;
  faqSections: number;
  averageParagraphLength: number;
  contentDepthScore: number;
}

export interface AuthoritySignals {
  hasAuthorInfo: boolean;
  authorDetails: string[];
  hasAboutPage: boolean;
  hasDatePublished: boolean;
  hasDateModified: boolean;
  hasCitations: boolean;
  citationCount: number;
  hasOriginalData: boolean;
  hasStatistics: boolean;
  externalSourceLinks: number;
}

export interface SemanticStructure {
  headingHierarchyValid: boolean;
  headingCount: Record<string, number>;
  usesSemanticHtml: boolean;
  semanticElements: string[];
  hasTableOfContents: boolean;
  contentSections: number;
  listCount: number;
  tableCount: number;
}

export interface AiAccessibility {
  robotsTxtAllowsAi: boolean;
  blockedCrawlers: string[];
  hasCanonicalUrl: boolean;
  hasMetaDescription: boolean;
  metaDescriptionLength: number;
  hasOpenGraph: boolean;
  cleanTextExtraction: boolean;
  wordCount: number;
  languageDeclared: boolean;
}

export interface SchemaSuggestion {
  type: string;
  label: string;
  description: string;
  code: string;
  priority: "Critical" | "High" | "Medium" | "Low";
  alreadyPresent: boolean;
}

export interface AiSearchPreview {
  quotableExcerpts: { text: string; source: string; type: "answer" | "faq" | "definition" | "statistic" | "list" }[];
  simulatedCitation: { title: string; url: string; snippet: string };
  extractionQuality: "High" | "Medium" | "Low";
  extractionDetails: string;
}

export interface ContentGap {
  question: string;
  type: "what" | "how" | "why" | "comparison" | "best" | "cost";
  relevance: "High" | "Medium";
  reason: string;
}

export interface ContentGapsAnalysis {
  topicKeywords: string[];
  existingQuestions: string[];
  missingQuestions: ContentGap[];
  coverageScore: number;
  coverageDetails: string;
}

export interface CitationLikelihood {
  score: number;
  rating: "Very Likely" | "Likely" | "Possible" | "Unlikely";
  factors: { name: string; score: number; maxScore: number; details: string }[];
  explanation: string;
}

export interface AeoAnalysisResults {
  rating: AeoRating;
  score: number;
  structuredDataScore: number;
  contentFormatScore: number;
  authorityScore: number;
  semanticScore: number;
  aiAccessibilityScore: number;
  structuredData: StructuredDataAnalysis;
  contentFormat: ContentFormatAnalysis;
  authority: AuthoritySignals;
  semantic: SemanticStructure;
  aiAccessibility: AiAccessibility;
  checks: AeoCheck[];
  schemaSuggestions: SchemaSuggestion[];
  aiSearchPreview: AiSearchPreview;
  contentGaps: ContentGapsAnalysis;
  citationLikelihood: CitationLikelihood;
}

export interface AeoComparisonResult {
  urls: string[];
  analyses: {
    url: string;
    score: number;
    rating: AeoRating;
    structuredDataScore: number;
    contentFormatScore: number;
    authorityScore: number;
    semanticScore: number;
    aiAccessibilityScore: number;
    citationScore: number;
    keyStrengths: string[];
    keyWeaknesses: string[];
    errorCode?: string;
    errorMessage?: string;
  }[];
  winner: string;
  summary: string;
}

export interface SeoComparisonResult {
  urls: string[];
  analyses: {
    url: string;
    overallScore: number;
    technicalScore: number;
    performanceScore: number;
    accessibilityScore: number;
    keywordScore: number;
    contentScore: number;
    passCount: number;
    failCount: number;
    warnCount: number;
    keyStrengths: string[];
    keyWeaknesses: string[];
    errorCode?: string;
    errorMessage?: string;
  }[];
  winner: string;
  summary: string;
}

export interface AdsComparisonResult {
  urls: string[];
  analyses: {
    url: string;
    score: number;
    rating: string;
    ttfb: number;
    cdnDetected: boolean;
    cacheHealthy: boolean;
    redirectHops: number;
    mobileUxGood: boolean;
    keyStrengths: string[];
    keyWeaknesses: string[];
    errorCode?: string;
    errorMessage?: string;
  }[];
  winner: string;
  summary: string;
}

export interface AeoRecommendation {
  title: string;
  description: string;
  priority: "Low" | "Medium" | "High" | "Critical";
  category: string;
  impact: string;
  actionItems: string[];
}

export const aeoAnalyses = pgTable("aeo_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  rating: text("rating").notNull(),
  score: integer("score").notNull(),
  results: jsonb("results").notNull(),
  recommendations: jsonb("recommendations").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertAeoAnalysisSchema = createInsertSchema(aeoAnalyses).omit({
  id: true,
  createdAt: true,
});

export type InsertAeoAnalysis = z.infer<typeof insertAeoAnalysisSchema>;
export type AeoAnalysis = typeof aeoAnalyses.$inferSelect;

// Site Tools Types

export interface BrokenLink {
  url: string;
  anchorText: string;
  statusCode: number | null;
  statusText: string;
  type: "internal" | "external";
  location: string;
  responseTime: number | null;
}

export interface BrokenLinksResult {
  totalLinks: number;
  internalLinks: number;
  externalLinks: number;
  brokenLinks: BrokenLink[];
  redirectedLinks: BrokenLink[];
  skippedLinks?: BrokenLink[];
  workingLinks: number;
  brokenCount: number;
  redirectCount: number;
  score: number;
  summary: string;
}

export interface ImageIssue {
  src: string;
  alt: string | null;
  hasAlt: boolean;
  hasLazyLoading: boolean;
  hasExplicitDimensions: boolean;
  hasSrcset: boolean;
  fileSize: number | null;
  format: string | null;
  isModernFormat: boolean;
  issues: string[];
}

export interface ImageOptimizationResult {
  totalImages: number;
  imagesWithAlt: number;
  imagesWithLazyLoading: number;
  imagesWithDimensions: number;
  imagesWithSrcset: number;
  modernFormatCount: number;
  oversizedImages: number;
  images: ImageIssue[];
  score: number;
  summary: string;
  recommendations: string[];
}

export interface InternalLink {
  url: string;
  anchorText: string;
  isDescriptive: boolean;
  hasNofollow: boolean;
  depth: number;
  location: string;
}

export interface InternalLinkingResult {
  totalInternalLinks: number;
  uniqueInternalLinks: number;
  descriptiveAnchors: number;
  genericAnchors: number;
  nofollowCount: number;
  deepLinks: number;
  shallowLinks: number;
  links: InternalLink[];
  anchorTextDistribution: { text: string; count: number }[];
  score: number;
  summary: string;
  recommendations: string[];
}

export interface RobotsTxtResult {
  exists: boolean;
  content: string | null;
  userAgents: string[];
  disallowedPaths: string[];
  allowedPaths: string[];
  sitemapReferences: string[];
  hasWildcardBlock: boolean;
  blocksImportantPaths: boolean;
  blockedImportantPaths: string[];
  issues: string[];
}

export interface SitemapResult {
  exists: boolean;
  url: string;
  urlCount: number;
  hasLastmod: boolean;
  hasChangefreq: boolean;
  hasPriority: boolean;
  isSitemapIndex: boolean;
  childSitemaps: string[];
  sampleUrls: string[];
  issues: string[];
}

export interface SitemapValidatorResult {
  robotsTxt: RobotsTxtResult;
  sitemap: SitemapResult;
  score: number;
  summary: string;
  recommendations: string[];
}

// GEO (Generative Engine Optimization) Types

export type GeoRating = "Not Ready" | "Emerging" | "Optimized" | "Highly Optimized";

export interface GeoCheck {
  name: string;
  status: "PASS" | "FAIL" | "WARNING";
  details: string;
  category: "source-authority" | "content-fluency" | "unique-value" | "entity-optimization" | "multi-format";
  impact: string;
  recommendation: string;
  technicalFix?: string;
}

export interface SourceAuthorityAnalysis {
  hasAuthorCredentials: boolean;
  authorDetails: string[];
  hasCitations: boolean;
  citationCount: number;
  hasExpertQuotes: boolean;
  expertQuoteCount: number;
  hasOriginalResearch: boolean;
  trustSignals: string[];
  domainAuthorityIndicators: string[];
}

export interface ContentFluencyAnalysis {
  readabilityScore: number;
  averageSentenceLength: number;
  summarizabilityScore: number;
  topSummarySnippets: string[];
  paragraphClarity: number;
  transitionWords: number;
  passiveVoicePercentage: number;
}

export interface UniqueValueAnalysis {
  hasStatistics: boolean;
  statisticsCount: number;
  hasOriginalData: boolean;
  dataPoints: string[];
  hasUniqueInsights: boolean;
  quotesCount: number;
  firstPersonExperience: boolean;
  caseStudyPresent: boolean;
}

export interface EntityOptimizationAnalysis {
  primaryEntities: string[];
  entityDensity: number;
  entityCoverage: number;
  topicalDepthScore: number;
  relatedEntities: string[];
  missingEntities: string[];
  semanticRelevance: number;
}

export interface MultiFormatAnalysis {
  hasImages: boolean;
  imageCount: number;
  hasVideos: boolean;
  videoCount: number;
  hasInfographics: boolean;
  hasInteractiveElements: boolean;
  hasAudio: boolean;
  hasTables: boolean;
  tableCount: number;
  hasCharts: boolean;
  contentFormats: string[];
}

export interface GeoAnalysisResults {
  rating: GeoRating;
  score: number;
  sourceAuthorityScore: number;
  contentFluencyScore: number;
  uniqueValueScore: number;
  entityOptimizationScore: number;
  multiFormatScore: number;
  sourceAuthority: SourceAuthorityAnalysis;
  contentFluency: ContentFluencyAnalysis;
  uniqueValue: UniqueValueAnalysis;
  entityOptimization: EntityOptimizationAnalysis;
  multiFormat: MultiFormatAnalysis;
  checks: GeoCheck[];
  generativeReadinessScore: number;
}

export interface GeoComparisonResult {
  urls: string[];
  analyses: {
    url: string;
    score: number;
    rating: GeoRating;
    sourceAuthorityScore: number;
    contentFluencyScore: number;
    uniqueValueScore: number;
    entityOptimizationScore: number;
    multiFormatScore: number;
    keyStrengths: string[];
    keyWeaknesses: string[];
    errorCode?: string;
    errorMessage?: string;
  }[];
  winner: string;
  summary: string;
}

export const geoAnalyses = pgTable("geo_analyses", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  url: text("url").notNull(),
  rating: text("rating").notNull(),
  score: integer("score").notNull(),
  results: jsonb("results").notNull(),
  recommendations: jsonb("recommendations").notNull(),
  createdAt: timestamp("created_at").defaultNow(),
});

export const insertGeoAnalysisSchema = createInsertSchema(geoAnalyses).omit({
  id: true,
  createdAt: true,
});

export type InsertGeoAnalysis = z.infer<typeof insertGeoAnalysisSchema>;
export type GeoAnalysis = typeof geoAnalyses.$inferSelect;
