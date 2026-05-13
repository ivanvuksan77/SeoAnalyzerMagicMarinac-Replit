import { useTranslation } from "react-i18next";
import { ArrowRight, FileText, Sparkles, Repeat, CheckCircle2, Code2 } from "lucide-react";
import { Button } from "@/components/ui/button";

export function UpgradeCta() {
  const { t } = useTranslation();

  const handleClick = () => {
    const el = document.getElementById("scanner");
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(() => {
      const input = document.querySelector<HTMLInputElement>(
        '[data-testid="master-url"]'
      );
      input?.focus({ preventScroll: true });
    }, 650);
  };

  const perks = [
    { Icon: FileText, text: t("upgradeCta.perks.pdf") },
    { Icon: Repeat, text: t("upgradeCta.perks.scans") },
    { Icon: Code2, text: t("upgradeCta.perks.fixes") },
  ];

  return (
    <section className="my-16" data-testid="section-upgrade-cta">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-blue-600 via-blue-600 to-indigo-700 dark:from-blue-700 dark:via-blue-800 dark:to-indigo-900 text-white shadow-2xl shadow-blue-500/30">
        <div className="absolute -top-24 -right-24 w-80 h-80 rounded-full bg-white/10 blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-80 h-80 rounded-full bg-indigo-300/20 blur-3xl pointer-events-none" />

        <div className="relative px-6 md:px-12 py-12 md:py-14 grid grid-cols-1 lg:grid-cols-[1.4fr_1fr] gap-10 items-center">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-5 bg-white/15 backdrop-blur ring-1 ring-white/30">
              <Sparkles className="w-3.5 h-3.5" strokeWidth={2.4} />
              <span className="text-[11px] font-semibold tracking-wide uppercase">
                {t("upgradeCta.eyebrow")}
              </span>
            </div>

            <h2
              className="text-3xl md:text-4xl lg:text-[40px] leading-[1.1] font-bold tracking-tight"
              data-testid="text-upgrade-cta-title"
            >
              {t("upgradeCta.title")}
            </h2>

            <p
              className="mt-4 text-blue-50/95 text-base md:text-[17px] leading-relaxed max-w-2xl"
              data-testid="text-upgrade-cta-desc"
            >
              {t("upgradeCta.description")}
            </p>

            <Button
              size="lg"
              onClick={handleClick}
              className="mt-8 h-14 px-7 text-base font-semibold gap-2 bg-white text-blue-700 hover:bg-blue-50 hover:scale-[1.02] transition-transform group shadow-xl shadow-black/20"
              data-testid="button-upgrade-cta"
            >
              {t("upgradeCta.button")}
              <ArrowRight
                className="w-5 h-5 transition-transform group-hover:translate-x-1"
                strokeWidth={2.4}
              />
            </Button>

            <p className="mt-3 text-xs text-blue-100/80">
              {t("upgradeCta.hint")}
            </p>
          </div>

          <ul className="space-y-3">
            {perks.map(({ Icon, text }, i) => (
              <li
                key={i}
                className="flex items-start gap-3 rounded-xl bg-white/10 backdrop-blur ring-1 ring-white/20 px-4 py-3"
              >
                <div className="w-9 h-9 rounded-lg bg-white/15 flex items-center justify-center shrink-0 ring-1 ring-white/30">
                  <Icon className="w-4.5 h-4.5" strokeWidth={2.4} />
                </div>
                <div className="flex-1 text-sm leading-snug pt-1">
                  <CheckCircle2 className="inline w-3.5 h-3.5 mr-1 -mt-0.5 text-emerald-300" strokeWidth={2.6} />
                  {text}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
