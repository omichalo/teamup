"use client";

import { useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/http/read-json-response";
import type { AttendanceSlotAnalytics } from "@/lib/attendance/types";

type State = {
  analytics: AttendanceSlotAnalytics | null;
  loading: boolean;
  error: string | null;
};

export function useSlotAttendanceAnalytics(slotId: string | null): State {
  const [analytics, setAnalytics] = useState<AttendanceSlotAnalytics | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slotId) {
      setAnalytics(null);
      setError(null);
      setLoading(false);
      return;
    }
    let cancelled = false;
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({ slotId });
        const res = await fetch(`/api/club/attendance/slot-analytics?${params.toString()}`);
        const json = await readJsonResponse<{
          analytics?: AttendanceSlotAnalytics;
          error?: string;
        }>(res);
        if (!res.ok || !json.analytics) {
          throw new Error(json.error ?? "Impossible de charger les statistiques");
        }
        if (!cancelled) setAnalytics(json.analytics);
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Erreur");
          setAnalytics(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [slotId]);

  return { analytics, loading, error };
}
