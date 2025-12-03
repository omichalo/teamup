"use client";

import React from "react";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

export interface PhaseSelectOption {
  value: "aller" | "retour";
  label: string;
}

interface PhaseSelectProps {
  value: "aller" | "retour" | null;
  onChange: (phase: "aller" | "retour") => void;
  label?: string;
  disabled?: boolean;
  options?: PhaseSelectOption[];
  minWidth?: number;
}

const DEFAULT_OPTIONS: PhaseSelectOption[] = [
  { value: "aller", label: "Phase Aller" },
  { value: "retour", label: "Phase Retour" },
];

export const PhaseSelect: React.FC<PhaseSelectProps> = ({
  value,
  onChange,
  label = "Phase",
  disabled = false,
  options = DEFAULT_OPTIONS,
  minWidth = 150,
}) => {
  return (
    <FormControl size="small" sx={{ minWidth }} disabled={disabled}>
      <InputLabel id="phase-select-label">{label}</InputLabel>
      <Select
        labelId="phase-select-label"
        id="phase-select"
        value={value || ""}
        label={label}
        onChange={(e) => onChange(e.target.value as "aller" | "retour")}
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
