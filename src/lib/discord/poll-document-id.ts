import { ChampionshipType } from "@/types/championship";
import { buildAvailabilityPollId } from "@/lib/discord/availability-poll-id";

export function getDiscordPollDocumentId(params: {
  seasonLabel?: string | null;
  phase: "aller" | "retour";
  journee: number;
  championshipType: ChampionshipType;
  idEpreuve?: number;
}): string {
  return buildAvailabilityPollId(params);
}
