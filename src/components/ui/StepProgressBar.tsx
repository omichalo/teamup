"use client";

import { LinearProgress, Stack, Typography } from "@mui/material";
import type { SxProps, Theme } from "@mui/material/styles";

export interface StepProgressBarProps {
  /** Index 0-based de l'étape actuellement affichée. */
  activeStep: number;
  /** Nombre total d'étapes du parcours. */
  totalSteps: number;
  /** Étiquette courte de l'étape active (ex. « Identité »). */
  activeLabel?: string;
  /**
   * Pourcentage de progression (0–100). Si non fourni, est calculé sur la base
   * de l'étape active (étape 1 = 0 %, dernière étape = 100 %).
   */
  value?: number;
  /** Étiquette accessible exposée au lecteur d'écran (`aria-label`). */
  ariaLabel?: string;
  sx?: SxProps<Theme>;
}

/**
 * Indicateur de progression discret et brandé pour les parcours en plusieurs
 * étapes. Pensé pour être utilisé en complément d'un `<Stepper>` MUI (qui
 * reste la source de vérité accessible pour la navigation), pour fournir un
 * repère visuel rapide.
 */
export function StepProgressBar({
  activeStep,
  totalSteps,
  activeLabel,
  value,
  ariaLabel,
  sx,
}: StepProgressBarProps) {
  const safeTotal = Math.max(1, totalSteps);
  const progress =
    typeof value === "number"
      ? Math.min(100, Math.max(0, value))
      : safeTotal <= 1
        ? 100
        : Math.round((activeStep / (safeTotal - 1)) * 100);

  const stepNumber = Math.min(safeTotal, activeStep + 1);

  return (
    <Stack spacing={0.75} {...(sx ? { sx } : {})}>
      <Stack
        direction="row"
        alignItems="baseline"
        justifyContent="space-between"
        spacing={1}
      >
        <Typography variant="overline" component="span" sx={{ color: "primary.main" }}>
          Étape {stepNumber} / {safeTotal}
          {activeLabel ? ` — ${activeLabel}` : null}
        </Typography>
        <Typography variant="caption" color="text.secondary" component="span">
          {progress}%
        </Typography>
      </Stack>
      <LinearProgress
        variant="determinate"
        value={progress}
        aria-label={ariaLabel ?? `Progression du formulaire : ${progress}%`}
      />
    </Stack>
  );
}
