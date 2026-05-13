import { ReactNode } from "react";
import { Link } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type LegalSection = {
  title: string;
  paragraphs: string[];
};

type RelatedLink = {
  href: string;
  label: string;
};

type CompanyDetails = {
  name: string;
  addressLine1: string;
  addressLine2: string;
  oib: string;
  email: string;
};

type LegalPageLayoutProps = {
  title: string;
  intro?: string;
  sections: LegalSection[];
  companyTitle: string;
  companyDetails: CompanyDetails;
  relatedPoliciesTitle: string;
  relatedLinks: RelatedLink[];
  backHomeLabel: string;
  footerNote?: ReactNode;
};

export default function LegalPageLayout({
  title,
  intro,
  sections,
  companyTitle,
  companyDetails,
  relatedPoliciesTitle,
  relatedLinks,
  backHomeLabel,
  footerNote,
}: LegalPageLayoutProps) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <main className="container mx-auto max-w-4xl px-4 py-10">
        <div className="mb-8">
          <Link href="/" className="text-sm text-primary hover:underline">
            {backHomeLabel}
          </Link>
          <h1 className="mt-3 text-3xl font-bold tracking-tight">{title}</h1>
          {intro ? <p className="mt-3 text-muted-foreground">{intro}</p> : null}
        </div>

        <div className="space-y-4">
          {sections.map((section) => (
            <Card key={section.title}>
              <CardHeader>
                <CardTitle className="text-xl">{section.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="text-sm leading-6 text-muted-foreground">
                    {paragraph}
                  </p>
                ))}
              </CardContent>
            </Card>
          ))}

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{companyTitle}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm text-muted-foreground">
              <p className="font-medium text-foreground">{companyDetails.name}</p>
              <p>{companyDetails.addressLine1}</p>
              <p>{companyDetails.addressLine2}</p>
              <p>{companyDetails.oib}</p>
              <p>
                <a className="text-primary hover:underline" href={`mailto:${companyDetails.email}`}>
                  {companyDetails.email}
                </a>
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{relatedPoliciesTitle}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-4 text-sm">
              {relatedLinks.map((linkItem) => (
                <Link key={linkItem.href} href={linkItem.href} className="text-primary hover:underline">
                  {linkItem.label}
                </Link>
              ))}
            </CardContent>
          </Card>
        </div>

        {footerNote ? <div className="mt-8 text-xs text-muted-foreground">{footerNote}</div> : null}
      </main>
    </div>
  );
}
