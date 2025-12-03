"use client";

import React from "react";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";

interface EpreuveSelectProps {
  value: EpreuveType | null;
  onChange: (epreuve: EpreuveType) => void;
  label?: string;
  disabled?: boolean;
  options?: Array<{ value: EpreuveType; label: string }>;
  minWidth?: number;
}

const DEFAULT_OPTIONS: Array<{ value: EpreuveType; label: string }> = [
  { value: "championnat_equipes", label: "Championnat par Équipes" },
  { value: "championnat_paris", label: "Championnat de Paris IDF" },
];

export const EpreuveSelect: React.FC<EpreuveSelectProps> = ({
  value,
  onChange,
  label = "Épreuve",
  disabled = false,
  options = DEFAULT_OPTIONS,
  minWidth = 200,
}) => {
  return (
    <FormControl size="small" sx={{ minWidth }} disabled={disabled}>
      <InputLabel id="epreuve-select-label">{label}</InputLabel>
      <Select
        labelId="epreuve-select-label"
        id="epreuve-select"
        value={value || ""}
        label={label}
        onChange={(e) => onChange(e.target.value as EpreuveType)}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
};
