"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/http/read-json-response";
import type { AttendanceMarkKind } from "@/lib/attendance/constants";
import type { AttendanceSessionPayload } from "@/lib/attendance/types";

async function readError(res: Response, fallback: string): Promise<string> {
  const json = await readJsonResponse<{ error?: string }>(res);
  return json.error ?? fallback;
}

export function useAttendanceSession(date: string, slotId: string | null) {
  const [session, setSession] = useState<AttendanceSessionPayload | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!slotId) {
      setSession(null);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ date, slotId });
      const res = await fetch(`/api/club/attendance/sessions?${params.toString()}`);
      const json = await readJsonResponse<{
        session?: AttendanceSessionPayload;
        error?: string;
      }>(res);
      if (!res.ok || !json.session) {
        throw new Error(json.error ?? "Impossible de charger la séance");
      }
      setSession(json.session);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur");
      setSession(null);
    } finally {
      setLoading(false);
    }
  }, [date, slotId]);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePresent = useCallback(
    async (params: {
      personKey: string;
      kind: AttendanceMarkKind;
      registrationId?: string;
      leadId?: string;
      present: boolean;
    }) => {
      if (!slotId) return;
      setBusyKey(params.personKey);
      try {
        if (params.present) {
          const query = new URLSearchParams({
            date,
            slotId,
            kind: params.kind,
          });
          if (params.registrationId) query.set("registrationId", params.registrationId);
          if (params.leadId) query.set("leadId", params.leadId);
          const res = await fetch(`/api/club/attendance/marks?${query.toString()}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error(await readError(res, "Impossible de dépointer"));
        } else {
          const res = await fetch("/api/club/attendance/marks", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              date,
              slotId,
              kind: params.kind,
              registrationId: params.registrationId,
              leadId: params.leadId,
            }),
          });
          if (!res.ok) throw new Error(await readError(res, "Impossible de pointer"));
        }
        await load();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setBusyKey(null);
      }
    },
    [date, slotId, load]
  );

  return { session, loading, error, setError, busyKey, reload: load, togglePresent };
}
