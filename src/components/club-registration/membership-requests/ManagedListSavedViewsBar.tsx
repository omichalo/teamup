"use client";

import { Button, ButtonGroup, Stack } from "@mui/material";
import BookmarkIcon from "@mui/icons-material/Bookmark";
import {
  SPREADSHEET_SAVED_VIEWS,
  type SpreadsheetSavedViewId,
} from "@/lib/club-registration/spreadsheet/quick-filters";

type Props = {
  activeViewId: SpreadsheetSavedViewId | null;
  onSelectView: (viewId: SpreadsheetSavedViewId) => void;
};

export function ManagedListSavedViewsBar({ activeViewId, onSelectView }: Props) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ py: 0.25 }}>
      <BookmarkIcon sx={{ fontSize: 16, color: "text.secondary" }} />
      <ButtonGroup size="small" variant="outlined" aria-label="Vues enregistrées">
        {SPREADSHEET_SAVED_VIEWS.map((view) => (
          <Button
            key={view.id}
            variant={activeViewId === view.id ? "contained" : "outlined"}
            onClick={() => onSelectView(view.id)}
            sx={{ px: 1.5, py: 0.5, fontSize: "0.75rem", lineHeight: 1.4 }}
          >
            {view.label}
          </Button>
        ))}
      </ButtonGroup>
    </Stack>
  );
}
