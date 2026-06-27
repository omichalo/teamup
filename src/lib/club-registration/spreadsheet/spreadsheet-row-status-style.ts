import type { RegistrationStatus } from "@/lib/club-registration/registration-status";
import { isRegistrationStatus } from "@/lib/club-registration/registration-status";

type RowStatusStyle = {
  borderLeftColor: string;
  baseBg: string;
  hoverBg: string;
  selectedBg: string;
  selectedHoverBg: string;
};

const ROW_STATUS_STYLES: Record<RegistrationStatus, RowStatusStyle> = {
  submitted: {
    borderLeftColor: "warning.main",
    baseBg: "warning.50",
    hoverBg: "warning.100",
    selectedBg: "primary.50",
    selectedHoverBg: "primary.100",
  },
  in_review: {
    borderLeftColor: "info.main",
    baseBg: "info.50",
    hoverBg: "info.100",
    selectedBg: "primary.50",
    selectedHoverBg: "primary.100",
  },
  payment_requested: {
    borderLeftColor: "secondary.main",
    baseBg: "secondary.50",
    hoverBg: "secondary.100",
    selectedBg: "primary.50",
    selectedHoverBg: "primary.100",
  },
  paid: {
    borderLeftColor: "success.main",
    baseBg: "success.50",
    hoverBg: "success.100",
    selectedBg: "primary.50",
    selectedHoverBg: "primary.100",
  },
  approved: {
    borderLeftColor: "success.dark",
    baseBg: "success.50",
    hoverBg: "success.100",
    selectedBg: "primary.50",
    selectedHoverBg: "primary.100",
  },
  rejected: {
    borderLeftColor: "error.main",
    baseBg: "error.50",
    hoverBg: "error.100",
    selectedBg: "primary.50",
    selectedHoverBg: "primary.100",
  },
};

const DEFAULT_ROW_STYLE: RowStatusStyle = {
  borderLeftColor: "divider",
  baseBg: "background.paper",
  hoverBg: "action.hover",
  selectedBg: "primary.50",
  selectedHoverBg: "primary.100",
};

export function resolveSpreadsheetRowStatusStyle(status: unknown): RowStatusStyle {
  if (typeof status === "string" && isRegistrationStatus(status)) {
    return ROW_STATUS_STYLES[status];
  }
  return DEFAULT_ROW_STYLE;
}

export function spreadsheetRowBackgroundColor(
  style: RowStatusStyle,
  options: { isEvenRow: boolean; isSelected: boolean; isHover: boolean }
): string {
  if (options.isSelected) {
    return options.isHover ? style.selectedHoverBg : style.selectedBg;
  }
  if (options.isHover) {
    return style.hoverBg;
  }
  if (options.isEvenRow && style.baseBg === "background.paper") {
    return "grey.50";
  }
  return style.baseBg;
}
