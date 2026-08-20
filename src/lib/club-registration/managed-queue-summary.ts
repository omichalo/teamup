import { summaryMedicalCertificateStatus } from "@/lib/club-registration/medical-certificate";
import {
  getRegistrationPaymentAids,
  hasPendingAidReceipt,
} from "@/lib/club-registration/payment/aid-receipt";
import { matchesManagedStatusFilter } from "@/lib/club-registration/filter-managed-summaries";
import type { ManagedListQueueViewCounts, ManagedListQueueViewId } from "@/lib/club-registration/managed-list-saved-views";
import {
  isRegistrationStatus,
  type RegistrationStatus,
} from "@/lib/club-registration/registration-status";

export type ManagedQueueStatusCounts = Record<RegistrationStatus, number>;

export type ManagedQueueSummary = {
  total: number;
  actionable: number;
  missingCertificate: number;
  paymentPending: number;
  paymentRequested: number;
  pendingAidReceipt: number;
  byStatus: ManagedQueueStatusCounts;
  byStatusPendingAid: ManagedQueueStatusCounts;
  truncated: boolean;
};

const PAYMENT_PENDING_STATUSES = new Set<string>([
  "pending_validation",
  "waiting_payment",
  "partially_paid",
  "manual_follow_up",
]);

export function emptyManagedQueueStatusCounts(): ManagedQueueStatusCounts {
  return {
    submitted: 0,
    in_review: 0,
    payment_requested: 0,
    paid: 0,
    approved: 0,
    rejected: 0,
  };
}

export function summarizeManagedQueue(
  summaries: Array<Record<string, unknown> & { id: string }>,
  scanLimit: number
): ManagedQueueSummary {
  let actionable = 0;
  let missingCertificate = 0;
  let paymentPending = 0;
  let paymentRequested = 0;
  let pendingAidReceipt = 0;
  const byStatus = emptyManagedQueueStatusCounts();
  const byStatusPendingAid = emptyManagedQueueStatusCounts();

  for (const summary of summaries) {
    const status = summary.status;
    const pendingAid = hasPendingAidReceipt(getRegistrationPaymentAids(summary));
    if (typeof status === "string" && isRegistrationStatus(status)) {
      byStatus[status] += 1;
      if (pendingAid) {
        byStatusPendingAid[status] += 1;
      }
    }
    if (matchesManagedStatusFilter(summary, "actionable")) {
      actionable += 1;
    }
    if (matchesManagedStatusFilter(summary, "payment_requested")) {
      paymentRequested += 1;
    }
    if (summaryMedicalCertificateStatus(summary) === "required_not_received") {
      missingCertificate += 1;
    }
    const paymentStatus = summary.paymentStatus;
    if (typeof paymentStatus === "string" && PAYMENT_PENDING_STATUSES.has(paymentStatus)) {
      paymentPending += 1;
    }
    if (pendingAid) {
      pendingAidReceipt += 1;
    }
  }

  return {
    total: summaries.length,
    actionable,
    missingCertificate,
    paymentPending,
    paymentRequested,
    pendingAidReceipt,
    byStatus,
    byStatusPendingAid,
    truncated: summaries.length >= scanLimit,
  };
}

export function getManagedListQueueViewCounts(
  summary: ManagedQueueSummary
): ManagedListQueueViewCounts {
  return {
    to_review: summary.actionable,
    payment_pending: summary.paymentRequested,
    pending_aid_receipt: summary.pendingAidReceipt,
    all: summary.total,
  };
}

export function getManagedListPipelineTabCounts(
  summary: ManagedQueueSummary,
  queueViewId: ManagedListQueueViewId
): Partial<Record<RegistrationStatus, number>> {
  if (queueViewId === "pending_aid_receipt") {
    return summary.byStatusPendingAid;
  }
  return summary.byStatus;
}

export function buildManagedTreatQueueHref(registrationId?: string | null): string {
  const url = new URL("/club/demandes-adhesion", "http://local");
  url.searchParams.set("status", "actionable");
  if (registrationId) {
    url.searchParams.set("id", registrationId);
  }
  return `${url.pathname}${url.search}`;
}

export function buildSpreadsheetHref(options?: {
  registrationId?: string | null;
  searchQuery?: string | null;
  viewId?: string | null;
}): string {
  const url = new URL("/club/adhesions-tableau", "http://local");
  if (options?.viewId) {
    url.searchParams.set("vue", options.viewId);
  }
  if (options?.searchQuery?.trim()) {
    url.searchParams.set("q", options.searchQuery.trim());
  }
  if (options?.registrationId) {
    url.searchParams.set("dossier", options.registrationId);
  }
  return `${url.pathname}${url.search}`;
}

export function formatManagedQueueSummarySubtitle(summary: ManagedQueueSummary): string {
  const parts = [`${summary.actionable} dossier${summary.actionable > 1 ? "s" : ""} à traiter`];
  if (summary.pendingAidReceipt > 0) {
    parts.push(
      `${summary.pendingAidReceipt} aide${summary.pendingAidReceipt > 1 ? "s" : ""} en attente`
    );
  }
  if (summary.paymentRequested > 0) {
    parts.push(
      `${summary.paymentRequested} paiement${summary.paymentRequested > 1 ? "s" : ""} demandé${summary.paymentRequested > 1 ? "s" : ""}`
    );
  }
  if (summary.truncated) {
    parts.push("(comptage partiel)");
  }
  return parts.join(" · ");
}

/** Sous-titre de la page « Dossiers à valider » — les compteurs sont sur les files. */
export function formatManagedRequestsPageSubtitle(summary: ManagedQueueSummary): string {
  if (summary.truncated) {
    return "Relisez les dossiers, puis suivez les paiements et les aides. Comptage partiel.";
  }
  return "Relisez les dossiers, puis suivez les paiements et les aides.";
}
