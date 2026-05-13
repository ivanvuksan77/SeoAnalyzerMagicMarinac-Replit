import { useTranslation } from "react-i18next";
import { Check, Zap, FileText, Wrench, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ComparisonTableProps {
  hasResult: boolean;
  onScrollToScanner: () => void;
  onUpgrade: (tier: "basic" | "pro") => void;
}

export function ComparisonTable({ hasResult, onScrollToScanner, onUpgrade }: ComparisonTableProps) {
  const { t } = useTranslation();

  const handleTier = (tier: "free" | "basic" | "pro") => {
    if (tier === "free") return onScrollToScanner();
    if (!hasResult) return onScrollToScanner();
    onUpgrade(tier);
  };

  const tiers = [
    {
      id: "free" as const,
      Icon: FileText,
      iconWrap: "bg-slate-100 dark:bg-slate-800",
      iconColor: "text-slate-600 dark:text-slate-300",
      badgeColor: "text-slate-500 dark:text-slate-400",
      checkColor: "text-emerald-500",
      btn: "bg-slate-100 hover:bg-slate-200 text-slate-900 dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-100",
    },
    {
      id: "basic" as const,
      Icon: Zap,
      iconWrap: "bg-blue-50 dark:bg-blue-950/40",
      iconColor: "text-blue-600 dark:text-blue-400",
      badgeColor: "text-blue-700 dark:text-blue-400",
      checkColor: "text-blue-500",
      btn: "bg-blue-600 hover:bg-blue-700 text-white",
    },
    {
      id: "pro" as const,
      Icon: Wrench,
      iconWrap: "bg-amber-50 dark:bg-amber-950/40",
      iconColor: "text-amber-700 dark:text-amber-400",
      badgeColor: "text-amber-700 dark:text-amber-400",
      checkColor: "text-amber-600",
      btn: "bg-amber-500 hover:bg-amber-600 text-white",
    },
  ];

  return (
    <section className="my-16" data-testid="section-comparison-table">
      <div className="text-center mb-10">
        <h2
          className="text-3xl md:text-4xl font-bold tracking-tight text-foreground"
          data-testid="text-comparison-heading"
        >
          {t("comparisonTable.heading")}
        </h2>
        <p className="mt-3 text-sm md:text-base text-muted-foreground max-w-2xl mx-auto">
          {t("comparisonTable.subheading")}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 items-stretch">
        {tiers.map(({ id, Icon, iconWrap, iconColor, badgeColor, checkColor, btn }) => {
          const features = t(`comparisonTable.tiers.${id}.features`, {
            returnObjects: true,
          }) as string[];
          return (
            <div
              key={id}
              className="rounded-2xl bg-card ring-1 ring-border shadow-sm p-6 flex flex-col"
              data-testid={`card-comparison-${id}`}
            >
              <div className="flex items-center gap-2 mb-3">
                <div className={`w-9 h-9 rounded-lg flex items-center justify-center ${iconWrap}`}>
                  <Icon className={`w-4 h-4 ${iconColor}`} strokeWidth={2.4} />
                </div>
                <span className={`text-[11px] font-bold uppercase tracking-wider ${badgeColor}`}>
                  {t(`comparisonTable.tiers.${id}.badge`)}
                </span>
              </div>

              <div className="flex items-baseline gap-1.5">
                <span className="text-4xl font-bold text-foreground tabular-nums">
                  {t(`comparisonTable.tiers.${id}.price`)}
                </span>
                <span className="text-sm text-muted-foreground">
                  {t(`comparisonTable.tiers.${id}.priceSuffix`)}
                </span>
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">
                {t(`comparisonTable.tiers.${id}.tagline`)}
              </p>

              <ul className="mt-5 space-y-2.5 text-sm flex-1">
                {features.map((f, i) => {
                  const isHeader = i === 0 && (id === "basic" || id === "pro");
                  return (
                    <li key={i} className="flex items-start gap-2">
                      <Check
                        className={`w-4 h-4 mt-0.5 shrink-0 ${
                          isHeader ? "text-muted-foreground/50" : checkColor
                        }`}
                        strokeWidth={3}
                      />
                      <span
                        className={
                          isHeader
                            ? "text-muted-foreground italic"
                            : "text-foreground/90"
                        }
                      >
                        {f}
                      </span>
                    </li>
                  );
                })}
              </ul>

              <Button
                onClick={() => handleTier(id)}
                className={`mt-6 w-full h-11 font-semibold gap-1.5 ${btn}`}
                data-testid={`button-comparison-${id}`}
              >
                {t(`comparisonTable.tiers.${id}.cta`)}
                <ArrowRight className="w-4 h-4" />
              </Button>
            </div>
          );
        })}
      </div>

      <p className="text-center text-xs text-muted-foreground mt-6">
        {t("comparisonTable.note")}
      </p>
    </section>
  );
}
