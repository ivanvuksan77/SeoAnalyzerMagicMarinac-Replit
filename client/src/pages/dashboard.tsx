import { useState } from "react";
import { Link } from "wouter";
import { Search, User, Settings, BarChart3 } from "lucide-react";
import { useTranslation } from "react-i18next";
import AnalysisForm from "@/components/analysis-form";
import AnalysisResults from "@/components/analysis-results";
import { SeoAnalysis } from "@shared/schema";
import { useSeo } from "@/lib/seo";

export default function Dashboard() {
  const { t } = useTranslation();
  useSeo({ title: t("seo.dashboard.title"), description: t("seo.dashboard.description"), path: "/dashboard" });
  const [currentAnalysis, setCurrentAnalysis] = useState<SeoAnalysis | null>(null);

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
              <Search className="text-primary-foreground w-4 h-4" />
            </div>
            <div className="flex flex-col leading-tight">
              <h1 className="text-xl font-bold text-foreground">FreeSEOSiteAnalyzer</h1>
              <span className="text-[11px] font-medium tracking-wide text-muted-foreground">Scan. Snap. Fix What Matters.</span>
            </div>
          </div>
          <nav className="hidden md:flex items-center space-x-6">
            <Link href="/master-analyzer" className="text-muted-foreground hover:text-foreground transition-colors">Master Analyzer</Link>
            <Link href="/" className="text-foreground font-medium transition-colors">FreeSEOSiteAnalyzer</Link>
            <Link href="/ads-analyzer" className="text-muted-foreground hover:text-foreground transition-colors">Ads Landing Page</Link>
            <Link href="/aeo-analyzer" className="text-muted-foreground hover:text-foreground transition-colors">AEO / AI SEO</Link>
            <Link href="/site-tools" className="text-muted-foreground hover:text-foreground transition-colors">Site Tools</Link>
            <button className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors">
              <User className="w-4 h-4 mr-2 inline" />Account
            </button>
          </nav>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        {/* Analysis Form */}
        <AnalysisForm onAnalysisComplete={setCurrentAnalysis} />

        {/* Results */}
        {currentAnalysis && (
          <AnalysisResults analysis={currentAnalysis} />
        )}

        {/* Footer */}
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
