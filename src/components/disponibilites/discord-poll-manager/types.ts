import { ChampionshipType } from "@/types";

export interface DiscordPoll {
  id: string;
  messageId: string;
  channelId: string;
  journee: number;
  phase: "aller" | "retour";
  championshipType: ChampionshipType;
  idEpreuve?: number;
  date?: string;
  isActive: boolean;
  closedAt?: string | null;
  createdAt?: string | null;
  createdBy: string;
}

export interface DiscordPollManagerProps {
  journee: number | null;
  phase: "aller" | "retour" | null;
  championshipType: ChampionshipType | null;
  idEpreuve?: number;
  date?: string;
  epreuveType?: "championnat_equipes" | "championnat_paris" | null;
  fridayDate?: string;
  saturdayDate?: string;
}

export interface DiscordRole {
  id: string;
  name: string;
  color: number;
}

export interface DiscordConfigState {
  channelId: string | null;
  mention: string | null;
  channelName?: string | null;
  mentionLabel?: string | null;
}

export interface MentionAnchorState {
  anchorEl: HTMLElement;
  position: number;
}

export interface MentionableUser {
  id: string;
  displayName: string;
  username?: string;
  type: "user";
}

export interface MentionableRole {
  id: string;
  displayName: string;
  type: "role";
}

export type MentionableItem = MentionableUser | MentionableRole;
