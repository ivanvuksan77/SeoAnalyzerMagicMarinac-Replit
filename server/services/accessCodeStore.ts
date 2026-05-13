import { randomBytes } from "crypto";
import { isFirebaseConfigured, getFirestoreDb } from "./firebase";

interface AccessCode {
  code: string;
  email: string;
  /** Lowercased email the code is bound to. Sharing the code with a different email is rejected. */
  claimedByEmail: string;
  /** True only after the bound email clicked the magic-link verification email. */
  emailVerified: boolean;
  tier: "basic" | "pro";
  scansRemaining: number;
  scansTotal: number;
  sessionIds: string[];
  createdAt: Date;
  paymentId?: string;
}

interface PaymentRecord {
  paymentId: string;
  email: string;
  tier: "basic" | "pro";
  amount: number;
  currency: string;
  status: string;
  accessCode: string;
  createdAt: Date;
}

const accessCodeStore = new Map<string, AccessCode>();

const SCANS_BY_TIER: Record<string, number> = { basic: 5, pro: 10 };

function generateCode(tier: "basic" | "pro"): string {
  const prefix = tier === "pro" ? "PRO" : "BAS";
  const random = randomBytes(3).toString("hex").toUpperCase();
  return `${prefix}-${random}`;
}

function accessCodeToFirestore(entry: AccessCode): Record<string, any> {
  return {
    ...entry,
    createdAt: entry.createdAt.toISOString(),
  };
}

function firestoreToAccessCode(data: Record<string, any>): AccessCode {
  const email = data.email || "";
  return {
    code: data.code,
    email,
    claimedByEmail: (data.claimedByEmail || email || "").toLowerCase(),
    emailVerified: data.emailVerified === true,
    tier: data.tier,
    scansRemaining: data.scansRemaining,
    scansTotal: data.scansTotal,
    sessionIds: data.sessionIds || [],
    createdAt: new Date(data.createdAt),
    paymentId: data.paymentId,
  };
}

export async function loadAccessCodesFromFirestore(): Promise<void> {
  const db = getFirestoreDb();
  if (!db) return;

  try {
    const snapshot = await db.collection("accessCodes").get();
    snapshot.forEach((doc) => {
      const entry = firestoreToAccessCode(doc.data());
      accessCodeStore.set(entry.code, entry);
    });
    console.log(`Loaded ${snapshot.size} access codes from Firestore`);
  } catch (error) {
    console.error("Failed to load access codes from Firestore:", error);
  }
}

export async function createAccessCode(email: string, tier: "basic" | "pro", paymentId?: string): Promise<AccessCode> {
  const code = generateCode(tier);
  const entry: AccessCode = {
    code,
    email,
    claimedByEmail: (email || "").toLowerCase().trim(),
    emailVerified: false,
    tier,
    scansRemaining: SCANS_BY_TIER[tier] || 5,
    scansTotal: SCANS_BY_TIER[tier] || 5,
    sessionIds: [],
    createdAt: new Date(),
    paymentId,
  };
  accessCodeStore.set(code, entry);

  const db = getFirestoreDb();
  if (db) {
    try {
      await db.collection("accessCodes").doc(code).set(accessCodeToFirestore(entry));
    } catch (error) {
      console.error("Failed to write access code to Firestore:", error);
    }
  }

  return entry;
}

export async function redeemAccessCode(code: string): Promise<AccessCode | null> {
  const normalizedCode = code.toUpperCase().trim();
  const entry = accessCodeStore.get(normalizedCode);
  if (entry) return entry;

  const db = getFirestoreDb();
  if (db) {
    try {
      const doc = await db.collection("accessCodes").doc(normalizedCode).get();
      if (doc.exists) {
        const firestoreEntry = firestoreToAccessCode(doc.data()!);
        accessCodeStore.set(normalizedCode, firestoreEntry);
        return firestoreEntry;
      }
    } catch (error) {
      console.error("Failed to read access code from Firestore:", error);
    }
  }

  return null;
}

export async function useOneScan(code: string, sessionId: string): Promise<{ success: boolean; remaining: number }> {
  const normalizedCode = code.toUpperCase().trim();
  let entry = accessCodeStore.get(normalizedCode);

  if (!entry) {
    const db = getFirestoreDb();
    if (db) {
      try {
        const doc = await db.collection("accessCodes").doc(normalizedCode).get();
        if (doc.exists) {
          entry = firestoreToAccessCode(doc.data()!);
          accessCodeStore.set(normalizedCode, entry);
        }
      } catch (error) {
        console.error("Failed to read access code from Firestore:", error);
      }
    }
  }

  if (!entry || entry.scansRemaining <= 0) {
    return { success: false, remaining: entry?.scansRemaining ?? 0 };
  }

  entry.scansRemaining -= 1;
  entry.sessionIds.push(sessionId);

  const db = getFirestoreDb();
  if (db) {
    try {
      await db.collection("accessCodes").doc(normalizedCode).update({
        scansRemaining: entry.scansRemaining,
        sessionIds: entry.sessionIds,
      });
    } catch (error) {
      console.error("Failed to update access code in Firestore:", error);
    }
  }

  return { success: true, remaining: entry.scansRemaining };
}

export function isAdminCode(code: string): boolean {
  const adminCode = process.env.ADMIN_ACCESS_CODE;
  if (!adminCode) return false;
  return code.toUpperCase().trim() === adminCode.toUpperCase().trim();
}

export async function markAccessCodeVerified(code: string): Promise<boolean> {
  const normalizedCode = code.toUpperCase().trim();
  const entry = await redeemAccessCode(normalizedCode);
  if (!entry) return false;
  if (entry.emailVerified) return true;

  entry.emailVerified = true;
  accessCodeStore.set(normalizedCode, entry);

  const db = getFirestoreDb();
  if (db) {
    try {
      await db.collection("accessCodes").doc(normalizedCode).update({ emailVerified: true });
    } catch (error) {
      console.error("Failed to mark access code verified in Firestore:", error);
    }
  }
  return true;
}

export async function getAccessCodeRecord(code: string): Promise<AccessCode | null> {
  if (isAdminCode(code)) return null;
  return redeemAccessCode(code);
}

export async function getAccessCodeInfo(code: string): Promise<{
  valid: boolean;
  tier: "basic" | "pro";
  scansRemaining: number;
  scansTotal: number;
  email: string;
  claimedByEmail?: string;
  emailVerified?: boolean;
  isAdmin?: boolean;
} | null> {
  if (isAdminCode(code)) {
    return {
      valid: true,
      tier: "pro",
      scansRemaining: 999999,
      scansTotal: 999999,
      email: "admin",
      emailVerified: true,
      isAdmin: true,
    };
  }

  const normalizedCode = code.toUpperCase().trim();
  let entry = accessCodeStore.get(normalizedCode);

  if (!entry) {
    const db = getFirestoreDb();
    if (db) {
      try {
        const doc = await db.collection("accessCodes").doc(normalizedCode).get();
        if (doc.exists) {
          entry = firestoreToAccessCode(doc.data()!);
          accessCodeStore.set(normalizedCode, entry);
        }
      } catch (error) {
        console.error("Failed to read access code from Firestore:", error);
      }
    }
  }

  if (!entry) return null;
  return {
    valid: entry.scansRemaining > 0,
    tier: entry.tier,
    scansRemaining: entry.scansRemaining,
    scansTotal: entry.scansTotal,
    email: entry.email,
    claimedByEmail: entry.claimedByEmail,
    emailVerified: entry.emailVerified,
  };
}

export async function findAccessCodeByPaymentId(paymentId: string): Promise<AccessCode | null> {
  let found: AccessCode | null = null;
  accessCodeStore.forEach((entry) => {
    if (entry.paymentId === paymentId) found = entry;
  });
  if (found) return found;

  const db = getFirestoreDb();
  if (db) {
    try {
      const snapshot = await db.collection("accessCodes").where("paymentId", "==", paymentId).limit(1).get();
      if (!snapshot.empty) {
        const firestoreEntry = firestoreToAccessCode(snapshot.docs[0].data());
        accessCodeStore.set(firestoreEntry.code, firestoreEntry);
        return firestoreEntry;
      }
    } catch (error) {
      console.error("Failed to query access code by paymentId from Firestore:", error);
    }
  }

  return null;
}

export async function savePaymentRecord(record: PaymentRecord): Promise<void> {
  const db = getFirestoreDb();
  if (db) {
    try {
      await db.collection("payments").doc(record.paymentId).set({
        ...record,
        createdAt: record.createdAt.toISOString(),
      });
    } catch (error) {
      console.error("Failed to save payment record to Firestore:", error);
    }
  }
}
