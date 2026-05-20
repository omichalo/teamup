"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Alert,
  AlertTitle,
  Box,
  Button,
  CircularProgress,
  Paper,
  Stack,
  Step,
  StepButton,
  Stepper,
  Typography,
} from "@mui/material";
import { visuallyHidden } from "@mui/utils";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import ArrowBackIcon from "@mui/icons-material/ArrowBack";
import ArrowForwardIcon from "@mui/icons-material/ArrowForward";
import SendIcon from "@mui/icons-material/Send";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import "dayjs/locale/fr";
import { PageHeader, SectionCard, StepProgressBar } from "@/components/ui";
import { normalizeCompetitionIds } from "@/lib/club-registration/competition-ids";
import { isValidFrenchPhoneSurface } from "@/lib/club-registration/phone-fr";
import type { ClubRegistrationPayload } from "@/lib/club-registration/schema";
import { clubRegistrationPayloadSchema } from "@/lib/club-registration/schema";
import { isAtLeast40At, isMinorAt } from "@/lib/club-registration/age";
import {
  deriveMedicalCertificateDeclaration,
  effectiveHadFfttLicense,
  isMedicalAdminStepComplete,
} from "@/lib/club-registration/medical-dossier";
import {
  firstStepWithError,
  stepsWithError,
  type RegistrationStepId,
} from "@/lib/club-registration/field-to-step";
import { submitRegistration } from "@/lib/club-registration/submit";
import type { RegistrationDraft } from "./registration-defaults";
import { AudienceStep } from "./AudienceStep";
import { AdherentStep } from "./AdherentStep";
import { RepresentativesStep } from "./RepresentativesStep";
import { PracticeStep } from "./PracticeStep";
import { AdminStep } from "./AdminStep";
import { EngagementsStep } from "./EngagementsStep";
import { RecapStep } from "./RecapStep";
import { RegistrationSidebar } from "./RegistrationSidebar";
import { useRegistrationDraft } from "./useRegistrationDraft";
import { useRegistrationDraftStorage } from "./useRegistrationDraftStorage";
import { DraftStorageDisclosure } from "./DraftStorageDisclosure";
import { AccountEmailTransparencyBanner } from "./AccountEmailTransparencyBanner";
import { AuthDialog } from "@/components/auth/AuthDialog";

const STEP_TITLES: Record<RegistrationStepId, string> = {
  audience: "Pour qui ?",
  adherent: "L’adhérent",
  representatives: "Représentants légaux",
  practice: "Pratique sportive",
  admin: "Dossier administratif",
  engagements: "Engagements à signer",
  recap: "Récapitulatif",
};

const STEP_SHORT_LABELS: Record<RegistrationStepId, string> = {
  audience: "Profil",
  adherent: "Adhérent",
  representatives: "Représentants",
  practice: "Pratique",
  admin: "Dossier",
  engagements: "Engagements",
  recap: "Récap",
};

const STEP_DESCRIPTIONS: Record<RegistrationStepId, string> = {
  audience:
    "Indiquez pour qui est l’inscription et, si vous en avez une, votre licence FFTT.",
  adherent:
    "Identité, contact et adresse postale de la personne qui pratiquera au club.",
  representatives:
    "Coordonnées du ou des représentants légaux (un obligatoire, un second facultatif).",
  practice:
    "Lieu principal, lieux complémentaires, créneaux et extension compétiteur si vous le souhaitez.",
  admin:
    "Déclaration médicale, inscription familiale, Pass Sport et autres aides, demande d’attestation.",
  engagements:
    "Diffusion d’images, autorisations légales pour les mineurs et acceptation du règlement intérieur.",
  recap: "Vérifiez votre dossier avant envoi au club.",
};

/** Étape conditionnelle pour les inscriptions de mineurs uniquement. */
function buildSequence(draft: RegistrationDraft): RegistrationStepId[] {
  const needsRepresentatives =
    draft.adherentRole === "minor_dependent" || isMinorAt(draft.birthDate);
  const base: RegistrationStepId[] = ["audience", "adherent"];
  if (needsRepresentatives) base.push("representatives");
  base.push("practice", "admin", "engagements", "recap");
  return base;
}

function validateStepById(
  stepId: RegistrationStepId,
  draft: RegistrationDraft
): string | null {
  if (stepId === "audience") {
    if (!draft.birthDate) return "Indiquez la date de naissance.";
    const minor = isMinorAt(draft.birthDate);
    if (minor && draft.adherentRole === "self") {
      return "La date de naissance correspond à un mineur : passez en mode « mineur dont je suis le représentant légal ».";
    }
    return null;
  }

  if (stepId === "adherent") {
    if (!draft.firstName.trim()) return "Indiquez le prénom de l’adhérent.";
    if (!draft.lastName.trim()) return "Indiquez le nom de l’adhérent.";
    if (!draft.sex) return "Indiquez le sexe de l’adhérent.";
    if (!draft.birthCity.trim()) return "Indiquez la ville de naissance.";

    const minor = isMinorAt(draft.birthDate);
    if (!minor && !draft.adherentEmail?.trim()) {
      return "Indiquez l’e-mail de contact de l’adhérent.";
    }
    if (draft.adherentEmail && draft.adherentEmail.trim() !== "") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.adherentEmail.trim())) {
        return "L’adresse e-mail de contact est invalide.";
      }
    }

    if (!draft.adherentPhonePrimary.trim()) {
      return "Indiquez un téléphone principal.";
    }
    if (!isValidFrenchPhoneSurface(draft.adherentPhonePrimary)) {
      return "Le téléphone principal doit être un numéro français valide (10 chiffres ou +33).";
    }
    const sec = draft.adherentPhoneSecondary?.trim();
    if (sec && !isValidFrenchPhoneSurface(sec)) {
      return "Le téléphone secondaire doit être un numéro français valide.";
    }

    const addr1 = draft.addressLine1.trim();
    const pc = draft.postalCode.trim();
    const city = draft.city.trim();
    if (!addr1 || !pc || !city) {
      return "Veuillez sélectionner une adresse ou saisir l’adresse manuellement.";
    }
    if (!/^[0-9]{5}$/.test(pc)) {
      return "Code postal français à 5 chiffres.";
    }
    return null;
  }

  if (stepId === "representatives") {
    if (draft.representatives.length === 0) {
      return "Au moins un représentant légal est obligatoire pour l’inscription d’un mineur.";
    }
    for (let i = 0; i < draft.representatives.length; i++) {
      const r = draft.representatives[i];
      const isFirstRequired = i === 0;
      if (isFirstRequired) {
        if (!r.firstName.trim() || !r.lastName.trim()) {
          return `Représentant ${i + 1} : prénom et nom obligatoires.`;
        }
        if (!r.email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())) {
          return `Représentant ${i + 1} : adresse e-mail invalide.`;
        }
        if (!r.phone.trim() || !isValidFrenchPhoneSurface(r.phone)) {
          return `Représentant ${i + 1} : téléphone invalide.`;
        }
      } else if (
        r.firstName.trim() ||
        r.lastName.trim() ||
        r.email.trim() ||
        r.phone.trim()
      ) {
        if (!r.firstName.trim() || !r.lastName.trim()) {
          return `Représentant ${i + 1} : prénom et nom obligatoires si vous le renseignez.`;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r.email.trim())) {
          return `Représentant ${i + 1} : adresse e-mail invalide.`;
        }
        if (!isValidFrenchPhoneSurface(r.phone)) {
          return `Représentant ${i + 1} : téléphone invalide.`;
        }
      }
    }
    if (draft.representatives.length === 2) {
      const a = draft.representatives[0].email.trim().toLowerCase();
      const b = draft.representatives[1].email.trim().toLowerCase();
      if (a && b && a === b) {
        return "Les deux représentants doivent avoir des adresses e-mail différentes.";
      }
    }
    return null;
  }

  if (stepId === "practice") {
    if (draft.slotIds.length === 0) return "Sélectionnez au moins un créneau.";
    if (
      draft.mainSectionId === "handisport" &&
      draft.handisportPracticeLevel !== "leisure" &&
      draft.handisportPracticeLevel !== "competition"
    ) {
      return "Indiquez si la pratique handisport est en loisir ou en compétition.";
    }
    if (draft.wantsCompetitorExtras && !draft.competitionJerseySize) {
      return "Indiquez une taille de maillot pour la section compétiteur.";
    }
    return null;
  }

  if (stepId === "admin") {
    const atLeast40 = isAtLeast40At(draft.birthDate);
    const decl = draft.medicalCertificateDeclaration;
    if (
      !decl ||
      !isMedicalAdminStepComplete({
        birthDate: draft.birthDate,
        questionnaire: draft.medicalQuestionnaire,
        veteranPath: draft.medicalVeteranPath,
        hasVerifiedFfttLicense: Boolean(draft.ffttLicenseLookup?.licence),
      })
    ) {
      return "Répondez aux questions de la déclaration médicale.";
    }
    if (
      !atLeast40 &&
      (decl === "over_40_cert_unchanged_all_no" ||
        decl === "over_40_first_or_changed_certificate_required")
    ) {
      return "La déclaration médicale sélectionnée est réservée aux 40 ans et plus.";
    }
    if (atLeast40 && decl === "under_40_all_no") {
      return "La déclaration médicale « moins de 40 ans » n’est pas applicable à votre date de naissance.";
    }
    return null;
  }

  if (stepId === "engagements") {
    if (!draft.photoConsent) {
      return "Indiquez votre choix sur la diffusion d’images (acte de consentement explicite).";
    }
    if (isMinorAt(draft.birthDate)) {
      if (draft.emergencyMedicalAuthorization !== "yes") {
        return "Cochez l’autorisation d’actes médicaux d’urgence (obligatoire pour un mineur).";
      }
      if (draft.supervisionAcknowledgement !== "yes") {
        return "Cochez l’engagement de prise en charge à l’heure des cours (obligatoire pour un mineur).";
      }
    }
    if (!draft.rulesAccepted) {
      return "Vous devez accepter le règlement intérieur pour continuer.";
    }
    return null;
  }

  if (stepId === "recap") return null;
  return null;
}

/**
 * Permet d'accéder à l'étape cible : retour libre ; étapes suivantes seulement
 * si les étapes intermédiaires sont valides.
 */
function canNavigateToStep(
  targetIndex: number,
  activeStep: number,
  sequence: ReadonlyArray<RegistrationStepId>,
  draft: RegistrationDraft
): boolean {
  if (targetIndex <= activeStep) return true;
  for (let s = activeStep; s < targetIndex; s++) {
    if (validateStepById(sequence[s], draft) !== null) return false;
  }
  return true;
}

type Props = {
  /** Email du compte connecté, ou null en mode anonyme. */
  accountEmail: string | null;
};

export function ClubRegistrationWizard({ accountEmail }: Props) {
  const { draft, actions } = useRegistrationDraft();
  const storage = useRegistrationDraftStorage();
  const [activeStep, setActiveStep] = useState(0);
  const [hydrating, setHydrating] = useState(true);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[] | undefined> | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const pendingPayloadRef = useRef<ClubRegistrationPayload | null>(null);
  const hasHydratedRef = useRef(false);
  const accountEmailAutofillRef = useRef<{
    selfContact?: string;
    representativeContact?: string;
  }>({});
  const cardRef = useRef<HTMLDivElement | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const prevActiveStepRef = useRef(0);
  const scrollPositionsRef = useRef<Map<number, number>>(new Map());

  /* Hydratation au mount : local-first, fallback éventuel sur le draft serveur. */
  const storageLoad = storage.load;
  const hydrate = actions.hydrate;
  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;
    const local = storageLoad();
    if (local) hydrate(local);
    setHydrating(false);
  }, [hydrate, storageLoad]);

  /* Séquence d'étapes dynamique (5 étapes pour un majeur, 6 pour un mineur,
     toutes hors récap). La séquence est reconstruite à chaque changement de
     `adherentRole` ou de `birthDate`. */
  const sequence = useMemo<RegistrationStepId[]>(
    () => buildSequence(draft),
    [draft]
  );
  const totalSteps = sequence.length;
  const currentStepId = sequence[activeStep] ?? "audience";

  /* Si la séquence vient de raccourcir (passage mineur → majeur après coup) et
     que l'utilisateur se trouve au-delà de la dernière étape, on le ramène sur
     la dernière étape valide pour éviter un index hors borne. */
  useEffect(() => {
    if (activeStep >= sequence.length) {
      setActiveStep(Math.max(0, sequence.length - 1));
    }
  }, [activeStep, sequence.length]);

  const stepValidity = useMemo<(string | null)[]>(
    () => sequence.map((id) => validateStepById(id, draft)),
    [draft, sequence]
  );

  const completedStepsCount = useMemo(
    () =>
      stepValidity
        .slice(0, sequence.length - 1) // exclure le récap
        .filter((v) => v === null).length,
    [stepValidity, sequence.length]
  );

  /* Auto-save à chaque changement de draft. */
  const storageSave = storage.save;
  useEffect(() => {
    if (hydrating) return;
    storageSave(draft);
  }, [draft, hydrating, storageSave]);

  /* Préremplissage non destructif depuis le compte connecté. L'utilisateur
     peut ensuite modifier ou vider le champ sans qu'on le remplisse à nouveau. */
  useEffect(() => {
    if (!accountEmail) return;
    if (
      draft.adherentRole === "self" &&
      !draft.adherentEmail?.trim() &&
      accountEmailAutofillRef.current.selfContact !== accountEmail
    ) {
      accountEmailAutofillRef.current.selfContact = accountEmail;
      actions.patchFields({ adherentEmail: accountEmail });
    }
  }, [accountEmail, actions, draft.adherentEmail, draft.adherentRole]);

  useEffect(() => {
    if (!accountEmail || draft.adherentRole !== "minor_dependent") return;
    const first = draft.representatives[0];
    if (
      first &&
      !first.email.trim() &&
      accountEmailAutofillRef.current.representativeContact !== accountEmail
    ) {
      accountEmailAutofillRef.current.representativeContact = accountEmail;
      actions.updateRepresentative(0, { email: accountEmail });
    }
  }, [accountEmail, actions, draft.adherentRole, draft.representatives]);

  /* Sur fieldErrors serveur, on saute à la 1ʳᵉ étape qui contient une erreur
     et on fait défiler la vue vers le premier champ concerné. */
  useEffect(() => {
    if (!fieldErrors || Object.keys(fieldErrors).length === 0) return;
    const target = firstStepWithError(fieldErrors, sequence);
    if (target === null) return;
    if (target !== activeStep) {
      setActiveStep(target);
    }
    const errantFields = Object.entries(fieldErrors).filter(
      ([, msgs]) => Array.isArray(msgs) && msgs.length > 0
    );
    if (errantFields.length === 0) return;
    const firstField = errantFields[0][0];
    let raf2: number | undefined;
    const raf1 = requestAnimationFrame(() => {
      raf2 = requestAnimationFrame(() => {
        const escaped =
          typeof CSS !== "undefined" && typeof CSS.escape === "function"
            ? CSS.escape(firstField)
            : firstField;
        const el = document.querySelector<HTMLElement>(
          `[name="${escaped}"], [data-field="${escaped}"]`
        );
        if (el) {
          el.scrollIntoView({ behavior: "smooth", block: "center" });
          if (typeof el.focus === "function") {
            try {
              el.focus({ preventScroll: true });
            } catch {
              /* Certains éléments ne supportent pas focus(); on ignore. */
            }
          }
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== undefined) cancelAnimationFrame(raf2);
    };
  }, [fieldErrors, activeStep, sequence]);

  /* Focus management au changement d'étape. */
  useEffect(() => {
    const previous = prevActiveStepRef.current;
    if (previous === activeStep) return;
    if (typeof window !== "undefined") {
      scrollPositionsRef.current.set(previous, window.scrollY);
    }
    prevActiveStepRef.current = activeStep;
    const goingBackward = activeStep < previous;
    const memorized = scrollPositionsRef.current.get(activeStep);
    if (goingBackward && typeof memorized === "number") {
      window.scrollTo({ top: memorized, behavior: "smooth" });
    } else {
      cardRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    }
    const hasServerFieldErrors =
      fieldErrors !== null &&
      Object.values(fieldErrors).some(
        (msgs) => Array.isArray(msgs) && msgs.length > 0
      );
    if (hasServerFieldErrors) return;
    const raf = requestAnimationFrame(() => {
      stepHeadingRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [activeStep, fieldErrors]);

  const handleNext = () => {
    setSubmitError(null);
    const err = validateStepById(currentStepId, draft);
    if (err) {
      setSubmitError(err);
      return;
    }
    setActiveStep((s) => Math.min(s + 1, totalSteps - 1));
  };

  const handleBack = () => {
    setSubmitError(null);
    setActiveStep((s) => Math.max(s - 1, 0));
  };

  const handleGoToStep = useCallback(
    (to: number) => {
      setSubmitError(null);
      setFieldErrors(null);
      if (to === activeStep) return;
      if (to < activeStep) {
        setActiveStep(to);
        return;
      }
      for (let s = activeStep; s < to; s++) {
        const err = validateStepById(sequence[s], draft);
        if (err) {
          setSubmitError(err);
          setActiveStep(s);
          return;
        }
      }
      setActiveStep(to);
    },
    [activeStep, draft, sequence]
  );

  /** Navigation vers une étape par son identifiant symbolique (utilisée par
   * le récap et les boutons « Modifier »). */
  const handleGoToStepId = useCallback(
    (stepId: RegistrationStepId) => {
      const idx = sequence.indexOf(stepId);
      if (idx === -1) return;
      handleGoToStep(idx);
    },
    [handleGoToStep, sequence]
  );

  const buildPayload = (): ClubRegistrationPayload | null => {
    const {
      rulesAccepted: _rulesAccepted,
      sex,
      photoConsent,
      medicalCertificateDeclaration: _decl,
      medicalQuestionnaire,
      medicalVeteranPath,
      ...rest
    } = draft;
    void _rulesAccepted;
    void _decl;
    const hasVerifiedFfttLicense = Boolean(draft.ffttLicenseLookup?.licence);
    const medicalCertificateDeclaration = deriveMedicalCertificateDeclaration({
      birthDate: draft.birthDate,
      questionnaire: medicalQuestionnaire,
      veteranPath: medicalVeteranPath,
      hasVerifiedFfttLicense,
    });
    if (
      sex === "" ||
      photoConsent === "" ||
      medicalCertificateDeclaration === "" ||
      !isMedicalAdminStepComplete({
        birthDate: draft.birthDate,
        questionnaire: medicalQuestionnaire,
        veteranPath: medicalVeteranPath,
        hasVerifiedFfttLicense,
      })
    ) {
      return null;
    }
    const atLeast40 = isAtLeast40At(draft.birthDate);
    const hadLicense = effectiveHadFfttLicense(
      medicalVeteranPath,
      hasVerifiedFfttLicense
    );
    const isAdaptedMainSection =
      draft.mainSectionId === "handisport" ||
      draft.mainSectionId === "sport-adapte";
    const effectiveCompetitorExtras =
      !isAdaptedMainSection && draft.wantsCompetitorExtras;
    const minor = isMinorAt(draft.birthDate);
    const emergencyMedicalAuthorization = minor
      ? draft.emergencyMedicalAuthorization
      : ("not_applicable_adult" as const);
    const supervisionAcknowledgement = minor
      ? draft.supervisionAcknowledgement
      : ("not_applicable_adult" as const);
    return {
      ...rest,
      sex,
      photoConsent,
      medicalQuestionnaire: {
        ...(medicalQuestionnaire.summary !== ""
          ? { summary: medicalQuestionnaire.summary }
          : {}),
        answers: medicalQuestionnaire.answers,
      },
      medicalVeteranPath: atLeast40
        ? hadLicense === "yes"
          ? {
              hadFfttLicense: hadLicense,
              categoryChanged: medicalVeteranPath.categoryChanged as
                | "yes"
                | "no",
            }
          : { hadFfttLicense: hadLicense as "yes" | "no" }
        : undefined,
      medicalCertificateDeclaration,
      emergencyMedicalAuthorization,
      supervisionAcknowledgement,
      internalRulesAccepted: true as const,
      wantsCompetitorExtras: effectiveCompetitorExtras,
      competitionJerseySize:
        effectiveCompetitorExtras && draft.competitionJerseySize
          ? draft.competitionJerseySize
          : undefined,
      competitionIds: effectiveCompetitorExtras
        ? normalizeCompetitionIds(draft.competitionIds)
        : [],
      handisportPracticeLevel:
        draft.mainSectionId === "handisport" &&
        (draft.handisportPracticeLevel === "leisure" ||
          draft.handisportPracticeLevel === "competition")
          ? draft.handisportPracticeLevel
          : undefined,
    };
  };

  const performSubmit = useCallback(
    async (payload: ClubRegistrationPayload) => {
      setSubmitError(null);
      setFieldErrors(null);
      setSubmitting(true);
      try {
        const result = await submitRegistration(payload);
        if (result.ok) {
          storage.clear();
          actions.reset();
          setActiveStep(0);
          window.location.assign(
            `/club/mes-inscriptions?created=${encodeURIComponent(result.id)}`
          );
          return;
        }
        if (result.fieldErrors) {
          setFieldErrors(result.fieldErrors);
        }
        setSubmitError(result.error);
      } finally {
        setSubmitting(false);
      }
    },
    [actions, storage]
  );

  const handleSubmit = async () => {
    setSubmitError(null);
    setFieldErrors(null);
    /* On rejoue la validation de toutes les étapes (hors récap) pour rattraper
       les cas de navigation libre via le stepper. */
    for (let i = 0; i < sequence.length - 1; i++) {
      const err = validateStepById(sequence[i], draft);
      if (err) {
        setSubmitError(err);
        setActiveStep(i);
        return;
      }
    }
    const payload = buildPayload();
    if (!payload) {
      setSubmitError("Certaines informations obligatoires sont manquantes.");
      return;
    }
    const parsed = clubRegistrationPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(
        parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>
      );
      setSubmitError("Certaines informations sont invalides ou incomplètes.");
      return;
    }
    if (!accountEmail) {
      pendingPayloadRef.current = payload;
      setAuthDialogOpen(true);
      return;
    }
    await performSubmit(payload);
  };

  const handleAuthSuccess = useCallback(async () => {
    setAuthDialogOpen(false);
    const payload = pendingPayloadRef.current;
    pendingPayloadRef.current = null;
    if (!payload) return;
    await performSubmit(payload);
  }, [performSubmit]);

  const stepLabel = STEP_TITLES[currentStepId];
  const stepShortLabel = STEP_SHORT_LABELS[currentStepId];
  const stepDescription = STEP_DESCRIPTIONS[currentStepId];
  const isRecap = currentStepId === "recap";
  const submitLabelShort = accountEmail
    ? submitting
      ? "Envoi…"
      : "Envoyer"
    : "Se connecter";
  const submitLabelLong = accountEmail
    ? submitting
      ? "Envoi en cours…"
      : "Envoyer ma demande au club"
    : "Se connecter pour envoyer";
  const authInitialEmail =
    draft.adherentRole === "minor_dependent"
      ? draft.representatives[0]?.email || accountEmail || undefined
      : draft.adherentEmail || accountEmail || undefined;

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Inscription au club"
          title="Préparez votre dossier"
          subtitle="Renseignez les informations nécessaires pour demander votre adhésion au club."
        />

        <SectionCard padding="compact" contentSx={{ py: 2 }}>
          <Stack spacing={2}>
            <StepProgressBar
              activeStep={activeStep}
              totalSteps={totalSteps}
              activeLabel={stepShortLabel}
              value={Math.round(
                (completedStepsCount / Math.max(1, totalSteps - 1)) * 100
              )}
              ariaLabel={`Progression : ${completedStepsCount} étape${
                completedStepsCount > 1 ? "s" : ""
              } sur ${totalSteps - 1} validée${completedStepsCount > 1 ? "s" : ""}`}
            />

            <Stepper
              activeStep={activeStep}
              nonLinear
              alternativeLabel
              sx={{
                display: { xs: "none", lg: "flex" },
                pt: 1,
                "& .MuiStepLabel-label": { mt: 0.5 },
              }}
            >
              {sequence.map((stepId, index) => {
                const isPast = index < activeStep;
                const stepInvalid = stepValidity[index] !== null;
                const completed = isPast && !stepInvalid;
                return (
                  <Step key={stepId} completed={completed}>
                    <StepButton
                      color="inherit"
                      disabled={
                        !canNavigateToStep(index, activeStep, sequence, draft)
                      }
                      onClick={() => handleGoToStep(index)}
                      icon={
                        isPast && stepInvalid ? (
                          <ErrorOutlineIcon color="error" fontSize="small" />
                        ) : undefined
                      }
                      optional={
                        isPast && stepInvalid ? (
                          <Typography variant="caption" color="error">
                            À corriger
                          </Typography>
                        ) : undefined
                      }
                    >
                      {STEP_TITLES[stepId]}
                    </StepButton>
                  </Step>
                );
              })}
            </Stepper>

            <Stack
              direction="row"
              flexWrap="wrap"
              useFlexGap
              sx={{ gap: 1, display: { lg: "none" } }}
            >
              {sequence.map((stepId, index) => {
                const isPast = index < activeStep;
                const stepInvalid = stepValidity[index] !== null;
                return (
                  <Button
                    key={stepId}
                    size="small"
                    color={isPast && stepInvalid ? "error" : "primary"}
                    variant={activeStep === index ? "contained" : "outlined"}
                    disabled={
                      !canNavigateToStep(index, activeStep, sequence, draft)
                    }
                    onClick={() => handleGoToStep(index)}
                    aria-current={activeStep === index ? "step" : undefined}
                    startIcon={
                      isPast && stepInvalid ? (
                        <ErrorOutlineIcon fontSize="small" />
                      ) : undefined
                    }
                    sx={{ minWidth: 0 }}
                  >
                    {index + 1}. {STEP_SHORT_LABELS[stepId]}
                  </Button>
                );
              })}
            </Stack>
          </Stack>
        </SectionCard>

        {submitError && <Alert severity="error">{submitError}</Alert>}
        {fieldErrors && Object.keys(fieldErrors).length > 0 ? (
          <Alert severity="error">
            <AlertTitle>Des informations doivent être corrigées</AlertTitle>
            <Stack spacing={0.5}>
              {stepsWithError(fieldErrors, sequence).map((idx) => {
                const stepId = sequence[idx];
                return (
                  <Button
                    key={idx}
                    size="small"
                    variant="text"
                    color="error"
                    onClick={() => handleGoToStep(idx)}
                    sx={{
                      justifyContent: "flex-start",
                      textTransform: "none",
                      px: 0,
                      minHeight: 0,
                    }}
                  >
                    Étape {idx + 1} — {STEP_SHORT_LABELS[stepId]}
                  </Button>
                );
              })}
            </Stack>
          </Alert>
        ) : null}

        <Box
          sx={{
            display: { xs: "flex", md: "grid" },
            flexDirection: { xs: "column", md: "unset" },
            gridTemplateColumns: { md: "minmax(0, 1fr) 320px" },
            gap: { xs: 2, md: 3 },
            alignItems: "start",
          }}
        >
          {/* Sidebar (mobile : au-dessus via flex-direction column, desktop :
              colonne de droite). On la rend en premier dans le DOM côté mobile
              pour qu'elle soit accessible avant la liste de champs longs. */}
          <Box sx={{ order: { xs: 0, md: 2 }, width: "100%" }}>
            <RegistrationSidebar
              draft={draft}
              sequence={sequence}
              activeStepIndex={activeStep}
            />
          </Box>

          <Box ref={cardRef} sx={{ order: { xs: 1, md: 1 }, minWidth: 0 }}>
            <SectionCard
              eyebrow={`Étape ${activeStep + 1} sur ${totalSteps}`}
              title={stepLabel}
              description={stepDescription}
            >
              <Box
                component="h2"
                ref={stepHeadingRef}
                tabIndex={-1}
                style={visuallyHidden}
              >
                Étape {activeStep + 1} sur {totalSteps} : {stepLabel}
              </Box>
              {currentStepId === "audience" && (
                <AudienceStep
                  draft={draft}
                  onPatch={actions.patchFields}
                  onSetAdherentRole={actions.setAdherentRole}
                  onSetSex={actions.setSex}
                />
              )}
              {currentStepId === "adherent" && (
                <AdherentStep
                  draft={draft}
                  accountEmail={accountEmail}
                  onPatch={actions.patchFields}
                  onSetSex={actions.setSex}
                />
              )}
              {currentStepId === "representatives" && (
                <RepresentativesStep
                  draft={draft}
                  onAddRepresentative={actions.addRepresentative}
                  onUpdateRepresentative={actions.updateRepresentative}
                  onRemoveRepresentative={actions.removeRepresentative}
                />
              )}
              {currentStepId === "practice" && (
                <PracticeStep
                  draft={draft}
                  onChange={actions.patchFields}
                />
              )}
              {currentStepId === "admin" && (
                <AdminStep draft={draft} onChange={actions.patchFields} />
              )}
              {currentStepId === "engagements" && (
                <EngagementsStep
                  draft={draft}
                  onChange={actions.patchFields}
                />
              )}
              {currentStepId === "recap" && (
                <RecapStep
                  draft={draft}
                  accountEmail={accountEmail}
                  onEditStep={handleGoToStepId}
                />
              )}
            </SectionCard>
          </Box>
        </Box>

        <Paper
          elevation={0}
          sx={{
            position: { xs: "sticky", md: "static" },
            bottom: { xs: 0, md: "auto" },
            zIndex: { xs: 5, md: "auto" },
            borderRadius: 2,
            border: 1,
            borderColor: "divider",
            backgroundColor: "background.paper",
            px: { xs: 1.5, sm: 2 },
            pt: { xs: 1.25, sm: 1.5 },
            pb: {
              xs: "calc(env(safe-area-inset-bottom, 0px) + 12px)",
              sm: 2,
            },
            boxShadow: {
              xs: "0 -6px 18px rgba(15, 23, 42, 0.08)",
              md: "none",
            },
          }}
        >
          <Stack
            direction="row"
            spacing={1.5}
            justifyContent={activeStep === 0 ? "flex-end" : "space-between"}
            alignItems="center"
            sx={{ flexWrap: "nowrap" }}
          >
            {activeStep > 0 ? (
              <Button
                onClick={handleBack}
                disabled={submitting}
                startIcon={<ArrowBackIcon fontSize="small" />}
                variant="text"
                color="inherit"
                sx={{ flexShrink: 0 }}
              >
                Retour
              </Button>
            ) : null}
            {!isRecap ? (
              <Button
                variant="contained"
                onClick={handleNext}
                endIcon={<ArrowForwardIcon fontSize="small" />}
                sx={{ flexShrink: 0 }}
              >
                Continuer
              </Button>
            ) : (
              <Button
                variant="contained"
                color="secondary"
                onClick={handleSubmit}
                disabled={submitting}
                startIcon={
                  submitting ? (
                    <CircularProgress size={16} color="inherit" />
                  ) : (
                    <SendIcon fontSize="small" />
                  )
                }
                sx={{ flexShrink: 0, minWidth: 0 }}
              >
                <Box
                  component="span"
                  sx={{ display: { xs: "inline", sm: "none" } }}
                >
                  {submitLabelShort}
                </Box>
                <Box
                  component="span"
                  sx={{ display: { xs: "none", sm: "inline" } }}
                >
                  {submitLabelLong}
                </Box>
              </Button>
            )}
          </Stack>
        </Paper>

        <AuthDialog
          open={authDialogOpen}
          onClose={() => {
            if (submitting) return;
            setAuthDialogOpen(false);
            pendingPayloadRef.current = null;
          }}
          defaultMode="login"
          onSuccess={handleAuthSuccess}
          {...(authInitialEmail ? { initialEmail: authInitialEmail } : {})}
          headerSlot={<AccountEmailTransparencyBanner accountEmail={null} />}
        />

        <DraftStorageDisclosure
          status={storage.status}
          isDisabled={storage.isDisabled}
          lastSavedAt={storage.lastSavedAt}
          onDisable={storage.disable}
          onEnable={storage.enable}
          onClear={() => {
            storage.clear();
            actions.reset();
            setActiveStep(0);
          }}
        />
      </Stack>
    </LocalizationProvider>
  );
}
