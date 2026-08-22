"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/http/read-json-response";
import type { SlotOccupancySiteGroup } from "@/lib/club-slot-occupancy/types";

type OccupancyPayload = {
  seasonLabel?: string;
  groups?: SlotOccupancySiteGroup[];
  canManageEnrollments?: boolean;
  error?: string;
};

export function useSlotOccupancy() {
  const [groups, setGroups] = useState<SlotOccupancySiteGroup[]>([]);
  const [seasonLabel, setSeasonLabel] = useState<string | null>(null);
  const [canManageEnrollments, setCanManageEnrollments] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/club/slots/occupancy");
      const json = await readJsonResponse<OccupancyPayload>(res);
      if (!res.ok || !json.groups) {
        throw new Error(json.error ?? "Impossible de charger le remplissage");
      }
      setGroups(json.groups);
      setSeasonLabel(json.seasonLabel ?? null);
      setCanManageEnrollments(json.canManageEnrollments === true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setGroups([]);
      setCanManageEnrollments(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return { groups, setGroups, seasonLabel, canManageEnrollments, loading, error, reload: load };
}
