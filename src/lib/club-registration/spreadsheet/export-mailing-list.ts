import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import {
  resolveRegistrationMailingListContacts,
  type RegistrationMailingListContactType,
} from "@/lib/club-registration/resolve-registration-contact-email";

export type MailingListCsvRow = {
  email: string;
  lastName: string;
  firstName: string;
  contactType: RegistrationMailingListContactType;
  registrationId: string;
};

const CONTACT_TYPE_LABELS: Record<RegistrationMailingListContactType, string> = {
  adherent: "adhérent",
  representative: "représentant",
};

function escapeCsvCell(value: string): string {
  if (/[;"\n\r]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

function stringField(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

/** Contacts de diffusion pour les dossiers fournis (dédup e-mail globale). */
export function collectMailingListCsvRows(
  rows: RegistrationClientRecord[]
): MailingListCsvRow[] {
  const result: MailingListCsvRow[] = [];
  const seen = new Set<string>();

  for (const row of rows) {
    const contacts = resolveRegistrationMailingListContacts(row);
    const lastName = stringField(row.lastName);
    const firstName = stringField(row.firstName);
    const registrationId = stringField(row.id);

    for (const contact of contacts) {
      const key = contact.email.toLowerCase();
      if (seen.has(key)) {
        continue;
      }
      seen.add(key);
      result.push({
        email: contact.email,
        lastName,
        firstName,
        contactType: contact.contactType,
        registrationId,
      });
    }
  }

  return result;
}

/** E-mails uniques pour presse-papiers / outils de mailing. */
export function collectMailingListEmails(rows: RegistrationClientRecord[]): string[] {
  return collectMailingListCsvRows(rows).map((row) => row.email);
}

export function formatMailingListForClipboard(emails: string[]): string {
  return emails.join("; ");
}

export function buildMailingListCsv(rows: RegistrationClientRecord[]): string {
  const csvRows = collectMailingListCsvRows(rows);
  const header = ["Email", "Nom adhérent", "Prénom adhérent", "Type contact", "Id dossier"]
    .map(escapeCsvCell)
    .join(";");

  const body = csvRows.map((row) =>
    [
      row.email,
      row.lastName,
      row.firstName,
      CONTACT_TYPE_LABELS[row.contactType],
      row.registrationId,
    ]
      .map(escapeCsvCell)
      .join(";")
  );

  return `\uFEFF${[header, ...body].join("\r\n")}`;
}

export function buildMailingListExportFilename(date = new Date()): string {
  const stamp = date.toISOString().slice(0, 10);
  return `liste-diffusion-${stamp}.csv`;
}

export function countRegistrationsWithoutMailingEmail(
  rows: RegistrationClientRecord[]
): number {
  return rows.filter((row) => resolveRegistrationMailingListContacts(row).length === 0)
    .length;
}
