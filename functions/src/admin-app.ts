import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

/** Initialise l'app Admin une seule fois (API modulaire firebase-admin ≥13). */
export function ensureAdminApp(): void {
  if (getApps().length === 0) {
    initializeApp();
  }
}

export function adminAuth() {
  ensureAdminApp();
  return getAuth();
}

export function adminDb() {
  ensureAdminApp();
  return getFirestore();
}

export { FieldValue };
