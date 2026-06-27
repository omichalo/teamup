"use client";

import { Box, TableCell, TableRow, Tooltip } from "@mui/material";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import type { SpreadsheetColumnId } from "@/lib/club-registration/spreadsheet/column-ids";
import type { SpreadsheetFormatContext } from "@/lib/club-registration/spreadsheet/format-context";
import {
  resolveSpreadsheetRowStatusStyle,
  spreadsheetRowBackgroundColor,
} from "@/lib/club-registration/spreadsheet/spreadsheet-row-status-style";
import {
  getSpreadsheetTableDensitySx,
  type SpreadsheetTableDensity,
} from "@/lib/club-registration/spreadsheet/table-density";
import { getSpreadsheetCellTooltip, SpreadsheetDataCell } from "./SpreadsheetDataCell";
import { SpreadsheetFirstCellContent } from "./SpreadsheetOpenInQueueButton";

function columnWidthSx(width: number) {
  return {
    width,
    minWidth: width,
    maxWidth: width,
  };
}

function cellSx(
  bgcolor: string,
  width: number,
  densitySx: ReturnType<typeof getSpreadsheetTableDensitySx>
) {
  return {
    ...columnWidthSx(width),
    whiteSpace: "nowrap" as const,
    overflow: "hidden",
    textOverflow: "ellipsis",
    bgcolor,
    py: densitySx.cellPy,
    fontSize: densitySx.cellFontSize,
  };
}

type Props = {
  row: RegistrationClientRecord;
  rowIndex: number;
  visibleColumnIds: SpreadsheetColumnId[];
  columnStartIndex?: number;
  showStatusBorder?: boolean;
  isHovered?: boolean;
  isSelected: boolean;
  tableDensity: SpreadsheetTableDensity;
  config: RegistrationConfigV1 | null;
  formatContext: SpreadsheetFormatContext;
  getColumnWidth: (columnId: SpreadsheetColumnId) => number;
  onOpenRegistration: (registrationId: string) => void;
  onMouseEnter: (row: RegistrationClientRecord, anchor: HTMLElement) => void;
};

export function SpreadsheetTableRow({
  row,
  rowIndex,
  visibleColumnIds,
  columnStartIndex = 0,
  showStatusBorder = true,
  isHovered = false,
  isSelected,
  tableDensity,
  config,
  formatContext,
  getColumnWidth,
  onOpenRegistration,
  onMouseEnter,
}: Props) {
  const densitySx = getSpreadsheetTableDensitySx(tableDensity);
  const statusStyle = resolveSpreadsheetRowStatusStyle(row.status);
  const rowBg = spreadsheetRowBackgroundColor(statusStyle, {
    isEvenRow: rowIndex % 2 === 1,
    isSelected,
    isHover: isHovered,
  });

  return (
    <TableRow
      hover={false}
      onClick={() => onOpenRegistration(row.id)}
      onMouseEnter={(event) => onMouseEnter(row, event.currentTarget)}
      sx={{
        cursor: "pointer",
        ...(showStatusBorder
          ? {
              borderLeft: "3px solid",
              borderLeftColor: statusStyle.borderLeftColor,
            }
          : {}),
        "& td": { bgcolor: rowBg },
      }}
    >
      {visibleColumnIds.map((columnId, columnIndex) => {
        const globalColumnIndex = columnStartIndex + columnIndex;
        const width = getColumnWidth(columnId);
        const tooltip = getSpreadsheetCellTooltip(columnId, row, config, formatContext);
        const cellContent = (
          <SpreadsheetDataCell
            columnId={columnId}
            row={row}
            config={config}
            context={formatContext}
          />
        );

        return (
          <TableCell
            key={`${row.id}-${columnId}`}
            sx={cellSx(rowBg, width, densitySx)}
          >
            <Tooltip title={tooltip} placement="top-start" enterDelay={900}>
              {globalColumnIndex === 0 ? (
                <SpreadsheetFirstCellContent registrationId={row.id}>
                  {cellContent}
                </SpreadsheetFirstCellContent>
              ) : (
                <Box component="span" sx={{ display: "inline-flex", maxWidth: "100%" }}>
                  {cellContent}
                </Box>
              )}
            </Tooltip>
          </TableCell>
        );
      })}
    </TableRow>
  );
}
