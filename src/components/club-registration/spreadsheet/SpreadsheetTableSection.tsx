"use client";

import {
  Box,
  Button,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  TableSortLabel,
  TextField,
  Typography,
} from "@mui/material";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import { SPREADSHEET_COLUMN_LABELS } from "@/lib/club-registration/spreadsheet/column-labels";
import type { SpreadsheetColumnId } from "@/lib/club-registration/spreadsheet/column-ids";
import type { SpreadsheetFormatContext } from "@/lib/club-registration/spreadsheet/format-context";
import type {
  SpreadsheetColumnFilters,
  SpreadsheetSort,
} from "@/lib/club-registration/spreadsheet/row-processing";
import {
  getSpreadsheetTableDensitySx,
  type SpreadsheetTableDensity,
} from "@/lib/club-registration/spreadsheet/table-density";
import { SpreadsheetTableRow } from "./SpreadsheetTableRow";

export type SpreadsheetTableSectionProps = {
  rows: RegistrationClientRecord[];
  columnIds: SpreadsheetColumnId[];
  columnStartIndex: number;
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
  selectedRegistrationId: string | null;
  tableDensity: SpreadsheetTableDensity;
  showStatusBorder: boolean;
  hoveredRowId: string | null;
  onMouseEnter: (row: RegistrationClientRecord, anchor: HTMLElement) => void;
  onRowHover: (registrationId: string | null) => void;
  onMouseLeave: () => void;
  tableWidth: number;
  headerZIndex?: number;
};

function columnWidthSx(width: number) {
  return {
    width,
    minWidth: width,
    maxWidth: width,
  };
}

function ColumnResizeHandle({
  columnId,
  onResizeStart,
}: {
  columnId: SpreadsheetColumnId;
  onResizeStart: (columnId: SpreadsheetColumnId, clientX: number) => void;
}) {
  return (
    <Box
      role="separator"
      aria-orientation="vertical"
      aria-label={`Redimensionner ${SPREADSHEET_COLUMN_LABELS[columnId]}`}
      onMouseDown={(event) => {
        event.preventDefault();
        event.stopPropagation();
        onResizeStart(columnId, event.clientX);
      }}
      sx={{
        position: "absolute",
        top: 0,
        right: 0,
        width: 8,
        height: "100%",
        cursor: "col-resize",
        touchAction: "none",
        "&:hover": {
          bgcolor: "secondary.main",
          opacity: 0.35,
        },
      }}
    />
  );
}

function SpreadsheetTableEmptyState({ onClearAllFilters }: { onClearAllFilters: () => void }) {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="body1" sx={{ mb: 0.5 }}>
        Aucun dossier ne correspond à votre sélection
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Modifiez la recherche, les filtres par colonne ou réinitialisez l&apos;ensemble des
        critères.
      </Typography>
      <Button variant="outlined" size="small" onClick={onClearAllFilters}>
        Réinitialiser les filtres
      </Button>
    </Box>
  );
}

export function SpreadsheetTableSection({
  rows,
  columnIds,
  columnStartIndex,
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
  showStatusBorder,
  hoveredRowId,
  onMouseEnter,
  onRowHover,
  onMouseLeave,
  tableWidth,
  headerZIndex = 2,
}: SpreadsheetTableSectionProps) {
  const densitySx = getSpreadsheetTableDensitySx(tableDensity);
  const filterRowTop = densitySx.headerHeight;

  return (
    <Table
      size="small"
      stickyHeader
      onMouseLeave={onMouseLeave}
      sx={{
        width: tableWidth,
        minWidth: tableWidth,
        tableLayout: "fixed",
        borderCollapse: "separate",
        borderSpacing: 0,
      }}
    >
      <TableHead>
        <TableRow>
          {columnIds.map((columnId) => {
            const active = sort?.columnId === columnId;
            const width = getColumnWidth(columnId);
            return (
              <TableCell
                key={columnId}
                sortDirection={active ? sort?.direction : false}
                sx={{
                  ...columnWidthSx(width),
                  fontWeight: 700,
                  fontSize: densitySx.cellFontSize,
                  py: densitySx.cellPy,
                  bgcolor: "grey.100",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  position: "relative",
                  zIndex: headerZIndex,
                }}
              >
                <TableSortLabel
                  active={active}
                  direction={active ? sort?.direction : "asc"}
                  onClick={() => onSortChange(columnId)}
                  sx={{ maxWidth: "100%" }}
                >
                  <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
                    {SPREADSHEET_COLUMN_LABELS[columnId]}
                  </Box>
                </TableSortLabel>
                <ColumnResizeHandle columnId={columnId} onResizeStart={onColumnResizeStart} />
              </TableCell>
            );
          })}
        </TableRow>
        {showColumnFilters ? (
          <TableRow>
            {columnIds.map((columnId) => {
              const isActive = (columnFilters[columnId]?.trim().length ?? 0) > 0;
              const width = getColumnWidth(columnId);
              return (
                <TableCell
                  key={`filter-${columnId}`}
                  sx={{
                    ...columnWidthSx(width),
                    p: 0.75,
                    position: "sticky",
                    top: filterRowTop,
                    zIndex: headerZIndex - 1,
                    bgcolor: "grey.50",
                  }}
                >
                  <TextField
                    value={columnFilters[columnId] ?? ""}
                    onChange={(event) => onColumnFilterChange(columnId, event.target.value)}
                    placeholder="Filtrer"
                    size="small"
                    fullWidth
                    inputProps={{
                      "aria-label": `Filtrer ${SPREADSHEET_COLUMN_LABELS[columnId]}`,
                    }}
                    sx={{
                      "& .MuiInputBase-root": {
                        fontSize: "0.75rem",
                        bgcolor: "background.paper",
                      },
                      "& .MuiOutlinedInput-root": {
                        ...(isActive
                          ? {
                              "& fieldset": {
                                borderColor: "secondary.main",
                                borderWidth: 2,
                              },
                            }
                          : {}),
                      },
                    }}
                  />
                </TableCell>
              );
            })}
          </TableRow>
        ) : null}
      </TableHead>
      <TableBody>
        {rows.length === 0 ? (
          <TableRow>
            <TableCell colSpan={Math.max(columnIds.length, 1)} sx={{ py: 4, border: 0 }}>
              {columnStartIndex === 0 ? (
                <SpreadsheetTableEmptyState onClearAllFilters={onClearAllFilters} />
              ) : (
                <Box sx={{ minHeight: 120 }} aria-hidden />
              )}
            </TableCell>
          </TableRow>
        ) : (
          rows.map((row, rowIndex) => (
            <SpreadsheetTableRow
              key={row.id}
              row={row}
              rowIndex={rowIndex}
              visibleColumnIds={columnIds}
              columnStartIndex={columnStartIndex}
              showStatusBorder={showStatusBorder}
              isHovered={row.id === hoveredRowId}
              isSelected={row.id === selectedRegistrationId}
              tableDensity={tableDensity}
              config={config}
              formatContext={formatContext}
              getColumnWidth={getColumnWidth}
              onOpenRegistration={onOpenRegistration}
              onMouseEnter={(rowData, anchor) => {
                onRowHover(rowData.id);
                onMouseEnter(rowData, anchor);
              }}
            />
          ))
        )}
      </TableBody>
    </Table>
  );
}
