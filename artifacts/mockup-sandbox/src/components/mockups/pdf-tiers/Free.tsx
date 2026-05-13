import "./_group.css";
import { Lock, AlertTriangle, CheckCircle2, XCircle, AlertCircle, Crown, ArrowRight, Search, Megaphone, Sparkles, Globe2, LinkIcon, Image as ImageIcon, Network, Map } from "lucide-react";

const TOOLS = [
  { name: "SEO Audit",            color: "#3b82f6", score: 72, icon: Search },
  { name: "Google Ads",           color: "#f59e0b", score: 64, icon: Megaphone },
  { name: "AEO Readiness",        color: "#8b5cf6", score: 58, icon: Sparkles },
  { name: "GEO Readiness",        color: "#14b8a6", score: 51, icon: Globe2 },
  { name: "Broken Links",         color: "#ef4444", score: 88, icon: LinkIcon },
  { name: "Image Optimization",   color: "#10b981", score: 79, icon: ImageIcon },
  { name: "Internal Linking",     color: "#06b6d4", score: 67, icon: Network },
  { name: "Sitemap & Robots.txt", color: "#ec4899", score: 92, icon: Map },
];

const ALL_ISSUES = [
  { sev: "critical", section: "SEO Audit", text: "Meta description missing on homepage" },
  { sev: "critical", section: "AEO Readiness", text: "No FAQ schema found — AI assistants can't extract answers" },
  { sev: "warning",  section: "Google Ads", text: "Slow LCP (4.2s) hurts Quality Score" },
  { sev: "warning",  section: "GEO Readiness", text: "No location-based structured data detected" },
  { sev: "critical", section: "Image Optimization", text: "12 images over 500KB and missing alt text" },
  { sev: "warning",  section: "Internal Linking", text: "3 orphan pages found" },
  { sev: "warning",  section: "Broken Links", text: "2 external links return 404" },
  { sev: "warning",  section: "SEO Audit", text: "Open Graph image missing" },
  { sev: "critical", section: "Google Ads", text: "No conversion tracking detected" },
];
const TOP_ISSUES = ALL_ISSUES.slice(0, 3);
const HIDDEN_COUNT = ALL_ISSUES.length - TOP_ISSUES.length;

function ScoreCircle({ score, color, label }: { score: number; color: string; label: string }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
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

function SevPill({ sev }: { sev: string }) {
  if (sev === "critical") return <span className="pill" style={{ background: "#fee2e2", color: "#b91c1c" }}><XCircle size={10}/>CRITICAL</span>;
  if (sev === "warning") return <span className="pill" style={{ background: "#fef3c7", color: "#b45309" }}><AlertCircle size={10}/>WARNING</span>;
  return <span className="pill" style={{ background: "#dcfce7", color: "#166534" }}><CheckCircle2 size={10}/>PASS</span>;
}

export function Free() {
  const avg = Math.round(TOOLS.reduce((s, t) => s + t.score, 0) / TOOLS.length);
  return (
    <div className="pdf-page">
      {/* Header */}
      <div className="rounded-xl p-4 mb-4" style={{ background: "linear-gradient(135deg,#16a34a 0%,#0ea5e9 100%)", color: "white" }}>
        <div className="flex items-center justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-widest opacity-90">SiteSnap · Free Report</div>
            <div className="text-lg font-bold mt-0.5">example.com</div>
            <div className="text-[10px] opacity-90 mt-0.5">Generated 02 May 2026 · 8 tools analyzed</div>
          </div>
          <div className="text-right">
            <div className="text-[9px] uppercase opacity-80">Overall</div>
            <div className="text-3xl font-extrabold leading-none">{avg}<span className="text-base">/100</span></div>
          </div>
        </div>
      </div>

      {/* Overall scores */}
      <div className="card mb-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] font-bold">Overall Score Dashboard</h3>
          <span className="muted text-[10px]">8 tools · Snapshot</span>
        </div>
        <div className="flex flex-wrap justify-between gap-y-2">
          {TOOLS.map(t => <ScoreCircle key={t.name} score={t.score} color={t.color} label={t.name} />)}
        </div>
      </div>

      {/* Key Findings — matches website (first 3 issues + hidden count) */}
      <div className="card mb-4" style={{ borderColor: "#fecaca", background: "#fff1f2" }}>
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <AlertTriangle size={14} color="#dc2626" />
            <h3 className="text-[12px] font-bold" style={{ color: "#991b1b" }}>Key Findings</h3>
          </div>
          <span className="pill" style={{ background: "#fff", color: "#991b1b", border: "1px solid #fecaca" }}>
            {ALL_ISSUES.length} issues found
          </span>
        </div>
        <ul className="space-y-1.5">
          {TOP_ISSUES.map((i, idx) => (
            <li key={idx} className="flex items-start gap-2 text-[10px]">
              <SevPill sev={i.sev} />
              <span><span className="font-semibold">{i.section}:</span> <span className="muted">{i.text}</span></span>
            </li>
          ))}
        </ul>
        <div className="text-[10px] text-center mt-2.5 italic" style={{ color: "#64748b" }}>
          + {HIDDEN_COUNT} more issues hidden — unlock to see all
        </div>
      </div>

      {/* Locked sections preview */}
      <div className="mb-3">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-[12px] font-bold">Detailed Section Breakdown</h3>
          <span className="pill" style={{ background: "#f1f5f9", color: "#475569" }}><Lock size={9}/> Locked in Free</span>
        </div>

        {TOOLS.map(t => {
          const Icon = t.icon;
          return (
            <div key={t.name} className="section-card relative">
              <div className="section-head">
                <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: t.color + "20" }}>
                  <Icon size={12} color={t.color} />
                </div>
                <div className="flex-1 font-semibold text-[11px]">{t.name}</div>
                <span className="pill" style={{ background: t.color + "15", color: t.color }}>Score {t.score}</span>
              </div>
              {/* Blurred preview rows */}
              <div style={{ position: "relative", height: 56, overflow: "hidden" }}>
                <div style={{ filter: "blur(4px)", opacity: 0.55, padding: "8px 14px" }}>
                  <div className="h-2 rounded" style={{ background: "#e2e8f0", width: "85%", marginBottom: 6 }} />
                  <div className="h-2 rounded" style={{ background: "#e2e8f0", width: "70%", marginBottom: 6 }} />
                  <div className="h-2 rounded" style={{ background: "#e2e8f0", width: "60%" }} />
                </div>
                <div style={{
                  position: "absolute", inset: 0,
                  background: "linear-gradient(180deg, rgba(255,255,255,0.3) 0%, rgba(255,255,255,0.95) 80%)",
                  display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                  fontSize: 10, fontWeight: 600, color: "#475569",
                }}>
                  <Lock size={11} /> Full check details locked — upgrade to view
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CTA */}
      <div className="rounded-xl p-4 mt-4" style={{ background: "linear-gradient(135deg,#7c3aed 0%,#2563eb 100%)", color: "white" }}>
        <div className="flex items-center gap-2 mb-1">
          <Crown size={14} /> <span className="font-bold text-[12px]">Unlock the full report</span>
        </div>
        <div className="text-[10px] opacity-95 mb-3">
          See every check, data point and exact instructions to fix what's holding your site back.
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.15)" }}>
            <div className="text-[9px] uppercase opacity-80">Basic</div>
            <div className="text-base font-extrabold">€19</div>
            <div className="text-[9px] opacity-90">All sections, all data · 5 scan credits</div>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: "rgba(255,255,255,0.25)", border: "1px solid rgba(255,255,255,0.5)" }}>
            <div className="text-[9px] uppercase opacity-90">Pro · Recommended</div>
            <div className="text-base font-extrabold">€29</div>
            <div className="text-[9px] opacity-95">Everything in Basic + step-by-step fixes · 10 credits</div>
          </div>
        </div>
        <div className="flex items-center gap-1 text-[10px] mt-2.5 font-semibold">
          Upgrade now <ArrowRight size={11} />
        </div>
      </div>
    </div>
  );
}
