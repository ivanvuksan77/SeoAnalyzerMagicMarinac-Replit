import "./_group.css";
import { CheckCircle2, XCircle, AlertCircle, Search, Megaphone, Sparkles, Globe2, LinkIcon, Image as ImageIcon, Network, Map, Crown } from "lucide-react";

const TOOLS = [
  { name: "SEO Audit",            color: "#3b82f6", score: 72, icon: Search,
    checks: [
      { s: "pass",     t: "Title tag present",            d: "\"Example Domain — Reliable hosting\" (54 chars)" },
      { s: "fail",     t: "Meta description missing",      d: "No <meta name=\"description\"> tag found on homepage" },
      { s: "pass",     t: "Canonical URL set",             d: "https://example.com/" },
      { s: "warning",  t: "H1 used twice",                  d: "Two <h1> elements found in main content" },
      { s: "pass",     t: "robots meta allows indexing",    d: "index, follow" },
      { s: "warning",  t: "Open Graph image missing",       d: "og:image not set — link previews will be blank" },
    ]},
  { name: "Google Ads Landing Page", color: "#f59e0b", score: 64, icon: Megaphone,
    checks: [
      { s: "warning",  t: "LCP 4.2s (slow)",                d: "Largest Contentful Paint above the 2.5s good threshold" },
      { s: "pass",     t: "Mobile viewport set",            d: "<meta name=\"viewport\" ...> present" },
      { s: "fail",     t: "No conversion tracking detected", d: "No GA4 / Google Ads conversion events found" },
      { s: "pass",     t: "HTTPS enforced",                 d: "All requests served over TLS" },
    ]},
  { name: "AEO / AI SEO Readiness", color: "#8b5cf6", score: 58, icon: Sparkles,
    checks: [
      { s: "fail",     t: "No FAQ schema",                  d: "AI assistants can't extract Q&A blocks for citation" },
      { s: "warning",  t: "Thin author bios",               d: "Author E-E-A-T signals are missing on 3 pages" },
      { s: "pass",     t: "Article schema present",         d: "Schema.org/Article detected on 8 pages" },
    ]},
  { name: "GEO / Generative Engine", color: "#14b8a6", score: 51, icon: Globe2,
    checks: [
      { s: "fail",     t: "No LocalBusiness schema",        d: "Generative engines can't surface your address / hours" },
      { s: "warning",  t: "City/region not in title tags",  d: "0 of 12 pages mention service area" },
    ]},
  { name: "Broken Link Check",       color: "#ef4444", score: 88, icon: LinkIcon,
    checks: [
      { s: "pass",     t: "All 47 internal links resolve",  d: "0 internal 404s detected" },
      { s: "warning",  t: "2 external links 404",           d: "/blog/post-a → twitter.com/legacy (404)" },
    ]},
  { name: "Image Optimization",      color: "#10b981", score: 79, icon: ImageIcon,
    checks: [
      { s: "fail",     t: "12 images over 500KB",           d: "hero.jpg: 1.4MB, gallery-3.png: 980KB ..." },
      { s: "warning",  t: "8 images missing alt text",      d: "Accessibility + SEO impact" },
      { s: "pass",     t: "WebP support detected",          d: "Server negotiates WebP variants" },
    ]},
  { name: "Internal Linking",        color: "#06b6d4", score: 67, icon: Network,
    checks: [
      { s: "warning",  t: "3 orphan pages found",           d: "/services/legacy is not linked from anywhere" },
      { s: "pass",     t: "Avg 4.2 internal links/page",    d: "Healthy depth distribution" },
    ]},
  { name: "Sitemap & Robots.txt",    color: "#ec4899", score: 92, icon: Map,
    checks: [
      { s: "pass",     t: "sitemap.xml found",              d: "https://example.com/sitemap.xml — 47 URLs" },
      { s: "pass",     t: "robots.txt valid",               d: "Sitemap directive present" },
    ]},
];

function ScoreCircle({ score, color, label }: { score: number; color: string; label: string }) {
  const r = 22; const c = 2 * Math.PI * r; const dash = (score / 100) * c;
  return (
    <div className="flex flex-col items-center" style={{ width: 64 }}>
      <div className="relative" style={{ width: 56, height: 56 }}>
        <svg width="56" height="56" viewBox="0 0 56 56">
          <circle cx="28" cy="28" r={r} stroke="#e2e8f0" strokeWidth="5" fill="none" />
          <circle cx="28" cy="28" r={r} stroke={color} strokeWidth="5" fill="none"
            strokeDasharray={`${dash} ${c}`} strokeLinecap="round" transform="rotate(-90 28 28)" />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center text-[12px] font-bold">{score}</div>
      </div>
      <div className="text-[8px] text-center mt-1 leading-tight" style={{ color: "#475569" }}>{label}</div>
    </div>
  );
}

function SevPill({ s }: { s: string }) {
  if (s === "fail")    return <span className="pill" style={{ background: "#fee2e2", color: "#b91c1c" }}><XCircle size={10}/>FAIL</span>;
  if (s === "warning") return <span className="pill" style={{ background: "#fef3c7", color: "#b45309" }}><AlertCircle size={10}/>WARN</span>;
  return <span className="pill" style={{ background: "#dcfce7", color: "#166534" }}><CheckCircle2 size={10}/>PASS</span>;
}

export function Basic() {
  const avg = Math.round(TOOLS.reduce((s, t) => s + t.score, 0) / TOOLS.length);
  return (
    <div className="pdf-page">
      <div className="rounded-xl p-4 mb-4" style={{ background: "linear-gradient(135deg,#1e40af 0%,#0ea5e9 100%)", color: "white" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest opacity-90">SiteSnap · Basic Report · €19</div>
            <div className="text-lg font-bold mt-0.5">example.com</div>
            <div className="text-[10px] opacity-90 mt-0.5">Generated 02 May 2026 · Full data · No fix instructions</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase opacity-80">Overall</div>
            <div className="text-3xl font-extrabold leading-none">{avg}<span className="text-base">/100</span></div>
          </div>
        </div>
      </div>

      <div className="card mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] font-bold">Overall Score Dashboard</h3>
          <span className="muted text-[10px]">8 tools · All data included</span>
        </div>
        <div className="flex flex-wrap justify-between gap-y-2">
          {TOOLS.map(t => <ScoreCircle key={t.name} score={t.score} color={t.color} label={t.name} />)}
        </div>
      </div>

      {TOOLS.map(t => {
        const Icon = t.icon;
        const passes = t.checks.filter(c => c.s === "pass").length;
        const fails  = t.checks.filter(c => c.s === "fail").length;
        const warns  = t.checks.filter(c => c.s === "warning").length;
        return (
          <div key={t.name} className="section-card">
            <div className="section-head">
              <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: t.color + "20" }}>
                <Icon size={12} color={t.color} />
              </div>
              <div className="flex-1 font-semibold text-[11px]">{t.name}</div>
              <span className="text-[9px] muted">{passes} pass · {warns} warn · {fails} fail</span>
              <span className="pill" style={{ background: t.color + "15", color: t.color }}>Score {t.score}</span>
            </div>
            {t.checks.map((c, i) => (
              <div key={i} className="check-row">
                <SevPill s={c.s} />
                <div className="flex-1">
                  <div className="font-semibold">{c.t}</div>
                  <div className="muted">{c.d}</div>
                </div>
              </div>
            ))}
          </div>
        );
      })}

      {/* Soft upsell to Pro */}
      <div className="rounded-xl p-3 mt-4" style={{ background: "#f5f3ff", border: "1px solid #ddd6fe" }}>
        <div className="flex items-center gap-2 mb-1">
          <Crown size={12} color="#7c3aed" />
          <span className="font-bold text-[11px]" style={{ color: "#5b21b6" }}>Want the exact fix instructions?</span>
        </div>
        <div className="text-[10px]" style={{ color: "#6d28d9" }}>
          Pro (€29) adds prioritized recommendations, code snippets and step-by-step instructions for every issue above. Existing scan credits can be upgraded.
        </div>
      </div>
    </div>
  );
}
