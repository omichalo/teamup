"use client";

import { Grid, Stack } from "@mui/material";
import {
  ANALYTICS_LABELS,
  ageBracketChartLabels,
  ageBracketChartOrder,
  countBucketToChartData,
  sectionLabel,
  topBucketToChartData,
} from "@/lib/club-registration/analytics/aggregate";
import { buildRegistrationTimeline } from "@/lib/club-registration/analytics/registration-timeline";
import type {
  AnalyticsRegistrationRecord,
  RegistrationAnalyticsSummary,
} from "@/lib/club-registration/analytics/types";
import { AnalyticsBarChart } from "./AnalyticsBarChart";
import { AnalyticsKpiCards } from "./AnalyticsKpiCards";
import { AnalyticsPieChart } from "./AnalyticsPieChart";
import { AnalyticsRegistrationTimelineChart } from "./AnalyticsRegistrationTimelineChart";

type AnalyticsOverviewTabProps = {
  summary: RegistrationAnalyticsSummary;
  sectionLabels: Record<string, string>;
  records: AnalyticsRegistrationRecord[];
};

export function AnalyticsOverviewTab({
  summary,
  sectionLabels,
  records,
}: AnalyticsOverviewTabProps) {
  const sectionData = countBucketToChartData(
    summary.mainSection,
    Object.fromEntries(
      Object.keys(summary.mainSection).map((id) => [id, sectionLabel(id, sectionLabels)])
    )
  );
  const timeline = buildRegistrationTimeline(records);

  return (
    <Stack spacing={3}>
      <AnalyticsKpiCards summary={summary} />
      <AnalyticsRegistrationTimelineChart timeline={timeline} />
      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsPieChart
            title="Répartition par sexe"
            data={countBucketToChartData(summary.sex, ANALYTICS_LABELS.sex, [
              "female",
              "male",
              "other",
              "unknown",
            ])}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsPieChart
            title="Nouveaux vs renouvellements"
            data={countBucketToChartData(summary.wasSqyMemberLastYear, ANALYTICS_LABELS.renewal, [
              "renewal",
              "new",
              "unknown",
            ])}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsBarChart
            title="Tranches d'âge"
            data={countBucketToChartData(
              summary.ageBrackets,
              ageBracketChartLabels(),
              ageBracketChartOrder()
            )}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsBarChart title="Sections principales" data={sectionData} layout="horizontal" />
        </Grid>
        <Grid size={{ xs: 12 }}>
          <AnalyticsBarChart
            title="Top villes de résidence"
            data={topBucketToChartData(summary.city)}
            layout="horizontal"
            height={320}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
