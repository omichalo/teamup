import type { MatchData } from "./team-matches-sync-types";

export function normalizePlayerName(value: string | undefined): string {
  return (value ?? "")
    .trim()
    .toUpperCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ");
}

export function playerNameKey(player: { nom?: string; prenom?: string }): string {
  return `${normalizePlayerName(player.prenom)}|${normalizePlayerName(player.nom)}`;
}

export function hasUsablePlayerName(player: { nom?: string; prenom?: string }): boolean {
  return (
    normalizePlayerName(player.nom) !== "" &&
    normalizePlayerName(player.prenom) !== ""
  );
}

/** Composition SQY issue des résultats individuels FFTT (source fiable). */
export function buildSqyRosterFromMatch(
  match: Pick<MatchData, "resultatsIndividuels">
): Array<{ nom: string; prenom: string }> {
  const details = match.resultatsIndividuels;
  if (!details) return [];

  const joueursA = Object.values(details.joueursA ?? {});
  const joueursB = Object.values(details.joueursB ?? {});
  if (joueursA.length === 0 && joueursB.length === 0) return [];

  const nomEquipeA = normalizePlayerName(details.nomEquipeA);
  const nomEquipeB = normalizePlayerName(details.nomEquipeB);

  if (nomEquipeA.includes("SQY PING") && !nomEquipeB.includes("SQY PING")) {
    return joueursA;
  }
  if (nomEquipeB.includes("SQY PING") && !nomEquipeA.includes("SQY PING")) {
    return joueursB;
  }

  return joueursA.length >= joueursB.length ? joueursA : joueursB;
}

/**
 * Indique si une licence doit compter pour le brûlage / la participation.
 * Évite les faux positifs quand une licence a été injectée par enrichissement
 * sans nom/prénom alors que le joueur n'est pas dans la feuille de match FFTT.
 */
export function isLicenceListedInMatchRoster(
  match: MatchData,
  joueur: { licence?: string; nom?: string; prenom?: string }
): boolean {
  const licence = joueur.licence?.trim();
  if (!licence) return false;

  const roster = buildSqyRosterFromMatch(match);
  if (roster.length > 0) {
    if (!hasUsablePlayerName(joueur)) {
      return false;
    }
    const key = playerNameKey(joueur);
    return roster.some((r) => playerNameKey(r) === key);
  }

  return hasUsablePlayerName(joueur);
}

/** Indique si le match contient une composition exploitable (feuille ou joueursSQY nommés). */
export function hasMatchCompositionData(
  match: Pick<MatchData, "joueursSQY" | "resultatsIndividuels">
): boolean {
  const joueursSQY = match.joueursSQY ?? [];
  if (joueursSQY.some((j) => hasUsablePlayerName(j))) {
    return true;
  }
  return buildSqyRosterFromMatch(match).length > 0;
}

export function addPlayerLicencesFromMatchIfRostered(
  match: MatchData,
  joueurs: NonNullable<MatchData["joueursSQY"]>,
  licences: Set<string>
): void {
  for (const joueur of joueurs) {
    const licence = joueur.licence?.trim();
    if (licence && isLicenceListedInMatchRoster(match, joueur)) {
      licences.add(licence);
    }
  }
}
