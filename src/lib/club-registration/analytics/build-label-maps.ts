import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import {
  buildAnalyticsAidLabels,
  buildAnalyticsCompetitionLabels,
  buildAnalyticsSlotLabels,
} from "./config-labels";

export type AnalyticsLabelMaps = {
  slotLabels: Record<string, string>;
  competitionLabels: Record<string, string>;
  aidLabels: Record<string, string>;
};

export function buildAnalyticsLabelMaps(config: RegistrationConfigV1): AnalyticsLabelMaps {
  return {
    slotLabels: buildAnalyticsSlotLabels(config),
    competitionLabels: buildAnalyticsCompetitionLabels(config),
    aidLabels: buildAnalyticsAidLabels(config),
  };
}
