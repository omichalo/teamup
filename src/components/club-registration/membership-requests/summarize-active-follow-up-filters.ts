import {
  MANAGED_LIST_MEDICAL_CERTIFICATE_FILTER_OPTIONS,
  type ManagedListMedicalCertificateFilter,
} from "@/lib/club-registration/medical-certificate";
import {
  MANAGED_LIST_PPS_FOLLOW_UP_FILTER_OPTIONS,
  type ManagedListPpsFollowUpFilter,
} from "@/lib/club-registration/pps-follow-up";
import {
  MANAGED_LIST_CRITERIUM_FEDERAL_FILTER_OPTIONS,
  type ManagedListCriteriumFederalFilter,
} from "@/lib/club-registration/criterium-federal-follow-up";
import {
  MANAGED_LIST_JERSEY_FOLLOW_UP_FILTER_OPTIONS,
  type ManagedListJerseyFollowUpFilter,
} from "@/lib/club-registration/jersey-follow-up";
import {
  MANAGED_LIST_REGISTRATION_CERTIFICATE_FOLLOW_UP_FILTER_OPTIONS,
  type ManagedListRegistrationCertificateFollowUpFilter,
} from "@/lib/club-registration/registration-certificate-follow-up";

export type ActiveFollowUpFilterId =
  | "certificate"
  | "pps"
  | "criterium"
  | "jersey"
  | "attestation";

export type ActiveFollowUpFilterChip = {
  id: ActiveFollowUpFilterId;
  label: string;
};

type Option = { value: string; label: string };

function chipForDimension(
  id: ActiveFollowUpFilterId,
  dimensionLabel: string,
  options: readonly Option[],
  value: string
): ActiveFollowUpFilterChip | null {
  if (value === "all") {
    return null;
  }
  const option = options.find((entry) => entry.value === value);
  return {
    id,
    label: `${dimensionLabel} · ${option?.label ?? value}`,
  };
}

export function summarizeActiveFollowUpFilters(input: {
  medicalCertificateFilter: ManagedListMedicalCertificateFilter;
  ppsFollowUpFilter: ManagedListPpsFollowUpFilter;
  criteriumFederalFilter: ManagedListCriteriumFederalFilter;
  jerseyFollowUpFilter: ManagedListJerseyFollowUpFilter;
  registrationCertificateFollowUpFilter: ManagedListRegistrationCertificateFollowUpFilter;
}): ActiveFollowUpFilterChip[] {
  return [
    chipForDimension(
      "certificate",
      "Certificat",
      MANAGED_LIST_MEDICAL_CERTIFICATE_FILTER_OPTIONS,
      input.medicalCertificateFilter
    ),
    chipForDimension(
      "pps",
      "PPS",
      MANAGED_LIST_PPS_FOLLOW_UP_FILTER_OPTIONS,
      input.ppsFollowUpFilter
    ),
    chipForDimension(
      "criterium",
      "Critérium",
      MANAGED_LIST_CRITERIUM_FEDERAL_FILTER_OPTIONS,
      input.criteriumFederalFilter
    ),
    chipForDimension(
      "jersey",
      "Maillot",
      MANAGED_LIST_JERSEY_FOLLOW_UP_FILTER_OPTIONS,
      input.jerseyFollowUpFilter
    ),
    chipForDimension(
      "attestation",
      "Attestation",
      MANAGED_LIST_REGISTRATION_CERTIFICATE_FOLLOW_UP_FILTER_OPTIONS,
      input.registrationCertificateFollowUpFilter
    ),
  ].filter((chip): chip is ActiveFollowUpFilterChip => chip != null);
}
