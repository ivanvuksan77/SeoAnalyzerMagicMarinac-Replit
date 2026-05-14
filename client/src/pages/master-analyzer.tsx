import { useState, useEffect, useCallback, useRef, useMemo } from "react";
import { useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useTranslation } from "react-i18next";
import { Link, useLocation } from "wouter";
import { HeroSection } from "@/components/hero-section";
import { UspSection } from "@/components/usp-section";
import { UpgradeCta } from "@/components/upgrade-cta";
import { ComparisonTable } from "@/components/comparison-table";
import { FaqSection } from "@/components/faq-section";
import { BotBlockedState, CompareBlockedBadge, isFetchErrorCode } from "@/components/bot-blocked-state";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  Search,
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  ArrowRight,
  Zap,
  Globe,
  Brain,
  LinkIcon,
  ImageIcon,
  Network,
  FileText,
  Shield,
  Target,
  Bot,
  Map,
  Trophy,
  Download,
  Timer,
  Server,
  Smartphone,
  HardDrive,
  LayoutGrid,
  TrendingDown,
  TrendingUp,
  Minus,
  Wrench,
  Code,
  Database,
  Sparkles,
  Copy,
  Check,
  Eye,
  HelpCircle,
  BarChart3,
  ExternalLink,
  Users,
  Atom,
  Mail,
  Lock,
  Crown,
  CreditCard,
  Star,
  KeyRound,
  TicketCheck,
  Sun,
  Moon,
  Monitor,
  Gauge,
  Link2,
  Languages,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest } from "@/lib/queryClient";
import { useSeo } from "@/lib/seo";
import { useToast } from "@/hooks/use-toast";
import type {
  SeoAnalysis,
  AnalysisResults,
  PerformanceMetrics,
  AccessibilityCheck,
  KeywordAnalysis,
  ContentQuality,
  AdsAnalysisResults,
  AdsCheck,
  AdsRecommendation,
  AeoAnalysisResults,
  AeoCheck,
  AeoRecommendation,
  SchemaSuggestion,
  AiSearchPreview,
  ContentGapsAnalysis,
  CitationLikelihood,
  BrokenLinksResult,
  BrokenLink,
  ImageOptimizationResult,
  ImageIssue,
  InternalLinkingResult,
  SitemapValidatorResult,
  AeoComparisonResult,
  SeoComparisonResult,
  AdsComparisonResult,
  CruxFieldData,
  AdRelevanceResult,
  AdRelevanceTermResult,
  GeoAnalysisResults,
  GeoCheck,
  GeoComparisonResult,
} from "@shared/schema";

function createFormSchema(urlRequired: string) {
  return z.object({
    url: z.string().min(1, urlRequired).transform((val) => {
      const trimmed = val.trim();
      if (!trimmed.match(/^https?:\/\//i)) {
        return `https://${trimmed}`;
      }
      return trimmed;
    }),
  });
}
type FormSchema = ReturnType<typeof createFormSchema>;

interface MasterResult {
  url: string;
  sessionId?: string;
  remaining?: number;
  seo: { data: SeoAnalysis | null; error: string | null };
  ads: { data: any | null; error: string | null };
  aeo: { data: any | null; error: string | null };
  geo: { data: any | null; error: string | null };
  brokenLinks: { data: BrokenLinksResult | null; error: string | null };
  imageOptimization: { data: ImageOptimizationResult | null; error: string | null };
  internalLinking: { data: InternalLinkingResult | null; error: string | null };
  sitemapValidator: { data: SitemapValidatorResult | null; error: string | null };
}

function ScoreCircle({ score, label, color }: { score: number; label: string; color: string }) {
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (score / 100) * circumference;
  return (
    <div className="flex flex-col items-center min-w-[80px]">
      <div className="relative w-20 h-20">
        <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
          <circle cx="40" cy="40" r="36" fill="none" stroke={color} strokeWidth="6" strokeDasharray={circumference} strokeDashoffset={offset} strokeLinecap="round" className="transition-all duration-700 ease-out" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-lg font-bold">{score}</span>
        </div>
      </div>
      <div className="w-14 h-1.5 rounded-full bg-muted/30 mt-2 overflow-hidden">
        <div className="h-full rounded-full transition-all duration-700 ease-out" style={{ width: `${score}%`, backgroundColor: color }} />
      </div>
      <span className="text-xs text-muted-foreground mt-1 text-center">{label}</span>
    </div>
  );
}

function OverallDashboard({ data, onDownloadPdf, sessionId, paidTier, emailCaptured }: { data: MasterResult; onDownloadPdf: (tier?: 'free' | 'basic' | 'pro') => void; sessionId?: string; paidTier: string; emailCaptured: boolean }) {
  const { t } = useTranslation();
  const scores: { label: string; score: number; icon: any; color: string }[] = [];

  if (data.seo.data) scores.push({ label: t('master.labels.seo'), score: data.seo.data.overallScore, icon: Search, color: "#3b82f6" });
  if (data.ads.data) {
    const adsResults = data.ads.data.results as AdsAnalysisResults;
    scores.push({ label: t('master.labels.adsLp'), score: adsResults.score, icon: Zap, color: "#f59e0b" });
  }
  if (data.aeo.data) {
    const aeoResults = data.aeo.data.results as AeoAnalysisResults;
    scores.push({ label: t('master.labels.aeo'), score: aeoResults.score, icon: Brain, color: "#8b5cf6" });
  }
  if (data.geo.data) {
    const geoResults = data.geo.data.results as GeoAnalysisResults;
    scores.push({ label: t('master.labels.geo'), score: geoResults.score, icon: Atom, color: "#14b8a6" });
  }
  if (data.brokenLinks.data) scores.push({ label: t('master.labels.links'), score: data.brokenLinks.data.score, icon: LinkIcon, color: "#ef4444" });
  if (data.imageOptimization.data) scores.push({ label: t('master.labels.images'), score: data.imageOptimization.data.score, icon: ImageIcon, color: "#10b981" });
  if (data.internalLinking.data) scores.push({ label: t('master.labels.internalLinksShort'), score: data.internalLinking.data.score, icon: Network, color: "#06b6d4" });
  if (data.sitemapValidator.data) scores.push({ label: t('master.labels.sitemap'), score: data.sitemapValidator.data.score, icon: FileText, color: "#ec4899" });

  const avgScore = scores.length > 0 ? Math.round(scores.reduce((s, x) => s + x.score, 0) / scores.length) : 0;
  const overallColor = avgScore >= 80 ? "#10b981" : avgScore >= 50 ? "#f59e0b" : "#ef4444";
  const overallLabel = avgScore >= 80 ? t('dashboard.excellent') : avgScore >= 60 ? t('dashboard.good') : avgScore >= 40 ? t('dashboard.needsWork') : t('dashboard.critical');
  const isFreeTier = paidTier === 'free';
  const isBasicTier = paidTier === 'basic';
  const isProTier = paidTier === 'pro';
  const showFreePlan = isFreeTier;
  const showBasicPlan = !isProTier;
  const plansGridClass = isFreeTier
    ? "grid grid-cols-1 lg:grid-cols-3 gap-3"
    : isProTier
    ? "grid grid-cols-1 max-w-xs mx-auto gap-3"
    : "grid grid-cols-1 lg:grid-cols-2 gap-3";

  return (
    <Card className="mb-8" data-testid="master-overview">
      <CardContent className="pt-6">
        <div className="flex flex-col md:flex-row items-center gap-8">
          <div className="flex flex-col items-center">
            <div className="relative w-28 h-28">
              <svg className="w-28 h-28 -rotate-90" viewBox="0 0 80 80">
                <circle cx="40" cy="40" r="36" fill="none" stroke="currentColor" strokeWidth="6" className="text-muted/20" />
                <circle cx="40" cy="40" r="36" fill="none" stroke={overallColor} strokeWidth="6" strokeDasharray={2 * Math.PI * 36} strokeDashoffset={2 * Math.PI * 36 - (avgScore / 100) * 2 * Math.PI * 36} strokeLinecap="round" />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-2xl font-bold">{avgScore}</span>
                <span className="text-[10px] text-muted-foreground">{t('dashboard.overall')}</span>
              </div>
            </div>
            <Badge className="mt-2" style={{ backgroundColor: overallColor, color: "white" }}>{overallLabel}</Badge>
          </div>
          <div className="flex-1">
            <div className="flex flex-wrap justify-center gap-4">
              {scores.map((s) => (
                <ScoreCircle key={s.label} score={s.score} label={s.label} color={s.color} />
              ))}
            </div>
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <p className="text-sm text-muted-foreground text-center">
            {t('dashboard.comprehensiveAnalysis', { url: data.url, count: scores.length }).split(data.url).map((part, i, arr) => i < arr.length - 1 ? <span key={i}>{part}<span className="font-medium text-foreground">{data.url}</span></span> : part)}
          </p>
          <div className={plansGridClass}>
            {showFreePlan && (
            <Card className="border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-950/30">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold text-green-600">{t('dashboard.free')}</div>
                <p className="text-xs text-muted-foreground mt-1">{t('dashboard.freeDesc')}</p>
                <Button onClick={() => onDownloadPdf('free')} size="sm" variant="outline" className="mt-3 w-full border-green-300 dark:border-green-700 text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 hover:text-green-800 dark:hover:text-green-200">
                  <Mail className="w-4 h-4 mr-1" />
                  {t('dashboard.getFreeReport')}
                </Button>
              </CardContent>
            </Card>
            )}
            {showBasicPlan && (
            <Card className="border-blue-200 dark:border-blue-800 bg-blue-50 dark:bg-blue-950/30">
              <CardContent className="p-4 text-center">
                <div className="text-lg font-bold text-blue-600">{t('dashboard.basicPrice')}</div>
                <p className="text-xs text-muted-foreground mt-1">{t('dashboard.basicDesc')}</p>
                <p className="text-[10px] text-blue-600/70 dark:text-blue-400/70 mt-0.5 font-medium">{t('dashboard.basicCredits')}</p>
                <Button onClick={() => onDownloadPdf('basic')} size="sm" className="mt-3 w-full bg-blue-600 hover:bg-blue-700">
                  {isBasicTier && emailCaptured ? <Download className="w-4 h-4 mr-1" /> : <CreditCard className="w-4 h-4 mr-1" />}
                  {t('dashboard.basicReport')}
                </Button>
              </CardContent>
            </Card>
            )}
            <Card className="border-purple-200 dark:border-purple-800 bg-purple-50 dark:bg-purple-950/30 ring-2 ring-purple-400">
              <CardContent className="p-4 text-center">
                <div className="flex items-center justify-center gap-1">
                  <Crown className="w-4 h-4 text-purple-500" />
                  <div className="text-lg font-bold text-purple-600">{t('dashboard.proPrice')}</div>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{t('dashboard.proDesc')}</p>
                <p className="text-[10px] text-purple-600/70 dark:text-purple-400/70 mt-0.5 font-medium">{t('dashboard.proCredits')}</p>
                <Button onClick={() => onDownloadPdf('pro')} size="sm" className="mt-3 w-full bg-purple-600 hover:bg-purple-700">
                  {isProTier && emailCaptured ? <Download className="w-4 h-4 mr-1" /> : <Star className="w-4 h-4 mr-1" />}
                  {t('dashboard.proReport')}
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function SectionCard({ title, icon: Icon, score, error, defaultOpen, summaryContent, children, testId, color }: {
  title: string; icon: any; score: number | null; error: string | null; defaultOpen?: boolean; summaryContent?: React.ReactNode; children: React.ReactNode; testId: string; color: string;
}) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(defaultOpen ?? false);

  if (error) {
    return (
      <Card className="mb-4 opacity-70">
        <CardHeader className="cursor-pointer" onClick={() => setOpen(!open)}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
                <Icon className="w-4 h-4" style={{ color }} />
              </div>
              <CardTitle className="text-lg">{title}</CardTitle>
              <Badge variant="destructive">{t('sections.failed')}</Badge>
            </div>
            <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
              {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </Button>
          </div>
        </CardHeader>
        {open && (
          <CardContent>
            <p className="text-sm text-muted-foreground">{error}</p>
          </CardContent>
        )}
      </Card>
    );
  }

  return (
    <Card className="mb-4" data-testid={testId}>
      <CardHeader className="cursor-pointer" onClick={() => setOpen(!open)}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: color + "20" }}>
              <Icon className="w-4 h-4" style={{ color }} />
            </div>
            <CardTitle className="text-lg">{title}</CardTitle>
            {score !== null && <ScoreBadge score={score} />}
          </div>
          <Button variant="ghost" size="sm" onClick={(e) => { e.stopPropagation(); setOpen(!open); }}>
            {open ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </Button>
        </div>
      </CardHeader>
      {summaryContent && <CardContent className="pt-0">{summaryContent}</CardContent>}
      <CardContent className={summaryContent ? "pt-0" : ""}>
        {!open ? (
          <Button size="sm" onClick={() => setOpen(true)} className="w-full gap-2 bg-primary text-primary-foreground hover:bg-primary/90 shadow-sm font-semibold" data-testid="button-more-details">
            <ChevronDown className="w-4 h-4" />
            {t('sections.moreDetails')}
          </Button>
        ) : (
          <div className="space-y-4">
            {children}
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="w-full gap-2 text-muted-foreground hover:text-foreground">
              <ChevronUp className="w-4 h-4" />
              {t('sections.showLess')}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function ScoreBadge({ score }: { score: number }) {
  const color = score >= 80 ? "bg-green-500" : score >= 50 ? "bg-yellow-500" : "bg-red-500";
  return <Badge className={`${color} text-white`}>{score}/100</Badge>;
}

function StatusBadge({ status }: { status: string }) {
  const { t } = useTranslation();
  if (status === "PASS") return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"><CheckCircle2 className="w-3 h-3" />{t('common.pass')}</span>;
  if (status === "FAIL") return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200"><XCircle className="w-3 h-3" />{t('common.fail')}</span>;
  return <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"><AlertTriangle className="w-3 h-3" />{t('common.warning')}</span>;
}

function StatusIcon({ pass }: { pass: boolean }) {
  return pass ? <CheckCircle2 className="w-4 h-4 text-green-500" /> : <XCircle className="w-4 h-4 text-red-500" />;
}

function StatusIconTri({ status }: { status: "pass" | "fail" | "warning" }) {
  if (status === "pass") return <CheckCircle2 className="w-4 h-4 text-green-500" />;
  if (status === "fail") return <XCircle className="w-4 h-4 text-red-500" />;
  return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
}

function TechnicalFixBlock({ technicalFix }: { technicalFix: string }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  return (
    <div className="mt-3 ml-7">
      <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors" data-testid="technical-fix-toggle">
        <Wrench className="w-4 h-4" />
        <span>{t('common.technicalFixGuide')}</span>
        {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {expanded && (
        <div className="mt-3 rounded-lg border border-border bg-muted/50 p-4 animate-in slide-in-from-top-2 duration-200" data-testid="technical-fix-content">
          <div className="flex items-center gap-2 mb-3">
            <Code className="w-4 h-4 text-muted-foreground" />
            <span className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('common.stepByStep')}</span>
          </div>
          <pre className="text-sm text-foreground whitespace-pre-wrap font-mono leading-relaxed overflow-x-auto">{technicalFix}</pre>
        </div>
      )}
    </div>
  );
}

function MetricBar({ label, value, total }: { label: string; value: number; total: number }) {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex justify-between text-sm mb-1">
        <span>{label}</span>
        <span className="text-muted-foreground">{value}/{total} ({pct}%)</span>
      </div>
      <Progress value={pct} className="h-2" />
    </div>
  );
}

function LockedOverlay({ onUpgrade }: { onUpgrade: (tier: 'basic' | 'pro') => void }) {
  const { t } = useTranslation();
  return (
    <div className="relative">
      <div className="absolute inset-0 bg-background/80 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-lg">
        <Lock className="w-8 h-8 text-muted-foreground mb-3" />
        <p className="text-sm font-medium text-foreground mb-1">{t('locked.title')}</p>
        <p className="text-xs text-muted-foreground mb-3 text-center max-w-xs">{t('locked.description')}</p>
        <div className="flex gap-2">
          <Button size="sm" onClick={() => onUpgrade('basic')} className="bg-blue-600 hover:bg-blue-700">
            <CreditCard className="w-3 h-3 mr-1" />{t('locked.basic')}
          </Button>
          <Button size="sm" onClick={() => onUpgrade('pro')} className="bg-purple-600 hover:bg-purple-700">
            <Crown className="w-3 h-3 mr-1" />{t('locked.pro')}
          </Button>
        </div>
        <p className="text-[10px] text-muted-foreground mt-2">{t('locked.credits')}</p>
      </div>
      <div className="opacity-20 pointer-events-none select-none" aria-hidden="true">
        <div className="h-48 bg-muted/30 rounded-lg" />
      </div>
    </div>
  );
}

function FreeKeyFindings({ items, onUpgrade }: { items: { name: string; impact: string; status: string }[]; onUpgrade: (tier: 'basic' | 'pro') => void }) {
  const { t } = useTranslation();
  const keyItems = items.filter(i => i.status === 'FAIL' || i.status === 'fail' || i.status === 'error' || i.status === 'WARNING' || i.status === 'warning').slice(0, 5);
  if (keyItems.length === 0) {
    return (
      <div className="space-y-4">
        <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
          <CheckCircle2 className="w-5 h-5 text-green-600" />
          <span className="text-sm text-green-800 dark:text-green-200">{t('freeFindings.noIssues')}</span>
        </div>
        <LockedOverlay onUpgrade={onUpgrade} />
      </div>
    );
  }
  const totalIssues = items.filter(i => i.status === 'FAIL' || i.status === 'fail' || i.status === 'error' || i.status === 'WARNING' || i.status === 'warning').length;
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 mb-2">
        <AlertTriangle className="w-5 h-5 text-yellow-500" />
        <h4 className="font-semibold">{t('freeFindings.keyFindings')}</h4>
        <Badge variant="outline" className="text-xs">{t('freeFindings.issuesFound', { count: totalIssues })}</Badge>
      </div>
      {keyItems.slice(0, 3).map((item, i) => (
        <div key={i} className={`rounded-lg border p-4 ${item.status === 'FAIL' || item.status === 'fail' || item.status === 'error' ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30' : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/30'}`}>
          <div className="flex items-center gap-2 mb-1">
            {item.status === 'FAIL' || item.status === 'fail' || item.status === 'error' ? <XCircle className="w-4 h-4 text-red-500" /> : <AlertTriangle className="w-4 h-4 text-yellow-500" />}
            <span className="font-medium text-sm">{item.name}</span>
          </div>
          {item.impact && <p className="text-sm text-muted-foreground ml-6">{item.impact}</p>}
        </div>
      ))}
      {keyItems[3] && (
        <div className="relative overflow-hidden">
          <div className="opacity-50" style={{ maskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)', WebkitMaskImage: 'linear-gradient(to bottom, black 30%, transparent 100%)' }}>
            <div className={`rounded-lg border p-4 ${keyItems[3].status === 'FAIL' || keyItems[3].status === 'fail' || keyItems[3].status === 'error' ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30' : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/30'}`}>
              <div className="flex items-center gap-2 mb-1">
                {keyItems[3].status === 'FAIL' || keyItems[3].status === 'fail' || keyItems[3].status === 'error' ? <XCircle className="w-4 h-4 text-red-500" /> : <AlertTriangle className="w-4 h-4 text-yellow-500" />}
                <span className="font-medium text-sm">{keyItems[3].name}</span>
              </div>
              {keyItems[3].impact && <p className="text-sm text-muted-foreground ml-6">{keyItems[3].impact}</p>}
            </div>
          </div>
        </div>
      )}
      {keyItems[4] && (
        <div className="opacity-20 blur-[2px] pointer-events-none select-none">
          <div className={`rounded-lg border p-4 ${keyItems[4].status === 'FAIL' || keyItems[4].status === 'fail' || keyItems[4].status === 'error' ? 'border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30' : 'border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/30'}`}>
            <div className="flex items-center gap-2 mb-1">
              {keyItems[4].status === 'FAIL' || keyItems[4].status === 'fail' || keyItems[4].status === 'error' ? <XCircle className="w-4 h-4 text-red-500" /> : <AlertTriangle className="w-4 h-4 text-yellow-500" />}
              <span className="font-medium text-sm">{keyItems[4].name}</span>
            </div>
            {keyItems[4].impact && <p className="text-sm text-muted-foreground ml-6">{keyItems[4].impact}</p>}
          </div>
        </div>
      )}
      {totalIssues > 3 && (
        <p className="text-xs text-muted-foreground text-center">{t('freeFindings.moreHidden', { count: totalIssues - 3 })}</p>
      )}
      <LockedOverlay onUpgrade={onUpgrade} />
    </div>
  );
}

function SeoSummary({ data }: { data: SeoAnalysis }) {
  const { t } = useTranslation();
  const results = data.results as AnalysisResults;
  const checks = results.technical;
  const accessibilityChecks = results.accessibility || [];
  const allChecks = [
    ...checks,
    ...accessibilityChecks.map(c => ({ ...c, priority: "Medium" as const, category: "Accessibility", action: undefined })),
  ];
  const passCount = allChecks.filter(c => c.status === "PASS").length;
  const failCount = allChecks.filter(c => c.status === "FAIL").length;
  const warnCount = allChecks.filter(c => c.status === "WARNING").length;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4">
        <ProgressRing value={data.overallScore} size={80} strokeWidth={8} />
        <div>
          <h3 className="text-xl font-bold">{t('seo.overallScore')}</h3>
          <p className="text-sm text-muted-foreground">{data.url}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: t('seo.technical'), score: data.technicalScore, icon: Server, color: "#3b82f6" },
          { label: t('seo.performance'), score: data.performanceScore, icon: Zap, color: "#f59e0b" },
          { label: t('seo.accessibility'), score: data.accessibilityScore, icon: Eye, color: "#10b981" },
          { label: t('seo.keywords'), score: data.keywordScore, icon: Search, color: "#8b5cf6" },
          { label: t('seo.content'), score: data.contentScore, icon: FileText, color: "#ec4899" },
        ].map((cat) => {
          const CatIcon = cat.icon;
          return (
            <Card key={cat.label} className="text-center p-4">
              <div className="flex justify-center mb-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + "20" }}>
                  <CatIcon className="w-5 h-5" style={{ color: cat.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold" style={{ color: cat.color }}>{cat.score}</div>
              <div className="text-xs text-muted-foreground mt-1">{cat.label}</div>
              <Progress value={cat.score} className="mt-2 h-1.5" />
            </Card>
          );
        })}
      </div>

      <div className="flex gap-3">
        <Badge variant="outline" className="text-green-600">{passCount} {t('seo.passed')}</Badge>
        <Badge variant="outline" className="text-red-600">{failCount} {t('seo.failed')}</Badge>
        <Badge variant="outline" className="text-yellow-600">{warnCount} {t('seo.warnings')}</Badge>
      </div>

      {(() => {
        const failCount = checks.filter(c => c.status === "FAIL").length;
        const warnCount = checks.filter(c => c.status === "WARNING").length;
        if (failCount + warnCount === 0) return null;
        const trafficBoostLow = Math.min(Math.round((failCount * 5 + warnCount * 2) * 1.5), 80);
        const trafficBoostHigh = Math.min(Math.round(trafficBoostLow * 1.6), 120);
        const monthlyValue = Math.round(trafficBoostLow * 12);
        const monthlyValueHigh = Math.round(trafficBoostHigh * 12);
        return (
          <Card className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-xl flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    {t('seo.trafficPotential')}
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-[10px]">{t('seo.basedOnIssues', { count: failCount + warnCount })}</Badge>
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('seo.trafficImprovement', { low: trafficBoostLow, high: trafficBoostHigh })}
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="bg-white dark:bg-emerald-950 rounded-lg px-4 py-2 border border-emerald-200 dark:border-emerald-800">
                      <p className="text-xs text-muted-foreground">{t('seo.monthlyTraffic')}</p>
                      <p className="text-lg font-bold text-emerald-600">€{monthlyValue}–€{monthlyValueHigh}</p>
                      <p className="text-[10px] text-muted-foreground">{t('seo.basedOnAvg')}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">{t('seo.disclaimer')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

function SeoSection({ data, url, paidTier, onUpgrade }: { data: SeoAnalysis; url: string; paidTier: string; onUpgrade: (tier: 'basic' | 'pro') => void }) {
  const { t } = useTranslation();
  const results = data.results as AnalysisResults;
  const checks = results.technical;
  const performance = results.performance;
  const accessibilityChecks = results.accessibility || [];
  const keywords = results.keyword;
  const content = results.content;

  return (
    <div className="space-y-6">
      {paidTier === 'free' ? (
        <FreeKeyFindings
          items={[
            ...checks.map(c => ({ name: c.name, impact: c.action || c.details || '', status: c.status })),
            ...accessibilityChecks.map(c => ({ name: c.name, impact: c.details, status: c.status })),
          ]}
          onUpgrade={onUpgrade}
        />
      ) : (
        <Tabs defaultValue="technical" className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="technical">{t('seo.technical')}</TabsTrigger>
            <TabsTrigger value="performance">{t('seo.performance')}</TabsTrigger>
            <TabsTrigger value="accessibility">{t('seo.accessibility')}</TabsTrigger>
            <TabsTrigger value="keywords">{t('seo.keywords')}</TabsTrigger>
            <TabsTrigger value="content">{t('seo.content')}</TabsTrigger>
            <TabsTrigger value="compare">{t('tabs.compare')}</TabsTrigger>
          </TabsList>

          <TabsContent value="technical">
            <div className="space-y-3">
              {checks.map((check, idx) => (
                <div key={idx} className={`rounded-lg border p-4 ${check.status === "FAIL" ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30" : check.status === "WARNING" ? "border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/30" : "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30"}`}>
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      {check.status === "PASS" ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : check.status === "FAIL" ? <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                      <span className="font-medium text-foreground text-sm">{check.name}</span>
                    </div>
                    <StatusBadge status={check.status} />
                  </div>
                  <p className="text-sm text-muted-foreground ml-6">{check.details}</p>
                  {paidTier === 'pro' && check.action && check.status !== "PASS" && (
                    <p className="text-sm ml-6 mt-1"><span className="font-medium text-foreground">{t('common.fix')}</span> <span className="text-muted-foreground">{check.action}</span></p>
                  )}
                </div>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="performance">
            <SeoPerformanceTab performance={performance} paidTier={paidTier} />
          </TabsContent>

          <TabsContent value="accessibility">
            <SeoAccessibilityTab checks={accessibilityChecks} paidTier={paidTier} />
          </TabsContent>

          <TabsContent value="keywords">
            <SeoKeywordsTab keywords={keywords} paidTier={paidTier} />
          </TabsContent>

          <TabsContent value="content">
            <SeoContentTab content={content} paidTier={paidTier} />
          </TabsContent>

          <TabsContent value="compare">
            <SeoCompareTab url={url} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function SeoPerformanceTab({ performance, paidTier }: { performance: PerformanceMetrics; paidTier: string }) {
  const { t } = useTranslation();
  if (!performance) return <p className="text-sm text-muted-foreground p-4">{t('performance.notAvailable')}</p>;

  const lcpStatus = performance.coreWebVitals.lcp <= 2.5 ? "PASS" : performance.coreWebVitals.lcp <= 4 ? "WARNING" : "FAIL";
  const fidStatus = performance.coreWebVitals.fid <= 0.1 ? "PASS" : performance.coreWebVitals.fid <= 0.3 ? "WARNING" : "FAIL";
  const clsStatus = performance.coreWebVitals.cls <= 0.1 ? "PASS" : performance.coreWebVitals.cls <= 0.25 ? "WARNING" : "FAIL";

  const metrics = [
    { label: t('performance.lcp'), value: `${performance.coreWebVitals.lcp}s`, status: lcpStatus, target: "< 2.5s", description: t('performance.lcpDesc') },
    { label: t('performance.fid'), value: `${performance.coreWebVitals.fid * 1000}ms`, status: fidStatus, target: "< 100ms", description: t('performance.fidDesc') },
    { label: t('performance.cls'), value: performance.coreWebVitals.cls.toString(), status: clsStatus, target: "< 0.1", description: t('performance.clsDesc') },
  ];

  const scores = [
    { label: t('performance.desktopScore'), value: performance.pagespeed.desktop, icon: Monitor },
    { label: t('performance.mobileScore'), value: performance.pagespeed.mobile, icon: Smartphone },
    { label: t('performance.mobileUsability'), value: performance.mobileScore, icon: Smartphone },
    { label: t('performance.lighthouseScore'), value: Math.round(performance.lighthouseScore), icon: Gauge },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Gauge className="w-4 h-4 text-primary" /> {t('performance.coreWebVitals')}</h4>
        <div className="space-y-3">
          {metrics.map((m, i) => (
            <div key={i} className={`rounded-lg border p-4 ${m.status === "PASS" ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30" : m.status === "WARNING" ? "border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/30" : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30"}`}>
              <div className="flex items-start justify-between mb-1">
                <div className="flex items-center gap-2">
                  {m.status === "PASS" ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : m.status === "FAIL" ? <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                  <span className="font-medium text-foreground text-sm">{m.label}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-foreground">{m.value}</span>
                  <StatusBadge status={m.status} />
                </div>
              </div>
              <p className="text-sm text-muted-foreground ml-6">{m.description}</p>
              <p className="text-xs text-muted-foreground ml-6 mt-1">{t('performance.target', { value: m.target })}</p>
              {paidTier === 'pro' && m.status !== "PASS" && (
                <p className="text-sm ml-6 mt-2"><span className="font-medium text-foreground">{t('common.fix')}</span> <span className="text-muted-foreground">
                  {m.label.includes("LCP") ? "Optimize images, use lazy loading, preload critical resources, and enable server-side caching to reduce LCP." :
                   m.label.includes("FID") ? "Minimize JavaScript execution time, break up long tasks, use web workers for heavy computation." :
                   "Avoid inserting content above existing content, set explicit dimensions on images/videos, and use CSS containment."}
                </span></p>
              )}
            </div>
          ))}
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> {t('performance.pageSpeedScores')}</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {scores.map((s, i) => (
            <div key={i} className="text-center p-4 rounded-lg border bg-card">
              <s.icon className="w-5 h-5 mx-auto mb-2 text-muted-foreground" />
              <p className={`text-2xl font-bold ${s.value >= 70 ? "text-green-600" : s.value >= 40 ? "text-yellow-600" : "text-red-600"}`}>{s.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function SeoAccessibilityTab({ checks, paidTier }: { checks: AccessibilityCheck[]; paidTier: string }) {
  const { t } = useTranslation();
  if (!checks || checks.length === 0) return <p className="text-sm text-muted-foreground p-4">{t('master.seo.accessibilityNotAvailable')}</p>;

  const passCount = checks.filter(c => c.status === "PASS").length;
  const score = Math.round((passCount / checks.length) * 100);

  const fixSuggestions: Record<string, string> = {
    "HTML Tags for Structure": "Use semantic HTML elements: <header>, <nav>, <main>, <footer>, <article>, <section>. Add proper heading hierarchy (H1 > H2 > H3).",
    "ARIA Labels": "Add aria-label or aria-labelledby to all interactive elements:\n<button aria-label=\"Close menu\">×</button>\n<input aria-label=\"Search\" type=\"text\">",
    "Image Alt Text": "Add descriptive alt text to all images:\n<img src=\"photo.jpg\" alt=\"Team members working in office\">\nUse alt=\"\" for purely decorative images.",
    "Color Contrast Indicators": "Ensure text contrast ratio meets WCAG AA (4.5:1 for normal text, 3:1 for large text). Use tools like WebAIM Contrast Checker.",
    "Text Readability": "Set base font size to at least 16px. Use relative units (rem/em) instead of px. Set comfortable line-height (1.5-1.8).",
    "Line Spacing": "Add line-height: 1.5 to body text. Use margin-bottom for paragraph spacing. Ensure adequate spacing between interactive elements.",
    "Heading Hierarchy": "Start with a single H1, follow with H2s, then H3s. Never skip levels (e.g., H1 → H3). Each section should have its own heading.",
    "Anchor Text Quality": "Zamijenite generički anchor tekst jasnim i opisnim tekstom linka.",
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3 mb-2">
        <div className={`text-lg font-bold ${score >= 70 ? "text-green-600" : score >= 40 ? "text-yellow-600" : "text-red-600"}`}>{passCount}/{checks.length} checks passed</div>
      </div>
      <div className="space-y-3">
        {checks.map((check, idx) => (
          <div key={idx} className={`rounded-lg border p-4 ${check.status === "PASS" ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30" : check.status === "FAIL" ? "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30" : "border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/30"}`}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                {check.status === "PASS" ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : check.status === "FAIL" ? <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                <span className="font-medium text-foreground text-sm">{check.name}</span>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-[10px]">{check.wcagLevel}</Badge>
                <StatusBadge status={check.status} />
              </div>
            </div>
            <p className="text-sm text-muted-foreground ml-6">{check.details}</p>
            {paidTier === 'pro' && check.status !== "PASS" && fixSuggestions[check.name] && (
              <p className="text-sm ml-6 mt-2"><span className="font-medium text-foreground">{t('common.fix')}</span> <span className="text-muted-foreground whitespace-pre-line">{fixSuggestions[check.name]}</span></p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function SeoKeywordsTab({ keywords, paidTier }: { keywords: KeywordAnalysis; paidTier: string }) {
  const { t } = useTranslation();
  if (!keywords) return <p className="text-sm text-muted-foreground p-4">{t('keywords.notAvailable')}</p>;

  const phraseEntries = Object.entries(keywords.keywordPhrases || {}).sort(([,a], [,b]) => (b as number) - (a as number));
  const densityEntries = Object.entries(keywords.keywordDensity || {}).sort(([,a], [,b]) => (b as number) - (a as number));
  const maxPhraseDensity = phraseEntries.length > 0 ? (phraseEntries[0][1] as number) : 1;
  const maxDensity = densityEntries.length > 0 ? (densityEntries[0][1] as number) : 1;

  const titleStatus = keywords.metaTitle.optimized ? "PASS" : keywords.metaTitle.present ? "WARNING" : "FAIL";
  const descStatus = keywords.metaDescription.optimized ? "PASS" : keywords.metaDescription.present ? "WARNING" : "FAIL";
  const h1Status = keywords.headingStructure.hierarchyValid ? "PASS" : keywords.headingStructure.h1Count === 0 ? "FAIL" : "WARNING";

  return (
    <div className="space-y-6">
      <div>
        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2"><FileText className="w-4 h-4 text-primary" /> {t('keywords.metaTags')}</h4>
        <div className="space-y-3">
          <div className={`rounded-lg border p-4 ${titleStatus === "PASS" ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30" : titleStatus === "WARNING" ? "border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/30" : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30"}`}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                {titleStatus === "PASS" ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : titleStatus === "FAIL" ? <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                <span className="font-medium text-foreground text-sm">{t('keywords.metaTitle')}</span>
              </div>
              <StatusBadge status={titleStatus} />
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              {keywords.metaTitle.present ? `Length: ${keywords.metaTitle.length} characters` : "Missing meta title"} 
              {keywords.metaTitle.present && !keywords.metaTitle.optimized && ` (optimal: 30-60 characters)`}
              {keywords.metaTitle.optimized && " — Well optimized"}
            </p>
            {paidTier === 'pro' && titleStatus !== "PASS" && (
              <p className="text-sm ml-6 mt-1"><span className="font-medium text-foreground">{t('common.fix')}</span> <span className="text-muted-foreground">{t('master.seo.metaTitleFix')}</span></p>
            )}
          </div>

          <div className={`rounded-lg border p-4 ${descStatus === "PASS" ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30" : descStatus === "WARNING" ? "border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/30" : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30"}`}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                {descStatus === "PASS" ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : descStatus === "FAIL" ? <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                <span className="font-medium text-foreground text-sm">{t('keywords.metaDescription')}</span>
              </div>
              <StatusBadge status={descStatus} />
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              {keywords.metaDescription.present ? `Length: ${keywords.metaDescription.length} characters` : "Missing meta description"}
              {keywords.metaDescription.present && !keywords.metaDescription.optimized && ` (optimal: 120-160 characters)`}
              {keywords.metaDescription.optimized && " — Well optimized"}
            </p>
            {paidTier === 'pro' && descStatus !== "PASS" && (
              <p className="text-sm ml-6 mt-1"><span className="font-medium text-foreground">{t('common.fix')}</span> <span className="text-muted-foreground">{t('master.seo.metaDescriptionFix')}</span></p>
            )}
          </div>

          <div className={`rounded-lg border p-4 ${h1Status === "PASS" ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30" : h1Status === "WARNING" ? "border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/30" : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30"}`}>
            <div className="flex items-start justify-between mb-1">
              <div className="flex items-center gap-2">
                {h1Status === "PASS" ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : h1Status === "FAIL" ? <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
                <span className="font-medium text-foreground text-sm">{t('keywords.headingStructure')}</span>
              </div>
              <StatusBadge status={h1Status} />
            </div>
            <p className="text-sm text-muted-foreground ml-6">
              {keywords.headingStructure.h1Count} H1 tag{keywords.headingStructure.h1Count !== 1 ? 's' : ''} found
              {keywords.headingStructure.h1Text.length > 0 && `: "${keywords.headingStructure.h1Text[0]}"`}
              {keywords.headingStructure.hierarchyValid ? " — Valid hierarchy" : ""}
            </p>
            {paidTier === 'pro' && h1Status !== "PASS" && (
              <p className="text-sm ml-6 mt-1"><span className="font-medium text-foreground">{t('common.fix')}</span> <span className="text-muted-foreground">{keywords.headingStructure.h1Count === 0 ? t('master.seo.h1FixMissing') : t('master.seo.h1FixMultiple')}</span></p>
            )}
          </div>
        </div>
      </div>

      <div>
        <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2"><Link2 className="w-4 h-4 text-primary" /> {t('master.seo.linkProfile')}</h4>
        <div className="grid grid-cols-2 gap-3">
          <div className="text-center p-4 rounded-lg border bg-card">
            <p className="text-2xl font-bold text-primary">{keywords.internalLinks}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('master.seo.internalLinks')}</p>
          </div>
          <div className="text-center p-4 rounded-lg border bg-card">
            <p className="text-2xl font-bold text-primary">{keywords.externalLinks}</p>
            <p className="text-xs text-muted-foreground mt-1">{t('master.seo.externalLinks')}</p>
          </div>
        </div>
        {paidTier === 'pro' && keywords.internalLinks < 5 && (
          <p className="text-sm mt-2 p-3 rounded-lg bg-muted/50"><span className="font-medium text-foreground">{t('master.seo.recommendation')}:</span> <span className="text-muted-foreground">{t('master.seo.internalLinksRecommendation')}</span></p>
        )}
      </div>

      {phraseEntries.length > 0 && (
        <div>
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> {t('keywords.topPhrases')}</h4>
          <p className="text-xs text-muted-foreground mb-3">{t('master.seo.keywordPhrasesHelp')}</p>
          <div className="space-y-2">
            {phraseEntries.map(([phrase, rawDensity], i) => {
              const density = rawDensity as number;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-foreground w-40 truncate font-medium">{phrase}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-purple-500/70 rounded-full transition-all" style={{ width: `${Math.max(5, (density / maxPhraseDensity) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">{density}%</span>
                </div>
              );
            })}
          </div>
          {paidTier === 'pro' && (
            <p className="text-sm mt-3 p-3 rounded-lg bg-muted/50"><span className="font-medium text-foreground">{t('master.seo.tip')}:</span> <span className="text-muted-foreground">{t('master.seo.keywordPhrasesTip')}</span></p>
          )}
        </div>
      )}

      {densityEntries.length > 0 && (
        <div>
          <h4 className="font-semibold text-foreground mb-3 flex items-center gap-2"><BarChart3 className="w-4 h-4 text-primary" /> {t('keywords.topSingle')}</h4>
          <div className="space-y-2">
            {densityEntries.map(([word, rawDensity], i) => {
              const density = rawDensity as number;
              return (
                <div key={i} className="flex items-center gap-3">
                  <span className="text-sm text-foreground w-28 truncate font-medium">{word}</span>
                  <div className="flex-1 h-5 bg-muted rounded-full overflow-hidden">
                    <div className="h-full bg-primary/70 rounded-full transition-all" style={{ width: `${Math.max(5, (density / maxDensity) * 100)}%` }} />
                  </div>
                  <span className="text-xs text-muted-foreground w-12 text-right">{density}%</span>
                </div>
              );
            })}
          </div>
          {paidTier === 'pro' && (
            <p className="text-sm mt-3 p-3 rounded-lg bg-muted/50"><span className="font-medium text-foreground">{t('master.seo.tip')}:</span> <span className="text-muted-foreground">{t('master.seo.keywordDensityTip')}</span></p>
          )}
        </div>
      )}
    </div>
  );
}

function SeoContentTab({ content, paidTier }: { content: ContentQuality; paidTier: string }) {
  const { t } = useTranslation();
  if (!content) return <p className="text-sm text-muted-foreground p-4">{t('legacy.detailedAnalysis.contentNotAvailable')}</p>;

  const wordCountStatus = content.wordCount >= 300 ? "PASS" : content.wordCount >= 150 ? "WARNING" : "FAIL";
  const readabilityStatus = content.readabilityScore >= 60 ? "PASS" : content.readabilityScore >= 30 ? "WARNING" : "FAIL";
  const altTagStatus = content.imageAltTags.percentage >= 80 ? "PASS" : content.imageAltTags.percentage >= 50 ? "WARNING" : "FAIL";
  const schemaStatus = content.structuredData ? "PASS" : "WARNING";

  const readabilityLabel = content.readabilityScore >= 80 ? "Very Easy" : content.readabilityScore >= 60 ? "Easy" : content.readabilityScore >= 40 ? "Moderate" : content.readabilityScore >= 20 ? "Difficult" : "Very Difficult";

  const items = [
    { label: t('master.content.wordCount'), value: t('master.content.wordCountValue', { count: content.wordCount }), status: wordCountStatus, detail: content.wordCount >= 300 ? t('master.content.goodLength') : t('master.content.aimFor300'), fix: t('master.content.wordCountFix') },
    { label: t('master.content.readabilityScore'), value: `${content.readabilityScore}/100 (${readabilityLabel})`, status: readabilityStatus, detail: t('master.content.fleschScore', { label: readabilityLabel.toLowerCase() }), fix: t('master.content.readabilityFix') },
    { label: t('master.content.imageAltTags'), value: t('master.content.imageAltValue', { withAlt: content.imageAltTags.withAlt, total: content.imageAltTags.total, percentage: content.imageAltTags.percentage }), status: altTagStatus, detail: content.imageAltTags.percentage >= 80 ? t('master.content.goodAltCoverage') : t('master.content.missingAltText'), fix: t('master.content.altFix') },
    { label: t('master.content.structuredDataSchema'), value: content.structuredData ? t('master.content.foundSchema', { schema: content.schemaMarkup.join(', ') }) : t('master.content.noStructuredData'), status: schemaStatus, detail: content.structuredData ? t('master.content.schemaHelps') : t('master.content.schemaCanImprove'), fix: t('master.content.schemaFix') },
  ];

  return (
    <div className="space-y-3">
      {items.map((item, idx) => (
        <div key={idx} className={`rounded-lg border p-4 ${item.status === "PASS" ? "border-green-200 dark:border-green-800 bg-green-50/50 dark:bg-green-950/30" : item.status === "WARNING" ? "border-yellow-200 dark:border-yellow-800 bg-yellow-50/50 dark:bg-yellow-950/30" : "border-red-200 dark:border-red-800 bg-red-50/50 dark:bg-red-950/30"}`}>
          <div className="flex items-start justify-between mb-1">
            <div className="flex items-center gap-2">
              {item.status === "PASS" ? <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" /> : item.status === "FAIL" ? <XCircle className="w-4 h-4 text-red-600 flex-shrink-0" /> : <AlertTriangle className="w-4 h-4 text-yellow-600 flex-shrink-0" />}
              <span className="font-medium text-foreground text-sm">{item.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium text-foreground">{item.value}</span>
              <StatusBadge status={item.status} />
            </div>
          </div>
          <p className="text-sm text-muted-foreground ml-6">{item.detail}</p>
          {paidTier === 'pro' && item.status !== "PASS" && (
            <p className="text-sm ml-6 mt-2"><span className="font-medium text-foreground">{t('common.fix')}</span> <span className="text-muted-foreground whitespace-pre-line">{item.fix}</span></p>
          )}
        </div>
      ))}
    </div>
  );
}

function SeoCompareTab({ url }: { url: string }) {
  const { t } = useTranslation();
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(["", ""]);
  const [comparisonResult, setComparisonResult] = useState<SeoComparisonResult | null>(null);
  const { toast } = useToast();

  const compareMutation = useMutation({
    mutationFn: async (urls: string[]) => {
      const response = await apiRequest("POST", "/api/seo-compare", { urls });
      return response.json();
    },
    onSuccess: (data: SeoComparisonResult) => {
      setComparisonResult(data);
    },
    onError: (error: any) => {
      toast({ title: t('master.compare.comparisonFailedTitle'), description: error.message || t('master.compare.somethingWentWrong'), variant: "destructive" });
    },
  });

  const handleCompare = () => {
    const validUrls = [url, ...competitorUrls.filter(u => u.trim().length > 0)];
    if (validUrls.length < 2) {
      toast({ title: t('master.compare.needCompetitorTitle'), description: t('master.compare.needCompetitorDescription'), variant: "destructive" });
      return;
    }
    compareMutation.mutate(validUrls);
  };

  const addCompetitor = () => {
    if (competitorUrls.length < 2) {
      setCompetitorUrls([...competitorUrls, ""]);
    }
  };

  const categoryLabels = [
    { key: "technicalScore", label: t('seo.technical') },
    { key: "performanceScore", label: t('seo.performance') },
    { key: "accessibilityScore", label: t('seo.accessibility') },
    { key: "keywordScore", label: t('seo.keywords') },
    { key: "contentScore", label: t('seo.content') },
  ];

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">{t('master.compare.competitorSeoComparison')}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t('master.compare.compareSeoDescription')}</p>
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('master.compare.yourUrl')}</label>
              <Input value={url} disabled className="mt-1 bg-muted/50" />
            </div>
            {competitorUrls.map((compUrl, i) => (
              <div key={i}>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('master.compare.competitorLabel', { count: i + 1 })}</label>
                <Input
                  value={compUrl}
                  onChange={(e) => {
                    const updated = [...competitorUrls];
                    updated[i] = e.target.value;
                    setCompetitorUrls(updated);
                  }}
                  placeholder={t('master.compare.competitorPlaceholder')}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleCompare} disabled={compareMutation.isPending}>
              {compareMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('master.compare.comparing')}</>
              ) : (
                <><Users className="w-4 h-4 mr-2" />{t('tabs.compare')}</>
              )}
            </Button>
            {competitorUrls.length < 2 && (
              <Button variant="outline" size="sm" onClick={addCompetitor}>{t('master.compare.addCompetitor')}</Button>
            )}
          </div>
        </CardContent>
      </Card>
      {comparisonResult && (
        <div className="space-y-6">
          <Card className="rounded-xl border border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-bold text-foreground">{t('master.compare.comparisonSummary')}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{comparisonResult.summary}</p>
            </CardContent>
          </Card>
          <div className={`grid grid-cols-1 ${comparisonResult.analyses.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4`}>
            {comparisonResult.analyses.map((analysis, i) => {
              const isWinner = analysis.url === comparisonResult.winner;
              return (
                <Card key={i} className={`rounded-xl border shadow-sm ${isWinner ? "border-2 border-yellow-400 dark:border-yellow-600" : "border-border"}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-mono truncate">{new URL(analysis.url).hostname}</p>
                        {isWinner && <Badge className="bg-yellow-500 text-white mt-1">{t('master.compare.winner')}</Badge>}
                        {(analysis as any).errorCode && isFetchErrorCode((analysis as any).errorCode) && (
                          <div className="mt-2"><CompareBlockedBadge code={(analysis as any).errorCode} /></div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-3xl font-bold ${analysis.overallScore >= 70 ? "text-green-600" : analysis.overallScore >= 40 ? "text-yellow-600" : "text-red-600"}`}>{analysis.overallScore}</p>
                        <p className="text-xs text-muted-foreground">{t('master.compare.overall')}</p>
                      </div>
                    </div>
                    <div className="flex gap-2 mb-4 text-xs">
                      <Badge variant="outline" className="text-green-600">{analysis.passCount} {t('common.pass')}</Badge>
                      <Badge variant="outline" className="text-red-600">{analysis.failCount} {t('common.fail')}</Badge>
                      <Badge variant="outline" className="text-yellow-600">{analysis.warnCount} {t('common.warning')}</Badge>
                    </div>
                    <div className="space-y-2 mb-4">
                      {categoryLabels.map((cat) => {
                        const val = (analysis as any)[cat.key] as number;
                        return (
                          <div key={cat.key}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-muted-foreground">{cat.label}</span>
                              <span className="font-medium">{val}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${val >= 70 ? "bg-green-500" : val >= 40 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${val}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {analysis.keyStrengths.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('master.compare.strengths')}</p>
                        <div className="space-y-1">
                          {analysis.keyStrengths.map((s, j) => (
                            <div key={j} className="flex items-center gap-1 text-xs"><CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" /><span className="text-foreground">{s}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.keyWeaknesses.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('master.compare.weaknesses')}</p>
                        <div className="space-y-1">
                          {analysis.keyWeaknesses.map((w, j) => (
                            <div key={j} className="flex items-center gap-1 text-xs"><XCircle className="w-3 h-3 text-red-500 flex-shrink-0" /><span className="text-foreground">{w}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AdsSummary({ data }: { data: any }) {
  const { t } = useTranslation();
  const results = data.results as AdsAnalysisResults;

  const ratingConfig: Record<string, { color: string; bg: string; border: string; icon: any; badgeClass: string }> = {
    "Above average": { color: "text-green-600", bg: "bg-green-50 dark:bg-green-950", border: "border-green-200 dark:border-green-800", icon: TrendingUp, badgeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    "Average": { color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950", border: "border-yellow-200 dark:border-yellow-800", icon: Minus, badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    "Below average": { color: "text-red-600", bg: "bg-red-50 dark:bg-red-950", border: "border-red-200 dark:border-red-800", icon: TrendingDown, badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  };
  const config = ratingConfig[results.rating] || ratingConfig["Average"];
  const ratingKeyMap: Record<string, string> = {
    "Above average": "master.ratings.aboveAverage",
    "Average": "master.ratings.average",
    "Below average": "master.ratings.belowAverage",
  };
  const ratingLabel = ratingKeyMap[results.rating] ? t(ratingKeyMap[results.rating]) : results.rating;
  const RatingIcon = config.icon;

  return (
    <div className="space-y-4">
      <Card className={`rounded-xl border-2 ${config.border} shadow-sm p-6`}>
        <CardContent className="p-0">
          <div className="flex items-center space-x-6">
            <div className={`w-20 h-20 ${config.bg} rounded-2xl flex items-center justify-center`}>
              <span className={`text-3xl font-bold ${config.color}`} data-testid="ads-score">{results.score}</span>
            </div>
            <div>
              <div className="flex items-center gap-3 mb-1">
                <h3 className="text-xl font-bold text-foreground">{t('master.ads.landingPageExperience')}</h3>
                <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${config.badgeClass}`} data-testid="ads-rating">
                  <RatingIcon className="w-4 h-4" />{ratingLabel}
                </span>
              </div>
              <p className="text-sm text-muted-foreground mt-1">{results.qualityScoreImpact.split(".")[0]}.</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {(() => {
        const failChecks = results.checks.filter((c: AdsCheck) => c.status === 'FAIL').length;
        const warnChecks = results.checks.filter((c: AdsCheck) => c.status === 'WARNING').length;
        const qsImprovement = Math.min(failChecks * 1 + warnChecks * 0.5, 4);
        const cpcReductionLow = Math.round(qsImprovement * 6);
        const cpcReductionHigh = Math.round(qsImprovement * 10);
        const monthlySpend = 1000;
        const savingsLow = Math.round(monthlySpend * cpcReductionLow / 100);
        const savingsHigh = Math.round(monthlySpend * cpcReductionHigh / 100);
        if (qsImprovement <= 0) return null;
        return (
          <Card className="rounded-xl border-2 border-emerald-200 dark:border-emerald-800 bg-gradient-to-r from-emerald-50 to-green-50 dark:from-emerald-950/40 dark:to-green-950/40 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-emerald-100 dark:bg-emerald-900 rounded-xl flex items-center justify-center flex-shrink-0">
                  <TrendingUp className="w-6 h-6 text-emerald-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    {t('master.ads.potentialSavingsEstimate')}
                    <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200 text-[10px]">{t('master.ads.basedOnIssues', { count: failChecks + warnChecks })}</Badge>
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('master.ads.qualityScoreImprovement', { improvement: qsImprovement.toFixed(1), low: cpcReductionLow, high: cpcReductionHigh })}
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="bg-white dark:bg-emerald-950 rounded-lg px-4 py-2 border border-emerald-200 dark:border-emerald-800">
                      <p className="text-xs text-muted-foreground">{t('master.ads.estimatedMonthlySavings')}</p>
                      <p className="text-lg font-bold text-emerald-600">€{savingsLow}–€{savingsHigh}</p>
                      <p className="text-[10px] text-muted-foreground">{t('master.ads.onMonthlySpend')}</p>
                    </div>
                    <div className="bg-white dark:bg-emerald-950 rounded-lg px-4 py-2 border border-emerald-200 dark:border-emerald-800">
                      <p className="text-xs text-muted-foreground">{t('master.ads.estimatedAnnualSavings')}</p>
                      <p className="text-lg font-bold text-emerald-600">€{savingsLow * 12}–€{savingsHigh * 12}</p>
                      <p className="text-[10px] text-muted-foreground">{t('master.ads.onMonthlySpend')}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">{t('master.ads.disclaimer')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

function AdsSection({ data, url, paidTier, onUpgrade }: { data: any; url: string; paidTier: string; onUpgrade: (tier: 'basic' | 'pro') => void }) {
  const { t } = useTranslation();
  const results = data.results as AdsAnalysisResults;
  const recommendations = data.recommendations as AdsRecommendation[];

  const categories = [
    { name: "Server Speed", icon: Timer, color: "blue", status: results.ttfb.penalized ? "FAIL" : results.ttfb.cleanUrl > 400 ? "WARNING" : "PASS", detail: `${results.ttfb.cleanUrl}ms clean / ${results.ttfb.withAdsParams}ms with ads params` },
    { name: "CDN & Delivery", icon: Globe, color: "green", status: results.cdn.detected && results.cdn.edgeCaching ? "PASS" : results.cdn.detected ? "WARNING" : "FAIL", detail: results.cdn.detected ? `${results.cdn.provider}${results.cdn.edgeCaching ? " (edge caching active)" : ""}` : "No CDN detected" },
    { name: "Cache Health", icon: HardDrive, color: "purple", status: results.cache.fragmented ? "FAIL" : "PASS", detail: results.cache.fragmented ? "Cache fragmentation detected" : "Cache handling is healthy" },
    { name: "Redirect Chain", icon: ArrowRight, color: "orange", status: results.redirects.hops === 0 ? "PASS" : results.redirects.hops === 1 ? "WARNING" : "FAIL", detail: results.redirects.hops === 0 ? "Direct delivery" : `${results.redirects.hops} redirect(s) — ${results.redirects.totalLatency}ms added` },
    { name: "Hosting", icon: Server, color: "red", status: results.hosting.isLikelyShared ? "FAIL" : results.hosting.coldCacheRisk ? "WARNING" : "PASS", detail: results.hosting.isLikelyShared ? "Shared hosting detected" : results.hosting.serverSignature || "Hosting OK" },
    { name: "Mobile UX", icon: Smartphone, color: "indigo", status: results.mobileUx.ctaVisibleAboveFold && results.mobileUx.keywordInAboveFold ? "PASS" : !results.mobileUx.ctaVisibleAboveFold && !results.mobileUx.keywordInAboveFold ? "FAIL" : "WARNING", detail: `${results.mobileUx.keywordInAboveFold ? "Keywords match" : "No keyword match"} • ${results.mobileUx.ctaVisibleAboveFold ? "CTA visible" : "CTA not visible"}` },
  ];

  const getIconBg = (c: string) => ({ blue: "bg-blue-100 dark:bg-blue-900", green: "bg-green-100 dark:bg-green-900", purple: "bg-purple-100 dark:bg-purple-900", orange: "bg-orange-100 dark:bg-orange-900", red: "bg-red-100 dark:bg-red-900", indigo: "bg-indigo-100 dark:bg-indigo-900" }[c] || "bg-gray-100");
  const getIconColor = (c: string) => ({ blue: "text-blue-600", green: "text-green-600", purple: "text-purple-600", orange: "text-orange-600", red: "text-red-600", indigo: "text-indigo-600" }[c] || "text-gray-600");

  const groupedChecks: Record<string, AdsCheck[]> = {};
  for (const check of results.checks) {
    if (!groupedChecks[check.category]) groupedChecks[check.category] = [];
    groupedChecks[check.category].push(check);
  }
  const categoryLabels: Record<string, { label: string; icon: typeof Timer }> = {
    performance: { label: t('master.ads.performanceAndSpeed'), icon: Timer },
    delivery: { label: t('master.ads.deliveryInfrastructure'), icon: Globe },
    caching: { label: t('master.ads.cachingFragmentation'), icon: HardDrive },
    ux: { label: t('master.ads.mobileUxRelevance'), icon: Smartphone },
  };

  const priorityConfig: Record<string, { color: string; border: string }> = {
    Critical: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", border: "border-l-red-500" },
    High: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", border: "border-l-orange-500" },
    Medium: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", border: "border-l-yellow-500" },
    Low: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", border: "border-l-blue-500" },
  };

  return (
    <div className="space-y-6">
      {paidTier === 'free' ? (
        <FreeKeyFindings
          items={results.checks.map((c: AdsCheck) => ({ name: c.name, impact: c.impact || '', status: c.status }))}
          onUpgrade={onUpgrade}
        />
      ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">{t('master.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="checks">{t('tabs.checks')}</TabsTrigger>
            {paidTier === 'pro' && <TabsTrigger value="recommendations">{t('tabs.recommendations')}</TabsTrigger>}
            <TabsTrigger value="impact">{t('master.ads.impact')}</TabsTrigger>
            {paidTier === 'pro' && <TabsTrigger value="adMatch" data-testid="tab-ad-match">{t('master.ads.adMatch.tabLabel')}</TabsTrigger>}
            <TabsTrigger value="compare">{t('tabs.compare')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {categories.map((cat) => {
                const CatIcon = cat.icon;
                return (
                  <Card key={cat.name} className="rounded-xl border border-border shadow-sm p-5">
                    <CardContent className="p-0">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-3">
                          <div className={`w-10 h-10 ${getIconBg(cat.color)} rounded-lg flex items-center justify-center`}>
                            <CatIcon className={`w-5 h-5 ${getIconColor(cat.color)}`} />
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
            {results.fieldData && <FieldDataBlock fieldData={results.fieldData} url={url} />}
          </TabsContent>

          <TabsContent value="checks">
            <Card className="rounded-xl border border-border shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-2">{t('master.ads.detailedCheckResults')}</h3>
                {paidTier === 'pro' && <p className="text-sm text-muted-foreground mb-6">{t('master.aeo.technicalFixGuideHint')}</p>}
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
                                  <Badge variant={check.fixType === "infrastructure" ? "default" : "secondary"} className="text-xs ml-2 flex-shrink-0">
                                    {check.fixType === "infrastructure" ? "Infrastructure" : "Page-level"}
                                  </Badge>
                                </div>
                                <StatusBadge status={check.status} />
                              </div>
                              <p className="text-sm text-muted-foreground ml-7 mb-2">{check.details}</p>
                              <div className="ml-7 space-y-1">
                                <p className="text-sm"><span className="font-medium text-foreground">{t('master.common.impact')}:</span> <span className="text-muted-foreground">{check.impact}</span></p>
                                {paidTier === 'pro' && check.status !== "PASS" && (
                                  <p className="text-sm"><span className="font-medium text-foreground">{t('common.fix')}</span> <span className="text-muted-foreground">{check.recommendation}</span></p>
                                )}
                              </div>
                              {paidTier === 'pro' && check.technicalFix && <TechnicalFixBlock technicalFix={check.technicalFix} />}
                            </div>
                          ))}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {paidTier === 'pro' && (
            <TabsContent value="recommendations">
              {recommendations.length > 0 ? (
                <Card className="rounded-xl border border-border shadow-sm">
                  <CardContent className="p-6">
                    <h3 className="text-xl font-bold text-foreground mb-6">{t('legacy.recommendations.title')}</h3>
                    <div className="space-y-4">
                      {recommendations.map((rec, idx) => {
                        const pc = priorityConfig[rec.priority] || priorityConfig["Medium"];
                        return (
                          <div key={idx} className={`border-l-4 ${pc.border} rounded-lg border border-border p-5`}>
                            <div className="flex items-center gap-3 mb-2">
                              <h4 className="text-base font-semibold text-foreground">{rec.title}</h4>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pc.color}`}>{rec.priority}</span>
                              <Badge variant={rec.fixType === "infrastructure" ? "default" : "secondary"} className="text-xs">{rec.fixType === "infrastructure" ? "Infrastructure" : "Page-level"}</Badge>
                            </div>
                            <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                            <p className="text-sm text-muted-foreground mb-3 italic">{rec.impact}</p>
                            {rec.actionItems.length > 0 && (
                              <ul className="space-y-1">
                                {rec.actionItems.map((item, i) => (
                                  <li key={i} className="text-sm text-foreground flex items-start gap-2">
                                    <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />{item}
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
              ) : (
                <p className="text-sm text-muted-foreground">{t('master.common.noRecommendations')}</p>
              )}
            </TabsContent>
          )}

          <TabsContent value="impact">
            <Card className="rounded-xl border border-border shadow-sm">
              <CardContent className="p-6">
                <h3 className="text-xl font-bold text-foreground mb-6">{t('master.ads.impactOnGoogleAds')}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="rounded-lg border border-border p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <LayoutGrid className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-foreground">{t('master.ads.qualityScoreImpact')}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{results.qualityScoreImpact}</p>
                  </div>
                  <div className="rounded-lg border border-border p-5">
                    <div className="flex items-center gap-2 mb-3">
                      <TrendingDown className="w-5 h-5 text-primary" />
                      <h4 className="font-semibold text-foreground">{t('master.ads.cpcCostImpact')}</h4>
                    </div>
                    <p className="text-sm text-muted-foreground">{results.cpcImpact}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {paidTier === 'pro' && (
            <TabsContent value="adMatch">
              <AdMatchTab url={url} />
            </TabsContent>
          )}

          <TabsContent value="compare">
            <AdsCompareTab url={url} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function FieldDataBlock({ fieldData, url }: { fieldData: CruxFieldData; url: string }) {
  const { t } = useTranslation();
  const sourceKey = fieldData.source === 'url' ? 'sourceUrl' : fieldData.source === 'origin' ? 'sourceOrigin' : 'sourceNone';
  const sourceHintKey = fieldData.source === 'url' ? 'sourceUrlHint' : fieldData.source === 'origin' ? 'sourceOriginHint' : 'sourceNoneHint';

  const catColor = (c: string) => c === 'FAST'
    ? 'text-green-700 dark:text-green-400 bg-green-100 dark:bg-green-950 border-green-200 dark:border-green-900'
    : c === 'AVERAGE'
    ? 'text-yellow-700 dark:text-yellow-400 bg-yellow-100 dark:bg-yellow-950 border-yellow-200 dark:border-yellow-900'
    : c === 'SLOW'
    ? 'text-red-700 dark:text-red-400 bg-red-100 dark:bg-red-950 border-red-200 dark:border-red-900'
    : 'text-muted-foreground bg-muted border-border';
  const catLabel = (c: string) => c === 'FAST' ? t('master.ads.fieldData.categoryFast') : c === 'AVERAGE' ? t('master.ads.fieldData.categoryAverage') : c === 'SLOW' ? t('master.ads.fieldData.categorySlow') : t('master.ads.fieldData.noData');

  const fmt = (m: { percentile: number | null; category: string }, kind: 'ms' | 'cls') => {
    if (m.percentile == null) return t('master.ads.fieldData.noData');
    if (kind === 'cls') return (m.percentile / 100).toFixed(3);
    return m.percentile >= 1000 ? `${(m.percentile / 1000).toFixed(2)}s` : `${Math.round(m.percentile)}ms`;
  };

  const metrics = [
    { key: 'lcp', label: t('master.ads.fieldData.lcp'), metric: fieldData.lcp, kind: 'ms' as const },
    { key: 'cls', label: t('master.ads.fieldData.cls'), metric: fieldData.cls, kind: 'cls' as const },
    { key: 'inp', label: t('master.ads.fieldData.inp'), metric: fieldData.inp, kind: 'ms' as const },
    { key: 'fcp', label: t('master.ads.fieldData.fcp'), metric: fieldData.fcp, kind: 'ms' as const },
    { key: 'ttfb', label: t('master.ads.fieldData.ttfb'), metric: fieldData.ttfb, kind: 'ms' as const },
  ];

  return (
    <Card className="rounded-xl border border-border shadow-sm mt-6" data-testid="block-field-data">
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-3 mb-3 flex-wrap">
          <div>
            <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
              <Gauge className="w-5 h-5" style={{ color: 'var(--primary)' }} />
              {t('master.ads.fieldData.title')}
            </h3>
            <p className="text-sm text-muted-foreground mt-1">{t('master.ads.fieldData.subtitle')}</p>
          </div>
          <a
            href={`https://pagespeed.web.dev/analysis?url=${encodeURIComponent(url)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-primary hover:underline flex items-center gap-1 flex-shrink-0"
            data-testid="link-pagespeed"
          >
            <ExternalLink className="w-3 h-3" />
            {t('master.ads.fieldData.openInPagespeed')}
          </a>
        </div>

        <div className={`mb-4 p-3 rounded-lg border ${fieldData.source === 'none' ? 'bg-yellow-50 dark:bg-yellow-950/40 border-yellow-200 dark:border-yellow-900' : 'bg-muted/50 border-border'}`}>
          <p className="text-sm font-medium text-foreground" data-testid="text-field-source">{t(`master.ads.fieldData.${sourceKey}`)}</p>
          <p className="text-xs text-muted-foreground mt-1">{t(`master.ads.fieldData.${sourceHintKey}`)}</p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
          {metrics.map((m) => (
            <div key={m.key} className={`rounded-lg border p-3 ${catColor(m.metric.category)}`} data-testid={`metric-field-${m.key}`}>
              <p className="text-xs font-medium opacity-80 mb-1">{m.label}</p>
              <p className="text-xl font-bold tabular-nums">{fmt(m.metric, m.kind)}</p>
              <p className="text-[10px] uppercase tracking-wide mt-1">{catLabel(m.metric.category)}</p>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function AdMatchTab({ url }: { url: string }) {
  const { t, i18n } = useTranslation();
  const { toast } = useToast();
  const [headlines, setHeadlines] = useState("");
  const [descriptions, setDescriptions] = useState("");
  const [keywords, setKeywords] = useState("");
  const [result, setResult] = useState<AdRelevanceResult | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ad-relevance-check", {
        url, headlines, descriptions, keywords,
        lang: i18n.language?.startsWith('hr') ? 'hr' : 'en',
      });
      return response.json() as Promise<AdRelevanceResult>;
    },
    onSuccess: (data) => setResult(data),
    onError: (error: any) => {
      toast({ title: t('master.ads.adMatch.errorTitle'), description: error.message || '', variant: 'destructive' });
    },
  });

  const Yes = () => <CheckCircle2 className="w-4 h-4 text-green-600 inline" />;
  const No = () => <XCircle className="w-4 h-4 text-red-600/60 inline" />;

  const scoreLabel = (s: number) => s >= 75 ? t('master.ads.adMatch.scoreHigh') : s >= 45 ? t('master.ads.adMatch.scoreMedium') : t('master.ads.adMatch.scoreLow');
  const scoreColor = (s: number) => s >= 75 ? 'text-green-600' : s >= 45 ? 'text-yellow-600' : 'text-red-600';

  const kindLabel = (k?: string) => k === 'headline' ? t('master.ads.adMatch.kindHeadline') : k === 'description' ? t('master.ads.adMatch.kindDescription') : t('master.ads.adMatch.kindKeyword');

  return (
    <Card className="rounded-xl border border-border shadow-sm">
      <CardContent className="p-6 space-y-5">
        <div>
          <h3 className="text-xl font-bold text-foreground flex items-center gap-2">
            <Target className="w-5 h-5" style={{ color: 'var(--primary)' }} />
            {t('master.ads.adMatch.title')}
          </h3>
          <p className="text-sm text-muted-foreground mt-2">{t('master.ads.adMatch.intro')}</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-sm font-medium" htmlFor="ad-headlines">{t('master.ads.adMatch.headlinesLabel')}</Label>
            <Textarea id="ad-headlines" rows={5} value={headlines} onChange={(e) => setHeadlines(e.target.value)} placeholder={t('master.ads.adMatch.headlinesPlaceholder')} className="mt-1" data-testid="input-ad-headlines" />
          </div>
          <div>
            <Label className="text-sm font-medium" htmlFor="ad-descriptions">{t('master.ads.adMatch.descriptionsLabel')}</Label>
            <Textarea id="ad-descriptions" rows={5} value={descriptions} onChange={(e) => setDescriptions(e.target.value)} placeholder={t('master.ads.adMatch.descriptionsPlaceholder')} className="mt-1" data-testid="input-ad-descriptions" />
          </div>
          <div>
            <Label className="text-sm font-medium" htmlFor="ad-keywords">{t('master.ads.adMatch.keywordsLabel')}</Label>
            <Textarea id="ad-keywords" rows={5} value={keywords} onChange={(e) => setKeywords(e.target.value)} placeholder={t('master.ads.adMatch.keywordsPlaceholder')} className="mt-1" data-testid="input-ad-keywords" />
          </div>
        </div>

        <Button
          onClick={() => mutation.mutate()}
          disabled={mutation.isPending || (!headlines.trim() && !descriptions.trim() && !keywords.trim())}
          data-testid="button-analyze-relevance"
        >
          {mutation.isPending ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('master.ads.adMatch.analyzing')}</> : t('master.ads.adMatch.analyze')}
        </Button>

        {!result && !mutation.isPending && (
          <p className="text-sm text-muted-foreground italic">{t('master.ads.adMatch.noResults')}</p>
        )}

        {result && (
          <div className="space-y-5 pt-2 border-t border-border" data-testid="block-relevance-result">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('master.ads.adMatch.overallScore')}</p>
                <p className={`text-4xl font-bold tabular-nums mt-1 ${scoreColor(result.overallScore)}`} data-testid="text-relevance-score">{result.overallScore}<span className="text-base text-muted-foreground">/100</span></p>
                <p className="text-sm mt-1">{scoreLabel(result.overallScore)}</p>
              </div>
              <div className="rounded-lg border border-border p-4">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{t('master.ads.adMatch.matchRate')}</p>
                <p className="text-4xl font-bold tabular-nums mt-1 text-foreground">{result.matchRate}<span className="text-base text-muted-foreground">%</span></p>
                <p className="text-sm mt-1 text-muted-foreground">{result.terms.filter(x => x.inBody).length} / {result.terms.length}</p>
              </div>
            </div>

            <div className="rounded-lg border border-border p-4 bg-muted/30">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-2">{t('master.ads.adMatch.pageSummary')}</p>
              <p className="text-sm"><span className="font-medium">{t('master.ads.adMatch.pageTitleLabel')}:</span> <span className="text-muted-foreground">{result.pageTitle || '—'}</span></p>
              <p className="text-sm mt-1"><span className="font-medium">{t('master.ads.adMatch.pageH1Label')}:</span> <span className="text-muted-foreground">{result.pageH1 || '—'}</span></p>
            </div>

            {result.terms.length > 0 && (
              <div>
                <h4 className="text-sm font-semibold text-foreground mb-2">{t('master.ads.adMatch.perTerm')}</h4>
                <div className="overflow-x-auto rounded-lg border border-border">
                  <table className="w-full text-sm">
                    <thead className="bg-muted">
                      <tr className="text-xs text-muted-foreground">
                        <th className="text-left px-3 py-2">{t('master.ads.adMatch.termColumn')}</th>
                        <th className="text-left px-3 py-2">{t('master.ads.adMatch.kindColumn')}</th>
                        <th className="text-center px-3 py-2">{t('master.ads.adMatch.titleCol')}</th>
                        <th className="text-center px-3 py-2">{t('master.ads.adMatch.h1Col')}</th>
                        <th className="text-center px-3 py-2">{t('master.ads.adMatch.subCol')}</th>
                        <th className="text-center px-3 py-2">{t('master.ads.adMatch.fpCol')}</th>
                        <th className="text-center px-3 py-2">{t('master.ads.adMatch.altCol')}</th>
                        <th className="text-center px-3 py-2">{t('master.ads.adMatch.bodyCol')}</th>
                      </tr>
                    </thead>
                    <tbody>
                      {result.terms.map((term: AdRelevanceTermResult, i) => (
                        <tr key={i} className={`border-t border-border ${term.inBody ? '' : 'bg-red-50/50 dark:bg-red-950/20'}`} data-testid={`row-term-${i}`}>
                          <td className="px-3 py-2 font-medium text-foreground">{term.term}</td>
                          <td className="px-3 py-2 text-muted-foreground">{kindLabel((term as any).kind)}</td>
                          <td className="px-3 py-2 text-center">{term.inTitle ? <Yes /> : <No />}</td>
                          <td className="px-3 py-2 text-center">{term.inH1 ? <Yes /> : <No />}</td>
                          <td className="px-3 py-2 text-center">{term.inSubheadings ? <Yes /> : <No />}</td>
                          <td className="px-3 py-2 text-center">{term.inFirstParagraph ? <Yes /> : <No />}</td>
                          <td className="px-3 py-2 text-center">{term.inAltText ? <Yes /> : <No />}</td>
                          <td className="px-3 py-2 text-center">{term.inBody ? <Yes /> : <No />}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {result.recommendations.length > 0 && (
              <div className="rounded-lg border-l-4 border-l-primary border border-border p-4 bg-blue-50/40 dark:bg-blue-950/20">
                <p className="text-sm font-semibold text-foreground mb-2 flex items-center gap-2"><Sparkles className="w-4 h-4 text-primary" />{t('master.ads.adMatch.recommendations')}</p>
                <ul className="space-y-1.5">
                  {result.recommendations.map((r, i) => (
                    <li key={i} className="text-sm text-foreground flex items-start gap-2">
                      <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
                      <span>{r}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AdsCompareTab({ url }: { url: string }) {
  const { t } = useTranslation();
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(["", ""]);
  const [comparisonResult, setComparisonResult] = useState<AdsComparisonResult | null>(null);
  const { toast } = useToast();

  const compareMutation = useMutation({
    mutationFn: async (urls: string[]) => {
      const response = await apiRequest("POST", "/api/ads-compare", { urls });
      return response.json();
    },
    onSuccess: (data: AdsComparisonResult) => {
      setComparisonResult(data);
    },
    onError: (error: any) => {
      toast({ title: t('master.compare.comparisonFailedTitle'), description: error.message || t('master.compare.somethingWentWrong'), variant: "destructive" });
    },
  });

  const handleCompare = () => {
    const validUrls = [url, ...competitorUrls.filter(u => u.trim().length > 0)];
    if (validUrls.length < 2) {
      toast({ title: t('master.compare.needCompetitorTitle'), description: t('master.compare.needCompetitorDescription'), variant: "destructive" });
      return;
    }
    compareMutation.mutate(validUrls);
  };

  const addCompetitor = () => {
    if (competitorUrls.length < 2) {
      setCompetitorUrls([...competitorUrls, ""]);
    }
  };

  const ratingColors: Record<string, string> = {
    "Above average": "text-green-600",
    "Average": "text-yellow-600",
    "Below average": "text-red-600",
  };

  const metricLabels = [
    { key: "ttfb", label: "TTFB", suffix: "ms", isLowerBetter: true },
  ];

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">{t('master.compare.competitorAdsComparison')}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t('master.compare.compareAdsDescription')}</p>
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('master.compare.yourUrl')}</label>
              <Input value={url} disabled className="mt-1 bg-muted/50" />
            </div>
            {competitorUrls.map((compUrl, i) => (
              <div key={i}>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('master.compare.competitorLabel', { count: i + 1 })}</label>
                <Input
                  value={compUrl}
                  onChange={(e) => {
                    const updated = [...competitorUrls];
                    updated[i] = e.target.value;
                    setCompetitorUrls(updated);
                  }}
                  placeholder={t('master.compare.competitorPlaceholder')}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleCompare} disabled={compareMutation.isPending}>
              {compareMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('master.compare.comparing')}</>
              ) : (
                <><Users className="w-4 h-4 mr-2" />{t('tabs.compare')}</>
              )}
            </Button>
            {competitorUrls.length < 2 && (
              <Button variant="outline" size="sm" onClick={addCompetitor}>{t('master.compare.addCompetitor')}</Button>
            )}
          </div>
        </CardContent>
      </Card>
      {comparisonResult && (
        <div className="space-y-6">
          <Card className="rounded-xl border border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-bold text-foreground">{t('master.compare.comparisonSummary')}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{comparisonResult.summary}</p>
            </CardContent>
          </Card>
          <div className={`grid grid-cols-1 ${comparisonResult.analyses.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4`}>
            {comparisonResult.analyses.map((analysis, i) => {
              const isWinner = analysis.url === comparisonResult.winner;
              return (
                <Card key={i} className={`rounded-xl border shadow-sm ${isWinner ? "border-2 border-yellow-400 dark:border-yellow-600" : "border-border"}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-mono truncate">{new URL(analysis.url).hostname}</p>
                        {isWinner && <Badge className="bg-yellow-500 text-white mt-1">{t('master.compare.winner')}</Badge>}
                        {(analysis as any).errorCode && isFetchErrorCode((analysis as any).errorCode) && (
                          <div className="mt-2"><CompareBlockedBadge code={(analysis as any).errorCode} /></div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-3xl font-bold ${analysis.score >= 70 ? "text-green-600" : analysis.score >= 40 ? "text-yellow-600" : "text-red-600"}`}>{analysis.score}</p>
                        <p className={`text-xs font-medium ${ratingColors[analysis.rating] || "text-gray-600"}`}>{analysis.rating}</p>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 mb-4 text-xs">
                      <div className="flex items-center gap-1">
                        <StatusIcon pass={analysis.cdnDetected} />
                        <span>{t('master.ads.cdn')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <StatusIcon pass={analysis.cacheHealthy} />
                        <span>{t('master.ads.cache')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <StatusIcon pass={analysis.redirectHops === 0} />
                        <span>{t('master.ads.noRedirects')}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <StatusIcon pass={analysis.mobileUxGood} />
                        <span>{t('master.ads.mobileUx')}</span>
                      </div>
                    </div>
                    <div className="mb-4">
                      <div className="flex justify-between text-xs mb-0.5">
                        <span className="text-muted-foreground">{t('master.ads.ttfb')}</span>
                        <span className="font-medium">{analysis.ttfb}ms</span>
                      </div>
                      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                        <div className={`h-full rounded-full ${analysis.ttfb <= 200 ? "bg-green-500" : analysis.ttfb <= 500 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${Math.max(5, Math.min(100, 100 - (analysis.ttfb / 10)))}%` }} />
                      </div>
                    </div>
                    {analysis.keyStrengths.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('master.compare.strengths')}</p>
                        <div className="space-y-1">
                          {analysis.keyStrengths.map((s, j) => (
                            <div key={j} className="flex items-center gap-1 text-xs"><CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" /><span className="text-foreground">{s}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.keyWeaknesses.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('master.compare.weaknesses')}</p>
                        <div className="space-y-1">
                          {analysis.keyWeaknesses.map((w, j) => (
                            <div key={j} className="flex items-center gap-1 text-xs"><XCircle className="w-3 h-3 text-red-500 flex-shrink-0" /><span className="text-foreground">{w}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AeoSummary({ data }: { data: any }) {
  const { t } = useTranslation();
  const results = data.results as AeoAnalysisResults;

  const ratingConfig: Record<string, { color: string; bg: string; border: string; badgeClass: string }> = {
    "Highly Optimized": { color: "text-green-600", bg: "bg-green-50 dark:bg-green-950", border: "border-green-200 dark:border-green-800", badgeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    "AI-Ready": { color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950", border: "border-blue-200 dark:border-blue-800", badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    "Partially Ready": { color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950", border: "border-yellow-200 dark:border-yellow-800", badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    "Not Ready": { color: "text-red-600", bg: "bg-red-50 dark:bg-red-950", border: "border-red-200 dark:border-red-800", badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  };
  const rc = ratingConfig[results.rating] || ratingConfig["Partially Ready"];
  const ratingKeyMap: Record<string, string> = {
    "Highly Optimized": "master.ratings.highlyOptimized",
    "AI-Ready": "master.ratings.aiReady",
    "Partially Ready": "master.ratings.partiallyReady",
    "Not Ready": "master.ratings.notReady",
  };
  const ratingLabel = ratingKeyMap[results.rating] ? t(ratingKeyMap[results.rating]) : results.rating;

  const categories = [
    { label: t('master.aeo.structuredData'), score: results.structuredDataScore, icon: FileText, color: "#3b82f6" },
    { label: t('master.aeo.contentFormat'), score: results.contentFormatScore, icon: LayoutGrid, color: "#8b5cf6" },
    { label: t('master.aeo.authority'), score: results.authorityScore, icon: Shield, color: "#f59e0b" },
    { label: t('master.aeo.semantic'), score: results.semanticScore, icon: Brain, color: "#10b981" },
    { label: t('master.aeo.aiAccessibility'), score: results.aiAccessibilityScore, icon: Sparkles, color: "#ec4899" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className={`rounded-xl border-2 ${rc.border} shadow-sm p-6`}>
            <CardContent className="p-0">
              <div className="flex items-center space-x-6">
                <ProgressRing value={results.score} size={80} strokeWidth={8} />
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-foreground">{t('master.aeo.readinessScore')}</h3>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${rc.badgeClass}`}>
                      <Sparkles className="w-4 h-4" />{ratingLabel}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {categories.map((cat) => {
          const CatIcon = cat.icon;
          return (
            <Card key={cat.label} className="text-center p-4">
              <div className="flex justify-center mb-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + "20" }}>
                  <CatIcon className="w-5 h-5" style={{ color: cat.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold" style={{ color: cat.color }}>{cat.score}</div>
              <div className="text-xs text-muted-foreground mt-1">{cat.label}</div>
              <Progress value={cat.score} className="mt-2 h-1.5" />
            </Card>
          );
        })}
      </div>

      {(() => {
        const score = results.score;
        const snippetChance = Math.min(Math.round(score * 0.8), 75);
        const aiQueryShare = Math.round(15 + score * 0.3);
        if (score >= 80) return null;
        return (
          <Card className="rounded-xl border-2 border-violet-200 dark:border-violet-800 bg-gradient-to-r from-violet-50 to-purple-50 dark:from-violet-950/40 dark:to-purple-950/40 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-violet-100 dark:bg-violet-900 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Brain className="w-6 h-6 text-violet-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    {t('master.aeo.aiSearchOpportunity')}
                    <Badge className="bg-violet-100 text-violet-800 dark:bg-violet-900 dark:text-violet-200 text-[10px]">{t('master.aeo.aeoScoreBadge', { score })}</Badge>
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('master.aeo.aiSearchOpportunityText', { snippetChance, aiQueryShare })}
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="bg-white dark:bg-violet-950 rounded-lg px-4 py-2 border border-violet-200 dark:border-violet-800">
                      <p className="text-xs text-muted-foreground">{t('master.aeo.potentialAiCitationRate')}</p>
                      <p className="text-lg font-bold text-violet-600">{snippetChance}%</p>
                      <p className="text-[10px] text-muted-foreground">{t('master.aeo.ofRelevantAiQueries')}</p>
                    </div>
                    <div className="bg-white dark:bg-violet-950 rounded-lg px-4 py-2 border border-violet-200 dark:border-violet-800">
                      <p className="text-xs text-muted-foreground">{t('master.aeo.growingQueryShare')}</p>
                      <p className="text-lg font-bold text-violet-600">~{aiQueryShare}%</p>
                      <p className="text-[10px] text-muted-foreground">{t('master.aeo.ofSearchesUseAi')}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">{t('master.aeo.disclaimer')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

function AeoSection({ data, url, paidTier, onUpgrade }: { data: any; url: string; paidTier: string; onUpgrade: (tier: 'basic' | 'pro') => void }) {
  const { t } = useTranslation();
  const results = data.results as AeoAnalysisResults;
  const recommendations = data.recommendations as AeoRecommendation[];

  return (
    <div className="space-y-6">
      {paidTier === 'free' ? (
        <FreeKeyFindings
          items={results.checks.map((c: AeoCheck) => ({ name: c.name, impact: c.impact || '', status: c.status }))}
          onUpgrade={onUpgrade}
        />
      ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">{t('master.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="checks">{t('tabs.checks')}</TabsTrigger>
            <TabsTrigger value="ai-preview">{t('tabs.aiPreview')}</TabsTrigger>
            <TabsTrigger value="schema">{t('tabs.schema')}</TabsTrigger>
            <TabsTrigger value="content-gaps">{t('tabs.contentGaps')}</TabsTrigger>
            <TabsTrigger value="citation">{t('tabs.citations')}</TabsTrigger>
            <TabsTrigger value="compare">{t('tabs.compare')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <AeoCategoryOverview results={results} />
          </TabsContent>

          <TabsContent value="checks">
            <div className="space-y-6">
              <AeoChecksDetail checks={results.checks} paidTier={paidTier} />
              {paidTier === 'pro' && recommendations.length > 0 && <AeoRecommendationsList recommendations={recommendations} />}
            </div>
          </TabsContent>

          <TabsContent value="ai-preview">
            <AeoAiSearchPreviewCard preview={results.aiSearchPreview} />
          </TabsContent>

          <TabsContent value="schema">
            <AeoSchemaGeneratorCard suggestions={results.schemaSuggestions} />
          </TabsContent>

          <TabsContent value="content-gaps">
            <AeoContentGapCard gaps={results.contentGaps} />
          </TabsContent>

          <TabsContent value="citation">
            <AeoCitationCard citation={results.citationLikelihood} />
          </TabsContent>

          <TabsContent value="compare">
            <AeoCompareTab url={url} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function AeoCompareTab({ url }: { url: string }) {
  const { t } = useTranslation();
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(["", ""]);
  const [comparisonResult, setComparisonResult] = useState<AeoComparisonResult | null>(null);
  const { toast } = useToast();

  const compareMutation = useMutation({
    mutationFn: async (urls: string[]) => {
      const response = await apiRequest("POST", "/api/aeo-compare", { urls });
      return response.json();
    },
    onSuccess: (data: AeoComparisonResult) => {
      setComparisonResult(data);
    },
    onError: (error: any) => {
      toast({ title: t('master.compare.comparisonFailedTitle'), description: error.message || t('master.compare.somethingWentWrong'), variant: "destructive" });
    },
  });

  const handleCompare = () => {
    const validUrls = [url, ...competitorUrls.filter(u => u.trim().length > 0)];
    if (validUrls.length < 2) {
      toast({ title: t('master.compare.needCompetitorTitle'), description: t('master.compare.needCompetitorDescription'), variant: "destructive" });
      return;
    }
    compareMutation.mutate(validUrls);
  };

  const addCompetitor = () => {
    if (competitorUrls.length < 2) {
      setCompetitorUrls([...competitorUrls, ""]);
    }
  };

  const ratingColors: Record<string, string> = {
    "Highly Optimized": "text-green-600",
    "AI-Ready": "text-blue-600",
    "Partially Ready": "text-yellow-600",
    "Not Ready": "text-red-600",
  };

  const categoryLabels = [
    { key: "structuredDataScore", label: t('master.aeo.structuredData') },
    { key: "contentFormatScore", label: t('master.aeo.contentFormat') },
    { key: "authorityScore", label: t('master.aeo.authority') },
    { key: "semanticScore", label: t('master.aeo.semantic') },
    { key: "aiAccessibilityScore", label: t('master.aeo.aiAccessibility') },
    { key: "citationScore", label: t('master.aeo.citations') },
  ];

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">{t('master.compare.competitorAeoComparison')}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t('master.compare.compareAeoDescription')}</p>

          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('master.compare.yourUrl')}</label>
              <Input value={url} disabled className="mt-1 bg-muted/50" />
            </div>
            {competitorUrls.map((compUrl, i) => (
              <div key={i}>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('master.compare.competitorLabel', { count: i + 1 })}</label>
                <Input
                  value={compUrl}
                  onChange={(e) => {
                    const updated = [...competitorUrls];
                    updated[i] = e.target.value;
                    setCompetitorUrls(updated);
                  }}
                  placeholder={t('master.compare.competitorPlaceholder')}
                  className="mt-1"
                />
              </div>
            ))}
          </div>

          <div className="flex items-center gap-3">
            <Button onClick={handleCompare} disabled={compareMutation.isPending}>
              {compareMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('master.compare.comparing')}</>
              ) : (
                <><Users className="w-4 h-4 mr-2" />{t('tabs.compare')}</>
              )}
            </Button>
            {competitorUrls.length < 2 && (
              <Button variant="outline" size="sm" onClick={addCompetitor}>{t('master.compare.addCompetitor')}</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {comparisonResult && (
        <div className="space-y-6">
          <Card className="rounded-xl border border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-bold text-foreground">{t('master.compare.comparisonSummary')}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{comparisonResult.summary}</p>
            </CardContent>
          </Card>

          <div className={`grid grid-cols-1 ${comparisonResult.analyses.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4`}>
            {comparisonResult.analyses.map((analysis, i) => {
              const isWinner = analysis.url === comparisonResult.winner;
              return (
                <Card key={i} className={`rounded-xl border shadow-sm ${isWinner ? "border-2 border-yellow-400 dark:border-yellow-600" : "border-border"}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-mono truncate">{new URL(analysis.url).hostname}</p>
                        {isWinner && <Badge className="bg-yellow-500 text-white mt-1">{t('master.compare.winner')}</Badge>}
                        {(analysis as any).errorCode && isFetchErrorCode((analysis as any).errorCode) && (
                          <div className="mt-2"><CompareBlockedBadge code={(analysis as any).errorCode} /></div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-3xl font-bold ${analysis.score >= 70 ? "text-green-600" : analysis.score >= 40 ? "text-yellow-600" : "text-red-600"}`}>{analysis.score}</p>
                        <p className={`text-xs font-medium ${ratingColors[analysis.rating] || "text-gray-600"}`}>{analysis.rating}</p>
                      </div>
                    </div>

                    <div className="space-y-2 mb-4">
                      {categoryLabels.map((cat) => {
                        const val = (analysis as any)[cat.key] as number;
                        return (
                          <div key={cat.key}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-muted-foreground">{cat.label}</span>
                              <span className="font-medium">{val}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${val >= 70 ? "bg-green-500" : val >= 40 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${val}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {analysis.keyStrengths.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('master.compare.strengths')}</p>
                        <div className="space-y-1">
                          {analysis.keyStrengths.map((s, j) => (
                            <div key={j} className="flex items-center gap-1 text-xs">
                              <CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" />
                              <span className="text-foreground">{s}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {analysis.keyWeaknesses.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('master.compare.weaknesses')}</p>
                        <div className="space-y-1">
                          {analysis.keyWeaknesses.map((w, j) => (
                            <div key={j} className="flex items-center gap-1 text-xs">
                              <XCircle className="w-3 h-3 text-red-500 flex-shrink-0" />
                              <span className="text-foreground">{w}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function AeoCitationCard({ citation }: { citation: CitationLikelihood }) {
  const { t } = useTranslation();
  const ratingColors: Record<string, string> = { "Very Likely": "text-green-600", "Likely": "text-blue-600", "Possible": "text-yellow-600", "Unlikely": "text-red-600" };
  const ratingBg: Record<string, string> = { "Very Likely": "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200", "Likely": "bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200", "Possible": "bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200", "Unlikely": "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200" };

  return (
    <Card className="rounded-xl border border-border shadow-sm p-6" data-testid="citation-likelihood">
      <CardContent className="p-0">
        <div className="flex items-center gap-2 mb-4">
          <Target className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">{t('master.aeo.citationLikelihood')}</h3>
        </div>
        <div className="flex items-center gap-4 mb-4">
          <div className={`text-4xl font-bold ${ratingColors[citation.rating] || "text-gray-600"}`}>{citation.score}</div>
          <div>
            <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${ratingBg[citation.rating] || ""}`}>
              <Zap className="w-3 h-3" />{citation.rating}
            </span>
            <p className="text-xs text-muted-foreground mt-1">{t('master.aeo.outOf100')}</p>
          </div>
        </div>
        <div className="space-y-2">
          {citation.factors.map((factor, i) => (
            <div key={i} className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground truncate mr-2">{factor.name}</span>
              <div className="flex items-center gap-2">
                <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${factor.score >= factor.maxScore * 0.7 ? "bg-green-500" : factor.score >= factor.maxScore * 0.3 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${(factor.score / factor.maxScore) * 100}%` }} />
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

function AeoCategoryOverview({ results }: { results: AeoAnalysisResults }) {
  const { t } = useTranslation();
  const cats = [
    { name: t('master.aeo.structuredData'), icon: Database, color: "purple", score: results.structuredDataScore, metrics: [{ label: "JSON-LD", value: results.structuredData.jsonLdPresent }, { label: "FAQ Schema", value: results.structuredData.faqSchema }, { label: "Organization Schema", value: results.structuredData.organizationSchema }] },
    { name: t('master.aeo.contentFormat'), icon: FileText, color: "blue", score: results.contentFormatScore, metrics: [{ label: t('master.aeo.questionHeadings'), value: results.contentFormat.hasQuestionHeadings }, { label: t('master.aeo.directAnswers'), value: results.contentFormat.directAnswerParagraphs > 0 }, { label: t('master.aeo.listsTables'), value: results.contentFormat.hasLists || results.contentFormat.hasTables }] },
    { name: t('master.aeo.authorityAndEeat'), icon: Shield, color: "amber", score: results.authorityScore, metrics: [{ label: t('master.aeo.authorInfo'), value: results.authority.hasAuthorInfo }, { label: t('master.aeo.citations'), value: results.authority.hasCitations }, { label: t('master.aeo.datePublished'), value: results.authority.hasDatePublished }] },
    { name: t('master.aeo.semanticStructure'), icon: Code, color: "green", score: results.semanticScore, metrics: [{ label: t('master.aeo.headingHierarchy'), value: results.semantic.headingHierarchyValid }, { label: t('master.aeo.semanticHtml'), value: results.semantic.usesSemanticHtml }, { label: t('master.aeo.tableOfContents'), value: results.semantic.hasTableOfContents }] },
    { name: t('master.aeo.aiAccessibility'), icon: Globe, color: "indigo", score: results.aiAccessibilityScore, metrics: [{ label: t('master.aeo.aiCrawlers'), value: results.aiAccessibility.robotsTxtAllowsAi }, { label: t('keywords.metaDescription'), value: results.aiAccessibility.hasMetaDescription }, { label: t('master.aeo.canonicalUrl'), value: results.aiAccessibility.hasCanonicalUrl }] },
  ];
  const getIconBg = (c: string) => ({ purple: "bg-purple-100 dark:bg-purple-900", blue: "bg-blue-100 dark:bg-blue-900", amber: "bg-amber-100 dark:bg-amber-900", green: "bg-green-100 dark:bg-green-900", indigo: "bg-indigo-100 dark:bg-indigo-900" }[c] || "bg-gray-100");
  const getIconColor = (c: string) => ({ purple: "text-purple-600", blue: "text-blue-600", amber: "text-amber-600", green: "text-green-600", indigo: "text-indigo-600" }[c] || "text-gray-600");

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
      {cats.map((cat) => {
        const CatIcon = cat.icon;
        return (
          <Card key={cat.name} className="rounded-xl border border-border shadow-sm p-5">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${getIconBg(cat.color)} rounded-lg flex items-center justify-center`}>
                    <CatIcon className={`w-5 h-5 ${getIconColor(cat.color)}`} />
                  </div>
                  <h3 className="text-base font-semibold text-foreground">{cat.name}</h3>
                </div>
                <span className={`text-2xl font-bold ${cat.score >= 70 ? "text-green-600" : cat.score >= 40 ? "text-yellow-600" : "text-red-600"}`}>{cat.score}</span>
              </div>
              <div className="space-y-2 mt-3">
                {cat.metrics.map((m) => (
                  <div key={m.label} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{m.label}</span>
                    {m.value ? <CheckCircle2 className="w-4 h-4 text-green-600" /> : <XCircle className="w-4 h-4 text-red-400" />}
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

function AeoAiSearchPreviewCard({ preview }: { preview: AiSearchPreview }) {
  const { t } = useTranslation();
  const [expanded, setExpanded] = useState(false);
  const qualityColors: Record<string, string> = { High: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200", Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", Low: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" };
  const typeLabels: Record<string, string> = { answer: "Direct Answer", faq: "FAQ", definition: "Definition", statistic: "Statistic", list: "List" };
  const typeColors: Record<string, string> = { answer: "bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300", faq: "bg-purple-100 text-purple-700 dark:bg-purple-900 dark:text-purple-300", definition: "bg-teal-100 text-teal-700 dark:bg-teal-900 dark:text-teal-300", statistic: "bg-amber-100 text-amber-700 dark:bg-amber-900 dark:text-amber-300", list: "bg-indigo-100 text-indigo-700 dark:bg-indigo-900 dark:text-indigo-300" };

  return (
    <Card className="rounded-xl border border-border shadow-sm" data-testid="ai-search-preview">
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-primary" />
            <h3 className="text-xl font-bold text-foreground">{t('master.aeo.aiSearchPreview')}</h3>
          </div>
          <span className={`px-2.5 py-0.5 rounded-full text-xs font-medium ${qualityColors[preview.extractionQuality]}`}>{preview.extractionQuality} Extraction Quality</span>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{preview.extractionDetails}</p>
        <div className="bg-muted/50 rounded-lg border border-border p-4 mb-4">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-blue-500" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{t('master.aeo.simulatedAiCitation')}</span>
          </div>
          <p className="text-sm font-medium text-foreground mb-1">{preview.simulatedCitation.title}</p>
          <p className="text-sm text-muted-foreground">{preview.simulatedCitation.snippet}</p>
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">{preview.simulatedCitation.url}</p>
        </div>
        {preview.quotableExcerpts.length > 0 && (
          <>
            <button onClick={() => setExpanded(!expanded)} className="flex items-center gap-2 text-sm font-medium text-primary hover:text-primary/80 transition-colors mb-3" data-testid="preview-excerpts-toggle">
              <span>Quotable Excerpts ({preview.quotableExcerpts.length})</span>
              {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
            {expanded && (
              <div className="space-y-3 animate-in slide-in-from-top-2 duration-200">
                {preview.quotableExcerpts.map((excerpt, i) => (
                  <div key={i} className="border border-border rounded-lg p-3">
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${typeColors[excerpt.type] || "bg-gray-100 text-gray-700"}`}>{typeLabels[excerpt.type] || excerpt.type}</span>
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

function AeoSchemaGeneratorCard({ suggestions }: { suggestions: SchemaSuggestion[] }) {
  const { t } = useTranslation();
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
  const priorityColors: Record<string, string> = { Critical: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", High: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", Medium: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", Low: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" };

  return (
    <Card className="rounded-xl border border-border shadow-sm" data-testid="schema-generator">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <Code className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">{t('master.aeo.schemaMarkupGenerator')}</h3>
        </div>
        <p className="text-sm text-muted-foreground mb-4">{t('master.aeo.schemaMarkupDescription')}</p>
        {present.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{t('master.aeo.alreadyPresent')}</p>
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
            return (
              <div key={i} className="border border-border rounded-lg p-3">
                <div className="flex items-center justify-between mb-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-foreground">{suggestion.label}</span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${priorityColors[suggestion.priority]}`}>{suggestion.priority}</span>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => setExpandedIndex(isExpanded ? null : i)} className="p-1 text-muted-foreground hover:text-foreground transition-colors" data-testid="schema-toggle">
                      {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                    </button>
                    <button onClick={() => copyToClipboard(suggestion.code, i)} className="p-1 text-muted-foreground hover:text-foreground transition-colors" data-testid="schema-copy">
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

function AeoContentGapCard({ gaps }: { gaps: ContentGapsAnalysis }) {
  const { t } = useTranslation();
  const typeIcons: Record<string, typeof HelpCircle> = { what: HelpCircle, how: Wrench, why: Brain, comparison: BarChart3, best: Trophy, cost: TrendingUp };

  return (
    <Card className="rounded-xl border border-border shadow-sm" data-testid="content-gaps">
      <CardContent className="p-6">
        <div className="flex items-center gap-2 mb-4">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h3 className="text-lg font-bold text-foreground">{t('master.aeo.contentGapFinder')}</h3>
        </div>
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1">
            <div className="flex items-center justify-between text-sm mb-1">
              <span className="text-muted-foreground">{t('master.aeo.topicCoverage')}</span>
              <span className="font-semibold text-foreground">{gaps.coverageScore}%</span>
            </div>
            <div className="h-2 bg-muted rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all ${gaps.coverageScore >= 70 ? "bg-green-500" : gaps.coverageScore >= 40 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${gaps.coverageScore}%` }} />
            </div>
          </div>
        </div>
        <p className="text-sm text-muted-foreground mb-3">{gaps.coverageDetails}</p>
        {gaps.topicKeywords.length > 0 && (
          <div className="mb-4">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{t('master.aeo.detectedTopics')}</p>
            <div className="flex flex-wrap gap-1.5">
              {gaps.topicKeywords.map((kw, i) => (
                <span key={i} className="px-2 py-0.5 rounded bg-primary/10 text-primary text-xs font-medium">{kw}</span>
              ))}
            </div>
          </div>
        )}
        {gaps.missingQuestions.length > 0 && (
          <div>
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">{t('master.aeo.missingQuestions')}</p>
            <div className="space-y-2">
              {gaps.missingQuestions.map((gap, i) => {
                const GapIcon = typeIcons[gap.type] || HelpCircle;
                return (
                  <div key={i} className="flex items-start gap-2 p-2 rounded-lg border border-border">
                    <GapIcon className="w-4 h-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{gap.question}</p>
                      <p className="text-xs text-muted-foreground">{gap.reason}</p>
                    </div>
                    <span className={`px-1.5 py-0.5 rounded text-xs font-medium flex-shrink-0 ${gap.relevance === "High" ? "bg-red-100 text-red-700 dark:bg-red-900 dark:text-red-300" : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900 dark:text-yellow-300"}`}>{gap.relevance}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}
        {gaps.missingQuestions.length === 0 && (
          <div className="flex items-center gap-2 p-3 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
            <CheckCircle2 className="w-5 h-5 text-green-600" />
            <span className="text-sm text-green-800 dark:text-green-200">{t('master.aeo.contentCoversQuestions')}</span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function AeoChecksDetail({ checks, paidTier }: { checks: AeoCheck[]; paidTier: string }) {
  const { t } = useTranslation();
  const groupedChecks: Record<string, AeoCheck[]> = {};
  for (const check of checks) {
    if (!groupedChecks[check.category]) groupedChecks[check.category] = [];
    groupedChecks[check.category].push(check);
  }
  const categoryLabels: Record<string, { label: string; icon: typeof Database }> = {
    "structured-data": { label: t('master.aeo.structuredData'), icon: Database },
    "content-format": { label: t('master.aeo.contentFormat'), icon: FileText },
    "authority": { label: t('master.aeo.authorityAndEeat'), icon: Shield },
    "technical": { label: t('master.aeo.semanticStructure'), icon: Code },
    "discoverability": { label: t('master.aeo.aiAccessibility'), icon: Globe },
  };

  return (
    <Card className="rounded-xl border border-border shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-2">{t('master.ads.detailedCheckResults')}</h3>
        {paidTier === 'pro' && <p className="text-sm text-muted-foreground mb-6">{t('master.aeo.technicalFixGuideHint')}</p>}
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
                        <p className="text-sm"><span className="font-medium text-foreground">{t('master.common.impact')}:</span> <span className="text-muted-foreground">{check.impact}</span></p>
                        {paidTier === 'pro' && check.status !== "PASS" && (
                          <p className="text-sm"><span className="font-medium text-foreground">{t('common.fix')}</span> <span className="text-muted-foreground">{check.recommendation}</span></p>
                        )}
                      </div>
                      {paidTier === 'pro' && check.status !== "PASS" && check.technicalFix && <TechnicalFixBlock technicalFix={check.technicalFix} />}
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

function AeoRecommendationsList({ recommendations }: { recommendations: AeoRecommendation[] }) {
  const { t } = useTranslation();
  const priorityConfig: Record<string, { color: string; border: string }> = {
    Critical: { color: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200", border: "border-l-red-500" },
    High: { color: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200", border: "border-l-orange-500" },
    Medium: { color: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200", border: "border-l-yellow-500" },
    Low: { color: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200", border: "border-l-blue-500" },
  };

  return (
    <Card className="rounded-xl border border-border shadow-sm">
      <CardContent className="p-6">
        <h3 className="text-xl font-bold text-foreground mb-6">{t('master.aeo.recommendations')}</h3>
        <div className="space-y-4">
          {recommendations.map((rec, idx) => {
            const pc = priorityConfig[rec.priority] || priorityConfig["Medium"];
            return (
              <div key={idx} className={`border-l-4 ${pc.border} rounded-lg border border-border p-5`}>
                <div className="flex items-center gap-3 mb-2">
                  <h4 className="text-base font-semibold text-foreground">{rec.title}</h4>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${pc.color}`}>{rec.priority}</span>
                </div>
                <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                <p className="text-sm text-muted-foreground mb-3 italic">{rec.impact}</p>
                {rec.actionItems.length > 0 && (
                  <ul className="space-y-1">
                    {rec.actionItems.map((item, i) => (
                      <li key={i} className="text-sm text-foreground flex items-start gap-2">
                        <ArrowRight className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />{item}
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

function GeoSummary({ data }: { data: any }) {
  const { t } = useTranslation();
  const results = data.results as GeoAnalysisResults;

  const ratingConfig: Record<string, { color: string; bg: string; border: string; badgeClass: string }> = {
    "Highly Optimized": { color: "text-green-600", bg: "bg-green-50 dark:bg-green-950", border: "border-green-200 dark:border-green-800", badgeClass: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200" },
    "Optimized": { color: "text-blue-600", bg: "bg-blue-50 dark:bg-blue-950", border: "border-blue-200 dark:border-blue-800", badgeClass: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200" },
    "Emerging": { color: "text-yellow-600", bg: "bg-yellow-50 dark:bg-yellow-950", border: "border-yellow-200 dark:border-yellow-800", badgeClass: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200" },
    "Not Ready": { color: "text-red-600", bg: "bg-red-50 dark:bg-red-950", border: "border-red-200 dark:border-red-800", badgeClass: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200" },
  };
  const rc = ratingConfig[results.rating] || ratingConfig["Emerging"];
  const ratingKeyMap: Record<string, string> = {
    "Highly Optimized": "master.ratings.highlyOptimized",
    "Optimized": "master.ratings.optimized",
    "Emerging": "master.ratings.emerging",
    "Not Ready": "master.ratings.notReady",
  };
  const ratingLabel = ratingKeyMap[results.rating] ? t(ratingKeyMap[results.rating]) : results.rating;

  const categories = [
    { label: t('master.geo.sourceAuthority'), score: results.sourceAuthorityScore, icon: Shield, color: "#3b82f6" },
    { label: t('master.geo.contentFluency'), score: results.contentFluencyScore, icon: FileText, color: "#8b5cf6" },
    { label: t('master.geo.uniqueValue'), score: results.uniqueValueScore, icon: Sparkles, color: "#f59e0b" },
    { label: t('master.geo.entityOptimization'), score: results.entityOptimizationScore, icon: Target, color: "#10b981" },
    { label: t('master.geo.multiFormat'), score: results.multiFormatScore, icon: LayoutGrid, color: "#ec4899" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2">
          <Card className={`rounded-xl border-2 ${rc.border} shadow-sm p-6`}>
            <CardContent className="p-0">
              <div className="flex items-center space-x-6">
                <ProgressRing value={results.score} size={80} strokeWidth={8} />
                <div>
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="text-xl font-bold text-foreground">{t('master.geo.readinessScore')}</h3>
                    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-semibold ${rc.badgeClass}`}>
                      <Atom className="w-4 h-4" />{ratingLabel}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{t('master.geo.generativeReadiness', { score: results.generativeReadinessScore })}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {categories.map((cat) => {
          const CatIcon = cat.icon;
          return (
            <Card key={cat.label} className="text-center p-4">
              <div className="flex justify-center mb-2">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + "20" }}>
                  <CatIcon className="w-5 h-5" style={{ color: cat.color }} />
                </div>
              </div>
              <div className="text-2xl font-bold" style={{ color: cat.color }}>{cat.score}</div>
              <div className="text-xs text-muted-foreground mt-1">{cat.label}</div>
              <Progress value={cat.score} className="mt-2 h-1.5" />
            </Card>
          );
        })}
      </div>

      {(() => {
        const score = results.score;
        if (score >= 80) return null;
        const citationBoost = Math.min(Math.round((80 - score) * 1.2), 60);
        const trafficPotential = Math.round(citationBoost * 8);
        return (
          <Card className="rounded-xl border-2 border-teal-200 dark:border-teal-800 bg-gradient-to-r from-teal-50 to-cyan-50 dark:from-teal-950/40 dark:to-cyan-950/40 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-teal-100 dark:bg-teal-900 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Atom className="w-6 h-6 text-teal-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    {t('master.geo.generativeEngineImpact')}
                    <Badge className="bg-teal-100 text-teal-800 dark:bg-teal-900 dark:text-teal-200 text-[10px]">{t('master.geo.geoScoreBadge', { score })}</Badge>
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('master.geo.generativeEngineImpactText', { citationBoost, trafficPotential })}
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="bg-white dark:bg-teal-950 rounded-lg px-4 py-2 border border-teal-200 dark:border-teal-800">
                      <p className="text-xs text-muted-foreground">{t('master.geo.potentialCitationIncrease')}</p>
                      <p className="text-lg font-bold text-teal-600">+{citationBoost}%</p>
                      <p className="text-[10px] text-muted-foreground">{t('master.geo.inAiGeneratedResults')}</p>
                    </div>
                    <div className="bg-white dark:bg-teal-950 rounded-lg px-4 py-2 border border-teal-200 dark:border-teal-800">
                      <p className="text-xs text-muted-foreground">{t('master.geo.estimatedAdditionalAiTraffic')}</p>
                      <p className="text-lg font-bold text-teal-600">~{trafficPotential}/mo</p>
                      <p className="text-[10px] text-muted-foreground">{t('master.geo.fromGenerativeEngines')}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">{t('master.geo.disclaimer')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

function GeoSection({ data, url, paidTier, onUpgrade }: { data: any; url: string; paidTier: string; onUpgrade: (tier: 'basic' | 'pro') => void }) {
  const { t } = useTranslation();
  const results = data.results as GeoAnalysisResults;

  const categories = [
    { label: t('master.geo.sourceAuthority'), score: results.sourceAuthorityScore, icon: Shield, color: "#3b82f6" },
    { label: t('master.geo.contentFluency'), score: results.contentFluencyScore, icon: FileText, color: "#8b5cf6" },
    { label: t('master.geo.uniqueValue'), score: results.uniqueValueScore, icon: Sparkles, color: "#f59e0b" },
    { label: t('master.geo.entityOptimization'), score: results.entityOptimizationScore, icon: Target, color: "#10b981" },
    { label: t('master.geo.multiFormat'), score: results.multiFormatScore, icon: LayoutGrid, color: "#ec4899" },
  ];

  return (
    <div className="space-y-6">
      {paidTier === 'free' ? (
        <div className="space-y-6">
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            {categories.map((cat) => {
              const CatIcon = cat.icon;
              return (
                <Card key={cat.label} className="text-center p-4">
                  <div className="flex justify-center mb-2">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + "20" }}>
                      <CatIcon className="w-5 h-5" style={{ color: cat.color }} />
                    </div>
                  </div>
                  <div className="text-2xl font-bold" style={{ color: cat.color }}>{cat.score}</div>
                  <div className="text-xs text-muted-foreground mt-1">{cat.label}</div>
                  <Progress value={cat.score} className="mt-2 h-1.5" />
                </Card>
              );
            })}
          </div>
          <FreeKeyFindings
            items={results.checks.map((c: GeoCheck) => ({ name: c.name, impact: c.details || '', status: c.status }))}
            onUpgrade={onUpgrade}
          />
        </div>
      ) : (
        <Tabs defaultValue="overview" className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="overview">{t('master.tabs.overview')}</TabsTrigger>
            <TabsTrigger value="checks">{t('tabs.checks')}</TabsTrigger>
            <TabsTrigger value="compare">{t('tabs.compare')}</TabsTrigger>
          </TabsList>

          <TabsContent value="overview">
            <div className="space-y-6">
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                {categories.map((cat) => {
                  const CatIcon = cat.icon;
                  return (
                    <Card key={cat.label} className="text-center p-4">
                      <div className="flex justify-center mb-2">
                        <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: cat.color + "20" }}>
                          <CatIcon className="w-5 h-5" style={{ color: cat.color }} />
                        </div>
                      </div>
                      <div className="text-2xl font-bold" style={{ color: cat.color }}>{cat.score}</div>
                      <div className="text-xs text-muted-foreground mt-1">{cat.label}</div>
                      <Progress value={cat.score} className="mt-2 h-1.5" />
                    </Card>
                  );
                })}
              </div>

              {results.sourceAuthority && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Shield className="w-4 h-4 text-blue-500" /> {t('master.geo.sourceAuthority')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">{t('master.geo.authorCredentials')}:</span> <Badge variant={results.sourceAuthority.hasAuthorCredentials ? "default" : "destructive"}>{results.sourceAuthority.hasAuthorCredentials ? t('master.common.found') : t('master.common.missing')}</Badge></div>
                    <div><span className="text-muted-foreground">{t('master.aeo.citations')}:</span> <span className="font-medium">{results.sourceAuthority.citationCount}</span></div>
                    <div><span className="text-muted-foreground">{t('master.geo.expertQuotes')}:</span> <span className="font-medium">{results.sourceAuthority.expertQuoteCount}</span></div>
                    <div><span className="text-muted-foreground">{t('master.geo.originalResearch')}:</span> <Badge variant={results.sourceAuthority.hasOriginalResearch ? "default" : "secondary"}>{results.sourceAuthority.hasOriginalResearch ? t('master.common.found') : t('master.common.missing')}</Badge></div>
                  </div>
                  {results.sourceAuthority.trustSignals.length > 0 && (
                    <div className="mt-3 flex flex-wrap gap-1">
                      {results.sourceAuthority.trustSignals.map((s: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{s}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {results.contentFluency && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><FileText className="w-4 h-4 text-purple-500" /> {t('master.geo.contentFluency')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">{t('master.geo.readability')}:</span> <span className="font-medium">{results.contentFluency.readabilityScore}/100</span></div>
                    <div><span className="text-muted-foreground">{t('master.geo.summarizability')}:</span> <span className="font-medium">{results.contentFluency.summarizabilityScore}/100</span></div>
                    <div><span className="text-muted-foreground">{t('master.geo.paragraphClarity')}:</span> <span className="font-medium">{results.contentFluency.paragraphClarity}%</span></div>
                    <div><span className="text-muted-foreground">{t('master.geo.passiveVoice')}:</span> <span className="font-medium">{results.contentFluency.passiveVoicePercentage}%</span></div>
                  </div>
                </CardContent>
              </Card>
            )}

            {results.uniqueValue && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Sparkles className="w-4 h-4 text-yellow-500" /> {t('master.geo.uniqueValue')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div><span className="text-muted-foreground">{t('master.geo.statistics')}:</span> <span className="font-medium">{results.uniqueValue.statisticsCount} {t('master.common.found').toLowerCase()}</span></div>
                    <div><span className="text-muted-foreground">{t('master.geo.originalData')}:</span> <Badge variant={results.uniqueValue.hasOriginalData ? "default" : "secondary"}>{results.uniqueValue.hasOriginalData ? t('legacy.detailedAnalysis.yes') : t('legacy.detailedAnalysis.no')}</Badge></div>
                    <div><span className="text-muted-foreground">{t('master.geo.quotes')}:</span> <span className="font-medium">{results.uniqueValue.quotesCount}</span></div>
                    <div><span className="text-muted-foreground">{t('master.geo.caseStudies')}:</span> <Badge variant={results.uniqueValue.caseStudyPresent ? "default" : "secondary"}>{results.uniqueValue.caseStudyPresent ? t('master.common.found') : t('master.geo.none')}</Badge></div>
                  </div>
                </CardContent>
              </Card>
            )}

            {results.entityOptimization && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><Target className="w-4 h-4 text-green-500" /> {t('master.geo.entityOptimization')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 text-sm mb-3">
                    <div><span className="text-muted-foreground">{t('master.geo.entityDensity')}:</span> <span className="font-medium">{results.entityOptimization.entityDensity}%</span></div>
                    <div><span className="text-muted-foreground">{t('master.geo.headingCoverage')}:</span> <span className="font-medium">{results.entityOptimization.entityCoverage}%</span></div>
                    <div><span className="text-muted-foreground">{t('master.geo.topicalDepth')}:</span> <span className="font-medium">{results.entityOptimization.topicalDepthScore}/100</span></div>
                  </div>
                  {results.entityOptimization.primaryEntities.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      <span className="text-xs text-muted-foreground mr-1">{t('master.geo.primary')}:</span>
                      {results.entityOptimization.primaryEntities.slice(0, 8).map((e: string, i: number) => (
                        <Badge key={i} variant="outline" className="text-xs">{e}</Badge>
                      ))}
                    </div>
                  )}
                  {results.entityOptimization.missingEntities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      <span className="text-xs text-muted-foreground mr-1">{t('master.common.missing')}:</span>
                      {results.entityOptimization.missingEntities.map((e: string, i: number) => (
                        <Badge key={i} variant="destructive" className="text-xs">{e}</Badge>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {results.multiFormat && (
              <Card>
                <CardHeader><CardTitle className="text-base flex items-center gap-2"><LayoutGrid className="w-4 h-4 text-pink-500" /> {t('master.geo.multiFormatReadiness')}</CardTitle></CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 md:grid-cols-6 gap-3 text-sm">
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="font-medium">{results.multiFormat.imageCount}</div>
                      <div className="text-xs text-muted-foreground">{t('master.images.totalImages')}</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="font-medium">{results.multiFormat.videoCount}</div>
                      <div className="text-xs text-muted-foreground">{t('master.geo.videos')}</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="font-medium">{results.multiFormat.tableCount}</div>
                      <div className="text-xs text-muted-foreground">{t('master.geo.tables')}</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="font-medium">{results.multiFormat.hasCharts ? "Yes" : "No"}</div>
                      <div className="text-xs text-muted-foreground">{t('master.geo.charts')}</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="font-medium">{results.multiFormat.hasInteractiveElements ? "Yes" : "No"}</div>
                      <div className="text-xs text-muted-foreground">{t('master.geo.interactive')}</div>
                    </div>
                    <div className="text-center p-2 rounded-lg bg-muted/50">
                      <div className="font-medium">{results.multiFormat.contentFormats.length}</div>
                      <div className="text-xs text-muted-foreground">{t('master.geo.formats')}</div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}
          </div>
        </TabsContent>

          <TabsContent value="checks">
            <div className="space-y-4">
              {results.checks.map((check: GeoCheck, i: number) => (
                <Card key={i} className="p-4">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {check.status === "PASS" ? <CheckCircle2 className="w-5 h-5 text-green-500" /> :
                       check.status === "FAIL" ? <XCircle className="w-5 h-5 text-red-500" /> :
                       <AlertTriangle className="w-5 h-5 text-yellow-500" />}
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{check.name}</span>
                        <Badge variant="outline" className="text-xs">{check.category}</Badge>
                        <Badge variant={check.impact === "High" ? "destructive" : "secondary"} className="text-xs">{check.impact} Impact</Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{check.details}</p>
                      {paidTier === 'pro' && check.status !== "PASS" && (
                        <p className="text-sm mt-1 text-primary">{check.recommendation}</p>
                      )}
                      {paidTier === 'pro' && check.status !== "PASS" && check.technicalFix && (
                        <div className="-ml-7"><TechnicalFixBlock technicalFix={check.technicalFix} /></div>
                      )}
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="compare">
            <GeoCompareTab url={url} />
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function GeoCompareTab({ url }: { url: string }) {
  const { t } = useTranslation();
  const [competitorUrls, setCompetitorUrls] = useState<string[]>(["", ""]);
  const [comparisonResult, setComparisonResult] = useState<GeoComparisonResult | null>(null);
  const { toast } = useToast();

  const compareMutation = useMutation({
    mutationFn: async (urls: string[]) => {
      const response = await apiRequest("POST", "/api/geo-compare", { urls });
      return response.json();
    },
    onSuccess: (data: GeoComparisonResult) => setComparisonResult(data),
    onError: (error: Error) => toast({ title: t('master.compare.comparisonFailedTitle'), description: error.message || t('master.compare.somethingWentWrong'), variant: "destructive" }),
  });

  const handleCompare = () => {
    const validUrls = [url, ...competitorUrls.filter(u => u.trim().length > 0)];
    if (validUrls.length < 2) {
      toast({ title: t('master.compare.needCompetitorTitle'), description: t('master.compare.needCompetitorDescription'), variant: "destructive" });
      return;
    }
    compareMutation.mutate(validUrls);
  };

  const addCompetitor = () => {
    if (competitorUrls.length < 2) {
      setCompetitorUrls([...competitorUrls, ""]);
    }
  };

  const ratingColors: Record<string, string> = {
    "Highly Optimized": "text-green-600",
    "Optimized": "text-blue-600",
    "Emerging": "text-yellow-600",
    "Not Ready": "text-red-600",
  };

  const categoryLabels = [
    { key: "sourceAuthorityScore", label: t('master.geo.sourceAuthority') },
    { key: "contentFluencyScore", label: t('master.geo.contentFluency') },
    { key: "uniqueValueScore", label: t('master.geo.uniqueValue') },
    { key: "entityOptimizationScore", label: t('master.geo.entityOptimization') },
    { key: "multiFormatScore", label: t('master.geo.multiFormat') },
  ];

  return (
    <div className="space-y-6">
      <Card className="rounded-xl border border-border shadow-sm">
        <CardContent className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Users className="w-5 h-5 text-primary" />
            <h3 className="text-lg font-bold text-foreground">{t('master.compare.competitorGeoComparison')}</h3>
          </div>
          <p className="text-sm text-muted-foreground mb-4">{t('master.compare.compareGeoDescription')}</p>
          <div className="space-y-3 mb-4">
            <div>
              <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('master.compare.yourUrl')}</label>
              <Input value={url} disabled className="mt-1 bg-muted/50" />
            </div>
            {competitorUrls.map((compUrl, i) => (
              <div key={i}>
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">{t('master.compare.competitorLabel', { count: i + 1 })}</label>
                <Input
                  value={compUrl}
                  onChange={(e) => {
                    const updated = [...competitorUrls];
                    updated[i] = e.target.value;
                    setCompetitorUrls(updated);
                  }}
                  placeholder={t('master.compare.competitorPlaceholder')}
                  className="mt-1"
                />
              </div>
            ))}
          </div>
          <div className="flex items-center gap-3">
            <Button onClick={handleCompare} disabled={compareMutation.isPending}>
              {compareMutation.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('master.compare.comparing')}</>
              ) : (
                <><Users className="w-4 h-4 mr-2" />{t('tabs.compare')}</>
              )}
            </Button>
            {competitorUrls.length < 2 && (
              <Button variant="outline" size="sm" onClick={addCompetitor}>{t('master.compare.addCompetitor')}</Button>
            )}
          </div>
        </CardContent>
      </Card>

      {comparisonResult && (
        <div className="space-y-6">
          <Card className="rounded-xl border border-border shadow-sm">
            <CardContent className="p-6">
              <div className="flex items-center gap-2 mb-2">
                <Trophy className="w-5 h-5 text-yellow-500" />
                <h3 className="text-lg font-bold text-foreground">{t('master.compare.comparisonSummary')}</h3>
              </div>
              <p className="text-sm text-muted-foreground">{comparisonResult.summary}</p>
            </CardContent>
          </Card>
          <div className={`grid grid-cols-1 ${comparisonResult.analyses.length === 2 ? "md:grid-cols-2" : "md:grid-cols-3"} gap-4`}>
            {comparisonResult.analyses.map((analysis, i) => {
              const isWinner = analysis.url === comparisonResult.winner;
              return (
                <Card key={i} className={`rounded-xl border shadow-sm ${isWinner ? "border-2 border-yellow-400 dark:border-yellow-600" : "border-border"}`}>
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between mb-4">
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-mono truncate">{new URL(analysis.url).hostname}</p>
                        {isWinner && <Badge className="bg-yellow-500 text-white mt-1">{t('master.compare.winner')}</Badge>}
                        {(analysis as any).errorCode && isFetchErrorCode((analysis as any).errorCode) && (
                          <div className="mt-2"><CompareBlockedBadge code={(analysis as any).errorCode} /></div>
                        )}
                      </div>
                      <div className="text-right">
                        <p className={`text-3xl font-bold ${analysis.score >= 70 ? "text-green-600" : analysis.score >= 40 ? "text-yellow-600" : "text-red-600"}`}>{analysis.score}</p>
                        <p className={`text-xs font-medium ${ratingColors[analysis.rating] || "text-gray-600"}`}>{analysis.rating}</p>
                      </div>
                    </div>
                    <div className="space-y-2 mb-4">
                      {categoryLabels.map((cat) => {
                        const val = (analysis as any)[cat.key] as number;
                        return (
                          <div key={cat.key}>
                            <div className="flex justify-between text-xs mb-0.5">
                              <span className="text-muted-foreground">{cat.label}</span>
                              <span className="font-medium">{val}</span>
                            </div>
                            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className={`h-full rounded-full ${val >= 70 ? "bg-green-500" : val >= 40 ? "bg-yellow-500" : "bg-red-500"}`} style={{ width: `${val}%` }} />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                    {analysis.keyStrengths.length > 0 && (
                      <div className="mb-3">
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('master.compare.strengths')}</p>
                        <div className="space-y-1">
                          {analysis.keyStrengths.map((s, j) => (
                            <div key={j} className="flex items-center gap-1 text-xs"><CheckCircle2 className="w-3 h-3 text-green-500 flex-shrink-0" /><span className="text-foreground">{s}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                    {analysis.keyWeaknesses.length > 0 && (
                      <div>
                        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-1">{t('master.compare.weaknesses')}</p>
                        <div className="space-y-1">
                          {analysis.keyWeaknesses.map((w, j) => (
                            <div key={j} className="flex items-center gap-1 text-xs"><XCircle className="w-3 h-3 text-red-500 flex-shrink-0" /><span className="text-foreground">{w}</span></div>
                          ))}
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

function BrokenLinksSummary({ data }: { data: BrokenLinksResult }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><ScoreBadge score={data.score} /><p className="text-sm text-muted-foreground mt-1">{t('master.brokenLinks.healthScore')}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{data.totalLinks}</p><p className="text-sm text-muted-foreground">{t('master.brokenLinks.totalLinks')}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-red-500">{data.brokenCount}</p><p className="text-sm text-muted-foreground">{t('master.brokenLinks.broken')}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-yellow-500">{data.redirectCount}</p><p className="text-sm text-muted-foreground">{t('master.brokenLinks.redirects')}</p></CardContent></Card>
      </div>

      {(() => {
        const brokenCount = data.brokenLinks.filter(l => !l.statusText.startsWith("Skipped") && (l.statusCode === null || l.statusCode >= 400)).length;
        if (brokenCount === 0) return null;
        const equityLoss = Math.min(Math.round(brokenCount * 3), 30);
        return (
          <Card className="rounded-xl border-2 border-red-200 dark:border-red-800 bg-gradient-to-r from-red-50 to-orange-50 dark:from-red-950/40 dark:to-orange-950/40 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-red-100 dark:bg-red-900 rounded-xl flex items-center justify-center flex-shrink-0">
                  <LinkIcon className="w-6 h-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    {t('master.brokenLinks.linkEquityRecovery')}
                    <Badge className="bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200 text-[10px]">{t('master.brokenLinks.brokenLinksCount', { count: brokenCount })}</Badge>
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('master.brokenLinks.equityLossText', { count: brokenCount, equityLoss })}
                  </p>
                  <div className="mt-3">
                    <div className="bg-white dark:bg-red-950 rounded-lg px-4 py-2 border border-red-200 dark:border-red-800 inline-block">
                      <p className="text-xs text-muted-foreground">{t('master.brokenLinks.estimatedLinkEquityLoss')}</p>
                      <p className="text-lg font-bold text-red-600">~{equityLoss}%</p>
                      <p className="text-[10px] text-muted-foreground">{t('master.brokenLinks.recoverableByFixingLinks')}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">{t('master.brokenLinks.disclaimer')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

function BrokenLinksSection({ data, paidTier, onUpgrade }: { data: BrokenLinksResult; paidTier: string; onUpgrade: (tier: 'basic' | 'pro') => void }) {
  const { t } = useTranslation();
  const [showAll, setShowAll] = useState(false);

  return (
    <div className="space-y-6">
      {paidTier === 'free' ? (
        <FreeKeyFindings
          items={data.brokenLinks.map((l: BrokenLink) => ({ name: l.url, impact: `${l.statusCode ?? 'N/A'} ${l.statusText} · ${l.type}`, status: 'FAIL' }))}
          onUpgrade={onUpgrade}
        />
      ) : (
        <Tabs defaultValue="broken" className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="broken">{t('master.brokenLinks.broken')} <Badge variant="outline" className="ml-1 text-red-600">{data.brokenCount}</Badge></TabsTrigger>
            <TabsTrigger value="redirected">{t('master.brokenLinks.redirected')} <Badge variant="outline" className="ml-1 text-yellow-600">{data.redirectCount}</Badge></TabsTrigger>
            <TabsTrigger value="working">{t('master.brokenLinks.working')}</TabsTrigger>
          </TabsList>

          <TabsContent value="broken">
            {data.brokenLinks.length > 0 ? (
              <Card data-testid="broken-links-list">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><XCircle className="w-5 h-5 text-red-500" />{t('master.brokenLinks.brokenLinksCountLabel', { count: data.brokenLinks.length })}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {(showAll ? data.brokenLinks : data.brokenLinks.slice(0, 10)).map((link, i) => (
                      <BrokenLinkRow key={i} link={link} />
                    ))}
                    {data.brokenLinks.length > 10 && (
                      <Button variant="ghost" size="sm" onClick={() => setShowAll(!showAll)} className="w-full">
                        {showAll ? <ChevronUp className="w-4 h-4 mr-1" /> : <ChevronDown className="w-4 h-4 mr-1" />}
                        {showAll ? t('sections.showLess') : t('master.brokenLinks.showAllBrokenLinks', { count: data.brokenLinks.length })}
                      </Button>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                <CheckCircle2 className="w-5 h-5 text-green-600" />
                <span className="text-sm text-green-800 dark:text-green-200">{t('master.brokenLinks.noBrokenLinksFound')}</span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="redirected">
            {data.redirectedLinks.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><AlertTriangle className="w-5 h-5 text-yellow-500" />{t('master.brokenLinks.redirectedLinksCountLabel', { count: data.redirectedLinks.length })}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {data.redirectedLinks.slice(0, 20).map((link, i) => (<BrokenLinkRow key={i} link={link} />))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground p-4">{t('master.brokenLinks.noRedirectedLinksFound')}</p>
            )}
          </TabsContent>

          <TabsContent value="working">
            <Card>
              <CardContent className="pt-6">
                <p className="text-muted-foreground">{data.summary}</p>
                <div className="flex gap-4 mt-3">
                  <Badge variant="outline" className="text-green-600 border-green-200">{t('master.brokenLinks.workingCount', { count: data.workingLinks })}</Badge>
                  <Badge variant="outline">{t('master.brokenLinks.internalCount', { count: data.internalLinks })}</Badge>
                  <Badge variant="outline">{t('master.brokenLinks.externalCount', { count: data.externalLinks })}</Badge>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
}

function ImageOptSummary({ data }: { data: ImageOptimizationResult }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><ScoreBadge score={data.score} /><p className="text-sm text-muted-foreground mt-1">{t('master.images.optimizationScore')}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{data.totalImages}</p><p className="text-sm text-muted-foreground">{t('master.images.totalImages')}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-green-500">{data.modernFormatCount}</p><p className="text-sm text-muted-foreground">{t('master.images.modernFormat')}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-red-500">{data.oversizedImages}</p><p className="text-sm text-muted-foreground">{t('master.images.oversized')}</p></CardContent></Card>
      </div>

      {(() => {
        const issueImages = data.images.filter(img => img.issues.length > 0).length;
        if (issueImages === 0) return null;
        const oversizedCount = data.oversizedImages;
        const noLazy = data.totalImages - data.imagesWithLazyLoading;
        const loadReduction = Math.min(Math.round((oversizedCount * 0.4 + noLazy * 0.15) * 10) / 10, 5);
        const conversionBoost = Math.round(loadReduction * 7);
        return (
          <Card className="rounded-xl border-2 border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-green-100 dark:bg-green-900 rounded-xl flex items-center justify-center flex-shrink-0">
                  <ImageIcon className="w-6 h-6 text-green-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    {t('master.images.pageSpeedImpact')}
                    <Badge className="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 text-[10px]">{t('master.images.imagesNeedFixes', { count: issueImages })}</Badge>
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('master.images.pageSpeedImpactText', { loadReduction, conversionBoost })}
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="bg-white dark:bg-green-950 rounded-lg px-4 py-2 border border-green-200 dark:border-green-800">
                      <p className="text-xs text-muted-foreground">{t('master.images.estimatedLoadTimeReduction')}</p>
                      <p className="text-lg font-bold text-green-600">-{loadReduction}s</p>
                      <p className="text-[10px] text-muted-foreground">{t('master.images.fasterPageLoad')}</p>
                    </div>
                    <div className="bg-white dark:bg-green-950 rounded-lg px-4 py-2 border border-green-200 dark:border-green-800">
                      <p className="text-xs text-muted-foreground">{t('master.images.estimatedConversionBoost')}</p>
                      <p className="text-lg font-bold text-green-600">+{conversionBoost}%</p>
                      <p className="text-[10px] text-muted-foreground">{t('master.images.fromFasterLoading')}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">{t('master.images.disclaimer')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

function ImageOptSection({ data, paidTier, onUpgrade }: { data: ImageOptimizationResult; paidTier: string; onUpgrade: (tier: 'basic' | 'pro') => void }) {
  const { t } = useTranslation();
  const imagesWithIssues = data.images.filter(img => img.issues.length > 0);

  return (
    <div className="space-y-6">
      {paidTier === 'free' ? (
        <FreeKeyFindings
          items={imagesWithIssues.map((img: ImageIssue) => ({ name: img.src.split("/").pop() || img.src, impact: img.issues.join(', '), status: 'FAIL' }))}
          onUpgrade={onUpgrade}
        />
      ) : (
        <>
          <Card data-testid="image-metrics">
            <CardHeader><CardTitle className="text-lg">{t('master.images.optimizationMetrics')}</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <MetricBar label={t('master.images.altText')} value={data.imagesWithAlt} total={data.totalImages} />
              <MetricBar label={t('master.images.lazyLoading')} value={data.imagesWithLazyLoading} total={data.totalImages} />
              <MetricBar label={t('master.images.explicitDimensions')} value={data.imagesWithDimensions} total={data.totalImages} />
              <MetricBar label={t('master.images.responsiveSrcset')} value={data.imagesWithSrcset} total={data.totalImages} />
              <MetricBar label={t('master.images.modernFormat')} value={data.modernFormatCount} total={data.totalImages} />
            </CardContent>
          </Card>

          {paidTier === 'pro' && data.recommendations.length > 0 && (
            <Card data-testid="image-recommendations">
              <CardHeader><CardTitle className="text-lg">{t('tabs.recommendations')}</CardTitle></CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {data.recommendations.map((rec, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />{rec}
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          <Tabs defaultValue="issues" className="w-full">
            <TabsList className="flex-wrap h-auto">
              <TabsTrigger value="issues">{t('master.common.issues')} <Badge variant="outline" className="ml-1">{imagesWithIssues.length}</Badge></TabsTrigger>
              <TabsTrigger value="all-images">{t('master.images.allImages')} <Badge variant="outline" className="ml-1">{data.images.length}</Badge></TabsTrigger>
            </TabsList>

            <TabsContent value="issues">
              {imagesWithIssues.length > 0 ? (
                <div className="space-y-3">
                  {imagesWithIssues.map((img, i) => (<ImageRow key={i} image={img} />))}
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 bg-green-50 dark:bg-green-950 rounded-lg border border-green-200 dark:border-green-800">
                  <CheckCircle2 className="w-5 h-5 text-green-600" />
                  <span className="text-sm text-green-800 dark:text-green-200">{t('master.images.noImageIssuesFound')}</span>
                </div>
              )}
            </TabsContent>

            <TabsContent value="all-images">
              {data.images.length > 0 ? (
                <div className="space-y-3">
                  {data.images.map((img, i) => (<ImageRow key={i} image={img} />))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground p-4">{t('master.images.noImagesFound')}</p>
              )}
            </TabsContent>
          </Tabs>
        </>
      )}
    </div>
  );
}

function InternalLinkSummary({ data }: { data: InternalLinkingResult }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card><CardContent className="pt-6 text-center"><ScoreBadge score={data.score} /><p className="text-sm text-muted-foreground mt-1">{t('master.internalLinks.linkQualityScore')}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{data.totalInternalLinks}</p><p className="text-sm text-muted-foreground">{t('master.internalLinks.totalInternalLinks')}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold">{data.uniqueInternalLinks}</p><p className="text-sm text-muted-foreground">{t('master.internalLinks.uniquePages')}</p></CardContent></Card>
        <Card><CardContent className="pt-6 text-center"><p className="text-2xl font-bold text-green-500">{data.descriptiveAnchors}</p><p className="text-sm text-muted-foreground">{t('master.internalLinks.descriptiveAnchors')}</p></CardContent></Card>
      </div>

      {(() => {
        const issues = data.genericAnchors + data.nofollowCount + (data.uniqueInternalLinks < 5 ? 1 : 0);
        if (issues === 0) return null;
        const authorityBoost = Math.min(Math.round(issues * 8), 40);
        const crawlImprovement = Math.min(Math.round(data.uniqueInternalLinks < 10 ? 35 : 15), 40);
        return (
          <Card className="rounded-xl border-2 border-cyan-200 dark:border-cyan-800 bg-gradient-to-r from-cyan-50 to-blue-50 dark:from-cyan-950/40 dark:to-blue-950/40 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-cyan-100 dark:bg-cyan-900 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Network className="w-6 h-6 text-cyan-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    {t('master.internalLinks.internalAuthorityDistribution')}
                    <Badge className="bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-200 text-[10px]">{t('master.internalLinks.improvementsFound', { count: issues })}</Badge>
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('master.internalLinks.internalAuthorityDistributionText', { authorityBoost, crawlImprovement })}
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="bg-white dark:bg-cyan-950 rounded-lg px-4 py-2 border border-cyan-200 dark:border-cyan-800">
                      <p className="text-xs text-muted-foreground">{t('master.internalLinks.authorityDistribution')}</p>
                      <p className="text-lg font-bold text-cyan-600">+{authorityBoost}%</p>
                      <p className="text-[10px] text-muted-foreground">{t('master.internalLinks.betterLinkEquityFlow')}</p>
                    </div>
                    <div className="bg-white dark:bg-cyan-950 rounded-lg px-4 py-2 border border-cyan-200 dark:border-cyan-800">
                      <p className="text-xs text-muted-foreground">{t('master.internalLinks.crawlEfficiency')}</p>
                      <p className="text-lg font-bold text-cyan-600">+{crawlImprovement}%</p>
                      <p className="text-[10px] text-muted-foreground">{t('master.internalLinks.improvedDiscoverability')}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">{t('master.internalLinks.disclaimer')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

function InternalLinkSection({ data, paidTier, onUpgrade }: { data: InternalLinkingResult; paidTier: string; onUpgrade: (tier: 'basic' | 'pro') => void }) {
  const { t } = useTranslation();
  return (
    <div className="space-y-6">
      {paidTier === 'free' ? (
        <LockedOverlay onUpgrade={onUpgrade} />
      ) : (
        <Tabs defaultValue="analysis" className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="analysis">{t('master.tabs.analysis')}</TabsTrigger>
            <TabsTrigger value="links">{t('master.tabs.links')} <Badge variant="outline" className="ml-1">{data.links.length}</Badge></TabsTrigger>
            {paidTier === 'pro' && <TabsTrigger value="recommendations">{t('tabs.recommendations')}</TabsTrigger>}
          </TabsList>

          <TabsContent value="analysis">
            <div className="space-y-6">
              <Card data-testid="linking-metrics">
                <CardHeader><CardTitle className="text-lg">{t('master.internalLinks.linkAnalysis')}</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                  <MetricBar label={t('master.internalLinks.descriptiveAnchorText')} value={data.descriptiveAnchors} total={data.totalInternalLinks} />
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 pt-2">
                    <div className="text-center"><p className="text-lg font-bold text-red-500">{data.genericAnchors}</p><p className="text-xs text-muted-foreground">{t('master.internalLinks.genericAnchors')}</p></div>
                    <div className="text-center"><p className="text-lg font-bold text-yellow-500">{data.nofollowCount}</p><p className="text-xs text-muted-foreground">{t('master.internalLinks.nofollowLinks')}</p></div>
                    <div className="text-center"><p className="text-lg font-bold">{data.deepLinks}</p><p className="text-xs text-muted-foreground">{t('master.internalLinks.deepLinks')}</p></div>
                    <div className="text-center"><p className="text-lg font-bold">{data.shallowLinks}</p><p className="text-xs text-muted-foreground">{t('master.internalLinks.shallowLinks')}</p></div>
                  </div>
                </CardContent>
              </Card>

              {data.anchorTextDistribution.length > 0 && (
                <Card data-testid="anchor-distribution">
                  <CardHeader><CardTitle className="text-lg">{t('master.internalLinks.topAnchorTexts')}</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-2">
                      {data.anchorTextDistribution.slice(0, 15).map((item, i) => (
                        <Badge key={i} variant="secondary" className="text-sm">{item.text} <span className="ml-1 opacity-60">×{item.count}</span></Badge>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </TabsContent>

          <TabsContent value="links">
            {data.links.length > 0 ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">{t('master.internalLinks.allInternalLinks', { count: data.links.length })}</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {data.links.slice(0, 50).map((link, i) => (
                      <div key={i} className="flex items-center gap-3 p-2 rounded bg-muted/50 text-sm">
                        <div className="flex-1 min-w-0">
                          <p className="truncate font-mono text-xs">{link.url}</p>
                          <p className="text-xs text-muted-foreground">{t('master.internalLinks.linkRowMeta', { anchorText: link.anchorText, depth: link.depth, location: link.location })}</p>
                        </div>
                        <div className="flex gap-1 shrink-0">
                          {link.isDescriptive ? <Badge variant="outline" className="text-xs text-green-600">{t('master.internalLinks.descriptive')}</Badge> : <Badge variant="outline" className="text-xs text-yellow-600">{t('master.internalLinks.generic')}</Badge>}
                          {link.hasNofollow && <Badge variant="outline" className="text-xs text-red-600">{t('master.internalLinks.nofollow')}</Badge>}
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <p className="text-sm text-muted-foreground p-4">{t('master.internalLinks.noInternalLinksFound')}</p>
            )}
          </TabsContent>

          {paidTier === 'pro' && (
            <TabsContent value="recommendations">
              {data.recommendations.length > 0 ? (
                <Card data-testid="linking-recommendations">
                  <CardHeader><CardTitle className="text-lg">{t('tabs.recommendations')}</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {data.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm"><ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />{rec}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground p-4">{t('master.common.noRecommendations')}</p>
              )}
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}

function SitemapSummary({ data }: { data: SitemapValidatorResult }) {
  const { t } = useTranslation();
  const { robotsTxt, sitemap } = data;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card><CardContent className="pt-6 text-center"><ScoreBadge score={data.score} /><p className="text-sm text-muted-foreground mt-1">{t('master.sitemap.validationScore')}</p></CardContent></Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2">
              {robotsTxt.exists ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
              <span className="text-lg font-bold">{robotsTxt.exists ? t('master.common.found') : t('master.common.missing')}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{t('master.sitemap.robotsTxt')}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6 text-center">
            <div className="flex items-center justify-center gap-2">
              {sitemap.exists ? <CheckCircle2 className="w-5 h-5 text-green-500" /> : <XCircle className="w-5 h-5 text-red-500" />}
              <span className="text-lg font-bold">{sitemap.exists ? t('master.sitemap.urlsCount', { count: sitemap.urlCount }) : t('master.common.missing')}</span>
            </div>
            <p className="text-sm text-muted-foreground mt-1">{t('master.sitemap.sitemap')}</p>
          </CardContent>
        </Card>
      </div>

      {(() => {
        const issues = data.recommendations.length;
        if (issues === 0) return null;
        const crawlBoost = Math.min(Math.round(issues * 12), 50);
        const indexBoost = !data.sitemap.exists ? 40 : !data.sitemap.hasLastmod ? 20 : 10;
        return (
          <Card className="rounded-xl border-2 border-pink-200 dark:border-pink-800 bg-gradient-to-r from-pink-50 to-rose-50 dark:from-pink-950/40 dark:to-rose-950/40 shadow-sm">
            <CardContent className="p-5">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 bg-pink-100 dark:bg-pink-900 rounded-xl flex items-center justify-center flex-shrink-0">
                  <FileText className="w-6 h-6 text-pink-600" />
                </div>
                <div className="flex-1">
                  <h4 className="font-bold text-foreground flex items-center gap-2">
                    {t('master.sitemap.crawlAndIndexingEfficiency')}
                    <Badge className="bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200 text-[10px]">{t('master.sitemap.fixesNeeded', { count: issues })}</Badge>
                  </h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    {t('master.sitemap.crawlAndIndexingEfficiencyText', { crawlBoost, indexBoost })}
                  </p>
                  <div className="mt-3 flex items-center gap-4">
                    <div className="bg-white dark:bg-pink-950 rounded-lg px-4 py-2 border border-pink-200 dark:border-pink-800">
                      <p className="text-xs text-muted-foreground">{t('master.sitemap.crawlEfficiencyGain')}</p>
                      <p className="text-lg font-bold text-pink-600">+{crawlBoost}%</p>
                      <p className="text-[10px] text-muted-foreground">{t('master.sitemap.betterCrawlerGuidance')}</p>
                    </div>
                    <div className="bg-white dark:bg-pink-950 rounded-lg px-4 py-2 border border-pink-200 dark:border-pink-800">
                      <p className="text-xs text-muted-foreground">{t('master.sitemap.indexingImprovement')}</p>
                      <p className="text-lg font-bold text-pink-600">+{indexBoost}%</p>
                      <p className="text-[10px] text-muted-foreground">{t('master.sitemap.morePagesDiscovered')}</p>
                    </div>
                  </div>
                  <p className="text-[10px] text-muted-foreground mt-2 italic">{t('master.sitemap.disclaimer')}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        );
      })()}
    </div>
  );
}

function SitemapSection({ data, paidTier, onUpgrade }: { data: SitemapValidatorResult; paidTier: string; onUpgrade: (tier: 'basic' | 'pro') => void }) {
  const { t } = useTranslation();
  const { robotsTxt, sitemap } = data;

  return (
    <div className="space-y-6">
      {paidTier === 'free' ? (
        <LockedOverlay onUpgrade={onUpgrade} />
      ) : (
        <Tabs defaultValue="robots" className="w-full">
          <TabsList className="flex-wrap h-auto">
            <TabsTrigger value="robots">{t('master.sitemap.robotsTxt')}</TabsTrigger>
            <TabsTrigger value="sitemap">{t('master.sitemap.sitemap')}</TabsTrigger>
            {paidTier === 'pro' && <TabsTrigger value="recommendations">{t('tabs.recommendations')}</TabsTrigger>}
          </TabsList>

          <TabsContent value="robots">
            {robotsTxt.exists ? (
              <Card data-testid="robots-details">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Bot className="w-5 h-5" />{t('master.sitemap.robotsAnalysis')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <p className="text-sm font-medium">{t('master.sitemap.userAgents')}</p>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {robotsTxt.userAgents.map((ua, i) => (<Badge key={i} variant="secondary" className="text-xs">{ua}</Badge>))}
                      </div>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('master.sitemap.disallowedPaths')}</p>
                      <p className="text-sm text-muted-foreground">{t('master.sitemap.rulesCount', { count: robotsTxt.disallowedPaths.length })}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('master.sitemap.sitemapReferences')}</p>
                      <p className="text-sm text-muted-foreground">{t('master.sitemap.foundCount', { count: robotsTxt.sitemapReferences.length })}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{t('master.common.status')}</p>
                      <div className="flex flex-col gap-1 mt-1">
                        {robotsTxt.hasWildcardBlock && <Badge variant="destructive" className="text-xs w-fit">{t('master.sitemap.wildcardBlock')}</Badge>}
                        {robotsTxt.blocksImportantPaths && <Badge variant="destructive" className="text-xs w-fit">{t('master.sitemap.blocksImportantPaths')}</Badge>}
                        {!robotsTxt.hasWildcardBlock && !robotsTxt.blocksImportantPaths && <Badge className="text-xs w-fit bg-green-500">{t('master.sitemap.clean')}</Badge>}
                      </div>
                    </div>
                  </div>
                  {robotsTxt.disallowedPaths.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1">{t('master.sitemap.disallowedPathsLabel')}</p>
                      <div className="flex flex-wrap gap-1">
                        {robotsTxt.disallowedPaths.map((p, i) => (<Badge key={i} variant="outline" className="text-xs font-mono">{p}</Badge>))}
                      </div>
                    </div>
                  )}
                  {robotsTxt.issues.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1 text-yellow-600">{t('master.common.issues')}:</p>
                      <ul className="space-y-1">
                        {robotsTxt.issues.map((issue, i) => (
                          <li key={i} className="text-sm flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-800 dark:text-red-200">{t('master.sitemap.noRobotsFound')}</span>
              </div>
            )}
          </TabsContent>

          <TabsContent value="sitemap">
            {sitemap.exists ? (
              <Card data-testid="sitemap-details">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2"><Map className="w-5 h-5" />{t('master.sitemap.sitemapAnalysis')}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div><p className="text-lg font-bold">{sitemap.urlCount}</p><p className="text-xs text-muted-foreground">{t('master.sitemap.urls')}</p></div>
                    <div><StatusIconTri status={sitemap.hasLastmod ? "pass" : "warning"} /><p className="text-xs text-muted-foreground mt-1">{t('master.sitemap.lastmod')}</p></div>
                    <div><StatusIconTri status={sitemap.hasChangefreq ? "pass" : "warning"} /><p className="text-xs text-muted-foreground mt-1">{t('master.sitemap.changefreq')}</p></div>
                    <div><StatusIconTri status={sitemap.hasPriority ? "pass" : "warning"} /><p className="text-xs text-muted-foreground mt-1">{t('master.sitemap.priority')}</p></div>
                  </div>
                  {sitemap.isSitemapIndex && (
                    <div>
                      <p className="text-sm font-medium mb-1">{t('master.sitemap.sitemapIndexChildSitemaps')}</p>
                      <div className="space-y-1">
                        {sitemap.childSitemaps.slice(0, 10).map((sm, i) => (<p key={i} className="text-xs font-mono truncate text-muted-foreground">{sm}</p>))}
                      </div>
                    </div>
                  )}
                  {sitemap.sampleUrls.length > 0 && !sitemap.isSitemapIndex && (
                    <div>
                      <p className="text-sm font-medium mb-1">{t('master.sitemap.sampleUrls')}</p>
                      <div className="space-y-1">
                        {sitemap.sampleUrls.slice(0, 5).map((u, i) => (<p key={i} className="text-xs font-mono truncate text-muted-foreground">{u}</p>))}
                      </div>
                    </div>
                  )}
                  {sitemap.issues.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-1 text-yellow-600">{t('master.common.issues')}:</p>
                      <ul className="space-y-1">
                        {sitemap.issues.map((issue, i) => (
                          <li key={i} className="text-sm flex items-start gap-2"><AlertTriangle className="w-4 h-4 text-yellow-500 mt-0.5 shrink-0" />{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <div className="flex items-center gap-2 p-4 bg-red-50 dark:bg-red-950 rounded-lg border border-red-200 dark:border-red-800">
                <XCircle className="w-5 h-5 text-red-600" />
                <span className="text-sm text-red-800 dark:text-red-200">{t('master.sitemap.noSitemapFound')}</span>
              </div>
            )}
          </TabsContent>

          {paidTier === 'pro' && (
            <TabsContent value="recommendations">
              {data.recommendations.length > 0 ? (
                <Card data-testid="sitemap-recommendations">
                  <CardHeader><CardTitle className="text-lg">{t('tabs.recommendations')}</CardTitle></CardHeader>
                  <CardContent>
                    <ul className="space-y-2">
                      {data.recommendations.map((rec, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm"><ArrowRight className="w-4 h-4 text-primary mt-0.5 shrink-0" />{rec}</li>
                      ))}
                    </ul>
                  </CardContent>
                </Card>
              ) : (
                <p className="text-sm text-muted-foreground p-4">{t('master.common.noRecommendations')}</p>
              )}
            </TabsContent>
          )}
        </Tabs>
      )}
    </div>
  );
}

function BrokenLinkRow({ link }: { link: BrokenLink }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50 border border-border">
      <div className="mt-1">
        {link.statusText.startsWith("Skipped") ? <AlertTriangle className="w-4 h-4 text-blue-500" /> : link.statusCode === null || link.statusCode >= 400 ? <XCircle className="w-4 h-4 text-red-500" /> : <AlertTriangle className="w-4 h-4 text-yellow-500" />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{link.url}</p>
        <p className="text-xs text-muted-foreground mt-0.5">Anchor: "{link.anchorText}" · {link.type} · {link.location}</p>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        <Badge variant={link.statusText.startsWith("Skipped") ? "outline" : link.statusCode === null || link.statusCode >= 400 ? "destructive" : "secondary"} className={link.statusText.startsWith("Skipped") ? "text-blue-600 border-blue-200" : ""}>
          {link.statusText.startsWith("Skipped") ? "Skipped" : `${link.statusCode ?? "N/A"} ${link.statusText}`}
        </Badge>
        {link.responseTime !== null && <span className="text-xs text-muted-foreground">{link.responseTime}ms</span>}
      </div>
    </div>
  );
}

function ImageRow({ image }: { image: ImageIssue }) {
  const { t } = useTranslation();
  const hasIssues = image.issues.length > 0;
  return (
    <div className={`p-3 rounded-lg border ${hasIssues ? "border-yellow-200 bg-yellow-50/30 dark:border-yellow-900 dark:bg-yellow-950/20" : "border-green-200 bg-green-50/30 dark:border-green-900 dark:bg-green-950/20"}`}>
      <div className="flex items-start gap-3">
        <div className="mt-1">{hasIssues ? <AlertTriangle className="w-4 h-4 text-yellow-500" /> : <CheckCircle2 className="w-4 h-4 text-green-500" />}</div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-mono truncate">{image.src.split("/").pop()}</p>
          <div className="flex flex-wrap gap-1 mt-1">
            {image.hasAlt && <Badge variant="outline" className="text-xs text-green-600">{t('master.images.altBadge')}</Badge>}
            {!image.hasAlt && <Badge variant="outline" className="text-xs text-red-600">{t('master.images.noAltBadge')}</Badge>}
            {image.hasLazyLoading && <Badge variant="outline" className="text-xs text-green-600">{t('master.images.lazyBadge')}</Badge>}
            {image.format && <Badge variant="outline" className="text-xs">{image.format}</Badge>}
            {image.fileSize && <Badge variant="outline" className="text-xs">{Math.round(image.fileSize / 1024)}KB</Badge>}
          </div>
          {hasIssues && (
            <ul className="mt-2 space-y-0.5">
              {image.issues.map((issue, j) => (<li key={j} className="text-xs text-muted-foreground">• {issue}</li>))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

export default function MasterAnalyzerPage() {
  const { t, i18n } = useTranslation();
  useSeo({ title: t("seo.home.title"), description: t("seo.home.description"), path: "/" });
  const [, setLocation] = useLocation();
  const [result, setResult] = useState<MasterResult | null>(() => {
    try {
      const saved = sessionStorage.getItem('seo-analyzer-result');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const { toast } = useToast();
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showPricingModal, setShowPricingModal] = useState(false);
  const [pricingModalTier, setPricingModalTier] = useState<'basic' | 'pro' | null>(null);
  const [paidTier, setPaidTier] = useState<string>(() => {
    try {
      const savedCode = sessionStorage.getItem('seo-analyzer-active-code');
      if (!savedCode) return 'free';
      return sessionStorage.getItem('seo-analyzer-tier') || 'free';
    } catch { return 'free'; }
  });
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [emailCaptured, setEmailCaptured] = useState(false);
  const [pdfDownloading, setPdfDownloading] = useState(false);
  const [pendingPdfTier, setPendingPdfTier] = useState<'free' | 'basic' | 'pro'>('free');
  const [accessCode, setAccessCode] = useState<string>('');
  const [activeAccessCode, setActiveAccessCode] = useState<{ code: string; tier: string; scansRemaining: number; scansTotal: number } | null>(() => {
    try {
      const saved = sessionStorage.getItem('seo-analyzer-active-code');
      return saved ? JSON.parse(saved) : null;
    } catch { return null; }
  });
  const [showAccessCodeInput, setShowAccessCodeInput] = useState(false);
  const [codeRedeeming, setCodeRedeeming] = useState(false);
  const [redeemEmail, setRedeemEmail] = useState<string>('');
  const [verificationPendingEmail, setVerificationPendingEmail] = useState<string | null>(null);
  const [freeScansLeft, setFreeScansLeft] = useState<number | null>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('seo-analyzer-free-scans-left');
      if (saved) return parseInt(saved, 10);
    }
    return null;
  });
  const [showAccessCodeDisplay, setShowAccessCodeDisplay] = useState(false);
  const [generatedAccessCode, setGeneratedAccessCode] = useState<string>('');
  const [pendingCodeData, setPendingCodeData] = useState<{ tier: string; scansRemaining: number; scansTotal: number; email: string } | null>(null);
  const [verificationSuccess, setVerificationSuccess] = useState<{ email: string; scansRemaining: number; tier: string } | null>(null);
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('seo-analyzer-theme');
      if (saved) return saved === 'dark';
      return window.matchMedia('(prefers-color-scheme: dark)').matches;
    }
    return false;
  });

  useEffect(() => {
    try {
      if (result) {
        sessionStorage.setItem('seo-analyzer-result', JSON.stringify(result));
      } else {
        sessionStorage.removeItem('seo-analyzer-result');
      }
    } catch {}
  }, [result]);

  useEffect(() => {
    try {
      sessionStorage.setItem('seo-analyzer-tier', paidTier);
    } catch {}
  }, [paidTier]);

  useEffect(() => {
    try {
      if (activeAccessCode) {
        sessionStorage.setItem('seo-analyzer-active-code', JSON.stringify(activeAccessCode));
      } else {
        sessionStorage.removeItem('seo-analyzer-active-code');
      }
    } catch {}
  }, [activeAccessCode]);

  useEffect(() => {
    try {
      if (freeScansLeft !== null) {
        localStorage.setItem('seo-analyzer-free-scans-left', freeScansLeft.toString());
      }
    } catch {}
  }, [freeScansLeft]);

  const formSchema = useMemo(() => createFormSchema(t('form.urlRequired')), [t]);
  const form = useForm<z.infer<FormSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: { url: "" },
  });

  const fetchAccessCodeWithRetry = async (sessionId: string, tier: string, retries = 5) => {
    for (let i = 0; i < retries; i++) {
      try {
        const response = await apiRequest("POST", "/api/get-access-code", { sessionId, tier });
        const data = await response.json();
        if (data.accessCode) {
          setGeneratedAccessCode(data.accessCode);
          setPendingCodeData({ tier: data.tier, scansRemaining: data.scansRemaining, scansTotal: data.scansTotal, email: data.email || '' });
          setShowAccessCodeDisplay(true);
          return;
        }
      } catch {
        if (i < retries - 1) {
          await new Promise(resolve => setTimeout(resolve, 2000 * (i + 1)));
        }
      }
    }
    toast({ title: t('master.payment.processingTitle'), description: t('master.payment.processingDescription'), variant: "destructive" });
  };

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const payment = params.get('payment');
    const session = params.get('session');
    const tier = params.get('tier');

    if (payment === 'success' && session && tier && (tier === 'basic' || tier === 'pro')) {
      fetchAccessCodeWithRetry(session, tier);
      window.history.replaceState({}, '', '/');
    }
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const verified = params.get('verified');
    const session = params.get('session');
    const code = params.get('code');
    const email = params.get('email');

    if (verified === '1' && session && code && email) {
      window.history.replaceState({}, '', '/');
      try {
        localStorage.setItem('seo-analyzer-email-session', JSON.stringify({ session, email: email.toLowerCase(), code: code.toUpperCase() }));
      } catch {}
      apiRequest("POST", "/api/redeem-code", { code, emailSessionToken: session })
        .then(r => r.json())
        .then(data => {
          if (data.valid) {
            setActiveAccessCode({ code: code.toUpperCase(), tier: data.tier, scansRemaining: data.scansRemaining, scansTotal: data.scansTotal });
            setPaidTier(data.tier);
            setVerificationSuccess({ email, scansRemaining: data.scansRemaining, tier: data.tier });
          } else {
            setVerificationSuccess({ email, scansRemaining: 0, tier: '' });
          }
        })
        .catch(() => {
          setVerificationSuccess({ email, scansRemaining: 0, tier: '' });
        });
    }
  }, []);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('seo-analyzer-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const handleRedeemCode = async () => {
    if (!accessCode.trim()) return;
    const codeTrim = accessCode.trim();
    const emailTrim = redeemEmail.trim().toLowerCase();
    setCodeRedeeming(true);
    try {
      // Pull any existing email-session token (from a prior magic-link click) so
      // a previously verified user doesn't have to re-verify.
      let storedSession: { session: string; email: string; code: string } | null = null;
      try {
        const raw = localStorage.getItem('seo-analyzer-email-session');
        if (raw) storedSession = JSON.parse(raw);
      } catch {}

      const payload: any = { code: codeTrim };
      if (emailTrim) payload.email = emailTrim;
      if (storedSession?.session) payload.emailSessionToken = storedSession.session;

      const response = await apiRequest("POST", "/api/redeem-code", payload);
      const data = await response.json();

      if (data.valid) {
        const isAdminCode = data.isAdmin || false;
        const scansDisplay = isAdminCode ? 999999 : data.scansRemaining;
        const totalDisplay = isAdminCode ? 999999 : data.scansTotal;
        setActiveAccessCode({ code: codeTrim.toUpperCase(), tier: data.tier, scansRemaining: scansDisplay, scansTotal: totalDisplay });
        setPaidTier(data.tier);
        setShowAccessCodeInput(false);
        setVerificationPendingEmail(null);
        toast({ title: isAdminCode ? "Admin Access Activated" : "Access Code Activated", description: isAdminCode ? "Pro tier unlocked with unlimited scans." : `${data.tier === 'pro' ? 'Pro' : 'Basic'} tier unlocked with ${data.scansRemaining} scan${data.scansRemaining !== 1 ? 's' : ''} remaining.` });
      } else if (data.requiresVerification) {
        // Need an email to send the magic link to.
        const target = emailTrim || data.boundEmail;
        if (!target) {
          toast({ title: t('verification.emailRequiredTitle'), description: t('verification.emailRequiredDescription'), variant: "destructive" });
          return;
        }
        try {
          await apiRequest("POST", "/api/request-verification", {
            code: codeTrim,
            email: target,
            lang: i18n.language === 'hr' ? 'hr' : 'en',
          });
          setVerificationPendingEmail(target);
          toast({ title: t('verification.sentTitle'), description: t('verification.sentDescription', { email: target }) });
        } catch (err: any) {
          toast({ title: t('verification.sendFailedTitle'), description: err.message || t('verification.sendFailedDescription'), variant: "destructive" });
        }
      } else {
        toast({ title: t('master.payment.noScansLeftTitle'), description: t('master.payment.noScansLeftDescription'), variant: "destructive" });
      }
    } catch (error: any) {
      // Map known server errors (email mismatch) to a clearer message.
      const message = error?.message || '';
      if (/EMAIL_MISMATCH|registered to a different email/i.test(message)) {
        toast({ title: t('verification.mismatchTitle'), description: t('verification.mismatchDescription'), variant: "destructive" });
      } else {
        toast({ title: t('master.payment.invalidCodeTitle'), description: message || t('master.payment.invalidCodeDescription'), variant: "destructive" });
      }
    } finally {
      setCodeRedeeming(false);
    }
  };

  const isReplitDevHost = typeof window !== 'undefined' && /(^|\.)(replit\.dev|repl\.co|replit\.app)$/i.test(window.location.hostname);
  const turnstileDisabled = import.meta.env.DEV || isReplitDevHost;
  const turnstileSiteKey = turnstileDisabled ? '' : (import.meta.env.VITE_TURNSTILE_SITE_KEY || '');
  const turnstileRef = useRef<HTMLDivElement>(null);
  const turnstileWidgetId = useRef<string | null>(null);
  const [turnstileToken, setTurnstileToken] = useState<string | null>(null);
  const pendingSubmitValues = useRef<z.infer<FormSchema> | null>(null);

  useEffect(() => {
    if (!turnstileSiteKey) return;
    const id = "cf-turnstile-script";
    if (!document.getElementById(id) && !(window as any).turnstile) {
      const s = document.createElement("script");
      s.id = id;
      s.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";
      s.async = true;
      s.defer = true;
      document.head.appendChild(s);
    }
  }, [turnstileSiteKey]);

  useEffect(() => {
    if (!turnstileSiteKey || !turnstileRef.current) return;
    const renderWidget = () => {
      if (turnstileWidgetId.current !== null) return;
      const w = window as any;
      if (!w.turnstile) return;
      console.info("[turnstile] rendering widget", { hasSiteKey: !!turnstileSiteKey });
      const flushPendingAfterRender = () => {
        if (pendingSubmitValues.current && w.turnstile?.execute && turnstileWidgetId.current !== null) {
          console.info("[turnstile] auto-executing after widget ready (queued submit)");
          try { w.turnstile.execute(turnstileWidgetId.current); } catch (e) { console.error("[turnstile] execute failed", e); }
        }
      };
      turnstileWidgetId.current = w.turnstile.render(turnstileRef.current, {
        sitekey: turnstileSiteKey,
        callback: (token: string) => {
          console.info("[turnstile] callback received token", { hasToken: !!token, length: token?.length ?? 0 });
          setTurnstileToken(token);
          if (pendingSubmitValues.current) {
            const pending = pendingSubmitValues.current;
            pendingSubmitValues.current = null;
            console.info("[turnstile] submitting queued request after token callback");
            analyzeMutation.mutate({ ...pending, turnstileToken: token });
          }
        },
        'expired-callback': () => {
          console.warn("[turnstile] token expired");
          setTurnstileToken(null);
        },
        'error-callback': () => {
          console.error("[turnstile] widget error callback");
          setTurnstileToken(null);
        },
        theme: 'auto',
        size: 'invisible',
      });
      flushPendingAfterRender();
    };
    if ((window as any).turnstile) {
      renderWidget();
    } else {
      const interval = setInterval(() => {
        if ((window as any).turnstile) {
          clearInterval(interval);
          renderWidget();
        }
      }, 200);
      return () => clearInterval(interval);
    }
  }, [turnstileSiteKey]);

  const resetTurnstile = () => {
    if (turnstileWidgetId.current !== null && (window as any).turnstile) {
      (window as any).turnstile.reset(turnstileWidgetId.current);
      setTurnstileToken(null);
    }
  };

  const analyzeMutation = useMutation({
    mutationFn: async (data: { url: string; turnstileToken?: string }) => {
      const payload: any = { url: data.url };
      if (activeAccessCode) {
        payload.accessCode = activeAccessCode.code;
        try {
          const raw = localStorage.getItem('seo-analyzer-email-session');
          if (raw) {
            const stored = JSON.parse(raw);
            if (stored?.session) payload.emailSessionToken = stored.session;
            if (stored?.email) payload.email = stored.email;
          }
        } catch {}
      }
      if (data.turnstileToken || turnstileToken) {
        payload.turnstileToken = data.turnstileToken || turnstileToken;
      }
      console.info("[turnstile] master-analyze payload", {
        keys: Object.keys(payload),
        hasToken: !!payload.turnstileToken,
        hasAccessCode: !!payload.accessCode,
      });
      const response = await apiRequest("POST", "/api/master-analyze", payload);
      return response.json();
    },
    onSuccess: (data: MasterResult) => {
      const remaining = (data as any).remaining;
      const returnedTier = (data as any).paidTier;
      const scansLeft = (data as any).scansRemaining;

      if (returnedTier && returnedTier !== 'free') {
        setPaidTier(returnedTier);
      }

      if (activeAccessCode && scansLeft !== undefined) {
        setActiveAccessCode(prev => prev ? { ...prev, scansRemaining: scansLeft } : null);
      }

      if (!activeAccessCode && remaining !== undefined) {
        setFreeScansLeft(remaining);
      }

      const scanInfo = activeAccessCode
        ? `${scansLeft} scan${scansLeft !== 1 ? 's' : ''} remaining.`
        : (remaining !== undefined ? `${remaining} free ${remaining === 1 ? 'analysis' : 'analyses'} remaining today.` : '');

      toast({
        title: t('master.payment.analysisCompleteTitle'),
        description: `All tools finished analyzing ${data.url}${scanInfo ? `. ${scanInfo}` : ''}`
      });
      setResult(data);
      setEmailCaptured(false);
      resetTurnstile();
    },
    onError: (error: any) => {
      const isRateLimit = error.message?.includes('limit') || error.message?.includes('429');
      const isNoScans = error.message?.includes('No scans remaining');
      if (isRateLimit) {
        setFreeScansLeft(0);
      }
      toast({ 
        title: isRateLimit ? "Daily Limit Reached" : isNoScans ? "No Scans Left" : "Analysis Failed", 
        description: isRateLimit ? "You've used all 3 free analyses today. Upgrade for unlimited access." : isNoScans ? "Your access code has no scans remaining. Purchase a new plan for more scans." : (error.message || "Something went wrong"), 
        variant: "destructive" 
      });
      resetTurnstile();
    },
  });

  const onSubmit = (values: z.infer<FormSchema>) => {
    console.info("[turnstile] submit invoked", {
      hasSiteKey: !!turnstileSiteKey,
      hasToken: !!turnstileToken,
      hasWidgetId: turnstileWidgetId.current !== null,
    });
    if (turnstileSiteKey && !turnstileToken) {
      pendingSubmitValues.current = values;
      const w = window as any;
      if (turnstileWidgetId.current !== null && w.turnstile?.execute) {
        console.info("[turnstile] executing widget for token");
        w.turnstile.execute(turnstileWidgetId.current);
      } else {
        console.error("[turnstile] cannot execute widget", {
          hasTurnstileObject: !!w.turnstile,
          hasExecuteFn: !!w.turnstile?.execute,
          hasWidgetId: turnstileWidgetId.current !== null,
        });
        toast({
          title: t('master.payment.verificationRequiredTitle'),
          description: t('master.payment.verificationRequiredDescription'),
          variant: "destructive",
        });
      }
      return;
    }
    analyzeMutation.mutate({ ...values, turnstileToken: turnstileToken || undefined });
  };

  const handleDownloadPdf = async (tier: 'free' | 'basic' | 'pro' = 'free') => {
    if (!result || !result.sessionId) return;

    const normalizedPaidTier: 'free' | 'basic' | 'pro' =
      paidTier === 'pro' ? 'pro' : paidTier === 'basic' ? 'basic' : 'free';
    const tierRank: Record<'free' | 'basic' | 'pro', number> = { free: 0, basic: 1, pro: 2 };
    const hasTierAccess = tierRank[normalizedPaidTier] >= tierRank[tier];

    if (tier === 'free' && !emailCaptured) {
      setPendingPdfTier(tier);
      setShowEmailModal(true);
      return;
    }

    if (tier !== 'free' && !hasTierAccess) {
      setPricingModalTier(tier);
      setShowPricingModal(true);
      return;
    }

    setPdfDownloading(true);
    try {
      const res = await apiRequest("POST", "/api/master-pdf", { sessionId: result.sessionId, tier, lang: i18n.language === 'hr' ? 'hr' : 'en' });
      const body = await res.json().catch(() => ({} as any));
      if (body?.downloadLink && !body?.sentTo) {
        window.open(body.downloadLink, "_blank", "noopener,noreferrer");
        toast({
          title: t('master.payment.reportReadyTitle'),
          description: t('master.payment.reportReadyDescription'),
        });
      } else {
        toast({
          title: t('master.payment.reportSentTitle'),
          description: t('master.payment.reportSentDescription'),
        });
      }
    } catch (error: any) {
      const msg = String(error?.message || '');
      if (msg.includes('Analysis session not found') || msg.includes('404')) {
        setResult(null);
        try { sessionStorage.removeItem('seo-analyzer-result'); } catch {}
        toast({
          title: t('master.payment.sessionExpiredTitle'),
          description: t('master.payment.sessionExpiredDescription'),
          variant: "destructive",
        });
        return;
      }
      if (error?.message?.includes("No email is associated with this analysis session")) {
        setPendingPdfTier(tier);
        setShowEmailModal(true);
        return;
      }
      if (error?.message?.includes("Report email has already been sent for this scan")) {
        toast({
          title: t('master.payment.reportAlreadySentTitle'),
          description: t('master.payment.reportAlreadySentDescription'),
          variant: "destructive",
        });
        return;
      }
      toast({ title: t('master.payment.pdfDownloadFailedTitle'), description: t('master.payment.pdfDownloadFailedDescription'), variant: "destructive" });
    } finally {
      setPdfDownloading(false);
    }
  };

  const handleEmailSubmit = async (email: string) => {
    if (!result?.sessionId) return;
    setEmailSubmitting(true);
    try {
      await apiRequest("POST", "/api/capture-email", { email, sessionId: result.sessionId });
      setEmailCaptured(true);
      setShowEmailModal(false);
      setPdfDownloading(true);
      const res = await apiRequest("POST", "/api/master-pdf", { sessionId: result.sessionId, tier: pendingPdfTier, lang: i18n.language === 'hr' ? 'hr' : 'en' });
      const body = await res.json().catch(() => ({} as any));
      if (body?.downloadLink && !body?.sentTo) {
        window.open(body.downloadLink, "_blank", "noopener,noreferrer");
        toast({ title: t('master.payment.reportReadyTitle'), description: t('master.payment.reportReadyDescription') });
      } else {
        toast({ title: t('master.payment.emailSavedTitle'), description: t('master.payment.reportSentDescription') });
      }
    } catch (error: any) {
      const msg = String(error?.message || '');
      if (msg.includes('Analysis session not found') || msg.includes('404')) {
        setShowEmailModal(false);
        setResult(null);
        try { sessionStorage.removeItem('seo-analyzer-result'); } catch {}
        toast({
          title: t('master.payment.sessionExpiredTitle'),
          description: t('master.payment.sessionExpiredDescription'),
          variant: "destructive",
        });
      } else {
        toast({ title: t('toast.error'), description: t('toast.saveEmail'), variant: "destructive" });
      }
    } finally {
      setPdfDownloading(false);
      setEmailSubmitting(false);
    }
  };

  const handleUpgrade = (tier: 'basic' | 'pro') => {
    if (!result?.sessionId) return;
    setLocation(`/checkout?tier=${tier}&session=${encodeURIComponent(result.sessionId)}`);
  };

  const openPricingModal = (tier: 'basic' | 'pro') => {
    setPricingModalTier(tier);
    setShowPricingModal(true);
  };


  const toolsList = [
    { icon: Search, label: t('master.labels.seo'), color: "#3b82f6" },
    { icon: Zap, label: t('master.labels.ads'), color: "#f59e0b" },
    { icon: Brain, label: t('master.labels.aeo'), color: "#8b5cf6" },
    { icon: Atom, label: t('master.labels.geo'), color: "#14b8a6" },
    { icon: LinkIcon, label: t('master.labels.links'), color: "#ef4444" },
    { icon: ImageIcon, label: t('master.labels.images'), color: "#10b981" },
    { icon: Network, label: t('master.labels.internalLinksShort'), color: "#06b6d4" },
    { icon: FileText, label: t('master.labels.sitemap'), color: "#ec4899" },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Search className="text-primary-foreground w-4 h-4" />
              </div>
              <div className="flex flex-col leading-tight">
                <h1 className="text-xl font-bold text-foreground">{t('header.title')}</h1>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground" data-testid="text-header-slogan">{t('header.slogan')}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 rounded-full gap-1.5"
                    aria-label={t('header.toggleLang')}
                    data-testid="button-language"
                  >
                    <Languages className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase">{i18n.language === 'hr' ? 'HR' : 'EN'}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[140px]">
                  <DropdownMenuLabel>{t('header.languageLabel')}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => i18n.changeLanguage('en')} data-testid="lang-option-en">
                    {t('header.languageEnglish')}
                    {i18n.language === 'en' && <Check className="w-4 h-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => i18n.changeLanguage('hr')} data-testid="lang-option-hr">
                    {t('header.languageCroatian')}
                    {i18n.language === 'hr' && <Check className="w-4 h-4 ml-auto" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDarkMode(!darkMode)}
                className="w-9 h-9 rounded-full"
                aria-label={t('header.toggleDark')}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <HeroSection />

      <div className="container mx-auto px-4 py-8">
        <Card id="scanner" className="mb-8 border-primary/20 shadow-lg scroll-mt-6">
          <CardContent className="pt-6">
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="flex flex-col md:flex-row gap-3">
                <FormField
                  control={form.control}
                  name="url"
                  render={({ field }) => (
                    <FormItem className="flex-1">
                      <FormControl>
                        <Input
                          placeholder={t('form.placeholder')}
                          className="h-12 text-lg"
                          {...field}
                          data-testid="master-url"
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                {turnstileSiteKey && <div ref={turnstileRef} className="hidden" />}
                <Button type="submit" disabled={analyzeMutation.isPending} className="h-12 px-6 w-full md:w-auto" data-testid="master-analyze">
                  {analyzeMutation.isPending ? (
                    <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t('form.analyzing')}</>
                  ) : (
                    <><Zap className="w-4 h-4 mr-2" />{t('form.runAll')}</>
                  )}
                </Button>
              </form>
            </Form>

            {verificationSuccess && (
              <div className="mt-4 p-4 rounded-lg border border-green-200 dark:border-green-800 bg-gradient-to-r from-green-50 to-emerald-50 dark:from-green-950/40 dark:to-emerald-950/40 flex items-start gap-3">
                <CheckCircle2 className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-green-800 dark:text-green-200">{t('modals.verifiedBanner.title')}</p>
                  <p className="text-sm text-green-700 dark:text-green-300 mt-0.5">
                    {verificationSuccess.scansRemaining > 0
                      ? t('modals.verifiedBanner.description', { tier: verificationSuccess.tier === 'pro' ? 'Pro' : 'Basic', count: verificationSuccess.scansRemaining })
                      : verificationSuccess.email}
                  </p>
                </div>
                <Button variant="ghost" size="sm" className="text-green-700 dark:text-green-300 hover:bg-green-100 dark:hover:bg-green-900/40 h-7 px-2 text-xs shrink-0" onClick={() => setVerificationSuccess(null)}>
                  {t('modals.verifiedBanner.dismiss')}
                </Button>
              </div>
            )}

            <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
              {activeAccessCode ? (
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-gradient-to-r from-purple-100 to-blue-100 dark:from-purple-950/50 dark:to-blue-950/50 border border-purple-200 dark:border-purple-800">
                    <TicketCheck className="w-3.5 h-3.5 text-purple-600" />
                    <span className="text-xs font-semibold text-purple-700 dark:text-purple-300">{activeAccessCode.tier === 'pro' ? 'Pro' : 'Basic'}</span>
                    <span className="text-xs text-purple-600 dark:text-purple-400">·</span>
                    <span className="text-xs font-medium text-purple-600 dark:text-purple-400">{activeAccessCode.scansRemaining >= 999999 ? t('accessCode.scansLeftInfinity') : t('accessCode.scansLeft', { count: activeAccessCode.scansRemaining })}</span>
                  </div>
                  <span className="text-[10px] text-muted-foreground font-mono">{activeAccessCode.code}</span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 rounded-full text-muted-foreground hover:text-destructive"
                    onClick={() => { setActiveAccessCode(null); setPaidTier('free'); setAccessCode(''); setShowAccessCodeInput(false); }}
                    aria-label={t('accessCode.remove')}
                    title={t('accessCode.remove')}
                    data-testid="button-remove-access-code"
                  >
                    <XCircle className="w-4 h-4" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  {showAccessCodeInput ? (
                    <div className="flex flex-col gap-1.5">
                      {verificationPendingEmail ? (
                        <div className="flex items-center gap-2 px-2 py-1.5 rounded border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-950/30 text-xs text-amber-800 dark:text-amber-300" data-testid="status-verification-pending">
                          <span>{t('verification.checkInbox', { email: verificationPendingEmail })}</span>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => { setVerificationPendingEmail(null); setShowAccessCodeInput(false); setAccessCode(''); setRedeemEmail(''); }}
                            className="h-6 text-xs"
                            data-testid="button-verification-pending-close"
                          >
                            {t('accessCode.cancel')}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 flex-wrap">
                          <Input
                            type="email"
                            placeholder={t('verification.emailPlaceholder')}
                            value={redeemEmail}
                            onChange={(e) => setRedeemEmail(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRedeemCode(); } }}
                            className="h-8 w-48 text-xs"
                            data-testid="input-redeem-email"
                          />
                          <Input
                            placeholder={t('accessCode.placeholder')}
                            value={accessCode}
                            onChange={(e) => setAccessCode(e.target.value.toUpperCase())}
                            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); handleRedeemCode(); } }}
                            className="h-8 w-40 text-xs font-mono"
                            data-testid="input-access-code"
                          />
                          <Button size="sm" variant="outline" onClick={handleRedeemCode} disabled={codeRedeeming || !accessCode.trim()} className="h-8 text-xs" data-testid="button-redeem-activate">
                            {codeRedeeming ? <Loader2 className="w-3 h-3 animate-spin" /> : t('accessCode.activate')}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => { setShowAccessCodeInput(false); setAccessCode(''); setRedeemEmail(''); }} className="h-8 text-xs text-muted-foreground" data-testid="button-redeem-cancel">
                            {t('accessCode.cancel')}
                          </Button>
                        </div>
                      )}
                    </div>
                  ) : (
                    <Button size="sm" variant="ghost" onClick={() => setShowAccessCodeInput(true)} className="h-8 text-xs text-muted-foreground hover:text-foreground">
                      <KeyRound className="w-3.5 h-3.5 mr-1.5" />
                      {t('accessCode.haveCode')}
                    </Button>
                  )}
                </div>
              )}
              <div className="flex items-center gap-2">
                {!activeAccessCode && freeScansLeft !== null && (
                  <div className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${freeScansLeft > 1 ? 'bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 border-emerald-200 dark:border-emerald-800' : freeScansLeft === 1 ? 'bg-amber-50 dark:bg-amber-950/30 text-amber-700 dark:text-amber-400 border-amber-200 dark:border-amber-800' : 'bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-400 border-red-200 dark:border-red-800'}`}>
                    <Gauge className="w-3 h-3" />
                    {t('accessCode.ofToday', { count: freeScansLeft })}
                  </div>
                )}
                <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-primary/5 dark:bg-primary/10 border border-primary/20 text-xs font-medium text-primary">
                  <Sparkles className="w-3 h-3" />
                  {t('accessCode.freeScans')}
                  <span className="text-primary/50">·</span>
                  {t('accessCode.paidPlans')}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {!analyzeMutation.isPending && analyzeMutation.isError && isFetchErrorCode((analyzeMutation.error as any)?.code) && (
          <div className="mt-4">
            <BotBlockedState
              code={(analyzeMutation.error as any).code}
              url={form.getValues("url")}
              onRetry={() => {
                const values = form.getValues();
                analyzeMutation.reset();
                onSubmit(values);
              }}
            />
          </div>
        )}

        {analyzeMutation.isPending && (
          <div className="text-center py-16" data-testid="master-loading">
            <Loader2 className="w-16 h-16 animate-spin text-primary mx-auto mb-4" />
            <p className="text-xl font-medium">{t('loading.title')}</p>
            <p className="text-sm text-muted-foreground mt-2">{t('loading.description')}</p>
            <div className="flex justify-center gap-3 mt-6">
              {toolsList.map((item) => {
                const ToolIcon = item.icon;
                return (
                  <div key={item.label} className="flex flex-col items-center gap-1 animate-pulse">
                    <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: item.color + "20" }}>
                      <ToolIcon className="w-5 h-5" style={{ color: item.color }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground">{item.label}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {!analyzeMutation.isPending && result && (
          <div className="animate-in slide-in-from-bottom-4 duration-500" data-testid="master-results">
            <OverallDashboard data={result} onDownloadPdf={handleDownloadPdf} sessionId={result.sessionId} paidTier={paidTier} emailCaptured={emailCaptured} />

            <SectionCard title={t('sections.seoAudit')} icon={Search} score={result.seo.data?.overallScore ?? null} error={result.seo.error} testId="master-seo" color="#3b82f6"
              summaryContent={result.seo.data && <SeoSummary data={result.seo.data} />}>
              {result.seo.data && <SeoSection data={result.seo.data} url={result.url} paidTier={paidTier} onUpgrade={openPricingModal} />}
            </SectionCard>

            <SectionCard title={t('sections.googleAds')} icon={Zap} score={result.ads.data?.score ?? null} error={result.ads.error} testId="master-ads" color="#f59e0b"
              summaryContent={result.ads.data && <AdsSummary data={result.ads.data} />}>
              {result.ads.data && <AdsSection data={result.ads.data} url={result.url} paidTier={paidTier} onUpgrade={openPricingModal} />}
            </SectionCard>

            <SectionCard title={t('sections.aeo')} icon={Brain} score={result.aeo.data ? (result.aeo.data.results as AeoAnalysisResults).score : null} error={result.aeo.error} testId="master-aeo" color="#8b5cf6"
              summaryContent={result.aeo.data && <AeoSummary data={result.aeo.data} />}>
              {result.aeo.data && <AeoSection data={result.aeo.data} url={result.url} paidTier={paidTier} onUpgrade={openPricingModal} />}
            </SectionCard>

            <SectionCard title={t('sections.geo')} icon={Atom} score={result.geo.data ? (result.geo.data.results as GeoAnalysisResults).score : null} error={result.geo.error} testId="master-geo" color="#14b8a6"
              summaryContent={result.geo.data && <GeoSummary data={result.geo.data} />}>
              {result.geo.data && <GeoSection data={result.geo.data} url={result.url} paidTier={paidTier} onUpgrade={openPricingModal} />}
            </SectionCard>

            <SectionCard title={t('sections.brokenLinks')} icon={LinkIcon} score={result.brokenLinks.data?.score ?? null} error={result.brokenLinks.error} testId="master-broken-links" color="#ef4444"
              summaryContent={result.brokenLinks.data && <BrokenLinksSummary data={result.brokenLinks.data} />}>
              {result.brokenLinks.data && <BrokenLinksSection data={result.brokenLinks.data} paidTier={paidTier} onUpgrade={openPricingModal} />}
            </SectionCard>

            <SectionCard title={t('sections.imageOpt')} icon={ImageIcon} score={result.imageOptimization.data?.score ?? null} error={result.imageOptimization.error} testId="master-images" color="#10b981"
              summaryContent={result.imageOptimization.data && <ImageOptSummary data={result.imageOptimization.data} />}>
              {result.imageOptimization.data && <ImageOptSection data={result.imageOptimization.data} paidTier={paidTier} onUpgrade={openPricingModal} />}
            </SectionCard>

            <SectionCard title={t('sections.internalLinks')} icon={Network} score={result.internalLinking.data?.score ?? null} error={result.internalLinking.error} testId="master-internal-links" color="#06b6d4"
              summaryContent={result.internalLinking.data && <InternalLinkSummary data={result.internalLinking.data} />}>
              {result.internalLinking.data && <InternalLinkSection data={result.internalLinking.data} paidTier={paidTier} onUpgrade={openPricingModal} />}
            </SectionCard>

            <SectionCard title={t('sections.sitemap')} icon={FileText} score={result.sitemapValidator.data?.score ?? null} error={result.sitemapValidator.error} testId="master-sitemap" color="#ec4899"
              summaryContent={result.sitemapValidator.data && <SitemapSummary data={result.sitemapValidator.data} />}>
              {result.sitemapValidator.data && <SitemapSection data={result.sitemapValidator.data} paidTier={paidTier} onUpgrade={openPricingModal} />}
            </SectionCard>
          </div>
        )}

        <UspSection />

        <ComparisonTable
          hasResult={!!result?.sessionId}
          onScrollToScanner={() => {
            const el = document.getElementById("scanner");
            el?.scrollIntoView({ behavior: "smooth", block: "start" });
            setTimeout(() => {
              const input = document.querySelector<HTMLInputElement>('[data-testid="master-url"]');
              input?.focus({ preventScroll: true });
            }, 650);
          }}
          onUpgrade={handleUpgrade}
        />

        <FaqSection />

        <UpgradeCta />

        {(() => {
          const emailModalNs = pendingPdfTier === 'pro' ? 'modals.proReport' : pendingPdfTier === 'basic' ? 'modals.basicReport' : 'modals.freeReport';
          const emailModalIconColor = pendingPdfTier === 'pro' ? 'text-purple-500' : pendingPdfTier === 'basic' ? 'text-blue-500' : 'text-green-500';
          const emailModalBtnClass = pendingPdfTier === 'pro' ? 'bg-purple-600 hover:bg-purple-700' : pendingPdfTier === 'basic' ? 'bg-blue-600 hover:bg-blue-700' : 'bg-green-600 hover:bg-green-700';
          return (
            <Dialog open={showEmailModal} onOpenChange={setShowEmailModal}>
              <DialogContent className="sm:max-w-md">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Mail className={`w-5 h-5 ${emailModalIconColor}`} />
                    {t(`${emailModalNs}.title`)}
                  </DialogTitle>
                  <DialogDescription>
                    {t(`${emailModalNs}.description`)}
                  </DialogDescription>
                </DialogHeader>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  const formData = new FormData(e.target as HTMLFormElement);
                  const email = formData.get('email') as string;
                  if (email) handleEmailSubmit(email);
                }} className="space-y-4">
                  <div>
                    <Label htmlFor="capture-email">{t(`${emailModalNs}.emailLabel`)}</Label>
                    <Input id="capture-email" name="email" type="email" placeholder={t(`${emailModalNs}.emailPlaceholder`)} required className="mt-1" />
                  </div>
                  <div className="flex gap-2">
                    <Button type="submit" disabled={emailSubmitting} className={`flex-1 ${emailModalBtnClass}`}>
                      {emailSubmitting ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />{t(`${emailModalNs}.sending`)}</> : <><Download className="w-4 h-4 mr-2" />{t(`${emailModalNs}.download`)}</>}
                    </Button>
                  </div>
                  <p className="text-xs text-muted-foreground text-center">{t(`${emailModalNs}.privacy`)}</p>
                </form>
              </DialogContent>
            </Dialog>
          );
        })()}

        <Dialog open={showPricingModal} onOpenChange={(open) => { setShowPricingModal(open); if (!open) setPricingModalTier(null); }}>
          <DialogContent className="sm:max-w-2xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-purple-500" />
                {t('modals.pricing.title')}
              </DialogTitle>
              <DialogDescription>
                {t('modals.pricing.description')}
              </DialogDescription>
            </DialogHeader>
            <div className={`grid grid-cols-1 gap-4 mt-4 ${pricingModalTier ? '' : 'sm:grid-cols-2'}`}>
              {pricingModalTier !== 'pro' && (
              <Card className="border-blue-200 dark:border-blue-800">
                <CardContent className="p-6">
                  <div className="text-2xl font-bold text-blue-600 mb-2">{t('modals.pricing.basicPrice')}</div>
                  <div className="text-lg font-semibold mb-3">{t('modals.pricing.basicTitle')}</div>
                  <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />{t('modals.pricing.basicFeatures.fullBreakdown')}</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />{t('modals.pricing.basicFeatures.detailedScores')}</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-blue-500 mt-0.5 shrink-0" />{t('modals.pricing.basicFeatures.downloadPdf')}</li>
                    <li className="flex items-start gap-2"><XCircle className="w-4 h-4 text-gray-300 mt-0.5 shrink-0" />{t('modals.pricing.basicFeatures.noFix')}</li>
                  </ul>
                  <div className="bg-blue-50 dark:bg-blue-950/40 rounded-md p-2.5 mb-4 text-center">
                    <span className="text-sm font-semibold text-blue-700 dark:text-blue-300">{t('modals.pricing.basicCredits')}</span>
                    <p className="text-[11px] text-blue-600/70 dark:text-blue-400/70 mt-0.5">{t('modals.pricing.basicCreditsDesc')}</p>
                  </div>
                  <Button onClick={() => { setShowPricingModal(false); handleUpgrade('basic'); }} className="w-full bg-blue-600 hover:bg-blue-700">
                    <CreditCard className="w-4 h-4 mr-2" />{t('modals.pricing.getBasic')}
                  </Button>
                </CardContent>
              </Card>
              )}
              {pricingModalTier !== 'basic' && (
              <Card className="border-purple-300 dark:border-purple-700 ring-2 ring-purple-400">
                <CardContent className="p-6">
                  <div className="flex items-center gap-2 mb-2">
                    <Badge className="bg-purple-500 text-white text-xs">{t('modals.pricing.bestValue')}</Badge>
                  </div>
                  <div className="text-2xl font-bold text-purple-600 mb-2">{t('modals.pricing.proPrice')}</div>
                  <div className="text-lg font-semibold mb-3">{t('modals.pricing.proTitle')}</div>
                  <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />{t('modals.pricing.proFeatures.fullBreakdown')}</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />{t('modals.pricing.proFeatures.completeFix')}</li>
                    <li className="flex items-start gap-2"><CheckCircle2 className="w-4 h-4 text-purple-500 mt-0.5 shrink-0" />{t('modals.pricing.proFeatures.downloadPdf')}</li>
                  </ul>
                  <div className="bg-purple-50 dark:bg-purple-950/40 rounded-md p-2.5 mb-4 text-center">
                    <span className="text-sm font-semibold text-purple-700 dark:text-purple-300">{t('modals.pricing.proCredits')}</span>
                    <p className="text-[11px] text-purple-600/70 dark:text-purple-400/70 mt-0.5">{t('modals.pricing.proCreditsDesc')}</p>
                  </div>
                  <Button onClick={() => { setShowPricingModal(false); handleUpgrade('pro'); }} className="w-full bg-purple-600 hover:bg-purple-700">
                    <Star className="w-4 h-4 mr-2" />{t('modals.pricing.getPro')}
                  </Button>
                </CardContent>
              </Card>
              )}
            </div>
          </DialogContent>
        </Dialog>

        <Dialog open={showAccessCodeDisplay} onOpenChange={setShowAccessCodeDisplay}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-green-500" />
                {t('modals.accessCode.title')}
              </DialogTitle>
              <DialogDescription>
                {t('modals.accessCode.description', {
                  email: pendingCodeData?.email || '',
                  tier: pendingCodeData?.tier === 'pro' ? 'Pro' : 'Basic',
                  count: pendingCodeData?.scansRemaining ?? 0,
                })}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="p-4 bg-gradient-to-r from-green-50 to-blue-50 dark:from-green-950/40 dark:to-blue-950/40 rounded-lg border border-green-200 dark:border-green-800 flex items-start gap-3">
                <Mail className="w-5 h-5 text-green-600 dark:text-green-400 shrink-0 mt-0.5" />
                <p className="text-sm text-green-800 dark:text-green-200">{t('modals.accessCode.checkEmail')}</p>
              </div>
              <Button onClick={() => setShowAccessCodeDisplay(false)} className="w-full">
                {t('modals.accessCode.close')}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        <footer className="bg-card border-t border-border mt-16">
          <div className="container mx-auto px-4 py-8">
            <div className="flex flex-col md:flex-row items-center justify-between">
              <div className="flex items-center space-x-3 mb-4 md:mb-0">
                <div className="w-6 h-6 bg-primary rounded flex items-center justify-center">
                  <Search className="text-primary-foreground w-3 h-3" />
                </div>
                <span className="text-muted-foreground">{t('footer.copyrightPrefix', { year: new Date().getFullYear() })} <a href="https://magicmarinac.hr" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline font-medium">{t('footer.companyName')}</a>.</span>
              </div>
              <div className="flex items-center space-x-6 text-sm">
                <Link href="/privacy-policy" className="text-muted-foreground hover:text-foreground">{t('footer.privacy')}</Link>
                <Link href="/terms-of-service" className="text-muted-foreground hover:text-foreground">{t('footer.terms')}</Link>
                <a href="mailto:info@magicmarinac.hr" target="_blank" rel="noopener noreferrer" className="text-muted-foreground hover:text-foreground">{t('footer.support')}</a>
              </div>
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
