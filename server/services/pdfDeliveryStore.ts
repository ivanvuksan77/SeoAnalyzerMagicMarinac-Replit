import { promises as fs } from "fs";
import path from "path";
import { randomUUID } from "crypto";

type Tier = "free" | "basic" | "pro";
type Lang = "en" | "hr";

interface PdfLinkRecord {
  token: string;
  sessionId: string;
  tier: Tier;
  lang: Lang;
  filePath: string;
  filename: string;
  createdAt: number;
  expiresAt: number;
  emailSentAt: number | null;
}

const MAX_AGE_MS = 10 * 24 * 60 * 60 * 1000; // 10 days
const CLEANUP_INTERVAL_MS = 60 * 60 * 1000; // 1h
const linksByToken = new Map<string, PdfLinkRecord>();
const tokenByScanKey = new Map<string, string>();
const storageDir = path.join(process.cwd(), "tmp", "pdf-links");

// Cache key includes lang so EN and HR PDFs for the same session+tier
// don't collide. Without lang in the key, requesting an HR PDF after an
// EN PDF would silently return the cached EN file.
function scanKey(sessionId: string, tier: Tier, lang: Lang): string {
  return `${sessionId}:${tier}:${lang}`;
}

async function ensureStorageDir() {
  await fs.mkdir(storageDir, { recursive: true });
}

async function removeRecord(record: PdfLinkRecord) {
  linksByToken.delete(record.token);
  tokenByScanKey.delete(scanKey(record.sessionId, record.tier, record.lang));
  try {
    await fs.unlink(record.filePath);
  } catch {
    // File may already be removed.
  }
}

export async function createOrGetPdfLink(params: {
  sessionId: string;
  tier: Tier;
  lang: Lang;
  filename: string;
  pdfBuffer: Buffer;
}): Promise<{ token: string; expiresAt: number; emailAlreadySent: boolean }> {
  await ensureStorageDir();

  const key = scanKey(params.sessionId, params.tier, params.lang);
  const existingToken = tokenByScanKey.get(key);
  if (existingToken) {
    const existing = linksByToken.get(existingToken);
    if (existing) {
      if (Date.now() < existing.expiresAt) {
        try {
          await fs.access(existing.filePath);
          return {
            token: existing.token,
            expiresAt: existing.expiresAt,
            emailAlreadySent: existing.emailSentAt !== null,
          };
        } catch {
          await removeRecord(existing);
        }
      } else {
        await removeRecord(existing);
      }
    }
  }

  const token = randomUUID();
  const filePath = path.join(storageDir, `${token}.pdf`);
  await fs.writeFile(filePath, params.pdfBuffer);

  const createdAt = Date.now();
  const expiresAt = createdAt + MAX_AGE_MS;
  const record: PdfLinkRecord = {
    token,
    sessionId: params.sessionId,
    tier: params.tier,
    lang: params.lang,
    filePath,
    filename: params.filename,
    createdAt,
    expiresAt,
    emailSentAt: null,
  };

  linksByToken.set(token, record);
  tokenByScanKey.set(key, token);

  return { token, expiresAt, emailAlreadySent: false };
}

export async function getPdfByToken(token: string): Promise<PdfLinkRecord | null> {
  const record = linksByToken.get(token);
  if (!record) return null;
  if (Date.now() >= record.expiresAt) {
    await removeRecord(record);
    return null;
  }
  return record;
}

export async function consumePdfByToken(token: string): Promise<PdfLinkRecord | null> {
  const record = await getPdfByToken(token);
  if (!record) return null;
  linksByToken.delete(record.token);
  tokenByScanKey.delete(scanKey(record.sessionId, record.tier, record.lang));
  return record;
}

export function markPdfEmailSent(params: { sessionId: string; tier: Tier; lang: Lang }): boolean {
  const key = scanKey(params.sessionId, params.tier, params.lang);
  const token = tokenByScanKey.get(key);
  if (!token) return false;
  const record = linksByToken.get(token);
  if (!record) return false;
  if (record.emailSentAt !== null) return false;
  record.emailSentAt = Date.now();
  return true;
}

export async function runPdfLinkCleanup(): Promise<void> {
  const now = Date.now();
  const records = Array.from(linksByToken.values());
  for (const record of records) {
    if (now >= record.expiresAt) {
      await removeRecord(record);
    }
  }
}

setInterval(() => {
  runPdfLinkCleanup().catch(() => {
    // Avoid crashing the process due to cleanup failures.
  });
}, CLEANUP_INTERVAL_MS);
