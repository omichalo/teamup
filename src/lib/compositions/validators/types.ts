import { ChampionshipType, Match } from "@/types";
import { EquipeWithMatches } from "@/hooks/useTeamData";
import { Player } from "@/types/team-management";

export type PhaseType = "aller" | "retour";

export interface CompositionMap {
  [teamId: string]: string[];
}

export interface AssignmentValidationParams {
  playerId: string;
  teamId: string;
  players: Player[];
  equipes: EquipeWithMatches[];
  compositions: CompositionMap;
  selectedPhase: PhaseType | null;
  selectedJournee: number | null;
  championshipType: ChampionshipType;
  journeeRule?: number;
  maxPlayersPerTeam?: number;
}

export interface AssignmentValidationResult {
  canAssign: boolean;
  reason?: string;
  simulatedPlayers: Player[];
  willBeBurned?: boolean;
  burnedTeamNumber?: number;
}

export interface TeamCompositionValidationParams {
  teamId: string;
  players: Player[];
  equipes: EquipeWithMatches[];
  compositions: CompositionMap;
  selectedPhase: PhaseType | null;
  selectedJournee: number | null;
  championshipType: ChampionshipType;
  journeeRule?: number;
  maxPlayersPerTeam?: number;
}

export interface TeamCompositionValidationResult {
  valid: boolean;
  reason?: string;
  offendingPlayerIds?: string[];
}

export const JOURNEE_CONCERNEE_PAR_REGLE = 2;
export const DEFAULT_JOURNEE_RULE = JOURNEE_CONCERNEE_PAR_REGLE;

export type ParisTeamStructure = {
  groups: number;
  playersPerGroup: number;
  totalPlayers: number;
};

export type MatchesByTeamByPhase = { [teamNumber: number]: number } | undefined;

export type MatchLike = Match | null;
