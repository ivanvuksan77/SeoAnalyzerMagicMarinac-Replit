import { useTranslation } from "react-i18next";
import LegalPageLayout from "@/components/legal-page-layout";
import { useSeo } from "@/lib/seo";

export default function RefundCancellationPolicyPage() {
  const { t } = useTranslation();
  useSeo({ title: t("seo.refund.title"), description: t("seo.refund.description"), path: "/refund-cancellation-policy" });

  return (
    <LegalPageLayout
      title={t("legalPages.refund.title")}
      intro={t("legalPages.refund.intro")}
      sections={[
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
        { href: "/delivery-fulfillment", label: t("legalPages.links.delivery") },
        { href: "/privacy-policy", label: t("legalPages.links.privacy") },
      ]}
      backHomeLabel={t("legalPages.common.backHome")}
    />
  );
}
