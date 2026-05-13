import { useState } from "react";
import {
  ArrowRight,
  Sparkles,
  Zap,
  Crown,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  Megaphone,
  Brain,
  Gauge,
  Sun,
  Moon,
} from "lucide-react";

type Issue = { sev: "fail" | "warn" | "pass"; title: string; note: string };
type Tool = { label: string; score: number };

const BRAND_BLUE = "#2563eb";
const BRAND_BLUE_DARK = "#1d4ed8";
const BRAND_BLUE_HOVER = "#1e40af";

export function Hero(props: {
  lang: "en" | "hr";
  brand: string;
  eyebrow: string;
  h1Lead: string;
  h1Accent: string;
  sub: string;
  cta: string;
  trust: string[];
  proofTitle: string;
  reportLabel: string;
  reportSite: string;
  reportSubtitle: string;
  overall: string;
  issuesFound: string;
  issues: Issue[];
  tools: Tool[];
  fixesLabel: string;
}) {
  const [theme, setTheme] = useState<"light" | "dark">("light");
  const isDark = theme === "dark";
  const overallScore = 66;
  const toolIcons = [Search, Megaphone, Brain, Gauge];

  const subColor = isDark ? "#94a3b8" : "#475569";
  const headingColor = isDark ? "#f1f5f9" : "#0f172a";
  const trustColor = isDark ? "#94a3b8" : "#64748b";
  const eyebrowBg = isDark ? "rgba(59, 130, 246, 0.15)" : "rgba(37, 99, 235, 0.08)";
  const eyebrowText = isDark ? "#93c5fd" : "#1d4ed8";
  const eyebrowBorder = isDark ? "rgba(59, 130, 246, 0.35)" : "rgba(37, 99, 235, 0.2)";

  return (
    <div className={`atf-root ${theme} grid-bg relative overflow-hidden`}>
      <div className="blob-a" />
      <div className="blob-b" />

      {/* top nav */}
      <div className="relative max-w-[1200px] mx-auto px-10 pt-7 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white"
            style={{ background: BRAND_BLUE }}
          >
            <Sparkles size={16} strokeWidth={2.4} />
          </div>
          <span className="font-bold text-[15px] tracking-tight" style={{ color: headingColor }}>
            {props.brand}
          </span>
        </div>
        <div className="flex items-center gap-3 text-[12px]">
          <div className="flex items-center gap-2">
            <span
              style={{ color: props.lang === "en" ? headingColor : isDark ? "#64748b" : "#94a3b8" }}
              className={props.lang === "en" ? "font-bold" : ""}
            >
              EN
            </span>
            <span style={{ color: isDark ? "#475569" : "#cbd5e1" }}>·</span>
            <span
              style={{ color: props.lang === "hr" ? headingColor : isDark ? "#64748b" : "#94a3b8" }}
              className={props.lang === "hr" ? "font-bold" : ""}
            >
              HR
            </span>
          </div>
          <button
            onClick={() => setTheme(isDark ? "light" : "dark")}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors"
            style={{
              background: isDark ? "rgba(148, 163, 184, 0.12)" : "rgba(15, 23, 42, 0.06)",
              color: isDark ? "#e2e8f0" : "#334155",
            }}
            data-testid="button-theme-toggle"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun size={15} strokeWidth={2.2} /> : <Moon size={15} strokeWidth={2.2} />}
          </button>
        </div>
      </div>

      {/* hero grid */}
      <div className="relative max-w-[1200px] mx-auto px-10 pt-12 pb-20 grid grid-cols-12 gap-8 items-center">
        {/* LEFT: copy + CTA */}
        <div className="col-span-12 lg:col-span-6">
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6"
            style={{
              background: eyebrowBg,
              color: eyebrowText,
              border: `1px solid ${eyebrowBorder}`,
            }}
          >
            <Zap size={13} strokeWidth={2.4} />
            <span className="text-[11px] font-semibold tracking-wide uppercase">{props.eyebrow}</span>
          </div>

          <h1
            className="text-[52px] leading-[1.05] font-bold mb-5"
            style={{ color: headingColor, letterSpacing: "-0.035em" }}
          >
            {props.h1Lead} <span style={{ color: BRAND_BLUE }}>{props.h1Accent}</span>
          </h1>

          <p className="text-[17px] leading-[1.55] mb-8 max-w-[540px]" style={{ color: subColor }}>
            {props.sub}
          </p>

          <button
            className="group inline-flex items-center gap-2 px-6 py-4 rounded-xl text-white font-semibold text-[16px] transition-all hover:scale-[1.02]"
            style={{
              background: BRAND_BLUE,
              boxShadow: `0 14px 30px -8px ${isDark ? "rgba(37,99,235,0.55)" : "rgba(37,99,235,0.4)"}`,
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = BRAND_BLUE_HOVER)}
            onMouseLeave={(e) => (e.currentTarget.style.background = BRAND_BLUE)}
            data-testid="button-start-free-analysis"
          >
            {props.cta}
            <ArrowRight
              size={18}
              strokeWidth={2.4}
              className="transition-transform group-hover:translate-x-1"
            />
          </button>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-[13px]" style={{ color: trustColor }}>
            {props.trust.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1.5">
                <CheckCircle2 size={14} className="text-emerald-500" strokeWidth={2.4} />
                {t}
              </span>
            ))}
          </div>
        </div>

        {/* RIGHT: PDF mockup */}
        <div className="col-span-12 lg:col-span-6 relative">
          <div className="relative">
            {/* faded back card */}
            <div
              className="pdf-card absolute"
              style={{
                top: 24,
                right: -18,
                width: "92%",
                height: "94%",
                opacity: isDark ? 0.35 : 0.5,
                transform: "rotate(3deg)",
              }}
            />
            {/* main pdf card */}
            <div className="pdf-card relative" style={{ transform: "rotate(-1.5deg)" }}>
              {/* pdf header */}
              <div
                className="px-5 pt-4 pb-4 text-white"
                style={{ background: `linear-gradient(135deg, ${BRAND_BLUE} 0%, ${BRAND_BLUE_DARK} 100%)` }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest opacity-90">
                      <Crown size={11} /> {props.reportLabel}
                    </div>
                    <div className="text-[18px] font-extrabold mt-1 leading-tight">{props.reportSite}</div>
                    <div className="text-[10px] opacity-85 mt-0.5">{props.reportSubtitle}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] uppercase opacity-80 tracking-wider">{props.overall}</div>
                    <div className="text-[34px] font-black leading-none mt-0.5">
                      {overallScore}
                      <span className="text-[15px] opacity-80">/100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* tool score row */}
              <div
                className="px-5 py-4"
                style={{ borderBottom: `1px solid ${isDark ? "#27314f" : "#f1f5f9"}` }}
              >
                <div className="flex items-center justify-between">
                  {props.tools.map((tool, i) => {
                    const Icon = toolIcons[i % toolIcons.length];
                    const color = ["#3b82f6", "#f59e0b", "#8b5cf6", "#14b8a6"][i % 4];
                    return (
                      <ScoreRing
                        key={i}
                        score={tool.score}
                        color={color}
                        label={tool.label}
                        Icon={Icon}
                        isDark={isDark}
                      />
                    );
                  })}
                </div>
              </div>

              {/* issue list */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div
                    className="text-[11px] font-bold tracking-wide uppercase"
                    style={{ color: isDark ? "#cbd5e1" : "#334155" }}
                  >
                    {props.issuesFound}
                  </div>
                  <div
                    className="text-[10px] font-medium"
                    style={{ color: isDark ? "#64748b" : "#94a3b8" }}
                  >
                    {props.issues.length}
                  </div>
                </div>
                <div className="space-y-1.5">
                  {props.issues.map((it, i) => (
                    <IssueRow key={i} {...it} isDark={isDark} />
                  ))}
                </div>
              </div>

              {/* footer accent strip showing fixes */}
              <div
                className="px-5 py-3 flex items-center gap-2 text-[11px] font-semibold"
                style={{
                  background: isDark
                    ? "linear-gradient(90deg, rgba(37,99,235,0.18), rgba(37,99,235,0.08))"
                    : "linear-gradient(90deg, #eff6ff, #dbeafe)",
                  color: isDark ? "#93c5fd" : "#1d4ed8",
                }}
              >
                <span
                  className="pill"
                  style={{
                    background: isDark ? "rgba(37,99,235,0.25)" : "#dbeafe",
                    color: isDark ? "#bfdbfe" : "#1d4ed8",
                    padding: "3px 7px",
                  }}
                >
                  <Crown size={10} /> PRO
                </span>
                {props.fixesLabel} →
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SevPill({ s, lang }: { s: "fail" | "warn" | "pass"; lang: "en" | "hr" }) {
  const labels: Record<string, { en: string; hr: string }> = {
    fail: { en: "FAIL", hr: "GREŠKA" },
    warn: { en: "WARN", hr: "UPOZ" },
    pass: { en: "PASS", hr: "PROLAZ" },
  };
  if (s === "fail")
    return (
      <span className="pill" style={{ background: "#fee2e2", color: "#b91c1c" }}>
        <XCircle size={9} strokeWidth={2.6} />
        {labels.fail[lang]}
      </span>
    );
  if (s === "warn")
    return (
      <span className="pill" style={{ background: "#fef3c7", color: "#b45309" }}>
        <AlertCircle size={9} strokeWidth={2.6} />
        {labels.warn[lang]}
      </span>
    );
  return (
    <span className="pill" style={{ background: "#dcfce7", color: "#166534" }}>
      <CheckCircle2 size={9} strokeWidth={2.6} />
      {labels.pass[lang]}
    </span>
  );
}

function IssueRow({ sev, title, note, isDark }: Issue & { isDark: boolean }) {
  return (
    <div className="flex items-center gap-3 py-1.5">
      <SevPill s={sev} lang="en" />
      <div className="flex-1 min-w-0">
        <div
          className="text-[12px] font-semibold truncate"
          style={{ color: isDark ? "#e2e8f0" : "#1e293b" }}
        >
          {title}
        </div>
      </div>
      <div
        className="text-[10px] font-medium whitespace-nowrap"
        style={{ color: isDark ? "#64748b" : "#94a3b8" }}
      >
        {note}
      </div>
    </div>
  );
}

function ScoreRing({
  score,
  color,
  label,
  Icon,
  isDark,
}: {
  score: number;
  color: string;
  label: string;
  Icon: any;
  isDark: boolean;
}) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div className="flex flex-col items-center" style={{ minWidth: 56 }}>
      <div className="relative" style={{ width: 48, height: 48 }}>
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r={r}
            stroke={isDark ? "#27314f" : "#e2e8f0"}
            strokeWidth="4"
            fill="none"
          />
          <circle
            cx="24"
            cy="24"
            r={r}
            stroke={color}
            strokeWidth="4"
            fill="none"
            strokeDasharray={`${dash} ${c}`}
            strokeLinecap="round"
            transform="rotate(-90 24 24)"
          />
        </svg>
        <div className="absolute inset-0 flex items-center justify-center">
          <Icon size={14} style={{ color }} strokeWidth={2.4} />
        </div>
      </div>
      <div
        className="text-[10px] font-bold mt-1"
        style={{ color: isDark ? "#e2e8f0" : "#334155" }}
      >
        {score}
      </div>
      <div className="text-[9px] mt-0.5" style={{ color: isDark ? "#94a3b8" : "#64748b" }}>
        {label}
      </div>
    </div>
  );
}
