import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { useSeo } from "@/lib/seo";

type Status = "loading" | "success" | "error";

export default function VerifyEmailPage() {
  const { t } = useTranslation();
  useSeo({ title: t("seo.verify.title"), description: t("seo.verify.description"), path: "/verify-email", noindex: true });
  const [, navigate] = useLocation();
  const [status, setStatus] = useState<Status>("loading");
  const [email, setEmail] = useState<string>("");

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const session = params.get("session");
    const code = params.get("code");
    const e = params.get("email");
    const error = params.get("error");

    if (error) {
      setStatus("error");
      return;
    }

    if (!session || !code || !e) {
      setStatus("error");
      return;
    }

    try {
      localStorage.setItem(
        "seo-analyzer-email-session",
        JSON.stringify({ session, email: e.toLowerCase(), code: code.toUpperCase() }),
      );
      setEmail(e);
      setStatus("success");
      // Scrub the session/code/email out of the address bar (and Referer for
      // any subsequent navigation) so they don't end up in browser history,
      // bookmarks, or referrer headers.
      try {
        window.history.replaceState({}, "", "/verify-email");
      } catch {}
    } catch {
      setStatus("error");
    }
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-md" data-testid="card-verify-email">
        <CardContent className="pt-8 pb-6 text-center space-y-4">
          {status === "loading" && (
            <>
              <Loader2 className="w-12 h-12 mx-auto animate-spin text-primary" />
              <p className="text-sm text-muted-foreground" data-testid="text-verify-loading">
                {t("verification.loading")}
              </p>
            </>
          )}
          {status === "success" && (
            <>
              <CheckCircle2 className="w-12 h-12 mx-auto text-emerald-500" />
              <h1 className="text-xl font-semibold" data-testid="text-verify-success-title">
                {t("verification.successTitle")}
              </h1>
              <p className="text-sm text-muted-foreground" data-testid="text-verify-success-description">
                {t("verification.successDescription", { email })}
              </p>
              <Button onClick={() => navigate("/")} className="w-full" data-testid="button-continue">
                {t("verification.continue")}
              </Button>
            </>
          )}
          {status === "error" && (
            <>
              <XCircle className="w-12 h-12 mx-auto text-red-500" />
              <h1 className="text-xl font-semibold" data-testid="text-verify-error-title">
                {t("verification.errorTitle")}
              </h1>
              <p className="text-sm text-muted-foreground" data-testid="text-verify-error-description">
                {t("verification.errorDescription")}
              </p>
              <Button onClick={() => navigate("/")} variant="outline" className="w-full" data-testid="button-back-home">
                {t("verification.backHome")}
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
