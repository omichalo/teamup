"use client";

import { InputAdornment, TextField } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useEuroMonetaryTextInput } from "@/lib/club-registration/payment/use-euro-monetary-text-input";

type Props = {
  label: string;
  valueCents?: number | undefined;
  onChangeCents: (cents: number) => void;
  size?: "small" | "medium";
  fullWidth?: boolean;
  disabled?: boolean;
  /** Montant facultatif : vide tant qu'aucune valeur n'est enregistrée. */
  allowEmpty?: boolean;
  helperText?: string;
  sx?: SxProps<Theme>;
};

export function EuroAmountField({
  label,
  valueCents,
  onChangeCents,
  size = "small",
  fullWidth = false,
  disabled = false,
  allowEmpty = false,
  helperText,
  sx,
}: Props) {
  const { text, handleFocus, handleChange, handleBlur } = useEuroMonetaryTextInput({
    amountCents: valueCents,
    allowEmpty,
    selectAllOnFocus: true,
  });

  return (
    <TextField
      label={label}
      size={size}
      fullWidth={fullWidth}
      disabled={disabled}
      value={text}
      onChange={(e) => handleChange(e.target.value)}
      onFocus={handleFocus}
      onBlur={() => handleBlur(onChangeCents)}
      inputProps={{ inputMode: "decimal", autoComplete: "off" }}
      InputLabelProps={{ shrink: true }}
      placeholder="0,00"
      {...(helperText !== undefined ? { helperText } : {})}
      InputProps={{
        endAdornment: <InputAdornment position="end">€</InputAdornment>,
      }}
      {...(sx ? { sx } : {})}
    />
  );
}
