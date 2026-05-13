import { useRef, useState, useCallback } from "react";
import { SeoAnalysis } from "@shared/schema";
import { ProgressRing } from "@/components/ui/progress-ring";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { FileText, Share2 } from "lucide-react";
import CategoryCards from "@/components/category-cards";
import DetailedAnalysis from "@/components/detailed-analysis";
import Recommendations from "@/components/recommendations";
import { useTranslation } from "react-i18next";

interface AnalysisResultsProps {
  analysis: SeoAnalysis;
}

type TabType = "technical" | "keywords" | "content" | "performance" | "accessibility";

export default function AnalysisResults({ analysis }: AnalysisResultsProps) {
  const { t } = useTranslation();
  const detailedRef = useRef<HTMLDivElement>(null);
  const [activeDetailTab, setActiveDetailTab] = useState<TabType>("technical");

  const handleViewDetails = useCallback((tab: string) => {
    setActiveDetailTab(tab as TabType);
    setTimeout(() => {
      detailedRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }, 50);
  }, []);
  const handleDownloadPDF = async () => {
    try {
      const response = await fetch(`/api/analysis/${analysis.id}/pdf`);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = url;
      a.download = `seo-report-${analysis.url.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Failed to download PDF:', error);
    }
  };

  const getScoreDescription = (score: number) => {
    if (score >= 90) return t("legacy.analysisResults.scoreDescription.excellent");
    if (score >= 75) return t("legacy.analysisResults.scoreDescription.good");
    if (score >= 60) return t("legacy.analysisResults.scoreDescription.average");
    if (score >= 40) return t("legacy.analysisResults.scoreDescription.belowAverage");
    return t("legacy.analysisResults.scoreDescription.poor");
  };

  return (
    <div className="analysis-complete animate-in slide-in-from-bottom-4 duration-500">
      {/* Overall Score Section */}
      <Card className="rounded-xl border border-border shadow-sm p-6 mb-8">
        <CardContent className="p-0">
          <div className="flex flex-col lg:flex-row items-center justify-between gap-6">
            <div className="flex items-center space-x-6">
              <ProgressRing value={analysis.overallScore} />
              <div>
                <h3 className="text-2xl font-bold text-foreground">{t("seo.overallScore")}</h3>
                <p className="text-muted-foreground">{getScoreDescription(analysis.overallScore)}</p>
                <p className="text-sm text-muted-foreground mt-1" data-testid="text-analyzed-url">
                  {analysis.url}
                </p>
              </div>
            </div>
            
            <div className="flex flex-col sm:flex-row gap-4">
              <Button 
                onClick={handleDownloadPDF}
                className="bg-primary text-primary-foreground px-6 py-3 rounded-lg hover:bg-primary/90 transition-colors font-medium"
                data-testid="button-download-pdf"
              >
                <FileText className="w-4 h-4 mr-2" />
                {t("legacy.analysisResults.downloadPdf")}
              </Button>
              <Button 
                variant="secondary"
                className="px-6 py-3 rounded-lg font-medium border border-border"
                data-testid="button-share-report"
              >
                <Share2 className="w-4 h-4 mr-2" />
                {t("legacy.analysisResults.shareReport")}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Category Cards */}
      <CategoryCards analysis={analysis} onViewDetails={handleViewDetails} />

      {/* Detailed Analysis */}
      <DetailedAnalysis ref={detailedRef} analysis={analysis} activeTab={activeDetailTab} onTabChange={setActiveDetailTab} />

      {/* Recommendations */}
      <Recommendations analysis={analysis} />
    </div>
  );
}
