"use client";

import { Alert, Button, Stack, Typography } from "@mui/material";
import Link from "next/link";
import CheckCircleOutlineIcon from "@mui/icons-material/CheckCircleOutline";

type Props = {
  processedCount: number;
  filterLabel: string;
  paymentRequestedCount: number;
  onShowPaymentRequested: () => void;
};

export function MembershipRequestsQueueComplete({
  processedCount,
  filterLabel,
  paymentRequestedCount,
  onShowPaymentRequested,
}: Props) {
  const paymentRequestedLabel =
    paymentRequestedCount > 0
      ? `Passer aux paiements demandés (${paymentRequestedCount})`
      : "Voir les paiements demandés";

  return (
    <Alert severity="success" icon={<CheckCircleOutlineIcon fontSize="inherit" />}>
      <Stack spacing={1.5}>
        <Typography variant="body1" fontWeight={600}>
          File « {filterLabel} » terminée
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {processedCount > 0
            ? `${processedCount} dossier${processedCount > 1 ? "s" : ""} traité${processedCount > 1 ? "s" : ""} dans cette session.`
            : "Aucun dossier ne correspond à vos critères pour le moment."}
        </Typography>
        {paymentRequestedCount > 0 ? (
          <Typography variant="body2" color="text.secondary">
            {paymentRequestedCount} dossier{paymentRequestedCount > 1 ? "s" : ""} en attente de
            règlement après votre passage.
          </Typography>
        ) : null}
        <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
          <Button size="small" variant="contained" onClick={onShowPaymentRequested}>
            {paymentRequestedLabel}
          </Button>
          <Button component={Link} href="/club/adhesions-tableau" size="small" variant="text">
            Ouvrir le tableau
          </Button>
        </Stack>
      </Stack>
    </Alert>
  );
}
