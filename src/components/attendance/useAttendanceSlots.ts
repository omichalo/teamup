"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/http/read-json-response";
import type { AttendanceSlotOption } from "@/lib/attendance/types";
import { todayYmdInParis } from "@/lib/attendance/calendar";

export function useAttendanceSlots(date: string) {
  const [slots, setSlots] = useState<AttendanceSlotOption[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/club/attendance/slots?date=${encodeURIComponent(date)}`);
      const json = await readJsonResponse<{ slots?: AttendanceSlotOption[]; error?: string }>(
        res
      );
      if (!res.ok) {
        throw new Error(json.error ?? "Impossible de charger les créneaux");
      }
      setSlots(json.slots ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setSlots([]);
    } finally {
      setLoading(false);
    }
  }, [date]);

  useEffect(() => {
    void load();
  }, [load]);

  return { slots, loading, error, reload: load };
}

export function useDefaultAttendanceDate(): [string, (value: string) => void] {
  const [date, setDate] = useState(todayYmdInParis);
  return [date, setDate];
}
