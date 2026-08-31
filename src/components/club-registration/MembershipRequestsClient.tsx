"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
  type ManagedListQueueViewId,
} from "@/lib/club-registration/managed-list-saved-views";
import {
  buildSpreadsheetHref,
  formatManagedRequestsPageSubtitle,
  getManagedListPipelineTabCounts,
  getManagedListQueueViewCounts,
} from "@/lib/club-registration/managed-queue-summary";
import { resolveManagedListSelection } from "@/lib/club-registration/resolve-managed-list-selection";
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
    ppsFollowUpFilter,
    setPpsFollowUpFilter,
    criteriumFederalFilter,
    setCriteriumFederalFilter,
    jerseyFollowUpFilter,
    setJerseyFollowUpFilter,
    registrationCertificateFollowUpFilter,
    setRegistrationCertificateFollowUpFilter,
    aidReceiptFilter,
    setAidReceiptFilter,
    paymentSupplementFilter,
    setPaymentSupplementFilter,
    searchInput,
    setSearchInput,
    registrations,
    pageInfo,
    loadingList,
    loadingMore,
    error: listError,
    reload,
    loadMore,
    patchRegistration,
  } = useManagedRegistrations({
    statusFilter: initialUrlState.statusFilter,
    medicalCertificateFilter: initialUrlState.medicalCertificateFilter,
    ppsFollowUpFilter: initialUrlState.ppsFollowUpFilter,
    criteriumFederalFilter: initialUrlState.criteriumFederalFilter,
    jerseyFollowUpFilter: initialUrlState.jerseyFollowUpFilter,
    registrationCertificateFollowUpFilter: initialUrlState.registrationCertificateFollowUpFilter,
    aidReceiptFilter: initialUrlState.aidReceiptFilter,
    paymentSupplementFilter: initialUrlState.paymentSupplementFilter,
  });
  const [selectedId, setSelectedId] = useState<string | null>(initialUrlState.selectedId);
  const [queueViewId, setQueueViewId] = useState<ManagedListQueueViewId>(
    initialUrlState.queueViewId
  );
  const urlPinnedIdRef = useRef<string | null>(initialUrlState.selectedId);
  const [mobileListVisible, setMobileListVisible] = useState(true);
  const { summary: queueSummary, loading: queueSummaryLoading, reload: reloadQueueSummary } =
    useManagedQueueSummary();

  const queueViewCounts = useMemo(
    () => getManagedListQueueViewCounts(queueSummary),
    [queueSummary]
  );
  const pipelineTabCounts = useMemo(
    () => getManagedListPipelineTabCounts(queueSummary, queueViewId),
    [queueSummary, queueViewId]
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
  } = useMembershipRequestQueue(
    registrations,
    selectedId,
    setSelectedId,
    reload,
    statusFilter,
    queueViewId
  );

  const handleListReloadWithSummary: MembershipListReloadFn = useCallback(
    async (options) => {
      const result = await handleListReload(options);
      await reloadQueueSummary();
      return result;
    },
    [handleListReload, reloadQueueSummary]
  );

  const applySavedView = useCallback(
    (viewId: ManagedListQueueViewId) => {
      urlPinnedIdRef.current = null;
      const filters = getManagedListFiltersForSavedView(viewId);
      setQueueViewId(viewId);
      setStatusFilter(filters.statusFilter);
      setMedicalCertificateFilter(filters.medicalCertificateFilter);
      setAidReceiptFilter(filters.aidReceiptFilter);
      setPpsFollowUpFilter("all");
      setCriteriumFederalFilter("all");
      setJerseyFollowUpFilter("all");
      setRegistrationCertificateFollowUpFilter("all");
      setPaymentSupplementFilter("all");
    },
    [
      setAidReceiptFilter,
      setCriteriumFederalFilter,
      setJerseyFollowUpFilter,
      setMedicalCertificateFilter,
      setPaymentSupplementFilter,
      setPpsFollowUpFilter,
      setRegistrationCertificateFollowUpFilter,
      setStatusFilter,
    ]
  );

  useEffect(() => {
    syncToUrl({
      queueViewId,
      statusFilter,
      medicalCertificateFilter,
      ppsFollowUpFilter,
      criteriumFederalFilter,
      jerseyFollowUpFilter,
      registrationCertificateFollowUpFilter,
      aidReceiptFilter,
      paymentSupplementFilter,
      selectedId,
    });
  }, [
    aidReceiptFilter,
    criteriumFederalFilter,
    jerseyFollowUpFilter,
    paymentSupplementFilter,
    queueViewId,
    registrationCertificateFollowUpFilter,
    medicalCertificateFilter,
    ppsFollowUpFilter,
    selectedId,
    statusFilter,
    syncToUrl,
  ]);

  useEffect(() => {
    setSelectedId((current) => {
      const next = resolveManagedListSelection({
        selectedId: current,
        registrationIds: registrations.map((registration) => registration.id),
        listReady: !loadingList,
        preserveSelectedId: current !== null && current === urlPinnedIdRef.current,
      });
      return next === undefined ? current : next;
    });
  }, [loadingList, registrations]);

  useEffect(() => {
    if (isMobileLayout && selectedId) {
      setMobileListVisible(false);
    }
  }, [isMobileLayout, selectedId]);

  const handleSelectRegistration = useCallback(
    (id: string) => {
      urlPinnedIdRef.current = null;
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
    selectedId === null &&
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
      onStatusFilterChange={(value) => {
        urlPinnedIdRef.current = null;
        setStatusFilter(value);
      }}
      medicalCertificateFilter={medicalCertificateFilter}
      onMedicalCertificateFilterChange={setMedicalCertificateFilter}
      ppsFollowUpFilter={ppsFollowUpFilter}
      onPpsFollowUpFilterChange={setPpsFollowUpFilter}
      criteriumFederalFilter={criteriumFederalFilter}
      onCriteriumFederalFilterChange={setCriteriumFederalFilter}
      jerseyFollowUpFilter={jerseyFollowUpFilter}
      onJerseyFollowUpFilterChange={setJerseyFollowUpFilter}
      registrationCertificateFollowUpFilter={registrationCertificateFollowUpFilter}
      onRegistrationCertificateFollowUpFilterChange={setRegistrationCertificateFollowUpFilter}
      aidReceiptFilter={aidReceiptFilter}
      paymentSupplementFilter={paymentSupplementFilter}
      onPaymentSupplementFilterChange={setPaymentSupplementFilter}
      searchInput={searchInput}
      onSearchInputChange={setSearchInput}
      pageInfo={pageInfo}
      loadingList={loadingList}
      loadingMore={loadingMore}
      onLoadMore={() => void loadMore()}
      searchInputRef={searchInputRef}
      sessionViewedIds={sessionViewedIds}
      onListReload={handleListReloadWithSummary}
      activeViewId={queueViewId}
      onSelectSavedView={applySavedView}
      queueViewCounts={queueViewCounts}
      pipelineTabCounts={pipelineTabCounts}
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
      onPpsFollowUpPatched={(id, next) => {
        patchRegistration(id, { ppsFollowUpStatus: next.status });
      }}
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
