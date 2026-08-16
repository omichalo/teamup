"use client";

import { useState } from "react";
import {
  Alert,
  Box,
  Button,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  LICENSE_VALIDATION_STATUS_LABELS,
  LICENSE_VALIDATION_STATUS_VALUES,
  requiresFfttLicenseNumber,
  type LicenseValidationStatus,
} from "@/lib/license-validation/license-validation-status";
import { LICENSE_REQUIRED_MESSAGE } from "@/lib/license-validation/resolve-license-validation-patch";
import {
  formatRegistrationAddress,
  type LicenseValidationDetail,
} from "@/lib/license-validation/map-registration";
import {
  formatAttestationLabel,
  formatBirthDate,
  formatCompetitorLabel,
  formatMedicalCertificateLabel,
  formatPaidLabel,
  formatSexLabel,
} from "@/components/license-validation/license-validation-labels";
import { LicenseValidationLineSecondaryText } from "@/components/license-validation/LicenseValidationLineSecondaryText";
import { useLicenseValidationDetail } from "@/components/license-validation/useLicenseValidationDetail";
import { PpsFollowUpPanel } from "@/components/club-registration/PpsFollowUpPanel";

type Props = {
  registrationId: string | null;
  onSaved: (registration: LicenseValidationDetail) => void | Promise<void>;
};

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack spacing={0.25} sx={{ minWidth: 0 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" sx={{ wordBreak: "break-word" }}>
        {value}
      </Typography>
    </Stack>
  );
}

export function LicenseValidationLicenseDetailPanel({
  registrationId,
  onSaved,
}: Props) {
  const { detail, loading, error, reload, setDetail } = useLicenseValidationDetail(registrationId);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [licenseDraft, setLicenseDraft] = useState<string | null>(null);
  const [statusDraft, setStatusDraft] = useState<LicenseValidationStatus | null>(
    null
  );
  const [draftRegistrationId, setDraftRegistrationId] = useState<string | null>(
    null
  );

  const isDraftForCurrent =
    Boolean(registrationId) && draftRegistrationId === registrationId;
  const knownLicense =
    detail && detail.id === registrationId ? (detail.ffttLicense ?? "") : "";
  const ffttLicense =
    isDraftForCurrent && licenseDraft !== null ? licenseDraft : knownLicense;
  const licenseValidationStatus: LicenseValidationStatus =
    isDraftForCurrent && statusDraft !== null
      ? statusDraft
      : (detail?.id === registrationId
          ? detail.licenseValidationStatus
          : "to_do");

  const handleSave = async () => {
    if (!registrationId) {
      return;
    }
    if (requiresFfttLicenseNumber(licenseValidationStatus) && ffttLicense.trim().length < 5) {
      setSaveError(LICENSE_REQUIRED_MESSAGE);
      return;
    }
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(
        `/api/club/license-validations/${encodeURIComponent(registrationId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ffttLicense, licenseValidationStatus }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(json.error || "Enregistrement impossible");
      }
      const registration = json.registration as LicenseValidationDetail;
      setLicenseDraft(null);
      setStatusDraft(null);
      setDraftRegistrationId(null);
      await reload();
      await onSaved(registration);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Erreur inconnue");
    } finally {
      setSaving(false);
    }
  };

  if (!registrationId) {
    return (
      <Box
        sx={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: 280,
          px: 2,
        }}
      >
        <Typography color="text.secondary" textAlign="center">
          Sélectionnez un dossier dans la liste pour saisir ou mettre à jour sa licence.
        </Typography>
      </Box>
    );
  }

  if (loading) {
    return (
      <Typography color="text.secondary" sx={{ py: 4 }}>
        Chargement du dossier…
      </Typography>
    );
  }

  if (error) {
    return <Alert severity="error">{error}</Alert>;
  }

  if (!detail) {
    return null;
  }

  const infoFields: Array<{ label: string; value: string; fullWidth?: boolean }> = [
    { label: "Date de naissance", value: formatBirthDate(detail.birthDate) },
    { label: "Sexe", value: formatSexLabel(detail.sex) },
    { label: "Ville de naissance", value: detail.birthCity || "—", fullWidth: true },
  ];

  const contactEmails =
    detail.contactEmails.length > 0
      ? detail.contactEmails
      : detail.adherentEmail
        ? [{ label: "E-mail adhérent", email: detail.adherentEmail }]
        : [];

  if (contactEmails.length === 0) {
    infoFields.push({
      label: "E-mail",
      value: "—",
    });
  } else {
    for (const contact of contactEmails) {
      infoFields.push({
        label: contact.label,
        value: contact.email,
        fullWidth: contactEmails.length > 1,
      });
    }
  }

  infoFields.push(
    {
      label: "Adresse",
      value: formatRegistrationAddress(detail) || "—",
      fullWidth: true,
    },
    {
      label: "Compétiteur",
      value: formatCompetitorLabel(detail.wantsCompetitorExtras),
    },
    { label: "Paiement", value: formatPaidLabel(detail.paymentStatus) },
    {
      label: "Suivi médical",
      value: formatMedicalCertificateLabel(
        detail.medicalCertificateStatus,
        detail.medicalCertificateDeclaration,
        detail.ppsFollowUp.status,
        detail.birthDate
      ),
    },
    {
      label: "Attestation d'inscription",
      value: formatAttestationLabel(detail.wantsRegistrationCertificate),
    }
  );

  return (
    <Stack spacing={2.5}>
      <Stack spacing={1}>
        <Typography variant="h6" component="h2">
          {[detail.firstName, detail.lastName].filter(Boolean).join(" ")}
        </Typography>
        <LicenseValidationLineSecondaryText registration={detail} />
      </Stack>

      <Stack
        spacing={1.5}
        sx={{
          p: 2,
          borderRadius: 2,
          border: 1,
          borderColor: "divider",
          bgcolor: "grey.50",
        }}
      >
        <Typography variant="subtitle2">Saisie licence</Typography>
        <Grid container spacing={1.5}>
          <Grid size={{ xs: 12, sm: 6 }}>
            <TextField
              label="Numéro de licence"
              value={ffttLicense}
              onChange={(e) => {
                setDraftRegistrationId(registrationId);
                setLicenseDraft(e.target.value.replace(/\D/g, ""));
              }}
              fullWidth
              size="small"
              required={requiresFfttLicenseNumber(licenseValidationStatus)}
              inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
              helperText={
                requiresFfttLicenseNumber(licenseValidationStatus)
                  ? "Obligatoire pour Traité et Validé sans pratique sportive"
                  : " "
              }
            />
          </Grid>
          <Grid size={{ xs: 12, sm: 6 }}>
            <FormControl fullWidth size="small">
              <InputLabel id="license-validation-status-label">Statut licence</InputLabel>
              <Select
                labelId="license-validation-status-label"
                label="Statut licence"
                value={licenseValidationStatus}
                onChange={(e) => {
                  setDraftRegistrationId(registrationId);
                  setStatusDraft(e.target.value as LicenseValidationStatus);
                }}
              >
                {LICENSE_VALIDATION_STATUS_VALUES.map((status) => (
                  <MenuItem key={status} value={status}>
                    {LICENSE_VALIDATION_STATUS_LABELS[status]}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        {saveError ? <Alert severity="error">{saveError}</Alert> : null}
        <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer la licence"}
        </Button>
      </Stack>

      {registrationId ? (
        <PpsFollowUpPanel
          registrationId={registrationId}
          medicalCertificateDeclaration={detail.medicalCertificateDeclaration}
          birthDate={detail.birthDate}
          ppsFollowUp={detail.ppsFollowUp}
          onUpdated={(next) => {
            setDetail((current) =>
              current ? { ...current, ppsFollowUp: next } : current
            );
          }}
        />
      ) : null}

      <Divider />

      <Stack spacing={1.5}>
        <Typography variant="subtitle2" color="text.secondary">
          Informations adhérent
        </Typography>
        <Grid container spacing={1.5}>
          {infoFields.map((field) => (
            <Grid
              key={field.label}
              size={{ xs: 12, sm: field.fullWidth ? 12 : 6 }}
            >
              <InfoRow label={field.label} value={field.value} />
            </Grid>
          ))}
        </Grid>
      </Stack>
    </Stack>
  );
}
