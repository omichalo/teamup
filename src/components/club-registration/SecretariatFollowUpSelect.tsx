"use client";

import { MenuItem, TextField } from "@mui/material";

type Props<T extends string> = {
  label: string;
  display: T;
  applicable: boolean;
  actionableOptions: readonly T[];
  labels: Record<T, string>;
  notApplicableValue: T;
  onChange: (value: T) => void;
  enabledHelper: string;
  disabledHelper: string;
};

export function SecretariatFollowUpSelect<T extends string>({
  label,
  display,
  applicable,
  actionableOptions,
  labels,
  notApplicableValue,
  onChange,
  enabledHelper,
  disabledHelper,
}: Props<T>) {
  return (
    <TextField
      select
      label={label}
      value={display}
      onChange={(event) => onChange(event.target.value as T)}
      disabled={!applicable}
      helperText={applicable ? enabledHelper : disabledHelper}
      fullWidth
    >
      {applicable ? (
        actionableOptions.map((option) => (
          <MenuItem key={option} value={option}>
            {labels[option]}
          </MenuItem>
        ))
      ) : (
        <MenuItem value={notApplicableValue}>{labels[notApplicableValue]}</MenuItem>
      )}
    </TextField>
  );
}
