"use client";

import { Stack, Typography } from "@mui/material";
import { RepresentativesBlock } from "./RepresentativesBlock";
import { useTouchedFields } from "./useTouchedFields";
import type {
  RegistrationDraft,
  Representative,
} from "./registration-defaults";

type Props = {
  draft: RegistrationDraft;
  onAddRepresentative: () => void;
  onUpdateRepresentative: (
    index: number,
    patch: Partial<Representative>
  ) => void;
  onRemoveRepresentative: (index: number) => void;
};

/**
 * Étape 3 (conditionnelle, mineur uniquement) — « Représentants légaux ».
 *
 * Extraite de l'étape « adhérent » pour ne pas surcharger un écran déjà
 * dense, et pour donner aux représentants la scène qu'ils méritent (1 à 2
 * blocs « contact + identité » répétés).
 */
export function RepresentativesStep({
  draft,
  onAddRepresentative,
  onUpdateRepresentative,
  onRemoveRepresentative,
}: Props) {
  const { isTouched, markTouched } = useTouchedFields();

  return (
    <Stack spacing={2}>
      <Typography variant="body2" color="text.secondary">
        Un représentant légal est obligatoire pour l’inscription d’un mineur.
        Vous pouvez ajouter un second représentant (parent 2, tuteur). Les
        e-mails et téléphones renseignés servent au suivi du dossier et aux
        communications du club.
      </Typography>
      <RepresentativesBlock
        representatives={draft.representatives}
        firstIsRequired
        onAdd={onAddRepresentative}
        onUpdate={onUpdateRepresentative}
        onRemove={onRemoveRepresentative}
        isTouched={isTouched}
        markTouched={markTouched}
      />
    </Stack>
  );
}
