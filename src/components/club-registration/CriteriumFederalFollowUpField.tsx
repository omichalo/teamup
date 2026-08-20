"use client";

import {
  CRITERIUM_FEDERAL_REGISTRATION_STATUS_LABELS,
  hasCriteriumFederalSelection,
  normalizeCriteriumFederalRegistrationStatus,
  type CriteriumFederalRegistrationStatus,
} from "@/lib/club-registration/criterium-federal-follow-up";
import { SecretariatFollowUpSelect } from "./SecretariatFollowUpSelect";

type Props = {
  competitionIds: string[];
  value: CriteriumFederalRegistrationStatus;
  onChange: (value: CriteriumFederalRegistrationStatus) => void;
};

const ACTIONABLE_OPTIONS = ["to_do", "validated"] as const;

export function CriteriumFederalFollowUpField({
  competitionIds,
  value,
  onChange,
}: Props) {
  const applicable = hasCriteriumFederalSelection(competitionIds);
  const display = normalizeCriteriumFederalRegistrationStatus(value, competitionIds);

  return (
    <SecretariatFollowUpSelect
      label="Inscription Critérium fédéral"
      display={display}
      applicable={applicable}
      actionableOptions={ACTIONABLE_OPTIONS}
      labels={CRITERIUM_FEDERAL_REGISTRATION_STATUS_LABELS}
      notApplicableValue="not_applicable"
      onChange={onChange}
      enabledHelper="À saisir une fois l’inscription faite sur l’espace FFTT."
      disabledHelper="S’active si Critérium fédéral jeunes ou seniors est coché."
    />
  );
}
