/** IDs d'épreuve FFTT changent chaque saison : on garde la génération la plus récente. */
const EPREUVE_GENERATION_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

export function isCurrentSeasonTeam(params: {
  listedInFftt?: boolean | null;
  updatedAt?: Date | null;
  anyTeamListedInFftt: boolean;
  seasonStart?: Date | null;
}): boolean {
  if (params.anyTeamListedInFftt) {
    return params.listedInFftt === true;
  }
  const seasonStart = params.seasonStart ?? null;
  const updatedAt = params.updatedAt ?? null;
  if (seasonStart && updatedAt) {
    return updatedAt.getTime() >= seasonStart.getTime();
  }
  return true;
}

export function selectCurrentSeasonTeams<T>(
  teams: T[],
  getState: (team: T) => {
    listedInFftt?: boolean | null | undefined;
    updatedAt?: Date | null | undefined;
  },
  seasonStart?: Date | null
): T[] {
  const anyTeamListedInFftt = teams.some(
    (team) => getState(team).listedInFftt === true
  );
  const filtered = teams.filter((team) => {
    const state = getState(team);
    return isCurrentSeasonTeam({
      listedInFftt: state.listedInFftt ?? null,
      updatedAt: state.updatedAt ?? null,
      anyTeamListedInFftt,
      seasonStart: seasonStart ?? null,
    });
  });
  if (!anyTeamListedInFftt && filtered.length === 0 && teams.length > 0) {
    return teams;
  }
  return filtered;
}

export function selectLatestEpreuveGenerations<T>(
  teams: T[],
  getState: (team: T) => {
    epreuveType?: string | null | undefined;
    idEpreuve?: number | null | undefined;
    updatedAt?: Date | null | undefined;
  }
): T[] {
  const tracked = teams.filter((team) => Boolean(getState(team).epreuveType));
  if (tracked.length === 0) {
    return teams;
  }

  const byType = new Map<string, T[]>();
  for (const team of tracked) {
    const type = getState(team).epreuveType;
    if (!type) continue;
    const list = byType.get(type) ?? [];
    list.push(team);
    byType.set(type, list);
  }

  const kept: T[] = [];
  for (const group of byType.values()) {
    const maxUpdatedById = new Map<number | "none", number>();
    for (const team of group) {
      const id = getState(team).idEpreuve ?? "none";
      const ts = getState(team).updatedAt?.getTime() ?? 0;
      maxUpdatedById.set(id, Math.max(maxUpdatedById.get(id) ?? 0, ts));
    }
    const overallMax = Math.max(0, ...maxUpdatedById.values());
    const cutoff = overallMax - EPREUVE_GENERATION_WINDOW_MS;
    const currentIds = new Set(
      [...maxUpdatedById.entries()]
        .filter(([, ts]) => ts >= cutoff)
        .map(([id]) => id)
    );
    kept.push(
      ...group.filter((team) =>
        currentIds.has(getState(team).idEpreuve ?? "none")
      )
    );
  }
  return kept;
}

