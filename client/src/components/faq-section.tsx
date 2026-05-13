import { useTranslation } from "react-i18next";
import { HelpCircle } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ_KEYS = [
  "whatIsSitesnap",
  "whatChecked",
  "adCopyRater",
  "howLong",
  "freeVsPaid",
  "basicVsPro",
  "aiReady",
  "whoFor",
  "needSignup",
  "refund",
  "howFixes",
] as const;

export function FaqSection() {
  const { t } = useTranslation();

  const items = FAQ_KEYS.map((key) => ({
    key,
    q: t(`faq.items.${key}.q`),
    a: t(`faq.items.${key}.a`),
  }));

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((it) => ({
      "@type": "Question",
      name: it.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: it.a,
      },
    })),
  };

  return (
    <section className="mt-20 md:mt-24 mb-12" data-testid="section-faq">
      <div className="text-center max-w-2xl mx-auto mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs font-medium mb-3">
          <HelpCircle className="w-3.5 h-3.5" />
          {t("faq.eyebrow")}
        </div>
        <h2
          className="text-2xl md:text-3xl lg:text-4xl font-bold tracking-tight text-foreground"
          data-testid="text-faq-heading"
        >
          {t("faq.heading")}
        </h2>
        <p
          className="mt-3 text-sm md:text-base text-muted-foreground"
          data-testid="text-faq-subheading"
        >
          {t("faq.subheading")}
        </p>
      </div>

      <div className="max-w-3xl mx-auto rounded-2xl bg-card text-card-foreground shadow-md shadow-slate-200/50 dark:shadow-black/30 ring-1 ring-border p-2 md:p-4">
        <Accordion type="single" collapsible className="w-full">
          {items.map((it, idx) => (
            <AccordionItem
              key={it.key}
              value={it.key}
              className={idx === items.length - 1 ? "border-b-0" : ""}
              data-testid={`faq-item-${it.key}`}
            >
              <AccordionTrigger
                className="text-left text-base md:text-lg font-semibold hover-elevate active-elevate-2 px-3 md:px-4 rounded-md"
                data-testid={`faq-trigger-${it.key}`}
              >
                {it.q}
              </AccordionTrigger>
              <AccordionContent
                className="text-sm md:text-base text-muted-foreground leading-relaxed px-3 md:px-4 pb-4"
                data-testid={`faq-content-${it.key}`}
              >
                {it.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>

      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
    </section>
  );
}
