import { useTranslation } from "react-i18next";
import LegalPageLayout from "@/components/legal-page-layout";
import { useSeo } from "@/lib/seo";

export default function DeliveryFulfillmentPage() {
  const { t } = useTranslation();
  useSeo({ title: t("seo.delivery.title"), description: t("seo.delivery.description"), path: "/delivery-fulfillment" });

  return (
    <LegalPageLayout
      title={t("legalPages.delivery.title")}
      intro={t("legalPages.delivery.intro")}
      sections={[
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
      relatedPoliciesTitle={t("legalPages.common.relatedPoliciesTitle")}
      relatedLinks={[
        { href: "/terms-of-service", label: t("legalPages.links.terms") },
        { href: "/refund-cancellation-policy", label: t("legalPages.links.refund") },
        { href: "/privacy-policy", label: t("legalPages.links.privacy") },
      ]}
      backHomeLabel={t("legalPages.common.backHome")}
    />
  );
}
