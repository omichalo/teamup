import { FFTTAPI } from "@omichalo/ffttapi-node";
import * as functions from "firebase-functions";
import {
  FFTTEquipe,
  FFTTJoueur,
  FFTTRencontre,
  FFTTDetailsRencontre,
} from "./fftt-types";

// Configuration FFTT partagée pour Cloud Functions
export const getFFTTConfig = () => ({
  id: functions.config().fftt?.id || "SW251",
  pwd: functions.config().fftt?.pwd || "XpZ31v56Jr",
  clubCode: functions.config().fftt?.club_code || "08781477",
});

// Instance FFTT API partagée
export const createFFTTAPI = () => {
  const config = getFFTTConfig();
  return new FFTTAPI(config.id, config.pwd);
};

// Utilitaires pour extraire les informations des équipes
export const extractTeamNumber = (libelle: string): number => {
  // Supporte les formats :
  // - "SQY PING 3"
  // - "SQY PING (3)"
  // - "SQY PING 3 - Phase 1"
  // - "SQY PING (3) - Phase 1"
  // Cherche d'abord le format avec parenthèses, puis sans
  const matchWithParentheses = libelle.match(/SQY PING\s*\((\d+)\)/i);
  if (matchWithParentheses) {
    return parseInt(matchWithParentheses[1], 10);
  }
  const match = libelle.match(/SQY PING\s*(\d+)/i);
  return match ? parseInt(match[1], 10) : 0;
};

export const isFemaleTeam = (libelle: string): boolean => {
  return libelle.includes("(DAMES)") || libelle.includes("Dames");
};

export const extractClubName = (libelle: string): string => {
  // Supprime "SQY PING (1) - Phase 1" ou "SQY PING 1 - Phase 1" du libellé
  return libelle
    .replace(/SQY PING\s*\(\d+\)\s*-\s*Phase\s*\d+/i, "")
    .replace(/SQY PING\s*\d+\s*-\s*Phase\s*\d+/i, "")
    .trim();
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
  if (ourScore < opponentScore) return "DÉFAITE";
  return "ÉGALITÉ";
};

// Utilitaires pour extraire les IDs des rencontres
export const extractRencontreId = (lien: string): string => {
  const match = lien.match(/renc_id=(\d+)/);
  return match ? match[1] : "";
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
  clubCode: string,
  ffttApi: FFTTAPI
): Promise<FFTTDetailsRencontre> => {
  try {
    console.log(
      `🔍 Enrichissement des données joueurs pour le club ${clubCode}`
    );

    // Récupérer tous les joueurs du club
    const joueursClub = await ffttApi.getJoueursByClub(clubCode);
    console.log(
      `📋 ${joueursClub.length} joueurs trouvés pour le club ${clubCode}`
    );

    // Créer une map pour un accès rapide
    const joueursMap = new Map<string, FFTTJoueur>();
    joueursClub.forEach((joueur: FFTTJoueur) => {
      if (joueur.licence) {
        joueursMap.set(joueur.licence, joueur as FFTTJoueur);
      }
    });

    // Enrichir les joueurs de l'équipe A
    detailsRencontre.joueursA = detailsRencontre.joueursA.map((joueur) => {
      const joueurClub = joueursMap.get(joueur.licence);
      if (joueurClub) {
        console.log(
          `✅ Enrichissement: ${joueur.prenom} ${joueur.nom} -> licence: ${joueurClub.licence}, points: ${joueurClub.points}`
        );
        return {
          ...joueur,
          licence: joueurClub.licence,
          points: joueurClub.points,
          sexe: joueurClub.sexe || joueur.sexe,
        };
      }
      return joueur;
    });

    // Enrichir les joueurs de l'équipe B
    detailsRencontre.joueursB = detailsRencontre.joueursB.map((joueur) => {
      const joueurClub = joueursMap.get(joueur.licence);
      if (joueurClub) {
        console.log(
          `✅ Enrichissement: ${joueur.prenom} ${joueur.nom} -> licence: ${joueurClub.licence}, points: ${joueurClub.points}`
        );
        return {
          ...joueur,
          licence: joueurClub.licence,
          points: joueurClub.points,
          sexe: joueurClub.sexe || joueur.sexe,
        };
      }
      return joueur;
    });

    return detailsRencontre;
  } catch (error) {
    console.error(
      "❌ Erreur lors de l'enrichissement des données joueurs:",
      error
    );
    return detailsRencontre;
  }
};

// Fonction pour créer un match de base
export const createBaseMatch = (
  rencontre: FFTTRencontre,
  equipe: FFTTEquipe
) => {
  const teamNumber = extractTeamNumber(equipe.libelle);
  const isFemale = isFemaleTeam(equipe.libelle);
  const isHome = rencontre.nomEquipeA.includes("SQY PING");
  const opponent = isHome ? rencontre.nomEquipeB : rencontre.nomEquipeA;
  const opponentClub = extractClubName(opponent);

  return {
    id: `match_${equipe.idEquipe}_${teamNumber}_${rencontre.lien}`,
    ffttId: rencontre.lien,
    teamNumber,
    opponent: opponentClub,
    opponentClub,
    date: rencontre.dateReelle || rencontre.datePrevue || new Date(),
    location: isHome ? "SQY Ping" : opponentClub,
    isHome,
    isExempt: false,
    isForfeit: false,
    phase: determinePhaseFromDivision(equipe.division),
    journee: 1, // Sera calculé plus tard
    isFemale,
    division: equipe.division,
    teamId: `${teamNumber}_${isFemale ? "F" : "M"}`,
    epreuve: equipe.libelleEpreuve,
    score:
      rencontre.scoreEquipeA !== null && rencontre.scoreEquipeB !== null
        ? `${rencontre.scoreEquipeA}-${rencontre.scoreEquipeB}`
        : undefined,
    result: determineMatchResult(
      rencontre.scoreEquipeA,
      rencontre.scoreEquipeB,
      isHome
    ),
    rencontreId: extractRencontreId(rencontre.lien),
    equipeIds: extractEquipeIds(rencontre.lien),
    lienDetails: rencontre.lien,
    resultatsIndividuels: undefined,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
};

