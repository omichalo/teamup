import type { Firestore } from "firebase-admin/firestore";

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
    matches.push({
      id: doc.id,
      ffttId: data.ffttId,
      teamNumber: data.teamNumber,
      opponent: data.opponent,
      opponentClub: data.opponentClub,
      date: data.date?.toDate?.() || data.date || new Date(),
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
      createdAt: data.createdAt?.toDate?.() || data.createdAt || new Date(),
      updatedAt: data.updatedAt?.toDate?.() || data.updatedAt || new Date(),
    });
  });

  matches.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  return matches;
}

