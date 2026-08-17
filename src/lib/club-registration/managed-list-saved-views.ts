import type { ManagedListMedicalCertificateFilter } from "@/lib/club-registration/medical-certificate";
import type { ManagedListAidReceiptFilter } from "@/lib/club-registration/payment/aid-receipt";
import type { ManagedListStatusFilter } from "@/lib/club-registration/registration-status";
import {
  SPREADSHEET_SAVED_VIEWS,
  type SpreadsheetSavedViewId,
  isSpreadsheetSavedViewId,
} from "@/lib/club-registration/spreadsheet/quick-filters";

export type ManagedListSavedViewFilters = {
  statusFilter: ManagedListStatusFilter;
  medicalCertificateFilter: ManagedListMedicalCertificateFilter;
  aidReceiptFilter: ManagedListAidReceiptFilter;
};

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
