import { Player } from "@/types/team-management";
import { PhaseType, ParisTeamStructure } from "./types";

export const validateParisGroupPointsOrder = (
  players: Player[],
  structure: ParisTeamStructure
): { valid: boolean; reason?: string } => {
  if (structure.groups < 2) return { valid: true };
  if (players.length !== structure.totalPlayers) return { valid: true };

  const sortedPlayers = [...players].sort((a, b) => (b.points ?? 0) - (a.points ?? 0));
  const groups: Player[][] = [];
  for (let i = 0; i < structure.groups; i++) {
    const start = i * structure.playersPerGroup;
    groups.push(sortedPlayers.slice(start, start + structure.playersPerGroup));
  }

  const groupRanges = groups.map((group) => {
    const points = group.map((p) => p.points || 0);
    return { min: Math.min(...points), max: Math.max(...points) };
  });

  if (structure.groups >= 2) {
    const group1Max = groupRanges[0].max;
    const group2Players = groups[1];
    const invalidGroup2Players = group2Players.filter((p) => (p.points || 0) > group1Max);
    if (invalidGroup2Players.length > 0) {
      const playerNames = invalidGroup2Players
        .map((p) => `${p.firstName} ${p.name} (${p.points || 0} pts)`)
        .join(", ");
      return {
        valid: false,
        reason: `Article 8 : Les joueurs du groupe 2 doivent avoir des points ≤ ${group1Max} pts (max du groupe 1). Joueurs non conformes : ${playerNames}`,
      };
    }

    if (structure.groups >= 3) {
      const group3Min = groupRanges[2].min;
      const invalidGroup2PlayersMin = group2Players.filter((p) => (p.points || 0) < group3Min);
      if (invalidGroup2PlayersMin.length > 0) {
        const playerNames = invalidGroup2PlayersMin
          .map((p) => `${p.firstName} ${p.name} (${p.points || 0} pts)`)
          .join(", ");
        return {
          valid: false,
          reason: `Article 8 : Les joueurs du groupe 2 doivent avoir des points ≥ ${group3Min} pts (min du groupe 3). Joueurs non conformes : ${playerNames}`,
        };
      }
    }
  }

  return { valid: true };
};

export const isPlayerBurnedParis = (
  player: Player,
  teamNumber: number,
  phase: PhaseType
): boolean => {
  const burnedTeam = player.highestTeamNumberByPhaseParis?.[phase];
  if (burnedTeam === undefined || burnedTeam === null) return false;

  const matchesByTeam = player.matchesByTeamByPhaseParis?.[phase];
  if (!matchesByTeam) return false;

  for (const [teamNumStr, matchCount] of Object.entries(matchesByTeam)) {
    const teamNum = parseInt(teamNumStr, 10);
    if (teamNum < teamNumber && matchCount >= 3) {
      return true;
    }
  }

  return false;
};

export const validateParisBurnoutByGroup = (
  players: Player[],
  teamNumber: number,
  structure: ParisTeamStructure,
  phase: PhaseType
): { valid: boolean; reason?: string; offendingPlayerIds?: string[] } => {
  if (teamNumber <= 1) return { valid: true };
  if (players.length !== structure.totalPlayers) return { valid: true };

  const groups: Player[][] = [];
  for (let i = 0; i < structure.groups; i++) {
    const start = i * structure.playersPerGroup;
    groups.push(players.slice(start, start + structure.playersPerGroup));
  }

  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex];
    const burnedPlayers = group.filter((p) => isPlayerBurnedParis(p, teamNumber, phase));

    if (burnedPlayers.length > 1) {
      const playerNames = burnedPlayers.map((p) => `${p.firstName} ${p.name}`).join(", ");
      return {
        valid: false,
        reason: `Article 12 : Groupe ${groupIndex + 1} : maximum 1 joueur brûlé par groupe de 3. ${burnedPlayers.length} joueurs brûlés détectés : ${playerNames}. Les 2 joueurs sont non qualifiés.`,
        offendingPlayerIds: burnedPlayers.map((p) => p.id),
      };
    }
  }

  return { valid: true };
};
