"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControlLabel,
  Grid,
  MenuItem,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Refresh as RefreshIcon,
} from "@mui/icons-material";
import { PageHeader } from "@/components/ui";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import { getEnabledSections, getEnabledSites } from "@/lib/club-registration-config/helpers";
import { formatRegistrationSiteLabel } from "@/lib/club-registration-config/site-display";
import { useRegistrationConfigValue } from "@/hooks/useRegistrationConfig";
import {
  MEDICAL_CERTIFICATE_STATUS_LABELS,
  MEDICAL_CERTIFICATE_STATUS_VALUES,
  isMedicalCertificateRequired,
  normalizeMedicalCertificateStatus,
  type MedicalCertificateStatus,
} from "@/lib/club-registration/medical-certificate";
import {
  REGISTRATION_STATUS_COLORS,
  REGISTRATION_STATUS_LABELS,
  type RegistrationStatus,
} from "@/lib/club-registration/registration-status";
import type { Representative } from "@/lib/club-registration/schema";
import { APPLICANT_NOTES_MAX_LENGTH } from "@/lib/club-registration/applicant-notes";
import {
  calculateQuote,
  buildPricingContext,
  formatCentsAsEuros,
  type FamilyRegistrationOrder,
} from "@/lib/pricing";
import { PricingBreakdown } from "./PricingBreakdown";
import { RegistrationCompetitionFields } from "./RegistrationCompetitionFields";
import { ReductionReferenceCodeAdminFields } from "./ReductionReferenceCodeAdminFields";
import { RegistrationMultiSelectField } from "./RegistrationMultiSelectField";
import { SchoolPickupAdminFields } from "./SchoolPickupAdminFields";
import type { RegistrationDraft } from "./registration-defaults";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import { calculatePaymentSummary } from "@/lib/club-registration/payment/calculate-payment-summary";
import { normalizePaymentAidList } from "@/lib/club-registration/payment/payment-draft-helpers";
import { PaymentTrackingSection } from "./secretariat/PaymentTrackingSection";
import { SecretariatPaymentNotesSection } from "./secretariat/SecretariatPaymentNotesSection";
import {
  RegistrationFfttFields,
  RegistrationMedicalDossierDetail,
  RegistrationSubmissionContext,
} from "./membership-requests/RegistrationSupplementarySections";
import { toEditableRegistration } from "./membership-requests/to-editable-registration";
import { MembershipRequestsListPanel } from "./membership-requests/MembershipRequestsListPanel";
import { useManagedRegistrations } from "./membership-requests/useManagedRegistrations";
import type {
  EditableRegistration,
  RegistrationDetail,
} from "./membership-requests/types";

const ADHERENT_ROLE_OPTIONS = [
  { value: "self", label: "L'adhérent lui-même" },
  { value: "minor_dependent", label: "Mineur représenté légalement" },
  { value: "other_adult", label: "Autre adulte" },
] as const;

const SEX_OPTIONS = [
  { value: "female", label: "Femme" },
  { value: "male", label: "Homme" },
  { value: "other", label: "Autre / Ne pas préciser" },
] as const;

const REPRESENTATIVE_ROLE_OPTIONS = [
  { value: "mother", label: "Mère" },
  { value: "father", label: "Père" },
  { value: "guardian", label: "Tuteur / Tutrice" },
  { value: "self", label: "Adhérent(e) lui/elle-même" },
  { value: "other", label: "Autre" },
] as const;

const MEDICAL_OPTIONS = [
  { value: "under_40_all_no", label: "Moins de 40 ans : aucune réponse Oui" },
  {
    value: "over_40_cert_unchanged_all_no",
    label: "40 ans et plus, certificat déjà fourni : aucune réponse Oui",
  },
  {
    value: "over_40_first_or_changed_certificate_required",
    label: "40 ans et plus : certificat requis",
  },
  {
    value: "questionnaire_yes_certificate_required",
    label: "Au moins une réponse Oui : certificat requis",
  },
] as const;

const MEDICAL_CERTIFICATE_STATUS_OPTIONS =
  MEDICAL_CERTIFICATE_STATUS_VALUES.map((value) => ({
    value,
    label: MEDICAL_CERTIFICATE_STATUS_LABELS[value],
  }));

const FAMILY_ORDER_OPTIONS = [
  { value: "none", label: "Première inscription dans la famille" },
  { value: "second", label: "Deuxième inscription dans la famille" },
  { value: "third_or_more", label: "Troisième inscription ou plus" },
] as const;

const BOOLEAN_CONSENT_OPTIONS = [
  { value: "yes", label: "Oui" },
  { value: "not_applicable_adult", label: "Non applicable adulte" },
] as const;

function buildSlotOptions(config: RegistrationConfigV1) {
  return getEnabledSites(config).flatMap((site) =>
    site.slots
      .filter((slot) => slot.enabled)
      .map((slot) => ({
        value: slot.id,
        label: `${formatRegistrationSiteLabel(site)} — ${slot.label}`,
      }))
  );
}

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("fr-FR");
}

function createEmptyRepresentative(): Representative {
  return {
    role: "mother",
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
  };
}

function formToPricingInput(form: EditableRegistration) {
  const input: Parameters<typeof buildPricingContext>[0] = {
    birthDate: form.birthDate,
    mainSectionId: form.mainSectionId,
    wantsCompetitorExtras: form.wantsCompetitorExtras,
    wantsOptionalJersey: form.wantsCompetitorExtras ? false : form.wantsOptionalJersey,
    competitionIds: form.competitionIds,
    familyRegistrationOrder: form.familyRegistrationOrder as FamilyRegistrationOrder,
    sex: form.sex,
    reductionTypes: form.reductionTypes,
  };

  if (form.firstFemaleRegistrationSqy !== undefined) {
    input.firstFemaleRegistrationSqy = form.firstFemaleRegistrationSqy;
  }
  return input;
}

function parseAmountCents(value: string): number | null {
  const normalized = value.trim().replace(",", ".");
  if (!normalized) return null;
  const amount = Number(normalized);
  if (!Number.isFinite(amount) || amount < 0) return null;
  return Math.round(amount * 100);
}

function registrationStatusChipProps(status: string | undefined): {
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
  return { label: status ?? "Statut inconnu", color: "default" };
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="h6" fontWeight={800} sx={{ color: "primary.main" }}>
      {children}
    </Typography>
  );
}

export function MembershipRequestsClient() {
  const config = useRegistrationConfigValue();
  const sectionOptions = getEnabledSections(config);
  const competitionOptions = config.competitions.filter((c) => c.enabled);
  const reductionOptions = config.aidRules;
  const jerseySizes = config.uiCopy.jerseySizes;
  const allSlotOptions = buildSlotOptions(config);
  const {
    statusFilter,
    setStatusFilter,
    medicalCertificateFilter,
    setMedicalCertificateFilter,
    searchInput,
    setSearchInput,
    registrations,
    pageInfo,
    loadingList,
    loadingMore,
    error: listError,
    reload,
    loadMore,
  } = useManagedRegistrations();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<RegistrationDetail | null>(null);
  const [form, setForm] = useState<EditableRegistration | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestingPayment, setRequestingPayment] = useState(false);
  const [persistingQuote, setPersistingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchDetail = useCallback(async (id: string) => {
    setLoadingDetail(true);
    setError(null);
    try {
      const res = await fetch(`/api/club/registration?id=${encodeURIComponent(id)}`, {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Impossible de charger le dossier.");
      }
      const registration = json.registration as RegistrationDetail;
      const payment =
        registration.payment ??
        normalizeRegistrationPayment(registration as unknown as Record<string, unknown>);
      setSelected(registration);
      setForm(toEditableRegistration(registration, config, payment));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement.");
      setSelected(null);
      setForm(null);
    } finally {
      setLoadingDetail(false);
    }
  }, [config]);

  useEffect(() => {
    if (registrations.length === 0) {
      setSelectedId(null);
      return;
    }
    if (!selectedId || !registrations.some((registration) => registration.id === selectedId)) {
      setSelectedId(registrations[0].id);
    }
  }, [registrations, selectedId]);

  useEffect(() => {
    if (selectedId) {
      void fetchDetail(selectedId);
    }
  }, [fetchDetail, selectedId]);

  const selectedSummary = useMemo(
    () => registrations.find((registration) => registration.id === selectedId) ?? null,
    [registrations, selectedId]
  );

  const selectedPayment = useMemo(() => {
    if (!selected) return null;
    return (
      selected.payment ??
      normalizeRegistrationPayment(selected as unknown as Record<string, unknown>)
    );
  }, [selected]);

  const liveQuote = useMemo(() => {
    if (!form?.birthDate) {
      return null;
    }
    return calculateQuote(buildPricingContext(formToPricingInput(form)), config);
  }, [form, config]);

  const enteredAmountCents = useMemo(() => {
    if (!form) return null;
    return parseAmountCents(form.amountEuros);
  }, [form]);

  /** Montant attendu après aides déclarées (aligné sur le détail tarifaire). */
  const expectedPayableAfterAidsCents = useMemo(() => {
    if (!form || !liveQuote || liveQuote.totalCents <= 0) return null;
    return calculatePaymentSummary({
      totalAmountCents: liveQuote.totalCents,
      aids: normalizePaymentAidList(form.paymentAids ?? []),
      receivedPayments: [],
    }).amountToPayCents;
  }, [form, liveQuote]);

  const amountDiffersFromQuote =
    liveQuote !== null &&
    liveQuote.totalCents > 0 &&
    enteredAmountCents !== null &&
    expectedPayableAfterAidsCents !== null &&
    enteredAmountCents !== expectedPayableAfterAidsCents;

  const updateField = <K extends keyof EditableRegistration>(
    field: K,
    value: EditableRegistration[K]
  ) => {
    setForm((current) => (current ? { ...current, [field]: value } : current));
  };

  const updateMedicalDeclaration = (nextDeclaration: string) => {
    setForm((current) =>
      current
        ? {
            ...current,
            medicalCertificateDeclaration: nextDeclaration,
            medicalCertificateStatus: normalizeMedicalCertificateStatus(
              current.medicalCertificateStatus,
              nextDeclaration
            ),
          }
        : current
    );
  };

  const updateRepresentative = (
    index: number,
    patch: Partial<Representative>
  ) => {
    setForm((current) => {
      if (!current) return current;
      const representatives = current.representatives.map((rep, repIndex) =>
        repIndex === index ? { ...rep, ...patch } : rep
      );
      return { ...current, representatives };
    });
  };

  const addRepresentative = () => {
    setForm((current) =>
      current
        ? {
            ...current,
            representatives: [
              ...current.representatives,
              createEmptyRepresentative(),
            ].slice(0, 2),
          }
        : current
    );
  };

  const removeRepresentative = (index: number) => {
    setForm((current) =>
      current
        ? {
            ...current,
            representatives: current.representatives.filter(
              (_rep, repIndex) => repIndex !== index
            ),
          }
        : current
    );
  };

  const save = async (): Promise<boolean> => {
    if (!selectedId || !form) return false;
    const amountCents = parseAmountCents(form.amountEuros);
    if (form.amountEuros.trim() && amountCents === null) {
      setError("Le montant doit être un nombre positif.");
      return false;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(`/api/club/registration?id=${encodeURIComponent(selectedId)}`, {
        method: "PATCH",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adherentRole: form.adherentRole,
          ffttLicense: form.ffttLicense.trim() || undefined,
          firstName: form.firstName,
          lastName: form.lastName,
          sex: form.sex,
          birthCity: form.birthCity,
          birthDate: form.birthDate,
          adherentEmail: form.adherentEmail,
          adherentPhonePrimary: form.adherentPhonePrimary,
          adherentPhoneSecondary: form.adherentPhoneSecondary,
          addressLine1: form.addressLine1,
          addressLine2: form.addressLine2,
          postalCode: form.postalCode,
          city: form.city,
          representatives: form.representatives,
          mainSectionId: form.mainSectionId,
          additionalSectionIds: form.additionalSectionIds,
          slotIds: form.slotIds,
          schoolPickupSlotIds: form.schoolPickupSlotIds.filter((id) =>
            form.slotIds.includes(id)
          ),
          medicalCertificateDeclaration: form.medicalCertificateDeclaration,
          medicalCertificateStatus: form.medicalCertificateStatus,
          wantsRegistrationCertificate: form.wantsRegistrationCertificate,
          familyRegistrationOrder: form.familyRegistrationOrder,
          reductionTypes: form.reductionTypes,
          reductionReferenceCodes: form.reductionReferenceCodes,
          firstFemaleRegistrationSqy:
            form.sex === "female" ? form.firstFemaleRegistrationSqy ?? false : undefined,
          photoConsent: form.photoConsent,
          emergencyMedicalAuthorization: form.emergencyMedicalAuthorization,
          supervisionAcknowledgement: form.supervisionAcknowledgement,
          internalRulesAccepted: form.internalRulesAccepted,
          wantsCompetitorExtras: form.wantsCompetitorExtras,
          competitionJerseySize: form.competitionJerseySize || undefined,
          wantsOptionalJersey: form.wantsCompetitorExtras ? false : form.wantsOptionalJersey,
          optionalJerseySize:
            !form.wantsCompetitorExtras && form.wantsOptionalJersey
              ? form.optionalJerseySize || undefined
              : undefined,
          competitionIds: form.competitionIds,
          applicantNotes: form.applicantNotes.trim() || undefined,
          reviewNotes: form.reviewNotes,
          ...(amountCents !== null ? { paymentAmountCents: amountCents } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        throw new Error(json.error || "Impossible d'enregistrer les corrections.");
      }
      setSuccess("Dossier mis à jour.");
      await Promise.all([reload(), fetchDetail(selectedId)]);
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur d'enregistrement.");
      return false;
    } finally {
      setSaving(false);
    }
  };

  const applyCalculatedAmount = () => {
    if (!form || !liveQuote || liveQuote.totalCents <= 0) {
      setError("Impossible d'appliquer un montant : devis incomplet ou nul.");
      return;
    }
    const payable = calculatePaymentSummary({
      totalAmountCents: liveQuote.totalCents,
      aids: normalizePaymentAidList(form.paymentAids ?? []),
      receivedPayments: [],
    }).amountToPayCents;
    updateField("amountEuros", String(payable / 100));
    setSuccess("Montant aligné sur le reste à payer estimé (après aides déclarées).");
  };

  const persistQuote = async () => {
    if (!selectedId || !form) return;

    setPersistingQuote(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/club/registration/${encodeURIComponent(selectedId)}/pricing`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...formToPricingInput(form),
            persist: true,
            applyPaymentAmount: true,
          }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        throw new Error(json.error || "Impossible d'enregistrer le devis.");
      }
      if (typeof json.paymentAmountCents === "number") {
        updateField("amountEuros", String(json.paymentAmountCents / 100));
      }
      setSuccess("Devis enregistré et montant à régler mis à jour.");
      await Promise.all([reload(), fetchDetail(selectedId)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement du devis.");
    } finally {
      setPersistingQuote(false);
    }
  };

  const requestPayment = async () => {
    if (!selectedId || !form) return;
    const amountCents = parseAmountCents(form.amountEuros);
    if (!amountCents || amountCents <= 0) {
      setError("Indiquez un montant strictement positif avant de demander le paiement.");
      return;
    }

    setRequestingPayment(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await save();
      if (!saved) return;
      const res = await fetch(
        `/api/club/registration/${encodeURIComponent(selectedId)}/request-payment`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ amountCents }),
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        throw new Error(json.error || "Impossible d'envoyer la demande de paiement.");
      }
      if (json.manualFollowUp === true) {
        setSuccess(
          typeof json.message === "string"
            ? json.message
            : "Dossier validé. Un e-mail d'instructions de règlement a été envoyé au contact du dossier."
        );
      } else {
        setSuccess(
          "Un e-mail avec un lien de paiement sécurisé a été envoyé au contact du dossier."
        );
      }
      await Promise.all([reload(), fetchDetail(selectedId)]);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la demande de paiement.");
    } finally {
      setRequestingPayment(false);
    }
  };

  return (
    <Container maxWidth="xl" sx={{ py: { xs: 3, sm: 5 } }}>
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Secrétariat"
          title="Demandes d'adhésion"
          subtitle="Relisez le dossier, vérifiez le montant, puis demandez le paiement : un e-mail avec lien Stripe part uniquement pour la carte bancaire en une fois. Les autres modes sont suivis manuellement dans le tableau ci-dessous."
          actions={
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => reload()}
              disabled={loadingList}
            >
              Actualiser
            </Button>
          }
        />

        {listError ? (
          <Alert severity="error">{listError}</Alert>
        ) : null}
        {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}
        {success ? (
          <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>
        ) : null}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <MembershipRequestsListPanel
              registrations={registrations}
              selectedId={selectedId}
              onSelect={setSelectedId}
              statusFilter={statusFilter}
              onStatusFilterChange={setStatusFilter}
              medicalCertificateFilter={medicalCertificateFilter}
              onMedicalCertificateFilterChange={setMedicalCertificateFilter}
              searchInput={searchInput}
              onSearchInputChange={setSearchInput}
              pageInfo={pageInfo}
              loadingList={loadingList}
              loadingMore={loadingMore}
              onLoadMore={() => void loadMore()}
            />
          </Grid>

          <Grid size={{ xs: 12, md: 8 }}>
            <Card variant="outlined">
              <CardContent>
                {loadingDetail ? (
                  <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
                    <CircularProgress />
                  </Box>
                ) : !selected || !form ? (
                  <Typography color="text.secondary">
                    Sélectionnez une demande pour la relire.
                  </Typography>
                ) : (
                  <Stack spacing={3}>
                    <Stack
                      direction={{ xs: "column", sm: "row" }}
                      justifyContent="space-between"
                      spacing={1.5}
                    >
                      <Box>
                        <Typography variant="h5" fontWeight={700}>
                          {form.firstName} {form.lastName}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Référence : {selected.id}
                        </Typography>
                      </Box>
                      <Chip
                        label={
                          registrationStatusChipProps(
                            selectedSummary?.status ?? selected.status
                          ).label
                        }
                        color={
                          registrationStatusChipProps(
                            selectedSummary?.status ?? selected.status
                          ).color
                        }
                      />
                    </Stack>

                    <Divider />

                    <RegistrationSubmissionContext
                      submitterAccountEmail={selected.submitterAccountEmail}
                      submittedAt={selected.submittedAt}
                      updatedAt={selected.updatedAt}
                    />

                    <SectionTitle>Identité et type d&apos;inscription</SectionTitle>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField select label="Inscription pour" value={form.adherentRole} onChange={(e) => updateField("adherentRole", e.target.value as EditableRegistration["adherentRole"])} fullWidth>
                          {ADHERENT_ROLE_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Date de naissance" type="date" value={form.birthDate} onChange={(e) => updateField("birthDate", e.target.value)} fullWidth InputLabelProps={{ shrink: true }} />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Prénom" value={form.firstName} onChange={(e) => updateField("firstName", e.target.value)} fullWidth />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Nom" value={form.lastName} onChange={(e) => updateField("lastName", e.target.value)} fullWidth />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField select label="Sexe" value={form.sex} onChange={(e) => updateField("sex", e.target.value as EditableRegistration["sex"])} fullWidth>
                          {SEX_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Ville de naissance" value={form.birthCity} onChange={(e) => updateField("birthCity", e.target.value)} fullWidth />
                      </Grid>
                      {form.sex === "female" ? (
                        <Grid size={{ xs: 12 }}>
                          <FormControlLabel
                            control={<Checkbox checked={form.firstFemaleRegistrationSqy ?? false} onChange={(e) => updateField("firstFemaleRegistrationSqy", e.target.checked)} />}
                            label="Première inscription féminine au club SQY Ping"
                          />
                        </Grid>
                      ) : null}
                    </Grid>

                    <RegistrationFfttFields
                      ffttLicense={form.ffttLicense}
                      lookup={selected.ffttLicenseLookup}
                      onLicenseChange={(value) => updateField("ffttLicense", value)}
                    />

                    <SectionTitle>Contact et adresse</SectionTitle>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="E-mail adhérent" value={form.adherentEmail} onChange={(e) => updateField("adherentEmail", e.target.value)} fullWidth />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Téléphone principal" value={form.adherentPhonePrimary} onChange={(e) => updateField("adherentPhonePrimary", e.target.value)} fullWidth />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Téléphone secondaire" value={form.adherentPhoneSecondary} onChange={(e) => updateField("adherentPhoneSecondary", e.target.value)} fullWidth />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField label="Adresse" value={form.addressLine1} onChange={(e) => updateField("addressLine1", e.target.value)} fullWidth />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField label="Complément d'adresse" value={form.addressLine2} onChange={(e) => updateField("addressLine2", e.target.value)} fullWidth />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 4 }}>
                        <TextField label="Code postal" value={form.postalCode} onChange={(e) => updateField("postalCode", e.target.value)} fullWidth />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 8 }}>
                        <TextField label="Ville" value={form.city} onChange={(e) => updateField("city", e.target.value)} fullWidth />
                      </Grid>
                    </Grid>

                    <SectionTitle>Représentants légaux</SectionTitle>
                    <Stack spacing={2}>
                      {form.representatives.length === 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          Aucun représentant légal renseigné.
                        </Typography>
                      ) : (
                        form.representatives.map((rep, index) => (
                          <Card key={index} variant="outlined">
                            <CardContent>
                              <Grid container spacing={2}>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                  <TextField select label="Lien" value={rep.role} onChange={(e) => updateRepresentative(index, { role: e.target.value as Representative["role"] })} fullWidth>
                                    {REPRESENTATIVE_ROLE_OPTIONS.map((option) => (
                                      <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                                    ))}
                                  </TextField>
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                  <TextField label="Prénom" value={rep.firstName} onChange={(e) => updateRepresentative(index, { firstName: e.target.value })} fullWidth />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                  <TextField label="Nom" value={rep.lastName} onChange={(e) => updateRepresentative(index, { lastName: e.target.value })} fullWidth />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                  <TextField label="E-mail" value={rep.email} onChange={(e) => updateRepresentative(index, { email: e.target.value })} fullWidth />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }}>
                                  <TextField label="Téléphone" value={rep.phone} onChange={(e) => updateRepresentative(index, { phone: e.target.value })} fullWidth />
                                </Grid>
                                <Grid size={{ xs: 12, sm: 6 }} sx={{ display: "flex", alignItems: "center" }}>
                                  <Button color="error" startIcon={<DeleteIcon />} onClick={() => removeRepresentative(index)}>
                                    Retirer ce représentant
                                  </Button>
                                </Grid>
                              </Grid>
                            </CardContent>
                          </Card>
                        ))
                      )}
                      <Button
                        variant="outlined"
                        startIcon={<AddIcon />}
                        onClick={addRepresentative}
                        disabled={form.representatives.length >= 2}
                        sx={{ alignSelf: "flex-start" }}
                      >
                        Ajouter un représentant
                      </Button>
                    </Stack>

                    <SectionTitle>Sections, créneaux et pratique</SectionTitle>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField select label="Section principale" value={form.mainSectionId} onChange={(e) => updateField("mainSectionId", e.target.value)} fullWidth>
                          {sectionOptions.map((section) => (
                            <MenuItem key={section.id} value={section.id}>
                              {section.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <RegistrationMultiSelectField
                          label="Sections additionnelles"
                          value={form.additionalSectionIds}
                          options={sectionOptions.map((section) => ({
                            value: section.id,
                            label: section.label,
                          }))}
                          onChange={(value) => updateField("additionalSectionIds", value)}
                        />
                      </Grid>
                      <SchoolPickupAdminFields
                        slotIds={form.slotIds}
                        schoolPickupSlotIds={form.schoolPickupSlotIds}
                        allSlotOptions={allSlotOptions}
                        onSlotIdsChange={(value) => updateField("slotIds", value)}
                        onSchoolPickupSlotIdsChange={(value) =>
                          updateField("schoolPickupSlotIds", value)
                        }
                        MultiSelectField={RegistrationMultiSelectField}
                      />
                    </Grid>

                    <SectionTitle>Dossier administratif</SectionTitle>
                    <Grid container spacing={2}>
                      <RegistrationMedicalDossierDetail registration={selected} />
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField select label="Déclaration médicale" value={form.medicalCertificateDeclaration} onChange={(e) => updateMedicalDeclaration(e.target.value)} fullWidth>
                          {MEDICAL_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          select
                          label="Suivi certificat médical"
                          value={form.medicalCertificateStatus}
                          onChange={(e) =>
                            updateField(
                              "medicalCertificateStatus",
                              e.target.value as MedicalCertificateStatus
                            )
                          }
                          disabled={!isMedicalCertificateRequired(form.medicalCertificateDeclaration)}
                          fullWidth
                          helperText={
                            isMedicalCertificateRequired(form.medicalCertificateDeclaration)
                              ? "Suivi interne du certificat, sans stockage du document."
                              : "Aucun certificat médical requis pour cette déclaration."
                          }
                        >
                          {MEDICAL_CERTIFICATE_STATUS_OPTIONS.map((option) => (
                            <MenuItem
                              key={option.value}
                              value={option.value}
                              disabled={
                                isMedicalCertificateRequired(
                                  form.medicalCertificateDeclaration
                                ) && option.value === "not_required"
                              }
                            >
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField select label="Ordre inscription famille" value={form.familyRegistrationOrder} onChange={(e) => updateField("familyRegistrationOrder", e.target.value)} fullWidth>
                          {FAMILY_ORDER_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <RegistrationMultiSelectField
                          label="Aides / réductions"
                          value={form.reductionTypes}
                          options={reductionOptions.map((reduction) => ({
                            value: reduction.id,
                            label: reduction.label,
                          }))}
                          onChange={(value) => updateField("reductionTypes", value)}
                        />
                      </Grid>
                      <ReductionReferenceCodeAdminFields
                        config={config}
                        reductionTypes={form.reductionTypes}
                        reductionReferenceCodes={form.reductionReferenceCodes}
                        onReferenceCodesChange={(codes) =>
                          setForm((prev) => (prev ? { ...prev, reductionReferenceCodes: codes } : prev))
                        }
                      />
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControlLabel
                          control={<Checkbox checked={form.wantsRegistrationCertificate} onChange={(e) => updateField("wantsRegistrationCertificate", e.target.checked)} />}
                          label="Demande d'attestation d'inscription"
                        />
                      </Grid>
                    </Grid>

                    <SectionTitle>Autorisations et engagements</SectionTitle>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField select label="Droit à l'image" value={form.photoConsent} onChange={(e) => updateField("photoConsent", e.target.value as EditableRegistration["photoConsent"])} fullWidth>
                          <MenuItem value="accept">Accepte</MenuItem>
                          <MenuItem value="refuse">Refuse</MenuItem>
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField select label="Autorisation médicale d'urgence" value={form.emergencyMedicalAuthorization} onChange={(e) => updateField("emergencyMedicalAuthorization", e.target.value as EditableRegistration["emergencyMedicalAuthorization"])} fullWidth>
                          {BOOLEAN_CONSENT_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField select label="Prise en charge à l'heure des cours" value={form.supervisionAcknowledgement} onChange={(e) => updateField("supervisionAcknowledgement", e.target.value as EditableRegistration["supervisionAcknowledgement"])} fullWidth>
                          {BOOLEAN_CONSENT_OPTIONS.map((option) => (
                            <MenuItem key={option.value} value={option.value}>{option.label}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControlLabel
                          control={<Checkbox checked={form.internalRulesAccepted} onChange={(e) => updateField("internalRulesAccepted", e.target.checked)} />}
                          label="Règlement intérieur accepté"
                        />
                      </Grid>
                    </Grid>

                    <SectionTitle>Compétition</SectionTitle>
                    <RegistrationCompetitionFields
                      config={config}
                      form={form}
                      jerseySizes={jerseySizes}
                      competitionOptions={competitionOptions}
                      onFieldChange={updateField}
                    />

                    <SectionTitle>Tarification</SectionTitle>
                    <Stack spacing={2}>
                      <PricingBreakdown
                        draft={{
                          birthDate: form.birthDate,
                          mainSectionId: form.mainSectionId,
                          wantsCompetitorExtras: form.wantsCompetitorExtras,
                          wantsOptionalJersey: form.wantsOptionalJersey,
                          competitionIds: form.competitionIds,
                          familyRegistrationOrder:
                            form.familyRegistrationOrder as RegistrationDraft["familyRegistrationOrder"],
                          sex: form.sex,
                          firstFemaleRegistrationSqy: form.firstFemaleRegistrationSqy,
                          reductionTypes: form.reductionTypes,
                          paymentAids: form.paymentAids,
                        }}
                        variant="full"
                      />

                      {liveQuote && liveQuote.totalCents > 0 ? (
                        <Typography variant="body2" color="text.secondary">
                          Total calculé :{" "}
                          <strong>{formatCentsAsEuros(liveQuote.totalCents)}</strong>
                          {selected.pricingQuoteComputedAt
                            ? ` — dernier devis serveur : ${formatDate(selected.pricingQuoteComputedAt)}`
                            : null}
                        </Typography>
                      ) : null}

                      {amountDiffersFromQuote ? (
                        <Alert severity="warning">
                          Le montant saisi (
                          {formatCentsAsEuros(enteredAmountCents ?? 0)}) diffère du reste à
                          payer estimé (
                          {formatCentsAsEuros(expectedPayableAfterAidsCents ?? 0)}
                          {liveQuote
                            ? `, total devis ${formatCentsAsEuros(liveQuote.totalCents)}`
                            : ""}
                          ).
                        </Alert>
                      ) : null}

                      <Stack direction={{ xs: "column", sm: "row" }} spacing={1}>
                        <Button
                          variant="outlined"
                          onClick={applyCalculatedAmount}
                          disabled={
                            !liveQuote ||
                            liveQuote.totalCents <= 0 ||
                            saving ||
                            requestingPayment ||
                            persistingQuote
                          }
                        >
                          Appliquer le montant calculé
                        </Button>
                        <Button
                          variant="outlined"
                          color="secondary"
                          startIcon={<RefreshIcon />}
                          onClick={() => void persistQuote()}
                          disabled={saving || requestingPayment || persistingQuote}
                        >
                          {persistingQuote ? "Enregistrement..." : "Enregistrer le devis"}
                        </Button>
                      </Stack>
                    </Stack>

                    <SectionTitle>Précisions de l&apos;inscrit</SectionTitle>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Message transmis avec le dossier"
                          value={form.applicantNotes}
                          onChange={(e) => updateField("applicantNotes", e.target.value)}
                          fullWidth
                          multiline
                          minRows={3}
                          inputProps={{ maxLength: APPLICANT_NOTES_MAX_LENGTH }}
                          helperText="Saisi par l'inscrit en fin de parcours (facultatif)."
                        />
                      </Grid>
                    </Grid>

                    {selectedId && selectedPayment ? (
                      <PaymentTrackingSection
                        registrationId={selectedId}
                        payment={selectedPayment}
                        onRefresh={async () => {
                          if (selectedId) await fetchDetail(selectedId);
                          await reload();
                        }}
                      />
                    ) : null}

                    <SecretariatPaymentNotesSection
                      amountEuros={form.amountEuros}
                      reviewNotes={form.reviewNotes}
                      onAmountEurosChange={(value) => updateField("amountEuros", value)}
                      onReviewNotesChange={(value) => updateField("reviewNotes", value)}
                      paymentEmailSentTo={selected.paymentEmailSentTo ?? null}
                      paymentMethod={selectedPayment?.paymentMethod}
                      paymentInstallments={selectedPayment?.paymentInstallments}
                      saving={saving}
                      requestingPayment={requestingPayment}
                      persistingQuote={persistingQuote}
                      onSave={async () => {
                        await save();
                      }}
                      onRequestPayment={requestPayment}
                    />
                  </Stack>
                )}
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Stack>
    </Container>
  );
}
