"use client";

import {
  REGISTRATION_CERTIFICATE_FOLLOW_UP_STATUS_LABELS,
  isRegistrationCertificateRequested,
  normalizeRegistrationCertificateFollowUpStatus,
  type RegistrationCertificateFollowUpStatus,
} from "@/lib/club-registration/registration-certificate-follow-up";
import { SecretariatFollowUpSelect } from "./SecretariatFollowUpSelect";

type Props = {
  requested: boolean;
  value: RegistrationCertificateFollowUpStatus;
  onChange: (value: RegistrationCertificateFollowUpStatus) => void;
};

const ACTIONABLE_OPTIONS = ["to_do", "sent"] as const;

export function RegistrationCertificateFollowUpField({
  requested,
  value,
  onChange,
}: Props) {
  const applicable = isRegistrationCertificateRequested(requested);
  const display = normalizeRegistrationCertificateFollowUpStatus(value, requested);

  return (
    <SecretariatFollowUpSelect
      label="Envoi de l’attestation"
      display={display}
      applicable={applicable}
      actionableOptions={ACTIONABLE_OPTIONS}
      labels={REGISTRATION_CERTIFICATE_FOLLOW_UP_STATUS_LABELS}
      notApplicableValue="not_applicable"
      onChange={onChange}
      enabledHelper="À saisir une fois l’attestation envoyée à l’adhérent."
      disabledHelper="S’active si une attestation d’inscription est demandée."
    />
  );
}
