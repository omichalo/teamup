"use client";

import { Button, ButtonGroup, Stack, Typography } from "@mui/material";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import {
  SPREADSHEET_SAVED_VIEWS,
  type SpreadsheetSavedViewId,
} from "@/lib/club-registration/spreadsheet/quick-filters";

type Props = {
  activeViewId: SpreadsheetSavedViewId | null;
  onSelectView: (viewId: SpreadsheetSavedViewId) => void;
  compact?: boolean;
};

export function SpreadsheetSavedViewsBar({ activeViewId, onSelectView, compact = false }: Props) {
  if (compact) {
    return (
      <Stack spacing={0.75} sx={{ py: 0.25 }}>
        <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
          <BookmarkIcon sx={{ fontSize: 16, color: "text.secondary" }} />
          <ButtonGroup size="small" variant="outlined" aria-label="Vues enregistrées">
            {SPREADSHEET_SAVED_VIEWS.map((view) => (
              <Button
                key={view.id}
                variant={activeViewId === view.id ? "contained" : "outlined"}
                onClick={() => onSelectView(view.id)}
                sx={{ px: 1.5, py: 0.5, fontSize: "0.8125rem", lineHeight: 1.4 }}
              >
                {view.label}
              </Button>
            ))}
          </ButtonGroup>
        </Stack>
      </Stack>
    );
  }

  return (
    <Stack spacing={0.75}>
      <Stack direction="row" spacing={0.75} alignItems="center">
        <BookmarkIcon sx={{ fontSize: 16, color: "text.secondary" }} />
        <Typography variant="caption" color="text.secondary">
          Vues enregistrées
        </Typography>
      </Stack>
      <ButtonGroup size="small" variant="outlined" aria-label="Vues enregistrées">
        {SPREADSHEET_SAVED_VIEWS.map((view) => (
          <Button
            key={view.id}
            variant={activeViewId === view.id ? "contained" : "outlined"}
            onClick={() => onSelectView(view.id)}
          >
            {view.label}
          </Button>
        ))}
      </ButtonGroup>
    </Stack>
  );
}
