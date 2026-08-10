import { Chip, Stack } from "@mui/material";
import type { LicenseValidationListItem } from "@/lib/license-validation/map-registration";
import { LICENSE_VALIDATION_STATUS_LABELS } from "@/lib/license-validation/license-validation-status";
import { formatPaidLabel } from "@/components/license-validation/license-validation-labels";

type Props = {
  registration: LicenseValidationListItem;
};

function paymentChipColor(
  paymentStatus: LicenseValidationListItem["paymentStatus"]
): "success" | "warning" | "default" {
  if (paymentStatus === "paid") {
    return "success";
  }
  if (paymentStatus === "partially_paid") {
    return "warning";
  }
  return "default";
}

export function LicenseValidationLineSecondaryText({
  registration,
}: Props) {
  return (
    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap sx={{ mt: 0.5 }}>
      {registration.ffttLicense ? (
        <Chip size="small" variant="outlined" label={registration.ffttLicense} />
      ) : null}
      <Chip
        size="small"
        variant="outlined"
        label={LICENSE_VALIDATION_STATUS_LABELS[registration.licenseValidationStatus]}
      />
      <Chip
        size="small"
        variant="outlined"
        label={registration.wantsCompetitorExtras ? "Compétiteur" : "Loisir"}
      />
      <Chip
        size="small"
        variant="outlined"
        color={paymentChipColor(registration.paymentStatus)}
        label={formatPaidLabel(registration.paymentStatus)}
      />
    </Stack>
  );
}
