"use client";

import { Box, Button, TableSortLabel, TextField, Typography } from "@mui/material";
import { SPREADSHEET_COLUMN_LABELS } from "@/lib/club-registration/spreadsheet/column-labels";
import type { SpreadsheetColumnId } from "@/lib/club-registration/spreadsheet/column-ids";
import type { SpreadsheetSort } from "@/lib/club-registration/spreadsheet/row-processing";

export function SpreadsheetColumnResizeHandle({
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

export function SpreadsheetHeaderLabel({
  columnId,
  sort,
  onSortChange,
}: {
  columnId: SpreadsheetColumnId;
  sort: SpreadsheetSort;
  onSortChange: (columnId: SpreadsheetColumnId) => void;
}) {
  const active = sort?.columnId === columnId;
  return (
    <Box sx={{ position: "relative", width: "100%", height: "100%", display: "flex", alignItems: "center" }}>
      <TableSortLabel
        active={active}
        direction={active ? sort?.direction : "asc"}
        onClick={() => onSortChange(columnId)}
        sx={{ maxWidth: "100%", pr: 1 }}
      >
        <Box component="span" sx={{ overflow: "hidden", textOverflow: "ellipsis" }}>
          {SPREADSHEET_COLUMN_LABELS[columnId]}
        </Box>
      </TableSortLabel>
    </Box>
  );
}

export function SpreadsheetColumnFilterField({
  columnId,
  value,
  onChange,
}: {
  columnId: SpreadsheetColumnId;
  value: string;
  onChange: (columnId: SpreadsheetColumnId, value: string) => void;
}) {
  const isActive = value.trim().length > 0;
  return (
    <TextField
      value={value}
      onChange={(event) => onChange(columnId, event.target.value)}
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
  );
}

export function SpreadsheetGridEmptyState({
  onClearAllFilters,
}: {
  onClearAllFilters: () => void;
}) {
  return (
    <Box sx={{ textAlign: "center" }}>
      <Typography variant="body1" sx={{ mb: 0.5 }}>
        Aucun dossier ne correspond à votre sélection
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Modifiez la recherche, les filtres par colonne ou réinitialisez l&apos;ensemble des critères.
      </Typography>
      <Button variant="outlined" size="small" onClick={onClearAllFilters}>
        Réinitialiser les filtres
      </Button>
    </Box>
  );
}
