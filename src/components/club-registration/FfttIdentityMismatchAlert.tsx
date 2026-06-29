"use client";

import { Alert, Button, Stack, Typography } from "@mui/material";
import {
  formatDeclaredSexLabel,
  formatFfttIdentityLabel,
  hasFfttIdentityMismatch,
  hasFfttSexMismatch,
  sexFromFfttIsHomme,
  type DeclaredSex,
} from "@/lib/club-registration/compare-fftt-identity";
import { formatLastNameForDisplay } from "@/lib/shared/person-name-format";

type Props = {
  declaredFirstName: string;
  declaredLastName: string;
  declaredSex: DeclaredSex;
  lookup: {
    prenom?: string | undefined;
    nom?: string | undefined;
    isHomme?: boolean | undefined;
  };
  onApplyFfttIdentity?: (() => void) | undefined;
};

export function FfttIdentityMismatchAlert({
  declaredFirstName,
  declaredLastName,
  declaredSex,
  lookup,
  onApplyFfttIdentity,
}: Props) {
  const nameMismatch = hasFfttIdentityMismatch(
    { firstName: declaredFirstName, lastName: declaredLastName },
    { firstName: lookup.prenom, lastName: lookup.nom }
  );
  const sexMismatch = hasFfttSexMismatch(declaredSex, lookup.isHomme);

  if (!nameMismatch && !sexMismatch) return null;

  const declaredLabel = formatFfttIdentityLabel({
    firstName: declaredFirstName,
    lastName: formatLastNameForDisplay(declaredLastName),
  });
  const ffttLabel = formatFfttIdentityLabel({
    ...(lookup.prenom ? { firstName: lookup.prenom } : {}),
    ...(lookup.nom ? { lastName: lookup.nom } : {}),
  });
  const ffttSexLabel =
    typeof lookup.isHomme === "boolean"
      ? formatDeclaredSexLabel(sexFromFfttIsHomme(lookup.isHomme))
      : "—";

  return (
    <Alert severity="warning">
      <Stack spacing={1}>
        <Typography variant="body2">
          L&apos;identité remontée par la FFTT diffère de celle saisie dans le dossier.
        </Typography>
        {nameMismatch ? (
          <Typography variant="body2">
            <strong>Nom saisi :</strong> {declaredLabel || "—"}
            <br />
            <strong>Nom FFTT :</strong> {ffttLabel || "—"}
          </Typography>
        ) : null}
        {sexMismatch ? (
          <Typography variant="body2">
            <strong>Sexe saisi :</strong> {formatDeclaredSexLabel(declaredSex)}
            <br />
            <strong>Sexe FFTT :</strong> {ffttSexLabel}
          </Typography>
        ) : null}
        <Typography variant="caption" color="text.secondary">
          Le dossier conserve votre saisie. Le secrétariat pourra vérifier l&apos;écart.
        </Typography>
        {onApplyFfttIdentity ? (
          <Button
            size="small"
            variant="outlined"
            onClick={onApplyFfttIdentity}
            sx={{ alignSelf: "flex-start" }}
          >
            Appliquer l&apos;identité FFTT
          </Button>
        ) : null}
      </Stack>
    </Alert>
  );
}
