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
            Vous êtes connecté(e) en tant que <strong>{accountEmail}</strong>. Cette adresse
            sera enregistrée dans le dossier comme adresse du soumettant et servira au club
            pour le suivi de cette inscription.
          </Typography>
        ) : (
          <Typography variant="body2">
            Au moment d&apos;envoyer votre demande, vous serez invité(e) à vous connecter ou à
            créer un compte. L&apos;adresse e-mail de ce compte sera enregistrée dans le
            dossier comme adresse du soumettant.
          </Typography>
        )}
        <Typography variant="caption" color="text.secondary">
          Les e-mails de l&apos;adhérent et des représentants légaux sont distincts et se
          renseignent dans le formulaire ci-dessous.
        </Typography>
      </Stack>
    </Alert>
  );
}
