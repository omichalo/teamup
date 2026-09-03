"use client";

import { useMemo } from "react";
import { Box, Typography, useTheme } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import { VirtualGrid, type VirtualGridColumn } from "@/components/ui/virtual-grid";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import type { SpreadsheetColumnId } from "@/lib/club-registration/spreadsheet/column-ids";
import type { SpreadsheetFormatContext } from "@/lib/club-registration/spreadsheet/format-context";
import type {
  SpreadsheetColumnFilters,
  SpreadsheetSort,
} from "@/lib/club-registration/spreadsheet/row-processing";
import { SPREADSHEET_STICKY_COLUMN_COUNT } from "@/lib/club-registration/spreadsheet/spreadsheet-sticky-columns";
import { isRegistrationStatus } from "@/lib/club-registration/registration-status";
import {
  getSpreadsheetTableDensitySx,
  type SpreadsheetTableDensity,
} from "@/lib/club-registration/spreadsheet/table-density";
import { getSpreadsheetCellTooltip, SpreadsheetDataCell } from "./SpreadsheetDataCell";
import { SpreadsheetFirstCellContent } from "./SpreadsheetOpenInQueueButton";
import {
  SpreadsheetColumnFilterField,
  SpreadsheetColumnResizeHandle,
  SpreadsheetGridEmptyState,
  SpreadsheetHeaderLabel,
} from "./SpreadsheetVirtualGridHeaders";
import {
  SpreadsheetRowPreviewPopper,
  useSpreadsheetRowPreview,
} from "./SpreadsheetRowPreviewPopper";

function densityRowHeight(density: SpreadsheetTableDensity): number {
  return density === "compact" ? 36 : 48;
}

function densityFilterHeight(show: boolean, density: SpreadsheetTableDensity): number {
  if (!show) {
    return 0;
  }
  return density === "compact" ? 40 : 48;
}

type Props = {
  rows: RegistrationClientRecord[];
  visibleColumnIds: SpreadsheetColumnId[];
  sort: SpreadsheetSort;
  columnFilters: SpreadsheetColumnFilters;
  showColumnFilters: boolean;
  config: RegistrationConfigV1 | null;
  formatContext: SpreadsheetFormatContext;
  getColumnWidth: (columnId: SpreadsheetColumnId) => number;
  onColumnResizeStart: (columnId: SpreadsheetColumnId, clientX: number) => void;
  onSortChange: (columnId: SpreadsheetColumnId) => void;
  onColumnFilterChange: (columnId: SpreadsheetColumnId, value: string) => void;
  onOpenRegistration: (registrationId: string) => void;
  onClearAllFilters: () => void;
  selectedRegistrationId?: string | null;
  tableDensity?: SpreadsheetTableDensity;
  fillAvailableHeight?: boolean;
  suppressOuterBorder?: boolean;
};

export function SpreadsheetVirtualGrid({
  rows,
  visibleColumnIds,
  sort,
  columnFilters,
  showColumnFilters,
  config,
  formatContext,
  getColumnWidth,
  onColumnResizeStart,
  onSortChange,
  onColumnFilterChange,
  onOpenRegistration,
  onClearAllFilters,
  selectedRegistrationId = null,
  tableDensity = "comfortable",
  fillAvailableHeight = false,
  suppressOuterBorder = false,
}: Props) {
  const theme = useTheme();
  const densitySx = getSpreadsheetTableDensitySx(tableDensity);
  const rowHeight = densityRowHeight(tableDensity);
  const filterRowHeight = densityFilterHeight(showColumnFilters, tableDensity);
  const { rowPreview, handleRowMouseEnter, handleRowMouseLeave } = useSpreadsheetRowPreview();

  const pinnedColumnCount =
    visibleColumnIds.length > SPREADSHEET_STICKY_COLUMN_COUNT
      ? SPREADSHEET_STICKY_COLUMN_COUNT
      : 0;

  const columns = useMemo<VirtualGridColumn<RegistrationClientRecord>[]>(() => {
    return visibleColumnIds.map((columnId, columnIndex) => {
      const width = getColumnWidth(columnId);
      const isLastPinned =
        pinnedColumnCount > 0 && columnIndex === pinnedColumnCount - 1;

      return {
        id: columnId,
        width,
        renderHeader: () => (
          <Box
            sx={{
              position: "relative",
              width: "100%",
              height: "100%",
              display: "flex",
              alignItems: "center",
              fontSize: densitySx.cellFontSize,
              ...(isLastPinned
                ? {
                    boxShadow: "5px 0 14px -6px rgba(15, 23, 42, 0.16)",
                  }
                : {}),
            }}
          >
            <SpreadsheetHeaderLabel
              columnId={columnId}
              sort={sort}
              onSortChange={onSortChange}
            />
            <SpreadsheetColumnResizeHandle
              columnId={columnId}
              onResizeStart={onColumnResizeStart}
            />
          </Box>
        ),
        ...(showColumnFilters
          ? {
              renderFilter: () => (
                <SpreadsheetColumnFilterField
                  columnId={columnId}
                  value={columnFilters[columnId] ?? ""}
                  onChange={onColumnFilterChange}
                />
              ),
            }
          : {}),
        renderCell: (row: RegistrationClientRecord) => {
          const cell = (
            <SpreadsheetDataCell
              columnId={columnId}
              row={row}
              config={config}
              context={formatContext}
            />
          );
          if (columnIndex === 0) {
            return (
              <SpreadsheetFirstCellContent registrationId={row.id}>{cell}</SpreadsheetFirstCellContent>
            );
          }
          return cell;
        },
        getTooltip: (row: RegistrationClientRecord) =>
          getSpreadsheetCellTooltip(columnId, row, config, formatContext),
      };
    });
  }, [
    visibleColumnIds,
    getColumnWidth,
    pinnedColumnCount,
    densitySx.cellFontSize,
    sort,
    onSortChange,
    onColumnResizeStart,
    showColumnFilters,
    columnFilters,
    onColumnFilterChange,
    config,
    formatContext,
  ]);

  if (visibleColumnIds.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
        Aucune colonne visible. Utilisez « Colonnes » pour en sélectionner.
      </Typography>
    );
  }

  return (
    <Box
      sx={{
        position: "relative",
        flex: fillAvailableHeight ? 1 : undefined,
        minHeight: 0,
        display: "flex",
        flexDirection: "column",
        borderRadius: suppressOuterBorder ? 0 : 2,
        border: suppressOuterBorder ? "none" : "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        overflow: "hidden",
        "--vg-border": theme.palette.divider,
        "--vg-border-muted": theme.palette.divider,
        "--vg-header-bg": theme.palette.grey[100],
        "--vg-filter-bg": theme.palette.grey[50],
        "& [role='row'][data-row-id]": {
          borderLeft: "3px solid",
          borderLeftColor: "divider",
          bgcolor: "background.paper",
        },
        "& [role='row'][data-row-id].even": {
          bgcolor: "grey.50",
        },
        "& [role='row'][data-row-id].status-submitted": {
          borderLeftColor: "warning.main",
          bgcolor: "warning.50",
        },
        "& [role='row'][data-row-id].status-in_review": {
          borderLeftColor: "info.main",
          bgcolor: "info.50",
        },
        "& [role='row'][data-row-id].status-payment_requested": {
          borderLeftColor: "secondary.main",
          bgcolor: "secondary.50",
        },
        "& [role='row'][data-row-id].status-paid": {
          borderLeftColor: "success.main",
          bgcolor: "success.50",
        },
        "& [role='row'][data-row-id].status-approved": {
          borderLeftColor: "success.dark",
          bgcolor: "success.50",
        },
        "& [role='row'][data-row-id].status-rejected": {
          borderLeftColor: "error.main",
          bgcolor: "error.50",
        },
        "& [role='row'][data-row-id].selected": {
          bgcolor: "primary.50",
        },
        "& [role='row'][data-row-id]:hover": {
          filter: "brightness(0.97)",
        },
        "& [role='row'][data-row-id].selected:hover": {
          bgcolor: "primary.100",
          filter: "none",
        },
        "& [role='row'][data-row-id] [role='gridcell']": {
          backgroundColor: "inherit",
          fontSize: densitySx.cellFontSize,
        },
      }}
    >
      <VirtualGrid
        rows={rows}
        columns={columns}
        getRowId={(row) => row.id}
        rowHeight={rowHeight}
        headerHeight={densitySx.headerHeight}
        filterRowHeight={filterRowHeight}
        pinnedColumnCount={pinnedColumnCount}
        fillAvailableHeight={fillAvailableHeight}
        enableSharedTooltip
        onRowClick={(row) => onOpenRegistration(row.id)}
        onRowMouseEnter={(row, _index, anchor) => handleRowMouseEnter(row, anchor)}
        onRowMouseLeave={handleRowMouseLeave}
        getRowClassName={(row, rowIndex) => {
          const parts = ["vg-row"];
          if (rowIndex % 2 === 1) {
            parts.push("even");
          }
          if (row.id === selectedRegistrationId) {
            parts.push("selected");
          }
          if (typeof row.status === "string" && isRegistrationStatus(row.status)) {
            parts.push(`status-${row.status}`);
          }
          return parts.join(" ");
        }}
        emptyContent={<SpreadsheetGridEmptyState onClearAllFilters={onClearAllFilters} />}
      />
      <SpreadsheetRowPreviewPopper
        rowPreview={rowPreview}
        config={config}
        formatContext={formatContext}
      />
    </Box>
  );
}

export function SpreadsheetTableHint() {
  return (
    <Box
      sx={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: 1,
        px: 0.5,
        pt: 0.75,
        pb: 0,
      }}
    >
      <Box sx={{ display: "inline-flex", alignItems: "center", gap: 0.75 }}>
        <OpenInNewIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        <Typography variant="caption" color="text.secondary">
          Cliquez sur une ligne pour ouvrir le dossier en modale.
        </Typography>
      </Box>
      <Typography variant="caption" color="text.secondary">
        Survolez une ligne pour l&apos;aperçu · icône file pour traiter en liste+détail · Échap ferme la
        modale.
      </Typography>
    </Box>
  );
}
