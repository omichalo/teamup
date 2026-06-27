"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRegistrationConfigValue } from "@/hooks/useRegistrationConfig";
import {
  normalizeMedicalCertificateStatus,
} from "@/lib/club-registration/medical-certificate";
import { normalizeRegistrationPayment } from "@/lib/club-registration/payment/normalize-payment";
import { calculatePaymentSummary } from "@/lib/club-registration/payment/calculate-payment-summary";
import { normalizePaymentAidList } from "@/lib/club-registration/payment/payment-draft-helpers";
import type { Representative } from "@/lib/club-registration/schema";
import { buildPricingContext, calculateQuote } from "@/lib/pricing";
import type { RegistrationFfttPatch } from "./RegistrationSupplementarySections";
import { toEditableRegistration } from "./to-editable-registration";
import {
  createEmptyRepresentative,
  formToPricingInput,
  parseAmountCents,
} from "./membership-request-detail-shared";
import type {
  EditableRegistration,
  MembershipListReloadFn,
  RegistrationDetail,
  RegistrationSummary,
} from "./types";

export type UseMembershipRequestDetailOptions = {
  statusSummary?: RegistrationSummary | null | undefined;
  onListReload?: MembershipListReloadFn | undefined;
};

export function useMembershipRequestDetail(
  registrationId: string | null,
  options: UseMembershipRequestDetailOptions = {}
) {
  const { statusSummary: statusSummaryProp, onListReload } = options;
  const config = useRegistrationConfigValue();
  const [selected, setSelected] = useState<RegistrationDetail | null>(null);
  const [form, setForm] = useState<EditableRegistration | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [saving, setSaving] = useState(false);
  const [requestingPayment, setRequestingPayment] = useState(false);
  const [persistingQuote, setPersistingQuote] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const fetchDetail = useCallback(
    async (id: string) => {
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
    },
    [config]
  );

  useEffect(() => {
    if (registrationId) {
      void fetchDetail(registrationId);
      return;
    }
    setSelected(null);
    setForm(null);
    setError(null);
    setSuccess(null);
  }, [fetchDetail, registrationId]);

  const statusSummary = statusSummaryProp ?? selected;

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

  const patchFfttFields = (patch: RegistrationFfttPatch) => {
    setForm((current) => (current ? { ...current, ...patch } : current));
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

  const updateRepresentative = (index: number, patch: Partial<Representative>) => {
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

  const reloadQueueAndRefreshDetail = async (
    advance: "always" | "if_removed" | "never"
  ) => {
    const result = await onListReload?.({ advance });
    if (!result?.advanced && registrationId) {
      await fetchDetail(registrationId);
    }
  };

  const save = async (options?: { skipQueueReload?: boolean }): Promise<boolean> => {
    if (!registrationId || !form) return false;
    const amountCents = parseAmountCents(form.amountEuros);
    if (form.amountEuros.trim() && amountCents === null) {
      setError("Le montant doit être un nombre positif.");
      return false;
    }

    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/club/registration?id=${encodeURIComponent(registrationId)}`,
        {
          method: "PATCH",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            adherentRole: form.adherentRole,
            wasSqyMemberLastYear: form.wasSqyMemberLastYear ?? false,
            ffttLicense: form.ffttLicense.trim() || null,
            ffttLicenseLookup: form.ffttLicenseLookup ?? null,
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
        }
      );
      const json = await res.json().catch(() => ({}));
      if (!res.ok || json.error) {
        throw new Error(json.error || "Impossible d'enregistrer les corrections.");
      }
      setSuccess("Dossier mis à jour.");
      if (!options?.skipQueueReload) {
        await reloadQueueAndRefreshDetail("if_removed");
      }
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
    if (!registrationId || !form) return;

    setPersistingQuote(true);
    setError(null);
    setSuccess(null);
    try {
      const res = await fetch(
        `/api/club/registration/${encodeURIComponent(registrationId)}/pricing`,
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
      await reloadQueueAndRefreshDetail("if_removed");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de l'enregistrement du devis.");
    } finally {
      setPersistingQuote(false);
    }
  };

  const requestPayment = async () => {
    if (!registrationId || !form) return;
    const amountCents = parseAmountCents(form.amountEuros);
    if (!amountCents || amountCents <= 0) {
      setError("Indiquez un montant strictement positif avant de demander le paiement.");
      return;
    }

    setRequestingPayment(true);
    setError(null);
    setSuccess(null);
    try {
      const saved = await save({ skipQueueReload: true });
      if (!saved) return;
      const res = await fetch(
        `/api/club/registration/${encodeURIComponent(registrationId)}/request-payment`,
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
      await reloadQueueAndRefreshDetail("always");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur lors de la demande de paiement.");
    } finally {
      setRequestingPayment(false);
    }
  };

  return {
    config,
    registrationId,
    selected,
    form,
    statusSummary,
    selectedPayment,
    loadingDetail,
    saving,
    requestingPayment,
    persistingQuote,
    error,
    success,
    setError,
    setSuccess,
    liveQuote,
    enteredAmountCents,
    expectedPayableAfterAidsCents,
    amountDiffersFromQuote,
    fetchDetail,
    updateField,
    patchFfttFields,
    updateMedicalDeclaration,
    updateRepresentative,
    addRepresentative,
    removeRepresentative,
    save,
    applyCalculatedAmount,
    persistQuote,
    requestPayment,
  };
}

export type MembershipRequestDetailState = ReturnType<typeof useMembershipRequestDetail>;
