"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Alert,
  Box,
  Button,
  Card,
  CardActions,
  CardContent,
  Checkbox,
  Chip,
  CircularProgress,
  Container,
  Divider,
  FormControl,
  FormControlLabel,
  Grid,
  InputAdornment,
  InputLabel,
  ListItemText,
  MenuItem,
  OutlinedInput,
  Select,
  Stack,
  TextField,
  Typography,
} from "@mui/material";
import type { SelectChangeEvent } from "@mui/material/Select";
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Euro as EuroIcon,
  MarkEmailRead as MarkEmailReadIcon,
  Refresh as RefreshIcon,
  Save as SaveIcon,
} from "@mui/icons-material";
import { PageHeader } from "@/components/ui";
import {
  CLUB_REGISTRATION_SITES,
  COMPETITION_OPTIONS,
  JERSEY_SIZES,
  REDUCTION_OPTIONS,
  HANDISPORT_PRACTICE_OPTIONS,
  SECTION_PRINCIPALE_OPTIONS,
} from "@/lib/club-registration/constants";
import {
  MEDICAL_CERTIFICATE_STATUS_LABELS,
  MEDICAL_CERTIFICATE_STATUS_VALUES,
  isMedicalCertificateRequired,
  normalizeMedicalCertificateStatus,
  type MedicalCertificateStatus,
} from "@/lib/club-registration/medical-certificate";
import type { Representative } from "@/lib/club-registration/schema";
import { normalizeCompetitionIds } from "@/lib/club-registration/competition-ids";
import {
  calculateQuote,
  buildPricingContext,
  formatCentsAsEuros,
  type FamilyRegistrationOrder,
  type PriceQuote,
} from "@/lib/pricing";
import { PricingBreakdown } from "./PricingBreakdown";
import type { RegistrationDraft } from "./registration-defaults";

type RegistrationSummary = {
  id: string;
  firstName?: string;
  lastName?: string;
  submitterAccountEmail?: string;
  mainSectionId?: string;
  medicalCertificateDeclaration?: string;
  medicalCertificateStatus?: MedicalCertificateStatus;
  status?: string;
  paymentAmountCents?: number;
  pricingQuote?: PriceQuote;
  pricingQuoteStatus?: string;
  pricingQuoteComputedAt?: string | null;
  handisportPracticeLevel?: "leisure" | "competition";
  paymentStatus?: string;
  submittedAt?: string | null;
  updatedAt?: string | null;
};

type RegistrationDetail = RegistrationSummary & {
  adherentRole?: "self" | "minor_dependent" | "other_adult";
  sex?: "female" | "male" | "other";
  birthCity?: string;
  birthDate?: string;
  adherentEmail?: string;
  adherentPhonePrimary?: string;
  adherentPhoneSecondary?: string;
  addressLine1?: string;
  addressLine2?: string;
  postalCode?: string;
  city?: string;
  representatives?: Representative[];
  additionalSectionIds?: string[];
  slotIds?: string[];
  medicalCertificateStatusUpdatedAt?: string | null;
  medicalCertificateStatusUpdatedBy?: string;
  wantsRegistrationCertificate?: boolean;
  familyRegistrationOrder?: string;
  reductionTypes?: string[];
  passSportCode?: string;
  firstFemaleRegistrationSqy?: boolean;
  photoConsent?: "accept" | "refuse";
  emergencyMedicalAuthorization?: "yes" | "not_applicable_adult";
  supervisionAcknowledgement?: "yes" | "not_applicable_adult";
  internalRulesAccepted?: boolean;
  wantsCompetitorExtras?: boolean;
  competitionJerseySize?: string;
  competitionIds?: string[];
  reviewNotes?: string;
  paymentEmailSentTo?: string;
  stripeCheckoutUrl?: string;
};

type EditableRegistration = {
  adherentRole: "self" | "minor_dependent" | "other_adult";
  firstName: string;
  lastName: string;
  sex: "female" | "male" | "other";
  birthCity: string;
  birthDate: string;
  adherentEmail: string;
  adherentPhonePrimary: string;
  adherentPhoneSecondary: string;
  addressLine1: string;
  addressLine2: string;
  postalCode: string;
  city: string;
  representatives: Representative[];
  mainSectionId: string;
  additionalSectionIds: string[];
  slotIds: string[];
  medicalCertificateDeclaration: string;
  medicalCertificateStatus: MedicalCertificateStatus;
  wantsRegistrationCertificate: boolean;
  familyRegistrationOrder: string;
  reductionTypes: string[];
  passSportCode: string;
  firstFemaleRegistrationSqy: boolean | undefined;
  photoConsent: "accept" | "refuse";
  emergencyMedicalAuthorization: "yes" | "not_applicable_adult";
  supervisionAcknowledgement: "yes" | "not_applicable_adult";
  internalRulesAccepted: boolean;
  wantsCompetitorExtras: boolean;
  competitionJerseySize: string;
  competitionIds: string[];
  reviewNotes: string;
  amountEuros: string;
  handisportPracticeLevel: "" | "leisure" | "competition";
};

const STATUS_LABEL: Record<string, string> = {
  submitted: "A relire",
  in_review: "En relecture",
  payment_requested: "Paiement demandé",
  paid: "Payé",
  approved: "Approuvé",
  rejected: "Refusé",
};

const STATUS_COLOR: Record<string, "default" | "info" | "warning" | "success" | "error"> = {
  submitted: "warning",
  in_review: "info",
  payment_requested: "info",
  paid: "success",
  approved: "success",
  rejected: "error",
};

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

const MEDICAL_CERTIFICATE_STATUS_COLOR: Record<
  MedicalCertificateStatus,
  "default" | "info" | "warning" | "success"
> = {
  not_required: "default",
  required_not_received: "warning",
  received: "info",
  validated: "success",
};

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

const ALL_SLOT_OPTIONS = CLUB_REGISTRATION_SITES.flatMap((site) =>
  site.slots.map((slot) => ({
    value: slot.id,
    label: `${site.label} - ${slot.label}`,
  }))
);

function formatDate(iso: string | null | undefined): string {
  if (!iso) return "-";
  return new Date(iso).toLocaleString("fr-FR");
}

function formatAmount(cents: number | undefined): string {
  if (!Number.isFinite(cents)) return "-";
  return new Intl.NumberFormat("fr-FR", {
    style: "currency",
    currency: "EUR",
  }).format((cents ?? 0) / 100);
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

function toEditable(registration: RegistrationDetail): EditableRegistration {
  return {
    adherentRole: registration.adherentRole ?? "self",
    firstName: registration.firstName ?? "",
    lastName: registration.lastName ?? "",
    sex: registration.sex ?? "other",
    birthCity: registration.birthCity ?? "",
    birthDate: registration.birthDate ?? "",
    adherentEmail: registration.adherentEmail ?? "",
    adherentPhonePrimary: registration.adherentPhonePrimary ?? "",
    adherentPhoneSecondary: registration.adherentPhoneSecondary ?? "",
    addressLine1: registration.addressLine1 ?? "",
    addressLine2: registration.addressLine2 ?? "",
    postalCode: registration.postalCode ?? "",
    city: registration.city ?? "",
    representatives: registration.representatives ?? [],
    mainSectionId: registration.mainSectionId ?? SECTION_PRINCIPALE_OPTIONS[0].id,
    additionalSectionIds: registration.additionalSectionIds ?? [],
    slotIds: registration.slotIds ?? [],
    medicalCertificateDeclaration:
      registration.medicalCertificateDeclaration ?? "under_40_all_no",
    medicalCertificateStatus: normalizeMedicalCertificateStatus(
      registration.medicalCertificateStatus,
      registration.medicalCertificateDeclaration
    ),
    wantsRegistrationCertificate: registration.wantsRegistrationCertificate ?? false,
    familyRegistrationOrder: registration.familyRegistrationOrder ?? "none",
    reductionTypes: registration.reductionTypes ?? [],
    passSportCode: registration.passSportCode ?? "",
    firstFemaleRegistrationSqy: registration.firstFemaleRegistrationSqy,
    photoConsent: registration.photoConsent ?? "refuse",
    emergencyMedicalAuthorization:
      registration.emergencyMedicalAuthorization ?? "not_applicable_adult",
    supervisionAcknowledgement:
      registration.supervisionAcknowledgement ?? "not_applicable_adult",
    internalRulesAccepted: registration.internalRulesAccepted ?? false,
    wantsCompetitorExtras: registration.wantsCompetitorExtras ?? false,
    competitionJerseySize: registration.competitionJerseySize ?? "",
    competitionIds: normalizeCompetitionIds(registration.competitionIds ?? []),
    reviewNotes: registration.reviewNotes ?? "",
    amountEuros:
      typeof registration.paymentAmountCents === "number"
        ? String(registration.paymentAmountCents / 100)
        : "",
    handisportPracticeLevel: registration.handisportPracticeLevel ?? "",
  };
}

function formToPricingInput(form: EditableRegistration) {
  const input: Parameters<typeof buildPricingContext>[0] = {
    birthDate: form.birthDate,
    mainSectionId: form.mainSectionId,
    wantsCompetitorExtras: form.wantsCompetitorExtras,
    competitionIds: form.competitionIds,
    familyRegistrationOrder: form.familyRegistrationOrder as FamilyRegistrationOrder,
    sex: form.sex,
    reductionTypes: form.reductionTypes,
  };

  if (form.firstFemaleRegistrationSqy !== undefined) {
    input.firstFemaleRegistrationSqy = form.firstFemaleRegistrationSqy;
  }
  if (form.handisportPracticeLevel === "leisure" || form.handisportPracticeLevel === "competition") {
    input.handisportPracticeLevel = form.handisportPracticeLevel;
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

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <Typography variant="h6" fontWeight={800} sx={{ color: "primary.main" }}>
      {children}
    </Typography>
  );
}

function MultiSelectField({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string[];
  options: Array<{ value: string; label: string }>;
  onChange: (value: string[]) => void;
}) {
  const labelId = `${label.replace(/\s+/g, "-").toLowerCase()}-label`;
  return (
    <FormControl fullWidth>
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select<string[]>
        multiple
        labelId={labelId}
        value={value}
        input={<OutlinedInput label={label} />}
        renderValue={(selected: string[]) =>
          selected
            .map((id) => options.find((option) => option.value === id)?.label ?? id)
            .join(", ")
        }
        onChange={(event: SelectChangeEvent<string[]>) => {
          const next = event.target.value;
          onChange(typeof next === "string" ? next.split(",") : next);
        }}
      >
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            <Checkbox checked={value.includes(option.value)} />
            <ListItemText primary={option.label} />
          </MenuItem>
        ))}
      </Select>
    </FormControl>
  );
}

export function MembershipRequestsClient() {
  const [registrations, setRegistrations] = useState<RegistrationSummary[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selected, setSelected] = useState<RegistrationDetail | null>(null);
  const [form, setForm] = useState<EditableRegistration | null>(null);
  const [loadingList, setLoadingList] = useState(true);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestingPayment, setRequestingPayment] = useState(false);
  const [persistingQuote, setPersistingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchRegistrations = useCallback(async () => {
    setLoadingList(true);
    setError(null);
    try {
      const res = await fetch("/api/club/registrations?scope=managed", {
        credentials: "include",
      });
      const json = await res.json();
      if (!res.ok || json.error) {
        throw new Error(json.error || "Impossible de charger les demandes.");
      }
      setRegistrations(json.registrations ?? []);
      if (!selectedId && json.registrations?.[0]?.id) {
        setSelectedId(json.registrations[0].id);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement.");
    } finally {
      setLoadingList(false);
    }
  }, [selectedId]);

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
      setSelected(json.registration);
      setForm(toEditable(json.registration));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur de chargement.");
      setSelected(null);
      setForm(null);
    } finally {
      setLoadingDetail(false);
    }
  }, []);

  useEffect(() => {
    void fetchRegistrations();
  }, [fetchRegistrations]);

  useEffect(() => {
    if (selectedId) {
      void fetchDetail(selectedId);
    }
  }, [fetchDetail, selectedId]);

  const selectedSummary = useMemo(
    () => registrations.find((registration) => registration.id === selectedId) ?? null,
    [registrations, selectedId]
  );

  const liveQuote = useMemo(() => {
    if (!form?.birthDate) {
      return null;
    }
    return calculateQuote(buildPricingContext(formToPricingInput(form)));
  }, [form]);

  const enteredAmountCents = useMemo(() => {
    if (!form) return null;
    return parseAmountCents(form.amountEuros);
  }, [form]);

  const amountDiffersFromQuote =
    liveQuote !== null &&
    liveQuote.totalCents > 0 &&
    enteredAmountCents !== null &&
    enteredAmountCents !== liveQuote.totalCents;

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
          medicalCertificateDeclaration: form.medicalCertificateDeclaration,
          medicalCertificateStatus: form.medicalCertificateStatus,
          wantsRegistrationCertificate: form.wantsRegistrationCertificate,
          familyRegistrationOrder: form.familyRegistrationOrder,
          reductionTypes: form.reductionTypes,
          passSportCode: form.passSportCode,
          firstFemaleRegistrationSqy:
            form.sex === "female" ? form.firstFemaleRegistrationSqy ?? false : undefined,
          photoConsent: form.photoConsent,
          emergencyMedicalAuthorization: form.emergencyMedicalAuthorization,
          supervisionAcknowledgement: form.supervisionAcknowledgement,
          internalRulesAccepted: form.internalRulesAccepted,
          wantsCompetitorExtras: form.wantsCompetitorExtras,
          competitionJerseySize: form.competitionJerseySize || undefined,
          competitionIds: form.competitionIds,
          reviewNotes: form.reviewNotes,
          handisportPracticeLevel:
            form.mainSectionId === "handisport" && form.handisportPracticeLevel
              ? form.handisportPracticeLevel
              : undefined,
          ...(amountCents !== null ? { paymentAmountCents: amountCents } : {}),
        }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        throw new Error(json.error || "Impossible d'enregistrer les corrections.");
      }
      setSuccess("Dossier mis à jour.");
      await Promise.all([fetchRegistrations(), fetchDetail(selectedId)]);
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
    updateField("amountEuros", String(liveQuote.totalCents / 100));
    setSuccess("Montant aligné sur le devis calculé.");
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
            handisportPracticeLevel:
              form.mainSectionId === "handisport" && form.handisportPracticeLevel
                ? form.handisportPracticeLevel
                : undefined,
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
      await Promise.all([fetchRegistrations(), fetchDetail(selectedId)]);
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
      setSuccess("Demande de paiement envoyée par e-mail.");
      await Promise.all([fetchRegistrations(), fetchDetail(selectedId)]);
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
          subtitle="Relisez et corrigez le dossier complet avant d'envoyer la demande de paiement Stripe."
          actions={
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={() => fetchRegistrations()}
              disabled={loadingList}
            >
              Actualiser
            </Button>
          }
        />

        {error ? <Alert severity="error" onClose={() => setError(null)}>{error}</Alert> : null}
        {success ? (
          <Alert severity="success" onClose={() => setSuccess(null)}>{success}</Alert>
        ) : null}

        <Grid container spacing={3}>
          <Grid size={{ xs: 12, md: 4 }}>
            <Stack spacing={1.5}>
              {loadingList ? (
                <Box sx={{ display: "flex", justifyContent: "center", py: 5 }}>
                  <CircularProgress />
                </Box>
              ) : registrations.length === 0 ? (
                <Alert severity="info">Aucune demande d&apos;adhésion pour le moment.</Alert>
              ) : (
                registrations.map((registration) => {
                  const active = registration.id === selectedId;
                  return (
                    <Card
                      key={registration.id}
                      variant={active ? "elevation" : "outlined"}
                      sx={{
                        borderColor: active ? "primary.main" : undefined,
                        cursor: "pointer",
                      }}
                      onClick={() => setSelectedId(registration.id)}
                    >
                      <CardContent sx={{ pb: 1 }}>
                        <Stack spacing={1}>
                          <Stack direction="row" justifyContent="space-between" spacing={1}>
                            <Typography variant="subtitle1" fontWeight={700}>
                              {registration.firstName ?? "-"} {registration.lastName ?? ""}
                            </Typography>
                            <Chip
                              size="small"
                              label={STATUS_LABEL[registration.status ?? ""] ?? "Statut inconnu"}
                              color={STATUS_COLOR[registration.status ?? ""] ?? "default"}
                            />
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
                                MEDICAL_CERTIFICATE_STATUS_LABELS[
                                  registration.medicalCertificateStatus
                                ]
                              }
                              color={
                                MEDICAL_CERTIFICATE_STATUS_COLOR[
                                  registration.medicalCertificateStatus
                                ]
                              }
                              sx={{ alignSelf: "flex-start" }}
                            />
                          ) : null}
                        </Stack>
                      </CardContent>
                      <CardActions sx={{ px: 2, pt: 0, pb: 1.5 }}>
                        <Typography variant="caption" color="text.secondary">
                          {formatAmount(registration.paymentAmountCents)}
                        </Typography>
                      </CardActions>
                    </Card>
                  );
                })
              )}
            </Stack>
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
                        label={STATUS_LABEL[selectedSummary?.status ?? selected.status ?? ""] ?? selected.status}
                        color={STATUS_COLOR[selectedSummary?.status ?? selected.status ?? ""] ?? "default"}
                      />
                    </Stack>

                    <Divider />

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
                          {SECTION_PRINCIPALE_OPTIONS.map((section) => (
                            <MenuItem key={section.id} value={section.id}>
                              {section.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <MultiSelectField
                          label="Sections additionnelles"
                          value={form.additionalSectionIds}
                          options={SECTION_PRINCIPALE_OPTIONS.map((section) => ({
                            value: section.id,
                            label: section.label,
                          }))}
                          onChange={(value) => updateField("additionalSectionIds", value)}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <MultiSelectField
                          label="Créneaux"
                          value={form.slotIds}
                          options={ALL_SLOT_OPTIONS}
                          onChange={(value) => updateField("slotIds", value)}
                        />
                      </Grid>
                    </Grid>

                    <SectionTitle>Dossier administratif</SectionTitle>
                    <Grid container spacing={2}>
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
                        <MultiSelectField
                          label="Aides / réductions"
                          value={form.reductionTypes}
                          options={REDUCTION_OPTIONS.map((reduction) => ({
                            value: reduction.id,
                            label: reduction.label,
                          }))}
                          onChange={(value) => updateField("reductionTypes", value)}
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField label="Code Pass Sport" value={form.passSportCode} onChange={(e) => updateField("passSportCode", e.target.value)} fullWidth />
                      </Grid>
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
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <FormControlLabel
                          control={<Checkbox checked={form.wantsCompetitorExtras} onChange={(e) => updateField("wantsCompetitorExtras", e.target.checked)} />}
                          label="Options compétiteur"
                        />
                      </Grid>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField select label="Taille maillot compétition" value={form.competitionJerseySize} onChange={(e) => updateField("competitionJerseySize", e.target.value)} fullWidth>
                          <MenuItem value="">Non renseignée</MenuItem>
                          {JERSEY_SIZES.map((size) => (
                            <MenuItem key={size} value={size}>{size}</MenuItem>
                          ))}
                        </TextField>
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <MultiSelectField
                          label="Compétitions demandées"
                          value={form.competitionIds}
                          options={COMPETITION_OPTIONS.map((competition) => ({
                            value: competition.id,
                            label: competition.label,
                          }))}
                          onChange={(value) => updateField("competitionIds", value)}
                        />
                      </Grid>
                    </Grid>

                    <SectionTitle>Tarification</SectionTitle>
                    <Stack spacing={2}>
                      {form.mainSectionId === "handisport" ? (
                        <TextField
                          select
                          label="Pratique handisport"
                          value={form.handisportPracticeLevel}
                          onChange={(e) =>
                            updateField(
                              "handisportPracticeLevel",
                              e.target.value as EditableRegistration["handisportPracticeLevel"]
                            )
                          }
                          fullWidth
                          helperText="Requis pour calculer le tarif handisport."
                        >
                          <MenuItem value="">Non renseigné</MenuItem>
                          {HANDISPORT_PRACTICE_OPTIONS.map((option) => (
                            <MenuItem key={option.id} value={option.id}>
                              {option.label}
                            </MenuItem>
                          ))}
                        </TextField>
                      ) : null}

                      <PricingBreakdown
                        draft={{
                          birthDate: form.birthDate,
                          mainSectionId: form.mainSectionId,
                          wantsCompetitorExtras: form.wantsCompetitorExtras,
                          competitionIds: form.competitionIds,
                          familyRegistrationOrder:
                            form.familyRegistrationOrder as RegistrationDraft["familyRegistrationOrder"],
                          sex: form.sex,
                          firstFemaleRegistrationSqy: form.firstFemaleRegistrationSqy,
                          handisportPracticeLevel: form.handisportPracticeLevel,
                          reductionTypes: form.reductionTypes,
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
                          {formatCentsAsEuros(enteredAmountCents ?? 0)}) diffère du devis
                          calculé ({formatCentsAsEuros(liveQuote?.totalCents ?? 0)}).
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

                    <SectionTitle>Paiement et notes internes</SectionTitle>
                    <Grid container spacing={2}>
                      <Grid size={{ xs: 12, sm: 6 }}>
                        <TextField
                          label="Montant à régler"
                          value={form.amountEuros}
                          onChange={(e) => updateField("amountEuros", e.target.value)}
                          fullWidth
                          InputProps={{
                            startAdornment: (
                              <InputAdornment position="start">
                                <EuroIcon fontSize="small" />
                              </InputAdornment>
                            ),
                          }}
                        />
                      </Grid>
                      <Grid size={{ xs: 12 }}>
                        <TextField
                          label="Notes internes"
                          value={form.reviewNotes}
                          onChange={(e) => updateField("reviewNotes", e.target.value)}
                          fullWidth
                          multiline
                          minRows={3}
                        />
                      </Grid>
                    </Grid>

                    {selected.paymentEmailSentTo ? (
                      <Alert severity="info">
                        Dernière demande de paiement envoyée à {selected.paymentEmailSentTo}.
                      </Alert>
                    ) : null}

                    <Stack direction={{ xs: "column", sm: "row" }} spacing={1.5} justifyContent="flex-end">
                      <Button
                        variant="outlined"
                        startIcon={<SaveIcon />}
                        onClick={save}
                        disabled={saving || requestingPayment || persistingQuote}
                      >
                        {saving ? "Enregistrement..." : "Enregistrer"}
                      </Button>
                      <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<MarkEmailReadIcon />}
                        onClick={requestPayment}
                        disabled={saving || requestingPayment || persistingQuote}
                      >
                        {requestingPayment ? "Envoi..." : "Valider et demander le paiement"}
                      </Button>
                    </Stack>
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
