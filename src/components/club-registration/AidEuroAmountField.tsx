"use client";

import type { SxProps, Theme } from "@mui/material/styles";
import { EuroMonetaryInputField } from "./EuroMonetaryInputField";

type Props = {
  label: string;
  amountCents: number;
  onCommitCents: (cents: number) => void;
  required?: boolean;
  size?: "small" | "medium";
  sx?: SxProps<Theme>;
  dataField: string;
  helperText?: string;
  disabled?: boolean;
};

/** Montant en euros pour une aide (délègue à {@link EuroMonetaryInputField}). */
export function AidEuroAmountField({
  label,
  amountCents,
  onCommitCents,
  required = false,
  disabled = false,
  size = "small",
  sx,
  dataField,
  helperText,
}: Props) {
  return (
    <EuroMonetaryInputField
      label={label}
      amountCents={amountCents}
      onCommitCents={onCommitCents}
      required={required}
      disabled={disabled}
      size={size}
      dataField={dataField}
      selectAllOnFocus={true}
      {...(sx !== undefined ? { sx } : {})}
      {...(helperText !== undefined ? { helperText } : {})}
    />
  );
}
