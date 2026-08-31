"use client";

import { Chip } from "@mui/material";
import {
  MEDICAL_CERTIFICATE_STATUS_LABELS,
  type MedicalCertificateStatus,
} from "@/lib/club-registration/medical-certificate";
import {
  PPS_FOLLOW_UP_STATUS_LABELS,
  type PpsFollowUpStatus,
} from "@/lib/club-registration/pps-follow-up";
import { CRITERIUM_FEDERAL_CARD_LABELS } from "@/lib/club-registration/criterium-federal-follow-up";
import {
  JERSEY_FOLLOW_UP_CARD_LABELS,
  type JerseyFollowUpStatus,
} from "@/lib/club-registration/jersey-follow-up";
import { REGISTRATION_CERTIFICATE_FOLLOW_UP_CARD_LABELS } from "@/lib/club-registration/registration-certificate-follow-up";
import {
  PAYMENT_SUPPLEMENT_CARD_LABEL,
  summaryHasPaymentSupplementDue,
} from "@/lib/club-registration/payment/supplement-managed-filter";
import type { RegistrationSummary } from "./types";

const MEDICAL_CERTIFICATE_STATUS_COLOR: Record<
  MedicalCertificateStatus,
  "default" | "info" | "warning" | "success"
> = {
  not_required: "default",
  required_not_received: "warning",
  received: "info",
  validated: "success",
};

type Props = {
  registration: RegistrationSummary;
};

function ppsChipColor(
  status: PpsFollowUpStatus
): "default" | "warning" | "success" {
  if (status === "ok") return "success";
  if (status === "checked_incomplete") return "warning";
  return "default";
}

function jerseyChipColor(
  status: Exclude<JerseyFollowUpStatus, "not_applicable">
): "warning" | "info" | "success" {
  if (status === "given") return "success";
  if (status === "prepared_awaiting_payment") return "info";
  return "warning";
}

export function MembershipRequestCardFollowUpChips({ registration }: Props) {
  const medicalStatus = registration.medicalCertificateStatus;
  const ppsStatus = registration.ppsFollowUpStatus;
  const criteriumStatus = registration.criteriumFederalRegistrationStatus;
  const jerseyStatus = registration.jerseyFollowUpStatus;
  const attestationStatus = registration.registrationCertificateFollowUpStatus;
  const supplementDue = summaryHasPaymentSupplementDue(
    registration as unknown as Record<string, unknown>
  );

  return (
    <>
      {supplementDue ? (
        <Chip size="small" variant="outlined" label={PAYMENT_SUPPLEMENT_CARD_LABEL} color="warning" />
      ) : null}
      {medicalStatus && medicalStatus !== "not_required" ? (
        <Chip
          size="small"
          variant="outlined"
          label={MEDICAL_CERTIFICATE_STATUS_LABELS[medicalStatus]}
          color={MEDICAL_CERTIFICATE_STATUS_COLOR[medicalStatus]}
        />
      ) : null}
      {ppsStatus && ppsStatus !== "not_applicable" ? (
        <Chip
          size="small"
          variant="outlined"
          label={PPS_FOLLOW_UP_STATUS_LABELS[ppsStatus]}
          color={ppsChipColor(ppsStatus)}
        />
      ) : null}
      {criteriumStatus === "to_do" || criteriumStatus === "validated" ? (
        <Chip
          size="small"
          variant="outlined"
          label={CRITERIUM_FEDERAL_CARD_LABELS[criteriumStatus]}
          color={criteriumStatus === "validated" ? "success" : "warning"}
        />
      ) : null}
      {jerseyStatus === "to_do" ||
      jerseyStatus === "prepared_awaiting_payment" ||
      jerseyStatus === "given" ? (
        <Chip
          size="small"
          variant="outlined"
          label={JERSEY_FOLLOW_UP_CARD_LABELS[jerseyStatus]}
          color={jerseyChipColor(jerseyStatus)}
        />
      ) : null}
      {attestationStatus === "to_do" || attestationStatus === "sent" ? (
        <Chip
          size="small"
          variant="outlined"
          label={REGISTRATION_CERTIFICATE_FOLLOW_UP_CARD_LABELS[attestationStatus]}
          color={attestationStatus === "sent" ? "success" : "warning"}
        />
      ) : null}
    </>
  );
}
