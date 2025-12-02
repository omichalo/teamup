"use client";

import {
  Box,
  Card,
  CardContent,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
} from "@mui/material";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";

interface JourneeData {
  journee: number;
  phase: "aller" | "retour";
  dates: Date[];
}

interface CompositionSelectorsProps {
  selectedEpreuve: EpreuveType | null;
  selectedPhase: "aller" | "retour" | null;
  selectedJournee: number | null;
  onEpreuveChange: (epreuve: EpreuveType) => void;
  onPhaseChange: (phase: "aller" | "retour" | null) => void;
  onJourneeChange: (journee: number | null) => void;
  isParis: boolean;
  journeesByPhase: Map<
    "aller" | "retour",
    Map<number, JourneeData>
  >;
  showJournee?: boolean;
  phaseOptions?: Array<{ value: "aller" | "retour"; label: string }>;
}

/**
 * Composant pour les sélecteurs d'épreuve, phase et journée
 */
export function CompositionSelectors(props: CompositionSelectorsProps) {
  const {
    selectedEpreuve,
    selectedPhase,
    selectedJournee,
    onEpreuveChange,
    onPhaseChange,
    onJourneeChange,
    isParis,
    journeesByPhase,
    showJournee = true,
    phaseOptions = [
      { value: "aller", label: "Phase Aller" },
      { value: "retour", label: "Phase Retour" },
    ],
  } = props;

  return (
    <Card sx={{ mb: 3 }}>
      <CardContent sx={{ pt: 2.5, pb: 1.5 }}>
        <Box display="flex" gap={2} flexWrap="wrap" alignItems="center">
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel id="epreuve-select-label">Épreuve</InputLabel>
            <Select
              labelId="epreuve-select-label"
              id="epreuve-select"
              value={selectedEpreuve || ""}
              label="Épreuve"
              onChange={(e) => {
                const epreuve = e.target.value as EpreuveType;
                onEpreuveChange(epreuve);
              }}
            >
              <MenuItem value="championnat_equipes">
                Championnat par Équipes
              </MenuItem>
              <MenuItem value="championnat_paris">
                Championnat de Paris IDF
              </MenuItem>
            </Select>
          </FormControl>
          {/* Masquer le sélecteur de phase pour le championnat de Paris (une seule phase) */}
          {!isParis && (
            <FormControl size="small" sx={{ minWidth: 180 }}>
              <InputLabel id="phase-select-label">Phase</InputLabel>
              <Select
                labelId="phase-select-label"
                id="phase-select"
                value={selectedPhase || ""}
                label="Phase"
                onChange={(e) =>
                  onPhaseChange(
                    e.target.value
                      ? (e.target.value as "aller" | "retour")
                      : null
                  )
                }
                disabled={selectedEpreuve === null}
              >
                {phaseOptions.map((option) => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          )}
          {showJournee && (
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel id="journee-select-label">Journée</InputLabel>
              <Select
                labelId="journee-select-label"
                id="journee-select"
                value={selectedJournee || ""}
                label="Journée"
                onChange={(e) =>
                  onJourneeChange(
                    e.target.value ? Number(e.target.value) : null
                  )
                }
                disabled={
                  (isParis ? false : selectedPhase === null) ||
                  selectedEpreuve === null
                }
              >
                {(() => {
                  // Pour le championnat de Paris, utiliser "aller" comme phase
                  const phaseToUse = isParis ? "aller" : selectedPhase;

                  if (!phaseToUse) return null;

                  const journeesArray = Array.from(
                    journeesByPhase.get(phaseToUse)?.values() || []
                  ) as Array<JourneeData>;

                  return journeesArray
                    .sort((a, b) => a.journee - b.journee)
                    .map(({ journee, dates }) => {
                      const datesFormatted = dates
                        .map((date) => {
                          return new Intl.DateTimeFormat("fr-FR", {
                            day: "2-digit",
                            month: "2-digit",
                          }).format(date);
                        })
                        .join(", ");
                      return (
                        <MenuItem key={journee} value={journee}>
                          Journée {journee} - {datesFormatted}
                        </MenuItem>
                      );
                    });
                })()}
              </Select>
            </FormControl>
          )}
        </Box>
      </CardContent>
    </Card>
  );
}

