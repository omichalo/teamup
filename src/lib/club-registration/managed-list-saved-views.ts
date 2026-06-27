import type { ManagedListMedicalCertificateFilter } from "@/lib/club-registration/medical-certificate";
import type { ManagedListStatusFilter } from "@/lib/club-registration/registration-status";
import {
  SPREADSHEET_SAVED_VIEWS,
  type SpreadsheetSavedViewId,
  isSpreadsheetSavedViewId,
} from "@/lib/club-registration/spreadsheet/quick-filters";

export type ManagedListSavedViewFilters = {
  statusFilter: ManagedListStatusFilter;
  medicalCertificateFilter: ManagedListMedicalCertificateFilter;
};

const MANAGED_LIST_SAVED_VIEW_FILTERS: Record<
  SpreadsheetSavedViewId,
  ManagedListSavedViewFilters
> = {
  all: { statusFilter: "all", medicalCertificateFilter: "all" },
  to_review: { statusFilter: "actionable", medicalCertificateFilter: "all" },
  missing_certificate: {
    statusFilter: "actionable",
    medicalCertificateFilter: "required_not_received",
  },
  payment_pending: { statusFilter: "payment_requested", medicalCertificateFilter: "all" },
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
  medicalCertificateFilter: ManagedListMedicalCertificateFilter
): SpreadsheetSavedViewId | null {
  for (const view of SPREADSHEET_SAVED_VIEWS) {
    const filters = MANAGED_LIST_SAVED_VIEW_FILTERS[view.id];
    if (
      filters.statusFilter === statusFilter &&
      filters.medicalCertificateFilter === medicalCertificateFilter
    ) {
      return view.id;
    }
  }
  return null;
}
