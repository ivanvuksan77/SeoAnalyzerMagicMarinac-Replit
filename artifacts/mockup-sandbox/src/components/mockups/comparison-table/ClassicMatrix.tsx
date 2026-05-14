import { Check, Minus, Crown, Sparkles } from "lucide-react";

const TIERS = [
  { name: "Free", price: "€0", sub: "Try it" , accent: "slate" },
  { name: "Basic", price: "€19", sub: "Full data", accent: "blue" },
  { name: "Pro", price: "€29", sub: "Data + fixes", accent: "amber", featured: true },
] as const;

type Cell = boolean | string;
type Row = { label: string; sub?: string; cells: [Cell, Cell, Cell] };

const SECTIONS: { title: string; rows: Row[] }[] = [
  {
    title: "Audits included",
    rows: [
      { label: "SEO audit (8 tools, one click)", cells: [true, true, true] },
      { label: "Google Ads landing-page audit", cells: [true, true, true] },
      { label: "AEO / AI SEO readiness", cells: [true, true, true] },
      { label: "GEO / Generative Engine readiness", cells: [true, true, true] },
    ],
  },
  {
    title: "Report depth",
    rows: [
      { label: "Overall score per pillar", cells: [true, true, true] },
      { label: "Top 3 issues per section", cells: [true, true, true] },
      { label: "Full issue lists (all findings)", cells: [false, true, true] },
      { label: "Copy-paste fix instructions", cells: [false, false, true] },
      { label: "Branded PDF report", cells: [false, true, true] },
    ],
  },
  {
    title: "Usage",
    rows: [
      { label: "Scans included", cells: ["1", "3", "10"] },
      { label: "Compare to competitor", cells: [false, true, true] },
      { label: "Email delivery", cells: [true, true, true] },
      { label: "Moneyback guarantee", cells: [false, true, true] },
    ],
  },
];

function CellBox({ value, featured }: { value: Cell; featured?: boolean }) {
  if (typeof value === "string") {
    return (
      <span className={"inline-flex items-center justify-center min-w-[34px] px-2 py-0.5 rounded-md text-[13px] font-bold tabular-nums " +
        (featured ? "bg-amber-100 text-amber-800 ring-1 ring-amber-300" : "bg-slate-100 text-slate-700 ring-1 ring-slate-200")}>{value}</span>
    );
  }
  return value
    ? <Check className={"w-[18px] h-[18px] " + (featured ? "text-amber-600" : "text-emerald-600")} strokeWidth={3} />
    : <Minus className="w-[18px] h-[18px] text-slate-300" strokeWidth={3} />;
}

export function ClassicMatrix() {
  return (
    <div className="min-h-screen bg-slate-50 px-8 py-10 font-sans">
      <div className="max-w-[1000px] mx-auto">
        <div className="text-center mb-8">
          <div className="inline-flex items-center gap-1.5 rounded-full px-3 py-1 mb-3 bg-blue-50 ring-1 ring-blue-200 text-blue-700 text-[11px] font-semibold uppercase tracking-wider">
            <Sparkles className="w-3 h-3" /> Compare plans
          </div>
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Pick the right FreeSEOSiteAnalyzer report</h2>
          <p className="mt-2 text-sm text-slate-500">Same scan engine. Different report depth — only Pro includes copy-paste fixes.</p>
        </div>

        <div className="bg-white rounded-2xl shadow-lg shadow-slate-200/60 ring-1 ring-slate-200 overflow-hidden">
          <div className="grid grid-cols-[minmax(0,1.4fr)_repeat(3,minmax(0,1fr))] text-sm">
            <div className="p-5 border-b border-slate-200 bg-slate-50/50" />
            {TIERS.map(t => (
              <div key={t.name} className={"p-5 border-b border-slate-200 text-center relative " + (t.featured ? "bg-gradient-to-b from-amber-50 to-white" : "")}>
                {t.featured && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-1/2 inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-full shadow-md ring-2 ring-white">
                    <Crown className="w-3 h-3" /> Recommended
                  </div>
                )}
                <div className={"text-[11px] font-bold uppercase tracking-wider " + (t.featured ? "text-amber-700" : "text-slate-500")}>{t.name}</div>
                <div className="mt-1 text-3xl font-bold text-slate-900 tabular-nums">{t.price}</div>
                <div className="text-[11px] text-slate-500 mt-0.5">{t.sub}</div>
              </div>
            ))}

            {SECTIONS.map((sec) => (
              <div key={sec.title} className="contents">
                <div className="col-span-4 px-5 py-2.5 text-[11px] font-bold uppercase tracking-wider text-slate-500 bg-slate-50/70 border-b border-slate-100">
                  {sec.title}
                </div>
                {sec.rows.map((row) => (
                  <div key={row.label} className="contents">
                    <div className="px-5 py-3 text-slate-700 border-b border-slate-100">{row.label}</div>
                    {row.cells.map((c, i) => (
                      <div key={i} className={"px-5 py-3 border-b border-slate-100 text-center " + (TIERS[i].featured ? "bg-amber-50/40" : "")}>
                        <CellBox value={c} featured={TIERS[i].featured} />
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            ))}

            <div className="p-5 bg-slate-50/50" />
            {TIERS.map(t => (
              <div key={t.name} className={"p-5 text-center " + (t.featured ? "bg-amber-50/40" : "")}>
                <button className={"w-full rounded-lg px-3 py-2 text-[13px] font-semibold transition " +
                  (t.featured
                    ? "bg-amber-500 hover:bg-amber-600 text-white shadow-md shadow-amber-500/30"
                    : "bg-slate-900 hover:bg-slate-800 text-white")}>
                  {t.name === "Free" ? "Start free" : `Get ${t.name}`}
                </button>
              </div>
            ))}
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-5">No signup for Free · One-time payment · Moneyback guarantee</p>
      </div>
    </div>
  );
}
