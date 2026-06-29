"use client";

import { Alert, Box, Card, CardContent, CircularProgress, Stack, Typography } from "@mui/material";
import { MembershipRequestDetailFormPrimary } from "./MembershipRequestDetailFormPrimary";
import { MembershipRequestDetailFormSecondary } from "./MembershipRequestDetailFormSecondary";
import type { MembershipListReloadFn, RegistrationSummary } from "./types";
import { useMembershipRequestDetail } from "./useMembershipRequestDetail";
import { MembershipRequestQueueBar } from "./MembershipRequestQueueBar";

type Props = {
  registrationId: string | null;
  statusSummary?: RegistrationSummary | null | undefined;
  onListReload?: MembershipListReloadFn | undefined;
  onDeleted?: (() => void | Promise<void>) | undefined;
  emptyMessage?: string;
  embedded?: boolean;
  showAlerts?: boolean;
  queuePosition?: number;
  queueTotal?: number;
  queueRemaining?: number;
  queueFilterLabel?: string;
  canGoPrevious?: boolean;
  canGoNext?: boolean;
  spreadsheetHref?: string | null;
  onQueuePrevious?: () => void;
  onQueueNext?: () => void;
};

export function MembershipRequestDetailPanel({
  registrationId,
  statusSummary,
  onListReload,
  onDeleted,
  emptyMessage = "Sélectionnez une demande pour la relire.",
  embedded = true,
  showAlerts = false,
  queuePosition = 0,
  queueTotal = 0,
  queueRemaining = 0,
  queueFilterLabel = "File courante",
  canGoPrevious = false,
  canGoNext = false,
  spreadsheetHref = null,
  onQueuePrevious,
  onQueueNext,
}: Props) {
  const detail = useMembershipRequestDetail(registrationId, { statusSummary, onListReload });
  const { loadingDetail, selected, form, error, success, setError, setSuccess } = detail;

  const showQueueBar =
    queueTotal > 0 && onQueuePrevious != null && onQueueNext != null;

  const formContent = loadingDetail ? (
    <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
      <CircularProgress />
    </Box>
  ) : !selected || !form ? (
    <Typography color="text.secondary">{emptyMessage}</Typography>
  ) : (
    <Stack spacing={3}>
      <MembershipRequestDetailFormPrimary detail={detail} hideTitleHeader={showQueueBar} />
      <MembershipRequestDetailFormSecondary
        detail={detail}
        onListReload={onListReload}
        onDeleted={onDeleted}
      />
    </Stack>
  );

  const alerts = showAlerts ? (
    <>
      {error ? (
        <Alert severity="error" onClose={() => setError(null)}>
          {error}
        </Alert>
      ) : null}
      {success ? (
        <Alert severity="success" onClose={() => setSuccess(null)}>
          {success}
        </Alert>
      ) : null}
    </>
  ) : null;

  const queueHeader = showQueueBar ? (
    <Box
      sx={{
        position: "sticky",
        top: 0,
        zIndex: 2,
        bgcolor: "background.paper",
        px: 1.5,
        pt: 1.25,
        pb: 1,
        borderBottom: "1px solid",
        borderColor: "divider",
      }}
    >
      <MembershipRequestQueueBar
        position={queuePosition}
        total={queueTotal}
        remaining={queueRemaining}
        filterLabel={queueFilterLabel}
        canGoPrevious={canGoPrevious}
        canGoNext={canGoNext}
        spreadsheetHref={spreadsheetHref}
        onPrevious={onQueuePrevious}
        onNext={onQueueNext}
      />
    </Box>
  ) : null;

  if (!embedded) {
    return (
      <>
        {alerts ? <Box sx={{ mb: 2 }}>{alerts}</Box> : null}
        {queueHeader}
        {formContent}
      </>
    );
  }

  return (
    <Card
      variant="outlined"
      sx={{
        display: "flex",
        flexDirection: "column",
        width: "100%",
        minWidth: 0,
        maxHeight: { md: "calc(100vh - 188px)" },
        minHeight: { md: 480 },
      }}
    >
      <CardContent
        sx={{
          display: "flex",
          flexDirection: "column",
          flex: 1,
          minHeight: 0,
          p: 0,
          "&:last-child": { pb: 0 },
        }}
      >
        {alerts ? <Box sx={{ px: 2, pt: 2, flexShrink: 0 }}>{alerts}</Box> : null}
        {queueHeader}
        <Box
          sx={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            px: 2,
            py: 2,
          }}
        >
          {formContent}
        </Box>
      </CardContent>
    </Card>
  );
}
