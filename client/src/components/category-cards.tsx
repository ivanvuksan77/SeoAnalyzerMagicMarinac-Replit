import { SeoAnalysis } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useTranslation } from "react-i18next";
import { 
  Settings, 
  Gauge, 
  Shield, 
  Search, 
  FileText,
  ArrowRight 
} from "lucide-react";

interface CategoryCardsProps {
  analysis: SeoAnalysis;
  onViewDetails?: (tab: string) => void;
}

export default function CategoryCards({ analysis, onViewDetails }: CategoryCardsProps) {
  const { t } = useTranslation();
  const categories = [
    {
      name: t("legacy.categoryCards.categories.technical"),
      tab: "technical",
      score: analysis.technicalScore,
      icon: Settings,
      color: "blue",
      checks: [
        { name: t("legacy.categoryCards.checks.indexingCrawling"), status: "PASS" },
        { name: t("legacy.categoryCards.checks.robots"), status: "PASS" },
        { name: t("legacy.categoryCards.checks.sitemap"), status: "WARNING" },
      ],
    },
    {
      name: t("seo.performance"),
      tab: "performance",
      score: analysis.performanceScore,
      icon: Gauge,
      color: "green",
      checks: [
        { name: t("performance.coreWebVitals"), status: analysis.performanceScore >= 70 ? "PASS" : "NEEDS_WORK" },
        { name: t("legacy.categoryCards.checks.mobileFriendly"), status: "PASS" },
        { name: t("legacy.categoryCards.checks.pageSpeed"), status: analysis.performanceScore >= 80 ? "PASS" : "FAIL" },
      ],
    },
    {
      name: t("seo.accessibility"),
      tab: "accessibility",
      score: analysis.accessibilityScore,
      icon: Shield,
      color: "purple",
      checks: [
        { name: t("legacy.categoryCards.checks.ariaLabels"), status: "PASS" },
        { name: t("legacy.categoryCards.checks.textContrast"), status: "PASS" },
        { name: t("legacy.categoryCards.checks.keyboardNavigation"), status: "WARNING" },
      ],
    },
    {
      name: t("seo.keywords"),
      tab: "keywords",
      score: analysis.keywordScore,
      icon: Search,
      color: "orange",
      checks: [
        { name: t("keywords.metaTitle"), status: "PASS" },
        { name: t("keywords.metaDescription"), status: "PASS" },
        { name: t("keywords.headingStructure"), status: "WARNING" },
      ],
    },
    {
      name: t("legacy.categoryCards.categories.contentQuality"),
      tab: "content",
      score: analysis.contentScore,
      icon: FileText,
      color: "indigo",
      checks: [
        { name: t("legacy.categoryCards.checks.wordCount"), status: "PASS" },
        { name: t("legacy.categoryCards.checks.readability"), status: "PASS" },
        { name: t("legacy.categoryCards.checks.imageAltTags"), status: "WARNING" },
      ],
    },
  ];

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "PASS":
        return "text-green-600";
      case "WARNING":
        return "text-yellow-600";
      case "NEEDS_WORK":
        return "text-yellow-600";
      case "FAIL":
        return "text-red-600";
      default:
        return "text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "PASS":
        return t("common.pass");
      case "WARNING":
        return t("common.warning");
      case "NEEDS_WORK":
        return t("dashboard.needsWork");
      case "FAIL":
        return t("common.fail");
      default:
        return status;
    }
  };

  const getIconBg = (color: string) => {
    switch (color) {
      case "blue":
        return "bg-blue-100";
      case "green":
        return "bg-green-100";
      case "purple":
        return "bg-purple-100";
      case "orange":
        return "bg-orange-100";
      case "indigo":
        return "bg-indigo-100";
      default:
        return "bg-gray-100";
    }
  };

  const getIconColor = (color: string) => {
    switch (color) {
      case "blue":
        return "text-blue-600";
      case "green":
        return "text-green-600";
      case "purple":
        return "text-purple-600";
      case "orange":
        return "text-orange-600";
      case "indigo":
        return "text-indigo-600";
      default:
        return "text-gray-600";
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 mb-8">
      {categories.map((category, index) => {
        const IconComponent = category.icon;
        return (
          <Card key={category.name} className="rounded-xl border border-border shadow-sm p-6">
            <CardContent className="p-0">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className={`w-10 h-10 ${getIconBg(category.color)} rounded-lg flex items-center justify-center`}>
                    <IconComponent className={`w-5 h-5 ${getIconColor(category.color)}`} />
                  </div>
                  <h3 className="text-lg font-semibold text-foreground">{category.name}</h3>
                </div>
                <span 
                  className={`text-2xl font-bold ${getScoreColor(category.score)}`}
                  data-testid={`text-${category.tab}-score`}
                >
                  {category.score}
                </span>
              </div>
              <div className="space-y-2">
                {category.checks.map((check) => (
                  <div key={check.name} className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">{check.name}</span>
                    <span className={`font-medium ${getStatusColor(check.status)}`}>
                      {getStatusLabel(check.status)}
                    </span>
                  </div>
                ))}
              </div>
              <Button 
                variant="ghost" 
                className="w-full mt-4 text-primary hover:text-primary/80 text-sm font-medium justify-center"
                data-testid={`button-view-${category.tab}-details`}
                onClick={() => onViewDetails?.(category.tab)}
              >
                {t("legacy.categoryCards.viewDetails")} <ArrowRight className="w-4 h-4 ml-1" />
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );
}
