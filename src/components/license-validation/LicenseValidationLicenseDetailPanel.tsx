"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Chip,
  Divider,
  FormControl,
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
  type LicenseValidationStatus,
} from "@/lib/license-validation/license-validation-status";
import { formatRegistrationAddress } from "@/lib/license-validation/map-registration";
import {
  formatAttestationLabel,
  formatBirthDate,
  formatCompetitorLabel,
  formatMedicalCertificateLabel,
  formatPaidLabel,
} from "@/components/license-validation/license-validation-labels";
import { useLicenseValidationDetail } from "@/components/license-validation/useLicenseValidationDetail";

type Props = {
  registrationId: string | null;
  onSaved: () => Promise<void>;
};

function ReadOnlyField({ label, value }: { label: string; value: string }) {
  return (
    <TextField label={label} value={value} fullWidth size="small" disabled />
  );
}

export function LicenseValidationLicenseDetailPanel({
  registrationId,
  onSaved,
}: Props) {
  const { detail, loading, error, reload } = useLicenseValidationDetail(registrationId);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [ffttLicense, setFfttLicense] = useState("");
  const [licenseValidationStatus, setLicenseValidationStatus] =
    useState<LicenseValidationStatus>("to_do");

  useEffect(() => {
    if (!detail) {
      return;
    }
    setFfttLicense(detail.ffttLicense ?? "");
    setLicenseValidationStatus(detail.licenseValidationStatus);
  }, [detail]);

  const handleSave = async () => {
    if (!registrationId) {
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
      await reload();
      await onSaved();
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

  const lookupLicense =
    typeof detail.ffttLicenseLookup?.licence === "string"
      ? detail.ffttLicenseLookup.licence
      : null;

  return (
    <Stack spacing={2.5}>
      <Box>
        <Typography variant="h6" component="h2" sx={{ mb: 0.75 }}>
          {[detail.firstName, detail.lastName].filter(Boolean).join(" ")}
        </Typography>
        <Chip
          size="small"
          label={LICENSE_VALIDATION_STATUS_LABELS[detail.licenseValidationStatus]}
        />
      </Box>

      <Stack spacing={1.5}>
        <Typography variant="subtitle2" color="text.secondary">
          Informations adhérent
        </Typography>
        <ReadOnlyField label="Prénom" value={detail.firstName || "—"} />
        <ReadOnlyField label="Nom" value={detail.lastName || "—"} />
        <ReadOnlyField label="E-mail" value={detail.adherentEmail || "—"} />
        <ReadOnlyField label="Date de naissance" value={formatBirthDate(detail.birthDate)} />
        <ReadOnlyField label="Ville de naissance" value={detail.birthCity || "—"} />
        <ReadOnlyField label="Adresse" value={formatRegistrationAddress(detail) || "—"} />
        <ReadOnlyField
          label="Compétiteur"
          value={formatCompetitorLabel(detail.wantsCompetitorExtras)}
        />
        <ReadOnlyField label="Payé ?" value={formatPaidLabel(detail.paymentStatus)} />
        <ReadOnlyField
          label="Certificat médical"
          value={formatMedicalCertificateLabel(detail.medicalCertificateStatus)}
        />
        <ReadOnlyField
          label="Attestation d'inscription"
          value={formatAttestationLabel(detail.wantsRegistrationCertificate)}
        />
        {lookupLicense ? (
          <ReadOnlyField label="Licence enregistrée (dossier)" value={lookupLicense} />
        ) : null}
      </Stack>

      <Divider />

      <Stack spacing={1.5}>
        <Typography variant="subtitle2" color="text.secondary">
          Saisie licence
        </Typography>
        <TextField
          label="Nouveau numéro de licence"
          value={ffttLicense}
          onChange={(e) => setFfttLicense(e.target.value.replace(/\D/g, ""))}
          fullWidth
          size="small"
          inputProps={{ inputMode: "numeric", pattern: "[0-9]*" }}
          helperText="Seul champ modifiable de la fiche."
        />
        <FormControl fullWidth size="small">
          <InputLabel id="license-validation-status-label">Statut licence</InputLabel>
          <Select
            labelId="license-validation-status-label"
            label="Statut licence"
            value={licenseValidationStatus}
            onChange={(e) =>
              setLicenseValidationStatus(e.target.value as LicenseValidationStatus)
            }
          >
            {LICENSE_VALIDATION_STATUS_VALUES.map((status) => (
              <MenuItem key={status} value={status}>
                {LICENSE_VALIDATION_STATUS_LABELS[status]}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
        {saveError ? <Alert severity="error">{saveError}</Alert> : null}
        <Button variant="contained" onClick={() => void handleSave()} disabled={saving}>
          {saving ? "Enregistrement…" : "Enregistrer la licence"}
        </Button>
      </Stack>
    </Stack>
  );
}
