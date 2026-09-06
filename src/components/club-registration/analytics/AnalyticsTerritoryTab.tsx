"use client";

import { Grid, Stack } from "@mui/material";
import { topBucketToChartData } from "@/lib/club-registration/analytics/aggregate";
import { buildNewcomerCityInsights } from "@/lib/club-registration/analytics/campaign-insights";
import type {
  AnalyticsRegistrationRecord,
  RegistrationAnalyticsSummary,
} from "@/lib/club-registration/analytics/types";
import { AnalyticsBarChart } from "./AnalyticsBarChart";
import { AnalyticsGeoTable } from "./AnalyticsGeoTable";
import { AnalyticsRecruitmentInsights } from "./AnalyticsRecruitmentInsights";

type AnalyticsTerritoryTabProps = {
  summary: RegistrationAnalyticsSummary;
  records: AnalyticsRegistrationRecord[];
};

/** Onglet Territoire : recrutement + géographie. */
export function AnalyticsTerritoryTab({ summary, records }: AnalyticsTerritoryTabProps) {
  const recruitmentInsights = buildNewcomerCityInsights(records);

  return (
    <Stack spacing={3}>
      <AnalyticsRecruitmentInsights insights={recruitmentInsights} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsBarChart
            title="Villes de résidence"
            data={topBucketToChartData(summary.city)}
            layout="horizontal"
            height={360}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsBarChart
            title="Codes postaux"
            data={topBucketToChartData(summary.postalCode)}
            layout="horizontal"
            height={360}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsGeoTable title="Détail par ville" bucket={summary.city} />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsGeoTable title="Détail par code postal" bucket={summary.postalCode} />
        </Grid>
      </Grid>
    </Stack>
  );
}
