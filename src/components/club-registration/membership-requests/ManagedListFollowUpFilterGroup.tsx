"use client";

import { useId } from "react";
import { Stack, ToggleButton, ToggleButtonGroup, Typography } from "@mui/material";

export type ManagedListFollowUpFilterOption<T extends string> = {
  value: T;
  label: string;
  hint?: string;
};

type Props<T extends string> = {
  label: string;
  value: T;
  options: readonly ManagedListFollowUpFilterOption<T>[];
  onChange: (value: T) => void;
};

export function ManagedListFollowUpFilterGroup<T extends string>({
  label,
  value,
  options,
  onChange,
}: Props<T>) {
  const labelId = useId();
  const selectedHint = options.find((option) => option.value === value)?.hint;

  return (
    <Stack spacing={0.5}>
      <Typography id={labelId} variant="caption" fontWeight={600} color="text.secondary">
        {label}
      </Typography>
      <ToggleButtonGroup
        exclusive
        size="small"
        value={value}
        onChange={(_event, next) => {
          if (next != null) {
            onChange(next);
          }
        }}
        aria-labelledby={labelId}
        sx={{ flexWrap: "wrap" }}
      >
        {options.map((option) => (
          <ToggleButton
            key={option.value}
            value={option.value}
            aria-label={option.hint ? `${option.label}. ${option.hint}` : option.label}
            sx={{
              px: 1,
              py: 0.25,
              fontSize: "0.72rem",
              lineHeight: 1.4,
              textTransform: "none",
            }}
          >
            {option.label}
          </ToggleButton>
        ))}
      </ToggleButtonGroup>
      {selectedHint && value !== "all" ? (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
          {selectedHint}
        </Typography>
      ) : null}
    </Stack>
  );
}
