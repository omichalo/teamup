"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  CircularProgress,
  Container,
  Stack,
  Tab,
  Tabs,
} from "@mui/material";
import { MANAGED_LIST_STATUS_FILTER_OPTIONS } from "@/lib/club-registration/registration-status";
import { PageHeader } from "@/components/ui";
import { AnalyticsCrossTabPanel } from "./AnalyticsCrossTabPanel";
import { AnalyticsDemographicsTab } from "./AnalyticsDemographicsTab";
import { AnalyticsFilterBar } from "./AnalyticsFilterBar";
import { AnalyticsGeoTab } from "./AnalyticsGeoTab";
import { AnalyticsOverviewTab } from "./AnalyticsOverviewTab";
import { useRegistrationAnalytics } from "./useRegistrationAnalytics";

type TabId = "overview" | "demographics" | "geo" | "cross";

export function RegistrationAnalyticsClient() {
  const {
    seasonLabel,
    sectionLabels,
    filteredRecords,
    summary,
    filters,
    applyFilterChange,
    resetSecondaryFilters,
    loading,
    error,
    records,
  } = useRegistrationAnalytics();
  const [tab, setTab] = useState<TabId>("overview");

  const statusFilterLabel =
    MANAGED_LIST_STATUS_FILTER_OPTIONS.find((opt) => opt.value === filters.status)?.label ??
    filters.status;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <PageHeader
        eyebrow="Adhésions"
        title="Statistiques adhérents"
        subtitle={`Saison ${seasonLabel || "—"} · KPI et graphiques sur les dossiers d'adhésion.`}
        marginBottom={3}
      />

      <Stack spacing={3}>
        <AnalyticsFilterBar
          filters={filters}
          sectionLabels={sectionLabels}
          onChange={applyFilterChange}
          onReset={resetSecondaryFilters}
        />

        {error ? <Alert severity="error">{error}</Alert> : null}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress aria-label="Chargement des statistiques" />
          </Box>
        ) : (
          <>
            <Tabs
              value={tab}
              onChange={(_, value: TabId) => setTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="Onglets statistiques adhérents"
            >
              <Tab value="overview" label="Vue d'ensemble" />
              <Tab value="demographics" label="Démographie & pratique" />
              <Tab value="geo" label="Géographie" />
              <Tab value="cross" label="Analyse croisée" />
            </Tabs>

            {summary.total === 0 ? (
              <Alert severity="info">
                {records.length === 0
                  ? `Aucun dossier trouvé pour la saison ${seasonLabel || "courante"}.`
                  : `Aucun dossier ne correspond au filtre « ${statusFilterLabel} » (${records.length} dossier(s) chargé(s)). Essayez « Tous » ou un autre statut.`}
              </Alert>
            ) : null}

            {tab === "overview" ? (
              <AnalyticsOverviewTab summary={summary} sectionLabels={sectionLabels} />
            ) : null}
            {tab === "demographics" ? (
              <AnalyticsDemographicsTab summary={summary} sectionLabels={sectionLabels} />
            ) : null}
            {tab === "geo" ? <AnalyticsGeoTab summary={summary} /> : null}
            {tab === "cross" ? (
              <AnalyticsCrossTabPanel
                records={filteredRecords}
                seasonLabel={seasonLabel}
                sectionLabels={sectionLabels}
              />
            ) : null}
          </>
        )}
      </Stack>
    </Container>
  );
}
