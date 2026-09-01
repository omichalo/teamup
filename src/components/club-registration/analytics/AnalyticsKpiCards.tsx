"use client";

import { Card, CardContent, Grid, Typography } from "@mui/material";
import type { RegistrationAnalyticsSummary } from "@/lib/club-registration/analytics/types";

type AnalyticsKpiCardsProps = {
  summary: RegistrationAnalyticsSummary;
};

function KpiCard({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <Card variant="outlined" sx={{ height: "100%" }}>
      <CardContent>
        <Typography variant="overline" color="text.secondary">
          {label}
        </Typography>
        <Typography variant="h4" component="p" sx={{ mt: 0.5 }}>
          {value}
        </Typography>
        {hint ? (
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {hint}
          </Typography>
        ) : null}
      </CardContent>
    </Card>
  );
}

function pct(part: number, total: number): string {
  if (total <= 0) return "0 %";
  return `${Math.round((part / total) * 100)} %`;
}

export function AnalyticsKpiCards({ summary }: AnalyticsKpiCardsProps) {
  const female = summary.sex.female ?? 0;
  const male = summary.sex.male ?? 0;
  const minors = summary.isMinor.minor ?? 0;
  const renewals = summary.wasSqyMemberLastYear.renewal ?? 0;
  const newcomers = summary.wasSqyMemberLastYear.new ?? 0;

  return (
    <Grid container spacing={2}>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard label="Total adhérents" value={String(summary.total)} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label="Femmes"
          value={String(female)}
          hint={`${pct(female, summary.total)} · Hommes ${male}`}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label="Mineurs"
          value={String(minors)}
          hint={`${pct(minors, summary.total)} du total`}
        />
      </Grid>
      <Grid size={{ xs: 12, sm: 6, md: 3 }}>
        <KpiCard
          label="Renouvellements"
          value={String(renewals)}
          hint={`${newcomers} nouveau(x)`}
        />
      </Grid>
    </Grid>
  );
}
