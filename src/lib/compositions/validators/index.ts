import { Player } from "@/types/team-management";
import { validateFFTTRules } from "@/lib/shared/fftt-utils";
import {
  type AssignmentValidationParams,
  type AssignmentValidationResult,
  DEFAULT_JOURNEE_RULE,
  JOURNEE_CONCERNEE_PAR_REGLE,
  type PhaseType,
  type TeamCompositionValidationParams,
  type TeamCompositionValidationResult,
} from "@/lib/compositions/validators/types";
import {
  buildSimulatedPlayers,
  didPlayerPlayJ1InLowerTeam,
  extractTeamNumber,
  findEquipeById,
  getParisTeamStructure,
  isParisChampionship,
} from "@/lib/compositions/validators/team-utils";
import {
  calculateFutureBurnout,
  calculateFutureBurnoutParis,
} from "@/lib/compositions/validators/burnout-utils";
import {
  validateParisBurnoutByGroup,
  validateParisGroupPointsOrder,
} from "@/lib/compositions/validators/paris-rules";

export type {
  AssignmentValidationParams,
  AssignmentValidationResult,
  CompositionMap,
  PhaseType,
  TeamCompositionValidationParams,
  TeamCompositionValidationResult,
} from "@/lib/compositions/validators/types";

export { JOURNEE_CONCERNEE_PAR_REGLE };
export {
  isMatchPlayed,
  getPlayersFromMatch,
  getMatchForTeamAndJournee,
  extractTeamNumber,
  getTeamNumberForPlayerJournee1,
  didPlayerPlayJ1InLowerTeam,
  isParisChampionship,
  getParisTeamStructure,
} from "@/lib/compositions/validators/team-utils";
export { calculateFutureBurnout, calculateFutureBurnoutParis } from "@/lib/compositions/validators/burnout-utils";
export { validateParisGroupPointsOrder, isPlayerBurnedParis, validateParisBurnoutByGroup } from "@/lib/compositions/validators/paris-rules";


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
    championshipType,
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

  const isFemaleTeam = championshipType === "feminin";
  const isParis = isParisChampionship(equipe);

  // Pour le championnat de Paris : pas de limite sur les joueurs étrangers
  if (!isParis && player.nationality === "ETR") {
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

  const phase = selectedPhase || "aller";

  // Pour le championnat de Paris, utiliser les données spécifiques à Paris
  const burnedTeam = isParis
    ? player.highestTeamNumberByPhaseParis?.[phase]
    : championshipType === "masculin"
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

  // Calculer le brûlage futur en simulant l'ajout d'un match dans l'équipe cible
  // Pour le championnat de Paris, utiliser les données spécifiques à Paris
  const matchesByTeamByPhase = isParis
    ? player.matchesByTeamByPhaseParis?.[phase]
    : isFemaleTeam
      ? player.feminineMatchesByTeamByPhase?.[phase]
      : player.masculineMatchesByTeamByPhase?.[phase];
  
  const futureBurnedTeam = isParis
    ? calculateFutureBurnoutParis(matchesByTeamByPhase, teamNumber, championshipType)
    : calculateFutureBurnout(matchesByTeamByPhase, teamNumber, championshipType);
  
  // Le joueur sera brûlé si :
  // 1. Le brûlage futur est différent du brûlage actuel (changement d'équipe brûlée)
  // 2. OU le joueur devient brûlé alors qu'il ne l'était pas (actuel = null/undefined, futur ≠ null)
  const willBeBurned = 
    futureBurnedTeam !== null && 
    (burnedTeam === null || burnedTeam === undefined || futureBurnedTeam !== burnedTeam);

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

  // Pour le championnat de Paris : pas de points minimum
  if (!isParis) {
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
        equipes,
        championshipType
      )
    );

    const playerFromLowerTeam = didPlayerPlayJ1InLowerTeam(
      player.id,
      teamNumber,
      phaseValue,
      players,
      equipes,
      championshipType
    );

    if (playerFromLowerTeam && playersFromLowerTeams.length > 1) {
      return {
        canAssign: false,
        reason: `Lors de la ${journeeRule}ème journée, une équipe ne peut comporter qu'un seul joueur ayant joué la 1ère journée dans une équipe de numéro inférieur`,
        simulatedPlayers: simulatedTeamPlayers,
      };
    }
  }

  // Validations spécifiques au championnat de Paris
  if (isParis && selectedPhase !== null) {
    const division = equipe.team.division || "";
    const structure = getParisTeamStructure(division);
    if (structure) {
      // Valider l'ordre des points dans les groupes (Article 8)
      const pointsOrderValidation = validateParisGroupPointsOrder(
        simulatedTeamPlayers,
        structure
      );
      if (!pointsOrderValidation.valid) {
        return {
          canAssign: false,
          reason: pointsOrderValidation.reason || "Erreur de validation des points",
          simulatedPlayers: simulatedTeamPlayers,
        };
      }

      // Valider le brûlage par groupe (Article 12)
      const phaseValue = selectedPhase as PhaseType;
      const burnoutValidation = validateParisBurnoutByGroup(
        simulatedTeamPlayers,
        teamNumber,
        structure,
        phaseValue
      );
      if (!burnoutValidation.valid) {
        return {
          canAssign: false,
          reason: burnoutValidation.reason || "Erreur de validation du brûlage",
          simulatedPlayers: simulatedTeamPlayers,
        };
      }
    }
  }

  // Si le joueur sera brûlé, ajouter cette information dans le résultat
  const result: AssignmentValidationResult = {
    canAssign: true,
    simulatedPlayers: simulatedTeamPlayers,
  };

  if (willBeBurned && futureBurnedTeam !== null) {
    result.willBeBurned = true;
    result.burnedTeamNumber = futureBurnedTeam; // Numéro de l'équipe où il sera brûlé (pas forcément celle où on le positionne)
  }

  return result;
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
    championshipType,
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

  const isFemaleTeam = championshipType === "feminin";
  const isParis = isParisChampionship(equipe);

  // Pour le championnat de Paris : pas de limite sur les joueurs étrangers
  if (!isParis) {
    const foreignPlayers = teamPlayers.filter((p) => p.nationality === "ETR");
    if (foreignPlayers.length > 1) {
      return {
        valid: false,
        reason: "Une composition ne peut contenir plus d'un joueur étranger (ETR)",
      };
    }
  }

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
  
  // Pour le championnat de Paris, la vérification du brûlage se fait via l'Article 12 (par groupe)
  // Pour le championnat par équipes, on vérifie le brûlage général
  if (teamNumber > 0 && !isParis) {
    const phaseValue = selectedPhase ?? "aller";
    
    const burnedPlayer = teamPlayers.find((player) => {
      const burnedTeam = isFemaleTeam
        ? player.highestFeminineTeamNumberByPhase?.[phaseValue]
        : player.highestMasculineTeamNumberByPhase?.[phaseValue];
      return (
        burnedTeam !== undefined &&
        burnedTeam !== null &&
        teamNumber > burnedTeam
      );
    });

    if (burnedPlayer) {
      const burnedTeamNumber = isFemaleTeam
        ? burnedPlayer.highestFeminineTeamNumberByPhase?.[phaseValue]
        : burnedPlayer.highestMasculineTeamNumberByPhase?.[phaseValue];
      return {
        valid: false,
        reason: `${burnedPlayer.firstName} ${burnedPlayer.name} est brûlé(e) : équipe autorisée ${burnedTeamNumber ?? "?"}, équipe actuelle ${teamNumber}`,
        offendingPlayerIds: [burnedPlayer.id],
      };
    }
  }

  // Pour le championnat de Paris : pas de points minimum
  if (!isParis) {
    const ffttValidation = validateFFTTRules(teamPlayers, division, isFemaleTeam);
    if (!ffttValidation.valid) {
      return {
        valid: false,
        reason: ffttValidation.reason || "Règle FFTT non respectée",
      };
    }
  }

  // Validations spécifiques au championnat de Paris
  if (isParis && selectedPhase !== null) {
    const structure = getParisTeamStructure(division);
    if (structure) {
      // Valider l'ordre des points dans les groupes (Article 8)
      const pointsOrderValidation = validateParisGroupPointsOrder(
        teamPlayers,
        structure
      );
      if (!pointsOrderValidation.valid) {
        return {
          valid: false,
          reason: pointsOrderValidation.reason || "Erreur de validation des points",
        };
      }

      // Valider le brûlage par groupe (Article 12)
      const phaseValue = selectedPhase as PhaseType;
      const burnoutValidation = validateParisBurnoutByGroup(
        teamPlayers,
        teamNumber,
        structure,
        phaseValue
      );
      if (!burnoutValidation.valid) {
        return {
          valid: false,
          reason: burnoutValidation.reason || "Erreur de validation du brûlage",
          ...(burnoutValidation.offendingPlayerIds && {
            offendingPlayerIds: burnoutValidation.offendingPlayerIds,
          }),
        };
      }
    }
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
          equipes,
          championshipType
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

/**
 * Vérifie si une équipe fait partie du championnat de Paris
 */
