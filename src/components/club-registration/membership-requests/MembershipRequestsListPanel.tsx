"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  InputAdornment,
  MenuItem,
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { Search as SearchIcon, Tune as TuneIcon } from "@mui/icons-material";
import {
  MANAGED_LIST_STATUS_FILTER_OPTIONS,
  REGISTRATION_STATUS_COLORS,
  REGISTRATION_STATUS_LABELS,
  type ManagedListStatusFilter,
  type RegistrationStatus,
} from "@/lib/club-registration/registration-status";
import {
  MANAGED_LIST_MEDICAL_CERTIFICATE_FILTER_OPTIONS,
  MEDICAL_CERTIFICATE_STATUS_LABELS,
  type ManagedListMedicalCertificateFilter,
  type MedicalCertificateStatus,
} from "@/lib/club-registration/medical-certificate";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import { PaymentSummaryCard } from "../secretariat/PaymentSummaryCard";
import type { ManagedRegistrationsPageInfo } from "./useManagedRegistrations";
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

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("fr-FR");
}

function statusChipProps(status: string | undefined): {
  label: string;
  color: "default" | "info" | "warning" | "success" | "error";
} {
  if (status && status in REGISTRATION_STATUS_LABELS) {
    const known = status as RegistrationStatus;
    return {
      label: REGISTRATION_STATUS_LABELS[known],
      color: REGISTRATION_STATUS_COLORS[known],
    };
  }
  return { label: "Statut inconnu", color: "default" };
}

type MembershipRequestsListPanelProps = {
  registrations: RegistrationSummary[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  statusFilter: ManagedListStatusFilter;
  onStatusFilterChange: (value: ManagedListStatusFilter) => void;
  medicalCertificateFilter: ManagedListMedicalCertificateFilter;
  onMedicalCertificateFilterChange: (value: ManagedListMedicalCertificateFilter) => void;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  pageInfo: ManagedRegistrationsPageInfo;
  loadingList: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
};

export function MembershipRequestsListPanel({
  registrations,
  selectedId,
  onSelect,
  statusFilter,
  onStatusFilterChange,
  medicalCertificateFilter,
  onMedicalCertificateFilterChange,
  searchInput,
  onSearchInputChange,
  pageInfo,
  loadingList,
  loadingMore,
  onLoadMore,
}: MembershipRequestsListPanelProps) {
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const activeTabIndex = MANAGED_LIST_STATUS_FILTER_OPTIONS.findIndex(
    (option) => option.value === statusFilter
  );
  const searchActive = searchInput.trim().length >= 2;
  const medicalFilterActive = medicalCertificateFilter !== "all";
  const showResultCount =
    searchActive || (medicalFilterActive && pageInfo.totalMatched != null);

  return (
    <Stack spacing={1.5}>
      <TextField
        size="small"
        fullWidth
        label="Rechercher"
        placeholder="Nom, prénom ou e-mail"
        value={searchInput}
        onChange={(event) => onSearchInputChange(event.target.value)}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
        helperText={
          showResultCount
            ? pageInfo.totalMatched != null
              ? `${pageInfo.totalMatched} résultat${pageInfo.totalMatched > 1 ? "s" : ""}`
              : "Filtrage en cours…"
            : searchActive
              ? "2 caractères minimum"
              : undefined
        }
      />
      <Box sx={{ display: "flex", justifyContent: "flex-start" }}>
        <Button
          size="small"
          variant={medicalFilterActive ? "contained" : "text"}
          startIcon={<TuneIcon fontSize="small" />}
          onClick={() => setShowAdvancedFilters((current) => !current)}
        >
          {medicalFilterActive ? "Filtre certificat actif" : "Filtres avancés"}
        </Button>
      </Box>
      {(showAdvancedFilters || medicalFilterActive) && (
        <TextField
          size="small"
          fullWidth
          select
          label="Certificat médical"
          value={medicalCertificateFilter}
          onChange={(event) =>
            onMedicalCertificateFilterChange(
              event.target.value as ManagedListMedicalCertificateFilter
            )
          }
        >
          {MANAGED_LIST_MEDICAL_CERTIFICATE_FILTER_OPTIONS.map((option) => (
            <MenuItem key={option.value} value={option.value}>
              {option.label}
            </MenuItem>
          ))}
        </TextField>
      )}

      <Tabs
        value={activeTabIndex >= 0 ? activeTabIndex : 0}
        onChange={(_event, index: number) => {
          const option = MANAGED_LIST_STATUS_FILTER_OPTIONS[index];
          if (option) {
            onStatusFilterChange(option.value);
          }
        }}
        variant="scrollable"
        scrollButtons="auto"
        allowScrollButtonsMobile
        sx={{
          minHeight: 40,
          "& .MuiTab-root": { minHeight: 40, py: 0.5, fontSize: "0.8rem" },
        }}
      >
        {MANAGED_LIST_STATUS_FILTER_OPTIONS.map((option) => (
          <Tab key={option.value} label={option.label} />
        ))}
      </Tabs>

      {loadingList ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <CircularProgress />
        </Box>
      ) : registrations.length === 0 ? (
        <Alert severity="info">
          {searchActive || medicalFilterActive
            ? "Aucun dossier ne correspond à vos critères."
            : "Aucune demande dans cette catégorie pour le moment."}
        </Alert>
      ) : (
        <>
          {registrations.map((registration) => {
            const active = registration.id === selectedId;
            const chip = statusChipProps(registration.status);
            return (
              <Card
                key={registration.id}
                variant={active ? "elevation" : "outlined"}
                sx={{
                  borderColor: active ? "primary.main" : undefined,
                  cursor: "pointer",
                }}
                onClick={() => onSelect(registration.id)}
              >
                <CardContent sx={{ pb: 1 }}>
                  <Stack spacing={1}>
                    <Stack direction="row" justifyContent="space-between" spacing={1}>
                      <Typography variant="subtitle1" fontWeight={700}>
                        {registration.firstName ?? "-"} {registration.lastName ?? ""}
                      </Typography>
                      <Chip size="small" label={chip.label} color={chip.color} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary">
                      {registration.submitterAccountEmail ?? "E-mail compte inconnu"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Envoyé le {formatDate(registration.submittedAt)}
                    </Typography>
                    {registration.medicalCertificateStatus &&
                    registration.medicalCertificateStatus !== "not_required" ? (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={
                          MEDICAL_CERTIFICATE_STATUS_LABELS[registration.medicalCertificateStatus]
                        }
                        color={
                          MEDICAL_CERTIFICATE_STATUS_COLOR[registration.medicalCertificateStatus]
                        }
                        sx={{ alignSelf: "flex-start" }}
                      />
                    ) : null}
                  </Stack>
                </CardContent>
                <CardActions
                  sx={{ px: 2, pt: 0, pb: 1.5, flexDirection: "column", alignItems: "stretch" }}
                >
                  <PaymentSummaryCard
                    payment={
                      registration.payment ??
                      normalizeRegistrationPayment(
                        registration as unknown as Record<string, unknown>
                      )
                    }
                  />
                </CardActions>
              </Card>
            );
          })}

          {pageInfo.hasNextPage ? (
            <Button
              variant="outlined"
              onClick={onLoadMore}
              disabled={loadingMore}
              startIcon={loadingMore ? <CircularProgress size={16} /> : undefined}
            >
              {loadingMore ? "Chargement…" : "Afficher plus"}
            </Button>
          ) : registrations.length > 0 ? (
            <Typography variant="caption" color="text.secondary" textAlign="center">
              Fin de la liste
            </Typography>
          ) : null}
        </>
      )}
    </Stack>
  );
}
