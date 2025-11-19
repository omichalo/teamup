// Types de base pour l&apos;application SQY Ping

export interface Player {
  id: string;
  ffttId: string;
  firstName: string;
  lastName: string;
  email?: string;
  phone?: string;
  photoUrl?: string;
  points: number;
  ranking: number;
  isForeign: boolean;
  isTransferred: boolean;
  isFemale: boolean;
  teamNumber?: number; // Équipe actuelle (1, 2, 3...)
  highestMasculineTeamNumberByPhase?: { 
    aller?: number; 
    retour?: number; 
  }; // Numéro de l'équipe masculine la plus basse (numéro le plus élevé) dans laquelle le joueur est brûlé par phase (>= 2 matchs dans la phase). Exemple: { aller: 8, retour: 5 } signifie brûlé dans l'équipe 8 en phase aller et équipe 5 en phase retour
  highestFeminineTeamNumberByPhase?: { 
    aller?: number; 
    retour?: number; 
  }; // Numéro de l'équipe féminine la plus basse (numéro le plus élevé) dans laquelle le joueur est brûlé par phase (>= 2 matchs dans la phase)
  masculineMatchesByTeamByPhase?: {
    aller?: { [teamNumber: number]: number };
    retour?: { [teamNumber: number]: number };
  }; // Nombre de matchs joués par équipe masculine et par phase (pour affichage dans le tooltip de brûlage)
  feminineMatchesByTeamByPhase?: {
    aller?: { [teamNumber: number]: number };
    retour?: { [teamNumber: number]: number };
  }; // Nombre de matchs joués par équipe féminine et par phase (pour affichage dans le tooltip de brûlage)
  createdAt: Date;
  updatedAt: Date;
}

export interface Team {
  id: string;
  number: number; // 1, 2, 3...
  name: string;
  division: string;
  discordChannelId?: string;
  discordWebhookUrl?: string;
  location?: string; // ID du lieu (ville) associé à l'équipe
  players: string[]; // IDs des joueurs
  createdAt: Date;
  updatedAt: Date;
}

export interface Match {
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
  phase: string; // "aller", "retour", "playoffs"
  journee: number; // 1, 2, 3...
  composition?: Composition;
  isFemale?: boolean; // true pour les équipes féminines
  division?: string; // Division FFTT complète
  teamId?: string; // Identifiant unique équipe (ex: "1_M", "2_F")
  epreuve?: string; // Libellé de l&apos;épreuve FFTT
  score?: string; // Score du match (ex: "4-2")
  result?: string; // Résultat (VICTOIRE, DEFAITE, EXEMPT, W.O.)
  compositionString?: string; // Composition de l&apos;équipe pour ce match
  rencontreId?: string; // ID de la rencontre FFTT
  equipeIds?: { equipe1: string; equipe2: string }; // IDs des équipes
  lienDetails?: string; // Lien complet vers les détails
  resultatsIndividuels?: {
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
  }; // Résultats individuels des joueurs
  joueursSQY?: Array<{
    licence?: string;
    nom?: string;
    prenom?: string;
    points?: number | null;
    sexe?: string;
  }>; // Liste des joueurs SQY Ping ayant participé au match
  joueursAdversaires?: Array<{
    licence?: string;
    nom?: string;
    prenom?: string;
    points?: number | null;
    sexe?: string;
  }>; // Liste des joueurs adversaires
  createdAt: Date;
  updatedAt: Date;
}

export interface Composition {
  id: string;
  matchId: string;
  teamNumber: number;
  journee: number;
  players: {
    A?: string; // ID du joueur en position A
    B?: string;
    C?: string;
    D?: string;
  };
  isValid: boolean;
  validationErrors: string[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Availability {
  id: string;
  playerId: string;
  journee: number;
  isAvailable: boolean;
  reason?: string; // Raison de l&apos;indisponibilité
  createdAt: Date;
  updatedAt: Date;
}

export interface BurnRecord {
  id: string;
  playerId: string;
  teamNumber: number;
  journee: number;
  phase: string;
  matchId: string;
  createdAt: Date;
}

export interface ClubSettings {
  id: string;
  name: string;
  ffttCode: string;
  ffttId?: string;
  ffttPassword?: string;
  discordWebhooks: {
    [teamNumber: number]: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type UserRole = "admin" | "coach" | "player";

export type CoachRequestStatus = "none" | "pending" | "approved" | "rejected";

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string | null;
  role: UserRole;
  playerId?: string | null; // Si c&apos;est un joueur
  emailVerified?: boolean; // État de vérification de l'email
  coachRequestStatus: CoachRequestStatus;
  coachRequestMessage?: string | null;
  coachRequestUpdatedAt?: Date | null;
  coachRequestHandledBy?: string | null;
  coachRequestHandledAt?: Date | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfileDocument {
  email: string;
  displayName?: string;
  photoURL?: string | null;
  role: UserRole;
  playerId?: string;
  coachRequestStatus?: CoachRequestStatus;
  coachRequestMessage?: string | null;
  coachRequestUpdatedAt?: Date | null;
  coachRequestHandledBy?: string | null;
  coachRequestHandledAt?: Date | null;
  lastLoginAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

// Types pour les erreurs de validation
export interface ValidationError {
  type:
    | "burn"
    | "quota_female"
    | "quota_foreign"
    | "ranking_order"
    | "day2_quota";
  message: string;
  playerId?: string;
  teamNumber?: number;
}

export interface CompositionValidation {
  isValid: boolean;
  errors: ValidationError[];
}

// Types pour l&apos;API FFTT
export interface FFTTPlayer {
  licencie: string;
  nom: string;
  prenom: string;
  points: number;
  classement: number;
  sexe: "M" | "F";
  nationalite: string;
}

export interface FFTTMatch {
  date: string;
  heure: string;
  equipe: string;
  adversaire: string;
  lieu: string;
  domicile: boolean;
  journee: number;
}

// Types pour Discord
export interface DiscordMessage {
  content?: string;
  embeds?: DiscordEmbed[];
}

export interface DiscordEmbed {
  title: string;
  description?: string;
  color?: number;
  fields: DiscordField[];
  timestamp?: string;
}

export interface DiscordField {
  name: string;
  value: string;
  inline?: boolean;
}
