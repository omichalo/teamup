"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { RegistrationDraft } from "./registration-defaults";

const STORAGE_KEY = "teamup:club-registration:v1";
const DISABLED_KEY = "teamup:club-registration:storage-disabled";
const SCHEMA_VERSION = 1;
const SAVE_DEBOUNCE_MS = 500;

type StoragePayload = {
  schemaVersion: number;
  draft: RegistrationDraft;
  updatedAt: string;
};

export type DraftStorageStatus = "idle" | "saving" | "saved" | "disabled";

export type UseRegistrationDraftStorage = {
  status: DraftStorageStatus;
  lastSavedAt: Date | null;
  isDisabled: boolean;
  load: () => RegistrationDraft | null;
  save: (draft: RegistrationDraft) => void;
  saveNow: (draft: RegistrationDraft) => void;
  clear: () => void;
  disable: () => void;
  enable: () => void;
};

function readDisabledFlag(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(DISABLED_KEY) === "1";
  } catch {
    return false;
  }
}

function readStoredDraft(): RegistrationDraft | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed: unknown = JSON.parse(raw);
    if (
      !parsed ||
      typeof parsed !== "object" ||
      (parsed as StoragePayload).schemaVersion !== SCHEMA_VERSION
    ) {
      window.localStorage.removeItem(STORAGE_KEY);
      return null;
    }
    return (parsed as StoragePayload).draft;
  } catch {
    return null;
  }
}

/**
 * Sauvegarde locale du brouillon d'inscription (RGPD : transparence via DraftStorageDisclosure).
 * Stocke en JSON avec versioning pour migration future.
 * Sauvegarde activée par défaut, l'utilisateur peut désactiver/effacer à tout moment.
 */
export function useRegistrationDraftStorage(): UseRegistrationDraftStorage {
  const [isDisabled, setIsDisabled] = useState<boolean>(false);
  const [status, setStatus] = useState<DraftStorageStatus>("idle");
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setIsDisabled(readDisabledFlag());
  }, []);

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const load = useCallback((): RegistrationDraft | null => {
    if (readDisabledFlag()) return null;
    return readStoredDraft();
  }, []);

  const writeNow = useCallback((draft: RegistrationDraft) => {
    if (typeof window === "undefined") return;
    if (readDisabledFlag()) return;
    try {
      const payload: StoragePayload = {
        schemaVersion: SCHEMA_VERSION,
        draft,
        updatedAt: new Date().toISOString(),
      };
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
      setLastSavedAt(new Date());
      setStatus("saved");
    } catch {
      // Quota exceeded ou storage indisponible : on ignore silencieusement.
      setStatus("idle");
    }
  }, []);

  const save = useCallback(
    (draft: RegistrationDraft) => {
      if (readDisabledFlag()) return;
      setStatus("saving");
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        writeNow(draft);
      }, SAVE_DEBOUNCE_MS);
    },
    [writeNow]
  );

  const saveNow = useCallback(
    (draft: RegistrationDraft) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      writeNow(draft);
    },
    [writeNow]
  );

  const clear = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setLastSavedAt(null);
    setStatus(readDisabledFlag() ? "disabled" : "idle");
  }, []);

  const disable = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.setItem(DISABLED_KEY, "1");
      window.localStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
    setIsDisabled(true);
    setLastSavedAt(null);
    setStatus("disabled");
  }, []);

  const enable = useCallback(() => {
    if (typeof window === "undefined") return;
    try {
      window.localStorage.removeItem(DISABLED_KEY);
    } catch {
      /* ignore */
    }
    setIsDisabled(false);
    setStatus("idle");
  }, []);

  return {
    status: isDisabled ? "disabled" : status,
    lastSavedAt,
    isDisabled,
    load,
    save,
    saveNow,
    clear,
    disable,
    enable,
  };
}
