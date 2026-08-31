import type { Firestore } from "firebase-admin/firestore";
import { reconcilePlayersAfterSync } from "@/lib/players/player-archive";

/**
 * @deprecated Prefer `reconcilePlayersAfterSync` from `@/lib/players/player-archive`.
 */
export async function markPlayersListedInClub(
  db: Firestore,
  listedLicences: Iterable<string>
): Promise<{ listed: number; unlisted: number }> {
  const result = await reconcilePlayersAfterSync(db, listedLicences);
  return { listed: result.listed, unlisted: result.archived };
}

export { reconcilePlayersAfterSync } from "@/lib/players/player-archive";
