import { Player } from "@/types/team-management";
import { Match } from "@/types";
import { EquipeWithMatches } from "@/hooks/useEquipesWithMatches";
import { validateFFTTRules } from "@/lib/shared/fftt-utils";
import { getMatchEpreuve, ID_EPREUVE_PARIS } from "@/lib/shared/epreuve-utils";

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
  willBeBurned?: boolean; // Indique si le joueur sera brûlé en l'assignant à cette équipe
  burnedTeamNumber?: number; // Numéro de l'équipe dans laquelle il sera brûlé
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

  const validResults = ["VICTOIRE", "DEFAITE", "NUL", "ÉGALITÉ"];
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
  // Supporte les formats :
  // - "SQY PING 3"
  // - "SQY PING (3)"
  // - "SQY PING 3 - Phase 1"
  // - "SQY PING (3) - Phase 1"
  // Cherche d'abord le format avec parenthèses après "SQY PING", puis n'importe quel nombre
  if (teamName.includes("SQY PING")) {
    const matchWithParentheses = teamName.match(/SQY PING\s*\((\d+)\)/i);
    if (matchWithParentheses) {
      return parseInt(matchWithParentheses[1], 10);
    }
    const match = teamName.match(/SQY PING\s*(\d+)/i);
    if (match) {
      return parseInt(match[1], 10);
    }
  }
  // Fallback : chercher n'importe quel nombre
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

/**
 * Calcule le brûlage futur d'un joueur en simulant l'ajout d'un match dans une équipe
 * Utilise le même algorithme que team-matches-sync.ts :
 * - Crée une liste de tous les matchs triés par numéro d'équipe croissant
 * - Si le joueur a joué au moins 2 matchs, il est brûlé dans l'équipe du 2ème match
 * 
 * @param matchesByTeamByPhase - Map actuelle des matchs par équipe pour la phase (ex: {4: 1, 6: 2})
 * @param targetTeamNumber - Numéro de l'équipe où on ajoute le joueur
 * @returns Le numéro d'équipe de brûlage futur, ou null si le joueur ne sera pas brûlé (< 2 matchs)
 */
export const calculateFutureBurnout = (
  matchesByTeamByPhase: { [teamNumber: number]: number } | undefined,
  targetTeamNumber: number
): number | null => {
  // Créer une copie des matchs actuels
  const futureMatchesByTeam = new Map<number, number>();
  
  if (matchesByTeamByPhase) {
    for (const [teamNumber, matchCount] of Object.entries(matchesByTeamByPhase)) {
      futureMatchesByTeam.set(parseInt(teamNumber, 10), matchCount);
    }
  }
  
  // Ajouter 1 match dans l'équipe cible
  const currentCountInTargetTeam = futureMatchesByTeam.get(targetTeamNumber) || 0;
  futureMatchesByTeam.set(targetTeamNumber, currentCountInTargetTeam + 1);
  
  // Créer une liste de tous les matchs triés par numéro d'équipe croissant
  // (même algorithme que team-matches-sync.ts lignes 954-964)
  const allMatches: number[] = [];
  for (const [teamNumber, matchCount] of futureMatchesByTeam) {
    // Ajouter le numéro d'équipe autant de fois qu'il y a de matchs
    for (let i = 0; i < matchCount; i++) {
      allMatches.push(teamNumber);
    }
  }
  
  // Trier par numéro d'équipe croissant
  allMatches.sort((a, b) => a - b);
  
  // Si le joueur a joué au moins 2 matchs, il est brûlé dans l'équipe du 2ème match
  if (allMatches.length >= 2) {
    return allMatches[1]; // 2ème élément (index 1)
  }
  
  return null; // Pas encore brûlé (< 2 matchs)
};

/**
 * Calcule le brûlage futur pour le championnat de Paris
 * Un joueur est brûlé s'il a joué 3 matchs ou plus dans UNE équipe de numéro inférieur
 * Retourne le numéro de l'équipe la plus basse (numéro le plus élevé) où il sera brûlé
 */
export const calculateFutureBurnoutParis = (
  matchesByTeamByPhase: { [teamNumber: number]: number } | undefined,
  targetTeamNumber: number
): number | null => {
  if (!matchesByTeamByPhase) {
    return null;
  }
  
  // Créer une copie des matchs actuels
  const futureMatchesByTeam = new Map<number, number>();
  for (const [teamNumber, matchCount] of Object.entries(matchesByTeamByPhase)) {
    futureMatchesByTeam.set(parseInt(teamNumber, 10), matchCount);
  }
  
  // Ajouter 1 match dans l'équipe cible
  const currentCountInTargetTeam = futureMatchesByTeam.get(targetTeamNumber) || 0;
  futureMatchesByTeam.set(targetTeamNumber, currentCountInTargetTeam + 1);
  
  // Pour le championnat de Paris, un joueur est brûlé s'il a 3 matchs ou plus dans UNE équipe de numéro inférieur
  // On cherche la plus basse équipe (numéro le plus élevé) où il est brûlé
  const teamNumbers = Array.from(futureMatchesByTeam.keys()).sort((a, b) => a - b);
  let highestBurnedTeam: number | null = null;
  
  for (let i = 0; i < teamNumbers.length; i++) {
    const currentTeamNumber = teamNumbers[i];
    
    // Vérifier s'il y a une équipe de numéro inférieur où le joueur a joué 3 fois ou plus
    for (let j = 0; j < i; j++) {
      const lowerTeamNumber = teamNumbers[j];
      const matchCountInLowerTeam = futureMatchesByTeam.get(lowerTeamNumber) || 0;
      
      // Si le joueur a 3 matchs ou plus dans cette équipe inférieure, il est brûlé dans l'équipe actuelle
      if (matchCountInLowerTeam >= 3) {
        // Prendre la plus basse équipe où il est brûlé (numéro le plus élevé)
        if (highestBurnedTeam === null || currentTeamNumber > highestBurnedTeam) {
          highestBurnedTeam = currentTeamNumber;
        }
        break; // Une seule équipe inférieure suffit pour brûler
      }
    }
  }
  
  return highestBurnedTeam;
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

  const isFemaleTeam = equipe.matches.some((match) => match.isFemale === true);
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

  const championshipType = isFemaleTeam ? "feminin" : "masculin";
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
    ? calculateFutureBurnoutParis(matchesByTeamByPhase, teamNumber)
    : calculateFutureBurnout(matchesByTeamByPhase, teamNumber);
  
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

  const isFemaleTeam = equipe.matches.some((match) => match.isFemale === true);
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

/**
 * Vérifie si une équipe fait partie du championnat de Paris
 */
export const isParisChampionship = (
  equipe: EquipeWithMatches
): boolean => {
  // Vérifier via idEpreuve
  const match = equipe.matches[0];
  if (match?.idEpreuve === ID_EPREUVE_PARIS) {
    return true;
  }
  
  // Vérifier via l'épreuve de l'équipe
  const epreuve = getMatchEpreuve(match || {}, equipe.team);
  if (epreuve === "championnat_paris") {
    return true;
  }
  
  // Fallback : vérifier le libellé de l'épreuve ou la division
  const epreuveLibelle = equipe.team.epreuve?.toLowerCase() || "";
  const division = equipe.team.division?.toLowerCase() || "";
  
  return (
    epreuveLibelle.includes("paris idf") ||
    epreuveLibelle.includes("excellence") ||
    division.includes("excellence") ||
    division.includes("paris idf")
  );
};

/**
 * Détermine la structure d'une équipe du championnat de Paris selon sa division
 * @returns { groups: number, playersPerGroup: number, totalPlayers: number } ou null si non applicable
 */
export const getParisTeamStructure = (
  division: string
): { groups: number; playersPerGroup: number; totalPlayers: number } | null => {
  const divisionLower = division.toLowerCase();
  
  // 3 groupes (9 joueurs) : EXCELLENCE, PROMO EXCELLENCE, HONNEUR
  if (
    divisionLower.includes("excellence") ||
    divisionLower.includes("honneur")
  ) {
    return { groups: 3, playersPerGroup: 3, totalPlayers: 9 };
  }
  
  // 2 groupes (6 joueurs) : DIVISION 1
  if (divisionLower.includes("division 1") || divisionLower.includes("div 1")) {
    return { groups: 2, playersPerGroup: 3, totalPlayers: 6 };
  }
  
  // 1 groupe (3 joueurs) : DIVISION 2
  if (divisionLower.includes("division 2") || divisionLower.includes("div 2")) {
    return { groups: 1, playersPerGroup: 3, totalPlayers: 3 };
  }
  
  return null;
};

/**
 * Valide l'ordre des points dans les groupes (Article 8 du championnat de Paris)
 * Chaque joueur du groupe 2 doit avoir des points ≤ groupe 1 et ≥ groupe 3
 * Permutation possible dans un même groupe
 */
export const validateParisGroupPointsOrder = (
  players: Player[],
  structure: { groups: number; playersPerGroup: number; totalPlayers: number }
): { valid: boolean; reason?: string } => {
  if (structure.groups < 2) {
    // Pas de validation nécessaire pour 1 seul groupe
    return { valid: true };
  }
  
  if (players.length !== structure.totalPlayers) {
    // Pas encore complet, pas de validation
    return { valid: true };
  }
  
  // Trier les joueurs par points décroissants (les meilleurs en premier)
  const sortedPlayers = [...players].sort((a, b) => {
    const pointsA = a.points ?? 0;
    const pointsB = b.points ?? 0;
    return pointsB - pointsA; // Décroissant
  });
  
  // Diviser les joueurs triés en groupes
  const groups: Player[][] = [];
  for (let i = 0; i < structure.groups; i++) {
    const start = i * structure.playersPerGroup;
    const end = start + structure.playersPerGroup;
    groups.push(sortedPlayers.slice(start, end));
  }
  
  // Pour chaque groupe, trouver min et max des points
  const groupRanges = groups.map((group) => {
    const points = group.map((p) => p.points || 0);
    return {
      min: Math.min(...points),
      max: Math.max(...points),
    };
  });
  
  // Vérifier que groupe 2 respecte les contraintes
  if (structure.groups >= 2) {
    const group1Max = groupRanges[0].max;
    // const group2Min = groupRanges[1].min;
    // const group2Max = groupRanges[1].max;
    
    // Chaque joueur du groupe 2 doit avoir ≤ max du groupe 1
    const group2Players = groups[1];
    const invalidGroup2Players = group2Players.filter(
      (p) => (p.points || 0) > group1Max
    );
    
    if (invalidGroup2Players.length > 0) {
      const playerNames = invalidGroup2Players
        .map((p) => `${p.firstName} ${p.name} (${p.points || 0} pts)`)
        .join(", ");
      return {
        valid: false,
        reason: `Article 8 : Les joueurs du groupe 2 doivent avoir des points ≤ ${group1Max} pts (max du groupe 1). Joueurs non conformes : ${playerNames}`,
      };
    }
    
    // Si groupe 3 existe, chaque joueur du groupe 2 doit avoir ≥ min du groupe 3
    if (structure.groups >= 3) {
      const group3Min = groupRanges[2].min;
      const invalidGroup2PlayersMin = group2Players.filter(
        (p) => (p.points || 0) < group3Min
      );
      
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

/**
 * Vérifie si un joueur est brûlé selon les règles du championnat de Paris
 * Un joueur est brûlé s'il a joué 3 fois ou plus dans UNE équipe de numéro inférieur
 */
export const isPlayerBurnedParis = (
  player: Player,
  teamNumber: number,
  phase: PhaseType
): boolean => {
  // Pour le championnat de Paris, utiliser highestTeamNumberByPhaseParis
  const burnedTeam = player.highestTeamNumberByPhaseParis?.[phase];
  
  if (burnedTeam === undefined || burnedTeam === null) {
    return false;
  }
  
  // Vérifier si le joueur a au moins 3 matchs dans UNE équipe inférieure
  // En regardant les matchs par équipe pour le championnat de Paris
  const matchesByTeam = player.matchesByTeamByPhaseParis?.[phase];
  if (!matchesByTeam) {
    return false;
  }
  
  // Vérifier s'il y a une équipe de numéro inférieur où le joueur a joué 3 fois ou plus
  for (const [teamNumStr, matchCount] of Object.entries(matchesByTeam)) {
    const teamNum = parseInt(teamNumStr, 10);
    if (teamNum < teamNumber && matchCount >= 3) {
      return true; // Le joueur a 3+ matchs dans cette équipe inférieure
    }
  }
  
  return false;
};

/**
 * Valide le brûlage par groupe selon l'Article 12 du championnat de Paris
 * Pour équipes 2, 3, 4, etc., max 1 joueur brûlé par groupe de 3
 * Si 2 joueurs brûlés dans un groupe de 3, les 2 sont non qualifiés
 */
export const validateParisBurnoutByGroup = (
  players: Player[],
  teamNumber: number,
  structure: { groups: number; playersPerGroup: number; totalPlayers: number },
  phase: PhaseType
): { valid: boolean; reason?: string; offendingPlayerIds?: string[] } => {
  // Cette règle ne s'applique que pour les équipes 2, 3, 4, etc. (pas l'équipe 1)
  if (teamNumber <= 1) {
    return { valid: true };
  }
  
  if (players.length !== structure.totalPlayers) {
    // Pas encore complet, pas de validation
    return { valid: true };
  }
  
  // Diviser les joueurs en groupes
  const groups: Player[][] = [];
  for (let i = 0; i < structure.groups; i++) {
    const start = i * structure.playersPerGroup;
    const end = start + structure.playersPerGroup;
    groups.push(players.slice(start, end));
  }
  
  // Vérifier chaque groupe de 3
  for (let groupIndex = 0; groupIndex < groups.length; groupIndex++) {
    const group = groups[groupIndex];
    const burnedPlayers = group.filter((p) =>
      isPlayerBurnedParis(p, teamNumber, phase)
    );
    
    if (burnedPlayers.length > 1) {
      const playerNames = burnedPlayers
        .map((p) => `${p.firstName} ${p.name}`)
        .join(", ");
      return {
        valid: false,
        reason: `Article 12 : Groupe ${groupIndex + 1} : maximum 1 joueur brûlé par groupe de 3. ${burnedPlayers.length} joueurs brûlés détectés : ${playerNames}. Les 2 joueurs sont non qualifiés.`,
        offendingPlayerIds: burnedPlayers.map((p) => p.id),
      };
    }
  }
  
  return { valid: true };
};


