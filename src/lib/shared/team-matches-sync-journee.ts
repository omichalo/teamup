import type { MatchData } from "./team-matches-sync-types";

/**
 * Assigne le numéro de journée d'après la position du match (1er, 2e, 3e...)
 * dans l'ordre chronologique, par équipe ET par phase.
 * Grouper par (teamId, phase) évite de mélanger Phase 1 (aller) et Phase 2 (retour)
 * pour une même équipe (ex. team_1 fallback ou équipes partageant un identifiant).
 */
export function recalculateJourneesByDate(matches: MatchData[]): MatchData[] {
  const matchesByTeamAndPhase = new Map<string, MatchData[]>();

  matches.forEach((match) => {
    const teamId =
      match.teamId?.trim() || `team_${match.teamNumber}_${match.isFemale ? "F" : "M"}`;
    const rawPhase = (match.phase || "aller").toLowerCase();
    const phase =
      rawPhase === "retour" ||
      rawPhase.includes("phase 2") ||
      rawPhase.includes("phase2")
        ? "retour"
        : "aller";
    const teamPhaseKey = `${teamId}|${phase}`;
    if (!matchesByTeamAndPhase.has(teamPhaseKey)) {
      matchesByTeamAndPhase.set(teamPhaseKey, []);
    }
    matchesByTeamAndPhase.get(teamPhaseKey)?.push(match);
  });

  const recalculatedMatches: MatchData[] = [];

  matchesByTeamAndPhase.forEach((teamMatches) => {
    const sortedMatches = [...teamMatches].sort((a, b) => {
      const dateA = new Date(a.date).getTime();
      const dateB = new Date(b.date).getTime();
      return dateA - dateB;
    });

    sortedMatches.forEach((match, index) => {
      match.journee = index + 1;
    });

    recalculatedMatches.push(...sortedMatches);
  });

  return recalculatedMatches;
}
