import { randomUUID } from "crypto";

interface AnalysisSession {
  data: any;
  email: string | null;
  lang: "en" | "hr";
  paidTier: "free" | "basic" | "pro";
  pendingOrderId: string | null;
  pendingTier: "basic" | "pro" | null;
  createdAt: Date;
}

const analysisStore = new Map<string, AnalysisSession>();

// Auto-cleanup: remove entries older than 24 hours
const CLEANUP_INTERVAL = 60 * 60 * 1000; // 1 hour
const MAX_AGE = 24 * 60 * 60 * 1000; // 24 hours

function cleanupOldEntries() {
  const now = Date.now();
  const toDelete: string[] = [];
  analysisStore.forEach((session, sessionId) => {
    if (now - session.createdAt.getTime() > MAX_AGE) {
      toDelete.push(sessionId);
    }
  });
  toDelete.forEach(id => analysisStore.delete(id));
}

// Start cleanup interval
setInterval(cleanupOldEntries, CLEANUP_INTERVAL);

export function storeAnalysis(data: any): string {
  const sessionId = randomUUID();
  analysisStore.set(sessionId, {
    data,
    email: null,
    lang: "en",
    paidTier: "free",
    pendingOrderId: null,
    pendingTier: null,
    createdAt: new Date(),
  });
  return sessionId;
}

export function storeLang(sessionId: string, lang: "en" | "hr"): void {
  const session = analysisStore.get(sessionId);
  if (session) {
    session.lang = lang;
  }
}

export function getLang(sessionId: string): "en" | "hr" {
  const session = analysisStore.get(sessionId);
  return session ? session.lang : "en";
}

export function getAnalysis(sessionId: string): any | null {
  const session = analysisStore.get(sessionId);
  return session ? session.data : null;
}

export function markPaid(sessionId: string, tier: "basic" | "pro"): void {
  const session = analysisStore.get(sessionId);
  if (session) {
    session.paidTier = tier;
  }
}

export function getPaidTier(
  sessionId: string
): "free" | "basic" | "pro" {
  const session = analysisStore.get(sessionId);
  return session ? session.paidTier : "free";
}

export function storeEmail(sessionId: string, email: string): void {
  const session = analysisStore.get(sessionId);
  if (session) {
    session.email = email;
  }
}

export function getEmail(sessionId: string): string | null {
  const session = analysisStore.get(sessionId);
  return session ? session.email : null;
}

export function setPendingPayment(sessionId: string, orderId: string, tier: "basic" | "pro"): void {
  const session = analysisStore.get(sessionId);
  if (session) {
    session.pendingOrderId = orderId;
    session.pendingTier = tier;
  }
}

export function getPendingOrderId(sessionId: string): string | null {
  const session = analysisStore.get(sessionId);
  return session ? session.pendingOrderId : null;
}

export function findSessionByPendingOrderId(orderId: string): { sessionId: string; tier: "basic" | "pro" } | null {
  for (const [sessionId, session] of analysisStore.entries()) {
    if (session.pendingOrderId === orderId && session.pendingTier) {
      return { sessionId, tier: session.pendingTier };
    }
  }
  return null;
}
