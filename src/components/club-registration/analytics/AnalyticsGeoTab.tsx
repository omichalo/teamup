"use client";

import { Grid, Stack } from "@mui/material";
import { topBucketToChartData } from "@/lib/club-registration/analytics/aggregate";
import type { RegistrationAnalyticsSummary } from "@/lib/club-registration/analytics/types";
import { AnalyticsBarChart } from "./AnalyticsBarChart";
import { AnalyticsGeoTable } from "./AnalyticsGeoTable";

type AnalyticsGeoTabProps = {
  summary: RegistrationAnalyticsSummary;
};

export function AnalyticsGeoTab({ summary }: AnalyticsGeoTabProps) {
  return (
    <Stack spacing={3}>
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsBarChart
            title="Codes postaux"
            data={topBucketToChartData(summary.postalCode)}
            layout="horizontal"
            height={360}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsBarChart
            title="Villes (normalisées)"
            data={topBucketToChartData(summary.city)}
            layout="horizontal"
            height={360}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsGeoTable title="Détail par code postal" bucket={summary.postalCode} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsGeoTable title="Détail par ville" bucket={summary.city} />
        </Grid>
      </Grid>
    </Stack>
  );
}
