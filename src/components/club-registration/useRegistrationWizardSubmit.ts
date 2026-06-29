"use client";

import { useCallback, useRef, useState, type RefObject } from "react";
import type { RegistrationConfigV1 } from "@/lib/club-registration-config/types";
import type { RegistrationStepId } from "@/lib/club-registration/field-to-step";
import { scrollToFormTarget } from "@/lib/club-registration/scroll-to-form-target";
import type { ClubRegistrationPayload } from "@/lib/club-registration/schema";
import { buildRegistrationPayloadSchema } from "@/lib/club-registration/schema";
import { submitRegistration } from "@/lib/club-registration/submit";
import {
  formatZodIssuesForDebug,
  logRegistrationFieldErrors,
  logRegistrationWizardDebug,
  summarizeRepresentativesForDebug,
} from "@/lib/club-registration/registration-wizard-debug";
import type { RegistrationDraft } from "./registration-defaults";
import { validateStep } from "./step-validation";
import type { useRegistrationDraftStorage } from "./useRegistrationDraftStorage";

type DraftStorage = ReturnType<typeof useRegistrationDraftStorage>;

export function useRegistrationWizardSubmit(params: {
  draft: RegistrationDraft;
  config: RegistrationConfigV1;
  sequence: RegistrationStepId[];
  storage: DraftStorage;
  accountEmail: string | null;
  buildPayload: () => ClubRegistrationPayload | null;
  setActiveStep: (step: number | ((prev: number) => number)) => void;
  stepErrorAlertRef: RefObject<HTMLDivElement | null>;
}) {
  const {
    draft,
    config,
    sequence,
    storage,
    accountEmail,
    buildPayload,
    setActiveStep,
    stepErrorAlertRef,
  } = params;

  const [submitError, setSubmitError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<
    Record<string, string[] | undefined> | null
  >(null);
  const [submitting, setSubmitting] = useState(false);
  const [authDialogOpen, setAuthDialogOpen] = useState(false);
  const pendingPayloadRef = useRef<ClubRegistrationPayload | null>(null);
  const pendingAttemptIdRef = useRef<string | null>(null);
  const submitInFlightRef = useRef(false);

  const performSubmit = useCallback(
    async (payload: ClubRegistrationPayload, attemptId: string) => {
      setSubmitError(null);
      setFieldErrors(null);
      setSubmitting(true);
      let redirecting = false;
      try {
        const result = await submitRegistration(payload, { attemptId });
        if (result.ok) {
          storage.clear();
          redirecting = true;
          window.location.assign(
            `/club/mes-inscriptions?created=${encodeURIComponent(result.id)}`
          );
          return;
        }
        if (result.fieldErrors) {
          logRegistrationFieldErrors(
            "submitRegistration: erreurs serveur",
            result.fieldErrors,
            sequence
          );
          setFieldErrors(result.fieldErrors);
        }
        logRegistrationWizardDebug("submitRegistration: échec", {
          error: result.error,
        });
        setSubmitError(result.error);
      } finally {
        if (!redirecting) {
          submitInFlightRef.current = false;
          setSubmitting(false);
        }
      }
    },
    [sequence, storage]
  );

  const handleSubmit = useCallback(async () => {
    if (submitInFlightRef.current) return;

    setSubmitError(null);
    setFieldErrors(null);
    logRegistrationWizardDebug("handleSubmit: début", {
      representativesCount: draft.representatives.length,
      representatives: summarizeRepresentativesForDebug(draft.representatives),
      slotIdsCount: draft.slotIds.length,
      wantsCompetitorExtras: draft.wantsCompetitorExtras,
      competitionJerseySize: draft.competitionJerseySize ?? null,
      adherentRole: draft.adherentRole,
    });
    for (let i = 0; i < sequence.length - 1; i++) {
      const stepId = sequence[i];
      const result = validateStep(stepId, draft, config);
      if (!result.valid) {
        logRegistrationWizardDebug("handleSubmit: validateStep échoué", {
          stepIndex: i,
          stepId,
          message: result.message,
          focusSelector: result.focusSelector,
          representativesCount: draft.representatives.length,
        });
        setActiveStep(i);
        setSubmitError(result.message);
        scrollToFormTarget(result.focusSelector, {
          fallback: () => {
            stepErrorAlertRef.current?.scrollIntoView({
              behavior: "smooth",
              block: "start",
            });
          },
        });
        return;
      }
    }
    const payload = buildPayload();
    if (!payload) {
      logRegistrationWizardDebug("handleSubmit: buildPayload null", {
        sex: draft.sex,
        photoConsent: draft.photoConsent,
        paymentMethod: draft.paymentMethod,
      });
      setSubmitError("Certaines informations obligatoires sont manquantes.");
      return;
    }
    const parsed = buildRegistrationPayloadSchema(config).safeParse(payload);
    if (!parsed.success) {
      const flat = parsed.error.flatten().fieldErrors as Record<
        string,
        string[] | undefined
      >;
      logRegistrationWizardDebug("handleSubmit: Zod safeParse échoué", {
        zodIssues: formatZodIssuesForDebug(parsed.error.issues),
        flattenFieldErrors: flat,
        representativesInPayload: summarizeRepresentativesForDebug(
          payload.representatives
        ),
        slotIds: payload.slotIds,
        schoolPickupSlotIds: payload.schoolPickupSlotIds,
      });
      logRegistrationFieldErrors("handleSubmit: étapes en erreur", flat, sequence);
      setFieldErrors(flat);
      setSubmitError("Certaines informations sont invalides ou incomplètes.");
      return;
    }
    logRegistrationWizardDebug("handleSubmit: validation OK", {
      representativesCount: parsed.data.representatives.length,
    });
    const attemptId = crypto.randomUUID();
    if (!accountEmail) {
      pendingPayloadRef.current = payload;
      pendingAttemptIdRef.current = attemptId;
      setAuthDialogOpen(true);
      return;
    }
    submitInFlightRef.current = true;
    await performSubmit(payload, attemptId);
  }, [
    accountEmail,
    buildPayload,
    config,
    draft,
    performSubmit,
    sequence,
    setActiveStep,
    stepErrorAlertRef,
  ]);

  const handleAuthSuccess = useCallback(async () => {
    setAuthDialogOpen(false);
    const payload = pendingPayloadRef.current;
    const attemptId = pendingAttemptIdRef.current;
    pendingPayloadRef.current = null;
    pendingAttemptIdRef.current = null;
    if (!payload || !attemptId) return;
    if (submitInFlightRef.current) return;
    submitInFlightRef.current = true;
    await performSubmit(payload, attemptId);
  }, [performSubmit]);

  const clearSubmitFeedback = useCallback(() => {
    setSubmitError(null);
    setFieldErrors(null);
  }, []);

  const cancelAuthDialog = useCallback(() => {
    if (submitting) return;
    setAuthDialogOpen(false);
    pendingPayloadRef.current = null;
    pendingAttemptIdRef.current = null;
  }, [submitting]);

  return {
    submitError,
    setSubmitError,
    fieldErrors,
    submitting,
    authDialogOpen,
    handleSubmit,
    handleAuthSuccess,
    clearSubmitFeedback,
    cancelAuthDialog,
    submitInFlightRef,
  };
}
