"use client";

import { useEffect, useRef, useState } from "react";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import type { RegistrationDraftActions } from "./useRegistrationDraft";
import type { UseRegistrationDraftStorage } from "./useRegistrationDraftStorage";

type Params = {
  config: RegistrationConfigV1;
  configLoading: boolean;
  storage: UseRegistrationDraftStorage;
  hydrate: RegistrationDraftActions["hydrate"];
};

/** Charge le brouillon local une fois la config active disponible. */
export function useRegistrationWizardHydration({
  config,
  configLoading,
  storage,
  hydrate,
}: Params): boolean {
  const [hydrating, setHydrating] = useState(true);
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    if (hasHydratedRef.current || configLoading) return;
    hasHydratedRef.current = true;
    const local = storage.load();
    if (local) hydrate(local, config);
    setHydrating(false);
  }, [config, configLoading, hydrate, storage]);

  return hydrating;
}
