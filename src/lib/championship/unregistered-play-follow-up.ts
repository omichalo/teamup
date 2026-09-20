/**
 * Suivi secrétariat des joueurs ayant joué en championnat
 * sans inscription dossier (championnat_equipe / championnat_paris).
 */

export const UNREGISTERED_PLAY_COMPETITIONS = ["equipe", "paris"] as const;

export type UnregisteredPlayCompetition =
  (typeof UNREGISTERED_PLAY_COMPETITIONS)[number];

export const UNREGISTERED_PLAY_PAYMENT_STATUS_VALUES = [
  "not_required",
  "requested",
  "paid",
] as const;

export type UnregisteredPlayPaymentStatus =
  (typeof UNREGISTERED_PLAY_PAYMENT_STATUS_VALUES)[number];

export const UNREGISTERED_PLAY_PAYMENT_STATUS_LABELS: Record<
  UnregisteredPlayPaymentStatus,
  string
> = {
  not_required: "Pas de paiement",
  requested: "Paiement demandé",
  paid: "Payé",
};

export const UNREGISTERED_PLAY_COMPETITION_LABELS: Record<
  UnregisteredPlayCompetition,
  string
> = {
  equipe: "Championnat par équipes",
  paris: "Championnat de Paris",
};

/** Montants indicatifs (alignés sur les options d’inscription). */
export const UNREGISTERED_PLAY_FEE_EUR: Record<
  UnregisteredPlayCompetition,
  number
> = {
  equipe: 25,
  paris: 15,
};

export function isUnregisteredPlayCompetition(
  value: unknown
): value is UnregisteredPlayCompetition {
  return UNREGISTERED_PLAY_COMPETITIONS.includes(
    value as UnregisteredPlayCompetition
  );
}

export function isUnregisteredPlayPaymentStatus(
  value: unknown
): value is UnregisteredPlayPaymentStatus {
  return UNREGISTERED_PLAY_PAYMENT_STATUS_VALUES.includes(
    value as UnregisteredPlayPaymentStatus
  );
}

export function paymentStatusFieldForCompetition(
  competition: UnregisteredPlayCompetition
): "unregisteredEquipePaymentStatus" | "unregisteredParisPaymentStatus" {
  return competition === "equipe"
    ? "unregisteredEquipePaymentStatus"
    : "unregisteredParisPaymentStatus";
}

export function readUnregisteredPlayPaymentStatus(
  value: unknown
): UnregisteredPlayPaymentStatus | null {
  return isUnregisteredPlayPaymentStatus(value) ? value : null;
}

type MatchPhaseMap = {
  aller?: Record<string, number> | undefined;
  retour?: Record<string, number> | undefined;
};

function hasPositiveMatchCount(value: MatchPhaseMap | null | undefined): boolean {
  if (!value) return false;
  for (const phase of [value.aller, value.retour]) {
    if (!phase) continue;
    for (const count of Object.values(phase)) {
      if (typeof count === "number" && count > 0) return true;
    }
  }
  return false;
}

export function hasPlayedTeamChampionship(input: {
  hasPlayedAtLeastOneMatch?: boolean | undefined;
  masculineMatchesByTeamByPhase?: MatchPhaseMap | undefined;
  feminineMatchesByTeamByPhase?: MatchPhaseMap | undefined;
}): boolean {
  return (
    input.hasPlayedAtLeastOneMatch === true ||
    hasPositiveMatchCount(input.masculineMatchesByTeamByPhase) ||
    hasPositiveMatchCount(input.feminineMatchesByTeamByPhase)
  );
}

export function hasPlayedParisChampionship(input: {
  hasPlayedAtLeastOneMatchParis?: boolean | undefined;
  matchesByTeamByPhaseParis?: MatchPhaseMap | undefined;
}): boolean {
  return (
    input.hasPlayedAtLeastOneMatchParis === true ||
    hasPositiveMatchCount(input.matchesByTeamByPhaseParis)
  );
}
