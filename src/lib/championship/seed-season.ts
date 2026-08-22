import type { Firestore } from "firebase-admin/firestore";
import { COLLECTION as REGISTRATIONS_COLLECTION } from "@/lib/club-registration/list-registrations";
import { syncChampionshipRosterFromRegistration } from "./seed-from-registration";

export type SeedSeasonResult = {
  scanned: number;
  upserted: number;
  excluded: number;
  skipped: number;
};

export async function seedChampionshipRosterForSeason(
  db: Firestore,
  seasonLabel: string
): Promise<SeedSeasonResult> {
  const snap = await db.collection(REGISTRATIONS_COLLECTION).get();
  const result: SeedSeasonResult = {
    scanned: snap.size,
    upserted: 0,
    excluded: 0,
    skipped: 0,
  };

  for (const doc of snap.docs) {
    const data = doc.data() as Record<string, unknown>;
    const docSeason =
      typeof data.seasonLabel === "string" ? data.seasonLabel.trim() : "";
    if (docSeason && docSeason !== seasonLabel) {
      result.skipped += 1;
      continue;
    }
    const action = await syncChampionshipRosterFromRegistration(
      db,
      seasonLabel,
      doc.id
    );
    if (action.action === "upsert") {
      result.upserted += 1;
    } else if (action.action === "exclude") {
      result.excluded += 1;
    } else {
      result.skipped += 1;
    }
  }

  return result;
}
