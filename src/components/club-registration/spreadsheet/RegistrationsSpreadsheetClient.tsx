"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  Alert,
  Box,
  Button,
  CircularProgress,
  Container,
  Stack,
} from "@mui/material";
import RateReviewIcon from "@mui/icons-material/RateReview";
import { PageHeader, SectionCard } from "@/components/ui";
import { useRegistrationConfig } from "@/hooks/useRegistrationConfig";
import { buildManagedTreatQueueHref } from "@/lib/club-registration/managed-queue-summary";
import {
  buildSpreadsheetCsvContent,
  buildSpreadsheetExportFilename,
  downloadSpreadsheetCsv,
} from "@/lib/club-registration/spreadsheet/export-csv";
import type { SpreadsheetFormatContext } from "@/lib/club-registration/spreadsheet/format-context";
import { computeSpreadsheetSummaryStats } from "@/lib/club-registration/spreadsheet/quick-filters";
import type { SpreadsheetTableDensity } from "@/lib/club-registration/spreadsheet/preferences";
import { getVisibleColumnsInOrder } from "@/lib/club-registration/spreadsheet/preferences";
import { resolveSpreadsheetTableDensity } from "@/lib/club-registration/spreadsheet/table-density";
import type { SpreadsheetColumnId } from "@/lib/club-registration/spreadsheet/column-ids";
import {
  applySpreadsheetFilters,
  hasActiveSpreadsheetFilters,
  sortSpreadsheetRows,
  type SpreadsheetSort,
} from "@/lib/club-registration/spreadsheet/row-processing";
import { useManagedQueueSummary } from "@/components/club-registration/membership-requests/useManagedQueueSummary";
import { MembershipRequestDetailModal } from "../membership-requests/MembershipRequestDetailModal";
import { SpreadsheetColumnPicker } from "./SpreadsheetColumnPicker";
import { SpreadsheetSummaryBar } from "./SpreadsheetSummaryBar";
import { SpreadsheetTable, SpreadsheetTableHint } from "./SpreadsheetTable";
import { SpreadsheetToolbar } from "./SpreadsheetToolbar";
import { useRegistrationsSpreadsheet } from "./useRegistrationsSpreadsheet";
import { useSpreadsheetColumnResize } from "./useSpreadsheetColumnResize";
import { useSpreadsheetFilterState } from "./useSpreadsheetFilterState";
import { useSpreadsheetUrlSync } from "./useSpreadsheetUrlSync";

export function RegistrationsSpreadsheetClient() {
  const { config } = useRegistrationConfig();
  const { initial, syncToUrl } = useSpreadsheetUrlSync();
  const { summary: queueSummary, loading: queueSummaryLoading } = useManagedQueueSummary();
  const {
    registrations,
    userLabels,
    truncated,
    preferences,
    loading,
    savingPreferences,
    error,
    reload,
    savePreferences,
  } = useRegistrationsSpreadsheet();

  const { getColumnWidth, startResize } = useSpreadsheetColumnResize(preferences, savePreferences);

  const urlBootstrap = useMemo(
    () => ({
      ...(initial.viewId ? { viewId: initial.viewId } : {}),
      ...(initial.searchQuery ? { searchQuery: initial.searchQuery } : {}),
    }),
    [initial.searchQuery, initial.viewId]
  );

  const {
    searchQuery,
    setSearchQuery,
    columnFilters,
    setColumnFilters,
    showColumnFilters,
    setShowColumnFilters,
    quickFilters,
    activeViewId,
    searchInputRef,
    applySavedView,
    toggleRegistrationStatusFilter,
    togglePaymentStatusFilter,
    clearAllFilters,
  } = useSpreadsheetFilterState(preferences, savePreferences, urlBootstrap);

  const formatContext = useMemo<SpreadsheetFormatContext>(
    () => ({ userLabels }),
    [userLabels]
  );

  const [sort, setSort] = useState<SpreadsheetSort>(
    initial.sort ?? {
      columnId: "submittedAt",
      direction: "desc",
    }
  );
  const [columnPickerOpen, setColumnPickerOpen] = useState(false);
  const [draftColumns, setDraftColumns] = useState(preferences.columns);
  const [modalRegistrationId, setModalRegistrationId] = useState<string | null>(
    initial.openRegistrationId ?? null
  );
  const dossierOpenedRef = useRef(Boolean(initial.openRegistrationId));

  const visibleColumnIds = useMemo(
    () => getVisibleColumnsInOrder(preferences),
    [preferences]
  );

  const tableDensity = resolveSpreadsheetTableDensity(preferences.tableDensity);

  const handleTableDensityChange = async (density: SpreadsheetTableDensity) => {
    try {
      await savePreferences({
        ...preferences,
        tableDensity: density,
      });
    } catch {
      // error surfaced via hook state
    }
  };

  const activeColumnFilterCount = useMemo(
    () =>
      visibleColumnIds.filter((columnId) => (columnFilters[columnId]?.trim().length ?? 0) > 0)
        .length,
    [visibleColumnIds, columnFilters]
  );

  const displayedRows = useMemo(() => {
    const filtered = applySpreadsheetFilters(registrations, {
      globalSearchQuery: searchQuery,
      columnFilters,
      visibleColumnIds,
      config,
      context: formatContext,
      quickFilters,
    });
    return sortSpreadsheetRows(filtered, sort, config, formatContext);
  }, [
    registrations,
    searchQuery,
    columnFilters,
    visibleColumnIds,
    sort,
    config,
    formatContext,
    quickFilters,
  ]);

  const summaryStats = useMemo(
    () => computeSpreadsheetSummaryStats(displayedRows),
    [displayedRows]
  );

  const treatQueueHref = buildManagedTreatQueueHref();
  const treatQueueLabel =
    !queueSummaryLoading && queueSummary.actionable > 0
      ? `Traiter les dossiers · ${queueSummary.actionable}`
      : "Traiter les dossiers";

  useEffect(() => {
    if (loading || dossierOpenedRef.current || !initial.openRegistrationId) {
      return;
    }
    setModalRegistrationId(initial.openRegistrationId);
    dossierOpenedRef.current = true;
  }, [initial.openRegistrationId, loading]);

  useEffect(() => {
    syncToUrl({
      viewId: activeViewId,
      searchQuery,
      sort,
      openRegistrationId: modalRegistrationId,
    });
  }, [activeViewId, modalRegistrationId, searchQuery, sort, syncToUrl]);

  const handleSortChange = (columnId: SpreadsheetColumnId) => {
    setSort((current) => {
      if (current?.columnId === columnId) {
        return {
          columnId,
          direction: current.direction === "asc" ? "desc" : "asc",
        };
      }
      return { columnId, direction: "asc" };
    });
  };

  const handleColumnFilterChange = (columnId: SpreadsheetColumnId, value: string) => {
    setColumnFilters((current) => ({ ...current, [columnId]: value }));
  };

  const openColumnPicker = () => {
    setDraftColumns(preferences.columns);
    setColumnPickerOpen(true);
  };

  const handleSaveColumns = async () => {
    const next = { ...preferences, columns: draftColumns };
    try {
      await savePreferences(next);
      setColumnPickerOpen(false);
    } catch {
      // error surfaced via hook state
    }
  };

  const openRegistration = (registrationId: string) => {
    setModalRegistrationId(registrationId);
  };

  const handleExportCsv = () => {
    const content = buildSpreadsheetCsvContent(
      displayedRows,
      visibleColumnIds,
      config,
      formatContext
    );
    downloadSpreadsheetCsv(buildSpreadsheetExportFilename(), content);
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 2, sm: 2.5 } }}>
      <Stack spacing={2}>
        <PageHeader
          eyebrow="Adhésions"
          title="Tableau des adhésions"
          subtitle="Filtrez, exportez et ouvrez un dossier en modale."
          sx={{ "& h1": { fontSize: { xs: "1.5rem", sm: "1.75rem" } } }}
          actions={
            <Button
              component={Link}
              href={treatQueueHref}
              variant="outlined"
              startIcon={<RateReviewIcon />}
            >
              {treatQueueLabel}
            </Button>
          }
        />

        {error ? <Alert severity="error">{error}</Alert> : null}

        <SectionCard
          contentSx={{
            pt: 1.5,
            pb: 1.5,
            px: { xs: 2, sm: 2.5 },
            display: "flex",
            flexDirection: "column",
            minHeight: { lg: "calc(100vh - 152px)" },
          }}
        >
          <SpreadsheetToolbar
            embedded
            rowCount={displayedRows.length}
            totalCount={registrations.length}
            truncated={truncated}
            searchQuery={searchQuery}
            searchInputRef={searchInputRef}
            showColumnFilters={showColumnFilters}
            hasActiveFilters={hasActiveSpreadsheetFilters(
              searchQuery,
              columnFilters,
              quickFilters
            )}
            activeColumnFilterCount={activeColumnFilterCount}
            quickFilters={quickFilters}
            activeViewId={activeViewId}
            exportDisabled={loading || displayedRows.length === 0}
            onSearchQueryChange={setSearchQuery}
            onShowColumnFiltersChange={setShowColumnFilters}
            onClearAllFilters={clearAllFilters}
            onOpenColumnPicker={openColumnPicker}
            onReload={() => void reload()}
            onExportCsv={handleExportCsv}
            onSelectSavedView={(viewId) => void applySavedView(viewId)}
            onToggleRegistrationStatus={toggleRegistrationStatusFilter}
            onTogglePaymentStatus={togglePaymentStatusFilter}
            loading={loading}
            tableDensity={tableDensity}
            onTableDensityChange={(density) => void handleTableDensityChange(density)}
          />

          {loading ? (
            <Box sx={{ display: "flex", justifyContent: "center", py: 6, flex: 1 }}>
              <CircularProgress />
            </Box>
          ) : (
            <Box
              sx={{
                flex: 1,
                minHeight: { xs: 360, lg: 0 },
                display: "flex",
                flexDirection: "column",
                mt: 1.25,
              }}
            >
              <Box
                sx={{
                  flex: 1,
                  minHeight: 0,
                  display: "flex",
                  flexDirection: "column",
                  border: "1px solid",
                  borderColor: "divider",
                  borderRadius: 2,
                  overflow: "hidden",
                  bgcolor: "background.paper",
                }}
              >
                <SpreadsheetSummaryBar
                  attached
                  stats={summaryStats}
                  onApplySavedView={(viewId) => void applySavedView(viewId)}
                />
                <SpreadsheetTable
                  rows={displayedRows}
                  visibleColumnIds={visibleColumnIds}
                  sort={sort}
                  columnFilters={columnFilters}
                  showColumnFilters={showColumnFilters}
                  config={config}
                  formatContext={formatContext}
                  getColumnWidth={getColumnWidth}
                  onColumnResizeStart={startResize}
                  onSortChange={handleSortChange}
                  onColumnFilterChange={handleColumnFilterChange}
                  onOpenRegistration={openRegistration}
                  onClearAllFilters={() => void clearAllFilters()}
                  selectedRegistrationId={modalRegistrationId}
                  tableDensity={tableDensity}
                  fillAvailableHeight
                  suppressOuterBorder
                />
              </Box>
              <SpreadsheetTableHint />
            </Box>
          )}
        </SectionCard>
      </Stack>

      <SpreadsheetColumnPicker
        open={columnPickerOpen}
        columns={draftColumns}
        saving={savingPreferences}
        onClose={() => setColumnPickerOpen(false)}
        onChange={setDraftColumns}
        onSave={() => void handleSaveColumns()}
      />

      <MembershipRequestDetailModal
        open={modalRegistrationId !== null}
        registrationId={modalRegistrationId}
        onClose={() => setModalRegistrationId(null)}
        onListReload={async () => {
          await reload();
        }}
        onDeleted={() => setModalRegistrationId(null)}
      />
    </Container>
  );
}
