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
import { isValidFrenchPhoneSurface } from "@/lib/club-registration/phone-fr";
import type { ClubRegistrationPayload } from "@/lib/club-registration/schema";
import { clubRegistrationPayloadSchema } from "@/lib/club-registration/schema";
import { isAtLeast40At, isMinorAt } from "@/lib/club-registration/age";
import {
  firstStepWithError,
  stepsWithError,
} from "@/lib/club-registration/field-to-step";
import { submitRegistration } from "@/lib/club-registration/submit";
import type { RegistrationDraft } from "./registration-defaults";
import { IdentityStep } from "./IdentityStep";
import { SectionSlotsStep } from "./SectionSlotsStep";
import { MedicalFamilyStep } from "./MedicalFamilyStep";
import { LegalCompetitorStep } from "./LegalCompetitorStep";
import { RecapStep } from "./RecapStep";
import { useRegistrationDraft } from "./useRegistrationDraft";
import { useRegistrationDraftStorage } from "./useRegistrationDraftStorage";
import { DraftStorageDisclosure } from "./DraftStorageDisclosure";
import { AccountEmailTransparencyBanner } from "./AccountEmailTransparencyBanner";
import { AuthDialog } from "@/components/auth/AuthDialog";

const STEPS = [
  "Identité et coordonnées",
  "Sections et créneaux",
  "Certificat et aides",
  "Consentements et compétition",
  "Récapitulatif",
];

const STEPS_SHORT = ["Identité", "Sections", "Médical", "Autorisations", "Récap"];

const STEP_DESCRIPTIONS: ReadonlyArray<string> = [
  "Adhérent, contact et adresse postale.",
  "Section principale, sections complémentaires et créneaux d’entraînement.",
  "Déclaration médicale, attestations et réductions éventuelles.",
  "Diffusion d’images, autorisations légales et section compétiteur.",
  "Vérifiez votre dossier avant envoi au club.",
];

function validateStep(activeStep: number, draft: RegistrationDraft): string | null {
  if (activeStep === 0) {
    if (!draft.firstName.trim()) return "Indiquez le prénom de l’adhérent.";
    if (!draft.lastName.trim()) return "Indiquez le nom de l’adhérent.";
    if (!draft.sex) return "Indiquez le sexe de l’adhérent.";
    if (!draft.birthCity.trim()) return "Indiquez la ville de naissance.";
    if (!draft.birthDate) return "Indiquez la date de naissance.";

    const minor = isMinorAt(draft.birthDate);
    if (minor && draft.adherentRole === "self") {
      return "La date de naissance correspond à un mineur : passez en mode « mineur dont je suis le représentant légal ».";
    }

    if (!draft.adherentPhonePrimary.trim()) return "Indiquez un téléphone principal.";
    if (!isValidFrenchPhoneSurface(draft.adherentPhonePrimary)) {
      return "Le téléphone principal doit être un numéro français valide (10 chiffres ou +33).";
    }
    const sec = draft.adherentPhoneSecondary?.trim();
    if (sec && !isValidFrenchPhoneSurface(sec)) {
      return "Le téléphone secondaire doit être un numéro français valide.";
    }

    if (draft.adherentEmail && draft.adherentEmail.trim() !== "") {
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.adherentEmail.trim())) {
        return "L’adresse e-mail de l’adhérent est invalide.";
      }
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

    if (draft.adherentRole === "minor_dependent" && draft.representatives.length === 0) {
      return "Au moins un représentant légal est obligatoire pour l’inscription d’un mineur.";
    }

    for (let i = 0; i < draft.representatives.length; i++) {
      const r = draft.representatives[i];
      const isFirstRequired = draft.adherentRole === "minor_dependent" && i === 0;
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
      } else {
        // Représentant optionnel : si l'utilisateur a commencé à le remplir, on contrôle quand même
        if (
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
    }

    if (draft.representatives.length === 2) {
      const a = draft.representatives[0].email.trim().toLowerCase();
      const b = draft.representatives[1].email.trim().toLowerCase();
      if (a && b && a === b) {
        return "Les deux représentants doivent avoir des adresses e-mail différentes.";
      }
    }
  }
  if (activeStep === 1) {
    if (draft.slotIds.length === 0) return "Sélectionnez au moins un créneau.";
  }
  if (activeStep === 2) {
    /* Cohérence âge ↔ déclaration médicale : on guide le choix dès l'UI mais on
       garde un filet ici si l'utilisateur change sa date de naissance après coup. */
    const atLeast40 = isAtLeast40At(draft.birthDate);
    const decl = draft.medicalCertificateDeclaration;
    if (!decl) {
      return "Choisissez une déclaration sur le questionnaire médical.";
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
  }
  if (activeStep === 3) {
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
    if (!draft.rulesAccepted) return "Vous devez accepter le règlement intérieur pour continuer.";
    if (draft.wantsCompetitorExtras && !draft.competitionJerseySize) {
      return "Indiquez une taille de maillot pour la section compétiteur.";
    }
  }
  return null;
}

/** Permet d’accéder à l’étape cible : retour libre ; étapes suivantes seulement si les étapes intermédiaires sont valides. */
function canNavigateToStep(targetIndex: number, activeStep: number, draft: RegistrationDraft): boolean {
  if (targetIndex <= activeStep) return true;
  for (let s = activeStep; s < targetIndex; s++) {
    if (validateStep(s, draft) !== null) return false;
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
  const [fieldErrors, setFieldErrors] = useState<Record<string, string[] | undefined> | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const pendingPayloadRef = useRef<ClubRegistrationPayload | null>(null);
  const hasHydratedRef = useRef(false);
  /* Refs pour la gestion du focus au changement d'étape. */
  const cardRef = useRef<HTMLDivElement | null>(null);
  const stepHeadingRef = useRef<HTMLHeadingElement | null>(null);
  const prevActiveStepRef = useRef(0);
  /* Mémorisation du scroll par étape : on enregistre la position au moment du
     départ et on la restaure quand l'utilisateur revient en arrière sur cette
     même étape. Cas typique : SectionSlotsStep est long, l'utilisateur clique
     « Continuer » pendant qu'il était à mi-hauteur, puis revient en arrière —
     on évite de le re-projeter en haut s'il avait déjà parcouru la liste. */
  const scrollPositionsRef = useRef<Map<number, number>>(new Map());

  /* Hydratation au mount : local-first, fallback éventuel sur le draft serveur (lecture seule pour l'instant). */
  const storageLoad = storage.load;
  const hydrate = actions.hydrate;
  useEffect(() => {
    if (hasHydratedRef.current) return;
    hasHydratedRef.current = true;

    const local = storageLoad();
    if (local) {
      hydrate(local);
    }
    setHydrating(false);
  }, [hydrate, storageLoad]);

  /**
   * Évaluation paresseuse de la validité de chaque étape. On l'utilise à la fois
   * pour le rendu (icône erreur dans le stepper, résumé dans l'Alert global) et
   * pour la navigation (impossible d'atteindre une étape postérieure tant que les
   * étapes antérieures contiennent une erreur). 5 appels par render, négligeable.
   */
  const stepValidity = useMemo<(string | null)[]>(
    () => STEPS.map((_, idx) => validateStep(idx, draft)),
    [draft]
  );

  /* Nombre d'étapes 0..3 (toutes sauf le récap) sans erreur. Sert d'indicateur
     de progression neutre — on évite un pourcentage flou qui dépendrait du
     nombre de sous-champs validés. */
  const completedStepsCount = useMemo(
    () => stepValidity.slice(0, STEPS.length - 1).filter((v) => v === null).length,
    [stepValidity]
  );

  /**
   * Auto-save à chaque changement de draft. On dépend uniquement de la fonction `save`
   * (stable via `useCallback` dans le hook) pour éviter la boucle de re-render qui
   * faisait clignoter le bandeau de statut à chaque frappe.
   */
  const storageSave = storage.save;
  useEffect(() => {
    if (hydrating) return;
    storageSave(draft);
  }, [draft, hydrating, storageSave]);

  /**
   * Quand le serveur retourne des fieldErrors (réponse 400), on saute automatiquement
   * à la 1ʳᵉ étape qui contient une erreur et on fait défiler la vue vers le premier
   * champ concerné pour réduire la friction (l'utilisateur n'a rien à chercher).
   */
  useEffect(() => {
    if (!fieldErrors || Object.keys(fieldErrors).length === 0) return;
    const target = firstStepWithError(fieldErrors);
    if (target === null) return;
    if (target !== activeStep) {
      setActiveStep(target);
    }
    /* Le DOM doit avoir rendu l'étape cible avant qu'on cherche le 1er champ. On
       attend deux frames pour couvrir le cas où le changement d'étape réordonne
       la sous-arborescence. */
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
              // Certains éléments ne supportent pas focus(); on ignore silencieusement.
            }
          }
        }
      });
    });
    return () => {
      cancelAnimationFrame(raf1);
      if (raf2 !== undefined) cancelAnimationFrame(raf2);
    };
  }, [fieldErrors, activeStep]);

  /**
   * Gestion du focus / scroll au changement d'étape :
   * - Sauvegarde la position de scroll de l'étape qu'on quitte (utilisée si
   *   l'utilisateur y revient en arrière).
   * - Si on revient sur une étape qui avait une position enregistrée, on
   *   restaure ce scroll plutôt que de remonter en haut de la Card.
   * - Sinon, scroll en haut de la Card (cas d'une étape jamais visitée ou
   *   d'une avancée linéaire).
   * - Donne le focus au titre invisible de l'étape (annoncé par les lecteurs
   *   d'écran).
   *
   * Si une erreur serveur vient d'arriver et va déclencher un focus ciblé sur
   * le 1ᵉʳ champ en erreur, on laisse la main à l'autre effet pour ne pas voler
   * le focus à un emplacement plus pertinent.
   */
  useEffect(() => {
    const previous = prevActiveStepRef.current;
    if (previous === activeStep) return;

    /* On enregistre la position de scroll vertical actuelle pour l'étape qu'on
       quitte, AVANT de modifier le scroll. */
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

    /* RAF pour laisser React peindre le nouveau step avant de focus. */
    const raf = requestAnimationFrame(() => {
      stepHeadingRef.current?.focus();
    });
    return () => cancelAnimationFrame(raf);
  }, [activeStep, fieldErrors]);

  const handleNext = () => {
    setSubmitError(null);
    const err = validateStep(activeStep, draft);
    if (err) {
      setSubmitError(err);
      return;
    }
    setActiveStep((s) => Math.min(s + 1, STEPS.length - 1));
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
        const err = validateStep(s, draft);
        if (err) {
          setSubmitError(err);
          setActiveStep(s);
          return;
        }
      }
      setActiveStep(to);
    },
    [activeStep, draft]
  );

  /**
   * Construit le payload final en filtrant les valeurs sentinelles `""` de `sex` et
   * `photoConsent` (RGPD : consentement et identité ne peuvent pas être pré-cochés).
   * Retourne `null` si l'utilisateur n'a pas choisi explicitement ; le composant
   * remonte alors un message ciblé sur l'étape concernée.
   */
  const buildPayload = (): ClubRegistrationPayload | null => {
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    const { rulesAccepted, sex, photoConsent, ...rest } = draft;
    if (sex === "" || photoConsent === "") {
      return null;
    }
    /* La section compétiteur classique est incompatible avec handisport / sport-adapté
       (cf. superRefine côté schema). Si l'utilisateur a basculé sa section principale
       après avoir coché le switch, on force la cohérence au moment du build. */
    const isAdaptedMainSection =
      draft.mainSectionId === "handisport" || draft.mainSectionId === "sport-adapte";
    const effectiveCompetitorExtras =
      !isAdaptedMainSection && draft.wantsCompetitorExtras;
    /* Les autorisations légales mineurs sont forcées à `not_applicable_adult` côté
       majeur (l'UI les masque). Côté mineur l'UI exige la case cochée donc la valeur
       est déjà `yes` dans le draft. On garde une cohérence ceinture/bretelles. */
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
      emergencyMedicalAuthorization,
      supervisionAcknowledgement,
      internalRulesAccepted: true as const,
      wantsCompetitorExtras: effectiveCompetitorExtras,
      competitionJerseySize:
        effectiveCompetitorExtras && draft.competitionJerseySize
          ? draft.competitionJerseySize
          : undefined,
      competitionIds: effectiveCompetitorExtras ? draft.competitionIds : [],
    };
  };

  /**
   * Envoie le dossier au serveur. La validation Zod est rejouée côté client
   * pour fail-fast ; le serveur revalide le payload et persiste en base.
   *
   * En cas de succès on déclenche un hard navigation : le `useAuth` du
   * Layout ne se ré-instancie pas après un soft navigation, du coup il
   * resterait sur `user = null` (bouton « Connexion » au lieu de l'avatar)
   * tant qu'on ne recharge pas la page. C'est aussi le comportement
   * historique des pages /login (cf. window.location.href = next).
   */
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

  /**
   * Point d'entrée du clic « Envoyer ». Validation finale + bascule éventuelle
   * vers l'AuthDialog si l'utilisateur est anonyme.
   */
  const handleSubmit = async () => {
    setSubmitError(null);
    setFieldErrors(null);

    const err = validateStep(3, draft);
    if (err) {
      setSubmitError(err);
      setActiveStep(3);
      return;
    }

    /* Garde-fou supplémentaire : on rejoue la validation de l'étape 1 au cas où
       l'utilisateur aurait navigué via le stepper sans repasser par "Continuer". */
    const err0 = validateStep(0, draft);
    if (err0) {
      setSubmitError(err0);
      setActiveStep(0);
      return;
    }

    const payload = buildPayload();
    if (!payload) {
      /* `sex` ou `photoConsent` non choisis : impossible en pratique car validateStep
         couvre le cas, mais on échoue gracieusement plutôt que de laisser passer un
         payload incomplet. */
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

  /**
   * Callback de l'AuthDialog : la session vient d'être créée côté serveur,
   * on enchaîne directement avec le POST sans demander à l'utilisateur de
   * cliquer une seconde fois.
   */
  const handleAuthSuccess = useCallback(async () => {
    setAuthDialogOpen(false);
    const payload = pendingPayloadRef.current;
    pendingPayloadRef.current = null;
    if (!payload) return;
    await performSubmit(payload);
  }, [performSubmit]);

  const totalSteps = STEPS.length;
  const stepLabel = STEPS[activeStep] ?? "";
  const stepShortLabel = STEPS_SHORT[activeStep] ?? stepLabel;
  const stepDescription = STEP_DESCRIPTIONS[activeStep] ?? "";
  const isRecap = activeStep === totalSteps - 1;
  /* Le bouton final porte deux variantes : un libellé court (mobile) et un
     libellé long (≥ sm) pour éviter le débord sur smartphone. */
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

  return (
    <LocalizationProvider dateAdapter={AdapterDayjs} adapterLocale="fr">
      <Stack spacing={3}>
        <PageHeader
          eyebrow="Inscription au club"
          title="Préparez votre dossier"
          subtitle="En quelques étapes, renseignez les informations nécessaires. Votre brouillon est enregistré localement et vous pourrez vous connecter ou créer un compte juste avant l’envoi."
        />

        <SectionCard
          padding="compact"
          contentSx={{ py: 2 }}
        >
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

            {/* Desktop : stepper MUI alignant accessibilité (navigation au
                clavier, lecteurs d'écran) et lisibilité. On attend `lg` pour
                l'afficher : à `md` (900–1199 px) certains libellés longs
                (« Consentements et compétition ») se chevauchaient en mode
                `alternativeLabel`. */}
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
              {STEPS.map((label, index) => {
                const isPast = index < activeStep;
                const stepInvalid = stepValidity[index] !== null;
                const completed = isPast && !stepInvalid;
                return (
                  <Step key={label} completed={completed}>
                    <StepButton
                      color="inherit"
                      disabled={!canNavigateToStep(index, activeStep, draft)}
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
                      {label}
                    </StepButton>
                  </Step>
                );
              })}
            </Stepper>

            {/* Mobile + tablette : pastilles d'étapes — plus compact qu'un
                stepper vertical et garantit le wrap propre sur petites largeurs. */}
            <Stack
              direction="row"
              flexWrap="wrap"
              useFlexGap
              sx={{ gap: 1, display: { lg: "none" } }}
            >
              {STEPS.map((label, index) => {
                const isPast = index < activeStep;
                const stepInvalid = stepValidity[index] !== null;
                return (
                  <Button
                    key={label}
                    size="small"
                    color={isPast && stepInvalid ? "error" : "primary"}
                    variant={activeStep === index ? "contained" : "outlined"}
                    disabled={!canNavigateToStep(index, activeStep, draft)}
                    onClick={() => handleGoToStep(index)}
                    aria-current={activeStep === index ? "step" : undefined}
                    startIcon={
                      isPast && stepInvalid ? (
                        <ErrorOutlineIcon fontSize="small" />
                      ) : undefined
                    }
                    sx={{ minWidth: 0 }}
                  >
                    {index + 1}. {STEPS_SHORT[index] ?? label}
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
              {stepsWithError(fieldErrors).map((idx) => (
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
                  Étape {idx + 1} — {STEPS_SHORT[idx] ?? STEPS[idx]}
                </Button>
              ))}
            </Stack>
          </Alert>
        ) : null}

        <Box ref={cardRef}>
          <SectionCard
            eyebrow={`Étape ${activeStep + 1} sur ${totalSteps}`}
            title={stepLabel}
            description={stepDescription}
          >
            {/* Titre invisible mais focusable : annonce l'étape courante aux
                lecteurs d'écran et reçoit le focus à chaque changement d'étape.
                On utilise `style` plutôt que `sx` car `visuallyHidden` retourne
                du CSSProperties brut, incompatible avec le typage `SxProps`. */}
            <Box
              component="h2"
              ref={stepHeadingRef}
              tabIndex={-1}
              style={visuallyHidden}
            >
              Étape {activeStep + 1} sur {totalSteps} : {stepLabel}
            </Box>
            {activeStep === 0 && (
              <IdentityStep
                draft={draft}
                onPatch={actions.patchFields}
                onSetAdherentRole={actions.setAdherentRole}
                onSetSex={actions.setSex}
                onAddRepresentative={actions.addRepresentative}
                onUpdateRepresentative={actions.updateRepresentative}
                onRemoveRepresentative={actions.removeRepresentative}
              />
            )}
            {activeStep === 1 && (
              <SectionSlotsStep draft={draft} onChange={actions.patchFields} />
            )}
            {activeStep === 2 && (
              <MedicalFamilyStep draft={draft} onChange={actions.patchFields} />
            )}
            {activeStep === 3 && (
              <LegalCompetitorStep draft={draft} onChange={actions.patchFields} />
            )}
            {activeStep === 4 && (
              <RecapStep
                draft={draft}
                accountEmail={accountEmail}
                onEditStep={(idx) => setActiveStep(idx)}
              />
            )}
          </SectionCard>
        </Box>

        {/* Barre d'actions : sticky en bas de viewport sur mobile / tablette
            pour rester accessible lors du scroll dans les longs formulaires
            (étape Sections notamment), statique sur grand écran pour respecter
            l'ordre de lecture. On ajoute `env(safe-area-inset-bottom)` pour
            iOS Safari (notch / barre de navigation home). */}
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
