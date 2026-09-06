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
import type { RegistrationStatus } from "@/lib/club-registration/registration-status";
import { REGISTRATION_STATUS_LABELS } from "@/lib/club-registration/registration-status";
import { PageHeader } from "@/components/ui";
import { AnalyticsCampaignTab } from "./AnalyticsCampaignTab";
import { AnalyticsCrossTabPanel } from "./AnalyticsCrossTabPanel";
import { AnalyticsExportButton } from "./AnalyticsExportButton";
import { AnalyticsFilterBar } from "./AnalyticsFilterBar";
import { AnalyticsFinanceTab } from "./AnalyticsFinanceTab";
import { AnalyticsMembersTab } from "./AnalyticsMembersTab";
import { AnalyticsOrganizationTab } from "./AnalyticsOrganizationTab";
import { AnalyticsTerritoryTab } from "./AnalyticsTerritoryTab";
import { useRegistrationAnalytics } from "./useRegistrationAnalytics";

type TabId = "campaign" | "members" | "organization" | "finance" | "territory" | "cross";

export function RegistrationAnalyticsClient() {
  const {
    seasonLabel,
    sectionLabels,
    slotLabels,
    competitionLabels,
    aidLabels,
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
    records,
  } = useRegistrationAnalytics();
  const [tab, setTab] = useState<TabId>("campaign");

  const handleSelectStatus = (status: RegistrationStatus | "all") => {
    applyFilterChange({ type: "status", value: status });
    if (status !== "all") {
      setTab("members");
    }
  };

  const statusFilterLabel =
    filters.status !== "all" && filters.status in REGISTRATION_STATUS_LABELS
      ? REGISTRATION_STATUS_LABELS[filters.status as RegistrationStatus]
      : null;

  return (
    <Container maxWidth="xl" sx={{ py: 3 }}>
      <Stack
        direction={{ xs: "column", md: "row" }}
        justifyContent="space-between"
        alignItems={{ xs: "stretch", md: "flex-start" }}
        spacing={2}
        sx={{ mb: 3 }}
      >
        <PageHeader
          eyebrow="Adhésions"
          title="Statistiques adhérents"
          subtitle={`Saison ${seasonLabel || "—"} · Campagne, organisation, finances.`}
          marginBottom={0}
        />
        {!loading && !error ? (
          <AnalyticsExportButton
            summary={summary}
            sectionLabels={sectionLabels}
            seasonLabel={seasonLabel}
          />
        ) : null}
      </Stack>

      <Stack spacing={3}>
        <AnalyticsFilterBar
          filters={filters}
          sectionLabels={sectionLabels}
          onChange={applyFilterChange}
          onReset={resetSecondaryFilters}
          onClearStatus={clearStatusFilter}
        />

        {error ? <Alert severity="error">{error}</Alert> : null}

        {loading ? (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress aria-label="Chargement des statistiques" />
          </Box>
        ) : (
          <>
            {truncated ? (
              <Alert severity="warning">
                Affichage limité aux 500 dossiers les plus récents. Les statistiques peuvent être
                incomplètes si la saison dépasse ce volume.
              </Alert>
            ) : null}

            <Tabs
              value={tab}
              onChange={(_, value: TabId) => setTab(value)}
              variant="scrollable"
              scrollButtons="auto"
              aria-label="Onglets statistiques adhérents"
            >
              <Tab value="campaign" label="Campagne" />
              <Tab value="members" label="Adhérents" />
              <Tab value="organization" label="Organisation" />
              <Tab value="finance" label="Finances" />
              <Tab value="territory" label="Territoire" />
              <Tab value="cross" label="Analyse croisée" />
            </Tabs>

            {tab === "campaign" && campaignSummary.total === 0 ? (
              <Alert severity="info">
                {records.length === 0
                  ? `Aucun dossier trouvé pour la saison ${seasonLabel || "courante"}.`
                  : "Aucun dossier ne correspond aux filtres section / sexe / adhésion."}
              </Alert>
            ) : null}

            {tab !== "campaign" && summary.total === 0 ? (
              <Alert severity="info">
                {records.length === 0
                  ? `Aucun dossier trouvé pour la saison ${seasonLabel || "courante"}.`
                  : statusFilterLabel
                    ? `Aucun dossier au statut « ${statusFilterLabel} » pour ces filtres.`
                    : "Aucun dossier ne correspond aux filtres actifs."}
              </Alert>
            ) : null}

            {tab === "campaign" ? (
              <AnalyticsCampaignTab
                summary={campaignSummary}
                records={campaignRecords}
                opsTodo={campaignOrganization.opsTodo}
                activeStatus={filters.status === "all" ? "all" : filters.status}
                onSelectStatus={handleSelectStatus}
              />
            ) : null}
            {tab === "members" ? (
              <AnalyticsMembersTab summary={summary} sectionLabels={sectionLabels} />
            ) : null}
            {tab === "organization" ? (
              <AnalyticsOrganizationTab
                organization={organization}
                slotLabels={slotLabels}
                competitionLabels={competitionLabels}
              />
            ) : null}
            {tab === "finance" ? (
              <AnalyticsFinanceTab finance={finance} aidLabels={aidLabels} />
            ) : null}
            {tab === "territory" ? (
              <AnalyticsTerritoryTab summary={summary} records={filteredRecords} />
            ) : null}
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
