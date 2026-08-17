import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import {
  summaryMedicalCertificateStatus,
  type MedicalCertificateStatus,
} from "@/lib/club-registration/medical-certificate";
import {
  getRegistrationPaymentAids,
  hasPendingAidReceipt,
} from "@/lib/club-registration/payment/aid-receipt";
import {
  ACTIONABLE_REGISTRATION_STATUSES,
  isRegistrationStatus,
  REGISTRATION_STATUS_LABELS,
  REGISTRATION_STATUS_VALUES,
  type RegistrationStatus,
} from "@/lib/club-registration/registration-status";
import {
  PAYMENT_STATUS_LABELS,
  type PaymentStatusId,
} from "@/lib/club-registration/payment-constants";
import { resolveRegistrationPaymentStatus } from "@/lib/club-registration/resolve-registration-payment-status";

export type AidReceiptFilterStatus = "pending";

export type SpreadsheetQuickFilters = {
  registrationStatuses: RegistrationStatus[];
  paymentStatuses: PaymentStatusId[];
  medicalCertificateStatuses: MedicalCertificateStatus[];
  aidReceiptStatuses: AidReceiptFilterStatus[];
};

export const EMPTY_SPREADSHEET_QUICK_FILTERS: SpreadsheetQuickFilters = {
  registrationStatuses: [],
  paymentStatuses: [],
  medicalCertificateStatuses: [],
  aidReceiptStatuses: [],
};

/** Complète les tableaux manquants (état React / vues antérieures au champ aides). */
export function normalizeSpreadsheetQuickFilters(
  filters: Partial<SpreadsheetQuickFilters> | null | undefined
): SpreadsheetQuickFilters {
  return {
    registrationStatuses: [...(filters?.registrationStatuses ?? [])],
    paymentStatuses: [...(filters?.paymentStatuses ?? [])],
    medicalCertificateStatuses: [...(filters?.medicalCertificateStatuses ?? [])],
    aidReceiptStatuses: [...(filters?.aidReceiptStatuses ?? [])],
  };
}

export type SpreadsheetSavedViewId =
  | "all"
  | "to_review"
  | "missing_certificate"
  | "payment_pending"
  | "pending_aid_receipt";

export type SpreadsheetSavedView = {
  id: SpreadsheetSavedViewId;
  label: string;
  quickFilters: SpreadsheetQuickFilters;
};

const PAYMENT_PENDING_STATUSES: PaymentStatusId[] = [
  "pending_validation",
  "waiting_payment",
  "partially_paid",
  "manual_follow_up",
];

export const SPREADSHEET_SAVED_VIEWS: SpreadsheetSavedView[] = [
  {
    id: "all",
    label: "Tous",
    quickFilters: EMPTY_SPREADSHEET_QUICK_FILTERS,
  },
  {
    id: "to_review",
    label: "À valider",
    quickFilters: {
      ...EMPTY_SPREADSHEET_QUICK_FILTERS,
      registrationStatuses: [...ACTIONABLE_REGISTRATION_STATUSES],
    },
  },
  {
    id: "missing_certificate",
    label: "Certificat manquant",
    quickFilters: {
      ...EMPTY_SPREADSHEET_QUICK_FILTERS,
      medicalCertificateStatuses: ["required_not_received"],
    },
  },
  {
    id: "payment_pending",
    label: "Paiement en attente",
    quickFilters: {
      ...EMPTY_SPREADSHEET_QUICK_FILTERS,
      paymentStatuses: [...PAYMENT_PENDING_STATUSES],
    },
  },
  {
    id: "pending_aid_receipt",
    label: "Aides en attente",
    quickFilters: {
      ...EMPTY_SPREADSHEET_QUICK_FILTERS,
      aidReceiptStatuses: ["pending"],
    },
  },
];

const SAVED_VIEW_IDS = new Set<string>(SPREADSHEET_SAVED_VIEWS.map((view) => view.id));

export function isSpreadsheetSavedViewId(value: string): value is SpreadsheetSavedViewId {
  return SAVED_VIEW_IDS.has(value);
}

export function resolveSpreadsheetSavedViewId(
  value: string | null | undefined
): SpreadsheetSavedViewId | null {
  if (!value || !isSpreadsheetSavedViewId(value)) {
    return null;
  }
  return value;
}

export function getSpreadsheetSavedView(
  viewId: SpreadsheetSavedViewId
): SpreadsheetSavedView {
  return (
    SPREADSHEET_SAVED_VIEWS.find((view) => view.id === viewId) ?? SPREADSHEET_SAVED_VIEWS[0]
  );
}

export function getRowRegistrationStatus(
  row: RegistrationClientRecord
): RegistrationStatus | null {
  const status = row.status;
  return typeof status === "string" && isRegistrationStatus(status) ? status : null;
}

export function getRowPaymentStatus(row: RegistrationClientRecord): PaymentStatusId | null {
  return resolveRegistrationPaymentStatus(row);
}

export function getRowMedicalCertificateStatus(
  row: RegistrationClientRecord
): MedicalCertificateStatus {
  return summaryMedicalCertificateStatus(row);
}

export function rowHasPendingAidReceipt(row: RegistrationClientRecord): boolean {
  return hasPendingAidReceipt(getRegistrationPaymentAids(row));
}

export function isQuickFiltersEmpty(quickFilters: SpreadsheetQuickFilters): boolean {
  const normalized = normalizeSpreadsheetQuickFilters(quickFilters);
  return (
    normalized.registrationStatuses.length === 0 &&
    normalized.paymentStatuses.length === 0 &&
    normalized.medicalCertificateStatuses.length === 0 &&
    normalized.aidReceiptStatuses.length === 0
  );
}

export function quickFiltersMatchSavedView(
  quickFilters: SpreadsheetQuickFilters,
  viewId: SpreadsheetSavedViewId
): boolean {
  const view = getSpreadsheetSavedView(viewId);
  const normalized = normalizeSpreadsheetQuickFilters(quickFilters);
  return (
    arraysEqual(normalized.registrationStatuses, view.quickFilters.registrationStatuses) &&
    arraysEqual(normalized.paymentStatuses, view.quickFilters.paymentStatuses) &&
    arraysEqual(
      normalized.medicalCertificateStatuses,
      view.quickFilters.medicalCertificateStatuses
    ) &&
    arraysEqual(normalized.aidReceiptStatuses, view.quickFilters.aidReceiptStatuses)
  );
}

export function resolveActiveSavedViewId(
  quickFilters: SpreadsheetQuickFilters
): SpreadsheetSavedViewId | null {
  if (isQuickFiltersEmpty(quickFilters)) {
    return "all";
  }
  for (const view of SPREADSHEET_SAVED_VIEWS) {
    if (view.id === "all") continue;
    if (quickFiltersMatchSavedView(quickFilters, view.id)) {
      return view.id;
    }
  }
  return null;
}

export function filterSpreadsheetRowsByQuickFilters(
  rows: RegistrationClientRecord[],
  quickFilters: SpreadsheetQuickFilters
): RegistrationClientRecord[] {
  const normalized = normalizeSpreadsheetQuickFilters(quickFilters);
  if (isQuickFiltersEmpty(normalized)) {
    return rows;
  }

  return rows.filter((row) => {
    if (normalized.registrationStatuses.length > 0) {
      const status = getRowRegistrationStatus(row);
      if (!status || !normalized.registrationStatuses.includes(status)) {
        return false;
      }
    }

    if (normalized.paymentStatuses.length > 0) {
      const paymentStatus = getRowPaymentStatus(row);
      if (!paymentStatus || !normalized.paymentStatuses.includes(paymentStatus)) {
        return false;
      }
    }

    if (normalized.medicalCertificateStatuses.length > 0) {
      const medicalStatus = getRowMedicalCertificateStatus(row);
      if (!normalized.medicalCertificateStatuses.includes(medicalStatus)) {
        return false;
      }
    }

    if (normalized.aidReceiptStatuses.includes("pending") && !rowHasPendingAidReceipt(row)) {
      return false;
    }

    return true;
  });
}

export type SpreadsheetSummaryStats = {
  displayedCount: number;
  actionableCount: number;
  missingCertificateCount: number;
  paymentPendingCount: number;
  pendingAidReceiptCount: number;
};

export function computeSpreadsheetSummaryStats(
  rows: RegistrationClientRecord[]
): SpreadsheetSummaryStats {
  let actionableCount = 0;
  let missingCertificateCount = 0;
  let paymentPendingCount = 0;
  let pendingAidReceiptCount = 0;

  for (const row of rows) {
    const registrationStatus = getRowRegistrationStatus(row);
    if (registrationStatus && ACTIONABLE_REGISTRATION_STATUSES.includes(registrationStatus)) {
      actionableCount += 1;
    }

    if (getRowMedicalCertificateStatus(row) === "required_not_received") {
      missingCertificateCount += 1;
    }

    const paymentStatus = getRowPaymentStatus(row);
    if (paymentStatus && PAYMENT_PENDING_STATUSES.includes(paymentStatus)) {
      paymentPendingCount += 1;
    }

    if (rowHasPendingAidReceipt(row)) {
      pendingAidReceiptCount += 1;
    }
  }

  return {
    displayedCount: rows.length,
    actionableCount,
    missingCertificateCount,
    paymentPendingCount,
    pendingAidReceiptCount,
  };
}

export const SPREADSHEET_REGISTRATION_STATUS_CHIP_OPTIONS = REGISTRATION_STATUS_VALUES.map(
  (value) => ({
    value,
    label: REGISTRATION_STATUS_LABELS[value],
  })
);

export const SPREADSHEET_PAYMENT_STATUS_CHIP_OPTIONS = PAYMENT_PENDING_STATUSES.map((value) => ({
  value,
  label: PAYMENT_STATUS_LABELS[value],
}));

export const SPREADSHEET_AID_RECEIPT_CHIP_OPTIONS: {
  value: AidReceiptFilterStatus;
  label: string;
}[] = [{ value: "pending", label: "En attente de réception" }];

function arraysEqual<T>(left: readonly T[], right: readonly T[]): boolean {
  if (left.length !== right.length) return false;
  return left.every((value, index) => value === right[index]);
}
