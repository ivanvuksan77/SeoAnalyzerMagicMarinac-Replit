import { createHmac, timingSafeEqual } from "crypto";

const SECRET = process.env.SESSION_SECRET || process.env.HMAC_SECRET || "";
if (!SECRET && process.env.NODE_ENV === "production") {
  // Hard-fail in production: a predictable fallback would let attackers forge
  // verified-email sessions and bypass the entire email-binding gate.
  throw new Error(
    "[emailSession] SESSION_SECRET (or HMAC_SECRET) is required in production. Refusing to start with a predictable fallback.",
  );
}
const EFFECTIVE_SECRET = SECRET || "dev-only-please-set-SESSION_SECRET";

const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000;

interface EmailSessionPayload {
  email: string;
  exp: number;
}

function base64url(input: Buffer | string): string {
  const buf = typeof input === "string" ? Buffer.from(input) : input;
  return buf.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64url(input: string): Buffer {
  const padded = input.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((input.length + 3) % 4);
  return Buffer.from(padded, "base64");
}

function sign(payloadB64: string): string {
  return createHmac("sha256", EFFECTIVE_SECRET).update(payloadB64).digest("hex");
}

/**
 * Creates a signed, self-contained session token proving that `email` was
 * verified via magic link. No DB roundtrip needed to validate.
 */
export function createEmailSession(email: string, ttlMs: number = SESSION_TTL_MS): string {
  const payload: EmailSessionPayload = {
    email: email.toLowerCase().trim(),
    exp: Date.now() + ttlMs,
  };
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = sign(payloadB64);
  return `${payloadB64}.${signature}`;
}

/**
 * Validates a session token. Returns the verified email on success, or null
 * if the token is malformed, has a bad signature, or is expired.
 */
export function verifyEmailSession(token: string | undefined | null): { email: string } | null {
  if (!token || typeof token !== "string") return null;
  const parts = token.split(".");
  if (parts.length !== 2) return null;
  const [payloadB64, signature] = parts;

  const expected = sign(payloadB64);
  try {
    const a = Buffer.from(signature, "hex");
    const b = Buffer.from(expected, "hex");
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  } catch {
    return null;
  }

  let payload: EmailSessionPayload;
  try {
    payload = JSON.parse(fromBase64url(payloadB64).toString("utf8"));
  } catch {
    return null;
  }

  if (!payload.email || typeof payload.exp !== "number") return null;
  if (Date.now() > payload.exp) return null;

  return { email: payload.email };
}
