/**
 * Types partagés pour la synchronisation des matchs par équipe (FFTT → modèle interne / Firestore).
 */

/** Joueur dans les recherches d’enrichissement (FFTT / Firestore). */
export interface PlayerSearch {
  id?: string;
  nom?: string;
  prenom?: string;
  licence?: string;
  points?: number;
  sexe?: string;
}

export interface MatchData {
  id: string;
  ffttId: string;
  teamNumber: number;
  opponent: string;
  opponentClub: string;
  date: Date;
  location: string;
  isHome: boolean;
  isExempt: boolean;
  isForfeit: boolean;
  phase: string;
  journee: number;
  isFemale: boolean;
  division: string;
  teamId: string;
  epreuve: string;
  idEpreuve?: number;
  score?: string | undefined;
  result: string;
  rencontreId: string;
  equipeIds: { equipe1: string; equipe2: string };
  lienDetails: string;
  resultatsIndividuels?:
    | {
        parties?: Array<{
          joueurA: string;
          joueurB: string;
          scoreA: number;
          scoreB: number;
          adversaireA?: string;
          adversaireB?: string;
          setDetails?: string[];
        }>;
        nomEquipeA?: string;
        nomEquipeB?: string;
        joueursA?: Record<string, { nom: string; prenom: string; points?: number }>;
        joueursB?: Record<string, { nom: string; prenom: string; points?: number }>;
      }
    | undefined;
  joueursSQY?:
    | Array<{
        id: string;
        nom?: string;
        prenom?: string;
        licence?: string;
        points?: number;
        sexe?: string;
      }>
    | undefined;
  joueursAdversaires?:
    | Array<{
        id: string;
        nom?: string;
        prenom?: string;
        licence?: string;
        points?: number;
        sexe?: string;
      }>
    | undefined;
  createdAt: Date;
  updatedAt: Date;
}

export interface TeamMatchesSyncResult {
  success: boolean;
  matchesCount: number;
  message: string;
  error?: string;
  processedMatches?: MatchData[];
}
