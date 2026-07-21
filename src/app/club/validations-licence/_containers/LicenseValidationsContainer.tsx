"use client";

import { useCallback, useState, type ReactNode } from "react";
import {
  Alert,
  Box,
  Button,
  Container,
  Grid,
  Paper,
  Tab,
  Tabs,
  Typography,
} from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import PaymentsOutlinedIcon from "@mui/icons-material/PaymentsOutlined";
import VerifiedUserOutlinedIcon from "@mui/icons-material/VerifiedUserOutlined";
import { PageHeader } from "@/components/ui";
import { LicenseValidationLicenseDetailPanel } from "@/components/license-validation/LicenseValidationLicenseDetailPanel";
import { LicenseValidationListPanel } from "@/components/license-validation/LicenseValidationListPanel";
import { LicenseValidationPaymentDetailPanel } from "@/components/license-validation/LicenseValidationPaymentDetailPanel";
import { LicenseValidationPaymentSearchPanel } from "@/components/license-validation/LicenseValidationPaymentSearchPanel";
import {
  LICENSE_VALIDATION_WORKSPACE_DESCRIPTIONS,
  LICENSE_VALIDATION_WORKSPACE_LABELS,
  type LicenseValidationWorkspace,
} from "@/components/license-validation/license-validation-workspace";
import { useLicenseValidations } from "@/components/license-validation/useLicenseValidations";

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
  return <Box sx={{ pt: 3 }}>{children}</Box>;
}

export function LicenseValidationsContainer() {
  const [workspace, setWorkspace] = useState<LicenseValidationWorkspace>("licenses");
  const [licenseSelectedId, setLicenseSelectedId] = useState<string | null>(null);
  const [paymentSelectedId, setPaymentSelectedId] = useState<string | null>(null);
  const {
    statusFilter,
    setStatusFilter,
    searchInput,
    setSearchInput,
    registrations,
    pageInfo,
    loadingList,
    loadingMore,
    error,
    reload,
    loadMore,
  } = useLicenseValidations("to_do");

  const handleLicenseSaved = useCallback(async () => {
    await reload();
  }, [reload]);

  const handlePaymentSaved = useCallback(async () => {
    await reload();
  }, [reload]);

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, md: 4 } }}>
      <PageHeader
        eyebrow="Secrétariat"
        title="Adhésions — licences et encaissements"
        subtitle="Deux espaces de travail distincts selon l'action à réaliser."
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

      <Paper sx={{ px: { xs: 1, sm: 2 }, pt: 1 }}>
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

        <Typography variant="body2" color="text.secondary" sx={{ px: 1, pb: 1 }}>
          {LICENSE_VALIDATION_WORKSPACE_DESCRIPTIONS[workspace]}
        </Typography>
      </Paper>

      {error && workspace === "licenses" ? (
        <Alert severity="error" sx={{ mt: 2 }}>
          {error}
        </Alert>
      ) : null}

      <WorkspaceTabPanel active={workspace} workspace="licenses">
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, lg: 4 }}>
            <Paper sx={{ p: 2, minHeight: 480 }}>
              <LicenseValidationListPanel
                registrations={registrations}
                selectedId={licenseSelectedId}
                statusFilter={statusFilter}
                searchInput={searchInput}
                loading={loadingList}
                loadingMore={loadingMore}
                hasNextPage={pageInfo.hasNextPage}
                onSelect={setLicenseSelectedId}
                onStatusFilterChange={setStatusFilter}
                onSearchInputChange={setSearchInput}
                onLoadMore={() => void loadMore()}
              />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, lg: 8 }}>
            <Paper sx={{ p: 2, minHeight: 480 }}>
              <LicenseValidationLicenseDetailPanel
                registrationId={licenseSelectedId}
                onSaved={handleLicenseSaved}
              />
            </Paper>
          </Grid>
        </Grid>
      </WorkspaceTabPanel>

      <WorkspaceTabPanel active={workspace} workspace="payments">
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 5, lg: 4 }}>
            <Paper sx={{ p: 2, minHeight: 480 }}>
              <LicenseValidationPaymentSearchPanel
                selectedId={paymentSelectedId}
                onSelectRegistration={setPaymentSelectedId}
              />
            </Paper>
          </Grid>
          <Grid size={{ xs: 12, md: 7, lg: 8 }}>
            <Paper sx={{ p: 2, minHeight: 480 }}>
              <LicenseValidationPaymentDetailPanel
                registrationId={paymentSelectedId}
                onSaved={handlePaymentSaved}
              />
            </Paper>
          </Grid>
        </Grid>
      </WorkspaceTabPanel>
    </Container>
  );
}
