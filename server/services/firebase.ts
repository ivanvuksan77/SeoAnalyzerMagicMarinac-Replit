import { initializeApp, cert, getApps, type App } from "firebase-admin/app";
import { getFirestore as getAdminFirestore, type Firestore } from "firebase-admin/firestore";

let app: App | null = null;
let db: Firestore | null = null;

export function isFirebaseConfigured(): boolean {
  return !!process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
}

function initFirebase(): void {
  if (app) return;
  if (!isFirebaseConfigured()) return;

  try {
    const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT_KEY!);
    if (getApps().length === 0) {
      app = initializeApp({
        credential: cert(serviceAccount),
      });
    } else {
      app = getApps()[0];
    }
    db = getAdminFirestore(app);
  } catch (error) {
    console.error("Failed to initialize Firebase:", error);
    app = null;
    db = null;
  }
}

export function getFirestoreDb(): Firestore | null {
  if (!db) {
    initFirebase();
  }
  return db;
}
