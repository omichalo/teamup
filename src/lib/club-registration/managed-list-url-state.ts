import {
  getManagedListFiltersForSavedView,
  inferManagedListQueueViewId,
  isManagedListQueueViewId,
  resolveManagedListSavedViewId,
  type ManagedListQueueViewId,
} from "@/lib/club-registration/managed-list-saved-views";
import {
  resolveManagedListMedicalCertificateFilter,
  type ManagedListMedicalCertificateFilter,
} from "@/lib/club-registration/medical-certificate";
import {
  resolveManagedListAidReceiptFilter,
  type ManagedListAidReceiptFilter,
} from "@/lib/club-registration/payment/aid-receipt";
import {
  resolveManagedListPpsFollowUpFilter,
  type ManagedListPpsFollowUpFilter,
} from "@/lib/club-registration/pps-follow-up";
import {
  resolveManagedListCriteriumFederalFilter,
  type ManagedListCriteriumFederalFilter,
} from "@/lib/club-registration/criterium-federal-follow-up";
import {
  resolveManagedListJerseyFollowUpFilter,
  type ManagedListJerseyFollowUpFilter,
} from "@/lib/club-registration/jersey-follow-up";
import {
  resolveManagedListPaymentSupplementFilter,
  type ManagedListPaymentSupplementFilter,
} from "@/lib/club-registration/payment/supplement-managed-filter";
import {
  resolveManagedListRegistrationCertificateFollowUpFilter,
  type ManagedListRegistrationCertificateFollowUpFilter,
} from "@/lib/club-registration/registration-certificate-follow-up";
import {
  resolveManagedListStatusFilter,
  type ManagedListStatusFilter,
} from "@/lib/club-registration/registration-status";

export type ManagedListUrlState = {
  queueViewId: ManagedListQueueViewId;
  statusFilter: ManagedListStatusFilter;
  medicalCertificateFilter: ManagedListMedicalCertificateFilter;
  ppsFollowUpFilter: ManagedListPpsFollowUpFilter;
  criteriumFederalFilter: ManagedListCriteriumFederalFilter;
  jerseyFollowUpFilter: ManagedListJerseyFollowUpFilter;
  registrationCertificateFollowUpFilter: ManagedListRegistrationCertificateFollowUpFilter;
  aidReceiptFilter: ManagedListAidReceiptFilter;
  paymentSupplementFilter: ManagedListPaymentSupplementFilter;
  selectedId: string | null;
};

export function parseManagedListUrlState(
  searchParams: Pick<URLSearchParams, "get">
): ManagedListUrlState {
  const vue = searchParams.get("vue");
  const savedViewId = resolveManagedListSavedViewId(vue);
  const viewFilters = savedViewId ? getManagedListFiltersForSavedView(savedViewId) : null;
  const statusParam = searchParams.get("status");
  const certificatParam = searchParams.get("certificat");
  const aidesParam = searchParams.get("aides");

  const statusFilter = statusParam
    ? resolveManagedListStatusFilter(statusParam)
    : (viewFilters?.statusFilter ?? resolveManagedListStatusFilter(null));
  const medicalCertificateFilter = certificatParam
    ? resolveManagedListMedicalCertificateFilter(certificatParam)
    : (viewFilters?.medicalCertificateFilter ?? "all");
  const aidReceiptFilter = aidesParam
    ? resolveManagedListAidReceiptFilter(aidesParam)
    : (viewFilters?.aidReceiptFilter ?? "all");

  return {
    queueViewId: inferManagedListQueueViewId({
      vue,
      statusFilter,
      aidReceiptFilter,
    }),
    statusFilter,
    medicalCertificateFilter,
    ppsFollowUpFilter: resolveManagedListPpsFollowUpFilter(searchParams.get("pps")),
    criteriumFederalFilter: resolveManagedListCriteriumFederalFilter(
      searchParams.get("criterium")
    ),
    jerseyFollowUpFilter: resolveManagedListJerseyFollowUpFilter(
      searchParams.get("maillot")
    ),
    registrationCertificateFollowUpFilter:
      resolveManagedListRegistrationCertificateFollowUpFilter(
        searchParams.get("attestation")
      ),
    aidReceiptFilter,
    paymentSupplementFilter: resolveManagedListPaymentSupplementFilter(
      searchParams.get("complement")
    ),
    selectedId: searchParams.get("id"),
  };
}

export function normalizeManagedListUrlState(input: ManagedListUrlState): ManagedListUrlState {
  const queueViewId = isManagedListQueueViewId(input.queueViewId)
    ? input.queueViewId
    : inferManagedListQueueViewId(input);

  return {
    queueViewId,
    statusFilter: input.statusFilter,
    medicalCertificateFilter: input.medicalCertificateFilter,
    ppsFollowUpFilter: input.ppsFollowUpFilter,
    criteriumFederalFilter: input.criteriumFederalFilter,
    jerseyFollowUpFilter: input.jerseyFollowUpFilter,
    registrationCertificateFollowUpFilter: input.registrationCertificateFollowUpFilter,
    aidReceiptFilter: input.aidReceiptFilter,
    paymentSupplementFilter: input.paymentSupplementFilter,
    selectedId: input.selectedId,
  };
}

export function managedListUrlStatesEqual(
  left: ManagedListUrlState,
  right: ManagedListUrlState
): boolean {
  const normalizedLeft = normalizeManagedListUrlState(left);
  const normalizedRight = normalizeManagedListUrlState(right);

  return (
    normalizedLeft.queueViewId === normalizedRight.queueViewId &&
    normalizedLeft.statusFilter === normalizedRight.statusFilter &&
    normalizedLeft.medicalCertificateFilter ===
      normalizedRight.medicalCertificateFilter &&
    normalizedLeft.ppsFollowUpFilter === normalizedRight.ppsFollowUpFilter &&
    normalizedLeft.criteriumFederalFilter ===
      normalizedRight.criteriumFederalFilter &&
    normalizedLeft.jerseyFollowUpFilter === normalizedRight.jerseyFollowUpFilter &&
    normalizedLeft.registrationCertificateFollowUpFilter ===
      normalizedRight.registrationCertificateFollowUpFilter &&
    normalizedLeft.aidReceiptFilter === normalizedRight.aidReceiptFilter &&
    normalizedLeft.paymentSupplementFilter === normalizedRight.paymentSupplementFilter &&
    (normalizedLeft.selectedId ?? null) === (normalizedRight.selectedId ?? null)
  );
}

export function buildManagedListQueryString(input: ManagedListUrlState): string {
  const state = normalizeManagedListUrlState(input);
  const params = new URLSearchParams();
  const queueDefaults = getManagedListFiltersForSavedView(state.queueViewId);

  params.set("vue", state.queueViewId);

  if (state.statusFilter !== queueDefaults.statusFilter) {
    params.set("status", state.statusFilter);
  }
  if (state.medicalCertificateFilter !== "all") {
    params.set("certificat", state.medicalCertificateFilter);
  }
  if (state.aidReceiptFilter !== queueDefaults.aidReceiptFilter) {
    params.set("aides", state.aidReceiptFilter);
  }

  if (state.ppsFollowUpFilter !== "all") {
    params.set("pps", state.ppsFollowUpFilter);
  }

  if (state.criteriumFederalFilter !== "all") {
    params.set("criterium", state.criteriumFederalFilter);
  }

  if (state.jerseyFollowUpFilter !== "all") {
    params.set("maillot", state.jerseyFollowUpFilter);
  }

  if (state.registrationCertificateFollowUpFilter !== "all") {
    params.set("attestation", state.registrationCertificateFollowUpFilter);
  }

  if (state.paymentSupplementFilter !== "all") {
    params.set("complement", state.paymentSupplementFilter);
  }

  if (state.selectedId) {
    params.set("id", state.selectedId);
  }

  return params.toString();
}

function normalizeQueryEntries(query: string): string[] {
  const params = new URLSearchParams(query);
  return [...params.entries()]
    .sort(([leftKey, leftValue], [rightKey, rightValue]) =>
      leftKey === rightKey
        ? leftValue.localeCompare(rightValue)
        : leftKey.localeCompare(rightKey)
    )
    .map(([key, value]) => `${key}=${value}`);
}

export function managedListQueryStringsEqual(left: string, right: string): boolean {
  if (left === right) {
    return true;
  }
  const leftEntries = normalizeQueryEntries(left);
  const rightEntries = normalizeQueryEntries(right);
  if (leftEntries.length !== rightEntries.length) {
    return false;
  }
  return leftEntries.every((entry, index) => entry === rightEntries[index]);
}

export function buildManagedListPath(
  pathname: string,
  input: ManagedListUrlState
): string {
  const query = buildManagedListQueryString(input);
  return query ? `${pathname}?${query}` : pathname;
}
