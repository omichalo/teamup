// Types de base pour l'application SQY Ping

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
  epreuve?: string; // Libellé de l'épreuve FFTT
  score?: string; // Score du match (ex: "4-2")
  result?: string; // Résultat (VICTOIRE, DEFAITE, EXEMPT, W.O.)
  composition?: string; // Composition de l'équipe pour ce match
  rencontreId?: string; // ID de la rencontre FFTT
  equipeIds?: { equipe1: string; equipe2: string }; // IDs des équipes
  lienDetails?: string; // Lien complet vers les détails
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
  reason?: string; // Raison de l'indisponibilité
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

export interface User {
  id: string;
  email: string;
  displayName: string;
  photoURL?: string;
  role: "coach" | "player";
  playerId?: string; // Si c'est un joueur
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

// Types pour l'API FFTT
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
