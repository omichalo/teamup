"use client";

import { useCallback, useEffect, useState } from "react";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";

type DraftResponse = {
  config: RegistrationConfigV1;
  draftUpdatedAt: string | null;
  draftUpdatedBy: string | null;
  activePublishedAt: string | null;
  activeCatalogVersion: string | null;
};

export function useRegistrationConfigDraft() {
  const [draft, setDraft] = useState<RegistrationConfigV1 | null>(null);
  const [meta, setMeta] = useState<Omit<DraftResponse, "config"> | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/club/registration-config/draft");
      if (!res.ok) {
        const body = (await res.json()) as { error?: string };
        throw new Error(body.error ?? "Erreur de chargement");
      }
      const data = (await res.json()) as DraftResponse;
      setDraft(data.config);
      setMeta({
        draftUpdatedAt: data.draftUpdatedAt,
        draftUpdatedBy: data.draftUpdatedBy,
        activePublishedAt: data.activePublishedAt,
        activeCatalogVersion: data.activeCatalogVersion,
      });
      setDirty(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const updateDraft = useCallback((next: RegistrationConfigV1) => {
    setDraft(next);
    setDirty(true);
  }, []);

  const saveDraft = useCallback(async () => {
    if (!draft) return false;
    setSaving(true);
    setError(null);
    try {
      const res = await fetch("/api/club/registration-config/draft", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ config: draft }),
      });
      const body = (await res.json()) as {
        error?: string;
        details?: string[];
      };
      if (!res.ok) {
        throw new Error(
          body.details?.join("\n") ?? body.error ?? "Erreur de sauvegarde"
        );
      }
      setDirty(false);
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de sauvegarde");
      return false;
    } finally {
      setSaving(false);
    }
  }, [draft, load]);

  const publish = useCallback(async () => {
    setPublishing(true);
    setError(null);
    try {
      if (dirty) {
        const saved = await saveDraft();
        if (!saved) return false;
      }
      const res = await fetch("/api/club/registration-config/publish", {
        method: "POST",
      });
      const body = (await res.json()) as {
        error?: string;
        details?: string[];
      };
      if (!res.ok) {
        throw new Error(
          body.details?.join("\n") ?? body.error ?? "Erreur de publication"
        );
      }
      await load();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de publication");
      return false;
    } finally {
      setPublishing(false);
    }
  }, [dirty, load, saveDraft]);

  return {
    draft,
    meta,
    loading,
    saving,
    publishing,
    error,
    dirty,
    load,
    updateDraft,
    saveDraft,
    publish,
  };
}
