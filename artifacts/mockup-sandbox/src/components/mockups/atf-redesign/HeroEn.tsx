import "./_group.css";
import { Hero } from "./_Hero";

export function HeroEn() {
  return (
    <Hero
      lang="en"
      brand="FreeSEOSiteAnalyzer"
      eyebrow="Built for Google Ads + organic SEO"
      h1Lead="Fix Your Google Ranking"
      h1Accent="Issues — Fast"
      sub="Find landing page experience problems, Core Web Vitals issues, and SEO gaps — all prioritized by impact so you know exactly what to fix first."
      cta="Start Free Analysis"
      trust={[
        "Free · No signup",
        "Results in 30 seconds",
        "8 tools in one report",
      ]}
      proofTitle="Sample Pro Report"
      reportLabel="PRO REPORT · €29"
      reportSite="walden-plants.hr"
      reportSubtitle="Full data + prioritized fix instructions"
      overall="OVERALL"
      issuesFound="Top issues found"
      issues={[
        { sev: "fail", title: "Meta description missing", note: "Homepage" },
        { sev: "warn", title: "LCP 4.2s — slow", note: "Core Web Vitals" },
        { sev: "fail", title: "No conversion tracking", note: "Google Ads LP" },
        { sev: "warn", title: "12 images over 500KB", note: "Image optimization" },
      ]}
      tools={[
        { label: "SEO", score: 79 },
        { label: "Ads LP", score: 64 },
        { label: "AEO", score: 58 },
        { label: "Speed", score: 51 },
      ]}
      fixesLabel="Prioritized fixes"
    />
  );
}
