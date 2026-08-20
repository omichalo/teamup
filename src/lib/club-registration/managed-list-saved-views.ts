import type { ManagedListMedicalCertificateFilter } from "@/lib/club-registration/medical-certificate";
import type { ManagedListAidReceiptFilter } from "@/lib/club-registration/payment/aid-receipt";
import {
  REGISTRATION_STATUS_LABELS,
  type ManagedListStatusFilter,
  type RegistrationStatus,
} from "@/lib/club-registration/registration-status";
import {
  SPREADSHEET_SAVED_VIEWS,
  type SpreadsheetSavedViewId,
  isSpreadsheetSavedViewId,
} from "@/lib/club-registration/spreadsheet/quick-filters";

export type ManagedListQueueViewId =
  | "to_review"
  | "payment_pending"
  | "pending_aid_receipt"
  | "all";

export type ManagedListQueueView = {
  id: ManagedListQueueViewId;
  label: string;
};

export type ManagedListPipelineTab = {
  value: RegistrationStatus;
  label: string;
};

/** Files de travail (écran dossiers à valider) — hors « Certificat manquant », déjà dans Suivis. */
export const MANAGED_LIST_QUEUE_VIEWS: readonly ManagedListQueueView[] = [
  { id: "to_review", label: "À traiter" },
  { id: "payment_pending", label: "Paiement" },
  { id: "pending_aid_receipt", label: "Aides en attente" },
  { id: "all", label: "Tous" },
];

const TREAT_QUEUE_PIPELINE_STATUSES: RegistrationStatus[] = [
  "submitted",
  "in_review",
  "payment_requested",
];

const FULL_PIPELINE_TABS: readonly ManagedListPipelineTab[] = [
  { value: "submitted", label: REGISTRATION_STATUS_LABELS.submitted },
  { value: "in_review", label: REGISTRATION_STATUS_LABELS.in_review },
  { value: "payment_requested", label: REGISTRATION_STATUS_LABELS.payment_requested },
  { value: "paid", label: REGISTRATION_STATUS_LABELS.paid },
  { value: "approved", label: REGISTRATION_STATUS_LABELS.approved },
  { value: "rejected", label: REGISTRATION_STATUS_LABELS.rejected },
];

export type ManagedListQueueViewCounts = Partial<Record<ManagedListQueueViewId, number>>;

export type ManagedListSavedViewFilters = {
  statusFilter: ManagedListStatusFilter;
  medicalCertificateFilter: ManagedListMedicalCertificateFilter;
  aidReceiptFilter: ManagedListAidReceiptFilter;
};

export function isManagedListQueueViewId(
  value: string | null | undefined
): value is ManagedListQueueViewId {
  return MANAGED_LIST_QUEUE_VIEWS.some((view) => view.id === value);
}

export function getManagedListPipelineTabs(
  queueViewId: ManagedListQueueViewId
): readonly ManagedListPipelineTab[] {
  if (queueViewId === "payment_pending") {
    return [];
  }
  if (queueViewId === "to_review") {
    return FULL_PIPELINE_TABS.filter((tab) =>
      TREAT_QUEUE_PIPELINE_STATUSES.includes(tab.value)
    );
  }
  return FULL_PIPELINE_TABS;
}

export function inferManagedListQueueViewId(input: {
  vue?: string | null | undefined;
  statusFilter: ManagedListStatusFilter;
  aidReceiptFilter: ManagedListAidReceiptFilter;
}): ManagedListQueueViewId {
  if (isManagedListQueueViewId(input.vue)) {
    return input.vue;
  }
  if (input.vue === "missing_certificate") {
    return "to_review";
  }
  if (input.aidReceiptFilter === "pending") {
    return "pending_aid_receipt";
  }
  if (
    input.statusFilter === "actionable" ||
    input.statusFilter === "submitted" ||
    input.statusFilter === "in_review"
  ) {
    return "to_review";
  }
  if (input.statusFilter === "payment_requested") {
    return "payment_pending";
  }
  return "all";
}

const MANAGED_LIST_SAVED_VIEW_FILTERS: Record<
  SpreadsheetSavedViewId,
  ManagedListSavedViewFilters
> = {
  all: { statusFilter: "all", medicalCertificateFilter: "all", aidReceiptFilter: "all" },
  to_review: {
    statusFilter: "actionable",
    medicalCertificateFilter: "all",
    aidReceiptFilter: "all",
  },
  missing_certificate: {
    statusFilter: "actionable",
    medicalCertificateFilter: "required_not_received",
    aidReceiptFilter: "all",
  },
  payment_pending: {
    statusFilter: "payment_requested",
    medicalCertificateFilter: "all",
    aidReceiptFilter: "all",
  },
  pending_aid_receipt: {
    statusFilter: "all",
    medicalCertificateFilter: "all",
    aidReceiptFilter: "pending",
  },
};

export function resolveManagedListSavedViewId(
  value: string | null | undefined
): SpreadsheetSavedViewId | null {
  if (!value || !isSpreadsheetSavedViewId(value)) {
    return null;
  }
  return value;
}

export function getManagedListFiltersForSavedView(
  viewId: SpreadsheetSavedViewId
): ManagedListSavedViewFilters {
  return MANAGED_LIST_SAVED_VIEW_FILTERS[viewId];
}

export function resolveManagedListSavedViewFromFilters(
  statusFilter: ManagedListStatusFilter,
  medicalCertificateFilter: ManagedListMedicalCertificateFilter,
  aidReceiptFilter: ManagedListAidReceiptFilter = "all"
): SpreadsheetSavedViewId | null {
  for (const view of SPREADSHEET_SAVED_VIEWS) {
    const filters = MANAGED_LIST_SAVED_VIEW_FILTERS[view.id];
    if (
      filters.statusFilter === statusFilter &&
      filters.medicalCertificateFilter === medicalCertificateFilter &&
      filters.aidReceiptFilter === aidReceiptFilter
    ) {
      return view.id;
    }
  }
  return null;
}

export function resolveManagedListQueueViewFromFilters(
  statusFilter: ManagedListStatusFilter,
  medicalCertificateFilter: ManagedListMedicalCertificateFilter,
  aidReceiptFilter: ManagedListAidReceiptFilter = "all"
): ManagedListQueueViewId | null {
  const viewId = resolveManagedListSavedViewFromFilters(
    statusFilter,
    medicalCertificateFilter,
    aidReceiptFilter
  );
  return isManagedListQueueViewId(viewId) ? viewId : null;
}
