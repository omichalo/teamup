"use client";

import { Card, CardContent, FormControl, InputLabel, MenuItem, Select, Box } from "@mui/material";
import { EpreuveType, isParisEpreuve } from "@/lib/shared/epreuve-utils";
import { EpreuveSelect } from "@/components/compositions/Filters/EpreuveSelect";
import { PhaseSelect } from "@/components/compositions/Filters/PhaseSelect";

interface JourneeOption {
  journee: number;
  label: string;
}

interface CompositionsFiltersCardProps {
  selectedEpreuve: EpreuveType | null;
  selectedPhase: "aller" | "retour" | null;
  selectedJournee: number | null;
  journeeMenuOptions: JourneeOption[];
  onEpreuveChange: (epreuve: EpreuveType | null) => void;
  onPhaseChange: (phase: "aller" | "retour" | null) => void;
  onJourneeChange: (journee: number | null) => void;
}

export function CompositionsFiltersCard({
  selectedEpreuve,
  selectedPhase,
  selectedJournee,
  journeeMenuOptions,
  onEpreuveChange,
  onPhaseChange,
  onJourneeChange,
}: CompositionsFiltersCardProps) {
  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ pt: 2.5, pb: 1.5 }}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <EpreuveSelect value={selectedEpreuve} onChange={onEpreuveChange} />
          {!isParisEpreuve(selectedEpreuve) && (
            <PhaseSelect
              value={selectedPhase}
              onChange={onPhaseChange}
              disabled={selectedEpreuve === null}
            />
          )}
          <FormControl size="small" sx={{ minWidth: 150 }}>
            <InputLabel id="journee-select-label">Journée</InputLabel>
            <Select
              labelId="journee-select-label"
              id="journee-select"
              value={selectedJournee || ""}
              label="Journée"
              onChange={(event) =>
                onJourneeChange(event.target.value ? Number(event.target.value) : null)
              }
              disabled={
                (isParisEpreuve(selectedEpreuve) ? false : selectedPhase === null) ||
                selectedEpreuve === null
              }
            >
              {journeeMenuOptions.map((option) => (
                <MenuItem key={option.journee} value={option.journee}>
                  {option.label}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
        </Box>
      </CardContent>
    </Card>
  );
}
