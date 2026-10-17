"use client";

import { useCallback, useEffect, useState } from "react";
import { readJsonResponse } from "@/lib/http/read-json-response";
import type {
  AttendanceRosterKind,
  AttendanceSessionPayload,
} from "@/lib/attendance/types";

async function readError(res: Response, fallback: string): Promise<string> {
  const json = await readJsonResponse<{ error?: string }>(res);
  return json.error ?? fallback;
}

export function useAttendanceSession(
  date: string,
  slotId: string | null,
  source: "training" | "camp" = "training"
) {
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
      if (source === "camp") params.set("source", "camp");
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
  }, [date, slotId, source]);

  useEffect(() => {
    void load();
  }, [load]);

  const togglePresent = useCallback(
    async (params: {
      personKey: string;
      kind: AttendanceRosterKind;
      registrationId?: string;
      leadId?: string;
      markId?: string;
      externalId?: string;
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
          if (params.markId) query.set("markId", params.markId);
          if (params.externalId) query.set("externalId", params.externalId);
          if (source === "camp") {
            query.set("source", "camp");
            if (params.kind === "member_walkin" && params.registrationId) {
              query.set("clubRegistrationId", params.registrationId);
            }
            if (params.kind === "enrolled" && params.registrationId) {
              query.set("campRegistrationId", params.registrationId);
            }
          }
          const res = await fetch(`/api/club/attendance/marks?${query.toString()}`, {
            method: "DELETE",
          });
          if (!res.ok) throw new Error(await readError(res, "Impossible de dépointer"));
        } else {
          const body: Record<string, unknown> = {
            date,
            slotId,
            kind: params.kind,
            source,
          };
          if (params.registrationId) {
            body.registrationId = params.registrationId;
            if (source === "camp" && params.kind === "member_walkin") {
              body.clubRegistrationId = params.registrationId;
            }
            if (source === "camp" && params.kind === "enrolled") {
              body.campRegistrationId = params.registrationId;
            }
          }
          if (params.leadId) body.leadId = params.leadId;
          const res = await fetch("/api/club/attendance/marks", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body),
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
    [date, slotId, source, load]
  );

  return { session, loading, error, setError, busyKey, reload: load, togglePresent };
}
