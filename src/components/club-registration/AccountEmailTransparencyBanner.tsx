"use client";

import { Alert, Stack, Typography } from "@mui/material";

type Props = {
  /** Email du compte connecté, ou null en mode anonyme. */
  accountEmail: string | null;
};

/**
 * Bandeau persistant qui explique à l'utilisateur ce qui sera fait
 * de l'adresse e-mail de son compte, en mode anonyme et connecté.
 */
export function AccountEmailTransparencyBanner({ accountEmail }: Props) {
  return (
    <Alert severity="info" variant="outlined">
      <Stack spacing={1}>
        <Typography variant="subtitle2">
          Comment votre adresse e-mail est utilisée
        </Typography>
        {accountEmail ? (
          <Typography variant="body2">
            Vous êtes connecté(e) avec le compte <strong>{accountEmail}</strong>.
            Cette adresse sera enregistrée comme compte qui envoie le dossier.
            Le contact principal du club reste celui indiqué dans le formulaire.
          </Typography>
        ) : (
          <Typography variant="body2">
            Au moment d&apos;envoyer votre demande, vous serez invité(e) à vous connecter ou à
            créer un compte. Ce compte permettra d&apos;envoyer le dossier et de le
            retrouver plus tard.
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          L&apos;e-mail de contact, l&apos;e-mail des représentants légaux et l&apos;e-mail du compte
          peuvent être identiques ou différents.
        </Typography>
      </Stack>
    </Alert>
  );
}
