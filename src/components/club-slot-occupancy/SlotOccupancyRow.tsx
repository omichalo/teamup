"use client";

import { Box, Chip, LinearProgress, Stack, Typography } from "@mui/material";
import type { SlotFillStatus, SlotOccupancySummary } from "@/lib/club-slot-occupancy/types";
import { SLOT_FILL_STATUS_HELP, SLOT_FILL_STATUS_LABELS } from "@/lib/club-slot-occupancy/types";
import { slotFillPercent } from "@/lib/club-slot-occupancy/fill-rate";
import { SLOT_ENROLLMENTS_CLOSED_LABEL } from "@/lib/club-registration-config/slot-enrollments";
import { SlotEnrollmentsToggle } from "./SlotEnrollmentsToggle";
import { SlotFillStatusChip } from "./SlotFillStatusChip";

type Props = {
  slot: SlotOccupancySummary;
  onOpen: (slot: SlotOccupancySummary) => void;
  canManageEnrollments: boolean;
  enrollmentsBusy: boolean;
  onToggleEnrollments: (slot: SlotOccupancySummary) => void | Promise<void>;
};

function fillColor(status: SlotFillStatus): "success" | "info" | "warning" | "error" | "default" {
  if (status === "over") return "error";
  if (status === "full") return "warning";
  if (status === "near") return "info";
  if (status === "ok") return "success";
  return "default";
}

function countLabel(slot: SlotOccupancySummary): string {
  if (slot.capacity == null) {
    return `${slot.enrolledCount} inscrit${slot.enrolledCount > 1 ? "s" : ""}`;
  }
  return `${slot.enrolledCount} / ${slot.capacity}`;
}

export function SlotOccupancyRow({
  slot,
  onOpen,
  canManageEnrollments,
  enrollmentsBusy,
  onToggleEnrollments,
}: Props) {
  const percent = slotFillPercent(slot.rate);
  const color = fillColor(slot.status);

  return (
    <Box
      sx={{
        border: 1,
        borderColor: slot.status === "over" ? "error.main" : slot.enrollmentsClosed ? "warning.main" : "divider",
        bgcolor: "background.paper",
        borderRadius: 2,
        overflow: "hidden",
      }}
    >
      <Box
        component="button"
        type="button"
        onClick={() => onOpen(slot)}
        aria-label={`${slot.label}. ${countLabel(slot)}. ${SLOT_FILL_STATUS_LABELS[slot.status]}. ${SLOT_FILL_STATUS_HELP[slot.status]}. ${slot.enrollmentsClosed ? `${SLOT_ENROLLMENTS_CLOSED_LABEL}. ` : ""}Voir les inscrits`}
        sx={{
          display: "block",
          width: "100%",
          textAlign: "left",
          border: 0,
          bgcolor: "transparent",
          p: 1.5,
          cursor: "pointer",
          "&:hover": { bgcolor: "action.hover" },
          "&:focus-visible": { outline: 2, outlineColor: "primary.main", outlineOffset: -2 },
        }}
      >
        <Stack spacing={1}>
          <Stack direction="row" spacing={1} alignItems="flex-start" justifyContent="space-between">
            <Stack spacing={0.25} sx={{ minWidth: 0 }}>
              <Typography variant="subtitle1" component="p" sx={{ fontWeight: 600, lineHeight: 1.25 }}>
                {slot.label}
              </Typography>
              {slot.scheduleLabel ? (
                <Typography variant="body2" color="text.secondary">
                  {slot.scheduleLabel}
                </Typography>
              ) : null}
            </Stack>
            <Stack direction="row" spacing={0.75} flexWrap="wrap" justifyContent="flex-end">
              {!slot.enabled ? <Chip size="small" label="Inactif" /> : null}
              {slot.enrollmentsClosed ? (
                <Chip size="small" color="warning" label={SLOT_ENROLLMENTS_CLOSED_LABEL} />
              ) : null}
              <SlotFillStatusChip status={slot.status} />
            </Stack>
          </Stack>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <Typography variant="body2" sx={{ fontWeight: 600, whiteSpace: "nowrap" }}>
              {countLabel(slot)}
            </Typography>
            {percent != null ? (
              <LinearProgress
                variant="determinate"
                value={percent}
                color={color === "default" ? "primary" : color}
                sx={{ flex: 1, height: 8, borderRadius: 1 }}
                aria-label={`Remplissage ${percent} pour cent`}
              />
            ) : (
              <Box sx={{ flex: 1 }} />
            )}
          </Stack>
        </Stack>
      </Box>
      {canManageEnrollments ? (
        <Box sx={{ px: 1.5, pb: 1.5 }}>
          <SlotEnrollmentsToggle
            closed={slot.enrollmentsClosed}
            busy={enrollmentsBusy}
            slotLabel={slot.label}
            onToggle={() => onToggleEnrollments(slot)}
          />
        </Box>
      ) : null}
    </Box>
  );
}
