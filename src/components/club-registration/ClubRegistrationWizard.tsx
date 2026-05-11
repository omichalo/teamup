"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Alert,
  Button,
  Card,
  CardContent,
  Stack,
  Step,
  StepButton,
  Stepper,
  Typography,
} from "@mui/material";
import { isValidFrenchPhoneSurface } from "@/lib/club-registration/phone-fr";
import type { ClubRegistrationPayload } from "@/lib/club-registration/schema";
import { clubRegistrationPayloadSchema } from "@/lib/club-registration/schema";
import { isMinorAt } from "@/lib/club-registration/age";
import type { RegistrationDraft } from "./registration-defaults";
import { IdentityStep } from "./IdentityStep";
import { SectionSlotsStep } from "./SectionSlotsStep";
import { MedicalFamilyStep } from "./MedicalFamilyStep";
import { LegalCompetitorStep } from "./LegalCompetitorStep";
import { RecapStep } from "./RecapStep";
import { useRegistrationDraft } from "./useRegistrationDraft";
import { useRegistrationDraftStorage } from "./useRegistrationDraftStorage";
import { DraftStorageDisclosure } from "./DraftStorageDisclosure";

const STEPS = [
  "Identité et coordonnées",
  "Sections et créneaux",
  "Certificat et aides",
  "Consentements et compétition",
  "Récapitulatif",
];

const STEPS_SHORT = ["Identité", "Sections", "Médical", "Autorisations", "Récap"];

const SUBMIT_ENABLED = process.env.NEXT_PUBLIC_HYBRID_SUBMIT_ENABLED === "true";

function validateStep(activeStep: number, draft: RegistrationDraft): string | null {
  if (activeStep === 0) {
    if (!draft.firstName.trim()) return "Indiquez le prénom de l’adhérent.";
    if (!draft.lastName.trim()) return "Indiquez le nom de l’adhérent.";
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
  if (activeStep === 3) {
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
  const hasHydratedRef = useRef(false);

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
   * Auto-save à chaque changement de draft. On dépend uniquement de la fonction `save`
   * (stable via `useCallback` dans le hook) pour éviter la boucle de re-render qui
   * faisait clignoter le bandeau de statut à chaque frappe.
   */
  const storageSave = storage.save;
  useEffect(() => {
    if (hydrating) return;
    storageSave(draft);
  }, [draft, hydrating, storageSave]);

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

  const buildPayload = (): ClubRegistrationPayload => {
    /* Le toggle `rulesAccepted` est interne à l'UI ; côté schéma on attend `internalRulesAccepted = true`. */
    /* eslint-disable-next-line @typescript-eslint/no-unused-vars */
    const { rulesAccepted, ...rest } = draft;
    const payload: ClubRegistrationPayload = {
      ...rest,
      internalRulesAccepted: true as const,
      competitionJerseySize:
        draft.wantsCompetitorExtras && draft.competitionJerseySize
          ? draft.competitionJerseySize
          : undefined,
      competitionIds: draft.wantsCompetitorExtras ? draft.competitionIds : [],
    };
    return payload;
  };

  /**
   * Soumission désactivée tant que le feature flag est off.
   * En PR 2, ce handler ouvrira l'AuthDialog en mode anonyme ou postera directement.
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

    const payload = buildPayload();
    const parsed = clubRegistrationPayloadSchema.safeParse(payload);
    if (!parsed.success) {
      setFieldErrors(parsed.error.flatten().fieldErrors as Record<string, string[] | undefined>);
      setSubmitError("Certaines informations sont invalides ou incomplètes.");
      return;
    }

    if (!SUBMIT_ENABLED) {
      setSubmitError(
        "La soumission en ligne sera disponible prochainement. Vos informations sont enregistrées localement."
      );
      return;
    }

    if (!accountEmail) {
      setSubmitError(
        "La soumission nécessite d’être connecté. La connexion intégrée arrive dans la prochaine livraison."
      );
      return;
    }

    /* PR 2 : POST /api/club/registration */
  };

  return (
    <Stack spacing={3}>
      <Typography variant="h4" component="h1">
        Inscription au club
      </Typography>
      <Typography variant="body1" color="text.secondary">
        Préparez votre dossier d’inscription en quelques étapes. Vous pourrez vous connecter
        ou créer un compte juste avant l’envoi.
      </Typography>

      {submitError && <Alert severity="error">{submitError}</Alert>}
      {fieldErrors && Object.keys(fieldErrors).length > 0 && (
        <Alert severity="error">
          Vérifiez les champs signalés par le serveur. Détail technique disponible pour le support.
        </Alert>
      )}

      <Stepper
        activeStep={activeStep}
        nonLinear
        alternativeLabel
        sx={{ display: { xs: "none", md: "flex" } }}
      >
        {STEPS.map((label, index) => (
          <Step key={label} completed={index < activeStep}>
            <StepButton
              color="inherit"
              disabled={!canNavigateToStep(index, activeStep, draft)}
              onClick={() => handleGoToStep(index)}
            >
              {label}
            </StepButton>
          </Step>
        ))}
      </Stepper>

      <Stack spacing={1} sx={{ display: { md: "none" } }}>
        <Typography variant="subtitle2" color="text.secondary">
          Étape {activeStep + 1} / {STEPS.length} — {STEPS[activeStep]}
        </Typography>
        <Stack direction="row" flexWrap="wrap" useFlexGap sx={{ gap: 1 }}>
          {STEPS.map((label, index) => (
            <Button
              key={label}
              size="small"
              variant={activeStep === index ? "contained" : "outlined"}
              disabled={!canNavigateToStep(index, activeStep, draft)}
              onClick={() => handleGoToStep(index)}
              aria-current={activeStep === index ? "step" : undefined}
            >
              {index + 1}. {STEPS_SHORT[index] ?? label}
            </Button>
          ))}
        </Stack>
      </Stack>

      <Card variant="outlined">
        <CardContent>
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
          {activeStep === 1 && <SectionSlotsStep draft={draft} onChange={actions.patchFields} />}
          {activeStep === 2 && <MedicalFamilyStep draft={draft} onChange={actions.patchFields} />}
          {activeStep === 3 && <LegalCompetitorStep draft={draft} onChange={actions.patchFields} />}
          {activeStep === 4 && (
            <RecapStep
              draft={draft}
              accountEmail={accountEmail}
              onEditStep={(idx) => setActiveStep(idx)}
            />
          )}
        </CardContent>
      </Card>

      <Stack
        direction="row"
        spacing={2}
        justifyContent={activeStep === 0 ? "flex-end" : "space-between"}
      >
        {activeStep > 0 ? (
          <Button onClick={handleBack}>Retour</Button>
        ) : null}
        {activeStep < STEPS.length - 1 ? (
          <Button variant="contained" onClick={handleNext}>
            Continuer
          </Button>
        ) : (
          <Button
            variant="contained"
            onClick={handleSubmit}
            disabled={!SUBMIT_ENABLED}
          >
            {SUBMIT_ENABLED
              ? accountEmail
                ? "Envoyer ma demande au club"
                : "Se connecter pour envoyer"
              : "Soumission disponible prochainement"}
          </Button>
        )}
      </Stack>

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
  );
}
