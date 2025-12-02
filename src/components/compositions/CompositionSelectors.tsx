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
import { useSelectionFromStore } from "@/hooks/useStoreSelectors";

interface JourneeData {
  journee: number;
  phase: "aller" | "retour";
  dates: Date[];
}

interface CompositionSelectorsProps {
  selectedEpreuve?: EpreuveType | null; // Optionnel, utilise le store si non fourni
  selectedPhase?: "aller" | "retour" | null; // Optionnel, utilise le store si non fourni
  selectedJournee?: number | null; // Optionnel, utilise le store si non fourni
  onEpreuveChange?: (epreuve: EpreuveType) => void; // Optionnel, utilise le store si non fourni
  onPhaseChange?: (phase: "aller" | "retour" | null) => void; // Optionnel, utilise le store si non fourni
  onJourneeChange?: (journee: number | null) => void; // Optionnel, utilise le store si non fourni
  isParis?: boolean; // Optionnel, utilise le store si non fourni
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
  // Utiliser le store pour les sélections si non fournies en props
  const {
    selectedEpreuve: selectedEpreuveFromStore,
    selectedPhase: selectedPhaseFromStore,
    selectedJournee: selectedJourneeFromStore,
    setSelectedEpreuve: setSelectedEpreuveFromStore,
    setSelectedPhase: setSelectedPhaseFromStore,
    setSelectedJournee: setSelectedJourneeFromStore,
    isParis: isParisFromStore,
  } = useSelectionFromStore();

  const {
    selectedEpreuve: selectedEpreuveProp,
    selectedPhase: selectedPhaseProp,
    selectedJournee: selectedJourneeProp,
    onEpreuveChange: onEpreuveChangeProp,
    onPhaseChange: onPhaseChangeProp,
    onJourneeChange: onJourneeChangeProp,
    isParis: isParisProp,
    journeesByPhase,
    showJournee = true,
    phaseOptions = [
      { value: "aller", label: "Phase Aller" },
      { value: "retour", label: "Phase Retour" },
    ],
  } = props;

  // Utiliser les valeurs des props si fournies, sinon utiliser le store
  const selectedEpreuve = selectedEpreuveProp ?? selectedEpreuveFromStore;
  const selectedPhase = selectedPhaseProp ?? selectedPhaseFromStore;
  const selectedJournee = selectedJourneeProp ?? selectedJourneeFromStore;
  const isParis = isParisProp ?? isParisFromStore ?? false;

  // Utiliser les handlers des props si fournis, sinon utiliser le store
  const onEpreuveChange = onEpreuveChangeProp ?? ((epreuve: EpreuveType) => setSelectedEpreuveFromStore(epreuve));
  const onPhaseChange = onPhaseChangeProp ?? ((phase: "aller" | "retour" | null) => setSelectedPhaseFromStore(phase));
  const onJourneeChange = onJourneeChangeProp ?? ((journee: number | null) => setSelectedJourneeFromStore(journee));

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

