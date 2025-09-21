import { MatchData } from "./team-sync";

export interface BurnoutInfo {
  playerLicence: string;
  playerName: string;
  teamId: string;
  teamName: string;
  matchesPlayed: number;
  lastMatchDate: Date;
  isAtRisk: boolean;
  riskReason?: string;
}

export interface BurnoutConditions {
  maxMatchesPerPlayer: number;
  maxConsecutiveMatches: number;
  minDaysBetweenMatches: number;
}

/**
 * Calcule les informations de brûlage pour un joueur dans une équipe
 */
export const calculatePlayerBurnout = (
  playerLicence: string,
  teamId: string,
  teamName: string,
  matches: MatchData[],
  conditions: BurnoutConditions
): BurnoutInfo | null => {
  // Filtrer les matchs où le joueur a participé
  const playerMatches = matches.filter((match) =>
    match.joueursSQY?.some((joueur) => joueur.licence === playerLicence)
  );

  if (playerMatches.length === 0) {
    return null;
  }

  // Trier les matchs par date
  const sortedMatches = playerMatches.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const matchesPlayed = sortedMatches.length;
  const lastMatchDate = new Date(sortedMatches[sortedMatches.length - 1].date);

  // Vérifier les conditions de brûlage
  let isAtRisk = false;
  let riskReason: string | undefined;

  // Condition 1: Nombre maximum de matchs
  if (matchesPlayed > conditions.maxMatchesPerPlayer) {
    isAtRisk = true;
    riskReason = `A joué ${matchesPlayed} matchs (max: ${conditions.maxMatchesPerPlayer})`;
  }

  // Condition 2: Matchs consécutifs
  let consecutiveMatches = 1;
  let maxConsecutive = 1;

  for (let i = 1; i < sortedMatches.length; i++) {
    const currentDate = new Date(sortedMatches[i].date);
    const previousDate = new Date(sortedMatches[i - 1].date);
    const daysDiff = Math.floor(
      (currentDate.getTime() - previousDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysDiff <= conditions.minDaysBetweenMatches) {
      consecutiveMatches++;
      maxConsecutive = Math.max(maxConsecutive, consecutiveMatches);
    } else {
      consecutiveMatches = 1;
    }
  }

  if (maxConsecutive > conditions.maxConsecutiveMatches) {
    isAtRisk = true;
    riskReason = riskReason
      ? `${riskReason}; ${maxConsecutive} matchs consécutifs (max: ${conditions.maxConsecutiveMatches})`
      : `${maxConsecutive} matchs consécutifs (max: ${conditions.maxConsecutiveMatches})`;
  }

  return {
    playerLicence,
    playerName:
      sortedMatches[0].joueursSQY?.find((j) => j.licence === playerLicence)
        ?.nom || "Inconnu",
    teamId,
    teamName,
    matchesPlayed,
    lastMatchDate,
    isAtRisk,
    riskReason,
  };
};

/**
 * Calcule les informations de brûlage pour tous les joueurs d'une équipe
 */
export const calculateTeamBurnout = (
  teamId: string,
  teamName: string,
  matches: MatchData[],
  conditions: BurnoutConditions
): BurnoutInfo[] => {
  // Récupérer tous les joueurs uniques qui ont joué dans cette équipe
  const playerLicences = new Set<string>();

  matches.forEach((match) => {
    if (match.joueursSQY) {
      match.joueursSQY.forEach((joueur) => {
        playerLicences.add(joueur.licence);
      });
    }
  });

  // Calculer les informations de brûlage pour chaque joueur
  const burnoutInfos: BurnoutInfo[] = [];

  playerLicences.forEach((licence) => {
    const burnoutInfo = calculatePlayerBurnout(
      licence,
      teamId,
      teamName,
      matches,
      conditions
    );
    if (burnoutInfo) {
      burnoutInfos.push(burnoutInfo);
    }
  });

  return burnoutInfos;
};

/**
 * Conditions de brûlage par défaut (à adapter selon les règles FFTT)
 */
export const DEFAULT_BURNOUT_CONDITIONS: BurnoutConditions = {
  maxMatchesPerPlayer: 7, // Maximum 7 matchs par joueur
  maxConsecutiveMatches: 3, // Maximum 3 matchs consécutifs
  minDaysBetweenMatches: 1, // Minimum 1 jour entre les matchs
};
