"use client";

import { Stack, Typography } from "@mui/material";
import type { RegistrationStatus } from "@/lib/club-registration/registration-status";
import { buildRegistrationTimeline } from "@/lib/club-registration/analytics/registration-timeline";
import type {
  AnalyticsRegistrationRecord,
  OrganizationOpsTodo,
  RegistrationAnalyticsSummary,
} from "@/lib/club-registration/analytics/types";
import { AnalyticsCampaignHero } from "./AnalyticsCampaignHero";
import { AnalyticsOpsPulse } from "./AnalyticsOpsPulse";
import { AnalyticsRegistrationTimelineChart } from "./AnalyticsRegistrationTimelineChart";
import { AnalyticsStatusPipeline } from "./AnalyticsStatusPipeline";

type AnalyticsCampaignTabProps = {
  summary: RegistrationAnalyticsSummary;
  records: AnalyticsRegistrationRecord[];
  opsTodo: OrganizationOpsTodo;
  activeStatus: RegistrationStatus | "all";
  onSelectStatus: (status: RegistrationStatus | "all") => void;
};

/** Onglet Campagne : pulse saison + parcours + suivi secrétariat + rythme. */
export function AnalyticsCampaignTab({
  summary,
  records,
  opsTodo,
  activeStatus,
  onSelectStatus,
}: AnalyticsCampaignTabProps) {
  const timeline = buildRegistrationTimeline(records);

  return (
    <Stack spacing={3}>
      <AnalyticsCampaignHero summary={summary} />
      <AnalyticsStatusPipeline
        statusBucket={summary.status}
        activeStatus={activeStatus}
        onSelectStatus={onSelectStatus}
      />
      <Stack spacing={1}>
        <Typography variant="subtitle1">Suivi secrétariat</Typography>
        <Typography variant="body2" color="text.secondary">
          Files d’attente opérationnelles (détail dans Organisation).
        </Typography>
        <AnalyticsOpsPulse opsTodo={opsTodo} />
      </Stack>
      <AnalyticsRegistrationTimelineChart timeline={timeline} />
    </Stack>
  );
}
