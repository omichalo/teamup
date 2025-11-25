import { FFTTAPI } from "@omichalo/ffttapi-node";
import {
  FFTTEquipe,
  FFTTJoueur,
  FFTTRencontre,
  FFTTDetailsRencontre,
} from "./fftt-types";
import { Player } from "@/types/team-management";

// Configuration FFTT partagée
export const getFFTTConfig = () => {
  if (!process.env.ID_FFTT || !process.env.PWD_FFTT) {
    throw new Error(
      "FFTT credentials (ID_FFTT and PWD_FFTT) are required as environment variables"
    );
  }

  return {
    id: process.env.ID_FFTT,
    pwd: process.env.PWD_FFTT,
    clubCode: process.env.CLUB_CODE || "08781477",
  };
};

// Instance FFTT API partagée
export const createFFTTAPI = () => {
  const config = getFFTTConfig();
  return new FFTTAPI(config.id, config.pwd);
};

// Utilitaires pour extraire les informations des équipes
export const extractTeamNumber = (libelle: string): number => {
  // Supporte les formats : "SQY PING 3", "SQY PING 3 - Phase 1", etc.
  const match = libelle.match(/SQY PING\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
};

export const isFemaleTeam = (
  libelle: string,
  division?: string,
  libelleEpreuve?: string,
  idEpreuve?: number
): boolean => {
  // Vérifier d'abord l'ID d'épreuve (le plus fiable)
  // 15955 = Championnat de France par Equipes Féminin
  if (idEpreuve === 15955) {
    return true;
  }
  // 15954 = Championnat de France par Equipes Masculin (probablement)
  if (idEpreuve === 15954) {
    return false;
  }

  // Vérifier le libellé de l'épreuve (très fiable)
  if (libelleEpreuve) {
    if (libelleEpreuve.toLowerCase().includes("féminin")) {
      return true;
    }
    if (libelleEpreuve.toLowerCase().includes("masculin")) {
      return false;
    }
  }

  // Vérifier la division (fiable)
  if (division) {
    const divisionLower = division.toLowerCase();
    if (divisionLower.includes("dames") || divisionLower.includes("féminin")) {
      return true;
    }
    if (divisionLower.includes("hommes") || divisionLower.includes("masculin")) {
      return false;
    }
  }

  // Fallback: vérifier le libellé (peut être trompeur)
  const libelleLower = libelle.toLowerCase();
  if (libelleLower.includes("(dames)") || libelleLower.includes("dames")) {
    return true;
  }
  if (libelleLower.includes("(hommes)") || libelleLower.includes("hommes")) {
    return false;
  }

  // Par défaut, considérer comme masculin si aucune indication
  return false;
};

export const extractClubName = (libelle: string): string => {
  return libelle.replace(/SQY PING \d+ - Phase \d+/, "").trim();
};

// Utilitaires pour déterminer la phase et le résultat
export const determinePhaseFromDivision = (division: string): string => {
  if (division.includes("Phase 1")) return "aller";
  if (division.includes("Phase 2")) return "retour";
  return "aller";
};

export const determineMatchResult = (
  scoreA: number | null,
  scoreB: number | null,
  isHome: boolean
): string => {
  if (scoreA === null || scoreB === null) return "À VENIR";

  const ourScore = isHome ? scoreA : scoreB;
  const opponentScore = isHome ? scoreB : scoreA;

  if (ourScore > opponentScore) return "VICTOIRE";
  if (ourScore < opponentScore) return "DEFAITE";
  return "NUL";
};

// Utilitaires pour extraire les IDs des rencontres
export const extractRencontreId = (lien: string): string => {
  const match = lien.match(/renc_id=(\d+)/);
  return match ? match[1] : "";
};

/**
 * Extrait le numéro de journée depuis le libellé de la rencontre ou depuis le lien
 * Le libellé peut contenir "tour n°5" ou similaire
 * Le lien peut contenir des paramètres comme "tour=" ou "journee="
 */
export const extractJournee = (libelle?: string, lien?: string): number => {
  // Essayer d'abord depuis le libellé
  if (libelle) {
    // Chercher "tour n°X" ou "tour N°X" (insensible à la casse)
    const tourMatch = libelle.match(/tour\s*n[°°]\s*(\d+)/i);
    if (tourMatch) {
      return parseInt(tourMatch[1], 10);
    }
    
    // Chercher "journée X" ou "journee X"
    const journeeMatch = libelle.match(/journ[ée]e\s*(\d+)/i);
    if (journeeMatch) {
      return parseInt(journeeMatch[1], 10);
    }
    
    // Chercher "JX" ou "J X"
    const jMatch = libelle.match(/j\s*(\d+)/i);
    if (jMatch) {
      return parseInt(jMatch[1], 10);
    }
  }
  
  // Si pas trouvé dans le libellé, essayer depuis le lien
  if (lien) {
    // Chercher "tour=5" ou "journee=5"
    const tourParamMatch = lien.match(/(?:tour|journee)=(\d+)/i);
    if (tourParamMatch) {
      return parseInt(tourParamMatch[1], 10);
    }
  }
  
  // Par défaut, retourner 1 (sera recalculé plus tard si nécessaire)
  return 1;
};

export const extractEquipeIds = (
  lien: string
): { equipe1: string; equipe2: string } => {
  const match1 = lien.match(/equip_id1=(\d+)/);
  const match2 = lien.match(/equip_id2=(\d+)/);
  return {
    equipe1: match1 ? match1[1] : "",
    equipe2: match2 ? match2[1] : "",
  };
};

// Fonction pour enrichir les données des joueurs
export const enrichPlayerData = async (
  detailsRencontre: FFTTDetailsRencontre,
  _clubCode: string,
  ffttApi: FFTTAPI
): Promise<FFTTDetailsRencontre> => {
  try {
    // Récupérer tous les joueurs du club
    const joueursClub = await ffttApi.getJoueursByClub(_clubCode);

    // Créer une map pour un accès rapide
    const joueursMap = new Map<string, FFTTJoueur>();
    joueursClub.forEach((joueur) => {
      const j = joueur as unknown as Record<string, unknown>;
      const ffttJoueur: FFTTJoueur = {
        licence: String(j.licence || ""),
        nom: String(j.nom || ""),
        prenom: String(j.prenom || ""),
        points: typeof j.points === "number" ? j.points : j.points === null ? null : undefined,
      };
      if (j.sexe) {
        ffttJoueur.sexe = String(j.sexe);
      }
      if (j.club) {
        ffttJoueur.club = String(j.club);
      }
      if (ffttJoueur.licence) {
        joueursMap.set(ffttJoueur.licence, ffttJoueur);
      }
    });

    // Enrichir les joueurs de l&apos;équipe A
    detailsRencontre.joueursA = detailsRencontre.joueursA.map((joueur) => {
      const joueurClub = joueursMap.get(joueur.licence);
      if (joueurClub) {
        const result: FFTTJoueur = {
          ...joueur,
          licence: joueurClub.licence,
          points: joueurClub.points,
        };
        if (joueurClub.sexe) {
          result.sexe = joueurClub.sexe;
        } else if (joueur.sexe) {
          result.sexe = joueur.sexe;
        }
        return result;
      }
      return joueur;
    });

    // Enrichir les joueurs de l&apos;équipe B
    detailsRencontre.joueursB = detailsRencontre.joueursB.map((joueur) => {
      const joueurClub = joueursMap.get(joueur.licence);
      if (joueurClub) {
        const result: FFTTJoueur = {
          ...joueur,
          licence: joueurClub.licence,
          points: joueurClub.points,
        };
        if (joueurClub.sexe) {
          result.sexe = joueurClub.sexe;
        } else if (joueur.sexe) {
          result.sexe = joueur.sexe;
        }
        return result;
      }
      return joueur;
    });

    return detailsRencontre;
  } catch (error) {
    console.error(
      "❌ Erreur lors de l&apos;enrichissement des données joueurs:",
      error
    );
    return detailsRencontre;
  }
};

// Fonction pour créer un match de base
export const createBaseMatch = (
  rencontre: FFTTRencontre,
  equipe: FFTTEquipe,
  detailsRencontre?: FFTTDetailsRencontre
) => {
  const teamNumber = extractTeamNumber(equipe.libelle);
  // Utiliser le booléen isFemale de l'équipe si disponible, sinon le calculer avec toutes les informations disponibles
  const isFemale =
    equipe.isFemale !== undefined
      ? equipe.isFemale
      : isFemaleTeam(
          equipe.libelle,
          equipe.division,
          equipe.libelleEpreuve,
          equipe.idEpreuve
        );
  const isHome = rencontre.nomEquipeA.includes("SQY PING");
  const opponent = isHome ? rencontre.nomEquipeB : rencontre.nomEquipeA;
  const opponentClub = extractClubName(opponent);

  // Extraire les joueurs des détails de la rencontre
  type MatchPlayer = {
    id: string; // Généré à partir de la licence si disponible, sinon généré
    licence?: string;
    nom?: string;
    prenom?: string;
    points?: number;
    sexe?: string;
  };
  let joueursSQY: MatchPlayer[] = [];
  let joueursAdversaires: MatchPlayer[] = [];

  if (detailsRencontre) {
    // Convertir les objets vides en tableaux vides si nécessaire
    const joueursA = Array.isArray(detailsRencontre.joueursA)
      ? detailsRencontre.joueursA
      : detailsRencontre.joueursA &&
        Object.keys(detailsRencontre.joueursA).length > 0
      ? Object.values(detailsRencontre.joueursA)
      : [];

    const joueursB = Array.isArray(detailsRencontre.joueursB)
      ? detailsRencontre.joueursB
      : detailsRencontre.joueursB &&
        Object.keys(detailsRencontre.joueursB).length > 0
      ? Object.values(detailsRencontre.joueursB)
      : [];

    // L&apos;API FFTT retourne parfois les équipes dans l&apos;ordre inverse
    // Vérifier quelle équipe est vraiment SQY PING dans les noms des équipes
    const isSQYInA =
      detailsRencontre.nomEquipeA &&
      detailsRencontre.nomEquipeA.includes("SQY PING");
    const isSQYInB =
      detailsRencontre.nomEquipeB &&
      detailsRencontre.nomEquipeB.includes("SQY PING");

    // Fonction helper pour ajouter un id à partir de la licence
    const addIdToPlayers = (players: unknown[]): MatchPlayer[] => {
      return players.map((p, index) => {
        const player = p as Record<string, unknown>;
        const licence = player.licence ? String(player.licence) : undefined;
        const id = licence || `player_${index}_${Date.now()}`;
        const result: MatchPlayer = {
          id,
        };
        if (licence) {
          result.licence = licence;
        }
        if (player.nom) {
          result.nom = String(player.nom);
        }
        if (player.prenom) {
          result.prenom = String(player.prenom);
        }
        if (typeof player.points === "number") {
          result.points = player.points;
        }
        if (player.sexe) {
          result.sexe = String(player.sexe);
        }
        return result;
      });
    };

    if (isSQYInA) {
      // SQY PING est l&apos;équipe A, donc joueursA = SQY PING
      joueursSQY = addIdToPlayers(joueursA);
      joueursAdversaires = addIdToPlayers(joueursB);
    } else if (isSQYInB) {
      // SQY PING est l&apos;équipe B, donc joueursB = SQY PING
      joueursSQY = addIdToPlayers(joueursB);
      joueursAdversaires = addIdToPlayers(joueursA);
    } else {
      // Fallback: utiliser la logique isHome
      if (isHome) {
        joueursSQY = addIdToPlayers(joueursA);
        joueursAdversaires = addIdToPlayers(joueursB);
      } else {
        joueursSQY = addIdToPlayers(joueursB);
        joueursAdversaires = addIdToPlayers(joueursA);
      }
    }
  }

  // Extraire le numéro de journée depuis le libellé ou le lien de la rencontre
  const journee = extractJournee(rencontre.libelle, rencontre.lien);

  // Déterminer les scores : utiliser ceux de rencontre en priorité, sinon ceux de detailsRencontre
  let scoreA: number | null = rencontre.scoreEquipeA;
  let scoreB: number | null = rencontre.scoreEquipeB;
  
  // Si les scores ne sont pas disponibles dans rencontre, essayer dans detailsRencontre
  if ((scoreA === null || scoreB === null) && detailsRencontre) {
    // Essayer d'abord scoreEquipeA/scoreEquipeB (si présents)
    if (scoreA === null && typeof detailsRencontre.scoreEquipeA === "number") {
      scoreA = detailsRencontre.scoreEquipeA;
    }
    if (scoreB === null && typeof detailsRencontre.scoreEquipeB === "number") {
      scoreB = detailsRencontre.scoreEquipeB;
    }
    
    // Sinon, essayer expectedScoreEquipeA/expectedScoreEquipeB
    if (scoreA === null && typeof detailsRencontre.expectedScoreEquipeA === "number") {
      scoreA = detailsRencontre.expectedScoreEquipeA;
    }
    if (scoreB === null && typeof detailsRencontre.expectedScoreEquipeB === "number") {
      scoreB = detailsRencontre.expectedScoreEquipeB;
    }
    
    // Si toujours pas de scores, calculer depuis les parties individuelles
    if ((scoreA === null || scoreB === null) && detailsRencontre.parties && detailsRencontre.parties.length > 0) {
      let calculatedScoreA = 0;
      let calculatedScoreB = 0;
      
      detailsRencontre.parties.forEach((partie) => {
        if (partie.scoreA > partie.scoreB) {
          calculatedScoreA++;
        } else if (partie.scoreB > partie.scoreA) {
          calculatedScoreB++;
        }
        // En cas d'égalité, aucun point n'est ajouté
      });
      
      if (scoreA === null && calculatedScoreA > 0) {
        scoreA = calculatedScoreA;
      }
      if (scoreB === null && calculatedScoreB > 0) {
        scoreB = calculatedScoreB;
      }
      
      // Utiliser les scores calculés même s'ils sont à 0 (match non joué ou forfait)
      if (scoreA === null) {
        scoreA = calculatedScoreA;
      }
      if (scoreB === null) {
        scoreB = calculatedScoreB;
      }
    }
  }

  return {
    id: extractRencontreId(rencontre.lien), // Utiliser uniquement le renc_id comme ID stable
    ffttId: rencontre.lien,
    teamId: equipe.idEquipe.toString(), // Ajouter l&apos;ID de l&apos;équipe pour le mapping
    teamNumber,
    opponent: opponentClub,
    opponentClub,
    date: rencontre.dateReelle || rencontre.datePrevue || new Date(),
    location: isHome ? "SQY Ping" : opponentClub,
    isHome,
    isExempt: false,
    isForfeit: false,
    phase: determinePhaseFromDivision(equipe.division),
    journee,
    isFemale,
    division: equipe.division,
    epreuve: equipe.libelleEpreuve,
    ...(scoreA !== null && scoreB !== null
      ? { score: `${scoreA}-${scoreB}` }
      : {}),
    result: determineMatchResult(
      scoreA,
      scoreB,
      isHome
    ),
    rencontreId: extractRencontreId(rencontre.lien),
    equipeIds: extractEquipeIds(rencontre.lien),
    lienDetails: rencontre.lien,
    resultatsIndividuels: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
    // Informations des joueurs pour les conditions de brûlage
    ...(joueursSQY.length > 0 ? { joueursSQY } : {}),
    ...(joueursAdversaires.length > 0 ? { joueursAdversaires } : {}),
  };
};

/**
 * Parse la division pour extraire le niveau (1, 2, 3) et la catégorie (M, F)
 * Format attendu : "FED_Nationale 2 Dames Phase 1 Poule 2"
 */
export const parseDivisionInfo = (
  division: string
): { level: "1" | "2" | "3" | null; category: "M" | "F" } => {
  const divisionLower = division.toLowerCase();

  // Extraire le niveau (Nationale 1, 2, ou 3)
  let level: "1" | "2" | "3" | null = null;
  const nationale1Match = divisionLower.match(/nationale\s*1/);
  const nationale2Match = divisionLower.match(/nationale\s*2/);
  const nationale3Match = divisionLower.match(/nationale\s*3/);

  if (nationale1Match) {
    level = "1";
  } else if (nationale2Match) {
    level = "2";
  } else if (nationale3Match) {
    level = "3";
  }

  // Détecter la catégorie (Dames = F, sinon M)
  const category: "M" | "F" = divisionLower.includes("dames") ||
    divisionLower.includes("féminin")
    ? "F"
    : "M";

  return { level, category };
};

/**
 * Valide les règles FFTT pour une composition d'équipe
 * Règles :
 * - Messieurs N1 : tous ≥ 1800 pts
 * - Messieurs N2 : tous ≥ 1600 pts
 * - Messieurs N3 : tous ≥ 1400 pts
 * - Dames N1 : toutes ≥ 1100 pts
 * - Dames N2 : au moins 2 sur 4 ≥ 900 pts
 */
export const validateFFTTRules = (
  players: Player[],
  division: string,
  isFemale: boolean
): { valid: boolean; reason?: string } => {
  // Extraire les infos de division
  const { level, category } = parseDivisionInfo(division);

  // Si la division n'est pas reconnue (pas Nationale 1/2/3), autoriser
  if (level === null) {
    return { valid: true };
  }

  // Vérifier que la catégorie correspond
  const expectedCategory = isFemale ? "F" : "M";
  if (category !== expectedCategory) {
    // Si la catégorie ne correspond pas, on utilise quand même la catégorie détectée
    // (au cas où la division serait mal étiquetée)
  }

  // Utiliser la catégorie détectée pour les règles
  const effectiveCategory = category;

  // Récupérer les points des joueurs (0 si undefined/null)
  const playerPoints = players.map((p) => p.points || 0);

  // Appliquer les règles selon le niveau et la catégorie
  if (effectiveCategory === "M") {
    // Règles Messieurs
    let minPoints: number;
    if (level === "1") {
      minPoints = 1800;
    } else if (level === "2") {
      minPoints = 1600;
    } else if (level === "3") {
      minPoints = 1400;
    } else {
      return { valid: true }; // Niveau non reconnu, autoriser
    }

    // Tous les joueurs doivent avoir ≥ minPoints
    const playersBelowMin = players
      .map((p, idx) => ({
        player: p,
        points: playerPoints[idx],
      }))
      .filter(({ points }) => points < minPoints);
    
    if (playersBelowMin.length > 0) {
      const playerNames = playersBelowMin
        .map(({ player, points }) => `${player.firstName} ${player.name} (${points} pts)`)
        .join(", ");
      return {
        valid: false,
        reason: `Nationale ${level} Messieurs : tous les joueurs doivent avoir ≥ ${minPoints} pts. Joueurs non conformes : ${playerNames}`,
      };
    }
  } else {
    // Règles Dames
    if (level === "1") {
      // Dames N1 : toutes ≥ 1100 pts
      const minPoints = 1100;
      const playersBelowMin = players
        .map((p, idx) => ({
          player: p,
          points: playerPoints[idx],
        }))
        .filter(({ points }) => points < minPoints);
      
      if (playersBelowMin.length > 0) {
        const playerNames = playersBelowMin
          .map(({ player, points }) => `${player.firstName} ${player.name} (${points} pts)`)
          .join(", ");
        return {
          valid: false,
          reason: `Nationale ${level} Dames : toutes les joueuses doivent avoir ≥ ${minPoints} pts. Joueuses non conformes : ${playerNames}`,
        };
      }
    } else if (level === "2") {
      // Dames N2 : au moins 2 sur 4 ≥ 900 pts
      // Cela signifie qu'au maximum 2 joueuses peuvent avoir < 900 pts
      // Donc si on essaie d'ajouter une joueuse < 900 pts alors qu'il y en a déjà 2 < 900 pts, on bloque
      const minPoints = 900;
      
      // Compter les joueuses avec < 900 pts dans l'équipe (en excluant la dernière joueuse qu'on essaie d'ajouter)
      // La dernière joueuse dans la liste est celle qu'on essaie d'ajouter
      // Note: playersWithoutLast pourrait être utilisé pour filtrer les joueuses existantes
      // Pour l'instant, on compte toutes les joueuses dans players
      // const playersWithoutLast = players.slice(0, -1);
      const pointsWithoutLast = playerPoints.slice(0, -1);
      const playersBelowMinWithoutLast = pointsWithoutLast.filter((pts) => pts < minPoints);
      
      const lastPlayer = players[players.length - 1];
      const lastPlayerPoints = playerPoints[playerPoints.length - 1];
      
      // Si on essaie d'ajouter une joueuse < 900 pts et qu'il y a déjà 2 joueuses < 900 pts
      if (lastPlayerPoints < minPoints && playersBelowMinWithoutLast.length >= 2) {
        return {
          valid: false,
          reason: `Nationale ${level} Dames : au moins 2 joueuses sur 4 doivent avoir ≥ ${minPoints} pts. Il y a déjà ${playersBelowMinWithoutLast.length} joueuse(s) < ${minPoints} pts. Impossible d'ajouter une 3ème joueuse < ${minPoints} pts (${lastPlayer.firstName} ${lastPlayer.name} avec ${lastPlayerPoints} pts).`,
        };
      }
      
      // Si on a moins de 2 joueuses < 900 pts, on peut ajouter une joueuse < 900 pts
      // Une fois qu'on a 2 joueuses ≥ 900 pts, on peut aussi ajouter n'importe qui (la règle sera respectée)
    }
  }

  return { valid: true };
};
