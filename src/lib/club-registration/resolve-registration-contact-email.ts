import type { DocumentData } from "firebase-admin/firestore";

/** Adresse e-mail de contact adhérent pour un dossier (paiement, confirmations…). */
export function resolveRegistrationContactEmail(data: DocumentData): string | null {
  if (typeof data.adherentEmail === "string" && data.adherentEmail.includes("@")) {
    return data.adherentEmail.trim();
  }
  if (
    Array.isArray(data.representatives) &&
    typeof data.representatives[0]?.email === "string" &&
    data.representatives[0].email.includes("@")
  ) {
    return data.representatives[0].email.trim();
  }
  return null;
}
