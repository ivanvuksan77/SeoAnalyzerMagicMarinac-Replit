import { useState, useEffect, forwardRef } from "react";
import { SeoAnalysis, TechnicalSeoCheck } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  Search, 
  FileText, 
  Gauge, 
  Shield,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Info,
  ExternalLink
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { useTranslation } from "react-i18next";

interface DetailedAnalysisProps {
  analysis: SeoAnalysis;
  activeTab?: TabType;
  onTabChange?: (tab: TabType) => void;
}

type TabType = "technical" | "keywords" | "content" | "performance" | "accessibility";

const DetailedAnalysis = forwardRef<HTMLDivElement, DetailedAnalysisProps>(function DetailedAnalysis({ analysis, activeTab: controlledTab, onTabChange }, ref) {
  const { t } = useTranslation();
  const [internalTab, setInternalTab] = useState<TabType>("technical");
  const activeTab = controlledTab ?? internalTab;

  const handleTabChange = (tab: TabType) => {
    setInternalTab(tab);
    onTabChange?.(tab);
  };
  const [selectedCheck, setSelectedCheck] = useState<any>(null);

  const getActionGuidance = (check: any) => {
    const guides = {
      "H1 Tags": {
        description: t("legacy.detailedAnalysis.guidance.h1.description"),
        action: check.status === "PASS"
          ? t("legacy.detailedAnalysis.guidance.h1.pass")
          : t("legacy.detailedAnalysis.guidance.h1.fail"),
        resources: ["https://moz.com/learn/seo/title-tag", "https://developers.google.com/web/fundamentals/design-and-ux/typography"]
      },
      "Meta Description": {
        description: t("legacy.detailedAnalysis.guidance.metaDescription.description"),
        action: check.status === "PASS"
          ? t("legacy.detailedAnalysis.guidance.metaDescription.pass")
          : t("legacy.detailedAnalysis.guidance.metaDescription.fail"),
        resources: ["https://moz.com/learn/seo/meta-description", "https://developers.google.com/search/docs/advanced/appearance/snippet"]
      },
      "Image Alt Tags": {
        description: t("legacy.detailedAnalysis.guidance.imageAltTags.description"),
        action: check.status === "PASS"
          ? t("legacy.detailedAnalysis.guidance.imageAltTags.pass")
          : t("legacy.detailedAnalysis.guidance.imageAltTags.fail"),
        resources: ["https://moz.com/learn/seo/alt-text", "https://www.w3.org/WAI/tutorials/images/"]
      }
    };
    
    return guides[check.name as keyof typeof guides] || {
      description: t("legacy.detailedAnalysis.guidance.default.description"),
      action: check.status === "PASS"
        ? t("legacy.detailedAnalysis.guidance.default.pass")
        : t("legacy.detailedAnalysis.guidance.default.fail"),
      resources: ["https://moz.com/learn/seo", "https://developers.google.com/search/docs"]
    };
  };

  const tabs = [
    { key: "technical" as TabType, label: t("legacy.detailedAnalysis.tabs.technical"), icon: Settings },
    { key: "keywords" as TabType, label: t("legacy.detailedAnalysis.tabs.keywords"), icon: Search },
    { key: "content" as TabType, label: t("legacy.detailedAnalysis.tabs.content"), icon: FileText },
    { key: "performance" as TabType, label: t("seo.performance"), icon: Gauge },
    { key: "accessibility" as TabType, label: t("seo.accessibility"), icon: Shield },
  ];

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PASS":
        return t("common.pass");
      case "WARNING":
        return t("common.warning");
      case "FAIL":
        return t("common.fail");
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "PASS":
        return <CheckCircle className="w-4 h-4 text-green-600" />;
      case "WARNING":
        return <AlertTriangle className="w-4 h-4 text-yellow-600" />;
      case "FAIL":
        return <XCircle className="w-4 h-4 text-red-600" />;
      default:
        return null;
    }
  };

  const getStatusBadge = (status: string) => {
    const variants = {
      PASS: "bg-green-100 text-green-800",
      WARNING: "bg-yellow-100 text-yellow-800",
      FAIL: "bg-red-100 text-red-800",
    };
    
    return (
      <Badge variant="secondary" className={variants[status as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
        {getStatusIcon(status)}
        <span className="ml-1">{getStatusLabel(status)}</span>
      </Badge>
    );
  };

  const getPriorityBadge = (priority: string) => {
    const variants = {
      Excellent: "bg-green-100 text-green-800",
      Good: "bg-emerald-100 text-emerald-800", 
      Medium: "bg-yellow-100 text-yellow-800",
      Critical: "bg-red-100 text-red-800",
    };
    
    return (
      <Badge variant="secondary" className={variants[priority as keyof typeof variants] || "bg-gray-100 text-gray-800"}>
        {priority}
      </Badge>
    );
  };

  const renderTechnicalAnalysis = () => {
    const technical = (analysis.results as any)?.technical as TechnicalSeoCheck[] || [];
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-foreground">{t("legacy.detailedAnalysis.table.check")}</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">{t("legacy.detailedAnalysis.table.status")}</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">{t("legacy.detailedAnalysis.table.details")}</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">{t("legacy.detailedAnalysis.table.priority")}</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">{t("legacy.detailedAnalysis.table.action")}</th>
            </tr>
          </thead>
          <tbody>
            {technical.map((check, index) => (
              <tr key={index} className="border-b border-border hover:bg-muted/50">
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-3">
                    <Settings className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{check.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {getStatusBadge(check.status)}
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {check.details}
                </td>
                <td className="py-3 px-4">
                  {getPriorityBadge(check.priority)}
                </td>
                <td className="py-3 px-4">
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-primary hover:text-primary/80"
                        data-testid={`button-review-${check.name.toLowerCase().replace(/\s+/g, '-')}`}
                        onClick={() => setSelectedCheck(check)}
                      >
                        <Info className="w-4 h-4 mr-1" />
                        {check.action || t("legacy.detailedAnalysis.review")}
                      </Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-md">
                      <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                          {getStatusIcon(check.status)}
                          {check.name}
                        </DialogTitle>
                        <DialogDescription>
                          {getActionGuidance(check).description}
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold mb-2">{t("legacy.detailedAnalysis.actionRequired")}</h4>
                          <p className="text-sm text-muted-foreground">
                            {getActionGuidance(check).action}
                          </p>
                        </div>
                        <div>
                          <h4 className="font-semibold mb-2">{t("legacy.detailedAnalysis.learnMore")}</h4>
                          <div className="space-y-1">
                            {getActionGuidance(check).resources.map((resource: string, index: number) => (
                              <a 
                                key={index}
                                href={resource}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex items-center gap-1 text-sm text-primary hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                                {new URL(resource).hostname}
                              </a>
                            ))}
                          </div>
                        </div>
                      </div>
                    </DialogContent>
                  </Dialog>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderAccessibilityAnalysis = () => {
    const accessibility = (analysis.results as any)?.accessibility as any[] || [];
    
    return (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-3 px-4 font-semibold text-foreground">{t("legacy.detailedAnalysis.table.check")}</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">{t("legacy.detailedAnalysis.table.status")}</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">{t("legacy.detailedAnalysis.table.details")}</th>
              <th className="text-left py-3 px-4 font-semibold text-foreground">{t("legacy.detailedAnalysis.table.wcagLevel")}</th>
            </tr>
          </thead>
          <tbody>
            {accessibility.map((check, index) => (
              <tr key={index} className="border-b border-border hover:bg-muted/50">
                <td className="py-3 px-4">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-4 h-4 text-muted-foreground" />
                    <span className="font-medium">{check.name}</span>
                  </div>
                </td>
                <td className="py-3 px-4">
                  {getStatusBadge(check.status)}
                </td>
                <td className="py-3 px-4 text-sm text-muted-foreground">
                  {check.details}
                </td>
                <td className="py-3 px-4">
                  <Badge variant="outline" className="text-xs">
                    {check.wcagLevel}
                  </Badge>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  };

  const renderKeywordAnalysis = () => {
    const keyword = (analysis.results as any)?.keyword as any;
    if (!keyword) return <div>{t("keywords.notAvailable")}</div>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4">
            <h4 className="font-semibold mb-3">{t("keywords.metaTitle")}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{t("legacy.detailedAnalysis.present")}</span>
                <Badge variant={keyword.metaTitle?.present ? "default" : "destructive"}>
                  {keyword.metaTitle?.present ? t("legacy.detailedAnalysis.yes") : t("legacy.detailedAnalysis.no")}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>{t("legacy.detailedAnalysis.length")}</span>
                <span>{t("legacy.detailedAnalysis.characters", { count: keyword.metaTitle?.length || 0 })}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("legacy.detailedAnalysis.optimized")}</span>
                <Badge variant={keyword.metaTitle?.optimized ? "default" : "secondary"}>
                  {keyword.metaTitle?.optimized ? t("legacy.detailedAnalysis.yes") : t("legacy.detailedAnalysis.no")}
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="font-semibold mb-3">{t("keywords.metaDescription")}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{t("legacy.detailedAnalysis.present")}</span>
                <Badge variant={keyword.metaDescription?.present ? "default" : "destructive"}>
                  {keyword.metaDescription?.present ? t("legacy.detailedAnalysis.yes") : t("legacy.detailedAnalysis.no")}
                </Badge>
              </div>
              <div className="flex justify-between">
                <span>{t("legacy.detailedAnalysis.length")}</span>
                <span>{t("legacy.detailedAnalysis.characters", { count: keyword.metaDescription?.length || 0 })}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("legacy.detailedAnalysis.optimized")}</span>
                <Badge variant={keyword.metaDescription?.optimized ? "default" : "secondary"}>
                  {keyword.metaDescription?.optimized ? t("legacy.detailedAnalysis.yes") : t("legacy.detailedAnalysis.no")}
                </Badge>
              </div>
            </div>
          </Card>
        </div>

        <Card className="p-4">
          <h4 className="font-semibold mb-3">{t("legacy.detailedAnalysis.topKeywords")}</h4>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
            {keyword.keywordDensity && Object.entries(keyword.keywordDensity).map(([word, density]: [string, any]) => (
              <div key={word} className="flex justify-between items-center p-2 bg-muted rounded">
                <span className="text-sm">{word}</span>
                <span className="text-sm font-medium">{density}%</span>
              </div>
            ))}
          </div>
        </Card>
      </div>
    );
  };

  const renderContentAnalysis = () => {
    const content = (analysis.results as any)?.content as any;
    if (!content) return <div>{t("legacy.detailedAnalysis.contentNotAvailable")}</div>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4">
            <h4 className="font-semibold mb-3">{t("legacy.detailedAnalysis.contentMetrics")}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{t("legacy.detailedAnalysis.wordCount")}</span>
                <span className="font-medium">{content.wordCount || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("legacy.detailedAnalysis.readabilityScore")}</span>
                <span className="font-medium">{content.readabilityScore || 0}/100</span>
              </div>
              <div className="flex justify-between">
                <span>{t("legacy.detailedAnalysis.structuredData")}</span>
                <Badge variant={content.structuredData ? "default" : "secondary"}>
                  {content.structuredData ? t("legacy.detailedAnalysis.present") : t("legacy.detailedAnalysis.missing")}
                </Badge>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="font-semibold mb-3">{t("legacy.detailedAnalysis.imageAnalysis")}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{t("legacy.detailedAnalysis.totalImages")}</span>
                <span className="font-medium">{content.imageAltTags?.total || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("legacy.detailedAnalysis.withAltTags")}</span>
                <span className="font-medium">{content.imageAltTags?.withAlt || 0}</span>
              </div>
              <div className="flex justify-between">
                <span>{t("legacy.detailedAnalysis.altTagCoverage")}</span>
                <span className="font-medium">{content.imageAltTags?.percentage || 0}%</span>
              </div>
            </div>
          </Card>
        </div>

        {content.schemaMarkup && content.schemaMarkup.length > 0 && (
          <Card className="p-4">
            <h4 className="font-semibold mb-3">{t("tabs.schema")}</h4>
            <div className="flex flex-wrap gap-2">
              {content.schemaMarkup.map((schema: string, index: number) => (
                <Badge key={index} variant="outline">{schema}</Badge>
              ))}
            </div>
          </Card>
        )}
      </div>
    );
  };

  const renderPerformanceAnalysis = () => {
    const performance = (analysis.results as any)?.performance as any;
    if (!performance) return <div>{t("performance.notAvailable")}</div>;

    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-4">
            <h4 className="font-semibold mb-3">{t("performance.coreWebVitals")}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>LCP (Largest Contentful Paint):</span>
                <span className={`font-medium ${performance.coreWebVitals?.lcp <= 2.5 ? 'text-green-600' : 'text-red-600'}`}>
                  {performance.coreWebVitals?.lcp || 0}s
                </span>
              </div>
              <div className="flex justify-between">
                <span>FID (First Input Delay):</span>
                <span className={`font-medium ${performance.coreWebVitals?.fid <= 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                  {performance.coreWebVitals?.fid || 0}s
                </span>
              </div>
              <div className="flex justify-between">
                <span>CLS (Cumulative Layout Shift):</span>
                <span className={`font-medium ${performance.coreWebVitals?.cls <= 0.1 ? 'text-green-600' : 'text-red-600'}`}>
                  {performance.coreWebVitals?.cls || 0}
                </span>
              </div>
            </div>
          </Card>

          <Card className="p-4">
            <h4 className="font-semibold mb-3">{t("performance.pageSpeedScores")}</h4>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span>{t("performance.desktopScore")}</span>
                <span className="font-medium">{performance.pagespeed?.desktop || 0}/100</span>
              </div>
              <div className="flex justify-between">
                <span>{t("legacy.detailedAnalysis.mobile")}</span>
                <span className="font-medium">{performance.pagespeed?.mobile || 0}/100</span>
              </div>
              <div className="flex justify-between">
                <span>{t("performance.mobileScore")}</span>
                <span className="font-medium">{performance.mobileScore || 0}/100</span>
              </div>
              <div className="flex justify-between">
                <span>{t("performance.lighthouseScore")}</span>
                <span className="font-medium">{performance.lighthouseScore || 0}/100</span>
              </div>
            </div>
          </Card>
        </div>
      </div>
    );
  };

  const renderTabContent = () => {
    switch (activeTab) {
      case "technical":
        return renderTechnicalAnalysis();
      case "keywords":
        return renderKeywordAnalysis();
      case "content":
        return renderContentAnalysis();
      case "performance":
        return renderPerformanceAnalysis();
      case "accessibility":
        return renderAccessibilityAnalysis();
      default:
        return null;
    }
  };

  return (
    <Card ref={ref} className="rounded-xl border border-border shadow-sm overflow-hidden mb-8">
      <div className="border-b border-border">
        <nav className="flex">
          {tabs.map((tab) => {
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => handleTabChange(tab.key)}
                className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.key
                    ? "border-primary text-primary bg-primary/5"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
                data-testid={`tab-${tab.key}`}
              >
                <IconComponent className="w-4 h-4 mr-2 inline" />
                {tab.label}
              </button>
            );
          })}
        </nav>
      </div>

      <div className="p-6">
        {renderTabContent()}
      </div>
    </Card>
  );
});

export default DetailedAnalysis;
