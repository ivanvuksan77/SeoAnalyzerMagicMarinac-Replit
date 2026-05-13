import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import LegalPageLayout from "@/components/legal-page-layout";
import SiteHeader from "@/components/site-header";
import { useSeo } from "@/lib/seo";

export default function TermsOfServicePage() {
  const { t, i18n } = useTranslation();
  useSeo({ title: t("seo.terms.title"), description: t("seo.terms.description"), path: "/terms-of-service" });
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("seo-analyzer-theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("seo-analyzer-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader
        title={t("header.title")}
        slogan={t("header.slogan")}
        languageLabel={t("header.languageLabel")}
        languageEnglish={t("header.languageEnglish")}
        languageCroatian={t("header.languageCroatian")}
        toggleLangLabel={t("header.toggleLang")}
        toggleDarkLabel={t("header.toggleDark")}
        language={i18n.language}
        onLanguageChange={(language) => i18n.changeLanguage(language)}
        darkMode={darkMode}
        setDarkMode={setDarkMode}
      />

      <LegalPageLayout
        title={t("legalPages.terms.title")}
        intro={t("legalPages.terms.intro")}
        sections={[
          {
            title: t("legalPages.terms.sections.acceptance.title"),
            paragraphs: [
              t("legalPages.terms.sections.acceptance.p1"),
              t("legalPages.terms.sections.acceptance.p2"),
            ],
          },
          {
            title: t("legalPages.terms.sections.ip.title"),
            paragraphs: [
              t("legalPages.terms.sections.ip.p1"),
              t("legalPages.terms.sections.ip.p2"),
            ],
          },
          {
            title: t("legalPages.terms.sections.liability.title"),
            paragraphs: [
              t("legalPages.terms.sections.liability.p1"),
              t("legalPages.terms.sections.liability.p2"),
            ],
          },
          {
            title: t("legalPages.terms.sections.dataRights.title"),
            paragraphs: [
              t("legalPages.terms.sections.dataRights.p1"),
              t("legalPages.terms.sections.dataRights.p2"),
            ],
          },
          {
            title: t("legalPages.refund.title"),
            paragraphs: [t("legalPages.refund.intro")],
          },
          {
            title: t("legalPages.refund.sections.scope.title"),
            paragraphs: [
              t("legalPages.refund.sections.scope.p1"),
              t("legalPages.refund.sections.scope.p2"),
            ],
          },
          {
            title: t("legalPages.refund.sections.nonDelivery.title"),
            paragraphs: [
              t("legalPages.refund.sections.nonDelivery.p1"),
              t("legalPages.refund.sections.nonDelivery.p2"),
            ],
          },
          {
            title: t("legalPages.refund.sections.userCancellation.title"),
            paragraphs: [
              t("legalPages.refund.sections.userCancellation.p1"),
              t("legalPages.refund.sections.userCancellation.p2"),
            ],
          },
          {
            title: t("legalPages.refund.sections.howToRequest.title"),
            paragraphs: [
              t("legalPages.refund.sections.howToRequest.p1"),
              t("legalPages.refund.sections.howToRequest.p2"),
            ],
          },
          {
            title: t("legalPages.delivery.title"),
            paragraphs: [t("legalPages.delivery.intro")],
          },
          {
            title: t("legalPages.delivery.sections.digitalDelivery.title"),
            paragraphs: [
              t("legalPages.delivery.sections.digitalDelivery.p1"),
              t("legalPages.delivery.sections.digitalDelivery.p2"),
            ],
          },
          {
            title: t("legalPages.delivery.sections.serviceTiming.title"),
            paragraphs: [
              t("legalPages.delivery.sections.serviceTiming.p1"),
              t("legalPages.delivery.sections.serviceTiming.p2"),
            ],
          },
          {
            title: t("legalPages.delivery.sections.clientResponsibilities.title"),
            paragraphs: [
              t("legalPages.delivery.sections.clientResponsibilities.p1"),
              t("legalPages.delivery.sections.clientResponsibilities.p2"),
            ],
          },
          {
            title: t("legalPages.delivery.sections.support.title"),
            paragraphs: [
              t("legalPages.delivery.sections.support.p1"),
              t("legalPages.delivery.sections.support.p2"),
            ],
          },
        ]}
        companyTitle={t("legalPages.common.companyIdentityTitle")}
        companyDetails={{
          name: t("legalPages.company.name"),
          addressLine1: t("legalPages.company.addressLine1"),
          addressLine2: t("legalPages.company.addressLine2"),
          oib: t("legalPages.company.oib"),
          email: t("legalPages.company.email"),
        }}
        relatedPoliciesTitle={t("legalPages.common.backHome")}
        relatedLinks={[
          { href: "/", label: t("legalPages.common.backHome") },
        ]}
        backHomeLabel={t("legalPages.common.backHome")}
        footerNote={t("legalPages.terms.footerNote")}
      />
    </div>
  );
}
