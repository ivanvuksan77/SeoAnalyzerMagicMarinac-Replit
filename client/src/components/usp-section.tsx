import { useTranslation } from "react-i18next";
import {
  Search,
  Megaphone,
  Brain,
  Wrench,
  CheckCircle2,
  TrendingUp,
  DollarSign,
  Sparkles,
  Code2,
  type LucideIcon,
} from "lucide-react";

type Tier = "free" | "basic" | "pro";

type Pillar = {
  id: string;
  pillar: string;
  title: string;
  desc: string;
  bullets: string[];
  stat: string;
  Icon: LucideIcon;
  StatIcon: LucideIcon;
  color: string;
  iconBg: string;
  iconRing: string;
  tiers: Tier[];
  proExclusive: boolean;
};

export function UspSection() {
  const { t } = useTranslation();

  const pillars: Pillar[] = [
    {
      id: "seo",
      pillar: t("usp.cards.seo.pillar"),
      title: t("usp.cards.seo.title"),
      desc: t("usp.cards.seo.desc"),
      bullets: t("usp.cards.seo.bullets", { returnObjects: true }) as string[],
      stat: t("usp.cards.seo.stat"),
      Icon: Search,
      StatIcon: TrendingUp,
      color: "text-blue-600 dark:text-blue-400",
      iconBg: "bg-blue-50 dark:bg-blue-950/40",
      iconRing: "ring-blue-100 dark:ring-blue-900/60",
      tiers: ["free", "basic", "pro"],
      proExclusive: false,
    },
    {
      id: "ads",
      pillar: t("usp.cards.ads.pillar"),
      title: t("usp.cards.ads.title"),
      desc: t("usp.cards.ads.desc"),
      bullets: t("usp.cards.ads.bullets", { returnObjects: true }) as string[],
      stat: t("usp.cards.ads.stat"),
      Icon: Megaphone,
      StatIcon: DollarSign,
      color: "text-orange-500 dark:text-orange-400",
      iconBg: "bg-orange-50 dark:bg-orange-950/40",
      iconRing: "ring-orange-100 dark:ring-orange-900/60",
      tiers: ["free", "basic", "pro"],
      proExclusive: false,
    },
    {
      id: "ai",
      pillar: t("usp.cards.ai.pillar"),
      title: t("usp.cards.ai.title"),
      desc: t("usp.cards.ai.desc"),
      bullets: t("usp.cards.ai.bullets", { returnObjects: true }) as string[],
      stat: t("usp.cards.ai.stat"),
      Icon: Brain,
      StatIcon: Sparkles,
      color: "text-violet-600 dark:text-violet-400",
      iconBg: "bg-violet-50 dark:bg-violet-950/40",
      iconRing: "ring-violet-100 dark:ring-violet-900/60",
      tiers: ["free", "basic", "pro"],
      proExclusive: false,
    },
    {
      id: "fixes",
      pillar: t("usp.cards.fixes.pillar"),
      title: t("usp.cards.fixes.title"),
      desc: t("usp.cards.fixes.desc"),
      bullets: t("usp.cards.fixes.bullets", { returnObjects: true }) as string[],
      stat: t("usp.cards.fixes.stat"),
      Icon: Wrench,
      StatIcon: Code2,
      color: "text-emerald-600 dark:text-emerald-400",
      iconBg: "bg-emerald-50 dark:bg-emerald-950/40",
      iconRing: "ring-emerald-100 dark:ring-emerald-900/60",
      tiers: ["pro"],
      proExclusive: true,
    },
  ];

  const TIER_LABELS: Record<Tier, string> = {
    free: t("usp.tiers.free"),
    basic: t("usp.tiers.basic"),
    pro: t("usp.tiers.pro"),
  };
  const ALL_TIERS: Tier[] = ["free", "basic", "pro"];

  return (
    <section className="mt-20 md:mt-24 mb-12" data-testid="section-usp">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <h2
          className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground"
          data-testid="text-usp-heading"
        >
          {t("usp.heading")}
        </h2>
        <p
          className="mt-3 text-sm md:text-base text-muted-foreground"
          data-testid="text-usp-subheading"
        >
          {t("usp.subheading")}
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        {pillars.map((p) => {
          const { Icon, StatIcon } = p;
          return (
            <div
              key={p.id}
              className="rounded-2xl bg-card text-card-foreground shadow-md shadow-slate-200/50 dark:shadow-black/30 ring-1 ring-border overflow-hidden flex flex-col"
              data-testid={`card-usp-${p.id}`}
            >
              <div className="p-6 pb-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center ring-1 ${p.iconBg} ${p.iconRing}`}
                  >
                    <Icon className={`w-5 h-5 ${p.color}`} strokeWidth={2.4} />
                  </div>
                  <div>
                    <div className="text-[10px] uppercase tracking-widest font-semibold text-muted-foreground">
                      {p.pillar}
                    </div>
                    <h3 className={`text-lg font-bold leading-tight ${p.color}`}>
                      {p.title}
                    </h3>
                  </div>
                </div>
                <p className="mt-3 text-[13px] leading-relaxed text-muted-foreground">
                  {p.desc}
                </p>
              </div>

              <div className="h-px bg-border mx-6" />

              <ul className="p-6 space-y-2.5 text-sm flex-1">
                {p.bullets.map((b, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <CheckCircle2
                      className={`w-4 h-4 mt-0.5 ${p.color} shrink-0`}
                      strokeWidth={2.4}
                    />
                    <span className="text-foreground/90">{b}</span>
                  </li>
                ))}
              </ul>

              <div className="px-6 pb-5 pt-1 space-y-3">
                <div className={`inline-flex items-center gap-1.5 text-xs font-semibold ${p.color}`}>
                  <StatIcon className="w-4 h-4" strokeWidth={2.6} />
                  <span>{p.stat}</span>
                </div>

                <div className="border-t border-border pt-3">
                  <div className="flex flex-wrap items-center gap-1.5" data-testid={`tiers-${p.id}`}>
                    {ALL_TIERS.map((tier) => {
                      const included = p.tiers.includes(tier);
                      const isPro = tier === "pro";
                      return (
                        <span
                          key={tier}
                          className={
                            included
                              ? isPro
                                ? "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-amber-100 dark:bg-amber-500/20 text-amber-800 dark:text-amber-300 ring-1 ring-amber-300/70 dark:ring-amber-400/40"
                                : "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider bg-emerald-50 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 ring-1 ring-emerald-200 dark:ring-emerald-500/30"
                              : "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-muted/60 text-muted-foreground/60 ring-1 ring-border line-through decoration-muted-foreground/40"
                          }
                          data-testid={`tier-${p.id}-${tier}-${included ? "in" : "out"}`}
                        >
                          {included && <CheckCircle2 className="w-3 h-3" strokeWidth={2.8} />}
                          {TIER_LABELS[tier]}
                        </span>
                      );
                    })}
                  </div>
                  <p className="mt-2 text-[11px] leading-snug text-muted-foreground">
                    {p.proExclusive ? t("usp.tiers.footnote.proExclusive") : t("usp.tiers.footnote.shared")}
                  </p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
