import type { RegistrationCompetition, RegistrationConfigV1 } from "./types";

/** Texte par défaut — aligné sur le règlement intérieur du club (section Compétition). */
export const DEFAULT_COMPETITION_AVAILABILITY_COMMITMENT_NOTICE =
  "En vous inscrivant à une compétition, vous vous engagez à être disponible pour l'ensemble de ses épreuves et à prévenir votre entraîneur en cas d'absence. Conformément au règlement intérieur du club, les amendes liées à une absence non justifiée par un certificat médical seront à votre charge et devront être réglées avant la compétition suivante. En cas d'amendes impayées, le club se réserve le droit de ne pas vous réinscrire aux compétitions suivantes.";

export function getCompetitionsRequiringAvailabilityCommitment(
  config: RegistrationConfigV1,
  competitionIds: readonly string[]
): RegistrationCompetition[] {
  const selected = new Set(competitionIds);
  return config.competitions.filter(
    (competition) =>
      competition.enabled &&
      competition.requiresAvailabilityCommitment === true &&
      selected.has(competition.id)
  );
}

export function getCompetitionAvailabilityCommitmentNotice(
  config: RegistrationConfigV1
): string {
  return (
    config.uiCopy.competitionAvailabilityCommitmentNotice ??
    DEFAULT_COMPETITION_AVAILABILITY_COMMITMENT_NOTICE
  );
}
