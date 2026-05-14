import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertSeoAnalysisSchema } from "@shared/schema";
import { z } from "zod";
import { seoAnalyzer } from "./services/seoAnalyzer";
import { generatePdfReport, generateMasterPdfReport } from "./services/pdfGenerator";
import { adsAnalyzer } from "./services/adsAnalyzer";
import { aeoAnalyzer } from "./services/aeoAnalyzer";
import { siteTools } from "./services/siteTools";
import { geoAnalyzer } from "./services/geoAnalyzer";
import { rateLimiter } from "./services/rateLimiter";
import { storeAnalysis, getAnalysis, markPaid, getPaidTier, storeEmail, getEmail, storeLang, getLang, setPendingPayment, getPendingOrderId, findSessionByPendingOrderId } from "./services/analysisStore";
import { isMyPOSConfigured, createMyPOSCheckoutForm, verifyMyPOSNotification } from "./services/mypos";
import { isMailchimpConfigured, addSubscriber } from "./services/mailchimp";
import { createAccessCode, redeemAccessCode, useOneScan, getAccessCodeInfo, isAdminCode, findAccessCodeByPaymentId, savePaymentRecord, loadAccessCodesFromFirestore, markAccessCodeVerified } from "./services/accessCodeStore";
import { sendPdfReportEmail, sendVerificationEmail, isSmtpConfigured } from "./services/mailer";
import { createVerificationToken, consumeVerificationToken } from "./services/verificationStore";
import { createEmailSession, verifyEmailSession } from "./services/emailSession";
import { createOrGetPdfLink, getPdfByToken, markPdfEmailSent } from "./services/pdfDeliveryStore";
import { promises as fs } from "fs";
import { getFetchErrorCode } from "./services/httpClient";

function classifyAnalysisError(error: any): { status: number; body: { code: string; message: string } } {
  const fetchCode = getFetchErrorCode(error);
  if (fetchCode === "BOT_BLOCKED") {
    return { status: 502, body: { code: "BOT_BLOCKED", message: error?.message || "This site blocks automated requests." } };
  }
  if (fetchCode === "FETCH_TIMEOUT") {
    return { status: 504, body: { code: "FETCH_TIMEOUT", message: error?.message || "The site took too long to respond." } };
  }
  if (fetchCode === "FETCH_NETWORK") {
    return { status: 502, body: { code: "FETCH_NETWORK", message: error?.message || "Could not reach the site." } };
  }
  return { status: 400, body: { code: "ANALYSIS_FAILED", message: error?.message || "Analysis failed" } };
}

function sendAnalysisError(res: any, error: any) {
  const { status, body } = classifyAnalysisError(error);
  res.status(status).json(body);
}

function normalizeUrl(rawUrl: string): string {
  if (typeof rawUrl === 'string' && rawUrl.trim() && !rawUrl.match(/^https?:\/\//i)) {
    return `https://${rawUrl.trim()}`;
  }
  return rawUrl;
}

const urlSchema = z.object({
  url: z.string().transform(normalizeUrl).pipe(z.string().url("Please enter a valid URL")),
});

export async function registerRoutes(app: Express): Promise<Server> {
  
  // Analyze website SEO
  app.post("/api/analyze", async (req, res) => {
    try {
      const { url } = urlSchema.parse(req.body);
      
      // Perform comprehensive SEO analysis
      const analysisResults = await seoAnalyzer.analyzeWebsite(url);
      
      // Save analysis to storage
      const savedAnalysis = await storage.createSeoAnalysis(analysisResults);
      
      res.json(savedAnalysis);
    } catch (error: any) {
      sendAnalysisError(res, error);
    }
  });

  // Get analysis by ID
  app.get("/api/analysis/:id", async (req, res) => {
    try {
      const analysis = await storage.getSeoAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Get all analyses
  app.get("/api/analyses", async (req, res) => {
    try {
      const analyses = await storage.getAllSeoAnalyses();
      res.json(analyses);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Generate PDF report
  app.get("/api/analysis/:id/pdf", async (req, res) => {
    try {
      const analysis = await storage.getSeoAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }

      const pdfBuffer = await generatePdfReport(analysis);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename="seo-report-${analysis.url.replace(/[^a-zA-Z0-9]/g, '-')}.pdf"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Google Ads Landing Page Experience Analysis
  app.post("/api/ads-analyze", async (req, res) => {
    try {
      const { url } = urlSchema.parse(req.body);
      const analysisResults = await adsAnalyzer.analyzeLandingPage(url);
      const savedAnalysis = await storage.createAdsAnalysis(analysisResults);
      res.json(savedAnalysis);
    } catch (error: any) {
      sendAnalysisError(res, error);
    }
  });

  // Ad copy ↔ landing page relevance checker (Pro feature for diagnosing
  // Google Ads "Landing Page Experience" issues that aren't infrastructure-related).
  app.post("/api/ad-relevance-check", async (req, res) => {
    try {
      const schema = z.object({
        url: z.string().transform(normalizeUrl).pipe(z.string().url()),
        headlines: z.string().max(4000).optional().default(""),
        descriptions: z.string().max(4000).optional().default(""),
        keywords: z.string().max(4000).optional().default(""),
        lang: z.enum(["en", "hr"]).optional(),
      });
      const params = schema.parse(req.body);
      const { analyzeAdRelevance } = await import("./services/adRelevance");
      const result = await analyzeAdRelevance(params);
      res.json(result);
    } catch (error: any) {
      sendAnalysisError(res, error);
    }
  });

  app.get("/api/ads-analysis/:id", async (req, res) => {
    try {
      const analysis = await storage.getAdsAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // AEO (Answer Engine Optimization) Analysis
  app.post("/api/aeo-analyze", async (req, res) => {
    try {
      const { url } = urlSchema.parse(req.body);
      const analysisResults = await aeoAnalyzer.analyzeWebsite(url);
      const savedAnalysis = await storage.createAeoAnalysis(analysisResults);
      res.json(savedAnalysis);
    } catch (error: any) {
      sendAnalysisError(res, error);
    }
  });

  app.get("/api/aeo-analysis/:id", async (req, res) => {
    try {
      const analysis = await storage.getAeoAnalysis(req.params.id);
      if (!analysis) {
        return res.status(404).json({ message: "Analysis not found" });
      }
      res.json(analysis);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  const compareSchema = z.object({
    urls: z.array(z.string().transform(normalizeUrl).pipe(z.string().url())).min(2).max(3),
  });

  app.post("/api/aeo-compare", async (req, res) => {
    try {
      const { urls } = compareSchema.parse(req.body);
      const result = await aeoAnalyzer.compareWebsites(urls);
      res.json(result);
    } catch (error: any) {
      sendAnalysisError(res, error);
    }
  });

  app.post("/api/seo-compare", async (req, res) => {
    try {
      const { urls } = compareSchema.parse(req.body);
      const analyses = await Promise.all(
        urls.map(async (url) => {
          try {
            const result = await seoAnalyzer.analyzeWebsite(url);
            const checks = (result.results as any)?.technical || [];
            const passChecks = checks.filter((c: any) => c.status === "PASS");
            const failChecks = checks.filter((c: any) => c.status === "FAIL");
            return {
              url: result.url,
              overallScore: result.overallScore,
              technicalScore: result.technicalScore,
              performanceScore: result.performanceScore,
              accessibilityScore: result.accessibilityScore,
              keywordScore: result.keywordScore,
              contentScore: result.contentScore,
              passCount: passChecks.length,
              failCount: failChecks.length,
              warnCount: checks.filter((c: any) => c.status === "WARNING").length,
              keyStrengths: passChecks.slice(0, 5).map((c: any) => c.name),
              keyWeaknesses: failChecks.slice(0, 5).map((c: any) => c.name),
            };
          } catch (error: any) {
            return {
              url, overallScore: 0, technicalScore: 0, performanceScore: 0,
              accessibilityScore: 0, keywordScore: 0, contentScore: 0,
              passCount: 0, failCount: 0, warnCount: 0,
              keyStrengths: [], keyWeaknesses: [`Analysis failed: ${error.message}`],
              errorCode: getFetchErrorCode(error) || "ANALYSIS_FAILED",
              errorMessage: error?.message || "Analysis failed",
            };
          }
        })
      );
      const sorted = [...analyses].sort((a, b) => b.overallScore - a.overallScore);
      const winner = sorted[0]?.url || urls[0];
      const diff = sorted.length >= 2 ? sorted[0].overallScore - sorted[1].overallScore : 0;
      const summary = sorted.length >= 2
        ? `${new URL(sorted[0].url).hostname} leads with ${sorted[0].overallScore}/100, ${diff > 0 ? `${diff} points ahead of` : "tied with"} ${new URL(sorted[1].url).hostname} (${sorted[1].overallScore}/100).`
        : `${sorted[0]?.url} scored ${sorted[0]?.overallScore}/100.`;
      res.json({ urls, analyses, winner, summary });
    } catch (error: any) {
      sendAnalysisError(res, error);
    }
  });

  app.post("/api/ads-compare", async (req, res) => {
    try {
      const { urls } = compareSchema.parse(req.body);
      const analyses = await Promise.all(
        urls.map(async (url) => {
          try {
            const result = await adsAnalyzer.analyzeLandingPage(url);
            const r = result.results as any;
            const checks = r.checks || [];
            const passChecks = checks.filter((c: any) => c.status === "PASS");
            const failChecks = checks.filter((c: any) => c.status === "FAIL");
            return {
              url: result.url,
              score: r.score,
              rating: r.rating,
              ttfb: r.ttfb?.cleanUrl || 0,
              cdnDetected: r.cdn?.detected || false,
              cacheHealthy: !r.cache?.fragmented,
              redirectHops: r.redirects?.hops || 0,
              mobileUxGood: !!(r.mobileUx?.ctaVisibleAboveFold && r.mobileUx?.keywordInAboveFold),
              keyStrengths: passChecks.slice(0, 5).map((c: any) => c.name),
              keyWeaknesses: failChecks.slice(0, 5).map((c: any) => c.name),
            };
          } catch (error: any) {
            return {
              url, score: 0, rating: "Below average", ttfb: 0,
              cdnDetected: false, cacheHealthy: false, redirectHops: 0, mobileUxGood: false,
              keyStrengths: [], keyWeaknesses: [`Analysis failed: ${error.message}`],
              errorCode: getFetchErrorCode(error) || "ANALYSIS_FAILED",
              errorMessage: error?.message || "Analysis failed",
            };
          }
        })
      );
      const sorted = [...analyses].sort((a, b) => b.score - a.score);
      const winner = sorted[0]?.url || urls[0];
      const diff = sorted.length >= 2 ? sorted[0].score - sorted[1].score : 0;
      const summary = sorted.length >= 2
        ? `${new URL(sorted[0].url).hostname} leads with ${sorted[0].score}/100 (${sorted[0].rating}), ${diff > 0 ? `${diff} points ahead of` : "tied with"} ${new URL(sorted[1].url).hostname} (${sorted[1].score}/100, ${sorted[1].rating}).`
        : `${sorted[0]?.url} scored ${sorted[0]?.score}/100.`;
      res.json({ urls, analyses, winner, summary });
    } catch (error: any) {
      sendAnalysisError(res, error);
    }
  });

  // GEO (Generative Engine Optimization) Analysis
  app.post("/api/geo-analyze", async (req, res) => {
    try {
      const { url } = urlSchema.parse(req.body);
      const analysisResults = await geoAnalyzer.analyzeWebsite(url);
      res.json(analysisResults);
    } catch (error: any) {
      sendAnalysisError(res, error);
    }
  });

  app.post("/api/geo-compare", async (req, res) => {
    try {
      const { urls } = compareSchema.parse(req.body);
      const result = await geoAnalyzer.compareWebsites(urls);
      res.json(result);
    } catch (error: any) {
      sendAnalysisError(res, error);
    }
  });

  // Site Tools endpoints
  app.post("/api/broken-links", async (req, res) => {
    try {
      const { url } = urlSchema.parse(req.body);
      const result = await siteTools.checkBrokenLinks(url);
      res.json(result);
    } catch (error: any) {
      sendAnalysisError(res, error);
    }
  });

  app.post("/api/image-optimization", async (req, res) => {
    try {
      const { url } = urlSchema.parse(req.body);
      const result = await siteTools.analyzeImages(url);
      res.json(result);
    } catch (error: any) {
      sendAnalysisError(res, error);
    }
  });

  app.post("/api/internal-linking", async (req, res) => {
    try {
      const { url } = urlSchema.parse(req.body);
      const result = await siteTools.analyzeInternalLinking(url);
      res.json(result);
    } catch (error: any) {
      sendAnalysisError(res, error);
    }
  });

  app.post("/api/sitemap-validator", async (req, res) => {
    try {
      const { url } = urlSchema.parse(req.body);
      const result = await siteTools.validateSitemapAndRobots(url);
      res.json(result);
    } catch (error: any) {
      sendAnalysisError(res, error);
    }
  });

  // Master Analyzer - runs all tools in parallel, with rate limiting
  app.post("/api/master-analyze", async (req, res) => {
    try {
      const { url, accessCode, turnstileToken } = z.object({
        url: z.string().transform(normalizeUrl).pipe(z.string().url("Please enter a valid URL")),
        accessCode: z.string().optional(),
        turnstileToken: z.string().optional(),
      }).parse(req.body);

      const turnstileSecret = process.env.TURNSTILE_SECRET_KEY;
      const requestHost = (req.headers['host'] as string) || '';
      const isReplitDevHost = /\.(replit\.dev|repl\.co)$/i.test(requestHost);
      console.log("[turnstile] master-analyze request", {
        hasTurnstileSecret: !!turnstileSecret,
        hasTurnstileToken: !!turnstileToken,
        hasAccessCode: !!accessCode,
        isReplitDevHost,
      });
      if (turnstileSecret && !isReplitDevHost) {
        if (!turnstileToken) {
          console.warn("[turnstile] blocked request due to missing token");
          return res.status(403).json({ message: "Bot verification required. Please complete the challenge and try again." });
        }
        const clientIp = (req.headers['cf-connecting-ip'] as string) || (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || '';
        const verifyRes = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({ secret: turnstileSecret, response: turnstileToken, remoteip: clientIp }).toString(),
        });
        const verifyData = await verifyRes.json() as { success: boolean };
        console.log("[turnstile] siteverify response", {
          success: !!verifyData.success,
        });
        if (!verifyData.success) {
          console.warn("[turnstile] siteverify failed");
          return res.status(403).json({ message: "Bot verification failed. Please refresh the page and try again." });
        }
      }

      let isPaidScan = false;
      let scanTier: "free" | "basic" | "pro" = "free";
      let scansRemaining = 0;
      let validatedCode: string | undefined;
      let isAdmin = false;

      if (accessCode) {
        if (isAdminCode(accessCode)) {
          isAdmin = true;
          isPaidScan = true;
          scanTier = "pro";
          scansRemaining = 999999;
        } else {
          const codeInfo = await getAccessCodeInfo(accessCode);
          if (!codeInfo) {
            return res.status(400).json({ message: "Invalid access code" });
          }
          if (!codeInfo.valid || codeInfo.scansRemaining <= 0) {
            return res.status(403).json({ message: "No scans remaining on this access code", scansRemaining: 0 });
          }
          // Email-binding gate: paid scans require the bound email to be verified
          // and the request to carry a matching email-session token.
          const sessionToken = (req.body as any)?.emailSessionToken as string | undefined;
          const providedEmail = ((req.body as any)?.email as string | undefined)?.toLowerCase().trim();
          const session = verifyEmailSession(sessionToken);
          const claimed = (codeInfo.claimedByEmail || "").toLowerCase().trim();
          if (!codeInfo.emailVerified || !session || !claimed || session.email !== claimed || (providedEmail && providedEmail !== claimed)) {
            return res.status(403).json({
              message: "Email verification required for this access code.",
              code: "EMAIL_VERIFICATION_REQUIRED",
              requiresVerification: true,
              boundEmail: claimed || undefined,
            });
          }
          isPaidScan = true;
          scanTier = codeInfo.tier;
          validatedCode = accessCode.toUpperCase().trim();
        }
      }

      if (!isPaidScan) {
        const clientIp = (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() || req.ip || 'unknown';
        const rateCheck = rateLimiter.checkRateLimit(clientIp);

        if (!rateCheck.allowed) {
          return res.status(429).json({
            message: "Daily analysis limit reached",
            remaining: 0,
            resetAt: rateCheck.resetAt,
            upgradeRequired: true,
          });
        }

        rateLimiter.recordUsage(clientIp);
        scansRemaining = rateCheck.remaining;
      }

      const results = await Promise.allSettled([
        seoAnalyzer.analyzeWebsite(url),
        adsAnalyzer.analyzeLandingPage(url),
        aeoAnalyzer.analyzeWebsite(url),
        geoAnalyzer.analyzeWebsite(url),
        siteTools.checkBrokenLinks(url),
        siteTools.analyzeImages(url),
        siteTools.analyzeInternalLinking(url),
        siteTools.validateSitemapAndRobots(url),
      ]);

      const extract = <T>(r: PromiseSettledResult<T>): { data: T | null; error: string | null; errorCode: string | null } =>
        r.status === "fulfilled"
          ? { data: r.value, error: null, errorCode: null }
          : {
              data: null,
              error: r.reason?.message || "Analysis failed",
              errorCode: getFetchErrorCode(r.reason) || "ANALYSIS_FAILED",
            };

      const [seo, ads, aeo, geo, brokenLinks, imageOpt, internalLinks, sitemapValidator] = results;

      const masterResult = {
        url,
        seo: extract(seo),
        ads: extract(ads),
        aeo: extract(aeo),
        geo: extract(geo),
        brokenLinks: extract(brokenLinks),
        imageOptimization: extract(imageOpt),
        internalLinking: extract(internalLinks),
        sitemapValidator: extract(sitemapValidator),
      };

      const sessionId = storeAnalysis(masterResult);

      if (isPaidScan && !isAdmin && validatedCode) {
        const scanResult = await useOneScan(validatedCode, sessionId);
        scansRemaining = scanResult.remaining;
        markPaid(sessionId, scanTier as "basic" | "pro");
      } else if (isAdmin) {
        markPaid(sessionId, "pro");
      }

      res.json({
        ...masterResult,
        sessionId,
        remaining: isPaidScan ? scansRemaining : scansRemaining,
        paidTier: scanTier,
        scansRemaining: isPaidScan ? scansRemaining : undefined,
      });
    } catch (error: any) {
      sendAnalysisError(res, error);
    }
  });

  // Email capture for free teaser PDF
  app.post("/api/capture-email", async (req, res) => {
    try {
      const { email, sessionId } = z.object({
        email: z.string().email(),
        sessionId: z.string(),
      }).parse(req.body);

      const data = getAnalysis(sessionId);
      if (!data) {
        return res.status(404).json({ message: "Analysis session not found or expired" });
      }

      storeEmail(sessionId, email);
      await addSubscriber(email, ['seo-analyzer', 'free-report']);

      res.json({ success: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Tiered PDF email delivery (contains download link)
  app.post("/api/master-pdf", async (req, res) => {
    try {
      const { sessionId, tier, lang } = z.object({
        sessionId: z.string(),
        tier: z.enum(['free', 'basic', 'pro']).default('free'),
        lang: z.enum(['en', 'hr']).default('en'),
      }).parse(req.body);

      const data = getAnalysis(sessionId);
      if (!data) {
        return res.status(404).json({ message: "Analysis session not found or expired" });
      }

      const paidTier = getPaidTier(sessionId);
      const isDev = process.env.NODE_ENV !== 'production';
      const effectiveTier = isDev ? tier : (tier === 'free' ? 'free' : (paidTier === 'pro' ? tier : (paidTier === 'basic' && tier === 'basic' ? 'basic' : 'free')));
      const email = getEmail(sessionId);
      if (!email) {
        return res.status(400).json({ message: "No email is associated with this analysis session. Please provide an email first." });
      }

      const pdfBuffer = await generateMasterPdfReport(data, effectiveTier as 'free' | 'basic' | 'pro', lang);
      const filename = `seo-report-${effectiveTier}-${data.url.replace(/[^a-zA-Z0-9]/g, '-')}.pdf`;
      const { token, expiresAt, emailAlreadySent } = await createOrGetPdfLink({
        sessionId,
        tier: effectiveTier as 'free' | 'basic' | 'pro',
        lang,
        filename,
        pdfBuffer,
      });
      if (emailAlreadySent) {
        return res.status(409).json({ message: "Report email has already been sent for this scan." });
      }

      const configuredBaseUrl = (process.env.PUBLIC_BASE_URL || process.env.APP_BASE_URL || "").trim().replace(/\/+$/, "");
      const forwardedProto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
      const detectedProtocol = forwardedProto || req.protocol;
      let baseUrl = configuredBaseUrl || `${detectedProtocol}://${req.get('host')}`;
      if (process.env.NODE_ENV === "production" && baseUrl.startsWith("http://")) {
        baseUrl = baseUrl.replace("http://", "https://");
      }
      const downloadLink = `${baseUrl}/api/master-pdf-download?token=${encodeURIComponent(token)}`;

      if (isSmtpConfigured()) {
        await sendPdfReportEmail({
          to: email,
          url: data.url,
          tier: effectiveTier as 'free' | 'basic' | 'pro',
          downloadLink,
          lang,
        });
        markPdfEmailSent({ sessionId, tier: effectiveTier as 'free' | 'basic' | 'pro', lang });
        res.json({ success: true, sentTo: email, tier: effectiveTier, expiresAt, downloadLink });
      } else {
        console.warn('[mailer] SMTP not configured — returning direct download link instead of emailing.');
        res.json({ success: true, sentTo: null, tier: effectiveTier, expiresAt, downloadLink });
      }
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Direct PDF download endpoint used in email links
  app.get("/api/master-pdf-download", async (req, res) => {
    try {
      const { token } = z.object({
        token: z.string().uuid(),
      }).parse(req.query);

      const record = await getPdfByToken(token);
      if (!record) {
        return res.status(404).json({ message: "Download link is invalid or expired." });
      }

      const pdfBuffer = await fs.readFile(record.filePath);
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `attachment; filename="${record.filename}"`);
      res.send(pdfBuffer);
    } catch (error: any) {
      res.status(500).json({ message: error.message });
    }
  });

  // Redeem access code — requires the code to be bound to a verified email.
  app.post("/api/redeem-code", async (req, res) => {
    try {
      const { code, email, emailSessionToken } = z.object({
        code: z.string().min(1),
        email: z.string().email().optional(),
        emailSessionToken: z.string().optional(),
      }).parse(req.body);

      const info = await getAccessCodeInfo(code);
      if (!info) {
        return res.status(400).json({ message: "Invalid access code" });
      }

      // Admin code bypasses email verification.
      if (info.isAdmin) {
        return res.json({
          valid: info.valid,
          tier: info.tier,
          scansRemaining: info.scansRemaining,
          scansTotal: info.scansTotal,
          isAdmin: true,
        });
      }

      const claimed = (info.claimedByEmail || "").toLowerCase().trim();
      const providedEmail = email?.toLowerCase().trim();

      // Code bound to a different email — reject before leaking any further detail.
      if (claimed && providedEmail && providedEmail !== claimed) {
        return res.status(403).json({
          message: "This access code is registered to a different email address.",
          code: "EMAIL_MISMATCH",
        });
      }

      const session = verifyEmailSession(emailSessionToken);
      const sessionMatchesCode = session && claimed && session.email === claimed;

      if (!info.emailVerified || !sessionMatchesCode) {
        return res.status(200).json({
          valid: false,
          requiresVerification: true,
          boundEmail: claimed || undefined,
          tier: info.tier,
          scansRemaining: info.scansRemaining,
          scansTotal: info.scansTotal,
        });
      }

      res.json({
        valid: info.valid,
        tier: info.tier,
        scansRemaining: info.scansRemaining,
        scansTotal: info.scansTotal,
        isAdmin: false,
        verifiedEmail: claimed,
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Request a magic-link verification email for an access code.
  // Always returns a neutral 200 to avoid leaking whether the code/email pair exists.
  app.post("/api/request-verification", async (req, res) => {
    try {
      const { code, email, lang } = z.object({
        code: z.string().min(1),
        email: z.string().email(),
        lang: z.enum(["en", "hr"]).optional(),
      }).parse(req.body);

      const info = await getAccessCodeInfo(code);
      const normalizedEmail = email.toLowerCase().trim();
      const claimed = (info?.claimedByEmail || "").toLowerCase().trim();

      if (info && !info.isAdmin && claimed && claimed === normalizedEmail) {
        const token = await createVerificationToken(code, normalizedEmail, lang || "en");
        const configuredBaseUrl = (process.env.PUBLIC_BASE_URL || process.env.APP_BASE_URL || "").trim().replace(/\/+$/, "");
        const forwardedProto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
        const detectedProtocol = forwardedProto || req.protocol;
        let baseUrl = configuredBaseUrl || `${detectedProtocol}://${req.get("host")}`;
        if (process.env.NODE_ENV === "production" && baseUrl.startsWith("http://")) {
          baseUrl = baseUrl.replace("http://", "https://");
        }
        const verificationLink = `${baseUrl}/api/verify-email?token=${encodeURIComponent(token.token)}`;

        if (isSmtpConfigured()) {
          try {
            await sendVerificationEmail({
              to: normalizedEmail,
              code: token.code,
              verificationLink,
              lang: token.lang,
            });
          } catch (err) {
            console.error("[verification] Failed to send email:", err);
          }
        } else {
          console.warn("[verification] SMTP not configured — link:", verificationLink);
        }
      }

      res.json({ ok: true });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Magic-link landing endpoint. Validates the token, marks the code's email
  // as verified, mints a long-lived signed session, and redirects to the
  // frontend verify page so it can be persisted in localStorage.
  app.get("/api/verify-email", async (req, res) => {
    try {
      const token = String(req.query.token || "");
      if (!token) return res.redirect(`/verify-email?error=missing_token`);

      const entry = await consumeVerificationToken(token);
      if (!entry) return res.redirect(`/verify-email?error=invalid_or_expired`);

      const ok = await markAccessCodeVerified(entry.code);
      if (!ok) return res.redirect(`/verify-email?error=code_not_found`);

      const session = createEmailSession(entry.email);
      const params = new URLSearchParams({
        verified: "1",
        session,
        code: entry.code,
        email: entry.email,
      });
      return res.redirect(`/?${params.toString()}`);
    } catch (error: any) {
      console.error("[verification] verify-email error:", error);
      return res.redirect(`/verify-email?error=server_error`);
    }
  });

  app.post("/api/create-checkout", async (req, res) => {
    try {
      const requestReceivedAt = new Date();
      console.debug('[myPOS] /api/create-checkout incoming', {
        hasBody: !!req.body,
        bodyKeys: req.body ? Object.keys(req.body) : [],
        receivedAtUtc: requestReceivedAt.toISOString(),
        receivedAtLocal: requestReceivedAt.toString(),
        tzOffsetMinutes: requestReceivedAt.getTimezoneOffset(),
        nodeVersion: process.version,
      });
      const { sessionId, tier, lang: checkoutLang, email, firstName, lastName, phone, country, city, zipCode, address } = z.object({
        sessionId: z.string(),
        tier: z.enum(['basic', 'pro']),
        lang: z.enum(['en', 'hr']).default('en'),
        email: z.string().email("Valid email is required for paid checkout"),
        firstName: z.string().trim().min(1, "First name is required"),
        lastName: z.string().trim().min(1, "Last name is required"),
        phone: z.string().trim().optional(),
        country: z.string().trim().length(3, "Country must be ISO3 code (e.g. HRV)").optional(),
        city: z.string().trim().optional(),
        zipCode: z.string().trim().optional(),
        address: z.string().trim().optional(),
      }).parse(req.body);
      console.debug('[myPOS] /api/create-checkout parsed', {
        sessionIdPreview: `${sessionId.slice(0, 8)}...${sessionId.slice(-8)}`,
        tier,
        emailDomain: email && email.includes('@') ? email.split('@')[1] : null,
        host: req.get('host'),
        forwardedFor: req.headers['x-forwarded-for'] || null,
        userAgent: req.headers['user-agent'] || null,
      });

      const data = getAnalysis(sessionId);
      if (!data) {
        console.debug('[myPOS] /api/create-checkout session missing', {
          sessionIdPreview: `${sessionId.slice(0, 8)}...${sessionId.slice(-8)}`,
        });
        return res.status(404).json({ message: "Analysis session not found or expired" });
      }

      storeEmail(sessionId, email);
      storeLang(sessionId, checkoutLang);

      if (!isMyPOSConfigured()) {
        const isDev = process.env.NODE_ENV !== 'production';
        if (isDev) {
          const accessCodeEntry = await createAccessCode(email, tier);
          markPaid(sessionId, tier);
          await addSubscriber(email, ['seo-analyzer', `${tier}-customer`]);
          return res.json({
            devMode: true,
            accessCode: accessCodeEntry.code,
            tier: accessCodeEntry.tier,
            scansRemaining: accessCodeEntry.scansRemaining,
          });
        }
        return res.status(503).json({
          message: "Payment processing is not configured yet. Please contact support.",
          paymentConfigured: false,
        });
      }

      const configuredBaseUrl = (process.env.PUBLIC_BASE_URL || process.env.APP_BASE_URL || "").trim().replace(/\/+$/, "");
      const forwardedProto = (req.headers["x-forwarded-proto"] as string | undefined)?.split(",")[0]?.trim();
      const detectedProtocol = forwardedProto || req.protocol;
      let baseUrl = configuredBaseUrl || `${detectedProtocol}://${req.get('host')}`;
      if (process.env.NODE_ENV === "production" && baseUrl.startsWith("http://")) {
        baseUrl = baseUrl.replace("http://", "https://");
      }
      console.debug('[myPOS] /api/create-checkout urls resolved', {
        configuredBaseUrl,
        forwardedProto,
        detectedProtocol,
        host: req.get('host'),
        baseUrl,
      });
      const result = createMyPOSCheckoutForm({
        sessionId,
        tier,
        url: data.url,
        urlOk: `${baseUrl}/?payment=success&session=${sessionId}&tier=${tier}`,
        urlCancel: `${baseUrl}/?payment=cancelled&session=${sessionId}`,
        urlNotify: `${baseUrl}/api/mypos-notify`,
        customer: {
          email,
          firstName,
          lastName,
          phone: phone || undefined,
          country: country || undefined,
          city: city || undefined,
          zipCode: zipCode || undefined,
          address: address || undefined,
        },
      });

      if (!result) {
        return res.status(500).json({ message: "Failed to create checkout session" });
      }
      console.debug('[myPOS] /api/create-checkout form ready', {
        actionUrl: result.url,
        fieldCount: Object.keys(result.fields).length,
        fieldKeys: Object.keys(result.fields),
        signatureLength: result.fields.Signature?.length || 0,
      });

      const orderId = result.fields?.OrderID;
      if (!orderId) {
        return res.status(500).json({ message: "Failed to create checkout order id" });
      }
      setPendingPayment(sessionId, orderId, tier);
      console.debug('[myPOS] /api/create-checkout pending payment set', {
        sessionIdPreview: `${sessionId.slice(0, 8)}...${sessionId.slice(-8)}`,
        orderId,
        tier,
      });

      res.json(result);
    } catch (error: any) {
      console.error('[myPOS] /api/create-checkout failed', {
        message: error?.message,
        stack: error?.stack,
      });
      res.status(400).json({ message: error.message });
    }
  });

  app.post("/api/mypos-notify", async (req, res) => {
    try {
      const postData = req.body as Record<string, string>;
      console.log('[myPOS] Payment notification received:', JSON.stringify(postData));

      const paymentData = verifyMyPOSNotification(postData);
      if (!paymentData) {
        console.error('[myPOS] Invalid notification — signature verification failed');
        return res.status(200).send('OK');
      }

      console.log('[myPOS] Payment verified:', paymentData);

      // Unlock only after verified successful purchase notify callback.
      if (paymentData.ipcMethod === 'IPCPurchaseNotify') {
        const pending = findSessionByPendingOrderId(paymentData.orderId);
        if (!pending) {
          console.error('[myPOS] Verified payment for unknown order id:', paymentData.orderId);
          return res.status(200).send('OK');
        }

        const { sessionId, tier } = pending;
        markPaid(sessionId, tier);
        const customerEmail = getEmail(sessionId) || '';
        const existing = await findAccessCodeByPaymentId(paymentData.orderId);
        if (!existing) {
          const accessCode = await createAccessCode(customerEmail, tier, paymentData.orderId);
          await savePaymentRecord({
            paymentId: paymentData.orderId,
            email: customerEmail,
            tier,
            amount: parseFloat(paymentData.amount),
            currency: paymentData.currency,
            status: 'completed',
            accessCode: accessCode.code,
            createdAt: new Date(),
          });
          if (customerEmail) {
            await addSubscriber(customerEmail, ['seo-analyzer', `${tier}-customer`]);

            // Send the verification magic-link so the buyer can prove email
            // ownership and unlock their scans / PDF.
            try {
              const lang = getLang(sessionId);
              const tokenEntry = await createVerificationToken(accessCode.code, customerEmail, lang);
              const configuredBaseUrl = (process.env.PUBLIC_BASE_URL || process.env.APP_BASE_URL || "").trim().replace(/\/+$/, "");
              const baseUrl = configuredBaseUrl || `${req.protocol}://${req.get("host")}`;
              const link = `${baseUrl.replace(/^http:/, process.env.NODE_ENV === "production" ? "https:" : "http:")}/api/verify-email?token=${encodeURIComponent(tokenEntry.token)}`;
              if (isSmtpConfigured()) {
                await sendVerificationEmail({
                  to: customerEmail,
                  code: accessCode.code,
                  verificationLink: link,
                  lang,
                });
              } else {
                console.warn("[verification] SMTP not configured — purchase verification link:", link);
              }
            } catch (verifyErr) {
              console.error("[verification] Failed to send purchase verification email:", verifyErr);
            }
          }
          console.log(`[myPOS] Access code created: ${accessCode.code} for tier: ${tier}, email: ${customerEmail || 'none'}`);
        }
      }

      res.status(200).send('OK');
    } catch (error: any) {
      console.error('[myPOS] Notification error:', error);
      res.status(200).send('OK');
    }
  });

  // Get access code after payment (called by frontend after redirect)
  app.post("/api/get-access-code", async (req, res) => {
    try {
      const { sessionId, tier } = z.object({
        sessionId: z.string(),
        tier: z.enum(['basic', 'pro']),
      }).parse(req.body);

      const isDev = process.env.NODE_ENV !== 'production';
      const paidTier = getPaidTier(sessionId);

      if (isDev && paidTier !== 'free') {
        const devEmail = getEmail(sessionId) || 'dev@test.com';
        const devFallbackCode = await createAccessCode(devEmail, tier, `session-${sessionId}`);
        return res.json({
          accessCode: devFallbackCode.code,
          tier: devFallbackCode.tier,
          scansRemaining: devFallbackCode.scansRemaining,
          scansTotal: devFallbackCode.scansTotal,
          email: devEmail,
        });
      }

      const pendingOrderId = getPendingOrderId(sessionId);
      if (!pendingOrderId) {
        return res.status(404).json({ message: "No checkout order found for this session" });
      }

      const accessCodeEntry = await findAccessCodeByPaymentId(pendingOrderId);
      if (!accessCodeEntry) {
        return res.status(202).json({ message: "Payment not confirmed yet. Awaiting myPOS notification." });
      }

      if (accessCodeEntry.tier !== tier) {
        return res.status(409).json({ message: "Paid tier does not match requested tier" });
      }

      if (paidTier === 'free') {
        markPaid(sessionId, tier);
      }

      return res.json({
        accessCode: accessCodeEntry.code,
        tier: accessCodeEntry.tier,
        scansRemaining: accessCodeEntry.scansRemaining,
        scansTotal: accessCodeEntry.scansTotal,
        email: accessCodeEntry.email || accessCodeEntry.claimedByEmail || '',
      });
    } catch (error: any) {
      res.status(400).json({ message: error.message });
    }
  });

  // Manual payment verification (for success URL redirect)
  app.post("/api/verify-payment", async (req, res) => {
    return res.status(410).json({
      message: "Manual verification disabled. Access is unlocked only after verified myPOS notification.",
    });
  });

  app.get("/api/config", (_req, res) => {
    res.json({
      paymentConfigured: isMyPOSConfigured(),
      mailchimpConfigured: isMailchimpConfigured(),
      pricing: {
        basic: { amount: 19, currency: 'EUR', label: 'Basic Report' },
        pro: { amount: 29, currency: 'EUR', label: 'Pro Report' },
      },
    });
  });

  // ----------------------------------------------------------------------------
  // SEO: robots.txt, sitemap.xml, llms.txt
  // ----------------------------------------------------------------------------
  const SITE_ORIGIN = process.env.PUBLIC_SITE_ORIGIN || "https://freeseositeanalyzer.eu";
  const PUBLIC_PAGES = [
    { loc: "/", changefreq: "weekly", priority: "1.0" },
    { loc: "/ads-analyzer", changefreq: "weekly", priority: "0.8" },
    { loc: "/aeo-analyzer", changefreq: "weekly", priority: "0.8" },
    { loc: "/site-tools", changefreq: "weekly", priority: "0.7" },
    { loc: "/dashboard", changefreq: "weekly", priority: "0.6" },
    { loc: "/privacy-policy", changefreq: "yearly", priority: "0.3" },
    { loc: "/terms-of-service", changefreq: "yearly", priority: "0.3" },
    { loc: "/refund-cancellation-policy", changefreq: "yearly", priority: "0.2" },
    { loc: "/delivery-fulfillment", changefreq: "yearly", priority: "0.2" },
  ];

  app.get("/robots.txt", (_req, res) => {
    const body =
      `User-agent: *\nAllow: /\nDisallow: /api/\nDisallow: /checkout\nDisallow: /verify-email\n\n` +
      `# AI crawlers welcome\nUser-agent: GPTBot\nAllow: /\nUser-agent: ClaudeBot\nAllow: /\nUser-agent: PerplexityBot\nAllow: /\nUser-agent: Google-Extended\nAllow: /\n\n` +
      `Sitemap: ${SITE_ORIGIN}/sitemap.xml\n`;
    res.type("text/plain").set("Cache-Control", "public, max-age=3600").send(body);
  });

  app.get("/sitemap.xml", (_req, res) => {
    const today = new Date().toISOString().slice(0, 10);
    const urls = PUBLIC_PAGES.map((p) => {
      const en = `${SITE_ORIGIN}${p.loc}`;
      const hr = `${SITE_ORIGIN}${p.loc}${p.loc.includes("?") ? "&" : "?"}lang=hr`;
      return (
        `  <url>\n` +
        `    <loc>${en}</loc>\n` +
        `    <lastmod>${today}</lastmod>\n` +
        `    <changefreq>${p.changefreq}</changefreq>\n` +
        `    <priority>${p.priority}</priority>\n` +
        `    <xhtml:link rel="alternate" hreflang="en" href="${en}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="hr" href="${hr}"/>\n` +
        `    <xhtml:link rel="alternate" hreflang="x-default" href="${en}"/>\n` +
        `  </url>`
      );
    }).join("\n");
    const body =
      `<?xml version="1.0" encoding="UTF-8"?>\n` +
      `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">\n${urls}\n</urlset>\n`;
    res.type("application/xml").set("Cache-Control", "public, max-age=3600").send(body);
  });

  app.get("/llms.txt", (_req, res) => {
    const body =
      `# FreeSEOSiteAnalyzer\n` +
      `> Free website analyzer for SEO, AEO, GEO and Google Ads landing-page experience. Slogan: Scan. Snap. Fix What Matters.\n\n` +
      `FreeSEOSiteAnalyzer runs four audits in one click and returns copy-paste fixes for the issues that hurt your ranking, AI citations and Google Ads Quality Score.\n\n` +
      `## Pricing\n` +
      `- Free: overall score plus the top issues.\n` +
      `- Basic — €19 one-time: full audit data, no fix instructions.\n` +
      `- Pro — €29 one-time: full audit data plus copy-paste, step-by-step fixes.\n\n` +
      `## What it analyzes\n` +
      `- SEO: titles, meta, headings, structured data, internal links, images, sitemap, robots, Core Web Vitals signals.\n` +
      `- AEO (Answer Engine Optimization): structured data, citation likelihood, AI search preview, schema generator, content gaps.\n` +
      `- GEO (Generative Engine Optimization): readiness for ChatGPT, Perplexity and Google AI Overviews.\n` +
      `- Google Ads landing-page experience: TTFB, CDN, cache, redirects, hosting, mobile UX, ad-copy quality rater.\n\n` +
      `## Key URLs\n` +
      `- Home: ${SITE_ORIGIN}/\n` +
      `- Sitemap: ${SITE_ORIGIN}/sitemap.xml\n` +
      `- Privacy: ${SITE_ORIGIN}/privacy-policy\n` +
      `- Terms: ${SITE_ORIGIN}/terms-of-service\n\n` +
      `## Languages\n` +
      `English (en) and Croatian (hr). Append ?lang=hr for the Croatian version.\n`;
    res.type("text/plain; charset=utf-8").set("Cache-Control", "public, max-age=3600").send(body);
  });

  const httpServer = createServer(app);
  return httpServer;
}
