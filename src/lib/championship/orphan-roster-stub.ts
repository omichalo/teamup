import type { ChampionshipPlayerRecord } from "./records";

/**
 * Fiche effectif sans raison d'exister : pas d'intent dossier, pas d'ajout coach,
 * pas de participation, pas de match joué, pas de suivi hors inscription.
 * Typiquement créée par un PATCH / sync partiel avec `licensePresence: "unknown"`.
 */
export function isOrphanChampionshipRosterStub(
  record: Pick<
    ChampionshipPlayerRecord,
    | "championnat"
    | "championnatParis"
    | "coachIncluded"
    | "coachExcluded"
    | "includedFromDossier"
    | "isTemporary"
    | "hasPlayedAtLeastOneMatch"
    | "hasPlayedAtLeastOneMatchParis"
    | "unregisteredEquipePaymentStatus"
    | "unregisteredParisPaymentStatus"
  >
): boolean {
  if (record.isTemporary === true) {
    return false;
  }
  if (record.coachExcluded === true) {
    return false;
  }
  if (record.includedFromDossier === true || record.coachIncluded === true) {
    return false;
  }
  if (record.championnat === true || record.championnatParis === true) {
    return false;
  }
  if (
    record.hasPlayedAtLeastOneMatch === true ||
    record.hasPlayedAtLeastOneMatchParis === true
  ) {
    return false;
  }
  if (
    record.unregisteredEquipePaymentStatus != null ||
    record.unregisteredParisPaymentStatus != null
  ) {
    return false;
  }
  return true;
}
