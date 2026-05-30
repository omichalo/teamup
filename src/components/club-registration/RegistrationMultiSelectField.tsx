"use client";

import {
  Checkbox,
  FormControl,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";

export function RegistrationMultiSelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string[];
  options: Array<{ value: string; label: string }>;
  onChange: (value: string[]) => void;
}) {
  const labelId = `${label.replace(/\s+/g, "-").toLowerCase()}-label`;
  return (
    <FormControl fullWidth>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select<string[]>
        multiple
        labelId={labelId}
        value={value}
        input={<OutlinedInput label={label} />}
        renderValue={(selected: string[]) =>
          selected
            .map((id) => options.find((option) => option.value === id)?.label ?? id)
            .join(", ")
        }
        onChange={(event: SelectChangeEvent<string[]>) => {
          const next = event.target.value;
          onChange(typeof next === "string" ? next.split(",") : next);
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <Checkbox checked={value.includes(option.value)} />
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
