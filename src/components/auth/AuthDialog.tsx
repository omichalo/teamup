"use client";

import { ReactNode, useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Stack,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { AuthForm, type AuthMode } from "./AuthForm";

type Props = {
  open: boolean;
  onClose: () => void;
  /** Mode initial à l'ouverture du dialog. Défaut: "login". */
  defaultMode?: AuthMode;
  /**
   * Callback de succès final, propagé à l'AuthForm. Quand il est appelé,
   * l'appelant peut fermer le dialog et enchaîner avec sa propre logique
   * (ex. POST /api/club/registration depuis le wizard d'inscription).
   */
  onSuccess?: () => void | Promise<void>;
  /** Pré-remplit le champ e-mail (ex. si déjà connu). */
  initialEmail?: string;
  /**
   * Contenu libre injecté en tête du formulaire (ex. bandeau métier
   * « Comment votre adresse e-mail est utilisée »).
   */
  headerSlot?: ReactNode;
  /** Désactive la fermeture par escape / clic backdrop pendant un flow critique. */
  disableEscapeClose?: boolean;
};

const TITLES: Record<AuthMode, string> = {
  login: "Se connecter",
  signup: "Créer un compte",
  "forgot-password": "Mot de passe oublié",
};

/**
 * Dialog d'authentification qui réutilise l'AuthForm en mode embedded.
 *
 * - Garde l'utilisateur sur l'URL courante (utile dans le wizard d'inscription).
 * - Bascule entre les 3 modes en interne via `onModeChange` plutôt qu'avec
 *   des liens Next.js.
 * - Le composant parent reste maître du flow post-auth via `onSuccess`.
 */
export function AuthDialog({
  open,
  onClose,
  defaultMode = "login",
  onSuccess,
  initialEmail,
  headerSlot,
  disableEscapeClose,
}: Props) {
  const [mode, setMode] = useState<AuthMode>(defaultMode);

  /* À la réouverture, on ré-aligne le mode sur defaultMode pour ne pas
     « rester collé » sur le mode précédent (signup → réouverture en login). */
  useEffect(() => {
    if (open) setMode(defaultMode);
  }, [open, defaultMode]);

  const handleClose = (
    _evt: object,
    reason: "backdropClick" | "escapeKeyDown"
  ) => {
    if (
      disableEscapeClose &&
      (reason === "backdropClick" || reason === "escapeKeyDown")
    ) {
      return;
    }
    onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      fullWidth
      maxWidth="sm"
      aria-labelledby="auth-dialog-title"
    >
      <DialogTitle id="auth-dialog-title" sx={{ pr: 6 }}>
        <Stack
          direction="row"
          alignItems="center"
          justifyContent="space-between"
        >
          <Typography variant="h6" component="span">
            {TITLES[mode]}
          </Typography>
          <IconButton
            aria-label="Fermer la fenêtre d'authentification"
            onClick={onClose}
            size="small"
            sx={{ ml: 2 }}
          >
            <CloseIcon />
          </IconButton>
        </Stack>
      </DialogTitle>
      <DialogContent dividers>
        <AuthForm
          mode={mode}
          embedded
          onModeChange={setMode}
          {...(onSuccess ? { onSuccess } : {})}
          {...(initialEmail !== undefined ? { initialEmail } : {})}
          {...(headerSlot ? { headerSlot } : {})}
        />
      </DialogContent>
    </Dialog>
  );
}
