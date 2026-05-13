import { SeoAnalysis, SeoRecommendation } from "@shared/schema";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  AlertTriangle, 
  Clock, 
  TrendingUp,
  ExternalLink,
  CheckCircle2
} from "lucide-react";
import { useTranslation } from "react-i18next";

interface RecommendationsProps {
  analysis: SeoAnalysis;
}

export default function Recommendations({ analysis }: RecommendationsProps) {
  const { t } = useTranslation();
  const recommendations = (analysis.recommendations as SeoRecommendation[]) || [];

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case "Critical":
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case "High":
        return <Clock className="w-5 h-5 text-orange-600" />;
      case "Medium":
        return <TrendingUp className="w-5 h-5 text-blue-600" />;
      case "Low":
        return <CheckCircle2 className="w-5 h-5 text-green-600" />;
      default:
        return <AlertTriangle className="w-5 h-5 text-gray-600" />;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "text-red-600";
      case "High":
        return "text-orange-600";
      case "Medium":
        return "text-blue-600";
      case "Low":
        return "text-green-600";
      default:
        return "text-gray-600";
    }
  };

  const getPriorityBg = (priority: string) => {
    switch (priority) {
      case "Critical":
        return "bg-red-100";
      case "High":
        return "bg-orange-100";
      case "Medium":
        return "bg-blue-100";
      case "Low":
        return "bg-green-100";
      default:
        return "bg-gray-100";
    }
  };

  if (recommendations.length === 0) {
    return (
      <Card className="rounded-xl border border-border shadow-sm p-6">
        <CardContent className="p-0 text-center py-8">
          <CheckCircle2 className="w-12 h-12 text-green-500 mx-auto mb-4" />
          <h3 className="text-xl font-bold text-foreground mb-2">{t("legacy.recommendations.emptyTitle")}</h3>
          <p className="text-muted-foreground">
            {t("legacy.recommendations.emptyDescription")}
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-xl border border-border shadow-sm p-6">
      <CardContent className="p-0">
        <h3 className="text-xl font-bold text-foreground mb-4">{t("legacy.recommendations.title")}</h3>
        <div className="space-y-4">
          {recommendations.map((rec, index) => (
            <div key={index} className="border border-border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-3 flex-1">
                  <div className={`w-8 h-8 ${getPriorityBg(rec.priority)} rounded-lg flex items-center justify-center mt-1`}>
                    {getPriorityIcon(rec.priority)}
                  </div>
                  <div className="flex-1">
                    <h4 className="font-semibold text-foreground mb-1">{rec.title}</h4>
                    <p className="text-sm text-muted-foreground mb-3">{rec.description}</p>
                    
                    {rec.actionItems && rec.actionItems.length > 0 && (
                      <div className="mb-3">
                        <h5 className="text-sm font-medium text-foreground mb-2">{t("legacy.recommendations.actionItems")}</h5>
                        <ul className="space-y-1">
                          {rec.actionItems.map((item, actionIndex) => (
                            <li key={actionIndex} className="text-sm text-muted-foreground flex items-start">
                              <span className="w-1 h-1 bg-muted-foreground rounded-full mt-2 mr-2 flex-shrink-0"></span>
                              {item}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    <div className="flex items-center flex-wrap gap-3">
                      <Badge className={`${getPriorityColor(rec.priority)} font-medium`} variant="secondary">
                        {t("legacy.recommendations.priorityLabel", { priority: rec.priority })}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {t("legacy.recommendations.estimatedImpact", { impact: rec.impact })}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {t("legacy.recommendations.timeToFix", { value: rec.timeToFix })}
                      </span>
                    </div>
                  </div>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-primary hover:text-primary/80 flex-shrink-0"
                  data-testid={`button-learn-more-${index}`}
                >
                  {t("legacy.recommendations.learnMore")}
                  <ExternalLink className="w-3 h-3 ml-1" />
                </Button>
              </div>
            </div>
          ))}
        </div>
        
        {recommendations.length > 3 && (
          <div className="mt-6 text-center">
            <Button variant="outline" className="px-6">
              {t("legacy.recommendations.viewAll", { count: recommendations.length })}
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
