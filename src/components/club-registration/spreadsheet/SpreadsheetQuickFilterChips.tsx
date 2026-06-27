"use client";

import { Box } from "@mui/material";
import type { PaymentStatusId } from "@/lib/club-registration/payment-constants";
import type { RegistrationStatus } from "@/lib/club-registration/registration-status";
import {
  SPREADSHEET_PAYMENT_STATUS_CHIP_OPTIONS,
  SPREADSHEET_REGISTRATION_STATUS_CHIP_OPTIONS,
  type SpreadsheetQuickFilters,
} from "@/lib/club-registration/spreadsheet/quick-filters";
import { FilterChipGroup } from "./SpreadsheetFilterChipGroup";

type Props = {
  quickFilters: SpreadsheetQuickFilters;
  onToggleRegistrationStatus: (status: RegistrationStatus) => void;
  onTogglePaymentStatus: (status: PaymentStatusId) => void;
};

export function SpreadsheetQuickFilterChips({
  quickFilters,
  onToggleRegistrationStatus,
  onTogglePaymentStatus,
}: Props) {
  return (
    <Box
      sx={{
        display: "grid",
        gridTemplateColumns: { xs: "1fr", sm: "1fr 1fr" },
        columnGap: { xs: 0, sm: 2.5, xl: 3 },
        rowGap: 1.25,
      }}
    >
      <FilterChipGroup
        title="Statut"
        options={SPREADSHEET_REGISTRATION_STATUS_CHIP_OPTIONS}
        activeValues={quickFilters.registrationStatuses}
        onToggle={onToggleRegistrationStatus}
      />
      <FilterChipGroup
        title="Paiement"
        options={SPREADSHEET_PAYMENT_STATUS_CHIP_OPTIONS}
        activeValues={quickFilters.paymentStatuses}
        onToggle={onTogglePaymentStatus}
      />
    </Box>
  );
}
