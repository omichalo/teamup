"use client";

import React from "react";
import {
  Box,
  FormControl,
  FormControlLabel,
  InputLabel,
  MenuItem,
  Select,
  Switch,
} from "@mui/material";
import { FilterCard } from "@/components/ui/FilterCard";
import { EpreuveSelect } from "@/components/compositions/Filters/EpreuveSelect";
import { PhaseSelect } from "@/components/compositions/Filters/PhaseSelect";
import { SearchInput } from "@/components/compositions/Filters/SearchInput";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";
import { isParisEpreuve } from "@/lib/shared/epreuve-utils";
import type { JourneeData } from "@/lib/shared/journee-dates-utils";

export interface DisponibilitesFiltersCardProps {
  selectedEpreuve: EpreuveType | null;
  selectedPhase: "aller" | "retour" | null;
  selectedJournee: number | null;
  showAllPlayers: boolean;
  searchQuery: string;
  journeesByPhase: Map<"aller" | "retour", Map<number, JourneeData>>;
  onEpreuveChange: (epreuve: EpreuveType | null) => void;
  onPhaseChange: (phase: "aller" | "retour" | null) => void;
  onJourneeChange: (journee: number | null) => void;
  onShowAllPlayersChange: (show: boolean) => void;
  onSearchQueryChange: (query: string) => void;
}

export function DisponibilitesFiltersCard({
  selectedEpreuve,
  selectedPhase,
  selectedJournee,
  showAllPlayers,
  searchQuery,
  journeesByPhase,
  onEpreuveChange,
  onPhaseChange,
  onJourneeChange,
  onShowAllPlayersChange,
  onSearchQueryChange,
}: DisponibilitesFiltersCardProps) {
  const phaseToUse =
    selectedEpreuve === "championnat_paris" ? "aller" : selectedPhase;

  const journeeMenuItems = React.useMemo(() => {
    if (!phaseToUse) return null;
    const journeesArray = Array.from(
      journeesByPhase.get(phaseToUse)?.values() ?? []
    );
    return journeesArray
      .sort((a, b) => a.journee - b.journee)
      .map(({ journee, dates }) => {
        const datesFormatted = dates
          .map((date: Date) =>
            new Intl.DateTimeFormat("fr-FR", {
              day: "2-digit",
              month: "2-digit",
            }).format(date)
          )
          .join(", ");
        return (
          <MenuItem key={journee} value={journee}>
            Journée {journee} - {datesFormatted}
          </MenuItem>
        );
      });
  }, [journeesByPhase, phaseToUse]);

  return (
    <FilterCard marginBottom={1}>
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
            value={selectedJournee ?? ""}
            label="Journée"
            onChange={(e) =>
              onJourneeChange(e.target.value ? Number(e.target.value) : null)
            }
            disabled={
              (selectedEpreuve === "championnat_paris"
                ? false
                : selectedPhase === null) || selectedEpreuve === null
            }
          >
            {journeeMenuItems}
          </Select>
        </FormControl>

        <FormControlLabel
          control={
            <Switch
              checked={showAllPlayers}
              onChange={(e) => onShowAllPlayersChange(e.target.checked)}
            />
          }
          label="Afficher tous les joueurs"
        />
      </Box>

      {selectedJournee ? (
        <SearchInput
          value={searchQuery}
          onChange={onSearchQueryChange}
          placeholder="Rechercher un joueur..."
          sx={{ mt: 2.5, mb: 0.75 }}
        />
      ) : null}
    </FilterCard>
  );
}
