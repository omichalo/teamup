"use client";

import { useState } from "react";
import { Box, TableContainer, Typography } from "@mui/material";
import OpenInNewIcon from "@mui/icons-material/OpenInNew";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import type { SpreadsheetColumnId } from "@/lib/club-registration/spreadsheet/column-ids";
import type { SpreadsheetFormatContext } from "@/lib/club-registration/spreadsheet/format-context";
import type {
  SpreadsheetColumnFilters,
  SpreadsheetSort,
} from "@/lib/club-registration/spreadsheet/row-processing";
import {
  pinnedPaneEdgeSx,
  splitSpreadsheetVisibleColumns,
  sumSpreadsheetColumnWidths,
} from "@/lib/club-registration/spreadsheet/spreadsheet-sticky-columns";
import type { SpreadsheetTableDensity } from "@/lib/club-registration/spreadsheet/table-density";
import {
  SpreadsheetRowPreviewPopper,
  useSpreadsheetRowPreview,
} from "./SpreadsheetRowPreviewPopper";
import { SpreadsheetTableSection } from "./SpreadsheetTableSection";

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

export function SpreadsheetTable({
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
  const { rowPreview, handleRowMouseEnter, handleRowMouseLeave } = useSpreadsheetRowPreview();
  const [hoveredRowId, setHoveredRowId] = useState<string | null>(null);

  if (visibleColumnIds.length === 0) {
    return (
      <Typography variant="body2" color="text.secondary">
        Aucune colonne visible. Utilisez « Colonnes » pour en sélectionner.
      </Typography>
    );
  }

  const { pinnedColumnIds, scrollableColumnIds, usePinnedPane } =
    splitSpreadsheetVisibleColumns(visibleColumnIds);
  const shouldUsePinnedPane = usePinnedPane && rows.length > 0;
  const pinnedWidth = sumSpreadsheetColumnWidths(pinnedColumnIds, getColumnWidth);
  const scrollableWidth = sumSpreadsheetColumnWidths(scrollableColumnIds, getColumnWidth);
  const tableMinWidth = pinnedWidth + scrollableWidth;

  const sharedProps = {
    rows,
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
    selectedRegistrationId,
    tableDensity,
    hoveredRowId,
    onMouseEnter: handleRowMouseEnter,
    onRowHover: setHoveredRowId,
    onMouseLeave: handleRowMouseLeave,
  };

  return (
    <TableContainer
      component={Box}
      sx={{
        ...(fillAvailableHeight
          ? { flex: 1, minHeight: 0, maxHeight: "none" }
          : { maxHeight: { xs: "68vh", lg: "calc(100vh - 220px)" } }),
        borderRadius: suppressOuterBorder ? 0 : 2,
        border: suppressOuterBorder ? "none" : "1px solid",
        borderColor: "divider",
        bgcolor: "background.paper",
        position: "relative",
        overflow: "auto",
      }}
      onMouseLeave={() => {
        setHoveredRowId(null);
        handleRowMouseLeave();
      }}
    >
      {shouldUsePinnedPane ? (
        <Box
          sx={{
            display: "flex",
            width: "max-content",
            minWidth: "100%",
          }}
        >
          <Box
            sx={{
              position: "sticky",
              left: 0,
              zIndex: 4,
              flexShrink: 0,
              bgcolor: "background.paper",
              ...pinnedPaneEdgeSx(),
            }}
          >
            <SpreadsheetTableSection
              {...sharedProps}
              columnIds={pinnedColumnIds}
              columnStartIndex={0}
              showStatusBorder
              tableWidth={pinnedWidth}
              headerZIndex={5}
            />
          </Box>
          <SpreadsheetTableSection
            {...sharedProps}
            columnIds={scrollableColumnIds}
            columnStartIndex={pinnedColumnIds.length}
            showStatusBorder={false}
            tableWidth={scrollableWidth}
            headerZIndex={2}
          />
        </Box>
      ) : (
        <SpreadsheetTableSection
          {...sharedProps}
          columnIds={visibleColumnIds}
          columnStartIndex={0}
          showStatusBorder
          tableWidth={tableMinWidth}
          headerZIndex={2}
        />
      )}
      <SpreadsheetRowPreviewPopper
        rowPreview={rowPreview}
        config={config}
        formatContext={formatContext}
      />
    </TableContainer>
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
