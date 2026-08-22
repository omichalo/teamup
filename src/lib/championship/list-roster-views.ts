import type { Firestore } from "firebase-admin/firestore";
import { PLAYER_CLUB_PROFILES_COLLECTION } from "./paths";
import { listChampionshipPlayers } from "./store";
import type { ChampionshipRosterView } from "./merge-players";

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export async function listChampionshipRosterViews(
  db: Firestore,
  seasonLabel: string
): Promise<ChampionshipRosterView[]> {
  const [roster, profilesSnap] = await Promise.all([
    listChampionshipPlayers(db, seasonLabel),
    db.collection(PLAYER_CLUB_PROFILES_COLLECTION).get(),
  ]);
  const profiles = new Map(
    profilesSnap.docs.map((doc) => [doc.id, doc.data() as Record<string, unknown>])
  );

  return roster.map((entry) => {
    const profile =
      profiles.get(entry.personKey) ??
      (entry.ffttLicense ? profiles.get(entry.ffttLicense) : undefined);
    return {
      ...entry,
      id: entry.personKey,
      discordMentions: asStringArray(profile?.discordMentions),
      isWheelchair: profile?.isWheelchair === true,
    };
  });
}
