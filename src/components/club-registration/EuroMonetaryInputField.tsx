"use client";

import { type ReactNode } from "react";
import { InputAdornment, TextField } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import { useEuroMonetaryTextInput } from "@/lib/club-registration/payment/use-euro-monetary-text-input";

type Props = {
  label: string;
  amountCents: number;
  onCommitCents: (cents: number) => void;
  /** Texte brut pendant la frappe (aperçu sans formater ni valider le formulaire). */
  onDraftText?: (text: string) => void;
  /** Si défini, le montant est relevé à ce minimum au blur (ex. don 1 €). */
  minCentsOnBlur?: number;
  required?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  size?: "small" | "medium";
  sx?: SxProps<Theme>;
  id?: string;
  dataField?: string;
  helperText?: string;
  placeholder?: string;
  /** Sélectionne tout au focus pour remplacer le montant d'un coup (défaut : true). */
  selectAllOnFocus?: boolean;
  endAdornment?: ReactNode;
};

/**
 * Saisie euros (virgule) : texte local pendant la frappe, conversion en centimes au blur.
 * Évite le formatage « 5,00 » à chaque touche qui empêche de saisir « 50 ».
 */
export function EuroMonetaryInputField({
  label,
  amountCents,
  onCommitCents,
  onDraftText,
  minCentsOnBlur,
  required = false,
  disabled = false,
  fullWidth = false,
  size = "medium",
  sx,
  id,
  dataField,
  helperText,
  placeholder = "0,00",
  selectAllOnFocus = true,
  endAdornment,
}: Props) {
  const { text, handleFocus, handleChange, handleBlur } = useEuroMonetaryTextInput({
    amountCents,
    allowEmpty: true,
    selectAllOnFocus,
    ...(onDraftText ? { onTextChange: onDraftText } : {}),
  });

  return (
    <TextField
      {...(id ? { id } : {})}
      label={label}
      value={text}
      disabled={disabled}
      required={required}
      fullWidth={fullWidth}
      size={size}
      onChange={(e) => handleChange(e.target.value)}
      onFocus={handleFocus}
      onBlur={() => handleBlur(onCommitCents, minCentsOnBlur)}
      InputLabelProps={{ shrink: true }}
      inputProps={{
        ...(dataField ? { "data-field": dataField } : {}),
        inputMode: "decimal",
        autoComplete: "off",
      }}
      placeholder={placeholder}
      {...(helperText !== undefined ? { helperText } : {})}
      {...(endAdornment
        ? {
            InputProps: {
              endAdornment: <InputAdornment position="end">{endAdornment}</InputAdornment>,
            },
          }
        : {})}
      {...(sx !== undefined ? { sx } : {})}
    />
  );
}
