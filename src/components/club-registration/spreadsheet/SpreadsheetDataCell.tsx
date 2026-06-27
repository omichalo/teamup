"use client";

import { Chip } from "@mui/material";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import type { RegistrationClientRecord } from "@/lib/club-registration/map-registration-doc-to-client";
import {
  PAYMENT_STATUS_LABELS,
  type PaymentStatusId,
} from "@/lib/club-registration/payment-constants";
import {
  REGISTRATION_STATUS_COLORS,
  REGISTRATION_STATUS_LABELS,
  type RegistrationStatus,
} from "@/lib/club-registration/registration-status";
import type { SpreadsheetColumnId } from "@/lib/club-registration/spreadsheet/column-ids";
import {
  EMPTY_SPREADSHEET_FORMAT_CONTEXT,
  type SpreadsheetFormatContext,
} from "@/lib/club-registration/spreadsheet/format-context";
import {
  formatSpreadsheetCellValue,
} from "@/lib/club-registration/spreadsheet/format-cell-value";

type Props = {
  columnId: SpreadsheetColumnId;
  row: RegistrationClientRecord;
  config: RegistrationConfigV1 | null;
  context?: SpreadsheetFormatContext;
};

function StatusChip({
  label,
  color,
}: {
  label: string;
  color: "default" | "info" | "warning" | "success" | "error";
}) {
  return (
    <Chip label={label} color={color} size="small" variant="outlined" sx={{ maxWidth: "100%" }} />
  );
}

export function SpreadsheetDataCell({ columnId, row, config, context }: Props) {
  const formatContext = context ?? EMPTY_SPREADSHEET_FORMAT_CONTEXT;

  if (columnId === "status") {
    const status = typeof row.status === "string" ? row.status : "";
    if (status in REGISTRATION_STATUS_LABELS) {
      const known = status as RegistrationStatus;
      return (
        <StatusChip
          label={REGISTRATION_STATUS_LABELS[known]}
          color={REGISTRATION_STATUS_COLORS[known]}
        />
      );
    }
  }

  if (columnId === "paymentStatus") {
    const status = typeof row.paymentStatus === "string" ? row.paymentStatus : "";
    if (status in PAYMENT_STATUS_LABELS) {
      return (
        <StatusChip
          label={PAYMENT_STATUS_LABELS[status as PaymentStatusId]}
          color={status === "paid" ? "success" : status === "partially_paid" ? "warning" : "info"}
        />
      );
    }
  }

  const display = formatSpreadsheetCellValue(columnId, row, config, formatContext);
  return <span>{display || "—"}</span>;
}

export function getSpreadsheetCellTooltip(
  columnId: SpreadsheetColumnId,
  row: RegistrationClientRecord,
  config: RegistrationConfigV1 | null,
  context?: SpreadsheetFormatContext
): string {
  return (
    formatSpreadsheetCellValue(columnId, row, config, context ?? EMPTY_SPREADSHEET_FORMAT_CONTEXT) ||
    "—"
  );
}
