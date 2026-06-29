"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { InputAdornment, TextField } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";
import {
  centsToEurosInput,
  eurosInputToCents,
  sanitizeEurosMonetaryInput,
} from "@/lib/club-registration/payment/payment-draft-helpers";

type Props = {
  label: string;
  amountCents: number;
  onCommitCents: (cents: number) => void;
  /** Mise à jour optionnelle pendant la frappe (aperçu, sans valider le formulaire). */
  onDraftCents?: (cents: number) => void;
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
 * Évite les effacements impossibles dus au formatage « 1,00 » à chaque touche.
 */
export function EuroMonetaryInputField({
  label,
  amountCents,
  onCommitCents,
  onDraftCents,
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
  const [text, setText] = useState(() => centsToEurosInput(amountCents));
  const focusedRef = useRef(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (!focusedRef.current) {
      setText(centsToEurosInput(amountCents));
    }
  }, [amountCents]);

  const commitFromText = (raw: string) => {
    let cents = eurosInputToCents(raw);
    if (minCentsOnBlur != null && cents > 0 && cents < minCentsOnBlur) {
      cents = minCentsOnBlur;
    }
    onCommitCents(cents);
    setText(cents > 0 ? centsToEurosInput(cents) : "");
  };

  return (
    <TextField
      {...(id ? { id } : {})}
      label={label}
      value={text}
      disabled={disabled}
      required={required}
      fullWidth={fullWidth}
      size={size}
      onChange={(e) => {
        const next = sanitizeEurosMonetaryInput(e.target.value);
        setText(next);
        onDraftCents?.(eurosInputToCents(next));
      }}
      onFocus={(e) => {
        focusedRef.current = true;
        if (selectAllOnFocus) {
          e.target.select();
        }
      }}
      onBlur={() => {
        focusedRef.current = false;
        commitFromText(text);
      }}
      InputLabelProps={{ shrink: true }}
      inputRef={inputRef}
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
