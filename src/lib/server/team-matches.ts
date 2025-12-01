import type { Firestore } from "firebase-admin/firestore";
import { Timestamp } from "firebase-admin/firestore";

// Fonction helper pour convertir les Timestamps Firestore en Date
function convertFirestoreTimestamp(value: unknown): Date | null {
  if (!value) {
    return null;
  }
  
  // Vérifier si c'est un Timestamp Firestore Admin (avec méthode toDate)
  if (value && typeof value === "object" && "toDate" in value && typeof (value as { toDate: () => Date }).toDate === "function") {
    return (value as { toDate: () => Date }).toDate();
  }
  
  // Vérifier si c'est un Timestamp Firestore avec structure { _seconds, _nanoseconds }
  if (value && typeof value === "object" && "_seconds" in value && typeof (value as { _seconds: number })._seconds === "number") {
    const seconds = (value as { _seconds: number })._seconds;
    const nanoseconds = (value as { _nanoseconds?: number })._nanoseconds || 0;
    return new Date(seconds * 1000 + nanoseconds / 1000000);
  }
  
  // Vérifier si c'est une instance Timestamp
  if (value instanceof Timestamp) {
    return value.toDate();
  }
  
  // Vérifier si c'est déjà une Date
  if (value instanceof Date) {
    return value;
  }
  
  // Vérifier si c'est une chaîne ISO
  if (typeof value === "string") {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  
  return null;
}

export interface TeamMatch {
  id: string;
  ffttId?: string;
  teamNumber?: number;
  opponent?: string;
  opponentClub?: string;
  date: Date;
  location?: string;
  isHome?: boolean;
  isExempt?: boolean;
  isForfeit?: boolean;
  phase?: string;
  journee?: number;
  isFemale?: boolean;
  division?: string;
  teamId?: string;
  epreuve?: string;
  score?: unknown;
  result?: string;
  rencontreId?: string;
  equipeIds?: unknown;
  lienDetails?: string;
  resultatsIndividuels?: unknown;
  joueursSQY: unknown[];
  joueursAdversaires: unknown[];
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamSummary {
  id: string;
  name: string;
  division: string;
  isFemale?: boolean;
  teamNumber: number;
  location?: string; // ID du lieu (ville) associé à l'équipe
  discordChannelId?: string; // ID du canal Discord associé à l'équipe
  epreuve?: string; // Libellé de l'épreuve FFTT
  idEpreuve?: number; // ID de l'épreuve FFTT (15954, 15955, 15980, etc.)
  createdAt: Date;
  updatedAt: Date;
}

export async function getTeams(firestore: Firestore): Promise<TeamSummary[]> {
  const teamsSnapshot = await firestore.collection("teams").get();

  const teams: TeamSummary[] = [];
  teamsSnapshot.forEach((doc) => {
    const data = doc.data();
    teams.push({
      id: doc.id,
      name: data.name,
      division: data.division,
      isFemale: data.isFemale,
      teamNumber: data.number || data.teamNumber,
      location: data.location,
      discordChannelId: data.discordChannelId,
      epreuve: data.epreuve,
      idEpreuve: data.idEpreuve,
      createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
    });
  });

  teams.sort((a, b) => (a.teamNumber || 0) - (b.teamNumber || 0));

  return teams;
}

export async function getTeamMatches(
  firestore: Firestore,
  teamId: string
): Promise<TeamMatch[]> {
  const matchesSnapshot = await firestore
    .collection("teams")
    .doc(teamId)
    .collection("matches")
    .get();

  const matches: TeamMatch[] = [];

  matchesSnapshot.forEach((doc) => {
    const data = doc.data();
    
    // Convertir la date correctement depuis Firestore Timestamp
    const matchDate = convertFirestoreTimestamp(data.date) || (() => {
      console.warn(`⚠️ [getTeamMatches] Date invalide ou manquante pour le match ${doc.id}:`, data.date);
      return new Date();
    })();
    
    matches.push({
      id: doc.id,
      ffttId: data.ffttId,
      teamNumber: data.teamNumber,
      opponent: data.opponent,
      opponentClub: data.opponentClub,
      date: matchDate,
      location: data.location,
      isHome: data.isHome,
      isExempt: data.isExempt,
      isForfeit: data.isForfeit,
      phase: data.phase,
      journee: data.journee,
      isFemale: data.isFemale,
      division: data.division,
      teamId: data.teamId,
      epreuve: data.epreuve,
      score: data.score,
      result: data.result,
      rencontreId: data.rencontreId,
      equipeIds: data.equipeIds,
      lienDetails: data.lienDetails,
      resultatsIndividuels: data.resultatsIndividuels,
      joueursSQY: data.joueursSQY || [],
      joueursAdversaires: data.joueursAdversaires || [],
      createdAt: convertFirestoreTimestamp(data.createdAt) || new Date(),
      updatedAt: convertFirestoreTimestamp(data.updatedAt) || new Date(),
    });
  });

  matches.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return matches;
}

