"use client";

import { useEffect, useRef, useState } from "react";
import { TextField } from "@mui/material";
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
  required?: boolean;
  size?: "small" | "medium";
  sx?: SxProps<Theme>;
  dataField: string;
};

/**
 * Montant en euros pour une aide : la valeur affichée est pilotée en local
 * pendant la frappe et n’est convertie en centimes qu’au blur (évite le blocage
 * au-delà de 9,99 € et les effacements impossibles dus au formatage à chaque frappe).
 */
export function AidEuroAmountField({
  label,
  amountCents,
  onCommitCents,
  required = false,
  size = "small",
  sx,
  dataField,
}: Props) {
  const [text, setText] = useState(() => centsToEurosInput(amountCents));
  const focusedRef = useRef(false);

  useEffect(() => {
    if (!focusedRef.current) {
      setText(centsToEurosInput(amountCents));
    }
  }, [amountCents]);

  return (
    <TextField
      label={label}
      value={text}
      onChange={(e) => {
        setText(sanitizeEurosMonetaryInput(e.target.value));
      }}
      onFocus={() => {
        focusedRef.current = true;
      }}
      onBlur={() => {
        focusedRef.current = false;
        const cents = eurosInputToCents(text);
        onCommitCents(cents);
        setText(centsToEurosInput(cents));
      }}
      required={required}
      size={size}
      {...(sx !== undefined ? { sx } : {})}
      InputLabelProps={{ shrink: true }}
      inputProps={{
        "data-field": dataField,
        inputMode: "decimal",
        autoComplete: "off",
      }}
      placeholder="0,00"
    />
  );
}
