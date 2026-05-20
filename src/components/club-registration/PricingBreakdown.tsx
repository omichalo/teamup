"use client";

import { useMemo } from "react";
import {
  Alert,
  Box,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableRow,
  Typography,
} from "@mui/material";
import { computeAgeAt } from "@/lib/club-registration/age";
import {
  buildPricingContext,
  calculateQuote,
  formatCentsAsEuros,
} from "@/lib/pricing";
import type { RegistrationDraft } from "./registration-defaults";

export type PricingBreakdownDraft = Pick<
  RegistrationDraft,
  | "birthDate"
  | "mainSectionId"
  | "wantsCompetitorExtras"
  | "competitionIds"
  | "familyRegistrationOrder"
  | "sex"
  | "firstFemaleRegistrationSqy"
  | "reductionTypes"
> & {
  handisportPracticeLevel?: "leisure" | "competition" | undefined;
};

type Props = {
  draft: PricingBreakdownDraft;
  variant?: "compact" | "full";
};

function canEstimate(draft: PricingBreakdownDraft): boolean {
  return computeAgeAt(draft.birthDate) !== null;
}

export function PricingBreakdown({ draft, variant = "full" }: Props) {
  const quote = useMemo(() => {
    if (!canEstimate(draft)) {
      return null;
    }
    return calculateQuote(
      buildPricingContext({
        ...draft,
        sex: draft.sex === "" ? "other" : draft.sex,
      })
    );
  }, [draft]);

  if (!canEstimate(draft)) {
    return (
      <Typography variant="body2" color="text.secondary">
        Indiquez une date de naissance valide pour voir une estimation tarifaire.
      </Typography>
    );
  }

  if (!quote || quote.lines.length === 0) {
    return (
      <Stack spacing={1}>
        {quote?.warnings.map((w) => (
          <Alert key={w} severity="warning" variant="outlined">
            {w}
          </Alert>
        ))}
        <Typography variant="body2" color="text.secondary">
          Estimation indisponible pour le moment.
        </Typography>
      </Stack>
    );
  }

  const billable = quote.lines.filter(
    (line) => line.kind !== "info" && line.amountCents !== 0
  );
  const infoLines = quote.lines.filter((line) => line.kind === "info");

  if (variant === "compact") {
    return (
      <Stack spacing={1}>
        <Typography variant="caption" color="text.secondary">
          {quote.segmentLabel}
        </Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Total estimé : {formatCentsAsEuros(quote.totalCents)}
        </Typography>
        {quote.warnings.map((w) => (
          <Typography key={w} variant="caption" color="warning.main">
            {w}
          </Typography>
        ))}
      </Stack>
    );
  }

  return (
    <Stack spacing={1.5}>
      <Typography variant="body2" color="text.secondary">
        {quote.segmentLabel}
      </Typography>

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" aria-label="Détail tarifaire estimé">
          <TableBody>
            {billable.map((line) => (
              <TableRow key={line.id}>
                <TableCell sx={{ border: 0, py: 0.5, pl: 0 }}>
                  {line.label}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    border: 0,
                    py: 0.5,
                    pr: 0,
                    whiteSpace: "nowrap",
                    fontWeight: line.amountCents < 0 ? 600 : 400,
                    color: line.amountCents < 0 ? "success.dark" : "inherit",
                  }}
                >
                  {formatCentsAsEuros(line.amountCents)}
                </TableCell>
              </TableRow>
            ))}
            <TableRow>
              <TableCell sx={{ border: 0, pt: 1, pl: 0, fontWeight: 700 }}>
                Total estimé
              </TableCell>
              <TableCell align="right" sx={{ border: 0, pt: 1, pr: 0, fontWeight: 700 }}>
                {formatCentsAsEuros(quote.totalCents)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>

      {infoLines.map((line) => (
        <Typography key={line.id} variant="caption" color="text.secondary">
          {line.label}
        </Typography>
      ))}

      {quote.warnings.map((w) => (
        <Alert key={w} severity="info" variant="outlined">
          {w}
        </Alert>
      ))}

      <Typography variant="caption" color="text.secondary">
        Montant indicatif : le secrétariat valide le total définitif avant tout
        paiement (aides Pass Sport, Labaz, etc.).
      </Typography>
    </Stack>
  );
}
