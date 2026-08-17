"use client";

import { Checkbox, FormControlLabel } from "@mui/material";

type Props = {
  checked: boolean;
  disabled?: boolean;
  onChange: (received: boolean) => void;
  label?: string;
};

export function SecretariatAidReceiptCheckbox({
  checked,
  disabled = false,
  onChange,
  label = "Aide reçue",
}: Props) {
  return (
    <FormControlLabel
      control={
        <Checkbox
          checked={checked}
          disabled={disabled}
          onChange={(event) => onChange(event.target.checked)}
        />
      }
      label={label}
    />
  );
}
