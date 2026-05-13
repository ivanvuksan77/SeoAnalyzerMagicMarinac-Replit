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
import { BotBlockedState, isFetchErrorCode } from "@/components/bot-blocked-state";
import { Badge } from "@/components/ui/badge";
import {
  Search,
  Loader2,
  Zap,
  Globe,
  Shield,
  Server,
  Smartphone,
  ArrowRight,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  Minus,
  Timer,
  HardDrive,
  LayoutGrid,
  User,
  ChevronDown,
  ChevronUp,
  Wrench,
  Code,
} from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useTranslation } from "react-i18next";
import { useSeo } from "@/lib/seo";
import type { AdsAnalysis, AdsCheck, AdsRecommendation, AdsAnalysisResults } from "@shared/schema";

const formSchema = z.object({
  url: z.string().url("Please enter a valid URL"),
});

export default function AdsAnalyzerPage() {
  const { t } = useTranslation();
  useSeo({ title: t("seo.ads.title"), description: t("seo.ads.description"), path: "/ads-analyzer" });
  const [analysis, setAnalysis] = useState<AdsAnalysis | null>(null);
  const { toast } = useToast();

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: "" },
  });

  const analyzeMutation = useMutation({
    mutationFn: async (data: { url: string }) => {
      const response = await apiRequest("POST", "/api/ads-analyze", data);
      return response.json();
    },
    onSuccess: (result: AdsAnalysis) => {
      toast({ title: "Analysis Complete", description: `Ads landing page analysis for ${result.url}` });
      setAnalysis(result);
    },
    onError: (error: any) => {
      if (isFetchErrorCode(error?.code)) return;
      toast({ title: "Analysis Failed", description: error.message || "Failed to analyze landing page", variant: "destructive" });
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
              <h1 className="text-2xl font-bold text-foreground">SiteSnap</h1>
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground">Scan. Snap. Fix What Matters.</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/master-analyzer" className="text-muted-foreground hover:text-foreground transition-colors">Master Analyzer</Link>
            <Link href="/" className="text-muted-foreground hover:text-foreground transition-colors">SiteSnap</Link>
            <Link href="/ads-analyzer" className="text-foreground font-medium transition-colors">Ads Landing Page</Link>
            <Link href="/aeo-analyzer" className="text-muted-foreground hover:text-foreground transition-colors">AEO / AI SEO</Link>
            <Link href="/site-tools" className="text-muted-foreground hover:text-foreground transition-colors">Site Tools</Link>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
              <User className="w-4 h-4 mr-2 inline" />Account
            </button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <Card className="rounded-xl border border-border shadow-sm p-8 mb-8">
          <CardContent className="p-0">
            <div className="max-w-2xl mx-auto text-center">
              <div className="inline-flex items-center gap-2 bg-orange-50 dark:bg-orange-950 text-orange-700 dark:text-orange-300 px-3 py-1 rounded-full text-sm font-medium mb-4">
                <Zap className="w-4 h-4" />
                Google Ads Focused
              </div>
              <h2 className="text-3xl font-bold text-foreground mb-4">Analyze Landing Page Experience</h2>
              <p className="text-muted-foreground mb-8">
                Evaluate your landing page for Google Ads Quality Score — not SEO. Measures delivery speed, caching, infrastructure, and mobile UX from a paid traffic perspective.
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
                                placeholder="https://your-landing-page.com"
                                {...field}
                                className="px-4 py-3 border border-input rounded-lg focus:ring-2 focus:ring-ring focus:border-ring"
                                data-testid="ads-input-url"
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
                      data-testid="ads-button-analyze"
                    >
                      {analyzeMutation.isPending ? (
                        <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Analyzing...</>
                      ) : (
                        <><Zap className="w-4 h-4 mr-2" />Analyze</>
                      )}
                    </Button>
                  </div>
                </form>
              </Form>

              {!analyzeMutation.isPending && analyzeMutation.isError && isFetchErrorCode((analyzeMutation.error as any)?.code) && (
                <div className="mt-6 max-w-lg mx-auto text-left">
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
                <span className="flex items-center"><Timer className="w-4 h-4 text-blue-500 mr-2" />TTFB Measurement</span>
                <span className="flex items-center"><Globe className="w-4 h-4 text-green-500 mr-2" />CDN Detection</span>
                <span className="flex items-center"><HardDrive className="w-4 h-4 text-purple-500 mr-2" />Cache Analysis</span>
                <span className="flex items-center"><Smartphone className="w-4 h-4 text-orange-500 mr-2" />Mobile UX</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {analysis && <AdsResults analysis={analysis} />}

        <footer className="bg-card border-t border-border mt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center space-x-3 mb-4 md:mb-0">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                  <Search className="text-primary-foreground w-3 h-3" />
                </div>
                <span className="text-muted-foreground">© 2024 SiteSnap. All rights reserved.</span>
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

function AdsResults({ analysis }: { analysis: AdsAnalysis }) {
  const results = analysis.results as AdsAnalysisResults;
  const recommendations = analysis.recommendations as AdsRecommendation[];

  return (
    <div className="animate-in slide-in-from-bottom-4 duration-500 space-y-8">
      <RatingCard rating={results.rating} score={results.score} url={analysis.url} qualityScoreImpact={results.qualityScoreImpact} cpcImpact={results.cpcImpact} />
      <CategoryOverview results={results} />
      <ChecksDetail checks={results.checks} />
      {recommendations.length > 0 && <RecommendationsList recommendations={recommendations} />}
      <ImpactExplainer rating={results.rating} qualityScoreImpact={results.qualityScoreImpact} cpcImpact={results.cpcImpact} />
    </div>
  );
}

function RatingCard({ rating, score, url, qualityScoreImpact, cpcImpact }: { rating: string; score: number; url: string; qualityScoreImpact: string; cpcImpact: string }) {
  const ratingConfig = {
    "Above average": { color: "text-green-600", bg: "bg-green-50 dark:bg-green-950", border: "border-green-200 dark:border-green-800", icon: TrendingUp, badgeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    "Average": { color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950", border: "border-yellow-200 dark:border-yellow-800", icon: Minus, badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    "Below average": { color: "text-red-600", bg: "bg-red-50 dark:bg-red-950", border: "border-red-200 dark:border-red-800", icon: TrendingDown, badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  };

  const config = ratingConfig[rating as keyof typeof ratingConfig] || ratingConfig["Average"];
  const RatingIcon = config.icon;

  return (
    <Card className={`rounded-xl border-2 ${config.border} shadow-sm p-6`}>
      <CardContent className="p-0">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="flex items-center space-x-6">
            <div className={`w-20 h-20 ${config.bg} rounded-2xl flex items-center justify-center`}>
              <span className={`text-3xl font-bold ${config.color}`} data-testid="ads-score">{score}</span>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-2xl font-bold text-foreground">Landing Page Experience</h3>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${config.badgeClass}`} data-testid="ads-rating">
                  <RatingIcon className="w-4 h-4" />
                  {rating}
                </span>
              </div>
              <p className="text-muted-foreground text-sm mt-1" data-testid="ads-analyzed-url">{url}</p>
              <p className="text-muted-foreground text-sm mt-2 max-w-lg">{qualityScoreImpact.split(".")[0]}.</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function CategoryOverview({ results }: { results: AdsAnalysisResults }) {
  const categories = [
    {
      name: "Server Speed",
      icon: Timer,
      color: "blue",
      status: results.ttfb.penalized ? "FAIL" : results.ttfb.cleanUrl > 400 ? "WARNING" : "PASS",
      detail: `${results.ttfb.cleanUrl}ms clean / ${results.ttfb.withAdsParams}ms with ads params`,
    },
    {
      name: "CDN & Delivery",
      icon: Globe,
      color: "green",
      status: results.cdn.detected && results.cdn.edgeCaching ? "PASS" : results.cdn.detected ? "WARNING" : "FAIL",
      detail: results.cdn.detected ? `${results.cdn.provider}${results.cdn.edgeCaching ? " (edge caching active)" : ""}` : "No CDN detected",
    },
    {
      name: "Cache Health",
      icon: HardDrive,
      color: "purple",
      status: results.cache.fragmented ? "FAIL" : "PASS",
      detail: results.cache.fragmented ? "Cache fragmentation detected" : "Cache handling is healthy",
    },
    {
      name: "Redirect Chain",
      icon: ArrowRight,
      color: "orange",
      status: results.redirects.hops === 0 ? "PASS" : results.redirects.hops === 1 ? "WARNING" : "FAIL",
      detail: results.redirects.hops === 0 ? "Direct delivery" : `${results.redirects.hops} redirect(s) — ${results.redirects.totalLatency}ms added`,
    },
    {
      name: "Hosting",
      icon: Server,
      color: "red",
      status: results.hosting.isLikelyShared ? "FAIL" : results.hosting.coldCacheRisk ? "WARNING" : "PASS",
      detail: results.hosting.isLikelyShared ? "Shared hosting detected" : results.hosting.serverSignature || "Hosting OK",
    },
    {
      name: "Mobile UX",
      icon: Smartphone,
      color: "indigo",
      status: results.mobileUx.ctaVisibleAboveFold && results.mobileUx.keywordInAboveFold ? "PASS"
        : !results.mobileUx.ctaVisibleAboveFold && !results.mobileUx.keywordInAboveFold ? "FAIL" : "WARNING",
      detail: `${results.mobileUx.keywordInAboveFold ? "Keywords match" : "No keyword match"} • ${results.mobileUx.ctaVisibleAboveFold ? "CTA visible" : "CTA not visible"}`,
    },
  ];

  const getIconBg = (c: string) => ({ blue: "bg-blue-100 dark:bg-blue-900", green: "bg-green-100 dark:bg-green-900", purple: "bg-purple-100 dark:bg-purple-900", orange: "bg-orange-100 dark:bg-orange-900", red: "bg-red-100 dark:bg-red-900", indigo: "bg-indigo-100 dark:bg-indigo-900" }[c] || "bg-gray-100");
  const getIconColor = (c: string) => ({ blue: "text-blue-600", green: "text-green-600", purple: "text-purple-600", orange: "text-orange-600", red: "text-red-600", indigo: "text-indigo-600" }[c] || "text-gray-600");

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
                <StatusBadge status={cat.status} />
              </div>
              <p className="text-sm text-muted-foreground">{cat.detail}</p>
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

function ChecksDetail({ checks }: { checks: AdsCheck[] }) {
  const groupedChecks: Record<string, AdsCheck[]> = {};
  for (const check of checks) {
    const cat = check.category;
    if (!groupedChecks[cat]) groupedChecks[cat] = [];
    groupedChecks[cat].push(check);
  }

  const categoryLabels: Record<string, { label: string; icon: typeof Timer }> = {
    performance: { label: "Performance & Speed", icon: Timer },
    delivery: { label: "Delivery & Infrastructure", icon: Globe },
    caching: { label: "Caching & Fragmentation", icon: HardDrive },
    ux: { label: "Mobile UX & Relevance", icon: Smartphone },
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
                        <Badge variant={check.fixType === "infrastructure" ? "default" : "secondary"} className="text-xs ml-2 flex-shrink-0">
                          {check.fixType === "infrastructure" ? "Infrastructure" : "Page-level"}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground ml-7 mb-2">{check.details}</p>
                      <div className="ml-7 space-y-1">
                        <p className="text-sm"><span className="font-medium text-foreground">Impact:</span> <span className="text-muted-foreground">{check.impact}</span></p>
                        {check.status !== "PASS" && (
                          <p className="text-sm"><span className="font-medium text-foreground">Fix:</span> <span className="text-muted-foreground">{check.recommendation}</span></p>
                        )}
                      </div>
                      {check.technicalFix && <TechnicalFixBlock technicalFix={check.technicalFix} />}
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

function RecommendationsList({ recommendations }: { recommendations: AdsRecommendation[] }) {
  const priorityConfig: Record<string, { color: string; border: string }> = {
    Critical: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", border: "border-l-red-500" },
    High: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", border: "border-l-orange-500" },
    Medium: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", border: "border-l-yellow-500" },
    Low: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", border: "border-l-blue-500" },
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
                  <Badge variant={rec.fixType === "infrastructure" ? "default" : "secondary"} className="text-xs">
                    {rec.fixType === "infrastructure" ? "Infrastructure" : "Page-level"}
                  </Badge>
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

function ImpactExplainer({ rating, qualityScoreImpact, cpcImpact }: { rating: string; qualityScoreImpact: string; cpcImpact: string }) {
  return (
    <Card className="rounded-xl border border-border shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-6">Impact on Google Ads</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <LayoutGrid className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-foreground">Quality Score Impact</h4>
            </div>
            <p className="text-sm text-muted-foreground">{qualityScoreImpact}</p>
          </div>
          <div className="rounded-lg border border-border p-5">
            <div className="flex items-center gap-2 mb-3">
              <TrendingDown className="w-5 h-5 text-primary" />
              <h4 className="font-semibold text-foreground">CPC & Cost Impact</h4>
            </div>
            <p className="text-sm text-muted-foreground">{cpcImpact}</p>
          </div>
        </div>
        <div className="mt-6 p-4 bg-muted rounded-lg">
          <p className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">Important:</span> This analysis focuses exclusively on Landing Page Experience — one of three components of Google Ads Quality Score (alongside Expected CTR and Ad Relevance). Landing Page Experience is treated as a performance + intent + delivery problem, not an SEO ranking factor. Backlink analysis, keyword density, and organic ranking signals are intentionally excluded.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
