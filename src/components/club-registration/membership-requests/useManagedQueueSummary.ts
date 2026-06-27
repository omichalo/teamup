"use client";

import { useCallback, useEffect, useState } from "react";
import type { ManagedQueueSummary } from "@/lib/club-registration/managed-queue-summary";

type ApiResponse = { summary: ManagedQueueSummary } | { error: string };

const EMPTY_SUMMARY: ManagedQueueSummary = {
  actionable: 0,
  missingCertificate: 0,
  paymentPending: 0,
  paymentRequested: 0,
  truncated: false,
};

export function useManagedQueueSummary(enabled = true) {
  const [summary, setSummary] = useState<ManagedQueueSummary>(EMPTY_SUMMARY);
  const [loading, setLoading] = useState(enabled);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    if (!enabled) {
      return EMPTY_SUMMARY;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/club/registrations/managed-summary", {
        credentials: "include",
      });
      const json = (await res.json()) as ApiResponse;
      if (!res.ok || "error" in json) {
        throw new Error("error" in json ? json.error : "Chargement impossible");
      }
      setSummary(json.summary);
      return json.summary;
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erreur de chargement");
      return EMPTY_SUMMARY;
    } finally {
      setLoading(false);
    }
  }, [enabled]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { summary, loading, error, reload };
}
