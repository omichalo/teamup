"use client";

import { useMemo } from "react";
import {
  Alert,
  Box,
  Chip,
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
import type { PriceQuote } from "@/lib/pricing/types";
import { calculatePaymentSummary } from "@/lib/club-registration/payment/calculate-payment-summary";
import { normalizePaymentAidList } from "@/lib/club-registration/payment/payment-draft-helpers";
import type { RegistrationDraft } from "./registration-defaults";
import {
  PricingBreakdownDonationRows,
  useDonationPricing,
  useEstimatedInvoiceTotalCents as useEstimatedInvoiceTotalFromQuote,
} from "./pricing-breakdown-donation";

export type PricingBreakdownDraft = Pick<
  RegistrationDraft,
  | "birthDate"
  | "mainSectionId"
  | "slotIds"
  | "additionalSectionIds"
  | "wantsCompetitorExtras"
  | "wantsOptionalJersey"
  | "competitionIds"
  | "familyRegistrationOrder"
  | "sex"
  | "firstFemaleRegistrationSqy"
  | "reductionTypes"
> & {
  paymentAids?: RegistrationDraft["paymentAids"];
  voluntaryDonationCents?: number;
};

function toPricingContextInput(draft: PricingBreakdownDraft) {
  const input = {
    birthDate: draft.birthDate,
    mainSectionId: draft.mainSectionId,
    slotIds: draft.slotIds ?? [],
    additionalSectionIds: draft.additionalSectionIds ?? [],
    wantsCompetitorExtras: draft.wantsCompetitorExtras,
    wantsOptionalJersey: draft.wantsOptionalJersey,
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

export function useEstimatedInvoiceTotalCents(draft: PricingBreakdownDraft): number | null {
  const quote = usePricingQuote(draft);
  return useEstimatedInvoiceTotalFromQuote(quote, draft);
}

function useDeclarativeAidSummary(
  quote: PriceQuote | null,
  draft: PricingBreakdownDraft,
  invoiceTotalCents: number
) {
  return useMemo(() => {
    if (!quote) return null;
    const aids = normalizePaymentAidList(draft.paymentAids ?? []);
    const hasDeclarativeAids =
      (draft.reductionTypes?.length ?? 0) > 0 || aids.length > 0;
    if (!hasDeclarativeAids) return null;
    return calculatePaymentSummary({
      totalAmountCents: invoiceTotalCents,
      aids,
      receivedPayments: [],
    });
  }, [quote, draft.reductionTypes, draft.paymentAids, invoiceTotalCents]);
}

export function PricingBreakdown({ draft, variant = "full" }: Props) {
  const quote = usePricingQuote(draft);
  const donationPricing = useDonationPricing(quote, draft);
  const invoiceTotalCents = donationPricing?.invoiceTotalCents ?? quote?.totalCents ?? 0;
  const aidSummary = useDeclarativeAidSummary(quote, draft, invoiceTotalCents);
  const declaredAids = useMemo(
    () =>
      normalizePaymentAidList(draft.paymentAids ?? []).filter(
        (a) => a.amountCents > 0
      ),
    [draft.paymentAids]
  );

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
        {donationPricing ? (
          <>
            <Typography variant="caption" color="text.secondary">
              Catalogue : {formatCentsAsEuros(quote.totalCents)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Don : {formatCentsAsEuros(donationPricing.voluntaryDonationCents)}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              Remise don : −{formatCentsAsEuros(donationPricing.donationDiscountCents)}
            </Typography>
          </>
        ) : null}
        <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
          Total estimé : {formatCentsAsEuros(invoiceTotalCents)}
        </Typography>
        {aidSummary ? (
          <>
            <Typography variant="caption" color="text.secondary">
              Aides déclarées :{" "}
              {formatCentsAsEuros(aidSummary.assistanceTotalAmountCents)}
            </Typography>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
              Reste à payer estimé : {formatCentsAsEuros(aidSummary.amountToPayCents)}
            </Typography>
          </>
        ) : null}
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
      <Stack direction="row" spacing={1} alignItems="center" flexWrap="wrap" useFlexGap>
        <Typography
          variant="caption"
          color="text.secondary"
          sx={{ lineHeight: 1.3, display: "block" }}
        >
          {quote.segmentLabel}
        </Typography>
        {quote.appliedPricingDeviceLabel ? (
          <Chip
            size="small"
            color="warning"
            label={quote.appliedPricingDeviceLabel}
            sx={{ height: 20, fontSize: "0.6875rem" }}
          />
        ) : null}
      </Stack>

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
            {donationPricing ? (
              <PricingBreakdownDonationRows
                donationPricing={donationPricing}
                cellSx={cellSx}
              />
            ) : null}
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
                {donationPricing ? "Total avec don" : "Total estimé"}
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
                {formatCentsAsEuros(invoiceTotalCents)}
              </TableCell>
            </TableRow>
            {aidSummary ? (
              <>
                {declaredAids.map((aid) => (
                  <TableRow key={aid.type}>
                    <TableCell sx={{ ...cellSx, pl: 0, pt: 0.5 }}>
                      Aide — {aid.label}
                    </TableCell>
                    <TableCell
                      align="right"
                      sx={{
                        ...cellSx,
                        pr: 0,
                        pt: 0.5,
                        fontWeight: 600,
                        color: "success.dark",
                        whiteSpace: "nowrap",
                      }}
                    >
                      {formatCentsAsEuros(-aid.amountCents)}
                    </TableCell>
                  </TableRow>
                ))}
                <TableRow>
                  <TableCell
                    sx={{
                      ...cellSx,
                      pl: 0,
                      pb: 0.25,
                      pt: 0.5,
                      fontWeight: 700,
                      fontSize: isSidebar ? "0.875rem" : undefined,
                    }}
                  >
                    Reste à payer estimé
                  </TableCell>
                  <TableCell
                    align="right"
                    sx={{
                      ...cellSx,
                      pr: 0,
                      pb: 0.25,
                      pt: 0.5,
                      fontWeight: 700,
                      fontSize: isSidebar ? "0.875rem" : undefined,
                    }}
                  >
                    {formatCentsAsEuros(aidSummary.amountToPayCents)}
                  </TableCell>
                </TableRow>
              </>
            ) : null}
          </TableBody>
        </Table>
      </Box>

      {aidSummary?.aidsExceedTotal ? (
        <Alert severity="error" variant="outlined" sx={{ py: 0.5 }}>
          Le total des aides dépasse le montant estimé. Ajustez les montants dans
          le dossier administratif.
        </Alert>
      ) : null}

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

      {isSidebar && quote.requiresAdminReview ? (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.35 }}>
          Les aides et réductions restent soumises à validation du secrétariat.
        </Typography>
      ) : null}

      {!isSidebar ? (
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>
          Montant indicatif : les montants d&apos;aides sont saisis au dossier
          administratif ; le secrétariat valide le total définitif avant tout paiement.
        </Typography>
      ) : null}
    </Stack>
  );
}
