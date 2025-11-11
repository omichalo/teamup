import { Player } from "@/types/team-management";
import { Match } from "@/types";
import { EquipeWithMatches } from "@/hooks/useEquipesWithMatches";
import { validateFFTTRules } from "@/lib/shared/fftt-utils";

export type PhaseType = "aller" | "retour";

export interface CompositionMap {
  [teamId: string]: string[];
}

export interface AssignmentValidationParams {
  playerId: string;
  teamId: string;
  players: Player[];
  equipes: EquipeWithMatches[];
  compositions: CompositionMap;
  selectedPhase: PhaseType | null;
  selectedJournee: number | null;
  journeeRule?: number;
  maxPlayersPerTeam?: number;
}

export interface AssignmentValidationResult {
  canAssign: boolean;
  reason?: string;
  simulatedPlayers: Player[];
}

export interface TeamCompositionValidationParams {
  teamId: string;
  players: Player[];
  equipes: EquipeWithMatches[];
  compositions: CompositionMap;
  selectedPhase: PhaseType | null;
  selectedJournee: number | null;
  journeeRule?: number;
  maxPlayersPerTeam?: number;
}

export interface TeamCompositionValidationResult {
  valid: boolean;
  reason?: string;
  offendingPlayerIds?: string[];
}

export const JOURNEE_CONCERNEE_PAR_REGLE = 2;

const DEFAULT_JOURNEE_RULE = JOURNEE_CONCERNEE_PAR_REGLE;

export const isMatchPlayed = (match: Match | null): boolean => {
  if (!match) {
    return false;
  }

  const hasPlayers =
    match.joueursSQY &&
    Array.isArray(match.joueursSQY) &&
    match.joueursSQY.length > 0;

  let hasValidScore = false;
  const scoreValue = match.score;
  const scoreType = typeof scoreValue;
  const scoreIsString = scoreType === "string";
  const scoreNotEmpty = scoreIsString && scoreValue !== "";
  const scoreNotAVenir = scoreIsString && scoreValue !== "À VENIR";
  const scoreNotZeroZero = scoreIsString && scoreValue !== "0-0";

  if (
    scoreValue &&
    scoreIsString &&
    scoreNotEmpty &&
    scoreNotAVenir &&
    scoreNotZeroZero
  ) {
    const scoreMatch = scoreValue.match(/^(\d+)-(\d+)$/);
    if (scoreMatch !== null && scoreMatch.length === 3) {
      const scoreA = parseInt(scoreMatch[1], 10);
      const scoreB = parseInt(scoreMatch[2], 10);
      hasValidScore = scoreA > 0 || scoreB > 0;
    }
  }

  const validResults = ["VICTOIRE", "DÉFAITE", "ÉGALITÉ", "NUL", "DEFAITE"];
  const resultValue = match.result;
  const resultType = typeof resultValue;
  const resultIsString = resultType === "string";
  const resultNotAVenir = resultIsString && resultValue !== "À VENIR";
  const resultInValidList =
    resultIsString &&
    typeof resultValue === "string" &&
    validResults.includes(resultValue.toUpperCase());
  const hasValidResult =
    hasValidScore &&
    resultIsString &&
    !!resultValue &&
    resultNotAVenir &&
    resultInValidList;

  return hasPlayers || hasValidScore || hasValidResult;
};

export const getPlayersFromMatch = (
  match: Match | null,
  players: Player[]
): Player[] => {
  if (!match || !match.joueursSQY || !Array.isArray(match.joueursSQY)) {
    return [];
  }

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
    (match) =>
      match.journee === journee &&
      match.phase?.toLowerCase() === phase.toLowerCase()
  );
};

export const extractTeamNumber = (teamName: string): number => {
  const match = teamName.match(/\b(\d+)\b/);
  return match ? parseInt(match[1], 10) : 0;
};

const findEquipeById = (
  equipes: EquipeWithMatches[],
  teamId: string
): EquipeWithMatches | undefined =>
  equipes.find((equipe) => equipe.team.id === teamId);

export const getTeamNumberForPlayerJournee1 = (
  playerId: string,
  phase: PhaseType,
  players: Player[],
  equipes: EquipeWithMatches[]
): number | null => {
  const player = players.find((p) => p.id === playerId);
  if (!player) {
    return null;
  }

  for (const equipe of equipes) {
    const matchJ1 = getMatchForTeamAndJournee(equipe, 1, phase);
    if (matchJ1 && isMatchPlayed(matchJ1)) {
      const playersFromMatch = getPlayersFromMatch(matchJ1, players);
      const playerInMatch = playersFromMatch.find((p) => p.id === playerId);
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
  equipes: EquipeWithMatches[]
): boolean => {
  const playerJ1TeamNumber = getTeamNumberForPlayerJournee1(
    playerId,
    phase,
    players,
    equipes
  );

  if (playerJ1TeamNumber === null) {
    return false;
  }

  return playerJ1TeamNumber < targetTeamNumber;
};

const buildSimulatedPlayers = (
  teamId: string,
  player: Player,
  players: Player[],
  compositions: CompositionMap
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

export const canAssignPlayerToTeam = (
  params: AssignmentValidationParams
): AssignmentValidationResult => {
  const {
    playerId,
    teamId,
    players,
    equipes,
    compositions,
    selectedPhase,
    selectedJournee,
    journeeRule = DEFAULT_JOURNEE_RULE,
    maxPlayersPerTeam = 4,
  } = params;

  const player = players.find((p) => p.id === playerId);
  const equipe = findEquipeById(equipes, teamId);

  if (!player || !equipe) {
    return {
      canAssign: false,
      reason: "Données introuvables",
      simulatedPlayers: [],
    };
  }

  const currentTeamPlayers = compositions[teamId] || [];
  if (currentTeamPlayers.length >= maxPlayersPerTeam) {
    return {
      canAssign: false,
      reason: `L'équipe est complète (${currentTeamPlayers.length}/${maxPlayersPerTeam} joueurs)`,
      simulatedPlayers: buildSimulatedPlayers(teamId, player, players, compositions),
    };
  }

  if (player.nationality === "ETR") {
    const currentTeamPlayersData = currentTeamPlayers
      .filter((currentId) => currentId !== player.id)
      .map((currentId) => players.find((p) => p.id === currentId))
      .filter((p): p is Player => p !== undefined);

    const hasForeignPlayer = currentTeamPlayersData.some(
      (p) => p.nationality === "ETR"
    );

    if (hasForeignPlayer) {
      return {
        canAssign: false,
        reason: "L'équipe contient déjà un joueur étranger (ETR)",
        simulatedPlayers: buildSimulatedPlayers(
          teamId,
          player,
          players,
          compositions
        ),
      };
    }
  }

  const teamNumber = extractTeamNumber(equipe.team.name);
  if (teamNumber === 0) {
    return {
      canAssign: true,
      simulatedPlayers: buildSimulatedPlayers(teamId, player, players, compositions),
    };
  }

  const isFemaleTeam = equipe.matches.some((match) => match.isFemale === true);
  const championshipType = isFemaleTeam ? "feminin" : "masculin";
  const phase = selectedPhase || "aller";

  const burnedTeam =
    championshipType === "masculin"
      ? player.highestMasculineTeamNumberByPhase?.[phase]
      : player.highestFeminineTeamNumberByPhase?.[phase];

  if (burnedTeam !== undefined && burnedTeam !== null) {
    if (teamNumber > burnedTeam) {
      return {
        canAssign: false,
        reason: `Brûlé dans l'équipe ${burnedTeam}, ne peut pas jouer dans l'équipe ${teamNumber}`,
        simulatedPlayers: buildSimulatedPlayers(
          teamId,
          player,
          players,
          compositions
        ),
      };
    }
  }

  const simulatedTeamPlayers = buildSimulatedPlayers(
    teamId,
    player,
    players,
    compositions
  );

  if (!isFemaleTeam) {
    const femalePlayersCount = simulatedTeamPlayers.filter(
      (p) => p.gender === "F"
    ).length;
    if (femalePlayersCount > 2) {
      return {
        canAssign: false,
        reason: "Une équipe masculine ne peut comporter plus de deux joueuses",
        simulatedPlayers: simulatedTeamPlayers,
      };
    }
  }

  const division = equipe.team.division || "";
  const { valid, reason } = validateFFTTRules(
    simulatedTeamPlayers,
    division,
    isFemaleTeam
  );

  if (!valid) {
    return {
      canAssign: false,
      reason: reason || "Règle FFTT non respectée",
      simulatedPlayers: simulatedTeamPlayers,
    };
  }

  if (
    selectedJournee === journeeRule &&
    selectedPhase !== null &&
    journeeRule !== null
  ) {
    const phaseValue = selectedPhase as PhaseType;
    const playersFromLowerTeams = simulatedTeamPlayers.filter((p) =>
      didPlayerPlayJ1InLowerTeam(
        p.id,
        teamNumber,
        phaseValue,
        players,
        equipes
      )
    );

    const playerFromLowerTeam = didPlayerPlayJ1InLowerTeam(
      player.id,
      teamNumber,
      phaseValue,
      players,
      equipes
    );

    if (playerFromLowerTeam && playersFromLowerTeams.length > 1) {
      return {
        canAssign: false,
        reason: `Lors de la ${journeeRule}ème journée, une équipe ne peut comporter qu'un seul joueur ayant joué la 1ère journée dans une équipe de numéro inférieur`,
        simulatedPlayers: simulatedTeamPlayers,
      };
    }
  }

  return {
    canAssign: true,
    simulatedPlayers: simulatedTeamPlayers,
  };
};

export const validateTeamCompositionState = (
  params: TeamCompositionValidationParams
): TeamCompositionValidationResult => {
  const {
    teamId,
    players,
    equipes,
    compositions,
    selectedPhase,
    selectedJournee,
    journeeRule = DEFAULT_JOURNEE_RULE,
    maxPlayersPerTeam = 4,
  } = params;

  const equipe = findEquipeById(equipes, teamId);
  if (!equipe) {
    return { valid: true };
  }

  const teamPlayerIds = compositions[teamId] || [];
  const teamPlayers = teamPlayerIds
    .map((playerId) => players.find((p) => p.id === playerId))
    .filter((p): p is Player => p !== undefined);

  const isDailyContext = selectedJournee !== null;

  if (teamPlayers.length === 0) {
    return { valid: true };
  }

  if (isDailyContext && teamPlayers.length < maxPlayersPerTeam) {
    return { valid: true };
  }

  if (teamPlayers.length > maxPlayersPerTeam) {
    return {
      valid: false,
      reason: `Une composition ne peut contenir que ${maxPlayersPerTeam} joueur${maxPlayersPerTeam > 1 ? "s" : ""}`,
    };
  }

  const foreignPlayers = teamPlayers.filter((p) => p.nationality === "ETR");
  if (foreignPlayers.length > 1) {
    return {
      valid: false,
      reason: "Une composition ne peut contenir plus d'un joueur étranger (ETR)",
    };
  }

  const isFemaleTeam = equipe.matches.some((match) => match.isFemale === true);
  if (!isFemaleTeam) {
    const femalePlayersCount = teamPlayers.filter((p) => p.gender === "F").length;
    if (femalePlayersCount > 2) {
      return {
        valid: false,
        reason: "Une équipe masculine ne peut comporter plus de deux joueuses",
      };
    }
  }

  const division = equipe.team.division || "";
  const teamNumber = extractTeamNumber(equipe.team.name);
  if (teamNumber > 0) {
    const phaseValue = selectedPhase ?? "aller";
    const burnedPlayer = teamPlayers.find((player) => {
      const burnedTeam =
        isFemaleTeam
          ? player.highestFeminineTeamNumberByPhase?.[phaseValue]
          : player.highestMasculineTeamNumberByPhase?.[phaseValue];
      return (
        burnedTeam !== undefined &&
        burnedTeam !== null &&
        teamNumber > burnedTeam
      );
    });

    if (burnedPlayer) {
      const burnedTeamNumber =
        isFemaleTeam
          ? burnedPlayer.highestFeminineTeamNumberByPhase?.[phaseValue]
          : burnedPlayer.highestMasculineTeamNumberByPhase?.[phaseValue];
      return {
        valid: false,
        reason: `${burnedPlayer.firstName} ${burnedPlayer.name} est brûlé(e) : équipe autorisée ${burnedTeamNumber ?? "?"}, équipe actuelle ${teamNumber}`,
        offendingPlayerIds: [burnedPlayer.id],
      };
    }
  }

  const ffttValidation = validateFFTTRules(teamPlayers, division, isFemaleTeam);
  if (!ffttValidation.valid) {
    return {
      valid: false,
      reason: ffttValidation.reason || "Règle FFTT non respectée",
    };
  }

  if (
    selectedJournee === journeeRule &&
    selectedJournee !== null &&
    selectedPhase !== null &&
    journeeRule !== null
  ) {
    const phaseValue = selectedPhase as PhaseType;
    if (teamNumber > 0) {
      const playersFromLowerTeams = teamPlayers.filter((p) =>
        didPlayerPlayJ1InLowerTeam(
          p.id,
          teamNumber,
          phaseValue,
          players,
          equipes
        )
      );

      if (playersFromLowerTeams.length > 1) {
        return {
          valid: false,
          reason: `Lors de la ${journeeRule}ème journée, une équipe ne peut comporter qu'un seul joueur ayant joué la 1ère journée dans une équipe de numéro inférieur`,
          offendingPlayerIds: playersFromLowerTeams.map((p) => p.id),
        };
      }
    }
  }

  return { valid: true };
};


