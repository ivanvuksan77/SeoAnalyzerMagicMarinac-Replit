import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import LegalPageLayout from "@/components/legal-page-layout";
import SiteHeader from "@/components/site-header";
import { useSeo } from "@/lib/seo";

export default function PrivacyPolicyPage() {
  const { t, i18n } = useTranslation();
  useSeo({ title: t("seo.privacy.title"), description: t("seo.privacy.description"), path: "/privacy-policy" });
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
        title={t("legalPages.privacy.title")}
        intro={t("legalPages.privacy.intro")}
        sections={[
          {
            title: t("legalPages.privacy.sections.dataProtection.title"),
            paragraphs: [
              t("legalPages.privacy.sections.dataProtection.p1"),
              t("legalPages.privacy.sections.dataProtection.p2"),
            ],
          },
          {
            title: t("legalPages.privacy.sections.processing.title"),
            paragraphs: [
              t("legalPages.privacy.sections.processing.p1"),
              t("legalPages.privacy.sections.processing.p2"),
            ],
          },
          {
            title: t("legalPages.privacy.sections.retention.title"),
            paragraphs: [
              t("legalPages.privacy.sections.retention.p1"),
              t("legalPages.privacy.sections.retention.p2"),
            ],
          },
          {
            title: t("legalPages.privacy.sections.rights.title"),
            paragraphs: [
              t("legalPages.privacy.sections.rights.p1"),
              t("legalPages.privacy.sections.rights.p2"),
            ],
          },
          {
            title: t("legalPages.privacy.sections.cookies.title"),
            paragraphs: [
              t("legalPages.privacy.sections.cookies.p1"),
              t("legalPages.privacy.sections.cookies.p2"),
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
      />
    </div>
  );
}
