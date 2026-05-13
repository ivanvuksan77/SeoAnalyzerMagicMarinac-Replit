import { Brain, Sparkles, CheckCircle2, ArrowRight } from "lucide-react";

export function Ai() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl shadow-slate-200/70 ring-1 ring-slate-200/70 overflow-hidden">
        <div className="p-7 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-50 flex items-center justify-center ring-1 ring-violet-100">
              <Brain className="w-6 h-6 text-violet-600" strokeWidth={2.4} />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest font-semibold text-slate-400">03</div>
              <h3 className="text-2xl font-bold leading-tight text-violet-600">AI Optimization</h3>
            </div>
          </div>
          <p className="mt-4 text-slate-600 text-[13px] leading-relaxed">
            Get found by ChatGPT, Perplexity &amp; Google AI Overviews — not just classic search.
          </p>
        </div>

        <div className="h-px bg-slate-100 mx-7" />

        <ul className="p-6 space-y-3 text-sm text-slate-700">
          {[
            "GEO (Generative Engine Optimization) score",
            "Structured data for AI crawlers",
            "Entity & topical authority mapping",
            "LLM-readable content rewrites",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-violet-600 shrink-0" strokeWidth={2.4} />
              <span>{t}</span>
            </li>
          ))}
        </ul>

        <div className="px-6 pb-6 pt-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-violet-600 text-xs font-semibold">
            <Sparkles className="w-4 h-4" strokeWidth={2.6} />
            <span>Future-proof traffic</span>
          </div>
          <div className="flex items-center gap-1 text-violet-600 text-xs font-semibold">
            Included in Pro <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.6} />
          </div>
        </div>
      </div>
    </div>
  );
}
