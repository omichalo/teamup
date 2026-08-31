import {
  matchesMedicalCertificateFilter,
  type ManagedListMedicalCertificateFilter,
} from "@/lib/club-registration/medical-certificate";
import {
  matchesPpsFollowUpFilter,
  normalizePpsFollowUpStatus,
  type ManagedListPpsFollowUpFilter,
} from "@/lib/club-registration/pps-follow-up";
import {
  matchesCriteriumFederalFilter,
  type ManagedListCriteriumFederalFilter,
} from "@/lib/club-registration/criterium-federal-follow-up";
import {
  matchesJerseyFollowUpFilter,
  type ManagedListJerseyFollowUpFilter,
} from "@/lib/club-registration/jersey-follow-up";
import {
  matchesRegistrationCertificateFollowUpFilter,
  type ManagedListRegistrationCertificateFollowUpFilter,
} from "@/lib/club-registration/registration-certificate-follow-up";
import {
  matchesManagedAidReceiptFilter,
  type ManagedListAidReceiptFilter,
} from "@/lib/club-registration/payment/aid-receipt";
import {
  matchesPaymentSupplementFilter,
  type ManagedListPaymentSupplementFilter,
} from "@/lib/club-registration/payment/supplement-managed-filter";
import {
  ACTIONABLE_REGISTRATION_STATUSES,
  type ManagedListStatusFilter,
} from "@/lib/club-registration/registration-status";

type ManagedListSummary = Record<string, unknown> & { id: string };

export type ListManagedRegistrationsParams = {
  statusFilter: ManagedListStatusFilter;
  medicalCertificateFilter?: ManagedListMedicalCertificateFilter;
  ppsFollowUpFilter?: ManagedListPpsFollowUpFilter;
  criteriumFederalFilter?: ManagedListCriteriumFederalFilter;
  jerseyFollowUpFilter?: ManagedListJerseyFollowUpFilter;
  registrationCertificateFollowUpFilter?: ManagedListRegistrationCertificateFollowUpFilter;
  aidReceiptFilter?: ManagedListAidReceiptFilter;
  paymentSupplementFilter?: ManagedListPaymentSupplementFilter;
  pageSize: number;
  cursor?: string | null;
  searchQuery?: string | null;
};

export function registrationMatchesSearch(
  summary: ManagedListSummary,
  rawQuery: string
): boolean {
  const q = rawQuery.trim().toLowerCase();
  if (q.length < 2) {
    return true;
  }
  const haystack = [
    summary.firstName,
    summary.lastName,
    summary.adherentEmail,
    summary.submitterAccountEmail,
  ]
    .filter((value): value is string => typeof value === "string" && value.length > 0)
    .join(" ")
    .toLowerCase();
  const tokens = q.split(/\s+/).filter(Boolean);
  return tokens.every((token) => haystack.includes(token));
}

export function matchesManagedStatusFilter(
  summary: ManagedListSummary,
  statusFilter: ManagedListStatusFilter
): boolean {
  if (statusFilter === "all") {
    return true;
  }
  const status = typeof summary.status === "string" ? summary.status : "";
  if (statusFilter === "actionable") {
    return (ACTIONABLE_REGISTRATION_STATUSES as readonly string[]).includes(status);
  }
  return status === statusFilter;
}

export function needsClientSideFiltering(params: ListManagedRegistrationsParams): boolean {
  const searchQuery = params.searchQuery?.trim() ?? "";
  return (
    searchQuery.length >= 2 ||
    (params.medicalCertificateFilter ?? "all") !== "all" ||
    (params.ppsFollowUpFilter ?? "all") !== "all" ||
    (params.criteriumFederalFilter ?? "all") !== "all" ||
    (params.jerseyFollowUpFilter ?? "all") !== "all" ||
    (params.registrationCertificateFollowUpFilter ?? "all") !== "all" ||
    (params.aidReceiptFilter ?? "all") !== "all" ||
    (params.paymentSupplementFilter ?? "all") !== "all"
  );
}

export function filterManagedSummaries(
  summaries: ManagedListSummary[],
  params: ListManagedRegistrationsParams & { searchQuery: string }
): ManagedListSummary[] {
  const medicalFilter = params.medicalCertificateFilter ?? "all";
  const ppsFilter = params.ppsFollowUpFilter ?? "all";
  const criteriumFilter = params.criteriumFederalFilter ?? "all";
  const jerseyFilter = params.jerseyFollowUpFilter ?? "all";
  const attestationFilter = params.registrationCertificateFollowUpFilter ?? "all";
  const aidReceiptFilter = params.aidReceiptFilter ?? "all";
  const paymentSupplementFilter = params.paymentSupplementFilter ?? "all";
  return summaries.filter((summary) => {
    const declaration =
      typeof summary.medicalCertificateDeclaration === "string"
        ? summary.medicalCertificateDeclaration
        : undefined;
    const ppsStatus = normalizePpsFollowUpStatus(
      summary.ppsFollowUpStatus,
      declaration,
      typeof summary.birthDate === "string" ? summary.birthDate : undefined
    );
    return (
      matchesManagedStatusFilter(summary, params.statusFilter) &&
      matchesMedicalCertificateFilter(summary, medicalFilter) &&
      matchesPpsFollowUpFilter(ppsStatus, ppsFilter) &&
      matchesCriteriumFederalFilter(summary, criteriumFilter) &&
      matchesJerseyFollowUpFilter(summary, jerseyFilter) &&
      matchesRegistrationCertificateFollowUpFilter(summary, attestationFilter) &&
      matchesManagedAidReceiptFilter(summary, aidReceiptFilter) &&
      matchesPaymentSupplementFilter(summary, paymentSupplementFilter) &&
      registrationMatchesSearch(summary, params.searchQuery)
    );
  });
}
