"use client";

import { Box, Button, Stack, Typography } from "@mui/material";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import TableChartIcon from "@mui/icons-material/TableChart";
import Link from "next/link";

type Props = {
  position: number;
  total: number;
  remaining: number;
  filterLabel: string;
  canGoPrevious: boolean;
  canGoNext: boolean;
  spreadsheetHref?: string | null;
  onPrevious: () => void;
  onNext: () => void;
};

export function MembershipRequestQueueBar({
  position,
  total,
  remaining,
  filterLabel,
  canGoPrevious,
  canGoNext,
  spreadsheetHref,
  onPrevious,
  onNext,
}: Props) {
  if (total === 0) {
    return null;
  }

  const progressLabel =
    position > 0
      ? `${position} / ${total} · ${filterLabel}`
      : `${total} dossier${total > 1 ? "s" : ""} · ${filterLabel}`;

  const metaLabel =
    remaining > 0
      ? `${remaining} restant${remaining > 1 ? "s" : ""} · J/K · / recherche`
      : "Dernier dossier · J/K · / recherche";

  return (
    <Stack
      direction={{ xs: "column", sm: "row" }}
      spacing={0.75}
      alignItems={{ sm: "center" }}
      justifyContent="space-between"
    >
      <Box sx={{ minWidth: 0 }}>
        <Typography variant="body2" fontWeight={700} noWrap>
          {progressLabel}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {metaLabel}
        </Typography>
      </Box>

      <Stack direction="row" spacing={0.75} flexShrink={0} flexWrap="wrap" useFlexGap>
        <Button
          size="small"
          variant="outlined"
          startIcon={<ArrowBackIcon />}
          onClick={onPrevious}
          disabled={!canGoPrevious}
        >
          Précédent
        </Button>
        <Button
          size="small"
          variant="outlined"
          endIcon={<ArrowForwardIcon />}
          onClick={onNext}
          disabled={!canGoNext}
        >
          Suivant
        </Button>
        {spreadsheetHref ? (
          <Button
            component={Link}
            href={spreadsheetHref}
            size="small"
            variant="text"
            startIcon={<TableChartIcon />}
          >
            Tableau
          </Button>
        ) : null}
      </Stack>
    </Stack>
  );
}
