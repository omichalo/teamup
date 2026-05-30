"use client";

import { InputAdornment, TextField } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { centsToEuroInput, euroInputToCents } from "./config-editor-utils";

type Props = {
  label: string;
  valueCents: number;
  onChangeCents: (cents: number) => void;
  size?: "small" | "medium";
  fullWidth?: boolean;
  sx?: SxProps<Theme>;
};

export function EuroAmountField({
  label,
  valueCents,
  onChangeCents,
  size = "small",
  fullWidth = false,
  sx,
}: Props) {
  return (
    <TextField
      label={label}
      size={size}
      type="number"
      fullWidth={fullWidth}
      value={centsToEuroInput(valueCents)}
      onChange={(e) => onChangeCents(euroInputToCents(e.target.value))}
      inputProps={{ min: 0, step: 0.01 }}
      InputProps={{
        endAdornment: <InputAdornment position="end">€</InputAdornment>,
      }}
      {...(sx ? { sx } : {})}
    />
  );
}
