import { Check, Crown, Zap, FileText, Wrench, ArrowRight } from "lucide-react";

const FEATURES = {
  free: [
    "8-in-1 SEO audit",
    "Google Ads landing-page audit",
    "AEO / AI SEO readiness",
    "GEO readiness check",
    "Overall score per pillar",
    "Top 3 issues per section",
    "Email delivery",
  ],
  basic: [
    "Everything in Free, plus:",
    "Full issue lists (all findings)",
    "Branded PDF report",
    "3 scans included",
    "Compare to a competitor URL",
    "Moneyback guarantee",
  ],
  pro: [
    "Everything in Basic, plus:",
    "Copy-paste fix instructions",
    "Step-by-step technical guides",
    "10 scans included",
    "Priority email delivery",
    "Re-test after every fix",
  ],
};

export function TierCardsHighlighted() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-white px-8 py-10 font-sans">
      <div className="max-w-[1080px] mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-slate-900 tracking-tight">Choose your FreeSEOSiteAnalyzer plan</h2>
          <p className="mt-2 text-sm text-slate-500">Free shows you the score. Basic unlocks all the data. Pro hands you the fixes.</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
          {/* Free */}
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-slate-100 flex items-center justify-center">
                <FileText className="w-4 h-4 text-slate-600" strokeWidth={2.4} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Free</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-900 tabular-nums">€0</span>
              <span className="text-sm text-slate-500">/ scan</span>
            </div>
            <p className="mt-2 text-[13px] text-slate-500">Score + top issues. No signup.</p>

            <ul className="mt-5 space-y-2.5 text-[13px] flex-1">
              {FEATURES.free.map((f) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className="w-4 h-4 mt-0.5 text-emerald-500 shrink-0" strokeWidth={3} />
                  <span className="text-slate-700">{f}</span>
                </li>
              ))}
            </ul>

            <button className="mt-6 w-full rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 px-4 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition">
              Start free <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Basic */}
          <div className="rounded-2xl bg-white ring-1 ring-slate-200 shadow-sm p-6 flex flex-col">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-blue-50 flex items-center justify-center">
                <Zap className="w-4 h-4 text-blue-600" strokeWidth={2.4} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-blue-700">Basic</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-900 tabular-nums">€19</span>
              <span className="text-sm text-slate-500">one-time</span>
            </div>
            <p className="mt-2 text-[13px] text-slate-500">Full data report — no fixes.</p>

            <ul className="mt-5 space-y-2.5 text-[13px] flex-1">
              {FEATURES.basic.map((f, i) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className={"w-4 h-4 mt-0.5 shrink-0 " + (i === 0 ? "text-slate-400" : "text-blue-500")} strokeWidth={3} />
                  <span className={i === 0 ? "text-slate-500 italic" : "text-slate-700"}>{f}</span>
                </li>
              ))}
            </ul>

            <button className="mt-6 w-full rounded-lg bg-blue-600 hover:bg-blue-700 text-white px-4 py-2.5 text-sm font-semibold inline-flex items-center justify-center gap-1.5 transition shadow-sm">
              Get Basic <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Pro */}
          <div className="relative rounded-2xl bg-gradient-to-b from-amber-50 to-white ring-2 ring-amber-400 shadow-xl shadow-amber-500/20 p-6 flex flex-col scale-[1.02]">
            <div className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 bg-amber-500 text-white text-[10px] font-bold uppercase tracking-wider px-3 py-1 rounded-full shadow-md ring-2 ring-white">
              <Crown className="w-3 h-3" /> Most popular
            </div>
            <div className="flex items-center gap-2 mb-2">
              <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center">
                <Wrench className="w-4 h-4 text-amber-700" strokeWidth={2.4} />
              </div>
              <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700">Pro</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-bold text-slate-900 tabular-nums">€29</span>
              <span className="text-sm text-slate-500">one-time</span>
            </div>
            <p className="mt-2 text-[13px] text-amber-800/80 font-medium">Full data + copy-paste fixes.</p>

            <ul className="mt-5 space-y-2.5 text-[13px] flex-1">
              {FEATURES.pro.map((f, i) => (
                <li key={f} className="flex items-start gap-2">
                  <Check className={"w-4 h-4 mt-0.5 shrink-0 " + (i === 0 ? "text-slate-400" : "text-amber-600")} strokeWidth={3} />
                  <span className={i === 0 ? "text-slate-500 italic" : "text-slate-800 font-medium"}>{f}</span>
                </li>
              ))}
            </ul>

            <button className="mt-6 w-full rounded-lg bg-amber-500 hover:bg-amber-600 text-white px-4 py-2.5 text-sm font-bold inline-flex items-center justify-center gap-1.5 transition shadow-md shadow-amber-500/40">
              Get Pro <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>

        <p className="text-center text-xs text-slate-400 mt-6">No signup · One-time payment, no subscription · Moneyback guarantee</p>
      </div>
    </div>
  );
}
