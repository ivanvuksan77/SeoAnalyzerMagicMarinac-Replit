import { useEffect } from "react";
import { Switch, Route, useLocation } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import MasterAnalyzerPage from "@/pages/master-analyzer";
import CheckoutPage from "./pages/checkout";
import PrivacyPolicyPage from "@/pages/privacy-policy";
import TermsOfServicePage from "@/pages/terms-of-service";
import RefundCancellationPolicyPage from "@/pages/refund-cancellation-policy";
import DeliveryFulfillmentPage from "@/pages/delivery-fulfillment";
import VerifyEmailPage from "@/pages/verify-email";
import AdsAnalyzerPage from "@/pages/ads-analyzer";
import AeoAnalyzerPage from "@/pages/aeo-analyzer";
import SiteToolsPage from "@/pages/site-tools";
import Dashboard from "@/pages/dashboard";
import NotFound from "@/pages/not-found";

function ScrollToTop() {
  const [location] = useLocation();

  useEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" as ScrollBehavior });
  }, [location]);

  return null;
}

function Router() {
  return (
    <Switch>
      <Route path="/" component={MasterAnalyzerPage} />
      <Route path="/ads-analyzer" component={AdsAnalyzerPage} />
      <Route path="/aeo-analyzer" component={AeoAnalyzerPage} />
      <Route path="/site-tools" component={SiteToolsPage} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/checkout" component={CheckoutPage} />
      <Route path="/privacy-policy" component={PrivacyPolicyPage} />
      <Route path="/terms-of-service" component={TermsOfServicePage} />
      <Route path="/refund-cancellation-policy" component={RefundCancellationPolicyPage} />
      <Route path="/delivery-fulfillment" component={DeliveryFulfillmentPage} />
      <Route path="/verify-email" component={VerifyEmailPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  useEffect(() => {
    if ("scrollRestoration" in window.history) {
      window.history.scrollRestoration = "manual";
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <ScrollToTop />
        <Router />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
