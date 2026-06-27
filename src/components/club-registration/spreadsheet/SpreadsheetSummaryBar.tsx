"use client";

import { Chip, Stack, Typography } from "@mui/material";
import type { SpreadsheetSummaryStats } from "@/lib/club-registration/spreadsheet/quick-filters";
import type { SpreadsheetSavedViewId } from "@/lib/club-registration/spreadsheet/quick-filters";

type SummaryChipKey = "displayed" | "actionable" | "certificate" | "payment";

const VIEW_BY_CHIP: Partial<Record<SummaryChipKey, SpreadsheetSavedViewId>> = {
  actionable: "to_review",
  certificate: "missing_certificate",
  payment: "payment_pending",
};

type Props = {
  stats: SpreadsheetSummaryStats;
  onApplySavedView?: (viewId: SpreadsheetSavedViewId) => void;
  attached?: boolean;
};

export function SpreadsheetSummaryBar({ stats, onApplySavedView, attached = false }: Props) {
  const parts: {
    key: SummaryChipKey;
    label: string;
    color: "default" | "primary" | "warning" | "error" | "info";
    show: boolean;
    clickable: boolean;
  }[] = [
    {
      key: "displayed",
      label: `${stats.displayedCount} affiché${stats.displayedCount > 1 ? "s" : ""}`,
      color: "primary",
      show: true,
      clickable: false,
    },
    {
      key: "actionable",
      label: `${stats.actionableCount} à traiter`,
      color: "warning",
      show: stats.actionableCount > 0,
      clickable: true,
    },
    {
      key: "certificate",
      label: `${stats.missingCertificateCount} certificat attendu${
        stats.missingCertificateCount > 1 ? "s" : ""
      }`,
      color: "error",
      show: stats.missingCertificateCount > 0,
      clickable: true,
    },
    {
      key: "payment",
      label: `${stats.paymentPendingCount} paiement en cours`,
      color: "info",
      show: stats.paymentPendingCount > 0,
      clickable: true,
    },
  ].filter((part) => part.show) as {
    key: SummaryChipKey;
    label: string;
    color: "default" | "primary" | "warning" | "error" | "info";
    show: boolean;
    clickable: boolean;
  }[];

  return (
    <Stack
      direction="row"
      spacing={1.25}
      alignItems="center"
      flexWrap="wrap"
      useFlexGap
      sx={{
        px: 1.5,
        py: attached ? 0.75 : 1,
        borderBottom: "1px solid",
        borderColor: "divider",
        bgcolor: attached ? "grey.50" : "transparent",
        flexShrink: 0,
      }}
    >
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
        Synthèse
      </Typography>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap>
        {parts.map((part) => {
          const viewId = VIEW_BY_CHIP[part.key];
          const isClickable = part.clickable && viewId && onApplySavedView;
          return (
            <Chip
              key={part.key}
              size="small"
              label={part.label}
              color={part.color}
              variant={part.key === "displayed" ? "filled" : "outlined"}
              clickable={Boolean(isClickable)}
              onClick={
                isClickable
                  ? () => {
                      onApplySavedView(viewId);
                    }
                  : undefined
              }
            />
          );
        })}
      </Stack>
    </Stack>
  );
}
