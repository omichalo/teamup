"use client";

import Link from "next/link";
import { Box, Button } from "@mui/material";
import { ContentCopy, RestartAlt } from "@mui/icons-material";

interface CompositionsActionsBarProps {
  canCopyDefaultsButton: boolean;
  canResetButton: boolean;
  onApplyDefaultsClick: () => void;
  onResetButtonClick: () => void;
}

export function CompositionsActionsBar({
  canCopyDefaultsButton,
  canResetButton,
  onApplyDefaultsClick,
  onResetButtonClick,
}: CompositionsActionsBarProps) {
  return (
    <Box
      sx={{
        mb: 3,
        display: "flex",
        flexWrap: "wrap",
        gap: 1.5,
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
        title="Copier les compositions par défaut pour toutes les équipes"
        sx={{
          color: "#fff !important",
          "& .MuiButton-startIcon": { color: "#fff !important" },
          "& span, & .MuiButton-label": { color: "#fff !important" },
        }}
      >
        Copier compos par défaut
      </Button>
      <Button
        variant="outlined"
        color="error"
        startIcon={<RestartAlt />}
        disabled={!canResetButton}
        onClick={onResetButtonClick}
      >
        Réinitialiser toutes les compos
      </Button>
    </Box>
  );
}
