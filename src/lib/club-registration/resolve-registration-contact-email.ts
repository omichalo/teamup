import type { DocumentData } from "firebase-admin/firestore";

/** Adresse e-mail de contact pour un dossier d'adhésion (paiement, confirmations…). */
export function resolveRegistrationContactEmail(data: DocumentData): string | null {
  if (typeof data.adherentEmail === "string" && data.adherentEmail.includes("@")) {
    return data.adherentEmail;
  }
  if (
    Array.isArray(data.representatives) &&
    typeof data.representatives[0]?.email === "string" &&
    data.representatives[0].email.includes("@")
  ) {
    return data.representatives[0].email;
  }
  if (
    typeof data.submitterAccountEmail === "string" &&
    data.submitterAccountEmail.includes("@")
  ) {
    return data.submitterAccountEmail;
  }
  return null;
}
