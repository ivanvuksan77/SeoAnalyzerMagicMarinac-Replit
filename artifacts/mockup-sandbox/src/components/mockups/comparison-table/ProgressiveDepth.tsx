import { Search, Megaphone, Brain, Wrench, Crown, Sparkles } from "lucide-react";

type Tier = "free" | "basic" | "pro";

type DepthRow = {
  Icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  feature: string;
  desc: string;
  depths: Record<Tier, string>;
};

const ROWS: DepthRow[] = [
  {
    Icon: Search,
    feature: "SEO audit (8 tools)",
    desc: "Meta tags, headings, Core Web Vitals, schema, mobile, links, images, sitemap",
    depths: {
      free: "Score + top 3 issues per section",
      basic: "Full issue lists, every finding",
      pro: "Full data + copy-paste fixes",
    },
  },
  {
    Icon: Megaphone,
    feature: "Google Ads landing page",
    desc: "Quality Score signals on the page itself",
    depths: {
      free: "Score + 3 critical fails",
      basic: "All findings + LP scoring detail",
      pro: "All findings + per-issue fix code",
    },
  },
  {
    Icon: Brain,
    feature: "AEO / AI SEO readiness",
    desc: "How well ChatGPT, Perplexity & Gemini can quote you",
    depths: {
      free: "Score + top blockers",
      basic: "Full readiness breakdown",
      pro: "Breakdown + answer-engine fixes",
    },
  },
  {
    Icon: Wrench,
    feature: "Implementation guide",
    desc: "What to actually do, in your codebase",
    depths: {
      free: "—",
      basic: "—",
      pro: "Copy-paste HTML, JSON-LD, snippets",
    },
  },
];

const HEADERS: { id: Tier; label: string; price: string; sub: string; featured?: boolean }[] = [
  { id: "free",  label: "Free",  price: "€0",  sub: "Try it" },
  { id: "basic", label: "Basic", price: "€19", sub: "Full data" },
  { id: "pro",   label: "Pro",   price: "€29", sub: "Data + fixes", featured: true },
];

function depthClass(t: Tier, value: string) {
  if (value === "—") return "text-slate-300 italic";
  if (t === "free")  return "text-slate-700";
  if (t === "basic") return "text-blue-800 font-medium";
  return "text-amber-900 font-semibold";
}

function depthBg(t: Tier, value: string) {
  if (value === "—") return "bg-slate-50/50";
  if (t === "free")  return "bg-white";
  if (t === "basic") return "bg-blue-50/60";
  return "bg-amber-50";
}

export function ProgressiveDepth() {
  return (
    <div className="min-h-screen bg-slate-50 px-8 py-10 font-sans">
      <div className="max-w-[1040px] mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-3 bg-emerald-50 ring-1 ring-emerald-200 text-emerald-700 text-[11px] font-semibold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> What you actually get
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Same scan. Three levels of detail.</h2>
          <p className="mt-2 text-sm text-slate-500 max-w-xl mx-auto">
            Every plan runs the same audit engine. The difference is how much of the report you see — and whether we hand you the fixes.
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/60 ring-1 ring-slate-200 overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1.3fr)_repeat(3,minmax(0,1fr))]">
            <div className="p-4 bg-slate-50 border-b border-slate-200" />
            {HEADERS.map((h) => (
              <div
                key={h.id}
                className={
                  "p-4 border-b border-slate-200 text-center relative " +
                  (h.featured
                    ? "bg-gradient-to-b from-amber-100 to-amber-50"
                    : h.id === "basic"
                      ? "bg-blue-50"
                      : "bg-slate-50")
                }
              >
                {h.featured && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow ring-2 ring-white">
                    <Crown className="w-3 h-3" /> Most popular
                  </div>
                )}
                <div className={"text-[11px] font-bold uppercase tracking-wider " + (h.featured ? "text-amber-800" : h.id === "basic" ? "text-blue-700" : "text-slate-500")}>{h.label}</div>
                <div className="text-2xl font-bold text-slate-900 tabular-nums leading-none mt-1">{h.price}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{h.sub}</div>
              </div>
            ))}

            {ROWS.map((row, idx) => {
              const Icon = row.Icon;
              return (
                <div key={row.feature} className="contents">
                  <div className={"p-4 border-b border-slate-100 " + (idx % 2 === 1 ? "bg-slate-50/40" : "")}>
                    <div className="flex items-start gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center shrink-0">
                        <Icon className="w-4 h-4 text-slate-700" strokeWidth={2.4} />
                      </div>
                      <div>
                        <div className="text-sm font-semibold text-slate-900">{row.feature}</div>
                        <div className="text-[11px] text-slate-500 leading-snug mt-0.5">{row.desc}</div>
                      </div>
                    </div>
                  </div>
                  {(["free","basic","pro"] as Tier[]).map((t) => (
                    <div key={t} className={"p-4 border-b border-slate-100 text-[12.5px] leading-snug " + depthBg(t, row.depths[t]) + " " + depthClass(t, row.depths[t])}>
                      {row.depths[t]}
                    </div>
                  ))}
                </div>
              );
            })}

            <div className="p-4 bg-slate-50" />
            {HEADERS.map((h) => (
              <div key={h.id} className={"p-4 text-center " + (h.featured ? "bg-amber-50" : h.id === "basic" ? "bg-blue-50/60" : "bg-slate-50")}>
                <button className={"w-full rounded-lg px-3 py-2 text-[13px] font-semibold transition " +
                  (h.featured
                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/30"
                    : h.id === "basic"
                      ? "bg-blue-600 hover:bg-blue-700 text-white"
                      : "bg-slate-900 hover:bg-slate-800 text-white")}>
                  {h.id === "free" ? "Start free" : `Get ${h.label}`}
                </button>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">
          Tip: scan free first to see your score, then upgrade to the depth you need.
        </p>
      </div>
    </div>
  );
}
