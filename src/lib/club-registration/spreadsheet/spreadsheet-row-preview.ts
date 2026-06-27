import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import {
  MEDICAL_CERTIFICATE_STATUS_LABELS,
  type MedicalCertificateStatus,
} from "@/lib/club-registration/medical-certificate";
import {
  REGISTRATION_STATUS_LABELS,
  type RegistrationStatus,
} from "@/lib/club-registration/registration-status";
import { formatSpreadsheetCellValue } from "./format-cell-value";
import type { SpreadsheetFormatContext } from "./format-context";

export type SpreadsheetRowPreviewLine = {
  label: string;
  value: string;
};

function formatSubmittedAt(value: unknown): string {
  if (typeof value !== "string" || !value) {
    return "—";
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString("fr-FR");
}

function formatStatus(value: unknown): string {
  if (typeof value === "string" && value in REGISTRATION_STATUS_LABELS) {
    return REGISTRATION_STATUS_LABELS[value as RegistrationStatus];
  }
  return "—";
}

function formatCertificate(value: unknown): string {
  if (typeof value === "string" && value in MEDICAL_CERTIFICATE_STATUS_LABELS) {
    return MEDICAL_CERTIFICATE_STATUS_LABELS[value as MedicalCertificateStatus];
  }
  return "—";
}

export function buildSpreadsheetRowPreviewLines(
  row: RegistrationClientRecord,
  config: RegistrationConfigV1 | null,
  context: SpreadsheetFormatContext
): SpreadsheetRowPreviewLine[] {
  const section = formatSpreadsheetCellValue("mainSectionId", row, config, context);
  const amount = formatSpreadsheetCellValue("paymentAmountCents", row, config, context);
  const paymentStatus = formatSpreadsheetCellValue("paymentStatus", row, config, context);

  return [
    { label: "Statut", value: formatStatus(row.status) },
    { label: "Section", value: section || "—" },
    {
      label: "Montant",
      value: amount || paymentStatus ? `${amount || "—"} · ${paymentStatus || "—"}` : "—",
    },
    { label: "Certificat", value: formatCertificate(row.medicalCertificateStatus) },
    { label: "Envoyé le", value: formatSubmittedAt(row.submittedAt) },
  ];
}
