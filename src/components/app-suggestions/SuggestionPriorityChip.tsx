"use client";

import { Chip } from "@mui/material";
import type { SuggestionPriority } from "@/lib/app-suggestions/types";
import {
  SUGGESTION_PRIORITY_COLORS,
  SUGGESTION_PRIORITY_LABELS,
} from "@/lib/app-suggestions/status";

type SuggestionPriorityChipProps = {
  priority: SuggestionPriority;
  size?: "small" | "medium";
};

export function SuggestionPriorityChip({
  priority,
  size = "small",
}: SuggestionPriorityChipProps) {
  return (
    <Chip
      label={SUGGESTION_PRIORITY_LABELS[priority]}
      size={size}
      color={SUGGESTION_PRIORITY_COLORS[priority]}
      variant={priority === "low" ? "outlined" : "filled"}
      sx={
        size === "small"
          ? { height: 22, fontSize: "0.7rem", fontWeight: 600 }
          : { fontWeight: 600 }
      }
    />
  );
}
