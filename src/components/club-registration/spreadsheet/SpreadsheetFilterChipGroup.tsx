"use client";

import { Chip, Stack, Typography } from "@mui/material";

type FilterChipGroupProps<T extends string> = {
  title: string;
  options: { value: T; label: string }[];
  activeValues: T[];
  onToggle: (value: T) => void;
};

export function FilterChipGroup<T extends string>({
  title,
  options,
  activeValues,
  onToggle,
}: FilterChipGroupProps<T>) {
  return (
    <Stack spacing={0.5} sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
        {title}
      </Typography>
      <Stack direction="row" spacing={0.75} flexWrap="wrap" useFlexGap sx={{ pt: 0.125 }}>
        {options.map((option) => {
          const selected = activeValues.includes(option.value);
          return (
            <Chip
              key={option.value}
              label={option.label}
              size="small"
              clickable
              color={selected ? "secondary" : "default"}
              variant={selected ? "filled" : "outlined"}
              onClick={() => onToggle(option.value)}
            />
          );
        })}
      </Stack>
    </Stack>
  );
}
