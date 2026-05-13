import { useTranslation } from "react-i18next";
import {
  ArrowRight,
  Zap,
  Crown,
  CheckCircle2,
  AlertCircle,
  XCircle,
  Search,
  Megaphone,
  Brain,
  Gauge,
} from "lucide-react";
import { Button } from "@/components/ui/button";

export function HeroSection() {
  const { t, i18n } = useTranslation();
  const lang = i18n.language === "hr" ? "hr" : "en";

  const handleCtaClick = () => {
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

  return (
    <section className="relative overflow-hidden">
      {/* soft gradient background + blobs (scoped to hero only) */}
      <div className="absolute inset-0 bg-gradient-to-b from-blue-50/60 via-background to-background dark:from-blue-950/30 dark:via-background pointer-events-none" />
      <div className="absolute -top-40 -right-32 w-[520px] h-[520px] rounded-full bg-blue-400/20 dark:bg-blue-500/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-[380px] h-[380px] rounded-full bg-blue-400/15 dark:bg-blue-500/15 blur-3xl pointer-events-none" />

      <div className="relative container mx-auto px-4 pt-12 pb-16 grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-14 items-center">
        {/* LEFT — copy + CTA */}
        <div>
          <div
            className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 mb-6 bg-primary/10 text-primary border border-primary/20"
            data-testid="hero-eyebrow"
          >
            <Zap className="w-3.5 h-3.5" strokeWidth={2.4} />
            <span className="text-[11px] font-semibold tracking-wide uppercase">
              {t("hero.eyebrow")}
            </span>
          </div>

          <h1
            className="text-4xl md:text-5xl lg:text-[52px] leading-[1.05] font-bold mb-5 text-foreground"
            style={{ letterSpacing: "-0.035em" }}
            data-testid="text-hero-title"
          >
            {t("hero.lead")}{" "}
            <span className="text-primary">{t("hero.accent")}</span>
          </h1>

          <p
            className="text-base md:text-[17px] leading-relaxed text-muted-foreground mb-8 max-w-[540px]"
            data-testid="text-hero-sub"
          >
            {t("hero.sub")}
          </p>

          <Button
            size="lg"
            onClick={handleCtaClick}
            className="h-14 px-7 text-base font-semibold gap-2 shadow-lg shadow-primary/30 hover:shadow-primary/40 hover:scale-[1.02] transition-transform group"
            data-testid="button-hero-cta"
          >
            {t("hero.cta")}
            <ArrowRight
              className="w-5 h-5 transition-transform group-hover:translate-x-1"
              strokeWidth={2.4}
            />
          </Button>

          <div className="mt-7 flex flex-wrap gap-x-5 gap-y-2 text-sm text-muted-foreground">
            <TrustItem text={t("hero.trust1")} />
            <TrustItem text={t("hero.trust2")} />
            <TrustItem text={t("hero.trust3")} />
          </div>
        </div>

        {/* RIGHT — PDF report preview */}
        <div className="relative">
          <div className="relative max-w-[560px] mx-auto lg:ml-auto">
            {/* faded back card */}
            <div className="pdf-preview-back absolute top-6 -right-4 w-[92%] h-[94%] rounded-2xl bg-card opacity-50 dark:opacity-30 shadow-2xl rotate-3" />

            {/* main pdf card */}
            <div className="relative bg-card rounded-2xl shadow-2xl overflow-hidden -rotate-[1.5deg] border border-border">
              {/* gradient header */}
              <div
                className="px-5 pt-4 pb-4 text-white"
                style={{
                  background:
                    "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 80%, #000) 100%)",
                }}
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-1.5 text-[9px] font-bold tracking-widest opacity-90">
                      <Crown className="w-3 h-3" />
                      {t("hero.preview.label")}
                    </div>
                    <div className="text-lg font-extrabold mt-1 leading-tight">
                      {t("hero.preview.domain")}
                    </div>
                    <div className="text-[10px] opacity-85 mt-0.5">
                      {t("hero.preview.subtitle")}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-[9px] uppercase opacity-80 tracking-wider">
                      {t("hero.preview.overall")}
                    </div>
                    <div className="text-3xl font-black leading-none mt-0.5">
                      66<span className="text-sm opacity-80">/100</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* tool score rings */}
              <div className="px-5 py-4 border-b border-border flex items-center justify-between">
                <MiniRing score={79} color="#3b82f6" Icon={Search} label={t("hero.preview.tools.seo")} />
                <MiniRing score={64} color="#f59e0b" Icon={Megaphone} label={t("hero.preview.tools.adsLp")} />
                <MiniRing score={58} color="#8b5cf6" Icon={Brain} label={t("hero.preview.tools.aeo")} />
                <MiniRing score={51} color="#14b8a6" Icon={Gauge} label={t("hero.preview.tools.speed")} />
              </div>

              {/* issues */}
              <div className="px-5 py-4">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-[11px] font-bold tracking-wide uppercase text-foreground/80">
                    {t("hero.preview.issuesFound")}
                  </div>
                  <div className="text-[10px] font-medium text-muted-foreground">
                    4
                  </div>
                </div>
                <div className="space-y-2">
                  <PreviewIssueRow
                    sev="fail"
                    title={t("hero.preview.issues.meta")}
                    note={t("hero.preview.notes.homepage")}
                    lang={lang}
                  />
                  <PreviewIssueRow
                    sev="warn"
                    title={t("hero.preview.issues.lcp")}
                    note={t("hero.preview.notes.cwv")}
                    lang={lang}
                  />
                  <PreviewIssueRow
                    sev="fail"
                    title={t("hero.preview.issues.tracking")}
                    note={t("hero.preview.notes.adsLp")}
                    lang={lang}
                  />
                  <PreviewIssueRow
                    sev="warn"
                    title={t("hero.preview.issues.images")}
                    note={t("hero.preview.notes.images")}
                    lang={lang}
                  />
                </div>
              </div>

              {/* footer accent strip */}
              <div className="px-5 py-3 flex items-center gap-2 text-[11px] font-semibold bg-primary/10 text-primary">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/20 text-[9px] tracking-wider">
                  <Crown className="w-2.5 h-2.5" /> PRO
                </span>
                {t("hero.preview.fixes")} →
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

function TrustItem({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <CheckCircle2 className="w-4 h-4 text-emerald-500" strokeWidth={2.4} />
      {text}
    </span>
  );
}

function MiniRing({
  score,
  color,
  Icon,
  label,
}: {
  score: number;
  color: string;
  Icon: any;
  label: string;
}) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const dash = (score / 100) * c;
  return (
    <div className="flex flex-col items-center min-w-[56px]">
      <div className="relative w-12 h-12">
        <svg width="48" height="48" viewBox="0 0 48 48">
          <circle
            cx="24"
            cy="24"
            r={r}
            className="stroke-muted"
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
          <Icon className="w-3.5 h-3.5" style={{ color }} strokeWidth={2.4} />
        </div>
      </div>
      <div className="text-[10px] font-bold mt-1 text-foreground/85">{score}</div>
      <div className="text-[9px] mt-0.5 text-muted-foreground">{label}</div>
    </div>
  );
}

function PreviewIssueRow({
  sev,
  title,
  note,
  lang,
}: {
  sev: "fail" | "warn";
  title: string;
  note: string;
  lang: "en" | "hr";
}) {
  const labels = {
    fail: { en: "FAIL", hr: "GREŠKA" },
    warn: { en: "WARN", hr: "UPOZ" },
  } as const;
  return (
    <div className="flex items-center gap-3 py-1">
      {sev === "fail" ? (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-red-100 text-red-700 dark:bg-red-950/60 dark:text-red-300">
          <XCircle className="w-2.5 h-2.5" strokeWidth={2.6} />
          {labels.fail[lang]}
        </span>
      ) : (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wider bg-amber-100 text-amber-700 dark:bg-amber-950/60 dark:text-amber-300">
          <AlertCircle className="w-2.5 h-2.5" strokeWidth={2.6} />
          {labels.warn[lang]}
        </span>
      )}
      <div className="flex-1 min-w-0 text-[12px] font-semibold text-foreground/90 truncate">
        {title}
      </div>
      <div className="text-[10px] font-medium text-muted-foreground whitespace-nowrap">
        {note}
      </div>
    </div>
  );
}
