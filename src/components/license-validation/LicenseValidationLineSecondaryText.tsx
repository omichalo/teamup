import type { LicenseValidationListItem } from "@/lib/license-validation/map-registration";
import { LICENSE_VALIDATION_STATUS_LABELS } from "@/lib/license-validation/license-validation-status";
import {
  formatCompetitorLabel,
  formatPaidLabel,
} from "@/components/license-validation/license-validation-labels";

type Props = {
  registration: LicenseValidationListItem;
};

export function LicenseValidationLineSecondaryText({
  registration,
}: Props) {
  return (
    <>
      <strong>Licence</strong>:{" "}
      {registration.ffttLicense ? `${registration.ffttLicense} — ` : ""}
      {LICENSE_VALIDATION_STATUS_LABELS[registration.licenseValidationStatus]}
      {" · "}
      <strong>Compétiteur</strong>:{" "}
      {formatCompetitorLabel(registration.wantsCompetitorExtras)}
      {" · "}
      <strong>Paiement</strong>: {formatPaidLabel(registration.paymentStatus)}
    </>
  );
}

