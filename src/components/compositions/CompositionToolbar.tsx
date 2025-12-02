"use client";

import { Box, Button } from "@mui/material";
import { ContentCopy, RestartAlt } from "@mui/icons-material";
import Link from "next/link";

interface CompositionToolbarProps {
  canCopyDefaultsButton: boolean;
  canResetButton: boolean;
  onApplyDefaultsClick: () => void;
  onResetClick: () => void;
}

/**
 * Composant pour la barre d'outils des compositions
 * Contient les boutons d'action principaux (gérer, copier, réinitialiser)
 */
export function CompositionToolbar(props: CompositionToolbarProps) {
  const {
    canCopyDefaultsButton,
    canResetButton,
    onApplyDefaultsClick,
    onResetClick,
  } = props;

  return (
    <Box
      sx={{
        display: "flex",
        gap: 2,
        mb: 3,
        flexWrap: "wrap",
        alignItems: "center",
      }}
    >
      <Button component={Link} href="/compositions/defaults" variant="outlined">
        Gérer les compositions par défaut
      </Button>
      <Button
        variant="contained"
        color="primary"
        startIcon={<ContentCopy />}
        disabled={!canCopyDefaultsButton}
        onClick={onApplyDefaultsClick}
      >
        Copier les compos par défaut (toutes équipes)
      </Button>
      <Button
        variant="outlined"
        color="error"
        startIcon={<RestartAlt />}
        disabled={!canResetButton}
        onClick={onResetClick}
      >
        Réinitialiser toutes les compos
      </Button>
    </Box>
  );
}

