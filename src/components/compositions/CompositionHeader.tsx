"use client";

import { Typography } from "@mui/material";
import type { EpreuveType } from "@/lib/shared/epreuve-utils";
import { CompositionSelectors } from "./CompositionSelectors";
import { CompositionRulesHelp } from "./CompositionRulesHelp";
import { CompositionToolbar } from "./CompositionToolbar";
import type { useCompositionRules } from "@/hooks/useCompositionRules";
import type { useEpreuvePhaseJourneeSelection } from "@/hooks/useEpreuvePhaseJourneeSelection";

interface CompositionHeaderProps {
  title: string;
  description: string;
  selectedEpreuve: EpreuveType | null;
  selectedPhase: "aller" | "retour" | null;
  selectedJournee: number | null;
  onEpreuveChange: (epreuve: EpreuveType | null) => void;
  onPhaseChange: (phase: "aller" | "retour" | null) => void;
  onJourneeChange: (journee: number | null) => void;
  isParis: boolean;
  journeesByPhase: ReturnType<typeof useEpreuvePhaseJourneeSelection>["journeesByPhase"];
  compositionRules: ReturnType<typeof useCompositionRules>;
  canCopyDefaultsButton: boolean;
  canResetButton: boolean;
  onApplyDefaultsClick: () => void;
  onResetClick: () => void;
}

export function CompositionHeader(props: CompositionHeaderProps) {
  const {
    title,
    description,
    selectedEpreuve,
    selectedPhase,
    selectedJournee,
    onEpreuveChange,
    onPhaseChange,
    onJourneeChange,
    isParis,
    journeesByPhase,
    compositionRules,
    canCopyDefaultsButton,
    canResetButton,
    onApplyDefaultsClick,
    onResetClick,
  } = props;

  return (
    <>
      <Typography variant="h4" gutterBottom>
        {title}
      </Typography>

      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        {description}
      </Typography>

      <CompositionSelectors
        selectedEpreuve={selectedEpreuve}
        selectedPhase={selectedPhase}
        selectedJournee={selectedJournee}
        onEpreuveChange={(epreuve) => {
          onEpreuveChange(epreuve);
          onPhaseChange(null); // Réinitialiser la phase lors du changement d'épreuve
          onJourneeChange(null); // Réinitialiser la journée lors du changement d'épreuve
        }}
        onPhaseChange={(phase) => {
          onPhaseChange(phase);
          onJourneeChange(null); // Réinitialiser la journée lors du changement de phase
        }}
        onJourneeChange={onJourneeChange}
        isParis={isParis}
        journeesByPhase={journeesByPhase}
      />

      <CompositionRulesHelp rules={compositionRules} />

      <CompositionToolbar
        canCopyDefaultsButton={canCopyDefaultsButton}
        canResetButton={canResetButton}
        onApplyDefaultsClick={onApplyDefaultsClick}
        onResetClick={onResetClick}
      />
    </>
  );
}

