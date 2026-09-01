"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { readJsonResponse } from "@/lib/http/read-json-response";
import {
  aggregateRegistrationAnalytics,
  filterAnalyticsRecords,
} from "@/lib/club-registration/analytics/aggregate";
import type {
  AnalyticsFilterChange,
  AnalyticsFilters,
  AnalyticsRegistrationRecord,
  RegistrationAnalyticsSummary,
} from "@/lib/club-registration/analytics/types";

type AnalyticsApiResponse = {
  seasonLabel: string;
  sectionLabels: Record<string, string>;
  records: AnalyticsRegistrationRecord[];
  error?: string;
};

const DEFAULT_FILTERS: AnalyticsFilters = {
  status: "approved",
};

export function useRegistrationAnalytics() {
  const [seasonLabel, setSeasonLabel] = useState("");
  const [sectionLabels, setSectionLabels] = useState<Record<string, string>>({});
  const [records, setRecords] = useState<AnalyticsRegistrationRecord[]>([]);
  const [filters, setFilters] = useState<AnalyticsFilters>(DEFAULT_FILTERS);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/club/registrations/analytics", {
        credentials: "include",
        cache: "no-store",
      });
      const json = await readJsonResponse<AnalyticsApiResponse>(res);
      if (!res.ok) {
        throw new Error(json.error ?? "Impossible de charger les statistiques");
      }
      setSeasonLabel(json.seasonLabel);
      setSectionLabels(json.sectionLabels ?? {});
      setRecords(json.records ?? []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les statistiques");
      setRecords([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const filteredRecords = useMemo(
    () => filterAnalyticsRecords(records, filters),
    [records, filters]
  );

  const summary: RegistrationAnalyticsSummary = useMemo(
    () => aggregateRegistrationAnalytics(filteredRecords, seasonLabel),
    [filteredRecords, seasonLabel]
  );

  const applyFilterChange = useCallback((change: AnalyticsFilterChange) => {
    setFilters((prev) => {
      const next: AnalyticsFilters = { ...prev };
      switch (change.type) {
        case "status":
          next.status = change.value;
          break;
        case "mainSectionId":
          if (change.value === null) delete next.mainSectionId;
          else next.mainSectionId = change.value;
          break;
        case "sex":
          if (change.value === null) delete next.sex;
          else next.sex = change.value;
          break;
        case "wasSqyMemberLastYear":
          if (change.value === null) delete next.wasSqyMemberLastYear;
          else next.wasSqyMemberLastYear = change.value;
          break;
      }
      return next;
    });
  }, []);

  const resetSecondaryFilters = useCallback(() => {
    setFilters((prev) => ({
      status: prev.status,
    }));
  }, []);

  return {
    seasonLabel,
    sectionLabels,
    records,
    filteredRecords,
    summary,
    filters,
    applyFilterChange,
    resetSecondaryFilters,
    loading,
    error,
    reload: load,
  };
}
