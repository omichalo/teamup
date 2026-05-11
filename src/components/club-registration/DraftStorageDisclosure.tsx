"use client";

import { useEffect, useRef, useState } from "react";
import {
  Box,
  Button,
  Dialog,
  DialogActions,
  DialogContent,
  DialogContentText,
  DialogTitle,
  Link as MuiLink,
  Popover,
  Stack,
  Typography,
} from "@mui/material";
import type { DraftStorageStatus } from "./useRegistrationDraftStorage";

type Props = {
  status: DraftStorageStatus;
  isDisabled: boolean;
  lastSavedAt: Date | null;
  onDisable: () => void;
  onEnable: () => void;
  onClear: () => void;
};

function formatRelative(date: Date | null, now: number): string {
  if (!date) return "";
  const diffSec = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (diffSec < 5) return "à l’instant";
  if (diffSec < 60) return `il y a ${diffSec} s`;
  const diffMin = Math.round(diffSec / 60);
  if (diffMin < 60) return `il y a ${diffMin} min`;
  return date.toLocaleString();
}

/**
 * Pied de wizard discret pour la sauvegarde locale du brouillon.
 *
 * Cadre RGPD : un brouillon enregistré côté navigateur pour permettre à l'utilisateur
 * de retrouver sa propre saisie relève du stockage strictement nécessaire au service
 * que l'utilisateur a demandé (CNIL — lignes directrices sur les cookies et traceurs,
 * art. 82 LCEN). Une information claire suffit, sans consentement préalable.
 *
 * On affiche uniquement l'horodatage du dernier enregistrement réussi (rafraîchi toutes
 * les 30 s) pour éviter le clignotement à la saisie. Un lien "En savoir plus" ouvre un
 * Popover avec le détail. Effacer / Désactiver restent toujours accessibles.
 */
export function DraftStorageDisclosure({
  status,
  isDisabled,
  lastSavedAt,
  onDisable,
  onEnable,
  onClear,
}: Props) {
  const [now, setNow] = useState<number>(() => Date.now());
  const [popoverAnchor, setPopoverAnchor] = useState<HTMLElement | null>(null);
  /* Le bouton « Effacer mon brouillon » est destructif (toute la saisie en
     cours disparaît) : on demande une confirmation explicite avant d'appeler
     `onClear`. */
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);
  const infoButtonRef = useRef<HTMLButtonElement | null>(null);

  useEffect(() => {
    if (isDisabled) return;
    const id = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(id);
  }, [isDisabled]);

  const openPopover = () => setPopoverAnchor(infoButtonRef.current);
  const closePopover = () => setPopoverAnchor(null);

  const statusLabel = isDisabled
    ? "Sauvegarde locale désactivée"
    : status === "saved" && lastSavedAt
      ? `Brouillon enregistré localement ${formatRelative(lastSavedAt, now)}`
      : "Aucun brouillon enregistré pour le moment";

  return (
    <Box
      role="contentinfo"
      sx={{
        py: 1.5,
        borderTop: 1,
        borderColor: "divider",
        color: "text.secondary",
      }}
    >
      <Stack
        direction="row"
        spacing={1.5}
        flexWrap="wrap"
        useFlexGap
        alignItems="center"
        sx={{ fontSize: "0.8rem" }}
      >
        <Typography variant="caption" component="span">
          {statusLabel}
        </Typography>
        <Typography variant="caption" component="span" aria-hidden>
          ·
        </Typography>
        <MuiLink
          ref={infoButtonRef}
          component="button"
          type="button"
          variant="caption"
          onClick={openPopover}
          underline="hover"
        >
          En savoir plus
        </MuiLink>

        {isDisabled ? (
          <>
            <Typography variant="caption" component="span" aria-hidden>
              ·
            </Typography>
            <MuiLink
              component="button"
              type="button"
              variant="caption"
              onClick={onEnable}
              underline="hover"
            >
              Réactiver la sauvegarde
            </MuiLink>
          </>
        ) : (
          <>
            <Typography variant="caption" component="span" aria-hidden>
              ·
            </Typography>
            <MuiLink
              component="button"
              type="button"
              variant="caption"
              onClick={() => setConfirmClearOpen(true)}
              underline="hover"
            >
              Effacer mon brouillon
            </MuiLink>
            <Typography variant="caption" component="span" aria-hidden>
              ·
            </Typography>
            <MuiLink
              component="button"
              type="button"
              variant="caption"
              color="warning.main"
              onClick={onDisable}
              underline="hover"
            >
              Désactiver
            </MuiLink>
          </>
        )}
      </Stack>

      <Popover
        open={Boolean(popoverAnchor)}
        anchorEl={popoverAnchor}
        onClose={closePopover}
        anchorOrigin={{ vertical: "top", horizontal: "left" }}
        transformOrigin={{ vertical: "bottom", horizontal: "left" }}
        slotProps={{ paper: { sx: { maxWidth: 420, p: 2 } } }}
      >
        <Stack spacing={1}>
          <Typography variant="subtitle2">Sauvegarde locale du brouillon</Typography>
          <Typography variant="body2" color="text.secondary">
            Les informations que vous saisissez sont enregistrées dans la mémoire de ce
            navigateur pour vous éviter de tout retaper si vous fermez l’onglet.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Aucune donnée n’est envoyée au serveur tant que vous n’avez pas cliqué sur
            « Envoyer ma demande au club ». Le brouillon est supprimé localement après
            envoi de votre dossier.
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Vous pouvez à tout moment effacer votre brouillon ou désactiver complètement
            cette sauvegarde locale via les liens ci-dessous.
          </Typography>
          <Box sx={{ pt: 0.5 }}>
            <Button size="small" variant="text" onClick={closePopover}>
              Fermer
            </Button>
          </Box>
        </Stack>
      </Popover>

      <Dialog
        open={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        aria-labelledby="confirm-clear-title"
        aria-describedby="confirm-clear-description"
      >
        <DialogTitle id="confirm-clear-title">Effacer le brouillon ?</DialogTitle>
        <DialogContent>
          <DialogContentText id="confirm-clear-description">
            Toutes les informations saisies dans le formulaire vont être supprimées
            de ce navigateur, sans possibilité de récupération. Confirmez-vous ?
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmClearOpen(false)}>Annuler</Button>
          <Button
            color="error"
            variant="contained"
            onClick={() => {
              setConfirmClearOpen(false);
              onClear();
            }}
          >
            Effacer le brouillon
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
