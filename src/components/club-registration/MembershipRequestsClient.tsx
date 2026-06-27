"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Button,
  Container,
  Grid,
  Stack,
  useMediaQuery,
  useTheme,
} from "@mui/material";
import { Refresh as RefreshIcon, TableChart as TableChartIcon } from "@mui/icons-material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import Link from "next/link";
import { PageHeader } from "@/components/ui";
import {
  getManagedListFiltersForSavedView,
  resolveManagedListSavedViewFromFilters,
} from "@/lib/club-registration/managed-list-saved-views";
import {
  buildSpreadsheetHref,
  formatManagedRequestsPageSubtitle,
} from "@/lib/club-registration/managed-queue-summary";
import type { SpreadsheetSavedViewId } from "@/lib/club-registration/spreadsheet/quick-filters";
import { MembershipRequestDetailPanel } from "./membership-requests/MembershipRequestDetailPanel";
import { MembershipRequestsListPanel } from "./membership-requests/MembershipRequestsListPanel";
import { MembershipRequestsQueueComplete } from "./membership-requests/MembershipRequestsQueueComplete";
import { useManagedListUrlSync } from "./membership-requests/useManagedListUrlSync";
import { useManagedQueueSummary } from "./membership-requests/useManagedQueueSummary";
import { useManagedRegistrations } from "./membership-requests/useManagedRegistrations";
import { useMembershipRequestQueue } from "./membership-requests/useMembershipRequestQueue";
import type { MembershipListReloadFn } from "./membership-requests/types";

export function MembershipRequestsClient() {
  const theme = useTheme();
  const isMobileLayout = useMediaQuery(theme.breakpoints.down("md"));
  const { initial: initialUrlState, syncToUrl } = useManagedListUrlSync();
  const {
    statusFilter,
    setStatusFilter,
    medicalCertificateFilter,
    setMedicalCertificateFilter,
    searchInput,
    setSearchInput,
    registrations,
    pageInfo,
    loadingList,
    loadingMore,
    error: listError,
    reload,
    loadMore,
  } = useManagedRegistrations({
    statusFilter: initialUrlState.statusFilter,
    medicalCertificateFilter: initialUrlState.medicalCertificateFilter,
  });
  const [selectedId, setSelectedId] = useState<string | null>(initialUrlState.selectedId);
  const [mobileListVisible, setMobileListVisible] = useState(true);
  const { summary: queueSummary, loading: queueSummaryLoading, reload: reloadQueueSummary } =
    useManagedQueueSummary();

  const activeViewId = useMemo(
    () => resolveManagedListSavedViewFromFilters(statusFilter, medicalCertificateFilter),
    [medicalCertificateFilter, statusFilter]
  );

  const {
    position,
    total,
    remaining,
    filterLabel,
    canGoPrevious,
    canGoNext,
    sessionProcessedCount,
    sessionViewedIds,
    queueJustCompleted,
    searchInputRef,
    goToPrevious,
    goToNext,
    handleListReload,
  } = useMembershipRequestQueue(registrations, selectedId, setSelectedId, reload, statusFilter);

  const handleListReloadWithSummary: MembershipListReloadFn = useCallback(
    async (options) => {
      const result = await handleListReload(options);
      await reloadQueueSummary();
      return result;
    },
    [handleListReload, reloadQueueSummary]
  );

  const applySavedView = useCallback(
    (viewId: SpreadsheetSavedViewId) => {
      const filters = getManagedListFiltersForSavedView(viewId);
      setStatusFilter(filters.statusFilter);
      setMedicalCertificateFilter(filters.medicalCertificateFilter);
    },
    [setMedicalCertificateFilter, setStatusFilter]
  );

  useEffect(() => {
    syncToUrl({
      statusFilter,
      medicalCertificateFilter,
      selectedId,
    });
  }, [medicalCertificateFilter, selectedId, statusFilter, syncToUrl]);

  useEffect(() => {
    if (registrations.length === 0) {
      setSelectedId((current) => (current === null ? current : null));
      return;
    }

    setSelectedId((current) => {
      if (current && registrations.some((registration) => registration.id === current)) {
        return current;
      }
      return registrations[0]?.id ?? null;
    });
  }, [registrations]);

  useEffect(() => {
    if (isMobileLayout && selectedId) {
      setMobileListVisible(false);
    }
  }, [isMobileLayout, selectedId]);

  const handleSelectRegistration = useCallback(
    (id: string) => {
      setSelectedId(id);
      if (isMobileLayout) {
        setMobileListVisible(false);
      }
    },
    [isMobileLayout]
  );

  const selectedSummary = useMemo(
    () => registrations.find((registration) => registration.id === selectedId) ?? null,
    [registrations, selectedId]
  );

  const spreadsheetHref = useMemo(() => {
    if (!selectedSummary) {
      return null;
    }
    const searchParts = [selectedSummary.firstName, selectedSummary.lastName]
      .filter((value): value is string => typeof value === "string" && value.length > 0)
      .join(" ");
    return buildSpreadsheetHref({
      registrationId: selectedSummary.id,
      searchQuery: searchParts || selectedSummary.submitterAccountEmail || null,
    });
  }, [selectedSummary]);

  const showQueueComplete =
    !loadingList &&
    registrations.length === 0 &&
    (queueJustCompleted || sessionProcessedCount > 0);

  const pageSubtitle = queueSummaryLoading
    ? "Chargement…"
    : formatManagedRequestsPageSubtitle(queueSummary);

  const showMobileList = !isMobileLayout || mobileListVisible || !selectedId;
  const showMobileDetail = !isMobileLayout || !mobileListVisible;

  const listPanel = (
    <MembershipRequestsListPanel
      registrations={registrations}
      selectedId={selectedId}
      onSelect={handleSelectRegistration}
      statusFilter={statusFilter}
      onStatusFilterChange={setStatusFilter}
      medicalCertificateFilter={medicalCertificateFilter}
      onMedicalCertificateFilterChange={setMedicalCertificateFilter}
      searchInput={searchInput}
      onSearchInputChange={setSearchInput}
      pageInfo={pageInfo}
      loadingList={loadingList}
      loadingMore={loadingMore}
      onLoadMore={() => void loadMore()}
      searchInputRef={searchInputRef}
      sessionViewedIds={sessionViewedIds}
      actionableCount={queueSummary.actionable}
      onListReload={handleListReloadWithSummary}
      activeViewId={activeViewId}
      onSelectSavedView={applySavedView}
    />
  );

  const detailPanel = showQueueComplete ? (
    <MembershipRequestsQueueComplete
      processedCount={sessionProcessedCount}
      filterLabel={filterLabel}
      paymentRequestedCount={queueSummary.paymentRequested}
      onShowPaymentRequested={() => applySavedView("payment_pending")}
    />
  ) : (
    <MembershipRequestDetailPanel
      registrationId={selectedId}
      statusSummary={selectedSummary}
      onListReload={handleListReloadWithSummary}
      showAlerts
      queuePosition={position}
      queueTotal={total}
      queueRemaining={remaining}
      queueFilterLabel={filterLabel}
      canGoPrevious={canGoPrevious}
      canGoNext={canGoNext}
      spreadsheetHref={spreadsheetHref}
      onQueuePrevious={goToPrevious}
      onQueueNext={goToNext}
    />
  );

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 2.5 } }}>
      <Stack spacing={1.5}>
        <PageHeader
          eyebrow="Secrétariat"
          title="Dossiers à valider"
          subtitle={pageSubtitle}
          sx={{
            "& h1": { fontSize: { xs: "1.5rem", sm: "1.75rem" } },
            "& .MuiTypography-body1": { fontSize: "0.875rem", lineHeight: 1.45 },
          }}
          actions={
            <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
              <Button
                component={Link}
                href="/club/adhesions-tableau?vue=to_review"
                variant="outlined"
                startIcon={<TableChartIcon />}
              >
                Vue tableau
              </Button>
              <Button
                variant="outlined"
                startIcon={<RefreshIcon />}
                onClick={() => {
                  void reload();
                  void reloadQueueSummary();
                }}
                disabled={loadingList}
              >
                Actualiser
              </Button>
            </Stack>
          }
        />

        {listError ? <Alert severity="error">{listError}</Alert> : null}

        {isMobileLayout && showMobileDetail && selectedId ? (
          <Button
            size="small"
            variant="outlined"
            startIcon={<ArrowBackIcon />}
            onClick={() => setMobileListVisible(true)}
            sx={{ alignSelf: "flex-start" }}
          >
            Retour à la liste
            {registrations.length > 0 ? ` (${registrations.length})` : ""}
          </Button>
        ) : null}

        <Grid container spacing={2} sx={{ alignItems: "stretch" }}>
          {showMobileList ? (
            <Grid size={{ xs: 12, md: 5, lg: 5 }} sx={{ display: "flex", minWidth: 0 }}>
              {listPanel}
            </Grid>
          ) : null}

          {showMobileDetail ? (
            <Grid
              size={{ xs: 12, md: showMobileList ? 7 : 12, lg: showMobileList ? 7 : 12 }}
              sx={{ display: "flex", minWidth: 0 }}
            >
              {detailPanel}
            </Grid>
          ) : null}
        </Grid>
      </Stack>
    </Container>
  );
}
