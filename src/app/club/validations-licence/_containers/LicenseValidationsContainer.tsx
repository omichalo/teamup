"use client";

import { useCallback, useState, type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Paper,
  Tab,
  Tabs,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import { PageHeader } from "@/components/ui";
import type { LicenseValidationListItem } from "@/lib/license-validation/map-registration";
import { LicenseValidationLicenseDetailPanel } from "@/components/license-validation/LicenseValidationLicenseDetailPanel";
import { LicenseValidationListPanel } from "@/components/license-validation/LicenseValidationListPanel";
import { LicenseValidationPaymentDetailPanel } from "@/components/license-validation/LicenseValidationPaymentDetailPanel";
import { LicenseValidationPaymentSearchPanel } from "@/components/license-validation/LicenseValidationPaymentSearchPanel";
import {
  LICENSE_VALIDATION_WORKSPACE_LABELS,
  type LicenseValidationWorkspace,
} from "@/components/license-validation/license-validation-workspace";
import { useLicenseValidations } from "@/components/license-validation/useLicenseValidations";

/** Hauteur AppBar Layout (Toolbar MUI standard). */
const APP_BAR_OFFSET_PX = 64;

const workspaceShellSx = {
  display: { xs: "flex", lg: "grid" },
  flexDirection: { xs: "column" },
  gridTemplateColumns: { lg: "minmax(300px, 380px) minmax(0, 1fr)" },
  gridTemplateRows: { lg: "minmax(0, 1fr)" },
  alignItems: "stretch",
  border: 1,
  borderColor: "divider",
  borderRadius: 2,
  overflow: "hidden",
  bgcolor: "background.paper",
  minHeight: { xs: 420, lg: 0 },
  flex: { lg: 1 },
  height: { lg: "100%" },
  minWidth: 0,
} as const;

const columnSx = {
  minHeight: 0,
  minWidth: 0,
  height: { lg: "100%" },
  overflowY: "auto",
  overscrollBehavior: "contain",
  p: 2,
} as const;

function WorkspaceTabPanel({
  active,
  workspace,
  children,
}: {
  active: LicenseValidationWorkspace;
  workspace: LicenseValidationWorkspace;
  children: ReactNode;
}) {
  if (active !== workspace) {
    return null;
  }
  return (
    <Box
      sx={{
        pt: 2,
        flex: { lg: 1 },
        minHeight: { lg: 0 },
        display: { lg: "flex" },
        flexDirection: { lg: "column" },
      }}
    >
      {children}
    </Box>
  );
}

export function LicenseValidationsContainer() {
  const [workspace, setWorkspace] = useState<LicenseValidationWorkspace>("licenses");
  const [licenseSelectedId, setLicenseSelectedId] = useState<string | null>(null);
  const [paymentSelectedId, setPaymentSelectedId] = useState<string | null>(null);
  const {
    statusFilter,
    setStatusFilter,
    paymentStatusFilter,
    setPaymentStatusFilter,
    searchInput,
    setSearchInput,
    registrations,
    pageInfo,
    loadingList,
    loadingMore,
    error,
    reload,
    applyRegistrationUpdate,
    loadMore,
  } = useLicenseValidations("to_do");

  const handleLicenseSaved = useCallback(
    (registration: LicenseValidationListItem) => {
      applyRegistrationUpdate(registration);
    },
    [applyRegistrationUpdate]
  );

  const handlePaymentSaved = useCallback(async () => {
    await reload({ silent: true });
  }, [reload]);

  return (
    <Container
      maxWidth="xl"
      sx={{
        py: { xs: 3, md: 4 },
        display: { lg: "flex" },
        flexDirection: { lg: "column" },
        height: { lg: `calc(100dvh - ${APP_BAR_OFFSET_PX}px)` },
        maxHeight: { lg: `calc(100dvh - ${APP_BAR_OFFSET_PX}px)` },
        boxSizing: "border-box",
        overflow: { lg: "hidden" },
      }}
    >
      <Box sx={{ flexShrink: 0 }}>
        <PageHeader
          eyebrow="Secrétariat"
          title="Adhésions — licences et encaissements"
          actions={
            workspace === "licenses" ? (
              <Button
                startIcon={<RefreshIcon />}
                onClick={() => void reload()}
                disabled={loadingList}
              >
                Actualiser
              </Button>
            ) : null
          }
          marginBottom={2}
        />

        <Paper sx={{ px: { xs: 1, sm: 2 }, pt: 1, pb: 1 }}>
          <Tabs
            value={workspace}
            onChange={(_event, value: LicenseValidationWorkspace) => setWorkspace(value)}
            variant="fullWidth"
            aria-label="Espaces licences et encaissements"
          >
            <Tab
              value="licenses"
              icon={<VerifiedUserOutlinedIcon />}
              iconPosition="start"
              label={LICENSE_VALIDATION_WORKSPACE_LABELS.licenses}
            />
            <Tab
              value="payments"
              icon={<PaymentsOutlinedIcon />}
              iconPosition="start"
              label={LICENSE_VALIDATION_WORKSPACE_LABELS.payments}
            />
          </Tabs>
        </Paper>

        {error && workspace === "licenses" ? (
          <Alert severity="error" sx={{ mt: 2 }}>
            {error}
          </Alert>
        ) : null}
      </Box>

      <WorkspaceTabPanel active={workspace} workspace="licenses">
        <Box sx={workspaceShellSx}>
          <Box
            sx={{
              ...columnSx,
              borderBottom: { xs: 1, lg: 0 },
              borderRight: { lg: 1 },
              borderColor: "divider",
              maxHeight: { xs: 420, lg: "none" },
            }}
          >
            <LicenseValidationListPanel
              registrations={registrations}
              selectedId={licenseSelectedId}
              statusFilter={statusFilter}
              paymentStatusFilter={paymentStatusFilter}
              searchInput={searchInput}
              loading={loadingList}
              loadingMore={loadingMore}
              hasNextPage={pageInfo.hasNextPage}
              onSelect={setLicenseSelectedId}
              onStatusFilterChange={setStatusFilter}
              onPaymentStatusFilterChange={setPaymentStatusFilter}
              onSearchInputChange={setSearchInput}
              onLoadMore={() => void loadMore()}
            />
          </Box>
          <Box sx={columnSx}>
            <LicenseValidationLicenseDetailPanel
              registrationId={licenseSelectedId}
              onSaved={handleLicenseSaved}
            />
          </Box>
        </Box>
      </WorkspaceTabPanel>

      <WorkspaceTabPanel active={workspace} workspace="payments">
        <Box sx={workspaceShellSx}>
          <Box
            sx={{
              ...columnSx,
              borderBottom: { xs: 1, lg: 0 },
              borderRight: { lg: 1 },
              borderColor: "divider",
              maxHeight: { xs: 420, lg: "none" },
            }}
          >
            <LicenseValidationPaymentSearchPanel
              selectedId={paymentSelectedId}
              onSelectRegistration={setPaymentSelectedId}
            />
          </Box>
          <Box sx={columnSx}>
            <LicenseValidationPaymentDetailPanel
              registrationId={paymentSelectedId}
              onSaved={handlePaymentSaved}
            />
          </Box>
        </Box>
      </WorkspaceTabPanel>
    </Container>
  );
}
