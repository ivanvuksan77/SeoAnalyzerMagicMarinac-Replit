import { randomBytes } from "crypto";
import { getFirestoreDb } from "./firebase";

export interface VerificationToken {
  token: string;
  code: string;
  email: string;
  lang: "en" | "hr";
  expiresAt: Date;
  usedAt: Date | null;
}

const TOKEN_TTL_MS = 30 * 60 * 1000;
const memoryStore = new Map<string, VerificationToken>();

function toFirestore(entry: VerificationToken): Record<string, any> {
  return {
    ...entry,
    expiresAt: entry.expiresAt.toISOString(),
    usedAt: entry.usedAt ? entry.usedAt.toISOString() : null,
  };
}

function fromFirestore(data: Record<string, any>): VerificationToken {
  return {
    token: data.token,
    code: data.code,
    email: data.email,
    lang: data.lang === "hr" ? "hr" : "en",
    expiresAt: new Date(data.expiresAt),
    usedAt: data.usedAt ? new Date(data.usedAt) : null,
  };
}

export async function createVerificationToken(
  code: string,
  email: string,
  lang: "en" | "hr" = "en",
): Promise<VerificationToken> {
  const token = randomBytes(32).toString("hex");
  const entry: VerificationToken = {
    token,
    code: code.toUpperCase().trim(),
    email: email.toLowerCase().trim(),
    lang,
    expiresAt: new Date(Date.now() + TOKEN_TTL_MS),
    usedAt: null,
  };
  memoryStore.set(token, entry);

  const db = getFirestoreDb();
  if (db) {
    try {
      await db.collection("verificationTokens").doc(token).set(toFirestore(entry));
    } catch (error) {
      console.error("[verificationStore] Failed to persist token:", error);
    }
  }
  return entry;
}

/**
 * Atomically consume a verification token. Uses a Firestore transaction when
 * Firestore is available so two concurrent magic-link clicks cannot both
 * succeed (single-use guarantee). Falls back to an in-memory CAS when no
 * Firestore is configured.
 */
export async function consumeVerificationToken(token: string): Promise<VerificationToken | null> {
  const db = getFirestoreDb();

  if (db) {
    const docRef = db.collection("verificationTokens").doc(token);
    try {
      const consumed = await db.runTransaction(async (tx) => {
        const snap = await tx.get(docRef);
        if (!snap.exists) {
          // Doc not in Firestore (e.g. Firestore was unavailable at creation time).
          // Return undefined so we fall through to the memory store below.
          return undefined as VerificationToken | null | undefined;
        }
        const entry = fromFirestore(snap.data() as Record<string, any>);
        if (entry.usedAt) return null;  // already used
        if (Date.now() > entry.expiresAt.getTime()) return null;  // expired
        const usedAt = new Date();
        tx.update(docRef, { usedAt: usedAt.toISOString() });
        entry.usedAt = usedAt;
        return entry;
      });

      if (consumed === null) {
        // Doc existed but was already used or expired — definitive rejection.
        return null;
      }
      if (consumed) {
        // Successfully consumed from Firestore.
        memoryStore.set(token, consumed);
        return consumed;
      }
      // consumed === undefined: doc not in Firestore, fall through to memory.
    } catch (error) {
      // Firestore unavailable or auth failure — fall through to memory store.
      console.warn("[verificationStore] Firestore transaction failed, falling back to memory store:", (error as any)?.message ?? error);
    }
  }

  // In-memory CAS fallback: used when Firestore is unavailable, not configured,
  // or when the token was stored only in memory (Firestore write failed at creation).
  const entry = memoryStore.get(token);
  if (!entry) return null;
  if (entry.usedAt) return null;
  if (Date.now() > entry.expiresAt.getTime()) return null;
  entry.usedAt = new Date();
  memoryStore.set(token, entry);
  return entry;
}
