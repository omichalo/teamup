import {
  buildCanonicalCompositionPlayerKeys,
  mergeCompositionPlayerRecords,
  type CompositionTablePlayer,
} from "@/lib/shared/match-composition-utils";
import { hasUsablePlayerName } from "@/lib/shared/team-matches-roster-utils";
import type { MatchCompositionRow } from "./CompositionsTable";

export function isMissingCompositionPlayer(j: { nom: string; prenom: string }): boolean {
  return !hasUsablePlayerName(j);
}

export function buildPlayersByMatchIndex(matches: MatchCompositionRow[]): {
  allPlayers: Array<CompositionTablePlayer & { key: string }>;
  cellByPlayerAndMatch: Map<string, { position: number; victoires: number; defaites: number }>;
} {
  const allEntries: CompositionTablePlayer[] = [];
  for (const m of matches) {
    for (const j of m.composition) {
      if (isMissingCompositionPlayer(j)) continue;
      allEntries.push(j);
    }
  }

  const { canonicalKey } = buildCanonicalCompositionPlayerKeys(allEntries);
  const keyToPlayer = new Map<string, CompositionTablePlayer>();

  for (const entry of allEntries) {
    const key = canonicalKey(entry);
    if (!key) continue;
    const existing = keyToPlayer.get(key);
    keyToPlayer.set(
      key,
      existing ? mergeCompositionPlayerRecords(existing, entry) : { ...entry }
    );
  }

  const allPlayers = Array.from(keyToPlayer.entries()).map(([key, player]) => ({
    key,
    ...player,
  }));

  const cellByPlayerAndMatch = new Map<
    string,
    { position: number; victoires: number; defaites: number }
  >();

  for (const { key } of allPlayers) {
    for (let matchIdx = 0; matchIdx < matches.length; matchIdx++) {
      const compo = matches[matchIdx].composition;
      const pos = compo.findIndex((j) => {
        if (isMissingCompositionPlayer(j)) return false;
        return canonicalKey(j) === key;
      });
      if (pos < 0) continue;

      const j = compo[pos];
      cellByPlayerAndMatch.set(`${key}|${matchIdx}`, {
        position: pos + 1,
        victoires: typeof j.victoires === "number" ? j.victoires : 0,
        defaites: typeof j.defaites === "number" ? j.defaites : 0,
      });
    }
  }

  return { allPlayers, cellByPlayerAndMatch };
}
