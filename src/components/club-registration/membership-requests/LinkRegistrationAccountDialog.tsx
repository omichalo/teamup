"use client";

import { useEffect, useState } from "react";
import {
  Alert,
  Button,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Stack,
  TextField,
} from "@mui/material";
import ManageAccountsIcon from "@mui/icons-material/ManageAccounts";
import { ResponsiveDialog } from "@/components/ui/ResponsiveDialog";

type Props = {
  open: boolean;
  registrationId: string;
  adherentDisplayName: string;
  /** grant = dossier club sans accès adhérent ; change = remplacer le compte d'accès */
  mode: "grant" | "change";
  currentAccessEmails?: string[] | undefined;
  onClose: () => void;
  onLinked: () => void | Promise<void>;
};

export function LinkRegistrationAccountDialog({
  open,
  registrationId,
  adherentDisplayName,
  mode,
  currentAccessEmails = [],
  onClose,
  onLinked,
}: Props) {
  const [targetEmail, setTargetEmail] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) {
      setTargetEmail("");
      setSubmitting(false);
      setError(null);
    }
  }, [open]);

  const handleClose = () => {
    if (submitting) return;
    onClose();
  };

  const handleSubmit = async () => {
    const email = targetEmail.trim();
    if (!email.includes("@")) {
      setError("Indiquez un e-mail de compte TeamUp valide.");
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/club/registration/${encodeURIComponent(registrationId)}/link-account`,
        {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ targetEmail: email }),
        }
      );
      const json = (await res.json().catch(() => ({}))) as {
        error?: string;
      };
      if (!res.ok || json.error) {
        throw new Error(json.error || "Impossible de mettre à jour l'accès.");
      }
      await onLinked();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Erreur inattendue");
    } finally {
      setSubmitting(false);
    }
  };

  const isChange = mode === "change";
  const title = isChange
    ? "Modifier le compte d'accès"
    : "Donner l'accès à l'adhérent";
  const confirmLabel = isChange
    ? submitting
      ? "Enregistrement…"
      : "Enregistrer"
    : submitting
      ? "Enregistrement…"
      : "Donner l'accès";

  return (
    <ResponsiveDialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
      <DialogTitle>{title}</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ pt: 0.5 }}>
          <DialogContentText>
            {isChange ? (
              <>
                Le dossier de <strong>{adherentDisplayName}</strong> sera accessible dans
                Mes dossiers pour le nouveau compte : factures, reçus et paiement en ligne.
              </>
            ) : (
              <>
                Le dossier de <strong>{adherentDisplayName}</strong> sera visible dans Mes
                dossiers pour ce compte : factures, reçus et paiement en ligne.
              </>
            )}
          </DialogContentText>
          {isChange && currentAccessEmails.length > 0 ? (
            <Alert severity="info">
              Accès actuel : <strong>{currentAccessEmails.join(", ")}</strong>
              {currentAccessEmails.length === 1
                ? " — ce compte ne pourra plus y accéder après le changement."
                : " — ces comptes ne pourront plus y accéder après le changement."}
            </Alert>
          ) : null}
          <TextField
            label="E-mail du compte TeamUp"
            type="email"
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            fullWidth
            autoFocus
            disabled={submitting}
            helperText="Ce compte doit déjà exister sur l'application."
          />
          {error ? <Alert severity="error">{error}</Alert> : null}
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={handleClose} disabled={submitting}>
          Annuler
        </Button>
        <Button
          variant="contained"
          startIcon={<ManageAccountsIcon />}
          onClick={() => void handleSubmit()}
          disabled={submitting || !targetEmail.trim()}
        >
          {confirmLabel}
        </Button>
      </DialogActions>
    </ResponsiveDialog>
  );
}
