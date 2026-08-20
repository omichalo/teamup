import {
  getManagedListFiltersForSavedView,
  resolveManagedListSavedViewFromFilters,
  resolveManagedListSavedViewId,
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
  resolveManagedListRegistrationCertificateFollowUpFilter,
  type ManagedListRegistrationCertificateFollowUpFilter,
} from "@/lib/club-registration/registration-certificate-follow-up";
import {
  resolveManagedListStatusFilter,
  type ManagedListStatusFilter,
} from "@/lib/club-registration/registration-status";

export type ManagedListUrlState = {
  statusFilter: ManagedListStatusFilter;
  medicalCertificateFilter: ManagedListMedicalCertificateFilter;
  ppsFollowUpFilter: ManagedListPpsFollowUpFilter;
  criteriumFederalFilter: ManagedListCriteriumFederalFilter;
  jerseyFollowUpFilter: ManagedListJerseyFollowUpFilter;
  registrationCertificateFollowUpFilter: ManagedListRegistrationCertificateFollowUpFilter;
  aidReceiptFilter: ManagedListAidReceiptFilter;
  selectedId: string | null;
};

function resolveSavedViewIdFromState(input: ManagedListUrlState) {
  return resolveManagedListSavedViewFromFilters(
    input.statusFilter,
    input.medicalCertificateFilter,
    input.aidReceiptFilter
  );
}

export function parseManagedListUrlState(
  searchParams: Pick<URLSearchParams, "get">
): ManagedListUrlState {
  const ppsFollowUpFilter = resolveManagedListPpsFollowUpFilter(
    searchParams.get("pps")
  );
  const criteriumFederalFilter = resolveManagedListCriteriumFederalFilter(
    searchParams.get("criterium")
  );
  const jerseyFollowUpFilter = resolveManagedListJerseyFollowUpFilter(
    searchParams.get("maillot")
  );
  const registrationCertificateFollowUpFilter =
    resolveManagedListRegistrationCertificateFollowUpFilter(
      searchParams.get("attestation")
    );
  const savedViewId = resolveManagedListSavedViewId(searchParams.get("vue"));
  if (savedViewId) {
    const filters = getManagedListFiltersForSavedView(savedViewId);
    return {
      statusFilter: filters.statusFilter,
      medicalCertificateFilter: filters.medicalCertificateFilter,
      ppsFollowUpFilter,
      criteriumFederalFilter,
      jerseyFollowUpFilter,
      registrationCertificateFollowUpFilter,
      aidReceiptFilter: filters.aidReceiptFilter,
      selectedId: searchParams.get("id"),
    };
  }

  const statusFilter = resolveManagedListStatusFilter(searchParams.get("status"));
  const medicalCertificateFilter = resolveManagedListMedicalCertificateFilter(
    searchParams.get("certificat")
  );

  return {
    statusFilter,
    medicalCertificateFilter,
    ppsFollowUpFilter,
    criteriumFederalFilter,
    jerseyFollowUpFilter,
    registrationCertificateFollowUpFilter,
    aidReceiptFilter: resolveManagedListAidReceiptFilter(searchParams.get("aides")),
    selectedId: searchParams.get("id"),
  };
}

export function normalizeManagedListUrlState(input: ManagedListUrlState): ManagedListUrlState {
  const matchedViewId = resolveSavedViewIdFromState(input);

  if (matchedViewId) {
    const filters = getManagedListFiltersForSavedView(matchedViewId);
    return {
      statusFilter: filters.statusFilter,
      medicalCertificateFilter: filters.medicalCertificateFilter,
      ppsFollowUpFilter: input.ppsFollowUpFilter,
      criteriumFederalFilter: input.criteriumFederalFilter,
      jerseyFollowUpFilter: input.jerseyFollowUpFilter,
      registrationCertificateFollowUpFilter: input.registrationCertificateFollowUpFilter,
      aidReceiptFilter: filters.aidReceiptFilter,
      selectedId: input.selectedId,
    };
  }

  return {
    statusFilter: input.statusFilter,
    medicalCertificateFilter: input.medicalCertificateFilter,
    ppsFollowUpFilter: input.ppsFollowUpFilter,
    criteriumFederalFilter: input.criteriumFederalFilter,
    jerseyFollowUpFilter: input.jerseyFollowUpFilter,
    registrationCertificateFollowUpFilter: input.registrationCertificateFollowUpFilter,
    aidReceiptFilter: input.aidReceiptFilter,
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
    (normalizedLeft.selectedId ?? null) === (normalizedRight.selectedId ?? null)
  );
}

export function buildManagedListQueryString(input: ManagedListUrlState): string {
  const params = new URLSearchParams();
  const matchedViewId = resolveSavedViewIdFromState(input);

  if (matchedViewId) {
    params.set("vue", matchedViewId);
  } else {
    params.set("status", input.statusFilter);
    if (input.medicalCertificateFilter !== "all") {
      params.set("certificat", input.medicalCertificateFilter);
    }
    if (input.aidReceiptFilter !== "all") {
      params.set("aides", input.aidReceiptFilter);
    }
  }

  if (input.ppsFollowUpFilter !== "all") {
    params.set("pps", input.ppsFollowUpFilter);
  }

  if (input.criteriumFederalFilter !== "all") {
    params.set("criterium", input.criteriumFederalFilter);
  }

  if (input.jerseyFollowUpFilter !== "all") {
    params.set("maillot", input.jerseyFollowUpFilter);
  }

  if (input.registrationCertificateFollowUpFilter !== "all") {
    params.set("attestation", input.registrationCertificateFollowUpFilter);
  }

  if (input.selectedId) {
    params.set("id", input.selectedId);
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
