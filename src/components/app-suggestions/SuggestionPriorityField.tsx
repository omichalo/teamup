"use client";

import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import type { SuggestionPriority } from "@/lib/app-suggestions/types";
import { SUGGESTION_PRIORITIES } from "@/lib/app-suggestions/types";
import { SUGGESTION_PRIORITY_LABELS } from "@/lib/app-suggestions/status";

type SuggestionPriorityFieldProps = {
  value: SuggestionPriority;
  onChange: (value: SuggestionPriority) => void;
  disabled?: boolean;
  required?: boolean;
  fullWidth?: boolean;
};

export function SuggestionPriorityField({
  value,
  onChange,
  disabled = false,
  required = false,
  fullWidth = true,
}: SuggestionPriorityFieldProps) {
  const handleChange = (event: SelectChangeEvent<string>) => {
    onChange(event.target.value as SuggestionPriority);
  };

  return (
    <FormControl fullWidth={fullWidth} required={required} disabled={disabled}>
      <InputLabel id="suggestion-priority-label">Priorité</InputLabel>
      <Select
        labelId="suggestion-priority-label"
        label="Priorité"
        value={value}
        onChange={handleChange}
      >
        {SUGGESTION_PRIORITIES.map((priority) => (
          <MenuItem key={priority} value={priority}>
            {SUGGESTION_PRIORITY_LABELS[priority]}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}
