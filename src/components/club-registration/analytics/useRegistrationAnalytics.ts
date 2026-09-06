"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { readJsonResponse } from "@/lib/http/read-json-response";
import {
  aggregateRegistrationAnalytics,
  filterAnalyticsRecords,
} from "@/lib/club-registration/analytics/aggregate";
import {
  aggregateFinanceAnalytics,
  aggregateOrganizationAnalytics,
} from "@/lib/club-registration/analytics/aggregate-ops";
import type {
  AnalyticsFilterChange,
  AnalyticsFilters,
  AnalyticsRegistrationRecord,
  FinanceAnalyticsSummary,
  OrganizationAnalyticsSummary,
  RegistrationAnalyticsSummary,
} from "@/lib/club-registration/analytics/types";

type AnalyticsApiResponse = {
  seasonLabel: string;
  sectionLabels: Record<string, string>;
  slotLabels?: Record<string, string>;
  competitionLabels?: Record<string, string>;
  aidLabels?: Record<string, string>;
  records: AnalyticsRegistrationRecord[];
  truncated?: boolean;
  error?: string;
};

const DEFAULT_FILTERS: AnalyticsFilters = {
  status: "all",
};

export function useRegistrationAnalytics() {
  const [seasonLabel, setSeasonLabel] = useState("");
  const [sectionLabels, setSectionLabels] = useState<Record<string, string>>({});
  const [slotLabels, setSlotLabels] = useState<Record<string, string>>({});
  const [competitionLabels, setCompetitionLabels] = useState<Record<string, string>>({});
  const [aidLabels, setAidLabels] = useState<Record<string, string>>({});
  const [records, setRecords] = useState<AnalyticsRegistrationRecord[]>([]);
  const [truncated, setTruncated] = useState(false);
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
      setSlotLabels(json.slotLabels ?? {});
      setCompetitionLabels(json.competitionLabels ?? {});
      setAidLabels(json.aidLabels ?? {});
      setRecords(json.records ?? []);
      setTruncated(Boolean(json.truncated));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Impossible de charger les statistiques");
      setRecords([]);
      setTruncated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  const campaignRecords = useMemo(
    () => filterAnalyticsRecords(records, { ...filters, status: "all" }),
    [records, filters]
  );

  const campaignSummary: RegistrationAnalyticsSummary = useMemo(
    () => aggregateRegistrationAnalytics(campaignRecords, seasonLabel),
    [campaignRecords, seasonLabel]
  );

  const campaignOrganization: OrganizationAnalyticsSummary = useMemo(
    () => aggregateOrganizationAnalytics(campaignRecords),
    [campaignRecords]
  );

  const filteredRecords = useMemo(
    () => filterAnalyticsRecords(records, filters),
    [records, filters]
  );

  const summary: RegistrationAnalyticsSummary = useMemo(
    () => aggregateRegistrationAnalytics(filteredRecords, seasonLabel),
    [filteredRecords, seasonLabel]
  );

  const organization: OrganizationAnalyticsSummary = useMemo(
    () => aggregateOrganizationAnalytics(filteredRecords),
    [filteredRecords]
  );

  const finance: FinanceAnalyticsSummary = useMemo(
    () => aggregateFinanceAnalytics(filteredRecords),
    [filteredRecords]
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

  const clearStatusFilter = useCallback(() => {
    setFilters((prev) => ({ ...prev, status: "all" }));
  }, []);

  return {
    seasonLabel,
    sectionLabels,
    slotLabels,
    competitionLabels,
    aidLabels,
    records,
    campaignRecords,
    campaignSummary,
    campaignOrganization,
    filteredRecords,
    summary,
    organization,
    finance,
    filters,
    applyFilterChange,
    resetSecondaryFilters,
    clearStatusFilter,
    truncated,
    loading,
    error,
    reload: load,
  };
}
