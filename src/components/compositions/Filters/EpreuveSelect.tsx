import React from "react";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  type SxProps,
  type Theme,
} from "@mui/material";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";

interface EpreuveSelectProps {
  value: EpreuveType | null;
  onChange: (value: EpreuveType) => void;
  id?: string;
  labelId?: string;
  sx?: SxProps<Theme>;
}

export const EpreuveSelect: React.FC<EpreuveSelectProps> = ({
  value,
  onChange,
  id = "epreuve-select",
  labelId = "epreuve-select-label",
  sx,
}) => {
  return (
    <FormControl size="small" sx={{ minWidth: 200, ...sx }}>
      <InputLabel id={labelId}>Épreuve</InputLabel>
      <Select
        labelId={labelId}
        id={id}
        value={value || ""}
        label="Épreuve"
        onChange={(event) => onChange(event.target.value as EpreuveType)}
      >
        <MenuItem value="championnat_equipes">Championnat par Équipes</MenuItem>
        <MenuItem value="championnat_paris">Championnat de Paris IDF</MenuItem>
      </Select>
    </FormControl>
  );
};
