import type { MedicalCertificateStatus } from "@/lib/club-registration/medical-certificate";
import { getEnabledSections } from "@/lib/club-registration-config/helpers";
import { getDefaultRegistrationConfig } from "@/lib/club-registration-config/default-config";

export type MesInscriptionSummary = {
  id: string;
  adherentRole?: "self" | "minor_dependent" | "other_adult";
  firstName?: string;
  lastName?: string;
  mainSectionId?: string;
  medicalCertificateStatus?: MedicalCertificateStatus;
  status?: string;
  paymentAmountCents?: number;
  paymentStatus?: string;
  payment?: Record<string, unknown>;
  invoiceAvailable?: boolean;
  submittedAt?: string | null;
};

export type MesInscriptionsApiResponse =
  | { registrations: MesInscriptionSummary[] }
  | { error: string };

export const MES_INSCRIPTION_ROLE_LABEL: Record<
  NonNullable<MesInscriptionSummary["adherentRole"]>,
  string
> = {
  self: "Inscription pour moi",
  minor_dependent: "Mineur dont je suis le représentant légal",
  other_adult: "Autre adulte",
};

export const MES_INSCRIPTION_STATUS_COLOR: Record<
  string,
  "default" | "warning" | "success" | "error"
> = {
  submitted: "warning",
  in_review: "warning",
  payment_requested: "warning",
  paid: "success",
  approved: "success",
  rejected: "error",
};

export const MES_INSCRIPTION_STATUS_LABEL: Record<string, string> = {
  submitted: "En cours d’examen",
  in_review: "En cours de relecture",
  payment_requested: "Paiement demandé",
  paid: "Paiement reçu",
  approved: "Approuvé",
  rejected: "Refusé",
};

export const MES_INSCRIPTION_MEDICAL_COLOR: Record<
  MedicalCertificateStatus,
  "default" | "warning" | "success"
> = {
  not_required: "default",
  required_not_received: "warning",
  received: "warning",
  validated: "success",
};

export function formatMesInscriptionAmount(cents: number | undefined): string | null {
  if (typeof cents !== "number") return null;
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

export function formatMesInscriptionDate(iso: string | null | undefined): string {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return iso;
  }
}

export function findMesInscriptionSectionLabel(id: string | undefined): string {
  if (!id) return "";
  const found = getEnabledSections(getDefaultRegistrationConfig()).find((s) => s.id === id);
  return found?.label ?? id;
}

export function isMesInscriptionPaid(r: MesInscriptionSummary): boolean {
  return (
    r.status === "paid" ||
    r.paymentStatus === "paid" ||
    r.paymentStatus === "complete"
  );
}
