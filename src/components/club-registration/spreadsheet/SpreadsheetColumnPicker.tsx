"use client";

import { useMemo, useState } from "react";
import {
  Button,
  Checkbox,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  IconButton,
  InputAdornment,
  ListItemText,
  Paper,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import DragIndicatorIcon from "@mui/icons-material/DragIndicator";
import SearchIcon from "@mui/icons-material/Search";
import {
  ConfigEditorDraggableItem,
  ConfigEditorSortableList,
} from "@/components/club-registration-config/ConfigEditorSortableList";
import { SPREADSHEET_COLUMN_LABELS } from "@/lib/club-registration/spreadsheet/column-labels";
import {
  setAllColumnsVisibility,
  type SpreadsheetColumnPreference,
} from "@/lib/club-registration/spreadsheet/preferences";

type Props = {
  open: boolean;
  columns: SpreadsheetColumnPreference[];
  saving: boolean;
  onClose: () => void;
  onChange: (columns: SpreadsheetColumnPreference[]) => void;
  onSave: () => void;
};

export function SpreadsheetColumnPicker({
  open,
  columns,
  saving,
  onClose,
  onChange,
  onSave,
}: Props) {
  const [searchQuery, setSearchQuery] = useState("");

  const handleMove = (fromIndex: number, toIndex: number) => {
    const next = [...columns];
    const [moved] = next.splice(fromIndex, 1);
    if (!moved) return;
    next.splice(toIndex, 0, moved);
    onChange(next);
  };

  const toggleVisibility = (index: number) => {
    onChange(
      columns.map((column, columnIndex) =>
        columnIndex === index ? { ...column, visible: !column.visible } : column
      )
    );
  };

  const visibleCount = columns.filter((column) => column.visible).length;
  const filteredIndexes = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    if (!query) {
      return columns.map((_, index) => index);
    }
    return columns.reduce<number[]>((acc, column, index) => {
      const label = SPREADSHEET_COLUMN_LABELS[column.id].toLowerCase();
      if (label.includes(query) || column.id.includes(query)) {
        acc.push(index);
      }
      return acc;
    }, []);
  }, [columns, searchQuery]);

  const filteredColumns = filteredIndexes.map((index) => ({
    column: columns[index]!,
    index,
  }));

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="sm"
      fullWidth
      onTransitionExited={() => setSearchQuery("")}
    >
      <DialogTitle>Personnaliser les colonnes</DialogTitle>
      <DialogContent dividers>
        <Stack spacing={2}>
          <Typography variant="body2" color="text.secondary">
            Choisissez les colonnes visibles et faites-les glisser pour ajuster l&apos;ordre.
            Vos préférences sont enregistrées sur votre compte.
          </Typography>

          <TextField
            size="small"
            fullWidth
            placeholder="Rechercher une colonne"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="action" />
                  </InputAdornment>
                ),
              },
            }}
          />

          <Stack direction="row" spacing={1}>
            <Button size="small" onClick={() => onChange(setAllColumnsVisibility(columns, true))}>
              Tout afficher
            </Button>
            <Button size="small" onClick={() => onChange(setAllColumnsVisibility(columns, false))}>
              Tout masquer
            </Button>
          </Stack>

          {filteredColumns.length === 0 ? (
            <Typography variant="body2" color="text.secondary">
              Aucune colonne ne correspond à votre recherche.
            </Typography>
          ) : searchQuery.trim() ? (
            <Stack spacing={1}>
              <Typography variant="caption" color="text.secondary">
                Le réordonnancement est disponible lorsque la recherche est vide.
              </Typography>
              {filteredColumns.map(({ column, index }) => (
                <Paper
                  key={column.id}
                  variant="outlined"
                  sx={{
                    p: 1,
                    display: "flex",
                    alignItems: "center",
                    gap: 1,
                    opacity: column.visible ? 1 : 0.7,
                  }}
                >
                  <Checkbox
                    checked={column.visible}
                    onChange={() => toggleVisibility(index)}
                    inputProps={{
                      "aria-label": `Afficher ${SPREADSHEET_COLUMN_LABELS[column.id]}`,
                    }}
                  />
                  <ListItemText
                    primary={SPREADSHEET_COLUMN_LABELS[column.id]}
                    primaryTypographyProps={{ variant: "body2" }}
                  />
                </Paper>
              ))}
            </Stack>
          ) : (
            <ConfigEditorSortableList droppableId="spreadsheet-columns" onMove={handleMove}>
              {columns.map((column, index) => (
                <ConfigEditorDraggableItem
                  key={column.id}
                  draggableId={column.id}
                  index={index}
                >
                  {({ dragHandleProps, isDragging }) => (
                    <Paper
                      variant="outlined"
                      sx={{
                        p: 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 1,
                        opacity: column.visible ? 1 : 0.7,
                        bgcolor: isDragging ? "action.hover" : "background.paper",
                      }}
                    >
                      <IconButton
                        size="small"
                        aria-label={`Réordonner ${SPREADSHEET_COLUMN_LABELS[column.id]}`}
                        {...dragHandleProps}
                      >
                        <DragIndicatorIcon fontSize="small" />
                      </IconButton>
                      <Checkbox
                        checked={column.visible}
                        onChange={() => toggleVisibility(index)}
                        inputProps={{
                          "aria-label": `Afficher ${SPREADSHEET_COLUMN_LABELS[column.id]}`,
                        }}
                      />
                      <ListItemText
                        primary={SPREADSHEET_COLUMN_LABELS[column.id]}
                        primaryTypographyProps={{ variant: "body2" }}
                      />
                    </Paper>
                  )}
                </ConfigEditorDraggableItem>
              ))}
            </ConfigEditorSortableList>
          )}

          <Typography variant="caption" color="text.secondary">
            {visibleCount} colonne{visibleCount > 1 ? "s" : ""} visible
            {visibleCount > 1 ? "s" : ""}
          </Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Annuler</Button>
        <Button
          variant="contained"
          onClick={onSave}
          disabled={saving || visibleCount === 0}
        >
          Enregistrer
        </Button>
      </DialogActions>
    </Dialog>
  );
}
