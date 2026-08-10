"use client";

import {
  Box,
  Button,
  Chip,
  CircularProgress,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  LICENSE_VALIDATION_STATUS_LABELS,
  LICENSE_VALIDATION_STATUS_VALUES,
  type LicenseValidationListFilter,
} from "@/lib/license-validation/license-validation-status";
import {
  LICENSE_VALIDATION_PAYMENT_FILTER_LABELS,
  LICENSE_VALIDATION_PAYMENT_FILTER_VALUES,
  type LicenseValidationPaymentListFilter,
} from "@/lib/license-validation/payment-status-filter";
import type { LicenseValidationListItem } from "@/lib/license-validation/map-registration";
import { LicenseValidationLineSecondaryText } from "@/components/license-validation/LicenseValidationLineSecondaryText";

type Props = {
  registrations: LicenseValidationListItem[];
  selectedId: string | null;
  statusFilter: LicenseValidationListFilter;
  paymentStatusFilter: LicenseValidationPaymentListFilter;
  searchInput: string;
  loading: boolean;
  loadingMore: boolean;
  hasNextPage: boolean;
  onSelect: (id: string) => void;
  onStatusFilterChange: (filter: LicenseValidationListFilter) => void;
  onPaymentStatusFilterChange: (filter: LicenseValidationPaymentListFilter) => void;
  onSearchInputChange: (value: string) => void;
  onLoadMore: () => void;
};

export function LicenseValidationListPanel({
  registrations,
  selectedId,
  statusFilter,
  paymentStatusFilter,
  searchInput,
  loading,
  loadingMore,
  hasNextPage,
  onSelect,
  onStatusFilterChange,
  onPaymentStatusFilterChange,
  onSearchInputChange,
  onLoadMore,
}: Props) {
  return (
    <Stack spacing={2}>
      <TextField
        label="Rechercher (nom, e-mail, licence)"
        value={searchInput}
        onChange={(e) => onSearchInputChange(e.target.value)}
        size="small"
        fullWidth
      />

      <Stack spacing={0.75}>
        <Typography variant="caption" color="text.secondary">
          Licence
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Chip
            label="Tous"
            clickable
            color={statusFilter === "all" ? "primary" : "default"}
            onClick={() => onStatusFilterChange("all")}
          />
          {LICENSE_VALIDATION_STATUS_VALUES.map((status) => (
            <Chip
              key={status}
              label={LICENSE_VALIDATION_STATUS_LABELS[status]}
              clickable
              color={statusFilter === status ? "primary" : "default"}
              onClick={() => onStatusFilterChange(status)}
            />
          ))}
        </Stack>
      </Stack>

      <Stack spacing={0.75}>
        <Typography variant="caption" color="text.secondary">
          Paiement
        </Typography>
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          {LICENSE_VALIDATION_PAYMENT_FILTER_VALUES.map((filter) => (
            <Chip
              key={filter}
              label={LICENSE_VALIDATION_PAYMENT_FILTER_LABELS[filter]}
              clickable
              color={paymentStatusFilter === filter ? "primary" : "default"}
              onClick={() => onPaymentStatusFilterChange(filter)}
            />
          ))}
        </Stack>
      </Stack>

      {loading ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
          <CircularProgress size={28} />
        </Box>
      ) : registrations.length === 0 ? (
        <Typography color="text.secondary">Aucun dossier trouvé.</Typography>
      ) : (
        <Stack spacing={0.5}>
          {registrations.map((registration) => {
            const name = [registration.firstName, registration.lastName]
              .filter(Boolean)
              .join(" ");
            const selected = registration.id === selectedId;
            return (
              <Box
                key={registration.id}
                component="button"
                type="button"
                onClick={() => onSelect(registration.id)}
                sx={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  border: 1,
                  borderColor: selected ? "primary.main" : "divider",
                  bgcolor: selected ? "action.selected" : "transparent",
                  borderRadius: 1.5,
                  px: 1.5,
                  py: 1.25,
                  cursor: "pointer",
                  font: "inherit",
                  color: "inherit",
                  "&:hover": {
                    borderColor: "primary.light",
                    bgcolor: selected ? "action.selected" : "action.hover",
                  },
                }}
              >
                <Typography
                  variant="subtitle2"
                  fontWeight={700}
                  color={selected ? "primary.main" : "text.primary"}
                >
                  {name || "Adhérent"}
                </Typography>
                <LicenseValidationLineSecondaryText registration={registration} />
              </Box>
            );
          })}
        </Stack>
      )}

      {hasNextPage ? (
        <Button onClick={() => void onLoadMore()} disabled={loadingMore} variant="outlined">
          {loadingMore ? "Chargement…" : "Charger plus"}
        </Button>
      ) : null}
    </Stack>
  );
}
