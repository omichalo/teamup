import { EquipeWithMatches } from "@/hooks/useTeamData";
import { getMatchEpreuve, ID_EPREUVE_PARIS } from "@/lib/shared/epreuve-utils";
import { getTeamsByType } from "@/lib/compositions/championship-utils";
import { Match } from "@/types";
import { Player } from "@/types/team-management";
import { ChampionshipType } from "@/types";
import { PhaseType, MatchLike, ParisTeamStructure } from "./types";

export const isMatchPlayed = (match: MatchLike): boolean => {
  if (!match) return false;

  const hasPlayers =
    match.joueursSQY &&
    Array.isArray(match.joueursSQY) &&
    match.joueursSQY.length > 0;

  let hasValidScore = false;
  const scoreValue = match.score;
  const scoreIsString = typeof scoreValue === "string";
  if (scoreValue && scoreIsString && scoreValue !== "" && scoreValue !== "À VENIR" && scoreValue !== "0-0") {
    const scoreMatch = scoreValue.match(/^(\d+)-(\d+)$/);
    if (scoreMatch !== null && scoreMatch.length === 3) {
      const scoreA = parseInt(scoreMatch[1], 10);
      const scoreB = parseInt(scoreMatch[2], 10);
      hasValidScore = scoreA > 0 || scoreB > 0;
    }
  }

  const validResults = ["VICTOIRE", "DEFAITE", "NUL", "ÉGALITÉ"];
  const resultValue = match.result;
  const resultIsString = typeof resultValue === "string";
  const hasValidResult =
    hasValidScore &&
    resultIsString &&
    !!resultValue &&
    resultValue !== "À VENIR" &&
    validResults.includes(resultValue.toUpperCase());

  return hasPlayers || hasValidScore || hasValidResult;
};

export const getPlayersFromMatch = (match: MatchLike, players: Player[]): Player[] => {
  if (!match || !match.joueursSQY || !Array.isArray(match.joueursSQY)) return [];

  return match.joueursSQY
    .map((joueurSQY): Player | null => {
      if (!joueurSQY.licence) return null;
      return players.find((p) => p.license === joueurSQY.licence) || null;
    })
    .filter((p): p is Player => p !== null && p !== undefined);
};

export const getMatchForTeamAndJournee = (
  equipe: EquipeWithMatches,
  journee: number,
  phase: PhaseType
): Match | undefined => {
  return equipe.matches.find(
    (match) => match.journee === journee && match.phase?.toLowerCase() === phase.toLowerCase()
  );
};

export const extractTeamNumber = (teamName: string): number => {
  if (teamName.includes("SQY PING")) {
    const matchWithParentheses = teamName.match(/SQY PING\s*\((\d+)\)/i);
    if (matchWithParentheses) return parseInt(matchWithParentheses[1], 10);

    const match = teamName.match(/SQY PING\s*(\d+)/i);
    if (match) return parseInt(match[1], 10);
  }

  const match = teamName.match(/\b(\d+)\b/);
  return match ? parseInt(match[1], 10) : 0;
};

export const findEquipeById = (
  equipes: EquipeWithMatches[],
  teamId: string
): EquipeWithMatches | undefined => equipes.find((equipe) => equipe.team.id === teamId);

export const getTeamNumberForPlayerJournee1 = (
  playerId: string,
  phase: PhaseType,
  players: Player[],
  equipes: EquipeWithMatches[],
  championshipType?: ChampionshipType
): number | null => {
  const player = players.find((p) => p.id === playerId);
  if (!player) return null;

  const equipesToCheck = championshipType ? getTeamsByType(equipes)[championshipType] : equipes;

  for (const equipe of equipesToCheck) {
    const matchJ1 = getMatchForTeamAndJournee(equipe, 1, phase);
    if (matchJ1 && isMatchPlayed(matchJ1)) {
      const playerInMatch = getPlayersFromMatch(matchJ1, players).find((p) => p.id === playerId);
      if (playerInMatch) {
        const teamNumber = extractTeamNumber(equipe.team.name);
        return teamNumber > 0 ? teamNumber : null;
      }
    }
  }

  return null;
};

export const didPlayerPlayJ1InLowerTeam = (
  playerId: string,
  targetTeamNumber: number,
  phase: PhaseType,
  players: Player[],
  equipes: EquipeWithMatches[],
  championshipType?: ChampionshipType
): boolean => {
  const playerJ1TeamNumber = getTeamNumberForPlayerJournee1(
    playerId,
    phase,
    players,
    equipes,
    championshipType
  );

  if (playerJ1TeamNumber === null) return false;
  return playerJ1TeamNumber < targetTeamNumber;
};

export const buildSimulatedPlayers = (
  teamId: string,
  player: Player,
  players: Player[],
  compositions: { [teamId: string]: string[] }
): Player[] => {
  const currentTeamPlayers = compositions[teamId] || [];
  return [
    ...currentTeamPlayers
      .filter((pid) => pid !== player.id)
      .map((pid) => players.find((p) => p.id === pid))
      .filter((p): p is Player => p !== undefined),
    player,
  ];
};

export const isParisChampionship = (equipe: EquipeWithMatches): boolean => {
  const match = equipe.matches[0];
  if (match?.idEpreuve === ID_EPREUVE_PARIS) return true;

  const epreuve = getMatchEpreuve(match || {}, equipe.team);
  if (epreuve === "championnat_paris") return true;

  const epreuveLibelle = equipe.team.epreuve?.toLowerCase() || "";
  const division = equipe.team.division?.toLowerCase() || "";
  return (
    epreuveLibelle.includes("paris idf") ||
    epreuveLibelle.includes("excellence") ||
    division.includes("excellence") ||
    division.includes("paris idf")
  );
};

export const getParisTeamStructure = (division: string): ParisTeamStructure | null => {
  const divisionLower = division.toLowerCase();

  if (divisionLower.includes("excellence") || divisionLower.includes("honneur")) {
    return { groups: 3, playersPerGroup: 3, totalPlayers: 9 };
  }

  if (
    divisionLower.includes("1ere division") ||
    divisionLower.includes("1ère division") ||
    divisionLower.includes("1ere div") ||
    divisionLower.includes("1ère div")
  ) {
    return { groups: 2, playersPerGroup: 3, totalPlayers: 6 };
  }

  if (
    divisionLower.includes("2eme division") ||
    divisionLower.includes("2ème division") ||
    divisionLower.includes("2eme div") ||
    divisionLower.includes("2ème div")
  ) {
    return { groups: 1, playersPerGroup: 3, totalPlayers: 3 };
  }

  return null;
};
