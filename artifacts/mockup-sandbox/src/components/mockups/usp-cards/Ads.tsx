import { Megaphone, CheckCircle2, ArrowRight, DollarSign } from "lucide-react";

export function Ads() {
  return (
    <div className="min-h-screen flex items-center justify-center p-6 bg-slate-50">
      <div className="w-full max-w-md rounded-3xl bg-white shadow-xl shadow-slate-200/70 ring-1 ring-slate-200/70 overflow-hidden">
        <div className="p-7 pb-5">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-50 flex items-center justify-center ring-1 ring-orange-100">
              <Megaphone className="w-6 h-6 text-orange-500" strokeWidth={2.4} />
            </div>
            <div>
              <div className="text-[11px] uppercase tracking-widest font-semibold text-slate-400">02</div>
              <h3 className="text-2xl font-bold leading-tight text-orange-500">Google Ads</h3>
            </div>
          </div>
          <p className="mt-4 text-slate-600 text-[13px] leading-relaxed">
            We audit your Google Ads landing pages for relevance, speed &amp; conversion gaps that quietly burn budget.
          </p>
        </div>

        <div className="h-px bg-slate-100 mx-7" />

        <ul className="p-6 space-y-3 text-sm text-slate-700">
          {[
            "Landing-page relevance to ad intent",
            "Page speed & Core Web Vitals on the LP",
            "Conversion tracking & UTM hygiene",
            "Form, CTA & trust-signal scoring",
          ].map((t) => (
            <li key={t} className="flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 mt-0.5 text-orange-500 shrink-0" strokeWidth={2.4} />
              <span>{t}</span>
            </li>
          ))}
        </ul>

        <div className="px-6 pb-6 pt-1 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-emerald-600 text-xs font-semibold">
            <DollarSign className="w-4 h-4" strokeWidth={2.6} />
            <span>Plug LP leaks, lift ROAS</span>
          </div>
          <div className="flex items-center gap-1 text-orange-600 text-xs font-semibold">
            Included in Pro <ArrowRight className="w-3.5 h-3.5" strokeWidth={2.6} />
          </div>
        </div>
      </div>
    </div>
  );
}
