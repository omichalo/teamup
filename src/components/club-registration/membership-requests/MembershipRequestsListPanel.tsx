"use client";

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
  Stack,
  Tab,
  Tabs,
  TextField,
  Typography,
} from "@mui/material";
import { Search as SearchIcon } from "@mui/icons-material";
import {
  MANAGED_LIST_STATUS_FILTER_OPTIONS,
  REGISTRATION_STATUS_COLORS,
  REGISTRATION_STATUS_LABELS,
  type ManagedListStatusFilter,
  type RegistrationStatus,
} from "@/lib/club-registration/registration-status";
import type { ManagedListMedicalCertificateFilter } from "@/lib/club-registration/medical-certificate";
import type { ManagedListPpsFollowUpFilter } from "@/lib/club-registration/pps-follow-up";
import type { ManagedListAidReceiptFilter } from "@/lib/club-registration/payment/aid-receipt";
import type { ManagedListCriteriumFederalFilter } from "@/lib/club-registration/criterium-federal-follow-up";
import type { ManagedListJerseyFollowUpFilter } from "@/lib/club-registration/jersey-follow-up";
import type { ManagedListRegistrationCertificateFollowUpFilter } from "@/lib/club-registration/registration-certificate-follow-up";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import { PaymentSummaryCard } from "../secretariat/PaymentSummaryCard";
import { ManagedListFollowUpFilters } from "./ManagedListFollowUpFilters";
import { ManagedListSavedViewsBar } from "./ManagedListSavedViewsBar";
import { MembershipRequestCardFollowUpChips } from "./MembershipRequestCardFollowUpChips";
import { MembershipRequestCardQuickActions } from "./MembershipRequestCardQuickActions";
import type { ManagedRegistrationsPageInfo } from "./useManagedRegistrations";
import type { MembershipListReloadFn, RegistrationSummary } from "./types";
import type { SpreadsheetSavedViewId } from "@/lib/club-registration/spreadsheet/quick-filters";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";

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
  ppsFollowUpFilter: ManagedListPpsFollowUpFilter;
  onPpsFollowUpFilterChange: (value: ManagedListPpsFollowUpFilter) => void;
  criteriumFederalFilter: ManagedListCriteriumFederalFilter;
  onCriteriumFederalFilterChange: (value: ManagedListCriteriumFederalFilter) => void;
  jerseyFollowUpFilter: ManagedListJerseyFollowUpFilter;
  onJerseyFollowUpFilterChange: (value: ManagedListJerseyFollowUpFilter) => void;
  registrationCertificateFollowUpFilter: ManagedListRegistrationCertificateFollowUpFilter;
  onRegistrationCertificateFollowUpFilterChange: (
    value: ManagedListRegistrationCertificateFollowUpFilter
  ) => void;
  aidReceiptFilter: ManagedListAidReceiptFilter;
  searchInput: string;
  onSearchInputChange: (value: string) => void;
  pageInfo: ManagedRegistrationsPageInfo;
  loadingList: boolean;
  loadingMore: boolean;
  onLoadMore: () => void;
  searchInputRef?: React.RefObject<HTMLInputElement | null>;
  sessionViewedIds?: ReadonlySet<string>;
  actionableCount?: number | null;
  onListReload?: MembershipListReloadFn;
  activeViewId?: SpreadsheetSavedViewId | null;
  onSelectSavedView?: (viewId: SpreadsheetSavedViewId) => void;
};

export function MembershipRequestsListPanel({
  registrations,
  selectedId,
  onSelect,
  statusFilter,
  onStatusFilterChange,
  medicalCertificateFilter,
  onMedicalCertificateFilterChange,
  ppsFollowUpFilter,
  onPpsFollowUpFilterChange,
  criteriumFederalFilter,
  onCriteriumFederalFilterChange,
  jerseyFollowUpFilter,
  onJerseyFollowUpFilterChange,
  registrationCertificateFollowUpFilter,
  onRegistrationCertificateFollowUpFilterChange,
  aidReceiptFilter,
  searchInput,
  onSearchInputChange,
  pageInfo,
  loadingList,
  loadingMore,
  onLoadMore,
  searchInputRef,
  sessionViewedIds,
  actionableCount,
  onListReload,
  activeViewId = null,
  onSelectSavedView,
}: MembershipRequestsListPanelProps) {
  const searchActive = searchInput.trim().length >= 2;
  const medicalFilterActive = medicalCertificateFilter !== "all";
  const ppsFilterActive = ppsFollowUpFilter !== "all";
  const criteriumFilterActive = criteriumFederalFilter !== "all";
  const jerseyFilterActive = jerseyFollowUpFilter !== "all";
  const attestationFilterActive = registrationCertificateFollowUpFilter !== "all";
  const aidFilterActive = aidReceiptFilter !== "all";
  const showResultCount =
    searchActive ||
    ((medicalFilterActive ||
      ppsFilterActive ||
      criteriumFilterActive ||
      jerseyFilterActive ||
      attestationFilterActive ||
      aidFilterActive) &&
      pageInfo.totalMatched != null);
  const hasActiveSelection = selectedId != null;
  const activeTabIndex = MANAGED_LIST_STATUS_FILTER_OPTIONS.findIndex(
    (option) => option.value === statusFilter
  );

  return (
    <Stack
      spacing={1.5}
      sx={{
        width: "100%",
        minWidth: 0,
        height: { md: "calc(100vh - 188px)" },
        minHeight: { md: 480 },
      }}
    >
      <Stack spacing={1.25} sx={{ flexShrink: 0 }}>
      <TextField
        size="small"
        fullWidth
        label="Rechercher"
        placeholder="Nom, prénom ou e-mail"
        value={searchInput}
        onChange={(event) => onSearchInputChange(event.target.value)}
        {...(searchInputRef ? { inputRef: searchInputRef } : {})}
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
        sx={{
          "& .MuiFormHelperText-root": {
            mt: 0.75,
            minHeight: "1.25em",
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
      {onSelectSavedView ? (
        <ManagedListSavedViewsBar
          activeViewId={activeViewId}
          onSelectView={onSelectSavedView}
        />
      ) : null}
      <ManagedListFollowUpFilters
        medicalCertificateFilter={medicalCertificateFilter}
        onMedicalCertificateFilterChange={onMedicalCertificateFilterChange}
        ppsFollowUpFilter={ppsFollowUpFilter}
        onPpsFollowUpFilterChange={onPpsFollowUpFilterChange}
        criteriumFederalFilter={criteriumFederalFilter}
        onCriteriumFederalFilterChange={onCriteriumFederalFilterChange}
        jerseyFollowUpFilter={jerseyFollowUpFilter}
        onJerseyFollowUpFilterChange={onJerseyFollowUpFilterChange}
        registrationCertificateFollowUpFilter={registrationCertificateFollowUpFilter}
        onRegistrationCertificateFollowUpFilterChange={
          onRegistrationCertificateFollowUpFilterChange
        }
      />

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
          "& .MuiTab-root": { minHeight: 40, py: 0.5, fontSize: "0.78rem", px: 1.25 },
        }}
      >
        {MANAGED_LIST_STATUS_FILTER_OPTIONS.map((option) => {
          const tabLabel =
            option.value === "actionable" &&
            actionableCount != null &&
            actionableCount > 0
              ? `${option.label} (${actionableCount})`
              : option.label;
          return <Tab key={option.value} label={tabLabel} />;
        })}
      </Tabs>
      </Stack>

      <Box sx={{ flex: 1, minHeight: 0, minWidth: 0, overflowY: "auto", pr: 0.75, pt: 1 }}>
      {loadingList ? (
        <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
          <CircularProgress />
        </Box>
      ) : registrations.length === 0 ? (
        <Alert severity="info">
          {searchActive ||
          medicalFilterActive ||
          ppsFilterActive ||
          criteriumFilterActive ||
          jerseyFilterActive ||
          attestationFilterActive
            ? "Aucun dossier ne correspond à vos critères."
            : "Aucune demande dans cette catégorie pour le moment."}
        </Alert>
      ) : (
        <>
          <Stack spacing={1.5}>
          {registrations.map((registration) => {
            const active = registration.id === selectedId;
            const viewed = sessionViewedIds?.has(registration.id) && !active;
            const chip = statusChipProps(registration.status);
            return (
              <Card
                key={registration.id}
                data-registration-id={registration.id}
                variant="outlined"
                aria-selected={active}
                onClick={() => onSelect(registration.id)}
                sx={{
                  cursor: "pointer",
                  position: "relative",
                  overflow: "hidden",
                  width: "100%",
                  transition:
                    "border-color 0.15s ease, background-color 0.15s ease, opacity 0.15s ease",
                  ...(active
                    ? {
                        borderWidth: 2,
                        borderColor: "primary.main",
                        bgcolor: "primary.50",
                        opacity: 1,
                        zIndex: 1,
                        "&::before": {
                          content: '""',
                          position: "absolute",
                          left: 0,
                          top: 0,
                          bottom: 0,
                          width: 4,
                          bgcolor: "primary.main",
                        },
                      }
                    : {
                        borderColor: "divider",
                        bgcolor: viewed ? "grey.50" : "background.paper",
                        opacity: hasActiveSelection ? 0.72 : 1,
                        "&:hover": {
                          borderColor: "primary.light",
                          opacity: 1,
                        },
                      }),
                }}
              >
                <CardContent sx={{ pb: 1, pl: active ? 2.5 : 2, pr: 2 }}>
                  <Stack spacing={1}>
                    <Typography
                      variant="subtitle1"
                      fontWeight={700}
                      color={active ? "primary.main" : "text.primary"}
                      sx={{ wordBreak: "break-word" }}
                    >
                      {formatPersonDisplayName(registration.firstName, registration.lastName) ||
                        "-"}
                    </Typography>
                    <Stack direction="row" spacing={0.5} flexWrap="wrap" useFlexGap>
                      <Chip size="small" label={chip.label} color={chip.color} />
                      <MembershipRequestCardFollowUpChips registration={registration} />
                    </Stack>
                    <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-all" }}>
                      {registration.submitterAccountEmail ?? "E-mail compte inconnu"}
                    </Typography>
                    <Typography variant="caption" color="text.secondary">
                      Envoyé le {formatDate(registration.submittedAt)}
                    </Typography>
                  </Stack>
                </CardContent>
                <CardActions
                  sx={{ px: 2, pt: 0, pb: 1.5, flexDirection: "column", alignItems: "stretch", gap: 1 }}
                >
                  <PaymentSummaryCard
                    payment={
                      registration.payment ??
                      normalizeRegistrationPayment(
                        registration as unknown as Record<string, unknown>
                      )
                    }
                  />
                  <MembershipRequestCardQuickActions
                    registration={registration}
                    onListReload={onListReload}
                  />
                </CardActions>
              </Card>
            );
          })}
          </Stack>

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
      </Box>
    </Stack>
  );
}
