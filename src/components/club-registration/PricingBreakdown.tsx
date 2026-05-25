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
import { useRegistrationConfigValue } from "@/hooks/useRegistrationConfig";
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
>;

function toPricingContextInput(draft: PricingBreakdownDraft) {
  const input = {
    birthDate: draft.birthDate,
    mainSectionId: draft.mainSectionId,
    wantsCompetitorExtras: draft.wantsCompetitorExtras,
    competitionIds: draft.competitionIds,
    familyRegistrationOrder: draft.familyRegistrationOrder,
    sex: draft.sex === "" ? ("other" as const) : draft.sex,
    firstFemaleRegistrationSqy: draft.firstFemaleRegistrationSqy,
    reductionTypes: draft.reductionTypes,
  };
  return buildPricingContext(input);
}

type Props = {
  draft: PricingBreakdownDraft;
  variant?: "compact" | "full" | "sidebar";
};

function canEstimate(draft: PricingBreakdownDraft): boolean {
  return computeAgeAt(draft.birthDate) !== null;
}

export function usePricingQuote(draft: PricingBreakdownDraft) {
  const config = useRegistrationConfigValue();
  return useMemo(() => {
    if (!canEstimate(draft)) {
      return null;
    }
    return calculateQuote(toPricingContextInput(draft), config);
  }, [draft, config]);
}

export function PricingBreakdown({ draft, variant = "full" }: Props) {
  const quote = usePricingQuote(draft);

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

  const isSidebar = variant === "sidebar";
  const cellSx = isSidebar
    ? { border: 0, py: 0.35, fontSize: "0.8125rem" }
    : { border: 0, py: 0.5 };

  return (
    <Stack spacing={isSidebar ? 0.5 : 1.5}>
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ lineHeight: 1.3, display: "block" }}
      >
        {quote.segmentLabel}
      </Typography>

      <Box sx={{ overflowX: "auto" }}>
        <Table size="small" aria-label="Détail tarifaire estimé">
          <TableBody>
            {billable.map((line) => (
              <TableRow key={line.id}>
                <TableCell sx={{ ...cellSx, pl: 0 }}>
                  {line.label}
                </TableCell>
                <TableCell
                  align="right"
                  sx={{
                    ...cellSx,
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
              <TableCell
                sx={{
                  ...cellSx,
                  pt: 0.75,
                  pl: 0,
                  fontWeight: 700,
                  fontSize: isSidebar ? "0.875rem" : undefined,
                }}
              >
                Total estimé
              </TableCell>
              <TableCell
                align="right"
                sx={{
                  ...cellSx,
                  pt: 0.75,
                  pr: 0,
                  fontWeight: 700,
                  fontSize: isSidebar ? "0.875rem" : undefined,
                }}
              >
                {formatCentsAsEuros(quote.totalCents)}
              </TableCell>
            </TableRow>
          </TableBody>
        </Table>
      </Box>

      {!isSidebar
        ? infoLines.map((line) => (
            <Typography key={line.id} variant="caption" color="text.secondary">
              {line.label}
            </Typography>
          ))
        : infoLines[0]
          ? (
              <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.3 }}>
                {infoLines[0].label}
              </Typography>
            )
          : null}

      {quote.warnings.map((w) =>
        isSidebar ? (
          <Typography key={w} variant="caption" color="warning.main" sx={{ lineHeight: 1.3 }}>
            {w}
          </Typography>
        ) : (
          <Alert key={w} severity="info" variant="outlined">
            {w}
          </Alert>
        )
      )}

      {!isSidebar ? (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          Montant indicatif : le secrétariat valide le total définitif avant tout
          paiement (aides Pass Sport, Labaz, etc.).
        </Typography>
      ) : null}
    </Stack>
  );
}
