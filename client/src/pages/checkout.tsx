import { useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "wouter";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Lock, ArrowLeft, Search, Languages, Sun, Moon, Check } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useSeo } from "@/lib/seo";

type CheckoutTier = "basic" | "pro";
type CheckoutCustomerForm = {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  country: string;
  city: string;
  zipCode: string;
  address: string;
};

export default function CheckoutPage() {
  const { t, i18n } = useTranslation();
  useSeo({ title: t("seo.checkout.title"), description: t("seo.checkout.description"), path: "/checkout", noindex: true });
  const { toast } = useToast();
  const [, setLocation] = useLocation();
  const [submitting, setSubmitting] = useState(false);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [customerForm, setCustomerForm] = useState<CheckoutCustomerForm>({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    country: "",
    city: "",
    zipCode: "",
    address: "",
  });
  const [darkMode, setDarkMode] = useState(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("seo-analyzer-theme");
      if (saved) return saved === "dark";
      return window.matchMedia("(prefers-color-scheme: dark)").matches;
    }
    return false;
  });

  const selectedTier = useMemo<CheckoutTier>(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get("tier") === "pro" ? "pro" : "basic";
  }, []);

  const selectedPrice = selectedTier === "pro" ? t("modals.pricing.proPrice") : t("modals.pricing.basicPrice");
  const selectedPlanName = selectedTier === "pro" ? t("modals.orderSummary.planPro") : t("modals.orderSummary.planBasic");
  const selectedScans = selectedTier === "pro" ? t("modals.pricing.proCredits") : t("modals.pricing.basicCredits");
  const selectedDeliverable = selectedTier === "pro" ? t("modals.orderSummary.deliverablePro") : t("modals.orderSummary.deliverableBasic");

  const sessionId = useMemo(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      const sessionFromQuery = params.get("session");
      if (sessionFromQuery) return sessionFromQuery;
      const saved = sessionStorage.getItem("seo-analyzer-result");
      if (!saved) return null;
      const parsed = JSON.parse(saved);
      return typeof parsed?.sessionId === "string" ? parsed.sessionId : null;
    } catch {
      return null;
    }
  }, []);

  const handleProceed = async () => {
    if (!sessionId) {
      toast({ title: t("toast.error"), description: t("modals.orderSummary.sessionMissing"), variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const response = await apiRequest("POST", "/api/create-checkout", {
        sessionId,
        tier: selectedTier,
        lang: i18n.language === 'hr' ? 'hr' : 'en',
        email: customerForm.email.trim(),
        firstName: customerForm.firstName.trim(),
        lastName: customerForm.lastName.trim(),
        phone: customerForm.phone.trim() || undefined,
        country: customerForm.country.trim().toUpperCase() || undefined,
        city: customerForm.city.trim() || undefined,
        zipCode: customerForm.zipCode.trim() || undefined,
        address: customerForm.address.trim() || undefined,
      });
      const data = await response.json();

      if (data.url && data.fields) {
        const form = document.createElement("form");
        form.method = "POST";
        form.action = data.url;
        form.style.display = "none";

        const orderedFields = Array.isArray(data.orderedFields)
          ? data.orderedFields
          : Object.entries(data.fields).map(([key, value]) => ({ key, value }));

        for (const entry of orderedFields) {
          if (!entry || typeof entry.key !== "string") continue;
          const input = document.createElement("input");
          input.type = "hidden";
          input.name = entry.key;
          input.value = String(entry.value ?? "");
          form.appendChild(input);
        }

        document.body.appendChild(form);
        form.submit();
        return;
      }

      if (data.paymentConfigured === false) {
        toast({ title: t("toast.paymentNotAvailable"), description: t("toast.paymentSetup"), variant: "destructive" });
        return;
      }

      toast({ title: t("toast.error"), description: t("toast.checkoutError"), variant: "destructive" });
    } catch (error: any) {
      toast({ title: t("toast.error"), description: error.message || t("toast.checkoutError"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  useEffect(() => {
    document.documentElement.classList.toggle("dark", darkMode);
    localStorage.setItem("seo-analyzer-theme", darkMode ? "dark" : "light");
  }, [darkMode]);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="bg-card border-b border-border shadow-sm">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center">
                <Search className="text-primary-foreground w-4 h-4" />
              </div>
              <div className="flex flex-col leading-tight">
                <h1 className="text-xl font-bold text-foreground">{t("header.title")}</h1>
                <span className="text-[11px] font-medium tracking-wide text-muted-foreground">{t("header.slogan")}</span>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-9 px-2 rounded-full gap-1.5"
                    aria-label={t("header.toggleLang")}
                    data-testid="button-language"
                  >
                    <Languages className="w-4 h-4" />
                    <span className="text-xs font-semibold uppercase">{i18n.language === "hr" ? "HR" : "EN"}</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="min-w-[140px]">
                  <DropdownMenuLabel>{t("header.languageLabel")}</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={() => i18n.changeLanguage("en")} data-testid="lang-option-en">
                    {t("header.languageEnglish")}
                    {i18n.language === "en" && <Check className="w-4 h-4 ml-auto" />}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => i18n.changeLanguage("hr")} data-testid="lang-option-hr">
                    {t("header.languageCroatian")}
                    {i18n.language === "hr" && <Check className="w-4 h-4 ml-auto" />}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setDarkMode(!darkMode)}
                className="w-9 h-9 rounded-full"
                aria-label={t("header.toggleDark")}
              >
                {darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
              </Button>
            </div>
          </div>
        </div>
      </header>

      <main className="container mx-auto max-w-3xl px-4 py-10">
        <Button variant="ghost" className="mb-4" onClick={() => setLocation("/")}>
          <ArrowLeft className="w-4 h-4 mr-2" /> {t("legalPages.common.backHome")}
        </Button>

        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">{t("modals.orderSummary.title")}</h1>
          <p className="mt-2 text-muted-foreground">{t("modals.orderSummary.description")}</p>
        </div>

        <div className="space-y-4">
          <Card>
            <CardContent className="p-4 space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("modals.orderSummary.planLabel")}</span>
                <span className="font-semibold">{selectedPlanName}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("modals.orderSummary.priceLabel")}</span>
                <span className="font-semibold">{selectedPrice}</span>
              </div>
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">{t("modals.orderSummary.scansLabel")}</span>
                <span className="font-semibold">{selectedScans}</span>
              </div>
              <div className="pt-1 text-sm">
                <p className="text-muted-foreground">{t("modals.orderSummary.deliverableLabel")}</p>
                <p className="font-medium">{selectedDeliverable}</p>
              </div>

              <div className="mt-2 space-y-3 border-t border-border pt-4">
                <div className="grid gap-3 md:grid-cols-2">
                  <div>
                    <Label htmlFor="checkout-email">Email *</Label>
                    <Input
                      id="checkout-email"
                      type="email"
                      value={customerForm.email}
                      onChange={(e) => setCustomerForm((prev) => ({ ...prev, email: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkout-phone">Phone</Label>
                    <Input
                      id="checkout-phone"
                      value={customerForm.phone}
                      onChange={(e) => setCustomerForm((prev) => ({ ...prev, phone: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkout-first-name">First Name *</Label>
                    <Input
                      id="checkout-first-name"
                      value={customerForm.firstName}
                      onChange={(e) => setCustomerForm((prev) => ({ ...prev, firstName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkout-last-name">Last Name *</Label>
                    <Input
                      id="checkout-last-name"
                      value={customerForm.lastName}
                      onChange={(e) => setCustomerForm((prev) => ({ ...prev, lastName: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkout-country">Country (ISO3)</Label>
                    <Input
                      id="checkout-country"
                      placeholder="HRV"
                      maxLength={3}
                      value={customerForm.country}
                      onChange={(e) => setCustomerForm((prev) => ({ ...prev, country: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkout-city">City</Label>
                    <Input
                      id="checkout-city"
                      value={customerForm.city}
                      onChange={(e) => setCustomerForm((prev) => ({ ...prev, city: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkout-zip">ZIP code</Label>
                    <Input
                      id="checkout-zip"
                      value={customerForm.zipCode}
                      onChange={(e) => setCustomerForm((prev) => ({ ...prev, zipCode: e.target.value }))}
                    />
                  </div>
                  <div>
                    <Label htmlFor="checkout-address">Address</Label>
                    <Input
                      id="checkout-address"
                      value={customerForm.address}
                      onChange={(e) => setCustomerForm((prev) => ({ ...prev, address: e.target.value }))}
                    />
                  </div>
                </div>

                <label className="flex items-start gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    className="mt-0.5"
                    checked={termsAccepted}
                    onChange={(e) => setTermsAccepted(e.target.checked)}
                  />
                  <span>{t("modals.orderSummary.termsConsent")}</span>
                </label>

                <div className="flex flex-wrap gap-2">
                  <Button
                    onClick={handleProceed}
                    disabled={
                      submitting ||
                      !termsAccepted ||
                      !customerForm.email.trim() ||
                      !customerForm.firstName.trim() ||
                      !customerForm.lastName.trim()
                    }
                    className="min-w-[280px]"
                  >
                    <Lock className="w-4 h-4 mr-2" />
                    {t("modals.orderSummary.proceedCta")}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setLocation("/")}>
                    {t("modals.orderSummary.cancel")}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("modals.orderSummary.legalLinksTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-3 text-sm">
              <Link href="/terms-of-service" className="text-primary hover:underline">{t("legalPages.links.terms")}</Link>
              <Link href="/privacy-policy" className="text-primary hover:underline">{t("legalPages.links.privacy")}</Link>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">{t("modals.orderSummary.companyTitle")}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              <p>{t("legalPages.company.name")}</p>
              <p>{t("legalPages.company.addressLine1")}</p>
              <p>{t("legalPages.company.addressLine2")}</p>
              <p>{t("legalPages.company.oib")}</p>
            </CardContent>
          </Card>
        </div>

      </main>
    </div>
  );
}
