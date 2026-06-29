"use client";

import {
  Dialog,
  DialogContent,
  DialogTitle,
  IconButton,
  Typography,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import { MembershipRequestDetailPanel } from "./MembershipRequestDetailPanel";
import { useMembershipRequestModalShortcuts } from "./useMembershipRequestModalShortcuts";
import type { RegistrationSummary } from "./types";

type Props = {
  open: boolean;
  registrationId: string | null;
  statusSummary?: RegistrationSummary | null | undefined;
  onClose: () => void;
  onListReload?: (() => Promise<void>) | undefined;
  onDeleted?: (() => void | Promise<void>) | undefined;
};

export function MembershipRequestDetailModal({
  open,
  registrationId,
  statusSummary,
  onClose,
  onListReload,
  onDeleted,
}: Props) {
  useMembershipRequestModalShortcuts({ open, onClose });

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="xl"
      scroll="paper"
      aria-labelledby="membership-request-detail-title"
    >
      <DialogTitle id="membership-request-detail-title" sx={{ pr: 6 }}>
        Dossier d&apos;adhésion
        <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
          Échap pour fermer
        </Typography>
        <IconButton
          aria-label="Fermer"
          onClick={onClose}
          sx={{ position: "absolute", right: 8, top: 8 }}
        >
          <CloseIcon />
        </IconButton>
      </DialogTitle>
      <DialogContent dividers sx={{ p: { xs: 2, sm: 3 } }}>
        <MembershipRequestDetailPanel
          registrationId={registrationId}
          statusSummary={statusSummary}
          onListReload={onListReload}
          onDeleted={onDeleted}
          embedded={false}
          showAlerts
          emptyMessage="Chargement du dossier…"
        />
      </DialogContent>
    </Dialog>
  );
}
