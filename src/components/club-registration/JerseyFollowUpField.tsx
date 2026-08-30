"use client";

import {
  JERSEY_FOLLOW_UP_STATUS_LABELS,
  isJerseyRequested,
  normalizeJerseyFollowUpStatus,
  type JerseyFollowUpStatus,
} from "@/lib/club-registration/jersey-follow-up";
import { SecretariatFollowUpSelect } from "./SecretariatFollowUpSelect";

type Props = {
  wantsCompetitorExtras: boolean;
  wantsOptionalJersey: boolean;
  value: JerseyFollowUpStatus;
  onChange: (value: JerseyFollowUpStatus) => void;
};

const ACTIONABLE_OPTIONS = ["to_do", "prepared_awaiting_payment", "given"] as const;

export function JerseyFollowUpField({
  wantsCompetitorExtras,
  wantsOptionalJersey,
  value,
  onChange,
}: Props) {
  const applicable = isJerseyRequested(wantsCompetitorExtras, wantsOptionalJersey);
  const display = normalizeJerseyFollowUpStatus(
    value,
    wantsCompetitorExtras,
    wantsOptionalJersey
  );

  return (
    <SecretariatFollowUpSelect
      label="Remise du maillot"
      display={display}
      applicable={applicable}
      actionableOptions={ACTIONABLE_OPTIONS}
      labels={JERSEY_FOLLOW_UP_STATUS_LABELS}
      notApplicableValue="not_applicable"
      onChange={onChange}
      enabledHelper="À mettre à jour selon la préparation et la remise du maillot."
      disabledHelper="S’active si un maillot compétiteur ou optionnel est commandé."
    />
  );
}
