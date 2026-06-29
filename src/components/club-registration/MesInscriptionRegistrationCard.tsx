"use client";

import { forwardRef } from "react";
import {
  Button,
  Card,
  CardActions,
  CardContent,
  Chip,
  CircularProgress,
  Stack,
  Typography,
  Box,
} from "@mui/material";
import DownloadIcon from "@mui/icons-material/Download";
import { formatPersonDisplayName } from "@/lib/shared/person-name-format";
import { MEDICAL_CERTIFICATE_STATUS_LABELS } from "@/lib/club-registration/medical-certificate";
import { MesInscriptionPayOnlineButton } from "@/components/club-registration/MesInscriptionPayOnlineButton";
import {
  findMesInscriptionSectionLabel,
  formatMesInscriptionAmount,
  formatMesInscriptionDate,
  isMesInscriptionPaid,
  MES_INSCRIPTION_MEDICAL_COLOR,
  MES_INSCRIPTION_ROLE_LABEL,
  MES_INSCRIPTION_STATUS_COLOR,
  MES_INSCRIPTION_STATUS_LABEL,
  type MesInscriptionSummary,
} from "@/components/club-registration/mes-inscriptions-shared";

type Props = {
  registration: MesInscriptionSummary;
  highlighted?: boolean;
  invoiceLoadingId: string | null;
  onOpenInvoice: (registrationId: string) => void;
  onPaymentError: (message: string | null) => void;
};

export const MesInscriptionRegistrationCard = forwardRef<HTMLDivElement, Props>(
  function MesInscriptionRegistrationCard(
    { registration: r, highlighted = false, invoiceLoadingId, onOpenInvoice, onPaymentError },
    ref
  ) {
    return (
      <Card
        ref={ref}
        variant="outlined"
        sx={
          highlighted
            ? {
                borderWidth: 2,
                borderColor: "secondary.main",
                boxShadow: (theme) => `0 0 0 4px ${theme.palette.secondary.main}22`,
              }
            : {
                borderColor: "divider",
              }
        }
      >
        <CardContent sx={{ pb: 1.5 }}>
          <Stack
            direction={{ xs: "column", sm: "row" }}
            alignItems={{ xs: "stretch", sm: "flex-start" }}
            justifyContent="space-between"
            spacing={{ xs: 1.5, sm: 2 }}
          >
            <Box sx={{ minWidth: 0 }}>
              <Typography
                variant="h6"
                sx={{
                  color: "primary.main",
                  wordBreak: "break-word",
                  lineHeight: 1.3,
                }}
              >
                {formatPersonDisplayName(r.firstName, r.lastName) || "—"}
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ wordBreak: "break-word" }}>
                {r.adherentRole ? MES_INSCRIPTION_ROLE_LABEL[r.adherentRole] : ""}
                {r.mainSectionId ? ` • ${findMesInscriptionSectionLabel(r.mainSectionId)}` : ""}
              </Typography>
            </Box>
            <Stack
              direction={{ xs: "row", sm: "column" }}
              alignItems={{ xs: "center", sm: "flex-end" }}
              justifyContent={{ xs: "space-between", sm: "flex-start" }}
              spacing={{ xs: 1, sm: 0.5 }}
              flexWrap="wrap"
              useFlexGap
            >
              <Chip
                size="small"
                label={MES_INSCRIPTION_STATUS_LABEL[r.status ?? ""] ?? r.status ?? "—"}
                color={MES_INSCRIPTION_STATUS_COLOR[r.status ?? ""] ?? "default"}
                sx={{ flexShrink: 0 }}
              />
              <Typography variant="caption" color="text.secondary">
                Envoyé le {formatMesInscriptionDate(r.submittedAt)}
              </Typography>
              {r.status === "payment_requested" ? (
                <Typography variant="caption" color="secondary.main" fontWeight={700}>
                  Paiement attendu
                  {formatMesInscriptionAmount(r.paymentAmountCents)
                    ? ` : ${formatMesInscriptionAmount(r.paymentAmountCents)}`
                    : ""}
                </Typography>
              ) : null}
              {r.medicalCertificateStatus && r.medicalCertificateStatus !== "not_required" ? (
                <Chip
                  size="small"
                  variant="outlined"
                  label={`Certificat : ${
                    MEDICAL_CERTIFICATE_STATUS_LABELS[r.medicalCertificateStatus]
                  }`}
                  color={MES_INSCRIPTION_MEDICAL_COLOR[r.medicalCertificateStatus]}
                  sx={{ flexShrink: 0 }}
                />
              ) : null}
            </Stack>
          </Stack>
        </CardContent>
        <CardActions
          sx={{
            flexDirection: { xs: "column", sm: "row" },
            alignItems: { xs: "stretch", sm: "center" },
            justifyContent: "space-between",
            gap: 1,
            pt: 0,
            px: { xs: 2, sm: 3 },
            pb: 2,
          }}
        >
          <Typography variant="caption" color="text.secondary" sx={{ wordBreak: "break-all" }}>
            Référence&nbsp;: {r.id}
          </Typography>
          <Stack
            direction="column"
            spacing={0.75}
            alignItems={{ xs: "stretch", sm: "flex-end" }}
            sx={{ width: { xs: "100%", sm: "auto" } }}
          >
            <MesInscriptionPayOnlineButton registration={r} onError={onPaymentError} />
            {isMesInscriptionPaid(r) && r.invoiceAvailable ? (
              <Button
                size="small"
                variant="outlined"
                color="secondary"
                startIcon={
                  invoiceLoadingId === r.id ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <DownloadIcon fontSize="small" />
                  )
                }
                disabled={invoiceLoadingId === r.id}
                onClick={() => onOpenInvoice(r.id)}
                sx={{ alignSelf: { xs: "stretch", sm: "auto" }, flexShrink: 0 }}
              >
                Télécharger la facture
              </Button>
            ) : isMesInscriptionPaid(r) ? (
              <Typography variant="caption" color="text.secondary">
                Facture en cours de publication…
              </Typography>
            ) : null}
          </Stack>
        </CardActions>
      </Card>
    );
  }
);
