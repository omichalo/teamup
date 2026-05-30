"use client";

import { useCallback, useEffect, useState } from "react";
import { getDefaultRegistrationConfig } from "@/lib/club-registration-config/default-config";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";

type ActiveConfigResponse = {
  config: RegistrationConfigV1;
  publishedAt: string | null;
  catalogVersion: string;
};

let cachedActiveConfig: RegistrationConfigV1 | null = null;
let cachedFetchPromise: Promise<RegistrationConfigV1> | null = null;

async function fetchActiveConfig(): Promise<RegistrationConfigV1> {
  if (cachedActiveConfig) return cachedActiveConfig;
  if (cachedFetchPromise) return cachedFetchPromise;

  cachedFetchPromise = fetch("/api/club/registration-config/active")
    .then(async (res) => {
      if (!res.ok) {
        throw new Error("Impossible de charger la configuration");
      }
      const data = (await res.json()) as ActiveConfigResponse;
      cachedActiveConfig = data.config;
      return data.config;
    })
    .catch(() => getDefaultRegistrationConfig())
    .finally(() => {
      cachedFetchPromise = null;
    });

  return cachedFetchPromise;
}

export function invalidateActiveRegistrationConfigCache(): void {
  cachedActiveConfig = null;
}

export function useRegistrationConfig() {
  const [config, setConfig] = useState<RegistrationConfigV1 | null>(cachedActiveConfig);
  const [loading, setLoading] = useState(!cachedActiveConfig);
  const [error, setError] = useState<string | null>(null);

  const reload = useCallback(async () => {
    invalidateActiveRegistrationConfigCache();
    setLoading(true);
    setError(null);
    try {
      const next = await fetchActiveConfig();
      setConfig(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
      setConfig(getDefaultRegistrationConfig());
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (cachedActiveConfig) {
      setConfig(cachedActiveConfig);
      setLoading(false);
      return;
    }
    void reload();
  }, [reload]);

  return { config, loading, error, reload };
}

export function useRegistrationConfigValue(): RegistrationConfigV1 {
  const { config } = useRegistrationConfig();
  return config ?? getDefaultRegistrationConfig();
}
