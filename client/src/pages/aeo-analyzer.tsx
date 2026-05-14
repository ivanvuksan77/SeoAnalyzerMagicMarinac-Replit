import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Card, CardContent } from "@/components/ui/card";
import { BotBlockedState, CompareBlockedBadge, isFetchErrorCode } from "@/components/bot-blocked-state";
import { Badge } from "@/components/ui/badge";
import { ProgressRing } from "@/components/ui/progress-ring";
import {
  Search,
  Loader2,
  Brain,
  Database,
  FileText,
  Shield,
  Code,
  Globe,
  User,
  ChevronDown,
  ChevronUp,
  Wrench,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Copy,
  Check,
  Eye,
  HelpCircle,
  TrendingUp,
  BarChart3,
  Zap,
  Target,
  Plus,
  Minus,
  Trophy,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useSeo } from "@/lib/seo";
import type {
  AeoAnalysis,
  AeoCheck,
  AeoRecommendation,
  AeoAnalysisResults,
  SchemaSuggestion,
  AiSearchPreview,
  ContentGapsAnalysis,
  CitationLikelihood,
  AeoComparisonResult,
} from "@shared/schema";

const formSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

type ActiveTab = "analyze" | "compare";

export default function AeoAnalyzerPage() {
  const { t } = useTranslation();
  useSeo({ title: t("seo.aeo.title"), description: t("seo.aeo.description"), path: "/aeo-analyzer" });
  const [analysis, setAnalysis] = useState<AeoAnalysis | null>(null);
  const [activeTab, setActiveTab] = useState<ActiveTab>("analyze");
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: "" },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (data: { url: string }) => {
      const response = await apiRequest("POST", "/api/aeo-analyze", data);
      return response.json();
    },
    onSuccess: (result: AeoAnalysis) => {
      toast({ title: "Analysis Complete", description: `AEO analysis for ${result.url}` });
      setAnalysis(result);
    },
    onError: (error: any) => {
      if (isFetchErrorCode(error?.code)) return;
      toast({ title: "Analysis Failed", description: error.message || "Failed to analyze page", variant: "destructive" });
    },
  });

  const onSubmit = (values: z.infer<typeof formSchema>) => {
    analyzeMutation.mutate(values);
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Search className="text-primary-foreground w-4 h-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <h1 className="text-2xl font-bold text-foreground">FreeSEOSiteAnalyzer</h1>
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground">Scan. Snap. Fix What Matters.</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/master-analyzer" className="text-muted-foreground hover:text-foreground transition-colors">Master Analyzer</Link>
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">FreeSEOSiteAnalyzer</Link>
            <Link href="/ads-analyzer" className="text-muted-foreground hover:text-foreground transition-colors">Ads Landing Page</Link>
            <Link href="/aeo-analyzer" className="text-foreground font-medium transition-colors">AEO / AI SEO</Link>
            <Link href="/site-tools" className="text-muted-foreground hover:text-foreground transition-colors">Site Tools</Link>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
              <User className="w-4 h-4 mr-2 inline" />Account
            </button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="flex gap-2 mb-6">
          <Button
            variant={activeTab === "analyze" ? "default" : "outline"}
            onClick={() => setActiveTab("analyze")}
            className="flex items-center gap-2"
          >
            <Brain className="w-4 h-4" />Analyze
          </Button>
          <Button
            variant={activeTab === "compare" ? "default" : "outline"}
            onClick={() => setActiveTab("compare")}
            className="flex items-center gap-2"
            data-testid="compare-tab"
          >
            <BarChart3 className="w-4 h-4" />Compare Competitors
          </Button>
        </div>

        {activeTab === "analyze" && (
          <>
            <Card className="rounded-xl border border-border shadow-sm p-8 mb-8">
              <CardContent className="p-0">
                <div className="max-w-2xl mx-auto text-center">
                  <div className="inline-flex items-center gap-2 bg-purple-50 dark:bg-purple-950 text-purple-700 dark:text-purple-300 px-3 py-1 rounded-full text-sm font-medium mb-4">
                    <Brain className="w-4 h-4" />
                    AI Search Ready
                  </div>
                  <h2 className="text-3xl font-bold text-foreground mb-4">AEO / AI SEO Analyzer</h2>
                  <p className="text-muted-foreground mb-8">
                    Evaluate how well your content is optimized for AI answer engines like ChatGPT, Perplexity, and Google AI Overviews. Measures structured data, content format, authority signals, and AI accessibility.
                  </p>

                  <Form {...form}>
                    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                      <div className="flex flex-col sm:flex-row gap-4 max-w-lg mx-auto">
                        <div className="flex-1">
                          <FormField
                            control={form.control}
                            name="url"
                            render={({ field }) => (
                              <FormItem>
                                <FormControl>
                                  <Input
                                    placeholder="https://your-website.com/article"
                                    {...field}
                                    className="px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                                    data-testid="aeo-input-url"
                                  />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                        <Button
                          type="submit"
                          disabled={analyzeMutation.isPending}
                          className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                          data-testid="aeo-button-analyze"
                        >
                          {analyzeMutation.isPending ? (
                            <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                          ) : (
                            <><Brain className="w-4 h-4 mr-2" />Analyze</>
                          )}
                        </Button>
                      </div>
                    </form>
                  </Form>

                  {!analyzeMutation.isPending && analyzeMutation.isError && isFetchErrorCode((analyzeMutation.error as any)?.code) && (
                    <div className="mt-6 text-left">
                      <BotBlockedState
                        code={(analyzeMutation.error as any).code}
                        url={form.getValues("url")}
                        onRetry={() => {
                          const values = form.getValues();
                          analyzeMutation.reset();
                          analyzeMutation.mutate(values);
                        }}
                      />
                    </div>
                  )}

                  <div className="mt-6 flex flex-wrap justify-center gap-4 text-sm text-muted-foreground">
                    <span className="flex items-center"><Database className="w-4 h-4 text-purple-500 mr-2" />Structured Data</span>
                    <span className="flex items-center"><FileText className="w-4 h-4 text-blue-500 mr-2" />Content Format</span>
                    <span className="flex items-center"><Shield className="w-4 h-4 text-amber-500 mr-2" />E-E-A-T Signals</span>
                    <span className="flex items-center"><Globe className="w-4 h-4 text-indigo-500 mr-2" />AI Accessibility</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            {analysis && <AeoResults analysis={analysis} />}
          </>
        )}

        {activeTab === "compare" && <CompetitorComparison />}

        <footer className="bg-card border-t border-border mt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center space-x-3 mb-4 md:mb-0">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                  <Search className="text-primary-foreground w-3 h-3" />
                </div>
                <span className="text-muted-foreground">© 2024 FreeSEOSiteAnalyzer. All rights reserved.</span>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <a href="#" className="text-muted-foreground hover:text-foreground">Privacy Policy</a>
                <a href="#" className="text-muted-foreground hover:text-foreground">Terms of Service</a>
                <a href="#" className="text-muted-foreground hover:text-foreground">Support</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}

function AeoResults({ analysis }: { analysis: AeoAnalysis }) {
  const results = analysis.results as AeoAnalysisResults;
  const recommendations = analysis.recommendations as AeoRecommendation[];

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <RatingCard rating={results.rating} score={results.score} url={analysis.url} />
        </div>
        <CitationLikelihoodCard citation={results.citationLikelihood} />
      </div>
      <CategoryOverview results={results} />
      <AiSearchPreviewCard preview={results.aiSearchPreview} />
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <SchemaGeneratorCard suggestions={results.schemaSuggestions} />
        <ContentGapFinderCard gaps={results.contentGaps} />
      </div>
      <ChecksDetail checks={results.checks} />
      {recommendations.length > 0 && <RecommendationsList recommendations={recommendations} />}
    </div>
  );
}

function CitationLikelihoodCard({ citation }: { citation: CitationLikelihood }) {
  const ratingColors: Record<string, string> = {
    "Very Likely": "text-green-600",
    "Likely": "text-blue-600",
    "Possible": "text-yellow-600",
    "Unlikely": "text-red-600",
  };
  const ratingBg: Record<string, string> = {
    "Very Likely": "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200",
    "Likely": "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200",
    "Possible": "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200",
    "Unlikely": "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200",
  };

  return (
    <Card className="rounded-xl border border-border shadow-sm p-6" data-testid="citation-likelihood">
      <CardContent className="p-0">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Citation Likelihood</h3>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className={`text-4xl font-bold ${ratingColors[citation.rating] || "text-gray-600"}`}>{citation.score}</div>
          <div>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${ratingBg[citation.rating] || ""}`}>
              <Zap className="w-3 h-3" />{citation.rating}
            </span>
            <p className="text-xs text-muted-foreground mt-1">out of 100</p>
          </div>
        </div>
        <div className="space-y-2">
          {citation.factors.map((factor, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate mr-2">{factor.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full ${factor.score >= factor.maxScore * 0.7 ? "bg-green-500" : factor.score >= factor.maxScore * 0.3 ? "bg-yellow-500" : "bg-red-500"}`}
                    style={{ width: `${(factor.score / factor.maxScore) * 100}%` }}
                  />
                </div>
                <span className="text-xs font-medium w-10 text-right">{factor.score}/{factor.maxScore}</span>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AiSearchPreviewCard({ preview }: { preview: AiSearchPreview }) {
  const [expanded, setExpanded] = useState(false);
  const qualityColors: Record<string, string> = {
    High: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
    Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
    Low: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
  };
  const typeLabels: Record<string, string> = {
    answer: "Direct Answer",
    faq: "FAQ",
    definition: "Definition",
    statistic: "Statistic",
    list: "List",
  };
  const typeColors: Record<string, string> = {
    answer: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300",
    faq: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300",
    definition: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300",
    statistic: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300",
    list: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300",
  };

  return (
    <Card className="rounded-xl border border-border shadow-sm" data-testid="ai-search-preview">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-foreground">AI Search Preview</h3>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${qualityColors[preview.extractionQuality]}`}>
            {preview.extractionQuality} Extraction Quality
          </span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{preview.extractionDetails}</p>

        <div className="bg-muted/50 rounded-lg border border-border p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Simulated AI Citation</span>
          </div>
          <p className="text-sm font-medium text-foreground mb-1">{preview.simulatedCitation.title}</p>
          <p className="text-sm text-muted-foreground">{preview.simulatedCitation.snippet}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{preview.simulatedCitation.url}</p>
        </div>

        {preview.quotableExcerpts.length > 0 && (
          <>
            <button
              onClick={() => setExpanded(!expanded)}
              className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors mb-3"
              data-testid="preview-excerpts-toggle"
            >
              <span>Quotable Excerpts ({preview.quotableExcerpts.length})</span>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expanded && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                {preview.quotableExcerpts.map((excerpt, i) => (
                  <div key={i} className="border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[excerpt.type] || "bg-gray-100 text-gray-700"}`}>
                        {typeLabels[excerpt.type] || excerpt.type}
                      </span>
                      <span className="text-xs text-muted-foreground">from: {excerpt.source}</span>
                    </div>
                    <p className="text-sm text-foreground whitespace-pre-line">{excerpt.text}</p>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
}

function SchemaGeneratorCard({ suggestions }: { suggestions: SchemaSuggestion[] }) {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const [expandedIndex, setExpandedIndex] = useState<number | null>(null);

  const copyToClipboard = (code: string, index: number) => {
    const wrappedCode = `<script type="application/ld+json">\n${code}\n</script>`;
    navigator.clipboard.writeText(wrappedCode);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const needsAction = suggestions.filter(s => !s.alreadyPresent);
  const present = suggestions.filter(s => s.alreadyPresent);

  return (
    <Card className="rounded-xl border border-border shadow-sm" data-testid="schema-generator">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Code className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Schema Markup Generator</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">
          Ready-to-copy JSON-LD code generated from your page content. Paste into your HTML &lt;head&gt;.
        </p>

        {present.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Already Present</p>
            <div className="flex flex-wrap gap-2">
              {present.map((s, i) => (
                <span key={i} className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
                  <CheckCircle2 className="w-3 h-3" />{s.label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-3">
          {needsAction.map((suggestion, i) => {
            const isExpanded = expandedIndex === i;
            const priorityColors: Record<string, string> = {
              Critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
              High: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
              Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
              Low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
            };
            return (
              <div key={i} className="border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{suggestion.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[suggestion.priority]}`}>{suggestion.priority}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setExpandedIndex(isExpanded ? null : i)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="schema-toggle"
                    >
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button
                      onClick={() => copyToClipboard(suggestion.code, i)}
                      className="p-1 text-muted-foreground hover:text-foreground transition-colors"
                      data-testid="schema-copy"
                    >
                      {copiedIndex === i ? <Check className="w-4 h-4 text-green-600" /> : <Copy className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground">{suggestion.description}</p>
                {isExpanded && (
                  <pre className="mt-2 p-3 bg-muted/50 rounded-lg text-xs font-mono overflow-x-auto text-foreground max-h-48 overflow-y-auto border border-border" data-testid="schema-code">
                    {`<script type="application/ld+json">\n${suggestion.code}\n</script>`}
                  </pre>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function ContentGapFinderCard({ gaps }: { gaps: ContentGapsAnalysis }) {
  const typeIcons: Record<string, typeof HelpCircle> = {
    what: HelpCircle,
    how: Wrench,
    why: Brain,
    comparison: BarChart3,
    best: Trophy,
    cost: TrendingUp,
  };

  return (
    <Card className="rounded-xl border border-border shadow-sm" data-testid="content-gaps">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">Content Gap Finder</h3>
        </div>

        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">Topic Coverage</span>
              <span className="font-semibold text-foreground">{gaps.coverageScore}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all ${gaps.coverageScore >= 70 ? "bg-green-500" : gaps.coverageScore >= 40 ? "bg-yellow-500" : "bg-red-500"}`}
                style={{ width: `${gaps.coverageScore}%` }}
              />
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-3">{gaps.coverageDetails}</p>

        {gaps.topicKeywords.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Detected Topics</p>
            <div className="flex flex-wrap gap-1.5">
              {gaps.topicKeywords.map((kw, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">{kw}</span>
              ))}
            </div>
          </div>
        )}

        {gaps.missingQuestions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Missing Questions AI Looks For</p>
            <div className="space-y-2">
              {gaps.missingQuestions.map((gap, i) => {
                const Icon = typeIcons[gap.type] || HelpCircle;
                return (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-border">
                    <Icon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{gap.question}</p>
                      <p className="text-xs text-muted-foreground">{gap.reason}</p>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${gap.relevance === "High" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"}`}>
                      {gap.relevance}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {gaps.missingQuestions.length === 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800 dark:text-green-200">Excellent! Your content covers all common question patterns.</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function CompetitorComparison() {
  const [urls, setUrls] = useState<string[]>(["", ""]);
  const [comparison, setComparison] = useState<AeoComparisonResult | null>(null);
  const { toast } = useToast();

  const compareMutation = useMutation({
    mutationFn: async (data: { urls: string[] }) => {
      const response = await apiRequest("POST", "/api/aeo-compare", data);
      return response.json();
    },
    onSuccess: (result: AeoComparisonResult) => {
      toast({ title: "Comparison Complete", description: `Compared ${result.urls.length} websites` });
      setComparison(result);
    },
    onError: (error: any) => {
      toast({ title: "Comparison Failed", description: error.message || "Failed to compare", variant: "destructive" });
    },
  });

  const addUrl = () => {
    if (urls.length < 3) setUrls([...urls, ""]);
  };

  const removeUrl = (index: number) => {
    if (urls.length > 2) setUrls(urls.filter((_, i) => i !== index));
  };

  const updateUrl = (index: number, value: string) => {
    const newUrls = [...urls];
    newUrls[index] = value;
    setUrls(newUrls);
  };

  const handleCompare = () => {
    const validUrls = urls.filter(u => u.trim().length > 0);
    if (validUrls.length < 2) {
      toast({ title: "Need at least 2 URLs", description: "Enter at least 2 URLs to compare", variant: "destructive" });
      return;
    }
    compareMutation.mutate({ urls: validUrls });
  };

  const categories = [
    { key: "structuredDataScore", label: "Structured Data", icon: Database },
    { key: "contentFormatScore", label: "Content Format", icon: FileText },
    { key: "authorityScore", label: "Authority", icon: Shield },
    { key: "semanticScore", label: "Semantic", icon: Code },
    { key: "aiAccessibilityScore", label: "AI Access", icon: Globe },
    { key: "citationScore", label: "Citation", icon: Target },
  ];

  const barColors = ["bg-blue-500", "bg-purple-500", "bg-amber-500"];

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border border-border shadow-sm p-8">
        <CardContent className="p-0">
          <div className="max-w-2xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 px-3 py-1 rounded-full text-sm font-medium mb-4">
              <BarChart3 className="w-4 h-4" />
              Side-by-Side
            </div>
            <h2 className="text-3xl font-bold text-foreground mb-4">Competitor AEO Comparison</h2>
            <p className="text-muted-foreground mb-8">
              Compare 2-3 websites side by side to see who's better optimized for AI search engines.
            </p>

            <div className="space-y-3 max-w-lg mx-auto">
              {urls.map((url, i) => (
                <div key={i} className="flex items-center gap-2">
                  <span className="text-sm font-medium text-muted-foreground w-8">#{i + 1}</span>
                  <Input
                    placeholder={`https://website-${i + 1}.com`}
                    value={url}
                    onChange={(e) => updateUrl(i, e.target.value)}
                    className="flex-1"
                    data-testid={`compare-url-${i}`}
                  />
                  {urls.length > 2 && (
                    <Button variant="ghost" size="sm" onClick={() => removeUrl(i)}>
                      <Minus className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              ))}

              <div className="flex items-center justify-between">
                {urls.length < 3 && (
                  <Button variant="outline" size="sm" onClick={addUrl} className="flex items-center gap-1">
                    <Plus className="w-4 h-4" />Add URL
                  </Button>
                )}
                <Button
                  onClick={handleCompare}
                  disabled={compareMutation.isPending}
                  className="ml-auto"
                  data-testid="compare-button"
                >
                  {compareMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Comparing...</>
                  ) : (
                    <><BarChart3 className="w-4 h-4 mr-2" />Compare</>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {comparison && (
        <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-6">
          <Card className="rounded-xl border-2 border-primary/20 shadow-sm p-6">
            <CardContent className="p-0">
              <div className="flex items-center gap-2 mb-3">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-bold text-foreground">Comparison Summary</h3>
              </div>
              <p className="text-muted-foreground">{comparison.summary}</p>
            </CardContent>
          </Card>

          <div className={`grid gap-4 ${comparison.analyses.length === 3 ? "grid-cols-1 md:grid-cols-3" : "grid-cols-1 md:grid-cols-2"}`}>
            {comparison.analyses.map((a, i) => {
              const isWinner = a.url === comparison.winner;
              return (
                <Card key={i} className={`rounded-xl border shadow-sm p-5 ${isWinner ? "border-2 border-yellow-400 dark:border-yellow-600" : "border-border"}`} data-testid={`compare-result-${i}`}>
                  <CardContent className="p-0">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-2 min-w-0">
                        {isWinner && <Trophy className="w-4 h-4 text-yellow-500" />}
                        <span className="text-sm font-medium text-foreground truncate max-w-[180px]">{new URL(a.url).hostname}</span>
                        {(a as any).errorCode && isFetchErrorCode((a as any).errorCode) && (
                          <CompareBlockedBadge code={(a as any).errorCode} />
                        )}
                      </div>
                      <div className={`text-3xl font-bold ${a.score >= 70 ? "text-green-600" : a.score >= 40 ? "text-yellow-600" : "text-red-600"}`}>
                        {a.score}
                      </div>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium mb-4 ${a.rating === "Highly Optimized" ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" : a.rating === "AI-Ready" ? "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" : a.rating === "Partially Ready" ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" : "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"}`}>
                      {a.rating}
                    </span>

                    <div className="space-y-2 mt-3">
                      {categories.map((cat) => {
                        const score = a[cat.key as keyof typeof a] as number;
                        return (
                          <div key={cat.key} className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground w-24 truncate">{cat.label}</span>
                            <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${barColors[i]}`} style={{ width: `${score}%` }} />
                            </div>
                            <span className="text-xs font-medium w-8 text-right">{score}</span>
                          </div>
                        );
                      })}
                    </div>

                    {a.keyStrengths.length > 0 && (
                      <div className="mt-4">
                        <p className="text-xs font-medium text-green-600 mb-1">Strengths</p>
                        {a.keyStrengths.slice(0, 3).map((s, j) => (
                          <p key={j} className="text-xs text-muted-foreground flex items-start gap-1">
                            <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />{s}
                          </p>
                        ))}
                      </div>
                    )}
                    {a.keyWeaknesses.length > 0 && (
                      <div className="mt-2">
                        <p className="text-xs font-medium text-red-600 mb-1">Weaknesses</p>
                        {a.keyWeaknesses.slice(0, 3).map((w, j) => (
                          <p key={j} className="text-xs text-muted-foreground flex items-start gap-1">
                            <XCircle className="w-3 h-3 text-red-500 mt-0.5 flex-shrink-0" />{w}
                          </p>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Card className="rounded-xl border border-border shadow-sm p-6">
            <CardContent className="p-0">
              <h3 className="text-lg font-bold text-foreground mb-4">Category Comparison</h3>
              <div className="space-y-4">
                {categories.map((cat) => {
                  const Icon = cat.icon;
                  const maxScore = Math.max(...comparison.analyses.map(a => a[cat.key as keyof typeof a] as number));
                  return (
                    <div key={cat.key}>
                      <div className="flex items-center gap-2 mb-2">
                        <Icon className="w-4 h-4 text-muted-foreground" />
                        <span className="text-sm font-medium text-foreground">{cat.label}</span>
                      </div>
                      <div className="space-y-1.5">
                        {comparison.analyses.map((a, i) => {
                          const score = a[cat.key as keyof typeof a] as number;
                          const isMax = score === maxScore && maxScore > 0;
                          return (
                            <div key={i} className="flex items-center gap-2">
                              <span className="text-xs text-muted-foreground w-32 truncate">{new URL(a.url).hostname}</span>
                              <div className="flex-1 h-3 bg-muted rounded-full overflow-hidden">
                                <div className={`h-full rounded-full transition-all ${barColors[i]} ${isMax ? "opacity-100" : "opacity-60"}`} style={{ width: `${score}%` }} />
                              </div>
                              <span className={`text-xs font-medium w-8 text-right ${isMax ? "text-foreground font-bold" : "text-muted-foreground"}`}>{score}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}

function RatingCard({ rating, score, url }: { rating: string; score: number; url: string }) {
  const ratingConfig: Record<string, { color: string; bg: string; border: string; badgeClass: string }> = {
    "Highly Optimized": { color: "text-green-600", bg: "bg-green-50 dark:bg-green-950", border: "border-green-200 dark:border-green-800", badgeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    "AI-Ready": { color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950", border: "border-blue-200 dark:border-blue-800", badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    "Partially Ready": { color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950", border: "border-yellow-200 dark:border-yellow-800", badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    "Not Ready": { color: "text-red-600", bg: "bg-red-50 dark:bg-red-950", border: "border-red-200 dark:border-red-800", badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  };

  const config = ratingConfig[rating] || ratingConfig["Partially Ready"];

  return (
    <Card className={`rounded-xl border-2 ${config.border} shadow-sm p-6`}>
      <CardContent className="p-0">
        <div className="flex items-center space-x-6">
          <ProgressRing value={score} size={80} strokeWidth={8} />
          <div>
            <div className="flex items-center gap-3 mb-1">
              <h3 className="text-2xl font-bold text-foreground">AEO Readiness Score</h3>
              <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${config.badgeClass}`}>
                <Sparkles className="w-4 h-4" />
                {rating}
              </span>
            </div>
            <p className="text-muted-foreground text-sm mt-1">{url}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryOverview({ results }: { results: AeoAnalysisResults }) {
  const categories = [
    {
      name: "Structured Data",
      icon: Database,
      color: "purple",
      score: results.structuredDataScore,
      metrics: [
        { label: "JSON-LD", value: results.structuredData.jsonLdPresent },
        { label: "FAQ Schema", value: results.structuredData.faqSchema },
        { label: "Organization Schema", value: results.structuredData.organizationSchema },
      ],
    },
    {
      name: "Content Format",
      icon: FileText,
      color: "blue",
      score: results.contentFormatScore,
      metrics: [
        { label: "Question Headings", value: results.contentFormat.hasQuestionHeadings },
        { label: "Direct Answers", value: results.contentFormat.directAnswerParagraphs > 0 },
        { label: "Lists/Tables", value: results.contentFormat.hasLists || results.contentFormat.hasTables },
      ],
    },
    {
      name: "Authority & E-E-A-T",
      icon: Shield,
      color: "amber",
      score: results.authorityScore,
      metrics: [
        { label: "Author Info", value: results.authority.hasAuthorInfo },
        { label: "Citations", value: results.authority.hasCitations },
        { label: "Date Published", value: results.authority.hasDatePublished },
      ],
    },
    {
      name: "Semantic Structure",
      icon: Code,
      color: "green",
      score: results.semanticScore,
      metrics: [
        { label: "Heading Hierarchy", value: results.semantic.headingHierarchyValid },
        { label: "Semantic HTML", value: results.semantic.usesSemanticHtml },
        { label: "Table of Contents", value: results.semantic.hasTableOfContents },
      ],
    },
    {
      name: "AI Accessibility",
      icon: Globe,
      color: "indigo",
      score: results.aiAccessibilityScore,
      metrics: [
        { label: "AI Crawlers", value: results.aiAccessibility.robotsTxtAllowsAi },
        { label: "Meta Description", value: results.aiAccessibility.hasMetaDescription },
        { label: "Canonical URL", value: results.aiAccessibility.hasCanonicalUrl },
      ],
    },
  ];

  const getIconBg = (c: string) => ({ purple: "bg-purple-100 dark:bg-purple-900", blue: "bg-blue-100 dark:bg-blue-900", amber: "bg-amber-100 dark:bg-amber-900", green: "bg-green-100 dark:bg-green-900", indigo: "bg-indigo-100 dark:bg-indigo-900" }[c] || "bg-gray-100");
  const getIconColor = (c: string) => ({ purple: "text-purple-600", blue: "text-blue-600", amber: "text-amber-600", green: "text-green-600", indigo: "text-indigo-600" }[c] || "text-gray-600");
  const getScoreColor = (score: number) => score >= 70 ? "text-green-600" : score >= 40 ? "text-yellow-600" : "text-red-600";

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {categories.map((cat) => {
        const Icon = cat.icon;
        return (
          <Card key={cat.name} className="rounded-xl border border-border shadow-sm p-5">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${getIconBg(cat.color)} rounded-lg flex items-center justify-center`}>
                    <Icon className={`w-5 h-5 ${getIconColor(cat.color)}`} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{cat.name}</h3>
                </div>
                <span className={`text-2xl font-bold ${getScoreColor(cat.score)}`}>{cat.score}</span>
              </div>
              <div className="space-y-2 mt-3">
                {cat.metrics.map((metric) => (
                  <div key={metric.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{metric.label}</span>
                    {metric.value ? (
                      <CheckCircle2 className="w-4 h-4 text-green-600" />
                    ) : (
                      <XCircle className="w-4 h-4 text-red-400" />
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === "PASS") return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle2 className="w-3 h-3" />Pass</span>;
  if (status === "FAIL") return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><XCircle className="w-3 h-3" />Fail</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><AlertTriangle className="w-3 h-3" />Warning</span>;
}

function TechnicalFixBlock({ technicalFix }: { technicalFix: string }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="mt-3 ml-7">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors"
        data-testid="technical-fix-toggle"
      >
        <Wrench className="w-4 h-4" />
        <span>Technical Fix Guide</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <div className="mt-3 rounded-lg border border-border bg-muted/50 p-4 animate-in slide-in-from-top-2 duration-200" data-testid="technical-fix-content">
          <div className="flex items-center gap-2 mb-3">
            <Code className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">Step-by-step instructions</span>
          </div>
          <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">{technicalFix}</pre>
        </div>
      )}
    </div>
  );
}

function ChecksDetail({ checks }: { checks: AeoCheck[] }) {
  const groupedChecks: Record<string, AeoCheck[]> = {};
  for (const check of checks) {
    const cat = check.category;
    if (!groupedChecks[cat]) groupedChecks[cat] = [];
    groupedChecks[cat].push(check);
  }

  const categoryLabels: Record<string, { label: string; icon: typeof Database }> = {
    "structured-data": { label: "Structured Data", icon: Database },
    "content-format": { label: "Content Format", icon: FileText },
    "authority": { label: "Authority & E-E-A-T", icon: Shield },
    "technical": { label: "Semantic Structure", icon: Code },
    "discoverability": { label: "AI Accessibility", icon: Globe },
  };

  return (
    <Card className="rounded-xl border border-border shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-2">Detailed Check Results</h3>
        <p className="text-sm text-muted-foreground mb-6">Click "Technical Fix Guide" on any failing check for step-by-step instructions with code examples</p>
        <div className="space-y-8">
          {Object.entries(groupedChecks).map(([category, catChecks]) => {
            const catInfo = categoryLabels[category] || { label: category, icon: Shield };
            const CatIcon = catInfo.icon;
            return (
              <div key={category}>
                <div className="flex items-center gap-2 mb-4">
                  <CatIcon className="w-5 h-5 text-primary" />
                  <h4 className="text-lg font-semibold text-foreground">{catInfo.label}</h4>
                </div>
                <div className="space-y-4">
                  {catChecks.map((check, idx) => (
                    <div key={idx} className={`rounded-lg border p-4 ${check.status === "FAIL" ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30" : check.status === "WARNING" ? "border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/30" : "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30"}`}>
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex items-center gap-2">
                          {check.status === "PASS" ? <CheckCircle2 className="w-5 h-5 text-green-600 flex-shrink-0" /> : check.status === "FAIL" ? <XCircle className="w-5 h-5 text-red-600 flex-shrink-0" /> : <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0" />}
                          <span className="font-semibold text-foreground">{check.name}</span>
                        </div>
                        <StatusBadge status={check.status} />
                      </div>
                      <p className="text-sm text-muted-foreground ml-7 mb-2">{check.details}</p>
                      <div className="ml-7 space-y-1">
                        <p className="text-sm"><span className="font-medium text-foreground">Impact:</span> <span className="text-muted-foreground">{check.impact}</span></p>
                        {check.status !== "PASS" && (
                          <p className="text-sm"><span className="font-medium text-foreground">Fix:</span> <span className="text-muted-foreground">{check.recommendation}</span></p>
                        )}
                      </div>
                      {check.status !== "PASS" && check.technicalFix && <TechnicalFixBlock technicalFix={check.technicalFix} />}
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function RecommendationsList({ recommendations }: { recommendations: AeoRecommendation[] }) {
  const priorityConfig: Record<string, { color: string; border: string }> = {
    Critical: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", border: "border-l-red-500" },
    High: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", border: "border-l-orange-500" },
    Medium: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", border: "border-l-yellow-500" },
    Low: { color: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", border: "border-l-green-500" },
  };

  return (
    <Card className="rounded-xl border border-border shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-6">Priority Recommendations</h3>
        <div className="space-y-4">
          {recommendations.map((rec, idx) => {
            const config = priorityConfig[rec.priority] || priorityConfig["Medium"];
            return (
              <div key={idx} className={`border-l-4 ${config.border} rounded-lg border border-border p-5`}>
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-base font-semibold text-foreground">{rec.title}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${config.color}`}>{rec.priority}</span>
                  {rec.category && (
                    <Badge variant="secondary" className="text-xs">{rec.category}</Badge>
                  )}
                </div>
                <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                <p className="text-sm text-muted-foreground mb-3 italic">{rec.impact}</p>
                {rec.actionItems.length > 0 && (
                  <ul className="space-y-1">
                    {rec.actionItems.map((item, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                        {item}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
