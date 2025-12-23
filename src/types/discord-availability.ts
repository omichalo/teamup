import { ChampionshipType } from "./championship";

/**
 * Configuration des channels Discord pour les sondages de disponibilité
 */
export interface DiscordAvailabilityConfig {
  parisChannelId?: string; // Channel pour le championnat de Paris
  equipesChannelId?: string; // Channel pour le championnat par équipes
  updatedAt: Date;
  updatedBy: string; // UID admin
}

/**
 * Sondage Discord de disponibilité
 */
export interface DiscordAvailabilityPoll {
  id: string; // Document ID: ${phase}_${journee}_${championshipType}_${idEpreuve || 'default'}
  messageId: string; // ID du message Discord
  channelId: string; // ID du channel Discord
  journee: number;
  phase: "aller" | "retour";
  championshipType: ChampionshipType;
  idEpreuve?: number;
  date?: string; // Date du match au format YYYY-MM-DD
  isActive: boolean; // true si le sondage est actif (boutons activés)
  closedAt?: Date; // Date de fermeture manuelle
  createdAt: Date;
  createdBy: string; // UID admin/coach
}

/**
 * Réponse d'un joueur à un sondage Discord
 */
export interface DiscordAvailabilityResponse {
  pollId: string; // ID du sondage
  discordUserId: string; // ID Discord de l'utilisateur
  playerId: string; // ID du joueur (licence)
  available: boolean; // true = disponible, false = indisponible
  comment?: string; // Commentaire optionnel
  respondedAt: Date; // Date de la réponse
}

