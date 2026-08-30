/**
 * Suivi secrétariat de la remise du maillot à l’adhérent.
 * Distinct de la commande (options compétiteur / maillot optionnel).
 */

export const JERSEY_FOLLOW_UP_STATUS_VALUES = [
  "not_applicable",
  "to_do",
  "prepared_awaiting_payment",
  "given",
] as const;

export type JerseyFollowUpStatus = (typeof JERSEY_FOLLOW_UP_STATUS_VALUES)[number];

export const JERSEY_FOLLOW_UP_STATUS_LABELS: Record<JerseyFollowUpStatus, string> = {
  not_applicable: "Non applicable",
  to_do: "À faire",
  prepared_awaiting_payment: "Préparé - attente paiement",
  given: "Donné",
};

export function isJerseyRequested(
  wantsCompetitorExtras: unknown,
  wantsOptionalJersey: unknown
): boolean {
  return wantsCompetitorExtras === true || wantsOptionalJersey === true;
}

export function isJerseyFollowUpStatus(value: unknown): value is JerseyFollowUpStatus {
  return JERSEY_FOLLOW_UP_STATUS_VALUES.includes(value as JerseyFollowUpStatus);
}

export function initialJerseyFollowUpStatus(
  wantsCompetitorExtras: unknown,
  wantsOptionalJersey: unknown
): JerseyFollowUpStatus {
  return isJerseyRequested(wantsCompetitorExtras, wantsOptionalJersey)
    ? "to_do"
    : "not_applicable";
}

export function normalizeJerseyFollowUpStatus(
  status: unknown,
  wantsCompetitorExtras: unknown,
  wantsOptionalJersey: unknown
): JerseyFollowUpStatus {
  if (!isJerseyRequested(wantsCompetitorExtras, wantsOptionalJersey)) {
    return "not_applicable";
  }
  if (isJerseyFollowUpStatus(status) && status !== "not_applicable") {
    return status;
  }
  return "to_do";
}

export function resolveJerseyFollowUpStatusForPatch(params: {
  wantsCompetitorExtras: unknown;
  wantsOptionalJersey: unknown;
  currentStatus: unknown;
  requestedStatus: unknown;
}): JerseyFollowUpStatus {
  const requested =
    params.requestedStatus === undefined
      ? params.currentStatus
      : params.requestedStatus;
  return normalizeJerseyFollowUpStatus(
    requested,
    params.wantsCompetitorExtras,
    params.wantsOptionalJersey
  );
}

export type ManagedListJerseyFollowUpFilter =
  | "all"
  | Exclude<JerseyFollowUpStatus, "not_applicable">;

export const MANAGED_LIST_JERSEY_FOLLOW_UP_FILTER_OPTIONS: {
  value: ManagedListJerseyFollowUpFilter;
  label: string;
  hint?: string;
}[] = [
  { value: "all", label: "Tous" },
  {
    value: "to_do",
    label: "À faire",
    hint: "Maillot commandé, pas encore remis à l’adhérent.",
  },
  {
    value: "prepared_awaiting_payment",
    label: "Préparé - attente paiement",
    hint: "Maillot préparé, en attente du paiement de l’adhérent.",
  },
  {
    value: "given",
    label: "Donné",
    hint: "Maillot remis à l’adhérent.",
  },
];

export const JERSEY_FOLLOW_UP_CARD_LABELS: Record<
  Exclude<JerseyFollowUpStatus, "not_applicable">,
  string
> = {
  to_do: "Maillot à donner",
  prepared_awaiting_payment: "Maillot préparé — attente paiement",
  given: "Maillot donné",
};

export function resolveManagedListJerseyFollowUpFilter(
  value: string | null | undefined
): ManagedListJerseyFollowUpFilter {
  if (!value || value === "all") {
    return "all";
  }
  if (
    value === "to_do" ||
    value === "prepared_awaiting_payment" ||
    value === "given"
  ) {
    return value;
  }
  return "all";
}

export function summaryJerseyFollowUpStatus(
  summary: Record<string, unknown>
): JerseyFollowUpStatus {
  return normalizeJerseyFollowUpStatus(
    summary.jerseyFollowUpStatus,
    summary.wantsCompetitorExtras,
    summary.wantsOptionalJersey
  );
}

export function matchesJerseyFollowUpFilter(
  summary: Record<string, unknown>,
  filter: ManagedListJerseyFollowUpFilter
): boolean {
  if (filter === "all") {
    return true;
  }
  return summaryJerseyFollowUpStatus(summary) === filter;
}
