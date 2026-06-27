import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import type { RegistrationPayment } from "@/lib/club-registration/payment/types";

export const SPREADSHEET_USER_UID_FIELDS = [
  "submitterUid",
  "paymentRequestedBy",
  "medicalCertificateStatusUpdatedBy",
] as const;

export type SpreadsheetUserLabelRecord = {
  displayName: string | null;
  email: string | null;
};

export type SpreadsheetUserLabelDirectory = Record<string, SpreadsheetUserLabelRecord>;

function addUid(target: Set<string>, value: unknown): void {
  if (typeof value === "string" && value.trim().length > 0) {
    target.add(value.trim());
  }
}

function collectPaymentUids(payment: unknown, target: Set<string>): void {
  if (!payment || typeof payment !== "object") {
    return;
  }
  const receivedPayments = (payment as RegistrationPayment).receivedPayments;
  if (!Array.isArray(receivedPayments)) {
    return;
  }
  for (const entry of receivedPayments) {
    if (entry && typeof entry === "object") {
      addUid(target, (entry as { recordedBy?: unknown }).recordedBy);
    }
  }
}

export function collectSpreadsheetUserUids(
  registrations: readonly RegistrationClientRecord[]
): string[] {
  const uids = new Set<string>();

  for (const row of registrations) {
    for (const field of SPREADSHEET_USER_UID_FIELDS) {
      addUid(uids, row[field]);
    }
    collectPaymentUids(row.payment, uids);
  }

  return [...uids];
}

export function serializeUserLabelDirectory(
  labels: Map<string, SpreadsheetUserLabelRecord>
): SpreadsheetUserLabelDirectory {
  const directory: SpreadsheetUserLabelDirectory = {};
  for (const [uid, label] of labels.entries()) {
    directory[uid] = label;
  }
  return directory;
}
