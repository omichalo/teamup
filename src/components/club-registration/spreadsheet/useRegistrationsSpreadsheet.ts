"use client";

import { useCallback, useEffect, useState } from "react";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import type { SpreadsheetUserLabelDirectory } from "@/lib/club-registration/spreadsheet/user-labels";
import {
  getDefaultSpreadsheetPreferences,
  type RegistrationsSpreadsheetPreferences,
} from "@/lib/club-registration/spreadsheet/preferences";

type SpreadsheetApiResponse =
  | {
      registrations: RegistrationClientRecord[];
      totalCount: number;
      truncated: boolean;
      userLabels: SpreadsheetUserLabelDirectory;
    }
  | { error: string };

type PreferencesApiResponse =
  | { preferences: RegistrationsSpreadsheetPreferences }
  | { error: string };

export function useRegistrationsSpreadsheet() {
  const [registrations, setRegistrations] = useState<RegistrationClientRecord[]>([]);
  const [userLabels, setUserLabels] = useState<SpreadsheetUserLabelDirectory>({});
  const [truncated, setTruncated] = useState(false);
  const [preferences, setPreferences] = useState<RegistrationsSpreadsheetPreferences>(
    getDefaultSpreadsheetPreferences()
  );
  const [loading, setLoading] = useState(true);
  const [savingPreferences, setSavingPreferences] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [dataRes, prefsRes] = await Promise.all([
        fetch("/api/club/registrations/spreadsheet"),
        fetch("/api/club/registrations/spreadsheet-preferences"),
      ]);

      const data = (await dataRes.json()) as SpreadsheetApiResponse;
      const prefs = (await prefsRes.json()) as PreferencesApiResponse;

      if (!dataRes.ok || "error" in data) {
        throw new Error("error" in data ? data.error : "Chargement impossible");
      }
      if (!prefsRes.ok || "error" in prefs) {
        throw new Error("error" in prefs ? prefs.error : "Préférences indisponibles");
      }

      setRegistrations(data.registrations);
      setUserLabels(data.userLabels ?? {});
      setTruncated(data.truncated);
      setPreferences(prefs.preferences);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const savePreferences = useCallback(
    async (next: RegistrationsSpreadsheetPreferences) => {
      setSavingPreferences(true);
      setError(null);
      try {
        const res = await fetch("/api/club/registrations/spreadsheet-preferences", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ preferences: next }),
        });
        const body = (await res.json()) as PreferencesApiResponse;
        if (!res.ok || "error" in body) {
          throw new Error("error" in body ? body.error : "Enregistrement impossible");
        }
        setPreferences(body.preferences);
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Erreur d'enregistrement");
        throw saveError;
      } finally {
        setSavingPreferences(false);
      }
    },
    []
  );

  return {
    registrations,
    userLabels,
    truncated,
    preferences,
    loading,
    savingPreferences,
    error,
    reload: load,
    savePreferences,
  };
}
