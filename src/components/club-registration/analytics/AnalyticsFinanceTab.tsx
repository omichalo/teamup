"use client";

import { Card, CardContent, Grid, Stack, Typography } from "@mui/material";
import { countBucketToChartData, paymentAidLabel } from "@/lib/club-registration/analytics/aggregate";
import { formatCentsEur } from "@/lib/club-registration/analytics/aggregate-ops";
import type { FinanceAnalyticsSummary } from "@/lib/club-registration/analytics/types";
import {
  PAYMENT_METHOD_LABELS,
  PAYMENT_STATUS_LABELS,
} from "@/lib/club-registration/payment-constants";
import { AnalyticsBarChart } from "./AnalyticsBarChart";
import { AnalyticsPieChart } from "./AnalyticsPieChart";

type AnalyticsFinanceTabProps = {
  finance: FinanceAnalyticsSummary;
  aidLabels: Record<string, string>;
};

function MoneyStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h5" component="p" sx={{ mt: 0.5 }}>
          {value}
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          {hint}
        </Typography>
      </CardContent>
    </Card>
  );
}

/** Agrégats financiers anonymisés (cotisations, dons, aides, méthodes). */
export function AnalyticsFinanceTab({ finance, aidLabels }: AnalyticsFinanceTabProps) {
  const receivedRate =
    finance.aidsCollectableCount > 0
      ? Math.round((finance.aidsReceivedCents / Math.max(finance.aidsDeclaredCents, 1)) * 100)
      : 0;

  return (
    <Stack spacing={3}>
      <Typography variant="body2" color="text.secondary">
        Totaux agrégés sur le filtre actif — aucune donnée nominative. Visible aux rôles
        tableau d’adhésions (y compris coachs), comme les colonnes paiement du tableau.
      </Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MoneyStat
            label="Total cotisations"
            value={formatCentsEur(finance.quoteTotalCents)}
            hint={`${finance.recordsWithQuote} dossier(s) avec tarif calculé`}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MoneyStat
            label="Dons"
            value={formatCentsEur(finance.donationCents)}
            hint="Dons volontaires déclarés"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MoneyStat
            label="Chèques vacances"
            value={formatCentsEur(finance.holidayVoucherCents)}
            hint="Montants déclarés"
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <MoneyStat
            label="Aides reçues"
            value={formatCentsEur(finance.aidsReceivedCents)}
            hint={`${formatCentsEur(finance.aidsDeclaredCents)} déclarés · ${receivedRate} % · ${finance.aidsPendingCount} en attente`}
          />
        </Grid>
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsPieChart
            title="Statut de paiement"
            data={countBucketToChartData(finance.paymentStatus, {
              ...PAYMENT_STATUS_LABELS,
              unknown: "Non renseigné",
            })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsPieChart
            title="Méthode de paiement"
            data={countBucketToChartData(finance.paymentMethod, {
              ...PAYMENT_METHOD_LABELS,
            })}
          />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <AnalyticsBarChart
            title="Aides déclarées (par type)"
            data={countBucketToChartData(finance.aidTypeCounts, {
              ...aidLabels,
              pass_sport: aidLabels.pass_sport ?? paymentAidLabel("pass_sport"),
              pass_plus: aidLabels.pass_plus ?? paymentAidLabel("pass_plus"),
              labaz: aidLabels.labaz ?? paymentAidLabel("labaz"),
              aide_municipale: aidLabels.aide_municipale ?? paymentAidLabel("aide_municipale"),
            })}
            layout="horizontal"
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
