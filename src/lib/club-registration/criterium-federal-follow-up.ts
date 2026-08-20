import { COMPETITIONS_JEUNES_ID } from "@/lib/club-registration/competition-ids";

/**
 * Suivi secrétariat de l’inscription FFTT au Critérium fédéral.
 * Distinct de l’option cochée par l’adhérent (`competitionIds`).
 */

export const CRITERIUM_FEDERAL_REGISTRATION_STATUS_VALUES = [
  "not_applicable",
  "to_do",
  "validated",
] as const;

export type CriteriumFederalRegistrationStatus =
  (typeof CRITERIUM_FEDERAL_REGISTRATION_STATUS_VALUES)[number];

export const CRITERIUM_FEDERAL_REGISTRATION_STATUS_LABELS: Record<
  CriteriumFederalRegistrationStatus,
  string
> = {
  not_applicable: "Non applicable",
  to_do: "À faire",
  validated: "Validé",
};

const CRITERIUM_FEDERAL_ID_PREFIX = "criterium_federal_";

export function isCriteriumFederalCompetitionId(id: string): boolean {
  return (
    id === COMPETITIONS_JEUNES_ID ||
    id.startsWith(CRITERIUM_FEDERAL_ID_PREFIX)
  );
}

export function hasCriteriumFederalSelection(
  competitionIds: readonly string[] | null | undefined
): boolean {
  if (!competitionIds || competitionIds.length === 0) {
    return false;
  }
  return competitionIds.some(
    (id) => typeof id === "string" && isCriteriumFederalCompetitionId(id)
  );
}

export function isCriteriumFederalRegistrationStatus(
  value: unknown
): value is CriteriumFederalRegistrationStatus {
  return CRITERIUM_FEDERAL_REGISTRATION_STATUS_VALUES.includes(
    value as CriteriumFederalRegistrationStatus
  );
}

function readCompetitionIds(value: unknown): string[] {
  if (!Array.isArray(value)) {
    return [];
  }
  return value.filter((id): id is string => typeof id === "string" && id.length > 0);
}

export function initialCriteriumFederalRegistrationStatus(
  competitionIds: readonly string[] | null | undefined
): CriteriumFederalRegistrationStatus {
  return hasCriteriumFederalSelection(competitionIds) ? "to_do" : "not_applicable";
}

export function normalizeCriteriumFederalRegistrationStatus(
  status: unknown,
  competitionIds: readonly string[] | null | undefined
): CriteriumFederalRegistrationStatus {
  if (!hasCriteriumFederalSelection(competitionIds)) {
    return "not_applicable";
  }
  if (
    isCriteriumFederalRegistrationStatus(status) &&
    status !== "not_applicable"
  ) {
    return status;
  }
  return "to_do";
}

export function resolveCriteriumFederalRegistrationStatusForPatch(params: {
  competitionIds: unknown;
  currentStatus: unknown;
  requestedStatus: unknown;
}): CriteriumFederalRegistrationStatus {
  const requested =
    params.requestedStatus === undefined
      ? params.currentStatus
      : params.requestedStatus;
  return normalizeCriteriumFederalRegistrationStatus(
    requested,
    readCompetitionIds(params.competitionIds)
  );
}

export type ManagedListCriteriumFederalFilter =
  | "all"
  | Exclude<CriteriumFederalRegistrationStatus, "not_applicable">;

export const MANAGED_LIST_CRITERIUM_FEDERAL_FILTER_OPTIONS: {
  value: ManagedListCriteriumFederalFilter;
  label: string;
  hint?: string;
}[] = [
  { value: "all", label: "Tous" },
  {
    value: "to_do",
    label: "À faire",
    hint: "Critérium fédéral demandé, inscription FFTT pas encore faite.",
  },
  {
    value: "validated",
    label: "Validé",
    hint: "Inscription au Critérium fédéral faite sur l’espace FFTT.",
  },
];

export const CRITERIUM_FEDERAL_CARD_LABELS: Record<
  Exclude<CriteriumFederalRegistrationStatus, "not_applicable">,
  string
> = {
  to_do: "Critérium à faire",
  validated: "Critérium validé",
};

export function resolveManagedListCriteriumFederalFilter(
  value: string | null | undefined
): ManagedListCriteriumFederalFilter {
  if (!value || value === "all") {
    return "all";
  }
  if (value === "to_do" || value === "validated") {
    return value;
  }
  return "all";
}

export function summaryCriteriumFederalRegistrationStatus(
  summary: Record<string, unknown>
): CriteriumFederalRegistrationStatus {
  return normalizeCriteriumFederalRegistrationStatus(
    summary.criteriumFederalRegistrationStatus,
    readCompetitionIds(summary.competitionIds)
  );
}

export function matchesCriteriumFederalFilter(
  summary: Record<string, unknown>,
  filter: ManagedListCriteriumFederalFilter
): boolean {
  if (filter === "all") {
    return true;
  }
  return summaryCriteriumFederalRegistrationStatus(summary) === filter;
}
