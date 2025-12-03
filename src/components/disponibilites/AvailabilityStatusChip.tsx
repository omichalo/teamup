"use client";

import { Chip, ChipProps } from "@mui/material";

export type AvailabilityStatus = "available" | "unavailable" | "pending" | "unknown";

interface AvailabilityStatusChipProps extends Omit<ChipProps, "color" | "label"> {
  status: AvailabilityStatus;
  label?: string;
}

const statusConfig: Record<AvailabilityStatus, { color: ChipProps["color"]; label: string }> = {
  available: { color: "success", label: "Disponible" },
  unavailable: { color: "error", label: "Indisponible" },
  pending: { color: "warning", label: "En attente" },
  unknown: { color: "default", label: "Non renseigné" },
};

export const AvailabilityStatusChip: React.FC<AvailabilityStatusChipProps> = ({
  status,
  label,
  ...props
}) => {
  const config = statusConfig[status];
  const color = config.color ?? "default";
  return (
    <Chip
      size="small"
      color={color}
      label={label ?? config.label}
      {...props}
    />
  );
};
