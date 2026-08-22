import type { ChampionshipRosterView } from "./merge-players";
import type { RosterParticipationPatch } from "./schema";
import { temporaryPersonKey } from "./person-key";

export async function fetchChampionshipRoster(): Promise<{
  seasonLabel: string;
  roster: ChampionshipRosterView[];
}> {
  const response = await fetch("/api/club/championship/roster");
  if (!response.ok) {
    throw new Error("Impossible de charger l'effectif championnat");
  }
  return (await response.json()) as {
    seasonLabel: string;
    roster: ChampionshipRosterView[];
  };
}

export async function patchChampionshipRosterPerson(
  personKey: string,
  patch: RosterParticipationPatch
): Promise<{ personKey: string }> {
  const response = await fetch(
    `/api/club/championship/roster/${encodeURIComponent(personKey)}`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    }
  );
  if (!response.ok) {
    throw new Error("Impossible de mettre à jour l'effectif championnat");
  }
  return (await response.json()) as { personKey: string };
}

export async function deleteChampionshipRosterPerson(
  personKey: string
): Promise<void> {
  const response = await fetch(
    `/api/club/championship/roster/${encodeURIComponent(personKey)}`,
    { method: "DELETE" }
  );
  if (!response.ok) {
    throw new Error("Impossible de supprimer le joueur temporaire");
  }
}

export async function createTemporaryChampionshipPlayer(input: {
  firstName: string;
  lastName: string;
  license?: string | undefined;
  gender: "M" | "F";
  inChampionship: boolean;
  isWheelchair: boolean;
  discordMentions: string[];
}): Promise<string> {
  const personKey = temporaryPersonKey(input.license);
  const result = await patchChampionshipRosterPerson(personKey, {
    firstName: input.firstName,
    lastName: input.lastName,
    ffttLicense: input.license?.trim() ? input.license.trim() : null,
    sex: input.gender === "F" ? "female" : "male",
    isTemporary: true,
    championnat: input.inChampionship,
    championnatParis: false,
    isWheelchair: input.isWheelchair,
    discordMentions: input.discordMentions,
  });
  return result.personKey;
}

export async function recalculateChampionshipRoster(): Promise<void> {
  const response = await fetch("/api/club/championship/roster", {
    method: "POST",
  });
  if (!response.ok) {
    throw new Error("Impossible de recalculer l'effectif championnat");
  }
}
