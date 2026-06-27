import { ChampionshipType } from "@/types";
import { AvailabilityResponse } from "@/lib/services/availability-service";

export type PatchAvailabilitiesRequest = {
  journee: number;
  phase: "aller" | "retour";
  championshipType: ChampionshipType;
  idEpreuve?: number;
  date?: string;
  playerUpdates: Array<{
    playerId: string;
    response: AvailabilityResponse | null;
  }>;
};

export async function patchAvailabilities(
  body: PatchAvailabilitiesRequest
): Promise<void> {
  const response = await fetch("/api/availabilities", {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as
      | { error?: string }
      | null;
    throw new Error(payload?.error ?? `Erreur HTTP ${response.status}`);
  }
}
