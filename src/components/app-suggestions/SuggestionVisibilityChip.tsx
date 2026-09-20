"use client";

import { Chip } from "@mui/material";
import type { SuggestionVisibility } from "@/lib/app-suggestions/types";

const LABELS: Record<SuggestionVisibility, string> = {
  public: "Publique",
  private: "Privée",
  legacy_staff: "Staff",
  hidden: "Masquée",
};

const COLORS: Record<
  SuggestionVisibility,
  "default" | "success" | "warning" | "error"
> = {
  public: "success",
  private: "default",
  legacy_staff: "warning",
  hidden: "error",
};

function resolveVisibility(
  value: SuggestionVisibility | string | null | undefined
): SuggestionVisibility {
  if (
    value === "public" ||
    value === "private" ||
    value === "legacy_staff" ||
    value === "hidden"
  ) {
    return value;
  }
  return "legacy_staff";
}

type Props = {
  visibility: SuggestionVisibility | string | null | undefined;
  size?: "small" | "medium";
};

export function SuggestionVisibilityChip({
  visibility,
  size = "small",
}: Props) {
  const resolved = resolveVisibility(visibility);

  return (
    <Chip
      label={LABELS[resolved]}
      size={size}
      color={COLORS[resolved]}
      variant={resolved === "public" ? "filled" : "outlined"}
      sx={
        size === "small"
          ? { height: 22, fontSize: "0.7rem", fontWeight: 600 }
          : { fontWeight: 600 }
      }
    />
  );
}
