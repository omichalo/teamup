"use client";

import { useReducer, useCallback } from "react";
import type { Representative } from "@/lib/club-registration/schema";
import {
  inferMedicalDossierFromDeclaration,
  syncMedicalCertificateDeclaration,
} from "@/lib/club-registration/medical-dossier";
import {
  createEmptyDraft,
  createEmptyRepresentative,
  type RegistrationDraft,
} from "./registration-defaults";

/**
 * Reducer typé pour le draft d'inscription.
 *
 * Encapsule les invariants métier qui dépendaient auparavant de plusieurs callbacks
 * éparpillés dans les composants d'étape :
 * - changement d'`adherentRole` → ajustement automatique de `representatives`
 * - changement de `sex` → reset cohérent de `firstFemaleRegistrationSqy`
 * - hydratation depuis localStorage ou serveur sans recopier la logique côté composants
 */

export type RegistrationDraftAction =
  | { type: "PATCH_FIELDS"; patch: Partial<RegistrationDraft> }
  | { type: "SET_ADHERENT_ROLE"; role: RegistrationDraft["adherentRole"] }
  | { type: "SET_SEX"; sex: RegistrationDraft["sex"] }
  | { type: "ADD_REPRESENTATIVE"; representative?: Representative }
  | { type: "UPDATE_REPRESENTATIVE"; index: number; patch: Partial<Representative> }
  | { type: "REMOVE_REPRESENTATIVE"; index: number }
  | { type: "HYDRATE"; draft: RegistrationDraft }
  | { type: "RESET" };

export function registrationDraftReducer(
  state: RegistrationDraft,
  action: RegistrationDraftAction
): RegistrationDraft {
  switch (action.type) {
    case "PATCH_FIELDS":
      return { ...state, ...action.patch };

    case "SET_ADHERENT_ROLE": {
      const next: RegistrationDraft = { ...state, adherentRole: action.role };
      if (action.role === "minor_dependent") {
        if (state.representatives.length === 0) {
          next.representatives = [createEmptyRepresentative()];
        }
      } else {
        /* Adultes (self / other_adult) : pas de représentant légal dans le dossier. */
        next.representatives = [];
      }
      return next;
    }

    case "SET_SEX": {
      const next: RegistrationDraft = { ...state, sex: action.sex };
      if (action.sex !== "female") {
        next.firstFemaleRegistrationSqy = undefined;
      } else if (state.firstFemaleRegistrationSqy === undefined) {
        next.firstFemaleRegistrationSqy = false;
      }
      return next;
    }

    case "ADD_REPRESENTATIVE": {
      if (state.representatives.length >= 2) return state;
      return {
        ...state,
        representatives: [
          ...state.representatives,
          action.representative ?? createEmptyRepresentative(),
        ],
      };
    }

    case "UPDATE_REPRESENTATIVE": {
      const list = state.representatives.slice();
      const target = list[action.index];
      if (!target) return state;
      list[action.index] = { ...target, ...action.patch };
      return { ...state, representatives: list };
    }

    case "REMOVE_REPRESENTATIVE": {
      if (action.index < 0 || action.index >= state.representatives.length) return state;
      const list = state.representatives.slice();
      list.splice(action.index, 1);
      return { ...state, representatives: list };
    }

    case "HYDRATE": {
      const merged: RegistrationDraft = {
        ...createEmptyDraft(),
        ...action.draft,
      };
      const dossierEmpty =
        merged.medicalQuestionnaire.summary === "" &&
        merged.medicalVeteranPath.hadFfttLicense === "" &&
        merged.medicalVeteranPath.categoryChanged === "";
      if (merged.medicalCertificateDeclaration && dossierEmpty) {
        const inferred = inferMedicalDossierFromDeclaration(
          merged.medicalCertificateDeclaration,
          merged.birthDate
        );
        merged.medicalQuestionnaire = inferred.questionnaire;
        merged.medicalVeteranPath = inferred.veteranPath;
      }
      return syncMedicalCertificateDeclaration(merged);
    }

    case "RESET":
      return createEmptyDraft();

    default:
      return state;
  }
}

export type RegistrationDraftActions = {
  patchFields: (patch: Partial<RegistrationDraft>) => void;
  setAdherentRole: (role: RegistrationDraft["adherentRole"]) => void;
  setSex: (sex: RegistrationDraft["sex"]) => void;
  addRepresentative: (rep?: Representative) => void;
  updateRepresentative: (index: number, patch: Partial<Representative>) => void;
  removeRepresentative: (index: number) => void;
  hydrate: (draft: RegistrationDraft) => void;
  reset: () => void;
};

export function useRegistrationDraft(initial?: RegistrationDraft): {
  draft: RegistrationDraft;
  actions: RegistrationDraftActions;
} {
  const [draft, dispatch] = useReducer(
    registrationDraftReducer,
    initial ?? createEmptyDraft()
  );

  const patchFields = useCallback(
    (patch: Partial<RegistrationDraft>) => dispatch({ type: "PATCH_FIELDS", patch }),
    []
  );
  const setAdherentRole = useCallback(
    (role: RegistrationDraft["adherentRole"]) =>
      dispatch({ type: "SET_ADHERENT_ROLE", role }),
    []
  );
  const setSex = useCallback(
    (sex: RegistrationDraft["sex"]) => dispatch({ type: "SET_SEX", sex }),
    []
  );
  const addRepresentative = useCallback(
    (rep?: Representative) =>
      dispatch(
        rep
          ? { type: "ADD_REPRESENTATIVE", representative: rep }
          : { type: "ADD_REPRESENTATIVE" }
      ),
    []
  );
  const updateRepresentative = useCallback(
    (index: number, patch: Partial<Representative>) =>
      dispatch({ type: "UPDATE_REPRESENTATIVE", index, patch }),
    []
  );
  const removeRepresentative = useCallback(
    (index: number) => dispatch({ type: "REMOVE_REPRESENTATIVE", index }),
    []
  );
  const hydrate = useCallback(
    (next: RegistrationDraft) => dispatch({ type: "HYDRATE", draft: next }),
    []
  );
  const reset = useCallback(() => dispatch({ type: "RESET" }), []);

  return {
    draft,
    actions: {
      patchFields,
      setAdherentRole,
      setSex,
      addRepresentative,
      updateRepresentative,
      removeRepresentative,
      hydrate,
      reset,
    },
  };
}
