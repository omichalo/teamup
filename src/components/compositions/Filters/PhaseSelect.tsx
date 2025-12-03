import React from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SxProps,
  type Theme,
} from "@mui/material";

interface PhaseSelectProps {
  value: "aller" | "retour" | null;
  onChange: (value: "aller" | "retour") => void;
  disabled?: boolean;
  hidden?: boolean;
  id?: string;
  labelId?: string;
  sx?: SxProps<Theme>;
}

export const PhaseSelect: React.FC<PhaseSelectProps> = ({
  value,
  onChange,
  disabled = false,
  hidden,
  id = "phase-select",
  labelId = "phase-select-label",
  sx,
}) => {
  if (hidden) {
    return null;
  }

  return (
    <FormControl size="small" sx={{ minWidth: 150, ...sx }} disabled={disabled}>
      <InputLabel id={labelId}>Phase</InputLabel>
      <Select
        labelId={labelId}
        id={id}
        value={value || ""}
        label="Phase"
        onChange={(event) => onChange(event.target.value as "aller" | "retour")}
      >
        <MenuItem value="aller">Phase Aller</MenuItem>
        <MenuItem value="retour">Phase Retour</MenuItem>
      </Select>
    </FormControl>
  );
};
