"use client";

import { Grid, Stack, Typography } from "@mui/material";
import { countBucketToChartData } from "@/lib/club-registration/analytics/aggregate";
import {
  CRITERIUM_FEDERAL_REGISTRATION_STATUS_LABELS,
} from "@/lib/club-registration/criterium-federal-follow-up";
import {
  JERSEY_FOLLOW_UP_STATUS_LABELS,
} from "@/lib/club-registration/jersey-follow-up";
import { MEDICAL_FOLLOW_UP_LABELS } from "@/lib/club-registration/medical-certificate";
import { PPS_FOLLOW_UP_STATUS_LABELS } from "@/lib/club-registration/pps-follow-up";
import {
  REGISTRATION_CERTIFICATE_FOLLOW_UP_STATUS_LABELS,
} from "@/lib/club-registration/registration-certificate-follow-up";
import type { OrganizationAnalyticsSummary } from "@/lib/club-registration/analytics/types";
import { AnalyticsBarChart } from "./AnalyticsBarChart";
import { AnalyticsPieChart } from "./AnalyticsPieChart";

type AnalyticsOrganizationTabProps = {
  organization: OrganizationAnalyticsSummary;
  slotLabels: Record<string, string>;
  competitionLabels: Record<string, string>;
};

function labelMapFromBucket(
  bucket: Record<string, number>,
  labels: Record<string, string>
): Record<string, string> {
  return Object.fromEntries(
    Object.keys(bucket).map((id) => [id, labels[id] ?? id])
  );
}

/** Créneaux, compétitions, écoles, suivis secrétariat. */
export function AnalyticsOrganizationTab({
  organization,
  slotLabels,
  competitionLabels,
}: AnalyticsOrganizationTabProps) {
  return (
    <Stack spacing={3}>
      <Typography variant="body2" color="text.secondary">
        Remplissage des créneaux, ramassages scolaires, compétitions et files d’attente
        secrétariat.
      </Typography>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12 }}>
          <AnalyticsBarChart
            title="Remplissage des créneaux"
            data={countBucketToChartData(
              organization.slots,
              labelMapFromBucket(organization.slots, slotLabels)
            )}
            layout="horizontal"
            height={Math.min(520, 120 + Object.keys(organization.slots).length * 28)}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsBarChart
            title="Ramassage scolaire"
            data={countBucketToChartData(
              organization.schoolPickupSlots,
              labelMapFromBucket(organization.schoolPickupSlots, slotLabels)
            )}
            layout="horizontal"
            height={280}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsBarChart
            title="Compétitions"
            data={countBucketToChartData(
              organization.competitions,
              labelMapFromBucket(organization.competitions, competitionLabels)
            )}
            layout="horizontal"
            height={280}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsPieChart
            title="Suivi médical"
            data={countBucketToChartData(organization.medicalFollowUp, {
              ...MEDICAL_FOLLOW_UP_LABELS,
            })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 6 }}>
          <AnalyticsPieChart
            title="PPS"
            data={countBucketToChartData(organization.ppsFollowUp, {
              ...PPS_FOLLOW_UP_STATUS_LABELS,
              unknown: "Non renseigné",
            })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <AnalyticsPieChart
            title="Maillots"
            data={countBucketToChartData(organization.jerseyFollowUp, {
              ...JERSEY_FOLLOW_UP_STATUS_LABELS,
              unknown: "Non renseigné",
            })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <AnalyticsPieChart
            title="Critérium fédéral"
            data={countBucketToChartData(organization.criteriumFollowUp, {
              ...CRITERIUM_FEDERAL_REGISTRATION_STATUS_LABELS,
              unknown: "Non renseigné",
            })}
          />
        </Grid>
        <Grid size={{ xs: 12, md: 4 }}>
          <AnalyticsPieChart
            title="Attestations"
            data={countBucketToChartData(organization.certificateFollowUp, {
              ...REGISTRATION_CERTIFICATE_FOLLOW_UP_STATUS_LABELS,
              unknown: "Non renseigné",
            })}
          />
        </Grid>
      </Grid>
    </Stack>
  );
}
