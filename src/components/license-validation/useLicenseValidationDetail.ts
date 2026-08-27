"use client";

import { useCallback, useEffect, useState } from "react";
import type { LicenseValidationDetail } from "@/lib/license-validation/map-registration";

export type LicenseValidationReloadOptions = {
  /** Recharge sans basculer l'UI en « Chargement… » (garde le panneau monté). */
  silent?: boolean;
};

export function useLicenseValidationDetail(registrationId: string | null) {
  const [detail, setDetail] = useState<LicenseValidationDetail | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(
    async (options?: LicenseValidationReloadOptions) => {
      if (!registrationId) {
        setDetail(null);
        return null;
      }

      const silent = options?.silent === true;
      if (!silent) {
        setLoading(true);
      }
      setError(null);
      try {
        const res = await fetch(
          `/api/club/license-validations/${encodeURIComponent(registrationId)}`,
          { credentials: "include" }
        );
        const json = await res.json().catch(() => ({}));
        if (!res.ok) {
          throw new Error(json.error || "Impossible de charger le dossier");
        }
        const next = json.registration as LicenseValidationDetail;
        setDetail(next);
        return next;
      } catch (err) {
        const message = err instanceof Error ? err.message : "Erreur inconnue";
        setError(message);
        if (!silent) {
          setDetail(null);
        }
        return null;
      } finally {
        if (!silent) {
          setLoading(false);
        }
      }
    },
    [registrationId]
  );

  useEffect(() => {
    setDetail(null);
    void reload();
  }, [reload]);

  return { detail, loading, error, reload, setDetail };
}
