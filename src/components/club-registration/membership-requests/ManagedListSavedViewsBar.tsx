"use client";

import { Button, ButtonGroup, Stack } from "@mui/material";
import {
  MANAGED_LIST_QUEUE_VIEWS,
  type ManagedListQueueViewCounts,
  type ManagedListQueueViewId,
} from "@/lib/club-registration/managed-list-saved-views";

type Props = {
  activeViewId: ManagedListQueueViewId;
  onSelectView: (viewId: ManagedListQueueViewId) => void;
  viewCounts?: ManagedListQueueViewCounts | undefined;
};

function formatQueueViewLabel(label: string, count: number | undefined): string {
  if (count == null) {
    return label;
  }
  return `${label} (${count})`;
}

export function ManagedListSavedViewsBar({
  activeViewId,
  onSelectView,
  viewCounts,
}: Props) {
  return (
    <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap sx={{ py: 0.25 }}>
      <ButtonGroup size="small" variant="outlined" aria-label="Files de travail">
        {MANAGED_LIST_QUEUE_VIEWS.map((view) => (
          <Button
            key={view.id}
            variant={activeViewId === view.id ? "contained" : "outlined"}
            onClick={() => onSelectView(view.id)}
            sx={{ px: 1.5, py: 0.5, fontSize: "0.75rem", lineHeight: 1.4 }}
          >
            {formatQueueViewLabel(view.label, viewCounts?.[view.id])}
          </Button>
        ))}
      </ButtonGroup>
    </Stack>
  );
}
