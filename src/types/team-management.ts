// Types pour la gestion des équipes et joueurs

export interface Player {
  id: string;
  name: string;
  firstName: string;
  license: string;
  typeLicence: string; // T = Traditionnel, P = Promotionnel, A = Dirigeant
  gender: "M" | "F";
  nationality: "FR" | "ETR" | "C"; // C = Européen non français
  isActive: boolean;
  isTemporary?: boolean; // Joueur temporaire (sans licence FFTT)
  createdAt: Date;
  updatedAt: Date;
  // Champs additionnels FFTT
  points?: number; // Points sur la licence
  place?: number; // Classement/place
  certificat?: string; // C, A, U, N
  preferredTeams: {
    masculine: string[]; // IDs des équipes masculines préférées
    feminine: string[]; // IDs des équipes féminines préférées
  };
  participation: {
    [teamId: string]: boolean; // Participation au championnat par équipe
    championnat?: boolean; // Participation générale au championnat
  };
  hasPlayedAtLeastOneMatch?: boolean; // Indique si le joueur a participé à au moins un match
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
  // Champs additionnels de l&apos;API FFTT
  numClub?: string;
  club?: string;
  classement?: number;
  categorie?: string;
  dateNaissance?: string;
  lieuNaissance?: string;
  datePremiereLicence?: string;
  clubPrecedent?: string;
  pointsMensuel?: number;
  pointsMensuelAnciens?: number;
  pointDebutSaison?: number;
  pointsLicence?: number;
  idLicence?: string;
  nomClub?: string;
  isHomme?: boolean;
}

export interface Team {
  id: string;
  name: string;
  division: string;
  gender: "M" | "F";
  level: number; // 1 = équipe 1, 2 = équipe 2, etc.
  isActive: boolean;
  location?: string; // ID du lieu (ville) associé à l'équipe
}

export interface Availability {
  id: string;
  playerId: string;
  date: string; // YYYY-MM-DD
  masculine: boolean; // Disponible pour le championnat masculin
  feminine: boolean; // Disponible pour le championnat féminin
  notes?: string;
}

export interface TeamComposition {
  id: string;
  teamId: string;
  date: string; // YYYY-MM-DD
  players: string[]; // IDs des joueurs
  isConfirmed: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface BurnoutRule {
  id: string;
  name: string;
  description: string;
  type: "PLAYER_LIMIT" | "TEAM_LIMIT" | "FOREIGN_LIMIT" | "MUTATION_LIMIT";
  maxCount: number;
  period: "SEASON" | "MATCH_DAY" | "CUSTOM";
  isActive: boolean;
}

export interface BurnoutViolation {
  type: "PLAYER_LIMIT" | "TEAM_LIMIT" | "FOREIGN_LIMIT" | "MUTATION_LIMIT";
  message: string;
  severity: "WARNING" | "ERROR";
  canOverride: boolean;
  details: {
    playerId?: string;
    teamId?: string;
    currentCount: number;
    maxCount: number;
    period: string;
  };
}

export interface MatchHistory {
  id: string;
  playerId: string;
  teamId: string;
  date: string;
  opponent: string;
  result: "WIN" | "LOSS" | "DRAW";
  isHome: boolean;
}

export interface TeamCompositionValidation {
  isValid: boolean;
  violations: BurnoutViolation[];
  warnings: BurnoutViolation[];
  canProceed: boolean;
  suggestions: string[];
}

// Types pour les interfaces utilisateur
export interface PlayerWithAvailability extends Player {
  availability: Availability[];
  matchHistory: MatchHistory[];
}

export interface TeamWithComposition extends Team {
  currentComposition?: TeamComposition;
  preferredPlayers: Player[];
  availablePlayers: Player[];
}

export interface DayAvailability {
  date: string;
  players: {
    [playerId: string]: {
      masculine: boolean;
      feminine: boolean;
      notes?: string;
    };
  };
}

// Types pour les statistiques
export interface PlayerStats {
  playerId: string;
  totalMatches: number;
  matchesByTeam: { [teamId: string]: number };
  lastPlayed: string | null;
  burnoutStatus: {
    [teamId: string]: {
      canPlay: boolean;
      reason?: string;
    };
  };
}

export interface TeamStats {
  teamId: string;
  totalCompositions: number;
  averagePlayers: number;
  lastComposition: string | null;
  successRate: number;
}
