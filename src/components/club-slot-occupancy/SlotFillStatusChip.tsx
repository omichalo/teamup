"use client";

import { Chip, Tooltip } from "@mui/material";
import type { SlotFillStatus } from "@/lib/club-slot-occupancy/types";
import { SLOT_FILL_STATUS_HELP, SLOT_FILL_STATUS_LABELS } from "@/lib/club-slot-occupancy/types";

type ChipColor = "success" | "info" | "warning" | "error" | "default";

function fillColor(status: SlotFillStatus): ChipColor {
  if (status === "over") return "error";
  if (status === "full") return "warning";
  if (status === "near") return "info";
  if (status === "ok") return "success";
  return "default";
}

type Props = {
  status: SlotFillStatus;
  label?: string;
};

export function SlotFillStatusChip({ status, label }: Props) {
  const text = label ?? SLOT_FILL_STATUS_LABELS[status];
  const help = SLOT_FILL_STATUS_HELP[status];
  return (
    <Tooltip title={help} enterDelay={300}>
      <Chip
        size="small"
        color={fillColor(status)}
        label={text}
        aria-label={`${text}. ${help}`}
      />
    </Tooltip>
  );
}
