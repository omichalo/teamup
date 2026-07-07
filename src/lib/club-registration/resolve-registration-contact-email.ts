import type { DocumentData } from "firebase-admin/firestore";
import { isMinorAt } from "@/lib/club-registration/age";
import { isClubRegistrationManager } from "@/lib/club-registration/registration-access";
import { resolveRole, type UserRole } from "@/lib/auth/roles";

function isValidEmail(value: unknown): value is string {
  return typeof value === "string" && value.includes("@");
}

function trimEmail(value: string): string {
  return value.trim();
}

function resolveSubmitterRole(data: DocumentData): UserRole | null {
  if (typeof data.submitterRole === "string") {
    return resolveRole(data.submitterRole);
  }
  return null;
}

function wasSubmittedByClubStaff(data: DocumentData): boolean {
  const submitterRole = resolveSubmitterRole(data);
  return submitterRole != null && isClubRegistrationManager(submitterRole);
}

function isRegistrationMinor(data: DocumentData): boolean {
  if (data.isMinor === true) return true;
  if (data.adherentRole === "minor_dependent") return true;
  if (typeof data.birthDate === "string") {
    return isMinorAt(data.birthDate);
  }
  return false;
}

/** E-mails des représentants légaux (dédupliqués, ordre conservé). */
export function resolveRegistrationRepresentativeEmails(data: DocumentData): string[] {
  if (!Array.isArray(data.representatives)) {
    return [];
  }

  const emails: string[] = [];
  const seen = new Set<string>();
  for (const rep of data.representatives) {
    if (typeof rep?.email === "string" && isValidEmail(rep.email)) {
      const trimmed = trimEmail(rep.email);
      const key = trimmed.toLowerCase();
      if (!seen.has(key)) {
        seen.add(key);
        emails.push(trimmed);
      }
    }
  }
  return emails;
}

function resolveSubmitterAccountEmail(data: DocumentData): string | null {
  if (typeof data.submitterAccountEmail === "string" && isValidEmail(data.submitterAccountEmail)) {
    return trimEmail(data.submitterAccountEmail);
  }
  return null;
}

/** Adresse e-mail de contact adhérent pour un dossier (affichage secrétariat, confirmations…). */
export function resolveRegistrationContactEmail(data: DocumentData): string | null {
  const representativeEmails = resolveRegistrationRepresentativeEmails(data);
  if (isRegistrationMinor(data) && representativeEmails.length > 0) {
    return representativeEmails[0];
  }
  if (typeof data.adherentEmail === "string" && isValidEmail(data.adherentEmail)) {
    return trimEmail(data.adherentEmail);
  }
  if (representativeEmails.length > 0) {
    return representativeEmails[0];
  }
  return resolveSubmitterAccountEmail(data);
}

/**
 * Destinataires pour demandes et confirmations de paiement.
 * Compte soumettant par défaut ; représentants légaux si le dossier a été créé par le club (admin/secrétariat).
 */
export function resolveRegistrationPaymentRecipientEmails(data: DocumentData): string[] {
  if (wasSubmittedByClubStaff(data)) {
    const representativeEmails = resolveRegistrationRepresentativeEmails(data);
    if (representativeEmails.length > 0) {
      return representativeEmails;
    }
    if (typeof data.adherentEmail === "string" && isValidEmail(data.adherentEmail)) {
      return [trimEmail(data.adherentEmail)];
    }
    const submitterEmail = resolveSubmitterAccountEmail(data);
    return submitterEmail ? [submitterEmail] : [];
  }

  const submitterEmail = resolveSubmitterAccountEmail(data);
  if (submitterEmail) {
    return [submitterEmail];
  }

  const contactEmail = resolveRegistrationContactEmail(data);
  return contactEmail ? [contactEmail] : [];
}

export function formatRegistrationPaymentEmailsForStorage(emails: string[]): string {
  return emails.join(", ");
}
